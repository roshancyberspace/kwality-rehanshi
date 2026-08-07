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
        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                if (Schema::hasColumn('services', 'starting_price')) {
                    $table->dropColumn('starting_price');
                }
                if (Schema::hasColumn('services', 'sale_price')) {
                    $table->dropColumn('sale_price');
                }
            });
        }

        if (Schema::hasTable('sub_services')) {
            Schema::table('sub_services', function (Blueprint $table) {
                if (Schema::hasColumn('sub_services', 'starting_price')) {
                    $table->dropColumn('starting_price');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                if (!Schema::hasColumn('services', 'starting_price')) {
                    $table->string('starting_price')->nullable();
                }
                if (!Schema::hasColumn('services', 'sale_price')) {
                    $table->string('sale_price')->nullable();
                }
            });
        }

        if (Schema::hasTable('sub_services')) {
            Schema::table('sub_services', function (Blueprint $table) {
                if (!Schema::hasColumn('sub_services', 'starting_price')) {
                    $table->string('starting_price', 100)->nullable();
                }
            });
        }
    }
};
