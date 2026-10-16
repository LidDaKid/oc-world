// phone app: snapshot, a full picture-feed social app. it shares its data with the socials app in the
// "more" tab (char.fun.social), so a post made in either place shows up in both.
// see the plug-in notes at the top of phone.js

import { h, s, fill, uid, confirmDialog, pickFiles, shrinkImage, toast } from '../ui.js';
import { store } from '../store.js';
import { cropAll } from '../crop.js';
import { pic, ocById, allOcs } from './kit.js';
// portrait/nameOf here show an oc as their account on the open app (see phone-accounts.js)
import { portrait, nameOf, acctId, instaSd, activeOf, updateAccount } from './phone-accounts.js';
import { who, face, freshRef, pickWho, refOf, ago, bigNum, addPhotos, dropImage, relLabel, addVideo, vid, tapToPause, soundBtn, unreadCount } from './phone-bits.js';

// one picker for pictures + videos, like the app's own gallery. resolves { imageId, width, height } or { video } or null
async function pickMedia(maxDim = 1400) {
  if (window.__testVideo) { const v = await addVideo(); return v ? { video: v } : null; }
  const [file] = await pickFiles('image/*,video/*', false);
  if (!file) return null;
  if (file.type.startsWith('video/')) {
    const v = await addVideo(file); return v ? { video: v } : null;
  }
  const [img] = await cropAll([file]);
  if (!img) return null;
  try {
    const { blob, width, height } = await shrinkImage(img, maxDim);
    return { imageId: await store.putImage(blob), width, height };
  } catch (err) {
    console.error(err);
    toast("couldn't read that picture", 'bad');
    return null;
  }
}
// a feed video (plays while 60%+ on screen). right after the page opens the file can still be loading when vid()
// first tries to play, so try once more as soon as it can play, if it's on screen
function liveVid(video, cls, opts = {}) {
  const v = vid(video, cls, { ...opts, inView: true });
  v.addEventListener('canplay', () => {
    const io = new IntersectionObserver(([e]) => { io.disconnect(); if (v.paused && e.intersectionRatio >= 0.6) v.playNow(); });
    io.observe(v);
  }, { once: true });
  return v;
}
const hasMedia = p => !!(p?.imageId || p?.video);
// a post's picture, its video's first frame, or the text card
const thumbOf = (p, size = 'sm') => (p.imageId ? pic(p.imageId) : p.video ? vid(p.video, 'ps-tvid') : h('div', { class: 'ps-text-post ' + size }, h('span', {}, p.caption)));
const fakeViews = likes => Math.round((likes || 100) * (6 + Math.random() * 14));

export const APPS = {
  insta: { label: 'snapshot', icon: '1f933', bg: 'radial-gradient(circle at 28% 108%, #ffd76a 0%, #ff8a4c 26%, #ff3f8e 52%, #b544e0 76%, #6a4cff 100%)' },
};
export const DEF = {
  insta: { saved: [], following: [], seen: 0 },
};

// same defaults as the socials app (social.js), so either app can be opened first
const SOCIAL_DEF = {
  style: 'scene',
  handle: '', display: '', bio: '', link: '',
  followers: 1313, following: 213, verified: false,
  mood: '', headline: '', about: '', meet: '',
  interests: { general: '', music: '', movies: '', heroes: '' },
  song: { songId: null, title: '' },
  topFriends: [], pinned: null,
  posts: [], highlights: [], wall: [],
  scene: { bg: 'stars', color: '#ff4fa3', glitter: true, font: 'verdana', sparkles: true },
};
const EMPTY = { handle: '', display: '', bio: '', link: '', followers: 0, following: 0, verified: false, posts: [], highlights: [], pinned: null };

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const handleOf = (c, sd) => (sd.handle || slug(nameOf(c)) || 'oc').slice(0, 30);
const handleFor = ref => {
  const w = who(ref);
  return w.handle || w.char?.fun?.social?.handle || slug(w.name) || 'someone';
};
function timeAgo(ts) {
  const a = ago(ts);
  if (a === 'now') return 'just now';
  const n = parseInt(a, 10), u = a.replace(/\d+/, '');
  const word = { m: 'minute', h: 'hour', d: 'day', w: 'week' }[u];
  if (u === 'w' && n > 8) return new Date(ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toLowerCase();
  return `${n} ${word}${n === 1 ? '' : 's'} ago`;
}
const shortAgo = ts => { const a = ago(ts); return a === 'now' ? 'now' : a; };

// ---- icons ----
const SW = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const svg = (cls, ...kids) => s('svg', { viewBox: '0 0 24 24', class: 'ps-ico ' + cls }, ...kids);
const ico = {
  home: on => svg('', s('path', { d: 'M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z', ...SW, fill: on ? 'currentColor' : 'none' })),
  search: on => svg('', s('circle', { cx: 10.5, cy: 10.5, r: 6.8, ...SW, 'stroke-width': on ? 2.8 : 1.9 }), s('path', { d: 'm15.6 15.6 5 5', ...SW, 'stroke-width': on ? 2.8 : 1.9 })),
  add: () => svg('', s('rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 5, ...SW }), s('path', { d: 'M12 8v8M8 12h8', ...SW })),
  heart: on => svg(on ? 'red' : '', s('path', { d: 'M12 20.3c-.5-.3-2.2-1.8-4.4-3.8C5 14.2 2.5 12.2 2.5 9.1a5 5 0 0 1 4.7-5.2 4.2 4.2 0 0 1 3.7 1.9c.8 1.2 1 1.8 1.1 1.8s.3-.6 1.1-1.8a4.2 4.2 0 0 1 3.7-1.9 5 5 0 0 1 4.7 5.2c0 3.1-2.5 5.1-5.1 7.4-2.2 2-3.9 3.5-4.4 3.8z', ...SW, 'stroke-width': 2, fill: on ? 'currentColor' : 'none', stroke: on ? 'none' : 'currentColor' })),
  comment: () => svg('', s('path', { d: 'M20.66 17a10 10 0 1 0-3.6 3.6L22 22z', ...SW, 'stroke-width': 2 })),
  send: () => svg('', s('path', { d: 'M22 3 9.2 10.1M11.7 20.3 22 3H2l7.2 7.1z', ...SW, 'stroke-width': 2 })),
  save: on => svg('', s('path', { d: 'M20 21l-8-7.6L4 21V3h16z', ...SW, 'stroke-width': 2, fill: on ? 'currentColor' : 'none' })),
  back: () => svg('', s('path', { d: 'M15 4 7 12l8 8', ...SW, 'stroke-width': 2.2 })),
  dots: () => svg('', s('circle', { cx: 5, cy: 12, r: 1.6, fill: 'currentColor' }), s('circle', { cx: 12, cy: 12, r: 1.6, fill: 'currentColor' }), s('circle', { cx: 19, cy: 12, r: 1.6, fill: 'currentColor' })),
  grid: () => svg('', s('rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 1.5, ...SW }), s('path', { d: 'M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17', ...SW })),
  tag: () => svg('', s('rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 3, ...SW }), s('circle', { cx: 12, cy: 10, r: 3, ...SW }), s('path', { d: 'M6.5 20a6 6 0 0 1 11 0', ...SW })),
  x: () => svg('', s('path', { d: 'M6 6l12 12M18 6 6 18', ...SW, 'stroke-width': 2.2 })),
  plus: () => svg('', s('path', { d: 'M12 5v14M5 12h14', ...SW, 'stroke-width': 2.2 })),
  pin: () => svg('', s('path', { d: 'M9 3h6l-1 6 3 3v2h-4v7l-1 1-1-1v-7H7v-2l3-3Z', fill: 'currentColor' })),
  pen: () => svg('',s('path', { d: 'M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16Z', ...SW })),
  reels: on => svg('', s('rect', { x: 3, y: 3, width: 18, height: 18, rx: 5, ...SW, fill: on ? 'currentColor' : 'none' }), s('path', { d: 'M3 8.5h18M9.2 3l3 5.5M15 3l3 5.5', ...SW, stroke: on ? 'var(--ps-bg)' : 'currentColor' }), s('path', { d: 'M10 11.6v5.8l4.9-2.9z', fill: on ? 'var(--ps-bg)' : 'currentColor' })),
  play: () => svg('', s('path', { d: 'M7 4.5v15l12.5-7.5z', fill: 'currentColor' })),
  music: () => svg('', s('path', { d: 'M9 17.5V5.5l11-2v12', ...SW }), s('circle', { cx: 6.5, cy: 17.5, r: 2.5, ...SW }), s('circle', { cx: 17.5, cy: 15.5, r: 2.5, ...SW })),
  cam: () => svg('', s('path', { d: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2.2h5.8L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z', ...SW }), s('circle', { cx: 12, cy: 12.5, r: 3.6, ...SW })),
};
const check = () => s('svg', { viewBox: '0 0 22 22', class: 'ps-check' },
  s('path', { d: 'M20.4 11c0-1.3-.8-2.4-2-3 .4-1.3.2-2.7-.7-3.6s-2.3-1.1-3.6-.7c-.6-1.2-1.7-2-3.1-2s-2.4.8-3 2c-1.3-.4-2.7-.2-3.6.7s-1.2 2.3-.7 3.6c-1.2.6-2 1.8-2 3.1s.8 2.4 2 3c-.4 1.3-.2 2.7.7 3.6s2.3 1.2 3.6.7c.6 1.2 1.8 2 3.1 2s2.5-.8 3.1-2c1.3.4 2.7.2 3.6-.7s1.2-2.3.7-3.6c1.2-.6 2-1.8 2-3.1z', fill: '#0095f6' }),
  s('path', { d: 'M9.6 15.1 6 11.6l1.3-1.3 2.1 2.1 4.4-4.8 1.4 1.3z', fill: '#fff' }));

// someone new commented on this oc's posts since you last looked
function freshComments(char, since) {
  const sd = char.fun?.social;
  if (!sd?.posts) return [];
  return sd.posts.flatMap(p => (p.comments || []).filter(c => c.at > since && c.who?.id !== char.id).map(c => ({ p, c })));
}
export function lockNotifs({ d, char, show }) {
  const seen = d.insta?.seen || 0;
  return freshComments(char, Math.max(seen, Date.now() - 2 * 864e5)).slice(-3).map(({ c }) => ({
    app: 'insta', title: 'snapshot', text: `${handleFor(c.who)} commented: ${c.text}`, at: c.at, faceOf: c.who,
    open: () => show('insta', { tab: 'activity' }, 'unlock'),
  }));
}
export const badges = ({ d, char }) => ({ insta: freshComments(char, d.insta?.seen || 0).length });

export function install(api) {
  const { d, char, mine, SCREENS } = api;
  d.insta = { saved: [], following: [], seen: 0, ...d.insta };
  const me = d.insta;

  // ---- whose data ----
  const own = () => {
    // an extra account (finsta) has its own profile + posts; the main one is the socials app's
    const extra = instaSd(char);
    if (extra) { for (const p of extra.posts) { p.comments ||= []; p.likes ??= 0; } return extra; }
    char.fun ||= {};
    const sd = char.fun.social ||= {};
    // fill in what's missing in place, so anything holding on to sd stays the real thing
    for (const [k, v] of Object.entries(SOCIAL_DEF)) if (!(k in sd)) sd[k] = structuredClone(v);
    for (const p of sd.posts) { p.comments ||= []; p.likes ??= 0; }
    return sd;
  };
  const sdOf = c => {
    if (c.id === char.id) return own();
    const sd = c.fun?.social;
    if (!sd) return EMPTY;
    sd.posts ||= [];
    sd.highlights ||= [];
    for (const p of sd.posts) { p.comments ||= []; p.likes ??= 0; }
    return sd;
  };
  const canEdit = c => mine && (c.id === char.id || store.isMine(c));
  const saveOf = c => { if (c.id === char.id) api.save(); else store.save('char', c); };
  // other ocs only get a real social profile once you touch it
  const ensure = c => {
    if (c.id === char.id) return own();
    c.fun ||= {};
    if (!c.fun.social) c.fun.social = structuredClone(SOCIAL_DEF);
    return sdOf(c);
  };
  const people = () => [char, ...allOcs(char.id)];
  const allPosts = () => people().flatMap(c => sdOf(c).posts.map(p => ({ c, p }))).sort((a, b) => b.p.at - a.p.at);
  const handleC = c => handleOf(c, sdOf(c));
  const av = (c, size = 'sm') => portrait(c, 'ps-av ' + size);
  const hasStory = c => { const sd = sdOf(c); return sd.highlights.some(hasMedia) || sd.posts.some(hasMedia); };

  // ---- app state (kept while the phone is open) ----
  let tab = 'home';
  let stack = []; // pages on top of the tab: { kind: 'profile' | 'post' | 'dms' | 'edit' | 'compose', ... }
  let feedScroll = 0;
  let reelScroll = 0;

  SCREENS.insta = (params = {}) => {
    if (params.tab) { tab = params.tab; stack = []; }
    const body = h('div', { class: 'ps-body' });
    const tabs = h('nav', { class: 'ps-tabs' });
    const layer = h('div', { class: 'ps-layer' });
    const root = h('div', { class: 'ph-app-screen ps-app' }, body, tabs, layer);

    const top = () => stack.at(-1);
    const push = page => { stack.push(page); draw('push'); };
    const pop = () => { stack.pop(); draw('pop'); };
    const goTab = t => {
      if (t === 'new') { newPost(); return; }
      if (t === tab && !stack.length) { body.querySelector('.ph-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      tab = t; stack = []; draw(null);
    };

    function draw(anim = null) {
      const page = top();
      let el;
      if (page?.kind === 'profile') el = profilePage(page.c);
      else if (page?.kind === 'post') el = postPage(page);
      else if (page?.kind === 'dms') el = dmsPage();
      else if (page?.kind === 'edit') el = editPage();
      else if (page?.kind === 'compose') el = composePage(page);
      else if (page?.kind === 'reels') el = reelsPage(page);
      else el = { home: homePage, explore: explorePage, activity: activityPage, reels: () => reelsPage(null), profile: () => profilePage(char) }[tab]();
      if (anim) el.classList.add('ps-in-' + anim);
      fill(body, el);
      root.classList.toggle('ps-dark', el.classList.contains('ps-reels-page'));
      if (!page && tab === 'home' && feedScroll) { const sc = el.querySelector('.ph-scroll'); if (sc) sc.scrollTop = feedScroll; }
      drawTabs();
    }
    function drawTabs() {
      const on = stack.length ? null : tab;
      const pfpTab = h('span', { class: 'ps-tab-pfp' + (tab === 'profile' ? ' on' : '') }, av(char, 'xs'));
      fill(tabs,
        h('button', { type: 'button', class: 'ps-tab' + (on === 'home' ? ' on' : ''), title: 'home', 'data-tab': 'home', onclick: () => goTab('home') }, ico.home(tab === 'home')),
        h('button', { type: 'button', class: 'ps-tab', title: 'search', 'data-tab': 'explore', onclick: () => goTab('explore') }, ico.search(tab === 'explore')),
        mine ? h('button', { type: 'button', class: 'ps-tab', title: 'new post', 'data-tab': 'new', onclick: () => goTab('new') }, ico.add()) : null,
        h('button', { type: 'button', class: 'ps-tab', title: 'reels', 'data-tab': 'reels', onclick: () => goTab('reels') }, ico.reels(on === 'reels')),
        h('button', { type: 'button', class: 'ps-tab', title: 'profile', 'data-tab': 'profile', onclick: () => goTab('profile') }, pfpTab));
    }
    const bar = (left, title, right, cls = '') => h('div', { class: 'ps-bar' + (cls ? ' ' + cls : '') }, h('div', { class: 'ps-bar-l' }, left), title, h('div', { class: 'ps-bar-r' }, right));
    const backBtn = () => h('button', { type: 'button', class: 'ps-ibtn', title: 'back', onclick: pop }, ico.back());
    const homeBtn = () => h('button', { type: 'button', class: 'ps-ibtn ps-exit', title: 'home', onclick: () => api.goHome() }, ico.back());

    const unreadDms = () => d.threads.filter(t => unreadCount(t)).length;

    // ================= home feed =================
    function homePage() {
      const list = allPosts();
      const sc = h('div', { class: 'ph-scroll ps-scroll', onscroll: () => { feedScroll = sc.scrollTop; } },
        storiesRow(),
        list.length ? list.map(x => postCard(x.c, x.p)) : h('div', { class: 'ps-empty' }, h('span', { class: 'ps-empty-ring' }, ico.add()), mine ? h('button', { type: 'button', class: 'ps-btn blue', onclick: newPost }, 'first post') : null));
      return h('div', { class: 'ps-page' },
        bar(homeBtn(), h('b', { class: 'ps-logo' }, 'snapshot'),
          [h('button', { type: 'button', class: 'ps-ibtn', title: 'activity', onclick: () => goTab('activity') }, ico.heart(false), freshComments(char, me.seen).length ? h('i', { class: 'ps-heart-dot' }) : null),
            h('button', { type: 'button', class: 'ps-ibtn', title: 'messages', onclick: () => push({ kind: 'dms' }) }, ico.send(), unreadDms() ? h('i', { class: 'ps-count' }, Math.min(9, unreadDms())) : null)], 'home'),
        sc);
    }
    function storiesRow() {
      const others = people().filter(c => c.id !== char.id && hasStory(c));
      return h('div', { class: 'ps-stories' },
        h('button', { type: 'button', class: 'ps-story', onclick: () => (hasStory(char) ? openStory(char) : mine && newHighlight()) },
          h('span', { class: 'ps-ring' + (hasStory(char) ? ' live' : ' none') }, av(char, 'lg'), mine ? h('i', { class: 'ps-story-plus', onclick: e => { e.stopPropagation(); newHighlight(); } }, '+') : null),
          h('span', { class: 'ps-story-name' }, 'your story')),
        others.map(c => h('button', { type: 'button', class: 'ps-story', onclick: () => openStory(c) },
          h('span', { class: 'ps-ring live' }, av(c, 'lg')),
          h('span', { class: 'ps-story-name' }, handleC(c)))));
    }

    // one post in a feed
    function postCard(c, p, { fresh = false } = {}) {
      const sd = sdOf(c);
      const heart = h('button', { type: 'button', class: 'ps-act', title: 'like' });
      const likes = h('button', { type: 'button', class: 'ps-likes' });
      const drawLike = () => {
        fill(heart, ico.heart(!!p.liked));
        const liker = p.comments.find(x => x.who?.id && ocById(x.who.id) && x.who.id !== c.id);
        fill(likes, liker && p.likes > 1 ? [face(liker.who, 'ps-av xxs'), h('span', {}, 'liked by ', h('b', {}, handleFor(liker.who)), ' and ', h('b', {}, `${bigNum(p.likes - 1)} others`))] : h('b', {}, `${bigNum(p.likes)} ${p.likes === 1 ? 'like' : 'likes'}`));
      };
      heart.onclick = () => { like(c, p, media); drawLike(); heart.classList.remove('boing'); void heart.offsetWidth; heart.classList.add('boing'); };
      drawLike();
      const media = h('div', { class: 'ps-media' + (p.video && !p.imageId ? ' vid' : '') }, p.imageId ? pic(p.imageId) : p.video ? null : h('div', { class: 'ps-text-post' }, h('span', {}, p.caption)));
      if (p.video && !p.imageId) {
        const v = liveVid(p.video, '', { sound: true });
        media.append(v, soundBtn('ps-snd'));
        tapToPause(v, media);
      }
      doubleTap(media, () => { if (!p.liked) { like(c, p, media); drawLike(); } else pop2(media); });
      const saved = me.saved.includes(p.id);
      const saveBtn = h('button', {
        type: 'button', class: 'ps-act ps-save', title: 'save', onclick: () => {
          if (!mine) return;
          const on = !me.saved.includes(p.id);
          me.saved = on ? [...me.saved, p.id] : me.saved.filter(x => x !== p.id);
          api.save();
          fill(saveBtn, ico.save(on));
        },
      }, ico.save(saved));
      const comments = p.comments;
      return h('article', { class: 'ps-post' + (fresh ? ' fresh' : ''), 'data-post': p.id },
        h('div', { class: 'ps-post-head' },
          h('button', { type: 'button', class: 'ps-who', onclick: () => openProfile(c) },
            h('span', { class: 'ps-ring sm' + (hasStory(c) ? ' live' : ' none') }, av(c, 'sm')),
            h('span', { class: 'ps-who-text' }, h('b', {}, handleC(c), sd.verified ? check() : null), p.id === sd.pinned ? h('small', {}, 'pinned') : null)),
          canEdit(c) ? h('button', { type: 'button', class: 'ps-ibtn sm', title: 'more', onclick: () => postMenu(c, p) }, ico.dots()) : null),
        media,
        h('div', { class: 'ps-acts' }, heart,
          h('button', { type: 'button', class: 'ps-act', title: 'comment', onclick: () => openComments(c, p) }, ico.comment()),
          h('button', { type: 'button', class: 'ps-act', title: 'share', onclick: () => shareSheet(c, p) }, ico.send()),
          saveBtn),
        likes,
        p.caption && hasMedia(p) ? h('p', { class: 'ps-cap' }, h('b', {}, handleC(c)), ' ', captionBits(p.caption)) : null,
        comments.length > 2 ? h('button', { type: 'button', class: 'ps-view-c', onclick: () => openComments(c, p) }, `view all ${comments.length} comments`) : null,
        comments.slice(-2).map(x => h('p', { class: 'ps-cap' }, h('b', {}, handleFor(x.who)), ' ', x.text)),
        h('span', { class: 'ps-ago' }, timeAgo(p.at)));
    }
    // @names + #tags in a caption go blue
    function captionBits(text) {
      return text.split(/([@#][\w.]+)/g).map(bit => (/^[@#][\w.]+$/.test(bit) ? h('span', { class: 'ps-tagged' }, bit) : bit));
    }
    function like(c, p, media) {
      if (!canEdit(c)) { pop2(media); return; }
      p.liked = !p.liked;
      p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
      if (p.liked) pop2(media);
      saveOf(c);
    }
    function pop2(media) {
      if (!media) return;
      const b = h('span', { class: 'ps-burst' }, ico.heart(true));
      media.append(b);
      setTimeout(() => b.remove(), 900);
    }
    function doubleTap(el, fn) {
      let last = 0;
      el.addEventListener('pointerup', e => {
        if (e.button > 0) return;
        const now = Date.now();
        if (now - last < 320) { last = 0; fn(); } else last = now;
      });
    }
    function postMenu(c, p) {
      const sd = sdOf(c);
      sheet('', close => [
        h('button', { type: 'button', class: 'ps-sheet-row', onclick: () => { close(); sd.pinned = sd.pinned === p.id ? null : p.id; saveOf(c); draw(); } }, sd.pinned === p.id ? 'unpin' : 'pin to profile'),
        h('button', { type: 'button', class: 'ps-sheet-row', onclick: () => { close(); push({ kind: 'compose', c, post: p }); } }, 'edit'),
        h('button', {
          type: 'button', class: 'ps-sheet-row red', onclick: async () => {
            close();
            if (!(await confirmDialog('delete this post?', { danger: true, okLabel: 'delete' }))) return;
            sd.posts = sd.posts.filter(x => x !== p);
            if (sd.pinned === p.id) sd.pinned = null;
            dropImage(p.imageId);
            dropImage(p.video?.imageId);
            saveOf(c);
            if (top()?.kind === 'post' || (top()?.kind === 'reels' && !sd.posts.some(x => x.video))) stack.pop();
            draw();
          },
        }, 'delete'),
      ]);
    }

    // ================= sheets + overlays (inside the phone) =================
    function sheet(title, rows, { tall = false, cls = '' } = {}) {
      const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 240); };
      const panel = h('div', { class: 'ps-sheet' + (tall ? ' tall' : '') + (cls ? ' ' + cls : '') }, h('i', { class: 'ps-grab' }), title ? h('b', { class: 'ps-sheet-title' }, title) : null);
      const wrap = h('div', { class: 'ps-sheet-wrap', onclick: e => { if (e.target === wrap) close(); } }, panel);
      const kids = rows(close);
      (Array.isArray(kids) ? kids : [kids]).forEach(k => k && panel.append(k));
      layer.append(wrap);
      return { close, panel };
    }

    function openComments(c, p) {
      const sd = sdOf(c);
      const edit = canEdit(c);
      const defaultAs = () => {
        if (c.id !== char.id) return { ...refOf(char), acct: acctId(char) };
        const rel = store.relsOf(char.id).map(r => (r.a === char.id ? r.b : r.a)).find(id => id && allOcs(char.id).some(o => o.id === id));
        const o = rel ? ocById(rel) : allOcs(char.id)[0];
        return o ? refOf(o) : { ...refOf(char), acct: acctId(char) };
      };
      let as = defaultAs();
      const list = h('div', { class: 'ph-scroll ps-c-list' });
      const asBtn = h('button', { type: 'button', class: 'ps-c-as', title: 'comment as', onclick: async () => { const r = await pickWho({ title: 'comment as', not: char.id, okLabel: 'comment as them' }); if (r) { as = r; drawAs(); } } });
      const drawAs = () => { fill(asBtn, face(as, 'ps-av xs')); input.placeholder = `comment as ${handleFor(as)}`; };
      const input = h('input', { type: 'text', class: 'ps-c-input', maxLength: 400, onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } } });
      const postBtn = h('button', { type: 'button', class: 'ps-c-post', onclick: () => add() }, 'post');
      function add() {
        const text = input.value.trim();
        if (!text) return;
        p.comments.push({ id: 'c_' + uid(), who: freshRef(as), text, at: Date.now() });
        input.value = '';
        saveOf(c);
        drawList(true);
      }
      function drawList(anim = false) {
        fill(list,
          p.caption && hasMedia(p) ? h('div', { class: 'ps-c cap' }, av(c, 'sm'), h('div', { class: 'ps-c-main' }, h('p', {}, h('b', {}, handleC(c)), ' ', captionBits(p.caption)), h('span', { class: 'ps-ago' }, shortAgo(p.at)))) : null,
          p.comments.length ? p.comments.map((x, i) => {
            const w = who(x.who);
            const heart = h('button', { type: 'button', class: 'ps-c-heart' + (x.liked ? ' on' : ''), title: 'like', onclick: () => { if (!edit) return; x.liked = !x.liked; saveOf(c); heart.classList.toggle('on', !!x.liked); fill(heart, ico.heart(!!x.liked)); } }, ico.heart(!!x.liked));
            return h('div', { class: 'ps-c' + (anim && i === p.comments.length - 1 ? ' new' : '') },
              h('button', { type: 'button', class: 'ps-c-face', onclick: () => { if (w.char) { closeIt(); openProfile(w.char); } } }, face(x.who, 'ps-av sm')),
              h('div', { class: 'ps-c-main' },
                h('p', { class: 'ps-c-top' }, h('b', {}, handleFor(x.who)), w.char && sdOf(w.char).verified ? check() : null, h('span', { class: 'ps-ago in' }, shortAgo(x.at))),
                h('p', { class: 'ps-c-text' }, captionBits(x.text)),
                edit ? h('div', { class: 'ps-c-subs' },
                  h('button', { type: 'button', class: 'ps-c-del', onclick: () => { input.value = `@${handleFor(x.who)} `; input.focus(); } }, 'reply'),
                  h('button', { type: 'button', class: 'ps-c-del', onclick: () => { p.comments = p.comments.filter(y => y !== x); saveOf(c); drawList(); } }, 'delete')) : null),
              heart);
          }) : h('div', { class: 'ps-c-none' }, h('b', {}, 'no comments yet')));
        requestAnimationFrame(() => { if (anim) list.scrollTop = list.scrollHeight; });
      }
      drawList();
      const { close: closeIt } = sheet('comments', () => [
        list,
        edit ? h('div', { class: 'ps-c-foot' },
          h('div', { class: 'ps-c-emo' }, ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map(e => h('button', { type: 'button', onclick: () => { input.value += e; input.focus(); } }, e))),
          h('div', { class: 'ps-c-add' }, asBtn, input, postBtn)) : null,
      ], { tall: true, cls: 'ps-comments' });
      // redraw the page under it when it closes so counts update
      const wrap = layer.lastChild;
      const obs = new MutationObserver(() => { if (!wrap.isConnected) { obs.disconnect(); draw(); } });
      obs.observe(layer, { childList: true });
      if (edit) drawAs();
      void sd;
    }

    function shareSheet(c, p) {
      const others = allOcs(char.id);
      sheet('share', close => [
        h('div', { class: 'ps-share-grid' }, others.length ? others.map(o => {
          const btn = h('button', { type: 'button', class: 'ps-btn blue sm', onclick: () => { btn.textContent = 'sent'; btn.classList.remove('blue'); btn.disabled = true; } }, 'send');
          return h('div', { class: 'ps-share-oc' }, av(o, 'md'), h('span', {}, handleC(o)), btn);
        }) : h('div', { class: 'ps-c-none' }, h('b', {}, 'no one to send it to'))),
        h('button', { type: 'button', class: 'ps-btn wide', onclick: close }, 'done'),
      ]);
      void p;
    }

    // stories: the oc's highlights, or their newest pictures if they don't have any
    function storyFrames(c) {
      const sd = sdOf(c);
      const hl = sd.highlights.filter(hasMedia).map(x => ({ imageId: x.imageId || null, video: x.video || null, label: x.label, at: null }));
      if (hl.length) return hl;
      return [...sd.posts].filter(hasMedia).sort((a, b) => b.at - a.at).slice(0, 4).map(p => ({ imageId: p.imageId || null, video: p.imageId ? null : p.video || null, label: '', at: p.at, caption: p.caption }));
    }
    function openStory(c, startAt = 0) {
      const ring = people().filter(hasStory);
      let ui = Math.max(0, ring.findIndex(x => x.id === c.id));
      let fi = startAt;
      let timer = null;
      const wasScreen = api.screen.dataset.screen;
      api.screen.dataset.screen = 'viewer';
      const box = h('div', { class: 'ps-story-view' });
      const close = () => { clearTimeout(timer); api.screen.dataset.screen = wasScreen; box.classList.add('out'); setTimeout(() => box.remove(), 220); };
      const step = k => {
        const frames = storyFrames(ring[ui]);
        fi += k;
        if (fi >= frames.length) { ui++; fi = 0; if (ui >= ring.length) { close(); return; } }
        if (fi < 0) { ui--; if (ui < 0) { ui = 0; fi = 0; } else fi = storyFrames(ring[ui]).length - 1; }
        paint();
      };
      function paint() {
        clearTimeout(timer);
        const who2 = ring[ui];
        const frames = storyFrames(who2);
        const f = frames[fi];
        if (!f) { close(); return; }
        // a video frame lasts as long as the video (the bar fills along with it)
        const ms = f.video ? Math.max(1, Math.min(60, f.video.dur || 5)) * 1000 : 4500;
        let media;
        if (f.video) {
          media = vid(f.video, 'ps-story-img', { autoplay: true, sound: true, loop: false });
          media.addEventListener('ended', () => { if (box.isConnected) step(1); });
        } else media = pic(f.imageId, 'ps-story-img');
        fill(box,
          media,
          h('div', { class: 'ps-story-shade' }),
          h('div', { class: 'ps-story-bars', style: { '--dur': ms + 'ms' } }, frames.map((_, k) => h('i', { class: k < fi ? 'done' : k === fi ? 'now' : '' }, h('b')))),
          h('div', { class: 'ps-story-who' }, av(who2, 'xs'), h('b', {}, handleC(who2)), h('span', {}, f.label || (f.at ? shortAgo(f.at) : '')),
            f.video ? soundBtn('ps-story-snd') : null,
            h('button', { type: 'button', class: 'ps-story-x', title: 'close', onclick: e => { e.stopPropagation(); close(); } }, ico.x())),
          f.caption ? h('div', { class: 'ps-story-cap' }, f.caption) : null,
          h('div', { class: 'ps-story-reply' }, h('span', {}, 'send message'), ico.heart(false), ico.send()),
          h('button', { type: 'button', class: 'ps-story-tap l', title: 'back', onclick: () => step(-1) }),
          h('button', { type: 'button', class: 'ps-story-tap r', title: 'next', onclick: () => step(1) }));
        timer = setTimeout(() => { if (box.isConnected) step(1); }, f.video ? ms + 1500 : ms);
      }
      layer.append(box);
      paint();
    }

    async function newHighlight() {
      if (!mine) return;
      const p = await pickMedia(1200);
      if (!p) return;
      const sd = own();
      sheet('new highlight', close => {
        const label = h('input', { type: 'text', class: 'ps-input', placeholder: 'name', maxLength: 16 });
        setTimeout(() => label.focus(), 250);
        let kept = false;
        const wrap = layer.lastChild;
        const obs = new MutationObserver(() => { if (!wrap?.isConnected) { obs.disconnect(); if (!kept) { dropImage(p.imageId); dropImage(p.video?.imageId); } } });
        setTimeout(() => obs.observe(layer, { childList: true }), 0);
        return [
          h('div', { class: 'ps-hl-prev' }, p.video ? vid(p.video, '', { autoplay: true }) : pic(p.imageId)),
          label,
          h('button', { type: 'button', class: 'ps-btn blue wide', onclick: () => { kept = true; sd.highlights.push({ id: 'h_' + uid(), label: label.value.trim() || 'xoxo', imageId: p.imageId || null, ...(p.video ? { video: p.video } : {}) }); api.save(); close(); draw(); } }, 'add'),
        ];
      });
    }

    // ================= post page (one post, or a profile's posts from one on) =================
    function openPost(c, p) { push({ kind: 'post', c, id: p.id }); }
    function postPage(page) {
      const sd = sdOf(page.c);
      const sorted = [...sd.posts].sort((a, b) => b.at - a.at);
      const i = sorted.findIndex(p => p.id === page.id);
      const list = i < 0 ? [] : sorted.slice(i);
      const sc = h('div', { class: 'ph-scroll ps-scroll' }, list.map(p => postCard(page.c, p, { fresh: page.fresh && p.id === page.id })));
      return h('div', { class: 'ps-page' },
        bar(backBtn(), h('div', { class: 'ps-bar-title two' }, h('small', {}, handleC(page.c)), h('b', {}, 'posts')), null),
        sc);
    }

    // ================= reels (full screen, one video per swipe) =================
    // page = null for the reels tab (everyone's), or { c, id } for one person's reels starting at one
    function reelsPage(page) {
      let list = page ? [...sdOf(page.c).posts].sort((a, b) => b.at - a.at).map(p => ({ c: page.c, p })) : allPosts();
      list = list.filter(x => x.p.video && !x.p.imageId);
      const sc = h('div', { class: 'ps-reels', onscroll: () => { if (!page) reelScroll = sc.scrollTop; } }, list.length ? list.map(x => reelCard(x.c, x.p)) :
        h('div', { class: 'ps-reels-empty' }, h('span', { class: 'ps-empty-ring' }, ico.reels(false)), mine ? h('button', { type: 'button', class: 'ps-btn blue sm', onclick: newReel }, 'new reel') : null));
      requestAnimationFrame(() => {
        const el = page?.id && sc.querySelector(`[data-post="${page.id}"]`);
        sc.scrollTop = el ? el.offsetTop : page ? 0 : reelScroll;
      });
      return h('div', { class: 'ps-page ps-reels-page' },
        h('div', { class: 'ps-reels-top' },
          page ? backBtn() : homeBtn(),
          h('b', {}, page ? handleC(page.c) : 'reels'),
          mine && !page ? h('button', { type: 'button', class: 'ps-ibtn', title: 'new reel', onclick: newReel }, ico.cam()) : h('span', { class: 'ps-ibtn' })),
        sc);
    }
    function reelCard(c, p) {
      const v = liveVid(p.video, 'ps-reel-vid', { sound: true });
      const card = h('div', { class: 'ps-reel', 'data-post': p.id }, v);
      tapToPause(v, card);
      const heart = h('button', { type: 'button', class: 'ps-reel-act', title: 'like' });
      const drawHeart = () => fill(heart, ico.heart(!!p.liked), h('span', {}, bigNum(p.likes)));
      drawHeart();
      heart.onclick = () => { like(c, p, card); drawHeart(); };
      doubleTap(card, () => { if (!p.liked) { like(c, p, card); drawHeart(); } else pop2(card); });
      const self = c.id === char.id;
      const f = me.following.includes(c.id);
      const followBtn = !self ? h('button', {
        type: 'button', class: 'ps-reel-follow', onclick: e => {
          e.stopPropagation();
          if (!mine) return;
          const on = !me.following.includes(c.id);
          me.following = on ? [...me.following, c.id] : me.following.filter(x => x !== c.id);
          api.save();
          e.currentTarget.textContent = on ? 'following' : 'follow';
        },
      }, f ? 'following' : 'follow') : null;
      card.append(
        h('div', { class: 'ps-reel-shade' }),
        soundBtn('ps-reel-snd'),
        h('div', { class: 'ps-reel-rail' },
          heart,
          h('button', { type: 'button', class: 'ps-reel-act', title: 'comment', onclick: () => openComments(c, p) }, ico.comment(), h('span', {}, bigNum(p.comments.length))),
          h('button', { type: 'button', class: 'ps-reel-act', title: 'share', onclick: () => shareSheet(c, p) }, ico.send()),
          canEdit(c) ? h('button', { type: 'button', class: 'ps-reel-act', title: 'more', onclick: () => postMenu(c, p) }, ico.dots()) : h('span', { class: 'ps-reel-act' }, ico.dots()),
          h('span', { class: 'ps-reel-disc' }, av(c, 'xs'))),
        h('div', { class: 'ps-reel-info' },
          h('div', { class: 'ps-reel-who' },
            h('button', { type: 'button', class: 'ps-reel-name', onclick: () => openProfile(c) }, av(c, 'xs'), h('b', {}, handleC(c)), sdOf(c).verified ? check() : null),
            followBtn),
          p.caption ? h('p', { class: 'ps-reel-cap' }, captionBits(p.caption)) : null,
          h('div', { class: 'ps-reel-audio' }, ico.music(), h('span', {}, `${handleC(c)} · original audio`))));
      return card;
    }

    // ================= new post / edit post =================
    async function newPost() {
      if (!mine) return;
      const p = await pickMedia(1400);
      if (!p) return;
      push({ kind: 'compose', c: char, imageId: p.imageId || null, video: p.video || null, upload: true });
    }
    async function newReel() {
      if (!mine) return;
      const v = await addVideo();
      if (!v) return;
      push({ kind: 'compose', c: char, imageId: null, video: v, upload: true });
    }
    function composePage(page) {
      const post = page.post || null;
      const c = page.c;
      const imageId = post ? post.imageId : page.imageId;
      const video = post ? post.video || null : page.video || null;
      const cap = h('textarea', { class: 'ps-compose-cap', placeholder: 'write a caption', maxLength: 1000, value: post?.caption || '' });
      const cancel = () => { if (page.upload) { dropImage(imageId); dropImage(video?.imageId); } pop(); };
      const share = () => {
        const sd = ensure(c);
        if (post) {
          post.caption = cap.value.trim();
          saveOf(c);
          pop();
          return;
        }
        const likes = Math.floor(80 + Math.random() * 900);
        const np = { id: 'p_' + uid(), imageId, caption: cap.value.trim(), likes, at: Date.now(), liked: false, comments: [] };
        if (video) Object.assign(np, { video, views: fakeViews(likes) });
        sd.posts.push(np);
        page.upload = false;
        saveOf(c);
        tab = 'profile';
        stack = [{ kind: 'post', c, id: np.id, fresh: true }];
        draw('push');
      };
      setTimeout(() => cap.focus(), 350);
      return h('div', { class: 'ps-page ps-compose' },
        bar(h('button', { type: 'button', class: 'ps-ibtn', title: 'cancel', onclick: cancel }, ico.x()), h('b', { class: 'ps-bar-title' }, post ? 'edit' : video ? 'new reel' : 'new post'),
          h('button', { type: 'button', class: 'ps-text-btn', onclick: share }, post ? 'done' : 'share')),
        h('div', { class: 'ph-scroll ps-scroll' },
          h('div', { class: 'ps-compose-pic' + (video && !imageId ? ' vid' : '') }, imageId ? pic(imageId) : video ? vid(video, '', { autoplay: true }) : h('div', { class: 'ps-text-post' }, h('span', {}, post?.caption || ''))),
          h('div', { class: 'ps-compose-row' }, av(char, 'sm'), cap)));
    }

    // ================= explore =================
    let query = '';
    function explorePage() {
      const results = h('div', { class: 'ph-scroll ps-scroll' });
      const input = h('input', { type: 'search', class: 'ps-search', placeholder: 'search', value: query, oninput: e => { query = e.target.value; drawResults(); } });
      function drawResults() {
        const q = query.trim().toLowerCase();
        if (q) {
          const found = people().filter(c => nameOf(c).toLowerCase().includes(q) || handleC(c).includes(q) || (sdOf(c).display || '').toLowerCase().includes(q));
          fill(results, found.length ? found.map(c => h('button', { type: 'button', class: 'ps-acct', onclick: () => openProfile(c) },
            h('span', { class: 'ps-ring sm' + (hasStory(c) ? ' live' : ' none') }, av(c, 'md')),
            h('span', { class: 'ps-acct-text' }, h('b', {}, handleC(c), sdOf(c).verified ? check() : null), h('span', {}, [sdOf(c).display || nameOf(c), relLabel(char, c.id)].filter(Boolean).join(' · '))))) :
            h('div', { class: 'ps-c-none' }, h('b', {}, `no results for "${query.trim()}"`)));
          return;
        }
        const all = allPosts();
        // like the real explore page, reels show up as tall tiles that play muted
        fill(results, all.length ? h('div', { class: 'ps-explore' }, all.map((x, i) => {
          const reel = x.p.video && !x.p.imageId;
          return h('button', {
            type: 'button', class: 'ps-tile' + (reel ? ' tall' : i % 10 === 2 ? ' big' : ''), onclick: () => (reel ? push({ kind: 'reels', c: x.c, id: x.p.id }) : openPost(x.c, x.p)),
          }, reel ? liveVid(x.p.video, 'ps-tvid') : thumbOf(x.p), reel ? h('i', { class: 'ps-tile-ico' }, ico.reels(false)) : null);
        })) : h('div', { class: 'ps-c-none' }, h('b', {}, 'nothing here yet')));
      }
      drawResults();
      return h('div', { class: 'ps-page' },
        h('div', { class: 'ps-search-row' }, homeBtn(), h('label', { class: 'ps-search-box' }, ico.search(false), input)),
        results);
    }

    // ================= activity =================
    function activityPage() {
      const sd = own();
      const items = [];
      for (const p of sd.posts) {
        for (const x of p.comments) if (x.who?.id !== char.id) items.push({ at: x.at, kind: 'comment', ref: x.who, p, text: x.text });
        if (p.likes > 0) {
          const liker = p.comments.find(x => x.who?.id && ocById(x.who.id) && x.who.id !== char.id) || null;
          items.push({ at: p.at + 9e5, kind: 'like', ref: liker?.who || null, p, n: p.likes });
        }
      }
      allOcs(char.id).forEach((c, i) => items.push({ at: (c.createdAt || char.createdAt || Date.now()) + i * 6e4, kind: 'follow', ref: refOf(c), c }));
      items.sort((a, b) => b.at - a.at);
      const groups = [['today', 864e5], ['this week', 7 * 864e5], ['this month', 30 * 864e5], ['earlier', Infinity]];
      let lastGroup = null;
      const rows = [];
      for (const it of items) {
        const age = Date.now() - it.at;
        const g = groups.find(([, max]) => age < max)[0];
        if (g !== lastGroup) { rows.push(h('b', { class: 'ps-act-group' }, g)); lastGroup = g; }
        rows.push(activityRow(it));
      }
      // looking at activity = caught up
      if (mine && freshComments(char, me.seen).length) { me.seen = Date.now(); api.save(); }
      return h('div', { class: 'ps-page' },
        bar(homeBtn(), h('b', { class: 'ps-bar-title' }, 'activity'), null),
        h('div', { class: 'ph-scroll ps-scroll' },
          h('div', { class: 'ps-act-head' }, h('div', { class: 'ps-act-stack' }, allOcs(char.id).slice(0, 2).map(c => av(c, 'sm'))),
            h('div', {}, h('b', {}, 'followers'), h('span', {}, `${bigNum(sd.followers)} people follow you`))),
          rows.length ? rows : h('div', { class: 'ps-c-none' }, h('b', {}, 'nothing yet'))));
    }
    function activityRow(it) {
      const thumb = it.p ? h('button', { type: 'button', class: 'ps-act-thumb', onclick: () => openPost(char, it.p) }, thumbOf(it.p, 'xs')) : null;
      if (it.kind === 'comment') {
        return h('div', { class: 'ps-act-row' }, face(it.ref, 'ps-av md'),
          h('p', {}, h('b', {}, handleFor(it.ref)), ' commented: ', it.text, ' ', h('span', { class: 'ps-ago in' }, shortAgo(it.at))), thumb);
      }
      if (it.kind === 'like') {
        return h('div', { class: 'ps-act-row' }, it.ref ? face(it.ref, 'ps-av md') : h('span', { class: 'ps-like-ico' }, ico.heart(true)),
          h('p', {}, it.ref ? [h('b', {}, handleFor(it.ref)), it.n > 1 ? [' and ', h('b', {}, `${bigNum(it.n - 1)} others`)] : null] : h('b', {}, `${bigNum(it.n)} people`), ' liked your post. ', h('span', { class: 'ps-ago in' }, shortAgo(it.at))), thumb);
      }
      const f = me.following.includes(it.c.id);
      const btn = h('button', {
        type: 'button', class: 'ps-btn sm' + (f ? '' : ' blue'), onclick: () => {
          if (!mine) return;
          const on = !me.following.includes(it.c.id);
          me.following = on ? [...me.following, it.c.id] : me.following.filter(x => x !== it.c.id);
          api.save();
          btn.textContent = on ? 'following' : 'follow back';
          btn.classList.toggle('blue', !on);
        },
      }, f ? 'following' : 'follow back');
      return h('div', { class: 'ps-act-row' },
        h('button', { type: 'button', class: 'ps-c-face', onclick: () => openProfile(it.c) }, av(it.c, 'md')),
        h('p', {}, h('b', {}, handleC(it.c)), ' started following you. ', h('span', { class: 'ps-ago in' }, shortAgo(it.at))), btn);
    }

    // ================= profile =================
    const profTab = {};
    function openProfile(c) {
      if (c.id === char.id && !stack.length) { goTab('profile'); return; }
      push({ kind: 'profile', c });
    }
    function profilePage(c) {
      const self = c.id === char.id;
      const sd = sdOf(c);
      const posts = [...sd.posts].sort((a, b) => b.at - a.at);
      const pin = posts.find(p => p.id === sd.pinned);
      const ordered = pin ? [pin, ...posts.filter(p => p !== pin)] : posts;
      const handle = handleC(c);
      const tagged = allPosts().filter(x => x.c.id !== c.id && (x.p.caption || '').toLowerCase().includes('@' + handle));
      const savedPosts = self ? allPosts().filter(x => me.saved.includes(x.p.id)) : [];
      let which = profTab[c.id] || 'grid';
      if (which === 'saved' && !(self && mine)) which = 'grid';
      const gridEl = h('div', { class: 'ps-grid' });
      const tabRow = h('div', { class: 'ps-ptabs' });
      const reels = posts.filter(p => p.video && !p.imageId);
      const drawGrid = () => {
        const list = which === 'grid' ? ordered.map(p => ({ c, p })) : which === 'reels' ? reels.map(p => ({ c, p })) : which === 'tagged' ? tagged : savedPosts;
        const tabBtn = (id, title, icon) => h('button', { type: 'button', class: which === id ? 'on' : '', title, 'data-ptab': id, onclick: () => { which = profTab[c.id] = id; drawGrid(); } }, icon);
        fill(tabRow,
          tabBtn('grid', 'posts', ico.grid()),
          tabBtn('reels', 'reels', ico.reels(false)),
          tabBtn('tagged', 'tagged', ico.tag()),
          self && mine ? tabBtn('saved', 'saved', ico.save(false)) : null);
        gridEl.classList.toggle('reels', which === 'reels');
        fill(gridEl, list.length ? list.map(x => {
          const reel = x.p.video && !x.p.imageId;
          return h('button', { type: 'button', class: 'ps-tile' + (reel ? ' is-reel' : ''), 'data-post': x.p.id, onclick: () => (reel ? push({ kind: 'reels', c: x.c, id: x.p.id }) : openPost(x.c, x.p)) },
            thumbOf(x.p),
            x.p.id === sd.pinned && which === 'grid' ? h('i', { class: 'ps-tile-pin' }, ico.pin()) : null,
            reel && which !== 'reels' ? h('i', { class: 'ps-tile-ico' }, ico.reels(false)) : null,
            reel && which === 'reels' ? h('span', { class: 'ps-tile-views' }, ico.play(), bigNum(x.p.views || fakeViews(x.p.likes))) : null);
        }) :
          h('div', { class: 'ps-grid-empty' }, h('span', { class: 'ps-empty-ring' }, which === 'tagged' ? ico.tag() : which === 'saved' ? ico.save(false) : which === 'reels' ? ico.reels(false) : ico.grid()),
            h('b', {}, which === 'tagged' ? 'no tagged posts' : which === 'saved' ? 'nothing saved' : which === 'reels' ? 'no reels yet' : 'no posts yet'),
            which === 'grid' && self && mine ? h('button', { type: 'button', class: 'ps-text-btn', onclick: newPost }, 'share your first photo') : null,
            which === 'reels' && self && mine ? h('button', { type: 'button', class: 'ps-text-btn', onclick: newReel }, 'new reel') : null));
      };
      drawGrid();
      const following = me.following.includes(c.id);
      const followBtn = h('button', {
        type: 'button', class: 'ps-btn' + (following ? '' : ' blue'), onclick: () => {
          if (!mine) return;
          const on = !me.following.includes(c.id);
          me.following = on ? [...me.following, c.id] : me.following.filter(x => x !== c.id);
          api.save();
          followBtn.textContent = on ? 'following' : 'follow';
          followBtn.classList.toggle('blue', !on);
          countEl.textContent = bigNum((sd.followers || 0) + (on ? 1 : 0));
        },
      }, following ? 'following' : 'follow');
      const countEl = h('b', {}, bigNum((sd.followers || 0) + (following && !self ? 1 : 0)));
      const message = () => {
        let t = d.threads.find(x => x.who.id === c.id);
        if (!t && !mine) return;
        if (!t) { t = { id: 't_' + uid(), who: refOf(c), msgs: [], read: true, typing: false, at: Date.now() }; d.threads.push(t); api.save(); }
        api.show('thread', { id: t.id });
      };
      const link = sd.link ? h('a', { class: 'ps-link', href: /^https?:/.test(sd.link) ? sd.link : null, target: '_blank', rel: 'noopener' }, sd.link.replace(/^https?:\/\//, '')) : null;
      return h('div', { class: 'ps-page' },
        bar(stack.length ? backBtn() : homeBtn(), h('b', { class: 'ps-bar-title handle', 'data-acct-switch': self && mine }, handle, sd.verified ? check() : null),
          self && mine ? h('button', { type: 'button', class: 'ps-ibtn', title: 'new post', onclick: newPost }, ico.add()) : null),
        h('div', { class: 'ph-scroll ps-scroll' },
          h('div', { class: 'ps-prof-head' },
            h('button', { type: 'button', class: 'ps-ring xl' + (hasStory(c) ? ' live' : ' none'), onclick: () => { if (hasStory(c)) openStory(c); } }, av(c, 'xl')),
            h('div', { class: 'ps-counts' },
              h('div', {}, h('b', {}, bigNum(posts.length)), h('span', {}, 'posts')),
              h('div', {}, countEl, h('span', {}, 'followers')),
              h('div', {}, h('b', {}, bigNum(sd.following || 0)), h('span', {}, 'following')))),
          h('div', { class: 'ps-bio' },
            h('b', {}, sd.display || nameOf(c)),
            c.tagline ? h('span', { class: 'ps-cat' }, c.tagline) : null,
            sd.bio ? h('p', {}, captionBits(sd.bio)) : null,
            link,
            !self && relLabel(char, c.id) ? h('span', { class: 'ps-rel' }, relLabel(char, c.id)) : null),
          h('div', { class: 'ps-prof-btns' },
            self ? [
              mine ? h('button', { type: 'button', class: 'ps-btn', onclick: () => push({ kind: 'edit' }) }, 'edit profile') : null,
              h('button', { type: 'button', class: 'ps-btn', onclick: () => shareSheet(c, null) }, 'share profile'),
            ] : [followBtn, h('button', { type: 'button', class: 'ps-btn', onclick: message }, 'message')]),
          highlightsRow(c, self),
          tabRow,
          gridEl));
    }
    function highlightsRow(c, self) {
      const sd = sdOf(c);
      const hls = sd.highlights.filter(hasMedia);
      if (!hls.length && !(self && mine)) return null;
      return h('div', { class: 'ps-hls' },
        hls.map((hl, i) => h('button', { type: 'button', class: 'ps-hl', onclick: () => openStory(c, i) },
          h('span', { class: 'ps-hl-pic' }, thumbOf(hl)), h('span', { class: 'ps-hl-label' }, hl.label))),
        self && mine ? h('button', { type: 'button', class: 'ps-hl new', onclick: newHighlight }, h('span', { class: 'ps-hl-pic' }, ico.plus()), h('span', { class: 'ps-hl-label' }, 'new')) : null);
    }

    // ================= edit profile =================
    // the account's own picture (the oc's page picture never changes)
    function pfpEdit() {
      const box = h('div', { class: 'ps-edit-pfp' });
      const draw = () => fill(box, h('button', {
        type: 'button', class: 'ps-edit-pfp-btn', onclick: async () => {
          const [p] = await addPhotos(false, 600);
          const a = activeOf(char, 'insta');
          if (!p || !a) return;
          updateAccount(api, 'insta', a.id, { imageId: p.imageId });
          draw();
        },
      }, av(char, 'xl'), h('span', {}, 'edit picture')));
      draw();
      return box;
    }
    function editPage() {
      const sd = own();
      const draft = { display: sd.display, handle: sd.handle, bio: sd.bio, link: sd.link, followers: sd.followers, following: sd.following, verified: sd.verified };
      const field = (label, input) => h('label', { class: 'ps-edit-row' }, h('span', {}, label), input);
      const text = (key, ph, max) => h('input', { type: 'text', class: 'ps-edit-in', value: draft[key] || '', placeholder: ph, maxLength: max, 'data-k': key, oninput: e => { draft[key] = e.target.value; } });
      const num = key => h('input', { type: 'number', class: 'ps-edit-in', min: 0, value: draft[key] || 0, 'data-k': key, oninput: e => { draft[key] = Math.max(0, Math.round(Number(e.target.value) || 0)); } });
      const bio = h('textarea', { class: 'ps-edit-in bio', maxLength: 150, value: draft.bio || '', placeholder: 'bio', 'data-k': 'bio', oninput: e => { draft.bio = e.target.value; } });
      const vSwitch = h('button', { type: 'button', class: 'ph-switch' + (draft.verified ? ' on' : ''), 'data-k': 'verified', onclick: e => { draft.verified = !draft.verified; e.currentTarget.classList.toggle('on', draft.verified); } }, h('i'));
      const done = () => {
        Object.assign(sd, draft, { handle: slug(draft.handle || '').slice(0, 30), display: (draft.display || '').trim(), bio: (draft.bio || '').trim(), link: (draft.link || '').trim() });
        api.save();
        pop();
      };
      return h('div', { class: 'ps-page ps-edit' },
        bar(h('button', { type: 'button', class: 'ps-text-btn plain', onclick: pop }, 'cancel'), h('b', { class: 'ps-bar-title' }, 'edit profile'), h('button', { type: 'button', class: 'ps-text-btn', onclick: done }, 'done')),
        h('div', { class: 'ph-scroll ps-scroll' },
          pfpEdit(),
          field('name', text('display', nameOf(char), 40)),
          field('username', text('handle', handleC(char), 30)),
          field('bio', bio),
          field('link', text('link', 'link', 80)),
          field('followers', num('followers')),
          field('following', num('following')),
          h('div', { class: 'ps-edit-row' }, h('span', {}, 'verified'), vSwitch)));
    }

    // ================= messages =================
    function dmsPage() {
      const list = [...d.threads].sort((a, b) => (b.msgs.at(-1)?.at || b.at || 0) - (a.msgs.at(-1)?.at || a.at || 0));
      const newDm = async () => {
        const ref = await pickWho({ title: 'new message', not: char.id, okLabel: 'message' });
        if (!ref) return;
        let t = d.threads.find(x => (ref.id && x.who.id === ref.id) || (!ref.id && !x.who.id && x.who.name.toLowerCase() === ref.name.toLowerCase()));
        if (!t) { t = { id: 't_' + uid(), who: ref, msgs: [], read: true, typing: false, at: Date.now() }; d.threads.push(t); api.save(); }
        api.show('thread', { id: t.id });
      };
      const online = allOcs(char.id);
      return h('div', { class: 'ps-page' },
        bar(backBtn(), h('b', { class: 'ps-bar-title handle' }, handleC(char)), mine ? h('button', { type: 'button', class: 'ps-ibtn', title: 'new message', onclick: newDm }, ico.pen()) : null),
        h('div', { class: 'ph-scroll ps-scroll' },
          online.length ? h('div', { class: 'ps-online' }, online.map(c => h('button', { type: 'button', class: 'ps-story', onclick: () => openProfile(c) },
            h('span', { class: 'ps-online-pic' }, av(c, 'lg'), h('i')), h('span', { class: 'ps-story-name' }, nameOf(c).split(' ')[0])))) : null,
          h('b', { class: 'ps-act-group' }, 'messages'),
          list.length ? list.map(t => {
            const last = t.msgs.at(-1);
            const unread = !!unreadCount(t);
            return h('button', { type: 'button', class: 'ps-dm' + (unread ? ' unread' : ''), onclick: () => api.show('thread', { id: t.id }) },
              face(t.who, 'ps-av md'),
              h('span', { class: 'ps-dm-text' }, h('b', {}, who(t.who).name),
                h('span', {}, last ? `${last.from === 'me' ? 'you: ' : ''}${last.imageId && !last.text ? 'sent a photo' : last.text} · ${shortAgo(last.at)}` : 'say hi')),
              unread ? h('i', { class: 'ps-dm-dot' }) : null);
          }) : h('div', { class: 'ps-c-none' }, h('b', {}, 'no messages'))));
    }

    draw(null);
    return root;
  };
}
