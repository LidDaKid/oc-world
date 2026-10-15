// magazine: the oc on a magazine cover. pick a template (2000s teen mag, rock mag, fashion glossy,
// tabloid, scene zine), a cover photo, masthead, issue + price, and cover lines you drag around.
// every issue is kept and they sit on a newsstand rack.

import { h, s, fill, uid, openModal, confirmDialog, swatches, segmented, toast } from '../ui.js';
import { store } from '../store.js';
import { dataFor, pic, sticker, appBar, portrait, nameOf } from './kit.js';
import { addPhotos, dropImage } from './phone-bits.js';

export const meta = { id: 'magazine', label: 'magazine', icon: '1f4f0' };

const first = n => (n || 'oc').split(/\s+/)[0];
export const TEMPLATES = {
  teen: {
    label: 'teen mag', title: 'GLITTER', price: '$3.99',
    lines: n => [
      { kind: 'burst', text: 'free posters inside!', x: 74, y: 26 },
      { kind: 'line', text: `omg!|${first(n)}'s secret crush revealed`, x: 5, y: 34 },
      { kind: 'line', text: 'quiz|are you more emo or scene?', x: 95, y: 50, align: 'r' },
      { kind: 'tag', text: '100 cute looks', x: 5, y: 58 },
      { kind: 'cover', text: n, x: 5, y: 76 },
    ],
  },
  rock: {
    label: 'rock mag', title: 'SCREAM', price: '$5.99',
    lines: n => [
      { kind: 'tag', text: 'the emo issue', x: 5, y: 27 },
      { kind: 'line', text: 'exclusive|on tour + on fire', x: 95, y: 32, align: 'r' },
      { kind: 'line', text: 'the 50 best|breakup songs ever', x: 5, y: 48 },
      { kind: 'cover', text: n, x: 5, y: 74 },
    ],
  },
  glossy: {
    label: 'fashion glossy', title: 'Velvet', price: '$8.99',
    lines: n => [
      { kind: 'line', text: 'the new|dark romance', x: 5, y: 30 },
      { kind: 'line', text: "fall's|best looks", x: 95, y: 44, align: 'r' },
      { kind: 'line', text: 'beauty|black lipstick, reborn', x: 5, y: 58 },
      { kind: 'cover', text: n, x: 5, y: 76 },
    ],
  },
  tabloid: {
    label: 'tabloid', title: 'OMG!', price: '$2.49',
    lines: n => [
      { kind: 'tag', text: 'world exclusive', x: 95, y: 18, align: 'r' },
      { kind: 'cover', text: 'shocker!', x: 5, y: 30 },
      { kind: 'line', text: `${first(n)}|caught sneaking out at midnight`, x: 5, y: 46 },
      { kind: 'burst', text: 'pics inside!', x: 76, y: 66 },
      { kind: 'line', text: 'the truth|about the band breakup', x: 5, y: 78 },
    ],
  },
  zine: {
    label: 'scene zine', title: 'coffin club', price: 'free!',
    lines: n => [
      { kind: 'tag', text: 'diy issue', x: 95, y: 22, align: 'r' },
      { kind: 'line', text: 'inside|sad songs + safety pins', x: 5, y: 40 },
      { kind: 'line', text: 'how to|bleach your bangs', x: 95, y: 56, align: 'r' },
      { kind: 'cover', text: n, x: 5, y: 78 },
    ],
  },
};
const TPL_IDS = Object.keys(TEMPLATES);
const lastOpen = new Map(); // oc id -> the issue that was open, so a redraw lands back on it
const KINDS = [{ value: 'line', label: 'line' }, { value: 'cover', label: 'big' }, { value: 'burst', label: 'burst' }, { value: 'tag', label: 'tag' }];
const LINE_COLORS = ['#ffffff', '#141114', '#ff4fa3', '#ffd84d', '#7df9d0', '#6ec6ff', '#b18cff', '#ff3b3b'];

function newIssue(char, template, n) {
  const t = TEMPLATES[template];
  const now = new Date();
  return {
    id: 'i_' + uid(), template, title: t.title, issueNo: String(n), price: t.price,
    date: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toLowerCase(),
    photo: { ref: char.imageId ? 'pfp' : char.gallery.find(g => g.imageId) ? 'g:' + char.gallery.find(g => g.imageId).id : 'none', imageId: null, zoom: 1, x: 50, y: 30 },
    lines: t.lines(nameOf(char)).map(l => ({ id: uid(), size: 1, color: null, align: 'l', ...l })),
    createdAt: Date.now(),
  };
}

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = dataFor(char, 'magazine', { issues: [] });
  for (const is of d.issues) { is.lines ||= []; is.photo = { ref: 'none', imageId: null, zoom: 1, x: 50, y: 30, ...is.photo }; }
  const save = () => ctx.save();
  let view = 'stand';
  let current = null;
  let picked = null; // the line picked on the cover
  const body = h('div', { class: 'mg-body' });

  const photoIdOf = is => {
    const p = is.photo;
    if (p.ref === 'pfp') return char.imageId;
    if (p.ref?.startsWith('g:')) return char.gallery.find(g => g.id === p.ref.slice(2))?.imageId || null;
    if (p.ref === 'upload') return p.imageId;
    return null;
  };

  // ---- the cover itself ----
  function cover(is, { edit = false, mini = false } = {}) {
    const t = TEMPLATES[is.template] ? is.template : 'teen';
    const pid = photoIdOf(is);
    const photo = h('div', { class: 'mg-photo' },
      pid ? pic(pid, 'mg-photo-img') : h('div', { class: 'mg-photo-none', style: { '--c': char.color } }, sticker('1f987', 'mg-none-stk')));
    const img = photo.querySelector('img');
    if (img) Object.assign(img.style, { objectPosition: `${is.photo.x}% ${is.photo.y}%`, transform: `scale(${is.photo.zoom})`, transformOrigin: `${is.photo.x}% ${is.photo.y}%` });
    const el = h('div', { class: `mg-cover tpl-${t}` + (mini ? ' mini' : '') + (edit ? ' editing' : ''), style: { '--tint': char.color } },
      photo,
      h('div', { class: 'mg-shade' }),
      masthead(is, t),
      h('div', { class: 'mg-issue' }, h('span', {}, `issue #${is.issueNo || '1'}`), h('span', {}, is.date)),
      is.lines.map(l => lineEl(l, is, edit)),
      barcode(is),
      t === 'zine' ? [h('i', { class: 'mg-tape a' }), h('i', { class: 'mg-tape b' }), h('span', { class: 'mg-doodle s1' }, '☆'), h('span', { class: 'mg-doodle s2' }, '♡'), h('span', { class: 'mg-doodle s3' }, 'xoxo')] : null,
      t === 'teen' ? [sticker('2728', 'mg-deco d1'), sticker('1f496', 'mg-deco d2')] : null,
      t === 'tabloid' ? h('div', { class: 'mg-inset' }, portrait(char, 'mg-inset-pic')) : null,
      h('div', { class: 'mg-gloss' }));
    if (edit) panPhoto(el, is);
    return el;
  }

  function masthead(is, t) {
    const text = is.title || ' ';
    if (t === 'zine') {
      // ransom-note letters
      return h('div', { class: 'mg-mast', style: { '--len': Math.max(6, text.length) } }, [...text].map((ch, i) => ch === ' ' ? h('span', { class: 'mg-gap' }) : h('span', { class: 'mg-ransom r' + ((i * 7 + text.length) % 6) }, ch)));
    }
    return h('div', { class: 'mg-mast', style: { '--len': Math.max(4, text.length) } }, h('span', {}, text));
  }

  function lineEl(l, is, edit) {
    const [kick, rest] = l.text.includes('|') ? l.text.split('|') : [null, l.text];
    const box = h('div', {
      class: `mg-line k-${l.kind} a-${l.align || 'l'}` + (l.color ? ' has-c' : '') + (picked === l.id && edit ? ' picked' : ''),
      style: { left: l.x + '%', top: l.y + '%', '--k': l.size || 1, '--lc': l.color || null },
    }, kick != null ? [h('b', { class: 'mg-kick' }, kick), h('span', { class: 'mg-rest' }, rest)] : h('span', { class: 'mg-rest' }, rest));
    if (l.kind === 'burst') box.prepend(h('i', { class: 'mg-burst-bg' }));
    if (edit && mine) dragLine(box, l);
    return box;
  }

  function barcode(is) {
    let seed = [...(is.id + is.issueNo)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const bars = [];
    let x = 2;
    while (x < 58) {
      const w = rnd() < 0.5 ? 1 : rnd() < 0.7 ? 2 : 3;
      bars.push(s('rect', { x, y: 2, width: w * .7, height: x < 4 || x > 55 || Math.abs(x - 30) < 1.5 ? 30 : 26, fill: '#000' }));
      x += w * .7 + (rnd() < 0.5 ? .8 : 1.6);
    }
    const digits = String(Math.floor(rnd() * 9e11) + 1e11);
    return h('div', { class: 'mg-barcode' },
      h('span', { class: 'mg-price' }, is.price),
      s('svg', { viewBox: '0 0 60 33', class: 'mg-bars' }, bars),
      h('span', { class: 'mg-digits' }, `0 ${digits.slice(0, 5)} ${digits.slice(5, 10)} ${digits.slice(10)}`));
  }

  // drag lines around the cover
  function dragLine(box, l) {
    box.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      const coverEl = box.closest('.mg-cover');
      const r = coverEl.getBoundingClientRect();
      const x0 = e.clientX, y0 = e.clientY, lx = l.x, ly = l.y;
      let moved = false;
      box.setPointerCapture(e.pointerId);
      box.classList.add('dragging');
      setPicked(l.id);
      const move = ev => {
        const dx = ((ev.clientX - x0) / r.width) * 100, dy = ((ev.clientY - y0) / r.height) * 100;
        if (Math.abs(dx) + Math.abs(dy) > .5) moved = true;
        l.x = Math.round(Math.max(-5, Math.min(105, lx + dx)) * 10) / 10;
        l.y = Math.round(Math.max(-2, Math.min(98, ly + dy)) * 10) / 10;
        box.style.left = l.x + '%';
        box.style.top = l.y + '%';
      };
      const up = () => {
        box.classList.remove('dragging');
        box.removeEventListener('pointermove', move);
        box.removeEventListener('pointerup', up);
        box.removeEventListener('pointercancel', up);
        if (moved) save();
        panelLines?.querySelector(`[data-line="${l.id}"] input`)?.focus({ preventScroll: true });
      };
      box.addEventListener('pointermove', move);
      box.addEventListener('pointerup', up);
      box.addEventListener('pointercancel', up);
    });
  }
  // drag the photo to move it around inside the cover
  function panPhoto(coverEl, is) {
    if (!mine) return;
    coverEl.addEventListener('pointerdown', e => {
      if (e.target.closest('.mg-line') || !photoIdOf(is)) return;
      e.preventDefault();
      const r = coverEl.getBoundingClientRect();
      const x0 = e.clientX, y0 = e.clientY, px = is.photo.x, py = is.photo.y;
      const img = coverEl.querySelector('.mg-photo-img');
      coverEl.setPointerCapture(e.pointerId);
      coverEl.classList.add('panning');
      setPicked(null);
      const move = ev => {
        const k = 100 / is.photo.zoom;
        is.photo.x = Math.max(0, Math.min(100, px - ((ev.clientX - x0) / r.width) * k));
        is.photo.y = Math.max(0, Math.min(100, py - ((ev.clientY - y0) / r.height) * k));
        if (img) { img.style.objectPosition = `${is.photo.x}% ${is.photo.y}%`; img.style.transformOrigin = `${is.photo.x}% ${is.photo.y}%`; }
      };
      const up = () => { coverEl.classList.remove('panning'); coverEl.removeEventListener('pointermove', move); coverEl.removeEventListener('pointerup', up); save(); };
      coverEl.addEventListener('pointermove', move);
      coverEl.addEventListener('pointerup', up);
    });
  }
  function setPicked(id) {
    picked = id;
    body.querySelectorAll('.mg-line.picked').forEach(x => x.classList.remove('picked'));
    if (!current || !id) { panelLines?.querySelectorAll('.mg-li.on').forEach(x => x.classList.remove('on')); return; }
    const i = current.lines.findIndex(l => l.id === id);
    body.querySelectorAll('.mg-stage .mg-line')[i]?.classList.add('picked');
    panelLines?.querySelectorAll('.mg-li').forEach(x => x.classList.toggle('on', x.dataset.line === id));
  }

  // ---- the newsstand ----
  function stand() {
    const list = [...d.issues].sort((a, b) => b.createdAt - a.createdAt);
    return h('div', { class: 'mg-stand' },
      list.length ? h('div', { class: 'mg-rack' }, list.map((is, i) => h('button', {
        type: 'button', class: 'mg-rack-item', style: { animationDelay: i * 0.06 + 's', '--tilt': ((i % 3) - 1) * 1.5 + 'deg' },
        onclick: () => openIssue(is),
      }, cover(is, { mini: true }), h('span', { class: 'mg-rack-label' }, `#${is.issueNo} · ${TEMPLATES[is.template]?.label || ''}`)))) :
        h('div', { class: 'mg-empty' }, sticker('1f4f0', 'mg-empty-stk'), mine ? h('button', { type: 'button', class: 'btn primary', onclick: () => pickTemplate() }, '+ new issue') : null),
      list.length ? h('div', { class: 'mg-shelf' }) : null);
  }

  function pickTemplate() {
    const m = openModal({
      title: 'new issue', wide: true,
      body: h('div', { class: 'mg-tpl-pick' }, TPL_IDS.map(t => {
        const preview = newIssue(char, t, d.issues.length + 1);
        return h('button', {
          type: 'button', class: 'mg-tpl-card', onclick: () => {
            m.close();
            const is = newIssue(char, t, (Math.max(0, ...d.issues.map(x => Number(x.issueNo) || 0)) + 1));
            d.issues.push(is);
            save();
            openIssue(is);
          },
        }, cover(preview, { mini: true }), h('span', {}, TEMPLATES[t].label));
      })),
    });
  }

  function openIssue(is) {
    current = is;
    lastOpen.set(char.id, is.id);
    picked = null;
    view = 'edit';
    draw();
  }

  // ---- the editor ----
  let panelLines = null;
  function editor() {
    const is = current;
    const stage = h('div', { class: 'mg-stage' });
    const drawCover = () => { fill(stage, cover(is, { edit: true })); setPicked(picked); };
    drawCover();
    if (!mine) {
      panelLines = null;
      return h('div', { class: 'mg-edit view' }, stage);
    }
    const redraw = () => { drawCover(); drawTpls(); };
    const tpls = h('div', { class: 'mg-tpls' });
    const drawTpls = () => fill(tpls, TPL_IDS.map(t => h('button', {
      type: 'button', class: 'mg-tpl' + (is.template === t ? ' on' : ''), title: TEMPLATES[t].label,
      onclick: async () => {
        if (is.template === t) return;
        const fresh = await confirmDialog('use the new look\'s cover lines too?', { title: TEMPLATES[t].label, okLabel: 'yes, new lines' });
        is.template = t;
        if (fresh) { is.lines = TEMPLATES[t].lines(nameOf(char)).map(l => ({ id: uid(), size: 1, color: null, align: 'l', ...l })); is.title = TEMPLATES[t].title; is.price = TEMPLATES[t].price; }
        save();
        draw();
      },
    }, cover({ ...is, template: t }, { mini: true }), h('span', {}, TEMPLATES[t].label))));
    drawTpls();

    const text = (key, label, max = 40) => h('label', { class: 'field mg-f' }, h('span', { class: 'field-label' }, label),
      h('input', { type: 'text', value: is[key], maxLength: max, oninput: e => { is[key] = e.target.value; save(); redraw(); } }));

    // photo
    const zoom = h('input', { type: 'range', min: 1, max: 3, step: .01, value: is.photo.zoom, oninput: e => { is.photo.zoom = Number(e.target.value); save(); const img = stage.querySelector('.mg-photo-img'); if (img) img.style.transform = `scale(${is.photo.zoom})`; } });
    const srcSeg = h('div', { class: 'mg-src' });
    const drawSrc = () => fill(srcSeg,
      h('button', { type: 'button', class: 'mg-src-btn' + (is.photo.ref === 'upload' ? ' on' : ''), onclick: uploadPhoto }, '⬆ upload'),
      char.imageId ? h('button', { type: 'button', class: 'mg-src-btn' + (is.photo.ref === 'pfp' ? ' on' : ''), onclick: () => setPhoto('pfp') }, portrait(char, 'xs'), 'pfp') : null,
      char.gallery.some(g => g.imageId) ? h('button', { type: 'button', class: 'mg-src-btn' + (is.photo.ref?.startsWith('g:') ? ' on' : ''), onclick: pickGallery }, '🖼 gallery') : null);
    drawSrc();
    function setPhoto(ref, imageId = null) {
      const old = is.photo.imageId;
      if (old && old !== imageId) dropImage(old);
      is.photo = { ...is.photo, ref, imageId, zoom: 1, x: 50, y: 30 };
      zoom.value = 1;
      save();
      drawSrc();
      redraw();
    }
    async function uploadPhoto() {
      const [p] = await addPhotos(false, 1600);
      if (p) setPhoto('upload', p.imageId);
    }
    function pickGallery() {
      const m = openModal({
        title: 'gallery', wide: true,
        body: h('div', { class: 'mg-gal' }, char.gallery.filter(g => g.imageId).map(g => h('button', { type: 'button', class: 'mg-gal-pic', onclick: () => { m.close(); setPhoto('g:' + g.id); } }, pic(g.imageId)))),
      });
    }

    // lines
    panelLines = h('div', { class: 'mg-lines' });
    const drawLines = () => fill(panelLines, is.lines.map(l => {
      const row = h('div', { class: 'mg-li' + (picked === l.id ? ' on' : ''), 'data-line': l.id },
        h('div', { class: 'mg-li-top' },
          h('input', { type: 'text', value: l.text, maxLength: 90, onfocus: () => setPicked(l.id), oninput: e => { l.text = e.target.value; save(); drawCover(); } }),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { is.lines = is.lines.filter(x => x !== l); save(); drawLines(); drawCover(); } }, '✕')),
        h('div', { class: 'mg-li-opts' },
          segmented(KINDS, l.kind, v => { l.kind = v; save(); drawCover(); }),
          h('input', { type: 'range', class: 'mg-size', title: 'size', min: .5, max: 2.2, step: .05, value: l.size || 1, oninput: e => { l.size = Number(e.target.value); save(); const box = stage.querySelectorAll('.mg-line')[is.lines.indexOf(l)]; box?.style.setProperty('--k', l.size); } }),
          h('div', { class: 'mg-colors' },
            h('button', { type: 'button', class: 'mg-c auto' + (!l.color ? ' on' : ''), title: 'auto', onclick: e => { l.color = null; save(); drawCover(); markColor(e.currentTarget); } }, 'a'),
            LINE_COLORS.map(c => h('button', { type: 'button', class: 'mg-c' + (l.color === c ? ' on' : ''), style: { background: c }, title: c, onclick: e => { l.color = c; save(); drawCover(); markColor(e.currentTarget); } })))));
      return row;
    }));
    const markColor = btn => { btn.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on')); btn.classList.add('on'); };
    drawLines();
    const addLine = () => {
      const l = { id: uid(), kind: 'line', text: 'new|cover line', x: 8, y: 40 + Math.random() * 20, size: 1, color: null, align: 'l' };
      is.lines.push(l);
      picked = l.id;
      save();
      drawLines();
      drawCover();
      panelLines.querySelector(`[data-line="${l.id}"] input`)?.select();
    };

    return h('div', { class: 'mg-edit' },
      stage,
      h('div', { class: 'mg-panel' },
        h('div', { class: 'mg-sec' }, h('span', { class: 'field-label' }, 'look'), tpls),
        h('div', { class: 'mg-sec mg-grid' },
          text('title', 'masthead', 24),
          text('issueNo', 'issue', 6),
          text('date', 'date', 30),
          text('price', 'price', 10)),
        h('div', { class: 'mg-sec' }, h('span', { class: 'field-label' }, 'cover photo'), srcSeg,
          h('label', { class: 'mg-zoom' }, h('span', {}, 'zoom'), zoom)),
        h('div', { class: 'mg-sec' },
          h('div', { class: 'mg-sec-head' }, h('span', { class: 'field-label' }, 'cover lines'), h('button', { type: 'button', class: 'btn ghost sm', onclick: addLine }, '+ line')),
          panelLines),
        h('div', { class: 'mg-sec mg-danger' },
          h('button', {
            type: 'button', class: 'link-btn danger', onclick: async () => {
              if (!(await confirmDialog(`delete issue #${is.issueNo}?`, { danger: true, okLabel: 'delete' }))) return;
              d.issues = d.issues.filter(x => x !== is);
              dropImage(is.photo.imageId);
              save();
              view = 'stand';
              current = null;
              draw();
            },
          }, 'delete this issue'))));
  }

  function draw() {
    if (view === 'edit' && (!current || !d.issues.includes(current))) view = 'stand';
    fill(body, view === 'edit' ? editor() : stand());
    fill(barRight,
      view === 'edit' ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { view = 'stand'; current = null; lastOpen.delete(char.id); draw(); } }, 'all issues') : null,
      mine ? h('button', { type: 'button', class: 'btn primary sm', onclick: () => pickTemplate() }, '+ new issue') : null);
  }
  const barRight = h('div', { class: 'mg-bar-btns' });
  el.append(appBar(ctx, meta, barRight), body);
  const reopen = d.issues.find(x => x.id === lastOpen.get(char.id));
  if (reopen) { current = reopen; view = 'edit'; }
  draw();
}
