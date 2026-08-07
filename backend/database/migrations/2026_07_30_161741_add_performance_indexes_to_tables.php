<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->index('status');
            $table->index('payment_status');
            $table->index('booking_no');
            $table->index('partner_id');
        });

        Schema::table('vendor_jobs', function (Blueprint $table) {
            $table->index('status');
            $table->index('job_no');
            $table->index('partner_id');
        });

        Schema::table('partners', function (Blueprint $table) {
            $table->index('status');
            $table->index('kyc_status');
            $table->index('availability');
        });

        Schema::table('customer_profiles', function (Blueprint $table) {
            $table->index('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Indexes are preserved or dropped with tables during full resets
    }
};
