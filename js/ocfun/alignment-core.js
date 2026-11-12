// the alignment chart itself (used by the oc app in the "more" tab AND the world's alignment tab).
// data = { title, x: [3 words], y: [3 words], custom: false, cells: [9 words when custom], placed: { ocId: cell 0..8 } }
// people() = the ocs you can place. drag a face into a box, or tap a face then tap a box.

import { h, fill, segmented } from '../ui.js';
import { portrait, nameOf } from '../parts.js';

export const blankAlignment = () => ({ title: '', x: ['lawful', 'neutral', 'chaotic'], y: ['good', 'neutral', 'evil'], custom: false, cells: Array(9).fill(''), placed: {} });

export function fixAlignment(d) {
  const b = blankAlignment();
  for (const k of Object.keys(b)) if (d[k] == null) d[k] = b[k];
  if (!Array.isArray(d.cells) || d.cells.length !== 9) d.cells = b.cells;
  d.placed ||= {};
  return d;
}

const TINTS = ['#7df9d0', '#6ec6ff', '#b18cff', '#ffd84d', '#e3c6ff', '#ff8ac4', '#ff9a3d', '#ff5d6c', '#1a1320'];

function cellName(d, i) {
  if (d.custom) return d.cells[i] || '';
  const x = d.x[i % 3] || '', y = d.y[Math.floor(i / 3)] || '';
  if (i === 4 && x === 'neutral' && y === 'neutral') return 'true neutral';
  return `${x} ${y}`.trim();
}

export function renderAlignment(el, { data, people, save, readOnly, ocLink }) {
  const d = fixAlignment(data);
  let editing = false, picked = null;
  const root = h('div', { class: 'alc' });
  el.append(root);

  function chip(oc) {
    const c = h('div', { class: 'alc-chip' + (picked === oc.id ? ' picked' : ''), style: { '--c': oc.color }, title: nameOf(oc), dataset: { oc: oc.id } },
      portrait(oc, 'md'), h('span', { class: 'alc-chip-name' }, nameOf(oc)));
    if (readOnly) {
      if (ocLink) c.onclick = () => { location.hash = ocLink(oc); };
      return c;
    }
    c.onpointerdown = e => startDrag(e, oc, c);
    return c;
  }

  // drag a face (a tiny move = a tap, which picks it)
  function startDrag(e, oc, c) {
    if (e.button) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let ghost = null;
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!ghost) { ghost = c.cloneNode(true); ghost.classList.add('alc-ghost'); document.body.append(ghost); c.classList.add('alc-lifted'); }
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
      root.querySelectorAll('.alc-cell, .alc-tray').forEach(x => x.classList.remove('over'));
      document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.alc-cell, .alc-tray')?.classList.add('over');
    };
    const up = ev => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      if (!ghost) { picked = picked === oc.id ? null : oc.id; draw(); return; }
      ghost.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.alc-cell, .alc-tray');
      if (target) place(oc.id, target.classList.contains('alc-cell') ? +target.dataset.i : null);
      else draw();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  function place(id, i) {
    if (i == null) delete d.placed[id]; else d.placed[id] = i;
    picked = null;
    save();
    draw();
  }

  function draw() {
    const ocs = people();
    const ids = new Set(ocs.map(o => o.id));
    for (const k of Object.keys(d.placed)) if (!ids.has(k)) delete d.placed[k];
    const grid = h('div', { class: 'alc-grid' + (picked ? ' picking' : '') },
      h('span', { class: 'alc-corner' }),
      [0, 1, 2].map(i => h('div', { class: 'alc-axis alc-axis-x' }, editing && !d.custom ? axisInput('x', i) : d.custom ? '' : d.x[i])),
      [0, 1, 2].map(r => [
        h('div', { class: 'alc-axis alc-axis-y' }, editing && !d.custom ? axisInput('y', r) : d.custom ? '' : h('span', {}, d.y[r])),
        [0, 1, 2].map(col => {
          const i = r * 3 + col;
          const cell = h('div', { class: 'alc-cell', style: { '--t': TINTS[i] }, dataset: { i } },
            editing && d.custom
              ? h('input', { type: 'text', class: 'alc-cell-input', value: d.cells[i], placeholder: 'box ' + (i + 1), maxLength: 30, oninput: e => { d.cells[i] = e.target.value; save(); } })
              : cellName(d, i) ? h('div', { class: 'alc-cell-name' }, cellName(d, i)) : h('span'),
            h('div', { class: 'alc-faces' }, ocs.filter(o => d.placed[o.id] === i).map(chip)));
          if (!readOnly) cell.onclick = e => { if (picked && !e.target.closest('.alc-chip, input')) place(picked, i); };
          return cell;
        }),
      ]));
    const loose = ocs.filter(o => d.placed[o.id] == null);
    const tray = readOnly ? (loose.length ? h('div', { class: 'alc-tray ro' }, loose.map(chip)) : null)
      : h('div', { class: 'alc-tray', onclick: e => { if (picked && !e.target.closest('.alc-chip')) place(picked, null); } }, loose.map(chip));
    fill(root,
      h('div', { class: 'alc-top' },
        editing ? h('input', { type: 'text', class: 'alc-title-input', value: d.title, placeholder: 'alignment chart', maxLength: 60, oninput: e => { d.title = e.target.value; save(); } })
          : h('h3', { class: 'alc-title' }, d.title.trim() || 'alignment chart'),
        readOnly ? null : h('div', { class: 'alc-tools' },
          editing ? segmented([{ value: false, label: 'classic' }, { value: true, label: 'custom' }], d.custom, v => { d.custom = v; save(); draw(); }) : null,
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { editing = !editing; draw(); } }, editing ? 'done' : 'edit words'))),
      h('div', { class: 'alc-poster' }, grid),
      tray);
  }

  function axisInput(axis, i) {
    return h('input', { type: 'text', class: 'alc-axis-input', value: d[axis][i], maxLength: 16, oninput: e => { d[axis][i] = e.target.value; save(); } });
  }

  draw();
  return { refresh: draw };
}
