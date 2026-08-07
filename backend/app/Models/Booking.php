<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = ['booking_no', 'customer_name', 'customer_phone', 'service_name', 'service_id', 'service_package_id', 'scheduled_at', 'address', 'partner_id', 'professional_name', 'status', 'payment_status', 'payment_method', 'amount', 'tip_amount', 'priority', 'timeline', 'metadata'];

    protected $casts = ['scheduled_at' => 'datetime', 'timeline' => 'array', 'metadata' => 'array', 'tip_amount' => 'float'];

    public function partner()
    {
        return $this->belongsTo(Partner::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function extraItems()
    {
        return $this->hasMany(BookingExtraItem::class);
    }
}
