// phone apps (brands a): pinterest, discord, facebook, snapchat, whatsapp, bereal, threads.
// see the plug-in notes at the top of phone.js. everything people post "as" someone else uses a ref
// ({ id, name }) like the rest of the phone, so it still reads right if that oc gets renamed.

import { h, s, fill, uid, openModal, confirmDialog, toast, swatches } from '../ui.js';
import { pic, allOcs } from './kit.js';
// portrait/nameOf here show an oc as their account on the open app (see phone-accounts.js)
import { portrait, nameOf, acctId, accountBox } from './phone-accounts.js';
import { who, face, freshRef, pickWho, hm, hmA, dayLabel, ago, addPhotos, dropImage, bigNum, relLabel } from './phone-bits.js';

export const APPS = {
  pinterest: { label: 'pinterest', icon: '1f4cc', bg: 'linear-gradient(160deg,#ff4d5e,#d50c22)', cat: 'social' },
  discord: { label: 'discord', icon: '1f47e', bg: 'linear-gradient(160deg,#8891ff,#5865f2)', cat: 'social' },
  facebook: { label: 'facebook', icon: '1f44d', bg: 'linear-gradient(160deg,#4a95ff,#0866ff)', cat: 'social' },
  snapchat: { label: 'snapchat', icon: '1f47b', bg: 'linear-gradient(160deg,#fffd7a,#fffc00)', cat: 'social' },
  whatsapp: { label: 'whatsapp', icon: '1f5e8-fe0f', bg: 'linear-gradient(160deg,#62ec93,#1ebe5a)', cat: 'social' },
  bereal: { label: 'bereal', icon: '1f4f8', bg: 'linear-gradient(160deg,#2b2b2b,#000)', cat: 'social' },
  threads: { label: 'threads', icon: '1f9f5', bg: 'linear-gradient(160deg,#2a2a2a,#050505)', cat: 'social' },
};

export const DEF = {
  pinterest: { pins: [], boards: [] },
  discord: { servers: [], dms: [], status: 'online' },
  facebook: { posts: [], coverId: null, bio: '', about: { work: '', school: '', lives: '', from: '', rel: '' } },
  snapchat: { snaps: [], stories: [], streaks: {} },
  whatsapp: { chats: [], status: [], calls: [] },
  bereal: { posts: [] },
  threadsapp: { posts: [], bio: '', followers: 1313 },
};

// ---- little helpers ----
const P = (d, extra = {}) => s('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra });
const I = (cls, ...kids) => s('svg', { viewBox: '0 0 24 24', class: 'pa-i ' + (cls || '') }, ...kids);
const ico = {
  back: () => I('', P('M15 4 7 12l8 8', { 'stroke-width': 2.4 })),
  home: () => I('', P('M3.5 11 12 4l8.5 7v9h-5.5v-6h-6v6H3.5Z')),
  search: () => I('', s('circle', { cx: 10.5, cy: 10.5, r: 6.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), P('m15.5 15.5 5 5', { 'stroke-width': 2.4 })),
  plus: () => I('', P('M12 5v14M5 12h14', { 'stroke-width': 2.4 })),
  user: () => I('', s('circle', { cx: 12, cy: 8, r: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), P('M4 21c1-4.5 4.4-6.5 8-6.5s7 2 8 6.5')),
  users: () => I('', s('circle', { cx: 9, cy: 8, r: 3.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), P('M2.5 20c.8-4 3.4-5.6 6.5-5.6s5.7 1.6 6.5 5.6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.6c2 .6 3.2 2.3 3.6 5.4')),
  heart: on => I(on ? 'on' : '', P('M12 20.3s-7.6-4.6-9.3-9.3C1.5 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.5-1.7 4.7-9.3 9.3-9.3 9.3Z', on ? { fill: 'currentColor' } : {})),
  bubble: () => I('', P('M20.5 11.5a8.5 8 0 0 1-12.4 7.1L3.5 20l1.4-4.2A8 8 0 1 1 20.5 11.5Z')),
  repost: () => I('', P('M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4')),
  send: () => I('', P('M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5Z')),
  dots: () => I('', s('circle', { cx: 5, cy: 12, r: 1.8, fill: 'currentColor' }), s('circle', { cx: 12, cy: 12, r: 1.8, fill: 'currentColor' }), s('circle', { cx: 19, cy: 12, r: 1.8, fill: 'currentColor' })),
  cam: () => I('', P('M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2.2h5.8L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z'), s('circle', { cx: 12, cy: 12.5, r: 3.6, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 })),
  phone: () => I('', P('M5 3.5h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 6.5 6.5l1.4-2.3 4.6 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2Z')),
  video: () => I('', s('rect', { x: 2.5, y: 6, width: 13, height: 12, rx: 2.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), P('m15.5 10.5 6-3.5v10l-6-3.5')),
  chat: () => I('', P('M4 5h16v11H10l-4.5 3.5V16H4Z')),
  smile: () => I('', s('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), P('M8.5 14.5a4.5 4.5 0 0 0 7 0'), s('circle', { cx: 9, cy: 10, r: 1.2, fill: 'currentColor' }), s('circle', { cx: 15, cy: 10, r: 1.2, fill: 'currentColor' })),
  photo: () => I('', s('rect', { x: 3, y: 4.5, width: 18, height: 15, rx: 3, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), s('circle', { cx: 9, cy: 10, r: 1.8, fill: 'currentColor' }), P('m4 17.5 5-4.5 4 3.5 3-2.5 4 3.5')),
  ticks: () => I('pa-ticks', P('m2 12.5 4 4 8-9M10 16.5l1 0 8-9', { 'stroke-width': 1.9 })),
  flip: () => I('', P('M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4')),
  bolt: () => I('', P('M13 2 4.5 13.5H12L11 22l8.5-11.5H12Z')),
  globe: () => I('pa-globe', s('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), P('M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z')),
  thumb: () => I('', P('M7 10.5V20H4v-9.5Zm0 0 4.2-7a2 2 0 0 1 3 2.2L13.4 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7')),
  share: () => I('', P('M14 4.5 21 11l-7 6.5V14c-5 0-8.5 1.5-11 5.5C4 13 7.5 9.5 14 8.8Z')),
  bell: () => I('', P('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0')),
  menu: () => I('', P('M4 7h16M4 12h16M4 17h16')),
};
const discordLogo = () => s('svg', { viewBox: '0 0 24 24', class: 'pa-dc-logo' }, s('path', { fill: 'currentColor', d: 'M19.3 5.4A16.6 16.6 0 0 0 15.2 4l-.5 1a15 15 0 0 0-5.4 0l-.5-1a16.6 16.6 0 0 0-4.1 1.4C2 9.3 1.3 13.1 1.6 16.9a16.8 16.8 0 0 0 5.1 2.6l1.1-1.8a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 11 0l.4.3-1.7.8 1.1 1.8a16.7 16.7 0 0 0 5.1-2.6c.4-4.4-.7-8.2-3.1-11.5ZM8.5 14.6c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm7 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z' }));
const threadsLogo = () => s('svg', { viewBox: '0 0 24 24', class: 'pa-th-logo' }, P('M17 8.3C16.2 5.6 14.2 4 11.8 4 8 4 5.5 7.2 5.5 12s2.5 8 6.6 8c3.3 0 5.8-2 5.8-4.8 0-2.6-2-4.1-5-4.1-2.2 0-3.6 1.1-3.6 2.6 0 1.4 1.2 2.3 2.7 2.3 2.4 0 3.6-2 3.4-6', { 'stroke-width': 2.3 }));

const dayKey = (ts = Date.now()) => { const x = new Date(ts); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const handleOf = ref => who(ref).handle || who(ref).name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'someone';
const refKey = ref => (ref?.id ? ref.id : 'n:' + (ref?.name || '').toLowerCase());
const sameRef = (a, b) => refKey(a) === refKey(b);
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const agoLong = ts => { const a = ago(ts); return a === 'now' ? 'just now' : a; };
const lateLabel = m => (m < 60 ? `${m} min late` : `${Math.round(m / 60)}h late`);

export function install(api) {
  const { d, char, mine, save, show, SCREENS } = api;
  const me = () => ({ id: char.id, name: nameOf(char), acct: acctId(char) });
  const isMe = ref => ref?.id === char.id;
  const home = () => api.goHome();

  // fill in anything missing (old saves, partial data)
  d.pinterest = { ...structuredClone(DEF.pinterest), ...d.pinterest };
  d.discord = { ...structuredClone(DEF.discord), ...d.discord };
  d.facebook = { ...structuredClone(DEF.facebook), ...d.facebook };
  d.facebook.about = { ...DEF.facebook.about, ...d.facebook.about };
  d.snapchat = { ...structuredClone(DEF.snapchat), ...d.snapchat };
  d.whatsapp = { ...structuredClone(DEF.whatsapp), ...d.whatsapp };
  d.bereal = { ...structuredClone(DEF.bereal), ...d.bereal };
  d.threadsapp = { ...structuredClone(DEF.threadsapp), ...d.threadsapp };

  // pick who's posting: this oc, anyone in their worlds, or a typed name
  function pickAs(title = 'as who?') {
    return new Promise(resolve => {
      let done = null;
      const name = h('input', { type: 'text', placeholder: 'type a name', maxLength: 60 });
      const m = openModal({
        title,
        body: h('div', { class: 'who-pick' },
          h('div', { class: 'who-pick-grid' }, [char, ...allOcs(char.id)].map(o => h('button', {
            type: 'button', class: 'who-pick-oc', style: { '--c': o.color }, onclick: () => { done = o.id === char.id ? me() : { id: o.id, name: nameOf(o) }; m.close(); },
          }, portrait(o, 'md'), h('span', {}, nameOf(o))))),
          h('div', { class: 'who-pick-typed' }, name)),
        actions: [{ label: 'pick', kind: 'primary', onClick: close => { const v = name.value.trim(); if (!v) { name.focus(); return; } done = { id: null, name: v }; close(); } }],
        onClose: () => resolve(done),
      });
    });
  }

  // a little face button: who you're posting as. click to switch
  function asChip(get, set, cls = '') {
    const b = h('button', {
      type: 'button', class: 'pa-as ' + cls, title: 'post as',
      onclick: async e => { e.preventDefault(); const r = await pickAs(); if (r) { set(r); paint(); } },
    });
    const paint = () => fill(b, face(get(), 'xs'));
    paint();
    return b;
  }

  // the "write a post" box most apps share. resolves via onDone({ by, text, imageId })
  function compose({ title, placeholder = '', photo = false, needPhoto = false, needText = false, okLabel = 'post', by = me(), extra = null, onDone }) {
    let as = by, imageId = null;
    const ta = h('textarea', { class: 'pa-compose-text', placeholder, maxLength: 1000, rows: 4, 'data-autofocus': '' });
    const prev = h('div', { class: 'pa-compose-pic' });
    const drawPrev = () => fill(prev, imageId ? [pic(imageId), h('button', { type: 'button', class: 'pa-compose-x', title: 'remove', onclick: () => { dropImage(imageId); imageId = null; drawPrev(); } }, '✕')] : null);
    let posted = false;
    openModal({
      title,
      body: h('div', { class: 'pa-compose' },
        h('div', { class: 'pa-compose-who' }, asChip(() => as, r => { as = r; }), h('span', {}, 'as')),
        ta, prev,
        photo ? h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const [p] = await addPhotos(false, 1400); if (p) { if (imageId) dropImage(imageId); imageId = p.imageId; drawPrev(); } } }, 'add photo') : null,
        extra?.el || null),
      actions: [{
        label: okLabel, kind: 'primary', onClick: close => {
          const text = ta.value.trim();
          if (needPhoto && !imageId) { toast('pick a photo first'); return; }
          if ((needText || !photo) && !text && !imageId) { ta.focus(); return; }
          if (!text && !imageId) { ta.focus(); return; }
          posted = true;
          close();
          onDone({ by: freshRef(as), text, imageId, ...(extra?.get?.() || {}) });
        },
      }],
      onClose: () => { if (!posted && imageId) dropImage(imageId); },
    });
  }

  // a bottom tab bar
  const tabBar = (cls, tabs, cur, go) => h('div', { class: 'pa-tabbar ' + cls },
    tabs.map(([id, icon, label]) => h('button', { type: 'button', class: 'pa-tab' + (cur === id ? ' on' : ''), title: label, 'data-tab': id, onclick: () => go(id) }, icon(), label && cls.includes('labels') ? h('span', {}, label) : null)));

  // ======================================================================
  // pinterest
  // ======================================================================
  const pn = d.pinterest;
  const pinById = id => pn.pins.find(p => p.id === id);
  const boardsWith = pin => pn.boards.filter(b => b.pinIds.includes(pin.id));
  const pinCard = (p, from) => h('button', { type: 'button', class: 'pa-pin', 'data-id': p.id, onclick: () => show('pinterest', { view: 'pin', id: p.id, from }, 'push') },
    h('div', { class: 'pa-pin-img', style: { aspectRatio: p.w && p.h ? `${p.w} / ${p.h}` : '3 / 4' } }, pic(p.imageId)),
    h('div', { class: 'pa-pin-cap' }, h('span', {}, p.title || ''), h('i', {}, ico.dots())));
  const masonry = (list, from) => (list.length
    ? h('div', { class: 'pa-masonry' }, list.map(p => pinCard(p, from)))
    : h('div', { class: 'ph-empty' }, h('div', { class: 'pa-pn-logo big' }, 'P')));

  async function newPins() {
    const got = await addPhotos(true, 1400);
    if (!got.length) return;
    const title = h('input', { type: 'text', placeholder: 'title', maxLength: 100, 'data-autofocus': '' });
    const board = h('select', {}, h('option', { value: '' }, 'no board'), pn.boards.map(b => h('option', { value: b.id }, b.name)));
    let done = false;
    openModal({
      title: got.length > 1 ? `${got.length} new pins` : 'new pin',
      body: h('div', { class: 'pa-form' }, h('div', { class: 'pa-form-pics' }, got.map(g => pic(g.imageId))), title, pn.boards.length ? board : null),
      actions: [{
        label: 'publish', kind: 'primary', onClick: close => {
          done = true;
          const ids = got.map(g => { const p = { id: 'pin_' + uid(), imageId: g.imageId, w: g.width, h: g.height, title: title.value.trim(), by: me(), at: Date.now() }; pn.pins.push(p); return p.id; });
          const b = pn.boards.find(x => x.id === board.value);
          if (b) b.pinIds.push(...ids);
          save();
          close();
          show('pinterest', { view: 'home' }, null);
        },
      }],
      onClose: () => { if (!done) got.forEach(g => dropImage(g.imageId)); },
    });
  }
  function newBoard(after) {
    const name = h('input', { type: 'text', placeholder: 'board name', maxLength: 50, 'data-autofocus': '' });
    openModal({
      title: 'new board', body: h('div', { class: 'pa-form' }, name),
      actions: [{ label: 'create', kind: 'primary', onClick: close => { const v = name.value.trim(); if (!v) return name.focus(); const b = { id: 'bd_' + uid(), name: v, pinIds: [] }; pn.boards.push(b); save(); close(); after?.(b); } }],
    });
  }
  function saveToBoard(p, after) {
    const list = h('div', { class: 'pa-board-pick' });
    const m = openModal({ title: 'save to board', body: list, actions: [{ label: 'new board', kind: 'ghost', onClick: () => newBoard(b => { b.pinIds.push(p.id); save(); m.close(); after(); }) }] });
    fill(list, pn.boards.length ? pn.boards.map(b => h('button', {
      type: 'button', class: 'pa-board-row' + (b.pinIds.includes(p.id) ? ' on' : ''), onclick: () => {
        if (b.pinIds.includes(p.id)) b.pinIds = b.pinIds.filter(x => x !== p.id); else b.pinIds.push(p.id);
        save(); m.close(); after();
      },
    }, h('span', { class: 'pa-board-thumb' }, b.pinIds[0] && pinById(b.pinIds[0]) ? pic(pinById(b.pinIds[0]).imageId) : null), h('b', {}, b.name), h('span', {}, b.pinIds.includes(p.id) ? 'saved' : ''))) : null);
  }
  const boardCover = b => {
    const imgs = b.pinIds.map(pinById).filter(Boolean).slice(0, 3);
    return h('div', { class: 'pa-board-cover' }, [0, 1, 2].map(i => h('div', { class: 'pa-bc' + i }, imgs[i] ? pic(imgs[i].imageId) : null)));
  };

  SCREENS.pinterest = (p = {}) => {
    const v = p.view || 'home';
    const go = tab => show('pinterest', { view: tab }, null);
    const nav = tabBar('pa-pn-nav', [['home', ico.home, 'home'], ['search', ico.search, 'search'], ['create', ico.plus, 'create'], ['profile', () => portrait(char, 'xs pa-nav-pfp'), 'saved']], v, tab => {
      if (tab === 'create') { if (mine) newPins(); return; }
      go(tab);
    });
    const wrap = (cls, ...kids) => h('div', { class: 'ph-app-screen pa-pn ' + cls }, ...kids);

    if (v === 'pin') {
      const pin = pinById(p.id);
      if (!pin) return SCREENS.pinterest({ view: 'home' });
      const saved = boardsWith(pin).length > 0;
      const others = pn.pins.filter(x => x.id !== pin.id).reverse();
      return wrap('pa-pn-close',
        h('div', { class: 'ph-scroll' },
          h('div', { class: 'pa-pn-big' },
            h('button', { type: 'button', class: 'pa-round-back', title: 'back', onclick: () => show('pinterest', { view: p.from || 'home', id: p.board }, 'pop') }, ico.back()),
            pic(pin.imageId)),
          h('div', { class: 'pa-pn-actions' },
            h('button', { type: 'button', class: 'pa-ibtn', title: 'like', onclick: e => { if (!mine) return; pin.liked = !pin.liked; save(); fill(e.currentTarget, ico.heart(pin.liked)); } }, ico.heart(pin.liked)),
            h('button', { type: 'button', class: 'pa-ibtn', title: 'share', onclick: () => toast('link copied') }, ico.share()),
            mine ? h('button', {
              type: 'button', class: 'pa-ibtn', title: 'delete', onclick: async () => {
                if (!(await confirmDialog('delete this pin?', { danger: true, okLabel: 'delete' }))) return;
                pn.pins = pn.pins.filter(x => x !== pin);
                pn.boards.forEach(b => { b.pinIds = b.pinIds.filter(x => x !== pin.id); });
                dropImage(pin.imageId); save(); show('pinterest', { view: 'home' }, 'pop');
              },
            }, ico.dots()) : null,
            h('span', { class: 'pa-grow' }),
            mine ? h('button', { type: 'button', class: 'pa-pn-save' + (saved ? ' saved' : ''), onclick: () => saveToBoard(pin, () => api.redraw()) }, saved ? 'saved' : 'save') : null),
          pin.title ? h('h3', { class: 'pa-pn-title' }, pin.title) : null,
          h('div', { class: 'pa-pn-by' }, face(pin.by || me(), 'sm'), h('b', {}, who(pin.by || me()).name), saved ? h('span', {}, boardsWith(pin).map(b => b.name).join(', ')) : null),
          others.length ? [h('div', { class: 'pa-pn-more' }, 'more to explore'), masonry(others, 'home')] : null),
      );
    }

    if (v === 'board') {
      const b = pn.boards.find(x => x.id === p.id);
      if (!b) return SCREENS.pinterest({ view: 'profile' });
      const list = b.pinIds.map(pinById).filter(Boolean);
      return wrap('',
        h('div', { class: 'pa-pn-top' },
          h('button', { type: 'button', class: 'pa-ibtn', title: 'back', onclick: () => show('pinterest', { view: 'profile' }, 'pop') }, ico.back()),
          h('span', { class: 'pa-grow' }),
          mine ? h('button', {
            type: 'button', class: 'pa-ibtn', title: 'delete board', onclick: async () => {
              if (!(await confirmDialog(`delete the board "${b.name}"? the pins stay`, { danger: true, okLabel: 'delete' }))) return;
              pn.boards = pn.boards.filter(x => x !== b); save(); show('pinterest', { view: 'profile' }, 'pop');
            },
          }, ico.dots()) : null),
        h('div', { class: 'ph-scroll' },
          h('h2', { class: 'pa-pn-bname' }, b.name),
          h('div', { class: 'pa-pn-bcount' }, `${list.length} ${list.length === 1 ? 'pin' : 'pins'}`),
          list.length ? h('div', { class: 'pa-masonry' }, list.map(x => {
            const c = pinCard(x, 'board');
            c.onclick = () => show('pinterest', { view: 'pin', id: x.id, from: 'board', board: b.id }, 'push');
            return c;
          })) : null),
        nav);
    }

    if (v === 'search') {
      const results = h('div', {});
      const input = h('input', { type: 'text', class: 'pa-pn-search-in', placeholder: 'search for ideas', maxLength: 60, oninput: () => draw() });
      const draw = () => {
        const q = input.value.trim().toLowerCase();
        const hits = [...pn.pins].reverse().filter(x => !q || (x.title || '').toLowerCase().includes(q) || boardsWith(x).some(b => b.name.toLowerCase().includes(q)));
        fill(results,
          !q && pn.boards.length ? h('div', { class: 'pa-pn-ideas' }, pn.boards.map(b => h('button', { type: 'button', class: 'pa-pn-idea', onclick: () => { input.value = b.name; draw(); } },
            b.pinIds[0] && pinById(b.pinIds[0]) ? pic(pinById(b.pinIds[0]).imageId) : null, h('b', {}, b.name)))) : null,
          masonry(hits, 'search'));
      };
      draw();
      return wrap('',
        h('div', { class: 'pa-pn-searchbar' }, h('span', { class: 'pa-search-ico' }, ico.search()), input, h('span', { class: 'pa-search-ico' }, ico.cam())),
        h('div', { class: 'ph-scroll' }, results), nav);
    }

    if (v === 'profile') {
      let tab = p.tab || 'boards';
      const body = h('div', {});
      const draw = () => fill(body,
        h('div', { class: 'pa-pn-ptabs' }, [['pins', 'pins'], ['boards', 'boards']].map(([id, l]) => h('button', { type: 'button', class: tab === id ? 'on' : '', onclick: () => { tab = id; draw(); } }, l))),
        tab === 'pins'
          ? masonry([...pn.pins].reverse(), 'profile')
          : h('div', { class: 'pa-boards' },
            pn.boards.map(b => h('button', { type: 'button', class: 'pa-board', 'data-id': b.id, onclick: () => show('pinterest', { view: 'board', id: b.id }, 'push') },
              boardCover(b), h('b', {}, b.name), h('span', {}, `${b.pinIds.length} ${b.pinIds.length === 1 ? 'pin' : 'pins'}`))),
            mine ? h('button', { type: 'button', class: 'pa-board pa-board-new', onclick: () => newBoard(() => api.redraw()) }, h('div', { class: 'pa-board-cover' }, ico.plus()), h('b', {}, 'new board')) : null));
      draw();
      return wrap('',
        h('div', { class: 'ph-scroll' },
          h('div', { class: 'pa-pn-me' }, portrait(char, 'lg'), h('h2', { 'data-acct-switch': true }, nameOf(char)), h('span', {}, '@' + handleOf(me())),
            h('span', { class: 'pa-pn-follow' }, `${bigNum(pn.pins.length * 37 + 120)} followers · ${bigNum(pn.boards.length * 11 + 48)} following`)),
          body),
        nav);
    }

    // home
    const list = [...pn.pins].reverse();
    return wrap('',
      h('div', { class: 'pa-pn-head' },
        h('button', { type: 'button', class: 'pa-ibtn', title: 'home', onclick: home }, ico.back()),
        h('div', { class: 'pa-pn-chips' }, h('span', { class: 'on' }, 'all'), pn.boards.slice(0, 4).map(b => h('button', { type: 'button', onclick: () => show('pinterest', { view: 'board', id: b.id }, 'push') }, b.name)))),
      h('div', { class: 'ph-scroll' }, masonry(list, 'home'), !list.length && mine ? h('div', { class: 'pa-center' }, h('button', { type: 'button', class: 'pa-pn-save', onclick: newPins }, 'create a pin')) : null),
      nav);
  };

  // ======================================================================
  // discord
  // ======================================================================
  const dc = d.discord;
  let dcSel = dc.servers[0]?.id || 'dms';
  const STATUS = ['online', 'idle', 'dnd', 'offline'];
  const dcColor = ref => who(ref).color;
  const initialsOf = name => name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3) || '?';
  const serverIcon = sv => h('span', { class: 'pa-dc-sv-ico', style: { background: sv.color } }, initialsOf(sv.name));
  const dcFace = (ref, status) => h('span', { class: 'pa-dc-face' }, face(ref, 'sm'), status ? h('i', { class: 'pa-dot ' + status }) : null);
  const statusOf = (sv, ref) => (isMe(ref) ? dc.status : (sv?.members.find(m => sameRef(m.ref, ref))?.status || 'offline'));
  const REACTS_DC = ['😭', '💀', '🖤', '😂', '🔥', '👍', '‼️', '🦇'];

  function newServer() {
    const name = h('input', { type: 'text', placeholder: 'server name', maxLength: 40, 'data-autofocus': '' });
    let color = '#5865f2';
    openModal({
      title: 'create a server', body: h('div', { class: 'pa-form' }, name, swatches(color, c => { color = c; }, ['#5865f2', '#eb459e', '#ed4245', '#fee75c', '#57f287', '#23272a', '#ff4fa3', '#b18cff', '#9b8aa8'])),
      actions: [{
        label: 'create', kind: 'primary', onClick: close => {
          const v = name.value.trim(); if (!v) return name.focus();
          const sv = { id: 'sv_' + uid(), name: v, color, channels: [{ id: 'ch_' + uid(), name: 'general', msgs: [] }], members: [] };
          dc.servers.push(sv); dcSel = sv.id; save(); close(); show('discord', {}, null);
        },
      }],
    });
  }
  function newChannel(sv) {
    const name = h('input', { type: 'text', placeholder: 'new-channel', maxLength: 30, 'data-autofocus': '' });
    openModal({
      title: 'create channel', body: h('div', { class: 'pa-form' }, name),
      actions: [{ label: 'create', kind: 'primary', onClick: close => { const v = name.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, ''); if (!v) return name.focus(); sv.channels.push({ id: 'ch_' + uid(), name: v, msgs: [] }); save(); close(); api.redraw(); } }],
    });
  }
  async function newDm() {
    const ref = await pickWho({ title: 'new message', not: char.id, okLabel: 'message' });
    if (!ref) return;
    let dm = dc.dms.find(x => sameRef(x.who, ref));
    if (!dm) { dm = { id: 'dm_' + uid(), who: ref, msgs: [] }; dc.dms.push(dm); save(); }
    show('discord', { view: 'chat', dm: dm.id }, 'push');
  }

  SCREENS.discord = (p = {}) => {
    const v = p.view || 'home';
    if (v === 'chat') return dcChat(p);
    if (v === 'members') return dcMembers(p);
    const sv = dc.servers.find(x => x.id === dcSel);
    const rail = h('div', { class: 'pa-dc-rail ph-scroll' },
      h('button', { type: 'button', class: 'pa-dc-sv pa-dc-home' + (!sv ? ' on' : ''), title: 'direct messages', onclick: () => { dcSel = 'dms'; api.redraw(); } }, h('span', { class: 'pa-dc-sv-ico' }, discordLogo())),
      h('i', { class: 'pa-dc-sep' }),
      dc.servers.map(x => h('button', { type: 'button', class: 'pa-dc-sv' + (x === sv ? ' on' : ''), title: x.name, 'data-id': x.id, onclick: () => { dcSel = x.id; api.redraw(); } }, serverIcon(x))),
      mine ? h('button', { type: 'button', class: 'pa-dc-sv pa-dc-add', title: 'add a server', onclick: newServer }, h('span', { class: 'pa-dc-sv-ico' }, ico.plus())) : null);
    let panel;
    if (sv) {
      panel = h('div', { class: 'pa-dc-panel' },
        h('div', { class: 'pa-dc-svname' }, h('b', {}, sv.name), h('span', {}, '›')),
        h('div', { class: 'ph-scroll' },
          h('div', { class: 'pa-dc-cat' }, h('span', {}, 'text channels'), mine ? h('button', { type: 'button', class: 'pa-dc-catadd', title: 'create channel', onclick: () => newChannel(sv) }, '+') : null),
          sv.channels.map(c => h('button', { type: 'button', class: 'pa-dc-chan', 'data-id': c.id, onclick: () => show('discord', { view: 'chat', sv: sv.id, ch: c.id }, 'push') }, h('em', {}, '#'), h('span', {}, c.name))),
          h('div', { class: 'pa-dc-cat' }, h('span', {}, `members — ${sv.members.length + 1}`)),
          h('button', { type: 'button', class: 'pa-dc-chan', onclick: () => show('discord', { view: 'members', sv: sv.id }, 'push') }, h('div', { class: 'pa-dc-stack' }, [me(), ...sv.members.map(m => m.ref)].slice(0, 4).map(r => face(r, 'xs'))), h('span', {}, 'see all'))),
        mine ? h('button', {
          type: 'button', class: 'pa-dc-leave', onclick: async () => {
            if (!(await confirmDialog(`delete ${sv.name}?`, { danger: true, okLabel: 'delete' }))) return;
            dc.servers = dc.servers.filter(x => x !== sv); dcSel = 'dms'; save(); api.redraw();
          },
        }, 'delete server') : null);
    } else {
      panel = h('div', { class: 'pa-dc-panel' },
        h('div', { class: 'pa-dc-svname' }, h('b', {}, 'messages'), mine ? h('button', { type: 'button', class: 'pa-dc-catadd', title: 'new message', onclick: newDm }, '+') : null),
        h('div', { class: 'ph-scroll' },
          dc.dms.length ? [...dc.dms].sort((a, b) => (b.msgs.at(-1)?.at || 0) - (a.msgs.at(-1)?.at || 0)).map(dm => {
            const last = dm.msgs.at(-1);
            return h('button', { type: 'button', class: 'pa-dc-dm', 'data-id': dm.id, onclick: () => show('discord', { view: 'chat', dm: dm.id }, 'push') },
              dcFace(dm.who, dm.status || 'online'),
              h('div', { class: 'pa-dc-dm-main' }, h('b', {}, who(dm.who).name), h('span', {}, last ? (isMe(last.by) ? 'you: ' : '') + (last.text || 'sent a picture') : '')),
              last ? h('em', {}, ago(last.at)) : null);
          }) : h('div', { class: 'pa-dc-empty' }, discordLogo())));
    }
    return h('div', { class: 'ph-app-screen pa-dc' },
      h('div', { class: 'pa-dc-main' }, rail, panel),
      h('div', { class: 'pa-dc-you' }, dcFace(me(), dc.status), h('div', { 'data-acct-switch': true }, h('b', {}, nameOf(char)), h('span', {}, dc.status === 'dnd' ? 'do not disturb' : dc.status)),
        mine ? h('button', { type: 'button', class: 'pa-dc-statbtn', title: 'status', onclick: () => { dc.status = STATUS[(STATUS.indexOf(dc.status) + 1) % STATUS.length]; save(); api.redraw(); } }, h('i', { class: 'pa-dot ' + dc.status })) : null,
        h('button', { type: 'button', class: 'pa-dc-homebtn', title: 'home', onclick: home }, ico.home())));
  };

  function dcChat(p) {
    const sv = p.sv ? dc.servers.find(x => x.id === p.sv) : null;
    const ch = sv?.channels.find(x => x.id === p.ch);
    const dm = p.dm ? dc.dms.find(x => x.id === p.dm) : null;
    const room = ch || dm;
    if (!room) return SCREENS.discord({});
    let as = me();
    const list = h('div', { class: 'ph-scroll pa-dc-msgs' });
    const input = h('input', { type: 'text', class: 'pa-dc-input', maxLength: 1000, placeholder: ch ? `message #${ch.name}` : `message @${who(dm.who).name}`, onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } } });
    function send(imageId = null) {
      const text = input.value.trim();
      if (!text && !imageId) return;
      room.msgs.push({ id: 'dmsg_' + uid(), by: freshRef(as), text, imageId, at: Date.now(), reacts: {} });
      if (sv && !isMe(as) && !sv.members.some(m => sameRef(m.ref, as))) sv.members.push({ ref: freshRef(as), status: 'online' });
      input.value = '';
      save();
      draw();
    }
    function picker(m, row) {
      list.querySelectorAll('.pa-dc-pick').forEach(x => x.remove());
      if (!mine) return;
      row.append(h('div', { class: 'pa-dc-pick' },
        REACTS_DC.map(r => h('button', { type: 'button', onclick: e => { e.stopPropagation(); m.reacts[r] = (m.reacts[r] || 0) + 1; save(); draw(); } }, r)),
        h('button', { type: 'button', class: 'pa-dc-del', title: 'delete', onclick: e => { e.stopPropagation(); room.msgs = room.msgs.filter(x => x !== m); dropImage(m.imageId); save(); draw(); } }, '✕')));
    }
    function draw() {
      let prev = null;
      fill(list,
        h('div', { class: 'pa-dc-welcome' },
          ch ? h('span', { class: 'pa-dc-hash' }, '#') : face(dm.who, 'lg'),
          h('h3', {}, ch ? `welcome to #${ch.name}` : who(dm.who).name),
          dm ? h('span', {}, handleOf(dm.who)) : null),
        room.msgs.map(m => {
          const head = !prev || !sameRef(prev.by, m.by) || m.at - prev.at > 7 * 60e3;
          prev = m;
          const row = h('div', { class: 'pa-dc-msg' + (head ? ' head' : ''), onclick: () => picker(m, row) },
            head ? face(m.by, 'sm') : h('span', { class: 'pa-dc-gutter' }, hm(m.at)),
            h('div', { class: 'pa-dc-body' },
              head ? h('div', { class: 'pa-dc-meta' }, h('b', { style: { color: dcColor(m.by) } }, who(m.by).name), h('span', {}, `${dayLabel(m.at)} at ${hmA(m.at)}`)) : null,
              m.text ? h('div', { class: 'pa-dc-text' }, m.text) : null,
              m.imageId ? pic(m.imageId, 'pa-dc-pic') : null,
              Object.keys(m.reacts || {}).length ? h('div', { class: 'pa-dc-reacts' }, Object.entries(m.reacts).map(([r, n]) => h('button', {
                type: 'button', class: 'pa-dc-react', onclick: e => { e.stopPropagation(); if (!mine) return; m.reacts[r] = n - 1; if (m.reacts[r] <= 0) delete m.reacts[r]; save(); draw(); },
              }, r, h('b', {}, n)))) : null));
          return row;
        }));
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }
    draw();
    return h('div', { class: 'ph-app-screen pa-dc pa-dc-chat' },
      h('div', { class: 'pa-dc-chathead' },
        h('button', { type: 'button', class: 'pa-ibtn', title: 'back', onclick: () => show('discord', {}, 'pop') }, ico.back()),
        ch ? h('b', {}, h('em', {}, '#'), ch.name) : h('b', {}, dcFace(dm.who, dm.status || 'online'), who(dm.who).name),
        h('span', { class: 'pa-grow' }),
        sv ? h('button', { type: 'button', class: 'pa-ibtn', title: 'members', onclick: () => show('discord', { view: 'members', sv: sv.id, back: p }, 'push') }, ico.users()) : null),
      list,
      mine ? h('div', { class: 'pa-dc-composer' },
        h('button', { type: 'button', class: 'pa-dc-plus', title: 'send a picture', onclick: async () => { const [x] = await addPhotos(false, 1200); if (x) send(x.imageId); } }, ico.plus()),
        h('div', { class: 'pa-dc-inwrap' }, input, asChip(() => as, r => { as = r; }, 'pa-dc-as')),
        h('button', { type: 'button', class: 'pa-dc-send', title: 'send', onclick: () => send() }, ico.send())) : null);
  }

  function dcMembers(p) {
    const sv = dc.servers.find(x => x.id === p.sv);
    if (!sv) return SCREENS.discord({});
    const all = [{ ref: me(), status: dc.status, self: true }, ...sv.members];
    const groups = [['online', all.filter(m => m.status !== 'offline')], ['offline', all.filter(m => m.status === 'offline')]];
    return h('div', { class: 'ph-app-screen pa-dc pa-dc-chat' },
      h('div', { class: 'pa-dc-chathead' },
        h('button', { type: 'button', class: 'pa-ibtn', title: 'back', onclick: () => show('discord', p.back || {}, 'pop') }, ico.back()),
        h('b', {}, 'members'), h('span', { class: 'pa-grow' }),
        mine ? h('button', {
          type: 'button', class: 'pa-ibtn', title: 'add member', onclick: async () => {
            const ref = await pickWho({ title: 'add to server', not: char.id, okLabel: 'add' });
            if (!ref || sv.members.some(m => sameRef(m.ref, ref))) return;
            sv.members.push({ ref, status: 'online' }); save(); api.redraw();
          },
        }, ico.plus()) : null),
      h('div', { class: 'ph-scroll' },
        groups.map(([label, ms]) => ms.length ? [
          h('div', { class: 'pa-dc-cat' }, h('span', {}, `${label} — ${ms.length}`)),
          ms.map(m => h('div', { class: 'pa-dc-member' + (m.status === 'offline' ? ' off' : '') },
            dcFace(m.ref, m.status),
            h('b', { style: { color: dcColor(m.ref) } }, who(m.ref).name),
            mine ? h('button', {
              type: 'button', class: 'pa-dc-statbtn', title: 'status', onclick: () => {
                const nx = STATUS[(STATUS.indexOf(m.status) + 1) % STATUS.length];
                if (m.self) dc.status = nx; else m.status = nx;
                save(); api.redraw();
              },
            }, h('i', { class: 'pa-dot ' + m.status })) : null,
            mine && !m.self ? h('button', { type: 'button', class: 'pa-dc-kick', title: 'remove', onclick: () => { sv.members = sv.members.filter(x => x !== m); save(); api.redraw(); } }, '✕') : null)),
        ] : null)));
  }

  // ======================================================================
  // facebook
  // ======================================================================
  const fb = d.facebook;
  const FB_REACTS = [['like', '👍'], ['love', '❤️'], ['care', '🥰'], ['haha', '😆'], ['wow', '😮'], ['sad', '😢'], ['angry', '😡']];
  const reactEmoji = k => FB_REACTS.find(r => r[0] === k)?.[1] || '👍';
  const fbCount = post => Object.values(post.reacts || {}).reduce((a, b) => a + b, 0) + (post.mine ? 1 : 0);
  const fbTop = post => {
    const counts = { ...(post.reacts || {}) };
    if (post.mine) counts[post.mine] = (counts[post.mine] || 0) + 1;
    return Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => reactEmoji(k));
  };
  function fbPost(p) {
    compose({
      title: 'create post', placeholder: "what's on your mind?", photo: true, okLabel: 'post', by: p?.by || me(),
      onDone: ({ by, text, imageId }) => {
        fb.posts.push({ id: 'fb_' + uid(), by, text, imageId, at: Date.now(), reacts: { like: rnd(2, 40), love: rnd(0, 12), haha: rnd(0, 6) }, mine: null, comments: [] });
        save(); api.redraw();
      },
    });
  }
  function fbCard(post, full = false) {
    const likeBtn = h('button', { type: 'button', class: 'pa-fb-act' + (post.mine ? ' on ' + post.mine : '') });
    const paintLike = () => fill(likeBtn, post.mine ? h('span', { class: 'pa-fb-re' }, reactEmoji(post.mine)) : ico.thumb(), h('span', {}, post.mine ? post.mine : 'like'));
    paintLike();
    const counts = h('div', { class: 'pa-fb-counts' });
    const paintCounts = () => fill(counts,
      fbCount(post) ? h('span', { class: 'pa-fb-emo' }, fbTop(post).map(e => h('i', {}, e)), h('em', {}, fbCount(post))) : h('span'),
      post.comments.length ? h('span', {}, `${post.comments.length} ${post.comments.length === 1 ? 'comment' : 'comments'}`) : null);
    paintCounts();
    likeBtn.onclick = e => {
      if (!mine) return;
      const card = e.currentTarget.closest('.pa-fb-post');
      card.querySelector('.pa-fb-bar')?.remove();
      const bar = h('div', { class: 'pa-fb-bar' }, FB_REACTS.map(([k, em]) => h('button', {
        type: 'button', title: k, onclick: ev => { ev.stopPropagation(); post.mine = post.mine === k ? null : k; save(); bar.remove(); paintLike(); likeBtn.className = 'pa-fb-act' + (post.mine ? ' on ' + post.mine : ''); paintCounts(); },
      }, em)));
      likeBtn.parentElement.before(bar);
      setTimeout(() => document.addEventListener('click', () => bar.remove(), { once: true }), 0);
    };
    return h('div', { class: 'pa-fb-post', 'data-id': post.id },
      h('div', { class: 'pa-fb-phead' }, face(post.by, 'sm'),
        h('div', {}, h('b', {}, who(post.by).name), h('span', {}, ago(post.at) === 'now' ? 'just now' : ago(post.at), ' · ', ico.globe())),
        mine ? h('button', {
          type: 'button', class: 'pa-ibtn', title: 'delete', onclick: async () => {
            if (!(await confirmDialog('delete this post?', { danger: true, okLabel: 'delete' }))) return;
            fb.posts = fb.posts.filter(x => x !== post); dropImage(post.imageId); save(); show('facebook', {}, full ? 'pop' : null);
          },
        }, ico.dots()) : null),
      post.text ? h('div', { class: 'pa-fb-text' + (!post.imageId && post.text.length < 90 ? ' big' : '') }, post.text) : null,
      post.imageId ? pic(post.imageId, 'pa-fb-img') : null,
      counts,
      h('div', { class: 'pa-fb-acts' }, likeBtn,
        h('button', { type: 'button', class: 'pa-fb-act', onclick: () => { if (!full) show('facebook', { view: 'post', id: post.id }, 'push'); } }, ico.bubble(), h('span', {}, 'comment')),
        h('button', { type: 'button', class: 'pa-fb-act', onclick: () => toast('shared') }, ico.share(), h('span', {}, 'share'))),
      !full && post.comments.length ? h('button', { type: 'button', class: 'pa-fb-peek', onclick: () => show('facebook', { view: 'post', id: post.id }, 'push') },
        face(post.comments.at(-1).by, 'xs'), h('span', {}, h('b', {}, who(post.comments.at(-1).by).name), ' ', post.comments.at(-1).text)) : null);
  }

  SCREENS.facebook = (p = {}) => {
    const v = p.view || 'home';
    const tabs = h('div', { class: 'pa-fb-tabs' }, [['home', ico.home], ['friends', ico.users], ['profile', () => portrait(char, 'xs pa-nav-pfp')], ['menu', ico.menu]].map(([id, ic]) =>
      h('button', { type: 'button', class: v === id ? 'on' : '', 'data-tab': id, title: id, onclick: () => show('facebook', { view: id }, null) }, ic())));
    const top = h('div', { class: 'pa-fb-top' },
      h('button', { type: 'button', class: 'pa-ibtn', title: 'home', onclick: home }, ico.back()),
      h('b', { class: 'pa-fb-word' }, 'facebook'),
      h('span', { class: 'pa-grow' }),
      mine ? h('button', { type: 'button', class: 'pa-fb-circ', title: 'post', onclick: () => fbPost() }, ico.plus()) : null,
      h('button', { type: 'button', class: 'pa-fb-circ', title: 'search' }, ico.search()));
    const wrap = (...kids) => h('div', { class: 'ph-app-screen pa-fb' }, ...kids);

    if (v === 'post') {
      const post = fb.posts.find(x => x.id === p.id);
      if (!post) return SCREENS.facebook({});
      let as = me();
      const input = h('input', { type: 'text', class: 'pa-fb-cin', maxLength: 500, placeholder: 'write a comment...', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } } });
      function add() {
        const text = input.value.trim(); if (!text) return;
        post.comments.push({ id: 'c_' + uid(), by: freshRef(as), text, at: Date.now(), likes: 0 });
        save(); api.redraw();
      }
      return wrap(
        h('div', { class: 'pa-fb-top' }, h('button', { type: 'button', class: 'pa-ibtn', title: 'back', onclick: () => show('facebook', { view: p.from || 'home' }, 'pop') }, ico.back()), h('b', {}, who(post.by).name + "'s post")),
        h('div', { class: 'ph-scroll pa-fb-feed' }, fbCard(post, true),
          h('div', { class: 'pa-fb-comments' }, post.comments.map(c => h('div', { class: 'pa-fb-comment' }, face(c.by, 'sm'),
            h('div', {}, h('div', { class: 'pa-fb-cbub' }, h('b', {}, who(c.by).name), h('span', {}, c.text)),
              h('div', { class: 'pa-fb-cmeta' }, h('span', {}, ago(c.at)), h('button', { type: 'button', onclick: e => { if (!mine) return; c.liked = !c.liked; save(); e.currentTarget.classList.toggle('on', c.liked); } , class: c.liked ? 'on' : '' }, 'like'),
                mine ? h('button', { type: 'button', onclick: () => { post.comments = post.comments.filter(x => x !== c); save(); api.redraw(); } }, 'delete') : null)))))),
        mine ? h('div', { class: 'pa-fb-cbar' }, asChip(() => as, r => { as = r; }), input, h('button', { type: 'button', class: 'pa-fb-csend', title: 'send', onclick: add }, ico.send())) : null);
    }

    if (v === 'friends') {
      const ocs = allOcs(char.id);
      return wrap(top, tabs,
        h('div', { class: 'ph-scroll pa-fb-feed' },
          h('h3', { class: 'pa-fb-h' }, 'friends'),
          h('div', { class: 'pa-fb-sub' }, `${ocs.length} ${ocs.length === 1 ? 'friend' : 'friends'}`),
          ocs.length ? ocs.map(o => h('div', { class: 'pa-fb-friend' }, portrait(o, 'md'), h('div', {}, h('b', {}, nameOf(o)), h('span', {}, relLabel(char, o.id) || `${rnd(1, 30)} mutual friends`)),
            h('button', { type: 'button', class: 'pa-fb-btn grey' }, 'message'))) : h('div', { class: 'ph-empty' }, ico.users())));
    }

    if (v === 'profile') {
      const myPosts = fb.posts.filter(x => isMe(x.by)).reverse();
      const a = fb.about;
      const rows = [['work', 'works at'], ['school', 'went to'], ['lives', 'lives in'], ['from', 'from'], ['rel', '']].filter(([k]) => a[k]);
      return wrap(top, tabs,
        h('div', { class: 'ph-scroll pa-fb-feed' },
          h('div', { class: 'pa-fb-cover', style: { '--c': char.color || '#0866ff' } }, fb.coverId ? pic(fb.coverId) : null,
            mine ? h('button', {
              type: 'button', class: 'pa-fb-coverbtn', title: 'cover photo', onclick: async () => {
                const [x] = await addPhotos(false, 1400); if (!x) return;
                if (fb.coverId) dropImage(fb.coverId); fb.coverId = x.imageId; save(); api.redraw();
              },
            }, ico.cam()) : null),
          h('div', { class: 'pa-fb-me' }, portrait(char, 'lg'), h('h2', { 'data-acct-switch': true }, nameOf(char)), h('span', {}, `${bigNum(allOcs(char.id).length * 47 + 212)} friends`),
            fb.bio ? h('p', {}, fb.bio) : null,
            mine ? h('div', { class: 'pa-fb-mebtns' }, h('button', { type: 'button', class: 'pa-fb-btn', onclick: () => fbPost() }, '+ add to story'), h('button', { type: 'button', class: 'pa-fb-btn grey', onclick: editFb }, 'edit profile')) : null),
          rows.length ? h('div', { class: 'pa-fb-about' }, rows.map(([k, l]) => h('div', {}, l ? h('span', {}, l + ' ') : null, h('b', {}, a[k])))) : null,
          h('h3', { class: 'pa-fb-h' }, 'posts'),
          myPosts.map(x => fbCard(x))));
    }

    if (v === 'menu') {
      return wrap(top, tabs,
        h('div', { class: 'ph-scroll pa-fb-feed' },
          h('h3', { class: 'pa-fb-h' }, 'menu'),
          h('button', { type: 'button', class: 'pa-fb-friend', onclick: () => show('facebook', { view: 'profile' }, null) }, portrait(char, 'md'), h('div', {}, h('b', {}, nameOf(char)), h('span', {}, 'see your profile'))),
          h('div', { class: 'pa-fb-menu' }, [['memories', '🕰️'], ['saved', '🔖'], ['groups', '👥'], ['marketplace', '🏪'], ['events', '📅'], ['feeds', '📰']].map(([l, e]) =>
            h('button', { type: 'button', class: 'pa-fb-mtile', onclick: () => { if (l === 'memories') show('facebook', { view: 'memories' }, 'push'); } }, h('i', {}, e), h('b', {}, l))))));
    }

    if (v === 'memories') {
      const old = fb.posts.filter(x => dayLabel(x.at) !== 'today').reverse();
      return wrap(h('div', { class: 'pa-fb-top' }, h('button', { type: 'button', class: 'pa-ibtn', title: 'back', onclick: () => show('facebook', { view: 'menu' }, 'pop') }, ico.back()), h('b', {}, 'memories')),
        h('div', { class: 'ph-scroll pa-fb-feed' }, old.length ? old.map(x => fbCard(x)) : h('div', { class: 'ph-empty' }, '🕰️')));
    }

    // home feed
    const posts = [...fb.posts].reverse();
    return wrap(top, tabs,
      h('div', { class: 'ph-scroll pa-fb-feed' },
        mine ? h('div', { class: 'pa-fb-mind' }, portrait(char, 'sm'), h('button', { type: 'button', class: 'pa-fb-mindbtn', onclick: () => fbPost() }, "what's on your mind?"), h('button', { type: 'button', class: 'pa-ibtn pa-fb-green', title: 'photo', onclick: () => fbPost() }, ico.photo())) : null,
        h('div', { class: 'pa-fb-stories' },
          [char, ...allOcs(char.id)].slice(0, 8).map(o => h('div', { class: 'pa-fb-story', style: { '--c': o.color || '#0866ff' } }, portrait(o, 'sm'), h('b', {}, o === char ? 'your story' : nameOf(o))))),
        posts.length ? posts.map(x => fbCard(x)) : h('div', { class: 'ph-empty' }, h('b', { class: 'pa-fb-word' }, 'f'))));
  };
  function editFb() {
    const bio = h('textarea', { rows: 2, maxLength: 101, placeholder: 'bio', value: fb.bio });
    const f = {};
    const rows = [['work', 'works at'], ['school', 'school'], ['lives', 'lives in'], ['from', 'from'], ['rel', 'relationship']].map(([k, l]) => { f[k] = h('input', { type: 'text', maxLength: 60, placeholder: l, value: fb.about[k] }); return f[k]; });
    const top = accountBox(api, 'facebook');
    openModal({
      title: 'edit profile', body: h('div', { class: 'pa-form' }, top?.el || null, bio, ...rows),
      actions: [{ label: 'save', kind: 'primary', onClick: close => { if (top && !top.check()) return; top?.commit(); fb.bio = bio.value.trim(); for (const k in f) fb.about[k] = f[k].value.trim(); save(); close(); api.redraw(); } }],
    });
  }

  // ======================================================================
  // snapchat
  // ======================================================================
  const sc = d.snapchat;
  const streakOf = ref => sc.streaks[refKey(ref)]?.n || 0;
  function bumpStreak(ref) {
    const k = refKey(ref), today = dayKey(), y = dayKey(Date.now() - 864e5);
    const cur = sc.streaks[k] || { n: 0, day: '' };
    if (cur.day === today) return;
    sc.streaks[k] = { n: cur.day === y ? cur.n + 1 : Math.max(1, cur.n && cur.day ? 1 : 1), day: today };
  }
  const scPeople = () => {
    const map = new Map();
    for (const o of allOcs(char.id)) map.set(refKey({ id: o.id }), { ref: { id: o.id, name: nameOf(o) }, last: null });
    for (const sn of sc.snaps) {
      const k = refKey(sn.with);
      if (!map.has(k)) map.set(k, { ref: sn.with, last: null });
      const e = map.get(k);
      if (!e.last || sn.at > e.last.at) e.last = sn;
    }
    return [...map.values()].sort((a, b) => (b.last?.at || 0) - (a.last?.at || 0));
  };
  const unopenedFrom = ref => sc.snaps.filter(sn => sn.dir === 'in' && !sn.opened && sameRef(sn.with, ref)).sort((a, b) => a.at - b.at);

  async function sendSnap() {
    const [ph] = await addPhotos(false, 1400);
    if (!ph) return;
    const cap = h('input', { type: 'text', maxLength: 80, placeholder: 'caption', class: 'pa-sc-capin' });
    const picked = new Set();
    let story = false;
    const people = scPeople();
    const list = h('div', { class: 'pa-sc-sendlist' });
    const drawList = () => fill(list,
      h('button', { type: 'button', class: 'pa-sc-sendrow' + (story ? ' on' : ''), onclick: () => { story = !story; drawList(); } }, portrait(char, 'sm'), h('b', {}, 'my story'), h('i', { class: 'pa-check' })),
      people.map(pp => h('button', { type: 'button', class: 'pa-sc-sendrow' + (picked.has(refKey(pp.ref)) ? ' on' : ''), onclick: () => { const k = refKey(pp.ref); picked.has(k) ? picked.delete(k) : picked.add(k); drawList(); } },
        face(pp.ref, 'sm'), h('b', {}, who(pp.ref).name), streakOf(pp.ref) ? h('span', {}, streakOf(pp.ref) + '🔥') : null, h('i', { class: 'pa-check' }))));
    drawList();
    let sent = false;
    openModal({
      title: 'send to', body: h('div', { class: 'pa-sc-send' }, h('div', { class: 'pa-sc-sendprev' }, pic(ph.imageId), cap), list),
      actions: [{
        label: 'send', kind: 'primary', onClick: close => {
          if (!picked.size && !story) { toast('pick someone'); return; }
          sent = true;
          for (const pp of people) if (picked.has(refKey(pp.ref))) { sc.snaps.push({ id: 'sn_' + uid(), dir: 'out', with: freshRef(pp.ref), imageId: ph.imageId, caption: cap.value.trim(), at: Date.now(), opened: false }); bumpStreak(pp.ref); }
          if (story) sc.stories.push({ id: 'st_' + uid(), by: me(), imageId: ph.imageId, caption: cap.value.trim(), at: Date.now() });
          save(); close(); show('snapchat', { view: 'chat' }, 'push');
        },
      }],
      onClose: () => { if (!sent) dropImage(ph.imageId); },
    });
  }
  async function incomingSnap() {
    const ref = await pickWho({ title: 'snap from', not: char.id, okLabel: 'next' });
    if (!ref) return;
    const [ph] = await addPhotos(false, 1400);
    if (!ph) return;
    const cap = h('input', { type: 'text', maxLength: 80, placeholder: 'caption', 'data-autofocus': '' });
    openModal({
      title: `snap from ${who(ref).name}`, body: h('div', { class: 'pa-form' }, h('div', { class: 'pa-form-pics' }, pic(ph.imageId)), cap),
      actions: [{ label: 'send', kind: 'primary', onClick: close => { sc.snaps.push({ id: 'sn_' + uid(), dir: 'in', with: ref, imageId: ph.imageId, caption: cap.value.trim(), at: Date.now(), opened: false }); bumpStreak(ref); save(); close(); api.redraw(); } }],
    });
  }
  async function addStory() {
    compose({
      title: 'add to story', placeholder: 'caption', photo: true, needPhoto: true, okLabel: 'post',
      onDone: ({ by, text, imageId }) => { sc.stories.push({ id: 'st_' + uid(), by, imageId, caption: text, at: Date.now() }); save(); api.redraw(); },
    });
  }
  function personInfo(pp) {
    const n = h('input', { type: 'number', min: 0, max: 9999, value: streakOf(pp.ref) });
    const sentUnopened = sc.snaps.filter(x => x.dir === 'out' && !x.opened && sameRef(x.with, pp.ref));
    openModal({
      title: who(pp.ref).name,
      body: h('div', { class: 'pa-form' }, h('label', { class: 'pa-inline' }, h('span', {}, 'streak 🔥'), n)),
      actions: [
        sentUnopened.length ? { label: 'they opened it', kind: 'ghost', onClick: close => { sentUnopened.forEach(x => { x.opened = true; }); save(); close(); api.redraw(); } } : null,
        { label: 'save', kind: 'primary', onClick: close => { sc.streaks[refKey(pp.ref)] = { n: Math.max(0, Number(n.value) || 0), day: dayKey() }; save(); close(); api.redraw(); } },
      ].filter(Boolean),
    });
  }
  const scNav = cur => tabBar('pa-sc-nav', [['chat', ico.chat, 'chat'], ['cam', ico.cam, 'camera'], ['stories', ico.users, 'stories']], cur, id => show('snapchat', { view: id }, null));

  SCREENS.snapchat = (p = {}) => {
    const v = p.view || 'cam';
    if (v === 'snap') return scViewer(p);
    if (v === 'story') return scStory(p);
    if (v === 'chat') {
      const people = scPeople();
      return h('div', { class: 'ph-app-screen pa-sc pa-sc-list' },
        h('div', { class: 'pa-sc-top' }, h('button', { type: 'button', class: 'pa-sc-bit', title: 'home', onclick: home }, portrait(char, 'sm')), h('b', {}, 'chat'), h('span', { class: 'pa-grow' }),
          mine ? h('button', { type: 'button', class: 'pa-sc-circ', title: 'new snap from someone', onclick: incomingSnap }, ico.plus()) : null),
        h('div', { class: 'ph-scroll' }, people.map(pp => {
          const sn = pp.last, unopened = unopenedFrom(pp.ref).length;
          let status, cls;
          if (!sn) { status = 'tap to snap'; cls = 'none'; }
          else if (sn.dir === 'in') { status = unopened ? 'new snap' : 'received'; cls = unopened ? 'new' : 'got'; }
          else { status = sn.opened ? 'opened' : 'delivered'; cls = sn.opened ? 'opened' : 'sent'; }
          return h('div', { class: 'pa-sc-row', 'data-key': refKey(pp.ref), onclick: () => { if (unopened) show('snapchat', { view: 'snap', key: refKey(pp.ref) }, 'zoom'); else if (mine) personInfo(pp); } },
            h('span', { class: 'pa-sc-av' }, face(pp.ref, 'md')),
            h('div', { class: 'pa-sc-main' }, h('b', {}, who(pp.ref).name),
              h('span', { class: 'pa-sc-stat ' + cls }, h('i', { class: 'pa-sc-shape ' + cls }), h('em', {}, status), sn ? h('span', {}, ' · ' + ago(sn.at)) : null,
                streakOf(pp.ref) ? h('span', { class: 'pa-sc-streak' }, ' · ' + streakOf(pp.ref) + '🔥') : null)),
            h('button', { type: 'button', class: 'pa-sc-camchip', title: 'snap', onclick: e => { e.stopPropagation(); if (mine) sendSnap(); } }, ico.cam()));
        })),
        scNav('chat'));
    }
    if (v === 'stories') {
      const byPerson = new Map();
      for (const st of [...sc.stories].sort((a, b) => b.at - a.at)) { const k = refKey(st.by); if (!byPerson.has(k)) byPerson.set(k, st); }
      return h('div', { class: 'ph-app-screen pa-sc pa-sc-list' },
        h('div', { class: 'pa-sc-top' }, h('button', { type: 'button', class: 'pa-sc-bit', title: 'home', onclick: home }, portrait(char, 'sm')), h('b', {}, 'stories'), h('span', { class: 'pa-grow' }),
          mine ? h('button', { type: 'button', class: 'pa-sc-circ', title: 'add to story', onclick: addStory }, ico.plus()) : null),
        h('div', { class: 'ph-scroll' },
          h('div', { class: 'pa-sc-friends' }, [...byPerson.values()].map(st => h('button', { type: 'button', class: 'pa-sc-ring', onclick: () => show('snapchat', { view: 'story', key: refKey(st.by) }, 'zoom') }, face(st.by, 'md'), h('span', {}, isMe(st.by) ? 'my story' : who(st.by).name)))),
          h('div', { class: 'pa-sc-disc' }, [...sc.stories].sort((a, b) => b.at - a.at).map(st => h('button', { type: 'button', class: 'pa-sc-tile', onclick: () => show('snapchat', { view: 'story', key: refKey(st.by) }, 'zoom') },
            pic(st.imageId), h('div', {}, h('b', {}, who(st.by).name), st.caption ? h('span', {}, st.caption) : null)))),
          !sc.stories.length ? h('div', { class: 'ph-empty' }, ico.users()) : null),
        scNav('stories'));
    }
    // camera
    const last = d.photos.at(-1);
    return h('div', { class: 'ph-app-screen pa-sc pa-sc-cam' },
      h('div', { class: 'pa-sc-vf' }, last ? pic(last.imageId) : portrait(char, 'pa-sc-vfpfp')),
      h('div', { class: 'pa-sc-camtop' },
        h('button', { type: 'button', class: 'pa-sc-bit', title: 'home', onclick: home, 'data-acct-switch': true }, portrait(char, 'sm')),
        h('button', { type: 'button', class: 'pa-sc-glass', title: 'search' }, ico.search()),
        h('span', { class: 'pa-grow' }),
        h('div', { class: 'pa-sc-side' }, h('button', { type: 'button', class: 'pa-sc-glass', title: 'flip', onclick: e => e.currentTarget.closest('.pa-sc-cam').querySelector('.pa-sc-vf').classList.toggle('flipped') }, ico.flip()), h('button', { type: 'button', class: 'pa-sc-glass', title: 'flash', onclick: e => e.currentTarget.classList.toggle('on') }, ico.bolt()))),
      h('button', { type: 'button', class: 'pa-sc-shutter', title: 'take a snap', disabled: !mine, onclick: sendSnap }),
      scNav('cam'));
  };
  function scViewer(p) {
    const list = sc.snaps.filter(sn => sn.dir === 'in' && !sn.opened && refKey(sn.with) === p.key).sort((a, b) => a.at - b.at);
    const sn = list[0];
    if (!sn) return SCREENS.snapchat({ view: 'chat' });
    let gone = false;
    const next = () => {
      if (gone) return; gone = true;
      if (mine) { sn.opened = true; save(); }
      if (list.length > 1 && mine) show('snapchat', { view: 'snap', key: p.key }, null);
      else show('snapchat', { view: 'chat' }, 'pop');
    };
    const t = setTimeout(next, 10000);
    api.onLeave(() => clearTimeout(t));
    return h('div', { class: 'ph-app-screen pa-sc-view', onclick: next },
      pic(sn.imageId, 'pa-sc-full'),
      sn.caption ? h('div', { class: 'pa-sc-cap' }, sn.caption) : null,
      h('div', { class: 'pa-sc-vtop' }, face(sn.with, 'sm'), h('div', {}, h('b', {}, who(sn.with).name), h('span', {}, ago(sn.at))), h('span', { class: 'pa-grow' }),
        s('svg', { viewBox: '0 0 36 36', class: 'pa-sc-timer' }, s('circle', { cx: 18, cy: 18, r: 15, class: 'bg' }), s('circle', { cx: 18, cy: 18, r: 15, class: 'fg' }))));
  }
  function scStory(p) {
    const list = sc.stories.filter(st => refKey(st.by) === p.key).sort((a, b) => a.at - b.at);
    let i = p.i || 0;
    const st = list[i];
    if (!st) return SCREENS.snapchat({ view: 'stories' });
    const go = () => { if (i + 1 < list.length) show('snapchat', { view: 'story', key: p.key, i: i + 1 }, null); else show('snapchat', { view: 'stories' }, 'pop'); };
    const t = setTimeout(go, 5000);
    api.onLeave(() => clearTimeout(t));
    return h('div', { class: 'ph-app-screen pa-sc-view', onclick: go },
      pic(st.imageId, 'pa-sc-full'),
      st.caption ? h('div', { class: 'pa-sc-cap' }, st.caption) : null,
      h('div', { class: 'pa-sc-bars' }, list.map((_, k) => h('i', { class: k < i ? 'done' : k === i ? 'now' : '' }))),
      h('div', { class: 'pa-sc-vtop story' }, face(st.by, 'sm'), h('div', {}, h('b', {}, isMe(st.by) ? 'my story' : who(st.by).name), h('span', {}, ago(st.at))), h('span', { class: 'pa-grow' }),
        mine ? h('button', {
          type: 'button', class: 'pa-sc-glass', title: 'delete', onclick: async e => {
            e.stopPropagation();
            clearTimeout(t);
            if (!(await confirmDialog('delete this story?', { danger: true, okLabel: 'delete' }))) return;
            sc.stories = sc.stories.filter(x => x !== st);
            if (!sc.snaps.some(x => x.imageId === st.imageId)) dropImage(st.imageId);
            save(); show('snapchat', { view: 'stories' }, 'pop');
          },
        }, ico.dots()) : null));
  }

  // ======================================================================
  // whatsapp
  // ======================================================================
  const wa = d.whatsapp;
  const chatName = c => (c.group ? c.name : who(c.members[0]).name);
  const chatFace = (c, cls = 'md') => (c.group
    ? h('span', { class: 'pa-wa-gface ' + cls }, c.members.slice(0, 2).map(r => face(r, 'xs')))
    : face(c.members[0], cls));
  const waTabs = cur => tabBar('pa-wa-nav labels', [['updates', () => I('', s('circle', { cx: 12, cy: 12, r: 8, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-dasharray': '4 2' })), 'updates'], ['calls', ico.phone, 'calls'], ['chats', ico.chat, 'chats']], cur, id => show('whatsapp', { view: id }, null));
  async function waNewChat(group = false) {
    if (!group) {
      const ref = await pickWho({ title: 'new chat', not: char.id, okLabel: 'chat' });
      if (!ref) return;
      let c = wa.chats.find(x => !x.group && sameRef(x.members[0], ref));
      if (!c) { c = { id: 'wc_' + uid(), group: false, name: '', members: [ref], msgs: [] }; wa.chats.push(c); save(); }
      show('whatsapp', { view: 'chat', id: c.id }, 'push');
      return;
    }
    const name = h('input', { type: 'text', maxLength: 40, placeholder: 'group name', 'data-autofocus': '' });
    const picked = new Map();
    const grid = h('div', { class: 'pa-wa-gpick' });
    const draw = () => fill(grid, allOcs(char.id).map(o => h('button', { type: 'button', class: 'pa-sc-sendrow' + (picked.has(o.id) ? ' on' : ''), onclick: () => { picked.has(o.id) ? picked.delete(o.id) : picked.set(o.id, { id: o.id, name: nameOf(o) }); draw(); } }, portrait(o, 'sm'), h('b', {}, nameOf(o)), h('i', { class: 'pa-check' }))),
      [...picked.values()].filter(r => !r.id).map(r => h('div', { class: 'pa-sc-sendrow on' }, face(r, 'sm'), h('b', {}, r.name), h('i', { class: 'pa-check' }))));
    draw();
    openModal({
      title: 'new group', body: h('div', { class: 'pa-form' }, name, grid,
        h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const r = await pickWho({ title: 'add someone', not: char.id, okLabel: 'add' }); if (r) { picked.set(r.id || 'n:' + r.name, r); draw(); } } }, 'add someone')),
      actions: [{
        label: 'create', kind: 'primary', onClick: close => {
          if (!picked.size) { toast('pick people'); return; }
          const c = { id: 'wc_' + uid(), group: true, name: name.value.trim() || [...picked.values()].map(r => r.name.split(' ')[0]).join(', '), members: [...picked.values()], msgs: [] };
          wa.chats.push(c); save(); close(); show('whatsapp', { view: 'chat', id: c.id }, 'push');
        },
      }],
    });
  }

  SCREENS.whatsapp = (p = {}) => {
    const v = p.view || 'chats';
    if (v === 'chat') return waChat(p);
    if (v === 'status') return waStatusView(p);
    const wrap = (title, right, ...kids) => h('div', { class: 'ph-app-screen pa-wa' },
      h('div', { class: 'pa-wa-head' }, h('button', { type: 'button', class: 'pa-wa-link', onclick: home }, ico.back()), h('span', { class: 'pa-grow' }), right),
      h('h3', { class: 'pa-wa-big' }, title), ...kids, waTabs(v));
    if (v === 'updates') {
      const byPerson = new Map();
      for (const st of [...wa.status].sort((a, b) => b.at - a.at)) { const k = refKey(st.by); if (!byPerson.has(k)) byPerson.set(k, st); }
      return wrap('updates', mine ? h('button', { type: 'button', class: 'pa-wa-circ', title: 'add status', onclick: waAddStatus }, ico.plus()) : null,
        h('div', { class: 'ph-scroll' },
          h('div', { class: 'pa-wa-sub' }, 'status'),
          h('div', { class: 'ph-group' }, h('button', { type: 'button', class: 'ph-row', onclick: () => { if (byPerson.has(refKey(me()))) show('whatsapp', { view: 'status', key: refKey(me()) }, 'zoom'); else if (mine) waAddStatus(); } },
            h('span', { class: 'pa-wa-ring' + (byPerson.has(refKey(me())) ? '' : ' none') }, portrait(char, 'md')), h('div', { class: 'ph-row-main' }, h('b', {}, 'my status'), h('div', { class: 'ph-row-sub' }, byPerson.has(refKey(me())) ? agoLong(byPerson.get(refKey(me())).at) : 'add to my status')))),
          [...byPerson.values()].filter(st => !isMe(st.by)).length ? [h('div', { class: 'pa-wa-sub' }, 'recent updates'),
            h('div', { class: 'ph-group' }, [...byPerson.values()].filter(st => !isMe(st.by)).map(st => h('button', { type: 'button', class: 'ph-row', onclick: () => show('whatsapp', { view: 'status', key: refKey(st.by) }, 'zoom') },
              h('span', { class: 'pa-wa-ring' }, face(st.by, 'md')), h('div', { class: 'ph-row-main' }, h('b', {}, who(st.by).name), h('div', { class: 'ph-row-sub' }, agoLong(st.at))))))] : null));
    }
    if (v === 'calls') {
      return wrap('calls', mine ? h('button', { type: 'button', class: 'pa-wa-circ', title: 'add call', onclick: waAddCall }, ico.plus()) : null,
        h('div', { class: 'ph-scroll' }, wa.calls.length ? h('div', { class: 'ph-group' }, [...wa.calls].reverse().map(c => h('div', { class: 'ph-row' },
          face(c.who, 'md'),
          h('div', { class: 'ph-row-main' }, h('b', { class: c.dir === 'missed' ? 'pa-red' : '' }, who(c.who).name), h('div', { class: 'ph-row-sub' }, h('span', { class: 'pa-wa-arrow ' + c.dir }, c.dir === 'out' ? '↗' : '↙'), ' ', c.dir === 'missed' ? 'missed' : c.dir === 'out' ? 'outgoing' : 'incoming')),
          h('span', { class: 'pa-wa-time' }, shortDay(c.at)),
          h('span', { class: 'pa-wa-callico' }, c.video ? ico.video() : ico.phone()),
          mine ? h('button', { type: 'button', class: 'pa-wa-x', title: 'delete', onclick: () => { wa.calls = wa.calls.filter(x => x !== c); save(); api.redraw(); } }, '✕') : null))) : h('div', { class: 'ph-empty' }, ico.phone())));
    }
    // chats
    const list = [...wa.chats].sort((a, b) => (b.msgs.at(-1)?.at || 0) - (a.msgs.at(-1)?.at || 0));
    return wrap('chats', mine ? h('div', { class: 'pa-wa-hbtns' }, h('button', { type: 'button', class: 'pa-wa-circ', title: 'new group', onclick: () => waNewChat(true) }, ico.users()), h('button', { type: 'button', class: 'pa-wa-circ green', title: 'new chat', onclick: () => waNewChat(false) }, ico.plus())) : null,
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'pa-wa-search' }, ico.search(), h('span', {}, 'ask meta ai or search')),
        h('div', { class: 'pa-wa-filters' }, ['all', 'unread', 'favorites', 'groups'].map((f, i) => h('span', { class: i === 0 ? 'on' : '' }, f))),
        list.length ? list.map(c => {
          const last = c.msgs.at(-1);
          return h('button', { type: 'button', class: 'pa-wa-row', 'data-id': c.id, onclick: () => show('whatsapp', { view: 'chat', id: c.id }, 'push') },
            chatFace(c, 'md'),
            h('div', { class: 'pa-wa-rmain' },
              h('div', { class: 'pa-wa-rtop' }, h('b', {}, chatName(c)), h('span', {}, last ? shortDay(last.at) : '')),
              h('div', { class: 'pa-wa-rsub' }, last && isMe(last.by) ? ico.ticks() : null,
                h('span', {}, last ? (c.group && !isMe(last.by) ? who(last.by).name.split(' ')[0] + ': ' : '') + (last.text || '📷 photo') : ''))));
        }) : h('div', { class: 'ph-empty' }, ico.chat())));
  };
  const shortDay = ts => (dayLabel(ts) === 'today' ? hm(ts) : dayLabel(ts));
  function waChat(p) {
    const c = wa.chats.find(x => x.id === p.id);
    if (!c) return SCREENS.whatsapp({});
    let as = me();
    const list = h('div', { class: 'ph-scroll pa-wa-msgs' });
    const input = h('input', { type: 'text', class: 'pa-wa-input', maxLength: 1000, placeholder: '', onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } } });
    function send(imageId = null) {
      const text = input.value.trim();
      if (!text && !imageId) return;
      c.msgs.push({ id: 'wm_' + uid(), by: freshRef(as), text, imageId, at: Date.now() });
      input.value = ''; save(); draw();
    }
    const asBtn = h('button', { type: 'button', class: 'pa-as pa-wa-as', title: 'who is texting' });
    const paintAs = () => fill(asBtn, face(as, 'xs'));
    asBtn.onclick = async () => {
      if (!c.group) { as = isMe(as) ? c.members[0] : me(); paintAs(); return; }
      const opts = [me(), ...c.members];
      const m = openModal({ title: 'as who?', body: h('div', { class: 'pa-sc-sendlist' }, opts.map(r => h('button', { type: 'button', class: 'pa-sc-sendrow' + (sameRef(r, as) ? ' on' : ''), onclick: () => { as = r; paintAs(); m.close(); } }, face(r, 'sm'), h('b', {}, who(r).name)))) });
    };
    paintAs();
    function draw() {
      let prevDay = null, prev = null;
      fill(list, c.msgs.map(m => {
        const day = dayLabel(m.at);
        const out = isMe(m.by);
        const tail = !prev || !sameRef(prev.by, m.by) || day !== prevDay;
        const el = [
          day !== prevDay ? h('div', { class: 'pa-wa-day' }, h('span', {}, day)) : null,
          h('div', { class: 'pa-wa-mrow ' + (out ? 'out' : 'in') },
            h('div', {
              class: 'pa-wa-bub' + (tail ? ' tail' : '') + (m.imageId ? ' pic' : ''),
              onclick: async () => { if (!mine) return; if (await confirmDialog('delete this message?', { danger: true, okLabel: 'delete' })) { c.msgs = c.msgs.filter(x => x !== m); dropImage(m.imageId); save(); draw(); } },
            },
              c.group && !out && tail ? h('b', { class: 'pa-wa-from', style: { color: who(m.by).color } }, who(m.by).name) : null,
              m.imageId ? pic(m.imageId, 'pa-wa-pic') : null,
              m.text ? h('span', { class: 'pa-wa-text' }, m.text) : null,
              h('span', { class: 'pa-wa-meta' }, hm(m.at), out ? ico.ticks() : null))),
        ];
        prevDay = day; prev = m;
        return el;
      }));
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }
    draw();
    return h('div', { class: 'ph-app-screen pa-wa pa-wa-chat' },
      h('div', { class: 'pa-wa-chead' },
        h('button', { type: 'button', class: 'pa-wa-link', title: 'back', onclick: () => show('whatsapp', {}, 'pop') }, ico.back()),
        chatFace(c, 'sm'),
        h('div', { class: 'pa-wa-cwho' }, h('b', {}, chatName(c)), h('span', {}, c.group ? ['you', ...c.members.map(r => who(r).name.split(' ')[0])].join(', ') : 'online')),
        h('span', { class: 'pa-grow' }),
        h('span', { class: 'pa-wa-link' }, ico.video()), h('span', { class: 'pa-wa-link' }, ico.phone()),
        mine ? h('button', {
          type: 'button', class: 'pa-wa-link', title: 'delete chat', onclick: async () => {
            if (!(await confirmDialog(`delete the chat with ${chatName(c)}?`, { danger: true, okLabel: 'delete' }))) return;
            wa.chats = wa.chats.filter(x => x !== c); c.msgs.forEach(m => dropImage(m.imageId)); save(); show('whatsapp', {}, 'pop');
          },
        }, ico.dots()) : null),
      list,
      mine ? h('div', { class: 'pa-wa-composer' },
        h('button', { type: 'button', class: 'pa-wa-link', title: 'photo', onclick: async () => { const [x] = await addPhotos(false, 1200); if (x) send(x.imageId); } }, ico.plus()),
        h('div', { class: 'pa-wa-inwrap' }, input, asBtn),
        h('button', { type: 'button', class: 'pa-wa-send', title: 'send', onclick: () => send() }, ico.send())) : null);
  }
  function waAddStatus() {
    let color = '#25d366';
    const sw = swatches(color, c => { color = c; }, ['#25d366', '#7e57c2', '#ec407a', '#ff7043', '#26a69a', '#5c6bc0', '#111111', '#ff4fa3']);
    compose({
      title: 'add status', placeholder: 'type a status', photo: true, okLabel: 'post',
      extra: { el: sw, get: () => ({ color }) },
      onDone: ({ by, text, imageId, color: col }) => { wa.status.push({ id: 'ws_' + uid(), by, text, imageId, color: col, at: Date.now() }); save(); api.redraw(); },
    });
  }
  async function waAddCall() {
    const ref = await pickWho({ title: 'call with', not: char.id, okLabel: 'next' });
    if (!ref) return;
    let dir = 'in', video = false;
    openModal({
      title: who(ref).name,
      body: h('div', { class: 'pa-form' },
        h('div', { class: 'segmented' }, [['in', 'incoming'], ['out', 'outgoing'], ['missed', 'missed']].map(([v, l], i) => h('button', { type: 'button', class: 'seg' + (i === 0 ? ' on' : ''), onclick: e => { dir = v; e.currentTarget.parentElement.querySelectorAll('.seg').forEach(x => x.classList.toggle('on', x === e.currentTarget)); } }, l))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: e => { video = e.target.checked; } }), 'video')),
      actions: [{ label: 'add', kind: 'primary', onClick: close => { wa.calls.push({ id: 'wcl_' + uid(), who: ref, dir, video, at: Date.now() }); save(); close(); api.redraw(); } }],
    });
  }
  function waStatusView(p) {
    const list = wa.status.filter(st => refKey(st.by) === p.key).sort((a, b) => a.at - b.at);
    const i = p.i || 0;
    const st = list[i];
    if (!st) return SCREENS.whatsapp({ view: 'updates' });
    const go = () => { if (i + 1 < list.length) show('whatsapp', { view: 'status', key: p.key, i: i + 1 }, null); else show('whatsapp', { view: 'updates' }, 'pop'); };
    const t = setTimeout(go, 5000);
    api.onLeave(() => clearTimeout(t));
    return h('div', { class: 'ph-app-screen pa-wa-sview', style: { background: st.imageId ? '#000' : st.color || '#25d366' }, onclick: go },
      st.imageId ? pic(st.imageId, 'pa-sc-full') : null,
      st.text ? h('div', { class: 'pa-wa-stext' + (st.imageId ? ' cap' : '') }, st.text) : null,
      h('div', { class: 'pa-sc-bars' }, list.map((_, k) => h('i', { class: k < i ? 'done' : k === i ? 'now' : '' }))),
      h('div', { class: 'pa-sc-vtop story' }, face(st.by, 'sm'), h('div', {}, h('b', {}, isMe(st.by) ? 'my status' : who(st.by).name), h('span', {}, agoLong(st.at))), h('span', { class: 'pa-grow' }),
        mine ? h('button', { type: 'button', class: 'pa-sc-glass', title: 'delete', onclick: e => { e.stopPropagation(); clearTimeout(t); wa.status = wa.status.filter(x => x !== st); dropImage(st.imageId); save(); show('whatsapp', { view: 'updates' }, 'pop'); } }, ico.dots()) : null));
  }

  // ======================================================================
  // bereal
  // ======================================================================
  const br = d.bereal;
  const postedToday = () => br.posts.some(x => isMe(x.by) && dayKey(x.at) === dayKey());
  const BR_EMOJI = ['👍', '😃', '😲', '😍', '😂', '⚡'];
  function brPost() {
    let as = me(), back = null, front = null, late = 0;
    const slot = (label, get, set) => {
      const b = h('button', { type: 'button', class: 'pa-br-slot' });
      const paint = () => fill(b, get() ? pic(get()) : h('span', {}, label));
      b.onclick = async () => { const [x] = await addPhotos(false, 1400); if (!x) return; if (get()) dropImage(get()); set(x.imageId); paint(); };
      paint();
      return b;
    };
    const cap = h('input', { type: 'text', maxLength: 80, placeholder: 'add a caption' });
    const lateSel = h('select', { onchange: e => { late = Number(e.target.value); } }, [[0, 'on time'], [4, '4 min late'], [30, '30 min late'], [120, '2h late'], [360, '6h late']].map(([v, l]) => h('option', { value: v }, l)));
    let posted = false;
    openModal({
      title: 'post a bereal',
      body: h('div', { class: 'pa-form' },
        h('div', { class: 'pa-compose-who' }, asChip(() => as, r => { as = r; }), h('span', {}, 'as')),
        h('div', { class: 'pa-br-slots' }, slot('back camera', () => back, x => { back = x; }), slot('front camera', () => front, x => { front = x; })),
        cap, lateSel),
      actions: [{
        label: 'post', kind: 'primary', onClick: close => {
          if (!back) { toast('pick the back camera photo'); return; }
          posted = true;
          br.posts.push({ id: 'br_' + uid(), by: freshRef(as), back, front, caption: cap.value.trim(), late, at: Date.now(), reacts: [] });
          save(); close(); api.redraw();
        },
      }],
      onClose: () => { if (!posted) { dropImage(back); dropImage(front); } },
    });
  }
  function realmoji(post) {
    pickAs('who reacted?').then(ref => {
      if (!ref) return;
      const m = openModal({
        title: 'realmoji', body: h('div', { class: 'pa-br-emojis' }, BR_EMOJI.map(e => h('button', { type: 'button', onclick: () => { post.reacts = post.reacts.filter(r => !sameRef(r.by, ref)); post.reacts.push({ by: ref, emoji: e }); save(); m.close(); api.redraw(); } }, e))),
      });
    });
  }
  SCREENS.bereal = () => {
    const posts = [...br.posts].sort((a, b) => b.at - a.at);
    const blurOthers = mine && !postedToday();
    return h('div', { class: 'ph-app-screen pa-br' },
      h('div', { class: 'pa-br-top' },
        h('button', { type: 'button', class: 'pa-ibtn', title: 'home', onclick: home }, ico.back()),
        h('b', { class: 'pa-br-word' }, 'BeReal.'),
        mine ? h('button', { type: 'button', class: 'pa-ibtn', title: 'post', onclick: brPost }, ico.cam()) : h('span')),
      h('div', { class: 'pa-br-tabs' }, h('span', { class: 'on' }, 'my friends'), h('span', {}, 'friends of friends')),
      h('div', { class: 'ph-scroll' },
        blurOthers ? h('div', { class: 'pa-br-alert' }, h('b', {}, 'time to bereal.'), h('span', {}, '2 min left to capture a bereal'), h('button', { type: 'button', class: 'pa-br-postbtn', onclick: brPost }, 'post a bereal')) : null,
        posts.length ? posts.map(post => {
          const blur = blurOthers && !isMe(post.by) && dayKey(post.at) === dayKey();
          const big = h('div', { class: 'pa-br-pic' + (blur ? ' blur' : '') });
          let swapped = false;
          const paint = () => fill(big,
            pic(swapped && post.front ? post.front : post.back, 'pa-br-main'),
            post.front ? h('button', { type: 'button', class: 'pa-br-small', title: 'swap', onclick: e => { e.stopPropagation(); swapped = !swapped; paint(); } }, pic(swapped ? post.back : post.front)) : null,
            blur ? h('div', { class: 'pa-br-blurmsg' }, h('b', {}, 'post to view')) : null,
            !blur ? h('button', { type: 'button', class: 'pa-br-rmbtn', title: 'realmoji', onclick: e => { e.stopPropagation(); if (mine) realmoji(post); } }, ico.smile()) : null,
            post.reacts.length && !blur ? h('div', { class: 'pa-br-reacts' }, post.reacts.slice(-4).map(r => h('span', { class: 'pa-br-rm' }, face(r.by, 'sm'), h('i', {}, r.emoji)))) : null);
          paint();
          return h('div', { class: 'pa-br-post', 'data-id': post.id },
            h('div', { class: 'pa-br-phead' }, face(post.by, 'sm'),
              h('div', {}, h('b', {}, isMe(post.by) ? nameOf(char) : who(post.by).name), h('span', {}, `${dayLabel(post.at)} · ${hmA(post.at)}`, post.late ? h('em', { class: 'pa-br-late' }, ' · ' + lateLabel(post.late)) : null)),
              mine ? h('button', {
                type: 'button', class: 'pa-ibtn', title: 'delete', onclick: async () => {
                  if (!(await confirmDialog('delete this bereal?', { danger: true, okLabel: 'delete' }))) return;
                  br.posts = br.posts.filter(x => x !== post); dropImage(post.back); dropImage(post.front); save(); api.redraw();
                },
              }, ico.dots()) : null),
            big,
            post.caption && !blur ? h('div', { class: 'pa-br-cap' }, post.caption) : null);
        }) : h('div', { class: 'ph-empty' }, h('b', { class: 'pa-br-word' }, 'BeReal.'))));
  };

  // ======================================================================
  // threads
  // ======================================================================
  const th = d.threadsapp;
  function thNew(replyTo = null) {
    compose({
      title: replyTo ? 'reply' : 'new thread', placeholder: replyTo ? `reply to ${who(replyTo.by).name}...` : "what's new?", photo: !replyTo, okLabel: 'post',
      onDone: ({ by, text, imageId }) => {
        if (replyTo) replyTo.replies.push({ id: 'tr_' + uid(), by, text, at: Date.now() });
        else th.posts.push({ id: 'th_' + uid(), by, text, imageId, at: Date.now(), likes: rnd(0, 60), liked: false, reposts: rnd(0, 8), reposted: false, replies: [] });
        save(); api.redraw();
      },
    });
  }
  function thPost(post, full = false) {
    const acts = h('div', { class: 'pa-th-acts' });
    const paint = () => fill(acts,
      h('button', { type: 'button', class: 'pa-th-act' + (post.liked ? ' liked' : ''), title: 'like', onclick: e => { e.stopPropagation(); if (!mine) return; post.liked = !post.liked; save(); paint(); } }, ico.heart(post.liked), h('span', {}, post.likes + (post.liked ? 1 : 0) || '')),
      h('button', { type: 'button', class: 'pa-th-act', title: 'reply', onclick: e => { e.stopPropagation(); if (mine) thNew(post); } }, ico.bubble(), h('span', {}, post.replies.length || '')),
      h('button', { type: 'button', class: 'pa-th-act' + (post.reposted ? ' reposted' : ''), title: 'repost', onclick: e => { e.stopPropagation(); if (!mine) return; post.reposted = !post.reposted; save(); paint(); } }, ico.repost(), h('span', {}, post.reposts + (post.reposted ? 1 : 0) || '')),
      h('button', { type: 'button', class: 'pa-th-act', title: 'share', onclick: e => { e.stopPropagation(); toast('link copied'); } }, ico.send()));
    paint();
    return h('div', { class: 'pa-th-post' + (full ? ' full' : ''), 'data-id': post.id, onclick: () => { if (!full) show('threads', { view: 'post', id: post.id }, 'push'); } },
      h('div', { class: 'pa-th-left' }, face(post.by, 'sm'), post.replies.length && full ? h('i', { class: 'pa-th-line' }) : null),
      h('div', { class: 'pa-th-body' },
        h('div', { class: 'pa-th-meta' }, h('b', {}, handleOf(post.by)), h('span', {}, ago(post.at)), h('span', { class: 'pa-grow' }),
          mine ? h('button', {
            type: 'button', class: 'pa-ibtn sm', title: 'delete', onclick: async e => {
              e.stopPropagation();
              if (!(await confirmDialog('delete this thread?', { danger: true, okLabel: 'delete' }))) return;
              th.posts = th.posts.filter(x => x !== post); dropImage(post.imageId); save(); show('threads', {}, full ? 'pop' : null);
            },
          }, ico.dots()) : null),
        post.text ? h('div', { class: 'pa-th-text' }, post.text) : null,
        post.imageId ? pic(post.imageId, 'pa-th-img') : null,
        acts));
  }
  SCREENS.threads = (p = {}) => {
    const v = p.view || 'home';
    const nav = tabBar('pa-th-nav', [['home', ico.home], ['search', ico.search], ['new', ico.plus], ['activity', () => ico.heart(false)], ['profile', ico.user]], v, id => {
      if (id === 'new') { if (mine) thNew(); return; }
      show('threads', { view: id }, null);
    });
    const wrap = (...kids) => h('div', { class: 'ph-app-screen pa-th' }, ...kids, nav);
    if (v === 'post') {
      const post = th.posts.find(x => x.id === p.id);
      if (!post) return SCREENS.threads({});
      return wrap(
        h('div', { class: 'pa-th-top' }, h('button', { type: 'button', class: 'pa-ibtn', title: 'back', onclick: () => show('threads', { view: p.from || 'home' }, 'pop') }, ico.back()), h('b', {}, 'thread'), h('span')),
        h('div', { class: 'ph-scroll' }, thPost(post, true),
          h('div', { class: 'pa-th-replies' }, post.replies.map(r => h('div', { class: 'pa-th-post reply' },
            h('div', { class: 'pa-th-left' }, face(r.by, 'sm')),
            h('div', { class: 'pa-th-body' }, h('div', { class: 'pa-th-meta' }, h('b', {}, handleOf(r.by)), h('span', {}, ago(r.at)), h('span', { class: 'pa-grow' }),
              mine ? h('button', { type: 'button', class: 'pa-ibtn sm', title: 'delete', onclick: () => { post.replies = post.replies.filter(x => x !== r); save(); api.redraw(); } }, '✕') : null),
            h('div', { class: 'pa-th-text' }, r.text))))),
          mine ? h('button', { type: 'button', class: 'pa-th-replybar', onclick: () => thNew(post) }, portrait(char, 'xs'), h('span', {}, `reply to ${handleOf(post.by)}...`)) : null));
    }
    if (v === 'search') {
      const out = h('div', {});
      const input = h('input', { type: 'text', class: 'pa-th-search-in', placeholder: 'search', maxLength: 60, oninput: () => draw() });
      const draw = () => {
        const q = input.value.trim().toLowerCase();
        const people = [char, ...allOcs(char.id)].filter(o => !q || nameOf(o).toLowerCase().includes(q));
        const posts = q ? th.posts.filter(x => x.text.toLowerCase().includes(q)).reverse() : [];
        fill(out,
          people.map(o => h('div', { class: 'pa-th-person' }, portrait(o, 'md'), h('div', {}, h('b', {}, handleOf({ id: o.id })), h('span', {}, nameOf(o))), h('button', { type: 'button', class: 'pa-th-follow' }, o === char ? 'you' : 'follow'))),
          posts.map(x => thPost(x)));
      };
      draw();
      return wrap(h('h3', { class: 'pa-th-big' }, 'search'), h('div', { class: 'pa-th-searchbar' }, ico.search(), input), h('div', { class: 'ph-scroll' }, out));
    }
    if (v === 'activity') {
      const acts = th.posts.filter(x => isMe(x.by)).flatMap(x => x.replies.filter(r => !isMe(r.by)).map(r => ({ r, x }))).sort((a, b) => b.r.at - a.r.at);
      return wrap(h('h3', { class: 'pa-th-big' }, 'activity'),
        h('div', { class: 'ph-scroll' }, acts.length ? acts.map(({ r, x }) => h('button', { type: 'button', class: 'pa-th-person', onclick: () => show('threads', { view: 'post', id: x.id, from: 'activity' }, 'push') },
          face(r.by, 'md'), h('div', {}, h('b', {}, handleOf(r.by), h('em', {}, ' ' + ago(r.at))), h('span', {}, r.text)))) : h('div', { class: 'ph-empty' }, ico.heart(false))));
    }
    if (v === 'profile') {
      let tab = p.tab || 'threads';
      const myPosts = th.posts.filter(x => isMe(x.by)).reverse();
      const myReplies = th.posts.filter(x => x.replies.some(r => isMe(r.by))).reverse();
      const followers = allOcs(char.id).slice(0, 3);
      return wrap(
        h('div', { class: 'pa-th-top' }, h('button', { type: 'button', class: 'pa-ibtn', title: 'home', onclick: home }, ico.back()), h('span'), h('span', { class: 'pa-ibtn' }, ico.menu())),
        h('div', { class: 'ph-scroll' },
          h('div', { class: 'pa-th-prof' },
            h('div', { 'data-acct-switch': true }, h('h2', {}, nameOf(char)), h('div', { class: 'pa-th-handle' }, handleOf(me()), h('span', {}, 'threads.net'))),
            portrait(char, 'md')),
          th.bio ? h('p', { class: 'pa-th-bio' }, th.bio) : null,
          h('div', { class: 'pa-th-fol' }, h('span', { class: 'pa-dc-stack' }, followers.map(o => portrait(o, 'xs'))), `${bigNum(th.followers)} followers`),
          mine ? h('div', { class: 'pa-th-pbtns' }, h('button', { type: 'button', class: 'pa-th-pbtn', onclick: editTh }, 'edit profile'), h('button', { type: 'button', class: 'pa-th-pbtn', onclick: () => toast('link copied') }, 'share profile')) : null,
          h('div', { class: 'pa-th-ptabs' }, [['threads', 'threads'], ['replies', 'replies']].map(([id, l]) => h('button', { type: 'button', class: tab === id ? 'on' : '', onclick: () => show('threads', { view: 'profile', tab: id }, null) }, l))),
          (tab === 'threads' ? myPosts : myReplies).map(x => thPost(x))));
    }
    // home feed
    const posts = [...th.posts].reverse();
    return wrap(
      h('div', { class: 'pa-th-top' }, h('button', { type: 'button', class: 'pa-ibtn', title: 'home', onclick: home }, ico.back()), threadsLogo(), h('span')),
      h('div', { class: 'ph-scroll' },
        mine ? h('button', { type: 'button', class: 'pa-th-new', onclick: () => thNew() }, portrait(char, 'sm'), h('div', {}, h('b', {}, handleOf(me())), h('span', {}, "what's new?")), h('em', {}, 'post')) : null,
        posts.length ? posts.map(x => thPost(x)) : h('div', { class: 'ph-empty' }, threadsLogo())));
  };
  function editTh() {
    const bio = h('textarea', { rows: 3, maxLength: 150, placeholder: 'bio', value: th.bio });
    const fol = h('input', { type: 'number', min: 0, value: th.followers });
    const top = accountBox(api, 'threads');
    openModal({
      title: 'edit profile', body: h('div', { class: 'pa-form' }, top?.el || null, bio, h('label', { class: 'pa-inline' }, h('span', {}, 'followers'), fol)),
      actions: [{ label: 'done', kind: 'primary', onClick: close => { if (top && !top.check()) return; top?.commit(); th.bio = bio.value.trim(); th.followers = Math.max(0, Number(fol.value) || 0); save(); close(); api.redraw(); } }],
    });
  }
}

// new snaps waiting on the lock screen
export function lockNotifs({ d, show }) {
  const sc = d.snapchat;
  if (!sc?.snaps) return [];
  const seen = new Set();
  return sc.snaps.filter(sn => sn.dir === 'in' && !sn.opened).sort((a, b) => b.at - a.at).filter(sn => { const k = refKey(sn.with); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 2)
    .map(sn => ({ app: 'snapchat', title: who(sn.with).name, text: 'sent you a snap', at: sn.at, faceOf: sn.with, open: () => show('snapchat', { view: 'chat' }, 'unlock') }));
}

export const badges = ({ d }) => ({ snapchat: (d.snapchat?.snaps || []).filter(sn => sn.dir === 'in' && !sn.opened).length });
