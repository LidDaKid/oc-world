// phone app: the app store. download apps onto the home screen (d.installed; a new phone only has the stock ones),
// search them, and make your own apps
// (d.custom: a name, a sticker icon, a color, and a page with a title, a picture and writing).

import { h, fill, uid, openModal, confirmDialog, toast, autosize } from '../ui.js';
import { pic, sticker } from './kit.js';
import { addPhotos, dropImage } from './phone-bits.js';

export const APPS = {
  store: { label: 'app store', icon: '1f6cd-fe0f', bg: 'linear-gradient(160deg,#4fc3ff,#1a6dff)' },
};
export const DEF = { hidden: [], custom: [] };

// which shelf each built in app sits on. apps can also say their own with a `cat` on their APPS entry
const CAT_OF = {
  messages: 'social', phone: 'social', insta: 'social', socials: 'social', contacts: 'social',
  music: 'music + video', camera: 'fun', photos: 'fun', diaries: 'fun', games: 'games',
  calendar: 'life', reminders: 'life', weather: 'life', clock: 'life', notes: 'life', wallet: 'life',
  browser: 'tools', maps: 'tools', memos: 'tools', calculator: 'tools', screentime: 'tools', settings: 'tools', store: 'tools',
};
const CAT_ORDER = ['social', 'music + video', 'games', 'fun', 'shopping + food', 'life', 'tools'];
const catOf = (id, a) => a.cat || CAT_OF[id] || 'other';
const ICONS = ['1f5a4', '1f496', '1f49c', '1f987', '1f480', '1f380', '2b50', '1f319', '1f98b', '1f353', '1f431', '1f430', '1f9f8', '1f484', '1f3b8', '1f3a4',
  '1f3b5', '1f3a7', '1f4bf', '1f52e', '1f344', '1f47b', '1f339', '1f940', '1f451', '1f48e', '1f308', '1f525', '26a1', '1f36d', '1f9c1', '1f369',
  '1f355', '1f37f', '1f3ae', '1f4da', '1f4f8', '1f3a8', '1f30d', '1f6f8', '1f47d', '1f383', '1f577-fe0f', '1f9db', '1f9da', '1f9dc', '1f48c', '1f5e1-fe0f', '1fa78', '1f9e0'];
const COLORS = [
  'linear-gradient(160deg,#ff8ac4,#ff2e88)', 'linear-gradient(160deg,#2b2b30,#0b0b0d)', 'linear-gradient(160deg,#c58bff,#6a2bd9)',
  'linear-gradient(160deg,#ff6b8b,#b3123b)', 'linear-gradient(160deg,#fff,#e9e3ee)', 'linear-gradient(160deg,#7df9d0,#1fb58a)',
  'linear-gradient(160deg,#6ec6ff,#1a6dff)', 'linear-gradient(160deg,#ffe46b,#ffaa00)', 'linear-gradient(160deg,#ffb3d6,#b18cff)',
  'linear-gradient(160deg,#5a1a2e,#1a0710)', 'linear-gradient(160deg,#9be564,#2fae5a)', 'linear-gradient(160deg,#c0c0c8,#6e6e78)',
];

const appIco = (a, cls = '') => h('span', { class: 'pst-ico ' + cls, style: { background: a.bg } }, sticker(a.icon));

export function install(api) {
  const { d, mine, save, show, header, SCREENS, APPS: ALL, appOf, FIXED } = api;
  const home = { label: 'home', go: () => api.goHome() };
  const isOn = id => api.installed(id);
  let tab = 'today', query = '';

  // "get" downloads it (a ring fills up), then it's "open"
  function getBtn(id, after) {
    if (isOn(id)) return h('button', { type: 'button', class: 'pst-get on', 'data-get': id, onclick: e => { e.stopPropagation(); open(id, e.currentTarget); } }, 'open');
    if (!mine) return null;
    const b = h('button', {
      type: 'button', class: 'pst-get', 'data-get': id,
      onclick: e => {
        e.stopPropagation();
        if (b.classList.contains('loading')) return;
        b.classList.add('loading');
        b.textContent = '';
        setTimeout(() => { api.download(id); after(); }, 900);
      },
    }, 'get');
    return b;
  }
  const open = (id, el) => { if (!isOn(id)) return; const a = appOf(id); if (a.link) location.hash = `#/${api.ctx.base}/fun/${a.link}`; else if (a.custom) show('custom', { id }, 'push'); else api.openApp(id, el); };

  SCREENS.store = () => {
    const body = h('div', { class: 'ph-scroll pst-scroll' });
    const draw = () => {
      const top = body.scrollTop;
      const ids = Object.keys(ALL);
      const day = Math.floor(Date.now() / 864e5);
      const pickable = ids.filter(id => !FIXED.includes(id) && !ALL[id].link && !api.STOCK.includes(id));
      const featured = pickable[day % pickable.length];
      const fa = ALL[featured];
      const shelves = new Map();
      for (const id of ids) { const c = catOf(id, ALL[id]); if (!shelves.has(c)) shelves.set(c, []); shelves.get(c).push(id); }
      const rank = c => (CAT_ORDER.includes(c) ? CAT_ORDER.indexOf(c) : c === 'other' ? 99 : 50);
      const cats = [...shelves].sort((a, b) => rank(a[0]) - rank(b[0]));
      if (tab === 'search') {
        const q = query.trim().toLowerCase();
        const hits = [...ids, ...d.custom.map(c => c.id)].filter(id => { const a = appOf(id); return a && (!q || a.label.toLowerCase().includes(q) || catOf(id, a).includes(q)); });
        const input = h('input', { type: 'search', class: 'pst-search', placeholder: 'games, apps and more', value: query, oninput: e => { query = e.target.value; drawResults(); } });
        const results = h('div', { class: 'ph-group pst-list' });
        const drawResults = () => {
          const qq = query.trim().toLowerCase();
          fill(results, [...ids, ...d.custom.map(c => c.id)].filter(id => { const a = appOf(id); return a && (!qq || a.label.toLowerCase().includes(qq) || catOf(id, a).includes(qq)); }).map(id => row(id, catOf(id, appOf(id)), drawResults)));
        };
        drawResults();
        fill(body, h('div', { class: 'pst-search-wrap' }, input), results);
        if (hits) setTimeout(() => { if (input.isConnected && document.activeElement !== input) input.focus({ preventScroll: true }); }, 50);
        return;
      }
      fill(body,
        h('div', { class: 'pst-feature', style: { '--bg': fa.bg } },
          h('span', { class: 'pst-feature-tag' }, 'app of the day'),
          h('div', { class: 'pst-feature-art' }, sticker(fa.icon, 'pst-feature-stk'), sticker(fa.icon, 'pst-feature-stk ghost')),
          h('div', { class: 'pst-feature-foot' }, appIco(fa, 'sm'), h('b', {}, fa.label), getBtn(featured, draw))),
        mine ? h('button', { type: 'button', class: 'pst-make', onclick: () => maker(null, c => show('custom', { id: c.id }, 'push')) },
          h('span', { class: 'pst-make-ico' }, '+'), h('b', {}, 'make your own app')) : null,
        d.custom.length ? section('yours', d.custom.map(c => c.id), draw) : null,
        cats.map(([name, list]) => section(name, list, draw)));
      body.scrollTop = top;
    };
    function section(name, list, after) {
      return [
        h('div', { class: 'pst-sec' }, h('b', {}, name)),
        h('div', { class: 'ph-group pst-list' }, list.map(id => row(id, name, after))),
      ];
    }
    function row(id, name, after) {
      const a = appOf(id);
      if (!a) return null;
      return h('div', { class: 'ph-row pst-row' + (isOn(id) ? '' : ' off'), 'data-app-row': id, onclick: e => open(id, e.currentTarget.querySelector('.pst-ico')) },
        appIco(a),
        h('div', { class: 'ph-row-main' }, h('b', {}, a.label), h('div', { class: 'ph-row-sub' }, a.custom ? 'made by you' : name)),
        getBtn(id, after));
    }
    const tabs = h('nav', { class: 'pst-tabs' });
    const drawTabs = () => fill(tabs, [['today', 'today'], ['search', 'search']].map(([t, l]) => h('button', { type: 'button', class: t === tab ? 'on' : '', 'data-tab': t, onclick: () => { tab = t; api.redraw(); } }, l)));
    drawTabs();
    draw();
    return h('div', { class: 'ph-app-screen pst' }, header(tab === 'search' ? 'search' : 'app store', { big: true, back: home }), body, tabs);
  };

  // your own app's page
  SCREENS.custom = ({ id }) => {
    const c = d.custom.find(x => x.id === id);
    if (!c) return SCREENS.store();
    const photo = h('div', { class: 'pst-c-photo' });
    const drawPhoto = () => fill(photo,
      c.imageId ? pic(c.imageId, 'pst-c-img') : null,
      mine ? h('button', {
        type: 'button', class: 'ph-pill sm' + (c.imageId ? ' ghost pst-c-change' : ''), onclick: async () => {
          const [p] = await addPhotos(false, 1400);
          if (!p) return;
          dropImage(c.imageId);
          c.imageId = p.imageId;
          save();
          drawPhoto();
        },
      }, c.imageId ? 'change' : 'add picture') : null);
    drawPhoto();
    const title = h('input', { type: 'text', class: 'pst-c-title', value: c.title || '', placeholder: mine ? 'title' : '', maxLength: 80, readOnly: !mine, oninput: e => { c.title = e.target.value; save(); } });
    const text = autosize(h('textarea', { class: 'pst-c-text', value: c.text || '', placeholder: mine ? 'write anything' : '', readOnly: !mine, oninput: e => { c.text = e.target.value; save(); } }));
    return h('div', { class: 'ph-app-screen pst-c', style: { '--app': c.bg } },
      header(c.label || 'app', {
        back: home,
        right: mine ? h('button', { type: 'button', class: 'pst-edit', onclick: () => maker(c, () => api.redraw()) }, 'edit') : null,
      }),
      h('div', { class: 'ph-scroll' },
        h('div', { class: 'pst-c-hero' }, appIco(c, 'lg')),
        title, photo, text));
  };

  // making (or changing) your own app
  function maker(existing, done) {
    const c = existing ? { ...existing } : { label: '', icon: ICONS[0], bg: COLORS[0] };
    const prev = h('div', { class: 'pst-prev' });
    const name = h('input', { type: 'text', placeholder: 'app name', maxLength: 18, value: c.label, 'data-autofocus': '', oninput: e => { c.label = e.target.value; drawPrev(); } });
    const drawPrev = () => fill(prev, h('div', { class: 'ph-app' }, appIco(c, 'big'), h('span', { class: 'pst-prev-label' }, c.label || 'app')));
    const icons = h('div', { class: 'pst-icons' });
    const drawIcons = () => fill(icons, ICONS.map(code => h('button', { type: 'button', class: 'pst-icon-pick' + (c.icon === code ? ' on' : ''), onclick: () => { c.icon = code; drawIcons(); drawPrev(); } }, sticker(code))));
    const colors = h('div', { class: 'pst-colors' });
    const drawColors = () => fill(colors, COLORS.map(bg => h('button', { type: 'button', class: 'pst-color' + (c.bg === bg ? ' on' : ''), style: { background: bg }, onclick: () => { c.bg = bg; drawColors(); drawPrev(); } })));
    drawPrev(); drawIcons(); drawColors();
    openModal({
      title: existing ? 'edit app' : 'make an app', wide: true,
      body: h('div', { class: 'pst-maker' },
        prev,
        h('div', { class: 'pst-maker-main' },
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'name'), name),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'color'), colors),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'icon'), icons))),
      actions: [
        existing ? {
          label: 'delete', kind: 'danger', onClick: async close => {
            if (!(await confirmDialog(`delete ${existing.label || 'this app'}?`, { danger: true, okLabel: 'delete' }))) return;
            close();
            d.custom = d.custom.filter(x => x !== existing);
            dropImage(existing.imageId);
            save();
            show('store', {}, 'pop');
          },
        } : null,
        {
          label: existing ? 'save' : 'make it', kind: 'primary', onClick: close => {
            if (!c.label.trim()) { name.focus(); toast('give it a name', 'bad'); return; }
            c.label = c.label.trim();
            let out = existing;
            if (existing) Object.assign(existing, { label: c.label, icon: c.icon, bg: c.bg });
            else { out = { id: 'app_' + uid(), label: c.label, icon: c.icon, bg: c.bg, title: '', text: '', imageId: null }; d.custom.push(out); }
            save();
            close();
            done(out);
          },
        },
      ].filter(Boolean),
    });
  }
}
