<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicket extends Model
{
    protected $fillable = ['ticket_no', 'name', 'type', 'subject', 'priority', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];
}
