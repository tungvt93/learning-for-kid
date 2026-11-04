/* Điều hướng màn hình, trang chủ, bộ sưu tập, khu bố mẹ */
const App = {
  view: null, runId: 0,

  async init() {
    Voice.onMissing = lang => this.toast(lang === 'vi' ? '🔇 Máy này chưa có giọng đọc tiếng Việt' : '🔇 Máy này chưa có giọng đọc tiếng Anh');
    Voice.init();
    this.view = document.getElementById('view');
    Store.onGone = () => { this.toast('Hồ sơ này đã bị xóa trên máy khác'); this.go('profiles'); };
    document.addEventListener('pointerdown', () => Sfx.ensure(), { once: true });
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (/^[1-9]$/.test(e.key)) { const b = this.view.querySelector(`[data-key="${e.key}"]:not([disabled])`); if (b) { b.click(); e.preventDefault(); } }
      if (e.key === 'Enter' || e.key === ' ') { const b = this.view.querySelector('[data-enter]:not([disabled])'); if (b) { b.click(); e.preventDefault(); } }
    });
    document.getElementById('nav').addEventListener('click', e => {
      const b = e.target.closest('[data-go]'); if (b) { Sfx.pop(); this.go(b.dataset.go); }
    });
    document.getElementById('prof').onclick = () => { if (Store.d) { Sfx.pop(); this.go('profiles'); } };
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) { Store.push(true); return; }
      if (!this.inGame && await Store.syncIfNewer()) this.go('home');
    });
    setInterval(() => { if (Store.dirty && !Store.inflight) Store.push(true); }, 8000);   // thử lưu lại nếu lần trước bị lỗi mạng
    window.addEventListener('popstate', () => { if (this.inGame) this.go('home', true); });
    this.boot();
  },

  /* Mở app: 0 hồ sơ thì tạo mới, đúng 1 hồ sơ thì vào luôn, từ 2 hồ sơ thì hỏi "Ai đang chơi?" */
  async boot() {
    document.body.dataset.screen = 'loading';
    this.view.innerHTML = '<div class="center loading">⏳ Đang mở…</div>';
    let list;
    try { list = await Store.listProfiles(); } catch (e) { return this.go('offline'); }
    this.profileCount = list.length;
    if (!list.length) return this.go('welcome');
    if (list.length === 1) return this.enterProfile(list[0].id);
    this.go('profiles');
  },

  async enterProfile(id) {
    try { await Store.open(id); } catch (e) { return this.go(e.status === 404 ? 'profiles' : 'offline'); }
    this.go('home');
  },

  go(screen, fromPop) {
    const NEED = ['home', 'en', 'math', 'collect', 'parent', 'game'];
    if (!Store.d && NEED.includes(screen)) screen = 'profiles';
    this.runId++; this.inGame = false; Voice.stop();
    if (screen === 'profiles') Store.close();
    document.body.dataset.screen = screen;
    document.querySelectorAll('#nav [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === screen));
    this.updateProfile();
    (this['s_' + screen] || this.s_home).call(this);
    window.scrollTo(0, 0);
  },

  updateProfile() {
    const p = Store.d?.profile; if (!p) return;
    document.getElementById('prof').innerHTML = `<div class="face">${esc(p.avatar)}</div><div><b>${esc(p.name)}</b><small>${rankOf(Store.d.stars)} · 🔄 Đổi bạn</small></div>`;
  },

  s_offline() {
    this.view.innerHTML = `
      <div class="welcome"><div class="logo-big">Bé<span>Vui</span>Học</div>
        <div class="card form"><h2>😴 Chưa kết nối được máy chủ</h2>
          <p class="lead">Bố mẹ hãy kiểm tra máy tính đã chạy <b>./run.sh</b> chưa, và điện thoại có cùng Wi-Fi với máy tính không.</p>
          <button class="big-btn" id="retry">🔁 Thử lại</button></div></div>`;
    this.view.querySelector('#retry').onclick = () => this.boot();
  },

  /* ---------- Chọn hồ sơ: "Ai đang chơi?" ---------- */
  async s_profiles() {
    const id = this.runId;
    this.view.innerHTML = `<div class="welcome wide"><div class="logo-big">Bé<span>Vui</span>Học</div>
      <h1 class="who-q">Ai đang chơi nào? 👋</h1><div class="pcards"><div class="center loading">⏳</div></div></div>`;
    let list;
    try { list = await Store.listProfiles(); } catch (e) { return this.runId === id && this.go('offline'); }
    if (this.runId !== id) return;
    this.profileCount = list.length;
    const box = this.view.querySelector('.pcards');
    box.innerHTML = list.map(p => `<button class="pcard" data-id="${p.id}"><span class="face big">${esc(p.avatar)}</span><b>${esc(p.name)}</b><small>⭐ ${p.stars} · ${rankOf(p.stars)}</small></button>`).join('')
      + (list.length < 12 ? `<button class="pcard add" data-add><span class="face big plus">+</span><b>Thêm bé</b></button>` : '');
    box.onclick = e => {
      const c = e.target.closest('.pcard'); if (!c) return;
      Sfx.pop();
      if (c.dataset.add !== undefined) return this.go('welcome');
      this.enterProfile(+c.dataset.id);
    };
    Voice.vi('Ai đang chơi nào?');
  },

  /* ---------- Tạo hồ sơ mới ---------- */
  s_welcome() {
    let avatar = AVATARS[0];
    this.view.innerHTML = `
      <div class="welcome">
        <div class="logo-big">Bé<span>Vui</span>Học</div>
        <p class="lead">Học tiếng Anh và Toán mà như đang chơi!</p>
        <div class="card form">
          <label>Tên của bé</label>
          <input id="name" maxlength="16" placeholder="Ví dụ: Bin" autocomplete="off">
          <label>Chọn bạn đồng hành</label>
          <div class="avatars">${AVATARS.map((a, i) => `<button class="av ${i ? '' : 'on'}" data-a="${a}">${a}</button>`).join('')}</div>
          <button class="big-btn" id="start">Bắt đầu chơi 🚀</button>
          ${this.profileCount ? '<button class="link" id="back">← Quay lại chọn bé</button>' : ''}
        </div>
      </div>`;
    this.view.querySelectorAll('.av').forEach(b => b.onclick = () => {
      this.view.querySelectorAll('.av').forEach(x => x.classList.remove('on')); b.classList.add('on'); avatar = b.dataset.a; Sfx.pop();
    });
    this.view.querySelector('#back')?.addEventListener('click', () => this.go('profiles'));
    this.view.querySelector('#start').onclick = async () => {
      const name = this.view.querySelector('#name').value.trim() || 'Bé';
      try {
        const id = await Store.createProfile(name, avatar);
        this.profileCount = (this.profileCount || 0) + 1;
        Sfx.win(); Voice.vi(`Chào mừng ${name}! Mình cùng chơi nhé!`);
        await this.enterProfile(id);
      } catch (e) { this.toast(e.status === 409 ? 'Đã đủ 12 hồ sơ rồi' : 'Chưa lưu được, kiểm tra kết nối nhé'); }
    };
  },

  /* ---------- Trang chủ ---------- */
  s_home() {
    const d = Store.d, p = d.profile, daily = d.daily;
    const done = daily.played.length, ready = done >= 3 && !daily.claimed;
    const steps = [0, 1, 2].map(i => { const g = GAMES.find(x => x.id === daily.played[i]); return `<div class="st ${g ? 'done' : ''}">${g ? g.icon : '?'}</div>`; }).join('');
    this.view.innerHTML = `
      <div class="top">
        <h1 class="hello">Chào ${esc(p.name)}! 👋 <br class="m">Hôm nay mình <span>chơi gì</span> nào?</h1>
        <div class="pills"><button class="pill sw" data-switch>🔄 Đổi bạn</button><div class="pill">🔥 ${d.streak.count} ngày</div><div class="pill">⭐ ${d.stars}</div></div>
      </div>
      <div class="daily">
        <div class="ring" style="--p:${Math.min(done, 3) / 3 * 100}%"><i>${Math.min(done, 3)}/3</i></div>
        <div class="dtext"><b>Nhiệm vụ hôm nay</b><p>${daily.claimed ? 'Con đã nhận quà hôm nay rồi, giỏi lắm! 🎉' : ready ? 'Xong rồi! Bấm mở rương quà nào!' : `Chơi ${3 - done} trò khác nhau nữa để mở rương quà 🎁`}</p></div>
        <div class="steps">${steps}<button class="chest ${ready ? 'ready' : ''}" data-act="chest" ${ready ? '' : 'disabled'}>${daily.claimed ? '🎉' : '🎁'}</button></div>
      </div>
      <h2 class="sec">🔤 Tiếng Anh</h2>
      <div class="games">${GAMES.filter(g => g.subject === 'en').map(gameCard).join('')}</div>
      ${mathSections()}`;
    this.bindCards();
    this.view.querySelector('[data-switch]').onclick = () => { Sfx.pop(); this.go('profiles'); };
    const chest = this.view.querySelector('[data-act=chest]');
    if (chest) chest.onclick = () => {
      if (!ready) return;
      d.daily.claimed = true; d.stars += 5; Store.save();
      Sfx.win(); confetti(90); Voice.vi('Hoan hô! Con nhận được năm ngôi sao!');
      this.toast('🎁 +5 ⭐ Thưởng nhiệm vụ hôm nay!');
      this.checkStickers();
      setTimeout(() => this.go('home'), 400);
    };
  },

  s_en() { this.subjectPage('en', '🔤 Tiếng Anh', 'Nghe, nhìn và chơi để nhớ từ mới'); },
  s_math() { this.subjectPage('math', '🔢 Toán', 'Cộng trừ, so sánh, đếm số bằng tiếng Anh'); },
  subjectPage(subj, title, sub) {
    let extra = '';
    if (subj === 'en') {
      extra = `<h2 class="sec">Các chủ đề từ vựng</h2><div class="topics">${TOPICS.map(t => {
        const m = t.words.filter(w => Store.mastered(w.id)).length;
        return `<div class="topic-card"><span class="ti">${t.icon}</span><b>${t.name}</b><div class="lv"><i style="width:${m / t.words.length * 100}%"></i></div><small>Đã thuộc ${m}/${t.words.length} từ</small></div>`;
      }).join('')}</div>`;
    }
    this.view.innerHTML = `<div class="top"><div><h1 class="hello">${title}</h1><p class="lead">${sub}</p></div><div class="pills"><div class="pill">⭐ ${Store.d.stars}</div></div></div>
      ${subj === 'math' ? mathSections(true) : `<div class="games">${GAMES.filter(g => g.subject === subj).map(gameCard).join('')}</div>`}${extra}`;
    this.bindCards();
  },

  bindCards() {
    this.view.querySelectorAll('[data-game]').forEach(c => c.onclick = () => {
      Sfx.pop(); const g = GAMES.find(x => x.id === c.dataset.game);
      g.topic ? this.pickTopic(g) : this.startGame(g);
    });
  },

  pickTopic(g) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="sheet"><h2>${g.icon} ${g.name}</h2><p class="lead">Con muốn chơi chủ đề nào?</p>
      <div class="chips">${TOPICS.map(t => `<button class="chip" data-t="${t.id}"><span>${t.icon}</span>${t.name}</button>`).join('')}
      <button class="chip mix" data-t="mix"><span>🎲</span>Trộn lẫn</button></div>
      <button class="link" data-x>Để sau</button></div>`;
    document.body.appendChild(ov);
    Voice.vi('Con muốn chơi chủ đề nào?');
    ov.onclick = e => {
      const c = e.target.closest('[data-t]');
      if (c) { Sfx.pop(); ov.remove(); this.startGame(g, c.dataset.t); }
      else if (e.target === ov || e.target.closest('[data-x]')) ov.remove();
    };
  },

  /* ---------- Chạy trò chơi ---------- */
  s_game() { this.view.innerHTML = ''; },
  startGame(g, topic) {
    this.go('game');
    this.inGame = true;
    history.pushState({ game: g.id }, '');
    const id = this.runId, level = Store.level(g.id);
    this.view.innerHTML = `
      <div class="game ${g.theme}">
        <div class="gtop"><button class="x" data-act="quit" aria-label="Thoát">✕</button><div class="bar"><i></i></div><div class="ginfo"></div></div>
        <div class="glevel">${g.icon} ${g.name} · Cấp ${level}${g.levelNames ? ' · ' + g.levelNames[level - 1] : ''}</div>
        <div class="gbody"></div>
      </div>`;
    this.view.querySelector('[data-act=quit]').onclick = () => { Sfx.pop(); history.back(); };
    const bar = this.view.querySelector('.bar i'), info = this.view.querySelector('.ginfo');
    const ctx = {
      root: this.view.querySelector('.gbody'), level, topic,
      alive: () => this.runId === id,
      progress: (p, t) => { bar.style.width = Math.round(p * 100) + '%'; info.textContent = t; },
      finish: res => { if (this.runId === id) this.finishRound(g, res, topic); },
    };
    g.play(ctx).catch(err => { console.error(err); if (this.runId === id) this.go('home'); });
  },

  finishRound(g, res, topic) {
    const d = Store.d;
    const acc = res.total ? res.correct / res.total : 0;
    const stars = res.stars ?? (acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1);
    d.stars += stars;
    // tự điều chỉnh độ khó
    const lv = Store.level(g.id); let lvMsg = '';
    const good = res.levelUp ?? acc >= 0.85;
    if (good) {
      d.good[g.id] = (d.good[g.id] || 0) + 1;
      if (d.good[g.id] >= 2 && lv < g.maxLevel) { d.levels[g.id] = lv + 1; d.good[g.id] = 0; lvMsg = `🆙 Lên Cấp ${lv + 1}!`; }
    } else {
      d.good[g.id] = 0;
      if (acc < 0.5 && lv > 1) { d.levels[g.id] = lv - 1; lvMsg = `Mình luyện lại Cấp ${lv - 1} nhé 💪`; }
    }
    // nhiệm vụ & chuỗi ngày
    if (d.daily.date !== today()) d.daily = { date: today(), played: [], claimed: false };
    if (!d.daily.played.includes(g.id)) d.daily.played.push(g.id);
    if (d.streak.last !== today()) { d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1; d.streak.last = today(); }
    d.history.push({ g: g.id, t: Date.now(), c: res.correct, n: res.total, s: stars });
    if (d.history.length > 300) d.history = d.history.slice(-300);
    Store.save();

    this.inGame = false;
    const title = stars === 3 ? g.winText : stars === 2 ? 'Làm tốt lắm!' : 'Cố lên nào!';
    const line = g.id === 'memory' ? `Con lật ${res.total} lượt` : g.id === 'race' ? (res.win ? `Về hang với ${res.correct}/${res.total} câu đúng ngay lần đầu` : `Con trả lời đúng ${res.correct} câu`) : `Đúng ${res.correct}/${res.total} câu ngay lần đầu`;
    this.view.innerHTML = `
      <div class="result-screen ${g.theme}">
        <div class="rcard">
          <div class="ricon">${g.icon}</div>
          <h1>${esc(title)}</h1>
          <div class="rstars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">⭐</span>`).join('')}</div>
          <p>${line} · +${stars} ⭐</p>
          ${lvMsg ? `<div class="lvup">${lvMsg}</div>` : ''}
          <div class="ractions">
            <button class="big-btn" data-act="again" data-enter>🔁 Chơi tiếp</button>
            <button class="big-btn ghost" data-act="home">🏠 Về nhà</button>
          </div>
        </div>
      </div>`;
    if (stars >= 2) { confetti(stars === 3 ? 80 : 40); Sfx.win(); }
    Voice.vi(stars === 3 ? 'Tuyệt vời! Ba ngôi sao!' : stars === 2 ? 'Làm tốt lắm!' : 'Cố lên nhé, mình chơi lại nào!');
    this.view.querySelector('[data-act=again]').onclick = () => { history.replaceState(null, ''); this.startGame(g, topic); };
    this.view.querySelector('[data-act=home]').onclick = () => { this.go('home'); };
    this.checkStickers();
  },

  checkStickers() {
    const d = Store.d;
    STICKERS.forEach((s, i) => {
      if (d.stars >= stickerCost(i) && !d.stickers.includes(s)) {
        d.stickers.push(s);
        setTimeout(() => this.toast(`${s} Con mở được sticker mới! Xem trong Bộ sưu tập nhé`), 900);
      }
    });
    Store.save();
  },

  toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  },

  /* ---------- Bộ sưu tập ---------- */
  s_collect() {
    const d = Store.d;
    this.view.innerHTML = `<div class="top"><div><h1 class="hello">🏆 Bộ sưu tập</h1><p class="lead">Gom sao ⭐ để mở sticker mới!</p></div><div class="pills"><div class="pill">⭐ ${d.stars}</div></div></div>
      <div class="stickers">${STICKERS.map((s, i) => {
        const got = d.stickers.includes(s);
        return `<div class="sticker ${got ? 'got' : ''}">${got ? s : '🔒'}<small>${got ? '' : stickerCost(i) + ' ⭐'}</small></div>`;
      }).join('')}</div>`;
  },

  /* ---------- Khu bố mẹ ---------- */
  s_parent() {
    const a = rand(6, 9), b = rand(6, 9);
    this.view.innerHTML = `<div class="gate card"><h1>👨‍👩‍👧 Khu dành cho bố mẹ</h1><p class="lead">Để vào, bố mẹ hãy trả lời: <b>${a} × ${b} = ?</b></p>
      <input id="gate" inputmode="numeric" autocomplete="off"><button class="big-btn" id="gok">Vào</button></div>`;
    const check = () => { if (+this.view.querySelector('#gate').value === a * b) this.parentPage(); else shake(this.view.querySelector('#gate')); };
    this.view.querySelector('#gok').onclick = check;
    this.view.querySelector('#gate').onkeydown = e => { if (e.key === 'Enter') check(); };
  },

  parentPage() {
    const d = Store.d;
    const all = Object.values(WORDS);
    const mastered = all.filter(w => Store.mastered(w.id));
    const hard = all.filter(w => (d.words[w.id]?.r || 0) > 0).sort((x, y) => d.words[y.id].r - d.words[x.id].r).slice(0, 20);
    const mathHard = Object.entries(d.mathWrong).sort((x, y) => y[1] - x[1]).slice(0, 15);
    const todayRounds = d.history.filter(h => dateKey(new Date(h.t)) === today()).length;
    const week = d.history.filter(h => Date.now() - h.t < 7 * 864e5).length;
    this.view.innerHTML = `
      <div class="top"><h1 class="hello">👨‍👩‍👧 Tiến độ của ${esc(d.profile.name)}</h1></div>
      <div class="stats">
        <div class="stat"><b>${d.stars}</b><small>Tổng sao</small></div>
        <div class="stat"><b>${mastered.length}/${all.length}</b><small>Từ đã thuộc</small></div>
        <div class="stat"><b>${todayRounds}</b><small>Lượt chơi hôm nay</small></div>
        <div class="stat"><b>${week}</b><small>Lượt chơi 7 ngày</small></div>
      </div>
      <div class="pgrid">
        <div class="card"><h3>Cấp độ từng trò</h3>
          ${GAMES.map(g => `<div class="lvrow"><span>${g.icon} ${g.name}</span><span class="lvctl"><button data-lv="${g.id}" data-d="-1">−</button><b>Cấp ${Store.level(g.id)}/${g.maxLevel}</b><button data-lv="${g.id}" data-d="1">+</button></span></div>`).join('')}
          <p class="hint">Trang tự tăng cấp khi bé làm tốt 2 lượt liên tiếp và tự hạ cấp khi bé sai nhiều. Bố mẹ cũng có thể chỉnh tay.</p>
        </div>
        <div class="card"><h3>Từ bé hay sai (sẽ được hỏi lại)</h3>
          <div class="wlist">${hard.length ? hard.map(w => `<span class="wtag bad" data-say="${esc(w.en)}">${w.emo || w.text || '🎨'} ${esc(w.en)} <small>${esc(w.vi)}</small></span>`).join('') : '<p class="hint">Chưa có, bé làm tốt lắm!</p>'}</div>
          <h3>Phép tính bé hay sai</h3>
          <div class="wlist">${mathHard.length ? mathHard.map(([k, n]) => `<span class="wtag bad">${esc(k)} <small>×${n}</small></span>`).join('') : '<p class="hint">Chưa có.</p>'}</div>
        </div>
        <div class="card"><h3>Từ đã thuộc</h3>
          <div class="wlist">${mastered.length ? mastered.map(w => `<span class="wtag ok" data-say="${esc(w.en)}">${w.emo || w.text || '🎨'} ${esc(w.en)}</span>`).join('') : '<p class="hint">Bé cần trả lời đúng một từ 3 lần thì từ đó được tính là đã thuộc.</p>'}</div>
        </div>
        <div class="card"><h3>Cài đặt</h3>
          <label>Tốc độ đọc tiếng Anh: <b id="rv">${d.settings.rate}</b></label>
          <input type="range" id="rate" min="0.5" max="1.1" step="0.05" value="${d.settings.rate}">
          <label class="row"><input type="checkbox" id="vi" ${d.settings.vi ? 'checked' : ''}> Đọc hướng dẫn bằng tiếng Việt ${Voice.hasVi() ? '' : '<small class="warn">(máy này chưa có giọng tiếng Việt)</small>'}</label>
          <div class="row gap"><button class="small-btn" id="ten">🔊 Thử giọng Anh</button><button class="small-btn" id="tvi">🔊 Thử giọng Việt</button></div>
          <p class="hint">Giọng đang dùng: tiếng Việt = <b>${esc(Voice.source('vi') || 'chưa có')}</b>; tiếng Anh = <b>${esc(Voice.source('en') || 'chưa có')}</b>.</p>
          <button class="small-btn danger" id="reset">Xóa toàn bộ tiến độ của ${esc(d.profile.name)}</button>
        </div>
        <div class="card"><h3>Hồ sơ các bé</h3>
          <div class="plist">⏳</div>
          <button class="small-btn" id="padd">➕ Thêm hồ sơ mới</button>
          <p class="hint">Mỗi bé có sao, sticker, cấp độ và từ đã thuộc riêng. Bấm "Đổi bạn" ở trang chủ để chuyển sang bé khác.</p>
        </div>
      </div>`;
    this.view.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
      const g = GAMES.find(x => x.id === b.dataset.lv);
      d.levels[g.id] = Math.max(1, Math.min(g.maxLevel, Store.level(g.id) + +b.dataset.d)); d.good[g.id] = 0; Store.save(); this.parentPage();
    });
    this.view.querySelectorAll('[data-say]').forEach(t => t.onclick = () => Voice.en(t.dataset.say));
    this.view.querySelector('#rate').oninput = e => { d.settings.rate = +e.target.value; this.view.querySelector('#rv').textContent = e.target.value; Store.save(); };
    this.view.querySelector('#vi').onchange = e => { d.settings.vi = e.target.checked; Store.save(); };
    this.view.querySelector('#ten').onclick = () => Voice.en('Hello! I am a cat.');
    this.view.querySelector('#tvi').onclick = () => Voice.say('Xin chào, mình cùng học nhé!', 'vi', 1);
    this.view.querySelector('#reset').onclick = () => { if (confirm(`Xóa toàn bộ sao, sticker và tiến độ của ${d.profile.name}? (Hồ sơ vẫn được giữ lại)`)) { Store.reset(); this.go('home'); } };
    this.view.querySelector('#padd').onclick = () => this.go('welcome');
    this.loadProfileManager();
  },

  /* Danh sách hồ sơ trong khu bố mẹ: đổi tên, xóa */
  async loadProfileManager() {
    const box = this.view.querySelector('.plist'); if (!box) return;
    let list;
    try { list = await Store.listProfiles(); } catch (e) { box.textContent = 'Chưa tải được danh sách hồ sơ.'; return; }
    this.profileCount = list.length;
    box.innerHTML = list.map(p => `<div class="prow ${p.id === Store.pid ? 'me' : ''}" data-id="${p.id}">
        <span class="face">${esc(p.avatar)}</span>
        <input value="${esc(p.name)}" maxlength="16" data-name aria-label="Tên bé">
        <small>⭐ ${p.stars}${p.id === Store.pid ? '<br>đang xem' : ''}</small>
        <button class="small-btn danger" data-del>Xóa</button></div>`).join('');
    box.onchange = async e => {
      const row = e.target.closest('.prow'); if (!row || !e.target.matches('[data-name]')) return;
      const id = +row.dataset.id;
      try {
        const r = await Store.renameProfile(id, { name: e.target.value.trim() || 'Bé' });
        e.target.value = r.name;
        if (id === Store.pid) { Store.d.profile.name = r.name; this.updateProfile(); }
      } catch (err) { this.toast('Chưa đổi được tên, thử lại nhé'); }
    };
    box.onclick = async e => {
      const row = e.target.closest('.prow'); if (!row || !e.target.matches('[data-del]')) return;
      const id = +row.dataset.id, name = row.querySelector('[data-name]').value;
      if (!confirm(`Xóa hồ sơ "${name}" cùng toàn bộ tiến độ? Không thể khôi phục.`)) return;
      const isMe = id === Store.pid;
      if (isMe) Store.discard();
      try { await Store.deleteProfile(id); } catch (err) { if (err.status !== 404) { this.toast('Chưa xóa được, thử lại nhé'); return isMe ? this.go('profiles') : null; } }
      if (isMe) this.go('profiles'); else this.loadProfileManager();
    };
  },
};

/* Toán: nhóm theo sách (xếp theo số bài) và nhóm trò chơi luyện tính */
function mathSections(onlyBook) {
  const math = GAMES.filter(g => g.subject === 'math');
  const book1 = math.filter(g => g.ord && g.book === 1).sort((a, b) => a.ord - b.ord);
  const book2 = math.filter(g => g.ord && g.book === 2).sort((a, b) => a.ord - b.ord);
  const fun = math.filter(g => !g.ord);
  return `<h2 class="sec">📗 Theo sách Toán 1 (Kết nối tri thức)</h2>
    <p class="hint sechint">Mỗi trò ghi số chủ đề trong sách để bố mẹ dễ đối chiếu.</p>
    <div class="games">${book1.map(gameCard).join('')}</div>
    <h2 class="sec">📘 Theo sách Toán 2 (Kết nối tri thức, tập 1)</h2>
    <p class="hint sechint">Mỗi trò ghi số bài trong sách để bố mẹ dễ đối chiếu.</p>
    <div class="games">${book2.map(gameCard).join('')}</div>
    <h2 class="sec">🎮 Trò chơi luyện tính</h2><div class="games">${fun.map(gameCard).join('')}</div>`;
}

function rankOf(stars) { let r = RANKS[0][1]; for (const [s, n] of RANKS) if (stars >= s) r = n; return r; }

function gameCard(g) {
  const lv = Store.level(g.id);
  return `<button class="g ${g.theme}" data-game="${g.id}">
    <span class="tag">${esc(g.tag || (g.subject === 'en' ? 'ENGLISH' : 'MATH'))}</span><span class="art">${g.icon}</span>
    <b>${g.name}</b><small>${g.desc}</small>
    <div class="lv"><i style="width:${lv / g.maxLevel * 100}%"></i></div><small class="lvt">Cấp ${lv}/${g.maxLevel}</small>
    <span class="blob"></span></button>`;
}

document.addEventListener('DOMContentLoaded', () => App.init());
