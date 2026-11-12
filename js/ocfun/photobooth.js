// photo booth: 3 or 4 pictures -> a photo booth strip. a filter over every frame, the strip's color, a little
// doodle layer, 3d stickers you can drag on top, and the date stamped at the bottom. lots of strips.
//
// d.strips = [{ id, pics: [{ imageId }], filter, color, doodle, date, caption, stickers: [{ id, sid, x, y, size, rot }] }]

import { h, fill, segmented, swatches, openModal, confirmDialog, uid } from '../ui.js';
import { appBar, uploadPic, pic } from './kit.js';
import { store } from '../store.js';
import { FILTERS } from '../look.js';
import { pickStickerIcon } from '../parts.js';
import { stickerNode } from '../diary/stickers.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'photobooth', label: 'photo booth', icon: '1f4f8' };

const LOOKS = { none: 'none', 'b&w': 'grayscale(1) contrast(1.15)', sepia: FILTERS.sepia, faded: FILTERS.faded, pink: FILTERS.pink, warm: FILTERS.warm, cool: FILTERS.cool, flash: 'brightness(1.25) contrast(1.2) saturate(1.1)' };
const STRIPS = ['#ffffff', '#111014', '#ff4fa3', '#ffd9e8', '#b18cff', '#6ec6ff', '#ffd84d', '#7df9d0'];
const DOODLES = ['none', 'hearts', 'stars', 'sparkles', 'scribbles'];
const DEF = { strips: [] };
const today = () => new Date().toISOString().slice(0, 10);
const niceDate = iso => {
  const d = iso ? new Date(iso + 'T12:00:00') : null;
  return d && !isNaN(d) ? `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}` : '';
};
function seeded(str) {
  let x = 3;
  for (const ch of str) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const readable = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > .6 ? '#1a1320' : '#ffffff'; };

// the strip. onMove(sticker) makes stickers draggable (editor)
export function strip(s, { big = false, onMove } = {}) {
  const frames = (s.pics || []).length ? s.pics : [{}, {}, {}];
  const color = s.color || '#ffffff';
  const layer = h('div', { class: 'pbo-stickers' });
  for (const st of s.stickers || []) {
    const node = h('div', { class: 'pbo-stk' + (onMove ? ' movable' : ''), style: { left: st.x + '%', top: st.y + '%', width: st.size + '%', '--rot': (st.rot || 0) + 'deg' } }, stickerNode(st.sid));
    if (onMove) node.onpointerdown = e => {
      e.preventDefault();
      const box = layer.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, x0 = st.x, y0 = st.y;
      node.setPointerCapture(e.pointerId);
      node.onpointermove = ev => {
        st.x = Math.max(-5, Math.min(100, x0 + (ev.clientX - sx) / box.width * 100));
        st.y = Math.max(-2, Math.min(100, y0 + (ev.clientY - sy) / box.height * 100));
        node.style.left = st.x + '%'; node.style.top = st.y + '%';
      };
      node.onpointerup = () => { node.onpointermove = null; onMove(st); };
    };
    layer.append(node);
  }
  return h('div', { class: `pbo-strip pbo-d-${s.doodle || 'none'}${big ? ' big' : ''}`, style: { '--strip': color, '--strip-ink': readable(color), '--look': LOOKS[s.filter] || 'none' } },
    frames.map((f, i) => h('div', { class: 'pbo-frame', style: { '--i': i } }, f.imageId ? pic(f.imageId, 'pbo-pic') : h('div', { class: 'pbo-empty' }))),
    h('div', { class: 'pbo-foot' }, h('span', { class: 'pbo-cap' }, s.caption || ''), h('span', { class: 'pbo-date' }, niceDate(s.date))),
    h('div', { class: 'pbo-doodles' }),
    layer);
}

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  const shelf = h('div', { class: 'pbo-shelf' });
  el.append(appBar(ctx, meta, edit ? h('button', { class: 'btn primary sm', onclick: () => {
    const s = { id: 'pb_' + uid(), pics: [], filter: 'b&w', color: STRIPS[d.strips.length % STRIPS.length], doodle: 'none', date: today(), caption: '', stickers: [] };
    d.strips.unshift(s); save(); draw(); open(s);
  } }, '+ strip') : null), shelf);

  function draw() {
    fill(shelf, d.strips.length ? d.strips.map(s => {
      const r = seeded(s.id);
      return h('button', { type: 'button', class: 'pbo-pick', style: { '--tilt': ((r() - .5) * 10).toFixed(1) + 'deg' }, onclick: () => open(s) }, strip(s));
    }) : h('div', { class: 'pbo-curtain' }, h('div', { class: 'pbo-sign' }, 'photos'), h('div', { class: 'pbo-slot' })));
  }

  function open(s) {
    if (!edit) { openModal({ title: 'photo strip', body: h('div', { class: 'pbo-view' }, strip(s, { big: true })) }); return; }
    const prev = h('div', { class: 'pbo-view' });
    const redraw = () => { fill(prev, strip(s, { big: true, onMove: () => { save(); draw(); } })); save(); draw(); };
    const field = (label, input) => h('label', { class: 'pbo-field' }, h('span', {}, label), input);
    const slots = h('div', { class: 'pbo-slots' });
    const drawSlots = () => fill(slots,
      s.pics.map((p, i) => h('div', { class: 'pbo-slot-pic' }, pic(p.imageId, 'pbo-slot-img'),
        h('button', { type: 'button', class: 'pbo-x', title: 'remove', onclick: () => { store.deleteImage(p.imageId); s.pics.splice(i, 1); drawSlots(); redraw(); } }, '✕'))),
      s.pics.length < 4 ? h('button', { type: 'button', class: 'pbo-slot-add', onclick: async () => {
        const got = await uploadPic(900, { aspect: 4 / 3 });
        if (!got) return;
        s.pics.push({ imageId: got.imageId }); drawSlots(); redraw();
      } }, '+') : null);
    drawSlots();
    const stks = h('div', { class: 'pbo-stk-list' });
    const drawStks = () => fill(stks,
      (s.stickers || []).map(st => h('div', { class: 'pbo-stk-row' },
        h('span', { class: 'pbo-stk-prev' }, stickerNode(st.sid)),
        h('input', { type: 'range', min: 10, max: 70, value: st.size, title: 'size', oninput: e => { st.size = +e.target.value; redraw(); } }),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { s.stickers = s.stickers.filter(x => x !== st); drawStks(); redraw(); } }, '✕'))),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(sid => {
        const r = Math.random;
        s.stickers = [...(s.stickers || []), { id: 'ps_' + uid(), sid, x: 10 + r() * 60, y: 5 + r() * 75, size: 28, rot: Math.round((r() - .5) * 40) }];
        drawStks(); redraw();
      }) }, '+ sticker'));
    drawStks();
    const form = h('div', { class: 'pbo-form' },
      field('pictures', slots),
      field('filter', segmented(Object.keys(LOOKS).map(v => ({ value: v, label: v })), s.filter || 'none', v => { s.filter = v; redraw(); })),
      field('strip', swatches(s.color, c => { s.color = c; redraw(); }, STRIPS)),
      field('doodles', segmented(DOODLES.map(v => ({ value: v, label: v })), s.doodle || 'none', v => { s.doodle = v; redraw(); })),
      field('stickers', stks),
      h('div', { class: 'pbo-two' },
        field('caption', h('input', { type: 'text', value: s.caption || '', maxLength: 24, placeholder: 'caption', oninput: e => { s.caption = e.target.value; redraw(); } })),
        field('date', h('input', { type: 'date', value: s.date || '', onchange: e => { s.date = e.target.value; redraw(); } }))));
    fill(prev, strip(s, { big: true, onMove: () => { save(); draw(); } }));
    openModal({
      title: 'photo strip', wide: true,
      body: h('div', { class: 'pbo-edit' }, form, prev),
      actions: [
        { label: 'delete', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('delete this strip?', { okLabel: 'delete', danger: true })) return;
          s.pics.forEach(p => store.deleteImage(p.imageId));
          d.strips = d.strips.filter(x => x !== s);
          save(); draw(); close();
        } },
        { label: 'done', kind: 'primary', onClick: close => close() },
      ],
    });
  }

  draw();
}
