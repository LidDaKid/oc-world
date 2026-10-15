// hand-drawn furniture + decor for the bedroom (svg). each piece: { id, label, at, w, h, colors, glow, draw(item) }
//   at = 'floor' | 'wall' (where it lands when you add it)
//   colors = [[label, key, default]]  the colors you can change

import { h } from '../ui.js';
import { picImg } from './room-layer.js';

let n = 0;
const gid = p => `${p}${++n}`;

export function shade(hex, amt) {
  let c = (hex || '#888888').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  let r = num >> 16, g = (num >> 8) & 255, b = num & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const lt = (c, a = .25) => shade(c, a), dk = (c, a = .25) => shade(c, -a);

const svg = (w, ht, inner, cls = '') => h('span', { class: 'rp ' + cls, innerHTML: `<svg viewBox='0 0 ${w} ${ht}' width='${w}' height='${ht}' overflow='visible'>${inner}</svg>` });
const vgrad = (id, a, b, c) => `<linearGradient id='${id}' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${a}'/>${c ? `<stop offset='.55' stop-color='${b}'/><stop offset='1' stop-color='${c}'/>` : `<stop offset='1' stop-color='${b}'/>`}</linearGradient>`;
const hgrad = (id, a, b, c) => `<linearGradient id='${id}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${a}'/>${c ? `<stop offset='.5' stop-color='${b}'/><stop offset='1' stop-color='${c}'/>` : `<stop offset='1' stop-color='${b}'/>`}</linearGradient>`;
const floorShadow = (cx, cy, rx, ry, o = .35) => `<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' fill='#000' opacity='${o}' style='filter:blur(5px)'/>`;

// ---------- furniture ----------

function bed(it) {
  const f = it.color || '#141114', b = it.color2 || '#ff7eb6';
  const g1 = gid('bf'), g2 = gid('bd'), g3 = gid('bh');
  const tufts = [];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
    const x = 62 + i * 30 + (row % 2) * 15, y = 52 + row * 26;
    if (x < 320) tufts.push(`<circle cx='${x}' cy='${y}' r='2.6' fill='${dk(f, .45)}'/><path d='M${x - 15} ${y + 13} L${x} ${y} L${x + 15} ${y + 13}' stroke='${dk(f, .3)}' stroke-width='1' fill='none' opacity='.6'/>`);
  }
  return svg(380, 280, `<defs>${vgrad(g1, lt(f, .18), dk(f, .2))}${vgrad(g2, lt(b, .22), b, dk(b, .18))}${vgrad(g3, lt(f, .3), f)}</defs>
    ${floorShadow(190, 262, 185, 16)}
    <path d='M28 168 V78 Q28 18 190 14 Q352 18 352 78 V168 Z' fill='url(#${g3})' stroke='${dk(f, .4)}' stroke-width='3'/>
    <path d='M46 160 V84 Q48 36 190 32 Q332 36 334 84 V160 Z' fill='${lt(f, .08)}' opacity='.9'/>
    ${tufts.join('')}
    <rect x='20' y='150' width='12' height='112' rx='5' fill='url(#${g1})'/><rect x='348' y='150' width='12' height='112' rx='5' fill='url(#${g1})'/>
    <path d='M44 150 H336 L366 222 H14 Z' fill='#f7f1f4'/>
    <rect x='70' y='122' width='112' height='46' rx='20' fill='#fffafc' stroke='#e7d9e0' stroke-width='2'/>
    <rect x='198' y='122' width='112' height='46' rx='20' fill='#fffafc' stroke='#e7d9e0' stroke-width='2'/>
    <rect x='128' y='134' width='124' height='40' rx='18' fill='${lt(b, .35)}' stroke='${b}' stroke-width='2'/>
    <path d='M32 176 Q190 162 348 176 L370 238 Q300 252 190 250 Q80 252 10 238 Z' fill='url(#${g2})'/>
    <path d='M32 176 Q190 162 348 176 L352 190 Q190 178 28 190 Z' fill='${lt(b, .45)}'/>
    <path d='M80 205 Q120 214 150 236 M250 200 Q270 220 300 238 M190 192 Q196 220 188 248' stroke='${dk(b, .2)}' stroke-width='3' fill='none' opacity='.45' stroke-linecap='round'/>
    <path d='M8 236 Q190 256 372 236 L372 252 Q190 274 8 252 Z' fill='${dk(b, .15)}'/>
    <rect x='4' y='246' width='372' height='22' rx='6' fill='url(#${g1})' stroke='${dk(f, .4)}' stroke-width='2'/>
    <rect x='10' y='264' width='14' height='14' rx='3' fill='${dk(f, .3)}'/><rect x='356' y='264' width='14' height='14' rx='3' fill='${dk(f, .3)}'/>`);
}

function nightstand(it) {
  const c = it.color || '#141114', g = gid('ns');
  return svg(130, 150, `<defs>${vgrad(g, lt(c, .15), dk(c, .15))}</defs>${floorShadow(65, 144, 62, 8)}
    <rect x='4' y='10' width='122' height='14' rx='4' fill='${lt(c, .2)}'/>
    <rect x='10' y='22' width='110' height='110' rx='4' fill='url(#${g})'/>
    <rect x='18' y='32' width='94' height='40' rx='4' fill='${lt(c, .07)}' stroke='${dk(c, .35)}' stroke-width='2'/>
    <rect x='18' y='80' width='94' height='40' rx='4' fill='${lt(c, .07)}' stroke='${dk(c, .35)}' stroke-width='2'/>
    <circle cx='65' cy='52' r='5' fill='#e8c66a'/><circle cx='65' cy='100' r='5' fill='#e8c66a'/>
    <path d='M16 132 L12 146 M114 132 L118 146' stroke='${dk(c, .3)}' stroke-width='6' stroke-linecap='round'/>`);
}

function dresser(it) {
  const c = it.color || '#f4e8ee', g = gid('dr');
  const drawer = (y, hh) => `<rect x='22' y='${y}' width='196' height='${hh}' rx='5' fill='${lt(c, .06)}' stroke='${dk(c, .28)}' stroke-width='2'/><path d='M26 ${y + 4} H214' stroke='#fff' opacity='.35' stroke-width='2'/><ellipse cx='80' cy='${y + hh / 2}' rx='9' ry='4' fill='#d8b14f'/><ellipse cx='160' cy='${y + hh / 2}' rx='9' ry='4' fill='#d8b14f'/>`;
  return svg(240, 220, `<defs>${vgrad(g, lt(c, .12), dk(c, .14))}</defs>${floorShadow(120, 214, 118, 9)}
    <path d='M4 20 Q4 8 16 8 H224 Q236 8 236 20 V30 H4 Z' fill='${lt(c, .15)}' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='12' y='28' width='216' height='172' rx='6' fill='url(#${g})' stroke='${dk(c, .3)}' stroke-width='2'/>
    ${drawer(38, 46)}${drawer(92, 46)}${drawer(146, 46)}
    <path d='M18 198 Q14 210 22 216 M222 198 Q226 210 218 216' stroke='${dk(c, .32)}' stroke-width='7' fill='none' stroke-linecap='round'/>`);
}

function desk(it) {
  const c = it.color || '#ffffff', g = gid('dk');
  return svg(300, 200, `<defs>${vgrad(g, lt(c, .1), dk(c, .14))}</defs>${floorShadow(150, 194, 148, 9)}
    <rect x='2' y='20' width='296' height='16' rx='4' fill='${lt(c, .14)}' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='10' y='34' width='100' height='158' rx='4' fill='url(#${g})' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='18' y='44' width='84' height='40' rx='4' fill='${lt(c, .05)}' stroke='${dk(c, .26)}' stroke-width='2'/><rect x='18' y='92' width='84' height='40' rx='4' fill='${lt(c, .05)}' stroke='${dk(c, .26)}' stroke-width='2'/><rect x='18' y='140' width='84' height='40' rx='4' fill='${lt(c, .05)}' stroke='${dk(c, .26)}' stroke-width='2'/>
    <rect x='52' y='60' width='16' height='6' rx='3' fill='#d8b14f'/><rect x='52' y='108' width='16' height='6' rx='3' fill='#d8b14f'/><rect x='52' y='156' width='16' height='6' rx='3' fill='#d8b14f'/>
    <rect x='278' y='34' width='12' height='160' rx='3' fill='${dk(c, .12)}' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='110' y='34' width='168' height='22' fill='${dk(c, .06)}' stroke='${dk(c, .3)}' stroke-width='2'/>`);
}

function vanity(it) {
  const c = it.color || '#ffd1e6', g = gid('va'), m = gid('vm');
  const bulbs = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI + (i / 10) * Math.PI;
    const x = 150 + Math.cos(a) * 92, y = 112 + Math.sin(a) * 96;
    return `<circle class='rp-bulb' cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='8' fill='#fff8d6' stroke='#e9c96a' stroke-width='2'/>`;
  }).join('');
  return svg(300, 360, `<defs>${vgrad(g, lt(c, .12), dk(c, .16))}<linearGradient id='${m}' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#e8f2ff'/><stop offset='.45' stop-color='#b9c7da'/><stop offset='.55' stop-color='#dfe8f5'/><stop offset='1' stop-color='#9aa9bf'/></linearGradient></defs>
    ${floorShadow(150, 352, 146, 10)}
    <path d='M58 200 V112 A92 96 0 0 1 242 112 V200 Z' fill='${lt(c, .1)}' stroke='${dk(c, .3)}' stroke-width='4'/>
    <path d='M72 200 V114 A78 82 0 0 1 228 114 V200 Z' fill='url(#${m})'/>
    <path d='M96 70 L130 40 M100 110 L170 44' stroke='#fff' stroke-width='6' opacity='.5' stroke-linecap='round'/>
    ${bulbs}
    <rect x='8' y='196' width='284' height='18' rx='5' fill='${lt(c, .16)}' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='16' y='212' width='268' height='54' rx='4' fill='url(#${g})' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='24' y='220' width='120' height='38' rx='4' fill='${lt(c, .06)}' stroke='${dk(c, .26)}' stroke-width='2'/><rect x='156' y='220' width='120' height='38' rx='4' fill='${lt(c, .06)}' stroke='${dk(c, .26)}' stroke-width='2'/>
    <circle cx='84' cy='239' r='5' fill='#d8b14f'/><circle cx='216' cy='239' r='5' fill='#d8b14f'/>
    <path d='M26 266 Q20 310 28 350 M274 266 Q280 310 272 350' stroke='${dk(c, .3)}' stroke-width='8' fill='none' stroke-linecap='round'/>
    <rect x='112' y='184' width='12' height='16' rx='3' fill='#ff3d8b'/><rect x='114' y='178' width='8' height='8' rx='2' fill='#111'/>
    <rect x='132' y='186' width='22' height='14' rx='6' fill='#c9a3ff'/><circle cx='176' cy='191' r='9' fill='#ff9ac6'/><circle cx='176' cy='191' r='4' fill='#fff' opacity='.6'/>
    <ellipse cx='150' cy='318' rx='54' ry='14' fill='${dk(c, .1)}'/><rect x='96' y='300' width='108' height='22' rx='11' fill='${lt(c, .2)}' stroke='${dk(c, .28)}' stroke-width='2'/>
    <path d='M110 322 L104 352 M190 322 L196 352' stroke='#d8b14f' stroke-width='5' stroke-linecap='round'/>`);
}

function bookshelf(it) {
  const c = it.color || '#141114', g = gid('bs');
  const cols = ['#ff4fa3', '#b18cff', '#f6eefb', '#7df9d0', '#ff5d6c', '#ffd84d', '#2a2230', '#ff8ac4', '#6ec6ff'];
  let books = '';
  [44, 124, 204].forEach((y, row) => {
    let x = 20;
    let i = row * 3;
    while (x < 170) {
      const w = 10 + ((i * 7) % 9), hh = 52 + ((i * 13) % 20), col = cols[i % cols.length];
      if (i % 7 === 5) { books += `<rect x='${x + 4}' y='${y + 72 - hh + 6}' width='${w}' height='${hh - 6}' rx='2' fill='${col}' transform='rotate(-14 ${x + 4} ${y + 72})'/>`; x += w + 10; }
      else { books += `<rect x='${x}' y='${y + 72 - hh}' width='${w}' height='${hh}' rx='2' fill='${col}'/><rect x='${x}' y='${y + 80 - hh}' width='${w}' height='4' fill='#000' opacity='.18'/>`; x += w + 2; }
      i++;
    }
  });
  return svg(200, 330, `<defs>${vgrad(g, lt(c, .14), dk(c, .14))}</defs>${floorShadow(100, 324, 98, 8)}
    <rect x='4' y='4' width='192' height='320' rx='6' fill='url(#${g})' stroke='${dk(c, .4)}' stroke-width='3'/>
    <rect x='16' y='16' width='168' height='296' fill='${dk(c, .32)}'/>
    ${books}
    <rect x='12' y='116' width='176' height='10' fill='${lt(c, .12)}'/><rect x='12' y='196' width='176' height='10' fill='${lt(c, .12)}'/><rect x='12' y='276' width='176' height='10' fill='${lt(c, .12)}'/>
    <circle cx='150' cy='290' r='0'/>`);
}

function coffin(it) {
  const c = it.color || '#141114', g = gid('cf');
  return svg(170, 300, `<defs>${vgrad(g, lt(c, .2), dk(c, .2))}</defs>${floorShadow(85, 294, 70, 8)}
    <path d='M50 4 H120 L166 80 L132 296 H38 L4 80 Z' fill='url(#${g})' stroke='#ff4fa3' stroke-width='4'/>
    <path d='M56 22 H114 L148 82 L120 278 H50 L22 82 Z' fill='${dk(c, .45)}'/>
    <path d='M30 118 H140 M36 186 H134' stroke='${lt(c, .2)}' stroke-width='8'/>
    <rect x='46' y='84' width='12' height='32' rx='2' fill='#ff4fa3'/><rect x='60' y='88' width='10' height='28' rx='2' fill='#f6eefb'/><rect x='72' y='80' width='12' height='36' rx='2' fill='#b18cff'/>
    <circle cx='112' cy='104' r='12' fill='#f6eefb'/><circle cx='108' cy='102' r='2.5' fill='#111'/><circle cx='116' cy='102' r='2.5' fill='#111'/>
    <path d='M60 172 Q70 150 80 172 Q90 150 100 172 L80 184 Z' fill='#ff4fa3'/>
    <path d='M85 34 V62 M74 44 H96' stroke='#ff4fa3' stroke-width='5' stroke-linecap='round'/>`);
}

function beanbag(it) {
  const c = it.color || '#ff4fa3', g = gid('bb');
  return svg(210, 160, `<defs><radialGradient id='${g}' cx='.38' cy='.3' r='.8'><stop offset='0' stop-color='${lt(c, .35)}'/><stop offset='.6' stop-color='${c}'/><stop offset='1' stop-color='${dk(c, .3)}'/></radialGradient></defs>
    ${floorShadow(105, 148, 100, 12)}
    <path d='M20 140 Q0 90 40 60 Q70 10 120 22 Q190 30 200 100 Q206 140 170 148 Q100 158 40 150 Q24 148 20 140 Z' fill='url(#${g})'/>
    <path d='M50 92 Q100 70 160 88' stroke='${dk(c, .25)}' stroke-width='4' fill='none' opacity='.6' stroke-linecap='round'/>
    <path d='M70 40 Q90 30 110 34' stroke='#fff' stroke-width='6' fill='none' opacity='.35' stroke-linecap='round'/>`);
}

function heartChair(it) {
  const c = it.color || '#ff8ac4', g = gid('hc');
  return svg(200, 220, `<defs><radialGradient id='${g}' cx='.35' cy='.3' r='.85'><stop offset='0' stop-color='${lt(c, .4)}'/><stop offset='.6' stop-color='${c}'/><stop offset='1' stop-color='${dk(c, .3)}'/></radialGradient></defs>
    ${floorShadow(100, 212, 80, 9)}
    <path d='M100 170 C30 130 0 90 14 52 C28 14 80 14 100 50 C120 14 172 14 186 52 C200 90 170 130 100 170 Z' fill='url(#${g})' stroke='${dk(c, .25)}' stroke-width='3'/>
    <path d='M100 64 C120 36 160 38 168 62' stroke='${dk(c, .2)}' stroke-width='3' fill='none' opacity='.5'/>
    <ellipse cx='100' cy='150' rx='70' ry='24' fill='${lt(c, .15)}' stroke='${dk(c, .22)}' stroke-width='3'/>
    <path d='M54 168 L44 212 M146 168 L156 212 M100 172 V214' stroke='#d8b14f' stroke-width='6' stroke-linecap='round'/>
    <path d='M44 50 Q52 34 70 34' stroke='#fff' stroke-width='6' fill='none' opacity='.45' stroke-linecap='round'/>`);
}

function amp() {
  return svg(160, 160, `${floorShadow(80, 154, 76, 7)}
    <rect x='4' y='8' width='152' height='144' rx='10' fill='#1b181d' stroke='#000' stroke-width='3'/>
    <rect x='12' y='16' width='136' height='22' rx='4' fill='#d8b14f'/>
    ${[30, 50, 70, 90, 110, 130].map(x => `<circle cx='${x}' cy='27' r='5' fill='#2a2230'/>`).join('')}
    <rect x='14' y='46' width='132' height='96' rx='6' fill='#2b2630'/>
    <rect x='14' y='46' width='132' height='96' rx='6' fill='url(#ampmesh)' opacity='.9'/>
    <defs><pattern id='ampmesh' width='6' height='6' patternUnits='userSpaceOnUse'><path d='M0 6 L6 0' stroke='#3e3744' stroke-width='1.4'/></pattern></defs>
    <text x='80' y='104' font-family='Permanent Marker' font-size='22' fill='#ff4fa3' text-anchor='middle'>LOUD</text>`);
}

// ---------- lights ----------

function floorLamp(it) {
  const c = it.color || '#ff8ac4', g = gid('fl');
  return svg(120, 360, `<defs>${vgrad(g, lt(c, .3), dk(c, .1))}</defs>${floorShadow(60, 352, 40, 6)}
    <path d='M22 6 H98 L116 84 H4 Z' fill='url(#${g})' stroke='${dk(c, .3)}' stroke-width='2'/>
    <path class='rp-lit' d='M10 84 H110' stroke='#fff6c8' stroke-width='5' stroke-linecap='round'/>
    <path d='M4 84 Q16 92 28 84 Q40 92 52 84 Q64 92 76 84 Q88 92 100 84 Q110 92 116 84' stroke='${dk(c, .2)}' stroke-width='4' fill='none'/>
    <rect x='56' y='84' width='8' height='260' fill='#2a2230'/>
    <ellipse cx='60' cy='348' rx='34' ry='9' fill='#2a2230'/>`);
}

function lavaLamp(it) {
  const c = it.color || '#ff4fa3', g = gid('ll'), cl = gid('lc');
  return svg(80, 190, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${dk(c, .55)}'/><stop offset='.5' stop-color='${dk(c, .3)}'/><stop offset='1' stop-color='${dk(c, .6)}'/></linearGradient>
      <clipPath id='${cl}'><path d='M26 40 L54 40 L64 130 L16 130 Z'/></clipPath></defs>
    ${floorShadow(40, 186, 30, 5)}
    <path d='M28 4 H52 L56 40 H24 Z' fill='#c9ccd3'/><path d='M30 6 H38 L36 38 H28 Z' fill='#fff' opacity='.5'/>
    <path d='M26 40 L54 40 L64 130 L16 130 Z' fill='url(#${g})'/>
    <g clip-path='url(#${cl})'>
      <ellipse class='lava b1' cx='40' cy='110' rx='16' ry='12' fill='${lt(c, .2)}'/>
      <ellipse class='lava b2' cx='36' cy='80' rx='9' ry='11' fill='${c}'/>
      <ellipse class='lava b3' cx='46' cy='56' rx='7' ry='8' fill='${lt(c, .35)}'/>
      <ellipse cx='40' cy='130' rx='26' ry='8' fill='${c}'/>
    </g>
    <path d='M30 46 L22 124' stroke='#fff' stroke-width='3' opacity='.35' stroke-linecap='round'/>
    <path d='M16 130 H64 L72 178 Q40 188 8 178 Z' fill='#c9ccd3'/><path d='M20 134 H32 L26 176 H14 Z' fill='#fff' opacity='.45'/>`);
}

function candles() {
  const flame = (x, y, d) => `<g class='rp-flame' style='animation-delay:${d}s;transform-origin:${x}px ${y + 14}px'><path d='M${x} ${y} C${x + 7} ${y + 8} ${x + 6} ${y + 16} ${x} ${y + 18} C${x - 6} ${y + 16} ${x - 7} ${y + 8} ${x} ${y}Z' fill='#ffb63d'/><path d='M${x} ${y + 6} C${x + 3} ${y + 10} ${x + 3} ${y + 15} ${x} ${y + 16} C${x - 3} ${y + 15} ${x - 3} ${y + 10} ${x} ${y + 6}Z' fill='#fff6c8'/></g>`;
  const pillar = (x, y, w, hh, col) => `<rect x='${x}' y='${y}' width='${w}' height='${hh}' rx='4' fill='${col}'/><path d='M${x} ${y + 4} Q${x + w / 2} ${y + 10} ${x + w} ${y + 4}' stroke='#fff' stroke-width='2' opacity='.5' fill='none'/><path d='M${x + 4} ${y} q2 10 0 16' stroke='${col}' stroke-width='5' stroke-linecap='round' style='filter:brightness(1.08)'/><line x1='${x + w / 2}' y1='${y}' x2='${x + w / 2}' y2='${y - 6}' stroke='#222' stroke-width='2'/>`;
  return svg(140, 140, `${floorShadow(70, 134, 64, 6)}
    ${pillar(14, 66, 30, 68, '#f6eefb')}${pillar(52, 34, 34, 100, '#141114')}${pillar(94, 78, 30, 56, '#ff8ac4')}
    ${flame(29, 42, 0)}${flame(69, 10, .3)}${flame(109, 54, .6)}
    <ellipse cx='70' cy='134' rx='66' ry='6' fill='#d8b14f' opacity='.9'/>`, 'rp-candles');
}

export function neon(it) {
  const c = it.color || '#ff4fa3', text = (it.text ?? 'rawr').slice(0, 24) || ' ';
  return h('span', { class: 'rp rp-neon', style: { '--neon': c, fontFamily: it.font || "'Sedgwick Ave Display', cursive" } }, text);
}

// ---------- wall stuff ----------

function poster(it) {
  const c = it.color || '#141114';
  const el = h('span', { class: 'rp rp-poster', style: { '--pc': c } },
    it.imageId ? picImg(it.imageId, 'rp-poster-pic') : h('span', { class: 'rp-poster-art' }, h('b', {}, it.text || 'the black hearts'), h('i', {}, 'live ♥ tour')),
    h('span', { class: 'rp-tape a' }), h('span', { class: 'rp-tape b' }));
  return el;
}

function frame(it) {
  const c = it.color || '#d8b14f';
  return h('span', { class: 'rp rp-frame', style: { '--fc': c, '--fc2': dk(c, .35), '--fc3': lt(c, .4) } },
    h('span', { class: 'rp-frame-in' }, it.imageId ? picImg(it.imageId) : h('span', { class: 'rp-frame-empty' }, '♥')));
}

function mirror(it) {
  const c = it.color || '#141114', g = gid('mi'), f = gid('mf');
  return svg(170, 240, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#eef4ff'/><stop offset='.4' stop-color='#b8c6da'/><stop offset='.6' stop-color='#d9e3f2'/><stop offset='1' stop-color='#8e9db5'/></linearGradient>${vgrad(f, lt(c, .3), dk(c, .2))}</defs>
    <ellipse cx='85' cy='122' rx='78' ry='110' fill='url(#${f})' stroke='${dk(c, .4)}' stroke-width='3'/>
    ${Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2; return `<circle cx='${(85 + Math.cos(a) * 80).toFixed(1)}' cy='${(122 + Math.sin(a) * 112).toFixed(1)}' r='7' fill='url(#${f})' stroke='${dk(c, .4)}' stroke-width='1.5'/>`; }).join('')}
    <path d='M70 6 Q85 -8 100 6 Q92 14 85 10 Q78 14 70 6Z' fill='url(#${f})' stroke='${dk(c, .4)}' stroke-width='2'/>
    <ellipse cx='85' cy='122' rx='62' ry='94' fill='url(#${g})'/>
    <path d='M48 70 L80 38 M52 110 L112 50' stroke='#fff' stroke-width='7' opacity='.55' stroke-linecap='round'/>`);
}

function shelf(it) {
  const c = it.color || '#141114';
  return svg(240, 60, `<rect x='4' y='8' width='232' height='14' rx='3' fill='${lt(c, .15)}' stroke='${dk(c, .35)}' stroke-width='2'/>
    <path d='M40 22 V52 L60 22 M200 22 V52 L180 22' stroke='#c9ccd3' stroke-width='5' fill='none' stroke-linejoin='round'/>
    <ellipse cx='120' cy='26' rx='110' ry='4' fill='#000' opacity='.2'/>`);
}

function garland(it) {
  const c = it.color || '#141114';
  const bat = (x, y, s) => `<path transform='translate(${x} ${y}) scale(${s})' d='M0 0c-3 0-4-5-4-5l-2 5C-15-6-24-3-30 3c6 0 9 3 10 8 6-2 12 1 20 10 8-9 14-12 20-10 1-5 4-8 10-8-6-6-15-9-24-3l-2-5s-1 5-4 5z' fill='${c}'/>`;
  const pts = [[24, 34], [74, 52], [124, 60], [174, 52], [224, 34], [274, 22]];
  return svg(300, 90, `<path d='M2 14 Q150 90 298 14' stroke='#2a2230' stroke-width='2' fill='none'/>
    ${pts.map(([x, y], i) => `<line x1='${x}' y1='${y - 10}' x2='${x}' y2='${y}' stroke='#2a2230'/>${bat(x, y, i % 2 ? .9 : 1.05)}`).join('')}`);
}

function bunting(it) {
  const c = it.color || '#ff4fa3';
  const cols = [c, '#141114', '#f6eefb', c, '#141114', '#f6eefb', c];
  return svg(320, 90, `<path d='M2 10 Q160 60 318 10' stroke='#2a2230' stroke-width='2' fill='none'/>
    ${cols.map((col, i) => { const x = 22 + i * 46, y = 14 + Math.sin((i + .5) / 7 * Math.PI) * 30; return `<path d='M${x - 18} ${y} L${x + 18} ${y + 2} L${x} ${y + 40} Z' fill='${col}' stroke='#00000033'/>`; }).join('')}`);
}

// ---------- rugs ----------

function rugRound(it) {
  const c = it.color || '#ff8ac4', g = gid('rr');
  return svg(360, 130, `<defs><radialGradient id='${g}' cx='.5' cy='.45' r='.6'><stop offset='0' stop-color='${lt(c, .25)}'/><stop offset='.8' stop-color='${c}'/><stop offset='1' stop-color='${dk(c, .2)}'/></radialGradient></defs>
    <ellipse cx='180' cy='68' rx='178' ry='60' fill='${dk(c, .25)}' opacity='.5'/>
    <ellipse cx='180' cy='64' rx='174' ry='58' fill='url(#${g})' stroke='${lt(c, .3)}' stroke-width='6' stroke-dasharray='2 5' stroke-linecap='round'/>
    <ellipse cx='180' cy='64' rx='120' ry='38' fill='none' stroke='${lt(c, .3)}' stroke-width='3' opacity='.6'/>`, 'rp-flat');
}

function rugHeart(it) {
  const c = it.color || '#141114';
  return svg(280, 130, `<g transform='translate(140 66) scale(1 .5)'><path d='M0 110 C-110 50 -140 -10 -110 -60 C-80 -110 -20 -100 0 -50 C20 -100 80 -110 110 -60 C140 -10 110 50 0 110 Z' fill='${c}' stroke='${lt(c, .3)}' stroke-width='10' stroke-dasharray='3 7' stroke-linecap='round'/></g>`, 'rp-flat');
}

function rugRect(it) {
  const c = it.color || '#f6eefb', c2 = it.color2 || '#141114', g = gid('rp');
  const fringe = Array.from({ length: 34 }, (_, i) => `<line x1='${30 + i * 10}' y1='126' x2='${28 + i * 10}' y2='138' stroke='${c}' stroke-width='3'/>`).join('');
  return svg(400, 140, `<defs><pattern id='${g}' width='44' height='40' patternUnits='userSpaceOnUse'><rect width='44' height='40' fill='${c}'/><rect y='0' width='44' height='6' fill='${c2}' opacity='.85'/><path d='M22 30s-8-4.8-8-10a4.4 4.4 0 0 1 8-2.4A4.4 4.4 0 0 1 30 20c0 5.2-8 10-8 10z' fill='${c2}'/></pattern></defs>
    <path d='M70 8 H330 L392 126 H8 Z' fill='url(#${g})' stroke='${c2}' stroke-width='6'/>${fringe}`, 'rp-flat');
}

// ---------- the catalog ----------

export const PIECES = [
  { id: 'bed', label: 'bed', at: 'floor', w: 380, h: 280, k: .95, draw: bed, colors: [['frame', 'color', '#141114'], ['bedding', 'color2', '#ff7eb6']] },
  { id: 'nightstand', label: 'nightstand', at: 'floor', w: 130, h: 150, k: .8, draw: nightstand, colors: [['color', 'color', '#141114']] },
  { id: 'dresser', label: 'dresser', at: 'floor', w: 240, h: 220, k: .85, draw: dresser, colors: [['color', 'color', '#f4e8ee']] },
  { id: 'desk', label: 'desk', at: 'floor', w: 300, h: 200, k: .85, draw: desk, colors: [['color', 'color', '#ffffff']] },
  { id: 'vanity', label: 'vanity', at: 'floor', w: 300, h: 360, k: .8, draw: vanity, colors: [['color', 'color', '#ffd1e6']], glow: true },
  { id: 'bookshelf', label: 'bookshelf', at: 'floor', w: 200, h: 330, k: .85, draw: bookshelf, colors: [['color', 'color', '#141114']] },
  { id: 'coffin', label: 'coffin shelf', at: 'floor', w: 170, h: 300, k: .85, draw: coffin, colors: [['color', 'color', '#141114']] },
  { id: 'beanbag', label: 'beanbag', at: 'floor', w: 210, h: 160, k: .85, draw: beanbag, colors: [['color', 'color', '#ff4fa3']] },
  { id: 'heartchair', label: 'heart chair', at: 'floor', w: 200, h: 220, k: .8, draw: heartChair, colors: [['color', 'color', '#ff8ac4']] },
  { id: 'amp', label: 'amp', at: 'floor', w: 160, h: 160, k: .7, draw: amp },
  { id: 'rug', label: 'round rug', at: 'rug', w: 360, h: 130, k: 1, draw: rugRound, colors: [['color', 'color', '#ff8ac4']] },
  { id: 'heartrug', label: 'heart rug', at: 'rug', w: 280, h: 130, k: 1, draw: rugHeart, colors: [['color', 'color', '#141114']] },
  { id: 'rectrug', label: 'fringe rug', at: 'rug', w: 400, h: 140, k: 1, draw: rugRect, colors: [['color', 'color', '#f6eefb'], ['pattern', 'color2', '#141114']] },
  { id: 'poster', label: 'poster', at: 'wall', w: 180, h: 250, k: .75, draw: poster, colors: [['color', 'color', '#141114']], pic: true, text: 'the black hearts' },
  { id: 'frame', label: 'frame', at: 'wall', w: 170, h: 210, k: .7, draw: frame, colors: [['frame', 'color', '#d8b14f']], pic: true },
  { id: 'mirror', label: 'mirror', at: 'wall', w: 170, h: 240, k: .75, draw: mirror, colors: [['frame', 'color', '#141114']] },
  { id: 'shelf', label: 'wall shelf', at: 'wall', w: 240, h: 60, k: .8, draw: shelf, colors: [['color', 'color', '#141114']] },
  { id: 'garland', label: 'bat garland', at: 'wall', w: 300, h: 90, k: .9, draw: garland, colors: [['color', 'color', '#141114']] },
  { id: 'bunting', label: 'bunting', at: 'wall', w: 320, h: 90, k: .9, draw: bunting, colors: [['color', 'color', '#ff4fa3']] },
  { id: 'lamp', label: 'floor lamp', at: 'floor', w: 120, h: 360, k: .8, draw: floorLamp, colors: [['shade', 'color', '#ff8ac4']], glow: true },
  { id: 'lava', label: 'lava lamp', at: 'floor', w: 80, h: 190, k: .7, draw: lavaLamp, colors: [['lava', 'color', '#ff4fa3']], glow: true },
  { id: 'candles', label: 'candles', at: 'floor', w: 140, h: 140, k: .6, draw: candles, glow: true },
  { id: 'neon', label: 'neon sign', at: 'wall', w: 260, h: 90, k: 1, draw: neon, colors: [['color', 'color', '#ff4fa3']], glow: true, text: 'rawr' },
];
export const pieceById = id => PIECES.find(p => p.id === id);

// the 3d stickers that work as room stuff
export const ROOM_STICKERS = {
  'furniture': '1f6cf-fe0f 1f6cb-fe0f 1fa91 1fa9e 1fa9f 1f6aa 1f5bc-fe0f 1f4fa 1f4fb 1f4bb 1f5a5-fe0f 1f9f8 1fa86 1f3ae 1f579-fe0f 1f4e6 1f9fa 1f5d1-fe0f 1f9f3 1f392 1f45c 1f45b',
  'decor': '1fab4 1f335 1f490 1f339 1f940 1f337 1f33b 1f56f-fe0f 1fa94 1f3ee 1f52e 1faa9 1f380 1f451 1f48e 1f388 1f381 1f5dd-fe0f 1f570-fe0f 23f0 1f4da 1f4d6 1f4d3 1f4f7 1f4f8 1f4bf 1f4c0 1f4fc 1f3a7 1f3b8 1f3b9 1f941 1f3a4 1f3b7 1fa95',
  'cute': '1f9f8 1f431 1f430 1f43b 1f408-200d-2b1b 1f987 1f47b 1f480 1f383 1f9db-200d-2640-fe0f 1f984 1f98b 1f344 1f353 1f9c1 1f370 1f36d 2615 1f9cb 1f484 1f485 1f460 1f462 1f457 1fa70 1f576-fe0f 1fae7 2728 1f496 1f5a4',
};
