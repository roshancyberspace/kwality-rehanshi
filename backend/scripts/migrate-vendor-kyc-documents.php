<?php

/**
 * One-time migration: move legacy vendor KYC files into public/documents
 * and normalize partner document paths in the database.
 *
 * Run: php scripts/migrate-vendor-kyc-documents.php
 */

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Partner;
use Illuminate\Support\Facades\File;

$legacyRoots = [
    storage_path('app/public/vendor-kyc'),
    storage_path('app/public/documents/vendor-kyc'),
];
$targetRoot = public_path('documents/vendor-kyc');

if (! is_dir($targetRoot)) {
    mkdir($targetRoot, 0755, true);
}

$copied = 0;
$skipped = 0;

foreach ($legacyRoots as $root) {
    if (! is_dir($root)) {
        continue;
    }

    foreach (File::files($root) as $file) {
        $destination = $targetRoot.DIRECTORY_SEPARATOR.$file->getFilename();
        if (is_file($destination)) {
            $skipped++;
            continue;
        }

        File::copy($file->getPathname(), $destination);
        $copied++;
        echo "Copied {$file->getFilename()}\n";
    }
}

// Also copy any loose files under storage/app/public/documents into public/documents
$legacyDocumentsRoot = storage_path('app/public/documents');
$publicDocumentsRoot = public_path('documents');
if (is_dir($legacyDocumentsRoot)) {
    foreach (File::files($legacyDocumentsRoot) as $file) {
        $destination = $publicDocumentsRoot.DIRECTORY_SEPARATOR.$file->getFilename();
        if (is_file($destination)) {
            $skipped++;
            continue;
        }

        File::copy($file->getPathname(), $destination);
        $copied++;
        echo "Copied document {$file->getFilename()}\n";
    }
}

$normalizePath = static function (?string $path): ?string {
    if ($path === null || $path === '') {
        return $path;
    }

    $clean = ltrim(str_replace('\\', '/', $path), '/');

    if (str_starts_with($clean, 'storage/')) {
        $clean = substr($clean, strlen('storage/'));
    }

    if (str_starts_with($clean, 'vendor-kyc/')) {
        return 'documents/'.$clean;
    }

    return $clean;
};

$updatedPartners = 0;
$pathUpdates = 0;

foreach (Partner::query()->cursor() as $partner) {
    $changed = false;
    $updates = [];

    $aadhaar = $normalizePath($partner->aadhaar_document);
    if ($aadhaar !== $partner->aadhaar_document) {
        $updates['aadhaar_document'] = $aadhaar;
        $changed = true;
        $pathUpdates++;
    }

    $pan = $normalizePath($partner->pan_document);
    if ($pan !== $partner->pan_document) {
        $updates['pan_document'] = $pan;
        $changed = true;
        $pathUpdates++;
    }

    $documents = $partner->documents;
    if (is_array($documents)) {
        $nextDocuments = [];
        foreach ($documents as $document) {
            if (! is_array($document)) {
                $nextDocuments[] = $document;
                continue;
            }

            $normalized = $normalizePath($document['path'] ?? null);
            if ($normalized !== ($document['path'] ?? null)) {
                $document['path'] = $normalized;
                $changed = true;
                $pathUpdates++;
            }
            $nextDocuments[] = $document;
        }

        if ($changed) {
            $updates['documents'] = $nextDocuments;
        }
    }

    if ($changed) {
        $partner->update($updates);
        $updatedPartners++;
        echo "Updated partner #{$partner->id}\n";
    }
}

echo "\nDone. Files copied: {$copied}, already present: {$skipped}, partners updated: {$updatedPartners}, path fields updated: {$pathUpdates}\n";
