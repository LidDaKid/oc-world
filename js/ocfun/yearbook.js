// yearbook: the oc's own yearbook page (photo, quote, superlatives, clubs) with other ocs' autographs
// scribbled all over it, plus a "class page" spread of everyone in their world. turn the page between them.

import { h, s, fill, uid, toast, openModal, confirmDialog, segmented } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, sticker, portrait, nameOf, ocById, allOcs } from './kit.js';
import { picNow } from './card-holo.js';

export const meta = { id: 'yearbook', label: 'yearbook', icon: '1f4d6' };

const FONTS = [
  { id: 'caveat', font: "'Caveat', cursive", k: 1.15 },
  { id: 'gloria', font: "'Gloria Hallelujah', cursive", k: 0.9 },
  { id: 'indie', font: "'Indie Flower', cursive", k: 1 },
  { id: 'shadows', font: "'Shadows Into Light', cursive", k: 1.05 },
  { id: 'patrick', font: "'Patrick Hand', cursive", k: 1.05 },
  { id: 'reenie', font: "'Reenie Beanie', cursive", k: 1.3 },
  { id: 'apple', font: "'Homemade Apple', cursive", k: 0.8 },
  { id: 'marker', font: "'Permanent Marker', cursive", k: 0.9 },
];
const fontOf = id => FONTS.find(f => f.id === id) || FONTS[0];

// inks. the last two are gel pens
const INKS = [
  { id: '#2140a8', label: 'blue pen' }, { id: '#1a1a1a', label: 'black pen' }, { id: '#ff3fa4', label: 'pink gel' },
  { id: '#8a3ffc', label: 'purple gel' }, { id: '#d62839', label: 'red pen' }, { id: '#12925a', label: 'green pen' },
  { id: 'silver', label: 'silver gel' }, { id: 'gold', label: 'gold gel' },
];
const inkColor = ink => (ink === 'silver' ? '#b9c0cc' : ink === 'gold' ? '#d9a521' : ink);

const PHRASES = ['HAGS', 'stay cool', 'BFFL', 'LYLAS', '2 cute 2 be 4gotten', 'never change', 'keep in touch', 'xoxo', 'see u next year', 'ur iconic'];
const SIGNOFFS = ['—', 'love,', 'xoxo,', 'bffl,', 'ur bestie,', 'from,'];

// hand drawn doodles (24x24 paths, drawn with the ink)
const DOODLES = {
  heart: ['M12 20.5s-7.2-4.4-9.3-9C1.3 8.3 3.4 4.9 6.6 4.8c2.3-.1 4 1.4 5.4 3.4 1.4-2 3.1-3.5 5.4-3.4 3.2.1 5.3 3.5 3.9 6.7-2.1 4.6-9.3 9-9.3 9z'],
  hearts: ['M8 16s-5-3-6.4-6.2C.6 7.6 2 5.3 4.3 5.2c1.6 0 2.8 1 3.7 2.4.9-1.4 2.1-2.4 3.7-2.4 2.2.1 3.6 2.4 2.7 4.6C13 13 8 16 8 16z', 'M17.5 21s-3.4-2-4.4-4.2c-.7-1.5.3-3.1 1.8-3.2 1.1 0 1.9.7 2.6 1.6.6-.9 1.4-1.6 2.5-1.6 1.6.1 2.5 1.7 1.9 3.2-1 2.2-4.4 4.2-4.4 4.2z'],
  star: ['M12 2.5l2.8 6.3 6.8.7-5.1 4.6 1.5 6.8L12 17.4l-6 3.5 1.5-6.8-5.1-4.6 6.8-.7z'],
  smiley: ['M12 2.8a9.2 9.2 0 1 0 .1 0z', 'M8.6 9.2v1.4', 'M15.4 9.2v1.4', 'M7.4 14c1.3 2.4 3 3.3 4.7 3.3s3.4-.9 4.6-3.3'],
  flower: ['M12 9.5a2.5 2.5 0 1 0 .1 0z', 'M12 9.4C10.6 6.6 10.8 3.3 12 2.6c1.2.7 1.4 4 0 6.8z', 'M14.4 11.4c2.4-2 5.6-2.6 6.6-1.6-.4 1.4-3.4 2.7-6.6 1.6z', 'M13.6 14.4c1.6 2.7 1.8 6 .7 6.8-1.3-.5-2-3.8-.7-6.8z', 'M10.4 14.4c-1.3 3-2 6.3-.7 6.8 1.1-.8.9-4.1.7-6.8z', 'M9.6 11.4C6.4 12.5 3.4 11.2 3 9.8c1-1 4.2-.4 6.6 1.6z'],
  bolt: ['M13.5 2L4.5 13.6h6.6L9.6 22l9.4-12.2h-6.8z'],
  crown: ['M3 18.5h18L19.2 7.8l-4.4 4.4L12 5.5l-2.8 6.7-4.4-4.4z', 'M3.4 21h17.2'],
  skull: ['M12 3c-4.6 0-8 3.2-8 7.4 0 2.6 1.3 4.4 3 5.4V19h10v-3.2c1.7-1 3-2.8 3-5.4C20 6.2 16.6 3 12 3z', 'M9 10.5a1.5 1.5 0 1 0 .1 0z', 'M15 10.5a1.5 1.5 0 1 0 .1 0z', 'M10 19v2', 'M14 19v2', 'M12 13.2l-.8 1.6h1.6z'],
  swirl: ['M12 12c0-1 1-1.6 1.8-1.2 1.2.6 1.2 2.4 0 3.2-1.8 1.2-4.2 0-4.6-2-.6-2.8 1.8-5 4.6-4.8 3.6.3 5.6 3.8 4.6 7.2-1.2 4-5.8 5.6-9.4 3.8'],
  arrow: ['M3 15c4-6 10-8 17-6', 'M16 5.5l4 3.5-4.6 2.6'],
};

const SUP_IDEAS = ['start a band', 'become famous', 'cry at a movie', 'get lost in the woods', 'adopt 12 cats', 'rule the world', 'be late to their own wedding', 'befriend a ghost', 'become a legend'];
const FRAMES = [['classic', 'classic'], ['polaroid', 'polaroid'], ['oval', 'oval'], ['heart', 'heart'], ['scallop', 'scallop']];
const THEMES = [['classic', 'classic'], ['midnight', 'midnight'], ['bubblegum', 'bubblegum']];
const CLUB_ICONS = ['1f3b8', '1f3a4', '1f3a8', '1f4da', '1f3ad', '26bd', '1f4f8', '1f9ea', '1f987', '1f52e', '1f3ae', '1f339', '1f3c6', '1f4dd', '1f47b', '2b50'];

function doodle(name, ink, cls = '') {
  const paths = DOODLES[name];
  if (!paths) return null;
  return s('svg', { class: 'yb-doodle ' + cls, viewBox: '0 0 24 24', fill: 'none', stroke: inkColor(ink), 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    paths.map(d => s('path', { d })));
}

const yb = char => char?.fun?.yearbook || {};

function defaults(char) {
  const w = store.worldsOf(char.id)[0];
  return {
    school: w?.name || '', year: '2026', quote: char.tagline || '', superlatives: [SUP_IDEAS[Math.floor(Math.random() * SUP_IDEAS.length)]], clubs: [],
    frame: 'classic', theme: 'classic', photo: { from: 'pfp', imageId: null }, sigs: [], view: 'mine', world: null,
  };
}

function fixData(d, char) {
  const def = defaults(char);
  for (const k of Object.keys(def)) if (d[k] == null) d[k] = def[k];
  d.photo = { ...def.photo, ...d.photo };
  if (!Array.isArray(d.sigs)) d.sigs = [];
  if (!Array.isArray(d.superlatives)) d.superlatives = [];
  if (!Array.isArray(d.clubs)) d.clubs = [];
  return d;
}

function photoOf(char, d, cls) {
  const id = d.photo?.from === 'upload' && d.photo.imageId ? d.photo.imageId : char.imageId;
  const el = h('div', { class: 'yb-photo ' + cls, style: { '--c': char.color } });
  el.append(id ? picNow(store, id) : h('span', { class: 'yb-initial' }, (nameOf(char)[0] || '?').toUpperCase()));
  return el;
}

// one autograph on the page
function sigEl(sig) {
  const f = fontOf(sig.font);
  const by = ocById(sig.by);
  const name = by ? nameOf(by) : sig.byName || 'someone';
  const gel = sig.ink === 'silver' || sig.ink === 'gold';
  return h('div', {
    class: 'yb-sig' + (gel ? ' gel gel-' + sig.ink : ''), dataset: { id: sig.id },
    style: { left: sig.x + '%', top: sig.y + '%', '--rot': sig.rot + 'deg', '--size': (sig.size || 1) * f.k, '--ink': inkColor(sig.ink), fontFamily: f.font },
  },
    h('div', { class: 'yb-sig-text' }, sig.text),
    h('div', { class: 'yb-sig-by' }, `${sig.sign || '—'} ${name}`),
    sig.doodle ? doodle(sig.doodle, sig.ink, 'yb-sig-doodle d-' + (sig.id.charCodeAt(3) % 3)) : null);
}

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = fixData(ctx.data, char);
  const worlds = store.worldsOf(char.id);
  if (d.view === 'class' && !worlds.length) d.view = 'mine';
  let pageL, pageR;
  const book = h('div', { class: 'yb-book' });
  const bar = h('div', { class: 'yb-bar' });

  const save = () => ctx.save();

  // ---- my page ----
  function leftPage() {
    const sups = d.superlatives.filter(x => x.trim());
    return h('div', { class: 'yb-page yb-left' }, h('div', { class: 'yb-in' },
      h('div', { class: 'yb-head' }, h('span', {}, d.school || 'yearbook'), h('span', {}, d.year)),
      h('div', { class: 'yb-photo-wrap frame-' + d.frame }, photoOf(char, d, 'yb-photo-main'), d.frame === 'polaroid' ? h('i', { class: 'yb-tape' }) : null),
      h('div', { class: 'yb-name' }, nameOf(char)),
      d.quote ? h('blockquote', { class: 'yb-quote' }, d.quote) : null,
      sups.length ? h('div', { class: 'yb-sups' }, sups.slice(0, 3).map(t => h('div', { class: 'yb-sup' }, h('small', {}, 'most likely to'), h('b', {}, t)))) : null,
      d.clubs.length ? h('div', { class: 'yb-clubs' }, d.clubs.slice(0, 6).map(c => h('span', { class: 'yb-club' }, sticker(c.icon || '2b50', 'yb-club-icon'), c.name))) : null),
      h('div', { class: 'yb-folio' }, '13'));
  }

  function rightPage() {
    return h('div', { class: 'yb-page yb-right' },
      h('div', { class: 'yb-watermark' }, d.year),
      h('div', { class: 'yb-auto-head' }, 'autographs'),
      h('div', { class: 'yb-printed' }, sticker('2b50', 'yb-print p1'), sticker('1f5a4', 'yb-print p2'), sticker('2728', 'yb-print p3')),
      h('div', { class: 'yb-folio r' }, '14'));
  }

  function drawSigs() {
    for (const page of [pageL, pageR]) page.querySelectorAll('.yb-sig').forEach(n => n.remove());
    for (const sig of d.sigs) (sig.side === 'l' ? pageL : pageR).append(sigEl(sig));
  }

  // where a new autograph goes: the emptiest spot, mostly on the autograph page
  function freeSpot() {
    const look = (side, n, x0, x1, y0, y1) => {
      let best = null, bestNear = -1;
      for (let i = 0; i < n; i++) {
        const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0);
        const near = d.sigs.filter(s2 => s2.side === side).reduce((m, s2) => Math.min(m, Math.hypot((s2.x - x) * 0.8, s2.y - y)), 99);
        if (near > bestNear) { bestNear = near; best = { side, x, y }; }
      }
      return [best, bestNear];
    };
    const [r, rNear] = look('r', 40, 34, 66, 22, 90);
    if (rNear >= 15) return r;
    const [l, lNear] = look('l', 30, 34, 66, 8, 94);
    return lNear > rNear ? l : r;
  }

  function drawMine() {
    pageL = leftPage();
    pageR = rightPage();
    fill(book, pageL, h('div', { class: 'yb-fold' }), pageR);
    book.className = 'yb-book theme-' + d.theme;
    drawSigs();
    if (mine) wireDrag();
  }

  // ---- dragging autographs around (across both pages) ----
  function wireDrag() {
    book.onpointerdown = e => {
      const node = e.target.closest('.yb-sig');
      if (!node || e.button > 0) return;
      const sig = d.sigs.find(x => x.id === node.dataset.id);
      if (!sig) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      let moved = false;
      node.setPointerCapture(e.pointerId);
      node.classList.add('lift');
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
        moved = true;
        const pages = [[pageL, 'l'], [pageR, 'r']];
        let [page, side] = pages.find(([p]) => { const r = p.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; }) || [];
        if (!page) { page = sig.side === 'l' ? pageL : pageR; side = sig.side; }
        if (node.parentNode !== page) page.append(node);
        const r = page.getBoundingClientRect();
        sig.side = side;
        sig.x = Math.max(4, Math.min(96, ((ev.clientX - r.left) / r.width) * 100));
        sig.y = Math.max(3, Math.min(97, ((ev.clientY - r.top) / r.height) * 100));
        node.style.left = sig.x + '%';
        node.style.top = sig.y + '%';
      };
      const up = () => {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        node.removeEventListener('pointercancel', up);
        node.classList.remove('lift');
        if (moved) save();
        else openSign(sig);
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
    };
  }

  // ---- the class page ----
  function drawClass() {
    const world = worlds.find(w => w.id === d.world) || worlds[0];
    const cast = world ? store.cast(world) : [];
    const half = Math.ceil(cast.length / 2);
    const entry = oc => {
      const data = yb(oc);
      const sup = (data.superlatives || []).find(x => x?.trim());
      const signed = (data.sigs || []).length;
      const me = oc.id === char.id;
      return h('a', { class: 'yb-mate' + (me ? ' me' : ''), href: ctx.ocLink(oc) + '/fun/yearbook', title: nameOf(oc) },
        h('div', { class: 'yb-mate-pic' }, portrait(oc, 'yb-mate-portrait'), me ? doodle('heart', '#ff3fa4', 'yb-circle') : null),
        h('div', { class: 'yb-mate-name' }, nameOf(oc)),
        sup ? h('div', { class: 'yb-mate-sup' }, h('small', {}, 'most likely to'), ' ', sup) : data.quote || oc.tagline ? h('div', { class: 'yb-mate-sup q' }, `“${data.quote || oc.tagline}”`) : null,
        signed ? h('div', { class: 'yb-mate-signed' }, `✍ ${signed}`) : null);
    };
    const page = (list, side) => h('div', { class: 'yb-page yb-class yb-' + side }, h('div', { class: 'yb-in' },
      side === 'left'
        ? h('div', { class: 'yb-class-head' }, h('div', { class: 'yb-class-kicker' }, world?.name || ''), h('div', { class: 'yb-class-title' }, `class of ${d.year}`))
        : h('div', { class: 'yb-class-head r' }, h('div', { class: 'yb-class-kicker' }, `${cast.length} ${cast.length === 1 ? 'student' : 'students'}`)),
      h('div', { class: 'yb-grid n' + (half <= 2 ? 2 : half <= 4 ? 4 : half <= 9 ? 9 : 16) }, list.map(entry))),
      h('div', { class: 'yb-printed' }, sticker(side === 'left' ? '1f393' : '2b50', 'yb-print p1'), sticker('2728', 'yb-print p3')),
      h('div', { class: 'yb-folio' + (side === 'right' ? ' r' : '') }, side === 'left' ? '20' : '21'));
    pageL = page(cast.slice(0, half), 'left');
    pageR = page(cast.slice(half), 'right');
    fill(book, pageL, h('div', { class: 'yb-fold' }), pageR);
    book.className = 'yb-book theme-' + d.theme + ' is-class';
    book.onpointerdown = null;
  }

  function draw() { (d.view === 'class' ? drawClass : drawMine)(); drawBar(); }

  // turning the page: a sheet swings over, the spread changes underneath at the halfway point
  let turning = false;
  function turnTo(view) {
    if (view === d.view || turning) return;
    turning = true;
    const forward = view === 'class';
    const sheet = h('div', { class: 'yb-sheet theme-' + d.theme + (forward ? ' fwd' : ' back') }, h('div', { class: 'yb-sheet-front' }), h('div', { class: 'yb-sheet-back' }));
    book.append(sheet);
    setTimeout(() => { d.view = view; save(); draw(); book.append(sheet); }, 380);
    setTimeout(() => { sheet.remove(); turning = false; }, 800);
  }

  function drawBar() {
    fill(bar,
      worlds.length ? segmented([{ value: 'mine', label: 'my page' }, { value: 'class', label: 'class page' }], d.view, turnTo) : null,
      d.view === 'class' && worlds.length > 1 ? h('select', { class: 'yb-world', onchange: e => { d.world = e.target.value; save(); draw(); } },
        worlds.map(w => h('option', { value: w.id, selected: w.id === (d.world || worlds[0].id) }, w.name))) : null);
  }

  // ---- signing ----
  function openSign(existing = null) {
    const others = allOcs(char.id);
    const last = d.sigs.at(-1);
    const sig = existing ? { ...existing } : {
      id: 's_' + uid(), by: others.find(o => !d.sigs.some(x => x.by === o.id))?.id || others[0]?.id || null, byName: '',
      text: '', font: FONTS[(d.sigs.length * 3) % FONTS.length].id, ink: INKS[d.sigs.length % 6].id, sign: '—',
      doodle: Object.keys(DOODLES)[d.sigs.length % 10], size: 1, rot: Math.round((Math.random() - 0.5) * 22),
    };
    if (!existing && last && last.font === sig.font) sig.font = FONTS[(FONTS.findIndex(f => f.id === sig.font) + 1) % FONTS.length].id;

    const preview = h('div', { class: 'yb-preview theme-' + d.theme });
    const drawPreview = () => {
      const p = { ...sig, x: 50, y: 50, byName: sig.byName || 'someone' };
      fill(preview, sigEl(p));
    };
    const text = h('textarea', { rows: 3, maxLength: 180, placeholder: 'write something', value: sig.text, oninput: e => { sig.text = e.target.value; drawPreview(); } });
    const pickRow = (cls, list, cur, onPick, deco) => {
      const row = h('div', { class: 'yb-picks ' + cls });
      const drawRow = () => fill(row, list.map(x => h('button', { type: 'button', class: 'yb-pick' + (x === cur() ? ' on' : ''), title: typeof x === 'string' ? x : '', onclick: () => { onPick(x); drawRow(); drawPreview(); } }, deco(x))));
      drawRow();
      return row;
    };
    const who = others.length
      ? h('select', { class: 'oc-select', onchange: e => { sig.by = e.target.value || null; drawPreview(); } },
        others.map(o => h('option', { value: o.id, selected: o.id === sig.by }, nameOf(o))))
      : h('input', { type: 'text', maxLength: 40, placeholder: 'name', value: sig.byName, oninput: e => { sig.byName = e.target.value; drawPreview(); } });

    const body = h('div', { class: 'yb-sign' },
      preview,
      h('label', { class: 'yb-lab' }, h('span', {}, 'who'), who),
      h('label', { class: 'yb-lab' }, h('span', {}, 'message'), text),
      h('div', { class: 'yb-phrases' }, PHRASES.map(p => h('button', { type: 'button', class: 'yb-phrase', onclick: () => {
        sig.text = (sig.text.trim() ? sig.text.trim() + ' ' : '') + p;
        text.value = sig.text; drawPreview();
      } }, p))),
      h('div', { class: 'yb-lab' }, h('span', {}, 'handwriting'), pickRow('fonts', FONTS.map(f => f.id), () => sig.font, v => { sig.font = v; }, v => h('span', { style: { fontFamily: fontOf(v).font } }, 'hi!'))),
      h('div', { class: 'yb-lab' }, h('span', {}, 'pen'), pickRow('inks', INKS.map(i => i.id), () => sig.ink, v => { sig.ink = v; }, v => h('i', { class: 'yb-ink-dot ink-' + (v.startsWith('#') ? 'solid' : v), style: { background: v.startsWith('#') ? v : null } }))),
      h('div', { class: 'yb-lab' }, h('span', {}, 'doodle'), pickRow('doodles', ['', ...Object.keys(DOODLES)], () => sig.doodle || '', v => { sig.doodle = v; }, v => (v ? doodle(v, sig.ink === 'silver' || sig.ink === 'gold' ? '#8a8f99' : '#2140a8') : '∅'))),
      h('div', { class: 'yb-lab' }, h('span', {}, 'sign off'), segmented(SIGNOFFS.map(x => ({ value: x, label: x })), sig.sign, v => { sig.sign = v; drawPreview(); })),
      h('div', { class: 'yb-sliders' },
        h('label', {}, h('span', {}, 'size'), h('input', { type: 'range', min: 0.6, max: 1.8, step: 0.05, value: sig.size, oninput: e => { sig.size = +e.target.value; drawPreview(); } })),
        h('label', {}, h('span', {}, 'tilt'), h('input', { type: 'range', min: -30, max: 30, step: 1, value: sig.rot, oninput: e => { sig.rot = +e.target.value; drawPreview(); } }))));
    drawPreview();

    openModal({
      title: existing ? 'edit autograph' : 'sign it',
      wide: true,
      body,
      actions: [
        existing ? { label: 'erase', kind: 'danger', onClick: async close => {
          if (!await confirmDialog('erase this autograph?', { okLabel: 'erase', danger: true })) return;
          d.sigs = d.sigs.filter(x => x.id !== existing.id);
          save(); close(); draw();
        } } : null,
        { label: 'nvm', onClick: close => close() },
        { label: existing ? 'save' : '✍ sign', kind: 'primary', onClick: close => {
          if (!sig.text.trim()) { toast('write something first', 'bad'); return; }
          const by = ocById(sig.by);
          sig.byName = by ? nameOf(by) : sig.byName;
          if (existing) Object.assign(existing, sig);
          else { Object.assign(sig, freeSpot()); d.sigs.push(sig); }
          if (d.view !== 'mine') d.view = 'mine';
          save(); close(); draw();
          if (!existing) requestAnimationFrame(() => book.querySelector(`.yb-sig[data-id="${sig.id}"]`)?.classList.add('fresh'));
        } },
      ].filter(Boolean),
    });
  }

  // ---- editing my page ----
  function openEdit() {
    const draft = structuredClone({ school: d.school, year: d.year, quote: d.quote, superlatives: d.superlatives, clubs: d.clubs, frame: d.frame, theme: d.theme, photo: d.photo });
    const supBox = h('div', { class: 'yb-rows' });
    const drawSups = () => fill(supBox,
      draft.superlatives.map((t, i) => h('div', { class: 'yb-row' },
        h('span', { class: 'yb-prefix' }, 'most likely to'),
        h('input', { type: 'text', value: t, maxLength: 60, oninput: e => { draft.superlatives[i] = e.target.value; } }),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { draft.superlatives.splice(i, 1); drawSups(); } }, '✕'))),
      draft.superlatives.length < 3 ? h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { draft.superlatives.push(''); drawSups(); supBox.querySelector('.yb-row:last-of-type input')?.focus(); } }, '+ most likely to') : null);
    drawSups();
    const clubBox = h('div', { class: 'yb-rows' });
    const drawClubs = () => fill(clubBox,
      draft.clubs.map((c, i) => h('div', { class: 'yb-row' },
        h('button', { type: 'button', class: 'yb-club-pick', title: 'icon', onclick: () => { c.icon = CLUB_ICONS[(CLUB_ICONS.indexOf(c.icon) + 1) % CLUB_ICONS.length]; drawClubs(); } }, sticker(c.icon || '2b50')),
        h('input', { type: 'text', value: c.name, maxLength: 30, placeholder: 'club', oninput: e => { c.name = e.target.value; } }),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { draft.clubs.splice(i, 1); drawClubs(); } }, '✕'))),
      draft.clubs.length < 6 ? h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { draft.clubs.push({ name: '', icon: CLUB_ICONS[draft.clubs.length % CLUB_ICONS.length] }); drawClubs(); } }, '+ club') : null);
    drawClubs();
    const uploads = [];
    const photoBox = h('div');
    const drawPhoto = () => fill(photoBox, segmented([{ value: 'pfp', label: 'pfp' }, { value: 'upload', label: draft.photo.from === 'upload' ? 'change picture' : 'upload' }], draft.photo.from, async v => {
      if (v === 'upload') {
        const up = await uploadPic(1000);
        if (up) { uploads.push(up.imageId); draft.photo = { from: 'upload', imageId: up.imageId }; }
      } else draft.photo.from = 'pfp';
      drawPhoto();
    }));
    drawPhoto();
    let saved = false;
    openModal({
      title: 'my page',
      wide: true,
      body: h('div', { class: 'yb-edit' },
        h('div', { class: 'yb-grid2' },
          h('label', { class: 'yb-lab' }, h('span', {}, 'school'), h('input', { type: 'text', value: draft.school, maxLength: 40, oninput: e => { draft.school = e.target.value; } })),
          h('label', { class: 'yb-lab' }, h('span', {}, 'year'), h('input', { type: 'text', value: draft.year, maxLength: 12, oninput: e => { draft.year = e.target.value; } }))),
        h('label', { class: 'yb-lab' }, h('span', {}, 'senior quote'), h('textarea', { rows: 2, maxLength: 140, value: draft.quote, oninput: e => { draft.quote = e.target.value; } })),
        h('div', { class: 'yb-lab' }, h('span', {}, 'superlatives'), supBox),
        h('div', { class: 'yb-lab' }, h('span', {}, 'clubs + activities'), clubBox),
        h('div', { class: 'yb-lab' }, h('span', {}, 'photo'), photoBox),
        h('div', { class: 'yb-lab' }, h('span', {}, 'frame'), segmented(FRAMES.map(([value, label]) => ({ value, label })), draft.frame, v => { draft.frame = v; })),
        h('div', { class: 'yb-lab' }, h('span', {}, 'paper'), segmented(THEMES.map(([value, label]) => ({ value, label })), draft.theme, v => { draft.theme = v; }))),
      actions: [
        { label: 'nvm', onClick: close => close() },
        { label: 'save', kind: 'primary', onClick: close => {
          saved = true;
          const old = d.photo.imageId;
          Object.assign(d, draft);
          d.superlatives = d.superlatives.map(x => x.trim()).filter(Boolean);
          d.clubs = d.clubs.filter(c => c.name.trim());
          if (old && old !== d.photo.imageId) store.deleteImage(old);
          save(); close(); draw();
        } },
      ],
      onClose: () => uploads.filter(id => !saved || id !== d.photo.imageId).forEach(id => store.deleteImage(id)),
    });
  }

  el.append(
    appBar(ctx, meta,
      mine ? h('button', { class: 'btn sm', onclick: openEdit }, '✎ my page') : null,
      mine ? h('button', { class: 'btn sm primary', onclick: () => openSign() }, '✍ sign it') : null),
    h('div', { class: 'yb-app' }, bar, h('div', { class: 'yb-desk' }, book)));
  draw();
}
