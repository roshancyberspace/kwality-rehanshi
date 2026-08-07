<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$settings = [
    'enabled' => '1',
    'auto_approve' => '1',
    'delay_minutes' => '0.5',
    'match_area' => '0'
];

foreach ($settings as $k => $v) {
    $s = App\Models\Setting::where('group', 'auto_assignment')->where('key', $k)->first();
    if ($s) {
        $s->value = $v;
        $s->save();
    } else {
        App\Models\Setting::create([
            'group' => 'auto_assignment',
            'key' => $k,
            'value' => $v,
            'type' => ($k == 'delay_minutes' ? 'number' : 'boolean')
        ]);
    }
}
echo "Settings forced successfully.\n";
