// scenes: a moment written as a script between ocs. every line is someone talking (or narration),
// shown as chat bubbles with pfps or as a screenplay.
// saved in char.fun.scenes = { list: [{ id, title, style: 'chat' | 'script', setting, lines: [{ id, who (ocId or ''), text }] }] }

import { h, fill, uid, confirmDialog, segmented, autosize } from '../ui.js';
import { store } from '../store.js';
import { appBar, portrait, nameOf, worldmates } from './kit.js';

export const meta = { id: 'scenes', label: 'scenes', icon: '1f3ac' };

const newScene = () => ({ id: 'sc_' + uid(), title: '', style: 'chat', setting: '', lines: [] });

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.list ||= [];
  let openId = null, editing = false, lastWho = char.id;
  const box = h('div', { class: 'scn' });
  const save = () => ctx.save();
  const people = () => [char, ...worldmates(char.id)];
  const whoSelect = (value, onPick) => h('select', { class: 'scn-who', onchange: e => onPick(e.target.value) },
    people().map(c => h('option', { value: c.id, selected: c.id === value }, nameOf(c))),
    h('option', { value: '', selected: !value }, 'narration'));

  function list() {
    return [
      appBar(ctx, meta, mine ? h('button', { class: 'btn primary sm', onclick: () => { const s = newScene(); d.list.unshift(s); save(); openId = s.id; editing = true; draw(); } }, '+ new scene') : null),
      d.list.length ? h('div', { class: 'scn-list' }, d.list.map(s => {
        const faces = [...new Set(s.lines.map(l => l.who).filter(Boolean))].map(id => store.char(id)).filter(Boolean).slice(0, 5);
        const first = s.lines.find(l => l.text.trim());
        return h('button', { type: 'button', class: 'scn-card', onclick: () => { openId = s.id; editing = false; draw(); } },
          h('div', { class: 'scn-card-clap' }, h('span', {}, s.style === 'script' ? 'script' : 'chat'), h('span', {}, `${s.lines.length} lines`)),
          h('div', { class: 'scn-card-title' }, s.title || 'untitled scene'),
          first ? h('div', { class: 'scn-card-line' }, first.text) : null,
          h('div', { class: 'scn-card-faces' }, faces.map(c => portrait(c, 'xs'))));
      })) : h('div', { class: 'fun-soon' }, '...'),
    ];
  }

  function lineView(s, l) {
    const c = l.who ? store.char(l.who) : null;
    if (s.style === 'script') {
      if (!c) return h('p', { class: 'scn-action' }, l.text);
      return h('div', { class: 'scn-dlg', style: { '--c': c.color } }, h('div', { class: 'scn-dlg-name' }, nameOf(c)), h('div', { class: 'scn-dlg-text' }, l.text));
    }
    if (!c) return h('div', { class: 'scn-narr' }, l.text);
    const me = c.id === char.id;
    return h('div', { class: 'scn-msg' + (me ? ' me' : ''), style: { '--c': c.color } },
      portrait(c, 'sm'),
      h('div', { class: 'scn-bubble-wrap' }, h('div', { class: 'scn-name' }, nameOf(c)), h('div', { class: 'scn-bubble' }, l.text)));
  }

  function lineEditor(s, l, i) {
    return h('div', { class: 'scn-edit-line' },
      whoSelect(l.who, v => { l.who = v; save(); }),
      autosize(h('textarea', { rows: 1, value: l.text, maxLength: 1000, oninput: e => { l.text = e.target.value; save(); } })),
      h('div', { class: 'scn-edit-tools' },
        h('button', { class: 'icon-btn sm', title: 'move up', disabled: !i, onclick: () => { s.lines.splice(i - 1, 0, s.lines.splice(i, 1)[0]); save(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn sm', title: 'move down', disabled: i === s.lines.length - 1, onclick: () => { s.lines.splice(i + 1, 0, s.lines.splice(i, 1)[0]); save(); draw(); } }, '↓'),
        h('button', { class: 'icon-btn sm', title: 'delete', onclick: () => { s.lines.splice(i, 1); save(); draw(); } }, '✕')));
  }

  function scene() {
    const s = d.list.find(x => x.id === openId);
    if (!s) { openId = null; return list(); }
    const ed = mine && editing;
    let who = lastWho;
    const text = h('textarea', { class: 'scn-new-text', rows: 2, maxLength: 1000, placeholder: '...' });
    const add = () => {
      if (!text.value.trim()) return;
      s.lines.push({ id: 'ln_' + uid(), who, text: text.value.trim() });
      lastWho = who;
      save(); draw();
      requestAnimationFrame(() => box.querySelector('.scn-new-text')?.focus());
    };
    text.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } };
    return [
      appBar(ctx, meta,
        h('button', { class: 'btn ghost sm', onclick: () => { openId = null; draw(); } }, 'all scenes'),
        mine ? h('button', { class: 'btn ghost sm', onclick: () => { editing = !editing; draw(); } }, ed ? 'done' : 'edit') : null,
        ed ? h('button', { class: 'link-btn danger', onclick: async () => {
          if (!await confirmDialog(`delete "${s.title || 'this scene'}"?`, { okLabel: 'delete', danger: true })) return;
          d.list = d.list.filter(x => x !== s); openId = null; save(); draw();
        } }, 'delete') : null),
      h('div', { class: 'scn-stage scn-' + s.style },
        h('div', { class: 'scn-head' },
          ed ? h('input', { type: 'text', class: 'scn-title-in', value: s.title, placeholder: 'scene title', maxLength: 80, oninput: e => { s.title = e.target.value; save(); } })
            : h('h2', { class: 'scn-title' }, s.title || 'untitled scene'),
          ed ? h('input', { type: 'text', class: 'scn-setting-in', value: s.setting, placeholder: 'where + when', maxLength: 120, oninput: e => { s.setting = e.target.value; save(); } })
            : s.setting ? h('div', { class: 'scn-setting' }, s.setting) : null,
          mine ? segmented([{ value: 'chat', label: 'chat' }, { value: 'script', label: 'script' }], s.style, v => { s.style = v; save(); draw(); }) : null),
        h('div', { class: 'scn-lines' }, ed ? s.lines.map((l, i) => lineEditor(s, l, i)) : s.lines.map(l => lineView(s, l))),
        ed ? h('div', { class: 'scn-new' }, whoSelect(who, v => { who = v; }), text, h('button', { class: 'btn primary sm', onclick: add }, 'add line')) : null),
    ];
  }

  function draw() { fill(box, openId ? scene() : list()); }
  draw();
  el.append(box);
}
