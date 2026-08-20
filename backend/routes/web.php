<?php

use App\Http\Controllers\CronAutoAssignController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::match(['GET', 'POST'], '/cron/auto-assign', CronAutoAssignController::class);
