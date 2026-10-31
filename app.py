"""
Flask Web Application for School Timetable Management & Decomposer
(កម្មវិធីបែងចែក និងគ្រប់គ្រងកាលវិភាគបង្រៀនគ្រូ)
"""

import os
import sys
import json
from collections import defaultdict
from flask import Flask, render_template, jsonify, request, send_file, Response
from excel_exporter import create_styled_excel

# Reconfigure stdout for utf-8 on Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'schedule_data.json')
CUSTOM_TEACHERS_FILE = os.path.join(BASE_DIR, 'data', 'custom_teachers.json')
CUSTOM_HOMEROOM_FILE = os.path.join(BASE_DIR, 'data', 'custom_homeroom.json')

def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Apply custom homeroom if available
    custom_hr = load_custom_homeroom()
    for cls in data['classes']:
        if cls['id'] in custom_hr:
            cls['homeroom'] = custom_hr[cls['id']]

    return data

def load_custom_homeroom():
    if os.path.exists(CUSTOM_HOMEROOM_FILE):
        try:
            with open(CUSTOM_HOMEROOM_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_custom_homeroom(homeroom_map):
    current = load_custom_homeroom()
    current.update(homeroom_map)
    with open(CUSTOM_HOMEROOM_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, ensure_ascii=False, indent=2)

def load_custom_teachers():
    if os.path.exists(CUSTOM_TEACHERS_FILE):
        try:
            with open(CUSTOM_TEACHERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_custom_teachers(teachers_map):
    current = load_custom_teachers()
    current.update(teachers_map)
    with open(CUSTOM_TEACHERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, ensure_ascii=False, indent=2)

def calculate_teacher_details(data, custom_teachers):
    """
    Computes for every teacher code:
    - subject info
    - morning & afternoon slot coordinates
    - classes taught
    - hours summary
    """
    morning_sched = data['morning_schedule']
    afternoon_sched = data['afternoon_schedule']
    subjects_map = data['subjects']

    teachers = {}

    def get_subject_key(code):
        for p in ['Ed', 'En', 'Es', 'Em', 'K', 'M', 'P', 'C', 'B', 'H', 'G', 'I']:
            if code.startswith(p):
                return p
        return ''

    # Morning slots mapping
    m_day_info = data['time_slots']['morning']
    m_slot_meta = []
    idx = 0
    for day in m_day_info:
        for p in day['periods']:
            m_slot_meta.append({'day': day['day'], 'day_key': day['day_key'], 'period': p, 'index': idx})
            idx += 1

    a_day_info = data['time_slots']['afternoon']
    a_slot_meta = []
    idx = 0
    for day in a_day_info:
        for p in day['periods']:
            a_slot_meta.append({'day': day['day'], 'day_key': day['day_key'], 'period': p, 'index': idx})
            idx += 1

    # Scan morning schedule
    for cls_id, slots in morning_sched.items():
        for s_idx, code in enumerate(slots):
            if code:
                if code not in teachers:
                    s_key = get_subject_key(code)
                    s_obj = subjects_map.get(s_key, {'name': 'ផ្សេងៗ', 'short': code, 'color': '#f3f4f6', 'text_color': '#1f2937', 'border': '#d1d5db'})
                    custom_info = custom_teachers.get(code, {})
                    teachers[code] = {
                        'code': code,
                        'name': custom_info.get('name', f'គ្រូ {code}'),
                        'gender': custom_info.get('gender', 'ប្រុស'),
                        'phone': custom_info.get('phone', ''),
                        'homeroom_class': custom_info.get('homeroom_class', ''),
                        'note': custom_info.get('note', ''),
                        'subject_key': s_key,
                        'subject_name': s_obj.get('name', ''),
                        'subject_short': s_obj.get('short', ''),
                        'subject_color': s_obj.get('color', '#f3f4f6'),
                        'subject_text_color': s_obj.get('text_color', '#1f2937'),
                        'subject_border': s_obj.get('border', '#d1d5db'),
                        'morning_hours': 0,
                        'afternoon_hours': 0,
                        'total_hours': 0,
                        'classes': set(),
                        'morning_slots': {},
                        'afternoon_slots': {},
                        'is_custom': False
                    }
                t = teachers[code]
                t['morning_hours'] += 1
                t['classes'].add(cls_id)
                meta = m_slot_meta[s_idx]
                d = meta['day']
                p = meta['period']
                if d not in t['morning_slots']:
                    t['morning_slots'][d] = {}
                t['morning_slots'][d][p] = cls_id

    # Scan afternoon schedule
    for cls_id, slots in afternoon_sched.items():
        for s_idx, code in enumerate(slots):
            if code and code != 'ពលកម្ម':
                if code not in teachers:
                    s_key = get_subject_key(code)
                    s_obj = subjects_map.get(s_key, {'name': 'ផ្សេងៗ', 'short': code, 'color': '#f3f4f6', 'text_color': '#1f2937', 'border': '#d1d5db'})
                    custom_info = custom_teachers.get(code, {})
                    teachers[code] = {
                        'code': code,
                        'name': custom_info.get('name', f'គ្រូ {code}'),
                        'gender': custom_info.get('gender', 'ប្រុស'),
                        'phone': custom_info.get('phone', ''),
                        'homeroom_class': custom_info.get('homeroom_class', ''),
                        'note': custom_info.get('note', ''),
                        'subject_key': s_key,
                        'subject_name': s_obj.get('name', ''),
                        'subject_short': s_obj.get('short', ''),
                        'subject_color': s_obj.get('color', '#f3f4f6'),
                        'subject_text_color': s_obj.get('text_color', '#1f2937'),
                        'subject_border': s_obj.get('border', '#d1d5db'),
                        'morning_hours': 0,
                        'afternoon_hours': 0,
                        'total_hours': 0,
                        'classes': set(),
                        'morning_slots': {},
                        'afternoon_slots': {},
                        'is_custom': False
                    }
                t = teachers[code]
                t['afternoon_hours'] += 1
                t['classes'].add(cls_id)
                meta = a_slot_meta[s_idx]
                d = meta['day']
                p = meta['period']
                if d not in t['afternoon_slots']:
                    t['afternoon_slots'][d] = {}
                t['afternoon_slots'][d][p] = cls_id

    # Check for custom added subject teachers who may not have hours yet
    for code, c_info in custom_teachers.items():
        if code not in teachers:
            s_key = c_info.get('subject_key', get_subject_key(code))
            s_obj = subjects_map.get(s_key, {'name': 'ផ្សេងៗ', 'short': code, 'color': '#f3f4f6', 'text_color': '#1f2937', 'border': '#d1d5db'})
            teachers[code] = {
                'code': code,
                'name': c_info.get('name', f'គ្រូ {code}'),
                'gender': c_info.get('gender', 'ប្រុស'),
                'phone': c_info.get('phone', ''),
                'homeroom_class': c_info.get('homeroom_class', ''),
                'note': c_info.get('note', ''),
                'subject_key': s_key,
                'subject_name': s_obj.get('name', ''),
                'subject_short': s_obj.get('short', ''),
                'subject_color': s_obj.get('color', '#f3f4f6'),
                'subject_text_color': s_obj.get('text_color', '#1f2937'),
                'subject_border': s_obj.get('border', '#d1d5db'),
                'morning_hours': 0,
                'afternoon_hours': 0,
                'total_hours': 0,
                'classes': [],
                'morning_slots': {},
                'afternoon_slots': {},
                'is_custom': True
            }

    # Finalize totals & classes
    for code, t in teachers.items():
        t['total_hours'] = t['morning_hours'] + t['afternoon_hours']
        if isinstance(t['classes'], set):
            t['classes'] = sorted(list(t['classes']))

        # Auto-detect homeroom assignment if teacher name matches class homeroom
        for cls in data['classes']:
            if cls['homeroom'] and cls['homeroom'] == t['name']:
                t['homeroom_class'] = cls['id']
                break

    return teachers

def check_conflicts(data):
    conflicts = []
    morning_sched = data['morning_schedule']
    afternoon_sched = data['afternoon_schedule']
    classes = [c['id'] for c in data['classes']]

    m_day_info = data['time_slots']['morning']
    slot_names_m = []
    for day in m_day_info:
        for p in day['periods']:
            slot_names_m.append(f"ព្រឹក {day['day']} ({p})")

    for s_idx, s_name in enumerate(slot_names_m):
        seen = {}
        for c in classes:
            slots = morning_sched.get(c, [])
            if s_idx < len(slots):
                code = slots[s_idx]
                if code:
                    if code in seen:
                        conflicts.append({
                            'shift': 'morning',
                            'slot': s_name,
                            'teacher_code': code,
                            'class_a': seen[code],
                            'class_b': c
                        })
                    else:
                        seen[code] = c

    a_day_info = data['time_slots']['afternoon']
    slot_names_a = []
    for day in a_day_info:
        for p in day['periods']:
            slot_names_a.append(f"រសៀល {day['day']} ({p})")

    for s_idx, s_name in enumerate(slot_names_a):
        seen = {}
        for c in classes:
            slots = afternoon_sched.get(c, [])
            if s_idx < len(slots):
                code = slots[s_idx]
                if code and code != 'ពលកម្ម':
                    if code in seen:
                        conflicts.append({
                            'shift': 'afternoon',
                            'slot': s_name,
                            'teacher_code': code,
                            'class_a': seen[code],
                            'class_b': c
                        })
                    else:
                        seen[code] = c

    return conflicts

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    data = load_data()
    custom_teachers = load_custom_teachers()
    teachers = calculate_teacher_details(data, custom_teachers)
    conflicts = check_conflicts(data)

    total_m_hours = sum(t['morning_hours'] for t in teachers.values())
    total_a_hours = sum(t['afternoon_hours'] for t in teachers.values())

    return jsonify({
        'status': 'success',
        'school_info': data['school_info'],
        'subjects': data['subjects'],
        'classes': data['classes'],
        'time_slots': data['time_slots'],
        'morning_schedule': data['morning_schedule'],
        'afternoon_schedule': data['afternoon_schedule'],
        'teachers': teachers,
        'conflicts': conflicts,
        'stats': {
            'total_teachers': len(teachers),
            'total_classes': len(data['classes']),
            'morning_hours_total': total_m_hours,
            'afternoon_hours_total': total_a_hours,
            'all_hours_total': total_m_hours + total_a_hours,
            'conflicts_count': len(conflicts)
        }
    })

@app.route('/api/save-homeroom', methods=['POST'])
def save_homeroom():
    """
    Saves homeroom teacher for a single class or batch of classes.
    Payload: {"class_id": "12A", "homeroom": "ឈ្មោះគ្រូ"}
    or: {"homeroom_map": {"12A": "...", "12B": "..."}}
    """
    payload = request.json or {}
    if 'homeroom_map' in payload:
        save_custom_homeroom(payload['homeroom_map'])
    elif 'class_id' in payload and 'homeroom' in payload:
        save_custom_homeroom({payload['class_id']: payload['homeroom'].strip()})
    else:
        return jsonify({'status': 'error', 'message': 'ទិន្នន័យមិនត្រឹមត្រូវ'}), 400

    return jsonify({'status': 'success', 'message': 'បានកែប្រែ និងរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់រួចរាល់'})

@app.route('/api/save-teacher-profiles', methods=['POST'])
def save_teachers():
    """
    Saves profile updates for one or more teachers.
    """
    payload = request.json or {}
    custom_map = load_custom_teachers()
    for code, info in payload.items():
        if code not in custom_map:
            custom_map[code] = {}
        if isinstance(info, dict):
            custom_map[code].update(info)
        elif isinstance(info, str):
            custom_map[code]['name'] = info

    save_custom_teachers(custom_map)
    return jsonify({'status': 'success', 'message': 'រក្សាទុកព័ត៌មានគ្រូបង្រៀនរួចរាល់'})

@app.route('/api/add-subject-teacher', methods=['POST'])
def add_subject_teacher():
    """
    Adds a new teacher to the subject directory.
    Payload: {"code": "K6", "name": "...", "gender": "ប្រុស", "subject_key": "K", "phone": "...", "homeroom_class": "...", "note": "..."}
    """
    payload = request.json or {}
    code = payload.get('code', '').strip().upper()
    name = payload.get('name', '').strip()

    if not code or not name:
        return jsonify({'status': 'error', 'message': 'សូមបញ្ចូលកូដ និងឈ្មោះគ្រូបង្រៀន!'}), 400

    custom_map = load_custom_teachers()
    custom_map[code] = {
        'name': name,
        'gender': payload.get('gender', 'ប្រុស'),
        'subject_key': payload.get('subject_key', 'K'),
        'phone': payload.get('phone', ''),
        'homeroom_class': payload.get('homeroom_class', ''),
        'note': payload.get('note', '')
    }
    save_custom_teachers(custom_map)
    return jsonify({'status': 'success', 'message': f'បានបន្ថែមគ្រូ {name} ({code}) ទៅក្នុងបញ្ជីជោគជ័យ'})

@app.route('/api/delete-subject-teacher', methods=['POST'])
def delete_subject_teacher():
    """
    Deletes a custom added subject teacher.
    """
    payload = request.json or {}
    code = payload.get('code', '').strip()

    custom_map = load_custom_teachers()
    if code in custom_map:
        del custom_map[code]
        with open(CUSTOM_TEACHERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(custom_map, f, ensure_ascii=False, indent=2)
        return jsonify({'status': 'success', 'message': f'បានលុបគ្រូ {code} រួចរាល់'})

    return jsonify({'status': 'error', 'message': 'រកមិនឃើញគ្រូដែលត្រូវលុប'}), 404

@app.route('/api/export-excel')
def export_excel():
    data = load_data()
    custom_teachers = load_custom_teachers()
    t_map = {code: info.get('name', f'គ្រូ {code}') for code, info in custom_teachers.items()}
    excel_bytes = create_styled_excel(data, t_map, custom_teachers)

    filename_ascii = "timetable_2026_2027.xlsx"
    return Response(
        excel_bytes,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename_ascii}"'}
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f">> Starting Timetable Management Server at http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
