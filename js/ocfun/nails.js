// nail art: design their nails. a hand with 5 nails (svg), each nail gets its own color, finish, pattern + a charm.
// shape + skin tone go for the whole hand. several designs can be kept.
//   data: { designs: [{ id, name, shape, skin, nails: [5 x { color, pattern, pcolor, finish, charm }] }], at }

import { h, fill, uid, swatches, segmented, confirmDialog } from '../ui.js';
import { appBar } from './kit.js';

export const meta = { id: 'nails', label: 'nail art', icon: '1f485' };

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const SHAPES = ['round', 'square', 'almond', 'stiletto', 'coffin'];
const FINISHES = ['glossy', 'matte', 'chrome', 'glitter', 'jelly'];
const PATTERNS = ['none', 'french', 'gradient', 'hearts', 'stars', 'checker', 'leopard', 'polka', 'stripes', 'half moon', 'cross', 'flames'];
const CHARMS = ['none', 'heart', 'star', 'bow', 'gem', 'cross', 'pearl'];
const SKINS = ['#ffe0cc', '#f5c7a9', '#e3a982', '#c98a63', '#a0674a', '#7a4a32', '#5a3424', '#d8c4f0'];
const COLORS = ['#ff4fa3', '#141114', '#d81e3a', '#b18cff', '#ff8ac4', '#7df9d0', '#6ec6ff', '#ffd84d', '#ffffff', '#3b1d4a', '#2a0a1b', '#c0c4cc'];
// finger rects (x, y, w, h) in a 420 x 400 hand; nails sit at the top of each
const GEO = {
  thumb: { x: 34, y: 176, w: 70, h: 230, rot: -24, cx: 69, cy: 300 },
  index: { x: 104, y: 74, w: 66, h: 330 },
  middle: { x: 178, y: 40, w: 70, h: 360 },
  ring: { x: 256, y: 64, w: 66, h: 336 },
  pinky: { x: 330, y: 128, w: 58, h: 272 },
};
const nailBlank = () => ({ color: '#ff4fa3', pattern: 'none', pcolor: '#ffffff', finish: 'glossy', charm: 'none' });
const newDesign = n => ({ id: 'nl_' + uid(), name: 'design ' + n, shape: 'almond', skin: '#f5c7a9', nails: [
  { color: '#141114', pattern: 'none', pcolor: '#ff4fa3', finish: 'glossy', charm: 'none' },
  { color: '#ff4fa3', pattern: 'hearts', pcolor: '#ffffff', finish: 'glossy', charm: 'none' },
  { color: '#141114', pattern: 'checker', pcolor: '#ff4fa3', finish: 'glossy', charm: 'bow' },
  { color: '#ff8ac4', pattern: 'none', pcolor: '#ffffff', finish: 'glitter', charm: 'gem' },
  { color: '#141114', pattern: 'stars', pcolor: '#ffd84d', finish: 'chrome', charm: 'none' },
] });

function nailPath(shape, W, H) {
  const base = `L${W},${H} Q${W / 2},${H + 7} 0,${H} Z`;
  if (shape === 'round') return `M0,${H} L0,${W / 2} A${W / 2},${W / 2} 0 0 1 ${W},${W / 2} ${base}`;
  if (shape === 'square') return `M0,${H} L0,7 Q0,0 7,0 L${W - 7},0 Q${W},0 ${W},7 ${base}`;
  if (shape === 'stiletto') return `M0,${H} L0,${H * .5} Q0,${H * .1} ${W / 2},${-H * .45} Q${W},${H * .1} ${W},${H * .5} ${base}`;
  if (shape === 'coffin') return `M0,${H} L0,${H * .3} L${W * .26},${-H * .2} L${W * .74},${-H * .2} L${W},${H * .3} ${base}`;
  return `M0,${H} L0,${H * .42} Q0,${-H * .02} ${W / 2},${-H * .18} Q${W},${-H * .02} ${W},${H * .42} ${base}`; // almond
}
const TILES = {
  hearts: c => `<path d="M8 13C3.6 9.8 2 7.9 2 5.8A2.9 2.9 0 0 1 8 4.6a2.9 2.9 0 0 1 6 1.2c0 2.1-1.6 4-6 7.2z" fill="${c}"/>`,
  stars: c => `<path d="M8 1.5l1.7 4.2 4.5.3-3.5 2.9 1.1 4.4L8 10.9l-3.8 2.4 1.1-4.4L1.8 6l4.5-.3z" fill="${c}"/>`,
  checker: c => `<rect width="8" height="8" fill="${c}"/><rect x="8" y="8" width="8" height="8" fill="${c}"/>`,
  leopard: c => `<path d="M3 4c2-2 5-1 5 1s-3 4-5 3-2-2 0-4zm8 6c2-1 4 0 4 2s-3 3-4 2-2-3 0-4z" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="12" cy="3" r="1.3" fill="${c}"/><circle cx="4" cy="13" r="1.2" fill="${c}"/>`,
  polka: c => `<circle cx="4" cy="4" r="2.2" fill="${c}"/><circle cx="12" cy="12" r="2.2" fill="${c}"/>`,
  stripes: c => `<path d="M-2 6 L6 -2 M2 18 L18 2 M10 18 L18 10" stroke="${c}" stroke-width="3"/>`,
};
const CHARM_SVG = {
  heart: '<path d="M0 6C-5 2.5-7 .4-7-2A3.4 3.4 0 0 1 0-3.5 3.4 3.4 0 0 1 7-2C7 .4 5 2.5 0 6z" fill="#ff4fa3" stroke="#fff" stroke-width="1.4"/>',
  star: '<path d="M0-7l2 4.6 5 .4-3.8 3.2 1.2 4.8L0 3.4-4.4 6l1.2-4.8L-7-2l5-.4z" fill="#ffd84d" stroke="#c99a1a" stroke-width="1"/>',
  bow: '<path d="M0 0C-3-4-7-6-8-4s0 7 2 7S-2 2 0 0c2 2 4 5 6 3s1-6-1-7-5 1-5 4z" fill="#fff" stroke="#ff8ac4" stroke-width="1.4"/><circle r="1.8" fill="#ff8ac4"/>',
  gem: '<path d="M-5-2 -2-5h4l3 3-5 7z" fill="#bfefff" stroke="#fff" stroke-width="1.2"/><path d="M-5-2h10M-2-5 0 5 2-5" stroke="#7fd3f0" stroke-width=".8" fill="none"/>',
  cross: '<path d="M-1.6-7h3.2v4.4H6v3.2H1.6V8h-3.2V.6H-6v-3.2h4.4z" fill="#e8e8ef" stroke="#9aa0ad" stroke-width="1"/>',
  pearl: '<circle r="4.5" fill="#fff8f0" stroke="#e8d8c8" stroke-width="1"/><circle cx="-1.5" cy="-1.5" r="1.4" fill="#fff"/>',
};

// the whole hand as one svg string. pre = a unique id prefix (gradients / patterns / clips)
export function handSVG(des, pre, sel = -1) {
  let defs = '', body = '';
  FINGERS.forEach((f, i) => {
    const g = GEO[f], n = des.nails[i] || nailBlank();
    const W = g.w - 18, H = Math.round(W * 1.2), nx = g.x + 9, ny = g.y + 14;
    const path = nailPath(des.shape, W, H);
    const id = `${pre}-${i}`;
    defs += `<clipPath id="${id}-c"><path d="${path}"/></clipPath>`;
    defs += `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n.pcolor}"/><stop offset="1" stop-color="${n.color}"/></linearGradient>`;
    defs += `<linearGradient id="${id}-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset=".75" stop-color="#000" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient>`;
    defs += `<pattern id="${id}-glit" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".9" fill="#fff"/><circle cx="5" cy="4.5" r=".7" fill="${n.pcolor}"/><circle cx="3" cy="6" r=".5" fill="#fff"/></pattern>`;
    if (TILES[n.pattern]) defs += `<pattern id="${id}-p" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="scale(.75)">${TILES[n.pattern](n.pcolor)}</pattern>`;
    let pat = '';
    if (n.pattern === 'french') pat = `<path d="M-6 ${-H * .5} L${W + 6} ${-H * .5} L${W + 6} ${H * .28} Q${W / 2} ${H * .06} -6 ${H * .28}Z" fill="${n.pcolor}"/>`;
    else if (n.pattern === 'gradient') pat = `<rect x="-6" y="${-H * .5}" width="${W + 12}" height="${H * 1.6}" fill="url(#${id}-g)"/>`;
    else if (n.pattern === 'half moon') pat = `<ellipse cx="${W / 2}" cy="${H + 2}" rx="${W * .42}" ry="${H * .26}" fill="${n.pcolor}"/>`;
    else if (n.pattern === 'cross') pat = `<path d="M${W / 2 - 2.5} ${H * .12}h5v${H * .22}h${W * .2}v5h${-W * .2}v${H * .4}h-5v${-H * .4}h${-W * .2}v-5h${W * .2}z" fill="${n.pcolor}"/>`;
    else if (n.pattern === 'flames') pat = `<path d="M-4 ${H + 4} L-4 ${H * .55} Q${W * .15} ${H * .7} ${W * .12} ${H * .3} Q${W * .35} ${H * .55} ${W * .4} ${H * .1} Q${W * .6} ${H * .45} ${W * .7} ${H * .2} Q${W * .82} ${H * .55} ${W + 4} ${H * .35} L${W + 4} ${H + 4}Z" fill="${n.pcolor}"/>`;
    else if (TILES[n.pattern]) pat = `<rect x="-6" y="${-H * .5}" width="${W + 12}" height="${H * 1.6}" fill="url(#${id}-p)"/>`;
    let fin = '';
    if (n.finish === 'glossy' || n.finish === 'jelly' || n.finish === 'chrome') fin += `<ellipse cx="${W * .3}" cy="${H * .32}" rx="${W * .1}" ry="${H * .26}" fill="#fff" opacity="${n.finish === 'jelly' ? .7 : .55}"/>`;
    if (n.finish === 'chrome') fin += `<rect x="-6" y="${-H * .5}" width="${W + 12}" height="${H * 1.6}" fill="url(#${id}-chrome)" opacity=".85"/>`;
    if (n.finish === 'glitter') fin += `<rect x="-6" y="${-H * .5}" width="${W + 12}" height="${H * 1.6}" fill="url(#${id}-glit)"/>`;
    if (n.finish === 'matte') fin += `<rect x="-6" y="${-H * .5}" width="${W + 12}" height="${H * 1.6}" fill="#000" opacity=".06"/>`;
    const charm = CHARM_SVG[n.charm] ? `<g transform="translate(${W / 2} ${H * .72}) scale(${W / 34})">${CHARM_SVG[n.charm]}</g>` : '';
    const rot = g.rot ? ` transform="rotate(${g.rot} ${g.cx} ${g.cy})"` : '';
    body += `<g class="nl-finger${i === sel ? ' sel' : ''}" data-i="${i}"${rot}>` +
      `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h + 40}" rx="${g.w / 2}" fill="${des.skin}" stroke="rgba(90,40,30,.25)" stroke-width="2"/>` +
      `<path d="M${g.x + 12} ${g.y + g.w * 1.9} q${g.w / 2 - 12} 8 ${g.w - 24} 0" fill="none" stroke="rgba(90,40,30,.18)" stroke-width="2"/>` +
      `<g transform="translate(${nx} ${ny})"><g clip-path="url(#${id}-c)"><rect x="-6" y="${-H * .5}" width="${W + 12}" height="${H * 1.6}" fill="${n.color}" opacity="${n.finish === 'jelly' ? .72 : 1}"/>${pat}${fin}</g>` +
      `<path d="${path}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>${charm}` +
      `<path class="nl-sel-ring" d="${path}" fill="none" stroke-width="4" transform="translate(0 0)"/></g></g>`;
  });
  return `<svg viewBox="-36 0 456 430" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>` +
    `<path d="M70 300 Q60 420 120 430 L380 430 Q400 380 392 300 Z" fill="${des.skin}" stroke="rgba(90,40,30,.25)" stroke-width="2"/>${body}</svg>`;
}

export function render(el, ctx) {
  const d = ctx.data;
  if (!Array.isArray(d.designs) || !d.designs.length) d.designs = [newDesign(1)];
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  const cur = () => d.designs.find(x => x.id === d.at) || d.designs[0];
  let sel = 1, all = false;
  const pre = 'nl' + uid();

  const hand = h('div', { class: 'nl-hand' });
  const panel = h('div', { class: 'nl-panel' });
  const shelf = h('div', { class: 'nl-shelf' });
  el.append(appBar(ctx, meta), h('div', { class: 'nl-app' }, h('div', { class: 'nl-salon' }, h('i', { class: 'nl-towel' }), hand), edit ? panel : null), shelf);

  hand.onclick = e => {
    const g = e.target.closest?.('.nl-finger');
    if (!g || !edit) return;
    sel = +g.dataset.i;
    all = false;
    draw();
  };

  function drawHand() { hand.innerHTML = handSVG(cur(), pre, edit && !all ? sel : -1); }

  function setNail(key, v) {
    const des = cur();
    (all ? des.nails : [des.nails[sel]]).forEach(n => { n[key] = v; });
    save();
    drawHand();
    drawShelf();
  }

  function drawPanel() {
    if (!edit) return;
    const des = cur(), n = des.nails[sel];
    const group = (label, ...kids) => h('div', { class: 'nl-group' }, h('span', { class: 'nl-label' }, label), ...kids);
    fill(panel,
      h('input', { type: 'text', class: 'nl-name', value: des.name, maxLength: 30, placeholder: 'name', oninput: e => { des.name = e.target.value; save(); drawShelf(); } }),
      group('nail', h('div', { class: 'nl-fingers' },
        FINGERS.map((f, i) => h('button', { type: 'button', class: 'nl-fbtn' + (!all && i === sel ? ' on' : ''), onclick: () => { sel = i; all = false; draw(); } }, f)),
        h('button', { type: 'button', class: 'nl-fbtn all' + (all ? ' on' : ''), onclick: () => { all = !all; draw(); } }, 'all 5'))),
      group('color', swatches(n.color, c => setNail('color', c), COLORS)),
      group('finish', segmented(FINISHES.map(v => ({ value: v, label: v })), n.finish, v => setNail('finish', v))),
      group('pattern', segmented(PATTERNS.map(v => ({ value: v, label: v })), n.pattern, v => setNail('pattern', v))),
      group('pattern color', swatches(n.pcolor, c => setNail('pcolor', c), COLORS)),
      group('charm', segmented(CHARMS.map(v => ({ value: v, label: v })), n.charm, v => setNail('charm', v))),
      group('shape', segmented(SHAPES.map(v => ({ value: v, label: v })), des.shape, v => { des.shape = v; save(); drawHand(); drawShelf(); })),
      group('skin', swatches(des.skin, c => { des.skin = c; save(); drawHand(); drawShelf(); }, SKINS)));
  }

  function drawShelf() {
    fill(shelf,
      d.designs.map(des => h('div', { class: 'nl-saved' + (des === cur() ? ' on' : '') },
        h('button', { type: 'button', class: 'nl-saved-pic', innerHTML: handSVG(des, 'nm' + des.id), onclick: () => { d.at = des.id; save(); draw(); } }),
        h('span', { class: 'nl-saved-name' }, des.name || 'design'),
        edit && d.designs.length > 1 ? h('button', { type: 'button', class: 'icon-btn sm nl-del', title: 'delete', onclick: async () => {
          if (!await confirmDialog(`delete "${des.name || 'this design'}"?`, { okLabel: 'delete', danger: true })) return;
          d.designs = d.designs.filter(x => x !== des);
          if (d.at === des.id) d.at = d.designs[0].id;
          save(); draw();
        } }, '✕') : null)),
      edit ? h('button', { type: 'button', class: 'nl-saved nl-new', onclick: () => {
        const des = structuredClone(cur());
        des.id = 'nl_' + uid();
        des.name = 'design ' + (d.designs.length + 1);
        d.designs.push(des);
        d.at = des.id;
        save(); draw();
      } }, h('span', { class: 'nl-new-plus' }, '+'), h('span', { class: 'nl-saved-name' }, 'new design')) : null);
  }

  function draw() { drawHand(); drawPanel(); drawShelf(); }
  draw();
}
