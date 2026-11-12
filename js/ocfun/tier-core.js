// tier lists (used by the oc app in the "more" tab AND the world's tier list tab).
// data = { lists: [{ id, title, tiers: [{ id, name, color }], items: [{ id, oc?, text?, imageId?, sticker?, tier: tierId | null }] }] }
// items are ocs (their pfp) or your own things (words, a picture, a 3d sticker). drag them into a tier.

import { h, fill, uid, swatches, confirmDialog, openModal } from '../ui.js';
import { store } from '../store.js';
import { portrait, nameOf, pickStickerIcon } from '../parts.js';
import { stickerNode } from '../diary/stickers.js';
import { uploadPic, pic } from './kit.js';

const TIER_COLORS = ['#ff5d6c', '#ff9a3d', '#ffd84d', '#9be564', '#6ec6ff', '#b18cff', '#ff8ac4', '#1a1320', '#ffffff'];
const blankTiers = () => [['S', '#ff5d6c'], ['A', '#ff9a3d'], ['B', '#ffd84d'], ['C', '#9be564'], ['D', '#6ec6ff']].map(([name, color]) => ({ id: 'tr_' + uid(), name, color }));

export function renderTiers(el, { data, people, save, readOnly, ocLink, startOpen }) {
  data.lists ||= [];
  let open = startOpen ? data.lists[0] || null : null, editing = false;
  const root = h('div', { class: 'tir' });
  el.append(root);

  const draw = () => fill(root, open && data.lists.includes(open) ? listView(open) : shelf());

  function newList() {
    const l = { id: 'tl_' + uid(), title: '', tiers: blankTiers(), items: people().map(o => ({ id: 'ti_' + uid(), oc: o.id, tier: null })) };
    data.lists.push(l);
    save();
    open = l;
    editing = true;
    draw();
  }

  // ---- all the tier lists ----
  function shelf() {
    return h('div', { class: 'tir-shelf' },
      data.lists.map(l => h('button', { type: 'button', class: 'tir-card', onclick: () => { open = l; editing = false; draw(); } },
        h('div', { class: 'tir-card-title' }, l.title.trim() || 'tier list'),
        h('div', { class: 'tir-card-mini' }, l.tiers.slice(0, 5).map(t => h('div', { class: 'tir-mini-row' },
          h('span', { class: 'tir-mini-tag', style: { background: t.color, color: inkOn(t.color) } }, t.name.slice(0, 3)),
          h('span', { class: 'tir-mini-things' }, l.items.filter(i => i.tier === t.id).slice(0, 6).map(i => thing(i, l, true)))))))),
      readOnly ? null : h('button', { type: 'button', class: 'tir-card tir-new', onclick: newList }, h('span', {}, '+'), 'new tier list'),
      !data.lists.length && readOnly ? h('div', { class: 'tir-empty' }, '...') : null);
  }

  // ---- one tier list ----
  function listView(l) {
    const ocs = people();
    const ids = new Set(ocs.map(o => o.id));
    l.items = l.items.filter(i => !i.oc || ids.has(i.oc));
    const missing = ocs.filter(o => !l.items.some(i => i.oc === o.id));
    const rows = l.tiers.map((t, ti) => h('div', { class: 'tir-row', style: { '--tc': t.color } },
      h('div', { class: 'tir-label', style: { background: t.color, color: inkOn(t.color) } },
        editing ? h('input', { type: 'text', class: 'tir-label-input', value: t.name, maxLength: 24, oninput: e => { t.name = e.target.value; save(); } }) : h('span', {}, t.name),
        editing ? h('div', { class: 'tir-label-tools' },
          h('button', { type: 'button', class: 'tir-mini-btn', title: 'move up', disabled: ti === 0, onclick: () => { l.tiers.splice(ti - 1, 0, l.tiers.splice(ti, 1)[0]); save(); draw(); } }, '↑'),
          h('button', { type: 'button', class: 'tir-mini-btn', title: 'color', onclick: () => pickColor(t) }, '●'),
          h('button', { type: 'button', class: 'tir-mini-btn', title: 'remove', onclick: () => { l.items.forEach(i => { if (i.tier === t.id) i.tier = null; }); l.tiers = l.tiers.filter(x => x !== t); save(); draw(); } }, '✕')) : null),
      h('div', { class: 'tir-zone', dataset: { tier: t.id } }, l.items.filter(i => i.tier === t.id).map(i => thing(i, l)))));
    return h('div', { class: 'tir-list' },
      h('div', { class: 'tir-head' },
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { open = null; draw(); } }, 'all lists'),
        editing ? h('input', { type: 'text', class: 'tir-title-input', value: l.title, placeholder: 'tier list', maxLength: 60, oninput: e => { l.title = e.target.value; save(); } })
          : h('h3', { class: 'tir-title' }, l.title.trim() || 'tier list'),
        readOnly ? null : h('div', { class: 'tir-tools' },
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { editing = !editing; draw(); } }, editing ? 'done' : 'edit'),
          editing ? h('button', { type: 'button', class: 'btn ghost sm danger', onclick: async () => {
            if (!await confirmDialog(`delete "${l.title || 'this tier list'}"?`, { okLabel: 'delete', danger: true })) return;
            l.items.forEach(i => i.imageId && store.deleteImage(i.imageId));
            data.lists = data.lists.filter(x => x !== l); open = null; save(); draw();
          } }, 'delete') : null)),
      h('div', { class: 'tir-board' }, rows),
      editing ? h('div', { class: 'tir-edit-row' },
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { l.tiers.push({ id: 'tr_' + uid(), name: 'new', color: TIER_COLORS[l.tiers.length % TIER_COLORS.length] }); save(); draw(); } }, '+ tier'),
        missing.length ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { missing.forEach(o => l.items.push({ id: 'ti_' + uid(), oc: o.id, tier: null })); save(); draw(); } }, `+ ${missing.length} oc${missing.length > 1 ? 's' : ''}`) : null) : null,
      h('div', { class: 'tir-tray-wrap' },
        h('div', { class: 'tir-zone tir-tray', dataset: { tier: '' } }, l.items.filter(i => !i.tier).map(i => thing(i, l))),
        readOnly ? null : h('div', { class: 'tir-add' },
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => addWords(l) }, '+ words'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => addPicture(l) }, '+ picture'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(sid => { l.items.push({ id: 'ti_' + uid(), sticker: sid, text: '', tier: null }); save(); draw(); }) }, '+ sticker'))));
  }

  function pickColor(t) {
    const m = openModal({ title: 'tier color', body: swatches(t.color, c => { t.color = c; save(); draw(); m.close(); }, TIER_COLORS) });
  }
  function addWords(l, item = null) {
    const input = h('input', { type: 'text', value: item?.text || '', placeholder: 'words', maxLength: 40, dataset: { autofocus: '' } });
    openModal({
      title: item ? 'change it' : 'add words', body: input,
      actions: [
        ...(item ? [{ label: 'delete', kind: 'danger', onClick: close => { if (item.imageId) store.deleteImage(item.imageId); l.items = l.items.filter(x => x !== item); save(); draw(); close(); } }] : []),
        { label: item ? 'save' : 'add', kind: 'primary', onClick: close => {
          const text = input.value.trim();
          if (!text && !item?.imageId && !item?.sticker) return;
          if (item) item.text = text; else l.items.push({ id: 'ti_' + uid(), text, tier: null });
          save(); draw(); close();
        } },
      ],
    });
  }
  async function addPicture(l) {
    const got = await uploadPic(600, { aspect: 1 });
    if (!got) return;
    l.items.push({ id: 'ti_' + uid(), imageId: got.imageId, text: '', tier: null });
    save();
    draw();
  }

  // one thing on the board
  function thing(i, l, mini = false) {
    const oc = i.oc ? store.char(i.oc) : null;
    const node = h('div', { class: 'tir-thing' + (oc ? ' is-oc' : '') + (mini ? ' mini' : ''), style: oc ? { '--c': oc.color } : null, title: oc ? nameOf(oc) : i.text || '' },
      oc ? portrait(oc, 'tir-face')
        : i.imageId ? pic(i.imageId, 'tir-pic')
        : i.sticker ? h('span', { class: 'tir-stk' }, stickerNode(i.sticker))
        : h('span', { class: 'tir-words' }, i.text),
      !mini && (oc || ((i.imageId || i.sticker) && i.text)) ? h('span', { class: 'tir-name' }, oc ? nameOf(oc) : i.text) : null);
    node.dataset.id = i.id; // so a drop can land before this one
    if (mini) return node;
    if (readOnly) {
      if (oc && ocLink) node.onclick = () => { location.hash = ocLink(oc); };
      return node;
    }
    node.onpointerdown = e => drag(e, i, l, node);
    return node;
  }

  function drag(e, i, l, node) {
    if (e.button) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let ghost = null;
    const under = ev => {
      if (ghost) ghost.style.display = 'none';
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      if (ghost) ghost.style.display = '';
      return hit;
    };
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!ghost) { ghost = node.cloneNode(true); ghost.classList.add('tir-ghost'); document.body.append(ghost); node.classList.add('tir-lifted'); }
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
      root.querySelectorAll('.tir-zone.over').forEach(z => z.classList.remove('over'));
      under(ev)?.closest('.tir-zone')?.classList.add('over');
    };
    const up = ev => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      if (!ghost) { // a tap: change words / delete your own things, or take an oc off the board
        if (i.oc) { if (i.tier) { i.tier = null; save(); draw(); } }
        else addWords(l, i);
        return;
      }
      const hit = under(ev);
      ghost.remove();
      const zone = hit?.closest('.tir-zone');
      if (!zone) { draw(); return; }
      const before = hit.closest('.tir-thing');
      l.items = l.items.filter(x => x !== i);
      i.tier = zone.dataset.tier || null;
      const beforeItem = before && before !== node ? l.items.find(x => x.id === before.dataset.id) : null;
      const at = beforeItem ? l.items.indexOf(beforeItem) : l.items.length;
      l.items.splice(at, 0, i);
      save();
      draw();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  draw();
  return { refresh: draw };
}

function inkOn(color) {
  const n = parseInt((color || '#000000').slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? '#1a1320' : '#ffffff';
}
