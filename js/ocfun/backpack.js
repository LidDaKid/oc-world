// backpack: "what's in their bag". an open bag seen from above, with whatever they carry dropped inside.
// every thing is a 3d sticker or a picture of your own, with a name + a little note. drag to arrange,
// tap one to read its note.

import { h, fill, swatches, segmented, openModal } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic } from './kit.js';
import { stickerNode } from '../diary/stickers.js';
import { pickStickerIcon } from '../parts.js';
import { dragLayer, fitStage, toolBar, deleteKey, defaults, newThing, picImg, chipTabs } from './room-layer.js';

export const meta = { id: 'backpack', label: 'backpack', icon: '1f392' };

const W = 900, H = 720;
const BAGS = ['backpack', 'purse', 'tote'];
const BAG_COLORS = ['#ff4fa3', '#141114', '#2a0a1b', '#b18cff', '#ff8ac4', '#7df9d0', '#6ec6ff', '#ffd84d', '#d81e3a', '#f6eefb', '#8a5a3c', '#3b1d4a'];
const PATTERNS = ['plain', 'checker', 'plaid', 'polka', 'leopard', 'hearts'];
// where things can sit: inside the opening
const INSIDE = { backpack: { x0: 230, y0: 190, x1: 670, y1: 560 }, purse: { x0: 170, y0: 230, x1: 730, y1: 540 }, tote: { x0: 190, y0: 200, x1: 710, y1: 580 } };

const DEF = { bag: 'backpack', color: '#141114', pattern: 'checker', charm: 'e:1f987', items: null };
const starter = d => {
  d.items = [
    newThing({ kind: 'thing', s: 'e:1f484', name: 'lip gloss', note: '', x: 300, y: 300, r: -18, k: .75 }),
    newThing({ kind: 'thing', s: 'e:1f3a7', name: 'headphones', note: '', x: 520, y: 280, r: 10, k: .95 }),
    newThing({ kind: 'thing', s: 'e:1f511', name: 'keys', note: '', x: 610, y: 450, r: 24, k: .7 }),
    newThing({ kind: 'thing', s: 'e:1f4d3', name: 'notebook', note: '', x: 420, y: 440, r: -6, k: 1 }),
    newThing({ kind: 'thing', s: 'e:1f36c', name: 'candy', note: '', x: 300, y: 480, r: 30, k: .65 }),
  ];
};

function thingNode(it) {
  return h('div', { class: 'bp-thing' + (it.imageId ? ' bp-cutout' : '') },
    it.imageId ? picImg(it.imageId) : stickerNode(it.s || 'e:2b50'),
    it.name ? h('span', { class: 'bp-tag' }, it.name) : null);
}

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  if (!Array.isArray(d.items)) { starter(d); if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let bar = null;
  let tab = 'add';

  const layer = dragLayer({
    items: d.items, editable: edit, cls: 'bp-items', render: thingNode,
    bounds: () => INSIDE[d.bag] || INSIDE.backpack,
    onChange: save,
    onPick: (it, live) => { if (live) bar?.sync(); else drawPick(it); },
    onTap: it => look(it),
  });

  const bag = h('div', { class: 'bp-bag' },
    h('i', { class: 'bp-handle' }), h('i', { class: 'bp-strap l' }), h('i', { class: 'bp-strap r' }),
    h('div', { class: 'bp-body' }, h('i', { class: 'bp-pattern' })),
    h('div', { class: 'bp-inside' }, h('i', { class: 'bp-lining' })),
    h('i', { class: 'bp-zip' }));
  const front = h('div', { class: 'bp-front' }, h('i', { class: 'bp-pattern' }), h('i', { class: 'bp-pull' }));
  const charm = h('div', { class: 'bp-charm' });
  const scene = h('div', { class: 'bp-scene' }, h('i', { class: 'bp-floor' }), bag, layer.el, front, charm);
  const stage = h('div', { class: 'bp-stage' }, scene);
  const pickBar = h('div', { class: 'rl-pick bp-pick', hidden: true });
  const panel = h('div', { class: 'bp-panel' });
  el.append(appBar(ctx, meta), h('div', { class: 'bp-app' }, stage, pickBar, edit ? panel : null));
  const unfit = fitStage(stage, scene, W, H);
  const unkey = edit ? deleteKey(layer) : () => {};

  function paint() {
    scene.dataset.bag = d.bag;
    scene.dataset.pattern = d.pattern;
    scene.style.setProperty('--bag', d.color);
    fill(charm, d.charm ? h('i', { class: 'bp-chain' }) : null, d.charm ? h('div', { class: 'bp-charm-stk' }, stickerNode(d.charm)) : null);
  }

  // ---- reading / writing one thing's note ----
  function look(it) {
    const big = h('div', { class: 'bp-look-art' + (it.imageId ? ' bp-cutout' : '') }, it.imageId ? picImg(it.imageId) : stickerNode(it.s || 'e:2b50'));
    const body = edit
      ? h('div', { class: 'bp-look' }, big,
        h('input', { type: 'text', class: 'bp-look-name', value: it.name || '', maxLength: 30, placeholder: 'name', oninput: e => { it.name = e.target.value; layer.refresh(it); save(); } }),
        h('textarea', { class: 'bp-look-note', rows: 4, maxLength: 400, value: it.note || '', placeholder: 'note', oninput: e => { it.note = e.target.value; save(); } }))
      : h('div', { class: 'bp-look' }, big, h('div', { class: 'bp-look-name' }, it.name || ''), it.note ? h('div', { class: 'bp-look-note' }, it.note) : null);
    openModal({ title: it.name || 'in the bag', body });
  }

  // ---- the picked thing ----
  function drawPick(it) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { bar = null; fill(pickBar); return; }
    const extra = [
      h('div', { class: 'rl-field' }, h('span', {}, 'name'), h('input', { type: 'text', maxLength: 30, value: it.name || '', oninput: e => { it.name = e.target.value; layer.refresh(it); save(); } })),
      h('div', { class: 'rl-field' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => look(it) }, 'note'),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { if (it.imageId) store.deleteImage(it.imageId); it.imageId = null; it.s = id; layer.refresh(it); save(); }) }, 'swap sticker'),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
          const up = await uploadPic(800);
          if (!up) return;
          if (it.imageId) store.deleteImage(it.imageId);
          it.imageId = up.imageId; it.s = null;
          layer.refresh(it); save();
        } }, 'use a picture')),
    ];
    bar = toolBar(layer, it, save, { extra });
    fill(pickBar, bar);
  }

  // ---- adding + the bag itself ----
  const spot = () => { const b = INSIDE[d.bag] || INSIDE.backpack; return { x: Math.round(b.x0 + 60 + Math.random() * (b.x1 - b.x0 - 120)), y: Math.round(b.y0 + 50 + Math.random() * (b.y1 - b.y0 - 100)), r: Math.round((Math.random() - .5) * 40) }; };
  const addSticker = () => pickStickerIcon(id => layer.add(newThing({ kind: 'thing', s: id, name: '', note: '', k: .85, ...spot() })));
  async function addPicture() {
    const up = await uploadPic(800);
    if (!up) return;
    layer.add(newThing({ kind: 'thing', imageId: up.imageId, name: '', note: '', k: .8, ...spot() }));
  }
  const body = h('div', { class: 'bp-panel-body' });
  const tabs = chipTabs([['add', 'add'], ['bag', 'bag']], tab, v => { tab = v; drawPanel(); });
  if (edit) panel.append(tabs, body);
  const group = (title, ...kids) => h('div', { class: 'rm-group' }, h('h4', {}, title), ...kids);
  function drawPanel() {
    if (tab === 'add') {
      fill(body, h('div', { class: 'bp-adds' },
        h('button', { type: 'button', class: 'bp-add', onclick: addSticker }, h('span', { class: 'bp-add-art' }, stickerNode('e:1f484')), h('span', {}, '+ sticker')),
        h('button', { type: 'button', class: 'bp-add', onclick: addPicture }, h('span', { class: 'bp-add-art bp-add-pic' }), h('span', {}, '+ picture'))));
      return;
    }
    fill(body,
      group('bag', segmented(BAGS.map(v => ({ value: v, label: v })), d.bag, v => { d.bag = v; clampAll(); paint(); save(); })),
      group('color', swatches(d.color, v => { d.color = v; paint(); save(); }, BAG_COLORS)),
      group('pattern', segmented(PATTERNS.map(v => ({ value: v, label: v })), d.pattern, v => { d.pattern = v; paint(); save(); })),
      group('keychain', h('div', { class: 'bp-charm-row' },
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { d.charm = id; paint(); save(); drawPanel(); }) }, d.charm ? 'change' : '+ keychain'),
        d.charm ? h('button', { type: 'button', class: 'link-btn', onclick: () => { d.charm = null; paint(); save(); drawPanel(); } }, 'remove') : null)));
  }
  // switching bags keeps everything inside the new opening
  function clampAll() {
    const b = INSIDE[d.bag] || INSIDE.backpack;
    for (const it of d.items) { it.x = Math.max(b.x0, Math.min(b.x1, it.x)); it.y = Math.max(b.y0, Math.min(b.y1, it.y)); }
    layer.draw();
  }

  paint();
  if (edit) drawPanel();
  return () => { unfit(); unkey(); };
}
