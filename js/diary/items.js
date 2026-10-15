// the stuff stuck onto a page or a cover: stickers, photos, and the cover's title.
//
//   item = { id, kind: 'sticker' | 'photo' | 'title', x, y, r, k, ... }
//     x, y = the middle of it (in page pixels, W x H), r = turn in degrees, k = size (1 = normal)
//     sticker: s = the sticker id (see stickers.js)
//     photo:   imageId, ar (width / height), frame: 'polaroid' | 'tape' | 'plain' | 'sticker'
//     title:   reads the words + style from diary.cover.title

import { h, uid } from '../ui.js';
import { store } from '../store.js';
import { stickerNode, TAPES } from './stickers.js';
import { coverFont, preset } from './covers.js';

export const newItem = fields => ({ id: 'i_' + uid(), x: 210, y: 300, r: 0, k: 1, ...fields });

function inner(item, diary) {
  if (item.kind === 'sticker') return stickerNode(item.s);
  if (item.kind === 'photo') {
    const img = h('img', { alt: '', draggable: false });
    store.imageURL(item.imageId).then(url => { if (url) img.src = url; });
    const w = 170, pic = h('div', { class: 'ph-pic', style: { width: w + 'px', height: Math.round(w / (item.ar || 1)) + 'px' } }, img);
    const frame = item.frame || 'polaroid';
    return h('div', { class: 'ph ph-' + frame }, pic,
      frame === 'tape' ? [h('span', { class: 'ph-tape a', style: { background: TAPES[item.tape] || TAPES.pink } }), h('span', { class: 'ph-tape b', style: { background: TAPES[item.tape] || TAPES.pink } })] : null);
  }
  if (item.kind === 'title') {
    const t = diary.cover.title;
    const font = coverFont(t.font);
    const ink = t.color || preset(diary.cover.preset)[3].ink || '#fff';
    return h('div', {
      class: 'cv-title ct-' + t.style,
      style: { fontFamily: font.css, '--ink': ink, fontSize: Math.round(Math.min(46, 480 / Math.max(1, (t.text || '').length)) * (font.scale || 1)) + 'px' },
    }, t.text || ' ');
  }
  return h('span');
}

// a slider for how big the picked item is
export function sizeSlider(item, layer, onDone) {
  return h('label', { class: 'size-slider', title: 'size' },
    h('span', {}, '🔍'),
    h('input', {
      type: 'range', min: .25, max: 4, step: .05, value: item.k,
      oninput: e => { item.k = +e.target.value; layer.place(item); },
      onchange: onDone,
    }));
}

// one item, placed
export function itemNode(item, diary) {
  const el = h('div', { class: 'it it-' + item.kind, dataset: { id: item.id } }, inner(item, diary));
  place(el, item);
  return el;
}

function place(el, item) {
  el.style.left = item.x + 'px';
  el.style.top = item.y + 'px';
  el.style.transform = `translate(-50%, -50%) rotate(${item.r}deg) scale(${item.k})`;
  el.style.setProperty('--k', item.k);
}

// a layer you can drag things around on. onChange runs after every move, onPick when one gets selected.
export function itemsLayer({ items, diary, onChange, onPick }) {
  const el = h('div', { class: 'items editable' });
  let selected = null;
  const nodes = new Map();

  function draw() {
    el.replaceChildren();
    nodes.clear();
    for (const item of items) {
      const node = itemNode(item, diary);
      if (item.id === selected) node.classList.add('sel');
      node.append(
        h('button', { type: 'button', class: 'it-h it-del', title: 'remove', onpointerdown: e => e.stopPropagation(), onclick: () => remove(item.id) }, '✕'),
        h('button', { type: 'button', class: 'it-h it-up', title: 'bring to front', onpointerdown: e => e.stopPropagation(), onclick: () => toFront(item.id) }, '⬆'),
        h('span', { class: 'it-h it-turn', title: 'turn + resize', onpointerdown: e => turn(e, item) }, '↻'));
      node.addEventListener('pointerdown', e => grab(e, item));
      nodes.set(item.id, node);
      el.append(node);
    }
  }

  // page pixels per screen pixel (the page is scaled to fit the screen)
  const ratio = () => el.offsetWidth / (el.getBoundingClientRect().width || 1);

  function select(id) {
    selected = id;
    for (const [nid, node] of nodes) node.classList.toggle('sel', nid === id);
    onPick?.(items.find(i => i.id === id) || null);
  }

  function grab(e, item) {
    if (e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    select(item.id);
    const node = nodes.get(item.id);
    const r = ratio(), sx = e.clientX, sy = e.clientY, ox = item.x, oy = item.y;
    let moved = false;
    const move = ev => {
      moved = true;
      item.x = Math.round(Math.max(-40, Math.min(el.offsetWidth + 40, ox + (ev.clientX - sx) * r)));
      item.y = Math.round(Math.max(-40, Math.min(el.offsetHeight + 40, oy + (ev.clientY - sy) * r)));
      place(node, item);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) onChange();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function turn(e, item) {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.get(item.id);
    const box = node.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx), d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const r0 = item.r, k0 = item.k;
    const move = ev => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx), d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
      item.r = Math.round(r0 + (a - a0) * 180 / Math.PI);
      item.k = Math.round(Math.max(.25, Math.min(5, k0 * d / d0)) * 100) / 100;
      place(node, item);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onChange();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function remove(id) {
    const i = items.findIndex(it => it.id === id);
    if (i < 0) return;
    const [gone] = items.splice(i, 1);
    if (gone.kind === 'photo') store.deleteImage(gone.imageId);
    selected = null;
    draw();
    onChange();
    onPick?.(null);
  }

  function toFront(id) {
    const i = items.findIndex(it => it.id === id);
    if (i < 0) return;
    items.push(...items.splice(i, 1));
    draw();
    onChange();
  }

  // clicking empty space lets go of whatever was picked
  el.addEventListener('pointerdown', e => { if (e.target === el) select(null); });

  draw();
  return {
    el,
    draw,
    select,
    get selected() { return items.find(i => i.id === selected) || null; },
    add(item) {
      items.push(item);
      selected = item.id;
      draw();
      onChange();
      onPick?.(item);
    },
    removeSelected() { if (selected) remove(selected); },
    // after changing an item's numbers from outside (like the size slider)
    place(item) { const node = nodes.get(item.id); if (node) place(node, item); },
  };
}
