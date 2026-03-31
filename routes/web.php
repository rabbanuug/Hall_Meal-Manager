<?php

use App\Http\Controllers\Admin\MealRequestController;
use App\Http\Controllers\Admin\StudentRegistrationController;
use App\Http\Controllers\Student\MealBookingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $role = auth()->user()->role;
        if (in_array($role, ['super_admin', 'hall_admin'])) {
            return redirect()->route('admin.dashboard');
        }
        if ($role === 'teacher') {
            return redirect()->route('teacher.dashboard');
        }
        if ($role === 'staff') {
            return redirect()->route('staff.dashboard');
        }
        return redirect()->route('student.dashboard');
    })->name('dashboard');

    // Admin Routes
    Route::middleware(['can:access-admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', [MealRequestController::class, 'index'])->name('dashboard');
        Route::get('meal-requests/export', [MealRequestController::class, 'exportPdf'])->name('meal-requests.export');

        // Students
        Route::get('students', [StudentRegistrationController::class, 'index'])->name('students.index');
        Route::get('students/create', [StudentRegistrationController::class, 'create'])->name('students.create');
        Route::post('students', [StudentRegistrationController::class, 'store'])->name('students.store');
        Route::post('students/bulk', [StudentRegistrationController::class, 'bulkStore'])->name('students.bulk');
        Route::post('students/bulk-validate', [StudentRegistrationController::class, 'validateBulk'])->name('students.bulk-validate');
        Route::get('students/export', [StudentRegistrationController::class, 'exportPdf'])->name('students.export');
        Route::put('students/{student}', [StudentRegistrationController::class, 'update'])->name('students.update');

        // Teachers
        Route::get('teachers', [\App\Http\Controllers\Admin\TeacherRegistrationController::class, 'index'])->name('teachers.index');
        Route::post('teachers', [\App\Http\Controllers\Admin\TeacherRegistrationController::class, 'store'])->name('teachers.store');
        Route::put('teachers/{teacher}', [\App\Http\Controllers\Admin\TeacherRegistrationController::class, 'update'])->name('teachers.update');

        // Staff
        Route::get('staff', [\App\Http\Controllers\Admin\StaffRegistrationController::class, 'index'])->name('staff.index');
        Route::post('staff', [\App\Http\Controllers\Admin\StaffRegistrationController::class, 'store'])->name('staff.store');
        Route::put('staff/{staff}', [\App\Http\Controllers\Admin\StaffRegistrationController::class, 'update'])->name('staff.update');

        Route::post('students/{student}/payments', [\App\Http\Controllers\Admin\PaymentController::class, 'store'])->name('students.payments.store');

        // Meal Expenses
        Route::get('meal-expenses', [\App\Http\Controllers\Admin\MealExpenseController::class, 'index'])->name('meal-expenses.index');
        Route::get('meal-expenses/create', [\App\Http\Controllers\Admin\MealExpenseController::class, 'create'])->name('meal-expenses.create');
        Route::post('meal-expenses', [\App\Http\Controllers\Admin\MealExpenseController::class, 'store'])->name('meal-expenses.store');
        Route::get('meal-expenses/{dailyCost}/edit', [\App\Http\Controllers\Admin\MealExpenseController::class, 'edit'])->name('meal-expenses.edit');
        Route::put('meal-expenses/{dailyCost}', [\App\Http\Controllers\Admin\MealExpenseController::class, 'update'])->name('meal-expenses.update');
        Route::post('meal-expenses/{dailyCost}/finalize', [\App\Http\Controllers\Admin\MealExpenseController::class, 'finalize'])->name('meal-expenses.finalize');

        // Monthly Costs
        Route::get('monthly-costs', [\App\Http\Controllers\Admin\MonthlyCostController::class, 'index'])->name('monthly-costs.index');
        Route::post('monthly-costs', [\App\Http\Controllers\Admin\MonthlyCostController::class, 'store'])->name('monthly-costs.store');
        Route::post('monthly-costs/{monthlyCost}/finalize', [\App\Http\Controllers\Admin\MonthlyCostController::class, 'finalize'])->name('monthly-costs.finalize');
        Route::put('halls/{hall}/settings', [\App\Http\Controllers\Admin\MonthlyCostController::class, 'updateHallSettings'])->name('halls.update-settings');

        // Daily Meal Management
        Route::get('daily-meals', [\App\Http\Controllers\Admin\DailyMealController::class, 'index'])->name('daily-meals.index');
        Route::post('daily-meals/toggle', [\App\Http\Controllers\Admin\DailyMealController::class, 'toggle'])->name('daily-meals.toggle');

        // Status Management
        Route::post('members/{user}/toggle-status', [\App\Http\Controllers\Admin\MemberStatusController::class, 'toggle'])->name('members.toggle-status');

        // Manual Booking
        Route::get('manual-booking', [\App\Http\Controllers\Admin\ManualBookingController::class, 'index'])->name('manual-booking.index');
        Route::get('manual-booking/search', [\App\Http\Controllers\Admin\ManualBookingController::class, 'searchStudent'])->name('manual-booking.search');
        Route::post('manual-booking', [\App\Http\Controllers\Admin\ManualBookingController::class, 'store'])->name('manual-booking.store');

        // Student Password Reset
        Route::get('student-password', [\App\Http\Controllers\Admin\StudentPasswordController::class, 'index'])->name('student-password.index');
        Route::get('student-password/search', [\App\Http\Controllers\Admin\StudentPasswordController::class, 'search'])->name('student-password.search');
        Route::post('student-password', [\App\Http\Controllers\Admin\StudentPasswordController::class, 'update'])->name('student-password.update');
    });

    // Student Routes
    Route::middleware(['can:access-student'])->prefix('student')->name('student.')->group(function () {
        Route::get('dashboard', [MealBookingController::class, 'index'])->name('dashboard');
        Route::post('meal-bookings', [MealBookingController::class, 'store'])->name('meal-bookings.store');
        Route::delete('meal-bookings/{booking}', [MealBookingController::class, 'destroy'])->name('meal-bookings.destroy');
        Route::post('game-scores', [\App\Http\Controllers\Student\GameScoreController::class, 'store'])->name('game-scores.store');
    });

    // Teacher Routes
    Route::middleware(['can:access-teacher'])->prefix('teacher')->name('teacher.')->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Teacher\TeacherDashboardController::class, 'index'])->name('dashboard');
        Route::post('meal-bookings', [\App\Http\Controllers\Teacher\TeacherDashboardController::class, 'store'])->name('meal-bookings.store');
    });

    // Staff Routes
    Route::middleware(['can:access-staff'])->prefix('staff')->name('staff.')->group(function () {
        Route::get('dashboard', [\App\Http\Controllers\Staff\StaffDashboardController::class, 'index'])->name('dashboard');
        Route::post('meal-bookings', [\App\Http\Controllers\Staff\StaffDashboardController::class, 'store'])->name('meal-bookings.store');
    });
});

require __DIR__ . '/settings.php';
