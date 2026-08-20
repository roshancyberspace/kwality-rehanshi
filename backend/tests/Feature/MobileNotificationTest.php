<?php

namespace Tests\Feature;

use App\Models\AdminNotification;
use App\Models\CustomerProfile;
use App\Models\Partner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendor_can_register_device_token_with_bearer_token_and_body_payload(): void
    {
        $partner = Partner::create([
            'name' => 'John Vendor',
            'phone' => '9876543210',
            'email' => 'vendor@example.com',
            'password' => 'secret123',
            'kyc_status' => 'Approved',
            'status' => 'Active',
            'bank_account_holder' => 'John',
            'bank_account_number' => '1234567890',
            'bank_account_type' => 'Savings',
            'bank_branch_name' => 'Main',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC',
            'area' => 'Aliganj',
            'city' => 'Lucknow',
            'pincode' => '226024',
            'address_line' => 'Sample Road',
        ]);

        $plainToken = $partner->createToken('partner_token')->plainTextToken;

        $payload = [
            'partner_id' => $partner->id,
            'token' => $plainToken,
            'platform' => 'android',
            'device_id' => 'AP3A.240905.015.A2',
            'device_name' => 'Xiaomi 2310FPCA4I',
            'fcm_token' => 'test-fcm-token-12345',
        ];

        $response = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->postJson('/api/v1/mobile/vendors/device-token', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Vendor device token saved.')
            ->assertJsonPath('partner.id', $partner->id);

        $freshPartner = $partner->fresh();
        $this->assertNotEmpty($freshPartner->metadata['devices'] ?? []);
        $this->assertEquals('test-fcm-token-12345', $freshPartner->metadata['devices'][0]['push_token']);
    }

    public function test_vendor_can_fetch_notifications(): void
    {
        $partner = Partner::create([
            'name' => 'John Vendor',
            'phone' => '9876543210',
            'email' => 'vendor@example.com',
            'password' => 'secret123',
            'kyc_status' => 'Approved',
            'status' => 'Active',
            'bank_account_holder' => 'John',
            'bank_account_number' => '1234567890',
            'bank_account_type' => 'Savings',
            'bank_branch_name' => 'Main',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC',
            'area' => 'Aliganj',
            'city' => 'Lucknow',
            'pincode' => '226024',
            'address_line' => 'Sample Road',
        ]);

        $plainToken = $partner->createToken('partner_token')->plainTextToken;

        AdminNotification::create([
            'channel' => 'In-App',
            'audience' => 'Partners',
            'title' => 'New Job Alert',
            'message' => 'You have a new assignment.',
            'status' => 'Sent',
        ]);

        AdminNotification::create([
            'channel' => 'In-App',
            'audience' => 'Partners',
            'title' => 'Direct Message',
            'message' => 'Only for partner 1',
            'status' => 'Sent',
            'metadata' => ['partner_id' => $partner->id],
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->getJson('/api/v1/mobile/vendors/notifications?partner_id=' . $partner->id . '&token=' . $plainToken);

        $response->assertStatus(200)
            ->assertJsonPath('unread_count', 2);
    }

    public function test_vendor_can_mark_notification_as_read(): void
    {
        $partner = Partner::create([
            'name' => 'John Vendor',
            'phone' => '9876543210',
            'email' => 'vendor@example.com',
            'password' => 'secret123',
            'kyc_status' => 'Approved',
            'status' => 'Active',
            'bank_account_holder' => 'John',
            'bank_account_number' => '1234567890',
            'bank_account_type' => 'Savings',
            'bank_branch_name' => 'Main',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC',
            'area' => 'Aliganj',
            'city' => 'Lucknow',
            'pincode' => '226024',
            'address_line' => 'Sample Road',
        ]);

        $plainToken = $partner->createToken('partner_token')->plainTextToken;

        $notification = AdminNotification::create([
            'channel' => 'In-App',
            'audience' => 'Partners',
            'title' => 'New Job Alert',
            'message' => 'You have a new assignment.',
            'status' => 'Sent',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->patchJson('/api/v1/mobile/vendors/notifications/' . $notification->id . '/read', [
                'partner_id' => $partner->id,
                'token' => $plainToken,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Notification marked as read.');

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_vendor_can_unregister_device(): void
    {
        $partner = Partner::create([
            'name' => 'John Vendor',
            'phone' => '9876543210',
            'email' => 'vendor@example.com',
            'password' => 'secret123',
            'kyc_status' => 'Approved',
            'status' => 'Active',
            'bank_account_holder' => 'John',
            'bank_account_number' => '1234567890',
            'bank_account_type' => 'Savings',
            'bank_branch_name' => 'Main',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC',
            'area' => 'Aliganj',
            'city' => 'Lucknow',
            'pincode' => '226024',
            'address_line' => 'Sample Road',
            'metadata' => [
                'devices' => [
                    [
                        'device_id' => 'device-1',
                        'push_token' => 'fcm-token-1',
                        'platform' => 'android',
                    ],
                ],
            ],
        ]);

        $plainToken = $partner->createToken('partner_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->deleteJson('/api/v1/mobile/vendors/device-token', [
                'partner_id' => $partner->id,
                'token' => $plainToken,
                'fcm_token' => 'fcm-token-1',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Vendor device token removed.');

        $this->assertEmpty($partner->fresh()->metadata['devices'] ?? []);
    }

    public function test_invalid_vendor_token_returns_401(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid-token')
            ->postJson('/api/v1/mobile/vendors/device-token', [
                'partner_id' => 999,
                'token' => 'invalid-token',
                'platform' => 'android',
                'fcm_token' => 'token-123',
            ]);

        $response->assertStatus(401);
    }

    public function test_customer_device_and_notifications_flow(): void
    {
        $customer = CustomerProfile::create([
            'name' => 'Jane Customer',
            'phone' => '9876543211',
            'email' => 'customer@example.com',
            'password' => 'secret123',
            'status' => 'Active',
        ]);

        $plainToken = $customer->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->postJson('/api/v1/mobile/customers/device-token', [
                'customer_id' => $customer->id,
                'token' => $plainToken,
                'platform' => 'ios',
                'apns_token' => 'apns-test-token',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Customer device token saved.');

        AdminNotification::create([
            'channel' => 'In-App',
            'audience' => 'Customers',
            'title' => 'Offer',
            'message' => '50% off today',
            'status' => 'Sent',
        ]);

        $notifResponse = $this->withHeader('Authorization', 'Bearer ' . $plainToken)
            ->getJson('/api/v1/mobile/customers/notifications?customer_id=' . $customer->id . '&token=' . $plainToken);

        $notifResponse->assertStatus(200)
            ->assertJsonPath('unread_count', 1);
    }
}
