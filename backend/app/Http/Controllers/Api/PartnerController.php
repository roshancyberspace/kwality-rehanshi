<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\BookingLedger;
use App\Models\Partner;
use App\Models\AdminUser;
use App\Models\Review;
use App\Models\Role;
use App\Models\VendorJob;
use App\Models\VendorWallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PartnerController extends CrudController
{
    protected string $model = Partner::class;

    protected array $rules = [
        'name' => ['required', 'string', 'max:255'],
        'address_line' => ['nullable', 'string', 'max:1000'],
        'alternate_phone' => ['nullable', 'string', 'max:50'],
        'bank_account_holder' => ['nullable', 'string', 'max:255'],
        'bank_account_number' => ['nullable', 'string', 'max:50'],
        'bank_account_type' => ['nullable', 'string', 'max:50'],
        'bank_branch_name' => ['nullable', 'string', 'max:255'],
        'bank_ifsc' => ['nullable', 'string', 'max:20'],
        'bank_name' => ['nullable', 'string', 'max:255'],
        'business_name' => ['nullable', 'string', 'max:255'],
        'phone' => ['nullable', 'string', 'max:50'],
        'email' => ['nullable', 'email', 'max:255'],
        'password' => ['nullable', 'string', 'max:255'],
        'skill' => ['nullable', 'string', 'max:255'],
        'services' => ['nullable', 'array'],
        'service_ids' => ['nullable', 'array'],
        'service_ids.*' => ['integer', 'exists:services,id'],
        'sub_service_ids' => ['nullable', 'array'],
        'sub_service_ids.*' => ['integer', 'exists:sub_services,id'],
        'documents' => ['nullable', 'array'],
        'aadhaar_document' => ['nullable', 'string', 'max:500'],
        'pan_document' => ['nullable', 'string', 'max:500'],
        'area' => ['nullable', 'string', 'max:255'],
        'city' => ['nullable', 'string', 'max:255'],
        'pincode' => ['nullable', 'string', 'max:20'],
        'kyc_status' => ['nullable', 'string', 'max:50'],
        'kyc_submitted_at' => ['nullable', 'date'],
        'kyc_verified_at' => ['nullable', 'date'],
        'kyc_rejected_reason' => ['nullable', 'string'],
        'onboarding_step' => ['nullable', 'string', 'max:50'],
        'availability' => ['nullable', 'string', 'max:50'],
        'rating' => ['nullable', 'numeric'],
        'earnings' => ['nullable', 'numeric'],
        'commission_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
        'service_experience_years' => ['nullable', 'integer', 'min:0', 'max:60'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
    ];

    public function updateAvailability(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'availability' => ['required', 'string', Rule::in(['Available', 'Busy', 'Unavailable', 'On job'])],
        ]);

        $partner->update(['availability' => $data['availability']]);

        return response()->json([
            'message' => 'Partner availability updated successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function overview(Partner $partner)
    {
        $bookings = Booking::query()
            ->where(function ($query) use ($partner) {
                $query->where('partner_id', $partner->id)
                    ->orWhere('professional_name', $partner->name);
            })
            ->latest('id')
            ->get();
        $jobs = VendorJob::query()->where('partner_id', $partner->id)->latest('id')->get();
        $wallet = VendorWallet::query()->where('partner_id', $partner->id)->first();
        $ledgers = BookingLedger::query()
            ->where(function ($query) use ($partner) {
                $query->where('partner_name', $partner->name)
                    ->when($partner->business_name, fn ($innerQuery) => $innerQuery->orWhere('partner_name', $partner->business_name));
            })
            ->latest('id')
            ->get();
        $reviews = Review::query()
            ->where(function ($query) use ($partner) {
                $query->where('metadata->partner_id', $partner->id)
                    ->orWhere('partner_name', $partner->name)
                    ->when($partner->business_name, fn ($innerQuery) => $innerQuery->orWhere('partner_name', $partner->business_name));
            })
            ->where(function ($query) {
                $query->whereNull('metadata->direction')
                    ->orWhere('metadata->direction', 'customer_to_vendor');
            })
            ->latest('id')
            ->get();

        $totalBookings = $bookings->count();
        $completedStatuses = ['completed', 'complete'];
        $cancelledStatuses = ['cancelled', 'canceled', 'rejected', 'refunded'];
        $completedBookings = $bookings->filter(fn ($booking) => in_array(Str::lower((string) $booking->status), $completedStatuses, true))->count();
        $cancelledBookings = $bookings->filter(fn ($booking) => in_array(Str::lower((string) $booking->status), $cancelledStatuses, true))->count();
        $activeBookings = max(0, $totalBookings - $completedBookings - $cancelledBookings);
        $rating = round((float) ($reviews->avg('rating') ?: $partner->rating ?: 0), 2);
        $completionRate = $totalBookings > 0 ? round(($completedBookings / $totalBookings) * 100) : 0;
        $reviewCoverage = $totalBookings > 0 ? min(100, round(($reviews->count() / $totalBookings) * 100)) : 0;
        $trustScore = $totalBookings > 0
            ? (int) round((($rating / 5) * 40) + (($completionRate / 100) * 40) + (($reviewCoverage / 100) * 20))
            : 0;
        $totalEarnings = round((float) ($wallet?->online_earning ?? 0) + (float) ($wallet?->cash_collected ?? 0), 2);
        $platformCommission = round((float) ($wallet?->company_commission ?? $ledgers->sum('commission')), 2);
        $pendingSettlement = round((float) ($wallet?->company_due ?? $ledgers->whereNotIn('status', ['Paid'])->sum('company_due')), 2);

        return response()->json([
            'partner' => $partner,
            'stats' => [
                'active_bookings' => $activeBookings,
                'average_rating' => $rating,
                'cancelled_bookings' => $cancelledBookings,
                'completed_jobs' => $completedBookings,
                'completion_rate' => $completionRate,
                'customer_reviews' => $reviews->count(),
                'jobs' => $jobs->count(),
                'pending_settlement' => $pendingSettlement,
                'platform_commission' => $platformCommission,
                'review_coverage' => $reviewCoverage,
                'settlement_status' => $wallet?->settlement ?: 'Pending',
                'total_bookings' => $totalBookings,
                'total_earnings' => $totalEarnings,
                'trust_score' => max(0, min(100, $trustScore)),
            ],
            'bookings' => $bookings->take(100)->values(),
            'jobs' => $jobs->values(),
            'reviews' => $reviews->values(),
            'wallet' => $wallet,
            'ledgers' => $ledgers->values(),
        ]);
    }

    public function addBankAccount(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'account_holder' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'min:6', 'max:30', 'regex:/^[0-9]+$/'],
            'account_type' => ['required', 'string', Rule::in(['Savings', 'Current', 'Salary', 'Other'])],
            'bank_name' => ['required', 'string', 'max:255'],
            'branch_name' => ['nullable', 'string', 'max:255'],
            'ifsc' => ['required', 'string', 'max:20'],
            'make_active' => ['nullable', 'boolean'],
        ]);

        $metadata = $partner->metadata ?? [];
        $accounts = $this->partnerBankAccounts($partner);
        $makeActive = (bool) ($data['make_active'] ?? true) || count($accounts) === 0;

        $account = [
            'account_holder' => $data['account_holder'],
            'account_number' => $data['account_number'],
            'account_type' => $data['account_type'],
            'bank_name' => $data['bank_name'],
            'branch_name' => $data['branch_name'] ?? '',
            'created_at' => now()->toISOString(),
            'id' => 'bank_'.Str::random(16),
            'ifsc' => strtoupper($data['ifsc']),
            'is_active' => $makeActive,
            'updated_at' => now()->toISOString(),
        ];

        if ($makeActive) {
            $accounts = array_map(fn ($item) => [...$item, 'is_active' => false], $accounts);
        }

        $accounts[] = $account;
        $metadata['bank_accounts'] = array_values($accounts);

        $update = ['metadata' => $metadata];
        if ($makeActive) {
            $update = [
                ...$update,
                ...$this->bankAccountColumns($account),
            ];
        }

        $partner->update($update);

        return response()->json([
            'message' => 'Bank account added successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function activateBankAccount(Partner $partner, string $accountId)
    {
        $metadata = $partner->metadata ?? [];
        $accounts = $this->partnerBankAccounts($partner);
        $activeAccount = null;

        $accounts = array_map(function ($account) use ($accountId, &$activeAccount) {
            $isActive = ($account['id'] ?? '') === $accountId;
            $next = [...$account, 'is_active' => $isActive, 'updated_at' => now()->toISOString()];
            if ($isActive) {
                $activeAccount = $next;
            }
            return $next;
        }, $accounts);

        if (! $activeAccount) {
            return response()->json(['message' => 'Bank account not found.'], 404);
        }

        $metadata['bank_accounts'] = array_values($accounts);
        $partner->update([
            'metadata' => $metadata,
            ...$this->bankAccountColumns($activeAccount),
        ]);

        return response()->json([
            'message' => 'Active bank account updated successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function updateBankAccount(Request $request, Partner $partner, string $accountId)
    {
        $data = $request->validate([
            'account_holder' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'min:6', 'max:30', 'regex:/^[0-9]+$/'],
            'account_type' => ['required', 'string', Rule::in(['Savings', 'Current', 'Salary', 'Other'])],
            'bank_name' => ['required', 'string', 'max:255'],
            'branch_name' => ['nullable', 'string', 'max:255'],
            'ifsc' => ['required', 'string', 'max:20'],
            'make_active' => ['nullable', 'boolean'],
        ]);

        $metadata = $partner->metadata ?? [];
        $accounts = $this->partnerBankAccounts($partner);
        $updatedAccount = null;
        $makeActive = (bool) ($data['make_active'] ?? false);

        $accounts = array_map(function ($account) use ($accountId, $data, $makeActive, &$updatedAccount) {
            if (($account['id'] ?? '') !== $accountId) {
                return $makeActive ? [...$account, 'is_active' => false] : $account;
            }

            $updatedAccount = [
                ...$account,
                'account_holder' => $data['account_holder'],
                'account_number' => $data['account_number'],
                'account_type' => $data['account_type'],
                'bank_name' => $data['bank_name'],
                'branch_name' => $data['branch_name'] ?? '',
                'ifsc' => strtoupper($data['ifsc']),
                'is_active' => $makeActive || (bool) ($account['is_active'] ?? false),
                'updated_at' => now()->toISOString(),
            ];

            return $updatedAccount;
        }, $accounts);

        if (! $updatedAccount) {
            return response()->json(['message' => 'Bank account not found.'], 404);
        }

        $metadata['bank_accounts'] = array_values($accounts);
        $update = ['metadata' => $metadata];
        if ($updatedAccount['is_active']) {
            $update = [
                ...$update,
                ...$this->bankAccountColumns($updatedAccount),
            ];
        }

        $partner->update($update);

        return response()->json([
            'message' => 'Bank account updated successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    private function partnerBankAccounts(Partner $partner): array
    {
        $accounts = array_values($partner->metadata['bank_accounts'] ?? []);

        if (! $accounts && $partner->bank_account_number) {
            $accounts[] = [
                'account_holder' => $partner->bank_account_holder,
                'account_number' => $partner->bank_account_number,
                'account_type' => $partner->bank_account_type ?: 'Savings',
                'bank_name' => $partner->bank_name,
                'branch_name' => $partner->bank_branch_name,
                'created_at' => optional($partner->created_at)->toISOString(),
                'id' => 'bank_legacy_'.$partner->id,
                'ifsc' => $partner->bank_ifsc,
                'is_active' => true,
                'updated_at' => optional($partner->updated_at)->toISOString(),
            ];
        }

        return $accounts;
    }

    private function bankAccountColumns(array $account): array
    {
        return [
            'bank_account_holder' => $account['account_holder'] ?? null,
            'bank_account_number' => $account['account_number'] ?? null,
            'bank_account_type' => $account['account_type'] ?? null,
            'bank_branch_name' => $account['branch_name'] ?? null,
            'bank_ifsc' => $account['ifsc'] ?? null,
            'bank_name' => $account['bank_name'] ?? null,
        ];
    }

    public function updateStatus(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['Active', 'Inactive', 'Pending', 'Approved', 'Blocked'])],
        ]);

        $partner->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Partner status updated successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function updatePassword(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'admin_user_id' => ['required', 'integer', 'exists:admin_users,id'],
        ]);

        if (! $this->isSuperAdmin((int) $data['admin_user_id'])) {
            return response()->json(['message' => 'Only Super Admin can change partner passwords.'], 403);
        }

        $partner->update(['password' => $data['password']]);

        return response()->json([
            'message' => 'Partner password updated successfully.',
            'partner' => $partner->fresh(),
        ]);
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

    public function suspend(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $metadata = $partner->metadata ?? [];
        $metadata['suspension'] = [
            'reason' => $data['reason'] ?? 'Suspended by admin.',
            'suspended_at' => now()->toISOString(),
        ];

        $partner->update([
            'availability' => 'Unavailable',
            'metadata' => $metadata,
            'status' => 'Inactive',
        ]);

        return response()->json([
            'message' => 'Vendor suspended successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function impersonate(Partner $partner)
    {
        return response()->json([
            'message' => 'Vendor profile opened by admin.',
            'token' => 'admin-vendor-'.Str::random(40),
            'partner' => $partner,
        ]);
    }

    public function sendMessage(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'channel' => ['required', 'string', Rule::in(['email', 'push', 'both'])],
            'title' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $metadata = $partner->metadata ?? [];
        $messageRecord = [
            'channel' => $data['channel'],
            'message' => $data['message'],
            'sent_at' => now()->toISOString(),
            'title' => $data['title'],
        ];
        $metadata['vendor_messages'] = [
            $messageRecord,
            ...array_slice($metadata['vendor_messages'] ?? [], 0, 19),
        ];

        $emailSent = false;
        if (in_array($data['channel'], ['email', 'both'], true) && $partner->email) {
            Mail::raw($data['message'], function ($mail) use ($data, $partner) {
                $mail->to($partner->email)->subject($data['title']);
            });
            $emailSent = true;
        }

        $partner->update(['metadata' => $metadata]);

        return response()->json([
            'email_sent' => $emailSent,
            'message' => $emailSent ? 'Message sent to vendor.' : 'Message saved for vendor panel.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function publicProfile(Partner $partner)
    {
        $membership = $partner->metadata['membership'] ?? [];

        if (($membership['published'] ?? false) !== true) {
            return response()->json(['message' => 'Vendor membership is not published.'], 404);
        }

        return response()->json([
            'id' => $partner->id,
            'vendor_id' => 'VEN-'.str_pad((string) $partner->id, 5, '0', STR_PAD_LEFT),
            'name' => $partner->name,
            'business_name' => $partner->business_name,
            'phone' => $partner->phone,
            'email' => $partner->email,
            'skill' => $partner->skill,
            'services' => $partner->services,
            'area' => $partner->area,
            'city' => $partner->city,
            'pincode' => $partner->pincode,
            'rating' => $partner->rating,
            'status' => $partner->status,
            'kyc_status' => $partner->kyc_status,
            'membership' => $membership,
            'profile_picture' => $partner->metadata['profile_picture'] ?? null,
        ]);
    }

    public function updateMembership(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'certificate_no' => ['nullable', 'string', 'max:80'],
            'id_card_no' => ['nullable', 'string', 'max:80'],
            'member_since' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'tier' => ['nullable', 'string', 'max:80'],
            'designation' => ['nullable', 'string', 'max:120'],
            'authorized_services' => ['nullable', 'array'],
            'authorized_services.*' => ['string', 'max:120'],
            'public_note' => ['nullable', 'string', 'max:1000'],
            'published' => ['required', 'boolean'],
        ]);

        $metadata = $partner->metadata ?? [];
        $existing = $metadata['membership'] ?? [];
        $publishedAt = $data['published'] ? ($existing['published_at'] ?? now()->toISOString()) : null;

        $metadata['membership'] = array_merge($existing, $data, [
            'certificate_no' => $data['certificate_no'] ?: ($existing['certificate_no'] ?? 'RHC-CERT-'.str_pad((string) $partner->id, 5, '0', STR_PAD_LEFT)),
            'id_card_no' => $data['id_card_no'] ?: ($existing['id_card_no'] ?? 'RHC-ID-'.str_pad((string) $partner->id, 5, '0', STR_PAD_LEFT)),
            'authorized_services' => array_values($data['authorized_services'] ?? []),
            'published_at' => $publishedAt,
            'updated_at' => now()->toISOString(),
        ]);

        $partner->update(['metadata' => $metadata]);

        return response()->json([
            'message' => $data['published'] ? 'Membership published successfully.' : 'Membership saved as draft.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function uploadProfilePicture(Request $request, Partner $partner)
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

        $metadata = $partner->metadata ?? [];
        $metadata['profile_picture'] = 'profile-pictures/'.$filename;

        $partner->update(['metadata' => $metadata]);

        return response()->json([
            'message' => 'Partner profile picture updated successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function uploadDocument(Request $request, Partner $partner)
    {
        $data = $request->validate([
            'document' => ['required', 'file', 'max:5120'],
            'index' => ['nullable', 'integer', 'min:0'],
            'label' => ['required_without:index', 'nullable', 'string', 'max:255'],
        ]);

        $documents = $partner->documents ?? [];
        $file = $request->file('document');
        $filename = $file->hashName();
        $destination = public_path('documents');

        if (! is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $file->move($destination, $filename);
        $path = 'documents/'.$filename;
        $index = $data['index'] ?? null;
        $existing = is_int($index) && isset($documents[$index]) ? $documents[$index] : [];

        $document = array_merge($existing, [
            'label' => $data['label'] ?? $existing['label'] ?? 'Additional document',
            'path' => $path,
            'required' => (bool) ($existing['required'] ?? false),
            'status' => 'Submitted',
            'uploaded_at' => now()->toISOString(),
            'verified_at' => null,
        ]);

        if (is_int($index) && isset($documents[$index])) {
            $documents[$index] = $document;
        } else {
            $documents[] = $document;
        }

        $update = ['documents' => array_values($documents)];
        $label = strtolower(trim((string) ($document['label'] ?? '')));
        if (in_array($label, ['aadhaar', 'aadhar'], true)) {
            $update['aadhaar_document'] = $path;
        }
        if ($label === 'pan') {
            $update['pan_document'] = $path;
        }

        $partner->update($update);

        return response()->json([
            'message' => 'Partner document uploaded successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function verifyDocument(Partner $partner, int $index)
    {
        $documents = $partner->documents ?? [];

        if (! isset($documents[$index])) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $documents[$index] = array_merge($documents[$index], [
            'status' => 'Verified',
            'verified_at' => now()->toISOString(),
        ]);

        $partner->update(['documents' => array_values($documents)]);

        return response()->json([
            'message' => 'Partner document verified successfully.',
            'partner' => $partner->fresh(),
        ]);
    }

    public function rejectDocument(Request $request, Partner $partner, int $index)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $documents = $partner->documents ?? [];

        if (! isset($documents[$index])) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $documents[$index] = array_merge($documents[$index], [
            'status' => 'Rejected',
            'verified_at' => null,
            'rejected_at' => now()->toISOString(),
            'rejection_reason' => $data['reason'],
        ]);

        $partner->update(['documents' => array_values($documents)]);

        return response()->json([
            'message' => 'Partner document rejected successfully.',
            'partner' => $partner->fresh(),
        ]);
    }
}
