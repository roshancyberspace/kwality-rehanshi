<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            if (! Schema::hasColumn('partners', 'aadhaar_document')) {
                $table->string('aadhaar_document')->nullable()->after('documents');
            }
            if (! Schema::hasColumn('partners', 'pan_document')) {
                $table->string('pan_document')->nullable()->after('aadhaar_document');
            }
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            foreach (['aadhaar_document', 'pan_document'] as $column) {
                if (Schema::hasColumn('partners', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
