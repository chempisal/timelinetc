"""
Cloud Database Management & Online Synchronization Layer
(ម៉ូឌុលតភ្ជាប់ Database រួមគ្នានៅលើអនឡាញផ្ទាល់ក្នុង Source Code)

Database Engine: Upstash Redis / Vercel KV REST API
- Single Source of Truth for all connected devices
- Real-time online synchronization
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'schedule_data.json')
CUSTOM_HOMEROOM_FILE = os.path.join(BASE_DIR, 'data', 'custom_homeroom.json')
CUSTOM_TEACHERS_FILE = os.path.join(BASE_DIR, 'data', 'custom_teachers.json')

# -------------------------------------------------------------------------
# DIRECT CLOUD DATABASE CREDENTIALS IN SOURCE CODE (ការភ្ជាប់ DATABASE ផ្ទាល់)
# -------------------------------------------------------------------------
DEFAULT_KV_URL = "https://optimal-gannet-92171.upstash.io"
DEFAULT_KV_TOKEN = "gQAAAAAAAWgLAQIgcDJlZWM2MzkwZWEyZGE0OGRmYWQ3NTg3ZTU2NDhlZjI1NA"
SHARED_DB_KEY = "timetable_shared_data"

def get_db_credentials():
    """Gets cloud database URL and Token with priority to env vars."""
    url = os.environ.get('KV_REST_API_URL') or os.environ.get('UPSTASH_REDIS_REST_URL') or DEFAULT_KV_URL
    token = os.environ.get('KV_REST_API_TOKEN') or os.environ.get('UPSTASH_REDIS_REST_TOKEN') or DEFAULT_KV_TOKEN
    return url.rstrip('/'), token

class CloudDatabase:
    """Manages direct read/write operations to the shared online cloud database."""

    @staticmethod
    def get_active_provider():
        url, _ = get_db_credentials()
        return "Upstash Redis / Vercel KV", {
            "provider": "Upstash Redis",
            "firebase_url": "",
            "vercel_kv_url": url,
            "vercel_kv_token": "******",
            "last_synced_at": datetime.utcnow().isoformat(),
            "auto_sync": True
        }

    @staticmethod
    def test_connection():
        """Tests live connection to cloud database."""
        url, token = get_db_credentials()
        req = urllib.request.Request(
            url,
            data=json.dumps(['PING']).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as res:
                resp = json.loads(res.read().decode('utf-8'))
                if resp.get('result') == 'PONG':
                    return {
                        'status': 'success',
                        'provider': 'Cloud Database (Upstash / Vercel KV)',
                        'message': 'បានតភ្ជាប់ទៅកាន់ Cloud Database ដោយជោគជ័យ! ទិន្នន័យចែករំលែករួមគ្នារវាងគ្រប់ឧបករណ៍។'
                    }
        except Exception as e:
            return {
                'status': 'error',
                'provider': 'Cloud Database',
                'message': f'មិនអាចភ្ជាប់ទៅកាន់ Cloud Database បានទេ ៖ {e}'
            }
        return {'status': 'error', 'provider': 'Cloud Database', 'message': 'ការតភ្ជាប់បរាជ័យ'}

    @staticmethod
    def fetch_online_data():
        """
        Fetches the complete shared dataset directly from online database.
        Returns dictionary dataset or None on network error.
        """
        url, token = get_db_credentials()
        req = urllib.request.Request(
            url,
            data=json.dumps(['GET', SHARED_DB_KEY]).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as res:
                resp = json.loads(res.read().decode('utf-8'))
                raw = resp.get('result')
                if raw:
                    data = json.loads(raw) if isinstance(raw, str) else raw
                    return data
        except Exception as e:
            print(f"[CloudDB] Error fetching from cloud: {e}")

        return None

    @staticmethod
    def push_online_data(data_payload):
        """
        Pushes and updates shared dataset to online cloud database.
        """
        url, token = get_db_credentials()
        data_payload['cloud_updated_at'] = datetime.utcnow().isoformat()
        json_payload = json.dumps(data_payload, ensure_ascii=False)

        req = urllib.request.Request(
            url,
            data=json.dumps(['SET', SHARED_DB_KEY, json_payload]).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as res:
                resp = json.loads(res.read().decode('utf-8'))
                return resp.get('result') == 'OK'
        except Exception as e:
            print(f"[CloudDB] Error pushing to cloud: {e}")
            return False

    @staticmethod
    def get_or_seed_data():
        """
        Fetches latest data from cloud database. If cloud database is empty,
        seeds it from local files and pushes to cloud.
        """
        data = CloudDatabase.fetch_online_data()
        if data and isinstance(data, dict) and 'classes' in data:
            return data

        # If cloud is not reachable or empty, load local and attempt to push
        print("[CloudDB] Loading from local seed files...")
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            base_data = json.load(f)

        custom_hr = {}
        if os.path.exists(CUSTOM_HOMEROOM_FILE):
            try:
                with open(CUSTOM_HOMEROOM_FILE, 'r', encoding='utf-8') as f:
                    custom_hr = json.load(f)
            except Exception:
                pass

        custom_teachers = {}
        if os.path.exists(CUSTOM_TEACHERS_FILE):
            try:
                with open(CUSTOM_TEACHERS_FILE, 'r', encoding='utf-8') as f:
                    custom_teachers = json.load(f)
            except Exception:
                pass

        for cls in base_data['classes']:
            if cls['id'] in custom_hr:
                cls['homeroom'] = custom_hr[cls['id']]

        base_data['custom_homeroom'] = custom_hr
        base_data['custom_teachers'] = custom_teachers
        base_data['cloud_updated_at'] = datetime.utcnow().isoformat()

        # Seed cloud
        try:
            CloudDatabase.push_online_data(base_data)
        except Exception as e:
            print(f"[CloudDB] Could not seed cloud: {e}")

        return base_data

def load_cloud_config():
    url, _ = get_db_credentials()
    return {
        "provider": "Upstash Redis",
        "firebase_url": "",
        "vercel_kv_url": url,
        "vercel_kv_token": "******",
        "last_synced_at": datetime.utcnow().isoformat(),
        "auto_sync": True
    }

def save_cloud_config(cfg):
    """Stub for backwards compatibility."""
    pass

