// calendar: a world's own calendar (real or made up), its holidays (every year) and events (once).
// oc birthdays show up too, read from their "birthday" basic.
// shapes are at the top of model.js

import { store } from '../store.js';
import { h, fill, uid, toast, openModal, confirmDialog, swatches, segmented, field, autosize, shrinkImage } from '../ui.js';
import { portrait, nameOf, picOr, pickStickerIcon } from '../parts.js';
import { stickerNode } from '../diary/stickers.js';
import { pickAndCrop } from '../crop.js';
import { realMonths, REAL_MONTHS, REAL_WEEKDAYS } from '../model.js';

const EMOJI = ['🎉', '🎂', '🎃', '🎄', '💝', '🎆', '🕯️', '🌙', '☀️', '🌸', '🍂', '❄️', '👑', '⚔️', '💀', '🔥', '🌊', '⭐', '🦇', '🍰', '🎭', '🎶', '🕊️', '💍', '⚰️', '🌹', '🪦', '🏆', '📜', '🗝️', '🔮', '🩸'];

// ---- calendar math ----
// a date is { y, m, d }. m starts at 0, d at 1. real calendars use real leap years + weekdays.

const real = cal => cal.kind !== 'custom';
const weekdays = cal => (real(cal) ? REAL_WEEKDAYS : cal.weekdays);
const months = cal => (real(cal) ? realMonths() : cal.months);
const monthName = (cal, m) => months(cal)[m]?.name || `month ${m + 1}`;
const yearLen = cal => months(cal).reduce((n, x) => n + x.days, 0);

function jsDate(y, m, d) {
  const t = new Date(Date.UTC(2000, 0, 1));
  t.setUTCFullYear(y, m, d);
  return t;
}

export function daysIn(cal, y, m) {
  if (real(cal)) return jsDate(y, m + 1, 0).getUTCDate();
  return Math.max(1, months(cal)[m]?.days || 1);
}

// one number per day, so two dates can be subtracted
export function dayNum(cal, { y, m, d }) {
  if (real(cal)) return Math.round(jsDate(y, m, d).getTime() / 86400000);
  let n = y * yearLen(cal);
  for (let i = 0; i < m; i++) n += months(cal)[i].days;
  return n + d - 1;
}

const mod = (a, n) => ((a % n) + n) % n;
export function weekdayOf(cal, date) {
  if (real(cal)) return jsDate(date.y, date.m, date.d).getUTCDay();
  return mod(dayNum(cal, date), weekdays(cal).length);
}

const clampDay = (cal, y, m, d) => Math.min(Math.max(1, d), daysIn(cal, y, m));
const yearText = (cal, y) => `${y}${cal.era ? ' ' + cal.era : ''}`;
export const dateText = (cal, { y, m, d }, withYear = true) => `${monthName(cal, m)} ${d}${withYear ? ', ' + yearText(cal, y) : ''}`;

// "in 3 days", "2 years ago"
function howFar(cal, diff) {
  if (diff === 0) return 'today';
  const a = Math.abs(diff), yl = real(cal) ? 365.25 : yearLen(cal), ml = yl / months(cal).length;
  const [n, word] = a >= yl ? [Math.floor(a / yl), 'year'] : a >= ml * 2 ? [Math.floor(a / ml), 'month'] : [a, 'day'];
  const s = `${n} ${word}${n === 1 ? '' : 's'}`;
  return diff > 0 ? `in ${s}` : `${s} ago`;
}

// the next time a holiday comes around, counting today
function nextTime(cal, hol) {
  const now = cal.now;
  for (const y of [now.y, now.y + 1]) {
    const date = { y, m: hol.m, d: clampDay(cal, y, hol.m, hol.d) };
    if (dayNum(cal, date) + (hol.len || 1) - 1 >= dayNum(cal, now)) return date;
  }
  return { y: now.y + 1, m: hol.m, d: hol.d };
}

// "october 31", "oct 31st", "31 october", "10/31" -> { m, d }
export function readBirthday(cal, text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  const list = months(cal);
  let m = -1;
  list.forEach((x, i) => { if (m < 0 && x.name && new RegExp(`(^|[^a-z])${x.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)) m = i; });
  if (m < 0 && real(cal)) REAL_MONTHS.forEach((x, i) => { if (m < 0 && new RegExp(`(^|[^a-z])${x.slice(0, 3)}`).test(t)) m = i; });
  if (m >= 0) {
    const num = [...t.matchAll(/(\d+)(st|nd|rd|th)?/g)].map(x => +x[1]).find(n => n >= 1 && n <= list[m].days);
    return num ? { m, d: num } : null;
  }
  if (real(cal)) {
    const slash = /^\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})/.exec(t);
    if (slash && +slash[1] >= 1 && +slash[1] <= 12 && +slash[2] >= 1 && +slash[2] <= REAL_MONTHS.length * 3) {
      const mm = +slash[1] - 1;
      if (+slash[2] <= list[mm].days) return { m: mm, d: +slash[2] };
    }
  }
  return null;
}

const birthdayOf = c => c.basics.find(b => /birthday|bday|birth date|born/i.test(b.label))?.value || '';

// everything on one day: [{ kind, item, date }]
function onDay(world, date) {
  const cal = world.calendar, n = dayNum(cal, date), out = [];
  for (const hol of world.holidays) {
    for (const y of [date.y, date.y - 1]) {
      if (hol.m >= months(cal).length) continue;
      const start = dayNum(cal, { y, m: hol.m, d: clampDay(cal, y, hol.m, hol.d) });
      if (n >= start && n < start + (hol.len || 1)) { out.push({ kind: 'holiday', item: hol }); break; }
    }
  }
  for (const ev of world.events) {
    if (ev.m >= months(cal).length) continue;
    const start = dayNum(cal, { y: ev.y, m: ev.m, d: clampDay(cal, ev.y, ev.m, ev.d) });
    if (n >= start && n < start + (ev.len || 1)) out.push({ kind: 'event', item: ev });
  }
  for (const id of world.charIds) {
    const c = store.char(id);
    const b = c && readBirthday(cal, birthdayOf(c));
    if (b && b.m === date.m && clampDay(cal, date.y, b.m, b.d) === date.d) out.push({ kind: 'birthday', item: c });
  }
  return out;
}

const iconOf = x => (x.sticker ? h('span', { class: 'pic-icon stk-icon cal-ico' }, stickerNode(x.sticker)) : h('span', { class: 'cal-ico' }, x.emoji || '⭐'));

// ---- the page ----

const views = new Map(); // world id -> { mode, y, m }, so a collab refresh doesn't lose your place

export function render(el, { world, save }) {
  const cal = world.calendar;
  const st = views.get(world.id) || { mode: 'month', y: cal.now.y, m: Math.min(cal.now.m, months(cal).length - 1) };
  views.set(world.id, st);
  st.m = Math.min(st.m, months(cal).length - 1);

  const title = h('button', { class: 'cal-title', onclick: () => { st.mode = st.mode === 'year' ? 'month' : 'year'; draw(); } });
  const body = h('div', { class: 'cal-body' });
  const modes = h('div');
  const step = dir => {
    if (st.mode === 'year') st.y += dir;
    else {
      st.m += dir;
      if (st.m < 0) { st.y--; st.m = months(cal).length - 1; }
      if (st.m >= months(cal).length) { st.y++; st.m = 0; }
    }
    draw();
  };

  el.append(h('div', { class: 'cal', style: { '--c': world.color } },
    h('div', { class: 'cal-head' },
      h('div', { class: 'cal-nav' },
        h('button', { class: 'icon-btn', title: 'back', onclick: () => step(-1) }, '‹'),
        title,
        h('button', { class: 'icon-btn', title: 'next', onclick: () => step(1) }, '›'),
        h('button', { class: 'btn ghost sm', onclick: () => { st.y = cal.now.y; st.m = cal.now.m; if (st.mode === 'list') st.mode = 'month'; draw(); } }, 'today')),
      modes,
      h('div', { class: 'page-head-actions' },
        h('button', { class: 'btn ghost sm', onclick: settings }, '⚙ calendar'),
        h('button', { class: 'btn ghost sm cal-add-hol', onclick: () => editHoliday(null, { m: st.m, d: 1 }) }, '+ holiday'),
        h('button', { class: 'btn primary sm cal-add-ev', onclick: () => editEvent(null, { y: st.y, m: st.m, d: 1 }) }, '+ event'))),
    body));

  function draw() {
    fill(modes, segmented([{ value: 'month', label: 'month' }, { value: 'year', label: 'year' }, { value: 'list', label: 'list' }], st.mode, v => { st.mode = v; draw(); }));
    title.textContent = st.mode === 'year' ? yearText(cal, st.y) : st.mode === 'list' ? `${dateText(cal, cal.now)}` : `${monthName(cal, st.m)} ${yearText(cal, st.y)}`;
    title.disabled = st.mode === 'list';
    el.querySelector('.cal-nav').classList.toggle('no-step', st.mode === 'list');
    fill(body, st.mode === 'year' ? yearView() : st.mode === 'list' ? listView() : monthView());
  }

  // ---- month ----
  function monthView() {
    const wd = weekdays(cal).length;
    const grid = h('div', { class: 'cal-grid', style: { '--wd': wd } },
      weekdays(cal).map(name => h('div', { class: 'cal-wd', title: name }, name.slice(0, 3))));
    const first = weekdayOf(cal, { y: st.y, m: st.m, d: 1 });
    for (let i = 0; i < first; i++) grid.append(h('div', { class: 'cal-day blank' }));
    const nowN = dayNum(cal, cal.now);
    for (let d = 1; d <= daysIn(cal, st.y, st.m); d++) {
      const date = { y: st.y, m: st.m, d };
      const things = onDay(world, date);
      grid.append(h('div', {
        class: 'cal-day' + (dayNum(cal, date) === nowN ? ' now' : '') + (things.length ? ' busy' : ''),
        dataset: { d },
        onclick: e => { if (!e.target.closest('.cal-chip')) dayBox(date); },
      },
        h('span', { class: 'cal-num' }, d),
        h('div', { class: 'cal-chips' }, things.map(chip))));
    }
    return grid;
  }

  function chip({ kind, item }, inBox) {
    const shut = e => { if (inBox) e.target.closest('.modal-wrap')?.querySelector('.modal-head .icon-btn')?.click(); };
    if (kind === 'birthday') {
      return h('a', { class: 'cal-chip bday', href: `#/w/${world.id}/ocs/${item.id}`, style: { '--c': item.color }, title: `${nameOf(item)}'s birthday`, onclick: shut },
        portrait(item, 'cal-pfp'), h('span', { class: 'cal-chip-name' }, nameOf(item)), h('span', { class: 'cal-ico' }, '🎂'));
    }
    return h('button', { class: `cal-chip ${kind}`, style: { '--c': item.color }, title: item.name, onclick: e => { shut(e); kind === 'holiday' ? editHoliday(item) : editEvent(item); } },
      iconOf(item), h('span', { class: 'cal-chip-name' }, item.name || 'untitled'));
  }

  function dayBox(date) {
    const things = onDay(world, date);
    const isNow = dayNum(cal, date) === dayNum(cal, cal.now);
    openModal({
      title: `${weekdays(cal)[weekdayOf(cal, date)]}, ${dateText(cal, date)}`,
      body: h('div', { class: 'cal-daybox' }, things.length ? h('div', { class: 'cal-chips big' }, things.map(c => chip(c, true))) : null),
      actions: [
        ...(isNow ? [] : [{ label: 'make this today', onClick: close => { cal.now = { ...date }; save(); close(); draw(); } }]),
        { label: '+ holiday', onClick: close => { close(); editHoliday(null, date); } },
        { label: '+ event', kind: 'primary', onClick: close => { close(); editEvent(null, date); } },
      ],
    });
  }

  // ---- year ----
  function yearView() {
    const nowN = dayNum(cal, cal.now);
    return h('div', { class: 'cal-year' }, months(cal).map((mo, m) => {
      const wd = weekdays(cal).length;
      const mini = h('div', { class: 'cal-mini-grid', style: { '--wd': wd } });
      const first = weekdayOf(cal, { y: st.y, m, d: 1 });
      for (let i = 0; i < first; i++) mini.append(h('span'));
      for (let d = 1; d <= daysIn(cal, st.y, m); d++) {
        const date = { y: st.y, m, d };
        const things = onDay(world, date);
        const top = things.find(x => x.kind !== 'birthday') || things[0];
        mini.append(h('span', {
          class: 'cal-mini-day' + (things.length ? ' busy' : '') + (dayNum(cal, date) === nowN ? ' now' : ''),
          style: top ? { '--c': top.item.color } : null,
          title: things.map(x => x.kind === 'birthday' ? `${nameOf(x.item)}'s birthday` : x.item.name).join(', '),
        }, d));
      }
      return h('button', { class: 'cal-mini', onclick: () => { st.m = m; st.mode = 'month'; draw(); } },
        h('div', { class: 'cal-mini-name' }, mo.name), mini);
    }));
  }

  // ---- list ----
  function listView() {
    const nowN = dayNum(cal, cal.now);
    const hols = world.holidays.filter(x => x.m < months(cal).length).map(x => ({ x, date: nextTime(cal, x) }))
      .sort((a, b) => dayNum(cal, a.date) - dayNum(cal, b.date));
    const evs = world.events.filter(x => x.m < months(cal).length).map(x => ({ x, date: { y: x.y, m: x.m, d: clampDay(cal, x.y, x.m, x.d) } }))
      .sort((a, b) => dayNum(cal, a.date) - dayNum(cal, b.date));
    const row = (x, date, kind, withYear) => h('button', { class: `cal-row ${kind}`, style: { '--c': x.color }, onclick: () => (kind === 'holiday' ? editHoliday(x) : editEvent(x)) },
      h('span', { class: 'cal-row-icon' }, x.imageId ? picOr(x.imageId) : iconOf(x)),
      h('span', { class: 'cal-row-text' },
        h('b', {}, x.name || 'untitled'),
        h('span', { class: 'muted' }, dateText(cal, date, withYear) + ((x.len || 1) > 1 ? ` · ${x.len} days` : ''))),
      kind === 'event' && x.ocs.length ? h('span', { class: 'cal-row-ocs' }, x.ocs.map(id => store.char(id)).filter(Boolean).slice(0, 5).map(c => portrait(c, 'cal-pfp'))) : null,
      h('span', { class: 'cal-when' }, howFar(cal, dayNum(cal, date) - nowN)));
    const bdays = world.charIds.map(id => store.char(id)).filter(Boolean)
      .map(c => ({ c, b: readBirthday(cal, birthdayOf(c)) })).filter(x => x.b)
      .map(({ c, b }) => ({ c, date: nextTime(cal, { m: b.m, d: b.d, len: 1 }) }))
      .sort((a, b) => dayNum(cal, a.date) - dayNum(cal, b.date));
    return h('div', { class: 'cal-lists' },
      h('section', { class: 'cal-list' }, h('h2', {}, 'holidays'),
        hols.length ? hols.map(({ x, date }) => row(x, date, 'holiday', false)) : h('button', { class: 'chip dashed', onclick: () => editHoliday(null, { m: cal.now.m, d: cal.now.d }) }, '+ holiday')),
      h('section', { class: 'cal-list' }, h('h2', {}, 'events'),
        evs.length ? evs.map(({ x, date }) => row(x, date, 'event', true)) : h('button', { class: 'chip dashed', onclick: () => editEvent(null, { ...cal.now }) }, '+ event')),
      bdays.length ? h('section', { class: 'cal-list' }, h('h2', {}, 'birthdays'),
        bdays.map(({ c, date }) => h('a', { class: 'cal-row', href: `#/w/${world.id}/ocs/${c.id}`, style: { '--c': c.color } },
          h('span', { class: 'cal-row-icon' }, portrait(c, 'cal-pfp big')),
          h('span', { class: 'cal-row-text' }, h('b', {}, nameOf(c)), h('span', { class: 'muted' }, dateText(cal, date, false))),
          h('span', { class: 'cal-when' }, howFar(cal, dayNum(cal, date) - nowN))))) : null);
  }

  // ---- the box for a holiday / event ----

  function dateFields(draft, withYear) {
    const daySel = h('input', { type: 'number', class: 'cal-in cal-in-d', min: 1, value: draft.d, oninput: e => { draft.d = Math.max(1, parseInt(e.target.value, 10) || 1); } });
    const fixMax = () => { daySel.max = withYear ? daysIn(cal, draft.y, draft.m) : months(cal)[draft.m].days; };
    fixMax();
    return h('div', { class: 'cal-date-row' },
      h('select', { class: 'cal-in-m', onchange: e => { draft.m = +e.target.value; fixMax(); } }, months(cal).map((mo, i) => h('option', { value: i, selected: i === draft.m }, mo.name))),
      daySel,
      withYear ? h('input', { type: 'number', class: 'cal-in cal-in-y', value: draft.y, oninput: e => { draft.y = parseInt(e.target.value, 10) || 0; fixMax(); } }) : null,
      withYear && cal.era ? h('span', { class: 'muted' }, cal.era) : null);
  }

  function editor(kind, item, start) {
    const isNew = !item;
    const draft = item ? structuredClone(item) : {
      id: (kind === 'event' ? 'e_' : 'h_') + uid(), name: '', emoji: kind === 'event' ? '⭐' : '🎉', sticker: null,
      color: world.color, m: start.m, d: start.d, len: 1, about: '', imageId: null,
      ...(kind === 'event' ? { y: start.y, ocs: [], place: null } : {}),
    };
    const uploads = [];
    let saved = false;

    const iconRow = h('div', { class: 'cal-icon-row' });
    const drawIcon = () => fill(iconRow,
      h('div', { class: 'emoji-picker' }, EMOJI.map(e => h('button', { type: 'button', class: 'emoji' + (!draft.sticker && draft.emoji === e ? ' on' : ''), onclick: () => { draft.emoji = e; draft.sticker = null; drawIcon(); } }, e))),
      h('div', { class: 'cal-icon-more' },
        draft.sticker ? h('span', { class: 'cal-icon-big' }, iconOf(draft)) : null,
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickStickerIcon(id => { draft.sticker = id; drawIcon(); }) }, draft.sticker ? 'change sticker' : '+ 3d sticker')));
    drawIcon();

    const picBox = h('div', { class: 'cal-pic' });
    const drawPic = () => fill(picBox,
      draft.imageId ? picOr(draft.imageId) : null,
      h('div', { class: 'lore-banner-actions' },
        h('button', { type: 'button', class: 'link-btn', onclick: addPic }, draft.imageId ? 'change pic' : '+ add a picture'),
        draft.imageId ? h('button', { type: 'button', class: 'link-btn', onclick: () => { draft.imageId = null; drawPic(); } }, 'remove') : null));
    async function addPic() {
      const file = await pickAndCrop();
      if (!file) return;
      try {
        const { blob } = await shrinkImage(file, 1400);
        draft.imageId = await store.putImage(blob);
        uploads.push(draft.imageId);
        drawPic();
      } catch (err) {
        console.error(err);
        toast("couldn't read that picture", 'bad');
      }
    }
    drawPic();

    let who = null, where = null;
    if (kind === 'event') {
      const people = world.charIds.map(id => store.char(id)).filter(Boolean);
      who = h('div', { class: 'cal-who' });
      const drawWho = () => fill(who, people.map(c => h('button', {
        type: 'button', class: 'cal-who-oc' + (draft.ocs.includes(c.id) ? ' on' : ''), style: { '--c': c.color }, dataset: { id: c.id },
        onclick: () => { draft.ocs = draft.ocs.includes(c.id) ? draft.ocs.filter(x => x !== c.id) : [...draft.ocs, c.id]; drawWho(); },
      }, portrait(c, 'cal-pfp'), nameOf(c))));
      drawWho();
      if (world.lore.length) {
        where = h('select', { class: 'cal-in-place', onchange: e => { draft.place = e.target.value || null; } },
          h('option', { value: '' }, '—'),
          world.lore.map(l => h('option', { value: l.id, selected: l.id === draft.place }, l.title || 'untitled page')));
      }
    }

    const place = kind === 'event' && draft.place && world.lore.find(l => l.id === draft.place);
    openModal({
      title: isNew ? (kind === 'event' ? 'new event' : 'new holiday') : (draft.name || (kind === 'event' ? 'event' : 'holiday')),
      wide: true,
      body: h('div', { class: 'cal-editor' },
        field('name', h('input', { type: 'text', class: 'cal-in-name', value: draft.name, maxLength: 80, 'data-autofocus': true, oninput: e => { draft.name = e.target.value; } })),
        field(kind === 'event' ? 'when' : 'every year on', dateFields(draft, kind === 'event')),
        field('how many days', h('input', { type: 'number', class: 'cal-in cal-in-len', min: 1, max: 366, value: draft.len, oninput: e => { draft.len = Math.min(366, Math.max(1, parseInt(e.target.value, 10) || 1)); } })),
        who && world.charIds.length ? field('who was there', who) : null,
        where ? h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'where'), where,
          place ? h('a', { class: 'link-btn cal-place-link', href: `#/w/${world.id}/lore/${place.id}` }, `${place.title || 'untitled page'} →`) : null) : null,
        field('icon', iconRow),
        field('color', swatches(draft.color, c => { draft.color = c; })),
        field('picture', picBox),
        field(kind === 'event' ? 'what happened' : 'traditions + stuff', autosize(h('textarea', { class: 'cal-in-about', rows: 4, value: draft.about, oninput: e => { draft.about = e.target.value; } })))),
      actions: [
        ...(isNew ? [] : [{ label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog(`delete "${item.name || 'untitled'}"?`, { okLabel: 'delete', danger: true })) return;
          const list = kind === 'event' ? 'events' : 'holidays';
          world[list] = world[list].filter(x => x.id !== item.id);
          if (item.imageId) store.deleteImage(item.imageId);
          save();
          close();
          draw();
        } }]),
        { label: 'cancel', onClick: close => close() },
        { label: 'save', kind: 'primary', onClick: close => {
          draft.name = draft.name.trim();
          draft.d = Math.min(draft.d, months(cal)[draft.m].days);
          const list = kind === 'event' ? world.events : world.holidays;
          if (isNew) list.push(draft);
          else {
            if (item.imageId && item.imageId !== draft.imageId) store.deleteImage(item.imageId);
            Object.assign(item, draft);
          }
          saved = true;
          save();
          close();
          if (kind === 'event') { st.y = draft.y; st.m = draft.m; } else st.m = draft.m;
          draw();
        } },
      ],
      onClose: () => uploads.filter(id => !(saved && id === draft.imageId)).forEach(id => store.deleteImage(id)),
    });
  }
  const editHoliday = (item, start) => editor('holiday', item, start);
  const editEvent = (item, start) => editor('event', item, start);

  // ---- making the calendar your own ----

  function settings() {
    const draft = structuredClone({ kind: cal.kind, months: cal.months, weekdays: cal.weekdays, era: cal.era, now: cal.now });
    const custom = h('div', { class: 'cal-custom' });
    const nowRow = h('div');
    const drawNow = () => {
      const m = draft.kind === 'custom' ? draft.months : realMonths();
      draft.now.m = Math.min(draft.now.m, m.length - 1);
      fill(nowRow, h('div', { class: 'cal-date-row' },
        h('select', { class: 'cal-now-m', onchange: e => { draft.now.m = +e.target.value; } }, m.map((mo, i) => h('option', { value: i, selected: i === draft.now.m }, mo.name || `month ${i + 1}`))),
        h('input', { type: 'number', class: 'cal-in cal-now-d', min: 1, value: draft.now.d, oninput: e => { draft.now.d = Math.max(1, parseInt(e.target.value, 10) || 1); } }),
        h('input', { type: 'number', class: 'cal-in cal-in-y cal-now-y', value: draft.now.y, oninput: e => { draft.now.y = parseInt(e.target.value, 10) || 0; } })));
    };
    const drawCustom = () => {
      if (draft.kind !== 'custom') { fill(custom); drawNow(); return; }
      fill(custom,
        field('months', h('div', { class: 'cal-edit-list' },
          draft.months.map((mo, i) => h('div', { class: 'cal-edit-row' },
            h('input', { type: 'text', class: 'cal-month-name', value: mo.name, maxLength: 30, oninput: e => { mo.name = e.target.value; } }),
            h('input', { type: 'number', class: 'cal-in cal-month-days', min: 1, max: 99, value: mo.days, title: 'days', oninput: e => { mo.days = Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 1)); } }),
            draft.months.length > 1 ? h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { draft.months.splice(i, 1); drawCustom(); } }, '✕') : null)),
          h('button', { type: 'button', class: 'chip dashed cal-add-month', onclick: () => { draft.months.push({ name: '', days: 30 }); drawCustom(); } }, '+ month'))),
        field('days of the week', h('div', { class: 'cal-edit-list' },
          draft.weekdays.map((name, i) => h('div', { class: 'cal-edit-row' },
            h('input', { type: 'text', class: 'cal-wd-name', value: name, maxLength: 30, oninput: e => { draft.weekdays[i] = e.target.value; } }),
            draft.weekdays.length > 1 ? h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { draft.weekdays.splice(i, 1); drawCustom(); } }, '✕') : null)),
          h('button', { type: 'button', class: 'chip dashed cal-add-wd', onclick: () => { draft.weekdays.push(''); drawCustom(); } }, '+ day'))),
        field('after the year', h('input', { type: 'text', class: 'cal-era', value: draft.era, maxLength: 20, oninput: e => { draft.era = e.target.value; } })));
      drawNow();
    };
    drawCustom();
    openModal({
      title: 'calendar',
      body: h('div', { class: 'cal-settings' },
        field('kind', segmented([{ value: 'real', label: 'real' }, { value: 'custom', label: 'made up' }], draft.kind, v => {
          draft.kind = v;
          drawCustom();
        })),
        custom,
        field('today in this world', nowRow)),
      actions: [
        { label: 'cancel', onClick: close => close() },
        { label: 'save', kind: 'primary', onClick: close => {
          draft.months = draft.months.map((mo, i) => ({ name: mo.name.trim() || `month ${i + 1}`, days: mo.days }));
          draft.weekdays = draft.weekdays.map((w, i) => w.trim() || `day ${i + 1}`);
          const ms = draft.kind === 'custom' ? draft.months : realMonths();
          draft.now.d = Math.min(draft.now.d, ms[draft.now.m].days);
          Object.assign(cal, draft, { era: draft.era.trim() });
          save();
          close();
          st.m = Math.min(st.m, months(cal).length - 1);
          draw();
        } },
      ],
    });
  }

  draw();
  return { refresh: () => { fill(el); render(el, { world, save }); } };
}
