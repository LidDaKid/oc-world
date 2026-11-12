// ask box: formspring / tumblr style. asks come from a worldmate or anon, the oc answers them.
// saved in char.fun.askbox = { asks: [{ id, from: ocId | null (anon), q, a, at, answeredAt }], color }

import { h, fill, uid, confirmDialog, openModal, segmented, autosize } from '../ui.js';
import { store } from '../store.js';
import { appBar, portrait, nameOf, worldmates, fmtDate } from './kit.js';

export const meta = { id: 'askbox', label: 'ask box', icon: '1f4ee' };

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.asks ||= [];
  let tab = d.asks.some(a => !a.a) && mine ? 'inbox' : 'answered';
  const box = h('div', { class: 'akb' });

  const asker = a => (a.from ? store.char(a.from) : null);
  const askerName = a => (a.from ? (asker(a) ? nameOf(asker(a)) : 'someone') : 'anonymous');

  function ask() {
    const mates = worldmates(char.id);
    let from = null;
    const q = autosize(h('textarea', { rows: 3, maxLength: 500, placeholder: 'ask me anything', 'data-autofocus': true }));
    const pick = h('select', { class: 'oc-select', onchange: e => { from = e.target.value || null; } },
      h('option', { value: '' }, 'anonymous'), mates.map(c => h('option', { value: c.id }, nameOf(c))));
    openModal({
      title: `ask ${nameOf(char)}`,
      body: h('div', { class: 'akb-ask-form' }, h('label', { class: 'akb-from' }, h('span', {}, 'from'), pick), q),
      actions: [{ label: 'send', kind: 'primary', onClick: close => {
        if (!q.value.trim()) return;
        d.asks.unshift({ id: 'ak_' + uid(), from, q: q.value.trim(), a: '', at: Date.now(), answeredAt: null });
        ctx.save(); close(); tab = 'inbox'; draw();
      } }],
    });
  }

  async function remove(a) {
    if (!await confirmDialog('delete this ask?', { okLabel: 'delete', danger: true })) return;
    d.asks = d.asks.filter(x => x !== a);
    ctx.save();
    draw();
  }

  function askBubble(a) {
    const who = asker(a);
    return h('div', { class: 'akb-q' },
      h('div', { class: 'akb-q-who' }, who ? portrait(who, 'sm') : h('span', { class: 'akb-anon' }, '?'),
        h('span', {}, h('b', {}, askerName(a)), ' asked:')),
      h('div', { class: 'akb-q-text' }, a.q));
  }

  function inboxItem(a) {
    const answer = autosize(h('textarea', { class: 'akb-answer-in', rows: 2, maxLength: 2000, placeholder: 'answer', value: a.a || '' }));
    return h('div', { class: 'akb-inbox-item' },
      askBubble(a),
      h('div', { class: 'akb-inbox-meta' }, fmtDate(a.at)),
      mine ? answer : null,
      mine ? h('div', { class: 'akb-row' },
        h('button', { class: 'btn primary sm', onclick: () => {
          if (!answer.value.trim()) return;
          a.a = answer.value.trim(); a.answeredAt = Date.now(); ctx.save(); draw();
        } }, 'answer'),
        h('button', { class: 'btn ghost sm', onclick: () => remove(a) }, 'delete')) : null);
  }

  function post(a) {
    return h('article', { class: 'akb-post' },
      askBubble(a),
      h('div', { class: 'akb-ans' },
        h('div', { class: 'akb-ans-who' }, portrait(char, 'sm'), h('b', {}, nameOf(char))),
        h('div', { class: 'akb-ans-text' }, a.a)),
      h('footer', { class: 'akb-foot' },
        h('span', {}, fmtDate(a.answeredAt || a.at)),
        h('span', { class: 'akb-tags' }, '#ask', ' #', askerName(a).toLowerCase().replace(/\s+/g, '')),
        mine ? h('span', { class: 'akb-foot-tools' },
          h('button', { class: 'link-btn', onclick: () => { a.a = ''; a.answeredAt = null; ctx.save(); tab = 'inbox'; draw(); } }, 'edit'),
          h('button', { class: 'link-btn danger', onclick: () => remove(a) }, 'delete')) : null));
  }

  function draw() {
    const inbox = d.asks.filter(a => !a.a);
    const answered = d.asks.filter(a => a.a).sort((x, y) => (y.answeredAt || y.at) - (x.answeredAt || x.at));
    if (!mine) tab = 'answered';
    fill(box,
      appBar(ctx, meta, mine ? h('button', { class: 'btn primary sm', onclick: ask }, '+ ask') : null),
      h('div', { class: 'akb-head', style: { '--c': char.color } },
        portrait(char, 'lg'),
        h('div', { class: 'akb-head-text' }, h('div', { class: 'akb-head-name' }, nameOf(char)), h('div', { class: 'akb-head-count' }, `${answered.length} answered`)),
        mine ? h('button', { class: 'akb-ask-btn', onclick: ask }, 'ask me anything') : null),
      mine ? h('div', { class: 'akb-tabs' }, segmented([
        { value: 'inbox', label: `inbox ${inbox.length || ''}`.trim() },
        { value: 'answered', label: 'answered' },
      ], tab, v => { tab = v; draw(); })) : null,
      tab === 'inbox'
        ? (inbox.length ? h('div', { class: 'akb-inbox' }, inbox.map(inboxItem)) : h('div', { class: 'akb-empty' }, h('span', { class: 'akb-empty-box' }), '0'))
        : (answered.length ? h('div', { class: 'akb-feed' }, answered.map(post)) : h('div', { class: 'akb-empty' }, h('span', { class: 'akb-empty-box' }), '...')));
  }
  draw();
  el.append(box);
}
