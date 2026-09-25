// how a page looks: colors, fonts, corners, a background picture. the home page and every oc's page
// each carry one of these, paint() puts it on the page's outer box, and lookCards() are the controls.
//
//   look = { bg, text, border, accent, wallpaper: { imageId, tile }, fontHead, fontBody, corners }
//   (null anywhere = "just use the site theme")

import { h, clear, swatches, segmented, pickFile, shrinkImage, toast } from './ui.js';
import { store } from './store.js';

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
    if (body.scale) st.fontSize = body.scale + 'em';
  }
  el.classList.add('look');
  el.classList.toggle('styled', !!ink);
  el.classList.toggle('tiled', !!look.wallpaper.tile);
  for (const c of CORNERS) el.classList.toggle('corners-' + c, look.corners === c && c !== 'round');
  const wallpaperId = look.wallpaper.imageId;
  el.classList.toggle('has-wallpaper', !!wallpaperId);
  const url = await store.imageURL(wallpaperId);
  if (url && look.wallpaper.imageId === wallpaperId) st.backgroundImage = `url("${url}")`;
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
    const file = await pickFile('image/*');
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
