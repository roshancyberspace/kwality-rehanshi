<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->decimal('commission_percentage', 5, 2)->nullable()->after('sort_order');
        });

        Schema::table('partners', function (Blueprint $table) {
            $table->decimal('commission_percentage', 5, 2)->nullable()->after('earnings');
        });

        Schema::create('customer_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name');
            $table->decimal('balance', 12, 2)->default(0);
            $table->decimal('total_credit', 12, 2)->default(0);
            $table->decimal('total_debit', 12, 2)->default(0);
            $table->string('status')->default('Active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no')->nullable()->unique();
            $table->string('wallet_type');
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $table->string('booking_no')->nullable();
            $table->string('direction');
            $table->string('type');
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2)->default(0);
            $table->string('status')->default('Posted');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['wallet_type', 'partner_id']);
            $table->index(['wallet_type', 'customer_profile_id']);
            $table->index(['booking_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('customer_wallets');

        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn('commission_percentage');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('commission_percentage');
        });
    }
};
