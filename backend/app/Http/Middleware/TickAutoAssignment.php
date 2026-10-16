<?php

namespace App\Http\Middleware;

use App\Support\BookingAutoAssignmentManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TickAutoAssignment
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        try {
            app(BookingAutoAssignmentManager::class)->tick();
        } catch (Throwable $exception) {
            Log::error('Auto assignment tick failed', [
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
