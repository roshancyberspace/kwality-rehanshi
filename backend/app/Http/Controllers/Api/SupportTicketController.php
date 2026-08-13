<?php

namespace App\Http\Controllers\Api;

use App\Models\SupportTicket;
use App\Support\CustomerPasswordMailer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupportTicketController extends CrudController
{
    public function __construct(private CustomerPasswordMailer $passwordMailer)
    {
    }

    protected string $model = SupportTicket::class;

    protected string $searchColumn = 'ticket_no';

    protected array $rules = [
        'ticket_no' => ['nullable', 'string', 'max:100'],
        'name' => ['required', 'string', 'max:255'],
        'type' => ['nullable', 'string', 'max:100'],
        'subject' => ['required', 'string', 'max:255'],
        'priority' => ['nullable', 'string', 'max:50'],
        'status' => ['nullable', 'string', 'max:50'],
        'metadata' => ['nullable', 'array'],
        'description' => ['nullable', 'string', 'max:5000'],
        'phone' => ['nullable', 'string', 'max:50'],
        'email' => ['nullable', 'email', 'max:255'],
        'image' => ['nullable'],
    ];

    protected function getSearchableColumns(): array
    {
        return ['ticket_no', 'name', 'type', 'subject', 'status', 'priority'];
    }

    protected function validatedData(Request $request): array
    {
        $data = parent::validatedData($request);

        if ($request->isMethod('post') && empty($data['ticket_no'])) {
            $data['ticket_no'] = $this->nextTicketNo();
        }

        $metadata = is_array($data['metadata'] ?? null) ? $data['metadata'] : [];

        foreach (['description', 'phone', 'email'] as $metaField) {
            if (array_key_exists($metaField, $data) && $data[$metaField] !== null && $data[$metaField] !== '') {
                $metadata[$metaField] = $data[$metaField];
            }
            unset($data[$metaField]);
        }

        if (! empty($data['image']) && is_string($data['image'])) {
            $metadata['image'] = $data['image'];
        }
        unset($data['image']);

        $data['metadata'] = $metadata;

        return $data;
    }

    /**
     * Authenticated customer raises a support ticket from profile.
     * Name / phone / email are taken from the auth token customer — not trusted from client.
     */
    public function raiseFromCustomer(Request $request)
    {
        $customer = $request->user();

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:5000'],
            'image' => ['nullable', 'image', 'max:3072'],
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $directory = 'support-tickets-images';
            $filename = $file->hashName();
            $destination = public_path($directory);
            if (! is_dir($destination)) {
                mkdir($destination, 0755, true);
            }
            $file->move($destination, $filename);
            $imageUrl = url('/'.$directory.'/'.$filename);
        }

        $ticket = SupportTicket::create([
            'ticket_no' => $this->nextTicketNo(),
            'name' => $customer->name ?: 'Customer',
            'type' => $data['type'],
            'subject' => $data['subject'],
            'priority' => 'Medium',
            'status' => 'Open',
            'metadata' => [
                'description' => $data['description'],
                'phone' => $customer->phone,
                'email' => $customer->email,
                'customer_id' => $customer->id,
                'image' => $imageUrl,
                'source' => 'customer_profile',
            ],
        ]);

        $fresh = $ticket->fresh();
        $ackEmail = $customer->email ?: null;
        $emailSent = false;

        if ($ackEmail) {
            try {
                $this->passwordMailer->sendSupportTicketAcknowledgement(
                    $ackEmail,
                    $customer->name ?: 'Customer',
                    $fresh->ticket_no,
                    $fresh->subject,
                    $fresh->type ?: 'Other'
                );
                $emailSent = true;
            } catch (\Throwable $exception) {
                Log::warning('Support ticket acknowledgement email failed', [
                    'ticket_no' => $fresh->ticket_no,
                    'email' => $ackEmail,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return response()->json([
            ...$fresh->toArray(),
            'acknowledgement_email_sent' => $emailSent,
            'acknowledgement_email' => $ackEmail,
        ], 201);
    }

    private function nextTicketNo(): string
    {
        do {
            $ticketNo = 'TIC-'.random_int(10000, 99999);
        } while (SupportTicket::where('ticket_no', $ticketNo)->exists());

        return $ticketNo;
    }
}
