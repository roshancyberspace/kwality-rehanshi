<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->nullable()->unique();
            $table->text('image')->nullable();
            $table->string('badge')->nullable();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug')->nullable()->unique();
            $table->text('image')->nullable();
            $table->string('duration')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->text('description')->nullable();
            $table->json('includes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('service_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category_key')->nullable();
            $table->string('name');
            $table->text('image')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('original_price', 10, 2)->nullable();
            $table->string('duration')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->string('jobs')->nullable();
            $table->string('badge')->nullable();
            $table->string('offer')->nullable();
            $table->string('option_count')->nullable();
            $table->text('description')->nullable();
            $table->json('highlights')->nullable();
            $table->json('included')->nullable();
            $table->json('not_included')->nullable();
            $table->json('process')->nullable();
            $table->text('warranty')->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('skill')->nullable();
            $table->string('area')->nullable();
            $table->string('kyc_status')->default('Pending');
            $table->string('availability')->default('Available');
            $table->decimal('rating', 3, 2)->nullable();
            $table->decimal('earnings', 12, 2)->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('customer_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->integer('bookings_count')->default(0);
            $table->timestamp('last_booking_at')->nullable();
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_no')->nullable()->unique();
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->string('service_name');
            $table->timestamp('scheduled_at')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->string('professional_name')->nullable();
            $table->string('status')->default('Pending');
            $table->string('payment_status')->default('Pending');
            $table->string('payment_method')->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->decimal('tip_amount', 10, 2)->default(0);
            $table->string('priority')->default('Normal');
            $table->json('timeline')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

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

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_no')->nullable()->unique();
            $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name');
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('method')->nullable();
            $table->string('status')->default('Pending');
            $table->string('refund_status')->default('None');
            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->string('partner_name');
            $table->integer('jobs')->default(0);
            $table->decimal('earnings', 12, 2)->default(0);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('pending', 12, 2)->default(0);
            $table->decimal('paid', 12, 2)->default(0);
            $table->string('status')->default('Pending');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type');
            $table->string('value');
            $table->decimal('minimum_order', 10, 2)->nullable();
            $table->date('expires_at')->nullable();
            $table->integer('usage_limit')->nullable();
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('partner_name')->nullable();
            $table->string('service_name')->nullable();
            $table->decimal('rating', 3, 2);
            $table->text('text')->nullable();
            $table->date('reviewed_at')->nullable();
            $table->string('status')->default('Published');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no')->nullable()->unique();
            $table->string('name');
            $table->string('type')->nullable();
            $table->string('subject');
            $table->string('priority')->default('Medium');
            $table->string('status')->default('Open');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('service_locations', function (Blueprint $table) {
            $table->id();
            $table->string('city');
            $table->string('area');
            $table->string('pincode')->nullable();
            $table->string('availability')->default('Available');
            $table->integer('professionals_count')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('app_contents', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->text('body')->nullable();
            $table->text('image')->nullable();
            $table->string('button_text')->nullable();
            $table->text('button_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('channel');
            $table->string('audience');
            $table->string('title');
            $table->text('message');
            $table->string('status')->default('Draft');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->json('permissions')->nullable();
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group');
            $table->string('key');
            $table->text('value')->nullable();
            $table->string('type')->default('text');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->unique(['group', 'key']);
        });

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

    public function down(): void
    {
        foreach (['admin_users','settings','roles','admin_notifications','app_contents','service_locations','support_tickets','reviews','coupons','payouts','payments','booking_ledgers','vendor_wallets','vendor_jobs','saved_addresses','bookings','customer_profiles','partners','service_packages','services','categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
