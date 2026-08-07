<?php

namespace App\Http\Controllers\Api;

use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReviewController extends CrudController
{
    protected string $model = Review::class;
    protected string $searchColumn = 'customer_name';
    protected array $rules = ['customer_name'=>['required','string','max:255'],'partner_name'=>['nullable','string','max:255'],'service_name'=>['nullable','string','max:255'],'rating'=>['required','numeric'],'text'=>['nullable','string'],'reviewed_at'=>['nullable','date'],'status'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $direction = data_get($data, 'metadata.direction');
        $booking = $this->bookingFromReviewData($data);

        if ($booking && $direction && ! empty(data_get($booking->metadata, "reviews.$direction"))) {
            throw ValidationException::withMessages([
                'review' => ['Review is already submitted for this order.'],
            ]);
        }

        $record = Review::create($data);

        if ($booking && $direction) {
            $metadata = $booking->metadata ?? [];
            $metadata['reviews'] = [
                ...($metadata['reviews'] ?? []),
                $direction => [
                    'id' => $record->id,
                    'rating' => (float) $record->rating,
                    'text' => $record->text,
                    'reviewed_at' => optional($record->reviewed_at)->toDateString() ?: now()->toDateString(),
                    'status' => $record->status,
                ],
            ];

            $booking->update(['metadata' => $metadata]);
        }

        return response()->json($record->fresh(), 201);
    }

    private function bookingFromReviewData(array $data): ?Booking
    {
        $bookingId = data_get($data, 'metadata.booking_id');
        $bookingNo = data_get($data, 'metadata.booking_no');

        return Booking::query()
            ->when($bookingId, fn ($query) => $query->whereKey($bookingId))
            ->when(! $bookingId && $bookingNo, fn ($query) => $query->where('booking_no', $bookingNo))
            ->first();
    }
}
