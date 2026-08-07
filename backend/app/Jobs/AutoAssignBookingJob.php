<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Support\BookingAutoAssignmentManager;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AutoAssignBookingJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $bookingId)
    {
    }

    public function handle(BookingAutoAssignmentManager $autoAssignment): void
    {
        $booking = Booking::find($this->bookingId);
        if (! $booking) {
            return;
        }

        $autoAssignment->assignIfPossible($booking);
    }
}
