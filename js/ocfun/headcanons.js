// headcanons: little cards of headcanons about the oc, pinned on a cork wall.
// saved in char.fun.headcanons = { list: [{ id, text, tag, color, pin: 'pin' | 'tape' | 'heart' }] }

import { h, fill, uid, confirmDialog, openModal, segmented, swatches, autosize } from '../ui.js';
import { appBar } from './kit.js';

export const meta = { id: 'headcanons', label: 'headcanons', icon: '1f4ad' };

const PAPERS = ['#fff6a8', '#ffd9e8', '#e3c6ff', '#c9f5e6', '#d6ecff', '#ffe0c7', '#ffffff', '#2a2230'];
const PINS = ['pin', 'tape', 'heart'];
const hash = s => { let x = 7; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
const inkFor = c => (c === '#2a2230' ? '#f7effc' : '#2a2230');

export function render(el, ctx) {
  const { mine } = ctx;
  const d = ctx.data;
  d.list ||= [];
  let tagFilter = null;
  const box = h('div', { class: 'hcn' });

  function edit(card) {
    const isNew = !card;
    card ||= { id: 'hc_' + uid(), text: '', tag: '', color: PAPERS[d.list.length % 6], pin: 'pin' };
    const draft = { ...card };
    const prev = h('div', { class: 'hcn-card hcn-preview', style: { '--paper': draft.color, '--ink': inkFor(draft.color) } });
    const drawPrev = () => fill(prev, h('i', { class: 'hcn-pin pin-' + draft.pin }), h('div', { class: 'hcn-text' }, draft.text || '...'), draft.tag ? h('span', { class: 'hcn-tag' }, draft.tag) : null);
    drawPrev();
    const body = h('div', { class: 'hcn-edit' },
      prev,
      autosize(h('textarea', { rows: 3, maxLength: 400, placeholder: 'hates the smell of rain', value: draft.text, 'data-autofocus': true, oninput: e => { draft.text = e.target.value; drawPrev(); } })),
      h('input', { type: 'text', maxLength: 24, placeholder: 'tag', value: draft.tag, oninput: e => { draft.tag = e.target.value; drawPrev(); } }),
      swatches(draft.color, c => { draft.color = c; prev.style.setProperty('--paper', c); prev.style.setProperty('--ink', inkFor(c)); }, PAPERS),
      segmented(PINS.map(v => ({ value: v, label: v })), draft.pin, v => { draft.pin = v; drawPrev(); }));
    openModal({
      title: isNew ? 'new headcanon' : 'headcanon',
      body,
      actions: [
        ...(isNew ? [] : [{ label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog('take this one down?', { okLabel: 'delete', danger: true })) return;
          d.list = d.list.filter(x => x !== card); ctx.save(); close(); draw();
        } }]),
        { label: isNew ? 'pin it' : 'save', kind: 'primary', onClick: close => {
          if (!draft.text.trim()) { close(); return; }
          Object.assign(card, draft, { text: draft.text.trim(), tag: draft.tag.trim() });
          if (isNew) d.list.push(card);
          ctx.save(); close(); draw();
        } },
      ],
    });
  }

  function move(card, dir) {
    const i = d.list.indexOf(card), j = i + dir;
    if (j < 0 || j >= d.list.length) return;
    d.list.splice(j, 0, d.list.splice(i, 1)[0]);
    ctx.save();
    draw();
  }

  function cardNode(card) {
    const n = hash(card.id);
    const node = h('div', {
      class: 'hcn-card', style: { '--paper': card.color, '--ink': inkFor(card.color), '--r': ((n % 9) - 4) + 'deg' },
    },
      h('i', { class: 'hcn-pin pin-' + (card.pin || 'pin') }),
      h('div', { class: 'hcn-text' }, card.text),
      card.tag ? h('button', { type: 'button', class: 'hcn-tag', onclick: () => { tagFilter = tagFilter === card.tag ? null : card.tag; draw(); } }, card.tag) : null,
      mine ? h('div', { class: 'hcn-tools' },
        h('button', { type: 'button', class: 'hcn-mini', title: 'move back', onclick: () => move(card, -1) }, '‹'),
        h('button', { type: 'button', class: 'hcn-mini', title: 'edit', onclick: () => edit(card) }, '✎'),
        h('button', { type: 'button', class: 'hcn-mini', title: 'move forward', onclick: () => move(card, 1) }, '›')) : null);
    return node;
  }

  function draw() {
    const tags = [...new Set(d.list.map(c => c.tag).filter(Boolean))];
    if (tagFilter && !tags.includes(tagFilter)) tagFilter = null;
    const shown = d.list.filter(c => !tagFilter || c.tag === tagFilter);
    fill(box,
      appBar(ctx, meta, mine ? h('button', { class: 'btn primary sm', onclick: () => edit(null) }, '+ headcanon') : null),
      tags.length ? h('div', { class: 'hcn-filters' }, segmented([{ value: '', label: 'all' }, ...tags.map(t => ({ value: t, label: t }))], tagFilter || '', v => { tagFilter = v || null; draw(); })) : null,
      h('div', { class: 'hcn-board' },
        shown.length ? h('div', { class: 'hcn-wall' }, shown.map(cardNode))
          : h('div', { class: 'hcn-empty' }, mine ? h('button', { class: 'btn ghost', onclick: () => edit(null) }, '+ headcanon') : '...')));
  }
  draw();
  el.append(box);
}
