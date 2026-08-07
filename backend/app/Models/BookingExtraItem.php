<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingExtraItem extends Model
{
    protected $fillable = ['booking_id', 'name', 'price', 'quantity'];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
