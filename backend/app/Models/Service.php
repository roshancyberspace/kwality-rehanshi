<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = ['category_id', 'name', 'slug', 'image', 'duration', 'rating', 'description', 'includes', 'sort_order', 'status', 'metadata'];

    protected $casts = ['includes' => 'array', 'metadata' => 'array'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function packages()
    {
        return $this->hasMany(ServicePackage::class);
    }

    public function subServices()
    {
        return $this->hasMany(SubService::class);
    }
}
