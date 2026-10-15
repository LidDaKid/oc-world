// every sticker you can put on a diary page or cover.
//
// an item's sticker is a short string:
//   'e:1f987'            one of the 3d pictures in /stickers
//   'w:label:keep out'   a word sticker (style:text)
//   't:hearts'           a strip of washi tape
//   'x:paperclip'        a little drawn thing
//   'a:1f987'            a sticker that moves (google's animated emoji)
//   'd:heart:#ff3d8b'    a hand-drawn doodle in a color

import { h } from '../ui.js';
import { EMOJI_STICKERS, MORE_STICKERS, MOVING_STICKERS } from './sticker-list.js';
import { DOODLES, DOODLE_COLORS } from './doodles.js';

const WORDS = [
  ['label', 'keep out'], ['label', 'private'], ['label', 'dear diary'], ['label', 'today'], ['label', 'secret'],
  ['label', 'mood'], ['label', 'ugh'], ['label', 'no.'], ['label', 'whatever'], ['label', 'emo 4ever'],
  ['bubble', 'xoxo'], ['bubble', 'rawr'], ['bubble', 'omg'], ['bubble', 'bff'], ['bubble', 'lol'], ['bubble', 'ily'],
  ['bubble', 'hehe'], ['bubble', 'cute'], ['bubble', '<3'], ['bubble', ':3'], ['bubble', 'rawr xD'], ['bubble', 'yay!'],
  ['stamp', 'top secret'], ['stamp', 'approved'], ['stamp', 'void'], ['stamp', 'urgent'], ['stamp', 'do not read'],
  ['neon', 'love'], ['neon', 'tbh'], ['neon', 'so random'], ['neon', 'bye'], ['neon', 'idc'],
  ['tag', 'best day ever'], ['tag', 'worst day ever'], ['tag', 'core memory'], ['tag', 'note to self'], ['tag', 'remember this'],
  ['tag', 'ew'], ['tag', 'crush'], ['tag', 'drama'],
  ['label', 'stay weird'], ['label', 'nope'], ['label', 'not today'], ['label', 'brb'], ['label', 'sorry not sorry'],
  ['label', 'mine'], ['label', 'do not disturb'], ['label', 'sk8r'],
  ['bubble', 'xD'], ['bubble', 'bestie'], ['bubble', 'iconic'], ['bubble', 'oops'], ['bubble', 'zzz'], ['bubble', 'help'],
  ['bubble', 'babe'], ['bubble', 'iykyk'], ['bubble', 'gtg'],
  ['stamp', 'classified'], ['stamp', 'confidential'], ['stamp', 'certified emo'], ['stamp', 'paid'],
  ['neon', 'vibes'], ['neon', 'moody'], ['neon', 'rock on'], ['neon', 'dream'], ['neon', 'sigh'],
  ['tag', 'main character'], ['tag', 'scene queen'], ['tag', 'never forget'], ['tag', 'happy bday'], ['tag', 'he loves me'],
  ['tag', 'he loves me not'], ['tag', 'rawr means i love u'],
  ['glitter', 'love'], ['glitter', 'xoxo'], ['glitter', 'princess'], ['glitter', 'dream girl'], ['glitter', 'sparkle'], ['glitter', 'angel'],
  ['graffiti', 'emo'], ['graffiti', 'scene'], ['graffiti', 'rawr'], ['graffiti', 'punk'], ['graffiti', 'chaos'], ['graffiti', 'yolo'],
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
  'rainbow stripes': 'repeating-linear-gradient(90deg, #ff5d6c 0 8px, #ff9a3d 8px 16px, #ffd84d 16px 24px, #9be564 24px 32px, #6ec6ff 32px 40px, #b18cff 40px 48px)',
  checker: 'conic-gradient(#141114 25%, #fff 0 50%, #141114 0 75%, #fff 0) 0 0 / 14px 14px',
  'pink checker': 'conic-gradient(#ff6aad 25%, #ffe0ee 0 50%, #ff6aad 0 75%, #ffe0ee 0) 0 0 / 14px 14px',
  leopard: svgTile(30, 30, "<path d='M5 7c3-2 7 0 6 3s-5 1-6 0-2-2 0-3zM20 4c3-1 6 1 5 4-2 2-4 0-5 0s-2-3 0-4zM12 19c3-2 7 0 6 3s-5 1-6 0-2-2 0-3zM25 20c2-1 5 1 4 3-2 2-3 0-4 0s-2-2 0-3z' fill='none' stroke='%232a1408' stroke-width='1.6'/>", '#d9a35c'),
  zebra: svgTile(40, 34, "<path d='M0 4 Q10 10 20 3 T40 5 V9 Q30 13 20 8 T0 9Z M0 19 Q12 25 22 17 T40 20 V24 Q28 28 20 22 T0 24Z' fill='%23141114'/>", '#ffffff'),
  'pink zebra': svgTile(40, 34, "<path d='M0 4 Q10 10 20 3 T40 5 V9 Q30 13 20 8 T0 9Z M0 19 Q12 25 22 17 T40 20 V24 Q28 28 20 22 T0 24Z' fill='%23141114'/>", '#ff6aad'),
  skulls: svgTile(22, 22, "<path d='M11 4c-4 0-6 2.5-6 6 0 2 1 3 2 3.5V16h8v-2.5c1-.5 2-1.5 2-3.5 0-3.5-2-6-6-6z' fill='%23fff'/><circle cx='8.6' cy='10' r='1.5' fill='%23141114'/><circle cx='13.4' cy='10' r='1.5' fill='%23141114'/>", '#141114'),
  music: svgTile(26, 22, "<path d='M8 16V5l10-2v10' stroke='%23141114' stroke-width='1.4' fill='none'/><ellipse cx='6' cy='16' rx='2.6' ry='2' fill='%23141114'/><ellipse cx='16' cy='14' rx='2.6' ry='2' fill='%23141114'/>", '#fff4f8'),
  strawberries: svgTile(24, 24, "<path d='M12 8c-5 0-7 3-6 6 1 4 4 7 6 7s5-3 6-7c1-3-1-6-6-6z' fill='%23e8283f'/><path d='M8 8l4-3 4 3-4 1z' fill='%233a8a3c'/><g fill='%23ffe066'><circle cx='10' cy='12' r='.7'/><circle cx='14' cy='12' r='.7'/><circle cx='12' cy='15' r='.7'/><circle cx='10' cy='17' r='.7'/><circle cx='14' cy='17' r='.7'/></g>", '#ffe3ec'),
  butterflies: svgTile(26, 24, "<path d='M13 12C9 4 3 5 4 10c1 3 5 3 9 2zM13 12c4-8 10-7 9-2-1 3-5 3-9 2zM13 12c-4 1-7 5-5 7 2 1 4-2 5-7zM13 12c4 1 7 5 5 7-2 1-4-2-5-7z' fill='%23b98cff'/>", '#e9f6ff'),
  clouds: svgTile(30, 22, "<path d='M7 15c-3 0-3-4 0-4 0-3 4-4 5-1 1-3 6-2 5 1 3 0 3 4 0 4z' fill='%23fff'/>", '#a9dcff'),
  'gold foil': 'linear-gradient(100deg, #b4831d, #fff1a8 30%, #d6a53a 50%, #fff6c8 70%, #9a6a12)',
  'silver foil': 'linear-gradient(100deg, #8d919c, #ffffff 30%, #b9bdc9 50%, #f4f5f8 70%, #6d717d)',
  holo: 'linear-gradient(100deg, #ffc9ec, #c4ecff 25%, #e6cfff 45%, #cfffe9 65%, #fff1c4 85%)',
  glitter: 'radial-gradient(circle, #fff 1px, transparent 1.6px) 0 0 / 6px 6px, radial-gradient(circle, #ffd1e8 1px, transparent 1.6px) 3px 3px / 7px 7px, #ff5fa8',
  kraft: 'linear-gradient(#c9a77c, #b8935f)',
};

const EXTRAS = ['paperclip', 'bandaid', 'pin', 'heart pin', 'polaroid', 'ticket', 'cassette', 'note', 'bow', 'black bow', 'kiss',
  'gold star', 'silver star', 'heart foil', 'postage', 'film', 'doily', 'torn note', 'lined scrap', 'cd', 'safety pin', 'gem', 'smiley sticker'];

export function svgTile(w, h, inner, bg) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${bg ? `<rect width='100%' height='100%' fill='${bg.replace('#', '%23')}'/>` : ''}${inner}</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
}

// the tabs in the sticker drawer: [name, icon, sticker ids]
export const STICKER_TABS = [
  ...Object.entries(EMOJI_STICKERS).map(([name, codes]) => [name, `e:${codes[0]}`, codes.map(c => 'e:' + c)]),
  ['moving', 'e:2728', MOVING_STICKERS.map(c => 'a:' + c)],
  ['doodles', 'e:270f-fe0f', Object.keys(DOODLES).flatMap(name => DOODLE_COLORS.map(c => `d:${name}:${c}`))],
  ['words', 'e:1f4ac', WORDS.map(([style, text]) => `w:${style}:${text}`)],
  ['tape', 'e:1f3f7-fe0f', Object.keys(TAPES).map(t => 't:' + t)],
  ['extras', 'e:1f4ce', EXTRAS.map(x => 'x:' + x)],
  ...Object.entries(MORE_STICKERS).map(([name, codes]) => [name, `e:${codes[0]}`, codes.map(c => 'e:' + c)]),
];

export const emojiURL = code => `stickers/${code}.webp`;
export const movingURL = code => `https://fonts.gstatic.com/s/e/notoemoji/latest/${code.replace(/-/g, '_')}/512.webp`;

// the sticker itself (not placed anywhere yet)
export function stickerNode(id) {
  const [kind, ...rest] = id.split(':');
  const value = rest.join(':');
  if (kind === 'e') return h('img', { class: 'stk stk-emoji', src: emojiURL(value), alt: '', draggable: false, loading: 'lazy' });
  if (kind === 'a') return h('img', { class: 'stk stk-emoji stk-moving', src: movingURL(value), alt: '', draggable: false, loading: 'lazy' });
  if (kind === 'd') {
    const [name, color] = value.split(':');
    return h('span', { class: 'stk stk-doodle', style: { color }, innerHTML: `<svg viewBox='0 0 100 100' width='90' height='90'>${DOODLES[name] || ''}</svg>` });
  }
  if (kind === 'w') {
    const [style, ...words] = value.split(':');
    const text = words.join(':');
    return h('span', { class: `stk stk-word stk-${style}`, dataset: { text } }, text);
  }
  if (kind === 't') return h('span', { class: 'stk stk-tape', style: { background: TAPES[value] || TAPES.pink } });
  if (kind === 'x') return extra(value);
  return h('span', { class: 'stk' });
}

// a drawn sticker. plain = no white die-cut edge
function svgSticker(w, ht, inner, plain) {
  return h('span', { class: 'stk stk-x stk-svg' + (plain ? ' plain' : ''), innerHTML: `<svg viewBox='0 0 ${w} ${ht}' width='${w}' height='${ht}'>${inner}</svg>` });
}

const ring = (n, r, dot, cx = 60) => Array.from({ length: n }, (_, i) =>
  `<circle cx='${(cx + r * Math.cos(i * 2 * Math.PI / n)).toFixed(1)}' cy='${(cx + r * Math.sin(i * 2 * Math.PI / n)).toFixed(1)}' r='${dot}'/>`).join('');

function extra(name) {
  if (name === 'bow' || name === 'black bow') {
    const c = name === 'bow' ? '#ff5fa8' : '#141114', d = name === 'bow' ? '#c2185b' : '#000';
    return svgSticker(110, 82, `<path d='M55 40 C35 10 5 12 8 34 C10 54 36 52 55 40Z M55 40 C75 10 105 12 102 34 C100 54 74 52 55 40Z' fill='${c}' stroke='${d}' stroke-width='2'/><path d='M55 40 L38 78 L48 74 L52 80 L55 44 L58 80 L62 74 L72 78Z' fill='${c}' stroke='${d}' stroke-width='2'/><ellipse cx='55' cy='40' rx='9' ry='11' fill='${d}'/><path d='M20 26 Q30 22 40 32' stroke='#fff' stroke-width='3' opacity='.45' fill='none' stroke-linecap='round'/>`);
  }
  if (name === 'kiss') return svgSticker(100, 70, "<path d='M8 36 C20 14 40 10 50 22 C60 10 80 14 92 36 C76 34 62 36 50 40 C38 36 24 34 8 36Z' fill='#d81e3a'/><path d='M8 38 C24 40 38 42 50 44 C62 42 76 40 92 38 C80 60 64 66 50 64 C36 66 20 60 8 38Z' fill='#c0102c'/><path d='M22 28 Q30 22 40 26' stroke='#ff8aa0' stroke-width='3' fill='none' stroke-linecap='round' opacity='.6'/>", true);
  if (name === 'gold star' || name === 'silver star') {
    const g = name === 'gold star' ? ['#fff6c8', '#e8b94a', '#9a6a12'] : ['#ffffff', '#c7cad3', '#6d717d'];
    const id = 'g' + g[1].slice(1);
    return svgSticker(90, 90, `<defs><linearGradient id='${id}' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${g[0]}'/><stop offset='.5' stop-color='${g[1]}'/><stop offset='1' stop-color='${g[2]}'/></linearGradient></defs><path d='M45 4 L56 32 L86 33 L62 52 L71 82 L45 64 L19 82 L28 52 L4 33 L34 32Z' fill='url(#${id})'/>`);
  }
  if (name === 'heart foil') return svgSticker(90, 84, "<defs><linearGradient id='hf' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ffc9ec'/><stop offset='.35' stop-color='#c4ecff'/><stop offset='.65' stop-color='#e6cfff'/><stop offset='1' stop-color='#ff8ac4'/></linearGradient></defs><path d='M45 80 C14 60 2 40 10 22 C20 4 40 8 45 24 C50 8 70 4 80 22 C88 40 76 60 45 80Z' fill='url(#hf)'/>");
  if (name === 'postage') return h('span', { class: 'stk stk-x stk-postage' }, h('i', {}, '♡'), h('b', {}, '25'));
  if (name === 'film') return h('span', { class: 'stk stk-x stk-film' }, h('i'), h('i'), h('i'));
  if (name === 'doily') return svgSticker(120, 120, `<g fill='#fdfcf8'><circle cx='60' cy='60' r='44'/>${ring(16, 48, 10)}</g><g fill='none' stroke='#e7ddd0' stroke-width='1.5'><circle cx='60' cy='60' r='34'/><circle cx='60' cy='60' r='22'/></g><g fill='#e7ddd0'>${ring(12, 28, 2.6)}${ring(16, 46, 3)}</g>`, true);
  if (name === 'torn note') return h('span', { class: 'stk stk-x stk-torn' });
  if (name === 'lined scrap') return h('span', { class: 'stk stk-x stk-scrap' });
  if (name === 'cd') return h('span', { class: 'stk stk-x stk-cd' });
  if (name === 'safety pin') return svgSticker(120, 44, "<path d='M14 22 C4 22 4 34 14 34 H104 M14 22 H96 C102 22 104 28 100 30 L92 34' fill='none' stroke='#c9ccd3' stroke-width='4' stroke-linecap='round'/><rect x='92' y='16' width='20' height='22' rx='4' fill='#b0b4bd'/>", true);
  if (name === 'gem') return svgSticker(80, 72, "<path d='M14 4 H66 L78 24 L40 70 L2 24Z' fill='#ff4fa3'/><path d='M14 4 L26 24 L40 70 M66 4 L54 24 L40 70 M2 24 H78 M26 24 L40 4 L54 24' stroke='#ffd1e8' stroke-width='1.5' fill='none'/><path d='M18 10 L28 10 L22 20Z' fill='#fff' opacity='.7'/>");
  if (name === 'smiley sticker') return svgSticker(90, 90, "<circle cx='45' cy='45' r='40' fill='#ffd84d'/><ellipse cx='32' cy='36' rx='5' ry='8' fill='#141114'/><ellipse cx='58' cy='36' rx='5' ry='8' fill='#141114'/><path d='M24 54 Q45 76 66 54' stroke='#141114' stroke-width='5' fill='none' stroke-linecap='round'/>");
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
