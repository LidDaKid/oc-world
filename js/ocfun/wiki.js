// fan wiki: a fandom-wiki page about the oc, built from their own page (name, pfp, basics, sections, tags, worlds,
// relationships) + wiki-only sections and trivia.
// saved in char.fun.wiki = { quote, quoteBy, extra: [{ id, title, text }], trivia: [{ id, text }] }

import { h, fill, uid, confirmDialog, autosize } from '../ui.js';
import { store } from '../store.js';
import { seenFrom } from '../rels.js';
import { appBar, portrait, nameOf, pic } from './kit.js';

export const meta = { id: 'wiki', label: 'fan wiki', icon: '1f4d6' };

const slug = s => 'wk-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const paras = text => String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => h('p', {}, p));

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.extra ||= [];
  d.trivia ||= [];
  d.quote ??= '';
  d.quoteBy ??= '';
  let editing = false;
  const box = h('div', { class: 'wki' });
  const aboutLink = `#/${ctx.base}/about`;

  const editLink = href => (mine && !editing ? h('a', { class: 'wki-edit', href }, '[edit]') : null);
  const editWiki = () => (mine && !editing ? h('button', { type: 'button', class: 'wki-edit', onclick: () => { editing = true; draw(); } }, '[edit]') : null);

  function infobox() {
    const basics = char.basics.filter(b => b.label?.trim() && b.value?.trim());
    const worlds = store.worldsOf(char.id);
    return h('aside', { class: 'wki-info', style: { '--c': char.color } },
      h('div', { class: 'wki-info-title' }, nameOf(char)),
      h('div', { class: 'wki-info-pic' }, char.imageId ? pic(char.imageId, 'wki-info-img') : portrait(char, 'wki-info-portrait')),
      char.tagline ? h('div', { class: 'wki-info-cap' }, char.tagline) : null,
      h('div', { class: 'wki-info-band' }, 'biographical information'),
      h('table', { class: 'wki-info-table' }, h('tbody', {},
        basics.map(b => h('tr', {}, h('th', {}, b.label), h('td', {}, b.value))),
        worlds.length ? h('tr', {}, h('th', {}, 'worlds'), h('td', {}, worlds.map((w, i) => [i ? ', ' : '', h('a', { href: `#/w/${w.id}` }, w.name)]))) : null,
        !basics.length && !worlds.length ? h('tr', {}, h('td', { colspan: 2, class: 'wki-info-none' }, '—')) : null)));
  }

  function relationships() {
    const rels = store.relsOf(char.id).map(r => seenFrom(r, char.id)).filter(r => r.otherName);
    if (!rels.length) return null;
    return h('ul', { class: 'wki-rels' }, rels.map(r => h('li', {},
      r.other ? h('a', { href: ctx.ocLink(r.other) }, portrait(r.other, 'xs'), r.otherName) : h('span', { class: 'wki-redlink' }, r.otherName),
      r.theyAre ? h('span', { class: 'wki-rel-label' }, ' — ' + r.theyAre) : null)));
  }

  function sections() {
    const out = [];
    const story = char.sections.filter(s => s.text?.trim() && !(s.lock?.on));
    out.push({ title: 'overview', body: [h('p', { class: 'wki-lead' }, h('b', {}, nameOf(char)), char.tagline ? ` — ${char.tagline}` : '')] });
    for (const s of story) out.push({ title: s.title || 'untitled', body: paras(s.text), edit: editLink(aboutLink) });
    const rel = relationships();
    if (rel) out.push({ title: 'relationships', body: [rel], edit: editLink(`#/${ctx.base}/relationships`) });
    for (const x of d.extra) if (x.title.trim() || x.text.trim()) out.push({ title: x.title || 'untitled', body: paras(x.text), edit: editWiki() });
    if (d.trivia.some(t => t.text.trim())) out.push({ title: 'trivia', body: [h('ul', { class: 'wki-trivia' }, d.trivia.filter(t => t.text.trim()).map(t => h('li', {}, t.text)))], edit: editWiki() });
    return out;
  }

  function editor() {
    const list = h('div', { class: 'wki-ed-list' });
    const drawList = () => fill(list,
      h('div', { class: 'wki-ed-block' },
        h('div', { class: 'wki-ed-label' }, 'quote'),
        autosize(h('textarea', { rows: 2, maxLength: 300, placeholder: 'quote', value: d.quote, oninput: e => { d.quote = e.target.value; ctx.save(); } })),
        h('input', { type: 'text', maxLength: 60, placeholder: 'who said it', value: d.quoteBy, oninput: e => { d.quoteBy = e.target.value; ctx.save(); } })),
      d.extra.map((x, i) => h('div', { class: 'wki-ed-block' },
        h('div', { class: 'wki-ed-head' },
          h('input', { type: 'text', class: 'wki-ed-title', maxLength: 60, placeholder: 'section title', value: x.title, oninput: e => { x.title = e.target.value; ctx.save(); } }),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => { d.extra.splice(i - 1, 0, d.extra.splice(i, 1)[0]); ctx.save(); drawList(); } }, '↑'),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: async () => {
            if ((x.text.trim() || x.title.trim()) && !await confirmDialog(`remove "${x.title || 'untitled'}"?`, { okLabel: 'remove', danger: true })) return;
            d.extra = d.extra.filter(y => y !== x); ctx.save(); drawList();
          } }, '✕')),
        autosize(h('textarea', { rows: 4, maxLength: 6000, placeholder: '...', value: x.text, oninput: e => { x.text = e.target.value; ctx.save(); } })))),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.extra.push({ id: 'wx_' + uid(), title: '', text: '' }); ctx.save(); drawList(); list.querySelectorAll('.wki-ed-title')[d.extra.length - 1]?.focus(); } }, '+ section'),
      h('div', { class: 'wki-ed-block' },
        h('div', { class: 'wki-ed-label' }, 'trivia'),
        d.trivia.map(t => h('div', { class: 'wki-ed-head' },
          h('input', { type: 'text', class: 'wki-ed-trivia', maxLength: 240, placeholder: 'fact', value: t.text, oninput: e => { t.text = e.target.value; ctx.save(); } }),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { d.trivia = d.trivia.filter(y => y !== t); ctx.save(); drawList(); } }, '✕'))),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.trivia.push({ id: 'wt_' + uid(), text: '' }); ctx.save(); drawList(); [...list.querySelectorAll('.wki-ed-trivia')].at(-1)?.focus(); } }, '+ fact')));
    drawList();
    return h('div', { class: 'wki-editor' }, list);
  }

  function draw() {
    const secs = sections();
    const tags = char.tags.filter(Boolean);
    fill(box,
      appBar(ctx, meta, mine ? h('button', { class: 'btn sm ' + (editing ? 'primary' : 'ghost'), onclick: () => { editing = !editing; draw(); } }, editing ? 'done' : 'edit wiki') : null),
      h('div', { class: 'wki-page', style: { '--c': char.color } },
        h('div', { class: 'wki-top' },
          h('div', { class: 'wki-site' }, h('span', { class: 'wki-site-logo' }, 'W'), h('span', {}, `${(store.worldsOf(char.id)[0]?.name || 'oc')} wiki`)),
          h('div', { class: 'wki-search' }, nameOf(char))),
        h('h1', { class: 'wki-title' }, nameOf(char)),
        h('div', { class: 'wki-sub' }, 'from the ', store.worldsOf(char.id)[0]?.name || 'oc', ' wiki'),
        editing ? editor() : h('div', { class: 'wki-body' },
          infobox(),
          d.quote.trim() ? h('blockquote', { class: 'wki-quote' }, h('span', {}, d.quote), d.quoteBy.trim() ? h('cite', {}, '— ' + d.quoteBy) : null) : null,
          h('section', { class: 'wki-sec' }, secs[0].body),
          secs.length > 2 ? h('nav', { class: 'wki-toc' }, h('div', { class: 'wki-toc-title' }, 'contents'),
            h('ol', {}, secs.slice(1).map(s => h('li', {}, h('a', { href: '#', onclick: e => { e.preventDefault(); box.querySelector('#' + slug(s.title))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, s.title))))) : null,
          secs.slice(1).map(s => h('section', { class: 'wki-sec', id: slug(s.title) },
            h('h2', { class: 'wki-h2' }, h('span', {}, s.title), s.edit),
            s.body))),
        tags.length ? h('div', { class: 'wki-cats' }, h('b', {}, 'categories:'), tags.map(t => h('span', { class: 'wki-cat' }, t))) : null));
  }
  draw();
  el.append(box);
}
