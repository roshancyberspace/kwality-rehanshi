<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            if (! Schema::hasColumn('partners', 'business_name')) {
                $table->string('business_name')->nullable()->after('name');
            }
            if (! Schema::hasColumn('partners', 'password')) {
                $table->string('password')->nullable()->after('email');
            }
            if (! Schema::hasColumn('partners', 'city')) {
                $table->string('city')->nullable()->after('area');
            }
            if (! Schema::hasColumn('partners', 'pincode')) {
                $table->string('pincode')->nullable()->after('city');
            }
            if (! Schema::hasColumn('partners', 'services')) {
                $table->json('services')->nullable()->after('skill');
            }
            if (! Schema::hasColumn('partners', 'documents')) {
                $table->json('documents')->nullable()->after('services');
            }
            if (! Schema::hasColumn('partners', 'kyc_submitted_at')) {
                $table->timestamp('kyc_submitted_at')->nullable()->after('kyc_status');
            }
            if (! Schema::hasColumn('partners', 'kyc_verified_at')) {
                $table->timestamp('kyc_verified_at')->nullable()->after('kyc_submitted_at');
            }
            if (! Schema::hasColumn('partners', 'kyc_rejected_reason')) {
                $table->text('kyc_rejected_reason')->nullable()->after('kyc_verified_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            foreach (['business_name', 'password', 'city', 'pincode', 'services', 'documents', 'kyc_submitted_at', 'kyc_verified_at', 'kyc_rejected_reason'] as $column) {
                if (Schema::hasColumn('partners', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
