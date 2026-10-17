// computer apps: the browser (a mini web: searchie, myspace pages of the oc + worldmates, sites she makes),
// instant messenger (buddy list + chats that land on the other oc's computer too) and email.
// see the plug-in notes at the top of computer.js
//
// saved on the computer's data:
//   sites    [{ id, url, title, imageId, text, style: 'geo'|'blog'|'fan'|'clean', color }]
//   browser  { home }
//   im       { sn, away, isAway, buddies: [{ id: null, name, sn }], chats: [{ id, who: ref, msgs: [{ id, from: 'me'|'them', text, at, auto?, st? }], seenAt }] }
//   mail     [{ id, box: 'inbox'|'sent', from: ref, to: [ref], subject, body, at, read }]

import { h, fill, uid, openModal, swatches, segmented, toast, autosize } from '../ui.js';
import { store } from '../store.js';
import { pic, sticker, nameOf, portrait, worldmates, uploadPic, allOcs } from './kit.js';
import { who, face, freshRef, pickWho, refOf, hmA, shortDate, stamp, dropImage } from './phone-bits.js';
import { renderMyspace, msData } from './myspace.js';
import { menuBar, tbtn, ICO, logo, docText } from './computer-bits.js';

export const DEF = {
  sites: [], browser: { home: 'searchie.com' },
  im: { sn: '', away: '', isAway: false, buddies: [], chats: [] },
  mail: [],
};

export const APPS = {
  browser: { label: 'internet', labelNow: 'browser', icon: '1f310', w: 640, h: 440, minW: 300, render: browser, title: (p, api) => (api.look === 'y2k' ? 'oc explorer' : 'browser') },
  im: { label: 'messenger', labelNow: 'chat', icon: '1f4ac', w: 230, h: 420, wNow: 600, hNow: 400, minW: 200, render: im, title: (p, api) => (api.look === 'y2k' ? 'buddy list' : 'chat') },
  imchat: { label: 'instant message', icon: '1f4ac', w: 380, h: 340, minW: 240, hidden: true, only: 'y2k', multi: true, key: p => p.id || '', render: imChatWin, title: (p, api) => `${snOfRef(api, api.d.im.chats.find(c => c.id === p.id)?.who)} - instant message` },
  mail: { label: 'e-mail', labelNow: 'mail', icon: '1f4e7', w: 640, h: 420, minW: 300, render: mail, title: (p, api) => (api.look === 'y2k' ? 'inbox - oc mail' : 'mail') },
  compose: { label: 'new message', icon: '1f4e8', w: 480, h: 400, hidden: true, multi: true, key: p => p.key || uid(), render: compose, title: (p) => (p.subject ? p.subject : 'new message') },
};

// ---------------------------------------------------------------- shared bits
const slug = name => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'oc';
export const handleOf = c => (c.fun?.social?.handle || slug(nameOf(c))).toLowerCase();
const hash = str => [...String(str)].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
// screen names: what they picked on their computer, or a 2000s one made from their name
export function defaultSn(c) {
  const n = slug(nameOf(c).split(/\s+/)[0]), k = hash(c.id) % 90 + 10;
  return [`xX${n}Xx`, `${n}rawr${k}`, `${n}xoxo${k}`, `iheart${n}`, `${n}_${k}`, `sk8r${n}${k}`][hash(c.id + 'sn') % 6];
}
export const snOf = c => c?.fun?.computer?.im?.sn || defaultSn(c);
function snOfRef(api, ref) {
  if (!ref) return 'buddy';
  const c = ref.id ? store.char(ref.id) : null;
  if (c) return c.id === api.char.id ? (api.d.im.sn || defaultSn(c)) : snOf(c);
  return api.d.im.buddies.find(b => b.name === ref.name)?.sn || slug(ref.name);
}
const mailOf = (api, ref) => `${snOfRef(api, ref).toLowerCase()}@ocmail.com`;
const mates = api => worldmates(api.char.id);

// ---------------------------------------------------------------- browser
const norm = url => String(url || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
const SITE_STYLES = [['geo', 'homepage'], ['blog', 'blog'], ['fan', 'fan page'], ['clean', 'clean']];

function browser(win, api) {
  const { d, mine, look, char } = api;
  d.browser ||= { home: 'searchie.com' };
  const home = () => norm(d.browser.home) || 'searchie.com';
  win.tabs ||= [{ hist: [norm(win.params.url) || home()], i: 0 }];
  win.tab ??= 0;
  if (win.params.url && win.tabs[win.tab].hist[win.tabs[win.tab].i] !== norm(win.params.url)) navigate(win.params.url, false);
  win.params.url = null;
  let page = null;
  win.cleanup = () => page?.cleanup?.();
  const tab = () => win.tabs[win.tab];
  const url = () => tab().hist[tab().i];
  const addr = h('input', { type: 'text', class: 'cpb-addr', value: shown(url()), spellcheck: false, onkeydown: e => { if (e.key === 'Enter') navigate(addr.value); }, onfocus: e => e.target.select() });
  const view = h('div', { class: 'cpb-view' });
  function shown(u) { return look === 'y2k' ? 'http://www.' + u.replace(/^www\./, '') + (u.includes('/') ? '' : '/') : u; }
  function navigate(u, draw = true) {
    const t = win.tabs[win.tab];
    t.hist = t.hist.slice(0, t.i + 1);
    t.hist.push(norm(u) || home());
    t.i = t.hist.length - 1;
    if (draw) win.redraw();
  }
  const step = k => { const t = tab(); const i = t.i + k; if (i < 0 || i >= t.hist.length) return; t.i = i; win.redraw(); };

  const people = () => [char, ...mates(api)];
  const findOc = handle => people().find(c => handleOf(c) === handle) || null;
  const msUrl = c => 'myspace.com/' + handleOf(c);
  const titleOf = u => {
    if (u === 'searchie.com' || u.startsWith('searchie.com/')) return 'searchie';
    if (u.startsWith('myspace.com')) { const c = findOc(u.split('/')[1] || handleOf(char)); return c ? `myspace.com | ${c.fun?.social?.display || nameOf(c)}` : 'myspace.com'; }
    const site = d.sites.find(x => norm(x.url) === u);
    return site ? site.title : look === 'y2k' ? 'the page cannot be displayed' : "can't reach this page";
  };

  function drawPage() {
    page?.cleanup?.();
    page = null;
    const u = url();
    let content;
    if (u === 'searchie.com' || u === '') content = searchHome();
    else if (u.startsWith('searchie.com/search')) content = results(decodeURIComponent(u.split('q=')[1] || '').replace(/\+/g, ' '));
    else if (u === 'myspace.com' || u.startsWith('myspace.com/')) {
      const c = findOc(u.split('/')[1] || handleOf(char));
      if (!c) content = notFound(u);
      else {
        const own = c.id === char.id;
        page = renderMyspace(c, {
          mine: own && mine, canComment: mine && store.isMine(c), viewer: own ? null : char,
          save: () => { if (store.isMine(c)) store.save('char', c); },
          openFriend: f => { if (people().some(p => p.id === f.id)) navigate(msUrl(f)); else toast(`${nameOf(f)} isn't in this world`); },
        });
        content = page;
      }
    } else {
      const site = d.sites.find(x => norm(x.url) === u);
      content = site ? sitePage(site) : notFound(u);
    }
    fill(view, content);
    view.scrollTop = 0;
    win.setTitle(look === 'y2k' ? `${titleOf(u)} - oc explorer` : titleOf(u));
  }

  // searchie: the search engine homepage
  function searchBox(q = '') {
    const input = h('input', { type: 'text', class: 'cps-q', value: q, onkeydown: e => { if (e.key === 'Enter') go(); } });
    const go = () => { const v = input.value.trim(); if (v) navigate('searchie.com/search?q=' + encodeURIComponent(v)); };
    const spooky = () => { const all = [...people().map(msUrl), ...d.sites.map(x => norm(x.url))]; navigate(all[Math.floor(Math.random() * all.length)] || 'myspace.com'); };
    return h('div', { class: 'cps-box' }, input, h('div', { class: 'cps-btns' }, h('button', { type: 'button', class: 'cps-go', onclick: go }, 'searchie search'), h('button', { type: 'button', class: 'cps-go', onclick: spooky }, "i'm feeling spooky")));
  }
  const searchLogo = (sm = '') => h('div', { class: 'cps-logo ' + sm }, [...'searchie'].map(ch => h('span', {}, ch)));
  function searchHome() {
    return h('div', { class: 'cps cps-home' },
      searchLogo(),
      searchBox(),
      h('div', { class: 'cps-links' }, bookmarks().map(b => h('button', { type: 'button', class: 'cps-link', onclick: () => navigate(b.url) }, b.label))));
  }
  function results(q) {
    const ql = q.toLowerCase();
    const words = ql.split(/\s+/).filter(Boolean);
    const hit = txt => words.some(w => (txt || '').toLowerCase().includes(w));
    const found = [
      ...people().filter(c => hit(nameOf(c)) || hit(handleOf(c)) || hit(c.fun?.social?.display)).map(c => ({ url: msUrl(c), title: `${c.fun?.social?.display || nameOf(c)}'s myspace`, text: c.fun?.social?.headline || c.tagline || `myspace is a place for friends. ${nameOf(c)} is on myspace.` })),
      ...d.sites.filter(x => hit(x.title) || hit(x.text) || hit(x.url)).map(x => ({ url: norm(x.url), title: x.title, text: (x.text || '').slice(0, 140) })),
      ...[`${q} lyrics`, `${q} - the free encyclopedia`, `${q} fan forum`, `${q} quiz: which one are u??`].map(t => ({ url: slug(t) + '.com', title: t, text: '', dead: true })),
    ];
    return h('div', { class: 'cps cps-results' },
      h('div', { class: 'cps-top' }, searchLogo('sm'), searchBox(q)),
      h('div', { class: 'cps-count' }, `results 1 - ${found.length} for `, h('b', {}, q)),
      found.map(r => h('div', { class: 'cps-r' },
        h('button', { type: 'button', class: 'cps-r-title', onclick: () => navigate(r.url) }, r.title),
        r.text ? h('div', { class: 'cps-r-text' }, r.text) : null,
        h('div', { class: 'cps-r-url' }, 'www.' + r.url))));
  }
  function notFound(u) {
    api.ding();
    return look === 'y2k'
      ? h('div', { class: 'cpb-err' }, h('div', { class: 'cpb-err-head' }, h('i', { class: 'cpb-err-ico' }), h('h3', {}, 'the page cannot be displayed')), h('hr'),
        h('p', {}, `the page you are looking for is currently unavailable. the web site might be experiencing technical difficulties.`), h('p', { class: 'cpb-err-url' }, 'http://www.' + u),
        h('p', {}, 'cannot find server or dns error'), h('button', { type: 'button', class: 'cp-btn', onclick: () => navigate(home()) }, 'home'))
      : h('div', { class: 'cpb-err mod' }, h('div', { class: 'cpb-err-face' }, ':('), h('h3', {}, "hmm... can't reach this page"), h('p', {}, h('b', {}, u), " took too long to respond."), h('button', { type: 'button', class: 'cp-btn primary', onclick: () => navigate(home()) }, 'go home'));
  }
  function sitePage(site) {
    const canEdit = mine;
    const edit = canEdit ? h('button', { type: 'button', class: 'cpb-site-edit', onclick: () => editSite(api, site, () => win.redraw()) }, 'edit') : null;
    const img = site.imageId ? pic(site.imageId, 'cpb-site-img') : null;
    const text = h('div', { class: 'cpb-site-text' }, site.text || '');
    const st = site.style || 'geo';
    const visits = 1000 + hash(site.id) % 9000;
    const body = st === 'geo'
      ? [h('marquee', { class: 'cpb-geo-title', scrollamount: 5 }, site.title), h('div', { class: 'cpb-geo-con' }, h('i'), 'under construction', h('i')), img, text,
        h('div', { class: 'cpb-geo-count' }, 'you are visitor #', h('b', {}, String(visits).padStart(6, '0'))), h('div', { class: 'cpb-geo-foot' }, 'best viewed in 800x600 • sign my guestbook!')]
      : st === 'blog'
        ? [h('div', { class: 'cpb-blog-head' }, h('h1', {}, site.title), h('span', {}, norm(site.url))), h('div', { class: 'cpb-blog-main' }, h('div', { class: 'cpb-blog-side' }, img || portrait(char, 'cpb-blog-pfp'), h('b', {}, nameOf(char))), h('div', { class: 'cpb-blog-entry' }, h('div', { class: 'cpb-blog-date' }, new Date(site.at || Date.now()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase()), text))]
        : st === 'fan'
          ? [h('h1', { class: 'cpb-fan-title' }, site.title), img ? h('div', { class: 'cpb-fan-frame' }, img) : null, text, h('div', { class: 'cpb-fan-hearts' }, '♥ ♥ ♥')]
          : [img ? h('div', { class: 'cpb-clean-hero' }, img) : null, h('h1', { class: 'cpb-clean-title' }, site.title), text];
    return h('div', { class: 'cpb-site st-' + st, style: { '--site': site.color || '#ff4fa3' } }, edit, body);
  }
  function bookmarks() {
    return [
      { url: 'searchie.com', label: 'searchie', icon: '1f50d' },
      ...people().map(c => ({ url: msUrl(c), label: c.id === char.id ? 'my myspace' : `${(c.fun?.social?.display || nameOf(c)).split(' ')[0]}'s myspace`, icon: '1f46b' })),
      ...d.sites.map(x => ({ url: norm(x.url), label: x.title, icon: '1f310' })),
    ];
  }
  const newSite = () => editSite(api, null, s2 => navigate(s2.url));
  const links = h('div', { class: 'cpb-links' },
    look === 'y2k' ? h('span', { class: 'cpb-links-label' }, 'links') : null,
    bookmarks().map(b => h('button', { type: 'button', class: 'cpb-bm', 'data-url': b.url, title: b.url, onclick: () => navigate(b.url) }, sticker(b.icon, 'cpb-bm-ico'), h('span', {}, b.label))),
    mine ? h('button', { type: 'button', class: 'cpb-bm cpb-bm-new', title: 'make a site', onclick: newSite }, ICO.plus(), h('span', {}, 'make a site')) : null);
  const nav = [
    tbtn('back', [ICO.back(), look === 'y2k' ? h('span', {}, 'back') : null], () => step(-1), 'wide' + (tab().i > 0 ? '' : ' off')),
    tbtn('forward', ICO.fwd(), () => step(1), tab().i < tab().hist.length - 1 ? '' : 'off'),
    tbtn('refresh', ICO.refresh(), () => win.redraw()),
    tbtn('home', ICO.home(), () => navigate(home())),
  ];
  drawPage();
  if (look === 'y2k') {
    return h('div', { class: 'cpb' },
      menuBar([
        ['file', [['new window', () => toast('one window is plenty')], ['make a site', newSite, { off: !mine }], null, ['close', () => win.close()]]],
        ['favorites', bookmarks().map(b => [b.label, () => navigate(b.url)])],
        ['tools', [['set this as my home page', () => { d.browser.home = url(); api.save(); }, { off: !mine }]]],
      ]),
      h('div', { class: 'cp-toolbar' }, nav, h('span', { class: 'cp-spin-globe' }, logo())),
      h('div', { class: 'cp-toolbar cpb-addr-row' }, h('span', { class: 'cp-addr-label' }, 'address'), h('div', { class: 'cpb-addr-wrap' }, sticker('1f310', 'cp-addr-ico'), addr), h('button', { type: 'button', class: 'cpb-go', onclick: () => navigate(addr.value) }, h('i'), 'go')),
      links, view,
      h('div', { class: 'cp-status' }, h('span', {}, 'done'), h('span', { class: 'cp-status-zone' }, sticker('1f310', 'cp-status-ico'), 'internet')));
  }
  const tabsEl = h('div', { class: 'cpb-tabs' },
    win.tabs.map((t, i) => h('div', { class: 'cpb-tab' + (i === win.tab ? ' on' : ''), onclick: () => { win.tab = i; win.redraw(); } },
      h('span', {}, titleOf(t.hist[t.i])),
      win.tabs.length > 1 ? h('button', { type: 'button', class: 'cpb-tab-x', title: 'close tab', onclick: e => { e.stopPropagation(); win.tabs.splice(i, 1); win.tab = Math.min(win.tab, win.tabs.length - 1); win.redraw(); } }, '✕') : null)),
    h('button', { type: 'button', class: 'cpb-tab-new', title: 'new tab', onclick: () => { win.tabs.push({ hist: [home()], i: 0 }); win.tab = win.tabs.length - 1; win.redraw(); } }, '+'));
  return h('div', { class: 'cpb' }, tabsEl, h('div', { class: 'cp-toolbar cpb-addr-row' }, nav, h('div', { class: 'cpb-addr-wrap' }, ICO.search(), addr),
    mine ? tbtn('make this my home page', ICO.star(), () => { d.browser.home = url(); api.save(); toast('home page set'); }) : null), links, view);
}

// make or change a site (title, address, picture, words, look)
function editSite(api, site, done) {
  const { d } = api;
  const draft = site ? { ...site } : { id: 's_' + uid(), url: '', title: '', imageId: null, text: '', style: api.look === 'y2k' ? 'geo' : 'clean', color: '#ff4fa3', at: Date.now() };
  const title = h('input', { type: 'text', value: draft.title, maxLength: 60, placeholder: 'title', 'data-autofocus': '' });
  const addr = h('input', { type: 'text', value: draft.url, maxLength: 60, placeholder: 'address' });
  title.addEventListener('input', () => { if (!site && !addr.dataset.touched) addr.value = slug(title.value) + (title.value ? '.com' : ''); });
  addr.addEventListener('input', () => { addr.dataset.touched = '1'; });
  const text = h('textarea', { rows: 6, maxLength: 4000, placeholder: 'words' }, draft.text);
  const picBox = h('div', { class: 'cpb-ed-pic' });
  const drawPic = () => fill(picBox, draft.imageId ? pic(draft.imageId, 'cpb-ed-img') : null,
    h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const up = await uploadPic(1200); if (up) { if (draft.imageId && draft.imageId !== site?.imageId) dropImage(draft.imageId); draft.imageId = up.imageId; drawPic(); } } }, draft.imageId ? 'change picture' : 'add picture'),
    draft.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { if (draft.imageId !== site?.imageId) dropImage(draft.imageId); draft.imageId = null; drawPic(); } }, 'remove') : null);
  drawPic();
  const sec = (label, ...kids) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), ...kids);
  openModal({
    title: site ? 'edit site' : 'make a site', wide: true,
    body: h('div', { class: 'cpb-ed' }, sec('title', title), sec('address', addr), sec('picture', picBox), sec('words', text),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'look'), segmented(SITE_STYLES.map(([value, label]) => ({ value, label })), draft.style, v => { draft.style = v; })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'color'), swatches(draft.color, v => { draft.color = v; }, ['#ff4fa3', '#ff8ac4', '#b18cff', '#6ec6ff', '#7df9d0', '#ffd84d', '#d81e5b', '#141114', '#39d353', '#ff7a3d']))),
    actions: [
      site ? { label: 'delete site', kind: 'ghost', onClick: close => { close(); api.toBin('site', site); api.refresh('browser'); } } : null,
      { label: site ? 'save' : 'make it', kind: 'primary', onClick: close => {
        const t = title.value.trim();
        if (!t) { title.focus(); return; }
        let u = norm(addr.value) || slug(t) + '.com';
        if (!u.includes('.')) u += '.com';
        if (u.startsWith('myspace.com') || u.startsWith('searchie.com') || d.sites.some(x => x !== site && norm(x.url) === u)) { toast('that address is taken'); addr.focus(); return; }
        Object.assign(draft, { title: t, url: u, text: text.value });
        if (site) Object.assign(site, draft); else d.sites.push(draft);
        api.save();
        close();
        done?.(site || draft);
      } },
    ].filter(Boolean),
  });
}

// ---------------------------------------------------------------- instant messenger
const IM_COLORS = ['#000000', '#ff0000', '#0000ff', '#ff00ff', '#008000', '#ff6600', '#9900cc', '#ff4fa3'];

function imSetup(api) {
  const im = api.d.im;
  im.buddies ||= []; im.chats ||= [];
  for (const c of im.chats) { c.msgs ||= []; c.seenAt ||= 0; }
  return im;
}
// everyone on the buddy list: worldmates, then typed names
function buddies(api) {
  const im = imSetup(api);
  return [
    ...mates(api).map(c => ({ ref: refOf(c), sn: snOf(c), away: c.fun?.computer?.im?.isAway ? c.fun.computer.im.away || 'away' : '', oc: c })),
    ...im.buddies.map(b => ({ ref: { id: null, name: b.name }, sn: b.sn || slug(b.name), away: '', typed: b })),
  ];
}
function chatWith(api, ref, make = true) {
  const im = imSetup(api);
  let c = im.chats.find(x => (ref.id ? x.who.id === ref.id : !x.who.id && x.who.name.toLowerCase() === ref.name.toLowerCase()));
  if (!c && make) { c = { id: 'c_' + uid(), who: freshRef(ref), msgs: [], seenAt: Date.now() }; im.chats.push(c); api.save(); }
  return c;
}
const unread = c => c.msgs.filter(m => m.from === 'them' && m.at > (c.seenAt || 0)).length;

// a chat on the other oc's computer (only ocs you made, in the same world)
function otherChat(fromChar, ref) {
  const other = ref?.id ? store.char(ref.id) : null;
  if (!other || other.id === fromChar.id || !store.isMine(other) || !store.isMine(fromChar)) return null;
  if (!worldmates(fromChar.id).some(c => c.id === other.id)) return null;
  other.fun ||= {};
  const cd = other.fun.computer ||= {};
  const im = cd.im ||= { sn: '', away: '', isAway: false, buddies: [], chats: [] };
  im.chats ||= [];
  let t = im.chats.find(x => x.who?.id === fromChar.id);
  if (!t) { t = { id: 'c_' + uid(), who: { id: fromChar.id, name: nameOf(fromChar) }, msgs: [], seenAt: 0 }; im.chats.push(t); }
  return { other, t };
}
function mirrorIm(fromChar, ref, m) {
  const o = otherChat(fromChar, ref);
  if (!o || o.t.msgs.some(x => x.id === m.id)) return;
  o.t.msgs.push({ ...m, from: m.from === 'me' ? 'them' : 'me' });
  o.t.msgs.sort((a, b) => a.at - b.at);
  store.save('char', o.other);
}
// send a line in a chat. as = 'me' or 'them'
function sendIm(api, c, text, as, st) {
  const m = { id: 'm_' + uid(), from: as, text, at: Date.now(), st: st || null };
  c.msgs.push(m);
  if (as === 'me') c.seenAt = m.at;
  mirrorIm(api.char, c.who, m);
  // they're away: their away message comes back
  const other = c.who.id ? store.char(c.who.id) : null;
  const theirIm = other?.fun?.computer?.im;
  if (as === 'me' && theirIm?.isAway && !c.msgs.slice(-4, -1).some(x => x.auto)) {
    const auto = { id: 'm_' + uid(), from: 'them', text: theirIm.away || 'away', at: Date.now() + 1, auto: true };
    c.msgs.push(auto);
    c.seenAt = auto.at;
    mirrorIm(api.char, c.who, auto);
  }
  api.save();
}

// texts that only got to one side before (sent before they shared a world): pull them over
function catchUpIm(api) {
  const { char } = api;
  if (!store.isMine(char)) return;
  let changed = false;
  for (const mate of mates(api)) {
    if (!store.isMine(mate)) continue;
    for (const theirs of mate.fun?.computer?.im?.chats || []) {
      if (theirs.who?.id !== char.id || !theirs.msgs?.length) continue;
      const c = chatWith(api, refOf(mate));
      for (const m of theirs.msgs) {
        if (c.msgs.some(x => x.id === m.id)) continue;
        c.msgs.push({ ...m, from: m.from === 'me' ? 'them' : 'me' });
        changed = true;
      }
      c.msgs.sort((a, b) => a.at - b.at);
    }
  }
  if (changed) api.save();
}

function openChat(api, c) {
  if (api.look === 'y2k') api.open('imchat', { id: c.id });
  else api.open('im', { chat: c.id });
}

async function addBuddy(api, done) {
  const ref = await pickWho({ title: 'add buddy', not: api.char.id, okLabel: 'add' });
  if (!ref) return;
  if (!ref.id) {
    const im = imSetup(api);
    if (!im.buddies.some(b => b.name.toLowerCase() === ref.name.toLowerCase())) im.buddies.push({ id: null, name: ref.name, sn: slug(ref.name) });
  }
  const c = chatWith(api, ref);
  api.save();
  done?.();
  openChat(api, c);
}
function awayBox(api, done) {
  const im = imSetup(api);
  const ta = h('textarea', { rows: 4, maxLength: 300, placeholder: 'away message', 'data-autofocus': '' }, im.away || '');
  const sn = h('input', { type: 'text', maxLength: 24, value: im.sn || defaultSn(api.char), placeholder: 'screen name' });
  openModal({
    title: api.look === 'y2k' ? 'away message' : 'status',
    body: h('div', { class: 'cpi-away-box' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'screen name'), sn), h('label', { class: 'field' }, h('span', { class: 'field-label' }, api.look === 'y2k' ? 'away message' : 'status'), ta)),
    actions: [
      im.isAway ? { label: "i'm back", kind: 'ghost', onClick: close => { im.isAway = false; api.save(); close(); done?.(); } } : null,
      { label: im.isAway ? 'save' : api.look === 'y2k' ? "i'm away" : 'set status', kind: 'primary', onClick: close => { im.away = ta.value.trim(); im.sn = sn.value.trim().replace(/\s+/g, '') || defaultSn(api.char); im.isAway = !!im.away; api.save(); close(); done?.(); } },
    ].filter(Boolean),
  });
}

// the buddy list (y2k) / the whole chat app (modern)
function im(win, api) {
  const { mine, look, char } = api;
  const imd = imSetup(api);
  const mySn = imd.sn || defaultSn(char);
  if (look === 'modern') return imModern(win, api);
  const buds = buddies(api);
  const row = b => {
    const c = chatWith(api, b.ref, false);
    const n = c ? unread(c) : 0;
    return h('button', {
      type: 'button', class: 'cpi-bud' + (b.away ? ' away' : '') + (n ? ' new' : ''), 'data-sn': b.sn,
      ondblclick: () => openChat(api, chatWith(api, b.ref)), onclick: () => { if (api.small()) openChat(api, chatWith(api, b.ref)); },
    }, h('i', { class: 'cpi-door', style: { animationDelay: (Math.random() * 1.6).toFixed(2) + 's' } }), h('span', {}, b.sn), b.away ? h('i', { class: 'cpi-note' }) : null, n ? h('b', { class: 'cpi-n' }, n) : null);
  };
  const ocs = buds.filter(b => b.oc), typed = buds.filter(b => !b.oc);
  const group = (label, list, total) => h('details', { class: 'cpi-group', open: true }, h('summary', {}, `${label} (${list.length}/${total})`), list.map(row));
  return h('div', { class: 'cpi-list' },
    h('div', { class: 'cpi-brand' }, sticker('1f4ac', 'cpi-brand-stk'), h('div', {}, h('b', {}, 'oc instant'), h('span', {}, 'messenger'))),
    h('div', { class: 'cpi-me' + (imd.isAway ? ' away' : '') }, api.acctPic('cpi-me-pic'), h('div', {}, h('b', {}, mySn), h('span', {}, imd.isAway ? imd.away : 'available'))),
    h('div', { class: 'cpi-buds' }, group('buddies', ocs, ocs.length), group('other', typed, typed.length)),
    h('div', { class: 'cpi-foot' },
      mine ? h('button', { type: 'button', class: 'cpi-fb', onclick: () => addBuddy(api, () => win.redraw()) }, sticker('1f46d', 'cpi-fb-ico'), 'add') : null,
      mine ? h('button', { type: 'button', class: 'cpi-fb', onclick: () => awayBox(api, () => win.redraw()) }, sticker('1f4dd', 'cpi-fb-ico'), imd.isAway ? 'back' : 'away') : null));
}

// a chat: the log, the little formatting bar, who's typing, send
function chatPane(win, api, c, { modern = false } = {}) {
  const { mine, char } = api;
  const im = imSetup(api);
  win.as ||= 'me';
  win.st ||= { color: '#000000', b: false, i: false, size: 13 };
  const st = win.st;
  const mySn = im.sn || defaultSn(char);
  const theirSn = snOfRef(api, c.who);
  const log = h('div', { class: 'cpi-log' });
  const lineFor = (m, prev) => {
    const me = m.from === 'me';
    const style = m.st ? { color: m.st.color, fontWeight: m.st.b ? '700' : null, fontStyle: m.st.i ? 'italic' : null, fontSize: m.st.size ? m.st.size + 'px' : null } : {};
    if (modern) {
      const grouped = prev && prev.from === m.from && m.at - prev.at < 5 * 60e3 && !m.auto;
      return h('div', { class: 'cpi-m' + (grouped ? ' grouped' : '') + (m.auto ? ' auto' : '') },
        grouped ? h('span', { class: 'cpi-m-gap' }) : (me ? api.acctPic('cpi-m-pic') : face(c.who, 'cpi-m-pic')),
        h('div', { class: 'cpi-m-main' },
          grouped ? null : h('div', { class: 'cpi-m-top' }, h('b', {}, me ? nameOf(char) : who(c.who).name), h('span', {}, stamp(m.at))),
          h('div', { class: 'cpi-m-text' }, m.auto ? h('em', {}, 'away: ') : null, m.text)));
    }
    return h('div', { class: 'cpi-line' + (m.auto ? ' auto' : '') },
      h('b', { class: me ? 'cpi-sn me' : 'cpi-sn them' }, me ? mySn : theirSn), m.auto ? h('span', { class: 'cpi-auto' }, ' <auto response>') : null, h('span', { class: 'cpi-time' }, ` (${hmA(m.at)})`), ': ',
      h('span', { class: 'cpi-text', style }, m.text));
  };
  const drawLog = () => {
    fill(log, c.msgs.map((m, i) => lineFor(m, c.msgs[i - 1])));
    log.scrollTop = log.scrollHeight;
  };
  drawLog();
  win.chatLog = { id: c.id, draw: drawLog };
  const input = h('textarea', { class: 'cpi-input', rows: 2, maxLength: 1000, disabled: !mine, placeholder: modern ? `message @${theirSn}` : '' });
  const paintInput = () => { if (!modern) Object.assign(input.style, { color: st.color, fontWeight: st.b ? '700' : '400', fontStyle: st.i ? 'italic' : 'normal' }); };
  paintInput();
  const asBtn = h('button', { type: 'button', class: 'cpi-as', title: 'switch who is typing' });
  const drawAs = () => fill(asBtn, win.as === 'me' ? api.acctPic('cpi-as-pic') : face(c.who, 'cpi-as-pic'), h('span', {}, win.as === 'me' ? mySn : theirSn));
  drawAs();
  asBtn.onclick = () => { win.as = win.as === 'me' ? 'them' : 'me'; drawAs(); input.focus(); };
  const send = () => {
    const t = input.value.trim();
    if (!t || !mine) return;
    sendIm(api, c, t, win.as, modern ? null : { ...st });
    input.value = '';
    drawLog();
    api.refresh(api.look === 'y2k' ? 'im' : '__none');
    if (modern) win.redrawList?.();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  const fmt = modern ? null : h('div', { class: 'cpi-fmt' },
    h('button', { type: 'button', class: 'cpi-f', title: 'smaller', onclick: () => { st.size = Math.max(10, st.size - 2); } }, 'A', h('sub', {}, '-')),
    h('button', { type: 'button', class: 'cpi-f', title: 'bigger', onclick: () => { st.size = Math.min(22, st.size + 2); } }, 'A', h('sup', {}, '+')),
    h('button', { type: 'button', class: 'cpi-f' + (st.b ? ' on' : ''), title: 'bold', onclick: e => { st.b = !st.b; e.currentTarget.classList.toggle('on', st.b); paintInput(); } }, h('b', {}, 'B')),
    h('button', { type: 'button', class: 'cpi-f' + (st.i ? ' on' : ''), title: 'italic', onclick: e => { st.i = !st.i; e.currentTarget.classList.toggle('on', st.i); paintInput(); } }, h('i', {}, 'I')),
    h('div', { class: 'cpi-colors' }, IM_COLORS.map(col => h('button', { type: 'button', class: 'cpi-col' + (st.color === col ? ' on' : ''), style: { background: col }, title: col, onclick: e => { st.color = col; e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); paintInput(); } }))));
  const markSeen = () => { const last = c.msgs.at(-1); if (last && last.at > (c.seenAt || 0)) { c.seenAt = last.at; api.save(); } };
  markSeen();
  return h('div', { class: 'cpi-chat' },
    log, fmt,
    h('div', { class: 'cpi-send-row' }, input),
    h('div', { class: 'cpi-btn-row' }, mine ? asBtn : null, h('span', { class: 'cpi-sp' }), mine ? h('button', { type: 'button', class: 'cpi-send', onclick: send }, 'send') : null));
}

function imChatWin(win, api) {
  const c = imSetup(api).chats.find(x => x.id === win.params.id);
  if (!c) return h('div', { class: 'cp-oops' }, 'this chat is gone');
  return h('div', { class: 'cpi-win' }, h('div', { class: 'cpi-to' }, 'to: ', h('b', {}, snOfRef(api, c.who)), (() => { const b = buddies(api).find(x => x.ref.id && x.ref.id === c.who.id); return b?.away ? h('span', { class: 'cpi-to-away' }, ` (away: ${b.away})`) : null; })()), chatPane(win, api, c));
}

function imModern(win, api) {
  const { mine, char } = api;
  const imd = imSetup(api);
  const buds = buddies(api);
  for (const b of buds) chatWith(api, b.ref, false);
  const list = [...imd.chats].sort((a, b) => (b.msgs.at(-1)?.at || 0) - (a.msgs.at(-1)?.at || 0));
  win.chatId = win.params.chat || win.chatId || list[0]?.id || null;
  const cur = imd.chats.find(x => x.id === win.chatId);
  const side = h('div', { class: 'cpi-side' });
  const drawSide = () => fill(side,
    h('div', { class: 'cpi-side-head' }, h('b', {}, 'messages'), mine ? h('button', { type: 'button', class: 'cpi-new', title: 'new message', onclick: () => addBuddy(api, () => win.redraw()) }, '+') : null),
    h('div', { class: 'cpi-dms' },
      buds.filter(b => !chatWith(api, b.ref, false)).map(b => h('button', { type: 'button', class: 'cpi-dm', onclick: () => { win.params.chat = chatWith(api, b.ref).id; win.redraw(); } },
        h('span', { class: 'cpi-dm-pic' }, face(b.ref, 'cpi-dm-face'), h('i', { class: 'cpi-dot' + (b.away ? ' idle' : '') })), h('div', { class: 'cpi-dm-txt' }, h('b', {}, who(b.ref).name), h('span', {}, b.away || 'online')))),
      list.map(c => {
        const b = buds.find(x => (c.who.id ? x.ref.id === c.who.id : x.ref.name === c.who.name));
        const last = c.msgs.at(-1);
        return h('button', { type: 'button', class: 'cpi-dm' + (c.id === win.chatId ? ' on' : '') + (unread(c) ? ' new' : ''), 'data-chat': c.id, onclick: () => { win.params.chat = c.id; win.chatId = c.id; win.redraw(); } },
          h('span', { class: 'cpi-dm-pic' }, face(c.who, 'cpi-dm-face'), h('i', { class: 'cpi-dot' + (b?.away ? ' idle' : '') })),
          h('div', { class: 'cpi-dm-txt' }, h('b', {}, who(c.who).name), h('span', {}, last ? last.text : b?.away || 'online')),
          unread(c) ? h('i', { class: 'cpi-badge' }, unread(c)) : null);
      })),
    h('button', { type: 'button', class: 'cpi-self', onclick: () => mine && awayBox(api, () => win.redraw()) },
      h('span', { class: 'cpi-dm-pic' }, api.acctPic('cpi-dm-face'), h('i', { class: 'cpi-dot' + (imd.isAway ? ' idle' : '') })),
      h('div', { class: 'cpi-dm-txt' }, h('b', {}, nameOf(char)), h('span', {}, imd.isAway ? imd.away : imd.sn || defaultSn(char)))));
  drawSide();
  win.redrawList = drawSide;
  win.params.chat = null;
  const b = cur ? buds.find(x => (cur.who.id ? x.ref.id === cur.who.id : x.ref.name === cur.who.name)) : null;
  return h('div', { class: 'cpi-mod' + (cur ? ' has-chat' : '') },
    side,
    cur ? h('div', { class: 'cpi-main' },
      h('div', { class: 'cpi-main-head' },
        api.small() ? h('button', { type: 'button', class: 'cpi-back', title: 'back', onclick: () => { win.chatId = null; win.params.chat = null; const keep = imd.chats; win.redraw(); return keep; } }, '‹') : null,
        face(cur.who, 'cpi-head-face'), h('div', {}, h('b', {}, who(cur.who).name), h('span', {}, b?.away || '@' + snOfRef(api, cur.who)))),
      chatPane(win, api, cur, { modern: true }))
      : h('div', { class: 'cpi-main empty' }, sticker('1f4ac', 'cpi-empty-stk')));
}

// ---------------------------------------------------------------- email
const CHAIN = [
  ['fwd: fwd: fwd: READ THIS OR UR CRUSH WILL NEVER LIKE U BACK!!!', "ok so this is REAL. my cousin's friend didn't send it and her crush moved to another state the next day.\n\nsend this to 10 people in the next 10 minutes and ur crush will im you tonight.\nsend it to 5 and they'll notice you tomorrow.\nsend it to 1 and they'll think ur kinda cute.\nsend it to 0 and you will have bad luck in love for 10 YEARS.\n\nim not taking any chances lol\n\n<3 <3 <3"],
  ['the ultimate survey!!! fill it out + send it back', "copy this, fill it out with ur answers, and send it to all ur friends + me!!\n\nname:\nnicknames:\nfave band:\nlast song u listened to:\nfave color:\neyeliner or no eyeliner:\nwho do u like?? (u have to answer):\nlast person u imed:\nwhat are u wearing rn:\nbest friend:\nwould u rather be a vampire or a werewolf:\nwhat time is it:\n\nsend to 5 people or ur wish wont come true!!"],
  ['this is so cute pass it on <3', "   *  *  *\n *  you  *\n   * are *\n     * *\n      *\n\na friend is someone who knows the song in ur heart and sings it back to u when u forget the words.\n\nsend this to every friend who makes u smile (even me!!) and something good will happen at 11:11 tonight."],
];

function mailSetup(api) {
  api.d.mail ||= [];
  for (const m of api.d.mail) { m.to = Array.isArray(m.to) ? m.to : m.to ? [m.to] : []; }
  return api.d.mail;
}
// a message from `from` to everyone in `to`. copies go to the inbox / sent of the other ocs you made in this world
function sendMail(api, { from, to, subject, body }) {
  const { char } = api;
  const box = mailSetup(api);
  const at = Date.now();
  const id = 'e_' + uid();
  const meSending = from.id === char.id;
  const msg = { id, from: freshRef(from), to: to.map(freshRef), subject, body, at };
  if (meSending) box.push({ ...msg, box: 'sent', read: true });
  if (to.some(r => r.id === char.id)) box.push({ ...msg, box: 'inbox', read: meSending });
  const deliver = (c, which) => {
    if (!c || c.id === char.id || !store.isMine(c) || !store.isMine(char) || !worldmates(char.id).some(x => x.id === c.id)) return;
    c.fun ||= {};
    const cd = c.fun.computer ||= {};
    cd.mail ||= [];
    if (cd.mail.some(x => x.id === id && x.box === which)) return;
    cd.mail.push({ ...structuredClone(msg), box: which, read: which === 'sent' });
    store.save('char', c);
  };
  for (const r of to) deliver(r.id ? store.char(r.id) : null, 'inbox');
  if (!meSending) deliver(from.id ? store.char(from.id) : null, 'sent');
  api.save();
}

function mail(win, api) {
  const { mine, look, char } = api;
  const box = mailSetup(api);
  win.folder ||= 'inbox';
  const list = box.filter(m => m.box === win.folder).sort((a, b) => b.at - a.at);
  let open = box.find(m => m.id === win.openId) || null;
  const nIn = box.filter(m => m.box === 'inbox' && !m.read).length;
  const openMsg = m => { win.openId = m.id; if (!m.read) { m.read = true; api.save(); } win.redraw(); };
  const fwd = m => api.open('compose', { subject: /^fw:/i.test(m.subject) ? m.subject : 'FW: ' + m.subject, body: `\n\n-----original message-----\nfrom: ${who(m.from).name} <${mailOf(api, m.from)}>\nsubject: ${m.subject}\n\n${m.body}` });
  const reply = m => api.open('compose', { to: [m.box === 'sent' ? m.to[0] : m.from].filter(Boolean), subject: /^re:/i.test(m.subject) ? m.subject : 'RE: ' + m.subject, body: `\n\n> ${m.body.split('\n').join('\n> ')}` });
  const del = m => { win.openId = null; api.toBin('mail', m); api.refresh('mail'); };
  const folders = [['inbox', 'inbox', nIn], ['sent', look === 'y2k' ? 'sent items' : 'sent', 0]];
  const folderEl = h('div', { class: 'cpm-folders' },
    look === 'modern' && mine ? h('button', { type: 'button', class: 'cpm-compose', onclick: () => api.open('compose', {}) }, ICO.plus(), 'compose') : null,
    folders.map(([id, label, n]) => h('button', { type: 'button', class: 'cpm-folder' + (win.folder === id ? ' on' : ''), 'data-folder': id, onclick: () => { win.folder = id; win.openId = null; win.redraw(); } },
      sticker(id === 'inbox' ? '1f4e5' : '1f4e4', 'cpm-folder-ico'), h('span', {}, label), n ? h('b', {}, n) : null)),
    h('button', { type: 'button', class: 'cpm-folder', onclick: () => api.open('bin') }, sticker('1f5d1-fe0f', 'cpm-folder-ico'), h('span', {}, look === 'y2k' ? 'deleted items' : 'trash')));
  const row = m => h('button', { type: 'button', class: 'cpm-row' + (m.read ? '' : ' unread') + (open === m ? ' on' : ''), 'data-mail': m.id, onclick: () => openMsg(m) },
    look === 'y2k' ? h('i', { class: 'cpm-env' + (m.read ? ' open' : '') }) : face(win.folder === 'sent' ? m.to[0] : m.from, 'cpm-face'),
    h('span', { class: 'cpm-from' }, win.folder === 'sent' ? 'to: ' + m.to.map(r => who(r).name).join(', ') : who(m.from).name),
    h('span', { class: 'cpm-subj' }, m.subject || '(no subject)', look === 'modern' ? h('em', {}, ' — ' + m.body.slice(0, 80)) : null),
    h('span', { class: 'cpm-when' }, shortDate(m.at)));
  const reader = m => h('div', { class: 'cpm-read' },
    h('div', { class: 'cpm-read-head' },
      look === 'modern' ? h('h3', {}, m.subject || '(no subject)') : null,
      h('div', { class: 'cpm-read-who' }, look === 'modern' ? face(m.from, 'cpm-face big') : null, h('div', {},
        h('div', {}, h('b', {}, 'from: '), `${who(m.from).name} <${mailOf(api, m.from)}>`),
        h('div', {}, h('b', {}, 'to: '), m.to.map(r => `${who(r).name}`).join(', ')),
        look === 'y2k' ? h('div', {}, h('b', {}, 'subject: '), m.subject || '(no subject)') : null,
        h('div', { class: 'cpm-read-date' }, stamp(m.at)))),
      look === 'modern' ? h('div', { class: 'cpm-read-acts' }, mine ? [tbtn('reply', h('span', {}, 'reply'), () => reply(m)), tbtn('forward', h('span', {}, 'forward'), () => fwd(m)), tbtn('delete', ICO.trash(), () => del(m))] : null) : null),
    h('div', { class: 'cpm-body' }, m.body));
  const big = (label, ico, fn, off) => h('button', { type: 'button', class: 'cpm-big', disabled: !!off, onclick: fn }, sticker(ico, 'cpm-big-ico'), h('span', {}, label));
  if (look === 'y2k') {
    return h('div', { class: 'cpm' },
      h('div', { class: 'cp-toolbar cpm-tools' },
        big('create mail', '1f4e8', () => api.open('compose', {}), !mine),
        big('reply', '21a9-fe0f', () => open && reply(open), !open || !mine),
        big('forward', '27a1-fe0f', () => open && fwd(open), !open || !mine),
        big('delete', '274c', () => open && del(open), !open || !mine)),
      h('div', { class: 'cpm-main' },
        folderEl,
        h('div', { class: 'cpm-right' },
          h('div', { class: 'cpm-list' }, h('div', { class: 'cpm-row cpm-th' }, h('i'), h('span', {}, win.folder === 'sent' ? 'to' : 'from'), h('span', {}, 'subject'), h('span', {}, 'received')), list.length ? list.map(row) : null),
          h('div', { class: 'cpm-preview' }, open ? reader(open) : null))),
      h('div', { class: 'cp-status' }, `${list.length} message(s), ${nIn} unread`));
  }
  return h('div', { class: 'cpm' + (open ? ' reading' : '') },
    h('div', { class: 'cpm-main' }, folderEl,
      h('div', { class: 'cpm-right' }, open
        ? [h('button', { type: 'button', class: 'cpm-back', onclick: () => { win.openId = null; win.redraw(); } }, ICO.back()), reader(open)]
        : h('div', { class: 'cpm-list' }, list.length ? list.map(row) : h('div', { class: 'cpm-empty' }, sticker(win.folder === 'inbox' ? '1f4ed' : '1f4e4', 'cpm-empty-stk'))))));
}

function compose(win, api) {
  const { char, look } = api;
  const p = win.params;
  let from = p.from || refOf(char);
  let to = (p.to || []).slice();
  const subject = h('input', { type: 'text', class: 'cpm-subject', value: p.subject || '', maxLength: 140, oninput: e => { p.subject = e.target.value; win.setTitle(e.target.value || 'new message'); } });
  const body = h('textarea', { class: 'cpm-text', maxLength: 8000, oninput: e => { p.body = e.target.value; } }, p.body || '');
  const fromEl = h('div', { class: 'cpm-chips' });
  const toEl = h('div', { class: 'cpm-chips' });
  const chip = (ref, onx) => h('span', { class: 'cpm-chip' }, face(ref, 'cpm-chip-face'), who(ref).name, onx ? h('button', { type: 'button', title: 'remove', onclick: onx }, '✕') : null);
  const draw = () => {
    fill(fromEl, chip(from), h('button', { type: 'button', class: 'cpm-pick', onclick: async () => { const r = await pickWho({ title: 'from' }); if (r) { from = r; p.from = r; if (r.id !== char.id && !to.some(x => x.id === char.id)) to = [refOf(char)]; draw(); } } }, 'change'));
    fill(toEl, to.map((r, i) => chip(r, () => { to.splice(i, 1); draw(); })), h('button', { type: 'button', class: 'cpm-pick', onclick: async () => { const r = await pickWho({ title: 'to' }); if (r && !to.some(x => (x.id ? x.id === r.id : x.name === r.name))) { to.push(r); p.to = to; draw(); } } }, '+'));
  };
  draw();
  let chainAt = 0;
  const chain = () => { const [s2, b] = CHAIN[chainAt++ % CHAIN.length]; subject.value = s2; body.value = b; p.subject = s2; p.body = b; win.setTitle(s2); };
  const send = () => {
    if (!to.length) { api.dialog('please enter at least one recipient.', { title: 'oc mail' }); return; }
    sendMail(api, { from, to, subject: subject.value.trim(), body: body.value });
    api.refresh('mail');
    win.close();
    api.notify(look === 'y2k' ? 'oc mail' : 'mail', 'message sent', null, '1f4e7');
  };
  return h('div', { class: 'cpm-compose-win' },
    h('div', { class: 'cp-toolbar' },
      h('button', { type: 'button', class: 'cpm-big cpm-send', onclick: send }, sticker('1f4e8', 'cpm-big-ico'), h('span', {}, 'send')),
      h('button', { type: 'button', class: 'cpm-big', onclick: chain }, sticker('26d3-fe0f', 'cpm-big-ico'), h('span', {}, 'chain mail'))),
    h('div', { class: 'cpm-fields' },
      h('div', { class: 'cpm-field' }, h('span', {}, 'from:'), fromEl),
      h('div', { class: 'cpm-field' }, h('span', {}, 'to:'), toEl),
      h('div', { class: 'cpm-field' }, h('span', {}, 'subject:'), subject)),
    body);
}

// ---------------------------------------------------------------- shared world hooks
export function install(api) {
  imSetup(api);
  mailSetup(api);
  catchUpIm(api);
  // an im arriving (mirrored in from a worldmate, or typed as them): a balloon / toast, and open chats update
  const seen = new Map(imSetup(api).chats.map(c => [c.id, c.msgs.length]));
  api.onTick(() => {
    const ims = imSetup(api);
    for (const c of ims.chats) {
      const before = seen.get(c.id) ?? 0;
      if (c.msgs.length === before) continue;
      seen.set(c.id, c.msgs.length);
      const fresh = c.msgs.slice(before).filter(m => m.from === 'them' && m.at > (c.seenAt || 0));
      const w = api.wins.find(x => x.chatLog?.id === c.id);
      w?.chatLog.draw();
      if (!fresh.length) continue;
      if (w && w.el.classList.contains('active')) { c.seenAt = c.msgs.at(-1).at; api.save(); continue; }
      api.notify(snOfRef(api, c.who), fresh.at(-1).text, () => openChat(api, c), '1f4ac');
      api.refresh('im');
    }
  });
}
// what's waiting at log in
export function news(api) {
  const out = [];
  const c = imSetup(api).chats.find(x => unread(x));
  if (c) out.push({ title: snOfRef(api, c.who), text: c.msgs.filter(m => m.from === 'them').at(-1).text, open: () => openChat(api, c), icon: '1f4ac' });
  const n = mailSetup(api).filter(m => m.box === 'inbox' && !m.read).length;
  if (n) out.push({ title: api.look === 'y2k' ? 'oc mail' : 'mail', text: `${n} new message${n > 1 ? 's' : ''}`, open: () => api.open('mail'), icon: '1f4e7' });
  return out;
}
