<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MealBooking;
use App\Models\Hall;
use Carbon\Carbon;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class MealRequestController extends Controller
{
    public function index(\Illuminate\Http\Request $request)
    {
        $user = auth()->user();
        $hallId = $user->hall_id;

        // For super admin, allow viewing a specific hall via query param, or default to first hall if none selected
        if ($user->role === 'super_admin') {
            $hallId = $request->query('hall_id', \App\Models\Hall::first()?->id);
        }

        $today = Carbon::today()->toDateString();
        $tomorrow = Carbon::tomorrow()->toDateString();

        $data = [];

        foreach ([$today, $tomorrow] as $date) {
            $mealRequests = MealBooking::with(['user.student', 'user.teacher', 'user.staff'])
                ->where('hall_id', $hallId)
                ->where('booking_date', $date)
                ->get()
                ->map(function ($booking) {
                    $user = $booking->user;
                    $profile = null;
                    $memberId = 'N/A';
                    $preference = 'beef';

                    if ($user->user_type === 'student' && $user->student) {
                        $profile = $user->student;
                        $memberId = $profile->student_id;
                        $preference = $profile->meat_preference;
                    } elseif ($user->user_type === 'teacher' && $user->teacher) {
                        $profile = $user->teacher;
                        $memberId = $profile->teacher_id;
                        $preference = $profile->meat_preference;
                    } elseif ($user->user_type === 'staff' && $user->staff) {
                        $profile = $user->staff;
                        $memberId = $profile->staff_id;
                        $preference = $profile->meat_preference;
                    }

                    return [
                        'id' => $booking->id,
                        'user' => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'member_id' => $memberId,
                            'meat_preference' => $preference,
                            'user_type' => $user->user_type,
                        ],
                        'quantity' => $booking->quantity,
                        'meal_type' => $booking->meal_type,
                    ];
                });

            $summary = MealBooking::where('hall_id', $hallId)
                ->where('booking_date', $date)
                ->selectRaw('meal_type, sum(quantity) as total_quantity')
                ->groupBy('meal_type')
                ->get();

            $meatSummary = MealBooking::join('users', 'meal_bookings.user_id', '=', 'users.id')
                ->leftJoin('students', 'users.id', '=', 'students.user_id')
                ->leftJoin('teachers', 'users.id', '=', 'teachers.user_id')
                ->leftJoin('staff', 'users.id', '=', 'staff.user_id')
                ->where('meal_bookings.hall_id', $hallId)
                ->where('meal_bookings.booking_date', $date)
                ->selectRaw('meal_bookings.meal_type, COALESCE(students.meat_preference, teachers.meat_preference, staff.meat_preference) as meat_preference, sum(meal_bookings.quantity) as count')
                ->groupBy('meal_bookings.meal_type', 'meat_preference')
                ->get()
                ->groupBy('meal_type');

            $data[$date === $today ? 'today' : 'tomorrow'] = [
                'mealRequests' => $mealRequests,
                'summary' => $summary,
                'meatSummary' => $meatSummary,
                'date' => $date
            ];
        }

        return Inertia::render('admin/dashboard', [
            'data' => $data,
            'currentDate' => $today,
            'tomorrowDate' => $tomorrow,
            'halls' => $user->role === 'super_admin' ? \App\Models\Hall::all() : [],
            'selectedHallId' => (int) $hallId,
        ]);
    }

    public function exportPdf(\Illuminate\Http\Request $request)
    {
        $user = auth()->user();
        $hallId = $user->hall_id;

        if ($user->role === 'super_admin') {
            $hallId = $request->query('hall_id', Hall::first()?->id);
        }

        $date = $request->query('date', Carbon::tomorrow()->toDateString());

        $hall = Hall::findOrFail($hallId);

        $mealType = $request->query('meal_type');
        $mealTypes = $mealType ? [$mealType] : ['breakfast', 'lunch', 'dinner'];
        $data = [];

        foreach ($mealTypes as $type) {
            $bookings = MealBooking::with(['user.student', 'user.teacher', 'user.staff'])
                ->where('hall_id', $hallId)
                ->where('booking_date', $date)
                ->where('meal_type', $type)
                ->get()
                ->map(function ($booking) use ($hall) {
                    $user = $booking->user;
                    $memberId = 'N/A';
                    $preference = 'beef';
                    $details = '';

                    if ($user->user_type === 'student' && $user->student) {
                        $memberId = $user->unique_id;
                        $preference = $user->student->meat_preference;
                    } elseif ($user->user_type === 'teacher' && $user->teacher) {
                        $memberId = $user->teacher->teacher_id ?? $user->unique_id;
                        $preference = $user->teacher->meat_preference;
                        $details = ($user->teacher->designation ?? '') . ',' . ($user->teacher->department ?? '');
                    } elseif ($user->user_type === 'staff' && $user->staff) {
                        $memberId = $user->unique_id;
                        $preference = $user->staff->meat_preference ?? 'beef';
                        $details = ($user->staff->designation ?? '') . ',' . $hall->name;
                    }

                    return [
                        'name' => $user->name,
                        'member_id' => $memberId,
                        'user_type' => $user->user_type,
                        'meat_preference' => $preference,
                        'quantity' => $booking->quantity,
                        'details' => trim($details, ','),
                    ];
                })->sortBy('member_id')->values();

            $students = $bookings->filter(fn($b) => $b['user_type'] === 'student')->values();
            $others = $bookings->filter(fn($b) => $b['user_type'] !== 'student')->values();

            $data[$type] = [
                'students' => $students,
                'others' => $others,
                'student_beef' => $students->where('meat_preference', 'beef')->sum('quantity'),
                'student_mutton' => $students->where('meat_preference', 'mutton')->sum('quantity'),
                'other_beef' => $others->where('meat_preference', 'beef')->sum('quantity'),
                'other_mutton' => $others->where('meat_preference', 'mutton')->sum('quantity'),
                'total_count' => $bookings->sum('quantity'),
            ];
        }

        $pdf = Pdf::loadView('pdf.meal-list', [
            'hall' => $hall,
            'date' => $date,
            'data' => $data,
        ]);

        $filename = "meal-list-{$hall->name}-{$date}";
        if ($mealType) {
            $filename .= "-{$mealType}";
        }

        return $pdf->download("{$filename}.pdf");
    }
}
