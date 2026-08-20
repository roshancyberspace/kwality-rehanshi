<?php

namespace App\Http\Controllers;

use App\Support\BookingAutoAssignmentManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CronAutoAssignController extends Controller
{
    public function __invoke(Request $request, BookingAutoAssignmentManager $autoAssignment): JsonResponse
    {
        $expected = (string) (config('app.cron_token') ?: config('app.key'));
        $provided = (string) $request->query('token', $request->header('X-Cron-Token', ''));

        if ($expected === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $result = $autoAssignment->processDueBookings();

        return response()->json([
            'ok' => true,
            'auto_assign_enabled' => $autoAssignment->enabled(),
            'delay_minutes' => $autoAssignment->delayMinutes(),
            ...$result,
        ]);
    }
}
