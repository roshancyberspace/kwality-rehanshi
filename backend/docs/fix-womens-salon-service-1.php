<?php

$mysqli = new mysqli('127.0.0.1', 'root', '', 'rehanshi');
if ($mysqli->connect_error) {
    fwrite(STDERR, 'DB connection failed: '.$mysqli->connect_error.PHP_EOL);
    exit(1);
}
$mysqli->set_charset('utf8mb4');

$imageDir = dirname(__DIR__).DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'service-packages-images';
if (! is_dir($imageDir) && ! mkdir($imageDir, 0755, true) && ! is_dir($imageDir)) {
    fwrite(STDERR, 'Could not create '.$imageDir.PHP_EOL);
    exit(1);
}

$mysqli->query("
    UPDATE service_packages SET sub_service_id = 1
    WHERE service_id = 1 AND sub_service_id = 61
");
$mysqli->query("
    UPDATE service_packages SET sub_service_id = 6
    WHERE service_id = 1 AND sub_service_id IN (62, 63, 64)
");
$mysqli->query("
    UPDATE service_packages SET sub_service_id = 1
    WHERE service_id = 1 AND sub_service_id = 65
");
$mysqli->query("
    UPDATE service_packages SET sub_service_id = 3
    WHERE service_id = 1 AND sub_service_id = 60
");

$mysqli->query("
    UPDATE service_packages SET category_key = 'd-tan'
    WHERE service_id = 1 AND category_key IN ('de-tan')
");
$mysqli->query("
    UPDATE service_packages SET category_key = 'manicure-pedicure'
    WHERE service_id = 1 AND category_key IN ('pedicure-manicure', 'manicure', 'pedicure')
");
$mysqli->query("
    UPDATE service_packages
    SET name = 'Spatula Waxing – Full Arms & Legs + Underarms'
    WHERE id = 521 AND service_id = 1
");

$mysqli->query("
    UPDATE sub_services
    SET status = 'Inactive'
    WHERE service_id = 1 AND id IN (60, 61, 62, 63, 64, 65)
");

$sources = [
    'waxing' => 'https://images.pexels.com/photos/3997373/pexels-photo-3997373.jpeg?auto=compress&cs=tinysrgb&w=900',
    'threading' => 'https://images.pexels.com/photos/3993447/pexels-photo-3993447.jpeg?auto=compress&cs=tinysrgb&w=900',
    'd-tan' => 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=900',
    'bleach' => 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=900',
    'korean-facials' => 'https://images.pexels.com/photos/3764013/pexels-photo-3764013.jpeg?auto=compress&cs=tinysrgb&w=900',
    'facial' => 'https://images.pexels.com/photos/3997989/pexels-photo-3997989.jpeg?auto=compress&cs=tinysrgb&w=900',
    'face-cleanup' => 'https://images.pexels.com/photos/3738388/pexels-photo-3738388.jpeg?auto=compress&cs=tinysrgb&w=900',
    'manicure-pedicure' => 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg?auto=compress&cs=tinysrgb&w=900',
    'hair-cut-styling' => 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=900',
];

$localByKey = [];
foreach ($sources as $key => $url) {
    $filename = $key.'.jpg';
    $path = $imageDir.DIRECTORY_SEPARATOR.$filename;
    if (! is_file($path) || filesize($path) < 1000) {
        $data = @file_get_contents($url, false, stream_context_create([
            'http' => [
                'timeout' => 30,
                'header' => "User-Agent: Mozilla/5.0 RehanshiImageSync\r\n",
            ],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
        ]));
        if ($data === false || strlen($data) < 1000) {
            fwrite(STDERR, "Failed download for {$key}: {$url}\n");
            continue;
        }
        file_put_contents($path, $data);
        echo "Downloaded {$filename} (".strlen($data)." bytes)\n";
    } else {
        echo "Using existing {$filename}\n";
    }
    $localByKey[$key] = '/service-packages-images/'.$filename;
}

$result = $mysqli->query("
    SELECT id, category_key, name, image
    FROM service_packages
    WHERE service_id = 1
      AND (image IS NULL OR image = '')
");

$updated = 0;
while ($row = $result->fetch_assoc()) {
    $key = $row['category_key'] ?: 'facial';
    $path = $localByKey[$key] ?? $localByKey['facial'] ?? null;
    if (! $path) {
        continue;
    }
    $stmt = $mysqli->prepare('UPDATE service_packages SET image = ?, updated_at = NOW() WHERE id = ? AND service_id = 1');
    $id = (int) $row['id'];
    $stmt->bind_param('si', $path, $id);
    $stmt->execute();
    $stmt->close();
    $updated++;
}

echo "Packages image updated: {$updated}\n";

$check = $mysqli->query("
    SELECT ss.id, ss.name, ss.status, COUNT(p.id) pkgs
    FROM sub_services ss
    LEFT JOIN service_packages p ON p.sub_service_id = ss.id AND p.service_id = 1
    WHERE ss.service_id = 1
    GROUP BY ss.id, ss.name, ss.status
    ORDER BY ss.id
");
echo "\nSub-services after remap:\n";
while ($row = $check->fetch_assoc()) {
    echo "{$row['id']}\t{$row['status']}\t{$row['pkgs']}\t{$row['name']}\n";
}

$missing = $mysqli->query("SELECT COUNT(*) c FROM service_packages WHERE service_id = 1 AND (image IS NULL OR image = '')")->fetch_assoc();
echo "Packages still missing images: {$missing['c']}\n";

$mysqli->close();
