"""
Google Sheets Database Management Layer
(ម៉ូឌុលតភ្ជាប់ Google Sheets ធ្វើជា Database រួមគ្នាតាមរយៈ Google Apps Script Web App)
"""

import os
import json
import requests
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'data', 'google_sheets_config.json')
DATA_FILE = os.path.join(BASE_DIR, 'data', 'schedule_data.json')
CUSTOM_HOMEROOM_FILE = os.path.join(BASE_DIR, 'data', 'custom_homeroom.json')
CUSTOM_TEACHERS_FILE = os.path.join(BASE_DIR, 'data', 'custom_teachers.json')

DEFAULT_CONFIG = {
    'web_app_url': '',
    'enabled': True,
    'last_synced_at': None
}

def load_google_sheets_config():
    """Loads configuration from environment or config file."""
    # Priority 1: Environment variable
    env_url = os.environ.get('GOOGLE_SHEETS_URL') or os.environ.get('GOOGLE_SHEET_API_URL')
    
    cfg = dict(DEFAULT_CONFIG)
    
    # Priority 2: Config file on disk
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                cfg.update(saved)
        except Exception:
            pass
    elif os.path.exists('/tmp/google_sheets_config.json'):
        try:
            with open('/tmp/google_sheets_config.json', 'r', encoding='utf-8') as f:
                saved = json.load(f)
                cfg.update(saved)
        except Exception:
            pass

    if env_url:
        cfg['web_app_url'] = env_url.strip()

    return cfg

def save_google_sheets_config(cfg):
    """Saves Google Sheets config to disk or /tmp."""
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        try:
            with open('/tmp/google_sheets_config.json', 'w', encoding='utf-8') as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

class GoogleSheetsDB:
    """Manages full CRUD operations with Google Sheets as the cloud database."""

    @staticmethod
    def get_url():
        cfg = load_google_sheets_config()
        return (cfg.get('web_app_url') or '').strip()

    @staticmethod
    def is_configured():
        url = GoogleSheetsDB.get_url()
        return bool(url and url.startswith('http'))

    @staticmethod
    def test_connection(test_url=None):
        url = test_url or GoogleSheetsDB.get_url()
        if not url:
            return {
                'status': 'error',
                'provider': 'Google Sheets',
                'message': 'សូមបញ្ចូល Web App URL របស់ Google Apps Script ជាមុនសិន!'
            }

        try:
            sep = '&' if '?' in url else '?'
            ping_url = f"{url}{sep}action=ping"
            resp = requests.get(ping_url, timeout=12, allow_redirects=True)
            if resp.ok:
                data = resp.json()
                if data.get('status') == 'success':
                    return {
                        'status': 'success',
                        'provider': 'Google Sheets Database',
                        'message': 'បានតភ្ជាប់ទៅកាន់ Google Sheet ដោយជោគជ័យ! ប្រព័ន្ធរួចរាល់សម្រាប់ការចែករំលែកទិន្នន័យ។'
                    }
            return {
                'status': 'error',
                'provider': 'Google Sheets',
                'message': f'ការឆ្លើយតបពី Google Sheet ៖ HTTP {resp.status_code}'
            }
        except Exception as e:
            return {
                'status': 'error',
                'provider': 'Google Sheets',
                'message': f'មិនអាចភ្ជាប់ទៅកាន់ Google Sheet បានទេ ៖ {e}'
            }

    @staticmethod
    def fetch_online_data():
        """
        Fetches full dataset from Google Sheets.
        Returns parsed dict or None if offline/unconfigured.
        """
        url = GoogleSheetsDB.get_url()
        if not url:
            return None

        try:
            sep = '&' if '?' in url else '?'
            req_url = f"{url}{sep}action=getData"
            resp = requests.get(req_url, timeout=15, allow_redirects=True)
            if resp.ok:
                res = resp.json()
                if res.get('status') == 'success':
                    # If full data payload is returned
                    if 'data' in res and isinstance(res['data'], dict) and 'classes' in res['data']:
                        return res['data']
                    
                    # If only overrides are returned, load local base and merge
                    custom_hr = res.get('custom_homeroom')
                    custom_tc = res.get('custom_teachers')
                    if custom_hr or custom_tc:
                        with open(DATA_FILE, 'r', encoding='utf-8') as f:
                            base = json.load(f)
                        base['custom_homeroom'] = custom_hr or {}
                        base['custom_teachers'] = custom_tc or {}
                        for cls in base.get('classes', []):
                            if cls['id'] in base['custom_homeroom']:
                                cls['homeroom'] = base['custom_homeroom'][cls['id']]
                        base['cloud_updated_at'] = res.get('cloud_updated_at', datetime.utcnow().isoformat())
                        return base
        except Exception as e:
            print(f"[GoogleSheetsDB] Error fetching data: {e}")

        return None

    @staticmethod
    def push_online_data(data_payload):
        """Pushes complete timetable database to Google Sheets."""
        url = GoogleSheetsDB.get_url()
        if not url:
            return False

        try:
            data_payload['cloud_updated_at'] = datetime.utcnow().isoformat()
            payload = {
                'action': 'saveAll',
                'full_data': data_payload
            }
            resp = requests.post(url, json=payload, timeout=20, allow_redirects=True)
            if resp.ok:
                res = resp.json()
                return res.get('status') == 'success'
        except Exception as e:
            print(f"[GoogleSheetsDB] Error pushing full data: {e}")

        return False

    @staticmethod
    def push_homeroom(class_id, homeroom, homeroom_map=None):
        """Pushes single or batch homeroom updates to Google Sheets."""
        url = GoogleSheetsDB.get_url()
        if not url:
            return False

        try:
            payload = {
                'action': 'saveHomeroom',
                'class_id': class_id,
                'homeroom': homeroom,
                'homeroom_map': homeroom_map
            }
            resp = requests.post(url, json=payload, timeout=15, allow_redirects=True)
            if resp.ok:
                res = resp.json()
                return res.get('status') == 'success'
        except Exception as e:
            print(f"[GoogleSheetsDB] Error pushing homeroom: {e}")

        return False

    @staticmethod
    def push_teacher(teacher_info):
        """Pushes teacher profile update to Google Sheets."""
        url = GoogleSheetsDB.get_url()
        if not url:
            return False

        try:
            payload = {
                'action': 'saveTeacher',
                'teacher': teacher_info
            }
            resp = requests.post(url, json=payload, timeout=15, allow_redirects=True)
            if resp.ok:
                res = resp.json()
                return res.get('status') == 'success'
        except Exception as e:
            print(f"[GoogleSheetsDB] Error pushing teacher: {e}")

        return False

    @staticmethod
    def delete_teacher(code):
        """Deletes teacher from Google Sheets."""
        url = GoogleSheetsDB.get_url()
        if not url:
            return False

        try:
            payload = {
                'action': 'deleteTeacher',
                'code': code
            }
            resp = requests.post(url, json=payload, timeout=15, allow_redirects=True)
            if resp.ok:
                res = resp.json()
                return res.get('status') == 'success'
        except Exception as e:
            print(f"[GoogleSheetsDB] Error deleting teacher: {e}")

        return False

