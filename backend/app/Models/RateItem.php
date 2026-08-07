<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RateItem extends Model
{
    protected $fillable = ['service_id', 'name', 'image', 'price', 'status'];

    protected $with = ['service'];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }
}
