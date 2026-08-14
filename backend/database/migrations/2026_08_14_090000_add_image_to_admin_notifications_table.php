<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('admin_notifications', 'image')) {
                $table->string('image')->nullable()->after('message');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            if (Schema::hasColumn('admin_notifications', 'image')) {
                $table->dropColumn('image');
            }
        });
    }
};
