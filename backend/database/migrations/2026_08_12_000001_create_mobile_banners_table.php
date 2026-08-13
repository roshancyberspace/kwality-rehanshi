<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_banners', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->text('body')->nullable();
            $table->text('image')->nullable();
            $table->string('button_text')->nullable();
            $table->string('button_url')->nullable();
            $table->string('title_color')->default('#FFFFFF');
            $table->string('subtitle_color')->default('#E5E7EB');
            $table->string('body_color')->default('#FFFFFF');
            $table->string('button_color')->default('#FFFFFF');
            $table->string('text_align')->default('left');
            $table->string('title_size')->default('2xl');
            $table->string('subtitle_size')->default('sm');
            $table->string('title_weight')->default('extrabold');
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('mobile_banners')->insert([
            [
                'title' => 'AC SERVICES',
                'subtitle' => 'COOL COMFORT, PERFECT CARE!',
                'body' => null,
                'image' => 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80',
                'button_text' => 'Book now',
                'button_url' => '/services',
                'title_color' => '#FFFFFF',
                'subtitle_color' => '#E5E7EB',
                'body_color' => '#FFFFFF',
                'button_color' => '#FFFFFF',
                'text_align' => 'left',
                'title_size' => '2xl',
                'subtitle_size' => 'sm',
                'title_weight' => 'extrabold',
                'sort_order' => 1,
                'status' => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'title' => 'Home Cleaning',
                'subtitle' => 'Sparkling clean, every time',
                'body' => null,
                'image' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
                'button_text' => 'Explore',
                'button_url' => '/services',
                'title_color' => '#FFFFFF',
                'subtitle_color' => '#E5E7EB',
                'body_color' => '#FFFFFF',
                'button_color' => '#FFFFFF',
                'text_align' => 'left',
                'title_size' => '2xl',
                'subtitle_size' => 'sm',
                'title_weight' => 'extrabold',
                'sort_order' => 2,
                'status' => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_banners');
    }
};
