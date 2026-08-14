<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('service_type')->nullable();
            $table->string('location')->nullable();
            $table->decimal('rating', 3, 1)->default(5);
            $table->text('review_text')->nullable();
            $table->string('image')->nullable();
            $table->boolean('is_video')->default(false);
            $table->string('video_url', 500)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status', 50)->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('testimonials')->insert([
            [
                'customer_name' => 'Priya Sharma',
                'service_type' => 'Home Cleaning',
                'location' => 'Lucknow',
                'rating' => 5.0,
                'review_text' => 'Professional team, on time, and my house looked spotless. Highly recommended.',
                'image' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
                'is_video' => true,
                'video_url' => 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
                'sort_order' => 1,
                'status' => 'Active',
                'metadata' => json_encode(['source' => 'homepage_seed']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'customer_name' => 'Rahul Verma',
                'service_type' => 'AC Service',
                'location' => 'Gomti Nagar',
                'rating' => 5.0,
                'review_text' => 'Quick diagnosis and fair pricing. Cooling is perfect again after the service.',
                'image' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
                'is_video' => false,
                'video_url' => null,
                'sort_order' => 2,
                'status' => 'Active',
                'metadata' => json_encode(['source' => 'homepage_seed']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'customer_name' => 'Ananya Singh',
                'service_type' => "Women's Salon",
                'location' => 'Indira Nagar',
                'rating' => 5.0,
                'review_text' => 'Salon-quality service at home. Booking was super easy and the stylist was great.',
                'image' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
                'is_video' => true,
                'video_url' => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
                'sort_order' => 3,
                'status' => 'Active',
                'metadata' => json_encode(['source' => 'homepage_seed']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'customer_name' => 'Vikram Joshi',
                'service_type' => 'Electrician',
                'location' => 'Aliganj',
                'rating' => 5.0,
                'review_text' => 'Fixed wiring the same day. Polite, skilled, and explained everything clearly.',
                'image' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
                'is_video' => false,
                'video_url' => null,
                'sort_order' => 4,
                'status' => 'Active',
                'metadata' => json_encode(['source' => 'homepage_seed']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
