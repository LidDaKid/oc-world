// myspace: the oc's old-school profile, made to look like a real 2006 myspace page.
// the socials app ("scene" look) and the phone's myspace app both draw it with renderMyspace().
//
// it all lives in char.fun.social (shared with snapshot + the feed look). myspace-only stuff is under .ms:
//   ms.theme     the look (colors, pattern, fonts, boxes...), see PRESETS
//   ms.details   status, here for, hometown, zodiac...     ms.schools [{ id, name, years, info }]
//   ms.blog      [{ id, title, at, mood, listening, body, comments }]
//   ms.bulletins [{ id, subject, body, at }]  (posted to every friend, see phone-myspace.js)
//   ms.pfps      [{ id, imageId }] its own profile pics (never the oc's real portrait), ms.pfpId = the default one
//   ms.bgPic / ms.banner { imageId }, ms.topCount, ms.autoplay, ms.css (custom css), ms.marquee
// friends comments are char.fun.social.wall: { id, who, text, at, imageId?, graphic? }
//
// custom css gets wrapped as  .ms-root[data-ms="<oc id>"] { ... }  so it only touches this page.
// class names to aim at: ms-header ms-nav ms-banner ms-page ms-left ms-right ms-name ms-pfp ms-info ms-box
// ms-box-head ms-table ms-contact ms-url ms-interests ms-details ms-schools ms-player ms-network ms-band
// ms-blog-latest ms-blurbs ms-friends ms-friend ms-comments ms-comment ms-footer

import { h, s, fill, uid, openModal, confirmDialog, swatches, segmented, toast, autosize } from '../ui.js';
import { store } from '../store.js';
import { pic, portrait, nameOf, uploadPic } from './kit.js';
import { who, face, freshRef, pickWho, refOf, bigNum, addPhotos, dropImage, hmA, inkOn } from './phone-bits.js';

// ---------------------------------------------------------------- looks
const BASE = {
  bg: '#e5e5e5', pattern: 'none', pat: '#cccccc', pic: false, bgMode: 'tile',
  box: '#ffffff', alpha: 100, head: '#6698cb', accent: '#ff6600', text: '#000000', link: '#003399', name: '#000000',
  font: 'verdana', glitter: false, sparkles: false, cursor: 'normal', round: false, border: 'solid', borderColor: '#6698cb', nav: true,
};
export const PRESETS = {
  classic: { label: 'classic', ...BASE },
  scene: { label: 'scene', bg: '#000000', pattern: 'stars', pat: '#ff4fa3', box: '#0a0508', alpha: 85, head: '#ff4fa3', accent: '#ff4fa3', text: '#ffffff', link: '#ff8ac4', name: '#ff4fa3', font: 'verdana', glitter: true, sparkles: true, cursor: 'star', border: 'solid', borderColor: '#ff4fa3' },
  emo: { label: 'emo', bg: '#000000', pattern: 'plaid', pat: '#7a0010', box: '#050505', alpha: 90, head: '#a3001a', accent: '#ff2a3d', text: '#dddddd', link: '#ff5566', name: '#ff2a3d', font: 'typewriter', border: 'solid', borderColor: '#a3001a' },
  rawr: { label: 'rawr', bg: '#000000', pattern: 'checker', pat: '#14ff72', box: '#000000', alpha: 88, head: '#ff00cc', accent: '#14ff72', text: '#ffffff', link: '#00e5ff', name: '#ff00cc', font: 'pixel', glitter: true, sparkles: true, cursor: 'star', border: 'dashed', borderColor: '#ff00cc' },
  vampire: { label: 'vampire', bg: '#0b0005', pattern: 'bats', pat: '#4a0014', box: '#0d0006', alpha: 92, head: '#6e0016', accent: '#d1002f', text: '#ecdce1', link: '#ff4a68', name: '#d1002f', font: 'gothic', cursor: 'bat', border: 'double', borderColor: '#7a0019' },
  zebra: { label: 'zebra', bg: '#ff2e88', pattern: 'zebra', pat: '#000000', box: '#000000', alpha: 86, head: '#ff2e88', accent: '#ff6fb0', text: '#ffffff', link: '#ff9cc9', name: '#ff2e88', font: 'comic', glitter: true, sparkles: true, cursor: 'heart', border: 'solid', borderColor: '#ff2e88' },
  leopard: { label: 'leopard', bg: '#d9a066', pattern: 'leopard', pat: '#2b1608', box: '#140906', alpha: 86, head: '#ff4fa3', accent: '#ff8ac4', text: '#fff4e8', link: '#ffb3d6', name: '#ff4fa3', font: 'comic', glitter: true, cursor: 'heart', border: 'solid', borderColor: '#ff4fa3' },
  ghoul: { label: 'ghoul pink', bg: '#111111', pattern: 'skulls', pat: '#ff3fa4', box: '#ffffff', alpha: 94, head: '#111111', accent: '#ff1f8f', text: '#151515', link: '#e0007a', name: '#ff1f8f', font: 'creepy', cursor: 'skull', round: true, border: 'dashed', borderColor: '#111111' },
  kawaii: { label: 'pastel kawaii', bg: '#ffe3f1', pattern: 'hearts', pat: '#ffb3d6', box: '#ffffff', alpha: 92, head: '#b18cff', accent: '#ff6fae', text: '#6b4a6e', link: '#c45ab3', name: '#ff6fae', font: 'comic', sparkles: true, cursor: 'heart', round: true, border: 'dotted', borderColor: '#ffb3d6' },
  y2k: { label: 'y2k glitter', bg: '#1a0b2e', pattern: 'glitter', pat: '#c58bff', box: '#12081f', alpha: 78, head: '#7df9ff', accent: '#ff7ee2', text: '#f3e8ff', link: '#7df9ff', name: '#ff7ee2', font: 'arial', glitter: true, sparkles: true, cursor: 'star', round: true, border: 'solid', borderColor: '#c58bff' },
};
for (const k of Object.keys(PRESETS)) PRESETS[k] = { ...BASE, ...PRESETS[k] };

export const PATTERNS = ['none', 'stars', 'hearts', 'skulls', 'bats', 'leopard', 'zebra', 'checker', 'plaid', 'stripes', 'glitter'];
export const FONTS = [['verdana', 'verdana'], ['arial', 'arial'], ['times', 'times'], ['comic', 'comic'], ['typewriter', 'typewriter'], ['pixel', 'pixel'], ['gothic', 'gothic'], ['creepy', 'creepy'], ['handwriting', 'handwriting'], ['minecraft', 'minecraft']];
const CURSORS = [['normal', 'normal'], ['heart', 'heart'], ['star', 'star'], ['bat', 'bat'], ['skull', 'skull'], ['sparkle', 'sparkle']];
const CURSOR_CHAR = { heart: '🖤', star: '⭐', bat: '🦇', skull: '💀', sparkle: '✨' };
const BORDERS = [['none', 'none'], ['solid', 'solid'], ['dashed', 'dashed'], ['dotted', 'dotted'], ['double', 'double']];
const PALETTE = ['#000000', '#ffffff', '#e5e5e5', '#6698cb', '#003399', '#ff6600', '#ff4fa3', '#ff2e88', '#ff1f8f', '#ffb3d6', '#b18cff', '#c58bff', '#d1002f', '#7a0010', '#14ff72', '#00e5ff', '#7df9ff', '#ffd84d', '#d9a066', '#2b1608'];
const TOP_COUNTS = [4, 8, 12, 16, 24];
const GRAPHICS = { thanks: 'thanks for the add!', nice: 'have a nice day', luv: 'luv ya!', hey: 'hey cutie', rawr: 'rawr!', miss: 'miss u!', pc: 'pc4pc?', xoxo: 'xoxo' };
const ZODIAC = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const STATUS = ['single', 'in a relationship', "it's complicated", 'engaged', 'married'];
const HERE_FOR = ['friends', 'networking', 'dating', 'serious relationships'];
const EDUCATION = ['high school', 'some college', 'in college', 'college grad', 'grad school'];
const NAV = ['home', 'browse', 'search', 'invite', 'film', 'mail', 'blog', 'favorites', 'forum', 'groups', 'events', 'videos', 'music', 'comedy', 'classifieds'];
const GROUPS = ['evanescence fan club', 'rawr means i love you in dinosaur', 'black parade army', 'i <3 vampires', 'scene queens 4 lyfe', 'eyeliner is my best friend', 'ghoul school alumni', 'i stay up til 3am'];
const DETAIL_KEYS = ['status', 'herefor', 'hometown', 'city', 'country', 'zodiac', 'religion', 'education', 'occupation'];

const MS_DEF = () => ({
  preset: 'classic', theme: { ...PRESETS.classic },
  details: Object.fromEntries(DETAIL_KEYS.map(k => [k, ''])),
  schools: [], blog: [], bulletins: [], pfps: [], pfpId: null,
  bgPic: { imageId: null }, banner: { imageId: null },
  topCount: 8, autoplay: false, css: '', marquee: '', seen: 0, friends: [], denied: [],
});
const SOCIAL_BASE = {
  handle: '', display: '', bio: '', followers: 1313, mood: '', headline: '', about: '', meet: '',
  song: { songId: null, title: '' }, topFriends: [], posts: [], wall: [],
};

// fills in whatever's missing (in place) and hands back { d: char.fun.social, ms: its .ms }
export function msData(char) {
  char.fun ||= {};
  const d = char.fun.social ||= {};
  for (const [k, v] of Object.entries(SOCIAL_BASE)) if (!(k in d)) d[k] = structuredClone(v);
  // filled in place (never swapped for a new object), so anything holding on to them stays the real thing
  const fillIn = (obj, defs) => { for (const [k, v] of Object.entries(defs)) if (!(k in obj)) obj[k] = structuredClone(v); return obj; };
  fillIn(d.interests ||= {}, { general: '', music: '', movies: '', television: '', books: '', heroes: '' });
  fillIn(d.song ||= {}, { songId: null, title: '' });
  if (!d.ms) {
    d.ms = MS_DEF();
    // profiles from before keep their scene colors, background + font
    const sc = d.scene;
    if (sc) {
      d.ms.preset = 'custom';
      d.ms.theme = { ...PRESETS.scene, pattern: PATTERNS.includes(sc.bg) ? sc.bg : 'stars', pat: sc.color, head: sc.color, accent: sc.color, name: sc.color, borderColor: sc.color, font: sc.font || 'verdana', glitter: sc.glitter !== false, sparkles: sc.sparkles !== false };
      if (sc.bg === 'leopard' || sc.bg === 'zebra') Object.assign(d.ms.theme, { bg: sc.color, pat: sc.bg === 'leopard' ? '#140a06' : '#050307' });
    }
  }
  const ms = d.ms;
  for (const [k, v] of Object.entries(MS_DEF())) if (!(k in ms)) ms[k] = v;
  fillIn(ms.theme ||= {}, BASE);
  fillIn(ms.details ||= {}, MS_DEF().details);
  fillIn(ms.bgPic ||= {}, { imageId: null });
  fillIn(ms.banner ||= {}, { imageId: null });
  for (const p of d.posts) p.comments ||= [];
  for (const b of ms.blog) b.comments ||= [];
  if (!TOP_COUNTS.includes(ms.topCount)) ms.topCount = 8;
  return { d, ms };
}

// ---------------------------------------------------------------- little helpers
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const longDate = ts => new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
const stampOf = ts => { const t = new Date(ts); return `${MONTHS[t.getMonth()]} ${t.getDate()} ${t.getFullYear()} ${hmA(ts)}`; };
const loginOf = ts => { const t = new Date(ts); return `${t.getMonth() + 1}/${t.getDate()}/${t.getFullYear()}`; };
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'oc';
const firstOf = name => name.split(/\s+/)[0] || name;
const lnk = (label, onclick, cls = '') => h('button', { type: 'button', class: 'ms-a ' + cls, onclick }, label);
const box = (cls, head, ...kids) => h('div', { class: 'ms-box ' + cls }, head ? h('div', { class: 'ms-box-head' }, head) : null, ...kids);
const band = (cls, title, ...right) => h('div', { class: 'ms-band ' + cls }, h('span', { class: 'ms-band-title' }, title), right.length ? h('span', { class: 'ms-band-right' }, ...right) : null);

// custom css stays inside this page: stray closing braces are dropped, open ones closed, then it's all nested
export function scopeCss(id, css) {
  css = String(css || '').replace(/<\/?style[^>]*>/gi, '').replace(/@import[^;]*;?/gi, '');
  let depth = 0, out = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); const j = e < 0 ? css.length : e + 2; out += css.slice(i, j) + (e < 0 ? '*/' : ''); i = j - 1; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < css.length && css[j] !== c && css[j] !== '\n') { if (css[j] === '\\') j++; j++; } out += css.slice(i, j + 1); i = j; continue; }
    if (c === '{') depth++;
    if (c === '}') { if (!depth) continue; depth--; }
    out += c;
  }
  return `.ms-root[data-ms="${String(id).replace(/[^\w-]/g, '')}"] {\n${out}\n${'}'.repeat(depth)}}`;
}

// colors, pattern, font + flags onto the root
function paintTheme(root, ms) {
  const t = ms.theme;
  const a = Math.max(0, Math.min(100, Number(t.alpha) || 0));
  const st = root.style;
  st.setProperty('--ms-bg', t.bg);
  st.setProperty('--ms-pat', t.pat);
  st.setProperty('--ms-box', `color-mix(in srgb, ${t.box} ${a}%, transparent)`);
  st.setProperty('--ms-box-solid', t.box);
  st.setProperty('--ms-head', t.head);
  st.setProperty('--ms-head-ink', inkOn(t.head));
  st.setProperty('--ms-accent', t.accent);
  st.setProperty('--ms-text', t.text);
  st.setProperty('--ms-link', t.link);
  st.setProperty('--ms-name', t.name);
  // table labels: the header color when it reads on the boxes, else a tint of the text
  st.setProperty('--ms-label', inkOn(t.head) !== inkOn(t.box) && a > 40 ? `color-mix(in srgb, ${t.head} 70%, ${t.text})` : `color-mix(in srgb, ${t.accent} 45%, ${t.text})`);
  st.setProperty('--ms-border', t.border === 'none' ? 'none' : `${t.border === 'double' ? 3 : 1}px ${t.border} ${t.borderColor}`);
  st.setProperty('--ms-radius', t.round ? '10px' : '0px');
  const ch = CURSOR_CHAR[t.cursor];
  st.setProperty('--ms-cursor', ch ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><text x='2' y='22' font-size='20'>${ch}</text></svg>`)}") 4 4, auto` : 'auto');
  const usePic = t.pic && ms.bgPic.imageId;
  [...root.classList].forEach(c => { if (/^(pat|msf|bgm)-/.test(c)) root.classList.remove(c); });
  root.classList.add('pat-' + (usePic ? 'none' : t.pattern), 'msf-' + t.font, 'bgm-' + t.bgMode);
  root.classList.toggle('ms-glitter', !!t.glitter);
  root.classList.toggle('ms-round', !!t.round);
  root.classList.toggle('ms-nonav', !t.nav);
  st.removeProperty('--ms-bgimg');
  if (usePic) store.imageURL(ms.bgPic.imageId).then(url => { if (url && root.isConnected !== false) st.setProperty('--ms-bgimg', `url("${url}")`); });
}

// the oc's myspace pfp: the default from its own album, else its portrait
function msPfp(char, ms, cls) {
  const p = ms.pfps.find(x => x.id === ms.pfpId) || null;
  if (p) return h('div', { class: 'portrait ' + cls }, pic(p.imageId));
  return portrait(char, cls);
}
// a friend's pic: their myspace default pfp if they have one
function friendPic(ref, cls) {
  const w = who(ref);
  const ms = w.char?.fun?.social?.ms;
  const p = ms?.pfps?.find(x => x.id === ms.pfpId);
  if (p) return h('div', { class: 'portrait ' + cls }, pic(p.imageId));
  return face(ref, cls);
}

// sparkles bursting out of a spot
export function sparkleAt(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const sp = h('span', { class: 'ms-spark', style: { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', '--dx': (Math.random() * 120 - 60) + 'px', '--dy': (Math.random() * -90 - 10) + 'px' } }, ['✦', '✧', '★', '♥'][i % 4]);
    document.body.append(sp);
    setTimeout(() => sp.remove(), 900);
  }
}
// the classic: sparkles trailing the mouse
export function sparkleTrail(area, on = () => true) {
  let last = 0;
  const move = e => {
    if (!on()) return;
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    const sp = h('span', { class: 'ms-trail', style: { left: e.clientX + 'px', top: e.clientY + 'px', '--dx': (Math.random() * 30 - 15) + 'px' } }, ['✦', '✧', '⋆', '♥', '★'][Math.floor(Math.random() * 5)]);
    document.body.append(sp);
    setTimeout(() => sp.remove(), 800);
  };
  area.addEventListener('pointermove', move);
  return () => area.removeEventListener('pointermove', move);
}

const shake = el => { el.classList.remove('ms-shake'); void el.offsetWidth; el.classList.add('ms-shake'); };

// a glitter "graphic" comment (the thanks-for-the-add kind)
const graphic = k => (GRAPHICS[k] ? h('div', { class: 'ms-graphic g-' + k }, h('span', {}, GRAPHICS[k])) : null);

// who's writing: a little button with their face + name
function asButton(start, opts = {}) {
  let ref = start;
  const btn = h('button', { type: 'button', class: 'ms-as' });
  const paint = () => fill(btn, face(ref, 'xs'), h('span', {}, who(ref).name), ' ▾');
  paint();
  btn.onclick = async () => { const r = await pickWho({ title: 'comment as', okLabel: 'comment as them', ...opts }); if (r) { ref = r; paint(); } };
  return { el: btn, get: () => ref };
}

// ================================================================ the page
// opts: mine (can edit), canComment (can leave comments even if not mine), save(), viewer (the oc looking),
//       ocLink(oc), openFriend(oc) (phone: show their page here), header (false = no site header), autoplay, onEdit()
export function renderMyspace(char, opts = {}) {
  const { d, ms } = msData(char);
  const mine = !!opts.mine;
  const canComment = mine || !!opts.canComment;
  const save = () => opts.save?.();
  const root = h('div', { class: 'ms-root', 'data-ms': char.id });
  const style = h('style');
  const content = h('div', { class: 'ms-wrap' });
  root.append(style, content);
  let view = { name: 'profile' };
  let drawCleanups = [];
  const cleanups = [];
  // contact box state (just for this visit)
  const st = { added: false, faved: false, blocked: false, rank: 0, im: false, imLines: [], rankOpen: false };

  const name = () => d.display || nameOf(char);
  const first = () => firstOf(name());
  const handle = () => (d.handle || slug(nameOf(char)));
  const basics = () => Object.fromEntries((char.basics || []).filter(b => b.value).map(b => [b.label, b.value]));
  const commenter = () => {
    if (opts.viewer) return refOf(opts.viewer);
    const rel = store.relsOf(char.id).map(r => (r.a === char.id ? r.b : r.a)).find(id => id && store.char(id));
    const o = rel ? store.char(rel) : null;
    return o ? refOf(o) : { id: null, name: 'tom' };
  };
  const go = (name, extra = {}) => {
    view = { name, ...extra };
    draw();
    const sc = root.closest('.ph-scroll');
    if (sc) sc.scrollTop = 0;
    else if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
  };

  function draw() {
    drawCleanups.forEach(f => f());
    drawCleanups = [];
    paintTheme(root, ms);
    style.textContent = ms.css ? scopeCss(char.id, ms.css) : '';
    const page = view.name === 'blog' ? blogPage() : view.name === 'entry' ? entryPage() : view.name === 'pics' ? picsPage() : view.name === 'friends' ? friendsPage() : view.name === 'comments' ? commentsPage() : profilePage();
    fill(content,
      ms.marquee ? h('div', { class: 'ms-marquee' }, h('marquee', { scrollamount: 4 }, ms.marquee)) : null,
      opts.header === false ? null : siteHeader(),
      ms.banner.imageId ? h('div', { class: 'ms-banner' }, pic(ms.banner.imageId)) : null,
      h('div', { class: 'ms-page' }, page),
      footer());
  }

  // ---------------- the site's header
  function siteHeader() {
    const q = h('input', { type: 'text', class: 'ms-search-input', maxLength: 40, onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); search(); } } });
    const search = () => go('friends', { q: q.value.trim().toLowerCase() });
    const navGo = { home: () => go('profile'), browse: () => go('friends'), search: () => go('friends'), mail: () => sendMessage(), blog: () => go('blog'), film: () => go('pics'), videos: () => go('pics'), favorites: e => { st.faved = !st.faved; sparkleAt(e.currentTarget); toast(st.faved ? `${first()} added to favorites` : 'removed from favorites'); }, music: () => root.querySelector('.ms-pl-play')?.click() };
    return h('div', { class: 'ms-header' },
      h('div', { class: 'ms-topbar' },
        h('div', { class: 'ms-logo' }, logoMark(), h('b', {}, 'myspace'), h('small', {}, '.com')),
        h('div', { class: 'ms-ad' }, h('b', {}, 'congratulations!'), ' you are the 1,000,000th visitor!! ', lnk('click here', e => { shake(e.currentTarget.closest('.ms-ad')); }), ' ★'),
        h('div', { class: 'ms-toplinks' }, lnk('help', () => {}), ' | ', lnk('sign out', () => {}))),
      h('div', { class: 'ms-search' },
        h('span', { class: 'ms-search-l' }, 'search:'), q,
        h('select', { class: 'ms-search-sel' }, ['people', 'music', 'web'].map(o => h('option', {}, o))),
        h('button', { type: 'button', class: 'ms-search-btn', onclick: search }, 'search')),
      h('nav', { class: 'ms-nav' }, NAV.map((n, i) => [i ? h('i', {}, ' | ') : null, lnk(n, navGo[n] || (e => shake(e.currentTarget)))])));
  }
  const footer = () => h('div', { class: 'ms-footer' },
    h('div', {}, ['about', 'faq', 'terms', 'privacy', 'safety tips', 'contact myspace', 'advertise', 'myspace international'].map((l, i) => [i ? ' | ' : '', h('span', {}, l)])),
    h('div', {}, '© 2003-2006 myspace.com. all rights reserved.'));

  // ---------------- the profile
  function profilePage() {
    return h('div', { class: 'ms-cols' }, leftCol(), rightCol());
  }

  function leftCol() {
    const b = basics();
    const det = ms.details;
    const loc = [det.city, det.country].filter(Boolean);
    return h('div', { class: 'ms-left' },
      h('h1', { class: 'ms-name' }, h('span', {}, name())),
      h('div', { class: 'ms-card' },
        h('button', { type: 'button', class: 'ms-pfp-btn', title: 'pics', onclick: () => go('pics') }, msPfp(char, ms, 'ms-pfp')),
        h('div', { class: 'ms-info' },
          d.headline ? h('p', { class: 'ms-headline' }, `"${d.headline}"`) : null,
          b.gender || b.pronouns ? h('p', { class: 'ms-gender' }, b.gender || b.pronouns) : null,
          b.age ? h('p', { class: 'ms-age' }, /^\d+$/.test(b.age.trim()) ? `${b.age.trim()} years old` : b.age) : null,
          loc.length ? h('p', { class: 'ms-location' }, loc[0], loc[1] ? h('br') : null, loc[1] || null) : null,
          h('p', { class: 'ms-online' }, onlineIco(), h('b', {}, 'online now!')),
          h('p', { class: 'ms-login' }, 'last login: ', loginOf(char.updatedAt || Date.now())))),
      h('div', { class: 'ms-mood' }, h('b', {}, 'mood: '), d.mood || 'chillin', ' ', h('span', { class: 'ms-mood-face' }, moodFace(d.mood))),
      h('div', { class: 'ms-viewmy' }, h('b', {}, 'view my: '), lnk('pics', () => go('pics')), ' | ', lnk('videos', () => go('pics')), ' | ', lnk('blog', () => go('blog'))),
      contactBox(),
      box('ms-url', null, h('div', { class: 'ms-url-in' }, h('b', {}, 'myspace url: '), h('br'), `http://www.myspace.com/${handle()}`)),
      interestsBox(),
      detailsBox(),
      schoolsBox());
  }

  function contactBox() {
    const c = [
      ['send message', '✉️', () => sendMessage()],
      ['forward to friend', '📨', async () => { const r = await pickWho({ title: 'forward to', okLabel: 'forward' }); if (r) toast(`${first()}'s profile was sent to ${who(r).name}!`); }],
      [st.added ? 'friend request sent' : 'add to friends', '💗', e => { st.added = !st.added; d.followers = Math.max(0, (Number(d.followers) || 0) + (st.added ? 1 : -1)); if (mine) save(); sparkleAt(e.currentTarget); draw(); if (st.added) toast(`${first()} has been added to your friends!`); }, st.added],
      [st.faved ? 'favorited' : 'add to favorites', '⭐', e => { st.faved = !st.faved; sparkleAt(e.currentTarget); draw(); }, st.faved],
      ['instant message', '💬', () => { st.im = !st.im; draw(); }, st.im],
      [st.blocked ? 'unblock user' : 'block user', '🚫', e => { st.blocked = !st.blocked; shake(e.currentTarget); setTimeout(draw, 350); }, st.blocked],
      ['add to group', '👥', () => addToGroup()],
      [st.rank ? `ranked ${st.rank}/10` : 'rank user', '🏆', () => { st.rankOpen = !st.rankOpen; draw(); }, !!st.rank],
    ];
    return box('ms-contact', `contacting ${first()}`,
      h('div', { class: 'ms-contact-grid' + (st.blocked ? ' blocked' : '') }, c.map(([label, ico, fn, on]) =>
        h('button', { type: 'button', class: 'ms-ct' + (on ? ' on' : ''), onclick: fn, 'data-ct': label.split(' ')[0] }, h('span', { class: 'ms-ct-ico' }, ico), h('span', { class: 'ms-ct-l' }, label)))),
      st.rankOpen ? h('div', { class: 'ms-rank' }, Array.from({ length: 10 }, (_, i) => h('button', { type: 'button', class: 'ms-rank-star' + (i < st.rank ? ' on' : ''), title: String(i + 1), onclick: e => { st.rank = i + 1; st.rankOpen = false; sparkleAt(e.currentTarget); draw(); } }, '★'))) : null,
      st.im ? imWindow() : null);
  }
  function imWindow() {
    const lines = h('div', { class: 'ms-im-lines' },
      h('p', { class: 'ms-im-away' }, h('b', {}, `${first()} (away): `), d.mood ? `feeling ${d.mood}. brb` : 'brb ♥'),
      st.imLines.map(l => h('p', { class: l.me ? 'me' : 'them' }, h('b', {}, l.me ? 'you: ' : `${first()}: `), l.text)));
    const inp = h('input', { type: 'text', class: 'ms-im-input', maxLength: 140, onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); send(); } } });
    const send = () => {
      const t = inp.value.trim();
      if (!t) return;
      st.imLines.push({ me: true, text: t });
      inp.value = '';
      draw();
      setTimeout(() => { st.imLines.push({ me: false, text: ['lol', 'omg hiii', 'rawr :3', 'ttyl', 'XD', 'brb mom'][Math.floor(Math.random() * 6)] }); if (st.im) draw(); }, 900);
    };
    return h('div', { class: 'ms-im' },
      h('div', { class: 'ms-im-bar' }, h('span', {}, `instant message - ${first()}`), h('button', { type: 'button', class: 'ms-im-x', onclick: () => { st.im = false; draw(); } }, '✕')),
      lines, h('div', { class: 'ms-im-row' }, inp, h('button', { type: 'button', class: 'ms-im-send', onclick: send }, 'send')));
  }
  function sendMessage() {
    const subj = h('input', { type: 'text', maxLength: 80, 'data-autofocus': '' });
    const body = autosize(h('textarea', { maxLength: 1000 }));
    openModal({
      title: `send message to ${first()}`,
      body: h('div', { class: 'ms-form' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'subject'), subj), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'body'), body)),
      actions: [{ label: 'send', kind: 'primary', onClick: close => { if (!subj.value.trim() && !body.value.trim()) return subj.focus(); close(); flyMail(); toast('message sent!'); } }],
    });
  }
  function flyMail() {
    const el = root.querySelector('.ms-ct[data-ct="send"]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const env = h('span', { class: 'ms-fly', style: { left: r.left + 10 + 'px', top: r.top + 'px' } }, '✉️');
    document.body.append(env);
    setTimeout(() => env.remove(), 1200);
  }
  function addToGroup() {
    const m = openModal({
      title: 'add to group',
      body: h('div', { class: 'ms-groups' }, GROUPS.map(g => h('button', { type: 'button', class: 'ms-group', onclick: () => { m.close(); toast(`${first()} was added to "${g}"`); } }, g))),
    });
  }

  function table(rows) {
    return h('table', { class: 'ms-table' }, h('tbody', {}, rows.map(([label, val, cls]) =>
      h('tr', { class: cls || '' }, h('td', { class: 'ms-tl' }, label), h('td', { class: 'ms-tv' }, val)))));
  }
  function interestsBox() {
    const rows = [['general', 'general'], ['music', 'music'], ['movies', 'movies'], ['television', 'television'], ['books', 'books'], ['heroes', 'heroes']]
      .filter(([k]) => d.interests[k]?.trim()).map(([k, l]) => [l, d.interests[k], 'ms-i-' + k]);
    if (!rows.length) return null;
    return box('ms-interests', `${first()}'s interests`, table(rows));
  }
  function detailsBox() {
    const det = ms.details, b = basics();
    const rows = [['status', det.status], ['here for', det.herefor], ['hometown', det.hometown], ['species', b.species], ['zodiac sign', det.zodiac], ['religion', det.religion], ['education', det.education], ['occupation', det.occupation]]
      .filter(([, v]) => v && String(v).trim());
    if (!rows.length) return null;
    return box('ms-details', `${first()}'s details`, table(rows));
  }
  function schoolsBox() {
    const list = ms.schools.filter(x => x.name?.trim());
    if (!list.length) return null;
    return box('ms-schools', `${first()}'s schools`, table(list.map(x => [h('b', {}, x.name), h('span', {}, x.years ? h('span', { class: 'ms-years' }, x.years) : null, x.years && x.info ? h('br') : null, x.info || '')])));
  }

  function rightCol() {
    return h('div', { class: 'ms-right' },
      player(),
      h('div', { class: 'ms-box ms-network' }, h('b', {}, st.added ? `${first()} is your friend.` : `${first()} is in your extended network`)),
      latestBlog(),
      blurbs(),
      friendSpace(),
      commentsBox(10));
  }

  // the little flash-ish music player. real playlist songs play through the site's player bar
  function player() {
    const real = char.playlist?.find(x => x.id === d.song.songId);
    const title = real?.title || d.song.title?.trim() || '';
    let fake = false;
    const playBtn = h('button', { type: 'button', class: 'ms-pl-play', title: 'play' }, '▶');
    const eq = h('span', { class: 'ms-pl-eq' }, h('i'), h('i'), h('i'), h('i'), h('i'), h('i'));
    const prog = h('i');
    const playing = () => {
      const bar = document.querySelector('.player');
      return real && bar && !bar.hidden && bar.querySelector('.player-title')?.textContent === real.title && bar.querySelector('.player-btn.big')?.title === 'pause';
    };
    const state = () => {
      const on = !!playing() || fake;
      playBtn.textContent = on ? '❚❚' : '▶';
      playBtn.title = on ? 'pause' : 'play';
      eq.classList.toggle('on', on);
      wrap.classList.toggle('on', on);
      const seek = document.querySelector('.player .player-seek');
      if (real && seek && playing()) prog.style.width = (Number(seek.value) / (Number(seek.max) || 1000)) * 100 + '%';
    };
    const toggle = () => {
      if (real) {
        const bar = document.querySelector('.player');
        if (bar?.querySelector('.player-title')?.textContent === real.title) bar.querySelector('.player-btn.big')?.click();
        else document.querySelectorAll('.player .player-song')[char.playlist.indexOf(real)]?.click();
      } else if (title) fake = !fake;
      else shake(wrap);
      setTimeout(state, 200);
    };
    playBtn.onclick = toggle;
    const stop = () => { if (playing()) document.querySelector('.player .player-btn.big')?.click(); fake = false; prog.style.width = '0'; setTimeout(state, 200); };
    const iv = setInterval(state, 600);
    drawCleanups.push(() => clearInterval(iv));
    const wrap = h('div', { class: 'ms-player' },
      h('div', { class: 'ms-pl-top' }, h('span', { class: 'ms-pl-brand' }, 'myspace music'), h('span', { class: 'ms-pl-auto' }, ms.autoplay ? 'autoplay: on' : '')),
      h('div', { class: 'ms-pl-screen' + (title ? '' : ' empty') }, eq, title
        // the title starts on screen and loops (two copies side by side), so it's never blank like a <marquee> can be
        ? h('div', { class: 'ms-pl-title' }, h('span', { class: 'ms-pl-run' }, [0, 1].map(() => h('span', {}, `♫ ${title} - ${name()} ♫ `))))
        : h('div', { class: 'ms-pl-title' }, h('span', { class: 'ms-pl-none' }, '-- no song --'))),
      h('div', { class: 'ms-pl-ctrls' }, playBtn, h('button', { type: 'button', class: 'ms-pl-stop', title: 'stop', onclick: stop }, '■'),
        h('span', { class: 'ms-pl-prog' }, prog), h('span', { class: 'ms-pl-vol' }, h('i'), h('i'), h('i'), h('i'))));
    requestAnimationFrame(state);
    return wrap;
  }
  function maybeAutoplay() {
    const real = char.playlist?.find(x => x.id === d.song.songId);
    if (!ms.autoplay || !real || !opts.autoplay) return;
    setTimeout(() => {
      const bar = document.querySelector('.player');
      const on = bar && !bar.hidden && bar.querySelector('.player-title')?.textContent === real.title;
      if (!on && root.isConnected) root.querySelector('.ms-pl-play')?.click();
    }, 700);
  }

  function latestBlog() {
    const list = [...ms.blog].sort((a, b) => b.at - a.at);
    if (!list.length && !mine) return null;
    return h('div', { class: 'ms-blog-latest' },
      band('', `${first()}'s latest blog entry`, lnk('[subscribe to this blog]', e => { e.currentTarget.textContent = '[subscribed!]'; sparkleAt(e.currentTarget); })),
      h('div', { class: 'ms-bl-list' },
        list.slice(0, 4).map(b => h('p', { class: 'ms-bl-row' }, lnk(b.title || 'untitled', () => go('entry', { id: b.id }), 'ms-bl-title'), ' ', lnk('(view more)', () => go('entry', { id: b.id }), 'ms-small'))),
        list.length ? h('p', { class: 'ms-bl-all' }, lnk('[view all blog entries]', () => go('blog'))) : null,
        mine ? h('p', { class: 'ms-bl-all' }, lnk('[post new blog]', () => blogBox(null))) : null));
  }
  function blurbs() {
    return h('div', { class: 'ms-blurbs' },
      band('', `${first()}'s blurbs`),
      h('div', { class: 'ms-blurb-in' },
        h('h4', {}, 'about me:'), h('div', { class: 'ms-about' }, d.about || d.bio || ''),
        h('h4', {}, "who i'd like to meet:"), h('div', { class: 'ms-meet' }, d.meet || '')));
  }

  function friendLink(ref, kids, cls) {
    const w = who(ref);
    if (w.char && opts.openFriend) return h('button', { type: 'button', class: cls, onclick: () => opts.openFriend(w.char) }, kids);
    if (w.char && opts.ocLink) return h('a', { class: cls, href: opts.ocLink(w.char) + '/fun/social' }, kids);
    return h('div', { class: cls }, kids);
  }
  function friendSpace() {
    const friends = d.topFriends.filter(r => !who(r).gone);
    const n = ms.topCount;
    return h('div', { class: 'ms-friends' },
      band('', `${first()}'s friend space`, mine ? h('span', { class: 'ms-small' }, 'top ', h('select', { class: 'ms-top-sel', onchange: e => { ms.topCount = Number(e.target.value); save(); draw(); } }, TOP_COUNTS.map(c => h('option', { value: c, selected: c === n }, c)))) : null),
      h('div', { class: 'ms-friends-in' },
        h('p', { class: 'ms-fcount' }, h('b', {}, first()), ' has ', h('span', { class: 'ms-red' }, bigNum(d.followers)), ' friends.'),
        friends.length ? h('div', { class: 'ms-top', 'data-n': n }, friends.slice(0, n).map((r, i) =>
          friendLink(r, [h('span', { class: 'ms-fname' }, firstOf(who(r).name)), friendPic(r, 'ms-fpic')], 'ms-friend'))) : null,
        h('p', { class: 'ms-fall' },
          mine ? lnk(friends.length ? 'edit top friends' : 'pick top friends', () => pickTop(), 'ms-edit-top') : null,
          mine ? ' | ' : null,
          lnk(`view all of ${first()}'s friends`, () => go('friends')))));
  }
  function pickTop() {
    let picks = d.topFriends.map(r => ({ ...r }));
    let count = ms.topCount;
    const list = h('div', { class: 'ms-t8-picks' });
    const drawPicks = () => fill(list,
      picks.map((r, i) => h('div', { class: 'ms-t8-pick' + (i >= count ? ' out' : '') }, h('em', {}, i + 1), face(r, 'sm'), h('span', {}, who(r).name),
        i > 0 ? h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', onclick: () => { [picks[i - 1], picks[i]] = [picks[i], picks[i - 1]]; drawPicks(); } }, '↑') : null,
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { picks.splice(i, 1); drawPicks(); } }, '✕'))),
      picks.length < 24 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const r = await pickWho({ title: 'add a friend', not: char.id, okLabel: 'add' }); if (r && !picks.some(p => (r.id ? p.id === r.id : p.name === r.name))) { picks.push(r); drawPicks(); } } }, '+ add a friend') : null);
    drawPicks();
    openModal({
      title: 'top friends',
      body: h('div', { class: 'ms-form' },
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'how many'), segmented(TOP_COUNTS.map(c => ({ value: c, label: 'top ' + c })), count, v => { count = v; drawPicks(); })),
        list),
      actions: [{ label: 'save', kind: 'primary', onClick: close => { d.topFriends = picks; ms.topCount = count; save(); close(); draw(); } }],
    });
  }

  // ---------------- friends comments
  function commentsBox(limit) {
    const list = [...d.wall].sort((a, b) => b.at - a.at);
    const shown = limit ? list.slice(0, limit) : list;
    return h('div', { class: 'ms-comments' },
      band('', `${first()}'s friends comments`),
      h('p', { class: 'ms-c-count' }, h('b', {}, `displaying ${shown.length} of ${list.length} comments `), '( ', lnk('view all', () => go('comments')), canComment ? [' | ', lnk('add comment', () => addComment(), 'ms-add-comment')] : null, ' )'),
      shown.length ? h('table', { class: 'ms-c-table' }, h('tbody', {}, shown.map(c => commentRow(c, () => { d.wall = d.wall.filter(x => x !== c); dropImage(c.imageId); save(); draw(); })))) : null,
      limit && list.length > limit ? h('p', { class: 'ms-c-more' }, lnk('view all comments', () => go('comments'))) : null);
  }
  function commentRow(c, onDelete) {
    return h('tr', { class: 'ms-comment' },
      h('td', { class: 'ms-c-who' }, friendLink(c.who, [h('span', { class: 'ms-c-name' }, who(c.who).name), friendPic(c.who, 'ms-fpic')], 'ms-c-whobox')),
      h('td', { class: 'ms-c-body' },
        h('p', { class: 'ms-c-date' }, stampOf(c.at)),
        graphic(c.graphic),
        c.imageId ? pic(c.imageId, 'ms-c-img') : null,
        c.text ? h('p', { class: 'ms-c-text' }, c.text) : null,
        mine && onDelete ? h('p', { class: 'ms-c-tools' }, lnk('delete', onDelete, 'ms-small')) : null));
  }
  function addComment() {
    const as = asButton(commenter(), { not: char.id });
    const ta = autosize(h('textarea', { maxLength: 600, 'data-autofocus': '' }));
    let g = null, img = null, kept = false;
    const gRow = h('div', { class: 'ms-g-picks' });
    const drawG = () => fill(gRow, Object.keys(GRAPHICS).map(k => h('button', { type: 'button', class: 'ms-g-pick' + (g === k ? ' on' : ''), onclick: () => { g = g === k ? null : k; drawG(); } }, graphic(k))));
    drawG();
    const picBox = h('div', { class: 'ms-c-pic' });
    const drawPic = () => fill(picBox,
      img ? pic(img, 'ms-c-prev') : null,
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const [p] = await addPhotos(false, 700); if (!p) return; if (img) dropImage(img); img = p.imageId; drawPic(); } }, img ? 'change picture' : 'add picture'),
      img ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { dropImage(img); img = null; drawPic(); } }, 'remove') : null);
    drawPic();
    openModal({
      title: 'add comment',
      body: h('div', { class: 'ms-form ms-c-form' }, as.el, ta, h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'graphic'), gRow), picBox),
      actions: [{ label: 'post', kind: 'primary', onClick: close => {
        const text = ta.value.trim();
        if (!text && !g && !img) return ta.focus();
        const c = { id: 'w_' + uid(), who: freshRef(as.get()), text, at: Date.now() };
        if (g) c.graphic = g;
        if (img) c.imageId = img;
        d.wall.push(c);
        kept = true;
        save(); close(); draw();
      } }],
      onClose: () => { if (!kept && img) dropImage(img); },
    });
  }
  function commentsPage() {
    return h('div', { class: 'ms-sub' }, backBar(), commentsBox(0));
  }
  const backBar = (label = `« back to ${first()}'s profile`, fn = () => go('profile')) => h('div', { class: 'ms-backbar' }, lnk(label, fn, 'ms-back'));

  // ---------------- blog
  function blogPage() {
    const list = [...ms.blog].sort((a, b) => b.at - a.at);
    return h('div', { class: 'ms-sub ms-blogpage' }, backBar(),
      h('div', { class: 'ms-blog-cols' },
        h('div', { class: 'ms-blog-side' },
          msPfp(char, ms, 'ms-pfp sm'), h('b', { class: 'ms-blog-who' }, name()),
          h('p', {}, lnk(`${first()}'s profile`, () => go('profile'))),
          h('p', {}, lnk('[subscribe to this blog]', e => { e.currentTarget.textContent = '[subscribed!]'; })),
          mine ? h('p', {}, lnk('[post new blog]', () => blogBox(null), 'ms-new-blog')) : null),
        h('div', { class: 'ms-blog-main' },
          h('h2', { class: 'ms-blog-h' }, `${first()}'s blog`),
          list.length ? list.map(b => entry(b, false)) : h('p', { class: 'ms-empty' }, 'there are no blog entries yet.'))));
  }
  function entryPage() {
    const b = ms.blog.find(x => x.id === view.id);
    if (!b) return blogPage();
    return h('div', { class: 'ms-sub ms-blogpage' }, backBar(`« back to ${first()}'s blog`, () => go('blog')),
      h('div', { class: 'ms-blog-main' }, entry(b, true)));
  }
  function entry(b, full) {
    const listening = (() => { const real = char.playlist?.find(x => x.id === b.listening); return real ? real.title : b.listening; })();
    return h('div', { class: 'ms-entry' },
      h('p', { class: 'ms-entry-date' }, longDate(b.at)),
      h('div', { class: 'ms-entry-box' },
        h('h3', { class: 'ms-entry-title' }, b.title || 'untitled'),
        b.mood ? h('p', { class: 'ms-entry-meta' }, h('b', {}, 'current mood: '), moodFace(b.mood), ' ', b.mood) : null,
        listening ? h('p', { class: 'ms-entry-meta' }, h('b', {}, 'currently listening: '), listening) : null,
        h('div', { class: 'ms-entry-body' + (full ? '' : ' clip') }, b.body),
        h('p', { class: 'ms-entry-foot' },
          `posted by ${first()} at ${hmA(b.at)} | `,
          lnk(`${b.comments.length} comment${b.comments.length === 1 ? '' : 's'}`, () => go('entry', { id: b.id })),
          canComment ? [' | ', lnk('add comment', () => blogComment(b), 'ms-blog-add')] : null,
          mine ? [' | ', lnk('edit', () => blogBox(b)), ' | ', lnk('delete', async () => { if (await confirmDialog('delete this blog entry?', { danger: true, okLabel: 'delete' })) { ms.blog = ms.blog.filter(x => x !== b); save(); go('blog'); } })] : null),
        full && b.comments.length ? h('div', { class: 'ms-entry-comments' },
          b.comments.map(c => h('div', { class: 'ms-bc' },
            friendPic(c.who, 'ms-fpic sm'),
            h('div', {}, h('p', { class: 'ms-bc-top' }, h('b', {}, who(c.who).name), ' ', h('span', {}, stampOf(c.at))), h('p', { class: 'ms-bc-text' }, c.text),
              mine ? lnk('delete', () => { b.comments = b.comments.filter(x => x !== c); save(); draw(); }, 'ms-small') : null)))) : null));
  }
  function blogComment(b) {
    const as = asButton(commenter(), { not: char.id });
    const ta = autosize(h('textarea', { maxLength: 600, 'data-autofocus': '' }));
    openModal({
      title: 'add comment', body: h('div', { class: 'ms-form' }, as.el, ta),
      actions: [{ label: 'post', kind: 'primary', onClick: close => { if (!ta.value.trim()) return ta.focus(); b.comments.push({ id: 'bc_' + uid(), who: freshRef(as.get()), text: ta.value.trim(), at: Date.now() }); save(); close(); go('entry', { id: b.id }); } }],
    });
  }
  function blogBox(b) {
    const draft = b ? { ...b } : { title: '', mood: d.mood || '', listening: d.song.songId || '', body: '', at: Date.now() };
    const field = (label, el) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), el);
    const title = h('input', { type: 'text', maxLength: 100, value: draft.title, 'data-autofocus': '', oninput: e => { draft.title = e.target.value; } });
    const mood = h('input', { type: 'text', maxLength: 40, value: draft.mood, oninput: e => { draft.mood = e.target.value; } });
    const songs = char.playlist || [];
    const listenTxt = h('input', { type: 'text', maxLength: 80, value: songs.some(x => x.id === draft.listening) ? '' : draft.listening, hidden: songs.some(x => x.id === draft.listening), oninput: e => { draft.listening = e.target.value; } });
    const listenSel = songs.length ? h('select', { onchange: e => { draft.listening = e.target.value; listenTxt.hidden = !!e.target.value; if (!e.target.value) draft.listening = listenTxt.value; } },
      h('option', { value: '' }, 'type one'), songs.map(x => h('option', { value: x.id, selected: x.id === draft.listening }, x.title || 'untitled'))) : null;
    const body = autosize(h('textarea', { maxLength: 6000, rows: 6, value: draft.body, oninput: e => { draft.body = e.target.value; } }));
    const day = h('input', { type: 'date', class: 'ms-date', value: new Date(draft.at - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10), oninput: e => { if (e.target.value) { const [y, mo, dd] = e.target.value.split('-').map(Number); const t = new Date(draft.at); t.setFullYear(y, mo - 1, dd); draft.at = t.getTime(); } } });
    openModal({
      title: b ? 'edit blog entry' : 'post new blog', wide: true,
      body: h('div', { class: 'ms-form ms-blog-form' }, field('subject', title),
        h('div', { class: 'ms-form-2' }, field('current mood', mood), field('day', day)),
        field('currently listening', h('div', { class: 'ms-song-pick' }, listenSel, listenTxt)),
        field('body', body)),
      actions: [{ label: b ? 'save' : 'post', kind: 'primary', onClick: close => {
        if (!draft.title.trim() && !draft.body.trim()) return title.focus();
        if (b) Object.assign(b, draft); else ms.blog.push({ id: 'b_' + uid(), ...draft, comments: [] });
        save(); close();
        go(b ? 'entry' : 'blog', b ? { id: b.id } : {});
      } }],
    });
  }

  // ---------------- pics
  function picsPage() {
    const posts = [...d.posts].filter(p => p.imageId).sort((a, b) => b.at - a.at);
    return h('div', { class: 'ms-sub ms-picspage' }, backBar(),
      h('h2', { class: 'ms-sub-h' }, `${first()}'s pics`),
      h('div', { class: 'ms-album' },
        band('', 'profile pics', mine ? lnk('upload', () => addPfp(), 'ms-upload-pfp') : null),
        h('div', { class: 'ms-album-grid' },
          h('div', { class: 'ms-album-item' + (!ms.pfpId ? ' default' : '') }, portrait(char, 'ms-album-pic'),
            !ms.pfpId ? h('span', { class: 'ms-default-tag' }, 'default') : mine ? lnk('set as default', () => { ms.pfpId = null; save(); draw(); }, 'ms-small ms-set-default') : null),
          ms.pfps.map(p => h('div', { class: 'ms-album-item' + (ms.pfpId === p.id ? ' default' : '') },
            h('div', { class: 'portrait ms-album-pic' }, pic(p.imageId)),
            ms.pfpId === p.id ? h('span', { class: 'ms-default-tag' }, 'default') : mine ? lnk('set as default', () => { ms.pfpId = p.id; save(); draw(); }, 'ms-small ms-set-default') : null,
            mine ? lnk('delete', async () => { if (!(await confirmDialog('delete this pic?', { danger: true, okLabel: 'delete' }))) return; ms.pfps = ms.pfps.filter(x => x !== p); if (ms.pfpId === p.id) ms.pfpId = null; dropImage(p.imageId); save(); draw(); }, 'ms-small') : null)))),
      h('div', { class: 'ms-album' },
        band('', 'my photos', mine ? lnk('upload', () => addPost(), 'ms-upload-post') : null),
        posts.length ? h('div', { class: 'ms-album-grid' }, posts.map(p => h('button', { type: 'button', class: 'ms-album-item ms-photo', onclick: () => openPic(p) },
          pic(p.imageId, 'ms-album-img'), h('span', { class: 'ms-small' }, p.comments.length ? `${p.comments.length} comment${p.comments.length === 1 ? '' : 's'}` : (p.caption || '').slice(0, 24))))) : h('p', { class: 'ms-empty' }, 'no pics yet.')));
  }
  async function addPfp() {
    const got = await uploadPic(900, { aspect: 1 });
    if (!got) return;
    const p = { id: 'pf_' + uid(), imageId: got.imageId };
    ms.pfps.push(p);
    if (!ms.pfpId) ms.pfpId = p.id;
    save(); draw();
  }
  async function addPost() {
    const [p] = await addPhotos(false, 1400);
    if (!p) return;
    d.posts.push({ id: 'p_' + uid(), imageId: p.imageId, caption: '', likes: Math.floor(80 + Math.random() * 900), at: Date.now(), liked: false, comments: [] });
    save(); draw();
  }
  function openPic(p) {
    const list = h('div', { class: 'ms-pic-comments' });
    const drawList = () => fill(list, p.comments.map(c => h('div', { class: 'ms-bc' }, friendPic(c.who, 'ms-fpic sm'),
      h('div', {}, h('p', { class: 'ms-bc-top' }, h('b', {}, who(c.who).name), ' ', h('span', {}, stampOf(c.at))), h('p', { class: 'ms-bc-text' }, c.text)))));
    drawList();
    const as = canComment ? asButton(commenter(), { not: char.id }) : null;
    const inp = canComment ? h('input', { type: 'text', class: 'ms-pic-input', maxLength: 400 }) : null;
    openModal({
      title: `${first()}'s pics`, wide: true,
      body: h('div', { class: 'ms-picview' }, pic(p.imageId, 'ms-picview-img'), p.caption ? h('p', { class: 'ms-picview-cap' }, p.caption) : null, list,
        canComment ? h('div', { class: 'ms-pic-add' }, as.el, inp) : null),
      actions: canComment ? [{ label: 'add comment', kind: 'primary', onClick: () => { const t = inp.value.trim(); if (!t) return inp.focus(); p.comments.push({ id: 'c_' + uid(), who: freshRef(as.get()), text: t, at: Date.now() }); inp.value = ''; save(); drawList(); } }] : [],
      onClose: draw,
    });
  }

  // ---------------- all friends
  function friendsPage() {
    const seen = new Set();
    const all = [...d.topFriends, ...store.worldsOf(char.id).flatMap(w => w.charIds).filter(id => id !== char.id).map(id => store.char(id)).filter(Boolean).map(refOf)]
      .filter(r => { const k = r.id || 'n:' + r.name; if (seen.has(k) || who(r).gone) return false; seen.add(k); return true; })
      .filter(r => !view.q || who(r).name.toLowerCase().includes(view.q));
    return h('div', { class: 'ms-sub ms-friendspage' }, backBar(),
      h('h2', { class: 'ms-sub-h' }, view.q ? `search results: "${view.q}"` : `${first()}'s friends`),
      all.length ? h('div', { class: 'ms-top ms-allfriends' }, all.map(r => friendLink(r, [h('span', { class: 'ms-fname' }, who(r).name), friendPic(r, 'ms-fpic')], 'ms-friend'))) : h('p', { class: 'ms-empty' }, 'no friends found.'));
  }

  // ---------------- go
  draw();
  maybeAutoplay();
  cleanups.push(sparkleTrail(root, () => ms.theme.sparkles));
  root.redraw = draw;
  root.show = go;
  root.cleanup = () => { drawCleanups.forEach(f => f()); cleanups.forEach(f => f()); };
  return root;
}

// ---- little drawings ----
const logoMark = () => h('span', { class: 'ms-logo-mark' }, h('i'), h('i'), h('i'));
const onlineIco = () => s('svg', { viewBox: '0 0 16 16', class: 'ms-online-ico' },
  s('circle', { cx: 8, cy: 4.5, r: 3, fill: '#ff9a00' }), s('path', { d: 'M2.5 15c0-4 2.4-6 5.5-6s5.5 2 5.5 6Z', fill: '#ff9a00' }), s('circle', { cx: 13, cy: 3, r: 2.2, fill: '#39d353' }));
function moodFace(mood = '') {
  const m = mood.toLowerCase();
  if (/sad|emo|cry|depress|lonely|broken/.test(m)) return ':(';
  if (/mad|angry|annoy|grr/.test(m)) return '>:(';
  if (/love|crush|<3/.test(m)) return '<3';
  if (/tired|sleep|bored/.test(m)) return '-_-';
  if (/hyper|excited|happy|giddy/.test(m)) return ':D';
  if (/dramatic|evil|devious/.test(m)) return '>:)';
  return ':)';
}

// ================================================================ the edit box
// tabs of labels + controls. every change saves + redraws the page right away (onChange)
export function editMyspace(char, { save, onChange }) {
  const { d, ms } = msData(char);
  let tab = 'layouts';
  const commit = () => { save(); onChange?.(); };
  const t = () => ms.theme;
  const body = h('div', { class: 'ms-edit' });
  const tabs = [['layouts', 'layouts'], ['colors', 'colors'], ['background', 'background'], ['style', 'style'], ['profile', 'profile'], ['interests', 'interests'], ['details', 'details'], ['css', 'css']];
  const field = (label, ...kids) => h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), ...kids);
  const custom = () => { ms.preset = 'custom'; };
  const color = (label, key) => field(label, swatches(t()[key], c => { t()[key] = c; custom(); commit(); }, PALETTE));
  const check = (label, key, obj = t()) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!obj[key], onchange: e => { obj[key] = e.target.checked; if (obj === t()) custom(); commit(); } }), label);
  const seg = (label, key, list) => field(label, segmented(list.map(([value, l]) => ({ value, label: l })), t()[key], v => { t()[key] = v; custom(); commit(); }));
  const text = (label, obj, key, max = 80, area = false) => {
    const el = area
      ? autosize(h('textarea', { value: obj[key] || '', maxLength: max, oninput: e => { obj[key] = e.target.value; commit(); } }))
      : h('input', { type: 'text', value: obj[key] || '', maxLength: max, oninput: e => { obj[key] = e.target.value; commit(); } });
    return h('label', { class: 'field', 'data-f': label }, h('span', { class: 'field-label' }, label), el);
  };
  const select = (label, obj, key, list) => h('label', { class: 'field', 'data-f': label }, h('span', { class: 'field-label' }, label),
    h('select', { onchange: e => { obj[key] = e.target.value; commit(); } }, h('option', { value: '' }, '—'), list.map(o => h('option', { value: o, selected: o === obj[key] }, o))));
  // a picture slot (bg, banner): preview + upload / remove
  const picSlot = (label, slot, opts, after) => {
    const wrap = h('div', { class: 'ms-picslot' });
    const paint = () => fill(wrap,
      slot.imageId ? pic(slot.imageId, 'ms-picslot-img') : h('span', { class: 'ms-picslot-none' }),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const got = await uploadPic(1800, opts); if (!got) return; dropImage(slot.imageId); slot.imageId = got.imageId; after?.(true); commit(); paint(); } }, slot.imageId ? 'change' : 'upload'),
      slot.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { dropImage(slot.imageId); slot.imageId = null; after?.(false); commit(); paint(); } }, 'remove') : null);
    paint();
    return field(label, wrap);
  };

  const pages = {
    layouts: () => h('div', { class: 'ms-presets' }, Object.entries(PRESETS).map(([k, p]) => h('button', {
      type: 'button', class: `ms-preset pat-${p.pattern}` + (ms.preset === k ? ' on' : ''), 'data-preset': k,
      style: { '--ms-bg': p.bg, '--ms-pat': p.pat, '--pv-box': p.box, '--pv-head': p.head, '--pv-accent': p.accent, '--pv-name': p.name },
      onclick: () => { for (const key of Object.keys(ms.theme)) delete ms.theme[key]; Object.assign(ms.theme, p); delete ms.theme.label; ms.preset = k; commit(); draw(); },
    }, h('span', { class: 'ms-pv' }, h('i', { class: 'ms-pv-name' }), h('i', { class: 'ms-pv-head' }), h('i', { class: 'ms-pv-box' }), h('i', { class: 'ms-pv-band' })), h('b', {}, p.label)))),
    colors: () => [
      color('page background', 'bg'),
      color('box color', 'box'),
      field('box opacity', h('input', { type: 'range', class: 'ms-range', min: 0, max: 100, value: t().alpha, oninput: e => { t().alpha = Number(e.target.value); custom(); commit(); } })),
      color('box header', 'head'),
      color('section titles', 'accent'),
      color('text', 'text'),
      color('links', 'link'),
      color('name', 'name'),
    ],
    background: () => [
      color('background color', 'bg'),
      field('pattern', h('div', { class: 'ms-patpicks' }, PATTERNS.map(p => h('button', {
        type: 'button', class: `ms-patpick pat-${p}` + (t().pattern === p && !t().pic ? ' on' : ''), 'data-pat': p, title: p,
        style: { '--ms-bg': t().bg, '--ms-pat': t().pat },
        onclick: () => { t().pattern = p; t().pic = false; custom(); commit(); draw(); },
      }, h('span', {}, p))))),
      color('pattern color', 'pat'),
      picSlot('wallpaper', ms.bgPic, {}, on => { t().pic = on; custom(); }),
      ms.bgPic.imageId ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!t().pic, onchange: e => { t().pic = e.target.checked; custom(); commit(); } }), 'use wallpaper') : null,
      seg('wallpaper fit', 'bgMode', [['tile', 'tile'], ['cover', 'cover'], ['fixed', 'fixed']]),
      picSlot('header banner', ms.banner, { aspect: 4 }),
    ],
    style: () => [
      seg('font', 'font', FONTS),
      check('glitter name', 'glitter'),
      check('sparkle cursor trail', 'sparkles'),
      seg('cursor', 'cursor', CURSORS),
      seg('boxes', 'round', [[false, 'square'], [true, 'rounded']]),
      seg('borders', 'border', BORDERS),
      color('border color', 'borderColor'),
      check('show nav bar', 'nav'),
      text('scrolling marquee', ms, 'marquee', 160),
    ],
    profile: () => [
      h('div', { class: 'ms-edit-2' }, text('display name', d, 'display', 60), text('myspace url', d, 'handle', 30)),
      text('headline', d, 'headline', 120),
      h('div', { class: 'ms-edit-2' }, text('mood', d, 'mood', 40), h('label', { class: 'field', 'data-f': 'friends' }, h('span', { class: 'field-label' }, 'friends'), h('input', { type: 'number', min: 0, value: d.followers, oninput: e => { d.followers = Math.max(0, Number(e.target.value) || 0); commit(); } }))),
      field('profile pics', pfpPicker()),
      field('profile song', songPick()),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!ms.autoplay, onchange: e => { ms.autoplay = e.target.checked; commit(); } }), 'autoplay'),
      field('top friends', segmented(TOP_COUNTS.map(c => ({ value: c, label: String(c) })), ms.topCount, v => { ms.topCount = v; commit(); })),
    ],
    interests: () => [
      text('about me', d, 'about', 3000, true),
      text("who i'd like to meet", d, 'meet', 1500, true),
      ...[['general', 'general'], ['music', 'music'], ['movies', 'movies'], ['television', 'television'], ['books', 'books'], ['heroes', 'heroes']].map(([k, l]) => text(l, d.interests, k, 800, true)),
    ],
    details: () => [
      h('div', { class: 'ms-edit-2' }, select('status', ms.details, 'status', STATUS), select('zodiac sign', ms.details, 'zodiac', ZODIAC)),
      field('here for', hereFor()),
      h('div', { class: 'ms-edit-2' }, text('city', ms.details, 'city', 60), text('country', ms.details, 'country', 60)),
      h('div', { class: 'ms-edit-2' }, text('hometown', ms.details, 'hometown', 60), text('religion', ms.details, 'religion', 60)),
      h('div', { class: 'ms-edit-2' }, select('education', ms.details, 'education', EDUCATION), text('occupation', ms.details, 'occupation', 60)),
      field('schools', schoolsEdit()),
    ],
    css: () => [
      field('custom css', autosize(h('textarea', { class: 'ms-css-box', spellcheck: false, value: ms.css, maxLength: 20000, rows: 10, oninput: e => { ms.css = e.target.value; commit(); } }))),
      h('details', { class: 'ms-css-names' }, h('summary', {}, 'class names'),
        h('code', {}, '.ms-header .ms-nav .ms-banner .ms-page .ms-left .ms-right .ms-name .ms-pfp .ms-info .ms-online .ms-mood .ms-box .ms-box-head .ms-table .ms-tl .ms-tv .ms-contact .ms-url .ms-interests .ms-details .ms-schools .ms-player .ms-network .ms-band .ms-band-title .ms-blog-latest .ms-blurbs .ms-about .ms-meet .ms-friends .ms-top .ms-friend .ms-fpic .ms-comments .ms-comment .ms-c-who .ms-c-body .ms-a .ms-footer')),
    ],
  };
  function pfpPicker() {
    const wrap = h('div', { class: 'ms-pfp-picks' });
    const paint = () => fill(wrap,
      h('button', { type: 'button', class: 'ms-pfp-pick' + (!ms.pfpId ? ' on' : ''), title: 'portrait', onclick: () => { ms.pfpId = null; commit(); paint(); } }, portrait(char, 'ms-pfp-mini')),
      ms.pfps.map(p => h('div', { class: 'ms-pfp-pick-wrap' },
        h('button', { type: 'button', class: 'ms-pfp-pick' + (ms.pfpId === p.id ? ' on' : ''), onclick: () => { ms.pfpId = p.id; commit(); paint(); } }, h('div', { class: 'portrait ms-pfp-mini' }, pic(p.imageId))),
        h('button', { type: 'button', class: 'ms-pfp-x', title: 'remove', onclick: () => { ms.pfps = ms.pfps.filter(x => x !== p); if (ms.pfpId === p.id) ms.pfpId = null; dropImage(p.imageId); commit(); paint(); } }, '✕'))),
      h('button', { type: 'button', class: 'ms-pfp-pick add', title: 'upload', onclick: async () => { const got = await uploadPic(900, { aspect: 1 }); if (!got) return; const p = { id: 'pf_' + uid(), imageId: got.imageId }; ms.pfps.push(p); ms.pfpId = p.id; commit(); paint(); } }, '+'));
    paint();
    return wrap;
  }
  function songPick() {
    const songs = char.playlist || [];
    const txt = h('input', { type: 'text', value: d.song.title, maxLength: 80, hidden: !!d.song.songId, oninput: e => { d.song.title = e.target.value; commit(); } });
    const sel = songs.length ? h('select', { class: 'ms-song-sel', onchange: e => { d.song.songId = e.target.value || null; txt.hidden = !!d.song.songId; commit(); } },
      h('option', { value: '' }, 'type one'), songs.map(x => h('option', { value: x.id, selected: x.id === d.song.songId }, x.title || 'untitled'))) : null;
    return h('div', { class: 'ms-song-pick' }, sel, txt);
  }
  function hereFor() {
    const cur = () => (ms.details.herefor || '').split(',').map(x => x.trim()).filter(Boolean);
    const wrap = h('div', { class: 'ms-chips' });
    const paint = () => fill(wrap, HERE_FOR.map(o => h('button', { type: 'button', class: 'ms-chip' + (cur().includes(o) ? ' on' : ''), onclick: () => {
      const c = cur(); ms.details.herefor = (c.includes(o) ? c.filter(x => x !== o) : HERE_FOR.filter(x => x === o || c.includes(x))).join(', '); commit(); paint();
    } }, o)));
    paint();
    return wrap;
  }
  function schoolsEdit() {
    const wrap = h('div', { class: 'ms-schools-edit' });
    const paint = () => fill(wrap,
      ms.schools.map(sc => h('div', { class: 'ms-school-row' },
        h('input', { type: 'text', placeholder: 'school', value: sc.name, maxLength: 80, oninput: e => { sc.name = e.target.value; commit(); } }),
        h('input', { type: 'text', placeholder: 'years', value: sc.years, maxLength: 30, oninput: e => { sc.years = e.target.value; commit(); } }),
        h('input', { type: 'text', placeholder: 'clubs', value: sc.info, maxLength: 120, oninput: e => { sc.info = e.target.value; commit(); } }),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { ms.schools = ms.schools.filter(x => x !== sc); commit(); paint(); } }, '✕'))),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { ms.schools.push({ id: 's_' + uid(), name: '', years: '', info: '' }); commit(); paint(); } }, '+ add school'));
    paint();
    return wrap;
  }

  const tabRow = h('div', { class: 'ms-edit-tabs' });
  const pane = h('div', { class: 'ms-edit-pane' });
  function draw() {
    fill(tabRow, tabs.map(([k, l]) => h('button', { type: 'button', class: 'ms-edit-tab' + (tab === k ? ' on' : ''), 'data-tab': k, onclick: () => { tab = k; draw(); } }, l)));
    fill(pane, pages[tab]());
  }
  draw();
  body.append(tabRow, pane);
  openModal({ title: 'edit profile', wide: true, body, actions: [{ label: 'done', kind: 'primary', onClick: close => close() }], onClose: () => onChange?.() });
}
