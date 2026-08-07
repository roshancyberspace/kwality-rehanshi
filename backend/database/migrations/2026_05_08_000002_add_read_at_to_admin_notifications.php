<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('admin_notifications', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('sent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            if (Schema::hasColumn('admin_notifications', 'read_at')) {
                $table->dropColumn('read_at');
            }
        });
    }
};
