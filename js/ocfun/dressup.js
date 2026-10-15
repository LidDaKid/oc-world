// dress up: a 2000s dress-up game for the oc. a base (their art, or a dress form), then clothes from the closet:
// drawn pieces, 3d sticker accessories, and your own see-through pngs. save named looks on the rail, pick a current fit.

import { h, fill, swatches, openModal, confirmDialog, toast, uid } from '../ui.js';
import { appBar, uploadPic, nameOf } from './kit.js';
import { store } from '../store.js';
import { stickerNode } from '../diary/stickers.js';
import { dragLayer, fitStage, toolBar, deleteKey, defaults, newThing, picImg, chipTabs } from './room-layer.js';
import { CLOTHES, clothById, DRAWERS, dressForm } from './dressup-pieces.js';

export const meta = { id: 'dressup', label: 'dress up', icon: '1f457' };

const W = 520, H = 720;
const BACKDROPS = [['bedroom', 'bedroom'], ['runway', 'runway'], ['stars', 'stars'], ['hearts', 'hearts'], ['graveyard', 'graveyard'], ['clouds', 'clouds'], ['mall', 'mall'], ['plain', 'plain']];
const COLORS = ['#141114', '#ffffff', '#ff4fa3', '#ff8ac4', '#ffd1e6', '#c8102e', '#b18cff', '#6b3fa0', '#7df9d0', '#6ec6ff', '#ffd84d', '#2a2230'];

const baseThing = () => newThing({ kind: 'base', x: W / 2, y: 384, k: 1 });
const starterLook = () => ({
  id: 'l_' + uid(), name: 'look 1', bg: 'bedroom',
  items: [
    baseThing(),
    newThing({ kind: 'cloth', c: 'tee', x: 260, y: 236, k: .78, color: '#141114', color2: '#ff4fa3', text: 'rawr' }),
    newThing({ kind: 'cloth', c: 'plaid', x: 260, y: 384, k: .9, color: '#c8102e', color2: '#141114' }),
    newThing({ kind: 'cloth', c: 'belt', x: 260, y: 322, k: .66, color: '#141114' }),
    newThing({ kind: 'cloth', c: 'choker', x: 260, y: 128, k: .62, color: '#141114', color2: '#ff4fa3' }),
    newThing({ kind: 'cloth', c: 'bow', x: 330, y: 74, k: .5, r: 14, color: '#ff4fa3' }),
  ],
});

export function render(el, ctx) {
  const d = defaults(ctx.data, { base: { imageId: null, ar: 0 }, pieces: [], looks: [], current: null, at: null });
  if (!d.looks.length) { const l = starterLook(); d.looks.push(l); d.current = l.id; d.at = l.id; if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let look = d.looks.find(l => l.id === d.at) || d.looks.find(l => l.id === d.current) || d.looks[0];
  if (!edit) look = d.looks.find(l => l.id === d.current) || look;
  let drawer = 'tops';
  let bar = null;

  // ---- pieces of the picture ----
  const pieceOf = id => d.pieces.find(p => p.id === id);
  function thing(it) {
    if (it.kind === 'base') {
      if (!d.base.imageId) return h('div', { class: 'du-base du-form' }, dressForm());
      const ar = d.base.ar || .6;
      const w = ar > 440 / 640 ? 440 : Math.round(640 * ar), ht = Math.round(w / ar);
      return h('div', { class: 'du-base', style: { width: w + 'px', height: ht + 'px' } }, picImg(d.base.imageId));
    }
    if (it.kind === 'piece') {
      const p = pieceOf(it.pieceId);
      if (!p) return h('span', { class: 'du-gone' });
      const ar = p.ar || 1, w = ar >= 1 ? 280 : Math.round(280 * ar), ht = Math.round(w / ar);
      return h('div', { class: 'du-piece', style: { width: w + 'px', height: ht + 'px' } }, picImg(p.imageId));
    }
    if (it.kind === 'cloth') return clothById(it.c)?.draw(it) || h('span');
    return h('div', { class: 'du-stk' }, stickerNode(it.s));
  }

  // a still copy of a look, scaled
  function still(l, s, cls = '') {
    const inner = h('div', { class: `du-scene du-bg-${l.bg}`, style: { width: W + 'px', height: H + 'px', transform: `scale(${s})` } },
      l.items.map(it => {
        const n = h('div', { class: 'rl-it' }, h('div', { class: 'rl-in', style: { transform: it.flip ? 'scaleX(-1)' : '' } }, thing(it)));
        n.style.left = it.x + 'px';
        n.style.top = it.y + 'px';
        n.style.transform = `translate(-50%, -50%) rotate(${it.r || 0}deg) scale(${it.k || 1})`;
        return n;
      }));
    return h('div', { class: 'du-still ' + cls, style: { width: W * s + 'px', height: H * s + 'px' } }, inner);
  }

  // ---- layout ----
  const scene = h('div', { class: 'du-scene' });
  const stageWrap = h('div', { class: 'du-stage' }, scene);
  const pickBar = h('div', { class: 'rl-pick du-pick', hidden: true });
  const lookHead = h('div', { class: 'du-lookhead' });
  const closet = h('div', { class: 'du-closet' });
  const rail = h('div', { class: 'du-rail' });
  const fitBtn = h('button', { class: 'btn sm du-fitbtn', onclick: fitCheck }, '✨ fit check');

  el.append(
    appBar(ctx, meta, fitBtn),
    h('div', { class: 'du-app' + (edit ? '' : ' view') },
      h('div', { class: 'du-left' }, lookHead, h('div', { class: 'du-mirror-frame' }, stageWrap, h('i', { class: 'du-sparkle a' }), h('i', { class: 'du-sparkle b' }), h('i', { class: 'du-sparkle c' })), pickBar),
      edit ? closet : null),
    h('div', { class: 'du-rail-wrap' }, h('div', { class: 'du-rail-bar' }), rail));

  let layer = null;
  const setBg = bg => { scene.className = scene.className.replace(/du-bg-\S+/g, '').trim() + ' du-bg-' + bg; };
  function mountLook(dir = 0) {
    setBg(look.bg);
    layer = dragLayer({
      items: look.items, editable: edit, cls: 'du-items',
      bounds: () => ({ x0: 0, y0: 0, x1: W, y1: H }),
      canDelete: it => it.kind !== 'base',
      onDelete: () => {},
      render: thing,
      onChange: () => { save(); drawRail(); },
      onPick: (it, live) => { if (live) bar?.sync(); else drawPick(it); },
    });
    fill(scene, layer.el);
    if (dir) {
      scene.classList.remove('swap-l', 'swap-r');
      void scene.offsetWidth;
      scene.classList.add(dir > 0 ? 'swap-r' : 'swap-l');
    }
    drawPick(null);
    drawHead();
  }

  function drawHead() {
    const i = d.looks.indexOf(look);
    const isCurrent = d.current === look.id;
    const flip = by => { look = d.looks[(i + by + d.looks.length) % d.looks.length]; if (edit) { d.at = look.id; save(); } mountLook(by); drawRail(); };
    fill(lookHead,
      h('button', { type: 'button', class: 'du-arrow', title: 'last look', onclick: () => flip(-1), disabled: d.looks.length < 2 }, '‹'),
      h('div', { class: 'du-lookname' },
        edit ? h('input', { type: 'text', class: 'du-name', value: look.name, maxLength: 30, oninput: e => { look.name = e.target.value; save(); drawRail(); } })
          : h('span', { class: 'du-name' }, look.name),
        isCurrent ? h('span', { class: 'du-current' }, '★ current fit') : null),
      h('button', { type: 'button', class: 'du-arrow', title: 'next look', onclick: () => flip(1), disabled: d.looks.length < 2 }, '›'),
      edit ? h('div', { class: 'du-lookbtns' },
        h('button', { type: 'button', class: 'btn sm' + (isCurrent ? ' primary' : ''), onclick: () => { d.current = look.id; save(); drawHead(); drawRail(); burst(); } }, isCurrent ? '★ wearing it' : '☆ wear it'),
        h('button', { type: 'button', class: 'rl-tool', title: 'copy look', onclick: copyLook }, '⧉'),
        h('button', { type: 'button', class: 'rl-tool', title: 'mirror look', onclick: mirrorLook }, '⇋'),
        h('button', { type: 'button', class: 'rl-tool danger', title: 'delete look', onclick: deleteLook }, '✕')) : null);
  }

  function drawPick(it) {
    pickBar.hidden = !it || !edit;
    if (!it || !edit) { bar = null; fill(pickBar); return; }
    const extra = [];
    const c = it.kind === 'cloth' ? clothById(it.c) : null;
    for (const [label, key, def] of c?.colors || []) {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, label), swatches(it[key] || def, v => { it[key] = v; layer.refresh(it); save(); drawRail(); }, COLORS)));
    }
    if (c?.text) {
      extra.push(h('div', { class: 'rl-field' }, h('span', {}, 'words'), h('input', {
        type: 'text', value: it.text ?? c.text, maxLength: 12, oninput: e => { it.text = e.target.value; layer.refresh(it); save(); },
      })));
    }
    bar = toolBar(layer, it, () => { save(); drawRail(); }, { extra, noDelete: it.kind === 'base', noCopy: it.kind === 'base' });
    fill(pickBar, bar);
  }

  // ---- looks ----
  function newLook() {
    const l = { id: 'l_' + uid(), name: `look ${d.looks.length + 1}`, bg: look?.bg || 'bedroom', items: [baseThing()] };
    d.looks.push(l);
    look = l; d.at = l.id;
    save(); mountLook(1); drawRail(); scrollRail();
  }
  function copyLook() {
    const l = structuredClone(look);
    l.id = 'l_' + uid();
    l.name = (look.name || 'look') + ' copy';
    l.items.forEach(it => { it.id = 't_' + uid(); });
    d.looks.splice(d.looks.indexOf(look) + 1, 0, l);
    look = l; d.at = l.id;
    save(); mountLook(1); drawRail(); scrollRail();
    toast('copied');
  }
  function mirrorLook() {
    for (const it of look.items) { it.x = W - it.x; it.r = -(it.r || 0); it.flip = !it.flip; }
    save(); mountLook(); drawRail();
  }
  async function deleteLook() {
    if (!await confirmDialog(`delete "${look.name}"?`, { okLabel: 'delete', danger: true })) return;
    const i = d.looks.indexOf(look);
    d.looks.splice(i, 1);
    if (!d.looks.length) d.looks.push({ id: 'l_' + uid(), name: 'look 1', bg: 'bedroom', items: [baseThing()] });
    if (!d.looks.some(l => l.id === d.current)) d.current = d.looks[0].id;
    look = d.looks[Math.max(0, i - 1)];
    d.at = look.id;
    save(); mountLook(-1); drawRail();
  }

  function drawRail() {
    fill(rail,
      d.looks.map(l => h('button', {
        type: 'button', class: 'du-card' + (l === look ? ' on' : '') + (l.id === d.current ? ' current' : ''), dataset: { look: l.id },
        onclick: () => { if (l === look) return; const by = d.looks.indexOf(l) > d.looks.indexOf(look) ? 1 : -1; look = l; if (edit) { d.at = l.id; save(); } mountLook(by); drawRail(); },
      },
        h('i', { class: 'du-hanger' }),
        h('span', { class: 'du-card-pic' }, still(l, .2)),
        h('span', { class: 'du-card-name' }, l.name || 'look'),
        l.id === d.current ? h('span', { class: 'du-card-star' }, '★') : null)),
      edit ? h('button', { type: 'button', class: 'du-card du-card-new', onclick: newLook }, h('i', { class: 'du-hanger' }), h('span', { class: 'du-card-plus' }, '+'), h('span', { class: 'du-card-name' }, 'new look')) : null);
  }
  const scrollRail = () => requestAnimationFrame(() => rail.querySelector('.du-card.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }));

  // ---- the closet ----
  function add(fields, at) {
    layer.add(newThing({ x: Math.round(W / 2 + (Math.random() - .5) * 120), y: at || Math.round(300 + (Math.random() - .5) * 200), ...fields }));
    drawRail();
  }
  function addCloth(c) {
    const it = { kind: 'cloth', c: c.id, k: c.k || 1 };
    for (const [, key, def] of c.colors || []) it[key] = def;
    if (c.text) it.text = c.text;
    const y = { tops: 240, bottoms: 390, shoes: 600, jewelry: 160, hats: 80, bows: 80, glasses: 110, extras: 300 }[c.cat];
    add(it, y);
    if (c.id === 'wings') layer.toBack(layer.selected.id);
  }

  const closetTabs = [['mine', 'mine', '1f9f5'], ...DRAWERS.map(([id, label, icon]) => [id, label, icon]), ['base', 'base', '1f9cd'], ['backdrop', 'backdrop', '1f5bc-fe0f']];
  const drawerTabs = h('div', { class: 'du-drawers' });
  const drawerBody = h('div', { class: 'du-drawer-body' });
  if (edit) {
    closet.append(
      h('div', { class: 'du-closet-top' }, h('span', { class: 'du-closet-title' }, 'closet')),
      h('div', { class: 'du-closet-in' }, drawerTabs, drawerBody),
      h('i', { class: 'du-door l' }), h('i', { class: 'du-door r' }));
  }

  const hanger = (label, node, onclick, cls = '') => h('button', { type: 'button', class: 'du-item ' + cls, title: label, onclick }, h('i', { class: 'du-hook' }), h('span', { class: 'du-item-art' }, node));
  const clothPreview = c => {
    const it = { text: c.text };
    for (const [, key, def] of c.colors || []) it[key] = def;
    const s = Math.min(70 / c.w, 70 / c.h);
    return h('span', { class: 'du-prev', style: { width: c.w + 'px', height: c.h + 'px', transform: `translate(-50%, -50%) scale(${s})` } }, c.draw(it));
  };

  function drawCloset() {
    if (!edit) return;
    fill(drawerTabs, closetTabs.map(([id, label, icon]) => h('button', {
      type: 'button', class: 'du-drawer' + (id === drawer ? ' on' : ''), dataset: { drawer: id }, title: label,
      onclick: () => { drawer = id; drawCloset(); },
    }, stickerNode('e:' + icon), h('span', {}, label))));
    if (drawer === 'mine') {
      fill(drawerBody, h('div', { class: 'du-items-grid' },
        h('button', { type: 'button', class: 'du-item du-upload', onclick: uploadPiece }, h('i', { class: 'du-hook' }), h('span', { class: 'du-item-art' }, '+')),
        d.pieces.map(p => h('div', { class: 'du-item-wrap' },
          hanger('', h('span', { class: 'du-mine-pic' }, picImg(p.imageId)), () => add({ kind: 'piece', pieceId: p.id, k: .9 })),
          h('button', { type: 'button', class: 'du-item-x', title: 'remove', onclick: () => removePiece(p) }, '✕')))));
    } else if (drawer === 'base') {
      fill(drawerBody, h('div', { class: 'du-base-opts' },
        h('button', { type: 'button', class: 'du-base-opt' + (d.base.imageId ? '' : ' on'), onclick: () => setBase(null) }, h('span', { class: 'du-base-mini' }, dressForm()), h('span', {}, 'dress form')),
        d.base.imageId ? h('button', { type: 'button', class: 'du-base-opt on' }, h('span', { class: 'du-base-mini pic' }, picImg(d.base.imageId)), h('span', {}, 'their art')) : null,
        h('button', { type: 'button', class: 'du-base-opt', onclick: uploadBase }, h('span', { class: 'du-base-mini plus' }, '+'), h('span', {}, d.base.imageId ? 'change art' : 'their art')),
        ctx.char.imageId ? h('button', { type: 'button', class: 'du-base-opt', onclick: useProfilePic }, h('span', { class: 'du-base-mini pic' }, picImg(ctx.char.imageId)), h('span', {}, 'profile pic')) : null));
    } else if (drawer === 'backdrop') {
      fill(drawerBody, h('div', { class: 'du-bgs' }, BACKDROPS.map(([id, label]) => h('button', {
        type: 'button', class: 'du-bg-opt' + (look.bg === id ? ' on' : ''), dataset: { bg: id },
        onclick: () => { look.bg = id; setBg(id); save(); drawCloset(); drawRail(); },
      }, h('i', { class: `du-bg-chip du-bg-${id}` }), h('span', {}, label)))));
    } else {
      const [, , , codes] = DRAWERS.find(x => x[0] === drawer);
      const drawn = CLOTHES.filter(c => c.cat === drawer);
      const hangs = drawer === 'tops' || drawer === 'bottoms';
      fill(drawerBody, h('div', { class: 'du-items-grid' + (hangs ? ' hangs' : ' shelf') },
        drawn.map(c => hanger(c.label, clothPreview(c), () => addCloth(c), 'drawn')),
        codes.split(' ').map(code => hanger('', stickerNode('e:' + code), () => add({ kind: 'sticker', s: 'e:' + code, k: .8 }, { tops: 240, bottoms: 400, shoes: 600, hats: 80, bows: 90, glasses: 110, jewelry: 160 }[drawer])))));
    }
  }

  async function uploadPiece() {
    const up = await uploadPic(1000);
    if (!up) return;
    const p = { id: 'p_' + uid(), imageId: up.imageId, ar: up.width / up.height };
    d.pieces.push(p);
    save();
    drawCloset();
    add({ kind: 'piece', pieceId: p.id, k: .9 });
  }
  async function removePiece(p) {
    if (!await confirmDialog('take this out of the closet? it comes off every look too.', { okLabel: 'remove', danger: true })) return;
    d.pieces.splice(d.pieces.indexOf(p), 1);
    for (const l of d.looks) l.items = l.items.filter(it => !(it.kind === 'piece' && it.pieceId === p.id));
    store.deleteImage(p.imageId);
    save(); mountLook(); drawRail(); drawCloset();
  }
  async function uploadBase() {
    const up = await uploadPic(1400);
    if (!up) return;
    setBase(up.imageId, up.width / up.height);
  }
  async function useProfilePic() {
    const rec = await store.imageRecord(ctx.char.imageId);
    if (!rec) return;
    const id = await store.putImage(new Blob([rec.buf], { type: rec.type }));
    const img = new Image();
    img.src = await store.imageURL(id);
    await img.decode().catch(() => {});
    setBase(id, (img.naturalWidth || 3) / (img.naturalHeight || 4));
  }
  function setBase(imageId, ar = 0) {
    const old = d.base.imageId;
    d.base.imageId = imageId;
    d.base.ar = ar;
    if (old && old !== imageId) store.deleteImage(old);
    save(); mountLook(); drawRail(); drawCloset();
  }

  // ---- show it off ----
  function burst() {
    const box = stageWrap.parentNode;
    for (let i = 0; i < 14; i++) {
      const s = h('i', { class: 'du-pop', style: { left: 50 + (Math.random() - .5) * 70 + '%', top: 50 + (Math.random() - .5) * 70 + '%', animationDelay: Math.random() * .3 + 's' } }, ['★', '♥', '✦'][i % 3]);
      box.append(s);
      setTimeout(() => s.remove(), 1400);
    }
  }
  function fitCheck() {
    const l = d.looks.find(x => x.id === d.current) || look;
    const s = Math.min(.62, (Math.min(window.innerWidth, 700) - 90) / W, (window.innerHeight - 260) / H);
    openModal({
      title: 'fit check',
      body: h('div', { class: 'du-runway' },
        h('i', { class: 'du-spot a' }), h('i', { class: 'du-spot b' }),
        h('div', { class: 'du-runway-pic' }, still(l, s)),
        h('div', { class: 'du-runway-name' }, h('span', {}, nameOf(ctx.char)), h('b', {}, l.name || 'look')),
        h('i', { class: 'du-flash' })),
    });
  }

  mountLook();
  drawRail();
  drawCloset();
  scrollRail();
  const unfit = fitStage(stageWrap, scene, W, H, 1);
  const unkey = edit ? deleteKey({ get selected() { return layer.selected; }, removeSelected: () => layer.removeSelected() }) : () => {};
  return () => { unfit(); unkey(); };
}
