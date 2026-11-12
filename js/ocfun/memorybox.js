// memory box: an open shoebox of keepsakes. photos, ticket stubs, folded notes, pressed flowers + stickers,
// tossed in on top of each other. every keepsake has a title, a date and the story behind it (tap to read).

import { h, fill, swatches, openModal } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic } from './kit.js';
import { stickerNode } from '../diary/stickers.js';
import { pickStickerIcon } from '../parts.js';
import { dragLayer, fitStage, toolBar, deleteKey, defaults, newThing, picImg, chipTabs } from './room-layer.js';

export const meta = { id: 'memorybox', label: 'memory box', icon: '1f4e6' };

const W = 960, H = 680;
const INSIDE = { x0: 190, y0: 200, x1: 860, y1: 600 };
const BOXES = { kraft: ['#c49a6c', '#a57a4c', '#dcb98f'], black: ['#26222a', '#141116', '#3a343f'], pink: ['#ff9cc8', '#e676a8', '#ffc4de'], white: ['#f2ede8', '#d6cec6', '#ffffff'], lilac: ['#c9b3f2', '#a68ad9', '#e2d4fb'], red: ['#c4253a', '#8f1626', '#e0505f'] };
const PAPER = ['#fffdf3', '#ffd1e6', '#fff27a', '#c9b3f2', '#b5f0dc', '#141114', '#ffb38a'];
const KINDS = ['photo', 'ticket', 'note', 'flower', 'sticker'];

const DEF = { box: 'kraft', items: null };
const starter = d => {
  d.items = [
    newThing({ kind: 'ticket', title: 'first concert', sub: 'row g · seat 13', date: '', story: '', color: '#ff8ac4', x: 330, y: 300, r: -12, k: .9 }),
    newThing({ kind: 'note', title: 'meet me after 6th', date: '', story: '', color: '#fffdf3', x: 640, y: 290, r: 8, k: .9 }),
    newThing({ kind: 'flower', s: 'f:pansy-purple', title: 'from the dance', date: '', story: '', x: 480, y: 470, r: -4, k: .9 }),
    newThing({ kind: 'sticker', s: 'e:1f5a4', title: '', date: '', story: '', x: 760, y: 500, r: 14, k: .6 }),
  ];
};

function keepsake(it) {
  if (it.kind === 'photo') {
    return h('div', { class: 'mb-photo' },
      h('div', { class: 'mb-photo-pic' }, it.imageId ? picImg(it.imageId) : h('span', { class: 'mb-empty' }, '♡')),
      h('div', { class: 'mb-photo-cap' }, it.title || ''));
  }
  if (it.kind === 'ticket') {
    return h('div', { class: 'mb-ticket', style: { '--tc': it.color || '#ff8ac4' } },
      h('div', { class: 'mb-ticket-main' }, h('small', {}, 'admit one'), h('b', {}, it.title || ''), h('span', {}, it.sub || '')),
      h('div', { class: 'mb-ticket-stub' }, h('span', {}, '№ ' + String(it.id.charCodeAt(3) * 131 % 9000 + 1000))));
  }
  if (it.kind === 'note') {
    const dark = it.color === '#141114';
    return h('div', { class: 'mb-note', style: { '--nc': it.color || '#fffdf3', color: dark ? '#ffd1e6' : '#2a1a2e' } }, h('span', {}, it.title || ''));
  }
  if (it.kind === 'flower') {
    return h('div', { class: 'mb-flower' },
      h('i', { class: 'mb-flower-tape' }),
      h('div', { class: 'mb-flower-art' }, it.imageId ? picImg(it.imageId) : stickerNode(it.s || 'f:pansy-purple')),
      h('div', { class: 'mb-flower-label' }, it.title || ''));
  }
  return h('div', { class: 'mb-stk' }, it.imageId ? picImg(it.imageId) : stickerNode(it.s || 'e:1f5a4'));
}

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  if (!Array.isArray(d.items)) { starter(d); if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let bar = null;
  let tab = 'add';

  const layer = dragLayer({
    items: d.items, editable: edit, cls: 'mb-items', render: keepsake,
    bounds: () => INSIDE,
    onChange: save,
    onPick: (it, live) => { if (live) bar?.sync(); else drawPick(it); },
    onTap: it => story(it),
  });

  const scene = h('div', { class: 'mb-scene' },
    h('i', { class: 'mb-floor' }),
    h('div', { class: 'mb-lid' }, h('i', { class: 'mb-lid-band' }), h('span', { class: 'mb-lid-label' }, ctx.char.name || 'keep out')),
    h('div', { class: 'mb-box' }, h('i', { class: 'mb-wall t' }), h('i', { class: 'mb-wall b' }), h('i', { class: 'mb-wall l' }), h('i', { class: 'mb-wall r' }), h('i', { class: 'mb-bottom' }), h('i', { class: 'mb-tissue' })),
    layer.el,
    h('i', { class: 'mb-rim' }));
  const stage = h('div', { class: 'mb-stage' }, scene);
  const pickBar = h('div', { class: 'rl-pick mb-pick', hidden: true });
  const panel = h('div', { class: 'mb-panel' });
  el.append(appBar(ctx, meta), h('div', { class: 'mb-app' }, stage, pickBar, edit ? panel : null));
  const unfit = fitStage(stage, scene, W, H);
  const unkey = edit ? deleteKey(layer) : () => {};

  function paint() {
    const [c, dk, lt] = BOXES[d.box] || BOXES.kraft;
    scene.style.setProperty('--bx', c); scene.style.setProperty('--bxd', dk); scene.style.setProperty('--bxl', lt);
  }

  // ---- the story behind one keepsake ----
  function story(it) {
    const art = h('div', { class: 'mb-story-art' }, keepsake(it));
    const body = edit
      ? h('div', { class: 'mb-story' }, art,
        h('input', { type: 'text', class: 'mb-story-title', value: it.title || '', maxLength: 40, placeholder: 'title', oninput: e => { it.title = e.target.value; layer.refresh(it); save(); } }),
        h('input', { type: 'text', class: 'mb-story-date', value: it.date || '', maxLength: 30, placeholder: 'when', oninput: e => { it.date = e.target.value; save(); } }),
        h('textarea', { class: 'mb-story-text', rows: 6, maxLength: 1500, value: it.story || '', placeholder: 'the story', oninput: e => { it.story = e.target.value; save(); } }))
      : h('div', { class: 'mb-story' }, art,
        h('div', { class: 'mb-story-title' }, it.title || ''),
        it.date ? h('div', { class: 'mb-story-date' }, it.date) : null,
        it.story ? h('div', { class: 'mb-story-text' }, it.story) : null);
    openModal({ title: it.title || 'keepsake', body, wide: true });
  }

  // ---- the picked keepsake ----
  function drawPick(it) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { bar = null; fill(pickBar); return; }
    const refresh = () => { layer.refresh(it); save(); };
    const extra = [
      h('div', { class: 'rl-field' }, h('span', {}, 'title'), h('input', { type: 'text', maxLength: 40, value: it.title || '', oninput: e => { it.title = e.target.value; refresh(); } })),
      it.kind === 'ticket' ? h('div', { class: 'rl-field' }, h('span', {}, 'seat'), h('input', { type: 'text', maxLength: 26, value: it.sub || '', oninput: e => { it.sub = e.target.value; refresh(); } })) : null,
      it.kind === 'ticket' || it.kind === 'note' ? h('div', { class: 'rl-field' }, h('span', {}, 'paper'), swatches(it.color || PAPER[0], v => { it.color = v; refresh(); }, it.kind === 'ticket' ? ['#ff8ac4', '#ffd84d', '#7df9d0', '#b18cff', '#6ec6ff', '#f6eefb', '#141114'] : PAPER)) : null,
      h('div', { class: 'rl-field' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => story(it) }, 'story'),
        it.kind === 'photo' || it.kind === 'flower' || it.kind === 'sticker' ? h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
          const up = await uploadPic(1000);
          if (!up) return;
          if (it.imageId) store.deleteImage(it.imageId);
          it.imageId = up.imageId;
          refresh(); drawPick(it);
        } }, it.imageId ? 'change picture' : '+ picture') : null,
        it.kind === 'flower' || it.kind === 'sticker' ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { if (it.imageId) store.deleteImage(it.imageId); it.imageId = null; it.s = id; refresh(); drawPick(it); }) }, 'swap sticker') : null),
    ].filter(Boolean);
    bar = toolBar(layer, it, save, { extra, noFlip: it.kind !== 'sticker' && it.kind !== 'flower' });
    fill(pickBar, bar);
  }

  // ---- adding ----
  const spot = () => ({ x: Math.round(260 + Math.random() * 520), y: Math.round(260 + Math.random() * 280), r: Math.round((Math.random() - .5) * 30) });
  const base = { title: '', date: '', story: '' };
  async function addPhoto() {
    const up = await uploadPic(1000);
    if (!up) return;
    layer.add(newThing({ kind: 'photo', ...base, imageId: up.imageId, k: .85, ...spot() }));
  }
  const ADD = {
    photo: addPhoto,
    ticket: () => layer.add(newThing({ kind: 'ticket', ...base, title: 'the show', sub: '', color: '#ff8ac4', k: .85, ...spot() })),
    note: () => layer.add(newThing({ kind: 'note', ...base, title: 'hi', color: PAPER[Math.floor(Math.random() * 5)], k: .85, ...spot() })),
    flower: () => pickStickerIcon(id => layer.add(newThing({ kind: 'flower', ...base, s: id, k: .85, ...spot() }))),
    sticker: () => pickStickerIcon(id => layer.add(newThing({ kind: 'sticker', ...base, s: id, k: .6, ...spot() }))),
  };
  const ART = {
    photo: () => h('i', { class: 'mb-mini-photo' }),
    ticket: () => h('i', { class: 'mb-mini-ticket' }),
    note: () => h('i', { class: 'mb-mini-note' }),
    flower: () => stickerNode('f:pansy-purple'),
    sticker: () => stickerNode('e:1f5a4'),
  };
  const body = h('div', { class: 'mb-panel-body' });
  const tabs = chipTabs([['add', 'add'], ['box', 'box']], tab, v => { tab = v; drawPanel(); });
  if (edit) panel.append(tabs, body);
  function drawPanel() {
    if (tab === 'add') {
      fill(body, h('div', { class: 'mb-adds' }, KINDS.map(k => h('button', { type: 'button', class: 'mb-add', onclick: ADD[k] }, h('span', { class: 'mb-add-art' }, ART[k]()), h('span', {}, '+ ' + (k === 'flower' ? 'pressed flower' : k))))));
      return;
    }
    fill(body, h('div', { class: 'rm-group' }, h('h4', {}, 'box'), h('div', { class: 'mb-box-picks' }, Object.entries(BOXES).map(([name, [c, dk]]) => h('button', {
      type: 'button', class: 'mb-box-pick' + (d.box === name ? ' on' : ''), style: { background: `linear-gradient(${c}, ${dk})` }, title: name,
      onclick: () => { d.box = name; paint(); save(); drawPanel(); },
    }, name)))));
  }

  paint();
  if (edit) drawPanel();
  return () => { unfit(); unkey(); };
}
