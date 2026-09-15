<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\AdminNotification;
use App\Models\Partner;
use App\Models\VendorJob;
use App\Support\BookingAutoAssignmentManager;
use App\Support\BookingCustomerMailer;
use App\Support\BookingExtraItemsManager;
use App\Support\BookingMetadataEnricher;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VendorJobController extends CrudController
{
    protected string $model = VendorJob::class;
    protected string $searchColumn = 'job_no';
    protected array $rules = ['job_no'=>['nullable','string','max:100'],'partner_id'=>['nullable','exists:partners,id'],'customer_name'=>['required','string','max:255'],'service_name'=>['required','string','max:255'],'address'=>['nullable','string'],'slot'=>['nullable','string','max:100'],'amount'=>['nullable','numeric'],'status'=>['nullable','string','max:100'],'next_action'=>['nullable','string','max:100'],'metadata'=>['nullable','array']];

    public function index(Request $request)
    {
        app(BookingAutoAssignmentManager::class)->tick();

        $partnerId = $request->filled('partner_id') ? $request->integer('partner_id') : null;
        $shouldSync = $partnerId && ! $request->boolean('skip_sync');

        if ($shouldSync) {
            // Avoid re-syncing assigned bookings on every 5s vendor poll.
            Cache::remember("vendor_jobs_sync_{$partnerId}", 20, function () use ($partnerId) {
                $this->syncAssignedBookings($partnerId);

                return true;
            });
        }

        $query = VendorJob::query()->latest('id');
        $lite = $request->boolean('lite') || $request->boolean('options');

        if ($partnerId) {
            $query->where('partner_id', $partnerId);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('job_no', 'like', $term)
                    ->orWhere('customer_name', 'like', $term)
                    ->orWhere('service_name', 'like', $term)
                    ->orWhere('address', 'like', $term);
            });
        }

        $mapItems = function ($items) use ($lite) {
            if (! $lite) {
                return $items;
            }

            return $items->map(function ($job) {
                $data = $job->toArray();
                $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];
                $work = is_array($metadata['work'] ?? null) ? $metadata['work'] : [];

                foreach (['start_photos', 'end_photos', 'start_videos', 'end_videos'] as $mediaKey) {
                    if (isset($work[$mediaKey]) && is_array($work[$mediaKey])) {
                        $work[$mediaKey] = array_map(function ($item) {
                            if (! is_array($item)) {
                                return $item;
                            }

                            return [
                                'name' => $item['name'] ?? null,
                                'path' => $item['path'] ?? null,
                                'type' => $item['type'] ?? null,
                            ];
                        }, $work[$mediaKey]);
                    }
                }

                $metadata['work'] = $work;
                $data['metadata'] = $metadata;

                return $data;
            });
        };

        $perPageParam = $request->input('per_page');
        if ($perPageParam === 'all' || (int) $perPageParam === -1 || $request->boolean('all')) {
            $items = $query->limit(500)->get();
            $items = $mapItems($items);

            return response()->json([
                'data' => $items,
                'total' => $items->count(),
                'per_page' => $items->count(),
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        $paginator = $query->paginate(max(1, min(100, (int) $request->integer('per_page', 25))));
        $paginator->setCollection($mapItems($paginator->getCollection()));

        return response()->json($paginator);
    }

    private function syncAssignedBookings(int $partnerId): void
    {
        if (! $partnerId) {
            return;
        }

        $partner = Partner::find($partnerId);
        if (! $partner) {
            return;
        }

        Booking::query()
            ->where('partner_id', $partnerId)
            ->whereNotIn('status', ['Rejected', 'Cancelled', 'Completed', 'Refunded'])
            ->whereNotNull('booking_no')
            ->get()
            ->each(function (Booking $booking) use ($partner) {
                $metadata = $booking->metadata ?? [];

                VendorJob::firstOrCreate(
                    ['job_no' => $booking->booking_no],
                    [
                        'partner_id' => $partner->id,
                        'service_id' => $booking->service_id,
                        'customer_name' => $booking->customer_name,
                        'service_name' => $booking->service_name,
                        'address' => $booking->address,
                        'slot' => optional($booking->scheduled_at)->format('Y-m-d H:i'),
                        'amount' => $booking->amount,
                        'status' => 'New request',
                        'next_action' => 'Accept job',
                        'metadata' => [
                            'booking_id' => $booking->id,
                            'booking_no' => $booking->booking_no,
                            'service_id' => $booking->service_id,
                            'customer_phone' => $booking->customer_phone,
                            'customer_location' => $metadata['service_location'] ?? data_get($metadata, 'service_address.location'),
                            'otp' => $metadata['service_otp'] ?? null,
                            'payment' => trim(($booking->payment_method ?: 'Payment') . ' - ' . ($booking->payment_status ?: 'Pending')),
                            'partner_name' => $partner->name,
                            'service_address' => $metadata['service_address'] ?? null,
                            'work' => $metadata['work'] ?? [],
                            'items' => $metadata['items'] ?? [],
                        ],
                    ],
                );
            });
    }

    public function update(Request $request, int|string $id)
    {
        $record = DB::transaction(function () use ($request, $id) {
            $job = VendorJob::findOrFail($id);
            $actorPartnerId = $request->integer('actor_partner_id');

            if ($actorPartnerId && (int) $job->partner_id !== $actorPartnerId) {
                abort(403, 'You can manage only your own assigned requests.');
            }

            $data = $this->validatedData($request);
            if (($data['status'] ?? null) === 'Completed' && $this->isCodJob($job, $data) && ! data_get($data, 'metadata.payment_confirmation.cod_marked_paid')) {
                throw ValidationException::withMessages([
                    'metadata.payment_confirmation.cod_marked_paid' => 'Mark COD payment as paid before completing this booking.',
                ]);
            }

            $job->update($data);
            $this->syncBookingFromJob($job->fresh());

            return $job->fresh();
        });

        return response()->json($record);
    }

    public function uploadPhotos(Request $request, VendorJob $vendorJob)
    {
        $actorPartnerId = $request->integer('actor_partner_id');

        if ($actorPartnerId && (int) $vendorJob->partner_id !== $actorPartnerId) {
            abort(403, 'You can manage only your own assigned requests.');
        }

        $data = $request->validate([
            'phase' => ['required', 'in:before,after'],
            'photos' => ['required', 'array', 'min:1'],
            'photos.*' => ['required', 'image', 'max:5120'],
        ]);

        $directory = 'work-photos';
        $destination = public_path($directory);

        if (! is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $uploadedPhotos = [];

        foreach ($request->file('photos', []) as $file) {
            $originalName = $file->getClientOriginalName();
            $size = $file->getSize();
            $type = $file->getMimeType();
            $filename = $file->hashName();
            $file->move($destination, $filename);

            $uploadedPhotos[] = [
                'kind' => 'photo',
                'name' => $originalName,
                'path' => $directory.'/'.$filename,
                'size' => $size,
                'type' => $type,
                'uploaded_at' => now()->toISOString(),
                'url' => '/'.$directory.'/'.$filename,
            ];
        }

        $key = $data['phase'] === 'before' ? 'before_photos' : 'after_photos';
        $this->appendWorkMedia($vendorJob, $data['phase'], $key, $uploadedPhotos);

        return response()->json([
            'message' => 'Work photos uploaded successfully.',
            'photos' => $uploadedPhotos,
            'job' => $vendorJob->fresh(),
        ]);
    }

    public function uploadMediaChunk(Request $request, VendorJob $vendorJob)
    {
        $actorPartnerId = $request->integer('actor_partner_id');

        if ($actorPartnerId && (int) $vendorJob->partner_id !== $actorPartnerId) {
            abort(403, 'You can manage only your own assigned requests.');
        }

        $data = $request->validate([
            'phase' => ['required', 'in:before,after'],
            'upload_id' => ['required', 'string', 'max:120'],
            'chunk_index' => ['required', 'integer', 'min:0'],
            'total_chunks' => ['required', 'integer', 'min:1', 'max:10000'],
            'original_name' => ['required', 'string', 'max:255'],
            'total_size' => ['required', 'integer', 'min:1', 'max:2147483648'],
            'mime_type' => ['nullable', 'string', 'max:120'],
            'chunk' => ['required', 'file', 'max:12288'],
        ]);

        if ($data['chunk_index'] >= $data['total_chunks']) {
            abort(422, 'Invalid chunk index.');
        }

        $uploadId = Str::slug($data['upload_id']);
        $chunkRoot = storage_path('app/chunked-work-uploads/'.$uploadId);

        if (! is_dir($chunkRoot)) {
            mkdir($chunkRoot, 0755, true);
        }

        $chunkPath = $chunkRoot.'/'.str_pad((string) $data['chunk_index'], 6, '0', STR_PAD_LEFT).'.part';
        $chunkFile = $request->file('chunk');
        $chunkFile->move($chunkRoot, basename($chunkPath));

        $isComplete = true;
        for ($index = 0; $index < $data['total_chunks']; $index++) {
            $expectedPath = $chunkRoot.'/'.str_pad((string) $index, 6, '0', STR_PAD_LEFT).'.part';
            if (! is_file($expectedPath)) {
                $isComplete = false;
                break;
            }
        }

        if (! $isComplete) {
            return response()->json([
                'complete' => false,
                'message' => 'Chunk uploaded.',
                'received_chunk' => $data['chunk_index'],
            ]);
        }

        $directory = 'work-videos';
        $destination = public_path($directory);

        if (! is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $extension = strtolower(pathinfo($data['original_name'], PATHINFO_EXTENSION)) ?: 'mp4';
        $safeExtension = preg_replace('/[^a-z0-9]/', '', $extension) ?: 'mp4';
        $filename = Str::random(40).'.'.$safeExtension;
        $finalPath = $destination.'/'.$filename;
        $output = fopen($finalPath, 'wb');

        for ($index = 0; $index < $data['total_chunks']; $index++) {
            $partPath = $chunkRoot.'/'.str_pad((string) $index, 6, '0', STR_PAD_LEFT).'.part';
            $input = fopen($partPath, 'rb');
            stream_copy_to_stream($input, $output);
            fclose($input);
            unlink($partPath);
        }

        fclose($output);
        @rmdir($chunkRoot);

        $mediaRecord = [
            'kind' => 'video',
            'name' => $data['original_name'],
            'path' => $directory.'/'.$filename,
            'size' => filesize($finalPath),
            'type' => $data['mime_type'] ?: 'video/mp4',
            'uploaded_at' => now()->toISOString(),
            'url' => '/'.$directory.'/'.$filename,
        ];

        $key = $data['phase'] === 'before' ? 'before_videos' : 'after_videos';
        $this->appendWorkMedia($vendorJob, $data['phase'], $key, [$mediaRecord]);

        return response()->json([
            'complete' => true,
            'message' => 'Work video uploaded successfully.',
            'media' => $mediaRecord,
            'job' => $vendorJob->fresh(),
        ]);
    }

    private function appendWorkMedia(VendorJob $vendorJob, string $phase, string $key, array $items): void
    {
        $metadata = $vendorJob->metadata ?? [];
        $work = $metadata['work'] ?? [];
        $work[$key] = [
            ...($work[$key] ?? []),
            ...$items,
        ];
        $work[$phase.'_uploaded_at'] = now()->toISOString();
        $metadata['work'] = $work;

        $vendorJob->update([
            'metadata' => $metadata,
            'next_action' => $phase === 'before' ? 'Start service work' : 'Complete job',
        ]);

        $this->syncBookingFromJob($vendorJob->fresh());
    }

    private function syncBookingFromJob(VendorJob $job): void
    {
        $bookingId = $job->metadata['booking_id'] ?? null;
        $bookingNo = $job->metadata['booking_no'] ?? $job->job_no;
        $booking = Booking::query()
            ->when($bookingId, fn ($query) => $query->whereKey($bookingId))
            ->when(!$bookingId && $bookingNo, fn ($query) => $query->where('booking_no', $bookingNo))
            ->first();

        if (!$booking) return;

        $metadata = $booking->metadata ?? [];
        $jobWork = $job->metadata['work'] ?? [];
        if ($jobWork) {
            $metadata['work'] = [
                ...($metadata['work'] ?? []),
                ...$jobWork,
            ];
        }

        if (array_key_exists('pending_vendor_extra_items', $job->metadata ?? [])) {
            $metadata['pending_vendor_extra_items'] = $job->metadata['pending_vendor_extra_items'];
        }

        $previousPendingCount = count(($booking->metadata ?? [])['pending_vendor_extra_items'] ?? []);
        $incomingPendingCount = count($metadata['pending_vendor_extra_items'] ?? []);

        if (! empty($job->metadata['vendor_extra_items'])) {
            $metadata['vendor_extra_items'] = $job->metadata['vendor_extra_items'];
            app(BookingExtraItemsManager::class)->syncApprovedExtraItems(
                $booking,
                $job->metadata['vendor_extra_items'],
            );
        }

        if (!empty($job->metadata['reviews'])) {
            $metadata['reviews'] = [
                ...($metadata['reviews'] ?? []),
                ...$job->metadata['reviews'],
            ];
        }

        foreach (['customer_location', 'vendor_location', 'location_events', 'status_times', 'accepted_at'] as $locationKey) {
            if (! empty($job->metadata[$locationKey])) {
                $metadata[$locationKey] = $job->metadata[$locationKey];
            }
        }

        if (! empty($job->metadata['payment_confirmation'])) {
            $metadata['payment_confirmation'] = [
                ...($metadata['payment_confirmation'] ?? []),
                ...$job->metadata['payment_confirmation'],
            ];
        }

        $statusMap = [
            'Accepted' => 'Vendor Accepted',
            'On the way' => 'On The Way',
            'OTP verified' => 'Reached - OTP Verified',
            'Started' => 'Started',
            'In progress' => 'Started',
            'Completed' => 'Completed',
            'Rejected' => 'Vendor Rejected',
        ];

        $previousStatus = $booking->status;
        $nextStatus = $statusMap[$job->status] ?? $booking->status;
        $pendingExtrasAdded = $incomingPendingCount > $previousPendingCount && $previousStatus === $nextStatus;
        $metadata = app(BookingMetadataEnricher::class)->enrich($metadata);
        $bookingUpdate = [
            'status' => $nextStatus,
            'timeline' => [...($booking->timeline ?? []), "Vendor update: {$job->status}"],
            'metadata' => $metadata,
        ];

        if ($job->status === 'Completed' && $this->isCashBooking($booking)) {
            $bookingUpdate['payment_status'] = 'Paid';
            $bookingUpdate['payment_method'] = 'Cash';
        }

        if ($job->status === 'Rejected') {
            $bookingUpdate['partner_id'] = null;
            $bookingUpdate['professional_name'] = null;
            $bookingUpdate['status'] = 'Accepted';
            $bookingUpdate['timeline'][] = 'Vendor rejected assignment; waiting for another professional';
        }

        $booking->update($bookingUpdate);
        $booking->refresh();

        if (in_array($job->status, ['Completed', 'Rejected'], true)) {
            if ($job->status === 'Completed') {
                if ($job->partner_id) {
                    Partner::whereKey($job->partner_id)->update(['availability' => 'Available']);
                }
                if ($booking->partner_id) {
                    Partner::whereKey($booking->partner_id)->update(['availability' => 'Available']);
                }
            }
            app(BookingAutoAssignmentManager::class)->releasePartnerIfIdle((int) $job->partner_id);
        }

        if ($job->status === 'Completed') {
            app(WalletManager::class)->syncBooking($booking);
            app(BookingAutoAssignmentManager::class)->processDueBookings();
        }

        if ($job->status === 'Rejected') {
            app(BookingAutoAssignmentManager::class)->scheduleIfEnabled($booking->fresh());
            app(BookingAutoAssignmentManager::class)->processDueBookings();
        }

        if ($job->status === 'Rejected' && $previousStatus !== $nextStatus) {
            $partnerName = $job->metadata['partner_name'] ?? 'the assigned vendor';
            AdminNotification::create([
                'channel' => 'Booking',
                'audience' => 'Super Admin',
                'title' => 'Vendor rejected assigned booking',
                'message' => "{$booking->booking_no} - {$booking->service_name} was rejected by {$partnerName}. Please assign another professional.",
                'status' => 'Sent',
                'sent_at' => now(),
                'metadata' => [
                    'booking_id' => $booking->id,
                    'booking_no' => $booking->booking_no,
                    'job_id' => $job->id,
                    'partner_id' => $job->partner_id,
                    'related_type' => 'Booking',
                    'requires_reassignment' => true,
                ],
            ]);
        }

        // Push Notifications
        $pushService = app(\App\Support\PushNotificationService::class);
        $partnerModel = $job->partner_id ? Partner::find($job->partner_id) : null;

        if (in_array($nextStatus, ['Started'], true) && $previousStatus !== 'Started') {
            $pushService->sendWorkStarted($booking);
            if ($partnerModel) {
                $pushService->sendVendorWorkStarted($partnerModel, $booking, $job);
            }
        } elseif ($nextStatus === 'Completed' && $previousStatus !== 'Completed') {
            $pushService->sendBookingCompleted($booking);
            if ($partnerModel) {
                $pushService->sendVendorBookingCompleted($partnerModel, $booking, $job);
            }
        }

        if ($pendingExtrasAdded) {
            $pushService->sendExtraItemsAdded($booking, $metadata['pending_vendor_extra_items'] ?? []);
        } else {
            app(BookingCustomerMailer::class)->sendStatusUpdate($booking->fresh(), $previousStatus);
        }
    }

    private function isCodJob(VendorJob $job, array $data = []): bool
    {
        $paymentText = strtolower((string) ($job->metadata['payment'] ?? ''));
        if (str_contains($paymentText, 'cash') || str_contains($paymentText, 'cod')) {
            return true;
        }

        $bookingId = $job->metadata['booking_id'] ?? null;
        $bookingNo = $job->metadata['booking_no'] ?? $job->job_no;
        $booking = Booking::query()
            ->when($bookingId, fn ($query) => $query->whereKey($bookingId))
            ->when(!$bookingId && $bookingNo, fn ($query) => $query->where('booking_no', $bookingNo))
            ->first();

        return $booking ? $this->isCashBooking($booking) : false;
    }

    private function isCashBooking(Booking $booking): bool
    {
        return strcasecmp((string) $booking->payment_method, 'cash') === 0
            || strcasecmp((string) $booking->payment_status, 'cash') === 0
            || strcasecmp((string) $booking->payment_method, 'cod') === 0;
    }
}
