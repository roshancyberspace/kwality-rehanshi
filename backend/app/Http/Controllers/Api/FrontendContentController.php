<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppContent;
use App\Models\Booking;
use App\Models\Brand;
use App\Models\MobileBanner;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Review;
use App\Models\Service;
use App\Models\ServicePackage;
use App\Models\Setting;
use App\Models\Page;

class FrontendContentController extends Controller
{
    public function index()
    {
        $bookings = Booking::query()
            ->select(['id', 'service_name', 'service_id', 'service_package_id', 'metadata'])
            ->get();

        $packageIdCounts = [];
        $serviceIdCounts = [];
        $nameCounts = [];

        foreach ($bookings as $booking) {
            if ($booking->service_package_id) {
                $packageIdCounts[$booking->service_package_id] = ($packageIdCounts[$booking->service_package_id] ?? 0) + 1;
            }
            if ($booking->service_id) {
                $serviceIdCounts[$booking->service_id] = ($serviceIdCounts[$booking->service_id] ?? 0) + 1;
            }
            if ($booking->service_name) {
                $rawName = strtolower(trim($booking->service_name));
                $nameCounts[$rawName] = ($nameCounts[$rawName] ?? 0) + 1;
                $baseName = preg_replace('/\s*\+\s*\d+\s*more$/i', '', $rawName);
                if ($baseName !== $rawName) {
                    $nameCounts[$baseName] = ($nameCounts[$baseName] ?? 0) + 1;
                }
            }
            $items = $booking->metadata['items'] ?? [];
            if (is_array($items)) {
                foreach ($items as $item) {
                    $itemQty = max(1, (int) ($item['quantity'] ?? 1));
                    if (!empty($item['id'])) {
                        $packageIdCounts[$item['id']] = ($packageIdCounts[$item['id']] ?? 0) + $itemQty;
                    }
                    if (!empty($item['name'])) {
                        $itemName = strtolower(trim($item['name']));
                        $nameCounts[$itemName] = ($nameCounts[$itemName] ?? 0) + $itemQty;
                    }
                }
            }
        }

        $categories = Category::query()
            ->where('status', 'Active')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $services = Service::query()
            ->with(['category', 'subServices' => fn ($query) => $query
                ->where('status', 'Active')
                ->orderBy('sort_order')
                ->orderBy('id'), 'packages' => fn ($query) => $query
                ->with(['detailSections' => fn ($sectionQuery) => $sectionQuery->where('status', 'Active')->where('is_visible', true)])
                ->where('status', 'Active')
                ->orderBy('sort_order')
                ->orderBy('id')])
            ->where('status', 'Active')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $services->each(function (Service $service) use ($serviceIdCounts, $nameCounts, $packageIdCounts) {
            $serviceDirectCount = max(
                (int) ($serviceIdCounts[$service->id] ?? 0),
                (int) ($nameCounts[strtolower(trim($service->name))] ?? 0)
            );

            $packageSum = 0;
            $service->packages->each(function (ServicePackage $package) use ($packageIdCounts, $nameCounts, &$packageSum) {
                $pkgCount = max(
                    (int) ($packageIdCounts[$package->id] ?? 0),
                    (int) ($nameCounts[strtolower(trim($package->name))] ?? 0)
                );
                $package->setAttribute('booking_count', $pkgCount);
                $packageSum += $pkgCount;
            });

            $service->setAttribute('booking_count', max($serviceDirectCount, $packageSum));
        });

        $packages = ServicePackage::query()
            ->with(['service', 'detailSections' => fn ($sectionQuery) => $sectionQuery->where('status', 'Active')->where('is_visible', true)])
            ->where('status', 'Active')
            ->whereHas('service', fn ($query) => $query->where('status', 'Active'))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $packages->each(function (ServicePackage $package) use ($packageIdCounts, $nameCounts) {
            $pkgCount = max(
                (int) ($packageIdCounts[$package->id] ?? 0),
                (int) ($nameCounts[strtolower(trim($package->name))] ?? 0)
            );
            $package->setAttribute('booking_count', $pkgCount);
        });

        return response()->json([
            'categories' => $categories,
            'services' => $services,
            'service_packages' => $packages,
            'coupons' => Coupon::query()
                ->available()
                ->orderBy('id')
                ->get(),
            'brands' => Brand::query()
                ->where('status', 'Active')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
            'mobile_banners' => MobileBanner::query()
                ->where('status', 'Active')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
            'reviews' => Review::query()
                ->whereIn('status', ['Approved', 'Published'])
                ->orderByDesc('reviewed_at')
                ->orderByDesc('id')
                ->get(),
            'app_content' => AppContent::query()
                ->where('status', 'Active')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
            'settings' => Setting::query()
                ->orderBy('group')
                ->orderBy('key')
                ->get()
                ->groupBy('group'),
            'pages' => Page::query()
                ->where('status', 'Active')
                ->orderBy('id')
                ->get(),
        ]);
    }
}
