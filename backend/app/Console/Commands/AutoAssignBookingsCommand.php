<?php

namespace App\Console\Commands;

use App\Support\BookingAutoAssignmentManager;
use Illuminate\Console\Command;

class AutoAssignBookingsCommand extends Command
{
    protected $signature = 'bookings:auto-assign';

    protected $description = 'Auto-approve due bookings and assign them to available partners with the same subservice or service after the configured delay';

    public function handle(BookingAutoAssignmentManager $autoAssignment): int
    {
        if (! $autoAssignment->enabled() && ! $autoAssignment->autoApprove()) {
            $this->info('Automatic vendor assignment and auto-approval are both Off. Nothing to do.');

            return self::SUCCESS;
        }

        $result = $autoAssignment->processDueBookings();

        $this->info("Checked {$result['checked']} due bookings.");
        $this->info("Approved {$result['approved']} bookings.");
        $this->info("Assigned {$result['assigned']} bookings.");
        $this->info("Skipped {$result['skipped']} bookings.");

        return self::SUCCESS;
    }
}
