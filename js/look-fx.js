// the moving bits of a look: things falling behind the boxes, custom cursors, the cursor sparkle trail.
// look.js paint() calls these every time a look changes, so they all reuse what's already on the page.

// ---- falling stuff: one canvas per page, fixed behind the boxes ----

const heart = (g, s) => {
  g.beginPath();
  g.moveTo(0, s * .35);
  g.bezierCurveTo(-s * .9, -s * .25, -s * .45, -s * .95, 0, -s * .4);
  g.bezierCurveTo(s * .45, -s * .95, s * .9, -s * .25, 0, s * .35);
  g.fill();
};
const glyph = ch => (g, s) => { g.font = `${s * 2}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 0, 0); };
const DRAW = {
  hearts: heart,
  bats(g, s) {
    g.beginPath();
    g.moveTo(0, -s * .15);
    g.quadraticCurveTo(-s * .25, -s * .45, -s * .55, -s * .3);
    g.quadraticCurveTo(-s * .8, -s * .35, -s, -s * .05);
    g.quadraticCurveTo(-s * .8, -s * .1, -s * .7, s * .15);
    g.quadraticCurveTo(-s * .5, 0, -s * .4, s * .2);
    g.quadraticCurveTo(-s * .2, s * .05, 0, s * .3);
    g.quadraticCurveTo(s * .2, s * .05, s * .4, s * .2);
    g.quadraticCurveTo(s * .5, 0, s * .7, s * .15);
    g.quadraticCurveTo(s * .8, -s * .1, s, -s * .05);
    g.quadraticCurveTo(s * .8, -s * .35, s * .55, -s * .3);
    g.quadraticCurveTo(s * .25, -s * .45, 0, -s * .15);
    g.fill();
  },
  stars(g, s) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * .4 : s, a = -Math.PI / 2 + i * Math.PI / 5;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.fill();
  },
  sparkles(g, s) {
    g.beginPath();
    g.moveTo(0, -s);
    g.quadraticCurveTo(s * .12, -s * .12, s, 0);
    g.quadraticCurveTo(s * .12, s * .12, 0, s);
    g.quadraticCurveTo(-s * .12, s * .12, -s, 0);
    g.quadraticCurveTo(-s * .12, -s * .12, 0, -s);
    g.fill();
  },
  petals(g, s) { g.beginPath(); g.ellipse(0, 0, s * .45, s * .8, 0, 0, Math.PI * 2); g.fill(); },
  rain(g, s) { g.fillRect(-.6, -s, 1.2, s * 2); },
  snow(g, s) { g.beginPath(); g.arc(0, 0, s * .4, 0, Math.PI * 2); g.fill(); },
  bubbles(g, s) {
    g.beginPath(); g.arc(0, 0, s * .7, 0, Math.PI * 2);
    g.globalAlpha *= .9; g.lineWidth = 1.4; g.strokeStyle = g.fillStyle; g.stroke();
    g.beginPath(); g.arc(-s * .25, -s * .25, s * .15, 0, Math.PI * 2); g.fill();
  },
  confetti(g, s) { g.fillRect(-s * .5, -s * .25, s, s * .5); },
  leaves(g, s) {
    g.beginPath(); g.moveTo(0, -s);
    g.quadraticCurveTo(s * .8, -s * .2, 0, s); g.quadraticCurveTo(-s * .8, -s * .2, 0, -s); g.fill();
  },
  'music notes': glyph('♪'),
  moons(g, s) {
    g.beginPath(); g.arc(0, 0, s * .7, Math.PI * .35, Math.PI * 1.65); g.arc(s * .3, 0, s * .55, Math.PI * 1.45, Math.PI * .55, true); g.fill();
  },
  crosses(g, s) { g.fillRect(-s * .14, -s * .8, s * .28, s * 1.6); g.fillRect(-s * .55, -s * .4, s * 1.1, s * .28); },
  skulls: glyph('☠'),
  butterflies(g, s, b) {
    const f = .35 + Math.abs(Math.sin(b.ph * 5)) * .65;
    for (const d of [-1, 1]) {
      g.beginPath(); g.ellipse(d * s * .42 * f, -s * .2, s * .45 * f, s * .5, d * .5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(d * s * .3 * f, s * .35, s * .3 * f, s * .32, -d * .4, 0, Math.PI * 2); g.fill();
    }
  },
  picture(g, s, b, img) { if (img?.complete && img.naturalWidth) { const r = img.naturalHeight / img.naturalWidth; g.drawImage(img, -s, -s * r, s * 2, s * 2 * r); } },
};
DRAW.sticker = DRAW.picture;
// how each kind moves: count per 1000x1000px, size, fall speed (px/s), sideways sway, spin, see-through
const MOVE = {
  hearts: { n: 22, size: [7, 14], speed: [25, 55], sway: 30, spin: .6, alpha: [.35, .75] },
  bats: { n: 14, size: [10, 18], speed: [30, 60], sway: 60, spin: .2, alpha: [.45, .85], flap: true },
  stars: { n: 26, size: [5, 11], speed: [15, 40], sway: 20, spin: .8, alpha: [.35, .85] },
  sparkles: { n: 34, size: [4, 9], speed: [12, 30], sway: 15, spin: 0, alpha: [.3, .9], twinkle: true },
  petals: { n: 24, size: [7, 12], speed: [25, 55], sway: 70, spin: 1.6, alpha: [.5, .9] },
  rain: { n: 90, size: [9, 16], speed: [700, 1000], sway: 0, spin: 0, alpha: [.18, .4], straight: true },
  snow: { n: 60, size: [3, 8], speed: [25, 60], sway: 35, spin: 0, alpha: [.45, .9] },
  bubbles: { n: 22, size: [6, 16], speed: [20, 45], sway: 25, spin: 0, alpha: [.35, .7] },
  confetti: { n: 50, size: [5, 10], speed: [40, 90], sway: 40, spin: 3, alpha: [.7, 1], rainbow: true },
  leaves: { n: 20, size: [8, 14], speed: [25, 50], sway: 80, spin: 1.4, alpha: [.55, .9] },
  'music notes': { n: 18, size: [8, 14], speed: [20, 45], sway: 30, spin: .3, alpha: [.4, .85] },
  moons: { n: 14, size: [8, 14], speed: [15, 35], sway: 20, spin: .2, alpha: [.4, .85] },
  crosses: { n: 16, size: [8, 14], speed: [20, 45], sway: 20, spin: .3, alpha: [.4, .8] },
  skulls: { n: 14, size: [8, 13], speed: [20, 45], sway: 25, spin: .5, alpha: [.4, .85] },
  butterflies: { n: 12, size: [9, 15], speed: [15, 35], sway: 90, spin: .2, alpha: [.6, .95] },
  picture: { n: 14, size: [12, 24], speed: [25, 55], sway: 40, spin: .5, alpha: [.75, 1] },
  sticker: { n: 14, size: [12, 24], speed: [25, 55], sway: 40, spin: .5, alpha: [.8, 1] },
};
const RAINBOW = ['#ff4fa3', '#ffd84d', '#7df9d0', '#6ec6ff', '#b18cff', '#ff8a3d'];
const rand = ([a, b]) => a + Math.random() * (b - a);

// opts: { amount, speed, size } as percents, way: down | up | wind, img: an <img> for picture/sticker
export function setFall(el, kind, colors, opts = {}) {
  let cv = el.querySelector(':scope > canvas.look-fall');
  if (!DRAW[kind] || ((kind === 'picture' || kind === 'sticker') && !opts.src)) { cv?.remove(); return; }
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'look-fall';
    el.prepend(cv);
    startFall(cv);
  }
  const fx = cv.fx;
  fx.kind = kind;
  fx.colors = colors;
  fx.amount = (opts.amount ?? 100) / 100;
  fx.speed = (opts.speed ?? 100) / 100;
  fx.size = (opts.size ?? 100) / 100;
  fx.way = opts.way || 'down';
  if (opts.src && fx.img?.dataset.src !== opts.src) {
    fx.img = new Image();
    fx.img.dataset.src = opts.src;
    fx.img.src = opts.src;
  }
}

function startFall(cv) {
  const g = cv.getContext('2d');
  const fx = cv.fx = { kind: null, colors: [], bits: [], made: null };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, last = performance.now();
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const bit = start => {
    const m = MOVE[fx.kind];
    const up = fx.way === 'up';
    return {
      x: Math.random() * w, y: start ? (up ? h + 20 : -20) : Math.random() * h, s: rand(m.size) * fx.size, v: rand(m.speed), a: rand(m.alpha),
      r: Math.random() * 6.28, vr: (Math.random() - .5) * m.spin, ph: Math.random() * 6.28,
      c: m.rainbow ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : fx.colors[Math.floor(Math.random() * fx.colors.length)] || '#fff',
    };
  };
  const frame = now => {
    if (!cv.isConnected) { removeEventListener('resize', size); return; } // the page closed
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    const m = MOVE[fx.kind];
    const key = [fx.kind, fx.colors.join(), fx.amount, fx.size, fx.way].join('|');
    if (fx.made !== key) { // something changed: start over
      fx.made = key;
      fx.bits = Array.from({ length: Math.round((m.n * (w * h) / 1e6 + 6) * fx.amount) }, () => bit(false));
    }
    g.clearRect(0, 0, w, h);
    const dir = fx.way === 'up' ? -1 : 1, wind = fx.way === 'wind';
    for (const b of fx.bits) {
      if (!calm) {
        const v = b.v * fx.speed;
        b.y += v * dt * dir * (wind ? .55 : 1);
        if (wind) b.x += v * dt * .9;
        b.ph += dt * 1.4;
        b.x += Math.sin(b.ph) * m.sway * dt;
        b.r += b.vr * dt;
      }
      if (dir > 0 && b.y > h + 30) Object.assign(b, bit(true));
      if (dir < 0 && b.y < -30) Object.assign(b, bit(true));
      if (b.x < -40) b.x = w + 30; else if (b.x > w + 40) b.x = -30;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(m.straight ? (wind ? .5 : .12) : b.r);
      if (m.flap) g.scale(1, .55 + Math.abs(Math.sin(b.ph * 4)) * .45);
      g.globalAlpha = m.twinkle ? b.a * (.45 + .55 * Math.abs(Math.sin(b.ph * 2))) : b.a;
      g.fillStyle = b.c;
      DRAW[fx.kind](g, b.s, b, fx.img);
      g.restore();
    }
    requestAnimationFrame(frame);
  };
  size();
  addEventListener('resize', size);
  requestAnimationFrame(frame);
}

// ---- cursors: a little svg in the page's colors ----

const CURSOR_SHAPES = {
  heart: 'M14 25C6 19 2 14.5 2 9.5A5.8 5.8 0 0 1 14 7a5.8 5.8 0 0 1 12 2.5C26 14.5 22 19 14 25z',
  bat: 'M14 10c-1.4-2.6-3.6-3.4-6.6-2.4-1.8.6-3.4.3-5.4-.6.8 2.2.6 4-.6 5.6 2-.2 3.4.4 4.4 2 .8-1.4 2.2-1.8 3.8-1.2 1.6.6 3 2 4.4 4.4 1.4-2.4 2.8-3.8 4.4-4.4 1.6-.6 3-.2 3.8 1.2 1-1.6 2.4-2.2 4.4-2-1.2-1.6-1.4-3.4-.6-5.6-2 .9-3.6 1.2-5.4.6-3-1-5.2-.2-6.6 2.4z',
  star: 'M14 2l3.5 7.6 8.3.9-6.2 5.6 1.8 8.2L14 20.1 6.6 24.3l1.8-8.2-6.2-5.6 8.3-.9z',
  cross: 'M11.5 2h5v7.5H24v5h-7.5V26h-5V14.5H4v-5h7.5z',
  bow: 'M14 12.5c-3-4.5-7.5-7-10.5-5.5S1.5 15 4 18.5s7-2 10-4.5c3 2.5 7.5 8 10 4.5s2.5-10-.5-11.5S17 8 14 12.5zm-1.6 1.2-2.6 9h3l1.2-5 1.2 5h3l-2.6-9z',
  moon: 'M17.5 3A11 11 0 1 0 25 20.5 9 9 0 0 1 17.5 3z',
  skull: 'M14 2C7.9 2 3 6.6 3 12.4c0 3.4 1.7 6.3 4.3 8.2V25h3v-2.5h2.2V25h3v-2.5h2.2V25h3v-4.4c2.6-1.9 4.3-4.8 4.3-8.2C25 6.6 20.1 2 14 2zm-4.5 14a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6zm9 0a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6z',
  sparkle: 'M14 1c.9 7 3.6 11.4 12.5 13-8.9 1.6-11.6 6-12.5 13-.9-7-3.6-11.4-12.5-13C10.4 12.4 13.1 8 14 1z',
  cherry: 'M9 25a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm10.5-2a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM9.6 15.2 15 4.5l1.6.8-4.8 9.8zm9.4-1.4-2.7-8.6 1.7-.5 2.7 8.6zM15 4.5c3-2.5 7-2.6 10-1-2.6 2.6-6.2 3.2-10 1z',
};
export function cursorCss(kind, fill, edge) {
  const d = CURSOR_SHAPES[kind];
  if (!d) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 14 14, auto`;
}

// ---- cursor trail: little things that follow the mouse ----

const TRAIL = { sparkles: ['✦', '✧'], hearts: ['♥', '♡'], stars: ['★', '☆'], bubbles: ['○', '◦'], bats: ['⌒'] };
const accentOf = el => getComputedStyle(el).getPropertyValue('--accent').trim() || '#ff4fa3';
export function setTrail(el, kind) {
  el.trailKind = TRAIL[kind] ? kind : null;
  if (!el.trailKind || el.trailOn) return;
  el.trailOn = true;
  let lastAt = 0;
  el.addEventListener('pointermove', e => {
    if (!el.trailKind || e.pointerType === 'touch') return;
    const now = performance.now();
    if (now - lastAt < 35) return;
    lastAt = now;
    const chars = TRAIL[el.trailKind];
    spark(e.clientX + (Math.random() - .5) * 14, e.clientY + (Math.random() - .5) * 14, chars[Math.floor(Math.random() * chars.length)], accentOf(el), 8 + Math.random() * 9, 'look-spark');
  });
}
function spark(x, y, ch, color, size, cls, extra = {}) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = ch;
  Object.assign(s.style, { left: x + 'px', top: y + 'px', color, fontSize: size + 'px' }, extra);
  document.body.append(s);
  setTimeout(() => s.remove(), 1000);
}

// ---- click burst ----

const BURST = { hearts: ['♥'], stars: ['★', '✦'], sparkles: ['✦', '✧', '⋆'], confetti: ['▬', '■', '●'], bats: ['〰'] };
const BURST_COLORS = ['#ff4fa3', '#ffd84d', '#7df9d0', '#6ec6ff', '#b18cff'];
export function setBurst(el, kind) {
  el.burstKind = BURST[kind] ? kind : null;
  if (!el.burstKind || el.burstOn) return;
  el.burstOn = true;
  el.addEventListener('pointerdown', e => {
    if (!el.burstKind) return;
    const chars = BURST[el.burstKind], accent = accentOf(el);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * .4, d = 40 + Math.random() * 40;
      spark(e.clientX, e.clientY, chars[i % chars.length], el.burstKind === 'confetti' ? BURST_COLORS[i % 5] : accent, 10 + Math.random() * 10, 'look-burst',
        { '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px' });
    }
  });
}

// ---- layers: pattern + slideshow under the background effects, vignette + tint + spotlight over them ----

function layer(el, cls) {
  let d = el.querySelector(`:scope > .${cls}`);
  if (!d) { d = document.createElement('div'); d.className = cls; el.prepend(d); }
  return d;
}
export function setLayers(el, look, c) {
  const under = layer(el, 'look-under');
  layer(el, 'look-over');
  under.style.setProperty('--p1', look.patternColor || c.accent);
  under.style.setProperty('--p2', look.patternColor2 || 'transparent');
  setSlides(under, look.slides, look.slideSec);
}
// a few pictures that take turns. holder gets <img>s, one with .on at a time
async function setSlides(holder, list, sec) {
  const ids = (Array.isArray(list) ? list : []).map(p => p?.imageId).filter(Boolean);
  const key = ids.join(',');
  holder.slideSec = (typeof sec === 'number' ? sec : 6) * 1000;
  if (holder.slideKey === key) return;
  holder.slideKey = key;
  clearInterval(holder.slideTimer);
  holder.querySelectorAll(':scope > img.look-slide').forEach(i => i.remove());
  if (!ids.length) return;
  const { store } = await import('./store.js');
  const imgs = [];
  for (const id of ids) {
    const url = await store.imageURL(id);
    if (!url || holder.slideKey !== key) continue;
    const img = document.createElement('img');
    img.className = 'look-slide';
    img.alt = '';
    img.src = url;
    holder.append(img);
    imgs.push(img);
  }
  if (!imgs.length) return;
  let at = 0;
  imgs[0].classList.add('on');
  const tick = () => {
    if (!holder.isConnected || holder.slideKey !== key) return;
    imgs[at].classList.remove('on');
    at = (at + 1) % imgs.length;
    imgs[at].classList.add('on');
    holder.slideTimer = setTimeout(tick, holder.slideSec);
  };
  if (imgs.length > 1) holder.slideTimer = setTimeout(tick, holder.slideSec);
}
export function setBannerSlides(el, list, sec) {
  const banner = el.querySelector('.profile-banner');
  if (!banner) return;
  if (!banner.querySelector(':scope > .banner-fx')) { const fx = document.createElement('div'); fx.className = 'banner-fx'; banner.append(fx); }
  let holder = banner.querySelector(':scope > .banner-slides');
  if (!holder && Array.isArray(list) && list.length) { holder = document.createElement('div'); holder.className = 'banner-slides'; banner.prepend(holder); }
  if (holder) setSlides(holder, list, sec);
  banner.classList.toggle('has-slides', Array.isArray(list) && list.length > 0);
}

// ---- mouse follow + spotlight (both read the mouse) ----

export function setParallax(el, mode) {
  el.followMode = mode;
  if (el.followOn) return;
  el.followOn = true;
  el.addEventListener('pointermove', e => {
    const k = el.followMode === 'strong' ? 40 : el.followMode === 'gentle' ? 14 : 0;
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    el.style.setProperty('--mx', (-x * k).toFixed(1) + 'px');
    el.style.setProperty('--my', (-y * k).toFixed(1) + 'px');
    el.style.setProperty('--px', e.clientX + 'px');
    el.style.setProperty('--py', e.clientY + 'px');
  });
}

// ---- scroll bar on top + back to top button: they watch whatever box the page scrolls in ----

function scroller(el) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement;
}
function fixedBox(el) { return layer(el, 'look-fixed'); }
export function setScrollBar(el, on) {
  const box = fixedBox(el);
  let bar = box.querySelector('.look-progress');
  if (!on) { bar?.remove(); return; }
  if (bar) return;
  bar = document.createElement('div');
  bar.className = 'look-progress';
  box.append(bar);
  const update = () => {
    if (!bar.isConnected) { document.removeEventListener('scroll', update, true); return; }
    const s = scroller(el);
    const max = s.scrollHeight - s.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? s.scrollTop / max : 0})`;
  };
  document.addEventListener('scroll', update, true);
  requestAnimationFrame(update);
}
export function setBackTop(el, on) {
  const box = fixedBox(el);
  let btn = box.querySelector('.look-top-btn');
  if (!on) { btn?.remove(); return; }
  if (btn) return;
  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'look-top-btn';
  btn.title = 'back to top';
  btn.textContent = '↑';
  btn.onclick = () => scroller(el).scrollTo({ top: 0, behavior: 'smooth' });
  box.append(btn);
}
// page frame + corner decorations are just classes on .look-fixed's children (css draws them)
export function setFixedDeco(el, look) {
  const box = fixedBox(el);
  // the fixed bits start below the site's top bar (where the page's scroll box starts)
  requestAnimationFrame(() => { const s = scroller(el); el.style.setProperty('--view-top', (s === document.scrollingElement ? 0 : Math.max(0, s.getBoundingClientRect().top)) + 'px'); });
  for (const cls of ['look-frame', 'look-corners']) {
    if (!box.querySelector(':scope > .' + cls)) {
      const d = document.createElement('div');
      d.className = cls;
      if (cls === 'look-corners') d.innerHTML = '<i></i><i></i><i></i><i></i>';
      box.prepend(d);
    }
  }
}

// ---- intro screen: once each time you open the page ----

let introShownFor = '';
addEventListener('hashchange', () => { if (introShownFor && !location.hash.startsWith(introShownFor)) introShownFor = ''; });
export function setIntro(el, kind, text) {
  if (!kind || kind === 'none') return;
  const key = location.hash.split('/').slice(0, 3).join('/') || '#/';
  if (introShownFor === key || el.introDone) return;
  introShownFor = key;
  el.introDone = true;
  if (document.querySelector('.look-intro')) return;
  const words = (text && text.trim()) || (document.title.split(' · ')[0]) || 'hi';
  const wrap = document.createElement('div');
  wrap.className = 'look-intro intro-' + kind.replace(/\W/g, '');
  wrap.style.setProperty('--accent', accentOf(el));
  const bg = getComputedStyle(el).getPropertyValue('--page-bg-color').trim();
  if (bg) wrap.style.setProperty('--intro-bg', bg);
  const ink = getComputedStyle(el).getPropertyValue('--ink').trim();
  if (ink) wrap.style.setProperty('--intro-ink', ink);
  const font = getComputedStyle(el).getPropertyValue('--font-display').trim();
  if (font) wrap.style.setProperty('--intro-font', font);
  wrap.innerHTML = '<div class="intro-half l"></div><div class="intro-half r"></div><div class="intro-inner"><div class="intro-words"></div></div>';
  wrap.querySelector('.intro-words').textContent = words;
  const close = () => { wrap.classList.add('leaving'); setTimeout(() => wrap.remove(), 900); };
  if (kind === 'fade in') setTimeout(close, 1400);
  else {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'intro-enter';
    btn.textContent = 'enter';
    btn.onclick = close;
    wrap.querySelector('.intro-inner').append(btn);
    wrap.onclick = e => { if (e.target === wrap || e.target.classList.contains('intro-half')) close(); };
  }
  document.body.append(wrap);
}

// ---- blinkies + stamps on an oc page (page.blinkies = [{ id, text, style, bg, ink, anim }]) ----

export function setBlinkies(el, list) {
  const spot = el.querySelector('.profile-id-text');
  if (!spot) return;
  let row = spot.querySelector(':scope > .blinkie-row');
  const items = Array.isArray(list) ? list.filter(b => b && b.text) : [];
  if (!items.length) { row?.remove(); return; }
  if (!row) { row = document.createElement('div'); row.className = 'blinkie-row'; spot.append(row); }
  row.replaceChildren(...items.map(blinkieNode));
}
export function blinkieNode(b) {
  const s = document.createElement('span');
  s.className = `blinkie b-${b.style || 'blinkie'} anim-${(b.anim || 'blink').replace(/\W/g, '')}`;
  s.style.setProperty('--b-bg', b.bg || '#ff4fa3');
  s.style.setProperty('--b-ink', b.ink || '#ffffff');
  s.dataset.text = b.text;
  s.textContent = b.text;
  return s;
}

// ---- the browser tab icon ----

const DEFAULT_ICON = document.querySelector('link[rel="icon"]')?.getAttribute('href') || '';
export function setFavicon(url) {
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.setAttribute('href', url || DEFAULT_ICON);
}
