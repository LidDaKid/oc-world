// draws the front of a trading card onto a canvas so it can be saved as a png

import { store } from '../store.js';
import { nameOf } from './kit.js';
import { basic } from './card-holo.js';
import { typeOf, frameOf, rarityOf } from './card-data.js';

const W = 750, H = 1050, U = W / 100; // U = 1 "cqw"

function loadImg(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function wrap(g, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (last && g.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function fit(g, text, maxW) {
  let t = String(text || '');
  if (g.measureText(t).width <= maxW) return t;
  while (t && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function rainbow(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  ['#ff7aa8', '#ffd452', '#7ef08a', '#5fe0ff', '#9d8cff', '#ff7ae0', '#ff7aa8'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
  return gr;
}

function sparkles(g, x, y, w, h, n, seed = 7) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h, size = 2 + r() * 5;
    g.fillStyle = ['#fff', '#ffe2f4', '#d6fff8', '#fff6c4'][i % 4];
    g.globalAlpha = 0.5 + r() * 0.5;
    g.beginPath();
    g.moveTo(px, py - size * 2); g.lineTo(px + size * 0.5, py - size * 0.5); g.lineTo(px + size * 2, py);
    g.lineTo(px + size * 0.5, py + size * 0.5); g.lineTo(px, py + size * 2); g.lineTo(px - size * 0.5, py + size * 0.5);
    g.lineTo(px - size * 2, py); g.lineTo(px - size * 0.5, py - size * 0.5); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
}

export async function cardPNG(card, char) {
  const f = frameOf(card.frame), t = typeOf(card.type), rar = card.rarity;
  const gold = rar === 'secret';
  const b = gold ? ['#fff1b0', '#d6a21d', '#fff6cf'] : f.b;
  const font = `'${f.font}'`;
  await Promise.all([
    document.fonts.load(`700 60px ${font}`), document.fonts.load('900 30px Nunito'), document.fonts.load('italic 600 20px "Playfair Display"'),
  ]).catch(() => {});

  const imageId = card.art.from === 'upload' ? card.art.imageId : card.art.from === 'gallery' ? (char.gallery.find(g => g.id === card.art.galleryId)?.imageId || char.imageId) : char.imageId;
  const stk = code => loadImg(`stickers/${code}.webp`);
  const [art, typeIcon, weakIcon, resistIcon] = await Promise.all([
    store.imageURL(imageId).then(loadImg), stk(t.icon), stk(typeOf(card.weak).icon), stk(typeOf(card.resist).icon),
  ]);

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  // border
  rr(g, 0, 0, W, H, 4.6 * U); g.save(); g.clip();
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, b[0]); bg.addColorStop(0.48, b[1]); bg.addColorStop(1, b[2]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (f.id === 'scene' && !gold) {
    const sq = 3.4 * U / 2;
    for (let y = 0; y < H; y += sq) for (let x = 0; x < W; x += sq) { g.fillStyle = ((x + y) / sq) % 2 ? '#ff2fa0' : '#121012'; g.fillRect(x, y, sq, sq); }
  }
  if (f.id === 'candy' && !gold) {
    g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI / 4); g.fillStyle = '#fff4fa';
    for (let x = -H; x < H; x += 6 * U) g.fillRect(x, -H, 3 * U, H * 2);
    g.restore();
  }

  // inside
  const P = 3.3 * U, ix = P, iy = P, iw = W - 2 * P, ih = H - 2 * P;
  rr(g, ix, iy, iw, ih, 2.4 * U);
  const pg = g.createLinearGradient(0, iy, 0, iy + ih);
  pg.addColorStop(0, f.p[0]); pg.addColorStop(1, f.tint ? mix(f.p[1], t.color, 0.34) : f.p[1]);
  g.fillStyle = pg; g.fill();
  g.strokeStyle = f.id === 'scene' ? '#ff2fa0' : 'rgba(0,0,0,.14)'; g.lineWidth = 0.6 * U; g.stroke();
  if (rar === 'reverse' || rar === 'ultra' || gold) {
    g.save(); rr(g, ix, iy, iw, ih, 2.4 * U); g.clip();
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.45;
    g.fillStyle = rainbow(g, ix, iy, ix + iw, iy + ih); g.fillRect(ix, iy, iw, ih);
    g.restore();
  }

  const L = ix + 2.6 * U, R = ix + iw - 2.6 * U;
  let y = iy + 2.4 * U;
  g.fillStyle = f.ink; g.textBaseline = 'middle';

  // top row
  const rowH = 9 * U, cy = y + rowH / 2;
  g.font = `900 ${2.5 * U}px Nunito`;
  const stage = (card.stage || 'basic').toUpperCase();
  const sw = g.measureText(stage).width + 3.2 * U;
  rr(g, L, cy - 2.2 * U, sw, 4.4 * U, 2.2 * U); g.fillStyle = 'rgba(0,0,0,.18)'; g.fill();
  g.fillStyle = f.ink; g.fillText(stage, L + 1.6 * U, cy);
  if (typeIcon) g.drawImage(typeIcon, R - 8.6 * U, cy - 4.3 * U, 8.6 * U, 8.6 * U);
  g.font = `900 ${6.4 * U}px Nunito`; g.textAlign = 'right';
  const hpW = g.measureText(String(card.hp)).width;
  g.fillText(String(card.hp), R - 10.2 * U, cy + 0.3 * U);
  g.font = `900 ${2.6 * U}px Nunito`;
  g.fillText('HP', R - 10.6 * U - hpW, cy + 0.6 * U);
  g.textAlign = 'left';
  const name = card.name || nameOf(char);
  g.font = `700 ${(name.length > 14 ? 5.4 : 7) * U}px ${font}, Fredoka`;
  g.fillStyle = f.id === 'scene' ? '#ff7fc8' : f.id === 'monster' ? '#ff3aa5' : f.ink;
  g.fillText(fit(g, name, R - 14 * U - hpW - (L + sw + 1.6 * U)), L + sw + 1.6 * U, cy + 0.4 * U);
  y += rowH + 1.5 * U;

  // art
  const ax = L, aw = R - L, ah = aw / 1.5, ay = y;
  rr(g, ax, ay, aw, ah, 1.2 * U); g.fillStyle = f.edge; g.fill();
  const bw = 1.3 * U;
  g.save(); rr(g, ax + bw, ay + bw, aw - 2 * bw, ah - 2 * bw, 0.6 * U); g.clip();
  const ag = g.createLinearGradient(ax, ay, ax + aw, ay + ah); ag.addColorStop(0, mix(char.color || '#ff4fa3', '#ffffff', 0.3)); ag.addColorStop(1, mix(t.color, '#111111', 0.4));
  g.fillStyle = ag; g.fillRect(ax, ay, aw, ah);
  if (art) {
    const bx = ax + bw, by = ay + bw, bW = aw - 2 * bw, bH = ah - 2 * bw;
    const z = card.art.zoom || 1, s = Math.max(bW / art.width, bH / art.height);
    const dw = art.width * s, dh = art.height * s;
    const px = (card.art.x ?? 50) / 100, py = (card.art.y ?? 35) / 100;
    let dx = bx + (bW - dw) * px, dy = by + (bH - dh) * py;
    const ox = bx + bW * px, oy = by + bH * py;
    g.translate(ox, oy); g.scale(z, z); g.translate(-ox, -oy);
    g.drawImage(art, dx, dy, dw, dh);
    g.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `700 ${26 * U}px ${font}, Fredoka`; g.textAlign = 'center';
    g.fillText((nameOf(char)[0] || '?').toUpperCase(), ax + aw / 2, ay + ah / 2); g.textAlign = 'left';
  }
  if (['rare', 'holo', 'secret', 'ultra'].includes(rar)) {
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.5;
    g.fillStyle = rainbow(g, ax, ay + ah, ax + aw, ay); g.fillRect(ax, ay, aw, ah);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (rar !== 'rare') sparkles(g, ax, ay, aw, ah, 26);
  }
  g.restore();
  y += ah + 1.1 * U;

  // strip
  g.fillStyle = f.ink;
  g.font = `italic 800 ${2.5 * U}px Nunito`; g.textAlign = 'center';
  const strip = [`no. ${String(card.num).padStart(3, '0')}`, basic(char, 'species'), basic(char, 'height') && `ht ${basic(char, 'height')}`, basic(char, 'age') && `age ${basic(char, 'age')}`].filter(Boolean).join('  ·  ');
  g.fillText(fit(g, strip, aw - 8 * U), W / 2, y + 1.6 * U); g.textAlign = 'left';
  y += 4.6 * U;

  // bottom stuff first, so the moves fill what's left
  const footY = iy + ih - 1.8 * U - 1.4 * U;
  let bottom = footY - 3 * U;
  const flavorH = card.flavor ? 9 * U : 0;
  const wrrH = 6 * U;
  const flavorY = bottom - flavorH;
  const wrrY = flavorY - (flavorH ? 1.5 * U : 0) - wrrH;

  // moves
  const moves = card.moves.slice(0, 3);
  const movesTop = y, movesBot = wrrY - 1.5 * U;
  const each = moves.length ? Math.min(22 * U, (movesBot - movesTop - (moves.length - 1) * 1.3 * U) / moves.length) : 0;
  let my = movesTop + Math.max(0, (movesBot - movesTop - each * moves.length - (moves.length - 1) * 1.3 * U) / 2);
  for (const m of moves) {
    rr(g, L, my, aw, each, 1.6 * U); g.fillStyle = f.box; g.fill();
    const top = my + 3.6 * U;
    let cx = L + 1.8 * U;
    for (let i = 0; i < Math.min(4, m.cost | 0); i++) {
      g.beginPath(); g.arc(cx + 2.3 * U, top, 2.3 * U, 0, Math.PI * 2);
      const cg = g.createRadialGradient(cx + 1.6 * U, top - 0.8 * U, 0, cx + 2.3 * U, top, 2.3 * U); cg.addColorStop(0, '#fff'); cg.addColorStop(1, mix(t.color, '#ffffff', 0.45));
      g.fillStyle = cg; g.fill();
      if (typeIcon) g.drawImage(typeIcon, cx + 0.6 * U, top - 1.7 * U, 3.4 * U, 3.4 * U);
      cx += 4.9 * U;
    }
    cx = Math.max(cx, L + 6.8 * U) + 0.6 * U;
    g.fillStyle = f.ink; g.font = `900 ${5.2 * U}px Nunito`; g.textAlign = 'right';
    const dW = g.measureText(m.dmg || '').width;
    g.fillText(m.dmg || '', R - 1.8 * U, top); g.textAlign = 'left';
    g.font = `900 ${4.4 * U}px Nunito`;
    g.fillText(fit(g, m.name, R - 3 * U - dW - cx), cx, top);
    if (m.text) {
      g.font = `600 ${2.9 * U}px Nunito`; g.globalAlpha = 0.88;
      const lines = wrap(g, m.text, aw - 3.6 * U, Math.max(1, Math.floor((each - 7 * U) / (3.8 * U))));
      lines.forEach((ln, i) => g.fillText(ln, L + 1.8 * U, top + 4.6 * U + i * 3.8 * U));
      g.globalAlpha = 1;
    }
    my += each + 1.3 * U;
  }

  // weakness / resistance / retreat
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(L, wrrY, aw, 0.35 * U); g.fillRect(L, wrrY + wrrH, aw, 0.35 * U);
  g.fillStyle = f.ink;
  const wy = wrrY + wrrH / 2;
  const cell = (x, label, icon, after) => {
    g.font = `700 ${2.1 * U}px Nunito`; g.globalAlpha = 0.7; g.fillText(label, x, wy); g.globalAlpha = 1;
    let px = x + g.measureText(label).width + 0.8 * U;
    if (icon) { g.drawImage(icon, px, wy - 1.8 * U, 3.6 * U, 3.6 * U); px += 4.2 * U; }
    g.font = `900 ${2.7 * U}px Nunito`; g.fillText(after, px, wy);
  };
  cell(L + 0.4 * U, 'weakness', weakIcon, '×2');
  cell(L + aw * 0.36, 'resistance', resistIcon, '−30');
  g.font = `700 ${2.1 * U}px Nunito`; g.globalAlpha = 0.7;
  const rx = L + aw * 0.73; g.fillText('retreat', rx, wy); g.globalAlpha = 1;
  for (let i = 0; i < (card.retreat | 0); i++) { g.beginPath(); g.arc(rx + 9.5 * U + i * 3.8 * U, wy, 1.5 * U, 0, Math.PI * 2); g.fillStyle = '#d6d6d6'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.stroke(); }

  // flavor
  if (card.flavor) {
    rr(g, L, flavorY, aw, flavorH, 1.2 * U); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.35 * U; g.stroke();
    g.fillStyle = f.ink; g.font = `italic 600 ${2.75 * U}px "Playfair Display", serif`;
    wrap(g, card.flavor, aw - 4 * U, 2).forEach((ln, i) => g.fillText(ln, L + 2 * U, flavorY + 2.9 * U + i * 3.6 * U));
  }

  // foot
  g.fillStyle = f.ink; g.globalAlpha = 0.85; g.font = `800 ${2.5 * U}px Nunito`;
  rr(g, L, footY - 1.8 * U, 3.6 * U, 3.6 * U, 0.8 * U); g.fill();
  g.fillStyle = f.p[0]; g.textAlign = 'center'; g.fillText('✦', L + 1.8 * U, footY + 0.1 * U);
  g.fillStyle = f.ink; g.textAlign = 'left'; g.fillText(fit(g, card.set, aw * 0.5), L + 4.6 * U, footY);
  g.textAlign = 'center'; g.fillText(`${String(card.num).padStart(3, '0')}/${String(card.of).padStart(3, '0')}`, L + aw * 0.68, footY);
  g.textAlign = 'right'; g.font = `800 ${3 * U}px Nunito`; g.fillText(rarityOf(rar).sym, R, footY);
  g.globalAlpha = 1; g.textAlign = 'left';

  // a little shine across the whole thing
  const sh = g.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0.2, 'rgba(255,255,255,0)'); sh.addColorStop(0.42, 'rgba(255,255,255,.22)'); sh.addColorStop(0.5, 'rgba(255,255,255,.05)'); sh.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  if (gold || rar === 'ultra') sparkles(g, 0, 0, W, H, 40, 3);
  g.restore();

  return new Promise(resolve => cv.toBlob(resolve, 'image/png'));
}

function mix(a, b, k) {
  const p = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c); const n = m ? parseInt(m[1], 16) : 0x888888; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
