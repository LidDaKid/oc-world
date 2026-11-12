// makeup palette: their eyeshadow palette (12 pans, each a color + name + finish, in a case you design) and their
// signature look drawn on a face chart (lids, liner, lashes, lips, blush, brows, extras).
//   data: { palette: { name, caseColor, caseStyle, pans: [{ color, name, finish }] }, look: {...} }

import { h, fill, swatches, segmented } from '../ui.js';
import { appBar, nameOf } from './kit.js';

export const meta = { id: 'makeup', label: 'makeup palette', icon: '1f484' };

const FINISHES = ['matte', 'shimmer', 'glitter', 'metallic'];
const CASES = ['mirror', 'glitter', 'leopard', 'checker', 'velvet'];
const CASE_COLORS = ['#141114', '#ff4fa3', '#2a0a1b', '#b18cff', '#ffd1e6', '#c0c4cc', '#3b1d4a', '#d81e3a'];
const SHADES = ['#141114', '#2a0a1b', '#5a1030', '#d81e3a', '#ff4fa3', '#ff8ac4', '#ffd1e6', '#b18cff', '#6a3d8f', '#3b1d4a', '#7df9d0', '#6ec6ff', '#ffd84d', '#c99a6b', '#8a5a3c', '#f6eefb', '#c0c4cc', '#ffffff'];
const DEF_PANS = [
  ['#141114', 'coffin', 'matte'], ['#2a0a1b', 'bat cave', 'matte'], ['#5a1030', 'bloodline', 'shimmer'], ['#d81e3a', 'heartbreak', 'glitter'],
  ['#ff4fa3', 'scene queen', 'shimmer'], ['#ff8ac4', 'bubblegum', 'matte'], ['#ffd1e6', 'ballet', 'shimmer'], ['#b18cff', 'lilac haze', 'glitter'],
  ['#6a3d8f', 'velvet', 'metallic'], ['#c0c4cc', 'chrome', 'metallic'], ['#f6eefb', 'ghost', 'shimmer'], ['#7df9d0', 'toxic', 'glitter'],
].map(([color, name, finish]) => ({ color, name, finish }));
const DEF_LOOK = {
  lid: '#2a0a1b', crease: '#ff4fa3', inner: '#f6eefb', liner: 'wing', linerColor: '#141114', lashes: 'dramatic',
  lips: '#5a1030', lipStyle: 'gloss', blush: '#ff8ac4', blushStyle: 'apples', brows: 'natural', browColor: '#2a1a14', extra: 'stars', skin: '#f5d5c0',
};
const LINERS = ['none', 'thin', 'wing', 'smoky', 'graphic', 'double'];
const LASHES = ['none', 'natural', 'dramatic', 'spider'];
const LIP_STYLES = ['matte', 'gloss', 'ombre', 'overlined', 'blotted'];
const BLUSH = ['none', 'apples', 'draped', 'sunburnt', 'hearts'];
const BROWS = ['natural', 'thin', 'bold', 'bleached'];
const EXTRAS = ['none', 'stars', 'hearts', 'gems', 'freckles', 'tears'];
const SKINS = ['#ffe8dc', '#f5d5c0', '#e3b08e', '#c98a63', '#a0674a', '#6e432d', '#f2f2f4', '#d8c4f0'];

function panFill(p, id) {
  if (p.finish === 'matte') return { defs: '', fill: p.color };
  if (p.finish === 'glitter') return { defs: `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${p.color}"/><circle cx="1.5" cy="1.5" r=".8" fill="#fff"/><circle cx="4.5" cy="4" r=".6" fill="#fff" opacity=".7"/></pattern>`, fill: `url(#${id})` };
  return { defs: `<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity="${p.finish === 'metallic' ? .9 : .6}"/><stop offset=".35" stop-color="${p.color}"/><stop offset="1" stop-color="${p.color}"/></radialGradient>`, fill: `url(#${id})` };
}

// the face chart, as an svg string
function faceSVG(L, pre) {
  const eye = (cx, flip) => {
    const s = flip ? -1 : 1, t = x => cx + x * s;
    const lidPath = `M${t(-30)} 168 Q${t(0)} 132 ${t(32)} 166 Q${t(0)} 160 ${t(-30)} 168Z`;
    const creasePath = `M${t(-34)} 166 Q${t(0)} 120 ${t(40)} 162 Q${t(2)} 140 ${t(-34)} 166Z`;
    let liner = '';
    const lc = L.linerColor;
    if (L.liner === 'thin') liner = `<path d="M${t(-28)} 168 Q${t(0)} 154 ${t(30)} 166" stroke="${lc}" stroke-width="2.5" fill="none"/>`;
    if (L.liner === 'wing' || L.liner === 'double') liner = `<path d="M${t(-28)} 168 Q${t(0)} 152 ${t(30)} 165 L${t(48)} 152 L${t(32)} 169Z" fill="${lc}"/>`;
    if (L.liner === 'double') liner += `<path d="M${t(-24)} 176 Q${t(4)} 184 ${t(34)} 172 L${t(44)} 178" stroke="${lc}" stroke-width="2.5" fill="none"/>`;
    if (L.liner === 'smoky') liner = `<ellipse cx="${cx}" cy="168" rx="38" ry="15" fill="${lc}" opacity=".55" filter="url(#${pre}-blur)"/><path d="M${t(-28)} 168 Q${t(0)} 150 ${t(30)} 166 Q${t(0)} 186 ${t(-28)} 168Z" fill="none" stroke="${lc}" stroke-width="3"/>`;
    if (L.liner === 'graphic') liner = `<path d="M${t(-36)} 156 Q${t(0)} 128 ${t(44)} 152" stroke="${lc}" stroke-width="3" fill="none"/><path d="M${t(30)} 165 L${t(52)} 148" stroke="${lc}" stroke-width="4"/><circle cx="${t(-40)}" cy="176" r="2.5" fill="${lc}"/>`;
    let lashes = '';
    const n = { natural: 5, dramatic: 8, spider: 7 }[L.lashes] || 0;
    for (let i = 0; i < n; i++) {
      const x = -24 + (54 * i) / Math.max(1, n - 1), y = 166 - Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 10;
      const len = L.lashes === 'dramatic' ? 13 : L.lashes === 'spider' ? 11 : 7;
      lashes += `<path d="M${t(x)} ${y} l${s * (2 + i * .6)} ${-len}" stroke="#141114" stroke-width="${L.lashes === 'spider' ? 3 : 1.8}" stroke-linecap="round"/>`;
      if (L.lashes === 'spider') lashes += `<path d="M${t(x)} ${y + 12} l${s * 1} 7" stroke="#141114" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return `<path d="${creasePath}" fill="${L.crease}" opacity=".85" filter="url(#${pre}-soft)"/>` +
      `<path d="${lidPath}" fill="${L.lid}"/>` +
      `<ellipse cx="${t(-24)}" cy="166" rx="7" ry="5" fill="${L.inner}" opacity=".9"/>` +
      `<path d="M${t(-28)} 168 Q${t(0)} 154 ${t(30)} 166 Q${t(0)} 182 ${t(-28)} 168Z" fill="#fff"/>` +
      `<circle cx="${t(1)}" cy="168" r="8.5" fill="#3a2a40"/><circle cx="${t(1)}" cy="168" r="4" fill="#0d0a10"/><circle cx="${t(-2)}" cy="165" r="2" fill="#fff"/>` +
      liner + lashes;
  };
  const brow = (cx, flip) => {
    const s = flip ? -1 : 1, t = x => cx + x * s;
    const w = { thin: 2.5, natural: 6, bold: 10, bleached: 6 }[L.brows] || 6;
    const c = L.brows === 'bleached' ? '#f3e3c0' : L.browColor;
    return `<path d="M${t(-34)} 132 Q${t(-4)} 114 ${t(40)} 124" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  };
  const blush = () => {
    if (L.blushStyle === 'none') return '';
    if (L.blushStyle === 'hearts') return [96, 204].map(x => `<path transform="translate(${x} 214) scale(1.3)" d="M0 8C-6 3.6-9 .8-9-2.4A4.4 4.4 0 0 1 0-4.4 4.4 4.4 0 0 1 9-2.4C9 .8 6 3.6 0 8z" fill="${L.blush}" opacity=".8"/>`).join('');
    if (L.blushStyle === 'sunburnt') return `<ellipse cx="150" cy="208" rx="78" ry="18" fill="${L.blush}" opacity=".45" filter="url(#${pre}-blur)"/>`;
    if (L.blushStyle === 'draped') return [[100, 1], [200, -1]].map(([x, s]) => `<ellipse cx="${x}" cy="196" rx="30" ry="16" transform="rotate(${-28 * s} ${x} 196)" fill="${L.blush}" opacity=".55" filter="url(#${pre}-blur)"/>`).join('');
    return [96, 204].map(x => `<circle cx="${x}" cy="214" r="20" fill="${L.blush}" opacity=".5" filter="url(#${pre}-blur)"/>`).join('');
  };
  const lips = () => {
    const outline = L.lipStyle === 'overlined' ? 'M120 262 Q135 248 150 256 Q165 248 180 262 Q150 292 120 262Z' : 'M124 262 Q137 251 150 258 Q163 251 176 262 Q150 287 124 262Z';
    let out = `<path d="${outline}" fill="${L.lips}" opacity="${L.lipStyle === 'blotted' ? .6 : 1}"/>`;
    if (L.lipStyle === 'ombre') out += `<ellipse cx="150" cy="264" rx="14" ry="6" fill="#fff" opacity=".28" filter="url(#${pre}-soft)"/><path d="${outline}" fill="none" stroke="#141114" stroke-opacity=".5" stroke-width="2"/>`;
    if (L.lipStyle === 'gloss') out += `<ellipse cx="142" cy="271" rx="9" ry="3" fill="#fff" opacity=".75"/><ellipse cx="160" cy="257" rx="5" ry="2" fill="#fff" opacity=".5"/>`;
    if (L.lipStyle === 'blotted') out += `<ellipse cx="150" cy="263" rx="16" ry="7" fill="${L.lips}" filter="url(#${pre}-soft)"/>`;
    return out + `<path d="M126 262 Q150 266 174 262" stroke="rgba(0,0,0,.3)" stroke-width="1.4" fill="none"/>`;
  };
  const extra = () => {
    if (L.extra === 'stars') return `<path transform="translate(212 186)" d="M0-8l2.3 5.3 5.7.5-4.3 3.7 1.3 5.6L0 4.1-5 7.1-3.7 1.5-8-2.2l5.7-.5z" fill="#ffd84d"/><path transform="translate(226 202) scale(.6)" d="M0-8l2.3 5.3 5.7.5-4.3 3.7 1.3 5.6L0 4.1-5 7.1-3.7 1.5-8-2.2l5.7-.5z" fill="#ffd84d"/>`;
    if (L.extra === 'hearts') return `<path transform="translate(84 190) scale(.9)" d="M0 8C-6 3.6-9 .8-9-2.4A4.4 4.4 0 0 1 0-4.4 4.4 4.4 0 0 1 9-2.4C9 .8 6 3.6 0 8z" fill="#141114"/>`;
    if (L.extra === 'gems') return [[96, 182], [104, 190], [94, 196], [204, 182], [196, 190], [206, 196]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#bfefff" stroke="#fff"/>`).join('');
    if (L.extra === 'freckles') return Array.from({ length: 22 }, (_, i) => `<circle cx="${(i % 2 ? 184 : 98) + ((i * 37) % 30)}" cy="${196 + ((i * 53) % 22)}" r="1.4" fill="#8a5a3c" opacity=".7"/>`).join('');
    if (L.extra === 'tears') return `<path d="M100 188 q-4 10 0 14 q4-4 0-14z" fill="#141114"/><path d="M100 206 q-3 8 0 11 q3-3 0-11z" fill="#141114"/>`;
    return '';
  };
  // scene hair: a big dark shape behind the head + side-swept bangs with a pink streak
  const hairBack = `<path d="M40 150 Q22 30 150 8 Q282 22 262 160 Q270 260 246 300 L218 230 Q236 140 214 96 Q150 70 86 100 Q64 150 82 232 L54 300 Q30 240 40 150Z" fill="#1a1320"/>`;
  const hairFront = `<path d="M66 132 Q60 40 150 22 Q240 26 238 104 Q214 76 176 72 Q190 96 180 128 Q160 88 112 84 Q84 96 66 132Z" fill="#1a1320"/><path d="M150 26 Q196 40 176 72 Q186 48 150 30Z" fill="#ff4fa3"/><path d="M112 84 Q130 92 140 108 Q120 92 96 96Z" fill="#ff4fa3" opacity=".9"/>`;
  return `<svg viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg"><defs><filter id="${pre}-blur"><feGaussianBlur stdDeviation="7"/></filter><filter id="${pre}-soft"><feGaussianBlur stdDeviation="2.5"/></filter></defs>` +
    hairBack +
    `<path d="M70 120 Q40 6 150 16 Q262 6 232 128 Q240 230 210 290 Q180 340 150 342 Q120 340 90 290 Q60 230 70 120Z" fill="${L.skin}" stroke="#3a2a40" stroke-width="2"/>` +
    `<path d="M150 200 q-6 30 -10 40 q10 6 20 0" fill="none" stroke="#3a2a40" stroke-opacity=".35" stroke-width="2"/>` +
    blush() + [[108, false], [192, true]].map(([x, f]) => `<g transform="translate(${x} 150) scale(.7) translate(${-x} -150)">${brow(x, f)}${eye(x, f)}</g>`).join('') + lips() + extra() + hairFront +
    `<path d="M120 342 Q150 366 180 342 L188 380 H112Z" fill="${L.skin}" stroke="#3a2a40" stroke-width="2"/></svg>`;
}

export function render(el, ctx) {
  const d = ctx.data;
  d.palette ||= { name: '', caseColor: '#141114', caseStyle: 'glitter', pans: structuredClone(DEF_PANS) };
  d.look = { ...DEF_LOOK, ...d.look };
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let pick = null; // the pan being edited
  let tab = 'palette';
  const pre = 'mk' + Math.random().toString(36).slice(2, 8);

  const tabs = h('div', { class: 'mk-tabs' });
  const body = h('div', { class: 'mk-body' });
  el.append(appBar(ctx, meta), h('div', { class: 'mk-app' }, tabs, body));

  function drawTabs() {
    fill(tabs, [['palette', 'palette'], ['look', 'signature look']].map(([id, label]) =>
      h('button', { type: 'button', class: 'mk-tab' + (tab === id ? ' on' : ''), onclick: () => { tab = id; draw(); } }, label)));
  }

  function paletteView() {
    const P = d.palette;
    let defs = '';
    const pans = P.pans.map((p, i) => {
      const f = panFill(p, `${pre}-p${i}`);
      defs += f.defs;
      return h('button', {
        type: 'button', class: 'mk-pan' + (pick === i ? ' on' : ''), disabled: !edit, title: p.name,
        onclick: () => { pick = pick === i ? null : i; draw(); },
      }, h('span', { class: 'mk-pan-dish', innerHTML: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="${f.fill}"/><circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/></svg>` }),
        h('span', { class: 'mk-pan-name' }, p.name || '...'));
    });
    const caseEl = h('div', { class: 'mk-case style-' + P.caseStyle, style: { '--case': P.caseColor } },
      h('div', { class: 'mk-lid' }, h('i', { class: 'mk-mirror' }),
        edit ? h('input', { type: 'text', class: 'mk-pal-name', value: P.name, placeholder: nameOf(ctx.char) + ' palette', maxLength: 30, oninput: e => { P.name = e.target.value; save(); } })
          : h('div', { class: 'mk-pal-name' }, P.name || nameOf(ctx.char) + ' palette')),
      h('div', { class: 'mk-tray' }, h('span', { class: 'mk-defs', innerHTML: `<svg width="0" height="0" style="position:absolute"><defs>${defs}</defs></svg>` }), pans));
    const editor = edit && pick != null ? (() => {
      const p = P.pans[pick];
      return h('div', { class: 'mk-edit' },
        h('input', { type: 'text', value: p.name, maxLength: 24, placeholder: 'shade name', oninput: e => { p.name = e.target.value; save(); caseEl.querySelectorAll('.mk-pan-name')[pick].textContent = p.name || '...'; } }),
        swatches(p.color, c => { p.color = c; save(); draw(); }, SHADES),
        segmented(FINISHES.map(v => ({ value: v, label: v })), p.finish, v => { p.finish = v; save(); draw(); }));
    })() : null;
    const caseCtl = edit ? h('div', { class: 'mk-edit' },
      h('span', { class: 'mk-label' }, 'case'),
      segmented(CASES.map(v => ({ value: v, label: v })), P.caseStyle, v => { P.caseStyle = v; save(); draw(); }),
      swatches(P.caseColor, c => { P.caseColor = c; save(); draw(); }, CASE_COLORS)) : null;
    return [caseEl, editor, caseCtl];
  }

  function lookView() {
    const L = d.look;
    const face = h('div', { class: 'mk-face', innerHTML: faceSVG(L, pre) });
    const set = (k, v) => { L[k] = v; save(); face.innerHTML = faceSVG(L, pre); };
    const palColors = d.palette.pans.map(p => p.color);
    const group = (label, ...kids) => h('div', { class: 'mk-group' }, h('span', { class: 'mk-label' }, label), ...kids);
    const color = (k, list = palColors) => swatches(L[k], c => set(k, c), [...new Set([...list, ...SHADES.slice(0, 6)])]);
    const seg = (k, list) => segmented(list.map(v => ({ value: v, label: v })), L[k], v => set(k, v));
    return h('div', { class: 'mk-look' },
      h('div', { class: 'mk-chart' }, h('div', { class: 'mk-chart-title' }, nameOf(ctx.char)), face),
      edit ? h('div', { class: 'mk-controls' },
        group('lid', color('lid')), group('crease', color('crease')), group('inner corner', color('inner')),
        group('liner', seg('liner', LINERS), color('linerColor', ['#141114', '#ff4fa3', '#ffffff', '#b18cff', '#d81e3a', '#7df9d0'])),
        group('lashes', seg('lashes', LASHES)),
        group('lips', seg('lipStyle', LIP_STYLES), color('lips', ['#5a1030', '#141114', '#d81e3a', '#ff4fa3', '#ff8ac4', '#c99a6b', '#b18cff', '#3b1d4a'])),
        group('blush', seg('blushStyle', BLUSH), color('blush', ['#ff8ac4', '#ff4fa3', '#ff9a8a', '#d81e3a', '#b18cff', '#ffb38a'])),
        group('brows', seg('brows', BROWS)),
        group('extra', seg('extra', EXTRAS)),
        group('skin', swatches(L.skin, c => set('skin', c), SKINS))) : null);
  }

  function draw() {
    drawTabs();
    fill(body, tab === 'palette' ? paletteView() : lookView());
  }
  draw();
}
