<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kyc_documents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('is_required')->default(true);
            $table->integer('sort_order')->default(0);
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        $now = now();
        $documents = [
            ['name' => 'Profile photo', 'is_required' => true, 'sort_order' => 1],
            ['name' => 'Aadhaar', 'is_required' => true, 'sort_order' => 2],
            ['name' => 'PAN', 'is_required' => true, 'sort_order' => 3],
            ['name' => 'Address proof', 'is_required' => true, 'sort_order' => 4],
            ['name' => 'Police Verification Certificate', 'is_required' => true, 'sort_order' => 5],
            ['name' => 'Work experience proof', 'is_required' => false, 'sort_order' => 6],
        ];

        foreach ($documents as $document) {
            DB::table('kyc_documents')->insert([
                'name' => $document['name'],
                'is_required' => $document['is_required'],
                'sort_order' => $document['sort_order'],
                'status' => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('kyc_documents');
    }
};
