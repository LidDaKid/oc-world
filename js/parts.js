// little pieces more than one page uses

import { h, clear, fill, initials, toast, downloadBlob, pickFile, shrinkImage, openModal } from './ui.js';
import { store } from './store.js';
import { pickAndCrop } from './crop.js';
import { STICKER_TABS, stickerNode } from './diary/stickers.js';

// picture of an oc. falls back to their initials. the class decides the shape + size.
// also works for someone who's only a typed name: portrait({ name: 'her mom' })
export function portrait(char, cls = '') {
  const el = h('div', { class: 'portrait ' + cls, style: { '--c': char?.color || '#9b8aa8' } });
  if (char?.imageId) {
    const img = h('img', { alt: '', draggable: false });
    store.imageURL(char.imageId).then(url => { if (url) img.src = url; });
    el.append(img);
  } else {
    el.append(h('span', { class: 'initials' }, initials(char?.name)));
  }
  return el;
}

export const nameOf = char => char?.name || 'unnamed oc';

// the trading-card looking thing in every oc grid. extra = stuff to tuck in the corner (like a remove button)
export function ocCard(char, href, extra) {
  return h('a', { class: 'card oc-card', href, style: { '--c': char.color } },
    portrait(char, 'card-pic'),
    h('div', { class: 'oc-card-text' },
      h('h3', {}, nameOf(char)),
      char.tagline ? h('p', { class: 'oc-card-tagline' }, char.tagline) : null,
      store.isMine(char) ? null : h('span', { class: 'owner-tag' }, char.ownerName || 'someone else'),
      char.tags.length ? h('div', { class: 'tag-row' }, char.tags.slice(0, 3).map(t => h('span', { class: 'tag' }, t))) : null),
    extra);
}

export function emptyState(icon, title, text, action) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-icon' }, icon),
    h('h2', {}, title),
    text ? h('p', { class: 'muted' }, text) : null,
    action);
}

export const WORLD_EMOJI = ['🪐', '🌙', '⭐', '🏰', '🌲', '🌊', '🌸', '🔮', '🐉', '🏙️', '🎸', '🦋', '👑', '🕯️', '🍄', '☁️'];

export function emojiPicker(value, onPick, choices = WORLD_EMOJI) {
  const wrap = h('div', { class: 'emoji-picker' });
  const draw = () => {
    clear(wrap);
    for (const e of choices) {
      wrap.append(h('button', {
        type: 'button', class: 'emoji' + (e === value ? ' on' : ''),
        onclick: () => { value = e; onPick(e); draw(); },
      }, e));
    }
  };
  draw();
  return wrap;
}

// a world's icon: the picture they uploaded, or a 3d sticker, or else the emoji
export function worldIcon(w) {
  if (!w.icon?.imageId && w.icon?.sticker) return h('span', { class: 'pic-icon stk-icon' }, stickerNode(w.icon.sticker));
  return picOr(w.icon?.imageId, w.emoji);
}

export function picOr(imageId, fallback) {
  if (!imageId) return fallback;
  const img = h('img', { class: 'pic-icon', alt: '', draggable: false });
  store.imageURL(imageId).then(url => { if (url) img.src = url; });
  return img;
}

// the emoji choices + "upload your own". works on a draft: draft.emoji, draft.iconId (a picture beats the emoji).
// call done(saved) when the box closes so pictures that didn't get used are cleaned up.
export function iconPicker(draft, oldId) {
  const uploads = [];
  const pic = h('div', { class: 'icon-pick' });
  const drawPic = () => fill(pic,
    draft.iconId ? h('div', { class: 'pic-preview' }, picOr(draft.iconId)) : draft.sticker ? h('div', { class: 'pic-preview' }, h('span', { class: 'pic-icon stk-icon' }, stickerNode(draft.sticker))) : null,
    h('button', { type: 'button', class: 'btn ghost sm', onclick: upload }, draft.iconId ? 'change picture' : '+ upload your own'),
    h('button', { type: 'button', class: 'btn ghost sm', onclick: pickSticker }, draft.sticker ? 'change sticker' : '+ 3d sticker'),
    draft.iconId || draft.sticker ? h('button', { type: 'button', class: 'link-btn', onclick: () => { draft.iconId = null; draft.sticker = null; drawPic(); } }, 'use the emoji') : null);
  // any sticker from the diaries (3d emoji, gems, flowers...)
  function pickSticker() {
    let tab = STICKER_TABS[0][0];
    const tabs = h('div', { class: 'stk-tabs' });
    const grid = h('div', { class: 'stk-grid icon-stk-grid' });
    const m = openModal({ title: '3d sticker', body: h('div', { class: 'icon-stk-pick' }, tabs, grid) });
    const draw = () => {
      fill(tabs, STICKER_TABS.filter(t => !['doodles', 'words', 'tape', 'spills'].includes(t[0])).map(([name, icon]) => h('button', { type: 'button', class: 'stk-tab' + (name === tab ? ' on' : ''), title: name, onclick: () => { tab = name; draw(); } }, h('span', { class: 'stk-tab-icon' }, stickerNode(icon)))));
      fill(grid, STICKER_TABS.find(t => t[0] === tab)[2].map(id => h('button', { type: 'button', class: 'stk-cell', onclick: () => { draft.sticker = id; draft.iconId = null; drawPic(); m.close(); } }, stickerNode(id))));
    };
    draw();
  }
  async function upload() {
    const file = await pickAndCrop({ aspect: 1 });
    if (!file) return;
    try {
      const { blob } = await shrinkImage(file, 256);
      draft.iconId = await store.putImage(blob);
      uploads.push(draft.iconId);
      drawPic();
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }
  drawPic();
  const el = h('div', { class: 'icon-picker' }, emojiPicker(draft.emoji, e => { draft.emoji = e; draft.iconId = null; draft.sticker = null; drawPic(); }), pic);
  const done = saved => {
    const keep = saved ? draft.iconId : oldId;
    uploads.filter(id => id !== keep).forEach(id => store.deleteImage(id));
    if (saved && oldId && oldId !== keep) store.deleteImage(oldId);
  };
  return { el, done };
}

const THEMES = ['midnight', 'candy', 'stardrop'];

export function themeButton() {
  return h('button', {
    class: 'icon-btn', title: 'switch colors',
    onclick: () => {
      const now = document.documentElement.dataset.theme;
      const next = THEMES[(THEMES.indexOf(now) + 1) % THEMES.length];
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('ocw-theme', next); } catch {}
      toast('theme: ' + next);
    },
  }, '🎨');
}

export function downloadBackup(data, name) {
  const safe = (name || 'backup').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'backup';
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${safe}.ocworld.json`);
  toast('backup downloaded');
}

export function zoomButtons(getPz, fit) {
  return h('div', { class: 'zoom-btns' },
    h('button', { class: 'icon-btn', title: 'zoom out', onclick: () => getPz().zoomBy(1 / 1.3) }, '−'),
    h('button', { class: 'icon-btn', title: 'zoom in', onclick: () => getPz().zoomBy(1.3) }, '+'),
    h('button', { class: 'icon-btn', title: 'fit everything on screen', onclick: fit }, '⤢'));
}
