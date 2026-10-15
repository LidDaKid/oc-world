// locking a diary with a code. only a hash of the code is kept (sha-256 of a random salt + the code), never the code.
// once you unlock a diary it stays open until the tab closes.

import { h, fill, openModal, uid } from '../ui.js';
import { sound } from './sound.js';

export const LOCK_STYLES = [
  { id: 'gold', label: 'gold' },
  { id: 'silver', label: 'silver' },
  { id: 'pink', label: 'pink heart' },
  { id: 'black', label: 'black heart' },
];

// ---- the code ----

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256js(bytes);
}

export async function setCode(diary, code) {
  diary.lock.salt = uid() + uid();
  diary.lock.hash = await sha256(`${diary.lock.salt}:${code}`);
  diary.lock.on = true;
  remember(diary);
}

export async function rightCode(diary, code) {
  return (await sha256(`${diary.lock.salt}:${code}`)) === diary.lock.hash;
}

// ---- unlocked for this visit ----

const KEY = 'ocw-unlocked';
const open = new Set((() => { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; } })());
function remember(diary) {
  open.add(diary.id);
  try { sessionStorage.setItem(KEY, JSON.stringify([...open])); } catch { /* fine, it's remembered in memory */ }
}
export const isLocked = diary => !!(diary.lock?.on && diary.lock.hash) && !open.has(diary.id);
export const hasLock = diary => !!(diary.lock?.on && diary.lock.hash);

// ---- the padlock (used on the keypad and on the 3d book) ----

export function padlock(style = 'gold') {
  return h('div', { class: 'padlock lk-' + style },
    h('i', { class: 'lk-shackle' }),
    h('b', { class: 'lk-body' }, h('i', { class: 'lk-hole' })));
}

// ---- the keypad ----

// mode 'open': resolves true when the right code goes in (false if they back out).
// mode 'set': asks for a new code twice, resolves with it (or null).
export function askCode(diary, { mode = 'open' } = {}) {
  let modal = null;
  const promise = new Promise(resolve => {
    let code = '', first = null, done = false;
    const lock = padlock(diary.lock?.style || 'gold');
    const dots = h('div', { class: 'kp-dots' });
    const title = h('div', { class: 'kp-title' });
    const pad = h('div', { class: 'kp-pad' });
    const box = h('div', { class: 'kp' }, h('div', { class: 'kp-lock' }, lock), title, dots, pad);
    const max = 8;

    const drawTitle = () => { title.textContent = mode === 'open' ? (diary.cover.title.text || 'locked') : first ? 'again' : 'new code'; };
    const drawDots = () => fill(dots, Array.from({ length: Math.max(4, code.length) }, (_, i) => h('i', { class: i < code.length ? 'on' : '' })));
    const press = k => {
      if (done) return;
      box.classList.remove('bad');
      if (k === 'back') code = code.slice(0, -1);
      else if (k === 'ok') return submit();
      else if (code.length < max) code += k;
      sound.key();
      drawDots();
      const last = dots.children[code.length - 1];
      if (k !== 'back' && last) last.animate([{ transform: 'scale(1.7)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
    };
    const bad = () => {
      sound.wrong();
      box.classList.remove('bad');
      void box.offsetWidth;
      box.classList.add('bad');
      code = '';
      setTimeout(drawDots, 380);
    };
    async function submit() {
      if (code.length < 3) return bad();
      if (mode === 'set') {
        if (!first) { first = code; code = ''; drawTitle(); drawDots(); sound.key(); return; }
        if (first !== code) { first = null; drawTitle(); return bad(); }
        done = true;
        sound.lock();
        box.classList.add('locking');
        setTimeout(() => { result = code; modal.close(); }, 650);
        return;
      }
      if (!await rightCode(diary, code)) return bad();
      done = true;
      remember(diary);
      sound.unlock();
      box.classList.add('unlocking');
      setTimeout(() => { result = true; modal.close(); }, 900);
    }
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok']) {
      pad.append(h('button', { type: 'button', class: 'kp-key' + (k.length > 1 ? ' kp-' + k : ''), title: k === 'back' ? 'delete' : k === 'ok' ? 'enter' : null, onclick: () => press(k) },
        k === 'back' ? '⌫' : k === 'ok' ? (mode === 'open' ? '🔓' : '🔒') : k));
    }
    const onKey = e => {
      // only the keypad on top listens (there's never really two, but just in case)
      const wraps = document.querySelectorAll('#modal-root > .modal-wrap');
      if (wraps[wraps.length - 1] !== modal?.el.parentNode) return;
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
      else if (e.key === 'Enter') { press('ok'); e.preventDefault(); }
    };
    let result = mode === 'open' ? false : null;
    modal = openModal({
      title: mode === 'open' ? '🔒' : 'lock',
      body: box,
      onClose: () => { document.removeEventListener('keydown', onKey, true); resolve(result); },
    });
    modal.el.classList.add('kp-modal');
    document.addEventListener('keydown', onKey, true);
    drawTitle();
    drawDots();
  });
  promise.close = () => modal?.close();
  return promise;
}

// a locked diary's page (the pages, the cover designer): shows the closed book and asks for the code first
export function guard(el, diary, go, render, book3d) {
  if (!isLocked(diary)) return render(el);
  let cleanup = null, gone = false, asking = null;
  const wrap = h('div', { class: 'locked-page' });
  const ask = async () => {
    if (asking || gone) return;
    asking = askCode(diary);
    const ok = await asking;
    asking = null;
    if (gone) return;
    if (ok) {
      wrap.remove();
      cleanup = render(el);
    }
  };
  const book = book3d(diary, { scale: .55 });
  wrap.append(h('div', { class: 'locked-book', onclick: ask }, book),
    h('div', { class: 'book-actions' },
      h('a', { class: 'btn ghost', href: '#/' }, '← shelf'),
      h('button', { class: 'btn primary', onclick: ask }, '🔓 unlock')));
  el.append(wrap);
  requestAnimationFrame(ask);
  return () => { gone = true; asking?.close(); cleanup?.(); };
}

// sha-256 for when crypto.subtle isn't there (an http address that isn't this computer)
function sha256js(bytes) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(total);
  m.set(bytes);
  m[len] = 0x80;
  new DataView(m.buffer).setUint32(total - 4, len * 8);
  const w = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    const dv = new DataView(m.buffer, o, 64);
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
