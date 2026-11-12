// magic 8 ball: ask it something, shake it, and an answer floats up in the little window. the answers are the oc's
// own (in their voice); with none written it uses the classic twenty.
// saved in char.fun.eightball = { answers: [strings], history: [{ id, q, a, at }] }

import { h, fill, uid } from '../ui.js';
import { appBar, portrait, nameOf, fmtDate } from './kit.js';

export const meta = { id: 'eightball', label: 'magic 8 ball', icon: '1f3b1' };

const CLASSIC = [
  'it is certain', 'it is decidedly so', 'without a doubt', 'yes definitely', 'you may rely on it', 'as i see it, yes', 'most likely', 'outlook good',
  'yes', 'signs point to yes', 'reply hazy, try again', 'ask again later', 'better not tell you now', 'cannot predict now', 'concentrate and ask again',
  "don't count on it", 'my reply is no', 'my sources say no', 'outlook not so good', 'very doubtful',
];
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  if (!Array.isArray(d.answers)) d.answers = [];
  d.history ||= [];
  let editing = false, shaking = false, shown = null, timer = null;
  const pool = () => { const own = d.answers.map(a => a.trim()).filter(Boolean); return own.length ? own : CLASSIC; };

  const editBtn = mine ? h('button', { class: 'btn ghost sm', onclick: () => { editing = !editing; editBtn.textContent = editing ? 'done' : 'answers'; draw(); } }, 'answers') : null;
  const body = h('div', { class: 'e8b' });
  el.append(appBar(ctx, meta, editBtn), body);

  const ask = h('input', { type: 'text', class: 'e8b-ask', maxLength: 120, placeholder: 'ask a question', onkeydown: e => { if (e.key === 'Enter') shake(); } });

  function shake() {
    if (shaking) return;
    const q = ask.value.trim();
    shaking = true;
    shown = null;
    draw();
    const ball = body.querySelector('.e8b-ball');
    ball.classList.add('shaking');
    timer = setTimeout(() => {
      shaking = false;
      const list = pool();
      shown = list[Math.floor(Math.random() * list.length)];
      if (q && mine) {
        d.history.unshift({ id: 'e8_' + uid(), q, a: shown, at: Date.now() });
        d.history = d.history.slice(0, 30);
        save();
      }
      ask.value = '';
      draw();
    }, calm() ? 50 : 1100);
  }

  function ball() {
    return h('button', { type: 'button', class: 'e8b-ball' + (shaking ? ' shaking' : ''), title: 'shake', onclick: shake },
      h('span', { class: 'e8b-shine' }),
      h('span', { class: 'e8b-window' },
        shown ? h('span', { class: 'e8b-tri' }, h('span', { class: 'e8b-answer' }, shown)) : h('span', { class: 'e8b-eight' }, '8')));
  }

  function editor() {
    const area = h('textarea', { class: 'e8b-edit', rows: 10, placeholder: CLASSIC.slice(0, 5).join('\n'), value: d.answers.join('\n'),
      oninput: e => { d.answers = e.target.value.split('\n').map(s => s.slice(0, 60)); save(); } });
    return h('div', { class: 'e8b-editbox' }, area);
  }

  function history() {
    if (!d.history.length) return null;
    return h('div', { class: 'e8b-history' }, d.history.map(x => h('div', { class: 'e8b-h' },
      h('div', { class: 'e8b-hq' }, x.q),
      h('div', { class: 'e8b-ha' }, portrait(char, 'xs'), h('span', {}, x.a)),
      h('div', { class: 'e8b-hd' }, fmtDate(x.at),
        mine ? h('button', { type: 'button', class: 'e8b-x', title: 'remove', onclick: () => { d.history = d.history.filter(y => y !== x); save(); draw(); } }, '✕') : null))));
  }

  function draw() {
    fill(body,
      h('div', { class: 'e8b-table' },
        h('div', { class: 'e8b-name' }, nameOf(char)),
        ball(),
        h('div', { class: 'e8b-row' }, ask, h('button', { class: 'btn primary', disabled: shaking, onclick: shake }, 'shake'))),
      editing ? editor() : null,
      history());
  }

  draw();
  return () => clearTimeout(timer);
}
