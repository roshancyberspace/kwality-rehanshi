<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->string('applies_to')->default('all')->after('usage_limit');
            $table->json('category_ids')->nullable()->after('applies_to');
            $table->json('service_ids')->nullable()->after('category_ids');
            $table->json('service_package_ids')->nullable()->after('service_ids');
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn(['applies_to', 'category_ids', 'service_ids', 'service_package_ids']);
        });
    }
};
