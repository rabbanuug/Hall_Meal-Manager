<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MealBooking;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ManualBookingController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $hallId = $user->hall_id;

        $teachers = \App\Models\Teacher::with('user')
            ->whereHas('user', fn($q) => $q->where('hall_id', $hallId))
            ->get()
            ->map(fn($t) => [
                'id' => $t->user_id,
                'name' => $t->user->name,
                'teacher_id' => $t->teacher_id,
                'department' => $t->department,
                'balance' => $t->balance,
                'status' => $t->user->status,
                'hall' => $t->user->hall?->name,
            ]);

        $staff = \App\Models\Staff::with('user')
            ->whereHas('user', fn($q) => $q->where('hall_id', $hallId))
            ->get()
            ->map(fn($s) => [
                'id' => $s->user_id,
                'name' => $s->user->name,
                'staff_id' => $s->staff_id,
                'designation' => $s->designation,
                'balance' => $s->balance,
                'status' => $s->user->status,
                'hall' => $s->user->hall?->name,
            ]);

        return Inertia::render('admin/manual-booking/index', [
            'teachers' => $teachers,
            'staff' => $staff,
        ]);
    }

    public function searchStudent(Request $request)
    {
        $request->validate([
            'student_id' => 'required|string',
        ]);

        $query = Student::with('user.hall')
            ->where('student_id', $request->student_id);

        if (auth()->user()->role === 'hall_admin') {
            $query->whereHas('user', function ($q) {
                $q->where('hall_id', auth()->user()->hall_id);
            });
        }

        $student = $query->first();

        if (!$student) {
            return response()->json([
                'exists' => false,
                'message' => 'Student not found.'
            ]);
        }

        return response()->json([
            'exists' => true,
            'student' => $student,
            'user' => $student->user,
            'hall' => $student->user->hall,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'breakfast' => 'required|integer|min:0|max:10',
            'lunch' => 'required|integer|min:0|max:10',
            'dinner' => 'required|integer|min:0|max:10',
        ]);

        $user = User::findOrFail($request->user_id);
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);

        DB::transaction(function () use ($request, $startDate, $endDate, $user) {
            $tomorrow = Carbon::tomorrow()->toDateString();
            $isLateForTomorrow = now()->hour >= 22;

            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                $dateString = $date->toDateString();

                // Skip tomorrow if it's after 10 PM
                if ($dateString === $tomorrow && $isLateForTomorrow) {
                    continue;
                }

                $meals = [
                    'breakfast' => $request->breakfast,
                    'lunch' => $request->lunch,
                    'dinner' => $request->dinner,
                ];

                foreach ($meals as $type => $qty) {
                    if ($qty > 0) {
                        MealBooking::updateOrCreate(
                            [
                                'user_id' => $user->id,
                                'meal_type' => $type,
                                'booking_date' => $dateString,
                            ],
                            [
                                'hall_id' => $user->hall_id,
                                'quantity' => $qty,
                                'price' => 0,
                            ]
                        );
                    } else {
                        MealBooking::where('user_id', $user->id)
                            ->where('meal_type', $type)
                            ->where('booking_date', $dateString)
                            ->delete();
                    }
                }
            }
        });

        return back()->with('success', 'Manual booking completed. Note: Tomorrow\'s meals are skipped if it\'s after 10 PM.');
    }
}
