// how a diary looks from the outside: the cover materials, the front of the cover, and the 3d book.
// everything is drawn at one fixed size (W x H) and scaled with css, so stickers + writing land in the
// same spot on every screen.

import { h } from '../ui.js';
import { store } from '../store.js';
import { svgTile } from './stickers.js';
import { itemNode } from './items.js';

export const W = 420, H = 600;

const noise = (alpha, freq = .9) => svgTile(220, 220,
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/>`);
const sparkle = (a, b) => `radial-gradient(circle, ${a} .7px, transparent 1.3px) 0 0 / 7px 7px, radial-gradient(circle, ${b} 1px, transparent 1.6px) 3px 4px / 11px 11px, radial-gradient(circle, #fff 1.1px, transparent 1.8px) 6px 2px / 17px 17px`;
const marble = svgTile(260, 260,
  "<filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='.06 .09' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.6 2.6 2.6 0 -2.05'/><feComponentTransfer><feFuncA type='discrete' tableValues='0 1'/></feComponentTransfer></filter><rect width='100%' height='100%' fill='%23111'/><rect width='100%' height='100%' filter='url(%23m)'/>");
const leopard = svgTile(100, 100,
  "<g transform='translate(14 16) rotate(0)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(52 10) rotate(40)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(80 40) rotate(100)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(34 48) rotate(200)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(66 74) rotate(300)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(14 78) rotate(60)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(44 92) rotate(150)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(92 92) rotate(20)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(-4 40) rotate(250)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g fill='%23231208'><circle cx='30' cy='26' r='2.4'/><circle cx='70' cy='22' r='2'/><circle cx='88' cy='62' r='2.2'/><circle cx='24' cy='62' r='1.8'/><circle cx='56' cy='56' r='2'/><circle cx='4' cy='96' r='2'/></g>", '#d9a35c');
const web = svgTile(120, 120,
  "<g stroke='%23d8d0e0' stroke-width='.7' fill='none' opacity='.55'><path d='M0 0L120 120M120 0L0 120M60 0V120M0 60H120'/><path d='M60 20L88 32L100 60L88 88L60 100L32 88L20 60L32 32Z'/><path d='M60 38L76 44L82 60L76 76L60 82L44 76L38 60L44 44Z'/><path d='M60 4L100 20L116 60L100 100L60 116L20 100L4 60L20 20Z'/></g>");

// [id, name, background, { ink, stitch, spine, gloss }]
export const PRESETS = [
  ['leather', 'black leather', `${noise(.5, .55)}, radial-gradient(120% 90% at 30% 20%, #3a3236, #141012)`, { stitch: '#8d8489', ink: '#d9d4d8' }],
  ['leather-brown', 'brown leather', `${noise(.45, .55)}, radial-gradient(120% 90% at 30% 20%, #8a5638, #4a2a18)`, { stitch: '#e0b98d', ink: '#f3dcb8' }],
  ['leather-pink', 'pink leather', `${noise(.35, .55)}, radial-gradient(120% 90% at 30% 20%, #ff86bd, #c22f74)`, { stitch: '#ffe0ee', ink: '#fff2f8' }],
  ['velvet', 'pink velvet', `${noise(.3, 1.4)}, linear-gradient(135deg, #ff8ec4 0%, #d0186c 35%, #ff7ab8 55%, #a3104f 100%)`, { ink: '#ffe6f2' }],
  ['velvet-purple', 'purple velvet', `${noise(.3, 1.4)}, linear-gradient(135deg, #b98cff 0%, #4b1d8f 40%, #9a63f0 58%, #2a0d55 100%)`, { ink: '#efe2ff' }],
  ['patent', 'black patent', 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,.22) 28%, transparent 34%, transparent 62%, rgba(255,255,255,.12) 68%, transparent 72%), linear-gradient(180deg, #2b2b30, #050506)', { gloss: true, ink: '#f0f0f4' }],
  ['patent-red', 'cherry patent', 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,.3) 28%, transparent 34%, transparent 62%, rgba(255,255,255,.16) 68%, transparent 72%), linear-gradient(180deg, #d81b3a, #6e0013)', { gloss: true, ink: '#fff0f2' }],
  ['glitter-pink', 'pink glitter', `${sparkle('#ffd1e8', '#ff9ccc')}, linear-gradient(160deg, #ff69b0, #e0328a 50%, #ff8cc4)`, { ink: '#fff' }],
  ['glitter-black', 'black glitter', `${sparkle('#9a8ea6', '#ff8cc4')}, linear-gradient(160deg, #2a2230, #0d0a10 50%, #241c2a)`, { ink: '#ffd6ea' }],
  ['glitter-silver', 'silver glitter', `${sparkle('#ffffff', '#b9bdc9')}, linear-gradient(160deg, #e6e8ef, #9ea3b0 50%, #d9dce5)`, { ink: '#2a2530' }],
  ['holo', 'holographic', `${noise(.12)}, linear-gradient(120deg, #ffc9ec, #c4ecff 20%, #e6cfff 38%, #cfffe9 55%, #fff1c4 72%, #ffc9ec 90%)`, { gloss: true, ink: '#5a3d74' }],
  ['plaid', 'red plaid', 'repeating-linear-gradient(90deg, rgba(0,0,0,.38) 0 18px, transparent 18px 36px, rgba(255,240,180,.25) 36px 38px, transparent 38px 72px), repeating-linear-gradient(0deg, rgba(0,0,0,.38) 0 18px, transparent 18px 36px, rgba(255,240,180,.25) 36px 38px, transparent 38px 72px), #b0141f', { ink: '#fff6dc' }],
  ['plaid-pink', 'pink plaid', 'repeating-linear-gradient(90deg, rgba(20,10,20,.5) 0 14px, transparent 14px 32px, rgba(255,255,255,.5) 32px 34px, transparent 34px 64px), repeating-linear-gradient(0deg, rgba(20,10,20,.5) 0 14px, transparent 14px 32px, rgba(255,255,255,.5) 32px 34px, transparent 34px 64px), #ff7eb6', { ink: '#1a0f18' }],
  ['plaid-purple', 'purple plaid', 'repeating-linear-gradient(90deg, rgba(0,0,0,.45) 0 16px, transparent 16px 34px, rgba(125,249,208,.4) 34px 36px, transparent 36px 68px), repeating-linear-gradient(0deg, rgba(0,0,0,.45) 0 16px, transparent 16px 34px, rgba(125,249,208,.4) 34px 36px, transparent 36px 68px), #5b2a9a', { ink: '#f4ecff' }],
  ['stripes', 'pink + black stripes', 'repeating-linear-gradient(90deg, #141114 0 26px, #ff5fa8 26px 52px)', { ink: '#fff' }],
  ['stripes-candy', 'candy stripes', 'repeating-linear-gradient(135deg, #fff 0 18px, #ff8cc0 18px 36px)', { ink: '#c2185b' }],
  ['checker', 'checkerboard', 'conic-gradient(#141114 25%, #f6f2f4 0 50%, #141114 0 75%, #f6f2f4 0) 0 0 / 52px 52px', { ink: '#ff3d8b' }],
  ['checker-pink', 'pink checkerboard', 'conic-gradient(#ff6aad 25%, #ffd9ea 0 50%, #ff6aad 0 75%, #ffd9ea 0) 0 0 / 52px 52px', { ink: '#1a0f18' }],
  ['composition', 'composition book', marble, { spine: '#111', ink: '#111', stitch: null }],
  ['hearts', 'hearts', `${svgTile(46, 46, "<path d='M23 37s-13-8.3-13-17.5a7 7 0 0 1 13-3.5 7 7 0 0 1 13 3.5C36 28.7 23 37 23 37z' fill='%23ff3d8b'/>")} 0 0 / 46px 46px, #ffd2e5`, { ink: '#a3104f' }],
  ['black-hearts', 'black hearts', `${svgTile(46, 46, "<path d='M23 37s-13-8.3-13-17.5a7 7 0 0 1 13-3.5 7 7 0 0 1 13 3.5C36 28.7 23 37 23 37z' fill='%23141114'/>")} 0 0 / 46px 46px, #ff7eb6`, { ink: '#141114' }],
  ['stars', 'stars', `${svgTile(50, 50, "<path d='M25 9l4.2 9.3 10.2 1-7.7 6.8 2.3 10L25 31l-9 5.1 2.3-10-7.7-6.8 10.2-1z' fill='%23ffe066'/><circle cx='6' cy='44' r='1.4' fill='%23fff'/><circle cx='44' cy='6' r='1' fill='%23fff'/>")} 0 0 / 50px 50px, linear-gradient(#1d1846, #2d2466)`, { ink: '#ffe066' }],
  ['bats', 'bats', `${svgTile(64, 48, "<path d='M32 18c-2 0-3-3.5-3-3.5L27.6 18C21 13.5 14 15.5 9.5 20c4.5 0 6.8 2.2 7.6 5.8C21 24.5 25.5 26.5 32 33c6.5-6.5 11-8.5 14.9-7.2.8-3.6 3.1-5.8 7.6-5.8-4.5-4.5-11.5-6.5-18.1-2L35 14.5S34 18 32 18z' fill='%23140f17'/>")} 0 0 / 64px 48px, linear-gradient(#b98cff, #8f5de0)`, { ink: '#140f17' }],
  ['webs', 'spiderwebs', `${web} 0 0 / 120px 120px, radial-gradient(120% 90% at 50% 30%, #2a2430, #0b090d)`, { ink: '#e8e0f0' }],
  ['cherries', 'cherries', `${svgTile(54, 54, "<path d='M18 33 Q24 14 36 10 M36 33 Q34 20 36 10' stroke='%23365c2b' stroke-width='2' fill='none'/><path d='M36 10 q8 -2 10 4 q-7 2 -10 -4z' fill='%234f8a3c'/><circle cx='18' cy='37' r='7.5' fill='%23d81e3a'/><circle cx='36' cy='37' r='7.5' fill='%23e8283f'/><circle cx='15.5' cy='34.5' r='2' fill='%23fff' opacity='.6'/><circle cx='33.5' cy='34.5' r='2' fill='%23fff' opacity='.6'/>")} 0 0 / 54px 54px, #fff4e4`, { ink: '#a3121f' }],
  ['leopard', 'leopard', `${leopard} 0 0 / 150px 150px`, { ink: '#2a1306' }],
  ['denim', 'denim', `${noise(.35, 1.1)}, repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1px, transparent 1px 4px), linear-gradient(160deg, #4f72a8, #2c4b7a)`, { stitch: '#e8a54b', ink: '#fff' }],
  ['kraft', 'kraft paper', `${noise(.4, .8)}, linear-gradient(160deg, #caa477, #b48a5c)`, { ink: '#3b2614' }],
  ['lace', 'black lace', `${svgTile(36, 36, "<g fill='none' stroke='%23120e14' stroke-width='1.6'><circle cx='18' cy='18' r='9'/><circle cx='18' cy='18' r='4'/><path d='M0 18h4M32 18h4M18 0v4M18 32v4'/></g><g fill='%23120e14'><circle cx='0' cy='0' r='5'/><circle cx='36' cy='0' r='5'/><circle cx='0' cy='36' r='5'/><circle cx='36' cy='36' r='5'/></g>")} 0 0 / 36px 36px, #ff9cc8`, { ink: '#120e14' }],
  ['galaxy', 'galaxy', `${sparkle('#ffffff', '#ffd1f0')}, radial-gradient(60% 50% at 30% 30%, rgba(255,90,180,.55), transparent), radial-gradient(60% 60% at 75% 70%, rgba(90,140,255,.5), transparent), #120a2a`, { ink: '#fff' }],
  ['solid', 'plain color', null, { gloss: true }],
];

export const preset = id => PRESETS.find(p => p[0] === id) || PRESETS[0];

export function material(cover) {
  const [, , bg] = preset(cover.preset);
  return bg || `${noise(.18)}, ${cover.color || '#ff4fa3'}`;
}

// title styles: how the name on the cover is printed
export const TITLE_STYLES = ['foil', 'silver', 'plate', 'label', 'bubble', 'plain'];

export const COVER_FONTS = [
  { id: 'fancy', css: "'Playfair Display', serif" },
  { id: 'handwritten', css: "'Caveat', cursive", scale: 1.25 },
  { id: 'marker', css: "'Permanent Marker', cursive" },
  { id: 'scribble', css: "'Homemade Apple', cursive", scale: .8 },
  { id: 'indie', css: "'Indie Flower', cursive" },
  { id: 'typewriter', css: "'Special Elite', monospace" },
  { id: 'pixel', css: "'Pixelify Sans', sans-serif" },
  { id: 'bubbly', css: "'Fredoka', sans-serif" },
  { id: 'spooky', css: "'Creepster', system-ui", scale: 1.1 },
  { id: 'glitch', css: "'Rubik Glitch', system-ui" },
  { id: 'graffiti', css: "'Sedgwick Ave Display', cursive", scale: 1.15 },
  { id: 'gothic', css: "'UnifrakturMaguntia', serif", scale: 1.05 },
];
export const coverFont = id => COVER_FONTS.find(f => f.id === id) || COVER_FONTS[0];

// the front of the cover. pass a layer to put the stickers in (the cover designer gives an editable one)
export function coverFace(diary, layer) {
  const c = diary.cover;
  const [, , , opts] = preset(c.preset);
  const face = h('div', { class: 'cover-face' + (opts.gloss ? ' gloss' : '') });
  face.style.background = material(c);
  if (c.pic.imageId) {
    const img = h('img', { class: 'cover-pic', alt: '', draggable: false });
    store.imageURL(c.pic.imageId).then(url => { if (url) img.src = url; });
    face.append(img);
  }
  if (c.stitch && opts.stitch !== null) face.append(h('div', { class: 'cover-stitch', style: { '--stitch': opts.stitch || '#ffffffaa' } }));
  face.append(h('div', { class: 'cover-shine' }));
  if (c.corners) face.append(...['tl', 'tr', 'bl', 'br'].map(k => h('i', { class: 'cover-corner ' + k })));
  face.append(layer || staticItems(c.items, diary));
  if (c.band) face.append(h('div', { class: 'cover-band', style: { '--band': c.bandColor } }));
  return face;
}

export function staticItems(items, diary) {
  return h('div', { class: 'items' }, items.map(it => itemNode(it, diary)));
}

export const thickness = diary => Math.round(Math.min(84, 46 + diary.pages.length * .4));

// the whole closed book in 3d. scale = how big it shows (1 = W x H)
export function book3d(diary, { scale = 1 } = {}) {
  const c = diary.cover;
  const T = thickness(diary);
  const [, , , opts] = preset(c.preset);
  const bg = material(c);
  const font = coverFont(c.title.font);
  const box = h('div', { class: 'b3d', style: { '--t': T + 'px' } });
  const front = h('div', { class: 'b3d-front' }, coverFace(diary));
  const inside = h('div', { class: 'b3d-inside', style: { background: bg } });
  front.append(inside);
  const firstPage = h('div', { class: `b3d-firstpage paper paper-${diary.paper.kind} paper-${diary.paper.color}` });
  const spine = h('div', { class: 'b3d-spine', style: { background: opts.spine || bg } },
    h('span', { class: 'b3d-spine-title', style: { fontFamily: font.css, color: c.title.color || opts.ink || '#fff' } }, c.title.text));
  const back = h('div', { class: 'b3d-back', style: { background: bg } });
  if (c.band) back.append(h('div', { class: 'cover-band', style: { '--band': c.bandColor } }));
  box.append(back, firstPage,
    h('div', { class: 'b3d-pages right' }),
    h('div', { class: 'b3d-pages top' }),
    h('div', { class: 'b3d-pages bottom' }),
    spine, front,
    c.ribbon ? h('div', { class: 'b3d-ribbon', style: { '--ribbon': c.ribbonColor } }) : null);
  const scene = h('div', { class: 'b3d-scene', style: { '--s': scale, width: W * scale + 'px', height: H * scale + 'px' } }, box);
  scene.box = box;
  scene.front = front;
  return scene;
}
