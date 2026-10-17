// bits the computer + its apps share (kept apart from computer.js so the apps can import them without a loop)

import { h, s, fill, openModal } from '../ui.js';

// the two looks + what each can wear
export const LOOKS = [['y2k', 'early 2000s'], ['modern', 'modern']];
export const WALLS = {
  y2k: [['hills', 'hills'], ['classic', 'classic'], ['night', 'starry'], ['checker', 'checker'], ['bubbles', 'bubbles'], ['swoosh', 'swoosh']],
  modern: [['glow', 'glow'], ['waves', 'waves'], ['dunes', 'dunes'], ['aurora', 'aurora'], ['pastel', 'pastel'], ['midnight', 'midnight']],
};
export const SCHEMES = [['blue', 'blue', '#245edb'], ['olive', 'olive', '#8ba169'], ['silver', 'silver', '#a5a8b8'], ['pink', 'pink', '#e8509b'], ['purple', 'purple', '#7b4bc4'], ['black', 'black', '#2b2b33']];
export const CURSORS = [['normal', 'normal'], ['pink', 'pink'], ['black', 'black'], ['glitter', 'glitter']];

// the parody logo: four colored squares, a little wavy
export const logo = (cls = '') => h('span', { class: 'cp-logo ' + cls }, h('i'), h('i'), h('i'), h('i'));

// plain text of a doc (for previews + search)
export function docText(doc) {
  if (!doc) return '';
  if (doc.kind === 'txt') return doc.text || '';
  const div = document.createElement('div');
  div.innerHTML = cleanHtml(doc.html || '');
  return div.textContent || '';
}

// documents are kept as a little bit of html. only these tags + styles get through (a shared world could send anything)
const OK_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN', 'FONT', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'CENTER', 'S', 'STRIKE']);
const OK_STYLE = ['color', 'background-color', 'font-family', 'font-size', 'text-align', 'font-weight', 'font-style', 'text-decoration'];
export const WORDART = ['rainbow', 'chrome', 'fire', 'ocean', 'shadow', 'tilt', 'wave', 'neon', 'gold', 'candy', 'outline', 'tall'];
export function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const walk = node => {
    for (const kid of [...node.childNodes]) {
      if (kid.nodeType === 3) continue;
      if (kid.nodeType !== 1 || !OK_TAGS.has(kid.tagName)) {
        if (kid.nodeType === 1 && !['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH'].includes(kid.tagName)) { walk(kid); kid.replaceWith(...kid.childNodes); } else kid.remove();
        continue;
      }
      for (const a of [...kid.attributes]) {
        if (a.name === 'style') {
          const keep = OK_STYLE.map(p => [p, kid.style.getPropertyValue(p)]).filter(([, v]) => v && !/url\(|expression|javascript/i.test(v));
          kid.removeAttribute('style');
          keep.forEach(([p, v]) => kid.style.setProperty(p, v));
        } else if (a.name === 'data-wa' && WORDART.includes(a.value)) continue;
        else if (a.name === 'color' && kid.tagName === 'FONT' && /^#?\w+$/.test(a.value)) continue;
        else if (a.name === 'face' && kid.tagName === 'FONT' && /^[\w ,'"-]+$/.test(a.value)) continue;
        else if (a.name === 'size' && kid.tagName === 'FONT' && /^[1-7]$/.test(a.value)) continue;
        else if (a.name === 'contenteditable' && a.value === 'false') continue;
        else kid.removeAttribute(a.name);
      }
      walk(kid);
    }
  };
  walk(doc.body.firstChild);
  return doc.body.firstChild.innerHTML;
}

export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// a menu bar like the old programs: [['file', [['new', fn], null (a line), ['save', fn, { off: true }]]], ...]
export function menuBar(menus) {
  const bar = h('div', { class: 'cp-menubar' });
  let open = null;
  const shut = () => { open?.remove(); open = null; bar.querySelectorAll('.on').forEach(b => b.classList.remove('on')); document.removeEventListener('pointerdown', away, true); };
  const away = e => { if (!e.target.closest('.cp-menu') && !bar.contains(e.target)) shut(); };
  for (const [label, items] of menus) {
    const b = h('button', { type: 'button', class: 'cp-menu-btn' }, label);
    b.onclick = () => {
      const was = b.classList.contains('on');
      shut();
      if (was) return;
      b.classList.add('on');
      open = h('div', { class: 'cp-menu' }, items.filter(x => x !== undefined).map(it => it ? h('button', {
        type: 'button', class: 'cp-menu-item' + (it[2]?.on ? ' checked' : ''), disabled: !!it[2]?.off,
        onclick: () => { shut(); it[1](); },
      }, it[0]) : h('hr')));
      open.style.left = b.offsetLeft + 'px';
      bar.append(open);
      document.addEventListener('pointerdown', away, true);
    };
    bar.append(b);
  }
  return bar;
}

// ask for a line of text. resolves with it (trimmed) or null
export function askText(title, value = '', { label = 'ok', max = 60, placeholder = '' } = {}) {
  return new Promise(resolve => {
    let done = null;
    const input = h('input', { type: 'text', value, maxLength: max, placeholder, 'data-autofocus': '' });
    openModal({
      title, body: input,
      actions: [{ label, kind: 'primary', onClick: close => { const v = input.value.trim(); if (!v) { input.focus(); return; } done = v; close(); } }],
      onClose: () => resolve(done),
    });
  });
}

// toolbar button with a tiny drawn icon
export const tbtn = (title, kids, onclick, cls = '') => h('button', { type: 'button', class: 'cp-tb ' + cls, title, onclick }, kids);

// tiny svg icons for toolbars
const P = (d, extra = {}) => s('path', { d, ...extra });
export const ICO = {
  back: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, s('circle', { cx: 10, cy: 10, r: 9, class: 'cp-i-disc' }), P('M11.5 5 6.5 10l5 5M7 10h7', { class: 'cp-i-line' })),
  fwd: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, s('circle', { cx: 10, cy: 10, r: 9, class: 'cp-i-disc' }), P('M8.5 5l5 5-5 5M13 10H6', { class: 'cp-i-line' })),
  up: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M2 7h6l2 2h8v8H2z', { class: 'cp-i-folder' }), P('M10 15V10M7.5 12.5 10 10l2.5 2.5', { class: 'cp-i-line dark' })),
  refresh: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M15.5 8A6 6 0 1 0 16 12', { class: 'cp-i-line dark', fill: 'none' }), P('M16 3.5V8h-4.5', { class: 'cp-i-line dark', fill: 'none' })),
  home: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M3 10 10 3.5 17 10M5 8.5V17h4v-4.5h2V17h4V8.5', { class: 'cp-i-house' })),
  star: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M10 2.5l2.3 4.8 5.2.6-3.9 3.5 1.1 5.1L10 14l-4.7 2.5 1.1-5.1L2.5 7.9l5.2-.6z', { class: 'cp-i-star' })),
  plus: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M10 4v12M4 10h12', { class: 'cp-i-line dark' })),
  search: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, s('circle', { cx: 8.5, cy: 8.5, r: 5, class: 'cp-i-line dark', fill: 'none' }), P('M12.5 12.5 17 17', { class: 'cp-i-line dark' })),
  trash: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M4 6h12M8 6V4h4v2M5.5 6l1 11h7l1-11', { class: 'cp-i-line dark', fill: 'none' })),
  restore: () => s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, P('M4 9a6 6 0 1 1 1.7 4.3', { class: 'cp-i-line dark', fill: 'none' }), P('M4 4v5h5', { class: 'cp-i-line dark', fill: 'none' })),
};
