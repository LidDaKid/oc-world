// year in review: this oc's year as big bold slides (their song, their people, the biggest moment, the mood, a few
// numbers, the word that sums it up). fill them in, then play it: it moves on by itself, tap to skip or go back.
// saved in char.fun.yearreview = { year, theme, song: { title, artist, imageId }, people: [ocId], moment: { title, text, imageId },
//   mood: { word, color }, stats: [{ label, value }], summary: { word, text } }

import { h, fill, swatches, segmented, autosize } from '../ui.js';
import { store } from '../store.js';
import { appBar, portrait, nameOf, worldmates, ocById, uploadPic, pic } from './kit.js';

export const meta = { id: 'yearreview', label: 'year in review', icon: '1f389' };

const THEMES = {
  candy: ['#ff4fa3', '#ffd84d', '#b18cff', '#7df9d0'],
  night: ['#3b1d4a', '#b18cff', '#ff4fa3', '#0f0a14'],
  acid: ['#9be564', '#1a1320', '#ff4fa3', '#ffd84d'],
  ocean: ['#6ec6ff', '#7df9d0', '#1b1838', '#e3c6ff'],
  blood: ['#ff5d6c', '#1a1320', '#ff8ac4', '#2a0a1b'],
};
const SLIDE_MS = 5200;

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.year ??= new Date().getFullYear();
  d.theme ||= 'candy';
  d.song = { title: '', artist: '', imageId: null, ...d.song };
  d.people ||= [];
  d.moment = { title: '', text: '', imageId: null, ...d.moment };
  d.mood = { word: '', color: '#ff4fa3', ...d.mood };
  d.stats ||= [];
  d.summary = { word: '', text: '', ...d.summary };
  let mode = mine && isEmpty() ? 'edit' : 'cover';
  let timer = null, stage = null;
  const body = h('div', { class: 'yir-body' });
  el.append(appBar(ctx, meta, mine ? h('button', { class: 'btn ghost sm', onclick: () => { mode = mode === 'edit' ? 'cover' : 'edit'; draw(); } }, mode === 'edit' ? 'done' : 'edit') : null), body);

  function isEmpty() { return !d.song.title && !d.people.length && !d.moment.title && !d.mood.word && !d.stats.length && !d.summary.word; }
  const colors = () => THEMES[d.theme] || THEMES.candy;

  // ---- the slides ----
  function slides() {
    const [a, b, c, e] = colors();
    const out = [];
    const slide = (key, bg, ...kids) => out.push(h('div', { class: 'yir-slide yir-' + key, style: { '--a': a, '--b': b, '--cc': c, '--e': e, background: bg } },
      h('i', { class: 'yir-blob one' }), h('i', { class: 'yir-blob two' }), h('i', { class: 'yir-ring' }), h('div', { class: 'yir-in' }, ...kids)));
    slide('intro', `linear-gradient(160deg, ${a}, ${c})`,
      h('div', { class: 'yir-kicker' }, nameOf(char)),
      h('div', { class: 'yir-mega' }, String(d.year)),
      h('div', { class: 'yir-big' }, 'in review'),
      h('div', { class: 'yir-face' }, portrait(char, 'yir-pfp')));
    if (d.song.title.trim()) {
      slide('song', `linear-gradient(200deg, ${b}, ${a})`,
        h('div', { class: 'yir-kicker' }, 'song of the year'),
        h('div', { class: 'yir-disc' + (d.song.imageId ? ' has-pic' : '') }, d.song.imageId ? pic(d.song.imageId, 'yir-disc-pic') : null, h('i', { class: 'yir-disc-hole' })),
        h('div', { class: 'yir-big' }, d.song.title),
        d.song.artist.trim() ? h('div', { class: 'yir-mid' }, d.song.artist) : null);
    }
    const ppl = d.people.map(ocById).filter(Boolean);
    if (ppl.length) {
      slide('people', `linear-gradient(150deg, ${c}, ${e})`,
        h('div', { class: 'yir-kicker' }, 'top people'),
        h('ol', { class: 'yir-rank' }, ppl.map((o, i) => h('li', { style: { '--i': i } }, h('span', { class: 'yir-num' }, String(i + 1)), portrait(o, 'md'), h('span', { class: 'yir-rank-name' }, nameOf(o))))));
    }
    if (d.moment.title.trim() || d.moment.imageId) {
      slide('moment', `linear-gradient(180deg, ${e}, ${a})`,
        h('div', { class: 'yir-kicker' }, 'the moment'),
        d.moment.imageId ? h('div', { class: 'yir-polaroid' }, pic(d.moment.imageId)) : null,
        d.moment.title.trim() ? h('div', { class: 'yir-big' }, d.moment.title) : null,
        d.moment.text.trim() ? h('div', { class: 'yir-small' }, d.moment.text) : null);
    }
    if (d.mood.word.trim()) {
      slide('mood', `radial-gradient(circle at 50% 45%, ${d.mood.color}, ${e} 75%)`,
        h('div', { class: 'yir-kicker' }, 'mood of the year'),
        h('div', { class: 'yir-aura', style: { '--m': d.mood.color } }),
        h('div', { class: 'yir-mega yir-word' }, d.mood.word));
    }
    const stats = d.stats.filter(s => s.label?.trim() || s.value?.trim());
    if (stats.length) {
      slide('stats', `linear-gradient(135deg, ${b}, ${c})`,
        h('div', { class: 'yir-kicker' }, 'by the numbers'),
        h('div', { class: 'yir-stats' }, stats.map((s, i) => h('div', { class: 'yir-stat', style: { '--i': i } }, h('div', { class: 'yir-stat-v' }, s.value || '?'), h('div', { class: 'yir-stat-l' }, s.label)))));
    }
    slide('summary', `linear-gradient(160deg, ${a}, ${b} 50%, ${c})`,
      h('div', { class: 'yir-card' },
        h('div', { class: 'yir-card-top' }, portrait(char, 'lg'), h('div', {}, h('div', { class: 'yir-card-name' }, nameOf(char)), h('div', { class: 'yir-card-year' }, String(d.year)))),
        d.summary.word.trim() ? h('div', { class: 'yir-card-word' }, d.summary.word) : null,
        h('div', { class: 'yir-card-grid' },
          d.song.title.trim() ? h('div', {}, h('b', {}, 'song'), d.song.title) : null,
          ppl[0] ? h('div', {}, h('b', {}, 'top person'), nameOf(ppl[0])) : null,
          d.mood.word.trim() ? h('div', {}, h('b', {}, 'mood'), d.mood.word) : null,
          d.moment.title.trim() ? h('div', {}, h('b', {}, 'moment'), d.moment.title) : null),
        d.summary.text.trim() ? h('div', { class: 'yir-card-text' }, d.summary.text) : null));
    return out;
  }

  // ---- play it ----
  function play() {
    stop();
    const list = slides();
    let at = 0, held = false, started = 0, left = SLIDE_MS;
    const bars = h('div', { class: 'yir-bars' }, list.map(() => h('i', {}, h('b'))));
    const frame = h('div', { class: 'yir-frame' });
    stage = h('div', { class: 'yir-stage' }, h('div', { class: 'yir-phone' }, bars, frame,
      h('button', { type: 'button', class: 'yir-close', title: 'close', onclick: () => stop() }, '✕')));
    const show = i => {
      at = Math.max(0, Math.min(list.length - 1, i));
      fill(frame, list[at]);
      [...bars.children].forEach((b, j) => { b.className = j < at ? 'done' : j === at ? 'now' : ''; b.firstChild.style.animationDuration = SLIDE_MS + 'ms'; });
      left = SLIDE_MS;
      tick();
    };
    const tick = () => {
      clearTimeout(timer);
      started = performance.now();
      timer = setTimeout(() => { if (at < list.length - 1) show(at + 1); else bars.lastChild.className = 'done'; }, left);
    };
    // tap = next (or back on the left third), hold = pause
    let downAt = 0;
    frame.onpointerdown = () => { downAt = performance.now(); held = true; clearTimeout(timer); left = Math.max(300, left - (downAt - started)); stage.classList.add('held'); };
    frame.onpointerup = e => {
      if (!held) return;
      held = false;
      stage.classList.remove('held');
      if (performance.now() - downAt > 320) { tick(); return; }
      const r = frame.getBoundingClientRect();
      show(e.clientX - r.left < r.width / 3 ? at - 1 : at + 1);
    };
    stage.onkeydown = e => { if (e.key === 'Escape') stop(); if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); };
    document.body.append(stage);
    stage.tabIndex = -1;
    stage.focus();
    show(0);
  }
  function stop() { clearTimeout(timer); stage?.remove(); stage = null; }

  // ---- the cover (before you press play) ----
  function cover() {
    const list = slides();
    return h('div', { class: 'yir-cover' },
      h('button', { type: 'button', class: 'yir-cover-card', onclick: play, style: { background: list[0].style.background } },
        h('i', { class: 'yir-blob one' }), h('i', { class: 'yir-blob two' }),
        h('div', { class: 'yir-cover-name' }, nameOf(char)),
        h('div', { class: 'yir-cover-year' }, String(d.year)),
        h('div', { class: 'yir-cover-sub' }, 'in review'),
        h('span', { class: 'yir-play' }, '▶')),
      h('div', { class: 'yir-thumbs' }, list.map((s, i) => h('button', { type: 'button', class: 'yir-thumb', onclick: () => { play(); } }, s))));
  }

  // ---- filling it in ----
  function edit() {
    const again = () => draw();
    const line = (obj, key, ph, max = 80) => h('input', { type: 'text', value: obj[key] || '', placeholder: ph, maxLength: max, oninput: e => { obj[key] = e.target.value; save(); } });
    const picBtn = (holder, label) => h('div', { class: 'yir-pic-row' },
      holder.imageId ? h('div', { class: 'yir-thumbpic' }, pic(holder.imageId)) : null,
      h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const got = await uploadPic(1200); if (!got) return; if (holder.imageId) store.deleteImage(holder.imageId); holder.imageId = got.imageId; save(); again(); } }, holder.imageId ? 'change' : label),
      holder.imageId ? h('button', { type: 'button', class: 'link-btn', onclick: () => { store.deleteImage(holder.imageId); holder.imageId = null; save(); again(); } }, 'remove') : null);
    const box = (title, ...kids) => h('div', { class: 'yir-edit-box' }, h('div', { class: 'yir-edit-title' }, title), ...kids);
    const mates = worldmates(char.id);
    return h('div', { class: 'yir-edit' },
      box('the year', h('input', { type: 'number', value: d.year, oninput: e => { d.year = +e.target.value || d.year; save(); } }),
        segmented(Object.keys(THEMES).map(k => ({ value: k, label: k })), d.theme, v => { d.theme = v; save(); })),
      box('song of the year', line(d.song, 'title', 'song'), line(d.song, 'artist', 'artist'), picBtn(d.song, '+ cover')),
      box('top people',
        h('div', { class: 'yir-people' }, mates.map(o => {
          const on = d.people.includes(o.id);
          return h('button', { type: 'button', class: 'yir-person' + (on ? ' on' : ''), style: { '--c': o.color }, onclick: () => {
            d.people = on ? d.people.filter(x => x !== o.id) : [...d.people, o.id].slice(0, 5); save(); again();
          } }, on ? h('span', { class: 'yir-person-n' }, String(d.people.indexOf(o.id) + 1)) : null, portrait(o, 'sm'), nameOf(o));
        })),
        mates.length ? null : h('div', { class: 'yir-none' }, '...')),
      box('the moment', line(d.moment, 'title', 'what happened', 100), autosize(h('textarea', { rows: 2, value: d.moment.text, placeholder: 'more', maxLength: 300, oninput: e => { d.moment.text = e.target.value; save(); } })), picBtn(d.moment, '+ picture')),
      box('mood of the year', line(d.mood, 'word', 'one word', 30), swatches(d.mood.color, c => { d.mood.color = c; save(); })),
      box('by the numbers',
        d.stats.map(s => h('div', { class: 'yir-stat-edit' }, line(s, 'value', 'number', 12), line(s, 'label', 'what it counts', 50),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { d.stats = d.stats.filter(x => x !== s); save(); again(); } }, '✕'))),
        d.stats.length < 4 ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { d.stats.push({ value: '', label: '' }); save(); again(); } }, '+ number') : null),
      box('sum it up', line(d.summary, 'word', 'the word for the year', 30), autosize(h('textarea', { rows: 2, value: d.summary.text, placeholder: 'more', maxLength: 300, oninput: e => { d.summary.text = e.target.value; save(); } }))),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { mode = 'cover'; draw(); play(); } }, '▶ play it'));
  }

  function draw() {
    const btn = el.querySelector('.fun-bar-right .btn');
    if (btn) btn.textContent = mode === 'edit' ? 'done' : 'edit';
    fill(body, mode === 'edit' ? edit() : cover());
  }
  draw();
  return () => stop();
}
