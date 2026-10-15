// phone apps: phone (calls + facetime + voicemail), clock, calculator. see the plug-in notes at the top of phone.js

import { h, s, fill, uid, openModal, confirmDialog, toast } from '../ui.js';
import { sticker, portrait, nameOf, allOcs, ocById } from './kit.js';
import { who, face, freshRef, pickWho, hmA, dayLabel, shortDate } from './phone-bits.js';

export const APPS = {
  phone: { label: 'phone', icon: '260e-fe0f', bg: 'linear-gradient(160deg,#6ff07a,#1fbf3f)' },
  clock: { label: 'clock', icon: '23f0', bg: 'linear-gradient(160deg,#2b2b30,#0b0b0d)' },
  calculator: { label: 'calculator', icon: '1f9ee', bg: 'linear-gradient(160deg,#ffb340,#ff8a00)' },
};

export const DEF = {
  calls: [],      // { id, who, dir: 'in'|'out'|'missed', video, at, dur (seconds), seen }
  favs: [],       // { id, who, video }
  voicemails: [], // { id, who, text, at, dur, heard }
  alarms: [],     // { id, time: 'HH:MM', label, on }
  cities: [{ name: 'new york', tz: 'America/New_York' }, { name: 'london', tz: 'Europe/London' }, { name: 'tokyo', tz: 'Asia/Tokyo' }],
};

const CITIES = [
  ['los angeles', 'America/Los_Angeles'], ['new york', 'America/New_York'], ['chicago', 'America/Chicago'], ['denver', 'America/Denver'],
  ['honolulu', 'Pacific/Honolulu'], ['anchorage', 'America/Anchorage'], ['toronto', 'America/Toronto'], ['mexico city', 'America/Mexico_City'],
  ['são paulo', 'America/Sao_Paulo'], ['buenos aires', 'America/Argentina/Buenos_Aires'], ['reykjavik', 'Atlantic/Reykjavik'], ['london', 'Europe/London'],
  ['dublin', 'Europe/Dublin'], ['paris', 'Europe/Paris'], ['berlin', 'Europe/Berlin'], ['rome', 'Europe/Rome'], ['madrid', 'Europe/Madrid'],
  ['stockholm', 'Europe/Stockholm'], ['transylvania', 'Europe/Bucharest'], ['moscow', 'Europe/Moscow'], ['cairo', 'Africa/Cairo'], ['lagos', 'Africa/Lagos'],
  ['dubai', 'Asia/Dubai'], ['mumbai', 'Asia/Kolkata'], ['bangkok', 'Asia/Bangkok'], ['manila', 'Asia/Manila'], ['hong kong', 'Asia/Hong_Kong'],
  ['shanghai', 'Asia/Shanghai'], ['seoul', 'Asia/Seoul'], ['tokyo', 'Asia/Tokyo'], ['sydney', 'Australia/Sydney'], ['auckland', 'Pacific/Auckland'],
];

// ---- little svgs ----
const svg = (vb, ...kids) => s('svg', { viewBox: vb, class: 'pc-ico', 'aria-hidden': 'true' }, ...kids);
const P = d => s('path', { d });
const ICO = {
  handset: () => svg('0 0 24 24', P('M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z')),
  video: () => svg('0 0 24 24', s('rect', { x: 2, y: 6, width: 14, height: 12, rx: 3 }), P('m17 10.5 5-3v9l-5-3Z')),
  star: () => svg('0 0 24 24', P('m12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6L2.5 9.3l6.6-.8Z')),
  recents: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 12, r: 9.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), P('M11 6.5h2v5.1l3.6 2.1-1 1.7L11 12.7Z')),
  person: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 7.5, r: 4.6 }), P('M3.5 21.5c.4-4.8 4-7.6 8.5-7.6s8.1 2.8 8.5 7.6Z')),
  keypad: () => svg('0 0 24 24', ...[0, 1, 2, 3].flatMap(r => [0, 1, 2].filter(c => r < 3 || c === 1).map(c => s('circle', { cx: 5 + c * 7, cy: 3.5 + r * 5.7, r: 2.3 })))),
  voicemail: () => svg('0 0 24 24', s('circle', { cx: 6.5, cy: 12, r: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), s('circle', { cx: 17.5, cy: 12, r: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), s('rect', { x: 6.5, y: 14.9, width: 11, height: 2.2 })),
  mute: () => svg('0 0 24 24', s('rect', { x: 9, y: 2.5, width: 6, height: 12, rx: 3 }), P('M5.5 11a6.5 6.5 0 0 0 13 0h-2a4.5 4.5 0 0 1-9 0ZM11 18h2v3.5h-2Z'), s('path', { d: 'M4 3.5 20 20', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })),
  speaker: () => svg('0 0 24 24', P('M3 9h4l5-4.5v15L7 15H3Z'), s('path', { d: 'M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })),
  plus: () => svg('0 0 24 24', P('M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7Z')),
  flip: () => svg('0 0 24 24', P('M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z'), s('path', { d: 'M9 13a3 3 0 0 1 5.4-1.8M15 13a3 3 0 0 1-5.4 1.8', fill: 'none', stroke: '#000', 'stroke-opacity': .5, 'stroke-width': 1.6 })),
  out: () => svg('0 0 24 24', P('M9 5h10v10h-2V8.4L6.4 19 5 17.6 15.6 7H9Z')),
  info: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 12, r: 9.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }), s('rect', { x: 11, y: 10.5, width: 2, height: 7, rx: 1 }), s('circle', { cx: 12, cy: 7.6, r: 1.3 })),
  play: () => svg('0 0 24 24', P('M7 4.5v15l12-7.5Z')),
  pause: () => svg('0 0 24 24', s('rect', { x: 6, y: 4.5, width: 4, height: 15, rx: 1 }), s('rect', { x: 14, y: 4.5, width: 4, height: 15, rx: 1 })),
  back: () => svg('0 0 24 24', P('M22 5H8.5L2 12l6.5 7H22Z'), s('path', { d: 'm11 9 6 6m0-6-6 6', stroke: 'var(--bg)', 'stroke-width': 1.8, 'stroke-linecap': 'round' })),
  globe: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 12, r: 9.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), s('path', { d: 'M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 })),
  alarm: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 13, r: 8, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), P('M11 8.5h2v4.2l2.8 1.7-1 1.6L11 13.8ZM2.5 6 6 2.6l1.3 1.4-3.4 3.4ZM21.5 6 18 2.6 16.7 4l3.4 3.4Z')),
  stopwatch: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 13.5, r: 8, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), P('M9.5 2h5v2h-5ZM11 8h2v6h-2Z')),
  timer: () => svg('0 0 24 24', s('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-dasharray': '2.5 2.2' }), P('M12 12 12 4.5A7.5 7.5 0 0 1 18.5 15.8Z')),
};

const fmtDur = sec => {
  sec = Math.max(0, Math.round(sec));
  const hh = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60, ss = sec % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
};
const durWords = sec => (sec < 60 ? `${Math.max(0, Math.round(sec))} seconds` : sec < 3600 ? `${Math.round(sec / 60)} minute${Math.round(sec / 60) === 1 ? '' : 's'}` : `${(sec / 3600).toFixed(1).replace(/\.0$/, '')} hours`);
const sameWho = (a, b) => (a.id ? a.id === b.id : !b.id && (a.name || '').toLowerCase() === (b.name || '').toLowerCase());
const KEYS = [['1', ''], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', ''], ['0', '+'], ['#', '']];
const fmtNumber = n => {
  const dgt = n.replace(/\D/g, '');
  if (/^\d{10}$/.test(n)) return `(${dgt.slice(0, 3)}) ${dgt.slice(3, 6)}-${dgt.slice(6)}`;
  if (/^\d{7}$/.test(n)) return `${dgt.slice(0, 3)}-${dgt.slice(3)}`;
  return n;
};

// time somewhere else: { time, ampm, day: 'today'|'tomorrow'|'yesterday', off: hours }
function cityTime(tz) {
  const now = new Date();
  const there = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const here = new Date(now.toLocaleString('en-US'));
  const off = Math.round((there - here) / 9e5) / 4;
  const dd = Math.round((new Date(there).setHours(0, 0, 0, 0) - new Date(here).setHours(0, 0, 0, 0)) / 864e5);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now).map(p => [p.type, p.value]));
  return { time: `${parts.hour}:${parts.minute}`, ampm: (parts.dayPeriod || '').toLowerCase(), day: dd > 0 ? 'tomorrow' : dd < 0 ? 'yesterday' : 'today', off, there };
}
const offLabel = o => (o === 0 ? '+0hrs' : `${o > 0 ? '+' : '−'}${Math.abs(o)}hr${Math.abs(o) === 1 ? '' : 's'}`);

export function lockNotifs({ d, show }) {
  const open = tab => () => show('phone', { tab }, 'unlock');
  return [
    ...d.calls.filter(c => c.dir === 'missed' && !c.seen).slice(-3).map(c => ({ app: 'phone', title: who(c.who).name, text: c.video ? 'missed facetime' : 'missed call', at: c.at, faceOf: c.who, open: open('recents') })),
    ...d.voicemails.filter(v => !v.heard).slice(-2).map(v => ({ app: 'phone', title: who(v.who).name, text: 'voicemail · ' + (v.text || fmtDur(v.dur)), at: v.at, faceOf: v.who, open: open('voicemail') })),
  ];
}

// red number on the phone icon
export const badges = ({ d }) => ({ phone: d.calls.filter(c => c.dir === 'missed' && !c.seen).length + d.voicemails.filter(v => !v.heard).length });

// analog clock for the second home page. the hands are css animations, so no timers to clean up
export function widget() {
  const now = new Date();
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const min = now.getMinutes() * 60 + sec;
  const hr = (now.getHours() % 12) * 3600 + min;
  const hand = (cls, period, at) => h('i', { class: 'pc-hand ' + cls, style: { animationDuration: period + 's', animationDelay: -at + 's' } });
  return h('div', { class: 'ph-widget pc-w-clock' },
    h('div', { class: 'pc-dial' },
      [...Array(12)].map((_, i) => h('b', { class: 'pc-num', style: { '--a': (i + 1) * 30 + 'deg' } }, h('span', { style: { '--a': (i + 1) * 30 + 'deg' } }, i + 1))),
      hand('pc-h', 43200, hr), hand('pc-m', 3600, min), hand('pc-s', 60, sec),
      h('i', { class: 'pc-pin' })));
}

export function install(api) {
  const { d, char, mine, save, show, header, plusBtn, SCREENS, onLeave } = api;
  const home = { label: 'home', go: () => api.goHome() };
  const myRef = () => ({ id: char.id, name: nameOf(char) });

  // ---------------- phone ----------------
  let phoneTab = 'recents';
  let dialed = '';
  const log = call => { if (!mine) return; d.calls.push({ id: 'c_' + uid(), seen: call.dir !== 'missed', ...call, who: freshRef(call.who) }); if (d.calls.length > 200) d.calls.splice(0, d.calls.length - 200); save(); };
  const call = (ref, video = false) => show('call', { ref, video, dir: 'out' }, 'zoom');
  async function ringMe() {
    const ref = await pickWho({ title: 'who is calling?', not: char.id, okLabel: 'call' });
    if (!ref) return;
    const v = await new Promise(res => {
      let pick = null;
      openModal({
        title: who(ref).name, body: h('div', { class: 'pc-pick-kind' }),
        actions: [{ label: 'facetime', onClick: c => { pick = true; c(); } }, { label: 'call', kind: 'primary', onClick: c => { pick = false; c(); } }],
        onClose: () => res(pick),
      });
    });
    if (v == null) return;
    show('ringing', { ref, video: v }, 'zoom');
  }

  const tabbar = (tabs, cur, go) => h('div', { class: 'pc-tabbar' }, tabs.map(([id, label, ico]) =>
    h('button', { type: 'button', class: 'pc-tab' + (cur === id ? ' on' : ''), 'data-tab': id, onclick: () => go(id) }, ico(), h('span', {}, label))));

  const people = () => {
    const out = allOcs(char.id).map(o => ({ id: o.id, name: nameOf(o) }));
    const extra = [...d.favs.map(f => f.who), ...d.calls.map(c => c.who), ...d.voicemails.map(v => v.who), ...d.threads.map(t => t.who)];
    for (const r of extra) if (!r.id || !ocById(r.id)) if (!out.some(o => sameWho(o, r)) && !/^[\d()+\-*# ]+$/.test(r.name || '')) out.push({ id: null, name: r.name });
    return out.sort((a, b) => who(a).name.localeCompare(who(b).name));
  };

  function callInfo(c) {
    const w = who(c.who);
    const same = d.calls.filter(x => sameWho(x.who, c.who) && dayLabel(x.at) === dayLabel(c.at)).reverse();
    const m = openModal({
      title: w.name,
      body: h('div', { class: 'pc-info' },
        h('div', { class: 'pc-info-top' }, face(c.who, 'lg'), h('div', { class: 'pc-info-btns' },
          h('button', { type: 'button', class: 'pc-info-btn', onclick: () => { m.close(); call(c.who, false); } }, ICO.handset(), h('span', {}, 'call')),
          h('button', { type: 'button', class: 'pc-info-btn', onclick: () => { m.close(); call(c.who, true); } }, ICO.video(), h('span', {}, 'facetime')))),
        h('div', { class: 'pc-info-day' }, dayLabel(c.at)),
        same.map(x => h('div', { class: 'pc-info-row' + (x.dir === 'missed' ? ' missed' : '') },
          h('b', {}, hmA(x.at)),
          h('span', {}, `${x.dir === 'missed' ? 'missed' : x.dir === 'in' ? 'incoming' : 'outgoing'} ${x.video ? 'facetime' : 'call'}`),
          h('em', {}, x.dir === 'missed' ? '' : x.dur ? durWords(x.dur) : 'canceled')))),
      actions: [
        mine ? { label: 'delete', kind: 'danger', onClick: close => { d.calls = d.calls.filter(x => !same.includes(x)); save(); close(); api.redraw(); } } : null,
        mine && !d.favs.some(f => sameWho(f.who, c.who)) ? { label: 'add to favorites', onClick: close => { d.favs.push({ id: 'f_' + uid(), who: freshRef(c.who), video: false }); save(); close(); } } : null,
        { label: 'done', kind: 'primary', onClick: close => close() },
      ].filter(Boolean),
    });
  }

  SCREENS.phone = ({ tab } = {}) => {
    if (tab) phoneTab = tab;
    const go = t => { phoneTab = t; show('phone', { tab: t }, null); };
    let body, title = phoneTab, right = null;
    if (phoneTab === 'favorites') {
      right = plusBtn(async () => {
        const ref = await pickWho({ title: 'add a favorite', not: char.id, okLabel: 'add' });
        if (!ref || d.favs.some(f => sameWho(f.who, ref))) return;
        d.favs.push({ id: 'f_' + uid(), who: ref, video: false }); save(); api.redraw();
      }, 'add a favorite');
      body = d.favs.length ? h('div', { class: 'ph-group pc-list' }, d.favs.map(f => h('div', { class: 'ph-row pc-row' },
        h('button', { type: 'button', class: 'pc-row-hit', onclick: () => call(f.who, f.video) }, face(f.who, 'sm'),
          h('div', { class: 'ph-row-main' }, h('b', {}, who(f.who).name), h('div', { class: 'pc-sub' }, f.video ? ICO.video() : ICO.handset(), f.video ? 'facetime' : 'mobile'))),
        mine ? h('button', { type: 'button', class: 'pc-mini', title: f.video ? 'make it a call' : 'make it facetime', onclick: () => { f.video = !f.video; save(); api.redraw(); } }, f.video ? ICO.handset() : ICO.video()) : null,
        mine ? h('button', { type: 'button', class: 'pc-mini x', title: 'remove', onclick: () => { d.favs = d.favs.filter(x => x !== f); save(); api.redraw(); } }, '✕') : null)))
        : h('div', { class: 'ph-empty' }, sticker('2b50', 'ph-empty-stk'));
    } else if (phoneTab === 'recents') {
      right = mine ? h('button', { type: 'button', class: 'ph-pill sm pc-ring-btn', onclick: ringMe }, 'make them call') : null;
      const list = [...d.calls].reverse();
      if (mine && d.calls.some(c => c.dir === 'missed' && !c.seen)) { d.calls.forEach(c => { c.seen = true; }); save(); }
      body = list.length ? h('div', { class: 'ph-group pc-list' }, list.map(c => h('div', { class: 'ph-row pc-row pc-call-row' + (c.dir === 'missed' ? ' missed' : ''), 'data-dir': c.dir },
        h('span', { class: 'pc-dir' }, c.dir === 'out' ? ICO.out() : null),
        h('button', { type: 'button', class: 'pc-row-hit', onclick: () => call(c.who, c.video) },
          h('div', { class: 'ph-row-main' }, h('b', {}, who(c.who).name), h('div', { class: 'pc-sub' }, c.video ? ICO.video() : ICO.handset(), c.video ? 'facetime video' : c.dir === 'missed' ? 'missed' : 'mobile'))),
        h('span', { class: 'pc-when' }, shortDate(c.at)),
        h('button', { type: 'button', class: 'pc-i', title: 'info', onclick: () => callInfo(c) }, ICO.info()))))
        : h('div', { class: 'ph-empty' }, sticker('260e-fe0f', 'ph-empty-stk'));
    } else if (phoneTab === 'contacts') {
      const ppl = people();
      body = h('div', {},
        h('div', { class: 'ph-me-card pc-me' }, portrait(char, 'md'), h('div', {}, h('b', {}, nameOf(char)), h('span', {}, 'my card'))),
        ppl.length ? h('div', { class: 'ph-group pc-list' }, ppl.map(p => h('div', { class: 'ph-row pc-row' },
          h('button', { type: 'button', class: 'pc-row-hit', onclick: () => call(p) }, face(p, 'sm'), h('div', { class: 'ph-row-main' }, h('b', {}, who(p).name))),
          h('button', { type: 'button', class: 'pc-mini', title: 'call', onclick: () => call(p) }, ICO.handset()),
          h('button', { type: 'button', class: 'pc-mini', title: 'facetime', onclick: () => call(p, true) }, ICO.video())))) : null);
    } else if (phoneTab === 'keypad') {
      title = '';
      const shown = h('div', { class: 'pc-dialed' }, fmtNumber(dialed));
      const del = h('button', { type: 'button', class: 'pc-del', title: 'delete', hidden: !dialed, onclick: () => { dialed = dialed.slice(0, -1); shown.textContent = fmtNumber(dialed); del.hidden = !dialed; } }, ICO.back());
      body = h('div', { class: 'pc-keypad' },
        shown,
        h('div', { class: 'pc-keys' }, KEYS.map(([k, l]) => h('button', {
          type: 'button', class: 'pc-key', onclick: () => { if (dialed.length < 18) dialed += k; shown.textContent = fmtNumber(dialed); del.hidden = !dialed; },
        }, h('b', {}, k), h('small', {}, l)))),
        h('div', { class: 'pc-key-foot' }, h('span'),
          h('button', { type: 'button', class: 'pc-green', title: 'call', onclick: () => { if (!dialed) return; const n = fmtNumber(dialed); dialed = ''; call({ id: null, name: n }); } }, ICO.handset()),
          del));
    } else {
      right = plusBtn(addVoicemail, 'add a voicemail');
      const list = [...d.voicemails].reverse();
      body = list.length ? h('div', { class: 'ph-group pc-list' }, list.map(v => voicemailRow(v))) : h('div', { class: 'ph-empty' }, sticker('1f4fc', 'ph-empty-stk'));
    }
    const missed = d.voicemails.filter(v => !v.heard).length;
    return h('div', { class: 'ph-app-screen pc-phone pc-tab-' + phoneTab },
      phoneTab === 'keypad' ? h('div', { class: 'ph-head' }, h('div', { class: 'ph-head-row' }, h('button', { type: 'button', class: 'ph-back-btn', onclick: home.go }, '‹ ', 'home'), h('span'), h('span'))) : header(title, { big: true, back: home, right }),
      h('div', { class: 'ph-scroll' }, body),
      tabbar([['favorites', 'favorites', ICO.star], ['recents', 'recents', ICO.recents], ['contacts', 'contacts', ICO.person], ['keypad', 'keypad', ICO.keypad],
        ['voicemail', 'voicemail', () => h('span', { class: 'pc-tab-ico' }, ICO.voicemail(), missed ? h('i', { class: 'pc-dot' }, missed) : null)]], phoneTab, go));
  };

  let playing = null; // { id, timer }
  function voicemailRow(v) {
    const bar = h('i');
    const time = h('span', { class: 'pc-vm-time' }, fmtDur(v.dur));
    const btn = h('button', { type: 'button', class: 'pc-vm-play', title: 'play' }, ICO.play());
    const row = h('div', { class: 'pc-vm' + (v.heard ? '' : ' new') },
      h('div', { class: 'pc-vm-top' }, h('i', { class: 'pc-vm-dot' }), face(v.who, 'sm'),
        h('div', { class: 'ph-row-main' }, h('b', {}, who(v.who).name), h('div', { class: 'pc-sub' }, dayLabel(v.at) === 'today' ? hmA(v.at) : dayLabel(v.at))),
        mine ? h('button', { type: 'button', class: 'pc-mini x', title: 'delete', onclick: async () => { if (!(await confirmDialog('delete this voicemail?', { danger: true, okLabel: 'delete' }))) return; d.voicemails = d.voicemails.filter(x => x !== v); save(); api.redraw(); } }, '✕') : null),
      h('div', { class: 'pc-vm-player' }, btn, h('div', { class: 'pc-vm-bar' }, bar), time),
      v.text ? h('div', { class: 'pc-vm-text' }, v.text) : null);
    btn.onclick = () => {
      if (playing?.id === v.id) { clearInterval(playing.timer); playing = null; fill(btn, ICO.play()); return; }
      if (playing) { clearInterval(playing.timer); api.screen.querySelectorAll('.pc-vm-play').forEach(b => fill(b, ICO.play())); }
      const start = Date.now();
      fill(btn, ICO.pause());
      row.classList.remove('new');
      if (!v.heard && mine) { v.heard = true; save(); }
      const timer = setInterval(() => {
        const t = (Date.now() - start) / 1000;
        if (!row.isConnected || t >= v.dur) { clearInterval(timer); if (playing?.timer === timer) playing = null; bar.style.width = '0%'; time.textContent = fmtDur(v.dur); fill(btn, ICO.play()); return; }
        bar.style.width = (t / v.dur * 100) + '%';
        time.textContent = '-' + fmtDur(v.dur - t);
      }, 100);
      playing = { id: v.id, timer };
    };
    return row;
  }
  async function addVoicemail() {
    const ref = await pickWho({ title: 'voicemail from', not: char.id, okLabel: 'next' });
    if (!ref) return;
    const ta = h('textarea', { rows: 4, maxLength: 600, placeholder: 'what they said', 'data-autofocus': '' });
    openModal({
      title: who(ref).name, body: h('div', { class: 'ph-form' }, ta),
      actions: [{ label: 'add', kind: 'primary', onClick: close => {
        const text = ta.value.trim();
        d.voicemails.push({ id: 'v_' + uid(), who: ref, text, at: Date.now(), dur: Math.min(180, Math.max(4, Math.round(text.split(/\s+/).filter(Boolean).length / 2.4) + 2)), heard: false });
        save(); close(); phoneTab = 'voicemail'; api.redraw();
      } }],
    });
  }

  // the call itself (outgoing, or picked up). leaving the screen any way hangs up + logs it
  SCREENS.call = ({ ref, video, dir }) => {
    const w = who(ref);
    const start = Date.now();
    let connectedAt = dir === 'in' ? start : null;
    let ended = false;
    let isVideo = !!video;
    const status = h('div', { class: 'pc-status' }, connectedAt ? '0:00' : 'calling…');
    const pressed = h('div', { class: 'pc-pressed' });
    const tick = () => {
      if (!connectedAt && Date.now() - start > 2600) connectedAt = Date.now();
      status.textContent = connectedAt ? fmtDur((Date.now() - connectedAt) / 1000) : 'calling…';
      root.classList.toggle('live', !!connectedAt);
    };
    const iv = setInterval(tick, 500);
    const hangUp = () => {
      if (ended) return;
      ended = true;
      clearInterval(iv);
      log({ who: ref, dir, video: isVideo, at: start, dur: connectedAt ? Math.round((Date.now() - connectedAt) / 1000) : 0 });
    };
    onLeave(hangUp);
    const end = () => { hangUp(); root.classList.add('ending'); setTimeout(() => show('phone', { tab: 'recents' }, 'pop'), 380); };
    const toggle = (ico, label, onTap) => h('button', { type: 'button', class: 'pc-cbtn', onclick: e => { e.currentTarget.classList.toggle('on'); onTap?.(e.currentTarget.classList.contains('on')); } }, h('span', { class: 'pc-cbtn-ico' }, ico()), h('small', {}, label));
    const grid = h('div', { class: 'pc-cgrid' });
    const drawGrid = () => fill(grid,
      toggle(ICO.mute, 'mute'), toggle(ICO.keypad, 'keypad', on => { if (on) drawKeys(); }), toggle(ICO.speaker, 'speaker'),
      toggle(ICO.plus, 'add call'), toggle(ICO.video, 'facetime', () => { isVideo = true; draw(); }), toggle(ICO.person, 'contacts'));
    const drawKeys = () => fill(grid, KEYS.map(([k, l]) => h('button', { type: 'button', class: 'pc-key dark', onclick: () => { pressed.textContent = (pressed.textContent + k).slice(-16); } }, h('b', {}, k), h('small', {}, l))),
      h('button', { type: 'button', class: 'pc-hide-keys', onclick: drawGrid }, 'hide'));
    const endBtn = h('button', { type: 'button', class: 'pc-end', title: 'end', onclick: end }, ICO.handset());
    const root = h('div', { class: 'pc-call', style: { '--c': w.color } });
    const draw = () => {
      root.classList.toggle('video', isVideo);
      if (isVideo) {
        fill(root,
          h('div', { class: 'pc-vid-them' }, face(ref, 'pc-vid-pfp')),
          h('div', { class: 'pc-vid-top' }, h('b', {}, w.name), status),
          h('div', { class: 'pc-vid-me' }, portrait(char, 'pc-vid-pfp')),
          h('div', { class: 'pc-vid-bar' },
            toggle(ICO.mute, ''), toggle(ICO.speaker, ''),
            h('button', { type: 'button', class: 'pc-cbtn', title: 'flip', onclick: () => root.classList.toggle('swap') }, h('span', { class: 'pc-cbtn-ico' }, ICO.flip())),
            endBtn));
      } else {
        drawGrid();
        fill(root,
          h('div', { class: 'pc-call-bg' }, face(ref, 'pc-bg-pfp')),
          h('div', { class: 'pc-call-top' }, status, h('b', { class: 'pc-call-name' }, w.name), pressed),
          h('div', { class: 'pc-call-face' }, face(ref, 'pc-big-pfp')),
          grid,
          h('div', { class: 'pc-call-foot' }, endBtn));
      }
    };
    draw();
    requestAnimationFrame(tick);
    return root;
  };

  // someone calling you
  SCREENS.ringing = ({ ref, video }) => {
    const w = who(ref);
    let done = false;
    onLeave(() => { if (!done) { done = true; log({ who: ref, dir: 'missed', video, at: Date.now(), dur: 0 }); } });
    const answer = () => { done = true; show('call', { ref, video, dir: 'in' }, null); };
    const decline = () => { if (!done) { done = true; log({ who: ref, dir: 'missed', video, at: Date.now(), dur: 0 }); } show('phone', { tab: 'recents' }, 'pop'); };
    return h('div', { class: 'pc-call pc-ringing' + (video ? ' video' : ''), style: { '--c': w.color } },
      video ? h('div', { class: 'pc-vid-them' }, portrait(char, 'pc-vid-pfp')) : h('div', { class: 'pc-call-bg' }, face(ref, 'pc-bg-pfp')),
      h('div', { class: 'pc-call-top' }, h('div', { class: 'pc-status' }, video ? 'facetime video' : 'mobile'), h('b', { class: 'pc-call-name' }, w.name)),
      h('div', { class: 'pc-call-face' }, h('div', { class: 'pc-rings' }, h('i'), h('i'), face(ref, 'pc-big-pfp'))),
      h('div', { class: 'pc-answer' },
        h('label', { class: 'pc-ans' }, h('button', { type: 'button', class: 'pc-end', title: 'decline', onclick: decline }, ICO.handset()), h('small', {}, 'decline')),
        h('label', { class: 'pc-ans' }, h('button', { type: 'button', class: 'pc-green pc-accept', title: 'accept', onclick: answer }, video ? ICO.video() : ICO.handset()), h('small', {}, 'accept'))));
  };

  // ---------------- clock ----------------
  let clockTab = 'alarms';
  const sw = { running: false, startAt: 0, acc: 0, laps: [] }; // stopwatch
  const tm = { total: 300, endAt: 0, left: 0, state: 'idle' }; // timer: idle | run | pause
  let tmDone = null;
  const swNow = () => sw.acc + (sw.running ? Date.now() - sw.startAt : 0);
  const fmtSw = ms => { const cs = Math.floor(ms / 10); return `${String(Math.floor(cs / 6000)).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`; };
  const tmLeft = () => (tm.state === 'run' ? Math.max(0, tm.endAt - Date.now()) : tm.state === 'pause' ? tm.left : tm.total * 1000);
  const armTimer = () => {
    clearTimeout(tmDone);
    if (tm.state !== 'run') return;
    tmDone = setTimeout(() => {
      tm.state = 'idle';
      if (!api.screen.isConnected) return;
      toast('timer done');
      api.screen.classList.add('pc-flash');
      setTimeout(() => api.screen.classList.remove('pc-flash'), 1300);
      if (api.screen.querySelector('.pc-timer')) show('clock', { tab: 'timer' }, null);
    }, tm.endAt - Date.now());
  };
  const to12 = t => { const [H, M] = t.split(':').map(Number); return { time: `${H % 12 || 12}:${String(M).padStart(2, '0')}`, ampm: H < 12 ? 'am' : 'pm' }; };

  function alarmBox(a) {
    const isNew = !a;
    a ||= { id: 'a_' + uid(), time: '07:00', label: '', on: true };
    const t = h('input', { type: 'time', value: a.time, class: 'pc-time-in' });
    const l = h('input', { type: 'text', value: a.label, placeholder: 'alarm', maxLength: 40 });
    openModal({
      title: isNew ? 'add alarm' : 'edit alarm', body: h('div', { class: 'ph-form' }, t, l),
      actions: [
        isNew ? null : { label: 'delete', kind: 'danger', onClick: close => { d.alarms = d.alarms.filter(x => x.id !== a.id); save(); close(); api.redraw(); } },
        { label: 'save', kind: 'primary', onClick: close => { if (!t.value) return t.focus(); a.time = t.value; a.label = l.value.trim(); if (isNew) d.alarms.push(a); d.alarms.sort((x, y) => x.time.localeCompare(y.time)); save(); close(); api.redraw(); } },
      ].filter(Boolean),
    });
  }
  function cityBox() {
    const m = openModal({
      title: 'add a city',
      body: h('div', { class: 'pc-cities' }, CITIES.filter(([n]) => !d.cities.some(c => c.name === n)).map(([name, tz]) => h('button', {
        type: 'button', class: 'pc-city-pick', onclick: () => { d.cities.push({ name, tz }); save(); m.close(); api.redraw(); },
      }, h('b', {}, name), h('span', {}, cityTime(tz).time + ' ' + cityTime(tz).ampm)))),
      actions: [],
    });
  }

  SCREENS.clock = ({ tab } = {}) => {
    if (tab) clockTab = tab;
    const go = t => { clockTab = t; show('clock', { tab: t }, null); };
    let body, title = clockTab === 'world' ? 'world clock' : clockTab, right = null;
    const ivs = [];
    onLeave(() => ivs.forEach(clearInterval));
    if (clockTab === 'world') {
      right = plusBtn(cityBox, 'add a city');
      const rows = d.cities.map(c => {
        const t = cityTime(c.tz);
        return h('div', { class: 'ph-row pc-city', 'data-tz': c.tz },
          h('div', { class: 'ph-row-main' }, h('div', { class: 'pc-sub' }, `${t.day}, ${offLabel(t.off)}`), h('b', {}, c.name)),
          h('div', { class: 'pc-big-time' }, h('span', { class: 'pc-ct' }, t.time), h('small', {}, t.ampm)),
          mine ? h('button', { type: 'button', class: 'pc-mini x', title: 'remove', onclick: () => { d.cities = d.cities.filter(x => x !== c); save(); api.redraw(); } }, '✕') : null);
      });
      body = rows.length ? h('div', { class: 'pc-plain-list' }, rows) : h('div', { class: 'ph-empty' }, sticker('1f30d', 'ph-empty-stk'));
      ivs.push(setInterval(() => rows.forEach((r, i) => { const c = d.cities[i]; if (c) r.querySelector('.pc-ct').textContent = cityTime(c.tz).time; }), 5000));
    } else if (clockTab === 'alarms') {
      right = plusBtn(() => alarmBox(), 'add alarm');
      body = d.alarms.length ? h('div', { class: 'pc-plain-list' }, d.alarms.map(a => {
        const t = to12(a.time);
        return h('div', { class: 'ph-row pc-alarm' + (a.on ? '' : ' off') },
          h('button', { type: 'button', class: 'pc-row-hit', disabled: !mine, onclick: () => alarmBox(a) },
            h('div', { class: 'ph-row-main' }, h('div', { class: 'pc-big-time' }, h('span', {}, t.time), h('small', {}, t.ampm)), h('div', { class: 'pc-sub' }, a.label || 'alarm'))),
          h('button', { type: 'button', class: 'ph-switch' + (a.on ? ' on' : ''), disabled: !mine, onclick: e => { a.on = !a.on; save(); e.currentTarget.classList.toggle('on', a.on); e.currentTarget.closest('.pc-alarm').classList.toggle('off', !a.on); } }, h('i')));
      })) : h('div', { class: 'ph-empty' }, sticker('23f0', 'ph-empty-stk'));
    } else if (clockTab === 'stopwatch') {
      title = '';
      const face_ = h('div', { class: 'pc-sw-time' }, fmtSw(swNow()));
      const laps = h('div', { class: 'pc-laps' });
      const left = h('button', { type: 'button', class: 'pc-round gray' });
      const rightB = h('button', { type: 'button', class: 'pc-round' });
      const drawLaps = () => {
        const all = [...sw.laps, swNow() - sw.laps.reduce((a, b) => a + b, 0)];
        const done = sw.laps.length > 1 ? sw.laps : [];
        const best = done.length ? Math.min(...done) : null, worst = done.length ? Math.max(...done) : null;
        fill(laps, swNow() || sw.laps.length ? all.map((ms, i) => h('div', { class: 'pc-lap' + (i < sw.laps.length && ms === best ? ' best' : '') + (i < sw.laps.length && ms === worst ? ' worst' : '') }, h('span', {}, 'lap ' + (i + 1)), h('span', { class: i === all.length - 1 ? 'pc-lap-live' : '' }, fmtSw(ms)))).reverse() : null);
      };
      const drawBtns = () => {
        left.textContent = sw.running || !swNow() ? 'lap' : 'reset';
        left.disabled = !sw.running && !swNow();
        rightB.textContent = sw.running ? 'stop' : 'start';
        rightB.className = 'pc-round ' + (sw.running ? 'red' : 'green');
      };
      left.onclick = () => {
        if (sw.running) sw.laps.push(swNow() - sw.laps.reduce((a, b) => a + b, 0));
        else { sw.acc = 0; sw.laps = []; face_.textContent = fmtSw(0); }
        drawLaps(); drawBtns();
      };
      rightB.onclick = () => {
        if (sw.running) { sw.acc = swNow(); sw.running = false; } else { sw.startAt = Date.now(); sw.running = true; }
        drawBtns(); drawLaps();
      };
      ivs.push(setInterval(() => { if (!sw.running) return; face_.textContent = fmtSw(swNow()); const live = laps.querySelector('.pc-lap-live'); if (live) live.textContent = fmtSw(swNow() - sw.laps.reduce((a, b) => a + b, 0)); else drawLaps(); }, 47));
      drawBtns(); drawLaps();
      body = h('div', { class: 'pc-sw' }, face_, h('div', { class: 'pc-round-row' }, left, rightB), laps);
    } else {
      title = '';
      const R = 112, C = 2 * Math.PI * R;
      const ring = s('circle', { cx: 130, cy: 130, r: R, class: 'pc-ring-fg', 'stroke-dasharray': C });
      const left = h('div', { class: 'pc-tm-left' });
      const mins = h('input', { type: 'number', min: 0, max: 180, value: Math.floor(tm.total / 60), class: 'pc-tm-in' });
      const secs = h('input', { type: 'number', min: 0, max: 59, value: tm.total % 60, class: 'pc-tm-in' });
      const cancel = h('button', { type: 'button', class: 'pc-round gray' }, 'cancel');
      const main = h('button', { type: 'button', class: 'pc-round' });
      const dial = h('div', { class: 'pc-tm-dial' }, s('svg', { viewBox: '0 0 260 260' }, s('circle', { cx: 130, cy: 130, r: R, class: 'pc-ring-bg' }), ring), left);
      const picker = h('div', { class: 'pc-tm-pick' }, h('label', {}, mins, h('span', {}, 'min')), h('label', {}, secs, h('span', {}, 'sec')));
      const paint = () => {
        const ms = tmLeft();
        const sec = Math.ceil(ms / 1000);
        left.textContent = fmtDur(sec);
        ring.setAttribute('stroke-dashoffset', C * (1 - ms / (tm.total * 1000 || 1)));
        dial.hidden = tm.state === 'idle';
        picker.hidden = tm.state !== 'idle';
        cancel.disabled = tm.state === 'idle';
        main.textContent = tm.state === 'run' ? 'pause' : tm.state === 'pause' ? 'resume' : 'start';
        main.className = 'pc-round ' + (tm.state === 'run' ? 'orange' : 'green');
      };
      main.onclick = () => {
        if (tm.state === 'idle') {
          const total = Math.min(180, Math.max(0, Number(mins.value) || 0)) * 60 + Math.min(59, Math.max(0, Number(secs.value) || 0));
          if (!total) return mins.focus();
          tm.total = total; tm.endAt = Date.now() + total * 1000; tm.state = 'run';
        } else if (tm.state === 'run') { tm.left = tm.endAt - Date.now(); tm.state = 'pause'; } else { tm.endAt = Date.now() + tm.left; tm.state = 'run'; }
        armTimer(); paint();
      };
      cancel.onclick = () => { tm.state = 'idle'; armTimer(); paint(); };
      ivs.push(setInterval(() => { if (tm.state === 'run') paint(); }, 200));
      paint();
      body = h('div', { class: 'pc-timer' }, picker, dial, h('div', { class: 'pc-round-row' }, cancel, main));
    }
    return h('div', { class: 'ph-app-screen pc-clock pc-tab-' + clockTab },
      title ? header(title, { big: true, back: home, right }) : h('div', { class: 'ph-head' }, h('div', { class: 'ph-head-row' }, h('button', { type: 'button', class: 'ph-back-btn', onclick: home.go }, '‹ ', 'home'), h('span'), h('span'))),
      h('div', { class: 'ph-scroll' }, body),
      tabbar([['world', 'world clock', ICO.globe], ['alarms', 'alarms', ICO.alarm], ['stopwatch', 'stopwatch', ICO.stopwatch], ['timer', 'timer', ICO.timer]], clockTab, go));
  };

  // ---------------- calculator ----------------
  SCREENS.calculator = () => {
    let cur = '0', acc = null, op = null, fresh = false, last = null; // last = [op, b] for repeat =
    const out = h('div', { class: 'pc-calc-out' });
    const keysEl = h('div', { class: 'pc-calc-keys' });
    const num = () => Number(cur);
    const apply = (a, o, b) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);
    const fmt = n => {
      if (!isFinite(n)) return 'error';
      if (Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-8 && n !== 0)) return n.toExponential(4).replace('e+', 'e');
      return String(Number(n.toPrecision(9)));
    };
    const pretty = str => {
      if (str === 'error' || str.includes('e')) return str;
      const [i, f] = str.split('.');
      const neg = i.startsWith('-');
      return (neg ? '-' : '') + Number(neg ? i.slice(1) : i).toLocaleString('en-US') + (f != null ? '.' + f : '');
    };
    const paint = () => {
      const txt = pretty(cur);
      out.textContent = txt;
      out.style.fontSize = txt.length > 9 ? Math.max(30, 64 - (txt.length - 9) * 5) + 'px' : '';
      keysEl.querySelectorAll('[data-op]').forEach(b => b.classList.toggle('on', fresh && b.dataset.op === op));
      const ac = keysEl.querySelector('[data-k="ac"]');
      if (ac) ac.textContent = cur !== '0' && !fresh ? 'C' : 'AC';
    };
    const press = k => {
      if (cur === 'error' && k !== 'ac') cur = '0';
      if (/^\d$/.test(k)) {
        if (fresh) { cur = k; fresh = false; } else if (cur.replace(/[-.]/g, '').length < 9) cur = cur === '0' ? k : cur === '-0' ? '-' + k : cur + k;
      } else if (k === '.') {
        if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.';
      } else if (k === 'ac') {
        if (cur !== '0' && !fresh) cur = '0'; else { cur = '0'; acc = null; op = null; last = null; }
        fresh = false;
      } else if (k === '±') {
        cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur; fresh = false;
      } else if (k === '%') {
        cur = fmt(num() / 100); fresh = false;
      } else if (k === '=') {
        if (op != null && acc != null) { const b = num(); cur = fmt(apply(acc, op, b)); last = [op, b]; acc = null; op = null; } else if (last) cur = fmt(apply(num(), last[0], last[1]));
        fresh = true;
      } else { // + − × ÷
        if (op != null && acc != null && !fresh) cur = fmt(apply(acc, op, num()));
        acc = num(); op = k; fresh = true;
      }
      paint();
    };
    const KEYS_C = [['ac', 'AC', 'fn'], ['±', '±', 'fn'], ['%', '%', 'fn'], ['÷', '÷', 'op'], ['7'], ['8'], ['9'], ['×', '×', 'op'], ['4'], ['5'], ['6'], ['−', '−', 'op'], ['1'], ['2'], ['3'], ['+', '+', 'op'], ['0', '0', 'zero'], ['.'], ['=', '=', 'op eq']];
    fill(keysEl, KEYS_C.map(([k, label = k, cls = 'num']) => h('button', { type: 'button', class: 'pc-ck ' + cls, 'data-k': k, dataset: cls.startsWith('op') && k !== '=' ? { op: k } : {}, onclick: () => press(k) }, label)));
    paint();
    return h('div', { class: 'pc-calc' },
      h('div', { class: 'pc-calc-head' }, h('button', { type: 'button', class: 'ph-back-btn', onclick: home.go }, '‹ ', 'home')),
      out, keysEl);
  };
}
