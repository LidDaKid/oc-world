// mood ring: a glossy ring whose stone swirls in the oc's mood color, a mood for every day, and a calendar of them.
// saved in char.fun.mood = { days: { 'yyyy-mm-dd': { mood, name, color, icon, note, at } }, custom: [{ id, name, color }], metal }

import { h, fill, uid, toast, confirmDialog } from '../ui.js';
import { appBar, sticker, dataFor } from './kit.js';

export const meta = { id: 'mood', label: 'mood ring', icon: '1f48d' };

// [id, name, color, sticker]
export const MOODS = [
  ['dreamy', 'dreamy', '#b9a4ff', '1f4ab'],
  ['in-love', 'in love', '#ff4fa3', '1f60d'],
  ['sparkly', 'sparkly', '#ffd84d', '2728'],
  ['chaotic', 'chaotic', '#ff7a1a', '1f92a'],
  ['heartbroken', 'heartbroken', '#c0143c', '1f494'],
  ['sad-emo', 'sad emo', '#3a3590', '1f5a4'],
  ['spooky', 'spooky', '#8a3cf0', '1f47b'],
  ['vampy', 'vampy', '#7a0f2e', '1f9db-200d-2640-fe0f'],
  ['sleepy', 'sleepy', '#8fb8de', '1f634'],
  ['angry', 'angry', '#e3262f', '1f621'],
  ['giddy', 'giddy', '#ff9ad5', '1f970'],
  ['chill', 'chill', '#2fc7b8', '1f60e'],
  ['anxious', 'anxious', '#a4d65e', '1fae0'],
  ['bored', 'bored', '#9b8aa8', '1f644'],
  ['jealous', 'jealous', '#1fa863', '1f612'],
  ['mysterious', 'mysterious', '#2b2b6b', '1f52e'],
  ['hyper', 'hyper', '#00d0ff', '26a1'],
  ['cozy', 'cozy', '#c98a5e', '2615'],
  ['crying', 'crying', '#5b8def', '1f62d'],
  ['party', 'party', '#ff5ec4', '1f973'],
];
const METALS = [['silver', 'silver'], ['gold', 'gold'], ['rose', 'rose gold'], ['black', 'black']];
const CUSTOM_ICONS = ['1f496', '2728', '1f5a4', '1f319', '1f525', '1f338', '1f98b', '1f480', '1f308', '1f4ad'];
const IDLE = '#6d6a78'; // the stone when there's no mood yet

const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

// ---- colors ----
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, sat = l > .5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, sat, l];
}
function hslToHex(hh, ss, ll) {
  hh = ((hh % 360) + 360) % 360; ss = Math.max(0, Math.min(1, ss)); ll = Math.max(0, Math.min(1, ll));
  const k = n => (n + hh / 30) % 12, a = ss * Math.min(ll, 1 - ll);
  const f = n => Math.round(255 * (ll - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0');
  return '#' + f(0) + f(8) + f(4);
}
// the two swirl colors that go with a mood color
export function swirlOf(hex) {
  const [hh, ss, ll] = hexToHsl(/^#[0-9a-f]{6}$/i.test(hex) ? hex : IDLE);
  return [hslToHex(hh + 38, Math.min(1, ss + .1), Math.min(.78, ll + .14)), hslToHex(hh - 42, ss, Math.max(.18, ll - .12))];
}

// ---- reading it from outside (the oc page header) ----
function latest(char) {
  const days = char?.fun?.mood?.days;
  if (!days) return null;
  const today = dayKey();
  const key = Object.keys(days).filter(k => k <= today && days[k]?.color).sort().pop();
  return key ? days[key] : null;
}

export function moodTint(char) {
  return latest(char)?.color || null;
}

export function moodBadge(char) {
  const m = latest(char);
  if (!m) return null;
  const [c2] = swirlOf(m.color);
  return h('a', {
    class: 'mood-badge', title: m.name, href: `#/oc/${char.id}/fun/mood`,
    style: { '--mood': m.color, '--mood2': c2 },
  }, h('span', { class: 'mood-badge-stone' }), m.name);
}

// ---- the ring ----
function ringEl() {
  const band = h('div', { class: 'mr-band' });
  for (let i = 0; i < 9; i++) band.append(h('div', { class: 'mr-band-layer', style: { '--z': (i - 4) * 2.2 + 'px', '--i': i } }));
  const stone = h('div', { class: 'mr-stone' },
    h('div', { class: 'mr-liquid a' }), h('div', { class: 'mr-liquid b' }), h('div', { class: 'mr-liquid c' }),
    h('div', { class: 'mr-dome' }), h('div', { class: 'mr-gloss' }), h('div', { class: 'mr-glint' }));
  const bezel = h('div', { class: 'mr-bezel' },
    ['tl', 'tr', 'bl', 'br'].map(p => h('span', { class: 'mr-prong ' + p })), stone);
  const floaties = h('div', { class: 'mr-floaties' }, Array.from({ length: 9 }, (_, i) =>
    h('span', { class: 'mr-floaty', style: { '--x': (8 + (i * 37) % 84) + '%', '--d': (i * .7) % 5 + 's', '--sz': 6 + (i * 5) % 9 + 'px' } })));
  return h('div', { class: 'mr-stage' },
    h('div', { class: 'mr-glow' }),
    floaties,
    h('div', { class: 'mr-tilt' }, h('div', { class: 'mr-ring' }, band, bezel)),
    h('div', { class: 'mr-floor' }),
    h('div', { class: 'mr-ripple' }));
}

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'mood', { days: {}, custom: [], metal: 'silver' });
  data.days ||= {};
  data.custom ||= [];
  const today = dayKey();
  let picked = today; // which day you're looking at / setting
  let month = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  let customOpen = false;
  const draft = { name: '', color: '#ff4fa3', icon: CUSTOM_ICONS[0] };

  const allMoods = () => [
    ...MOODS.map(([id, name, color, icon]) => ({ id, name, color, icon })),
    ...data.custom.map(c => ({ ...c, icon: c.icon || '1f496', custom: true })),
  ];

  // ---- pieces ----
  const ring = ringEl();
  const nameEl = h('div', { class: 'mr-name' });
  const dayEl = h('div', { class: 'mr-day' });
  const picker = h('div', { class: 'mr-picker' });
  const calendar = h('div', { class: 'mr-cal' });
  const stats = h('div', { class: 'mr-stats' });
  const log = h('div', { class: 'mr-log' });
  const noteInput = h('input', {
    type: 'text', class: 'mr-note', maxLength: 120, placeholder: 'note', disabled: !mine,
    oninput: e => { const m = data.days[picked]; if (m) { m.note = e.target.value; save(); drawLog(); } },
  });

  function paintRing(entry, animate) {
    const color = entry?.color || IDLE;
    const [c2, c3] = swirlOf(color);
    ring.style.setProperty('--mc', color);
    ring.style.setProperty('--mc2', c2);
    ring.style.setProperty('--mc3', c3);
    ring.classList.toggle('idle', !entry);
    ring.dataset.metal = data.metal || 'silver';
    if (animate) {
      ring.classList.remove('pulse');
      void ring.offsetWidth;
      ring.classList.add('pulse');
    }
  }

  function drawTop(animate) {
    const m = data.days[picked];
    paintRing(m, animate);
    fill(nameEl,
      m ? sticker(m.icon || '1f496', 'mr-name-stk' + (animate ? ' pop' : '')) : null,
      h('span', { class: 'mr-name-text', style: { '--mc': m?.color || IDLE } }, m ? m.name : '—'));
    const d = fromKey(picked);
    dayEl.textContent = picked === today ? 'today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    noteInput.value = m?.note || '';
    noteInput.hidden = !m || (!mine && !m.note);
  }

  function setMood(mo) {
    if (!mine) return;
    const old = data.days[picked];
    data.days[picked] = { mood: mo.id, name: mo.name, color: mo.color, icon: mo.icon, note: old?.note || '', at: Date.now() };
    save();
    drawAll(true);
  }

  function clearDay() {
    if (!mine || !data.days[picked]) return;
    delete data.days[picked];
    save();
    drawAll(true);
  }

  function drawPicker() {
    const cur = data.days[picked];
    fill(picker,
      h('div', { class: 'mr-chips' },
        allMoods().map(mo => h('button', {
          type: 'button', class: 'mr-chip' + (cur?.mood === mo.id ? ' on' : ''), disabled: !mine,
          style: { '--mc': mo.color, '--mc2': swirlOf(mo.color)[0] }, title: mo.name,
          onclick: () => setMood(mo),
        },
          h('span', { class: 'mr-chip-stone' }), sticker(mo.icon, 'mr-chip-stk'), h('span', { class: 'mr-chip-name' }, mo.name),
          mo.custom && mine ? h('span', {
            class: 'mr-chip-x', title: 'remove', role: 'button',
            onclick: async e => {
              e.stopPropagation();
              if (!await confirmDialog(`remove "${mo.name}"?`, { okLabel: 'remove', danger: true })) return;
              data.custom = data.custom.filter(c => c.id !== mo.id);
              save();
              drawPicker();
            },
          }, '×') : null)),
        mine ? h('button', { type: 'button', class: 'mr-chip add' + (customOpen ? ' on' : ''), onclick: () => { customOpen = !customOpen; drawPicker(); } },
          h('span', { class: 'mr-chip-rainbow' }), h('span', { class: 'mr-chip-name' }, '+ custom')) : null),
      mine && customOpen ? customBox() : null,
      h('div', { class: 'mr-pick-foot' },
        noteInput,
        mine && cur ? h('button', { type: 'button', class: 'btn ghost sm', onclick: clearDay }, 'clear day') : null));
  }

  function customBox() {
    const prev = h('span', { class: 'mr-chip-stone big', style: { '--mc': draft.color, '--mc2': swirlOf(draft.color)[0] } });
    const repaint = () => { prev.style.setProperty('--mc', draft.color); prev.style.setProperty('--mc2', swirlOf(draft.color)[0]); };
    const icons = h('div', { class: 'mr-icons' });
    const drawIcons = () => fill(icons, CUSTOM_ICONS.map(code => h('button', {
      type: 'button', class: 'mr-icon' + (draft.icon === code ? ' on' : ''), onclick: () => { draft.icon = code; drawIcons(); },
    }, sticker(code))));
    drawIcons();
    const add = () => {
      const name = draft.name.trim().toLowerCase();
      if (!name) { toast('name it first', 'bad'); return; }
      const mo = { id: 'c_' + uid(), name, color: draft.color, icon: draft.icon };
      data.custom.push(mo);
      draft.name = '';
      customOpen = false;
      setMood(mo);
    };
    return h('div', { class: 'mr-custom' },
      prev,
      h('input', {
        type: 'text', class: 'mr-custom-name', placeholder: 'mood name', maxLength: 24, value: draft.name,
        oninput: e => draft.name = e.target.value, onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); add(); } },
      }),
      h('label', { class: 'mr-color', title: 'any color' },
        h('input', { type: 'color', value: draft.color, oninput: e => { draft.color = e.target.value; repaint(); } })),
      icons,
      h('button', { type: 'button', class: 'btn primary sm', onclick: add }, 'add'));
  }

  function drawCalendar() {
    const y = month.getFullYear(), mo = month.getMonth();
    const first = new Date(y, mo, 1).getDay();
    const count = new Date(y, mo + 1, 0).getDate();
    const thisMonth = new Date(); thisMonth.setDate(1);
    const atNow = y === thisMonth.getFullYear() && mo === thisMonth.getMonth();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(h('span', { class: 'mr-cell blank' }));
    for (let d = 1; d <= count; d++) {
      const key = `${y}-${pad(mo + 1)}-${pad(d)}`;
      const m = data.days[key];
      cells.push(h('button', {
        type: 'button', title: m ? m.name : '',
        class: 'mr-cell' + (m ? ' has' : '') + (key === picked ? ' on' : '') + (key === today ? ' today' : ''),
        disabled: key > today, style: m ? { '--mc': m.color, '--mc2': swirlOf(m.color)[0] } : null,
        onclick: () => { picked = key; drawAll(true); },
      }, h('span', { class: 'mr-cell-num' }, d), m ? h('span', { class: 'mr-cell-stone' }) : null));
    }
    fill(calendar,
      h('div', { class: 'mr-cal-head' },
        h('button', { type: 'button', class: 'icon-btn sm', title: 'last month', onclick: () => { month = new Date(y, mo - 1, 1); drawCalendar(); drawStats(); } }, '‹'),
        h('h3', {}, month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toLowerCase()),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'next month', disabled: atNow, onclick: () => { month = new Date(y, mo + 1, 1); drawCalendar(); drawStats(); } }, '›')),
      h('div', { class: 'mr-cal-grid' },
        ['s', 'm', 't', 'w', 't', 'f', 's'].map(w => h('span', { class: 'mr-wd' }, w)),
        cells));
  }

  function drawStats() {
    const prefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
    const entries = Object.entries(data.days).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);
    const counts = new Map();
    for (const e of entries) {
      const c = counts.get(e.name) || { name: e.name, color: e.color, icon: e.icon, n: 0 };
      c.n++;
      counts.set(e.name, c);
    }
    const top = [...counts.values()].sort((a, b) => b.n - a.n);
    // streak: days in a row up to today (or yesterday)
    let streak = 0;
    const d = new Date();
    if (!data.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (data.days[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    fill(stats,
      h('div', { class: 'mr-stat-row' },
        h('span', { class: 'mr-stat' }, sticker('1f525', 'mr-stat-stk'), h('b', {}, streak), ' streak'),
        h('span', { class: 'mr-stat' }, sticker('1f4c5', 'mr-stat-stk'), h('b', {}, entries.length), ' days')),
      top.length ? h('div', { class: 'mr-bar' }, top.map(t => h('span', {
        class: 'mr-bar-seg', title: `${t.name} ×${t.n}`, style: { flex: t.n, '--mc': t.color },
      }))) : null,
      h('div', { class: 'mr-top' }, top.slice(0, 5).map(t => h('span', { class: 'mr-top-item', style: { '--mc': t.color } },
        sticker(t.icon || '1f496', 'mr-top-stk'), t.name, h('b', {}, '×' + t.n)))));
  }

  function drawLog() {
    const keys = Object.keys(data.days).sort().reverse().slice(0, 14);
    fill(log, keys.length ? keys.map(k => {
      const m = data.days[k];
      return h('button', {
        type: 'button', class: 'mr-log-row' + (k === picked ? ' on' : ''), style: { '--mc': m.color, '--mc2': swirlOf(m.color)[0] },
        onclick: () => { picked = k; const d = fromKey(k); month = new Date(d.getFullYear(), d.getMonth(), 1); drawAll(true); },
      },
        h('span', { class: 'mr-cell-stone' }),
        h('span', { class: 'mr-log-date' }, k === today ? 'today' : fromKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase()),
        h('b', { class: 'mr-log-name' }, m.name),
        m.note ? h('span', { class: 'mr-log-note' }, m.note) : null);
    }) : h('div', { class: 'mr-log-empty' }, sticker('1f48d', 'mr-empty-stk')));
  }

  function drawAll(animate) {
    drawTop(animate);
    drawPicker();
    drawCalendar();
    drawStats();
    drawLog();
  }

  // the ring follows your pointer a little
  const onMove = e => {
    const r = ring.getBoundingClientRect();
    ring.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));
    ring.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
  };
  ring.addEventListener('pointermove', onMove);
  ring.addEventListener('pointerleave', () => { ring.style.setProperty('--px', 0); ring.style.setProperty('--py', 0); });

  const metalPick = h('div', { class: 'mr-metals' }, METALS.map(([id, label]) => h('button', {
    type: 'button', class: 'mr-metal ' + id + ((data.metal || 'silver') === id ? ' on' : ''), title: label, disabled: !mine,
    onclick: e => {
      data.metal = id; save(); paintRing(data.days[picked], false);
      metalPick.querySelectorAll('.mr-metal').forEach(b => b.classList.toggle('on', b === e.currentTarget));
    },
  })));

  el.append(
    appBar(ctx, meta),
    h('div', { class: 'mr-wrap' },
      h('section', { class: 'mr-show' }, ring, h('div', { class: 'mr-caption' }, dayEl, nameEl), metalPick),
      h('section', { class: 'mr-side' }, picker)),
    h('div', { class: 'mr-lower' },
      h('section', { class: 'mr-card' }, calendar, stats),
      h('section', { class: 'mr-card' }, h('h3', { class: 'mr-h' }, 'log'), log)));
  drawAll(false);
}
