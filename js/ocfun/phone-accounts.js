// accounts on the phone's apps: an oc signs up on tiktok, discord, gmail... with a username, a name,
// a picture + a bio, and can have more than one (main + spam). saved on the phone's data:
//
//   d.accounts = { [appId]: { list: [{ id, handle, name, bio, imageId, at, out? }], active: id } }
//
// while an app's screen is open (ctx.app), who()/face() in phone-bits and the apps' own portrait()/nameOf()
// show people as their account on that app: a ref with .acct = that account, otherwise the oc's first one.
// the oc themself (portrait(char)) = whichever account is switched on right now.
//
// snapshot (insta) is special: its first account IS the socials app's profile (char.fun.social),
// any extra account keeps its own profile + posts on the account (acct.sd).

import { h, fill, uid, openModal, confirmDialog, toast } from '../ui.js';
import { store } from '../store.js';
import { portrait as rawPortrait, nameOf as rawNameOf, sticker } from './kit.js';
import { addPhotos } from './phone-bits.js';

// kind: what the username looks like. key: the app's own saved data (to tell if it was used before accounts existed)
export const ACCT = {
  insta: { key: 'insta', pre: '@', bg: '#fff', ink: '#000', btn: '#0095f6' },
  pinterest: { key: 'pinterest', pre: '@', bg: '#fff', ink: '#111', btn: '#e60023' },
  discord: { key: 'discord', pre: '', bg: '#313338', ink: '#f2f3f5', btn: '#5865f2', field: '#1e1f22' },
  facebook: { key: 'facebook', pre: '', bg: '#f0f2f5', ink: '#1c1e21', btn: '#0866ff', noHandle: true },
  snapchat: { key: 'snapchat', pre: '', bg: '#fffc00', ink: '#000', btn: '#0eadff' },
  whatsapp: { key: 'whatsapp', kind: 'phone', bg: '#fff', ink: '#111b21', btn: '#25d366', bioLabel: 'about' },
  bereal: { key: 'bereal', pre: '@', bg: '#000', ink: '#fff', btn: '#fff', btnInk: '#000', field: '#1c1c1e' },
  threads: { key: 'threadsapp', pre: '@', bg: '#fff', ink: '#000', btn: '#000' },
  tiktok: { key: 'tiktok', pre: '@', bg: '#fff', ink: '#161823', btn: '#fe2c55' },
  youtube: { key: 'youtube', pre: '@', bg: '#fff', ink: '#0f0f0f', btn: '#065fd4', nameLabel: 'channel name', bioLabel: 'description' },
  twitter: { key: 'twitter', pre: '@', bg: '#000', ink: '#e7e9ea', btn: '#1d9bf0', field: '#16181c' },
  tumblr: { key: 'tumblr', pre: '', post: '.tumblr.com', bg: '#001935', ink: '#fff', btn: '#00b8ff', btnInk: '#001935', field: '#0b2a4a', handleLabel: 'blog name', nameLabel: 'title', bioLabel: 'description' },
  reddit: { key: 'reddit', pre: 'u/', bg: '#fff', ink: '#1c1c1c', btn: '#ff4500' },
  twitch: { key: 'twitch', pre: '', bg: '#0e0e10', ink: '#efeff1', btn: '#9147ff', field: '#18181b' },
  spotify: { key: 'spotify', pre: '', bg: '#121212', ink: '#fff', btn: '#1ed760', btnInk: '#000', field: '#2a2a2a', noHandle: true },
  netflix: { key: 'netflix', kind: 'email', post: '@email.com', bg: '#000', ink: '#fff', btn: '#e50914', field: '#333', noBio: true },
  roblox: { key: 'roblox', pre: '@', bg: '#232527', ink: '#fff', btn: '#335fff', field: '#393b3d', nameLabel: 'display name' },
  duolingo: { key: 'duo', pre: '@', bg: '#fff', ink: '#4b4b4b', btn: '#58cc02' },
  gmail: { key: 'gmail', kind: 'email', post: '@gmail.com', bg: '#fff', ink: '#1f1f1f', btn: '#0b57d0', noBio: true },
  venmo: { key: 'venmo', pre: '@', bg: '#fff', ink: '#2f3033', btn: '#008cff' },
  minecraft: { key: 'mc', pre: '', bg: '#3b2a1d', ink: '#fff', btn: '#3c8527', field: '#1e1e1e', handleLabel: 'gamertag', noBio: true },
};

// which app's screen is open right now (set by phone.js on every screen change)
export const ctx = { app: null };
export const setApp = name => { ctx.app = ACCT[name] ? name : null; };

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9._]+/g, '_').replace(/^[_.]+|[_.]+$/g, '').slice(0, 30);
const digits = () => `+1 (555) ${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`;
export const defaultHandle = (c, app) => (ACCT[app]?.kind === 'phone' ? digits() : slug(rawNameOf(c)).replace(/\./g, '_') || 'oc');
export function shownHandle(app, a) {
  const cfg = ACCT[app] || {};
  if (!a) return '';
  if (cfg.noHandle) return a.name;
  return (cfg.pre || '') + a.handle + (cfg.post || '');
}

// ---- reading ----
const rawRec = (c, app) => { const r = c?.fun?.phone?.accounts?.[app]; return r && Array.isArray(r.list) ? r : null; };
const SD_DEF = { handle: '', display: '', bio: '', link: '', followers: 87, following: 140, verified: false, posts: [], highlights: [], pinned: null };
function instaView(c, a, i) {
  const sd = i === 0 ? (c.fun?.social || {}) : (a.sd || {});
  return { ...a, handle: sd.handle || a.handle || slug(rawNameOf(c)), name: sd.display || a.name || rawNameOf(c), bio: sd.bio ?? a.bio ?? '' };
}
export function listOf(c, app) {
  const r = rawRec(c, app);
  if (!r) return [];
  return app === 'insta' ? r.list.map((a, i) => instaView(c, a, i)) : r.list;
}
export const liveList = (c, app) => listOf(c, app).filter(a => !a.out);
export function activeOf(c, app) {
  const r = rawRec(c, app);
  if (!r) return null;
  const list = listOf(c, app);
  return list.find(a => a.id === r.active && !a.out) || list.find(a => !a.out) || null;
}
// the account a piece of content was made with (its ref.acct), or the oc's first one
export function acctOfRef(ref, app) {
  if (!ref?.id || !app) return null;
  const c = store.char(ref.id);
  if (!c) return null;
  const list = listOf(c, app);
  return (ref.acct && list.find(a => a.id === ref.acct)) || list[0] || null;
}
// how an oc reads on the open app: their switched-on account's name + picture
export function viewChar(c) {
  if (!ctx.app || !c?.id) return c;
  const a = activeOf(c, ctx.app);
  return a ? { ...c, name: a.name || c.name, imageId: a.imageId || c.imageId, handle: a.handle } : c;
}
export const portrait = (c, cls) => rawPortrait(viewChar(c), cls);
export const nameOf = c => rawNameOf(viewChar(c));
// the id of the account new stuff gets made with
export const acctId = c => (ctx.app ? activeOf(c, ctx.app)?.id : undefined);
// snapshot: the profile of the switched-on extra account (null = the main one, char.fun.social)
export function instaSd(c) {
  const r = rawRec(c, 'insta');
  if (!r) return null;
  const i = r.list.findIndex(a => a.id === r.active && !a.out);
  if (i <= 0) return null;
  const a = r.list[i];
  a.sd ||= structuredClone(SD_DEF);
  for (const [k, v] of Object.entries(SD_DEF)) if (!(k in a.sd)) a.sd[k] = structuredClone(v);
  return a.sd;
}

// ---- writing ----
function recFor(d, app) {
  d.accounts ||= {};
  const r = d.accounts[app] ||= { list: [], active: null };
  r.list ||= [];
  return r;
}
function writeInsta(c, a, i, f) {
  let sd;
  if (i === 0) {
    c.fun ||= {};
    sd = c.fun.social ||= {};
  } else sd = a.sd ||= structuredClone(SD_DEF);
  if (f.handle != null) sd.handle = f.handle;
  if (f.name != null) sd.display = f.name;
  if (f.bio != null) sd.bio = f.bio;
}
export function addAccount(api, app, f) {
  const r = recFor(api.d, app);
  const a = { id: 'a_' + uid(), handle: f.handle || '', name: f.name || '', bio: f.bio || '', imageId: f.imageId || null, at: Date.now() };
  r.list.push(a);
  r.active = a.id;
  if (app === 'insta') writeInsta(api.char, a, r.list.length - 1, a);
  // apps with their own bio box start with the sign up bio
  const bioKey = { tiktok: 'tiktok', twitter: 'twitter', threads: 'threadsapp', facebook: 'facebook' }[app];
  if (bioKey && a.bio && api.d[bioKey] && !api.d[bioKey].bio) api.d[bioKey].bio = a.bio;
  api.save();
  return a;
}
export function updateAccount(api, app, id, f) {
  const r = recFor(api.d, app);
  const i = r.list.findIndex(a => a.id === id);
  if (i < 0) return;
  Object.assign(r.list[i], f);
  if (app === 'insta') writeInsta(api.char, r.list[i], i, f);
  api.save();
}
const autoAccount = (api, app) => addAccount(api, app, { handle: defaultHandle(api.char, app), name: rawNameOf(api.char), bio: '' });

// ---- the sign up wall in front of every account app ----
// used(app) = that app has saved stuff from before accounts existed (they get an account made for them instead)
export function gateScreens(api, used) {
  const { SCREENS } = api;
  const adding = new Set();
  api.addAccount = app => { adding.add(app); api.show(app, {}, 'push'); };
  for (const app of Object.keys(ACCT)) {
    const orig = SCREENS[app];
    if (!orig) continue;
    SCREENS[app] = (params, view) => {
      if (api.mine && !adding.has(app) && !liveList(api.char, app).length) {
        const fresh = !rawRec(api.char, app)?.list.length;
        if (fresh && (used(app) || window.__autoAccount)) autoAccount(api, app);
      }
      if (api.mine && (adding.has(app) || !liveList(api.char, app).length)) {
        return signup(api, app, () => { adding.delete(app); api.show(app, params, 'push'); }, adding.has(app) && liveList(api.char, app).length ? () => { adding.delete(app); api.show(app, params, 'pop'); } : null);
      }
      return orig(params, view);
    };
  }
}

const isDark = hex => { const x = hex.slice(1), n = parseInt(x.length === 3 ? [...x].map(c => c + c).join('') : x, 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 < 140; };
function brandTop(api, app) {
  const a = api.APPS[app];
  return h('div', { class: 'pacc-brand' },
    h('span', { class: 'pacc-icon', style: { background: a.bg } }, sticker(a.icon)),
    h('b', { class: 'pacc-word' }, a.label));
}
function styleOf(app) {
  const c = ACCT[app];
  return { '--pa-bg': c.bg, '--pa-ink': c.ink, '--pa-btn': c.btn, '--pa-btn-ink': c.btnInk || '#fff', '--pa-field': c.field || 'rgba(127,127,127,.12)' };
}
const validHandle = (app, v) => (ACCT[app].kind === 'phone' ? /^[+\d ()-]{4,24}$/.test(v) : /^[a-z0-9._]{1,30}$/.test(v));
const cleanHandle = (app, v) => (ACCT[app].kind === 'phone' ? v.trim() : v.trim().toLowerCase().replace(/^@|^u\//, '').replace(/\s+/g, '_'));

// the fields: username, name, picture, bio. f = starting values. returns { el, read(), check() }
function fields(api, app, f, { bio: withBio = true } = {}) {
  const cfg = ACCT[app];
  const st = { imageId: f.imageId || null };
  const pfp = h('button', { type: 'button', class: 'pacc-pfp', title: 'picture', onclick: async () => {
    const [p] = await addPhotos(false, 600);
    if (!p) return;
    st.imageId = p.imageId;
    drawPfp();
  } });
  const drawPfp = () => fill(pfp, rawPortrait({ ...api.char, imageId: st.imageId || api.char.imageId }, 'pacc-pfp-pic'), h('i', {}, '+'));
  drawPfp();
  const err = h('em', { class: 'pacc-err' });
  const handle = h('input', { type: 'text', class: 'pacc-in', name: 'handle', value: f.handle || '', maxLength: 30, autocomplete: 'off', spellcheck: false,
    oninput: () => { err.textContent = handle.value && !validHandle(app, cleanHandle(app, handle.value)) ? 'invalid' : ''; } });
  const name = h('input', { type: 'text', class: 'pacc-in', name: 'name', value: f.name || '', maxLength: 40 });
  const bio = cfg.noBio || !withBio ? null : h('textarea', { class: 'pacc-in bio', name: 'bio', maxLength: 150, value: f.bio || '' });
  const row = (label, input, extra) => h('label', { class: 'pacc-field' }, h('span', {}, label), h('div', { class: 'pacc-wrap' }, ...input), extra || null);
  const el = h('div', { class: 'pacc-fields' },
    pfp,
    cfg.noHandle ? null : row(cfg.handleLabel || (cfg.kind === 'phone' ? 'phone number' : cfg.kind === 'email' ? 'email' : 'username'),
      [cfg.pre ? h('i', { class: 'pacc-pre' }, cfg.pre) : null, handle, cfg.post ? h('i', { class: 'pacc-post' }, cfg.post) : null], err),
    row(cfg.nameLabel || 'name', [name]),
    bio ? row(cfg.bioLabel || 'bio', [bio]) : null);
  return {
    el,
    read: () => ({ handle: cfg.noHandle ? (f.handle || defaultHandle(api.char, app)) : cleanHandle(app, handle.value), name: name.value.trim() || rawNameOf(api.char), bio: bio ? bio.value.trim() : '', imageId: st.imageId }),
    check: () => {
      if (cfg.noHandle) return true;
      const v = cleanHandle(app, handle.value);
      if (!validHandle(app, v)) { err.textContent = v ? 'invalid' : 'needed'; handle.focus(); return false; }
      return true;
    },
  };
}

function signup(api, app, done, cancel) {
  const others = [];
  const seen = new Set();
  for (const [id, r] of Object.entries(api.d.accounts || {})) {
    if (!ACCT[id]) continue;
    for (const a of listOf(api.char, id)) {
      if (id === app && !a.out) continue;
      const k = id === app ? 'same' + a.id : a.handle + '|' + a.name;
      if (seen.has(k)) continue;
      seen.add(k);
      others.push({ app: id, a });
    }
  }
  let mode = 'up';
  const heading = h('h3', { class: 'pacc-h' }, cancel ? 'add account' : 'create account');
  const body = h('div', { class: 'pacc-body' });
  const f = fields(api, app, { handle: ACCT[app].kind === 'phone' ? digits() : '', name: rawNameOf(api.char) });
  const go = () => {
    if (!f.check()) return;
    addAccount(api, app, f.read());
    done();
  };
  const useOld = ({ app: from, a }) => {
    if (from === app) {
      updateAccount(api, app, a.id, { out: false });
      recFor(api.d, app).active = a.id;
      api.save();
    } else addAccount(api, app, { handle: ACCT[app].kind === 'phone' ? digits() : slug(a.handle) || defaultHandle(api.char, app), name: a.name, bio: a.bio, imageId: a.imageId });
    done();
  };
  const draw = () => fill(body,
    mode === 'up'
      ? [f.el, h('button', { type: 'button', class: 'pacc-go', onclick: go }, 'sign up')]
      : h('div', { class: 'pacc-list' }, others.map(o => h('button', { type: 'button', class: 'pacc-old', onclick: () => useOld(o) },
        rawPortrait({ ...api.char, imageId: o.a.imageId || api.char.imageId, name: o.a.name }, 'sm'),
        h('div', {}, h('b', {}, o.app === app ? shownHandle(app, o.a) : 'continue as ' + (ACCT[o.app].noHandle ? o.a.name : '@' + o.a.handle)), h('span', {}, api.APPS[o.app].label)),
        h('i', { class: 'pacc-chev' }, '›')))));
  const tabs = others.length ? h('div', { class: 'pacc-tabs' }, [['up', 'sign up'], ['in', 'log in']].map(([m, l]) =>
    h('button', { type: 'button', class: m === mode ? 'on' : '', 'data-mode': m, onclick: e => { mode = m; heading.textContent = m === 'in' ? 'log in' : cancel ? 'add account' : 'create account'; tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); draw(); } }, l))) : null;
  draw();
  const dark = isDark(ACCT[app].bg);
  return h('div', { class: 'ph-app-screen pacc ' + (dark ? 'pacc-dark' : 'pacc-light'), 'data-app': app, style: styleOf(app) },
    h('div', { class: 'pacc-top' },
      cancel ? h('button', { type: 'button', class: 'pacc-x', onclick: cancel }, 'cancel') : h('button', { type: 'button', class: 'pacc-x', onclick: () => api.goHome() }, '‹')),
    h('div', { class: 'ph-scroll pacc-scroll' }, brandTop(api, app), heading, tabs, body));
}

// ---- switching accounts (tap your own username in an app, or settings) ----
export function switcher(api, app) {
  if (!api.mine || !ACCT[app]) return;
  api.screen.querySelector('.pacc-sheet-wrap')?.remove();
  const r = recFor(api.d, app);
  const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 220); };
  const act = activeOf(api.char, app);
  const wrap = h('div', { class: 'pacc-sheet-wrap', style: styleOf(app), onclick: e => { if (e.target === wrap) close(); } },
    h('div', { class: 'pacc-sheet' },
      h('i', { class: 'pacc-grab' }),
      h('div', { class: 'pacc-sheet-list' }, liveList(api.char, app).map(a => h('button', {
        type: 'button', class: 'pacc-row' + (a.id === act?.id ? ' on' : ''), onclick: () => { r.active = a.id; api.save(); close(); if (ctx.app === app) api.redraw(); },
      }, rawPortrait({ ...api.char, imageId: a.imageId || api.char.imageId, name: a.name }, 'sm'), h('div', {}, h('b', {}, shownHandle(app, a)), ACCT[app].noHandle ? null : h('span', {}, a.name)), h('i', { class: 'pacc-tick' })))),
      h('button', { type: 'button', class: 'pacc-sheet-btn', onclick: () => { close(); api.addAccount(app); } }, 'add account'),
      act ? h('button', { type: 'button', class: 'pacc-sheet-btn', onclick: () => { close(); editAccount(api, app, act.id); } }, 'edit account') : null,
      act ? h('button', { type: 'button', class: 'pacc-sheet-btn bad', onclick: async () => {
        if (!(await confirmDialog(`log out of ${shownHandle(app, act)}?`, { okLabel: 'log out' }))) return;
        updateAccount(api, app, act.id, { out: true });
        const next = liveList(api.char, app)[0];
        r.active = next?.id || null;
        api.save();
        close();
        if (ctx.app === app) api.redraw();
        else if (api.redraw) api.redraw();
      } }, 'log out') : null));
  api.screen.append(wrap);
}

export function editAccount(api, app, id) {
  const a = listOf(api.char, app).find(x => x.id === id);
  if (!a) return;
  const f = fields(api, app, a);
  openModal({
    title: api.APPS[app].label,
    body: h('div', { class: 'pacc-modal', style: styleOf(app) }, f.el),
    actions: [{ label: 'save', kind: 'primary', onClick: close => { if (!f.check()) return; updateAccount(api, app, id, f.read()); close(); api.redraw(); } }],
  });
}

// the account bits (picture, username, name) to put at the top of an app's own "edit profile" box.
// only ever changes the account, never the oc's own picture or name
export function accountBox(api, app) {
  const a = activeOf(api.char, app);
  if (!api.mine || !a) return null;
  const f = fields(api, app, a, { bio: false });
  f.el.classList.add('pacc-box');
  return { el: f.el, check: f.check, commit: () => { const v = f.read(); delete v.bio; updateAccount(api, app, a.id, v); } };
}

// settings: every account the oc has
export function settingsGroup(api) {
  const apps = Object.keys(ACCT).filter(app => liveList(api.char, app).length && api.APPS[app]);
  if (!apps.length) return null;
  return [
    h('div', { class: 'ph-set-label' }, 'accounts'),
    h('div', { class: 'ph-group pacc-set' }, apps.flatMap(app => liveList(api.char, app).map(a => h('button', {
      type: 'button', class: 'ph-row', 'data-acct-app': app, onclick: () => (api.mine ? switcher(api, app) : null),
    }, h('span', { class: 'ph-set-ico', style: { background: api.APPS[app].bg } }, sticker(api.APPS[app].icon)),
      h('div', { class: 'ph-row-main' }, h('b', {}, shownHandle(app, a)), h('div', { class: 'ph-row-sub' }, api.APPS[app].label)),
      api.mine ? h('span', { class: 'ph-chev' }, '›') : null)))),
  ];
}
