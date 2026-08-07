<?php

namespace App\Http\Controllers\Api;

use App\Models\AppContent;

class AppContentController extends CrudController
{
    protected string $model = AppContent::class;
    protected string $searchColumn = 'title';
    protected array $rules = ['type'=>['required','string','max:100'],'title'=>['required','string','max:255'],'subtitle'=>['nullable','string','max:255'],'body'=>['nullable','string'],'image'=>['nullable','string'],'button_text'=>['nullable','string','max:100'],'button_url'=>['nullable','string'],'sort_order'=>['nullable','integer'],'status'=>['nullable','string','max:50'],'metadata'=>['nullable','array']];

    public function uploadMedia(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $file = $request->file('file');
        $directory = 'uploads/media';
        $filename = $file->hashName();
        $destination = public_path($directory);

        if (! is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $file->move($destination, $filename);

        return response()->json([
            'success' => true,
            'url' => url('/'.$directory.'/'.$filename),
        ]);
    }
}
