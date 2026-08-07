<?php

namespace App\Http\Controllers\Api;

use App\Models\ServiceLocation;

class ServiceLocationController extends CrudController
{
    protected string $model = ServiceLocation::class;
    protected string $searchColumn = 'city';
    protected array $rules = ['city'=>['required','string','max:255'],'area'=>['required','string','max:255'],'pincode'=>['nullable','string','max:20'],'availability'=>['nullable','string','max:100'],'professionals_count'=>['nullable','integer'],'status'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];
}
