// drag-to-pan, wheel-to-zoom, pinch-to-zoom for a big scrollable surface.
// used by the connections board and the map editor.
//
//   canvas   = the fixed window you look through
//   viewport = the big thing inside that actually moves + scales

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class PanZoom {
  constructor(canvas, viewport, opts = {}) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.x = 0;
    this.y = 0;
    this.k = 1;
    this.minK = opts.minK ?? 0.1;
    this.maxK = opts.maxK ?? 5;
    this.canPan = opts.canPan || (() => true);   // (event) => should a drag starting here move the view?
    this.onTap = opts.onTap || (() => {});       // background click that wasn't a drag
    this.onChange = opts.onChange || (() => {});
    this.pointers = new Map();
    this._pan = null;
    this._pinch = null;

    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);
    this._wheel = this._wheel.bind(this);
    // capture phase so we still count fingers when something inside handles the event itself
    canvas.addEventListener('pointerdown', this._down, true);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
    canvas.addEventListener('wheel', this._wheel, { passive: false });
    this.apply();
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._down, true);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    this.canvas.removeEventListener('wheel', this._wheel);
  }

  get pinching() {
    return !!this._pinch;
  }

  apply() {
    this.viewport.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.k})`;
    this.viewport.style.setProperty('--inv', 1 / this.k);
    this.onChange(this);
  }

  // screen (clientX/Y) -> position on the surface
  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left - this.x) / this.k, y: (clientY - r.top - this.y) / this.k };
  }

  // the surface position that's in the middle of the window right now
  center() {
    const r = this.canvas.getBoundingClientRect();
    return this.toWorld(r.left + r.width / 2, r.top + r.height / 2);
  }

  zoomAt(clientX, clientY, factor) {
    const r = this.canvas.getBoundingClientRect();
    const px = clientX - r.left, py = clientY - r.top;
    const k = Math.min(this.maxK, Math.max(this.minK, this.k * factor));
    const f = k / this.k;
    this.x = px - (px - this.x) * f;
    this.y = py - (py - this.y) * f;
    this.k = k;
    this.apply();
  }

  zoomBy(factor) {
    const r = this.canvas.getBoundingClientRect();
    this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  }

  // bounds: { x, y, w, h } on the surface
  fit(bounds, { pad = 60, maxK = 1 } = {}) {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const k = Math.min((r.width - pad * 2) / Math.max(bounds.w, 1), (r.height - pad * 2) / Math.max(bounds.h, 1));
    this.k = Math.min(maxK, this.maxK, Math.max(this.minK, k));
    this.x = r.width / 2 - (bounds.x + bounds.w / 2) * this.k;
    this.y = r.height / 2 - (bounds.y + bounds.h / 2) * this.k;
    this.apply();
  }

  centerOn(wx, wy) {
    const r = this.canvas.getBoundingClientRect();
    this.x = r.width / 2 - wx * this.k;
    this.y = r.height / 2 - wy * this.k;
    this.apply();
  }

  _down(e) {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this._pan = null;
      this._pinch = { d: dist(a, b), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    const middle = e.button === 1;
    if (this.pointers.size === 1 && (middle || (e.button === 0 && this.canPan(e)))) {
      if (middle) e.preventDefault();
      this._pan = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: this.x, oy: this.y, moved: false, target: e.target };
    }
  }

  _move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this._pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = dist(a, b), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.x += mx - this._pinch.mx;
      this.y += my - this._pinch.my;
      this.zoomAt(mx, my, d / (this._pinch.d || 1));
      this._pinch = { d, mx, my };
      return;
    }
    const pan = this._pan;
    if (pan && e.pointerId === pan.id) {
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (!pan.moved && Math.hypot(dx, dy) > 4) {
        pan.moved = true;
        this.canvas.classList.add('panning');
      }
      if (pan.moved) {
        this.x = pan.ox + dx;
        this.y = pan.oy + dy;
        this.apply();
      }
    }
  }

  _up(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this._pinch = null;
    const pan = this._pan;
    if (pan && e.pointerId === pan.id) {
      this._pan = null;
      this.canvas.classList.remove('panning');
      if (!pan.moved && e.type === 'pointerup') this.onTap(e, pan.target);
    }
  }

  _wheel(e) {
    e.preventDefault();
    // ctrl+wheel is what a trackpad pinch shows up as, and its numbers are tiny
    const speed = e.ctrlKey ? 0.01 : 0.0015;
    const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    this.zoomAt(e.clientX, e.clientY, Math.exp(-delta * speed));
  }
}
