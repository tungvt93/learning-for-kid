#!/usr/bin/env python3
"""Bé Vui Học: server phục vụ trang web và lưu tiến độ của từng bé vào SQLite (data/bevuihoc.db).

Chạy:   ./run.sh [cổng]        (mặc định 8765)
Xem DB: sqlite3 data/bevuihoc.db   hoặc mở bằng DB Browser for SQLite
"""
import hashlib, json, os, re, shutil, socket, sqlite3, subprocess, sys, threading, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get('BEVUI_DATA') or os.path.join(ROOT, 'data')
DB_FILE = os.path.join(DATA_DIR, 'bevuihoc.db')
OLD_JSON = os.path.join(DATA_DIR, 'progress.json')   # bản lưu cũ (trước khi có SQLite)
MAX_BODY = 2 * 1024 * 1024
MAX_PROFILES = 12
LOCK = threading.Lock()
PRIVATE = {'data', 'server.py', 'run.sh', 'stop.sh', 'start.command', 'README.md'}

SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  avatar        TEXT NOT NULL,
  stars         INTEGER NOT NULL DEFAULT 0,
  streak_count  INTEGER NOT NULL DEFAULT 0,
  streak_last   TEXT NOT NULL DEFAULT '',
  daily_date    TEXT NOT NULL DEFAULT '',
  daily_played  TEXT NOT NULL DEFAULT '[]',
  daily_claimed INTEGER NOT NULL DEFAULT 0,
  speech_rate   REAL NOT NULL DEFAULT 0.85,
  speak_vi      INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS game_levels (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id    TEXT NOT NULL,
  level      INTEGER NOT NULL DEFAULT 1,
  good_runs  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, game_id)
);
CREATE TABLE IF NOT EXISTS word_stats (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_id    TEXT NOT NULL,
  correct    INTEGER NOT NULL DEFAULT 0,
  wrong      INTEGER NOT NULL DEFAULT 0,
  review     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, word_id)
);
CREATE TABLE IF NOT EXISTS math_wrong (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item       TEXT NOT NULL,
  times      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, item)
);
CREATE TABLE IF NOT EXISTS stickers (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker    TEXT NOT NULL,
  PRIMARY KEY (profile_id, sticker)
);
CREATE TABLE IF NOT EXISTS history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id    TEXT NOT NULL,
  played_at  INTEGER NOT NULL,
  correct    INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 0,
  stars      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_history_profile ON history(profile_id, played_at);
"""


# ---------------------------------------------------------------------------------------------
# Giọng đọc do máy chủ tạo (macOS: lệnh `say`), để điện thoại/máy nào cũng nghe được tiếng Việt và tiếng Anh
# dù trình duyệt của máy đó không có giọng đọc phù hợp. Âm thanh được lưu đệm trong data/tts-cache/.
# ---------------------------------------------------------------------------------------------
TTS_DIR = os.path.join(DATA_DIR, 'tts-cache')
TTS_SEM = threading.Semaphore(2)
TTS_KEY_LOCKS = {}       # mỗi câu một khóa riêng, để hai yêu cầu giống nhau không tạo cùng lúc
TTS_KEY_GUARD = threading.Lock()
TTS_VOICES = {}          # {'vi': 'Linh', 'en': 'Samantha'}
TTS_MAX_TEXT = 300
TTS_MAX_FILES = 3000


def detect_voices():
    if sys.platform != 'darwin' or not shutil.which('say') or not shutil.which('afconvert'):
        return {}
    try:
        out = subprocess.run(['say', '-v', '?'], capture_output=True, text=True, timeout=15).stdout
    except (OSError, subprocess.SubprocessError):
        return {}
    found = []
    for line in out.splitlines():
        m = re.match(r'^(.*?)\s+([a-z]{2}_[A-Z]{2})\s+#', line)
        if m:
            found.append((m.group(1).strip(), m.group(2)))
    voices = {}
    vi = [n for n, loc in found if loc == 'vi_VN']
    if vi:
        voices['vi'] = vi[0]
    en_us = [n for n, loc in found if loc == 'en_US']
    for pref in ('Samantha', 'Karen', 'Daniel', 'Alex'):
        if any(n == pref for n, _ in found):
            voices['en'] = pref
            break
    else:
        if en_us:
            voices['en'] = en_us[0]
    return voices


def clean_tts_text(text):
    text = re.sub(r'[\x00-\x1f\x7f]', ' ', str(text or '')).replace('[[', ' ').replace(']]', ' ')
    return ' '.join(text.split())[:TTS_MAX_TEXT]


def synth(lang, text, rate):
    """Trả về đường dẫn file .wav của câu `text` (tạo mới nếu chưa có), hoặc None nếu không tạo được."""
    voice = TTS_VOICES.get(lang)
    text = clean_tts_text(text)
    if not voice or not text:
        return None
    wpm = max(80, min(260, int((165 if lang == 'vi' else 185) * rate)))
    key = hashlib.sha1(f'{voice}|{wpm}|{text}'.encode('utf-8')).hexdigest()
    out = os.path.join(TTS_DIR, key + '.wav')
    if os.path.exists(out):
        return out
    os.makedirs(TTS_DIR, exist_ok=True)
    with TTS_KEY_GUARD:
        key_lock = TTS_KEY_LOCKS.setdefault(key, threading.Lock())
    with key_lock:
        if os.path.exists(out):          # yêu cầu trước đó đã tạo xong
            return out
        uniq = f'{key}.{threading.get_ident()}'
        aiff, part = os.path.join(TTS_DIR, uniq + '.aiff'), os.path.join(TTS_DIR, uniq + '.part')
        with TTS_SEM:
            try:
                subprocess.run(['say', '-v', voice, '-r', str(wpm), '-o', aiff, '-f', '-'], input=text.encode('utf-8'), check=True, timeout=25, capture_output=True)
                subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', aiff, part], check=True, timeout=25, capture_output=True)
                os.replace(part, out)
            except (OSError, subprocess.SubprocessError):
                return None
            finally:
                for f in (aiff, part):
                    try:
                        os.remove(f)
                    except OSError:
                        pass
                with TTS_KEY_GUARD:
                    TTS_KEY_LOCKS.pop(key, None)
    prune_tts()
    return out


def prune_tts():
    try:
        files = [os.path.join(TTS_DIR, f) for f in os.listdir(TTS_DIR) if f.endswith('.wav')]
        if len(files) > TTS_MAX_FILES:
            for f in sorted(files, key=os.path.getmtime)[:len(files) - TTS_MAX_FILES + 500]:
                os.remove(f)
    except OSError:
        pass


def now_ms():
    return int(time.time() * 1000)


def connect():
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = connect()
    try:
        with conn:
            conn.executescript(SCHEMA)
    finally:
        conn.close()


def to_int(v, default=0, lo=0, hi=10**9):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def clean_name(v, default='Bé'):
    s = ' '.join(str(v or '').split())[:16]
    return s or default


def clean_avatar(v, default='🦊'):
    s = str(v or '').strip()[:8]
    return s or default


def summary(row):
    return {'id': row['id'], 'name': row['name'], 'avatar': row['avatar'], 'stars': row['stars'],
            'streak': row['streak_count'], 'updated_at': row['updated_at']}


def list_profiles(conn):
    return [summary(r) for r in conn.execute('SELECT * FROM profiles ORDER BY id')]


def create_profile(conn, name, avatar):
    t = now_ms()
    cur = conn.execute('INSERT INTO profiles (name, avatar, created_at, updated_at) VALUES (?,?,?,?)',
                       (clean_name(name), clean_avatar(avatar), t, t))
    return cur.lastrowid


def load_state(conn, pid):
    """Ghép các bảng lại thành đúng cấu trúc mà trình duyệt đang dùng."""
    p = conn.execute('SELECT * FROM profiles WHERE id = ?', (pid,)).fetchone()
    if not p:
        return None
    levels, good = {}, {}
    for r in conn.execute('SELECT * FROM game_levels WHERE profile_id = ?', (pid,)):
        levels[r['game_id']] = r['level']
        good[r['game_id']] = r['good_runs']
    try:
        played = json.loads(p['daily_played'])
    except ValueError:
        played = []
    return {
        'profile': {'id': p['id'], 'name': p['name'], 'avatar': p['avatar']},
        'stars': p['stars'],
        'levels': levels, 'good': good,
        'words': {r['word_id']: {'c': r['correct'], 'w': r['wrong'], 'r': r['review']}
                  for r in conn.execute('SELECT * FROM word_stats WHERE profile_id = ?', (pid,))},
        'mathWrong': {r['item']: r['times'] for r in conn.execute('SELECT * FROM math_wrong WHERE profile_id = ?', (pid,))},
        'daily': {'date': p['daily_date'], 'played': played, 'claimed': bool(p['daily_claimed'])},
        'streak': {'last': p['streak_last'], 'count': p['streak_count']},
        'stickers': [r['sticker'] for r in conn.execute('SELECT sticker FROM stickers WHERE profile_id = ? ORDER BY rowid', (pid,))],
        'history': [{'g': r['game_id'], 't': r['played_at'], 'c': r['correct'], 'n': r['total'], 's': r['stars']}
                    for r in conn.execute('SELECT * FROM history WHERE profile_id = ? ORDER BY id', (pid,))],
        'settings': {'rate': p['speech_rate'], 'vi': bool(p['speak_vi'])},
        '_t': p['updated_at'],
    }


def as_dict(v):
    return v if isinstance(v, dict) else {}


def save_state(conn, pid, st):
    """Ghi toàn bộ tiến độ của một bé trong một giao dịch (hoặc ghi hết, hoặc không ghi gì)."""
    old = conn.execute('SELECT name, avatar FROM profiles WHERE id = ?', (pid,)).fetchone()
    if not old:
        return None
    prof = as_dict(st.get('profile'))
    daily, streak, settings = as_dict(st.get('daily')), as_dict(st.get('streak')), as_dict(st.get('settings'))
    played = [str(x)[:32] for x in (daily.get('played') if isinstance(daily.get('played'), list) else [])][:20]
    try:
        rate = max(0.3, min(1.5, float(settings.get('rate') or 0.85)))
    except (TypeError, ValueError):
        rate = 0.85
    t = now_ms()
    conn.execute(
        """UPDATE profiles SET name=?, avatar=?, stars=?, streak_count=?, streak_last=?, daily_date=?,
           daily_played=?, daily_claimed=?, speech_rate=?, speak_vi=?, updated_at=? WHERE id=?""",
        (clean_name(prof.get('name'), old['name']), clean_avatar(prof.get('avatar'), old['avatar']),
         to_int(st.get('stars')), to_int(streak.get('count')), str(streak.get('last') or '')[:10],
         str(daily.get('date') or '')[:10], json.dumps(played), 1 if daily.get('claimed') else 0,
         rate, 0 if settings.get('vi') is False else 1, t, pid))

    levels, good = as_dict(st.get('levels')), as_dict(st.get('good'))
    conn.execute('DELETE FROM game_levels WHERE profile_id = ?', (pid,))
    conn.executemany('INSERT INTO game_levels VALUES (?,?,?,?)',
                     [(pid, str(g)[:32], to_int(levels.get(g), 1, 1, 20), to_int(good.get(g), 0, 0, 1000))
                      for g in sorted(set(levels) | set(good))])
    conn.execute('DELETE FROM word_stats WHERE profile_id = ?', (pid,))
    conn.executemany('INSERT INTO word_stats VALUES (?,?,?,?,?)',
                     [(pid, str(w)[:64], to_int(as_dict(s).get('c')), to_int(as_dict(s).get('w')), to_int(as_dict(s).get('r'), 0, 0, 5))
                      for w, s in as_dict(st.get('words')).items()])
    conn.execute('DELETE FROM math_wrong WHERE profile_id = ?', (pid,))
    conn.executemany('INSERT INTO math_wrong VALUES (?,?,?)',
                     [(pid, str(k)[:64], to_int(n)) for k, n in as_dict(st.get('mathWrong')).items()])
    conn.execute('DELETE FROM stickers WHERE profile_id = ?', (pid,))
    seen = []
    for s in (st.get('stickers') if isinstance(st.get('stickers'), list) else []):
        s = str(s)[:16]
        if s and s not in seen:
            seen.append(s)
    conn.executemany('INSERT INTO stickers VALUES (?,?)', [(pid, s) for s in seen])
    conn.execute('DELETE FROM history WHERE profile_id = ?', (pid,))
    hist = st.get('history') if isinstance(st.get('history'), list) else []
    conn.executemany('INSERT INTO history (profile_id, game_id, played_at, correct, total, stars) VALUES (?,?,?,?,?,?)',
                     [(pid, str(as_dict(h).get('g'))[:32], to_int(as_dict(h).get('t'), 0, 0, 10**15), to_int(as_dict(h).get('c')),
                       to_int(as_dict(h).get('n')), to_int(as_dict(h).get('s'), 0, 0, 3)) for h in hist[-300:]])
    return t


def migrate_old_json():
    """Lần đầu chạy bản SQLite: nếu có data/progress.json cũ thì chuyển vào DB rồi đổi tên file cũ."""
    if not os.path.exists(OLD_JSON):
        return
    moved = None
    with LOCK:
        conn = connect()
        try:
            with conn:
                if conn.execute('SELECT COUNT(*) FROM profiles').fetchone()[0]:
                    return
                try:
                    with open(OLD_JSON, encoding='utf-8') as f:
                        st = json.load(f)
                except (OSError, ValueError):
                    print('  ! Không đọc được progress.json cũ, bỏ qua.')
                    return
                prof = as_dict(as_dict(st).get('profile'))
                if not prof.get('name'):
                    return
                pid = create_profile(conn, prof.get('name'), prof.get('avatar'))
                save_state(conn, pid, st)
                moved = (prof.get('name'), to_int(st.get('stars')))
        finally:
            conn.close()
    if moved:
        os.replace(OLD_JSON, OLD_JSON + '.da-chuyen')  # giữ lại làm bản sao lưu
        print(f'  Đã chuyển dữ liệu cũ của bé "{moved[0]}" ({moved[1]} sao) vào SQLite.')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass

    # ---- tiện ích ----
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            raise ValueError('bad size')
        data = json.loads(self.rfile.read(n).decode('utf-8'))
        if not isinstance(data, dict):
            raise ValueError('not an object')
        return data

    def _route(self):
        m = re.fullmatch(r'/api/profiles(?:/(\d+))?', self.path.split('?')[0])
        if not m:
            return False, None
        return True, (int(m.group(1)) if m.group(1) else None)

    def _private(self):
        parts = [p for p in self.path.split('?')[0].split('/') if p]
        return bool(parts) and (parts[0] in PRIVATE or any(p.startswith('.') for p in parts))

    def _api(self, fn):
        try:
            with LOCK:
                conn = connect()
                try:
                    with conn:
                        return fn(conn)
                finally:
                    conn.close()
        except sqlite3.Error as e:
            return self._json(500, {'error': 'db', 'detail': str(e)})

    def _read_body_or_400(self):
        try:
            return self._body()
        except (ValueError, UnicodeDecodeError):
            self._json(400, {'error': 'bad json'})
            return None

    # ---- các phương thức ----
    def _serve_index(self):
        try:
            with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
                html = f.read()
            files = [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'css', 'style.css')]
            files += [os.path.join(ROOT, 'js', n) for n in os.listdir(os.path.join(ROOT, 'js'))]
            ver = str(int(max(os.path.getmtime(x) for x in files if os.path.exists(x))))
        except OSError:
            return self.send_error(404)
        body = html.replace('__V__', ver).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _tts(self):
        u = urlparse(self.path)
        if u.path == '/api/tts/info':
            return self._json(200, {'vi': 'vi' in TTS_VOICES, 'en': 'en' in TTS_VOICES, 'voices': TTS_VOICES})
        q = parse_qs(u.query)
        lang = (q.get('lang') or [''])[0]
        try:
            rate = max(0.3, min(1.5, float((q.get('rate') or ['1'])[0])))
        except ValueError:
            rate = 1.0
        if lang not in ('vi', 'en'):
            return self._json(400, {'error': 'lang'})
        f = synth(lang, (q.get('text') or [''])[0], rate)
        if not f:
            return self._json(404, {'error': 'no voice'})
        with open(f, 'rb') as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header('Content-Type', 'audio/wav')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/index.html'):
            return self._serve_index()
        if self.path.startswith('/api/tts'):
            return self._tts()
        is_api, pid = self._route()
        if is_api:
            def run(conn):
                if pid is None:
                    return self._json(200, list_profiles(conn))
                st = load_state(conn, pid)
                return self._json(200, st) if st else self._json(404, {'error': 'not found'})
            return self._api(run)
        if self._private():
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        return self.send_error(404) if self._private() else super().do_HEAD()

    def do_POST(self):
        is_api, pid = self._route()
        if not is_api or pid is not None:
            return self.send_error(404)
        body = self._read_body_or_400()
        if body is None:
            return

        def run(conn):
            if conn.execute('SELECT COUNT(*) FROM profiles').fetchone()[0] >= MAX_PROFILES:
                return self._json(409, {'error': 'too many profiles'})
            return self._json(200, {'id': create_profile(conn, body.get('name'), body.get('avatar'))})
        return self._api(run)

    def do_PUT(self):
        is_api, pid = self._route()
        if not is_api or pid is None:
            return self.send_error(404)
        body = self._read_body_or_400()
        if body is None:
            return

        def run(conn):
            t = save_state(conn, pid, body)
            return self._json(200, {'ok': True, '_t': t}) if t else self._json(404, {'error': 'not found'})
        return self._api(run)

    def do_PATCH(self):  # đổi tên / đổi hình đại diện
        is_api, pid = self._route()
        if not is_api or pid is None:
            return self.send_error(404)
        body = self._read_body_or_400()
        if body is None:
            return

        def run(conn):
            row = conn.execute('SELECT name, avatar FROM profiles WHERE id = ?', (pid,)).fetchone()
            if not row:
                return self._json(404, {'error': 'not found'})
            name = clean_name(body.get('name'), row['name']) if 'name' in body else row['name']
            avatar = clean_avatar(body.get('avatar'), row['avatar']) if 'avatar' in body else row['avatar']
            conn.execute('UPDATE profiles SET name=?, avatar=?, updated_at=? WHERE id=?', (name, avatar, now_ms(), pid))
            return self._json(200, {'ok': True, 'name': name, 'avatar': avatar})
        return self._api(run)

    def do_DELETE(self):
        is_api, pid = self._route()
        if not is_api or pid is None:
            return self.send_error(404)

        def run(conn):
            cur = conn.execute('DELETE FROM profiles WHERE id = ?', (pid,))
            return self._json(200 if cur.rowcount else 404, {'ok': bool(cur.rowcount)})
        return self._api(run)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))  # không gửi gói tin nào, chỉ để hệ điều hành chọn card mạng
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return '127.0.0.1'


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    init_db()
    migrate_old_json()
    TTS_VOICES.update(detect_voices())
    if TTS_VOICES:   # đọc thử một câu ngắn để lần đầu bé bấm nghe không bị chậm
        threading.Thread(target=lambda: (synth('vi', 'Xin chào', 1.0), synth('en', 'Hello', 0.85)), daemon=True).start()
    try:
        srv = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    except OSError as e:
        print(f'\n  ✗ Không mở được cổng {port}: {e.strerror}.\n    Cổng này đang có chương trình khác dùng (có thể Bé Vui Học đã chạy rồi).\n'
              f'    Tắt bản cũ:  ./stop.sh {port}     hoặc chọn cổng khác:  ./run.sh {port + 1}\n')
        sys.exit(1)
    conn = connect()
    try:
        profiles = list_profiles(conn)
    finally:
        conn.close()
    ip = lan_ip()
    names = (' (' + ', '.join(p['name'] for p in profiles) + ')') if profiles else ''
    tts = ', '.join(f"{'tiếng Việt' if k == 'vi' else 'tiếng Anh'} = {v}" for k, v in TTS_VOICES.items()) or 'không có (dùng giọng của trình duyệt)'
    print(f"""
  ┌──────────────────────────────────────────────────────────
  │  Bé Vui Học đang chạy       CỔNG (PORT): {port}
  │
  │  Trên máy tính          : http://localhost:{port}
  │  Trên điện thoại (Wi-Fi): http://{ip}:{port}
  │
  │  Dữ liệu SQLite : {DB_FILE}
  │  Giọng đọc máy chủ: {tts}
  │  Hồ sơ hiện có  : {len(profiles)}{names}
  │
  │  Nhấn Ctrl+C để tắt
  └──────────────────────────────────────────────────────────
""", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\n  Đã tắt.')


if __name__ == '__main__':
    main()
