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

    /**
     * Public Contact Us inquiry submission.
     * Creates a support ticket and sends emails to both customer (if email provided) and admin.
     */
    public function submitContactInquiry(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'query_type' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $ticketNo = $this->nextTicketNo();

        $ticket = SupportTicket::create([
            'ticket_no' => $ticketNo,
            'name' => $data['name'],
            'type' => $data['query_type'],
            'subject' => 'Contact Inquiry: ' . $data['query_type'],
            'priority' => 'Medium',
            'status' => 'Open',
            'metadata' => [
                'source' => 'contact_us_page',
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'description' => $data['message'],
                'query_type' => $data['query_type'],
            ],
        ]);

        $fresh = $ticket->fresh();
        $customerEmailSent = false;
        $adminEmailSent = false;

        // 1. Send confirmation email to Customer (if email provided)
        if (!empty($data['email'])) {
            try {
                $this->passwordMailer->sendContactInquiryCustomerConfirmation(
                    $data['email'],
                    $data['name'],
                    $fresh->ticket_no,
                    $data['query_type'],
                    $data['phone'],
                    $data['message']
                );
                $customerEmailSent = true;
            } catch (\Throwable $e) {
                Log::warning('Contact inquiry customer email failed', [
                    'ticket_no' => $fresh->ticket_no,
                    'email' => $data['email'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // 2. Send inquiry alert to Admin / Support team
        try {
            $adminEmail = \App\Models\Setting::where('group', 'contact')->where('key', 'email')->value('value')
                ?: \App\Models\AdminUser::where('status', 'Active')->whereNotNull('email')->value('email')
                ?: config('mail.from.address')
                ?: 'support@rehanshi.com';

            if ($adminEmail) {
                $this->passwordMailer->sendContactInquiryAdminNotification(
                    $adminEmail,
                    $data['name'],
                    $data['email'] ?? 'Not provided',
                    $data['phone'],
                    $fresh->ticket_no,
                    $data['query_type'],
                    $data['message']
                );
                $adminEmailSent = true;
            }
        } catch (\Throwable $e) {
            Log::warning('Contact inquiry admin email failed', [
                'ticket_no' => $fresh->ticket_no,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you! Your query has been submitted successfully (Ticket #' . $fresh->ticket_no . ').',
            'ticket_no' => $fresh->ticket_no,
            'ticket' => $fresh,
            'customer_email_sent' => $customerEmailSent,
            'admin_email_sent' => $adminEmailSent,
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
