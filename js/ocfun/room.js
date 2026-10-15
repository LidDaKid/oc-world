// bedroom: decorate the oc's room. walls + floor drawn in real perspective, a window with weather,
// moody lights, and furniture / decor you drag around (drawn pieces + the 3d stickers).

import { h, fill, swatches, segmented } from '../ui.js';
import { appBar, uploadPic } from './kit.js';
import { store } from '../store.js';
import { stickerNode } from '../diary/stickers.js';
import { dragLayer, fitStage, toolBar, deleteKey, defaults, newThing, chipTabs } from './room-layer.js';
import { PIECES, pieceById, ROOM_STICKERS, shade } from './room-pieces.js';

export const meta = { id: 'room', label: 'bedroom', icon: '1f6cf-fe0f' };

const W = 1000, H = 640;
// the corner of the room: back wall 0..760 x 30..440, side wall on the right, floor below
const VPX = 544, VPY = 260;

// ---------- the look of the walls ----------

const enc = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const tile = (w, ht, inner, base) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${ht}'><rect width='100%' height='100%' fill='${base}'/>${inner}</svg>`);

const DAMASK = "M30 4C35 14 44 17 44 27C44 35 37 38 35 45C41 45 47 51 47 58C41 56 35 58 30 68C25 58 19 56 13 58C13 51 19 45 25 45C23 38 16 35 16 27C16 17 25 14 30 4Z";
export const WALLS = {
  solid: { label: 'plain', bg: (b) => b },
  stripes: { label: 'stripes', bg: (b, i) => `repeating-linear-gradient(90deg, ${b} 0 30px, ${i} 30px 60px)` },
  pinstripe: { label: 'pinstripe', bg: (b, i) => `repeating-linear-gradient(90deg, ${b} 0 20px, ${i} 20px 23px)` },
  damask: {
    label: 'damask', bg: (b, i) => tile(60, 72, `<g fill='${i}'><path d='${DAMASK}'/><path d='${DAMASK}' transform='translate(-30 -36)'/><path d='${DAMASK}' transform='translate(30 -36)'/><path d='${DAMASK}' transform='translate(-30 36)'/><path d='${DAMASK}' transform='translate(30 36)'/></g><circle cx='30' cy='30' r='3' fill='${b}'/>`, b),
  },
  stars: { label: 'stars', bg: (b, i) => tile(70, 70, `<g fill='${i}'><path d='M18 6l3 7 7 .6-5.4 4.6 1.7 7L18 21.6 11.7 25.2l1.7-7L8 13.6l7-.6z'/><path d='M52 40l2 4.6 5 .4-3.8 3.2 1.2 4.9L52 50.5l-4.4 2.6 1.2-4.9L45 45l5-.4z'/><circle cx='50' cy='12' r='1.6'/><circle cx='14' cy='52' r='1.6'/></g>`, b) },
  bats: { label: 'bats', bg: (b, i) => tile(90, 80, `<g fill='${i}'><path transform='translate(26 22)' d='M0 0c-3 0-4-5-4-5l-2 5C-15-6-24-3-30 3c6 0 9 3 10 8 6-2 12 1 20 10 8-9 14-12 20-10 1-5 4-8 10-8-6-6-15-9-24-3l-2-5s-1 5-4 5z'/><path transform='translate(70 60) scale(.7)' d='M0 0c-3 0-4-5-4-5l-2 5C-15-6-24-3-30 3c6 0 9 3 10 8 6-2 12 1 20 10 8-9 14-12 20-10 1-5 4-8 10-8-6-6-15-9-24-3l-2-5s-1 5-4 5z'/></g>`, b) },
  hearts: { label: 'hearts', bg: (b, i) => tile(56, 56, `<g fill='${i}'><path d='M14 22s-9-5.6-9-12a5 5 0 0 1 9-2.6A5 5 0 0 1 23 10c0 6.4-9 12-9 12z'/><path d='M42 50s-9-5.6-9-12a5 5 0 0 1 9-2.6A5 5 0 0 1 51 38c0 6.4-9 12-9 12z'/></g>`, b) },
  dots: { label: 'polka', bg: (b, i) => `radial-gradient(circle, ${i} 5px, transparent 5.5px) 0 0 / 34px 34px, radial-gradient(circle, ${i} 5px, transparent 5.5px) 17px 17px / 34px 34px, ${b}` },
  skulls: { label: 'skulls', bg: (b, i) => tile(60, 60, `<g transform='translate(10 8)'><path d='M11 2c-6 0-9 4-9 9 0 3 1.5 4.5 3 5.3V20h12v-3.7c1.5-.8 3-2.3 3-5.3 0-5-3-9-9-9z' fill='${i}'/><circle cx='7.6' cy='11' r='2.2' fill='${b}'/><circle cx='14.4' cy='11' r='2.2' fill='${b}'/></g><g transform='translate(38 36) scale(.7)'><path d='M11 2c-6 0-9 4-9 9 0 3 1.5 4.5 3 5.3V20h12v-3.7c1.5-.8 3-2.3 3-5.3 0-5-3-9-9-9z' fill='${i}'/><circle cx='7.6' cy='11' r='2.2' fill='${b}'/><circle cx='14.4' cy='11' r='2.2' fill='${b}'/></g>`, b) },
  moons: { label: 'moons', bg: (b, i) => tile(80, 80, `<g fill='${i}'><path d='M26 10a14 14 0 1 0 12 22A11 11 0 1 1 26 10z'/><circle cx='60' cy='56' r='2'/><circle cx='66' cy='18' r='1.4'/><circle cx='14' cy='64' r='1.4'/><path d='M58 40l1.4 3 3 .3-2.3 2 .7 3-2.8-1.6-2.8 1.6.7-3-2.3-2 3-.3z'/></g>`, b) },
  plaid: { label: 'plaid', bg: (b, i) => `repeating-linear-gradient(90deg, transparent 0 22px, ${i}55 22px 34px, transparent 34px 60px, ${i}99 60px 62px, transparent 62px 80px), repeating-linear-gradient(0deg, transparent 0 22px, ${i}55 22px 34px, transparent 34px 60px, ${i}99 60px 62px, transparent 62px 80px), ${b}` },
  brick: { label: 'brick', bg: (b, i) => tile(80, 40, `<g fill='none' stroke='${i}' stroke-width='3'><path d='M0 1.5H80M0 21.5H80M40 1.5V21.5M20 21.5V40M60 21.5V40'/></g>`, b) },
  cobweb: { label: 'webs', bg: (b, i) => tile(120, 120, `<g fill='none' stroke='${i}' stroke-width='1.2' opacity='.8'><path d='M0 0L60 60M0 30L60 60M30 0L60 60M0 60L60 60M60 0L60 60'/><path d='M0 18Q14 14 18 0M0 36Q30 30 36 0M0 54Q46 46 54 0'/></g>`, b) },
};
const WALL_COLORS = ['#141016', '#2a1f2b', '#3d0f1d', '#ff8ac4', '#ffd1e6', '#c9b3f2', '#6b3fa0', '#f6eefb', '#b9e6d6', '#1d2340'];
const INK_COLORS = ['#ff4fa3', '#ff8ac4', '#141016', '#3a2635', '#f6eefb', '#b18cff', '#d8b14f', '#e0323f', '#7df9d0'];

// ---------- floors ----------

const WOODS = {
  oak: ['#b98350', '#a8733f', '#c48f57', '#9e6a39', '#b37d48', '#c99a62'],
  walnut: ['#5e3c27', '#4d3020', '#6a4530', '#42291a', '#573722', '#734d35'],
  cherry: ['#8e3b2c', '#7d3226', '#9c4433', '#732c21', '#86372a'],
  ebony: ['#2c2426', '#221b1d', '#352c2e', '#1b1517', '#2f2729'],
  whitewash: ['#e6dccf', '#d9cdbf', '#efe7dd', '#d0c3b3', '#e0d5c8'],
  'pink wood': ['#e5a3ba', '#d994ad', '#eeb3c8', '#d189a3', '#e7aac0'],
};
const CARPETS = { 'pink carpet': '#f2a3c4', 'black carpet': '#1f1b21', 'lilac carpet': '#c6b0f0', 'cream carpet': '#efe5d9', 'red carpet': '#7a1b2a' };

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const floorCache = new Map();
function floorBg(kind) {
  if (floorCache.has(kind)) return floorCache.get(kind);
  let bg;
  if (WOODS[kind]) {
    const tones = WOODS[kind], r = rng(11), pw = 46, TH = 640, N = 8;
    const dark = shade(tones[3], -.45);
    let out = '';
    for (let i = 0; i < N; i++) {
      const x = i * pw;
      const cuts = [], n = 2 + Math.floor(r() * 2);
      let lens = Array.from({ length: n }, () => .6 + r());
      const sum = lens.reduce((a, b) => a + b, 0);
      lens = lens.map(l => l / sum * TH);
      let y = -r() * TH;
      for (const len of lens) {
        const tone = tones[Math.floor(r() * tones.length)];
        for (const off of [0, TH]) {
          const yy = (y + off).toFixed(1);
          out += `<rect x='${x}' y='${yy}' width='${pw}' height='${len.toFixed(1)}' fill='${tone}'/>`;
          for (let g = 0; g < 3; g++) {
            const gx = x + 8 + r() * (pw - 16);
            out += `<path d='M${gx.toFixed(1)} ${yy} q${(r() * 8 - 4).toFixed(1)} ${(len / 2).toFixed(1)} 0 ${len.toFixed(1)}' stroke='${dark}' stroke-width='${(.6 + r()).toFixed(1)}' fill='none' opacity='.16'/>`;
          }
          if (r() > .6) out += `<ellipse cx='${(x + 14 + r() * 36).toFixed(1)}' cy='${(+yy + r() * len).toFixed(1)}' rx='3' ry='7' fill='${dark}' opacity='.18'/>`;
          out += `<rect x='${x}' y='${(+yy + len - 1.5).toFixed(1)}' width='${pw}' height='2.5' fill='${dark}' opacity='.55'/>`;
        }
        cuts.push(y);
        y += len;
      }
      out += `<rect x='${x}' y='0' width='2.5' height='${TH}' fill='${dark}' opacity='.6'/><rect x='${x + 2.5}' y='0' width='1.5' height='${TH}' fill='#fff' opacity='.08'/>`;
    }
    bg = `${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='${pw * N}' height='${TH}'>${out}</svg>`)} 0 0 / ${pw * N}px ${TH}px`;
  } else {
    const c = CARPETS[kind] || '#f2a3c4';
    const light = parseInt(c.slice(1, 3), 16) < 90;
    bg = `${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${light ? 1 : 0}  0 0 0 0 ${light ? 1 : 0}  0 0 0 0 ${light ? 1 : 0}  0 0 0 ${light ? .22 : .32} 0'/></filter><rect width='100%' height='100%' fill='${c}'/><rect width='100%' height='100%' filter='url(#n)'/></svg>`)} 0 0 / 240px 240px`;
  }
  floorCache.set(kind, bg);
  return bg;
}

// maps a w x h box onto 4 corners (tl, tr, br, bl) so flat patterns get real perspective
function quad(w, ht, [x0, y0], [x1, y1], [x2, y2], [x3, y3]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  const m = [a / w, d / w, 0, g / w, b / ht, e / ht, 0, hh / ht, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map(v => +v.toFixed(8)).join(',')})`;
}
// y on the side wall's slanted lines: the line from the vanishing point through (760, y)
const slant = (y, x) => VPY + (y - VPY) * (x - VPX) / (760 - VPX);

// ---------- lights ----------

const FAIRY = { warm: ['#ffd58a', '#ffe7b0'], pink: ['#ff7eb6', '#ffc2dc', '#ff4fa3'], rainbow: ['#ff5d6c', '#ffd84d', '#9be564', '#6ec6ff', '#b18cff', '#ff8ac4'], purple: ['#b18cff', '#e3c6ff', '#8a3ffc'], white: ['#ffffff', '#e8f4ff'] };

function fairyLights(color) {
  const cols = FAIRY[color] || FAIRY.warm;
  const anchors = [0, 152, 304, 456, 608, 760];
  let wire = '', bulbs = '', k = 0;
  const top = 44;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1], cx = (a + b) / 2, sag = top + 46;
    wire += `M${a} ${top} Q${cx} ${sag + 34} ${b} ${top} `;
    for (let t = .1; t < .95; t += .16) {
      const x = (1 - t) ** 2 * a + 2 * (1 - t) * t * cx + t * t * b;
      const y = (1 - t) ** 2 * top + 2 * (1 - t) * t * (sag + 34) + t * t * top;
      const c = cols[k % cols.length];
      bulbs += `<g class='rm-bulb' style='--bc:${c};animation-delay:${((k * 37) % 23) / 10}s'><rect x='${(x - 2).toFixed(1)}' y='${(y - 1).toFixed(1)}' width='4' height='5' fill='#2a2a2a'/><ellipse cx='${x.toFixed(1)}' cy='${(y + 9).toFixed(1)}' rx='4.6' ry='7' fill='${c}'/></g>`;
      k++;
    }
  }
  // down the corner, then along the side wall
  let side = `M760 ${top} `;
  for (let x = 760; x < 1000; x += 80) {
    const y0 = slant(top + 6, x), y1 = slant(top + 6, x + 80);
    side += `Q${x + 40} ${(Math.max(y0, y1) + 50).toFixed(1)} ${x + 80} ${y1.toFixed(1)} `;
  }
  return h('div', {
    class: 'rm-fairy', innerHTML: `<svg viewBox='0 0 ${W} ${H}' width='${W}' height='${H}'><path d='${wire}' stroke='#2a2a2a' stroke-width='1.6' fill='none'/>${bulbs}</svg>`,
  });
}

// ---------- the window ----------

const CURTAINS = { none: null, pink: ['#ff8ac4', '#e0679f'], black: ['#1d1a20', '#0d0b0e'], lace: ['#fbf6f8', '#e7dce1'], purple: ['#9b6ad6', '#6f45a6'], red: ['#8f1730', '#5f0d1f'] };

function windowEl(win, night) {
  if (win.pos === 'none') return null;
  const cx = { left: 190, middle: 390, right: 590 }[win.pos] || 390;
  const sky = h('div', { class: `rm-sky ${night ? 'night' : 'day'} wx-${win.weather}` },
    h('i', { class: 'rm-orb' }),
    night ? h('i', { class: 'rm-stars' }) : null,
    h('i', { class: 'rm-cloud a' }), h('i', { class: 'rm-cloud b' }),
    h('i', { class: 'rm-hills' }),
    win.weather === 'rain' || win.weather === 'storm' ? [h('i', { class: 'rm-rain' }), h('i', { class: 'rm-rain far' }), h('i', { class: 'rm-drops' })] : null,
    win.weather === 'snow' ? [h('i', { class: 'rm-snow' }), h('i', { class: 'rm-snow far' })] : null,
    win.weather === 'storm' ? h('i', { class: 'rm-flash' }) : null);
  const curt = CURTAINS[win.curtains];
  return h('div', { class: 'rm-window', style: { left: cx - 100 + 'px' } },
    h('div', { class: 'rm-win-frame' }, sky, h('i', { class: 'rm-glass' }), h('i', { class: 'rm-mull v' }), h('i', { class: 'rm-mull hz' })),
    h('i', { class: 'rm-sill' }),
    curt ? [
      h('i', { class: 'rm-rod' }),
      h('i', { class: `rm-curt l c-${win.curtains}`, style: { '--c1': curt[0], '--c2': curt[1] } }),
      h('i', { class: `rm-curt r c-${win.curtains}`, style: { '--c1': curt[0], '--c2': curt[1] } }),
      h('i', { class: `rm-valance c-${win.curtains}`, style: { '--c1': curt[0], '--c2': curt[1] } }),
    ] : null);
}

// ---------- the app ----------

const DEF = {
  wall: { color: '#141016', pattern: 'damask', ink: '#2c1d29' },
  floor: 'oak',
  window: { pos: 'middle', weather: 'clear', curtains: 'pink' },
  lights: { fairy: true, fairyColor: 'pink', led: false, glow: 'none' },
  night: false,
};
const starter = () => [
  newThing({ kind: 'piece', p: 'rectrug', x: 330, y: 588, k: 1.1, color: '#ffd1e6', color2: '#141114' }),
  newThing({ kind: 'piece', p: 'poster', x: 110, y: 210, k: .72, r: -4, color: '#141114' }),
  newThing({ kind: 'piece', p: 'neon', x: 640, y: 120, k: .8, text: 'dream', color: '#ff4fa3' }),
  newThing({ kind: 'piece', p: 'bed', x: 330, y: 470, k: .95, color: '#141114', color2: '#ff7eb6' }),
  newThing({ kind: 'piece', p: 'nightstand', x: 598, y: 500, k: .8, color: '#141114' }),
  newThing({ kind: 'piece', p: 'lava', x: 590, y: 400, k: .62, color: '#ff4fa3' }),
  newThing({ kind: 'sticker', s: 'e:1fab4', x: 70, y: 470, k: 1.3 }),
  newThing({ kind: 'sticker', s: 'e:1f9f8', x: 404, y: 448, k: .7, r: 8 }),
  newThing({ kind: 'piece', p: 'beanbag', x: 820, y: 560, k: .9, color: '#ff4fa3' }),
];

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  defaults(d.wall, DEF.wall); defaults(d.window, DEF.window); defaults(d.lights, DEF.lights);
  if (!Array.isArray(d.items)) { d.items = starter(); if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  let night = !!d.night;
  let tab = 'furniture';
  let stickerTab = 'furniture';
  const save = () => { if (edit) ctx.save(); };

  // the scene
  const walls = h('div', { class: 'rm-walls' });
  const winBox = h('div', { class: 'rm-winbox' });
  const ledBox = h('div', { class: 'rm-ledbox' });
  const fairyBox = h('div', { class: 'rm-fairybox' });
  const glowBox = h('div', { class: 'rm-glowbox' });
  const pickBar = h('div', { class: 'rl-pick rm-pick', hidden: true });

  const layer = dragLayer({
    items: d.items, editable: edit, cls: 'rm-items',
    bounds: () => ({ x0: 0, y0: 0, x1: W, y1: H }),
    glow: it => it.kind === 'piece' && !!pieceById(it.p)?.glow,
    render: thing,
    onChange: save,
    onPick: (it, live) => { if (live) bar?.sync(); else drawPick(it); },
  });
  let bar = null;

  const scene = h('div', { class: 'rm-scene' + (night ? ' night' : '') }, walls, winBox, ledBox, layer.el, fairyBox, glowBox, h('i', { class: 'rm-vignette' }));
  const stageWrap = h('div', { class: 'rm-stage' }, scene);
  const panel = h('div', { class: 'rm-panel' });
  const nightBtn = h('button', { class: 'btn sm rm-night-btn', onclick: () => setNight(!night) });

  el.append(
    appBar(ctx, meta, nightBtn),
    h('div', { class: 'rm-app' }, stageWrap, pickBar, edit ? panel : null));

  function thing(it) {
    if (it.kind === 'sticker') return h('div', { class: 'rm-thing rm-stk' }, stickerNode(it.s));
    const p = pieceById(it.p);
    if (!p) return h('span');
    const glowColor = it.p === 'neon' || it.p === 'lava' || it.p === 'lamp' ? (it.color || p.colors?.[0]?.[2]) : '#ffc46b';
    return h('div', { class: `rm-thing rm-p-${p.id}` },
      p.glow ? h('i', { class: 'rm-halo', style: { '--gc': glowColor } }) : null,
      p.draw(it));
  }

  function drawWalls() {
    const { color, pattern, ink } = d.wall;
    const bg = (WALLS[pattern] || WALLS.solid).bg(color, ink);
    const dark = parseInt(color.slice(1, 3), 16) + parseInt(color.slice(3, 5), 16) + parseInt(color.slice(5, 7), 16) < 300;
    const trim = dark ? '#0c0a0d' : '#fbf7f4';
    const trimHi = dark ? '#3a3340' : '#ffffff';
    const sideTop = slant(30, 1000);
    fill(walls,
      h('div', { class: 'rm-ceiling', style: { background: dark ? shade(color, .06) : '#fbf8f6', clipPath: `polygon(0 0, ${760 + (30 / (30 - sideTop)) * 240}px 0, 760px 30px, 0 30px)` } }),
      h('div', { class: 'rm-back', style: { background: bg } }, h('i', { class: 'rm-back-shade' })),
      h('div', { class: 'rm-plane rm-side', style: { background: bg, transform: quad(480, 410, [760, 30], [1000, sideTop], [1000, 640], [760, 440]) } }, h('i', { class: 'rm-side-shade' })),
      h('div', { class: 'rm-plane rm-floor', style: { background: floorBg(d.floor), transform: quad(760, 480, [0, 440], [760, 440], [1000, 640], [-604, 640]) } }, h('i', { class: 'rm-floor-shade' })),
      h('div', { class: 'rm-crown', style: { background: `linear-gradient(${trimHi}, ${trim})` } }),
      h('div', { class: 'rm-crown side', style: { background: trim, clipPath: `polygon(760px 24px, 1000px ${slant(24, 1000)}px, 1000px ${slant(36, 1000)}px, 760px 36px)` } }),
      h('div', { class: 'rm-base', style: { background: `linear-gradient(${trimHi}, ${trim} 40%)` } }),
      h('div', { class: 'rm-base side', style: { background: shade(trim, dark ? .04 : -.08), clipPath: `polygon(760px 422px, 1000px ${slant(422, 1000)}px, 1000px 640px, 760px 440px)` } }),
      h('i', { class: 'rm-corner' }));
  }

  function drawWindow() { fill(winBox, windowEl(d.window, night)); }
  function drawLights() {
    const L = d.lights;
    fill(fairyBox, L.fairy ? fairyLights(L.fairyColor) : null);
    fill(ledBox, L.led ? [h('i', { class: 'rm-led' }), h('i', { class: 'rm-led side', style: { clipPath: `polygon(760px 30px, 1000px ${slant(30, 1000)}px, 1000px ${slant(40, 1000)}px, 760px 40px)` } })] : null);
    glowBox.className = 'rm-glowbox glow-' + L.glow;
  }
  function setNight(v) {
    night = v;
    scene.classList.toggle('night', v);
    nightBtn.textContent = v ? '☾ night' : '☀ day';
    nightBtn.classList.toggle('on', v);
    drawWindow();
    if (edit) { d.night = v; save(); }
  }

  // ---- what's picked ----
  function drawPick(it) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { bar = null; fill(pickBar); return; }
    const p = it.kind === 'piece' ? pieceById(it.p) : null;
    const extra = [];
    if (p?.colors) {
      for (const [label, key, def] of p.colors) {
        extra.push(h('div', { class: 'rl-field' }, h('span', {}, label), swatches(it[key] || def, v => { it[key] = v; layer.refresh(it); save(); }, PIECE_COLORS)));
      }
    }
    if (p?.text) {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'words'), h('input', {
        type: 'text', value: it.text ?? p.text, maxLength: 24, class: 'rm-text',
        oninput: e => { it.text = e.target.value; layer.refresh(it); save(); },
      })));
    }
    if (it.p === 'neon') {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'font'), h('div', { class: 'rm-fonts' }, NEON_FONTS.map(f => h('button', {
        type: 'button', class: 'rm-font' + ((it.font || NEON_FONTS[0]) === f ? ' on' : ''), style: { fontFamily: f },
        onclick: e => { it.font = f; layer.refresh(it); save(); e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); },
      }, 'Aa')))));
    }
    if (p?.pic) {
      extra.push(h('div', { class: 'rl-field' },
        h('button', { type: 'button', class: 'btn sm', onclick: async () => {
          const up = await uploadPic(1200);
          if (!up) return;
          if (it.imageId) store.deleteImage(it.imageId);
          it.imageId = up.imageId;
          layer.refresh(it); save(); drawPick(it);
        } }, it.imageId ? 'change picture' : '+ picture'),
        it.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { store.deleteImage(it.imageId); it.imageId = null; layer.refresh(it); save(); drawPick(it); } }, 'no picture') : null));
    }
    bar = toolBar(layer, it, save, { extra });
    fill(pickBar, bar);
  }

  // ---- adding stuff ----
  function spot(at) {
    const j = () => (Math.random() - .5);
    if (at === 'wall') return { x: Math.round(380 + j() * 500), y: Math.round(200 + j() * 120) };
    if (at === 'rug') return { x: Math.round(400 + j() * 300), y: Math.round(580 + j() * 30) };
    return { x: Math.round(420 + j() * 480), y: Math.round(500 + j() * 60) };
  }
  function addPiece(p) {
    const it = newThing({ kind: 'piece', p: p.id, k: p.k || 1, ...spot(p.at) });
    for (const [, key, def] of p.colors || []) it[key] = def;
    if (p.text) it.text = p.text;
    layer.add(it);
    // rugs go under everything else
    if (p.at === 'rug') layer.toBack(it.id);
  }
  function addSticker(s, at = 'floor') {
    layer.add(newThing({ kind: 'sticker', s, k: 1, ...spot(at) }));
  }

  // ---- the panel ----
  const TABS = [['furniture', 'furniture'], ['wall', 'on the wall'], ['lights', 'lights'], ['stickers', 'stickers'], ['walls', 'walls'], ['floor', 'floor'], ['window', 'window']];
  const tabsEl = chipTabs(TABS, tab, v => { tab = v; drawPanel(); });
  const body = h('div', { class: 'rm-panel-body' });
  if (edit) panel.append(tabsEl, body);

  const cell = (label, node, onclick, on = false, cls = '') => h('button', { type: 'button', class: 'rm-cell ' + cls + (on ? ' on' : ''), onclick, title: label }, h('span', { class: 'rm-cell-art' }, node), h('span', { class: 'rm-cell-name' }, label));
  const piecePreview = p => {
    const it = { p: p.id, text: p.text };
    for (const [, key, def] of p.colors || []) it[key] = def;
    const node = p.draw(it);
    const s = Math.min(78 / p.w, 66 / p.h);
    return h('span', { class: 'rm-prev', style: { width: p.w + 'px', height: p.h + 'px', transform: `translate(-50%, -50%) scale(${s})` } }, node);
  };
  const group = (title, ...kids) => h('div', { class: 'rm-group' }, title ? h('h4', {}, title) : null, ...kids);

  function drawPanel() {
    if (!edit) return;
    if (tab === 'furniture') {
      fill(body, h('div', { class: 'rm-grid' }, PIECES.filter(p => (p.at === 'floor' || p.at === 'rug') && !p.glow).map(p => cell(p.label, piecePreview(p), () => addPiece(p)))));
    } else if (tab === 'wall') {
      fill(body, h('div', { class: 'rm-grid' }, PIECES.filter(p => p.at === 'wall' && p.id !== 'neon').map(p => cell(p.label, piecePreview(p), () => addPiece(p)))));
    } else if (tab === 'lights') {
      const L = d.lights;
      fill(body,
        group('fairy lights',
          segmented([{ value: false, label: 'off' }, ...Object.keys(FAIRY).map(k => ({ value: k, label: k }))], L.fairy ? L.fairyColor : false, v => {
            L.fairy = !!v; if (v) L.fairyColor = v; drawLights(); save();
          })),
        group('led strip', segmented([{ value: false, label: 'off' }, { value: true, label: 'on' }], !!L.led, v => { L.led = v; drawLights(); save(); })),
        group('mood', segmented(['none', 'lava', 'candle', 'moon', 'neon'].map(v => ({ value: v, label: v === 'none' ? 'off' : v })), L.glow, v => { L.glow = v; drawLights(); save(); })),
        group('lamps', h('div', { class: 'rm-grid' }, PIECES.filter(p => p.glow).map(p => cell(p.label, piecePreview(p), () => addPiece(p))))));
    } else if (tab === 'stickers') {
      const cats = [...Object.keys(ROOM_STICKERS)];
      fill(body,
        chipTabs(cats.map(c => [c, c]), stickerTab, v => { stickerTab = v; drawPanel(); }),
        h('div', { class: 'rm-grid stk' }, ROOM_STICKERS[stickerTab].split(' ').map(code => h('button', {
          type: 'button', class: 'rm-cell stkc', onclick: () => addSticker('e:' + code, stickerTab === 'furniture' ? 'floor' : 'wall'),
        }, stickerNode('e:' + code)))));
    } else if (tab === 'walls') {
      const W_ = d.wall;
      fill(body,
        group('color', swatches(W_.color, v => { W_.color = v; drawWalls(); save(); drawPanel(); }, WALL_COLORS)),
        group('pattern', h('div', { class: 'rm-grid pat' }, Object.entries(WALLS).map(([id, w]) =>
          cell(w.label, h('i', { class: 'rm-swatch', style: { background: w.bg(W_.color, W_.ink) } }), () => { W_.pattern = id; drawWalls(); save(); drawPanel(); }, W_.pattern === id)))),
        W_.pattern !== 'solid' ? group('pattern color', swatches(W_.ink, v => { W_.ink = v; drawWalls(); save(); drawPanel(); }, INK_COLORS)) : null);
    } else if (tab === 'floor') {
      fill(body, h('div', { class: 'rm-grid pat' }, [...Object.keys(WOODS), ...Object.keys(CARPETS)].map(k =>
        cell(k, h('i', { class: 'rm-swatch', style: { background: floorBg(k) } }), () => { d.floor = k; drawWalls(); save(); drawPanel(); }, d.floor === k))));
    } else if (tab === 'window') {
      const w = d.window;
      fill(body,
        group('window', segmented(['none', 'left', 'middle', 'right'].map(v => ({ value: v, label: v })), w.pos, v => { w.pos = v; drawWindow(); save(); })),
        group('weather', segmented(['clear', 'rain', 'storm', 'snow'].map(v => ({ value: v, label: v })), w.weather, v => { w.weather = v; drawWindow(); save(); })),
        group('curtains', h('div', { class: 'rm-grid pat' }, Object.entries(CURTAINS).map(([id, c]) =>
          cell(id, h('i', { class: 'rm-swatch', style: { background: c ? `repeating-linear-gradient(90deg, ${c[0]} 0 8px, ${c[1]} 8px 12px, ${c[0]} 12px 18px)` : 'transparent' } }), () => { w.curtains = id; drawWindow(); save(); drawPanel(); }, w.curtains === id)))));
    }
  }

  drawWalls();
  drawWindow();
  drawLights();
  setNight(night);
  drawPanel();
  const unfit = fitStage(stageWrap, scene, W, H);
  const unkey = edit ? deleteKey(layer) : () => {};
  return () => { unfit(); unkey(); };
}

const PIECE_COLORS = ['#141114', '#ffffff', '#ff4fa3', '#ff8ac4', '#ffd1e6', '#b18cff', '#6b3fa0', '#e0323f', '#7df9d0', '#6ec6ff', '#ffd84d', '#d8b14f'];
const NEON_FONTS = ["'Sedgwick Ave Display', cursive", "'Caveat', cursive", "'Pixelify Sans', sans-serif", "'Creepster', cursive", "'Permanent Marker', cursive", "'UnifrakturMaguntia', serif", "'Gloria Hallelujah', cursive"];
