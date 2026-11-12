// receipts: a pile of crumpled receipts of what they bought. store, when, what, how they paid, and a scribbled
// note in pen on top. thermal paper, dashed lines, a barcode, torn edges. tap one to open it.
//
// d.receipts = [{ id, store, place, date, time, items: [{ name, qty, price }], tax, pay, note, footer, color }]

import { h, fill, segmented, openModal, confirmDialog, uid } from '../ui.js';
import { appBar } from './kit.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'receipts', label: 'receipts', icon: '1f9fe' };

const PAYS = ['cash', 'card', 'gift card', 'parents card', 'stolen'];
const PAPERS = { white: '#fbfaf5', pink: '#ffe3ef', yellow: '#fff8d2', blue: '#e4f1ff' };
const money = n => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const today = () => new Date().toISOString().slice(0, 10);

const DEF = { receipts: null };
const starter = d => {
  d.receipts = [{
    id: 'rc_' + uid(), store: 'night owl cafe', place: '', date: today(), time: '23:48', tax: 8,
    items: [{ name: 'iced latte', qty: 1, price: 5.25 }, { name: 'black cat cookie', qty: 2, price: 3.5 }],
    pay: 'card', note: 'study date??', footer: 'thank you', color: 'white',
  }];
};

// the same id always draws the same barcode + card number
function seeded(str) {
  let x = 0;
  for (const ch of str) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function barcode(id) {
  const r = seeded(id);
  const stops = [];
  let at = 0;
  while (at < 100) {
    const w = 1 + Math.floor(r() * 3) * .9, gap = .7 + Math.floor(r() * 3) * .8;
    stops.push(`#1a1320 ${at.toFixed(1)}% ${(at + w).toFixed(1)}%`, `transparent ${(at + w).toFixed(1)}% ${(at + w + gap).toFixed(1)}%`);
    at += w + gap;
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
const totals = rc => {
  const sub = (rc.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  const tax = sub * (Number(rc.tax) || 0) / 100;
  return { sub, tax, total: sub + tax };
};
const niceDate = rc => {
  const d = rc.date ? new Date(rc.date + 'T12:00:00') : null;
  return `${d && !isNaN(d) ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}` : '--/--/--'}  ${rc.time || ''}`;
};

export function receipt(rc, big = false) {
  const { sub, tax, total } = totals(rc);
  const r = seeded(rc.id);
  const last4 = String(1000 + Math.floor(r() * 9000));
  const row = (a, b, cls = '') => h('div', { class: 'rc-row ' + cls }, h('span', {}, a), h('span', {}, b));
  return h('div', { class: 'rc-paper' + (big ? ' big' : ''), style: { '--paper': PAPERS[rc.color] || PAPERS.white } },
    h('div', { class: 'rc-store' }, rc.store || 'store'),
    rc.place ? h('div', { class: 'rc-small' }, rc.place) : null,
    h('div', { class: 'rc-small' }, niceDate(rc)),
    h('div', { class: 'rc-small' }, `#${String(Math.floor(r() * 90000) + 10000)}  reg ${1 + Math.floor(r() * 6)}`),
    h('div', { class: 'rc-line' }),
    (rc.items || []).map(it => h('div', { class: 'rc-item' },
      h('span', { class: 'rc-name' }, `${(Number(it.qty) || 1) > 1 ? it.qty + ' x ' : ''}${it.name || 'item'}`),
      h('span', {}, money((Number(it.price) || 0) * (Number(it.qty) || 1))))),
    h('div', { class: 'rc-line' }),
    row('subtotal', money(sub)),
    Number(rc.tax) ? row(`tax ${rc.tax}%`, money(tax)) : null,
    row('total', money(total), 'rc-total'),
    row(rc.pay === 'card' || rc.pay === 'parents card' ? `${rc.pay} ****${last4}` : rc.pay || 'cash', money(total)),
    h('div', { class: 'rc-line' }),
    rc.footer ? h('div', { class: 'rc-foot' }, rc.footer) : null,
    h('div', { class: 'rc-bar', style: { background: barcode(rc.id) } }),
    h('div', { class: 'rc-small rc-code' }, String(Math.floor(r() * 9e11) + 1e11)),
    rc.note ? h('div', { class: 'rc-note' }, rc.note) : null);
}

export function render(el, ctx) {
  const d = defaults(ctx.data, DEF);
  if (!Array.isArray(d.receipts)) { starter(d); if (ctx.mine) ctx.save(); }
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  const pile = h('div', { class: 'rc-pile' });
  el.append(appBar(ctx, meta, edit ? h('button', { class: 'btn primary sm', onclick: () => { const rc = blank(); d.receipts.unshift(rc); save(); draw(); open(rc); } }, '+ receipt') : null), pile);

  const blank = () => ({ id: 'rc_' + uid(), store: '', place: '', date: today(), time: new Date().toTimeString().slice(0, 5), tax: 0, items: [{ name: '', qty: 1, price: 0 }], pay: 'card', note: '', footer: 'thank you', color: 'white' });

  function draw() {
    const tilt = id => { const r = seeded(id); return ((r() - .5) * 8).toFixed(1) + 'deg'; };
    fill(pile, d.receipts.map(rc => h('button', { type: 'button', class: 'rc-pick', style: { '--tilt': tilt(rc.id) }, onclick: () => open(rc) }, receipt(rc))));
  }

  function open(rc) {
    if (!edit) { openModal({ title: rc.store || 'receipt', body: h('div', { class: 'rc-view' }, receipt(rc, true)) }); return; }
    const prev = h('div', { class: 'rc-view' });
    const redraw = () => { fill(prev, receipt(rc, true)); save(); draw(); };
    const field = (label, input) => h('label', { class: 'rc-field' }, h('span', {}, label), input);
    const text = (key, ph, max = 40) => h('input', { type: 'text', value: rc[key] || '', placeholder: ph, maxLength: max, oninput: e => { rc[key] = e.target.value; redraw(); } });
    const itemsBox = h('div', { class: 'rc-items-edit' });
    const drawItems = () => fill(itemsBox, rc.items.map(it => h('div', { class: 'rc-item-edit' },
      h('input', { type: 'text', value: it.name || '', placeholder: 'item', maxLength: 32, oninput: e => { it.name = e.target.value; redraw(); } }),
      h('input', { type: 'number', min: 1, max: 99, value: it.qty || 1, title: 'how many', oninput: e => { it.qty = Math.max(1, +e.target.value || 1); redraw(); } }),
      h('input', { type: 'number', min: 0, step: .01, value: it.price || '', placeholder: '0.00', title: 'price', oninput: e => { it.price = +e.target.value || 0; redraw(); } }),
      h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { rc.items = rc.items.filter(x => x !== it); drawItems(); redraw(); } }, '✕'))),
    h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { rc.items.push({ name: '', qty: 1, price: 0 }); drawItems(); redraw(); } }, '+ item'));
    drawItems();
    const form = h('div', { class: 'rc-form' },
      field('store', text('store', 'store')),
      field('where', text('place', 'street, city', 50)),
      h('div', { class: 'rc-two' },
        field('date', h('input', { type: 'date', value: rc.date || '', onchange: e => { rc.date = e.target.value; redraw(); } })),
        field('time', h('input', { type: 'time', value: rc.time || '', onchange: e => { rc.time = e.target.value; redraw(); } }))),
      field('bought', itemsBox),
      h('div', { class: 'rc-two' },
        field('tax %', h('input', { type: 'number', min: 0, max: 30, step: .25, value: rc.tax || 0, oninput: e => { rc.tax = +e.target.value || 0; redraw(); } })),
        field('paper', segmented(Object.keys(PAPERS).map(v => ({ value: v, label: v })), rc.color || 'white', v => { rc.color = v; redraw(); }))),
      field('paid with', segmented(PAYS.map(v => ({ value: v, label: v })), rc.pay || 'cash', v => { rc.pay = v; redraw(); })),
      field('bottom line', text('footer', 'thank you')),
      field('scribbled note', h('textarea', { rows: 2, maxLength: 120, value: rc.note || '', placeholder: 'note', oninput: e => { rc.note = e.target.value; redraw(); } })));
    fill(prev, receipt(rc, true));
    openModal({
      title: 'receipt', wide: true,
      body: h('div', { class: 'rc-edit' }, form, prev),
      actions: [
        { label: 'throw it away', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('throw this receipt away?', { okLabel: 'throw it away', danger: true })) return;
          d.receipts = d.receipts.filter(x => x !== rc);
          save(); draw(); close();
        } },
        { label: 'done', kind: 'primary', onClick: close => close() },
      ],
    });
  }

  draw();
}
