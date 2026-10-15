// the big moments: ripping a page out, burning a page, and peeling a sticker off the sheet.
// rip + burn get a page-sized holder (already sitting where the page was) and fresh pictures of the page.

import { h } from '../ui.js';
import { sound } from './sound.js';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// ============ ripping ============

// a jagged line from top to bottom, x in page pixels
function tearLine(x0, H) {
  const pts = [];
  for (let y = 0; y <= H; y += rand(10, 22)) pts.push([x0 + rand(-7, 7), Math.min(y, H)]);
  pts.push([x0 + rand(-5, 5), H]);
  return pts;
}

const poly = pts => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;

// side = which page of the spread it was ('left' has the binding on its right edge)
export async function ripPage(holder, make, { W, H, side }) {
  const spineLeft = side !== 'left';
  const x0 = spineLeft ? 30 : W - 30;
  const line = tearLine(x0, H);
  const away = dx => line.map(([x, y]) => [x + dx, y]);
  const mainShape = spineLeft ? [...line, [W + 2, H + 2], [W + 2, -2]] : [...line, [-2, H + 2], [-2, -2]];
  const stubShape = spineLeft ? [...line, [-2, H + 2], [-2, -2]] : [...line, [W + 2, H + 2], [W + 2, -2]];
  const fiberMain = spineLeft ? [...away(-3), [W, H], [W, 0]] : [...away(3), [0, H], [0, 0]];
  const fiberStub = spineLeft ? [...away(3), [0, H], [0, 0]] : [...away(-3), [W, H], [W, 0]];

  const piece = (shape, fiber) => {
    const pic = make();
    pic.style.clipPath = poly(shape);
    return h('div', { class: 'rip-piece' }, h('div', { class: 'rip-fiber', style: { clipPath: poly(fiber) } }), pic);
  };
  const main = piece(mainShape, fiberMain);
  const stub = piece(stubShape, fiberStub);
  main.style.transformOrigin = spineLeft ? `${x0}px ${H}px` : `${x0}px ${H}px`;
  holder.append(stub, main);
  sound.rip(.6);
  if (calm()) { await wait(200); return; }

  // little bits of paper
  for (let i = 0; i < 9; i++) {
    const [bx, by] = line[Math.floor(Math.random() * line.length)];
    const bit = h('i', { class: 'rip-bit', style: { left: bx + 'px', top: by + 'px', width: rand(4, 9) + 'px', height: rand(3, 7) + 'px' } });
    holder.append(bit);
    bit.animate([
      { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
      { transform: `translate(${rand(-40, 40)}px, ${rand(120, 260)}px) rotate(${rand(-400, 400)}deg)`, opacity: 0 },
    ], { duration: rand(700, 1100), delay: rand(80, 500), easing: 'cubic-bezier(.3, 0, .8, 1)', fill: 'both' });
  }
  const dir = spineLeft ? 1 : -1;
  const a = main.animate([
    { transform: 'none', filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))', offset: 0 },
    { transform: `translate(${dir * 4}px, -2px) rotate(${dir * 1.5}deg)`, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.25))', offset: .2 },
    { transform: `translate(${dir * 12}px, -10px) rotate(${dir * 5}deg)`, filter: 'drop-shadow(0 14px 16px rgba(0,0,0,.35))', offset: .42 },
    { transform: `translate(${dir * 70}px, ${H * .25}px) rotate(${dir * 14}deg)`, opacity: 1, offset: .7 },
    { transform: `translate(${dir * 130}px, ${H * 1.25}px) rotate(${dir * 28}deg)`, opacity: 0, filter: 'drop-shadow(0 20px 20px rgba(0,0,0,.3))', offset: 1 },
  ], { duration: 1500, easing: 'cubic-bezier(.4, 0, .7, 1)', fill: 'both' });
  stub.animate([{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: 1500, fill: 'both' });
  await a.finished.catch(() => {});
}

// ============ burning ============

// smooth value noise, 0..1
function noiseField(w, hh, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(hh / cell) + 2;
  const g = Float32Array.from({ length: gw * gh }, () => Math.random());
  return (x, y) => {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const at = (i, j) => g[(j * gw + i) % g.length];
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
    const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export async function burnPage(holder, pic, { W, H }) {
  const R = 2; // field pixels are 2x2 page pixels
  const w = Math.ceil(W / R), hh = Math.ceil(H / R);
  const n1 = noiseField(w, hh, 22), n2 = noiseField(w, hh, 7), n3 = noiseField(w, hh, 2.5);
  // where it catches: a bottom corner, plus a second spot
  const origins = [[Math.random() < .5 ? 0 : w, hh], [rand(.2, .8) * w, hh * rand(.55, 1)]];
  const t = new Float32Array(w * hh);
  let lo = Infinity, hi = -Infinity;
  const diag = Math.hypot(w, hh);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    let d = Infinity;
    for (const [ox, oy] of origins) d = Math.min(d, Math.hypot(x - ox, (y - oy) * 1.15));
    const v = d / diag + (n1(x, y) - .5) * .28 + (n2(x, y) - .5) * .09 + (n3(x, y) - .5) * .014;
    t[y * w + x] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const mask = h('canvas', { width: w, height: hh });
  const soot = h('canvas', { class: 'burn-soot', width: w, height: hh });
  const fire = h('canvas', { class: 'burn-fire', width: w, height: hh });
  const glow = h('canvas', { class: 'burn-glow', width: w, height: hh });
  holder.append(soot, pic, fire, glow);
  const mx = mask.getContext('2d'), sx = soot.getContext('2d'), fx = fire.getContext('2d'), gx = glow.getContext('2d');
  const mImg = mx.createImageData(w, hh), sImg = sx.createImageData(w, hh), fImg = fx.createImageData(w, hh), gImg = gx.createImageData(w, hh);
  const ramp = (v, a, b) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  sound.burn(calm() ? .6 : 2.6);
  const dur = calm() ? 400 : 2600;
  const start = performance.now();
  let lastSmoke = 0;

  // painting one color over another (the 'over' blend), into a r g b
  let a = 0, r = 0, g = 0, b = 0;
  const blend = (lr, lg, lb, la) => {
    const na = la + a * (1 - la);
    if (na <= 0) return;
    r = (lr * la + r * a * (1 - la)) / na;
    g = (lg * la + g * a * (1 - la)) / na;
    b = (lb * la + b * a * (1 - la)) / na;
    a = na;
  };

  const frame = now => {
    const k = Math.min(1, (now - start) / dur);
    const e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const p = lo - .02 + e * (hi - lo + .22);
    const M = mImg.data, S = sImg.data, F = fImg.data, G = gImg.data;
    const edge = [];
    for (let i = 0; i < t.length; i++) {
      const d = t[i] - p, j = i * 4;
      // the page itself: gone where it burned (a soft edge, so it isn't blocky)
      M[j + 3] = 255 * ramp(d, -.003, .004);
      // soot left on the page underneath, right around the hole
      S[j] = 28; S[j + 1] = 16; S[j + 2] = 10; S[j + 3] = d < 0 ? 170 * (1 - ramp(-d, 0, .09)) : 0;
      // black char, brown scorch, a faint tan halo on what's left
      a = r = g = b = 0;
      if (d > -.004) {
        // tan halo, then brown scorch over it, then black char right at the edge (blended, so it's smooth)
        blend(150, 92, 34, (1 - ramp(d, .07, .17)) * .32);
        blend(74, 34, 12, (1 - ramp(d, .025, .075)) * .88);
        blend(18, 9, 5, 1 - ramp(d, .004, .026));
      }
      F[j] = r; F[j + 1] = g; F[j + 2] = b; F[j + 3] = a * 255;
      // the glowing line where it's burning
      const ga = 1 - ramp(Math.abs(d - .002), 0, .011);
      G[j] = 255; G[j + 1] = 60 + ga * 70; G[j + 2] = 10 + ga * 10; G[j + 3] = ga * 255;
      if (ga > .85 && Math.random() < .02) edge.push(i);
    }
    sx.putImageData(sImg, 0, 0);
    mx.putImageData(mImg, 0, 0);
    fx.putImageData(fImg, 0, 0);
    gx.putImageData(gImg, 0, 0);
    const url = mask.toDataURL();
    pic.style.webkitMaskImage = pic.style.maskImage = `url(${url})`;
    if (!calm()) {
      for (let s = 0; s < 3 && edge.length; s++) {
        const i = edge[Math.floor(Math.random() * edge.length)];
        ember(holder, (i % w) * R, Math.floor(i / w) * R);
      }
      if (now - lastSmoke > 110 && edge.length) {
        lastSmoke = now;
        const i = edge[Math.floor(Math.random() * edge.length)];
        smoke(holder, (i % w) * R, Math.floor(i / w) * R);
      }
    }
    if (k < 1) requestAnimationFrame(frame);
    else done();
  };
  let done;
  const finished = new Promise(r => { done = r; });
  requestAnimationFrame(frame);
  await finished;
  holder.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'both' });
  await wait(calm() ? 0 : 700);
}

function ember(holder, x, y) {
  const s = rand(2, 4.5);
  const el = h('i', { class: 'burn-ember', style: { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px' } });
  holder.append(el);
  el.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${rand(-30, 30)}px, ${rand(-150, -60)}px) scale(.3)`, opacity: 0 },
  ], { duration: rand(700, 1300), easing: 'ease-out', fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
}

function smoke(holder, x, y) {
  const s = rand(40, 90);
  const el = h('i', { class: 'burn-smoke', style: { left: x - s / 2 + 'px', top: y - s / 2 + 'px', width: s + 'px', height: s + 'px' } });
  holder.append(el);
  el.animate([
    { transform: 'translate(0, 0) scale(.5)', opacity: 0 },
    { opacity: .32, offset: .2 },
    { transform: `translate(${rand(-40, 40)}px, ${rand(-220, -140)}px) scale(2.2)`, opacity: 0 },
  ], { duration: rand(1500, 2200), easing: 'ease-out', fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
}

// ============ peeling a sticker off the sheet ============

// from = the sticker in the drawer, to = the new item on the page (already placed). under 400ms.
export function peel(from, to) {
  if (!from || !to || calm()) return;
  const src = from.querySelector('.stk') || from.firstElementChild;
  if (!src) return;
  const fr = src.getBoundingClientRect(), tr = to.getBoundingClientRect();
  if (!tr.width || !fr.width) return;
  const layer = to.parentElement;
  const pageScale = layer.getBoundingClientRect().width / (layer.offsetWidth || 1);
  const item = { k: parseFloat(to.style.getPropertyValue('--k')) || 1, r: parseFloat((to.style.transform.match(/rotate\(([-\d.]+)deg\)/) || [])[1]) || 0 };
  const clone = src.cloneNode(true);
  clone.style.transform = 'none';
  const fly = h('div', { class: 'peel-fly' }, clone, h('i', { class: 'peel-curl' }));
  document.body.append(fly);
  const nw = fly.offsetWidth || 1, nh = fly.offsetHeight || 1;
  const s0 = Math.min(fr.width / nw, fr.height / nh);
  const s1 = pageScale * item.k;
  const fx = fr.left + fr.width / 2 - nw / 2, fy = fr.top + fr.height / 2 - nh / 2;
  const tx = tr.left + tr.width / 2 - nw / 2, ty = tr.top + tr.height / 2 - nh / 2;
  to.classList.add('landing');
  from.classList.add('peeled');
  sound.peel();
  const midx = (fx + tx) / 2, midy = Math.min(fy, ty) - 60;
  const a = fly.animate([
    { transform: `translate(${fx}px, ${fy}px) scale(${s0}) rotateX(0) rotateY(0)`, offset: 0 },
    { transform: `translate(${fx}px, ${fy - 10}px) scale(${s0 * 1.12}) rotateX(26deg) rotateY(-24deg) rotate(-6deg)`, offset: .28 },
    { transform: `translate(${midx}px, ${midy}px) scale(${(s0 + s1) / 2 * 1.15}) rotateX(10deg) rotateY(-8deg) rotate(${item.r / 2}deg)`, offset: .62 },
    { transform: `translate(${tx}px, ${ty}px) scale(${s1}) rotate(${item.r}deg)`, offset: 1 },
  ], { duration: 260, easing: 'cubic-bezier(.3, .2, .3, 1)', fill: 'both' });
  const end = () => {
    fly.remove();
    from.classList.remove('peeled');
    to.classList.remove('landing');
    to.animate([{ scale: 1.14 }, { scale: 1 }], { duration: 120, easing: 'ease-out' });
  };
  a.finished.then(end, end);
}
