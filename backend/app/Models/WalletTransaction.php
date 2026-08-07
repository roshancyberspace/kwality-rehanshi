<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $fillable = [
        'transaction_no',
        'wallet_type',
        'partner_id',
        'customer_profile_id',
        'booking_id',
        'booking_no',
        'direction',
        'type',
        'amount',
        'balance_after',
        'status',
        'description',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
    ];
}
