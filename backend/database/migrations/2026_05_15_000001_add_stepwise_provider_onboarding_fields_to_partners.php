<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            if (! Schema::hasColumn('partners', 'alternate_phone')) {
                $table->string('alternate_phone')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('partners', 'address_line')) {
                $table->text('address_line')->nullable()->after('area');
            }
            if (! Schema::hasColumn('partners', 'service_experience_years')) {
                $table->unsignedTinyInteger('service_experience_years')->nullable()->after('services');
            }
            if (! Schema::hasColumn('partners', 'bank_account_holder')) {
                $table->string('bank_account_holder')->nullable()->after('pincode');
            }
            if (! Schema::hasColumn('partners', 'bank_account_number')) {
                $table->string('bank_account_number')->nullable()->after('bank_account_holder');
            }
            if (! Schema::hasColumn('partners', 'bank_ifsc')) {
                $table->string('bank_ifsc', 20)->nullable()->after('bank_account_number');
            }
            if (! Schema::hasColumn('partners', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('bank_ifsc');
            }
            if (! Schema::hasColumn('partners', 'onboarding_step')) {
                $table->string('onboarding_step')->default('submitted')->after('kyc_rejected_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            foreach ([
                'alternate_phone',
                'address_line',
                'service_experience_years',
                'bank_account_holder',
                'bank_account_number',
                'bank_ifsc',
                'bank_name',
                'onboarding_step',
            ] as $column) {
                if (Schema::hasColumn('partners', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
