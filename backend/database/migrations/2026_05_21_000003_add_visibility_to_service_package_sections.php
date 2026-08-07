<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_package_sections', function (Blueprint $table) {
            $table->boolean('is_visible')->default(true)->after('status');
        });

        DB::table('service_package_sections')->update(['is_visible' => true]);
    }

    public function down(): void
    {
        Schema::table('service_package_sections', function (Blueprint $table) {
            $table->dropColumn('is_visible');
        });
    }
};
