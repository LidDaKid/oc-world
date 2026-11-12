// a newspaper front page (used by the oc app in the "more" tab AND the world's newspaper tab).
// data = { name, date, issue, price, photos: 'b&w' | 'color', headline, subhead,
//          lead: { imageId, caption, text, by }, articles: [{ id, title, text, imageId, caption, by }], classifieds: [{ id, text }] }

import { h, fill, uid, segmented, autosize, confirmDialog } from '../ui.js';
import { store } from '../store.js';
import { uploadPic, pic } from './kit.js';

export function fixPaper(d, defaultName) {
  d.name ??= defaultName;
  d.date ??= new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
  d.issue ??= 'vol. 1 no. 1';
  d.price ??= '25¢';
  d.photos ||= 'b&w';
  d.headline ??= '';
  d.subhead ??= '';
  d.lead = { imageId: null, caption: '', text: '', by: '', ...d.lead };
  d.articles ||= [];
  d.classifieds ||= [];
  return d;
}

export function renderPaper(el, { data, defaultName, save, readOnly, startEditing }) {
  const d = fixPaper(data, defaultName);
  let editing = !readOnly && !!startEditing;
  const root = h('div', { class: 'nwp-wrap' });
  el.append(root);

  const paras = text => (text || '').split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean).map(p => h('p', {}, p));
  const photo = (holder, cls) => holder.imageId ? h('figure', { class: 'nwp-fig ' + cls }, pic(holder.imageId, 'nwp-img'), holder.caption?.trim() ? h('figcaption', {}, holder.caption) : null) : null;

  function read() {
    const hasLead = d.lead.text.trim() || d.lead.imageId;
    return h('article', { class: 'nwp-paper' + (d.photos === 'color' ? ' color' : '') },
      h('header', { class: 'nwp-mast' },
        h('div', { class: 'nwp-mast-line' }, h('span', {}, d.issue), h('span', {}, d.date), h('span', {}, d.price)),
        h('h2', { class: 'nwp-name' }, d.name || defaultName),
        h('div', { class: 'nwp-rule' })),
      d.headline.trim() ? h('h3', { class: 'nwp-headline' }, d.headline) : null,
      d.subhead.trim() ? h('div', { class: 'nwp-subhead' }, d.subhead) : null,
      hasLead ? h('section', { class: 'nwp-lead' },
        photo(d.lead, 'nwp-lead-fig'),
        h('div', { class: 'nwp-cols nwp-drop' }, d.lead.by.trim() ? h('div', { class: 'nwp-by' }, 'by ' + d.lead.by) : null, paras(d.lead.text))) : null,
      d.articles.length || d.classifieds.length ? h('div', { class: 'nwp-lower' },
        h('div', { class: 'nwp-articles' }, d.articles.map(a => h('section', { class: 'nwp-article' },
          h('h4', { class: 'nwp-art-title' }, a.title || '...'),
          a.by?.trim() ? h('div', { class: 'nwp-by' }, 'by ' + a.by) : null,
          photo(a, 'nwp-art-fig'),
          h('div', { class: 'nwp-art-text' }, paras(a.text))))),
        d.classifieds.length ? h('aside', { class: 'nwp-class' }, h('div', { class: 'nwp-class-head' }, 'classifieds'),
          d.classifieds.map(c => h('div', { class: 'nwp-ad' }, c.text))) : null) : null,
      !d.headline.trim() && !hasLead && !d.articles.length ? h('div', { class: 'nwp-blank' }, '...') : null);
  }

  function edit() {
    const area = (obj, key, ph, rows = 4) => autosize(h('textarea', { rows, value: obj[key] || '', placeholder: ph, oninput: e => { obj[key] = e.target.value; save(); } }));
    const line = (obj, key, ph, max = 120, cls = '') => h('input', { type: 'text', class: cls, value: obj[key] || '', placeholder: ph, maxLength: max, oninput: e => { obj[key] = e.target.value; save(); } });
    const picBtns = (holder, again) => h('div', { class: 'nwp-pic-row' },
      holder.imageId ? h('div', { class: 'nwp-thumb' }, pic(holder.imageId)) : null,
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const got = await uploadPic(1400); if (!got) return; if (holder.imageId) store.deleteImage(holder.imageId); holder.imageId = got.imageId; save(); again(); } }, holder.imageId ? 'change picture' : '+ picture'),
      holder.imageId ? h('button', { type: 'button', class: 'link-btn', onclick: () => { store.deleteImage(holder.imageId); holder.imageId = null; save(); again(); } }, 'remove') : null);
    const again = () => fill(root, bar(), edit());
    return h('div', { class: 'nwp-edit' },
      h('div', { class: 'nwp-edit-box nwp-edit-mast' },
        line(d, 'name', 'paper name', 50, 'nwp-name-input'),
        h('div', { class: 'nwp-edit-three' }, line(d, 'issue', 'issue', 30), line(d, 'date', 'date', 60), line(d, 'price', 'price', 12)),
        segmented([{ value: 'b&w', label: 'b&w photos' }, { value: 'color', label: 'color photos' }], d.photos, v => { d.photos = v; save(); })),
      h('div', { class: 'nwp-edit-box' },
        line(d, 'headline', 'headline', 120, 'nwp-headline-input'),
        line(d, 'subhead', 'second line', 160),
        picBtns(d.lead, again),
        line(d.lead, 'caption', 'picture caption', 160),
        line(d.lead, 'by', 'written by', 60),
        area(d.lead, 'text', 'the story', 6)),
      d.articles.map((a, i) => h('div', { class: 'nwp-edit-box' },
        h('div', { class: 'nwp-edit-head' }, line(a, 'title', 'article title', 100),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => { d.articles.splice(i - 1, 0, d.articles.splice(i, 1)[0]); save(); again(); } }, '↑'),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: async () => {
            if ((a.title || a.text) && !await confirmDialog(`remove "${a.title || 'this article'}"?`, { okLabel: 'remove', danger: true })) return;
            if (a.imageId) store.deleteImage(a.imageId); d.articles = d.articles.filter(x => x !== a); save(); again();
          } }, '✕')),
        line(a, 'by', 'written by', 60), picBtns(a, again), a.imageId ? line(a, 'caption', 'picture caption', 160) : null, area(a, 'text', 'the article'))),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.articles.push({ id: 'na_' + uid(), title: '', text: '', imageId: null, caption: '', by: '' }); save(); again(); } }, '+ article'),
      h('div', { class: 'nwp-edit-box' },
        h('div', { class: 'nwp-edit-label' }, 'classifieds'),
        d.classifieds.map(c => h('div', { class: 'nwp-edit-head' }, line(c, 'text', 'classified ad', 140),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { d.classifieds = d.classifieds.filter(x => x !== c); save(); again(); } }, '✕'))),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.classifieds.push({ id: 'nc_' + uid(), text: '' }); save(); again(); } }, '+ classified')));
  }

  const bar = () => readOnly ? null : h('div', { class: 'nwp-bar' }, h('button', { type: 'button', class: 'btn ' + (editing ? 'primary' : 'ghost') + ' sm', onclick: () => { editing = !editing; draw(); } }, editing ? 'done' : 'edit'));
  const draw = () => fill(root, bar(), editing ? edit() : read());
  draw();
  return { refresh: () => { if (!editing) draw(); } };
}
