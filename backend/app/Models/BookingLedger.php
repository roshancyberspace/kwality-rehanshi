<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingLedger extends Model
{
    protected $fillable = ['ledger_no', 'booking_id', 'booking_no', 'partner_name', 'method', 'gross', 'commission', 'vendor_amount', 'company_due', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
