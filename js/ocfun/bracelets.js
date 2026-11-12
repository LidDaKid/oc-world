// friendship bracelets: knot them in a pattern + colors (+ letter beads), keep them or give them to someone in their
// world. bracelets an oc gave this one show up here too (read from the giver's own char.fun.bracelets).
// saved in char.fun.bracelets = { made: [{ id, pattern, colors: [hex], letters, to: ocId | null, at }] }

import { h, fill, uid, swatches, segmented, toast, confirmDialog } from '../ui.js';
import { appBar, portrait, nameOf, worldmates, ocById } from './kit.js';

export const meta = { id: 'bracelets', label: 'friendship bracelets', icon: '1f4ff' };

const PATTERNS = ['chevron', 'stripes', 'diamonds', 'kandi', 'letters'];
const PALETTE = ['#ff4fa3', '#ff8ac4', '#ffd9e8', '#b18cff', '#6ec6ff', '#7df9d0', '#9be564', '#ffd84d', '#ff8a3d', '#ff5d6c', '#ffffff', '#1a1320'];
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(x => x.toString(16).padStart(2, '0')).join('');
};

// one bracelet drawn as a strip of knots (or beads), with braided ends
export function braceletSVG(b, cols = 34) {
  const colors = b.colors?.length ? b.colors : ['#ff4fa3', '#ffffff'];
  const k = colors.length;
  const beads = b.pattern === 'kandi' || b.pattern === 'letters';
  const R = beads ? 1 : Math.max(4, Math.min(8, b.pattern === 'chevron' ? k * 2 : 6));
  const kw = 8, kh = 6.4, tail = 26;
  const W = tail * 2 + cols * kw, H = beads ? 22 : R * kh + 6;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fbr-svg', preserveAspectRatio: 'xMidYMid meet' });
  // the ends: two braids of thread
  for (const side of [0, 1]) {
    const x0 = side ? W - tail : tail, dir = side ? 1 : -1;
    for (let s = 0; s < Math.min(3, k); s++) {
      const y = H / 2 + (s - 1) * 2.2;
      svg.append(svgEl('path', { d: `M${x0} ${H / 2} Q ${x0 + dir * tail * .5} ${y + (s - 1) * 3} ${x0 + dir * (tail - 2)} ${y + (s - 1) * 4}`, stroke: colors[s], 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }));
    }
    svg.append(svgEl('circle', { cx: x0 + dir * 2, cy: H / 2, r: 2.6, fill: shade(colors[0], -.15) }));
  }
  if (beads) {
    const letters = (b.pattern === 'letters' ? (b.letters || '') : (b.letters || '')).toUpperCase().replace(/[^A-Z0-9♡★ ]/g, '').slice(0, 14);
    const start = Math.floor((cols - letters.length) / 2);
    svg.append(svgEl('line', { x1: tail, y1: H / 2, x2: W - tail, y2: H / 2, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1 }));
    for (let c = 0; c < cols; c++) {
      const cx = tail + c * kw + kw / 2;
      const li = c - start;
      if (letters && li >= 0 && li < letters.length) {
        svg.append(svgEl('rect', { x: cx - 3.7, y: H / 2 - 3.9, width: 7.4, height: 7.8, rx: 1.4, fill: '#fffdf8', stroke: 'rgba(0,0,0,.25)', 'stroke-width': .5 }));
        const t = svgEl('text', { x: cx, y: H / 2 + 2.4, 'text-anchor': 'middle', 'font-size': 6.2, 'font-weight': 700, 'font-family': 'Fredoka, system-ui', fill: '#1a1320' });
        t.textContent = letters[li];
        svg.append(t);
      } else {
        const col = colors[c % k];
        svg.append(svgEl('circle', { cx, cy: H / 2, r: b.pattern === 'kandi' ? 4 : 3.3, fill: col, stroke: shade(col, -.25), 'stroke-width': .6 }));
        svg.append(svgEl('circle', { cx: cx - 1.2, cy: H / 2 - 1.3, r: 1, fill: 'rgba(255,255,255,.7)' }));
      }
    }
    return svg;
  }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < cols; c++) {
      let i;
      if (b.pattern === 'chevron') i = c + Math.abs(r - (R - 1) / 2) * 1;
      else if (b.pattern === 'diamonds') { const P = R; i = Math.abs((c % (P * 2)) - P) + Math.abs(r - (R - 1) / 2); }
      else i = c + r; // stripes
      const col = colors[Math.floor(i) % k];
      const x = tail + c * kw + kw / 2 + (r % 2 ? kw / 2 : 0) - kw / 4;
      const y = 3 + r * kh + kh / 2;
      const tilt = b.pattern === 'chevron' ? (r < R / 2 ? -35 : 35) : -35;
      svg.append(svgEl('ellipse', { cx: x, cy: y, rx: 4.4, ry: 2.9, fill: col, stroke: shade(col, -.22), 'stroke-width': .5, transform: `rotate(${tilt} ${x} ${y})` }));
      svg.append(svgEl('ellipse', { cx: x - .9, cy: y - .8, rx: 1.6, ry: .7, fill: 'rgba(255,255,255,.35)', transform: `rotate(${tilt} ${x} ${y})` }));
    }
  }
  return svg;
}

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.made ||= [];
  const draft = { pattern: 'chevron', colors: ['#ff4fa3', '#b18cff', '#ffffff'], letters: '', to: null };
  let making = false;

  const makeBtn = mine ? h('button', { class: 'btn primary sm', onclick: () => { making = !making; draft.to = null; draft.letters = ''; draw(); } }, '+ bracelet') : null;
  const body = h('div', { class: 'fbr' });
  el.append(appBar(ctx, meta, makeBtn), body);

  const got = () => worldmates(char.id).flatMap(o => (o.fun?.bracelets?.made || []).filter(b => b.to === char.id).map(b => ({ ...b, from: o.id })));

  function card(b, who, label) {
    return h('div', { class: 'fbr-card' },
      h('div', { class: 'fbr-band' }, braceletSVG(b)),
      h('div', { class: 'fbr-meta' },
        who ? h('a', { class: 'fbr-who', href: ctx.ocLink(who), style: { '--c': who.color } }, portrait(who, 'xs'), h('span', {}, label + ' ' + nameOf(who))) : h('span', { class: 'fbr-who kept' }, 'kept'),
        h('span', { class: 'fbr-pat' }, b.pattern),
        mine && !b.from ? h('button', { type: 'button', class: 'icon-btn sm', title: 'cut it off', onclick: async () => {
          if (!await confirmDialog('cut this bracelet off?', { okLabel: 'cut it', danger: true })) return;
          d.made = d.made.filter(x => x.id !== b.id); save(); draw();
        } }, '✕') : null));
  }

  function maker() {
    const preview = h('div', { class: 'fbr-preview' });
    const redraw = () => fill(preview, braceletSVG(draft, 30));
    const chips = h('div', { class: 'fbr-chips' });
    const drawChips = () => fill(chips, draft.colors.map((c, i) => h('button', { type: 'button', class: 'fbr-chip', style: { background: c }, title: 'remove',
      onclick: () => { if (draft.colors.length > 1) { draft.colors.splice(i, 1); drawChips(); redraw(); } } }, '✕')));
    drawChips(); redraw();
    const letters = h('input', { type: 'text', value: draft.letters, maxLength: 14, placeholder: 'letters', oninput: e => { draft.letters = e.target.value; redraw(); } });
    const letterRow = h('div', { class: 'fbr-letters', hidden: !['kandi', 'letters'].includes(draft.pattern) }, letters);
    const mates = worldmates(char.id);
    return h('div', { class: 'fbr-maker' },
      preview,
      segmented(PATTERNS.map(v => ({ value: v, label: v })), draft.pattern, v => { draft.pattern = v; letterRow.hidden = !['kandi', 'letters'].includes(v); redraw(); }),
      h('div', { class: 'fbr-colors' }, chips, swatches(null, c => { if (draft.colors.length >= 6) { toast('6 colors max'); return; } draft.colors.push(c); drawChips(); redraw(); }, PALETTE)),
      letterRow,
      h('div', { class: 'fbr-give' },
        h('select', { onchange: e => { draft.to = e.target.value || null; } },
          h('option', { value: '' }, 'keep it'), mates.map(o => h('option', { value: o.id }, 'give to ' + nameOf(o)))),
        h('button', { class: 'btn primary sm', onclick: () => {
          d.made.unshift({ id: 'fb_' + uid(), pattern: draft.pattern, colors: [...draft.colors], letters: draft.letters.trim(), to: draft.to, at: Date.now() });
          save();
          making = false;
          toast(draft.to ? `given to ${nameOf(ocById(draft.to))}` : 'knotted');
          draw();
        } }, 'knot it')));
  }

  function stand(list) {
    if (!list.length) return null;
    return h('div', { class: 'fbr-standwrap' },
      h('div', { class: 'fbr-stand' }, list.slice(0, 9).map((b, i) => h('div', { class: 'fbr-worn', style: { '--i': i, '--r': ((i * 37) % 9 - 4) + 'deg' } }, braceletSVG(b, 22)))));
  }

  function draw() {
    const mineKept = d.made.filter(b => !b.to);
    const given = d.made.filter(b => b.to && ocById(b.to));
    const received = got();
    fill(body,
      making ? maker() : null,
      stand([...received, ...mineKept]),
      received.length ? h('div', { class: 'fbr-sec' }, h('h3', { class: 'fbr-h' }, 'got'), h('div', { class: 'fbr-list' }, received.map(b => card(b, ocById(b.from), 'from')))) : null,
      mineKept.length || given.length ? h('div', { class: 'fbr-sec' }, h('h3', { class: 'fbr-h' }, 'made'),
        h('div', { class: 'fbr-list' }, [...mineKept.map(b => card(b, null)), ...given.map(b => card(b, ocById(b.to), 'for'))])) : null,
      !making && !received.length && !d.made.length ? h('div', { class: 'fbr-empty' }, braceletSVG({ pattern: 'chevron', colors: ['#ff4fa3', '#b18cff', '#ffd84d', '#7df9d0'] }, 26), h('h3', {}, 'no bracelets yet')) : null);
  }

  draw();
}
