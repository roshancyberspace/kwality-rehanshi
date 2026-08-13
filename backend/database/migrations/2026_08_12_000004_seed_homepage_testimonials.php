<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('app_contents')->where('type', 'testimonial')->exists();
        if ($exists) {
            return;
        }

        $now = now();
        $rows = [
            [
                'type' => 'testimonial',
                'title' => 'Priya Sharma',
                'subtitle' => 'Home Cleaning · Lucknow',
                'body' => 'Professional team, on time, and my house looked spotless. Highly recommended.',
                'image' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
                'button_text' => 'Watch',
                'button_url' => 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
                'sort_order' => 1,
                'status' => 'Active',
                'metadata' => json_encode(['rating' => 5]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'type' => 'testimonial',
                'title' => 'Rahul Verma',
                'subtitle' => 'AC Service · Gomti Nagar',
                'body' => 'Quick diagnosis and fair pricing. Cooling is perfect again after the service.',
                'image' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
                'button_text' => null,
                'button_url' => null,
                'sort_order' => 2,
                'status' => 'Active',
                'metadata' => json_encode(['rating' => 5]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'type' => 'testimonial',
                'title' => 'Ananya Singh',
                'subtitle' => "Women's Salon · Indira Nagar",
                'body' => 'Salon-quality service at home. Booking was super easy and the stylist was great.',
                'image' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
                'button_text' => 'Watch',
                'button_url' => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
                'sort_order' => 3,
                'status' => 'Active',
                'metadata' => json_encode(['rating' => 4.8]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'type' => 'testimonial',
                'title' => 'Vikram Joshi',
                'subtitle' => 'Electrician · Aliganj',
                'body' => 'Fixed wiring the same day. Polite, skilled, and explained everything clearly.',
                'image' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
                'button_text' => null,
                'button_url' => null,
                'sort_order' => 4,
                'status' => 'Active',
                'metadata' => json_encode(['rating' => 4.9]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        DB::table('app_contents')->insert($rows);
    }

    public function down(): void
    {
        DB::table('app_contents')->where('type', 'testimonial')->delete();
    }
};
