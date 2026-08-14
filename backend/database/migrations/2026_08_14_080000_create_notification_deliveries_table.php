<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_notification_id')->constrained('admin_notifications')->cascadeOnDelete();
            $table->string('recipient_type', 40);
            $table->unsignedBigInteger('recipient_id');
            $table->string('recipient_name')->nullable();
            $table->string('channel', 20);
            $table->string('contact')->nullable();
            $table->string('status', 30)->default('pending');
            $table->string('error', 500)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['admin_notification_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_deliveries');
    }
};
