// movie poster: their life as a movie. title, tagline, cast billing, rating, release date, genre, a picture,
// in one of four poster styles (horror, rom-com, indie, blockbuster) with the tiny credits block at the bottom.
//
// d.posters = [{ id, title, tagline, genre, style, rating, date, imageId, usePfp, cast: [ocId], director, studio, color }]

import { h, fill, segmented, swatches, openModal, confirmDialog, uid } from '../ui.js';
import { appBar, uploadPic, pic, portrait, nameOf, worldmates, ocById } from './kit.js';
import { store } from '../store.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'movieposter', label: 'movie poster', icon: '1f37f' };

const STYLES = ['horror', 'rom-com', 'indie', 'blockbuster'];
const RATINGS = ['G', 'PG', 'PG-13', 'R'];
const COLORS = ['#ff2d55', '#ff4fa3', '#b18cff', '#6ec6ff', '#7df9d0', '#ffd84d', '#ff8a3d', '#f7effc'];
const DEF = { posters: null };
const slug = s => s.replace(/\W/g, '');

function niceDate(iso) {
  const d = iso ? new Date(iso + 'T12:00:00') : null;
  if (!d || isNaN(d)) return 'coming soon';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
}

// the poster itself (small = the pile, big = opened)
export function poster(p, char, big = false) {
  const cast = (p.cast || []).map(ocById).filter(Boolean);
  const names = [char, ...cast.filter(c => c.id !== char.id)];
  const art = p.imageId ? pic(p.imageId, 'mvp-pic') : p.usePfp !== false && char.imageId ? pic(char.imageId, 'mvp-pic') : h('div', { class: 'mvp-pic mvp-pic-empty' }, portrait(char, 'mvp-pfp'));
  const credits = [
    p.studio ? `${p.studio} presents` : null,
    `a ${p.director || nameOf(char)} film`,
    `starring ${names.map(nameOf).join('  ')}`,
    p.genre ? `a ${p.genre} story` : null,
  ].filter(Boolean).join('   ');
  return h('div', { class: `mvp-poster mvp-${slug(p.style || 'blockbuster')}${big ? ' big' : ''}`, style: { '--c': p.color || char.color || '#ff4fa3' } },
    h('div', { class: 'mvp-art' }, art, h('div', { class: 'mvp-fade' })),
    p.style === 'blockbuster' || !p.style ? h('div', { class: 'mvp-billing' }, names.slice(0, 4).map(c => h('span', {}, nameOf(c)))) : null,
    p.style === 'indie' ? h('div', { class: 'mvp-laurels' }, h('span', { class: 'mvp-laurel' }, 'official selection'), h('span', { class: 'mvp-laurel' }, 'winner')) : null,
    p.tagline ? h('div', { class: 'mvp-tagline' }, p.tagline) : null,
    h('div', { class: 'mvp-title' }, p.title || 'untitled'),
    h('div', { class: 'mvp-bottom' },
      h('div', { class: 'mvp-date' }, p.date ? `in theaters ${niceDate(p.date)}` : 'coming soon'),
      h('div', { class: 'mvp-credits' }, credits),
      h('div', { class: 'mvp-row' },
        h('span', { class: 'mvp-rating' }, h('b', {}, p.rating || 'PG-13'), h('i', {}, p.rating === 'R' ? 'restricted' : p.rating === 'G' ? 'general audiences' : 'parental guidance')),
        h('span', { class: 'mvp-studio' }, (p.studio || 'oc world pictures').toUpperCase()))));
}

export function render(el, ctx) {
  const { char } = ctx;
  const d = defaults(ctx.data, DEF);
  const edit = ctx.mine;
  if (!Array.isArray(d.posters)) {
    d.posters = [{ id: 'mp_' + uid(), title: nameOf(char), tagline: char.tagline || '', genre: 'coming of age', style: 'blockbuster', rating: 'PG-13', date: '', imageId: null, usePfp: true, cast: [], director: '', studio: '', color: char.color }];
    if (edit) ctx.save();
  }
  const save = () => { if (edit) ctx.save(); };
  const wall = h('div', { class: 'mvp-wall' });
  el.append(appBar(ctx, meta, edit ? h('button', { class: 'btn primary sm', onclick: () => {
    const p = { id: 'mp_' + uid(), title: '', tagline: '', genre: '', style: STYLES[d.posters.length % 4], rating: 'PG-13', date: '', imageId: null, usePfp: true, cast: [], director: '', studio: '', color: char.color };
    d.posters.unshift(p); save(); draw(); open(p);
  } }, '+ poster') : null), wall);

  function draw() {
    fill(wall, d.posters.map(p => h('button', { type: 'button', class: 'mvp-frame', onclick: () => open(p) }, poster(p, char))));
  }

  function open(p) {
    if (!edit) { openModal({ title: p.title || 'movie', wide: true, body: h('div', { class: 'mvp-view' }, poster(p, char, true)) }); return; }
    const prev = h('div', { class: 'mvp-view' });
    const redraw = () => { fill(prev, poster(p, char, true)); save(); draw(); };
    const field = (label, input) => h('label', { class: 'mvp-field' }, h('span', {}, label), input);
    const text = (key, ph, max = 60) => h('input', { type: 'text', value: p[key] || '', placeholder: ph, maxLength: max, oninput: e => { p[key] = e.target.value; redraw(); } });
    const mates = worldmates(char.id);
    const castBox = h('div', { class: 'mvp-cast' });
    const drawCast = () => fill(castBox, mates.length ? mates.map(m => h('button', {
      type: 'button', class: 'mvp-cast-pick' + ((p.cast || []).includes(m.id) ? ' on' : ''), style: { '--c': m.color },
      onclick: () => { p.cast = (p.cast || []).includes(m.id) ? p.cast.filter(x => x !== m.id) : [...(p.cast || []), m.id]; drawCast(); redraw(); },
    }, portrait(m, 'xs'), nameOf(m))) : h('span', { class: 'mvp-none' }, '—'));
    drawCast();
    const picBox = h('div', { class: 'mvp-picrow' });
    const drawPic = () => fill(picBox,
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
        const got = await uploadPic(1600, { aspect: 2 / 3 });
        if (!got) return;
        if (p.imageId) store.deleteImage(p.imageId);
        p.imageId = got.imageId; drawPic(); redraw();
      } }, p.imageId ? 'change picture' : '+ picture'),
      p.imageId ? h('button', { type: 'button', class: 'link-btn', onclick: () => { store.deleteImage(p.imageId); p.imageId = null; drawPic(); redraw(); } }, 'use their pfp') : null);
    drawPic();
    const form = h('div', { class: 'mvp-form' },
      field('title', text('title', 'title', 50)),
      field('tagline', text('tagline', 'tagline', 90)),
      field('style', segmented(STYLES.map(v => ({ value: v, label: v })), p.style || 'blockbuster', v => { p.style = v; redraw(); })),
      field('picture', picBox),
      field('starring', castBox),
      h('div', { class: 'mvp-two' }, field('genre', text('genre', 'genre', 30)), field('directed by', text('director', nameOf(char), 30))),
      h('div', { class: 'mvp-two' }, field('studio', text('studio', 'oc world pictures', 30)),
        field('release date', h('input', { type: 'date', value: p.date || '', onchange: e => { p.date = e.target.value; redraw(); } }))),
      field('rating', segmented(RATINGS.map(v => ({ value: v, label: v })), p.rating || 'PG-13', v => { p.rating = v; redraw(); })),
      field('color', swatches(p.color || char.color, c => { p.color = c; redraw(); }, COLORS)));
    fill(prev, poster(p, char, true));
    openModal({
      title: 'movie poster', wide: true,
      body: h('div', { class: 'mvp-edit' }, form, prev),
      actions: [
        { label: 'delete', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('delete this poster?', { okLabel: 'delete', danger: true })) return;
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
