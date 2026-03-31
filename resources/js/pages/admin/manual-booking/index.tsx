import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import admin from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Calendar, Utensils, Coffee, Moon, Loader2, CheckCircle2, ChevronRight, Info, Users, GraduationCap, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: admin.dashboard().url,
    },
    {
        title: 'Manual Booking',
        href: '/admin/manual-booking',
    },
];

type BookingTab = 'student' | 'teacher' | 'staff';

export default function ManualBooking({ teachers = [], staff = [] }: { teachers?: any[], staff?: any[] }) {
    const [studentId, setStudentId] = useState('');
    const [searching, setSearching] = useState(false);
    const [studentData, setStudentData] = useState<any>(null);
    const [searchError, setSearchError] = useState('');
    const [activeTab, setActiveTab] = useState<BookingTab>('student');

    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
        start_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], // Tomorrow
        end_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],   // Tomorrow
        breakfast: 0,
        lunch: 1,
        dinner: 1,
    });

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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId) return;

        setSearching(true);
        setSearchError('');
        setStudentData(null);

        try {
            const response = await fetch(`/admin/manual-booking/search?student_id=${studentId}`);
            const result = await response.json();

            if (result.exists) {
                setStudentData({
                    exists: true,
                    user: result.user,
                    student: result.student,
                    hall: result.hall
                });
                setData('user_id', result.user.id);
            } else {
                setSearchError('No student found with this ID.');
            }
        } catch (error) {
            setSearchError('Error searching student. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleSelection = (member: any, type: BookingTab) => {
        const mappedData = {
            exists: true,
            user: { id: member.id, name: member.name, status: member.status },
            student: { 
                department: member.department || member.designation || 'Staff',
                balance: member.balance,
                room_number: member.teacher_id || member.staff_id || 'N/A'
            },
            hall: { name: member.hall }
        };
        setStudentData(mappedData);
        setData('user_id', member.id);
        setSearchError('');
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/manual-booking', {
            onSuccess: () => {
                // Keep the student selected but allow further bookings or reset?
                // User might want to book for another student.
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manual Meal Booking" />
            
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase tracking-tighter">Manual Meal Booking</h1>
                    <p className="text-muted-foreground">Select a member type and book meals for any date range.</p>
                </div>

                {/* Tabs selection */}
                <div className="grid grid-cols-3 gap-2 bg-muted/30 p-1.5 rounded-2xl border border-muted-foreground/10">
                    <button
                        onClick={() => { setActiveTab('student'); setStudentData(null); }}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest ${activeTab === 'student' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
                    >
                        <Users className="h-4 w-4" />
                        Students
                    </button>
                    <button
                        onClick={() => { setActiveTab('teacher'); setStudentData(null); }}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest ${activeTab === 'teacher' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
                    >
                        <GraduationCap className="h-4 w-4" />
                        Teachers
                    </button>
                    <button
                        onClick={() => { setActiveTab('staff'); setStudentData(null); }}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest ${activeTab === 'staff' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:bg-white/50'}`}
                    >
                        <Briefcase className="h-4 w-4" />
                        Staff
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Search / Selection Section */}
                    <Card className="md:col-span-5 shadow-sm border-primary/10 overflow-hidden">
                        <CardHeader className="bg-primary/5 pb-4">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                {activeTab === 'student' ? <Search className="h-5 w-5" /> : activeTab === 'teacher' ? <GraduationCap className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                                Selection
                            </CardTitle>
                            <CardDescription>
                                {activeTab === 'student' ? 'Enter the unique Student ID' : `Choose a ${activeTab} name`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {activeTab === 'student' ? (
                                <form onSubmit={handleSearch} className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="student_id">University ID / Student ID</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="student_id"
                                                placeholder="e.g. 200101001"
                                                value={studentId}
                                                onChange={(e) => setStudentId(e.target.value)}
                                                className="font-mono"
                                            />
                                            <Button type="submit" disabled={searching || !studentId} size="icon">
                                                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        {searchError && <p className="text-red-500 text-xs mt-1 font-medium">{searchError}</p>}
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <Label>Select {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</Label>
                                    <select 
                                        className="w-full h-10 border rounded px-3 text-sm font-bold bg-background focus:ring-1 focus:ring-primary outline-none"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val) {
                                                const list = activeTab === 'teacher' ? teachers : staff;
                                                const member = list.find(m => m.id.toString() === val);
                                                if (member) handleSelection(member, activeTab);
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Choose a name...</option>
                                        {(activeTab === 'teacher' ? teachers : staff).map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.teacher_id || m.staff_id})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {studentData && (
                                <div className="mt-6 p-4 rounded-xl border border-green-200 bg-green-50/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-full text-green-700">
                                            <UserCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-green-900 leading-tight">{studentData.user.name}</p>
                                            <p className="text-xs text-green-700">{studentData.hall?.name || 'No Hall'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-2 border-t border-green-100">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase text-green-600 font-semibold tracking-wider">Dept</p>
                                            <p className="text-sm font-medium">{studentData.student.department}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase text-green-600 font-semibold tracking-wider">Status</p>
                                            <Badge variant={studentData.user.status === 'active' ? 'default' : 'destructive'} className="h-5 text-[10px]">
                                                {studentData.user.status}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase text-green-600 font-semibold tracking-wider">Balance</p>
                                            <p className={`text-sm font-bold ${studentData.student.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {parseFloat(studentData.student.balance).toFixed(2)} TK
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase text-green-600 font-semibold tracking-wider">Room</p>
                                            <p className="text-sm font-medium">{studentData.student.room_number}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!studentData && !searching && !searchError && (
                                <div className="mt-6 flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
                                    <div className="bg-muted p-3 rounded-full mb-3 opacity-20">
                                        <UserX className="h-8 w-8" />
                                    </div>
                                    <p className="text-sm">No student selected</p>
                                    <p className="text-[10px]">Search for a student to continue</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Booking Form Section */}
                    <Card className={`md:col-span-7 shadow-sm transition-opacity duration-300 ${!studentData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-500" />
                                Booking Details
                            </CardTitle>
                            <p className="text-[11px] text-primary flex items-center gap-1 font-medium mt-1">
                                <Info className="h-3 w-3" /> Booking for tomorrow is allowed until 10:00 PM today.
                            </p>
                            <CardDescription>Select range and meal quantities</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start_date">From Date</Label>
                                        <div className="relative">
                                            <Input
                                                id="start_date"
                                                type="date"
                                                value={data.start_date}
                                                onChange={(e) => setData('start_date', e.target.value)}
                                                className="pl-3"
                                            />
                                        </div>
                                        {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">To Date</Label>
                                        <div className="relative">
                                            <Input
                                                id="end_date"
                                                type="date"
                                                value={data.end_date}
                                                onChange={(e) => setData('end_date', e.target.value)}
                                                className="pl-3"
                                            />
                                        </div>
                                        {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <Label className="text-sm font-semibold tracking-wide">Daily Meal Quantities</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-2 group">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Coffee className="h-4 w-4 text-orange-400" />
                                                <Label htmlFor="breakfast" className="text-xs font-medium">{getMealName('breakfast')}</Label>
                                            </div>
                                            <Input
                                                id="breakfast"
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={data.breakfast}
                                                onChange={(e) => setData('breakfast', parseInt(e.target.value))}
                                                className="h-12 text-center text-lg font-bold bg-orange-50/20 border-orange-100 focus:border-orange-500 focus:ring-orange-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 group">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Utensils className="h-4 w-4 text-blue-400" />
                                                <Label htmlFor="lunch" className="text-xs font-medium">{getMealName('lunch')}</Label>
                                            </div>
                                            <Input
                                                id="lunch"
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={data.lunch}
                                                onChange={(e) => setData('lunch', parseInt(e.target.value))}
                                                className="h-12 text-center text-lg font-bold bg-blue-50/20 border-blue-100 focus:border-blue-500 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 group">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Moon className="h-4 w-4 text-indigo-400" />
                                                <Label htmlFor="dinner" className="text-xs font-medium">{getMealName('dinner')}</Label>
                                            </div>
                                            <Input
                                                id="dinner"
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={data.dinner}
                                                onChange={(e) => setData('dinner', parseInt(e.target.value))}
                                                className="h-12 text-center text-lg font-bold bg-indigo-50/20 border-indigo-100 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Quantity will be applied to EACH day in the selected range.
                                    </p>
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" disabled={processing || !studentData} className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                                        {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Calendar className="h-5 w-5 mr-2" />}
                                        Create Manual Booking
                                    </Button>
                                </div>
                                { (usePage().props as any).flash?.success && (
                                    <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm border border-green-200 mt-4 animate-in zoom-in-95 duration-300">
                                        { (usePage().props as any).flash.success}
                                    </div>
                                )}
                                {((usePage().props as any).errors as any).error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100 mt-4">
                                        {((usePage().props as any).errors as any).error}
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
