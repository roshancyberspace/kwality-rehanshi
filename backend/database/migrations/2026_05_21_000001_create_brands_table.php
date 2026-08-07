<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('logo')->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        $now = now();
        $brandLogos = [
            'LG' => 'https://logo.clearbit.com/lg.com',
            'VOLTAS' => 'https://logo.clearbit.com/voltas.com',
            'Haier' => 'https://logo.clearbit.com/haier.com',
            'HITACHI' => 'https://logo.clearbit.com/hitachi.com',
            'Panasonic' => 'https://logo.clearbit.com/panasonic.com',
            'Mitsubishi Electric' => 'https://logo.clearbit.com/mitsubishielectric.com',
            'Blue Star' => 'https://logo.clearbit.com/bluestarindia.com',
            'Daikin' => 'https://logo.clearbit.com/daikin.com',
            'SAMSUNG' => 'https://logo.clearbit.com/samsung.com',
            'Godrej' => 'https://logo.clearbit.com/godrej.com',
            'TOSHIBA' => 'https://logo.clearbit.com/toshiba.com',
            'Whirlpool' => 'https://logo.clearbit.com/whirlpool.com',
        ];

        foreach (array_keys($brandLogos) as $index => $brandName) {
            DB::table('brands')->insert([
                'name' => $brandName,
                'logo' => $brandLogos[$brandName],
                'sort_order' => $index + 1,
                'status' => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};
