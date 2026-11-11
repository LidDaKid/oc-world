// the moving bits of a look: things falling behind the boxes, custom cursors, the cursor sparkle trail.
// look.js paint() calls these every time a look changes, so they all reuse what's already on the page.

// ---- falling stuff: one canvas per page, fixed behind the boxes ----

const DRAW = {
  hearts(g, s) {
    g.beginPath();
    g.moveTo(0, s * .35);
    g.bezierCurveTo(-s * .9, -s * .25, -s * .45, -s * .95, 0, -s * .4);
    g.bezierCurveTo(s * .45, -s * .95, s * .9, -s * .25, 0, s * .35);
    g.fill();
  },
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
  petals(g, s) {
    g.beginPath();
    g.ellipse(0, 0, s * .45, s * .8, 0, 0, Math.PI * 2);
    g.fill();
  },
  rain(g, s) {
    g.fillRect(-.6, -s, 1.2, s * 2);
  },
  snow(g, s) {
    g.beginPath();
    g.arc(0, 0, s * .4, 0, Math.PI * 2);
    g.fill();
  },
};
// how each kind moves: count per 1000x1000px, size, fall speed (px/s), sideways sway, spin, see-through
const MOVE = {
  hearts: { n: 22, size: [7, 14], speed: [25, 55], sway: 30, spin: .6, alpha: [.35, .75] },
  bats: { n: 14, size: [10, 18], speed: [30, 60], sway: 60, spin: .2, alpha: [.45, .85], flap: true },
  stars: { n: 26, size: [5, 11], speed: [15, 40], sway: 20, spin: .8, alpha: [.35, .85] },
  sparkles: { n: 34, size: [4, 9], speed: [12, 30], sway: 15, spin: 0, alpha: [.3, .9], twinkle: true },
  petals: { n: 24, size: [7, 12], speed: [25, 55], sway: 70, spin: 1.6, alpha: [.5, .9] },
  rain: { n: 90, size: [9, 16], speed: [700, 1000], sway: 0, spin: 0, alpha: [.18, .4] },
  snow: { n: 60, size: [3, 8], speed: [25, 60], sway: 35, spin: 0, alpha: [.45, .9] },
};
const rand = ([a, b]) => a + Math.random() * (b - a);

export function setFall(el, kind, colors) {
  let cv = el.querySelector(':scope > canvas.look-fall');
  if (!DRAW[kind]) { cv?.remove(); return; }
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'look-fall';
    el.prepend(cv);
    startFall(cv);
  }
  cv.fx.kind = kind;
  cv.fx.colors = colors;
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
  const bit = (top) => {
    const m = MOVE[fx.kind];
    return {
      x: Math.random() * w, y: top ? -20 : Math.random() * h, s: rand(m.size), v: rand(m.speed), a: rand(m.alpha),
      r: Math.random() * 6.28, vr: (Math.random() - .5) * m.spin, ph: Math.random() * 6.28,
      c: fx.colors[Math.floor(Math.random() * fx.colors.length)] || '#fff',
    };
  };
  const frame = now => {
    if (!cv.isConnected) { removeEventListener('resize', size); return; } // the page closed
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    const m = MOVE[fx.kind];
    if (fx.made !== fx.kind + fx.colors.join()) { // a different kind or new colors: start over
      fx.made = fx.kind + fx.colors.join();
      fx.bits = Array.from({ length: Math.round(m.n * (w * h) / 1e6) + 6 }, () => bit(false));
    }
    g.clearRect(0, 0, w, h);
    for (const b of fx.bits) {
      if (!calm) {
        b.y += b.v * dt;
        b.ph += dt * 1.4;
        b.x += Math.sin(b.ph) * m.sway * dt;
        b.r += b.vr * dt;
      }
      if (b.y > h + 24) Object.assign(b, bit(true));
      if (b.x < -30) b.x = w + 20; else if (b.x > w + 30) b.x = -20;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(fx.kind === 'rain' ? .12 : b.r);
      if (m.flap) g.scale(1, .55 + Math.abs(Math.sin(b.ph * 4)) * .45);
      g.globalAlpha = m.twinkle ? b.a * (.45 + .55 * Math.abs(Math.sin(b.ph * 2))) : b.a;
      g.fillStyle = b.c;
      DRAW[fx.kind](g, b.s);
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
};
export function cursorCss(kind, fill, edge) {
  const d = CURSOR_SHAPES[kind];
  if (!d) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="${d}" fill="${fill}" stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 14 14, auto`;
}

// ---- cursor trail: little sparkles that follow the mouse ----

export function setTrail(el, on) {
  if (!on || el.trailOn) return;
  el.trailOn = true;
  let lastAt = 0;
  el.addEventListener('pointermove', e => {
    if (!el.classList.contains('cursorTrail-sparkles') || e.pointerType === 'touch') return;
    const now = performance.now();
    if (now - lastAt < 35) return;
    lastAt = now;
    const s = document.createElement('span');
    s.className = 'look-spark';
    s.textContent = Math.random() < .5 ? '✦' : '✧';
    s.style.left = e.clientX + (Math.random() - .5) * 14 + 'px';
    s.style.top = e.clientY + (Math.random() - .5) * 14 + 'px';
    s.style.color = getComputedStyle(el).getPropertyValue('--accent').trim() || '#ff4fa3';
    s.style.fontSize = 8 + Math.random() * 9 + 'px';
    document.body.append(s);
    setTimeout(() => s.remove(), 800);
  });
}
