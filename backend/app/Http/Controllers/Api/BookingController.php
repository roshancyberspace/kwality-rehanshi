<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\CustomerProfile;
use App\Models\AdminNotification;
use App\Models\CustomerWallet;
use App\Models\Partner;
use App\Models\ServicePackage;
use App\Models\VendorJob;
use App\Support\BookingAutoAssignmentManager;
use App\Support\BookingCustomerMailer;
use App\Support\BookingExtraItemsManager;
use App\Support\BookingMetadataEnricher;
use App\Support\CouponDiscountResolver;
use App\Support\WalletManager;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class BookingController extends CrudController
{
    protected string $model = Booking::class;

    protected array $with = ['extraItems'];

    protected string $searchColumn = 'booking_no';

    protected array $rules = [
        'booking_no' => ['nullable', 'string', 'max:100'],
        'customer_name' => ['required', 'string', 'max:255'],
        'customer_phone' => ['nullable', 'string', 'max:50'],
        'service_name' => ['required', 'string', 'max:255'],
        'service_id' => ['nullable', 'exists:services,id'],
        'service_package_id' => ['nullable', 'exists:service_packages,id'],
        'scheduled_at' => ['nullable', 'date'],
        'address' => ['nullable', 'string'],
        'partner_id' => ['nullable', 'exists:partners,id'],
        'professional_name' => ['nullable', 'string', 'max:255'],
        'status' => ['nullable', 'string', 'max:100'],
        'payment_status' => ['nullable', 'string', 'max:100'],
        'payment_method' => ['nullable', 'string', 'max:100'],
        'amount' => ['nullable', 'numeric'],
        'tip_amount' => ['nullable', 'numeric'],
        'priority' => ['nullable', 'string', 'max:50'],
        'timeline' => ['nullable', 'array'],
        'metadata' => ['nullable', 'array'],
    ];

    public function index(Request $request)
    {
        $response = parent::index($request);

        // List views stay fast: skip per-row package/rate enrichment (still applied on show).
        if ($request->boolean('lite') || $request->boolean('options')) {
            return $response;
        }

        return $response;
    }

    public function show(int|string $id)
    {
        $booking = Booking::with($this->with)->findOrFail($id);

        return response()->json($this->presentBooking($booking));
    }

    public function store(Request $request)
    {
        $booking = DB::transaction(function () use ($request) {
            $payload = $this->validatedData($request);
            $payload['booking_no'] = $this->safeBookingNo($payload['booking_no'] ?? null);
            $this->validateCheckoutPayload($payload);

            $normalizedItems = $this->normalizeBookingCartItems($payload['metadata']['items'] ?? []);
            if (! empty($normalizedItems)) {
                $payload['service_package_id'] = $normalizedItems[0]['id'];
                $payload['service_id'] = $normalizedItems[0]['service_id'];
            }
            $isAutoApprove = app(BookingAutoAssignmentManager::class)->autoApprove();
            $status = $payload['status'] ?? null;
            if (! $status) {
                $status = $isAutoApprove ? 'Accepted' : 'Pending Approval';
            }
            $payload['status'] = $status;
            
            $timelineEntry = $isAutoApprove ? 'Booking accepted by super admin' : 'Waiting for super admin approval';
            $payload['timeline'] = array_values(array_unique(array_filter([
                ...($payload['timeline'] ?? []),
                'Booking placed',
                $timelineEntry,
            ])));
            $payload['metadata'] = [
                ...($payload['metadata'] ?? []),
                'items' => $normalizedItems,
                'service_otp' => (string) random_int(1000, 9999),
                'service_location' => $this->serviceLocationFromMetadata($payload['metadata'] ?? []),
                'approval' => $isAutoApprove ? [
                    'status' => 'accepted',
                    'accepted_at' => now()->toDateTimeString(),
                    'mode' => 'auto',
                ] : ['status' => 'pending'],
                'status_times' => [
                    'pending_approval' => now()->toISOString(),
                    ...($isAutoApprove ? ['accepted' => now()->toISOString()] : []),
                ],
                'work' => [
                    'before_photos' => [],
                    'after_photos' => [],
                    'otp_verified_at' => null,
                    'started_at' => null,
                    'completed_at' => null,
                ],
                'reviews' => [
                    'customer_to_vendor' => null,
                    'vendor_to_customer' => null,
                ],
            ];

            $booking = $this->createBookingWithUniqueNumber($payload);
            $customerId = $booking->metadata['customer_id'] ?? null;

            if ($customerId) {
                CustomerProfile::query()
                    ->whereKey($customerId)
                    ->increment('bookings_count');

                CustomerProfile::query()
                    ->whereKey($customerId)
                    ->update(['last_booking_at' => now()]);
            }

            app(WalletManager::class)->syncBooking($booking);
            $adminMessage = $isAutoApprove 
                ? "{$booking->booking_no} - {$booking->service_name} has been auto-approved."
                : "{$booking->booking_no} - {$booking->service_name} is waiting for approval.";

            AdminNotification::create([
                'channel' => 'Push',
                'audience' => 'Super Admin',
                'title' => 'New booking received',
                'message' => $adminMessage,
                'status' => 'Sent',
                'sent_at' => now(),
                'metadata' => ['booking_id' => $booking->id, 'booking_no' => $booking->booking_no],
            ]);

            return $booking->fresh(['extraItems']);
        });

        $mailer = app(BookingCustomerMailer::class);
        $mailer->sendBookingConfirmation($booking);
        $mailer->sendPaymentReceipt($booking);
        if (app(BookingAutoAssignmentManager::class)->autoApprove()) {
            $mailer->sendStatusUpdate($booking, 'Pending Approval');
        }
        app(BookingAutoAssignmentManager::class)->scheduleIfEnabled($booking);

        return response()->json($this->presentBooking($booking), 201);
    }

    public function update(Request $request, int|string $id)
    {
        $record = DB::transaction(function () use ($request, $id) {
            $booking = Booking::findOrFail($id);
            $previousStatus = $booking->status;
            $previousPaymentStatus = $booking->payment_status;
            $previousPartnerId = $booking->partner_id;
            $data = $this->validatedData($request);

            $booking->update($data);

            $assignmentSynced = false;
            $partnerId = $data['partner_id'] ?? null;
            $jobAlreadySynced = $partnerId
                ? VendorJob::where('job_no', $booking->booking_no)
                    ->where('partner_id', $partnerId)
                    ->exists()
                : true;

            if ($partnerId && ((int) $previousPartnerId !== (int) $partnerId || ! $jobAlreadySynced)) {
                $booking = app(BookingAutoAssignmentManager::class)
                    ->assignPartner($booking->fresh(), Partner::findOrFail($partnerId));
                $assignmentSynced = true;
            } else {
                app(WalletManager::class)->syncBooking($booking);
                $booking = $booking->fresh();
            }

            return [
                'assignment_synced' => $assignmentSynced,
                'booking' => $booking,
                'previous_status' => $previousStatus,
                'previous_payment_status' => $previousPaymentStatus,
            ];
        });

        $booking = $record['booking'];
        $mailer = app(BookingCustomerMailer::class);
        if (! $record['assignment_synced']) {
            $mailer->sendStatusUpdate($booking, $record['previous_status']);
        }
        if ($record['previous_payment_status'] !== $booking->payment_status) {
            $mailer->sendPaymentReceipt($booking);
        }

        return response()->json($booking);
    }

    public function accept(Request $request, Booking $booking)
    {
        $previousStatus = $booking->status;
        $record = DB::transaction(function () use ($booking) {
            $metadata = $booking->metadata ?? [];
            $metadata['approval'] = [
                'status' => 'accepted',
                'accepted_at' => now()->toDateTimeString(),
            ];
            $metadata['status_times'] = [
                ...($metadata['status_times'] ?? []),
                'accepted' => now()->toISOString(),
            ];

            $booking->update([
                'status' => 'Accepted',
                'timeline' => $this->appendTimeline($booking, 'Booking accepted by super admin'),
                'metadata' => $metadata,
            ]);

            return $booking->fresh();
        });

        app(BookingCustomerMailer::class)->sendStatusUpdate($record, $previousStatus);
        app(BookingAutoAssignmentManager::class)->scheduleIfEnabled($record);

        return response()->json($record);
    }

    public function reject(Request $request, Booking $booking)
    {
        $previousStatus = $booking->status;
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $record = DB::transaction(function () use ($booking, $data) {
            $assignedPartnerId = $booking->partner_id;
            $metadata = $booking->metadata ?? [];
            $metadata['approval'] = [
                'status' => 'rejected',
                'reason' => $data['reason'],
                'rejected_at' => now()->toDateTimeString(),
            ];
            $metadata['status_times'] = [
                ...($metadata['status_times'] ?? []),
                'rejected' => now()->toISOString(),
            ];

            $booking->update([
                'partner_id' => null,
                'professional_name' => null,
                'status' => 'Rejected',
                'timeline' => $this->appendTimeline($booking, "Booking rejected: {$data['reason']}"),
                'metadata' => $metadata,
            ]);

            if ($assignedPartnerId) {
                Partner::whereKey($assignedPartnerId)
                    ->where('availability', 'Busy')
                    ->update(['availability' => 'Available']);
            }

            VendorJob::query()
                ->where('job_no', $booking->booking_no)
                ->get()
                ->each(function (VendorJob $job) use ($data) {
                    $jobMetadata = $job->metadata ?? [];
                    $jobMetadata['admin_rejection'] = [
                        'reason' => $data['reason'],
                        'rejected_at' => now()->toDateTimeString(),
                    ];
                    $jobMetadata['status_times'] = [
                        ...($jobMetadata['status_times'] ?? []),
                        'rejected' => now()->toISOString(),
                    ];

                    $job->update([
                        'status' => 'Rejected',
                        'next_action' => 'Booking rejected by admin',
                        'metadata' => $jobMetadata,
                    ]);
                });

            return $booking->fresh();
        });

        app(BookingCustomerMailer::class)->sendStatusUpdate($record, $previousStatus);

        return response()->json($record);
    }

    public function cancel(Request $request, Booking $booking)
    {
        $previousStatus = $booking->status;
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'cancelled_by' => ['nullable', 'string', Rule::in(['admin', 'customer'])],
        ]);

        if (in_array($booking->status, ['Cancelled', 'Canceled', 'Completed', 'Rejected', 'Refunded'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Only active bookings can be cancelled.',
            ]);
        }

        $cancelledBy = $data['cancelled_by'] ?? 'admin';
        $actorLabel = $cancelledBy === 'customer' ? 'customer' : 'admin';

        $record = DB::transaction(function () use ($booking, $data, $cancelledBy, $actorLabel) {
            $assignedPartnerId = $booking->partner_id;
            $metadata = $booking->metadata ?? [];
            $metadata['cancellation'] = [
                'cancelled_by' => $cancelledBy,
                'reason' => $data['reason'],
                'cancelled_at' => now()->toDateTimeString(),
            ];
            $metadata['status_times'] = [
                ...($metadata['status_times'] ?? []),
                'cancelled' => now()->toISOString(),
            ];

            $booking->update([
                'partner_id' => null,
                'professional_name' => null,
                'status' => 'Cancelled',
                'timeline' => $this->appendTimeline($booking, "Booking cancelled by {$actorLabel}: {$data['reason']}"),
                'metadata' => $metadata,
            ]);

            if ($assignedPartnerId) {
                Partner::whereKey($assignedPartnerId)
                    ->where('availability', 'Busy')
                    ->update(['availability' => 'Available']);
            }

            VendorJob::query()
                ->where('job_no', $booking->booking_no)
                ->get()
                ->each(function (VendorJob $job) use ($data, $cancelledBy, $actorLabel) {
                    $jobMetadata = $job->metadata ?? [];
                    $jobMetadata['cancellation'] = [
                        'cancelled_by' => $cancelledBy,
                        'reason' => $data['reason'],
                        'cancelled_at' => now()->toDateTimeString(),
                    ];
                    if ($cancelledBy === 'admin') {
                        $jobMetadata['admin_cancellation'] = [
                            'reason' => $data['reason'],
                            'cancelled_at' => now()->toDateTimeString(),
                        ];
                    }
                    $jobMetadata['status_times'] = [
                        ...($jobMetadata['status_times'] ?? []),
                        'cancelled' => now()->toISOString(),
                    ];

                    $job->update([
                        'status' => 'Cancelled',
                        'next_action' => "Booking cancelled by {$actorLabel}",
                        'metadata' => $jobMetadata,
                    ]);
                });

            app(WalletManager::class)->syncBooking($booking->fresh());

            return $booking->fresh();
        });

        app(BookingCustomerMailer::class)->sendStatusUpdate($record, $previousStatus);

        return response()->json($record);
    }

    public function assign(Request $request, Booking $booking)
    {
        $data = $request->validate([
            'partner_id' => ['required', Rule::exists('partners', 'id')],
        ]);

        $record = app(BookingAutoAssignmentManager::class)
            ->assignPartner($booking, Partner::findOrFail($data['partner_id']));

        return response()->json($record);
    }

    public function approveExtraItems(Request $request, Booking $booking)
    {
        $record = DB::transaction(function () use ($booking) {
            $metadata = $booking->metadata ?? [];
            $pending = $metadata['pending_vendor_extra_items'] ?? [];

            if (! is_array($pending) || count($pending) === 0) {
                throw ValidationException::withMessages([
                    'pending_vendor_extra_items' => 'No pending extra items to approve.',
                ]);
            }

            $approvedAt = now()->toDateTimeString();
            $newlyApproved = array_map(fn (array $item) => [
                ...$item,
                'status' => 'approved',
                'approved_at' => $approvedAt,
            ], $pending);

            $approvedExtras = array_values(array_merge($metadata['vendor_extra_items'] ?? [], $newlyApproved));
            $metadata['vendor_extra_items'] = $approvedExtras;
            $metadata['pending_vendor_extra_items'] = [];
            $metadata['extra_items_consent'] = [
                'status' => 'approved',
                'approved_at' => $approvedAt,
                'approved_count' => count($newlyApproved),
            ];
            $metadata = app(BookingMetadataEnricher::class)->enrich($metadata);

            $manager = app(BookingExtraItemsManager::class);
            $newAmount = $manager->recalculateAmount($booking, $metadata['vendor_extra_items'] ?? []);

            $booking->update([
                'amount' => $newAmount,
                'metadata' => $metadata,
                'timeline' => $this->appendTimeline($booking, 'Customer approved extra items'),
            ]);

            $booking = $booking->fresh();
            $manager->syncApprovedExtraItems($booking, $metadata['vendor_extra_items'] ?? []);
            $manager->syncApprovedToVendorJob($booking->fresh(), $newAmount);

            return $this->presentBooking($booking->fresh(['extraItems']));
        });

        return response()->json($record);
    }

    public function rejectExtraItems(Request $request, Booking $booking)
    {
        $record = DB::transaction(function () use ($booking) {
            $metadata = $booking->metadata ?? [];
            $pending = $metadata['pending_vendor_extra_items'] ?? [];

            if (! is_array($pending) || count($pending) === 0) {
                throw ValidationException::withMessages([
                    'pending_vendor_extra_items' => 'No pending extra items to reject.',
                ]);
            }

            $metadata['pending_vendor_extra_items'] = [];
            $metadata['extra_items_consent'] = [
                'status' => 'rejected',
                'rejected_at' => now()->toDateTimeString(),
                'rejected_count' => count($pending),
            ];

            $booking->update([
                'metadata' => $metadata,
                'timeline' => $this->appendTimeline($booking, 'Customer rejected extra items'),
            ]);

            app(BookingExtraItemsManager::class)->syncPendingToVendorJob($booking->fresh());

            return $this->presentBooking($booking->fresh(['extraItems']));
        });

        return response()->json($record);
    }

    private function nextBookingNo(): string
    {
        return 'HC-' . now()->format('ymd') . '-' . str_pad((string) ((Booking::query()->max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);
    }

    private function safeBookingNo(?string $requestedBookingNo = null): string
    {
        if ($requestedBookingNo && ! Booking::where('booking_no', $requestedBookingNo)->exists()) {
            return $requestedBookingNo;
        }

        do {
            $bookingNo = $this->nextBookingNo();
        } while (Booking::where('booking_no', $bookingNo)->exists());

        return $bookingNo;
    }

    private function createBookingWithUniqueNumber(array $payload): Booking
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                return Booking::create($payload);
            } catch (QueryException $exception) {
                if (! str_contains($exception->getMessage(), 'bookings_booking_no_unique')) {
                    throw $exception;
                }

                $payload['booking_no'] = $this->safeBookingNo();
            }
        }

        throw ValidationException::withMessages([
            'booking_no' => 'Could not generate a unique booking number. Please try again.',
        ]);
    }

    public function calculateCheckout(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'coupon_code' => ['nullable', 'string'],
            'customer_id' => ['nullable', 'integer'],
            'use_wallet' => ['nullable', 'boolean'],
        ]);

        $subtotal = 0;
        $validatedItems = [];
        foreach ($data['items'] as $item) {
            $package = ServicePackage::find($item['id']);
            if (!$package) {
                return response()->json(['message' => "Item with ID {$item['id']} not found."], 422);
            }

            $price = (float) $package->price;
            $quantity = $item['quantity'];
            $itemTotal = $price * $quantity;
            $subtotal += $itemTotal;
            
            $validatedItems[] = [
                'id' => $package->id,
                'name' => $package->name,
                'price' => $price,
                'quantity' => $quantity,
                'total' => $itemTotal,
            ];
        }

        $serviceFee = $subtotal > 0 ? 49 : 0;
        $discount = 0;
        $couponPayload = null;

        if (! empty($data['coupon_code'])) {
            try {
                $couponResult = $this->resolveCouponDiscount($data['coupon_code'], $subtotal, $data['items']);
                $discount = $couponResult['discount'];
                $couponPayload = $couponResult['coupon'];
            } catch (ValidationException) {
                $discount = 0;
                $couponPayload = null;
            }
        }

        $total = max(0, round($subtotal + $serviceFee - $discount, 2));
        
        $walletApplied = 0;
        if (!empty($data['use_wallet']) && !empty($data['customer_id'])) {
            $customer = CustomerProfile::find($data['customer_id']);
            $walletBalance = $customer ? \App\Models\CustomerWallet::where('customer_profile_id', $customer->id)->value('balance') : 0;
            $walletBalance = (float) $walletBalance;
            if ($walletBalance > 0) {
                $walletApplied = min($walletBalance, $total);
                $total -= $walletApplied;
            }
        }

        return response()->json([
            'subtotal' => $subtotal,
            'service_fee' => $serviceFee,
            'tax' => $serviceFee,
            'discount' => $discount,
            'coupon' => $couponPayload,
            'wallet_applied' => $walletApplied,
            'total' => round($total, 2),
            'items' => $validatedItems,
        ]);
    }

    private function resolveCouponDiscount(string $code, float $subtotal, array $items = []): array
    {
        return app(CouponDiscountResolver::class)->resolve($code, $subtotal, $items);
    }

    private function validateCheckoutPayload(array $payload): void
    {
        $metadata = $payload['metadata'] ?? [];
        $items = $metadata['items'] ?? [];

        if (! is_array($items) || count($items) === 0) {
            if (! isset($metadata['customer_id'])) {
                return;
            }

            throw ValidationException::withMessages([
                'metadata.items' => 'Cart items are required to place a booking.',
            ]);
        }

        $subtotal = 0;

        foreach ($items as $index => $item) {
            $packageId = $item['id'] ?? null;
            $quantity = (int) ($item['quantity'] ?? 0);

            if (! $packageId || $quantity < 1) {
                throw ValidationException::withMessages([
                    "metadata.items.{$index}" => 'Invalid cart item or quantity.',
                ]);
            }

            $package = ServicePackage::whereKey($packageId)->where('status', 'Active')->first();

            if (! $package) {
                throw ValidationException::withMessages([
                    "metadata.items.{$index}" => 'A cart service is no longer available.',
                ]);
            }

            $subtotal += round((float) $package->price * $quantity, 2);
        }

        $discount = round((float) data_get($metadata, 'coupon.discount', 0), 2);
        $couponCode = data_get($metadata, 'coupon.code');

        if ($couponCode) {
            $checkoutItems = collect($items)
                ->map(fn ($item) => [
                    'id' => (int) ($item['id'] ?? 0),
                    'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                ])
                ->filter(fn ($item) => $item['id'] > 0)
                ->values()
                ->all();

            $resolvedDiscount = round(
                (float) ($this->resolveCouponDiscount((string) $couponCode, $subtotal, $checkoutItems)['discount'] ?? 0),
                2
            );

            if (abs($resolvedDiscount - $discount) > 0.01) {
                throw ValidationException::withMessages([
                    'amount' => 'Coupon discount is invalid for the current cart.',
                ]);
            }

            $discount = $resolvedDiscount;
        }

        $serviceFee = round((float) ($metadata['service_fee'] ?? ($subtotal > 0 ? 49 : 0)), 2);
        $tipAmount = round((float) ($payload['tip_amount'] ?? $metadata['tip_amount'] ?? 0), 2);
        $expectedAmount = max(0, round($subtotal + $serviceFee + $tipAmount - $discount, 2));
        $requestedAmount = round((float) ($payload['amount'] ?? 0), 2);

        if ($discount < 0 || $discount > $subtotal || abs($expectedAmount - $requestedAmount) > 0.01) {
            throw ValidationException::withMessages([
                'amount' => 'Checkout amount does not match the cart value.',
            ]);
        }

        if (stripos((string) ($payload['payment_method'] ?? ''), 'wallet') !== false) {
            $customerId = data_get($metadata, 'customer_id');
            $wallet = $customerId ? CustomerWallet::where('customer_profile_id', $customerId)->lockForUpdate()->first() : null;

            if (! $wallet || strcasecmp((string) $wallet->status, 'Active') !== 0 || round((float) $wallet->balance, 2) < $requestedAmount) {
                throw ValidationException::withMessages([
                    'payment_method' => 'Insufficient balance',
                ]);
            }
        }

        if (! in_array((string) ($payload['payment_status'] ?? 'Pending'), ['Cash', 'Paid', 'Pending'], true)) {
            throw ValidationException::withMessages([
                'payment_status' => 'Invalid payment status for checkout.',
            ]);
        }
    }

    private function appendTimeline(Booking $booking, string $entry): array
    {
        return [...($booking->timeline ?? []), $entry];
    }

    private function normalizeBookingCartItems(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            $packageId = $item['id'] ?? null;
            $quantity = (int) ($item['quantity'] ?? 0);

            if (! $packageId || $quantity < 1) {
                continue;
            }

            $package = ServicePackage::with('service')->whereKey($packageId)->where('status', 'Active')->first();
            if (! $package) {
                continue;
            }

            $price = round((float) $package->price, 2);
            $image = $package->image ?: $package->service?->image;

            $normalized[] = [
                'id' => $package->id,
                'service_package_id' => $package->id,
                'name' => $package->name,
                'price' => $price,
                'quantity' => $quantity,
                'lineTotal' => round($price * $quantity, 2),
                'service_id' => $package->service_id,
                'image' => $image,
            ];
        }

        return $normalized;
    }

    private function presentBooking(Booking|array $booking): array
    {
        $data = is_array($booking) ? $booking : $booking->toArray();
        $metadata = $data['metadata'] ?? [];
        $data['metadata'] = app(BookingMetadataEnricher::class)->enrich(is_array($metadata) ? $metadata : []);

        return $data;
    }

    private function serviceLocationFromMetadata(array $metadata): ?array
    {
        $location = $metadata['service_location']
            ?? data_get($metadata, 'service_address.location')
            ?? data_get($metadata, 'service_address.metadata.location');

        if (! is_array($location)) {
            return null;
        }

        $latitude = $location['latitude'] ?? null;
        $longitude = $location['longitude'] ?? null;

        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
            return null;
        }

        return [
            'accuracy' => isset($location['accuracy']) && is_numeric($location['accuracy']) ? (float) $location['accuracy'] : null,
            'captured_at' => $location['capturedAt'] ?? $location['captured_at'] ?? now()->toDateTimeString(),
            'latitude' => (float) $latitude,
            'longitude' => (float) $longitude,
            'source' => $location['source'] ?? 'checkout',
        ];
    }
}
