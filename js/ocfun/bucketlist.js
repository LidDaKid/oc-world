// bucket list: goals + dreams to check off, on a sheet of notebook paper.
// saved in char.fun.bucketlist = { items: [{ id, text, done, doneAt, at }], title }

import { h, fill, uid, confirmDialog, segmented } from '../ui.js';
import { appBar, nameOf, fmtDate } from './kit.js';

export const meta = { id: 'bucketlist', label: 'bucket list', icon: '2705' };

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.items ||= [];
  d.title ??= '';
  let show = 'all';
  const box = h('div', { class: 'bkl' });

  function add(input) {
    const text = input.value.trim();
    if (!text) return;
    d.items.push({ id: 'bk_' + uid(), text, done: false, doneAt: null, at: Date.now() });
    ctx.save();
    input.value = '';
    draw();
    box.querySelector('.bkl-add-in')?.focus();
  }

  function toggle(it) {
    if (!mine) return;
    it.done = !it.done;
    it.doneAt = it.done ? Date.now() : null;
    ctx.save();
    draw();
  }

  function row(it, n) {
    const text = mine
      ? h('input', { type: 'text', class: 'bkl-text-in', value: it.text, maxLength: 160, oninput: e => { it.text = e.target.value; ctx.save(); }, onblur: () => { if (!it.text.trim()) { d.items = d.items.filter(x => x !== it); ctx.save(); draw(); } } })
      : h('span', { class: 'bkl-text' }, it.text);
    return h('li', { class: 'bkl-item' + (it.done ? ' done' : '') },
      h('span', { class: 'bkl-num' }, n + '.'),
      h('button', { type: 'button', class: 'bkl-box', title: it.done ? 'not done' : 'done', disabled: !mine, onclick: () => toggle(it) }, it.done ? h('i', { class: 'bkl-check' }) : null),
      h('span', { class: 'bkl-words' }, text, it.done ? h('span', { class: 'bkl-strike' }) : null),
      it.done && it.doneAt ? h('span', { class: 'bkl-date' }, fmtDate(it.doneAt)) : null,
      mine ? h('button', { type: 'button', class: 'bkl-x', title: 'remove', onclick: async () => {
        if (!await confirmDialog(`take "${it.text}" off the list?`, { okLabel: 'remove', danger: true })) return;
        d.items = d.items.filter(x => x !== it); ctx.save(); draw();
      } }, '✕') : null);
  }

  function draw() {
    const done = d.items.filter(i => i.done).length, total = d.items.length;
    const list = d.items.filter(i => show === 'all' || (show === 'done' ? i.done : !i.done));
    const pct = total ? Math.round((done / total) * 100) : 0;
    const addIn = h('input', { type: 'text', class: 'bkl-add-in', maxLength: 160, placeholder: 'see the ocean at night', onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); add(e.target); } } });
    fill(box,
      appBar(ctx, meta, total ? segmented([{ value: 'all', label: 'all' }, { value: 'todo', label: 'to do' }, { value: 'done', label: 'done' }], show, v => { show = v; draw(); }) : null),
      h('div', { class: 'bkl-paper', style: { '--c': char.color } },
        h('div', { class: 'bkl-holes' }, h('i'), h('i'), h('i')),
        h('div', { class: 'bkl-head' },
          mine ? h('input', { type: 'text', class: 'bkl-title-in', maxLength: 60, placeholder: `${nameOf(char)}'s bucket list`, value: d.title, oninput: e => { d.title = e.target.value; ctx.save(); } })
            : h('div', { class: 'bkl-title' }, d.title || `${nameOf(char)}'s bucket list`),
          h('div', { class: 'bkl-progress' },
            h('div', { class: 'bkl-count' }, h('b', {}, String(done)), ` / ${total}`),
            h('div', { class: 'bkl-bar' }, h('i', { style: { width: pct + '%' } })))),
        h('ol', { class: 'bkl-list' }, list.map(it => row(it, d.items.indexOf(it) + 1))),
        mine ? h('div', { class: 'bkl-add' }, h('span', { class: 'bkl-num' }, `${total + 1}.`), h('span', { class: 'bkl-box ghost' }), addIn,
          h('button', { class: 'btn primary sm', onclick: () => add(addIn) }, 'add')) : null,
        total && done === total ? h('div', { class: 'bkl-stamp' }, 'all done') : null));
  }
  draw();
  el.append(box);
}
