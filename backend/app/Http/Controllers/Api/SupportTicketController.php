<?php

namespace App\Http\Controllers\Api;

use App\Models\SupportTicket;

class SupportTicketController extends CrudController
{
    protected string $model = SupportTicket::class;
    protected string $searchColumn = 'ticket_no';
    protected array $rules = ['ticket_no'=>['nullable','string','max:100'],'name'=>['required','string','max:255'],'type'=>['nullable','string','max:100'],'subject'=>['required','string','max:255'],'priority'=>['nullable','string','max:50'],'status'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];

    protected function validatedData(\Illuminate\Http\Request $request): array
    {
        $data = parent::validatedData($request);

        if ($request->isMethod('post') && empty($data['ticket_no'])) {
            do {
                $ticketNo = 'TIC-' . random_int(10000, 99999);
            } while (\App\Models\SupportTicket::where('ticket_no', $ticketNo)->exists());

            $data['ticket_no'] = $ticketNo;
        }

        return $data;
    }
}
