<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorWallet extends Model
{
    protected $fillable = ['partner_id', 'partner_name', 'online_earning', 'cash_collected', 'company_commission', 'vendor_payable', 'company_due', 'settlement', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
