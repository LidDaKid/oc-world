// would you rather: two options per question, and the oc + everyone in their world picks one (with a why).
// shows the split like a poll, with everyone's pfp on their side.
// saved in char.fun.wouldyou = { qs: [{ id, a, b, votes: { [ocId]: { pick: 'a' | 'b', why } } }] }

import { h, fill, uid, confirmDialog } from '../ui.js';
import { appBar, portrait, nameOf, worldmates, ocById } from './kit.js';

export const meta = { id: 'wouldyou', label: 'would you rather', icon: '1f914' };

const START = [
  { a: 'live in a haunted mansion', b: 'live in a mall after closing' },
  { a: 'only wear black forever', b: 'only wear pink forever' },
  { a: 'be a vampire', b: 'be a werewolf' },
];

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  if (!Array.isArray(d.qs)) d.qs = START.map(q => ({ id: 'wy_' + uid(), ...q, votes: {} }));
  let open = null; // the question being voted on
  let why = null; // { q, oc } whose why is showing

  const addBtn = mine ? h('button', { class: 'btn primary sm', onclick: () => {
    const q = { id: 'wy_' + uid(), a: '', b: '', votes: {} };
    d.qs.unshift(q); save(); open = q.id; draw();
    body.querySelector('.wyr-opt-in')?.focus();
  } }, '+ question') : null;
  const body = h('div', { class: 'wyr' });
  el.append(appBar(ctx, meta, addBtn), body);

  const people = () => [char, ...worldmates(char.id)];

  function side(q, k) {
    const voters = Object.entries(q.votes).filter(([id, v]) => v.pick === k && ocById(id)).map(([id]) => ocById(id));
    const total = Object.entries(q.votes).filter(([id]) => ocById(id)).length;
    const pct = total ? Math.round((voters.length / total) * 100) : 0;
    const text = q[k];
    return h('div', { class: `wyr-side wyr-${k}`, style: { '--pct': pct + '%' } },
      h('div', { class: 'wyr-fill' }),
      mine && open === q.id
        ? h('textarea', { class: 'wyr-opt-in', rows: 2, maxLength: 120, value: text, placeholder: k === 'a' ? 'this' : 'that', oninput: e => { q[k] = e.target.value; save(); } })
        : h('div', { class: 'wyr-opt' }, text || '...'),
      h('div', { class: 'wyr-pct' }, total ? pct + '%' : ''),
      h('div', { class: 'wyr-voters' }, voters.map(o => h('button', { type: 'button', class: 'wyr-voter' + (why && why.q === q.id && why.oc === o.id ? ' on' : ''), style: { '--c': o.color }, title: nameOf(o),
        onclick: () => { why = why && why.q === q.id && why.oc === o.id ? null : { q: q.id, oc: o.id }; draw(); } }, portrait(o, 'sm')))));
  }

  function voteBox(q) {
    return h('div', { class: 'wyr-votebox' }, people().map(o => {
      const v = q.votes[o.id];
      const set = pick => { if (pick) q.votes[o.id] = { pick, why: v?.why || '' }; else delete q.votes[o.id]; save(); draw(); };
      return h('div', { class: 'wyr-vrow', style: { '--c': o.color } },
        h('span', { class: 'wyr-vwho' }, portrait(o, 'xs'), nameOf(o)),
        h('div', { class: 'wyr-vbtns' },
          h('button', { type: 'button', class: 'wyr-vbtn a' + (v?.pick === 'a' ? ' on' : ''), onclick: () => set(v?.pick === 'a' ? null : 'a') }, 'this'),
          h('button', { type: 'button', class: 'wyr-vbtn b' + (v?.pick === 'b' ? ' on' : ''), onclick: () => set(v?.pick === 'b' ? null : 'b') }, 'that')),
        v ? h('input', { type: 'text', class: 'wyr-why-in', value: v.why || '', maxLength: 120, placeholder: 'why', oninput: e => { v.why = e.target.value; save(); } }) : h('span'));
    }));
  }

  function card(q) {
    const showing = why && why.q === q.id ? ocById(why.oc) : null;
    const v = showing ? q.votes[showing.id] : null;
    return h('div', { class: 'wyr-card' + (open === q.id ? ' open' : '') },
      h('div', { class: 'wyr-top' },
        h('span', { class: 'wyr-kicker' }, 'would you rather'),
        mine ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { open = open === q.id ? null : q.id; draw(); } }, open === q.id ? 'done' : 'vote') : null,
        mine ? h('button', { type: 'button', class: 'icon-btn sm', title: 'delete', onclick: async () => {
          if (!await confirmDialog('delete this question?', { okLabel: 'delete', danger: true })) return;
          d.qs = d.qs.filter(x => x !== q); save(); draw();
        } }, '✕') : null),
      h('div', { class: 'wyr-sides' }, side(q, 'a'), h('div', { class: 'wyr-or' }, 'or'), side(q, 'b')),
      showing && v ? h('div', { class: 'wyr-why', style: { '--c': showing.color } }, portrait(showing, 'sm'),
        h('div', {}, h('b', {}, nameOf(showing)), h('div', { class: 'wyr-why-text' }, v.why || q[v.pick] || '...'))) : null,
      mine && open === q.id ? voteBox(q) : null);
  }

  function draw() {
    fill(body, d.qs.length ? d.qs.map(card) : h('div', { class: 'wyr-empty' }, h('h3', {}, 'no questions yet')));
  }

  draw();
}
