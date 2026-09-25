// the front page: all your worlds + every oc you've made (in a world or not).
// the whole layout is yours to change from the ✏️ customize drawer: colors, fonts, a header, which sections
// show in what order, how the cards look, the site's name + icon. it's saved on this device (store.home).

import { store, imageIdsIn } from '../store.js';
import { newChar, newWorld } from '../model.js';
import { h, fill, toast, openModal, confirmDialog, swatches, field, pickFile } from '../ui.js';
import { iconPicker, worldIcon, picOr, emojiPicker, downloadBackup, ocCard, emptyState } from '../parts.js';
import { paint, readableInk, lookCards, card, colorCard, choiceCard, pictureCard, orderList } from '../look.js';
import { collab } from '../collab.js';
import { openJoinModal } from '../collab-ui.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const SECTION_NAMES = { header: 'header', worlds: 'worlds', ocs: 'ocs' };
const LAYOUT_CLASSES = {
  width: ['wide', 'full'], headerSize: ['short', 'tall'], headerAlign: ['left'],
  ocSize: ['small', 'big'], ocLayout: ['list'], pfpShape: ['circle', 'square'], worldSize: ['small', 'big'],
};
const SITE_EMOJI = ['🪐', '🦇', '🖤', '💀', '🕸️', '🌙', '⭐', '🎸', '🍓', '🌸', '🔮', '👑', '🧛‍♀️', '🎀', '💿', '🕯️'];

// the logo in the top bar + the tab title
function drawLogo() {
  const home = store.home;
  const name = home.siteName.trim() || 'oc world';
  document.querySelectorAll('.logo-word').forEach(e => { e.textContent = name; });
  document.querySelectorAll('.logo-planet').forEach(e => fill(e, picOr(home.logoPic.imageId, home.siteEmoji || '🪐')));
  document.title = name;
}

let current = null; // the home page on screen, so the ✏️ in the top bar can open its drawer

export function openCustomize() {
  current?.openDrawer();
}

export function render(el, { go }) {
  const home = store.home;
  let query = '';
  let filter = 'all'; // 'all' | 'loose' | a world id
  let drawer = null;

  const bleed = h('div', { class: 'home-bleed' });
  const page = h('div', { class: 'home' });
  const header = h('header', { class: 'home-header' });
  const worldGrid = h('div', { class: 'card-grid worlds' });
  const ocGrid = h('div', { class: 'card-grid oc-grid' });
  const filters = h('div', { class: 'chip-row' });
  const counts = { worlds: h('span', { class: 'count' }), ocs: h('span', { class: 'count' }) };

  const sections = {
    header,
    worlds: h('section', { class: 'home-section' },
      h('div', { class: 'section-bar' }, h('h2', {}, 'worlds ', counts.worlds),
        h('div', { class: 'page-head-actions' },
          h('button', { class: 'btn ghost sm', onclick: () => openJoinModal(go) }, '👥 join a world'),
          h('button', { class: 'btn sm', onclick: addWorld }, '+ new world'))),
      worldGrid),
    ocs: h('section', { class: 'home-section' },
      h('div', { class: 'section-bar' },
        h('h2', {}, 'ocs ', counts.ocs),
        h('div', { class: 'page-head-actions' },
          h('input', { type: 'search', class: 'search', placeholder: 'search', oninput: e => { query = e.target.value; drawOcs(); } }),
          h('button', { class: 'btn primary sm', onclick: addOc }, '+ new oc'))),
      filters,
      ocGrid),
  };
  const foot = h('footer', { class: 'home-foot' },
    h('div', { class: 'home-foot-actions' },
      h('button', { class: 'btn sm', onclick: () => openDrawer() }, '✏️ customize'),
      h('button', { class: 'btn ghost sm', onclick: async () => downloadBackup(await store.exportEverything(), 'oc-world-everything') }, '⬇ back up everything'),
      h('button', { class: 'btn ghost sm', onclick: loadBackup }, '⬆ load a backup')));

  el.append(bleed);
  bleed.append(page);
  drawLayout();
  drawWorlds();
  drawOcs();
  current = { openDrawer };

  // ---- the layout ----

  function drawLayout() {
    paint(bleed, home.look);
    for (const [key, values] of Object.entries(LAYOUT_CLASSES)) {
      for (const v of values) bleed.classList.toggle(`${key}-${v}`, home[key] === v);
    }
    bleed.classList.toggle('hide-tagline', !home.showTagline);
    bleed.classList.toggle('hide-tags', !home.showTags);
    // the header only shows once it has something in it
    const hasHeader = !!(home.title.trim() || home.subtitle.trim() || home.headerPic.imageId);
    fill(page,
      home.order.filter(id => !home.hidden.includes(id) && (id !== 'header' || hasHeader)).map(id => sections[id]),
      foot);
    drawHeader();
  }

  async function drawHeader() {
    fill(header,
      home.title.trim() ? h('h1', { class: 'home-title' }, home.title) : null,
      home.subtitle.trim() ? h('p', { class: 'home-subtitle' }, home.subtitle) : null);
    header.style.cssText = '';
    if (home.headerColor) {
      header.style.setProperty('--header-color', home.headerColor);
      header.style.setProperty('--header-ink', readableInk(home.headerColor));
    }
    const picId = home.headerPic.imageId;
    const url = await store.imageURL(picId);
    header.classList.toggle('has-pic', !!url);
    if (url && home.headerPic.imageId === picId) header.style.backgroundImage = `url("${url}")`;
  }

  // ---- the customize drawer ----

  function openDrawer() {
    if (drawer) return;
    const close = () => {
      drawer?.remove();
      drawer = null;
      document.body.classList.remove('drawer-open');
    };
    drawer = h('aside', { class: 'drawer' },
      h('div', { class: 'drawer-head' }, h('h2', {}, 'customize'), h('button', { class: 'icon-btn', title: 'close', onclick: close }, '✕')),
      h('div', { class: 'drawer-body' }, controls()));
    drawer.close = close;
    document.body.append(drawer);
    document.body.classList.add('drawer-open');
  }

  function controls() {
    const changed = () => { store.saveHome(); drawLayout(); };
    const logoChanged = () => { store.saveHome(); drawLogo(); };
    const group = title => h('h3', { class: 'style-group' }, title);
    const pick = (label, key, options) => choiceCard(label, options, home[key], v => { home[key] = v; changed(); });
    const text = (key, placeholder, max, after = changed) =>
      h('input', { type: 'text', value: home[key], placeholder, maxLength: max, oninput: e => { home[key] = e.target.value; after(); } });
    const toggle = (label, key) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: home[key], onchange: e => { home[key] = e.target.checked; changed(); } }), ' ' + label);
    const order = home.order.map(id => ({ id, label: SECTION_NAMES[id] }));

    return h('div', { class: 'style-grid' },
      group('sections'),
      card('order', null, orderList(order, home.hidden, () => { home.order = order.map(o => o.id); changed(); })),

      group('header'),
      h('div', { class: 'style-card text-card' }, h('div', { class: 'style-card-head' }, h('h3', {}, 'title')),
        text('title', 'title', 80), text('subtitle', 'second line', 140)),
      colorCard('header color', () => home.headerColor, v => home.headerColor = v, changed),
      pictureCard('header picture', home.headerPic, changed, { maxDim: 2400 }),
      pick('header size', 'headerSize', ['short', 'normal', 'tall']),
      pick('header text', 'headerAlign', ['left', 'center']),

      group('colors + fonts'),
      lookCards(home.look, changed, { accent: true }),

      group('cards'),
      pick('oc cards', 'ocLayout', ['grid', 'list']),
      pick('oc card size', 'ocSize', ['small', 'normal', 'big']),
      pick('oc pictures', 'pfpShape', ['rounded', 'circle', 'square']),
      card('on the oc cards', null, toggle('tagline', 'showTagline'), toggle('tags', 'showTags')),
      pick('world card size', 'worldSize', ['small', 'normal', 'big']),
      pick('page width', 'width', ['normal', 'wide', 'full']),

      group('site'),
      h('div', { class: 'style-card text-card' }, h('div', { class: 'style-card-head' }, h('h3', {}, 'site name')),
        text('siteName', 'oc world', 40, logoChanged)),
      card('site icon', null, emojiPicker(home.siteEmoji || '🪐', e => { home.siteEmoji = e; logoChanged(); }, SITE_EMOJI)),
      pictureCard('site icon picture', home.logoPic, logoChanged, { maxDim: 256 }),

      h('div', { class: 'style-card plain' },
        h('button', { class: 'btn ghost sm', onclick: resetAll }, 'reset the whole look')));
  }

  async function resetAll() {
    if (!await confirmDialog('put the home page back to normal?', { okLabel: 'reset' })) return;
    imageIdsIn(home).forEach(id => store.deleteImage(id));
    store.resetHome();
    drawer?.close();
    render(fill(el), { go });
    drawLogo();
    current.openDrawer();
  }

  // ---- worlds + ocs ----

  function drawWorlds() {
    const worlds = store.worlds;
    counts.worlds.textContent = worlds.length || '';
    fill(worldGrid,
      worlds.map(w => h('div', { class: 'card world-card', style: { '--c': w.color } },
        h('a', { class: 'world-card-main', href: `#/w/${w.id}` },
          h('div', { class: 'world-card-emoji' }, worldIcon(w)),
          w.collab ? h('span', { class: 'shared-badge' }, '👥 ', w.collab.role === 'guest' ? w.collab.hostName || 'shared' : 'shared') : null,
          h('h3', {}, w.name),
          w.blurb ? h('p', { class: 'world-card-blurb' }, w.blurb) : null,
          h('p', { class: 'world-card-counts' },
            [plural(store.cast(w).length, 'oc'), plural(w.maps.length, 'map'), plural(w.lore.length, 'lore page')].join(' · '))),
        h('button', { class: 'card-x', title: w.collab?.role === 'guest' ? 'leave this world' : 'delete this world', onclick: () => removeWorld(w) }, '✕'))),
      h('button', { class: 'card card-new', onclick: addWorld }, h('span', { class: 'plus' }, '+'), 'new world'));
  }

  function drawOcs() {
    // other people's ocs (from collab worlds) only show when you filter by that world
    const all = store.chars.filter(store.isMine);
    counts.ocs.textContent = all.length || '';
    const worlds = store.worlds.filter(w => w.charIds.length);
    const loose = all.filter(c => !store.worldsOf(c.id).length);
    if (filter !== 'all' && filter !== 'loose' && !store.world(filter)) filter = 'all';
    const chip = (id, ...label) => h('button', { class: 'chip' + (filter === id ? ' on' : ''), onclick: () => { filter = id; drawOcs(); } }, ...label);
    fill(filters, worlds.length ? [
      chip('all', 'everyone'),
      loose.length ? chip('loose', 'not in a world') : null,
      worlds.map(w => chip(w.id, worldIcon(w), ' ', w.name)),
    ] : null);

    const q = query.trim().toLowerCase();
    const pool = filter === 'all' ? all : filter === 'loose' ? loose : store.cast(store.world(filter));
    const shown = pool.filter(c => !q || [c.name, c.tagline, ...c.tags].join(' ').toLowerCase().includes(q));
    if (!all.length) {
      fill(ocGrid, emptyState('⭐', 'no ocs yet', null,
        h('button', { class: 'btn primary', onclick: addOc }, '+ new oc')));
      return;
    }
    fill(ocGrid,
      h('button', { class: 'card card-new', onclick: addOc }, h('span', { class: 'plus' }, '+'), 'new oc'),
      shown.map(c => ocCard(c, `#/oc/${c.id}`)),
      null);
  }

  function addOc() {
    const char = store.add('char', newChar());
    const world = store.world(filter);
    if (world) {
      world.charIds.push(char.id);
      store.save('world', world);
    }
    go(`oc/${char.id}`);
  }

  function addWorld() {
    const draft = { name: '', blurb: '', emoji: '🪐', color: '#ff4fa3', iconId: null };
    const icon = iconPicker(draft, null);
    let made = false;
    openModal({
      title: 'new world',
      body: [
        field('name', h('input', { type: 'text', maxLength: 60, 'data-autofocus': true, oninput: e => draft.name = e.target.value })),
        field('about', h('textarea', { rows: 3, oninput: e => draft.blurb = e.target.value })),
        field('icon', icon.el),
        field('color', swatches(draft.color, c => draft.color = c)),
      ],
      actions: [
        { label: 'cancel', onClick: close => close() },
        {
          label: 'make it', kind: 'primary', onClick: close => {
            const { iconId, ...rest } = draft;
            const world = store.add('world', newWorld({ ...rest, name: draft.name.trim() || 'untitled world', icon: { imageId: iconId } }));
            made = true;
            close();
            go(`w/${world.id}`);
          },
        },
      ],
      onClose: () => icon.done(made),
    });
  }

  async function removeWorld(w) {
    if (w.collab?.role === 'guest') {
      if (!await confirmDialog(`leave "${w.name}"? it comes off this device. your own ocs stay.`, { okLabel: 'leave', danger: true })) return;
      await collab.leave(w);
      drawWorlds();
      drawOcs();
      return;
    }
    const n = store.cast(w).length;
    const ok = await confirmDialog(
      `delete "${w.name}" with its boards, maps and lore?` + (n ? ` the ${plural(n, 'oc')} in it won't be deleted.` : ''),
      { okLabel: 'delete world', danger: true });
    if (!ok) return;
    if (w.collab) collab.stop(w);
    await store.deleteWorld(w.id);
    toast('world deleted');
    drawWorlds();
    drawOcs();
  }

  async function loadBackup() {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const got = await store.importBackup(JSON.parse(await file.text()));
      toast(`loaded ${plural(got.worlds, 'world')} + ${plural(got.chars, 'oc')}` + (got.home ? ' + the home layout' : ''));
      if (got.home) {
        render(fill(el), { go });
        drawLogo();
        return;
      }
      drawWorlds();
      drawOcs();
    } catch (err) {
      console.error(err);
      toast("that file doesn't look like an oc world backup", 'bad');
    }
  }

  return () => {
    drawer?.close();
    if (current?.openDrawer === openDrawer) current = null;
  };
}
