// trading card: a holo collectible card of the oc. tilts with the mouse, the foil catches the light,
// click it to flip it over for their stats. lots of cards per oc, and you can rip open packs.

import { h, fill, uid, toast, confirmDialog, segmented, downloadBlob } from '../ui.js';
import { store } from '../store.js';
import { appBar, uploadPic, sticker, portrait, nameOf } from './kit.js';
import { holoTilt, basic, picNow } from './card-holo.js';
import { TYPES, FRAMES, RARITIES, typeOf, frameOf, rarityOf, rollRarity, guessType, STAT_NAMES, MOVES } from './card-data.js';

export const meta = { id: 'card', label: 'trading card', icon: '1f0cf' };

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const nameSize = name => (name.length > 19 ? ' xlong' : name.length > 13 ? ' long' : '');
const pad = n => String(n ?? '').padStart(3, '0');

export function newCard(char, fields = {}) {
  const names = [...STAT_NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
  const moves = [...MOVES].sort(() => Math.random() - 0.5).slice(0, 2);
  const world = store.worldsOf(char.id)[0];
  return {
    id: 'tc_' + uid(),
    name: '', stage: 'basic', hp: rnd(6, 22) * 10,
    type: guessType(char), frame: 'classic', rarity: 'holo',
    art: { from: 'pfp', galleryId: null, imageId: null, zoom: 1, x: 50, y: 35 },
    stats: names.map(name => ({ name, value: rnd(35, 98) })),
    moves: moves.map(([name, text], i) => ({ name, text, cost: i + 1, dmg: String(i ? rnd(6, 12) * 10 : rnd(2, 5) * 10) })),
    weak: pick(TYPES).id, resist: pick(TYPES).id, retreat: rnd(0, 3),
    flavor: char.tagline || '',
    set: world?.name || 'oc world', num: 1, of: 151,
    createdAt: Date.now(),
    ...fields,
  };
}

function fixCard(c, char) {
  const d = newCard(char);
  for (const k of Object.keys(d)) if (c[k] == null) c[k] = d[k];
  c.art = { ...d.art, ...c.art };
  if (!Array.isArray(c.stats)) c.stats = [];
  if (!Array.isArray(c.moves)) c.moves = [];
  return c;
}

// the picture on the card
function artId(card, char) {
  const a = card.art;
  if (a.from === 'upload') return a.imageId;
  if (a.from === 'gallery') return char.gallery.find(g => g.id === a.galleryId)?.imageId || char.imageId;
  return char.imageId;
}

function artEl(card, char) {
  const id = artId(card, char), a = card.art;
  if (!id) return h('div', { class: 'tc-art-none' }, h('span', {}, (nameOf(char)[0] || '?').toUpperCase()));
  return picNow(store, id, { class: 'tc-art-img', style: { objectPosition: `${a.x}% ${a.y}%`, transformOrigin: `${a.x}% ${a.y}%`, transform: `scale(${a.zoom})` } });
}

function layers() {
  return [h('div', { class: 'tc-shine' }), h('div', { class: 'tc-glitter' }), h('div', { class: 'tc-glare' })];
}

function front(card, char, t) {
  const name = card.name || nameOf(char);
  const strip = [`no. ${pad(card.num)}`, basic(char, 'species'), basic(char, 'height') && `ht ${basic(char, 'height')}`, basic(char, 'age') && `age ${basic(char, 'age')}`].filter(Boolean).join('  ·  ');
  const weak = typeOf(card.weak), resist = typeOf(card.resist);
  return h('div', { class: 'tc-face tc-front' },
    h('div', { class: 'tc-inner' },
      h('div', { class: 'tc-rev-shine' }),
      h('div', { class: 'tc-top' },
        h('span', { class: 'tc-stage' }, card.stage || 'basic'),
        h('span', { class: 'tc-name' + nameSize(name) }, name),
        h('span', { class: 'tc-hp' }, h('small', {}, 'hp'), card.hp),
        sticker(t.icon, 'tc-type')),
      h('div', { class: 'tc-art' }, artEl(card, char), h('div', { class: 'tc-art-shine' }), h('div', { class: 'tc-art-glitter' })),
      h('div', { class: 'tc-strip' }, strip),
      h('div', { class: 'tc-moves m' + Math.min(3, card.moves.length) }, card.moves.slice(0, 3).map(m => h('div', { class: 'tc-move' },
        h('div', { class: 'tc-move-top' },
          h('span', { class: 'tc-cost' }, Array.from({ length: Math.max(0, Math.min(4, m.cost | 0)) }, () => sticker(t.icon, 'tc-cost-icon'))),
          h('b', { class: 'tc-move-name' }, m.name),
          h('span', { class: 'tc-dmg' }, m.dmg)),
        m.text ? h('p', { class: 'tc-move-text' }, m.text) : null))),
      h('div', { class: 'tc-wrr' },
        h('span', {}, h('i', {}, 'weakness'), sticker(weak.icon, 'tc-mini-icon'), '×2'),
        h('span', {}, h('i', {}, 'resistance'), sticker(resist.icon, 'tc-mini-icon'), '−30'),
        h('span', {}, h('i', {}, 'retreat'), Array.from({ length: card.retreat | 0 }, () => h('b', { class: 'tc-dot' })))),
      card.flavor ? h('p', { class: 'tc-flavor' }, card.flavor) : null,
      h('div', { class: 'tc-foot' },
        h('span', { class: 'tc-set' }, h('b', { class: 'tc-set-sym' }, '✦'), card.set),
        h('span', { class: 'tc-num' }, `${pad(card.num)}/${pad(card.of)}`),
        h('span', { class: 'tc-rar' }, rarityOf(card.rarity).sym))),
    layers());
}

function back(card, char, t) {
  const name = card.name || nameOf(char);
  const stats = card.stats.slice(0, 6);
  const avg = stats.length ? stats.reduce((n, s) => n + (+s.value || 0), 0) / stats.length : 50;
  const power = Math.round(avg * (+card.hp || 100) / 10);
  const info = [['age', basic(char, 'age')], ['birthday', basic(char, 'birthday')], ['height', basic(char, 'height')], ['pronouns', basic(char, 'pronouns')], ['species', basic(char, 'species')], ['role', basic(char, 'role')]].filter(x => x[1]).slice(0, 4);
  return h('div', { class: 'tc-face tc-back' },
    h('div', { class: 'tc-inner tc-back-inner' },
      h('div', { class: 'tc-rev-shine' }),
      sticker(t.icon, 'tc-back-mark'),
      h('div', { class: 'tc-back-head' },
        portrait(char, 'tc-back-pfp'),
        h('div', { class: 'tc-back-id' }, h('div', { class: 'tc-name' + nameSize(name) }, name), h('div', { class: 'tc-back-sub' }, `${t.label} type · ${rarityOf(card.rarity).label}`)),
        sticker(t.icon, 'tc-type')),
      h('div', { class: 'tc-power' }, h('span', {}, 'power level'), h('b', {}, power.toLocaleString())),
      h('div', { class: 'tc-stats' }, stats.map((s, i) => h('div', { class: 'tc-stat', style: { '--i': i } },
        h('span', { class: 'tc-stat-name' }, s.name),
        h('div', { class: 'tc-bar' }, h('i', { style: { '--v': Math.max(0, Math.min(100, +s.value || 0)) + '%' } })),
        h('b', { class: 'tc-stat-val' }, s.value)))),
      info.length ? h('div', { class: 'tc-info' }, info.map(([k, v]) => h('div', {}, h('i', {}, k), h('span', {}, v)))) : null,
      char.tags.length ? h('div', { class: 'tc-tags' }, char.tags.slice(0, 4).map(x => h('span', {}, x))) : null,
      char.tagline ? h('p', { class: 'tc-back-quote' }, `“${char.tagline}”`) : null,
      h('div', { class: 'tc-foot' },
        h('span', { class: 'tc-set' }, h('b', { class: 'tc-set-sym' }, '✦'), card.set),
        h('span', { class: 'tc-num' }, `${pad(card.num)}/${pad(card.of)}`),
        h('span', { class: 'tc-rar' }, rarityOf(card.rarity).sym))),
    layers());
}

// the whole 3d card. scene.draw() redraws it, scene.flip() turns it over
export function cardScene(card, char, { mini = false, tilt = !mini } = {}) {
  const flip = h('div', { class: 'tc-flip' });
  const scene = h('div', { class: 'tc-scene' + (mini ? ' mini' : '') }, h('div', { class: 'tc-tilt' }, flip));
  let flipped = false, stop = null;
  const draw = () => {
    const f = frameOf(card.frame), t = typeOf(card.type);
    flip.className = `tc-flip frame-${f.id} rar-${card.rarity}` + (flipped ? ' flipped' : '');
    const st = flip.style;
    [['--b1', f.b[0]], ['--b2', f.b[1]], ['--b3', f.b[2]], ['--p1', f.p[0]], ['--p2', f.p[1]], ['--ink', f.ink], ['--edge', f.edge], ['--box', f.box], ['--t', t.color], ['--c', char.color]]
      .forEach(([k, v]) => st.setProperty(k, v));
    st.setProperty('--name-font', `'${f.font}'`);
    fill(flip, front(card, char, t), mini ? null : back(card, char, t));
  };
  scene.draw = draw;
  scene.flip = (to = !flipped) => { flipped = to; flip.classList.toggle('flipped', flipped); };
  scene.stop = () => stop?.();
  draw();
  if (tilt) stop = holoTilt(scene, { max: 15 });
  return scene;
}

export function render(el, ctx) {
  const { char, mine } = ctx;
  const data = ctx.data;
  data.cards ||= [];
  data.cards.forEach(c => fixCard(c, char));
  if (mine && !data.cards.length) { data.cards.push(newCard(char)); ctx.save(); }
  let cur = data.cards.find(c => c.id === data.cur) || data.cards[0];
  const cleanups = [];
  let scene = null;

  const save = () => { data.cur = cur?.id; ctx.save(); };

  const binder = h('div', { class: 'tc-binder' });
  const stage = h('div', { class: 'tc-stage-box' });
  const editor = h('div', { class: 'tc-editor' });

  function drawBinder() {
    fill(binder,
      data.cards.map(c => {
        const mini = cardScene(c, char, { mini: true });
        return h('button', { class: 'tc-slot' + (c === cur ? ' on' : ''), title: c.name || nameOf(char), onclick: () => { cur = c; save(); drawAll(); } }, mini);
      }),
      mine ? h('button', { class: 'tc-slot tc-slot-new', title: 'new card', onclick: () => {
        cur = newCard(char, { num: data.cards.length + 1 });
        data.cards.push(cur); save(); drawAll();
      } }, '+') : null);
  }

  function drawStage() {
    scene?.stop();
    if (!cur) { fill(stage, h('div', { class: 'fun-soon' }, 'no cards yet')); return; }
    scene = cardScene(cur, char);
    scene.addEventListener('click', () => scene.flip());
    fill(stage,
      h('div', { class: 'tc-spot', style: { '--t': typeOf(cur.type).color } }),
      scene,
      h('div', { class: 'tc-actions' },
        h('button', { class: 'btn sm', onclick: () => scene.flip() }, '↻ flip'),
        mine ? h('button', { class: 'btn sm ghost', onclick: () => {
          const copy = structuredClone(cur);
          copy.id = 'tc_' + uid();
          if (copy.art.from === 'upload') { copy.art.from = 'pfp'; copy.art.imageId = null; }
          copy.num = data.cards.length + 1;
          data.cards.splice(data.cards.indexOf(cur) + 1, 0, copy);
          cur = copy; save(); drawAll(); toast('copied');
        } }, '⧉ copy') : null,
        mine ? h('button', { class: 'btn sm ghost danger-text', onclick: async () => {
          if (!await confirmDialog('throw this card away?', { okLabel: 'bye', danger: true })) return;
          if (cur.art.imageId) store.deleteImage(cur.art.imageId);
          const i = data.cards.indexOf(cur);
          data.cards.splice(i, 1);
          cur = data.cards[Math.max(0, i - 1)] || null;
          save(); drawAll();
        } }, '✕ toss') : null));
  }

  let binderTimer = 0;
  const changed = () => {
    save();
    scene?.draw();
    clearTimeout(binderTimer);
    binderTimer = setTimeout(drawBinder, 250);
  };

  function group(label, ...kids) {
    return h('section', { class: 'tc-group' }, h('h3', { class: 'tc-group-label' }, label), ...kids);
  }
  const input = (value, onInput, attrs = {}) => h('input', { type: 'text', value: value ?? '', ...attrs, oninput: e => { onInput(e.target.value); changed(); } });
  const range = (value, min, max, step, onInput) => h('input', { type: 'range', class: 'tc-range', min, max, step, value, oninput: e => { onInput(+e.target.value); changed(); } });

  function drawEditor() {
    if (!mine || !cur) { fill(editor); editor.hidden = true; return; }
    editor.hidden = false;
    const c = cur;

    // art
    const artBox = h('div');
    const drawArt = () => {
      const a = c.art;
      fill(artBox,
        segmented([{ value: 'pfp', label: 'pfp' }, char.gallery.length ? { value: 'gallery', label: 'gallery' } : null, { value: 'upload', label: 'upload' }].filter(Boolean), a.from, async v => {
          if (v === 'upload') {
            const up = await uploadPic(1200);
            if (!up) { drawArt(); return; }
            if (a.imageId) store.deleteImage(a.imageId);
            a.imageId = up.imageId;
          }
          if (v === 'gallery' && !a.galleryId) a.galleryId = char.gallery[0]?.id || null;
          a.from = v; changed(); drawArt();
        }),
        a.from === 'gallery' ? h('div', { class: 'tc-thumbs' }, char.gallery.map(g =>
          h('button', { class: 'tc-thumb' + (g.id === a.galleryId ? ' on' : ''), onclick: () => { a.galleryId = g.id; changed(); drawArt(); } }, picNow(store, g.imageId)))) : null,
        a.from === 'upload' && a.imageId ? h('button', { class: 'btn sm ghost tc-reup', onclick: async () => {
          const up = await uploadPic(1200);
          if (!up) return;
          store.deleteImage(a.imageId);
          a.imageId = up.imageId; changed();
        } }, 'change picture') : null,
        h('div', { class: 'tc-sliders' },
          h('label', {}, h('span', {}, 'zoom'), range(a.zoom, 1, 3, 0.05, v => { a.zoom = v; })),
          h('label', {}, h('span', {}, '↔'), range(a.x, 0, 100, 1, v => { a.x = v; })),
          h('label', {}, h('span', {}, '↕'), range(a.y, 0, 100, 1, v => { a.y = v; }))));
    };
    drawArt();

    const chips = (list, value, onPick, deco) => {
      const box = h('div', { class: 'tc-chips' });
      const draw = () => fill(box, list.map(x => h('button', {
        class: 'tc-chip' + (x.id === value() ? ' on' : ''), title: x.label,
        onclick: () => { onPick(x.id); changed(); draw(); if (x.id === c.type) drawStage(); },
      }, deco(x))));
      draw();
      return box;
    };

    // stats
    const statBox = h('div', { class: 'tc-rows' });
    const drawStats = () => fill(statBox,
      c.stats.map((s, i) => h('div', { class: 'tc-row tc-stat-row' },
        input(s.name, v => { s.name = v; }, { maxLength: 14, placeholder: 'stat' }),
        range(s.value, 0, 100, 1, v => { s.value = v; statBox.querySelectorAll('.tc-val')[i].textContent = v; }),
        h('b', { class: 'tc-val' }, s.value),
        h('button', { class: 'icon-btn sm', title: 'remove', onclick: () => { c.stats.splice(i, 1); changed(); drawStats(); } }, '✕'))),
      c.stats.length < 6 ? h('button', { class: 'btn sm ghost', onclick: () => {
        const used = new Set(c.stats.map(s => s.name));
        c.stats.push({ name: STAT_NAMES.find(n => !used.has(n)) || 'stat', value: rnd(30, 90) });
        changed(); drawStats();
      } }, '+ stat') : null);
    drawStats();

    // moves
    const moveBox = h('div', { class: 'tc-rows' });
    const drawMoves = () => fill(moveBox,
      c.moves.map((m, i) => h('div', { class: 'tc-move-edit' },
        h('div', { class: 'tc-row' },
          input(m.name, v => { m.name = v; }, { maxLength: 24, placeholder: 'move' }),
          input(m.dmg, v => { m.dmg = v; }, { maxLength: 5, placeholder: 'dmg', class: 'tc-dmg-in' }),
          h('button', { class: 'icon-btn sm', title: 'remove', onclick: () => { c.moves.splice(i, 1); changed(); drawMoves(); } }, '✕')),
        h('div', { class: 'tc-row' },
          h('span', { class: 'tc-mini-label' }, 'cost'),
          segmented([0, 1, 2, 3].map(n => ({ value: n, label: String(n) })), m.cost | 0, v => { m.cost = v; changed(); })),
        h('textarea', { rows: 2, maxLength: 110, placeholder: 'what it does', value: m.text || '', oninput: e => { m.text = e.target.value; changed(); } }))),
      c.moves.length < 3 ? h('button', { class: 'btn sm ghost', onclick: () => {
        const [name, text] = pick(MOVES);
        c.moves.push({ name, text, cost: 1, dmg: '40' }); changed(); drawMoves();
      } }, '+ move') : null);
    drawMoves();

    const typeSelect = (value, onPick) => h('select', { class: 'tc-select', onchange: e => { onPick(e.target.value); changed(); } },
      TYPES.map(t => h('option', { value: t.id, selected: t.id === value }, t.label)));

    fill(editor,
      group('art', artBox),
      group('frame', chips(FRAMES, () => c.frame, v => { c.frame = v; }, f => [h('i', { class: 'tc-chip-swatch', style: { background: `linear-gradient(135deg, ${f.b[0]}, ${f.b[1]} 50%, ${f.p[0]})` } }), f.label])),
      group('rarity', chips(RARITIES, () => c.rarity, v => { c.rarity = v; }, r => [h('i', { class: 'tc-chip-sym' }, r.sym), r.label])),
      group('type', chips(TYPES, () => c.type, v => { c.type = v; }, t => [sticker(t.icon, 'tc-chip-icon'), t.label])),
      group('card',
        h('div', { class: 'tc-grid2' },
          h('label', { class: 'tc-lab' }, h('span', {}, 'name'), input(c.name, v => { c.name = v; }, { maxLength: 24, placeholder: nameOf(char) })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'stage'), input(c.stage, v => { c.stage = v; }, { maxLength: 12 })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'hp'), input(c.hp, v => { c.hp = v.replace(/[^\d]/g, '').slice(0, 4); }, { inputMode: 'numeric', maxLength: 4 })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'retreat'), segmented([0, 1, 2, 3, 4].map(n => ({ value: n, label: String(n) })), c.retreat | 0, v => { c.retreat = v; changed(); })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'weakness'), typeSelect(c.weak, v => { c.weak = v; })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'resistance'), typeSelect(c.resist, v => { c.resist = v; })))),
      group('stats', statBox),
      group('moves', moveBox),
      group('flavor text', h('textarea', { rows: 2, maxLength: 120, value: c.flavor, oninput: e => { c.flavor = e.target.value; changed(); } })),
      group('set',
        h('div', { class: 'tc-grid3' },
          h('label', { class: 'tc-lab' }, h('span', {}, 'set name'), input(c.set, v => { c.set = v; }, { maxLength: 22 })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'no.'), input(c.num, v => { c.num = v.replace(/[^\d]/g, '').slice(0, 3); }, { inputMode: 'numeric' })),
          h('label', { class: 'tc-lab' }, h('span', {}, 'of'), input(c.of, v => { c.of = v.replace(/[^\d]/g, '').slice(0, 3); }, { inputMode: 'numeric' })))));
  }

  function drawAll() {
    drawBinder();
    drawStage();
    drawEditor();
  }

  // ---- packs ----
  function openPack() {
    const rarity = rollRarity();
    const card = newCard(char, { rarity, frame: pick(FRAMES).id, num: data.cards.length + 1 });
    if (char.gallery.length && Math.random() < 0.5) card.art = { ...card.art, from: 'gallery', galleryId: pick(char.gallery).id };
    let revealScene = null;
    const close = () => { revealScene?.stop(); wrap.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } };
    const reveal = h('div', { class: 'tc-reveal' });
    const pack = h('button', { class: 'tc-pack', style: { '--c': char.color }, title: 'rip it', onclick: () => {
      if (pack.classList.contains('torn')) return;
      pack.classList.add('torn');
      setTimeout(() => {
        revealScene = cardScene(card, char);
        revealScene.addEventListener('click', () => revealScene.flip());
        const big = ['holo', 'ultra', 'secret'].includes(rarity);
        fill(reveal,
          h('div', { class: 'tc-rays' + (big ? ' big' : '') + ` r-${rarity}` }),
          h('div', { class: 'tc-pop' }, Array.from({ length: big ? 26 : 12 }, (_, i) => {
            const a = (i / (big ? 26 : 12)) * Math.PI * 2 + Math.random() * 0.4, d = 140 + Math.random() * 160;
            const s = sticker(pick(['2728', '2b50', '1f496', '1f31f', '1f5a4']), 'tc-pop-stk');
            s.style.cssText = `--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px;--d:${(Math.random() * 0.25).toFixed(2)}s`;
            return s;
          })),
          revealScene,
          h('div', { class: 'tc-reveal-label r-' + rarity }, rarityOf(rarity).label),
          h('div', { class: 'tc-reveal-btns' },
            h('button', { class: 'btn ghost', onclick: close }, 'nah'),
            h('button', { class: 'btn primary', onclick: () => { data.cards.push(card); cur = card; save(); drawAll(); close(); toast('added to the binder'); } }, 'keep it')));
        reveal.classList.add('on');
      }, 700);
    } },
      h('div', { class: 'tc-pack-top' }, h('i'), h('i')),
      h('div', { class: 'tc-pack-body' },
        h('div', { class: 'tc-pack-logo' }, 'oc world'),
        portrait(char, 'tc-pack-pfp'),
        h('div', { class: 'tc-pack-name' }, nameOf(char)),
        h('div', { class: 'tc-pack-set' }, card.set)),
      h('div', { class: 'tc-pack-foil' }));
    const wrap = h('div', { class: 'tc-pack-wrap', onpointerdown: e => { if (e.target === wrap) close(); } },
      h('button', { class: 'icon-btn tc-pack-x', title: 'close', onclick: close }, '✕'),
      pack, reveal);
    document.body.append(wrap);
    document.addEventListener('keydown', onKey, true);
    cleanups.push(close);
  }

  async function downloadPNG() {
    if (!cur) return;
    try {
      const { cardPNG } = await import('./card-png.js');
      const blob = await cardPNG(cur, char);
      downloadBlob(blob, `${(cur.name || nameOf(char)).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'card'}-card.png`);
      toast('card downloaded');
    } catch (err) {
      console.error(err);
      toast("couldn't make the picture", 'bad');
    }
  }

  el.append(
    appBar(ctx, meta,
      mine ? h('button', { class: 'btn sm primary tc-pack-btn', onclick: openPack }, '✦ open a pack') : null,
      h('button', { class: 'btn sm', onclick: downloadPNG }, '⬇ png')),
    h('div', { class: 'tc-app' + (mine ? '' : ' tc-ro') },
      binder,
      h('div', { class: 'tc-main' }, stage, editor)));
  drawAll();

  return () => { scene?.stop(); cleanups.forEach(fn => fn()); clearTimeout(binderTimer); };
}
