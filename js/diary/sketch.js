// drawing on a diary page. each page has one canvas; when you stop drawing it's saved as a picture
// (page.drawing.imageId) so it goes along with backups like every other picture.

import { h, toast } from '../ui.js';
import { store } from '../store.js';
import { dims } from './covers.js';

const DPR = 2;

// what's in your hand. shared by every page so switching pages keeps your pen.
export const pen = { tool: 'pen', color: '#27306b', size: 1 };

export const TOOLS = [
  { id: 'pen', icon: '🖊️', width: 2.4, alpha: 1 },
  { id: 'marker', icon: '🖍️', width: 7, alpha: 1 },
  { id: 'highlighter', icon: '🖌️', width: 18, alpha: .35, flat: true },
  { id: 'glitter', icon: '✨', width: 9 },
  { id: 'eraser', icon: '🧽', width: 20 },
];

const tool = () => TOOLS.find(t => t.id === pen.tool) || TOOLS[0];

export class Sketch {
  constructor(page, diary, onSaved) {
    const { w: W, h: H } = dims(diary);
    this.W = W;
    this.H = H;
    this.page = page;
    this.onSaved = onSaved;
    this.undo = [];
    this.timer = null;
    this.chain = Promise.resolve();
    this.canvas = h('canvas', { class: 'dp-draw', width: W * DPR, height: H * DPR });
    this.live = h('canvas', { class: 'dp-draw live', width: W * DPR, height: H * DPR });
    this.el = h('div', { class: 'dp-sketch' }, this.canvas, this.live);
    this.ctx = this.canvas.getContext('2d');
    this.lctx = this.live.getContext('2d');
    this.ctx.scale(DPR, DPR);
    this.lctx.scale(DPR, DPR);
    this.el.addEventListener('pointerdown', e => this.down(e));
    this.load();
  }

  async load() {
    const url = await store.imageURL(this.page.drawing.imageId);
    if (!url) return;
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { return; }
    // natural size, so a drawing never gets stretched if the diary changes size
    this.ctx.drawImage(img, 0, 0, img.naturalWidth / DPR, img.naturalHeight / DPR);
  }

  point(e) {
    const box = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - box.left) * this.W / box.width, y: (e.clientY - box.top) * this.H / box.height };
  }

  down(e) {
    if (e.button > 0) return;
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    const t = tool();
    this.undo.push(this.ctx.getImageData(0, 0, this.W * DPR, this.H * DPR));
    if (this.undo.length > 8) this.undo.shift();
    const pts = [this.point(e)];
    const width = t.width * pen.size;
    this.live.style.opacity = t.alpha ?? 1;
    const step = ev => {
      const evs = ev.getCoalescedEvents?.() || [ev];
      for (const one of evs) {
        const p = this.point(one), last = pts[pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < .8) continue;
        pts.push(p);
        if (t.id === 'eraser') this.erase(last, p, width);
        else if (t.id === 'glitter') this.sprinkle(p, width);
      }
      if (t.id !== 'eraser' && t.id !== 'glitter') this.stroke(this.lctx, pts, width, t);
    };
    if (t.id === 'glitter') this.sprinkle(pts[0], width);
    else if (t.id === 'eraser') this.erase(pts[0], pts[0], width);
    else this.stroke(this.lctx, pts, width, t);
    const up = () => {
      this.el.removeEventListener('pointermove', step);
      this.el.removeEventListener('pointerup', up);
      this.el.removeEventListener('pointercancel', up);
      if (t.id !== 'eraser' && t.id !== 'glitter') {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalAlpha = t.alpha ?? 1;
        this.ctx.drawImage(this.live, 0, 0);
        this.ctx.restore();
        this.lctx.clearRect(0, 0, this.W, this.H);
      }
      this.saveSoon();
    };
    this.el.addEventListener('pointermove', step);
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
  }

  // the whole line so far, smoothed through the midpoints
  stroke(ctx, pts, width, t) {
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.strokeStyle = ctx.fillStyle = pen.color;
    ctx.lineWidth = width;
    ctx.lineCap = t.flat ? 'square' : 'round';
    ctx.lineJoin = 'round';
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const end = pts[pts.length - 1];
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  erase(a, b, width) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x + .01, b.y);
    ctx.stroke();
    ctx.restore();
  }

  sprinkle(p, width) {
    const ctx = this.ctx;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * width;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      const r = .5 + Math.random() * 1.3;
      ctx.fillStyle = Math.random() < .3 ? '#ffffff' : shade(pen.color, (Math.random() - .5) * 90);
      ctx.beginPath();
      if (Math.random() < .12) { // a little four-point sparkle now and then
        const s = r * 3;
        ctx.moveTo(x, y - s); ctx.lineTo(x + s / 4, y - s / 4); ctx.lineTo(x + s, y); ctx.lineTo(x + s / 4, y + s / 4);
        ctx.lineTo(x, y + s); ctx.lineTo(x - s / 4, y + s / 4); ctx.lineTo(x - s, y); ctx.lineTo(x - s / 4, y - s / 4);
      } else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  back() {
    const prev = this.undo.pop();
    if (!prev) return false;
    this.ctx.putImageData(prev, 0, 0);
    this.saveSoon();
    return true;
  }

  wipe() {
    this.undo.push(this.ctx.getImageData(0, 0, this.W * DPR, this.H * DPR));
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.saveSoon();
  }

  saveSoon() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 700);
  }

  // write the drawing out now if there's anything waiting
  flush() {
    if (!this.timer) return this.chain;
    clearTimeout(this.timer);
    this.timer = null;
    this.chain = this.chain.then(() => this.save()).catch(err => {
      console.error(err);
      toast("couldn't save the drawing", 'bad');
    });
    return this.chain;
  }

  async save() {
    const px = new Uint32Array(this.ctx.getImageData(0, 0, this.W * DPR, this.H * DPR).data.buffer);
    const empty = !px.some(v => v !== 0);
    const old = this.page.drawing.imageId;
    let next = null;
    if (!empty) {
      const blob = await new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
      next = await store.putImage(blob);
    }
    this.page.drawing.imageId = next;
    this.onSaved();
    if (old) store.deleteImage(old);
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}
