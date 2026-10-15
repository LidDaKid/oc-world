// drawn stuff for the inside of the locker: magnetic mirror, notes, mini whiteboard, band posters, pennant,
// hanging hoodie + messenger bag, photos.

import { h } from '../ui.js';
import { shade } from './room-pieces.js';
import { picImg } from './room-layer.js';

let n = 0;
const gid = p => `${p}${++n}`;
const lt = (c, a = .25) => shade(c, a), dk = (c, a = .25) => shade(c, -a);
const svg = (w, ht, inner, cls = '') => h('span', { class: 'lp ' + cls, innerHTML: `<svg viewBox='0 0 ${w} ${ht}' width='${w}' height='${ht}' overflow='visible'>${inner}</svg>` });

function mirror(it) {
  const c = it.color || '#ff4fa3', m = gid('lm');
  return svg(150, 200, `<defs><linearGradient id='${m}' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#eef4ff'/><stop offset='.4' stop-color='#b9c6d8'/><stop offset='.55' stop-color='#e2eaf6'/><stop offset='1' stop-color='#8f9db3'/></linearGradient></defs>
    <rect x='2' y='2' width='146' height='196' rx='12' fill='${c}' stroke='${dk(c, .3)}' stroke-width='2'/>
    <rect x='14' y='14' width='122' height='172' rx='6' fill='url(#${m})'/>
    <path d='M30 60 L70 24 M34 100 L110 28' stroke='#fff' stroke-width='8' opacity='.5' stroke-linecap='round'/>
    <circle cx='20' cy='20' r='3' fill='${lt(c, .4)}'/><circle cx='130' cy='20' r='3' fill='${lt(c, .4)}'/><circle cx='20' cy='180' r='3' fill='${lt(c, .4)}'/><circle cx='130' cy='180' r='3' fill='${lt(c, .4)}'/>`, 'lp-shadow');
}

export function note(it) {
  return h('span', { class: 'lp lp-note', style: { '--nc': it.color || '#fff27a', fontFamily: it.font || "'Reenie Beanie', cursive" } },
    h('span', { class: 'lp-note-text' }, it.text ?? 'dont forget!! ♥'));
}

function whiteboard(it) {
  return h('span', { class: 'lp lp-board', style: { '--ink': it.color || '#e0323f' } },
    h('span', { class: 'lp-board-text' }, it.text ?? 'call me ♥\n555-0199'),
    h('i', { class: 'lp-marker' }), h('i', { class: 'lp-eraser' }));
}

const BAND_STYLES = {
  goth: ["'UnifrakturMaguntia', serif", '#141114', '#ff4fa3'],
  punk: ["'Permanent Marker', cursive", '#ff4fa3', '#141114'],
  glitch: ["'Rubik Glitch', sans-serif", '#2a1f4f', '#7df9d0'],
  horror: ["'Creepster', cursive", '#2b0a12', '#e0323f'],
  pop: ["'Fredoka', sans-serif", '#ffd1e6', '#c2185b'],
};
function poster(it) {
  const [font, bg, ink] = BAND_STYLES[it.style || 'goth'] || BAND_STYLES.goth;
  if (it.imageId) return h('span', { class: 'lp lp-poster pic' }, picImg(it.imageId), h('i', { class: 'lp-magnet a' }), h('i', { class: 'lp-magnet b' }));
  return h('span', { class: 'lp lp-poster', style: { '--pb': bg, '--pi': ink } },
    h('span', { class: 'lp-poster-in' },
      h('b', { style: { fontFamily: font } }, it.text ?? 'midnight bats'),
      h('span', { class: 'lp-poster-star' }, '✦'),
      h('i', {}, it.sub ?? 'world tour')),
    h('i', { class: 'lp-magnet a' }), h('i', { class: 'lp-magnet b' }));
}

function photo(it) {
  return h('span', { class: 'lp lp-photo', style: { '--tilt': '0deg' } },
    h('span', { class: 'lp-photo-pic' }, it.imageId ? picImg(it.imageId) : h('span', { class: 'lp-photo-empty' }, '♥')),
    it.text ? h('span', { class: 'lp-photo-cap' }, it.text) : null,
    h('i', { class: 'lp-magnet a', style: { '--mc': it.color || '#ff4fa3' } }));
}

function pennant(it) {
  const c = it.color || '#141114';
  return h('span', { class: 'lp lp-pennant', style: { '--pc': c, '--pt': it.color2 || '#ff8ac4' } }, h('span', {}, it.text ?? 'rawr'));
}

function hoodie(it) {
  const c = it.color || '#141114', g = gid('lh');
  return svg(190, 250, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${dk(c, .25)}'/><stop offset='.5' stop-color='${lt(c, .12)}'/><stop offset='1' stop-color='${dk(c, .3)}'/></linearGradient></defs>
    <path d='M70 26 Q95 4 120 26 L124 50 Q95 60 66 50Z' fill='${dk(c, .35)}'/>
    <path d='M64 40 Q30 50 22 90 L6 236 L44 240 L52 120 L50 244 Q95 252 140 244 L138 120 L146 240 L184 236 L168 90 Q160 50 126 40 Q110 70 95 72 Q80 70 64 40Z' fill='url(#${g})' stroke='${dk(c, .45)}' stroke-width='3' stroke-linejoin='round'/>
    <path d='M64 40 Q95 90 126 40' stroke='${dk(c, .45)}' stroke-width='4' fill='none'/>
    <path d='M84 66 L80 120 M106 66 L110 120' stroke='#f6eefb' stroke-width='3' stroke-linecap='round'/>
    <path d='M58 176 H132 L124 214 H66Z' fill='${dk(c, .12)}' stroke='${dk(c, .45)}' stroke-width='2'/>
    <path d='M95 136 l5 -7 a5 5 0 0 1 8 5 l-13 12 -13 -12 a5 5 0 0 1 8 -5z' fill='${it.color2 || '#ff4fa3'}'/>
    <path d='M80 106 Q60 150 70 180 M112 104 Q130 140 122 176' stroke='${dk(c, .4)}' stroke-width='2' fill='none' opacity='.6'/>`, 'lp-hang');
}

function bag(it) {
  const c = it.color || '#2a2230', g = gid('lb');
  const pins = [['#ff4fa3', '♥'], ['#ffd84d', '★'], ['#7df9d0', '☠'], ['#b18cff', '✦']];
  return svg(180, 220, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${lt(c, .15)}'/><stop offset='1' stop-color='${dk(c, .25)}'/></linearGradient></defs>
    <path d='M30 92 Q20 10 90 6 Q160 10 150 92' stroke='${dk(c, .4)}' stroke-width='12' fill='none' stroke-linecap='round'/>
    <path d='M30 92 Q20 10 90 6 Q160 10 150 92' stroke='${it.color2 || '#ff4fa3'}' stroke-width='4' fill='none' stroke-dasharray='6 6'/>
    <rect x='10' y='88' width='160' height='126' rx='14' fill='url(#${g})' stroke='${dk(c, .45)}' stroke-width='3'/>
    <path d='M10 104 Q10 88 26 88 H154 Q170 88 170 104 V160 Q90 176 10 160 Z' fill='${lt(c, .08)}' stroke='${dk(c, .45)}' stroke-width='3'/>
    <rect x='78' y='150' width='24' height='18' rx='3' fill='#c9ccd3'/>
    ${pins.map(([pc, t], i) => `<circle cx='${36 + i * 36}' cy='${120 + (i % 2) * 10}' r='13' fill='${pc}' stroke='#fff' stroke-width='2'/><text x='${36 + i * 36}' y='${125 + (i % 2) * 10}' font-size='14' text-anchor='middle' fill='#141114'>${t}</text>`).join('')}`, 'lp-hang');
}

export const LOCKER_PIECES = [
  { id: 'mirror', label: 'mirror', w: 150, h: 200, k: .85, draw: mirror, colors: [['frame', 'color', '#ff4fa3']] },
  { id: 'photo', label: 'photo', w: 170, h: 200, k: .8, draw: photo, colors: [['magnet', 'color', '#ff4fa3']], pic: true, caption: true },
  { id: 'note', label: 'sticky note', w: 140, h: 140, k: .8, draw: note, colors: [['paper', 'color', '#fff27a']], text: 'dont forget!! ♥', long: true },
  { id: 'board', label: 'whiteboard', w: 230, h: 170, k: .8, draw: whiteboard, colors: [['marker', 'color', '#e0323f']], text: 'call me ♥\n555-0199', long: true },
  { id: 'poster', label: 'band poster', w: 170, h: 230, k: .8, draw: poster, pic: true, text: 'midnight bats', styles: Object.keys(BAND_STYLES) },
  { id: 'pennant', label: 'pennant', w: 240, h: 90, k: .75, draw: pennant, colors: [['felt', 'color', '#141114'], ['letters', 'color2', '#ff8ac4']], text: 'rawr' },
  { id: 'hoodie', label: 'hoodie', w: 190, h: 250, k: .85, draw: hoodie, colors: [['color', 'color', '#141114'], ['heart', 'color2', '#ff4fa3']], hang: true },
  { id: 'bag', label: 'messenger bag', w: 180, h: 220, k: .8, draw: bag, colors: [['color', 'color', '#2a2230'], ['stitch', 'color2', '#ff4fa3']], hang: true },
];
export const lockerPiece = id => LOCKER_PIECES.find(p => p.id === id);

export const LOCKER_STICKERS = '1f5a4 1f496 1f480 1f987 1f577-fe0f 1f47b 1f52e 1f319 2b50 2728 1f308 1f98b 1f344 1f338 1f339 1f380 1f451 1f48e 1f9f8 1f431 1f408-200d-2b1b 1f3b8 1f3a7 1f3a4 1f4bf 1f3ae 1f4f8 1f4da 270f-fe0f 1f4cc 1f4ce 1f511 1f36d 1f353 1f9c1 1f964 1f484 1f485 1f48b 1fa78 1fa79 1f4af 1f192 1f4ac 1f60e 1f97a 1f62d 1f92a 1f47d'.split(' ');
