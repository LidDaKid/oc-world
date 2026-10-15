// phone apps (brands c): roblox, duolingo, amazon, doordash, uber, gmail, google, chatgpt, minecraft,
// candy crush, venmo, shein, sephora, starbucks, stardew. see the plug-in notes at the top of phone.js
//
// every app is one screen that keeps its own little "where am i" state and redraws itself.
// saved stuff lives on the phone's data under one key per app (see DEF).

import { h, s, fill, uid, openModal, confirmDialog, toast } from '../ui.js';
import { sticker, allOcs, pic } from './kit.js';
// portrait/nameOf here show an oc as their account on the open app (see phone-accounts.js)
import { portrait, nameOf, acctId, activeOf } from './phone-accounts.js';
import { who, face, freshRef, pickWho, hm, hmA, dayLabel, shortDate, ago, addPhotos, dropImage } from './phone-bits.js';

const G = 'linear-gradient(160deg,';
export const APPS = {
  roblox: { label: 'roblox', icon: '1f9f1', bg: G + '#3a3d44,#111214)', cat: 'games' },
  duolingo: { label: 'duolingo', icon: '1f989', bg: G + '#7fe03a,#4bb10c)', cat: 'other' },
  amazon: { label: 'amazon', icon: '1f4e6', bg: G + '#37475a,#131a22)', cat: 'shopping + food' },
  doordash: { label: 'doordash', icon: '1f354', bg: G + '#ff5a3c,#e8240a)', cat: 'shopping + food' },
  uber: { label: 'uber', icon: '1f695', bg: G + '#2b2b2b,#000)', cat: 'other' },
  gmail: { label: 'gmail', icon: '1f4e7', bg: G + '#fff,#eceff3)', cat: 'other' },
  google: { label: 'google', icon: '1f50d', bg: G + '#fff,#e9eef7)', cat: 'other' },
  chatgpt: { label: 'chatgpt', icon: '1f916', bg: G + '#1fa37f,#0c6b52)', cat: 'other' },
  minecraft: { label: 'minecraft', icon: '26cf-fe0f', bg: G + '#79c05a 0 30%,#866043 30%,#5b3f2b)', cat: 'games' },
  candycrush: { label: 'candy crush', icon: '1f36c', bg: G + '#ff8fd0,#c2189b)', cat: 'games' },
  venmo: { label: 'venmo', icon: '1f4b8', bg: G + '#4fb3ff,#008cff)', cat: 'other' },
  shein: { label: 'shein', icon: '1f457', bg: G + '#222,#000)', cat: 'shopping + food' },
  sephora: { label: 'sephora', icon: '1f484', bg: 'repeating-linear-gradient(90deg,#111 0 5px,#fff 5px 10px)', cat: 'shopping + food' },
  starbucks: { label: 'starbucks', icon: '2615', bg: G + '#1e8a5a,#00623b)', cat: 'shopping + food' },
  stardew: { label: 'stardew', icon: '1f331', bg: G + '#8fd6ff 0 45%,#6fbf3a 45%,#3e8a1e)', cat: 'games' },
};

export const DEF = {
  roblox: { robux: 80, games: [], owned: [] },
  duo: { lang: 'spanish', streak: 0, xp: 0, hearts: 5, done: 0, lastDay: null },
  amazon: { items: [], cart: [], orders: [] },
  dash: { orders: [] },
  uber: { rides: [] },
  gmail: { mails: [] },
  gpt: { chats: [] },
  mc: { worlds: [] },
  candy: { level: 1, best: 0, stars: {} },
  venmo: { balance: 40, feed: [] },
  shein: { items: [], wish: [], cart: [], orders: 0 },
  sephora: { items: [], wish: [], cart: [], points: 0, orders: 0 },
  sbux: { stars: 0, orders: [], misspell: true },
  sdv: { farm: '', gold: 500, start: null, offset: 0, plots: [], seeds: { parsnip: 5 }, hearts: {}, gifted: {}, shipped: 0 },
};

// ---------------------------------------------------------------- helpers
function hashStr(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const money = n => '$' + (Number(n) || 0).toFixed(2);
const agoText = ts => { const a = ago(ts); return a === 'now' ? 'now' : a + ' ago'; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dayKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const midnight = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const btn = (cls, label, onclick, extra = {}) => h('button', { type: 'button', class: cls, onclick, ...extra }, label);
const backIco = () => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('path', { d: 'M15 4 7 12l8 8', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
const searchIco = () => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('circle', { cx: 10.5, cy: 10.5, r: 6.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), s('path', { d: 'm15.5 15.5 5 5', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
const starIco = on => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('path', { d: 'm12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z', fill: on ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linejoin': 'round' }));
const heartIco = on => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('path', { d: 'M12 20.5s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z', fill: on ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linejoin': 'round' }));
const menuIco = () => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('path', { d: 'M4 7h16M4 12h16M4 17h10', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
const cartIco = () => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('path', { d: 'M3 4h2.5l2.2 11h10.6l2-8H6.6', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), s('circle', { cx: 9.5, cy: 19.5, r: 1.6, fill: 'currentColor' }), s('circle', { cx: 17, cy: 19.5, r: 1.6, fill: 'currentColor' }));
const editIco = () => s('svg', { viewBox: '0 0 24 24', class: 'pk-ico' }, s('path', { d: 'M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linejoin': 'round' }));

// a little form in a box. fields: { key, label, type: text|number|textarea|select|pic, value, options, req }
function form(title, fields, onOk, { okLabel = 'save', extra = [] } = {}) {
  const got = {};
  const rows = fields.map(f => {
    let el;
    if (f.type === 'select') el = h('select', {}, f.options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(f.value) }, l)));
    else if (f.type === 'textarea') { el = h('textarea', { rows: f.rows || 4, maxLength: f.max || 3000, placeholder: f.ph || '' }); el.value = f.value ?? ''; }
    else if (f.type === 'pic') {
      got[f.key] = f.value || null;
      const thumb = h('span', { class: 'pk-form-thumb' }, f.value ? pic(f.value) : null);
      el = h('div', { class: 'pk-form-pic' }, thumb, h('button', {
        type: 'button', class: 'btn ghost sm', onclick: async () => {
          const [p] = await addPhotos(false, 900);
          if (!p) return;
          got[f.key] = p.imageId;
          fill(thumb, pic(p.imageId));
        },
      }, 'picture'));
    } else el = h('input', { type: f.type || 'text', value: f.value ?? '', placeholder: f.ph || '', maxLength: f.max || 80, step: f.step || 'any', min: f.min ?? null });
    return [f, el];
  });
  const first = rows.find(([f]) => f.type !== 'pic' && f.type !== 'select');
  if (first) first[1].dataset.autofocus = '';
  openModal({
    title,
    body: h('div', { class: 'pk-form' }, rows.map(([f, el]) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, f.label), el))),
    actions: [...extra, {
      label: okLabel, kind: 'primary', onClick: close => {
        const v = {};
        for (const [f, el] of rows) v[f.key] = f.type === 'pic' ? got[f.key] : f.type === 'number' ? Number(el.value) || 0 : el.value.trim();
        const miss = rows.find(([f]) => f.req && !v[f.key]);
        if (miss) { miss[1].focus?.(); return; }
        if (onOk(v) !== false) close();
      },
    }],
  });
}

// a seeded little town map. returns { svg, route(fromIdx, toIdx) -> path string, spots }
function townMap(seed, cls = '') {
  const r = rng(seed);
  const W = 300, H = 400, xs = [0, 70, 150, 230, 300], ys = [0, 80, 160, 240, 320, 400];
  const kids = [s('rect', { width: W, height: H, fill: 'var(--pk-map-land, #eef0e6)' })];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const x = xs[i] + 9, y = ys[j] + 9, w = xs[i + 1] - xs[i] - 18, hh = ys[j + 1] - ys[j] - 18;
    const k = r();
    kids.push(s('rect', { x, y, width: w, height: hh, rx: 5, fill: k < .18 ? 'var(--pk-map-park, #c7e6b4)' : k < .26 ? 'var(--pk-map-water, #b9dcf5)' : 'var(--pk-map-block, #e2e1db)' }));
  }
  for (const x of xs.slice(1, -1)) kids.push(s('rect', { x: x - 5, y: 0, width: 10, height: H, fill: 'var(--pk-map-road, #fff)' }));
  for (const y of ys.slice(1, -1)) kids.push(s('rect', { x: 0, y: y - 5, width: W, height: 10, fill: 'var(--pk-map-road, #fff)' }));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pk-map ' + cls, preserveAspectRatio: 'xMidYMid slice' }, kids);
  const spots = [];
  for (const x of xs.slice(1, -1)) for (const y of ys.slice(1, -1)) spots.push([x, y]);
  const route = (a, b) => {
    const [x1, y1] = spots[a % spots.length], [x2, y2] = spots[b % spots.length];
    return `M${x1} ${y1} L${x2} ${y1} L${x2} ${y2}`;
  };
  return { svg, route, spots };
}

// ---------------------------------------------------------------- lock screen + badges
export function lockNotifs({ d, show }) {
  const out = [];
  const mails = (d.gmail?.mails || []).filter(m => !m.read && !m.sent);
  const m = mails.sort((a, b) => b.at - a.at)[0];
  if (m) out.push({ app: 'gmail', title: who(m.from).name, text: m.subject || '(no subject)', at: m.at, open: () => show('gmail', { open: m.id }, 'unlock') });
  const o = (d.dash?.orders || []).at(-1);
  if (o && Date.now() - o.at < 30 * 60e3) out.push({ app: 'doordash', title: 'doordash', text: dashStep(o).label, at: o.at, open: () => show('doordash', { track: o.id }, 'unlock') });
  if (d.duo?.streak && d.duo.lastDay !== dayKey() && new Date().getHours() >= 12) out.push({ app: 'duolingo', title: 'duolingo', text: `${d.duo.streak} day streak`, at: midnight(Date.now()) + 12 * 3600e3, open: () => show('duolingo', {}, 'unlock') });
  return out;
}
export const badges = ({ d }) => ({
  gmail: (d.gmail?.mails || []).filter(m => !m.read && !m.sent).length,
  duolingo: d.duo?.streak && d.duo.lastDay !== dayKey() ? 1 : 0,
});

function dashStep(o) {
  const min = (Date.now() - o.at) / 60e3;
  const steps = [['order confirmed', 0], ['preparing your order', 1], ['dasher is on the way', 3], ['delivered', 6]];
  let i = 0;
  while (i < steps.length - 1 && min >= steps[i + 1][1]) i++;
  return { i, label: steps[i][0], pct: Math.min(1, min / 6) };
}

// ---------------------------------------------------------------- install
export function install(api) {
  const { d, char, mine, save, SCREENS } = api;
  for (const [k, v] of Object.entries(DEF)) d[k] = { ...structuredClone(v), ...d[k] };
  const home = () => api.goHome();
  const me = () => freshRef({ id: char.id, name: nameOf(char), acct: acctId(char) });
  const others = () => allOcs(char.id);

  // one screen per app, each with its own state + redraw
  function app(id, cls, render) {
    SCREENS[id] = (params = {}, view) => {
      const root = h('div', { class: `ph-app-screen pk-app pk-${cls}` });
      const timers = [];
      api.onLeave(() => { timers.forEach(t => { clearInterval(t); clearTimeout(t); cancelAnimationFrame(t); }); timers.length = 0; });
      const ctx = {
        root, params, view, st: {}, timers,
        draw: (anim) => { const sc = root.querySelector('.ph-scroll')?.scrollTop; fill(root, render(ctx)); if (anim) root.firstElementChild?.classList.add('pk-in-' + anim); else if (sc && ctx.keepScroll) { const el = root.querySelector('.ph-scroll'); if (el) el.scrollTop = sc; } },
        go: (patch, anim = 'push') => { Object.assign(ctx.st, patch); ctx.draw(anim); },
      };
      ctx.draw();
      return root;
    };
  }

  // ============================================================ roblox
  const rb = d.roblox;
  const RB_SHOP = [
    ['headless head', 31000, '1f47b'], ['korblox leg', 17000, '1f9b4'], ['bat wings', 350, '1f987'], ['spiked collar', 120, '1f5a4'],
    ['valkyrie helm', 5000, '1f451'], ['emo hair', 75, '1f487'], ['skull tee', 5, '1f480'], ['guitar back', 250, '1f3b8'],
  ];
  const rbStatus = o => { const k = hashStr(o.id + dayKey()) % 3; return k === 0 ? 'online' : k === 1 ? 'ingame' : 'offline'; };
  app('roblox', 'rbx', c => {
    const st = c.st;
    st.tab ||= 'home';
    const top = h('div', { class: 'pk-rbx-top' },
      btn('pk-rbx-x', backIco(), home, { title: 'home' }),
      h('span', { class: 'pk-rbx-logo' }, 'ROBL', h('i'), 'X'),
      h('button', {
        type: 'button', class: 'pk-rbx-robux', title: 'robux', onclick: () => {
          if (!mine) return;
          form('robux', [{ key: 'n', label: 'robux', type: 'number', value: rb.robux, min: 0 }], v => { rb.robux = Math.max(0, Math.round(v.n)); save(); c.draw(); });
        },
      }, h('i', { class: 'pk-rbx-coin' }), rb.robux.toLocaleString()));
    let body;
    if (st.tab === 'home') {
      const fr = others();
      body = h('div', { class: 'ph-scroll pk-rbx-body' },
        h('div', { class: 'pk-rbx-me', 'data-acct-switch': true }, portrait(char, 'lg'), h('div', {}, h('b', {}, nameOf(char)), h('span', {}, '@' + (activeOf(char, 'roblox')?.handle || nameOf(char).toLowerCase().replace(/[^a-z0-9]+/g, ''))))),
        h('div', { class: 'pk-rbx-h' }, h('b', {}, `friends (${fr.length})`)),
        h('div', { class: 'pk-rbx-friends' }, fr.length ? fr.map(o => {
          const stt = rbStatus(o);
          return h('div', { class: 'pk-rbx-friend ' + stt }, h('span', { class: 'pk-rbx-fpic' }, portrait(o, 'md'), h('i')), h('span', {}, nameOf(o).split(' ')[0]));
        }) : h('span', { class: 'pk-sub' }, '—')),
        h('div', { class: 'pk-rbx-h' }, h('b', {}, 'continue'), mine ? btn('pk-rbx-add', '+', addGame, { title: 'add a game' }) : null),
        rb.games.length ? h('div', { class: 'pk-rbx-games' }, [...rb.games].reverse().map(g => h('div', { class: 'pk-rbx-game' },
          h('div', { class: 'pk-rbx-thumb', style: { background: `hsl(${hashStr(g.name) % 360} 55% 45%)` } }, g.imageId ? pic(g.imageId) : h('b', {}, g.name.slice(0, 2).toUpperCase()),
            mine ? btn('pk-x', '✕', async () => { if (!(await confirmDialog(`remove ${g.name}?`, { danger: true, okLabel: 'remove' }))) return; rb.games = rb.games.filter(x => x !== g); dropImage(g.imageId); save(); c.draw(); }, { title: 'remove' }) : null),
          h('b', {}, g.name),
          h('span', { class: 'pk-rbx-meta' }, h('i', { class: 'pk-rbx-thumbup' }, '▲'), ` ${90 + (hashStr(g.name) % 10)}%  `, h('i', { class: 'pk-rbx-ppl' }), ' ' + bigN(g.playing))))) : h('div', { class: 'pk-empty' }, sticker('1f9f1', 'pk-empty-stk')));
    } else {
      body = h('div', { class: 'ph-scroll pk-rbx-body' },
        h('div', { class: 'pk-rbx-h' }, h('b', {}, 'avatar shop')),
        h('div', { class: 'pk-rbx-shop' }, RB_SHOP.map(([name, price, code]) => {
          const own = rb.owned.includes(name);
          return h('div', { class: 'pk-rbx-item' },
            h('div', { class: 'pk-rbx-item-pic' }, sticker(code)),
            h('b', {}, name),
            own ? h('span', { class: 'pk-rbx-owned' }, 'owned') : h('button', {
              type: 'button', class: 'pk-rbx-buy', disabled: !mine, onclick: () => {
                if (rb.robux < price) { toast('not enough robux', 'bad'); return; }
                rb.robux -= price; rb.owned.push(name); save(); c.draw(); toast(`got ${name}`);
              },
            }, h('i', { class: 'pk-rbx-coin' }), price.toLocaleString()));
        })));
    }
    async function addGame() {
      form('add a game', [{ key: 'name', label: 'name', req: true, max: 40 }, { key: 'playing', label: 'playing', type: 'number', value: Math.round(1000 + Math.random() * 90000) }, { key: 'imageId', label: 'thumbnail', type: 'pic' }],
        v => { rb.games.push({ id: 'g_' + uid(), name: v.name, playing: v.playing, imageId: v.imageId }); save(); c.draw(); });
    }
    const tabs = h('div', { class: 'pk-tabbar pk-rbx-tabs' }, [['home', 'home'], ['shop', 'avatar shop']].map(([k, l]) => btn(st.tab === k ? 'on' : '', l, () => c.go({ tab: k }, null))));
    return h('div', { class: 'pk-fill' }, top, body, tabs);
  });
  function bigN(n) { n = Number(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }

  // ============================================================ duolingo
  const duo = d.duo;
  const WORDS = {
    spanish: [['gato', 'cat'], ['perro', 'dog'], ['murciélago', 'bat'], ['noche', 'night'], ['luna', 'moon'], ['corazón', 'heart'], ['negro', 'black'], ['rosa', 'pink'], ['canción', 'song'], ['amiga', 'friend'], ['vampira', 'vampire'], ['estrella', 'star'], ['sangre', 'blood'], ['flor', 'flower'], ['beso', 'kiss'], ['lluvia', 'rain'], ['fresa', 'strawberry'], ['espejo', 'mirror'], ['sueño', 'dream'], ['guitarra', 'guitar']],
    french: [['chat', 'cat'], ['chien', 'dog'], ['chauve-souris', 'bat'], ['nuit', 'night'], ['lune', 'moon'], ['cœur', 'heart'], ['noir', 'black'], ['rose', 'pink'], ['chanson', 'song'], ['amie', 'friend'], ['vampire', 'vampire'], ['étoile', 'star'], ['sang', 'blood'], ['fleur', 'flower'], ['bisou', 'kiss'], ['pluie', 'rain'], ['fraise', 'strawberry'], ['miroir', 'mirror'], ['rêve', 'dream'], ['guitare', 'guitar']],
    japanese: [['ねこ (neko)', 'cat'], ['いぬ (inu)', 'dog'], ['こうもり (koumori)', 'bat'], ['よる (yoru)', 'night'], ['つき (tsuki)', 'moon'], ['こころ (kokoro)', 'heart'], ['くろ (kuro)', 'black'], ['ピンク (pinku)', 'pink'], ['うた (uta)', 'song'], ['ともだち (tomodachi)', 'friend'], ['きゅうけつき (kyuuketsuki)', 'vampire'], ['ほし (hoshi)', 'star'], ['ち (chi)', 'blood'], ['はな (hana)', 'flower'], ['キス (kisu)', 'kiss'], ['あめ (ame)', 'rain'], ['いちご (ichigo)', 'strawberry'], ['かがみ (kagami)', 'mirror'], ['ゆめ (yume)', 'dream'], ['ギター (gitaa)', 'guitar']],
  };
  const FLAG = { spanish: ['#c60b1e', '#ffc400', '#c60b1e'], french: ['#0055a4', '#fff', '#ef4135'], japanese: ['#fff', '#bc002d', '#fff'] };
  const flag = lang => h('i', { class: 'pk-duo-flag pk-flag-' + lang, style: { '--a': FLAG[lang][0], '--b': FLAG[lang][1], '--c': FLAG[lang][2] } });
  function makeQuiz(lang) {
    const words = WORDS[lang];
    const r = rng(hashStr(lang + duo.done + Date.now()));
    const picks = [...words].sort(() => r() - .5).slice(0, 3);
    return picks.map(([w, en], i) => {
      const toEn = i !== 1;
      const pool = words.filter(x => x[0] !== w).sort(() => r() - .5).slice(0, 3);
      const opts = [[w, en], ...pool].sort(() => r() - .5);
      return { q: toEn ? w : en, answer: toEn ? en : w, opts: opts.map(o => (toEn ? o[1] : o[0])), toEn };
    });
  }
  app('duolingo', 'duo', c => {
    const st = c.st;
    if (st.quiz) return duoQuiz(c);
    st.tab ||= 'learn';
    const r = rng(hashStr(char.id + 'league'));
    const top = h('div', { class: 'pk-duo-top' },
      btn('pk-duo-back', backIco(), home, { title: 'home' }),
      h('button', { type: 'button', class: 'pk-duo-stat', title: 'course', onclick: () => mine && pickLang(c) }, flag(duo.lang)),
      h('span', { class: 'pk-duo-stat fire' + (duo.lastDay === dayKey() ? ' lit' : '') }, h('i', { class: 'pk-duo-flame' }), duo.streak),
      h('span', { class: 'pk-duo-stat gem' }, h('i', { class: 'pk-duo-gem' }), duo.xp),
      h('span', { class: 'pk-duo-stat heart' }, h('i', { class: 'pk-duo-heart' }), duo.hearts));
    let body;
    if (st.tab === 'learn') {
      const unit = Math.floor(duo.done / 6);
      const nodes = Array.from({ length: 10 }, (_, i) => unit * 6 + i);
      body = h('div', { class: 'ph-scroll pk-duo-body' },
        h('div', { class: 'pk-duo-unit' }, h('span', {}, `section 1, unit ${unit + 1}`), h('b', {}, ['order food', 'talk about music', 'describe the night', 'make plans'][unit % 4])),
        h('div', { class: 'pk-duo-path' }, nodes.map((n, i) => {
          const state = n < duo.done ? 'done' : n === duo.done ? 'cur' : 'locked';
          const off = Math.round(Math.sin(i * 0.9) * 62);
          return h('div', { class: 'pk-duo-node-wrap', style: { transform: `translateX(${off}px)` } },
            state === 'cur' ? h('span', { class: 'pk-duo-start' }, 'start') : null,
            h('button', {
              type: 'button', class: 'pk-duo-node ' + state + (i % 5 === 4 ? ' chest' : ''), disabled: state === 'locked',
              onclick: () => { if (duo.hearts <= 0 && mine) { toast('no hearts left', 'bad'); return; } c.go({ quiz: makeQuiz(duo.lang), qi: 0, picked: null, checked: false, right: 0 }, 'push'); },
            }, i % 5 === 4 ? h('i', { class: 'pk-duo-chest' }) : h('i', { class: 'pk-duo-star' })));
        })),
        h('div', { class: 'pk-duo-owl' }, sticker('1f989')));
    } else {
      const people = [{ name: nameOf(char), c: char, xp: duo.xp, me: true }, ...others().map(o => ({ name: nameOf(o), c: o, xp: Math.round(r() * 900) }))].sort((a, b) => b.xp - a.xp);
      body = h('div', { class: 'ph-scroll pk-duo-body' },
        h('div', { class: 'pk-duo-league' }, h('i', { class: 'pk-duo-shield' }), h('b', {}, 'amethyst league')),
        h('div', { class: 'pk-duo-board' }, people.map((p, i) => h('div', { class: 'pk-duo-rank' + (p.me ? ' me' : '') },
          h('b', { class: 'pk-duo-n' + (i < 3 ? ' top' + i : '') }, i + 1), portrait(p.c, 'sm'), h('span', {}, p.name), h('em', {}, p.xp + ' xp')))));
    }
    const tabs = h('div', { class: 'pk-tabbar pk-duo-tabs' }, [['learn', 'learn'], ['league', 'leagues']].map(([k, l]) => btn(st.tab === k ? 'on' : '', l, () => c.go({ tab: k }, null))));
    return h('div', { class: 'pk-fill' }, top, body, tabs);
  });
  function pickLang(c) {
    form('course', [{ key: 'lang', label: 'learning', type: 'select', value: duo.lang, options: [['spanish', 'spanish'], ['french', 'french'], ['japanese', 'japanese']] }],
      v => { duo.lang = v.lang; save(); c.draw(); });
  }
  function duoQuiz(c) {
    const st = c.st;
    const q = st.quiz[st.qi];
    if (!q) {
      // finished
      const xp = 10 + st.right * 5;
      if (!st.counted) {
        st.counted = true;
        if (mine) {
          duo.xp += xp; duo.done += 1;
          if (duo.lastDay !== dayKey()) {
            const y = dayKey(Date.now() - 864e5);
            duo.streak = duo.lastDay === y ? duo.streak + 1 : 1;
            duo.lastDay = dayKey();
          }
          save();
        }
      }
      return h('div', { class: 'pk-fill pk-duo-done' },
        h('div', { class: 'pk-duo-owl big' }, sticker('1f989')),
        h('h3', {}, 'lesson complete'),
        h('div', { class: 'pk-duo-results' },
          h('div', { class: 'gold' }, h('span', {}, 'total xp'), h('b', {}, xp)),
          h('div', { class: 'blue' }, h('span', {}, 'right'), h('b', {}, `${st.right}/3`)),
          h('div', { class: 'fire' }, h('span', {}, 'streak'), h('b', {}, duo.streak))),
        btn('pk-duo-btn', 'continue', () => { c.st = { tab: 'learn' }; c.draw('pop'); }));
    }
    const pickBtn = h('button', {
      type: 'button', class: 'pk-duo-btn' + (st.picked == null ? ' off' : '') + (st.checked ? (st.ok ? ' ok' : ' bad') : ''), onclick: () => {
        if (st.picked == null) return;
        if (!st.checked) {
          st.checked = true;
          st.ok = q.opts[st.picked] === q.answer;
          if (st.ok) st.right++; else if (mine) { duo.hearts = Math.max(0, duo.hearts - 1); save(); }
          c.draw();
        } else { st.qi++; st.picked = null; st.checked = false; c.draw('push'); }
      },
    }, st.checked ? 'continue' : 'check');
    return h('div', { class: 'pk-fill pk-duo-quiz' },
      h('div', { class: 'pk-duo-qtop' }, btn('pk-duo-close', '✕', () => { c.st = { tab: 'learn' }; c.draw('pop'); }, { title: 'quit' }),
        h('div', { class: 'pk-duo-bar' }, h('i', { style: { width: (st.qi / 3 * 100) + '%' } })),
        h('span', { class: 'pk-duo-stat heart' }, h('i', { class: 'pk-duo-heart' }), duo.hearts)),
      h('div', { class: 'pk-duo-qbody' },
        h('b', { class: 'pk-duo-ask' }, q.toEn ? 'what does this mean?' : `how do you say "${q.q}"?`),
        h('div', { class: 'pk-duo-say' }, h('div', { class: 'pk-duo-owl sm' }, sticker('1f989')), h('div', { class: 'pk-duo-bubble' }, q.q)),
        h('div', { class: 'pk-duo-opts' }, q.opts.map((o, i) => h('button', {
          type: 'button', class: 'pk-duo-opt' + (st.picked === i ? ' on' : '') + (st.checked && o === q.answer ? ' right' : ''), disabled: st.checked,
          onclick: () => { st.picked = i; c.draw(); },
        }, o)))),
      h('div', { class: 'pk-duo-foot' + (st.checked ? (st.ok ? ' ok' : ' bad') : '') },
        st.checked ? h('b', { class: 'pk-duo-verdict' }, st.ok ? 'nice!' : `answer: ${q.answer}`) : null,
        pickBtn));
  }

  // ============================================================ shops (amazon, shein, sephora share a lot)
  function shopItems(data) { return data.items; }
  const cartTotal = data => data.cart.reduce((n, x) => { const it = data.items.find(i => i.id === x.id); return n + (it ? it.price * x.qty : 0); }, 0);
  const cartCount = data => data.cart.reduce((n, x) => n + x.qty, 0);
  function addToCart(data, item) { const x = data.cart.find(i => i.id === item.id); if (x) x.qty++; else data.cart.push({ id: item.id, qty: 1 }); save(); }
  function addItemForm(data, c, { title = 'add an item', sale = false } = {}) {
    form(title, [
      { key: 'name', label: 'name', req: true, max: 70 }, { key: 'price', label: 'price', type: 'number', value: '', min: 0 },
      ...(sale ? [{ key: 'was', label: 'was', type: 'number', value: '', min: 0 }] : []),
      { key: 'imageId', label: 'picture', type: 'pic' },
    ], v => { data.items.push({ id: 'i_' + uid(), name: v.name, price: Math.max(0, v.price), was: v.was || null, imageId: v.imageId, at: Date.now() }); save(); c.draw(); });
  }
  function delItem(data, item, c) {
    data.items = data.items.filter(x => x !== item);
    data.cart = data.cart.filter(x => x.id !== item.id);
    if (data.wish) data.wish = data.wish.filter(x => x !== item.id);
    dropImage(item.imageId); save(); c.draw();
  }
  const itemPic = (it, cls) => h('div', { class: cls }, it.imageId ? pic(it.imageId) : sticker(['1f381', '1f45c', '1f457', '1f484', '1f48e', '1f45f'][hashStr(it.name) % 6]));

  // ---- amazon
  const amz = d.amazon;
  const orderStep = o => { const hrs = (Date.now() - o.at) / 3600e3; return hrs < 1 ? 0 : hrs < 24 ? 1 : hrs < 40 ? 2 : 3; };
  const AMZ_STEPS = ['ordered', 'shipped', 'out for delivery', 'delivered'];
  app('amazon', 'amz', c => {
    const st = c.st;
    st.page ||= c.params.page || 'home';
    const top = h('div', { class: 'pk-amz-top' },
      h('div', { class: 'pk-amz-row' }, btn('pk-amz-back', backIco(), () => (st.page === 'home' ? home() : c.go({ page: 'home', item: null }, 'pop'))),
        h('span', { class: 'pk-amz-logo' }, 'amazon', s('svg', { viewBox: '0 0 60 12', class: 'pk-amz-smile' }, s('path', { d: 'M3 3q24 12 50 1', fill: 'none', stroke: '#ff9900', 'stroke-width': 3, 'stroke-linecap': 'round' }), s('path', { d: 'M47 1.5l7 2-4 5', fill: 'none', stroke: '#ff9900', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))),
        h('button', { type: 'button', class: 'pk-amz-cart', title: 'cart', onclick: () => c.go({ page: 'cart' }) }, cartIco(), h('b', {}, cartCount(amz)))),
      st.page === 'home' ? h('label', { class: 'pk-amz-search' }, searchIco(), h('input', { type: 'text', placeholder: 'search amazon', value: st.q || '', oninput: e => { st.q = e.target.value; drawGrid(); } })) : null);
    const grid = h('div', { class: 'pk-amz-grid' });
    function drawGrid() {
      const q = (st.q || '').toLowerCase();
      const list = [...amz.items].reverse().filter(i => !q || i.name.toLowerCase().includes(q));
      fill(grid, list.length ? list.map(it => h('button', { type: 'button', class: 'pk-amz-card', onclick: () => c.go({ page: 'item', item: it.id }) },
        itemPic(it, 'pk-amz-pic'),
        h('span', { class: 'pk-amz-name' }, it.name),
        h('span', { class: 'pk-amz-stars' }, '★★★★', h('i', {}, '★'), h('em', {}, ' ' + (hashStr(it.name) % 9000 + 120).toLocaleString())),
        h('b', { class: 'pk-amz-price' }, h('sup', {}, '$'), Math.floor(it.price), h('sup', {}, String(Math.round((it.price % 1) * 100)).padStart(2, '0'))),
        h('span', { class: 'pk-amz-prime' }, h('b', {}, 'prime'), ' tomorrow'))) : h('div', { class: 'pk-empty' }, sticker('1f4e6', 'pk-empty-stk')));
    }
    let body;
    if (st.page === 'home') {
      drawGrid();
      body = h('div', { class: 'ph-scroll pk-amz-body' },
        h('div', { class: 'pk-amz-deliver' }, 'deliver to ' + nameOf(char)),
        mine ? h('div', { class: 'pk-amz-tools' }, btn('pk-amz-pill', '+ add item', () => addItemForm(amz, c)), btn('pk-amz-pill', 'your orders', () => c.go({ page: 'orders' }))) : btn('pk-amz-pill', 'your orders', () => c.go({ page: 'orders' })),
        grid);
    } else if (st.page === 'item') {
      const it = amz.items.find(i => i.id === st.item);
      if (!it) { st.page = 'home'; requestAnimationFrame(() => c.draw()); return h('div'); }
      body = h('div', { class: 'ph-scroll pk-amz-body pk-amz-detail' },
        h('span', { class: 'pk-amz-brand' }, 'visit the ' + nameOf(char).split(' ')[0].toLowerCase() + ' store'),
        h('b', { class: 'pk-amz-title' }, it.name),
        itemPic(it, 'pk-amz-bigpic'),
        h('b', { class: 'pk-amz-price big' }, h('sup', {}, '$'), Math.floor(it.price), h('sup', {}, String(Math.round((it.price % 1) * 100)).padStart(2, '0'))),
        h('span', { class: 'pk-amz-prime' }, h('b', {}, 'prime'), ' free delivery ', h('b', {}, 'tomorrow')),
        h('span', { class: 'pk-amz-stock' }, 'in stock'),
        mine ? btn('pk-amz-btn yellow', 'add to cart', () => { addToCart(amz, it); toast('added to cart'); c.draw(); }) : null,
        mine ? btn('pk-amz-btn orange', 'buy now', () => { amz.cart = [{ id: it.id, qty: 1 }, ...amz.cart.filter(x => x.id !== it.id)]; checkout([{ id: it.id, qty: 1 }]); }) : null,
        mine ? btn('pk-amz-del', 'delete listing', async () => { if (await confirmDialog('delete this item?', { danger: true, okLabel: 'delete' })) { delItem(amz, it, c); c.go({ page: 'home' }, 'pop'); } }) : null);
    } else if (st.page === 'cart') {
      const lines = amz.cart.map(x => ({ x, it: amz.items.find(i => i.id === x.id) })).filter(l => l.it);
      body = h('div', { class: 'ph-scroll pk-amz-body' },
        h('div', { class: 'pk-amz-sub' }, 'subtotal ', h('b', {}, money(cartTotal(amz)))),
        lines.length && mine ? btn('pk-amz-btn yellow', `proceed to checkout (${cartCount(amz)} items)`, () => checkout(amz.cart)) : null,
        lines.length ? lines.map(({ x, it }) => h('div', { class: 'pk-amz-line' }, itemPic(it, 'pk-amz-pic sm'),
          h('div', { class: 'pk-amz-line-main' }, h('span', {}, it.name), h('b', {}, money(it.price)), h('span', { class: 'pk-amz-stock' }, 'in stock'),
            h('div', { class: 'pk-amz-qty' },
              btn('', x.qty > 1 ? '−' : '🗑', () => { if (!mine) return; if (x.qty > 1) x.qty--; else amz.cart = amz.cart.filter(y => y !== x); save(); c.draw(); }),
              h('b', {}, x.qty), btn('', '+', () => { if (!mine) return; x.qty++; save(); c.draw(); }))))) : h('div', { class: 'pk-empty' }, cartIco(), h('b', {}, 'your cart is empty')));
    } else {
      body = h('div', { class: 'ph-scroll pk-amz-body' },
        h('b', { class: 'pk-amz-title' }, 'your orders'),
        amz.orders.length ? [...amz.orders].reverse().map(o => {
          const k = orderStep(o);
          return h('div', { class: 'pk-amz-order' },
            h('b', { class: 'pk-amz-when' + (k === 3 ? ' done' : '') }, k === 3 ? 'delivered' : k === 2 ? 'arriving today' : 'arriving tomorrow'),
            h('div', { class: 'pk-amz-track' }, AMZ_STEPS.map((l, i) => h('div', { class: i <= k ? 'on' : '' }, h('i'), h('span', {}, l)))),
            h('div', { class: 'pk-amz-order-items' }, o.items.map(it => h('div', { class: 'pk-amz-oi' }, itemPic(it, 'pk-amz-pic xs'), h('span', {}, it.name)))),
            h('span', { class: 'pk-sub' }, `${dayLabel(o.at)} · ${money(o.total)}`));
        }) : h('div', { class: 'pk-empty' }, sticker('1f4e6', 'pk-empty-stk')));
    }
    function checkout(lines) {
      const items = lines.map(x => amz.items.find(i => i.id === x.id)).filter(Boolean);
      if (!items.length) return;
      const total = lines.reduce((n, x) => { const it = amz.items.find(i => i.id === x.id); return n + (it ? it.price * x.qty : 0); }, 0);
      amz.orders.push({ id: 'o_' + uid(), items: items.map(it => ({ name: it.name, price: it.price, imageId: it.imageId })), total, at: Date.now() });
      amz.cart = amz.cart.filter(x => !lines.includes(x) && !lines.some(l => l.id === x.id));
      save();
      toast('order placed');
      c.go({ page: 'orders' });
    }
    return h('div', { class: 'pk-fill' }, top, body);
  });

  // ---- shein + sephora
  function fashionShop(id, cls, data, { logo, sale = false, points = false }) {
    app(id, cls, c => {
      const st = c.st;
      st.page ||= 'home';
      const count = cartCount(data);
      const top = h('div', { class: `pk-shop-top pk-${cls}-top` },
        btn('pk-shop-back', backIco(), () => (st.page === 'home' ? home() : c.go({ page: 'home' }, 'pop'))),
        logo(),
        h('div', { class: 'pk-shop-icons' },
          btn('pk-shop-ico' + (st.page === 'wish' ? ' on' : ''), heartIco(st.page === 'wish'), () => c.go({ page: 'wish' }), { title: 'wishlist' }),
          h('button', { type: 'button', class: 'pk-shop-ico', title: 'bag', onclick: () => c.go({ page: 'cart' }) }, cartIco(), count ? h('b', { class: 'pk-shop-count' }, count) : null)));
      const tile = it => {
        const on = data.wish.includes(it.id);
        return h('div', { class: 'pk-shop-tile' },
          h('button', { type: 'button', class: 'pk-shop-pic', onclick: () => { if (!mine) return; addToCart(data, it); toast('added to bag'); c.draw(); } }, itemPic(it, 'pk-shop-img'),
            sale && it.was > it.price ? h('span', { class: 'pk-shop-off' }, `-${Math.round((1 - it.price / it.was) * 100)}%`) : null),
          h('button', { type: 'button', class: 'pk-shop-heart' + (on ? ' on' : ''), title: 'wishlist', onclick: () => { if (!mine) return; data.wish = on ? data.wish.filter(x => x !== it.id) : [...data.wish, it.id]; save(); c.draw(); } }, heartIco(on)),
          h('span', { class: 'pk-shop-name' }, it.name),
          h('div', { class: 'pk-shop-prices' }, h('b', { class: sale && it.was > it.price ? 'red' : '' }, money(it.price)), sale && it.was > it.price ? h('s', {}, money(it.was)) : null),
          mine ? btn('pk-shop-del', '✕', async () => { if (await confirmDialog('delete this item?', { danger: true, okLabel: 'delete' })) delItem(data, it, c); }, { title: 'delete' }) : null);
      };
      let body;
      if (st.page === 'home') {
        const list = [...data.items].reverse();
        let banner = null;
        if (sale) {
          const left = h('b', { class: 'pk-shein-timer' });
          const tick = () => { const ms = midnight(Date.now()) + 864e5 - Date.now(); const t = Math.floor(ms / 1000); left.textContent = [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map(n => String(n).padStart(2, '0')).join(' : '); };
          tick(); c.timers.push(setInterval(tick, 1000));
          banner = h('div', { class: 'pk-shein-flash' }, h('span', {}, 'flash sale'), h('span', { class: 'pk-shein-ends' }, 'ends in ', left));
        }
        if (points) {
          const tier = data.points >= 1000 ? 'rouge' : data.points >= 350 ? 'vib' : 'insider';
          banner = h('div', { class: 'pk-seph-bi' }, h('div', {}, h('span', {}, 'beauty insider'), h('b', {}, tier)), h('div', { class: 'pk-seph-pts' }, h('b', {}, data.points.toLocaleString()), h('span', {}, 'points')));
        }
        body = h('div', { class: 'ph-scroll pk-shop-body' }, banner,
          mine ? btn('pk-shop-add', '+ add item', () => addItemForm(data, c, { sale })) : null,
          list.length ? h('div', { class: 'pk-shop-grid' }, list.map(tile)) : h('div', { class: 'pk-empty' }, sticker(APPS[id].icon, 'pk-empty-stk')));
      } else if (st.page === 'wish') {
        const list = data.items.filter(i => data.wish.includes(i.id));
        body = h('div', { class: 'ph-scroll pk-shop-body' }, h('b', { class: 'pk-shop-h' }, 'wishlist'),
          list.length ? h('div', { class: 'pk-shop-grid' }, list.map(tile)) : h('div', { class: 'pk-empty' }, heartIco(false)));
      } else {
        const lines = data.cart.map(x => ({ x, it: data.items.find(i => i.id === x.id) })).filter(l => l.it);
        const total = cartTotal(data);
        body = h('div', { class: 'ph-scroll pk-shop-body' }, h('b', { class: 'pk-shop-h' }, `bag (${count})`),
          lines.length ? lines.map(({ x, it }) => h('div', { class: 'pk-shop-line' }, itemPic(it, 'pk-shop-img sm'),
            h('div', {}, h('span', {}, it.name), h('b', {}, money(it.price)), h('em', {}, '× ' + x.qty)),
            mine ? btn('pk-shop-rm', '✕', () => { data.cart = data.cart.filter(y => y !== x); save(); c.draw(); }) : null)) : h('div', { class: 'pk-empty' }, cartIco()),
          lines.length ? h('div', { class: 'pk-shop-total' }, h('span', {}, 'total'), h('b', {}, money(total))) : null,
          points && lines.length ? h('div', { class: 'pk-sub pk-seph-earn' }, `+${Math.floor(total)} points`) : null,
          lines.length && mine ? btn('pk-shop-checkout', 'checkout', () => {
            if (points) data.points += Math.floor(total);
            data.orders = (data.orders || 0) + 1;
            data.cart = [];
            save(); toast('order placed'); c.go({ page: 'home' }, 'pop');
          }) : null);
      }
      return h('div', { class: 'pk-fill' }, top, body);
    });
  }
  fashionShop('shein', 'shein', d.shein, { sale: true, logo: () => h('span', { class: 'pk-shein-logo' }, 'SHEIN') });
  fashionShop('sephora', 'seph', d.sephora, { points: true, logo: () => h('span', { class: 'pk-seph-logo' }, 'SEPHORA') });

  // ============================================================ doordash
  const dash = d.dash;
  const PLACES = [
    { name: 'midnight diner', food: 'burgers', icon: '1f354', menu: [['double smash', 11.5], ['black bun burger', 13], ['cheese fries', 5.5], ['cherry shake', 6]] },
    { name: 'pizza coven', food: 'pizza', icon: '1f355', menu: [['pepperoni slice', 4.5], ['white garlic pie', 18], ['garlic knots', 6], ['soda', 2.5]] },
    { name: 'sakura sushi', food: 'sushi', icon: '1f363', menu: [['spicy tuna roll', 9], ['salmon nigiri', 7], ['miso soup', 3.5], ['mochi', 5]] },
    { name: 'taco crypt', food: 'mexican', icon: '1f32e', menu: [['birria tacos', 12], ['churros', 5], ['elote', 4.5], ['horchata', 4]] },
    { name: 'boba bats', food: 'bubble tea', icon: '1f9cb', menu: [['taro milk tea', 6.5], ['strawberry matcha', 7], ['brown sugar boba', 6.75], ['popcorn chicken', 7]] },
    { name: 'sweet tooth', food: 'desserts', icon: '1f369', menu: [['glazed donut', 2.5], ['red velvet cupcake', 4.5], ['brownie', 3.75], ['cookie box', 9]] },
  ];
  app('doordash', 'dd', c => {
    const st = c.st;
    if (c.params.track && !st.started) { st.started = true; st.page = 'track'; st.order = c.params.track; }
    st.page ||= 'home';
    if (st.page === 'track') return ddTrack(c);
    if (st.page === 'place') {
      const p = PLACES[st.place];
      st.bag ||= [];
      const total = st.bag.reduce((n, [, pr]) => n + pr, 0);
      return h('div', { class: 'pk-fill pk-dd-place' },
        h('div', { class: 'pk-dd-hero', style: { '--h': (hashStr(p.name) % 360) } }, sticker(p.icon, 'pk-dd-hero-stk'), btn('pk-dd-round', backIco(), () => c.go({ page: 'home', bag: [] }, 'pop'))),
        h('div', { class: 'ph-scroll pk-dd-body' },
          h('h3', { class: 'pk-dd-name' }, p.name),
          h('span', { class: 'pk-sub' }, `${(4.3 + (hashStr(p.name) % 7) / 10).toFixed(1)} ★ · ${p.food} · ${15 + hashStr(p.name) % 20} min`),
          h('b', { class: 'pk-dd-h' }, 'menu'),
          p.menu.map(([name, price]) => h('button', { type: 'button', class: 'pk-dd-item', onclick: () => { st.bag.push([name, price]); c.draw(); } },
            h('div', {}, h('b', {}, name), h('span', {}, money(price))), h('i', { class: 'pk-dd-plus' }, '+')))),
        st.bag.length ? h('button', {
          type: 'button', class: 'pk-dd-cta', disabled: !mine, onclick: async () => {
            const pool = others();
            const dasher = pool.length ? freshRef({ id: pool[hashStr(uid()) % pool.length].id }) : { id: null, name: ['marco', 'jess', 'tay', 'devin'][hashStr(uid()) % 4] };
            const o = { id: 'd_' + uid(), place: p.name, icon: p.icon, items: st.bag.map(([n]) => n), total: total + 2.99, dasher, at: Date.now() };
            dash.orders.push(o); save();
            c.go({ page: 'track', order: o.id, bag: [] }, 'push');
          },
        }, h('span', {}, `place order · ${st.bag.length}`), h('b', {}, money(total + 2.99))) : null);
    }
    return h('div', { class: 'pk-fill' },
      h('div', { class: 'pk-dd-top' }, btn('pk-dd-back', backIco(), home), h('span', { class: 'pk-dd-logo' }, h('i', { class: 'pk-dd-mark' }), 'DOORDASH')),
      h('div', { class: 'ph-scroll pk-dd-body' },
        h('div', { class: 'pk-dd-cats' }, PLACES.map(p => h('span', {}, sticker(p.icon), h('em', {}, p.food)))),
        dash.orders.length ? h('button', { type: 'button', class: 'pk-dd-active', onclick: () => c.go({ page: 'track', order: dash.orders.at(-1).id }) },
          sticker(dash.orders.at(-1).icon), h('div', {}, h('b', {}, dash.orders.at(-1).place), h('span', {}, dashStep(dash.orders.at(-1)).label))) : null,
        h('b', { class: 'pk-dd-h' }, 'all stores'),
        PLACES.map((p, i) => h('button', { type: 'button', class: 'pk-dd-store', onclick: () => c.go({ page: 'place', place: i, bag: [] }) },
          h('div', { class: 'pk-dd-store-pic', style: { '--h': (hashStr(p.name) % 360) } }, sticker(p.icon)),
          h('b', {}, p.name),
          h('span', { class: 'pk-sub' }, `${(4.3 + (hashStr(p.name) % 7) / 10).toFixed(1)} ★ · ${15 + hashStr(p.name) % 20} min · $0 delivery fee`)))));
  });
  function ddTrack(c) {
    const o = dash.orders.find(x => x.id === c.st.order);
    if (!o) { c.st.page = 'home'; requestAnimationFrame(() => c.draw()); return h('div'); }
    const map = townMap(hashStr(o.id), 'pk-dd-map');
    const path = s('path', { d: map.route(1, 10), fill: 'none', stroke: '#ff3008', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '1 7' });
    const car = s('g', {}, s('circle', { r: 9, fill: '#ff3008', stroke: '#fff', 'stroke-width': 3 }));
    map.svg.append(path, s('circle', { cx: map.spots[10][0], cy: map.spots[10][1], r: 7, fill: '#111' }), car);
    const label = h('b', { class: 'pk-dd-status' });
    const steps = h('div', { class: 'pk-dd-steps' });
    const tick = () => {
      const k = dashStep(o);
      label.textContent = k.label;
      fill(steps, [0, 1, 2, 3].map(i => h('i', { class: i <= k.i ? 'on' : '' })));
      const len = path.getTotalLength?.() || 0;
      const t = Math.max(0, Math.min(1, ((Date.now() - o.at) / 60e3 - 3) / 3));
      if (len) { const pt = path.getPointAtLength(len * t); car.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }
    };
    requestAnimationFrame(tick);
    c.timers.push(setInterval(tick, 1000));
    return h('div', { class: 'pk-fill pk-dd-track' },
      h('div', { class: 'pk-dd-mapbox' }, map.svg, btn('pk-dd-round', backIco(), () => c.go({ page: 'home' }, 'pop'))),
      h('div', { class: 'pk-dd-sheet' },
        label, h('span', { class: 'pk-sub' }, `${o.place} · ${o.items.length} items · ${money(o.total)}`), steps,
        h('div', { class: 'pk-dd-dasher' }, face(o.dasher, 'md'), h('div', {}, h('b', {}, who(o.dasher).name), h('span', {}, 'your dasher')))));
  }

  // ============================================================ uber
  const ub = d.uber;
  const RIDES = [['uberx', 1, '1f697'], ['comfort', 1.3, '1f699'], ['uberxl', 1.6, '1f690'], ['black', 2.4, '1f3ce-fe0f']];
  app('uber', 'uber', c => {
    const st = c.st;
    st.page ||= 'home';
    const seed = hashStr(char.id + 'uber');
    const map = townMap(seed, 'pk-uber-map');
    if (st.page !== 'ride') map.svg.append(s('circle', { cx: map.spots[1][0], cy: map.spots[1][1], r: 12, class: 'pk-uber-halo' }), s('circle', { cx: map.spots[1][0], cy: map.spots[1][1], r: 6, fill: '#276ef1', stroke: '#fff', 'stroke-width': 3 }));
    const top = btn('pk-uber-back', backIco(), () => (st.page === 'home' ? home() : c.go({ page: 'home' }, 'pop')));
    if (st.page === 'home') {
      const input = h('input', { type: 'text', placeholder: 'where to?', maxLength: 50, readOnly: !mine, onkeydown: e => { if (e.key === 'Enter' && input.value.trim()) c.go({ page: 'pick', to: input.value.trim(), ride: 0 }); } });
      const recent = [...new Set(ub.rides.map(r => r.to))].reverse().slice(0, 4);
      return h('div', { class: 'pk-fill' }, h('div', { class: 'pk-uber-mapbox' }, map.svg, top),
        h('div', { class: 'pk-uber-sheet' },
          h('span', { class: 'pk-uber-logo' }, 'Uber'),
          h('label', { class: 'pk-uber-where' }, searchIco(), input, btn('pk-uber-go', '→', () => input.value.trim() && c.go({ page: 'pick', to: input.value.trim(), ride: 0 }))),
          h('div', { class: 'ph-scroll pk-uber-recent' }, recent.map(t => h('button', { type: 'button', class: 'pk-uber-place', onclick: () => mine && c.go({ page: 'pick', to: t, ride: 0 }) }, h('i', { class: 'pk-uber-clock' }), h('b', {}, t))),
            ub.rides.length ? h('b', { class: 'pk-uber-h' }, 'past rides') : null,
            [...ub.rides].reverse().slice(0, 6).map(r => h('div', { class: 'pk-uber-past' }, h('div', {}, h('b', {}, r.to), h('span', {}, `${shortDate(r.at)} · ${r.type} · ${money(r.price)}`)), h('em', {}, '★'.repeat(r.rating || 0)))))));
    }
    const dest = 10;
    const base = 6 + (hashStr(st.to) % 2200) / 100;
    if (st.page === 'pick') {
      map.svg.append(s('path', { d: map.route(1, dest), fill: 'none', stroke: '#111', 'stroke-width': 4, 'stroke-linejoin': 'round' }), s('rect', { x: map.spots[dest][0] - 6, y: map.spots[dest][1] - 6, width: 12, height: 12, fill: '#111' }));
      return h('div', { class: 'pk-fill' }, h('div', { class: 'pk-uber-mapbox short' }, map.svg, top),
        h('div', { class: 'pk-uber-sheet' },
          h('b', { class: 'pk-uber-h' }, 'choose a ride'),
          h('div', { class: 'ph-scroll pk-uber-opts' }, RIDES.map(([name, k, code], i) => h('button', { type: 'button', class: 'pk-uber-opt' + (st.ride === i ? ' on' : ''), onclick: () => c.go({ ride: i }, null) },
            sticker(code, 'pk-uber-car'), h('div', {}, h('b', {}, name), h('span', {}, `${hmA(Date.now() + (12 + i * 2) * 60e3)} dropoff`)), h('b', { class: 'pk-uber-price' }, money(base * k))))),
          btn('pk-uber-cta', `choose ${RIDES[st.ride][0]}`, () => {
            const pool = others();
            st.driver = pool.length ? freshRef({ id: pool[hashStr(st.to) % pool.length].id }) : { id: null, name: ['ray', 'mo', 'kat', 'sid'][hashStr(st.to) % 4] };
            c.go({ page: 'ride', started: Date.now() });
          })));
    }
    if (st.page === 'ride') {
      const route = s('path', { d: map.route(1, dest), fill: 'none', stroke: '#111', 'stroke-width': 4, 'stroke-linejoin': 'round' });
      const car = s('g', {}, s('rect', { x: -7, y: -4.5, width: 14, height: 9, rx: 3, fill: '#111' }), s('rect', { x: 1, y: -3, width: 4, height: 6, rx: 1, fill: '#7fd0ff' }));
      map.svg.append(route, s('rect', { x: map.spots[dest][0] - 6, y: map.spots[dest][1] - 6, width: 12, height: 12, fill: '#111' }), car);
      const label = h('b', { class: 'pk-uber-h' });
      const DUR = 12000;
      const step = () => {
        const t = Math.min(1, (Date.now() - st.started) / DUR);
        const len = route.getTotalLength?.() || 0;
        if (len) {
          const p1 = route.getPointAtLength(len * t), p2 = route.getPointAtLength(Math.min(len, len * t + 1));
          const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
          car.setAttribute('transform', `translate(${p1.x} ${p1.y}) rotate(${t < 1 ? ang : 0})`);
        }
        label.textContent = t >= 1 ? `you've arrived at ${st.to}` : `heading to ${st.to} · ${Math.ceil((1 - t) * 12)} min`;
        if (t >= 1) { c.go({ page: 'rate', rating: 5 }, null); return; }
        c.timers.push(requestAnimationFrame(step));
      };
      c.timers.push(requestAnimationFrame(step));
      return h('div', { class: 'pk-fill' }, h('div', { class: 'pk-uber-mapbox' }, map.svg, top),
        h('div', { class: 'pk-uber-sheet' }, label,
          h('div', { class: 'pk-uber-driver' }, face(st.driver, 'md'), h('div', {}, h('b', {}, who(st.driver).name), h('span', {}, `${(4.7 + (hashStr(who(st.driver).name) % 3) / 10).toFixed(1)} ★ · ${RIDES[st.ride][0]}`)),
            h('span', { class: 'pk-uber-plate' }, (hashStr(st.to).toString(36).toUpperCase() + 'XK7').slice(0, 7)))));
    }
    // rate
    return h('div', { class: 'pk-fill pk-uber-rate' },
      face(st.driver, 'lg'),
      h('b', {}, `how was your ride with ${who(st.driver).name}?`),
      h('div', { class: 'pk-uber-stars' }, [1, 2, 3, 4, 5].map(n => btn(n <= st.rating ? 'on' : '', '★', () => c.go({ rating: n }, null)))),
      btn('pk-uber-cta', 'done', () => {
        if (mine) { ub.rides.push({ id: 'r_' + uid(), to: st.to, type: RIDES[st.ride][0], price: Math.round(base * RIDES[st.ride][1] * 100) / 100, driver: freshRef(st.driver), rating: st.rating, at: Date.now() }); save(); }
        c.st = { page: 'home' }; c.draw('pop');
      }));
  });

  // ============================================================ gmail
  const gm = d.gmail;
  const avatar = ref => { const w = who(ref); return w.char ? portrait(w.char, 'sm pk-gm-av') : h('span', { class: 'pk-gm-av letter', style: { background: `hsl(${hashStr(w.name) % 360} 55% 50%)` } }, (w.name[0] || '?').toUpperCase()); };
  app('gmail', 'gm', c => {
    const st = c.st;
    if (c.params.open && !st.started) { st.started = true; st.open = c.params.open; }
    st.tab ||= 'primary';
    if (st.open) {
      const m = gm.mails.find(x => x.id === st.open);
      if (!m) { st.open = null; requestAnimationFrame(() => c.draw()); return h('div'); }
      if (!m.read && mine) { m.read = true; save(); }
      return h('div', { class: 'pk-fill pk-gm-read' },
        h('div', { class: 'pk-gm-bar' }, btn('pk-gm-ib', backIco(), () => c.go({ open: null }, 'pop')), h('span', { class: 'pk-flex' }),
          mine ? btn('pk-gm-ib', '🗑', async () => { if (!(await confirmDialog('delete this email?', { danger: true, okLabel: 'delete' }))) return; gm.mails = gm.mails.filter(x => x !== m); save(); c.go({ open: null }, 'pop'); }, { title: 'delete' }) : null),
        h('div', { class: 'ph-scroll pk-gm-body' },
          h('div', { class: 'pk-gm-subject' }, h('h3', {}, m.subject || '(no subject)'), h('span', { class: 'pk-gm-label' }, m.sent ? 'sent' : m.tab === 'primary' ? 'inbox' : m.tab),
            btn('pk-gm-star' + (m.starred ? ' on' : ''), starIco(m.starred), () => { if (!mine) return; m.starred = !m.starred; save(); c.draw(); })),
          h('div', { class: 'pk-gm-from' }, avatar(m.sent ? me() : m.from), h('div', {}, h('b', {}, m.sent ? nameOf(char) : who(m.from).name), h('span', {}, m.sent ? 'to ' + who(m.to).name : 'to me')), h('span', { class: 'pk-sub' }, shortDate(m.at))),
          h('div', { class: 'pk-gm-text' }, m.body)),
        mine && !m.sent ? h('div', { class: 'pk-gm-replybar' }, btn('pk-gm-reply', 'reply', () => compose({ to: m.from, subject: 're: ' + (m.subject || '') }))) : null);
    }
    const list = gm.mails.filter(m => (st.tab === 'starred' ? m.starred : st.tab === 'sent' ? m.sent : !m.sent && m.tab === st.tab)).sort((a, b) => b.at - a.at);
    const unreadIn = t => gm.mails.filter(m => !m.sent && !m.read && m.tab === t).length;
    function compose(pre = {}) {
      let to = pre.to || null;
      const toBtn = h('button', { type: 'button', class: 'btn ghost sm' }, to ? who(to).name : 'pick');
      toBtn.onclick = async () => { const r = await pickWho({ title: 'to', not: char.id }); if (r) { to = r; toBtn.textContent = r.name; } };
      const subj = h('input', { type: 'text', placeholder: 'subject', value: pre.subject || '', maxLength: 120 });
      const body = h('textarea', { rows: 7, placeholder: 'compose email', maxLength: 5000, 'data-autofocus': '' });
      openModal({
        title: 'compose', body: h('div', { class: 'pk-form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'to'), toBtn), subj, body),
        actions: [{ label: 'send', kind: 'primary', onClick: close => { if (!to) { toBtn.click(); return; } gm.mails.push({ id: 'e_' + uid(), sent: true, to: freshRef(to), from: me(), subject: subj.value.trim(), body: body.value, at: Date.now(), read: true, starred: false, tab: 'primary' }); save(); close(); c.go({ tab: 'sent' }, null); } }],
      });
    }
    function receive() {
      let from = null;
      const fromBtn = h('button', { type: 'button', class: 'btn ghost sm' }, 'pick');
      fromBtn.onclick = async () => { const r = await pickWho({ title: 'from', not: char.id }); if (r) { from = r; fromBtn.textContent = r.name; } };
      const subj = h('input', { type: 'text', placeholder: 'subject', maxLength: 120 });
      const tab = h('select', {}, [['primary', 'primary'], ['promotions', 'promotions'], ['social', 'social']].map(([v, l]) => h('option', { value: v, selected: v === (st.tab === 'starred' || st.tab === 'sent' ? 'primary' : st.tab) }, l)));
      const body = h('textarea', { rows: 6, placeholder: 'email', maxLength: 5000 });
      openModal({
        title: 'new email', body: h('div', { class: 'pk-form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'from'), fromBtn), subj, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'tab'), tab), body),
        actions: [{ label: 'add', kind: 'primary', onClick: close => { if (!from) { fromBtn.click(); return; } gm.mails.push({ id: 'e_' + uid(), from: freshRef(from), subject: subj.value.trim(), body: body.value, at: Date.now(), read: false, starred: false, tab: tab.value }); save(); close(); c.go({ tab: tab.value }, null); } }],
      });
    }
    return h('div', { class: 'pk-fill pk-gm-inbox' },
      h('div', { class: 'pk-gm-searchrow' }, btn('pk-gm-ib', backIco(), home), h('div', { class: 'pk-gm-search' }, h('span', {}, 'search in mail')), h('span', { class: 'pk-gm-mewrap', 'data-acct-switch': true }, portrait(char, 'xs pk-gm-me'))),
      h('div', { class: 'pk-gm-tabs' }, [['primary', 'primary'], ['promotions', 'promotions'], ['social', 'social'], ['starred', 'starred'], ['sent', 'sent']].map(([k, l]) =>
        btn(st.tab === k ? 'on' : '', [l, unreadIn(k) ? h('b', {}, unreadIn(k)) : null], () => c.go({ tab: k }, null)))),
      h('div', { class: 'ph-scroll pk-gm-list' },
        mine && st.tab !== 'sent' ? btn('pk-gm-newin', '+ new email', receive) : null,
        list.length ? list.map(m => h('div', { class: 'pk-gm-row' + (m.read ? '' : ' unread'), onclick: e => { if (!e.target.closest('.pk-gm-star')) c.go({ open: m.id }) } },
          avatar(m.sent ? m.to : m.from),
          h('div', { class: 'pk-gm-main' },
            h('div', { class: 'pk-gm-top' }, h('b', {}, m.sent ? 'to: ' + who(m.to).name : who(m.from).name), h('span', {}, shortDate(m.at))),
            h('div', { class: 'pk-gm-subj' }, m.subject || '(no subject)'),
            h('div', { class: 'pk-gm-snip' }, (m.body || '').replace(/\s+/g, ' ').slice(0, 90))),
          btn('pk-gm-star' + (m.starred ? ' on' : ''), starIco(m.starred), () => { if (!mine) return; m.starred = !m.starred; save(); c.draw(); }))) : h('div', { class: 'pk-empty pk-gm-empty' }, sticker('1f4ed', 'pk-empty-stk'))),
      mine ? h('button', { type: 'button', class: 'pk-gm-compose', onclick: () => compose() }, editIco(), 'compose') : null);
  });

  // ============================================================ google
  const glogo = () => h('span', { class: 'pk-g-logo' }, ['G', 'o', 'o', 'g', 'l', 'e'].map((l, i) => h('i', { class: 'g' + i }, l)));
  app('google', 'g', c => {
    const searches = d.browser?.searches || [];
    const go = q => {
      q = q.trim().replace(/\s+/g, ' ');
      if (!q) return;
      if (mine && d.browser) {
        d.browser.searches.push({ id: 'q_' + uid(), q, at: Date.now() });
        if (d.browser.searches.length > 300) d.browser.searches.splice(0, d.browser.searches.length - 300);
        save();
      }
      if (SCREENS.browser) api.show('browser', { q }); else toast(q);
    };
    const input = h('input', { type: 'text', placeholder: 'search', maxLength: 120, enterKeyHint: 'search', readOnly: !mine, onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(input.value); } } });
    const recent = [...new Map([...searches].reverse().map(x => [x.q.toLowerCase(), x])).values()].slice(0, 7);
    return h('div', { class: 'pk-fill pk-g-page' },
      h('div', { class: 'pk-g-top' }, btn('pk-g-back', backIco(), home), h('span', { class: 'pk-flex' }), portrait(char, 'xs')),
      h('div', { class: 'ph-scroll pk-g-body' },
        glogo(),
        h('label', { class: 'pk-g-box' }, searchIco(), input, h('i', { class: 'pk-g-mic' })),
        recent.length ? h('div', { class: 'pk-g-recent' }, recent.map(x => h('button', { type: 'button', class: 'pk-g-rec', onclick: () => go(x.q) }, h('i', { class: 'pk-g-clock' }), h('span', {}, x.q), h('em', {}, '↖')))) : null,
        h('div', { class: 'pk-g-chips' }, ['weather', 'news', 'translate', 'images'].map(t => btn('pk-g-chip', t, () => mine && go(t))))));
  });

  // ============================================================ chatgpt
  const gpt = d.gpt;
  const gptLogo = () => s('svg', { viewBox: '0 0 24 24', class: 'pk-gpt-mark' }, [0, 60, 120, 180, 240, 300].map(a => s('ellipse', { cx: 12, cy: 7.2, rx: 3.2, ry: 5.2, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, transform: `rotate(${a} 12 12)` })));
  app('chatgpt', 'gpt', c => {
    const st = c.st;
    st.as ||= 'user';
    let chat = gpt.chats.find(x => x.id === st.chat);
    const list = h('div', { class: 'ph-scroll pk-gpt-list' });
    const input = h('textarea', { class: 'pk-gpt-input', rows: 1, maxLength: 4000, placeholder: st.as === 'user' ? 'message chatgpt' : 'chatgpt says', oninput: () => { input.style.height = 'auto'; input.style.height = Math.min(110, input.scrollHeight) + 'px'; }, onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } } });
    function send() {
      const text = input.value.trim();
      if (!text || !mine) return;
      if (!chat) { chat = { id: 'c_' + uid(), title: '', msgs: [], at: Date.now() }; gpt.chats.push(chat); st.chat = chat.id; }
      chat.msgs.push({ role: st.as, text, at: Date.now() });
      if (!chat.title && st.as === 'user') chat.title = text.slice(0, 40);
      chat.at = Date.now();
      // flip to the other side so a back-and-forth is quick to write
      st.as = st.as === 'user' ? 'ai' : 'user';
      save();
      c.draw();
      requestAnimationFrame(() => c.root.querySelector('.pk-gpt-input')?.focus());
    }
    function drawList() {
      fill(list, chat && chat.msgs.length ? chat.msgs.map((m, i) => m.role === 'user'
        ? h('div', { class: 'pk-gpt-u' }, h('div', {}, m.text))
        : h('div', { class: 'pk-gpt-a' + (i === chat.msgs.length - 1 && Date.now() - m.at < 1500 ? ' typing' : '') }, h('span', { class: 'pk-gpt-dot' }, gptLogo()), h('div', {}, m.text))) :
        h('div', { class: 'pk-gpt-hello' }, h('b', {}, 'what can i help with?'),
          h('div', { class: 'pk-gpt-sugs' }, ['make a playlist', 'write a song', 'outfit ideas', 'help with homework'].map(t => btn('pk-gpt-sug', t, () => { if (!mine) return; input.value = t; send(); })))));
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }
    drawList();
    const side = st.side ? h('div', { class: 'pk-gpt-side' },
      h('div', { class: 'pk-gpt-side-in' },
        btn('pk-gpt-new', [editIco(), 'new chat'], () => c.go({ chat: null, side: false }, null)),
        h('span', { class: 'pk-gpt-side-h' }, 'chats'),
        h('div', { class: 'ph-scroll' }, [...gpt.chats].sort((a, b) => b.at - a.at).map(ch => h('div', { class: 'pk-gpt-chat' + (ch.id === st.chat ? ' on' : '') },
          h('button', { type: 'button', onclick: () => c.go({ chat: ch.id, side: false }, null) }, ch.title || 'new chat'),
          mine ? btn('pk-gpt-del', '✕', async () => { if (!(await confirmDialog('delete this chat?', { danger: true, okLabel: 'delete' }))) return; gpt.chats = gpt.chats.filter(x => x !== ch); if (st.chat === ch.id) st.chat = null; save(); c.draw(); }, { title: 'delete' }) : null))),
        h('div', { class: 'pk-gpt-who' }, portrait(char, 'xs'), h('b', {}, nameOf(char)))),
      h('div', { class: 'pk-gpt-scrim', onclick: () => c.go({ side: false }, null) })) : null;
    return h('div', { class: 'pk-fill pk-gpt-page' },
      h('div', { class: 'pk-gpt-top' }, btn('pk-gpt-ib', backIco(), home, { title: 'home' }), btn('pk-gpt-ib', menuIco(), () => c.go({ side: true }, null), { title: 'chats' }), h('b', {}, 'chatgpt'), btn('pk-gpt-ib', editIco(), () => c.go({ chat: null }, null), { title: 'new chat' })),
      list,
      mine ? h('div', { class: 'pk-gpt-composer' },
        h('button', { type: 'button', class: 'pk-gpt-as ' + st.as, title: 'switch who is typing', onclick: () => { st.as = st.as === 'user' ? 'ai' : 'user'; input.placeholder = st.as === 'user' ? 'message chatgpt' : 'chatgpt says'; asBtnFill(); } }),
        input, btn('pk-gpt-send', '↑', send, { title: 'send' })) : null,
      side);
    function asBtnFill() { const b = c.root.querySelector('.pk-gpt-as'); if (!b) return; b.className = 'pk-gpt-as ' + st.as; fill(b, st.as === 'user' ? portrait(char, 'xs') : gptLogo()); }
  });
  // fill the "as" button after each draw
  const gptScreen = SCREENS.chatgpt;
  SCREENS.chatgpt = (p, v) => {
    const root = gptScreen(p, v);
    const fix = () => { const b = root.querySelector('.pk-gpt-as'); if (b && !b.firstChild) fill(b, b.classList.contains('user') ? portrait(char, 'xs') : gptLogo()); };
    new MutationObserver(fix).observe(root, { childList: true });
    fix();
    return root;
  };

  // ============================================================ minecraft
  const mc = d.mc;
  const BLOCKS = ['air', 'grass', 'dirt', 'stone', 'log', 'leaves', 'planks', 'glass', 'wool'];
  const SPLASH = ['also try stardew!', 'now with bats!', 'scene edition!', '100% emo!', 'creepers are shy!', 'pink wool!', 'rawr means hi!', 'goth biome!'];
  function genWorld(seed) {
    const r = rng(hashStr(String(seed)));
    const W = 10, H = 12, g = Array(W * H).fill(0);
    let hgt = 6;
    for (let x = 0; x < W; x++) {
      hgt = Math.max(4, Math.min(8, hgt + Math.round(r() * 2 - 1)));
      for (let y = 0; y < H; y++) g[y * W + x] = y < hgt ? 0 : y === hgt ? 1 : y < hgt + 3 ? 2 : 3;
      if (x > 0 && x < W - 1 && r() < .22 && hgt > 4) {
        for (let k = 1; k <= 3; k++) g[(hgt - k) * W + x] = 4;
        for (const [dx, dy] of [[-1, -3], [0, -4], [1, -3], [-1, -4], [1, -4], [0, -5]]) { const yy = hgt + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && xx < W && !g[yy * W + xx]) g[yy * W + xx] = 5; }
      }
    }
    return g;
  }
  app('minecraft', 'mc', c => {
    const st = c.st;
    st.page ||= 'menu';
    if (st.page === 'play') {
      const w = mc.worlds.find(x => x.id === st.world);
      if (!w) { st.page = 'worlds'; requestAnimationFrame(() => c.draw()); return h('div'); }
      w.edits ||= {};
      st.hold ??= 0;
      const g = genWorld(w.seed);
      for (const [i, b] of Object.entries(w.edits)) g[i] = b;
      const grid = h('div', { class: 'pk-mc-world' + (w.mode === 'creative' ? '' : ' survival') }, g.map((b, i) => h('button', {
        type: 'button', class: 'pk-mc-b b-' + BLOCKS[b], onclick: () => {
          const now = g[i];
          if (st.hold === 0) { if (!now) return; g[i] = 0; } else { if (now) return; g[i] = st.hold; }
          if (mine) { w.edits[i] = g[i]; save(); }
          grid.children[i].className = 'pk-mc-b b-' + BLOCKS[g[i]] + (st.hold === 0 ? ' broke' : ' placed');
        },
      })));
      return h('div', { class: 'pk-fill pk-mc-play' },
        h('div', { class: 'pk-mc-hud' }, btn('pk-mc-btn sm', 'save + quit', () => c.go({ page: 'worlds' }, 'pop')), h('span', {}, w.name)),
        grid,
        h('div', { class: 'pk-mc-hotbar' }, [0, 1, 2, 3, 4, 6, 7, 8].map(b => btn('pk-mc-slot' + (st.hold === b ? ' on' : ''), b === 0 ? h('i', { class: 'pk-mc-pick' }) : h('i', { class: 'pk-mc-b mini b-' + BLOCKS[b] }), () => c.go({ hold: b }, null)))));
    }
    if (st.page === 'worlds') {
      return h('div', { class: 'pk-fill pk-mc-dirt' },
        h('b', { class: 'pk-mc-h' }, 'select world'),
        h('div', { class: 'ph-scroll pk-mc-worlds' }, mc.worlds.length ? [...mc.worlds].reverse().map(w => h('div', { class: 'pk-mc-world-row' + (st.sel === w.id ? ' on' : ''), onclick: () => c.go({ sel: w.id }, null), ondblclick: () => c.go({ page: 'play', world: w.id }) },
          h('i', { class: 'pk-mc-wthumb', style: { '--h': hashStr(String(w.seed)) % 60 + 90 } }),
          h('div', {}, h('b', {}, w.name), h('span', {}, `${w.mode} · seed ${w.seed}`), h('span', {}, dayLabel(w.at))))) : h('div', { class: 'pk-mc-none' }, '—')),
        h('div', { class: 'pk-mc-foot' },
          btn('pk-mc-btn', 'play selected world', () => st.sel && c.go({ page: 'play', world: st.sel }), { disabled: !st.sel }),
          mine ? btn('pk-mc-btn', 'create new world', () => form('create new world', [{ key: 'name', label: 'world name', value: 'new world', req: true, max: 30 }, { key: 'mode', label: 'game mode', type: 'select', value: 'survival', options: [['survival', 'survival'], ['creative', 'creative'], ['hardcore', 'hardcore']] }, { key: 'seed', label: 'seed', ph: 'random' }],
            v => { const w = { id: 'w_' + uid(), name: v.name, mode: v.mode, seed: v.seed || String(Math.floor(Math.random() * 1e9)), at: Date.now(), edits: {} }; mc.worlds.push(w); save(); c.go({ sel: w.id }, null); }, { okLabel: 'create' })) : null,
          mine && st.sel ? btn('pk-mc-btn', 'delete', async () => { if (!(await confirmDialog('delete this world forever?', { danger: true, okLabel: 'delete' }))) return; mc.worlds = mc.worlds.filter(x => x.id !== st.sel); st.sel = null; save(); c.draw(); }) : null,
          btn('pk-mc-btn', 'cancel', () => c.go({ page: 'menu' }, 'pop'))));
    }
    const splash = SPLASH[hashStr(dayKey() + char.id) % SPLASH.length];
    return h('div', { class: 'pk-fill pk-mc-menu' },
      h('div', { class: 'pk-mc-pano' }, h('i', { class: 'c1' }), h('i', { class: 'c2' })),
      h('div', { class: 'pk-mc-title' }, h('b', {}, 'MINECRAFT'), h('span', { class: 'pk-mc-ed' }, 'pocket edition'), h('em', { class: 'pk-mc-splash' }, splash)),
      h('div', { class: 'pk-mc-btns' },
        btn('pk-mc-btn', 'singleplayer', () => c.go({ page: 'worlds' })),
        btn('pk-mc-btn', 'multiplayer', () => toast('no servers found')),
        btn('pk-mc-btn', 'quit game', home)),
      h('span', { class: 'pk-mc-ver' }, 'minecraft 1.21'));
  });

  // ============================================================ candy crush
  const cc = d.candy;
  const KINDS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  app('candycrush', 'cc', c => {
    const st = c.st;
    if (st.page === 'play') return candyGame(c);
    const cur = cc.level;
    const nodes = Array.from({ length: 12 }, (_, i) => Math.max(1, cur - 4) + i).reverse();
    return h('div', { class: 'pk-fill pk-cc-map' },
      h('div', { class: 'pk-cc-top' }, btn('pk-cc-back', backIco(), home), h('span', { class: 'pk-cc-logo' }, h('b', {}, 'candy'), h('b', {}, 'crush')), h('span', { class: 'pk-cc-best' }, 'best ', cc.best.toLocaleString())),
      h('div', { class: 'ph-scroll pk-cc-path' }, nodes.map((n, i) => {
        const state = n < cur ? 'done' : n === cur ? 'cur' : 'locked';
        return h('div', { class: 'pk-cc-node-wrap', style: { transform: `translateX(${Math.round(Math.sin(n * 1.1) * 70)}px)` } },
          h('button', { type: 'button', class: 'pk-cc-node ' + state, disabled: state === 'locked', onclick: () => c.go({ page: 'play', lvl: n }) }, n,
            state === 'done' ? h('span', { class: 'pk-cc-stars' }, '★'.repeat(cc.stars[n] || 1)) : null),
          state === 'cur' ? face({ id: char.id }, 'xs pk-cc-me') : null);
      })));
  });
  function candyGame(c) {
    const st = c.st;
    const COLS = 6, ROWS = 7;
    const target = 800 + st.lvl * 300;
    const g = { cells: [], score: 0, moves: 18, busy: false, sel: null };
    let nextId = 1;
    const r = Math.random;
    const mk = () => ({ id: nextId++, k: Math.floor(r() * 5) });
    for (let i = 0; i < COLS * ROWS; i++) {
      let cell;
      do { cell = mk(); } while ((i % COLS >= 2 && g.cells[i - 1].k === cell.k && g.cells[i - 2].k === cell.k) || (i >= COLS * 2 && g.cells[i - COLS].k === cell.k && g.cells[i - COLS * 2].k === cell.k));
      g.cells.push(cell);
    }
    const board = h('div', { class: 'pk-cc-board', style: { '--cols': COLS, '--rows': ROWS } });
    const els = new Map();
    const scoreEl = h('b'), movesEl = h('b'), bar = h('i');
    const pos = (el, i) => { el.style.setProperty('--x', i % COLS); el.style.setProperty('--y', Math.floor(i / COLS)); };
    function sync() {
      const live = new Set();
      g.cells.forEach((cell, i) => {
        live.add(cell.id);
        let el = els.get(cell.id);
        if (!el) {
          el = h('div', { class: 'pk-cc-candy k-' + KINDS[cell.k] }, h('i'));
          el.style.setProperty('--x', i % COLS); el.style.setProperty('--y', -1 - Math.floor((COLS * ROWS - 1 - i) / COLS) % 3);
          board.append(el);
          els.set(cell.id, el);
          void el.offsetWidth;
        }
        pos(el, i);
        el.classList.toggle('sel', g.sel === i);
      });
      for (const [id, el] of els) if (!live.has(id)) { el.classList.add('pop'); els.delete(id); setTimeout(() => el.remove(), 260); }
      scoreEl.textContent = g.score.toLocaleString();
      movesEl.textContent = g.moves;
      bar.style.height = Math.min(100, g.score / target * 100) + '%';
    }
    function matches() {
      const hit = new Set();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS - 2; x++) { const i = y * COLS + x, k = g.cells[i].k; if (g.cells[i + 1].k === k && g.cells[i + 2].k === k) { hit.add(i); hit.add(i + 1); hit.add(i + 2); } }
      for (let y = 0; y < ROWS - 2; y++) for (let x = 0; x < COLS; x++) { const i = y * COLS + x, k = g.cells[i].k; if (g.cells[i + COLS].k === k && g.cells[i + COLS * 2].k === k) { hit.add(i); hit.add(i + COLS); hit.add(i + COLS * 2); } }
      return hit;
    }
    async function resolve() {
      let combo = 1, hit = matches();
      while (hit.size) {
        g.score += hit.size * 60 * combo;
        if (combo > 1) floatText(['sweet!', 'tasty!', 'delicious!', 'divine!'][Math.min(3, combo - 2)]);
        // gravity: per column, keep survivors at the bottom, new candies on top
        for (let x = 0; x < COLS; x++) {
          const keep = [];
          for (let y = ROWS - 1; y >= 0; y--) { const i = y * COLS + x; if (!hit.has(i)) keep.push(g.cells[i]); }
          for (let y = ROWS - 1, k = 0; y >= 0; y--, k++) g.cells[y * COLS + x] = keep[k] || mk();
        }
        sync();
        await sleep(330);
        combo++;
        hit = matches();
      }
    }
    function floatText(t) { const el = h('div', { class: 'pk-cc-float' }, t); board.append(el); setTimeout(() => el.remove(), 1100); }
    async function trySwap(a, b) {
      if (g.busy || g.moves <= 0) return;
      const ax = a % COLS, bx = b % COLS;
      if (b < 0 || b >= COLS * ROWS || (Math.abs(a - b) === 1 && Math.floor(a / COLS) !== Math.floor(b / COLS)) || ![1, COLS].includes(Math.abs(a - b))) return;
      if (Math.abs(ax - bx) > 1) return;
      g.busy = true; g.sel = null;
      [g.cells[a], g.cells[b]] = [g.cells[b], g.cells[a]];
      sync();
      await sleep(200);
      if (!matches().size) {
        [g.cells[a], g.cells[b]] = [g.cells[b], g.cells[a]];
        sync();
        await sleep(200);
      } else {
        g.moves--;
        await resolve();
      }
      g.busy = false;
      sync();
      if (g.score >= target || g.moves <= 0) end();
    }
    function end() {
      const won = g.score >= target;
      const stars = won ? (g.score >= target * 1.6 ? 3 : g.score >= target * 1.25 ? 2 : 1) : 0;
      if (mine) {
        cc.best = Math.max(cc.best, g.score);
        if (won) { cc.stars[st.lvl] = Math.max(cc.stars[st.lvl] || 0, stars); if (st.lvl === cc.level) cc.level++; }
        save();
      }
      const box = h('div', { class: 'pk-cc-end' },
        h('div', { class: 'pk-cc-end-card' },
          h('b', { class: 'pk-cc-end-h' }, won ? 'level complete' : 'out of moves'),
          won ? h('div', { class: 'pk-cc-end-stars' }, [1, 2, 3].map(n => h('i', { class: n <= stars ? 'on' : '' }, '★'))) : null,
          h('span', {}, g.score.toLocaleString()),
          btn('pk-cc-btn', won ? 'next' : 'try again', () => c.go(won ? { page: 'play', lvl: st.lvl + 1 } : { page: 'play' }, null)),
          btn('pk-cc-btn ghost', 'map', () => c.go({ page: 'map' }, 'pop'))));
      board.parentElement?.append(box);
    }
    // tap one then a neighbor, or drag a candy toward a neighbor
    let down = null;
    board.addEventListener('pointerdown', e => {
      const rect = board.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (rect.width / COLS)), y = Math.floor((e.clientY - rect.top) / (rect.height / ROWS));
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      e.preventDefault();
      down = { i: y * COLS + x, x: e.clientX, y: e.clientY, moved: false };
      board.setPointerCapture(e.pointerId);
    });
    board.addEventListener('pointermove', e => {
      if (!down || down.moved) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
      down.moved = true;
      const i = down.i, j = Math.abs(dx) > Math.abs(dy) ? i + Math.sign(dx) : i + Math.sign(dy) * COLS;
      if (Math.abs(dx) > Math.abs(dy) && Math.floor(j / COLS) !== Math.floor(i / COLS)) return;
      trySwap(i, j);
    });
    board.addEventListener('pointerup', () => {
      if (!down) return;
      const i = down.i, moved = down.moved;
      down = null;
      if (moved || g.busy) return;
      if (g.sel == null) g.sel = i;
      else if (g.sel === i) g.sel = null;
      else { const a = g.sel; if ([1, COLS].includes(Math.abs(a - i))) trySwap(a, i); else g.sel = i; }
      sync();
    });
    requestAnimationFrame(sync);
    return h('div', { class: 'pk-fill pk-cc-game' },
      h('div', { class: 'pk-cc-hud' },
        btn('pk-cc-back', backIco(), () => c.go({ page: 'map' }, 'pop')),
        h('div', { class: 'pk-cc-moves' }, h('span', {}, 'moves'), movesEl),
        h('div', { class: 'pk-cc-level' }, h('span', {}, 'level ' + st.lvl), h('em', {}, 'target ' + target.toLocaleString())),
        h('div', { class: 'pk-cc-score' }, h('span', {}, 'score'), scoreEl)),
      h('div', { class: 'pk-cc-boardwrap' }, h('div', { class: 'pk-cc-meter' }, bar), board));
  }

  // ============================================================ venmo
  const vm = d.venmo;
  app('venmo', 'vm', c => {
    const st = c.st;
    st.tab ||= 'feed';
    const pay = kind => {
      let to = null;
      const toBtn = h('button', { type: 'button', class: 'btn ghost sm' }, 'pick');
      toBtn.onclick = async () => { const r = await pickWho({ title: kind === 'pay' ? 'pay' : 'request', not: char.id }); if (r) { to = r; toBtn.textContent = r.name; } };
      const amt = h('input', { type: 'number', min: 0, step: '0.01', placeholder: '0', 'data-autofocus': '' });
      const note = h('input', { type: 'text', placeholder: "what's it for?", maxLength: 80 });
      openModal({
        title: kind, body: h('div', { class: 'pk-form pk-vm-form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, kind === 'pay' ? 'to' : 'from'), toBtn), h('div', { class: 'pk-vm-amt' }, h('span', {}, '$'), amt), note),
        actions: [{
          label: kind, kind: 'primary', onClick: close => {
            const n = Math.round((Number(amt.value) || 0) * 100) / 100;
            if (!to) { toBtn.click(); return; }
            if (!n) { amt.focus(); return; }
            if (kind === 'pay') vm.balance = Math.round((vm.balance - n) * 100) / 100;
            vm.feed.push({ id: 'v_' + uid(), from: kind === 'pay' ? me() : freshRef(to), to: kind === 'pay' ? freshRef(to) : me(), amount: n, note: note.value.trim(), kind, at: Date.now() });
            save(); close(); c.draw();
          },
        }],
      });
    };
    const addOther = () => {
      let a = null, b = null;
      const aBtn = h('button', { type: 'button', class: 'btn ghost sm' }, 'pick'), bBtn = h('button', { type: 'button', class: 'btn ghost sm' }, 'pick');
      aBtn.onclick = async () => { const r = await pickWho({ title: 'who paid' }); if (r) { a = r; aBtn.textContent = r.name; } };
      bBtn.onclick = async () => { const r = await pickWho({ title: 'who got paid' }); if (r) { b = r; bBtn.textContent = r.name; } };
      const amt = h('input', { type: 'number', min: 0, step: '0.01', placeholder: '0' });
      const note = h('input', { type: 'text', placeholder: 'note', maxLength: 80, 'data-autofocus': '' });
      openModal({
        title: 'add to the feed', body: h('div', { class: 'pk-form pk-vm-form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'paid'), aBtn), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'to'), bBtn), note, h('div', { class: 'pk-vm-amt' }, h('span', {}, '$'), amt)),
        actions: [{
          label: 'add', kind: 'primary', onClick: close => {
            if (!a) { aBtn.click(); return; } if (!b) { bBtn.click(); return; }
            const n = Math.round((Number(amt.value) || 0) * 100) / 100;
            if (b.id === char.id) vm.balance = Math.round((vm.balance + n) * 100) / 100;
            if (a.id === char.id) vm.balance = Math.round((vm.balance - n) * 100) / 100;
            vm.feed.push({ id: 'v_' + uid(), from: freshRef(a), to: freshRef(b), amount: n, note: note.value.trim(), kind: 'pay', at: Date.now() });
            save(); close(); c.draw();
          },
        }],
      });
    };
    const list = [...vm.feed].reverse().filter(x => st.tab === 'feed' || x.from.id === char.id || x.to.id === char.id);
    return h('div', { class: 'pk-fill pk-vm-page' },
      h('div', { class: 'pk-vm-top' }, btn('pk-vm-back', backIco(), home), h('span', { class: 'pk-vm-logo' }, 'venmo'), mine ? btn('pk-vm-plus', '+', addOther, { title: 'add to the feed' }) : h('span')),
      h('div', { class: 'pk-vm-bal' }, h('span', {}, 'venmo balance'), h('button', {
        type: 'button', class: 'pk-vm-balnum', onclick: () => mine && form('balance', [{ key: 'b', label: 'balance', type: 'number', value: vm.balance }], v => { vm.balance = Math.round(v.b * 100) / 100; save(); c.draw(); }),
      }, money(vm.balance))),
      h('div', { class: 'pk-vm-tabs' }, [['feed', 'friends'], ['mine', 'mine']].map(([k, l]) => btn(st.tab === k ? 'on' : '', l, () => c.go({ tab: k }, null)))),
      h('div', { class: 'ph-scroll pk-vm-feed' }, list.length ? list.map(x => h('div', { class: 'pk-vm-row' },
        face(x.from, 'sm'),
        h('div', { class: 'pk-vm-main' },
          h('div', {}, h('b', {}, who(x.from).name), x.kind === 'request' ? ' charged ' : ' paid ', h('b', {}, who(x.to).name)),
          h('span', { class: 'pk-sub' }, agoText(x.at)),
          x.note ? h('div', { class: 'pk-vm-note' }, x.note) : null),
        x.from.id === char.id || x.to.id === char.id ? h('em', { class: 'pk-vm-amt-tag ' + (x.to.id === char.id ? 'plus' : 'minus') }, (x.to.id === char.id ? '+ ' : '- ') + money(x.amount)) : null,
        mine ? btn('pk-x', '✕', () => { vm.feed = vm.feed.filter(y => y !== x); save(); c.draw(); }, { title: 'remove' }) : null)) : h('div', { class: 'pk-empty' }, sticker('1f4b8', 'pk-empty-stk'))),
      mine ? h('div', { class: 'pk-vm-paybar' }, btn('pk-vm-pay', 'pay', () => pay('pay')), btn('pk-vm-pay', 'request', () => pay('request'))) : null);
  });

  // ============================================================ starbucks
  const sb = d.sbux;
  const DRINKS = [
    ['iced caramel macchiato', 5.45, '1f9cb'], ['pink drink', 4.95, '1f964'], ['java chip frappuccino', 5.75, '1f964'], ['vanilla sweet cream cold brew', 4.75, '1f9cb'],
    ['caramel latte', 4.95, '2615'], ['matcha latte', 5.25, '1f375'], ['dragon drink', 4.95, '1f964'], ['white mocha', 5.35, '2615'],
  ];
  const SIZES = [['tall', 0], ['grande', .6], ['venti', 1.1], ['trenta', 1.5]];
  const MILKS = ['2%', 'whole', 'oat', 'almond', 'coconut', 'soy', 'nonfat'];
  const SYRUPS = ['vanilla', 'caramel', 'brown sugar', 'hazelnut', 'peppermint', 'raspberry', 'toffee nut'];
  const TOPS = ['vanilla sweet cream cold foam', 'caramel drizzle', 'whipped cream', 'cinnamon dolce', 'java chips', 'strawberry purée'];
  function misspell(name) {
    const n = name.toLowerCase().split(' ')[0] || 'friend';
    const k = hashStr(n) % 5;
    let out = n;
    if (k === 0) out = n.replace(/y/g, 'ie').replace(/i(?!e)/, 'y');
    else if (k === 1) out = n.replace(/([bcdfglmnprst])/, '$1$1');
    else if (k === 2) out = n.replace(/a/, 'u').replace(/e/, 'a');
    else if (k === 3) out = n.replace(/c/g, 'k').replace(/ph/g, 'f').replace(/v/, 'b') + (n.endsWith('a') ? 'h' : '');
    else out = n.slice(0, 1) + n.slice(2);
    if (out === n || out.length < 2) out = n + 'h';
    return out;
  }
  app('starbucks', 'sb', c => {
    const st = c.st;
    st.page ||= 'home';
    if (st.page === 'custom') {
      const [dname, base, code] = DRINKS[st.drink];
      const o = st.o;
      const price = base + SIZES.find(x => x[0] === o.size)[1] + (o.milk !== '2%' && o.milk !== 'whole' && o.milk !== 'nonfat' ? .7 : 0) + Object.values(o.syrups).filter(Boolean).length * .6 + o.tops.length * .5;
      const chip = (on, label, fn) => btn('pk-sb-chip' + (on ? ' on' : ''), label, fn);
      return h('div', { class: 'pk-fill pk-sb-custom' },
        h('div', { class: 'pk-sb-hero' }, btn('pk-sb-back light', backIco(), () => c.go({ page: 'home' }, 'pop')), sticker(code, 'pk-sb-hero-stk'), h('b', {}, dname), h('span', {}, `${money(price)} · ${Math.round(price * 40)} cal`)),
        h('div', { class: 'ph-scroll pk-sb-body' },
          h('b', { class: 'pk-sb-h' }, 'size'),
          h('div', { class: 'pk-sb-sizes' }, SIZES.map(([sz], i) => btn('pk-sb-size' + (o.size === sz ? ' on' : ''), [h('i', { style: { '--s': 0.7 + i * .12 } }), h('span', {}, sz)], () => { o.size = sz; c.draw(); }))),
          h('b', { class: 'pk-sb-h' }, 'milk'),
          h('div', { class: 'pk-sb-chips' }, MILKS.map(m => chip(o.milk === m, m, () => { o.milk = m; c.draw(); }))),
          h('b', { class: 'pk-sb-h' }, 'syrups'),
          h('div', { class: 'pk-sb-syrups' }, SYRUPS.map(sy => h('div', { class: 'pk-sb-syrup' }, h('span', {}, sy),
            h('div', { class: 'pk-sb-pumps' }, btn('', '−', () => { o.syrups[sy] = Math.max(0, (o.syrups[sy] || 0) - 1); c.draw(); }), h('b', {}, o.syrups[sy] || 0), btn('', '+', () => { o.syrups[sy] = Math.min(9, (o.syrups[sy] || 0) + 1); c.draw(); }))))),
          h('b', { class: 'pk-sb-h' }, 'toppings'),
          h('div', { class: 'pk-sb-chips' }, TOPS.map(t => chip(o.tops.includes(t), t, () => { o.tops = o.tops.includes(t) ? o.tops.filter(x => x !== t) : [...o.tops, t]; c.draw(); })))),
        mine ? btn('pk-sb-cta', 'add to order', () => {
          const order = { id: 's_' + uid(), drink: dname, icon: code, size: o.size, milk: o.milk, syrups: Object.entries(o.syrups).filter(([, n]) => n).map(([k, n]) => `${n} pump${n > 1 ? 's' : ''} ${k}`), tops: o.tops, price: Math.round(price * 100) / 100, at: Date.now() };
          sb.orders.push(order);
          sb.stars += Math.round(price * 2);
          save();
          c.go({ page: 'ready', order: order.id });
        }) : null);
    }
    if (st.page === 'ready') {
      const o = sb.orders.find(x => x.id === st.order) || sb.orders.at(-1);
      if (!o) { st.page = 'home'; requestAnimationFrame(() => c.draw()); return h('div'); }
      const name = sb.misspell ? misspell(nameOf(char)) : nameOf(char).toLowerCase().split(' ')[0];
      return h('div', { class: 'pk-fill pk-sb-ready' },
        h('div', { class: 'pk-sb-readytop' }, btn('pk-sb-back light', backIco(), () => c.go({ page: 'home' }, 'pop')), h('b', {}, 'your order is ready')),
        h('div', { class: 'pk-sb-cup' }, h('div', { class: 'pk-sb-lid' }), h('div', { class: 'pk-sb-body-cup' }, h('i', { class: 'pk-sb-siren' }), h('span', { class: 'pk-sb-name' }, name), h('span', { class: 'pk-sb-boxes' }, [o.size, o.milk, ...o.syrups.map(x => x.split(' ').slice(-1)[0])].slice(0, 4).map(t => h('em', {}, t))))),
        h('b', { class: 'pk-sb-ready-name' }, o.drink),
        h('span', { class: 'pk-sb-ready-sub' }, [o.size, o.milk, ...o.syrups, ...o.tops].join(' · ')),
        mine ? h('label', { class: 'pk-sb-miss' }, h('input', { type: 'checkbox', checked: sb.misspell, onchange: e => { sb.misspell = e.target.checked; save(); c.draw(); } }), 'barista spelling') : null);
    }
    const goal = sb.stars < 100 ? 100 : sb.stars < 200 ? 200 : 400;
    return h('div', { class: 'pk-fill pk-sb-home' },
      h('div', { class: 'pk-sb-top' }, btn('pk-sb-back', backIco(), home), h('i', { class: 'pk-sb-siren sm' }), h('b', {}, `hi, ${nameOf(char).split(' ')[0].toLowerCase()}`)),
      h('div', { class: 'ph-scroll pk-sb-body' },
        h('div', { class: 'pk-sb-stars' },
          h('div', {}, h('b', {}, sb.stars), h('i', { class: 'pk-sb-star' }, '★'), h('span', {}, `${Math.max(0, goal - sb.stars)} to ${goal}`)),
          h('div', { class: 'pk-sb-starbar' }, h('i', { style: { width: Math.min(100, sb.stars / goal * 100) + '%' } }))),
        sb.orders.length ? h('button', { type: 'button', class: 'pk-sb-last', onclick: () => c.go({ page: 'ready', order: sb.orders.at(-1).id }) }, sticker(sb.orders.at(-1).icon), h('div', {}, h('span', {}, 'last order'), h('b', {}, sb.orders.at(-1).drink))) : null,
        h('b', { class: 'pk-sb-h' }, 'menu'),
        h('div', { class: 'pk-sb-menu' }, DRINKS.map(([name, price, code], i) => h('button', { type: 'button', class: 'pk-sb-drink', onclick: () => c.go({ page: 'custom', drink: i, o: { size: 'grande', milk: '2%', syrups: {}, tops: [] } }) },
          h('span', { class: 'pk-sb-drink-pic' }, sticker(code)), h('b', {}, name), h('span', {}, money(price)))))));
  });

  // ============================================================ stardew
  const sv = d.sdv;
  const SEASONS = ['spring', 'summer', 'fall', 'winter'];
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const CROPS = {
    parsnip: { s: 'spring', days: 4, seed: 20, sell: 35, icon: '1f955' }, potato: { s: 'spring', days: 6, seed: 50, sell: 80, icon: '1f954' },
    cauliflower: { s: 'spring', days: 12, seed: 80, sell: 175, icon: '1f966' }, strawberry: { s: 'spring', days: 8, seed: 100, sell: 120, icon: '1f353' },
    blueberry: { s: 'summer', days: 13, seed: 80, sell: 150, icon: '1fad0' }, melon: { s: 'summer', days: 12, seed: 80, sell: 250, icon: '1f348' },
    tomato: { s: 'summer', days: 11, seed: 50, sell: 60, icon: '1f345' }, sunflower: { s: 'summer', days: 8, seed: 200, sell: 80, icon: '1f33b' },
    pumpkin: { s: 'fall', days: 13, seed: 100, sell: 320, icon: '1f383' }, eggplant: { s: 'fall', days: 5, seed: 20, sell: 60, icon: '1f346' },
    cranberries: { s: 'fall', days: 7, seed: 240, sell: 150, icon: '1f352' }, grape: { s: 'fall', days: 10, seed: 60, sell: 80, icon: '1f347' },
    'winter seeds': { s: 'winter', days: 7, seed: 30, sell: 70, icon: '1f33f' },
  };
  const VILLAGERS = [
    ['abigail', '#7b52c9'], ['emily', '#3aa0e0'], ['haley', '#f2c14e'], ['leah', '#c8743a'], ['maru', '#8b2f3e'], ['penny', '#e86f3d'],
    ['alex', '#5c3a1e'], ['elliott', '#b04a2a'], ['harvey', '#5a6e3a'], ['sam', '#f2d04e'], ['sebastian', '#2d2a3a'], ['shane', '#3d4a8c'],
    ['krobus', '#3a3a4a'], ['linus', '#8a6a3a'], ['wizard', '#6a3aa0'], ['robin', '#d8572a'],
  ];
  if (!sv.start) { sv.start = midnight(Date.now()); }
  if (!sv.farm) sv.farm = (nameOf(char).split(' ')[0] || 'my') + ' farm';
  while (sv.plots.length < 12) sv.plots.push(null);
  const today = () => Math.max(0, Math.round((midnight(Date.now()) - sv.start) / 864e5)) + (sv.offset || 0);
  const calOf = n => ({ day: (n % 28) + 1, season: SEASONS[Math.floor(n / 28) % 4], year: Math.floor(n / 112) + 1, dow: DAYS[n % 7] });
  const growth = p => p.watered.filter(i => i < today()).length;
  app('stardew', 'sv', c => {
    const st = c.st;
    st.tab ||= 'farm';
    const n = today(), cal = calOf(n);
    // crops from the wrong season wither
    let changed = false;
    sv.plots = sv.plots.map(p => { if (p && CROPS[p.crop].s !== cal.season && growth(p) < CROPS[p.crop].days) { changed = true; return { ...p, dead: true }; } return p; });
    if (changed && mine) save();
    const hud = h('div', { class: 'pk-sv-hud' },
      h('div', { class: 'pk-sv-date' }, h('b', {}, `${cal.dow}. ${cal.day}`), h('span', {}, `${cal.season} · year ${cal.year}`), h('span', { class: 'pk-sv-time', 'data-clock-live': '' }, hm())),
      h('div', { class: 'pk-sv-gold' }, h('i', { class: 'pk-sv-coin' }), String(sv.gold).padStart(5, ' ')));
    const top = h('div', { class: 'pk-sv-top' }, btn('pk-sv-back', backIco(), home), h('b', { class: 'pk-sv-farm' }, sv.farm), hud);
    let body;
    if (st.tab === 'farm') {
      const tile = (p, i) => {
        if (!p) return h('button', { type: 'button', class: 'pk-sv-tile open', title: 'plant', onclick: () => mine && plant(i) });
        if (p.dead) return h('button', { type: 'button', class: 'pk-sv-tile dead', title: 'clear', onclick: () => { if (!mine) return; sv.plots[i] = null; save(); c.draw(); } }, h('i', { class: 'pk-sv-dead' }));
        const crop = CROPS[p.crop], gr = growth(p), ready = gr >= crop.days, wet = p.watered.includes(n);
        const stage = ready ? 3 : gr >= crop.days * .6 ? 2 : gr >= 1 ? 1 : 0;
        return h('button', {
          type: 'button', class: `pk-sv-tile planted${wet ? ' wet' : ''}${ready ? ' ready' : ''}`, title: ready ? 'harvest' : 'water',
          onclick: () => {
            if (!mine) return;
            if (ready) { sv.gold += crop.sell; sv.shipped = (sv.shipped || 0) + 1; sv.plots[i] = null; save(); floatGold(crop.sell); c.draw(); return; }
            if (!wet) { p.watered.push(n); save(); c.draw(); }
          },
        }, ready ? sticker(crop.icon, 'pk-sv-crop ripe') : h('i', { class: 'pk-sv-sprout s' + stage }));
      };
      body = h('div', { class: 'ph-scroll pk-sv-body' },
        h('div', { class: 'pk-sv-field season-' + cal.season }, h('div', { class: 'pk-sv-plots' }, sv.plots.map(tile)), h('i', { class: 'pk-sv-house' }), h('i', { class: 'pk-sv-bin' })),
        mine ? h('div', { class: 'pk-sv-tools' },
          btn('pk-sv-btn', [h('i', { class: 'pk-sv-can' }), 'water all'], () => { sv.plots.forEach(p => { if (p && !p.dead && !p.watered.includes(n) && growth(p) < CROPS[p.crop].days) p.watered.push(n); }); save(); c.draw(); }),
          btn('pk-sv-btn', 'go to bed', sleepNow)) : null,
        h('div', { class: 'pk-sv-inv' }, Object.entries(sv.seeds).filter(([, k]) => k > 0).map(([k, q]) => h('span', { class: 'pk-sv-slot' }, sticker(CROPS[k].icon), h('b', {}, q))),
          ...Array.from({ length: Math.max(0, 8 - Object.values(sv.seeds).filter(k => k > 0).length) }, () => h('span', { class: 'pk-sv-slot' }))),
        h('div', { class: 'pk-sv-shipped' }, `shipped ${sv.shipped || 0}`));
    } else if (st.tab === 'shop') {
      const list = Object.entries(CROPS).filter(([, v]) => v.s === cal.season);
      body = h('div', { class: 'ph-scroll pk-sv-body' },
        h('div', { class: 'pk-sv-sign' }, "pierre's general store"),
        h('div', { class: 'pk-sv-shop' }, list.map(([k, v]) => h('button', {
          type: 'button', class: 'pk-sv-shoprow', disabled: !mine, onclick: () => {
            if (sv.gold < v.seed) { toast('not enough gold', 'bad'); return; }
            sv.gold -= v.seed; sv.seeds[k] = (sv.seeds[k] || 0) + 1; save(); c.draw();
          },
        }, sticker(v.icon, 'pk-sv-shop-ico'), h('div', {}, h('b', {}, k + ' seeds'), h('span', {}, `${v.days} days · sells ${v.sell}g`)), h('em', {}, h('i', { class: 'pk-sv-coin' }), v.seed)))));
    } else {
      body = h('div', { class: 'ph-scroll pk-sv-body' },
        h('div', { class: 'pk-sv-social' }, VILLAGERS.map(([name, col]) => {
          const hearts = sv.hearts[name] || 0;
          const gifted = sv.gifted[name] === n;
          return h('div', { class: 'pk-sv-vill' },
            h('span', { class: 'pk-sv-face', style: { background: col } }, name[0].toUpperCase()),
            h('b', {}, name),
            h('div', { class: 'pk-sv-hearts' }, Array.from({ length: 10 }, (_, i) => h('i', { class: i < hearts ? 'on' : '' }))),
            mine ? btn('pk-sv-gift' + (gifted ? ' done' : ''), gifted ? '✓' : 'gift', () => { if (gifted) return; sv.hearts[name] = Math.min(10, hearts + 1); sv.gifted[name] = n; save(); c.draw(); }) : null);
        })));
    }
    function plant(i) {
      const have = Object.entries(sv.seeds).filter(([k, q]) => q > 0 && CROPS[k].s === cal.season);
      if (!have.length) { toast('no seeds for ' + cal.season, 'bad'); c.go({ tab: 'shop' }, null); return; }
      const pick = k => { sv.seeds[k]--; sv.plots[i] = { crop: k, at: n, watered: [] }; save(); c.draw(); };
      if (have.length === 1) { pick(have[0][0]); return; }
      const m = openModal({ title: 'plant', body: h('div', { class: 'pk-sv-pick' }, have.map(([k, q]) => btn('pk-sv-pickbtn', [sticker(CROPS[k].icon), h('span', {}, k), h('b', {}, q)], () => { m.close(); pick(k); }))) });
    }
    function floatGold(g) { const el = h('div', { class: 'pk-sv-float' }, '+' + g + 'g'); c.root.append(el); setTimeout(() => el.remove(), 1200); }
    function sleepNow() {
      const fade = h('div', { class: 'pk-sv-night' }, h('b', {}, (() => { const k = calOf(n + 1); return `${k.season} ${k.day}`; })()));
      c.root.append(fade);
      setTimeout(() => { sv.offset = (sv.offset || 0) + 1; save(); c.draw(); }, 900);
    }
    const tabs = h('div', { class: 'pk-sv-tabs' }, [['farm', 'farm'], ['shop', 'shop'], ['social', 'social']].map(([k, l]) => btn(st.tab === k ? 'on' : '', l, () => c.go({ tab: k }, null))));
    return h('div', { class: 'pk-fill season-' + cal.season }, top, body, tabs);
  });
}
