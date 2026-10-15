// ship-o-meter: pick two ocs, the meter goes wild and lands on how compatible they are (always the same for the same two),
// with a ship name, a tier, and a ship list + a chart of every pair in a world.
// saved in char.fun.ships = { list: [{ id, a, b, name, at }] }

import { h, s, fill, uid, toast } from '../ui.js';
import { store } from '../store.js';
import { seenFrom } from '../rels.js';
import { appBar, sticker, dataFor, ocSelect, ocById, portrait, nameOf, fmtDate } from './kit.js';

export const meta = { id: 'ships', label: 'ship-o-meter', icon: '1f498' };

// ---- the math ----
function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}

const KINDS = [
  ['romance', /dating|married|partner|soulmate|girlfriend|boyfriend|wife|husband|lover|engaged|spouse|fianc|together/],
  ['family', /sibling|twin|parent|kid|cousin|family|sister|brother|\bmom\b|\bdad\b|mother|father|aunt|uncle|daughter|\bson\b/],
  ['crush', /crush|in love|simp|admire/],
  ['enemy', /enem|rival|nemesis|hate|arch/],
  ['ex', /^ex\b|\bex\b|former/],
  ['complicated', /complicated|situationship/],
  ['friend', /bestie|friend|bff|bandmate|roommate/],
];

const TIERS = [
  [0, 'absolutely not', '1f480'],
  [20, 'awkward silence', '1f62c'],
  [35, 'just friends', '1f91d'],
  [50, 'situationship', '1f914'],
  [65, 'lowkey cute', '1f97a'],
  [78, 'certified ship', '1f496'],
  [90, 'soulmates', '1f48d'],
  [98, 'written in the stars', '1f31f'],
];

// how two ocs score. same two ocs = same answer every time.
export function shipScore(aId, bId) {
  if (aId === bId) return { pct: 100, label: 'self love', icon: '1f485', flavor: 'main character energy', kind: 'self' };
  const key = [aId, bId].sort().join('|');
  const n = hash(key);
  let pct = 8 + (n % 88);
  const rels = store.rels.filter(r => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId));
  const words = rels.flatMap(r => { const v = seenFrom(r, aId); return [v.theyAre, v.iAm, r.label, r.back]; }).filter(Boolean).join(' ').toLowerCase();
  const kind = (KINDS.find(([, re]) => re.test(words)) || [null])[0];
  let flavor = null;
  const r2 = (n >>> 8) % 100;
  if (kind === 'romance') { pct = 90 + (r2 % 10); flavor = 'already a thing'; }
  else if (kind === 'crush') { pct = Math.max(pct, 72 + (r2 % 22)); flavor = 'someone has a crush'; }
  else if (kind === 'enemy') { pct = 45 + (r2 % 50); flavor = 'enemies to lovers?'; }
  else if (kind === 'ex') { pct = 25 + (r2 % 55); flavor = 'the ex files'; }
  else if (kind === 'complicated') { pct = 50 + (r2 % 30); flavor = "it's complicated"; }
  else if (kind === 'friend') { pct = Math.min(97, pct + 15); flavor = 'besties... or more?'; }
  else if (kind === 'family') { flavor = 'family = platonic only'; }
  const tier = kind === 'family' ? [0, 'platonic soulmates', '1faf6'] : [...TIERS].reverse().find(t => pct >= t[0]);
  return { pct, label: tier[1], icon: kind === 'enemy' && pct < 78 ? '2694-fe0f' : tier[2], flavor, kind };
}

// ship names: a few ways to squish two names together
const VOWELS = /[aeiouy]/i;
const firstName = c => (nameOf(c).trim().split(/\s+/)[0] || 'oc').replace(/[^\p{L}\p{N}'-]/gu, '') || 'oc';
function frontOf(w) {
  const m = w.match(/^[^aeiouy]*[aeiouy]+[^aeiouy]?/i);
  return m && m[0].length < w.length ? m[0] : w.slice(0, Math.ceil(w.length / 2));
}
function backOf(w) {
  const i = w.slice(1).search(VOWELS);
  return i >= 0 && w.length > 3 ? w.slice(i + 1) : w.slice(Math.floor(w.length / 2));
}
export function shipNames(a, b) {
  const A = firstName(a), B = firstName(b);
  const cap = x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
  if (a === b || A === B) return [cap(A) + cap(A), 'self love', cap(A) + 'x2'];
  const out = [
    frontOf(A) + backOf(B).toLowerCase(),
    frontOf(B) + backOf(A).toLowerCase(),
    A.slice(0, Math.ceil(A.length / 2)) + B.slice(Math.floor(B.length / 2)).toLowerCase(),
    B.slice(0, Math.ceil(B.length / 2)) + A.slice(Math.floor(A.length / 2)).toLowerCase(),
    frontOf(A) + B.toLowerCase(),
  ].map(cap);
  out.push(`${cap(A)} × ${cap(B)}`);
  return [...new Set(out)].filter(x => x.length >= 3).slice(0, 6);
}

const pairKey = (a, b) => [a, b].sort().join('|');
// cold blue → purple → hot pink → red
export const heatColor = pct => `hsl(${pct < 50 ? 225 + pct * 1.6 : 305 + (pct - 50) * 1.1} ${55 + pct * .35}% ${pct < 50 ? 58 : 60 - (pct - 50) * .12}%)`;

// ---- the meter's pieces ----
function gauge() {
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (1 - i / 20);
    const r1 = i % 5 ? 84 : 78, r2 = 92;
    ticks.push(s('line', { x1: 110 + Math.cos(a) * r1, y1: 110 - Math.sin(a) * r1, x2: 110 + Math.cos(a) * r2, y2: 110 - Math.sin(a) * r2, class: 'sh-tick' + (i % 5 ? '' : ' big') }));
  }
  const needle = s('g', { class: 'sh-needle' },
    s('path', { d: 'M110 22 L116 110 L104 110 Z', class: 'sh-needle-body' }),
    s('circle', { cx: 110, cy: 110, r: 11, class: 'sh-needle-cap' }));
  const svg = s('svg', { viewBox: '0 0 220 124', class: 'sh-gauge-svg' },
    s('defs', {},
      s('linearGradient', { id: 'sh-arc', x1: 0, x2: 1, y1: 0, y2: 0 },
        s('stop', { offset: '0', 'stop-color': '#5b8def' }), s('stop', { offset: '.4', 'stop-color': '#b18cff' }),
        s('stop', { offset: '.72', 'stop-color': '#ff4fa3' }), s('stop', { offset: '1', 'stop-color': '#ff2d55' }))),
    s('path', { d: 'M18 110 A92 92 0 0 1 202 110', class: 'sh-arc-bg' }),
    s('path', { d: 'M18 110 A92 92 0 0 1 202 110', class: 'sh-arc', stroke: 'url(#sh-arc)' }),
    ticks,
    s('text', { x: 14, y: 123, class: 'sh-gauge-end' }, '0'),
    s('text', { x: 196, y: 123, class: 'sh-gauge-end' }, '100'),
    needle);
  return { el: h('div', { class: 'sh-gauge' }, svg), needle };
}

function fillHeart() {
  const id = 'shh' + uid();
  const path = 'M50 88 C20 66 4 50 4 30 C4 15 16 5 29 5 C38 5 45 10 50 18 C55 10 62 5 71 5 C84 5 96 15 96 30 C96 50 80 66 50 88 Z';
  const level = s('g', { class: 'sh-heart-level' },
    s('path', { class: 'sh-wave', d: 'M-20 6 Q 0 0 20 6 T 60 6 T 100 6 T 140 6 V 120 H -20 Z' }),
    s('path', { class: 'sh-wave b', d: 'M-20 6 Q 0 12 20 6 T 60 6 T 100 6 T 140 6 V 120 H -20 Z' }));
  const svg = s('svg', { viewBox: '0 0 100 92', class: 'sh-heart-svg' },
    s('defs', {}, s('clipPath', { id }, s('path', { d: path }))),
    s('path', { d: path, class: 'sh-heart-bg' }),
    s('g', { 'clip-path': `url(#${id})` }, level),
    s('path', { d: path, class: 'sh-heart-line' }),
    s('ellipse', { cx: 30, cy: 24, rx: 12, ry: 7, class: 'sh-heart-gloss', transform: 'rotate(-30 30 24)' }));
  const num = h('div', { class: 'sh-heart-num' });
  const el = h('div', { class: 'sh-heart' }, svg, num);
  el.set = (pct, text) => {
    level.setAttribute('transform', `translate(0 ${88 - pct * .86})`);
    num.textContent = text ?? Math.round(pct) + '%';
  };
  el.set(0, '?');
  return el;
}

function burst(host, icons, n = 36) {
  const box = h('div', { class: 'sh-burst' });
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 220;
    box.append(h('img', {
      class: 'sh-bit', src: `stickers/${icons[i % icons.length]}.webp`, alt: '',
      style: {
        '--dx': Math.cos(ang) * dist + 'px', '--dy': Math.sin(ang) * dist * .7 - 60 + 'px', '--rot': (Math.random() * 720 - 360) + 'deg',
        '--sz': 20 + Math.random() * 22 + 'px', animationDelay: Math.random() * .15 + 's',
      },
    }));
  }
  host.append(box);
  setTimeout(() => box.remove(), 2600);
}

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'ships', { list: [] });
  data.list = (data.list || []).filter(x => ocById(x.a) && ocById(x.b));
  let mode = 'meter';
  let A = char.id;
  const rank = o => { const sc = shipScore(char.id, o.id); return sc.pct + (sc.kind === 'romance' || sc.kind === 'crush' ? 200 : sc.kind === 'family' ? -200 : 0); };
  const firstOther = () => {
    // the oc they're closest to (their highest scoring relationship) goes first
    const rel = store.relsOf(char.id).map(r => seenFrom(r, char.id).other).filter(Boolean)
      .sort((x, y) => rank(y) - rank(x))[0];
    const world = ctx.world || store.worldsOf(char.id)[0];
    return rel?.id || (world ? store.cast(world).find(c => c.id !== char.id)?.id : null) || store.chars.find(c => c.id !== char.id)?.id || null;
  };
  let B = firstOther();
  let result = null; // { a, b, score, names, name }
  let raf = 0, timers = [];
  let chartWorld = ctx.world?.id || store.worldsOf(char.id)[0]?.id || '';

  const body = h('div', { class: 'sh-body' });
  const modes = h('div', { class: 'sh-modes' });
  function drawModes() {
    fill(modes, [['meter', 'meter', '1f498'], ['list', 'ship list', '1f4dd'], ['chart', 'ship chart', '1f4ca']].map(([id, label, icon]) => h('button', {
      type: 'button', class: 'sh-mode' + (mode === id ? ' on' : ''),
      onclick: () => { mode = id; stopAnim(); drawModes(); draw(); },
    }, sticker(icon, 'sh-mode-stk'), label, id === 'list' && data.list.length ? h('span', { class: 'sh-count' }, data.list.length) : null)));
  }

  function stopAnim() {
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    timers = [];
  }

  const saved = (a, b) => data.list.find(x => pairKey(x.a, x.b) === pairKey(a, b));

  // ---- meter ----
  function meterView(autoplay) {
    const a = ocById(A), b = ocById(B);
    const g = gauge();
    const heart = fillHeart();
    const slot = (oc, which) => h('div', { class: 'sh-slot ' + which, style: { '--c': oc?.color || '#9b8aa8' } },
      h('div', { class: 'sh-pfp-ring' }, oc ? portrait(oc, 'sh-pfp') : h('div', { class: 'portrait sh-pfp empty' }, '?')),
      ocSelect(which === 'a' ? A : B, id => {
        if (which === 'a') A = id; else B = id;
        result = null;
        stopAnim();
        draw();
      }, { empty: 'pick an oc' }));
    const resultBox = h('div', { class: 'sh-result' });
    const pair = h('div', { class: 'sh-pair' }, slot(a, 'a'), heart, slot(b, 'b'));
    const go = h('button', { type: 'button', class: 'sh-go', disabled: !a || !b, onclick: () => spin(false) }, sticker('1f498', 'sh-go-stk'), 'ship them');
    const stage = h('div', { class: 'sh-stage' }, g.el, pair, go, resultBox);

    function setNeedle(v) { g.needle.style.transform = `rotate(${(v / 100) * 180 - 90}deg)`; }
    setNeedle(0);

    function spin(fast) {
      if (!a || !b) return;
      stopAnim();
      const score = shipScore(a.id, b.id);
      const names = shipNames(a, b);
      const old = saved(a.id, b.id);
      result = { a: a.id, b: b.id, score, names, name: old?.name || names[0] };
      fill(resultBox);
      stage.classList.remove('done');
      stage.classList.add('spinning');
      go.disabled = true;
      const T = fast ? 900 : 2900;
      const t0 = performance.now();
      const target = score.pct;
      const tick = now => {
        const t = Math.min(1, (now - t0) / T);
        const sec = t * 2.9;
        let v = target * (1 - Math.exp(-3.2 * sec)) + 42 * Math.exp(-1.9 * sec) * Math.sin(10 * sec);
        if (!fast && t < .55) v += (Math.random() - .5) * 16 * (1 - t); // the jitters
        v = Math.max(0, Math.min(100, t >= 1 ? target : v));
        setNeedle(v);
        heart.set(v, t >= 1 ? target + '%' : (t < .6 ? Math.floor(Math.random() * 100) : Math.round(v)) + '%');
        if (t < 1) raf = requestAnimationFrame(tick);
        else land();
      };
      raf = requestAnimationFrame(tick);
    }

    function land() {
      stage.classList.remove('spinning');
      stage.classList.add('done');
      go.disabled = false;
      const { score } = result;
      const low = score.pct < 35 && score.kind !== 'family';
      burst(stage, low ? ['1f480', '1f494', '1f62c'] : score.kind === 'family' ? ['1faf6', '1f90d', '2728'] : ['1f496', '1f497', '1f495', '2728', '1f498', '1f49e']);
      drawResult();
    }

    function drawResult() {
      if (!result) return;
      const { score, names } = result;
      const isSaved = saved(result.a, result.b);
      const nameInput = h('input', {
        type: 'text', class: 'sh-name-input', value: result.name, maxLength: 40, disabled: !mine,
        oninput: e => { result.name = e.target.value; const sv = saved(result.a, result.b); if (sv) { sv.name = result.name; save(); } chips.querySelectorAll('.sh-name').forEach(c => c.classList.toggle('on', c.textContent === result.name)); },
      });
      const chips = h('div', { class: 'sh-names' }, names.map(nm => h('button', {
        type: 'button', class: 'sh-name' + (nm === result.name ? ' on' : ''), disabled: !mine,
        onclick: () => { result.name = nm; nameInput.value = nm; nameInput.dispatchEvent(new Event('input')); },
      }, nm)));
      fill(resultBox,
        h('div', { class: 'sh-tier', style: { '--heat': heatColor(score.pct) } },
          sticker(score.icon, 'sh-tier-stk'),
          h('div', { class: 'sh-tier-text' },
            h('div', { class: 'sh-tier-pct' }, score.pct + '%'),
            h('div', { class: 'sh-tier-label' }, score.label),
            score.flavor ? h('div', { class: 'sh-flavor' }, score.flavor) : null)),
        h('div', { class: 'sh-name-box' },
          h('div', { class: 'sh-sub' }, 'ship name'),
          chips,
          nameInput),
        mine ? h('button', {
          type: 'button', class: 'btn ' + (isSaved ? 'ghost' : 'primary'),
          onclick: () => {
            const sv = saved(result.a, result.b);
            if (sv) data.list = data.list.filter(x => x !== sv);
            else { data.list.unshift({ id: 's_' + uid(), a: result.a, b: result.b, name: result.name.trim() || result.names[0], at: Date.now() }); toast('added to the ship list ♡'); }
            save();
            drawModes();
            drawResult();
          },
        }, isSaved ? '♥ on the ship list' : '♡ save ship') : null);
    }

    if (autoplay && a && b) requestAnimationFrame(() => spin(autoplay === 'fast'));
    return stage;
  }

  // ---- ship list ----
  function listView() {
    if (!data.list.length) return h('div', { class: 'sh-empty' }, sticker('1f498', 'sh-empty-stk'),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { mode = 'meter'; drawModes(); draw(); } }, 'ship someone'));
    return h('div', { class: 'sh-cards' }, data.list.map((x, i) => {
      const a = ocById(x.a), b = ocById(x.b);
      const sc = shipScore(x.a, x.b);
      return h('div', {
        class: 'sh-card', style: { '--ca': a.color, '--cb': b.color, '--heat': heatColor(sc.pct), '--i': i }, role: 'button', tabIndex: 0,
        onclick: e => { if (e.target.closest('.sh-card-x')) return; A = x.a; B = x.b; mode = 'meter'; drawModes(); draw('fast'); },
      },
        h('div', { class: 'sh-card-pfps' }, portrait(a, 'sh-card-pfp'), h('span', { class: 'sh-card-heart' }, sticker('1f496')), portrait(b, 'sh-card-pfp')),
        h('div', { class: 'sh-card-name' }, x.name),
        h('div', { class: 'sh-card-who' }, `${nameOf(a)} × ${nameOf(b)}`.toLowerCase()),
        h('div', { class: 'sh-card-foot' },
          h('span', { class: 'sh-card-pct' }, sticker(sc.icon, 'sh-card-stk'), sc.pct + '%'),
          h('span', { class: 'sh-card-date' }, fmtDate(x.at).toLowerCase())),
        mine ? h('button', {
          type: 'button', class: 'sh-card-x', title: 'unship',
          onclick: () => { data.list = data.list.filter(y => y !== x); save(); drawModes(); draw(); },
        }, '×') : null);
    }));
  }

  // ---- ship chart ----
  function chartView() {
    const worlds = store.worlds;
    const world = store.world(chartWorld);
    const cast = (world ? store.cast(world) : store.chars).slice(0, 24);
    const pick = h('select', { class: 'oc-select', onchange: e => { chartWorld = e.target.value; draw(); } },
      h('option', { value: '' }, 'every oc'),
      worlds.map(w => h('option', { value: w.id, selected: w.id === chartWorld }, `${w.emoji} ${w.name}`)));
    if (cast.length < 2) return [h('div', { class: 'sh-chart-head' }, pick), h('div', { class: 'sh-empty' }, sticker('1f4ca', 'sh-empty-stk'))];
    const grid = h('div', { class: 'sh-chart', style: { '--n': cast.length } });
    grid.append(h('div', { class: 'sh-cc corner' }, sticker('1f498')));
    cast.forEach((c, j) => grid.append(h('div', { class: 'sh-cc head top', title: nameOf(c), style: { '--col': j + 2 } }, portrait(c, 'sh-cc-pfp'))));
    const pairs = [];
    cast.forEach((r, i) => {
      grid.append(h('div', { class: 'sh-cc head side', title: nameOf(r), style: { '--row': i + 2 } }, portrait(r, 'sh-cc-pfp'), h('span', { class: 'sh-cc-name' }, firstName(r).toLowerCase())));
      cast.forEach((c, j) => {
        if (i === j) { grid.append(h('div', { class: 'sh-cc self' }, '♡')); return; }
        const sc = shipScore(r.id, c.id);
        if (j > i) pairs.push([r, c, sc]);
        grid.append(h('button', {
          type: 'button', class: 'sh-cc cell', title: `${nameOf(r)} × ${nameOf(c)}: ${sc.pct}%`,
          style: { '--heat': heatColor(sc.pct), '--d': (i + j) * 25 + 'ms' }, dataset: { row: i, col: j },
          onmouseenter: () => grid.querySelectorAll('.sh-cc').forEach(x => x.classList.toggle('lit', x.dataset.row == i || x.dataset.col == j)),
          onclick: () => { A = r.id; B = c.id; mode = 'meter'; drawModes(); draw(true); },
        }, sc.pct));
      });
    });
    grid.addEventListener('mouseleave', () => grid.querySelectorAll('.lit').forEach(x => x.classList.remove('lit')));
    const top = pairs.sort((x, y) => y[2].pct - x[2].pct).slice(0, 5);
    return [
      h('div', { class: 'sh-chart-head' }, pick),
      h('div', { class: 'sh-chart-scroll' }, grid),
      h('div', { class: 'sh-legend' }, h('span', {}, '0'), h('div', { class: 'sh-legend-bar' }), h('span', {}, '100')),
      h('h3', { class: 'sh-h' }, 'top ships'),
      h('div', { class: 'sh-top' }, top.map(([a, b, sc], i) => h('button', {
        type: 'button', class: 'sh-top-row', style: { '--heat': heatColor(sc.pct), '--w': sc.pct + '%' },
        onclick: () => { A = a.id; B = b.id; mode = 'meter'; drawModes(); draw(true); },
      },
        h('span', { class: 'sh-top-n' }, '#' + (i + 1)),
        portrait(a, 'xs'), portrait(b, 'xs'),
        h('span', { class: 'sh-top-name' }, shipNames(a, b)[0]),
        h('span', { class: 'sh-top-bar' }, h('i')),
        h('b', {}, sc.pct + '%')))),
    ];
  }

  function draw(autoplay) {
    stopAnim();
    fill(body, mode === 'meter' ? meterView(autoplay) : mode === 'list' ? listView() : chartView());
    body.className = 'sh-body mode-' + mode;
  }

  el.append(appBar(ctx, meta), modes, body);
  drawModes();
  draw();
  return () => stopAnim();
}
