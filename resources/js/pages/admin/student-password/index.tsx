import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import admin from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Search, Key, Eye, EyeOff, Loader2, UserCheck, UserX, ChevronRight, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: admin.dashboard().url,
    },
    {
        title: 'Change Student Password',
        href: '/admin/student-password',
    },
];

export default function StudentPassword() {
    const [studentId, setStudentId] = useState('');
    const [searching, setSearching] = useState(false);
    const [studentData, setStudentData] = useState<any>(null);
    const [searchError, setSearchError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
        password: '',
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId) return;

        setSearching(true);
        setSearchError('');
        setStudentData(null);

        try {
            const response = await fetch(`/admin/student-password/search?student_id=${studentId}`);
            const result = await response.json();

            if (result.exists) {
                setStudentData(result);
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/student-password', {
            onSuccess: () => {
                reset('password');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Change Student Password" />
            
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">Reset Student Password</h1>
                    <p className="text-muted-foreground">Search for a student and manually override their login password.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Search Section */}
                    <Card className="md:col-span-5 shadow-sm border-primary/10 overflow-hidden">
                        <CardHeader className="bg-muted pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Identify Student
                            </CardTitle>
                            <CardDescription>Enter the University ID</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
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
                                        <Button type="submit" disabled={searching || !studentId} size="icon" variant="secondary">
                                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    {searchError && <p className="text-red-500 text-xs mt-1 font-medium">{searchError}</p>}
                                </div>
                            </form>

                            {studentData && (
                                <div className="mt-6 p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-700">
                                            <UserCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-blue-900 leading-tight">{studentData.user.name}</p>
                                            <p className="text-xs text-blue-700">{studentData.hall?.name || 'No Hall'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-2 border-t border-blue-100">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase text-blue-600 font-semibold tracking-wider">Dept</p>
                                            <p className="text-sm font-medium">{studentData.student.department}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase text-blue-600 font-semibold tracking-wider">Status</p>
                                            <Badge variant={studentData.user.status === 'active' ? 'default' : 'destructive'} className="h-5 text-[10px]">
                                                {studentData.user.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!studentData && !searching && !searchError && (
                                <div className="mt-6 flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
                                    <div className="bg-muted p-3 rounded-full mb-3 opacity-20">
                                        <UserX className="h-8 w-8" />
                                    </div>
                                    <p className="text-sm">No student identified</p>
                                    <p className="text-[10px]">Search to enable password reset</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Reset Form Section */}
                    <Card className={`md:col-span-7 shadow-sm transition-opacity duration-300 ${!studentData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-red-500" />
                                Set New Password
                            </CardTitle>
                            <CardDescription>This student will log in with this password</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <form onSubmit={submit} className="space-y-6">
                                <div className="space-y-3">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Enter strong new password"
                                            className="pr-10 h-12"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-100 text-[11px] text-orange-800">
                                        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                                        <p>Warning: Resetting the password will immediately allow the student to log in with these credentials. Make sure to communicate the new password securely.</p>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" disabled={processing || !studentData || !data.password} variant="destructive" className="w-full h-12 text-base font-bold shadow-lg shadow-red-200">
                                        {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Key className="h-5 w-5 mr-2" />}
                                        Override Password
                                    </Button>
                                </div>
                                { (usePage().props as any).flash?.success && (
                                    <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm border border-green-200 mt-4 animate-in zoom-in-95 duration-300">
                                        { (usePage().props as any).flash.success}
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
