// phone: the oc's phone. a case you can dress up (flip it to see the back), a lock screen,
// a home screen + messages, photos, music, notes, camera, contacts, settings.
//
// more apps plug in from phone-calls.js, phone-life.js, phone-web.js. each one exports
//   APPS     { id: { label, icon, bg } }   (icon = sticker code; link: '<more-tab app id>' jumps to that app instead)
//   DEF      defaults for its saved stuff (top-level keys on the phone's data)
//   install(api)        adds its screens: api.SCREENS.<id> = (params, view) => element
//   lockNotifs?(api)    [{ app, title, text, at, open() }] for the lock screen
//   widget?(api)        a widget for the second home page (or null)
// api = { d, char, mine, ctx, save, show, redraw, goHome, openApp, header, plusBtn, screen, SCREENS, onLeave(fn), drawStatus, APPS, appOf, FIXED }
// apps can be taken off the home screen (d.hidden) and made from scratch in the app store (d.custom, see phone-store.js)

import { h, s, fill, uid, openModal, confirmDialog, swatches, segmented, toast, pickFiles, shrinkImage } from '../ui.js';
import { cropAll } from '../crop.js';
import { store } from '../store.js';
import { dataFor, pic, sticker, appBar, portrait, nameOf, allOcs, ocById } from './kit.js';
import { who, face, freshRef, pickWho, hm, hmA, stamp, dayLabel, shortDate, addPhotos, dropImage, relLabel, inkOn, mirrorSend, mirrorReact, mirrorDelete, refOf, addVideo, vid,
  mirrorGroupSend, mirrorGroupReact, mirrorGroupDelete, mirrorGroupInfo, catchUp } from './phone-bits.js';
import * as callsApps from './phone-calls.js';
import * as lifeApps from './phone-life.js';
import * as webApps from './phone-web.js';
import * as socialApps from './phone-social.js';
import * as brandApps from './phone-brands.js';
import * as storeApps from './phone-store.js';
import { ACCT, setApp, gateScreens, switcher, settingsGroup } from './phone-accounts.js';

const EXTRA = [callsApps, lifeApps, webApps, socialApps, storeApps, brandApps];

export const meta = { id: 'phone', label: 'phone', icon: '1f4f1' };

const DEF = {
  case: { style: 'glossy', color: '#ff4fa3', charm: '1f987', stickers: [] },
  lock: { imageId: null },
  home: { imageId: null },
  clockFont: 'clean', dark: false, bubble: null, carrier: 'oc mobile', battery: 78,
  passcode: '', faceId: false, later: [], // later = texts that arrive in a bit: { id, threadId, text, due }
  threads: [], photos: [], notes: [], songs: [], nowPlaying: null,
  ...Object.assign({}, ...EXTRA.map(m => m.DEF || {})),
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
  ...Object.assign({}, ...EXTRA.map(m => m.APPS || {})),
};
// where every app sits. anything not listed lands at the end of the last page
const PAGE1 = ['camera', 'notes', 'contacts', 'settings', 'clock', 'calendar', 'weather', 'reminders', 'store'];
const PAGE2 = ['browser', 'maps', 'memos', 'wallet', 'calculator', 'screentime', 'games', 'socials', 'diaries'];
const DOCK = ['phone', 'messages', 'photos', 'music'];
const FIXED = ['settings', 'store']; // can't be taken off the home screen
// a new phone only has these. everything else gets downloaded in the app store (d.installed)
const STOCK = ['phone', 'messages', 'photos', 'camera', 'music', 'notes', 'contacts', 'settings', 'clock', 'calendar', 'weather', 'reminders', 'calculator', 'browser', 'maps', 'memos', 'wallet', 'screentime', 'store'];
// where an app keeps its saved stuff, when that isn't just its id
const APP_KEYS = { threads: 'threadsapp', duolingo: 'duo', doordash: 'dash', chatgpt: 'gpt', minecraft: 'mc', candycrush: 'candy', starbucks: 'sbux', stardew: 'sdv', games: 'arcade' };

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
const faceIdIco = () => s('svg', { viewBox: '0 0 24 24', class: 'ph-faceid-ico', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' },
  s('path', { d: 'M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3' }),
  s('path', { d: 'M8.5 9v1.5M15.5 9v1.5M12 9v4h-1M9 16a4.5 4.5 0 0 0 6 0' }));
const lockIco = open => s('svg', { viewBox: '0 0 20 26', class: 'ph-lock-ico' + (open ? ' open' : '') },
  s('path', { class: 'ph-shackle', d: 'M5 11V7a5 5 0 0 1 10 0v4', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
  s('rect', { x: 1.5, y: 11, width: 17, height: 13, rx: 3.5 }));

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = dataFor(char, 'phone', DEF);
  d.case = { ...DEF.case, ...d.case };
  d.accounts ||= {};
  // apps used before accounts existed get an account made for them instead of a sign up wall
  const usedBefore = Object.fromEntries(Object.entries(ACCT).map(([id, a]) => [id, id === 'insta'
    ? !!(char.fun?.social?.handle || char.fun?.social?.posts?.length) || JSON.stringify(d.insta) !== JSON.stringify(DEF.insta)
    : d[a.key] !== undefined && JSON.stringify(d[a.key]) !== JSON.stringify(DEF[a.key])]));
  d.lock = { imageId: null, ...d.lock };
  d.home = { imageId: null, ...d.home };
  for (const t of d.threads) { t.msgs ||= []; t.read ??= true; }
  d.cleared ||= {};
  d.hidden = (d.hidden || []).filter(id => !FIXED.includes(id));
  d.custom ||= [];
  // phones from before downloading: stock apps + anything already used, minus what was taken off
  if (!Array.isArray(d.installed)) {
    const social = !!(char.fun?.social?.handle || char.fun?.social?.posts?.length);
    const usedApp = id => (id === 'insta' || id === 'socials') && social
      || [APP_KEYS[id] || id].some(k => k in DEF && d[k] !== undefined && JSON.stringify(d[k]) !== JSON.stringify(DEF[k]));
    d.installed = Object.keys(APPS).filter(id => window.__allApps || STOCK.includes(id) || usedApp(id)).filter(id => !d.hidden.includes(id));
    d.hidden = [];
  }
  for (const id of FIXED) if (!d.installed.includes(id)) d.installed.push(id);
  const justGot = new Set(); // downloaded a second ago: the icon fills in on the home screen
  const save = () => ctx.save();
  const myRef = { id: char.id, name: nameOf(char) };
  const timers = [];

  // ---- the device ----
  const views = h('div', { class: 'ph-views' });
  const statusTime = h('span', { class: 'ph-status-time' });
  const statusRight = h('span', { class: 'ph-status-right' });
  const screen = h('div', { class: 'ph-screen' },
    h('div', { class: 'ph-status' }, statusTime, h('div', { class: 'ph-island' }, h('i')), statusRight),
    h('button', { type: 'button', class: 'ph-nc-pull', title: 'notifications', onclick: () => openCenter(), onpointerdown: pullCenter }),
    views,
    h('button', { type: 'button', class: 'ph-homebar', title: 'home', onclick: () => goHome() }));
  mouseScroll(screen);
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
    if (name !== 'home') jiggle = false;
    cleanupScreen?.();
    cleanupScreen = null;
    const old = [...views.children].filter(v => !v.classList.contains('leaving'));
    const view = h('div', { class: 'ph-view ph-v-' + name });
    cur = { name, params, view };
    setApp(name);
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
    if (cur?.name === 'home' && jiggle) { jiggle = false; redraw(); return; }
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

  // every notification, newest first (lock screen + notification center). perThread = how many texts per chat
  function allNotifs(perThread = 1) {
    return [
      ...d.threads.flatMap(t => t.msgs.filter(m => m.from === 'them').slice(-perThread).map(m => ({
        app: 'messages', title: threadName(t), text: msgPreview(t, m), at: m.at, faceOf: t.group ? m.by : t.who, open: () => show('thread', { id: t.id }, 'unlock'),
      }))),
      ...EXTRA.flatMap(m => { try { return m.lockNotifs?.(api) || []; } catch (err) { console.error(err); return []; } }),
    ].filter(n => APPS[n.app]).sort((a, b) => b.at - a.at);
  }
  // getting past the lock screen: passcode (always for someone else's oc), face id, or straight in
  function unlockThen(then = () => show('home', {}, 'unlock')) {
    if (d.passcode && (!mine || !d.faceId)) { show('passcode', { then }, 'fade'); return; }
    if (d.passcode && d.faceId) { faceScan(then); return; }
    then();
  }
  function faceScan(then) {
    const scan = h('div', { class: 'ph-faceid' }, faceIdIco(), h('span', {}, 'face id'));
    screen.append(scan);
    setTimeout(() => scan.classList.add('ok'), 900);
    setTimeout(() => { scan.remove(); then(); }, 1400);
  }

  // lock screen
  SCREENS.lock = () => {
    const now = new Date();
    const notes = allNotifs().slice(0, 3);
    let y0 = null, going = false;
    const unlock = (then) => { if (going) return; going = true; lockEl.classList.add('opening'); setTimeout(() => { going = false; lockEl.classList.remove('opening'); unlockThen(then); }, 160); };
    const lockEl = h('div', {
      class: 'ph-lock',
      onpointerdown: e => { y0 = e.clientY; },
      onpointerup: e => { if (y0 != null && y0 - e.clientY > 40) unlock(); y0 = null; },
      onclick: e => { if (!e.target.closest('button')) unlock(); },
      'data-locked': d.passcode ? '' : null,
    },
      wall(d.lock.imageId, 'ph-wall-lock'),
      h('span', { class: 'ph-carrier' }, d.carrier),
      h('div', { class: 'ph-lock-top' }, lockIco(!d.passcode)),
      h('div', { class: 'ph-lock-date' }, now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase()),
      h('div', { class: 'ph-lock-clock', 'data-clock-live': '' }, hm()),
      h('div', { class: 'ph-notifs' }, notes.map((n, i) => h('button', {
        type: 'button', class: 'ph-notif', 'data-app': n.app, style: { animationDelay: (0.15 + i * 0.12) + 's' },
        onclick: () => unlock(n.open),
      },
        h('div', { class: 'ph-notif-ico', style: { background: APPS[n.app].bg } }, sticker(APPS[n.app].icon)),
        h('div', { class: 'ph-notif-body' },
          h('div', { class: 'ph-notif-top' }, h('b', {}, n.title), h('span', {}, dayLabel(n.at) === 'today' ? hm(n.at) : dayLabel(n.at))),
          h('div', { class: 'ph-notif-text' }, n.text)),
        n.faceOf ? face(n.faceOf, 'xs ph-notif-face') : null))),
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
  // apps you made in the app store look + open like the built in ones
  const appOf = id => {
    if (APPS[id]) return APPS[id];
    const c = d.custom.find(x => x.id === id);
    return c ? { label: c.label || 'app', icon: c.icon, bg: c.bg, custom: true } : null;
  };
  let jiggle = false; // holding an icon wiggles them all + shows the − buttons
  async function removeApp(id) {
    const c = d.custom.find(x => x.id === id);
    if (c) {
      if (!(await confirmDialog(`delete ${c.label || 'this app'}?`, { danger: true, okLabel: 'delete' }))) return;
      d.custom = d.custom.filter(x => x !== c);
      dropImage(c.imageId);
    } else d.installed = d.installed.filter(x => x !== id);
    save();
    redraw();
  }
  const icon = (id, extra) => {
    const a = appOf(id);
    if (!a) return null;
    const removable = mine && !FIXED.includes(id);
    let held = null, x0 = 0, y0 = 0;
    const startJiggle = () => { held = null; if (jiggle) return; jiggle = true; redraw(); };
    const dl = justGot.has(id);
    if (dl) setTimeout(() => justGot.delete(id), 50);
    const b = h('button', {
      type: 'button', class: 'ph-app' + (dl ? ' dl' : ''), 'data-app': id,
      onclick: e => {
        if (jiggle) return;
        const ico = e.currentTarget.querySelector('.ph-app-ico');
        if (a.link) location.hash = `#/${ctx.base}/fun/${a.link}`;
        else if (a.custom) openApp('custom', ico, { id });
        else openApp(id, ico);
      },
      onpointerdown: e => { if (!mine || e.button > 0) return; x0 = e.clientX; y0 = e.clientY; clearTimeout(held); held = setTimeout(startJiggle, 520); },
      onpointermove: e => { if (held && Math.hypot(e.clientX - x0, e.clientY - y0) > 6) { clearTimeout(held); held = null; } },
      onpointerup: () => { clearTimeout(held); held = null; },
      onpointerleave: () => { clearTimeout(held); held = null; },
      oncontextmenu: e => { if (!mine) return; e.preventDefault(); startJiggle(); },
    },
      h('span', { class: 'ph-app-ico', style: { background: a.bg } }, sticker(a.icon), jiggle ? null : extra,
        jiggle && removable ? h('span', { class: 'ph-app-x', role: 'button', title: 'remove', onclick: e => { e.stopPropagation(); removeApp(id); } }, '−') : null),
      h('span', { class: 'ph-app-label' }, a.label));
    return b;
  };
  SCREENS.home = () => {
    const shown = id => (d.custom.some(c => c.id === id) || (d.installed.includes(id) && !d.hidden.includes(id))) && (mine || (id !== 'settings' && id !== 'store')) && !!appOf(id);
    const counts = Object.assign({ messages: unread() }, ...EXTRA.map(m => { try { return m.badges?.(api) || {}; } catch (err) { console.error(err); return {}; } }));
    const badge = id => (counts[id] ? h('span', { class: 'ph-badge' }, counts[id] > 99 ? '99+' : counts[id]) : null);
    const lastPhoto = d.photos.at(-1);
    const songs = allSongs();
    const playingTitle = songs[0]?.title;
    const page1 = h('div', { class: 'ph-page' },
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
      h('div', { class: 'ph-grid' }, PAGE1.filter(shown).map(id => icon(id, badge(id)))));
    const allWidgets = EXTRA.map(m => { try { return m.widget?.(api) || null; } catch (err) { console.error(err); return null; } }).filter(Boolean);
    const placed = new Set([...PAGE1, ...PAGE2, ...DOCK]);
    const rest = [...PAGE2, ...d.installed.filter(id => !placed.has(id)), ...d.custom.map(c => c.id)].filter(shown);
    const page2 = h('div', { class: 'ph-page' },
      allWidgets.length ? h('div', { class: 'ph-widgets' }, allWidgets.slice(0, 2)) : null,
      h('div', { class: 'ph-grid' }, rest.slice(0, 12).map(id => icon(id, badge(id)))));
    // apps that don't fit spill onto more pages, then widgets that don't fit get their own page
    const more = [];
    for (let i = 12; i < rest.length; i += 20) more.push(h('div', { class: 'ph-page' }, h('div', { class: 'ph-grid' }, rest.slice(i, i + 20).map(id => icon(id, badge(id))))));
    for (let i = 2; i < allWidgets.length; i += 4) more.push(h('div', { class: 'ph-page' }, h('div', { class: 'ph-widgets' }, allWidgets.slice(i, i + 4))));
    const nPages = 2 + more.length;
    homePage = Math.min(homePage, nPages - 1);
    const dots = h('div', { class: 'ph-dots' }, Array.from({ length: nPages }, (_, i) =>h('i', { class: i === homePage ? 'on' : '', onclick: () => pages.scrollTo({ left: i * pages.clientWidth, behavior: 'smooth' }) })));
    const pages = h('div', {
      class: 'ph-pages', onscroll: () => {
        homePage = Math.round(pages.scrollLeft / (pages.clientWidth || 1));
        dots.querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('on', i === homePage));
      },
    }, page1, page2, ...more);
    if (homePage) requestAnimationFrame(() => { pages.scrollLeft = homePage * pages.clientWidth; });
    return h('div', {
      class: 'ph-home' + (jiggle ? ' jiggle' : ''),
      onclick: e => { if (jiggle && !e.target.closest('.ph-app, .ph-dots, .ph-jiggle-done')) { jiggle = false; redraw(); } },
    },
      wall(d.home.imageId || d.lock.imageId, 'ph-wall-home'),
      jiggle ? h('button', { type: 'button', class: 'ph-jiggle-done', onclick: () => { jiggle = false; redraw(); } }, 'done') : null,
      pages, dots,
      h('div', { class: 'ph-dock' },
        DOCK.filter(shown).map(id => icon(id, badge(id)))));
  };
  let homePage = 0;

  // messages
  // a thread is with one person (t.who), or a group chat (t.group, see the group notes in phone-bits.js)
  const threadById = id => d.threads.find(t => t.id === id);
  const toHome = { label: '', go: () => goHome() };
  const threadName = t => (t.group ? t.group.name || t.group.members.map(m => who(m).name.split(' ')[0]).join(', ') : who(t.who).name);
  // a group's picture, or two of its people overlapping
  const threadFace = (t, cls = 'md') => {
    if (!t.group) return face(t.who, cls);
    if (t.group.imageId || !t.group.members.length) return portrait({ name: threadName(t), color: '#9b8aa8', imageId: t.group.imageId }, cls);
    return h('div', { class: 'ph-gface ' + cls }, t.group.members.slice(0, 2).map(m => face(m, 'xs')));
  };
  const msgPreview = (t, m) => {
    const what = m.video && !m.text ? '🎥 video' : m.imageId && !m.text ? '📷 photo' : m.text;
    return t.group && m.from === 'them' ? `${who(m.by).name}: ${what}` : what;
  };
  SCREENS.messages = () => {
    const list = [...d.threads].sort((a, b) => (b.msgs.at(-1)?.at || b.at || 0) - (a.msgs.at(-1)?.at || a.at || 0));
    return h('div', { class: 'ph-app-screen' },
      header('messages', { big: true, back: { label: 'home', go: () => goHome() }, right: plusBtn(newThread, 'new message') }),
      h('div', { class: 'ph-scroll' },
        list.length ? list.map(t => {
          const last = t.msgs.at(-1);
          return h('button', { type: 'button', class: 'ph-row ph-thread-row', onclick: () => show('thread', { id: t.id }) },
            last?.from === 'them' ? h('i', { class: 'ph-unread' }) : h('i', { class: 'ph-unread off' }),
            threadFace(t, 'md'),
            h('div', { class: 'ph-row-main' },
              h('div', { class: 'ph-row-top' }, h('b', {}, threadName(t)), h('span', {}, last ? shortDate(last.at) : '')),
              h('div', { class: 'ph-row-sub' }, last ? msgPreview(t, last) : ' ')),
            h('span', { class: 'ph-chev' }, '›'));
        }) : h('div', { class: 'ph-empty' }, sticker('1f4ac', 'ph-empty-stk'), mine ? h('button', { type: 'button', class: 'ph-pill', onclick: newThread }, 'new message') : null)));
  };

  // pick one person (a normal chat) or a few (a group chat)
  function pickPeople() {
    return new Promise(resolve => {
      let done = null;
      const picked = [];
      const key = r => (r.id ? 'oc:' + r.id : 'n:' + r.name.toLowerCase());
      const has = r => picked.some(x => key(x) === key(r));
      const chips = h('div', { class: 'ph-to-chips' });
      const nameBox = h('input', { type: 'text', class: 'ph-group-name', placeholder: 'group name', maxLength: 60 });
      const nameRow = h('label', { class: 'field ph-group-name-row' }, h('span', { class: 'field-label' }, 'group name'), nameBox);
      const typed = h('input', { type: 'text', placeholder: 'type a name', maxLength: 60, onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addTyped(); } } });
      const grid = h('div', { class: 'who-pick-grid' });
      const toggle = r => { if (has(r)) picked.splice(picked.findIndex(x => key(x) === key(r)), 1); else picked.push(r); paint(); };
      const addTyped = () => { const v = typed.value.trim(); if (!v) return; if (!has({ id: null, name: v })) picked.push({ id: null, name: v }); typed.value = ''; paint(); };
      const paint = () => {
        fill(chips, h('span', { class: 'ph-to-label' }, 'to:'), picked.map(r => h('button', { type: 'button', class: 'ph-to-chip', onclick: () => toggle(r) }, who(r).name, ' ×')));
        fill(grid, allOcs(char.id).map(o => h('button', {
          type: 'button', class: 'who-pick-oc' + (has(refOf(o)) ? ' on' : ''), style: { '--c': o.color }, onclick: () => toggle(refOf(o)),
        }, portrait(o, 'md'), h('span', {}, nameOf(o)))));
        nameRow.hidden = picked.length < 2;
      };
      paint();
      const m = openModal({
        title: 'new message',
        body: h('div', { class: 'who-pick ph-pick-people' }, chips, grid, h('div', { class: 'who-pick-typed ph-typed-add' }, typed, h('button', { type: 'button', class: 'btn ghost sm', onclick: addTyped }, 'add')), nameRow),
        actions: [{ label: 'text', kind: 'primary', onClick: close => { addTyped(); if (!picked.length) return; done = { people: [...picked], name: nameBox.value.trim() }; close(); } }],
        onClose: () => resolve(done),
      });
    });
  }
  async function newThread() {
    const got = await pickPeople();
    if (!got) return;
    if (got.people.length > 1) {
      const t = { id: 't_' + uid(), group: { gid: 'g_' + uid(), name: got.name, imageId: null, members: got.people.map(freshRef) }, who: null, msgs: [], read: true, typing: false, at: Date.now() };
      t.who = { id: null, name: threadName(t) };
      d.threads.push(t);
      save();
      show('thread', { id: t.id });
      return;
    }
    const ref = got.people[0];
    let t = d.threads.find(x => !x.group && ((ref.id && x.who.id === ref.id) || (!ref.id && !x.who.id && x.who.name.toLowerCase() === ref.name.toLowerCase())));
    if (!t) {
      t = { id: 't_' + uid(), who: ref, msgs: [], read: true, typing: false, at: Date.now() };
      d.threads.push(t);
      save();
    }
    show('thread', { id: t.id });
  }

  // send a picture or a video in a chat. resolves with { imageId } or { video } or null
  async function pickMedia() {
    const file = window.__testVideo || (await pickFiles('image/*,video/*', false))[0];
    if (!file) return null;
    if (file.type.startsWith('video/')) { const v = await addVideo(file); return v ? { video: v } : null; }
    const [cropped] = await cropAll([file]);
    if (!cropped) return null;
    try {
      const { blob } = await shrinkImage(cropped, 1000);
      return { imageId: await store.putImage(blob) };
    } catch (err) { console.error(err); toast("couldn't read that picture", 'bad'); return null; }
  }

  SCREENS.thread = ({ id }) => {
    const t = threadById(id);
    if (!t) return SCREENS.messages();
    const g = t.group;
    const w = who(t.who);
    const title = () => threadName(t);
    // who's texting: 'me', 'them' (1 on 1) or a member's index (group)
    let as = 'me';
    const asRef = () => (as === 'me' ? null : g ? g.members[as] : t.who);
    const list = h('div', { class: 'ph-scroll ph-chat' });
    const input = h('input', { type: 'text', class: 'ph-input', maxLength: 600, placeholder: g ? 'imessage' : 'message', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } } });
    const asBtn = h('button', {
      type: 'button', class: 'ph-as', title: 'switch who is texting', onclick: () => {
        if (g) as = !g.members.length ? 'me' : as === 'me' ? 0 : as + 1 >= g.members.length ? 'me' : as + 1;
        else as = as === 'me' ? 'them' : 'me';
        drawAs(); input.focus();
      },
    });
    const drawAs = () => {
      fill(asBtn, as === 'me' ? portrait(char, 'xs') : face(asRef(), 'xs'));
      asBtn.classList.toggle('them', as !== 'me');
      input.placeholder = as === 'me' ? (g ? 'imessage' : 'message') : `as ${who(asRef()).name}`;
    };
    const mirror = {
      send: m => (g ? mirrorGroupSend(char, t, m) : mirrorSend(char, t.who, m)),
      react: (mid, r) => (g ? mirrorGroupReact(char, t, mid, r) : mirrorReact(char, t.who, mid, r)),
      del: ids => (g ? mirrorGroupDelete(char, t, ids) : mirrorDelete(char, t.who, ids)),
    };
    function send(media = {}) {
      const text = input.value.trim();
      if (!text && !media.imageId && !media.video) return;
      if (g) g.members = g.members.map(freshRef); else t.who = freshRef(t.who);
      const m = { id: 'm_' + uid(), from: as === 'me' ? 'me' : 'them', text, imageId: media.imageId || null, at: Date.now(), react: null };
      if (media.video) m.video = media.video;
      if (g && as !== 'me') m.by = freshRef(asRef());
      t.msgs.push(m);
      input.value = '';
      save();
      mirror.send(m);
      drawMsgs(true);
    }
    async function sendMedia() {
      const got = await pickMedia();
      if (got) send(got);
    }
    const dropMsg = m => { dropImage(m.imageId); dropImage(m.video?.imageId); };
    function drawMsgs(animateLast = false) {
      let prev = null;
      const lastMine = t.msgs.map(m => m.from).lastIndexOf('me');
      const sender = m => (m.from === 'me' ? 'me' : g ? 'by:' + (m.by?.id || m.by?.name) : 'them');
      fill(list,
        h('div', { class: 'ph-chat-top' }, threadFace(t, 'lg'), h('b', {}, title()),
          g ? h('span', {}, `${g.members.length + 1} people`) : w.gone ? null : relLabel(char, t.who.id) ? h('span', {}, relLabel(char, t.who.id)) : null),
        t.msgs.map((m, i) => {
          const gap = !prev || m.at - prev.at > 3600e3;
          const next = t.msgs[i + 1];
          const tail = !next || sender(next) !== sender(m) || next.at - m.at > 3600e3;
          const first = gap || !prev || sender(prev) !== sender(m);
          const media = m.video ? vid(m.video, 'ph-msg-vid', { controls: true, sound: true, loop: false }) : m.imageId ? pic(m.imageId, 'ph-msg-pic') : null;
          const bubble = h('div', {
            class: `ph-bubble ${m.from}${tail ? ' tail' : ''}${media ? ' has-pic' : ''}${animateLast && i === t.msgs.length - 1 ? ' pop' : ''}`,
            onclick: e => { if (e.target.closest('video')) return; e.stopPropagation(); tapback(m, bubble); },
          }, media, m.text ? h('span', {}, m.text) : null,
            m.react ? h('span', { class: 'ph-react' }, m.react) : null);
          prev = m;
          const inGroup = g && m.from === 'them';
          return [
            gap ? h('div', { class: 'ph-stamp' }, h('b', {}, dayLabel(m.at)), ' ', hmA(m.at)) : null,
            inGroup && first ? h('div', { class: 'ph-sender' }, who(m.by).name) : null,
            h('div', { class: `ph-msg-row ${m.from}${m.react ? ' reacted' : ''}${inGroup ? ' grp' : ''}` },
              inGroup && tail ? h('div', { class: 'ph-msg-face' }, face(m.by, 'xs')) : null, bubble),
            !g && i === lastMine && i === t.msgs.length - 1 && m.from === 'me' ? h('div', { class: 'ph-receipt' }, t.read ? h('span', {}, h('b', {}, 'read '), hmA(m.at + 60e3)) : 'delivered') : null,
          ];
        }),
        t.typing ? h('div', { class: 'ph-msg-row them' + (g ? ' grp' : '') }, g && g.members[t.typingBy || 0] ? h('div', { class: 'ph-msg-face' }, face(g.members[t.typingBy || 0], 'xs')) : null,
          h('div', { class: 'ph-bubble them tail ph-typing' }, h('i'), h('i'), h('i'))) : null);
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }
    function tapback(m, bubble) {
      closeTapback();
      const bar = h('div', { class: 'ph-tapback ' + m.from },
        REACTS.map(r => h('button', { type: 'button', class: m.react === r ? 'on' : '', disabled: !mine, onclick: e => { e.stopPropagation(); m.react = m.react === r ? null : r; save(); mirror.react(m.id, m.react); closeTapback(); drawMsgs(); } }, r)),
        mine ? h('button', { type: 'button', class: 'ph-tb-del', title: 'delete', onclick: e => { e.stopPropagation(); t.msgs = t.msgs.filter(x => x !== m); dropMsg(m); save(); mirror.del([m.id]); closeTapback(); drawMsgs(); } }, '🗑') : null);
      bubble.closest('.ph-msg-row').prepend(bar);
      bubble.classList.add('lifted');
      setTimeout(() => document.addEventListener('click', closeTapback, { once: true }), 0);
    }
    const closeTapback = () => { list.querySelectorAll('.ph-tapback').forEach(b => b.remove()); list.querySelectorAll('.lifted').forEach(b => b.classList.remove('lifted')); };
    function info() {
      const readBox = h('input', { type: 'checkbox', checked: t.read, onchange: e => { t.read = e.target.checked; save(); drawMsgs(); } });
      const typingBox = h('input', { type: 'checkbox', checked: !!t.typing, onchange: e => { t.typing = e.target.checked; save(); drawMsgs(); } });
      // a text from them that shows up in a bit (as a banner wherever you are)
      const laterText = h('input', { type: 'text', class: 'ph-later-text', placeholder: 'text', maxLength: 600 });
      const laterWhen = h('select', { class: 'ph-later-when' }, [[5, '5 sec'], [30, '30 sec'], [60, '1 min'], [300, '5 min']].map(([v, l]) => h('option', { value: v }, l)));
      const laterWho = g ? h('select', { class: 'ph-later-who' }, g.members.map((m, i) => h('option', { value: i }, who(m).name))) : null;
      const typingWho = g ? h('select', { class: 'ph-typing-who', onchange: e => { t.typingBy = Number(e.target.value); save(); drawMsgs(); } }, g.members.map((m, i) => h('option', { value: i, selected: (t.typingBy || 0) === i }, who(m).name))) : null;
      const queued = d.later.filter(x => x.threadId === t.id).length;
      // group stuff: name, picture, people
      const groupBox = g ? h('div', { class: 'ph-group-edit' }) : null;
      const syncGroup = () => { t.who = { id: null, name: threadName(t) }; save(); mirrorGroupInfo(char, t); drawMsgs(); paintHead(); };
      const paintGroup = () => g && fill(groupBox,
        h('div', { class: 'ph-group-pic' }, threadFace(t, 'lg'),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const [p] = await addPhotos(false, 600); if (p) { dropImage(g.imageId); g.imageId = p.imageId; syncGroup(); paintGroup(); } } }, g.imageId ? 'change photo' : 'add photo'),
          g.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { dropImage(g.imageId); g.imageId = null; syncGroup(); paintGroup(); } }, 'remove') : null),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'group name'),
          h('input', { type: 'text', value: g.name, maxLength: 60, placeholder: threadName({ group: { ...g, name: '' } }), oninput: e => { g.name = e.target.value.trim(); syncGroup(); } })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'people'),
          h('div', { class: 'ph-group-people' },
            g.members.map(m => h('div', { class: 'ph-group-person' }, face(m, 'sm'), h('span', {}, who(m).name),
              g.members.length > 2 ? h('button', { type: 'button', class: 'ph-group-kick', title: 'remove', onclick: () => { g.members = g.members.filter(x => x !== m); as = 'me'; drawAs(); syncGroup(); paintGroup(); } }, '×') : null)),
            h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const r = await pickWho({ title: 'add someone', not: char.id, okLabel: 'add' }); if (r && !g.members.some(x => (r.id && x.id === r.id) || (!r.id && !x.id && x.name === r.name))) { g.members.push(freshRef(r)); syncGroup(); paintGroup(); } } }, 'add someone'))));
      paintGroup();
      openModal({
        title: title(),
        body: h('div', { class: 'ph-info' },
          groupBox,
          g ? null : h('label', { class: 'check' }, readBox, 'read receipts'),
          h('div', { class: 'ph-typing-row' }, h('label', { class: 'check' }, typingBox, g ? 'typing' : `${w.name} is typing`), typingWho),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'text me in'),
            h('div', { class: 'ph-later' }, laterWhen, laterWho, laterText,
              h('button', {
                type: 'button', class: 'btn sm ph-later-go', onclick: () => {
                  if (!laterText.value.trim()) return laterText.focus();
                  d.later.push({ id: 'l_' + uid(), threadId: t.id, text: laterText.value.trim(), due: Date.now() + Number(laterWhen.value) * 1000, by: g ? freshRef(g.members[Number(laterWho.value)]) : undefined });
                  save();
                  laterText.value = '';
                  toast(`coming in ${laterWhen.selectedOptions[0].textContent}`);
                },
              }, 'set')),
            queued ? h('span', { class: 'ph-later-n' }, `${queued} on the way`) : null),
          !g && w.char ? h('a', { class: 'btn ghost sm', href: ctx.ocLink(w.char) }, 'their page') : null),
        actions: [
          { label: g ? 'delete group' : 'delete chat', kind: 'danger', onClick: async close => { if (await confirmDialog(g ? `delete ${title()}?` : `delete the chat with ${w.name}?`, { danger: true, okLabel: 'delete' })) { close(); d.threads = d.threads.filter(x => x !== t); d.later = d.later.filter(x => x.threadId !== t.id); if (g) d.cleared[g.gid] = Date.now(); else if (t.who?.id) d.cleared[t.who.id] = Date.now(); t.msgs.forEach(dropMsg); if (g) dropImage(g.imageId); save(); show('messages', {}, 'pop'); } } },
          { label: 'done', kind: 'primary', onClick: close => close() },
        ],
      });
    }
    const headWho = h('div', { class: 'ph-chat-who' });
    const paintHead = () => fill(headWho, threadFace(t, 'sm'), h('span', {}, title(), ' ›'));
    paintHead();
    drawAs();
    drawMsgs();
    return h('div', { class: 'ph-app-screen ph-thread' + (g ? ' ph-group-thread' : '') },
      h('div', { class: 'ph-head ph-chat-head' },
        h('div', { class: 'ph-head-row' },
          h('button', { type: 'button', class: 'ph-back-btn', onclick: () => show('messages', {}, 'pop') }, '‹'),
          headWho,
          h('div', { class: 'ph-head-right' }, mine ? h('button', { type: 'button', class: 'ph-ibtn', title: 'details', onclick: info }, 'i') : null))),
      list,
      mine ? h('div', { class: 'ph-composer' },
        h('button', { type: 'button', class: 'ph-cam-btn', title: 'send a picture or video', onclick: sendMedia }, '📷'),
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
      ...d.threads.filter(t => !t.group && (!t.who.id || !ocById(t.who.id))).map(t => ({ ref: t.who, rel: '' })),
    ].sort((a, b) => (b.rel ? 1 : 0) - (a.rel ? 1 : 0) || who(a.ref).name.localeCompare(who(b.ref).name));
    const textThem = ref => {
      let t = d.threads.find(x => !x.group && ((ref.id && x.who.id === ref.id) || (!ref.id && x.who === ref)));
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
        h('div', { class: 'ph-set-label' }, 'passcode'),
        h('div', { class: 'ph-group' },
          h('div', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#ff3b30' } }, lockIco(!d.passcode)), h('div', { class: 'ph-row-main' }, h('b', {}, 'passcode')),
            h('div', { class: 'ph-seg ph-pass-seg' }, [['', 'off'], [4, '4 digits'], [6, '6 digits']].map(([n, l]) => h('button', {
              type: 'button', class: (n ? d.passcode.length === n : !d.passcode) ? 'on' : '', 'data-pass': n || 'off',
              onclick: () => { if (!n) { d.passcode = ''; d.faceId = false; save(); redraw(); } else show('passcode', { set: n }, 'push'); },
            }, l)))),
          d.passcode ? h('div', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#8e8e93' } }, '#'), h('div', { class: 'ph-row-main' }, h('b', {}, 'code')), h('span', { class: 'ph-pass-show' }, d.passcode)) : null,
          d.passcode ? h('div', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#34c759' } }, faceIdIco()), h('div', { class: 'ph-row-main' }, h('b', {}, 'face id')), toggle(d.faceId, v => { d.faceId = v; save(); })) : null),
        settingsGroup(api),
        h('div', { class: 'ph-set-label' }, 'phone'),
        h('div', { class: 'ph-group' },
          h('label', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#34c759' } }, '📶'), h('b', {}, 'carrier'),
            h('input', { type: 'text', class: 'ph-set-input', value: d.carrier, maxLength: 24, oninput: e => { d.carrier = e.target.value; save(); } })),
          h('label', { class: 'ph-row static' }, h('span', { class: 'ph-set-ico', style: { background: '#ffcc00' } }, '🔋'), h('b', {}, 'battery'),
            h('input', { type: 'range', class: 'ph-range', min: 1, max: 100, value: d.battery, oninput: e => { d.battery = Number(e.target.value); save(); drawStatus(); e.target.nextSibling.textContent = d.battery + '%'; } }), h('em', { class: 'ph-batt-pct' }, d.battery + '%'))),
        h('button', { type: 'button', class: 'ph-pill wide', onclick: () => show('lock', {}, 'lockdown') }, 'lock phone')));
  };

  // passcode: { then } to unlock, { set: 4|6 } to pick a new one
  SCREENS.passcode = ({ then, set }) => {
    const len = set || d.passcode.length || 4;
    let typed = '', first = null;
    const title = h('div', { class: 'ph-pass-title' });
    const dots = h('div', { class: 'ph-pass-dots' });
    const drawTitle = () => { title.textContent = set ? (first ? 'confirm passcode' : 'new passcode') : 'enter passcode'; };
    const drawDots = () => fill(dots, Array.from({ length: len }, (_, i) => h('i', { class: i < typed.length ? 'on' : '' })));
    const side = h('button', { type: 'button', class: 'ph-pass-side', onclick: () => { if (typed) { typed = typed.slice(0, -1); drawDots(); drawSide(); } else cancel(); } });
    const drawSide = () => { side.textContent = typed ? 'delete' : 'cancel'; };
    const cancel = () => (set ? show('settings', {}, 'pop') : show('lock', {}, 'fade'));
    const wrong = () => {
      dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
      navigator.vibrate?.(180);
      setTimeout(() => { typed = ''; drawDots(); drawSide(); }, 380);
    };
    const press = k => {
      if (typed.length >= len) return;
      typed += k;
      drawDots();
      drawSide();
      if (typed.length < len) return;
      setTimeout(() => {
        if (set) {
          if (!first) { first = typed; typed = ''; drawTitle(); drawDots(); drawSide(); return; }
          if (typed !== first) { first = null; drawTitle(); wrong(); return; }
          d.passcode = typed; save(); toast('passcode set'); show('settings', {}, 'pop');
          return;
        }
        if (typed === d.passcode) (then || (() => show('home', {}, 'unlock')))();
        else wrong();
      }, 120);
    };
    const keys = e => {
      if (/^\d$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace' && typed) { typed = typed.slice(0, -1); drawDots(); drawSide(); }
      else if (e.key === 'Escape') cancel();
    };
    document.addEventListener('keydown', keys);
    cleanupScreen = () => document.removeEventListener('keydown', keys);
    const LETTERS = ['', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
    drawTitle(); drawDots(); drawSide();
    return h('div', { class: 'ph-pass' + (set ? ' setting' : '') },
      wall(d.lock.imageId, 'ph-wall-lock'),
      h('div', { class: 'ph-pass-in' },
        lockIco(false), title, dots,
        h('div', { class: 'ph-pass-keys' },
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => h('button', { type: 'button', class: 'ph-pass-key', 'data-key': n, onclick: () => press(String(n)) }, h('b', {}, n), h('span', {}, LETTERS[n - 1]))),
          h('button', { type: 'button', class: 'ph-pass-side', onclick: () => { if (APPS.phone && SCREENS.phone) show('phone', { tab: 'keypad' }, 'fade'); } }, set ? '' : 'emergency'),
          h('button', { type: 'button', class: 'ph-pass-key', 'data-key': 0, onclick: () => press('0') }, h('b', {}, 0)),
          side),
        mine && !set ? h('button', { type: 'button', class: 'ph-pass-forgot', onclick: () => toast(`it's ${d.passcode}`) }, 'forgot passcode') : null));
  };

  // a banner that drops down from the top when something arrives
  function banner(n) {
    screen.querySelector('.ph-banner')?.remove();
    const a = APPS[n.app];
    let y0 = null, gone = false;
    const hide = () => { if (gone) return; gone = true; b.classList.add('out'); setTimeout(() => b.remove(), 350); };
    const b = h('button', {
      type: 'button', class: 'ph-banner', 'data-app': n.app,
      onpointerdown: e => { y0 = e.clientY; e.stopPropagation(); },
      onpointermove: e => { if (y0 != null && e.clientY - y0 < 0) b.style.transform = `translateY(${e.clientY - y0}px)`; },
      onpointerup: e => { if (y0 != null && y0 - e.clientY > 18) { hide(); y0 = null; return; } b.style.transform = ''; y0 = null; },
      onclick: () => { if (gone) return; hide(); if (cur?.name === 'lock' || cur?.name === 'passcode') unlockThen(n.open); else n.open(); },
    },
      h('div', { class: 'ph-notif-ico', style: { background: a.bg } }, sticker(a.icon)),
      h('div', { class: 'ph-notif-body' },
        h('div', { class: 'ph-notif-top' }, h('b', {}, n.title), h('span', {}, 'now')),
        h('div', { class: 'ph-notif-text' }, n.text)),
      n.faceOf ? face(n.faceOf, 'xs ph-notif-face') : null);
    screen.append(b);
    setTimeout(hide, 4200);
  }
  // pulling down from the top left (or tapping the clock) shows every notification
  function openCenter() {
    if (screen.querySelector('.ph-nc')) return;
    const list = allNotifs(3);
    const groups = new Map();
    for (const n of list) { if (!groups.has(n.app)) groups.set(n.app, []); groups.get(n.app).push(n); }
    const close = () => { nc.classList.add('out'); setTimeout(() => nc.remove(), 380); };
    let y0 = null;
    const nc = h('div', {
      class: 'ph-nc',
      onclick: e => { if (!e.target.closest('.ph-nc-item')) close(); },
      onpointerdown: e => { y0 = e.clientY; },
      onpointerup: e => { if (y0 != null && y0 - e.clientY > 40) close(); y0 = null; },
    },
      wall(d.lock.imageId, 'ph-wall-lock'),
      h('div', { class: 'ph-nc-in' },
        h('div', { class: 'ph-nc-date' }, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase()),
        h('div', { class: 'ph-nc-clock' }, hm()),
        h('div', { class: 'ph-nc-list ph-scroll' },
          list.length ? [...groups].map(([app, ns]) => h('div', { class: 'ph-nc-group' },
            h('div', { class: 'ph-nc-app' }, APPS[app].label),
            ns.map(n => h('button', {
              type: 'button', class: 'ph-notif ph-nc-item', 'data-app': n.app,
              onclick: () => { close(); if (cur?.name === 'lock' || cur?.name === 'passcode') unlockThen(n.open); else n.open(); },
            },
              h('div', { class: 'ph-notif-ico', style: { background: APPS[n.app].bg } }, sticker(APPS[n.app].icon)),
              h('div', { class: 'ph-notif-body' },
                h('div', { class: 'ph-notif-top' }, h('b', {}, n.title), h('span', {}, dayLabel(n.at) === 'today' ? hm(n.at) : dayLabel(n.at))),
                h('div', { class: 'ph-notif-text' }, n.text)),
              n.faceOf ? face(n.faceOf, 'xs ph-notif-face') : null))))
            : h('div', { class: 'ph-nc-none' }, 'no notifications'))));
    screen.append(nc);
  }
  function pullCenter(e) {
    const y0 = e.clientY;
    const move = ev => { if (ev.clientY - y0 > 30) { stop(); openCenter(); } };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }
  // texts set to arrive later: drop them in when they're due
  function deliverLater() {
    const now = Date.now();
    const due = d.later.filter(x => x.due <= now);
    if (!due.length) return;
    d.later = d.later.filter(x => x.due > now);
    for (const x of due) {
      const t = threadById(x.threadId);
      if (!t) continue;
      const m = { id: 'm_' + uid(), from: 'them', text: x.text, imageId: null, at: Math.max(x.due, (t.msgs.at(-1)?.at || 0) + 1), react: null };
      if (t.group) m.by = x.by || t.group.members[0] || { id: null, name: 'someone' };
      t.msgs.push(m);
      t.typing = false;
      if (t.group) mirrorGroupSend(char, t, m); else mirrorSend(char, t.who, m);
      const n = { app: 'messages', title: threadName(t), text: msgPreview(t, m), at: m.at, faceOf: t.group ? m.by : t.who, open: () => show('thread', { id: t.id }, cur?.name === 'lock' ? 'unlock' : 'zoom') };
      if (cur?.name === 'thread' && cur.params.id === t.id) redraw();
      else if (cur?.name === 'lock') { redraw(); screen.classList.remove('wake'); void screen.offsetWidth; screen.classList.add('wake'); }
      else { banner(n); if (cur?.name === 'home' || cur?.name === 'messages') redraw(); }
    }
    save();
  }
  timers.push(setInterval(deliverLater, 1000));
  // pull in texts other phones have that this one missed (the texts land right away, pictures a moment later)
  catchUp(char, d).then(changed => { if (changed && ['messages', 'thread'].includes(cur?.name)) redraw(); });

  // ---- the other apps ----
  const api = {
    d, char, mine, ctx, save, show, redraw, goHome, openApp, header, plusBtn, screen, SCREENS, drawStatus, APPS, appOf, FIXED, STOCK, banner,
    installed: id => d.custom.some(c => c.id === id) || d.installed.includes(id),
    download: id => { if (!d.installed.includes(id)) d.installed.push(id); d.hidden = d.hidden.filter(x => x !== id); justGot.add(id); save(); },
    onLeave: fn => { cleanupScreen = fn; },
  };
  for (const m of EXTRA) m.install?.(api);
  gateScreens(api, id => usedBefore[id]);
  // tapping your own username inside an app switches accounts
  screen.addEventListener('click', e => {
    const el = mine && e.target.closest?.('[data-acct-switch]');
    if (!el || !cur || !ACCT[cur.name]) return;
    e.preventDefault();
    e.stopPropagation();
    switcher(api, cur.name);
  }, true);

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

  return () => { timers.forEach(clearInterval); cleanupScreen?.(); setApp(null); };
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

// ---- scrolling with a mouse like it's a touchscreen ----
// drag anything scrollable inside the screen (with a little glide when you let go), drag the home screen
// sideways to change pages, and the scroll wheel flips home pages. touch keeps the browser's own scrolling.
const NO_DRAG = 'input, textarea, select, [contenteditable="true"], canvas, [data-nodrag], .ph-lock, .pw-map, .pw-board, .pw-pad';
function scrollerFor(el, stop, axis) {
  for (; el && el !== stop; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (axis === 'y' ? /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1
      : /auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) return el;
  }
  return null;
}
function flipTo(pages, k) {
  const w = pages.clientWidth, n = Math.max(1, Math.round(pages.scrollWidth / w));
  pages.scrollTo({ left: Math.max(0, Math.min(n - 1, k)) * w, behavior: 'smooth' });
}
function mouseScroll(screen) {
  let glide = 0;
  screen.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0 || e.defaultPrevented || e.target.closest(NO_DRAG)) return;
    cancelAnimationFrame(glide);
    const sx = e.clientX, sy = e.clientY;
    let axis = null, el = null, start = 0;
    const samples = [];
    const pos = ev => (axis === 'x' ? ev.clientX : ev.clientY);
    const move = ev => {
      if (!axis) {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.hypot(dx, dy) < 6) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        el = scrollerFor(e.target, screen, axis);
        if (!el) { done(); return; }
        start = axis === 'x' ? el.scrollLeft : el.scrollTop;
        el.style.scrollSnapType = 'none';
        el.style.scrollBehavior = 'auto';
        screen.classList.add('ph-grabbing');
      }
      const delta = pos(ev) - (axis === 'x' ? sx : sy);
      if (axis === 'x') el.scrollLeft = start - delta; else el.scrollTop = start - delta;
      samples.push({ t: ev.timeStamp, p: pos(ev) });
      if (samples.length > 5) samples.shift();
    };
    const done = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      screen.classList.remove('ph-grabbing');
    };
    const up = ev => {
      done();
      if (!el) return;
      // the click after a drag shouldn't press whatever's under the mouse
      const eat = c => { c.stopPropagation(); c.preventDefault(); };
      screen.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => screen.removeEventListener('click', eat, { capture: true }), 80);
      const a = samples[0], b = samples.at(-1);
      let v = a && b && b.t > a.t && ev.timeStamp - b.t < 90 ? (b.p - a.p) / (b.t - a.t) : 0; // px per ms
      const unsnap = () => { el.style.scrollSnapType = ''; el.style.scrollBehavior = ''; };
      if (el.classList.contains('ph-pages')) {
        const k = el.scrollLeft / el.clientWidth;
        flipTo(el, Math.abs(v) > .25 ? (v < 0 ? Math.ceil(k) : Math.floor(k)) : Math.round(k));
        setTimeout(unsnap, 480);
        return;
      }
      unsnap();
      if (Math.abs(v) < .1) return;
      let last = performance.now();
      const step = now => {
        const dt = Math.min(32, now - last);
        last = now;
        if (axis === 'x') el.scrollLeft -= v * dt; else el.scrollTop -= v * dt;
        v *= Math.pow(.95, dt / 16);
        if (Math.abs(v) > .02 && el.isConnected) glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  // the wheel flips home pages one at a time (one flip per flick)
  let wheelQuiet = 0;
  screen.addEventListener('wheel', e => {
    const pages = e.target.closest('.ph-pages');
    if (!pages) return;
    const page = e.target.closest('.ph-page');
    let dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!dx && page && page.scrollHeight <= page.clientHeight + 1) dx = e.deltaY;
    if (!dx) return;
    e.preventDefault();
    const now = performance.now();
    const busy = now < wheelQuiet;
    wheelQuiet = now + 260;
    if (busy || Math.abs(dx) < 3) return;
    flipTo(pages, Math.round(pages.scrollLeft / pages.clientWidth) + Math.sign(dx));
  }, { passive: false });
}
