"""
Excel Exporter for School Timetable
Generates beautifully formatted Excel spreadsheets for:
- Master Morning Schedule
- Master Afternoon Schedule
- Teacher Workload Analysis
- Subject Teachers Directory (បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា)
"""

import io
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_styled_excel(data, teacher_names_map=None, custom_teachers=None):
    """
    Creates an Excel workbook with styled sheets from timetable data.
    Returns bytes buffer of the .xlsx file.
    """
    if teacher_names_map is None:
        teacher_names_map = {}
    if custom_teachers is None:
        custom_teachers = {}

    wb = openpyxl.Workbook()
    default_sheet = wb.active
    wb.remove(default_sheet)

    # Fonts
    font_title = Font(name='Kantumruy Pro', size=14, bold=True, color='1E3A8A')
    font_subtitle = Font(name='Kantumruy Pro', size=11, bold=True, color='374151')
    font_header = Font(name='Kantumruy Pro', size=10, bold=True, color='FFFFFF')
    font_sub_header = Font(name='Kantumruy Pro', size=9, bold=True, color='1F2937')
    font_cell = Font(name='Kantumruy Pro', size=10, bold=False, color='111827')
    font_cell_bold = Font(name='Kantumruy Pro', size=10, bold=True, color='111827')

    # Fills
    fill_primary = PatternFill(start_color='1E40AF', end_color='1E40AF', fill_type='solid') # Blue 800
    fill_day_header = PatternFill(start_color='3B82F6', end_color='3B82F6', fill_type='solid') # Blue 500
    fill_sub_header = PatternFill(start_color='E0E7FF', end_color='E0E7FF', fill_type='solid') # Indigo 100
    fill_class = PatternFill(start_color='F3F4F6', end_color='F3F4F6', fill_type='solid') # Gray 100
    fill_labor = PatternFill(start_color='FED7AA', end_color='FED7AA', fill_type='solid') # Orange 200
    fill_zebra = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')

    thin_border_side = Side(style='thin', color='D1D5DB')
    thick_border_side = Side(style='medium', color='1F2937')
    border_cell = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    border_day_sep = Border(left=thick_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)

    align_center = Alignment(horizontal='center', vertical='center', wrap_text=True)
    align_left = Alignment(horizontal='left', vertical='center')
    align_right = Alignment(horizontal='right', vertical='center')

    subj_colors = {
        'K': PatternFill(start_color='FEE2E2', end_color='FEE2E2', fill_type='solid'), # Red
        'M': PatternFill(start_color='DBEAFE', end_color='DBEAFE', fill_type='solid'), # Blue
        'P': PatternFill(start_color='E0E7FF', end_color='E0E7FF', fill_type='solid'), # Indigo
        'C': PatternFill(start_color='FEF3C7', end_color='FEF3C7', fill_type='solid'), # Amber
        'B': PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid'), # Green
        'Es': PatternFill(start_color='CCFBF1', end_color='CCFBF1', fill_type='solid'), # Teal
        'H': PatternFill(start_color='FFEDD5', end_color='FFEDD5', fill_type='solid'), # Orange
        'G': PatternFill(start_color='ECFCCB', end_color='ECFCCB', fill_type='solid'), # Lime
        'I': PatternFill(start_color='FAE8FF', end_color='FAE8FF', fill_type='solid'), # Fuchsia
        'Ed': PatternFill(start_color='F3E8FF', end_color='F3E8FF', fill_type='solid'), # Purple
        'En': PatternFill(start_color='FCE7F3', end_color='FCE7F3', fill_type='solid'), # Pink
        'Em': PatternFill(start_color='F1F5F9', end_color='F1F5F9', fill_type='solid'), # Slate
    }

    def get_subject_fill(code):
        if not code or code == 'ពលកម្ម':
            return None
        for prefix in ['Ed', 'En', 'Es', 'Em', 'K', 'M', 'P', 'C', 'B', 'H', 'G', 'I']:
            if code.startswith(prefix):
                return subj_colors.get(prefix)
        return None

    # -------------------------------------------------------------
    # 1. SHEET: ពេលព្រឹក (Master Morning)
    # -------------------------------------------------------------
    ws_m = wb.create_sheet(title='កាលវិភាគពេលព្រឹក')
    ws_m.views.sheetView[0].showGridLines = True

    ws_m.merge_cells('A1:AC1')
    ws_m['A1'] = f"{data['school_info']['ministry']} - {data['school_info']['school_name']}"
    ws_m['A1'].font = font_subtitle
    ws_m['A1'].alignment = align_center

    ws_m.merge_cells('A2:AC2')
    ws_m['A2'] = f"កាលវិភាគប្រចាំសប្ដាហ៍ ឆ្នាំសិក្សា {data['school_info']['academic_year']} (ពេលព្រឹក)"
    ws_m['A2'].font = font_title
    ws_m['A2'].alignment = align_center

    ws_m['A4'] = 'ថ្នាក់'
    ws_m['A4'].font = font_header
    ws_m['A4'].fill = fill_primary
    ws_m['A4'].alignment = align_center
    ws_m['A4'].border = border_cell

    ws_m['A5'] = 'ម៉ោង'
    ws_m['A5'].font = font_sub_header
    ws_m['A5'].fill = fill_sub_header
    ws_m['A5'].alignment = align_center
    ws_m['A5'].border = border_cell

    col_idx = 2
    for day_info in data['time_slots']['morning']:
        day_name = day_info['day']
        periods = day_info['periods']
        start_col = col_idx
        end_col = col_idx + len(periods) - 1

        ws_m.merge_cells(start_row=4, start_column=start_col, end_row=4, end_column=end_col)
        cell = ws_m.cell(row=4, column=start_col)
        cell.value = day_name
        cell.font = font_header
        cell.fill = fill_day_header
        cell.alignment = align_center

        for p_idx, period_str in enumerate(periods):
            c = ws_m.cell(row=5, column=col_idx)
            c.value = period_str
            c.font = font_sub_header
            c.fill = fill_sub_header
            c.alignment = align_center
            c.border = border_day_sep if p_idx == 0 else border_cell
            col_idx += 1

    ws_m.merge_cells(start_row=4, start_column=col_idx, end_row=5, end_column=col_idx)
    hr_cell = ws_m.cell(row=4, column=col_idx)
    hr_cell.value = 'នាមគ្រូបន្ទុកថ្នាក់'
    hr_cell.font = font_header
    hr_cell.fill = fill_primary
    hr_cell.alignment = align_center
    hr_col_idx = col_idx

    row_idx = 6
    for cls in data['classes']:
        cls_id = cls['id']
        c_cell = ws_m.cell(row=row_idx, column=1)
        c_cell.value = cls_id
        c_cell.font = font_cell_bold
        c_cell.fill = fill_class
        c_cell.alignment = align_center
        c_cell.border = border_cell

        slots = data['morning_schedule'].get(cls_id, [])
        c_col = 2
        slot_counter = 0

        for day_info in data['time_slots']['morning']:
            day_periods = len(day_info['periods'])
            for p_i in range(day_periods):
                code = slots[slot_counter] if slot_counter < len(slots) else ''
                cell = ws_m.cell(row=row_idx, column=c_col)
                cell.value = code
                cell.font = font_cell_bold if code else font_cell
                cell.alignment = align_center

                s_fill = get_subject_fill(code)
                if s_fill:
                    cell.fill = s_fill
                elif row_idx % 2 == 1:
                    cell.fill = fill_zebra

                cell.border = border_day_sep if p_i == 0 else border_cell
                c_col += 1
                slot_counter += 1

        hr_c = ws_m.cell(row=row_idx, column=hr_col_idx)
        hr_c.value = cls['homeroom']
        hr_c.font = font_cell
        hr_c.alignment = align_left
        hr_c.border = border_cell
        row_idx += 1

    ws_m.column_dimensions['A'].width = 8
    for i in range(2, hr_col_idx):
        col_letter = get_column_letter(i)
        ws_m.column_dimensions[col_letter].width = 6.5
    ws_m.column_dimensions[get_column_letter(hr_col_idx)].width = 20

    # -------------------------------------------------------------
    # 2. SHEET: ពេលរសៀល (Master Afternoon)
    # -------------------------------------------------------------
    ws_a = wb.create_sheet(title='កាលវិភាគពេលរសៀល')
    ws_a.views.sheetView[0].showGridLines = True

    ws_a.merge_cells('A1:Z1')
    ws_a['A1'] = f"{data['school_info']['ministry']} - {data['school_info']['school_name']}"
    ws_a['A1'].font = font_subtitle
    ws_a['A1'].alignment = align_center

    ws_a.merge_cells('A2:Z2')
    ws_a['A2'] = f"កាលវិភាគប្រចាំសប្ដាហ៍ ឆ្នាំសិក្សា {data['school_info']['academic_year']} (ពេលរសៀល)"
    ws_a['A2'].font = font_title
    ws_a['A2'].alignment = align_center

    ws_a['A4'] = 'ថ្នាក់'
    ws_a['A4'].font = font_header
    ws_a['A4'].fill = fill_primary
    ws_a['A4'].alignment = align_center
    ws_a['A4'].border = border_cell

    ws_a['A5'] = 'ម៉ោង'
    ws_a['A5'].font = font_sub_header
    ws_a['A5'].fill = fill_sub_header
    ws_a['A5'].alignment = align_center
    ws_a['A5'].border = border_cell

    col_idx = 2
    thu_start_col = None
    thu_end_col = None

    for day_info in data['time_slots']['afternoon']:
        day_name = day_info['day']
        periods = day_info['periods']
        start_col = col_idx
        end_col = col_idx + len(periods) - 1

        if day_info['day_key'] == 'Thu':
            thu_start_col = start_col
            thu_end_col = end_col

        ws_a.merge_cells(start_row=4, start_column=start_col, end_row=4, end_column=end_col)
        cell = ws_a.cell(row=4, column=start_col)
        cell.value = day_name
        cell.font = font_header
        cell.fill = fill_day_header
        cell.alignment = align_center

        for p_idx, period_str in enumerate(periods):
            c = ws_a.cell(row=5, column=col_idx)
            c.value = period_str
            c.font = font_sub_header
            c.fill = fill_sub_header
            c.alignment = align_center
            c.border = border_day_sep if p_idx == 0 else border_cell
            col_idx += 1

    ws_a.merge_cells(start_row=4, start_column=col_idx, end_row=5, end_column=col_idx)
    hr_cell_a = ws_a.cell(row=4, column=col_idx)
    hr_cell_a.value = 'នាមគ្រូបន្ទុកថ្នាក់'
    hr_cell_a.font = font_header
    hr_cell_a.fill = fill_primary
    hr_cell_a.alignment = align_center
    hr_col_idx_a = col_idx

    row_idx = 6
    for cls in data['classes']:
        cls_id = cls['id']
        c_cell = ws_a.cell(row=row_idx, column=1)
        c_cell.value = cls_id
        c_cell.font = font_cell_bold
        c_cell.fill = fill_class
        c_cell.alignment = align_center
        c_cell.border = border_cell

        slots = data['afternoon_schedule'].get(cls_id, [])
        c_col = 2
        slot_counter = 0

        for day_info in data['time_slots']['afternoon']:
            day_periods = len(day_info['periods'])
            for p_i in range(day_periods):
                code = slots[slot_counter] if slot_counter < len(slots) else ''
                cell = ws_a.cell(row=row_idx, column=c_col)

                if code == 'ពលកម្ម':
                    cell.value = ''
                    cell.fill = fill_labor
                else:
                    cell.value = code
                    s_fill = get_subject_fill(code)
                    if s_fill:
                        cell.fill = s_fill
                    elif row_idx % 2 == 1:
                        cell.fill = fill_zebra

                cell.font = font_cell_bold if code else font_cell
                cell.alignment = align_center
                cell.border = border_day_sep if p_i == 0 else border_cell
                c_col += 1
                slot_counter += 1

        hr_c = ws_a.cell(row=row_idx, column=hr_col_idx_a)
        hr_c.value = cls['homeroom']
        hr_c.font = font_cell
        hr_c.alignment = align_left
        hr_c.border = border_cell
        row_idx += 1

    if thu_start_col and thu_end_col:
        ws_a.merge_cells(start_row=6, start_column=thu_start_col, end_row=row_idx - 1, end_column=thu_end_col)
        labor_cell = ws_a.cell(row=6, column=thu_start_col)
        labor_cell.value = 'ពលកម្ម'
        labor_cell.font = Font(name='Kantumruy Pro', size=16, bold=True, color='9A3412')
        labor_cell.fill = fill_labor
        labor_cell.alignment = align_center

    ws_a.column_dimensions['A'].width = 8
    for i in range(2, hr_col_idx_a):
        col_letter = get_column_letter(i)
        ws_a.column_dimensions[col_letter].width = 6.5
    ws_a.column_dimensions[get_column_letter(hr_col_idx_a)].width = 20

    # -------------------------------------------------------------
    # 3. SHEET: បន្ទុកម៉ោងគ្រូបង្រៀន (Teacher Workload Summary)
    # -------------------------------------------------------------
    ws_stat = wb.create_sheet(title='បន្ទុកម៉ោងគ្រូបង្រៀន')
    ws_stat.views.sheetView[0].showGridLines = True

    ws_stat.merge_cells('A1:I1')
    ws_stat['A1'] = "តារាងវិភាគ និងសង្ខេបបន្ទុកម៉ោងបង្រៀនរបស់គ្រូ (Weekly Teaching Hours Summary)"
    ws_stat['A1'].font = font_title
    ws_stat['A1'].alignment = align_center

    headers_stat = ['ល.រ', 'កូដគ្រូ', 'មុខវិជ្ជា', 'ឈ្មោះគ្រូបង្រៀន', 'ម៉ោងព្រឹក', 'ម៉ោងរសៀល', 'សរុបម៉ោង/សប្ដាហ៍', 'ថ្នាក់ដែលត្រូវបង្រៀន', 'ស្ថានភាពបន្ទុក']
    for col_i, h_text in enumerate(headers_stat, start=1):
        c = ws_stat.cell(row=3, column=col_i)
        c.value = h_text
        c.font = font_header
        c.fill = fill_primary
        c.alignment = align_center
        c.border = border_cell

    teacher_stats = {}
    for c_id, slots in data['morning_schedule'].items():
        for code in slots:
            if code:
                if code not in teacher_stats:
                    teacher_stats[code] = {'morning': 0, 'afternoon': 0, 'classes': set()}
                teacher_stats[code]['morning'] += 1
                teacher_stats[code]['classes'].add(c_id)

    for c_id, slots in data['afternoon_schedule'].items():
        for code in slots:
            if code and code != 'ពលកម្ម':
                if code not in teacher_stats:
                    teacher_stats[code] = {'morning': 0, 'afternoon': 0, 'classes': set()}
                teacher_stats[code]['afternoon'] += 1
                teacher_stats[code]['classes'].add(c_id)

    row_s = 4
    total_m_all = 0
    total_a_all = 0
    total_all = 0

    for idx, code in enumerate(sorted(teacher_stats.keys()), start=1):
        st = teacher_stats[code]
        m = st['morning']
        a = st['afternoon']
        tot = m + a
        total_m_all += m
        total_a_all += a
        total_all += tot

        subj_key = ''
        for p in ['Ed', 'En', 'Es', 'Em', 'K', 'M', 'P', 'C', 'B', 'H', 'G', 'I']:
            if code.startswith(p):
                subj_key = p
                break
        subj_name = data['subjects'].get(subj_key, {}).get('name', 'ផ្សេងៗ')
        teacher_name = teacher_names_map.get(code, f'គ្រូ {code}')
        cls_str = ', '.join(sorted(st['classes']))

        if tot >= 18:
            status_text = 'ពេញបន្ទុក (Standard)'
        elif tot >= 14:
            status_text = 'មធ្យម (Normal)'
        else:
            status_text = 'បន្ទុកស្រាល (Light)'

        row_vals = [idx, code, subj_name, teacher_name, m, a, tot, cls_str, status_text]
        for col_i, val in enumerate(row_vals, start=1):
            c = ws_stat.cell(row=row_s, column=col_i)
            c.value = val
            c.font = font_cell_bold if col_i in [2, 7] else font_cell
            c.alignment = align_center if col_i in [1, 2, 5, 6, 7, 9] else align_left
            c.border = border_cell
            if row_s % 2 == 1:
                c.fill = fill_zebra

        row_s += 1

    ws_stat.merge_cells(start_row=row_s, start_column=1, end_row=row_s, end_column=4)
    tot_lbl = ws_stat.cell(row=row_s, column=1)
    tot_lbl.value = 'សរុបម៉ោងបង្រៀនទាំងអស់ទូទាំងសាលា'
    tot_lbl.font = font_header
    tot_lbl.fill = fill_day_header
    tot_lbl.alignment = align_center

    for ci, tv in [(5, total_m_all), (6, total_a_all), (7, total_all)]:
        tc = ws_stat.cell(row=row_s, column=ci)
        tc.value = tv
        tc.font = font_header
        tc.fill = fill_day_header
        tc.alignment = align_center
        tc.border = border_cell

    ws_stat.merge_cells(start_row=row_s, start_column=8, end_row=row_s, end_column=9)
    end_lbl = ws_stat.cell(row=row_s, column=8)
    end_lbl.value = f"គ្រូសរុប {len(teacher_stats)} នាក់/កូដ"
    end_lbl.font = font_header
    end_lbl.fill = fill_day_header
    end_lbl.alignment = align_center

    ws_stat.column_dimensions['A'].width = 6
    ws_stat.column_dimensions['B'].width = 10
    ws_stat.column_dimensions['C'].width = 24
    ws_stat.column_dimensions['D'].width = 22
    ws_stat.column_dimensions['E'].width = 12
    ws_stat.column_dimensions['F'].width = 12
    ws_stat.column_dimensions['G'].width = 16
    ws_stat.column_dimensions['H'].width = 35
    ws_stat.column_dimensions['I'].width = 20

    # -------------------------------------------------------------
    # 4. SHEET: បញ្ជីរាយនាមគ្រូបង្រៀនតាមមុខវិជ្ជា (Subject Teachers Directory)
    # -------------------------------------------------------------
    ws_dir = wb.create_sheet(title='បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា')
    ws_dir.views.sheetView[0].showGridLines = True

    ws_dir.merge_cells('A1:J1')
    ws_dir['A1'] = f"{data['school_info']['ministry']} - {data['school_info']['school_name']}"
    ws_dir['A1'].font = font_subtitle
    ws_dir['A1'].alignment = align_center

    ws_dir.merge_cells('A2:J2')
    ws_dir['A2'] = f"បញ្ជីរាយនាមលោកគ្រូ-អ្នកគ្រូតាមមុខវិជ្ជា ឆ្នាំសិក្សា {data['school_info']['academic_year']}"
    ws_dir['A2'].font = font_title
    ws_dir['A2'].alignment = align_center

    headers_dir = ['ល.រ', 'កូដ', 'គោត្តនាម និងនាម', 'ភេទ', 'មុខវិជ្ជាឯកទេស', 'ម៉ោងព្រឹក', 'ម៉ោងរសៀល', 'ម៉ោងសរុប', 'គ្រូបន្ទុកថ្នាក់', 'លេខទូរស័ព្ទ']
    for col_i, h_text in enumerate(headers_dir, start=1):
        c = ws_dir.cell(row=4, column=col_i)
        c.value = h_text
        c.font = font_header
        c.fill = fill_primary
        c.alignment = align_center
        c.border = border_cell

    row_d = 5
    for idx, code in enumerate(sorted(teacher_stats.keys()), start=1):
        st = teacher_stats[code]
        m = st['morning']
        a = st['afternoon']
        tot = m + a

        subj_key = ''
        for p in ['Ed', 'En', 'Es', 'Em', 'K', 'M', 'P', 'C', 'B', 'H', 'G', 'I']:
            if code.startswith(p):
                subj_key = p
                break
        subj_name = data['subjects'].get(subj_key, {}).get('name', 'ផ្សេងៗ')

        c_info = custom_teachers.get(code, {})
        t_name = c_info.get('name', teacher_names_map.get(code, f'គ្រូ {code}'))
        t_gender = c_info.get('gender', 'ប្រុស')
        t_phone = c_info.get('phone', '')
        t_hr = c_info.get('homeroom_class', '')

        # Check if this teacher is assigned as homeroom in classes
        for cls in data['classes']:
            if cls['homeroom'] and cls['homeroom'] == t_name:
                t_hr = cls['id']
                break

        vals = [idx, code, t_name, t_gender, subj_name, m, a, tot, f"ថ្នាក់ {t_hr}" if t_hr else '-', t_phone]
        for col_i, val in enumerate(vals, start=1):
            c = ws_dir.cell(row=row_d, column=col_i)
            c.value = val
            c.font = font_cell_bold if col_i in [2, 3, 8] else font_cell
            c.alignment = align_center if col_i in [1, 2, 4, 6, 7, 8, 9] else align_left
            c.border = border_cell
            if row_d % 2 == 1:
                c.fill = fill_zebra
        row_d += 1

    ws_dir.column_dimensions['A'].width = 6
    ws_dir.column_dimensions['B'].width = 10
    ws_dir.column_dimensions['C'].width = 24
    ws_dir.column_dimensions['D'].width = 10
    ws_dir.column_dimensions['E'].width = 24
    ws_dir.column_dimensions['F'].width = 12
    ws_dir.column_dimensions['G'].width = 12
    ws_dir.column_dimensions['H'].width = 14
    ws_dir.column_dimensions['I'].width = 18
    ws_dir.column_dimensions['J'].width = 18

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)
    return bio.getvalue()
