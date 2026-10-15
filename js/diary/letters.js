// envelopes + pockets stuck on a page. each one hides a note and/or a picture.
//
//   envelope = { kind: 'envelope', color, seal, note, imageId, ar }   click it: the flap opens + the letter comes out
//   pocket   = { kind: 'pocket', color, note, imageId, ar }           click it: what's tucked in slides out

import { h, fill, openModal, swatches, pickFile, shrinkImage, toast } from '../ui.js';
import { store } from '../store.js';
import { sound } from './sound.js';
import { pickAndCrop } from '../crop.js';

export const ENV_COLORS = ['#ffb3d1', '#ff5fa8', '#241f26', '#d9c6ff', '#f6ecd9', '#d6203a', '#bfeedd', '#c9a77c', '#ffffff'];
export const SEALS = [
  { id: 'red', wax: '#b3122e' }, { id: 'pink', wax: '#e0458f' }, { id: 'black', wax: '#1d171c' },
  { id: 'purple', wax: '#6b2fb3' }, { id: 'gold', wax: '#c8961e' }, { id: 'heart' }, { id: 'star' }, { id: 'bat' },
];
export const POCKETS = ['kraft', 'gingham', 'polka', 'denim', 'lace', 'stripes'];

const dark = hex => {
  const n = parseInt((hex || '#fff').slice(1), 16);
  return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) < 110;
};

function seal(id) {
  const s = SEALS.find(x => x.id === id) || SEALS[0];
  if (s.wax) return h('i', { class: 'env-seal wax', style: { '--wax': s.wax } }, h('b', {}, '♥'));
  if (s.id === 'heart') return h('i', { class: 'env-seal stkr', innerHTML: "<svg viewBox='0 0 40 36' width='38' height='34'><path d='M20 34C8 26 2 19 2 11A9 9 0 0 1 20 7a9 9 0 0 1 18 4c0 8-6 15-18 23z' fill='#ff3d8b' stroke='#fff' stroke-width='3'/><path d='M9 10q3-4 7-2' stroke='#fff' stroke-width='2.5' fill='none' stroke-linecap='round' opacity='.7'/></svg>" });
  if (s.id === 'star') return h('i', { class: 'env-seal stkr', innerHTML: "<svg viewBox='0 0 40 40' width='38' height='38'><path d='M20 2l5.3 11.6 12.7 1.4-9.5 8.6 2.7 12.5L20 29.8 8.8 36.1l2.7-12.5L2 15l12.7-1.4z' fill='#ffd84d' stroke='#fff' stroke-width='3' stroke-linejoin='round'/></svg>" });
  return h('i', { class: 'env-seal stkr', innerHTML: "<svg viewBox='0 0 60 34' width='50' height='28'><path d='M30 12c-2 0-3-4-3-4l-2 4C17 7 9 9 3 15c6 0 9 3 10 7 5-2 11 0 17 9 6-9 12-11 17-9 1-4 4-7 10-7-6-6-14-8-22-3l-2-4s-1 4-3 4z' fill='#141114' stroke='#fff' stroke-width='2.5' stroke-linejoin='round'/></svg>" });
}

function picture(item, cls) {
  if (!item.imageId) return null;
  const img = h('img', { alt: '', draggable: false });
  store.imageURL(item.imageId).then(url => { if (url) img.src = url; });
  return h('div', { class: cls }, img);
}

// what goes inside the placed item (items.js puts it in place)
export function letterNode(item) {
  if (item.kind === 'envelope') {
    const c = item.color || ENV_COLORS[0];
    return h('div', { class: 'env' + (dark(c) ? ' env-dark' : ''), style: { '--env': c } },
      h('div', { class: 'env-back' }),
      h('div', { class: 'env-letter' },
        picture(item, 'env-letter-pic'),
        h('div', { class: 'env-letter-lines' }, (item.note || '').slice(0, 60))),
      h('div', { class: 'env-front' }),
      h('div', { class: 'env-flap' }, h('div', { class: 'env-flap-face' }), seal(item.seal)));
  }
  const style = POCKETS.includes(item.color) ? item.color : 'kraft';
  return h('div', { class: 'pkt pkt-' + style },
    h('div', { class: 'pkt-peek' + (item.imageId ? ' has-pic' : '') },
      picture(item, 'pkt-peek-pic'),
      !item.imageId ? h('div', { class: 'pkt-peek-note' }, (item.note || '').slice(0, 40)) : null),
    h('div', { class: 'pkt-front' }, h('i', { class: 'pkt-stitch' })));
}

// ---- opening one ----

let viewing = null;
export function openLetter(node, item) {
  if (viewing) return;
  const it = node.closest('.it') || node;
  it.classList.add('open');
  sound.peel();
  const box = it.getBoundingClientRect();
  const pic = item.imageId ? h('div', { class: 'lv-pic' }, h('img', { alt: '', draggable: false })) : null;
  if (pic) store.imageURL(item.imageId).then(url => { if (url) pic.firstChild.src = url; });
  const card = h('div', { class: 'lv-card lv-' + item.kind },
    h('div', { class: 'lv-scroll' }, pic, item.note ? h('div', { class: 'lv-note' }, item.note) : null),
    h('button', { type: 'button', class: 'lv-close icon-btn', title: 'close', onclick: () => close() }, '✕'));
  const wrap = h('div', { class: 'lv-wrap', onpointerdown: e => { if (e.target === wrap) close(); } }, card);
  viewing = wrap;
  const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => {
    if (viewing !== wrap) return;
    document.body.append(wrap);
    const cb = card.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (cb.left + cb.width / 2), dy = box.top + box.height / 2 - (cb.top + cb.height / 2);
    card.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${Math.min(.6, box.width / cb.width)}) rotate(-8deg)`, opacity: .2 },
      { transform: 'translate(0, 0) scale(1) rotate(-1.5deg)', opacity: 1 },
    ], { duration: 420, easing: 'cubic-bezier(.2, .9, .3, 1.2)', fill: 'both' });
  }, item.kind === 'envelope' ? 620 : 420);
  function close() {
    document.removeEventListener('keydown', onKey, true);
    const out = card.animate([{ opacity: 1, transform: 'scale(1) rotate(-1.5deg)' }, { opacity: 0, transform: 'scale(.6) rotate(-6deg) translateY(60px)' }], { duration: 220, easing: 'ease-in', fill: 'both' });
    const end = () => { wrap.remove(); viewing = null; setTimeout(() => it.classList.remove('open'), 60); };
    if (wrap.isConnected) out.finished.then(end, end); else end();
  }
}

// ---- writing what's inside ----

// resolves when the box closes. pictures swapped out along the way get thrown away.
export function editLetter(item) {
  return new Promise(resolve => {
    const draft = { color: item.color, seal: item.seal, note: item.note || '', imageId: item.imageId || null, ar: item.ar };
    const added = [];
    const preview = h('div', { class: 'le-preview' });
    const drawPreview = () => fill(preview, h('div', { class: 'it le-it' + (item.kind === 'pocket' ? ' it-pocket' : ' it-envelope') }, letterNode({ ...item, ...draft })));
    const picRow = h('div', { class: 'row' });
    const drawPic = () => fill(picRow,
      h('button', { type: 'button', class: 'btn sm', onclick: addPic }, draft.imageId ? 'change picture' : '+ picture'),
      draft.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { draft.imageId = null; drawPic(); drawPreview(); } }, 'remove picture') : null);
    async function addPic() {
      const file = await pickAndCrop();
      if (!file) return;
      try {
        const { blob, width, height } = await shrinkImage(file, 1200);
        draft.imageId = await store.putImage(blob);
        draft.ar = width / height;
        added.push(draft.imageId);
        drawPic();
        drawPreview();
      } catch (err) {
        console.error(err);
        toast("couldn't read that picture", 'bad');
      }
    }
    const colorPick = item.kind === 'envelope'
      ? swatches(draft.color, c => { draft.color = c; drawPreview(); }, ENV_COLORS)
      : h('div', { class: 'pkt-picks' }, POCKETS.map(p => h('button', {
        type: 'button', class: `pkt-pick pkt-${p}` + (draft.color === p ? ' on' : ''), title: p,
        onclick: e => { draft.color = p; e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); drawPreview(); },
      })));
    const sealPick = item.kind === 'envelope' ? h('div', { class: 'seal-picks' }, SEALS.map(s => h('button', {
      type: 'button', class: 'seal-pick' + (draft.seal === s.id ? ' on' : ''), title: s.id,
      onclick: e => { draft.seal = s.id; e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); drawPreview(); },
    }, seal(s.id)))) : null;
    const note = h('textarea', { class: 'le-note', rows: 5, maxLength: 1200, value: draft.note, oninput: e => { draft.note = e.target.value; } });
    drawPic();
    drawPreview();
    openModal({
      title: item.kind === 'envelope' ? '✉️' : '📎',
      body: h('div', { class: 'le' }, preview, colorPick, sealPick, h('label', { class: 'le-label' }, 'note', note), picRow),
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
      onClose: () => {
        // closing keeps what you wrote too (nothing is lost by hitting ✕)
        const old = item.imageId;
        Object.assign(item, draft);
        if (old && old !== item.imageId) store.deleteImage(old);
        added.filter(id => id !== item.imageId).forEach(id => store.deleteImage(id));
        resolve(true);
      },
    });
  });
}
