// tiny dom helpers. no framework, no build step.

const SVG_NS = 'http://www.w3.org/2000/svg';

function setAttrs(el, attrs, isSvg) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (val == null) continue;
        if (p.startsWith('--')) el.style.setProperty(p, val);
        else el.style[p] = val;
      }
    } else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (!isSvg && k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
}

function append(el, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false || kid === true) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

// kids go in before attrs so <select value> works
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  append(el, kids);
  setAttrs(el, attrs, false);
  return el;
}

export function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  append(el, kids);
  setAttrs(el, attrs, true);
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

// empty el, then put these in. unlike el.append(), null / false kids are skipped instead of printed as "null".
export function fill(el, ...kids) {
  el.replaceChildren();
  append(el, kids);
  return el;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function initials(name) {
  const words = (name || '?').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
}

// ---- modals ----

const modalStack = [];
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !modalStack.length) return;
  e.stopImmediatePropagation();
  modalStack[modalStack.length - 1]();
}, true);

export function hasOpenModal() {
  return modalStack.length > 0;
}

// fn runs whenever the last open modal closes
const closedListeners = new Set();
export function onModalsClosed(fn) {
  closedListeners.add(fn);
}

// actions: [{ label, kind: 'primary' | 'danger' | 'ghost', onClick(close) }]
// the primary action also fires when you hit enter in a text box.
export function openModal({ title, body, actions = [], wide = false, onClose }) {
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    modalStack.splice(modalStack.indexOf(close), 1);
    onClose?.();
    if (!modalStack.length) closedListeners.forEach(fn => fn());
  };
  const primary = actions.find(a => a.kind === 'primary');
  const form = h('form', {
    class: 'modal' + (wide ? ' wide' : ''),
    onsubmit: e => { e.preventDefault(); primary?.onClick(close); },
  },
    h('div', { class: 'modal-head' },
      h('h2', {}, title),
      h('button', { type: 'button', class: 'icon-btn', title: 'close', onclick: close }, '✕')),
    h('div', { class: 'modal-body' }, body),
    actions.length ? h('div', { class: 'modal-foot' }, actions.map(a =>
      a.kind === 'primary'
        ? h('button', { type: 'submit', class: 'btn primary' }, a.label)
        : h('button', { type: 'button', class: 'btn ' + (a.kind || 'ghost'), onclick: () => a.onClick(close) }, a.label)
    )) : null
  );
  const wrap = h('div', { class: 'modal-wrap', onpointerdown: e => { if (e.target === wrap) close(); } }, form);
  document.getElementById('modal-root').append(wrap);
  modalStack.push(close);
  requestAnimationFrame(() => form.querySelector('[data-autofocus]')?.focus());
  return { close, el: form };
}

export function confirmDialog(message, { title = 'wait', okLabel = 'yes', danger = false } = {}) {
  return new Promise(resolve => {
    let yes = false;
    openModal({
      title,
      body: h('p', { class: 'confirm-text' }, message),
      actions: [
        { label: 'nvm', onClick: close => close() },
        { label: okLabel, kind: danger ? 'danger' : 'primary', onClick: close => { yes = true; close(); } },
      ],
      onClose: () => resolve(yes),
    });
  });
}

export function toast(message, kind = '') {
  const el = h('div', { class: 'toast ' + kind }, message);
  document.getElementById('toast-root').append(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2900);
}

// ---- form bits ----

export const COLORS = ['#ff4fa3', '#ff8ac4', '#ff5d6c', '#ff9a3d', '#ffd84d', '#9be564', '#7df9d0', '#6ec6ff', '#b18cff', '#e3c6ff', '#f6eefb', '#9b8aa8'];

export function swatches(value, onPick, colors = COLORS) {
  const wrap = h('div', { class: 'swatches' });
  const draw = () => {
    clear(wrap);
    for (const c of colors) {
      wrap.append(h('button', {
        type: 'button', class: 'swatch' + (c === value ? ' on' : ''), style: { background: c }, title: c,
        onclick: () => { value = c; onPick(c); draw(); },
      }));
    }
    wrap.append(h('input', {
      type: 'color', class: 'swatch-custom', title: 'any color',
      value: /^#[0-9a-f]{6}$/i.test(value) ? value : colors[0],
      oninput: e => {
        value = e.target.value;
        onPick(value);
        wrap.querySelectorAll('.swatch.on').forEach(el => el.classList.remove('on'));
      },
    }));
  };
  draw();
  wrap.set = v => { value = v; draw(); };
  return wrap;
}

// options: [{ value, label, title }]
export function segmented(options, value, onPick) {
  const wrap = h('div', { class: 'segmented' });
  const draw = () => {
    clear(wrap);
    for (const o of options) {
      wrap.append(h('button', {
        type: 'button', class: 'seg' + (o.value === value ? ' on' : ''), title: o.title,
        onclick: () => { value = o.value; onPick(value); draw(); },
      }, o.label));
    }
  };
  draw();
  return wrap;
}

export function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function autosize(textarea) {
  const fit = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 2 + 'px';
  };
  textarea.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return textarea;
}

// ---- files ----

// resolves with an array of files ([] if they backed out)
export function pickFiles(accept, multiple = true) {
  return new Promise(resolve => {
    const input = h('input', { type: 'file', accept, multiple });
    input.addEventListener('change', () => resolve([...input.files]));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

export const pickFile = accept => pickFiles(accept, false).then(files => files[0] || null);

async function decodeImage(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// shrink big uploads so saves stay small. returns { blob, width, height }
export async function shrinkImage(file, maxDim) {
  const src = await decodeImage(file);
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale)), height = Math.max(1, Math.round(sh * scale));
  const canvas = h('canvas', { width, height });
  canvas.getContext('2d').drawImage(src, 0, 0, width, height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
  return { blob, width, height };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
