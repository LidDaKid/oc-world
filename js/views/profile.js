// one oc's page: about, relationships, gallery, moodboard, page style (+ their music, see music.js).
// the same page shows at #/oc/<id> (on their own) and #/w/<world>/ocs/<id> (inside a world).

import { store, MAX_VIDEO, MAX_SONG } from '../store.js';
import { music } from '../music.js';
import { h, s, fill, uid, toast, openModal, confirmDialog, swatches, segmented, autosize, pickFile, pickFiles, shrinkImage } from '../ui.js';
import { portrait, nameOf, emptyState, worldIcon } from '../parts.js';
import { seenFrom, openRelEditor } from '../rels.js';
import { blankPage } from '../model.js';
import { paint, lookCards, card, colorCard, choiceCard, pictureCard, orderList } from '../look.js';

// the tabs you can move around / hide. page style is always last (and only for whoever made the oc).
const TAB_NAMES = { about: 'about', relationships: 'relationships', gallery: 'gallery', moodboard: 'moodboard' };
const tabOrder = page => [...new Set([...(page.tabs || []).filter(id => id in TAB_NAMES), ...Object.keys(TAB_NAMES)])];

const LAYOUT_CLASSES = {
  bannerSize: ['none', 'short', 'tall'], heroAlign: ['center'], pfpShape: ['circle', 'square'], pfpSize: ['small', 'big'], width: ['wide', 'full'],
};

export function render(el, { char, tab, base, world, go }) {
  const page = char.page;
  // in a collab world you can look at someone else's oc, but only they can change it
  const mine = store.isMine(char);
  const ro = mine ? {} : { readOnly: true };
  let shown = tabOrder(page).filter(id => !page.hiddenTabs.includes(id));
  if (!shown.length) shown = ['about'];
  const tabs = [...shown.map(id => [id, TAB_NAMES[id]]), ...(mine ? [['style', 'page style']] : [])];
  const active = tabs.some(t => t[0] === tab) ? tab : tabs[0][0];
  const save = () => store.save('char', char);
  const linkTo = other => (world && world.charIds.includes(other.id) ? `#/w/${world.id}/ocs/${other.id}` : `#/oc/${other.id}`);
  const backHref = world ? `#/w/${world.id}/ocs` : '#/';

  // the little numbers on the tabs
  const tabCounts = { relationships: h('span', { class: 'count' }), gallery: h('span', { class: 'count' }), moodboard: h('span', { class: 'count' }) };
  function drawCounts() {
    tabCounts.relationships.textContent = store.relsOf(char.id).length || '';
    tabCounts.gallery.textContent = char.gallery.length || '';
    tabCounts.moodboard.textContent = char.moodboard.length || '';
  }

  // ---- their colors, painted over the site theme for this page only ----
  const bleed = h('div', { class: 'profile-bleed' });
  const banner = h('div', { class: 'profile-banner' });
  const videoBack = h('video', { class: 'bleed-video', muted: true, loop: true, autoplay: true, playsInline: true, hidden: true });
  async function applyPageStyle() {
    await paint(bleed, { ...page, accent: null }, char.color);
    if (page.banner) bleed.style.setProperty('--banner', page.banner);
    bleed.classList.toggle('banner-fade', !!page.bannerFade);
    for (const [key, values] of Object.entries(LAYOUT_CLASSES)) {
      for (const v of values) bleed.classList.toggle(`${key}-${v}`, page[key] === v);
    }

    const picId = page.bannerPic.imageId;
    const picUrl = await store.imageURL(picId);
    banner.classList.toggle('has-pic', !!picUrl);
    banner.style.backgroundImage = picUrl && page.bannerPic.imageId === picId ? `url("${picUrl}")` : '';

    // a moodboard video playing behind the whole page
    const item = char.moodboard.find(m => m.id === page.videoBg);
    const videoUrl = item ? await store.imageURL(item.imageId) : null;
    videoBack.hidden = !videoUrl;
    bleed.classList.toggle('has-video', !!videoUrl);
    if (videoUrl && videoBack.getAttribute('src') !== videoUrl) videoBack.src = videoUrl;
    if (!videoUrl) videoBack.removeAttribute('src');
  }

  // ---- the top: pfp, name, which worlds they're in ----
  const pfp = h('button', { class: 'pfp-btn', title: mine ? 'change their picture' : '', disabled: !mine, onclick: changePic });
  const drawPfp = () => fill(pfp, portrait(char, 'pfp'), mine ? h('span', { class: 'pfp-badge' }, '📷') : null);

  async function changePic() {
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const { blob } = await shrinkImage(file, 640);
      const old = char.imageId;
      char.imageId = await store.putImage(blob);
      if (old) store.deleteImage(old);
      save();
      drawPfp();
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }

  const meta = h('div', { class: 'profile-meta' });
  function drawMeta() {
    const worlds = store.worldsOf(char.id);
    fill(meta,
      mine ? null : h('span', { class: 'owner-tag' }, char.ownerName || 'someone else'),
      worlds.map(w => h('a', { class: 'chip', href: `#/w/${w.id}/ocs`, style: { '--c': w.color } }, worldIcon(w), ' ', w.name)),
      mine && store.worlds.length ? h('button', { class: 'chip dashed', onclick: pickWorlds }, worlds.length ? '＋' : '＋ add to a world') : null,
      char.tags.map(t => h('span', { class: 'tag' }, t)));
  }

  function pickWorlds() {
    const list = h('div', { class: 'pick-list' });
    const drawList = () => fill(list, store.worlds.map(w => {
      const on = w.charIds.includes(char.id);
      return h('button', {
        type: 'button', class: 'pick-row' + (on ? ' on' : ''), style: { '--c': w.color },
        onclick: () => {
          if (on) store.removeFromWorld(w, char.id);
          else { w.charIds.push(char.id); store.save('world', w); }
          drawList();
          drawMeta();
        },
      }, h('span', { class: 'pick-emoji' }, worldIcon(w)), h('span', { class: 'pick-name' }, w.name), h('span', { class: 'pick-tick' }, on ? '✓' : '+'));
    }));
    drawList();
    openModal({ title: `${nameOf(char)}'s worlds`, body: list, actions: [{ label: 'done', kind: 'primary', onClick: close => close() }] });
  }

  async function removeOc() {
    if (!await confirmDialog(`delete ${nameOf(char)}? this can't be undone.`, { okLabel: 'delete', danger: true })) return;
    await store.deleteChar(char.id);
    toast('oc deleted');
    go(backHref.slice(2));
  }

  // ---- tab: about ----
  function aboutTab() {
    const facts = h('div', { class: 'facts' });
    const drawFacts = () => fill(facts,
      char.basics.map((row, i) => h('div', { class: 'fact' },
        h('input', { type: 'text', class: 'fact-label', value: row.label, placeholder: 'label', maxLength: 30, ...ro, oninput: e => { row.label = e.target.value; save(); } }),
        h('input', { type: 'text', class: 'fact-value', value: row.value, placeholder: '—', maxLength: 80, ...ro, oninput: e => { row.value = e.target.value; save(); } }),
        mine ? h('button', { class: 'x-btn', title: 'remove', onclick: () => { char.basics.splice(i, 1); save(); drawFacts(); } }, '✕') : null)),
      mine && h('button', {
        class: 'fact fact-new', onclick: () => {
          char.basics.push({ label: '', value: '' });
          save();
          drawFacts();
          facts.querySelectorAll('.fact-label')[char.basics.length - 1]?.focus();
        },
      }, '+'));

    const sections = h('div', { class: 'sections' });
    const drawSections = () => fill(sections,
      char.sections.map((sec, i) => h('section', { class: 'profile-section' },
        h('div', { class: 'section-head' },
          h('input', { type: 'text', class: 'section-title', value: sec.title, placeholder: 'section title', maxLength: 60, ...ro, oninput: e => { sec.title = e.target.value; save(); } }),
          mine && char.sections.length > 1 && [[-1, '↑', 'move up'], [1, '↓', 'move down']].map(([d, icon, title]) => h('button', {
            class: 'x-btn move-btn', title, disabled: !char.sections[i + d],
            onclick: () => { char.sections.splice(i + d, 0, char.sections.splice(i, 1)[0]); save(); drawSections(); },
          }, icon)),
          mine && h('button', {
            class: 'x-btn', title: 'remove this section', onclick: async () => {
              if (sec.text.trim() && !await confirmDialog(`remove "${sec.title || 'untitled'}" and what's written in it?`, { okLabel: 'remove', danger: true })) return;
              char.sections.splice(i, 1);
              save();
              drawSections();
            },
          }, '✕')),
        autosize(h('textarea', { class: 'section-text', value: sec.text, placeholder: mine ? '…' : '', ...ro, oninput: e => { sec.text = e.target.value; save(); } })))),
      mine && h('button', {
        class: 'btn ghost sm', onclick: () => {
          char.sections.push({ title: '', text: '' });
          save();
          drawSections();
          sections.querySelectorAll('.section-title')[char.sections.length - 1]?.focus();
        },
      }, '+ section'));

    drawFacts();
    drawSections();
    return [
      facts,
      h('label', { class: 'tags-field' },
        h('span', { class: 'field-label' }, 'tags'),
        h('input', {
          type: 'text', value: char.tags.join(', '), placeholder: mine ? 'main cast, villain, band' : '', ...ro,
          oninput: e => { char.tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean); save(); drawMeta(); },
        })),
      sections,
    ];
  }

  // ---- tab: relationships ----
  function relsTab() {
    const wrap = h('div', { class: 'rels-tab' });
    let mode = 'list';
    const add = () => openRelEditor({ me: char, onDone: draw });
    const edit = rel => openRelEditor({ me: char, rel, onDone: draw });

    function draw() {
      const rels = store.relsOf(char.id);
      drawCounts();
      if (!rels.length) {
        fill(wrap, emptyState('🧶', 'no relationships yet', null, h('button', { class: 'btn primary', onclick: add }, '+ add one')));
        return;
      }
      fill(wrap,
        h('div', { class: 'section-bar' },
          segmented([{ value: 'list', label: 'list' }, { value: 'web', label: 'web' }], mode, v => { mode = v; draw(); }),
          h('button', { class: 'btn primary sm', onclick: add }, '+ add')),
        mode === 'list' ? relList(rels) : relWeb(rels));
    }

    const relList = rels => h('div', { class: 'rel-cards' }, rels.map(rel => {
      const v = seenFrom(rel, char.id);
      return h('div', {
        class: 'rel-card', style: { '--c': rel.color }, role: 'button', tabindex: 0,
        onclick: () => edit(rel), onkeydown: e => { if (e.key === 'Enter') edit(rel); },
      },
        portrait(v.other || { name: v.otherName }, 'md'),
        h('div', { class: 'rel-card-text' },
          h('div', { class: 'rel-card-top' }, h('strong', {}, v.otherName), v.theyAre ? h('span', { class: 'rel-chip' }, v.theyAre) : null),
          v.iAm ? h('div', { class: 'rel-card-back' }, `${nameOf(char)} is their ${v.iAm}`) : v.iAm === '' ? h('div', { class: 'rel-card-back' }, 'one-sided') : null,
          rel.note ? h('div', { class: 'rel-card-note' }, rel.note) : null),
        v.other ? h('a', { class: 'rel-visit', href: linkTo(v.other), title: `go to ${v.otherName}`, onclick: e => e.stopPropagation() }, '→') : null);
    }));

    // them in the middle, everyone they know in a ring around them
    function relWeb(rels) {
      const people = new Map();
      for (const rel of rels) {
        const v = seenFrom(rel, char.id);
        const key = v.other ? v.other.id : 'name:' + v.otherName.toLowerCase();
        if (!people.has(key)) people.set(key, { v, rels: [] });
        people.get(key).rels.push(rel);
      }
      const lines = s('svg', { class: 'web-lines', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
      const box = h('div', { class: 'rel-web' }, lines);
      [...people.values()].forEach((p, i, all) => {
        const angle = (i / all.length) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 38, y = 50 + Math.sin(angle) * 36;
        p.rels.forEach((rel, j) => {
          const bow = (j - (p.rels.length - 1) / 2) * 5;
          const mx = (50 + x) / 2 - Math.sin(angle) * bow, my = (50 + y) / 2 + Math.cos(angle) * bow;
          lines.append(s('path', { class: 'edge-line ' + rel.line, stroke: rel.color, d: `M50,50 Q${2 * mx - (50 + x) / 2},${2 * my - (50 + y) / 2} ${x},${y}` }));
          const label = seenFrom(rel, char.id).theyAre;
          if (label) box.append(h('button', { class: 'edge-label', style: { '--c': rel.color, left: mx + '%', top: my + '%' }, onclick: () => edit(rel) }, label));
        });
        box.append(h(p.v.other ? 'a' : 'div', { class: 'web-node', href: p.v.other ? linkTo(p.v.other) : null, style: { left: x + '%', top: y + '%' } },
          portrait(p.v.other || { name: p.v.otherName }, 'md'), h('span', { class: 'node-name' }, p.v.otherName)));
      });
      box.append(h('div', { class: 'web-node me', style: { left: '50%', top: '50%' } }, portrait(char, 'lg')));
      return box;
    }

    draw();
    return wrap;
  }

  // ---- tab: gallery ----
  function galleryTab() {
    const grid = h('div', { class: 'gallery' });

    async function addPics() {
      const files = await pickFiles('image/*');
      for (const file of files) {
        try {
          const { blob } = await shrinkImage(file, 1600);
          char.gallery.push({ id: 'g_' + uid(), imageId: await store.putImage(blob), caption: '' });
        } catch (err) {
          console.error(err);
          toast(`couldn't read ${file.name}`, 'bad');
        }
      }
      if (files.length) { save(); draw(); }
    }

    function open(item) {
      const img = h('img', { class: 'lightbox-img', alt: '' });
      store.imageURL(item.imageId).then(url => { if (url) img.src = url; });
      openModal({
        title: item.caption || 'picture',
        wide: true,
        body: [img, mine ? h('input', { type: 'text', value: item.caption, maxLength: 120, placeholder: 'caption', oninput: e => { item.caption = e.target.value; save(); } }) : null],
        actions: !mine ? [{ label: 'done', kind: 'primary', onClick: close => close() }] : [
          {
            label: 'delete', kind: 'danger', onClick: async close => {
              if (!await confirmDialog('delete this picture?', { okLabel: 'delete', danger: true })) return;
              store.deleteImage(item.imageId);
              char.gallery = char.gallery.filter(g => g !== item);
              save();
              close();
            },
          },
          {
            label: 'make it their pfp', onClick: async close => {
              const blob = await (await fetch(await store.imageURL(item.imageId))).blob();
              const small = await shrinkImage(blob, 640);
              const old = char.imageId;
              char.imageId = await store.putImage(small.blob);
              if (old) store.deleteImage(old);
              save();
              drawPfp();
              close();
            },
          },
          { label: 'done', kind: 'primary', onClick: close => close() },
        ],
        onClose: draw,
      });
    }

    function draw() {
      drawCounts();
      fill(grid,
        mine && h('button', { class: 'gallery-item gallery-new', onclick: addPics }, h('span', { class: 'plus' }, '+')),
        !mine && !char.gallery.length ? emptyState('🖼️', 'no pictures yet') : null,
        char.gallery.map(item => {
          const img = h('img', { alt: item.caption, loading: 'lazy' });
          store.imageURL(item.imageId).then(url => { if (url) img.src = url; });
          return h('button', { class: 'gallery-item', onclick: () => open(item) }, img, item.caption ? h('span', { class: 'gallery-caption' }, item.caption) : null);
        }));
    }

    draw();
    return grid;
  }

  // ---- tab: moodboard (videos) ----
  function moodTab() {
    const wrap = h('div', { class: 'mood-tab' });
    const probe = document.createElement('video');

    async function addVideos() {
      const files = await pickFiles('video/*');
      let added = 0;
      for (const file of files) {
        if (!file.type.startsWith('video/') || !probe.canPlayType(file.type)) {
          toast(`${file.name} isn't a video this browser can play`, 'bad');
          continue;
        }
        if (file.size > MAX_VIDEO) {
          toast(`${file.name} is too big (${MAX_VIDEO / 1e6} mb max)`, 'bad');
          continue;
        }
        try {
          char.moodboard.push({ id: 'm_' + uid(), imageId: await store.putImage(file), caption: '' });
          added++;
        } catch (err) {
          console.error(err);
          toast(`couldn't save ${file.name}`, 'bad');
        }
      }
      if (added) { save(); draw(); }
    }

    // big = the one in the pop-up, with sound + controls. the ones on the board just loop quietly.
    function clip(item, big) {
      const v = h('video', { muted: !big, loop: true, autoplay: true, playsInline: true, controls: !!big, preload: 'metadata' });
      store.imageURL(item.imageId).then(url => { if (url) v.src = url; });
      return v;
    }

    function open(item) {
      const i = char.moodboard.indexOf(item);
      const behind = page.videoBg === item.id;
      const done = { label: 'done', kind: 'primary', onClick: close => close() };
      openModal({
        title: item.caption || 'moodboard',
        wide: true,
        body: [h('div', { class: 'mood-player' }, clip(item, true)),
          mine ? h('input', { type: 'text', value: item.caption, maxLength: 120, placeholder: 'caption', oninput: e => { item.caption = e.target.value; save(); } }) : null],
        actions: !mine ? [done] : [
          {
            label: 'delete', kind: 'danger', onClick: async close => {
              if (!await confirmDialog('delete this video?', { okLabel: 'delete', danger: true })) return;
              store.deleteImage(item.imageId);
              char.moodboard = char.moodboard.filter(m => m !== item);
              if (page.videoBg === item.id) page.videoBg = null;
              save();
              applyPageStyle();
              close();
            },
          },
          i > 0 ? {
            label: '← move', onClick: close => {
              char.moodboard.splice(i - 1, 0, char.moodboard.splice(i, 1)[0]);
              save();
              close();
            },
          } : null,
          {
            label: behind ? 'take it off the background' : 'play it as the background', onClick: close => {
              page.videoBg = behind ? null : item.id;
              save();
              applyPageStyle();
              close();
            },
          },
          done,
        ].filter(Boolean),
        onClose: draw,
      });
    }

    function draw() {
      drawCounts();
      const items = char.moodboard;
      if (!items.length) {
        fill(wrap, emptyState('🎞️', 'no videos yet', null, mine ? h('button', { class: 'btn primary', onclick: addVideos }, '+ add a video') : null));
        return;
      }
      fill(wrap,
        mine && h('div', { class: 'section-bar' },
          segmented(['grid', 'big', 'wall'].map(v => ({ value: v, label: v })), page.moodLayout, v => { page.moodLayout = v; save(); draw(); }),
          h('button', { class: 'btn primary sm', onclick: addVideos }, '+ add videos')),
        h('div', { class: 'mood mood-' + page.moodLayout }, items.map(item =>
          h('button', { class: 'mood-item', onclick: () => open(item) },
            clip(item),
            page.videoBg === item.id ? h('span', { class: 'mood-flag', title: 'playing as the background' }, '✦') : null,
            item.caption ? h('span', { class: 'gallery-caption' }, item.caption) : null))));
    }

    draw();
    return wrap;
  }

  // ---- tab: page style ----
  function styleTab() {
    const wrap = h('div', { class: 'style-grid' });
    const changed = () => { save(); applyPageStyle(); };
    const rebuild = () => { save(); render(fill(el), { char, tab: 'style', base, world, go }); }; // for changes to the tabs themselves
    const group = title => h('h3', { class: 'style-group' }, title);
    const pick = (label, key, options) => choiceCard(label, options, page[key], v => { page[key] = v; changed(); });

    const bannerCard = colorCard('banner color', () => page.banner, v => page.banner = v, changed);
    bannerCard.append(h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: page.bannerFade, onchange: e => { page.bannerFade = e.target.checked; changed(); } }), ' fade'));

    const tabs = tabOrder(page).map(id => ({ id, label: TAB_NAMES[id] }));

    // their playlist
    const songList = h('div', { class: 'order-list' });
    const probe = document.createElement('audio');
    const songsChanged = () => { save(); drawSongs(); music.refresh(); };
    function drawSongs() {
      fill(songList, char.playlist.map((song, i) => {
        const move = d => { char.playlist.splice(i + d, 0, char.playlist.splice(i, 1)[0]); songsChanged(); };
        return h('div', { class: 'order-row song-row' },
          h('input', { type: 'text', class: 'song-title', value: song.title, maxLength: 120, placeholder: 'song name', oninput: e => { song.title = e.target.value; save(); music.refresh(); } }),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => move(-1) }, '↑'),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'move down', disabled: i === char.playlist.length - 1, onclick: () => move(1) }, '↓'),
          h('button', {
            type: 'button', class: 'icon-btn sm', title: 'delete', onclick: async () => {
              if (!await confirmDialog(`delete "${song.title || 'this song'}"?`, { okLabel: 'delete', danger: true })) return;
              store.deleteImage(song.imageId);
              char.playlist = char.playlist.filter(x => x !== song);
              songsChanged();
            },
          }, '✕'));
      }));
    }
    async function addSongs() {
      const files = await pickFiles('audio/*');
      let added = 0;
      for (const file of files) {
        if (!file.type.startsWith('audio/') || !probe.canPlayType(file.type)) {
          toast(`${file.name} isn't a song this browser can play`, 'bad');
          continue;
        }
        if (file.size > MAX_SONG) {
          toast(`${file.name} is too big (${MAX_SONG / 1e6} mb max)`, 'bad');
          continue;
        }
        try {
          char.playlist.push({ id: 's_' + uid(), imageId: await store.putImage(file), title: file.name.replace(/\.[^.]+$/, '') });
          added++;
        } catch (err) {
          console.error(err);
          toast(`couldn't save ${file.name}`, 'bad');
        }
      }
      if (added) songsChanged();
    }
    drawSongs();

    fill(wrap,
      group('colors + fonts'),
      card('their color', null, swatches(char.color, c => { char.color = c; changed(); drawPfp(); })),
      lookCards(page, changed),

      group('top of the page'),
      bannerCard,
      pictureCard('banner picture', page.bannerPic, changed, { maxDim: 2400 }),
      pick('banner size', 'bannerSize', ['none', 'short', 'normal', 'tall']),
      pick('name + pfp', 'heroAlign', ['left', 'center']),
      pick('pfp shape', 'pfpShape', ['rounded', 'circle', 'square']),
      pick('pfp size', 'pfpSize', ['small', 'normal', 'big']),

      group('music'),
      card('songs', null, songList, h('button', { class: 'btn ghost sm', onclick: addSongs }, '+ add songs')),
      card('when the page opens', null, h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: page.musicAutoplay, onchange: e => { page.musicAutoplay = e.target.checked; save(); } }), ' start playing')),

      group('layout'),
      card('tabs', null, orderList(tabs, page.hiddenTabs, () => { page.tabs = tabs.map(t => t.id); rebuild(); })),
      pick('page width', 'width', ['normal', 'wide', 'full']),

      h('div', { class: 'style-card plain' },
        h('button', {
          class: 'btn ghost sm', onclick: async () => {
            if (!await confirmDialog('put the whole look back to normal?', { okLabel: 'reset' })) return;
            [page.wallpaper.imageId, page.bannerPic.imageId].forEach(id => id && store.deleteImage(id));
            char.page = blankPage();
            rebuild(); // start over with the fresh page object
          },
        }, 'reset the whole look')));

    return wrap;
  }

  // ---- put it together ----
  const TAB_VIEWS = { about: aboutTab, relationships: relsTab, gallery: galleryTab, moodboard: moodTab, style: styleTab };
  const panel = h('div', { class: 'profile-panel' }, TAB_VIEWS[active]());

  el.append(bleed);
  bleed.append(videoBack, h('div', { class: 'page profile' },
    h('div', { class: 'profile-top' },
      h('a', { class: 'back-link', href: backHref }, world ? `← ${world.name}` : '← home'),
      mine && h('button', { class: 'link-btn danger', onclick: removeOc }, 'delete oc')),
    h('div', { class: 'profile-hero' },
      banner,
      h('div', { class: 'profile-id' },
        pfp,
        h('div', { class: 'profile-id-text' },
          h('input', { type: 'text', class: 'profile-name', value: char.name, placeholder: 'their name', maxLength: 80, ...ro, oninput: e => { char.name = e.target.value; save(); } }),
          h('input', { type: 'text', class: 'profile-tagline', value: char.tagline, placeholder: mine ? 'one line about them' : '', maxLength: 140, ...ro, oninput: e => { char.tagline = e.target.value; save(); } }),
          meta))),
    h('nav', { class: 'profile-tabs' }, tabs.map(([id, label]) =>
      h('a', { class: 'profile-tab' + (id === active ? ' on' : ''), href: `#/${base}/${id}` }, label, tabCounts[id]))),
    panel));

  drawCounts();
  applyPageStyle();
  music.show(char);
  drawPfp();
  drawMeta();
  if (!char.name) requestAnimationFrame(() => el.querySelector('.profile-name')?.focus());
}
