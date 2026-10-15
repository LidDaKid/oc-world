// drawn clothes for dress up (svg), plus the sticker closet. sized to fit the dress form (~280 x 640).

import { h } from '../ui.js';
import { shade } from './room-pieces.js';

let n = 0;
const gid = p => `${p}${++n}`;
const lt = (c, a = .25) => shade(c, a), dk = (c, a = .25) => shade(c, -a);
const svg = (w, ht, inner) => h('span', { class: 'dp', innerHTML: `<svg viewBox='0 0 ${w} ${ht}' width='${w}' height='${ht}' overflow='visible'>${inner}</svg>` });
const esc = s => String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

// the dress form you dress when there's no base picture
export function dressForm() {
  const g = gid('df'), t = gid('dt');
  return svg(280, 640, `<defs>
      <linearGradient id='${g}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#d9799f'/><stop offset='.3' stop-color='#ffb3d0'/><stop offset='.55' stop-color='#ffc6dc'/><stop offset='1' stop-color='#c9648c'/></linearGradient>
      <pattern id='${t}' width='6' height='6' patternUnits='userSpaceOnUse'><path d='M0 3H6M3 0V6' stroke='#fff' stroke-width='.6' opacity='.18'/></pattern></defs>
    <ellipse cx='140' cy='628' rx='96' ry='10' fill='#000' opacity='.3'/>
    <path d='M140 470 L60 620 M140 470 L220 620 M140 470 V626' stroke='#2a2230' stroke-width='9' stroke-linecap='round'/>
    <rect x='132' y='360' width='16' height='120' rx='5' fill='#c9a24a'/><rect x='134' y='360' width='4' height='120' fill='#fff2b8' opacity='.6'/>
    <rect x='122' y='18' width='36' height='52' rx='8' fill='url(#${g})'/>
    <ellipse cx='140' cy='18' rx='20' ry='11' fill='#2a2230'/><ellipse cx='140' cy='14' rx='9' ry='5' fill='#c9a24a'/>
    <path d='M122 62 C90 64 46 70 40 96 C30 130 32 160 52 200 C64 226 76 240 78 262 C80 286 50 312 46 340 C44 356 60 372 140 374 C220 372 236 356 234 340 C230 312 200 286 202 262 C204 240 216 226 228 200 C248 160 250 130 240 96 C234 70 190 64 158 62 Z' fill='url(#${g})' stroke='#a84a73' stroke-width='3'/>
    <path d='M122 62 C90 64 46 70 40 96 C30 130 32 160 52 200 C64 226 76 240 78 262 C80 286 50 312 46 340 C44 356 60 372 140 374 C220 372 236 356 234 340 C230 312 200 286 202 262 C204 240 216 226 228 200 C248 160 250 130 240 96 C234 70 190 64 158 62 Z' fill='url(#${t})'/>
    <path d='M140 66 V372 M86 80 C100 160 110 250 92 360 M194 80 C180 160 170 250 188 360' stroke='#2a2230' stroke-width='1.6' stroke-dasharray='5 5' fill='none' opacity='.55'/>
    <path d='M70 110 C80 96 100 90 116 92' stroke='#fff' stroke-width='6' fill='none' opacity='.35' stroke-linecap='round'/>`);
}

// ---------- clothes ----------

function tee(it) {
  const c = it.color || '#141114', g = gid('te');
  return svg(320, 270, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${dk(c, .2)}'/><stop offset='.5' stop-color='${lt(c, .1)}'/><stop offset='1' stop-color='${dk(c, .2)}'/></linearGradient></defs>
    <path d='M112 8 Q160 40 208 8 L270 34 L318 112 L262 140 L246 116 L248 262 Q160 274 72 262 L74 116 L58 140 L2 112 L50 34 Z' fill='url(#${g})' stroke='${dk(c, .4)}' stroke-width='3' stroke-linejoin='round'/>
    <path d='M112 8 Q160 46 208 8' stroke='${lt(c, .25)}' stroke-width='8' fill='none'/>
    <path d='M74 116 Q80 90 70 60 M246 116 Q240 90 250 60' stroke='${dk(c, .35)}' stroke-width='2' fill='none' opacity='.6'/>
    <text x='160' y='150' font-family='UnifrakturMaguntia, serif' font-size='44' fill='${it.color2 || '#ff4fa3'}' text-anchor='middle'>${esc((it.text ?? 'rawr').slice(0, 12))}</text>
    <path d='M130 172 Q160 196 190 172 Q178 190 160 212 Q142 190 130 172Z' fill='${it.color2 || '#ff4fa3'}'/>`);
}

function hoodie(it) {
  const c = it.color || '#2a2230', g = gid('ho');
  return svg(330, 320, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${dk(c, .22)}'/><stop offset='.5' stop-color='${lt(c, .12)}'/><stop offset='1' stop-color='${dk(c, .22)}'/></linearGradient></defs>
    <path d='M110 30 Q165 -14 220 30 Q222 60 196 70 L134 70 Q108 60 110 30Z' fill='${dk(c, .3)}'/>
    <path d='M108 40 L60 60 Q22 80 14 150 L6 290 L52 296 L66 170 L70 312 Q165 324 260 312 L264 170 L278 296 L324 290 L316 150 Q308 80 270 60 L222 40 Q166 84 108 40Z' fill='url(#${g})' stroke='${dk(c, .45)}' stroke-width='3' stroke-linejoin='round'/>
    <path d='M108 40 Q166 96 222 40' stroke='${dk(c, .4)}' stroke-width='5' fill='none'/>
    <path d='M146 76 L140 150 M184 76 L190 150' stroke='#f6eefb' stroke-width='3' stroke-linecap='round'/><circle cx='140' cy='152' r='4' fill='#c9ccd3'/><circle cx='190' cy='152' r='4' fill='#c9ccd3'/>
    <path d='M100 220 H230 L216 278 H114Z' fill='${dk(c, .12)}' stroke='${dk(c, .4)}' stroke-width='2'/>
    <path d='M70 300 Q165 312 260 300 M8 280 L52 286 M278 286 L322 280' stroke='${dk(c, .45)}' stroke-width='6'/>
    <path d='M150 180 l6 -8 a6 6 0 0 1 10 6 l-16 14 -16 -14 a6 6 0 0 1 10 -6z' fill='${it.color2 || '#ff4fa3'}'/>`);
}

function corset(it) {
  const c = it.color || '#141114', g = gid('co');
  const laces = Array.from({ length: 7 }, (_, i) => { const y = 34 + i * 24; return `<path d='M78 ${y} L102 ${y + 20} M102 ${y} L78 ${y + 20}' stroke='${it.color2 || '#ff4fa3'}' stroke-width='3'/><circle cx='76' cy='${y}' r='3' fill='#c9ccd3'/><circle cx='104' cy='${y}' r='3' fill='#c9ccd3'/>`; }).join('');
  return svg(180, 220, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${dk(c, .25)}'/><stop offset='.5' stop-color='${lt(c, .14)}'/><stop offset='1' stop-color='${dk(c, .25)}'/></linearGradient></defs>
    <path d='M8 30 Q40 2 90 22 Q140 2 172 30 L160 120 Q150 160 168 210 Q90 226 12 210 Q30 160 20 120 Z' fill='url(#${g})' stroke='${dk(c, .45)}' stroke-width='3'/>
    <path d='M50 18 Q46 120 40 214 M130 18 Q134 120 140 214' stroke='${lt(c, .2)}' stroke-width='2' fill='none'/>
    ${laces}
    <path d='M8 30 Q40 2 90 22 Q140 2 172 30' stroke='${it.color2 || '#ff4fa3'}' stroke-width='5' fill='none' stroke-dasharray='1 7' stroke-linecap='round'/>
    <path d='M90 210 L84 226 M90 210 L96 226' stroke='${it.color2 || '#ff4fa3'}' stroke-width='3'/>`);
}

function tutu(it) {
  const c = it.color || '#ff8ac4';
  const layer = (y, w, op, col) => {
    let d = `M${140 - w / 2} ${y}`;
    const segs = 12;
    for (let i = 0; i < segs; i++) { const x0 = 140 - w / 2 + (i / segs) * w, x1 = 140 - w / 2 + ((i + 1) / segs) * w; d += ` Q${(x0 + x1) / 2} ${y + 70 + (i % 2) * 10} ${x1} ${y}`; }
    return `<path d='${d} Z' fill='${col}' opacity='${op}'/>`;
  };
  return svg(280, 130, `${layer(14, 270, .55, lt(c, .3))}${layer(14, 240, .7, c)}${layer(14, 200, .8, lt(c, .15))}
    <rect x='60' y='4' width='160' height='20' rx='8' fill='${dk(c, .2)}'/><path d='M66 14 H214' stroke='#fff' stroke-width='2' stroke-dasharray='2 6' opacity='.7'/>`);
}

function plaidSkirt(it) {
  const c = it.color || '#c8102e', c2 = it.color2 || '#141114', p = gid('pl');
  const pleats = Array.from({ length: 9 }, (_, i) => `<path d='M${70 + i * 12.5} 26 L${24 + i * 29} 142' stroke='#000' stroke-width='2' opacity='.3'/>`).join('');
  return svg(260, 150, `<defs><pattern id='${p}' width='36' height='36' patternUnits='userSpaceOnUse'><rect width='36' height='36' fill='${c}'/><rect x='0' y='12' width='36' height='8' fill='${c2}' opacity='.6'/><rect x='12' y='0' width='8' height='36' fill='${c2}' opacity='.6'/><rect x='0' y='28' width='36' height='2' fill='#fff' opacity='.35'/><rect x='28' y='0' width='2' height='36' fill='#fff' opacity='.35'/></pattern></defs>
    <path d='M64 22 H196 L254 142 Q130 156 6 142 Z' fill='url(#${p})' stroke='${dk(c, .4)}' stroke-width='3'/>
    ${pleats}
    <rect x='60' y='6' width='140' height='22' rx='4' fill='${c2}'/><rect x='118' y='8' width='24' height='18' rx='3' fill='none' stroke='#c9ccd3' stroke-width='3'/>
    <path d='M226 120 l10 18' stroke='#c9ccd3' stroke-width='4' stroke-linecap='round'/>`);
}

function belt(it) {
  const c = it.color || '#141114';
  const studs = Array.from({ length: 11 }, (_, i) => { const x = 22 + i * 17; return x > 100 && x < 140 ? '' : `<path d='M${x} 9 L${x + 6} 18 L${x} 27 L${x - 6} 18Z' fill='#e9ebf0' stroke='#8d919c'/><path d='M${x} 9 L${x + 6} 18 L${x} 18Z' fill='#fff'/>`; }).join('');
  return svg(240, 40, `<rect x='2' y='4' width='236' height='28' rx='6' fill='${c}' stroke='${dk(c, .4)}' stroke-width='2'/>${studs}
    <rect x='100' y='0' width='40' height='36' rx='6' fill='none' stroke='#d8dbe2' stroke-width='5'/><rect x='118' y='4' width='4' height='28' fill='#d8dbe2'/>`);
}

function choker(it) {
  const c = it.color || '#141114';
  return svg(110, 60, `<path d='M6 10 Q55 30 104 10' stroke='${c}' stroke-width='10' fill='none' stroke-linecap='round'/>
    <circle cx='55' cy='24' r='5' fill='none' stroke='#c9ccd3' stroke-width='2.5'/>
    <path d='M55 54 C40 46 38 34 46 30 C50 28 54 30 55 34 C56 30 60 28 64 30 C72 34 70 46 55 54Z' fill='${it.color2 || '#ff4fa3'}' stroke='${dk(it.color2 || '#ff4fa3', .3)}' stroke-width='1.5'/>
    <path d='M48 36 Q50 33 53 34' stroke='#fff' stroke-width='2' fill='none' opacity='.7'/>`);
}

function socks(it) {
  const c = it.color || '#ff4fa3', c2 = it.color2 || '#141114', p = gid('so');
  const sock = x => `<path d='M${x} 4 H${x + 44} V220 Q${x + 46} 250 ${x + 20} 254 L${x - 14} 256 Q${x - 26} 254 ${x - 22} 240 Q${x - 14} 228 ${x} 222 Z' fill='url(#${p})' stroke='${dk(c2, .2)}' stroke-width='2'/>`;
  return svg(150, 262, `<defs><pattern id='${p}' width='20' height='24' patternUnits='userSpaceOnUse'><rect width='20' height='24' fill='${c}'/><rect y='12' width='20' height='12' fill='${c2}'/></pattern></defs>${sock(30)}${sock(98)}`);
}

function armWarmer(it) {
  const c = it.color || '#ff4fa3', c2 = it.color2 || '#141114', p = gid('aw');
  return svg(70, 170, `<defs><pattern id='${p}' width='20' height='20' patternUnits='userSpaceOnUse'><rect width='20' height='20' fill='${c}'/><rect y='10' width='20' height='10' fill='${c2}'/></pattern></defs>
    <path d='M8 4 Q35 -2 62 4 L58 150 Q60 162 50 166 Q35 170 20 166 Q10 162 12 150 Z' fill='url(#${p})' stroke='${dk(c2, .2)}' stroke-width='2'/>
    <path d='M14 150 Q35 156 56 150' stroke='#000' stroke-width='2' opacity='.3' fill='none'/>`);
}

function fishnets() {
  const p = gid('fn');
  return svg(190, 320, `<defs><pattern id='${p}' width='12' height='12' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><path d='M0 0H12V12' fill='none' stroke='#141114' stroke-width='1.6'/></pattern></defs>
    <path d='M10 4 H180 L172 120 L150 310 H112 L100 120 H90 L78 310 H40 L18 120Z' fill='url(#${p})'/>
    <path d='M10 4 H180 L178 26 H12Z' fill='#141114' opacity='.85'/>`);
}

function boots(it) {
  const c = it.color || '#141114';
  const boot = x => `<path d='M${x} 6 H${x + 50} V96 Q${x + 92} 104 ${x + 96} 124 V140 H${x - 4} V124 Z' fill='${c}' stroke='${dk(c, .4)}' stroke-width='2'/>
    <rect x='${x - 4}' y='124' width='100' height='18' rx='4' fill='${lt(c, .12)}'/><path d='M${x - 4} 132 H${x + 96}' stroke='#000' opacity='.4' stroke-width='2'/>
    ${[26, 52, 78].map(y => `<rect x='${x - 2}' y='${y}' width='54' height='8' rx='2' fill='${lt(c, .2)}'/><rect x='${x + 34}' y='${y - 2}' width='12' height='12' rx='2' fill='none' stroke='#d8dbe2' stroke-width='2.5'/>`).join('')}`;
  return svg(230, 150, `${boot(8)}${boot(128)}`);
}

function catEars(it) {
  const c = it.color || '#141114', c2 = it.color2 || '#ff8ac4';
  return svg(220, 100, `<path d='M14 92 Q110 20 206 92' stroke='${c}' stroke-width='10' fill='none' stroke-linecap='round'/>
    <path d='M36 70 L48 8 L92 46 Z' fill='${c}'/><path d='M48 56 L54 24 L78 46Z' fill='${c2}'/>
    <path d='M184 70 L172 8 L128 46 Z' fill='${c}'/><path d='M172 56 L166 24 L142 46Z' fill='${c2}'/>`);
}

function bigBow(it) {
  const c = it.color || '#ff4fa3', p = gid('bw');
  return svg(170, 120, `<defs><pattern id='${p}' width='16' height='16' patternUnits='userSpaceOnUse'><rect width='16' height='16' fill='${c}'/><circle cx='8' cy='8' r='3' fill='#fff' opacity='.85'/></pattern></defs>
    <path d='M85 56 C55 10 4 14 8 50 C10 86 56 84 85 56Z M85 56 C115 10 166 14 162 50 C160 86 114 84 85 56Z' fill='url(#${p})' stroke='${dk(c, .35)}' stroke-width='3'/>
    <path d='M85 56 L58 114 L72 108 L78 118 L85 64 L92 118 L98 108 L112 114Z' fill='url(#${p})' stroke='${dk(c, .35)}' stroke-width='3'/>
    <ellipse cx='85' cy='56' rx='14' ry='16' fill='${dk(c, .2)}'/>`);
}

function batWings(it) {
  const c = it.color || '#141114', g = gid('bt');
  const wing = `M210 100 C180 40 120 10 30 10 C50 30 54 50 40 70 C64 66 76 80 70 100 C92 92 110 104 108 124 C130 116 150 126 150 150 C170 136 192 130 210 140 Z`;
  return svg(420, 200, `<defs><linearGradient id='${g}' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${lt(c, .2)}'/><stop offset='1' stop-color='${dk(c, .3)}'/></linearGradient></defs>
    <path d='${wing}' fill='url(#${g})' stroke='${it.color2 || '#ff4fa3'}' stroke-width='3'/>
    <path d='${wing}' transform='translate(420 0) scale(-1 1)' fill='url(#${g})' stroke='${it.color2 || '#ff4fa3'}' stroke-width='3'/>
    <path d='M210 100 L40 70 M210 100 L70 100 M210 110 L108 124 M210 120 L150 150' stroke='${it.color2 || '#ff4fa3'}' stroke-width='1.5' opacity='.5'/>
    <path d='M210 100 L380 70 M210 100 L350 100 M210 110 L312 124 M210 120 L270 150' stroke='${it.color2 || '#ff4fa3'}' stroke-width='1.5' opacity='.5'/>`);
}

function heartShades(it) {
  const c = it.color || '#ff4fa3';
  const heart = x => `<path d='M${x} 52 C${x - 34} 34 ${x - 36} 10 ${x - 18} 6 C${x - 8} 4 ${x - 2} 10 ${x} 16 C${x + 2} 10 ${x + 8} 4 ${x + 18} 6 C${x + 36} 10 ${x + 34} 34 ${x} 52Z' fill='${c}' fill-opacity='.85' stroke='#141114' stroke-width='4'/>`;
  return svg(170, 60, `<path d='M70 20 Q85 12 100 20' stroke='#141114' stroke-width='4' fill='none'/><path d='M8 18 L-2 14 M162 18 L172 14' stroke='#141114' stroke-width='4'/>${heart(42)}${heart(128)}
    <path d='M28 18 Q32 12 38 14 M114 18 Q118 12 124 14' stroke='#fff' stroke-width='3' fill='none' opacity='.7'/>`);
}

export const CLOTHES = [
  { id: 'tee', label: 'band tee', cat: 'tops', w: 320, h: 270, k: .78, draw: tee, colors: [['shirt', 'color', '#141114'], ['print', 'color2', '#ff4fa3']], text: 'rawr' },
  { id: 'hoodie', label: 'hoodie', cat: 'tops', w: 330, h: 320, k: .78, draw: hoodie, colors: [['color', 'color', '#2a2230'], ['heart', 'color2', '#ff4fa3']] },
  { id: 'corset', label: 'corset', cat: 'tops', w: 180, h: 220, k: .95, draw: corset, colors: [['color', 'color', '#141114'], ['laces', 'color2', '#ff4fa3']] },
  { id: 'tutu', label: 'tutu', cat: 'bottoms', w: 280, h: 130, k: .9, draw: tutu, colors: [['color', 'color', '#ff8ac4']] },
  { id: 'plaid', label: 'plaid skirt', cat: 'bottoms', w: 260, h: 150, k: .9, draw: plaidSkirt, colors: [['plaid', 'color', '#c8102e'], ['lines', 'color2', '#141114']] },
  { id: 'fishnets', label: 'fishnets', cat: 'bottoms', w: 190, h: 320, k: .9, draw: fishnets },
  { id: 'socks', label: 'striped socks', cat: 'bottoms', w: 150, h: 262, k: .8, draw: socks, colors: [['stripe', 'color', '#ff4fa3'], ['stripe 2', 'color2', '#141114']] },
  { id: 'boots', label: 'platform boots', cat: 'shoes', w: 230, h: 150, k: .7, draw: boots, colors: [['color', 'color', '#141114']] },
  { id: 'belt', label: 'studded belt', cat: 'jewelry', w: 240, h: 40, k: .7, draw: belt, colors: [['color', 'color', '#141114']] },
  { id: 'choker', label: 'choker', cat: 'jewelry', w: 110, h: 60, k: .7, draw: choker, colors: [['band', 'color', '#141114'], ['heart', 'color2', '#ff4fa3']] },
  { id: 'armwarmer', label: 'arm warmer', cat: 'extras', w: 70, h: 170, k: .8, draw: armWarmer, colors: [['stripe', 'color', '#ff4fa3'], ['stripe 2', 'color2', '#141114']] },
  { id: 'catears', label: 'cat ears', cat: 'hats', w: 220, h: 100, k: .6, draw: catEars, colors: [['color', 'color', '#141114'], ['inside', 'color2', '#ff8ac4']] },
  { id: 'bow', label: 'big bow', cat: 'bows', w: 170, h: 120, k: .6, draw: bigBow, colors: [['color', 'color', '#ff4fa3']] },
  { id: 'wings', label: 'bat wings', cat: 'extras', w: 420, h: 200, k: 1, draw: batWings, colors: [['wings', 'color', '#141114'], ['edge', 'color2', '#ff4fa3']] },
  { id: 'shades', label: 'heart shades', cat: 'glasses', w: 170, h: 60, k: .5, draw: heartShades, colors: [['lenses', 'color', '#ff4fa3']] },
];
export const clothById = id => CLOTHES.find(c => c.id === id);

// the closet's drawers: [id, label, icon sticker, sticker codes]
export const DRAWERS = [
  ['tops', 'tops', '1f457', '1f457 1f45a 1f455 1f97b 1f458 1fa71 1f459 1f9e5 1f454'],
  ['bottoms', 'bottoms', '1f456', '1f456 1fa73 1f9e6'],
  ['shoes', 'shoes', '1f460', '1f460 1f462 1f461 1f45f 1f45e 1fa70 1f97f 1f97e 1fa74'],
  ['bags', 'bags', '1f45c', '1f45c 1f45b 1f45d 1f392 1f6cd-fe0f 1f9f3'],
  ['hats', 'hats', '1f452', '1f452 1f3a9 1f9e2 1f393 1f451 1fa96'],
  ['bows', 'bows + hair', '1f380', '1f380 1f338 1f339 1f33a 1f940 1fab7 1f98b 1f337'],
  ['jewelry', 'jewelry', '1f48e', '1f48d 1f48e 1f4ff 1f5a4 1f496 1f319 2b50 2728 1fa77'],
  ['glasses', 'glasses', '1f576-fe0f', '1f453 1f576-fe0f 1f97d'],
  ['extras', 'extras', '1fa84', '1f9e3 1f9e4 1fa84 1f987 1fabd 1f52e 1f484 1f485 1f48b 1fa78 1f9f8 1f408-200d-2b1b 1f47b 1f3b8 1f3a7 1f4f1'],
];
