// one-time share links: send someone an oc's page they can look at (and hear the songs) but not change.
// the first person to open the link gets it, then it's gone for good.
//
// the oc goes up to a tiny netlify function (netlify/functions/share.mjs) as one bundle cut into pieces:
//   [4 bytes: header length][header json: { char, others, rels, images: [{ id, type, size }] }][every picture/song, back to back]
// the viewer pulls the pieces, glues them back together and keeps it all in memory. nothing gets saved on their side.

import { h, fill, toast, openModal, confirmDialog } from './ui.js';
import { store, imageIdsIn } from './store.js';
import { nameOf } from './parts.js';

const API = (() => {
  try { return window.__shareApi || localStorage.getItem('ocw-share-api') || 'https://oc-world-xo.netlify.app/api/share'; } catch { return 'https://oc-world-xo.netlify.app/api/share'; }
})();
const PART = 4e6;
const MAX_TOTAL = 250e6;
const MAX_VIDEOS = 80e6; // moodboard videos ride along until they'd make it too slow
const LINKS_KEY = 'ocw-share-links';

const linkFor = token => `${location.origin}${location.pathname}#/view/${token}`;
const savedLinks = () => { try { return JSON.parse(localStorage.getItem(LINKS_KEY)) || []; } catch { return []; } };
const keepLinks = list => { try { localStorage.setItem(LINKS_KEY, JSON.stringify(list.slice(-60))); } catch {} };

async function call(path, { method = 'GET', key, viewKey, body, raw } = {}) {
  const headers = {};
  if (key) headers['x-key'] = key;
  if (viewKey) headers['x-view-key'] = viewKey;
  if (body && !raw) headers['content-type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers, body: raw || (body ? JSON.stringify(body) : undefined) });
  return res;
}

// ---- packing an oc up ----

async function bundle(char) {
  const copy = structuredClone(char);
  copy.owner = 'shared';
  delete copy.ownerName;
  const rels = structuredClone(store.relsOf(char.id));
  const others = [...new Set(rels.flatMap(r => [r.a, r.b]).filter(id => id && id !== char.id))]
    .map(id => store.char(id)).filter(Boolean)
    .map(o => ({ id: o.id, name: o.name, color: o.color, imageId: o.imageId, tagline: o.tagline, owner: 'shared' }));

  // big videos stay home
  let videoBytes = 0;
  const keepVideo = [];
  for (const m of copy.moodboard) {
    const rec = await store.imageRecord(m.imageId);
    if (rec && videoBytes + rec.buf.byteLength <= MAX_VIDEOS) { videoBytes += rec.buf.byteLength; keepVideo.push(m); }
  }
  const leftOut = copy.moodboard.length - keepVideo.length;
  copy.moodboard = keepVideo;
  if (copy.page.videoBg && !keepVideo.some(m => m.id === copy.page.videoBg)) copy.page.videoBg = null;

  const images = [];
  const bufs = [];
  const moodIds = new Set(keepVideo.map(m => m.imageId));
  for (const id of imageIdsIn([copy, others])) {
    const rec = await store.imageRecord(id);
    if (!rec) continue;
    // phone videos share the same budget; past it they just don't come along
    if (rec.type.startsWith('video/') && !moodIds.has(id)) {
      if (videoBytes + rec.buf.byteLength > MAX_VIDEOS) continue;
      videoBytes += rec.buf.byteLength;
    }
    images.push({ id, type: rec.type, size: rec.buf.byteLength });
    bufs.push(new Uint8Array(rec.buf));
  }
  const header = new TextEncoder().encode(JSON.stringify({ v: 1, char: copy, others, rels, images }));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, header.length);
  return { blob: new Blob([len, header, ...bufs]), leftOut };
}

function unbundle(buf) {
  const n = new DataView(buf).getUint32(0);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
  let at = 4 + n;
  const urls = new Map();
  for (const img of head.images) {
    urls.set(img.id, URL.createObjectURL(new Blob([buf.slice(at, at + img.size)], { type: img.type })));
    at += img.size;
  }
  return { char: head.char, others: head.others || [], rels: head.rels || [], urls };
}

// a few pieces at a time
async function eachLimited(n, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, n) }, async () => {
    while (next < n) await fn(next++);
  }));
}

async function retry(fn, tries = 3) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (err) { if (i >= tries - 1) throw err; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
  }
}

export async function makeLink(char, onProgress = () => {}) {
  await store.flush();
  const { blob, leftOut } = await bundle(char);
  if (blob.size > MAX_TOTAL) throw new Error('too big');
  const parts = Math.max(1, Math.ceil(blob.size / PART));
  const res = await call('/new', { method: 'POST', body: { name: nameOf(char), parts } });
  if (!res.ok) throw new Error('new ' + res.status);
  const { token, key } = await res.json();
  let done = 0;
  onProgress(0);
  await eachLimited(parts, 3, async i => {
    await retry(async () => {
      const r = await call(`/${token}/part/${i}`, { method: 'PUT', key, raw: blob.slice(i * PART, (i + 1) * PART) });
      if (!r.ok) throw new Error('part ' + r.status);
    });
    onProgress(++done / parts);
  });
  const fin = await call(`/${token}/done`, { method: 'POST', key });
  if (!fin.ok) throw new Error('done ' + fin.status);
  const link = { token, key, charId: char.id, name: nameOf(char), at: Date.now() };
  keepLinks([...savedLinks(), link]);
  return { url: linkFor(token), leftOut };
}

// ---- opening one ----
// resolves with { char, others, rels, urls } or { state: 'opened' | 'gone' | 'expired' | 'error' }
export async function openLink(token, onProgress = () => {}) {
  let res;
  try { res = await call(`/${token}/open`, { method: 'POST' }); } catch { return { state: 'error' }; }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { state: ['opened', 'expired'].includes(body.state) ? body.state : res.status === 404 || res.status === 410 ? 'gone' : 'error' };
  }
  const { viewKey, parts } = await res.json();
  const pieces = new Array(parts);
  let done = 0;
  try {
    await eachLimited(parts, 3, async i => {
      pieces[i] = await retry(async () => {
        const r = await fetch(`${API}/${token}/part/${i}?v=${encodeURIComponent(viewKey)}`);
        if (!r.ok) throw new Error('part ' + r.status);
        return r.arrayBuffer();
      }, 4);
      onProgress(++done / parts);
    });
  } catch (err) {
    console.error(err);
    return { state: 'error' };
  }
  call(`/${token}/gone`, { method: 'POST', viewKey }).catch(() => {});
  const all = new Uint8Array(pieces.reduce((n, p) => n + p.byteLength, 0));
  let at = 0;
  for (const p of pieces) { all.set(new Uint8Array(p), at); at += p.byteLength; }
  return unbundle(all.buffer);
}

// ---- the share box on an oc's page ----

export function openShareModal(char) {
  const bar = h('i');
  const progress = h('div', { class: 'share-progress', hidden: true }, bar);
  const out = h('div', { class: 'share-out' });
  const list = h('div', { class: 'share-links' });
  let busy = false;

  const makeBtn = h('button', {
    type: 'button', class: 'btn primary', onclick: async () => {
      if (busy) return;
      busy = true;
      makeBtn.disabled = true;
      progress.hidden = false;
      bar.style.width = '0%';
      fill(out);
      try {
        const { url, leftOut } = await makeLink(char, p => { bar.style.width = Math.round(p * 100) + '%'; });
        const input = h('input', { type: 'text', class: 'share-url', value: url, readOnly: true, onfocus: e => e.target.select() });
        fill(out, h('div', { class: 'share-url-row' }, input,
          h('button', { type: 'button', class: 'btn sm', onclick: async e => { await copy(url, input); e.target.textContent = 'copied'; } }, 'copy')));
        if (leftOut) toast(`left out ${leftOut} big ${leftOut === 1 ? 'video' : 'videos'}`);
        drawList();
      } catch (err) {
        console.error(err);
        toast(err.message === 'too big' ? 'too big to share (pictures + songs over 250 mb)' : "couldn't make the link", 'bad');
      }
      progress.hidden = true;
      makeBtn.disabled = false;
      busy = false;
    },
  }, 'make a one-time link');

  async function drawList() {
    const mine = savedLinks().filter(l => l.charId === char.id).reverse();
    if (!mine.length) { fill(list); return; }
    const rows = mine.map(l => {
      const state = h('span', { class: 'share-state' }, '…');
      const row = h('div', { class: 'share-link-row' },
        h('span', { class: 'share-when' }, new Date(l.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + new Date(l.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase()),
        state);
      call(`/${l.token}/status`, { key: l.key }).then(r => r.ok ? r.json() : { state: 'gone' }).catch(() => ({ state: '?' })).then(st => {
        const label = { ready: 'waiting', opened: 'opened', expired: 'expired', uploading: 'broken', gone: 'cancelled' }[st.state] || '?';
        state.textContent = label;
        state.dataset.state = label;
        if (st.state === 'ready') {
          row.append(
            h('button', { type: 'button', class: 'link-btn', onclick: async e => { await copy(linkFor(l.token)); e.target.textContent = 'copied'; } }, 'copy'),
            h('button', {
              type: 'button', class: 'link-btn danger', onclick: async () => {
                if (!await confirmDialog('cancel this link?', { okLabel: 'cancel it', danger: true })) return;
                await call(`/${l.token}`, { method: 'DELETE', key: l.key }).catch(() => {});
                keepLinks(savedLinks().filter(x => x.token !== l.token));
                drawList();
              },
            }, 'cancel'));
        }
        if (['gone', 'expired', 'opened'].includes(st.state) && Date.now() - l.at > 30 * 24 * 3600e3) keepLinks(savedLinks().filter(x => x.token !== l.token));
      });
      return row;
    });
    fill(list, h('div', { class: 'field-label' }, 'links'), rows);
  }

  openModal({
    title: `share ${nameOf(char)}`,
    body: h('div', { class: 'share-box' }, makeBtn, progress, out, list),
    actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
  });
  drawList();
}

async function copy(text, input) {
  try { await navigator.clipboard.writeText(text); toast('copied'); } catch {
    input?.select();
    try { document.execCommand('copy'); toast('copied'); } catch {}
  }
}
