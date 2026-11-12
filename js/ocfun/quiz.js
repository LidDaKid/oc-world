// quiz maker: "which oc are you?" quizzes like the ones in 2000s magazines. every answer points at one oc
// (this one or someone in their world); play it and the oc you picked the most is your result.
// saved in char.fun.quiz = { quizzes: [{ id, title, color, questions: [{ id, q, answers: [{ id, text, oc }] }] }] }

import { h, fill, uid, swatches, confirmDialog } from '../ui.js';
import { appBar, sticker, portrait, nameOf, worldmates, ocById } from './kit.js';

export const meta = { id: 'quiz', label: 'quiz maker', icon: '2753' };

const COLORS = ['#ff4fa3', '#b18cff', '#6ec6ff', '#7df9d0', '#ffd84d', '#ff5d6c', '#1a1320'];

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.quizzes ||= [];
  let view = 'list', current = null;
  const body = h('div', { class: 'qz-body' });
  const people = () => [char, ...worldmates(char.id)];

  const go = (v, q = current) => { view = v; current = q; draw(); };

  function newQuiz() {
    const q = { id: 'qz_' + uid(), title: '', color: COLORS[d.quizzes.length % COLORS.length], questions: [blankQuestion()] };
    d.quizzes.push(q);
    save();
    go('edit', q);
  }
  function blankQuestion() {
    const ps = people();
    return { id: uid(), q: '', answers: ps.slice(0, Math.max(2, Math.min(4, ps.length))).map((p, i) => ({ id: uid(), text: '', oc: ps[i % ps.length].id })) };
  }

  // ---- all the quizzes ----
  function list() {
    if (!d.quizzes.length) {
      return h('div', { class: 'qz-empty' }, sticker('2753', 'qz-empty-stk'), h('h3', {}, 'no quizzes yet'),
        mine ? h('button', { class: 'btn primary sm', onclick: newQuiz }, '+ quiz') : null);
    }
    return h('div', { class: 'qz-grid' }, d.quizzes.map(q => h('div', { class: 'qz-cover', style: { '--qc': q.color } },
      h('div', { class: 'qz-cover-top' }, h('span', { class: 'qz-kicker' }, 'quiz'), h('span', { class: 'qz-count' }, q.questions.length + 'q')),
      h('div', { class: 'qz-cover-title' }, q.title || 'which oc are you?'),
      h('div', { class: 'qz-cover-faces' }, [...new Set(q.questions.flatMap(x => x.answers.map(a => a.oc)))].map(ocById).filter(Boolean).slice(0, 5).map(o => portrait(o, 'sm'))),
      h('div', { class: 'qz-cover-btns' },
        h('button', { class: 'btn primary sm', disabled: !playable(q), onclick: () => go('play', q) }, 'take it'),
        mine ? h('button', { class: 'btn ghost sm', onclick: () => go('edit', q) }, 'edit') : null))),
      mine ? h('button', { class: 'qz-cover qz-new', onclick: newQuiz }, h('span', {}, '+'), 'new quiz') : null);
  }
  const playable = q => q.questions.some(x => x.answers.some(a => a.text.trim() && ocById(a.oc)));

  // ---- making one ----
  function edit(q) {
    const qs = h('div', { class: 'qz-qs' });
    const ocPick = a => h('select', { class: 'qz-oc', onchange: e => { a.oc = e.target.value; save(); } },
      people().map(p => h('option', { value: p.id, selected: p.id === a.oc }, nameOf(p))));
    const drawQs = () => fill(qs, q.questions.map((x, i) => h('div', { class: 'qz-q-edit' },
      h('div', { class: 'qz-q-head' },
        h('span', { class: 'qz-num' }, String(i + 1)),
        h('input', { type: 'text', class: 'qz-q-input', value: x.q, placeholder: 'question', maxLength: 140, oninput: e => { x.q = e.target.value; save(); } }),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: async () => {
          if (q.questions.length > 1 && (x.q || x.answers.some(a => a.text)) && !await confirmDialog('remove this question?', { okLabel: 'remove', danger: true })) return;
          q.questions = q.questions.filter(y => y !== x); if (!q.questions.length) q.questions.push(blankQuestion()); save(); drawQs();
        } }, '✕')),
      h('div', { class: 'qz-answers-edit' }, x.answers.map((a, j) => h('div', { class: 'qz-a-edit' },
        h('span', { class: 'qz-letter' }, 'abcdefgh'[j]),
        h('input', { type: 'text', value: a.text, placeholder: 'answer', maxLength: 100, oninput: e => { a.text = e.target.value; save(); } }),
        h('span', { class: 'qz-arrow' }, '→'),
        ocPick(a),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', disabled: x.answers.length < 2, onclick: () => { x.answers = x.answers.filter(y => y !== a); save(); drawQs(); } }, '✕'))),
        x.answers.length < 8 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { x.answers.push({ id: uid(), text: '', oc: char.id }); save(); drawQs(); } }, '+ answer') : null))));
    drawQs();
    return h('div', { class: 'qz-edit', style: { '--qc': q.color } },
      h('div', { class: 'qz-edit-top' },
        h('input', { type: 'text', class: 'qz-title-input', value: q.title, placeholder: 'which oc are you?', maxLength: 80, oninput: e => { q.title = e.target.value; save(); } }),
        swatches(q.color, c => { q.color = c; save(); el.querySelector('.qz-edit').style.setProperty('--qc', c); }, COLORS)),
      qs,
      h('div', { class: 'qz-edit-btns' },
        h('button', { class: 'btn ghost sm', onclick: () => { q.questions.push(blankQuestion()); save(); drawQs(); } }, '+ question'),
        h('span', { class: 'qz-gap' }),
        h('button', { class: 'btn ghost sm danger', onclick: async () => {
          if (!await confirmDialog(`delete "${q.title || 'this quiz'}"?`, { okLabel: 'delete', danger: true })) return;
          d.quizzes = d.quizzes.filter(y => y !== q); save(); go('list', null);
        } }, 'delete'),
        h('button', { class: 'btn ghost sm', disabled: !playable(q), onclick: () => go('play', q) }, 'try it'),
        h('button', { class: 'btn primary sm', onclick: () => go('list', null) }, 'done')));
  }

  // ---- taking one ----
  function play(q) {
    const questions = q.questions.filter(x => x.answers.some(a => a.text.trim() && ocById(a.oc)));
    const tally = {};
    let at = 0;
    const box = h('div', { class: 'qz-play', style: { '--qc': q.color } });
    const step = () => {
      if (at >= questions.length) return result();
      const x = questions[at];
      fill(box,
        h('div', { class: 'qz-play-title' }, q.title || 'which oc are you?'),
        h('div', { class: 'qz-dots' }, questions.map((_, i) => h('i', { class: i < at ? 'done' : i === at ? 'now' : '' }))),
        h('div', { class: 'qz-q' }, h('span', { class: 'qz-qnum' }, (at + 1) + '.'), x.q || '...'),
        h('div', { class: 'qz-answers' }, x.answers.filter(a => a.text.trim() && ocById(a.oc)).map((a, j) => h('button', {
          type: 'button', class: 'qz-answer',
          onclick: () => { tally[a.oc] = (tally[a.oc] || 0) + 1; at++; step(); },
        }, h('span', { class: 'qz-letter' }, 'abcdefgh'[j]), a.text))));
    };
    const result = () => {
      const best = Math.max(...Object.values(tally));
      const top = Object.keys(tally).filter(id => tally[id] === best);
      const oc = ocById(top[Math.floor(Math.random() * top.length)]);
      fill(box,
        h('div', { class: 'qz-result' },
          h('div', { class: 'qz-result-kicker' }, 'you got'),
          h('a', { class: 'qz-result-pic', href: ctx.ocLink(oc), style: { '--c': oc.color } }, portrait(oc, 'qz-big')),
          h('div', { class: 'qz-result-name' }, nameOf(oc)),
          oc.tagline ? h('div', { class: 'qz-result-tag' }, oc.tagline) : null,
          h('div', { class: 'qz-result-btns' },
            h('button', { class: 'btn primary sm', onclick: () => go('play', q) }, 'again'),
            h('button', { class: 'btn ghost sm', onclick: () => go('list', null) }, 'all quizzes'))));
    };
    step();
    return box;
  }

  function draw() {
    fill(body, view === 'edit' && current && mine ? edit(current) : view === 'play' && current ? play(current) : list());
  }
  el.append(appBar(ctx, meta), body);
  draw();
}
