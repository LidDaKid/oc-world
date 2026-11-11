// how a page looks: colors, fonts, corners, a background picture. the home page and every oc's page
// each carry one of these, paint() puts it on the page's outer box, and lookCards() are the controls.
//
//   look = { bg, text, border, accent, wallpaper: { imageId, tile }, fontHead, fontBody, corners,
//            boxAlpha, boxColor, boxBlur, edgeSize, edgeStyle, shadow, spacing, textSize, titleFx, buttons, bgFade, texture }
//   (null anywhere = "just use the site theme")

import { h, clear, swatches, segmented, pickFile, shrinkImage, toast } from './ui.js';
import { store } from './store.js';
import { pickAndCrop } from './crop.js';
import { setFall, cursorCss, setTrail } from './look-fx.js';
import { paintMore } from './look-more.js';
import { stickerNode } from './diary/stickers.js';

export const PAGE_BGS = ['#15101d', '#000000', '#2a0a1b', '#1b1838', '#0f2a2a', '#3b1d4a', '#ffffff', '#fff0f6', '#ffd9e8', '#e3c6ff', '#bfe1ee', '#fff3b8'];
export const PAGE_INKS = ['#f7effc', '#ffffff', '#1a1320', '#000000', '#ff4fa3', '#ff8ac4', '#ff5d6c', '#ffd84d', '#9be564', '#7df9d0', '#6ec6ff', '#b18cff'];

// every one of these is loaded in index.html
export const FONTS = [
  { id: 'round', css: "'Nunito', system-ui, sans-serif" },
  { id: 'pixel', css: "'Pixelify Sans', system-ui, sans-serif" },
  { id: 'retro', css: "'VT323', monospace", scale: 1.25 },
  { id: 'handwritten', css: "'Caveat', cursive", scale: 1.3 },
  { id: 'typewriter', css: "'Special Elite', monospace" },
  { id: 'bubbly', css: "'Fredoka', system-ui, sans-serif" },
  { id: 'fancy', css: "'Playfair Display', serif" },
  { id: 'spooky', css: "'Creepster', system-ui" },
  { id: 'glitch', css: "'Rubik Glitch', system-ui" },
  { id: 'graffiti', css: "'Sedgwick Ave Display', cursive", scale: 1.1 },
];
export const CORNERS = ['round', 'soft', 'square'];

// the "boxes + extras" choices. the first one in each list is the normal look (no class on the page)
export const LOOK_CHOICES = {
  edgeSize: ['normal', 'none', 'thin', 'thick'],
  edgeStyle: ['solid', 'dashed', 'dotted', 'double'],
  shadow: ['normal', 'none', 'big', 'glow', 'hard', 'paper stack', 'long', 'inner'],
  spacing: ['normal', 'tight', 'roomy'],
  textSize: ['normal', 'small', 'big', 'huge'],
  titleFx: ['none', 'glow', 'outline', 'shadow', 'gradient'],
  buttons: ['filled', 'outline', 'soft'],
  texture: ['none', 'grain', 'scanlines', 'glitter', 'stars', 'hearts', 'paper', 'dots', 'crosshatch', 'lace', 'film', 'vhs'],
  bgFilter: ['none', 'b&w', 'sepia', 'faded', 'vintage', 'warm', 'cool', 'pink', 'dreamy', 'dark', 'bright', 'invert'],
  bgMotion: ['none', 'shift', 'pan', 'zoom', 'pulse', 'hue spin'],
  fall: ['none', 'hearts', 'bats', 'stars', 'sparkles', 'petals', 'rain', 'snow', 'bubbles', 'confetti', 'leaves', 'music notes', 'moons', 'crosses', 'skulls', 'butterflies', 'my picture', 'sticker'],
  bgPos: ['center', 'top', 'bottom'],
  bgFit: ['fill', 'fit'],
  bgScroll: ['scrolls', 'stays'],
  boxSkin: ['none', 'glass', 'notebook', 'sticky note', 'torn paper', 'window', 'chrome', 'pixel'],
  hover: ['none', 'lift', 'glow', 'wiggle', 'tilt'],
  divider: ['none', 'line', 'lace', 'chain', 'hearts', 'stars', 'barbed wire'],
  textShadow: ['none', 'soft', 'strong'],
  titleCase: ['as typed', 'upper', 'lower'],
  titleSpacing: ['normal', 'wide', 'wider'],
  cursor: ['normal', 'heart', 'bat', 'star', 'cross', 'bow', 'moon', 'skull', 'sparkle', 'cherry'],
  cursorTrail: ['none', 'sparkles', 'hearts', 'stars', 'bubbles'],
  pageIn: ['none', 'fade', 'slide', 'pop'],
};
// the filter presets (background, pfp, banner all use these)
export const FILTERS = {
  'b&w': 'grayscale(1)',
  sepia: 'sepia(.85)',
  faded: 'saturate(.45) contrast(.82) brightness(1.08)',
  vintage: 'sepia(.45) saturate(.8) contrast(1.12) hue-rotate(-12deg)',
  warm: 'sepia(.3) saturate(1.4) hue-rotate(-12deg)',
  cool: 'saturate(1.15) hue-rotate(25deg) brightness(.97)',
  pink: 'sepia(1) hue-rotate(290deg) saturate(1.9) brightness(1.05)',
  dreamy: 'saturate(1.35) brightness(1.08) contrast(.9) blur(4px)',
  dark: 'brightness(.5)',
  bright: 'brightness(1.3) saturate(1.2)',
  invert: 'invert(1) hue-rotate(180deg)',
};
export const filterCss = id => FILTERS[id] || null;
const TEXT_SIZES = { small: .9, normal: 1, big: 1.12, huge: 1.25 };
const num = (v, min, max) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : null);

const HEX = /^#[0-9a-f]{6}$/i;
const hex = v => (typeof v === 'string' && HEX.test(v) ? v : null);
export const font = id => FONTS.find(f => f.id === id) || null;

// dark or light writing, whichever shows up on this background
export function readableInk(color) {
  const n = parseInt(color.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.58 ? '#1a1320' : '#f7effc';
}

// puts a look on el (its inline style + a few classes). accent = the color buttons + highlights use.
export async function paint(el, look, accent) {
  const bg = hex(look.bg), ink = hex(look.text) || (bg ? readableInk(bg) : null);
  const border = hex(look.border);
  accent = hex(look.accent) || hex(accent);
  const st = el.style;
  st.cssText = '';
  if (accent) {
    st.setProperty('--c', accent);
    st.setProperty('--accent', accent);
    st.setProperty('--accent-ink', readableInk(accent));
  }
  if (border) st.setProperty('--edge', border);
  if (ink) st.setProperty('--ink', ink);
  if (bg) {
    st.backgroundColor = bg;
    st.setProperty('--page-bg-color', bg);
  }
  const head = font(look.fontHead), body = font(look.fontBody);
  if (head) {
    st.setProperty('--font-display', head.css);
    st.setProperty('--head-scale', head.scale || 1);
  }
  if (body) {
    st.setProperty('--font-body', body.css);
    st.fontFamily = body.css;
  }
  const size = (body?.scale || 1) * (TEXT_SIZES[look.textSize] || 1);
  if (size !== 1) st.fontSize = size + 'em';

  // the boxes: see-through, tint, frosted glass
  const boxAlpha = num(look.boxAlpha, 0, 100), boxColor = hex(look.boxColor), blur = num(look.boxBlur, 0, 30) || 0;
  el.classList.toggle('box-fill', boxAlpha !== null || !!boxColor);
  st.setProperty('--box-a', boxAlpha ?? 100);
  if (boxColor) st.setProperty('--box-color', boxColor);
  el.classList.toggle('box-blur', blur > 0);
  if (blur) st.setProperty('--box-blur', blur + 'px');
  // fades the background picture / video / color toward the page color
  const fade = num(look.bgFade, 0, 95) || 0;
  el.classList.toggle('bg-fade', fade > 0);
  if (fade) st.setProperty('--bg-fade', fade);
  // a filter on the background only (the fade layer filters whatever is behind it)
  const bgBlur = num(look.bgBlur, 0, 30) || 0;
  el.classList.toggle('bg-fx', bgBlur > 0 || (!!look.bgFilter && look.bgFilter !== 'none'));
  if (bgBlur) st.setProperty('--bg-blur', bgBlur + 'px');
  if (filterCss(look.bgFilter)) st.setProperty('--bgf', filterCss(look.bgFilter));
  const label = hex(look.labelColor);
  el.classList.toggle('has-label', !!label);
  if (label) st.setProperty('--label', label);
  // falling stuff + cursor use the page's own colors
  const accentNow = accent || '#ff4fa3', inkNow = ink || '#f7effc';
  const FALL_COLORS = { bats: [bg && readableInk(bg) === '#1a1320' ? '#1a1320' : inkNow], rain: [inkNow], snow: ['#ffffff', inkNow], petals: ['#ffb7d5', '#ff8ac4', '#ffd9e8'] };
  const fallKind = look.fall === 'my picture' ? 'picture' : look.fall;
  let fallSrc = null;
  if (fallKind === 'picture' && look.fallPic?.imageId) fallSrc = await store.imageURL(look.fallPic.imageId);
  if (fallKind === 'sticker' && look.fallSticker) fallSrc = stickerNode(look.fallSticker)?.querySelector?.('img')?.src || stickerNode(look.fallSticker)?.src || null;
  setFall(el, fallKind, hex(look.fallColor) ? [look.fallColor] : FALL_COLORS[look.fall] || [accentNow, inkNow],
    { amount: look.fallAmount, speed: look.fallSpeed, size: look.fallSize, way: look.fallWay, src: fallSrc });
  const cur = cursorCss(look.cursor, look.cursor === 'bat' ? '#0b0710' : accentNow, look.cursor === 'bat' ? accentNow : '#ffffff');
  el.classList.toggle('cursor-on', !!cur);
  if (cur) st.setProperty('--look-cursor', cur);
  setTrail(el, look.cursorTrail);
  document.documentElement.style.setProperty('--look-thumb', accent || inkNow);
  for (const [key, values] of Object.entries(LOOK_CHOICES)) {
    for (const v of values.slice(1)) el.classList.toggle(`${key}-${v.replace(/\W/g, '')}`, look[key] === v);
  }
  el.classList.add('look');
  el.classList.toggle('styled', !!ink);
  el.classList.toggle('tiled', !!look.wallpaper.tile);
  for (const c of CORNERS) el.classList.toggle('corners-' + c, look.corners === c && c !== 'round');
  const wallpaperId = look.wallpaper.imageId;
  el.classList.toggle('has-wallpaper', !!wallpaperId);
  // a gradient sits under the picture (or is the whole background when there's no picture)
  const grads = [look.grad1, look.grad2, look.grad3].map(hex).filter(Boolean);
  const ang = num(look.gradAngle, 0, 360) ?? 160;
  const gradient = grads.length < 2 ? null
    : look.gradType === 'radial' ? `radial-gradient(circle at 50% 30%, ${grads.join(', ')})`
    : look.gradType === 'conic' ? `conic-gradient(from ${ang}deg, ${grads.join(', ')}, ${grads[0]})`
    : `linear-gradient(${ang}deg, ${grads.join(', ')})`;
  el.classList.toggle('has-gradient', !!gradient);
  if (gradient) st.backgroundImage = gradient;
  const url = await store.imageURL(wallpaperId);
  if (url && look.wallpaper.imageId === wallpaperId) st.backgroundImage = [`url("${url}")`, gradient].filter(Boolean).join(', ');
  await paintMore(el, look, { accent, ink, bg });
}

// ---- the controls ----

export function card(title, head, ...body) {
  return h('div', { class: 'style-card' }, h('div', { class: 'style-card-head' }, h('h3', {}, title), head), ...body);
}

// a color that can also be "nothing" (the reset link)
export function colorCard(label, get, set, changed, colors) {
  const reset = h('button', { class: 'link-btn', hidden: !get(), onclick: () => { set(null); picker.set(null); reset.hidden = true; changed(); } }, 'reset');
  const picker = swatches(get(), c => { set(c); reset.hidden = false; changed(); }, colors);
  return card(label, reset, picker);
}

// a 0..max slider that can also be "nothing" (the reset link). off = the value that counts as untouched
export function sliderCard(label, get, set, changed, { min = 0, max = 100, off = null, start = max, unit = '%' } = {}) {
  const shown = () => get() ?? start;
  const out = h('span', { class: 'slider-num' });
  const input = h('input', { type: 'range', class: 'look-slider', min, max, step: 1, value: shown() });
  const reset = h('button', { class: 'link-btn', onclick: () => { set(off); input.value = shown(); sync(); changed(); } }, 'reset');
  const sync = () => { out.textContent = Math.round(shown()) + unit; reset.hidden = get() === off; };
  input.oninput = () => { set(+input.value); sync(); changed(); };
  sync();
  return card(label, reset, h('div', { class: 'slider-row' }, input, out));
}

export function choiceCard(label, options, value, onPick) {
  return card(label, null, segmented(options.map(o => (typeof o === 'string' ? { value: o, label: o } : o)), value, onPick));
}

export function fontCard(label, value, onPick) {
  const wrap = h('div', { class: 'font-picks' });
  const draw = () => {
    clear(wrap);
    for (const f of [{ id: null }, ...FONTS]) {
      wrap.append(h('button', {
        type: 'button', class: 'font-pick' + (f.id === value ? ' on' : ''), style: f.css ? { fontFamily: f.css } : null,
        onclick: () => { value = f.id; onPick(f.id); draw(); },
      }, f.id || 'normal'));
    }
  };
  draw();
  return card(label, null, wrap);
}

// upload / change / remove one picture that lives at holder.imageId
export function pictureCard(label, holder, changed, { maxDim = 1920, extra } = {}) {
  const wrap = h('div', { class: 'style-card' });
  async function change() {
    const file = await pickAndCrop();
    if (!file) return;
    try {
      const { blob } = await shrinkImage(file, maxDim);
      const old = holder.imageId;
      holder.imageId = await store.putImage(blob);
      if (old) store.deleteImage(old);
      changed();
      draw();
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }
  function draw() {
    clear(wrap).append(
      h('div', { class: 'style-card-head' }, h('h3', {}, label),
        holder.imageId ? h('button', { class: 'link-btn', onclick: () => { store.deleteImage(holder.imageId); holder.imageId = null; changed(); draw(); } }, 'remove') : h('span')),
      h('button', { class: 'btn ghost sm', onclick: change }, holder.imageId ? 'change picture' : '+ upload'));
    if (holder.imageId && extra) wrap.append(extra());
  }
  draw();
  return wrap;
}

// the cards every look has. accent = also offer an accent color (the oc page uses "their color" instead)
export function lookCards(look, changed, { accent = false } = {}) {
  return [
    colorCard('background', () => look.bg, v => look.bg = v, changed, PAGE_BGS),
    colorCard('writing', () => look.text, v => look.text = v, changed, PAGE_INKS),
    colorCard('borders', () => look.border, v => look.border = v, changed),
    accent ? colorCard('buttons + highlights', () => look.accent, v => look.accent = v, changed) : null,
    pictureCard('background picture', look.wallpaper, changed, {
      extra: () => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: look.wallpaper.tile, onchange: e => { look.wallpaper.tile = e.target.checked; changed(); } }), ' repeat as a pattern'),
    }),
    fontCard('title font', look.fontHead, v => { look.fontHead = v; changed(); }),
    fontCard('writing font', look.fontBody, v => { look.fontBody = v; changed(); }),
    choiceCard('corners', CORNERS, look.corners, v => { look.corners = v; changed(); }),
  ];
}

// the boxes (panels, cards, tabs) + the text, buttons, and what sits over the background
export function boxCards(look, changed) {
  const pick = (label, key) => choiceCard(label, LOOK_CHOICES[key], look[key] || LOOK_CHOICES[key][0], v => { look[key] = v; changed(); });
  return {
    boxes: [
      sliderCard('see-through', () => (look.boxAlpha == null ? null : 100 - look.boxAlpha), v => look.boxAlpha = v == null ? null : 100 - v, changed, { start: 0 }),
      colorCard('box color', () => look.boxColor, v => look.boxColor = v, changed, ['#000000', '#ffffff', ...PAGE_BGS.filter(c => c !== '#000000' && c !== '#ffffff'), ...PAGE_INKS.slice(4)]),
      sliderCard('frosted glass', () => look.boxBlur || 0, v => look.boxBlur = v || 0, changed, { max: 30, off: 0, start: 0, unit: '' }),
      pick('border thickness', 'edgeSize'),
      pick('border style', 'edgeStyle'),
      pick('shadow', 'shadow'),
      pick('spacing', 'spacing'),
      pick('box skin', 'boxSkin'),
      pick('hover', 'hover'),
      pick('dividers', 'divider'),
    ],
    text: [
      pick('text size', 'textSize'),
      pick('title effect', 'titleFx'),
      pick('title case', 'titleCase'),
      pick('title spacing', 'titleSpacing'),
      pick('writing shadow', 'textShadow'),
      colorCard('label color', () => look.labelColor, v => look.labelColor = v, changed),
      pick('buttons', 'buttons'),
    ],
    background: [
      sliderCard('background fade', () => look.bgFade || 0, v => look.bgFade = v || 0, changed, { max: 95, off: 0, start: 0 }),
      pick('filter', 'bgFilter'),
      sliderCard('background blur', () => look.bgBlur || 0, v => look.bgBlur = v || 0, changed, { max: 30, off: 0, start: 0, unit: '' }),
      pick('texture', 'texture'),
      gradientCard(look, changed),
      pick('moving', 'bgMotion'),
      pick('falling', 'fall'),
      pick('picture spot', 'bgPos'),
      pick('picture size', 'bgFit'),
      pick('when you scroll', 'bgScroll'),
    ],
    extras: [
      pick('cursor', 'cursor'),
      pick('cursor trail', 'cursorTrail'),
      pick('page opens', 'pageIn'),
    ],
  };
}

// 2 or 3 colors + which way they go
function gradientCard(look, changed) {
  const keys = ['grad1', 'grad2', 'grad3'];
  const pickers = keys.map(k => swatches(look[k], c => { look[k] = c; sync(); changed(); }, [...PAGE_BGS, ...PAGE_INKS.slice(4)]));
  const angle = h('input', { type: 'range', class: 'look-slider', min: 0, max: 360, step: 5, value: look.gradAngle ?? 160 });
  const deg = h('span', { class: 'slider-num' });
  const reset = h('button', { class: 'link-btn', onclick: () => { keys.forEach((k, i) => { look[k] = null; pickers[i].set(null); }); sync(); changed(); } }, 'reset');
  const sync = () => { deg.textContent = (look.gradAngle ?? 160) + '°'; reset.hidden = !keys.some(k => look[k]); };
  angle.oninput = () => { look.gradAngle = +angle.value; sync(); changed(); };
  sync();
  return card('gradient', reset,
    ...pickers.map((p, i) => h('div', { class: 'grad-row' }, h('span', { class: 'grad-num' }, String(i + 1)), p)),
    h('div', { class: 'slider-row' }, angle, deg));
}

// a list of things you can move up/down and show/hide. items: [{ id, label }], hidden: array of ids
export function orderList(items, hidden, onChange) {
  const wrap = h('div', { class: 'order-list' });
  const draw = () => {
    clear(wrap);
    items.forEach((it, i) => {
      const off = hidden.includes(it.id);
      const move = d => { items.splice(i + d, 0, items.splice(i, 1)[0]); onChange(); draw(); };
      wrap.append(h('div', { class: 'order-row' + (off ? ' off' : '') },
        h('span', { class: 'order-name' }, it.label),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => move(-1) }, '↑'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'move down', disabled: i === items.length - 1, onclick: () => move(1) }, '↓'),
        h('button', {
          type: 'button', class: 'icon-btn sm', title: off ? 'show' : 'hide',
          onclick: () => { if (off) hidden.splice(hidden.indexOf(it.id), 1); else hidden.push(it.id); onChange(); draw(); },
        }, off ? '🙈' : '👁')));
    });
  };
  draw();
  return wrap;
}
