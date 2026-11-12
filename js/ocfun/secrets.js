// secrets jar: the secrets an oc keeps + which other ocs know each one. folded paper slips in a glass jar;
// click one to open it. filter by who knows.
// saved in char.fun.secrets = { list: [{ id, text, size: 'small' | 'big' | 'huge', knows: [ocId], at }] }

import { h, fill, uid, confirmDialog, openModal, segmented, autosize } from '../ui.js';
import { store } from '../store.js';
import { appBar, portrait, nameOf, worldmates } from './kit.js';

export const meta = { id: 'secrets', label: 'secrets jar', icon: '1fad9' };

const SIZES = ['small', 'big', 'huge'];
const SLIP = ['#fff6c2', '#ffd9e8', '#e3c6ff', '#c9f5e6', '#d6ecff', '#ffe0c7'];
const hash = s => { let x = 7; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.list ||= [];
  let filter = 'all'; // 'all' | 'nobody' | ocId
  const box = h('div', { class: 'scj' });
  const save = () => ctx.save();
  const mates = () => worldmates(char.id);

  function slip(sec) {
    const n = hash(sec.id);
    return h('button', {
      type: 'button', class: `scj-slip size-${sec.size || 'small'}`, title: '',
      style: { '--paper': SLIP[n % SLIP.length], '--r': ((n % 50) - 25) + 'deg', '--dx': ((n >> 3) % 30 - 15) + 'px' },
      onclick: () => open(sec),
    }, h('span', { class: 'scj-fold' }), sec.knows.length ? h('span', { class: 'scj-dot' }, String(sec.knows.length)) : null);
  }

  function open(sec) {
    const isNew = !sec;
    sec ||= { id: 'se_' + uid(), text: '', size: 'small', knows: [], at: Date.now() };
    const draft = { text: sec.text, size: sec.size || 'small', knows: [...sec.knows] };
    const knowsRow = h('div', { class: 'scj-knows' });
    const drawKnows = () => fill(knowsRow, mates().length ? mates().map(c => {
      const on = draft.knows.includes(c.id);
      return h('button', {
        type: 'button', class: 'scj-knows-chip' + (on ? ' on' : ''), style: { '--c': c.color }, disabled: !mine,
        onclick: () => { draft.knows = on ? draft.knows.filter(x => x !== c.id) : [...draft.knows, c.id]; drawKnows(); },
      }, portrait(c, 'xs'), nameOf(c));
    }) : h('span', { class: 'scj-nobody' }, 'nobody'));
    drawKnows();
    const body = h('div', { class: 'scj-open', style: { '--paper': SLIP[hash(sec.id) % SLIP.length] } },
      mine ? autosize(h('textarea', { class: 'scj-text-in', rows: 4, maxLength: 1200, placeholder: '...', value: draft.text, oninput: e => { draft.text = e.target.value; } }))
        : h('div', { class: 'scj-text' }, sec.text),
      h('div', { class: 'scj-label' }, 'how big'),
      mine ? segmented(SIZES.map(v => ({ value: v, label: v })), draft.size, v => { draft.size = v; }) : h('div', { class: 'scj-size-tag size-' + draft.size }, draft.size),
      h('div', { class: 'scj-label' }, 'who knows'),
      knowsRow);
    const m = openModal({
      title: isNew ? 'new secret' : 'secret',
      body,
      actions: mine ? [
        ...(isNew ? [] : [{ label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog('throw this secret away?', { okLabel: 'delete', danger: true })) return;
          d.list = d.list.filter(x => x !== sec); save(); close(); draw();
        } }]),
        { label: isNew ? 'put it in the jar' : 'save', kind: 'primary', onClick: close => {
          if (!draft.text.trim()) { close(); return; }
          Object.assign(sec, draft, { text: draft.text.trim() });
          if (isNew) d.list.push(sec);
          save(); close(); draw();
        } },
      ] : [],
    });
    m.el.classList.add('scj-modal');
  }

  function draw() {
    const shown = d.list.filter(s => filter === 'all' || (filter === 'nobody' ? !s.knows.length : s.knows.includes(filter)));
    const filters = [{ value: 'all', label: 'all' }, { value: 'nobody', label: 'nobody knows' }, ...mates().filter(c => d.list.some(s => s.knows.includes(c.id))).map(c => ({ value: c.id, label: nameOf(c) }))];
    if (!filters.some(f => f.value === filter)) filter = 'all';
    fill(box,
      appBar(ctx, meta, mine ? h('button', { class: 'btn primary sm', onclick: () => open(null) }, '+ secret') : null),
      d.list.length ? h('div', { class: 'scj-filters' }, segmented(filters, filter, v => { filter = v; draw(); })) : null,
      h('div', { class: 'scj-scene' },
        h('div', { class: 'scj-jar' },
          h('div', { class: 'scj-lid' }, h('span', { class: 'scj-lid-label' }, nameOf(char))),
          h('div', { class: 'scj-glass' },
            h('div', { class: 'scj-pile' }, shown.map(slip)),
            h('i', { class: 'scj-shine' })),
          h('div', { class: 'scj-tag', style: { '--c': char.color } }, `${shown.length}`))),
      shown.length ? h('div', { class: 'scj-list' }, [...shown].sort((a, b) => SIZES.indexOf(b.size) - SIZES.indexOf(a.size)).map(sec => h('button', {
        type: 'button', class: 'scj-row size-' + (sec.size || 'small'), onclick: () => open(sec), style: { '--paper': SLIP[hash(sec.id) % SLIP.length] },
      },
        h('span', { class: 'scj-row-size' }, sec.size || 'small'),
        h('span', { class: 'scj-row-text' }, sec.text),
        h('span', { class: 'scj-row-knows' }, sec.knows.map(id => store.char(id)).filter(Boolean).map(c => portrait(c, 'xs')))))) : null);
  }
  draw();
  el.append(box);
}
