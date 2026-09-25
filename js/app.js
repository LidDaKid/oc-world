// boot + routing. every page is a hash route so it works on any static host:
//   #/                                  home: all your ocs + all your worlds
//   #/oc/<oc>[/<tab>]                   an oc's page (about, relationships, gallery, style)
//   #/w/<world>/ocs[/<oc>[/<tab>]]      who's in a world (same oc page, but you stay inside the world)
//   #/w/<world>/web[/<board>]           connections boards
//   #/w/<world>/maps[/<map>]            maps
//   #/w/<world>/lore[/<entry>]          lore pages
//   #/join/<code>                       an invite link to someone's collab world

import { store } from './store.js';
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
  const draft = { name: world.name, blurb: world.blurb, emoji: world.emoji, color: world.color, iconId: world.icon.imageId };
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
          const { iconId, ...rest } = draft;
          Object.assign(world, rest, { name: draft.name.trim() || world.name, icon: { imageId: iconId } });
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

// ---- routing ----

const mount = result => { view = typeof result === 'function' ? { cleanup: result } : result || {}; };

async function route() {
  const token = ++routeToken;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  try { view.cleanup?.(); } catch (err) { console.error(err); }
  view = {};
  await store.flush();
  if (token !== routeToken) return;
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
      ? profile.render(body, { char, tab: parts[4], base: `w/${world.id}/ocs/${char.id}`, world, go })
      : tab.view.render(body, ctx));
    return;
  }

  const onHome = parts[0] !== 'oc' || !store.char(parts[1]);
  if (onHome) right.prepend(h('button', { class: 'icon-btn', title: 'customize', onclick: home.openCustomize }, '✏️'));
  clear(app).append(h('header', { class: 'topbar' }, logo(), right), body);

  // ---- an oc on their own ----
  if (parts[0] === 'oc') {
    const char = store.char(parts[1]);
    if (char) {
      document.title = `${char.name || 'unnamed oc'} · ${siteName()}`;
      mount(profile.render(body, { char, tab: parts[2], base: `oc/${char.id}`, world: null, go }));
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

store.init().then(() => {
  collab.start();
  window.addEventListener('hashchange', route);
  route();
}).catch(err => {
  console.error(err);
  app.querySelector('.boot').textContent = err.message === 'blocked'
    ? 'oc world is open in another tab that needs to close first. close the other tab, then refresh this one.'
    : "something went wrong opening your saves. try refreshing. (nothing was deleted)";
});
