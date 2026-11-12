// comic maker: comic pages made of panels. each panel = a picture (uploaded, or an oc's pfp) + a caption box
// + speech / thought / shout bubbles you drag where you want them.
// saved in char.fun.comics = { list: [{ id, title, layout, panels: [{ id, imageId, ocId, caption, bubbles: [{ id, kind, text, x, y }] }] }] }

import { h, fill, uid, confirmDialog, segmented } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, pic, nameOf, worldmates } from './kit.js';

export const meta = { id: 'comics', label: 'comic maker', icon: '1f4a5' };

const LAYOUTS = { '1': 1, '2': 2, '3': 3, '2x2': 4, '1 + 2': 3, '2 + 1': 3, '4 strip': 4 };
const KINDS = ['speech', 'thought', 'shout'];
const slug = v => v.replace(/\W/g, '');
const newPanel = () => ({ id: 'pn_' + uid(), imageId: null, ocId: null, caption: '', bubbles: [] });
const newComic = () => ({ id: 'cm_' + uid(), title: '', layout: '2x2', panels: Array.from({ length: 4 }, newPanel) });

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.list ||= [];
  let openId = null, editing = false;
  const box = h('div', { class: 'cmx' });
  const save = () => ctx.save();
  const people = () => [char, ...worldmates(char.id)];

  function fitPanels(c) {
    const n = LAYOUTS[c.layout] || 4;
    while (c.panels.length < n) c.panels.push(newPanel());
    // extra panels are kept (switching back brings them back); only the first n show
  }

  function panelPic(p) {
    if (p.imageId) return pic(p.imageId, 'cmx-pic');
    const oc = p.ocId ? store.char(p.ocId) : null;
    if (oc?.imageId) return pic(oc.imageId, 'cmx-pic');
    if (oc) return h('div', { class: 'cmx-pic cmx-initials', style: { '--c': oc.color } }, nameOf(oc).slice(0, 2));
    return h('div', { class: 'cmx-pic cmx-empty' });
  }

  function bubble(p, b, ed) {
    const node = h('div', { class: `cmx-bubble kind-${b.kind}`, style: { left: b.x + '%', top: b.y + '%' } });
    const text = h('div', { class: 'cmx-bubble-text' }, b.text || (ed ? '' : '...'));
    node.append(text);
    if (!ed) return node;
    node.classList.toggle('tools-below', b.y < 14); // the panel cuts off anything above its top edge
    text.contentEditable = 'plaintext-only';
    text.spellcheck = false;
    text.oninput = () => { b.text = text.textContent.slice(0, 300); save(); };
    const grip = h('button', { type: 'button', class: 'cmx-grip', title: 'move' }, '✥');
    grip.onpointerdown = e => {
      e.preventDefault();
      const frame = node.parentElement.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, x0 = b.x, y0 = b.y;
      grip.setPointerCapture(e.pointerId);
      grip.onpointermove = ev => {
        b.x = Math.max(0, Math.min(90, x0 + (ev.clientX - sx) / frame.width * 100));
        b.y = Math.max(0, Math.min(90, y0 + (ev.clientY - sy) / frame.height * 100));
        node.style.left = b.x + '%'; node.style.top = b.y + '%';
        node.classList.toggle('tools-below', b.y < 14);
      };
      grip.onpointerup = () => { grip.onpointermove = null; save(); };
    };
    node.append(h('div', { class: 'cmx-bubble-tools' }, grip,
      h('button', { type: 'button', class: 'cmx-mini', title: 'change shape', onclick: () => { b.kind = KINDS[(KINDS.indexOf(b.kind) + 1) % KINDS.length]; save(); draw(); } }, '◐'),
      h('button', { type: 'button', class: 'cmx-mini', title: 'remove', onclick: () => { p.bubbles = p.bubbles.filter(x => x !== b); save(); draw(); } }, '✕')));
    return node;
  }

  function panel(c, p, i, ed) {
    const frame = h('div', { class: 'cmx-frame' }, panelPic(p),
      p.caption?.trim() && !ed ? h('div', { class: 'cmx-caption' }, p.caption) : null,
      p.bubbles.map(b => bubble(p, b, ed)));
    if (!ed) return h('div', { class: 'cmx-panel', style: { '--i': i } }, frame);
    const ocPick = h('select', { class: 'cmx-oc', onchange: e => { p.ocId = e.target.value || null; if (p.ocId && p.imageId) { store.deleteImage(p.imageId); p.imageId = null; } save(); draw(); } },
      h('option', { value: '' }, 'oc pfp'), people().map(o => h('option', { value: o.id, selected: o.id === p.ocId }, nameOf(o))));
    return h('div', { class: 'cmx-panel editing', style: { '--i': i } }, frame,
      h('div', { class: 'cmx-panel-tools' },
        h('button', { class: 'btn ghost sm', onclick: async () => {
          const got = await uploadPic(1600);
          if (!got) return;
          if (p.imageId) store.deleteImage(p.imageId);
          p.imageId = got.imageId; p.ocId = null; save(); draw();
        } }, p.imageId ? 'change picture' : 'picture'),
        ocPick,
        KINDS.map(k => h('button', { class: 'btn ghost sm', onclick: () => { p.bubbles.push({ id: 'bb_' + uid(), kind: k, text: '', x: 10 + Math.random() * 40, y: 10 + Math.random() * 30 }); save(); draw(); } }, '+ ' + k)),
        h('input', { type: 'text', class: 'cmx-cap-in', value: p.caption, placeholder: 'caption', maxLength: 140, oninput: e => { p.caption = e.target.value; save(); } })));
  }

  function list() {
    return [
      appBar(ctx, meta, mine ? h('button', { class: 'btn primary sm', onclick: () => { const c = newComic(); d.list.unshift(c); save(); openId = c.id; editing = true; draw(); } }, '+ new comic') : null),
      d.list.length ? h('div', { class: 'cmx-list' }, d.list.map(c => h('button', { type: 'button', class: 'cmx-thumb', onclick: () => { openId = c.id; editing = false; draw(); } },
        h('div', { class: `cmx-page layout-${slug(c.layout)} mini` }, c.panels.slice(0, LAYOUTS[c.layout] || 4).map((p, i) => h('div', { class: 'cmx-panel', style: { '--i': i } }, h('div', { class: 'cmx-frame' }, panelPic(p))))),
        h('span', { class: 'cmx-thumb-title' }, c.title || 'untitled')))) : h('div', { class: 'fun-soon' }, '...'),
    ];
  }

  function comic() {
    const c = d.list.find(x => x.id === openId);
    if (!c) { openId = null; return list(); }
    fitPanels(c);
    const ed = mine && editing;
    const n = LAYOUTS[c.layout] || 4;
    return [
      appBar(ctx, meta,
        h('button', { class: 'btn ghost sm', onclick: () => { openId = null; draw(); } }, 'all comics'),
        mine ? h('button', { class: 'btn ghost sm', onclick: () => { editing = !editing; draw(); } }, ed ? 'done' : 'edit') : null,
        ed ? h('button', { class: 'link-btn danger', onclick: async () => {
          if (!await confirmDialog(`delete "${c.title || 'this comic'}"?`, { okLabel: 'delete', danger: true })) return;
          c.panels.forEach(p => p.imageId && store.deleteImage(p.imageId));
          d.list = d.list.filter(x => x !== c); openId = null; save(); draw();
        } }, 'delete') : null),
      ed ? h('div', { class: 'cmx-edit-head' },
        h('input', { type: 'text', class: 'cmx-title-in', value: c.title, placeholder: 'comic title', maxLength: 80, oninput: e => { c.title = e.target.value; save(); } }),
        segmented(Object.keys(LAYOUTS).map(v => ({ value: v, label: v })), c.layout, v => { c.layout = v; fitPanels(c); save(); draw(); })) : null,
      h('div', { class: 'cmx-sheet' },
        c.title && !ed ? h('h2', { class: 'cmx-title' }, c.title) : null,
        h('div', { class: `cmx-page layout-${slug(c.layout)}` }, c.panels.slice(0, n).map((p, i) => panel(c, p, i, ed)))),
    ];
  }

  function draw() { fill(box, openId ? comic() : list()); }
  draw();
  el.append(box);
}
