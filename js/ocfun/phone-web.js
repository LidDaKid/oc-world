// phone apps: browser (search history), maps (find my friends), voice memos, games,
// + shortcut icons to the socials + diaries apps. see the plug-in notes at the top of phone.js

import { h, s, fill, uid, openModal, confirmDialog, toast } from '../ui.js';
import { store } from '../store.js';
import { sticker, portrait, nameOf } from './kit.js';
import { who, face, freshRef, pickWho, hm, hmA, dayLabel, ago } from './phone-bits.js';

export const APPS = {
  browser: { label: 'safari', icon: '1f9ed', bg: 'linear-gradient(160deg,#fff,#dfe9f7)' },
  maps: { label: 'find my', icon: '1f5fa-fe0f', bg: 'linear-gradient(160deg,#7ee08a,#2fae5a)' },
  memos: { label: 'voice memos', icon: '1f399-fe0f', bg: 'linear-gradient(160deg,#2b2b30,#0c0c0f)' },
  games: { label: 'games', icon: '1f3ae', bg: 'linear-gradient(160deg,#c58bff,#6a2bd9)' },
  socials: { label: 'socials', icon: '1f4f2', bg: 'linear-gradient(160deg,#ff8ac4,#d81e5b)', link: 'social' },
  diaries: { label: 'diaries', icon: '1f4d3', bg: 'linear-gradient(160deg,#ffe3f1,#ffb3d6)', link: 'diaries' },
};

export const DEF = {
  browser: { searches: [], tabs: [], faves: [] },
  findmy: { me: null, people: [] },
  memos: [],
  arcade: { snake: 0, bat: 0 },
};

// ---- little helpers ----
function hashStr(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickR = (r, list) => list[Math.floor(r() * list.length)];
const clock = sec => { sec = Math.max(0, Math.round(sec || 0)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
const agoText = ts => { const a = ago(ts); return a === 'now' ? 'now' : a + ' ago'; };

const ico = {
  back: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('path', { d: 'M15 4 7 12l8 8', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
  fwd: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('path', { d: 'm9 4 8 8-8 8', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
  star: on => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('path', { d: 'm12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z', fill: on ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linejoin': 'round' })),
  tabs: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('rect', { x: 3, y: 7, width: 14, height: 14, rx: 3, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9 }), s('path', { d: 'M7 3h11a3 3 0 0 1 3 3v11', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round' })),
  search: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico sm' }, s('circle', { cx: 10.5, cy: 10.5, r: 6.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2 }), s('path', { d: 'm15.5 15.5 5 5', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round' })),
  clock: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico sm' }, s('circle', { cx: 12, cy: 12, r: 8.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }), s('path', { d: 'M12 7v5l3 2', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })),
  locate: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('path', { d: 'M21 3 3 10.5l7.5 3 3 7.5Z', fill: 'currentColor' })),
  play: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('path', { d: 'M7 4.5v15l13-7.5Z', fill: 'currentColor' })),
  pause: () => s('svg', { viewBox: '0 0 24 24', class: 'pw-ico' }, s('rect', { x: 6, y: 4.5, width: 4.2, height: 15, rx: 1.2, fill: 'currentColor' }), s('rect', { x: 13.8, y: 4.5, width: 4.2, height: 15, rx: 1.2, fill: 'currentColor' })),
};

export function install(api) {
  const { d, char, mine, save, show, header, SCREENS } = api;
  const b = d.browser = { searches: [], tabs: [], faves: [], ...d.browser };
  const fm = d.findmy = { me: null, people: [], ...d.findmy };
  d.memos ||= [];
  d.arcade = { snake: 0, bat: 0, ...d.arcade };
  const home = () => api.goHome();

  // ================= browser =================
  let tabId = null; // the open tab (not saved)
  SCREENS.browser = (params = {}) => {
    let mode = params.mode || (params.q ? 'results' : 'start');
    let q = params.q || '';
    if (params.tab) tabId = params.tab;
    const body = h('div', { class: 'ph-scroll pw-br-body' });
    const input = h('input', {
      type: 'text', class: 'pw-br-input', maxLength: 120, placeholder: 'search or enter website', readOnly: !mine, enterKeyHint: 'search',
      onfocus: () => input.select(),
      onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); search(input.value); } },
    });
    const favBtn = h('button', { type: 'button', class: 'pw-tool', title: 'favorite', onclick: () => toggleFave() });
    const tabBtn = h('button', { type: 'button', class: 'pw-tool pw-tabs-btn', title: 'tabs', onclick: () => { mode = 'tabs'; draw(); } });
    const backBtn = h('button', { type: 'button', class: 'pw-tool', title: 'back', onclick: () => { if (mode === 'start') home(); else { mode = 'start'; draw(); } } }, ico.back());
    const bar = h('div', { class: 'pw-br-bar' },
      h('div', { class: 'pw-br-addr' }, h('span', { class: 'pw-aa' }, 'aA'), input, ico.search()),
      h('div', { class: 'pw-br-tools' }, backBtn, h('button', { type: 'button', class: 'pw-tool', disabled: true }, ico.fwd()), favBtn, tabBtn));
    const wrap = h('div', { class: 'ph-app-screen pw-browser' }, body, bar);

    function curTab() { return b.tabs.find(t => t.id === tabId); }
    function search(text) {
      text = text.trim().replace(/\s+/g, ' ');
      if (!text) return;
      q = text;
      if (mine) {
        b.searches.push({ id: 'q_' + uid(), q, at: Date.now() });
        if (b.searches.length > 300) b.searches.splice(0, b.searches.length - 300);
        let t = curTab();
        if (!t) { t = { id: 'tb_' + uid(), q }; b.tabs.push(t); tabId = t.id; } else t.q = q;
        save();
      }
      input.blur();
      mode = 'results';
      draw();
    }
    function open(text) {
      q = text;
      if (mine) { const t = curTab(); if (t) { t.q = q; save(); } }
      mode = 'results';
      draw();
    }
    function toggleFave() {
      if (!mine || mode !== 'results') return;
      const i = b.faves.findIndex(f => f.q.toLowerCase() === q.toLowerCase());
      if (i >= 0) b.faves.splice(i, 1); else b.faves.push({ id: 'f_' + uid(), q });
      save();
      draw();
    }

    function startPage() {
      const groups = [];
      for (const sr of [...b.searches].reverse()) {
        const label = dayLabel(sr.at);
        const key = label === 'today' || label === 'yesterday' ? label : 'earlier';
        let g = groups.find(x => x.key === key);
        if (!g) groups.push(g = { key, list: [] });
        g.list.push(sr);
      }
      return [
        h('div', { class: 'pw-sec-head' }, h('b', {}, 'favorites')),
        h('div', { class: 'pw-faves' },
          b.faves.map(f => {
            const c = `hsl(${hashStr(f.q) % 360} 70% 62%)`;
            return h('button', { type: 'button', class: 'pw-fave', onclick: () => open(f.q) },
              h('span', { class: 'pw-fave-tile', style: { background: c } }, f.q[0]?.toUpperCase() || '?'),
              h('span', { class: 'pw-fave-name' }, f.q));
          }),
          !b.faves.length ? h('div', { class: 'pw-fave pw-fave-empty' }, h('span', { class: 'pw-fave-tile' }), h('span', { class: 'pw-fave-name' }, '—')) : null),
        h('div', { class: 'pw-sec-head' }, h('b', {}, 'recently searched'),
          mine && b.searches.length ? h('button', {
            type: 'button', class: 'pw-link', onclick: async () => {
              if (!(await confirmDialog('clear search history?', { danger: true, okLabel: 'clear' }))) return;
              b.searches = []; save(); draw();
            },
          }, 'clear') : null),
        groups.length ? groups.map(g => [
          h('div', { class: 'pw-day' }, g.key),
          h('div', { class: 'ph-group pw-hist' }, g.list.map(sr => h('div', { class: 'ph-row pw-hist-row', 'data-id': sr.id, onclick: e => { if (!e.target.closest('.pw-x')) open(sr.q); } },
            h('span', { class: 'pw-hist-ico' }, ico.clock()),
            h('div', { class: 'ph-row-main' }, h('b', {}, sr.q)),
            h('span', { class: 'pw-hist-time' }, hm(sr.at)),
            mine ? h('button', { type: 'button', class: 'pw-x', title: 'remove', onclick: () => { b.searches = b.searches.filter(x => x !== sr); save(); draw(); } }, '✕') : null))),
        ]) : h('div', { class: 'ph-empty sm' }, sticker('1f9ed', 'ph-empty-stk')),
      ];
    }

    function resultsPage() {
      const r = rng(hashStr(q.toLowerCase()));
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const big = words.slice().sort((x, y) => y.length - x.length)[0] || 'this';
      const slug = words.join('_');
      const subs = ['emo', 'teenagers', 'TrueOffMyChest', 'NoStupidQuestions', 'scene', 'monsterhigh', 'witchcraft', 'relationship_advice', 'oddlyspecific'];
      const sub = pickR(r, subs);
      const pool = [
        { site: 'wikipedia', url: `en.wikipedia.org › wiki › ${slug}`, title: `${q} - wikipedia`, text: `${q} is a term most commonly used to describe ${pickR(r, ['a feeling', 'a situation', 'a phenomenon', 'a habit', 'a style'])} associated with ${big}. it became widely known in the early 2000s.` },
        { site: 'reddit', url: `reddit.com › r › ${sub}`, title: `${pickR(r, ['is it weird that', 'does anyone else', 'help:', 'update:'])} ${q} : r/${sub}`, text: `${Math.floor(r() * 900 + 40)} answers · posted ${Math.floor(r() * 11 + 1)} months ago. ok so this might sound dumb but ${q} and i genuinely need to know if...` },
        { site: 'youtube', url: 'youtube.com › watch', title: `${q} (${pickR(r, ['easy tutorial', 'storytime', 'gone wrong', 'explained in 5 min', 'full video'])})`, text: `${Math.floor(r() * 900 + 12)}k views · ${pickR(r, ['2 weeks', '3 years', '8 months', '1 day'])} ago`, video: true },
        { site: 'tumblr', url: `tumblr.com › tagged › ${words[0] || 'q'}`, title: `#${words.join('')} on tumblr`, text: `discover ${q} posts, gifs and art. ${Math.floor(r() * 90 + 2)}k notes` },
        { site: 'quora', url: 'quora.com › ' + words.join('-'), title: `what does it mean if ${q}?`, text: `answer (1 of ${Math.floor(r() * 30 + 3)}): honestly it depends. when i was your age ${big} was totally different...` },
        { site: 'wikihow', url: 'wikihow.com › ' + words.join('-'), title: `how to ${q}: ${Math.floor(r() * 9 + 5)} steps (with pictures)`, text: `last updated ${pickR(r, ['march', 'june', 'october', 'january'])} · co-authored by ${pickR(r, ['a licensed therapist', 'a professional stylist', 'our staff', 'a vampire expert'])}` },
        { site: 'pinterest', url: 'pinterest.com › ideas', title: `${Math.floor(r() * 90 + 10)} ${big} ideas | ${q}`, text: `find and save ideas about ${q} on pinterest.` },
      ];
      const results = pool.map(x => ({ x, k: r() })).sort((a, b2) => a.k - b2.k).map(o => o.x).slice(0, 5);
      const paa = [
        [`what does ${q} mean?`, `${q} usually means exactly what it sounds like, but people use it a lot of different ways online.`],
        [`is ${q} bad?`, `not necessarily. most sources say it depends on the situation and the person.`],
        [`why is ${big} so popular?`, `${big} blew up after a few viral posts and never really went away.`],
        [`can you ${q} at night?`, `yes, plenty of people do. just maybe don't tell your parents.`],
      ].sort(() => r() - .5).slice(0, 3);
      const faved = b.faves.some(f => f.q.toLowerCase() === q.toLowerCase());
      fill(favBtn, ico.star(faved));
      favBtn.classList.toggle('on', faved);
      const cols = ['#ffb3d6', '#b18cff', '#141114', '#7df9d0', '#ffd84d'];
      return h('div', { class: 'pw-results' },
        h('div', { class: 'pw-g-logo' }, h('b', {}, 'g'), h('b', {}, 'o'), h('b', {}, 'o'), h('b', {}, 'g'), h('b', {}, 'l'), h('b', {}, 'e')),
        h('div', { class: 'pw-g-search' }, ico.search(), h('span', {}, q)),
        h('div', { class: 'pw-g-tabs' }, ['all', 'images', 'videos', 'news', 'shopping'].map((t, i) => h('span', { class: i === 0 ? 'on' : '' }, t))),
        h('div', { class: 'pw-g-count' }, `about ${(Math.floor(r() * 9e6) + 12e4).toLocaleString()} results (${(r() * .6 + .2).toFixed(2)} seconds)`),
        results.slice(0, 2).map(card),
        h('div', { class: 'pw-paa' }, h('b', { class: 'pw-paa-title' }, 'people also ask'),
          paa.map(([qq, a]) => h('details', { class: 'pw-paa-q' }, h('summary', {}, qq), h('p', {}, a)))),
        h('div', { class: 'pw-g-imgs' }, cols.map((c, i) => h('i', { style: { background: `linear-gradient(${Math.floor(r() * 360)}deg, ${c}, ${cols[(i + 2) % cols.length]})` } }))),
        results.slice(2).map(card));
      function card(x) {
        return h('div', { class: 'pw-res' },
          h('div', { class: 'pw-res-site' }, h('span', { class: 'pw-res-fav', style: { background: `hsl(${hashStr(x.site) % 360} 65% 55%)` } }, x.site[0]), h('div', {}, h('b', {}, x.site), h('span', {}, x.url))),
          h('a', { class: 'pw-res-title', href: 'javascript:void 0', onclick: e => e.preventDefault() }, x.title),
          x.video ? h('div', { class: 'pw-res-vid' }, h('i'), h('span', {}, clock(r() * 900 + 40))) : null,
          h('p', { class: 'pw-res-text' }, x.text));
      }
    }

    function tabsPage() {
      return h('div', { class: 'pw-tabs' },
        h('div', { class: 'pw-tab-grid' }, b.tabs.map(t => h('div', {
          class: 'pw-tab' + (t.id === tabId ? ' on' : ''), onclick: e => {
            if (e.target.closest('.pw-x')) return;
            tabId = t.id;
            if (t.q) open(t.q); else { mode = 'start'; draw(); }
          },
        },
          h('div', { class: 'pw-tab-top' }, h('span', {}, t.q || 'start page'),
            mine ? h('button', { type: 'button', class: 'pw-x', title: 'close', onclick: () => { b.tabs = b.tabs.filter(x => x !== t); if (tabId === t.id) tabId = null; save(); draw(); } }, '✕') : null),
          h('div', { class: 'pw-tab-prev' }, t.q ? [h('em', {}, 'google'), h('i'), h('i', { class: 'short' }), h('i'), h('i', { class: 'short' })] : sticker('1f9ed', 'pw-tab-stk'))))),
        !b.tabs.length ? h('div', { class: 'ph-empty sm' }, h('b', { class: 'pw-sub' }, 'no tabs')) : null);
    }

    function draw() {
      wrap.dataset.mode = mode;
      input.value = mode === 'results' ? q : '';
      fill(favBtn, ico.star(false));
      favBtn.classList.remove('on');
      favBtn.disabled = mode !== 'results' || !mine;
      fill(tabBtn, ico.tabs(), h('em', {}, b.tabs.length || ''));
      if (mode === 'tabs') {
        fill(body, tabsPage());
        bar.classList.add('tabs-mode');
        fill(bar.querySelector('.pw-br-tools'),
          mine ? h('button', { type: 'button', class: 'pw-tool pw-newtab', title: 'new tab', onclick: () => { const t = { id: 'tb_' + uid(), q: '' }; b.tabs.push(t); tabId = t.id; save(); mode = 'start'; restoreTools(); draw(); } }, '+') : h('span'),
          h('b', { class: 'pw-tabcount' }, `${b.tabs.length} ${b.tabs.length === 1 ? 'tab' : 'tabs'}`),
          h('button', { type: 'button', class: 'pw-tool pw-done', onclick: () => { mode = curTab()?.q ? 'results' : 'start'; if (curTab()?.q) q = curTab().q; restoreTools(); draw(); } }, 'done'));
      } else {
        fill(body, mode === 'results' ? resultsPage() : startPage());
        body.scrollTop = 0;
      }
    }
    function restoreTools() {
      bar.classList.remove('tabs-mode');
      fill(bar.querySelector('.pw-br-tools'), backBtn, h('button', { type: 'button', class: 'pw-tool', disabled: true }, ico.fwd()), favBtn, tabBtn);
    }
    draw();
    return wrap;
  };

  // ================= find my =================
  const PLACES = ['home', 'school', 'the mall', 'hot topic', 'the cemetery', 'band practice', 'the skatepark', 'starbucks', 'work', 'the park', 'the library', 'a concert'];
  const STREETS = ['bat st', 'coffin ave', 'velvet rd', 'lace ln', 'raven way', 'crypt blvd', 'moth st', 'rose ave'];
  const seedR = () => rng(hashStr(char.id + 'map'));
  if (!fm.me) fm.me = { place: 'home', x: 48, y: 52, at: Date.now() };

  function buildMap() {
    const r = seedR();
    const N = 1000;
    const vx = [], hy = [];
    for (let x = 60 + r() * 40; x < N; x += 120 + r() * 70) vx.push(x);
    for (let y = 60 + r() * 40; y < N; y += 110 + r() * 80) hy.push(y);
    const mainV = vx[Math.floor(vx.length / 2)], mainH = hy[Math.floor(hy.length / 2) - 1] ?? hy[0];
    const parts = [s('rect', { class: 'pw-land', width: N, height: N })];
    const xs = [0, ...vx, N], ys = [0, ...hy, N];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + 9, y0 = ys[j] + 9, w = xs[i + 1] - xs[i] - 18, hh = ys[j + 1] - ys[j] - 18;
      if (w < 20 || hh < 20) continue;
      const k = r();
      if (k < .16) {
        parts.push(s('rect', { class: 'pw-park', x: x0, y: y0, width: w, height: hh, rx: 14 }));
        for (let t = 0; t < 4; t++) parts.push(s('circle', { class: 'pw-tree', cx: x0 + 14 + r() * (w - 28), cy: y0 + 14 + r() * (hh - 28), r: 6 + r() * 6 }));
      } else {
        // a few buildings in each block
        const cols = w > 90 ? 2 : 1, rows = hh > 90 ? 2 : 1;
        for (let a = 0; a < cols; a++) for (let c = 0; c < rows; c++) {
          const bw = w / cols, bh = hh / rows;
          parts.push(s('rect', { class: k > .85 ? 'pw-bld alt' : 'pw-bld', x: x0 + a * bw + 3, y: y0 + c * bh + 3, width: bw - 6, height: bh - 6, rx: 6 }));
        }
      }
    }
    // a river wandering across
    const y0 = 650 + r() * 200, amp = 60 + r() * 60, ph = r() * 6;
    let dPath = '';
    for (let x = -20; x <= N + 20; x += 20) dPath += `${x === -20 ? 'M' : 'L'}${x},${(y0 + Math.sin(x / 140 + ph) * amp - x * .25).toFixed(1)} `;
    parts.push(s('path', { class: 'pw-water-edge', d: dPath }), s('path', { class: 'pw-water', d: dPath }));
    // roads (bridges over the river)
    for (const x of vx) parts.push(s('line', { class: x === mainV ? 'pw-road main' : 'pw-road', x1: x, y1: 0, x2: x, y2: N }));
    for (const y of hy) parts.push(s('line', { class: y === mainH ? 'pw-road main' : 'pw-road', x1: 0, y1: y, x2: N, y2: y }));
    parts.push(s('line', { class: 'pw-road main', x1: 0, y1: N * .15 + r() * 100, x2: N, y2: N * .55 + r() * 200 }));
    // street names
    const names = [...STREETS].sort(() => r() - .5);
    hy.slice(0, 4).forEach((y, i) => parts.push(s('text', { class: 'pw-street', x: 120 + r() * 500, y: y + 4 }, names[i])));
    vx.slice(0, 3).forEach((x, i) => parts.push(s('text', { class: 'pw-street', x: x + 4, y: 200 + r() * 500, transform: `rotate(90 ${x + 4} ${200})` }, names[i + 4])));
    return s('svg', { class: 'pw-map-svg', viewBox: `0 0 ${N} ${N}`, preserveAspectRatio: 'none' }, parts);
  }

  SCREENS.maps = (params, view) => {
    let sel = null; // 'me' or a person id
    let sheetUp = true;
    const layer = h('div', { class: 'pw-map-layer' }, buildMap());
    const pinsEl = h('div', { class: 'pw-pins' });
    layer.append(pinsEl);
    const vp = h('div', { class: 'pw-map' }, layer);
    let pan = { x: 0, y: 0 };
    const applyPan = (smooth = false) => {
      const W = layer.offsetWidth, H = layer.offsetHeight, vw = vp.clientWidth, vh = vp.clientHeight;
      pan.x = Math.min(0, Math.max(vw - W, pan.x));
      pan.y = Math.min(0, Math.max(vh - H - (sheetUp ? sheet.offsetHeight * .8 : 0), pan.y));
      layer.classList.toggle('smooth', smooth);
      layer.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
    };
    const flyTo = (p, smooth = true) => {
      const vh = vp.clientHeight * (sheetUp ? .62 : .9);
      pan = { x: vp.clientWidth / 2 - layer.offsetWidth * p.x / 100, y: vh / 2 - layer.offsetHeight * p.y / 100 };
      applyPan(smooth);
    };
    // panning the map
    vp.addEventListener('pointerdown', e => {
      if (e.target.closest('.pw-pin, .pw-map-btn')) return;
      const sx = e.clientX, sy = e.clientY, start = { ...pan };
      vp.setPointerCapture(e.pointerId);
      const move = ev => { pan = { x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy }; applyPan(); };
      const up = () => { vp.removeEventListener('pointermove', move); vp.removeEventListener('pointerup', up); vp.removeEventListener('pointercancel', up); };
      vp.addEventListener('pointermove', move);
      vp.addEventListener('pointerup', up);
      vp.addEventListener('pointercancel', up);
    });

    const everyone = () => [{ key: 'me', p: fm.me, ref: { id: char.id, name: nameOf(char) }, me: true }, ...fm.people.map(p => ({ key: p.id, p, ref: p.who }))];
    function drawPins() {
      fill(pinsEl, everyone().map(o => {
        const pin = h('div', { class: 'pw-pin' + (o.me ? ' me' : '') + (sel === o.key ? ' on' : ''), 'data-key': o.key, style: { left: o.p.x + '%', top: o.p.y + '%', '--c': who(o.ref).color } },
          h('div', { class: 'pw-pin-bubble' }, o.me ? portrait(char, 'pw-pin-face') : face(o.ref, 'pw-pin-face')),
          h('b', { class: 'pw-pin-name' }, o.me ? 'me' : who(o.ref).name.split(' ')[0]));
        // tap = select, drag (owner) = move
        pin.addEventListener('pointerdown', e => {
          e.stopPropagation();
          const sx = e.clientX, sy = e.clientY;
          let moved = false;
          pin.setPointerCapture(e.pointerId);
          const move = ev => {
            if (!mine) return;
            if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
            moved = true;
            pin.classList.add('dragging');
            const r = layer.getBoundingClientRect();
            o.p.x = Math.max(2, Math.min(98, (ev.clientX - r.left) / r.width * 100));
            o.p.y = Math.max(2, Math.min(98, (ev.clientY - r.top) / r.height * 100));
            pin.style.left = o.p.x + '%';
            pin.style.top = o.p.y + '%';
          };
          const up = () => {
            pin.removeEventListener('pointermove', move); pin.removeEventListener('pointerup', up); pin.removeEventListener('pointercancel', up);
            pin.classList.remove('dragging');
            if (moved) { o.p.at = Date.now(); save(); drawSheet(); } else select(o.key);
          };
          pin.addEventListener('pointermove', move);
          pin.addEventListener('pointerup', up);
          pin.addEventListener('pointercancel', up);
        });
        return pin;
      }));
    }
    function select(key) {
      sel = key;
      const o = everyone().find(x => x.key === key);
      if (o) flyTo(o.p);
      drawPins();
      drawSheet();
    }

    function placeBox(o) {
      const inp = h('input', { type: 'text', value: o.p.place || '', maxLength: 40, placeholder: 'where', 'data-autofocus': '' });
      const set = (v, close) => { o.p.place = v.trim() || 'somewhere'; o.p.at = Date.now(); save(); close(); drawSheet(); };
      const m = openModal({
        title: o.me ? 'where am i' : `where's ${who(o.ref).name}`,
        body: h('div', { class: 'pw-place-box' }, inp,
          h('div', { class: 'pw-place-picks' }, PLACES.map(pl => h('button', { type: 'button', class: 'chip', onclick: () => set(pl, m.close) }, pl)))),
        actions: [{ label: 'set', kind: 'primary', onClick: close => set(inp.value, close) }],
      });
    }
    async function addPerson() {
      const ref = await pickWho({ title: 'share location with', not: char.id, okLabel: 'add' });
      if (!ref) return;
      if (fm.people.some(p => (ref.id && p.who.id === ref.id) || (!ref.id && !p.who.id && p.who.name.toLowerCase() === ref.name.toLowerCase()))) return;
      const r = Math.random;
      const p = { id: 'fp_' + uid(), who: freshRef(ref), place: pickR(r, PLACES), x: 12 + r() * 76, y: 12 + r() * 76, at: Date.now() - Math.floor(r() * 50) * 60e3 };
      fm.people.push(p);
      save();
      select(p.id);
    }

    const sheet = h('div', { class: 'pw-sheet' });
    function drawSheet() {
      sheet.classList.toggle('down', !sheetUp);
      fill(sheet,
        h('button', { type: 'button', class: 'pw-grab', title: sheetUp ? 'hide' : 'show', onclick: () => { sheetUp = !sheetUp; drawSheet(); } }, h('i')),
        h('div', { class: 'pw-sheet-head' }, h('b', {}, 'people'), api.plusBtn(addPerson, 'add someone')),
        h('div', { class: 'pw-sheet-list' },
          everyone().map(o => h('div', { class: 'ph-row pw-person' + (sel === o.key ? ' on' : ''), 'data-key': o.key, onclick: e => { if (!e.target.closest('button')) select(o.key); } },
            o.me ? portrait(char, 'sm') : face(o.ref, 'sm'),
            h('div', { class: 'ph-row-main' }, h('b', {}, o.me ? 'me' : who(o.ref).name), h('div', { class: 'ph-row-sub' }, o.p.place || 'somewhere', ' · ', agoText(o.p.at || Date.now()))),
            mine ? h('button', { type: 'button', class: 'pw-mini', title: 'change place', onclick: () => placeBox(o) }, 'move') : null,
            mine && !o.me ? h('button', {
              type: 'button', class: 'pw-x', title: 'remove', onclick: async () => {
                if (!(await confirmDialog(`stop sharing with ${who(o.ref).name}?`, { danger: true, okLabel: 'stop' }))) return;
                fm.people = fm.people.filter(x => x !== o.p); if (sel === o.key) sel = null; save(); drawPins(); drawSheet();
              },
            }, '✕') : null))));
    }
    drawPins();
    drawSheet();
    const ro = new ResizeObserver(() => { if (view.isConnected) { const o = everyone().find(x => x.key === (sel || 'me')); flyTo(o ? o.p : fm.me, false); } });
    requestAnimationFrame(() => { flyTo(fm.me, false); ro.observe(vp); });
    api.onLeave(() => ro.disconnect());
    return h('div', { class: 'ph-app-screen pw-maps' },
      vp,
      h('button', { type: 'button', class: 'pw-map-btn pw-map-back', title: 'home', onclick: home }, ico.back()),
      h('button', { type: 'button', class: 'pw-map-btn pw-map-me', title: 'me', onclick: () => select('me') }, ico.locate()),
      sheet);
  };

  // ================= voice memos =================
  let audio = null;
  SCREENS.memos = (params, view) => {
    let open = null; // memo id that's expanded
    let rec = null; // { mr, stream, chunks, start, ctx, analyser, raf, timer }
    const list = h('div', { class: 'ph-scroll pw-memo-list' });
    const recPanel = h('div', { class: 'pw-rec' });
    const stopAudio = () => { if (audio) { audio.pause(); audio = null; } };

    function drawList() {
      const memos = [...d.memos].sort((a, c) => c.at - a.at);
      fill(list, memos.length ? memos.map(m => memoRow(m)) : h('div', { class: 'ph-empty sm' }, sticker('1f399-fe0f', 'ph-empty-stk')));
    }
    function memoRow(m) {
      const isOpen = open === m.id;
      const row = h('div', { class: 'pw-memo' + (isOpen ? ' open' : ''), 'data-id': m.id });
      const name = mine && isOpen
        ? h('input', { type: 'text', class: 'pw-memo-name-in', value: m.name, maxLength: 60, onchange: e => { m.name = e.target.value.trim() || 'new recording'; save(); }, onclick: e => e.stopPropagation() })
        : h('b', { class: 'pw-memo-name' }, m.name);
      const top = h('div', { class: 'pw-memo-top', onclick: () => { if (open !== m.id) { stopAudio(); open = m.id; drawList(); } } },
        h('div', { class: 'ph-row-main' }, name, h('div', { class: 'pw-memo-meta' }, h('span', {}, dayLabel(m.at) === 'today' ? hmA(m.at) : dayLabel(m.at)), h('span', {}, clock(m.dur)))));
      row.append(top);
      if (isOpen) {
        const seek = h('input', { type: 'range', class: 'pw-seek', min: 0, max: 1000, value: 0 });
        const tNow = h('span', {}, '0:00'), tLeft = h('span', {}, '-' + clock(m.dur));
        const playBtn = h('button', { type: 'button', class: 'pw-play', title: 'play' }, ico.play());
        const setT = cur => { seek.value = Math.round(cur / (m.dur || 1) * 1000); tNow.textContent = clock(cur); tLeft.textContent = '-' + clock((m.dur || 0) - cur); };
        playBtn.onclick = async e => {
          e.stopPropagation();
          if (audio && audio.__id === m.id) {
            if (audio.paused) audio.play().catch(() => {}); else audio.pause();
            return;
          }
          stopAudio();
          const url = await store.imageURL(m.imageId);
          if (!url) { toast("can't find that recording", 'bad'); return; }
          const a = new Audio(url);
          a.__id = m.id;
          audio = a;
          a.addEventListener('timeupdate', () => setT(Math.min(a.currentTime, m.dur || a.currentTime)));
          a.addEventListener('play', () => { fill(playBtn, ico.pause()); row.classList.add('playing'); });
          a.addEventListener('pause', () => { fill(playBtn, ico.play()); row.classList.remove('playing'); });
          a.addEventListener('ended', () => { fill(playBtn, ico.play()); setT(0); row.classList.remove('playing'); });
          a.play().catch(() => {});
        };
        seek.oninput = () => { const t = seek.value / 1000 * (m.dur || 0); setT(t); if (audio && audio.__id === m.id) audio.currentTime = t; };
        row.append(
          h('div', { class: 'pw-scrub' }, seek, h('div', { class: 'pw-scrub-t' }, tNow, tLeft)),
          h('div', { class: 'pw-memo-ctl' },
            h('span'),
            h('button', { type: 'button', class: 'pw-skip', title: 'back 15', onclick: e => { e.stopPropagation(); if (audio && audio.__id === m.id) audio.currentTime = Math.max(0, audio.currentTime - 15); } }, '15', h('i', { class: 'l' })),
            playBtn,
            h('button', { type: 'button', class: 'pw-skip', title: 'forward 15', onclick: e => { e.stopPropagation(); if (audio && audio.__id === m.id) audio.currentTime = Math.min(m.dur || 0, audio.currentTime + 15); } }, '15', h('i', { class: 'r' })),
            mine ? h('button', {
              type: 'button', class: 'pw-trash', title: 'delete', onclick: async e => {
                e.stopPropagation();
                if (!(await confirmDialog(`delete "${m.name}"?`, { danger: true, okLabel: 'delete' }))) return;
                stopAudio();
                d.memos = d.memos.filter(x => x !== m);
                store.deleteImage(m.imageId);
                save();
                drawList();
              },
            }, '🗑') : h('span')));
      }
      return row;
    }

    async function startRec() {
      if (rec) return;
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast("this browser can't record", 'bad'); return; }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast('no mic access', 'bad'); return; }
      if (!view.isConnected) { stream.getTracks().forEach(t => t.stop()); return; }
      stopAudio();
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      let actx = null, analyser = null;
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = actx.createAnalyser();
        analyser.fftSize = 512;
        actx.createMediaStreamSource(stream).connect(analyser);
      } catch { /* no waveform, still records */ }
      rec = { mr, stream, chunks, start: Date.now(), actx, analyser, levels: [] };
      mr.start(250);
      drawRec();
    }
    async function stopRec(keep = true) {
      if (!rec) return;
      const r = rec;
      rec = null;
      cancelAnimationFrame(r.raf);
      clearInterval(r.timer);
      const done = new Promise(res => { r.mr.onstop = res; });
      if (r.mr.state !== 'inactive') r.mr.stop();
      await done;
      r.stream.getTracks().forEach(t => t.stop());
      r.actx?.close().catch(() => {});
      const dur = (Date.now() - r.start) / 1000;
      if (keep && r.chunks.length && dur > .3 && mine) {
        const blob = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' });
        const n = d.memos.filter(m => /^new recording/.test(m.name)).length;
        const memo = { id: 'vm_' + uid(), name: n ? `new recording ${n + 1}` : 'new recording', imageId: await store.putImage(blob), dur, at: Date.now() };
        d.memos.push(memo);
        open = memo.id;
        save();
      }
      if (view.isConnected) { drawRec(); drawList(); }
    }
    function drawRec() {
      recPanel.classList.toggle('on', !!rec);
      if (!rec) {
        fill(recPanel, mine ? h('button', { type: 'button', class: 'pw-rec-btn', title: 'record', onclick: startRec }, h('i')) : null);
        return;
      }
      const cv = h('canvas', { class: 'pw-wave', width: 600, height: 140 });
      const t = h('b', { class: 'pw-rec-time' }, '0:00.0');
      fill(recPanel,
        h('b', { class: 'pw-rec-title' }, 'new recording'),
        t, cv,
        h('button', { type: 'button', class: 'pw-rec-btn stop', title: 'stop', onclick: () => stopRec(true) }, h('i')));
      const g = cv.getContext('2d');
      const buf = rec.analyser ? new Uint8Array(rec.analyser.fftSize) : null;
      const r = rec;
      const frame = () => {
        if (rec !== r) return;
        const el = (Date.now() - r.start) / 1000;
        t.textContent = `${Math.floor(el / 60)}:${String(Math.floor(el % 60)).padStart(2, '0')}.${Math.floor(el * 10) % 10}`;
        let lvl = .04;
        if (buf) { r.analyser.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += ((v - 128) / 128) ** 2; lvl = Math.min(1, Math.sqrt(sum / buf.length) * 4 + .03); }
        r.levels.push(lvl);
        if (r.levels.length > 120) r.levels.shift();
        g.clearRect(0, 0, cv.width, cv.height);
        const w = cv.width / 120;
        g.fillStyle = '#ff3b30';
        r.levels.forEach((v, i) => { const bh = Math.max(4, v * cv.height * .9); g.beginPath(); g.roundRect(i * w + 1, (cv.height - bh) / 2, w - 2, bh, 2); g.fill(); });
        g.fillStyle = '#ff3b30';
        g.fillRect(cv.width - 3, 0, 3, cv.height);
        r.raf = requestAnimationFrame(frame);
      };
      frame();
    }
    api.onLeave(() => { stopAudio(); if (rec) stopRec(true); });
    drawList();
    drawRec();
    return h('div', { class: 'ph-app-screen pw-memos' },
      header('voice memos', { big: true, back: { label: 'home', go: home } }),
      list, recPanel);
  };

  // ================= games =================
  SCREENS.games = () => h('div', { class: 'ph-app-screen pw-games' },
    header('games', { big: true, back: { label: 'home', go: home } }),
    h('div', { class: 'ph-scroll' },
      h('div', { class: 'pw-game-cards' },
        h('button', { type: 'button', class: 'pw-game-card snake', 'data-game': 'snake', onclick: () => show('snake') },
          h('div', { class: 'pw-gc-art' }, h('div', { class: 'pw-gc-snake' }, [0, 1, 2, 3, 4].map(() => h('i'))), sticker('1f353', 'pw-gc-food')),
          h('b', {}, 'snake'), h('span', {}, `best ${d.arcade.snake}`)),
        h('button', { type: 'button', class: 'pw-game-card bat', 'data-game': 'bat', onclick: () => show('batflap') },
          h('div', { class: 'pw-gc-art' }, sticker('1f987', 'pw-gc-bat'), h('i', { class: 'pw-gc-stone a' }), h('i', { class: 'pw-gc-stone b' })),
          h('b', {}, 'bat flap'), h('span', {}, `best ${d.arcade.bat}`)))));

  const gameHeader = (title, scoreEl) => header(title, { back: { label: 'games', go: () => show('games', {}, 'pop') }, right: scoreEl });
  const bestSave = (key, score) => { if (score > d.arcade[key]) { d.arcade[key] = score; if (mine) save(); return true; } return false; };
  const ocColor = char.color || '#ff4fa3';
  const loadImg = src => { const i = new Image(); i.src = src; return i; };

  SCREENS.snake = (params, view) => {
    const G = 15;
    const cv = h('canvas', { class: 'pw-game-cv', width: 450, height: 450 });
    const g = cv.getContext('2d');
    const scoreEl = h('b', { class: 'pw-score' }, '0');
    const over = h('div', { class: 'pw-over' });
    const food = loadImg('stickers/1f353.webp');
    let snake, dir, nextDir, apple, score, timer = null, dead, started;
    const reset = () => {
      snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      dir = nextDir = { x: 1, y: 0 };
      score = 0; dead = false; started = false;
      scoreEl.textContent = '0';
      placeApple();
      clearTimeout(timer);
      over.classList.remove('on');
      fill(over, h('b', {}, 'snake'), h('button', { type: 'button', class: 'ph-pill', onclick: go }, 'play'));
      over.classList.add('on');
      paint();
    };
    const placeApple = () => { do apple = { x: Math.floor(Math.random() * G), y: Math.floor(Math.random() * G) }; while (snake.some(p => p.x === apple.x && p.y === apple.y)); };
    const go = () => { if (dead) reset(); over.classList.remove('on'); started = true; clearTimeout(timer); loop(); };
    const turn = (x, y) => { if (!started || dead) { if (!started && !dead) go(); } if (x === -dir.x && y === -dir.y) return; nextDir = { x, y }; };
    function loop() {
      if (!view.isConnected) return;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= G || head.y >= G || snake.some(p => p.x === head.x && p.y === head.y)) {
        dead = true;
        const best = bestSave('snake', score);
        fill(over, h('b', {}, 'game over'), h('span', { class: 'pw-over-score' }, String(score)), h('span', {}, best && score ? 'new best' : `best ${d.arcade.snake}`), h('button', { type: 'button', class: 'ph-pill', onclick: go }, 'again'));
        over.classList.add('on');
        paint();
        return;
      }
      snake.unshift(head);
      if (head.x === apple.x && head.y === apple.y) { score++; scoreEl.textContent = score; placeApple(); } else snake.pop();
      paint();
      timer = setTimeout(loop, Math.max(70, 160 - score * 4));
    }
    function paint() {
      const c = cv.width / G;
      g.fillStyle = '#17121c'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = 'rgba(255,255,255,.035)';
      for (let x = 0; x < G; x++) for (let y = 0; y < G; y++) if ((x + y) % 2) g.fillRect(x * c, y * c, c, c);
      if (food.complete && food.naturalWidth) g.drawImage(food, apple.x * c + 2, apple.y * c + 2, c - 4, c - 4);
      else { g.fillStyle = '#ff3b6b'; g.beginPath(); g.arc(apple.x * c + c / 2, apple.y * c + c / 2, c / 2.6, 0, 7); g.fill(); }
      snake.forEach((p, i) => {
        g.fillStyle = ocColor;
        g.beginPath(); g.roundRect(p.x * c + 1.5, p.y * c + 1.5, c - 3, c - 3, i === 0 ? 9 : 6); g.fill();
        if (i) { g.fillStyle = `rgba(0,0,0,${Math.min(.5, i * .035)})`; g.fill(); }
      });
      const hd = snake[0];
      g.fillStyle = '#fff';
      for (const s2 of [-1, 1]) { g.beginPath(); g.arc(hd.x * c + c / 2 + dir.x * 5 + dir.y * s2 * 6, hd.y * c + c / 2 + dir.y * 5 + dir.x * s2 * 6, 4, 0, 7); g.fill(); }
      g.fillStyle = '#111';
      for (const s2 of [-1, 1]) { g.beginPath(); g.arc(hd.x * c + c / 2 + dir.x * 7 + dir.y * s2 * 6, hd.y * c + c / 2 + dir.y * 7 + dir.x * s2 * 6, 2, 0, 7); g.fill(); }
    }
    food.onload = () => paint();
    const keys = e => {
      const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[e.key];
      if (!m || e.target.closest?.('input, textarea')) return;
      e.preventDefault();
      turn(...m);
    };
    document.addEventListener('keydown', keys);
    let sw = null;
    cv.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', e => {
      if (!sw) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      sw = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
    });
    api.onLeave(() => { clearTimeout(timer); document.removeEventListener('keydown', keys); });
    reset();
    const pad = (cls, x, y, label) => h('button', { type: 'button', class: 'pw-pad ' + cls, title: cls, onpointerdown: e => { e.preventDefault(); turn(x, y); } }, label);
    return h('div', { class: 'ph-app-screen pw-game' },
      gameHeader('snake', scoreEl),
      h('div', { class: 'pw-game-wrap' }, h('div', { class: 'pw-board' }, cv, over),
        h('div', { class: 'pw-dpad' }, pad('up', 0, -1, '▲'), pad('left', -1, 0, '◀'), pad('right', 1, 0, '▶'), pad('down', 0, 1, '▼'))));
  };

  SCREENS.batflap = (params, view) => {
    const W = 360, H = 560;
    const cv = h('canvas', { class: 'pw-game-cv tall', width: W, height: H });
    const g = cv.getContext('2d');
    const scoreEl = h('b', { class: 'pw-score' }, '0');
    const over = h('div', { class: 'pw-over' });
    const bat = loadImg('stickers/1f987.webp');
    const moon = loadImg('stickers/1f319.webp');
    let y, vy, stones, score, state, raf = null, last = 0, t = 0, diedAt = 0;
    const GAP = 165, SW = 62;
    const reset = () => {
      y = H / 2; vy = 0; stones = []; score = 0; state = 'ready'; t = 0;
      scoreEl.textContent = '0';
      fill(over, h('b', {}, 'bat flap'), h('button', { type: 'button', class: 'ph-pill', onclick: e => { e.stopPropagation(); flap(); } }, 'play'));
      over.classList.add('on');
      paint();
    };
    const flap = () => {
      if (state === 'dead') { if (performance.now() - diedAt > 700) { reset(); flap(); } return; }
      if (state === 'ready') { state = 'play'; over.classList.remove('on'); last = performance.now(); raf = requestAnimationFrame(step); }
      vy = -330;
    };
    function step(now) {
      if (!view.isConnected || state !== 'play') return;
      const dt = Math.min(.033, (now - last) / 1000);
      last = now;
      t += dt;
      vy += 980 * dt;
      y += vy * dt;
      if (y < 18) { y = 18; vy = Math.max(vy, 0); }
      if (!stones.length || stones.at(-1).x < W - 205) stones.push({ x: W + 10, gap: 90 + Math.random() * (H - 180 - GAP), done: false });
      for (const st of stones) {
        st.x -= 150 * dt;
        if (!st.done && st.x + SW < 70) { st.done = true; score++; scoreEl.textContent = score; }
      }
      stones = stones.filter(st => st.x > -SW - 10);
      const bx = 70, r = 17;
      const hit = y + r > H - 40 || stones.some(st => bx + r > st.x + 4 && bx - r < st.x + SW - 4 && (y - r < st.gap || y + r > st.gap + GAP));
      paint();
      if (hit) {
        state = 'dead';
        diedAt = performance.now();
        const best = bestSave('bat', score);
        fill(over, h('b', {}, 'game over'), h('span', { class: 'pw-over-score' }, String(score)), h('span', {}, best && score ? 'new best' : `best ${d.arcade.bat}`), h('button', { type: 'button', class: 'ph-pill', onclick: e => { e.stopPropagation(); reset(); flap(); } }, 'again'));
        setTimeout(() => over.classList.add('on'), 250);
        return;
      }
      raf = requestAnimationFrame(step);
    }
    function paint() {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1b0f2e'); sky.addColorStop(.7, '#4a1f4f'); sky.addColorStop(1, '#8a3b62');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 30; i++) { const sx = (i * 97 - t * 8) % W, sy = (i * 53) % (H * .6); g.fillRect((sx + W) % W, sy, 2, 2); }
      if (moon.complete && moon.naturalWidth) g.drawImage(moon, W - 110, 40, 70, 70);
      // gothic pillars
      for (const st of stones) {
        g.fillStyle = '#2a2233';
        g.strokeStyle = '#120c18'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(st.x, -10, SW, st.gap + 10, [0, 0, 10, 10]); g.fill(); g.stroke();
        g.beginPath(); g.roundRect(st.x, st.gap + GAP, SW, H, [SW / 2, SW / 2, 0, 0]); g.fill(); g.stroke();
        g.fillStyle = '#3c3249';
        g.fillRect(st.x - 5, st.gap - 16, SW + 10, 16);
        g.fillStyle = '#5b4d6b';
        g.fillRect(st.x + SW / 2 - 3, st.gap + GAP + 16, 6, 26);
        g.fillRect(st.x + SW / 2 - 12, st.gap + GAP + 24, 24, 6);
      }
      g.fillStyle = '#120c18'; g.fillRect(0, H - 40, W, 40);
      g.fillStyle = '#2b1b33';
      for (let x = (-t * 150) % 30; x < W; x += 30) g.fillRect(x, H - 40, 15, 6);
      g.save();
      g.translate(70, y);
      g.rotate(Math.max(-.5, Math.min(.9, vy / 600)));
      if (bat.complete && bat.naturalWidth) g.drawImage(bat, -24, -24, 48, 48);
      else { g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill(); }
      g.restore();
    }
    bat.onload = () => { if (state !== 'play') paint(); };
    moon.onload = () => { if (state !== 'play') paint(); };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });
    over.addEventListener('pointerdown', e => { if (!e.target.closest('button')) { e.preventDefault(); flap(); } });
    const keys = e => { if ((e.key === ' ' || e.key === 'ArrowUp') && !e.target.closest?.('input, textarea')) { e.preventDefault(); flap(); } };
    document.addEventListener('keydown', keys);
    api.onLeave(() => { cancelAnimationFrame(raf); state = 'dead'; document.removeEventListener('keydown', keys); });
    reset();
    return h('div', { class: 'ph-app-screen pw-game' },
      gameHeader('bat flap', scoreEl),
      h('div', { class: 'pw-game-wrap' }, h('div', { class: 'pw-board tall' }, cv, over)));
  };
}

// a find my widget for the second home page: a little map + where someone is
export function widget(api) {
  const fm = api.d.findmy;
  const p = fm?.people?.slice().sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const el = h('button', { type: 'button', class: 'ph-widget pw-w-map', onclick: e => api.openApp('maps', e.currentTarget) },
    h('div', { class: 'pw-w-map-bg' }, h('i', { class: 'r1' }), h('i', { class: 'r2' }), h('i', { class: 'r3' }), h('i', { class: 'pk' })),
    h('div', { class: 'pw-w-pin', style: { '--c': p ? who(p.who).color : (api.char.color || '#ff4fa3') } }, p ? face(p.who, 'pw-pin-face') : portrait(api.char, 'pw-pin-face')),
    h('div', { class: 'pw-w-map-cap' }, h('b', {}, p ? who(p.who).name : 'me'), h('span', {}, (p ? p.place : fm?.me?.place) || 'home')));
  return el;
}
