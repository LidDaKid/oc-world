// phone: the oc's phone. a case you can dress up (flip it to see the back), a lock screen,
// a home screen + messages, photos, music, notes, camera, contacts, settings.

import { h, s, fill, uid, openModal, confirmDialog, swatches, segmented, toast } from '../ui.js';
import { store } from '../store.js';
import { dataFor, pic, sticker, appBar, portrait, nameOf, allOcs, ocById } from './kit.js';
import { who, face, freshRef, pickWho, hm, hmA, stamp, dayLabel, shortDate, addPhotos, dropImage, relLabel, inkOn } from './phone-bits.js';

export const meta = { id: 'phone', label: 'phone', icon: '1f4f1' };

const DEF = {
  case: { style: 'glossy', color: '#ff4fa3', charm: '1f987', stickers: [] },
  lock: { imageId: null },
  home: { imageId: null },
  clockFont: 'clean', dark: false, bubble: null, carrier: 'oc mobile', battery: 78,
  threads: [], photos: [], notes: [], songs: [], nowPlaying: null,
};

export const CASES = [
  ['glossy', 'glossy'], ['glitter', 'glitter'], ['fuzzy', 'fuzzy'], ['studded', 'studded'],
  ['leopard', 'leopard'], ['hearts', 'hearts'], ['stars', 'stars'], ['clear', 'clear'], ['lace', 'lace'],
];
const CASE_COLORS = ['#ff4fa3', '#ff8ac4', '#141114', '#f6eefb', '#b18cff', '#d81e5b', '#7df9d0', '#6ec6ff', '#ffd84d', '#9b8aa8', '#5a1a2e', '#c0c0c8'];
const CHARMS = ['1f987', '1f5a4', '1f496', '1f480', '1f380', '2b50', '1f319', '1f98b', '1f353', '1f431', '1f9f8', '1f484', '1f3b8', '1f52e', '1f344', '1f47b'];
const CASE_STICKERS = ['1f5a4', '1f496', '1f987', '1f480', '2b50', '2728', '1f380', '1f98b', '1f319', '1f353', '1f48b', '1f3b8', '1f3a7', '1f4bf', '1f52e', '1f47b', '1f578-fe0f', '1f577-fe0f', '1f339', '1f940', '1f431', '1f430', '1f9f8', '1f451', '1f48e', '1f344', '1f308', '1f525', '26a1', '1f36d'];
const CLOCKS = [['clean', 'clean'], ['bubbly', 'bubbly'], ['pixel', 'pixel'], ['gothic', 'gothic'], ['script', 'script']];
const REACTS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

const APPS = {
  messages: { label: 'messages', icon: '1f4ac', bg: 'linear-gradient(160deg,#6ff07a,#1fbf3f)' },
  photos: { label: 'photos', icon: '1f338', bg: 'linear-gradient(160deg,#fff,#f1e9f5)' },
  music: { label: 'music', icon: '1f3a7', bg: 'linear-gradient(160deg,#ff6b8b,#f2224f)' },
  camera: { label: 'camera', icon: '1f4f7', bg: 'linear-gradient(160deg,#d8d8de,#8d8d96)' },
  notes: { label: 'notes', icon: '1f4dd', bg: 'linear-gradient(160deg,#fff7c2,#ffd84d)' },
  contacts: { label: 'contacts', icon: '1f4de', bg: 'linear-gradient(160deg,#c9c9d1,#8e8e99)' },
  settings: { label: 'settings', icon: '2699-fe0f', bg: 'linear-gradient(160deg,#9a9aa5,#55555f)' },
};

// little svgs for the status bar
const signal = () => s('svg', { viewBox: '0 0 18 12', class: 'ph-ico' }, [0, 1, 2, 3].map(i => s('rect', { x: i * 4.6, y: 9 - i * 3, width: 3.2, height: 3 + i * 3, rx: 1 })));
const wifi = () => s('svg', { viewBox: '0 0 16 12', class: 'ph-ico' },
  s('path', { d: 'M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0Z' }),
  s('path', { d: 'M3.4 6.8a6.6 6.6 0 0 1 9.2 0l-1.4 1.4a4.6 4.6 0 0 0-6.4 0Z' }),
  s('path', { d: 'M1.1 4.5a9.9 9.9 0 0 1 13.8 0l-1.4 1.4a7.9 7.9 0 0 0-11 0Z' }));
const battery = pct => s('svg', { viewBox: '0 0 27 12', class: 'ph-ico ph-batt' },
  s('rect', { x: .5, y: .5, width: 22, height: 11, rx: 3.2, fill: 'none', stroke: 'currentColor', 'stroke-opacity': .45 }),
  s('rect', { x: 2, y: 2, width: Math.max(1.5, 19 * pct / 100), height: 8, rx: 1.8, fill: pct <= 20 ? '#ff3b30' : 'currentColor' }),
  s('path', { d: 'M24 4v4a2 2 0 0 0 0-4Z', 'fill-opacity': .5 }));
const torchIco = () => s('svg', { viewBox: '0 0 24 24', class: 'ph-round-ico' }, s('path', { d: 'M7 2h10v4l-3 4v11a2 2 0 0 1-4 0V10L7 6Z' }), s('circle', { cx: 12, cy: 14, r: 1.4, fill: '#000', 'fill-opacity': .4 }));
const camIco = () => s('svg', { viewBox: '0 0 24 24', class: 'ph-round-ico' }, s('path', { d: 'M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z' }), s('circle', { cx: 12, cy: 13, r: 3.6, fill: '#000', 'fill-opacity': .35 }));
const lockIco = open => s('svg', { viewBox: '0 0 20 26', class: 'ph-lock-ico' + (open ? ' open' : '') },
  s('path', { class: 'ph-shackle', d: 'M5 11V7a5 5 0 0 1 10 0v4', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
  s('rect', { x: 1.5, y: 11, width: 17, height: 13, rx: 3.5 }));

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = dataFor(char, 'phone', DEF);
  d.case = { ...DEF.case, ...d.case };
  d.lock = { imageId: null, ...d.lock };
  d.home = { imageId: null, ...d.home };
  for (const t of d.threads) { t.msgs ||= []; t.read ??= true; }
  const save = () => ctx.save();
  const myRef = { id: char.id, name: nameOf(char) };
  const timers = [];

  // ---- the device ----
  const views = h('div', { class: 'ph-views' });
  const statusTime = h('span', { class: 'ph-status-time' });
  const statusRight = h('span', { class: 'ph-status-right' });
  const screen = h('div', { class: 'ph-screen' },
    h('div', { class: 'ph-status' }, statusTime, h('div', { class: 'ph-island' }, h('i')), statusRight),
    views,
    h('button', { type: 'button', class: 'ph-homebar', title: 'home', onclick: () => goHome() }));
  const back = h('div', { class: 'ph-back' });
  const device = h('div', { class: 'ph-device' },
    h('div', { class: 'ph-front' }, h('i', { class: 'ph-btn ph-btn-a' }), h('i', { class: 'ph-btn ph-btn-b' }), h('i', { class: 'ph-btn ph-btn-c' }), h('i', { class: 'ph-btn ph-btn-d' }), screen),
    back);
  const charm = h('div', { class: 'ph-charm' });
  const stage = h('div', { class: 'ph-stage' }, h('div', { class: 'ph-holder' }, device, charm));

  function paintCase() {
    device.dataset.case = d.case.style;
    stage.style.setProperty('--case', d.case.color);
    screen.classList.toggle('dark', !!d.dark);
    screen.style.setProperty('--me', d.bubble || char.color || '#ff4fa3');
    screen.style.setProperty('--me-ink', inkOn(d.bubble || char.color || '#ff4fa3'));
    stage.style.setProperty('--oc', char.color || '#ff4fa3');
    screen.dataset.clock = d.clockFont;
    fill(charm, d.case.charm ? [h('i', { class: 'ph-strap' }), h('i', { class: 'ph-bead' }), sticker(d.case.charm, 'ph-charm-stk')] : null);
    drawBack();
  }

  function drawStatus() {
    statusTime.textContent = hm();
    fill(statusRight, signal(), wifi(), battery(d.battery));
    views.querySelectorAll('[data-clock-live]').forEach(e => { e.textContent = hm(); });
  }
  timers.push(setInterval(drawStatus, 10000));

  // the back of the phone: camera bump, case pattern + stickers you can drag around
  function drawBack() {
    fill(back,
      h('div', { class: 'ph-cam' }, h('i'), h('i'), h('i'), h('b')),
      d.case.stickers.map(st => {
        const img = sticker(st.code, 'ph-case-stk');
        const box = h('div', { class: 'ph-case-item', style: { left: st.x + '%', top: st.y + '%', transform: `translate(-50%,-50%) rotate(${st.r || 0}deg) scale(${st.k || 1})` } }, img,
          mine ? h('button', { type: 'button', class: 'ph-case-x', title: 'take off', onclick: e => { e.stopPropagation(); d.case.stickers = d.case.stickers.filter(x => x !== st); save(); drawBack(); } }, '✕') : null);
        if (mine) dragOn(box, back, (x, y) => { st.x = x; st.y = y; box.style.left = x + '%'; box.style.top = y + '%'; }, save);
        return box;
      }));
  }

  // ---- screens ----
  let cur = null;
  let cleanupScreen = null;
  function show(name, params = {}, anim = 'push', origin = null) {
    cleanupScreen?.();
    cleanupScreen = null;
    const old = [...views.children].filter(v => !v.classList.contains('leaving'));
    const view = h('div', { class: 'ph-view ph-v-' + name });
    cur = { name, params, view };
    const content = SCREENS[name](params, view);
    fill(view, content);
    screen.dataset.screen = name;
    if (origin) view.style.transformOrigin = origin;
    views.append(view);
    if (anim) {
      view.classList.add('in-' + anim);
      old.forEach(o => { o.classList.add('leaving', 'out-' + anim); if (origin && anim === 'close') o.style.transformOrigin = origin; });
      setTimeout(() => { old.forEach(o => o.remove()); view.classList.remove('in-' + anim); }, 420);
    } else old.forEach(o => o.remove());
  }
  const redraw = () => show(cur.name, cur.params, null);
  let lastIcon = null;
  function goHome() {
    if (!cur || cur.name === 'home') return;
    if (cur.name === 'lock') { show('home', {}, 'unlock'); return; }
    show('home', {}, 'close', lastIcon);
  }
  function openApp(name, iconEl, params = {}) {
    let origin = null;
    if (iconEl) {
      const a = iconEl.getBoundingClientRect(), b = screen.getBoundingClientRect();
      origin = `${a.left - b.left + a.width / 2}px ${a.top - b.top + a.height / 2}px`;
    }
    lastIcon = origin;
    show(name, params, 'zoom', origin);
  }
  const header = (title, { back: backTo, right, big = false } = {}) => h('div', { class: 'ph-head' + (big ? ' big' : '') },
    h('div', { class: 'ph-head-row' },
      backTo ? h('button', { type: 'button', class: 'ph-back-btn', onclick: backTo.go }, '‹ ', backTo.label) : h('span'),
      big ? h('span') : h('b', { class: 'ph-head-title' }, title),
      h('div', { class: 'ph-head-right' }, right)),
    big ? h('h3', { class: 'ph-big-title' }, title) : null);
  const plusBtn = (onclick, title = 'add') => mine ? h('button', { type: 'button', class: 'ph-plus', title, onclick }, '+') : null;
  const wall = (imageId, fallbackCls) => h('div', { class: 'ph-wall ' + fallbackCls }, imageId ? pic(imageId, 'ph-wall-img') : null);

  const SCREENS = {};

  // lock screen
  SCREENS.lock = () => {
    const now = new Date();
    const notes = d.threads.map(t => ({ t, m: t.msgs.filter(m => m.from === 'them').at(-1) })).filter(x => x.m).sort((a, b) => b.m.at - a.m.at).slice(0, 3);
    let y0 = null, going = false;
    const unlock = () => { if (going) return; going = true; lockEl.classList.add('opening'); setTimeout(() => show('home', {}, 'unlock'), 160); };
    const lockEl = h('div', {
      class: 'ph-lock',
      onpointerdown: e => { y0 = e.clientY; },
      onpointerup: e => { if (y0 != null && y0 - e.clientY > 40) unlock(); y0 = null; },
      onclick: e => { if (!e.target.closest('button')) unlock(); },
    },
      wall(d.lock.imageId, 'ph-wall-lock'),
      h('span', { class: 'ph-carrier' }, d.carrier),
      h('div', { class: 'ph-lock-top' }, lockIco(false)),
      h('div', { class: 'ph-lock-date' }, now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase()),
      h('div', { class: 'ph-lock-clock', 'data-clock-live': '' }, hm()),
      h('div', { class: 'ph-notifs' }, notes.map(({ t, m }, i) => h('button', {
        type: 'button', class: 'ph-notif', style: { animationDelay: (0.15 + i * 0.12) + 's' },
        onclick: () => { lockEl.classList.add('opening'); setTimeout(() => show('thread', { id: t.id }, 'unlock'), 160); },
      },
        h('div', { class: 'ph-notif-ico', style: { background: APPS.messages.bg } }, sticker(APPS.messages.icon)),
        h('div', { class: 'ph-notif-body' },
          h('div', { class: 'ph-notif-top' }, h('b', {}, who(t.who).name), h('span', {}, dayLabel(m.at) === 'today' ? hm(m.at) : dayLabel(m.at))),
          h('div', { class: 'ph-notif-text' }, m.imageId && !m.text ? '📷 photo' : m.text)),
        face(t.who, 'xs ph-notif-face')))),
      h('div', { class: 'ph-lock-bottom' },
        h('button', { type: 'button', class: 'ph-round', title: 'flashlight', onclick: e => { e.currentTarget.classList.toggle('on'); screen.classList.toggle('torch'); } }, torchIco()),
        h('button', { type: 'button', class: 'ph-round', title: 'camera', onclick: e => { e.stopPropagation(); openApp('camera', e.currentTarget); } }, camIco())));
    return lockEl;
  };

  // home screen
  const unread = () => d.threads.reduce((n, t) => {
    let k = 0;
    for (let i = t.msgs.length - 1; i >= 0 && t.msgs[i].from === 'them'; i--) k++;
    return n + k;
  }, 0);
  const icon = (id, extra) => {
    const a = APPS[id];
    const b = h('button', { type: 'button', class: 'ph-app', 'data-app': id, onclick: e => openApp(id, e.currentTarget.querySelector('.ph-app-ico')) },
      h('span', { class: 'ph-app-ico', style: { background: a.bg } }, sticker(a.icon), extra),
      h('span', { class: 'ph-app-label' }, a.label));
    return b;
  };
  SCREENS.home = () => {
    const n = unread();
    const lastPhoto = d.photos.at(-1);
    const songs = allSongs();
    const playingTitle = songs[0]?.title;
    return h('div', { class: 'ph-home' },
      wall(d.home.imageId || d.lock.imageId, 'ph-wall-home'),
      h('div', { class: 'ph-widgets' },
        h('button', { type: 'button', class: 'ph-widget ph-w-photo', onclick: e => openApp('photos', e.currentTarget) },
          lastPhoto ? pic(lastPhoto.imageId, 'ph-w-img') : portrait(char, 'ph-w-pfp'),
          h('span', { class: 'ph-w-cap' }, lastPhoto ? dayLabel(lastPhoto.at) : nameOf(char))),
        playingTitle
          ? h('button', { type: 'button', class: 'ph-widget ph-w-music', onclick: e => openApp('music', e.currentTarget) },
            h('div', { class: 'ph-w-disc' }, portrait(char, 'ph-disc-pfp')),
            h('b', {}, playingTitle), h('span', {}, songs[0].artist || nameOf(char)),
            h('div', { class: 'ph-w-bars' }, h('i'), h('i'), h('i'), h('i')))
          : h('div', { class: 'ph-widget ph-w-cal' },
            h('span', {}, new Date().toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase()),
            h('b', {}, new Date().getDate()),
            h('em', {}, d.notes[0] ? noteTitle(d.notes[0]) : new Date().toLocaleDateString(undefined, { month: 'long' }).toLowerCase()))),
      h('div', { class: 'ph-grid' }, icon('camera'), icon('notes'), icon('contacts'), mine ? icon('settings') : null),
      h('div', { class: 'ph-dots' }, h('i', { class: 'on' }), h('i')),
      h('div', { class: 'ph-dock' },
        icon('messages', n ? h('span', { class: 'ph-badge' }, n > 99 ? '99+' : n) : null), icon('photos'), icon('music')));
  };

  // messages
  const threadById = id => d.threads.find(t => t.id === id);
  const toHome = { label: '', go: () => goHome() };
  SCREENS.messages = () => {
    const list = [...d.threads].sort((a, b) => (b.msgs.at(-1)?.at || b.at || 0) - (a.msgs.at(-1)?.at || a.at || 0));
    return h('div', { class: 'ph-app-screen' },
      header('messages', { big: true, back: { label: 'home', go: () => goHome() }, right: plusBtn(newThread, 'new message') }),
      h('div', { class: 'ph-scroll' },
        list.length ? list.map(t => {
          const last = t.msgs.at(-1);
          const w = who(t.who);
          return h('button', { type: 'button', class: 'ph-row ph-thread-row', onclick: () => show('thread', { id: t.id }) },
            last?.from === 'them' ? h('i', { class: 'ph-unread' }) : h('i', { class: 'ph-unread off' }),
            face(t.who, 'md'),
            h('div', { class: 'ph-row-main' },
              h('div', { class: 'ph-row-top' }, h('b', {}, w.name), h('span', {}, last ? shortDate(last.at) : '')),
              h('div', { class: 'ph-row-sub' }, last ? (last.imageId && !last.text ? '📷 photo' : last.text) : ' ')),
            h('span', { class: 'ph-chev' }, '›'));
        }) : h('div', { class: 'ph-empty' }, sticker('1f4ac', 'ph-empty-stk'), mine ? h('button', { type: 'button', class: 'ph-pill', onclick: newThread }, 'new message') : null)));
  };
  async function newThread() {
    const ref = await pickWho({ title: 'new message', not: char.id, okLabel: 'text them' });
    if (!ref) return;
    let t = d.threads.find(x => (ref.id && x.who.id === ref.id) || (!ref.id && !x.who.id && x.who.name.toLowerCase() === ref.name.toLowerCase()));
    if (!t) {
      t = { id: 't_' + uid(), who: ref, msgs: [], read: true, typing: false, at: Date.now() };
      d.threads.push(t);
      save();
    }
    show('thread', { id: t.id });
  }

  SCREENS.thread = ({ id }) => {
    const t = threadById(id);
    if (!t) return SCREENS.messages();
    const w = who(t.who);
    let as = 'me';
    const list = h('div', { class: 'ph-scroll ph-chat' });
    const input = h('input', { type: 'text', class: 'ph-input', maxLength: 600, placeholder: 'message', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } } });
    const asBtn = h('button', { type: 'button', class: 'ph-as', title: 'switch who is texting', onclick: () => { as = as === 'me' ? 'them' : 'me'; drawAs(); input.focus(); } });
    const drawAs = () => {
      fill(asBtn, as === 'me' ? portrait(char, 'xs') : face(t.who, 'xs'));
      asBtn.classList.toggle('them', as === 'them');
      input.placeholder = as === 'me' ? 'message' : `as ${w.name}`;
    };
    function send(imageId = null) {
      const text = input.value.trim();
      if (!text && !imageId) return;
      t.who = freshRef(t.who);
      t.msgs.push({ id: 'm_' + uid(), from: as, text, imageId, at: Date.now(), react: null });
      input.value = '';
      save();
      drawMsgs(true);
    }
    async function sendPic() {
      const [p] = await addPhotos(false, 1000);
      if (p) send(p.imageId);
    }
    function drawMsgs(animateLast = false) {
      let prev = null;
      const lastMine = t.msgs.map(m => m.from).lastIndexOf('me');
      fill(list,
        h('div', { class: 'ph-chat-top' }, face(t.who, 'lg'), h('b', {}, w.name), w.gone ? null : relLabel(char, t.who.id) ? h('span', {}, relLabel(char, t.who.id)) : null),
        t.msgs.map((m, i) => {
          const gap = !prev || m.at - prev.at > 3600e3;
          const tail = !t.msgs[i + 1] || t.msgs[i + 1].from !== m.from || t.msgs[i + 1].at - m.at > 3600e3;
          const bubble = h('div', {
            class: `ph-bubble ${m.from}${tail ? ' tail' : ''}${m.imageId ? ' has-pic' : ''}${animateLast && i === t.msgs.length - 1 ? ' pop' : ''}`,
            onclick: e => { e.stopPropagation(); tapback(m, bubble); },
          }, m.imageId ? pic(m.imageId, 'ph-msg-pic') : null, m.text ? h('span', {}, m.text) : null,
            m.react ? h('span', { class: 'ph-react' }, m.react) : null);
          prev = m;
          return [
            gap ? h('div', { class: 'ph-stamp' }, h('b', {}, dayLabel(m.at)), ' ', hmA(m.at)) : null,
            h('div', { class: `ph-msg-row ${m.from}${m.react ? ' reacted' : ''}` }, bubble),
            i === lastMine && i === t.msgs.length - 1 && m.from === 'me' ? h('div', { class: 'ph-receipt' }, t.read ? h('span', {}, h('b', {}, 'read '), hmA(m.at + 60e3)) : 'delivered') : null,
          ];
        }),
        t.typing ? h('div', { class: 'ph-msg-row them' }, h('div', { class: 'ph-bubble them tail ph-typing' }, h('i'), h('i'), h('i'))) : null);
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }
    function tapback(m, bubble) {
      closeTapback();
      const bar = h('div', { class: 'ph-tapback ' + m.from },
        REACTS.map(r => h('button', { type: 'button', class: m.react === r ? 'on' : '', disabled: !mine, onclick: e => { e.stopPropagation(); m.react = m.react === r ? null : r; save(); closeTapback(); drawMsgs(); } }, r)),
        mine ? h('button', { type: 'button', class: 'ph-tb-del', title: 'delete', onclick: e => { e.stopPropagation(); t.msgs = t.msgs.filter(x => x !== m); dropImage(m.imageId); save(); closeTapback(); drawMsgs(); } }, '🗑') : null);
      bubble.closest('.ph-msg-row').prepend(bar);
      bubble.classList.add('lifted');
      setTimeout(() => document.addEventListener('click', closeTapback, { once: true }), 0);
    }
    const closeTapback = () => { list.querySelectorAll('.ph-tapback').forEach(b => b.remove()); list.querySelectorAll('.lifted').forEach(b => b.classList.remove('lifted')); };
    function info() {
      const readBox = h('input', { type: 'checkbox', checked: t.read, onchange: e => { t.read = e.target.checked; save(); drawMsgs(); } });
      const typingBox = h('input', { type: 'checkbox', checked: !!t.typing, onchange: e => { t.typing = e.target.checked; save(); drawMsgs(); } });
      openModal({
        title: w.name,
        body: h('div', { class: 'ph-info' },
          h('label', { class: 'check' }, readBox, 'read receipts'),
          h('label', { class: 'check' }, typingBox, `${w.name} is typing`),
          w.char ? h('a', { class: 'btn ghost sm', href: ctx.ocLink(w.char) }, 'their page') : null),
        actions: [
          { label: 'delete chat', kind: 'danger', onClick: async close => { if (await confirmDialog(`delete the chat with ${w.name}?`, { danger: true, okLabel: 'delete' })) { close(); d.threads = d.threads.filter(x => x !== t); t.msgs.forEach(m => dropImage(m.imageId)); save(); show('messages', {}, 'pop'); } } },
          { label: 'done', kind: 'primary', onClick: close => close() },
        ],
      });
    }
    drawAs();
    drawMsgs();
    return h('div', { class: 'ph-app-screen ph-thread' },
      h('div', { class: 'ph-head ph-chat-head' },
        h('div', { class: 'ph-head-row' },
          h('button', { type: 'button', class: 'ph-back-btn', onclick: () => show('messages', {}, 'pop') }, '‹'),
          h('div', { class: 'ph-chat-who' }, face(t.who, 'sm'), h('span', {}, w.name, ' ›')),
          h('div', { class: 'ph-head-right' }, mine ? h('button', { type: 'button', class: 'ph-ibtn', title: 'details', onclick: info }, 'i') : null))),
      list,
      mine ? h('div', { class: 'ph-composer' },
        h('button', { type: 'button', class: 'ph-cam-btn', title: 'send a picture', onclick: sendPic }, '📷'),
        asBtn,
        h('div', { class: 'ph-input-wrap' }, input,
          h('button', { type: 'button', class: 'ph-send', title: 'send', onclick: () => send() }, '↑'))) : null);
  };

  // photos
  let photoTab = 'all';
  const photoList = () => photoTab === 'gallery'
    ? char.gallery.filter(g => g.imageId).map(g => ({ id: g.id, imageId: g.imageId, at: g.createdAt || char.createdAt, gallery: true }))
    : photoTab === 'faves' ? d.photos.filter(p => p.fave) : d.photos;
  async function addToRoll() {
    const got = await addPhotos(true, 1400);
    if (!got.length) return false;
    for (const p of got) d.photos.push({ id: 'p_' + uid(), imageId: p.imageId, at: Date.now(), fave: false });
    save();
    return true;
  }
  SCREENS.photos = () => {
    const list = photoList();
    return h('div', { class: 'ph-app-screen ph-photos' },
      header('photos', { big: true, back: { label: 'home', go: () => goHome() }, right: plusBtn(async () => { if (await addToRoll()) { photoTab = 'all'; redraw(); } }, 'add photos') }),
      h('div', { class: 'ph-seg' }, [['all', 'recents'], ['faves', 'favorites'], ['gallery', 'gallery']].map(([v, l]) =>
        h('button', { type: 'button', class: photoTab === v ? 'on' : '', onclick: () => { photoTab = v; redraw(); } }, l))),
      h('div', { class: 'ph-scroll' },
        list.length ? h('div', { class: 'ph-roll' }, [...list].reverse().map(p =>
          h('button', { type: 'button', class: 'ph-thumb', onclick: () => show('viewer', { id: p.id, tab: photoTab }) }, pic(p.imageId), p.fave ? h('i', { class: 'ph-fave' }, '♥') : null)))
          : h('div', { class: 'ph-empty' }, sticker('1f338', 'ph-empty-stk'), mine && photoTab !== 'gallery' ? h('button', { type: 'button', class: 'ph-pill', onclick: async () => { if (await addToRoll()) { photoTab = 'all'; redraw(); } } }, 'add photos') : null),
        list.length ? h('div', { class: 'ph-roll-count' }, `${list.length} ${list.length === 1 ? 'photo' : 'photos'}`) : null));
  };
  SCREENS.viewer = ({ id, tab }) => {
    photoTab = tab;
    const list = [...photoList()].reverse();
    let i = Math.max(0, list.findIndex(p => p.id === id));
    const p = list[i];
    if (!p) return SCREENS.photos();
    const go = step => { const n = list[i + step]; if (n) show('viewer', { id: n.id, tab }, step > 0 ? 'push' : 'pop'); };
    let x0 = null;
    const setWall = which => { d[which].imageId = p.imageId; save(); toast(which === 'lock' ? 'lock screen set' : 'home screen set'); };
    return h('div', { class: 'ph-viewer' },
      h('div', { class: 'ph-viewer-top' },
        h('button', { type: 'button', class: 'ph-back-btn', onclick: () => show('photos', {}, 'pop') }, '‹'),
        h('div', {}, h('b', {}, dayLabel(p.at)), h('span', {}, hmA(p.at))),
        h('span', { class: 'ph-viewer-n' }, `${i + 1}/${list.length}`)),
      h('div', {
        class: 'ph-viewer-pic',
        onpointerdown: e => { x0 = e.clientX; },
        onpointerup: e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) go(e.clientX < x0 ? 1 : -1); x0 = null; },
      }, pic(p.imageId),
        i > 0 ? h('button', { type: 'button', class: 'ph-nav l', onclick: () => go(-1) }, '‹') : null,
        i < list.length - 1 ? h('button', { type: 'button', class: 'ph-nav r', onclick: () => go(1) }, '›') : null),
      mine ? h('div', { class: 'ph-viewer-bar' },
        p.gallery ? null : h('button', { type: 'button', class: 'ph-vb' + (p.fave ? ' on' : ''), title: 'favorite', onclick: e => { p.fave = !p.fave; save(); e.currentTarget.classList.toggle('on', p.fave); e.currentTarget.textContent = p.fave ? '♥' : '♡'; } }, p.fave ? '♥' : '♡'),
        h('button', { type: 'button', class: 'ph-vb sm', onclick: () => setWall('lock') }, 'lock screen'),
        h('button', { type: 'button', class: 'ph-vb sm', onclick: () => setWall('home') }, 'home screen'),
        p.gallery ? null : h('button', {
          type: 'button', class: 'ph-vb', title: 'delete', onclick: async () => {
            if (!(await confirmDialog('delete this photo?', { danger: true, okLabel: 'delete' }))) return;
            d.photos = d.photos.filter(x => x.id !== p.id);
            if (d.lock.imageId !== p.imageId && d.home.imageId !== p.imageId) dropImage(p.imageId);
            save();
            show('photos', {}, 'pop');
          },
        }, '🗑')) : null);
  };

  // camera: "take" a picture (pick one), flash, it lands in the roll
  SCREENS.camera = () => {
    const last = d.photos.at(-1);
    const flash = h('div', { class: 'ph-flash' });
    let mode = 'photo';
    const modes = h('div', { class: 'ph-cam-modes' });
    const drawModes = () => fill(modes, ['video', 'photo', 'portrait'].map(m => h('button', { type: 'button', class: m === mode ? 'on' : '', onclick: () => { mode = m; drawModes(); vf.dataset.mode = m; } }, m)));
    drawModes();
    const vf = h('div', { class: 'ph-viewfinder', 'data-mode': mode },
      last ? pic(last.imageId, 'ph-vf-img') : portrait(char, 'ph-vf-pfp'),
      h('div', { class: 'ph-vf-grid' }, h('i'), h('i'), h('i'), h('i')),
      h('div', { class: 'ph-vf-focus' }));
    return h('div', { class: 'ph-camera' },
      h('div', { class: 'ph-cam-top' }, h('span', {}, '⚡'), h('span', { class: 'ph-cam-dot' }), h('span', {}, '◎')),
      vf, flash, modes,
      h('div', { class: 'ph-cam-bottom' },
        h('button', { type: 'button', class: 'ph-cam-last', onclick: () => show('photos', {}, 'push') }, last ? pic(last.imageId) : null),
        h('button', {
          type: 'button', class: 'ph-shutter', title: 'take a picture', disabled: !mine, onclick: async () => {
            flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
            if (await addToRoll()) { photoTab = 'all'; redraw(); }
          },
        }),
        h('button', { type: 'button', class: 'ph-cam-flip', title: 'flip', onclick: () => vf.classList.toggle('flipped') }, '⟲')));
  };

  // music: their playlist (real songs play in the page's player) + songs typed in here
  function allSongs() {
    return [...char.playlist.map((s, i) => ({ id: s.id, title: s.title || 'untitled', artist: nameOf(char), real: true, index: i })), ...d.songs.map(s => ({ ...s, real: false }))];
  }
  const playerState = () => {
    const bar = document.querySelector('.player');
    if (!bar || bar.hidden) return null;
    return { title: bar.querySelector('.player-title')?.textContent || '', playing: bar.querySelector('.player-btn.big')?.title === 'pause', seek: Number(bar.querySelector('.player-seek')?.value || 0) / 1000 };
  };
  let fakePlaying = false;
  SCREENS.music = (p, view) => {
    const songs = allSongs();
    const art = h('div', { class: 'ph-vinyl' }, h('div', { class: 'ph-vinyl-label' }, portrait(char, 'ph-disc-pfp')));
    const nowTitle = h('b'), nowArtist = h('span');
    const prog = h('i');
    const playBtn = h('button', { type: 'button', class: 'ph-mbtn big', title: 'play' });
    const current = () => {
      const st = playerState();
      const real = st && songs.find(s => s.real && s.title === st.title);
      if (real && (st.playing || !d.nowPlaying)) return { song: real, playing: st.playing, seek: st.seek };
      const picked = songs.find(s => s.id === d.nowPlaying) || songs[0];
      if (picked?.real && st) return { song: picked, playing: st.playing && st.title === picked.title, seek: st.title === picked.title ? st.seek : 0 };
      return { song: picked, playing: picked && !picked.real && fakePlaying, seek: null };
    };
    let fakeAt = 0;
    const tick = () => {
      const c = current();
      nowTitle.textContent = c.song?.title || '—';
      nowArtist.textContent = c.song ? (c.song.artist || nameOf(char)) : '';
      art.classList.toggle('spin', !!c.playing);
      playBtn.textContent = c.playing ? '❚❚' : '▶';
      if (c.seek != null) prog.style.width = (c.seek * 100) + '%';
      else { if (c.playing) fakeAt = (fakeAt + 0.004) % 1; prog.style.width = (fakeAt * 100) + '%'; }
      listEl.querySelectorAll('.ph-song').forEach(r => r.classList.toggle('on', r.dataset.id === c.song?.id));
      listEl.querySelectorAll('.ph-song').forEach(r => r.classList.toggle('playing', r.dataset.id === c.song?.id && !!c.playing));
    };
    const playSong = sng => {
      d.nowPlaying = sng.id;
      if (mine) save();
      if (sng.real) {
        fakePlaying = false;
        document.querySelectorAll('.player .player-song')[sng.index]?.click();
      } else {
        const st = playerState();
        if (st?.playing) document.querySelector('.player .player-btn.big')?.click();
        fakePlaying = true;
      }
      tick();
    };
    playBtn.onclick = () => {
      const c = current();
      if (!c.song) return;
      if (c.song.real) {
        const st = playerState();
        if (st && st.title === c.song.title) document.querySelector('.player .player-btn.big')?.click();
        else playSong(c.song);
      } else fakePlaying = !fakePlaying;
      tick();
    };
    const step = k => {
      const c = current();
      if (!songs.length) return;
      const i = songs.findIndex(s => s.id === c.song?.id);
      playSong(songs[(i + k + songs.length) % songs.length]);
    };
    async function addSong() {
      const t = h('input', { type: 'text', placeholder: 'song', maxLength: 80, 'data-autofocus': '' });
      const a = h('input', { type: 'text', placeholder: 'artist', maxLength: 80 });
      openModal({
        title: 'add a song', body: h('div', { class: 'ph-form' }, t, a),
        actions: [{ label: 'add', kind: 'primary', onClick: close => { if (!t.value.trim()) return t.focus(); d.songs.push({ id: 's_' + uid(), title: t.value.trim(), artist: a.value.trim() }); save(); close(); redraw(); } }],
      });
    }
    const listEl = h('div', { class: 'ph-songs' }, songs.map((sng, i) => h('div', { class: 'ph-song', 'data-id': sng.id, onclick: () => playSong(sng) },
      h('span', { class: 'ph-song-n' }, h('em', {}, i + 1), h('span', { class: 'ph-eq' }, h('i'), h('i'), h('i'))),
      h('div', { class: 'ph-song-main' }, h('b', {}, sng.title), h('span', {}, sng.artist || nameOf(char))),
      sng.real ? h('span', { class: 'ph-song-tag' }, '♫') : mine ? h('button', { type: 'button', class: 'ph-song-x', title: 'remove', onclick: e => { e.stopPropagation(); d.songs = d.songs.filter(x => x.id !== sng.id); save(); redraw(); } }, '✕') : null)));
    const iv = setInterval(() => { if (view.isConnected) tick(); }, 400);
    cleanupScreen = () => clearInterval(iv);
    requestAnimationFrame(tick);
    return h('div', { class: 'ph-app-screen ph-music' },
      header('music', { back: { label: 'home', go: () => goHome() }, right: plusBtn(addSong, 'add a song') }),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'ph-now' },
          art,
          h('div', { class: 'ph-now-text' }, nowTitle, nowArtist),
          h('div', { class: 'ph-prog' }, prog),
          h('div', { class: 'ph-mctl' },
            h('button', { type: 'button', class: 'ph-mbtn', title: 'back', onclick: () => step(-1) }, '⏮'),
            playBtn,
            h('button', { type: 'button', class: 'ph-mbtn', title: 'skip', onclick: () => step(1) }, '⏭'))),
        h('div', { class: 'ph-list-head' }, h('b', {}, `${nameOf(char)}'s playlist`), h('span', {}, `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}`)),
        songs.length ? listEl : h('div', { class: 'ph-empty sm' }, sticker('1f3a7', 'ph-empty-stk'), mine ? h('button', { type: 'button', class: 'ph-pill', onclick: addSong }, 'add a song') : null)));
  };

  // notes
  const noteTitle = n => (n.text.split('\n').find(l => l.trim()) || 'new note').slice(0, 40);
  SCREENS.notes = () => {
    const list = [...d.notes].sort((a, b) => b.at - a.at);
    const newNote = () => { const n = { id: 'n_' + uid(), text: '', at: Date.now() }; d.notes.push(n); save(); show('note', { id: n.id }); };
    return h('div', { class: 'ph-app-screen ph-notes' },
      header('notes', { big: true, back: { label: 'home', go: () => goHome() }, right: plusBtn(newNote, 'new note') }),
      h('div', { class: 'ph-scroll' },
        list.length ? h('div', { class: 'ph-group' }, list.map(n => h('button', { type: 'button', class: 'ph-row ph-note-row', onclick: () => show('note', { id: n.id }) },
          h('div', { class: 'ph-row-main' }, h('b', {}, noteTitle(n)),
            h('div', { class: 'ph-row-sub' }, h('em', {}, shortDate(n.at)), ' ', n.text.split('\n').filter(l => l.trim())[1] || ''))))) :
          h('div', { class: 'ph-empty' }, sticker('1f4dd', 'ph-empty-stk'), mine ? h('button', { type: 'button', class: 'ph-pill', onclick: newNote }, 'new note') : null),
        list.length ? h('div', { class: 'ph-roll-count' }, `${list.length} ${list.length === 1 ? 'note' : 'notes'}`) : null));
  };
  SCREENS.note = ({ id }) => {
    const n = d.notes.find(x => x.id === id);
    if (!n) return SCREENS.notes();
    const leave = () => { if (!n.text.trim()) { d.notes = d.notes.filter(x => x !== n); save(); } show('notes', {}, 'pop'); };
    const ta = h('textarea', { class: 'ph-note-text', value: n.text, readOnly: !mine, placeholder: mine ? 'new note' : '', oninput: e => { n.text = e.target.value; n.at = Date.now(); save(); } });
    if (mine && !n.text) setTimeout(() => ta.focus(), 450);
    return h('div', { class: 'ph-app-screen ph-note' },
      header('', { back: { label: 'notes', go: leave }, right: mine ? h('button', { type: 'button', class: 'ph-ibtn plain', title: 'delete', onclick: async () => { if (n.text.trim() && !(await confirmDialog('delete this note?', { danger: true, okLabel: 'delete' }))) return; d.notes = d.notes.filter(x => x !== n); save(); show('notes', {}, 'pop'); } }, '🗑') : null }),
      h('div', { class: 'ph-note-date' }, new Date(n.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase(), ' at ', hmA(n.at)),
      ta);
  };

  // contacts: every other oc + anyone they've texted
  SCREENS.contacts = () => {
    const people = [
      ...allOcs(char.id).map(o => ({ ref: { id: o.id, name: nameOf(o) }, rel: relLabel(char, o.id) })),
      ...d.threads.filter(t => !t.who.id || !ocById(t.who.id)).map(t => ({ ref: t.who, rel: '' })),
    ].sort((a, b) => (b.rel ? 1 : 0) - (a.rel ? 1 : 0) || who(a.ref).name.localeCompare(who(b.ref).name));
    const textThem = ref => {
      let t = d.threads.find(x => (ref.id && x.who.id === ref.id) || (!ref.id && x.who === ref));
      if (!t && !mine) return;
      if (!t) { t = { id: 't_' + uid(), who: ref, msgs: [], read: true, typing: false, at: Date.now() }; d.threads.push(t); save(); }
      show('thread', { id: t.id }, 'zoom');
    };
    return h('div', { class: 'ph-app-screen ph-contacts' },
      header('contacts', { big: true, back: { label: 'home', go: () => goHome() } }),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'ph-me-card' }, portrait(char, 'lg'), h('div', {}, h('b', {}, nameOf(char)), h('span', {}, 'my card'))),
        people.length ? h('div', { class: 'ph-group' }, people.map(p => h('button', { type: 'button', class: 'ph-row', onclick: () => textThem(p.ref) },
          face(p.ref, 'sm'),
          h('div', { class: 'ph-row-main' }, h('b', {}, who(p.ref).name), p.rel ? h('div', { class: 'ph-row-sub' }, p.rel) : null),
          h('span', { class: 'ph-contact-btn' }, '💬')))) : null));
  };

  // settings
  SCREENS.settings = () => {
    const wallRow = (which, label) => h('div', { class: 'ph-set-wall' },
      h('div', { class: 'ph-set-wall-pic' + (which === 'lock' ? ' lock' : '') }, d[which].imageId ? pic(d[which].imageId) : h('div', { class: 'ph-wall ' + (which === 'lock' ? 'ph-wall-lock' : 'ph-wall-home') }), which === 'lock' ? h('b', {}, hm()) : null),
      h('span', {}, label),
      h('div', { class: 'ph-set-btns' },
        h('button', { type: 'button', class: 'ph-pill sm', onclick: async () => { const [p] = await addPhotos(false, 1200); if (!p) return; const old = d[which].imageId; d[which].imageId = p.imageId; if (old && !d.photos.some(x => x.imageId === old) && d.lock.imageId !== old && d.home.imageId !== old) dropImage(old); save(); redraw(); } }, 'change'),
        d[which].imageId ? h('button', { type: 'button', class: 'ph-pill sm ghost', onclick: () => { const old = d[which].imageId; d[which].imageId = null; if (!d.photos.some(x => x.imageId === old) && d.lock.imageId !== old && d.home.imageId !== old) dropImage(old); save(); redraw(); } }, 'reset') : null));
    const toggle = (on, onChange) => h('button', { type: 'button', class: 'ph-switch' + (on ? ' on' : ''), onclick: e => { on = !on; e.currentTarget.classList.toggle('on', on); onChange(on); } }, h('i'));
    return h('div', { class: 'ph-app-screen ph-settings' },
      header('settings', { big: true, back: { label: 'home', go: () => goHome() } }),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'ph-group ph-me-card' }, portrait(char, 'md'), h('div', {}, h('b', {}, nameOf(char)), h('span', {}, d.carrier))),
        h('div', { class: 'ph-set-label' }, 'wallpaper'),
        h('div', { class: 'ph-group ph-walls' }, wallRow('lock', 'lock screen'), wallRow('home', 'home screen')),
        h('div', { class: 'ph-set-label' }, 'clock'),
        h('div', { class: 'ph-group ph-pad' }, h('div', { class: 'ph-clock-picks' }, CLOCKS.map(([v, l]) =>
          h('button', { type: 'button', class: 'ph-clock-pick' + (d.clockFont === v ? ' on' : ''), 'data-clock': v, onclick: () => { d.clockFont = v; screen.dataset.clock = v; save(); redraw(); } }, h('b', {}, hm()), h('span', {}, l))))),
        h('div', { class: 'ph-set-label' }, 'look'),
        h('div', { class: 'ph-group' },
          h('div', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#3a3a46' } }, '🌙'), h('div', { class: 'ph-row-main' }, h('b', {}, 'dark mode')), toggle(d.dark, v => { d.dark = v; save(); screen.classList.toggle('dark', v); })),
          h('div', { class: 'ph-row static col' }, h('div', { class: 'ph-set-line' }, h('span', { class: 'ph-set-ico', style: { background: 'var(--me)' } }, '💬'), h('b', {}, 'bubble color')),
            swatches(d.bubble || char.color, c => { d.bubble = c; save(); screen.style.setProperty('--me', c); screen.style.setProperty('--me-ink', inkOn(c)); }))),
        h('div', { class: 'ph-set-label' }, 'phone'),
        h('div', { class: 'ph-group' },
          h('label', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#34c759' } }, '📶'), h('b', {}, 'carrier'),
            h('input', { type: 'text', class: 'ph-set-input', value: d.carrier, maxLength: 24, oninput: e => { d.carrier = e.target.value; save(); } })),
          h('label', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#ffcc00' } }, '🔋'), h('b', {}, 'battery'),
            h('input', { type: 'range', class: 'ph-range', min: 1, max: 100, value: d.battery, oninput: e => { d.battery = Number(e.target.value); save(); drawStatus(); e.target.nextSibling.textContent = d.battery + '%'; } }), h('em', { class: 'ph-batt-pct' }, d.battery + '%'))),
        h('button', { type: 'button', class: 'ph-pill wide', onclick: () => show('lock', {}, 'lockdown') }, 'lock phone')));
  };

  // ---- the case box ----
  function caseBox() {
    const preview = h('div', { class: 'ph-case-prev' });
    const drawPrev = () => { fill(preview, h('div', { class: 'ph-mini', 'data-case': d.case.style, style: { '--case': d.case.color } }, h('div', { class: 'ph-cam' }, h('i'), h('i'), h('i'), h('b')))); };
    const styles = h('div', { class: 'ph-case-styles' });
    const drawStyles = () => fill(styles, CASES.map(([v, l]) => h('button', { type: 'button', class: 'ph-case-style' + (d.case.style === v ? ' on' : ''), onclick: () => { d.case.style = v; save(); paintCase(); drawStyles(); drawPrev(); } },
      h('i', { class: 'ph-mini', 'data-case': v, style: { '--case': d.case.color } }), h('span', {}, l))));
    const charms = h('div', { class: 'ph-pick-grid' });
    const drawCharms = () => fill(charms,
      h('button', { type: 'button', class: 'ph-pick' + (!d.case.charm ? ' on' : ''), onclick: () => { d.case.charm = null; save(); paintCase(); drawCharms(); } }, '✕'),
      CHARMS.map(c => h('button', { type: 'button', class: 'ph-pick' + (d.case.charm === c ? ' on' : ''), onclick: () => { d.case.charm = c; save(); paintCase(); drawCharms(); } }, sticker(c))));
    drawStyles(); drawCharms(); drawPrev();
    openModal({
      title: 'phone case', wide: true,
      body: h('div', { class: 'ph-case-box' },
        h('div', { class: 'ph-case-side' }, preview),
        h('div', { class: 'ph-case-main' },
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'style'), styles),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'color'), swatches(d.case.color, c => { d.case.color = c; save(); paintCase(); drawStyles(); drawPrev(); }, CASE_COLORS)),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'charm'), charms),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'stickers on the back'),
            h('div', { class: 'ph-pick-grid' }, CASE_STICKERS.map(c => h('button', {
              type: 'button', class: 'ph-pick', onclick: () => {
                d.case.stickers.push({ id: uid(), code: c, x: 22 + Math.random() * 56, y: 34 + Math.random() * 54, r: Math.round(Math.random() * 40 - 20), k: 0.8 + Math.random() * 0.5 });
                save(); drawBack();
                if (!device.classList.contains('flipped')) flip();
              },
            }, sticker(c))))))),
      actions: [
        d.case.stickers.length ? { label: 'peel off stickers', kind: 'ghost', onClick: () => { d.case.stickers = []; save(); drawBack(); } } : null,
        { label: 'done', kind: 'primary', onClick: close => close() },
      ].filter(Boolean),
    });
  }
  const flipBtn = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => flip() }, 'flip');
  function flip() {
    device.classList.toggle('flipped');
    stage.classList.toggle('show-back', device.classList.contains('flipped'));
  }

  paintCase();
  drawStatus();
  show('lock', {}, null);

  el.append(
    appBar(ctx, meta, flipBtn, mine ? h('button', { type: 'button', class: 'btn sm', onclick: caseBox }, 'case') : null),
    stage);

  return () => { timers.forEach(clearInterval); cleanupScreen?.(); };
}

// drag something around inside `area`; positions are in % of the area
function dragOn(item, area, onMove, onDone) {
  item.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    item.setPointerCapture(e.pointerId);
    item.classList.add('dragging');
    const r = area.getBoundingClientRect();
    const move = ev => {
      const x = ((ev.clientX - r.left) / r.width) * 100;
      const y = ((ev.clientY - r.top) / r.height) * 100;
      onMove(Math.max(4, Math.min(96, x)), Math.max(3, Math.min(97, y)));
    };
    const up = () => { item.classList.remove('dragging'); item.removeEventListener('pointermove', move); item.removeEventListener('pointerup', up); item.removeEventListener('pointercancel', up); onDone(); };
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerup', up);
    item.addEventListener('pointercancel', up);
  });
}
