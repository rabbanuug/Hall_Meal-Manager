<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class StudentPasswordController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/student-password/index');
    }

    public function search(Request $request)
    {
        $request->validate([
            'student_id' => 'required|string',
        ]);

        $student = Student::with('user.hall')
            ->where('student_id', $request->student_id)
            ->first();

        if (!$student) {
            return response()->json([
                'exists' => false,
                'message' => 'Student not found.'
            ]);
        }

        return response()->json([
            'exists' => true,
            'user' => $student->user,
            'student' => $student,
            'hall' => $student->user->hall,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'password' => 'required|string|min:6',
        ]);

        $user = User::findOrFail($request->user_id);
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'Student password updated successfully.');
    }
}
