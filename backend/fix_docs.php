<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$partners = App\Models\Partner::query()->get(['id', 'aadhaar_document', 'pan_document', 'documents']);

foreach ($partners as $p) {
    echo "ID={$p->id}\n";
    echo 'aadhaar=' . ($p->aadhaar_document ?? 'null') . "\n";
    echo 'pan=' . ($p->pan_document ?? 'null') . "\n";
    if (is_array($p->documents)) {
        foreach ($p->documents as $i => $d) {
            echo "doc[{$i}]=" . ($d['path'] ?? 'no-path') . "\n";
        }
    }
    echo "---\n";
}
