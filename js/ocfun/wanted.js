// wanted poster: an old-west WANTED poster or a MISSING flyer stapled to a pole. picture (their pfp or an upload),
// name, what they did / where they were last seen, reward / who to call.
//
// d.posters = [{ id, kind: 'wanted' | 'missing', imageId, name, crime, reward, wanted, seen, about, contact, paper }]

import { h, fill, segmented, openModal, confirmDialog, uid } from '../ui.js';
import { appBar, uploadPic, pic, portrait, nameOf } from './kit.js';
import { store } from '../store.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'wanted', label: 'wanted poster', icon: '1f920' };

const PAPERS = { white: '#f7f5ee', yellow: '#fff3a6', pink: '#ffd6e7', blue: '#d7ecff' };
const DEF = { posters: null };

function seeded(str) {
  let x = 7;
  for (const ch of str) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function poster(p, char, big = false) {
  const art = p.imageId ? pic(p.imageId, 'wnt-pic') : char.imageId ? pic(char.imageId, 'wnt-pic') : h('div', { class: 'wnt-pic wnt-pic-empty' }, portrait(char, 'wnt-pfp'));
  const name = (p.name || '').trim() || nameOf(char);
  if (p.kind === 'missing') {
    const r = seeded(p.id);
    const tabs = Array.from({ length: 7 }, (_, i) => h('span', { class: 'wnt-tab' + (r() < .3 ? ' torn' : ''), style: { '--r': ((r() - .5) * 4).toFixed(1) + 'deg' } }, p.contact || '555-0199'));
    return h('div', { class: 'wnt-flyer' + (big ? ' big' : ''), style: { '--paper': PAPERS[p.paper] || PAPERS.white } },
      h('i', { class: 'wnt-tape l' }), h('i', { class: 'wnt-tape r' }), h('i', { class: 'wnt-staple' }),
      h('div', { class: 'wnt-missing' }, 'missing'),
      h('div', { class: 'wnt-photo' }, art),
      h('div', { class: 'wnt-mname' }, name),
      p.seen ? h('div', { class: 'wnt-seen' }, h('b', {}, 'last seen'), ' ', p.seen) : null,
      p.about ? h('div', { class: 'wnt-about' }, p.about) : null,
      h('div', { class: 'wnt-call' }, h('b', {}, 'call'), ' ', p.contact || '555-0199'),
      h('div', { class: 'wnt-tabs' }, tabs));
  }
  return h('div', { class: 'wnt-old' + (big ? ' big' : '') },
    h('i', { class: 'wnt-nail' }),
    h('div', { class: 'wnt-word' }, 'wanted'),
    h('div', { class: 'wnt-dead' }, p.wanted || 'dead or alive'),
    h('div', { class: 'wnt-frame' }, art),
    h('div', { class: 'wnt-name' }, name),
    p.crime ? h('div', { class: 'wnt-crime' }, h('i', {}, 'for '), p.crime) : null,
    h('div', { class: 'wnt-reward' }, h('span', {}, 'reward'), h('b', {}, p.reward || '$5,000')));
}

export function render(el, ctx) {
  const { char } = ctx;
  const d = defaults(ctx.data, DEF);
  const edit = ctx.mine;
  if (!Array.isArray(d.posters)) {
    d.posters = [{ id: 'wp_' + uid(), kind: 'wanted', imageId: null, name: '', crime: 'stealing hearts', reward: '$10,000', wanted: 'dead or alive', seen: '', about: '', contact: '', paper: 'white' }];
    if (edit) ctx.save();
  }
  const save = () => { if (edit) ctx.save(); };
  const pole = h('div', { class: 'wnt-board' });
  el.append(appBar(ctx, meta, edit ? h('div', { class: 'wnt-adds' },
    h('button', { class: 'btn primary sm', onclick: () => add('wanted') }, '+ wanted'),
    h('button', { class: 'btn ghost sm', onclick: () => add('missing') }, '+ missing')) : null), pole);

  function add(kind) {
    const p = { id: 'wp_' + uid(), kind, imageId: null, name: '', crime: '', reward: '', wanted: 'dead or alive', seen: '', about: '', contact: '', paper: 'white' };
    d.posters.unshift(p); save(); draw(); open(p);
  }

  function draw() {
    const r = seeded(char.id);
    fill(pole, d.posters.map(p => h('button', { type: 'button', class: 'wnt-pick', style: { '--tilt': ((r() - .5) * 7).toFixed(1) + 'deg' }, onclick: () => open(p) }, poster(p, char))));
  }

  function open(p) {
    if (!edit) { openModal({ title: p.kind, body: h('div', { class: 'wnt-view' }, poster(p, char, true)) }); return; }
    const prev = h('div', { class: 'wnt-view' });
    const form = h('div', { class: 'wnt-form' });
    const redraw = () => { fill(prev, poster(p, char, true)); save(); draw(); };
    const field = (label, input) => h('label', { class: 'wnt-field' }, h('span', {}, label), input);
    const text = (key, ph, max = 60) => h('input', { type: 'text', value: p[key] || '', placeholder: ph, maxLength: max, oninput: e => { p[key] = e.target.value; redraw(); } });
    const picRow = () => h('div', { class: 'wnt-picrow' },
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
        const got = await uploadPic(1200, { aspect: p.kind === 'missing' ? 4 / 5 : 1 });
        if (!got) return;
        if (p.imageId) store.deleteImage(p.imageId);
        p.imageId = got.imageId; drawForm(); redraw();
      } }, p.imageId ? 'change picture' : '+ picture'),
      p.imageId ? h('button', { type: 'button', class: 'link-btn', onclick: () => { store.deleteImage(p.imageId); p.imageId = null; drawForm(); redraw(); } }, 'use their pfp') : null);
    const drawForm = () => fill(form,
      field('poster', segmented([{ value: 'wanted', label: 'wanted' }, { value: 'missing', label: 'missing' }], p.kind, v => { p.kind = v; drawForm(); redraw(); })),
      field('picture', picRow()),
      field('name', text('name', nameOf(char), 40)),
      p.kind === 'wanted' ? [
        field('top line', text('wanted', 'dead or alive', 30)),
        field('for', text('crime', 'what they did', 60)),
        field('reward', text('reward', '$5,000', 20)),
      ] : [
        field('last seen', text('seen', 'where + when', 80)),
        field('about them', h('textarea', { rows: 2, maxLength: 160, value: p.about || '', placeholder: 'about them', oninput: e => { p.about = e.target.value; redraw(); } })),
        field('call', text('contact', '555-0199', 20)),
        field('paper', segmented(Object.keys(PAPERS).map(v => ({ value: v, label: v })), p.paper || 'white', v => { p.paper = v; redraw(); })),
      ]);
    drawForm();
    fill(prev, poster(p, char, true));
    openModal({
      title: 'poster', wide: true,
      body: h('div', { class: 'wnt-edit' }, form, prev),
      actions: [
        { label: 'tear it down', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('tear this poster down?', { okLabel: 'tear it down', danger: true })) return;
          if (p.imageId) store.deleteImage(p.imageId);
          d.posters = d.posters.filter(x => x !== p);
          save(); draw(); close();
        } },
        { label: 'done', kind: 'primary', onClick: close => close() },
      ],
    });
  }

  draw();
}
