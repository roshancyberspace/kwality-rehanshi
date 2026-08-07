<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = ['payment_no', 'booking_id', 'customer_name', 'amount', 'method', 'status', 'refund_status', 'paid_at', 'metadata'];

    protected $casts = ['paid_at' => 'datetime', 'metadata' => 'array'];
}
