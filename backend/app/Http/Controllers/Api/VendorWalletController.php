<?php

namespace App\Http\Controllers\Api;

use App\Models\VendorWallet;
use Illuminate\Http\Request;

class VendorWalletController extends CrudController
{
    protected string $model = VendorWallet::class;
    protected string $searchColumn = 'partner_name';
    protected array $rules = ['partner_id'=>['nullable','exists:partners,id'],'partner_name'=>['required','string','max:255'],'online_earning'=>['nullable','numeric'],'cash_collected'=>['nullable','numeric'],'company_commission'=>['nullable','numeric'],'vendor_payable'=>['nullable','numeric'],'company_due'=>['nullable','numeric'],'settlement'=>['nullable','string','max:100'],'metadata'=>['nullable','array']];

    public function index(Request $request)
    {
        $query = VendorWallet::query()->latest('id');

        if ($request->filled('partner_id')) {
            $query->where('partner_id', $request->integer('partner_id'));
        }

        if ($request->filled('q')) {
            $query->where('partner_name', 'like', '%'.$request->string('q').'%');
        }

        $perPageParam = $request->input('per_page');
        if ($perPageParam === 'all' || (int) $perPageParam === -1 || $request->boolean('all')) {
            $items = $query->get();
            return response()->json([
                'data' => $items,
                'total' => $items->count(),
                'per_page' => $items->count(),
                'current_page' => 1,
                'last_page' => 1,
            ]);
        }

        return response()->json($query->paginate(max(1, (int) $request->integer('per_page', 25))));
    }
}
