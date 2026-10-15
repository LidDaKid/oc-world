// bits the phone, socials + letters apps share: "who" (an oc or a typed name), times, picking photos.
//
// a person ("ref") = { id: an oc id or null, name: what to call them }.
// name is kept as a backup so it still reads right if that oc gets deleted.

import { h, openModal, pickFiles, shrinkImage, toast, uid } from '../ui.js';
import { store } from '../store.js';
import { portrait, nameOf, allOcs, ocById, worldmates } from './kit.js';
import { cropAll } from '../crop.js';
import { ctx as acctCtx, acctOfRef } from './phone-accounts.js';

export function who(ref) {
  const c = ref?.id ? ocById(ref.id) : null;
  const w = { char: c, name: c ? nameOf(c) : (ref?.name || 'someone'), color: c?.color || ref?.color || '#9b8aa8', gone: !!ref?.id && !c };
  // inside an app, an oc reads as their account there (see phone-accounts.js)
  const a = c && acctCtx.app ? acctOfRef(ref, acctCtx.app) : null;
  if (a) Object.assign(w, { name: a.name || w.name, handle: a.handle, imageId: a.imageId || null });
  return w;
}

export const refOf = c => ({ id: c.id, name: nameOf(c) });

export function face(ref, cls = 'sm') {
  const w = who(ref);
  return portrait(w.char ? { ...w.char, name: w.name, imageId: w.imageId || w.char.imageId } : { name: w.name, color: w.color }, cls);
}

// refresh the backup names (call before saving)
export function freshRef(ref) {
  const c = ref?.id ? ocById(ref.id) : null;
  const out = c ? { id: c.id, name: nameOf(c) } : { id: ref?.id || null, name: ref?.name || '' };
  if (ref?.acct) out.acct = ref.acct;
  return out;
}

// a box to pick an oc or type a name. resolves with a ref, or null
export function pickWho({ title = 'who?', not = null, typed = true, okLabel = 'pick' } = {}) {
  return new Promise(resolve => {
    let done = null;
    const name = h('input', { type: 'text', placeholder: 'type a name', maxLength: 60 });
    const ocs = allOcs(not);
    const body = h('div', { class: 'who-pick' },
      ocs.length ? h('div', { class: 'who-pick-grid' }, ocs.map(o =>
        h('button', {
          type: 'button', class: 'who-pick-oc', style: { '--c': o.color },
          onclick: () => { done = refOf(o); m.close(); },
        }, portrait(o, 'md'), h('span', {}, nameOf(o))))) : null,
      typed ? h('div', { class: 'who-pick-typed' }, name) : null);
    const m = openModal({
      title, body,
      actions: typed ? [{ label: okLabel, kind: 'primary', onClick: close => { const v = name.value.trim(); if (!v) { name.focus(); return; } done = { id: null, name: v }; close(); } }] : [],
      onClose: () => resolve(done),
    });
  });
}

// ---- times ----

const pad = n => String(n).padStart(2, '0');
export const hm = (ts = Date.now()) => { const d = new Date(ts); return `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`; };
export const hmA = ts => { const d = new Date(ts); return `${hm(ts)} ${d.getHours() < 12 ? 'am' : 'pm'}`; };
const dayStart = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function dayLabel(ts) {
  const diff = Math.round((dayStart(Date.now()) - dayStart(ts)) / 864e5);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return new Date(ts).toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
}
export const stamp = ts => `${dayLabel(ts)} ${hmA(ts)}`;
export function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return Math.floor(s / 604800) + 'w';
}
export const shortDate = ts => (dayStart(ts) === dayStart(Date.now()) ? hmA(ts) : new Date(ts).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' }));

// ---- pictures ----

// pick one or more pictures; resolves with [{ imageId, width, height }]
export async function addPhotos(multiple = true, maxDim = 1400) {
  const files = await cropAll(await pickFiles('image/*', multiple));
  const out = [];
  for (const file of files) {
    try {
      const { blob, width, height } = await shrinkImage(file, maxDim);
      out.push({ imageId: await store.putImage(blob), width, height });
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }
  return out;
}

export const dropImage = id => { if (id) store.deleteImage(id); };

// shorten big numbers like socials do: 12400 -> 12.4k
export function bigNum(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'm';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

// what `other` is to `char`, from their relationships ('' if none)
export function relLabel(char, otherId) {
  for (const r of store.relsOf(char.id)) {
    if (r.a === char.id && r.b === otherId) return r.label;
    if (r.b === char.id && r.a === otherId) return r.back ?? r.label;
  }
  return '';
}

// text color that reads on top of a background color
export function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#1a0d16' : '#fff';
}

// ---- texting another oc lands on their phone too ----
// a message one oc sends to another oc you made gets copied into that oc's phone (me/them flipped, same message id
// so reactions + deletes follow it). ocs you can't edit (someone else's in a shared world) are left alone.
function otherThread(fromChar, ref, make = true) {
  const other = ref?.id ? store.char(ref.id) : null;
  if (!other || other.id === fromChar.id || !store.isMine(other) || !store.isMine(fromChar)) return null;
  if (!worldmates(fromChar.id).some(c => c.id === other.id)) return null; // only ocs in the same world
  other.fun ||= {};
  const p = other.fun.phone ||= {};
  p.threads ||= [];
  let t = p.threads.find(x => x.who?.id === fromChar.id);
  if (!t && make) {
    t = { id: 't_' + uid(), who: { id: fromChar.id, name: nameOf(fromChar) }, msgs: [], read: true, typing: false, at: Date.now() };
    p.threads.push(t);
  }
  return t ? { other, t } : null;
}
async function copyImage(imageId) {
  try {
    const url = await store.imageURL(imageId);
    if (!url) return null;
    return await store.putImage(await (await fetch(url)).blob());
  } catch (err) { console.error(err); return null; }
}
export async function mirrorSend(fromChar, ref, m) {
  const o = otherThread(fromChar, ref);
  if (!o || o.t.msgs.some(x => x.id === m.id)) return;
  const copy = { id: m.id, from: m.from === 'me' ? 'them' : 'me', text: m.text, imageId: null, at: m.at, react: m.react || null };
  o.t.msgs.push(copy);
  o.t.msgs.sort((a, b) => a.at - b.at);
  store.save('char', o.other);
  if (m.imageId) { copy.imageId = await copyImage(m.imageId); store.save('char', o.other); }
}
export function mirrorReact(fromChar, ref, id, react) {
  const o = otherThread(fromChar, ref, false);
  const m = o?.t.msgs.find(x => x.id === id);
  if (!m) return;
  m.react = react;
  store.save('char', o.other);
}
export function mirrorDelete(fromChar, ref, ids) {
  const o = otherThread(fromChar, ref, false);
  if (!o) return;
  const gone = o.t.msgs.filter(x => ids.includes(x.id));
  if (!gone.length) return;
  o.t.msgs = o.t.msgs.filter(x => !ids.includes(x.id));
  gone.forEach(m => dropImage(m.imageId));
  store.save('char', o.other);
}
