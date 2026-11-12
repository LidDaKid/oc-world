// their pet: the oc's pets, each with a little profile: a picture (uploaded or a 3d sticker), a metal id tag
// with its name, species / breed / age, likes + dislikes, and personality bars.
//   data: { pets: [{ id, name, species, breed, age, likes, dislikes, imageId, s, color, tag, stats: [{ label, value }] }], at }

import { h, fill, uid, swatches, segmented, confirmDialog } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, pic } from './kit.js';
import { stickerNode } from '../diary/stickers.js';
import { pickStickerIcon } from '../parts.js';

export const meta = { id: 'pet', label: 'their pet', icon: '1f43e' };

const TAG_SHAPES = ['bone', 'heart', 'round', 'star'];
const COLORS = ['#ff4fa3', '#b18cff', '#7df9d0', '#ffd84d', '#6ec6ff', '#ff8a3d', '#d81e3a', '#141114', '#f6eefb', '#c9a227'];
const newPet = () => ({
  id: 'pet_' + uid(), name: '', species: '', breed: '', age: '', likes: '', dislikes: '', imageId: null, s: 'e:1f408-200d-2b1b', color: '#ff4fa3', tag: 'bone',
  stats: [{ label: 'cuddly', value: 80 }, { label: 'chaos', value: 60 }, { label: 'sleepy', value: 70 }, { label: 'food crazy', value: 95 }],
});

export function render(el, ctx) {
  const d = ctx.data;
  if (!Array.isArray(d.pets)) d.pets = [];
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  let editing = false;
  const cur = () => d.pets.find(p => p.id === d.at) || d.pets[0] || null;

  const tabs = h('div', { class: 'petx-tabs' });
  const body = h('div', { class: 'petx-body' });
  const editBtn = edit ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { editing = !editing; draw(); } }) : null;
  el.append(appBar(ctx, meta, editBtn), h('div', { class: 'petx-app' }, tabs, body));

  function addPet() {
    const p = newPet();
    d.pets.push(p);
    d.at = p.id;
    editing = true;
    save();
    draw();
  }

  function draw() {
    const p = cur();
    if (editBtn) { editBtn.textContent = editing ? 'done' : 'edit'; editBtn.hidden = !p; }
    fill(tabs, d.pets.map(x => h('button', {
      type: 'button', class: 'petx-tab' + (p && x.id === p.id ? ' on' : ''), style: { '--pc': x.color },
      onclick: () => { d.at = x.id; save(); draw(); },
    }, h('span', { class: 'petx-tab-art' }, art(x)), x.name || 'unnamed')),
    edit ? h('button', { type: 'button', class: 'petx-tab petx-add', onclick: addPet }, '+ pet') : null);
    if (!p) { fill(body, h('div', { class: 'petx-empty' }, h('span', { class: 'petx-empty-art' }, stickerNode('e:1f43e')))); return; }
    fill(body, editing && edit ? editor(p) : profile(p));
  }

  const art = p => (p.imageId ? pic(p.imageId, 'petx-pic') : stickerNode(p.s || 'e:1f43e'));

  function tag(p) {
    return h('div', { class: 'petx-tag shape-' + (p.tag || 'bone'), style: { '--pc': p.color } },
      h('i', { class: 'petx-ring' }),
      h('div', { class: 'petx-tag-face' },
        h('span', { class: 'petx-tag-name' }, p.name || '???'),
        p.species ? h('span', { class: 'petx-tag-sub' }, p.species) : null));
  }

  function profile(p) {
    const row = (k, v) => (v?.trim() ? h('div', { class: 'petx-row' }, h('span', { class: 'petx-k' }, k), h('span', { class: 'petx-v' }, v)) : null);
    return h('div', { class: 'petx-card', style: { '--pc': p.color } },
      h('div', { class: 'petx-left' },
        h('div', { class: 'petx-frame' + (p.imageId ? ' has-pic' : '') }, art(p), h('i', { class: 'petx-paws' })),
        tag(p)),
      h('div', { class: 'petx-right' },
        h('h3', { class: 'petx-name' }, p.name || 'unnamed'),
        h('div', { class: 'petx-rows' }, row('species', p.species), row('breed', p.breed), row('age', p.age)),
        p.likes?.trim() || p.dislikes?.trim() ? h('div', { class: 'petx-likes' },
          p.likes?.trim() ? h('div', { class: 'petx-like yes' }, h('b', {}, 'loves'), h('span', {}, p.likes)) : null,
          p.dislikes?.trim() ? h('div', { class: 'petx-like no' }, h('b', {}, 'hates'), h('span', {}, p.dislikes)) : null) : null,
        h('div', { class: 'petx-stats' }, (p.stats || []).map(s => h('div', { class: 'petx-stat' },
          h('span', { class: 'petx-stat-k' }, s.label || '?'),
          h('div', { class: 'petx-stat-bar' }, h('i', { style: { width: Math.max(0, Math.min(100, +s.value || 0)) + '%' } })))))));
  }

  function editor(p) {
    const field = (label, key, ph, max = 40) => h('label', { class: 'petx-field' }, h('span', {}, label),
      h('input', { type: 'text', value: p[key] || '', placeholder: ph, maxLength: max, oninput: e => { p[key] = e.target.value; save(); if (key === 'name') drawTabsOnly(); } }));
    const stats = h('div', { class: 'petx-stat-edit' });
    const drawStats = () => fill(stats, p.stats.map(s => h('div', { class: 'petx-stat-row' },
      h('input', { type: 'text', value: s.label, maxLength: 20, placeholder: 'trait', oninput: e => { s.label = e.target.value; save(); } }),
      h('input', { type: 'range', class: 'look-slider', min: 0, max: 100, value: s.value, oninput: e => { s.value = +e.target.value; save(); } }),
      h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { p.stats = p.stats.filter(x => x !== s); save(); drawStats(); } }, '✕'))),
      p.stats.length < 8 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { p.stats.push({ label: '', value: 50 }); save(); drawStats(); } }, '+ trait') : null);
    drawStats();
    const artBox = h('div', { class: 'petx-frame' + (p.imageId ? ' has-pic' : '') }, art(p), h('i', { class: 'petx-paws' }));
    const redrawArt = () => { artBox.className = 'petx-frame' + (p.imageId ? ' has-pic' : ''); fill(artBox, art(p), h('i', { class: 'petx-paws' })); drawTabsOnly(); };
    return h('div', { class: 'petx-card petx-editing', style: { '--pc': p.color } },
      h('div', { class: 'petx-left' }, artBox,
        h('div', { class: 'petx-art-btns' },
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { if (p.imageId) store.deleteImage(p.imageId); p.imageId = null; p.s = id; save(); redrawArt(); }) }, '3d sticker'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const up = await uploadPic(900, { aspect: 1 }); if (!up) return; if (p.imageId) store.deleteImage(p.imageId); p.imageId = up.imageId; save(); redrawArt(); } }, 'picture')),
        h('div', { class: 'petx-group' }, h('span', {}, 'tag'), segmented(TAG_SHAPES.map(v => ({ value: v, label: v })), p.tag || 'bone', v => { p.tag = v; save(); })),
        h('div', { class: 'petx-group' }, h('span', {}, 'color'), swatches(p.color, c => { p.color = c; save(); draw(); }, COLORS))),
      h('div', { class: 'petx-right' },
        field('name', 'name', 'name', 30), field('species', 'species', 'cat'), field('breed', 'breed', 'black void'), field('age', 'age', '3'),
        field('loves', 'likes', 'tuna, sunbeams', 120), field('hates', 'dislikes', 'baths', 120),
        h('div', { class: 'petx-group' }, h('span', {}, 'personality'), stats),
        h('button', { type: 'button', class: 'link-btn danger', onclick: async () => {
          if (!await confirmDialog(`say bye to ${p.name || 'this pet'}?`, { okLabel: 'remove', danger: true })) return;
          if (p.imageId) store.deleteImage(p.imageId);
          d.pets = d.pets.filter(x => x !== p);
          d.at = d.pets[0]?.id || null;
          editing = false;
          save();
          draw();
        } }, 'remove pet')));
  }

  // typing a name updates the tabs without redrawing the form you're typing in
  function drawTabsOnly() {
    const p = cur();
    [...tabs.querySelectorAll('.petx-tab:not(.petx-add)')].forEach((t, i) => {
      const x = d.pets[i];
      if (!x) return;
      fill(t, h('span', { class: 'petx-tab-art' }, art(x)), x.name || 'unnamed');
      t.classList.toggle('on', x === p);
    });
  }

  if (!d.pets.length && edit) editing = false;
  draw();
}
