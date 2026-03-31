<!DOCTYPE html>
<html>
<head>
    <title>Student List</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin-bottom: 20px; }
        .hall-name { font-size: 18px; font-bold: bold; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="hall-name">{{ $hall->name ?? 'Student List' }}</div>
        <div>BAUST Hall Meal Management System</div>
        <div>Student List - Date: {{ $date }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 15%">UID</th>
                <th style="width: 10%">Room</th>
                <th style="width: 20%">Student ID</th>
                <th>Name</th>
                <th style="width: 10%">Dept</th>
                <th style="width: 10%">Batch</th>
            </tr>
        </thead>
        <tbody>
            @foreach($students as $student)
                <tr>
                    <td style="font-family: monospace;">{{ $student->user->unique_id }}</td>
                    <td>{{ $student->room_number }}</td>
                    <td>{{ $student->student_id }}</td>
                    <td>{{ $student->user->name }}</td>
                    <td>{{ $student->department }}</td>
                    <td>{{ $student->batch }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Generated on {{ now()->format('d/m/Y H:i:s') }}
    </div>
</body>
</html>
