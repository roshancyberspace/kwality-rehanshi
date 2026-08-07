<?php

namespace App\Support;

use App\Jobs\AutoAssignBookingJob;
use App\Models\AdminNotification;
use App\Models\Booking;
use App\Models\Category;
use App\Models\Partner;
use App\Models\Service;
use App\Models\ServicePackage;
use App\Models\Setting;
use App\Models\VendorJob;
use Illuminate\Support\Facades\Log;

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

        AutoAssignBookingJob::dispatch($booking->id)
            ->delay(now()->addSeconds((int) ($this->delayMinutes() * 60)));
    }

    public function assignIfPossible(Booking $booking): ?Booking
    {
        if (! $this->isAssignableBooking($booking)) {
            return null;
        }

        if (! $this->autoApprove() && $booking->status !== 'Accepted') {
            Log::info('Auto assignment skipped: booking is not accepted', [
                'booking_id' => $booking->id,
                'booking_no' => $booking->booking_no,
                'status' => $booking->status,
            ]);

            return null;
        }

        $partner = $this->findAvailablePartner($booking);
        if (! $partner) {
            Log::info('Auto assignment skipped: no matching available partner', [
                'booking_id' => $booking->id,
                'booking_no' => $booking->booking_no,
                'service_name' => $booking->service_name,
            ]);

            return null;
        }

        return $this->assignPartner($booking, $partner, true);
    }

    public function processDueBookings(): array
    {
        if (! $this->enabled()) {
            return ['checked' => 0, 'assigned' => 0, 'skipped' => 0];
        }

        $checked = 0;
        $assigned = 0;
        $delayCutoff = now()->subSeconds((int) ($this->delayMinutes() * 60));
        $statuses = $this->autoApprove() ? ['Pending Approval', 'Pending', 'Accepted'] : ['Accepted'];

        Booking::query()
            ->whereNull('partner_id')
            ->whereIn('status', $statuses)
            ->where('created_at', '<=', $delayCutoff)
            ->oldest('id')
            ->chunkById(50, function ($bookings) use (&$checked, &$assigned) {
                foreach ($bookings as $booking) {
                    $checked++;
                    if ($this->assignIfPossible($booking)) {
                        $assigned++;
                    }
                }
            });

        return [
            'checked' => $checked,
            'assigned' => $assigned,
            'skipped' => max(0, $checked - $assigned),
        ];
    }

    public function assignPartner(Booking $booking, Partner $partner, bool $automatic = false): Booking
    {
        $previousStatus = $booking->status;
        $metadata = $booking->metadata ?? [];

        if ($automatic && $this->autoApprove()) {
            $metadata['approval'] = [
                ...($metadata['approval'] ?? []),
                'status' => 'accepted',
                'accepted_at' => now()->toDateTimeString(),
                'mode' => 'auto',
            ];
        }
        $metadata['status_times'] = [
            ...($metadata['status_times'] ?? []),
            ...($automatic && $this->autoApprove() ? ['accepted' => now()->toISOString()] : []),
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
        if ($automatic && $this->autoApprove() && ! in_array('Booking accepted by auto assignment', $timeline, true)) {
            $timeline[] = 'Booking accepted by auto assignment';
        }
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
                    'payment' => trim(($booking->payment_method ?: 'Payment') . ' - ' . ($booking->payment_status ?: 'Pending')),
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

        return $booking;
    }

    private function findAvailablePartner(Booking $booking): ?Partner
    {
        $context = $this->bookingContext($booking);
        $address = strtolower((string) $booking->address);

        return Partner::query()
            ->where('status', 'Active')
            ->where('kyc_status', 'Approved')
            ->where('availability', 'Available')
            ->get()
            ->filter(fn (Partner $partner) => $this->partnerMatchesBooking($partner, $context, $address))
            ->sortBy([
                fn (Partner $partner) => $this->activeJobCount($partner),
                fn (Partner $partner) => -1 * (float) ($partner->rating ?? 0),
                fn (Partner $partner) => $partner->id,
            ])
            ->first();
    }

    private function partnerMatchesBooking(Partner $partner, array $context, string $address): bool
    {
        if ($this->matchArea() && $partner->area && ! str_contains($address, strtolower($partner->area))) {
            return false;
        }

        $partnerText = strtolower(collect([
            $partner->skill,
            $partner->area,
            $partner->city,
            ...($partner->services ?? []),
        ])->filter()->join(' '));

        foreach ($context['keywords'] as $keyword) {
            if ($keyword && str_contains($partnerText, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function bookingContext(Booking $booking): array
    {
        $service = Service::where('name', $booking->service_name)->with('category')->first();
        $packages = collect(data_get($booking->metadata, 'items', []))
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => ServicePackage::with('service.category')->find($id))
            ->filter();
        $category = $service?->category ?: $packages->first()?->service?->category ?: Category::where('name', $booking->service_name)->first();

        $keywords = collect([
            $booking->service_name,
            $service?->name,
            $category?->name,
            ...($service?->includes ?? []),
            ...$packages->pluck('name')->all(),
            ...$packages->pluck('category_key')->all(),
        ])
            ->filter()
            ->map(fn ($value) => strtolower((string) $value))
            ->flatMap(fn ($value) => [$value, ...preg_split('/[^a-z0-9]+/i', $value)])
            ->filter(fn ($value) => strlen($value) >= 3)
            ->unique()
            ->values()
            ->all();

        return ['keywords' => $keywords];
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
            && ! in_array($booking->status, ['Rejected', 'Cancelled', 'Completed', 'Refunded'], true);
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
