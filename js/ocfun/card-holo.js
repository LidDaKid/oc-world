// the tilt + foil light for the trading card (and the id cards borrow it).
// sets css vars on `el` as the pointer moves: --mx --my (light spot), --rx --ry (tilt), --posx --posy (foil position),
// --hyp (0 center .. 1 corner), --o (how strong the shine is). when nobody's touching it, it sways a little by itself.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function holoTilt(el, { max = 16, idle = true, idleAmp = 0.32, ease = 0.12 } = {}) {
  let raf = 0, active = false, visible = true, lastTouch = 0, t0 = performance.now();
  const cur = { x: 0.5, y: 0.5, o: idle ? 0.55 : 0 };
  const goal = { x: 0.5, y: 0.5, o: cur.o };

  const set = () => {
    const { x, y, o } = cur, st = el.style;
    st.setProperty('--mx', (x * 100).toFixed(2) + '%');
    st.setProperty('--my', (y * 100).toFixed(2) + '%');
    st.setProperty('--posx', (30 + x * 40).toFixed(2) + '%');
    st.setProperty('--posy', (30 + y * 40).toFixed(2) + '%');
    st.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
    st.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
    st.setProperty('--hyp', Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2).toFixed(3));
    st.setProperty('--o', o.toFixed(3));
  };

  const frame = now => {
    raf = 0;
    if (!active) {
      if (idle && !reduce() && now - lastTouch > 1400) {
        const t = (now - t0) / 1000;
        goal.x = 0.5 + Math.sin(t * 0.9) * idleAmp * 0.5;
        goal.y = 0.5 + Math.sin(t * 0.63 + 1.3) * idleAmp * 0.38;
        goal.o = 0.55;
      } else {
        goal.x = 0.5; goal.y = 0.5; goal.o = idle ? 0.45 : 0;
      }
    }
    const k = active ? ease * 1.6 : ease * 0.5;
    cur.x += (goal.x - cur.x) * k;
    cur.y += (goal.y - cur.y) * k;
    cur.o += (goal.o - cur.o) * 0.12;
    set();
    if (visible) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  const move = e => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    goal.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    goal.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    goal.o = 1;
    active = true;
    kick();
  };
  const leave = () => { active = false; lastTouch = performance.now(); kick(); };

  el.addEventListener('pointermove', move);
  el.addEventListener('pointerdown', move);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointercancel', leave);
  el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });

  // stop animating while it's off screen
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); });
  io.observe(el);
  set();
  kick();

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    io.disconnect();
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerdown', move);
    el.removeEventListener('pointerleave', leave);
    el.removeEventListener('pointercancel', leave);
  };
}

// a value off an oc's basics ("age", "birthday" ...), or ''
export function basic(char, ...labels) {
  for (const label of labels) {
    const b = (char?.basics || []).find(x => (x.label || '').trim().toLowerCase() === label);
    if (b && String(b.value || '').trim()) return String(b.value).trim();
  }
  return '';
}

// the same number every time for the same text (for made-up id numbers, barcodes ...)
export function hashNum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function seeded(str) {
  let a = hashNum(str) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// keeps object urls for pictures so redraws can set src right away (no flicker)
const urls = new Map();
export function picNow(store, imageId, attrs = {}) {
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') Object.assign(img.style, v);
    else if (k === 'class') img.className = v;
    else img.setAttribute(k, v);
  }
  if (!imageId) return img;
  if (urls.has(imageId)) img.src = urls.get(imageId);
  else store.imageURL(imageId).then(u => { if (u) { urls.set(imageId, u); img.src = u; } });
  return img;
}
