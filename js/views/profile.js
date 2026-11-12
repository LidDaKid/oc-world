// one oc's page: about, relationships, gallery, moodboard, page style (+ their music, see music.js).
// the same page shows at #/oc/<id> (on their own) and #/w/<world>/ocs/<id> (inside a world),
// and read-only at #/view/<token> when someone opens a one-time share link (view = true, see share.js).

import { store, MAX_VIDEO, MAX_SONG } from '../store.js';
import { music } from '../music.js';
import { h, s, fill, uid, toast, openModal, confirmDialog, swatches, segmented, autosize, pickFile, pickFiles, shrinkImage } from '../ui.js';
import { portrait, nameOf, emptyState, worldIcon } from '../parts.js';
import { seenFrom, openRelEditor } from '../rels.js';
import { blankPage } from '../model.js';
import { paint, lookCards, boxCards, LOOK_CHOICES, filterCss, sliderCard, card, colorCard, choiceCard, pictureCard, orderList } from '../look.js';
import { FEATURES } from '../ocfun/index.js';
import { dataFor, sticker } from '../ocfun/kit.js';
import * as mood from '../ocfun/mood.js';
import { pickAndCrop, cropAll } from '../crop.js';
import { openShareModal } from '../share.js';
import { moreCards, toolsFor, organize, PICTURE_KEYS } from '../look-more.js';
import { setFavicon, blinkieNode, setPfpSlides, typeReveal } from '../look-fx.js';
import { setCode, isLocked, askCode } from '../diary/lock.js';
import { worldmates } from '../ocfun/kit.js';
import { pickStickerIcon } from '../parts.js';
import { stickerNode } from '../diary/stickers.js';

// spoiler sections someone already clicked open (this visit only)
const seenSpoilers = new WeakSet();
// "move boxes around" from page style opens the page in arrange mode once
let arrangeNext = null;
// the boxes free layout can move (page.layout = { key: { x, y } })
const LAYOUT_KEYS = ['top', 'hero', 'widgets', 'tabs', 'panel'];

// the tabs you can move around / hide. page style is always last (and only for whoever made the oc).
const TAB_NAMES = { about: 'about', relationships: 'relationships', gallery: 'gallery', moodboard: 'moodboard', fun: 'more' };
const tabOrder = page => [...new Set([...(page.tabs || []).filter(id => id in TAB_NAMES), ...Object.keys(TAB_NAMES)])];

const LAYOUT_CLASSES = {
  bannerSize: ['none', 'short', 'tall'], heroAlign: ['center', 'right'], pfpShape: ['circle', 'square', 'heart', 'star', 'flower', 'hexagon', 'blob'], pfpSize: ['small', 'big'], width: ['wide', 'full'],
  pfpFrame: ['double', 'glow', 'polaroid', 'lace', 'sparkle', 'dashed'], bannerEdge: ['wavy', 'zigzag', 'scalloped', 'torn'], tabStyle: ['underline', 'folder', 'buttons'],
};

export function render(el, { char, tab, sub, base, world, go, view = false }) {
  const page = char.page;
  // in a collab world you can look at someone else's oc, but only they can change it
  const mine = store.isMine(char);
  const ro = mine ? {} : { readOnly: true };
  let shown = tabOrder(page).filter(id => !page.hiddenTabs.includes(id));
  if (!shown.length) shown = ['about'];
  const tabName = id => (page.tabNames?.[id] || '').trim() || TAB_NAMES[id];
  const tabs = [...shown.map(id => [id, tabName(id)]), ...(mine ? [['style', 'page style']] : [])];
  const active = tabs.some(t => t[0] === tab) ? tab : tabs[0][0];
  const save = () => store.save('char', char);
  const linkTo = other => (view ? `#/${base}` : world && world.charIds.includes(other.id) ? `#/w/${world.id}/ocs/${other.id}` : `#/oc/${other.id}`);
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
    if (filterCss(page.pfpFilter)) bleed.style.setProperty('--pfp-filter', filterCss(page.pfpFilter));
    if (filterCss(page.bannerFilter)) bleed.style.setProperty('--banner-filter', filterCss(page.bannerFilter));
    bleed.classList.toggle('banner-custom', typeof page.bannerPx === 'number');
    if (typeof page.bannerPx === 'number') bleed.style.setProperty('--banner-h', page.bannerPx + 'px');
    // their mood ring's color glows softly behind the page
    const tint = mood.moodTint?.(char);
    bleed.classList.toggle('has-mood', !!tint);
    if (tint) bleed.style.setProperty('--mood', tint);
    bleed.classList.toggle('banner-fade', !!page.bannerFade);
    // the page can take their mood ring's color
    const moodColor = page.moodLook === 'on' ? mood.moodTint?.(char) : null;
    if (moodColor) { bleed.style.setProperty('--c', moodColor); bleed.style.setProperty('--accent', moodColor); }
    // the music player's skin + visualizer, and the page glowing with the beat
    music.setLook({ skin: page.playerSkin || 'normal', visualizer: page.visualizer || 'off', listen: page.beatGlow === 'on' });
    if (page.beatGlow === 'on' && !bleed.beatOn) {
      bleed.beatOn = true;
      const beat = () => { if (!bleed.isConnected) return; bleed.style.setProperty('--beat', music.level().toFixed(3)); requestAnimationFrame(beat); };
      requestAnimationFrame(beat);
    }
    bleed.classList.toggle('beat-on', page.beatGlow === 'on');
    placeBlocks();
    drawWidgets();
    // the browser tab can wear their pfp
    setFavicon(page.tabIcon === 'their pfp' && char.imageId ? await store.imageURL(char.imageId) : null);
    drawPageStickers();
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
  const drawPfp = () => {
    fill(pfp, h('span', { class: 'pfp-deco' }), portrait(char, 'pfp'), mine ? h('span', { class: 'pfp-badge' }, '📷') : null);
    setPfpSlides(bleed, page.pfpSlides, page.pfpSec);
  };

  async function changePic() {
    const file = await pickAndCrop({ aspect: 1 });
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
      mood.moodBadge?.(char) || null,
      mine || view ? null : h('span', { class: 'owner-tag' }, char.ownerName || 'someone else'),
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
      char.sections.map((sec, i) => h('section', { class: 'profile-section', style: sec.color ? { '--sec-color': sec.color } : null },
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
        sectionBody(sec))),
      mine && h('button', {
        class: 'btn ghost sm', onclick: () => {
          char.sections.push({ title: '', text: '' });
          save();
          drawSections();
          sections.querySelectorAll('.section-title')[char.sections.length - 1]?.focus();
        },
      }, '+ section'));

    // what's under a section title: the writing, or a lock, or a spoiler cover over the writing
    function sectionBody(sec) {
      const lockObj = sec.lock?.on ? { id: sec.id, lock: sec.lock, cover: { title: { text: sec.title || 'locked' } } } : null;
      if (lockObj && isLocked(lockObj)) {
        return h('div', { class: 'section-locked' }, h('span', { class: 'section-lock-icon' }, '🔒'),
          h('button', { class: 'btn ghost sm', onclick: async () => { if (await askCode(lockObj, { mode: 'open' })) drawSections(); } }, 'unlock'));
      }
      const area = autosize(h('textarea', { class: 'section-text', value: sec.text, placeholder: mine ? '…' : '', ...ro, oninput: e => { sec.text = e.target.value; save(); } }));
      if (!sec.spoiler || seenSpoilers.has(sec)) return area;
      const wrap = h('div', { class: 'spoiler-wrap' }, area,
        h('button', { type: 'button', class: 'spoiler-cover', onclick: () => { seenSpoilers.add(sec); wrap.replaceWith(area); autosize(area); } }, 'spoiler'));
      return wrap;
    }

    drawFacts();
    drawSections();
    if (page.typeReveal === 'on') requestAnimationFrame(() => typeReveal(sections));
    return [
      facts,
      h('label', { class: 'tags-field' },
        h('span', { class: 'field-label' }, (page.labels?.tags || '').trim() || 'tags'),
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
    const edit = rel => { if (!view) openRelEditor({ me: char, rel, onDone: draw }); };

    function draw() {
      const rels = store.relsOf(char.id);
      drawCounts();
      if (!rels.length) {
        fill(wrap, emptyState('🧶', 'no relationships yet', null, view ? null : h('button', { class: 'btn primary', onclick: add }, '+ add one')));
        return;
      }
      fill(wrap,
        h('div', { class: 'section-bar' },
          segmented([{ value: 'list', label: 'list' }, { value: 'web', label: 'web' }], mode, v => { mode = v; draw(); }),
          view ? null : h('button', { class: 'btn primary sm', onclick: add }, '+ add')),
        mode === 'list' ? relList(rels) : relWeb(rels));
    }

    const relList = rels => h('div', { class: 'rel-cards' }, rels.map(rel => {
      const v = seenFrom(rel, char.id);
      return h('div', {
        class: 'rel-card', style: { '--c': rel.color }, role: view ? null : 'button', tabindex: view ? null : 0,
        onclick: () => edit(rel), onkeydown: e => { if (e.key === 'Enter') edit(rel); },
      },
        portrait(v.other || { name: v.otherName }, 'md'),
        h('div', { class: 'rel-card-text' },
          h('div', { class: 'rel-card-top' }, h('strong', {}, v.otherName), v.theyAre ? h('span', { class: 'rel-chip' }, v.theyAre) : null),
          v.iAm ? h('div', { class: 'rel-card-back' }, `${nameOf(char)} is their ${v.iAm}`) : v.iAm === '' ? h('div', { class: 'rel-card-back' }, 'one-sided') : null,
          rel.note ? h('div', { class: 'rel-card-note' }, rel.note) : null),
        v.other && !view ? h('a', { class: 'rel-visit', href: linkTo(v.other), title: `go to ${v.otherName}`, onclick: e => e.stopPropagation() }, '→') : null);
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
          if (label) box.append(h(view ? 'span' : 'button', { class: 'edge-label', style: { '--c': rel.color, left: mx + '%', top: my + '%' }, onclick: () => edit(rel) }, label));
        });
        box.append(h(p.v.other && !view ? 'a' : 'div', { class: 'web-node', href: p.v.other && !view ? linkTo(p.v.other) : null, style: { left: x + '%', top: y + '%' } },
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
      const files = await cropAll(await pickFiles('image/*'));
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
    const rebuild = () => { save(); render(fill(el), { char, tab: 'style', base, world, go }); }; // for changes to the tabs themselves
    const tools = toolsFor(page, () => { save(); applyPageStyle(); }, {
      scope: 'oc', reload: rebuild, ownerId: char.id, name: char.name,
      snapshot: () => bleed.querySelector('.page.profile'),
      arrange: () => { arrangeNext = char.id; go(`${base}/about`); },
    });
    const changed = tools.changed;
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

    const more = moreCards(page, changed, 'oc');
    fill(wrap,
      group('tools'), tools.cards,
      group('colors + fonts'),
      card('their color', null, swatches(char.color, c => { char.color = c; changed(); drawPfp(); })),
      lookCards(page, changed),
      ...((b = boxCards(page, changed)) => [
        group('boxes'), b.boxes,
        group('text + buttons'), b.text,
        group('over the background'), b.background,
        group('extras'), b.extras,
      ])(),

      group('top of the page'),
      bannerCard,
      pictureCard('banner picture', page.bannerPic, changed, { maxDim: 2400 }),
      pick('banner filter', 'bannerFilter', LOOK_CHOICES.bgFilter),
      pick('banner size', 'bannerSize', ['none', 'short', 'normal', 'tall']),
      sliderCard('banner height', () => page.bannerPx ?? null, v => page.bannerPx = v, changed, { max: 400, start: 120, unit: 'px' }),
      pick('banner edge', 'bannerEdge', ['straight', 'wavy', 'zigzag', 'scalloped', 'torn']),
      pick('name + pfp', 'heroAlign', ['left', 'center', 'right']),
      pick('pfp shape', 'pfpShape', ['rounded', 'circle', 'square', 'heart', 'star', 'flower', 'hexagon', 'blob']),
      pick('pfp frame', 'pfpFrame', ['none', 'double', 'glow', 'polaroid', 'lace', 'sparkle', 'dashed']),
      pick('pfp size', 'pfpSize', ['small', 'normal', 'big']),
      pick('pfp filter', 'pfpFilter', LOOK_CHOICES.bgFilter),

      group('music'),
      card('songs', null, songList, h('button', { class: 'btn ghost sm', onclick: addSongs }, '+ add songs')),
      card('when the page opens', null, h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: page.musicAutoplay, onchange: e => { page.musicAutoplay = e.target.checked; save(); } }), ' start playing')),

      group('layout'),
      card('tabs', null, orderList(tabs, page.hiddenTabs, () => { page.tabs = tabs.map(t => t.id); rebuild(); })),
      namesCard(),
      pick('tab style', 'tabStyle', ['pills', 'underline', 'folder', 'buttons']),
      pick('page width', 'width', ['normal', 'wide', 'full']),

      Object.entries(more).map(([name, cards]) => [group(name), cards]),

      group('stickers + blinkies'),
      stickersCard(),
      blinkiesCard(),
      sectionColorsCard(),
      widgetsCard(),

      h('div', { class: 'style-card plain' },
        h('button', {
          class: 'btn ghost sm', onclick: async () => {
            if (!await confirmDialog('put the whole look back to normal?', { okLabel: 'reset' })) return;
            [page.wallpaper.imageId, page.bannerPic.imageId, page.fallPic?.imageId, page.pfpHover?.imageId, page.cursorPic?.imageId,
              ...(page.slides || []).map(p => p.imageId), ...(page.bannerSlides || []).map(p => p.imageId)].forEach(id => id && store.deleteImage(id));
            char.page = blankPage();
            rebuild(); // start over with the fresh page object
          },
        }, 'reset the whole look')));

    organize(wrap);
    return wrap;

    function stickersCard() {
      const list = h('div', { class: 'order-list' });
      const draw = () => {
        page.stickers = Array.isArray(page.stickers) ? page.stickers : [];
        fill(list, page.stickers.map(st => h('div', { class: 'order-row sticker-row' },
          h('span', { class: 'sticker-pick-prev' }, stickerNode(st.sid)),
          h('input', { type: 'range', class: 'look-slider', min: 24, max: 260, value: st.size, title: 'size', oninput: e => { st.size = +e.target.value; changed(); } }),
          h('input', { type: 'range', class: 'look-slider', min: -45, max: 45, value: st.rot || 0, title: 'turn', oninput: e => { st.rot = +e.target.value; changed(); } }),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { page.stickers = page.stickers.filter(x => x !== st); changed(); draw(); } }, '✕'))));
      };
      draw();
      return card('stickers on the page', null, list,
        h('button', { class: 'btn ghost sm', onclick: () => pickStickerIcon(sid => {
          page.stickers = [...(page.stickers || []), { id: 'ps_' + uid(), sid, x: 10 + Math.random() * 75, y: 40 + Math.random() * 300, size: 90, rot: Math.round(Math.random() * 30 - 15) }];
          changed(); draw();
        }) }, '+ add sticker'));
    }

    function blinkiesCard() {
      const list = h('div', { class: 'blinkie-edit-list' });
      const draw = () => {
        page.blinkies = Array.isArray(page.blinkies) ? page.blinkies : [];
        fill(list, page.blinkies.map(b => {
          const prev = h('div', { class: 'blinkie-prev' }, blinkieNode(b));
          const redo = () => { fill(prev, blinkieNode(b)); changed(); };
          return h('div', { class: 'blinkie-edit' },
            prev,
            h('input', { type: 'text', value: b.text, maxLength: 40, placeholder: 'words', oninput: e => { b.text = e.target.value; redo(); } }),
            segmented(['blinkie', 'stamp'].map(v => ({ value: v, label: v })), b.style || 'blinkie', v => { b.style = v; redo(); }),
            segmented(['blink', 'scroll', 'glitter', 'still'].map(v => ({ value: v, label: v })), b.anim || 'blink', v => { b.anim = v; redo(); }),
            swatches(b.bg, c => { b.bg = c; redo(); }),
            swatches(b.ink, c => { b.ink = c; redo(); }, ['#ffffff', '#000000', '#ff4fa3', '#ffd84d', '#7df9d0', '#6ec6ff', '#b18cff']),
            h('button', { type: 'button', class: 'link-btn', onclick: () => { page.blinkies = page.blinkies.filter(x => x !== b); changed(); draw(); } }, 'remove'));
        }));
      };
      draw();
      return card('blinkies + stamps', null, list,
        h('button', { class: 'btn ghost sm', onclick: () => { page.blinkies = [...(page.blinkies || []), { id: 'bl_' + uid(), text: char.name || 'hi', style: 'blinkie', bg: char.color, ink: '#ffffff', anim: 'blink' }]; changed(); draw(); } }, '+ add blinkie'));
    }

    function namesCard() {
      page.tabNames ||= {};
      page.labels ||= {};
      const row = (label, obj, key, ph) => h('label', { class: 'name-row' }, h('span', {}, label),
        h('input', { type: 'text', value: obj[key] || '', placeholder: ph, maxLength: 24, oninput: e => { obj[key] = e.target.value; save(); } }));
      return card('tab + heading names', null, h('div', { class: 'name-list' },
        Object.keys(TAB_NAMES).map(id => row(TAB_NAMES[id], page.tabNames, id, TAB_NAMES[id])),
        row('tags', page.labels, 'tags', 'tags')));
    }

    function widgetsCard() {
      const list = h('div', { class: 'widget-edit-list' });
      const TYPES = { currently: 'currently', stats: 'stat bars', countdown: 'countdown', quote: 'quote box', visitors: 'visitor counter', guestbook: 'guestbook', playlist: 'mini playlist' };
      const text = (w, key, ph, max = 80) => h('input', { type: 'text', value: w[key] || '', placeholder: ph, maxLength: max, oninput: e => { w[key] = e.target.value; changed(); } });
      const draw = () => {
        page.widgets = Array.isArray(page.widgets) ? page.widgets : [];
        fill(list, page.widgets.map((w, i) => {
          const move = d => { page.widgets.splice(i + d, 0, page.widgets.splice(i, 1)[0]); changed(); draw(); };
          let body = null;
          if (w.type === 'currently') body = [text(w, 'listening', 'listening to'), text(w, 'reading', 'reading'), text(w, 'watching', 'watching'), text(w, 'feeling', 'feeling')];
          else if (w.type === 'stats') {
            w.bars ||= [];
            body = [segmented(['bars', 'hearts', 'stars'].map(v => ({ value: v, label: v })), w.style || 'bars', v => { w.style = v; changed(); }),
              ...w.bars.map(b => h('div', { class: 'stat-edit' },
                h('input', { type: 'text', value: b.label, placeholder: 'kindness', maxLength: 24, oninput: e => { b.label = e.target.value; changed(); } }),
                h('input', { type: 'range', class: 'look-slider', min: 0, max: 100, value: b.value, oninput: e => { b.value = +e.target.value; changed(); } }),
                h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { w.bars = w.bars.filter(x => x !== b); changed(); draw(); } }, '✕'))),
              h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { w.bars.push({ label: '', value: 50 }); changed(); draw(); } }, '+ bar')];
          } else if (w.type === 'countdown') body = [text(w, 'label', 'countdown to'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!w.useBirthday, onchange: e => { w.useBirthday = e.target.checked; changed(); draw(); } }), ' their birthday'),
            w.useBirthday ? null : h('input', { type: 'date', value: w.date || '', onchange: e => { w.date = e.target.value; changed(); } })];
          else if (w.type === 'quote') body = [h('textarea', { rows: 2, maxLength: 300, placeholder: 'the quote', value: w.text || '', oninput: e => { w.text = e.target.value; changed(); } }), text(w, 'by', 'who said it'),
            segmented(['fancy', 'tape', 'bubble'].map(v => ({ value: v, label: v })), w.frame || 'fancy', v => { w.frame = v; changed(); })];
          else if (w.type === 'visitors') body = [h('input', { type: 'number', min: 0, value: w.count || '', placeholder: 'start at', oninput: e => { w.count = +e.target.value || 0; changed(); } })];
          else if (w.type === 'guestbook') body = [h('div', { class: 'muted' }, `${(w.entries || []).length}`),
            (w.entries || []).length ? h('button', { type: 'button', class: 'link-btn', onclick: () => { w.entries = []; changed(); draw(); } }, 'clear it') : null];
          return h('div', { class: 'widget-edit' },
            h('div', { class: 'widget-edit-head' }, h('b', {}, TYPES[w.type]),
              h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => move(-1) }, '↑'),
              h('button', { type: 'button', class: 'icon-btn sm', title: 'move down', disabled: i === page.widgets.length - 1, onclick: () => move(1) }, '↓'),
              h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { page.widgets = page.widgets.filter(x => x !== w); changed(); draw(); } }, '✕')),
            w.type === 'quote' || w.type === 'countdown' ? null : text(w, 'title', 'box title'), body);
        }));
      };
      draw();
      const add = h('select', { onchange: e => {
        if (!e.target.value) return;
        page.widgets = [...(page.widgets || []), { id: 'wd_' + uid(), type: e.target.value, ...(e.target.value === 'stats' ? { bars: [{ label: 'kindness', value: 70 }, { label: 'chaos', value: 95 }] } : {}) }];
        e.target.value = '';
        changed(); draw();
      } }, h('option', { value: '' }, '+ add a widget'), Object.entries(TYPES).map(([v, l]) => h('option', { value: v }, l)));
      return card('widgets', null, list, add);
    }

    function sectionColorsCard() {
      return card('sections', null, h('div', { class: 'sec-color-list' }, char.sections.map(sec => h('div', { class: 'sec-color-row' },
        h('span', { class: 'sec-color-name' }, sec.title || 'untitled'),
        swatches(sec.color || null, c => { sec.color = c; save(); }),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!sec.spoiler, onchange: e => { sec.spoiler = e.target.checked; save(); } }), ' spoiler'),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: async e => {
          const btn = e.currentTarget;
          if (sec.lock?.on) { sec.lock = null; save(); btn.textContent = 'lock'; return; }
          sec.id ||= 'sec_' + uid();
          const obj = { id: sec.id, lock: { style: 'gold' }, cover: { title: { text: sec.title || 'locked' } } };
          const code = await askCode(obj, { mode: 'set' });
          if (!code) return;
          await setCode(obj, code);
          sec.lock = obj.lock;
          save();
          btn.textContent = 'unlock for good';
        } }, sec.lock?.on ? 'unlock for good' : 'lock'),
        h('button', { type: 'button', class: 'link-btn', onclick: e => { sec.color = null; save(); e.target.parentNode.querySelector('.swatches').set?.(null); } }, 'reset')))));
    }
  }

  // ---- tab: more (a grid of little apps, each one in ocfun/) ----
  let funCleanup = null;
  function funTab() {
    const app = FEATURES.find(f => f.meta.id === sub);
    if (!app) {
      // lots of apps: a search box over the grid
      const grid = h('div', { class: 'fun-grid' }, FEATURES.map(f =>
        h('a', { class: 'fun-tile', href: `#/${base}/fun/${f.meta.id}`, dataset: { name: f.meta.label } }, sticker(f.meta.icon), h('span', {}, f.meta.label))));
      const find = h('input', { type: 'search', class: 'fun-find', placeholder: 'find an app', oninput: () => {
        const q = find.value.trim().toLowerCase();
        for (const t of grid.children) t.hidden = !!q && !t.dataset.name.includes(q);
      } });
      return h('div', { class: 'fun-home' }, find, grid);
    }
    const box = h('div', { class: 'fun-app fun-' + app.meta.id });
    const ctx = { char, mine, save, go, base, world, ocLink: linkTo, data: dataFor(char, app.meta.id) };
    try { funCleanup = app.render(box, ctx) || null; } catch (err) { console.error(err); toast("that didn't open right", 'bad'); }
    return box;
  }

  // ---- widgets: little 2000s profile boxes under the top part (page.widgets = [{ id, type, ... }]) ----
  const widgetRow = h('div', { class: 'oc-widgets', dataset: { block: 'widgets' } });
  function drawWidgets() {
    const list = Array.isArray(page.widgets) ? page.widgets : [];
    widgetRow.hidden = !list.length;
    fill(widgetRow, list.map(w => h('div', { class: `card oc-widget widget-${w.type}` }, widgetBody(w))));
  }
  function widgetBody(w) {
    const head = t => h('div', { class: 'widget-head' }, w.title?.trim() || t);
    if (w.type === 'currently') {
      const rows = [['listening to', w.listening], ['reading', w.reading], ['watching', w.watching], ['feeling', w.feeling]].filter(r => r[1]?.trim());
      return [head('currently'), h('div', { class: 'widget-rows' }, rows.map(([k, v]) => h('div', { class: 'widget-row' }, h('span', { class: 'widget-k' }, k), h('span', { class: 'widget-v' }, v))))];
    }
    if (w.type === 'stats') {
      const style = w.style || 'bars';
      return [head('stats'), h('div', { class: 'stat-list' }, (w.bars || []).map(b => {
        const v = Math.max(0, Math.min(100, Number(b.value) || 0));
        const icons = n => Array.from({ length: n }, (_, i) => h('span', { class: 'stat-ico' + (i < Math.round(v / (100 / n)) ? ' on' : '') }, style === 'hearts' ? '♥' : '★'));
        return h('div', { class: 'stat-row' }, h('span', { class: 'stat-label' }, b.label || '?'),
          style === 'bars' ? h('div', { class: 'stat-bar' }, h('i', { style: { width: v + '%' } })) : h('div', { class: 'stat-icons' }, icons(style === 'hearts' ? 10 : 5)),
          style === 'bars' ? h('span', { class: 'stat-num' }, v + '%') : null);
      }))];
    }
    if (w.type === 'countdown') {
      const days = daysUntil(w);
      return [head(w.label?.trim() || 'countdown'), h('div', { class: 'count-big' }, days == null ? '?' : days === 0 ? 'today!' : String(days)), days ? h('div', { class: 'count-small' }, days === 1 ? 'day' : 'days') : null];
    }
    if (w.type === 'quote') {
      return h('figure', { class: 'quote-box frame-' + (w.frame || 'fancy') }, h('blockquote', {}, w.text || '...'), w.by?.trim() ? h('figcaption', {}, '— ' + w.by) : null);
    }
    if (w.type === 'visitors') {
      w.count = (Number(w.count) || Math.floor(1000 + Math.random() * 9000));
      if (!widgetRow.counted) { widgetRow.counted = true; w.count++; if (mine) save(); }
      return [head('visitors'), h('div', { class: 'odometer' }, String(w.count).padStart(6, '0').split('').map(d => h('span', {}, d)))];
    }
    if (w.type === 'guestbook') {
      const entries = Array.isArray(w.entries) ? w.entries : (w.entries = []);
      return [head('guestbook'),
        h('div', { class: 'gb-list' }, entries.length ? entries.slice(-6).reverse().map(e => h('div', { class: 'gb-entry' },
          h('div', { class: 'gb-who' }, e.who ? portrait(store.char(e.who) || { name: e.name }, 'xs') : null, h('b', {}, e.who ? nameOf(store.char(e.who)) : e.name || 'someone')),
          h('div', { class: 'gb-text' }, e.text))) : h('div', { class: 'gb-empty' }, '...')),
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => signGuestbook(w) }, 'sign')];
    }
    if (w.type === 'playlist') {
      return [head('playlist'), h('div', { class: 'mini-pl' }, char.playlist.length ? char.playlist.map(sg => h('button', { type: 'button', class: 'mini-song', onclick: () => music.playSong(sg.id) }, h('span', { class: 'mini-play' }, '▶'), sg.title || 'untitled')) : h('div', { class: 'gb-empty' }, '...'))];
    }
    return null;
  }
  function daysUntil(w) {
    let target = null;
    if (w.useBirthday) {
      const b = char.basics.find(x => /birthday/i.test(x.label))?.value?.trim();
      const d = b ? new Date(b + (/\d{4}/.test(b) ? '' : ' 2000')) : null;
      if (d && !isNaN(d)) target = new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
    } else if (w.date) target = new Date(w.date + 'T00:00:00');
    if (!target || isNaN(target)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (w.useBirthday && target < today) target.setFullYear(target.getFullYear() + 1);
    return Math.max(0, Math.round((target - today) / 864e5));
  }
  function signGuestbook(w) {
    const mates = worldmates(char.id).filter(c => c.id !== char.id);
    let who = mates[0]?.id || null;
    const name = h('input', { type: 'text', placeholder: 'name', maxLength: 40, hidden: !!who });
    const text = h('textarea', { rows: 3, maxLength: 300, placeholder: 'message' });
    const picker = h('select', { onchange: e => { who = e.target.value || null; name.hidden = !!who; } },
      mates.map(c => h('option', { value: c.id }, nameOf(c))), h('option', { value: '' }, 'someone else'));
    openModal({
      title: 'sign the guestbook', body: [mates.length ? picker : null, name, text],
      actions: [{ label: 'sign', kind: 'primary', onClick: close => {
        if (!text.value.trim()) return;
        w.entries.push({ id: 'gb_' + uid(), who: mates.length ? who : null, name: name.value.trim(), text: text.value.trim(), at: Date.now() });
        save(); drawWidgets(); close();
      } }],
    });
  }

  // ---- free layout: the big boxes can be dragged anywhere (they keep their spot in page.layout) ----
  function placeBlocks() {
    const lay = page.layout || {};
    for (const key of LAYOUT_KEYS) {
      const node = bleed.querySelector(`[data-block="${key}"]`);
      if (!node) continue;
      const at = lay[key];
      node.style.translate = at && (at.x || at.y) ? `${at.x || 0}px ${at.y || 0}px` : '';
    }
  }
  function arrangeMode() {
    const pageEl = bleed.querySelector('.page.profile');
    if (!pageEl || pageEl.classList.contains('arranging')) return;
    pageEl.classList.add('arranging');
    const blocks = LAYOUT_KEYS.map(k => bleed.querySelector(`[data-block="${k}"]`)).filter(Boolean);
    const offs = [];
    for (const node of blocks) {
      const key = node.dataset.block;
      const grip = h('div', { class: 'arrange-grip' });
      node.append(grip);
      grip.onpointerdown = e => {
        e.preventDefault();
        page.layout ||= {};
        const at = page.layout[key] ||= { x: 0, y: 0 };
        const sx = e.clientX, sy = e.clientY, x0 = at.x, y0 = at.y;
        grip.setPointerCapture(e.pointerId);
        node.classList.add('dragging');
        grip.onpointermove = ev => { at.x = Math.round(x0 + ev.clientX - sx); at.y = Math.round(y0 + ev.clientY - sy); node.style.translate = `${at.x}px ${at.y}px`; };
        grip.onpointerup = () => { grip.onpointermove = null; node.classList.remove('dragging'); save(); };
      };
      offs.push(() => grip.remove());
    }
    const bar = h('div', { class: 'arrange-bar' },
      h('button', { class: 'btn ghost sm', onclick: () => { page.layout = {}; save(); placeBlocks(); } }, 'put everything back'),
      h('button', { class: 'btn primary sm', onclick: () => { offs.forEach(f => f()); bar.remove(); pageEl.classList.remove('arranging'); } }, 'done'));
    document.body.append(bar);
    const drop = () => { if (!bleed.isConnected) { bar.remove(); removeEventListener('hashchange', drop); } };
    addEventListener('hashchange', () => setTimeout(drop, 50));
  }

  // ---- 3d stickers stuck anywhere on the page (page.stickers = [{ id, sid, x: % across, y: px down, size, rot }]) ----
  const stickerLayer = h('div', { class: 'page-stickers' });
  function drawPageStickers() {
    const list = Array.isArray(page.stickers) ? page.stickers : [];
    fill(stickerLayer, list.map(st => {
      const node = h('div', { class: 'page-sticker' + (mine ? ' movable' : ''), style: { left: st.x + '%', top: st.y + 'px', width: st.size + 'px', '--rot': (st.rot || 0) + 'deg' } }, stickerNode(st.sid));
      if (mine) node.onpointerdown = e => {
        e.preventDefault();
        const box = stickerLayer.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, x0 = st.x, y0 = st.y;
        node.setPointerCapture(e.pointerId);
        node.classList.add('dragging');
        node.onpointermove = ev => {
          st.x = Math.max(0, Math.min(100, x0 + (ev.clientX - sx) / box.width * 100));
          st.y = Math.max(0, y0 + ev.clientY - sy);
          node.style.left = st.x + '%';
          node.style.top = st.y + 'px';
        };
        node.onpointerup = () => { node.onpointermove = null; node.classList.remove('dragging'); save(); };
      };
      return node;
    }));
  }

  // ---- put it together ----
  const TAB_VIEWS = { about: aboutTab, relationships: relsTab, gallery: galleryTab, moodboard: moodTab, fun: funTab, style: styleTab };
  const panel = h('div', { class: 'profile-panel', dataset: { block: 'panel' } }, TAB_VIEWS[active]());

  el.append(bleed);
  bleed.append(videoBack, h('div', { class: 'page profile' },
    stickerLayer,
    view ? null : h('div', { class: 'profile-top', dataset: { block: 'top' } },
      h('a', { class: 'back-link', href: backHref }, world ? `← ${world.name}` : '← home'),
      mine && h('div', { class: 'profile-top-right' },
        h('button', { class: 'link-btn', onclick: () => openShareModal(char) }, 'share'),
        h('button', { class: 'link-btn danger', onclick: removeOc }, 'delete oc'))),
    h('div', { class: 'profile-hero', dataset: { block: 'hero' } },
      banner,
      h('div', { class: 'profile-id' },
        pfp,
        h('div', { class: 'profile-id-text' },
          h('input', { type: 'text', class: 'profile-name', value: char.name, placeholder: 'their name', maxLength: 80, ...ro, oninput: e => { char.name = e.target.value; save(); } }),
          h('input', { type: 'text', class: 'profile-tagline', value: char.tagline, placeholder: mine ? 'one line about them' : '', maxLength: 140, ...ro, oninput: e => { char.tagline = e.target.value; save(); } }),
          meta))),
    widgetRow,
    h('nav', { class: 'profile-tabs', dataset: { block: 'tabs' } }, tabs.map(([id, label]) =>
      h('a', { class: 'profile-tab' + (id === active ? ' on' : ''), href: `#/${base}/${id}` }, label, tabCounts[id]))),
    panel));

  drawCounts();
  applyPageStyle();
  music.show(char);
  music.setLook({ skin: page.playerSkin || 'normal', visualizer: page.visualizer || 'off', listen: page.beatGlow === 'on' });
  if (mine && arrangeNext === char.id) { arrangeNext = null; requestAnimationFrame(arrangeMode); }
  drawPfp();
  drawMeta();
  if (!char.name) requestAnimationFrame(() => el.querySelector('.profile-name')?.focus());
  return () => { try { (typeof funCleanup === 'function' ? funCleanup : funCleanup?.cleanup)?.(); } catch (err) { console.error(err); } };
}
