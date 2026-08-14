<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationDelivery extends Model
{
    protected $fillable = [
        'admin_notification_id',
        'recipient_type',
        'recipient_id',
        'recipient_name',
        'channel',
        'contact',
        'status',
        'error',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function notification()
    {
        return $this->belongsTo(AdminNotification::class, 'admin_notification_id');
    }
}
