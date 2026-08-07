<?php

namespace App\Support;

use App\Models\Brand;
use App\Models\ServicePackage;
use App\Models\ServicePackageSection;
use Illuminate\Support\Facades\DB;

class PackageDetailSectionSyncer
{
    public function syncMissing(): array
    {
        $created = 0;
        $packages = ServicePackage::query()->with('service')->get();

        foreach ($packages as $package) {
            foreach ($this->sectionsForPackage($package) as $index => $section) {
                $record = ServicePackageSection::firstOrCreate(
                    [
                        'service_package_id' => $package->id,
                        'section_key' => $section['key'],
                    ],
                    [
                        'service_id' => $package->service_id,
                        'section_type' => $section['type'],
                        'title' => $section['title'],
                        'subtitle' => $section['subtitle'] ?? null,
                        'body' => $section['body'] ?? null,
                        'image' => $section['image'] ?? null,
                        'items' => $section['items'] ?? [],
                        'metadata' => $section['metadata'] ?? null,
                        'sort_order' => $index + 1,
                        'status' => 'Active',
                        'is_visible' => true,
                    ],
                );

                if ($record->wasRecentlyCreated) {
                    $created++;
                }
            }
        }

        return ['packages' => $packages->count(), 'created' => $created];
    }

    public function removeDuplicates(): int
    {
        $deleted = 0;
        $duplicateGroups = ServicePackageSection::query()
            ->select('service_package_id', 'section_key', DB::raw('COUNT(*) as total'))
            ->whereNotNull('service_package_id')
            ->whereNotNull('section_key')
            ->groupBy('service_package_id', 'section_key')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicateGroups as $group) {
            $ids = ServicePackageSection::query()
                ->where('service_package_id', $group->service_package_id)
                ->where('section_key', $group->section_key)
                ->orderBy('id')
                ->pluck('id')
                ->all();

            $deleteIds = array_slice($ids, 1);
            if ($deleteIds) {
                $deleted += ServicePackageSection::query()->whereIn('id', $deleteIds)->delete();
            }
        }

        return $deleted;
    }

    public function sectionsForPackage(ServicePackage $package): array
    {
        $included = $package->included ?: $package->highlights ?: ['Inspection', 'Service delivery', 'Final quality check'];
        $notIncluded = $package->not_included ?: ['Spare parts are charged extra', 'Major repair work after inspection'];
        $process = $package->process ?: ['Book slot', 'Professional visit', 'Service completion', 'Final quality check'];
        $brandNames = Brand::query()
            ->where('status', '!=', 'Inactive')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->pluck('name')
            ->filter()
            ->values()
            ->all();

        if (! $brandNames) {
            $brandNames = ['LG', 'VOLTAS', 'Haier', 'HITACHI', 'Panasonic', 'SAMSUNG', 'Godrej'];
        }

        $descriptionPoints = [
            $package->description ?: 'Professional service completed by a trained expert.',
            'Transparent quote is shared before any additional work is started.',
            'Service is completed with a final quality check and basic clean-up.',
        ];

        return [
            [
                'key' => 'summary',
                'type' => 'summary',
                'title' => 'Package summary',
                'body' => $package->description,
                'items' => ['Service warranty available', 'Price shown before booking', 'Professional brings required tools'],
                'metadata' => ['offer' => $package->offer],
            ],
            [
                'key' => 'included',
                'type' => 'list',
                'title' => 'Included in this service',
                'items' => $included,
                'metadata' => ['tone' => 'positive'],
            ],
            [
                'key' => 'not_included',
                'type' => 'list',
                'title' => 'Not included',
                'items' => $notIncluded,
                'metadata' => ['tone' => 'neutral'],
            ],
            [
                'key' => 'process',
                'type' => 'steps',
                'title' => 'Our process',
                'items' => $process,
            ],
            [
                'key' => 'requirements',
                'type' => 'cards',
                'title' => 'What we will need from you',
                'body' => 'Please keep the service area accessible before the professional arrives.',
                'items' => ['Access to service area', 'Adult supervision during service'],
            ],
            [
                'key' => 'description',
                'type' => 'list',
                'title' => 'Package description',
                'items' => $descriptionPoints,
            ],
            [
                'key' => 'brands',
                'type' => 'grid',
                'title' => 'We service all brands*',
                'body' => '*Brand names are used for service compatibility information only.',
                'items' => $brandNames,
            ],
            [
                'key' => 'faq',
                'type' => 'faq',
                'title' => 'Frequently asked questions',
                'items' => ['What does this service include?', 'Will extra material be charged separately?', 'Is there any service warranty?'],
                'metadata' => [
                    'faqs' => [
                        ['question' => 'What does this service include?', 'answer' => 'The included work is listed in the included section for this package.'],
                        ['question' => 'Will extra material be charged separately?', 'answer' => 'Yes, spare parts or extra material are quoted after inspection and used only after approval.'],
                        ['question' => 'Is there any service warranty?', 'answer' => $package->warranty ?: 'Eligible service issues are covered under the stated service warranty.'],
                    ],
                ],
            ],
            [
                'key' => 'reviews',
                'type' => 'review_summary',
                'title' => 'Customer reviews',
                'metadata' => ['rating' => $package->rating ?: '4.8', 'reviews' => $package->jobs ?: '8K bookings', 'five_star_percent' => 86],
            ],
            [
                'key' => 'warranty',
                'type' => 'note',
                'title' => 'Warranty and important notes',
                'body' => $package->warranty ?: '30 day service warranty is applicable on eligible service issues.',
            ],
        ];
    }
}
