// locker: a real metal school locker. the dial spins the combo, the latch lifts, the door swings open in 3d.
// decorate the inside of the door + the back wall, stand books on the shelf, hang stuff on the hooks.

import { h, s, fill, swatches, segmented, openModal, uid } from '../ui.js';
import { appBar, uploadPic } from './kit.js';
import { store } from '../store.js';
import { stickerNode } from '../diary/stickers.js';
import { dragLayer, fitStage, toolBar, deleteKey, defaults, newThing, chipTabs } from './room-layer.js';
import { LOCKER_PIECES, lockerPiece, LOCKER_STICKERS } from './locker-pieces.js';
import { shade } from './room-pieces.js';

export const meta = { id: 'locker', label: 'locker', icon: '1f512' };

const W = 760, H = 920, LW = 340, LH = 860, LX = 400, LY = 30;
const OPEN_DEG = -170;
export const LOCKER_COLORS = {
  pink: '#ff8ac4', black: '#2b2830', purple: '#8a5cd6', gray: '#8e99a5', glitter: '#ff5fa8', red: '#c8263a', mint: '#8fd9c0', blue: '#4a78c2',
};
const BOOK_COLORS = ['#141114', '#ff4fa3', '#ff8ac4', '#b18cff', '#6b3fa0', '#e0323f', '#7a1b2a', '#f6eefb', '#7df9d0', '#6ec6ff', '#ffd84d', '#2a4a3a'];
const BOOK_FONTS = ["'Special Elite', monospace", "'UnifrakturMaguntia', serif", "'Caveat', cursive", "'Permanent Marker', cursive", "'Fredoka', sans-serif", "'Playfair Display', serif", "'Creepster', cursive"];
const NOTE_FONTS = ["'Reenie Beanie', cursive", "'Indie Flower', cursive", "'Gloria Hallelujah', cursive", "'Shadows Into Light', cursive", "'Homemade Apple', cursive", "'Permanent Marker', cursive", "'Patrick Hand', cursive"];
const PIECE_COLORS = ['#141114', '#ffffff', '#ff4fa3', '#ff8ac4', '#fff27a', '#b18cff', '#7df9d0', '#6ec6ff', '#e0323f', '#ffd84d', '#2a2230', '#ffb38a'];

const rnd = () => Math.floor(Math.random() * 40);
const book = (title, color, ht, w, font, lean = 0) => ({ id: 'b_' + uid(), title, color, h: ht, w, font, lean });
const DEF = {
  color: 'pink', number: '213', combo: [24, 6, 31],
  books: null, door: null, inside: null,
};
const starter = d => {
  d.books = [
    book('algebra', '#141114', 150, 34, BOOK_FONTS[0]),
    book('spells', '#7a1b2a', 140, 30, BOOK_FONTS[1]),
    book('sketchbook', '#ff8ac4', 126, 40, BOOK_FONTS[2]),
    book('bio', '#b18cff', 146, 28, BOOK_FONTS[4]),
    book('manga 3', '#f6eefb', 118, 24, BOOK_FONTS[3], -12),
  ];
  d.door = [
    newThing({ kind: 'piece', p: 'mirror', x: 170, y: 170, k: .95, color: '#141114' }),
    newThing({ kind: 'piece', p: 'photo', x: 92, y: 400, k: .62, r: -8, color: '#ff4fa3' }),
    newThing({ kind: 'piece', p: 'note', x: 238, y: 410, k: .7, r: 5, color: '#ff8ac4', text: 'meet @ the\nbleachers ♥' }),
    newThing({ kind: 'piece', p: 'board', x: 170, y: 640, k: .95, color: '#e0323f' }),
    newThing({ kind: 'sticker', s: 'e:1f987', x: 270, y: 300, k: .6, r: 12 }),
    newThing({ kind: 'sticker', s: 'e:1f5a4', x: 70, y: 540, k: .5, r: -10 }),
  ];
  d.inside = [
    newThing({ kind: 'piece', p: 'poster', x: 170, y: 560, k: .95, text: 'midnight bats', style: 'goth' }),
    newThing({ kind: 'piece', p: 'hoodie', x: 104, y: 348, k: .82, color: '#141114', color2: '#ff4fa3' }),
    newThing({ kind: 'piece', p: 'bag', x: 246, y: 372, k: .78, color: '#2a2230', color2: '#ff4fa3' }),
    newThing({ kind: 'sticker', s: 'e:1f480', x: 280, y: 770, k: .55, r: -8 }),
  ];
};

// ---------- drawn bits ----------

function vents(y) {
  return h('div', { class: 'lk-vents', style: { top: y + 'px' } }, Array.from({ length: 7 }, () => h('i')));
}

function dial() {
  const ticks = [];
  for (let i = 0; i < 40; i++) {
    const a = (i * 9 - 90) * Math.PI / 180, long = i % 5 === 0;
    ticks.push(s('line', { x1: (50 + Math.cos(a) * 38).toFixed(2), y1: (50 + Math.sin(a) * 38).toFixed(2), x2: (50 + Math.cos(a) * (long ? 31 : 34)).toFixed(2), y2: (50 + Math.sin(a) * (long ? 31 : 34)).toFixed(2), stroke: '#f6f6f6', 'stroke-width': long ? 1.6 : .9 }));
    if (long) ticks.push(s('text', { x: (50 + Math.cos(a) * 25).toFixed(2), y: (50 + Math.sin(a) * 25 + 2.6).toFixed(2), 'font-size': 7.5, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'Nunito, sans-serif', 'font-weight': 800 }, String(i)));
  }
  const face = s('g', { class: 'lk-dial-face' },
    s('circle', { cx: 50, cy: 50, r: 41, fill: 'url(#lkDialG)' }), ...ticks,
    s('circle', { cx: 50, cy: 50, r: 13, fill: 'url(#lkKnobG)', stroke: '#000', 'stroke-width': 1 }),
    s('path', { d: 'M50 38 V44', stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round' }));
  return s('svg', { viewBox: '0 0 100 100', width: 110, height: 110, class: 'lk-dial' },
    s('defs', {},
      s('radialGradient', { id: 'lkDialG', cx: '.4', cy: '.35', r: '.75' }, s('stop', { offset: 0, 'stop-color': '#3c3a42' }), s('stop', { offset: 1, 'stop-color': '#0d0c10' })),
      s('radialGradient', { id: 'lkKnobG', cx: '.35', cy: '.3', r: '.8' }, s('stop', { offset: 0, 'stop-color': '#6a6872' }), s('stop', { offset: 1, 'stop-color': '#1a191e' })),
      s('linearGradient', { id: 'lkBezelG', x1: 0, y1: 0, x2: 1, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#ffffff' }), s('stop', { offset: .5, 'stop-color': '#9aa0aa' }), s('stop', { offset: 1, 'stop-color': '#e8eaee' }))),
    s('circle', { cx: 50, cy: 50, r: 48, fill: 'url(#lkBezelG)', stroke: '#6d717d', 'stroke-width': 1 }),
    face,
    s('path', { d: 'M46 2 L54 2 L50 9 Z', fill: '#e0323f' }));
}

function door(front, back) {
  return h('div', { class: 'lk-door' }, front, back, h('i', { class: 'lk-door-edge' }));
}

function frontFace(number, onOpen) {
  const face = h('div', { class: 'lk-face lk-front' },
    h('div', { class: 'lk-plate' }, h('span', {}, number)),
    vents(64), vents(700),
    h('div', { class: 'lk-dial-wrap', onclick: onOpen }, dial(), h('span', { class: 'lk-readout' })),
    h('div', { class: 'lk-handle', onclick: onOpen }, h('i', { class: 'lk-lever' })),
    h('i', { class: 'lk-hinge a' }), h('i', { class: 'lk-hinge b' }), h('i', { class: 'lk-hinge c' }),
    h('i', { class: 'lk-dent' }));
  return face;
}

function neighbor(x, num) {
  return h('div', { class: 'lk-neighbor', style: { left: x + 'px' } },
    h('div', { class: 'lk-face lk-front' },
      h('div', { class: 'lk-plate' }, h('span', {}, num)),
      vents(64), vents(700),
      h('div', { class: 'lk-dial-wrap still' }, dial()),
      h('div', { class: 'lk-handle' }, h('i', { class: 'lk-lever' })),
      h('i', { class: 'lk-hinge a' }), h('i', { class: 'lk-hinge b' }), h('i', { class: 'lk-hinge c' })));
}

function spine(b, onclick) {
  return h('button', {
    type: 'button', class: 'lk-book', title: b.title, onclick,
    style: { '--bc': b.color, '--bc2': shade(b.color, -.3), '--bc3': shade(b.color, .25), height: b.h + 'px', width: b.w + 'px', transform: b.lean ? `rotate(${b.lean}deg)` : '', color: luminous(b.color) ? '#1a1418' : '#fff' },
  }, h('span', { style: { fontFamily: b.font } }, b.title));
}
function luminous(hex) {
  const c = hex.replace('#', '');
  const [r, g, bl] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + bl * 114) / 1000 > 150;
}

// ---------- the app ----------

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  if (!Array.isArray(d.door)) { starter(d); if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let open = false, busy = false;
  let target = 'door', tab = 'stuff';
  let bar = null;
  let picked = null; // which layer the picked thing lives in

  // ---- pieces ----
  function thing(it) {
    if (it.kind === 'sticker') return h('div', { class: 'lk-stk' }, stickerNode(it.s));
    const p = lockerPiece(it.p);
    return p ? p.draw(it) : h('span');
  }
  const mkLayer = (items, which) => dragLayer({
    items, editable: edit, cls: 'lk-items lk-items-' + which, render: thing,
    bounds: () => ({ x0: 0, y0: 0, x1: LW, y1: LH }),
    onChange: save,
    onPick: (it, live) => {
      if (live) return bar?.sync();
      if (it) { picked = which; (which === 'door' ? insideLayer : doorLayer).select(null); }
      drawPick(it, which);
    },
  });
  const doorLayer = mkLayer(d.door, 'door');
  const insideLayer = mkLayer(d.inside, 'inside');
  const layerOf = which => (which === 'door' ? doorLayer : insideLayer);

  // ---- the locker ----
  const shelf = h('div', { class: 'lk-books' });
  const inside = h('div', { class: 'lk-inside' },
    h('i', { class: 'lk-back' }),
    shelf,
    h('i', { class: 'lk-shelf' }),
    h('div', { class: 'lk-hooks' }, h('i'), h('i'), h('i')),
    insideLayer.el,
    h('i', { class: 'lk-inner-shade' }));
  const front = frontFace(d.number, () => toggle());
  const backFace = h('div', { class: 'lk-face lk-backface' }, h('i', { class: 'lk-back-metal' }), doorLayer.el, h('i', { class: 'lk-hinge-in' }));
  const doorEl = door(front, backFace);
  const mine = h('div', { class: 'lk-mine' }, h('i', { class: 'lk-frame' }), inside, doorEl);
  const scene = h('div', { class: 'lk-scene' },
    h('i', { class: 'lk-wall' }), h('i', { class: 'lk-floor' }),
    neighbor(LX - 700, String(+d.number - 2 || 211)), neighbor(LX - 350, String(+d.number - 1 || 212)),
    h('i', { class: 'lk-trim' }),
    mine);
  const stageWrap = h('div', { class: 'lk-stage' }, scene);
  const pickBar = h('div', { class: 'rl-pick lk-pick', hidden: true });
  const panel = h('div', { class: 'lk-panel' });
  const openBtn = h('button', { class: 'btn sm primary lk-open-btn', onclick: () => toggle() }, '🔓 open');

  el.append(appBar(ctx, meta, openBtn), h('div', { class: 'lk-app' }, stageWrap, pickBar, edit ? panel : null));

  function paint() {
    const c = LOCKER_COLORS[d.color] || d.color || LOCKER_COLORS.pink;
    for (const [k, v] of Object.entries({ '--lc': c, '--lcd': shade(c, -.28), '--lcl': shade(c, .22), '--lcdd': shade(c, -.55) })) mine.style.setProperty(k, v);
    mine.classList.toggle('glitter', d.color === 'glitter');
    front.querySelector('.lk-plate span').textContent = d.number || ' ';
  }

  function drawBooks() {
    fill(shelf, d.books.map(b => spine(b, edit ? () => editBook(b) : undefined)));
  }

  // ---- opening + closing ----
  const dialFace = () => front.querySelector('.lk-dial-face');
  let dialAngle = 0;
  const readout = () => front.querySelector('.lk-readout');
  function spinTo(nums, ms = 1700) {
    const t = nums.map(n => -n * 9);
    const a0 = dialAngle;
    const a1 = t[0] + 360 * Math.ceil((a0 + 720 - t[0]) / 360);
    const a2 = t[1] + 360 * Math.floor((a1 - 360 - t[1]) / 360);
    const a3 = t[2] + 360 * Math.ceil((a2 - t[2]) / 360);
    const dist = [a1 - a0, a1 - a2, a3 - a2].map(Math.abs), total = dist[0] + dist[1] + dist[2] || 1;
    const o1 = dist[0] / total, o2 = (dist[0] + dist[1]) / total;
    const f = dialFace();
    f.style.transformOrigin = '50px 50px';
    const anim = f.animate([
      { transform: `rotate(${a0}deg)` }, { transform: `rotate(${a1}deg)`, offset: o1 }, { transform: `rotate(${a2}deg)`, offset: o2 }, { transform: `rotate(${a3}deg)` },
    ], { duration: ms, easing: 'cubic-bezier(.4, 0, .3, 1)', fill: 'forwards' });
    dialAngle = a3 % 360;
    const r = readout();
    r.textContent = '';
    r.classList.add('on');
    setTimeout(() => { r.textContent = nums[0]; }, ms * o1);
    setTimeout(() => { r.textContent = nums[0] + ' · ' + nums[1]; }, ms * o2);
    setTimeout(() => { r.textContent = nums.join(' · '); }, ms);
    return anim.finished.then(() => { f.style.transform = `rotate(${a3}deg)`; anim.cancel(); });
  }

  async function toggle(want = !open) {
    if (busy || want === open) return;
    busy = true;
    const lever = front.querySelector('.lk-lever');
    if (want) {
      openBtn.disabled = true;
      await spinTo(d.combo.map(n => Math.max(0, Math.min(39, +n || 0))));
      await lever.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' }).finished;
      readout().classList.remove('on');
      mine.classList.add('opening');
      const a = doorEl.animate([
        { transform: 'rotateY(0deg)' }, { transform: 'rotateY(-12deg)', offset: .12 }, { transform: `rotateY(${OPEN_DEG - 8}deg)`, offset: .78 }, { transform: `rotateY(${OPEN_DEG}deg)` },
      ], { duration: 1050, easing: 'cubic-bezier(.3, .1, .3, 1)' });
      await a.finished;
      doorEl.style.transform = `rotateY(${OPEN_DEG}deg)`;
      lever.getAnimations().forEach(x => x.cancel());
      open = true;
      mine.classList.add('open');
      mine.classList.remove('opening');
    } else {
      doorLayer.select(null); insideLayer.select(null);
      mine.classList.remove('open');
      mine.classList.add('opening');
      const a = doorEl.animate([
        { transform: `rotateY(${OPEN_DEG}deg)` }, { transform: 'rotateY(3deg)', offset: .82 }, { transform: 'rotateY(-1.5deg)', offset: .92 }, { transform: 'rotateY(0deg)' },
      ], { duration: 800, easing: 'cubic-bezier(.5, 0, .7, 1)' });
      await a.finished;
      doorEl.style.transform = '';
      mine.classList.remove('opening');
      scene.classList.remove('slam');
      void scene.offsetWidth;
      scene.classList.add('slam');
      open = false;
      spinTo([rnd(), rnd(), rnd()], 700).then(() => readout().classList.remove('on'));
    }
    openBtn.disabled = false;
    openBtn.textContent = open ? '🔒 close' : '🔓 open';
    busy = false;
  }

  // ---- picked thing ----
  function drawPick(it, which) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { bar = null; fill(pickBar); return; }
    const L = layerOf(which);
    const p = it.kind === 'piece' ? lockerPiece(it.p) : null;
    const extra = [];
    for (const [label, key, def] of p?.colors || []) {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, label), swatches(it[key] || def, v => { it[key] = v; L.refresh(it); save(); }, PIECE_COLORS)));
    }
    if (p?.text) {
      const input = p.long
        ? h('textarea', { rows: 2, maxLength: 80, value: it.text ?? p.text, class: 'lk-textarea', oninput: e => { it.text = e.target.value; L.refresh(it); save(); } })
        : h('input', { type: 'text', maxLength: 24, value: it.text ?? p.text, oninput: e => { it.text = e.target.value; L.refresh(it); save(); } });
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'words'), input));
    }
    if (it.p === 'note' || it.p === 'board') {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'writing'), h('div', { class: 'rm-fonts' }, NOTE_FONTS.map(f => h('button', {
        type: 'button', class: 'rm-font' + ((it.font || NOTE_FONTS[0]) === f ? ' on' : ''), style: { fontFamily: f },
        onclick: e => { it.font = f; L.refresh(it); save(); e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); },
      }, 'Aa')))));
    }
    if (p?.caption) {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'caption'), h('input', { type: 'text', maxLength: 24, value: it.text || '', oninput: e => { it.text = e.target.value; L.refresh(it); save(); } })));
    }
    if (p?.styles) {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'style'), segmented(p.styles.map(v => ({ value: v, label: v })), it.style || 'goth', v => { it.style = v; L.refresh(it); save(); })));
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'tour'), h('input', { type: 'text', maxLength: 24, value: it.sub ?? 'world tour', oninput: e => { it.sub = e.target.value; L.refresh(it); save(); } })));
    }
    if (p?.pic) {
      extra.push(h('div', { class: 'rl-field' },
        h('button', { type: 'button', class: 'btn sm', onclick: async () => {
          const up = await uploadPic(1000);
          if (!up) return;
          if (it.imageId) store.deleteImage(it.imageId);
          it.imageId = up.imageId;
          L.refresh(it); save(); drawPick(it, which);
        } }, it.imageId ? 'change picture' : '+ picture'),
        it.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { store.deleteImage(it.imageId); it.imageId = null; L.refresh(it); save(); drawPick(it, which); } }, 'no picture') : null));
    }
    extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'move to'), segmented([{ value: 'door', label: 'door' }, { value: 'inside', label: 'back wall' }], which, v => moveTo(it, which, v))));
    bar = toolBar(L, it, save, { extra });
    fill(pickBar, bar);
  }
  function moveTo(it, from, to) {
    if (from === to) return;
    const A = from === 'door' ? d.door : d.inside, B = to === 'door' ? d.door : d.inside;
    A.splice(A.indexOf(it), 1);
    B.push(it);
    layerOf(from).draw(); layerOf(from).select(null);
    layerOf(to).draw(); layerOf(to).select(it.id);
    save();
  }

  // ---- adding ----
  async function add(fields, p) {
    if (!open) await toggle(true);
    const where = p?.hang ? 'inside' : target;
    const it = newThing({ x: Math.round(LW / 2 + (Math.random() - .5) * 120), y: Math.round((p?.hang ? 370 : 460) + (Math.random() - .5) * 200), ...fields });
    layerOf(where).add(it);
  }
  function addPiece(p) {
    const it = { kind: 'piece', p: p.id, k: p.k || 1 };
    for (const [, key, def] of p.colors || []) it[key] = def;
    if (p.text) it.text = p.text;
    add(it, p);
  }

  // ---- books ----
  function editBook(b) {
    const isNew = !d.books.includes(b);
    const preview = h('div', { class: 'lk-book-preview' });
    const redraw = () => { fill(preview, spine(b)); if (!isNew) drawBooks(); };
    const fontRow = h('div', { class: 'rm-fonts' }, BOOK_FONTS.map(f => h('button', {
      type: 'button', class: 'rm-font' + (b.font === f ? ' on' : ''), style: { fontFamily: f },
      onclick: e => { b.font = f; fontRow.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); redraw(); },
    }, 'Aa')));
    const slider = (label, key, min, max) => h('label', { class: 'rl-slide' }, h('span', {}, label), h('input', { type: 'range', class: 'rl-size', min, max, value: b[key], oninput: e => { b[key] = +e.target.value; redraw(); } }));
    redraw();
    openModal({
      title: isNew ? 'new book' : 'book',
      body: h('div', { class: 'lk-book-edit' }, preview,
        h('div', { class: 'lk-book-fields' },
          h('input', { type: 'text', value: b.title, maxLength: 22, 'data-autofocus': true, oninput: e => { b.title = e.target.value; redraw(); } }),
          swatches(b.color, v => { b.color = v; redraw(); }, BOOK_COLORS),
          fontRow,
          slider('tall', 'h', 90, 166), slider('thick', 'w', 18, 48), slider('lean', 'lean', -20, 20))),
      actions: [
        isNew ? null : { label: 'take it out', kind: 'danger', onClick: close => { d.books.splice(d.books.indexOf(b), 1); drawBooks(); save(); drawPanel(); close(); } },
        { label: 'done', kind: 'primary', onClick: close => { if (isNew) d.books.push(b); drawBooks(); save(); drawPanel(); close(); } },
      ].filter(Boolean),
      onClose: () => { drawBooks(); save(); },
    });
  }

  // ---- panel ----
  const tabsEl = chipTabs([['stuff', 'stuff'], ['stickers', 'stickers'], ['books', 'books'], ['locker', 'locker']], tab, v => { tab = v; drawPanel(); });
  const body = h('div', { class: 'lk-panel-body' });
  if (edit) panel.append(tabsEl, body);
  const targetPick = () => h('div', { class: 'rm-group' }, h('h4', {}, 'stick it on'), segmented([{ value: 'door', label: 'door' }, { value: 'inside', label: 'back wall' }], target, v => { target = v; }));
  const cell = (label, node, onclick) => h('button', { type: 'button', class: 'rm-cell', onclick, title: label }, h('span', { class: 'rm-cell-art' }, node), h('span', { class: 'rm-cell-name' }, label));
  const preview = p => {
    const it = { text: p.text };
    for (const [, key, def] of p.colors || []) it[key] = def;
    const sc = Math.min(74 / p.w, 62 / p.h);
    return h('span', { class: 'rm-prev', style: { width: p.w + 'px', height: p.h + 'px', transform: `translate(-50%, -50%) scale(${sc})` } }, p.draw(it));
  };

  function drawPanel() {
    if (!edit) return;
    if (tab === 'stuff') {
      fill(body, targetPick(), h('div', { class: 'rm-grid' }, LOCKER_PIECES.map(p => cell(p.label, preview(p), () => addPiece(p)))));
    } else if (tab === 'stickers') {
      fill(body, targetPick(), h('div', { class: 'rm-grid stk' }, LOCKER_STICKERS.map(code => h('button', { type: 'button', class: 'rm-cell stkc', onclick: () => add({ kind: 'sticker', s: 'e:' + code, k: .6, r: Math.round((Math.random() - .5) * 24) }) }, stickerNode('e:' + code)))));
    } else if (tab === 'books') {
      fill(body, h('div', { class: 'lk-book-list' },
        d.books.map(b => h('button', { type: 'button', class: 'lk-book-row', onclick: () => editBook(b) }, h('i', { style: { background: b.color } }), h('span', { style: { fontFamily: b.font } }, b.title || '—'))),
        h('button', { type: 'button', class: 'btn sm', onclick: () => editBook(book('new book', BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)], 130, 30, BOOK_FONTS[0])) }, '+ book')));
    } else {
      fill(body,
        h('div', { class: 'rm-group' }, h('h4', {}, 'color'), h('div', { class: 'lk-colors' }, Object.entries(LOCKER_COLORS).map(([name, c]) => h('button', {
          type: 'button', class: 'lk-color' + (d.color === name ? ' on' : '') + (name === 'glitter' ? ' glitter' : ''), dataset: { color: name }, style: { '--c': c },
          onclick: () => { d.color = name; paint(); save(); drawPanel(); },
        }, h('i'), h('span', {}, name))))),
        h('div', { class: 'rm-group lk-row' },
          h('label', { class: 'rl-field' }, h('span', {}, 'number'), h('input', { type: 'text', value: d.number, maxLength: 4, class: 'lk-num', oninput: e => { d.number = e.target.value; paint(); save(); } })),
          h('div', { class: 'rl-field' }, h('span', {}, 'combo'), d.combo.map((v, i) => h('input', {
            type: 'number', min: 0, max: 39, value: v, class: 'lk-combo',
            oninput: e => { d.combo[i] = Math.max(0, Math.min(39, Math.round(+e.target.value || 0))); save(); },
          })))));
    }
  }

  paint();
  drawBooks();
  drawPanel();
  const unfit = fitStage(stageWrap, scene, W, H, 1);
  const unkey = edit ? deleteKey({ get selected() { return layerOf(picked)?.selected; }, removeSelected: () => layerOf(picked)?.removeSelected() }) : () => {};
  return () => { unfit(); unkey(); };
}
