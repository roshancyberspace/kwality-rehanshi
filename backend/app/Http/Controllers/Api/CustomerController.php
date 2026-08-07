<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\CustomerProfile;
use App\Models\AdminUser;
use App\Models\CustomerWallet;
use App\Models\Payment;
use App\Models\Role;
use App\Models\SavedAddress;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomerController extends CrudController
{
    protected string $model = CustomerProfile::class;

    protected array $rules = [
        'name' => ['required', 'string', 'max:255'],
        'phone' => ['nullable', 'string', 'max:50'],
        'email' => ['nullable', 'email', 'max:255'],
        'address' => ['nullable', 'string'],
        'bookings_count' => ['nullable', 'integer'],
        'last_booking_at' => ['nullable', 'date'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    private function publicCustomer(CustomerProfile $customer): array
    {
        $metadata = $customer->metadata ?? [];
        unset($metadata['password'], $metadata['password_hash'], $metadata['session_token'], $metadata['password_reset']);

        return [
            ...$customer->toArray(),
            'metadata' => $metadata,
        ];
    }

    public function update(Request $request, int|string $id)
    {
        $data = $this->validatedData($request);
        $customer = CustomerProfile::findOrFail($id);
        $customer->update($data);

        return response()->json($this->publicCustomer($customer->fresh()));
    }

    public function updatePassword(Request $request, CustomerProfile $customer)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'admin_user_id' => ['required', 'integer', 'exists:admin_users,id'],
        ]);

        if (! $this->isSuperAdmin((int) $data['admin_user_id'])) {
            return response()->json(['message' => 'Only Super Admin can change customer passwords.'], 403);
        }

        $metadata = $customer->metadata ?? [];
        $metadata['password_hash'] = Hash::make($data['password']);
        unset($metadata['password'], $metadata['password_reset'], $metadata['session_token']);

        $customer->forceFill(['metadata' => $metadata])->save();

        return response()->json([
            'message' => 'Customer password updated successfully.',
            'customer' => $customer->fresh(),
        ]);
    }

    public function uploadProfilePicture(Request $request, CustomerProfile $customer)
    {
        $request->validate([
            'profile_picture' => ['required', 'image', 'max:3072'],
        ]);

        $file = $request->file('profile_picture');
        $filename = $file->hashName();
        $destination = public_path('profile-pictures');

        if (! is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $file->move($destination, $filename);

        $metadata = $customer->metadata ?? [];
        $metadata['profile_picture'] = 'profile-pictures/'.$filename;

        $customer->forceFill(['metadata' => $metadata])->save();

        return response()->json([
            'message' => 'Customer profile picture updated successfully.',
            'customer' => $this->publicCustomer($customer->fresh()),
        ]);
    }

    public function overview(CustomerProfile $customer)
    {
        $bookingQuery = $this->customerBookingsQuery($customer);
        $bookings = (clone $bookingQuery)->latest('id')->get();
        $bookingIds = $bookings->pluck('id')->filter()->values();
        $bookingNumbers = $bookings->pluck('booking_no')->filter()->values();
        $cancelledStatuses = ['Cancelled', 'Canceled', 'Rejected', 'Refunded'];
        $completedStatuses = ['Completed'];
        $activeStatuses = [
            'Pending',
            'Pending Approval',
            'Accepted',
            'Professional Assigned',
            'Vendor Accepted',
            'On The Way',
            'On the way',
            'Reached - OTP Verified',
            'OTP verified',
            'Started',
            'In progress',
        ];

        $payments = Payment::query()
            ->where(function ($query) use ($customer, $bookingIds) {
                if ($bookingIds->isNotEmpty()) {
                    $query->whereIn('booking_id', $bookingIds);
                }

                $query->orWhere('customer_name', $customer->name);
            })
            ->latest('id')
            ->get();

        $transactions = WalletTransaction::query()
            ->where('wallet_type', 'Customer')
            ->where(function ($query) use ($customer, $bookingNumbers) {
                $query->where('customer_profile_id', $customer->id);

                if ($bookingNumbers->isNotEmpty()) {
                    $query->orWhereIn('booking_no', $bookingNumbers);
                }
            })
            ->latest('id')
            ->get();

        $addresses = SavedAddress::where('customer_profile_id', $customer->id)->latest('id')->get();
        $wallet = CustomerWallet::where('customer_profile_id', $customer->id)->first();

        return response()->json([
            'customer' => $this->publicCustomer($customer),
            'stats' => [
                'total_bookings' => $bookings->count(),
                'active_bookings' => $bookings->whereIn('status', $activeStatuses)->count(),
                'completed_bookings' => $bookings->whereIn('status', $completedStatuses)->count(),
                'cancelled_bookings' => $bookings->whereIn('status', $cancelledStatuses)->count(),
                'total_spent' => round((float) $bookings->sum('amount'), 2),
                'paid_amount' => round((float) $payments->whereIn('status', ['Paid', 'Cash'])->sum('amount'), 2),
                'transactions' => $transactions->count(),
                'saved_addresses' => $addresses->count(),
            ],
            'wallet' => $wallet,
            'bookings' => $bookings->values(),
            'payments' => $payments->values(),
            'transactions' => $transactions->values(),
            'saved_addresses' => $addresses->values(),
        ]);
    }

    private function customerBookingsQuery(CustomerProfile $customer)
    {
        return Booking::query()
            ->where('metadata->customer_id', $customer->id)
            ->orWhere(function ($query) use ($customer) {
                $query->where('customer_phone', $customer->phone)
                    ->whereNotNull('customer_phone')
                    ->where('customer_phone', '<>', '');
            })
            ->orWhere(function ($query) use ($customer) {
                $query->where('customer_name', $customer->name)
                    ->whereNotNull('customer_name')
                    ->where('customer_name', '<>', '');
            });
    }

    private function isSuperAdmin(int $adminUserId): bool
    {
        $admin = AdminUser::find($adminUserId);
        if (! $admin) {
            return false;
        }

        $role = $admin->role_id ? Role::find($admin->role_id) : null;
        $permissions = $role?->permissions ?: ($admin->permissions ?: []);

        return strtolower((string) ($role?->name ?: $admin->role_name)) === 'super admin'
            || in_array('*', $permissions, true);
    }
}
