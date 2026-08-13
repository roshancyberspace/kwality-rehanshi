<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicket extends Model
{
    protected $fillable = ['ticket_no', 'name', 'type', 'subject', 'priority', 'status', 'metadata'];

    protected $casts = ['metadata' => 'array'];

    protected $appends = ['phone', 'email', 'description', 'image', 'customer_id'];

    public function getPhoneAttribute(): ?string
    {
        return data_get($this->metadata, 'phone');
    }

    public function getEmailAttribute(): ?string
    {
        return data_get($this->metadata, 'email');
    }

    public function getDescriptionAttribute(): ?string
    {
        return data_get($this->metadata, 'description');
    }

    public function getImageAttribute(): ?string
    {
        return data_get($this->metadata, 'image');
    }

    public function getCustomerIdAttribute(): ?int
    {
        $id = data_get($this->metadata, 'customer_id');

        return $id !== null && $id !== '' ? (int) $id : null;
    }
}
