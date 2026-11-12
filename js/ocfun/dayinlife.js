// day in their life: an hour-by-hour normal day on a timeline, with a "now" line at the real time.
// saved in char.fun.dayinlife = { items: [{ id, time: 'HH:MM', what, where, color }], clock: '12' | '24' }

import { h, fill, uid, confirmDialog, openModal, swatches, segmented } from '../ui.js';
import { appBar, nameOf } from './kit.js';

export const meta = { id: 'dayinlife', label: 'day in their life', icon: '23f0' };

const COLORS = ['#ff4fa3', '#b18cff', '#6ec6ff', '#7df9d0', '#ffd84d', '#ff8a3d', '#ff5d6c', '#9b8aa8'];
const mins = t => { const [hh, mm] = String(t || '0:0').split(':').map(Number); return (hh || 0) * 60 + (mm || 0); };

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.items ||= [];
  d.clock ||= '12';
  const box = h('div', { class: 'dil' });

  const fmt = t => {
    const m = mins(t), hh = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
    if (d.clock === '24') return `${String(hh).padStart(2, '0')}:${mm}`;
    return `${hh % 12 || 12}:${mm} ${hh < 12 ? 'am' : 'pm'}`;
  };
  const nowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

  function edit(item) {
    const isNew = !item;
    const last = d.items.length ? d.items.reduce((a, b) => (mins(a.time) > mins(b.time) ? a : b)).time : '07:00';
    item ||= { id: 'dl_' + uid(), time: isNew && d.items.length ? `${String(Math.min(23, Math.floor(mins(last) / 60) + 1)).padStart(2, '0')}:00` : '07:00', what: '', where: '', color: COLORS[d.items.length % COLORS.length] };
    const draft = { ...item };
    openModal({
      title: isNew ? 'add to their day' : nameOf(char),
      body: h('div', { class: 'dil-form' },
        h('input', { type: 'time', value: draft.time, oninput: e => { draft.time = e.target.value; } }),
        h('input', { type: 'text', maxLength: 80, placeholder: 'what', value: draft.what, 'data-autofocus': true, oninput: e => { draft.what = e.target.value; } }),
        h('input', { type: 'text', maxLength: 60, placeholder: 'where', value: draft.where, oninput: e => { draft.where = e.target.value; } }),
        swatches(draft.color, c => { draft.color = c; }, COLORS)),
      actions: [
        ...(isNew ? [] : [{ label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog('take this off their day?', { okLabel: 'delete', danger: true })) return;
          d.items = d.items.filter(x => x !== item); ctx.save(); close(); draw();
        } }]),
        { label: isNew ? 'add' : 'save', kind: 'primary', onClick: close => {
          if (!draft.what.trim() || !draft.time) { close(); return; }
          Object.assign(item, draft, { what: draft.what.trim(), where: draft.where.trim() });
          if (isNew) d.items.push(item);
          ctx.save(); close(); draw();
        } },
      ],
    });
  }

  // little clock face showing the real time
  function clockFace() {
    const n = new Date();
    const hA = ((n.getHours() % 12) + n.getMinutes() / 60) * 30, mA = n.getMinutes() * 6;
    return h('div', { class: 'dil-clock', style: { '--c': char.color } },
      Array.from({ length: 12 }, (_, i) => h('i', { class: 'dil-tick', style: { '--a': i * 30 + 'deg' } })),
      h('span', { class: 'dil-hand hr', style: { '--a': hA + 'deg' } }),
      h('span', { class: 'dil-hand mn', style: { '--a': mA + 'deg' } }),
      h('span', { class: 'dil-pin' }));
  }

  function draw() {
    const items = [...d.items].sort((a, b) => mins(a.time) - mins(b.time));
    const now = nowMins();
    const rows = [];
    let placed = false;
    const nowLine = () => h('div', { class: 'dil-now' }, h('span', { class: 'dil-now-time' }, fmt(`${Math.floor(now / 60)}:${now % 60}`)), h('i'), h('span', { class: 'dil-now-label' }, 'now'));
    items.forEach((it, i) => {
      if (!placed && mins(it.time) > now) { rows.push(nowLine()); placed = true; }
      const next = items[i + 1];
      const happening = mins(it.time) <= now && (!next || mins(next.time) > now);
      rows.push(h('div', { class: 'dil-row' + (happening ? ' on' : ''), style: { '--c': it.color } },
        h('div', { class: 'dil-time' }, fmt(it.time)),
        h('div', { class: 'dil-dot' }),
        h(mine ? 'button' : 'div', { type: mine ? 'button' : null, class: 'dil-card', onclick: mine ? () => edit(it) : null },
          h('div', { class: 'dil-what' }, it.what),
          it.where ? h('div', { class: 'dil-where' }, it.where) : null)));
    });
    if (items.length && !placed) rows.push(nowLine());
    const current = [...items].reverse().find(it => mins(it.time) <= now) || items.at(-1);
    fill(box,
      appBar(ctx, meta,
        segmented([{ value: '12', label: '12h' }, { value: '24', label: '24h' }], d.clock, v => { d.clock = v; if (mine) ctx.save(); draw(); }),
        mine ? h('button', { class: 'btn primary sm', onclick: () => edit(null) }, '+ add') : null),
      h('div', { class: 'dil-page', style: { '--c': char.color } },
        h('div', { class: 'dil-head' },
          clockFace(),
          h('div', { class: 'dil-head-text' },
            h('div', { class: 'dil-head-kicker' }, 'right now'),
            h('div', { class: 'dil-head-what' }, current ? current.what : '...'),
            current?.where ? h('div', { class: 'dil-head-where' }, current.where) : null)),
        items.length ? h('div', { class: 'dil-line' }, rows)
          : h('div', { class: 'dil-empty' }, mine ? h('button', { class: 'btn ghost', onclick: () => edit(null) }, '+ add') : '...')));
  }
  draw();
  el.append(box);
  const timer = setInterval(() => { if (box.isConnected && !document.querySelector('.modal-wrap')) draw(); }, 60000);
  return () => clearInterval(timer);
}
