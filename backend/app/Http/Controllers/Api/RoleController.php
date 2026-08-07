<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;

class RoleController extends CrudController
{
        protected bool $cacheable = true;
    protected string $model = Role::class;
    protected array $rules = ['name'=>['required','string','max:255'],'slug'=>['nullable','string','max:255'],'permissions'=>['nullable','array'],'status'=>['nullable','string','max:50']];
}
