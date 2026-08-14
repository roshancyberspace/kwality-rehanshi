<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\BookingLedger;
use App\Models\Partner;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BookingLedgerController extends CrudController
{
    protected string $model = BookingLedger::class;

    protected string $searchColumn = 'ledger_no';

    protected array $rules = [
        'ledger_no' => ['nullable', 'string', 'max:100'],
        'booking_id' => ['nullable', 'exists:bookings,id'],
        'booking_no' => ['nullable', 'string', 'max:100'],
        'partner_id' => ['nullable', 'exists:partners,id'],
        'partner_name' => ['nullable', 'string', 'max:255'],
        'method' => ['nullable', 'string', 'max:100'],
        'gross' => ['nullable', 'numeric'],
        'commission' => ['nullable', 'numeric'],
        'vendor_amount' => ['nullable', 'numeric'],
        'company_due' => ['nullable', 'numeric'],
        'status' => ['nullable', 'string', 'max:100'],
        'metadata' => ['nullable', 'array'],
    ];

    public function store(Request $request)
    {
        $item = $this->model::create($this->prepareLedgerData($this->validatedData($request), true));
        $this->clearModelCache();

        return response()->json($item, 201);
    }

    public function update(Request $request, int|string $id)
    {
        $item = $this->model::findOrFail($id);
        $item->update($this->prepareLedgerData($this->validatedData($request), false));
        $this->clearModelCache();

        return response()->json($item);
    }

    private function prepareLedgerData(array $data, bool $isCreate): array
    {
        $partner = ! empty($data['partner_id'])
            ? Partner::find($data['partner_id'])
            : Partner::where('name', $data['partner_name'] ?? '')->first();

        if ($isCreate && ! $partner) {
            throw ValidationException::withMessages([
                'partner_id' => 'Please select a partner.',
            ]);
        }

        if ($isCreate && empty($data['booking_id'])) {
            throw ValidationException::withMessages([
                'booking_id' => 'Please select an unpaid booking.',
            ]);
        }

        if (! empty($data['booking_id'])) {
            $booking = Booking::find($data['booking_id']);
            if (! $booking) {
                throw ValidationException::withMessages([
                    'booking_id' => 'Booking not found.',
                ]);
            }

            if ($partner && ! $this->bookingBelongsToPartner($booking, $partner)) {
                throw ValidationException::withMessages([
                    'booking_id' => 'This booking does not belong to the selected partner.',
                ]);
            }

            if ($isCreate && $this->isPaidBooking($booking)) {
                throw ValidationException::withMessages([
                    'booking_id' => 'Only unpaid bookings can be added to the ledger.',
                ]);
            }

            $data['booking_no'] = $data['booking_no'] ?: $booking->booking_no;
            $data['partner_name'] = $partner?->name ?: ($data['partner_name'] ?: $booking->professional_name);
            $data['method'] = $data['method'] ?: $booking->payment_method;
            if (! isset($data['gross']) || $data['gross'] === '' || $data['gross'] === null) {
                $data['gross'] = $booking->amount;
            }
        } elseif ($partner) {
            $data['partner_name'] = $partner->name;
        }

        unset($data['partner_id']);

        if ($isCreate) {
            $data['ledger_no'] = $this->resolveLedgerNo($data['ledger_no'] ?? null, $data['booking_no'] ?? null);
        }

        return $data;
    }

    private function bookingBelongsToPartner(Booking $booking, Partner $partner): bool
    {
        if ($booking->partner_id) {
            return (int) $booking->partner_id === (int) $partner->id;
        }

        return strcasecmp((string) $booking->professional_name, (string) $partner->name) === 0;
    }

    private function isPaidBooking(Booking $booking): bool
    {
        $status = strtolower((string) ($booking->payment_status ?: data_get($booking->metadata, 'payment_status')));

        return in_array($status, ['paid', 'cash', 'success', 'successful', 'completed'], true);
    }

    private function resolveLedgerNo(?string $submitted, ?string $bookingNo): string
    {
        $preferred = $bookingNo ? 'LED-'.$bookingNo : null;
        if ($preferred && ! BookingLedger::where('ledger_no', $preferred)->exists()) {
            return $preferred;
        }

        if ($submitted && ! BookingLedger::where('ledger_no', $submitted)->exists()) {
            return $submitted;
        }

        do {
            $ledgerNo = 'LED-'.random_int(10000, 99999);
        } while (BookingLedger::where('ledger_no', $ledgerNo)->exists());

        return $ledgerNo;
    }
}
