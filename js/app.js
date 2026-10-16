// boot + routing. every page is a hash route so it works on any static host:
//   #/                                  home: all your ocs + all your worlds
//   #/oc/<oc>[/<tab>]                   an oc's page (about, relationships, gallery, style)
//   #/w/<world>/ocs[/<oc>[/<tab>]]      who's in a world (same oc page, but you stay inside the world)
//   #/w/<world>/web[/<board>]           connections boards
//   #/w/<world>/maps[/<map>]            maps
//   #/w/<world>/lore[/<entry>]          lore pages
//   #/join/<code>                       an invite link to someone's collab world
//   #/diary/<id>[/cover|/write[/<page>]] a diary: the 3d book, its cover designer, the pages
//   #/view/<token>[/<tab>]              a one-time share link: someone's oc, read-only, kept in memory (share.js)

import { store } from './store.js';
import { music } from './music.js';
import { collab } from './collab.js';
import { openCollabModal, openJoinModal } from './collab-ui.js';
import { h, clear, fill, toast, openModal, hasOpenModal, onModalsClosed, swatches, field } from './ui.js';
import { iconPicker, worldIcon, picOr, themeButton, downloadBackup } from './parts.js';
import * as home from './views/home.js';
import * as ocs from './views/ocs.js';
import * as profile from './views/profile.js';
import * as web from './views/graph.js';
import * as maps from './views/maps.js';
import * as lore from './views/lore.js';
import { renderBook, renderWrite } from './views/diary.js';
import { renderCover } from './views/diary-cover.js';
import { openLink } from './share.js';

const TABS = [
  { id: 'ocs', label: 'ocs', icon: '⭐', view: ocs },
  { id: 'web', label: 'connections', icon: '🧶', view: web },
  { id: 'maps', label: 'maps', icon: '🗺️', view: maps },
  { id: 'lore', label: 'lore', icon: '📖', view: lore },
];

const app = document.getElementById('app');
let view = {}; // what the page on screen gave back: { cleanup, refresh }
let shownWorld = null;
let routeToken = 0;

function go(path) {
  location.hash = '#/' + path;
}

const saveBadge = h('div', { class: 'save-badge' });
store.onStatus(status => {
  saveBadge.dataset.status = status;
  saveBadge.textContent = status === 'saving' ? 'saving…' : status === 'error' ? "couldn't save!" : 'saved ✓';
});

// the site name + icon can be changed from the home page's customize drawer
const siteName = () => store.home.siteName.trim() || 'oc world';
const logo = () => h('a', { class: 'logo-link', href: '#/', title: 'home' },
  h('span', { class: 'logo-planet' }, picOr(store.home.logoPic.imageId, store.home.siteEmoji || '🪐')),
  h('span', { class: 'logo-word' }, siteName()));

// ---- collab bits in a world's top bar: the 👥 button + the view-only strip ----

const collabButton = h('button', { class: 'collab-btn', title: 'collab', onclick: () => shownWorld && openCollabModal(shownWorld, go) });
const viewOnly = h('div', { class: 'view-only', hidden: true });

function drawCollabBits() {
  const world = shownWorld;
  if (!world) return;
  const session = collab.session(world.id);
  const others = Math.max(0, (session?.people.length || 0) - 1);
  collabButton.className = 'collab-btn' + (world.collab ? ' shared' : '') + (session?.status === 'online' ? ' live' : '');
  fill(collabButton, '👥', world.collab ? h('span', { class: 'collab-count' }, others || '') : null);
  const stuck = world.collab?.role === 'guest' && session?.status !== 'online';
  viewOnly.hidden = !stuck;
  viewOnly.textContent = stuck ? `view only · ${session?.status === 'connecting' ? 'connecting…' : `${world.collab.hostName || 'the host'} is offline`}` : '';
}
collab.onStatus(drawCollabBits);

function worldSettings(world) {
  const draft = { name: world.name, blurb: world.blurb, emoji: world.emoji, color: world.color, iconId: world.icon.imageId, sticker: world.icon.sticker || null };
  const icon = iconPicker(draft, world.icon.imageId);
  let saved = false;
  openModal({
    title: 'world settings',
    body: [
      field('name', h('input', { type: 'text', value: draft.name, maxLength: 60, 'data-autofocus': true, oninput: e => draft.name = e.target.value })),
      field('about', h('textarea', { rows: 3, value: draft.blurb, oninput: e => draft.blurb = e.target.value })),
      field('icon', icon.el),
      field('color', swatches(draft.color, c => draft.color = c)),
      h('div', { class: 'modal-extra' },
        h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => downloadBackup(await store.exportWorld(world.id), world.name) }, '⬇ back up just this world')),
    ],
    actions: [
      { label: 'cancel', onClick: close => close() },
      {
        label: 'save', kind: 'primary', onClick: close => {
          const { iconId, sticker, ...rest } = draft;
          Object.assign(world, rest, { name: draft.name.trim() || world.name, icon: { imageId: iconId, sticker } });
          saved = true;
          store.save('world', world);
          close();
          route();
        },
      },
    ],
    onClose: () => icon.done(saved),
  });
}

// ---- a one-time share link ----
// opening one never loads this browser's own saves. it's a page of its own: leaving it reloads the site.

const viewToken = () => { const m = location.hash.match(/^#\/view\/([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
const bootedView = !!viewToken();
let viewing = null; // { token, char } once it's here, or { token, state } if it isn't coming

async function routeView(parts) {
  const token = parts[1];
  const body = h('main', { class: 'world-body' });
  clear(app).append(h('header', { class: 'topbar' }, h('span', { class: 'logo-link' }, h('span', { class: 'logo-planet' }, '🪐'), h('span', { class: 'logo-word' }, 'oc world')),
    h('div', { class: 'topbar-right' }, themeButton())), body);
  if (!viewing) {
    const bar = h('i');
    fill(body, h('div', { class: 'share-screen' }, h('div', { class: 'share-progress big' }, bar)));
    viewing = { token, state: 'loading' };
    const got = await openLink(token, p => { bar.style.width = Math.round(p * 100) + '%'; });
    if (got.char) {
      store.enterView({ chars: [got.char, ...got.others], rels: got.rels, urls: got.urls });
      viewing = { token, char: store.char(got.char.id) };
    } else viewing = { token, state: got.state };
    if (viewToken() !== token) return;
  }
  if (viewing.state === 'loading') return;
  if (!viewing.char) {
    const words = { opened: 'this link was already opened', expired: 'this link expired', gone: "this link doesn't work anymore", error: "couldn't open this link" };
    document.title = 'oc world';
    fill(body, h('div', { class: 'share-screen' }, h('div', { class: 'share-dead' }, h('div', { class: 'share-dead-icon' }, '🔒'), h('h2', {}, words[viewing.state] || words.gone))));
    return;
  }
  const char = viewing.char;
  document.title = `${char.name || 'unnamed oc'} · oc world`;
  body.classList.add('share-view');
  fill(body);
  mount(profile.render(body, { char, tab: parts[2], sub: parts[3], base: `view/${token}`, world: null, go, view: true }));
}

// ---- routing ----

const mount = result => { view = typeof result === 'function' ? { cleanup: result } : result || {}; };

async function route() {
  const token = ++routeToken;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  try { view.cleanup?.(); } catch (err) { console.error(err); }
  view = {};
  // a share link is its own little site. going anywhere else (or to another link) starts fresh
  if (bootedView || parts[0] === 'view') {
    if (!bootedView || parts[0] !== 'view' || (viewing && parts[1] !== viewing.token)) { await store.flush(); location.reload(); return; }
    music.keepOnly(viewing?.char?.id || null);
    await routeView(parts);
    return;
  }
  await store.flush();
  if (token !== routeToken) return;
  // an oc's music keeps going between their own tabs, and stops anywhere else
  music.keepOnly(parts[0] === 'oc' ? parts[1] : parts[0] === 'w' && parts[2] === 'ocs' ? parts[3] : null);
  const right = h('div', { class: 'topbar-right' }, saveBadge, themeButton());
  const body = h('main', { class: 'world-body' });
  shownWorld = null;

  // ---- inside a world ----
  if (parts[0] === 'w') {
    const world = store.world(parts[1]);
    if (!world) {
      toast("couldn't find that world");
      go('');
      return;
    }
    shownWorld = world;
    const tab = TABS.find(t => t.id === parts[2]) || TABS[0];
    drawCollabBits();
    clear(app).append(
      h('header', { class: 'topbar', style: { '--c': world.color } },
        logo(),
        h('button', { class: 'world-name', title: 'world settings', onclick: () => worldSettings(world) },
          h('span', { class: 'world-emoji' }, worldIcon(world)), h('span', { class: 'world-title' }, world.name), h('span', { class: 'world-gear' }, '⚙')),
        h('nav', { class: 'tabs' }, TABS.map(t =>
          h('a', { class: 'tab' + (t === tab ? ' on' : ''), href: `#/w/${world.id}/${t.id}` },
            h('span', { class: 'tab-icon' }, t.icon), h('span', { class: 'tab-label' }, t.label)))),
        h('div', { class: 'topbar-right' }, saveBadge, collabButton, themeButton())),
      viewOnly,
      body);
    document.title = `${world.name} · ${siteName()}`;
    const char = tab.id === 'ocs' && parts[3] ? store.char(parts[3]) : null;
    const ctx = { world, sub: parts[3], go, save: () => store.save('world', world) };
    mount(char
      ? profile.render(body, { char, tab: parts[4], sub: parts[5], base: `w/${world.id}/ocs/${char.id}`, world, go })
      : tab.view.render(body, ctx));
    return;
  }

  // ---- a diary ----
  if (parts[0] === 'diary') {
    const diary = store.diary(parts[1]);
    if (diary) {
      body.classList.add('diary-body');
      clear(app).append(h('header', { class: 'topbar' }, logo(), right), body);
      document.title = `${diary.cover.title.text || 'diary'} · ${siteName()}`;
      const ctx = { diary, go };
      if (parts[2] === 'cover') mount(renderCover(body, ctx));
      else if (parts[2] === 'write') mount(renderWrite(body, { ...ctx, startAt: (parseInt(parts[3], 10) || 1) - 1 }));
      else mount(renderBook(body, ctx));
      return;
    }
    toast("couldn't find that diary");
  }

  const onHome = parts[0] !== 'oc' || !store.char(parts[1]);
  if (onHome) right.prepend(h('button', { class: 'icon-btn', title: 'customize', onclick: home.openCustomize }, '✏️'));
  clear(app).append(h('header', { class: 'topbar' }, logo(), right), body);

  // ---- an oc on their own ----
  if (parts[0] === 'oc') {
    const char = store.char(parts[1]);
    if (char) {
      document.title = `${char.name || 'unnamed oc'} · ${siteName()}`;
      mount(profile.render(body, { char, tab: parts[2], sub: parts[3], base: `oc/${char.id}`, world: null, go }));
      return;
    }
    toast("couldn't find that oc");
  }

  document.title = siteName();
  mount(home.render(body, { go }));
  if (parts[0] === 'join' && parts[1]) {
    history.replaceState(null, '', '#/'); // so a refresh doesn't pop the box open again
    openJoinModal(go, collab.cleanCode(parts[1]));
  }
}

// ---- when a collab world changes underneath the page ----
// redraw, but never yank the page out from under someone who's mid-typing or has a box open. that waits.

let stale = null; // null, or { hard }
let refreshTimer = null;
const typing = () => app.contains(document.activeElement) && document.activeElement.matches('input, textarea, select');

function refreshSoon(info) {
  stale = { hard: !!(stale?.hard || info?.hard) };
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (!stale || hasOpenModal() || typing()) return;
    const { hard } = stale;
    stale = null;
    drawCollabBits();
    if (!hard && view.refresh) {
      view.refresh();
      return;
    }
    const scroller = app.querySelector('.world-body');
    const top = scroller?.scrollTop || 0;
    document.body.classList.add('no-anim');
    route().then(() => {
      const next = app.querySelector('.world-body');
      if (next) next.scrollTop = top;
      requestAnimationFrame(() => document.body.classList.remove('no-anim'));
    });
  }, 80);
}
store.onRemote(refreshSoon);
onModalsClosed(() => stale && refreshSoon());
document.addEventListener('focusout', () => stale && refreshSoon());

if (viewToken()) {
  window.addEventListener('hashchange', route);
  route();
} else store.init().then(() => {
  collab.start();
  window.addEventListener('hashchange', route);
  route();
}).catch(err => {
  console.error(err);
  app.querySelector('.boot').textContent = err.message === 'blocked'
    ? 'oc world is open in another tab that needs to close first. close the other tab, then refresh this one.'
    : "something went wrong opening your saves. try refreshing. (nothing was deleted)";
});
