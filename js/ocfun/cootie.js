// cootie catcher: the paper fortune teller. pick a color (it flaps once per letter), pick a number (it flaps that
// many times), pick a number again and that flap opens up to a fortune.
// saved in char.fun.cootie = { colors: [{ name, color }] x4, fortunes: [8 strings] }

import { h, fill, swatches } from '../ui.js';
import { appBar, nameOf } from './kit.js';

export const meta = { id: 'cootie', label: 'cootie catcher', icon: '1f4c4' };

const START_COLORS = [{ name: 'pink', color: '#ff4fa3' }, { name: 'purple', color: '#b18cff' }, { name: 'blue', color: '#6ec6ff' }, { name: 'yellow', color: '#ffd84d' }];
const START_FORTUNES = [
  'a vampire will ask you to the dance', 'you will find a lost diary', 'someone is writing about you right now', 'dye your hair tonight',
  'your crush likes you back', 'never trust the new kid', 'a band will name a song after you', 'you will become famous at midnight',
];
const COLORS = ['#ff4fa3', '#ff8ac4', '#b18cff', '#6ec6ff', '#7df9d0', '#9be564', '#ffd84d', '#ff8a3d', '#ff5d6c', '#1a1320'];
// which numbers show in the gap for each way it opens
const GAP = { ns: [1, 2, 3, 4], ew: [5, 6, 7, 8] };
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function render(el, ctx) {
  const { mine, save } = ctx;
  const d = ctx.data;
  if (!Array.isArray(d.colors) || d.colors.length !== 4) d.colors = structuredClone(START_COLORS);
  if (!Array.isArray(d.fortunes) || d.fortunes.length !== 8) d.fortunes = [...START_FORTUNES];

  let editing = false;
  let phase = 'color'; // color -> num1 -> num2 -> reveal
  let way = 'closed'; // closed | ns | ew
  let picked = null, busy = false, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const stopAll = () => { timers.forEach(clearTimeout); timers = []; };

  const editBtn = mine ? h('button', { class: 'btn ghost sm', onclick: () => { editing = !editing; editBtn.textContent = editing ? 'done' : 'edit'; reset(); } }, 'edit') : null;
  const body = h('div', { class: 'ctc' });
  el.append(appBar(ctx, meta, editBtn), body);

  function reset() { stopAll(); phase = 'color'; way = 'closed'; picked = null; busy = false; draw(); }

  // flap open/closed n times, ending open one way
  function flap(n, then) {
    busy = true;
    draw();
    const ms = calm() ? 0 : 300;
    let i = 0;
    const one = () => {
      way = way === 'ns' ? 'ew' : 'ns';
      setWay();
      i++;
      if (i < n) later(one, ms);
      else later(() => { busy = false; then(); }, ms);
    };
    later(one, calm() ? 0 : 120);
  }
  const setWay = () => {
    const cc = body.querySelector('.ctc-cc');
    if (cc) cc.dataset.way = way;
  };

  function pickColor(i) {
    if (phase !== 'color' || busy || editing) return;
    const letters = (d.colors[i].name || '').replace(/[^a-z0-9]/gi, '').length || 4;
    picked = { color: i, spelled: letters };
    flap(letters, () => { phase = 'num1'; draw(); });
  }
  function pickNumber(n) {
    if (busy || editing) return;
    if (phase === 'num1') { picked.first = n; flap(n, () => { phase = 'num2'; draw(); }); }
    else if (phase === 'num2') { picked.second = n; phase = 'reveal'; draw(); }
  }

  function catcher() {
    const quarters = d.colors.map((c, i) => h('button', {
      type: 'button', class: `ctc-q q${i}` + (picked?.color === i ? ' picked' : ''), style: { '--qc': c.color },
      disabled: phase !== 'color' || busy || editing, onclick: () => pickColor(i),
    }, h('span', { class: 'ctc-q-name' }, c.name || '...')));
    const nums = [...GAP.ns.map(n => ['ns', n]), ...GAP.ew.map(n => ['ew', n])].map(([w, n], j) => h('button', {
      type: 'button', class: `ctc-n ctc-n-${w} p${j % 4}`, dataset: { n },
      disabled: !(phase === 'num1' || phase === 'num2') || busy, onclick: () => pickNumber(n),
    }, String(n)));
    const cc = h('div', { class: 'ctc-cc', dataset: { way } },
      h('div', { class: 'ctc-inner' }, nums),
      h('div', { class: 'ctc-qs' }, quarters));
    return h('div', { class: 'ctc-stage' + (phase === 'num1' || phase === 'num2' ? ' picking' : '') }, cc);
  }

  function steps() {
    const list = [['color', 'color'], ['num1', 'number'], ['num2', 'number'], ['reveal', 'fortune']];
    const at = list.findIndex(s => s[0] === phase);
    return h('div', { class: 'ctc-steps' }, list.map(([, label], i) => h('span', { class: 'ctc-step' + (i === at ? ' on' : i < at ? ' done' : '') }, label)));
  }

  function reveal() {
    if (phase !== 'reveal') return null;
    const n = picked.second;
    const c = d.colors[picked.color];
    return h('div', { class: 'ctc-fortune', style: { '--qc': c.color } },
      h('div', { class: 'ctc-fortune-n' }, String(n)),
      h('div', { class: 'ctc-fortune-text' }, d.fortunes[n - 1] || '...'),
      h('div', { class: 'ctc-fortune-path' }, `${c.name || '?'} · ${picked.first} · ${n}`),
      h('button', { class: 'btn primary sm', onclick: reset }, 'again'));
  }

  function editor() {
    return h('div', { class: 'ctc-edit' },
      h('div', { class: 'ctc-edit-colors' }, d.colors.map((c, i) => h('div', { class: 'ctc-edit-color', style: { '--qc': c.color } },
        h('input', { type: 'text', value: c.name, maxLength: 14, placeholder: 'color', oninput: e => { c.name = e.target.value; save(); body.querySelector(`.q${i} .ctc-q-name`).textContent = c.name || '...'; } }),
        swatches(c.color, v => { c.color = v; save(); draw(); }, COLORS)))),
      h('div', { class: 'ctc-edit-fortunes' }, d.fortunes.map((f, i) => h('label', { class: 'ctc-edit-fortune' },
        h('span', {}, String(i + 1)),
        h('input', { type: 'text', value: f, maxLength: 90, placeholder: 'fortune', oninput: e => { d.fortunes[i] = e.target.value; save(); } })))));
  }

  function draw() {
    fill(body,
      h('div', { class: 'ctc-table' },
        h('div', { class: 'ctc-whose' }, nameOf(ctx.char)),
        editing ? null : steps(),
        catcher(),
        reveal()),
      editing ? editor() : null);
    setWay();
  }

  draw();
  return () => stopAll();
}
