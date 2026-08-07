<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payout extends Model
{
    protected $fillable = ['partner_id', 'partner_name', 'jobs', 'earnings', 'commission', 'pending', 'paid', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
