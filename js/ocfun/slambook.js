// slam book: a 2000s slam book. one list of questions, and every oc in their world gets a page to answer them,
// each in their own handwriting + ink. flip through the pages.
// saved in char.fun.slambook = { title, cover, questions: [{ id, q }], pages: { [ocId]: { answers: { [qid]: text }, hand, ink } } }

import { h, fill, uid, swatches, confirmDialog } from '../ui.js';
import { appBar, portrait, nameOf, worldmates } from './kit.js';

export const meta = { id: 'slambook', label: 'slam book', icon: '1f4d2' };

const START_Q = ['name', 'nickname', 'fave color', 'fave band', 'fave food', 'crush?', 'best memory', 'worst habit', 'biggest fear', 'what do you think of me?', 'bff forever?', 'sign here'];
const HANDS = [
  { id: 'caveat', css: "'Caveat', cursive", size: 1.35 }, { id: 'indie', css: "'Indie Flower', cursive", size: 1.1 },
  { id: 'gloria', css: "'Gloria Hallelujah', cursive", size: 1 }, { id: 'shadows', css: "'Shadows Into Light', cursive", size: 1.15 },
  { id: 'patrick', css: "'Patrick Hand', cursive", size: 1.15 }, { id: 'reenie', css: "'Reenie Beanie', cursive", size: 1.45 },
  { id: 'apple', css: "'Homemade Apple', cursive", size: .9 }, { id: 'marker', css: "'Permanent Marker', cursive", size: 1 },
];
const INKS = ['#2346a8', '#1a1320', '#e0115f', '#8a4dff', '#0fa37f', '#f08a00', '#c2185b', '#00a3c4'];
const COVERS = ['#ff4fa3', '#1a1320', '#b18cff', '#6ec6ff', '#7df9d0', '#ffd84d'];

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.title ??= '';
  d.cover ||= COVERS[0];
  if (!Array.isArray(d.questions)) d.questions = START_Q.map(q => ({ id: 'q_' + uid(), q }));
  d.pages ||= {};

  const people = () => [char, ...worldmates(char.id)];
  const pageOf = p => {
    const i = people().indexOf(p);
    return d.pages[p.id] ||= { answers: {}, hand: HANDS[i % HANDS.length].id, ink: INKS[i % INKS.length] };
  };
  let at = -1; // -1 = the cover
  let writing = false, editQs = false, flip = '';

  const qBtn = mine ? h('button', { class: 'btn ghost sm', onclick: () => { editQs = !editQs; writing = false; draw(); } }, 'questions') : null;
  const body = h('div', { class: 'slb' });
  el.append(appBar(ctx, meta, qBtn), body);

  const goTo = (i, dir) => { at = i; writing = false; flip = dir; draw(); };

  function cover() {
    return h('div', { class: 'slb-cover', style: { '--cv': d.cover } },
      h('div', { class: 'slb-cover-stickers' }, ['✦', '♡', '☆', '✿', '♡', '✦'].map((s, i) => h('span', { class: 'slb-cs s' + i }, s))),
      mine ? h('input', { type: 'text', class: 'slb-cover-title', value: d.title, placeholder: 'slam book', maxLength: 40, oninput: e => { d.title = e.target.value; save(); } })
        : h('div', { class: 'slb-cover-title' }, d.title || 'slam book'),
      h('div', { class: 'slb-cover-owner' }, portrait(char, 'md'), h('span', {}, nameOf(char) + "'s")),
      h('div', { class: 'slb-cover-faces' }, people().slice(1, 8).map(p => portrait(p, 'sm'))),
      mine ? swatches(d.cover, c => { d.cover = c; save(); draw(); }, COVERS) : null,
      h('button', { class: 'btn primary sm', onclick: () => goTo(0, 'next') }, 'open'));
  }

  function page(p) {
    const pg = pageOf(p);
    const hand = HANDS.find(x => x.id === pg.hand) || HANDS[0];
    const rows = d.questions.map((q, i) => h('div', { class: 'slb-row' },
      h('div', { class: 'slb-q' }, h('span', { class: 'slb-qn' }, i + 1 + '.'), q.q || '?'),
      writing
        ? h('input', { type: 'text', class: 'slb-a', value: pg.answers[q.id] || '', maxLength: 140, oninput: e => { pg.answers[q.id] = e.target.value; save(); } })
        : h('div', { class: 'slb-a' }, pg.answers[q.id] || '')));
    return h('div', { class: 'slb-page' + (flip ? ' flip-' + flip : ''), style: { '--hand': hand.css, '--hs': hand.size, '--ink': pg.ink, '--c': p.color } },
      h('div', { class: 'slb-page-head' },
        h('a', { class: 'slb-who', href: ctx.ocLink(p) }, portrait(p, 'md'), h('span', {}, nameOf(p))),
        h('span', { class: 'slb-pnum' }, `${at + 1} / ${people().length}`)),
      mine && writing ? h('div', { class: 'slb-pens' },
        h('div', { class: 'slb-hands' }, HANDS.map(x => h('button', { type: 'button', class: 'slb-hand' + (x.id === pg.hand ? ' on' : ''), style: { fontFamily: x.css }, onclick: () => { pg.hand = x.id; save(); draw(); } }, 'abc'))),
        swatches(pg.ink, c => { pg.ink = c; save(); draw(); }, INKS)) : null,
      h('div', { class: 'slb-rows' }, rows),
      h('div', { class: 'slb-doodle d' + (at % 4) }));
  }

  function questionsEditor() {
    const list = h('div', { class: 'slb-qedit' });
    const drawList = () => fill(list, d.questions.map((q, i) => h('div', { class: 'slb-qedit-row' },
      h('span', { class: 'slb-qn' }, i + 1 + '.'),
      h('input', { type: 'text', value: q.q, maxLength: 80, placeholder: 'question', oninput: e => { q.q = e.target.value; save(); } }),
      h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => { d.questions.splice(i - 1, 0, d.questions.splice(i, 1)[0]); save(); drawList(); } }, '↑'),
      h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: async () => {
        if (!await confirmDialog('remove this question and everyone\'s answers to it?', { okLabel: 'remove', danger: true })) return;
        d.questions = d.questions.filter(x => x !== q);
        for (const pg of Object.values(d.pages)) delete pg.answers[q.id];
        save(); drawList();
      } }, '✕')))
    );
    drawList();
    return h('div', { class: 'slb-qbox' }, list,
      h('button', { class: 'btn ghost sm', onclick: () => { d.questions.push({ id: 'q_' + uid(), q: '' }); save(); drawList(); list.querySelector('.slb-qedit-row:last-child input')?.focus(); } }, '+ question'));
  }

  function draw() {
    const ps = people();
    if (at >= ps.length) at = ps.length - 1;
    const p = at >= 0 ? ps[at] : null;
    fill(body,
      editQs ? questionsEditor() : null,
      h('div', { class: 'slb-book' },
        h('div', { class: 'slb-spine' }),
        p ? page(p) : cover()),
      h('div', { class: 'slb-nav' },
        h('button', { class: 'btn ghost sm', disabled: at < 0, onclick: () => goTo(at - 1, 'back') }, '‹ back'),
        p && mine ? h('button', { class: 'btn sm ' + (writing ? 'primary' : 'ghost'), onclick: () => { writing = !writing; flip = ''; draw(); } }, writing ? 'done' : 'write') : null,
        h('div', { class: 'slb-tabs' }, ps.map((o, i) => h('button', { type: 'button', class: 'slb-tab' + (i === at ? ' on' : ''), style: { '--c': o.color }, title: nameOf(o), onclick: () => goTo(i, i > at ? 'next' : 'back') }, portrait(o, 'xs')))),
        h('button', { class: 'btn ghost sm', disabled: at >= ps.length - 1, onclick: () => goTo(at + 1, 'next') }, 'next ›')));
    flip = '';
  }

  draw();
}
