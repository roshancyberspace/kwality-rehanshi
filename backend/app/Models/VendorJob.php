<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorJob extends Model
{
    protected $fillable = ['job_no', 'partner_id', 'service_id', 'customer_name', 'service_name', 'address', 'slot', 'amount', 'status', 'next_action', 'metadata'];

    protected $casts = ['metadata' => 'array'];

    public function partner()
    {
        return $this->belongsTo(Partner::class);
    }
}
