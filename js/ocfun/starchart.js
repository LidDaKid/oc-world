// star chart: sun, moon + rising sign on a gold zodiac wheel in a night sky, what each sign means
// (element, modality, dates), and how the oc matches up with everyone in their world.
// saved in char.fun.starchart = { sun, moon, rising, others: { ocId: sign } }   (signs are ids like 'libra')

import { h, s, fill } from '../ui.js';
import { appBar, portrait, nameOf, worldmates } from './kit.js';

export const meta = { id: 'starchart', label: 'star chart', icon: '1f52e' };

const T = '︎'; // keep the glyphs as text, not emoji
export const SIGNS = [
  ['aries', '♈', 'fire', 'cardinal', 'mar 21 – apr 19'], ['taurus', '♉', 'earth', 'fixed', 'apr 20 – may 20'],
  ['gemini', '♊', 'air', 'mutable', 'may 21 – jun 20'], ['cancer', '♋', 'water', 'cardinal', 'jun 21 – jul 22'],
  ['leo', '♌', 'fire', 'fixed', 'jul 23 – aug 22'], ['virgo', '♍', 'earth', 'mutable', 'aug 23 – sep 22'],
  ['libra', '♎', 'air', 'cardinal', 'sep 23 – oct 22'], ['scorpio', '♏', 'water', 'fixed', 'oct 23 – nov 21'],
  ['sagittarius', '♐', 'fire', 'mutable', 'nov 22 – dec 21'], ['capricorn', '♑', 'earth', 'cardinal', 'dec 22 – jan 19'],
  ['aquarius', '♒', 'air', 'fixed', 'jan 20 – feb 18'], ['pisces', '♓', 'water', 'mutable', 'feb 19 – mar 20'],
].map(([id, glyph, element, mode, dates]) => ({ id, glyph: glyph + T, element, mode, dates }));
const sign = id => SIGNS.find(x => x.id === id) || null;
const ELEMENT_COLOR = { fire: '#ff6b6b', earth: '#9be564', air: '#6ec6ff', water: '#b18cff' };
const ELEMENT_WORD = { fire: 'bold + loud', earth: 'grounded + loyal', air: 'chatty + curious', water: 'deep + feely' };
const PLACES = [['sun', '☉'], ['moon', '☽'], ['rising', 'AC']];

function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
// how two signs get along: elements first, then a little wiggle so every pair isn't identical
export function compat(a, b, key = '') {
  const A = sign(a), B = sign(b);
  if (!A || !B) return null;
  let base;
  if (a === b) base = 84;
  else if (A.element === B.element) base = 88;
  else {
    const pair = [A.element, B.element].sort().join('+');
    base = { 'air+fire': 82, 'earth+water': 80, 'earth+fire': 50, 'air+water': 52, 'fire+water': 40, 'air+earth': 44 }[pair];
  }
  const opposite = Math.abs(SIGNS.indexOf(A) - SIGNS.indexOf(B)) === 6;
  if (opposite) base = 74; // opposites attract
  const pct = Math.max(5, Math.min(99, base + (hash(key) % 11) - 5));
  const word = pct >= 85 ? 'cosmic soulmates' : pct >= 72 ? 'stars aligned' : pct >= 58 ? 'it could work' : pct >= 45 ? 'mercury in retrograde' : 'written in different stars';
  return { pct, word };
}

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.others ||= {};

  const wheelBox = h('div', { class: 'sc-wheel-box' });
  const picks = h('div', { class: 'sc-picks' });
  const info = h('div', { class: 'sc-info' });
  const matches = h('div', { class: 'sc-matches' });

  function wheel() {
    const R = 150, C = 160;
    const pt = (r, deg) => [C + r * Math.cos((deg - 90) * Math.PI / 180), C + r * Math.sin((deg - 90) * Math.PI / 180)];
    const slice = (i, r1, r2) => {
      const a0 = i * 30, a1 = a0 + 30;
      const [x0, y0] = pt(r2, a0), [x1, y1] = pt(r2, a1), [x2, y2] = pt(r1, a1), [x3, y3] = pt(r1, a0);
      return `M${x0} ${y0}A${r2} ${r2} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 0 0 ${x3} ${y3}Z`;
    };
    const chosen = PLACES.map(([key, sym]) => ({ key, sym, i: SIGNS.findIndex(x => x.id === d[key]) })).filter(p => p.i >= 0);
    // two placements in one sign sit side by side
    const marks = chosen.map(p => {
      const same = chosen.filter(q => q.i === p.i);
      const off = same.length > 1 ? (same.indexOf(p) - (same.length - 1) / 2) * 9 : 0;
      const [x, y] = pt(88, p.i * 30 + 15 + off);
      return { ...p, x, y };
    });
    const svg = s('svg', { class: 'sc-wheel', viewBox: '0 0 320 320' },
      s('defs', {}, s('radialGradient', { id: 'sc-glow' }, s('stop', { offset: '0', 'stop-color': '#ffe9a8', 'stop-opacity': '.55' }), s('stop', { offset: '1', 'stop-color': '#ffe9a8', 'stop-opacity': '0' }))),
      s('circle', { cx: C, cy: C, r: R + 6, class: 'sc-halo' }),
      SIGNS.map((x, i) => s('path', { d: slice(i, 112, R), class: 'sc-slice', fill: ELEMENT_COLOR[x.element], 'fill-opacity': chosen.some(p => p.i === i) ? .42 : .1 })),
      s('circle', { cx: C, cy: C, r: R, class: 'sc-ring' }),
      s('circle', { cx: C, cy: C, r: 112, class: 'sc-ring' }),
      s('circle', { cx: C, cy: C, r: 62, class: 'sc-ring thin' }),
      SIGNS.map((x, i) => { const [x1, y1] = pt(62, i * 30), [x2, y2] = pt(R, i * 30); return s('line', { x1, y1, x2, y2, class: 'sc-spoke' }); }),
      SIGNS.map((x, i) => { const [gx, gy] = pt(131, i * 30 + 15); return s('text', { x: gx, y: gy, class: 'sc-glyph' + (chosen.some(p => p.i === i) ? ' on' : '') }, x.glyph); }),
      Array.from({ length: 72 }, (_, i) => { const [x1, y1] = pt(R, i * 5), [x2, y2] = pt(R - (i % 6 ? 4 : 8), i * 5); return s('line', { x1, y1, x2, y2, class: 'sc-tick' }); }),
      marks.length > 1 ? s('polygon', { points: marks.map(m => `${m.x},${m.y}`).join(' '), class: 'sc-tri' }) : null,
      marks.map(m => s('g', { class: 'sc-mark sc-' + m.key },
        s('circle', { cx: m.x, cy: m.y, r: 17, fill: 'url(#sc-glow)' }),
        s('circle', { cx: m.x, cy: m.y, r: 10.5, class: 'sc-dot' }),
        s('text', { x: m.x, y: m.y, class: 'sc-sym' }, m.sym))));
    fill(wheelBox, svg, h('div', { class: 'sc-center' }, portrait(char, 'sc-pfp')));
  }

  function drawPicks() {
    fill(picks, PLACES.map(([key, sym]) => h('div', { class: 'sc-pick-row' },
      h('div', { class: 'sc-pick-label' }, h('span', { class: 'sc-pick-sym' }, sym), key),
      h('div', { class: 'sc-signs' }, SIGNS.map(x => h('button', {
        type: 'button', class: 'sc-sign' + (d[key] === x.id ? ' on' : ''), title: x.id, disabled: !mine,
        style: { '--el': ELEMENT_COLOR[x.element] },
        onclick: () => { d[key] = d[key] === x.id ? null : x.id; save(); draw(); },
      }, x.glyph))))));
  }

  function drawInfo() {
    const cards = PLACES.map(([key, sym]) => [key, sym, sign(d[key])]).filter(c => c[2]);
    fill(info, cards.map(([key, sym, x]) => h('div', { class: 'sc-card', style: { '--el': ELEMENT_COLOR[x.element] } },
      h('div', { class: 'sc-card-glyph' }, x.glyph),
      h('div', { class: 'sc-card-text' },
        h('div', { class: 'sc-card-place' }, sym + ' ' + key),
        h('div', { class: 'sc-card-sign' }, x.id),
        h('div', { class: 'sc-card-tags' }, h('span', {}, x.element), h('span', {}, x.mode), h('span', {}, ELEMENT_WORD[x.element])),
        h('div', { class: 'sc-card-dates' }, x.dates)))));
  }

  function drawMatches() {
    const mates = worldmates(char.id);
    if (!d.sun || !mates.length) { fill(matches); matches.hidden = true; return; }
    matches.hidden = false;
    fill(matches, h('h3', { class: 'sc-h' }, 'compatibility'), h('div', { class: 'sc-match-list' }, mates.map(m => {
      const theirs = m.fun?.starchart?.sun || null;
      const theirSign = theirs || d.others[m.id] || null;
      const c = compat(d.sun, theirSign, [char.id, m.id].sort().join('|'));
      const pickSel = theirs ? h('span', { class: 'sc-their', title: theirs }, sign(theirs).glyph, ' ', theirs)
        : h('select', { class: 'sc-their-pick', disabled: !mine, onchange: e => { d.others[m.id] = e.target.value || null; save(); drawMatches(); } },
          h('option', { value: '' }, '?'), SIGNS.map(x => h('option', { value: x.id, selected: x.id === theirSign }, x.glyph + ' ' + x.id)));
      return h('div', { class: 'sc-match' },
        h('a', { class: 'sc-match-who', href: ctx.ocLink(m) }, portrait(m, 'sm'), h('span', {}, nameOf(m))),
        pickSel,
        c ? h('div', { class: 'sc-meter' }, h('div', { class: 'sc-meter-bar' }, h('i', { style: { width: c.pct + '%' } })), h('b', {}, c.pct + '%'), h('span', { class: 'sc-word' }, c.word))
          : h('div', { class: 'sc-meter sc-none' }));
    })));
  }

  function draw() { wheel(); drawPicks(); drawInfo(); drawMatches(); }

  el.append(appBar(ctx, meta),
    h('div', { class: 'sc-sky' },
      h('div', { class: 'sc-top' }, wheelBox, h('div', { class: 'sc-side' }, picks, info)),
      matches));
  draw();
}
