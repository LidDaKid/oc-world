// little helpers the "more" tab apps share.
//
// every app's render(el, ctx) gets:
//   ctx.char    the oc whose page this is
//   ctx.mine    true if you made this oc (false = someone else's oc in a collab world: look, don't touch)
//   ctx.save()  call after changing anything on ctx.char
//   ctx.data    this app's own saved stuff (= char.fun[<id>]), always an object
//   ctx.go(path), ctx.base ('oc/<id>' or 'w/<world>/ocs/<id>'), ctx.world (or null)
//   ctx.ocLink(oc)  the href to another oc's page
//
// pictures: store them with store.putImage(blob) and keep the id under a key named exactly `imageId`
// (backups + deleting find pictures by that name).

import { h, toast, pickFile, shrinkImage } from '../ui.js';
import { store } from '../store.js';
import { portrait, nameOf } from '../parts.js';
import { pickAndCrop } from '../crop.js';

export { portrait, nameOf };

// fills in anything missing on char.fun[id] and hands it back
export function dataFor(char, id, defaults = {}) {
  char.fun ||= {};
  const d = char.fun[id] = { ...structuredClone(defaults), ...char.fun[id] };
  return d;
}

// asks for a picture, lets you crop it, shrinks it, saves it. resolves with { imageId, width, height } or null
// opts.aspect = the shape it's going into (width / height), so the crop starts that shape
export async function uploadPic(maxDim = 1400, opts = {}) {
  const file = await pickAndCrop(opts);
  if (!file) return null;
  try {
    const { blob, width, height } = await shrinkImage(file, maxDim);
    return { imageId: await store.putImage(blob), width, height };
  } catch (err) {
    console.error(err);
    toast("couldn't read that picture", 'bad');
    return null;
  }
}

// an <img> for a saved picture
export function pic(imageId, cls = '') {
  const img = h('img', { class: cls, alt: '', draggable: false });
  if (imageId) store.imageURL(imageId).then(url => { if (url) img.src = url; });
  return img;
}

// a 3d sticker picture from /stickers by its code
export const sticker = (code, cls = '') => h('img', { class: 'fun-stk ' + cls, src: `stickers/${code}.webp`, alt: '', draggable: false, loading: 'lazy' });

// the ocs that share a world with this one (only they show up in each other's phones, posts, picks...)
export function worldmates(charId) {
  const ids = new Set(store.worldsOf(charId).flatMap(w => w.charIds));
  ids.delete(charId);
  return store.chars.filter(c => ids.has(c.id));
}

// every oc you can pick for `not`'s page = their worldmates. with no `not`, every oc
export const allOcs = not => (not ? worldmates(not) : store.chars);

// a dropdown of ocs. value = an oc id or ''
export function ocSelect(value, onPick, { not, empty = '—' } = {}) {
  return h('select', { class: 'oc-select', onchange: e => onPick(e.target.value || null) },
    h('option', { value: '' }, empty),
    allOcs(not).map(o => h('option', { value: o.id, selected: o.id === value }, nameOf(o))));
}

export const ocById = id => (id ? store.char(id) : null);

// the top bar inside an app: back to the grid + the app's name
export function appBar(ctx, meta, ...right) {
  return h('div', { class: 'fun-bar' },
    h('a', { class: 'fun-back', href: `#/${ctx.base}/fun` }, '‹'),
    sticker(meta.icon, 'fun-bar-icon'),
    h('h2', { class: 'fun-title' }, meta.label),
    h('div', { class: 'fun-bar-right' }, ...right));
}

export const fmtDate = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
