// polaroid wall: a corkboard in a wooden frame. pin up polaroids, notes + ticket stubs, tie them together
// with string that sags like real string, string fairy lights across the top. tap a photo to see it big.

import { h, s, fill, swatches, segmented, openModal, pickFiles, shrinkImage, toast } from '../ui.js';
import { appBar, uploadPic } from './kit.js';
import { store } from '../store.js';
import { stickerNode, TAPES } from '../diary/stickers.js';
import { dragLayer, fitStage, toolBar, deleteKey, defaults, newThing, picImg, chipTabs } from './room-layer.js';
import { cropAll } from '../crop.js';

export const meta = { id: 'polaroids', label: 'polaroid wall', icon: '1f4f8' };

const W = 1000, H = 680, EDGE = 30;
const PIN_COLORS = ['#e0323f', '#ff4fa3', '#141114', '#f6eefb', '#ffd84d', '#b18cff', '#7df9d0', '#6ec6ff'];
const STRING_COLORS = ['#d81e3a', '#ff4fa3', '#141114', '#f6eefb', '#b18cff', '#d8b14f', '#7df9d0'];
const NOTE_COLORS = ['#fff27a', '#ffd1e6', '#ff8ac4', '#c9b3f2', '#b5f0dc', '#ffffff', '#141114', '#ffb38a'];
const FONTS = ["'Reenie Beanie', cursive", "'Caveat', cursive", "'Indie Flower', cursive", "'Gloria Hallelujah', cursive", "'Shadows Into Light', cursive", "'Homemade Apple', cursive", "'Permanent Marker', cursive", "'Special Elite', monospace"];
const BOARDS = { cork: 'cork', 'dark cork': 'darkcork', 'pink felt': 'pinkfelt', 'black felt': 'blackfelt' };
const FRAMES = { oak: ['#a8743f', '#7a5129', '#c99a62'], walnut: ['#5b3a24', '#3b2516', '#7a5238'], black: ['#26222a', '#0f0d11', '#433d49'], white: ['#f4efe9', '#cfc6bc', '#ffffff'], pink: ['#ff8ac4', '#d6578f', '#ffc2dc'] };
const LIGHTS = { warm: ['#ffd58a', '#ffe7b0'], pink: ['#ff7eb6', '#ffc2dc'], rainbow: ['#ff5d6c', '#ffd84d', '#9be564', '#6ec6ff', '#b18cff', '#ff8ac4'], purple: ['#b18cff', '#e3c6ff'] };
// where the pin sits, from the middle of each kind of thing (before turning + sizing)
const PIN_AT = { photo: -108, note: -74, ticket: -40, sticker: -40 };

const DEF = { board: 'cork', frame: 'oak', lights: 'warm', strings: [], items: null };
const starter = d => {
  const a = newThing({ kind: 'photo', x: 250, y: 250, r: -6, k: .95, text: 'us ♥', pin: 'pin', color: '#e0323f' });
  const b = newThing({ kind: 'photo', x: 700, y: 300, r: 5, k: .9, text: 'best night ever', pin: 'tape', color: 'pink' });
  const n = newThing({ kind: 'note', x: 470, y: 470, r: 3, k: .9, text: 'who took\nthese??', color: '#fff27a', pin: 'pin', pc: '#141114' });
  const t = newThing({ kind: 'ticket', x: 820, y: 560, r: -8, k: .8, text: 'midnight bats', sub: 'oct 31 · row b', color: '#ff8ac4' });
  d.items = [a, b, n, t, newThing({ kind: 'sticker', s: 'e:1f5a4', x: 140, y: 520, k: .55, r: -12 })];
  d.strings = [{ id: 's1', a: a.id, b: n.id, color: '#d81e3a' }, { id: 's2', a: n.id, b: t.id, color: '#d81e3a' }, { id: 's3', a: a.id, b: b.id, color: '#d81e3a' }];
};

// ---------- drawn bits ----------

export function pinHead(color, kind = 'pin') {
  if (kind === 'heart') return h('i', { class: 'pw-pin heart', style: { '--pc': color } });
  if (kind === 'clip') return h('i', { class: 'pw-clip' });
  if (kind === 'tape') return h('i', { class: 'pw-tape', style: { background: TAPES[color] || TAPES.pink } });
  return h('i', { class: 'pw-pin', style: { '--pc': color } });
}

function photo(it) {
  return h('div', { class: 'pw-polaroid' },
    h('div', { class: 'pw-pic' }, it.imageId ? picImg(it.imageId) : h('span', { class: 'pw-pic-empty' }, '♥'), h('i', { class: 'pw-gloss' })),
    h('div', { class: 'pw-cap', style: { fontFamily: it.font || FONTS[0] } }, it.text || ''),
    pinHead(it.pin === 'tape' ? (it.color || 'pink') : (it.color || '#e0323f'), it.pin || 'pin'));
}

function note(it) {
  return h('div', { class: 'pw-note', style: { '--nc': it.color || '#fff27a', fontFamily: it.font || FONTS[1], color: it.color === '#141114' ? '#ffd1e6' : '#2a1a2a' } },
    h('span', {}, it.text ?? ''), pinHead(it.pc || '#e0323f', it.pin || 'pin'));
}

function ticket(it) {
  return h('div', { class: 'pw-ticket', style: { '--tc': it.color || '#ff8ac4' } },
    h('div', { class: 'pw-ticket-main' }, h('small', {}, 'admit one'), h('b', {}, it.text ?? ''), h('span', {}, it.sub ?? '')),
    h('div', { class: 'pw-ticket-stub' }, h('span', {}, '№ ' + String(it.id.charCodeAt(3) * 97 % 9000 + 1000))),
    pinHead(it.pc || '#141114', 'pin'));
}

function fairyLights(color) {
  const cols = LIGHTS[color] || LIGHTS.warm;
  const anchors = [10, 210, 400, 600, 790, 990];
  let wire = '', bulbs = '', k = 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1], cx = (a + b) / 2, top = 14, sag = 70;
    wire += `M${a} ${top} Q${cx} ${sag} ${b} ${top} `;
    for (let t = .12; t < .95; t += .15) {
      const x = (1 - t) ** 2 * a + 2 * (1 - t) * t * cx + t * t * b, y = (1 - t) ** 2 * top + 2 * (1 - t) * t * sag + t * t * top;
      const c = cols[k % cols.length];
      bulbs += `<g class='pw-bulb' style='--bc:${c};animation-delay:${((k * 41) % 29) / 10}s'><rect x='${(x - 2.5).toFixed(1)}' y='${(y - 1).toFixed(1)}' width='5' height='6' rx='1' fill='#2a2a2a'/><ellipse cx='${x.toFixed(1)}' cy='${(y + 10).toFixed(1)}' rx='5.5' ry='8' fill='${c}'/><ellipse cx='${(x - 1.6).toFixed(1)}' cy='${(y + 7).toFixed(1)}' rx='1.6' ry='2.6' fill='#fff' opacity='.7'/></g>`;
      k++;
    }
  }
  return h('div', { class: 'pw-lights', innerHTML: `<svg viewBox='0 0 ${W} 120' width='${W}' height='120'><path d='${wire}' stroke='#2a2a2a' stroke-width='2' fill='none'/>${bulbs}</svg>` });
}

// ---------- the app ----------

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  if (!Array.isArray(d.items)) { starter(d); if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let mode = 'move';
  let first = null; // first photo picked in string mode
  let stringColor = d.stringColor || STRING_COLORS[0];
  let tab = 'add';
  let bar = null;

  function thing(it) {
    if (it.kind === 'photo') return photo(it);
    if (it.kind === 'note') return note(it);
    if (it.kind === 'ticket') return ticket(it);
    return h('div', { class: 'pw-stk' }, stickerNode(it.s));
  }

  const strings = s('svg', { class: 'pw-strings', viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  const layer = dragLayer({
    items: d.items, editable: edit, cls: 'pw-items', render: thing,
    bounds: () => ({ x0: EDGE + 10, y0: EDGE + 10, x1: W - EDGE - 10, y1: H - EDGE - 10 }),
    onChange: () => { save(); drawStrings(); },
    onMove: () => drawStrings(),
    onPick: (it, live) => { if (live) bar?.sync(); else drawPick(it); },
    onTap: (it) => {
      if (mode === 'string') return pickForString(it);
      if (it.kind === 'photo') viewPhoto(it);
    },
    onDelete: gone => {
      if (gone.imageId) store.deleteImage(gone.imageId);
      d.strings = d.strings.filter(x => x.a !== gone.id && x.b !== gone.id);
      drawStrings();
    },
  });

  const lightsBox = h('div', { class: 'pw-lightsbox' });
  const scene = h('div', { class: 'pw-scene' },
    h('div', { class: 'pw-cork' }, h('i', { class: 'pw-cork-shade' })),
    h('i', { class: 'pw-fr t' }), h('i', { class: 'pw-fr b' }), h('i', { class: 'pw-fr l' }), h('i', { class: 'pw-fr r' }),
    layer.el, strings, lightsBox);
  const stageWrap = h('div', { class: 'pw-stage' }, scene);
  const pickBar = h('div', { class: 'rl-pick pw-pick', hidden: true });
  const panel = h('div', { class: 'pw-panel' });
  const stringBtn = h('button', { class: 'btn sm pw-string-btn', onclick: () => setMode(mode === 'string' ? 'move' : 'string') }, '🧵 string');

  el.append(appBar(ctx, meta, edit ? stringBtn : null), h('div', { class: 'pw-app' }, stageWrap, pickBar, edit ? panel : null));

  function paint() {
    scene.dataset.board = BOARDS[d.board] || 'cork';
    const [c, dk, lt] = FRAMES[d.frame] || FRAMES.oak;
    scene.style.setProperty('--fr', c); scene.style.setProperty('--frd', dk); scene.style.setProperty('--frl', lt);
    fill(lightsBox, d.lights && d.lights !== 'off' ? fairyLights(d.lights) : null);
  }

  // ---- strings ----
  const byId = id => d.items.find(i => i.id === id);
  function anchor(it) {
    const off = (PIN_AT[it.kind] ?? -40) * (it.k || 1), r = (it.r || 0) * Math.PI / 180;
    return [it.x - off * Math.sin(r), it.y + off * Math.cos(r)];
  }
  function pinColorOf(it) {
    if (it.kind === 'photo') return it.pin === 'tape' || it.pin === 'clip' ? '#e0323f' : (it.color || '#e0323f');
    return it.pc || '#e0323f';
  }
  function drawStrings() {
    d.strings = d.strings.filter(x => byId(x.a) && byId(x.b));
    const ends = new Map();
    const kids = [];
    for (const st of d.strings) {
      const A = byId(st.a), B = byId(st.b);
      const [x1, y1] = anchor(A), [x2, y2] = anchor(B);
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const sag = 18 + dist * .16;
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + sag;
      const path = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      const g = s('g', { class: 'pw-string', dataset: { id: st.id } },
        s('path', { d: path, class: 'pw-str-shadow', transform: 'translate(3 6)' }),
        s('path', { d: path, class: 'pw-str', stroke: st.color }),
        s('path', { d: path, class: 'pw-str-twist' }),
        s('path', { d: path, class: 'pw-str-hit', onclick: () => cutString(st) }));
      kids.push(g);
      ends.set(st.a, A); ends.set(st.b, B);
    }
    // a pin over each end so the string looks tied on
    for (const it of ends.values()) {
      const [x, y] = anchor(it), c = pinColorOf(it);
      kids.push(s('g', { class: 'pw-knot' },
        s('ellipse', { cx: x + 3, cy: y + 5, rx: 9, ry: 7, fill: 'rgba(0,0,0,.35)' }),
        s('circle', { cx: x, cy: y, r: 9, fill: c, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1 }),
        s('circle', { cx: x - 3, cy: y - 3, r: 3, fill: '#fff', opacity: .65 })));
    }
    fill(strings, kids);
  }
  function cutString(st) {
    if (mode !== 'string') return;
    d.strings = d.strings.filter(x => x !== st);
    save(); drawStrings();
  }
  function pickForString(it) {
    if (!first) {
      first = it.id;
      layer.node(it.id)?.classList.add('pw-first');
      return;
    }
    const a = first;
    layer.node(a)?.classList.remove('pw-first');
    first = null;
    if (a === it.id) return;
    if (d.strings.some(x => (x.a === a && x.b === it.id) || (x.b === a && x.a === it.id))) return;
    const id = 's_' + Math.random().toString(36).slice(2, 9);
    d.strings.push({ id, a, b: it.id, color: stringColor });
    save(); drawStrings();
    strings.querySelector(`[data-id="${id}"]`)?.classList.add('pw-new');
  }
  function setMode(m) {
    mode = m;
    if (first) { layer.node(first)?.classList.remove('pw-first'); first = null; }
    layer.locked = m === 'string';
    scene.classList.toggle('stringing', m === 'string');
    stringBtn.classList.toggle('on', m === 'string');
    stringBtn.classList.toggle('primary', m === 'string');
    if (m === 'string') { tab = 'strings'; drawPanel(); }
  }

  // ---- picked ----
  function drawPick(it) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { bar = null; fill(pickBar); return; }
    const extra = [];
    const refresh = () => { layer.refresh(it); save(); drawStrings(); };
    const fontPick = (key, def) => h('div', { class: 'rl-field' }, h('span', {}, 'writing'), h('div', { class: 'rm-fonts' }, FONTS.map(f => h('button', {
      type: 'button', class: 'rm-font' + ((it[key] || def) === f ? ' on' : ''), style: { fontFamily: f },
      onclick: e => { it[key] = f; refresh(); e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); },
    }, 'Aa'))));
    if (it.kind === 'photo') {
      extra.push(
        h('div', { class: 'rl-field' }, h('span', {}, 'caption'), h('input', { type: 'text', maxLength: 28, value: it.text || '', oninput: e => { it.text = e.target.value; refresh(); } })),
        fontPick('font', FONTS[0]),
        h('div', { class: 'rl-field' }, h('span', {}, 'hold it with'), segmented(['pin', 'heart', 'tape', 'clip'].map(v => ({ value: v, label: v })), it.pin || 'pin', v => {
          it.pin = v;
          if (v === 'tape' && !TAPES[it.color]) it.color = 'pink';
          if (v !== 'tape' && TAPES[it.color]) it.color = '#e0323f';
          refresh(); drawPick(it);
        })),
        it.pin === 'tape'
          ? h('div', { class: 'rl-field pw-tapes' }, h('span', {}, 'tape'), ['pink', 'black', 'stripes', 'dots', 'hearts', 'stars', 'lace', 'gingham', 'kraft', 'holo'].map(t => h('button', {
            type: 'button', class: 'pw-tape-chip' + (it.color === t ? ' on' : ''), style: { background: TAPES[t] }, title: t,
            onclick: () => { it.color = t; refresh(); drawPick(it); },
          })))
          : it.pin === 'clip' ? null : h('div', { class: 'rl-field' }, h('span', {}, 'pin'), swatches(it.color || '#e0323f', v => { it.color = v; refresh(); }, PIN_COLORS)),
        h('div', { class: 'rl-field' },
          h('button', { type: 'button', class: 'btn sm', onclick: async () => {
            const up = await uploadPic(1200);
            if (!up) return;
            if (it.imageId) store.deleteImage(it.imageId);
            it.imageId = up.imageId; it.ar = up.width / up.height;
            refresh(); drawPick(it);
          } }, it.imageId ? 'change picture' : '+ picture'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => viewPhoto(it) }, '🔍 look')));
    } else if (it.kind === 'note') {
      extra.push(
        h('div', { class: 'rl-field' }, h('span', {}, 'words'), h('textarea', { rows: 2, maxLength: 90, value: it.text || '', class: 'lk-textarea', oninput: e => { it.text = e.target.value; refresh(); } })),
        h('div', { class: 'rl-field' }, h('span', {}, 'paper'), swatches(it.color || '#fff27a', v => { it.color = v; refresh(); }, NOTE_COLORS)),
        fontPick('font', FONTS[1]),
        h('div', { class: 'rl-field' }, h('span', {}, 'pin'), swatches(it.pc || '#e0323f', v => { it.pc = v; refresh(); }, PIN_COLORS)));
    } else if (it.kind === 'ticket') {
      extra.push(
        h('div', { class: 'rl-field' }, h('span', {}, 'show'), h('input', { type: 'text', maxLength: 22, value: it.text || '', oninput: e => { it.text = e.target.value; refresh(); } })),
        h('div', { class: 'rl-field' }, h('span', {}, 'date'), h('input', { type: 'text', maxLength: 22, value: it.sub || '', oninput: e => { it.sub = e.target.value; refresh(); } })),
        h('div', { class: 'rl-field' }, h('span', {}, 'color'), swatches(it.color || '#ff8ac4', v => { it.color = v; refresh(); }, NOTE_COLORS)),
        h('div', { class: 'rl-field' }, h('span', {}, 'pin'), swatches(it.pc || '#141114', v => { it.pc = v; refresh(); }, PIN_COLORS)));
    }
    bar = toolBar(layer, it, () => { save(); drawStrings(); }, { extra, noFlip: it.kind !== 'sticker' });
    fill(pickBar, bar);
  }

  // ---- adding ----
  const scatter = () => ({ x: Math.round(200 + Math.random() * 600), y: Math.round(170 + Math.random() * 340), r: Math.round((Math.random() - .5) * 16) });
  async function addPhotos() {
    const files = await cropAll((await pickFiles('image/*', true)).slice(0, 12), { aspect: 1 });
    if (!files.length) return;
    let n = 0;
    for (const file of files.slice(0, 12)) {
      try {
        const { blob, width, height } = await shrinkImage(file, 1200);
        layer.add(newThing({ kind: 'photo', imageId: await store.putImage(blob), ar: width / height, text: '', pin: 'pin', color: PIN_COLORS[n % 4], k: .9, ...scatter() }));
        n++;
      } catch (err) { console.error(err); toast("couldn't read that picture", 'bad'); }
    }
  }
  const addNote = () => layer.add(newThing({ kind: 'note', text: 'remember this', color: NOTE_COLORS[Math.floor(Math.random() * 5)], pin: 'pin', pc: '#e0323f', k: .9, ...scatter() }));
  const addTicket = () => layer.add(newThing({ kind: 'ticket', text: 'the show', sub: 'fri · 8pm', color: '#ff8ac4', pc: '#141114', k: .8, ...scatter() }));
  const addSticker = code => layer.add(newThing({ kind: 'sticker', s: 'e:' + code, k: .6, ...scatter() }));

  // ---- big view ----
  function viewPhoto(it) {
    const photos = d.items.filter(i => i.kind === 'photo');
    let i = photos.indexOf(it);
    const box = h('div', { class: 'pw-view' });
    const show = dir => {
      const p = photos[i];
      fill(box,
        photos.length > 1 ? h('button', { type: 'button', class: 'du-arrow pw-view-arrow', onclick: () => { i = (i - 1 + photos.length) % photos.length; show(-1); } }, '‹') : null,
        h('div', { class: 'pw-view-card' + (dir ? (dir > 0 ? ' in-r' : ' in-l') : ' in') },
          h('div', { class: 'pw-view-pic' }, p.imageId ? picImg(p.imageId) : h('span', { class: 'pw-pic-empty' }, '♥')),
          h('div', { class: 'pw-view-cap', style: { fontFamily: p.font || FONTS[0] } }, p.text || '')),
        photos.length > 1 ? h('button', { type: 'button', class: 'du-arrow pw-view-arrow', onclick: () => { i = (i + 1) % photos.length; show(1); } }, '›') : null);
    };
    show(0);
    openModal({ title: 'polaroid', body: box, wide: true });
  }

  // ---- panel ----
  const tabsEl = chipTabs([['add', 'add'], ['strings', 'string'], ['board', 'board']], tab, v => { tab = v; drawPanel(); });
  const body = h('div', { class: 'pw-panel-body' });
  if (edit) panel.append(tabsEl, body);
  const group = (title, ...kids) => h('div', { class: 'rm-group' }, h('h4', {}, title), ...kids);
  const bigBtn = (label, art, onclick, cls = '') => h('button', { type: 'button', class: 'pw-add ' + cls, onclick }, h('span', { class: 'pw-add-art' }, art), h('span', {}, label));
  const EXTRA_STICKERS = '1f5a4 1f496 2764-fe0f 1f48b 2b50 2728 1f319 1f987 1f480 1f47b 1f339 1f940 1f98b 1f380 1f4cc 1f4ce 1f3b8 1f4bf 1f3a7 1f39f-fe0f 1f4f7 1f52e 1f344 1f352'.split(' ');

  function drawPanel() {
    if (!edit) return;
    tabsEl.querySelectorAll('.rl-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    if (tab === 'add') {
      fill(body,
        h('div', { class: 'pw-adds' },
          bigBtn('polaroid', h('i', { class: 'pw-mini-pol' }), addPhotos, 'pol'),
          bigBtn('note', h('i', { class: 'pw-mini-note' }), addNote),
          bigBtn('ticket', h('i', { class: 'pw-mini-ticket' }), addTicket)),
        group('stickers', h('div', { class: 'rm-grid stk' }, EXTRA_STICKERS.map(code => h('button', { type: 'button', class: 'rm-cell stkc', onclick: () => addSticker(code) }, stickerNode('e:' + code))))));
    } else if (tab === 'strings') {
      fill(body,
        group('string', segmented([{ value: 'move', label: 'move stuff' }, { value: 'string', label: 'tie string' }], mode, v => setMode(v))),
        group('string color', swatches(stringColor, v => { stringColor = v; d.stringColor = v; save(); }, STRING_COLORS)),
        d.strings.length ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.strings = []; save(); drawStrings(); drawPanel(); } }, 'cut every string') : null);
    } else {
      fill(body,
        group('board', h('div', { class: 'pw-boards' }, Object.entries(BOARDS).map(([name, id]) => h('button', {
          type: 'button', class: 'pw-board-opt' + (d.board === name ? ' on' : ''), onclick: () => { d.board = name; paint(); save(); drawPanel(); },
        }, h('i', { class: 'pw-board-chip', dataset: { board: id } }), h('span', {}, name))))),
        group('frame', h('div', { class: 'pw-boards' }, Object.entries(FRAMES).map(([name, [c, dk, lt]]) => h('button', {
          type: 'button', class: 'pw-board-opt' + (d.frame === name ? ' on' : ''), onclick: () => { d.frame = name; paint(); save(); drawPanel(); },
        }, h('i', { class: 'pw-frame-chip', style: { '--fr': c, '--frd': dk, '--frl': lt } }), h('span', {}, name))))),
        group('fairy lights', segmented([{ value: 'off', label: 'off' }, ...Object.keys(LIGHTS).map(k => ({ value: k, label: k }))], d.lights || 'off', v => { d.lights = v; paint(); save(); })));
    }
  }

  paint();
  drawStrings();
  drawPanel();
  const unfit = fitStage(stageWrap, scene, W, H, 1.1);
  const unkey = edit ? deleteKey(layer) : () => {};
  return () => { unfit(); unkey(); };
}
