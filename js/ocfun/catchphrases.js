// catchphrases: a wall of things they always say, as speech bubbles. "say something" pops a random one up big.
// saved in char.fun.catchphrases = { list: [{ id, text, when, style, size, color }] }

import { h, fill, uid, confirmDialog, openModal, segmented, swatches, autosize } from '../ui.js';
import { appBar, portrait, nameOf } from './kit.js';

export const meta = { id: 'catchphrases', label: 'catchphrases', icon: '1f4ac' };

const STYLES = ['speech', 'shout', 'thought', 'whisper', 'text'];
const SIZES = ['small', 'medium', 'big'];
const COLORS = ['#ffffff', '#fff6a8', '#ffd9e8', '#e3c6ff', '#c9f5e6', '#d6ecff', '#ff4fa3', '#2a2230'];
const hash = s => { let x = 7; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
const inkFor = c => (['#ff4fa3', '#2a2230'].includes(c) ? '#ffffff' : '#1d1722');

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.list ||= [];
  const box = h('div', { class: 'cph' });
  let last = null;

  const bubble = (p, extra = '') => h('div', {
    class: `cph-bubble st-${p.style || 'speech'} sz-${p.size || 'medium'} ${extra}`,
    style: { '--paper': p.color || '#ffffff', '--ink': inkFor(p.color || '#ffffff'), '--r': ((hash(p.id) % 7) - 3) + 'deg' },
  }, h('span', { class: 'cph-words' }, p.text));

  function edit(p) {
    const isNew = !p;
    p ||= { id: 'cp_' + uid(), text: '', when: '', style: 'speech', size: 'medium', color: COLORS[d.list.length % 6] };
    const draft = { ...p };
    const prev = h('div', { class: 'cph-prev' });
    const drawPrev = () => fill(prev, bubble({ ...draft, text: draft.text || '...' }, 'flat'));
    drawPrev();
    openModal({
      title: isNew ? 'new catchphrase' : 'catchphrase',
      body: h('div', { class: 'cph-form' },
        prev,
        autosize(h('textarea', { rows: 2, maxLength: 200, placeholder: 'as if', value: draft.text, 'data-autofocus': true, oninput: e => { draft.text = e.target.value; drawPrev(); } })),
        h('input', { type: 'text', maxLength: 80, placeholder: 'when they say it', value: draft.when, oninput: e => { draft.when = e.target.value; } }),
        segmented(STYLES.map(v => ({ value: v, label: v })), draft.style, v => { draft.style = v; drawPrev(); }),
        segmented(SIZES.map(v => ({ value: v, label: v })), draft.size, v => { draft.size = v; drawPrev(); }),
        swatches(draft.color, c => { draft.color = c; drawPrev(); }, COLORS)),
      actions: [
        ...(isNew ? [] : [{ label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog('delete this one?', { okLabel: 'delete', danger: true })) return;
          d.list = d.list.filter(x => x !== p); ctx.save(); close(); draw();
        } }]),
        { label: isNew ? 'add' : 'save', kind: 'primary', onClick: close => {
          if (!draft.text.trim()) { close(); return; }
          Object.assign(p, draft, { text: draft.text.trim(), when: draft.when.trim() });
          if (isNew) d.list.push(p);
          ctx.save(); close(); draw();
        } },
      ],
    });
  }

  function say() {
    if (!d.list.length) return;
    let p = d.list[Math.floor(Math.random() * d.list.length)];
    if (d.list.length > 1) while (p === last) p = d.list[Math.floor(Math.random() * d.list.length)];
    last = p;
    document.querySelector('.cph-stage')?.remove();
    const stage = h('div', { class: 'cph-stage', onclick: () => stage.remove() },
      h('div', { class: 'cph-stage-inner' },
        bubble(p, 'big-say'),
        h('div', { class: 'cph-stage-who' }, portrait(char, 'lg'), h('b', {}, nameOf(char))),
        p.when ? h('div', { class: 'cph-stage-when' }, p.when) : null));
    document.body.append(stage); // on the page itself so a frosted panel can't trap it
  }

  function draw() {
    fill(box,
      appBar(ctx, meta,
        d.list.length ? h('button', { class: 'btn sm cph-say-btn', onclick: say }, 'say something') : null,
        mine ? h('button', { class: 'btn primary sm', onclick: () => edit(null) }, '+ catchphrase') : null),
      h('div', { class: 'cph-wall', style: { '--c': char.color } },
        d.list.length ? h('div', { class: 'cph-grid' }, d.list.map(p => h(mine ? 'button' : 'div', {
          type: mine ? 'button' : null, class: 'cph-cell', onclick: mine ? () => edit(p) : null,
        }, bubble(p), p.when ? h('div', { class: 'cph-when' }, p.when) : null)))
          : h('div', { class: 'cph-empty' }, mine ? h('button', { class: 'btn ghost', onclick: () => edit(null) }, '+ catchphrase') : '...'),
        h('div', { class: 'cph-me' }, portrait(char, 'md'))));
  }
  draw();
  el.append(box);
  return () => document.querySelector('.cph-stage')?.remove();
}
