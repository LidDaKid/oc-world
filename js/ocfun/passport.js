// passport: a passport booklet. the cover, then the photo page (pfp, name, birthday from their basics, where
// they're from), then stamp pages: every place they've been is a stamp (shape, color, date). flip page by page.
//
// d = { cover, from, issued, stamps: [{ id, place, date, shape, color, way: 'in' | 'out' }] }

import { h, fill, segmented, swatches, openModal, confirmDialog, uid } from '../ui.js';
import { appBar, pic, portrait, nameOf } from './kit.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'passport', label: 'passport', icon: '2708-fe0f' };

const COVERS = { burgundy: '#5e1424', navy: '#14224d', black: '#141217', pink: '#d0457f', purple: '#3c1d5c', green: '#173f2c' };
const SHAPES = ['circle', 'square', 'oval', 'triangle', 'postage', 'star'];
const INKS = ['#c0172f', '#1f3f9e', '#7a3bc0', '#16794a', '#d1489b', '#a8590c', '#222'];
const PER_PAGE = 4;
const DEF = { cover: 'burgundy', from: '', issued: '', stamps: [], number: '' };

function seeded(str) {
  let x = 11;
  for (const ch of str) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const stampDate = iso => {
  const d = iso ? new Date(iso + 'T12:00:00') : null;
  return d && !isNaN(d) ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '';
};

function stamp(s, onClick) {
  const r = seeded(s.id);
  const node = h(onClick ? 'button' : 'div', {
    type: onClick ? 'button' : undefined,
    class: `psp-stamp psp-${s.shape || 'circle'}`,
    style: { '--ink': s.color || INKS[0], '--rot': ((r() - .5) * 34).toFixed(1) + 'deg', '--dx': ((r() - .5) * 26).toFixed(0) + 'px', '--dy': ((r() - .5) * 18).toFixed(0) + 'px' },
    onclick: onClick || undefined,
  },
    h('span', { class: 'psp-way' }, s.way === 'out' ? 'departed' : 'admitted'),
    h('span', { class: 'psp-place' }, s.place || '???'),
    h('span', { class: 'psp-date' }, stampDate(s.date)));
  return node;
}

export function render(el, ctx) {
  const { char } = ctx;
  const d = defaults(ctx.data, DEF);
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  if (!d.number) { const r = seeded(char.id); d.number = String.fromCharCode(65 + Math.floor(r() * 26)) + String(Math.floor(r() * 9e7) + 1e7); }
  let at = -1; // -1 = closed cover, 0 = photo spread, 1.. = stamp spreads
  const book = h('div', { class: 'psp-wrap' });
  const nav = h('div', { class: 'psp-nav' });
  el.append(appBar(ctx, meta, edit ? h('button', { class: 'btn ghost sm', onclick: details }, 'details') : null,
    edit ? h('button', { class: 'btn primary sm', onclick: () => editStamp(null) }, '+ stamp') : null), book, nav);

  const birthday = () => char.basics.find(b => /birthday/i.test(b.label))?.value?.trim() || '';
  const spreads = () => 1 + Math.max(1, Math.ceil(d.stamps.length / (PER_PAGE * 2)));
  const mrz = () => {
    const parts = (nameOf(char) || 'OC').toUpperCase().replace(/[^A-Z ]/g, '').trim().split(/\s+/);
    const sur = parts.length > 1 ? parts.pop() : parts[0];
    const given = parts.length ? parts.join('<') : '';
    const line1 = `P<OCW${sur}<<${given}`.padEnd(44, '<').slice(0, 44);
    const line2 = `${d.number}<0OCW${(birthday().replace(/\D/g, '') || '000000').slice(0, 6).padEnd(6, '0')}<F${'9'.repeat(6)}`.padEnd(44, '<').slice(0, 44);
    return [line1, line2];
  };

  function draw() {
    const n = spreads();
    at = Math.max(-1, Math.min(n - 1, at));
    book.style.setProperty('--cover', COVERS[d.cover] || COVERS.burgundy);
    if (at === -1) {
      fill(book, h('button', { type: 'button', class: 'psp-cover', onclick: () => { at = 0; draw(); } },
        h('span', { class: 'psp-cover-top' }, 'passport'),
        h('span', { class: 'psp-crest' }, h('span', {}, '✦'), h('i', {}), h('i', {})),
        h('span', { class: 'psp-cover-bottom' }, 'oc world'),
        h('span', { class: 'psp-chip' })));
    } else if (at === 0) {
      fill(book, h('div', { class: 'psp-spread' },
        h('div', { class: 'psp-page psp-left' },
          h('div', { class: 'psp-watermark' }),
          h('div', { class: 'psp-sig' }, nameOf(char)),
          h('div', { class: 'psp-sig-title' }, 'signature of bearer'),
          h('div', { class: 'psp-visa' }, 'visas')),
        h('div', { class: 'psp-page psp-right psp-id' },
          h('div', { class: 'psp-watermark' }),
          h('div', { class: 'psp-id-head' }, h('span', {}, 'passport'), h('span', {}, 'P'), h('span', {}, 'OCW'), h('span', {}, d.number)),
          h('div', { class: 'psp-id-body' },
            h('div', { class: 'psp-photo' }, char.imageId ? pic(char.imageId, 'psp-photo-img') : portrait(char, 'psp-photo-pfp')),
            h('div', { class: 'psp-fields' },
              row('name', nameOf(char)),
              row('nationality', d.from || 'oc world'),
              row('date of birth', birthday() || '—'),
              row('place of issue', d.issued || d.from || '—'),
              row('date of issue', stampDate(new Date(char.createdAt || Date.now()).toISOString().slice(0, 10))))),
          h('div', { class: 'psp-mrz' }, mrz().map(l => h('div', {}, l))))));
    } else {
      const start = (at - 1) * PER_PAGE * 2;
      const page = (list, side, num) => h('div', { class: `psp-page psp-${side} psp-stamps` },
        h('div', { class: 'psp-watermark' }),
        h('div', { class: 'psp-stamp-grid' }, list.map(s => stamp(s, edit ? () => editStamp(s) : null))),
        h('div', { class: 'psp-num' }, String(num)));
      fill(book, h('div', { class: 'psp-spread' },
        page(d.stamps.slice(start, start + PER_PAGE), 'left', at * 2),
        page(d.stamps.slice(start + PER_PAGE, start + PER_PAGE * 2), 'right', at * 2 + 1)));
    }
    fill(nav,
      h('button', { class: 'btn ghost sm', disabled: at === -1, onclick: () => { at--; draw(); } }, '‹ back'),
      h('span', { class: 'psp-pg' }, at === -1 ? 'cover' : at === 0 ? 'photo page' : `stamps ${at} / ${n - 1}`),
      h('button', { class: 'btn ghost sm', disabled: at >= n - 1, onclick: () => { at++; draw(); } }, 'next ›'));
  }
  const row = (k, v) => h('div', { class: 'psp-row' }, h('span', {}, k), h('b', {}, v));

  function details() {
    const field = (label, input) => h('label', { class: 'psp-field' }, h('span', {}, label), input);
    openModal({
      title: 'passport',
      body: h('div', { class: 'psp-form' },
        field('nationality', h('input', { type: 'text', value: d.from || '', maxLength: 40, placeholder: 'oc world', oninput: e => { d.from = e.target.value; save(); draw(); } })),
        field('place of issue', h('input', { type: 'text', value: d.issued || '', maxLength: 40, placeholder: 'city', oninput: e => { d.issued = e.target.value; save(); draw(); } })),
        field('cover', swatches(COVERS[d.cover], c => { d.cover = Object.keys(COVERS).find(k => COVERS[k] === c) || 'burgundy'; save(); draw(); }, Object.values(COVERS)))),
      actions: [{ label: 'done', kind: 'primary', onClick: close => close() }],
    });
  }

  function editStamp(s) {
    const fresh = !s;
    const draft = s ? { ...s } : { id: 'st_' + uid(), place: '', date: new Date().toISOString().slice(0, 10), shape: SHAPES[d.stamps.length % SHAPES.length], color: INKS[d.stamps.length % INKS.length], way: 'in' };
    const prev = h('div', { class: 'psp-prev' });
    const redo = () => fill(prev, stamp(draft));
    const field = (label, input) => h('label', { class: 'psp-field' }, h('span', {}, label), input);
    redo();
    openModal({
      title: fresh ? 'new stamp' : 'stamp',
      body: h('div', { class: 'psp-stamp-edit' },
        h('div', { class: 'psp-form' },
          field('place', h('input', { type: 'text', value: draft.place, maxLength: 28, placeholder: 'paris', 'data-autofocus': true, oninput: e => { draft.place = e.target.value; redo(); } })),
          field('date', h('input', { type: 'date', value: draft.date, onchange: e => { draft.date = e.target.value; redo(); } })),
          field('stamp', segmented([{ value: 'in', label: 'arriving' }, { value: 'out', label: 'leaving' }], draft.way, v => { draft.way = v; redo(); })),
          field('shape', segmented(SHAPES.map(v => ({ value: v, label: v })), draft.shape, v => { draft.shape = v; redo(); })),
          field('ink', swatches(draft.color, c => { draft.color = c; redo(); }, INKS))),
        prev),
      actions: [
        ...(fresh ? [] : [{ label: 'remove', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('remove this stamp?', { okLabel: 'remove', danger: true })) return;
          d.stamps = d.stamps.filter(x => x.id !== s.id); save(); draw(); close();
        } }]),
        { label: fresh ? 'stamp it' : 'done', kind: 'primary', onClick: close => {
          if (fresh) { d.stamps.push(draft); at = 1 + Math.floor((d.stamps.length - 1) / (PER_PAGE * 2)); } else Object.assign(s, draft);
          save(); draw(); close();
        } },
      ],
    });
  }

  draw();
}
