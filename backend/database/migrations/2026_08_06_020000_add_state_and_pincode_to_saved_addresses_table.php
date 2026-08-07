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
        Schema::table('saved_addresses', function (Blueprint $table) {
            if (! Schema::hasColumn('saved_addresses', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (! Schema::hasColumn('saved_addresses', 'pincode')) {
                $table->string('pincode', 20)->nullable()->after('state');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('saved_addresses', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('saved_addresses', 'state')) {
                $columns[] = 'state';
            }
            if (Schema::hasColumn('saved_addresses', 'pincode')) {
                $columns[] = 'pincode';
            }
            if (! empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
