<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mobile_banners', function (Blueprint $table) {
            $table->string('bg_color')->default('#6D28D9')->after('image');
        });

        DB::table('mobile_banners')->where('id', 1)->update([
            'title' => '<p style="font-size:18px;font-weight:800;line-height:1.25;margin:0;color:#ffffff">Get additional 25% off on your first booking</p>',
            'subtitle' => 'Salon at home',
            'body' => null,
            'button_text' => 'Book now',
            'button_url' => '/services',
            'button_color' => '#FFFFFF',
            'bg_color' => '#6D28D9',
            'image' => 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80',
        ]);

        DB::table('mobile_banners')->where('id', 2)->update([
            'title' => '<p style="font-size:18px;font-weight:800;line-height:1.25;margin:0;color:#ffffff">Expert AC repair at your doorstep</p>',
            'subtitle' => 'Cooling services',
            'body' => null,
            'button_text' => 'Book now',
            'button_url' => '/services',
            'button_color' => '#FFFFFF',
            'bg_color' => '#0F766E',
            'image' => 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=600&q=80',
        ]);
    }

    public function down(): void
    {
        Schema::table('mobile_banners', function (Blueprint $table) {
            $table->dropColumn('bg_color');
        });
    }
};
