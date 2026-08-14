<?php

namespace App\Http\Controllers\Api;

use App\Models\Testimonial;
use Illuminate\Http\Request;

class TestimonialController extends CrudController
{
    protected bool $cacheable = true;

    protected string $model = Testimonial::class;

    protected string $searchColumn = 'customer_name';

    protected array $rules = [
        'customer_name' => ['required', 'string', 'max:255'],
        'service_type' => ['nullable', 'string', 'max:255'],
        'location' => ['nullable', 'string', 'max:255'],
        'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
        'review_text' => ['nullable', 'string'],
        'image' => ['nullable', 'string'],
        'is_video' => ['nullable'],
        'video_url' => ['nullable', 'string', 'max:500'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'in:Active,Inactive'],
        'metadata' => ['nullable', 'array'],
    ];

    protected function getSearchableColumns(): array
    {
        return ['customer_name', 'service_type', 'location', 'review_text'];
    }

    protected function validatedData(Request $request): array
    {
        if ($request->has('is_video')) {
            $request->merge(['is_video' => $this->toBoolean($request->input('is_video'))]);
        }

        $data = parent::validatedData($request);

        if (! array_key_exists('status', $data) || $data['status'] === null || $data['status'] === '') {
            $data['status'] = 'Active';
        }

        if (! array_key_exists('sort_order', $data) || $data['sort_order'] === null || $data['sort_order'] === '') {
            $data['sort_order'] = 0;
        }

        if (! array_key_exists('rating', $data) || $data['rating'] === null || $data['rating'] === '') {
            $data['rating'] = 5;
        }

        $isVideo = (bool) ($data['is_video'] ?? false);
        $videoUrl = trim((string) ($data['video_url'] ?? ''));
        $data['is_video'] = $isVideo || $videoUrl !== '';
        $data['video_url'] = $videoUrl !== '' ? $videoUrl : null;

        return $data;
    }

    protected function imageFields(): array
    {
        return ['image'];
    }

    private function toBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'video'], true);
    }
}
