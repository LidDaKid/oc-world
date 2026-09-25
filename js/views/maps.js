// maps: upload a picture of a map (or start from a blank page), draw on it, drop pins
//
// a map is { id, name, imageId, paper, w, h, pins, strokes }
//   pin    = { id, x, y, name, icon, color, notes, charIds }
//   stroke = { id, color, size, pts: [x, y, x, y, …] }

import { store } from '../store.js';
import { h, s, clear, fill, uid, toast, openModal, confirmDialog, hasOpenModal, swatches, field, pickFile, shrinkImage } from '../ui.js';
import { PanZoom } from '../panzoom.js';
import { portrait, emojiPicker, zoomButtons } from '../parts.js';

const PAPERS = ['#f1e3c4', '#fbf7f0', '#bfe1ee', '#cfe6b8', '#ffd9e8', '#1d1830'];
const INKS = ['#2b2230', '#6b4a2f', '#c0392b', '#ff4fa3', '#e6a23c', '#3f8f4f', '#2d7fb8', '#7a5cc9', '#ffffff'];
const PIN_ICONS = ['📍', '🏠', '🏰', '🏫', '🏪', '⛪', '🌲', '⛰️', '🌊', '🏝️', '🌸', '⭐', '🔥', '❄️', '🌙', '⚠️', '⚔️', '🗝️', '👑', '🚪', '🕳️', '💎', '🎪', '⚓'];
const BLANK = { w: 1600, h: 1100 };

const round1 = n => Math.round(n * 10) / 10;

// smooth line through the points
function strokePath(pts) {
  if (pts.length < 4) return `M${pts[0]},${pts[1]} l0.01,0`;
  let d = `M${pts[0]},${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    d += ` Q${pts[i]},${pts[i + 1]} ${(pts[i] + pts[i + 2]) / 2},${(pts[i + 1] + pts[i + 3]) / 2}`;
  }
  return d + ` L${pts[pts.length - 2]},${pts[pts.length - 1]}`;
}

function strokeEl(stroke) {
  return s('path', { class: 'stroke', d: strokePath(stroke.pts), stroke: stroke.color, 'stroke-width': stroke.size, 'data-id': stroke.id });
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function render(el, ctx) {
  const map = ctx.sub && ctx.world.maps.find(m => m.id === ctx.sub);
  return map ? renderEditor(el, ctx, map) : renderList(el, ctx);
}

// ---- all maps ----

function renderList(el, { world, save, go }) {
  const grid = h('div', { class: 'card-grid maps' },
    h('button', { class: 'card card-new', onclick: newMap }, h('span', { class: 'plus' }, '+'), 'new map'));

  for (const m of world.maps) {
    const thumb = h('div', { class: 'map-thumb', style: { background: m.paper } });
    if (m.imageId) {
      const img = h('img', { alt: '' });
      store.imageURL(m.imageId).then(url => { if (url) img.src = url; });
      thumb.append(img);
    }
    thumb.append(s('svg', { class: 'ink', viewBox: `0 0 ${m.w} ${m.h}`, preserveAspectRatio: 'xMidYMid slice' }, m.strokes.map(strokeEl)));
    grid.append(h('a', { class: 'card map-card', href: `#/w/${world.id}/maps/${m.id}` },
      thumb,
      h('h3', {}, m.name),
      h('p', { class: 'muted' }, `${m.pins.length} pin${m.pins.length === 1 ? '' : 's'}`)));
  }

  function newMap() {
    let name = '';
    const make = async (close, withPicture) => {
      const map = { id: 'm_' + uid(), name: name.trim() || 'untitled map', imageId: null, paper: PAPERS[0], ...BLANK, pins: [], strokes: [] };
      if (withPicture) {
        const file = await pickFile('image/*');
        if (!file) return;
        try {
          const { blob, width, height } = await shrinkImage(file, 2400);
          Object.assign(map, { imageId: await store.putImage(blob), w: width, h: height });
        } catch (err) {
          console.error(err);
          toast("couldn't read that picture", 'bad');
          return;
        }
      }
      world.maps.push(map);
      save();
      close();
      go(`w/${world.id}/maps/${map.id}`);
    };
    openModal({
      title: 'new map',
      body: [
        field('name', h('input', { type: 'text', maxLength: 60, placeholder: 'the whole world, one town, a bedroom', 'data-autofocus': true, oninput: e => name = e.target.value })),
      ],
      actions: [
        { label: 'cancel', onClick: close => close() },
        { label: '📄 blank page', onClick: close => make(close, false) },
        { label: '🖼️ upload a picture', kind: 'primary', onClick: close => make(close, true) },
      ],
    });
  }

  el.append(h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('h1', {}, 'maps')), grid));
}

// ---- one map ----

function renderEditor(el, { world, save, go }, map) {
  let tool = 'move';
  const ink = { color: INKS[0], size: 5 };
  const undoStack = []; // { type: 'add', stroke } | { type: 'erase', stroke, index }
  const pinEls = new Map();

  const sheet = h('div', { class: 'map-sheet' });
  const inkSvg = s('svg', { class: 'ink' });
  const pinLayer = h('div', { class: 'pins' });
  const viewport = h('div', { class: 'viewport' }, sheet, inkSvg, pinLayer);
  const canvas = h('div', { class: 'canvas map-canvas' }, viewport);
  const bar = h('div', { class: 'board-bar map-bar' });
  const pinList = h('aside', { class: 'pin-list', hidden: true });
  el.append(h('div', { class: 'board-wrap' }, h('div', { class: 'board-main' }, bar, canvas), pinList));

  const pz = new PanZoom(canvas, viewport, {
    minK: 0.08, maxK: 8,
    canPan: e => (tool === 'move' || tool === 'pin') && !e.target.closest('.pin'),
    onTap: e => { if (tool === 'pin') addPinAt(e); },
  });

  const fit = () => pz.fit({ x: 0, y: 0, w: map.w, h: map.h }, { pad: 24, maxK: 2 });

  // ---- drawing the page ----

  function drawSheet() {
    clear(sheet);
    Object.assign(sheet.style, { width: map.w + 'px', height: map.h + 'px', background: map.paper });
    inkSvg.setAttribute('width', map.w);
    inkSvg.setAttribute('height', map.h);
    inkSvg.setAttribute('viewBox', `0 0 ${map.w} ${map.h}`);
    if (map.imageId) {
      const img = h('img', { alt: '', draggable: false });
      store.imageURL(map.imageId).then(url => { if (url) img.src = url; });
      sheet.append(img);
    }
  }

  function drawInk() {
    clear(inkSvg).append(...map.strokes.map(strokeEl));
  }

  function drawPins() {
    clear(pinLayer);
    pinEls.clear();
    for (const pin of map.pins) {
      const pinEl = h('div', {
        class: 'pin', style: { left: pin.x + 'px', top: pin.y + 'px', '--c': pin.color },
        onpointerdown: e => onPinDown(e, pin),
      },
        h('div', { class: 'pin-body' }, h('span', { class: 'pin-icon' }, pin.icon)),
        pin.name ? h('div', { class: 'pin-label' }, pin.name) : null);
      pinLayer.append(pinEl);
      pinEls.set(pin.id, pinEl);
    }
    drawPinList();
  }

  function drawPinList() {
    clear(pinList).append(h('div', { class: 'side-title' }, 'pins'));
    for (const pin of map.pins) {
      const chars = (pin.charIds || []).map(id => store.char(id)).filter(Boolean);
      pinList.append(h('button', { class: 'pin-row', onclick: () => findPin(pin) },
        h('span', { class: 'pin-row-icon', style: { '--c': pin.color } }, pin.icon),
        h('span', { class: 'pin-row-name' }, pin.name || 'unnamed spot'),
        chars.length ? h('span', { class: 'pin-row-chars' }, chars.slice(0, 4).map(c => portrait(c, 'xs'))) : null));
    }
  }

  function findPin(pin) {
    pz.centerOn(pin.x, pin.y);
    const pinEl = pinEls.get(pin.id);
    pinEl?.classList.remove('flash');
    void pinEl?.offsetWidth; // restart the animation
    pinEl?.classList.add('flash');
  }

  // ---- toolbar ----

  function setTool(next) {
    tool = next;
    canvas.dataset.tool = tool;
    drawBar();
  }

  function drawBar() {
    const toolBtn = (id, icon, title) =>
      h('button', { class: 'icon-btn tool' + (tool === id ? ' on' : ''), title, onclick: () => setTool(id) }, icon);
    fill(bar,
      h('a', { class: 'back-link', href: `#/w/${world.id}/maps` }, '← maps'),
      h('input', { type: 'text', class: 'map-name', value: map.name, maxLength: 60, oninput: e => { map.name = e.target.value; save(); } }),
      h('div', { class: 'tools' },
        toolBtn('move', '✋', 'move around + open pins'),
        toolBtn('pin', '📍', 'drop a pin'),
        toolBtn('draw', '✏️', 'draw'),
        toolBtn('erase', '🧽', 'erase lines')),
      tool === 'draw' ? h('div', { class: 'ink-opts' },
        swatches(ink.color, c => ink.color = c, INKS),
        h('input', { type: 'range', class: 'ink-size', min: 1, max: 40, value: ink.size, title: 'line thickness', oninput: e => ink.size = Number(e.target.value) })) : null,
      tool === 'draw' || tool === 'erase'
        ? h('button', { class: 'icon-btn', title: 'undo (ctrl+z)', onclick: undo }, '↩') : null,
      h('div', { class: 'bar-spacer' }),
      zoomButtons(() => pz, fit),
      h('button', { class: 'btn ghost sm', onclick: () => { pinList.hidden = !pinList.hidden; } }, `📍 list`),
      h('button', { class: 'icon-btn', title: 'map settings', onclick: mapSettings }, '⚙️'));
  }

  // ---- ink ----

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pz.pointers.size > 1 || e.target.closest('.pin')) return;
    if (tool === 'draw') startStroke(e);
    else if (tool === 'erase') startErase(e);
  });

  function trackPointer(e, onMove, onEnd) {
    canvas.setPointerCapture(e.pointerId);
    const move = ev => { if (ev.pointerId === e.pointerId && !pz.pinching) onMove(ev); };
    const up = ev => {
      if (ev.pointerId !== e.pointerId) return;
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      onEnd?.();
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  function startStroke(e) {
    const p = pz.toWorld(e.clientX, e.clientY);
    const stroke = { id: 's_' + uid(), color: ink.color, size: ink.size, pts: [round1(p.x), round1(p.y)] };
    const path = strokeEl(stroke);
    inkSvg.append(path);
    trackPointer(e, ev => {
      const q = pz.toWorld(ev.clientX, ev.clientY);
      const n = stroke.pts.length;
      if (Math.hypot(q.x - stroke.pts[n - 2], q.y - stroke.pts[n - 1]) < 2 / pz.k) return;
      stroke.pts.push(round1(q.x), round1(q.y));
      path.setAttribute('d', strokePath(stroke.pts));
    }, () => {
      map.strokes.push(stroke);
      undoStack.push({ type: 'add', stroke });
      save();
    });
  }

  function eraseAt(e) {
    const p = pz.toWorld(e.clientX, e.clientY);
    const reach = 10 / pz.k;
    for (let i = map.strokes.length - 1; i >= 0; i--) {
      const st = map.strokes[i], pts = st.pts;
      let hit = pts.length < 4 && Math.hypot(p.x - pts[0], p.y - pts[1]) < reach + st.size / 2;
      for (let j = 0; !hit && j < pts.length - 2; j += 2) {
        hit = distToSegment(p.x, p.y, pts[j], pts[j + 1], pts[j + 2], pts[j + 3]) < reach + st.size / 2;
      }
      if (!hit) continue;
      map.strokes.splice(i, 1);
      undoStack.push({ type: 'erase', stroke: st, index: i });
      inkSvg.querySelector(`[data-id="${st.id}"]`)?.remove();
      save();
      return;
    }
  }

  function startErase(e) {
    eraseAt(e);
    trackPointer(e, eraseAt);
  }

  function undo() {
    const step = undoStack.pop();
    if (!step) return;
    if (step.type === 'add') map.strokes = map.strokes.filter(st => st !== step.stroke);
    else map.strokes.splice(Math.min(step.index, map.strokes.length), 0, step.stroke);
    save();
    drawInk();
  }

  // ---- pins ----

  function addPinAt(e) {
    const p = pz.toWorld(e.clientX, e.clientY);
    const pin = {
      id: 'p_' + uid(), name: '', icon: '📍', color: '#ff4fa3', notes: '', charIds: [],
      x: Math.round(Math.max(0, Math.min(map.w, p.x))), y: Math.round(Math.max(0, Math.min(map.h, p.y))),
    };
    editPin(pin, true);
  }

  function onPinDown(e, pin) {
    if (e.button !== 0 || (tool !== 'move' && tool !== 'pin')) return;
    const pinEl = pinEls.get(pin.id);
    const start = { x: e.clientX, y: e.clientY, px: pin.x, py: pin.y };
    let moved = false;
    pinEl.setPointerCapture(e.pointerId);
    const move = ev => {
      if (ev.pointerId !== e.pointerId || pz.pinching) return;
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      pin.x = Math.round(start.px + dx / pz.k);
      pin.y = Math.round(start.py + dy / pz.k);
      pinEl.style.left = pin.x + 'px';
      pinEl.style.top = pin.y + 'px';
    };
    const up = ev => {
      if (ev.pointerId !== e.pointerId) return;
      pinEl.removeEventListener('pointermove', move);
      pinEl.removeEventListener('pointerup', up);
      pinEl.removeEventListener('pointercancel', up);
      if (moved) save();
      else if (ev.type === 'pointerup') editPin(pin);
    };
    pinEl.addEventListener('pointermove', move);
    pinEl.addEventListener('pointerup', up);
    pinEl.addEventListener('pointercancel', up);
  }

  function editPin(pin, isNew = false) {
    const draft = { ...pin, charIds: [...(pin.charIds || [])] };
    const who = h('div', { class: 'chip-row' });
    const drawWho = () => {
      clear(who);
      for (const c of store.cast(world)) {
        const on = draft.charIds.includes(c.id);
        who.append(h('button', {
          type: 'button', class: 'chip who' + (on ? ' on' : ''), style: { '--c': c.color },
          onclick: () => { draft.charIds = on ? draft.charIds.filter(id => id !== c.id) : [...draft.charIds, c.id]; drawWho(); },
        }, portrait(c, 'xs'), c.name || 'unnamed oc'));
      }
    };
    drawWho();
    openModal({
      title: isNew ? 'new pin' : 'pin',
      body: [
        field('name', h('input', { type: 'text', value: draft.name, maxLength: 60, 'data-autofocus': true, oninput: e => draft.name = e.target.value })),
        field('icon', emojiPicker(draft.icon, icon => draft.icon = icon, PIN_ICONS)),
        field('color', swatches(draft.color, c => draft.color = c)),
        field('notes', h('textarea', { rows: 4, value: draft.notes, oninput: e => draft.notes = e.target.value })),
        store.cast(world).length ? field('who is here?', who) : null,
      ],
      actions: [
        isNew ? null : {
          label: 'delete', kind: 'danger', onClick: close => {
            map.pins = map.pins.filter(p => p !== pin);
            save();
            close();
            drawPins();
          },
        },
        { label: 'cancel', onClick: close => close() },
        {
          label: isNew ? 'drop it' : 'save', kind: 'primary', onClick: close => {
            draft.name = draft.name.trim();
            Object.assign(pin, draft);
            if (isNew) {
              map.pins.push(pin);
              setTool('move');
            }
            save();
            close();
            drawPins();
          },
        },
      ].filter(Boolean),
    });
  }

  // ---- settings ----

  function mapSettings() {
    const modal = openModal({
      title: 'map settings',
      body: [
        field('paper color', swatches(map.paper, c => { map.paper = c; sheet.style.background = c; save(); }, PAPERS),
          null),
        h('div', { class: 'modal-extra' },
          h('button', { type: 'button', class: 'btn ghost sm', onclick: () => changePicture(modal) }, map.imageId ? '🖼️ swap the picture' : '🖼️ put a picture behind it'),
          map.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => removePicture(modal) }, 'take the picture off') : null),
        h('div', { class: 'modal-extra' },
          h('button', { type: 'button', class: 'link-btn danger', onclick: () => removeMap(modal) }, 'delete this map')),
      ],
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
    });
  }

  async function changePicture(modal) {
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const { blob, width, height } = await shrinkImage(file, 2400);
      const old = map.imageId;
      const newId = await store.putImage(blob);
      // pins + drawings keep their spot relative to the page when the page changes size
      const sx = width / map.w, sy = height / map.h;
      for (const pin of map.pins) { pin.x = Math.round(pin.x * sx); pin.y = Math.round(pin.y * sy); }
      for (const st of map.strokes) st.pts = st.pts.map((v, i) => round1(v * (i % 2 ? sy : sx)));
      Object.assign(map, { imageId: newId, w: width, h: height });
      if (old) store.deleteImage(old);
      save();
      modal.close();
      drawSheet(); drawInk(); drawPins(); fit();
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }

  async function removePicture(modal) {
    if (!await confirmDialog('take the picture off this map? your pins and drawings stay.', { okLabel: 'take it off' })) return;
    store.deleteImage(map.imageId);
    map.imageId = null;
    save();
    modal.close();
    drawSheet();
  }

  async function removeMap(modal) {
    if (!await confirmDialog(`delete "${map.name}" with all its pins and drawings? this can't be undone.`, { okLabel: 'delete map', danger: true })) return;
    if (map.imageId) store.deleteImage(map.imageId);
    world.maps = world.maps.filter(m => m !== map);
    save();
    modal.close();
    go(`w/${world.id}/maps`);
  }

  // ---- keys ----

  function onKey(e) {
    if (hasOpenModal() || e.target.closest?.('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key === 'Escape') setTool('move');
  }
  document.addEventListener('keydown', onKey);

  setTool('move');
  drawSheet();
  drawInk();
  drawPins();
  requestAnimationFrame(fit);

  return {
    cleanup() {
      pz.destroy();
      document.removeEventListener('keydown', onKey);
    },
    // someone else in a collab world changed something: redraw without moving the camera
    refresh() {
      if (!world.maps.includes(map)) return go(`w/${world.id}/maps`);
      if (pz.pointers.size) return setTimeout(() => this.refresh(), 300); // mid-stroke, try again in a sec
      drawSheet();
      drawInk();
      drawPins();
      drawBar();
    },
  };
}
