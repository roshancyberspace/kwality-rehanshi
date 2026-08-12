<?php

namespace App\Http\Controllers\Api;

use App\Models\KycDocument;
use Illuminate\Http\Request;

class KycDocumentController extends CrudController
{
    protected bool $cacheable = true;

    protected string $model = KycDocument::class;

    protected array $rules = [
        'name' => ['required', 'string', 'max:255'],
        'is_required' => ['nullable', 'boolean'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
    ];

    protected function validatedData(Request $request): array
    {
        if ($request->has('is_required')) {
            $value = $request->input('is_required');
            $request->merge([
                'is_required' => $this->toBoolean($value),
            ]);
        }

        $data = parent::validatedData($request);

        if (! array_key_exists('is_required', $data)) {
            $data['is_required'] = true;
        }

        if (! array_key_exists('status', $data) || $data['status'] === null || $data['status'] === '') {
            $data['status'] = 'Active';
        }

        if (! array_key_exists('sort_order', $data) || $data['sort_order'] === null || $data['sort_order'] === '') {
            $data['sort_order'] = 0;
        }

        return $data;
    }

    private function toBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'yes', 'required'], true);
    }
}
