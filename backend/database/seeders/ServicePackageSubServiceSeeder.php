<?php

namespace Database\Seeders;

use App\Models\ServicePackage;
use App\Models\SubService;
use Illuminate\Database\Seeder;

class ServicePackageSubServiceSeeder extends Seeder
{
    public function run(): void
    {
        $packages = ServicePackage::all();
        $subServicesByService = SubService::all()->groupBy('service_id');
        $updatedCount = 0;

        foreach ($packages as $package) {
            if (!$package->service_id || !isset($subServicesByService[$package->service_id])) {
                continue;
            }
            $subServices = $subServicesByService[$package->service_id];
            $selectedSubService = null;

            $title = strtolower($package->name ?? '');
            $fullText = strtolower(($package->name ?? '') . ' ' . ($package->category_key ?? '') . ' ' . ($package->description ?? ''));

            // 1. Precise Title matching for Women's Salon & Spa (service_id = 1)
            if ($package->service_id == 1 || str_contains(strtolower($package->service?->name ?? ''), 'women')) {
                // First pass: Match directly on Title (most reliable)
                $selectedSubService = $this->matchWomens($title, $subServices);
                // Second pass: Match on full text if title failed
                if (!$selectedSubService) {
                    $selectedSubService = $this->matchWomens($fullText, $subServices);
                }
            }
            // 2. Precise Title matching for Men's Salon & Massage (service_id = 2)
            elseif ($package->service_id == 2 || str_contains(strtolower($package->service?->name ?? ''), 'men')) {
                // First pass: Match directly on Title (most reliable)
                $selectedSubService = $this->matchMens($title, $subServices);
                // Second pass: Match on full text if title failed
                if (!$selectedSubService) {
                    $selectedSubService = $this->matchMens($fullText, $subServices);
                }
            }

            // 3. General keyword matching fallback for other services
            if (!$selectedSubService) {
                $ignoreWords = ['service', 'services', 'repair', 'with', 'home', 'room', 'wall', 'women', 'womens', 'woman', 'men', 'mens', 'man', 'care', 'full', 'treatment', 'styling', 'combo', 'pack', 'for', 'and', 'the', 'gold', 'diamond', 'massage'];

                // Check title first
                foreach ($subServices as $subService) {
                    $words = explode(' ', strtolower(preg_replace('/[^a-z0-9 ]/i', '', $subService->name)));
                    foreach ($words as $word) {
                        if (strlen($word) >= 4 && !in_array($word, $ignoreWords) && str_contains($title, $word)) {
                            $selectedSubService = $subService;
                            break 2;
                        }
                    }
                }

                // If no title match, check full text
                if (!$selectedSubService) {
                    foreach ($subServices as $subService) {
                        $words = explode(' ', strtolower(preg_replace('/[^a-z0-9 ]/i', '', $subService->name)));
                        foreach ($words as $word) {
                            if (strlen($word) >= 4 && !in_array($word, $ignoreWords) && str_contains($fullText, $word)) {
                                $selectedSubService = $subService;
                                break 2;
                            }
                        }
                    }
                }
            }

            // Final fallback to first sub-service of the exact same parent service
            if (!$selectedSubService && $subServices->isNotEmpty()) {
                $selectedSubService = $subServices->first();
            }

            if ($selectedSubService) {
                $package->sub_service_id = $selectedSubService->id;
                $package->save();
                $updatedCount++;
            }
        }

        if (isset($this->command) && method_exists($this->command, 'info')) {
            $this->command->info("Successfully assigned accurate Sub-Services to {$updatedCount} Service Packages!");
        }
    }

    private function matchWomens(string $text, $subServices)
    {
        if ($this->containsAny($text, ['facial', 'cleanup', 'd-tan', 'dtan', 'bleach', 'face pack', 'radiant', 'skin glow'])) {
            return $subServices->firstWhere('name', 'Facial & Cleanup');
        }
        if ($this->containsAny($text, ['manicure', 'pedicure', 'sara', 'nail', 'hand', 'feet'])) {
            return $subServices->firstWhere('name', 'Manicure & Pedicure');
        }
        if ($this->containsAny($text, ['hair', 'cut', 'trim', 'highlight', 'smoothing', 'rebonding', 'layer', 'fringe', 'blunt', 'balayage', 'color', 'colour', 'l\'oréal', 'matrix'])) {
            return $subServices->firstWhere('name', 'Hair Studio for Women');
        }
        if ($this->containsAny($text, ['makeup', 'saree', 'bridal', 'styling', 'draping'])) {
            return $subServices->firstWhere('name', 'Makeup, Saree & Styling');
        }
        if ($this->containsAny($text, ['massage', 'spa therapy', 'body massage'])) {
            return $subServices->firstWhere('name', 'Spa for Women');
        }
        if ($this->containsAny($text, ['wax', 'waxing', 'rica', 'brazilian', 'salon'])) {
            return $subServices->firstWhere('name', 'Salon for Women');
        }
        return null;
    }

    private function matchMens(string $text, $subServices)
    {
        if ($this->containsAny($text, ['facial', 'de-tan', 'dtan', 'cleanup', 'face', 'beardo', 'brightening', 'glow getter'])) {
            return $subServices->firstWhere('name', 'Face Care & Cleanup for Men');
        }
        if ($this->containsAny($text, ['haircut', 'kids', 'grooming essentials', 'complete care', 'styling'])) {
            return $subServices->firstWhere('name', 'Haircut & Styling for Men');
        }
        if ($this->containsAny($text, ['beard', 'shave', 'shaving', 'trimming'])) {
            return $subServices->firstWhere('name', 'Beard Shaving & Grooming');
        }
        if ($this->containsAny($text, ['pedicure', 'manicure', 'nail', 'feet', 'hands', 'aroma bomb'])) {
            return $subServices->firstWhere('name', 'Manicure & Pedicure for Men');
        }
        if ($this->containsAny($text, ['massage', 'head, neck'])) {
            return $subServices->firstWhere('name', 'Massage therapy for Men');
        }
        if ($this->containsAny($text, ['colour', 'color', 'scalp', 'inoa', 'hair spa', 'anti-dandruff', 'hair & care'])) {
            return $subServices->firstWhere('name', 'Hair & Scalp Treatment');
        }
        return null;
    }

    private function containsAny(string $text, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            if (str_contains($text, strtolower($keyword))) {
                return true;
            }
        }
        return false;
    }
}
