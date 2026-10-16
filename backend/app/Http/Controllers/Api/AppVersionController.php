<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppVersionController extends Controller
{
    /**
     * Check mobile app (Customer or Vendor) version and build number.
     *
     * Lower build/version -> Force update (status: false, force_update: true, can_proceed: false)
     * Same build/version  -> Allowed (status: true, force_update: false, can_proceed: true)
     * Upper/Higher build/version -> Allowed (status: true, force_update: false, can_proceed: true)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function check(Request $request): JsonResponse
    {
        // Resolve app_type (supports customer / vendor / partner / provider)
        $rawType = strtolower(trim((string) (
            $request->input('app_type') 
            ?? $request->input('type') 
            ?? $request->input('app') 
            ?? $request->input('role') 
            ?? 'customer'
        )));

        $appType = in_array($rawType, ['vendor', 'partner', 'provider'], true) ? 'vendor' : 'customer';

        // Support multiple input key aliases
        $rawVersion = $request->input('version') 
            ?? $request->input('app_version') 
            ?? $request->input('appVersion');

        $rawBuild = $request->input('build_number') 
            ?? $request->input('build') 
            ?? $request->input('build_no') 
            ?? $request->input('buildNumber') 
            ?? $request->input('version_code') 
            ?? $request->input('versionCode');

        // Validation
        if ($rawVersion === null || $rawBuild === null || trim((string) $rawVersion) === '' || trim((string) $rawBuild) === '') {
            $errors = [];
            if ($rawVersion === null || trim((string) $rawVersion) === '') {
                $errors['version'] = ['The version field is required.'];
            }
            if ($rawBuild === null || trim((string) $rawBuild) === '') {
                $errors['build_number'] = ['The build_number field is required.'];
            }

            return response()->json([
                'status' => false,
                'force_update' => false,
                'can_proceed' => false,
                'message' => 'Both version and build_number are required.',
                'errors' => $errors,
            ], 422);
        }

        $clientVersion = trim((string) $rawVersion);
        $clientBuild = (int) $rawBuild;

        // Current target config from environment
        $appConfig = config("mobile_app.{$appType}") ?? [];
        $currentVersion = trim((string) ($appConfig['version'] ?? '1.0.0'));
        $currentBuild = (int) ($appConfig['build_number'] ?? 1);

        // Version and Build comparison
        $vComp = version_compare($clientVersion, $currentVersion);

        if ($vComp < 0) {
            // Version is lower
            $comparison = 'lower';
            $canProceed = false;
        } elseif ($vComp > 0) {
            // Version is higher
            $comparison = 'higher';
            $canProceed = true;
        } else {
            // Same version, compare build number
            if ($clientBuild < $currentBuild) {
                $comparison = 'lower';
                $canProceed = false;
            } elseif ($clientBuild > $currentBuild) {
                $comparison = 'higher';
                $canProceed = true;
            } else {
                $comparison = 'same';
                $canProceed = true;
            }
        }

        $forceUpdate = ! $canProceed;
        $status = $canProceed;

        if ($canProceed) {
            $message = ($comparison === 'same') 
                ? 'App is up to date.' 
                : 'App is running a newer build.';

            return response()->json([
                'status' => true,
                'force_update' => false,
                'can_proceed' => true,
                'message' => $message,
                'data' => [
                    'app_type' => $appType,
                    'comparison' => $comparison,
                    'can_proceed' => true,
                    'force_update' => false,
                    'client_version' => $clientVersion,
                    'client_build_number' => $clientBuild,
                    'current_version' => $currentVersion,
                    'current_build_number' => $currentBuild,
                ],
            ]);
        }

        return response()->json([
            'status' => false,
            'force_update' => true,
            'can_proceed' => false,
            'message' => 'Update required. Please update your app to continue.',
            'data' => [
                'app_type' => $appType,
                'comparison' => $comparison,
                'can_proceed' => false,
                'force_update' => true,
                'client_version' => $clientVersion,
                'client_build_number' => $clientBuild,
                'current_version' => $currentVersion,
                'current_build_number' => $currentBuild,
            ],
        ]);
    }
}
