<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use App\Support\PackageDetailSectionSyncer;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('package-sections:sync', function (PackageDetailSectionSyncer $syncer) {
    DB::transaction(function () use ($syncer) {
        $deleted = $syncer->removeDuplicates();
        $result = $syncer->syncMissing();

        $this->info("Scanned {$result['packages']} packages.");
        $this->info("Created {$result['created']} missing package detail sections.");
        $this->info("Removed {$deleted} duplicate package detail sections.");
    });
})->purpose('Create missing package detail sections without overwriting existing records');

Schedule::command('bookings:auto-assign')->everyMinute()->withoutOverlapping();
