// designing a diary's cover (#/diary/<id>/cover): the material, a picture, the title, stickers, little extras.
// the cover on the left is the real thing: drag stickers + the title around right on it.

import { store } from '../store.js';
import { h, fill, toast, segmented, swatches, pickFile, shrinkImage } from '../ui.js';
import { SIZES, dims, PRESETS, TITLE_STYLES, COVER_FONTS, coverFace, preset, book3d, nameTag } from '../diary/covers.js';
import { itemsLayer, newItem, sizeSlider } from '../diary/items.js';
import { STICKER_TABS, stickerNode, TAPES } from '../diary/stickers.js';
import { PAPERS, PAPER_COLORS, WRITE_FONTS, INKS, fixInks } from './diary.js';
import { nameOf } from '../parts.js';
import { guard, askCode, setCode, padlock, LOCK_STYLES } from '../diary/lock.js';
import { peel } from '../diary/fx.js';

const RIBBONS = ['#d81e5b', '#141114', '#ff8ac4', '#8a3ffc', '#e0323f', '#f6eefb', '#ffd84d', '#2bb38a'];

export function renderCover(el, ctx) {
  return guard(el, ctx.diary, ctx.go, e => coverView(e, ctx), book3d);
}

function coverView(el, { diary, go }) {
  const c = diary.cover;
  let stickerTab = STICKER_TABS[0][0];
  let picked = null;
  const save = () => store.saveDiary(diary);

  const faceBox = h('div', { class: 'cover-edit' });
  const scaler = h('div', { class: 'cover-scaler' }, faceBox);
  const pickBar = h('div', { class: 'cover-pickbar' });
  const stage = h('div', { class: 'cover-stage' }, scaler, pickBar,
    h('button', { class: 'btn primary cv-done', onclick: () => go(`diary/${diary.id}`) }, '✓ done'));
  const panel = h('div', { class: 'cover-panel' });
  el.append(h('div', { class: 'cover-studio' }, stage, panel));

  const layer = itemsLayer({ items: c.items, diary, onChange: save, onPick: it => { picked = it; drawPickBar(); } });

  function drawFace() {
    fill(faceBox, coverFace(diary, layer.el));
    layer.draw();
  }
  const changed = () => { save(); drawFace(); };

  function drawPickBar() {
    const it = picked;
    fill(pickBar, it ? [
      sizeSlider(it, layer, save),
      it.kind === 'photo' ? segmented(['polaroid', 'tape', 'plain', 'sticker'].map(v => ({ value: v, label: v })), it.frame || 'polaroid', v => { it.frame = v; save(); layer.draw(); }) : null,
      h('button', { class: 'btn ghost sm', onclick: () => layer.removeSelected() }, '✕ remove'),
    ] : null);
    pickBar.hidden = !it;
  }

  // ---- the controls ----
  const card = (title, ...body) => h('section', { class: 'cv-card' }, h('h3', {}, title), ...body);
  const toggle = (label, key, after) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: !!c[key], onchange: e => { c[key] = e.target.checked; after?.(); changed(); } }), ' ' + label);

  function drawPanel() {
    const titleItem = () => c.items.find(i => i.kind === 'title');
    const presetGrid = h('div', { class: 'preset-grid' }, PRESETS.map(([id, name, bg]) =>
      h('button', {
        class: 'preset' + (c.preset === id ? ' on' : ''), title: name,
        style: { background: bg || c.color },
        onclick: e => {
          c.preset = id;
          presetGrid.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
          e.currentTarget.classList.add('on');
          solid.hidden = id !== 'solid';
          changed();
        },
      }, h('span', { class: 'preset-name' }, name))));
    const solid = h('div', { hidden: c.preset !== 'solid' }, swatches(c.color, v => { c.color = v; changed(); }));

    const fontRow = h('div', { class: 'font-chips' }, COVER_FONTS.map(f =>
      h('button', {
        class: 'font-chip' + (c.title.font === f.id ? ' on' : ''), style: { fontFamily: f.css },
        onclick: e => { c.title.font = f.id; fontRow.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); changed(); },
      }, 'Aa')));

    const tabs = h('div', { class: 'stk-tabs' });
    const grid = h('div', { class: 'stk-grid' });
    const drawStickers = () => {
      const tab = STICKER_TABS.find(t => t[0] === stickerTab);
      fill(tabs, STICKER_TABS.map(([name, icon]) => h('button', {
        class: 'stk-tab' + (name === stickerTab ? ' on' : ''), title: name,
        onclick: () => { stickerTab = name; drawStickers(); },
      }, h('span', { class: 'stk-tab-icon' }, stickerNode(icon)))));
      fill(grid, tab[2].map(s => h('button', { class: 'stk-cell', onclick: e => stick(s, e.currentTarget) }, stickerNode(s))));
    };
    drawStickers();

    const ocs = store.chars.filter(store.isMine);
    fill(panel,
      card('title',
        h('input', { type: 'text', value: c.title.text, maxLength: 40, oninput: e => { c.title.text = e.target.value; save(); layer.draw(); } }),
        fontRow,
        segmented(TITLE_STYLES.map(v => ({ value: v, label: v })), c.title.style, v => { c.title.style = v; changed(); }),
        h('div', { class: 'row' }, swatches(c.title.color || preset(c.preset)[3].ink || '#ffffff', v => { c.title.color = v; changed(); })),
        h('label', { class: 'check' }, h('input', {
          type: 'checkbox', checked: !!titleItem(),
          onchange: e => {
            if (e.target.checked && !titleItem()) c.items.push(newItem({ kind: 'title', x: Math.round(dims(diary).w / 2), y: Math.round(dims(diary).h * .35) }));
            if (!e.target.checked) c.items.splice(c.items.indexOf(titleItem()), 1);
            changed();
          },
        }), ' show title')),
      card('size', h('div', { class: 'size-picks' }, SIZES.map(sz => h('button', {
        class: 'size-pick' + (dims(diary).id === sz.id ? ' on' : ''), title: sz.id,
        onclick: () => { resize(sz.id); drawPanel(); },
      }, h('i', { style: { width: sz.w / 14 + 'px', height: sz.h / 14 + 'px' } }), h('span', {}, sz.id))))),
      card('cover', presetGrid, solid),
      card('picture',
        h('div', { class: 'row' },
          h('button', { class: 'btn sm', onclick: uploadCover }, c.pic.imageId ? 'change cover picture' : '+ cover picture'),
          c.pic.imageId ? h('button', { class: 'btn ghost sm', onclick: () => { store.deleteImage(c.pic.imageId); c.pic.imageId = null; changed(); drawPanel(); } }, 'remove') : null,
          h('button', { class: 'btn sm', onclick: () => addPhoto() }, '+ photo'),
          h('button', { class: 'btn sm', onclick: () => addPhoto('sticker') }, '+ my own sticker'))),
      card('stickers', tabs, grid),
      card('extras',
        toggle('stitching', 'stitch'),
        toggle('metal corners', 'corners'),
        toggle('elastic band', 'band', () => bandColors.hidden = !c.band),
        bandColors,
        toggle('ribbon bookmark', 'ribbon', () => ribbonColors.hidden = !c.ribbon),
        ribbonColors),
      card('paper',
        segmented(PAPERS.map(p => ({ value: p, label: p })), diary.paper.kind, v => { diary.paper.kind = v; save(); }),
        h('div', { class: 'paper-colors' }, Object.entries(PAPER_COLORS).map(([name, col]) => h('button', {
          class: 'paper-chip' + (diary.paper.color === name ? ' on' : ''), title: name, style: { background: col },
          onclick: e => {
            diary.paper.color = name;
            fixInks(diary, name);
            e.currentTarget.parentNode.querySelectorAll('.on').forEach(x => x.classList.remove('on'));
            e.currentTarget.classList.add('on');
            save();
          },
        }))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: diary.aged, onchange: e => { diary.aged = e.target.checked; changed(); } }), ' 📜 old diary')),
      lockCard(),
      ocs.length ? card('whose diary',
        h('select', { class: 'owner-pick', onchange: e => { diary.charId = e.target.value || null; save(); drawPanel(); } },
          h('option', { value: '' }, '—'),
          ocs.map(o => h('option', { value: o.id, selected: diary.charId === o.id }, nameOf(o)))),
        voiceRow()) : null);
  }

  // the oc's own handwriting: new pages (and the empty ones) use it
  function voiceRow() {
    const owner = diary.charId ? store.char(diary.charId) : null;
    if (!owner) return null;
    const v = diary.voice;
    const apply = () => {
      for (const p of diary.pages) if (!p.text && !p.date) { if (v.font) p.font = v.font; if (v.ink) p.ink = v.ink; }
      save();
      drawSample();
    };
    const sample = h('div', { class: 'voice-sample' });
    const drawSample = () => {
      const f = WRITE_FONTS.find(x => x.id === v.font) || WRITE_FONTS[0];
      fill(sample, nameTag(owner, 'voice-tag'), h('span', { style: { fontFamily: f.css, fontSize: f.size * .9 + 'px', color: v.ink || '#27306b' } }, owner.name || nameOf(owner)));
    };
    drawSample();
    return h('div', { class: 'voice' },
      sample,
      h('select', { class: 'voice-font', onchange: e => { v.font = e.target.value || null; apply(); } },
        h('option', { value: '' }, 'handwriting'),
        WRITE_FONTS.map(f => h('option', { value: f.id, selected: v.font === f.id, style: { fontFamily: f.css } }, f.label))),
      swatches(v.ink || '', ink => { v.ink = ink; apply(); }, INKS));
  }

  // a padlock on the cover
  function lockCard() {
    const L = diary.lock;
    const styles = h('div', { class: 'lock-picks', hidden: !L.on }, LOCK_STYLES.map(st => h('button', {
      type: 'button', class: 'lock-pick' + (L.style === st.id ? ' on' : ''), title: st.label,
      onclick: e => { L.style = st.id; styles.querySelectorAll('.on').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); save(); },
    }, padlock(st.id))));
    return card('lock',
      h('label', { class: 'check' }, h('input', {
        type: 'checkbox', checked: L.on, class: 'lock-toggle',
        onchange: async e => {
          if (e.target.checked) {
            const code = await askCode(diary, { mode: 'set' });
            if (!code) { e.target.checked = false; return; }
            await setCode(diary, code);
            toast('🔒 locked');
          } else {
            L.on = false;
            L.hash = L.salt = null;
          }
          save();
          drawPanel();
        },
      }), ' 🔒 lock with a code'),
      styles,
      L.on ? h('button', {
        class: 'btn ghost sm', onclick: async () => {
          const code = await askCode(diary, { mode: 'set' });
          if (!code) return;
          await setCode(diary, code);
          save();
          toast('🔒 new code');
        },
      }, 'change code') : null);
  }
  const bandColors = h('div', { hidden: !c.band }, swatches(c.bandColor, v => { c.bandColor = v; changed(); }, RIBBONS));
  const ribbonColors = h('div', { hidden: !c.ribbon }, swatches(c.ribbonColor, v => { c.ribbonColor = v; save(); }, RIBBONS));

  // a new size: everything stuck on the cover + pages slides along so it stays where it was
  function resize(id) {
    const a = dims(diary);
    diary.size = id;
    const b = dims(diary);
    for (const it of [...c.items, ...diary.pages.flatMap(p => p.items)]) {
      it.x = Math.round(it.x * b.w / a.w);
      it.y = Math.round(it.y * b.h / a.h);
    }
    changed();
    fit();
  }

  function stick(s, cell) {
    const { w: W, h: H } = dims(diary);
    const item = newItem({
      kind: 'sticker', s,
      x: Math.round(W / 2 + (Math.random() - .5) * 200),
      y: Math.round(H / 2 + (Math.random() - .5) * 300),
      r: Math.round((Math.random() - .5) * (s.startsWith('t:') ? 50 : 24)),
      k: s.startsWith('e:') ? 1 : 1.1,
    });
    layer.add(item);
    peel(cell, layer.node(item.id));
  }

  async function uploadCover() {
    const file = await pickFile('image/*', false);
    if (!file) return;
    try {
      const { blob } = await shrinkImage(file, 1600);
      const old = c.pic.imageId;
      c.pic.imageId = await store.putImage(blob);
      if (old) store.deleteImage(old);
      changed();
      drawPanel();
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }

  async function addPhoto(frame = 'polaroid') {
    const file = await pickFile('image/*', false);
    if (!file) return;
    try {
      const { blob, width, height } = await shrinkImage(file, 1400);
      const tapes = Object.keys(TAPES);
      layer.add(newItem({
        kind: 'photo', imageId: await store.putImage(blob), ar: width / height, frame,
        tape: tapes[Math.floor(Math.random() * tapes.length)], x: Math.round(dims(diary).w / 2), y: Math.round(dims(diary).h * .55), r: Math.round((Math.random() - .5) * 10),
      }));
    } catch (err) {
      console.error(err);
      toast("couldn't read that picture", 'bad');
    }
  }

  function fit() {
    const { w: W, h: H } = dims(diary);
    const s = Math.max(.3, Math.min((stage.clientWidth - 24) / W, (stage.clientHeight - 24) / H, 1.25));
    scaler.style.width = W * s + 'px';
    scaler.style.height = H * s + 'px';
    faceBox.style.transform = `scale(${s})`;
  }

  const onKey = e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') layer.removeSelected();
  };
  document.addEventListener('keydown', onKey);
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  drawFace();
  drawPanel();
  drawPickBar();
  requestAnimationFrame(fit);
  return () => { ro.disconnect(); document.removeEventListener('keydown', onKey); };
}
