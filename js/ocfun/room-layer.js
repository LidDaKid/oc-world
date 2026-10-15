// the drag / turn / resize / flip layer the bedroom, dress up, locker + polaroid wall share.
//
//   thing = { id, kind, x, y, r, k, flip, ... }   x, y = its middle in "stage pixels", r = degrees, k = size
//
// the stage is drawn at a fixed size (W x H) and scaled with css to fit, so saved spots never move.

import { h, uid, fill } from '../ui.js';
import { store } from '../store.js';

export const newThing = fields => ({ id: 't_' + uid(), x: 100, y: 100, r: 0, k: 1, flip: false, ...fields });

// scales `box` (W x H) to fit the width of `wrap`. sets --s on the box so handles can stay finger-sized.
export function fitStage(wrap, box, W, H, maxScale = 1.25) {
  wrap.classList.add('rl-wrap');
  box.classList.add('rl-box');
  box.style.width = W + 'px';
  box.style.height = H + 'px';
  let last = -1;
  const fit = () => {
    const cw = wrap.clientWidth;
    if (!cw || cw === last) return;
    last = cw;
    const s = Math.min(maxScale, cw / W);
    wrap.style.height = H * s + 'px';
    box.style.left = Math.max(0, (cw - W * s) / 2) + 'px';
    box.style.transform = `scale(${s})`;
    box.style.setProperty('--s', s);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(wrap);
  fit();
  requestAnimationFrame(fit);
  return () => ro.disconnect();
}

// a copy of a thing. pictures get their own copy so deleting one never breaks the other.
export async function copyThing(item) {
  const c = structuredClone(item);
  c.id = 't_' + uid();
  c.x += 24;
  c.y += 24;
  if (c.imageId) {
    const rec = await store.imageRecord(c.imageId);
    c.imageId = rec ? await store.putImage(new Blob([rec.buf], { type: rec.type })) : null;
  }
  return c;
}

// render(item) -> the node for it. glow(item) -> true if it lights up at night.
export function dragLayer({ items, render, editable = true, onChange = () => {}, onPick, onTap, onDelete, onMove, cls = '', bounds, canDelete = () => true, glow }) {
  const el = h('div', { class: 'rl ' + cls + (editable ? ' rl-edit' : '') });
  let selected = null;
  let locked = false;
  const nodes = new Map();

  function make(item) {
    const n = h('div', { class: `rl-it rl-${item.kind || 'x'}` + (glow?.(item) ? ' rl-glow' : ''), dataset: { id: item.id } },
      h('div', { class: 'rl-in' }, render(item)));
    if (editable) {
      if (canDelete(item)) n.append(h('button', { type: 'button', class: 'rl-h rl-del', title: 'remove', onpointerdown: e => e.stopPropagation(), onclick: e => { e.stopPropagation(); remove(item.id); } }, '✕'));
      n.append(h('span', { class: 'rl-h rl-turn', title: 'turn + resize', onpointerdown: e => turn(e, item) }, '↻'));
    }
    if (item.id === selected) n.classList.add('sel');
    n.addEventListener('pointerdown', e => grab(e, item));
    place(n, item);
    return n;
  }

  function draw() {
    nodes.clear();
    fill(el, items.map(item => {
      const n = make(item);
      nodes.set(item.id, n);
      return n;
    }));
  }

  function place(n, item) {
    n.style.left = item.x + 'px';
    n.style.top = item.y + 'px';
    n.style.transform = `translate(-50%, -50%) rotate(${item.r || 0}deg) scale(${item.k || 1})`;
    n.style.setProperty('--k', item.k || 1);
    n.firstChild.style.transform = item.flip ? 'scaleX(-1)' : '';
  }

  // redraw one thing after its look changed (color, words, picture)
  function refresh(item) {
    const old = nodes.get(item.id);
    if (!old) return draw();
    const n = make(item);
    nodes.set(item.id, n);
    old.replaceWith(n);
  }

  const ratio = () => el.offsetWidth / (el.getBoundingClientRect().width || 1);
  const box = () => bounds?.() || { x0: 0, y0: 0, x1: el.offsetWidth, y1: el.offsetHeight };

  function select(id) {
    if (selected === id) return;
    selected = id;
    for (const [nid, n] of nodes) n.classList.toggle('sel', nid === id);
    onPick?.(items.find(i => i.id === id) || null);
  }

  function grab(e, item) {
    if (e.button > 0) return;
    const sx = e.clientX, sy = e.clientY;
    if (!editable || locked) {
      // just looking (or string mode): a tap is a tap
      const up = ev => {
        window.removeEventListener('pointerup', up);
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) onTap?.(item, ev);
      };
      window.addEventListener('pointerup', up);
      if (locked) e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const wasSelected = selected === item.id;
    select(item.id);
    const n = nodes.get(item.id);
    const r = ratio(), ox = item.x, oy = item.y, b = box();
    let moved = false;
    n.classList.add('dragging');
    const move = ev => {
      const dx = (ev.clientX - sx) * r, dy = (ev.clientY - sy) * r;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      item.x = Math.round(Math.max(b.x0, Math.min(b.x1, ox + dx)));
      item.y = Math.round(Math.max(b.y0, Math.min(b.y1, oy + dy)));
      place(n, item);
      onMove?.(item);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      n.classList.remove('dragging');
      if (moved) onChange();
      else if (wasSelected) onTap?.(item);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function turn(e, item) {
    e.preventDefault();
    e.stopPropagation();
    const n = nodes.get(item.id);
    const rect = n.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx), d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const r0 = item.r || 0, k0 = item.k || 1;
    const move = ev => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx), d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      let r = r0 + (a - a0) * 180 / Math.PI;
      r = ((r + 540) % 360) - 180;
      if (Math.abs(r) < 4) r = 0; // snaps straight
      item.r = Math.round(r);
      item.k = Math.round(Math.max(.2, Math.min(5, k0 * d / d0)) * 100) / 100;
      place(n, item);
      onMove?.(item);
      onPick?.(item, true);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onChange();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function remove(id) {
    const i = items.findIndex(it => it.id === id);
    if (i < 0 || !canDelete(items[i])) return;
    const [gone] = items.splice(i, 1);
    if (onDelete) onDelete(gone);
    else if (gone.imageId) store.deleteImage(gone.imageId);
    selected = null;
    draw();
    onChange();
    onPick?.(null);
  }

  function shift(id, by) {
    const i = items.findIndex(it => it.id === id);
    if (i < 0) return;
    const j = by === Infinity ? items.length - 1 : by === -Infinity ? 0 : Math.max(0, Math.min(items.length - 1, i + by));
    if (i === j) return;
    items.splice(j, 0, ...items.splice(i, 1));
    draw();
    onChange();
  }

  // clicking empty space lets go of whatever was picked
  el.addEventListener('pointerdown', e => { if (e.target === el) select(null); });

  draw();
  return {
    el, draw, refresh, select, place: item => { const n = nodes.get(item.id); if (n) place(n, item); onMove?.(item); },
    node: id => nodes.get(id),
    get selected() { return items.find(i => i.id === selected) || null; },
    set locked(v) { locked = v; el.classList.toggle('rl-locked', v); if (v) select(null); },
    get locked() { return locked; },
    add(item) {
      items.push(item);
      selected = item.id;
      draw();
      onChange();
      onPick?.(item);
      const n = nodes.get(item.id);
      n?.classList.add('rl-pop');
    },
    remove,
    removeSelected() { if (selected) remove(selected); },
    forward: id => shift(id, 1),
    backward: id => shift(id, -1),
    toFront: id => shift(id, Infinity),
    toBack: id => shift(id, -Infinity),
    flip(item) { item.flip = !item.flip; this.place(item); onChange(); },
    async duplicate(item) { this.add(await copyThing(item)); },
  };
}

// the bar of buttons for whatever is picked: size, flip, layer order, copy, remove, + app extras
export function toolBar(layer, item, onChange, { extra = [], noDelete = false, noFlip = false, noCopy = false } = {}) {
  const size = h('input', {
    type: 'range', min: .2, max: 4, step: .05, value: item.k || 1, class: 'rl-size',
    oninput: e => { item.k = +e.target.value; layer.place(item); },
    onchange: onChange,
  });
  const turn = h('input', {
    type: 'range', min: -180, max: 180, step: 1, value: item.r || 0, class: 'rl-size',
    oninput: e => { item.r = +e.target.value; layer.place(item); },
    onchange: onChange,
  });
  const btn = (label, title, fn) => h('button', { type: 'button', class: 'rl-tool', title, onclick: fn }, label);
  const bar = h('div', { class: 'rl-tools' },
    h('label', { class: 'rl-slide' }, h('span', {}, 'size'), size),
    h('label', { class: 'rl-slide' }, h('span', {}, 'turn'), turn),
    h('div', { class: 'rl-btns' },
      noFlip ? null : btn('⇋', 'flip', () => layer.flip(item)),
      btn('⤒', 'to the front', () => layer.toFront(item.id)),
      btn('↑', 'forward', () => layer.forward(item.id)),
      btn('↓', 'backward', () => layer.backward(item.id)),
      btn('⤓', 'to the back', () => layer.toBack(item.id)),
      noCopy ? null : btn('⧉', 'copy', () => layer.duplicate(item)),
      noDelete ? null : h('button', { type: 'button', class: 'rl-tool danger', title: 'remove', onclick: () => layer.remove(item.id) }, '✕')),
    extra.length ? h('div', { class: 'rl-extra' }, extra) : null);
  bar.sync = () => { size.value = item.k || 1; turn.value = item.r || 0; };
  return bar;
}

// delete key removes the picked thing
export function deleteKey(layer) {
  const onKey = e => {
    if (e.target.matches?.('input, textarea, select, [contenteditable]')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && layer.selected) { e.preventDefault(); layer.removeSelected(); }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

// fills in missing keys on the app's saved object without replacing it
export function defaults(d, def) {
  for (const [k, v] of Object.entries(def)) if (d[k] === undefined) d[k] = structuredClone(v);
  return d;
}

// a picture under a key named imageId, shown as a background-cover <img>
export function picImg(imageId, cls = '') {
  const img = h('img', { class: cls, alt: '', draggable: false });
  if (imageId) store.imageURL(imageId).then(url => { if (url) img.src = url; });
  return img;
}

// tabs made of chips. tabs: [[id, label]]
export function chipTabs(tabs, value, onPick) {
  const wrap = h('div', { class: 'rl-tabs' });
  const draw = () => fill(wrap, tabs.map(([id, label]) => h('button', {
    type: 'button', class: 'rl-tab' + (id === value ? ' on' : ''), dataset: { tab: id },
    onclick: () => { value = id; draw(); onPick(id); },
  }, label)));
  draw();
  return wrap;
}
