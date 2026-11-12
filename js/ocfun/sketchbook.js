// sketchbook: a spiral-bound sketchbook of pages they "drew". a page is drawn right here (pencil, pen, marker,
// eraser, colors, sizes, undo) or is a picture you upload. flip through the pages.
//
// d.pages = [{ id, imageId, caption }]   (drawn pages are saved as pictures too)

import { h, fill, swatches, segmented, openModal, confirmDialog, toast, uid } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, pic } from './kit.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'sketchbook', label: 'sketchbook', icon: '1f3a8' };

const PW = 1000, PH = 720; // a drawn page, in pixels
const COVERS = ['#141114', '#2a0a1b', '#3b1d4a', '#ff4fa3', '#b18cff', '#7df9d0', '#c4253a', '#f6eefb'];
const INKS = ['#1a1320', '#4a4a52', '#ff4fa3', '#d81e3a', '#ff8a3d', '#ffd84d', '#3ab06f', '#2f8fd8', '#7a4fd6', '#8a5a3c', '#ffffff'];
const TOOLS = { pencil: { w: .55, a: .8, cap: 'round' }, pen: { w: 1, a: 1, cap: 'round' }, marker: { w: 3.2, a: .38, cap: 'square' }, eraser: { w: 3, a: 1, cap: 'round' } };

export function render(el, ctx) {
  const d = defaults(ctx.data, { cover: '#141114', pages: [] });
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let at = Math.min(d.pages.length - 1, Math.max(0, d.at || 0));

  const book = h('div', { class: 'sk-book' });
  const strip = h('div', { class: 'sk-strip' });
  const tools = h('div', { class: 'sk-tools' });
  el.append(appBar(ctx, meta), h('div', { class: 'sk-app' }, book, strip, edit ? tools : null));

  function draw(dir = 0) {
    book.style.setProperty('--cover', d.cover);
    const page = d.pages[at];
    const rings = h('div', { class: 'sk-rings' }, Array.from({ length: 13 }, () => h('i')));
    fill(book,
      h('div', { class: 'sk-cover' }),
      h('div', { class: 'sk-paper' + (dir ? (dir > 0 ? ' flip-n' : ' flip-p') : '') },
        rings,
        page
          ? h('div', { class: 'sk-page' }, h('div', { class: 'sk-art' }, pic(page.imageId)),
            edit
              ? h('input', { type: 'text', class: 'sk-cap', value: page.caption || '', maxLength: 60, placeholder: 'caption', oninput: e => { page.caption = e.target.value; save(); drawStrip(); } })
              : page.caption ? h('div', { class: 'sk-cap' }, page.caption) : null)
          : h('div', { class: 'sk-page sk-blank' }, edit ? h('button', { type: 'button', class: 'sk-blank-btn', onclick: () => drawPage(null) }, '+ draw') : null),
        h('div', { class: 'sk-num' }, d.pages.length ? `${at + 1} / ${d.pages.length}` : '')),
      d.pages.length > 1 ? h('button', { type: 'button', class: 'sk-arrow l', title: 'back', onclick: () => go(-1) }, '‹') : null,
      d.pages.length > 1 ? h('button', { type: 'button', class: 'sk-arrow r', title: 'next', onclick: () => go(1) }, '›') : null);
    drawStrip();
    drawTools();
  }
  function go(by) { at = (at + by + d.pages.length) % d.pages.length; d.at = at; draw(by); }
  function drawStrip() {
    fill(strip, d.pages.map((p, i) => h('button', { type: 'button', class: 'sk-thumb' + (i === at ? ' on' : ''), title: p.caption || String(i + 1), onclick: () => { const by = i - at; at = i; d.at = at; draw(Math.sign(by)); } }, pic(p.imageId))));
  }
  function drawTools() {
    if (!edit) return;
    const page = d.pages[at];
    fill(tools,
      h('button', { type: 'button', class: 'btn primary sm', onclick: () => drawPage(null) }, '+ draw a page'),
      h('button', { type: 'button', class: 'btn sm', onclick: addPicture }, '+ picture page'),
      page ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => drawPage(page) }, 'draw on this page') : null,
      page && at > 0 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => move(-1) }, 'move back') : null,
      page && at < d.pages.length - 1 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => move(1) }, 'move forward') : null,
      page ? h('button', { type: 'button', class: 'btn ghost sm danger', onclick: removePage }, 'tear out') : null,
      h('div', { class: 'sk-cover-pick' }, h('span', {}, 'cover'), swatches(d.cover, v => { d.cover = v; save(); book.style.setProperty('--cover', v); }, COVERS)));
  }
  function move(by) {
    const [p] = d.pages.splice(at, 1);
    at += by;
    d.pages.splice(at, 0, p);
    d.at = at; save(); draw();
  }
  async function removePage() {
    if (!await confirmDialog('tear this page out?', { okLabel: 'tear it out', danger: true })) return;
    const [p] = d.pages.splice(at, 1);
    if (p?.imageId) store.deleteImage(p.imageId);
    at = Math.max(0, Math.min(at, d.pages.length - 1)); d.at = at;
    save(); draw();
  }
  async function addPicture() {
    const up = await uploadPic(1600);
    if (!up) return;
    d.pages.splice(d.pages.length ? at + 1 : 0, 0, { id: 'pg_' + uid(), imageId: up.imageId, caption: '' });
    at = d.pages.length === 1 ? 0 : at + 1; d.at = at;
    save(); draw(1);
  }

  // ---- the drawing table ----
  async function drawPage(page) {
    const canvas = h('canvas', { class: 'sk-canvas', width: PW, height: PH });
    const live = h('canvas', { class: 'sk-live', width: PW, height: PH });
    const g = canvas.getContext('2d'), lg = live.getContext('2d');
    g.fillStyle = '#fffdf8'; g.fillRect(0, 0, PW, PH);
    if (page?.imageId) {
      const url = await store.imageURL(page.imageId);
      if (url) {
        const img = new Image(); img.src = url;
        try { await img.decode(); const s = Math.min(PW / img.width, PH / img.height); g.drawImage(img, (PW - img.width * s) / 2, (PH - img.height * s) / 2, img.width * s, img.height * s); } catch {}
      }
    }
    let tool = 'pencil', color = INKS[0], size = 6;
    const undo = [];
    const snap = () => { undo.push(g.getImageData(0, 0, PW, PH)); if (undo.length > 15) undo.shift(); undoBtn.disabled = false; };
    let pts = null;
    const posOf = e => { const r = live.getBoundingClientRect(); return [(e.clientX - r.left) * PW / r.width, (e.clientY - r.top) * PH / r.height]; };
    const stroke = (c2, list) => {
      const t = TOOLS[tool];
      c2.lineCap = c2.lineJoin = t.cap === 'square' ? 'round' : 'round';
      c2.lineWidth = size * t.w;
      c2.strokeStyle = tool === 'eraser' ? '#fffdf8' : color;
      c2.beginPath();
      c2.moveTo(list[0][0], list[0][1]);
      if (list.length === 1) c2.lineTo(list[0][0] + .1, list[0][1] + .1);
      for (let i = 1; i < list.length - 1; i++) {
        const mx = (list[i][0] + list[i + 1][0]) / 2, my = (list[i][1] + list[i + 1][1]) / 2;
        c2.quadraticCurveTo(list[i][0], list[i][1], mx, my);
      }
      if (list.length > 1) c2.lineTo(list.at(-1)[0], list.at(-1)[1]);
      c2.stroke();
    };
    // the stroke being drawn lives on the top canvas, so a see-through marker doesn't stack up on itself
    live.onpointerdown = e => {
      e.preventDefault();
      live.setPointerCapture(e.pointerId);
      pts = [posOf(e)];
      live.style.opacity = TOOLS[tool].a;
      lg.clearRect(0, 0, PW, PH); stroke(lg, pts);
    };
    live.onpointermove = e => {
      if (!pts) return;
      for (const ev of e.getCoalescedEvents?.() || [e]) pts.push(posOf(ev));
      lg.clearRect(0, 0, PW, PH); stroke(lg, pts);
    };
    live.onpointerup = live.onpointercancel = () => {
      if (!pts) return;
      snap();
      g.save();
      g.globalAlpha = TOOLS[tool].a;
      if (tool === 'marker') g.globalCompositeOperation = 'multiply';
      g.drawImage(live, 0, 0);
      g.restore();
      lg.clearRect(0, 0, PW, PH);
      pts = null;
    };
    const undoBtn = h('button', { type: 'button', class: 'btn ghost sm', disabled: true, onclick: () => { const last = undo.pop(); if (last) g.putImageData(last, 0, 0); undoBtn.disabled = !undo.length; } }, 'undo');
    const sizeIn = h('input', { type: 'range', class: 'look-slider', min: 1, max: 40, value: size, oninput: e => { size = +e.target.value; dot(); } });
    const dotEl = h('i', { class: 'sk-dot' });
    const dot = () => { dotEl.style.width = dotEl.style.height = Math.max(3, size * TOOLS[tool].w * .5) + 'px'; dotEl.style.background = tool === 'eraser' ? '#fffdf8' : color; };
    const bar = h('div', { class: 'sk-draw-bar' },
      segmented(Object.keys(TOOLS).map(v => ({ value: v, label: v })), tool, v => { tool = v; dot(); }),
      swatches(color, v => { color = v; if (tool === 'eraser') tool = 'pen'; dot(); }, INKS),
      h('label', { class: 'sk-size' }, h('span', {}, 'size'), sizeIn, dotEl),
      undoBtn,
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { snap(); g.fillStyle = '#fffdf8'; g.fillRect(0, 0, PW, PH); } }, 'clear'));
    dot();
    openModal({
      title: page ? 'draw on this page' : 'new page', wide: true,
      body: h('div', { class: 'sk-draw' }, bar, h('div', { class: 'sk-table' }, h('div', { class: 'sk-sheet' }, canvas, live))),
      actions: [
        { label: 'nvm', onClick: close => close() },
        { label: 'save page', kind: 'primary', onClick: async close => {
          const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', .92));
          if (!blob) { toast("couldn't save that page", 'bad'); return; }
          const imageId = await store.putImage(blob);
          if (page) { if (page.imageId) store.deleteImage(page.imageId); page.imageId = imageId; }
          else { d.pages.splice(d.pages.length ? at + 1 : 0, 0, { id: 'pg_' + uid(), imageId, caption: '' }); at = d.pages.length === 1 ? 0 : at + 1; d.at = at; }
          save(); close(); draw(page ? 0 : 1);
        } },
      ],
    }).el.classList.add('sk-modal');
  }

  draw();
}
