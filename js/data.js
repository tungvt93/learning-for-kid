/* Dữ liệu học: chủ đề từ vựng, đồ vật để đếm, sticker, avatar */
const TOPICS = [
  { id: 'animals', name: 'Con vật', icon: '🐶', ask: 'Tìm con vật con vừa nghe nhé!', words: [
    ['cat', '🐱', 'con mèo'], ['dog', '🐶', 'con chó'], ['fish', '🐟', 'con cá'], ['bird', '🐦', 'con chim'],
    ['duck', '🦆', 'con vịt'], ['cow', '🐮', 'con bò'], ['pig', '🐷', 'con lợn'], ['hen', '🐔', 'con gà mái'],
    ['frog', '🐸', 'con ếch'], ['lion', '🦁', 'con sư tử'], ['rabbit', '🐰', 'con thỏ'], ['monkey', '🐵', 'con khỉ'],
    ['elephant', '🐘', 'con voi'], ['bear', '🐻', 'con gấu'], ['tiger', '🐯', 'con hổ'], ['horse', '🐴', 'con ngựa'] ] },
  { id: 'colors', name: 'Màu sắc', icon: '🎨', ask: 'Tìm màu con vừa nghe nhé!', words: [
    ['red', '#ef4444', 'màu đỏ'], ['blue', '#3b82f6', 'màu xanh dương'], ['green', '#22c55e', 'màu xanh lá'],
    ['yellow', '#facc15', 'màu vàng'], ['orange', '#fb923c', 'màu cam'], ['purple', '#a855f7', 'màu tím'],
    ['pink', '#f472b6', 'màu hồng'], ['black', '#1f2937', 'màu đen'], ['white', '#ffffff', 'màu trắng'],
    ['brown', '#92400e', 'màu nâu'] ], color: true },
  { id: 'numbers', name: 'Số đếm', icon: '🔢', ask: 'Tìm số con vừa nghe nhé!', words: [
    ['one', '1', 'số một'], ['two', '2', 'số hai'], ['three', '3', 'số ba'], ['four', '4', 'số bốn'],
    ['five', '5', 'số năm'], ['six', '6', 'số sáu'], ['seven', '7', 'số bảy'], ['eight', '8', 'số tám'],
    ['nine', '9', 'số chín'], ['ten', '10', 'số mười'], ['eleven', '11', 'số mười một'], ['twelve', '12', 'số mười hai'],
    ['thirteen', '13', 'số mười ba'], ['fourteen', '14', 'số mười bốn'], ['fifteen', '15', 'số mười lăm'],
    ['sixteen', '16', 'số mười sáu'], ['seventeen', '17', 'số mười bảy'], ['eighteen', '18', 'số mười tám'],
    ['nineteen', '19', 'số mười chín'], ['twenty', '20', 'số hai mươi'] ], text: true },
  { id: 'food', name: 'Đồ ăn', icon: '🍎', ask: 'Tìm món ăn con vừa nghe nhé!', words: [
    ['apple', '🍎', 'quả táo'], ['banana', '🍌', 'quả chuối'], ['cake', '🍰', 'bánh ngọt'], ['egg', '🥚', 'quả trứng'],
    ['milk', '🥛', 'sữa'], ['bread', '🍞', 'bánh mì'], ['rice', '🍚', 'cơm'], ['grapes', '🍇', 'quả nho'],
    ['candy', '🍬', 'kẹo'], ['carrot', '🥕', 'cà rốt'], ['pizza', '🍕', 'bánh pizza'], ['water', '💧', 'nước'] ] },
  { id: 'school', name: 'Đồ dùng học tập', icon: '🎒', ask: 'Tìm đồ dùng con vừa nghe nhé!', words: [
    ['book', '📖', 'quyển sách'], ['pen', '🖊️', 'cái bút'], ['pencil', '✏️', 'bút chì'], ['bag', '🎒', 'cái cặp'],
    ['ruler', '📏', 'thước kẻ'], ['scissors', '✂️', 'cái kéo'], ['crayon', '🖍️', 'bút sáp màu'], ['chair', '🪑', 'cái ghế'] ] },
  { id: 'toys', name: 'Đồ chơi', icon: '🧸', ask: 'Tìm đồ chơi con vừa nghe nhé!', words: [
    ['ball', '⚽', 'quả bóng'], ['teddy bear', '🧸', 'gấu bông'], ['kite', '🪁', 'con diều'], ['car', '🚗', 'ô tô'],
    ['robot', '🤖', 'người máy'], ['balloon', '🎈', 'bóng bay'], ['drum', '🥁', 'cái trống'], ['train', '🚂', 'tàu hỏa'] ] },
  { id: 'body', name: 'Cơ thể', icon: '✋', ask: 'Tìm bộ phận con vừa nghe nhé!', words: [
    ['eye', '👁️', 'con mắt'], ['ear', '👂', 'cái tai'], ['nose', '👃', 'cái mũi'], ['mouth', '👄', 'cái miệng'],
    ['hand', '✋', 'bàn tay'], ['foot', '🦶', 'bàn chân'], ['leg', '🦵', 'cái chân'], ['tooth', '🦷', 'cái răng'] ] },
  { id: 'family', name: 'Gia đình', icon: '👨‍👩‍👧', ask: 'Tìm người con vừa nghe nhé!', words: [
    ['dad', '👨', 'bố'], ['mom', '👩', 'mẹ'], ['baby', '👶', 'em bé'], ['grandma', '👵', 'bà'],
    ['grandpa', '👴', 'ông'], ['sister', '👧', 'chị / em gái'], ['brother', '👦', 'anh / em trai'] ] },
  { id: 'weather', name: 'Thời tiết', icon: '☀️', ask: 'Tìm thời tiết con vừa nghe nhé!', words: [
    ['sunny', '☀️', 'nắng'], ['rainy', '🌧️', 'mưa'], ['cloudy', '☁️', 'nhiều mây'], ['windy', '💨', 'gió'],
    ['snowy', '❄️', 'có tuyết'], ['hot', '🥵', 'nóng'], ['cold', '🥶', 'lạnh'], ['stormy', '⛈️', 'có bão'] ] },
  { id: 'actions', name: 'Hành động', icon: '🏃', ask: 'Tìm hành động con vừa nghe nhé!', words: [
    ['run', '🏃', 'chạy'], ['jump', '🤸', 'nhảy'], ['walk', '🚶', 'đi bộ'], ['sleep', '😴', 'ngủ'],
    ['eat', '🍽️', 'ăn'], ['drink', '🥤', 'uống'], ['sing', '🎤', 'hát'], ['swim', '🏊', 'bơi'] ] },
];

/* Bảng chữ cái: tên chữ + từ ví dụ để học phát âm (phonics) */
const ALPHABET = [
  ['A', 'apple', '🍎'], ['B', 'ball', '⚽'], ['C', 'cat', '🐱'], ['D', 'dog', '🐶'], ['E', 'elephant', '🐘'],
  ['F', 'fish', '🐟'], ['G', 'grape', '🍇'], ['H', 'hat', '🎩'], ['I', 'ice cream', '🍦'], ['J', 'juice', '🧃'],
  ['K', 'kite', '🪁'], ['L', 'lion', '🦁'], ['M', 'monkey', '🐵'], ['N', 'nose', '👃'], ['O', 'orange', '🍊'],
  ['P', 'pig', '🐷'], ['Q', 'queen', '👸'], ['R', 'rabbit', '🐰'], ['S', 'sun', '☀️'], ['T', 'tiger', '🐯'],
  ['U', 'umbrella', '☂️'], ['V', 'van', '🚐'], ['W', 'watch', '⌚'], ['X', 'fox', '🦊'], ['Y', 'yo-yo', '🪀'],
  ['Z', 'zebra', '🦓'],
].map(([letter, word, emo]) => ({ letter, word, emo }));

/* Hội thoại chào hỏi: câu nói -> câu đáp phù hợp */
const GREETINGS = [
  { q: 'Hello!', qVi: 'Xin chào!', a: 'Hello!', aVi: 'Xin chào! (chào lại)' },
  { q: 'Good morning!', qVi: 'Chào buổi sáng!', a: 'Good morning!', aVi: 'Chào buổi sáng! (chào lại)' },
  { q: "What's your name?", qVi: 'Tên bạn là gì?', a: 'My name is Mai.', aVi: 'Tên tôi là Mai.' },
  { q: 'How are you?', qVi: 'Bạn khỏe không?', a: "I'm fine, thank you.", aVi: 'Tôi khỏe, cảm ơn.' },
  { q: 'Thank you!', qVi: 'Cảm ơn!', a: "You're welcome!", aVi: 'Không có gì!' },
  { q: 'Goodbye!', qVi: 'Tạm biệt!', a: 'Goodbye! See you!', aVi: 'Tạm biệt! Hẹn gặp lại!' },
  { q: 'Nice to meet you!', qVi: 'Rất vui được gặp bạn!', a: 'Nice to meet you too!', aVi: 'Tôi cũng rất vui được gặp bạn!' },
  { q: 'Sorry!', qVi: 'Xin lỗi!', a: "It's okay!", aVi: 'Không sao đâu!' },
];

/* [tên vật, hình, độ dài cm] dùng cho trò Đo độ dài */
const LEN_ITEMS = [
  ['bút chì', '✏️', 10], ['cái kẹo mút', '🍭', 8], ['quyển vở', '📒', 15], ['cái thước', '📏', 20],
  ['quả chuối', '🍌', 12], ['cái kéo', '✂️', 9], ['bút sáp màu', '🖍️', 7], ['con sâu', '🐛', 5],
  ['cái lược', '💈', 11], ['chiếc tăm', '🥢', 6],
];

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* [tên vật thật, hình, loại khối] dùng cho trò Hình & Khối (hình khối 3D) */
const BLOCK_ITEMS = [
  ['viên súc xắc', '🎲', 'cube'], ['khối rubik', '🧊', 'cube'],
  ['hộp quà', '🎁', 'cuboid'], ['quyển sách', '📕', 'cuboid'], ['thùng các-tông', '📦', 'cuboid'],
  ['lon sữa', '🥫', 'cylinder'], ['cây nến', '🕯️', 'cylinder'], ['cái cốc', '🥤', 'cylinder'],
  ['quả bóng', '⚽', 'sphere'], ['viên bi', '🔵', 'sphere'], ['địa cầu', '🌍', 'sphere'],
];
const BLOCK_NAME = { cube: 'khối lập phương', cuboid: 'khối hộp chữ nhật', cylinder: 'khối trụ', sphere: 'khối cầu' };
const BLOCK_ICON = { cube: '🎲', cuboid: '📦', cylinder: '🥫', sphere: '⚽' };

/* Tranh tô màu: mỗi tranh có các vùng (region) riêng để tô, dùng cho trò "Tô màu tranh" */
function starPts(cx, cy, rOuter, rInner, spikes) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
const PAINT_PICS = [
  { name: 'Ông mặt trời', regions: ['rays', 'face'], svg: `
    <polygon class="pregion" data-r="rays" points="${starPts(100, 80, 60, 38, 8)}"/>
    <circle class="pregion" data-r="face" cx="100" cy="80" r="34"/>
    <circle class="deco" cx="88" cy="74" r="4" fill="#22304a"/>
    <circle class="deco" cx="112" cy="74" r="4" fill="#22304a"/>
    <path class="deco" d="M84,92 Q100,104 116,92" stroke="#22304a" stroke-width="4" fill="none" stroke-linecap="round"/>` },
  { name: 'Cái diều', regions: ['body', 'tail'], svg: `
    <polygon class="pregion" data-r="body" points="100,20 140,66 100,112 60,66"/>
    <line class="deco" x1="60" y1="66" x2="140" y2="66" stroke="#22304a" stroke-width="2"/>
    <line class="deco" x1="100" y1="20" x2="100" y2="112" stroke="#22304a" stroke-width="2"/>
    <rect class="pregion" data-r="tail" x="90" y="118" width="20" height="34" rx="10"/>
    <path class="deco" d="M100,112 L100,118" stroke="#22304a" stroke-width="2"/>` },
  { name: 'Cây', regions: ['trunk', 'leaves'], svg: `
    <rect class="pregion" data-r="trunk" x="90" y="98" width="20" height="48" rx="4"/>
    <g class="pregion" data-r="leaves"><circle cx="78" cy="56" r="30"/><circle cx="118" cy="56" r="30"/><circle cx="100" cy="36" r="32"/></g>` },
  { name: 'Con voi', regions: ['body', 'ear'], svg: `
    <g class="pregion" data-r="body">
      <ellipse cx="88" cy="108" rx="48" ry="34"/>
      <circle cx="146" cy="82" r="26"/>
      <path d="M166,74 C184,76 190,94 180,112 C176,122 164,122 160,114 C170,102 172,88 158,80 Z"/>
    </g>
    <ellipse class="pregion" data-r="ear" cx="128" cy="62" rx="22" ry="26" transform="rotate(20 128 62)"/>
    <rect class="deco" x="56" y="134" width="12" height="18" fill="#8a93a6" rx="3"/>
    <rect class="deco" x="100" y="134" width="12" height="18" fill="#8a93a6" rx="3"/>
    <circle class="deco" cx="152" cy="76" r="4" fill="#22304a"/>
    <polygon class="deco" points="176,108 184,112 178,118" fill="#fff"/>` },
  { name: 'Bông hoa', regions: ['stem', 'petals', 'center'], svg: `
    <g class="pregion" data-r="stem"><rect x="96" y="92" width="8" height="54"/><ellipse cx="112" cy="118" rx="16" ry="8" transform="rotate(-20 112 118)"/></g>
    <g class="pregion" data-r="petals">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="100" cy="46" rx="15" ry="22" transform="rotate(${a} 100 70)"/>`).join('')}</g>
    <circle class="pregion" data-r="center" cx="100" cy="70" r="14"/>` },
  { name: 'Con cá', regions: ['body', 'tail', 'fin'], svg: `
    <ellipse class="pregion" data-r="body" cx="90" cy="80" rx="48" ry="32"/>
    <polygon class="pregion" data-r="tail" points="136,80 170,56 170,104"/>
    <polygon class="pregion" data-r="fin" points="76,54 96,54 84,30"/>
    <circle class="deco" cx="108" cy="72" r="5" fill="#22304a"/>` },
  { name: 'Ngôi nhà', regions: ['wall', 'roof', 'door', 'window'], svg: `
    <rect class="pregion" data-r="wall" x="48" y="80" width="104" height="62"/>
    <polygon class="pregion" data-r="roof" points="38,82 100,30 162,82"/>
    <rect class="pregion" data-r="door" x="92" y="108" width="22" height="34" rx="2"/>
    <rect class="pregion" data-r="window" x="60" y="94" width="20" height="20" rx="2"/>
    <line class="deco" x1="70" y1="94" x2="70" y2="114" stroke="#22304a" stroke-width="2"/>
    <line class="deco" x1="60" y1="104" x2="80" y2="104" stroke="#22304a" stroke-width="2"/>` },
  { name: 'Ô tô', regions: ['body', 'window', 'wheels'], svg: `
    <g class="pregion" data-r="body"><rect x="30" y="86" width="140" height="34" rx="14"/><path d="M62,86 Q70,56 100,56 L130,56 Q150,56 150,86 Z"/></g>
    <rect class="pregion" data-r="window" x="92" y="62" width="40" height="22" rx="4"/>
    <g class="pregion" data-r="wheels"><circle cx="64" cy="122" r="16"/><circle cx="136" cy="122" r="16"/></g>
    <circle class="deco" cx="64" cy="122" r="6" fill="#22304a"/>
    <circle class="deco" cx="136" cy="122" r="6" fill="#22304a"/>` },
  { name: 'Công chúa', regions: ['hair', 'crown', 'dress'], svg: `
    <g class="pregion" data-r="hair">
      <circle cx="100" cy="58" r="28"/>
      <ellipse cx="70" cy="78" rx="12" ry="20"/>
      <ellipse cx="130" cy="78" rx="12" ry="20"/>
    </g>
    <circle class="deco" cx="100" cy="62" r="20" fill="#ffd9b3"/>
    <circle class="deco" cx="91" cy="60" r="3" fill="#22304a"/>
    <circle class="deco" cx="109" cy="60" r="3" fill="#22304a"/>
    <path class="deco" d="M92,70 Q100,76 108,70" stroke="#22304a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <polygon class="pregion" data-r="crown" points="80,44 88,26 100,40 112,26 120,44"/>
    <circle class="deco" cx="100" cy="36" r="3" fill="#ffd43b"/>
    <polygon class="pregion" data-r="dress" points="82,96 118,96 142,150 58,150"/>
    <circle class="deco" cx="100" cy="112" r="6" fill="#ffffff8a"/>` },
  { name: 'Con bướm', regions: ['body', 'upperwings', 'lowerwings'], svg: `
    <ellipse class="pregion" data-r="body" cx="100" cy="82" rx="7" ry="40"/>
    <g class="pregion" data-r="upperwings">
      <ellipse cx="66" cy="58" rx="30" ry="24" transform="rotate(-18 66 58)"/>
      <ellipse cx="134" cy="58" rx="30" ry="24" transform="rotate(18 134 58)"/>
    </g>
    <g class="pregion" data-r="lowerwings">
      <ellipse cx="74" cy="104" rx="22" ry="18" transform="rotate(14 74 104)"/>
      <ellipse cx="126" cy="104" rx="22" ry="18" transform="rotate(-14 126 104)"/>
    </g>
    <path class="deco" d="M96,46 Q86,30 76,32" stroke="#22304a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path class="deco" d="M104,46 Q114,30 124,32" stroke="#22304a" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  { name: 'Con mèo', regions: ['body', 'head', 'tail'], svg: `
    <ellipse class="pregion" data-r="body" cx="100" cy="114" rx="38" ry="32"/>
    <g class="pregion" data-r="head">
      <circle cx="100" cy="62" r="30"/>
      <polygon points="74,46 82,18 92,42"/>
      <polygon points="126,46 118,18 108,42"/>
    </g>
    <ellipse class="pregion" data-r="tail" cx="148" cy="112" rx="12" ry="30" transform="rotate(35 148 112)"/>
    <polygon class="deco" points="80,30 86,22 90,38" fill="#ffb3c6"/>
    <polygon class="deco" points="120,30 114,22 110,38" fill="#ffb3c6"/>
    <circle class="deco" cx="90" cy="60" r="4" fill="#22304a"/>
    <circle class="deco" cx="110" cy="60" r="4" fill="#22304a"/>
    <polygon class="deco" points="96,70 104,70 100,76" fill="#22304a"/>
    <path class="deco" d="M60,74 L82,70 M60,82 L82,76 M118,70 L140,74 M118,76 L140,82" stroke="#22304a" stroke-width="1.5"/>` },
  { name: 'Con chim', regions: ['body', 'wing', 'tail'], svg: `
    <g class="pregion" data-r="body">
      <ellipse cx="92" cy="92" rx="34" ry="30"/>
      <circle cx="134" cy="62" r="20"/>
    </g>
    <ellipse class="pregion" data-r="wing" cx="82" cy="94" rx="26" ry="16" transform="rotate(-18 82 94)"/>
    <polygon class="pregion" data-r="tail" points="60,100 26,88 30,110 24,128"/>
    <polygon class="deco" points="152,58 168,62 152,68" fill="#ffa94d"/>
    <circle class="deco" cx="140" cy="56" r="3" fill="#22304a"/>` },
  { name: 'Kỳ lân', regions: ['body', 'mane', 'horn', 'tail'], svg: `
    <g class="pregion" data-r="body">
      <ellipse cx="86" cy="104" rx="42" ry="28"/>
      <ellipse cx="142" cy="70" rx="22" ry="26" transform="rotate(20 142 70)"/>
    </g>
    <g class="pregion" data-r="mane">
      <ellipse cx="126" cy="50" rx="11" ry="15" transform="rotate(20 126 50)"/>
      <ellipse cx="120" cy="64" rx="11" ry="15" transform="rotate(20 120 64)"/>
      <ellipse cx="116" cy="80" rx="11" ry="15" transform="rotate(10 116 80)"/>
    </g>
    <polygon class="pregion" data-r="horn" points="150,32 157,52 143,50"/>
    <g class="pregion" data-r="tail">
      <ellipse cx="44" cy="106" rx="11" ry="24" transform="rotate(-24 44 106)"/>
      <ellipse cx="36" cy="126" rx="10" ry="20" transform="rotate(-30 36 126)"/>
    </g>
    <circle class="deco" cx="150" cy="64" r="3" fill="#22304a"/>
    <rect class="deco" x="66" y="126" width="10" height="18" fill="#8a93a6" rx="3"/>
    <rect class="deco" x="100" y="128" width="10" height="18" fill="#8a93a6" rx="3"/>` },
];

const WORDS = {};
TOPICS.forEach(t => {
  t.words = t.words.map(([en, pic, vi]) => {
    const w = { id: t.id + ':' + en, en, vi, topic: t.id };
    if (t.color) w.color = pic; else if (t.text) w.text = pic; else w.emo = pic;
    WORDS[w.id] = w;
    return w;
  });
});

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];

/* [số ít, số nhiều, hình, tên tiếng Việt] */
const COUNT_ITEMS = [
  ['apple', 'apples', '🍎', 'quả táo'], ['banana', 'bananas', '🍌', 'quả chuối'], ['cat', 'cats', '🐱', 'con mèo'],
  ['dog', 'dogs', '🐶', 'con chó'], ['fish', 'fish', '🐟', 'con cá'], ['duck', 'ducks', '🦆', 'con vịt'],
  ['ball', 'balls', '⚽', 'quả bóng'], ['car', 'cars', '🚗', 'chiếc ô tô'], ['star', 'stars', '⭐', 'ngôi sao'],
  ['balloon', 'balloons', '🎈', 'quả bóng bay'], ['cake', 'cakes', '🍰', 'cái bánh'], ['frog', 'frogs', '🐸', 'con ếch'],
  ['flower', 'flowers', '🌸', 'bông hoa'], ['pencil', 'pencils', '✏️', 'cây bút chì'], ['bird', 'birds', '🐦', 'con chim'],
];

const STICKERS = ['🦄', '🐉', '🚀', '🦖', '🌈', '🏰', '🎠', '🦋', '🐳', '🦕', '🛸', '🎡',
  '🐙', '🦜', '🌻', '🍭', '🧁', '🎸', '🪐', '🐬', '🦩', '🏆', '👑', '💎'];
const stickerCost = i => i * 6 + 5;

const AVATARS = ['🦊', '🐼', '🐯', '🐨', '🐸', '🦁', '🐰', '🐧', '🐵', '🦄'];

const RANKS = [[0, 'Mầm non'], [20, 'Nhà thám hiểm'], [60, 'Siêu nhí'], [120, 'Thiên tài nhỏ'], [200, 'Vua học giỏi']];
