/* 6 trò chơi. Mỗi trò: { id, subject, name, icon, theme, desc, maxLevel, topic, play(ctx) }
   ctx = { root, level, topic, alive(), progress(p, info), finish({correct,total,stars?,levelUp?}) } */

const GAMES = [];

/* Khung câu hỏi chung: nhân vật + bong bóng thoại */
const speaker = (who, text) => `<div class="speaker"><div class="who">${who}</div><div class="bubble">${text}</div></div>`;
const feedback = (title, sub) => `<div class="feedback"><div><b>${title}</b><small>${sub}</small></div><button class="next" data-act="next" data-enter>Tiếp ➜</button></div>`;
const PRAISE = ['Giỏi quá! 🎉', 'Tuyệt vời! ⭐', 'Đúng rồi! 👏', 'Siêu quá! 🚀', 'Xuất sắc! 🌟'];

/* ===================== 1. THÁM TỬ NHÍ: nghe & chọn hình ===================== */
GAMES.push({
  id: 'detective', subject: 'en', name: 'Thám tử nhí', icon: '🕵️', theme: 't-detective', maxLevel: 3, topic: true,
  desc: 'Nghe từ tiếng Anh, tìm hình đúng',
  winText: 'Phá án thành công!',
  async play(ctx) {
    const pool = wordsForTopic(ctx.topic), N = 8;
    const nChoice = [3, 4, 6][ctx.level - 1];
    const qs = pickWords(pool, N);
    const all = pool.length >= nChoice ? pool : wordsForTopic('mix');
    let correct = 0;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const w = qs[i];
      const others = shuffle(all.filter(x => x.id !== w.id && x.en !== w.en)).slice(0, nChoice - 1);
      const opts = shuffle([w, ...others]);
      const topic = TOPICS.find(t => t.id === w.topic);
      ctx.progress(i / N, `🔍 ${i}/${N}`);
      ctx.root.innerHTML = `
        ${speaker('🕵️', esc(topic.ask))}
        <div class="listen-row">
          <button class="listen" data-act="say">🔊 Nghe</button>
          <button class="listen slow" data-act="slow">🐢 Chậm</button>
        </div>
        <div class="choices n${nChoice}">
          ${opts.map((o, k) => `<button class="choice" data-id="${o.id}" data-key="${k + 1}">${pic(o)}<span class="k">${k + 1}</span></button>`).join('')}
        </div>
        <div class="fb-slot"></div>`;
      const say = () => Voice.en(w.en);
      ctx.root.querySelector('[data-act=say]').onclick = say;
      ctx.root.querySelector('[data-act=slow]').onclick = () => Voice.en(w.en, true);
      await wait(250); say();
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.choice').forEach(b => b.onclick = async () => {
          if (b.dataset.id === w.id) {
            ctx.root.querySelectorAll('.choice').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good();
            if (first) correct++;
            Store.markWord(w.id, first);
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${esc(w.en)} = ${esc(w.vi)}`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
            await Voice.en(w.en); Voice.vi(w.vi);
          } else {
            first = false; b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
            Voice.en(w.en);
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== 2. LẬT THẺ TRÍ NHỚ ===================== */
GAMES.push({
  id: 'memory', subject: 'en', name: 'Lật thẻ trí nhớ', icon: '🃏', theme: 't-memory', maxLevel: 3, topic: true,
  desc: 'Ghép hình với từ tiếng Anh',
  winText: 'Con có trí nhớ siêu đỉnh!',
  async play(ctx) {
    const pairs = [3, 4, 6][ctx.level - 1];
    const pool = wordsForTopic(ctx.topic);
    const ws = shuffle(pool).slice(0, Math.min(pairs, pool.length));
    const cards = shuffle(ws.flatMap(w => [{ w, kind: 'pic' }, { w, kind: 'word' }]));
    let open = [], matched = 0, tries = 0, lock = false;
    ctx.progress(0, `🃏 0/${ws.length}`);
    ctx.root.innerHTML = `
      ${speaker('🦉', 'Lật 2 thẻ giống nhau: một hình và một chữ nhé!')}
      <div class="memory c${cards.length}">
        ${cards.map((c, i) => `<button class="mcard" data-i="${i}"><span class="back">?</span><span class="front">${c.kind === 'pic' ? pic(c.w) : `<span class="word">${esc(c.w.en)}</span>`}</span></button>`).join('')}
      </div>`;
    Voice.vi('Lật hai thẻ giống nhau nhé');
    await new Promise(done => {
      ctx.root.querySelectorAll('.mcard').forEach(el => el.onclick = async () => {
        const c = cards[+el.dataset.i];
        if (lock || el.classList.contains('up')) return;
        el.classList.add('up'); Sfx.flip(); Voice.en(c.w.en);
        open.push({ el, c });
        if (open.length < 2) return;
        lock = true; tries++;
        const [a, b] = open; open = [];
        if (a.c.w.id === b.c.w.id) {
          await wait(450);
          a.el.classList.add('done'); b.el.classList.add('done'); Sfx.good();
          Store.markWord(a.c.w.id, true);
          matched++; ctx.progress(matched / ws.length, `🃏 ${matched}/${ws.length}`);
          await Voice.en(a.c.w.en); await Voice.vi(a.c.w.vi);
          lock = false;
          if (matched === ws.length) { await wait(400); done(); }
        } else {
          await wait(1000);
          a.el.classList.remove('up'); b.el.classList.remove('up');
          lock = false;
        }
      });
    });
    const n = ws.length;
    const stars = tries <= n * 1.5 ? 3 : tries <= n * 2.2 ? 2 : 1;
    ctx.finish({ correct: n, total: tries, stars, levelUp: stars === 3 });
  },
});

/* ===================== 3. TÚI BẢO BỐI: điền chữ còn thiếu ===================== */
GAMES.push({
  id: 'gadget', subject: 'en', name: 'Túi bảo bối', icon: '🤖', theme: 't-gadget', maxLevel: 3, topic: true,
  desc: 'Điền chữ còn thiếu, mở túi bảo bối',
  winText: 'Túi bảo bối đầy ắp rồi!',
  async play(ctx) {
    const maxLen = [3, 5, 99][ctx.level - 1];
    let pool = wordsForTopic(ctx.topic).filter(w => /^[a-z]+$/.test(w.en));
    let fit = pool.filter(w => w.en.length <= maxLen);
    if (fit.length < 4) fit = pool.slice().sort((a, b) => a.en.length - b.en.length).slice(0, Math.max(4, fit.length));
    const N = 8, qs = pickWords(fit, N);
    const nOpt = ctx.level === 1 ? 3 : 4;
    const ABC = 'abcdefghijklmnoprstuwy';
    let correct = 0, bag = [];
    for (let i = 0; i < N && ctx.alive(); i++) {
      const w = qs[i], word = w.en;
      const hide = rand(0, word.length - 1), ans = word[hide];
      const opts = shuffle([ans, ...shuffle(ABC.split('').filter(c => c !== ans)).slice(0, nOpt - 1)]);
      ctx.progress(i / N, `🎒 ${bag.length}`);
      ctx.root.innerHTML = `
        ${speaker('🤖', 'Điền chữ còn thiếu để mở túi bảo bối nhé!')}
        <div class="gadget-card">
          <div class="gpic">${pic(w, 'big')}</div>
          <button class="listen sm" data-act="say">🔊</button>
          <div class="slots">${word.split('').map((ch, k) => `<span class="slot ${k === hide ? 'blank' : ''}">${k === hide ? '?' : ch}</span>`).join('')}</div>
        </div>
        <div class="letters">${opts.map((l, k) => `<button class="letter" data-l="${l}" data-key="${k + 1}">${l}</button>`).join('')}</div>
        <div class="fb-slot"></div>`;
      ctx.root.querySelector('[data-act=say]').onclick = () => Voice.en(word);
      await wait(250); Voice.en(word);
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.letter').forEach(b => b.onclick = async () => {
          if (b.dataset.l === ans) {
            ctx.root.querySelectorAll('.letter').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good();
            const slot = ctx.root.querySelector('.slot.blank'); slot.textContent = ans; slot.classList.add('filled');
            if (first) correct++;
            Store.markWord(w.id, first);
            bag.push(w);
            ctx.root.querySelector('.gadget-card').classList.add('opened');
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${esc(word)} = ${esc(w.vi)} · Đã cất vào túi 🎒`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
            await Voice.en(word); Voice.vi(w.vi);
          } else {
            first = false; b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== 4. MÈO ĐUỔI CHUỘT: tính nhanh ===================== */
function mathFact(level) {
  const lim = [10, 20, 50, 100][level - 1];
  let a, b, op;
  if (Math.random() < 0.5) { // cộng
    op = '+';
    if (level <= 2) { a = rand(1, lim - 1); b = rand(1, lim - a); }
    else if (level === 3) { a = rand(10, lim - 9); b = rand(1, Math.min(9, lim - a)); }
    else { a = rand(1, 9) * 10 + rand(0, 4); b = rand(1, 9 - Math.floor(a / 10)) * 10 + rand(0, 5 - (a % 10)); if (a + b > 100) { a = 40; b = 30; } }
  } else { // trừ
    op = '−';
    if (level <= 2) { a = rand(2, lim); b = rand(1, a); }
    else if (level === 3) { a = rand(15, lim); b = rand(1, 9); }
    else { a = rand(3, 9) * 10 + rand(5, 9); b = rand(1, Math.floor(a / 10) - 1) * 10 + rand(0, a % 10); }
  }
  const ans = op === '+' ? a + b : a - b;
  return { a, b, op, ans, key: `${a} ${op} ${b}` };
}
function numberOptions(ans, n, step = 1) {
  const set = new Set([ans]);
  const deltas = shuffle([1, -1, 2, -2, step * 10, -step * 10, 3, -3]);
  for (const d of deltas) { if (set.size >= n) break; if (ans + d >= 0) set.add(ans + d); }
  let k = 4; while (set.size < n) set.add(ans + k++);
  return shuffle([...set]);
}

GAMES.push({
  id: 'race', subject: 'math', name: 'Mèo đuổi chuột', icon: '🐭', theme: 't-race', maxLevel: 4, topic: false,
  desc: 'Tính nhanh giúp chuột Tí chạy về hang',
  winText: 'Chuột Tí về hang an toàn!',
  levelNames: ['Trong 10', 'Trong 20', 'Trong 50', 'Trong 100'],
  async play(ctx) {
    const GOAL = 10, speed = [1.1, 1.3, 1.5, 1.7][ctx.level - 1];
    ctx.root.innerHTML = `
      ${speaker('🐭', 'Mèo Mướp đang đuổi tớ! Con tính đúng thật nhanh để giúp tớ chạy về hang nhé!')}
      <div class="center"><button class="big-btn" data-act="go" data-enter>🏃 Chạy thôi!</button></div>`;
    Voice.vi('Tính đúng thật nhanh để giúp chuột chạy về hang nhé');
    await new Promise(r => ctx.root.querySelector('[data-act=go]').onclick = r);
    ctx.progress(0, `🧀 0/${GOAL}`);
    let mouse = 30, cat = 0, right = 0, answered = 0, firstOk = 0, over = false, win = false;
    ctx.root.innerHTML = `
      <div class="track"><div class="lane">
        <span class="hole">🕳️</span><span class="runner mouse">🐭</span><span class="runner cat">🐱</span>
      </div></div>
      <div class="mathq"></div>
      <div class="opts"></div>`;
    const elM = ctx.root.querySelector('.mouse'), elC = ctx.root.querySelector('.cat');
    const draw = () => { elM.style.left = `calc(${mouse}% - ${mouse * 0.44}px)`; elC.style.left = `calc(${cat}% - ${cat * 0.44}px)`; };
    let last = performance.now();
    const tick = now => {
      if (over || !ctx.alive()) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      cat += speed * dt;
      if (cat >= mouse - 6) { over = true; }
      draw();
      if (!over) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const qEl = ctx.root.querySelector('.mathq'), oEl = ctx.root.querySelector('.opts');
    while (!over && ctx.alive()) {
      const f = mathFact(ctx.level);
      qEl.innerHTML = `${f.a} ${f.op} ${f.b} = <span class="qm">?</span>`;
      oEl.innerHTML = numberOptions(f.ans, 4, ctx.level >= 3 ? 1 : 0).map((n, k) => `<button class="opt" data-n="${n}" data-key="${k + 1}">${n}</button>`).join('');
      let first = true;
      const res = await new Promise(done => {
        const iv = setInterval(() => { if (over || !ctx.alive()) { clearInterval(iv); done('over'); } }, 100);
        oEl.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          if (over) return;
          if (+b.dataset.n === f.ans) {
            clearInterval(iv); b.classList.add('ok'); Sfx.good();
            qEl.querySelector('.qm').textContent = f.ans;
            done('ok');
          } else {
            if (first) { first = false; Store.d.mathWrong[f.key] = (Store.d.mathWrong[f.key] || 0) + 1; }
            b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
            cat = Math.min(mouse - 5.9, cat + 5);
          }
        });
      });
      if (res === 'over') break;
      answered++; right++; if (first) firstOk++;
      mouse = 30 + right * 7; draw();
      ctx.progress(right / GOAL, `🧀 ${right}/${GOAL}`);
      if (right >= GOAL) { win = true; over = true; break; }
      await wait(350);
    }
    if (!ctx.alive()) return;
    if (!win) {
      ctx.root.querySelector('.mathq').innerHTML = '😿 Mèo bắt được rồi!';
      ctx.root.querySelector('.opts').innerHTML = '';
      Sfx.bad(); await wait(1300);
    }
    const acc = answered ? firstOk / answered : 0;
    const stars = win ? (acc >= 0.8 ? 3 : 2) : (right >= 5 ? 2 : 1);
    ctx.finish({ correct: firstOk, total: Math.max(answered, 1), stars, levelUp: win && acc >= 0.8, win });
  },
});

/* ===================== 5. CÁ SẤU SO SÁNH ===================== */
GAMES.push({
  id: 'croc', subject: 'math', name: 'Cá sấu so sánh', icon: '🐊', theme: 't-croc', maxLevel: 3, topic: false,
  desc: 'Cá sấu luôn ăn số lớn hơn',
  winText: 'Cá sấu no căng bụng rồi!',
  levelNames: ['Số lớn hơn (trong 10)', 'Lớn hơn / bằng (trong 20)', 'Dấu > < = (trong 100)'],
  async play(ctx) {
    const N = 8; let correct = 0;
    const dots = n => n <= 10 ? `<div class="dots">${'●'.repeat(n) || '&nbsp;'}</div>` : '';
    for (let i = 0; i < N && ctx.alive(); i++) {
      let a, b;
      if (ctx.level === 1) { a = rand(1, 10); do { b = rand(1, 10); } while (b === a); }
      else if (ctx.level === 2) { a = rand(0, 20); b = Math.random() < 0.2 ? a : rand(0, 20); }
      else { a = rand(10, 99); b = Math.random() < 0.15 ? a : (Math.random() < 0.5 ? Math.floor(a / 10) * 10 + rand(0, 9) : rand(10, 99)); }
      const sign = a > b ? '>' : a < b ? '<' : '=';
      const sentence = sign === '>' ? `${a} is greater than ${b}` : sign === '<' ? `${a} is less than ${b}` : `${a} equals ${b}`;
      ctx.progress(i / N, `🐊 ${i}/${N}`);
      const ask = ctx.level === 3 ? 'Chọn dấu đúng nhé: > lớn hơn, < bé hơn, = bằng' : 'Cá sấu đói rồi! Chạm vào số LỚN HƠN nhé!';
      ctx.root.innerHTML = `
        ${speaker('🐊', ask)}
        <div class="compare">
          <button class="ncard" data-v="L" ${ctx.level < 3 ? 'data-key="1"' : 'disabled'}><b>${a}</b>${dots(a)}</button>
          <div class="mid"><span class="sign">?</span></div>
          <button class="ncard" data-v="R" ${ctx.level < 3 ? 'data-key="3"' : 'disabled'}><b>${b}</b>${dots(b)}</button>
        </div>
        <div class="signs">
          ${ctx.level === 2 ? '<button class="opt wide" data-v="=" data-key="2">= Bằng nhau</button>' : ''}
          ${ctx.level === 3 ? ['>', '=', '<'].map((s, k) => `<button class="opt" data-v="${s}" data-key="${k + 1}">${s}</button>`).join('') : ''}
        </div>
        <div class="fb-slot"></div>`;
      if (i === 0) Voice.vi(ctx.level === 3 ? 'Chọn dấu đúng nhé' : 'Chạm vào số lớn hơn nhé');
      const correctV = ctx.level === 3 ? sign : (sign === '>' ? 'L' : sign === '<' ? 'R' : '=');
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('[data-v]').forEach(btn => btn.onclick = async () => {
          if (btn.dataset.v === correctV) {
            ctx.root.querySelectorAll('[data-v]').forEach(x => x.disabled = true);
            btn.classList.add('ok'); Sfx.good(); if (first) correct++;
            const s = ctx.root.querySelector('.sign'); s.textContent = sign; s.classList.add('shown');
            const mid = ctx.root.querySelector('.mid'); mid.classList.add(sign === '>' ? 'eat-left' : sign === '<' ? 'eat-right' : 'eat-eq');
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${a} ${sign} ${b} · ${esc(sentence)}`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
            Voice.en(sentence);
          } else {
            if (first) { first = false; Store.d.mathWrong[`${a} ? ${b}`] = (Store.d.mathWrong[`${a} ? ${b}`] || 0) + 1; }
            btn.disabled = true; btn.classList.add('no'); shake(btn); Sfx.bad();
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== 6. ĐẾM HÌNH (How many?) ===================== */
GAMES.push({
  id: 'count', subject: 'math', name: 'Đếm hình', icon: '🍎', theme: 't-count', maxLevel: 3, topic: false,
  desc: 'How many? Đếm và học số tiếng Anh',
  winText: 'Con đếm giỏi quá!',
  levelNames: ['1 – 5', '1 – 10', '5 – 20'],
  async play(ctx) {
    const N = 8; let correct = 0;
    const [lo, hi] = [[1, 5], [1, 10], [5, 20]][ctx.level - 1];
    const nOpt = ctx.level === 1 ? 3 : 4;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const [one, many, emo, vi] = pickOne(COUNT_ITEMS);
      const n = rand(lo, hi);
      const noun = n === 1 ? one : many;
      const q = `How many ${many}?`;
      const opts = (() => { const s = new Set([n]); for (const d of shuffle([1, -1, 2, -2, 3])) { if (s.size >= nOpt) break; const v = n + d; if (v >= 1 && v <= 20) s.add(v); } let k = 1; while (s.size < nOpt) { if (!s.has(k)) s.add(k); k++; } return shuffle([...s]); })();
      ctx.progress(i / N, `🔢 ${i}/${N}`);
      ctx.root.innerHTML = `
        ${speaker('🐻', `<span class="en">${esc(q)}</span><small>Có bao nhiêu ${esc(vi)}?</small>`)}
        <div class="listen-row"><button class="listen" data-act="say">🔊 Nghe</button></div>
        <div class="countbox">${Array.from({ length: n }, () => `<span>${emo}</span>`).join('')}</div>
        <div class="opts">${opts.map((v, k) => `<button class="opt num" data-n="${v}" data-key="${k + 1}"><b>${v}</b><small>${NUMBER_WORDS[v]}</small></button>`).join('')}</div>
        <div class="fb-slot"></div>`;
      ctx.root.querySelector('[data-act=say]').onclick = () => Voice.en(q);
      await wait(250); Voice.en(q);
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.opt').forEach(b => b.onclick = async () => {
          if (+b.dataset.n === n) {
            ctx.root.querySelectorAll('.opt').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good(); if (first) correct++;
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${n} = ${NUMBER_WORDS[n]} · ${NUMBER_WORDS[n]} ${esc(noun)}`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
            Voice.en(`${NUMBER_WORDS[n]} ${noun}!`);
          } else {
            if (first) { first = false; Store.d.mathWrong[`Đếm ${n} ${emo}`] = (Store.d.mathWrong[`Đếm ${n} ${emo}`] || 0) + 1; }
            b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
            Voice.en(NUMBER_WORDS[+b.dataset.n]);
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== Tiện ích cho đề toán có lời ===================== */
const kwHtml = t => esc(t).replace(/\*(.+?)\*/g, '<b class="kw">$1</b>');
const kwPlain = t => t.replace(/\*/g, '');

/* ===================== 7. TỔNG VÀ HIỆU (số hạng, tổng, số bị trừ, số trừ, hiệu) ===================== */
function sdQuestion(level) {
  const lim = [20, 50, 100][level - 1];
  const t = pickOne(level === 1 ? ['sum', 'diff'] : ['sum', 'diff', 'term', 'sub', 'minu']);
  const plus = t === 'sum' || t === 'term';
  let a, b, r;
  if (plus) { a = rand(2, lim - 2); b = rand(1, lim - a); r = a + b; }
  else { a = rand(3, lim); b = rand(1, a - 1); r = a - b; }
  const op = plus ? '+' : '−';
  const L = plus ? ['số hạng', 'số hạng', 'tổng'] : ['số bị trừ', 'số trừ', 'hiệu'];
  const P = (v, i, q) => ({ v: q ? '?' : v, lab: L[i], q });
  const eq = `${a} ${op} ${b} = ${r}`;
  switch (t) {
    case 'sum': return { op, parts: [P(a, 0), P(b, 1), P(r, 2, 1)], ans: r, ask: 'Tính *tổng* nhé!', say: `Tính tổng của ${a} và ${b}`, eq, note: `Tổng là ${r}`, key: eq };
    case 'diff': return { op, parts: [P(a, 0), P(b, 1), P(r, 2, 1)], ans: r, ask: 'Tính *hiệu* nhé!', say: `Tính hiệu của ${a} và ${b}`, eq, note: `Hiệu là ${r}`, key: eq };
    case 'term': return { op, parts: [P(a, 0, 1), P(b, 1), P(r, 2)], ans: a, ask: 'Tìm *số hạng* chưa biết!', say: `Tìm số hạng chưa biết. Số hạng kia là ${b}, tổng là ${r}`, eq, note: `Số hạng cần tìm là ${a}`, key: `? + ${b} = ${r}` };
    case 'sub': return { op, parts: [P(a, 0), P(b, 1, 1), P(r, 2)], ans: b, ask: 'Tìm *số trừ* chưa biết!', say: `Tìm số trừ chưa biết. Số bị trừ là ${a}, hiệu là ${r}`, eq, note: `Số trừ cần tìm là ${b}`, key: `${a} − ? = ${r}` };
    default: return { op, parts: [P(a, 0, 1), P(b, 1), P(r, 2)], ans: a, ask: 'Tìm *số bị trừ* chưa biết!', say: `Tìm số bị trừ chưa biết. Số trừ là ${b}, hiệu là ${r}`, eq, note: `Số bị trừ cần tìm là ${a}`, key: `? − ${b} = ${r}` };
  }
}

GAMES.push({
  id: 'sumdiff', subject: 'math', name: 'Tổng và Hiệu', icon: '🧮', theme: 't-sumdiff', maxLevel: 3, topic: false,
  desc: 'Số hạng, tổng, số bị trừ, số trừ, hiệu',
  winText: 'Con là nhà toán học nhí!',
  levelNames: ['Trong 20', 'Trong 50', 'Trong 100'],
  async play(ctx) {
    const N = 8; let correct = 0;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const q = sdQuestion(ctx.level);
      ctx.progress(i / N, `🧮 ${i}/${N}`);
      const opts = numberOptions(q.ans, 4, ctx.level >= 2 ? 1 : 0);
      ctx.root.innerHTML = `
        ${speaker('🐘', kwHtml(q.ask))}
        <div class="listen-row"><button class="listen sm" data-act="say">🔊 Nghe đề</button></div>
        <div class="equation">${q.parts.map((p, k) =>
          `${k === 1 ? `<span class="eop">${q.op}</span>` : ''}${k === 2 ? '<span class="eop">=</span>' : ''}<div class="eterm"><span class="enum ${p.q ? 'unk' : ''}">${p.v}</span><small>${p.lab}</small></div>`).join('')}</div>
        <div class="opts">${opts.map((n, k) => `<button class="opt" data-n="${n}" data-key="${k + 1}">${n}</button>`).join('')}</div>
        <div class="fb-slot"></div>`;
      ctx.root.querySelector('[data-act=say]').onclick = () => Voice.say(q.say, 'vi', 1);
      await wait(250); Voice.vi(q.say);
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          if (+b.dataset.n === q.ans) {
            ctx.root.querySelectorAll('.opt').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good(); if (first) correct++;
            const u = ctx.root.querySelector('.enum.unk'); u.textContent = q.ans; u.classList.add('filled');
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${q.eq} · ${q.note}`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
            Voice.vi(q.note);
          } else {
            if (first) { first = false; Store.d.mathWrong[q.key] = (Store.d.mathWrong[q.key] || 0) + 1; }
            b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== 8. NHIỀU HƠN, ÍT HƠN (bài toán có lời văn) ===================== */
const CMP_NAMES = ['An', 'Bình', 'Lan', 'Nam', 'Mai', 'Hùng', 'Linh', 'Tú', 'Hoa', 'Minh'];
const CMP_THINGS = [['quả táo', '🍎'], ['viên bi', '🔵'], ['bông hoa', '🌸'], ['cái kẹo', '🍬'], ['ngôi sao', '⭐'], ['quyển vở', '📒'], ['quả bóng', '⚽'], ['chiếc lá', '🍃']];

function cmpQuestion(level) {
  const lim = level === 3 ? 100 : 20;
  const t = pickOne(level === 1 ? ['more', 'less'] : level === 2 ? ['moreThan', 'lessThan'] : ['more', 'less', 'moreThan', 'lessThan']);
  const [X, Y] = shuffle(CMP_NAMES).slice(0, 2);
  const [noun, emo] = pickOne(CMP_THINGS);
  const kmax = level === 3 ? 30 : 9;
  let text, ans, eq, hint, rows = [];
  if (t === 'more' || t === 'less') {
    const a = rand(3, lim), b = rand(1, a - 1); ans = a - b;
    text = t === 'more'
      ? `${X} có ${a} ${noun}. ${Y} có ${b} ${noun}. Hỏi ${X} có *nhiều hơn* ${Y} mấy ${noun}?`
      : `${X} có ${a} ${noun}. ${Y} có ${b} ${noun}. Hỏi ${Y} có *ít hơn* ${X} mấy ${noun}?`;
    eq = `${a} − ${b} = ${ans}`; hint = `Lấy số lớn trừ số bé để tìm phần ${t === 'more' ? 'nhiều' : 'ít'} hơn`;
    rows = [[X, a], [Y, b]];
  } else if (t === 'moreThan') {
    const b = rand(2, lim - 3), k = rand(1, Math.min(lim - b, kmax)); ans = b + k;
    text = `${X} có ${b} ${noun}. ${Y} có *nhiều hơn* ${X} ${k} ${noun}. Hỏi ${Y} có mấy ${noun}?`;
    eq = `${b} + ${k} = ${ans}`; hint = 'Nhiều hơn thì làm phép cộng'; rows = [[X, b]];
  } else {
    const a = rand(4, lim), k = rand(1, Math.min(a - 1, kmax)); ans = a - k;
    text = `${X} có ${a} ${noun}. ${Y} có *ít hơn* ${X} ${k} ${noun}. Hỏi ${Y} có mấy ${noun}?`;
    eq = `${a} − ${k} = ${ans}`; hint = 'Ít hơn thì làm phép trừ'; rows = [[X, a]];
  }
  const show = rows.every(r => r[1] <= 20);
  const pics = show ? rows.map(([who, n]) => `<div class="rowpic"><b>${who}</b><span>${Array(n).fill(emo).join('')}</span></div>`).join('') : '';
  return { text, ans, eq, hint, pics, key: eq.replace(/= .*/, '= ?') + ' (' + t + ')' };
}

GAMES.push({
  id: 'compare', subject: 'math', name: 'Nhiều hơn, Ít hơn', icon: '⚖️', theme: 't-compare', maxLevel: 3, topic: false,
  desc: 'Bài toán: hơn kém bao nhiêu, nhiều hơn, ít hơn',
  winText: 'Con giải toán giỏi quá!',
  levelNames: ['Hơn kém bao nhiêu', 'Tìm số nhiều hơn, ít hơn', 'Trộn lẫn, trong 100'],
  async play(ctx) {
    const N = 8; let correct = 0;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const q = cmpQuestion(ctx.level);
      ctx.progress(i / N, `⚖️ ${i}/${N}`);
      const opts = numberOptions(q.ans, 4, ctx.level === 3 ? 1 : 0);
      ctx.root.innerHTML = `
        ${speaker('🐼', kwHtml(q.text))}
        <div class="listen-row"><button class="listen sm" data-act="say">🔊 Nghe đề</button></div>
        ${q.pics ? `<div class="rowpics">${q.pics}</div>` : ''}
        <div class="opts">${opts.map((n, k) => `<button class="opt" data-n="${n}" data-key="${k + 1}">${n}</button>`).join('')}</div>
        <div class="fb-slot"></div>`;
      ctx.root.querySelector('[data-act=say]').onclick = () => Voice.say(kwPlain(q.text), 'vi', 1);
      await wait(250); Voice.vi(kwPlain(q.text));
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          if (+b.dataset.n === q.ans) {
            ctx.root.querySelectorAll('.opt').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good(); if (first) correct++;
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${q.eq} · ${q.hint}`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
          } else {
            if (first) { first = false; Store.d.mathWrong[q.key] = (Store.d.mathWrong[q.key] || 0) + 1; }
            b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* =====================================================================================
   CÁC TRÒ THEO SÁCH TOÁN 2, KẾT NỐI TRI THỨC (TẬP 1). `tag` ghi số bài trong sách, `ord` để xếp thứ tự.
   ===================================================================================== */

/* Tạo 4 đáp án số: đáp án đúng + các đáp án sai hay gặp (extra), bù thêm số gần đáp án cho đủ */
function numOpts(ans, extra = [], n = 4, max = Infinity) {
  const set = [ans];
  for (const c of shuffle(extra)) { if (set.length >= n) break; if (Number.isInteger(c) && c >= 0 && c <= max && !set.includes(c)) set.push(c); }
  for (let k = 1; set.length < n; k++) for (const c of [ans + k, ans - k]) if (set.length < n && c >= 0 && c <= max && !set.includes(c)) set.push(c);
  return shuffle(set).map(v => ({ v }));
}
function textOpts(ans, extra, n = 4) {
  const set = [ans];
  for (const c of shuffle(extra)) { if (set.length >= n) break; if (!set.includes(c)) set.push(c); }
  return shuffle(set).map(v => ({ v }));
}

/* Chạy một lượt trắc nghiệm. make() trả về { ask, say, head, opts:[{v,html?}], ans, note, key, sayOk?, ansText? } */
async function runMC(ctx, g, N, make) {
  let correct = 0;
  for (let i = 0; i < N && ctx.alive(); i++) {
    const q = make();
    ctx.progress(i / N, `${g.icon} ${i}/${N}`);
    ctx.root.innerHTML = `
      ${speaker(g.who || '🦉', kwHtml(q.ask))}
      <div class="listen-row"><button class="listen sm" data-act="say">🔊 Nghe đề</button></div>
      ${q.head || ''}
      <div class="opts mc ${q.optClass || ''}">${q.opts.map((o, k) => `<button class="opt ${o.cls || (/^\d+$/.test(String(o.v)) ? '' : 'txt')}" data-v="${esc(o.v)}" data-key="${k + 1}">${o.html ?? esc(o.v)}</button>`).join('')}</div>
      <div class="fb-slot"></div>`;
    ctx.root.querySelector('[data-act=say]').onclick = () => Voice.say(q.say, 'vi', 1);
    await wait(250); Voice.vi(q.say);
    let first = true;
    await new Promise(done => {
      ctx.root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (b.dataset.v === String(q.ans)) {
          ctx.root.querySelectorAll('.opt').forEach(x => x.disabled = true);
          b.classList.add('ok'); Sfx.good(); if (first) correct++;
          const u = ctx.root.querySelector('.unk, .qm'); if (u) { u.textContent = q.ansText ?? q.ans; u.classList.add('filled'); }
          ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), esc(q.note));
          ctx.root.querySelector('[data-act=next]').onclick = done;
          if (q.sayOk) Voice.vi(q.sayOk);
        } else {
          if (first) { first = false; Store.d.mathWrong[q.key] = (Store.d.mathWrong[q.key] || 0) + 1; }
          b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
        }
      });
    });
  }
  ctx.finish({ correct, total: N });
}
const bigEq = (a, op, b) => `<div class="mathq">${a} ${op} ${b} = <span class="qm">?</span></div>`;

/* ---------- Bài 1: Chục và đơn vị (ôn tập các số đến 100) ---------- */
function tnQuestion(level) {
  const n = rand(11, level === 1 ? 50 : 99), t = Math.floor(n / 10), o = n % 10;
  const lab = (a, b) => `${a} chục ${b} đơn vị`;
  if (level === 1 || Math.random() < 0.5) {
    const blocks = level === 1 ? `<div class="blocks"><div class="tens">${'<span class="bar10"></span>'.repeat(t)}</div><div class="ones">${'<span class="dot1"></span>'.repeat(o)}</div></div>` : '';
    const ans = lab(t, o);
    return { ask: `Số *${n}* gồm mấy chục và mấy đơn vị?`, say: `Số ${n} gồm mấy chục và mấy đơn vị?`, head: blocks,
      opts: textOpts(ans, [lab(o, t), lab(t + 1, o), lab(t, (o + 1) % 10), lab(Math.max(1, t - 1), o), lab(t, Math.max(0, o - 1))].filter(x => x !== ans)),
      ans, note: `Số ${n} gồm ${t} chục và ${o} đơn vị`, key: `chục/đơn vị của ${n}` };
  }
  const extra = [o * 10 + t, n + 10, n - 10, n + 1, n - 1].filter(x => x > 9 && x !== n);
  return { ask: `Số gồm *${t} chục* và *${o} đơn vị* là số nào?`, say: `Số gồm ${t} chục và ${o} đơn vị là số nào?`, head: '',
    opts: numOpts(n, extra), ans: n, note: `${t} chục và ${o} đơn vị là số ${n}`, key: `${t} chục ${o} đơn vị` };
}
GAMES.push({
  id: 'tens', subject: 'math', name: 'Chục và đơn vị', icon: '🧱', theme: 't-tens', maxLevel: 2, topic: false, tag: 'Bài 1', ord: 1,
  desc: 'Đọc số có hai chữ số: mấy chục, mấy đơn vị', winText: 'Con đọc số giỏi lắm!', levelNames: ['Số đến 50, có hình', 'Số đến 100'], who: '🦉',
  play(ctx) { return runMC(ctx, this, 8, () => tnQuestion(ctx.level)); },
});

/* ---------- Bài 2: Tia số, số liền trước, số liền sau ---------- */
function nlQuestion(level) {
  const lim = level === 1 ? 20 : 100;
  const t = pickOne(level === 1 ? ['next', 'prev', 'missing'] : ['next', 'prev', 'missing', 'missing']);
  if (t === 'next') { const x = rand(1, lim - 1), a = x + 1;
    return { ask: `Tìm số *liền sau* của ${x}!`, say: `Tìm số liền sau của ${x}`, head: `<div class="bignum">${x}</div>`, opts: numOpts(a, [x - 1, x + 2, x, a + 10]), ans: a, note: `Số liền sau của ${x} là ${a}`, key: `liền sau ${x}` }; }
  if (t === 'prev') { const x = rand(2, lim), a = x - 1;
    return { ask: `Tìm số *liền trước* của ${x}!`, say: `Tìm số liền trước của ${x}`, head: `<div class="bignum">${x}</div>`, opts: numOpts(a, [x + 1, x - 2, x, a - 10]), ans: a, note: `Số liền trước của ${x} là ${a}`, key: `liền trước ${x}` }; }
  const step = level === 1 ? 1 : pickOne([1, 2, 5, 10]);
  const start = step * rand(0, Math.floor((lim - 4 * step) / step)), h = rand(0, 4), ticks = [0, 1, 2, 3, 4].map(i => start + i * step), a = ticks[h];
  const head = `<div class="numline">${ticks.map((v, i) => `<div class="tick"><span class="tn ${i === h ? 'unk' : ''}">${i === h ? '?' : v}</span><i></i></div>`).join('')}</div>`;
  return { ask: `Tìm số còn thiếu trên *tia số*!`, say: 'Tìm số còn thiếu trên tia số', head, opts: numOpts(a, [a + 1, a - 1, a + step, a - step, a + 2 * step]), ans: a, note: `Số còn thiếu là ${a} (mỗi vạch cách nhau ${step})`, key: `tia số ${ticks.map((v, i) => i === h ? '?' : v).join(' ')}` };
}
GAMES.push({
  id: 'numline', subject: 'math', name: 'Tia số', icon: '📏', theme: 't-numline', maxLevel: 2, topic: false, tag: 'Bài 2', ord: 2,
  desc: 'Tia số, số liền trước, số liền sau', winText: 'Con giỏi tia số quá!', levelNames: ['Trong 20', 'Trong 100'], who: '🐸',
  play(ctx) { return runMC(ctx, this, 8, () => nlQuestion(ctx.level)); },
});

/* ---------- Bài 7, 8, 11, 12: Cộng, trừ qua 10 trong phạm vi 20 ---------- */
function b10Question(level) {
  const kind = level === 1 ? 'add' : level === 2 ? 'sub' : pickOne(['add', 'sub', 'missAdd', 'missSub']);
  if (kind === 'add' || kind === 'missAdd') {
    let a, b; do { a = rand(2, 9); b = rand(2, 9); } while (a + b < 11);
    const s = a + b, big = Math.max(a, b), small = Math.min(a, b), need = 10 - big, rest = small - need;
    const hint = `${big} + ${small} = ${big} + ${need} + ${rest} = 10 + ${rest} = ${s}`;
    if (kind === 'add') return { ask: 'Tính *cộng qua 10*!', say: `${a} cộng ${b} bằng mấy?`, head: bigEq(a, '+', b), opts: numOpts(s, [s + 1, s - 1, s + 2, s - 2, 10 + a, 10 + b]), ans: s, note: hint, key: `${a} + ${b}` };
    return { ask: 'Tìm *số còn thiếu*!', say: `${a} cộng mấy bằng ${s}?`, head: `<div class="mathq">${a} + <span class="qm">?</span> = ${s}</div>`, opts: numOpts(b, [b + 1, b - 1, b + 2, b - 2, s - 10]), ans: b, note: `${a} + ${b} = ${s}. Vậy số còn thiếu là ${b}`, key: `${a} + ? = ${s}` };
  }
  let a, b; do { a = rand(11, 18); b = rand(2, 9); } while (b <= a - 10);
  const r = a - b, u = a - 10, rest = b - u;
  const hint = `${a} − ${b} = ${a} − ${u} − ${rest} = 10 − ${rest} = ${r}`;
  if (kind === 'sub') return { ask: 'Tính *trừ qua 10*!', say: `${a} trừ ${b} bằng mấy?`, head: bigEq(a, '−', b), opts: numOpts(r, [r + 1, r - 1, r + 2, r - 2, 10 - b, b - u]), ans: r, note: hint, key: `${a} − ${b}` };
  return { ask: 'Tìm *số còn thiếu*!', say: `${a} trừ mấy bằng ${r}?`, head: `<div class="mathq">${a} − <span class="qm">?</span> = ${r}</div>`, opts: numOpts(b, [b + 1, b - 1, b + 2, b - 2, u]), ans: b, note: `${a} − ${b} = ${r}. Vậy số còn thiếu là ${b}`, key: `${a} − ? = ${r}` };
}
GAMES.push({
  id: 'bridge10', subject: 'math', name: 'Cộng, trừ qua 10', icon: '🌉', theme: 't-bridge', maxLevel: 3, topic: false, tag: 'Bài 7–8, 11–12', ord: 7,
  desc: 'Bảng cộng, bảng trừ qua 10 (trong 20)', winText: 'Con qua cầu an toàn!', levelNames: ['Cộng qua 10', 'Trừ qua 10', 'Trộn lẫn, tìm số thiếu'], who: '🦊',
  play(ctx) { return runMC(ctx, this, 8, () => b10Question(ctx.level)); },
});

/* ---------- Bài 9: Bài toán thêm, bớt một số đơn vị ---------- */
function stQuestion(level) {
  const lim = level === 1 ? 20 : level === 2 ? 50 : 100;
  const [X] = shuffle(CMP_NAMES), [noun, emo] = pickOne(CMP_THINGS);
  const add = Math.random() < 0.5;
  let a, b, text, ans, eq, hint;
  if (add) { a = rand(3, lim - 3); b = rand(2, Math.min(lim - a, level === 3 ? 40 : 12)); ans = a + b;
    text = pickOne([`${X} có ${a} ${noun}. ${X} được cho *thêm* ${b} ${noun}. Hỏi ${X} có tất cả mấy ${noun}?`, `Trong giỏ có ${a} ${noun}. Mẹ bỏ *thêm* ${b} ${noun} vào giỏ. Hỏi trong giỏ có mấy ${noun}?`]);
    eq = `${a} + ${b} = ${ans}`; hint = 'Thêm vào thì làm phép cộng'; }
  else { a = rand(5, lim); b = rand(2, Math.min(a - 1, level === 3 ? 40 : 12)); ans = a - b;
    text = pickOne([`${X} có ${a} ${noun}. ${X} cho bạn ${b} ${noun}. Hỏi ${X} *còn lại* mấy ${noun}?`, `Trong giỏ có ${a} ${noun}. Mẹ lấy *bớt* ra ${b} ${noun}. Hỏi trong giỏ *còn* mấy ${noun}?`]);
    eq = `${a} − ${b} = ${ans}`; hint = 'Cho đi, bớt đi thì làm phép trừ'; }
  const head = a <= 20 ? `<div class="rowpics"><div class="rowpic"><b>Có</b><span>${Array(a).fill(emo).join('')}</span></div></div>` : '';
  return { ask: text, say: kwPlain(text), head, opts: numOpts(ans, [add ? a - b : a + b, ans + 1, ans - 1, ans + 10, ans - 10, a, b]), ans, note: `${eq}. ${hint}`, key: `${eq.replace(/= .*/, '= ?')} (thêm/bớt)` };
}
GAMES.push({
  id: 'story', subject: 'math', name: 'Thêm và Bớt', icon: '🎁', theme: 't-story', maxLevel: 3, topic: false, tag: 'Bài 9', ord: 9,
  desc: 'Bài toán thêm, bớt một số đơn vị', winText: 'Con giải toán giỏi quá!', levelNames: ['Trong 20', 'Trong 50', 'Trong 100'], who: '🐻',
  play(ctx) { return runMC(ctx, this, 8, () => stQuestion(ctx.level)); },
});

/* ---------- Bài 15, 16, 17: Ki-lô-gam, lít ---------- */
const KG_ITEMS = [['bao gạo', '🌾'], ['túi đường', '🍬'], ['quả dưa', '🍉'], ['con ngỗng', '🦢'], ['thùng sách', '📚'], ['túi cam', '🍊']];
const L_ITEMS = [['can nước', '🚰'], ['bình sữa', '🥛'], ['xô nước', '🪣'], ['thùng dầu', '🛢️']];
function msQuestion(level) {
  const lim = level === 1 ? 10 : level === 2 ? 20 : 50;
  const types = level === 1 ? ['unit', 'sumKg', 'sumL'] : level === 2 ? ['sumKg', 'diffKg', 'sumL', 'takeL'] : ['sumKg', 'diffKg', 'sumL', 'takeL', 'heavier'];
  const t = pickOne(types);
  if (t === 'unit') {
    const kg = Math.random() < 0.5, it = pickOne(kg ? KG_ITEMS : L_ITEMS)[0];
    const ans = kg ? 'ki-lô-gam (kg)' : 'lít (l)';
    return { ask: kg ? `Cân *${it}*, ta dùng đơn vị nào?` : `Đong *${it}*, ta dùng đơn vị nào?`, say: kg ? `Cân ${it}, ta dùng đơn vị nào?` : `Đong ${it}, ta dùng đơn vị nào?`, head: '', opts: textOpts(ans, [kg ? 'lít (l)' : 'ki-lô-gam (kg)'], 2), ans, note: kg ? 'Đo cân nặng dùng ki-lô-gam (kg)' : 'Đo lượng nước, sữa dùng lít (l)', key: `đơn vị ${it}` };
  }
  if (t === 'heavier') {
    const [[n1, e1], [n2, e2]] = shuffle(KG_ITEMS).slice(0, 2); let a = rand(2, lim), b; do { b = rand(2, lim); } while (b === a);
    const more = Math.random() < 0.5, ans = (a > b) === more ? n1 : n2;
    const text = `${n1[0].toUpperCase() + n1.slice(1)} nặng ${a} kg, ${n2} nặng ${b} kg. Hỏi *${more ? 'cái nào nặng hơn' : 'cái nào nhẹ hơn'}*?`;
    return { ask: text, say: kwPlain(text), head: '', opts: textOpts(ans, [ans === n1 ? n2 : n1], 2), ans, note: `So sánh ${a} kg và ${b} kg: ${ans} ${more ? 'nặng' : 'nhẹ'} hơn`, key: `so sánh ${a} kg, ${b} kg` };
  }
  const kg = t === 'sumKg' || t === 'diffKg', unit = kg ? 'ki-lô-gam' : 'lít', u = kg ? 'kg' : 'l';
  const sum = t === 'sumKg' || t === 'sumL';
  let a, b, ans, text;
  if (sum) { a = rand(2, lim - 2); b = rand(1, lim - a); ans = a + b; }
  else { a = rand(4, lim); b = rand(1, a - 1); ans = a - b; }
  if (t === 'sumKg') text = `${pickOne(KG_ITEMS)[0]} thứ nhất nặng ${a} kg, ${pickOne(KG_ITEMS)[0]} thứ hai nặng ${b} kg. Hỏi *cả hai* nặng mấy ki-lô-gam?`;
  if (t === 'diffKg') text = `Thùng to nặng ${a} kg, thùng nhỏ nặng ${b} kg. Hỏi thùng to nặng *hơn* thùng nhỏ mấy ki-lô-gam?`;
  if (t === 'sumL') text = `Can thứ nhất đựng ${a} lít nước, can thứ hai đựng ${b} lít nước. Hỏi *cả hai* can đựng mấy lít nước?`;
  if (t === 'takeL') text = `Trong thùng có ${a} lít nước. Người ta đã dùng ${b} lít. Hỏi trong thùng *còn* mấy lít nước?`;
  text = text.replace(/^./, c => c.toUpperCase());
  const eq = `${a} ${sum ? '+' : '−'} ${b} = ${ans}`;
  return { ask: text, say: kwPlain(text), head: '', opts: numOpts(ans, [sum ? a - b : a + b, ans + 1, ans - 1, ans + 2, ans - 2]), ans, note: `${eq} (${u}). Nhớ viết đơn vị ${unit}`, key: `${eq.replace(/= .*/, '= ?')} (${u})` };
}
GAMES.push({
  id: 'measure', subject: 'math', name: 'Ki-lô-gam và Lít', icon: '🥛', theme: 't-measure', maxLevel: 3, topic: false, tag: 'Bài 15–17', ord: 15,
  desc: 'Cân nặng (kg), dung tích (lít)', winText: 'Con cân đong giỏi quá!', levelNames: ['Chọn đơn vị, số nhỏ', 'Cộng, trừ trong 20', 'Trộn lẫn, so sánh'], who: '🐘',
  play(ctx) { return runMC(ctx, this, 8, () => msQuestion(ctx.level)); },
});

/* ---------- Bài 19 đến 24: Cộng, trừ có nhớ trong phạm vi 100 ---------- */
function carryQuestion(level) {
  const kind = level === 1 ? 'add1' : level === 2 ? 'add2' : pickOne(['sub1', 'sub2', 'add2']);
  let a, b, op = '+', hint;
  if (kind === 'add1') { const t = rand(1, 8), o = rand(2, 9); b = rand(Math.max(2, 10 - o), 9); a = t * 10 + o;
    const us = o + b; hint = `${o} + ${b} = ${us}, viết ${us % 10}, nhớ 1. ${t} thêm 1 bằng ${t + 1}. Vậy ${a} + ${b} = ${a + b}`; }
  else if (kind === 'add2') { let t1, t2, o1, o2; do { t1 = rand(1, 8); t2 = rand(1, 8); o1 = rand(1, 9); o2 = rand(1, 9); } while (o1 + o2 < 10 || t1 + t2 + 1 > 9);
    a = t1 * 10 + o1; b = t2 * 10 + o2; const us = o1 + o2;
    hint = `${o1} + ${o2} = ${us}, viết ${us % 10}, nhớ 1. ${t1} + ${t2} + 1 = ${t1 + t2 + 1}. Vậy ${a} + ${b} = ${a + b}`; }
  else if (kind === 'sub1') { op = '−'; const t = rand(2, 9), o = rand(0, 7); b = rand(o + 1, 9); a = t * 10 + o;
    hint = `${o} không trừ được ${b}, lấy ${10 + o} − ${b} = ${10 + o - b}, viết ${10 + o - b}, nhớ 1. ${t} − 1 = ${t - 1}. Vậy ${a} − ${b} = ${a - b}`; }
  else { op = '−'; let t1, t2, o1, o2; do { t1 = rand(2, 9); t2 = rand(1, 8); o1 = rand(0, 8); o2 = rand(1, 9); } while (o1 >= o2 || t1 - 1 < t2);
    a = t1 * 10 + o1; b = t2 * 10 + o2;
    hint = `${o1} không trừ được ${o2}, lấy ${10 + o1} − ${o2} = ${10 + o1 - o2}, viết ${10 + o1 - o2}, nhớ 1. ${t1} − ${t2} − 1 = ${t1 - t2 - 1}. Vậy ${a} − ${b} = ${a - b}`; }
  const ans = op === '+' ? a + b : a - b;
  const head = `<div class="vcalc"><div class="vr"><i></i><b>${a}</b></div><div class="vr"><i>${op}</i><b>${b}</b></div><hr><div class="vr"><i></i><b class="qm">?</b></div></div>`;
  return { ask: op === '+' ? 'Tính *cộng có nhớ*!' : 'Tính *trừ có nhớ*!', say: `${a} ${op === '+' ? 'cộng' : 'trừ'} ${b} bằng mấy?`, head,
    opts: numOpts(ans, op === '+' ? [ans - 10, ans + 10, ans + 1, ans - 1] : [ans + 10, ans - 10, ans + 1, ans - 1], 4, 99), ans, note: hint, key: `${a} ${op} ${b}` };
}
GAMES.push({
  id: 'carry', subject: 'math', name: 'Cộng, trừ có nhớ', icon: '✏️', theme: 't-carry', maxLevel: 3, topic: false, tag: 'Bài 19–24', ord: 19,
  desc: 'Đặt tính, cộng trừ có nhớ trong phạm vi 100', winText: 'Con tính có nhớ giỏi quá!', levelNames: ['Số có 2 chữ số + số có 1 chữ số', '2 chữ số + 2 chữ số', 'Cộng và trừ có nhớ'], who: '🐼',
  play(ctx) { return runMC(ctx, this, 8, () => carryQuestion(ctx.level)); },
});

/* ---------- Bài 25 đến 27: Hình phẳng ---------- */
const SV = (inner) => `<svg viewBox="0 0 120 80" class="shape" aria-hidden="true">${inner}</svg>`;
const STROKE = 'stroke="#22304a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
function polyPoints(n) { const pts = []; for (let i = 0; i <= n; i++) pts.push([Math.round(12 + i * 96 / n), i % 2 === 0 ? rand(46, 66) : rand(12, 32)]); return pts; }
function regPoints(k) { const base = rand(0, 360), pts = []; for (let i = 0; i < k; i++) { const ang = (base + i * 360 / k + rand(-10, 10)) * Math.PI / 180, r = rand(26, 34); pts.push([Math.round(60 + r * 1.3 * Math.cos(ang)), Math.round(40 + r * Math.sin(ang))]); } return pts; }
const SHAPES = {
  line: () => SV(`<line x1="${rand(10, 25)}" y1="${rand(15, 65)}" x2="${rand(95, 110)}" y2="${rand(15, 65)}" ${STROKE}/>`),
  curve: () => { const s = Math.random() < 0.5 ? 1 : -1; return SV(`<path d="M${rand(10, 20)} ${rand(40, 50)} Q60 ${40 + s * rand(55, 75)} ${rand(100, 110)} ${rand(40, 50)}" fill="none" ${STROKE}/>`); },
  poly: (n = rand(3, 5)) => { const p = polyPoints(n); return SV(`<polyline points="${p.map(x => x.join(',')).join(' ')}" fill="none" ${STROKE}/>`); },
  quad: () => SV(`<polygon points="${regPoints(4).map(x => x.join(',')).join(' ')}" fill="#ffe3b3" ${STROKE}/>`),
  tri: () => SV(`<polygon points="${regPoints(3).map(x => x.join(',')).join(' ')}" fill="#d7ecff" ${STROKE}/>`),
  pent: () => SV(`<polygon points="${regPoints(5).map(x => x.join(',')).join(' ')}" fill="#e3f7e8" ${STROKE}/>`),
  circle: () => SV(`<circle cx="60" cy="40" r="30" fill="#ffd9e6" ${STROKE}/>`),
  square: () => { const s = rand(38, 50), x = 60 - s / 2 + rand(-4, 4), y = 40 - s / 2 + rand(-3, 3); return SV(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#ffe3b3" ${STROKE}/>`); },
  rect: () => { const w = rand(54, 74), h = rand(26, 38), x = 60 - w / 2, y = 40 - h / 2; return SV(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d7ecff" ${STROKE}/>`); },
};
const SHAPE_NAME = { line: 'đường thẳng', curve: 'đường cong', poly: 'đường gấp khúc', quad: 'hình tứ giác' };
const shapeOpt = k => ({ v: k, html: SHAPES[k](), cls: 'svgopt' });
function shQuestion(level) {
  const mode = level === 1 ? 'id' : level === 2 ? pickOne(['id2', 'id2', 'quad']) : pickOne(['count', 'length']);
  if (mode === 'id' || mode === 'id2') {
    const pool = mode === 'id' ? ['line', 'curve', 'poly'] : ['line', 'curve', 'poly', 'quad'];
    const target = pickOne(pool);
    return { ask: `Hình nào là *${SHAPE_NAME[target]}*?`, say: `Hình nào là ${SHAPE_NAME[target]}?`, head: '', opts: shuffle(pool).map(shapeOpt), ans: target, note: `Đó là ${SHAPE_NAME[target]}`, key: `nhận biết ${SHAPE_NAME[target]}` };
  }
  if (mode === 'quad') {
    const pool = shuffle(['tri', 'pent', 'circle']).slice(0, 3).concat('quad');
    return { ask: 'Hình nào là *hình tứ giác*?', say: 'Hình nào là hình tứ giác?', head: '', opts: shuffle(pool).map(shapeOpt), ans: 'quad', note: 'Hình tứ giác có 4 cạnh và 4 đỉnh', key: 'nhận biết hình tứ giác' };
  }
  if (mode === 'count') {
    const n = rand(2, 5), p = polyPoints(n);
    const head = `<div class="shapehead">${SV(`<polyline points="${p.map(x => x.join(',')).join(' ')}" fill="none" ${STROKE}/>${p.map(x => `<circle cx="${x[0]}" cy="${x[1]}" r="3.5" fill="#ff6f61"/>`).join('')}`)}</div>`;
    return { ask: 'Đường gấp khúc này có mấy *đoạn thẳng*?', say: 'Đường gấp khúc này có mấy đoạn thẳng?', head, opts: numOpts(n, [n + 1, n - 1, n + 2, n + 1 + 1], 4).map(o => o), ans: n, note: `Đường gấp khúc có ${n} đoạn thẳng, mỗi đoạn nối hai điểm đỏ liền nhau`, key: 'đếm đoạn thẳng của đường gấp khúc' };
  }
  const n = rand(2, 3), L = Array.from({ length: n }, () => rand(2, 9)), names = ['A', 'B', 'C', 'D'].slice(0, n + 1), ans = L.reduce((x, y) => x + y, 0);
  const segs = L.map((v, i) => `đoạn thẳng ${names[i]}${names[i + 1]} dài ${v} cm`).join(', ');
  const p = polyPoints(n), label = p.map((x, i) => `<text x="${x[0]}" y="${i % 2 === 0 ? x[1] + 14 : x[1] - 7}" text-anchor="middle" font-size="11" font-weight="800" fill="#22304a">${names[i]}</text>`).join('');
  const head = `<div class="shapehead">${SV(`<polyline points="${p.map(x => x.join(',')).join(' ')}" fill="none" ${STROKE}/>${label}`)}</div>`;
  const text = `Đường gấp khúc ${names.join('')} gồm ${segs}. Hỏi đường gấp khúc ${names.join('')} dài *mấy xăng-ti-mét*?`;
  return { ask: text, say: kwPlain(text), head, opts: numOpts(ans, [ans + 1, ans - 1, ans + 2, ans - 2, Math.max(...L)]), ans, note: `${L.join(' + ')} = ${ans} (cm). Độ dài đường gấp khúc bằng tổng độ dài các đoạn thẳng`, key: `độ dài đường gấp khúc ${L.join(' + ')}` };
}
GAMES.push({
  id: 'shapes', subject: 'math', name: 'Hình phẳng', icon: '📐', theme: 't-shapes', maxLevel: 3, topic: false, tag: 'Bài 25–27', ord: 25,
  desc: 'Đường thẳng, đường cong, đường gấp khúc, hình tứ giác', winText: 'Con nhận ra các hình giỏi lắm!', levelNames: ['Đường thẳng, cong, gấp khúc', 'Thêm hình tứ giác', 'Đếm đoạn thẳng, tính độ dài'], who: '🦉',
  play(ctx) { return runMC(ctx, this, 8, () => shQuestion(ctx.level)); },
});

/* ---------- Bài 29 đến 31: Ngày - giờ, giờ - phút, xem đồng hồ ---------- */
function clockSvg(h, m) {
  const pt = (L, deg) => [60 + L * Math.sin(deg * Math.PI / 180), 60 - L * Math.cos(deg * Math.PI / 180)].map(v => v.toFixed(1));
  const nums = Array.from({ length: 12 }, (_, i) => { const [x, y] = pt(43, (i + 1) * 30); return `<text x="${x}" y="${(+y + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#22304a">${i + 1}</text>`; }).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => { const [x1, y1] = pt(i % 5 ? 52 : 50, i * 6), [x2, y2] = pt(55, i * 6); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#22304a" stroke-width="${i % 5 ? 0.8 : 1.6}"/>`; }).join('');
  const [hx, hy] = pt(27, ((h % 12) + m / 60) * 30), [mx, my] = pt(40, m * 6);
  return `<svg viewBox="0 0 120 120" class="clock" aria-hidden="true"><circle cx="60" cy="60" r="57" fill="#fff" stroke="#22304a" stroke-width="3"/>${ticks}${nums}<line x1="60" y1="60" x2="${hx}" y2="${hy}" stroke="#22304a" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="60" x2="${mx}" y2="${my}" stroke="#ff6f61" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#22304a"/></svg>`;
}
const clockLabel = (h, m) => m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
function clQuestion(level) {
  const h = rand(1, 12), m = level === 1 ? 0 : level === 2 ? pickOne([0, 15, 30]) : 5 * rand(0, 11), ans = clockLabel(h, m);
  const swapH = m / 5 === 0 ? 12 : m / 5, swapM = (h % 12) * 5, nh = h === 12 ? 1 : h + 1, ph = h === 1 ? 12 : h - 1;
  const extra = [clockLabel(swapH, swapM), clockLabel(nh, m), clockLabel(ph, m), clockLabel(h, (m + 30) % 60), clockLabel(h, (m + 15) % 60), clockLabel(h, (m + 45) % 60)].filter(x => x !== ans);
  const note = m === 0 ? `Kim ngắn chỉ số ${h}, kim dài chỉ số 12: ${h} giờ` : `Kim ngắn gần số ${h}, kim dài chỉ số ${m / 5}: ${h} giờ ${m} phút`;
  return { ask: 'Đồng hồ chỉ *mấy giờ*?', say: 'Đồng hồ chỉ mấy giờ?', head: `<div class="clockwrap">${clockSvg(h, m)}</div>`, opts: textOpts(ans, extra), ans, note, key: `xem đồng hồ ${clockLabel(h, m)}` };
}
GAMES.push({
  id: 'clock', subject: 'math', name: 'Xem đồng hồ', icon: '🕐', theme: 't-clock', maxLevel: 3, topic: false, tag: 'Bài 29–31', ord: 29,
  desc: 'Ngày giờ, giờ phút: xem đồng hồ', winText: 'Con xem giờ giỏi quá!', levelNames: ['Giờ đúng', 'Giờ đúng, 15 và 30 phút', 'Mọi vạch phút'], who: '🐰',
  play(ctx) { return runMC(ctx, this, 8, () => clQuestion(ctx.level)); },
});

/* Gắn nhãn bài học cho hai trò đã có */
GAMES.find(g => g.id === 'sumdiff').tag = 'Bài 3'; GAMES.find(g => g.id === 'sumdiff').ord = 3;
GAMES.find(g => g.id === 'compare').tag = 'Bài 4, 13'; GAMES.find(g => g.id === 'compare').ord = 4;

/* =====================================================================================
   CÁC TRÒ THEO SÁCH TOÁN 1, KẾT NỐI TRI THỨC. `tag` ghi số chủ đề trong sách, `ord` để xếp thứ tự.
   ===================================================================================== */

/* Chạy một lượt nhập số bằng bàn phím số (thay vì chọn trắc nghiệm).
   make() trả về { ask, say, head, ans, maxDigits?, note, key, sayOk? } */
async function runKeypad(ctx, g, N, make) {
  let correct = 0;
  for (let i = 0; i < N && ctx.alive(); i++) {
    const q = make();
    ctx.progress(i / N, `${g.icon} ${i}/${N}`);
    let digits = [];
    ctx.root.innerHTML = `
      ${speaker(g.who || '🦉', kwHtml(q.ask))}
      <div class="listen-row"><button class="listen sm" data-act="say">🔊 Nghe đề</button></div>
      ${q.head || ''}
      <div class="kpad">
        <div class="kdisplay"><span class="kph">?</span></div>
        <div class="kkeys">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}">${n}</button>`).join('')}
          <button class="key gray" data-k="back">⌫</button><button class="key" data-k="0">0</button><button class="key ok" data-k="ok">✔</button>
        </div>
      </div>
      <div class="fb-slot"></div>`;
    const disp = ctx.root.querySelector('.kdisplay');
    const render = () => { disp.innerHTML = digits.length ? esc(digits.join('')) : '<span class="kph">?</span>'; };
    ctx.root.querySelector('[data-act=say]').onclick = () => Voice.say(q.say, 'vi', 1);
    await wait(250); Voice.vi(q.say);
    let first = true;
    await new Promise(done => {
      ctx.root.querySelectorAll('.key').forEach(b => b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'back') { digits.pop(); render(); return; }
        if (k === 'ok') {
          if (!digits.length) { shake(disp); return; }
          const val = +digits.join('');
          if (val === q.ans) {
            ctx.root.querySelectorAll('.key').forEach(x => x.disabled = true);
            disp.classList.add('ok'); Sfx.good(); if (first) correct++;
            const u = ctx.root.querySelector('.qm'); if (u) { u.textContent = q.ans; u.classList.add('filled'); }
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), esc(q.note));
            ctx.root.querySelector('[data-act=next]').onclick = done;
            if (q.sayOk) Voice.vi(q.sayOk);
          } else {
            if (first) { first = false; Store.d.mathWrong[q.key] = (Store.d.mathWrong[q.key] || 0) + 1; }
            Sfx.bad(); shake(disp);
            digits = []; render();
          }
          return;
        }
        if (digits.length >= (q.maxDigits || 2)) return;
        digits.push(k); render(); Sfx.pop();
      });
    });
  }
  ctx.finish({ correct, total: N });
}

/* Kéo-thả tự do bằng con trỏ: khi thả, tìm đích trong getTargets() đang chứa con trỏ.
   onDrop(target, el) trả về true nếu thả đúng chỗ (el coi như đã "dùng"), false/falsy thì el bật lại vị trí cũ */
function makeDraggable(el, getTargets, onDrop) {
  el.style.touchAction = 'none';
  el.onpointerdown = e => {
    if (el.disabled) return;
    e.preventDefault();
    const r = el.getBoundingClientRect(), startX = e.clientX, startY = e.clientY, baseLeft = r.left, baseTop = r.top;
    el.classList.add('dragging');
    el.style.position = 'fixed'; el.style.left = baseLeft + 'px'; el.style.top = baseTop + 'px';
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; el.style.zIndex = 999;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const move = e2 => {
      el.style.left = (baseLeft + e2.clientX - startX) + 'px';
      el.style.top = (baseTop + e2.clientY - startY) + 'px';
    };
    const up = e2 => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      el.classList.remove('dragging');
      const targets = getTargets();
      const hit = targets.find(t => { const tr = t.getBoundingClientRect(); return e2.clientX >= tr.left && e2.clientX <= tr.right && e2.clientY >= tr.top && e2.clientY <= tr.bottom; });
      const placed = onDrop(hit, el);
      if (!placed) { el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.width = ''; el.style.height = ''; el.style.zIndex = ''; }
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  };
}

/* ---------- Chủ đề 1: Đếm & nối số (0-10) ---------- */
GAMES.push({
  id: 'count10', subject: 'math', name: 'Đếm & Nối số', icon: '🔗', theme: 't-count10', maxLevel: 2, topic: false,
  tag: 'Chủ đề 1', ord: 1, book: 1,
  desc: 'Kéo số đúng thả vào nhóm có đúng số chấm', winText: 'Con nối số giỏi quá!',
  levelNames: ['Số 0 đến 5', 'Số 0 đến 10'], who: '🦉',
  async play(ctx) {
    const ROUNDS = 3, pairs = ctx.level === 1 ? 3 : 4, max = ctx.level === 1 ? 5 : 10;
    let correct = 0, total = 0;
    for (let r = 0; r < ROUNDS && ctx.alive(); r++) {
      const nums = shuffle(Array.from({ length: max + 1 }, (_, i) => i)).slice(0, pairs);
      const tiles = shuffle(nums.slice());
      ctx.progress(r / ROUNDS, `🔗 ${r}/${ROUNDS}`);
      ctx.root.innerHTML = `
        ${speaker('🦉', 'Kéo số đúng thả vào ô có đúng số chấm nhé!')}
        <div class="matchrow">
          <div class="dropcol">${nums.map(n => `<div class="dropbox" data-n="${n}"><div class="dots">${'●'.repeat(n) || '&nbsp;'}</div><div class="dslot"></div></div>`).join('')}</div>
          <div class="tilecol">${tiles.map((n, i) => `<button class="numtile" data-n="${n}" data-i="${i}">${n}</button>`).join('')}</div>
        </div>`;
      Voice.vi('Kéo số đúng thả vào đúng ô nhé');
      let placed = 0;
      await new Promise(done => {
        ctx.root.querySelectorAll('.numtile').forEach(tile => {
          makeDraggable(tile, () => [...ctx.root.querySelectorAll('.dropbox:not(.done)')], (target, el) => {
            total++;
            if (target && +target.dataset.n === +el.dataset.n) {
              correct++; Sfx.good();
              target.classList.add('done'); target.querySelector('.dslot').textContent = el.dataset.n;
              el.remove(); placed++;
              if (placed === pairs) { Voice.vi('Giỏi quá!'); setTimeout(done, 500); }
              return true;
            }
            Sfx.bad(); shake(el); return false;
          });
        });
      });
    }
    ctx.finish({ correct, total });
  },
});

/* ---------- Chủ đề 2, 4: Hình & Khối (hình phẳng & khối 3D) ---------- */
const SHAPE1_NAME = { square: 'hình vuông', circle: 'hình tròn', tri: 'hình tam giác', rect: 'hình chữ nhật' };
GAMES.push({
  id: 'shapeblock', subject: 'math', name: 'Hình & Khối', icon: '🧩', theme: 't-shapeblock', maxLevel: 2, topic: false,
  tag: 'Chủ đề 2, 4', ord: 2, book: 1,
  desc: 'Kéo đúng hình hoặc khối thả vào giỏ', winText: 'Con phân loại hình giỏi quá!',
  levelNames: ['Hình phẳng', 'Hình khối'], who: '🐨',
  async play(ctx) {
    const ROUNDS = 3; let correct = 0, total = 0;
    for (let r = 0; r < ROUNDS && ctx.alive(); r++) {
      ctx.progress(r / ROUNDS, `🧩 ${r}/${ROUNDS}`);
      let baskets, items;
      if (ctx.level === 1) {
        baskets = shuffle(Object.keys(SHAPE1_NAME)).slice(0, 4);
        items = shuffle(baskets.map(k => ({ k, html: SHAPES[k]() })));
      } else {
        baskets = Object.keys(BLOCK_NAME);
        items = shuffle(baskets.map(k => { const [, emo] = pickOne(BLOCK_ITEMS.filter(x => x[2] === k)); return { k, html: `<span class="emo">${emo}</span>` }; }));
      }
      ctx.root.innerHTML = `
        ${speaker('🐨', ctx.level === 1 ? 'Kéo mỗi hình thả vào đúng giỏ nhé!' : 'Kéo mỗi vật thả vào đúng khối nhé!')}
        <div class="baskrow">${baskets.map(k => `<div class="basket" data-k="${k}"><span class="bico">${ctx.level === 1 ? SHAPES[k]() : BLOCK_ICON[k]}</span><b>${ctx.level === 1 ? SHAPE1_NAME[k] : BLOCK_NAME[k]}</b><div class="bslot"></div></div>`).join('')}</div>
        <div class="itemrow">${items.map((it, i) => `<button class="shapetile" data-k="${it.k}" data-i="${i}">${it.html}</button>`).join('')}</div>`;
      Voice.vi(ctx.level === 1 ? 'Kéo mỗi hình thả vào đúng giỏ nhé' : 'Kéo mỗi vật thả vào đúng khối nhé');
      let placed = 0, need = items.length;
      await new Promise(done => {
        ctx.root.querySelectorAll('.shapetile').forEach(tile => {
          makeDraggable(tile, () => [...ctx.root.querySelectorAll('.basket')], (target, el) => {
            total++;
            if (target && target.dataset.k === el.dataset.k) {
              correct++; Sfx.good();
              target.querySelector('.bslot').insertAdjacentHTML('beforeend', el.innerHTML);
              el.remove(); placed++;
              if (placed === need) { Voice.vi('Giỏi quá!'); setTimeout(done, 500); }
              return true;
            }
            Sfx.bad(); shake(el); return false;
          });
        });
      });
    }
    ctx.finish({ correct, total });
  },
});

/* ---------- Chủ đề 3: Cộng, trừ trong 10 (tự gõ số) ---------- */
function calc10Question(level) {
  const op = level === 1 ? '+' : pickOne(['+', '−']);
  let a, b, ans;
  if (op === '+') { a = rand(0, 9); b = rand(0, 10 - a); ans = a + b; }
  else { a = rand(1, 10); b = rand(0, a); ans = a - b; }
  return { ask: `Tính: *${a} ${op} ${b}*`, say: `${a} ${op === '+' ? 'cộng' : 'trừ'} ${b} bằng mấy?`, head: bigEq(a, op, b), ans, maxDigits: 2, note: `${a} ${op} ${b} = ${ans}`, key: `${a} ${op} ${b} (trong 10)` };
}
GAMES.push({
  id: 'calc10', subject: 'math', name: 'Cộng trừ trong 10', icon: '🧮', theme: 't-calc10', maxLevel: 2, topic: false,
  tag: 'Chủ đề 3', ord: 3, book: 1,
  desc: 'Tự gõ số để tính cộng, trừ trong phạm vi 10', winText: 'Con tính giỏi quá!',
  levelNames: ['Phép cộng', 'Cộng và trừ'], who: '🐥',
  play(ctx) { return runKeypad(ctx, this, 8, () => calc10Question(ctx.level)); },
});

/* ---------- Chủ đề 7: Đo độ dài (xăng-ti-mét) ---------- */
const lenBar = (cm, emo) => `<div class="lenbar" style="width:${cm * 16 + 30}px"><span>${emo}</span></div>`;
GAMES.push({
  id: 'ruler', subject: 'math', name: 'Đo độ dài', icon: '📏', theme: 't-ruler', maxLevel: 2, topic: false,
  tag: 'Chủ đề 7', ord: 4, book: 1,
  desc: 'So sánh vật dài hơn, ngắn hơn và đo bằng xăng-ti-mét', winText: 'Con đo đạc giỏi quá!',
  levelNames: ['So sánh dài, ngắn', 'Đo bằng xăng-ti-mét'], who: '🐿️',
  async play(ctx) {
    const N = 8;
    if (ctx.level === 1) {
      let correct = 0;
      for (let i = 0; i < N && ctx.alive(); i++) {
        const [n1, e1, c1] = pickOne(LEN_ITEMS); let n2, e2, c2; do { [n2, e2, c2] = pickOne(LEN_ITEMS); } while (c2 === c1);
        const longer = c1 > c2 ? 'L' : 'R';
        ctx.progress(i / N, `📏 ${i}/${N}`);
        ctx.root.innerHTML = `
          ${speaker('🐿️', 'Chạm vào vật DÀI HƠN nhé!')}
          <div class="lenrow">
            <button class="lenbox" data-v="L" data-key="1">${lenBar(c1, e1)}<small>${esc(n1)}</small></button>
            <button class="lenbox" data-v="R" data-key="3">${lenBar(c2, e2)}<small>${esc(n2)}</small></button>
          </div>
          <div class="fb-slot"></div>`;
        if (i === 0) Voice.vi('Chạm vào vật dài hơn nhé');
        let first = true;
        await new Promise(done => {
          ctx.root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
            if (b.dataset.v === longer) {
              ctx.root.querySelectorAll('[data-v]').forEach(x => x.disabled = true);
              b.classList.add('ok'); Sfx.good(); if (first) correct++;
              ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${esc(n1)} ${c1}cm, ${esc(n2)} ${c2}cm`);
              ctx.root.querySelector('[data-act=next]').onclick = done;
            } else {
              if (first) { first = false; Store.d.mathWrong[`so sánh ${n1}-${n2}`] = (Store.d.mathWrong[`so sánh ${n1}-${n2}`] || 0) + 1; }
              b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
            }
          });
        });
      }
      ctx.finish({ correct, total: N });
      return;
    }
    return runKeypad(ctx, this, N, () => {
      const [name, emo, cm] = pickOne(LEN_ITEMS);
      const ticks = Array.from({ length: 21 }, (_, k) => k);
      const head = `<div class="rulerwrap">${lenBar(cm, emo)}<div class="ruler">${ticks.map(k => `<span class="rtick ${k % 5 === 0 ? 'big' : ''}">${k % 5 === 0 ? k : ''}</span>`).join('')}</div></div>`;
      return { ask: `*${name}* dài mấy xăng-ti-mét?`, say: `${name} dài mấy xăng-ti-mét?`, head, ans: cm, maxDigits: 2, note: `${name} dài ${cm} cm`, key: `đo ${name}` };
    });
  },
});

/* ---------- Chủ đề 8: Cộng, trừ không nhớ trong 100 (tự gõ số) ---------- */
function calc100Question(level) {
  const lim = level === 1 ? 50 : 100, op = pickOne(['+', '−']);
  let a, b, ans;
  if (op === '+') {
    const at = rand(0, Math.max(0, Math.floor(lim / 10) - 1)), ao = rand(0, 9); a = at * 10 + ao;
    const bo = rand(0, 9 - ao), bt = rand(0, Math.max(0, Math.floor((lim - a) / 10))); b = Math.min(bt * 10 + bo, lim - a);
    ans = a + b;
  } else {
    a = rand(10, lim); const at = Math.floor(a / 10), ao = a % 10;
    const bo = rand(0, ao), bt = rand(0, at); b = bt * 10 + bo;
    ans = a - b;
  }
  return { ask: `Tính: *${a} ${op} ${b}*`, say: `${a} ${op === '+' ? 'cộng' : 'trừ'} ${b} bằng mấy?`, head: bigEq(a, op, b), ans, maxDigits: 3, note: `${a} ${op} ${b} = ${ans}`, key: `${a} ${op} ${b} (không nhớ)` };
}
GAMES.push({
  id: 'calc100easy', subject: 'math', name: 'Cộng trừ trong 100', icon: '➕', theme: 't-calc100', maxLevel: 2, topic: false,
  tag: 'Chủ đề 8', ord: 5, book: 1,
  desc: 'Cộng trừ không nhớ trong phạm vi 100, tự gõ số', winText: 'Con tính giỏi quá!',
  levelNames: ['Trong 50', 'Trong 100'], who: '🐥',
  play(ctx) { return runKeypad(ctx, this, 8, () => calc100Question(ctx.level)); },
});

/* ---------- Chủ đề 9: Lịch, thứ trong tuần, hôm qua/ngày mai ---------- */
function calQuestion(level) {
  const start = rand(0, 6), days = pickOne([28, 30, 31]), todayDay = rand(2, days - 2);
  const todayWd = (start + todayDay - 1) % 7;
  if (level === 1) {
    const t = pickOne(['tomorrow', 'yesterday']);
    const wd = t === 'tomorrow' ? (todayWd + 1) % 7 : (todayWd + 6) % 7, ans = WEEKDAYS[wd];
    const text = `Hôm nay là *${WEEKDAYS[todayWd]}*. Hỏi ${t === 'tomorrow' ? 'ngày mai' : 'hôm qua'} là thứ mấy?`;
    return { ask: text, say: kwPlain(text), head: '', opts: textOpts(ans, WEEKDAYS.filter(x => x !== ans)), ans, note: `${t === 'tomorrow' ? 'Ngày mai' : 'Hôm qua'} là ${ans}`, key: `thứ ${t} (${WEEKDAYS[todayWd]})` };
  }
  const cells = Array.from({ length: days }, (_, i) => i + 1);
  const head = `<div class="calwrap"><div class="calgrid">${WEEKDAY_SHORT.map(w => `<span class="chd">${w}</span>`).join('')}
    ${Array.from({ length: start }, () => '<span></span>').join('')}
    ${cells.map(d => `<span class="cd ${d === todayDay ? 'today' : ''}">${d}</span>`).join('')}</div></div>`;
  const t = pickOne(['yesterday', 'tomorrow']), ans = t === 'tomorrow' ? todayDay + 1 : todayDay - 1;
  const text = `Hôm nay là ngày *${todayDay}* (ô màu cam). Hỏi ${t === 'tomorrow' ? 'ngày mai' : 'hôm qua'} là ngày mấy?`;
  return { ask: text, say: kwPlain(text), head, opts: numOpts(ans, [todayDay, ans + 1, ans - 1, ans + 2], 4, days), ans, note: `${t === 'tomorrow' ? 'Ngày mai' : 'Hôm qua'} là ngày ${ans}`, key: `lịch ${t} (${todayDay})` };
}
GAMES.push({
  id: 'calendar', subject: 'math', name: 'Lịch & Thứ, Ngày', icon: '📅', theme: 't-calendar', maxLevel: 2, topic: false,
  tag: 'Chủ đề 9', ord: 6, book: 1,
  desc: 'Xem lịch, các ngày trong tuần, hôm qua/ngày mai', winText: 'Con xem lịch giỏi quá!',
  levelNames: ['Thứ trong tuần', 'Xem lịch tháng'], who: '🐰',
  play(ctx) { return runMC(ctx, this, 8, () => calQuestion(ctx.level)); },
});

/* ---------- Chủ đề 9: Vặn kim đồng hồ (giờ đúng) ---------- */
GAMES.push({
  id: 'clockdrag', subject: 'math', name: 'Vặn kim đồng hồ', icon: '🕰️', theme: 't-clockdrag', maxLevel: 1, topic: false,
  tag: 'Chủ đề 9', ord: 7, book: 1,
  desc: 'Kéo kim giờ đến đúng giờ được yêu cầu', winText: 'Con vặn kim đồng hồ giỏi quá!', who: '🐨',
  async play(ctx) {
    const N = 6; let correct = 0;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const target = rand(1, 12);
      ctx.progress(i / N, `🕰️ ${i}/${N}`);
      ctx.root.innerHTML = `
        ${speaker('🐨', `Kéo kim giờ (kim ngắn) đến đúng <b>${target} giờ</b> rồi bấm Xong nhé!`)}
        <div class="dclock"><div class="dface">
          ${Array.from({ length: 12 }, (_, k) => `<span class="cnum" style="--i:${k + 1}">${k + 1}</span>`).join('')}
          <div class="dhand dhour"></div><div class="dhand dmin"></div><div class="dcenter"></div>
        </div></div>
        <div class="center"><button class="big-btn" data-act="ok">✔ Xong</button></div>
        <div class="fb-slot"></div>`;
      Voice.vi(`Kéo kim giờ đến đúng ${target} giờ`);
      const face = ctx.root.querySelector('.dface'), hour = ctx.root.querySelector('.dhour');
      let angle = rand(0, 11) * 30, firstTry = true;
      const setAngle = a => { hour.style.transform = `rotate(${a}deg)`; };
      setAngle(angle);
      hour.style.touchAction = 'none';
      hour.onpointerdown = e => {
        e.preventDefault();
        try { hour.setPointerCapture(e.pointerId); } catch {}
        const move = e2 => {
          const r = face.getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height / 2;
          let a = Math.atan2(e2.clientX - mx, -(e2.clientY - my)) * 180 / Math.PI; if (a < 0) a += 360;
          angle = a; setAngle(angle);
        };
        const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
        document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
      };
      await new Promise(done => {
        ctx.root.querySelector('[data-act=ok]').onclick = () => {
          const hourVal = Math.round(angle / 30) % 12 || 12;
          if (hourVal === target) {
            setAngle(Math.round(angle / 30) * 30);
            hour.onpointerdown = null; ctx.root.querySelector('[data-act=ok]').disabled = true;
            Sfx.good(); if (firstTry) correct++;
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `Đúng ${target} giờ rồi!`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
          } else {
            if (firstTry) { firstTry = false; Store.d.mathWrong[`vặn kim ${target} giờ`] = (Store.d.mathWrong[`vặn kim ${target} giờ`] || 0) + 1; }
            Sfx.bad(); shake(ctx.root.querySelector('.dclock'));
          }
        };
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== Tiếng Anh lớp 1: Bảng chữ cái & Chào hỏi ===================== */
GAMES.push({
  id: 'alphabet', subject: 'en', name: 'Bảng chữ cái ABC', icon: '🔤', theme: 't-alphabet', maxLevel: 2, topic: false,
  desc: 'Nghe tên chữ và âm đầu, chọn đúng chữ cái', winText: 'Con nhớ hết bảng chữ cái rồi!',
  levelNames: ['Nghe tên chữ', 'Nghe âm đầu (phonics)'],
  async play(ctx) {
    const N = 10, nChoice = 4;
    const letters = shuffle(ALPHABET).slice(0, N);
    let correct = 0;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const L = letters[i];
      const others = shuffle(ALPHABET.filter(x => x.letter !== L.letter)).slice(0, nChoice - 1);
      const opts = shuffle([L, ...others]);
      ctx.progress(i / N, `🔤 ${i}/${N}`);
      const phonics = ctx.level === 2;
      ctx.root.innerHTML = `
        ${speaker('🦉', phonics ? 'Nghe từ rồi tìm chữ cái đầu tiên nhé!' : 'Nghe tên chữ cái rồi tìm đúng chữ nhé!')}
        <div class="listen-row"><button class="listen" data-act="say">🔊 Nghe</button></div>
        <div class="choices n4">
          ${opts.map((o, k) => `<button class="choice abc" data-id="${o.letter}" data-key="${k + 1}"><b class="bigletter">${o.letter}</b><span class="k">${k + 1}</span></button>`).join('')}
        </div>
        <div class="fb-slot"></div>`;
      const say = () => phonics ? Voice.en(L.word) : Voice.en(L.letter);
      ctx.root.querySelector('[data-act=say]').onclick = say;
      await wait(250); say();
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.choice').forEach(b => b.onclick = async () => {
          if (b.dataset.id === L.letter) {
            ctx.root.querySelectorAll('.choice').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good(); if (first) correct++;
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${L.letter} = ${esc(L.word)} ${L.emo}`);
            ctx.root.querySelector('[data-act=next]').onclick = done;
            await Voice.en(`${L.letter}, ${L.word}`);
          } else {
            first = false; b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

GAMES.push({
  id: 'greetings', subject: 'en', name: 'Chào hỏi', icon: '👋', theme: 't-greetings', maxLevel: 1, topic: false,
  desc: 'Nghe câu chào, chọn câu trả lời đúng', winText: 'Con chào hỏi giỏi quá!',
  async play(ctx) {
    const N = GREETINGS.length, qs = shuffle(GREETINGS);
    let correct = 0;
    for (let i = 0; i < N && ctx.alive(); i++) {
      const g = qs[i];
      const others = shuffle(GREETINGS.filter(x => x.a !== g.a)).slice(0, 2).map(x => x.a);
      const opts = shuffle([g.a, ...others]);
      ctx.progress(i / N, `👋 ${i}/${N}`);
      ctx.root.innerHTML = `
        ${speaker('🦊', `<span class="en">${esc(g.q)}</span><small>${esc(g.qVi)}</small>`)}
        <div class="listen-row"><button class="listen" data-act="say">🔊 Nghe</button></div>
        <div class="opts mc">${opts.map((o, k) => `<button class="opt txt" data-v="${esc(o)}" data-key="${k + 1}">${esc(o)}</button>`).join('')}</div>
        <div class="fb-slot"></div>`;
      ctx.root.querySelector('[data-act=say]').onclick = () => Voice.en(g.q);
      await wait(250); Voice.en(g.q);
      let first = true;
      await new Promise(done => {
        ctx.root.querySelectorAll('.opt').forEach(b => b.onclick = async () => {
          if (b.dataset.v === g.a) {
            ctx.root.querySelectorAll('.opt').forEach(x => x.disabled = true);
            b.classList.add('ok'); Sfx.good(); if (first) correct++;
            ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), esc(g.aVi));
            ctx.root.querySelector('[data-act=next]').onclick = done;
            await Voice.en(g.a);
          } else {
            first = false; b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
          }
        });
      });
    }
    ctx.finish({ correct, total: N });
  },
});

/* ===================== Tô màu tranh: nghe tên màu tiếng Anh rồi tô đúng màu ===================== */
GAMES.push({
  id: 'paint', subject: 'en', name: 'Tô màu tranh', icon: '🖌️', theme: 't-paint', maxLevel: 2, topic: false,
  desc: 'Nghe tên màu tiếng Anh rồi tô đúng màu vào tranh', winText: 'Con tô tranh đẹp quá!',
  levelNames: ['Tranh 2 vùng màu', 'Tranh nhiều vùng màu'], who: '🐰',
  async play(ctx) {
    const colors = TOPICS.find(t => t.id === 'colors').words.filter(c => c.en !== 'white');
    const pool = PAINT_PICS.filter(p => ctx.level === 1 ? p.regions.length <= 2 : p.regions.length >= 3);
    const pics = shuffle(pool).slice(0, 3);
    let correct = 0, total = 0;
    for (let r = 0; r < pics.length && ctx.alive(); r++) {
      const picT = pics[r];
      ctx.progress(r / pics.length, `🖌️ ${r}/${pics.length}`);
      const targets = shuffle(colors).slice(0, picT.regions.length);
      ctx.root.innerHTML = `
        ${speaker('🐰', 'Nghe tên màu rồi chọn đúng màu để tô vào tranh nhé!')}
        <div class="paintwrap"><svg class="paintsvg" viewBox="0 0 200 160">${picT.svg}</svg></div>
        <div class="listen-row"><button class="listen" data-act="say">🔊 Nghe màu</button></div>
        <div class="choices n4"></div>
        <div class="fb-slot"></div>`;
      const svg = ctx.root.querySelector('.paintsvg');
      const choicesWrap = ctx.root.querySelector('.choices');
      const sayBtn = ctx.root.querySelector('[data-act=say]');
      for (let qi = 0; qi < picT.regions.length && ctx.alive(); qi++) {
        const regionId = picT.regions[qi], target = targets[qi];
        svg.querySelectorAll('.pregion').forEach(el => el.classList.remove('target'));
        const regionEl = svg.querySelector(`[data-r="${regionId}"]`);
        regionEl.classList.add('target');
        const others = shuffle(colors.filter(c => c.id !== target.id)).slice(0, 3);
        const opts = shuffle([target, ...others]);
        choicesWrap.innerHTML = opts.map((o, k) => `<button class="choice" data-id="${o.id}" data-key="${k + 1}">${pic(o)}<span class="k">${k + 1}</span></button>`).join('');
        sayBtn.onclick = () => Voice.en(target.en);
        total++;
        await wait(250); Voice.en(target.en);
        let first = true;
        await new Promise(done => {
          choicesWrap.querySelectorAll('.choice').forEach(b => b.onclick = () => {
            if (b.dataset.id === target.id) {
              choicesWrap.querySelectorAll('.choice').forEach(x => x.disabled = true);
              b.classList.add('ok'); Sfx.good(); if (first) correct++;
              regionEl.classList.remove('target');
              regionEl.style.fill = target.color;
              setTimeout(done, 450);
            } else {
              first = false; b.disabled = true; b.classList.add('no'); shake(b); Sfx.bad();
            }
          });
        });
      }
      ctx.root.querySelector('.listen-row').remove();
      choicesWrap.remove();
      ctx.root.querySelector('.fb-slot').innerHTML = feedback(pickOne(PRAISE), `${picT.name} xong rồi, đẹp quá!`);
      await new Promise(done => { ctx.root.querySelector('[data-act=next]').onclick = done; });
    }
    ctx.finish({ correct, total });
  },
});

/* Gắn book: 2 cho các trò theo sách Toán 2 đã có ở trên (trò Toán 1 tự khai báo book: 1) */
GAMES.filter(g => g.ord && !g.book).forEach(g => g.book = 2);
