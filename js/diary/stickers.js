// every sticker you can put on a diary page or cover.
//
// an item's sticker is a short string:
//   'e:1f987'            one of the 3d pictures in /stickers
//   'w:label:keep out'   a word sticker (style:text)
//   't:hearts'           a strip of washi tape
//   'x:paperclip'        a little drawn thing

import { h } from '../ui.js';
import { EMOJI_STICKERS } from './sticker-list.js';

const WORDS = [
  ['label', 'keep out'], ['label', 'private'], ['label', 'dear diary'], ['label', 'today'], ['label', 'secret'],
  ['label', 'mood'], ['label', 'ugh'], ['label', 'no.'], ['label', 'whatever'], ['label', 'emo 4ever'],
  ['bubble', 'xoxo'], ['bubble', 'rawr'], ['bubble', 'omg'], ['bubble', 'bff'], ['bubble', 'lol'], ['bubble', 'ily'],
  ['bubble', 'hehe'], ['bubble', 'cute'], ['bubble', '<3'], ['bubble', ':3'], ['bubble', 'rawr xD'], ['bubble', 'yay!'],
  ['stamp', 'top secret'], ['stamp', 'approved'], ['stamp', 'void'], ['stamp', 'urgent'], ['stamp', 'do not read'],
  ['neon', 'love'], ['neon', 'tbh'], ['neon', 'so random'], ['neon', 'bye'], ['neon', 'idc'],
  ['tag', 'best day ever'], ['tag', 'worst day ever'], ['tag', 'core memory'], ['tag', 'note to self'], ['tag', 'remember this'],
  ['tag', 'ew'], ['tag', 'crush'], ['tag', 'drama'],
];

export const TAPES = {
  pink: 'linear-gradient(#ffb8d6, #ffb8d6)',
  lilac: 'linear-gradient(#d9c2ff, #d9c2ff)',
  mint: 'linear-gradient(#b5f0dc, #b5f0dc)',
  black: 'linear-gradient(#1c1a1f, #1c1a1f)',
  red: 'linear-gradient(#e0323f, #e0323f)',
  stripes: 'repeating-linear-gradient(45deg, #ff8fc0 0 7px, #ffe0ee 7px 14px)',
  'black stripes': 'repeating-linear-gradient(90deg, #18161a 0 8px, #f4f0f2 8px 16px)',
  dots: 'radial-gradient(circle, #fff 2.2px, transparent 2.8px) 0 0 / 12px 12px, #ff7bb3',
  'black dots': 'radial-gradient(circle, #ff6fae 2.2px, transparent 2.8px) 0 0 / 12px 12px, #1a171c',
  gingham: 'repeating-linear-gradient(90deg, rgba(255,70,140,.45) 0 8px, transparent 8px 16px), repeating-linear-gradient(0deg, rgba(255,70,140,.45) 0 8px, transparent 8px 16px), #fff4f8',
  hearts: svgTile(18, 18, "<path d='M9 15s-6-3.8-6-8a3.2 3.2 0 0 1 6-1.6A3.2 3.2 0 0 1 15 7c0 4.2-6 8-6 8z' fill='%23ff3d8b'/>", '#ffd5e6'),
  stars: svgTile(20, 20, "<path d='M10 3l2 4.6 5 .5-3.8 3.3 1.1 4.9L10 13.8 5.7 16.3l1.1-4.9L3 8.1l5-.5z' fill='%23ffe066'/>", '#2a2350'),
  bats: svgTile(28, 18, "<path d='M14 6c-1 0-1.4-1.6-1.4-1.6L12 6C9 4 6 5 4 7c2 0 3 1 3.4 2.6C9 9 11 10 14 13c3-3 5-4 6.6-3.4C21 8 22 7 24 7c-2-2-5-3-8-1l-.6-1.6S15 6 14 6z' fill='%23161218'/>", '#b98cff'),
  cherries: svgTile(24, 24, "<path d='M8 15 Q11 6 16 4 M16 15 Q15 9 16 4' stroke='%23365c2b' stroke-width='1.3' fill='none'/><circle cx='8' cy='17' r='3.6' fill='%23d81e3a'/><circle cx='16' cy='17' r='3.6' fill='%23e8283f'/>", '#fff6e8'),
  lace: svgTile(16, 16, "<circle cx='8' cy='8' r='5' fill='none' stroke='%23111' stroke-width='1.4'/><circle cx='0' cy='0' r='3' fill='%23111'/><circle cx='16' cy='0' r='3' fill='%23111'/><circle cx='0' cy='16' r='3' fill='%23111'/><circle cx='16' cy='16' r='3' fill='%23111'/>", '#ffc6dd'),
  rainbow: 'linear-gradient(90deg, #ff9aa2, #ffdac1, #e2f0cb, #b5ead7, #c7ceea, #e0bbe4)',
};

const EXTRAS = ['paperclip', 'bandaid', 'pin', 'heart pin', 'polaroid', 'ticket', 'cassette', 'note'];

export function svgTile(w, h, inner, bg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${bg ? `<rect width='100%' height='100%' fill='${bg.replace('#', '%23')}'/>` : ''}${inner}</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
}

// the tabs in the sticker drawer: [name, icon, sticker ids]
export const STICKER_TABS = [
  ...Object.entries(EMOJI_STICKERS).map(([name, codes]) => [name, `e:${codes[0]}`, codes.map(c => 'e:' + c)]),
  ['words', 'e:1f4ac', WORDS.map(([style, text]) => `w:${style}:${text}`)],
  ['tape', 'e:1f3f7-fe0f', Object.keys(TAPES).map(t => 't:' + t)],
  ['extras', 'e:1f4ce', EXTRAS.map(x => 'x:' + x)],
];

export const emojiURL = code => `stickers/${code}.webp`;

// the sticker itself (not placed anywhere yet)
export function stickerNode(id) {
  const [kind, ...rest] = id.split(':');
  const value = rest.join(':');
  if (kind === 'e') return h('img', { class: 'stk stk-emoji', src: emojiURL(value), alt: '', draggable: false });
  if (kind === 'w') {
    const [style, ...words] = value.split(':');
    const text = words.join(':');
    return h('span', { class: `stk stk-word stk-${style}`, dataset: { text } }, text);
  }
  if (kind === 't') return h('span', { class: 'stk stk-tape', style: { background: TAPES[value] || TAPES.pink } });
  if (kind === 'x') return extra(value);
  return h('span', { class: 'stk' });
}

function extra(name) {
  if (name === 'paperclip') {
    return h('span', { class: 'stk stk-x stk-clip', innerHTML: "<svg viewBox='0 0 30 80' width='30' height='80'><path d='M10 22 V62 a7 7 0 0 0 14 0 V14 a10 10 0 0 0 -20 0 V58' fill='none' stroke='#c9ccd3' stroke-width='3.4' stroke-linecap='round'/><path d='M10 22 V62 a7 7 0 0 0 14 0 V14 a10 10 0 0 0 -20 0 V58' fill='none' stroke='#fff' stroke-width='1' stroke-linecap='round' opacity='.7' transform='translate(-.8 -.8)'/></svg>" });
  }
  if (name === 'bandaid') return h('span', { class: 'stk stk-x stk-bandaid' }, h('i'));
  if (name === 'pin') return h('span', { class: 'stk stk-x stk-pin', style: { '--pin': '#ff3d7f' } });
  if (name === 'heart pin') return h('span', { class: 'stk stk-x stk-pin heart', style: { '--pin': '#e0234e' } });
  if (name === 'polaroid') return h('span', { class: 'stk stk-x stk-polaroid' }, h('i'));
  if (name === 'ticket') return h('span', { class: 'stk stk-x stk-ticket' }, 'ADMIT ONE');
  if (name === 'cassette') return h('span', { class: 'stk stk-x stk-cassette' }, h('i'), h('i'));
  if (name === 'note') return h('span', { class: 'stk stk-x stk-note' });
  return h('span', { class: 'stk' });
}
