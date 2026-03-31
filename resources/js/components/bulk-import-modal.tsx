import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface ParsedStudent {
    room_number: string;
    student_id: string;
    name: string;
    department: string;
    batch: string;
    is_valid?: boolean;
    [key: string]: any;
}

export default function BulkImportModal({ hallId }: { hallId?: number }) {
    const [open, setOpen] = useState(false);
    const [rawData, setRawData] = useState('');
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [step, setStep] = useState(1);
    const [isImporting, setIsImporting] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [existingIds, setExistingIds] = useState<string[]>([]);

    const parseData = async () => {
        const lines = rawData.trim().split('\n');
        const results: ParsedStudent[] = [];
        let lastRoom = '';

        lines.forEach((line) => {
            const cols = line.split('\t').map((c) => c.trim());
            if (cols[0] === 'Room' || cols[1] === 'Student ID') return;
            if (!cols[1] || !cols[2]) return;

            const room = cols[0] || lastRoom;
            if (room) lastRoom = room;

            let name = cols[2];
            let meatPreference = 'beef';

            if (name.endsWith(' M') || name.endsWith('M')) {
                meatPreference = 'mutton';
                if (name.endsWith(' M')) {
                    name = name.slice(0, -2).trim();
                }
            }

            const studentId = (cols[1] || '').toString();
            const department = cols[3] || '';
            const batch = cols[4] || '';

            // Check if all required fields are present
            const isValid = !!room && !!studentId && !!name && !!department && !!batch;

            results.push({
                room_number: room || '',
                student_id: studentId,
                name: name,
                department: department,
                batch: batch,
                meat_preference: meatPreference,
                is_valid: isValid,
            });
        });

        if (results.length === 0) return;

        // Validate IDs via Axios (handles CSRF automatically)
        setIsValidating(true);
        try {
            const response = await axios.post('/admin/students/bulk-validate', {
                student_ids: results.map(r => r.student_id)
            });
            setExistingIds(response.data.existing_ids || []);
        } catch (error: any) {
            console.error('Validation failed', error.response || error);
            alert('Failed to connect to the server. Please check your network or try again.');
        } finally {
            setIsValidating(false);
        }

        setParsedData(results);
        setStep(2);
    };

    const handleImport = () => {
        setIsImporting(true);
        // Filter out existing ones AND invalid records
        const newData = parsedData.filter(s => s.is_valid && !existingIds.includes(s.student_id));
        
        router.post('/admin/students/bulk', { students: newData, hall_id: hallId }, {
            onSuccess: () => {
                setOpen(false);
                setStep(1);
                setRawData('');
                setExistingIds([]);
                alert('Import successful!');
            },
            onError: (errors) => {
                console.error('Import failed', errors);
                alert('Import partially failed or server error. Some rows might be skipped if data is invalid.');
            },
            onFinish: () => {
                setIsImporting(false);
            }
        });
    };

    const validNewStudents = parsedData.filter(s => s.is_valid && !existingIds.includes(s.student_id));
    const invalidCount = parsedData.filter(s => !s.is_valid).length;
    const newStudentsCount = validNewStudents.length;

    return (
        <Dialog open={open} onOpenChange={isImporting ? undefined : setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Bulk Import</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bulk Import Members</DialogTitle>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-4 py-4 flex-1">
                        <div className="space-y-2 flex flex-col h-full">
                            <Label>Paste data from Excel (Copy columns: Room, Student ID, Name, Dept, Batch)</Label>
                            <textarea
                                className="w-full flex-1 min-h-[400px] p-2 border rounded-md font-mono text-xs"
                                placeholder="Paste here..."
                                value={rawData}
                                onChange={(e) => setRawData(e.target.value)}
                            />
                        </div>
                        <Button onClick={parseData} disabled={!rawData.trim() || isValidating}>
                            {isValidating ? 'Validating...' : 'Next: Preview & Check Duplicates'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
                            <div className="text-sm">
                                <span className="font-bold text-green-600">{newStudentsCount} New entries</span>
                                {invalidCount > 0 && (
                                    <>
                                        <span className="mx-2">|</span>
                                        <span className="font-bold text-orange-600">{invalidCount} Incomplete (Locked)</span>
                                    </>
                                )}
                                <span className="mx-2">|</span>
                                <span className="font-bold text-red-600">{existingIds.length} Duplicates (Will be skipped)</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto border rounded-md">
                            <table className="w-full text-xs">
                                <thead className="bg-muted sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 border-b text-left">Status</th>
                                        <th className="p-2 border-b text-left">Room</th>
                                        <th className="p-2 border-b text-left">Student ID</th>
                                        <th className="p-2 border-b text-left">Name</th>
                                        <th className="p-2 border-b text-left">Dept</th>
                                        <th className="p-2 border-b text-left">Batch</th>
                                        <th className="p-2 border-b text-left">Preference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((s, i) => {
                                        const isExisting = existingIds.includes(s.student_id);
                                        const isValid = s.is_valid;

                                        let statusBadge = null;
                                        let rowClass = 'bg-white';

                                        if (!isValid) {
                                            statusBadge = <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">INCOMPLETE</span>;
                                            rowClass = 'bg-orange-50/50 opacity-80';
                                        } else if (isExisting) {
                                            statusBadge = <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">EXISTING</span>;
                                            rowClass = 'bg-red-50/50 opacity-60';
                                        } else {
                                            statusBadge = <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">NEW</span>;
                                        }

                                        return (
                                            <tr key={i} className={`border-b ${rowClass}`}>
                                                <td className="p-2">{statusBadge}</td>
                                                <td className={`p-2 ${!s.room_number ? 'bg-red-200' : ''}`}>{s.room_number || 'Missing'}</td>
                                                <td className={`p-2 font-mono font-bold ${!s.student_id ? 'bg-red-200' : ''}`}>{s.student_id || 'Missing'}</td>
                                                <td className={`p-2 ${!s.name ? 'bg-red-200' : ''}`}>{s.name || 'Missing'}</td>
                                                <td className={`p-2 ${!s.department ? 'bg-red-200' : ''}`}>{s.department || 'Missing'}</td>
                                                <td className={`p-2 ${!s.batch ? 'bg-red-200' : ''}`}>{s.batch || 'Missing'}</td>
                                                <td className="p-2 capitalize text-[10px] font-bold">
                                                    <span className={s.meat_preference === 'mutton' ? 'text-orange-600' : 'text-green-600'}>
                                                        {s.meat_preference}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleImport} disabled={isImporting || newStudentsCount === 0}>
                                {isImporting ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        Importing...
                                    </>
                                ) : (
                                    `Confirm & Import ${newStudentsCount} New Members`
                                )}
                            </Button>
                            <Button variant="ghost" onClick={() => setStep(1)} disabled={isImporting}>Back to Edit</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
