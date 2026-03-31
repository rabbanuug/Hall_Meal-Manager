import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import admin from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import BulkImportModal from '@/components/bulk-import-modal';
import EditStudentModal from '@/components/edit-student-modal';
import DepositBalanceModal from '@/components/deposit-balance-modal';
import { Pencil, Search, Wallet, UserMinus, UserCheck, ShieldAlert, Printer, ChevronUp, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function StudentList({ students, filters, halls, selectedHallId, memberType }: { students: any[], filters: any, halls?: any[], selectedHallId?: number, memberType: 'student' | 'teacher' | 'staff' }) {
    const memberTypeTitle = memberType === 'student' ? 'Students' : memberType === 'teacher' ? 'Teachers' : 'Staffs';
    const baseUrl = memberType === 'student' ? '/admin/students' : memberType === 'teacher' ? '/admin/teachers' : '/admin/staff';


    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: memberTypeTitle,
            href: baseUrl,
        },
    ];

    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({
        key: 'unique_id',
        direction: 'asc'
    });

    const sortedStudents = useMemo(() => {
        let sortableItems = [...students];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
                const bValue = (b[sortConfig.key] || '').toString().toLowerCase();
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [students, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDown className="h-3 w-3 ml-1 opacity-20" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 text-primary" /> : <ChevronDown className="h-3 w-3 ml-1 text-primary" />;
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get(baseUrl,
                    { search, hall_id: selectedHallId },
                    { preserveState: true, replace: true }
                );
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const handleEdit = (student: any) => {
        setSelectedStudent(student);
        setEditModalOpen(true);
    };

    const handleDeposit = (student: any) => {
        setSelectedStudent(student);
        setDepositModalOpen(true);
    };

    const toggleStatus = (student: any) => {
        const action = student.status === 'ex' ? 'Reactivate' : 'Mark as Ex-User';
        if (confirm(`Are you sure you want to ${action} this member? ${action === 'Mark as Ex-User' ? 'Clearance check will be performed.' : ''}`)) {
            router.post(admin.members.toggleStatus(student.user_id).url, {}, {
                onError: () => alert('Action failed. Check for dues.')
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Student List" />
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-2xl font-bold">Registered {memberTypeTitle}</h2>
                    <div className="flex flex-col md:flex-row w-full md:w-auto gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={`Search ${memberTypeTitle.toLowerCase()}...`}
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {halls && halls.length > 0 && (
                                <select
                                    className="h-10 border rounded px-3 text-sm font-bold bg-background focus:ring-1 focus:ring-emerald-500 outline-none min-w-[150px]"
                                    value={selectedHallId}
                                    onChange={(e) => router.get(baseUrl, { hall_id: e.target.value })}
                                >
                                    {halls.map((hall: any) => (
                                        <option key={hall.id} value={hall.id}>{hall.name}</option>
                                    ))}
                                </select>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => window.open(`/admin/students/export?search=${search}&hall_id=${selectedHallId}`, '_blank')}
                                className="flex items-center gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                Print List
                            </Button>
                            <BulkImportModal hallId={selectedHallId} />
                            <Button asChild>
                                <Link href={admin.students.create().url}>Register New Member</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{memberTypeTitle} in Your Hall ({students.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => requestSort('unique_id')}>
                                            <div className="flex items-center">UID {getSortIcon('unique_id')}</div>
                                        </th>
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => requestSort('student_id')}>
                                            <div className="flex items-center">ID / Ref {getSortIcon('student_id')}</div>
                                        </th>
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => requestSort('name')}>
                                            <div className="flex items-center">Name {getSortIcon('name')}</div>
                                        </th>
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => requestSort('department')}>
                                            <div className="flex items-center">Dept / Desig {getSortIcon('department')}</div>
                                        </th>
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => requestSort('status')}>
                                            <div className="flex items-center">Status {getSortIcon('status')}</div>
                                        </th>
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => requestSort('balance')}>
                                            <div className="flex items-center">Balance {getSortIcon('balance')}</div>
                                        </th>
                                        <th className="h-10 px-2 text-left text-xs uppercase text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStudents.map((student: any) => (
                                        <tr key={student.id} className={`border-b group hover:bg-muted/50 transition-colors ${student.status === 'ex' ? 'opacity-60 bg-muted/20' : ''}`}>
                                            <td className="p-2 font-mono text-xs font-semibold text-primary">{student.unique_id || '-'}</td>
                                            <td className="p-2 font-mono text-xs">{student.student_id}</td>
                                            <td className="p-2">
                                                <div className="font-medium whitespace-nowrap">{student.name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{student.email}</div>
                                            </td>
                                            <td className="p-2">
                                                <div className="text-xs">{student.department || '-'}</div>
                                                {student.designation && (
                                                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                                        {student.designation}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                {student.status === 'ex' ? (
                                                    <Badge variant="secondary">Ex-User</Badge>
                                                ) : student.status === 'suspended' ? (
                                                    <Badge variant="destructive">Suspended</Badge>
                                                ) : (
                                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                                                )}
                                            </td>
                                            <td className="p-2 font-bold whitespace-nowrap">
                                                <span className={student.balance < 0 ? 'text-red-600' : 'text-green-600'}>
                                                    {student.balance} TK
                                                </span>
                                            </td>
                                            <td className="p-2 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-amber-600"
                                                        onClick={() => toggleStatus(student)}
                                                        title={student.status === 'ex' ? "Reactivate" : "Mark as Ex-User"}
                                                    >
                                                        {student.status === 'ex' ? <UserCheck className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(student)}
                                                        title="Edit Details"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600"
                                                        onClick={() => handleDeposit(student)}
                                                        title="Deposit Balance"
                                                    >
                                                        <Wallet className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan={memberType === 'student' ? 9 : 7} className="p-4 text-center text-muted-foreground">
                                                No {memberTypeTitle.toLowerCase()} found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <EditStudentModal
                student={selectedStudent}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
            />
            <DepositBalanceModal
                student={selectedStudent}
                open={depositModalOpen}
                onOpenChange={setDepositModalOpen}
            />
        </AppLayout>
    );
}
