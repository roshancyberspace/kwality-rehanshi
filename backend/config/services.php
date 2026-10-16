<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sms' => [
        'url' => env('SMS_API_URL', 'http://sms.clicksms.co.in/api/mt/SendSMS'),
        'key' => env('SMS_API_KEY'),
        'user' => env('SMS_USER'),
        'password' => env('SMS_PASSWORD'),
        'sender' => env('SMS_SENDER_ID', 'REHTCH'),
        'dlt_template_id' => env('SMS_DLT_TEMPLATE_ID'),
        'telemarketer_id' => env('SMS_TELEMARKETER_ID'),
        'peid' => env('SMS_PEID'),
        'route' => env('SMS_ROUTE', '06'),
    ],

    'fcm' => [
        'server_key' => env('FCM_SERVER_KEY'),
        'credentials_path' => env('FCM_CREDENTIALS_PATH', storage_path('app/firebase-credentials.json')),
    ],

];
