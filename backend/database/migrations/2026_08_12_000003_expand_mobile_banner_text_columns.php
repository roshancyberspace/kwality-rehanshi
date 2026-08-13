<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE mobile_banners MODIFY title TEXT NULL');
            DB::statement('ALTER TABLE mobile_banners MODIFY subtitle TEXT NULL');
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE mobile_banners ALTER COLUMN title TYPE TEXT');
            DB::statement('ALTER TABLE mobile_banners ALTER COLUMN subtitle TYPE TEXT');
            return;
        }

        // SQLite and others: recreate is unnecessary for local text growth; skip safely.
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE mobile_banners MODIFY title VARCHAR(255) NULL');
            DB::statement('ALTER TABLE mobile_banners MODIFY subtitle VARCHAR(255) NULL');
        }
    }
};
