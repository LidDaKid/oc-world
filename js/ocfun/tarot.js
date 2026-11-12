// tarot: a 3-card spread (past / present / future) for the oc from the 22 major arcana. cards flip over one by one,
// readings can be kept with the date + your own notes.
//   data: { readings: [{ id, at, cards: [{ n, rev }], note }] }

import { h, fill, uid, confirmDialog } from '../ui.js';
import { appBar, fmtDate, nameOf } from './kit.js';

export const meta = { id: 'tarot', label: 'tarot', icon: '1f0cf' };

const NUM = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
// [name, upright, reversed, art]. art = svg bits drawn in a 100 x 150 box (gold lines on the card's night sky)
const CARDS = [
  ['the fool', 'new beginnings, a leap of faith, being free', 'recklessness, holding back, a risk not worth it',
    `<circle cx="72" cy="34" r="11"/><path d="M20 120 L50 70 L64 86 L84 60"/><path d="M42 112 q8-30 8-42 q10 6 18 0"/><circle cx="50" cy="62" r="7"/><path d="M14 128h72"/>`],
  ['the magician', 'skill, willpower, making things happen', 'tricks, wasted talent, manipulation',
    `<path d="M36 34 q14-14 28 0 q-14 14-28 0z"/><path d="M50 46v52"/><path d="M50 58 l-20-14 M50 58 l20-14"/><rect x="22" y="104" width="56" height="10" rx="2"/><circle cx="32" cy="100" r="4"/><path d="M48 100h8"/><path d="M66 96 l6 8 -6 0z"/>`],
  ['the high priestess', 'intuition, secrets, the inner voice', 'ignoring your gut, hidden things coming out',
    `<path d="M34 36 a16 16 0 1 0 0 22 a12 12 0 1 1 0-22z"/><path d="M22 120V56 M78 120V56"/><path d="M50 70v40 M40 80h20"/><path d="M30 120h40"/>`],
  ['the empress', 'love, beauty, comfort, things growing', 'smothering, feeling stuck, neglecting yourself',
    `<path d="M50 22 l6 10 -6 -3 -6 3z"/><circle cx="50" cy="56" r="14"/><path d="M50 70 v14 M42 78h16"/><path d="M20 126 q10-30 30-30 q20 0 30 30"/><path d="M28 112 q4-6 8 0 M64 112 q4-6 8 0"/>`],
  ['the emperor', 'structure, protection, being in charge', 'control issues, stubbornness, rigid rules',
    `<path d="M30 40 l8 -12 6 10 6-14 6 14 6-10 8 12z"/><rect x="28" y="56" width="44" height="50" rx="3"/><path d="M28 72h44"/><path d="M40 106v14 M60 106v14"/>`],
  ['the hierophant', 'tradition, teachers, belonging', 'rebellion, breaking the rules, doing it your way',
    `<path d="M50 20v40 M40 30h20 M42 40h16 M44 50h12"/><path d="M30 120 q0-40 20-52 q20 12 20 52z"/><path d="M38 96h24"/>`],
  ['the lovers', 'love, a real connection, big choices', 'mixed signals, a wrong match, disharmony',
    `<path d="M50 60 C34 46 26 38 26 30 a10 10 0 0 1 24-4 a10 10 0 0 1 24 4 c0 8-8 16-24 30z"/><circle cx="32" cy="88" r="7"/><circle cx="68" cy="88" r="7"/><path d="M32 96v26 M68 96v26 M32 104 q18 10 36 0"/>`],
  ['the chariot', 'drive, winning, staying in control', 'losing direction, no self-control, pushing too hard',
    `<path d="M24 76h52v30H24z"/><circle cx="34" cy="112" r="9"/><circle cx="66" cy="112" r="9"/><path d="M40 76 l10-28 10 28"/><path d="M40 36 l10 6 10-6"/>`],
  ['strength', 'courage, patience, a soft kind of power', 'self-doubt, low energy, raw anger',
    `<path d="M30 34 q10-12 20 0 q10 12 20 0" /><circle cx="50" cy="80" r="20"/><path d="M42 76 h2 M56 76 h2 M44 88 q6 4 12 0"/><path d="M30 62 l-6-8 M70 62 l6-8 M28 80h-8 M72 80h8"/>`],
  ['the hermit', 'alone time, searching inside, wisdom', 'loneliness, hiding away, being lost',
    `<path d="M28 124 L50 40 L72 124z"/><path d="M50 40 q-8-8 0-16"/><path d="M74 60 l8 0 0 14 -8 0z"/><path d="M78 74v10"/><path d="M78 52 v8"/>`],
  ['wheel of fortune', 'luck, change, fate turning', 'bad luck, fighting change, cycles repeating',
    `<circle cx="50" cy="74" r="30"/><circle cx="50" cy="74" r="12"/><path d="M50 44v60 M20 74h60 M29 53l42 42 M71 53l-42 42"/>`],
  ['justice', 'fairness, truth, cause + effect', 'unfairness, dodging the truth, blame',
    `<path d="M50 26v84 M24 46h52"/><path d="M24 46 l-10 24 h20z M76 46 l-10 24 h20z"/><path d="M38 110h24"/>`],
  ['the hanged man', 'pausing, letting go, seeing it differently', 'stalling, being stuck, refusing to let go',
    `<path d="M24 26h52 M50 26v24"/><path d="M50 50 l-10 30 M50 50 l10 30"/><path d="M40 80 h20"/><circle cx="50" cy="96" r="10"/><path d="M50 106 v4"/><circle cx="50" cy="96" r="16" stroke-dasharray="3 4"/>`],
  ['death', 'endings, change, a fresh start after', 'fearing change, holding on, stuck in the old',
    `<circle cx="50" cy="52" r="18"/><circle cx="43" cy="50" r="4"/><circle cx="57" cy="50" r="4"/><path d="M44 62 v6 M50 62 v6 M56 62 v6"/><path d="M26 126 q24-40 48 0"/><path d="M70 30 l10-10"/>`],
  ['temperance', 'balance, calm, mixing things just right', 'too much, out of balance, impatience',
    `<path d="M30 50 h16 l-4 22 h-8z M54 82 h16 l-4 22 h-8z"/><path d="M44 72 q8 6 14 12"/><path d="M50 24 l4 8 h-8z"/><path d="M26 124 q24-12 48 0"/>`],
  ['the devil', 'temptation, obsession, being tied down', 'breaking free, taking your power back',
    `<path d="M34 30 q-4 14 8 22 M66 30 q4 14-8 22"/><circle cx="50" cy="62" r="14"/><path d="M50 76v20"/><path d="M36 108 a6 6 0 1 0 0.1 0 M64 108 a6 6 0 1 0 0.1 0"/><path d="M36 114 v10 M64 114 v10 M42 110 h16"/>`],
  ['the tower', 'sudden change, things falling apart, a wake-up call', 'avoiding disaster, fearing change',
    `<path d="M36 124 V50 h28 v74"/><path d="M32 50 l6-12 h24 l6 12"/><path d="M60 20 l-8 16 8 0 -10 18"/><path d="M42 70h6 M52 86h6 M42 102h6"/>`],
  ['the star', 'hope, healing, feeling inspired', 'losing hope, discouragement, disconnection',
    `<path d="M50 22 l6 16 16 2 -12 10 4 16 -14-8 -14 8 4-16 -12-10 16-2z"/><circle cx="24" cy="38" r="2"/><circle cx="78" cy="30" r="2"/><circle cx="80" cy="64" r="2"/><circle cx="20" cy="70" r="2"/><path d="M22 124 q14-14 28 0 q14 14 28 0"/>`],
  ['the moon', 'dreams, illusions, the unknown', 'confusion clearing up, fears fading',
    `<path d="M58 30 a20 20 0 1 0 0 36 a16 16 0 1 1 0-36z"/><path d="M20 124 V96 h12 v28 M68 124 V96 h12 v28"/><path d="M50 124 q-6-12 0-24 q6-12 0-24" stroke-dasharray="4 4"/>`],
  ['the sun', 'joy, success, warmth, being yourself', 'feeling down, too much ego, delays',
    `<circle cx="50" cy="56" r="16"/><path d="M50 26v-8 M50 94v-8 M20 56h-8 M88 56h-8 M29 35l-6-6 M77 83l-6-6 M71 35l6-6 M23 83l6-6"/><path d="M22 124 h56 M30 124 v-14 M70 124 v-14"/>`],
  ['judgement', 'waking up, a calling, second chances', 'self-doubt, ignoring the call',
    `<path d="M30 40 l40 -14 v28z"/><path d="M70 30 l10-6 M70 40 h12 M70 50 l10 6"/><path d="M26 124 v-22 h14 v22 M60 124 v-22 h14 v22"/><path d="M33 102 v-8 M67 102 v-8"/>`],
  ['the world', 'finishing something, wholeness, the big picture', 'loose ends, not quite there yet',
    `<ellipse cx="50" cy="74" rx="26" ry="40"/><path d="M50 50 v38 M40 62 h20 M50 88 l-8 14 M50 88 l8 14"/><circle cx="50" cy="44" r="6"/><circle cx="18" cy="24" r="3"/><circle cx="82" cy="24" r="3"/><circle cx="18" cy="126" r="3"/><circle cx="82" cy="126" r="3"/>`],
];
const SPOTS = ['past', 'present', 'future'];
const svg = (inner, cls) => h('span', { class: cls, innerHTML: `<svg viewBox="0 0 100 150" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>` });

function face(c) {
  const [name, , , art] = CARDS[c.n];
  return h('div', { class: 'tro-face' + (c.rev ? ' rev' : '') },
    h('div', { class: 'tro-num' }, NUM[c.n]),
    svg(art, 'tro-art'),
    h('div', { class: 'tro-name' }, name));
}
const back = () => h('div', { class: 'tro-back' }, svg(`<circle cx="50" cy="75" r="26"/><circle cx="50" cy="75" r="16"/><path d="M50 30 v14 M50 106 v14 M18 75 h14 M68 75 h14"/><path d="M50 61 l4 10 10 4 -10 4 -4 10 -4-10 -10-4 10-4z"/><circle cx="20" cy="22" r="2"/><circle cx="80" cy="22" r="2"/><circle cx="20" cy="128" r="2"/><circle cx="80" cy="128" r="2"/>`, 'tro-back-art'));

function cardNode(c, i, { flipped = true, delay = 0 } = {}) {
  return h('div', { class: 'tro-card' + (flipped ? ' flipped' : ''), style: { '--d': delay + 'ms', '--i': i } },
    h('div', { class: 'tro-inner' }, h('div', { class: 'tro-side tro-side-back' }, back()), h('div', { class: 'tro-side tro-side-front' }, face(c))));
}

export function render(el, ctx) {
  const d = ctx.data;
  if (!Array.isArray(d.readings)) d.readings = [];
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let spread = null; // the cards just drawn (not kept yet)
  const timers = [];

  const table = h('div', { class: 'tro-table' });
  const meaning = h('div', { class: 'tro-meanings' });
  const actions = h('div', { class: 'tro-actions' });
  const kept = h('div', { class: 'tro-kept' });
  el.append(appBar(ctx, meta), h('div', { class: 'tro-app' },
    h('div', { class: 'tro-cloth' }, h('div', { class: 'tro-for' }, nameOf(ctx.char)), table, actions, meaning),
    kept));

  function draw3() {
    const pool = CARDS.map((_, n) => n);
    const pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    spread = { cards: pick.map(n => ({ n, rev: Math.random() < .3 })) };
    drawTable(true);
  }

  function drawTable(fresh) {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!spread) {
      fill(table, SPOTS.map((s, i) => h('div', { class: 'tro-spot' }, h('div', { class: 'tro-card' }, h('div', { class: 'tro-inner' }, h('div', { class: 'tro-side tro-side-back' }, back()))), h('span', { class: 'tro-spot-name' }, s))));
      fill(meaning);
    } else {
      const nodes = spread.cards.map((c, i) => cardNode(c, i, { flipped: !fresh || calm }));
      fill(table, nodes.map((n, i) => h('div', { class: 'tro-spot' }, n, h('span', { class: 'tro-spot-name' }, SPOTS[i]))));
      if (fresh && !calm) nodes.forEach((n, i) => timers.push(setTimeout(() => n.classList.add('flipped'), 350 + i * 650)));
      fill(meaning, spread.cards.map((c, i) => {
        const [name, up, down] = CARDS[c.n];
        return h('div', { class: 'tro-mean', style: { '--i': i } },
          h('div', { class: 'tro-mean-head' }, h('span', { class: 'tro-mean-spot' }, SPOTS[i]), h('b', {}, name), c.rev ? h('span', { class: 'tro-rev-tag' }, 'reversed') : null),
          h('div', {}, c.rev ? down : up));
      }));
    }
    fill(actions,
      h('button', { type: 'button', class: 'btn primary', onclick: draw3 }, spread ? 'draw again' : 'draw 3 cards'),
      spread && edit && !spread.saved ? h('button', { type: 'button', class: 'btn ghost', onclick: keep }, 'keep this reading') : null);
  }

  function keep() {
    const r = { id: 'tr_' + uid(), at: Date.now(), cards: spread.cards, note: '' };
    d.readings.unshift(r);
    spread.saved = true;
    save();
    drawTable(false);
    drawKept();
  }

  function drawKept() {
    fill(kept, d.readings.length ? h('h3', { class: 'tro-kept-title' }, 'readings') : null,
      d.readings.map(r => h('div', { class: 'tro-reading' },
        h('div', { class: 'tro-reading-cards' }, r.cards.map((c, i) => h('div', { class: 'tro-mini' }, cardNode(c, i), h('span', {}, SPOTS[i])))),
        h('div', { class: 'tro-reading-side' },
          h('div', { class: 'tro-date' }, fmtDate(r.at)),
          h('div', { class: 'tro-reading-names' }, r.cards.map(c => CARDS[c.n][0] + (c.rev ? ' (r)' : '')).join(' · ')),
          edit
            ? h('textarea', { class: 'tro-note', rows: 3, maxLength: 800, placeholder: 'notes', value: r.note || '', oninput: e => { r.note = e.target.value; save(); } })
            : r.note ? h('div', { class: 'tro-note' }, r.note) : null,
          edit ? h('button', { type: 'button', class: 'link-btn danger', onclick: async () => {
            if (!await confirmDialog('throw this reading away?', { okLabel: 'delete', danger: true })) return;
            d.readings = d.readings.filter(x => x !== r);
            save();
            drawKept();
          } }, 'delete') : null))));
  }

  drawTable(false);
  drawKept();
  return () => timers.forEach(clearTimeout);
}
