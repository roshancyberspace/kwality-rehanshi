<?php

namespace App\Support;

use App\Models\AdminNotification;
use App\Models\Booking;
use App\Models\Coupon;
use App\Models\CustomerProfile;
use App\Models\NotificationDelivery;
use App\Models\Partner;
use App\Models\Payout;
use App\Models\ServicePackage;
use App\Models\VendorJob;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Throwable;

class PushNotificationService
{
    public function __construct(
        private FcmV1Client $fcmClient
    ) {
    }

    /**
     * Send push notification directly to a customer and persist it.
     */
    public function notifyCustomer(
        CustomerProfile|int|string $customer,
        string $title,
        string $message,
        array $data = [],
        ?string $imageUrl = null
    ): ?AdminNotification {
        $customerModel = $this->resolveCustomer($customer);
        if (! $customerModel) {
            return null;
        }

        $deepLinkData = $this->formatDeepLinkData($data, [
            'recipient_type' => 'customer',
            'customer_id' => (string) $customerModel->id,
        ]);

        $notification = AdminNotification::create([
            'channel' => 'Push',
            'audience' => 'Customers',
            'title' => $title,
            'message' => $message,
            'image' => $imageUrl,
            'status' => 'Sent',
            'sent_at' => now(),
            'metadata' => [
                'customer_id' => $customerModel->id,
                'customer_name' => $customerModel->name,
                'customer_phone' => $customerModel->phone,
                'customer_email' => $customerModel->email,
                'screen' => $deepLinkData['screen'] ?? 'Home',
                'action_type' => $deepLinkData['action_type'] ?? 'general',
                ...$deepLinkData,
            ],
        ]);

        $deliveryResult = $this->dispatchDevicePush($customerModel, $title, $message, $deepLinkData, $imageUrl);

        NotificationDelivery::create([
            'admin_notification_id' => $notification->id,
            'recipient_type' => 'customer',
            'recipient_id' => $customerModel->id,
            'recipient_name' => $customerModel->name ?: 'Customer #'.$customerModel->id,
            'channel' => 'Push',
            'contact' => $deliveryResult['contact'] ?: ($customerModel->phone ?: $customerModel->email),
            'status' => $deliveryResult['status'],
            'error' => $deliveryResult['error'],
            'sent_at' => $deliveryResult['status'] === 'sent' ? now() : null,
        ]);

        $report = [
            'targeted' => 1,
            'sent' => $deliveryResult['status'] === 'sent' ? 1 : 0,
            'failed' => $deliveryResult['status'] === 'failed' ? 1 : 0,
            'skipped' => $deliveryResult['status'] === 'skipped' ? 1 : 0,
            'pending' => 0,
        ];

        $metadata = is_array($notification->metadata) ? $notification->metadata : [];
        $metadata['delivery_report'] = $report;
        $notification->update([
            'status' => $deliveryResult['status'] === 'sent' ? 'Sent' : ($deliveryResult['status'] === 'failed' ? 'Failed' : 'Skipped'),
            'metadata' => $metadata,
        ]);

        return $notification;
    }

    /**
     * Send push notification directly to a partner / vendor and persist it.
     */
    public function notifyPartner(
        Partner|int|string $partner,
        string $title,
        string $message,
        array $data = [],
        ?string $imageUrl = null
    ): ?AdminNotification {
        $partnerModel = $this->resolvePartner($partner);
        if (! $partnerModel) {
            return null;
        }

        $deepLinkData = $this->formatDeepLinkData($data, [
            'recipient_type' => 'partner',
            'partner_id' => (string) $partnerModel->id,
        ]);

        $notification = AdminNotification::create([
            'channel' => 'Push',
            'audience' => 'Partners',
            'title' => $title,
            'message' => $message,
            'image' => $imageUrl,
            'status' => 'Sent',
            'sent_at' => now(),
            'metadata' => [
                'partner_id' => $partnerModel->id,
                'partner_name' => $partnerModel->name,
                'partner_phone' => $partnerModel->phone,
                'partner_email' => $partnerModel->email,
                'screen' => $deepLinkData['screen'] ?? 'VendorDashboard',
                'action_type' => $deepLinkData['action_type'] ?? 'general',
                ...$deepLinkData,
            ],
        ]);

        $deliveryResult = $this->dispatchDevicePush($partnerModel, $title, $message, $deepLinkData, $imageUrl);

        NotificationDelivery::create([
            'admin_notification_id' => $notification->id,
            'recipient_type' => 'partner',
            'recipient_id' => $partnerModel->id,
            'recipient_name' => $partnerModel->name ?: 'Partner #'.$partnerModel->id,
            'channel' => 'Push',
            'contact' => $deliveryResult['contact'] ?: ($partnerModel->phone ?: $partnerModel->email),
            'status' => $deliveryResult['status'],
            'error' => $deliveryResult['error'],
            'sent_at' => $deliveryResult['status'] === 'sent' ? now() : null,
        ]);

        $report = [
            'targeted' => 1,
            'sent' => $deliveryResult['status'] === 'sent' ? 1 : 0,
            'failed' => $deliveryResult['status'] === 'failed' ? 1 : 0,
            'skipped' => $deliveryResult['status'] === 'skipped' ? 1 : 0,
            'pending' => 0,
        ];

        $metadata = is_array($notification->metadata) ? $notification->metadata : [];
        $metadata['delivery_report'] = $report;
        $notification->update([
            'status' => $deliveryResult['status'] === 'sent' ? 'Sent' : ($deliveryResult['status'] === 'failed' ? 'Failed' : 'Skipped'),
            'metadata' => $metadata,
        ]);

        return $notification;
    }

    /**
     * Broadcast a push notification to all active customers.
     */
    public function broadcastCustomers(
        string $title,
        string $message,
        array $data = [],
        ?string $imageUrl = null
    ): AdminNotification {
        $deepLinkData = $this->formatDeepLinkData($data, [
            'recipient_type' => 'broadcast_customer',
        ]);

        $notification = AdminNotification::create([
            'channel' => 'Push',
            'audience' => 'All Customers',
            'title' => $title,
            'message' => $message,
            'image' => $imageUrl,
            'status' => 'Sent',
            'sent_at' => now(),
            'metadata' => [
                'screen' => $deepLinkData['screen'] ?? 'Home',
                'action_type' => $deepLinkData['action_type'] ?? 'broadcast',
                ...$deepLinkData,
            ],
        ]);

        $targeted = 0;
        $sent = 0;
        $failed = 0;
        $skipped = 0;

        try {
            CustomerProfile::query()
                ->where('status', '!=', 'Blocked')
                ->chunk(100, function ($customers) use ($notification, $title, $message, $deepLinkData, $imageUrl, &$targeted, &$sent, &$failed, &$skipped) {
                    foreach ($customers as $customer) {
                        $targeted++;
                        $res = $this->dispatchDevicePush($customer, $title, $message, $deepLinkData, $imageUrl);
                        NotificationDelivery::create([
                            'admin_notification_id' => $notification->id,
                            'recipient_type' => 'customer',
                            'recipient_id' => $customer->id,
                            'recipient_name' => $customer->name ?: 'Customer #'.$customer->id,
                            'channel' => 'Push',
                            'contact' => $res['contact'] ?: ($customer->phone ?: $customer->email),
                            'status' => $res['status'],
                            'error' => $res['error'],
                            'sent_at' => $res['status'] === 'sent' ? now() : null,
                        ]);

                        if ($res['status'] === 'sent') {
                            $sent++;
                        } elseif ($res['status'] === 'failed') {
                            $failed++;
                        } else {
                            $skipped++;
                        }
                    }
                });
        } catch (Throwable $e) {
            Log::warning('Customer broadcast push failed', ['error' => $e->getMessage()]);
        }

        $report = [
            'targeted' => $targeted,
            'sent' => $sent,
            'failed' => $failed,
            'skipped' => $skipped,
            'pending' => 0,
        ];

        $metadata = is_array($notification->metadata) ? $notification->metadata : [];
        $metadata['delivery_report'] = $report;
        $notification->update([
            'status' => $sent > 0 ? 'Sent' : ($failed > 0 ? 'Failed' : ($targeted > 0 ? 'Skipped' : 'Sent')),
            'metadata' => $metadata,
        ]);

        return $notification;
    }

    // ==========================================
    // 1. CUSTOMER LIFECYCLE EVENTS
    // ==========================================

    /**
     * 1.1 Booking Confirmed / Placed
     */
    public function sendBookingConfirmed(Booking $booking): ?AdminNotification
    {
        $customer = $this->customerFromBooking($booking);
        if (! $customer) {
            return null;
        }

        $serviceOtp = data_get($booking->metadata, 'service_otp', '');
        $otpText = $serviceOtp ? " Share OTP {$serviceOtp} with technician upon arrival." : '';

        $title = "Booking Confirmed".$this->bookingSuffix($booking);
        $body = "Your booking for {$booking->service_name} has been confirmed.{$otpText}";

        return $this->notifyCustomer($customer, $title, $body, [
            'screen' => 'BookingDetail',
            'action_type' => 'booking_confirmed',
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'status' => (string) $booking->status,
            'service_otp' => (string) $serviceOtp,
            'scheduled_at' => optional($booking->scheduled_at)->toISOString(),
        ]);
    }

    /**
     * 1.2 Work Started (Technician started service work)
     */
    public function sendWorkStarted(Booking $booking): ?AdminNotification
    {
        $customer = $this->customerFromBooking($booking);
        if (! $customer) {
            return null;
        }

        $partnerName = $booking->professional_name ?: 'Our service technician';
        $title = "Service In Progress".$this->bookingSuffix($booking);
        $body = "{$partnerName} has started working on your {$booking->service_name} service.";

        return $this->notifyCustomer($customer, $title, $body, [
            'screen' => 'BookingDetail',
            'action_type' => 'work_started',
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'status' => 'Started',
        ]);
    }

    /**
     * 1.3 Extra Items Added by Vendor (Requires Customer Review & Approval)
     */
    public function sendExtraItemsAdded(Booking $booking, array $extraItems = []): ?AdminNotification
    {
        $customer = $this->customerFromBooking($booking);
        if (! $customer) {
            return null;
        }

        $itemCount = count($extraItems);
        $countText = $itemCount > 0 ? " ({$itemCount} item".($itemCount > 1 ? 's' : '').')' : '';

        $title = "Extra Items Added for Approval".$this->bookingSuffix($booking);
        $body = "The technician has added extra parts/services{$countText} for {$booking->service_name}. Please review and approve in the app.";

        return $this->notifyCustomer($customer, $title, $body, [
            'screen' => 'BookingDetail',
            'tab' => 'extra_items',
            'action_type' => 'extra_items_added',
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'items_count' => (string) $itemCount,
        ]);
    }

    /**
     * 1.4 Booking Completed
     */
    public function sendBookingCompleted(Booking $booking): ?AdminNotification
    {
        $customer = $this->customerFromBooking($booking);
        if (! $customer) {
            return null;
        }

        $title = "Service Completed".$this->bookingSuffix($booking);
        $body = "Your {$booking->service_name} service is completed! Please rate your service experience.";

        return $this->notifyCustomer($customer, $title, $body, [
            'screen' => 'BookingDetail',
            'action_type' => 'booking_completed',
            'action' => 'rate_service',
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'amount' => (string) ($booking->amount ?? ''),
        ]);
    }

    /**
     * 1.5 Booking Cancelled
     */
    public function sendBookingCancelled(Booking $booking, ?string $reason = null): ?AdminNotification
    {
        $customer = $this->customerFromBooking($booking);
        if (! $customer) {
            return null;
        }

        $reasonText = $reason ? " Reason: {$reason}" : '';
        $title = "Booking Cancelled".$this->bookingSuffix($booking);
        $body = "Your booking for {$booking->service_name} has been cancelled.{$reasonText}";

        return $this->notifyCustomer($customer, $title, $body, [
            'screen' => 'BookingDetail',
            'action_type' => 'booking_cancelled',
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'reason' => (string) $reason,
        ]);
    }

    /**
     * 1.6 New Coupon Added
     */
    public function sendNewCoupon(Coupon $coupon): AdminNotification
    {
        $title = "🎉 New Offer: Use Code {$coupon->code}!";
        $body = "Enjoy {$coupon->value} off on your next booking! Apply code {$coupon->code} at checkout.";

        $imageUrl = data_get($coupon->metadata, 'image');

        return $this->broadcastCustomers($title, $body, [
            'screen' => 'Offers',
            'action_type' => 'new_coupon',
            'coupon_id' => (string) $coupon->id,
            'coupon_code' => (string) $coupon->code,
            'discount_value' => (string) $coupon->value,
            'discount_type' => (string) $coupon->type,
            'minimum_order' => (string) ($coupon->minimum_order ?? ''),
        ], $imageUrl);
    }

    /**
     * 1.7 New Service Package Added
     */
    public function sendNewServicePackage(ServicePackage $package): AdminNotification
    {
        $title = "✨ New Service Available: {$package->name}!";
        $priceText = $package->price ? " starting at Rs. {$package->price}" : '';
        $body = "Discover '{$package->name}'{$priceText}. Professional doorstep service with quality assurance.";

        $imageUrl = $package->image ?: null;

        return $this->broadcastCustomers($title, $body, [
            'screen' => 'PackageDetail',
            'action_type' => 'new_package',
            'package_id' => (string) $package->id,
            'service_id' => (string) ($package->service_id ?? ''),
            'package_name' => (string) $package->name,
            'price' => (string) ($package->price ?? ''),
            'category_key' => (string) ($package->category_key ?? ''),
        ], $imageUrl);
    }

    // ==========================================
    // 2. VENDOR / PARTNER LIFECYCLE EVENTS
    // ==========================================

    /**
     * 2.1 Booking Assigned to Vendor
     */
    public function sendBookingAssigned(Partner $partner, Booking $booking, ?VendorJob $job = null): ?AdminNotification
    {
        $slotText = optional($booking->scheduled_at)->format('d M, h:i A') ?: 'Scheduled Slot';
        $title = "New Job Assigned".$this->bookingSuffix($booking);
        $body = "New job: {$booking->service_name} scheduled for {$slotText}. Tap to review details & accept.";

        return $this->notifyPartner($partner, $title, $body, [
            'screen' => 'VendorJobDetail',
            'action_type' => 'job_assigned',
            'job_id' => (string) ($job?->id ?? ''),
            'job_no' => (string) ($job?->job_no ?? $booking->booking_no),
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'customer_name' => (string) $booking->customer_name,
            'address' => (string) $booking->address,
            'amount' => (string) ($booking->amount ?? ''),
            'slot' => (string) ($booking->scheduled_at ?? ''),
        ]);
    }

    /**
     * 2.2 Work Started (Vendor Confirmed)
     */
    public function sendVendorWorkStarted(Partner $partner, Booking $booking, ?VendorJob $job = null): ?AdminNotification
    {
        $title = "Job Started".$this->bookingSuffix($booking);
        $body = "Service work is in progress for {$booking->service_name}. Complete all checklist items and upload after photos.";

        return $this->notifyPartner($partner, $title, $body, [
            'screen' => 'VendorJobDetail',
            'action_type' => 'work_started',
            'job_id' => (string) ($job?->id ?? ''),
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
        ]);
    }

    /**
     * 2.3 Booking Completed (Vendor Wallet Credited)
     */
    public function sendVendorBookingCompleted(Partner $partner, Booking $booking, ?VendorJob $job = null): ?AdminNotification
    {
        $title = "Job Completed Successfully".$this->bookingSuffix($booking);
        $body = "Great job! {$booking->service_name} completed. Earnings have been credited to your vendor wallet.";

        return $this->notifyPartner($partner, $title, $body, [
            'screen' => 'VendorJobDetail',
            'action_type' => 'job_completed',
            'job_id' => (string) ($job?->id ?? ''),
            'booking_id' => (string) $booking->id,
            'booking_no' => (string) $booking->booking_no,
            'service_name' => (string) $booking->service_name,
            'amount' => (string) ($booking->amount ?? ''),
        ]);
    }

    /**
     * 2.4 KYC Verified / Approved
     */
    public function sendKycApproved(Partner $partner): ?AdminNotification
    {
        $title = "🎉 KYC Approved - Account Active!";
        $body = "Congratulations! Your partner account is verified. You can now receive and accept customer bookings.";

        return $this->notifyPartner($partner, $title, $body, [
            'screen' => 'VendorProfile',
            'tab' => 'kyc',
            'action_type' => 'kyc_approved',
            'partner_id' => (string) $partner->id,
            'status' => 'Active',
            'kyc_status' => 'Approved',
        ]);
    }

    /**
     * 2.5 Payout Cleared / Paid
     */
    public function sendPayoutCleared(Partner $partner, Payout $payout): ?AdminNotification
    {
        $amount = (float) ($payout->paid ?: $payout->pending ?: $payout->earnings ?: 0);
        $amountFormatted = number_format($amount, 2);

        $title = "💰 Payout Cleared: Rs. {$amountFormatted}";
        $body = "Your payout request of Rs. {$amountFormatted} has been approved and processed to your registered bank account.";

        return $this->notifyPartner($partner, $title, $body, [
            'screen' => 'VendorWallet',
            'action_type' => 'payout_cleared',
            'payout_id' => (string) $payout->id,
            'amount' => (string) $amount,
            'status' => 'Paid',
        ]);
    }

    // ==========================================
    // HELPER & DISPATCH METHODS
    // ==========================================

    private function bookingSuffix(mixed $booking): string
    {
        $no = $booking instanceof Booking
            ? ($booking->booking_no ?: ($booking->id ? "#{$booking->id}" : ''))
            : (string) $booking;

        $no = trim((string) $no);
        if ($no === '') {
            return '';
        }

        return str_starts_with($no, '#') ? " {$no}" : " #{$no}";
    }

    private function dispatchDevicePush(
        Model $model,
        string $title,
        string $body,
        array $data = [],
        ?string $imageUrl = null
    ): array {
        $tokens = $this->collectDeviceTokens($model);
        if (empty($tokens)) {
            return [
                'status' => 'skipped',
                'contact' => $model->phone ?: $model->email ?: null,
                'error' => 'No active push device token registered for this user',
            ];
        }

        if (! $this->fcmClient->isConfigured()) {
            return [
                'status' => 'failed',
                'contact' => $tokens[0] ?? ($model->phone ?: $model->email),
                'error' => 'Firebase push gateway is not configured (missing FCM credentials)',
            ];
        }

        $sentCount = 0;
        $lastError = null;
        $usedContact = null;

        foreach ($tokens as $token) {
            $usedContact = $token;
            try {
                $this->fcmClient->send($token, $title, $body, $imageUrl, $data);
                $sentCount++;
            } catch (Throwable $e) {
                $lastError = mb_substr($e->getMessage(), 0, 500);
                Log::warning('Device push delivery failed', [
                    'model' => class_basename($model),
                    'id' => $model->getKey(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($sentCount > 0) {
            return [
                'status' => 'sent',
                'contact' => $usedContact ?: ($model->phone ?: $model->email),
                'error' => null,
            ];
        }

        return [
            'status' => 'failed',
            'contact' => $usedContact ?: ($model->phone ?: $model->email),
            'error' => $lastError ?: 'FCM delivery failed',
        ];
    }

    private function collectDeviceTokens(Model $model): array
    {
        $metadata = $model->metadata ?? [];
        $devices = $metadata['devices'] ?? [];
        if (empty($devices) && ! empty($metadata['last_device'])) {
            $devices = [$metadata['last_device']];
        }

        $tokens = collect($devices)
            ->map(fn ($device) => is_array($device)
                ? ($device['fcm_token'] ?? $device['push_token'] ?? $device['device_token'] ?? $device['apns_token'] ?? null)
                : (is_string($device) ? $device : null)
            )
            ->filter()
            ->values()
            ->all();

        if (empty($tokens) && ! empty($metadata['push_token'])) {
            $tokens[] = $metadata['push_token'];
        }
        if (empty($tokens) && ! empty($metadata['fcm_token'])) {
            $tokens[] = $metadata['fcm_token'];
        }

        return array_values(array_unique(array_filter($tokens)));
    }

    private function formatDeepLinkData(array $customData, array $defaults = []): array
    {
        $data = array_merge([
            'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            'priority' => 'high',
            'timestamp' => (string) now()->timestamp,
        ], $defaults, $customData);

        // Ensure all values are strings for FCM data payload compliance
        $clean = [];
        foreach ($data as $k => $v) {
            if ($v !== null) {
                $clean[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v);
            }
        }

        return $clean;
    }

    private function resolveCustomer(CustomerProfile|int|string $customer): ?CustomerProfile
    {
        if ($customer instanceof CustomerProfile) {
            return $customer;
        }

        if (is_numeric($customer)) {
            return CustomerProfile::find((int) $customer);
        }

        return CustomerProfile::where('phone', (string) $customer)
            ->orWhere('email', (string) $customer)
            ->first();
    }

    private function resolvePartner(Partner|int|string $partner): ?Partner
    {
        if ($partner instanceof Partner) {
            return $partner;
        }

        if (is_numeric($partner)) {
            return Partner::find((int) $partner);
        }

        return Partner::where('phone', (string) $partner)
            ->orWhere('name', (string) $partner)
            ->first();
    }

    private function customerFromBooking(Booking $booking): ?CustomerProfile
    {
        $customerId = data_get($booking->metadata, 'customer_id');
        if ($customerId) {
            $cust = CustomerProfile::find($customerId);
            if ($cust) {
                return $cust;
            }
        }

        if ($booking->customer_phone) {
            $cleanPhone = preg_replace('/\D+/', '', $booking->customer_phone);
            $last10 = strlen($cleanPhone) >= 10 ? substr($cleanPhone, -10) : $cleanPhone;
            $cust = CustomerProfile::query()
                ->where('phone', $booking->customer_phone)
                ->orWhere('phone', 'like', "%{$last10}")
                ->first();
            if ($cust) {
                return $cust;
            }
        }

        if ($booking->customer_name) {
            return CustomerProfile::where('name', $booking->customer_name)->first();
        }

        return null;
    }
}
