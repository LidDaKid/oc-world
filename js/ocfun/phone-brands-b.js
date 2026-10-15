// phone apps: tiktok, youtube, twitter, tumblr, reddit, twitch, spotify, netflix.
// see the plug-in notes at the top of phone.js. everything here is made up by whoever owns the oc:
// posts, comments, streams + shows can be "by" any oc or a typed name (pickWho).

import { h, s, fill, uid, openModal, confirmDialog, toast, swatches } from '../ui.js';
import { sticker, pic, portrait, nameOf, allOcs } from './kit.js';
import { who, face, freshRef, refOf, ago, bigNum, addPhotos, dropImage } from './phone-bits.js';

const MV = 'music + video';
export const APPS = {
  tiktok: { label: 'tiktok', icon: '1f3b5', bg: 'linear-gradient(160deg,#25f4ee -20%,#111 45%,#111 60%,#fe2c55 130%)', cat: 'social' },
  youtube: { label: 'youtube', icon: '1f4fa', bg: 'linear-gradient(160deg,#ff4b4b,#d90000)', cat: MV },
  twitter: { label: 'twitter', icon: '1f426', bg: 'linear-gradient(160deg,#2a2a2e,#000)', cat: 'social' },
  tumblr: { label: 'tumblr', icon: '1f4dd', bg: 'linear-gradient(160deg,#16375c,#001935)', cat: 'social' },
  reddit: { label: 'reddit', icon: '1f47d', bg: 'linear-gradient(160deg,#ff7a3d,#ff4500)', cat: 'social' },
  twitch: { label: 'twitch', icon: '1f47e', bg: 'linear-gradient(160deg,#a970ff,#6420d6)', cat: MV },
  spotify: { label: 'spotify', icon: '1f3a7', bg: 'linear-gradient(160deg,#2b2b2b,#0b0b0b)', cat: MV },
  netflix: { label: 'netflix', icon: '1f37f', bg: 'linear-gradient(160deg,#1c1c1c,#000)', cat: MV },
};

export const DEF = {
  tiktok: { posts: [], following: [], followers: 1204, bio: '' },
  youtube: { videos: [], subs: [] },
  twitter: { tweets: [], trends: [], blue: [], bio: '', bannerId: null, followers: 482, following: 311 },
  tumblr: { posts: [], blogs: {} },
  reddit: { subs: [], posts: [], joined: [] },
  twitch: { streams: [], follows: [] },
  spotify: { playlists: [], liked: [], wrapped: { minutes: 0, artists: [], songs: [] }, shuffle: false, repeat: false },
  netflix: { shows: [] },
};

// ---------- little helpers ----------
function hashStr(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
const keyOf = ref => (ref?.id ? 'oc:' + ref.id : 'n:' + (ref?.name || '').toLowerCase());
const sameWho = (a, b) => keyOf(a) === keyOf(b);
const handleOf = ref => who(ref).name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'someone';
const n = bigNum;
const longAgo = ts => {
  const sec = Math.max(0, (Date.now() - ts) / 1000);
  const u = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [k, w] of u) if (sec >= k) { const v = Math.floor(sec / k); return `${v} ${w}${v === 1 ? '' : 's'} ago`; }
  return 'just now';
};
const shortAgo = ts => (ago(ts) === 'now' ? 'now' : ago(ts));
const clockOf = sec => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60); return `${m}:${String(sec % 60).padStart(2, '0')}`; };
const parseDur = str => { const p = String(str || '').split(':').map(Number).filter(x => !Number.isNaN(x)); return p.length ? p.reduce((a, b) => a * 60 + b, 0) : 0; };
const tagsOf = str => String(str || '').split(/[,#]/).map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);

// an avatar of any size
function av(ref, size = 32, cls = '') {
  const el = face(ref, 'pb-av ' + cls);
  el.style.setProperty('--s', size + 'px');
  return el;
}

// ---------- icons ----------
const P = {
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1Z', 1],
  search: ['M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM15.5 15.5 21 21', 0],
  heart: ['M12 20.5s-7.6-4.5-9.6-9.2C.9 7.9 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.4 4.2 6.8-2 4.7-9.6 9.2-9.6 9.2Z', 1],
  comment: ['M12 3.5c5 0 9 3.4 9 7.7s-4 7.7-9 7.7c-1 0-2-.1-2.9-.4L4 20.5l1.4-4.1C4 15 3 13.2 3 11.2 3 6.9 7 3.5 12 3.5Z', 1],
  share: ['M13.5 4.5 21 11.5l-7.5 7v-4c-5 0-8.2 1.6-10.5 5 .8-6 4-10 10.5-11Z', 1],
  bookmark: ['M6 3.5h12v17.5l-6-4.2-6 4.2Z', 1],
  plus: ['M12 5v14M5 12h14', 0],
  retweet: ['M7 18V8h9M13 5l3 3-3 3M17 6v10H8M11 19l-3-3 3-3', 0],
  up: ['M12 3.5 3.5 12.5h5V20h7v-7.5h5Z', 1],
  down: ['M12 20.5 3.5 11.5h5V4h7v7.5h5Z', 1],
  bell: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l2 2H4ZM10 21h4', 1],
  user: ['M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM3.5 21a8.5 8.5 0 0 1 17 0Z', 1],
  play: ['M7 4.5v15l13-7.5Z', 1],
  pause: ['M6 4.5h4.2v15H6ZM13.8 4.5H18v15h-4.2Z', 1],
  prev: ['M5.5 5v14M19 5 8.5 12 19 19Z', 1],
  next: ['M18.5 5v14M5 5l10.5 7L5 19Z', 1],
  shuffle: ['M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3', 0],
  repeat: ['M4 12V9.5A3.5 3.5 0 0 1 7.5 6H19M16 3l3 3-3 3M20 12v2.5a3.5 3.5 0 0 1-3.5 3.5H5M8 21l-3-3 3-3', 0],
  library: ['M5 3.5v17M10 3.5v17M14.5 4l5 16', 0],
  views: ['M5 20v-8M10 20V5M15 20v-6M20 20V9', 0],
  dots: ['M5 12h.01M12 12h.01M19 12h.01', 0],
  mail: ['M3.5 5.5h17v13h-17ZM3.5 6l8.5 7 8.5-7', 0],
  back: ['M15 4 7 12l8 8', 0],
  x: ['M6 6l12 12M18 6 6 18', 0],
  flag: ['M5 21V4h11l-1.5 4L16 12H5', 0],
  grid: ['M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z', 0],
  users: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0ZM16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6', 0],
  compass: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM15.5 8.5l-2 5-5 2 2-5Z', 0],
  thumb: ['M7 10v10H4V10ZM7 10l4-7c1.5 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 6.6A2.5 2.5 0 0 1 17.3 20H7', 0],
  sub: ['M4 6h16M4 12h16M4 18h10', 0],
  tv: ['M3 6h18v12H3ZM8 21h8', 0],
  download: ['M12 4v11M7 10l5 5 5-5M5 20h14', 0],
  quote: ['M5 17c0-5 1.5-8 5-10M13 17c0-5 1.5-8 5-10', 0],
  check: ['M5 12.5 10 17l9-10', 0],
  edit: ['M4 20h4L19 9l-4-4L4 16ZM14 6l4 4', 0],
  trash: ['M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', 0],
  live: ['M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4', 0],
};
function ic(name, { fill: filled = false, cls = '' } = {}) {
  const [d, solid] = P[name] || P.dots;
  const useFill = solid && filled;
  return s('svg', { viewBox: '0 0 24 24', class: 'pb-ic ' + cls, 'aria-hidden': 'true' },
    s('path', { d, fill: useFill ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': name === 'dots' ? 3.4 : 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}
const verified = (color = '#1d9bf0') => s('svg', { viewBox: '0 0 24 24', class: 'pb-verified', 'aria-label': 'verified' },
  s('path', { fill: color, d: 'M12 1.8l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22.2l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2Z' }),
  s('path', { d: 'm7.8 12.2 2.8 2.8 5.6-5.8', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

// ---------- brand marks (drawn, not real logo files) ----------
const marks = {
  tiktok: () => s('svg', { viewBox: '0 0 24 24', class: 'pb-mark pb-mark-tt' },
    s('path', { d: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5', fill: 'none', stroke: '#25f4ee', 'stroke-width': 2.6, transform: 'translate(-1 -1)' }),
    s('path', { d: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5', fill: 'none', stroke: '#fe2c55', 'stroke-width': 2.6, transform: 'translate(1 1)' }),
    s('path', { d: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.2 4.2 4.8 4.4', fill: 'none', stroke: '#fff', 'stroke-width': 2.6, 'stroke-linecap': 'round' })),
  youtube: () => h('span', { class: 'pb-yt-logo' }, s('svg', { viewBox: '0 0 28 20', class: 'pb-yt-play' }, s('rect', { width: 28, height: 20, rx: 6, fill: '#ff0033' }), s('path', { d: 'M11 5.5v9l8-4.5Z', fill: '#fff' })), h('b', {}, 'YouTube')),
  x: () => s('svg', { viewBox: '0 0 24 24', class: 'pb-mark pb-mark-x' }, s('path', { fill: 'currentColor', d: 'M3.5 3h5.2l4.4 6.1L18.4 3h2.3l-6.6 7.6L21 21h-5.2l-4.8-6.6L5.1 21H2.8l7.2-8.3Zm2.9 1.6 10.2 14.8h1.7L8.1 4.6Z' })),
  tumblr: () => h('b', { class: 'pb-tb-word' }, 'tumblr'),
  reddit: () => h('span', { class: 'pb-rd-logo' }, s('svg', { viewBox: '0 0 24 24', class: 'pb-rd-alien' },
    s('circle', { cx: 12, cy: 12, r: 11.5, fill: '#ff4500' }),
    s('ellipse', { cx: 12, cy: 14, rx: 6.8, ry: 4.6, fill: '#fff' }),
    s('circle', { cx: 17.6, cy: 9.6, r: 1.6, fill: '#fff' }), s('circle', { cx: 6.4, cy: 9.6, r: 1.6, fill: '#fff' }),
    s('circle', { cx: 9.4, cy: 13.4, r: 1.15, fill: '#ff4500' }), s('circle', { cx: 14.6, cy: 13.4, r: 1.15, fill: '#ff4500' }),
    s('path', { d: 'M9.5 16.2c1.5 1 3.5 1 5 0', stroke: '#ff4500', 'stroke-width': .9, fill: 'none', 'stroke-linecap': 'round' }),
    s('path', { d: 'M12 9.4 13 5l3 .7', stroke: '#fff', 'stroke-width': 1, fill: 'none' }), s('circle', { cx: 16.6, cy: 5.8, r: 1.2, fill: '#fff' })), h('b', {}, 'reddit')),
  twitch: () => s('svg', { viewBox: '0 0 24 24', class: 'pb-mark pb-mark-tw' }, s('path', { fill: '#fff', d: 'M5 2 2.5 6v14h5v3h3l3-3h4l4.5-4.5V2Zm15 12.5-3 3h-4.5l-3 3v-3H5.5V3.8H20Z' }), s('path', { fill: '#fff', d: 'M15.5 7h2v5.5h-2zM10.5 7h2v5.5h-2z' })),
  spotify: () => s('svg', { viewBox: '0 0 24 24', class: 'pb-mark pb-mark-sp' }, s('circle', { cx: 12, cy: 12, r: 11, fill: '#1ed760' }),
    s('path', { d: 'M6 9.2c4-1.2 8.6-.8 12 1.2M6.7 12.6c3.4-1 7.2-.6 10 1M7.4 15.8c2.8-.7 5.6-.4 7.8.8', stroke: '#000', 'stroke-width': 1.7, fill: 'none', 'stroke-linecap': 'round' })),
  netflix: () => s('svg', { viewBox: '0 0 16 28', class: 'pb-mark pb-mark-nf' },
    s('path', { d: 'M1 1h4l6 18V1h4v26l-4-.5L5 9v18l-4 .5Z', fill: '#e50914' }), s('path', { d: 'M5 1 11 19v8L5 9Z', fill: '#b1060f' })),
};

// pick who: this oc, an oc from the same world, or a typed name
let pageChar = null;
function pickWho({ title = 'who?' } = {}) {
  return new Promise(resolve => {
    let done = null;
    const name = h('input', { type: 'text', placeholder: 'type a name', maxLength: 60 });
    const ocs = pageChar ? [pageChar, ...allOcs(pageChar.id)] : [];
    const m = openModal({
      title,
      body: h('div', { class: 'who-pick' },
        h('div', { class: 'who-pick-grid' }, ocs.map(o => h('button', { type: 'button', class: 'who-pick-oc', style: { '--c': o.color }, onclick: () => { done = refOf(o); m.close(); } }, portrait(o, 'md'), h('span', {}, nameOf(o))))),
        h('div', { class: 'who-pick-typed' }, name)),
      actions: [{ label: 'pick', kind: 'primary', onClick: close => { const v = name.value.trim(); if (!v) { name.focus(); return; } done = { id: null, name: v }; close(); } }],
      onClose: () => resolve(done),
    });
  });
}

// ---------- a quick form in a modal ----------
// fields: { key, label, type: text|area|number|who|pic|select|check|color, value, options, max }
function form(title, fields, onSave, { okLabel = 'save', extra } = {}) {
  const vals = {};
  const rows = fields.map(f => {
    vals[f.key] = f.value ?? (f.type === 'number' ? 0 : f.type === 'check' ? false : f.type === 'who' || f.type === 'pic' ? null : '');
    const label = t => h('span', { class: 'field-label' }, t);
    if (f.type === 'who') {
      const btn = h('button', { type: 'button', class: 'btn ghost sm pb-who-btn' });
      const paint = () => fill(btn, av(vals[f.key], 22), h('span', {}, who(vals[f.key]).name));
      paint();
      btn.onclick = async () => { const r = await pickWho({ title: f.label }); if (r) { vals[f.key] = r; paint(); } };
      return h('div', { class: 'field' }, label(f.label), btn);
    }
    if (f.type === 'pic') {
      const box = h('div', { class: 'pb-pic-field' });
      const paint = () => fill(box,
        vals[f.key] ? pic(vals[f.key], 'pb-pic-prev') : null,
        h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const [p] = await addPhotos(false, 1200); if (p) { vals[f.key] = p.imageId; paint(); } } }, vals[f.key] ? 'change' : 'add picture'),
        vals[f.key] ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { vals[f.key] = null; paint(); } }, 'remove') : null);
      paint();
      return h('div', { class: 'field' }, label(f.label), box);
    }
    if (f.type === 'check') {
      return h('label', { class: 'check pb-check' }, h('input', { type: 'checkbox', checked: !!vals[f.key], onchange: e => { vals[f.key] = e.target.checked; } }), f.label);
    }
    if (f.type === 'color') {
      return h('div', { class: 'field' }, label(f.label), swatches(vals[f.key], c => { vals[f.key] = c; }, f.options));
    }
    if (f.type === 'select') {
      return h('label', { class: 'field' }, label(f.label), h('select', { onchange: e => { vals[f.key] = e.target.value; } },
        f.options.map(([v, l]) => h('option', { value: v, selected: v === vals[f.key] }, l))));
    }
    const input = f.type === 'area'
      ? h('textarea', { rows: 3, maxLength: f.max || 600, value: vals[f.key], oninput: e => { vals[f.key] = e.target.value; } })
      : h('input', { type: f.type === 'number' ? 'number' : 'text', min: 0, maxLength: f.max || 120, value: vals[f.key], placeholder: f.placeholder || '', oninput: e => { vals[f.key] = f.type === 'number' ? Number(e.target.value) || 0 : e.target.value; } });
    if (f.focus) input.dataset.autofocus = '';
    return h('label', { class: 'field' }, label(f.label), input);
  });
  openModal({
    title, body: h('div', { class: 'pb-form' }, rows),
    actions: [
      extra || null,
      { label: okLabel, kind: 'primary', onClick: close => { if (onSave(vals) !== false) close(); } },
    ].filter(Boolean),
  });
}

// who's writing: a little face button you tap to switch
function asPicker(start, onChange) {
  let ref = start;
  const btn = h('button', { type: 'button', class: 'pb-as', title: 'who is writing' });
  const paint = () => fill(btn, av(ref, 26));
  paint();
  btn.onclick = async () => { const r = await pickWho({ title: 'as who?' }); if (r) { ref = r; paint(); onChange?.(r); } };
  return { el: btn, get: () => ref };
}

// a comment list + box, shared by tiktok / youtube / tumblr
function comments(list, { mine, me, save, onChange, cls = '', likeable = true, placeholder = 'add comment...' }) {
  const box = h('div', { class: 'pb-cmts ' + cls });
  const as = asPicker(me);
  const input = h('input', { type: 'text', class: 'pb-cmt-input', maxLength: 300, placeholder, onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } } });
  function add() {
    const text = input.value.trim();
    if (!text) return;
    list.push({ id: uid(), who: freshRef(as.get()), text, at: Date.now(), likes: 0, liked: false });
    input.value = '';
    save();
    draw();
    onChange?.();
  }
  const listEl = h('div', { class: 'pb-cmt-list' });
  function draw() {
    fill(listEl, list.length ? list.map(c => h('div', { class: 'pb-cmt' },
      av(c.who, 30),
      h('div', { class: 'pb-cmt-main' },
        h('div', { class: 'pb-cmt-top' }, h('b', {}, handleOf(c.who)), h('span', {}, shortAgo(c.at))),
        h('div', { class: 'pb-cmt-text' }, c.text)),
      likeable ? h('button', {
        type: 'button', class: 'pb-cmt-like' + (c.liked ? ' on' : ''), disabled: !mine,
        onclick: () => { c.liked = !c.liked; c.likes = Math.max(0, (c.likes || 0) + (c.liked ? 1 : -1)); save(); draw(); },
      }, ic('heart', { fill: c.liked }), h('span', {}, c.likes ? n(c.likes) : '')) : null,
      mine ? h('button', { type: 'button', class: 'pb-cmt-x', title: 'delete', onclick: () => { list.splice(list.indexOf(c), 1); save(); draw(); onChange?.(); } }, ic('x')) : null))
      : h('div', { class: 'pb-cmt-empty' }, 'no comments yet'));
  }
  draw();
  fill(box, listEl, mine ? h('div', { class: 'pb-cmt-box' }, as.el, input, h('button', { type: 'button', class: 'pb-cmt-send', onclick: add }, 'post')) : null);
  return box;
}

// a sheet that slides up inside the phone screen
function sheet(screenEl, title, body, { cls = '' } = {}) {
  const wrap = h('div', { class: 'pb-sheet-wrap ' + cls, onpointerdown: e => { if (e.target === wrap) close(); } },
    h('div', { class: 'pb-sheet' },
      h('div', { class: 'pb-sheet-head' }, h('i', { class: 'pb-grab' }), title instanceof Node ? title : h('b', {}, title), h('button', { type: 'button', class: 'pb-sheet-x', title: 'close', onclick: () => close() }, ic('x'))),
      body));
  const close = () => { wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 260); };
  screenEl.append(wrap);
  return { close };
}

// heart burst at a point (double-tap likes)
function burst(host, x, y, cls = '') {
  const r = host.getBoundingClientRect();
  const el = h('i', { class: 'pb-burst ' + cls, style: { left: (x - r.left) + 'px', top: (y - r.top) + 'px', '--r': (Math.random() * 40 - 20) + 'deg' } }, ic('heart', { fill: true }));
  host.append(el);
  setTimeout(() => el.remove(), 900);
}

function navBar(items, cur, pick, cls = '') {
  return h('nav', { class: 'pb-nav ' + cls }, items.map(([id, icon, label]) => h('button', {
    type: 'button', class: 'pb-nav-btn' + (id === cur ? ' on' : '') + (id === 'add' ? ' add' : ''), 'data-tab': id, title: label || id, onclick: () => pick(id),
  }, id === 'add' ? h('span', { class: 'pb-nav-plus' }, ic('plus')) : ic(icon, { fill: id === cur }), label ? h('span', { class: 'pb-nav-l' }, label) : null)));
}

// the page music player (real playlist songs play there)
const playerState = () => {
  const bar = document.querySelector('.player');
  if (!bar || bar.hidden) return null;
  return { title: bar.querySelector('.player-title')?.textContent || '', playing: bar.querySelector('.player-btn.big')?.title === 'pause', seek: Number(bar.querySelector('.player-seek')?.value || 0) / 1000 };
};

export function install(api) {
  const { d, char, mine, save, show, SCREENS } = api;
  pageChar = char;
  for (const k of Object.keys(DEF)) d[k] = { ...structuredClone(DEF[k]), ...d[k] };
  d.spotify.wrapped = { ...DEF.spotify.wrapped, ...d.spotify.wrapped };
  const me = () => ({ id: char.id, name: nameOf(char) });
  const isMe = ref => ref?.id === char.id;
  const home = () => api.goHome();
  const scr = () => api.screen;
  const del = async (what, fn) => { if (await confirmDialog(`delete this ${what}?`, { danger: true, okLabel: 'delete' })) fn(); };
  const empty = (code, label, onclick) => h('div', { class: 'ph-empty pb-empty' }, sticker(code, 'ph-empty-stk'), mine && onclick ? h('button', { type: 'button', class: 'ph-pill', onclick }, label) : null);
  const topBack = (onclick = home) => h('button', { type: 'button', class: 'pb-top-back', title: 'back', onclick }, ic('back'));

  // =====================================================================
  // tiktok
  // =====================================================================
  const tt = d.tiktok;
  for (const p of tt.posts) { p.comments ||= []; }
  let ttTab = 'foryou', ttPage = 'feed', ttJump = null, ttWho = null;
  const ttFollowing = ref => tt.following.includes(keyOf(ref));
  SCREENS.tiktok = () => {
    const root = h('div', { class: 'pb-tt' });
    const draw = () => (root.classList.toggle('light', ttPage !== 'feed'), fill(root, ttPage === 'profile' ? profile() : ttPage === 'inbox' ? inbox() : feed(),
      navBar([['feed', 'home', 'home'], ['friends', 'users', 'friends'], ['add'], ['inbox', 'mail', 'inbox'], ['profile', 'user', 'profile']],
        ttPage === 'feed' && ttTab === 'following' ? 'friends' : ttPage, id => {
          if (id === 'add') return upload();
          if (id === 'friends') { ttPage = 'feed'; ttTab = 'following'; } else if (id === 'feed') { ttPage = 'feed'; ttTab = 'foryou'; } else { ttPage = id; ttWho = null; }
          draw();
        }, 'pb-tt-nav')));
    function upload() {
      if (!mine) return;
      form('new post', [
        { key: 'imageId', label: 'picture', type: 'pic' },
        { key: 'caption', label: 'caption', type: 'area', max: 300 },
        { key: 'sound', label: 'sound', placeholder: 'original sound' },
        { key: 'who', label: 'posted by', type: 'who', value: me() },
        { key: 'likes', label: 'likes', type: 'number', value: 0 },
      ], v => {
        if (!v.imageId && !v.caption.trim()) return false;
        tt.posts.push({ id: uid(), who: freshRef(v.who), imageId: v.imageId, caption: v.caption.trim(), sound: v.sound.trim(), likes: v.likes, liked: false, saved: false, shares: 0, comments: [], at: Date.now() });
        save();
        ttPage = 'feed'; ttTab = 'foryou'; ttJump = tt.posts.at(-1).id;
        draw();
      }, { okLabel: 'post' });
    }
    function feed() {
      const list = [...tt.posts].reverse().filter(p => ttTab === 'foryou' || ttFollowing(p.who) || isMe(p.who));
      const sc = h('div', { class: 'pb-tt-feed ph-scroll' }, list.length ? list.map(post) : empty('1f3b5', 'post', upload));
      if (ttJump) { const id = ttJump; ttJump = null; requestAnimationFrame(() => sc.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'start' })); }
      return h('div', { class: 'pb-tt-feedwrap' }, sc,
        h('div', { class: 'pb-tt-top' }, h('span', { class: 'pb-tt-live' }, 'LIVE'),
          h('div', { class: 'pb-tt-tabs' }, [['following', 'following'], ['foryou', 'for you']].map(([v, l]) => h('button', { type: 'button', class: ttTab === v ? 'on' : '', onclick: () => { ttTab = v; draw(); } }, l))),
          h('button', { type: 'button', class: 'pb-tt-x', title: 'home', onclick: home }, ic('x'))));
    }
    function post(p) {
      const likeBtn = h('button', { type: 'button', class: 'pb-tt-act pb-tt-like' + (p.liked ? ' on' : ''), disabled: !mine, onclick: () => toggleLike() }, ic('heart', { fill: true }), h('span', {}, n(p.likes)));
      const toggleLike = (force) => {
        const want = force ?? !p.liked;
        if (want === p.liked) return;
        p.liked = want; p.likes = Math.max(0, p.likes + (want ? 1 : -1)); save();
        likeBtn.classList.toggle('on', want); likeBtn.lastChild.textContent = n(p.likes);
        likeBtn.classList.remove('pop'); void likeBtn.offsetWidth; likeBtn.classList.add('pop');
      };
      const cCount = h('span', {}, n(p.comments.length));
      const card = h('div', {
        class: 'pb-tt-post', 'data-id': p.id,
        ondblclick: e => { if (!mine || e.target.closest('button')) return; burst(card, e.clientX, e.clientY, 'pb-tt-burst'); toggleLike(true); },
      },
        p.imageId ? pic(p.imageId, 'pb-tt-img') : h('div', { class: 'pb-tt-text', style: { '--c': who(p.who).color } }, h('span', {}, p.caption)),
        h('div', { class: 'pb-tt-shade' }),
        h('div', { class: 'pb-tt-info' },
          h('b', { class: 'pb-tt-handle', onclick: () => { ttWho = p.who; ttPage = 'profile'; draw(); } }, who(p.who).name),
          p.caption && p.imageId ? h('p', { class: 'pb-tt-cap' }, p.caption.split(/(#\w+)/).map(w => w.startsWith('#') ? h('b', {}, w) : w)) : null,
          h('div', { class: 'pb-tt-sound' }, h('span', { class: 'pb-tt-note' }, '♫'), h('div', { class: 'pb-marquee' }, h('span', {}, `${p.sound || 'original sound'} - ${who(p.who).name}`)))),
        h('div', { class: 'pb-tt-rail' },
          h('div', { class: 'pb-tt-pfp' }, av(p.who, 44), isMe(p.who) ? null : h('button', {
            type: 'button', class: 'pb-tt-follow' + (ttFollowing(p.who) ? ' on' : ''), disabled: !mine, title: 'follow',
            onclick: e => { const k = keyOf(p.who); tt.following = ttFollowing(p.who) ? tt.following.filter(x => x !== k) : [...tt.following, k]; save(); e.currentTarget.classList.toggle('on', ttFollowing(p.who)); },
          }, ic('plus'))),
          likeBtn,
          h('button', { type: 'button', class: 'pb-tt-act', onclick: () => openCmts() }, ic('comment', { fill: true }), cCount),
          h('button', { type: 'button', class: 'pb-tt-act pb-tt-save' + (p.saved ? ' on' : ''), disabled: !mine, onclick: e => { p.saved = !p.saved; save(); e.currentTarget.classList.toggle('on', p.saved); } }, ic('bookmark', { fill: true }), h('span', {}, p.saved ? '1' : '0')),
          h('button', { type: 'button', class: 'pb-tt-act', disabled: !mine, onclick: e => { p.shares = (p.shares || 0) + 1; save(); e.currentTarget.lastChild.textContent = n(p.shares); } }, ic('share', { fill: true }), h('span', {}, n(p.shares || 0))),
          h('div', { class: 'pb-tt-disc' }, av(p.who, 26))),
        mine ? h('button', { type: 'button', class: 'pb-tt-del', title: 'delete', onclick: () => del('post', () => { tt.posts = tt.posts.filter(x => x !== p); dropImage(p.imageId); save(); draw(); }) }, ic('dots')) : null);
      function openCmts() {
        const t = h('b', {}, `${p.comments.length} comments`);
        sheet(scr(), t, comments(p.comments, { mine, me: me(), save, onChange: () => { cCount.textContent = n(p.comments.length); t.textContent = `${p.comments.length} comments`; } }), { cls: 'pb-tt-sheet' });
      }
      return card;
    }
    function profile() {
      const ref = ttWho || me();
      const posts = [...tt.posts].reverse().filter(p => sameWho(p.who, ref));
      const likes = posts.reduce((a, p) => a + (p.likes || 0), 0);
      const own = isMe(ref);
      const hs = hashStr(keyOf(ref));
      return h('div', { class: 'pb-tt-prof ph-scroll' },
        h('div', { class: 'pb-tt-prof-top' }, ttWho ? topBack(() => { ttWho = null; ttPage = 'feed'; draw(); }) : h('span'), h('b', {}, who(ref).name), h('span')),
        av(ref, 92, 'pb-tt-prof-av'),
        h('div', { class: 'pb-tt-at' }, '@' + handleOf(ref)),
        h('div', { class: 'pb-tt-stats' },
          [[own ? tt.following.length : hs % 400, 'following'], [own ? tt.followers : (hs % 90000), 'followers'], [likes, 'likes']].map(([v, l]) => h('div', {}, h('b', {}, n(v)), h('span', {}, l)))),
        own && mine ? h('div', { class: 'pb-tt-btns' },
          h('button', { type: 'button', class: 'pb-tt-btn', onclick: () => form('edit profile', [{ key: 'bio', label: 'bio', type: 'area', value: tt.bio, max: 160 }, { key: 'followers', label: 'followers', type: 'number', value: tt.followers }], v => { tt.bio = v.bio.trim(); tt.followers = v.followers; save(); draw(); }) }, 'edit profile'),
          h('button', { type: 'button', class: 'pb-tt-btn', onclick: () => upload() }, 'post')) : null,
        own && tt.bio ? h('p', { class: 'pb-tt-bio' }, tt.bio) : null,
        h('div', { class: 'pb-tt-gridtabs' }, h('i', { class: 'on' }, ic('grid'))),
        posts.length ? h('div', { class: 'pb-tt-grid' }, posts.map(p => h('button', { type: 'button', class: 'pb-tt-cell', onclick: () => { ttPage = 'feed'; ttTab = 'foryou'; ttJump = p.id; draw(); } },
          p.imageId ? pic(p.imageId) : h('div', { class: 'pb-tt-cell-text', style: { '--c': who(p.who).color } }, p.caption),
          h('span', { class: 'pb-tt-views' }, ic('play', { fill: true }), n((p.likes || 0) * 7 + 12))))) : empty('1f3b5', 'post', own ? upload : null));
    }
    function inbox() {
      const acts = tt.posts.filter(p => isMe(p.who)).flatMap(p => p.comments.filter(c => !isMe(c.who)).map(c => ({ p, c }))).sort((a, b) => b.c.at - a.c.at);
      return h('div', { class: 'pb-tt-inbox ph-scroll' },
        h('div', { class: 'pb-tt-prof-top' }, h('span'), h('b', {}, 'inbox'), h('span')),
        acts.length ? acts.map(({ p, c }) => h('button', { type: 'button', class: 'pb-tt-note-row', onclick: () => { ttPage = 'feed'; ttTab = 'foryou'; ttJump = p.id; draw(); } },
          av(c.who, 40), h('div', { class: 'pb-tt-note-main' }, h('b', {}, who(c.who).name), h('span', {}, `commented: ${c.text}`), h('em', {}, shortAgo(c.at))),
          p.imageId ? pic(p.imageId, 'pb-tt-note-pic') : null)) : h('div', { class: 'pb-cmt-empty light' }, 'no activity yet'));
    }
    draw();
    return root;
  };

  // =====================================================================
  // youtube
  // =====================================================================
  const yt = d.youtube;
  for (const v of yt.videos) v.comments ||= [];
  let ytTab = 'home', ytCat = 'all';
  SCREENS.youtube = (params = {}, view) => {
    if (params.v) return watch(params.v, view);
    if (params.channel) return channel(params.channel);
    const root = h('div', { class: 'pb-yt' });
    const draw = () => {
      const subbed = v => yt.subs.includes(keyOf(v.who));
      const cats = ['all', ...new Set(yt.videos.map(v => v.cat).filter(Boolean))];
      let list = [...yt.videos].reverse();
      if (ytTab === 'subs') list = list.filter(subbed);
      if (ytTab === 'you') list = list.filter(v => isMe(v.who));
      if (ytTab === 'home' && ytCat !== 'all') list = list.filter(v => v.cat === ytCat);
      fill(root,
        h('div', { class: 'pb-yt-top' }, h('button', { type: 'button', class: 'pb-yt-home', onclick: home }, marks.youtube()),
          h('div', { class: 'pb-yt-icons' }, mine ? h('button', { type: 'button', class: 'pb-ib', title: 'upload', onclick: upload }, ic('plus')) : null, h('span', { class: 'pb-ib' }, ic('bell')), h('span', { class: 'pb-ib' }, ic('search')))),
        ytTab === 'home' && cats.length > 1 ? h('div', { class: 'pb-chips' }, cats.map(c => h('button', { type: 'button', class: 'pb-chip' + (c === ytCat ? ' on' : ''), onclick: () => { ytCat = c; draw(); } }, c))) : null,
        ytTab === 'subs' ? h('div', { class: 'pb-yt-subrow' }, yt.subs.map(k => { const v = yt.videos.find(x => keyOf(x.who) === k); return v ? h('button', { type: 'button', onclick: () => show('youtube', { channel: k }) }, av(v.who, 46), h('span', {}, who(v.who).name)) : null; })) : null,
        ytTab === 'you' ? h('div', { class: 'pb-yt-you' }, av(me(), 56), h('div', {}, h('b', {}, nameOf(char)), h('span', {}, '@' + handleOf(me()) + ' · view channel')), h('button', { type: 'button', class: 'pb-yt-you-go', onclick: () => show('youtube', { channel: keyOf(me()) }) }, '›')) : null,
        h('div', { class: 'ph-scroll pb-yt-feed' }, list.length ? list.map(card) : empty('1f4fa', 'upload', upload)),
        navBar([['home', 'home', 'home'], ['subs', 'sub', 'subscriptions'], ['add'], ['you', 'user', 'you']], ytTab, id => { if (id === 'add') return upload(); ytTab = id; draw(); }, 'pb-yt-nav'));
    };
    draw();
    return root;
  };
  function ytUpload(after) {
    if (!mine) return;
    form('upload', [
      { key: 'imageId', label: 'thumbnail', type: 'pic' },
      { key: 'title', label: 'title', focus: true, max: 100 },
      { key: 'who', label: 'channel', type: 'who', value: me() },
      { key: 'views', label: 'views', type: 'number', value: 1200 },
      { key: 'dur', label: 'length', value: '4:20', max: 8 },
      { key: 'cat', label: 'category', placeholder: 'music, vlogs, gaming...' , max: 20 },
      { key: 'desc', label: 'description', type: 'area' },
    ], v => {
      if (!v.title.trim()) return false;
      yt.videos.push({ id: uid(), who: freshRef(v.who), imageId: v.imageId, title: v.title.trim(), views: v.views, dur: Math.max(5, parseDur(v.dur) || 260), cat: v.cat.trim().toLowerCase(), desc: v.desc.trim(), likes: Math.round(v.views / 25), liked: false, comments: [], at: Date.now() });
      save();
      after?.();
    }, { okLabel: 'upload' });
  }
  const upload = () => ytUpload(() => api.redraw());
  function card(v) {
    return h('div', { class: 'pb-yt-card' },
      h('button', { type: 'button', class: 'pb-yt-thumb', onclick: () => show('youtube', { v: v.id }) }, v.imageId ? pic(v.imageId) : h('div', { class: 'pb-yt-thumb-blank', style: { '--c': who(v.who).color } }, v.title), h('span', { class: 'pb-yt-dur' }, clockOf(v.dur))),
      h('div', { class: 'pb-yt-meta' },
        h('button', { type: 'button', class: 'pb-yt-ch', onclick: () => show('youtube', { channel: keyOf(v.who) }) }, av(v.who, 34)),
        h('button', { type: 'button', class: 'pb-yt-txt', onclick: () => show('youtube', { v: v.id }) }, h('b', {}, v.title), h('span', {}, `${who(v.who).name} · ${n(v.views)} views · ${longAgo(v.at)}`)),
        mine ? h('button', { type: 'button', class: 'pb-ib sm', title: 'delete', onclick: () => del('video', () => { yt.videos = yt.videos.filter(x => x !== v); dropImage(v.imageId); save(); api.redraw(); }) }, ic('dots')) : null));
  }
  function watch(id, view) {
    const v = yt.videos.find(x => x.id === id);
    if (!v) return SCREENS.youtube({});
    let playing = false, at = 0;
    const bar = h('i'), time = h('span', { class: 'pb-yt-time' });
    const playBtn = h('button', { type: 'button', class: 'pb-yt-bigplay', title: 'play' });
    const player = h('div', { class: 'pb-yt-player' }, v.imageId ? pic(v.imageId, 'pb-yt-pimg') : h('div', { class: 'pb-yt-thumb-blank', style: { '--c': who(v.who).color } }, v.title),
      playBtn, h('div', { class: 'pb-yt-pbar' }, bar), time,
      h('button', { type: 'button', class: 'pb-yt-pback', title: 'back', onclick: () => show('youtube', {}, 'pop') }, ic('back')));
    const paint = () => {
      fill(playBtn, ic(playing ? 'pause' : 'play', { fill: true }));
      player.classList.toggle('playing', playing);
      bar.style.width = (at / v.dur * 100) + '%';
      time.textContent = `${clockOf(at)} / ${clockOf(v.dur)}`;
    };
    playBtn.onclick = () => { playing = !playing; if (at >= v.dur) at = 0; paint(); };
    player.querySelector('.pb-yt-pbar').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); at = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.dur; paint(); };
    const iv = setInterval(() => { if (!view.isConnected) return; if (playing) { at = Math.min(v.dur, at + .25); if (at >= v.dur) playing = false; paint(); } }, 250);
    api.onLeave(() => clearInterval(iv));
    paint();
    const subbed = () => yt.subs.includes(keyOf(v.who));
    const subBtn = h('button', { type: 'button', class: 'pb-yt-sub', disabled: !mine, onclick: () => { const k = keyOf(v.who); yt.subs = subbed() ? yt.subs.filter(x => x !== k) : [...yt.subs, k]; save(); paintSub(); } });
    const paintSub = () => { subBtn.textContent = subbed() ? 'subscribed' : 'subscribe'; subBtn.classList.toggle('on', subbed()); };
    paintSub();
    const likeBtn = h('button', { type: 'button', class: 'pb-yt-like', disabled: !mine, onclick: () => { v.liked = !v.liked; v.likes = Math.max(0, (v.likes || 0) + (v.liked ? 1 : -1)); save(); paintLike(); } });
    const paintLike = () => { fill(likeBtn, ic('thumb', { cls: v.liked ? 'on' : '' }), h('span', {}, n(v.likes || 0))); likeBtn.classList.toggle('on', !!v.liked); };
    paintLike();
    let descOpen = false;
    const desc = h('button', { type: 'button', class: 'pb-yt-desc', onclick: () => { descOpen = !descOpen; desc.classList.toggle('open', descOpen); } },
      h('b', {}, `${n(v.views)} views  ${longAgo(v.at)}`), v.desc ? h('p', {}, v.desc) : null);
    const cHead = h('b', {}, `comments ${v.comments.length}`);
    const others = [...yt.videos].reverse().filter(x => x !== v);
    return h('div', { class: 'pb-yt pb-yt-watch' },
      player,
      h('div', { class: 'ph-scroll pb-yt-wbody' },
        h('h3', { class: 'pb-yt-title' }, v.title),
        desc,
        h('div', { class: 'pb-yt-chrow' },
          h('button', { type: 'button', class: 'pb-yt-chbtn', onclick: () => show('youtube', { channel: keyOf(v.who) }) }, av(v.who, 36), h('div', {}, h('b', {}, who(v.who).name), h('span', {}, `${n(hashStr(keyOf(v.who)) % 900000 + 1000)} subscribers`))),
          subBtn),
        h('div', { class: 'pb-yt-acts' }, likeBtn, h('span', { class: 'pb-yt-pillbtn' }, ic('share', { fill: false }), 'share'), h('span', { class: 'pb-yt-pillbtn' }, ic('download'), 'download')),
        h('div', { class: 'pb-yt-cmts' }, cHead, comments(v.comments, { mine, me: me(), save, onChange: () => { cHead.textContent = `comments ${v.comments.length}`; } })),
        others.length ? h('div', { class: 'pb-yt-next' }, others.slice(0, 6).map(card)) : null));
  }
  function channel(k) {
    const vids = [...yt.videos].reverse().filter(v => keyOf(v.who) === k);
    const ref = vids[0]?.who || (k === keyOf(me()) ? me() : { name: k.slice(2) });
    const subbed = () => yt.subs.includes(k);
    const subBtn = h('button', { type: 'button', class: 'pb-yt-sub big', disabled: !mine, onclick: () => { yt.subs = subbed() ? yt.subs.filter(x => x !== k) : [...yt.subs, k]; save(); subBtn.textContent = subbed() ? 'subscribed' : 'subscribe'; subBtn.classList.toggle('on', subbed()); } }, subbed() ? 'subscribed' : 'subscribe');
    subBtn.classList.toggle('on', subbed());
    return h('div', { class: 'pb-yt pb-yt-chan' },
      h('div', { class: 'pb-yt-top' }, topBack(() => show('youtube', {}, 'pop')), h('span')),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'pb-yt-banner', style: { '--c': who(ref).color } }),
        h('div', { class: 'pb-yt-chhead' }, av(ref, 72),
          h('div', {}, h('h3', {}, who(ref).name), h('span', {}, `@${handleOf(ref)} · ${n(hashStr(k) % 900000 + 1000)} subscribers · ${vids.length} videos`))),
        isMe(ref) ? (mine ? h('button', { type: 'button', class: 'pb-yt-sub big', onclick: () => ytUpload(() => api.redraw()) }, 'upload') : null) : subBtn,
        h('div', { class: 'pb-yt-chtabs' }, h('b', {}, 'videos')),
        vids.length ? vids.map(card) : h('div', { class: 'pb-cmt-empty' }, 'no videos yet')));
  }

  // =====================================================================
  // twitter
  // =====================================================================
  const tw = d.twitter;
  for (const t of tw.tweets) { t.replies ||= []; }
  let twTab = 'home', twFeed = 'foryou', twWho = null;
  const isBlue = ref => tw.blue.includes(keyOf(ref));
  const nameLine = (ref, ts) => h('div', { class: 'pb-tw-name' }, h('b', {}, who(ref).name), isBlue(ref) ? verified() : null, h('span', {}, `@${handleOf(ref)}`), ts ? h('span', {}, `· ${shortAgo(ts)}`) : null);
  SCREENS.twitter = (params = {}) => {
    if (params.t) return thread(params.t);
    const root = h('div', { class: 'pb-tw' });
    const draw = () => fill(root,
      twTab === 'home' ? h('div', { class: 'pb-tw-head' },
        h('div', { class: 'pb-tw-headrow' }, h('button', { type: 'button', class: 'pb-tw-me', onclick: () => { twTab = 'profile'; twWho = null; draw(); } }, av(me(), 30)), marks.x(), h('button', { type: 'button', class: 'pb-ib', title: 'home', onclick: home }, ic('x'))),
        h('div', { class: 'pb-tw-tabs' }, [['foryou', 'for you'], ['following', 'following']].map(([v, l]) => h('button', { type: 'button', class: twFeed === v ? 'on' : '', onclick: () => { twFeed = v; draw(); } }, h('span', {}, l))))) : null,
      twTab === 'home' ? h('div', { class: 'ph-scroll pb-tw-feed' }, feedList()) : twTab === 'explore' ? explore() : twTab === 'notifs' ? notifs() : profile(),
      mine && twTab !== 'profile' ? h('button', { type: 'button', class: 'pb-tw-fab', title: 'post', onclick: () => compose() }, ic('plus')) : null,
      navBar([['home', 'home'], ['explore', 'search'], ['notifs', 'bell'], ['profile', 'user']], twTab, id => { twTab = id; twWho = null; draw(); }, 'pb-tw-nav'));
    function feedList() {
      let list = [...tw.tweets].reverse();
      if (twFeed === 'following') list = list.filter(t => !isMe(t.who) && who(t.who).char);
      return list.length ? list.map(t => tweet(t, draw)) : empty('1f426', 'post', () => compose());
    }
    function compose(replyTo = null, after = draw) {
      if (!mine) return;
      form(replyTo ? 'reply' : 'new post', [
        { key: 'who', label: 'posted by', type: 'who', value: me() },
        { key: 'text', label: 'what\'s happening?', type: 'area', max: 280, focus: true },
        replyTo ? null : { key: 'imageId', label: 'picture', type: 'pic' },
        { key: 'likes', label: 'likes', type: 'number', value: 0 },
        { key: 'blue', label: 'verified', type: 'check', value: false },
      ].filter(Boolean), v => {
        if (!v.text.trim() && !v.imageId) return false;
        const ref = freshRef(v.who);
        if (v.blue && !isBlue(ref)) tw.blue.push(keyOf(ref));
        const t = { id: uid(), who: ref, text: v.text.trim(), imageId: v.imageId || null, likes: v.likes, rts: Math.round(v.likes / 6), liked: false, rted: false, views: v.likes * 31 + 40, replies: [], at: Date.now() };
        if (replyTo) replyTo.replies.push(t); else tw.tweets.push(t);
        save();
        after();
      }, { okLabel: replyTo ? 'reply' : 'post' });
    }
    function explore() {
      const q = h('input', { type: 'text', class: 'pb-tw-search', placeholder: 'search', maxLength: 60, oninput: () => paintRes() });
      const res = h('div');
      const paintRes = () => {
        const v = q.value.trim().toLowerCase();
        fill(res, v ? [...tw.tweets].reverse().filter(t => t.text.toLowerCase().includes(v) || who(t.who).name.toLowerCase().includes(v)).map(t => tweet(t, draw)) : [
          h('div', { class: 'pb-tw-sect' }, h('b', {}, 'what\'s happening'), mine ? h('button', { type: 'button', class: 'pb-ib sm', title: 'add', onclick: addTrend }, ic('plus')) : null),
          tw.trends.length ? tw.trends.map((t, i) => h('div', { class: 'pb-tw-trend' },
            h('div', {}, h('span', {}, `${i + 1} · trending`), h('b', {}, t.tag), h('span', {}, `${n(t.count)} posts`)),
            mine ? h('button', { type: 'button', class: 'pb-ib sm', title: 'remove', onclick: () => { tw.trends.splice(i, 1); save(); paintRes(); } }, ic('dots')) : null))
            : h('div', { class: 'pb-cmt-empty' }, 'nothing trending'),
        ]);
      };
      const addTrend = () => form('add a trend', [{ key: 'tag', label: 'trend', focus: true, max: 40 }, { key: 'count', label: 'posts', type: 'number', value: 12400 }], v => { if (!v.tag.trim()) return false; tw.trends.push({ tag: v.tag.trim(), count: v.count }); save(); paintRes(); });
      paintRes();
      return h('div', { class: 'pb-tw-explore' }, h('div', { class: 'pb-tw-searchrow' }, av(me(), 30), q), h('div', { class: 'ph-scroll' }, res));
    }
    function notifs() {
      const mineT = tw.tweets.filter(t => isMe(t.who));
      const items = [
        ...mineT.flatMap(t => t.replies.filter(r => !isMe(r.who)).map(r => ({ at: r.at, ref: r.who, text: 'replied', body: r.text, t }))),
        ...mineT.filter(t => t.likes > 0).map(t => ({ at: t.at + 1, ref: null, text: `${n(t.likes)} people liked your post`, body: t.text, t })),
      ].sort((a, b) => b.at - a.at);
      return h('div', { class: 'pb-tw-notifs' }, h('div', { class: 'pb-tw-ptitle' }, 'notifications'),
        h('div', { class: 'ph-scroll' }, items.length ? items.map(x => h('button', { type: 'button', class: 'pb-tw-notif', onclick: () => show('twitter', { t: x.t.id }) },
          h('span', { class: 'pb-tw-notif-ic' + (x.ref ? '' : ' like') }, x.ref ? av(x.ref, 30) : ic('heart', { fill: true })),
          h('div', {}, h('b', {}, x.ref ? who(x.ref).name + ' ' : ''), x.text, h('p', {}, x.body)))) : h('div', { class: 'pb-cmt-empty' }, 'nothing yet')));
    }
    function profile() {
      const ref = twWho || me();
      const own = isMe(ref);
      const posts = [...tw.tweets].reverse().filter(t => sameWho(t.who, ref));
      return h('div', { class: 'ph-scroll pb-tw-prof' },
        h('div', { class: 'pb-tw-banner', style: { '--c': who(ref).color } }, own && tw.bannerId ? pic(tw.bannerId) : null,
          h('button', { type: 'button', class: 'pb-tw-bback', title: 'back', onclick: () => { twTab = 'home'; twWho = null; draw(); } }, ic('back'))),
        h('div', { class: 'pb-tw-prow' }, av(ref, 70, 'pb-tw-pav'),
          own && mine ? h('button', { type: 'button', class: 'pb-tw-edit', onclick: editProfile }, 'edit profile') : null),
        h('div', { class: 'pb-tw-pname' }, h('b', {}, who(ref).name), isBlue(ref) ? verified() : null),
        h('div', { class: 'pb-tw-phandle' }, '@' + handleOf(ref)),
        own && tw.bio ? h('p', { class: 'pb-tw-bio' }, tw.bio) : null,
        h('div', { class: 'pb-tw-follow' }, h('span', {}, h('b', {}, n(own ? tw.following : hashStr(keyOf(ref)) % 800)), ' following'), h('span', {}, h('b', {}, n(own ? tw.followers : hashStr(keyOf(ref)) % 50000)), ' followers')),
        h('div', { class: 'pb-tw-ptabs' }, h('b', { class: 'on' }, 'posts'), h('b', {}, 'replies'), h('b', {}, 'likes')),
        posts.length ? posts.map(t => tweet(t, draw)) : h('div', { class: 'pb-cmt-empty' }, 'no posts yet'));
    }
    function editProfile() {
      form('edit profile', [
        { key: 'bio', label: 'bio', type: 'area', value: tw.bio, max: 160 },
        { key: 'bannerId', label: 'header', type: 'pic', value: tw.bannerId },
        { key: 'followers', label: 'followers', type: 'number', value: tw.followers },
        { key: 'following', label: 'following', type: 'number', value: tw.following },
        { key: 'blue', label: 'verified', type: 'check', value: isBlue(me()) },
      ], v => {
        tw.bio = v.bio.trim(); tw.bannerId = v.bannerId; tw.followers = v.followers; tw.following = v.following;
        const k = keyOf(me());
        tw.blue = tw.blue.filter(x => x !== k);
        if (v.blue) tw.blue.push(k);
        save(); draw();
      });
    }
    function tweet(t, redrawFn, big = false, parent = null) {
      const like = h('button', { type: 'button', class: 'pb-tw-act like' + (t.liked ? ' on' : ''), disabled: !mine, onclick: e => { e.stopPropagation(); t.liked = !t.liked; t.likes = Math.max(0, t.likes + (t.liked ? 1 : -1)); save(); fill(like, ic('heart', { fill: t.liked }), h('span', {}, n(t.likes))); like.classList.toggle('on', t.liked); like.classList.remove('pop'); void like.offsetWidth; like.classList.add('pop'); } }, ic('heart', { fill: t.liked }), h('span', {}, n(t.likes)));
      const rt = h('button', { type: 'button', class: 'pb-tw-act rt' + (t.rted ? ' on' : ''), disabled: !mine, onclick: e => { e.stopPropagation(); t.rted = !t.rted; t.rts = Math.max(0, t.rts + (t.rted ? 1 : -1)); save(); fill(rt, ic('retweet'), h('span', {}, n(t.rts))); rt.classList.toggle('on', t.rted); } }, ic('retweet'), h('span', {}, n(t.rts)));
      return h('div', { class: 'pb-tw-tweet' + (big ? ' big' : ''), onclick: e => { if (!big && !parent && !e.target.closest('button')) show('twitter', { t: t.id }); } },
        h('button', { type: 'button', class: 'pb-tw-av', onclick: e => { e.stopPropagation(); if (big || parent) return; twWho = isMe(t.who) ? null : t.who; twTab = 'profile'; redrawFn(); } }, av(t.who, 38)),
        h('div', { class: 'pb-tw-body' },
          nameLine(t.who, big ? null : t.at),
          t.text ? h('div', { class: 'pb-tw-text' }, t.text.split(/([#@]\w+)/).map(w => /^[#@]/.test(w) ? h('span', { class: 'pb-tw-tag' }, w) : w)) : null,
          t.imageId ? pic(t.imageId, 'pb-tw-img') : null,
          big ? h('div', { class: 'pb-tw-when' }, new Date(t.at).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase(), ' · ', h('b', {}, n(t.views || 0)), ' views') : null,
          h('div', { class: 'pb-tw-acts' },
            h('span', { class: 'pb-tw-act' }, ic('comment'), h('span', {}, t.replies?.length ? n(t.replies.length) : '')),
            rt, like,
            h('span', { class: 'pb-tw-act' }, ic('views'), h('span', {}, n(t.views || 0))),
            mine ? h('button', { type: 'button', class: 'pb-tw-act', title: 'delete', onclick: e => { e.stopPropagation(); del('post', () => { if (parent) parent.replies = parent.replies.filter(x => x !== t); else tw.tweets = tw.tweets.filter(x => x !== t); dropImage(t.imageId); save(); if (big) show('twitter', {}, 'pop'); else redrawFn(); }); } }, ic('trash')) : null)));
    }
    SCREENS.twitter.tweet = tweet; SCREENS.twitter.compose = compose;
    draw();
    return root;
  };
  function thread(id) {
    const t = tw.tweets.find(x => x.id === id);
    if (!t) return SCREENS.twitter({});
    const root = h('div', { class: 'pb-tw pb-tw-thread' });
    const tmp = SCREENS.twitter({}); // builds the helpers
    const { tweet, compose } = SCREENS.twitter;
    void tmp;
    const draw = () => fill(root,
      h('div', { class: 'pb-tw-ptitle row' }, topBack(() => show('twitter', {}, 'pop')), h('b', {}, 'post')),
      h('div', { class: 'ph-scroll' }, tweet(t, draw, true),
        t.replies.map(r => tweet(r, draw, false, t))),
      mine ? h('button', { type: 'button', class: 'pb-tw-replybar', onclick: () => compose(t, draw) }, av(me(), 26), h('span', {}, 'post your reply')) : null);
    draw();
    return root;
  }

  // =====================================================================
  // tumblr
  // =====================================================================
  const tb = d.tumblr;
  for (const p of tb.posts) { p.layers ||= []; p.tags ||= []; }
  let tbTab = 'home', tbBlog = null;
  const blogOf = ref => ({ title: '', desc: '', color: who(ref).color, ...tb.blogs[keyOf(ref)] });
  SCREENS.tumblr = () => {
    const root = h('div', { class: 'pb-tb' });
    const draw = () => fill(root,
      tbTab === 'blog' ? blog() : tbTab === 'explore' ? explore() : tbTab === 'activity' ? activity() : dash(),
      navBar([['home', 'home'], ['explore', 'compass'], ['add'], ['activity', 'bell'], ['blog', 'user']], tbTab, id => { if (id === 'add') return newPost(); tbTab = id; tbBlog = null; draw(); }, 'pb-tb-nav'));
    function dash() {
      const list = [...tb.posts].reverse();
      return h('div', { class: 'pb-tb-dash' },
        h('div', { class: 'pb-tb-top' }, h('button', { type: 'button', class: 'pb-tb-home', onclick: home }, h('b', { class: 'pb-tb-t' }, 't')), h('div', { class: 'pb-tb-tabs' }, h('b', { class: 'on' }, 'following'), h('b', {}, 'for you'))),
        h('div', { class: 'ph-scroll pb-tb-feed' }, list.length ? list.map(p => postEl(p, draw)) : empty('1f4dd', 'post', newPost)));
    }
    function newPost() {
      if (!mine) return;
      form('new post', [
        { key: 'kind', label: 'type', type: 'select', value: 'text', options: [['text', 'text'], ['photo', 'photo'], ['quote', 'quote']] },
        { key: 'who', label: 'blog', type: 'who', value: me() },
        { key: 'title', label: 'title', max: 100 },
        { key: 'text', label: 'text / quote', type: 'area', max: 1200 },
        { key: 'source', label: 'quote source', max: 60 },
        { key: 'imageId', label: 'picture', type: 'pic' },
        { key: 'tags', label: 'tags', placeholder: 'tags, with, commas', max: 200 },
        { key: 'notes', label: 'notes', type: 'number', value: 0 },
      ], v => {
        if (!v.title.trim() && !v.text.trim() && !v.imageId) return false;
        const ref = freshRef(v.who);
        tb.posts.push({ id: uid(), who: ref, op: ref, content: { kind: v.kind, title: v.title.trim(), text: v.text.trim(), source: v.source.trim(), imageId: v.imageId }, layers: [], tags: tagsOf(v.tags), notes: v.notes, liked: false, at: Date.now() });
        save(); tbTab = 'home'; draw();
      }, { okLabel: 'post' });
    }
    function reblog(p) {
      if (!mine) return;
      form('reblog', [
        { key: 'who', label: 'reblog as', type: 'who', value: me() },
        { key: 'text', label: 'add something', type: 'area', max: 600 },
        { key: 'tags', label: 'tags', max: 200 },
      ], v => {
        const ref = freshRef(v.who);
        p.notes = (p.notes || 0) + 1;
        tb.posts.push({ id: uid(), who: ref, op: p.op, content: { ...p.content }, layers: [...p.layers, ...(v.text.trim() ? [{ who: ref, text: v.text.trim() }] : [])], tags: tagsOf(v.tags), notes: p.notes, liked: false, at: Date.now(), reblog: true, from: p.who });
        save(); tbTab = 'home'; draw();
      }, { okLabel: 'reblog' });
    }
    function content(c) {
      return h('div', { class: 'pb-tb-content kind-' + c.kind },
        c.imageId ? pic(c.imageId, 'pb-tb-img') : null,
        c.title ? h('h4', {}, c.title) : null,
        c.kind === 'quote' ? h('blockquote', {}, `“${c.text}”`) : c.text ? h('p', {}, c.text) : null,
        c.kind === 'quote' && c.source ? h('cite', {}, '— ' + c.source) : null);
    }
    function blogName(ref) {
      return h('button', { type: 'button', class: 'pb-tb-blogname', onclick: () => { tbBlog = ref; tbTab = 'blog'; draw(); } }, handleOf(ref).replace(/_/g, '-'));
    }
    function postEl(p, redrawFn) {
      const likeBtn = h('button', { type: 'button', class: 'pb-tb-act like' + (p.liked ? ' on' : ''), disabled: !mine, title: 'like', onclick: () => { p.liked = !p.liked; p.notes = Math.max(0, (p.notes || 0) + (p.liked ? 1 : -1)); save(); likeBtn.classList.toggle('on', p.liked); fill(likeBtn, ic('heart', { fill: p.liked })); notes.textContent = `${n(p.notes)} notes`; likeBtn.classList.remove('pop'); void likeBtn.offsetWidth; likeBtn.classList.add('pop'); } }, ic('heart', { fill: p.liked }));
      const notes = h('span', { class: 'pb-tb-notes' }, `${n(p.notes || 0)} notes`);
      const reblogged = p.reblog || p.layers.length;
      return h('article', { class: 'pb-tb-post', style: { '--bc': blogOf(p.who).color } },
        h('header', { class: 'pb-tb-head' }, av(p.who, 30, 'pb-tb-av'), blogName(p.who),
          reblogged ? h('span', { class: 'pb-tb-rbfrom' }, ic('retweet'), blogName(p.from || p.op)) : null,
          mine ? h('button', { type: 'button', class: 'pb-tb-more', title: 'delete', onclick: () => del('post', () => { tb.posts = tb.posts.filter(x => x !== p); if (p.content.imageId && !tb.posts.some(x => x.content.imageId === p.content.imageId)) dropImage(p.content.imageId); save(); redrawFn(); }) }, ic('dots')) : null),
        reblogged
          ? h('div', { class: 'pb-tb-chain' },
            h('div', { class: 'pb-tb-layer' }, h('div', { class: 'pb-tb-lhead' }, av(p.op, 20, 'pb-tb-av'), blogName(p.op)), content(p.content)),
            p.layers.map(l => h('div', { class: 'pb-tb-layer' }, h('div', { class: 'pb-tb-lhead' }, av(l.who, 20, 'pb-tb-av'), blogName(l.who)), h('p', {}, l.text))))
          : content(p.content),
        p.tags.length ? h('div', { class: 'pb-tb-tags' }, p.tags.map(t => h('span', {}, '#' + t))) : null,
        h('footer', { class: 'pb-tb-foot' }, notes,
          h('div', { class: 'pb-tb-acts' }, h('span', { class: 'pb-tb-act' }, ic('share')), h('span', { class: 'pb-tb-act' }, ic('comment')),
            h('button', { type: 'button', class: 'pb-tb-act rb', disabled: !mine, title: 'reblog', onclick: () => reblog(p) }, ic('retweet')), likeBtn)));
    }
    function explore() {
      const q = h('input', { type: 'text', class: 'pb-tb-search', placeholder: 'search tumblr', maxLength: 60, oninput: () => paint() });
      const res = h('div', { class: 'ph-scroll pb-tb-feed' });
      const allTags = [...new Set(tb.posts.flatMap(p => p.tags))];
      const paint = () => {
        const v = q.value.trim().toLowerCase().replace(/^#/, '');
        fill(res, !v ? h('div', { class: 'pb-tb-tagcloud' }, allTags.map(t => h('button', { type: 'button', onclick: () => { q.value = t; paint(); } }, '#' + t)))
          : [...tb.posts].reverse().filter(p => p.tags.some(t => t.includes(v)) || (p.content.text + ' ' + p.content.title).toLowerCase().includes(v)).map(p => postEl(p, paint)));
      };
      paint();
      return h('div', { class: 'pb-tb-dash' }, h('div', { class: 'pb-tb-top' }, q), res);
    }
    function activity() {
      const acts = tb.posts.filter(p => p.reblog && isMe(p.op) && !isMe(p.who)).sort((a, b) => b.at - a.at);
      return h('div', { class: 'pb-tb-dash' }, h('div', { class: 'pb-tb-top' }, h('b', { class: 'pb-tb-ptitle' }, 'activity')),
        h('div', { class: 'ph-scroll pb-tb-feed' }, acts.length ? acts.map(p => h('div', { class: 'pb-tb-actrow' }, av(p.who, 32, 'pb-tb-av'), h('div', {}, h('b', {}, handleOf(p.who).replace(/_/g, '-')), ' reblogged your post'), h('em', {}, shortAgo(p.at))))
          : h('div', { class: 'pb-cmt-empty light' }, 'nothing yet')));
    }
    function blog() {
      const ref = tbBlog || me();
      const b = blogOf(ref);
      const own = isMe(ref);
      const list = [...tb.posts].reverse().filter(p => sameWho(p.who, ref));
      return h('div', { class: 'pb-tb-dash' },
        h('div', { class: 'ph-scroll pb-tb-feed' },
          h('div', { class: 'pb-tb-bloghead', style: { '--bc': b.color } },
            tbBlog ? h('button', { type: 'button', class: 'pb-tw-bback', onclick: () => { tbTab = 'home'; tbBlog = null; draw(); } }, ic('back')) : null,
            av(ref, 76, 'pb-tb-bav'),
            h('h3', {}, b.title || who(ref).name), h('span', {}, handleOf(ref).replace(/_/g, '-')),
            b.desc ? h('p', {}, b.desc) : null,
            own && mine ? h('button', { type: 'button', class: 'pb-tb-editblog', onclick: () => editBlog(ref) }, 'edit appearance') : null),
          list.length ? list.map(p => postEl(p, draw)) : h('div', { class: 'pb-cmt-empty light' }, 'no posts yet')));
    }
    function editBlog(ref) {
      const b = blogOf(ref);
      form('edit appearance', [
        { key: 'title', label: 'blog title', value: b.title, max: 60 },
        { key: 'desc', label: 'description', type: 'area', value: b.desc, max: 300 },
        { key: 'color', label: 'theme color', type: 'color', value: b.color, options: ['#001935', '#ff4fa3', '#141114', '#b18cff', '#d81e5b', '#7df9d0', '#6ec6ff', '#ffd84d', '#5a1a2e', '#9b8aa8', '#ff6b35', '#2f6f4f'] },
      ], v => { tb.blogs[keyOf(ref)] = { title: v.title.trim(), desc: v.desc.trim(), color: v.color }; save(); draw(); });
    }
    draw();
    return root;
  };

  // =====================================================================
  // reddit
  // =====================================================================
  const rd = d.reddit;
  for (const p of rd.posts) p.comments ||= [];
  let rdSort = 'best', rdSub = null, rdTab = 'home';
  const score = x => x.score + (x.vote || 0);
  function voter(x, after, cls = '') {
    const el = h('div', { class: 'pb-rd-vote ' + cls + (x.vote > 0 ? ' up' : x.vote < 0 ? ' down' : '') });
    const paint = () => {
      el.className = 'pb-rd-vote ' + cls + (x.vote > 0 ? ' up' : x.vote < 0 ? ' down' : '');
      fill(el,
        h('button', { type: 'button', class: 'pb-rd-up', disabled: !mine, title: 'upvote', onclick: e => { e.stopPropagation(); x.vote = x.vote > 0 ? 0 : 1; save(); paint(); after?.(); } }, ic('up', { fill: x.vote > 0 })),
        h('b', {}, n(score(x))),
        h('button', { type: 'button', class: 'pb-rd-down', disabled: !mine, title: 'downvote', onclick: e => { e.stopPropagation(); x.vote = x.vote < 0 ? 0 : -1; save(); paint(); after?.(); } }, ic('down', { fill: x.vote < 0 })));
    };
    paint();
    return el;
  }
  const subOf = id => rd.subs.find(x => x.id === id);
  const subName = id => 'r/' + (subOf(id)?.name || 'all');
  SCREENS.reddit = (params = {}) => {
    if (params.p) return rdPost(params.p);
    const root = h('div', { class: 'pb-rd' });
    const draw = () => fill(root,
      rdTab === 'communities' ? communities() : rdTab === 'profile' ? profile() : feed(),
      navBar([['home', 'home', 'home'], ['communities', 'users', 'communities'], ['add', null, 'create'], ['profile', 'user', 'you']], rdTab, id => { if (id === 'add') return create(); rdTab = id; rdSub = id === 'home' ? rdSub : null; draw(); }, 'pb-rd-nav'));
    function feed() {
      let list = rd.posts.filter(p => !rdSub || p.sub === rdSub);
      list = rdSort === 'new' ? [...list].sort((a, b) => b.at - a.at) : [...list].sort((a, b) => score(b) - score(a));
      const sub = rdSub && subOf(rdSub);
      const joined = sub && rd.joined.includes(sub.id);
      return h('div', { class: 'pb-rd-main' },
        h('div', { class: 'pb-rd-top' }, h('button', { type: 'button', class: 'pb-rd-home', onclick: () => { if (rdSub) { rdSub = null; draw(); } else home(); } }, rdSub ? ic('back') : marks.reddit()), h('span', { class: 'pb-ib' }, ic('search'))),
        h('div', { class: 'ph-scroll pb-rd-feed' },
          sub ? h('div', { class: 'pb-rd-subhead', style: { '--c': sub.color } }, h('div', { class: 'pb-rd-sbanner' }),
            h('div', { class: 'pb-rd-srow' }, h('span', { class: 'pb-rd-sicon' }, 'r/'), h('div', {}, h('b', {}, 'r/' + sub.name), h('span', {}, `${n(sub.members)} members`)),
              h('button', { type: 'button', class: 'pb-rd-join' + (joined ? ' on' : ''), disabled: !mine, onclick: () => { rd.joined = joined ? rd.joined.filter(x => x !== sub.id) : [...rd.joined, sub.id]; save(); draw(); } }, joined ? 'joined' : 'join')),
            sub.about ? h('p', {}, sub.about) : null) : null,
          h('div', { class: 'pb-rd-sort' }, [['best', 'best'], ['new', 'new']].map(([v, l]) => h('button', { type: 'button', class: rdSort === v ? 'on' : '', onclick: () => { rdSort = v; draw(); } }, l))),
          list.length ? list.map(p => postCard(p, draw)) : empty('1f47d', 'create post', create)));
    }
    function communities() {
      return h('div', { class: 'pb-rd-main' },
        h('div', { class: 'pb-rd-top' }, h('b', { class: 'pb-rd-ptitle' }, 'communities'), mine ? h('button', { type: 'button', class: 'pb-ib', title: 'create a community', onclick: newSub }, ic('plus')) : null),
        h('div', { class: 'ph-scroll pb-rd-feed' }, rd.subs.length ? rd.subs.map(sb => h('button', { type: 'button', class: 'pb-rd-subrow', onclick: () => { rdSub = sb.id; rdTab = 'home'; draw(); } },
          h('span', { class: 'pb-rd-sicon', style: { '--c': sb.color } }, 'r/'), h('div', {}, h('b', {}, 'r/' + sb.name), h('span', {}, `${n(sb.members)} members`)),
          rd.joined.includes(sb.id) ? h('em', {}, 'joined') : null)) : empty('1f47d', 'create a community', newSub)));
    }
    function newSub(after = draw) {
      if (!mine) return;
      form('create a community', [
        { key: 'name', label: 'name', focus: true, max: 21, placeholder: 'r/' },
        { key: 'about', label: 'about', type: 'area', max: 300 },
        { key: 'members', label: 'members', type: 'number', value: 2400 },
        { key: 'color', label: 'color', type: 'color', value: '#ff4500', options: ['#ff4500', '#0079d3', '#46d160', '#ff4fa3', '#141114', '#b18cff', '#ffd635', '#7df9d0', '#d81e5b', '#5a1a2e'] },
      ], v => {
        const name = v.name.trim().replace(/^r\//i, '').replace(/\s+/g, '');
        if (!name) return false;
        rd.subs.push({ id: uid(), name, about: v.about.trim(), members: v.members, color: v.color });
        rd.joined.push(rd.subs.at(-1).id);
        save(); after();
      }, { okLabel: 'create' });
    }
    function create() {
      if (!mine) return;
      if (!rd.subs.length) return newSub(() => { draw(); create(); });
      form('create post', [
        { key: 'sub', label: 'community', type: 'select', value: rdSub || rd.subs[0].id, options: rd.subs.map(x => [x.id, 'r/' + x.name]) },
        { key: 'who', label: 'posted by', type: 'who', value: me() },
        { key: 'title', label: 'title', focus: true, max: 300 },
        { key: 'text', label: 'body text', type: 'area', max: 2000 },
        { key: 'imageId', label: 'picture', type: 'pic' },
        { key: 'score', label: 'upvotes', type: 'number', value: 1 },
      ], v => {
        if (!v.title.trim()) return false;
        rd.posts.push({ id: uid(), sub: v.sub, who: freshRef(v.who), title: v.title.trim(), text: v.text.trim(), imageId: v.imageId, score: v.score, vote: 0, comments: [], at: Date.now() });
        save(); rdTab = 'home'; draw();
      }, { okLabel: 'post' });
    }
    function profile() {
      const mineP = rd.posts.filter(p => isMe(p.who));
      const walk = list => list.reduce((a, c) => a + (isMe(c.who) ? score(c) : 0) + walk(c.replies || []), 0);
      const karma = mineP.reduce((a, p) => a + score(p), 0) + rd.posts.reduce((a, p) => a + walk(p.comments), 0);
      return h('div', { class: 'pb-rd-main' },
        h('div', { class: 'ph-scroll pb-rd-feed' },
          h('div', { class: 'pb-rd-prof', style: { '--c': char.color || '#ff4500' } }, av(me(), 72), h('h3', {}, 'u/' + handleOf(me())),
            h('div', { class: 'pb-rd-karma' }, h('div', {}, h('b', {}, n(karma)), h('span', {}, 'karma')), h('div', {}, h('b', {}, new Date(char.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase()), h('span', {}, 'cake day')))),
          mineP.length ? mineP.map(p => postCard(p, draw)) : h('div', { class: 'pb-cmt-empty' }, 'no posts yet')));
    }
    draw();
    return root;
  };
  function postCard(p, redrawFn) {
    const count = (list) => list.reduce((a, c) => a + 1 + count(c.replies || []), 0);
    return h('div', { class: 'pb-rd-post', onclick: e => { if (!e.target.closest('button')) show('reddit', { p: p.id }); } },
      h('div', { class: 'pb-rd-ptop' }, h('span', { class: 'pb-rd-sicon sm', style: { '--c': subOf(p.sub)?.color || '#ff4500' } }, 'r/'), h('b', {}, subName(p.sub)), h('span', {}, `· ${shortAgo(p.at)}`),
        mine ? h('button', { type: 'button', class: 'pb-ib sm pb-rd-pdel', title: 'delete', onclick: () => del('post', () => { rd.posts = rd.posts.filter(x => x !== p); dropImage(p.imageId); save(); redrawFn(); }) }, ic('dots')) : null),
      h('h4', {}, p.title),
      p.imageId ? pic(p.imageId, 'pb-rd-img') : p.text ? h('p', { class: 'pb-rd-text' }, p.text) : null,
      h('div', { class: 'pb-rd-bar' }, voter(p), h('span', { class: 'pb-rd-pill' }, ic('comment'), n(count(p.comments))), h('span', { class: 'pb-rd-pill' }, ic('share'), 'share')));
  }
  function rdPost(id) {
    const p = rd.posts.find(x => x.id === id);
    if (!p) return SCREENS.reddit({});
    const root = h('div', { class: 'pb-rd pb-rd-thread' });
    const draw = () => fill(root,
      h('div', { class: 'pb-rd-top' }, h('button', { type: 'button', class: 'pb-rd-home', onclick: () => show('reddit', {}, 'pop') }, ic('back')), h('b', { class: 'pb-rd-ptitle sm' }, subName(p.sub))),
      h('div', { class: 'ph-scroll pb-rd-feed' },
        h('div', { class: 'pb-rd-post big' },
          h('div', { class: 'pb-rd-ptop' }, h('b', {}, subName(p.sub)), h('span', {}, `· u/${handleOf(p.who)} · ${shortAgo(p.at)}`)),
          h('h4', {}, p.title),
          p.imageId ? pic(p.imageId, 'pb-rd-img') : null,
          p.text ? h('p', { class: 'pb-rd-text full' }, p.text) : null,
          h('div', { class: 'pb-rd-bar' }, voter(p), mine ? h('button', { type: 'button', class: 'pb-rd-pill', onclick: () => reply(p.comments) }, ic('comment'), 'reply') : null)),
        h('div', { class: 'pb-rd-cmts' }, p.comments.length ? p.comments.map(c => cmt(c, p.comments, 0)) : h('div', { class: 'pb-cmt-empty' }, 'no comments yet'))),
      mine ? h('button', { type: 'button', class: 'pb-tw-replybar pb-rd-addc', onclick: () => reply(p.comments) }, h('span', {}, 'join the conversation')) : null);
    function reply(list) {
      form('comment', [{ key: 'who', label: 'as', type: 'who', value: me() }, { key: 'text', label: 'comment', type: 'area', focus: true, max: 1000 }, { key: 'score', label: 'upvotes', type: 'number', value: 1 }], v => {
        if (!v.text.trim()) return false;
        list.push({ id: uid(), who: freshRef(v.who), text: v.text.trim(), score: v.score, vote: 0, replies: [], at: Date.now() });
        save(); draw();
      }, { okLabel: 'comment' });
    }
    function cmt(c, list, depth) {
      c.replies ||= [];
      return h('div', { class: 'pb-rd-c', style: { '--d': Math.min(depth, 5) } },
        h('div', { class: 'pb-rd-chead' }, av(c.who, 22), h('b', {}, handleOf(c.who)), isSameOp(c) ? h('em', {}, 'op') : null, h('span', {}, `· ${shortAgo(c.at)}`)),
        h('p', { class: 'pb-rd-ctext' }, c.text),
        h('div', { class: 'pb-rd-cbar' },
          mine ? h('button', { type: 'button', class: 'pb-rd-cbtn', onclick: () => reply(c.replies) }, ic('comment'), 'reply') : null,
          voter(c, null, 'sm'),
          mine ? h('button', { type: 'button', class: 'pb-rd-cbtn', title: 'delete', onclick: () => { list.splice(list.indexOf(c), 1); save(); draw(); } }, ic('trash')) : null),
        c.replies.length ? h('div', { class: 'pb-rd-kids' }, c.replies.map(r => cmt(r, c.replies, depth + 1))) : null);
    }
    const isSameOp = c => sameWho(c.who, p.who);
    draw();
    return root;
  }

  // =====================================================================
  // twitch
  // =====================================================================
  const tc = d.twitch;
  for (const st of tc.streams) st.chat ||= [];
  const CHAT_COLORS = ['#ff4f4f', '#2ecc71', '#5aa9ff', '#ff7ad9', '#ffd84d', '#b18cff', '#ff9b3d', '#3de0d0', '#9be564', '#ff6b8b'];
  const FILLER = ['lol', 'W', 'LETS GO', 'omg', 'hiii', 'lmaooo', 'no way', 'chat is this real', 'W stream', 'clip that', 'HAHAHA', 'real'];
  SCREENS.twitch = (params = {}, view) => {
    if (params.s) return stream(params.s, view);
    let tab = params.tab || 'following';
    const root = h('div', { class: 'pb-tc' });
    const draw = () => {
      const live = tc.streams.filter(x => x.live), off = tc.streams.filter(x => !x.live);
      const games = [...new Set(tc.streams.map(x => x.game).filter(Boolean))];
      fill(root,
        h('div', { class: 'pb-tc-top' }, h('button', { type: 'button', class: 'pb-tc-home', onclick: home }, marks.twitch()), h('b', {}, tab === 'following' ? 'following' : 'browse'),
          mine ? h('button', { type: 'button', class: 'pb-tc-golive', onclick: goLive }, 'go live') : h('span')),
        h('div', { class: 'ph-scroll pb-tc-body' },
          tab === 'following'
            ? [
              live.length ? h('div', { class: 'pb-tc-sect' }, 'live channels') : null,
              live.map(chanRow),
              off.length ? h('div', { class: 'pb-tc-sect' }, 'offline') : null,
              off.map(chanRow),
              !tc.streams.length ? empty('1f47e', 'go live', goLive) : null,
            ]
            : h('div', { class: 'pb-tc-games' }, games.length ? games.map((g, i) => h('div', { class: 'pb-tc-game', style: { '--h': (hashStr(g) % 360) + 'deg' } },
              h('div', { class: 'pb-tc-box' }, h('b', {}, g)), h('b', {}, g), h('span', {}, `${n(tc.streams.filter(x => x.game === g && x.live).reduce((a, x) => a + x.viewers, 0))} viewers`))) : h('div', { class: 'pb-cmt-empty light' }, 'nothing here yet'))),
        navBar([['following', 'heart', 'following'], ['browse', 'compass', 'browse']], tab, id => { tab = id; draw(); }, 'pb-tc-nav'));
    };
    function chanRow(st) {
      return h('button', { type: 'button', class: 'pb-tc-row' + (st.live ? ' live' : ''), onclick: () => show('twitch', { s: st.id }) },
        h('div', { class: 'pb-tc-rowpic' }, st.imageId ? pic(st.imageId) : av(st.who, 60), st.live ? h('span', { class: 'pb-tc-badge' }, 'LIVE') : null, st.live ? h('span', { class: 'pb-tc-vc' }, `${n(st.viewers)} viewers`) : null),
        h('div', { class: 'pb-tc-rowtxt' }, h('div', { class: 'pb-tc-rowname' }, av(st.who, 22, st.live ? 'pb-tc-ring' : ''), h('b', {}, who(st.who).name)), h('span', {}, st.title || 'untitled stream'), st.game ? h('em', {}, st.game) : null));
    }
    function goLive() {
      if (!mine) return;
      form('go live', [
        { key: 'who', label: 'streamer', type: 'who', value: me() },
        { key: 'title', label: 'stream title', focus: true, max: 140 },
        { key: 'game', label: 'category', placeholder: 'just chatting', max: 40 },
        { key: 'imageId', label: 'stream picture', type: 'pic' },
        { key: 'viewers', label: 'viewers', type: 'number', value: 1337 },
        { key: 'live', label: 'live now', type: 'check', value: true },
      ], v => {
        tc.streams.push({ id: uid(), who: freshRef(v.who), title: v.title.trim(), game: v.game.trim() || 'just chatting', imageId: v.imageId, viewers: v.viewers, live: v.live, chat: [], at: Date.now() });
        save(); draw();
      }, { okLabel: 'save' });
    }
    draw();
    return root;
  };
  function stream(id, view) {
    const st = tc.streams.find(x => x.id === id);
    if (!st) return SCREENS.twitch({});
    let viewers = st.viewers, fast = false;
    const vc = h('b');
    const chat = h('div', { class: 'ph-scroll pb-tc-chat' });
    const colorOf = ref => CHAT_COLORS[hashStr(keyOf(ref)) % CHAT_COLORS.length];
    const line = (m, temp = false) => h('div', { class: 'pb-tc-msg' + (temp ? ' temp' : '') }, h('b', { style: { color: m.color || colorOf(m.who) } }, who(m.who).name), ': ', h('span', {}, m.text));
    const paintChat = () => { fill(chat, st.chat.map(m => line(m))); chat.scrollTop = chat.scrollHeight; };
    const as = asPicker(me());
    const input = h('input', { type: 'text', class: 'pb-tc-input', maxLength: 200, placeholder: 'send a message', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } } });
    function send() {
      const text = input.value.trim();
      if (!text) return;
      st.chat.push({ id: uid(), who: freshRef(as.get()), text, at: Date.now() });
      if (st.chat.length > 200) st.chat.shift();
      input.value = '';
      save();
      chat.append(line(st.chat.at(-1)));
      chat.scrollTop = chat.scrollHeight;
    }
    let nextFast = 0;
    const iv = setInterval(() => {
      if (!view.isConnected) return;
      if (st.live) { viewers = Math.max(1, Math.round(viewers + (Math.random() - .45) * Math.max(3, viewers * .01))); vc.textContent = n(viewers); }
      if (fast && Date.now() > nextFast) {
        nextFast = Date.now() + 250 + Math.random() * 700;
        const src = st.chat.length && Math.random() < .7 ? st.chat[Math.floor(Math.random() * st.chat.length)] : { who: { name: ['nightowl', 'spookyspice', 'batfan99', 'velvetvamp', 'xoxo_ghost', 'moonchild'][Math.floor(Math.random() * 6)] }, text: FILLER[Math.floor(Math.random() * FILLER.length)] };
        chat.append(line(src, true));
        while (chat.children.length > 120) chat.firstChild.remove();
        chat.scrollTop = chat.scrollHeight;
      }
    }, 120);
    api.onLeave(() => clearInterval(iv));
    vc.textContent = n(viewers);
    const followed = () => tc.follows.includes(st.id);
    const followBtn = h('button', { type: 'button', class: 'pb-tc-follow', title: 'follow', disabled: !mine, onclick: () => { tc.follows = followed() ? tc.follows.filter(x => x !== st.id) : [...tc.follows, st.id]; save(); paintF(); } });
    const paintF = () => { fill(followBtn, ic('heart', { fill: followed() })); followBtn.classList.toggle('on', followed()); };
    paintF();
    const subBtn = h('button', { type: 'button', class: 'pb-tc-sub', disabled: !mine, onclick: () => { st.subbed = !st.subbed; save(); subBtn.textContent = st.subbed ? 'subscribed' : 'subscribe'; subBtn.classList.toggle('on', !!st.subbed); } }, st.subbed ? 'subscribed' : 'subscribe');
    subBtn.classList.toggle('on', !!st.subbed);
    const fastBtn = h('button', { type: 'button', class: 'pb-tc-fast', onclick: () => { fast = !fast; fastBtn.classList.toggle('on', fast); } }, 'fast chat');
    paintChat();
    return h('div', { class: 'pb-tc pb-tc-stream' },
      h('div', { class: 'pb-tc-video' }, st.imageId ? pic(st.imageId, 'pb-tc-vimg') : h('div', { class: 'pb-tc-vblank', style: { '--c': who(st.who).color } }, av(st.who, 70)),
        st.live ? h('span', { class: 'pb-tc-badge big' }, 'LIVE') : h('span', { class: 'pb-tc-badge off' }, 'offline'),
        st.live ? h('span', { class: 'pb-tc-vcount' }, s('svg', { viewBox: '0 0 24 24', class: 'pb-ic' }, s('path', { d: P.user[0], fill: 'currentColor' })), vc) : null,
        h('button', { type: 'button', class: 'pb-yt-pback', title: 'back', onclick: () => show('twitch', {}, 'pop') }, ic('back'))),
      h('div', { class: 'pb-tc-info' },
        av(st.who, 40, st.live ? 'pb-tc-ring' : ''),
        h('div', { class: 'pb-tc-infotxt' }, h('b', {}, who(st.who).name), h('span', {}, st.title || 'untitled stream'), h('em', {}, st.game)),
        followBtn),
      h('div', { class: 'pb-tc-btnrow' }, subBtn, fastBtn,
        mine ? h('button', { type: 'button', class: 'pb-tc-fast', onclick: () => { st.live = !st.live; save(); api.redraw(); } }, st.live ? 'end stream' : 'go live') : null,
        mine ? h('button', { type: 'button', class: 'pb-tc-fast', title: 'delete', onclick: () => del('channel', () => { tc.streams = tc.streams.filter(x => x !== st); dropImage(st.imageId); save(); show('twitch', {}, 'pop'); }) }, ic('trash')) : null),
      h('div', { class: 'pb-tc-chathead' }, 'stream chat'),
      chat,
      mine ? h('div', { class: 'pb-tc-compose' }, as.el, input, h('button', { type: 'button', class: 'pb-tc-send', onclick: send }, 'chat')) : null);
  }

  // =====================================================================
  // spotify
  // =====================================================================
  const sp = d.spotify;
  let spTab = 'home', spNow = null, spPlaying = false, spAt = 0;
  // the oc's real playlist (plays in the page player) as its own playlist
  const realList = () => ({ id: '__real', name: `${nameOf(char)}'s songs`, real: true, songs: char.playlist.map((x, i) => ({ id: x.id, title: x.title || 'untitled', artist: nameOf(char), index: i })) });
  const lists = () => [...(char.playlist.length ? [realList()] : []), { id: '__liked', name: 'liked songs', liked: true, songs: sp.liked }, ...sp.playlists];
  const listById = id => lists().find(l => l.id === id);
  const songKey = sg => sg.id;
  const isLiked = sg => sp.liked.some(x => x.title === sg.title && (x.artist || '') === (sg.artist || ''));
  function spPlay(list, i) {
    const sg = list.songs[i];
    if (!sg) return;
    spNow = { list: list.id, i };
    spAt = 0;
    if (list.real) {
      spPlaying = false;
      document.querySelectorAll('.player .player-song')[sg.index]?.click();
    } else {
      const st = playerState();
      if (st?.playing) document.querySelector('.player .player-btn.big')?.click();
      spPlaying = true;
    }
  }
  const nowSong = () => { const l = spNow && listById(spNow.list); return l ? { list: l, song: l.songs[spNow.i] } : null; };
  const nowPlayingReal = () => { const ns = nowSong(); const st = playerState(); return ns?.list.real && st && st.title === ns.song?.title ? st : null; };
  const isPlaying = () => { const r = nowPlayingReal(); return r ? r.playing : spPlaying; };
  function spToggle() {
    const ns = nowSong(); if (!ns) return;
    if (ns.list.real) { const r = nowPlayingReal(); if (r) document.querySelector('.player .player-btn.big')?.click(); else spPlay(ns.list, spNow.i); } else spPlaying = !spPlaying;
  }
  function spStep(k) {
    const ns = nowSong(); if (!ns || !ns.list.songs.length) return;
    const len = ns.list.songs.length;
    const i = sp.shuffle && len > 1 ? (spNow.i + 1 + Math.floor(Math.random() * (len - 1))) % len : (spNow.i + k + len) % len;
    spPlay(ns.list, i);
  }
  const cover = (l, size = 'md') => h('div', { class: `pb-sp-cover ${size}${l.liked ? ' liked' : ''}`, style: { '--h': (hashStr(l.id + l.name) % 360) + 'deg' } },
    l.imageId ? pic(l.imageId) : l.liked ? ic('heart', { fill: true }) : l.real ? portrait(char, 'pb-sp-cpfp') : h('b', {}, size === 'xs' || size === 'sm' ? l.name.slice(0, 1) : l.name));
  SCREENS.spotify = (params = {}, view) => {
    if (params.full) return spFull(view);
    if (params.list) return spList(params.list, view);
    const root = h('div', { class: 'pb-sp' });
    const hr = new Date().getHours();
    const draw = () => fill(root,
      h('div', { class: 'ph-scroll pb-sp-body' },
        spTab === 'home' ? [
          h('div', { class: 'pb-sp-top' }, h('button', { type: 'button', class: 'pb-sp-me', onclick: home }, av(me(), 30)), h('div', { class: 'pb-chips dark' }, h('span', { class: 'pb-chip on' }, 'all'), h('span', { class: 'pb-chip' }, 'music'), h('span', { class: 'pb-chip' }, 'podcasts'))),
          h('h3', { class: 'pb-sp-hi' }, hr < 12 ? 'good morning' : hr < 18 ? 'good afternoon' : 'good evening'),
          h('div', { class: 'pb-sp-tiles' }, lists().slice(0, 6).map(l => h('button', { type: 'button', class: 'pb-sp-tile', onclick: () => show('spotify', { list: l.id }) }, cover(l, 'sm'), h('b', {}, l.name)))),
          h('h4', { class: 'pb-sp-row-t' }, `made for ${nameOf(char)}`),
          h('div', { class: 'pb-sp-row' }, lists().map(l => h('button', { type: 'button', class: 'pb-sp-card', onclick: () => show('spotify', { list: l.id }) }, cover(l, 'lg'), h('b', {}, l.name), h('span', {}, `${l.songs.length} ${l.songs.length === 1 ? 'song' : 'songs'}`)))),
          wrappedCard(),
        ] : spTab === 'search' ? search() : library()),
      miniPlayer(),
      navBar([['home', 'home', 'home'], ['search', 'search', 'search'], ['library', 'library', 'your library']], spTab, id => { spTab = id; draw(); }, 'pb-sp-nav'));
    function library() {
      return [
        h('div', { class: 'pb-sp-top' }, av(me(), 30), h('b', { class: 'pb-sp-libt' }, 'your library'), mine ? h('button', { type: 'button', class: 'pb-ib', title: 'create playlist', onclick: newList }, ic('plus')) : null),
        lists().map(l => h('button', { type: 'button', class: 'pb-sp-librow', onclick: () => show('spotify', { list: l.id }) }, cover(l, 'sm'), h('div', {}, h('b', {}, l.name), h('span', {}, `playlist · ${l.real ? nameOf(char) : l.liked ? `${l.songs.length} ${l.songs.length === 1 ? 'song' : 'songs'}` : nameOf(char)}`)))),
      ];
    }
    function newList() {
      form('create playlist', [{ key: 'name', label: 'name', focus: true, max: 60 }, { key: 'imageId', label: 'cover', type: 'pic' }], v => {
        if (!v.name.trim()) return false;
        sp.playlists.push({ id: uid(), name: v.name.trim(), imageId: v.imageId, songs: [] });
        save(); show('spotify', { list: sp.playlists.at(-1).id });
      }, { okLabel: 'create' });
    }
    function search() {
      const q = h('input', { type: 'text', class: 'pb-sp-search', placeholder: 'what do you want to listen to?', maxLength: 60, oninput: () => paint() });
      const res = h('div');
      const all = lists().flatMap(l => l.songs.map((sg, i) => ({ l, sg, i })));
      const paint = () => {
        const v = q.value.trim().toLowerCase();
        fill(res, v ? all.filter(x => (x.sg.title + ' ' + (x.sg.artist || '')).toLowerCase().includes(v)).map(x => songRow(x.l, x.sg, x.i, draw))
          : h('div', { class: 'pb-sp-browse' }, ['pop', 'rock', 'emo', 'indie', 'chill', 'party', 'sad', 'throwback'].map((g, i) => h('div', { class: 'pb-sp-genre', style: { '--h': (i * 47) % 360 + 'deg' } }, g))));
      };
      paint();
      return [h('h3', { class: 'pb-sp-hi' }, 'search'), q, res];
    }
    const iv = setInterval(() => { if (view.isConnected) { const m = root.querySelector('.pb-sp-mini'); if (m) m.replaceWith(miniPlayer()); } }, 500);
    api.onLeave(() => clearInterval(iv));
    draw();
    return root;
  };
  function wrappedCard() {
    const w = sp.wrapped;
    const has = w.artists.length || w.songs.length || w.minutes;
    if (!has && !mine) return null;
    return h('div', { class: 'pb-sp-wrapped' },
      h('div', { class: 'pb-sp-wtop' }, h('b', {}, `${new Date().getFullYear()} wrapped`), mine ? h('button', { type: 'button', class: 'pb-sp-wedit', onclick: editWrapped }, has ? 'edit' : 'make it') : null),
      has ? [
        h('div', { class: 'pb-sp-wmin' }, h('b', {}, n(w.minutes)), h('span', {}, 'minutes listened')),
        h('div', { class: 'pb-sp-wcols' },
          h('div', {}, h('em', {}, 'top artists'), w.artists.slice(0, 5).map((a, i) => h('div', {}, h('i', {}, i + 1), a))),
          h('div', {}, h('em', {}, 'top songs'), w.songs.slice(0, 5).map((a, i) => h('div', {}, h('i', {}, i + 1), a)))),
      ] : null);
  }
  function editWrapped() {
    const w = sp.wrapped;
    form('wrapped', [
      { key: 'minutes', label: 'minutes listened', type: 'number', value: w.minutes || 41300 },
      { key: 'artists', label: 'top artists (one per line)', type: 'area', value: w.artists.join('\n') },
      { key: 'songs', label: 'top songs (one per line)', type: 'area', value: w.songs.join('\n') },
    ], v => {
      sp.wrapped = { minutes: v.minutes, artists: v.artists.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 5), songs: v.songs.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 5) };
      save(); api.redraw();
    });
  }
  function songRow(l, sg, i, after) {
    const ns = nowSong();
    const on = ns && ns.list.id === l.id && spNow.i === i;
    return h('div', { class: 'pb-sp-song' + (on ? ' on' : ''), onclick: e => { if (e.target.closest('button')) return; spPlay(l, i); api.redraw(); } },
      h('div', { class: 'pb-sp-stxt' }, h('b', {}, sg.title), h('span', {}, sg.artist || nameOf(char))),
      mine && !l.real ? h('button', {
        type: 'button', class: 'pb-sp-heart' + (isLiked(sg) ? ' on' : ''), title: 'like', onclick: () => {
          if (isLiked(sg)) sp.liked = sp.liked.filter(x => !(x.title === sg.title && (x.artist || '') === (sg.artist || '')));
          else sp.liked.push({ id: uid(), title: sg.title, artist: sg.artist || '' });
          save(); after?.();
        },
      }, ic('heart', { fill: isLiked(sg) })) : null,
      mine && !l.real && !l.liked ? h('button', { type: 'button', class: 'pb-sp-x', title: 'remove', onclick: () => { l.songs.splice(i, 1); save(); after?.(); } }, ic('x')) : null);
  }
  function miniPlayer() {
    const ns = nowSong();
    if (!ns?.song) return h('div', { class: 'pb-sp-mini hidden' });
    return h('div', { class: 'pb-sp-mini', onclick: e => { if (!e.target.closest('button')) show('spotify', { full: 1 }, 'push'); } },
      cover(ns.list, 'xs'),
      h('div', { class: 'pb-sp-mtxt' }, h('b', {}, ns.song.title), h('span', {}, ns.song.artist || nameOf(char))),
      h('button', { type: 'button', class: 'pb-sp-mplay', title: isPlaying() ? 'pause' : 'play', onclick: () => { spToggle(); api.redraw(); } }, ic(isPlaying() ? 'pause' : 'play', { fill: true })),
      h('i', { class: 'pb-sp-mprog', style: { width: (progress() * 100) + '%' } }));
  }
  function progress() {
    const r = nowPlayingReal();
    if (r) return r.seek;
    return spAt;
  }
  const spIv = setInterval(() => { if (!api.screen.isConnected) return clearInterval(spIv); if (spPlaying) { spAt += .004; if (spAt >= 1) { spAt = 0; if (sp.repeat) return; spStep(1); } } }, 400);
  function spList(id, view) {
    const l = listById(id);
    if (!l) return SCREENS.spotify({});
    const root = h('div', { class: 'pb-sp pb-sp-list', style: { '--h': (hashStr(l.id + l.name) % 360) + 'deg' } });
    const draw = () => fill(root,
      h('div', { class: 'ph-scroll pb-sp-body' },
        h('div', { class: 'pb-sp-lhead' }, h('button', { type: 'button', class: 'pb-sp-lback', title: 'back', onclick: () => show('spotify', {}, 'pop') }, ic('back')), cover(l, 'xl')),
        h('h3', { class: 'pb-sp-ltitle' }, l.name),
        h('div', { class: 'pb-sp-lby' }, av(me(), 20), h('b', {}, nameOf(char)), h('span', {}, `· ${l.songs.length} ${l.songs.length === 1 ? 'song' : 'songs'}`)),
        h('div', { class: 'pb-sp-lbar' },
          h('button', { type: 'button', class: 'pb-sp-shuf' + (sp.shuffle ? ' on' : ''), title: 'shuffle', onclick: () => { sp.shuffle = !sp.shuffle; if (mine) save(); draw(); } }, ic('shuffle')),
          mine && !l.real && !l.liked ? h('button', { type: 'button', class: 'pb-ib', title: 'add a song', onclick: addSong }, ic('plus')) : null,
          mine && !l.real && !l.liked ? h('button', { type: 'button', class: 'pb-ib', title: 'delete playlist', onclick: () => del('playlist', () => { sp.playlists = sp.playlists.filter(x => x.id !== l.id); dropImage(l.imageId); save(); show('spotify', {}, 'pop'); }) }, ic('trash')) : null,
          h('button', { type: 'button', class: 'pb-sp-bigplay', title: 'play', onclick: () => { const ns = nowSong(); if (ns?.list.id === l.id) spToggle(); else spPlay(l, sp.shuffle ? Math.floor(Math.random() * l.songs.length) : 0); draw(); } },
            ic(nowSong()?.list.id === l.id && isPlaying() ? 'pause' : 'play', { fill: true }))),
        l.songs.length ? l.songs.map((sg, i) => songRow(l, sg, i, draw)) : h('div', { class: 'pb-cmt-empty light' }, 'no songs yet')),
      miniPlayer());
    function addSong() {
      form('add a song', [{ key: 'title', label: 'song', focus: true, max: 80 }, { key: 'artist', label: 'artist', max: 80 }], v => {
        if (!v.title.trim()) return false;
        l.songs.push({ id: uid(), title: v.title.trim(), artist: v.artist.trim() });
        save(); draw();
      }, { okLabel: 'add' });
    }
    const iv = setInterval(() => { if (view.isConnected) { const m = root.querySelector('.pb-sp-mini'); if (m) m.replaceWith(miniPlayer()); } }, 500);
    api.onLeave(() => clearInterval(iv));
    draw();
    return root;
  }
  function spFull(view) {
    const ns = nowSong();
    if (!ns?.song) return SCREENS.spotify({});
    const root = h('div', { class: 'pb-sp pb-sp-full', style: { '--h': (hashStr(ns.list.id + ns.list.name) % 360) + 'deg' } });
    const bar = h('i'), t0 = h('span'), t1 = h('span');
    const playBtn = h('button', { type: 'button', class: 'pb-sp-fplay', title: 'play', onclick: () => { spToggle(); paint(); } });
    const len = 200 + hashStr(ns.song.title) % 60;
    const paint = () => {
      const cur = nowSong();
      fill(playBtn, ic(isPlaying() ? 'pause' : 'play', { fill: true }));
      const p = progress();
      bar.style.width = (p * 100) + '%';
      t0.textContent = clockOf(p * len); t1.textContent = '-' + clockOf((1 - p) * len);
      if (cur && cur.song !== ns.song) api.redraw();
    };
    const iv = setInterval(() => { if (view.isConnected) paint(); }, 400);
    api.onLeave(() => clearInterval(iv));
    const liked = isLiked(ns.song);
    fill(root,
      h('div', { class: 'pb-sp-ftop' }, h('button', { type: 'button', class: 'pb-sp-lback', title: 'back', onclick: () => show('spotify', {}, 'pop') }, ic('back')), h('div', {}, h('span', {}, 'playing from playlist'), h('b', {}, ns.list.name)), h('span')),
      h('div', { class: 'pb-sp-fart' }, cover(ns.list, 'xxl')),
      h('div', { class: 'pb-sp-ftitle' }, h('div', {}, h('b', {}, ns.song.title), h('span', {}, ns.song.artist || nameOf(char))),
        mine && !ns.list.real ? h('button', { type: 'button', class: 'pb-sp-heart big' + (liked ? ' on' : ''), title: 'like', onclick: () => { if (isLiked(ns.song)) sp.liked = sp.liked.filter(x => !(x.title === ns.song.title && (x.artist || '') === (ns.song.artist || ''))); else sp.liked.push({ id: uid(), title: ns.song.title, artist: ns.song.artist || '' }); save(); api.redraw(); } }, ic('heart', { fill: liked })) : null),
      h('div', { class: 'pb-sp-fbar' }, bar), h('div', { class: 'pb-sp-ftimes' }, t0, t1),
      h('div', { class: 'pb-sp-fctl' },
        h('button', { type: 'button', class: 'pb-sp-ctl' + (sp.shuffle ? ' on' : ''), title: 'shuffle', onclick: e => { sp.shuffle = !sp.shuffle; if (mine) save(); e.currentTarget.classList.toggle('on', sp.shuffle); } }, ic('shuffle')),
        h('button', { type: 'button', class: 'pb-sp-ctl big', title: 'back', onclick: () => { spStep(-1); api.redraw(); } }, ic('prev', { fill: true })),
        playBtn,
        h('button', { type: 'button', class: 'pb-sp-ctl big', title: 'skip', onclick: () => { spStep(1); api.redraw(); } }, ic('next', { fill: true })),
        h('button', { type: 'button', class: 'pb-sp-ctl' + (sp.repeat ? ' on' : ''), title: 'repeat', onclick: e => { sp.repeat = !sp.repeat; if (mine) save(); e.currentTarget.classList.toggle('on', sp.repeat); } }, ic('repeat'))));
    paint();
    return root;
  }

  // =====================================================================
  // netflix
  // =====================================================================
  const nf = d.netflix;
  let nfWho = null, nfFilter = 'all';
  SCREENS.netflix = (params = {}, view) => {
    if (params.show) return nfShow(params.show, view, !!params.play);
    if (!nfWho) return whoWatching();
    const root = h('div', { class: 'pb-nf' });
    const draw = () => {
      let list = [...nf.shows].reverse();
      if (nfFilter === 'show') list = list.filter(x => x.kind === 'show');
      if (nfFilter === 'movie') list = list.filter(x => x.kind === 'movie');
      if (nfFilter === 'mylist') list = list.filter(x => x.mylist);
      const hero = list[0];
      const cont = list.filter(x => x.progress > 0 && x.progress < 100);
      const mylist = list.filter(x => x.mylist);
      fill(root,
        h('div', { class: 'ph-scroll pb-nf-body' },
          h('div', { class: 'pb-nf-top' }, h('button', { type: 'button', class: 'pb-nf-logo', onclick: home }, marks.netflix()), h('span'),
            mine ? h('button', { type: 'button', class: 'pb-ib', title: 'add a show', onclick: add }, ic('plus')) : null,
            h('button', { type: 'button', class: 'pb-nf-pf', title: 'switch profiles', onclick: () => { nfWho = null; api.redraw(); } }, av(nfWho, 26, 'pb-nf-sq'))),
          h('div', { class: 'pb-chips dark' }, [['all', 'all'], ['show', 'shows'], ['movie', 'movies'], ['mylist', 'my list']].map(([v, l]) => h('button', { type: 'button', class: 'pb-chip' + (nfFilter === v ? ' on' : ''), onclick: () => { nfFilter = v; draw(); } }, l))),
          hero ? h('div', { class: 'pb-nf-hero', onclick: e => { if (!e.target.closest('button')) show('netflix', { show: hero.id }); } },
            poster(hero, 'hero'),
            h('div', { class: 'pb-nf-herobtns' },
              h('button', { type: 'button', class: 'pb-nf-play', onclick: () => show('netflix', { show: hero.id, play: 1 }) }, ic('play', { fill: true }), 'play'),
              h('button', { type: 'button', class: 'pb-nf-mylist', disabled: !mine, onclick: () => { hero.mylist = !hero.mylist; save(); draw(); } }, ic(hero.mylist ? 'check' : 'plus'), 'my list'))) : empty('1f37f', 'add a show', add),
          cont.length ? row(`continue watching for ${who(nfWho).name}`, cont, true) : null,
          mylist.length && nfFilter !== 'mylist' ? row('my list', mylist) : null,
          list.length > 1 ? row('trending now', list.slice(1)) : null,
          list.length > 2 ? row(`because you watched ${list[0].title}`, [...list].reverse()) : null));
    };
    function row(title, items, prog = false) {
      return h('div', { class: 'pb-nf-row' }, h('b', { class: 'pb-nf-rowt' }, title),
        h('div', { class: 'pb-nf-strip' }, items.map(x => h('button', { type: 'button', class: 'pb-nf-item', onclick: () => show('netflix', { show: x.id }) }, poster(x), prog ? h('i', { class: 'pb-nf-prog' }, h('i', { style: { width: x.progress + '%' } })) : null))));
    }
    function add() { nfForm(null, draw); }
    draw();
    return root;
  };
  function poster(x, cls = '') {
    return h('div', { class: 'pb-nf-poster ' + cls, style: { '--h': (hashStr(x.title) % 360) + 'deg' } },
      x.imageId ? pic(x.imageId) : null, h('span', { class: 'pb-nf-n' }, 'N'), h('b', { class: 'pb-nf-ptitle' }, x.title));
  }
  function nfForm(x, after) {
    if (!mine) return;
    form(x ? 'edit' : 'add a show', [
      { key: 'title', label: 'title', value: x?.title || '', focus: true, max: 60 },
      { key: 'imageId', label: 'poster', type: 'pic', value: x?.imageId || null },
      { key: 'kind', label: 'type', type: 'select', value: x?.kind || 'show', options: [['show', 'show'], ['movie', 'movie']] },
      { key: 'year', label: 'year', value: x?.year || String(new Date().getFullYear()), max: 4 },
      { key: 'seasons', label: 'seasons / length', value: x?.seasons || '1 season', max: 20 },
      { key: 'desc', label: 'description', type: 'area', value: x?.desc || '', max: 400 },
      { key: 'progress', label: 'watched %', type: 'number', value: x?.progress ?? 0 },
      { key: 'mylist', label: 'in my list', type: 'check', value: x?.mylist ?? false },
    ], v => {
      if (!v.title.trim()) return false;
      const data = { title: v.title.trim(), imageId: v.imageId, kind: v.kind, year: v.year.trim(), seasons: v.seasons.trim(), desc: v.desc.trim(), progress: Math.max(0, Math.min(100, v.progress)), mylist: v.mylist };
      if (x) Object.assign(x, data); else nf.shows.push({ id: uid(), ...data, at: Date.now() });
      save(); after();
    }, { okLabel: x ? 'save' : 'add' });
  }
  function whoWatching() {
    const people = [me(), ...allOcs(char.id).slice(0, 4).map(o => ({ id: o.id, name: nameOf(o) }))];
    return h('div', { class: 'pb-nf pb-nf-who' },
      h('div', { class: 'pb-nf-whotop' }, h('button', { type: 'button', class: 'pb-nf-logo', onclick: home }, marks.netflix())),
      h('h3', {}, 'who\'s watching?'),
      h('div', { class: 'pb-nf-whogrid' }, people.map(p => h('button', { type: 'button', class: 'pb-nf-whobtn', onclick: () => { nfWho = p; api.redraw(); } }, av(p, 84, 'pb-nf-sq'), h('span', {}, who(p).name)))));
  }
  function nfShow(id, view, startPlaying) {
    const x = nf.shows.find(y => y.id === id);
    if (!x) return SCREENS.netflix({});
    const root = h('div', { class: 'pb-nf pb-nf-detail' });
    let playing = startPlaying;
    const draw = () => fill(root,
      h('div', { class: 'ph-scroll pb-nf-body' },
        h('div', { class: 'pb-nf-back' }, poster(x, 'wide'), h('button', { type: 'button', class: 'pb-yt-pback', title: 'back', onclick: () => show('netflix', {}, 'pop') }, ic('back'))),
        h('div', { class: 'pb-nf-info' },
          h('h3', {}, x.title),
          h('div', { class: 'pb-nf-meta' }, h('b', {}, `${90 + hashStr(x.title) % 10}% match`), h('span', {}, x.year), h('em', {}, '13+'), h('span', {}, x.seasons), h('em', {}, 'HD')),
          h('button', { type: 'button', class: 'pb-nf-wplay', onclick: () => watchIt() }, ic('play', { fill: true }), x.progress > 0 && x.progress < 100 ? 'resume' : 'play'),
          x.progress > 0 ? h('div', { class: 'pb-nf-dprog' }, h('i', { class: 'pb-nf-prog' }, h('i', { style: { width: x.progress + '%' } })), h('span', {}, `${Math.round(x.progress)}%`)) : null,
          x.desc ? h('p', { class: 'pb-nf-desc' }, x.desc) : null,
          h('div', { class: 'pb-nf-acts' },
            h('button', { type: 'button', disabled: !mine, onclick: () => { x.mylist = !x.mylist; save(); draw(); } }, ic(x.mylist ? 'check' : 'plus'), 'my list'),
            h('button', { type: 'button', disabled: !mine, onclick: () => { x.rated = !x.rated; save(); draw(); } }, ic('thumb', { cls: x.rated ? 'on' : '' }), 'rate'),
            mine ? h('button', { type: 'button', onclick: () => nfForm(x, draw) }, ic('edit'), 'edit') : null,
            mine ? h('button', { type: 'button', onclick: () => del('show', () => { nf.shows = nf.shows.filter(y => y !== x); dropImage(x.imageId); save(); show('netflix', {}, 'pop'); }) }, ic('trash'), 'delete') : null),
          x.kind === 'show' ? h('div', { class: 'pb-nf-eps' }, h('b', { class: 'pb-nf-rowt' }, 'episodes'),
            Array.from({ length: Math.min(8, (parseInt(x.seasons, 10) || 1) * 4) }, (_, i) => h('div', { class: 'pb-nf-ep' }, poster(x, 'ep'), h('div', {}, h('b', {}, `${i + 1}. episode ${i + 1}`), h('span', {}, `${40 + hashStr(x.title + i) % 20}m`))))) : null)),
      playing ? player() : null);
    function watchIt() { playing = true; draw(); }
    function player() {
      const bar = h('i');
      let p = x.progress >= 100 ? 0 : x.progress;
      const el = h('div', { class: 'pb-nf-player' },
        poster(x, 'full'),
        h('div', { class: 'pb-nf-pui' },
          h('button', { type: 'button', class: 'pb-nf-pclose', title: 'close', onclick: () => { clearInterval(iv); playing = false; if (mine) { x.progress = Math.round(p); save(); } draw(); } }, ic('x')),
          h('b', {}, x.title),
          h('div', { class: 'pb-nf-pbar' }, bar)));
      const iv = setInterval(() => { if (!el.isConnected) return clearInterval(iv); p = Math.min(100, p + .5); bar.style.width = p + '%'; }, 300);
      bar.style.width = p + '%';
      api.onLeave(() => { clearInterval(iv); if (mine && playing) { x.progress = Math.round(p); save(); } });
      return el;
    }
    draw();
    return root;
  }
}
