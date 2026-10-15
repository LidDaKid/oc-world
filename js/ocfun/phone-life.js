// phone apps (life): calendar, weather, reminders, wallet, screen time. see the plug-in notes at the top of phone.js

import { h, s, fill, uid, openModal, confirmDialog, swatches } from '../ui.js';
import { sticker, nameOf } from './kit.js';
import { hmA, dayLabel } from './phone-bits.js';

export const APPS = {
  calendar: { label: 'calendar', icon: '1f4c5', bg: 'linear-gradient(160deg,#fff,#f3f0f4)' },
  weather: { label: 'weather', icon: '26c5', bg: 'linear-gradient(160deg,#5fb4ff,#2a6fe0)' },
  reminders: { label: 'reminders', icon: '1f4cb', bg: 'linear-gradient(160deg,#fff,#eef0f3)' },
  wallet: { label: 'wallet', icon: '1f45b', bg: 'linear-gradient(160deg,#2b2b30,#0c0c0f)' },
  screentime: { label: 'screen time', icon: '23f3', bg: 'linear-gradient(160deg,#9d6bff,#5a2fd6)' },
};

export const DEF = {
  events: [],
  weather: null,
  reminders: null,
  wallet: null,
  screentime: null,
};

const W_DEF = { city: 'gloomsville', temp: 58, cond: 'cloudy', unit: 'f' };
const R_DEF = { lists: [{ id: 'main', name: 'reminders', color: '#ff9500' }], items: [] };
const WAL_DEF = { cards: [], passes: [] };
const ST_DEF = {
  days: [5.2, 7.9, 6.4, 8.8, 7.1, 9.6, 6.3], lastWeek: 6.4, pickups: 112, first: '07:12',
  apps: [
    { id: 'a1', name: 'socials', hrs: 3.4 }, { id: 'a2', name: 'messages', hrs: 2.2 }, { id: 'a3', name: 'music', hrs: 1.6 },
    { id: 'a4', name: 'browser', hrs: 0.9 }, { id: 'a5', name: 'camera', hrs: 0.5 },
  ],
};

const EV_COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#af52de', '#ff2d92', '#8e8e93'];
const ST_ICONS = {
  socials: ['1f4f2', '#ff4fa3'], messages: ['1f4ac', '#34c759'], music: ['1f3a7', '#ff2d55'], browser: ['1f310', '#007aff'],
  camera: ['1f4f7', '#8e8e93'], photos: ['1f338', '#ff9500'], notes: ['1f4dd', '#ffcc00'], games: ['1f3ae', '#5856d6'],
  phone: ['1f4de', '#34c759'], maps: ['1f5fa-fe0f', '#30b0c7'], weather: ['26c5', '#2a6fe0'], calendar: ['1f4c5', '#ff3b30'],
};

const pad = n => String(n).padStart(2, '0');
const ymd = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const fromYmd = (str, time = '') => { const [y, m, dd] = str.split('-').map(Number); const [hh, mm] = (time || '09:00').split(':').map(Number); return new Date(y, m - 1, dd, hh, mm).getTime(); };
const timeLabel = t => (t ? hmA(fromYmd('2000-01-01', t)) : 'all-day');
const fmtH = x => { const hh = Math.floor(x), mm = Math.round((x - hh) * 60); return hh ? `${hh}h ${mm}m` : `${mm}m`; };
const money = n => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// stable random numbers from a string
function rng(seedStr) {
  let x = 2166136261;
  for (const c of seedStr) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
}

function norm(d) {
  d.events ||= [];
  d.weather = { ...W_DEF, ...d.weather };
  d.reminders = { ...structuredClone(R_DEF), ...d.reminders };
  if (!d.reminders.lists.length) d.reminders.lists = structuredClone(R_DEF.lists);
  d.wallet = { ...structuredClone(WAL_DEF), ...d.wallet };
  d.screentime = { ...structuredClone(ST_DEF), ...d.screentime };
}

// a modal with a slider, resolves with the number or null
function sliderBox(title, value, { min = 0, max = 16, step = 0.1, fmt = fmtH } = {}) {
  return new Promise(resolve => {
    let out = null;
    const lab = h('b', { class: 'pl-slide-val' }, fmt(value));
    const r = h('input', { type: 'range', class: 'pl-slide', min, max, step, value, oninput: e => { lab.textContent = fmt(Number(e.target.value)); } });
    openModal({
      title, body: h('div', { class: 'pl-slide-box' }, lab, r),
      actions: [{ label: 'save', kind: 'primary', onClick: close => { out = Number(r.value); close(); } }],
      onClose: () => resolve(out),
    });
  });
}

// ---------------- weather ----------------
const CONDS = {
  sunny: { label: 'sunny', icon: '2600-fe0f' },
  cloudy: { label: 'cloudy', icon: '2601-fe0f' },
  partly: { label: 'partly cloudy', icon: '26c5' },
  rainy: { label: 'rain', icon: '1f327-fe0f' },
  stormy: { label: 'thunderstorms', icon: '26c8-fe0f' },
  snowy: { label: 'snow', icon: '1f328-fe0f' },
  foggy: { label: 'fog', icon: '1f32b-fe0f' },
  windy: { label: 'windy', icon: '1f32c-fe0f' },
  night: { label: 'clear', icon: '1f319' },
};
const NEAR = { sunny: ['sunny', 'partly'], cloudy: ['cloudy', 'partly', 'rainy'], partly: ['partly', 'sunny', 'cloudy'], rainy: ['rainy', 'cloudy', 'stormy'], stormy: ['stormy', 'rainy', 'cloudy'], snowy: ['snowy', 'cloudy'], foggy: ['foggy', 'cloudy'], windy: ['windy', 'partly', 'sunny'], night: ['sunny', 'partly'] };
const toUnit = (f, unit) => Math.round(unit === 'c' ? (f - 32) * 5 / 9 : f);

function forecast(w) {
  const r = rng(w.city.toLowerCase() + ymd(new Date()) + w.cond);
  const swing = w.cond === 'snowy' ? 6 : 12;
  const now = new Date();
  const hours = [];
  for (let i = 0; i < 12; i++) {
    const hr = (now.getHours() + i) % 24;
    const t = w.temp + Math.sin(((hr - 9) / 24) * Math.PI * 2) * swing * 0.5 - Math.sin(((now.getHours() - 9) / 24) * Math.PI * 2) * swing * 0.5 + (r() - 0.5) * 2;
    let cond = i === 0 ? w.cond : r() < 0.75 ? w.cond : NEAR[w.cond][Math.floor(r() * NEAR[w.cond].length)];
    const dark = hr >= 20 || hr < 6;
    if (dark && (cond === 'sunny' || cond === 'partly')) cond = 'night';
    if (!dark && cond === 'night' && i) cond = 'sunny';
    hours.push({ label: i === 0 ? 'now' : `${hr % 12 || 12}${hr < 12 ? 'am' : 'pm'}`, t, cond });
  }
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(now.getTime() + i * 864e5);
    const base = w.temp + (r() - 0.5) * 10;
    let cond = i === 0 ? w.cond : NEAR[w.cond][Math.floor(r() * NEAR[w.cond].length)];
    if (cond === 'night') cond = 'sunny';
    days.push({ label: i === 0 ? 'today' : dt.toLocaleDateString(undefined, { weekday: 'short' }).toLowerCase(), hi: base + swing / 2, lo: base - swing / 2, cond });
  }
  if (days[0]) { days[0].hi = Math.max(days[0].hi, w.temp); days[0].lo = Math.min(days[0].lo, w.temp); }
  return { hours, days };
}

// the moving sky behind the weather app (+ the widget)
function sky(cond, small = false) {
  const el = h('div', { class: 'pl-sky' + (small ? ' sm' : ''), 'data-cond': cond });
  const r = rng(cond);
  const n = small ? 0.4 : 1;
  if (cond === 'rainy' || cond === 'stormy') for (let i = 0; i < 46 * n; i++) el.append(h('i', { class: 'pl-drop', style: { left: r() * 100 + '%', animationDelay: -r() * 1.2 + 's', animationDuration: 0.5 + r() * 0.4 + 's', opacity: 0.35 + r() * 0.5 } }));
  if (cond === 'snowy') for (let i = 0; i < 40 * n; i++) el.append(h('i', { class: 'pl-flake', style: { left: r() * 100 + '%', animationDelay: -r() * 8 + 's', animationDuration: 5 + r() * 5 + 's', width: 3 + r() * 5 + 'px' } }));
  if (cond === 'night') for (let i = 0; i < 50 * n; i++) el.append(h('i', { class: 'pl-star', style: { left: r() * 100 + '%', top: r() * 60 + '%', animationDelay: -r() * 3 + 's', transform: `scale(${0.5 + r()})` } }));
  if (cond === 'sunny' || cond === 'partly') el.append(h('i', { class: 'pl-sun' }));
  if (cond === 'night') el.append(h('i', { class: 'pl-moon' }));
  if (['cloudy', 'partly', 'rainy', 'stormy', 'snowy', 'windy'].includes(cond)) {
    const k = cond === 'partly' || cond === 'windy' ? 3 : 5;
    for (let i = 0; i < k; i++) el.append(h('i', { class: 'pl-cloud', style: { top: 4 + r() * 30 + '%', animationDelay: -r() * 40 + 's', animationDuration: (cond === 'windy' ? 14 : 40) + r() * 20 + 's', transform: `scale(${0.6 + r() * 0.8})` } }));
  }
  if (cond === 'windy') for (let i = 0; i < 8 * n; i++) el.append(h('i', { class: 'pl-gust', style: { top: 20 + r() * 60 + '%', animationDelay: -r() * 3 + 's' } }));
  if (cond === 'foggy') for (let i = 0; i < 4; i++) el.append(h('i', { class: 'pl-fog', style: { top: 25 + i * 18 + '%', animationDelay: -i * 5 + 's' } }));
  if (cond === 'stormy') el.append(h('i', { class: 'pl-flash' }));
  return el;
}

// ---------------- wallet bits ----------------
const CARD_COLORS = ['#141114', '#ff4fa3', '#ff8ac4', '#b18cff', '#5a1a2e', '#d81e5b', '#6ec6ff', '#7df9d0', '#ffd84d', '#c0c0c8', '#f6eefb', '#2a6fe0'];
const NETS = ['rings', 'wave', 'star'];
const FINISHES = ['glossy', 'matte', 'holo', 'glitter'];

function netLogo(kind) {
  if (kind === 'wave') return s('svg', { viewBox: '0 0 48 30', class: 'pl-net' }, s('path', { d: 'M3 20c6-12 12-12 18 0s12 12 18 0', fill: 'none', stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' }), s('path', { d: 'M9 26c5-7 9-7 14 0', fill: 'none', stroke: '#fff', 'stroke-opacity': .55, 'stroke-width': 3, 'stroke-linecap': 'round' }));
  if (kind === 'star') return s('svg', { viewBox: '0 0 48 30', class: 'pl-net' }, s('path', { d: 'M24 2l3.6 8.4 9 .8-6.8 6 2 8.8L24 21.4 16.2 26l2-8.8-6.8-6 9-.8z', fill: '#fff', 'fill-opacity': .92 }));
  return s('svg', { viewBox: '0 0 48 30', class: 'pl-net' }, s('circle', { cx: 18, cy: 15, r: 11, fill: '#fff', 'fill-opacity': .85 }), s('circle', { cx: 30, cy: 15, r: 11, fill: '#fff', 'fill-opacity': .45 }));
}

function barcode(seed) {
  const r = rng(seed);
  const bars = [];
  let x = 0;
  while (x < 196) { const w = 1 + Math.floor(r() * 3.2); if (r() > 0.42) bars.push(s('rect', { x, y: 0, width: w, height: 40 })); x += w + 1; }
  return s('svg', { viewBox: '0 0 200 40', class: 'pl-barcode', preserveAspectRatio: 'none' }, bars);
}

// ---------------------------------------------------------------
export function install(api) {
  const { SCREENS, mine, char, show, redraw, header, plusBtn, goHome } = api;
  const d = api.d;
  norm(d);
  const save = () => api.save();
  const home = { label: 'home', go: () => goHome() };

  // ================= calendar =================
  let calMonth = null; // first of the shown month
  let calDay = ymd(new Date());
  const dotsFor = day => d.events.filter(e => e.date === day);
  function eventBox(ev = null, date = calDay) {
    const isNew = !ev;
    ev ||= { id: 'e_' + uid(), date, time: '', title: '', color: EV_COLORS[5] };
    const title = h('input', { type: 'text', placeholder: 'title', maxLength: 80, value: ev.title, 'data-autofocus': '' });
    const dateIn = h('input', { type: 'date', value: ev.date });
    const timeIn = h('input', { type: 'time', value: ev.time });
    let color = ev.color;
    openModal({
      title: isNew ? 'new event' : 'event',
      body: h('div', { class: 'ph-form pl-form' }, title,
        h('div', { class: 'pl-form-row' }, dateIn, timeIn),
        swatches(color, c => { color = c; }, EV_COLORS)),
      actions: [
        isNew ? null : { label: 'delete', kind: 'danger', onClick: close => { d.events = d.events.filter(x => x.id !== ev.id); save(); close(); redraw(); } },
        {
          label: isNew ? 'add' : 'save', kind: 'primary', onClick: close => {
            if (!title.value.trim()) return title.focus();
            Object.assign(ev, { title: title.value.trim(), date: dateIn.value || date, time: timeIn.value, color });
            if (isNew) d.events.push(ev);
            calDay = ev.date;
            const dt = fromYmd(ev.date);
            calMonth = new Date(new Date(dt).getFullYear(), new Date(dt).getMonth(), 1);
            save(); close(); redraw();
          },
        },
      ].filter(Boolean),
    });
  }
  SCREENS.calendar = (params = {}) => {
    if (params.date) { calDay = params.date; const dt = new Date(fromYmd(params.date)); calMonth = new Date(dt.getFullYear(), dt.getMonth(), 1); }
    if (!calMonth) { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); }
    const today = ymd(new Date());
    const grid = h('div', { class: 'pl-cal-grid' });
    const title = h('h3', { class: 'ph-big-title pl-cal-title' });
    const list = h('div', { class: 'pl-cal-list' });
    const drawList = () => {
      const evs = dotsFor(calDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      fill(list,
        h('div', { class: 'pl-cal-day' }, new Date(fromYmd(calDay)).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase()),
        evs.length ? h('div', { class: 'ph-group' }, evs.map(ev => h('button', { type: 'button', class: 'ph-row pl-ev', disabled: !mine, onclick: () => eventBox(ev) },
          h('i', { class: 'pl-ev-bar', style: { background: ev.color } }),
          h('div', { class: 'ph-row-main' }, h('b', {}, ev.title)),
          h('span', { class: 'pl-ev-time' }, timeLabel(ev.time)))))
          : h('div', { class: 'pl-cal-none' }, 'no events'));
    };
    const draw = () => {
      title.textContent = calMonth.toLocaleDateString(undefined, { month: 'long', year: calMonth.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).toLowerCase();
      const first = calMonth.getDay();
      const days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < first; i++) cells.push(h('span', { class: 'pl-cal-cell blank' }));
      for (let dd = 1; dd <= days; dd++) {
        const key = ymd(new Date(calMonth.getFullYear(), calMonth.getMonth(), dd));
        const evs = dotsFor(key);
        cells.push(h('button', {
          type: 'button', class: 'pl-cal-cell' + (key === today ? ' today' : '') + (key === calDay ? ' on' : ''), 'data-day': key,
          onclick: () => { calDay = key; draw(); drawList(); },
        }, h('b', {}, dd), h('span', { class: 'pl-cal-dots' }, evs.slice(0, 3).map(e => h('i', { style: { background: e.color } })))));
      }
      fill(grid, cells);
    };
    const move = k => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + k, 1); grid.classList.remove('slide-l', 'slide-r'); void grid.offsetWidth; grid.classList.add(k > 0 ? 'slide-l' : 'slide-r'); draw(); };
    let x0 = null;
    draw(); drawList();
    return h('div', { class: 'ph-app-screen pl-cal' },
      header('', { back: home, right: [h('button', { type: 'button', class: 'pl-today-btn', onclick: () => { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); calDay = today; draw(); drawList(); } }, 'today'), plusBtn(() => eventBox(), 'new event')] }),
      h('div', { class: 'pl-cal-top' }, title,
        h('div', { class: 'pl-cal-arrows' },
          h('button', { type: 'button', class: 'pl-arrow', title: 'last month', onclick: () => move(-1) }, '‹'),
          h('button', { type: 'button', class: 'pl-arrow', title: 'next month', onclick: () => move(1) }, '›'))),
      h('div', { class: 'pl-cal-week' }, ['s', 'm', 't', 'w', 't', 'f', 's'].map(x => h('span', {}, x))),
      h('div', { class: 'ph-scroll' },
        h('div', {
          class: 'pl-cal-swipe',
          onpointerdown: e => { x0 = e.clientX; },
          onpointerup: e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) move(e.clientX < x0 ? 1 : -1); x0 = null; },
        }, grid),
        list));
  };

  // ================= weather =================
  let wUnit = d.weather.unit;
  function weatherBox() {
    const w = d.weather;
    const city = h('input', { type: 'text', value: w.city, maxLength: 30, placeholder: 'city', 'data-autofocus': '' });
    const val = h('b', { class: 'pl-slide-val' });
    const showT = v => { val.textContent = `${toUnit(v, wUnit)}°`; };
    const temp = h('input', { type: 'range', class: 'pl-slide', min: -10, max: 110, value: w.temp, oninput: e => showT(Number(e.target.value)) });
    showT(w.temp);
    let cond = w.cond;
    const conds = h('div', { class: 'pl-conds' });
    const drawConds = () => fill(conds, Object.entries(CONDS).map(([k, c]) => h('button', { type: 'button', class: 'pl-cond' + (cond === k ? ' on' : ''), onclick: () => { cond = k; drawConds(); } }, sticker(c.icon), h('span', {}, c.label))));
    drawConds();
    openModal({
      title: 'weather',
      body: h('div', { class: 'ph-form pl-form' }, city, h('div', { class: 'pl-slide-box' }, val, temp), conds),
      actions: [{ label: 'save', kind: 'primary', onClick: close => { Object.assign(w, { city: city.value.trim() || W_DEF.city, temp: Number(temp.value), cond }); save(); close(); redraw(); } }],
    });
  }
  SCREENS.weather = () => {
    const w = d.weather;
    const f = forecast(w);
    const T = v => toUnit(v, wUnit);
    const lo = Math.min(...f.days.map(x => x.lo)), hi = Math.max(...f.days.map(x => x.hi));
    const setUnit = u => { wUnit = u; if (mine) { w.unit = u; save(); } redraw(); };
    return h('div', { class: 'pl-weather', 'data-cond': w.cond },
      sky(w.cond),
      h('div', { class: 'pl-w-bar' },
        h('button', { type: 'button', class: 'pl-w-btn', title: 'home', onclick: () => goHome() }, '‹'),
        h('div', { class: 'pl-unit' }, ['f', 'c'].map(u => h('button', { type: 'button', class: wUnit === u ? 'on' : '', onclick: () => setUnit(u) }, '°' + u))),
        mine ? h('button', { type: 'button', class: 'pl-w-btn txt', onclick: weatherBox }, 'edit') : h('span')),
      h('div', { class: 'pl-w-scroll' },
        h('div', { class: 'pl-w-now' },
          h('div', { class: 'pl-w-city' }, w.city),
          h('div', { class: 'pl-w-temp' }, T(w.temp), h('span', {}, '°')),
          h('div', { class: 'pl-w-cond' }, CONDS[w.cond].label),
          h('div', { class: 'pl-w-hilo' }, `h:${T(f.days[0].hi)}°  l:${T(f.days[0].lo)}°`)),
        h('div', { class: 'pl-glass' },
          h('div', { class: 'pl-hours' }, f.hours.map(x => h('div', { class: 'pl-hour' }, h('span', {}, x.label), sticker(CONDS[x.cond].icon), h('b', {}, T(x.t) + '°'))))),
        h('div', { class: 'pl-glass' },
          h('div', { class: 'pl-glass-head' }, '7-day forecast'),
          f.days.map(x => h('div', { class: 'pl-day' },
            h('span', { class: 'pl-day-name' }, x.label),
            sticker(CONDS[x.cond].icon),
            h('span', { class: 'pl-day-lo' }, T(x.lo) + '°'),
            h('div', { class: 'pl-range' }, h('i', { style: { left: ((x.lo - lo) / (hi - lo || 1)) * 100 + '%', right: (100 - ((x.hi - lo) / (hi - lo || 1)) * 100) + '%' } })),
            h('span', { class: 'pl-day-hi' }, T(x.hi) + '°'))))));
  };

  // ================= reminders =================
  const R = d.reminders;
  const listOf = id => R.lists.find(l => l.id === id) || R.lists[0];
  const todayKey = () => ymd(new Date());
  function listBox(list = null) {
    const name = h('input', { type: 'text', placeholder: 'list name', maxLength: 40, value: list?.name || '', 'data-autofocus': '' });
    let color = list?.color || EV_COLORS[0];
    openModal({
      title: list ? 'edit list' : 'new list',
      body: h('div', { class: 'ph-form pl-form' }, name, swatches(color, c => { color = c; }, EV_COLORS)),
      actions: [{ label: list ? 'save' : 'add', kind: 'primary', onClick: close => {
        if (!name.value.trim()) return name.focus();
        if (list) Object.assign(list, { name: name.value.trim(), color });
        else R.lists.push({ id: 'l_' + uid(), name: name.value.trim(), color });
        save(); close(); redraw();
      } }],
    });
  }
  SCREENS.reminders = () => {
    const open = R.items.filter(i => !i.done);
    const tile = (key, label, n, color) => h('button', { type: 'button', class: 'pl-tile', 'data-smart': key, onclick: () => show('rlist', { id: key }) },
      h('i', { class: 'pl-tile-ico', style: { background: color } }, key === 'today' ? new Date().getDate() : '≡'), h('b', {}, n), h('span', {}, label));
    return h('div', { class: 'ph-app-screen pl-rem' },
      header('', { back: home, right: mine ? h('button', { type: 'button', class: 'pl-link', onclick: () => listBox() }, 'add list') : null }),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'pl-tiles' },
          tile('today', 'today', open.filter(i => i.due && i.due <= todayKey()).length, '#007aff'),
          tile('all', 'all', open.length, '#3a3a3c')),
        h('div', { class: 'pl-sec' }, 'my lists'),
        h('div', { class: 'ph-group' }, R.lists.map(l => h('button', { type: 'button', class: 'ph-row pl-list-row', onclick: () => show('rlist', { id: l.id }) },
          h('i', { class: 'pl-list-dot', style: { background: l.color } }, '≡'),
          h('div', { class: 'ph-row-main' }, h('b', {}, l.name)),
          h('span', { class: 'pl-count' }, R.items.filter(i => i.list === l.id && !i.done).length),
          h('span', { class: 'ph-chev' }, '›'))))));
  };
  SCREENS.rlist = ({ id }) => {
    const smart = id === 'today' || id === 'all';
    const list = smart ? null : R.lists.find(l => l.id === id);
    if (!smart && !list) return SCREENS.reminders();
    const color = smart ? (id === 'today' ? '#007aff' : '#3a3a3c') : list.color;
    const items = () => R.items.filter(i => (id === 'all' ? true : id === 'today' ? i.due && i.due <= todayKey() : i.list === id))
      .sort((a, b) => (a.done - b.done) || (a.at - b.at));
    let showDone = false;
    const box = h('div', { class: 'pl-items' });
    const row = it => {
      const late = !it.done && it.due && it.due < todayKey();
      const circle = h('button', {
        type: 'button', class: 'pl-check' + (it.done ? ' on' : ''), disabled: !mine, title: 'done',
        onclick: () => {
          it.done = !it.done;
          circle.classList.toggle('on', it.done);
          r.classList.toggle('done', it.done);
          if (it.done) circle.classList.add('pop');
          save();
          setTimeout(draw, it.done ? 700 : 0);
        },
      }, h('i'));
      const text = h('input', { type: 'text', class: 'pl-item-text', value: it.text, readOnly: !mine, maxLength: 120, oninput: e => { it.text = e.target.value; save(); } });
      const r = h('div', { class: 'pl-item' + (it.done ? ' done' : ''), style: { '--lc': listOf(it.list).color } }, circle,
        h('div', { class: 'pl-item-main' }, text,
          it.due ? h('span', { class: 'pl-due' + (late ? ' late' : '') }, dayLabel(fromYmd(it.due))) : null,
          smart ? h('span', { class: 'pl-item-list' }, listOf(it.list).name) : null),
        mine ? h('button', { type: 'button', class: 'pl-item-due', title: 'due date', onclick: () => dueBox(it) }, '◷') : null,
        mine ? h('button', { type: 'button', class: 'pl-item-x', title: 'delete', onclick: () => { R.items = R.items.filter(x => x !== it); save(); draw(); } }, '✕') : null);
      return r;
    };
    const dueBox = it => {
      const dt = h('input', { type: 'date', value: it.due || todayKey(), 'data-autofocus': '' });
      openModal({
        title: 'due', body: h('div', { class: 'ph-form' }, dt),
        actions: [
          it.due ? { label: 'no date', onClick: close => { it.due = ''; save(); close(); draw(); } } : null,
          { label: 'save', kind: 'primary', onClick: close => { it.due = dt.value; save(); close(); draw(); } },
        ].filter(Boolean),
      });
    };
    const newInput = h('input', {
      type: 'text', class: 'pl-new-text', placeholder: 'new reminder', maxLength: 120,
      onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } },
    });
    const add = () => {
      const t = newInput.value.trim();
      if (!t) return;
      R.items.push({ id: 'r_' + uid(), list: smart ? R.lists[0].id : id, text: t, done: false, due: id === 'today' ? todayKey() : '', at: Date.now() });
      newInput.value = '';
      save(); draw();
      newInput.focus();
    };
    const draw = () => {
      const all = items();
      const open = all.filter(i => !i.done), done = all.filter(i => i.done);
      fill(box, open.map(row),
        mine ? h('div', { class: 'pl-item pl-new' }, h('button', { type: 'button', class: 'pl-check add', onclick: add }, '+'), newInput) : null,
        done.length ? h('button', { type: 'button', class: 'pl-show-done', onclick: () => { showDone = !showDone; draw(); } }, `${showDone ? 'hide' : 'show'} completed (${done.length})`) : null,
        showDone ? done.map(row) : null);
    };
    draw();
    return h('div', { class: 'ph-app-screen pl-rlist', style: { '--lc': color } },
      header('', {
        back: { label: 'lists', go: () => show('reminders', {}, 'pop') }, right: mine && !smart ? [
          h('button', { type: 'button', class: 'pl-link', onclick: () => listBox(list) }, 'edit'),
          R.lists[0] !== list ? h('button', { type: 'button', class: 'ph-ibtn plain', title: 'delete list', onclick: async () => {
            if (!(await confirmDialog(`delete "${list.name}"?`, { danger: true, okLabel: 'delete' }))) return;
            R.lists = R.lists.filter(l => l !== list); R.items = R.items.filter(i => i.list !== list.id); save(); show('reminders', {}, 'pop');
          } }, '🗑') : null] : null,
      }),
      h('h3', { class: 'ph-big-title pl-rlist-title' }, smart ? id : list.name),
      h('div', { class: 'ph-scroll' }, box));
  };

  // ================= wallet =================
  const W = d.wallet;
  let picked = null;
  const cardFace = c => h('div', { class: `pl-card fin-${c.finish || 'glossy'}`, style: { '--c1': c.color, '--c2': c.color2 || c.color } },
    h('div', { class: 'pl-card-top' }, h('b', {}, c.bank || 'bank'), h('span', {}, c.kind || 'debit')),
    h('i', { class: 'pl-chip' }),
    h('div', { class: 'pl-card-num' }, '•••• ', c.last4 || '0000'),
    h('div', { class: 'pl-card-bot' }, h('span', { class: 'pl-emboss' }, (c.holder || nameOf(char)).toUpperCase()), netLogo(c.net)));
  const passFace = p => h('div', { class: 'pl-pass kind-' + p.kind, style: { '--c1': p.color } },
    h('div', { class: 'pl-pass-top' }, h('b', {}, p.kind === 'flight' ? 'boarding pass' : 'admit one'), h('span', {}, p.date ? new Date(fromYmd(p.date)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase() : '')),
    p.kind === 'flight'
      ? h('div', { class: 'pl-pass-route' }, h('div', {}, h('em', {}, 'from'), h('b', {}, (p.from || '???').toUpperCase())), h('i', { class: 'pl-plane' }, '✈'), h('div', {}, h('em', {}, 'to'), h('b', {}, (p.to || '???').toUpperCase())))
      : h('div', { class: 'pl-pass-title' }, h('b', {}, p.title || 'show'), h('span', {}, p.place || '')),
    h('div', { class: 'pl-pass-fields' },
      h('div', {}, h('em', {}, 'name'), h('b', {}, p.holder || nameOf(char))),
      h('div', {}, h('em', {}, p.kind === 'flight' ? 'gate' : 'section'), h('b', {}, p.gate || '—')),
      h('div', {}, h('em', {}, 'seat'), h('b', {}, p.seat || 'ga'))),
    h('div', { class: 'pl-pass-code' }, barcode(p.id)));
  const balanceOf = c => (c.tx || []).reduce((n, t) => n + t.amt, 0);

  function cardBox(c = null) {
    const isNew = !c;
    c = structuredClone(c || { id: 'c_' + uid(), bank: '', last4: String(Math.floor(1000 + Math.random() * 9000)), color: '#141114', color2: '#5a1a2e', net: 'rings', finish: 'glossy', kind: 'debit', holder: '', tx: [] });
    const prev = h('div', { class: 'pl-card-prev' });
    const drawPrev = () => fill(prev, cardFace(c));
    const bank = h('input', { type: 'text', placeholder: 'bank', maxLength: 22, value: c.bank, oninput: e => { c.bank = e.target.value; drawPrev(); } });
    const last4 = h('input', { type: 'text', inputMode: 'numeric', placeholder: 'last 4', maxLength: 4, value: c.last4, oninput: e => { e.target.value = e.target.value.replace(/\D/g, ''); c.last4 = e.target.value; drawPrev(); } });
    const holder = h('input', { type: 'text', placeholder: nameOf(char), maxLength: 26, value: c.holder, oninput: e => { c.holder = e.target.value; drawPrev(); } });
    const segs = (opts, key) => h('div', { class: 'segmented' }, opts.map(o => h('button', { type: 'button', class: 'seg' + (c[key] === o ? ' on' : ''), onclick: e => { c[key] = o; e.currentTarget.parentNode.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b === e.currentTarget)); drawPrev(); } }, o)));
    drawPrev();
    openModal({
      title: isNew ? 'new card' : 'card', wide: true,
      body: h('div', { class: 'pl-designer' }, prev,
        h('div', { class: 'ph-form pl-form' },
          bank, h('div', { class: 'pl-form-row' }, last4, holder),
          segs(['debit', 'credit'], 'kind'),
          h('span', { class: 'field-label' }, 'color'), swatches(c.color, v => { c.color = v; drawPrev(); }, CARD_COLORS),
          h('span', { class: 'field-label' }, 'fade to'), swatches(c.color2, v => { c.color2 = v; drawPrev(); }, CARD_COLORS),
          h('span', { class: 'field-label' }, 'finish'), segs(FINISHES, 'finish'),
          h('span', { class: 'field-label' }, 'logo'), segs(NETS, 'net'))),
      actions: [
        isNew ? null : { label: 'delete', kind: 'danger', onClick: async close => { if (!(await confirmDialog('delete this card?', { danger: true, okLabel: 'delete' }))) return; W.cards = W.cards.filter(x => x.id !== c.id); picked = null; save(); close(); redraw(); } },
        { label: isNew ? 'add' : 'save', kind: 'primary', onClick: close => {
          const i = W.cards.findIndex(x => x.id === c.id);
          if (i >= 0) W.cards[i] = c; else W.cards.push(c);
          picked = c.id; save(); close(); redraw();
        } },
      ].filter(Boolean),
    });
  }
  function passBox(p = null) {
    const isNew = !p;
    p = structuredClone(p || { id: 'p_' + uid(), kind: 'concert', title: '', place: '', from: '', to: '', date: ymd(new Date(Date.now() + 7 * 864e5)), gate: '', seat: '', color: '#d81e5b', holder: '' });
    const prev = h('div', { class: 'pl-card-prev pass' });
    const drawPrev = () => fill(prev, passFace(p));
    const inp = (key, ph, max = 30) => h('input', { type: 'text', placeholder: ph, maxLength: max, value: p[key], 'data-k': key, oninput: e => { p[key] = e.target.value; drawPrev(); } });
    const fields = h('div', { class: 'ph-form' });
    const drawFields = () => fill(fields,
      p.kind === 'flight' ? h('div', { class: 'pl-form-row' }, inp('from', 'from', 3), inp('to', 'to', 3)) : [inp('title', 'band / show', 40), inp('place', 'venue', 40)],
      h('div', { class: 'pl-form-row' }, inp('gate', p.kind === 'flight' ? 'gate' : 'section', 8), inp('seat', 'seat', 8)),
      h('input', { type: 'date', value: p.date, oninput: e => { p.date = e.target.value; drawPrev(); } }));
    drawPrev(); drawFields();
    openModal({
      title: isNew ? 'new pass' : 'pass', wide: true,
      body: h('div', { class: 'pl-designer' }, prev,
        h('div', { class: 'ph-form pl-form' },
          h('div', { class: 'segmented' }, [['concert', 'ticket'], ['flight', 'boarding pass']].map(([v, l]) => h('button', { type: 'button', class: 'seg' + (p.kind === v ? ' on' : ''), onclick: e => { p.kind = v; e.currentTarget.parentNode.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b === e.currentTarget)); drawPrev(); drawFields(); } }, l))),
          fields,
          swatches(p.color, v => { p.color = v; drawPrev(); }, CARD_COLORS))),
      actions: [
        isNew ? null : { label: 'delete', kind: 'danger', onClick: async close => { if (!(await confirmDialog('delete this pass?', { danger: true, okLabel: 'delete' }))) return; W.passes = W.passes.filter(x => x.id !== p.id); picked = null; save(); close(); redraw(); } },
        { label: isNew ? 'add' : 'save', kind: 'primary', onClick: close => {
          const i = W.passes.findIndex(x => x.id === p.id);
          if (i >= 0) W.passes[i] = p; else W.passes.push(p);
          picked = p.id; save(); close(); redraw();
        } },
      ].filter(Boolean),
    });
  }
  function txBox(c) {
    const what = h('input', { type: 'text', placeholder: 'what', maxLength: 40, 'data-autofocus': '' });
    const amt = h('input', { type: 'number', placeholder: '0.00', min: 0, step: '0.01', inputMode: 'decimal' });
    let sign = -1;
    const seg = h('div', { class: 'segmented' }, [[-1, 'spent'], [1, 'got']].map(([v, l]) => h('button', { type: 'button', class: 'seg' + (sign === v ? ' on' : ''), onclick: e => { sign = v; seg.querySelectorAll('.seg').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, l)));
    openModal({
      title: 'add', body: h('div', { class: 'ph-form pl-form' }, seg, what, amt),
      actions: [{ label: 'add', kind: 'primary', onClick: close => {
        const n = Math.abs(Number(amt.value));
        if (!what.value.trim()) return what.focus();
        if (!n) return amt.focus();
        (c.tx ||= []).push({ id: 'x_' + uid(), what: what.value.trim(), amt: Math.round(sign * n * 100) / 100, at: Date.now() });
        save(); close(); redraw();
      } }],
    });
  }
  function addToWallet() {
    const m = openModal({
      title: 'add to wallet',
      body: h('div', { class: 'pl-add-pick' },
        h('button', { type: 'button', class: 'pl-add-opt', onclick: () => { m.close(); cardBox(); } }, sticker('1f4b3'), h('span', {}, 'card')),
        h('button', { type: 'button', class: 'pl-add-opt', onclick: () => { m.close(); passBox(); } }, sticker('1f3ab'), h('span', {}, 'pass'))),
    });
  }
  SCREENS.wallet = () => {
    const items = [...W.cards.map(c => ({ c, kind: 'card' })), ...W.passes.map(p => ({ c: p, kind: 'pass' }))];
    if (picked && !items.some(x => x.c.id === picked)) picked = null;
    const stack = h('div', { class: 'pl-stack' + (picked ? ' has-pick' : '') });
    const detail = h('div', { class: 'pl-detail' });
    const layout = () => {
      const kids = [...stack.children];
      let y = 0, top = 0;
      const pi = items.findIndex(x => x.c.id === picked);
      kids.forEach((k, i) => { k.classList.toggle('tucked', pi >= 0 && i !== pi); k.style.height = ''; });
      const ph = pi >= 0 ? kids[pi].offsetHeight : 0;
      kids.forEach((k, i) => {
        if (pi < 0) { k.style.transform = `translateY(${y}px)`; k.style.zIndex = i + 1; y += 50; top = Math.max(top, y - 50 + k.offsetHeight); }
        else if (i === pi) { k.style.transform = 'translateY(0)'; k.style.zIndex = 50; top = Math.max(top, k.offsetHeight); }
        else {
          // the rest tuck in behind it, peeking out underneath
          const j = i < pi ? i : i - 1;
          k.style.height = ph + 'px';
          const y2 = 12 + j * 7;
          k.style.transform = `translateY(${y2}px) scale(${0.95 - j * 0.025})`; k.style.zIndex = 40 - j; top = Math.max(top, ph + 14 + j * 7);
        }
      });
      stack.style.height = top + 'px';
    };
    const drawDetail = () => {
      const it = items.find(x => x.c.id === picked);
      if (!it) return fill(detail);
      if (it.kind === 'pass') return fill(detail, mine ? h('button', { type: 'button', class: 'ph-pill wide ghost', onclick: () => passBox(it.c) }, 'edit pass') : null);
      const c = it.c;
      const tx = [...(c.tx || [])].reverse();
      fill(detail,
        h('div', { class: 'pl-bal' }, h('span', {}, c.kind === 'credit' ? 'card balance' : 'balance'), h('b', {}, money(balanceOf(c)))),
        h('div', { class: 'pl-sec' }, 'latest transactions', mine ? h('button', { type: 'button', class: 'pl-link', onclick: () => txBox(c) }, 'add') : null),
        tx.length ? h('div', { class: 'ph-group' }, tx.slice(0, 30).map(t => h('div', { class: 'ph-row static pl-tx' },
          h('div', { class: 'pl-tx-ico', style: { background: c.color } }, (t.what[0] || '?').toUpperCase()),
          h('div', { class: 'ph-row-main' }, h('b', {}, t.what), h('div', { class: 'ph-row-sub' }, dayLabel(t.at))),
          h('span', { class: 'pl-amt' + (t.amt > 0 ? ' plus' : '') }, (t.amt > 0 ? '+' : '') + money(t.amt)),
          mine ? h('button', { type: 'button', class: 'pl-item-x', title: 'delete', onclick: () => { c.tx = c.tx.filter(x => x !== t); save(); redraw(); } }, '✕') : null)))
          : null,
        mine ? h('button', { type: 'button', class: 'ph-pill wide ghost', onclick: () => cardBox(W.cards.find(x => x.id === c.id)) }, 'edit card') : null);
    };
    items.forEach(it => stack.append(h('div', {
      class: 'pl-stack-item' + (it.c.id === picked ? ' on' : ''), 'data-id': it.c.id,
      onclick: () => { picked = picked === it.c.id ? null : it.c.id; stack.classList.toggle('has-pick', !!picked); [...stack.children].forEach(k => k.classList.toggle('on', k.dataset.id === picked)); layout(); drawDetail(); },
    }, it.kind === 'card' ? cardFace(it.c) : passFace(it.c))));
    requestAnimationFrame(() => requestAnimationFrame(layout));
    new ResizeObserver(() => { if (stack.isConnected) layout(); }).observe(stack);
    drawDetail();
    return h('div', { class: 'ph-app-screen pl-wallet' },
      header('wallet', { big: true, back: home, right: plusBtn(addToWallet, 'add') }),
      h('div', { class: 'ph-scroll' },
        items.length ? stack : h('div', { class: 'ph-empty' }, sticker('1f45b', 'ph-empty-stk'), mine ? h('button', { type: 'button', class: 'ph-pill', onclick: addToWallet }, 'add a card') : null),
        detail));
  };

  // ================= screen time =================
  const ST = d.screentime;
  SCREENS.screentime = () => {
    const avg = ST.days.reduce((a, b) => a + b, 0) / 7;
    const change = ST.lastWeek ? Math.round(((avg - ST.lastWeek) / ST.lastWeek) * 100) : 0;
    const max = Math.max(...ST.days, avg, 1);
    const top = Math.ceil(max / 2) * 2;
    const todayI = new Date().getDay();
    const editDay = async i => { if (!mine) return; const v = await sliderBox(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][i], ST.days[i], { max: 24 }); if (v == null) return; ST.days[i] = v; save(); redraw(); };
    const appMax = Math.max(...ST.apps.map(a => a.hrs), 0.1);
    const appBox = async (a = null) => {
      const name = h('input', { type: 'text', placeholder: 'app', maxLength: 24, value: a?.name || '', 'data-autofocus': '' });
      const val = h('b', { class: 'pl-slide-val' }, fmtH(a?.hrs ?? 1));
      const r = h('input', { type: 'range', class: 'pl-slide', min: 0, max: 16, step: 0.1, value: a?.hrs ?? 1, oninput: e => { val.textContent = fmtH(Number(e.target.value)); } });
      openModal({
        title: a ? a.name : 'add app', body: h('div', { class: 'ph-form pl-form' }, name, h('div', { class: 'pl-slide-box' }, val, r)),
        actions: [
          a ? { label: 'remove', kind: 'danger', onClick: close => { ST.apps = ST.apps.filter(x => x !== a); save(); close(); redraw(); } } : null,
          { label: 'save', kind: 'primary', onClick: close => {
            if (!name.value.trim()) return name.focus();
            if (a) Object.assign(a, { name: name.value.trim(), hrs: Number(r.value) });
            else ST.apps.push({ id: 'a_' + uid(), name: name.value.trim(), hrs: Number(r.value) });
            save(); close(); redraw();
          } },
        ].filter(Boolean),
      });
    };
    const firstIn = h('input', { type: 'time', class: 'pl-time-in', value: ST.first, readOnly: !mine, onchange: e => { ST.first = e.target.value; save(); } });
    const apps = [...ST.apps].sort((a, b) => b.hrs - a.hrs);
    return h('div', { class: 'ph-app-screen pl-st' },
      header('screen time', { back: home }),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'pl-sec' }, nameOf(char) + "'s phone"),
        h('div', { class: 'ph-group pl-st-card' },
          h('div', { class: 'pl-st-top' },
            h('div', {}, h('span', { class: 'pl-st-lab' }, 'daily average'), h('b', { class: 'pl-st-avg' }, fmtH(avg))),
            change ? h('span', { class: 'pl-st-chg' + (change > 0 ? ' up' : ' down') }, `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}% from last week`) : null),
          h('div', { class: 'pl-chart' },
            h('div', { class: 'pl-chart-bars' },
              h('i', { class: 'pl-avg-line', style: { bottom: (avg / top) * 100 + '%' } }, h('em', {}, 'avg')),
              ST.days.map((v, i) => h('button', { type: 'button', class: 'pl-bar' + (i === todayI ? ' today' : ''), disabled: !mine, 'data-i': i, title: fmtH(v), onclick: () => editDay(i) },
                h('i', { style: { height: (v / top) * 100 + '%' } }, h('b', { style: { height: Math.min(100, 38 + (i * 7) % 25) + '%' } }))))),
            h('div', { class: 'pl-chart-axis' }, h('span', {}, top + 'h'), h('span', {}, top / 2 + 'h'), h('span', {}, '0'))),
          h('div', { class: 'pl-chart-days' }, ['s', 'm', 't', 'w', 't', 'f', 's'].map((x, i) => h('span', { class: i === todayI ? 'today' : '' }, x))),
          h('div', { class: 'pl-st-legend' }, h('span', {}, h('i', { class: 'a' }), 'social'), h('span', {}, h('i', { class: 'b' }), 'entertainment'))),
        h('div', { class: 'pl-sec' }, 'most used', mine ? h('button', { type: 'button', class: 'pl-link', onclick: () => appBox() }, 'add') : null),
        h('div', { class: 'ph-group' }, apps.map(a => {
          const [ico, col] = ST_ICONS[a.name.toLowerCase()] || ['1f4f1', '#8e8e93'];
          return h('button', { type: 'button', class: 'ph-row pl-st-app', disabled: !mine, onclick: () => appBox(a) },
            h('span', { class: 'pl-st-ico', style: { background: col } }, sticker(ico)),
            h('div', { class: 'ph-row-main' }, h('b', {}, a.name), h('div', { class: 'pl-st-track' }, h('i', { style: { width: (a.hrs / appMax) * 100 + '%', background: col } }))),
            h('span', { class: 'pl-st-hrs' }, fmtH(a.hrs)));
        })),
        h('div', { class: 'pl-sec' }, 'pickups'),
        h('div', { class: 'ph-group' },
          h('button', { type: 'button', class: 'ph-row pl-st-pick', disabled: !mine, onclick: async () => { const v = await sliderBox('pickups a day', ST.pickups, { max: 400, step: 1, fmt: x => String(Math.round(x)) }); if (v == null) return; ST.pickups = Math.round(v); save(); redraw(); } },
            h('div', { class: 'ph-row-main' }, h('b', {}, 'daily average')), h('span', { class: 'pl-st-big' }, ST.pickups)),
          h('label', { class: 'ph-row static' }, h('div', { class: 'ph-row-main' }, h('b', {}, 'first pickup')), firstIn))));
  };
}

// ---------------- lock screen + widget ----------------
export function lockNotifs(api) {
  const d = api.d;
  norm(d);
  const out = [];
  const now = new Date();
  const today = ymd(now), tomorrow = ymd(new Date(now.getTime() + 864e5));
  for (const ev of d.events) {
    if (ev.date !== today && ev.date !== tomorrow) continue;
    const at = fromYmd(ev.date, ev.time);
    out.push({ app: 'calendar', title: ev.title, text: `${ev.date === today ? 'today' : 'tomorrow'} · ${timeLabel(ev.time)}`, at, open: () => api.show('calendar', { date: ev.date }, 'unlock') });
  }
  const due = d.reminders.items.filter(i => !i.done && i.due && i.due <= today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 2);
  for (const it of due) out.push({ app: 'reminders', title: 'reminders', text: it.text, at: Math.min(Date.now(), fromYmd(it.due)), open: () => api.show('rlist', { id: it.list }, 'unlock') });
  return out;
}

export function widget(api) {
  const d = api.d;
  norm(d);
  const w = d.weather;
  const f = forecast(w);
  const T = v => toUnit(v, w.unit);
  return h('button', { type: 'button', class: 'ph-widget pl-w-weather', 'data-cond': w.cond, onclick: e => api.openApp('weather', e.currentTarget) },
    sky(w.cond, true),
    h('span', { class: 'pl-ww-city' }, w.city),
    h('b', { class: 'pl-ww-temp' }, T(w.temp) + '°'),
    h('span', { class: 'pl-ww-bot' }, sticker(CONDS[w.cond].icon), h('em', {}, CONDS[w.cond].label), h('em', {}, `h:${T(f.days[0].hi)}° l:${T(f.days[0].lo)}°`)));
}
