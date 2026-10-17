// computer: the oc's computer. two looks you can switch between (settings, or the toggle up top):
//   y2k     a chunky crt monitor (or a candy colored one) around an early 2000s desktop
//   modern  a laptop around a modern desktop (light / dark)
// it boots, logs in (optional password), has a little window manager (drag, resize, minimize, maximize, close,
// a taskbar, desktop icons you can arrange) and shuts down from the start menu.
//
// the apps plug in from computer-apps-*.js. each one exports
//   APPS    { id: { label, icon, w, h, render(win, api), key?(params), only?: 'y2k'|'modern', label2k?, labelNow? } }
//   DEF     defaults for its saved stuff (top-level keys on the computer's data)
//   install?(api)   runs once per render (tick handlers etc)
// win = { id, app, params, el, body, setTitle(t), close(), redraw(), go(params), cleanup }
// api: see the `api` object below.
//
// everything is saved in char.fun.computer. pictures keep their id under `imageId`.

import { h, s, fill, uid, openModal, swatches, segmented, toast } from '../ui.js';
import { STICKER_TABS, stickerNode } from '../diary/stickers.js';
import { store } from '../store.js';
import { dataFor, pic, sticker, appBar, portrait, nameOf, uploadPic } from './kit.js';
import { dropImage, hmA } from './phone-bits.js';
import { sparkleTrail } from './myspace.js';
import { logo, docText, LOOKS, SCHEMES } from './computer-bits.js';
import * as netApps from './computer-apps-net.js';
import * as fileApps from './computer-apps-files.js';
import * as funApps from './computer-apps-fun.js';

const EXTRA = [netApps, fileApps, funApps];

export const meta = { id: 'computer', label: 'computer', icon: '1f5a5-fe0f' };

const CRT_COLORS = ['#e9e3cf', '#f4f1ea', '#d7d2c4', '#2a2a2e', '#c4c6cc', '#ffc4e1', '#c9b3ff', '#141114'];
const CANDY_COLORS = ['#19a7c4', '#ff8a1e', '#7b4bd6', '#e8336a', '#8fd11f', '#3a6fe0', '#ff6fb5', '#a8b0b8'];
const LAPTOP_COLORS = ['#c9cbd2', '#5d5f66', '#e8c1b0', '#22283a', '#cbb8e8', '#ffc4dc', '#b9e4d4', '#141114'];

const DEF = {
  look: 'y2k',
  frame: { y2k: { kind: 'crt', color: '#e9e3cf', stickers: [] }, modern: { color: '#c9cbd2', stickers: [] } },
  y2k: { wall: 'hills', imageId: null, icons: {}, scheme: 'blue', cursor: 'normal' },
  modern: { wall: 'glow', imageId: null, icons: {}, accent: '#ff4fa3', dark: false },
  password: '', acct: { imageId: null },
  saver: { kind: 'stars', text: '', wait: 120 },
  bin: [],
  ...Object.assign({}, ...EXTRA.map(m => m.DEF || {})),
};

// what sits on each desktop (everything else is in the start menu)
const DESK = {
  y2k: ['files', 'bin', 'browser', 'im', 'mail', 'music', 'paint', 'word', 'notepad', 'games', 'webcam'],
  modern: ['files', 'pics', 'bin'],
};
const DOCK = ['files', 'browser', 'im', 'mail', 'music', 'paint', 'word', 'games', 'webcam', 'settings'];

// computers left on (this page load): coming back to the tab doesn't boot it again
const awake = new Set();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = dataFor(char, 'computer', DEF);
  for (const k of ['frame', 'y2k', 'modern', 'acct', 'saver']) d[k] = { ...structuredClone(DEF[k]), ...d[k] };
  d.frame.y2k = { ...DEF.frame.y2k, ...d.frame.y2k };
  d.frame.modern = { ...DEF.frame.modern, ...d.frame.modern };
  const save = () => { if (mine) ctx.save(); };
  const timers = [];
  const ticks = new Set();
  const cleanups = [];

  const APPS = Object.assign({}, ...EXTRA.map(m => m.APPS || {}));
  const appOk = id => APPS[id] && (!APPS[id].only || APPS[id].only === d.look);
  const labelOf = id => (d.look === 'y2k' ? APPS[id].label2k : APPS[id].labelNow) || APPS[id].label;

  // ---- the device ----
  const screen = h('div', { class: 'cp-screen' });
  const glass = h('div', { class: 'cp-glass' }, screen, h('i', { class: 'cp-glare' }));
  const stks = h('div', { class: 'cp-stks' });
  const device = h('div', { class: 'cp-device' });
  const stage = h('div', { class: 'cp-stage' }, device);
  const powerBtn = h('button', { type: 'button', class: 'cp-power', title: 'power', onclick: () => power() });
  let lidShut = false;

  function buildDevice() {
    const f = d.frame[d.look];
    device.className = 'cp-device ' + (d.look === 'y2k' ? 'cp-crt cp-kind-' + f.kind : 'cp-laptop') + (lidShut && d.look === 'modern' ? ' shut' : '');
    device.style.setProperty('--frame', f.color);
    if (d.look === 'y2k') {
      fill(device,
        h('div', { class: 'cp-mon' },
          h('div', { class: 'cp-bezel' }, glass),
          h('div', { class: 'cp-chin' },
            h('span', { class: 'cp-badge' }, logo(), h('b', {}, 'oc')),
            h('span', { class: 'cp-grill' }),
            h('i', { class: 'cp-led' }), powerBtn),
          stks),
        h('div', { class: 'cp-neck' }), h('div', { class: 'cp-foot' }));
    } else {
      fill(device,
        h('div', { class: 'cp-lid' },
          h('div', { class: 'cp-lid-front' }, h('div', { class: 'cp-bezel' }, h('i', { class: 'cp-cam' }), glass)),
          h('div', { class: 'cp-lid-back' }, h('i', { class: 'cp-lid-logo' }), stks)),
        h('div', { class: 'cp-base' }, h('i', { class: 'cp-notch' }), powerBtn));
    }
    drawStickers();
  }

  // stickers on the monitor / the lid: drag them, scroll (or the buttons) to resize, shift + scroll to turn
  let pickedStk = null;
  function drawStickers() {
    const list = d.frame[d.look].stickers;
    const place = (box, it) => { box.style.left = it.x + '%'; box.style.top = it.y + '%'; box.style.transform = `translate(-50%,-50%) rotate(${it.r || 0}deg) scale(${it.k || 1})`; box.style.setProperty('--k', it.k || 1); };
    fill(stks, list.map(it => {
      const box = h('div', { class: 'cp-stk' + (pickedStk === it ? ' sel' : '') }, stickerNode(it.sid));
      place(box, it);
      if (!mine) return box;
      const tweak = (dk, dr) => { it.k = clamp((it.k || 1) + dk, 0.3, 3); it.r = ((it.r || 0) + dr) % 360; place(box, it); save(); };
      box.append(h('div', { class: 'cp-stk-tools' },
        h('button', { type: 'button', title: 'smaller', onclick: e => { e.stopPropagation(); tweak(-0.15, 0); } }, '−'),
        h('button', { type: 'button', title: 'bigger', onclick: e => { e.stopPropagation(); tweak(0.15, 0); } }, '+'),
        h('button', { type: 'button', title: 'turn', onclick: e => { e.stopPropagation(); tweak(0, 15); } }, '↻'),
        h('button', { type: 'button', title: 'peel off', onclick: e => { e.stopPropagation(); d.frame[d.look].stickers = list.filter(x => x !== it); pickedStk = null; save(); drawStickers(); } }, '✕')));
      box.addEventListener('wheel', e => { e.preventDefault(); if (e.shiftKey) tweak(0, e.deltaY > 0 ? 8 : -8); else tweak(e.deltaY > 0 ? -0.08 : 0.08, 0); }, { passive: false });
      box.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault(); e.stopPropagation();
        pickedStk = it;
        stks.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
        box.classList.add('sel');
        const area = stks.getBoundingClientRect();
        try { box.setPointerCapture(e.pointerId); } catch {}
        const move = ev => { it.x = clamp(((ev.clientX - area.left) / area.width) * 100, 2, 98); it.y = clamp(((ev.clientY - area.top) / area.height) * 100, 2, 98); place(box, it); };
        const up = () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); save(); };
        box.addEventListener('pointermove', move);
        box.addEventListener('pointerup', up);
      });
      return box;
    }));
  }
  stage.addEventListener('pointerdown', e => { if (!e.target.closest('.cp-stk')) { pickedStk = null; stks.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); } });

  // ---- states: off -> boot -> login -> desk ----
  let state = 'off';
  const layer = h('div', { class: 'cp-layer' });
  screen.append(layer);

  function paintScreen() {
    const L = d[d.look];
    screen.className = 'cp-screen ' + (d.look === 'y2k' ? 'cp-y2k' : 'cp-mod') + (d.look === 'modern' && L.dark ? ' dark' : '') + ' st-' + state;
    screen.dataset.look = d.look;
    if (d.look === 'y2k') {
      const sc = SCHEMES.find(x => x[0] === L.scheme) || SCHEMES[0];
      screen.dataset.scheme = sc[0];
      screen.style.setProperty('--acc', sc[2]);
      screen.dataset.cursor = L.cursor || 'normal';
    } else {
      delete screen.dataset.scheme;
      delete screen.dataset.cursor;
      screen.style.setProperty('--acc', L.accent || '#ff4fa3');
    }
    device.classList.toggle('on', state !== 'off');
  }

  function setState(st) {
    state = st;
    paintScreen();
    if (st !== 'desk') closeAll();
    stopSaver();
    if (st === 'off') { awake.delete(char.id); fill(layer, h('div', { class: 'cp-off', onclick: () => power() })); return; }
    if (st === 'boot') return boot();
    if (st === 'login') return login();
    if (st === 'desk') { awake.add(char.id); return desktop(); }
  }
  function power() {
    if (state === 'off') setState('boot');
    else if (state === 'desk') shutDownBox();
  }

  function boot() {
    let skipped = false;
    const next = () => { if (skipped || state !== 'boot') return; skipped = true; setState('login'); };
    if (d.look === 'y2k') {
      const bios = h('div', { class: 'cp-bios' },
        h('div', {}, 'oc bios v6.00pg, an energy star ally'),
        h('div', {}, 'copyright (c) 1984-2003'),
        h('br'),
        h('div', {}, 'main processor : pentium-ish 4 1.80ghz'),
        h('div', { class: 'cp-bios-mem' }, 'memory testing : 0k'),
        h('div', {}, 'detecting ide drives ... ', h('span', { class: 'cp-bios-ok' }, 'ok')));
      fill(layer, h('div', { class: 'cp-boot cp-boot-y2k', onclick: next }, bios,
        h('div', { class: 'cp-boot-logo' }, logo('big'), h('div', { class: 'cp-boot-word' }, h('b', {}, 'oc'), h('span', {}, 'os'), h('sup', {}, '2003'))),
        h('div', { class: 'cp-boot-bar' }, h('i'), h('i'), h('i'))));
      let k = 0;
      const mem = bios.querySelector('.cp-bios-mem');
      const memIv = setInterval(() => { k = Math.min(524288, k + 65536); mem.textContent = `memory testing : ${k}k ${k >= 524288 ? 'ok' : ''}`; if (k >= 524288) clearInterval(memIv); }, 60);
      timers.push(memIv);
      setTimeout(() => layer.querySelector('.cp-boot')?.classList.add('logo'), 700);
      setTimeout(next, 2500);
    } else {
      fill(layer, h('div', { class: 'cp-boot cp-boot-mod', onclick: next }, h('i', { class: 'cp-orb big' }), h('div', { class: 'cp-spin' }, Array.from({ length: 6 }, () => h('i')))));
      setTimeout(next, 1700);
    }
  }

  const acctPic = (cls = '') => (d.acct.imageId ? h('div', { class: 'portrait ' + cls }, pic(d.acct.imageId)) : portrait(char, cls));

  function login() {
    const userName = nameOf(char);
    const pass = h('input', { type: 'password', class: 'cp-pass', maxLength: 40, placeholder: d.look === 'modern' ? 'password' : '', autocomplete: 'off' });
    const tile = h('div', { class: 'cp-user' });
    const tryIn = () => {
      if (!d.password || pass.value === d.password) { setState('desk'); return; }
      pass.value = '';
      tile.classList.remove('shake'); void tile.offsetWidth; tile.classList.add('shake');
      ding();
    };
    pass.addEventListener('keydown', e => { if (e.key === 'Enter') tryIn(); });
    const go = h('button', { type: 'button', class: 'cp-pass-go', title: 'log on', onclick: tryIn }, '➜');
    const forgot = mine && d.password ? h('button', { type: 'button', class: 'cp-pass-forgot', title: 'forgot', onclick: () => toast(`it's ${d.password}`) }, '?') : null;
    const open = () => {
      if (!d.password) { tile.classList.add('picked'); setTimeout(() => setState('desk'), 350); return; }
      tile.classList.add('picked', 'asking');
      requestAnimationFrame(() => pass.focus());
    };
    fill(tile,
      h('button', { type: 'button', class: 'cp-user-btn', onclick: open }, acctPic('cp-user-pic'), h('span', { class: 'cp-user-name' }, userName)),
      h('div', { class: 'cp-pass-row' }, pass, go, forgot));
    const turnOff = h('button', { type: 'button', class: 'cp-login-off', onclick: () => shutDown() }, h('i', { class: 'cp-off-ico' }), d.look === 'y2k' ? 'turn off computer' : '');
    if (d.look === 'y2k') {
      fill(layer, h('div', { class: 'cp-login cp-login-y2k' },
        h('div', { class: 'cp-login-top' }),
        h('div', { class: 'cp-login-mid' },
          h('div', { class: 'cp-login-brand' }, logo('big'), h('div', { class: 'cp-boot-word' }, h('b', {}, 'oc'), h('span', {}, 'os'))),
          h('i', { class: 'cp-login-line' }),
          tile),
        h('div', { class: 'cp-login-bot' }, turnOff)));
    } else {
      const now = new Date();
      fill(layer, h('div', { class: 'cp-login cp-login-mod' },
        wallEl(),
        h('div', { class: 'cp-login-clock' }, h('b', { 'data-clock': '' }, hmA().replace(/ ?[ap]m$/, '')), h('span', {}, now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase())),
        tile,
        h('div', { class: 'cp-login-bot' }, turnOff)));
    }
    if (!d.password && mine === false) tile.classList.add('nopass');
  }

  // ---- the desktop ----
  let deskEl = null, iconsEl = null, winsEl = null, tasksEl = null, startEl = null, notesEl = null, trayClock = null, widgetsEl = null;
  const wins = [];
  let zTop = 10, active = null, selIcon = null;
  const small = () => !!deskEl && deskEl.clientWidth < 560;

  function wallEl() {
    const L = d[d.look];
    const w = h('div', { class: 'cp-wall', 'data-wall': L.imageId ? 'pic' : L.wall }, L.imageId ? pic(L.imageId, 'cp-wall-img') : null);
    if (!L.imageId) w.append(h('i', { class: 'cp-wall-a' }), h('i', { class: 'cp-wall-b' }));
    return w;
  }

  function desktop() {
    const reopen = pendingReopen.splice(0);
    deskEl = h('div', { class: 'cp-desk', onpointerdown: e => { if (e.target === deskEl || e.target.closest('.cp-wall, .cp-icons') && !e.target.closest('.cp-icon')) { selectIcon(null); closeStart(); } } });
    iconsEl = h('div', { class: 'cp-icons' });
    winsEl = h('div', { class: 'cp-wins' });
    notesEl = h('div', { class: 'cp-notes' });
    widgetsEl = d.look === 'modern' ? h('div', { class: 'cp-widgets' }) : null;
    deskEl.append(wallEl(), widgetsEl, iconsEl, winsEl, notesEl);
    tasksEl = h('div', { class: 'cp-tasks' });
    trayClock = h('span', { class: 'cp-clock' });
    startEl = h('div', { class: 'cp-start-menu', hidden: true });
    const startBtn = h('button', { type: 'button', class: 'cp-start', title: 'start', onclick: e => { e.stopPropagation(); toggleStart(); } },
      d.look === 'y2k' ? [logo(), h('span', {}, 'start')] : h('i', { class: 'cp-orb' }));
    const tray = h('div', { class: 'cp-tray' },
      d.look === 'modern' ? h('button', { type: 'button', class: 'cp-tray-btn', title: d.modern.dark ? 'light mode' : 'dark mode', onclick: () => { d.modern.dark = !d.modern.dark; save(); paintScreen(); refreshAll(); drawTray(); } }, d.modern.dark ? '☀' : '☾') : null,
      h('button', { type: 'button', class: 'cp-tray-btn cp-tray-im', title: 'messenger', onclick: () => openWin('im') }, sticker('1f4ac', 'cp-tray-stk')),
      h('span', { class: 'cp-tray-ico', title: 'volume' }, speakerIco()),
      d.look === 'modern' ? h('span', { class: 'cp-tray-ico' }, wifiIco()) : null,
      trayClock);
    const drawTray = () => { const b = tray.querySelector('.cp-tray-btn'); if (b && d.look === 'modern') { b.textContent = d.modern.dark ? '☀' : '☾'; b.title = d.modern.dark ? 'light mode' : 'dark mode'; } };
    const quick = d.look === 'y2k' ? h('div', { class: 'cp-quick' }, ['browser', 'im', 'music'].map(id => h('button', { type: 'button', title: labelOf(id), onclick: () => openWin(id) }, sticker(APPS[id].icon)))) : null;
    const pinned = d.look === 'modern' ? h('div', { class: 'cp-dock' }, DOCK.filter(appOk).map(id => h('button', {
      type: 'button', class: 'cp-dock-btn', 'data-app': id, title: labelOf(id),
      onclick: () => { const w = wins.filter(x => x.app === id).sort((a, b) => b.z - a.z)[0]; if (!w) openWin(id); else taskClick(w); },
    }, sticker(APPS[id].icon), h('i', { class: 'cp-dock-dot' })))) : null;
    const bar = h('div', { class: 'cp-taskbar' }, startBtn, quick, pinned, tasksEl, tray);
    fill(layer, h('div', { class: 'cp-shell' }, deskEl, bar, startEl));
    drawIcons();
    drawWidgets();
    drawClock();
    drawTasks();
    for (const r of reopen) { const w = openWin(r.app, r.params); if (r.max && w && !w.max) toggleMax(w); }
    if (!reopen.length) setTimeout(() => newsOnLogin(), 600);
  }

  function drawClock() {
    if (trayClock) {
      if (d.look === 'y2k') trayClock.textContent = hmA().toUpperCase();
      else fill(trayClock, h('b', {}, hmA().toUpperCase()), h('span', {}, new Date().toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })));
    }
    layer.querySelectorAll('[data-clock]').forEach(e => { e.textContent = hmA().replace(/ ?[ap]m$/, ''); });
  }
  timers.push(setInterval(() => { drawClock(); ticks.forEach(fn => { try { fn(); } catch (err) { console.error(err); } }); }, 2000));

  // ---- desktop icons ----
  const CELL = () => (d.look === 'y2k' ? { w: 76, h: 74 } : { w: 84, h: 84 });
  function selectIcon(id) {
    selIcon = id;
    iconsEl?.querySelectorAll('.cp-icon').forEach(b => b.classList.toggle('sel', b.dataset.app === id));
  }
  function drawIcons() {
    if (!iconsEl) return;
    const ids = DESK[d.look].filter(appOk);
    fill(iconsEl, ids.map(id => {
      const b = h('button', { type: 'button', class: 'cp-icon', 'data-app': id, title: labelOf(id) },
        h('span', { class: 'cp-icon-img' }, sticker(id === 'bin' && d.bin.length ? '1f5d1-fe0f' : APPS[id].icon), id === 'bin' && d.bin.length ? h('i', { class: 'cp-bin-full' }) : null),
        h('span', { class: 'cp-icon-label' }, labelOf(id)));
      b.addEventListener('dblclick', () => { if (!small()) { selectIcon(null); openWin(id); } });
      b.addEventListener('click', () => { if (small()) openWin(id); });
      b.addEventListener('keydown', e => { if (e.key === 'Enter') openWin(id); });
      b.addEventListener('pointerdown', e => iconDown(e, b, id));
      return b;
    }));
    layoutIcons();
  }
  function layoutIcons() {
    if (!iconsEl || !deskEl) return;
    const W = deskEl.clientWidth || 600, H = (deskEl.clientHeight || 400) - (d.look === 'modern' ? 60 : 0);
    const c = CELL();
    const rows = Math.max(1, Math.floor((H - 8) / c.h));
    const taken = new Set();
    const saved = d[d.look].icons;
    const pos = {};
    const btns = [...iconsEl.children];
    for (const b of btns) {
      const p = saved[b.dataset.app];
      if (!p) continue;
      const cx = clamp(Math.round(p[0] * W / c.w), 0, Math.max(0, Math.floor((W - c.w) / c.w)));
      const cy = clamp(Math.round(p[1] * H / c.h), 0, rows - 1);
      pos[b.dataset.app] = [cx, cy];
      taken.add(cx + ':' + cy);
    }
    let slot = 0;
    for (const b of btns) {
      if (!pos[b.dataset.app]) {
        while (taken.has(Math.floor(slot / rows) + ':' + (slot % rows))) slot++;
        pos[b.dataset.app] = [Math.floor(slot / rows), slot % rows];
        taken.add(pos[b.dataset.app].join(':'));
      }
      const [cx, cy] = pos[b.dataset.app];
      b.style.left = (6 + cx * c.w) + 'px';
      b.style.top = (6 + cy * c.h) + 'px';
    }
  }
  function iconDown(e, b, id) {
    if (e.button > 0) return;
    selectIcon(id);
    closeStart();
    if (small() || !mine) return;
    const sx = e.clientX, sy = e.clientY, x0 = b.offsetLeft, y0 = b.offsetTop;
    let dragging = false;
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dragging && Math.hypot(dx, dy) < 5) return;
      dragging = true;
      b.classList.add('dragging');
      b.style.left = (x0 + dx) + 'px';
      b.style.top = (y0 + dy) + 'px';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!dragging) return;
      b.classList.remove('dragging');
      const c = CELL(), W = deskEl.clientWidth, H = deskEl.clientHeight - (d.look === 'modern' ? 60 : 0);
      const cx = clamp(Math.round((b.offsetLeft - 6) / c.w), 0, Math.max(0, Math.floor((W - c.w) / c.w)));
      const cy = clamp(Math.round((b.offsetTop - 6) / c.h), 0, Math.max(0, Math.floor((H - 8) / c.h) - 1));
      // someone already there: swap spots
      const L = d[d.look].icons;
      for (const other of iconsEl.children) {
        if (other === b) continue;
        if (Math.round((other.offsetLeft - 6) / c.w) === cx && Math.round((other.offsetTop - 6) / c.h) === cy) {
          L[other.dataset.app] = [Math.round((x0 - 6) / c.w) * c.w / W, Math.round((y0 - 6) / c.h) * c.h / H];
        }
      }
      L[id] = [cx * c.w / W, cy * c.h / H];
      save();
      layoutIcons();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ---- widgets (modern) ----
  function drawWidgets() {
    if (!widgetsEl) return;
    const now = new Date();
    const lastPic = (d.pics || []).at(-1);
    const lastDoc = [...(d.docs || [])].sort((a, b) => b.at - a.at)[0];
    const song = char.playlist[0]?.title || (d.songs || [])[0]?.title;
    fill(widgetsEl,
      h('div', { class: 'cp-wid cp-wid-clock' }, h('b', { 'data-clock': '' }, hmA().replace(/ ?[ap]m$/, '')),
        h('span', {}, now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase())),
      h('button', { type: 'button', class: 'cp-wid cp-wid-music', onclick: () => openWin('music') },
        h('div', { class: 'cp-wid-disc' }, acctPic('cp-wid-pfp')),
        h('div', { class: 'cp-wid-txt' }, h('b', {}, song || nameOf(char)), h('span', {}, song ? nameOf(char) : 'music')),
        h('div', { class: 'cp-wid-eq' }, h('i'), h('i'), h('i'), h('i'))),
      lastPic ? h('button', { type: 'button', class: 'cp-wid cp-wid-pic', onclick: () => openWin('viewer', { id: lastPic.id }) }, pic(lastPic.imageId))
        : h('div', { class: 'cp-wid cp-wid-pic empty' }, h('div', { class: 'cp-wid-frame' }, acctPic('cp-wid-frame-pic')),
          mine ? h('button', { type: 'button', class: 'cp-wid-add', onclick: () => openWin('files', { at: 'pics' }) }, 'add photo') : null),
      lastDoc ? h('button', { type: 'button', class: 'cp-wid cp-wid-note', onclick: () => openWin(lastDoc.kind === 'txt' ? 'notepad' : 'word', { id: lastDoc.id }) },
        h('b', {}, lastDoc.title || 'untitled'), h('span', {}, docText(lastDoc).slice(0, 90))) : null);
  }

  // ---- windows ----
  let nextWin = 1;
  function openWin(appId, params = {}) {
    if (state !== 'desk' || !appOk(appId)) return null;
    closeStart();
    const app = APPS[appId];
    const key = app.key ? app.key(params) : '';
    const same = wins.find(w => w.app === appId && (app.multi ? key && w.key === key : true));
    if (same) {
      if (same.min) unminimize(same);
      if (Object.keys(params).length && (!app.multi || !key)) same.go(params);
      focus(same);
      return same;
    }
    const W = deskEl.clientWidth, H = deskEl.clientHeight - (d.look === 'modern' ? 56 : 0);
    const n = wins.length;
    const w = {
      id: 'w' + nextWin++, app: appId, params, key, x: 0, y: 0, w: Math.min((d.look === 'modern' && app.wNow) || app.w || 480, W - 16), h: Math.min((d.look === 'modern' && app.hNow) || app.h || 340, H - 12), max: false, min: false, z: 0,
      cleanup: null, closers: [],
    };
    w.x = clamp(24 + (n % 6) * 26 + Math.max(0, (W - w.w) / 2 - 140), 4, Math.max(4, W - w.w - 4));
    w.y = clamp(14 + (n % 6) * 22, 4, Math.max(4, H - w.h - 4));
    const title = h('span', { class: 'cp-win-title' });
    const icon = sticker(app.icon, 'cp-win-ico');
    const body = h('div', { class: 'cp-win-body' });
    const btn = (cls, t, fn, glyph) => h('button', { type: 'button', class: 'cp-wb ' + cls, title: t, onclick: e => { e.stopPropagation(); fn(); } }, h('i', {}, glyph));
    const bar = h('div', { class: 'cp-win-bar' }, icon, title, h('div', { class: 'cp-win-btns' },
      btn('cp-wb-min', 'minimize', () => minimize(w), ''),
      btn('cp-wb-max', 'maximize', () => toggleMax(w), ''),
      btn('cp-wb-close', 'close', () => closeWin(w), '')));
    const elw = h('div', { class: 'cp-win cp-opening', 'data-app': appId, 'data-win': w.id, tabindex: -1 },
      bar, body,
      h('i', { class: 'cp-win-e' }), h('i', { class: 'cp-win-s' }), h('i', { class: 'cp-win-grip' }));
    Object.assign(w, {
      el: elw, body, bar,
      setTitle: t => { title.textContent = t; w.title = t; drawTasks(); },
      close: () => closeWin(w),
      onClose: fn => w.closers.push(fn),
      redraw: () => drawWin(w),
      go: p => { w.params = { ...p }; drawWin(w); },
      api,
    });
    elw.addEventListener('pointerdown', () => { if (active !== w) focus(w); }, true);
    bar.addEventListener('pointerdown', e => dragWin(w, e));
    bar.addEventListener('dblclick', e => { if (!e.target.closest('.cp-wb')) toggleMax(w); });
    elw.querySelector('.cp-win-grip').addEventListener('pointerdown', e => resizeWin(w, e, 'se'));
    elw.querySelector('.cp-win-e').addEventListener('pointerdown', e => resizeWin(w, e, 'e'));
    elw.querySelector('.cp-win-s').addEventListener('pointerdown', e => resizeWin(w, e, 's'));
    setTimeout(() => elw.classList.remove('cp-opening'), 260);
    wins.push(w);
    winsEl.append(elw);
    if (small()) w.max = true;
    placeWin(w);
    drawWin(w);
    focus(w);
    return w;
  }
  function drawWin(w) {
    try { w.cleanup?.(); } catch (err) { console.error(err); }
    w.cleanup = null;
    const app = APPS[w.app];
    w.setTitle(app.title ? app.title(w.params, api) : labelOf(w.app));
    let content;
    try { content = app.render(w, api); } catch (err) { console.error(err); content = h('div', { class: 'cp-oops' }, 'this program has encountered a problem'); }
    fill(w.body, content);
  }
  function placeWin(w) {
    w.el.classList.toggle('max', w.max);
    if (w.max) { w.el.style.left = w.el.style.top = w.el.style.width = w.el.style.height = ''; return; }
    w.el.style.left = w.x + 'px'; w.el.style.top = w.y + 'px';
    w.el.style.width = w.w + 'px'; w.el.style.height = w.h + 'px';
  }
  function focus(w) {
    if (!w) return;
    w.z = ++zTop;
    w.el.style.zIndex = w.z;
    active = w;
    wins.forEach(x => x.el.classList.toggle('active', x === w));
    drawTasks();
    w.onFocus?.();
  }
  function focusTop() { const top = wins.filter(x => !x.min).sort((a, b) => b.z - a.z)[0]; if (top) focus(top); else { active = null; wins.forEach(x => x.el.classList.remove('active')); drawTasks(); } }
  function closeWin(w) {
    try { w.cleanup?.(); } catch (err) { console.error(err); }
    w.closers.forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
    const i = wins.indexOf(w);
    if (i < 0) return;
    wins.splice(i, 1);
    w.el.classList.add('cp-closing');
    setTimeout(() => w.el.remove(), 160);
    if (active === w) focusTop(); else drawTasks();
  }
  function closeAll() { [...wins].forEach(w => { try { w.cleanup?.(); } catch {} w.closers.forEach(fn => { try { fn(); } catch {} }); w.el.remove(); }); wins.length = 0; active = null; }
  function minimize(w) {
    w.min = true;
    w.el.classList.add('min');
    if (active === w) focusTop(); else drawTasks();
  }
  function unminimize(w) { w.min = false; w.el.classList.remove('min'); }
  function toggleMax(w) {
    if (small() && w.max) return;
    w.max = !w.max;
    placeWin(w);
    w.onResize?.();
  }
  function taskClick(w) {
    if (w.min) { unminimize(w); focus(w); } else if (active === w) minimize(w); else focus(w);
  }
  function dragWin(w, e) {
    if (e.button > 0 || e.target.closest('.cp-wb') || w.max || small()) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, x0 = w.x, y0 = w.y;
    const W = deskEl.clientWidth, H = deskEl.clientHeight;
    w.el.classList.add('moving');
    const move = ev => { w.x = clamp(x0 + ev.clientX - sx, 60 - w.w, W - 60); w.y = clamp(y0 + ev.clientY - sy, 0, H - 28); placeWin(w); };
    const up = () => { w.el.classList.remove('moving'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function resizeWin(w, e, dir) {
    if (e.button > 0 || w.max || small()) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, w0 = w.w, h0 = w.h;
    const app = APPS[w.app];
    w.el.classList.add('moving');
    const move = ev => {
      if (dir !== 's') w.w = Math.max(app.minW || 240, w0 + ev.clientX - sx);
      if (dir !== 'e') w.h = Math.max(app.minH || 150, h0 + ev.clientY - sy);
      placeWin(w);
      w.onResize?.();
    };
    const up = () => { w.el.classList.remove('moving'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function drawTasks() {
    if (!tasksEl) return;
    fill(tasksEl, d.look === 'y2k' ? wins.map(w => h('button', {
      type: 'button', class: 'cp-task' + (active === w && !w.min ? ' on' : ''), 'data-win': w.id, title: w.title,
      onclick: () => taskClick(w),
    }, sticker(APPS[w.app].icon, 'cp-task-ico'), h('span', {}, w.title))) : null);
    layer.querySelectorAll('.cp-dock-btn').forEach(b => {
      const open = wins.filter(w => w.app === b.dataset.app);
      b.classList.toggle('open', open.length > 0);
      b.classList.toggle('on', open.some(w => w === active && !w.min));
    });
    if (d.look === 'modern' && tasksEl) {
      // windows of apps that aren't pinned still get a spot
      fill(tasksEl, wins.filter(w => !DOCK.includes(w.app)).map(w => h('button', {
        type: 'button', class: 'cp-dock-btn open' + (active === w && !w.min ? ' on' : ''), 'data-win': w.id, title: w.title, onclick: () => taskClick(w),
      }, sticker(APPS[w.app].icon), h('i', { class: 'cp-dock-dot' }))));
    }
  }
  function refreshAll() { wins.forEach(w => drawWin(w)); drawWidgets(); }
  function refresh(appId) {
    const group = ['files', 'pics', 'bin'].includes(appId) ? ['files', 'pics', 'bin'] : [appId];
    wins.filter(w => group.includes(w.app)).forEach(w => drawWin(w));
    if (group.includes('bin')) drawIcons();
    drawWidgets();
  }

  // ---- the start menu ----
  function closeStart() { if (startEl && !startEl.hidden) { startEl.hidden = true; layer.querySelector('.cp-start')?.classList.remove('on'); } }
  function toggleStart() {
    if (!startEl.hidden) { closeStart(); return; }
    layer.querySelector('.cp-start')?.classList.add('on');
    startEl.hidden = false;
    const item = (id, cls = '') => appOk(id) ? h('button', { type: 'button', class: 'cp-sm-item ' + cls, 'data-app': id, onclick: () => openWin(id) }, sticker(APPS[id].icon, 'cp-sm-ico'), h('span', {}, labelOf(id))) : null;
    if (d.look === 'y2k') {
      let all = false;
      const left = h('div', { class: 'cp-sm-left' });
      const drawLeft = () => fill(left,
        all ? Object.keys(APPS).filter(id => appOk(id) && !APPS[id].hidden).map(id => item(id))
          : [item('browser', 'big'), item('mail', 'big'), h('hr'), ...['im', 'music', 'paint', 'word', 'notepad', 'games', 'webcam'].map(id => item(id))],
        h('hr'),
        h('button', { type: 'button', class: 'cp-sm-all', onclick: e => { e.stopPropagation(); all = !all; drawLeft(); } }, all ? 'back' : 'all programs', h('i', { class: 'cp-sm-arrow' + (all ? ' back' : '') })));
      drawLeft();
      fill(startEl,
        h('div', { class: 'cp-sm-head' }, acctPic('cp-sm-pfp'), h('b', {}, nameOf(char))),
        h('div', { class: 'cp-sm-cols' },
          left,
          h('div', { class: 'cp-sm-right' },
            place('files', 'my documents', { at: 'docs' }, '1f4c1'),
            place('files', 'my pictures', { at: 'pics' }, '1f5bc-fe0f'),
            place('files', 'my music', { at: 'music' }, '1f3b5'),
            h('hr'),
            item('settings'), item('bin'))),
        h('div', { class: 'cp-sm-foot' },
          h('button', { type: 'button', class: 'cp-sm-logoff', onclick: () => { closeStart(); setState('login'); } }, h('i', { class: 'cp-key-ico' }), 'log off'),
          h('button', { type: 'button', class: 'cp-sm-off', onclick: () => { closeStart(); shutDownBox(); } }, h('i', { class: 'cp-off-ico' }), 'turn off computer')));
    } else {
      const q = h('input', { type: 'search', class: 'cp-sm-search', placeholder: 'search', oninput: () => drawGrid() });
      const grid = h('div', { class: 'cp-sm-grid' });
      const drawGrid = () => fill(grid, Object.keys(APPS).filter(id => appOk(id) && !APPS[id].hidden && labelOf(id).includes(q.value.trim().toLowerCase())).map(id => item(id)));
      drawGrid();
      const recent = [...(d.docs || [])].sort((a, b) => b.at - a.at).slice(0, 3);
      fill(startEl,
        q,
        h('div', { class: 'cp-sm-label' }, 'pinned'),
        grid,
        recent.length ? [h('div', { class: 'cp-sm-label' }, 'recent'), h('div', { class: 'cp-sm-recent' }, recent.map(doc => h('button', { type: 'button', class: 'cp-sm-doc', onclick: () => openWin(doc.kind === 'txt' ? 'notepad' : 'word', { id: doc.id }) }, sticker(doc.kind === 'txt' ? '1f4dd' : '1f4c4', 'cp-sm-ico'), h('span', {}, doc.title || 'untitled'))))] : null,
        h('div', { class: 'cp-sm-foot' },
          h('div', { class: 'cp-sm-me' }, acctPic('cp-sm-pfp'), h('b', {}, nameOf(char))),
          h('button', { type: 'button', class: 'cp-sm-lock', title: 'lock', onclick: () => { closeStart(); setState('login'); } }, lockIco()),
          h('button', { type: 'button', class: 'cp-sm-off', title: 'power', onclick: () => { closeStart(); shutDownBox(); } }, h('i', { class: 'cp-off-ico' }))));
    }
    function place(id, label, params, icon) {
      return h('button', { type: 'button', class: 'cp-sm-item', onclick: () => openWin(id, params) }, sticker(icon, 'cp-sm-ico'), h('span', {}, label));
    }
  }
  el.addEventListener('pointerdown', e => { if (startEl && !startEl.hidden && !e.target.closest('.cp-start-menu, .cp-start')) closeStart(); });

  // ---- turning it off ----
  function shutDownBox() {
    if (state !== 'desk') return;
    const pick = fn => { box.remove(); screen.classList.remove('grey'); fn(); };
    const box = h('div', { class: 'cp-off-box-wrap' }, h('div', { class: 'cp-off-box' },
      h('div', { class: 'cp-off-head' }, h('b', {}, d.look === 'y2k' ? 'turn off computer' : 'power'), d.look === 'y2k' ? logo() : null),
      h('div', { class: 'cp-off-btns' },
        h('button', { type: 'button', class: 'cp-off-b cp-ob-sleep', onclick: () => pick(() => startSaver(true)) }, h('i'), d.look === 'y2k' ? 'stand by' : 'sleep'),
        h('button', { type: 'button', class: 'cp-off-b cp-ob-off', onclick: () => pick(() => shutDown()) }, h('i'), d.look === 'y2k' ? 'turn off' : 'shut down'),
        h('button', { type: 'button', class: 'cp-off-b cp-ob-restart', onclick: () => pick(() => { shutDown(true); }) }, h('i'), 'restart')),
      h('div', { class: 'cp-off-foot' }, h('button', { type: 'button', class: 'cp-off-cancel', onclick: () => pick(() => {}) }, 'cancel'))));
    screen.classList.add('grey');
    screen.append(box);
  }
  function shutDown(restart = false) {
    closeAll();
    fill(layer, h('div', { class: 'cp-bye' }, d.look === 'y2k' ? [logo('big'), h('span', {}, restart ? 'restarting...' : 'shutting down...')] : [h('div', { class: 'cp-spin' }, Array.from({ length: 6 }, () => h('i')))]));
    state = 'bye';
    paintScreen();
    setTimeout(() => {
      if (state !== 'bye') return;
      if (restart) { setState('boot'); return; }
      screen.classList.add('cp-crt-off');
      setTimeout(() => { screen.classList.remove('cp-crt-off'); if (state === 'bye') setState('off'); }, 520);
    }, 1300);
  }

  // ---- popups: balloons (y2k) / toasts (modern) + the error ding ----
  function notify(title, text, onClick, icon = '1f4ac') {
    if (state !== 'desk' || !notesEl) return;
    notesEl.querySelectorAll('.cp-note').forEach(n => n.remove());
    const n = h('div', { class: 'cp-note', onclick: e => { if (e.target.closest('.cp-note-x')) return; n.remove(); onClick?.(); } },
      sticker(icon, 'cp-note-ico'),
      h('div', { class: 'cp-note-txt' }, h('b', {}, title), h('span', {}, text)),
      h('button', { type: 'button', class: 'cp-note-x', title: 'close', onclick: () => n.remove() }, '✕'));
    notesEl.append(n);
    setTimeout(() => n.classList.add('out'), 6500);
    setTimeout(() => n.remove(), 7000);
  }
  function ding() {
    screen.classList.remove('ding'); void screen.offsetWidth; screen.classList.add('ding');
    setTimeout(() => screen.classList.remove('ding'), 500);
  }
  // a little error / message box inside the computer. resolves true if they hit the first button
  function dialog(text, { title = 'error', kind = 'error', buttons = ['ok'] } = {}) {
    return new Promise(resolve => {
      const host = deskEl || screen;
      const done = v => { wrap.remove(); resolve(v); };
      const wrap = h('div', { class: 'cp-dlg-wrap' }, h('div', { class: 'cp-dlg cp-win active', role: 'dialog' },
        h('div', { class: 'cp-win-bar' }, h('span', { class: 'cp-win-title' }, title), h('div', { class: 'cp-win-btns' }, h('button', { type: 'button', class: 'cp-wb cp-wb-close', title: 'close', onclick: () => done(false) }, h('i')))),
        h('div', { class: 'cp-dlg-body' }, h('i', { class: 'cp-dlg-ico ' + kind }), h('p', {}, text)),
        h('div', { class: 'cp-dlg-btns' }, buttons.map((b, i) => h('button', { type: 'button', class: 'cp-btn' + (i === 0 ? ' primary' : ''), onclick: () => done(i === 0) }, b)))));
      host.append(wrap);
      if (kind === 'error') ding();
      requestAnimationFrame(() => wrap.querySelector('.cp-btn')?.focus());
    });
  }
  const ask = (text, ok = 'yes', title = 'confirm') => dialog(text, { title, kind: 'ask', buttons: [ok, 'no'] });

  // things waiting when you log in (new ims mirrored in from a worldmate, new mail)
  function newsOnLogin() {
    const n = EXTRA.flatMap(m => { try { return m.news?.(api) || []; } catch (err) { console.error(err); return []; } })[0];
    if (n) notify(n.title, n.text, n.open, n.icon);
  }

  // ---- screen saver ----
  let lastMove = Date.now(), saver = null;
  const poke = () => { lastMove = Date.now(); if (saver && Date.now() - saver.at > 400) stopSaver(); };
  ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(t => el.addEventListener(t, poke, { passive: true }));
  timers.push(setInterval(() => {
    if (state === 'desk' && !saver && d.saver.kind !== 'off' && Date.now() - lastMove > (d.saver.wait || 120) * 1000) startSaver();
  }, 1000));
  function startSaver(force = false) {
    if (saver || (!force && d.saver.kind === 'off')) return;
    const kind = d.saver.kind === 'off' ? 'stars' : d.saver.kind;
    const cv = h('canvas', { class: 'cp-saver' });
    screen.append(cv);
    saver = { cv, at: Date.now(), raf: 0 };
    runSaver(saver, kind, d.saver.text || nameOf(char), d.look);
  }
  function stopSaver() { if (!saver) return; cancelAnimationFrame(saver.raf); saver.cv.remove(); saver = null; }

  // ---- the frame box (monitor / laptop color + stickers) ----
  function frameBox() {
    const draw = () => {
      const f = d.frame[d.look];
      fill(colors, swatches(f.color, v => { f.color = v; save(); buildDevice(); }, d.look === 'modern' ? LAPTOP_COLORS : f.kind === 'imac' ? CANDY_COLORS : CRT_COLORS));
    };
    const colors = h('div');
    let tab = STICKER_TABS[0][0];
    const tabs = h('div', { class: 'stk-tabs cp-stk-tabs' });
    const grid = h('div', { class: 'stk-grid cp-stk-grid' });
    const drawStk = () => {
      fill(tabs, STICKER_TABS.map(([name, icon]) => h('button', { type: 'button', class: 'stk-tab' + (name === tab ? ' on' : ''), title: name, onclick: () => { tab = name; drawStk(); } }, h('span', { class: 'stk-tab-icon' }, stickerNode(icon)))));
      fill(grid, STICKER_TABS.find(x => x[0] === tab)[2].map(id => h('button', {
        type: 'button', class: 'stk-cell', onclick: () => {
          const f = d.frame[d.look];
          // y2k: somewhere on the bezel. modern: anywhere on the lid
          const spot = d.look === 'y2k'
            ? [[8 + Math.random() * 84, 89 + Math.random() * 6], [3 + Math.random() * 2.5, 12 + Math.random() * 70], [95 + Math.random() * 2.5, 12 + Math.random() * 70]][Math.floor(Math.random() * 3)]
            : [16 + Math.random() * 68, 14 + Math.random() * 70];
          f.stickers.push({ id: uid(), sid: id, x: spot[0], y: spot[1], r: Math.round(Math.random() * 40 - 20), k: d.look === 'y2k' ? 0.42 + Math.random() * 0.2 : 0.7 + Math.random() * 0.4 });
          save();
          if (d.look === 'modern' && !lidShut) flipLid();
          drawStickers();
        },
      }, stickerNode(id))));
    };
    draw(); drawStk();
    const sec = (label, ...kids) => h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), ...kids);
    openModal({
      title: d.look === 'y2k' ? 'monitor' : 'laptop', wide: true,
      body: h('div', { class: 'cp-frame-box' },
        d.look === 'y2k' ? sec('monitor', segmented([{ value: 'crt', label: 'crt' }, { value: 'imac', label: 'candy' }], d.frame.y2k.kind, v => {
          const f = d.frame.y2k; f.kind = v; f.color = v === 'imac' ? CANDY_COLORS[0] : CRT_COLORS[0]; save(); buildDevice(); draw();
        })) : null,
        sec('color', colors),
        sec(d.look === 'y2k' ? 'stickers on the monitor' : 'stickers on the lid', tabs, grid)),
      actions: [
        { label: 'peel off stickers', kind: 'ghost', onClick: () => { d.frame[d.look].stickers = []; save(); drawStickers(); } },
        { label: 'done', kind: 'primary', onClick: close => close() },
      ],
    });
  }
  function flipLid() {
    lidShut = !lidShut;
    device.classList.toggle('shut', lidShut);
    lidBtn.textContent = lidShut ? 'open lid' : 'close lid';
  }

  // ---- switching looks: the open windows come along ----
  const pendingReopen = [];
  function setLook(look) {
    if (look === d.look) return;
    const open = wins.map(w => ({ app: w.app, params: w.params, max: w.max })).filter(w => !APPS[w.app].only || APPS[w.app].only === look);
    d.look = look;
    save();
    lidShut = false;
    buildDevice();
    drawBar();
    if (state === 'desk') { closeAll(); pendingReopen.push(...open); setState('desk'); } else setState(state === 'off' ? 'off' : state === 'boot' ? 'boot' : 'login');
  }

  // ---- api for the apps ----
  const myRef = { id: char.id, name: nameOf(char) };
  const LISTS = { doc: 'docs', pic: 'pics', site: 'sites', mail: 'mail', song: 'songs' };
  const api = {
    char, mine, d, save, ctx, APPS, me: myRef,
    get look() { return d.look; },
    get wins() { return wins; },
    open: openWin, refresh, refreshAll, notify, ding, dialog, ask, labelOf,
    small, acctPic, setLook, paintScreen,
    desk: () => deskEl,
    onTick: fn => { ticks.add(fn); return () => ticks.delete(fn); },
    redrawDesk: () => { if (state === 'desk') { wallRedraw(); drawIcons(); drawWidgets(); } },
    startSaver: () => startSaver(true),
    // the recycle bin: things go here first
    toBin(kind, item) {
      const list = d[LISTS[kind]];
      const i = list.indexOf(item);
      if (i >= 0) list.splice(i, 1);
      d.bin.push({ id: 'r_' + uid(), kind, item, at: Date.now() });
      save();
      refresh('bin'); refresh('files');
    },
    restore(entry) {
      d.bin = d.bin.filter(x => x !== entry);
      d[LISTS[entry.kind]].push(entry.item);
      save();
      refresh('bin'); refresh('files');
    },
    forget(entry) {
      d.bin = d.bin.filter(x => x !== entry);
      dropImage(entry.item?.imageId);
      save();
      refresh('bin'); refresh('files');
    },
  };
  function wallRedraw() { const old = deskEl?.querySelector('.cp-wall'); if (old) old.replaceWith(wallEl()); }

  EXTRA.forEach(m => { try { m.install?.(api); } catch (err) { console.error(err); } });

  // ---- the bar above it ----
  const lookSeg = h('div', { class: 'cp-look-seg' });
  const lidBtn = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => flipLid() }, 'close lid');
  function drawBar() {
    fill(lookSeg, segmented(LOOKS.map(([value, label]) => ({ value, label })), d.look, v => { if (mine) setLook(v); else { toast("this isn't your oc"); drawBar(); } }));
    lidBtn.hidden = d.look !== 'modern';
    lidBtn.textContent = lidShut ? 'open lid' : 'close lid';
  }
  drawBar();

  // resizing the page: icons find their spots again, windows stay reachable
  const ro = new ResizeObserver(() => {
    if (state !== 'desk' || !deskEl) return;
    layoutIcons();
    const W = deskEl.clientWidth, H = deskEl.clientHeight;
    for (const w of wins) {
      if (small() && !w.max) { w.max = true; placeWin(w); }
      else if (!w.max) { w.x = clamp(w.x, 60 - w.w, W - 60); w.y = clamp(w.y, 0, H - 28); placeWin(w); }
      w.onResize?.();
    }
  });
  ro.observe(screen);
  cleanups.push(() => ro.disconnect());
  // the glitter cursor leaves sparkles
  cleanups.push(sparkleTrail(screen, () => d.look === 'y2k' && d.y2k.cursor === 'glitter' && state === 'desk'));

  buildDevice();
  el.append(
    appBar(ctx, meta, lookSeg, lidBtn, mine ? h('button', { type: 'button', class: 'btn sm', onclick: frameBox }, d.look === 'y2k' ? 'monitor' : 'laptop') : null),
    stage);
  // the frame button's name follows the look
  const frameBtn = el.querySelector('.fun-bar-right .btn.sm:last-child');
  const syncFrameBtn = () => { if (frameBtn && mine) frameBtn.textContent = d.look === 'y2k' ? 'monitor' : 'laptop'; };
  const oldSetLook = api.setLook;
  api.setLook = v => { oldSetLook(v); syncFrameBtn(); drawBar(); };
  lookSeg.addEventListener('click', () => setTimeout(syncFrameBtn, 0));

  if (awake.has(char.id)) setState('desk'); else setState('boot');

  return () => {
    timers.forEach(clearInterval);
    stopSaver();
    closeAll();
    cleanups.forEach(f => { try { f?.(); } catch {} });
  };
}

// ---- little drawings ----
const speakerIco = () => s('svg', { viewBox: '0 0 16 16', class: 'cp-svg' }, s('path', { d: 'M2 6h3l4-3v10l-4-3H2z', fill: 'currentColor' }), s('path', { d: 'M11 5.5a3.5 3.5 0 0 1 0 5M12.6 3.8a6 6 0 0 1 0 8.4', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
const wifiIco = () => s('svg', { viewBox: '0 0 16 12', class: 'cp-svg' },
  s('path', { d: 'M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0Z', fill: 'currentColor' }),
  s('path', { d: 'M3.4 6.8a6.6 6.6 0 0 1 9.2 0l-1.4 1.4a4.6 4.6 0 0 0-6.4 0Z', fill: 'currentColor' }),
  s('path', { d: 'M1.1 4.5a9.9 9.9 0 0 1 13.8 0l-1.4 1.4a7.9 7.9 0 0 0-11 0Z', fill: 'currentColor' }));
const lockIco = () => s('svg', { viewBox: '0 0 20 22', class: 'cp-svg' }, s('path', { d: 'M5 10V7a5 5 0 0 1 10 0v3', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }), s('rect', { x: 2.5, y: 10, width: 15, height: 11, rx: 3, fill: 'currentColor' }));

// ---- screen savers ----
function runSaver(sv, kind, text, look) {
  const cv = sv.cv;
  const fit = () => { cv.width = cv.clientWidth || 640; cv.height = cv.clientHeight || 480; };
  fit();
  const g = cv.getContext('2d');
  const W = () => cv.width, H = () => cv.height;
  g.fillStyle = '#000'; g.fillRect(0, 0, W(), H());
  let step;
  if (kind === 'stars') {
    const stars = Array.from({ length: 220 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
    step = () => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W(), H());
      for (const st of stars) {
        st.z -= 0.008;
        if (st.z <= 0.02) { st.x = (Math.random() - 0.5) * 2; st.y = (Math.random() - 0.5) * 2; st.z = 1; }
        const px = W() / 2 + (st.x / st.z) * W() * 0.35, py = H() / 2 + (st.y / st.z) * H() * 0.35;
        const r = Math.max(0.4, (1 - st.z) * 2.6);
        g.fillStyle = `rgba(255,255,255,${1 - st.z})`;
        g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
      }
    };
  } else if (kind === 'pipes') {
    const C = 22;
    const cols = ['#e33', '#3c3', '#36f', '#ee3', '#e3e', '#3ee', '#f80', '#fff'];
    let p = null, n = 0;
    const fresh = () => ({ x: Math.floor(Math.random() * W() / C), y: Math.floor(Math.random() * H() / C), dx: 1, dy: 0, c: cols[Math.floor(Math.random() * cols.length)], len: 0 });
    p = fresh();
    const joint = (x, y, c) => { const gr = g.createRadialGradient(x - 3, y - 3, 1, x, y, 9); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, c); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); };
    step = () => {
      for (let k = 0; k < 2; k++) {
        if (Math.random() < 0.25) { const turn = Math.random() < 0.5; [p.dx, p.dy] = p.dx ? [0, turn ? 1 : -1] : [turn ? 1 : -1, 0]; joint(p.x * C, p.y * C, p.c); }
        const nx = p.x + p.dx, ny = p.y + p.dy;
        if (nx < 0 || ny < 0 || nx * C > W() || ny * C > H() || p.len > 60) { joint(p.x * C, p.y * C, p.c); p = fresh(); if (++n > 14) { g.fillStyle = '#000'; g.fillRect(0, 0, W(), H()); n = 0; } continue; }
        const x0 = p.x * C, y0 = p.y * C, x1 = nx * C, y1 = ny * C;
        const gr = p.dx ? g.createLinearGradient(0, y0 - 6, 0, y0 + 6) : g.createLinearGradient(x0 - 6, 0, x0 + 6, 0);
        gr.addColorStop(0, '#000'); gr.addColorStop(0.4, p.c); gr.addColorStop(0.55, '#fff'); gr.addColorStop(0.7, p.c); gr.addColorStop(1, '#000');
        g.fillStyle = gr;
        g.fillRect(Math.min(x0, x1) - (p.dy ? 6 : 0), Math.min(y0, y1) - (p.dx ? 6 : 0), Math.abs(x1 - x0) + (p.dy ? 12 : 0), Math.abs(y1 - y0) + (p.dx ? 12 : 0));
        p.x = nx; p.y = ny; p.len++;
      }
    };
  } else {
    // flying text: bounces around, changing color like the old marquee saver
    let x = 40, y = 60, vx = 1.6, vy = 1.2, hue = 300, t = 0;
    step = () => {
      g.fillStyle = look === 'y2k' ? 'rgba(0,0,0,.25)' : 'rgba(10,6,20,.3)'; g.fillRect(0, 0, W(), H());
      const size = Math.max(22, Math.min(64, W() / 10));
      g.font = `bold ${size}px ${look === 'y2k' ? "'Comic Sans MS', 'Trebuchet MS', sans-serif" : "'Fredoka', sans-serif"}`;
      const tw = g.measureText(text).width;
      x += vx; y += vy; t += 0.04; hue = (hue + 1.2) % 360;
      if (x < 0 || x + tw > W()) vx *= -1;
      if (y - size < 0 || y > H()) vy *= -1;
      x = clamp(x, 0, Math.max(0, W() - tw)); y = clamp(y, size, H());
      const sk = Math.sin(t) * 0.25;
      g.save(); g.translate(x + tw / 2, y - size / 2); g.transform(1, 0, sk, 1, 0, 0);
      for (let i = 6; i > 0; i--) { g.fillStyle = `hsl(${hue},90%,${18 + i * 4}%)`; g.fillText(text, -tw / 2 + i, size / 2 + i); }
      g.fillStyle = `hsl(${hue},100%,70%)`; g.fillText(text, -tw / 2, size / 2);
      g.restore();
    };
  }
  const loop = () => { if (!cv.isConnected) return; if (cv.width !== cv.clientWidth && cv.clientWidth) fit(); step(); sv.raf = requestAnimationFrame(loop); };
  sv.raf = requestAnimationFrame(loop);
}
