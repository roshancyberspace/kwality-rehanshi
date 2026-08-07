<?php

use App\Support\PackageDetailSectionSyncer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        app(PackageDetailSectionSyncer::class)->removeDuplicates();

        Schema::table('service_package_sections', function (Blueprint $table) {
            $table->unique(['service_package_id', 'section_key'], 'service_package_sections_package_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('service_package_sections', function (Blueprint $table) {
            $table->dropUnique('service_package_sections_package_key_unique');
        });
    }
};
