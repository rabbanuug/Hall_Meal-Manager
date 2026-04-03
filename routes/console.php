<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cancel future bookings for students with dues pending > 2 months
Schedule::command('meal:check-dues')
    ->dailyAt('02:00')
    ->timezone('Asia/Dhaka')
    ->withoutOverlapping()
    ->runInBackground();

// Alert when failed jobs accumulate — log for external monitoring to pick up
Schedule::call(function () {
    $count = \Illuminate\Support\Facades\DB::table('failed_jobs')->count();
    if ($count > 0) {
        \Illuminate\Support\Facades\Log::error('Queue: failed jobs detected', [
            'count' => $count,
            'action' => 'Run: php artisan queue:retry all',
        ]);
    }
})->everyFifteenMinutes()->name('monitor-failed-jobs')->withoutOverlapping();
