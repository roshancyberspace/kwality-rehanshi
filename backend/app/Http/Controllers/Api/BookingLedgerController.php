<?php

namespace App\Http\Controllers\Api;

use App\Models\BookingLedger;

class BookingLedgerController extends CrudController
{
    protected string $model = BookingLedger::class;
    protected string $searchColumn = 'ledger_no';
    protected array $rules = ['ledger_no'=>['nullable','string','max:100'],'booking_id'=>['nullable','exists:bookings,id'],'booking_no'=>['nullable','string','max:100'],'partner_name'=>['nullable','string','max:255'],'method'=>['nullable','string','max:100'],'gross'=>['nullable','numeric'],'commission'=>['nullable','numeric'],'vendor_amount'=>['nullable','numeric'],'company_due'=>['nullable','numeric'],'status'=>['nullable','string','max:100'],'metadata'=>['nullable','array']];
}
