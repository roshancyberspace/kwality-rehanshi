<?php

namespace App\Http\Controllers\Api;

use App\Models\Setting;

class SettingController extends CrudController
{
    protected string $model = Setting::class;
    protected string $searchColumn = 'key';
    protected array $rules = ['group'=>['required','string','max:100'],'key'=>['required','string','max:100'],'value'=>['nullable','string'],'type'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];

    protected function validatedData(\Illuminate\Http\Request $request): array
    {
        $data = parent::validatedData($request);

        // When updating gateway or settings, if secret fields are left empty or masked, preserve existing value
        if ($request->isMethod('patch') || $request->isMethod('put')) {
            $id = $request->route('setting') ?: $request->route('id');
            if ($id) {
                $existing = Setting::find($id);
                if ($existing && isset($data['metadata']) && is_array($data['metadata'])) {
                    $existingMeta = is_array($existing->metadata) ? $existing->metadata : [];
                    foreach (['secret_key', 'salt_key', 'client_secret', 'private_key', 'key_secret', 'api_secret', 'webhook_secret', 'password'] as $secretKey) {
                        if (
                            isset($existingMeta[$secretKey])
                            && (! isset($data['metadata'][$secretKey]) || $data['metadata'][$secretKey] === '' || $data['metadata'][$secretKey] === '••••••••')
                        ) {
                            $data['metadata'][$secretKey] = $existingMeta[$secretKey];
                        }
                    }
                }
            }
        }

        return $data;
    }

    protected function imageFields(): array
    {
        return ['value'];
    }

    protected function imageDirectory(): string
    {
        return 'settings-images';
    }
}
