<?php

namespace App\Http\Controllers\Api;

use App\Models\ServicePackageSection;
use Illuminate\Http\Request;

class ServicePackageSectionController extends CrudController
{
    protected string $model = ServicePackageSection::class;

    protected array $with = ['servicePackage', 'service'];

    protected string $searchColumn = 'title';

    protected array $rules = [
        'service_package_id' => ['required', 'exists:service_packages,id'],
        'service_id' => ['nullable', 'exists:services,id'],
        'section_key' => ['required', 'string', 'max:100'],
        'section_type' => ['required', 'string', 'max:100'],
        'title' => ['required', 'string', 'max:255'],
        'subtitle' => ['nullable', 'string', 'max:255'],
        'body' => ['nullable', 'string'],
        'image' => ['nullable', 'string'],
        'items' => ['nullable', 'array'],
        'metadata' => ['nullable', 'array'],
        'sort_order' => ['nullable', 'integer'],
        'status' => ['nullable', 'string', 'max:50'],
        'is_visible' => ['nullable', 'boolean'],
    ];

    public function index(Request $request)
    {
        $query = ServicePackageSection::query()
            ->with([
                'servicePackage.service:id,name,category_id',
                'servicePackage.subService:id,name,service_id',
                'service:id,name',
            ])
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($request->filled('service_id')) {
            $serviceId = $request->integer('service_id');
            $query->where(function ($inner) use ($serviceId) {
                $inner->where('service_id', $serviceId)
                    ->orWhereHas('servicePackage', fn ($package) => $package->where('service_id', $serviceId));
            });
        }

        if ($request->filled('sub_service_id')) {
            $query->whereHas('servicePackage', fn ($package) => $package->where('sub_service_id', $request->integer('sub_service_id')));
        }

        if ($request->filled('section_key')) {
            $query->where('section_key', $request->string('section_key'));
        }

        if ($request->filled('title')) {
            $query->where('title', $request->string('title'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('q') || $request->filled('search')) {
            $term = '%'.($request->string('q') ?: $request->string('search')).'%';
            $query->where(function ($inner) use ($term) {
                $inner->where('title', 'like', $term)
                    ->orWhere('section_key', 'like', $term)
                    ->orWhere('section_type', 'like', $term)
                    ->orWhereHas('servicePackage', fn ($package) => $package->where('name', 'like', $term))
                    ->orWhereHas('service', fn ($service) => $service->where('name', 'like', $term));
            });
        }

        $items = $query->get();

        return response()->json([
            'data' => $items,
            'total' => $items->count(),
            'per_page' => $items->count(),
            'current_page' => 1,
            'last_page' => 1,
        ]);
    }
}
