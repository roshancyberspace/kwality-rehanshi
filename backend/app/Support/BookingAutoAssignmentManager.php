<?php

namespace App\Support;

use App\Jobs\AutoAssignBookingJob;
use App\Models\AdminNotification;
use App\Models\Booking;
use App\Models\Partner;
use App\Models\ServiceLocation;
use App\Models\ServicePackage;
use App\Models\Setting;
use App\Models\VendorJob;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class BookingAutoAssignmentManager
{
    public function scheduleIfEnabled(Booking $booking): void
    {
        if (! $this->enabled()) {
            return;
        }

        if (! $this->isAssignableBooking($booking)) {
            return;
        }

        if (! $this->isApprovedStatus($booking->status)) {
            Log::info('Auto assignment schedule skipped: booking not approved', [
                'booking_id' => $booking->id,
                'booking_no' => $booking->booking_no,
                'status' => $booking->status,
            ]);

            return;
        }

        if ($this->delayMinutes() <= 0) {
            $this->assignIfPossible($booking);

            return;
        }

        try {
            AutoAssignBookingJob::dispatch($booking->id)
                ->delay(now()->addSeconds((int) ($this->delayMinutes() * 60)));
        } catch (Throwable $exception) {
            Log::warning('Auto assignment queue dispatch failed; cron/API tick will retry', [
                'booking_id' => $booking->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function tick(): array
    {
        if (! $this->enabled() && ! $this->autoApprove()) {
            return [
                'checked' => 0,
                'approved' => 0,
                'assigned' => 0,
                'skipped' => 0,
            ];
        }

        if (! Cache::add('bookings-auto-assign-tick', 1, 15)) {
            return [
                'checked' => 0,
                'approved' => 0,
                'assigned' => 0,
                'skipped' => 0,
                'throttled' => true,
            ];
        }

        return $this->processDueBookings();
    }

    public function approveIfPossible(Booking $booking, bool $scheduleAssignment = true): ?Booking
    {
        if (! $this->autoApprove()) {
            return null;
        }

        try {
            return DB::transaction(function () use ($booking, $scheduleAssignment) {
                $locked = Booking::query()->whereKey($booking->id)->lockForUpdate()->first();
                if (! $locked) {
                    return null;
                }

                if (! in_array($locked->status, ['Pending Approval', 'Pending'], true)) {
                    return null;
                }

                if ($locked->partner_id) {
                    return null;
                }

                $previousStatus = $locked->status;
                $metadata = $locked->metadata ?? [];
                $metadata['approval'] = [
                    ...($metadata['approval'] ?? []),
                    'status' => 'accepted',
                    'accepted_at' => now()->toDateTimeString(),
                    'mode' => 'auto',
                ];
                $metadata['status_times'] = [
                    ...($metadata['status_times'] ?? []),
                    'accepted' => now()->toISOString(),
                ];

                $timeline = $locked->timeline ?? [];
                if (! in_array('Booking accepted by auto assignment', $timeline, true)
                    && ! in_array('Booking accepted by super admin', $timeline, true)) {
                    $timeline[] = 'Booking accepted by auto assignment';
                }

                $locked->update([
                    'status' => 'Accepted',
                    'timeline' => $timeline,
                    'metadata' => $metadata,
                ]);

                Log::info('Booking automatically approved', [
                    'booking_id' => $locked->id,
                    'booking_no' => $locked->booking_no,
                ]);

                $fresh = $locked->fresh();
                app(WalletManager::class)->syncBooking($fresh);
                app(BookingCustomerMailer::class)->sendStatusUpdate($fresh, $previousStatus);

                if ($scheduleAssignment && $this->enabled()) {
                    $this->scheduleIfEnabled($fresh);
                }

                return $fresh;
            });
        } catch (Throwable $exception) {
            Log::error('Automatic approval failed', [
                'booking_id' => $booking->id,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    public function assignIfPossible(Booking $booking): ?Booking
    {
        if (! $this->enabled()) {
            return null;
        }

        try {
            return DB::transaction(function () use ($booking) {
                $locked = Booking::query()->whereKey($booking->id)->lockForUpdate()->first();
                if (! $locked) {
                    return null;
                }

                if (! $this->isAssignableBooking($locked)) {
                    Log::info('Assignment skipped because booking already assigned or closed', [
                        'booking_id' => $locked->id,
                        'booking_no' => $locked->booking_no,
                        'status' => $locked->status,
                        'partner_id' => $locked->partner_id,
                    ]);

                    return null;
                }

                if (! $this->isApprovedStatus($locked->status)) {
                    Log::info('Auto assignment skipped: booking is not accepted', [
                        'booking_id' => $locked->id,
                        'booking_no' => $locked->booking_no,
                        'status' => $locked->status,
                    ]);

                    return null;
                }

                if (! $this->delayElapsed($locked)) {
                    Log::info('Booking waiting for assignment delay', [
                        'booking_id' => $locked->id,
                        'booking_no' => $locked->booking_no,
                        'delay_minutes' => $this->delayMinutes(),
                    ]);

                    return null;
                }

                $requirements = $this->bookingRequirements($locked);
                if ($requirements['skip_reason']) {
                    Log::info('Assignment skipped: '.$requirements['skip_reason'], [
                        'booking_id' => $locked->id,
                        'booking_no' => $locked->booking_no,
                    ]);

                    return null;
                }

                Log::info('Searching eligible vendors', [
                    'booking_id' => $locked->id,
                    'booking_no' => $locked->booking_no,
                    'service_ids' => $requirements['service_ids'],
                    'sub_service_ids' => $requirements['sub_service_ids'],
                    'pincode' => $requirements['pincode'],
                ]);

                $partner = $this->findAvailablePartner($locked, $requirements);
                if (! $partner) {
                    Log::info('No eligible vendor found', [
                        'booking_id' => $locked->id,
                        'booking_no' => $locked->booking_no,
                    ]);

                    return null;
                }

                $partner = Partner::query()->whereKey($partner->id)->lockForUpdate()->first();
                if (! $partner
                    || $partner->status !== 'Active'
                    || $partner->kyc_status !== 'Approved'
                    || $partner->availability !== 'Available') {
                    Log::info('Vendor selected but no longer eligible', [
                        'booking_id' => $locked->id,
                        'partner_id' => $partner?->id,
                    ]);

                    return null;
                }

                Log::info('Vendor selected', [
                    'booking_id' => $locked->id,
                    'booking_no' => $locked->booking_no,
                    'partner_id' => $partner->id,
                ]);

                return $this->assignPartner($locked, $partner, true);
            });
        } catch (Throwable $exception) {
            Log::error('Automatic assignment failed', [
                'booking_id' => $booking->id,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    public function processDueBookings(): array
    {
        $checked = 0;
        $approved = 0;
        $assigned = 0;
        if ($this->autoApprove()) {
            Booking::query()
                ->whereNull('partner_id')
                ->whereIn('status', ['Pending Approval', 'Pending'])
                ->oldest('id')
                ->chunkById(50, function ($bookings) use (&$checked, &$approved) {
                    foreach ($bookings as $booking) {
                        $checked++;
                        try {
                            if ($this->approveIfPossible($booking, false)) {
                                $approved++;
                            }
                        } catch (Throwable $exception) {
                            Log::error('Automatic approval chunk item failed', [
                                'booking_id' => $booking->id,
                                'error' => $exception->getMessage(),
                            ]);
                        }
                    }
                });
        }

        if ($this->enabled()) {
            $this->releaseIdlePartners();

            Booking::query()
                ->whereNull('partner_id')
                ->where('status', 'Accepted')
                ->oldest('id')
                ->chunkById(50, function ($bookings) use (&$checked, &$assigned) {
                    foreach ($bookings as $booking) {
                        $checked++;
                        try {
                            if (! $this->delayElapsed($booking)) {
                                Log::info('Booking waiting for assignment delay', [
                                    'booking_id' => $booking->id,
                                    'booking_no' => $booking->booking_no,
                                ]);
                                continue;
                            }

                            if ($this->assignIfPossible($booking)) {
                                $assigned++;
                            }
                        } catch (Throwable $exception) {
                            Log::error('Automatic assignment chunk item failed', [
                                'booking_id' => $booking->id,
                                'error' => $exception->getMessage(),
                            ]);
                        }
                    }
                });
        }

        return [
            'checked' => $checked,
            'approved' => $approved,
            'assigned' => $assigned,
            'skipped' => max(0, $checked - $approved - $assigned),
        ];
    }

    public function assignPartner(Booking $booking, Partner $partner, bool $automatic = false): Booking
    {
        $previousStatus = $booking->status;
        $metadata = $booking->metadata ?? [];

        $metadata['status_times'] = [
            ...($metadata['status_times'] ?? []),
            'professional_assigned' => now()->toISOString(),
        ];

        $metadata['assigned_partner'] = [
            'id' => $partner->id,
            'name' => $partner->name,
            'assigned_at' => now()->toDateTimeString(),
            'mode' => $automatic ? 'auto' : 'manual',
        ];

        $timelineEntry = ($automatic ? 'Auto assigned' : 'Assigned').' to '.$partner->name;
        $timeline = $booking->timeline ?? [];
        $timeline[] = $timelineEntry;

        $booking->update([
            'partner_id' => $partner->id,
            'professional_name' => $partner->name,
            'status' => 'Professional Assigned',
            'timeline' => $timeline,
            'metadata' => $metadata,
        ]);

        if ($partner->availability === 'Available') {
            $partner->update(['availability' => 'Busy']);
        }

        VendorJob::updateOrCreate(
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
                    'customer_phone' => $booking->customer_phone,
                    'customer_location' => $metadata['service_location'] ?? data_get($metadata, 'service_address.location'),
                    'otp' => $metadata['service_otp'] ?? null,
                    'payment' => trim(($booking->payment_method ?: 'Payment').' - '.($booking->payment_status ?: 'Pending')),
                    'partner_name' => $partner->name,
                    'service_address' => $metadata['service_address'] ?? null,
                    'notification' => [
                        'sound' => true,
                        'title' => $automatic ? 'Auto-assigned booking' : 'New booking assigned',
                        'message' => "{$booking->booking_no} assigned to you.",
                        'sent_at' => now()->toDateTimeString(),
                    ],
                    'status_times' => $metadata['status_times'] ?? [],
                    'work' => $metadata['work'] ?? [],
                    'items' => $metadata['items'] ?? [],
                ],
            ],
        );

        AdminNotification::create([
            'channel' => 'Push',
            'audience' => 'Partners',
            'title' => $automatic ? 'Booking auto assigned' : 'Booking assigned',
            'message' => "{$booking->booking_no} assigned to {$partner->name}.",
            'status' => 'Sent',
            'sent_at' => now(),
            'metadata' => ['booking_id' => $booking->id, 'partner_id' => $partner->id, 'mode' => $automatic ? 'auto' : 'manual'],
        ]);

        $booking = $booking->fresh();
        app(WalletManager::class)->syncBooking($booking);
        app(BookingCustomerMailer::class)->sendStatusUpdate($booking, $previousStatus);

        Log::info('Booking assigned', [
            'booking_id' => $booking->id,
            'booking_no' => $booking->booking_no,
            'partner_id' => $partner->id,
            'mode' => $automatic ? 'auto' : 'manual',
        ]);

        return $booking;
    }

    public function releasePartnerIfIdle(?int $partnerId): void
    {
        if (! $partnerId) {
            return;
        }

        $hasActiveJob = Booking::query()
            ->where('partner_id', $partnerId)
            ->whereNotIn('status', [
                'Completed',
                'Cancelled',
                'Canceled',
                'Rejected',
                'Refunded',
                'Vendor Rejected',
            ])
            ->exists();

        if ($hasActiveJob) {
            return;
        }

        Partner::query()
            ->whereKey($partnerId)
            ->whereIn('availability', ['Busy', 'On job'])
            ->update(['availability' => 'Available']);
    }

    public function releaseIdlePartners(): void
    {
        Partner::query()
            ->whereIn('availability', ['Busy', 'On job'])
            ->pluck('id')
            ->each(fn ($id) => $this->releasePartnerIfIdle((int) $id));
    }

    private function findAvailablePartner(Booking $booking, array $requirements): ?Partner
    {
        $candidates = Partner::query()
            ->where('status', 'Active')
            ->where('kyc_status', 'Approved')
            ->where('availability', 'Available')
            ->get()
            ->map(function (Partner $partner) use ($requirements) {
                $score = $this->partnerMatchScore($partner, $requirements);
                if ($score === null) {
                    return null;
                }

                return [
                    'partner' => $partner,
                    'score' => $score,
                    'workload' => $this->activeJobCount($partner),
                    'rating' => (float) ($partner->rating ?? 0),
                ];
            })
            ->filter()
            ->sortBy([
                ['score', 'asc'],
                ['workload', 'asc'],
                ['rating', 'desc'],
                fn ($row) => $row['partner']->id,
            ])
            ->values();

        return $candidates->first()['partner'] ?? null;
    }

    /**
     * Lower score = higher priority. Null = ineligible.
     */
    private function partnerMatchScore(Partner $partner, array $requirements): ?int
    {
        $partnerSubIds = array_values(array_filter(array_map('intval', $partner->sub_service_ids ?? [])));
        $partnerServiceIds = array_values(array_filter(array_map('intval', $partner->service_ids ?? [])));
        $requiredSubIds = $requirements['sub_service_ids'];
        $requiredServiceIds = $requirements['service_ids'];

        $hasSubMatch = $requiredSubIds !== [] && $partnerSubIds !== []
            && ! empty(array_intersect($requiredSubIds, $partnerSubIds));
        $hasServiceMatch = $requiredServiceIds !== [] && $partnerServiceIds !== []
            && ! empty(array_intersect($requiredServiceIds, $partnerServiceIds));

        if (! $hasSubMatch && ! $hasServiceMatch) {
            if ($partnerServiceIds === [] && $partnerSubIds === [] && $this->legacyKeywordMatch($partner, $requirements['keywords'])) {
                $hasServiceMatch = true;
            } else {
                return null;
            }
        }

        $bookingPincode = $requirements['pincode'];
        $partnerPincode = $this->normalizePincode($partner->pincode);
        $partnerPins = collect($partner->serviceable_pincodes ?? [])
            ->map(fn ($value) => $this->normalizePincode($value))
            ->filter()
            ->when($partnerPincode, fn ($pins) => $pins->push($partnerPincode))
            ->unique()
            ->values()
            ->all();
        $bookingCity = strtolower(trim((string) $requirements['city']));
        $partnerCity = strtolower(trim((string) ($partner->city ?? '')));
        $bookingArea = strtolower(trim((string) $requirements['area']));
        $partnerArea = strtolower(trim((string) ($partner->area ?? '')));

        $skillOffset = $hasSubMatch ? 0 : 10;

        if ($bookingPincode) {
            if (in_array($bookingPincode, $partnerPins, true)) {
                return $skillOffset + 0; // exact pincode / serviceable list
            }

            if ($partnerPins !== [] && ! empty(array_intersect($partnerPins, $requirements['nearby_pincodes']))) {
                return $skillOffset + 1; // nearby/serviceable pincode
            }

            if ($bookingCity && $partnerCity && $bookingCity === $partnerCity) {
                return $skillOffset + 2; // same city fallback
            }

            if ($this->matchArea()) {
                if ($bookingArea && $partnerArea && str_contains($bookingArea, $partnerArea)) {
                    return $skillOffset + 3;
                }
                if ($partnerArea && str_contains(strtolower((string) $requirements['address']), $partnerArea)) {
                    return $skillOffset + 3;
                }

                return null;
            }

            return $skillOffset + 4; // skill match without location preference
        }

        if ($this->matchArea()) {
            if ($bookingArea && $partnerArea && (str_contains($bookingArea, $partnerArea) || str_contains($partnerArea, $bookingArea))) {
                return $skillOffset + 3;
            }
            if ($partnerArea && str_contains(strtolower((string) $requirements['address']), $partnerArea)) {
                return $skillOffset + 3;
            }

            return null;
        }

        return $skillOffset + 5;
    }

    private function legacyKeywordMatch(Partner $partner, array $keywords): bool
    {
        if ($keywords === []) {
            return false;
        }

        $partnerText = strtolower(collect([
            $partner->skill,
            $partner->area,
            $partner->city,
            ...($partner->services ?? []),
        ])->filter()->join(' '));

        foreach ($keywords as $keyword) {
            if ($keyword && str_contains($partnerText, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function bookingRequirements(Booking $booking): array
    {
        $packageIds = collect(data_get($booking->metadata, 'items', []))
            ->map(fn ($item) => (int) ($item['id'] ?? $item['service_package_id'] ?? 0))
            ->filter()
            ->values();

        if ($booking->service_package_id) {
            $packageIds->push((int) $booking->service_package_id);
        }

        $packages = $packageIds->isNotEmpty()
            ? ServicePackage::query()->whereIn('id', $packageIds->unique()->all())->get()
            : collect();

        $subServiceIds = $packages->pluck('sub_service_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all();
        $serviceIds = collect([$booking->service_id])
            ->merge($packages->pluck('service_id'))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $pincode = $this->bookingPincode($booking);
        $city = (string) (data_get($booking->metadata, 'service_address.city') ?: '');
        $area = (string) (
            data_get($booking->metadata, 'service_address.area')
            ?: data_get($booking->metadata, 'service_address.street')
            ?: ''
        );
        $address = (string) $booking->address;

        $nearbyPincodes = [];
        if ($pincode) {
            $nearbyQuery = ServiceLocation::query()
                ->where('status', 'Active')
                ->where('pincode', '!=', $pincode)
                ->whereNotNull('pincode');

            if ($city !== '') {
                $nearbyQuery->whereRaw('LOWER(city) = ?', [strtolower($city)]);
            }

            $nearbyPincodes = $nearbyQuery
                ->pluck('pincode')
                ->map(fn ($value) => $this->normalizePincode($value))
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        $keywords = collect([
            $booking->service_name,
            ...$packages->pluck('name')->all(),
        ])
            ->filter()
            ->map(fn ($value) => strtolower((string) $value))
            ->flatMap(fn ($value) => [$value, ...preg_split('/[^a-z0-9]+/i', $value)])
            ->filter(fn ($value) => strlen((string) $value) >= 3)
            ->unique()
            ->values()
            ->all();

        $skipReason = null;
        if ($subServiceIds === [] && $serviceIds === []) {
            $skipReason = 'Invalid/missing subservice';
        }

        return [
            'sub_service_ids' => $subServiceIds,
            'service_ids' => $serviceIds,
            'pincode' => $pincode,
            'nearby_pincodes' => $nearbyPincodes,
            'city' => $city,
            'area' => $area,
            'address' => $address,
            'keywords' => $keywords,
            'skip_reason' => $skipReason,
        ];
    }

    private function bookingPincode(Booking $booking): ?string
    {
        $candidates = [
            data_get($booking->metadata, 'service_address.pincode'),
            data_get($booking->metadata, 'pincode'),
            data_get($booking->metadata, 'service_address.metadata.pincode'),
        ];

        foreach ($candidates as $candidate) {
            $normalized = $this->normalizePincode($candidate);
            if ($normalized) {
                return $normalized;
            }
        }

        if (preg_match('/\b(\d{6})\b/', (string) $booking->address, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function normalizePincode(mixed $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if (! $digits) {
            return null;
        }

        return strlen($digits) >= 6 ? substr($digits, 0, 6) : $digits;
    }

    private function delayElapsed(Booking $booking): bool
    {
        $eligibleAt = $this->assignmentEligibleAt($booking);
        if (! $eligibleAt) {
            return false;
        }

        return $eligibleAt->lte(now()->subSeconds((int) ($this->delayMinutes() * 60)));
    }

    private function assignmentEligibleAt(Booking $booking): ?Carbon
    {
        $acceptedAt = data_get($booking->metadata, 'approval.accepted_at')
            ?: data_get($booking->metadata, 'status_times.accepted');

        if ($acceptedAt) {
            try {
                return Carbon::parse($acceptedAt);
            } catch (Throwable) {
                // fall through
            }
        }

        return $booking->created_at ? Carbon::parse($booking->created_at) : null;
    }

    private function activeJobCount(Partner $partner): int
    {
        return VendorJob::where('partner_id', $partner->id)
            ->whereNotIn('status', ['Completed', 'Rejected', 'Cancelled'])
            ->count();
    }

    private function isAssignableBooking(Booking $booking): bool
    {
        return ! $booking->partner_id
            && ! in_array($booking->status, ['Rejected', 'Cancelled', 'Completed', 'Refunded', 'Professional Assigned', 'Vendor Accepted', 'On The Way', 'Reached - OTP Verified', 'Started'], true);
    }

    private function isApprovedStatus(?string $status): bool
    {
        return in_array($status, ['Accepted'], true);
    }

    public function enabled(): bool
    {
        return $this->setting('enabled', '0') === '1';
    }

    public function autoApprove(): bool
    {
        return $this->setting('auto_approve', '1') === '1';
    }

    public function matchArea(): bool
    {
        return $this->setting('match_area', '0') === '1';
    }

    public function delayMinutes(): float
    {
        return max(0.0, min(30.0, (float) $this->setting('delay_minutes', '2')));
    }

    public function setting(string $key, string $default): string
    {
        return (string) (Setting::where('group', 'auto_assignment')->where('key', $key)->value('value') ?? $default);
    }
}
