// cropping a picture right after you pick it. drag the box, pull the corners/edges, pick a shape, turn it.
//
//   const blob = await cropImage(file, { aspect: 3 / 4 })   // aspect = the shape the picture is going into (optional)
//   -> a Blob of the cropped picture, the original file ("whole picture"), or null if they backed out
//
//   pickAndCrop(opts) = pick a file + crop it in one go

import { h, fill, openModal, pickFile, toast } from './ui.js';

const SHAPES = [
  { id: 'free', label: 'free', ratio: null },
  { id: 'square', label: '1:1', ratio: 1 },
  { id: 'portrait', label: '3:4', ratio: 3 / 4 },
  { id: 'land', label: '4:3', ratio: 4 / 3 },
  { id: 'wide', label: '16:9', ratio: 16 / 9 },
  { id: 'tall', label: '9:16', ratio: 9 / 16 },
];

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return { img, url };
}

export async function pickAndCrop(opts = {}) {
  const file = await pickFile('image/*', false);
  if (!file) return null;
  return cropImage(file, opts);
}

// several pictures: crop each one in turn (backing out of one just skips it)
export async function cropAll(files, opts = {}) {
  const out = [];
  for (const file of files) {
    const blob = await cropImage(file, opts);
    if (blob) out.push(blob instanceof File ? blob : new File([blob], file.name, { type: blob.type }));
  }
  return out;
}

export async function cropImage(file, { aspect = null } = {}) {
  if (window.__autoCrop) return file; // the automated tests skip the crop box (crop.js has its own test)
  let loaded;
  try { loaded = await loadImage(file); } catch (err) {
    console.error(err);
    toast("couldn't read that picture", 'bad');
    return null;
  }
  // a picture that's already turned is drawn onto a canvas, so turning is just "use this canvas instead"
  let source = loaded.img;
  let W = source.naturalWidth, H = source.naturalHeight;
  let ratio = aspect;
  let shape = aspect ? 'fit' : 'free';
  let box; // the crop, in picture pixels: { x, y, w, h }

  const view = h('canvas', { class: 'crop-pic' });
  const frame = h('div', { class: 'crop-box' },
    ...['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => h('i', { class: 'crop-h crop-' + d, dataset: { d } })),
    h('b', { class: 'crop-grid' }));
  const stage = h('div', { class: 'crop-stage' }, view, frame);
  const shapes = h('div', { class: 'segmented crop-shapes' });

  function drawView() {
    view.width = W;
    view.height = H;
    view.getContext('2d').drawImage(source, 0, 0);
  }

  // biggest box of this shape that fits, in the middle
  function resetBox() {
    if (!ratio) { box = { x: W * .05, y: H * .05, w: W * .9, h: H * .9 }; return; }
    let w = W, hh = w / ratio;
    if (hh > H) { hh = H; w = hh * ratio; }
    w *= .92; hh *= .92;
    box = { x: (W - w) / 2, y: (H - hh) / 2, w, h: hh };
  }

  const scale = () => view.getBoundingClientRect().width / W || 1;
  function place() {
    const s = scale();
    Object.assign(frame.style, { left: box.x * s + 'px', top: box.y * s + 'px', width: box.w * s + 'px', height: box.h * s + 'px' });
  }

  function drawShapes() {
    const list = [...(aspect && !SHAPES.some(x => Math.abs((x.ratio || 0) - aspect) < .01) ? [{ id: 'fit', label: 'fit', ratio: aspect }] : []), ...SHAPES];
    fill(shapes, list.map(o => h('button', {
      type: 'button', class: 'seg' + ((shape === o.id || (o.ratio && ratio && Math.abs(o.ratio - ratio) < .01 && shape !== 'free')) ? ' on' : ''),
      onclick: () => { shape = o.id; ratio = o.ratio; resetBox(); place(); drawShapes(); },
    }, o.label)));
  }

  function turn() {
    const c = h('canvas', { width: H, height: W });
    const ctx = c.getContext('2d');
    ctx.translate(H, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(source, 0, 0);
    source = c;
    [W, H] = [H, W];
    drawView();
    resetBox();
    requestAnimationFrame(place);
  }

  // dragging the box or one of its handles
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const handle = e.target.dataset.d || (e.target === frame || e.target.classList.contains('crop-grid') ? 'move' : null);
    if (!handle) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    const s = scale(), sx = e.clientX, sy = e.clientY, start = { ...box };
    const min = Math.max(24, Math.min(W, H) * .04);
    const move = ev => {
      const dx = (ev.clientX - sx) / s, dy = (ev.clientY - sy) / s;
      let { x, y, w, h: hh } = start;
      if (handle === 'move') {
        x = Math.max(0, Math.min(W - w, x + dx));
        y = Math.max(0, Math.min(H - hh, y + dy));
      } else {
        if (handle.includes('e')) w = start.w + dx;
        if (handle.includes('w')) { w = start.w - dx; }
        if (handle.includes('s')) hh = start.h + dy;
        if (handle.includes('n')) { hh = start.h - dy; }
        if (ratio) { // keep the shape: follow whichever way moved more
          if (handle === 'n' || handle === 's') w = hh * ratio;
          else if (handle === 'e' || handle === 'w') hh = w / ratio;
          else if (Math.abs(dx) > Math.abs(dy)) hh = w / ratio; else w = hh * ratio;
        }
        w = Math.max(min, w);
        hh = Math.max(min, hh);
        x = handle.includes('w') ? start.x + start.w - w : handle.includes('e') ? start.x : start.x + (start.w - w) / 2;
        y = handle.includes('n') ? start.y + start.h - hh : handle.includes('s') ? start.y : start.y + (start.h - hh) / 2;
        // keep it on the picture
        if (x < 0) { w += x; x = 0; if (ratio) hh = w / ratio; }
        if (y < 0) { hh += y; y = 0; if (ratio) w = hh * ratio; }
        if (x + w > W) { w = W - x; if (ratio) hh = w / ratio; }
        if (y + hh > H) { hh = H - y; if (ratio) w = hh * ratio; }
      }
      box = { x, y, w, h: hh };
      place();
    };
    const up = () => {
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
    };
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
  });

  drawView();
  resetBox();
  drawShapes();

  return new Promise(resolve => {
    let result = null;
    const onResize = () => place();
    window.addEventListener('resize', onResize);
    openModal({
      title: 'crop',
      wide: true,
      body: h('div', { class: 'crop-wrap' }, stage, h('div', { class: 'crop-tools' }, shapes,
        h('button', { type: 'button', class: 'btn ghost sm', title: 'turn', onclick: turn }, '↻ turn'))),
      actions: [
        { label: 'whole picture', onClick: close => { result = source === loaded.img ? file : 'whole'; close(); } },
        { label: 'crop', kind: 'primary', onClick: close => { result = 'crop'; close(); } },
      ],
      onClose: async () => {
        window.removeEventListener('resize', onResize);
        if (result === 'crop' || result === 'whole') {
          const b = result === 'whole' ? { x: 0, y: 0, w: W, h: H } : box;
          const c = h('canvas', { width: Math.max(1, Math.round(b.w)), height: Math.max(1, Math.round(b.h)) });
          c.getContext('2d').drawImage(source, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
          const type = /png|webp|gif/.test(file.type) ? 'image/png' : 'image/jpeg';
          result = await new Promise(r => c.toBlob(r, type, .95));
        }
        URL.revokeObjectURL(loaded.url);
        resolve(result || null);
      },
    });
    requestAnimationFrame(() => requestAnimationFrame(place));
  });
}
