// birthday cards: cards other ocs gave them. who it's from (a worldmate or a typed name), the front (color,
// pattern, words, a 3d sticker), the message inside. they stand on a shelf under bunting; tap one and it opens.
//
// d.cards = [{ id, from, fromName, color, pattern, words, sticker, message, date }]

import { h, fill, segmented, swatches, openModal, confirmDialog, uid } from '../ui.js';
import { appBar, portrait, nameOf, worldmates, ocById } from './kit.js';
import { pickStickerIcon } from '../parts.js';
import { stickerNode } from '../diary/stickers.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'bdaycards', label: 'birthday cards', icon: '1f382' };

const COLORS = ['#ff4fa3', '#ffd9e8', '#b18cff', '#6ec6ff', '#7df9d0', '#ffd84d', '#ff8a3d', '#1a1320', '#ffffff'];
const PATTERNS = ['plain', 'dots', 'stripes', 'confetti', 'hearts', 'stars'];
const DEF = { cards: [] };
const readable = hex => { const n = parseInt((hex || '#ffffff').slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > .6 ? '#2a1a2e' : '#ffffff'; };
function seeded(str) {
  let x = 5;
  for (const ch of str) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const who = c => {
  const oc = ocById(c.from);
  return { oc, name: oc ? nameOf(oc) : (c.fromName || '').trim() || 'someone' };
};

function front(c) {
  return h('div', { class: `bdc-front bdc-p-${c.pattern || 'plain'}`, style: { '--card': c.color || '#ff4fa3', '--card-ink': readable(c.color) } },
    c.sticker ? h('div', { class: 'bdc-stk' }, stickerNode(c.sticker)) : h('div', { class: 'bdc-cake' }, h('i'), h('i'), h('i')),
    h('div', { class: 'bdc-words' }, c.words || 'happy birthday'));
}

// the whole card. open = the front swung open to show the inside
export function card(c, char, { open = false } = {}) {
  const { oc, name } = who(c);
  return h('div', { class: 'bdc-card' + (open ? ' open' : ''), style: { '--card': c.color || '#ff4fa3' } },
    h('div', { class: 'bdc-inner' },
      h('div', { class: 'bdc-msg' }, c.message || ''),
      h('div', { class: 'bdc-sign' }, h('span', {}, 'love,'), h('b', {}, name)),
      oc ? h('div', { class: 'bdc-from-pfp' }, portrait(oc, 'sm')) : null),
    h('div', { class: 'bdc-flap' }, front(c), h('div', { class: 'bdc-flap-back' }, h('span', {}, `to ${nameOf(char)}`))));
}

export function render(el, ctx) {
  const { char } = ctx;
  const d = defaults(ctx.data, DEF);
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  const shelf = h('div', { class: 'bdc-shelf' });
  el.append(appBar(ctx, meta, edit ? h('button', { class: 'btn primary sm', onclick: () => {
    const mates = worldmates(char.id);
    const c = { id: 'bc_' + uid(), from: mates[d.cards.length % Math.max(1, mates.length)]?.id || null, fromName: '', color: COLORS[d.cards.length % COLORS.length], pattern: PATTERNS[(d.cards.length + 1) % PATTERNS.length], words: 'happy birthday', sticker: null, message: '', date: new Date().toISOString().slice(0, 10) };
    d.cards.unshift(c); save(); draw(); editCard(c);
  } }, '+ card') : null), shelf);

  function draw() {
    fill(shelf,
      h('div', { class: 'bdc-bunting' }, Array.from({ length: 14 }, (_, i) => h('i', { style: { '--i': i } }))),
      h('div', { class: 'bdc-row' }, d.cards.map(c => {
        const r = seeded(c.id);
        return h('button', { type: 'button', class: 'bdc-pick', style: { '--tilt': ((r() - .5) * 12).toFixed(1) + 'deg' }, onclick: () => show(c) }, front(c));
      })),
      h('div', { class: 'bdc-ledge' }));
  }

  function show(c) {
    const node = card(c, char);
    const m = openModal({
      title: `from ${who(c).name}`, wide: true,
      body: h('div', { class: 'bdc-view' }, node),
      actions: edit ? [{ label: 'edit', kind: 'ghost', onClick: close => { close(); editCard(c); } }] : [],
    });
    setTimeout(() => node.classList.add('open'), 350);
    node.onclick = () => node.classList.toggle('open');
    return m;
  }

  function editCard(c) {
    const field = (label, input) => h('label', { class: 'bdc-field' }, h('span', {}, label), input);
    const prev = h('div', { class: 'bdc-view small' });
    const redo = () => { fill(prev, card(c, char, { open: true })); save(); draw(); };
    const mates = worldmates(char.id);
    const fromName = h('input', { type: 'text', value: c.fromName || '', maxLength: 30, placeholder: 'name', hidden: !!c.from, oninput: e => { c.fromName = e.target.value; redo(); } });
    const stkBox = h('div', { class: 'bdc-stk-row' });
    const drawStk = () => fill(stkBox,
      c.sticker ? h('span', { class: 'bdc-stk-prev' }, stickerNode(c.sticker)) : null,
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { c.sticker = id; drawStk(); redo(); }) }, c.sticker ? 'change sticker' : '+ sticker'),
      c.sticker ? h('button', { type: 'button', class: 'link-btn', onclick: () => { c.sticker = null; drawStk(); redo(); } }, 'cake') : null);
    drawStk();
    redo();
    openModal({
      title: 'birthday card', wide: true,
      body: h('div', { class: 'bdc-edit' },
        h('div', { class: 'bdc-form' },
          field('from', h('div', { class: 'bdc-from' },
            h('select', { onchange: e => { c.from = e.target.value || null; fromName.hidden = !!c.from; redo(); } },
              mates.map(m => h('option', { value: m.id, selected: c.from === m.id }, nameOf(m))),
              h('option', { value: '', selected: !c.from }, 'someone else')),
            fromName)),
          field('front words', h('input', { type: 'text', value: c.words || '', maxLength: 30, placeholder: 'happy birthday', oninput: e => { c.words = e.target.value; redo(); } })),
          field('color', swatches(c.color, v => { c.color = v; redo(); }, COLORS)),
          field('pattern', segmented(PATTERNS.map(v => ({ value: v, label: v })), c.pattern || 'plain', v => { c.pattern = v; redo(); })),
          field('on the front', stkBox),
          field('inside', h('textarea', { rows: 4, maxLength: 400, value: c.message || '', placeholder: 'message', oninput: e => { c.message = e.target.value; redo(); } })),
          field('date', h('input', { type: 'date', value: c.date || '', onchange: e => { c.date = e.target.value; save(); } }))),
        prev),
      actions: [
        { label: 'delete', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('delete this card?', { okLabel: 'delete', danger: true })) return;
          d.cards = d.cards.filter(x => x !== c); save(); draw(); close();
        } },
        { label: 'done', kind: 'primary', onClick: close => close() },
      ],
    });
  }

  draw();
}
