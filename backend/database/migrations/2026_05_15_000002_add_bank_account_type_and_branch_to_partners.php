<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            if (! Schema::hasColumn('partners', 'bank_account_type')) {
                $table->string('bank_account_type', 50)->nullable()->after('bank_account_number');
            }

            if (! Schema::hasColumn('partners', 'bank_branch_name')) {
                $table->string('bank_branch_name')->nullable()->after('bank_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            foreach (['bank_account_type', 'bank_branch_name'] as $column) {
                if (Schema::hasColumn('partners', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
