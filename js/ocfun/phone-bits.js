// bits the phone, socials + letters apps share: "who" (an oc or a typed name), times, picking photos.
//
// a person ("ref") = { id: an oc id or null, name: what to call them }.
// name is kept as a backup so it still reads right if that oc gets deleted.

import { h, fill, openModal, pickFiles, shrinkImage, toast, uid } from '../ui.js';
import { store, MAX_VIDEO } from '../store.js';
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

// texts from them since the chat was last opened (t.seenAt = the newest text that's been seen)
export function unreadCount(t) {
  let k = 0;
  for (let i = (t.msgs?.length || 0) - 1; i >= 0 && t.msgs[i].from === 'them' && t.msgs[i].at > (t.seenAt || 0); i--) k++;
  return k;
}

// ---- videos ----
// a video is saved like a picture (store.putImage) and kept as { imageId, dur, w, h } under a key like `video`
// (the `imageId` inside is what backups + deleting look for). tests can hand one over as window.__testVideo.

// pick a video; resolves with { imageId, dur, w, h } or null
export async function addVideo(file = null) {
  file ||= window.__testVideo || (await pickFiles('video/*', false))[0];
  if (!file) return null;
  const probe = document.createElement('video');
  if (!file.type.startsWith('video/') || !probe.canPlayType(file.type)) { toast("that isn't a video this browser can play", 'bad'); return null; }
  if (file.size > MAX_VIDEO) { toast(`too big (${MAX_VIDEO / 1e6} mb max)`, 'bad'); return null; }
  const url = URL.createObjectURL(file);
  const info = await new Promise(resolve => {
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => resolve({ dur: Number.isFinite(probe.duration) ? probe.duration : 0, w: probe.videoWidth, h: probe.videoHeight });
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
  URL.revokeObjectURL(url);
  if (!info) { toast("couldn't read that video", 'bad'); return null; }
  try {
    return { imageId: await store.putImage(file), dur: Math.round(info.dur * 10) / 10, w: info.w, h: info.h };
  } catch (err) {
    console.error(err);
    toast("couldn't save that video", 'bad');
    return null;
  }
}

// sound is one setting for every video on the phone, like the real apps (tap the speaker to flip it)
export const videoSound = { on: true };
const live = new Set(); // every video made here. ones that leave the page get paused so they don't keep playing
setInterval(() => { for (const v of live) if (!v.isConnected) { v.pause(); live.delete(v); } }, 700);

// a <video> for a saved video.
//   autoplay: start right away     inView: play only while mostly on screen (feeds)
//   sound: use the shared sound setting (otherwise always muted)     loop, controls, poster (an imageId)
export function vid(video, cls = '', { autoplay = false, inView = false, sound = false, loop = true, controls = false, poster = null } = {}) {
  const v = h('video', { class: 'ph-vid ' + cls, playsInline: true, loop, controls, preload: autoplay || inView ? 'auto' : 'metadata' });
  v.muted = !(sound && videoSound.on);
  v.setAttribute('playsinline', '');
  live.add(v);
  if (poster) store.imageURL(poster).then(url => { if (url) v.poster = url; });
  let wantPlay = false; // asked to play before the file was loaded: play once it is
  const play = () => {
    if (!v.src) { wantPlay = true; return; }
    v.muted = !(sound && videoSound.on);
    const p = v.play();
    p?.catch(() => { if (!v.muted) { v.muted = true; v.play().catch(() => {}); } });
  };
  v.playNow = play;
  store.imageURL(video?.imageId).then(url => {
    if (!url) return;
    // #t=0.1 makes paused videos show their first frame instead of black
    v.src = url + (autoplay || inView ? '' : '#t=0.1');
    if (autoplay || wantPlay) play();
  });
  if (inView) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.6) play(); else { wantPlay = false; v.pause(); } }, { threshold: [0, 0.6, 1] });
    io.observe(v);
  }
  return v;
}

// tap to pause / play, with the little icon popping up in the middle like tiktok
export function tapToPause(v, host = v.parentElement) {
  const mark = h('i', { class: 'ph-vid-mark' });
  host.append(mark);
  v.addEventListener('click', e => {
    e.stopPropagation();
    if (v.paused) v.playNow(); else v.pause();
    mark.textContent = v.paused ? '▶' : '❚❚';
    mark.classList.remove('show'); void mark.offsetWidth; mark.classList.add('show');
  });
}

// the speaker button that flips sound for every video on the phone
export function soundBtn(cls = '') {
  const b = h('button', { type: 'button', class: 'ph-vid-sound ' + cls, title: 'sound' });
  const paint = () => { b.textContent = videoSound.on ? '🔊' : '🔇'; };
  paint();
  b.onclick = e => {
    e.stopPropagation();
    videoSound.on = !videoSound.on;
    for (const v of live) if (v.isConnected && !v.paused) v.muted = !videoSound.on;
    document.querySelectorAll('.ph-vid-sound').forEach(x => { x.textContent = videoSound.on ? '🔊' : '🔇'; });
    paint();
  };
  return b;
}

// the "video" row for a form: preview + add / change / remove. onChange gets the new video or null
export function videoField(value, onChange) {
  let cur = value || null;
  const box = h('div', { class: 'ph-vid-field' });
  const paint = () => fill(box,
    cur ? vid(cur, 'ph-vid-prev', { autoplay: true }) : null,
    h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const got = await addVideo(); if (got) { if (cur && cur !== value) dropImage(cur.imageId); cur = got; onChange(cur); paint(); } } }, cur ? 'change' : 'add video'),
    cur ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { if (cur !== value) dropImage(cur.imageId); cur = null; onChange(null); paint(); } }, 'remove') : null);
  paint();
  return box;
}

// "1:05" from seconds
export const clock = sec => { sec = Math.max(0, Math.round(sec || 0)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };

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
  await copyMedia(m, copy, o.other);
}
async function copyMedia(m, copy, other) {
  if (m.imageId) copy.imageId = await copyImage(m.imageId);
  if (m.video?.imageId) copy.video = { ...m.video, imageId: await copyImage(m.video.imageId) };
  if (m.imageId || m.video) store.save('char', other);
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
  gone.forEach(m => { dropImage(m.imageId); dropImage(m.video?.imageId); });
  store.save('char', o.other);
}

// ---- group chats land on every member's phone too ----
// a group thread = { id, group: { gid, name, imageId, members: [ref] }, who: { id: null, name }, msgs }
// (gid is the same on everyone's copy). a message from someone else carries `by` (a ref).
// from member X's side: what `fromChar` sent is from 'them' by fromChar, what X sent is from 'me'.
function groupCopies(fromChar, t, make = true) {
  if (!store.isMine(fromChar)) return [];
  const mates = new Set(worldmates(fromChar.id).map(c => c.id));
  const out = [];
  for (const ref of t.group.members) {
    const other = ref.id && mates.has(ref.id) ? store.char(ref.id) : null;
    if (!other || !store.isMine(other)) continue;
    other.fun ||= {};
    const p = other.fun.phone ||= {};
    p.threads ||= [];
    const members = [{ id: fromChar.id, name: nameOf(fromChar) }, ...t.group.members.filter(x => x.id !== other.id).map(x => ({ id: x.id || null, name: x.name }))];
    let ot = p.threads.find(x => x.group?.gid === t.group.gid);
    if (!ot && !make) continue;
    if (!ot) {
      ot = { id: 't_' + uid(), group: { gid: t.group.gid, name: t.group.name, imageId: null, members }, who: { id: null, name: t.group.name }, msgs: [], read: true, typing: false, at: Date.now() };
      p.threads.push(ot);
    } else {
      ot.group.name = t.group.name;
      ot.who = { id: null, name: t.group.name };
      ot.group.members = members;
    }
    out.push({ other, t: ot });
  }
  return out;
}
const seenBy = (fromChar, m, other) => (m.from === 'me' ? { from: 'them', by: { id: fromChar.id, name: nameOf(fromChar) } }
  : m.by?.id === other.id ? { from: 'me' } : { from: 'them', by: m.by });
export async function mirrorGroupSend(fromChar, t, m) {
  for (const { other, t: ot } of groupCopies(fromChar, t)) {
    if (ot.msgs.some(x => x.id === m.id)) continue;
    const copy = { id: m.id, ...seenBy(fromChar, m, other), text: m.text, imageId: null, at: m.at, react: m.react || null };
    ot.msgs.push(copy);
    ot.msgs.sort((a, b) => a.at - b.at);
    store.save('char', other);
    copyMedia(m, copy, other);
  }
}
// name / members changed: update everyone's copy
export function mirrorGroupInfo(fromChar, t) {
  for (const { other } of groupCopies(fromChar, t, false)) store.save('char', other);
}
export function mirrorGroupReact(fromChar, t, id, react) {
  for (const { other, t: ot } of groupCopies(fromChar, t, false)) {
    const m = ot.msgs.find(x => x.id === id);
    if (m) { m.react = react; store.save('char', other); }
  }
}
export function mirrorGroupDelete(fromChar, t, ids) {
  for (const { other, t: ot } of groupCopies(fromChar, t, false)) {
    const gone = ot.msgs.filter(x => ids.includes(x.id));
    if (!gone.length) continue;
    ot.msgs = ot.msgs.filter(x => !ids.includes(x.id));
    gone.forEach(m => { dropImage(m.imageId); dropImage(m.video?.imageId); });
    store.save('char', other);
  }
}


// ---- catching up ----
// texts only get copied over when they're sent, so anything sent before two ocs shared a world (or before copying
// existed) is only on one phone. opening a phone pulls in whatever a worldmate's phone has that this one is missing.
// d.cleared = { <oc id or group gid>: when this phone deleted that chat }: older texts don't come back after that.
export async function catchUp(char, d) {
  if (!store.isMine(char)) return false;
  d.cleared ||= {};
  let changed = false;
  const copies = [];
  for (const mate of worldmates(char.id)) {
    if (!store.isMine(mate)) continue;
    for (const theirs of mate.fun?.phone?.threads || []) {
      const msgs = theirs.msgs || [];
      if (!msgs.length) continue;
      if (theirs.group) {
        // a group with this oc in it
        if (!theirs.group.members?.some(m => m.id === char.id)) continue;
        const gid = theirs.group.gid;
        const since = d.cleared[gid] || 0;
        const fresh = msgs.filter(m => m.at > since);
        if (!fresh.length) continue;
        let t = d.threads.find(x => x.group?.gid === gid);
        if (!t) {
          const members = [{ id: mate.id, name: nameOf(mate) }, ...theirs.group.members.filter(m => m.id !== char.id).map(m => ({ id: m.id || null, name: m.name }))];
          t = { id: 't_' + uid(), group: { gid, name: theirs.group.name, imageId: null, members }, who: { id: null, name: theirs.group.name }, msgs: [], read: true, typing: false, at: Date.now() };
          d.threads.push(t);
        }
        for (const m of fresh) {
          if (t.msgs.some(x => x.id === m.id)) continue;
          const copy = { id: m.id, ...seenBy(mate, m, char), text: m.text, imageId: null, at: m.at, react: m.react || null };
          t.msgs.push(copy);
          copies.push([m, copy]);
          changed = true;
        }
        t.msgs.sort((a, b) => a.at - b.at);
        continue;
      }
      if (theirs.who?.id !== char.id) continue;
      const since = d.cleared[mate.id] || 0;
      const fresh = msgs.filter(m => m.at > since);
      if (!fresh.length) continue;
      let t = d.threads.find(x => !x.group && x.who?.id === mate.id);
      if (!t) {
        t = { id: 't_' + uid(), who: { id: mate.id, name: nameOf(mate) }, msgs: [], read: true, typing: false, at: Date.now() };
        d.threads.push(t);
      }
      for (const m of fresh) {
        if (t.msgs.some(x => x.id === m.id)) continue;
        const copy = { id: m.id, from: m.from === 'me' ? 'them' : 'me', text: m.text, imageId: null, at: m.at, react: m.react || null };
        t.msgs.push(copy);
        copies.push([m, copy]);
        changed = true;
      }
      t.msgs.sort((a, b) => a.at - b.at);
    }
  }
  if (changed) store.save('char', char);
  // pictures + videos get their own copies (so deleting one side never breaks the other)
  for (const [m, copy] of copies) await copyMedia(m, copy, char);
  return changed;
}