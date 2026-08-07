<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    protected $fillable = ['channel', 'audience', 'title', 'message', 'status', 'sent_at', 'read_at', 'metadata'];

    protected $casts = ['sent_at' => 'datetime', 'read_at' => 'datetime', 'metadata' => 'array'];
}
