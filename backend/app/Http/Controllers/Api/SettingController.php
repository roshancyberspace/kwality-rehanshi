<?php

namespace App\Http\Controllers\Api;

use App\Models\Setting;

class SettingController extends CrudController
{
    protected string $model = Setting::class;
    protected string $searchColumn = 'key';
    protected array $rules = ['group'=>['required','string','max:100'],'key'=>['required','string','max:100'],'value'=>['nullable','string'],'type'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];

    protected function imageFields(): array
    {
        return ['value'];
    }

    protected function imageDirectory(): string
    {
        return 'settings-images';
    }
}
