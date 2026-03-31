<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\MealBooking;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class MealBookingController extends Controller
{
    public function index()
    {
        $userId = auth()->id();
        $upcomingBookings = MealBooking::where('user_id', $userId)
            ->where('booking_date', '>=', now()->toDateString())
            ->get();

        $pastBookings = MealBooking::where('user_id', $userId)
            ->where('booking_date', '<', now()->toDateString())
            ->orderBy('booking_date', 'desc')
            ->limit(20)
            ->get();

        $monthlyCosts = \App\Models\MonthlyCost::where('hall_id', auth()->user()->hall_id)
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->limit(3)
            ->get();

        $stats = [
            'total_meals' => MealBooking::where('user_id', $userId)->sum('quantity'),
            'total_spent' => MealBooking::where('user_id', $userId)->selectRaw('sum(quantity * price) as total')->value('total') ?? 0,
            'meal_counts' => [
                'breakfast' => MealBooking::where('user_id', $userId)->where('meal_type', 'breakfast')->sum('quantity'),
                'lunch' => MealBooking::where('user_id', $userId)->where('meal_type', 'lunch')->sum('quantity'),
                'dinner' => MealBooking::where('user_id', $userId)->where('meal_type', 'dinner')->sum('quantity'),
            ]
        ];

        // Fetch last 3 finalized rates for each meal type
        $historicalRates = [
            'breakfast' => \App\Models\DailyMealCost::where('hall_id', auth()->user()->hall_id)
                ->where('meal_type', 'breakfast')
                ->where('status', 'finalized')
                ->orderBy('date', 'desc')
                ->limit(3)
                ->get(['date', 'calculated_price']),
            'lunch' => \App\Models\DailyMealCost::where('hall_id', auth()->user()->hall_id)
                ->where('meal_type', 'lunch')
                ->where('status', 'finalized')
                ->orderBy('date', 'desc')
                ->limit(3)
                ->get(['date', 'calculated_price']),
            'dinner' => \App\Models\DailyMealCost::where('hall_id', auth()->user()->hall_id)
                ->where('meal_type', 'dinner')
                ->where('status', 'finalized')
                ->orderBy('date', 'desc')
                ->limit(3)
                ->get(['date', 'calculated_price']),
        ];

        $user = auth()->user()->load(['student', 'hall']);
        $leaderboards = [
            'snake' => GameScoreController::getLeaderboard('snake'),
            'tictactoe' => GameScoreController::getLeaderboard('tictactoe'),
        ];

        return Inertia::render('student/dashboard', [
            'user' => $user,
            'bookings' => $upcomingBookings,
            'pastBookings' => $pastBookings,
            'monthlyCosts' => $monthlyCosts,
            'stats' => $stats,
            'historicalRates' => $historicalRates,
            'leaderboards' => $leaderboards,
        ]);
    }

    public function store(Request $request)
    {
        // Booking logic:
        // 1. Single day default (tomorrow) if no dates provided.
        // 2. Date range if start_date and end_date provided.
        // 3. Validation: Booking allowed between 8 AM and 11:59 PM (for any booking action).

        $now = Carbon::now();
        $startTime = Carbon::createFromTime(8, 0, 0);
        $endTime = Carbon::createFromTime(23, 59, 59);

        if (!$now->between($startTime, $endTime)) {
            return back()->withErrors(['error' => 'Booking is only allowed between 08 AM and 11:59 PM.']);
        }

        // Feature 7: Payment Enforcement
        // If balance < 0 and last payment was > 2 months ago (or never)
        // AND not overridden by admin (need a flag? "Admin can on the things again")
        // I'll assume "status" = "suspended" handles the admin block. 
        // If "Admin can on things again", admin sets status = 'active'.
        // So I just check status.

        if (auth()->user()->status === 'suspended') {
            return back()->withErrors(['error' => 'Account suspended due to dues. Please contact admin.']);
        }

        // Auto-check for "2 months no payment"
        $student = auth()->user()->student; // Assuming student for now
        if ($student && $student->balance < 0) {
            $lastPayment = \App\Models\Payment::where('student_id', $student->id)->latest()->first();
            $twoMonthsAgo = Carbon::now()->subMonths(2);

            if (!$lastPayment || $lastPayment->created_at < $twoMonthsAgo) {
                // Technically we should suspend them here or just block booking?
                // "cannot book further".
                return back()->withErrors(['error' => 'Booking blocked. Dues pending for over 2 months. Please clear dues.']);
            }
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $request->validate([
                'start_date' => 'required|date|after_or_equal:tomorrow',
                'end_date' => 'required|date|after_or_equal:start_date',
                'breakfast' => 'required|integer|min:0|max:10',
                'lunch' => 'required|integer|min:0|max:10',
                'dinner' => 'required|integer|min:0|max:10',
            ]);

            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            DB::transaction(function () use ($request, $startDate, $endDate) {
                $tomorrow = Carbon::tomorrow()->toDateString();
                $isLateForTomorrow = now()->hour >= 22;

                for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
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
                                    'user_id' => auth()->id(),
                                    'meal_type' => $type,
                                    'booking_date' => $dateString,
                                ],
                                [
                                    'hall_id' => auth()->user()->hall_id,
                                    'quantity' => $qty,
                                    'price' => 0, // Adjusted later
                                ]
                            );
                        } else {
                            // If qty is 0, remove booking if exists?
                            // Or just ignore? User might want to "unbook" by setting 0.
                            // "Customize...". If they set 0, they probably mean no meal.
                            MealBooking::where('user_id', auth()->id())
                                ->where('meal_type', $type)
                                ->where('booking_date', $dateString)
                                ->delete();
                        }
                    }
                }
            });

            return back()->with('success', 'Meal bookings updated for the selected range.');

        } else {
            // Legacy single day (Tomorrow) with single meal type
            $request->validate([
                'meal_type' => 'required|in:breakfast,lunch,dinner',
                'quantity' => 'required|integer|min:1|max:10',
            ]);

            $nextDay = Carbon::tomorrow()->toDateString();
            if (now()->hour >= 22) {
                return back()->withErrors(['error' => 'Cannot book for tomorrow after 10:00 PM today.']);
            }

            DB::transaction(function () use ($request, $nextDay) {
                MealBooking::updateOrCreate(
                    [
                        'user_id' => auth()->id(),
                        'meal_type' => $request->meal_type,
                        'booking_date' => $nextDay,
                    ],
                    [
                        'hall_id' => auth()->user()->hall_id,
                        'quantity' => $request->quantity,
                        'price' => 0,
                    ]
                );
            });

            return back()->with('success', 'Meal booked successfully for tomorrow.');
        }
    }

    public function destroy(MealBooking $booking)
    {
        if ($booking->user_id !== auth()->id()) {
            return back()->withErrors(['error' => 'Unauthorized.']);
        }

        // Cancel till one day before
        // If booking is for Feb 2, can cancel on Feb 1.
        // So booking_date > today.
        if ($booking->booking_date <= now()->toDateString()) {
            return back()->withErrors(['error' => 'Cannot cancel meals for today or past dates.']);
        }

        // New restriction: Cannot change next day's meal after 10 PM
        $tomorrow = Carbon::tomorrow()->toDateString();
        if ($booking->booking_date === $tomorrow && now()->hour >= 22) {
            return back()->withErrors(['error' => 'Cannot cancel meals for tomorrow after 10:00 PM today.']);
        }

        $booking->delete();

        return back()->with('success', 'Booking cancelled.');
    }
}
