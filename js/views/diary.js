// a diary: the closed book in 3d (#/diary/<id>), and the open book you write in (#/diary/<id>/write[/<page>]).
//
// pages are real paper (lined, grid, dots...). you can type on the lines, draw with pens + glitter, and stick
// stickers + photos anywhere. the page turns like a real page when you flip.

import { store } from '../store.js';
import { newPage } from '../model.js';
import { h, fill, toast, openModal, confirmDialog, segmented, swatches, pickFile, shrinkImage } from '../ui.js';
import { dims, sizeVars, BIGGEST, book3d, material, preset } from '../diary/covers.js';
import { itemNode, itemsLayer, newItem, sizeSlider } from '../diary/items.js';
import { STICKER_TABS, stickerNode, TAPES } from '../diary/stickers.js';
import { Sketch, pen, TOOLS } from '../diary/sketch.js';

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
const writeFont = id => WRITE_FONTS.find(f => f.id === id) || WRITE_FONTS[0];
export const INKS = ['#27306b', '#141114', '#2357d9', '#d6203a', '#ff3d8b', '#8a3ffc', '#1f8a5b', '#b8860b', '#ffffff', '#c0c0c8'];

// dark ink doesn't show on black paper (and white doesn't show on the rest), so swap them over
export function fixInks(diary, color) {
  const black = color === 'black';
  for (const p of diary.pages) {
    if (black && (p.ink === '#27306b' || p.ink === '#141114')) p.ink = '#ffffff';
    if (!black && p.ink === '#ffffff') p.ink = '#27306b';
  }
}

export const paperClass = (paper, extra = '') => `paper paper-${paper.kind} paper-${paper.color} ${extra}`;

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
  function open() {
    if (opening) return;
    opening = true;
    rx = 0; ry = 0;
    book.classList.add('opening');
    turn();
    setTimeout(() => book.classList.add('open'), 420);
    setTimeout(() => go(`diary/${diary.id}/write`), 1350);
  }

  el.append(h('div', { class: 'diary-book-page' },
    stage,
    h('div', { class: 'book-actions' },
      h('a', { class: 'btn ghost', href: '#/' }, '← shelf'),
      h('button', { class: 'btn', onclick: () => go(`diary/${diary.id}/cover`) }, '🎨 cover'),
      h('button', { class: 'btn primary', onclick: open }, '📖 open'),
      h('button', { class: 'btn ghost', title: 'delete diary', onclick: remove }, '🗑'))));

  async function remove() {
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

// live = you can write/draw/decorate it. otherwise it's a picture of the page (for the page turning)
function pageEl(diary, page, n, side, live) {
  const f = writeFont(page.font);
  const ink = page.ink;
  const el = h('div', {
    class: paperClass(diary.paper, `dpage side-${side}`),
    style: { '--ink': ink, '--lh': LINE + 'px', '--top': TOP + 'px' },
  });
  const textStyle = { fontFamily: f.css, fontSize: f.size + 'px', paddingTop: (f.dy || 0) + 'px', color: ink };
  const H = dims(diary).h;
  const rows = Math.floor((H - 30 - (TOP - LINE)) / LINE);
  const textBox = { top: TOP - LINE + 'px', height: rows * LINE + 'px' };
  el.append(h('div', { class: 'dp-shade' }));
  el.append(h('span', { class: 'dp-num' }, n + 1));
  if (!live) {
    el.append(h('div', { class: 'dp-date' }, h('span', { class: 'dp-date-label' }, 'date'), h('span', { class: 'dp-date-val', style: { fontFamily: f.css, color: ink } }, page.date)));
    el.append(h('div', { class: 'dp-text', style: { ...textStyle, ...textBox } }, page.text));
    if (page.drawing.imageId) {
      const img = h('img', { class: 'dp-draw', alt: '', draggable: false, onload: () => { img.style.width = img.naturalWidth / 2 + 'px'; img.style.height = img.naturalHeight / 2 + 'px'; } });
      store.imageURL(page.drawing.imageId).then(url => { if (url) img.src = url; });
      el.append(img);
    }
    el.append(h('div', { class: 'items' }, page.items.map(it => itemNode(it, diary))));
  }
  return { el, textStyle, textBox };
}

// ============ the open book ============

export function renderWrite(el, { diary, startAt, go }) {
  const { w: W, h: H } = dims(diary);
  const narrow = matchMedia('(max-width: 760px)');
  let single = narrow.matches;
  let at = Math.max(0, Math.min(diary.pages.length - 1, startAt || 0)); // first page showing
  let mode = 'write';
  let active = at; // the page new stickers + photos go on
  let flipping = false;
  let picked = null; // the item selected in sticker mode
  let stickerTab = STICKER_TABS[0][0];
  let photoFrame = 'polaroid';
  const live = new Map(); // page index -> { sketch, layer, el }

  const save = () => store.saveDiary(diary);

  const stage = h('div', { class: 'diary-stage' });
  const spread = h('div', { class: 'spread' });
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
      fill(sub,
        h('select', { class: 'font-pick', onchange: e => { page.font = e.target.value; save(); redrawPage(active); } },
          WRITE_FONTS.map(f => h('option', { value: f.id, selected: f.id === page.font, style: { fontFamily: f.css } }, f.label))),
        inkRow(page.ink, c => { page.ink = c; save(); redrawPage(active); }));
    } else if (mode === 'draw') {
      fill(sub,
        h('div', { class: 'seg-row' }, TOOLS.map(t => h('button', { class: 'pen-btn' + (pen.tool === t.id ? ' on' : ''), title: t.id, onclick: () => { pen.tool = t.id; drawSub(); } }, t.icon))),
        segmented([{ value: .6, label: 'S' }, { value: 1, label: 'M' }, { value: 1.8, label: 'L' }], pen.size, v => { pen.size = v; }),
        inkRow(pen.color, c => { pen.color = c; }),
        h('button', { class: 'btn ghost sm', title: 'undo', onclick: undo }, '↶'),
        h('button', { class: 'btn ghost sm', onclick: wipe }, 'clear'));
    } else {
      const it = picked;
      fill(sub,
        it ? sizeSlider(it, live.get(active).layer, save) : null,
        it?.kind === 'photo' ? segmented(['polaroid', 'tape', 'plain', 'sticker'].map(v => ({ value: v, label: v })), it.frame || 'polaroid', v => {
          it.frame = photoFrame = v;
          save();
          live.get(active)?.layer.draw();
        }) : null,
        it ? h('button', { class: 'btn ghost sm', onclick: () => live.get(active)?.layer.removeSelected() }, '✕ remove') : null,
        h('button', { class: 'btn ghost sm', onclick: addOwnSticker }, '+ my own sticker'));
    }
  }

  function inkRow(value, onPick) {
    return swatches(value, onPick, INKS);
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

  // ---- sticker drawer ----
  function drawDrawer() {
    const tab = STICKER_TABS.find(t => t[0] === stickerTab) || STICKER_TABS[0];
    fill(drawer,
      h('div', { class: 'stk-tabs' }, STICKER_TABS.map(([name, icon]) =>
        h('button', { class: 'stk-tab' + (name === stickerTab ? ' on' : ''), title: name, onclick: () => { stickerTab = name; drawDrawer(); } }, h('span', { class: 'stk-tab-icon' }, stickerNode(icon)), h('span', { class: 'stk-tab-name' }, name)))),
      h('div', { class: 'stk-grid' }, tab[2].map(s => h('button', { class: 'stk-cell', onclick: () => stick(s) }, stickerNode(s)))));
  }

  function stick(s) {
    const p = live.get(active);
    if (!p) return;
    const tape = s.startsWith('t:');
    p.layer.add(newItem({
      kind: 'sticker', s,
      x: Math.round(W / 2 + (Math.random() - .5) * W * .4),
      y: Math.round(H / 2 + (Math.random() - .5) * H * .4),
      r: Math.round((Math.random() - .5) * (tape ? 50 : 24)),
      k: s.startsWith('e:') ? .9 : 1,
    }));
  }

  async function addOwnSticker() { await addPhoto('sticker'); }

  async function addPhoto(frame = photoFrame) {
    const file = await pickFile('image/*', false);
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
    const redraw = () => { save(); showPages(); };
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
      ],
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
    });
    requestAnimationFrame(() => document.querySelector(`.paper-chip[title="${diary.paper.color}"]`)?.classList.add('on'));
  }

  function pageBox() {
    const box = openModal({
      title: `page ${active + 1}`,
      body: h('div', { class: 'page-menu' },
        h('button', { type: 'button', class: 'btn', onclick: () => { box.close(); addPageAfter(); } }, '+ add a page after this'),
        h('button', { type: 'button', class: 'btn danger', onclick: () => { box.close(); tearOut(); } }, '✂ tear out this page')),
    });
  }

  function addPageAfter() {
    const page = diary.pages[active];
    diary.pages.splice(active + 1, 0, newPage(page));
    save();
    showPages();
  }

  async function tearOut() {
    if (!await confirmDialog(`tear out page ${active + 1}? everything on it goes too.`, { okLabel: 'tear it out', danger: true })) return;
    await flushAll();
    const [gone] = diary.pages.splice(active, 1);
    for (const it of gone.items) if (it.imageId) store.deleteImage(it.imageId);
    if (gone.drawing.imageId) store.deleteImage(gone.drawing.imageId);
    if (diary.pages.length < 2) diary.pages.push(newPage(gone));
    at = snap(Math.min(at, diary.pages.length - 1));
    active = Math.min(active, diary.pages.length - 1);
    save();
    showPages();
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
      if (text.scrollHeight > text.clientHeight + 2) { // the page is full
        const pos = Math.max(0, text.selectionStart - (text.value.length - last.length));
        text.value = last;
        text.setSelectionRange(pos, pos);
        pg.classList.remove('full');
        void pg.offsetWidth;
        pg.classList.add('full');
        return;
      }
      last = page.text = text.value;
      save();
    });
    text.addEventListener('focus', () => setActive(i));
    const sketch = new Sketch(page, diary, save);
    const layer = itemsLayer({ items: page.items, diary, onChange: save, onPick: it => { picked = it; setActive(i, true); drawSub(); } });
    pg.append(text, sketch.el, layer.el);
    pg.addEventListener('pointerdown', () => setActive(i), true);
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
  }

  async function flushAll() {
    await Promise.all([...live.values()].map(p => p.sketch.flush()));
  }

  function showPages() {
    live.clear();
    if (active < at || active >= at + perView()) active = at;
    fill(spread,
      livePage(at, single ? 'right' : 'left'),
      single ? null : livePage(at + 1, 'right'));
    spread.classList.toggle('single', single);
    drawLabel();
    drawSub();
    history.replaceState(null, '', `#/diary/${diary.id}/write/${at + 1}`);
  }

  function redrawPage(i) {
    const p = live.get(i);
    if (!p) return;
    const side = p.el.classList.contains('side-left') ? 'left' : 'right';
    p.el.replaceWith(livePage(i, side));
  }

  // ---- turning the page ----

  async function flip(dir) {
    if (flipping) return;
    const step = perView();
    const next = at + dir * step;
    if (next < 0) return;
    flipping = true;
    await flushAll();
    while (diary.pages.length < next + step) diary.pages.push(newPage(diary.pages[diary.pages.length - 1]));
    save();

    const old = at;
    const oldPages = [...spread.children];
    const leafFront = dir > 0 ? (single ? oldPages[0] : oldPages[1]) : oldPages[0];
    const frontPic = staticPage(dir > 0 ? (single ? old : old + 1) : old, dir > 0 ? 'right' : (single ? 'right' : 'left'));
    const backPic = single
      ? h('div', { class: paperClass(diary.paper, 'dpage side-left page-back') })
      : staticPage(dir > 0 ? next : next + 1, dir > 0 ? 'left' : 'right');
    const leaf = h('div', { class: `leaf ${dir > 0 ? 'fwd' : 'bwd'}${single ? ' single' : ''}` },
      h('div', { class: 'leaf-face front' }, frontPic),
      h('div', { class: 'leaf-face back' }, backPic));

    at = next;
    active = at;
    live.clear();
    // what's under the page that's turning shows straight away, the other side waits for the page to land
    if (single) {
      fill(spread, livePage(at, 'right'));
    } else if (dir > 0) {
      leafFront.replaceWith(livePage(at + 1, 'right'));
    } else {
      leafFront.replaceWith(livePage(at, 'left'));
    }
    spread.append(leaf);
    drawLabel();
    requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('go')));
    await new Promise(r => setTimeout(r, 720));
    leaf.remove();
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
    const bw = (single ? W : W * 2) + pad, bh = H + pad;
    // on a computer, sized against the biggest diary so the sizes feel different. on a phone, as big as it fits
    const ref = single ? { w: bw, h: bh } : { w: BIGGEST.w * 2 + pad, h: BIGGEST.h + pad };
    const s = Math.max(.3, Math.min((stage.clientWidth - (single ? 16 : 110)) / ref.w, (stage.clientHeight - 16) / ref.h));
    scaler.style.width = bw * s + 'px';
    scaler.style.height = bh * s + 'px';
    spread.style.transform = `scale(${s})`;
  }
  spread.style.background = material(diary.cover);
  for (const [k, v] of Object.entries(sizeVars(diary))) spread.style.setProperty(k, v);

  const onKey = e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight') flip(1);
    if (e.key === 'ArrowLeft') flip(-1);
    if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'decor') live.get(active)?.layer.removeSelected();
  };
  const onNarrow = () => {
    single = narrow.matches;
    at = snap(at);
    showPages();
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
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
    narrow.removeEventListener('change', onNarrow);
  };
}
