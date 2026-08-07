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
        Schema::table('sub_services', function (Blueprint $table) {
            if (Schema::hasColumn('sub_services', 'image')) {
                $table->dropColumn('image');
            }
            if (!Schema::hasColumn('sub_services', 'icon')) {
                $table->string('icon')->nullable()->after('slug');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sub_services', function (Blueprint $table) {
            if (Schema::hasColumn('sub_services', 'icon')) {
                $table->dropColumn('icon');
            }
            if (!Schema::hasColumn('sub_services', 'image')) {
                $table->string('image')->nullable()->after('slug');
            }
        });
    }
};
