<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\CustomerProfile;
use App\Models\LoginLog;
use App\Models\Partner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_records_login_log(): void
    {
        $admin = AdminUser::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.com',
            'password' => 'password123',
            'status' => 'Active',
            'role_name' => 'Super Admin',
        ]);

        $response = $this->postJson('/api/v1/admin-users/login', [
            'email' => 'admin@example.com',
            'password' => 'password123',
            'device_name' => 'Admin Desktop',
            'platform' => 'web',
            'latitude' => 26.8467,
            'longitude' => 80.9462,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('login_logs', [
            'user_type' => 'Admin',
            'user_id' => $admin->id,
            'email' => 'admin@example.com',
            'device_name' => 'Admin Desktop',
        ]);
    }

    public function test_partner_login_records_login_log(): void
    {
        $partner = Partner::create([
            'name' => 'Vendor Partner',
            'phone' => '9988776655',
            'email' => 'partner@example.com',
            'password' => 'secret123',
            'kyc_status' => 'Approved',
            'status' => 'Active',
            'bank_account_holder' => 'Partner',
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

        $response = $this->postJson('/api/v1/partners/login', [
            'login' => '9988776655',
            'password' => 'secret123',
            'device_name' => 'Xiaomi Redmi Note 13',
            'platform' => 'android',
            'fcm_token' => 'fcm-partner-token-abc',
            'latitude' => 26.8500,
            'longitude' => 80.9500,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('login_logs', [
            'user_type' => 'Partner',
            'user_id' => $partner->id,
            'phone' => '9988776655',
            'fcm_token' => 'fcm-partner-token-abc',
        ]);
    }

    public function test_customer_login_records_login_log(): void
    {
        $customer = CustomerProfile::create([
            'name' => 'Customer User',
            'phone' => '9876501234',
            'email' => 'cust@example.com',
            'password' => Hash::make('password123'),
            'status' => 'Active',
        ]);

        $response = $this->postJson('/api/v1/customers/login', [
            'login' => '9876501234',
            'password' => 'password123',
            'device_name' => 'iPhone 15',
            'platform' => 'ios',
            'apns_token' => 'apns-cust-token-xyz',
            'latitude' => 26.8600,
            'longitude' => 80.9600,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('login_logs', [
            'user_type' => 'Customer',
            'user_id' => $customer->id,
            'phone' => '9876501234',
            'apns_token' => 'apns-cust-token-xyz',
        ]);
    }

    public function test_admin_can_list_filter_block_and_unblock_login_user(): void
    {
        $partner = Partner::create([
            'name' => 'Vendor Partner',
            'phone' => '9988776655',
            'email' => 'partner@example.com',
            'password' => 'secret123',
            'kyc_status' => 'Approved',
            'status' => 'Active',
            'bank_account_holder' => 'Partner',
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

        $token = $partner->createToken('partner_token')->plainTextToken;

        $log = LoginLog::create([
            'user_type' => 'Partner',
            'user_id' => $partner->id,
            'user_name' => $partner->name,
            'email' => $partner->email,
            'phone' => $partner->phone,
            'role' => 'Partner / Vendor',
            'ip_address' => '127.0.0.1',
            'platform' => 'android',
            'fcm_token' => 'sample-token',
            'latitude' => 26.8500,
            'longitude' => 80.9500,
            'status' => 'Success',
            'is_blocked' => false,
        ]);

        // 1. List logs
        $listResponse = $this->getJson('/api/v1/login-logs?user_type=Partner');
        $listResponse->assertStatus(200)
            ->assertJsonPath('data.0.id', $log->id);

        // 2. Block user
        $blockResponse = $this->postJson("/api/v1/login-logs/{$log->id}/block");
        $blockResponse->assertStatus(200)
            ->assertJsonPath('login_log.is_blocked', true);

        $this->assertEquals('Blocked', $partner->fresh()->status);
        $this->assertCount(0, $partner->fresh()->tokens);

        // 3. Unblock user
        $unblockResponse = $this->postJson("/api/v1/login-logs/{$log->id}/unblock");
        $unblockResponse->assertStatus(200)
            ->assertJsonPath('login_log.is_blocked', false);

        $this->assertEquals('Active', $partner->fresh()->status);
    }
}
