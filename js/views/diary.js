// a diary: the closed book in 3d (#/diary/<id>), and the open book you write in (#/diary/<id>/write[/<page>]).
//
// pages are real paper (lined, grid, dots...). you can type on the lines, draw with pens + glitter + gel pens, and stick
// stickers, photos, envelopes + pockets anywhere. the page turns like a real page when you flip.
// pages can have an index tab on the edge, a song that plays while they're open, and pop-up stickers.
// a diary can be locked with a code, and can look old + worn.

import { store, imageIdsIn, MAX_SONG } from '../store.js';
import { newPage } from '../model.js';
import { h, fill, toast, openModal, confirmDialog, segmented, swatches, pickFile, shrinkImage } from '../ui.js';
import { dims, sizeVars, BIGGEST, book3d, material, preset, nameTag } from '../diary/covers.js';
import { itemNode, itemsLayer, newItem, sizeSlider, canPop } from '../diary/items.js';
import { STICKER_TABS, stickerNode, TAPES } from '../diary/stickers.js';
import { Sketch, pen, TOOLS, pickTool, paletteFor } from '../diary/sketch.js';
import { guard, isLocked, askCode, hasLock } from '../diary/lock.js';
import { ripPage, burnPage, peel } from '../diary/fx.js';
import { letterNode, openLetter, editLetter, ENV_COLORS, POCKETS } from '../diary/letters.js';
import { songPlayer, songLook } from '../diary/song.js';
import { typewriter, typewriterKeys } from '../diary/typewriter.js';
import { sound } from '../diary/sound.js';
import { pickAndCrop } from '../crop.js';

const LINE = 30, TOP = 84; // the first line is TOP down, then one every LINE

export const PAPERS = ['lined', 'narrow', 'grid', 'dots', 'blank'];
export const PAPER_COLORS = { white: '#fdfcf8', cream: '#fbf3dc', pink: '#ffe6ef', lilac: '#efe6ff', mint: '#e3f7ee', aged: '#efe0bf', kraft: '#c9a77c', black: '#1b181d' };

export const WRITE_FONTS = [
  { id: 'caveat', label: 'Caveat', css: "'Caveat', cursive", size: 27, dy: 3 },
  { id: 'indie', label: 'Indie Flower', css: "'Indie Flower', cursive", size: 21, dy: 1 },
  { id: 'gloria', label: 'Gloria', css: "'Gloria Hallelujah', cursive", size: 17, dy: -1 },
  { id: 'shadows', label: 'Shadows', css: "'Shadows Into Light', cursive", size: 22, dy: 2 },
  { id: 'patrick', label: 'Patrick', css: "'Patrick Hand', cursive", size: 22, dy: 2 },
  { id: 'reenie', label: 'Reenie', css: "'Reenie Beanie', cursive", size: 30, dy: 3 },
  { id: 'homemade', label: 'Homemade', css: "'Homemade Apple', cursive", size: 15, dy: 0 },
  { id: 'marker', label: 'Marker', css: "'Permanent Marker', cursive", size: 18, dy: 1 },
  { id: 'typewriter', label: 'Typewriter', css: "'Special Elite', monospace", size: 16, dy: 2 },
  { id: 'pixel', label: 'Pixel', css: "'Pixelify Sans', sans-serif", size: 18, dy: 2 },
  { id: 'bubbly', label: 'Bubbly', css: "'Fredoka', sans-serif", size: 18, dy: 2 },
];
export const writeFont = id => WRITE_FONTS.find(f => f.id === id) || WRITE_FONTS[0];
export const INKS = ['#27306b', '#141114', '#2357d9', '#d6203a', '#ff3d8b', '#8a3ffc', '#1f8a5b', '#b8860b', '#ffffff', '#c0c0c8'];
const TAB_COLORS = ['#ff5fa8', '#ffd84d', '#7df9d0', '#b18cff', '#6ec6ff', '#ff9a3d', '#141114', '#ffffff'];

// dark ink doesn't show on black paper (and white doesn't show on the rest), so swap them over
export function fixInks(diary, color) {
  const black = color === 'black';
  for (const p of diary.pages) {
    if (black && (p.ink === '#27306b' || p.ink === '#141114')) p.ink = '#ffffff';
    if (!black && p.ink === '#ffffff') p.ink = '#27306b';
  }
}

export const paperClass = (paper, extra = '') => `paper paper-${paper.kind} paper-${paper.color} ${extra}`;

// a fresh page: in the oc's own handwriting if the diary has one, otherwise like the page before
const freshPage = (diary, from = {}) => newPage({ font: diary.voice?.font || from.font, ink: diary.voice?.ink || from.ink });

// a number from a page id, so each old page gets its own stains + folded corner (the same every time)
const seed = (id, n) => {
  let x = 0;
  for (const ch of String(id) + n) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return (x % 1000) / 1000;
};

// ============ the closed book ============

export function renderBook(el, { diary, go }) {
  let rx = -8, ry = 26;
  const stage = h('div', { class: 'book-stage' });
  const book = book3d(diary, { scale: 1 });
  const { w: W, h: H } = dims(diary);
  // measured against the biggest size, so a pocket diary really does look small next to a big one
  const fit = () => {
    const s = Math.max(.3, Math.min(1, (stage.clientHeight - 40) / (BIGGEST.h + 80), (stage.clientWidth - 40) / (BIGGEST.w + 160)));
    book.style.setProperty('--s', s);
    book.style.width = W * s + 'px';
    book.style.height = H * s + 'px';
  };
  const turn = () => { book.box.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
  turn();
  stage.append(h('div', { class: 'book-glow', style: { '--c': preset(diary.cover.preset)[3].ink || '#ff4fa3' } }), book);

  // drag to spin it around
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0 || opening) return;
    const sx = e.clientX, sy = e.clientY, ox = rx, oy = ry;
    let moved = false;
    book.classList.add('held');
    const move = ev => {
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) moved = true;
      ry = oy + (ev.clientX - sx) * .5;
      rx = Math.max(-60, Math.min(60, ox - (ev.clientY - sy) * .4));
      turn();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      book.classList.remove('held');
      if (!moved && book.contains(e.target)) open();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  let opening = false;
  async function open() {
    if (opening) return;
    opening = true;
    if (isLocked(diary) && !await askCode(diary)) { opening = false; return; }
    rx = 0; ry = 0;
    turn();
    if (hasLock(diary)) {
      // the padlock pops open + drops off, the strap swings away, then the cover opens
      book.classList.add('opening', 'unlocking');
      await new Promise(r => setTimeout(r, 1000));
    }
    book.classList.add('opening');
    setTimeout(() => book.classList.add('open'), 420);
    setTimeout(() => go(`diary/${diary.id}/write`), 1350);
  }

  el.append(h('div', { class: 'diary-book-page' },
    stage,
    h('div', { class: 'book-actions' },
      h('a', { class: 'btn ghost', href: '#/' }, '← shelf'),
      h('button', { class: 'btn', onclick: () => go(`diary/${diary.id}/cover`) }, '🎨 cover'),
      h('button', { class: 'btn primary', onclick: open }, hasLock(diary) ? '🔓 open' : '📖 open'),
      h('button', { class: 'btn ghost', title: 'delete diary', onclick: remove }, '🗑'))));

  async function remove() {
    if (isLocked(diary) && !await askCode(diary)) return;
    if (!await confirmDialog(`delete "${diary.cover.title.text || 'this diary'}" and every page in it?`, { okLabel: 'delete', danger: true })) return;
    await store.deleteDiary(diary.id);
    toast('diary deleted');
    go('');
  }

  requestAnimationFrame(fit);
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  return () => ro.disconnect();
}

// ============ a page ============

// the old-diary look: yellowing, foxing, a coffee ring now and then, a folded corner
function ageMarks(page) {
  const r = n => seed(page.id, n);
  const spots = Array.from({ length: 5 }, (_, i) => `radial-gradient(${18 + r(i) * 50}px ${14 + r(i + 9) * 40}px at ${r(i + 3) * 100}% ${r(i + 5) * 100}%, rgba(150, 95, 30, ${.08 + r(i + 7) * .12}), transparent 70%)`);
  const el = h('div', { class: 'dp-age', style: { backgroundImage: spots.join(', ') } });
  if (r(20) < .4) el.append(h('i', { class: 'dp-coffee', style: { left: 20 + r(21) * 55 + '%', top: 25 + r(22) * 55 + '%', rotate: r(23) * 360 + 'deg' } }));
  return el;
}
const earCorner = page => { const v = seed(page.id, 30); return v < .4 ? 'tr' : v < .75 ? 'br' : null; };

// live = you can write/draw/decorate it. otherwise it's a picture of the page (for the page turning)
function pageEl(diary, page, n, side, live) {
  const f = typewriter.on ? writeFont('typewriter') : writeFont(page.font);
  const ink = page.ink;
  const ear = diary.aged ? earCorner(page) : null;
  const el = h('div', {
    class: paperClass(diary.paper, `dpage side-${side}${diary.aged ? ' aged' : ''}${ear ? ' ear-' + ear : ''}`),
    style: { '--ink': ink, '--lh': LINE + 'px', '--top': TOP + 'px' },
  });
  const textStyle = { fontFamily: f.css, fontSize: f.size + 'px', paddingTop: (f.dy || 0) + 'px', color: ink };
  const H = dims(diary).h;
  const rows = Math.floor((H - 30 - (TOP - LINE)) / LINE);
  const textBox = { top: TOP - LINE + 'px', height: rows * LINE + 'px' };
  el.append(h('div', { class: 'dp-shade' }));
  if (diary.aged) el.append(ageMarks(page));
  if (ear) el.append(h('i', { class: 'dp-ear' }));
  el.append(h('span', { class: 'dp-num' }, n + 1));
  const owner = n === 0 && diary.charId ? store.char(diary.charId) : null;
  if (owner) el.append(nameTag(owner, 'dp-owner'));
  if (!live) {
    el.append(h('div', { class: 'dp-date' }, h('span', { class: 'dp-date-label' }, 'date'), h('span', { class: 'dp-date-val', style: { fontFamily: f.css, color: ink } }, page.date)));
    el.append(h('div', { class: 'dp-text', style: { ...textStyle, ...textBox } }, page.text));
    if (page.drawing.imageId) {
      const img = h('img', { class: 'dp-draw', alt: '', draggable: false, onload: () => { img.style.width = img.naturalWidth / 2 + 'px'; img.style.height = img.naturalHeight / 2 + 'px'; } });
      store.imageURL(page.drawing.imageId).then(url => { if (url) img.src = url; });
      el.append(img);
    }
    el.append(h('div', { class: 'items' }, page.items.map(it => itemNode(it, diary))));
    if (page.song) el.append(songLook(page.song));
  }
  return { el, textStyle, textBox };
}

// ============ the open book ============

export function renderWrite(el, ctx) {
  return guard(el, ctx.diary, ctx.go, e => writeView(e, ctx), book3d);
}

function writeView(el, { diary, startAt, go }) {
  const { w: W, h: H } = dims(diary);
  const narrow = matchMedia('(max-width: 760px)');
  let single = narrow.matches;
  let at = Math.max(0, Math.min(diary.pages.length - 1, startAt || 0)); // first page showing
  let mode = 'write';
  let active = at; // the page new stickers + photos go on
  let flipping = false;
  let busy = false; // ripping / burning
  let picked = null; // the item selected in sticker mode
  let stickerTab = STICKER_TABS[0][0];
  let photoFrame = 'polaroid';
  const live = new Map(); // page index -> { sketch, layer, el }
  const player = songPlayer();

  const save = () => store.saveDiary(diary);

  const stage = h('div', { class: 'diary-stage' });
  const spread = h('div', { class: 'spread' + (diary.aged ? ' aged' : '') });
  const tabsLayer = h('div', { class: 'page-tabs' });
  const scaler = h('div', { class: 'spread-scaler' }, spread);
  const tools = h('div', { class: 'diary-tools' });
  const sub = h('div', { class: 'diary-sub' });
  const drawer = h('div', { class: 'sticker-drawer', hidden: true });
  const label = h('span', { class: 'page-label' });
  const prevBtn = h('button', { class: 'flip-btn prev', title: 'back', onclick: () => flip(-1) }, '‹');
  const nextBtn = h('button', { class: 'flip-btn next', title: 'next', onclick: () => flip(1) }, '›');
  stage.append(prevBtn, scaler, nextBtn);
  const desk = h('div', { class: 'diary-desk mode-' + mode }, tools, sub, stage, drawer);
  el.append(desk);

  const perView = () => (single ? 1 : 2);
  const snap = i => (single ? i : i - (i % 2));
  at = snap(at);

  // ---- top bar ----
  function drawTools() {
    const m = (id, icon, text) => h('button', { class: 'tool' + (mode === id ? ' on' : ''), onclick: () => setMode(id) }, h('span', {}, icon), h('span', { class: 'tool-label' }, text));
    fill(tools,
      h('button', { class: 'tool', title: 'close the book', onclick: () => go(`diary/${diary.id}`) }, h('span', {}, '📕')),
      h('div', { class: 'tool-group' }, m('write', '✍️', 'write'), m('draw', '🖍️', 'draw'), m('decor', '⭐', 'stickers')),
      h('button', { class: 'tool', onclick: () => addPhoto() }, h('span', {}, '🖼️'), h('span', { class: 'tool-label' }, 'photo')),
      h('button', { class: 'tool', onclick: paperBox }, h('span', {}, '📄'), h('span', { class: 'tool-label' }, 'paper')),
      label,
      h('button', { class: 'tool', title: 'page', onclick: pageBox }, h('span', {}, '⋯')));
  }

  function drawLabel() {
    const n = diary.pages.length;
    label.textContent = single || at + 1 >= n ? `${at + 1} / ${n}` : `${at + 1}–${at + 2} / ${n}`;
    prevBtn.disabled = at === 0;
  }

  // ---- the row under the top bar (changes with the tool) ----
  function drawSub() {
    const page = diary.pages[active];
    if (mode === 'write') {
      const tw = typewriter.on;
      fill(sub,
        h('select', { class: 'font-pick', disabled: tw, onchange: e => { page.font = e.target.value; save(); redrawPage(active); } },
          WRITE_FONTS.map(f => h('option', { value: f.id, selected: f.id === (tw ? 'typewriter' : page.font), style: { fontFamily: f.css } }, f.label))),
        h('button', { class: 'btn ghost sm tw-toggle' + (tw ? ' on' : ''), title: 'typewriter', onclick: toggleTypewriter }, '⌨️ typewriter'),
        inkRow(page.ink, c => { page.ink = c; save(); redrawPage(active); }));
    } else if (mode === 'draw') {
      const pal = paletteFor(pen.tool);
      fill(sub,
        h('div', { class: 'seg-row pen-row' }, TOOLS.map(t => h('button', { class: 'pen-btn' + (pen.tool === t.id ? ' on' : '') + (t.gel ? ' gel' : ''), title: t.id, onclick: () => { pickTool(t.id, INKS); drawSub(); } }, t.icon))),
        segmented([{ value: .6, label: 'S' }, { value: 1, label: 'M' }, { value: 1.8, label: 'L' }], pen.size, v => { pen.size = v; }),
        h('div', { class: 'ink-wrap' + (pal ? ' gel-inks gel-' + pen.tool : '') }, inkRow(pen.color, c => { pen.color = c; }, pal || INKS)),
        h('button', { class: 'btn ghost sm', title: 'undo', onclick: undo }, '↶'),
        h('button', { class: 'btn ghost sm', onclick: wipe }, 'clear'));
    } else {
      const it = picked;
      const layer = live.get(active)?.layer;
      const letter = it && (it.kind === 'envelope' || it.kind === 'pocket');
      fill(sub,
        it && layer ? sizeSlider(it, layer, save) : null,
        it?.kind === 'photo' ? segmented(['polaroid', 'tape', 'plain', 'sticker'].map(v => ({ value: v, label: v })), it.frame || 'polaroid', v => {
          it.frame = photoFrame = v;
          save();
          live.get(active)?.layer.draw();
        }) : null,
        it && canPop(it) ? h('button', { class: 'btn ghost sm pop-toggle' + (it.pop ? ' on' : ''), onclick: () => togglePop(it) }, '🎪 pop-up') : null,
        letter ? h('button', { class: 'btn ghost sm', onclick: () => editItem(it) }, '✏️ edit') : null,
        letter ? h('button', { class: 'btn ghost sm', onclick: () => { const n = layer?.node(it.id); if (n) openLetter(n, it); } }, '💌 open') : null,
        it ? h('button', { class: 'btn ghost sm', onclick: () => live.get(active)?.layer.removeSelected() }, '✕ remove') : null,
        h('button', { class: 'btn ghost sm', onclick: addOwnSticker }, '+ my own sticker'));
    }
  }

  function inkRow(value, onPick, colors = INKS) {
    return swatches(value, onPick, colors);
  }

  function setMode(next) {
    mode = next;
    desk.className = 'diary-desk mode-' + mode;
    drawer.hidden = mode !== 'decor';
    if (mode !== 'decor') for (const p of live.values()) p.layer.select(null);
    picked = null;
    drawTools();
    drawSub();
    if (mode === 'decor') drawDrawer();
    requestAnimationFrame(fit);
  }

  function toggleTypewriter() {
    typewriter.on = !typewriter.on;
    if (typewriter.on) sound.ding();
    showPages(false);
    requestAnimationFrame(() => live.get(active)?.el.querySelector('textarea')?.focus());
  }

  // ---- sticker drawer ----
  function drawDrawer() {
    const letters = stickerTab === 'letters';
    const tab = STICKER_TABS.find(t => t[0] === stickerTab) || STICKER_TABS[0];
    fill(drawer,
      h('div', { class: 'stk-tabs' },
        h('button', { class: 'stk-tab' + (letters ? ' on' : ''), title: 'letters', onclick: () => { stickerTab = 'letters'; drawDrawer(); } }, h('span', { class: 'stk-tab-icon tab-emoji' }, '💌'), h('span', { class: 'stk-tab-name' }, 'letters')),
        STICKER_TABS.map(([name, icon]) =>
          h('button', { class: 'stk-tab' + (name === stickerTab ? ' on' : ''), title: name, onclick: () => { stickerTab = name; drawDrawer(); } }, h('span', { class: 'stk-tab-icon' }, stickerNode(icon)), h('span', { class: 'stk-tab-name' }, name)))),
      letters
        ? h('div', { class: 'stk-grid letter-grid' },
          ENV_COLORS.map((c, i) => h('button', { class: 'stk-cell letter-cell', title: 'envelope', onclick: e => addLetter('envelope', c, e.currentTarget, ['red', 'heart', 'pink', 'black', 'gold', 'purple', 'star', 'bat', 'pink'][i]) },
            h('span', { class: 'letter-mini it-envelope' }, letterNode({ kind: 'envelope', color: c, seal: ['red', 'heart', 'pink', 'black', 'gold', 'purple', 'star', 'bat', 'pink'][i] })))),
          POCKETS.map(p => h('button', { class: 'stk-cell letter-cell', title: 'pocket', onclick: e => addLetter('pocket', p, e.currentTarget) },
            h('span', { class: 'letter-mini it-pocket' }, letterNode({ kind: 'pocket', color: p, note: '♡' })))))
        : h('div', { class: 'stk-grid' }, tab[2].map(s => h('button', { class: 'stk-cell', onclick: e => stick(s, e.currentTarget) }, stickerNode(s)))));
  }

  function stick(s, cell) {
    const p = live.get(active);
    if (!p) return;
    const tape = s.startsWith('t:');
    const item = newItem({
      kind: 'sticker', s,
      x: Math.round(W / 2 + (Math.random() - .5) * W * .4),
      y: Math.round(H / 2 + (Math.random() - .5) * H * .4),
      r: Math.round((Math.random() - .5) * (tape ? 50 : 24)),
      k: s.startsWith('e:') ? .9 : 1,
    });
    p.layer.add(item);
    peel(cell, p.layer.node(item.id));
  }

  function addLetter(kind, color, cell, seal) {
    const p = live.get(active);
    if (!p) return;
    const item = newItem({
      kind, color, seal: kind === 'envelope' ? seal || 'red' : undefined, note: '', imageId: null,
      x: Math.round(W / 2 + (Math.random() - .5) * W * .3), y: Math.round(H * .55 + (Math.random() - .5) * H * .2),
      r: Math.round((Math.random() - .5) * 14), k: 1,
    });
    p.layer.add(item);
    peel(cell, p.layer.node(item.id));
    setTimeout(() => editItem(item), 360);
  }

  async function editItem(item) {
    await editLetter(item);
    save();
    for (const p of live.values()) if (p.layer.node(item.id)) { p.layer.draw(); p.layer.select(item.id); }
  }

  function togglePop(item) {
    item.pop = !item.pop;
    save();
    const p = live.get(active);
    if (!p) return;
    p.layer.draw();
    p.layer.select(item.id);
    if (item.pop) {
      sound.pop();
      popUp(p.el);
    }
  }

  // pop-ups stand up out of the page
  let popTimer = null;
  function popUp(target = spread) {
    if (!spread.querySelector('.it-pop')) return;
    target.classList.remove('pop-go');
    void target.offsetWidth;
    target.classList.add('pop-go');
    clearTimeout(popTimer);
    popTimer = setTimeout(() => spread.querySelectorAll('.pop-go').forEach(x => x.classList.remove('pop-go')), 1500);
  }

  async function addOwnSticker() { await addPhoto('sticker'); }

  async function addPhoto(frame = photoFrame) {
    const file = await pickAndCrop();
    if (!file) return;
    try {
      const { blob, width, height } = await shrinkImage(file, 1400);
      const imageId = await store.putImage(blob);
      const tapeNames = Object.keys(TAPES);
      if (mode !== 'decor') setMode('decor');
      live.get(active)?.layer.add(newItem({
        kind: 'photo', imageId, ar: width / height, frame, x: Math.round(W / 2), y: Math.round(H / 2),
        tape: tapeNames[Math.floor(Math.random() * tapeNames.length)],
        r: Math.round((Math.random() - .5) * 10),
      }));
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }

  // ---- drawing ----
  function undo() {
    if (!live.get(active)?.sketch.back()) toast('nothing to undo');
  }

  async function wipe() {
    if (!await confirmDialog('erase all the drawing on this page?', { okLabel: 'erase' })) return;
    live.get(active)?.sketch.wipe();
  }

  // ---- paper + page menus ----
  function paperBox() {
    const redraw = () => { save(); showPages(false); };
    openModal({
      title: 'paper',
      body: [
        segmented(PAPERS.map(p => ({ value: p, label: p })), diary.paper.kind, v => { diary.paper.kind = v; redraw(); }),
        h('div', { class: 'paper-colors' }, Object.entries(PAPER_COLORS).map(([name, c]) =>
          h('button', {
            type: 'button', class: 'paper-chip', title: name, style: { background: c },
            onclick: e => {
              diary.paper.color = name;
              fixInks(diary, name);
              e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
              e.currentTarget.classList.add('on');
              redraw();
            },
          }))),
        h('label', { class: 'check aged-check' }, h('input', {
          type: 'checkbox', checked: diary.aged,
          onchange: e => { diary.aged = e.target.checked; spread.classList.toggle('aged', diary.aged); redraw(); },
        }), ' 📜 old diary'),
      ],
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
    });
    requestAnimationFrame(() => document.querySelector(`.paper-chip[title="${diary.paper.color}"]`)?.classList.add('on'));
  }

  function pageBox() {
    const page = diary.pages[active];
    const tabbed = diary.pages.map((p, i) => [p, i]).filter(([p]) => p.tab);
    const act = (icon, text, fn, cls = '') => h('button', { type: 'button', class: 'btn pm-btn ' + cls, onclick: () => { box.close(); fn(); } }, h('span', { class: 'pm-icon' }, icon), text);
    const box = openModal({
      title: `page ${active + 1}`,
      body: h('div', { class: 'page-menu' },
        act('➕', 'add a page after this', addPageAfter),
        act('🔖', page.tab ? 'edit tab' : 'add a tab', tabBox),
        act('🎵', page.song ? 'song' : 'add a song', songBox),
        act('⬇️', 'download page', () => download(false)),
        single ? null : act('⬇️', 'download both pages', () => download(true)),
        h('div', { class: 'pm-row' },
          act('✂️', 'rip out', () => destroyPage('rip'), 'danger'),
          act('🔥', 'burn', () => destroyPage('burn'), 'danger')),
        tabbed.length ? h('div', { class: 'pm-tabs' }, tabbed.map(([p, i]) => h('button', {
          type: 'button', class: 'pm-tab', style: { '--tab': p.tab.color },
          onclick: () => { box.close(); goTo(i); },
        }, h('b', {}, p.tab.label || '♡'), h('span', {}, i + 1)))) : null),
    });
  }

  function tabBox() {
    const page = diary.pages[active];
    const draft = { label: page.tab?.label || '', color: page.tab?.color || TAB_COLORS[diary.pages.filter(p => p.tab).length % TAB_COLORS.length] };
    const input = h('input', { type: 'text', maxLength: 14, value: draft.label, dataset: { autofocus: '' }, oninput: e => { draft.label = e.target.value; } });
    openModal({
      title: '🔖',
      body: h('div', { class: 'tab-edit' }, input, swatches(draft.color, c => { draft.color = c; }, TAB_COLORS)),
      actions: [
        page.tab ? { label: 'remove tab', kind: 'danger', onClick: close => { page.tab = null; save(); drawTabs(); fit(); close(); } } : null,
        { label: 'done', kind: 'primary', onClick: close => { page.tab = { label: draft.label.trim(), color: draft.color }; save(); drawTabs(); fit(); close(); } },
      ].filter(Boolean),
    });
  }

  function songBox() {
    const page = diary.pages[active];
    if (!page.song) { addSong(page); return; }
    const box = openModal({
      title: '🎵',
      body: h('div', { class: 'song-edit' },
        h('div', { class: 'song-name' }, page.song.title || '♪'),
        segmented([{ value: 'cassette', label: '📼 cassette' }, { value: 'vinyl', label: '💿 record' }], page.song.look || 'cassette', v => { page.song.look = v; save(); redrawPage(active); }),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn sm', onclick: () => { box.close(); addSong(page); } }, 'change song'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { box.close(); removeSong(page); } }, 'remove song'))),
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
    });
  }

  async function addSong(page) {
    const file = await pickFile('audio/*');
    if (!file) return;
    if (file.size > MAX_SONG) { toast(`${file.name} is too big (${MAX_SONG / 1e6} mb max)`, 'bad'); return; }
    try {
      const imageId = await store.putImage(file);
      const old = page.song;
      page.song = { imageId, title: file.name.replace(/\.[^.]+$/, ''), look: old?.look || 'cassette' };
      save();
      if (old?.imageId) { await player.want(null); store.deleteImage(old.imageId); }
      redrawPage(diary.pages.indexOf(page));
      syncSong();
    } catch (err) {
      console.error(err);
      toast("couldn't add that song", 'bad');
    }
  }

  async function removeSong(page) {
    const old = page.song;
    page.song = null;
    save();
    await player.want(null);
    if (old?.imageId) store.deleteImage(old.imageId);
    redrawPage(diary.pages.indexOf(page));
    syncSong();
  }

  // the song on the page you're on plays; turning away stops it
  function syncSong() {
    const vis = [at, at + 1].slice(0, perView()).map(i => diary.pages[i]).filter(Boolean);
    const song = diary.pages[active]?.song || vis.find(p => p.song)?.song || null;
    player.want(song);
  }

  async function download(both) {
    for (const p of live.values()) p.layer.select(null);
    const node = both ? spread : live.get(active)?.el;
    if (!node) return;
    const pages = both ? `${at + 1}-${at + 2}` : `${active + 1}`;
    const name = `${(diary.cover.title.text || 'diary').trim().replace(/[^\w-]+/g, '-') || 'diary'}-page-${pages}.png`;
    try {
      const { savePNG } = await import('../diary/snapshot.js');
      await savePNG(node, name);
      toast('📸 saved');
    } catch (err) {
      console.error(err);
      toast("couldn't save the page", 'bad');
    }
  }

  function addPageAfter() {
    const page = diary.pages[active];
    diary.pages.splice(active + 1, 0, freshPage(diary, page));
    save();
    showPages(false);
  }

  function goTo(i) {
    if (i >= at && i < at + perView()) { setActive(i); return; }
    flip(0, i);
  }

  // ripping or burning a page out. everything on it goes (pictures, drawing, song)
  async function destroyPage(how) {
    if (busy || flipping) return;
    const burn = how === 'burn';
    if (!await confirmDialog(`${burn ? 'burn' : 'rip out'} page ${active + 1}? everything on it goes too.`, { okLabel: burn ? '🔥 burn it' : '✂️ rip it out', danger: true })) return;
    busy = true;
    await flushAll();
    const i = active;
    const p = live.get(i);
    const side = p?.el.classList.contains('side-left') ? 'left' : 'right';
    const left = p?.el.offsetLeft ?? 14, top = p?.el.offsetTop ?? 14;
    const pics = burn ? [staticPage(i, side)] : [staticPage(i, side), staticPage(i, side)];
    removePage(i);
    const holder = h('div', { class: 'fx-holder', style: { left: left + 'px', top: top + 'px', width: W + 'px', height: H + 'px' } });
    spread.append(holder);
    try {
      if (burn) await burnPage(holder, pics[0], { W, H });
      else await ripPage(holder, () => pics.shift(), { W, H, side });
    } finally {
      holder.remove();
      busy = false;
    }
  }

  function removePage(i) {
    const [gone] = diary.pages.splice(i, 1);
    for (const id of imageIdsIn(gone)) store.deleteImage(id);
    while (diary.pages.length < 2) diary.pages.push(freshPage(diary, gone));
    at = snap(Math.min(at, diary.pages.length - 1));
    active = Math.min(active, diary.pages.length - 1);
    save();
    showPages(false);
  }

  // ---- putting the pages on screen ----

  function livePage(i, side) {
    const page = diary.pages[i];
    if (!page) return h('div', { class: paperClass(diary.paper, `dpage side-${side} dpage-empty`) });
    const { el: pg, textStyle, textBox } = pageEl(diary, page, i, side, true);
    const date = h('input', {
      class: 'dp-date-val', value: page.date, maxLength: 24, style: { fontFamily: textStyle.fontFamily, color: page.ink },
      oninput: e => { page.date = e.target.value; save(); },
    });
    pg.append(h('label', { class: 'dp-date' }, h('span', { class: 'dp-date-label' }, 'date'), date));
    let last = page.text;
    const text = h('textarea', { class: 'dp-text', spellcheck: false, value: page.text, style: { ...textStyle, ...textBox } });
    text.addEventListener('input', () => {
      text.rejected = false;
      if (text.scrollHeight > text.clientHeight + 2) { // the page is full
        const pos = Math.max(0, text.selectionStart - (text.value.length - last.length));
        text.value = last;
        text.setSelectionRange(pos, pos);
        text.rejected = true;
        pg.classList.remove('full');
        void pg.offsetWidth;
        pg.classList.add('full');
        return;
      }
      last = page.text = text.value;
      save();
    });
    typewriterKeys(text, pg);
    text.addEventListener('focus', () => setActive(i));
    const sketch = new Sketch(page, diary, save);
    const layer = itemsLayer({ items: page.items, diary, onChange: save, onPick: it => { picked = it; setActive(i, true); drawSub(); } });
    pg.append(text, sketch.el, layer.el);
    if (page.song) pg.append(player.widget(page.song));
    pg.addEventListener('pointerdown', () => setActive(i), true);
    // envelopes + pockets open with a click while writing (and a double click while decorating)
    pg.addEventListener('pointerdown', e => {
      if (mode !== 'write') return;
      const n = e.target.closest?.('.it-envelope, .it-pocket');
      if (!n) return;
      e.stopPropagation();
      e.preventDefault();
      const it = page.items.find(x => x.id === n.dataset.id);
      if (it) openLetter(n, it);
    }, true);
    pg.addEventListener('dblclick', e => {
      const n = e.target.closest?.('.it-envelope, .it-pocket');
      const it = n && page.items.find(x => x.id === n.dataset.id);
      if (it) openLetter(n, it);
    });
    live.set(i, { sketch, layer, el: pg });
    if (i === active) pg.classList.add('active');
    return pg;
  }

  function setActive(i, keepSub) {
    if (active === i) return;
    for (const [j, p] of live) {
      p.el.classList.toggle('active', j === i);
      if (j !== i) p.layer.select(null);
    }
    active = i;
    if (!keepSub) picked = null;
    drawSub();
    syncSong();
  }

  async function flushAll() {
    await Promise.all([...live.values()].map(p => p.sketch.flush()));
  }

  // pop = let the pop-ups stand up (turning to a page, opening the book)
  function showPages(pop = true) {
    live.clear();
    if (active < at || active >= at + perView()) active = at;
    fill(spread,
      tabsLayer,
      livePage(at, single ? 'right' : 'left'),
      single ? null : livePage(at + 1, 'right'));
    spread.classList.toggle('single', single);
    drawTabs();
    drawLabel();
    drawSub();
    syncSong();
    if (pop) popUp();
    history.replaceState(null, '', `#/diary/${diary.id}/write/${at + 1}`);
  }

  function redrawPage(i) {
    const p = live.get(i);
    if (!p) return;
    const side = p.el.classList.contains('side-left') ? 'left' : 'right';
    p.el.replaceWith(livePage(i, side));
  }

  // ---- index tabs sticking out of the page edges ----
  const TAB_H = 70, TAB_TOP = 30;
  function drawTabs() {
    tabsLayer.replaceChildren();
    const tabbed = diary.pages.map((p, i) => [p, i]).filter(([p]) => p.tab);
    if (!tabbed.length) return;
    const slots = Math.max(1, Math.floor((H - TAB_TOP - 24) / (TAB_H + 6)));
    const pagesW = single ? W : W * 2;
    tabbed.forEach(([p, i], n) => {
      const y = TAB_TOP + (n % slots) * (TAB_H + 6) + Math.floor(n / slots) * (TAB_H / 2);
      let side, here;
      if (single) { side = i < at ? 'left' : 'right'; here = i === at; } else if (i < at) side = 'left'; else if (i > at + 1) side = 'right'; else { side = i === at ? 'left' : 'right'; here = true; }
      tabsLayer.append(h('button', {
        type: 'button', class: `ptab ptab-${side}${here ? ' here' : ''}`, title: `${p.tab.label || ''} · ${i + 1}`,
        style: { top: 14 + y + 'px', left: (side === 'right' ? 14 + pagesW - 12 : 14 + 12 - 48) + 'px', '--tab': p.tab.color },
        onclick: () => goTo(i),
      }, h('span', {}, p.tab.label || '♡')));
    });
  }

  // ---- turning the page ----

  // dir = ±1 for the next / last spread, or pass a page to jump straight to it
  async function flip(dir, target) {
    if (flipping || busy) return;
    const step = perView();
    const next = target != null ? snap(target) : at + dir * step;
    if (next < 0 || next === at) return;
    dir = Math.sign(next - at);
    flipping = true;
    await flushAll();
    while (diary.pages.length < next + step) diary.pages.push(freshPage(diary, diary.pages[diary.pages.length - 1]));
    save();

    const old = at;
    const oldPages = [...spread.querySelectorAll(':scope > .dpage')];
    const leafFront = dir > 0 ? (single ? oldPages[0] : oldPages[1]) : oldPages[0];
    const frontPic = staticPage(dir > 0 ? (single ? old : old + 1) : old, dir > 0 ? 'right' : (single ? 'right' : 'left'));
    const backPic = single
      ? h('div', { class: paperClass(diary.paper, 'dpage side-left page-back' + (diary.aged ? ' aged' : '')) })
      : staticPage(dir > 0 ? next : next + 1, dir > 0 ? 'left' : 'right');
    const leaf = h('div', { class: `leaf ${dir > 0 ? 'fwd' : 'bwd'}${single ? ' single' : ''}` },
      h('div', { class: 'leaf-face front' }, frontPic),
      h('div', { class: 'leaf-face back' }, backPic));

    // jumping far (a tab): a few pages riffle past first
    const riffles = Math.min(3, Math.abs(next - old) / step - 1);
    const extra = [];
    for (let k = 0; k < riffles; k++) {
      const blank = s => h('div', { class: paperClass(diary.paper, `dpage side-${s} page-back riffle-face${diary.aged ? ' aged' : ''}`) });
      extra.push(h('div', { class: `leaf riffle ${dir > 0 ? 'fwd' : 'bwd'}${single ? ' single' : ''}`, style: { transitionDelay: k * 70 + 'ms' } },
        h('div', { class: 'leaf-face front' }, blank(dir > 0 ? 'right' : 'left')),
        h('div', { class: 'leaf-face back' }, blank(dir > 0 ? 'left' : 'right'))));
    }
    leaf.style.transitionDelay = riffles * 70 + 'ms';

    at = next;
    active = at;
    live.clear();
    // what's under the page that's turning shows straight away, the other side waits for the page to land
    if (single) {
      fill(spread, tabsLayer, livePage(at, 'right'));
    } else if (dir > 0) {
      leafFront.replaceWith(livePage(at + 1, 'right'));
    } else {
      leafFront.replaceWith(livePage(at, 'left'));
    }
    spread.append(...extra, leaf);
    drawTabs();
    drawLabel();
    requestAnimationFrame(() => requestAnimationFrame(() => { extra.forEach(x => x.classList.add('go')); leaf.classList.add('go'); }));
    await new Promise(r => setTimeout(r, 720 + riffles * 70));
    leaf.remove();
    extra.forEach(x => x.remove());
    showPages();
    flipping = false;
  }

  function staticPage(i, side) {
    const page = diary.pages[i];
    if (!page) return h('div', { class: paperClass(diary.paper, `dpage side-${side}`) });
    return pageEl(diary, page, i, side, false).el;
  }

  // ---- fitting the open book on screen ----
  function fit() {
    const pad = 28;
    const tabPad = diary.pages.some(p => p.tab) ? 50 : 0;
    const bw = (single ? W : W * 2) + pad, bh = H + pad;
    // on a computer, sized against the biggest diary so the sizes feel different. on a phone, as big as it fits
    const ref = single ? { w: bw + tabPad, h: bh } : { w: BIGGEST.w * 2 + pad + tabPad, h: BIGGEST.h + pad };
    const s = Math.max(.3, Math.min((stage.clientWidth - (single ? 16 : 110)) / ref.w, (stage.clientHeight - 16) / ref.h));
    scaler.style.width = bw * s + 'px';
    scaler.style.height = bh * s + 'px';
    spread.style.transform = `scale(${s})`;
  }
  spread.style.background = material(diary.cover);
  for (const [k, v] of Object.entries(sizeVars(diary))) spread.style.setProperty(k, v);

  const onKey = e => {
    if (e.target.matches('input, textarea, select')) return;
    if (document.querySelector('.modal-wrap, .lv-wrap')) return;
    if (e.key === 'ArrowRight') flip(1);
    if (e.key === 'ArrowLeft') flip(-1);
    if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'decor') live.get(active)?.layer.removeSelected();
  };
  const onNarrow = () => {
    if (single === narrow.matches) return;
    single = narrow.matches;
    at = snap(at);
    showPages(false);
    fit();
  };
  document.addEventListener('keydown', onKey);
  narrow.addEventListener('change', onNarrow);
  const ro = new ResizeObserver(fit);
  ro.observe(stage);

  drawTools();
  showPages();
  requestAnimationFrame(fit);

  return () => {
    flushAll();
    player.stop();
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
    narrow.removeEventListener('change', onNarrow);
  };
}
