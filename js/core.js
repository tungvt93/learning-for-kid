/* Lõi: lưu trữ, giọng đọc, âm thanh, tiện ích */
const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dateKey(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Lưu trữ ---------- */
const Store = {
  d: null, pid: null, serverT: 0, inflight: 0, dirty: false, onGone: null, _timer: null,
  fresh() {
    return {
      profile: null, stars: 0, levels: {}, good: {}, words: {}, mathWrong: {},
      daily: { date: '', played: [], claimed: false }, streak: { last: '', count: 0 },
      stickers: [], history: [], settings: { rate: 0.85, vi: true },
    };
  },
  async api(method, url, body) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(url, {
        method, signal: ctl.signal, cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return await r.json();
    } finally { clearTimeout(to); }
  },
  listProfiles() { return this.api('GET', 'api/profiles'); },
  async createProfile(name, avatar) { return (await this.api('POST', 'api/profiles', { name, avatar })).id; },
  renameProfile(id, patch) { return this.api('PATCH', `api/profiles/${id}`, patch); },
  deleteProfile(id) { return this.api('DELETE', `api/profiles/${id}`); },

  setState(d) {
    this.d = Object.assign(this.fresh(), d || {});
    this.d.settings = Object.assign(this.fresh().settings, this.d.settings || {});
    if (this.d.daily.date !== today()) this.d.daily = { date: today(), played: [], claimed: false };
  },
  /* Mở hồ sơ của một bé: tải tiến độ từ server (lưu ở SQLite) */
  async open(id) {
    await this.flush();
    const st = await this.api('GET', `api/profiles/${id}`);
    this.pid = id; this.setState(st); this.serverT = st._t || 0; this.dirty = false;
  },
  /* Thoát hồ sơ: lưu nốt rồi gỡ khỏi bộ nhớ, để bé khác không thấy dữ liệu của bé này */
  close() { if (this.pid) this.push(true); clearTimeout(this._timer); this._timer = null; this.pid = null; this.d = null; },
  /* Bỏ hồ sơ đang mở mà không lưu (dùng khi vừa xóa hồ sơ đó) */
  discard() { clearTimeout(this._timer); this._timer = null; this.pid = null; this.d = null; this.dirty = false; },
  async flush() {
    if (this.pid && (this._timer || this.dirty)) this.push(true);
    for (let i = 0; this.inflight && i < 100; i++) await wait(50);
  },
  push(now) {
    if (!this.pid) return;
    clearTimeout(this._timer); this._timer = null;
    const send = () => {
      if (!this.pid) return;
      const pid = this.pid; this.inflight++;
      this.api('PUT', `api/profiles/${pid}`, this.d)
        .then(r => { if (pid === this.pid) this.serverT = r._t; this.dirty = false; })
        .catch(e => { if (e.status === 404) this.onGone?.(); else this.dirty = true; })
        .finally(() => this.inflight--);
    };
    now ? send() : (this._timer = setTimeout(() => { this._timer = null; send(); }, 300));
  },
  save() { this.push(); },
  /* Quay lại tab: nếu máy khác vừa lưu tiến độ mới hơn thì lấy về. Trả về true nếu có đổi. */
  async syncIfNewer() {
    if (!this.pid || this.inflight || this._timer || this.dirty) return false;
    try {
      const st = await this.api('GET', `api/profiles/${this.pid}`);
      if ((st._t || 0) > this.serverT && !this.inflight && !this._timer) { this.setState(st); this.serverT = st._t; return true; }
    } catch (e) { if (e.status === 404) this.onGone?.(); }
    return false;
  },
  /* Xóa tiến độ của bé đang chơi nhưng giữ lại hồ sơ (tên, hình) */
  reset() { this.d = Object.assign(this.fresh(), { profile: this.d.profile }); this.setState(this.d); this.push(true); },

  level(id) { return this.d.levels[id] || 1; },
  wordStat(id) { return this.d.words[id] || (this.d.words[id] = { c: 0, w: 0, r: 0 }); },
  markWord(id, ok) {
    const s = this.wordStat(id);
    if (ok) { s.c++; s.r = Math.max(0, s.r - 1); } else { s.w++; s.r = Math.min(5, s.r + 2); }
  },
  mastered(id) { const s = this.d.words[id]; return !!s && s.c >= 3 && s.c > s.w; },
};

/* Chọn từ: ưu tiên từ bé hay sai để ôn lại */
function pickWords(pool, n) {
  const scored = shuffle(pool).map(w => ({ w, s: Math.random() + (Store.d.words[w.id]?.r || 0) * 0.6 }));
  scored.sort((a, b) => b.s - a.s);
  const out = [];
  let list = scored.map(x => x.w);
  while (out.length < n) {
    out.push(...list.slice(0, n - out.length));
    list = shuffle(pool);
  }
  // tránh lặp liền nhau
  for (let i = 1; i < out.length; i++) if (out[i].id === out[i - 1].id && pool.length > 1) {
    const j = out.findIndex((x, k) => k > i && x.id !== out[i].id);
    if (j > 0) [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function wordsForTopic(topicId) {
  if (topicId && topicId !== 'mix') return TOPICS.find(t => t.id === topicId).words;
  return TOPICS.flatMap(t => t.words);
}

/* ---------- Giọng đọc ---------- */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const Voice = {
  voices: [], server: { vi: false, en: false, voices: {} }, audio: null, _end: null, warned: false, onMissing: null,
  init() {
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices(); };
      load();
      speechSynthesis.addEventListener?.('voiceschanged', load);
    }
    this.audio = new Audio(); this.audio.preload = 'auto';
    // Mở khóa việc phát âm thanh (iPhone, Chrome) ở lần chạm đầu tiên của bé
    document.addEventListener('pointerdown', () => { this.audio.src = SILENT_WAV; this.audio.play().catch(() => {}); }, { once: true });
    this.loadServerInfo();
  },
  async loadServerInfo() { try { this.server = await Store.api('GET', 'api/tts/info'); } catch (e) { /* server không có giọng đọc: dùng giọng của trình duyệt */ } },
  pick(lang) {
    if (!this.voices.length && 'speechSynthesis' in window) this.voices = speechSynthesis.getVoices();
    const vs = this.voices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang));
    if (lang === 'en') {
      const pref = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Moira', 'Daniel', 'Google UK English Female'];
      for (const p of pref) { const v = vs.find(v => v.name.includes(p)); if (v) return v; }
      return vs.find(v => v.lang.replace('_', '-').toLowerCase() === 'en-us') || vs[0];
    }
    return vs[0];
  },
  hasVi() { return !!this.server.vi || !!this.pick('vi'); },
  /* Giọng đang dùng cho một ngôn ngữ, để hiện trong khu bố mẹ */
  source(lang) {
    if (lang === 'vi' && this.server.vi) return `máy chủ (${this.server.voices?.vi || ''})`;
    const v = this.pick(lang); if (v) return `trình duyệt (${v.name})`;
    return this.server[lang] ? `máy chủ (${this.server.voices?.[lang] || ''})` : null;
  },
  missing(lang) { if (!this.warned) { this.warned = true; this.onMissing?.(lang); } },
  say(text, lang, rate) {
    if (!text) return Promise.resolve();
    // Tiếng Việt: ưu tiên giọng do máy chủ tạo, nghe được trên mọi thiết bị kể cả khi máy không có giọng tiếng Việt
    if (lang === 'vi' && this.server.vi) return this.playServer(text, lang, rate).then(ok => ok ? undefined : this.speakBrowser(text, lang, rate));
    if (this.pick(lang)) return this.speakBrowser(text, lang, rate);
    if (this.server[lang]) return this.playServer(text, lang, rate).then(() => undefined);
    this.missing(lang);
    return Promise.resolve();
  },
  /* Phát giọng do máy chủ tạo. Trả về true nếu phát xong hoặc bị câu mới thay thế, false nếu lỗi (để dùng giọng trình duyệt). */
  playServer(text, lang, rate) {
    return new Promise(resolve => {
      const a = this.audio;
      this._finish(true);
      let done = false, timer;
      const fin = ok => { if (done) return; done = true; clearTimeout(timer); a.onended = a.onerror = null; if (this._end === fin) this._end = null; resolve(ok); };
      this._end = fin; timer = setTimeout(() => fin(true), 20000);
      a.onended = () => fin(true); a.onerror = () => fin(false);
      a.src = `api/tts?lang=${lang}&rate=${rate}&text=${encodeURIComponent(text)}`;
      a.play().catch(() => { fin(false); });
    });
  },
  _finish(ok) { const f = this._end; if (f) f(ok); },
  speakBrowser(text, lang, rate) {
    if (!('speechSynthesis' in window)) { this.missing(lang); return Promise.resolve(); }
    const v = this.pick(lang);
    if (lang === 'vi' && !v) { this.missing(lang); return Promise.resolve(); }
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (v) u.voice = v;
    u.lang = lang === 'en' ? 'en-US' : 'vi-VN';
    u.rate = rate;
    return new Promise(res => {
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1500 + text.length * 120);
      const go = () => speechSynthesis.speak(u);
      busy ? setTimeout(go, 80) : go();   // Chrome đôi khi bỏ qua câu nói ngay sau lệnh cancel
    });
  },
  en(text, slow) { return this.say(text, 'en', slow ? 0.5 : (Store.d?.settings.rate ?? 0.85)); },
  vi(text) { return (Store.d?.settings.vi ?? true) ? this.say(text, 'vi', 1) : Promise.resolve(); },
  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (this.audio) this.audio.pause();
    this._finish(true);
  },
};

/* ---------- Âm thanh hiệu ứng ---------- */
const Sfx = {
  ctx: null,
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(f, dur, type = 'sine', delay = 0, vol = 0.18) {
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', i * 0.08)); },
  bad() { this.tone(200, 0.25, 'sawtooth', 0, 0.08); this.tone(150, 0.3, 'sawtooth', 0.12, 0.08); },
  pop() { this.tone(880, 0.08, 'square', 0, 0.06); },
  flip() { this.tone(600, 0.06, 'triangle', 0, 0.08); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', i * 0.12)); },
};

/* ---------- Hiệu ứng ---------- */
function confetti(n = 60) {
  const colors = ['#ff6f61', '#ffb648', '#22c19a', '#4f8cff', '#8b6cf6', '#ff5e9e'];
  const box = document.createElement('div'); box.className = 'confetti';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = pickOne(colors);
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.transform = `rotate(${rand(0, 360)}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3500);
}

function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

/* Hình minh họa cho một từ */
function pic(w, cls = '') {
  if (w.color) return `<span class="swatch ${w.en === 'white' ? 'light' : ''} ${cls}" style="--c:${w.color}"></span>`;
  if (w.text) return `<span class="numpic ${cls}">${w.text}</span>`;
  return `<span class="emo ${cls}">${w.emo}</span>`;
}
