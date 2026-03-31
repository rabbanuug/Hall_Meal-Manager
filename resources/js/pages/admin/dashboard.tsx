import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import admin from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Utensils } from 'lucide-react';

import { router } from '@inertiajs/react';
import { FileDown } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: admin.dashboard().url,
    },
];

export default function AdminDashboard({ data, currentDate, tomorrowDate, halls, selectedHallId }: { data: any, currentDate: string, tomorrowDate: string, halls: any[], selectedHallId: number }) {
    const [activeDate, setActiveDate] = useState<'today' | 'tomorrow'>('tomorrow');
    const [activeTab, setActiveTab] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');

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

    const currentData = data[activeDate];
    const { mealRequests, summary, meatSummary, date } = currentData;
    const filteredRequests = mealRequests.filter((r: any) => r.meal_type === activeTab);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Department of Hall Meals</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-muted-foreground">Showing final booking list for {date}</p>
                            {halls && halls.length > 0 && (
                                <select
                                    className="text-xs h-7 border rounded bg-background px-2 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                                    value={selectedHallId}
                                    onChange={(e) => router.get(admin.dashboard().url, { hall_id: e.target.value })}
                                >
                                    {halls.map((hall: any) => (
                                        <option key={hall.id} value={hall.id}>{hall.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="flex bg-muted p-1 rounded-xl shadow-inner">
                        <Button
                            variant={activeDate === 'today' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveDate('today')}
                            className="rounded-lg gap-2"
                        >
                            Today
                        </Button>
                        <Button
                            variant={activeDate === 'tomorrow' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveDate('tomorrow')}
                            className="rounded-lg gap-2"
                        >
                            Tomorrow
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                        onClick={() => {
                            window.location.href = `/admin/meal-requests/export?hall_id=${selectedHallId}&date=${date}&meal_type=${activeTab}`;
                        }}
                    >
                        <FileDown className="h-4 w-4" />
                        Export PDF
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['breakfast', 'lunch', 'dinner'].map((type) => {
                        const total = summary.find((s: any) => s.meal_type === type)?.total_quantity || 0;
                        const isActive = activeTab === type;
                        return (
                            <Card
                                key={type}
                                className={`cursor-pointer transition-all duration-200 border-2 ${isActive ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/5' : 'hover:border-emerald-200 dark:hover:border-emerald-900'}`}
                                onClick={() => setActiveTab(type as any)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{getMealName(type)}</CardTitle>
                                        <Utensils className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-black">{total}</div>
                                    <p className="text-xs text-muted-foreground mb-4">Total Meals Ordered</p>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                            {isRamadan ? 'Beef' : 'Beef'}: {meatSummary[type]?.find((m: any) => m.meat_preference === 'beef')?.count || 0}
                                        </Badge>
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                            {isRamadan ? 'Mutton' : 'Mutton'}: {meatSummary[type]?.find((m: any) => m.meat_preference === 'mutton')?.count || 0}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Card className="border-emerald-100 dark:border-emerald-900/50">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-600" />
                            <span className="capitalize">{activeTab} List</span>
                            <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                                {filteredRequests.length} Members
                            </Badge>
                        </CardTitle>

                        <div className="flex gap-1 bg-background p-1 rounded-lg border">
                            {(['breakfast', 'lunch', 'dinner'] as const).map((type) => (
                                <Button
                                    key={type}
                                    variant={activeTab === type ? 'default' : 'ghost'}
                                    size="sm"
                                    className={`capitalize h-8 px-4 ${activeTab === type ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                    onClick={() => setActiveTab(type)}
                                >
                                    {getMealName(type)}
                                </Button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 text-muted-foreground">
                                        <th className="h-12 px-6 text-left font-bold uppercase tracking-tighter">ID / Ref</th>
                                        <th className="h-12 px-6 text-left font-bold uppercase tracking-tighter">Name</th>
                                        <th className="h-12 px-6 text-left font-bold uppercase tracking-tighter">Type</th>
                                        <th className="h-12 px-6 text-left font-bold uppercase tracking-tighter">Preference</th>
                                        <th className="h-12 px-6 text-left font-bold uppercase tracking-tighter text-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredRequests.map((request: any) => (
                                        <tr key={request.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                                            <td className="px-6 py-4 font-mono text-xs font-semibold">{request.user.member_id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{request.user.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="capitalize text-[10px] h-5 px-1.5 border-muted-foreground/30 text-muted-foreground">
                                                    {request.user.user_type}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    variant="secondary"
                                                    className={`capitalize font-bold ${request.user.meat_preference === 'beef'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
                                                        }`}
                                                >
                                                    {request.user.meat_preference}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-600">{request.quantity}</td>
                                        </tr>
                                    ))}
                                    {filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                    <CalendarDays className="h-12 w-12 opacity-20" />
                                                    <p className="text-lg font-medium">No bookings for {activeTab} on this date.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

