// stories: chapters starring the ocs. a shelf of books -> one story (cover, blurb, cast, chapters) -> read or write a chapter.
// saved in char.fun.stories = { list: [{ id, title, blurb, color, cover: { imageId }, cast: [ocId], chapters: [{ id, title, text }] }] }

import { h, fill, uid, toast, confirmDialog, swatches, autosize } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, pic, portrait, nameOf, worldmates } from './kit.js';

export const meta = { id: 'stories', label: 'stories', icon: '1f4da' };

const COLORS = ['#ff4fa3', '#b18cff', '#2a0a1b', '#1b1838', '#7df9d0', '#ffd84d', '#ff5d6c', '#6ec6ff', '#000000', '#f6eefb'];

const newStory = () => ({ id: 'st_' + uid(), title: '', blurb: '', color: COLORS[Math.floor(Math.random() * 4)], cover: { imageId: null }, cast: [], chapters: [{ id: 'ch_' + uid(), title: '', text: '' }] });

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.list ||= [];
  let view = { mode: 'shelf', sid: null, ci: 0 };
  const box = h('div', { class: 'stz' });
  const cast = () => [char, ...worldmates(char.id)];
  const storyOf = () => d.list.find(s => s.id === view.sid);
  const save = () => ctx.save();
  const go = (mode, extra = {}) => { view = { ...view, mode, ...extra }; draw(); box.scrollIntoView?.({ block: 'nearest' }); };

  function bookCover(s, big = false) {
    return h('div', { class: 'stz-cover' + (big ? ' big' : ''), style: { '--bc': s.color || '#ff4fa3' } },
      s.cover?.imageId ? pic(s.cover.imageId, 'stz-cover-pic') : null,
      h('div', { class: 'stz-cover-text' }, h('span', { class: 'stz-cover-title' }, s.title || 'untitled')),
      h('i', { class: 'stz-spine' }));
  }

  function shelf() {
    return [
      appBar(ctx, meta, mine ? h('button', { class: 'btn primary sm', onclick: () => { const s = newStory(); d.list.push(s); save(); go('story', { sid: s.id, editing: true }); } }, '+ new story') : null),
      d.list.length
        ? h('div', { class: 'stz-shelf' }, d.list.map(s => h('button', { type: 'button', class: 'stz-book', onclick: () => go('story', { sid: s.id, editing: false }) },
          bookCover(s), h('span', { class: 'stz-book-meta' }, `${s.chapters.length} ch`))))
        : h('div', { class: 'fun-soon' }, '...'),
    ];
  }

  function castChips(s, editable) {
    const ids = editable ? cast().map(c => c.id) : s.cast;
    return h('div', { class: 'stz-cast' }, ids.map(id => {
      const c = store.char(id);
      if (!c) return null;
      const on = s.cast.includes(id);
      return h(editable ? 'button' : 'span', {
        type: editable ? 'button' : undefined, class: 'stz-cast-chip' + (on ? ' on' : ''), style: { '--c': c.color },
        onclick: editable ? () => { s.cast = on ? s.cast.filter(x => x !== id) : [...s.cast, id]; save(); draw(); } : null,
      }, portrait(c, 'xs'), nameOf(c));
    }));
  }

  function storyPage() {
    const s = storyOf();
    if (!s) return shelf();
    const editing = mine && view.editing;
    const back = h('button', { class: 'btn ghost sm', onclick: () => go('shelf') }, 'shelf');
    const head = editing
      ? h('div', { class: 'stz-edit-head' },
        h('input', { type: 'text', class: 'stz-title-in', value: s.title, placeholder: 'title', maxLength: 80, oninput: e => { s.title = e.target.value; save(); coverSlot.replaceChildren(bookCover(s, true)); } }),
        h('textarea', { class: 'stz-blurb-in', rows: 3, maxLength: 600, placeholder: 'blurb', value: s.blurb, oninput: e => { s.blurb = e.target.value; save(); } }),
        h('div', { class: 'stz-row' }, h('span', { class: 'stz-label' }, 'cover color'), swatches(s.color, c => { s.color = c; save(); coverSlot.replaceChildren(bookCover(s, true)); }, COLORS)),
        h('div', { class: 'stz-row' },
          h('button', { class: 'btn ghost sm', onclick: async () => { const got = await uploadPic(1400, { aspect: 2 / 3 }); if (!got) return; if (s.cover.imageId) store.deleteImage(s.cover.imageId); s.cover = { imageId: got.imageId }; save(); draw(); } }, s.cover.imageId ? 'change cover' : '+ cover picture'),
          s.cover.imageId ? h('button', { class: 'link-btn', onclick: () => { store.deleteImage(s.cover.imageId); s.cover = { imageId: null }; save(); draw(); } }, 'remove cover') : null),
        h('span', { class: 'stz-label' }, 'starring'), castChips(s, true))
      : h('div', { class: 'stz-info' },
        h('h2', { class: 'stz-title' }, s.title || 'untitled'),
        s.blurb ? h('p', { class: 'stz-blurb' }, s.blurb) : null,
        s.cast.length ? castChips(s, false) : null);
    const coverSlot = h('div', { class: 'stz-cover-slot' }, bookCover(s, true));
    const chapters = h('ol', { class: 'stz-chapters' }, s.chapters.map((c, i) => h('li', { class: 'stz-ch' },
      h('button', { type: 'button', class: 'stz-ch-open', onclick: () => go('read', { ci: i }) },
        h('span', { class: 'stz-ch-n' }, String(i + 1).padStart(2, '0')), h('span', { class: 'stz-ch-title' }, c.title || `chapter ${i + 1}`)),
      editing ? h('div', { class: 'stz-ch-tools' },
        h('button', { class: 'icon-btn sm', title: 'write', onclick: () => go('write', { ci: i }) }, '✎'),
        h('button', { class: 'icon-btn sm', title: 'move up', disabled: !i, onclick: () => { s.chapters.splice(i - 1, 0, s.chapters.splice(i, 1)[0]); save(); draw(); } }, '↑'),
        h('button', { class: 'icon-btn sm', title: 'move down', disabled: i === s.chapters.length - 1, onclick: () => { s.chapters.splice(i + 1, 0, s.chapters.splice(i, 1)[0]); save(); draw(); } }, '↓'),
        h('button', { class: 'icon-btn sm', title: 'delete', onclick: async () => { if (c.text.trim() && !await confirmDialog(`delete "${c.title || 'this chapter'}"?`, { okLabel: 'delete', danger: true })) return; s.chapters.splice(i, 1); save(); draw(); } }, '✕')) : null)));
    return [
      appBar(ctx, meta, back,
        mine ? h('button', { class: 'btn ghost sm', onclick: () => go('story', { editing: !view.editing }) }, editing ? 'done' : 'edit') : null,
        mine && editing ? h('button', { class: 'link-btn danger', onclick: async () => {
          if (!await confirmDialog(`delete "${s.title || 'this story'}"?`, { okLabel: 'delete', danger: true })) return;
          if (s.cover.imageId) store.deleteImage(s.cover.imageId);
          d.list = d.list.filter(x => x !== s); save(); go('shelf');
        } }, 'delete') : null),
      h('div', { class: 'stz-story' }, coverSlot,
        h('div', { class: 'stz-side' }, head,
          h('h3', { class: 'stz-h' }, 'chapters'),
          s.chapters.length ? chapters : null,
          h('div', { class: 'stz-row' },
            s.chapters.length ? h('button', { class: 'btn primary sm', onclick: () => go('read', { ci: 0 }) }, 'read') : null,
            mine ? h('button', { class: 'btn ghost sm', onclick: () => { s.chapters.push({ id: 'ch_' + uid(), title: '', text: '' }); save(); go('write', { ci: s.chapters.length - 1 }); } }, '+ chapter') : null))),
    ];
  }

  function reader() {
    const s = storyOf();
    const c = s?.chapters[view.ci];
    if (!c) return storyPage();
    const n = s.chapters.length;
    const nav = h('div', { class: 'stz-nav' },
      h('button', { class: 'btn ghost sm', disabled: view.ci === 0, onclick: () => go('read', { ci: view.ci - 1 }) }, '‹ back'),
      h('select', { class: 'stz-ch-pick', onchange: e => go('read', { ci: +e.target.value }) },
        s.chapters.map((x, i) => h('option', { value: i, selected: i === view.ci }, `${i + 1}. ${x.title || 'chapter ' + (i + 1)}`))),
      h('button', { class: 'btn ghost sm', disabled: view.ci === n - 1, onclick: () => go('read', { ci: view.ci + 1 }) }, 'next ›'));
    return [
      appBar(ctx, meta, h('button', { class: 'btn ghost sm', onclick: () => go('story') }, s.title || 'untitled'),
        mine ? h('button', { class: 'btn ghost sm', onclick: () => go('write') }, 'write') : null),
      h('article', { class: 'stz-page', style: { '--bc': s.color } },
        h('div', { class: 'stz-page-num' }, `chapter ${view.ci + 1}`),
        h('h2', { class: 'stz-page-title' }, c.title || `chapter ${view.ci + 1}`),
        h('div', { class: 'stz-page-flourish' }, '✦ ✦ ✦'),
        h('div', { class: 'stz-page-text' }, (c.text || '...').split(/\n{2,}/).map(p => h('p', {}, p))),
        h('div', { class: 'stz-page-end' }, view.ci === n - 1 ? 'the end' : '✦')),
      nav,
    ];
  }

  function writer() {
    const s = storyOf();
    const c = s?.chapters[view.ci];
    if (!c || !mine) return reader();
    const count = h('span', { class: 'stz-count' });
    const words = () => { count.textContent = `${(c.text.trim().match(/\S+/g) || []).length} words`; };
    words();
    const area = autosize(h('textarea', { class: 'stz-write-text', placeholder: '...', value: c.text, oninput: e => { c.text = e.target.value; save(); words(); } }));
    return [
      appBar(ctx, meta, h('button', { class: 'btn ghost sm', onclick: () => go('story') }, s.title || 'untitled'),
        h('button', { class: 'btn primary sm', onclick: () => go('read') }, 'read it')),
      h('div', { class: 'stz-write', style: { '--bc': s.color } },
        h('div', { class: 'stz-page-num' }, `chapter ${view.ci + 1}`),
        h('input', { type: 'text', class: 'stz-write-title', value: c.title, placeholder: `chapter ${view.ci + 1}`, maxLength: 100, oninput: e => { c.title = e.target.value; save(); } }),
        area, count),
    ];
  }

  function draw() {
    const parts = view.mode === 'story' ? storyPage() : view.mode === 'read' ? reader() : view.mode === 'write' ? writer() : shelf();
    fill(box, parts);
  }
  draw();
  el.append(box);
}
