// game console: a DS-style handheld. two things on it:
//   pictochat  - little drawn messages (+ a line of text) from this oc or their worldmates, in a chat log up top
//   save files - their favorite games: title, hours played, a note, a picture
//
// d = { color, mode, chat: [{ id, from, imageId, text, at }], games: [{ id, title, hours, note, imageId }] }

import { h, fill, swatches, segmented, toast, confirmDialog, uid } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, pic, worldmates, nameOf, ocById } from './kit.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'handheld', label: 'game console', icon: '1f3ae' };

const CW = 256, CH = 88; // the pictochat drawing, in pixels
const SHELLS = { pink: '#ff8ac4', black: '#232026', white: '#eeeaf0', lilac: '#c9b3f2', mint: '#8ff0cf', red: '#e0323f', blue: '#6ec6ff' };
const FROM_COLORS = ['#ff4fa3', '#2f8fd8', '#3ab06f', '#ff8a3d', '#7a4fd6', '#d81e3a'];

export function render(el, ctx) {
  const { char } = ctx;
  const d = defaults(ctx.data, { color: 'pink', mode: 'chat', chat: [], games: [] });
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  const people = () => [char, ...worldmates(char.id)];
  let from = char.id;
  let pickedGame = null;

  const top = h('div', { class: 'hh-screen hh-top' });
  const bottom = h('div', { class: 'hh-screen hh-bottom' });
  const ds = h('div', { class: 'hh-ds' },
    h('div', { class: 'hh-lid' }, h('i', { class: 'hh-speaker l' }), top, h('i', { class: 'hh-speaker r' }), h('i', { class: 'hh-cam' })),
    h('div', { class: 'hh-hinge' }, h('i'), h('i')),
    h('div', { class: 'hh-base' },
      h('div', { class: 'hh-dpad' }, h('i', { class: 'u' }), h('i', { class: 'd' }), h('i', { class: 'l' }), h('i', { class: 'r' })),
      bottom,
      h('div', { class: 'hh-abxy' }, h('i', { class: 'x' }, 'x'), h('i', { class: 'a' }, 'a'), h('i', { class: 'b' }, 'b'), h('i', { class: 'y' }, 'y')),
      h('div', { class: 'hh-ss' }, h('i'), h('i')),
      h('i', { class: 'hh-power' })));
  const modes = h('div', { class: 'hh-modes' });
  const shell = h('div', { class: 'hh-shell-pick' });
  el.append(appBar(ctx, meta), h('div', { class: 'hh-app' }, modes, ds, edit ? shell : null));

  function paint() {
    const c = SHELLS[d.color] || (/^#[0-9a-f]{6}$/i.test(d.color) ? d.color : SHELLS.pink);
    const n = parseInt(c.slice(1), 16);
    ds.style.setProperty('--ds', c);
    ds.dataset.dark = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < .35 ? '1' : '';
  }
  const colorOf = id => { const i = people().findIndex(p => p.id === id); return FROM_COLORS[(i < 0 ? 0 : i) % FROM_COLORS.length]; };

  function draw() {
    fill(modes, segmented([{ value: 'chat', label: 'pictochat' }, { value: 'games', label: 'save files' }], d.mode, v => { d.mode = v; save(); draw(); }));
    if (d.mode === 'games') drawGames(); else drawChat();
  }

  // ---- pictochat ----
  function drawChat() {
    const log = h('div', { class: 'pcx-log' },
      h('div', { class: 'pcx-room' }, h('b', {}, 'room a'), h('span', {}, `${d.chat.length}`)),
      d.chat.map(m => {
        const who = ocById(m.from);
        return h('div', { class: 'pcx-msg', style: { '--pc': colorOf(m.from) } },
          h('div', { class: 'pcx-name' }, who ? nameOf(who) : 'someone'),
          h('div', { class: 'pcx-body' }, m.imageId ? pic(m.imageId, 'pcx-drawing') : null, m.text ? h('div', { class: 'pcx-text' }, m.text) : null),
          edit ? h('button', { type: 'button', class: 'pcx-x', title: 'delete', onclick: () => { d.chat = d.chat.filter(x => x !== m); if (m.imageId) store.deleteImage(m.imageId); save(); draw(); } }, '✕') : null);
      }));
    fill(top, log);
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    if (!edit) { fill(bottom, h('div', { class: 'pcx-idle' }, h('b', {}, 'pictochat'))); return; }

    // the drawing pad on the touch screen
    const canvas = h('canvas', { class: 'pcx-canvas', width: CW, height: CH });
    const g = canvas.getContext('2d');
    let pen = 'pen', thick = false, drew = false, last = null;
    const posOf = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height]; };
    const line = (a, b) => {
      g.globalCompositeOperation = pen === 'eraser' ? 'destination-out' : 'source-over';
      g.strokeStyle = '#1a1320';
      g.lineWidth = (thick ? 4 : 1.6) * (pen === 'eraser' ? 3 : 1);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + .01, b[1]); g.stroke();
    };
    canvas.onpointerdown = e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); last = posOf(e); line(last, last); drew = true; };
    canvas.onpointermove = e => { if (!last) return; const p = posOf(e); line(last, p); last = p; };
    canvas.onpointerup = canvas.onpointercancel = () => { last = null; };
    const text = h('input', { type: 'text', class: 'pcx-type', maxLength: 60, placeholder: 'type' });
    const tool = (label, on, fn) => h('button', { type: 'button', class: 'pcx-tool' + (on ? ' on' : ''), onclick: fn }, label);
    const tools = h('div', { class: 'pcx-tools' });
    const drawTools = () => fill(tools,
      tool('pen', pen === 'pen', () => { pen = 'pen'; drawTools(); }),
      tool('eraser', pen === 'eraser', () => { pen = 'eraser'; drawTools(); }),
      tool(thick ? 'thick' : 'thin', false, () => { thick = !thick; drawTools(); }),
      tool('clear', false, () => { g.clearRect(0, 0, CW, CH); drew = false; }));
    drawTools();
    const fromSel = h('select', { class: 'pcx-from', onchange: e => { from = e.target.value; fromTag.style.setProperty('--pc', colorOf(from)); fromTag.textContent = nameOf(ocById(from)); } },
      people().map(p => h('option', { value: p.id, selected: p.id === from }, nameOf(p))));
    const fromTag = h('div', { class: 'pcx-name pcx-from-tag', style: { '--pc': colorOf(from) } }, nameOf(ocById(from)));
    async function send() {
      const words = text.value.trim();
      if (!drew && !words) return;
      let imageId = null;
      if (drew) {
        // a white card with the lines on it, like the real thing
        const out = h('canvas', { width: CW * 2, height: CH * 2 });
        const og = out.getContext('2d');
        og.fillStyle = '#fff'; og.fillRect(0, 0, out.width, out.height);
        og.imageSmoothingEnabled = false;
        og.drawImage(canvas, 0, 0, out.width, out.height);
        const blob = await new Promise(r => out.toBlob(r, 'image/png'));
        if (!blob) { toast("couldn't send that", 'bad'); return; }
        imageId = await store.putImage(blob);
      }
      d.chat.push({ id: 'pc_' + uid(), from, imageId, text: words, at: Date.now() });
      if (d.chat.length > 120) { const gone = d.chat.shift(); if (gone.imageId) store.deleteImage(gone.imageId); }
      save(); draw();
    }
    fill(bottom, h('div', { class: 'pcx-pad' },
      h('div', { class: 'pcx-paper' }, fromTag, canvas),
      h('div', { class: 'pcx-row' }, text, h('button', { type: 'button', class: 'pcx-send', onclick: send }, 'send')),
      h('div', { class: 'pcx-row' }, tools, fromSel)));
  }

  // ---- save files ----
  function drawGames() {
    fill(top, h('div', { class: 'gm-list' },
      h('div', { class: 'gm-head' }, h('b', {}, 'save files'), h('span', {}, `${d.games.length}`)),
      d.games.length ? d.games.map(gm => h('button', { type: 'button', class: 'gm-cart' + (gm === pickedGame ? ' on' : ''), onclick: () => { pickedGame = gm; drawGames(); } },
        h('div', { class: 'gm-label' }, gm.imageId ? pic(gm.imageId) : h('span', {}, (gm.title || '?').slice(0, 1))),
        h('div', { class: 'gm-info' }, h('b', {}, gm.title || 'untitled'), h('span', {}, `${Number(gm.hours) || 0}h`)))) : h('div', { class: 'gm-empty' }, '---')));
    const gm = pickedGame && d.games.includes(pickedGame) ? pickedGame : null;
    if (!gm) {
      fill(bottom, h('div', { class: 'gm-pad' },
        edit ? h('button', { type: 'button', class: 'pcx-send gm-new', onclick: () => { const n = { id: 'gm_' + uid(), title: '', hours: 0, note: '', imageId: null }; d.games.push(n); pickedGame = n; save(); drawGames(); } }, '+ save file') : h('b', { class: 'pcx-idle' }, 'save files')));
      return;
    }
    if (!edit) {
      fill(bottom, h('div', { class: 'gm-pad gm-read' }, h('b', {}, gm.title || 'untitled'), h('span', { class: 'gm-hours' }, `${Number(gm.hours) || 0} hours`), gm.note ? h('p', {}, gm.note) : null));
      return;
    }
    fill(bottom, h('div', { class: 'gm-pad' },
      h('input', { type: 'text', class: 'pcx-type', value: gm.title || '', maxLength: 40, placeholder: 'game', oninput: e => { gm.title = e.target.value; save(); } , onchange: () => drawGames() }),
      h('div', { class: 'pcx-row' },
        h('label', { class: 'gm-hours-in' }, h('input', { type: 'number', min: 0, max: 99999, value: gm.hours || 0, oninput: e => { gm.hours = Math.max(0, +e.target.value || 0); save(); }, onchange: () => drawGames() }), h('span', {}, 'hours')),
        h('button', { type: 'button', class: 'pcx-tool', onclick: async () => { const up = await uploadPic(600); if (!up) return; if (gm.imageId) store.deleteImage(gm.imageId); gm.imageId = up.imageId; save(); drawGames(); } }, gm.imageId ? 'new pic' : '+ pic'),
        h('button', { type: 'button', class: 'pcx-tool', onclick: async () => {
          if (!await confirmDialog(`delete "${gm.title || 'this save'}"?`, { okLabel: 'delete', danger: true })) return;
          if (gm.imageId) store.deleteImage(gm.imageId);
          d.games = d.games.filter(x => x !== gm); pickedGame = null; save(); drawGames();
        } }, 'delete')),
      h('textarea', { class: 'pcx-type gm-note', rows: 2, maxLength: 200, value: gm.note || '', placeholder: 'note', oninput: e => { gm.note = e.target.value; save(); } })));
  }

  if (edit) fill(shell, h('span', {}, 'shell'), swatches(SHELLS[d.color] || d.color, v => { d.color = Object.keys(SHELLS).find(k => SHELLS[k] === v) || v; save(); paint(); }, Object.values(SHELLS)));
  paint();
  draw();
}
