<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['group', 'key', 'value', 'type', 'metadata'];

    protected $casts = ['metadata' => 'array'];

    /**
     * Keys in metadata that must never be exposed to frontend responses.
     */
    protected static array $sensitiveMetadataKeys = [
        'secret_key',
        'salt_key',
        'salt_index',
        'client_secret',
        'private_key',
        'key_secret',
        'api_secret',
        'webhook_secret',
        'password',
        'smtp_password',
        'auth_token',
        'token_secret',
        'private_token',
        'auth_key',
        'access_token',
        'merchant_id',
        'secret',
    ];

    /**
     * Sanitizes metadata by removing all private / secret credentials.
     */
    public static function sanitizeMetadata(?array $metadata): array
    {
        if (! is_array($metadata)) {
            return [];
        }

        foreach (self::$sensitiveMetadataKeys as $sensitiveKey) {
            unset($metadata[$sensitiveKey]);
        }

        return $metadata;
    }

    /**
     * Returns a safe array representation suitable for public / web client consumption.
     */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'group' => $this->group,
            'key' => $this->key,
            'value' => $this->value,
            'type' => $this->type,
            'metadata' => self::sanitizeMetadata($this->metadata),
        ];
    }
}

