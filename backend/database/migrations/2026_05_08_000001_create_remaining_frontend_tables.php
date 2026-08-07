<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('saved_addresses')) {
            Schema::create('saved_addresses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_profile_id')->nullable()->constrained()->nullOnDelete();
                $table->string('label');
                $table->string('contact_name');
                $table->string('mobile')->nullable();
                $table->string('flat')->nullable();
                $table->text('street')->nullable();
                $table->string('city');
                $table->string('state')->nullable();
                $table->string('pincode', 20)->nullable();
                $table->string('status')->default('Active');
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('vendor_jobs')) {
            Schema::create('vendor_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('job_no')->nullable()->unique();
                $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
                $table->string('customer_name');
                $table->string('service_name');
                $table->text('address')->nullable();
                $table->string('slot')->nullable();
                $table->decimal('amount', 10, 2)->default(0);
                $table->string('status')->default('New request');
                $table->string('next_action')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('vendor_wallets')) {
            Schema::create('vendor_wallets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
                $table->string('partner_name');
                $table->decimal('online_earning', 12, 2)->default(0);
                $table->decimal('cash_collected', 12, 2)->default(0);
                $table->decimal('company_commission', 12, 2)->default(0);
                $table->decimal('vendor_payable', 12, 2)->default(0);
                $table->decimal('company_due', 12, 2)->default(0);
                $table->string('settlement')->default('Pending');
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('booking_ledgers')) {
            Schema::create('booking_ledgers', function (Blueprint $table) {
                $table->id();
                $table->string('ledger_no')->nullable()->unique();
                $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
                $table->string('booking_no')->nullable();
                $table->string('partner_name')->nullable();
                $table->string('method')->nullable();
                $table->decimal('gross', 12, 2)->default(0);
                $table->decimal('commission', 12, 2)->default(0);
                $table->decimal('vendor_amount', 12, 2)->default(0);
                $table->decimal('company_due', 12, 2)->default(0);
                $table->string('status')->default('Unsettled');
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('admin_users')) {
            Schema::create('admin_users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->foreignId('role_id')->nullable()->constrained()->nullOnDelete();
                $table->string('role_name')->nullable();
                $table->json('permissions')->nullable();
                $table->string('status')->default('Active');
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        foreach (['admin_users', 'booking_ledgers', 'vendor_wallets', 'vendor_jobs', 'saved_addresses'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
