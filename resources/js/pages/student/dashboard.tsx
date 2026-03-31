import { Head, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import student from '@/routes/student';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { Coffee, Utensils, Moon, Wallet, History, CreditCard, Info, TrendingUp, Gamepad2, Calendar as CalendarIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TicTacToe from '@/components/TicTacToe';
import Snake from '@/components/Snake';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BookingCalendar from '@/components/BookingCalendar';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Student Dashboard',
        href: student.dashboard().url,
    },
];

export default function StudentDashboard({ user, bookings, pastBookings, monthlyCosts, stats, historicalRates, leaderboards }: { user: any, bookings: any[], pastBookings: any[], monthlyCosts: any[], stats: any, historicalRates: any, leaderboards: any }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeGame, setActiveGame] = useState<'tictactoe' | 'snake'>('tictactoe');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Range Booking Form
    const { data, setData, post, processing, errors, reset } = useForm({
        start_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], // Tomorrow
        end_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],   // Tomorrow
        breakfast: 0,
        lunch: 1,
        dinner: 1,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(student.mealBookings.store().url, {
            onSuccess: () => reset(),
        });
    };

    const cancelBooking = (id: number) => {
        if (confirm('Are you sure you want to cancel this meal?')) {
            router.delete(student.mealBookings.destroy(id).url);
        }
    };

    const isDue = user.student.balance < 0;
    const absBalance = Math.abs(user.student.balance);

    const isRamadan = (usePage().props as any).isRamadan;

    const getMealName = (type: string) => {
        if (isRamadan) {
            const aliases: Record<string, string> = {
                'breakfast': 'Sehri',
                'lunch': 'Iftar',
                'dinner': 'Dinner'
            };
            return aliases[type] || type.charAt(0).toUpperCase() + type.slice(1);
        }
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Student Dashboard" />
            <div className="p-6 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-4 rounded-xl border gap-4">
                    <div>
                        <h2 className="text-2xl font-bold italic tracking-tight">Welcome, {user.name}</h2>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm font-medium text-foreground">{user.hall?.name || 'No Hall Assigned'}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground uppercase tracking-wider">
                                {user.unique_id && <span><span className="font-semibold text-primary">UID:</span> {user.unique_id}</span>}
                                <span><span className="font-semibold">ID:</span> {user.student.student_id}</span>
                                <span><span className="font-semibold">Dept:</span> {user.student.department}</span>
                                <span><span className="font-semibold">Room:</span> {user.student.room_number}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing & Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className={isDue ? 'border-red-200 bg-red-50/10' : 'border-green-200 bg-green-50/10'}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {isDue ? 'Payable Amount (Due)' : 'Current Balance'}
                            </CardTitle>
                            <Wallet className={`h-4 w-4 ${isDue ? 'text-red-600' : 'text-green-600'}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${isDue ? 'text-red-700' : 'text-green-700'}`}>
                                {absBalance.toFixed(2)} TK
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isDue ? 'Please deposit funds at the office' : 'Sufficient funds available'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{parseFloat(stats.total_spent).toFixed(2)} TK</div>
                            <p className="text-xs text-muted-foreground mt-1">Lifetime meal consumption</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
                            <History className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_meals} Units</div>
                            <div className="flex gap-2 mt-1">
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded" title={getMealName('breakfast')}>{getMealName('breakfast')[0]}: {stats.meal_counts.breakfast}</span>
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded" title={getMealName('lunch')}>{getMealName('lunch')[0]}: {stats.meal_counts.lunch}</span>
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded" title={getMealName('dinner')}>{getMealName('dinner')[0]}: {stats.meal_counts.dinner}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Booking Form */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Plan Your Meals
                            </CardTitle>
                            <p className="text-[11px] text-primary flex items-center gap-1 font-medium mt-1">
                                <Info className="h-3 w-3" /> Booking & changes for tomorrow are allowed until 10:00 PM today.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start_date">From Date</Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            value={data.start_date}
                                            onChange={(e) => setData('start_date', e.target.value)}
                                        />
                                        {errors.start_date && <p className="text-red-500 text-xs">{errors.start_date}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">To Date</Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            value={data.end_date}
                                            onChange={(e) => setData('end_date', e.target.value)}
                                        />
                                        {errors.end_date && <p className="text-red-500 text-xs">{errors.end_date}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Daily Meal Quantities</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label className="text-[10px]" htmlFor="breakfast">{getMealName('breakfast')}</Label>
                                            <Input
                                                id="breakfast"
                                                type="number"
                                                min="0"
                                                max="5"
                                                value={data.breakfast}
                                                onChange={(e) => setData('breakfast', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]" htmlFor="lunch">{getMealName('lunch')}</Label>
                                            <Input
                                                id="lunch"
                                                type="number"
                                                min="0"
                                                max="5"
                                                value={data.lunch}
                                                onChange={(e) => setData('lunch', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px]" htmlFor="dinner">{getMealName('dinner')}</Label>
                                            <Input
                                                id="dinner"
                                                type="number"
                                                min="0"
                                                max="5"
                                                value={data.dinner}
                                                onChange={(e) => setData('dinner', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <Button type="submit" disabled={processing} className="w-full">
                                        Update Bookings
                                    </Button>
                                    <p className="text-center text-[10px] text-muted-foreground mt-2">
                                        * Set quantity to 0 to remove a meal.
                                    </p>
                                </div>
                                {(usePage().props.errors as any).error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
                                        {(usePage().props.errors as any).error}
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Calendar View */}
                    <div className="h-full">
                        <BookingCalendar bookings={bookings} />
                    </div>
                </div>

                {/* Upcoming Bookings Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Upcoming Bookings List
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="h-10 px-2 text-left text-muted-foreground">Date</th>
                                        <th className="h-10 px-2 text-left text-muted-foreground">Meal</th>
                                        <th className="h-10 px-2 text-left text-muted-foreground">Qty</th>
                                        <th className="h-10 px-2 text-left text-muted-foreground">Status</th>
                                        <th className="h-10 px-2 text-right text-muted-foreground">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((booking: any) => {
                                        const isCancellable = new Date(booking.booking_date) > new Date();
                                        return (
                                            <tr key={booking.id} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="p-2 font-mono text-xs">{booking.booking_date}</td>
                                                <td className="p-2 capitalize">
                                                    <div className="flex items-center gap-2">
                                                        {booking.meal_type === 'breakfast' && <Coffee className="h-3 w-3" />}
                                                        {booking.meal_type === 'lunch' && <Utensils className="h-3 w-3" />}
                                                        {booking.meal_type === 'dinner' && <Moon className="h-3 w-3" />}
                                                        {getMealName(booking.meal_type)}
                                                    </div>
                                                </td>
                                                <td className="p-2 font-semibold">{booking.quantity}</td>
                                                <td className="p-2 text-muted-foreground">
                                                    {booking.is_taken ? <Badge variant="default">Taken</Badge> : <Badge variant="outline">Scheduled</Badge>}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {isCancellable && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => cancelBooking(booking.id)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {bookings.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                                                No upcoming bookings found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Previous Bookings - Simplified for space */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-muted-foreground text-sm">
                            <History className="h-4 w-4 opacity-70" />
                            Recent History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full overflow-auto max-h-60">
                            <table className="w-full text-xs text-muted-foreground">
                                <thead>
                                    <tr className="border-b">
                                        <th className="h-8 px-2 text-left">Date</th>
                                        <th className="h-8 px-2 text-left">Meal</th>
                                        <th className="h-8 px-2 text-left">Qty</th>
                                        <th className="h-8 px-2 text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pastBookings.map((booking: any) => (
                                        <tr key={booking.id} className="border-b hover:bg-muted/10">
                                            <td className="p-2 font-mono">{booking.booking_date}</td>
                                            <td className="p-2">{getMealName(booking.meal_type)}</td>
                                            <td className="p-2">{booking.quantity}</td>
                                            <td className="p-2 text-right">
                                                {parseFloat(booking.price) > 0 ? `${(booking.quantity * booking.price).toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Leaderboards and Games (Keep existing) */}
                <div className="fixed bottom-6 right-6 z-40">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                size="icon"
                                className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-none"
                                title="Take a break with Tic Tac Toe!"
                            >
                                <Gamepad2 className="h-7 w-7" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] p-4 max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-center font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                    <Gamepad2 className="h-5 w-5 text-indigo-600" />
                                    BAUST Student Game Hub
                                </DialogTitle>
                            </DialogHeader>
                            <div className="flex justify-center gap-2 mb-4 bg-muted p-1 rounded-lg">
                                <Button
                                    variant={activeGame === 'tictactoe' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setActiveGame('tictactoe')}
                                >
                                    Tic Tac Toe
                                </Button>
                                <Button
                                    variant={activeGame === 'snake' ? 'default' : 'ghost'}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setActiveGame('snake')}
                                >
                                    Snake
                                </Button>
                            </div>
                            <div className="min-h-[400px] flex items-center justify-center">
                                {activeGame === 'tictactoe' ? (
                                    <TicTacToe leaderboard={leaderboards.tictactoe} />
                                ) : (
                                    <Snake leaderboard={leaderboards.snake} />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}
