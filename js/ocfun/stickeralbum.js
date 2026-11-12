// sticker album: a sticker book of 3d stickers they've collected. pages have slot outlines + a theme,
// stickers get stuck on (drag, turn, size), flip through the pages. the cover shows how many they've got.
//   data: { title, cover, pages: [{ id, theme, items: [{ id, s, x, y, r, k }] }], at }

import { h, fill, uid, swatches, segmented, confirmDialog } from '../ui.js';
import { appBar, nameOf } from './kit.js';
import { stickerNode } from '../diary/stickers.js';
import { pickStickerIcon } from '../parts.js';
import { dragLayer, fitStage, toolBar, deleteKey, newThing } from './room-layer.js';

export const meta = { id: 'stickeralbum', label: 'sticker album', icon: '1f31f' };

const W = 600, H = 780;
const THEMES = ['glitter', 'grid', 'dots', 'hearts', 'stars', 'lined', 'black', 'pink'];
const COVERS = ['#ff4fa3', '#141114', '#b18cff', '#7df9d0', '#ffd84d', '#6ec6ff', '#2a0a1b', '#ff8ac4'];
const SLOTS = [[150, 170], [450, 170], [150, 400], [450, 400], [150, 630], [450, 630]];
const newPage = (theme = 'glitter') => ({ id: 'sp_' + uid(), theme, items: [] });

export function render(el, ctx) {
  const d = ctx.data;
  if (!Array.isArray(d.pages) || !d.pages.length) {
    d.pages = [newPage('glitter'), newPage('grid')];
    d.pages[0].items.push(newThing({ s: 'e:1f496', x: 150, y: 170, r: -8, k: 1 }), newThing({ s: 'e:2b50', x: 450, y: 170, r: 10, k: 1 }));
  }
  d.cover ||= '#ff4fa3';
  d.title ??= '';
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let at = Math.min(d.at || 0, d.pages.length - 1);
  let layer = null, unkey = () => {};

  const count = () => d.pages.reduce((n, p) => n + p.items.length, 0);
  const cover = h('div', { class: 'sa-cover' });
  const page = h('div', { class: 'sa-page' });
  const stage = h('div', { class: 'sa-stage' }, page);
  const nav = h('div', { class: 'sa-nav' });
  const pickBar = h('div', { class: 'rl-pick sa-pick', hidden: true });
  const tools = h('div', { class: 'sa-tools' });
  el.append(appBar(ctx, meta), h('div', { class: 'sa-app' },
    h('div', { class: 'sa-book', style: { '--cover': d.cover } }, cover, h('div', { class: 'sa-spine' }), h('div', { class: 'sa-pagewrap' }, stage)),
    nav, pickBar, edit ? tools : null));
  const unfit = fitStage(stage, page, W, H, 1);

  function drawCover() {
    cover.parentElement.style.setProperty('--cover', d.cover);
    fill(cover,
      h('div', { class: 'sa-cover-title' }, d.title || nameOf(ctx.char) + "'s stickers"),
      h('div', { class: 'sa-count' }, h('b', {}, String(count())), h('span', {}, count() === 1 ? 'sticker' : 'stickers')),
      h('div', { class: 'sa-cover-stk' }, stickerNode(d.pages.flatMap(p => p.items)[0]?.s || 'e:1f31f')));
  }

  function drawPage(dir = 0) {
    const p = d.pages[at];
    page.className = 'sa-page rl-box theme-' + p.theme + (dir ? ' turn-' + (dir > 0 ? 'next' : 'back') : '');
    void page.offsetWidth;
    unkey();
    layer = dragLayer({
      items: p.items, editable: edit, cls: 'sa-items',
      render: it => h('div', { class: 'sa-stk' }, stickerNode(it.s || 'e:2b50')),
      bounds: () => ({ x0: 40, y0: 40, x1: W - 40, y1: H - 40 }),
      onChange: () => { save(); drawCover(); drawNav(); },
      onPick: (it, live) => { if (live) return; drawPick(it); },
    });
    fill(page,
      h('div', { class: 'sa-slots' }, SLOTS.map(([x, y], i) => h('i', { class: 'sa-slot', style: { left: x + 'px', top: y + 'px', '--i': i } }))),
      h('div', { class: 'sa-pagenum' }, String(at + 1)),
      layer.el);
    unkey = edit ? deleteKey(layer) : () => {};
    drawPick(null);
    drawNav();
    drawTools();
  }

  function drawPick(it) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { fill(pickBar); return; }
    fill(pickBar, toolBar(layer, it, () => { save(); drawCover(); }, {
      noCopy: true,
      extra: [h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { it.s = id; layer.refresh(it); save(); drawCover(); }) }, 'swap sticker')],
    }));
  }

  const go = n => { if (n < 0 || n >= d.pages.length || n === at) return; const dir = n > at ? 1 : -1; at = n; d.at = at; save(); drawPage(dir); };
  function drawNav() {
    fill(nav,
      h('button', { type: 'button', class: 'icon-btn', title: 'back', disabled: at === 0, onclick: () => go(at - 1) }, '‹'),
      h('div', { class: 'sa-dots' }, d.pages.map((p, i) => h('button', { type: 'button', class: 'sa-dot' + (i === at ? ' on' : ''), title: String(i + 1), onclick: () => go(i) }, p.items.length ? String(p.items.length) : ''))),
      h('button', { type: 'button', class: 'icon-btn', title: 'next', disabled: at === d.pages.length - 1, onclick: () => go(at + 1) }, '›'));
  }

  function drawTools() {
    if (!edit) return;
    const p = d.pages[at];
    const spot = () => {
      const free = SLOTS.find(([x, y]) => !p.items.some(it => Math.abs(it.x - x) < 60 && Math.abs(it.y - y) < 60)) || [120 + Math.random() * 360, 120 + Math.random() * 540];
      return { x: Math.round(free[0]), y: Math.round(free[1]), r: Math.round((Math.random() - .5) * 24) };
    };
    const group = (label, ...kids) => h('div', { class: 'sa-group' }, h('span', { class: 'sa-label' }, label), ...kids);
    fill(tools,
      h('div', { class: 'sa-row' },
        h('button', { type: 'button', class: 'btn primary sm', onclick: () => pickStickerIcon(id => { layer.add(newThing({ s: id, k: 1, ...spot() })); drawCover(); drawNav(); }) }, '+ sticker'),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.pages.splice(at + 1, 0, newPage(THEMES[(at + 1) % THEMES.length])); save(); go(at + 1); } }, '+ page'),
        d.pages.length > 1 ? h('button', { type: 'button', class: 'link-btn danger', onclick: async () => {
          if (p.items.length && !await confirmDialog('rip out this page?', { okLabel: 'rip it out', danger: true })) return;
          d.pages.splice(at, 1);
          at = Math.max(0, at - 1); d.at = at;
          save(); drawCover(); drawPage(-1);
        } }, 'rip out page') : null),
      group('page', segmented(THEMES.map(v => ({ value: v, label: v })), p.theme, v => { p.theme = v; save(); page.className = 'sa-page rl-box theme-' + v; })),
      group('album', h('input', { type: 'text', value: d.title, maxLength: 40, placeholder: nameOf(ctx.char) + "'s stickers", oninput: e => { d.title = e.target.value; save(); drawCover(); } }),
        swatches(d.cover, c => { d.cover = c; save(); drawCover(); }, COVERS)));
  }

  drawCover();
  drawPage(0);
  return () => { unkey(); unfit?.(); };
}
