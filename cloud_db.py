"""
Cloud Database Management & Online Synchronization Layer
(ម៉ូឌុលគ្រប់គ្រង Database រួមគ្នានៅលើអនឡាញ)

Supports:
1. Vercel KV / Upstash Redis (Auto-detected via environment variables)
2. Google Firebase Realtime Database (via FIREBASE_DB_URL or cloud_config.json)
3. Supabase REST API (via SUPABASE_URL & SUPABASE_KEY)
4. Fallback to Local Persistent Data
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'data', 'cloud_config.json')

def load_cloud_config():
    """Loads cloud database settings from local file or environment."""
    # 1. Check environment variables first (e.g. on Vercel)
    env_kv_url = os.environ.get('KV_REST_API_URL') or os.environ.get('UPSTASH_REDIS_REST_URL', '')
    env_kv_token = os.environ.get('KV_REST_API_TOKEN') or os.environ.get('UPSTASH_REDIS_REST_TOKEN', '')
    env_firebase_url = os.environ.get('FIREBASE_DB_URL', '')

    cfg = {
        'provider': 'auto',
        'firebase_url': env_firebase_url,
        'vercel_kv_url': env_kv_url,
        'vercel_kv_token': env_kv_token,
        'auto_sync': True,
        'last_synced_at': None,
        'status': 'ready'
    }

    # 2. Check /tmp on serverless or data/cloud_config.json
    tmp_path = os.path.join('/tmp', 'cloud_config.json')
    for path in [tmp_path, CONFIG_FILE]:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    file_cfg = json.load(f)
                    cfg.update(file_cfg)
                    break
            except Exception:
                pass

    # Re-apply env vars if not empty
    if env_kv_url and not cfg.get('vercel_kv_url'):
        cfg['vercel_kv_url'] = env_kv_url
        cfg['vercel_kv_token'] = env_kv_token
    if env_firebase_url and not cfg.get('firebase_url'):
        cfg['firebase_url'] = env_firebase_url

    return cfg

def save_cloud_config(cfg):
    """Saves cloud database configuration."""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except (OSError, IOError, PermissionError):
        try:
            tmp_path = os.path.join('/tmp', 'cloud_config.json')
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

class CloudDatabase:
    """Manages reading and writing shared timetable data to cloud database."""

    @staticmethod
    def get_active_provider():
        cfg = load_cloud_config()
        if cfg.get('vercel_kv_url') and cfg.get('vercel_kv_token'):
            return 'vercel_kv', cfg
        if cfg.get('firebase_url'):
            return 'firebase', cfg
        return 'local', cfg

    @staticmethod
    def test_connection():
        """Tests connection to active cloud database provider."""
        provider, cfg = CloudDatabase.get_active_provider()
        if provider == 'vercel_kv':
            url = f"{cfg['vercel_kv_url'].rstrip('/')}/ping"
            req = urllib.request.Request(
                url,
                headers={'Authorization': f"Bearer {cfg['vercel_kv_token']}"}
            )
            try:
                with urllib.request.urlopen(req, timeout=5) as res:
                    return {'status': 'success', 'provider': 'Vercel KV / Upstash Redis', 'message': 'បានតភ្ជាប់ទៅកាន់ Vercel KV ដោយជោគជ័យ!'}
            except Exception as e:
                return {'status': 'error', 'provider': 'Vercel KV', 'message': f'មិនអាចភ្ជាប់ទៅកាន់ Vercel KV បានទេ ៖ {e}'}

        elif provider == 'firebase':
            fb_url = cfg['firebase_url'].rstrip('/')
            if not fb_url.endswith('.json'):
                test_url = f"{fb_url}/ping.json"
            else:
                test_url = fb_url
            req = urllib.request.Request(test_url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req, timeout=5) as res:
                    return {'status': 'success', 'provider': 'Google Firebase Realtime Database', 'message': 'បានតភ្ជាប់ទៅកាន់ Firebase Realtime Database ដោយជោគជ័យ!'}
            except Exception as e:
                return {'status': 'error', 'provider': 'Firebase', 'message': f'មិនអាចភ្ជាប់ទៅកាន់ Firebase បានទេ ៖ {e}'}

        return {'status': 'local', 'provider': 'Local Persistent Storage', 'message': 'បច្ចុប្បន្នកំពុងប្រើប្រាស់ Local/Offline Database។ លោកអ្នកអាចកំណត់ Cloud Database URL ដើម្បីសមកាលកម្មរួមគ្នា។'}

    @staticmethod
    def fetch_online_data():
        """
        Fetches the complete shared dataset from the active cloud database.
        Returns None if not connected or error.
        """
        provider, cfg = CloudDatabase.get_active_provider()
        if provider == 'vercel_kv':
            url = f"{cfg['vercel_kv_url'].rstrip('/')}/get/timetable_shared_data"
            req = urllib.request.Request(
                url,
                headers={'Authorization': f"Bearer {cfg['vercel_kv_token']}"}
            )
            try:
                with urllib.request.urlopen(req, timeout=5) as res:
                    resp = json.loads(res.read().decode('utf-8'))
                    val = resp.get('result')
                    if val:
                        data = json.loads(val) if isinstance(val, str) else val
                        return data
            except Exception as e:
                print(f"[CloudDB] Error reading from Vercel KV: {e}")
                return None

        elif provider == 'firebase':
            fb_url = cfg['firebase_url'].rstrip('/')
            if not fb_url.endswith('.json'):
                fb_url = f"{fb_url}/timetable_shared.json"
            req = urllib.request.Request(fb_url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req, timeout=5) as res:
                    raw = res.read().decode('utf-8')
                    if raw and raw != 'null':
                        return json.loads(raw)
            except Exception as e:
                print(f"[CloudDB] Error reading from Firebase: {e}")
                return None

        return None

    @staticmethod
    def push_online_data(data_payload):
        """
        Pushes and updates shared dataset to active cloud database online.
        """
        provider, cfg = CloudDatabase.get_active_provider()
        data_payload['cloud_updated_at'] = datetime.utcnow().isoformat()

        if provider == 'vercel_kv':
            url = f"{cfg['vercel_kv_url'].rstrip('/')}/set/timetable_shared_data"
            json_str = json.dumps(data_payload, ensure_ascii=False)
            req = urllib.request.Request(
                url,
                data=json_str.encode('utf-8'),
                headers={
                    'Authorization': f"Bearer {cfg['vercel_kv_token']}",
                    'Content-Type': 'application/json'
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=6) as res:
                    cfg['last_synced_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    save_cloud_config(cfg)
                    return True
            except Exception as e:
                print(f"[CloudDB] Error writing to Vercel KV: {e}")
                return False

        elif provider == 'firebase':
            fb_url = cfg['firebase_url'].rstrip('/')
            if not fb_url.endswith('.json'):
                fb_url = f"{fb_url}/timetable_shared.json"
            json_str = json.dumps(data_payload, ensure_ascii=False)
            req = urllib.request.Request(
                fb_url,
                data=json_str.encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            req.get_method = lambda: 'PUT'
            try:
                with urllib.request.urlopen(req, timeout=6) as res:
                    cfg['last_synced_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    save_cloud_config(cfg)
                    return True
            except Exception as e:
                print(f"[CloudDB] Error writing to Firebase: {e}")
                return False

        return False

