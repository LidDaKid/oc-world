// how a diary looks from the outside: the cover materials, the front of the cover, and the 3d book.
// everything is drawn at the diary's own size (w x h page pixels) and scaled with css, so stickers + writing land in the
// same spot on every screen.

import { h } from '../ui.js';
import { store } from '../store.js';
import { svgTile } from './stickers.js';
import { itemNode } from './items.js';

// how big the book is. w x h = one page (and the front cover) in page pixels
export const SIZES = [
  { id: 'pocket', w: 330, h: 500 },
  { id: 'slim', w: 340, h: 620 },
  { id: 'classic', w: 420, h: 600 },
  { id: 'big', w: 500, h: 680 },
  { id: 'square', w: 520, h: 520 },
];
export const dims = diary => SIZES.find(s => s.id === diary.size) || SIZES[2];
export const BIGGEST = { w: 520, h: 680 };
// css variables every page / cover / book uses for its size
export const sizeVars = diary => ({ '--w': dims(diary).w + 'px', '--h': dims(diary).h + 'px' });

const noise = (alpha, freq = .9) => svgTile(220, 220,
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/>`);
const sparkle = (a, b) => `radial-gradient(circle, ${a} .7px, transparent 1.3px) 0 0 / 7px 7px, radial-gradient(circle, ${b} 1px, transparent 1.6px) 3px 4px / 11px 11px, radial-gradient(circle, #fff 1.1px, transparent 1.8px) 6px 2px / 17px 17px`;
const marble = svgTile(260, 260,
  "<filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='.06 .09' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.6 2.6 2.6 0 -2.05'/><feComponentTransfer><feFuncA type='discrete' tableValues='0 1'/></feComponentTransfer></filter><rect width='100%' height='100%' fill='%23111'/><rect width='100%' height='100%' filter='url(%23m)'/>");
const leopard = svgTile(100, 100,
  "<g transform='translate(14 16) rotate(0)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(52 10) rotate(40)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(80 40) rotate(100)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(34 48) rotate(200)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(66 74) rotate(300)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(14 78) rotate(60)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(44 92) rotate(150)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(92 92) rotate(20)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g transform='translate(-4 40) rotate(250)'><ellipse rx='7' ry='5.5' fill='%23b8732f'/><path d='M-8 -3 Q-9 -8 -3 -8.5 M2 -8.5 Q8 -8 8.5 -2 M8 3 Q6 8 0 8.4 M-4 8 Q-9 6 -9 1' stroke='%23231208' stroke-width='3.2' fill='none' stroke-linecap='round'/></g><g fill='%23231208'><circle cx='30' cy='26' r='2.4'/><circle cx='70' cy='22' r='2'/><circle cx='88' cy='62' r='2.2'/><circle cx='24' cy='62' r='1.8'/><circle cx='56' cy='56' r='2'/><circle cx='4' cy='96' r='2'/></g>", '#d9a35c');
const web = svgTile(120, 120,
  "<g stroke='%23d8d0e0' stroke-width='.7' fill='none' opacity='.55'><path d='M0 0L120 120M120 0L0 120M60 0V120M0 60H120'/><path d='M60 20L88 32L100 60L88 88L60 100L32 88L20 60L32 32Z'/><path d='M60 38L76 44L82 60L76 76L60 82L44 76L38 60L44 44Z'/><path d='M60 4L100 20L116 60L100 100L60 116L20 100L4 60L20 20Z'/></g>");

const zebra = ink => svgTile(120, 120, `<g fill='${ink.replace('#', '%23')}'><path d='M0 8 Q20 18 40 6 T80 10 T120 6 V16 Q100 26 80 18 T40 20 T0 18Z'/><path d='M0 40 Q24 52 46 38 Q66 28 84 44 Q100 56 120 42 V50 Q100 64 82 52 Q64 40 46 50 Q24 62 0 48Z'/><path d='M0 74 Q14 66 30 78 T70 74 Q90 64 120 78 V86 Q92 74 72 86 T30 88 Q14 76 0 84Z'/><path d='M0 104 Q30 96 54 108 T120 104 V112 Q86 104 56 116 T0 112Z'/></g>`);
const spots = (ring, mid) => svgTile(150, 150, [[20, 22, 0], [78, 16, 40], [124, 56, 100], [50, 70, 200], [100, 110, 300], [22, 116, 60], [66, 138, 150], [138, 138, 20]]
  .map(([x, y, r]) => `<g transform='translate(${x} ${y}) rotate(${r})'><ellipse rx='10' ry='8' fill='${mid.replace('#', '%23')}'/><path d='M-12 -4 Q-13 -12 -4 -12.5 M3 -12.5 Q12 -12 12.5 -3 M12 4 Q9 12 0 12.5 M-6 12 Q-13 9 -13 1' stroke='${ring.replace('#', '%23')}' stroke-width='4.5' fill='none' stroke-linecap='round'/></g>`).join(''));
const quilt = line => svgTile(60, 60, `<path d='M0 0L60 60M60 0L0 60' stroke='${line.replace('#', '%23')}' stroke-width='1.6' opacity='.55'/><path d='M0 1L59 60M1 0L60 59' stroke='%23fff' stroke-width='.8' opacity='.25'/><circle cx='30' cy='30' r='2.2' fill='${line.replace('#', '%23')}' opacity='.7'/><circle cx='0' cy='0' r='2.2' fill='${line.replace('#', '%23')}' opacity='.7'/><circle cx='60' cy='60' r='2.2' fill='${line.replace('#', '%23')}' opacity='.7'/><circle cx='60' cy='0' r='2.2' fill='${line.replace('#', '%23')}' opacity='.7'/><circle cx='0' cy='60' r='2.2' fill='${line.replace('#', '%23')}' opacity='.7'/>`);
const croc = svgTile(46, 40, "<g fill='none' stroke='%23000' stroke-opacity='.45' stroke-width='1.5'><path d='M3 3h17v14H3zM26 3h17v14H26zM14 23h18v14H14zM-9 23h18v14H-9zM37 23h18v14H37z' rx='4'/></g><g fill='%23fff' fill-opacity='.12'><path d='M5 5h13v4H5zM28 5h13v4H28zM16 25h14v4H16z'/></g>");

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
  ['zebra', 'zebra', `${zebra('#141114')} 0 0 / 120px 120px, #f6f2f4`, { ink: '#ff3d8b' }],
  ['zebra-pink', 'pink zebra', `${zebra('#141114')} 0 0 / 120px 120px, #ff6aad`, { ink: '#fff' }],
  ['zebra-rainbow', 'rainbow zebra', `${zebra('#141114')} 0 0 / 120px 120px, linear-gradient(135deg, #ff5d6c, #ff9a3d, #ffd84d, #9be564, #6ec6ff, #b18cff, #ff6aad)`, { ink: '#fff' }],
  ['cheetah-pink', 'pink leopard', `${spots('#141114', '#ff3d8b')} 0 0 / 150px 150px, #ffb3d1`, { ink: '#141114' }],
  ['quilted', 'pink quilted', `${quilt('#c2185b')} 0 0 / 60px 60px, radial-gradient(120% 90% at 30% 20%, #ff9ccc, #e0458f)`, { ink: '#fff', gloss: true }],
  ['quilted-black', 'black quilted', `${quilt('#000')} 0 0 / 60px 60px, radial-gradient(120% 90% at 30% 20%, #3a3236, #121012)`, { ink: '#e8e0e8', gloss: true }],
  ['fur-pink', 'fuzzy pink', `${noise(.55, 2.6)}, ${noise(.35, 1.6)}, radial-gradient(120% 90% at 40% 30%, #ffc2de, #ff7ab8)`, { ink: '#c2185b' }],
  ['fur-black', 'fuzzy black', `${noise(.7, 2.6)}, radial-gradient(120% 90% at 40% 30%, #3a3438, #141114)`, { ink: '#ff8ac4' }],
  ['sequin', 'pink sequins', 'radial-gradient(circle at 35% 35%, #fff 0 8%, #ffb3d6 14%, #ff3d8b 42%, #a3104f 62%, transparent 64%) 0 0 / 14px 14px, radial-gradient(circle at 35% 35%, #fff 0 8%, #ffb3d6 14%, #ff3d8b 42%, #a3104f 62%, transparent 64%) 7px 7px / 14px 14px, #7a0c3b', { ink: '#fff' }],
  ['sequin-black', 'black sequins', 'radial-gradient(circle at 35% 35%, #fff 0 8%, #8d8a95 16%, #2a2730 44%, #0c0b0e 62%, transparent 64%) 0 0 / 14px 14px, radial-gradient(circle at 35% 35%, #fff 0 8%, #8d8a95 16%, #2a2730 44%, #0c0b0e 62%, transparent 64%) 7px 7px / 14px 14px, #060507', { ink: '#ffd6ea' }],
  ['chrome', 'chrome', 'linear-gradient(170deg, #f4f5f8 0%, #9ea3b0 22%, #ffffff 38%, #5f636e 52%, #d9dce5 70%, #8d919c 86%, #ffffff 100%)', { gloss: true, ink: '#2a2530' }],
  ['gold', 'gold', 'linear-gradient(170deg, #fff1a8 0%, #b4831d 24%, #fff6c8 40%, #8a5c0e 54%, #f6d77a 72%, #a87418 88%, #fff1a8 100%)', { gloss: true, ink: '#3b2606' }],
  ['croc', 'black croc', `${croc} 0 0 / 46px 40px, linear-gradient(160deg, #2a2428, #0c0a0c)`, { gloss: true, ink: '#e0c9d6' }],
  ['croc-pink', 'pink croc', `${croc} 0 0 / 46px 40px, linear-gradient(160deg, #ff8cc4, #c2185b)`, { gloss: true, ink: '#fff' }],
  ['tie-dye', 'tie-dye', 'conic-gradient(from 0deg at 50% 50%, #ff6aad, #b98cff, #6ec6ff, #7df9d0, #ffd84d, #ff9a3d, #ff6aad), repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.35) 0 6px, transparent 6px 22px)', { ink: '#fff' }],
  ['butterflies', 'butterflies', `${svgTile(70, 70, "<g fill='%23b98cff' stroke='%23141114' stroke-width='1.2'><path d='M35 35C27 18 12 20 14 31c2 7 11 8 21 4zM35 35c8-17 23-15 21-4-2 7-11 8-21 4zM35 35c-9 2-15 11-11 15 4 3 9-4 11-15zM35 35c9 2 15 11 11 15-4 3-9-4-11-15z'/></g><path d='M35 26v20' stroke='%23141114' stroke-width='2'/>")} 0 0 / 70px 70px, #dff2ff`, { ink: '#5a3d9e' }],
  ['skulls', 'skulls', `${svgTile(56, 56, "<path d='M28 12c-10 0-15 6-15 14 0 5 2 7 5 8.5V40h20v-5.5c3-1.5 5-3.5 5-8.5 0-8-5-14-15-14z' fill='%23f6f2f4'/><circle cx='22' cy='26' r='4' fill='%23141114'/><circle cx='34' cy='26' r='4' fill='%23141114'/><path d='M24 40v-4M28 40v-4M32 40v-4' stroke='%23141114' stroke-width='1.5'/>")} 0 0 / 56px 56px, #141114`, { ink: '#ff3d8b' }],
  ['skulls-pink', 'pink skulls', `${svgTile(56, 56, "<path d='M28 12c-10 0-15 6-15 14 0 5 2 7 5 8.5V40h20v-5.5c3-1.5 5-3.5 5-8.5 0-8-5-14-15-14z' fill='%23141114'/><circle cx='22' cy='26' r='4' fill='%23ff8ac4'/><circle cx='34' cy='26' r='4' fill='%23ff8ac4'/>")} 0 0 / 56px 56px, #ff8ac4`, { ink: '#141114' }],
  ['crosses', 'crosses', `${svgTile(40, 40, "<path d='M20 8v24M13 16h14' stroke='%23ff3d8b' stroke-width='3' stroke-linecap='round'/>")} 0 0 / 40px 40px, #141114`, { ink: '#ff3d8b' }],
  ['polka', 'polka dots', 'radial-gradient(circle, #141114 9px, transparent 10px) 0 0 / 40px 40px, radial-gradient(circle, #141114 9px, transparent 10px) 20px 20px / 40px 40px, #ff7eb6', { ink: '#141114' }],
  ['polka-black', 'black polka dots', 'radial-gradient(circle, #fff 7px, transparent 8px) 0 0 / 34px 34px, radial-gradient(circle, #fff 7px, transparent 8px) 17px 17px / 34px 34px, #141114', { ink: '#ff8ac4' }],
  ['argyle', 'argyle', 'repeating-linear-gradient(45deg, transparent 0 34px, rgba(255,255,255,.5) 34px 35px, transparent 35px 70.7px), repeating-linear-gradient(-45deg, transparent 0 34px, rgba(255,255,255,.5) 34px 35px, transparent 35px 70.7px), conic-gradient(from 45deg, #141114 25%, #ff6aad 0 50%, #141114 0 75%, #ff6aad 0) 0 0 / 50px 50px', { ink: '#fff' }],
  ['gingham', 'pink gingham', 'repeating-linear-gradient(90deg, rgba(255,70,140,.5) 0 16px, transparent 16px 32px), repeating-linear-gradient(0deg, rgba(255,70,140,.5) 0 16px, transparent 16px 32px), #fff4f8', { ink: '#c2185b' }],
  ['strawberries', 'strawberries', `${svgTile(52, 52, "<path d='M26 18c-10 0-14 6-12 12 2 8 8 14 12 14s10-6 12-14c2-6-2-12-12-12z' fill='%23e8283f'/><path d='M18 18l8-6 8 6-8 2z' fill='%233a8a3c'/><g fill='%23ffe066'><circle cx='22' cy='26' r='1.2'/><circle cx='30' cy='26' r='1.2'/><circle cx='26' cy='32' r='1.2'/><circle cx='21' cy='36' r='1.2'/><circle cx='31' cy='36' r='1.2'/></g>")} 0 0 / 52px 52px, #ffe3ec`, { ink: '#a3121f' }],
  ['rainbow', 'rainbow stripes', 'linear-gradient(180deg, #ff5d6c 0 16.6%, #ff9a3d 0 33.3%, #ffd84d 0 50%, #9be564 0 66.6%, #6ec6ff 0 83.3%, #b18cff 0)', { ink: '#fff' }],
  ['music-sheet', 'sheet music', `${svgTile(140, 60, "<g stroke='%23141114' stroke-width='.8' opacity='.7'><path d='M0 10H140M0 16H140M0 22H140M0 28H140M0 34H140'/></g><g fill='%23141114'><ellipse cx='20' cy='28' rx='4' ry='3'/><ellipse cx='52' cy='19' rx='4' ry='3'/><ellipse cx='86' cy='25' rx='4' ry='3'/><ellipse cx='118' cy='13' rx='4' ry='3'/></g><path d='M24 28V8M56 19V0M90 25V6M122 13V-6' stroke='%23141114' stroke-width='1.2'/>")} 0 0 / 140px 60px, #f6efe0`, { ink: '#141114' }],
  ['velvet-black', 'black velvet', `${noise(.3, 1.4)}, linear-gradient(135deg, #3a3238 0%, #0c0a0c 40%, #2a2228 58%, #050405 100%)`, { ink: '#ff8ac4' }],
  ['velvet-red', 'red velvet', `${noise(.3, 1.4)}, linear-gradient(135deg, #ff5a6e 0%, #8a0018 40%, #e0283f 58%, #4a000c 100%)`, { ink: '#ffe6ea' }],
  ['camo-pink', 'pink camo', `${svgTile(120, 120, "<g><path d='M0 20c20-10 30 10 50 0s20 20 40 10 30 10 30 10v20c-20 10-30-10-50 0s-30-10-50 0-20-10-20-10z' fill='%23ff6aad'/><path d='M10 70c20-10 30 10 50 0s30 10 50 0v20c-20 10-30-10-50 0s-30-10-50 0z' fill='%23c2185b'/><path d='M40 40c10-5 20 5 30 0s10 10 0 12-30 0-30-12z' fill='%23141114'/><path d='M80 95c10-5 20 5 30 0s5 15-10 15-20-5-20-15z' fill='%23141114'/></g>")} 0 0 / 120px 120px, #ffb3d1`, { ink: '#141114' }],
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
  const face = h('div', { class: 'cover-face' + (opts.gloss ? ' gloss' : ''), style: sizeVars(diary) });
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

// the whole closed book in 3d. scale = how big it shows (1 = page pixels)
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
  const { w, h: ht } = dims(diary);
  const scene = h('div', { class: 'b3d-scene', style: { ...sizeVars(diary), '--s': scale, width: w * scale + 'px', height: ht * scale + 'px' } }, box);
  scene.box = box;
  scene.front = front;
  return scene;
}
