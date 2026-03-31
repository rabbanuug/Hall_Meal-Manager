<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            color: #333;
            margin: 0;
            padding: 0;
        }

        .header {
            text-align: center;
            margin-bottom: 5px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }

        .hall-name {
            font-size: 20px;
            font-weight: normal;
            display: block;
        }

        .meal-type-title {
            font-size: 18px;
            font-weight: normal;
            display: block;
            text-transform: capitalize;
        }

        .header-date {
            font-size: 11px;
            color: #777;
            display: block;
            margin-top: 5px;
        }

        .section-title {
            text-align: center;
            font-size: 18px;
            margin: 15px 0 10px 0;
        }

        .student-grid {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .student-grid td {
            width: 16.66%;
            padding: 2px 5px;
            vertical-align: top;
        }

        .student-item {
            display: block;
        }

        .bullet {
            display: inline-block;
            width: 5px;
            height: 5px;
            background: #000;
            border-radius: 50%;
            margin-right: 5px;
            vertical-align: middle;
        }

        .others-list {
            list-style: none;
            padding: 0;
            margin: 0 auto;
            width: 80%;
            border: 1px solid #ccc;
            padding: 10px;
        }

        .others-list li {
            margin-bottom: 5px;
            font-size: 14px;
        }

        .totals {
            margin-top: 20px;
            padding-left: 20px;
        }

        .signatures {
            margin-top: 50px;
            padding-left: 20px;
        }

        .sig-line {
            margin-bottom: 15px;
        }

        .page-break {
            page-break-after: always;
        }

        .grand-totals {
            font-weight: bold;
            font-size: 16px;
            margin-top: 25px;
            padding-left: 20px;
        }
    </style>
</head>

<body>
    @foreach($data as $mealType => $mealData)
        @if($mealData['total_count'] > 0)
            <div class="{{ $loop->last ? '' : 'page-break' }}">
                <div class="header">
                    <span class="hall-name">{{ $hall->name }}</span>
                    <span class="meal-type-title">{{ \App\Models\MealBooking::getMealAlias($mealType) }} ({{ \Carbon\Carbon::parse($date)->format('d M Y') }})</span>
                    <span class="header-date">Printed at: {{ \Carbon\Carbon::now()->format('D M d Y H:i:s') }}</span>
                </div>

                <div class="section-title">
                    Students Meals[Total: {{ $mealData['students']->count() }} 
                    (m-{{ $mealData['student_mutton'] }}, b-{{ $mealData['student_beef'] }})]
                </div>

                <table class="student-grid">
                    @php
                        $students = $mealData['students']->values();
                        $colCount = 6;
                        $rowCount = ceil($students->count() / $colCount);
                    @endphp
                    @for($i = 0; $i < $rowCount; $i++)
                        <tr>
                            @for($j = 0; $j < $colCount; $j++)
                                @php
                                    $index = $i + ($j * $rowCount);
                                    $student = $students->get($index);
                                @endphp
                                <td>
                                    @if($student)
                                        <div class="student-item">
                                            <span class="bullet"></span>
                                            {{ $student['member_id'] }} [{{ substr($student['meat_preference'], 0, 1) }}{{ $student['quantity'] }}]
                                        </div>
                                    @endif
                                </td>
                            @endfor
                        </tr>
                    @endfor
                </table>

                <div class="section-title" style="margin-top: 30px;">
                    Teachers & Staff Meals[Total: {{ $mealData['others']->count() }} 
                    (m-{{ $mealData['other_mutton'] }}, b-{{ $mealData['other_beef'] }})]
                </div>

                <ul class="others-list">
                    @foreach($mealData['others'] as $other)
                        <li>
                            <span class="bullet"></span>
                            {{ $other['name'] }}, {{ $other['details'] }} [{{ substr($other['meat_preference'], 0, 1) }}{{ $other['quantity'] }}]
                        </li>
                    @endforeach
                </ul>

                <div class="grand-totals">
                    Grand Totals: {{ $mealData['total_count'] }} 
                    (m-{{ $mealData['student_mutton'] + $mealData['other_mutton'] }}, 
                    b-{{ $mealData['student_beef'] + $mealData['other_beef'] }})
                </div>

                <div class="totals">
                    <div class="sig-line">Total number of Extra meals: ____________________</div>
                    <div class="sig-line">Total number of Due meals: ____________________</div>
                </div>

                <div class="signatures">
                    <div class="sig-line">Signature of Food committee: ____________________</div>
                    <div class="sig-line">Signature of Hall Manager: ____________________</div>
                    <div class="sig-line">Signature of Assistant Provost: ____________________</div>
                </div>
            </div>
        @endif
    @endforeach
</body>

</html>