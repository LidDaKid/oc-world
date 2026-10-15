// timeline: the big moments of the oc's life on a line that draws itself in as you scroll.
// zig-zag, straight, or sideways. chapters split it into eras. "world" merges everyone in the world by year.

import { h, fill, uid, toast, openModal, confirmDialog, segmented, swatches } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, sticker, portrait, nameOf, ocById, allOcs } from './kit.js';
import { picNow, basic } from './card-holo.js';
import { EMOJI_STICKERS } from '../diary/sticker-list.js';

export const meta = { id: 'timeline', label: 'timeline', icon: '1f4c5' };

// [id, sticker, color]
const CATS = [
  ['birth', '1f476', '#ffd84d'], ['love', '1f496', '#ff4fa3'], ['heartbreak', '1f494', '#b18cff'], ['loss', '1f940', '#9b8aa8'],
  ['glow up', '2728', '#ff8ac4'], ['battle', '2694-fe0f', '#ff5d6c'], ['move', '1f4e6', '#6ec6ff'], ['school', '1f393', '#7df9d0'],
  ['friendship', '1f91d', '#9be564'], ['secret', '1f92b', '#c77dff'], ['magic', '1fa84', '#b18cff'], ['win', '1f3c6', '#ffd84d'],
  ['dark times', '1f327-fe0f', '#7b6b9e'], ['death', '1f480', '#d0c8d8'], ['travel', '2708-fe0f', '#6ec6ff'], ['other', '2b50', '#ffd84d'],
];
const catOf = id => CATS.find(c => c[0] === id) || CATS[CATS.length - 1];
const COLORS = ['#ff4fa3', '#ff8ac4', '#ff5d6c', '#ff9a3d', '#ffd84d', '#9be564', '#7df9d0', '#6ec6ff', '#b18cff', '#c77dff', '#9b8aa8', '#f6eefb'];
const LAYOUTS = [{ value: 'zigzag', label: 'zig-zag' }, { value: 'line', label: 'straight' }, { value: 'ribbon', label: 'sideways' }];

// the number used to put things in order ("1999", "age 7", "-300", "year 3")
export function yearKey(item) {
  const m = /-?\d+(\.\d+)?/.exec(String(item?.year ?? ''));
  return m ? parseFloat(m[0]) : null;
}

function newItem(kind, fields = {}) {
  const cat = catOf(fields.cat || (kind === 'era' ? 'other' : 'other'));
  return { id: 't_' + uid(), kind, title: '', text: '', when: '', year: '', cat: cat[0], icon: cat[1], color: cat[2], imageId: null, ocs: [], ...fields };
}

function starter(char) {
  const age = parseInt(basic(char, 'age'), 10);
  return newItem('event', { cat: 'birth', icon: '1f476', color: '#ffd84d', title: 'born', when: basic(char, 'birthday'), year: Number.isFinite(age) ? String(2026 - age) : '' });
}

// put every oc's timeline in a world together, in year order
function merged(world) {
  const all = [];
  for (const oc of store.cast(world)) {
    let last = null;
    (oc.fun?.timeline?.items || []).forEach((it, i) => {
      const k = yearKey(it);
      if (k != null) last = k;
      all.push({ it, owner: oc, key: k ?? (last != null ? last + 0.001 * (i + 1) : Infinity), n: all.length });
    });
  }
  return all.sort((a, b) => a.key - b.key || a.n - b.n);
}

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = ctx.data;
  d.items ||= [];
  d.layout ||= 'zigzag';
  d.view ||= 'mine';
  if (mine && !d.items.length && !d.started) { d.items.push(starter(char)); d.started = true; ctx.save(); }
  const worlds = store.worldsOf(char.id);
  if (d.view === 'world' && !worlds.length) d.view = 'mine';

  const tools = h('div', { class: 'tl-tools' });
  const stage = h('div', { class: 'tl-stage' });
  let io = null, raf = 0;
  const save = () => ctx.save();

  function drawTools() {
    const world = worlds.find(w => w.id === d.world) || worlds[0];
    fill(tools,
      worlds.length ? segmented([{ value: 'mine', label: 'mine' }, { value: 'world', label: 'world' }], d.view, v => { d.view = v; save(); draw(); }) : null,
      d.view === 'world' && worlds.length > 1 ? h('select', { class: 'tl-world', onchange: e => { d.world = e.target.value; save(); draw(); } },
        worlds.map(w => h('option', { value: w.id, selected: w === world }, w.name))) : null,
      segmented(LAYOUTS, d.layout, v => { d.layout = v; save(); draw(); }),
      mine && d.view === 'mine' && d.items.filter(i => yearKey(i) != null).length > 1 ? h('button', { class: 'btn sm ghost', onclick: () => {
        // keep things without a year next to whatever came before them
        let last = -Infinity;
        const keyed = d.items.map((it, n) => { const k = yearKey(it); if (k != null) last = k; return { it, k: k ?? last + 1e-6 * (n + 1), n }; });
        d.items = keyed.sort((a, b) => a.k - b.k || a.n - b.n).map(x => x.it);
        save(); draw(); toast('sorted by year');
      } }, '⇅ sort by year') : null);
  }

  function ocFaces(item) {
    const people = (item.ocs || []).map(ocById).filter(Boolean);
    if (!people.length) return null;
    return h('div', { class: 'tl-faces' }, people.slice(0, 8).map(o => h('a', { class: 'tl-face', href: ctx.ocLink(o), title: nameOf(o), style: { '--c': o.color } }, portrait(o, 'tl-face-pic'), h('span', {}, nameOf(o)))));
  }

  function eventEl(item, i, owner, side) {
    const cat = catOf(item.cat);
    const mineView = d.view === 'mine' && mine;
    const date = [item.when, item.year && item.year !== item.when ? item.year : null].filter(Boolean).join(' · ');
    return h('div', { class: `tl-item tl-event ${side}`, style: { '--tc': item.color || cat[2] }, dataset: { id: item.id } },
      h('div', { class: 'tl-node' }, h('div', { class: 'tl-bubble' }, sticker(item.icon || cat[1], 'tl-node-icon'))),
      date ? h('div', { class: 'tl-date' }, date) : null,
      h('article', { class: 'tl-card' },
        owner ? h('a', { class: 'tl-owner', href: ctx.ocLink(owner) + '/fun/timeline', style: { '--c': owner.color } }, portrait(owner, 'xs'), nameOf(owner)) : null,
        h('div', { class: 'tl-card-top' },
          h('span', { class: 'tl-cat' }, sticker(cat[1], 'tl-cat-icon'), cat[0]),
          date ? h('span', { class: 'tl-date-in' }, date) : null),
        h('h3', { class: 'tl-title' }, item.title || cat[0]),
        item.imageId ? h('div', { class: 'tl-pic' }, picNow(store, item.imageId)) : null,
        item.text ? h('p', { class: 'tl-text' }, item.text) : null,
        ocFaces(item),
        mineView ? h('div', { class: 'tl-edit-btns' },
          h('button', { class: 'icon-btn sm', title: 'earlier', disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
          h('button', { class: 'icon-btn sm', title: 'later', disabled: i === d.items.length - 1, onclick: () => move(i, 1) }, '↓'),
          h('button', { class: 'icon-btn sm', title: 'edit', onclick: () => edit(item) }, '✎')) : null));
  }

  function eraEl(item, i, owner, chapter) {
    const mineView = d.view === 'mine' && mine;
    return h('div', { class: 'tl-item tl-era', style: { '--tc': item.color || '#ff4fa3' }, dataset: { id: item.id } },
      h('div', { class: 'tl-era-band' },
        sticker(item.icon || '1f4d6', 'tl-era-icon'),
        h('div', { class: 'tl-era-text' },
          h('div', { class: 'tl-era-kicker' }, [`chapter ${chapter}`, item.year, owner ? nameOf(owner) : null].filter(Boolean).join(' · ')),
          h('div', { class: 'tl-era-title' }, item.title || 'a new era')),
        mineView ? h('div', { class: 'tl-edit-btns' },
          h('button', { class: 'icon-btn sm', title: 'earlier', disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
          h('button', { class: 'icon-btn sm', title: 'later', disabled: i === d.items.length - 1, onclick: () => move(i, 1) }, '↓'),
          h('button', { class: 'icon-btn sm', title: 'edit', onclick: () => edit(item) }, '✎')) : null));
  }

  function move(i, by) {
    const j = i + by;
    if (j < 0 || j >= d.items.length) return;
    [d.items[i], d.items[j]] = [d.items[j], d.items[i]];
    save(); draw();
    requestAnimationFrame(() => stage.querySelector(`[data-id="${d.items[j].id}"]`)?.classList.add('in', 'bump'));
  }

  function draw() {
    drawTools();
    io?.disconnect();
    const world = worlds.find(w => w.id === d.world) || worlds[0];
    const rows = d.view === 'world' && world
      ? merged(world).map(x => ({ item: x.it, owner: x.owner }))
      : d.items.map(item => ({ item, owner: null }));
    const layout = d.layout === 'zigzag' && phone.matches ? 'line' : d.layout;
    const line = h('div', { class: 'tl-line' }, h('div', { class: 'tl-fill' }, h('i', { class: 'tl-tip' })));
    let side = 0, chapter = 0;
    const kids = rows.map(({ item, owner }, i) => item.kind === 'era'
      ? eraEl(item, i, owner, ++chapter)
      : eventEl(item, i, owner, (side++ % 2) ? 'right' : 'left'));
    const track = h('div', { class: 'tl-track' }, line, kids, rows.length ? h('div', { class: 'tl-end' }, sticker('2728', 'tl-end-icon')) : null);
    const wrap = h('div', { class: `tl-wrap layout-${layout}` + (rows.length ? '' : ' empty') }, track);
    fill(stage,
      mine && d.view === 'mine' ? h('div', { class: 'tl-add' },
        h('button', { class: 'btn sm primary', onclick: () => edit(null, 'event') }, '+ moment'),
        h('button', { class: 'btn sm', onclick: () => edit(null, 'era') }, '+ chapter')) : null,
      layout === 'ribbon' && rows.length ? h('div', { class: 'tl-ribbon-btns' },
        h('button', { class: 'icon-btn', title: 'back', onclick: () => wrap.scrollBy({ left: -wrap.clientWidth * 0.8, behavior: 'smooth' }) }, '‹'),
        h('button', { class: 'icon-btn', title: 'next', onclick: () => wrap.scrollBy({ left: wrap.clientWidth * 0.8, behavior: 'smooth' }) }, '›')) : null,
      rows.length ? wrap : h('div', { class: 'tl-empty' }, sticker('1f4c5', 'tl-empty-icon'), h('div', {}, d.view === 'world' ? 'nothing yet' : 'no moments yet')));

    // things slide in as they scroll into view
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    kids.forEach(k => (reduce ? k.classList.add('in') : io.observe(k)));
    if (layout === 'ribbon') wrap.addEventListener('scroll', schedule, { passive: true });
    schedule();
  }

  // the line draws itself down to wherever you've scrolled
  function update() {
    raf = 0;
    const wrap = stage.querySelector('.tl-wrap');
    if (!wrap) return;
    const fillEl = wrap.querySelector('.tl-fill'), lineEl = wrap.querySelector('.tl-line');
    const nodes = wrap.querySelectorAll('.tl-node, .tl-era-band');
    if (wrap.classList.contains('layout-ribbon')) {
      const lr = lineEl.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const reach = wr.left + wr.width * 0.8;
      fillEl.style.width = Math.max(0, Math.min(lr.width, reach - lr.left)) + 'px';
      fillEl.style.height = '';
      nodes.forEach(n => { const r = n.getBoundingClientRect(); n.classList.toggle('lit', r.left + r.width / 2 < reach); });
      return;
    }
    const lr = lineEl.getBoundingClientRect();
    const reach = innerHeight * 0.72;
    fillEl.style.height = Math.max(0, Math.min(lr.height, reach - lr.top)) + 'px';
    fillEl.style.width = '';
    nodes.forEach(n => { const r = n.getBoundingClientRect(); n.classList.toggle('lit', r.top + r.height / 2 < reach); });
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  const phone = matchMedia('(max-width: 700px)');
  const onPhone = () => draw();
  phone.addEventListener('change', onPhone);
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  addEventListener('resize', schedule);

  // ---- adding / editing ----
  function edit(existing, kind = existing?.kind || 'event') {
    const it = existing ? structuredClone(existing) : newItem(kind, kind === 'era' ? { icon: '1f4d6', color: '#c77dff' } : {});
    const uploads = [];
    let saved = false;
    const iconBtn = h('button', { type: 'button', class: 'tl-icon-btn', title: 'icon', onclick: () => { picker.hidden = !picker.hidden; } });
    const drawIcon = () => fill(iconBtn, sticker(it.icon, 'tl-icon-cur'));
    drawIcon();
    const picker = h('div', { class: 'tl-picker', hidden: true });
    const tabs = Object.keys(EMOJI_STICKERS);
    let tab = tabs[0];
    const drawPicker = () => fill(picker,
      h('div', { class: 'tl-picker-tabs' }, tabs.map(t => h('button', { type: 'button', class: 'tl-ptab' + (t === tab ? ' on' : ''), title: t, onclick: () => { tab = t; drawPicker(); } }, sticker(EMOJI_STICKERS[t][0])))),
      h('div', { class: 'tl-picker-grid' }, EMOJI_STICKERS[tab].map(code => h('button', { type: 'button', class: 'tl-pcell' + (code === it.icon ? ' on' : ''), onclick: () => { it.icon = code; drawIcon(); picker.hidden = true; drawPicker(); } }, sticker(code)))));
    drawPicker();
    const colors = swatches(it.color, c => { it.color = c; }, COLORS);

    const catRow = h('div', { class: 'tl-cats' });
    const drawCats = () => fill(catRow, CATS.map(([id, icon, color]) => h('button', {
      type: 'button', class: 'tl-catpick' + (it.cat === id ? ' on' : ''), style: { '--tc': color },
      onclick: () => { it.cat = id; it.icon = icon; it.color = color; drawIcon(); colors.set(color); drawCats(); },
    }, sticker(icon, 'tl-cat-icon'), id)));
    drawCats();

    const picBox = h('div', { class: 'tl-picbox' });
    const drawPic = () => fill(picBox,
      it.imageId ? h('div', { class: 'tl-pic-prev' }, picNow(store, it.imageId)) : null,
      h('button', { type: 'button', class: 'btn sm ghost', onclick: async () => {
        const up = await uploadPic(1200);
        if (!up) return;
        uploads.push(up.imageId);
        it.imageId = up.imageId; drawPic();
      } }, it.imageId ? 'change picture' : '+ picture'),
      it.imageId ? h('button', { type: 'button', class: 'link-btn danger', onclick: () => { it.imageId = null; drawPic(); } }, 'remove') : null);
    drawPic();

    const others = allOcs(char.id);
    const whoRow = h('div', { class: 'tl-who' });
    const drawWho = () => fill(whoRow, others.map(o => h('button', {
      type: 'button', class: 'tl-whopick' + (it.ocs.includes(o.id) ? ' on' : ''), style: { '--c': o.color },
      onclick: () => { it.ocs = it.ocs.includes(o.id) ? it.ocs.filter(x => x !== o.id) : [...it.ocs, o.id]; drawWho(); },
    }, portrait(o, 'xs'), nameOf(o))));
    drawWho();

    const isEra = it.kind === 'era';
    openModal({
      title: existing ? (isEra ? 'edit chapter' : 'edit moment') : (isEra ? 'new chapter' : 'new moment'),
      wide: true,
      body: h('div', { class: 'tl-form' },
        h('div', { class: 'tl-form-top' },
          iconBtn,
          h('label', { class: 'tl-lab grow' }, h('span', {}, isEra ? 'chapter name' : 'what happened'), h('input', { type: 'text', value: it.title, maxLength: 70, 'data-autofocus': true, oninput: e => { it.title = e.target.value; } }))),
        picker,
        h('div', { class: 'tl-grid2' },
          isEra ? null : h('label', { class: 'tl-lab' }, h('span', {}, 'when'), h('input', { type: 'text', value: it.when, maxLength: 30, placeholder: 'age 7', oninput: e => { it.when = e.target.value; } })),
          h('label', { class: 'tl-lab' }, h('span', {}, 'year'), h('input', { type: 'text', value: it.year, maxLength: 16, placeholder: '2019', oninput: e => { it.year = e.target.value; } }))),
        isEra ? null : h('div', { class: 'tl-lab' }, h('span', {}, 'kind of moment'), catRow),
        h('div', { class: 'tl-lab' }, h('span', {}, 'color'), colors),
        isEra ? null : h('label', { class: 'tl-lab' }, h('span', {}, 'the story'), h('textarea', { rows: 3, maxLength: 600, value: it.text, oninput: e => { it.text = e.target.value; } })),
        isEra ? null : h('div', { class: 'tl-lab' }, h('span', {}, 'picture'), picBox),
        isEra || !others.length ? null : h('div', { class: 'tl-lab' }, h('span', {}, 'who was there'), whoRow)),
      actions: [
        existing ? { label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog(isEra ? 'delete this chapter?' : 'delete this moment?', { okLabel: 'delete', danger: true })) return;
          if (existing.imageId) store.deleteImage(existing.imageId);
          d.items = d.items.filter(x => x.id !== existing.id);
          save(); close(); draw();
        } } : null,
        { label: 'nvm', onClick: close => close() },
        { label: existing ? 'save' : 'add', kind: 'primary', onClick: close => {
          saved = true;
          if (existing) {
            if (existing.imageId && existing.imageId !== it.imageId) store.deleteImage(existing.imageId);
            Object.assign(existing, it);
          } else d.items.push(it);
          save(); close(); draw();
          requestAnimationFrame(() => stage.querySelector(`[data-id="${it.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        } },
      ].filter(Boolean),
      onClose: () => uploads.filter(id => !saved || id !== it.imageId).forEach(id => store.deleteImage(id)),
    });
  }

  el.append(appBar(ctx, meta), h('div', { class: 'tl-app' }, tools, stage));
  draw();

  return () => {
    io?.disconnect();
    cancelAnimationFrame(raf);
    document.removeEventListener('scroll', schedule, { capture: true });
    removeEventListener('resize', schedule);
    phone.removeEventListener('change', onPhone);
  };
}
