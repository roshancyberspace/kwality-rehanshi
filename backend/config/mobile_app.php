<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Customer Mobile App Version Settings
    |--------------------------------------------------------------------------
    */
    'customer' => [
        'version' => env('CUSTOMER_APP_VERSION', '1.0.0'),
        'build_number' => (int) env('CUSTOMER_APP_BUILD_NUMBER', 1),
    ],

    /*
    |--------------------------------------------------------------------------
    | Vendor / Partner Mobile App Version Settings
    |--------------------------------------------------------------------------
    */
    'vendor' => [
        'version' => env('VENDOR_APP_VERSION', '1.0.0'),
        'build_number' => (int) env('VENDOR_APP_BUILD_NUMBER', 1),
    ],

];
