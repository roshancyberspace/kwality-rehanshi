<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerWallet extends Model
{
    protected $fillable = [
        'customer_profile_id',
        'customer_name',
        'balance',
        'total_credit',
        'total_debit',
        'status',
        'metadata',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'total_debit' => 'decimal:2',
        'metadata' => 'array',
    ];
}
