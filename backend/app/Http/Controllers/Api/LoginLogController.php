<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use Illuminate\Http\Request;

class LoginLogController extends Controller
{
    public function index(Request $request)
    {
        $query = LoginLog::query();

        if ($request->filled('user_type') && $request->input('user_type') !== 'All') {
            $query->where('user_type', $request->input('user_type'));
        }

        if ($request->has('is_blocked') && $request->input('is_blocked') !== '' && $request->input('is_blocked') !== null) {
            $query->where('is_blocked', filter_var($request->input('is_blocked'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('device_name', 'like', "%{$search}%")
                    ->orWhere('device_id', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%")
                    ->orWhere('platform', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->integer('per_page', 25);
        $logs = $query->latest('id')->paginate($perPage);

        return response()->json($logs);
    }

    public function show(LoginLog $loginLog)
    {
        $user = $loginLog->resolveUser();

        return response()->json([
            'login_log' => $loginLog,
            'user' => $user,
        ]);
    }

    public function block(Request $request, LoginLog $loginLog)
    {
        $user = $loginLog->resolveUser();

        if ($user) {
            if ($loginLog->user_type === 'Partner') {
                $user->update([
                    'status' => 'Blocked',
                    'availability' => 'Unavailable',
                ]);
            } else {
                $user->update([
                    'status' => 'Blocked',
                ]);
            }

            // Revoke all active Sanctum tokens for immediate lockout
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }
        }

        LoginLog::query()
            ->where('user_type', $loginLog->user_type)
            ->where('user_id', $loginLog->user_id)
            ->update([
                'is_blocked' => true,
                'status' => 'Blocked',
            ]);

        $loginLog->refresh();

        return response()->json([
            'message' => "User {$loginLog->user_name} access has been blocked and all active sessions revoked.",
            'login_log' => $loginLog,
        ]);
    }

    public function unblock(Request $request, LoginLog $loginLog)
    {
        $user = $loginLog->resolveUser();

        if ($user) {
            if ($loginLog->user_type === 'Partner') {
                $user->update([
                    'status' => 'Active',
                    'availability' => $user->kyc_status === 'Approved' ? 'Available' : 'Unavailable',
                ]);
            } else {
                $user->update([
                    'status' => 'Active',
                ]);
            }
        }

        LoginLog::query()
            ->where('user_type', $loginLog->user_type)
            ->where('user_id', $loginLog->user_id)
            ->update([
                'is_blocked' => false,
                'status' => 'Success',
            ]);

        $loginLog->refresh();

        return response()->json([
            'message' => "User {$loginLog->user_name} access has been unblocked.",
            'login_log' => $loginLog,
        ]);
    }

    public function destroy(LoginLog $loginLog)
    {
        $loginLog->delete();

        return response()->json([
            'message' => 'Login log entry deleted successfully.',
        ]);
    }
}
