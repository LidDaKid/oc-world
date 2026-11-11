// round 4 of page style: ~100 more settings. every setting is one line in SPEC, which drives both the controls
// (moreCards) and what goes on the page (paintMore: a class per choice, a css var per slider/color/font/text/picture).
// the bits that need javascript (slideshows, falling stuff, click bursts, intro, ...) live in look-fx.js.
//
// scope: 'all' = home + oc pages, 'oc' = oc pages only, 'home' = home only

import { h, clear, toast, openModal, confirmDialog, uid } from './ui.js';
import { store } from './store.js';
import { pickAndCrop } from './crop.js';
import { shrinkImage } from './ui.js';
import { card, colorCard, choiceCard, sliderCard, fontCard, pictureCard, font, LOOK_CHOICES, PAGE_BGS, PAGE_INKS, readableInk } from './look.js';
import { setLayers, setParallax, setBurst, setIntro, setScrollBar, setBackTop, setFixedDeco, setBannerSlides, setBlinkies } from './look-fx.js';
import { pickStickerIcon } from './parts.js';
import { stickerNode } from './diary/stickers.js';

const PATTERNS = ['none', 'checker', 'stripes', 'polka dots', 'plaid', 'grid', 'diamonds', 'argyle', 'leopard', 'zebra', 'waves', 'stars', 'hearts', 'crosses'];
const pct = v => v / 100;

export const SPEC = [
  // ---- background ----
  { group: 'background extras', key: 'pattern', label: 'pattern', kind: 'choice', values: PATTERNS },
  { group: 'background extras', key: 'patternColor', label: 'pattern color', kind: 'color' },
  { group: 'background extras', key: 'patternColor2', label: 'pattern color 2', kind: 'color' },
  { group: 'background extras', key: 'patternSize', label: 'pattern size', kind: 'slider', min: 8, max: 160, start: 40, unit: 'px', css: v => v + 'px' },
  { group: 'background extras', key: 'patternAlpha', label: 'pattern see-through', kind: 'slider', min: 0, max: 100, start: 0, css: v => 1 - v / 100 },
  { group: 'background extras', key: 'gradType', label: 'gradient type', kind: 'choice', values: ['linear', 'radial', 'conic'] },
  { group: 'background extras', key: 'slides', label: 'background slideshow', kind: 'pics' },
  { group: 'background extras', key: 'slideSec', label: 'slideshow speed', kind: 'slider', min: 2, max: 30, start: 6, unit: 's', css: v => v + 's' },
  { group: 'background extras', key: 'slideFx', label: 'slideshow change', kind: 'choice', values: ['fade', 'slide', 'zoom'] },
  { group: 'background extras', key: 'vignette', label: 'vignette', kind: 'choice', values: ['none', 'dark', 'light', 'color'] },
  { group: 'background extras', key: 'vignetteSize', label: 'vignette size', kind: 'slider', min: 0, max: 100, start: 50, css: pct },
  { group: 'background extras', key: 'tint', label: 'tint', kind: 'color' },
  { group: 'background extras', key: 'tintAlpha', label: 'tint strength', kind: 'slider', min: 0, max: 100, start: 30, css: pct },
  { group: 'background extras', key: 'parallax', label: 'mouse follow', kind: 'choice', values: ['off', 'gentle', 'strong'] },
  { group: 'background extras', key: 'textureAlpha', label: 'texture strength', kind: 'slider', min: 0, max: 100, start: 100, css: pct },
  { group: 'background extras', key: 'fallAmount', label: 'falling amount', kind: 'slider', min: 10, max: 300, start: 100 },
  { group: 'background extras', key: 'fallSpeed', label: 'falling speed', kind: 'slider', min: 10, max: 300, start: 100 },
  { group: 'background extras', key: 'fallSize', label: 'falling size', kind: 'slider', min: 30, max: 300, start: 100 },
  { group: 'background extras', key: 'fallWay', label: 'falling direction', kind: 'choice', values: ['down', 'up', 'wind'] },
  { group: 'background extras', key: 'fallColor', label: 'falling color', kind: 'color' },
  { group: 'background extras', key: 'fallPic', label: 'falling picture', kind: 'pic', max: 300 },
  { group: 'background extras', key: 'fallSticker', label: 'falling sticker', kind: 'sticker' },

  // ---- boxes ----
  { group: 'box extras', key: 'boxColor2', label: 'box color 2', kind: 'color' },
  { group: 'box extras', key: 'boxAnim', label: 'box animation', kind: 'choice', values: ['none', 'rainbow border', 'pulse glow', 'flicker', 'breathing'] },
  { group: 'box extras', key: 'boxDeco', label: 'box decorations', kind: 'choice', values: ['none', 'tape', 'pushpins', 'paperclips', 'bows', 'hearts', 'stars', 'cobwebs'] },
  { group: 'box extras', key: 'tilt', label: 'scrapbook tilt', kind: 'choice', values: ['off', 'slight', 'messy'] },
  { group: 'box extras', key: 'boxPad', label: 'inside space', kind: 'slider', min: 30, max: 220, start: 100, css: pct },
  { group: 'box extras', key: 'boxTexture', label: 'box texture', kind: 'choice', values: ['none', 'dots', 'lines', 'grid', 'paper', 'sparkle'] },
  { group: 'box extras', key: 'innerGlow', label: 'inner glow', kind: 'choice', values: ['none', 'soft', 'strong'] },
  { group: 'box extras', key: 'outline', label: 'outline', kind: 'choice', values: ['none', 'offset', 'neon', 'double color'] },
  { group: 'box extras', key: 'cornerShape', label: 'corner shape', kind: 'choice', values: ['normal', 'pill', 'cut', 'ticket', 'wobbly'] },
  { group: 'box extras', key: 'boxAppear', label: 'boxes appear', kind: 'choice', values: ['none', 'fade up', 'zoom', 'slide in', 'flip'] },

  // ---- oc page layout ----
  { group: 'oc page layout', scope: 'oc', key: 'topBar', label: 'top bar', kind: 'choice', values: ['normal', 'pill', 'hidden'] },
  { group: 'oc page layout', scope: 'oc', key: 'factsLayout', label: 'basics layout', kind: 'choice', values: ['grid', 'list', 'two columns', 'chips'] },
  { group: 'oc page layout', scope: 'oc', key: 'factStyle', label: 'basics style', kind: 'choice', values: ['boxed', 'plain', 'underlined', 'bubbles', 'tickets'] },
  { group: 'oc page layout', scope: 'oc', key: 'sectionsLayout', label: 'sections layout', kind: 'choice', values: ['stacked', 'two columns', 'grid'] },
  { group: 'oc page layout', scope: 'oc', key: 'sectionTitle', label: 'section titles', kind: 'choice', values: ['plain', 'underline', 'ribbon', 'boxed', 'side bar', 'highlight'] },
  { group: 'oc page layout', scope: 'oc', key: 'writingBox', label: 'writing boxes', kind: 'choice', values: ['normal', 'lined paper', 'no box'] },
  { group: 'oc page layout', scope: 'oc', key: 'tagStyle', label: 'tags', kind: 'choice', values: ['pills', 'hashtags', 'plain', 'stamps', 'outlined'] },
  { group: 'oc page layout', scope: 'oc', key: 'chipStyle', label: 'world chips', kind: 'choice', values: ['pills', 'outlined', 'plain'] },
  { group: 'oc page layout', scope: 'oc', key: 'galleryLayout', label: 'gallery layout', kind: 'choice', values: ['grid', 'masonry', 'polaroids', 'filmstrip', 'big'] },
  { group: 'oc page layout', scope: 'oc', key: 'galleryShape', label: 'gallery picture shape', kind: 'choice', values: ['rounded', 'square', 'circle', 'heart', 'arch'] },
  { group: 'oc page layout', scope: 'oc', key: 'tabSticky', label: 'tabs stay on top', kind: 'choice', values: ['off', 'on'] },
  { group: 'oc page layout', scope: 'oc', key: 'tabAlign', label: 'tab spot', kind: 'choice', values: ['left', 'center', 'stretch'] },
  { group: 'oc page layout', scope: 'oc', key: 'tabSize', label: 'tab size', kind: 'choice', values: ['normal', 'small', 'big'] },

  // ---- home ----
  { group: 'home extras', scope: 'home', key: 'ocCardStyle', label: 'oc card style', kind: 'choice', values: ['normal', 'polaroid', 'trading card', 'bubble'] },
  { group: 'home extras', scope: 'home', key: 'worldCardStyle', label: 'world card style', kind: 'choice', values: ['normal', 'postcard', 'window'] },

  // ---- name + text ----
  { group: 'name + text', key: 'nameFx', label: 'name effect', kind: 'choice', values: ['none', 'glitch', 'flicker', 'rainbow', 'neon', 'float', 'shake', 'chrome', 'sparkle'] },
  { group: 'name + text', key: 'nameFont', label: 'name font', kind: 'font' },
  { group: 'name + text', key: 'nameSize', label: 'name size', kind: 'slider', min: 50, max: 220, start: 100, css: pct },
  { group: 'name + text', key: 'nameColor', label: 'name color', kind: 'color' },
  { group: 'name + text', key: 'titleColor', label: 'title color', kind: 'color' },
  { group: 'name + text', key: 'highlight', label: 'title highlight', kind: 'choice', values: ['none', 'marker', 'underline', 'squiggle', 'box', 'circle'] },
  { group: 'name + text', key: 'highlightColor', label: 'highlight color', kind: 'color' },
  { group: 'name + text', key: 'titleSymbol', label: 'title symbol', kind: 'choice', values: ['none', 'hearts', 'sparkles', 'stars', 'flowers', 'crosses', 'moons', 'music'] },
  { group: 'name + text', scope: 'oc', key: 'taglineStyle', label: 'one-liner style', kind: 'choice', values: ['plain', 'italic', 'quote', 'typewriter', 'handwritten', 'caps'] },
  { group: 'name + text', key: 'lineHeight', label: 'line spacing', kind: 'choice', values: ['normal', 'tight', 'airy'] },
  { group: 'name + text', key: 'textAlign', label: 'writing lines up', kind: 'choice', values: ['left', 'center', 'justify'] },
  { group: 'name + text', key: 'faintColor', label: 'faint text color', kind: 'color' },
  { group: 'name + text', key: 'linkColor', label: 'link color', kind: 'color' },
  { group: 'name + text', key: 'labelCase', label: 'label case', kind: 'choice', values: ['caps', 'lower', 'as typed'] },

  // ---- pfp + banner ----
  { group: 'pfp + banner extras', scope: 'oc', key: 'pfpHover', label: 'pfp on hover', kind: 'pic', max: 640 },
  { group: 'pfp + banner extras', scope: 'oc', key: 'pfpBadge', label: 'pfp badge', kind: 'choice', values: ['none', 'online', 'away', 'busy', 'offline', 'heart', 'star', 'crown', 'skull'] },
  { group: 'pfp + banner extras', scope: 'oc', key: 'pfpAnim', label: 'pfp animation', kind: 'choice', values: ['none', 'float', 'spin on hover', 'bounce', 'pulse', 'swing'] },
  { group: 'pfp + banner extras', scope: 'oc', key: 'pfpRing', label: 'pfp ring color', kind: 'color' },
  { group: 'pfp + banner extras', scope: 'oc', key: 'pfpTilt', label: 'pfp tilt', kind: 'slider', min: -20, max: 20, start: 0, unit: '°', css: v => v + 'deg' },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerQuote', label: 'banner words', kind: 'text', max: 120 },
  { group: 'pfp + banner extras', scope: 'oc', key: 'quoteFont', label: 'banner words font', kind: 'font' },
  { group: 'pfp + banner extras', scope: 'oc', key: 'quoteColor', label: 'banner words color', kind: 'color' },
  { group: 'pfp + banner extras', scope: 'oc', key: 'quoteSpot', label: 'banner words spot', kind: 'choice', values: ['center', 'left', 'right', 'bottom'] },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerSlides', label: 'banner slideshow', kind: 'pics' },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerAnim', label: 'banner animation', kind: 'choice', values: ['none', 'pan', 'shimmer', 'sparkle', 'glitch'] },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerColor2', label: 'banner color 2', kind: 'color' },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerPattern', label: 'banner pattern', kind: 'choice', values: PATTERNS },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerAlpha', label: 'banner see-through', kind: 'slider', min: 0, max: 100, start: 0, css: v => 1 - v / 100 },
  { group: 'pfp + banner extras', scope: 'oc', key: 'bannerOverlay', label: 'banner overlay', kind: 'choice', values: ['none', 'dim', 'glow bottom', 'scanlines'] },

  // ---- fun ----
  { group: 'fun', key: 'clickBurst', label: 'click burst', kind: 'choice', values: ['none', 'hearts', 'stars', 'sparkles', 'confetti', 'bats'] },
  { group: 'fun', key: 'intro', label: 'intro screen', kind: 'choice', values: ['none', 'click to enter', 'curtain', 'fade in'] },
  { group: 'fun', key: 'introText', label: 'intro words', kind: 'text', max: 80 },
  { group: 'fun', scope: 'oc', key: 'tabIcon', label: 'browser tab icon', kind: 'choice', values: ['normal', 'their pfp'] },
  { group: 'fun', key: 'spotlight', label: 'spotlight', kind: 'choice', values: ['off', 'on'] },
  { group: 'fun', key: 'cursorPic', label: 'cursor picture', kind: 'pic', max: 64 },
  { group: 'fun', key: 'scrollBar', label: 'scroll bar on top', kind: 'choice', values: ['off', 'on'] },
  { group: 'fun', key: 'backTop', label: 'back to top button', kind: 'choice', values: ['off', 'on'] },
  { group: 'fun', key: 'pageFrame', label: 'page frame', kind: 'choice', values: ['none', 'lace', 'glow', 'chain', 'film', 'dashed'] },
  { group: 'fun', key: 'cornerDeco', label: 'corner decorations', kind: 'choice', values: ['none', 'cobwebs', 'bows', 'stars', 'hearts', 'bats'] },
  { group: 'fun', key: 'pageGlow', label: 'glow behind the page', kind: 'choice', values: ['none', 'color', 'rainbow'] },
];

// pictures that belong to a look (presets + look codes skip these, so a picture is never shared by two ocs)
export const PICTURE_KEYS = ['wallpaper', 'bannerPic', 'slides', 'bannerSlides', 'fallPic', 'pfpHover', 'cursorPic', 'videoBg', 'playlist', 'stickers'];
const NOT_LOOK = ['tabs', 'hiddenTabs', 'musicAutoplay', 'musicShuffle', 'blinkies'];

const slug = v => String(v).replace(/\W/g, '');
const HEX = /^#[0-9a-f]{6}$/i;
const cssString = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ') + '"';

// ---- on the page ----

export async function paintMore(el, look, { accent, ink, bg }) {
  const st = el.style;
  const pics = [];
  for (const o of SPEC) {
    const v = look[o.key];
    if (o.kind === 'choice') {
      for (const c of o.values.slice(1)) el.classList.toggle(`${o.key}-${slug(c)}`, v === c);
    } else if (o.kind === 'slider') {
      const on = typeof v === 'number';
      el.classList.toggle('has-' + o.key, on);
      if (on) st.setProperty('--' + o.key, o.css ? o.css(v) : v);
    } else if (o.kind === 'color') {
      const on = typeof v === 'string' && HEX.test(v);
      el.classList.toggle('has-' + o.key, on);
      if (on) st.setProperty('--' + o.key, v);
    } else if (o.kind === 'font') {
      const f = font(v);
      el.classList.toggle('has-' + o.key, !!f);
      if (f) st.setProperty('--' + o.key, f.css);
    } else if (o.kind === 'text') {
      const on = typeof v === 'string' && v.trim() !== '';
      el.classList.toggle('has-' + o.key, on);
      if (on) st.setProperty('--' + o.key, cssString(v.trim()));
    } else if (o.kind === 'pic') {
      const id = v?.imageId;
      el.classList.toggle('has-' + o.key, !!id);
      if (id) pics.push(store.imageURL(id).then(url => { if (url && look[o.key]?.imageId === id) st.setProperty(`--${o.key}-url`, `url("${url}")`); }));
    }
  }
  // the pattern + vignette + tint + slideshow layers, mouse follow, click bursts, the fixed bits
  const c = { accent: accent || '#ff4fa3', ink: ink || '#f7effc', bg };
  setLayers(el, look, c);
  setParallax(el, look.parallax);
  setBurst(el, look.clickBurst);
  setIntro(el, look.intro, look.introText);
  setScrollBar(el, look.scrollBar === 'on');
  setBackTop(el, look.backTop === 'on');
  setFixedDeco(el, look);
  setBannerSlides(el, look.bannerSlides, look.slideSec);
  setBlinkies(el, look.blinkies);
  if (look.cursorPic?.imageId) {
    const url = await store.imageURL(look.cursorPic.imageId);
    if (url) { st.setProperty('--look-cursor', `url("${url}") 16 16, auto`); el.classList.add('cursor-on'); }
  }
  await Promise.all(pics);
}

// ---- the controls ----

// one card per SPEC line for this scope, grouped: { 'background extras': [cards], ... }
export function moreCards(look, changed, scope) {
  const groups = {};
  for (const o of SPEC) {
    if (o.scope && o.scope !== scope) continue;
    (groups[o.group] ||= []).push(cardFor(o, look, changed));
  }
  return groups;
}

function cardFor(o, look, changed) {
  const k = o.key;
  if (o.kind === 'choice') return choiceCard(o.label, o.values, look[k] ?? o.values[0], v => { look[k] = v; changed(); });
  if (o.kind === 'slider') return sliderCard(o.label, () => look[k] ?? null, v => look[k] = v, changed, { min: o.min, max: o.max, start: o.start, unit: o.unit ?? '%' });
  if (o.kind === 'color') return colorCard(o.label, () => look[k], v => look[k] = v, changed, [...PAGE_INKS, ...PAGE_BGS.slice(0, 6)]);
  if (o.kind === 'font') return fontCard(o.label, look[k] ?? null, v => { look[k] = v; changed(); });
  if (o.kind === 'text') {
    return card(o.label, null, h('input', { type: 'text', value: look[k] || '', maxLength: o.max || 80, oninput: e => { look[k] = e.target.value; changed(); } }));
  }
  if (o.kind === 'pic') {
    if (!look[k] || typeof look[k] !== 'object') look[k] = { imageId: null };
    return pictureCard(o.label, look[k], changed, { maxDim: o.max || 1600 });
  }
  if (o.kind === 'pics') return picsCard(o.label, look, k, changed);
  if (o.kind === 'sticker') {
    const wrap = h('div', { class: 'style-card' });
    const draw = () => {
      clear(wrap).append(
        h('div', { class: 'style-card-head' }, h('h3', {}, o.label),
          look[k] ? h('button', { class: 'link-btn', onclick: () => { look[k] = null; changed(); draw(); } }, 'remove') : h('span')),
        h('div', { class: 'sticker-pick-row' },
          look[k] ? h('span', { class: 'sticker-pick-prev' }, stickerNode(look[k])) : null,
          h('button', { class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { look[k] = id; changed(); draw(); }) }, look[k] ? 'change sticker' : '+ 3d sticker')));
    };
    draw();
    return wrap;
  }
  return null;
}

// a few pictures in a row (slideshows)
function picsCard(label, look, k, changed) {
  if (!Array.isArray(look[k])) look[k] = [];
  const list = look[k];
  const wrap = h('div', { class: 'style-card' });
  const draw = () => {
    const thumbs = h('div', { class: 'pics-row' });
    list.forEach((p, i) => {
      const img = h('img', { alt: '' });
      store.imageURL(p.imageId).then(u => { if (u) img.src = u; });
      thumbs.append(h('div', { class: 'pics-thumb' }, img,
        h('button', { class: 'pics-x', title: 'remove', onclick: () => { store.deleteImage(p.imageId); list.splice(i, 1); changed(); draw(); } }, '✕')));
    });
    clear(wrap).append(h('div', { class: 'style-card-head' }, h('h3', {}, label), h('span')), thumbs,
      h('button', { class: 'btn ghost sm', onclick: add }, '+ add picture'));
  };
  async function add() {
    const file = await pickAndCrop();
    if (!file) return;
    try {
      const { blob } = await shrinkImage(file, 2000);
      list.push({ imageId: await store.putImage(blob) });
      changed();
      draw();
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }
  draw();
  return wrap;
}

// ---- tools: undo, surprise me, presets, copy from an oc, look codes ----

// just the settings of a look: no pictures, no tabs/music
export function settingsOf(look) {
  const out = {};
  for (const [k, v] of Object.entries(look)) {
    if (PICTURE_KEYS.includes(k) || NOT_LOOK.includes(k) || k === 'id') continue;
    out[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
  }
  return out;
}
function applySettings(look, settings) {
  for (const [k, v] of Object.entries(settings)) {
    if (PICTURE_KEYS.includes(k) || NOT_LOOK.includes(k) || k === 'id') continue;
    look[k] = v;
  }
}

// wraps changed() so every change can be undone. returns { changed, card }
export function toolsFor(look, changed, { scope, reload, ownerId }) {
  const history = [JSON.stringify(look)];
  let timer = null;
  const tracked = () => {
    changed();
    clearTimeout(timer);
    timer = setTimeout(() => { // sliders fire a lot: one undo step per pause
      const now = JSON.stringify(look);
      if (now !== history.at(-1)) { history.push(now); if (history.length > 60) history.shift(); undoBtn.disabled = false; }
    }, 350);
  };
  const restore = json => {
    const keep = Object.fromEntries(PICTURE_KEYS.filter(k => k in look).map(k => [k, look[k]]));
    for (const k of Object.keys(look)) delete look[k];
    Object.assign(look, JSON.parse(json), keep);
    changed();
    reload();
  };
  const undoBtn = h('button', { class: 'btn ghost sm', disabled: true, onclick: () => {
    clearTimeout(timer);
    if (history.length < 2) return;
    history.pop();
    restore(history.at(-1));
  } }, 'undo');

  const surprise = () => {
    const r = a => a[Math.floor(Math.random() * a.length)];
    const pick = (key, values, odds = .4) => { look[key] = Math.random() < odds ? r(values.slice(1)) : values[0]; };
    const bgc = r(PAGE_BGS);
    look.bg = bgc;
    look.text = readableInk(bgc);
    look.accent = scope === 'home' ? r(PAGE_INKS.slice(4)) : look.accent;
    for (const [key, values] of Object.entries(LOOK_CHOICES)) {
      if (['cursor', 'cursorTrail', 'pageIn', 'textSize', 'bgFilter', 'titleCase'].includes(key)) continue;
      pick(key, values, key === 'fall' || key === 'texture' ? .5 : .35);
    }
    for (const o of SPEC) {
      if (o.kind !== 'choice' || (o.scope && o.scope !== scope)) continue;
      if (['intro', 'tabIcon', 'spotlight', 'scrollBar', 'backTop', 'clickBurst', 'tabSticky', 'topBar'].includes(o.key)) continue;
      pick(o.key, o.values, .3);
    }
    look.grad1 = Math.random() < .4 ? r(PAGE_BGS) : null;
    look.grad2 = look.grad1 ? r(PAGE_BGS) : null;
    tracked();
    reload();
  };

  const savePreset = () => {
    const input = h('input', { type: 'text', placeholder: 'name', maxLength: 40, dataset: { autofocus: '' } });
    openModal({
      title: 'save as a preset', body: input,
      actions: [{ label: 'save', kind: 'primary', onClick: close => {
        close();
        store.home.presets ||= [];
        store.home.presets.push({ id: 'pr_' + uid(), name: input.value.trim() || 'preset ' + (store.home.presets.length + 1), look: settingsOf(look) });
        store.saveHome();
        toast('saved');
        drawPresets();
      } }],
    });
  };
  const presetList = h('div', { class: 'preset-list' });
  const drawPresets = () => {
    clear(presetList);
    for (const p of store.home.presets || []) {
      presetList.append(h('div', { class: 'preset-row' },
        h('span', { class: 'preset-swatch', style: { background: p.look.bg || 'var(--panel2)', borderColor: p.look.accent || p.look.border || 'var(--edge)' } }),
        h('span', { class: 'preset-name' }, p.name),
        h('button', { class: 'btn ghost sm', onclick: () => { applySettings(look, p.look); tracked(); reload(); } }, 'use'),
        h('button', { class: 'icon-btn sm', title: 'delete', onclick: async () => {
          if (!await confirmDialog(`delete "${p.name}"?`, { okLabel: 'delete', danger: true })) return;
          store.home.presets = store.home.presets.filter(x => x !== p);
          store.saveHome();
          drawPresets();
        } }, '✕')));
    }
  };
  drawPresets();

  const copyFrom = () => {
    const ocs = store.chars.filter(c => c.id !== ownerId && c.page);
    if (!ocs.length) { toast('no other ocs yet'); return; }
    const m = openModal({
      title: 'copy the look from',
      body: h('div', { class: 'pick-list' }, ocs.map(c => h('button', { class: 'pick-row', onclick: () => { applySettings(look, settingsOf(c.page)); tracked(); m.close(); reload(); } }, c.name || 'unnamed oc'))),
    });
  };

  const exportCode = async () => {
    const code = 'ocw1:' + btoa(unescape(encodeURIComponent(JSON.stringify(settingsOf(look)))));
    try { await navigator.clipboard.writeText(code); toast('look code copied'); } catch {
      openModal({ title: 'look code', body: h('textarea', { class: 'look-code', readOnly: true, value: code }) });
    }
  };
  const importCode = () => {
    const area = h('textarea', { class: 'look-code', placeholder: 'ocw1:...' });
    openModal({
      title: 'paste a look code', body: area,
      actions: [{ label: 'use it', kind: 'primary', onClick: close => {
        close();
        try {
          const raw = area.value.trim().replace(/^ocw1:/, '');
          const got = JSON.parse(decodeURIComponent(escape(atob(raw))));
          if (!got || typeof got !== 'object') throw new Error('bad');
          applySettings(look, got);
          tracked();
          reload();
        } catch { toast("that code didn't work", 'bad'); }
      } }],
    });
  };

  const toolCard = h('div', { class: 'style-card tools-card' },
    h('div', { class: 'style-card-head' }, h('h3', {}, 'tools')),
    h('div', { class: 'tools-row' },
      undoBtn,
      h('button', { class: 'btn ghost sm', onclick: surprise }, 'surprise me'),
      h('button', { class: 'btn ghost sm', onclick: copyFrom }, 'copy from an oc'),
      h('button', { class: 'btn ghost sm', onclick: exportCode }, 'copy look code'),
      h('button', { class: 'btn ghost sm', onclick: importCode }, 'paste look code')));
  const presetCard = h('div', { class: 'style-card' },
    h('div', { class: 'style-card-head' }, h('h3', {}, 'presets'), h('button', { class: 'link-btn', onclick: savePreset }, 'save this look')),
    presetList);
  return { changed: tracked, cards: [toolCard, presetCard] };
}

// collapsible groups + a search box over a style grid (h3.style-group headers followed by their cards)
export function organize(grid) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('ocw-style-open') || '{}'); } catch {}
  const groups = [...grid.querySelectorAll(':scope > .style-group')];
  const cardsOf = g => {
    const out = [];
    for (let n = g.nextElementSibling; n && !n.classList.contains('style-group'); n = n.nextElementSibling) out.push(n);
    return out;
  };
  const set = (g, open) => {
    g.classList.toggle('closed', !open);
    cardsOf(g).forEach(c => c.classList.toggle('group-hidden', !open));
  };
  groups.forEach((g, i) => {
    const name = g.textContent;
    g.classList.add('foldable');
    g.tabIndex = 0;
    set(g, saved[name] ?? i < 1);
    const toggle = () => {
      const open = g.classList.contains('closed');
      set(g, open);
      saved[name] = open;
      try { localStorage.setItem('ocw-style-open', JSON.stringify(saved)); } catch {}
    };
    g.onclick = toggle;
    g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  });
  const search = h('input', { type: 'search', class: 'style-search', placeholder: 'find a setting' });
  search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    grid.classList.toggle('searching', !!q);
    for (const g of groups) {
      let any = false;
      for (const c of cardsOf(g)) {
        const hit = !q || (c.querySelector('h3')?.textContent || '').toLowerCase().includes(q) || g.textContent.toLowerCase().includes(q);
        c.classList.toggle('search-miss', !!q && !hit);
        if (q && hit) any = true;
      }
      g.classList.toggle('search-miss', !!q && !any);
    }
  };
  grid.prepend(h('div', { class: 'style-search-wrap' }, search));
}
