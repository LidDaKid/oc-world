// the pieces of the mixtape app: the cassette itself, the doodles, and the choices (shells, fonts, inks, papers).

import { h, s } from '../ui.js';

export const SHELLS = [
  ['clear', 'clear'], ['pink', 'pink'], ['black', 'black'], ['glitter', 'glitter'], ['neon', 'neon'],
  ['smoke', 'smoke'], ['purple', 'purple'], ['white', 'white'], ['red', 'red'],
];
export const PLAYERS = [['silver', 'silver'], ['pink', 'pink'], ['black', 'black'], ['purple', 'purple'], ['yellow', 'yellow']];

export const FONTS = [
  ['caveat', "'Caveat', cursive"], ['marker', "'Permanent Marker', cursive"], ['indie', "'Indie Flower', cursive"],
  ['gloria', "'Gloria Hallelujah', cursive"], ['shadows', "'Shadows Into Light', cursive"], ['patrick', "'Patrick Hand', cursive"],
  ['reenie', "'Reenie Beanie', cursive"], ['apple', "'Homemade Apple', cursive"], ['typewriter', "'Special Elite', monospace"],
  ['graffiti', "'Sedgwick Ave Display', cursive"], ['creepy', "'Creepster', cursive"], ['goth', "'UnifrakturMaguntia', serif"],
];
export const fontCss = id => (FONTS.find(f => f[0] === id) || FONTS[0])[1];

export const INKS = ['#1b1420', '#2346c8', '#d0213a', '#ff4fa3', '#7b3fe4', '#19a86b', '#c9ccd6', '#e0b23c', '#ffffff'];
export const CARDS = ['#141114', '#fff6e8', '#ffd1e6', '#ff4fa3', '#c9b3ff', '#7df9d0', '#ffe066', '#6ec6ff', '#e3262f', '#2b2140'];
export const LABELS = ['#fff6e8', '#ffffff', '#ffd1e6', '#ff4fa3', '#141114', '#c9b3ff', '#ffe066', '#7df9d0'];
export const PAPERS = ['plain', 'lined', 'grid', 'dots', 'stripes', 'checker', 'plaid', 'zebra'];

export const STICKER_TRAY = {
  music: '1f3a7 1f3b8 1f3a4 1f3b5 1f3b6 1f4bf 1f4fc 1f3b9 1f941 1f4fb'.split(' '),
  hearts: '1f5a4 1f496 1f497 1f498 1f49d 1f494 2764-fe0f-200d-1f525 1f48b 1f48c 1fa77 1f49c 2763-fe0f'.split(' '),
  spooky: '1f987 1f480 1f578-fe0f 1f577-fe0f 1f47b 1f9db-200d-2640-fe0f 1f52e 1f56f-fe0f 1f319 1fa78 1f408-200d-2b1b'.split(' '),
  sparkly: '2b50 1f31f 2728 1f4ab 26a1 1f308 1f525 1f338 1f339 1f98b 1f344 1fa90'.split(' '),
  cute: '1f380 1f451 1f48e 1f48d 1f9f8 1f484 1f485 1f460 1f353 1f352 1f36d 1f9c1'.split(' '),
};

// little hand-drawn doodles (24x24, drawn in the ink color)
export const DOODLES = {
  heart: 'M12 20.5s-7.2-4.4-9.2-8.9C1.3 8.2 3.4 4.6 7 4.6c2.1 0 3.7 1.2 5 3.1 1.3-1.9 2.9-3.1 5-3.1 3.6 0 5.7 3.6 4.2 7-2 4.5-9.2 8.9-9.2 8.9z',
  star: 'M12 2.8l2.8 6 6.5.7-4.8 4.5 1.3 6.5L12 17.2l-5.8 3.3 1.3-6.5-4.8-4.5 6.5-.7z',
  bolt: 'M13.5 2L4.5 13.6h6.6L10 22l9.5-12.2h-6.7z',
  sparkle: 'M12 2.5c.7 5 2.6 7.3 8.5 8.4-5.9 1-7.8 3.4-8.5 8.6-.7-5.2-2.6-7.6-8.5-8.6C9.4 9.8 11.3 7.5 12 2.5z',
  crown: 'M3.5 18.5l1.7-10.3 4.6 4.9L12 5l2.2 8.1 4.6-4.9 1.7 10.3z M3.5 21h17',
  smile: 'M12 3a9 9 0 1 0 .01 0z M9 9.5v1.2 M15 9.5v1.2 M7.8 14.2c1.1 1.8 2.6 2.7 4.2 2.7s3.1-.9 4.2-2.7',
  skull: 'M12 3.2c-4.3 0-7.3 2.9-7.3 6.8 0 2.3 1 3.9 2.6 4.8v3.4h2.3v-1.6h1.5v1.6h1.8v-1.6h1.5v1.6h2.3v-3.4c1.6-.9 2.6-2.5 2.6-4.8 0-3.9-3-6.8-7.3-6.8z M9.2 9.3a1.4 1.4 0 1 0 .01 0z M14.8 9.3a1.4 1.4 0 1 0 .01 0z',
  note: 'M9 18V5.5l10-2.3v12.6 M9 18a2.8 2.8 0 1 1-2.8-2.8A2.8 2.8 0 0 1 9 18z M19 15.8a2.8 2.8 0 1 1-2.8-2.8 2.8 2.8 0 0 1 2.8 2.8z',
  swirl: 'M12 12.2c.3-1.2 1.9-1.4 2.4-.3.6 1.4-.7 2.9-2.3 2.8-2-.1-3-2.2-2.4-4 .8-2.4 3.6-3.2 5.7-2.2 2.6 1.3 3.1 4.7 1.7 7-1.7 2.8-5.6 3.4-8.2 1.6-3-2.1-3.4-6.5-1.2-9.3',
  arrow: 'M3 15c4-6 9-8 16-7 M15 4.5l4 3.5-3.6 4',
  flower: 'M12 9.6a2.4 2.4 0 1 0 .01 0z M12 9.6C10.2 6.8 10.6 3.8 12 3c1.4.8 1.8 3.8 0 6.6z M14.3 11.3c3-1 5.7.3 6.1 1.8-1.1 1.2-4.1 1.4-6.1-1.8z M13.4 14.1c1.6 2.8.7 5.6-.8 6.3-1.2-1.1-1.1-4.1.8-6.3z M10.6 14.1c-1.9 2.2-2 5.2-.8 6.3 1.5-.7 2.4-3.5.8-6.3z M9.7 11.3c-2 3.2-5 3-6.1 1.8.4-1.5 3.1-2.8 6.1-1.8z',
  scribble: 'M3 14c2-3 3-5 4-4s-1 6 1 6 3-8 5-8 0 9 2 9 3-6 6-7',
};
export const WORDS = ['xoxo', '4ever', 'luv u', 'side a', 'rawr', 'vol. 1', 'play me', 'for u'];

export function doodleSvg(kind) {
  return s('svg', { viewBox: '0 0 24 24', class: 'mx-doodle-svg' },
    s('path', { d: DOODLES[kind] || DOODLES.heart, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

// dark text on light colors, light text on dark ones
export function inkOn(hex) {
  const n = parseInt((hex || '#ffffff').slice(1), 16);
  const lum = (.299 * (n >> 16 & 255) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255;
  return lum > .55 ? '#1b1420' : '#fff6e8';
}

// a cassette. cls 'mini' etc. returns the element with .setReels(p) (0 = all tape on the left reel)
export function cassette(tape, cls = '') {
  const reel = side => h('div', { class: 'mx-reel ' + side },
    h('div', { class: 'mx-pack' }),
    h('div', { class: 'mx-hub' }, h('div', { class: 'mx-hub-teeth' })));
  const labelInk = inkOn(tape.labelColor);
  const el = h('div', { class: `mx-cas shell-${tape.shell} ${cls}`, style: { '--label': tape.labelColor, '--label-ink': labelInk, '--stripe': tape.card } },
    h('div', { class: 'mx-cas-body' }),
    h('div', { class: 'mx-cas-glitter' }),
    reel('l'), reel('r'),
    h('div', { class: 'mx-cas-label' },
      h('div', { class: 'mx-cas-top' },
        h('span', { class: 'mx-cas-side' }, 'A'),
        h('span', { class: 'mx-cas-title', style: { fontFamily: fontCss(tape.labelFont) } }, tape.title || ' ')),
      h('div', { class: 'mx-cas-stripes' })),
    h('div', { class: 'mx-cas-window' }, h('div', { class: 'mx-cas-ticks' })),
    h('div', { class: 'mx-cas-foot' }, h('i'), h('i'), h('i'), h('i')),
    ['a', 'b', 'c', 'd', 'e'].map(p => h('span', { class: 'mx-screw ' + p })),
    h('div', { class: 'mx-cas-shine' }));
  el.setReels = p => {
    p = Math.max(0, Math.min(1, p || 0));
    el.style.setProperty('--l', (1 - p).toFixed(3));
    el.style.setProperty('--r', p.toFixed(3));
  };
  el.setReels(0);
  return el;
}

// the paper on the j-card
export const paperClass = tape => `mx-paper paper-${tape.cardPattern || 'plain'}`;
