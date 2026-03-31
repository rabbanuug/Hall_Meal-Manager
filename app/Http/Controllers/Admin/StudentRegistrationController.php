<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\MemberWelcomeMail;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;
use Inertia\Inertia;

class StudentRegistrationController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $hallId = $user->hall_id;
        $search = $request->input('search');

        if ($user->role === 'super_admin') {
            $hallId = $request->query('hall_id', \App\Models\Hall::first()?->id);
        }

        $query = Student::with('user')
            ->join('users', 'students.user_id', '=', 'users.id')
            ->where('users.hall_id', $hallId)
            ->select('students.*');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('students.student_id', 'like', "%{$search}%")
                    ->orWhere('users.name', 'like', "%{$search}%")
                    ->orWhere('users.unique_id', 'like', "%{$search}%");
            });
        }

        $students = $query->orderBy('users.unique_id', 'asc')->get()->map(function ($student) {
            return [
                'id' => $student->id,
                'user_id' => $student->user_id,
                'student_id' => $student->student_id,
                'name' => $student->user->name,
                'unique_id' => $student->user->unique_id,
                'status' => $student->user->status,
                'email' => $student->user->email,
                'user_type' => 'student',
                'department' => $student->department,
                'batch' => $student->batch,
                'room_number' => $student->room_number,
                'meat_preference' => $student->meat_preference,
                'balance' => $student->balance,
            ];
        });

        return Inertia::render('admin/student-list', [
            'students' => $students,
            'filters' => ['search' => $search, 'hall_id' => $hallId],
            'halls' => $user->role === 'super_admin' ? \App\Models\Hall::all() : [],
            'selectedHallId' => (int) $hallId,
            'memberType' => 'student',
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/register-student', [
            'halls' => auth()->user()->role === 'super_admin' ? \App\Models\Hall::all() : []
        ]);
    }

    private function generateUniqueId($hallId)
    {
        $hall = \App\Models\Hall::find($hallId);
        $prefix = $hall->prefix ?? 'MID';

        // Find the last unique_id with this prefix
        $lastUser = User::where('hall_id', $hallId)
            ->where('unique_id', 'LIKE', "{$prefix}-%")
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastUser && preg_match('/-(\d+)$/', $lastUser->unique_id, $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        }

        return $prefix . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users',
            'student_id' => 'required|string|max:255|unique:students',
            'department' => 'required|string|max:255',
            'batch' => 'required|string|max:255',
            'room_number' => 'required|string|max:255',
            'meat_preference' => 'required|in:beef,mutton',
            'hall_id' => 'nullable|exists:halls,id',
            'use_id_as_password' => 'boolean',
        ]);

        $password = $request->use_id_as_password ? $request->student_id : Str::random(8);
        $hallId = auth()->user()->role === 'super_admin' ? ($request->hall_id ?: auth()->user()->hall_id) : auth()->user()->hall_id;

        // Generate Unique ID
        // Note: Race condition possible here strictly speaking, but acceptable for now.
        $uniqueId = $this->generateUniqueId($hallId);

        try {
            DB::transaction(function () use ($request, $password, $hallId, $uniqueId) {
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($password),
                    'hall_id' => $hallId,
                    'role' => 'student',
                    'user_type' => 'student',
                    'unique_id' => $uniqueId,
                ]);

                $user->student()->create([
                    'student_id' => $request->student_id,
                    'department' => $request->department,
                    'batch' => $request->batch,
                    'room_number' => $request->room_number,
                    'meat_preference' => $request->meat_preference,
                    'balance' => 0,
                ]);

                if ($user->email) {
                    Mail::to($user->email)->send(new MemberWelcomeMail($user, $password));
                }
            });

            return redirect()->route('admin.students.index')->with('success', 'Student registered successfully. Password: ' . ($request->use_id_as_password ? 'Same as ID' : $password));

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Student registration failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Registration failed. ' . $e->getMessage()])->withInput();
        }
    }

    public function validateBulk(Request $request)
    {
        $request->validate([
            'student_ids' => 'required|array',
        ]);

        $existingIds = Student::whereIn('student_id', $request->student_ids)
            ->pluck('student_id')
            ->toArray();

        return response()->json([
            'existing_ids' => $existingIds
        ]);
    }

    public function bulkStore(Request $request)
    {
        $request->validate([
            'students' => 'required|array|min:1',
            'students.*.student_id' => 'required|string',
            'students.*.name' => 'required|string',
            'students.*.department' => 'required|string',
            'students.*.batch' => 'required|string',
            'students.*.room_number' => 'required|string',
            'hall_id' => 'nullable|exists:halls,id',
        ]);

        $currentUserHallId = auth()->user()->hall_id;

        try {
            DB::transaction(function () use ($request, $currentUserHallId) {
                // Determine the hall for this batch
                $hallId = $request->hall_id ?: (auth()->user()->role === 'super_admin' ? ($request->students[0]['hall_id'] ?? $currentUserHallId) : $currentUserHallId);
                
                if (!$hallId) {
                    throw new \Exception("Hall ID not specified for the operation.");
                }

                $hall = \App\Models\Hall::findOrFail($hallId);
                $prefix = $hall->prefix ?? 'MID';

                $lastUser = User::where('hall_id', $hallId)
                    ->where('unique_id', 'LIKE', "{$prefix}-%")
                    ->orderBy('id', 'desc')
                    ->first();

                $currentSequence = 0;
                if ($lastUser && preg_match('/-(\d+)$/', $lastUser->unique_id, $matches)) {
                    $currentSequence = intval($matches[1]);
                }

                foreach ($request->students as $data) {
                    if (Student::where('student_id', $data['student_id'])->exists()) {
                        continue;
                    }

                    $currentSequence++;
                    $uniqueId = $prefix . '-' . str_pad($currentSequence, 3, '0', STR_PAD_LEFT);

                    $targetHallId = auth()->user()->role === 'super_admin' ? ($data['hall_id'] ?? $hallId) : $hallId;

                    // If mixed halls, this logic breaks. Assuming single hall batch.
                    // If targetHallId != hallId, we should recalculate sequence on the fly or group.
                    // For now, assume consistent hall_id in batch.

                    $user = User::create([
                        'name' => $data['name'],
                        'email' => null,
                        'password' => Hash::make($data['student_id']),
                        'hall_id' => $targetHallId,
                        'role' => 'student',
                        'user_type' => 'student',
                        'unique_id' => $uniqueId,
                    ]);

                    $user->student()->create([
                        'student_id' => $data['student_id'],
                        'department' => $data['department'],
                        'batch' => $data['batch'],
                        'room_number' => $data['room_number'],
                        'meat_preference' => $data['meat_preference'] ?? 'beef',
                        'balance' => 0,
                    ]);
                }
            });
            return redirect()->route('admin.students.index')->with('success', 'Bulk registration completed.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Bulk registration failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Bulk registration failed. ' . $e->getMessage()]);
        }
    }

    public function exportPdf(Request $request)
    {
        $user = auth()->user();
        $hallId = $user->hall_id;
        $search = $request->input('search');

        if ($user->role === 'super_admin') {
            $hallId = $request->query('hall_id', \App\Models\Hall::first()?->id);
        }

        $hall = \App\Models\Hall::findOrFail($hallId);

        $query = Student::with('user')
            ->join('users', 'students.user_id', '=', 'users.id')
            ->where('users.hall_id', $hallId)
            ->select('students.*');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('students.student_id', 'like', "%{$search}%")
                    ->orWhere('users.name', 'like', "%{$search}%")
                    ->orWhere('users.unique_id', 'like', "%{$search}%");
            });
        }

        $students = $query->orderBy('users.unique_id', 'asc')->get();

        $pdf = Pdf::loadView('pdf.student-list', [
            'students' => $students,
            'hall' => $hall,
            'date' => now()->format('d/m/Y'),
        ]);

        return $pdf->download('Student-List-' . ($hall->name ?? 'All') . '.pdf');
    }

    public function update(Request $request, Student $student)
    {
        $user = auth()->user();
        if ($user->role !== 'super_admin' && $student->user->hall_id !== $user->hall_id) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users,email,' . $student->user_id,
            'student_id' => 'required|string|max:255|unique:students,student_id,' . $student->id,
            'department' => 'required|string|max:255',
            'batch' => 'required|string|max:255',
            'room_number' => 'required|string|max:255',
            'meat_preference' => 'required|in:beef,mutton',
        ]);

        DB::transaction(function () use ($request, $student) {
            $student->user->update([
                'name' => $request->name,
                'email' => $request->email,
            ]);

            $student->update([
                'student_id' => $request->student_id,
                'department' => $request->department,
                'batch' => $request->batch,
                'room_number' => $request->room_number,
                'meat_preference' => $request->meat_preference,
            ]);
        });

        return redirect()->route('admin.students.index')->with('success', 'Student updated successfully.');
    }
}
