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
        if (!Schema::hasColumn('customer_profiles', 'password')) {
            Schema::table('customer_profiles', function (Blueprint $table) {
                $table->string('password')->nullable()->after('email');
            });
        }

        if (!Schema::hasColumn('partners', 'password')) {
            Schema::table('partners', function (Blueprint $table) {
                $table->string('password')->nullable()->after('email');
            });
        }

        if (!Schema::hasColumn('admin_users', 'password')) {
            Schema::table('admin_users', function (Blueprint $table) {
                $table->string('password')->nullable()->after('email');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('customer_profiles', 'password')) {
            Schema::table('customer_profiles', function (Blueprint $table) {
                $table->dropColumn('password');
            });
        }

        if (Schema::hasColumn('partners', 'password')) {
            Schema::table('partners', function (Blueprint $table) {
                $table->dropColumn('password');
            });
        }

        if (Schema::hasColumn('admin_users', 'password')) {
            Schema::table('admin_users', function (Blueprint $table) {
                $table->dropColumn('password');
            });
        }
    }
};
