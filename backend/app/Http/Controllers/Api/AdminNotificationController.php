<?php

namespace App\Http\Controllers\Api;

use App\Models\AdminNotification;
use Illuminate\Http\Request;

class AdminNotificationController extends CrudController
{
    protected string $model = AdminNotification::class;
    protected string $searchColumn = 'title';
    protected array $rules = ['channel'=>['required','string','max:50'],'audience'=>['required','string','max:100'],'title'=>['required','string','max:255'],'message'=>['required','string'],'status'=>['nullable','string','max:50'],'sent_at'=>['nullable','date'],'read_at'=>['nullable','date'],'metadata'=>['nullable','array']];

    public function summary(Request $request)
    {
        $notifications = AdminNotification::query()
            ->latest('id')
            ->limit((int) $request->integer('limit', 8))
            ->get();

        return response()->json([
            'unread_count' => AdminNotification::whereNull('read_at')->count(),
            'notifications' => $notifications,
        ]);
    }

    public function markAllRead()
    {
        AdminNotification::whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([
            'unread_count' => 0,
            'message' => 'Notifications marked as read',
        ]);
    }
}
