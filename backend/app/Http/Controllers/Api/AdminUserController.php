<?php

namespace App\Http\Controllers\Api;

use App\Models\AdminUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminUserController extends CrudController
{
    protected string $model = AdminUser::class;
    protected array $rules = [
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
        'role_id' => ['nullable', 'exists:roles,id'],
        'role_name' => ['nullable', 'string', 'max:255'],
        'permissions' => ['nullable', 'array'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    protected function validatedData(Request $request): array
    {
        if (($request->isMethod('patch') || $request->isMethod('put')) && empty($request->input('password'))) {
            unset($this->rules['password']);
            $request->request->remove('password');
            $request->request->remove('password_confirmation');
        }

        $data = parent::validatedData($request);

        if (array_key_exists('role_id', $data)) {
            if (! empty($data['role_id'])) {
                $role = \App\Models\Role::find($data['role_id']);
                if ($role) {
                    $data['role_name'] = $role->name;
                    $data['permissions'] = $role->permissions ?? [];
                }
            } else {
                $data['role_name'] = null;
                $data['permissions'] = [];
            }
        }

        return $data;
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $adminUser = AdminUser::query()
            ->where('email', $data['email'])
            ->first();

        if (! $adminUser || ! $adminUser->password || ! Hash::check($data['password'], $adminUser->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid super admin login details.']);
        }

        if ($adminUser->status && $adminUser->status !== 'Active') {
            throw ValidationException::withMessages(['email' => 'This admin account is not active.']);
        }

        $token = $adminUser->createToken('admin_token')->plainTextToken;

        \App\Models\LoginLog::create([
            'user_type' => 'Admin',
            'user_id' => $adminUser->id,
            'user_name' => $adminUser->name,
            'email' => $adminUser->email,
            'phone' => null,
            'role' => $adminUser->role_name ?: 'Super Admin',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_name' => $request->input('device_name') ?: 'Web Browser',
            'device_id' => $request->input('device_id'),
            'platform' => $request->input('platform') ?: 'web',
            'fcm_token' => $request->input('fcm_token'),
            'apns_token' => $request->input('apns_token'),
            'latitude' => $request->input('latitude') ?: $request->input('lat'),
            'longitude' => $request->input('longitude') ?: $request->input('lng'),
            'status' => 'Success',
            'is_blocked' => false,
        ]);

        return response()->json([
            'message' => 'Super admin login successful.',
            'admin' => $adminUser,
            'auth_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'admin' => $request->user(),
        ]);
    }

    public function updatePassword(Request $request, AdminUser $adminUser)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $adminUser->update(['password' => $data['password']]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}
