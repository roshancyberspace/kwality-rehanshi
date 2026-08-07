<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $fillable = ['booking_id', 'invoice_number', 'data'];

    protected $casts = [
        'data' => 'array',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
