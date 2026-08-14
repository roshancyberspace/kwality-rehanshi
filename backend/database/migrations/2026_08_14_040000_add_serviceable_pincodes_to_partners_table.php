<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            if (! Schema::hasColumn('partners', 'serviceable_pincodes')) {
                $table->json('serviceable_pincodes')->nullable()->after('pincode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            if (Schema::hasColumn('partners', 'serviceable_pincodes')) {
                $table->dropColumn('serviceable_pincodes');
            }
        });
    }
};
