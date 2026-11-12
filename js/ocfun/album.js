// their album: the oc's own album / ep. a cd in a jewel case or a record in a sleeve, a tracklist with real songs
// you upload (they really play), and a lyrics booklet you flip through page by page.
// saved in char.fun.album = { title, artist, year, color, format: 'cd' | 'vinyl', cover: { imageId },
//                             tracks: [{ id, title, imageId (the song), lyrics }] }

import { h, fill, uid, toast, confirmDialog, swatches, segmented, openModal, pickFile, autosize } from '../ui.js';
import { store, MAX_SONG } from '../store.js';
import { appBar, dataFor, pic, nameOf } from './kit.js';

export const meta = { id: 'album', label: 'their album', icon: '1f4bf' };

const COLORS = ['#ff4fa3', '#b18cff', '#7df9d0', '#ffd84d', '#ff5d6c', '#6ec6ff', '#1a1320', '#f6eefb'];
const fmt = t => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '');

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'album', {
    title: '', artist: '', year: String(new Date().getFullYear()), color: char.color || '#ff4fa3', format: 'cd', cover: { imageId: null }, tracks: [],
  });
  data.cover ||= { imageId: null };
  data.tracks ||= [];
  let editing = mine && !data.title && !data.tracks.length;

  // ---- sound ----
  const audio = new Audio();
  audio.preload = 'auto';
  let playing = null; // track id
  const durs = {};

  function pausePagePlayer() {
    const btn = document.querySelector('.player:not([hidden]) .player-btn.big');
    if (btn && btn.textContent.includes('⏸')) btn.click();
  }
  async function playTrack(tr) {
    if (!tr?.imageId) return;
    if (playing === tr.id && !audio.paused) { audio.pause(); drawAll(); return; }
    if (playing === tr.id && audio.paused && audio.src) { pausePagePlayer(); audio.play().catch(() => {}); drawAll(); return; }
    const url = await store.imageURL(tr.imageId);
    if (!url) { toast("couldn't find that song", 'bad'); return; }
    playing = tr.id;
    audio.src = url;
    pausePagePlayer();
    await audio.play().catch(() => {});
    drawAll();
  }
  function next() {
    const list = data.tracks.filter(t => t.imageId);
    const i = list.findIndex(t => t.id === playing);
    if (i >= 0 && i < list.length - 1) playTrack(list[i + 1]);
    else { playing = null; drawAll(); }
  }
  audio.addEventListener('ended', next);
  audio.addEventListener('play', () => drawAll());
  audio.addEventListener('pause', () => drawAll());
  const onTime = () => {
    const bar = el.querySelector('.al-progress i');
    if (bar && audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
    const t = el.querySelector('.al-time');
    if (t) t.textContent = audio.duration ? `${fmt(audio.currentTime)} / ${fmt(audio.duration)}` : '';
  };
  audio.addEventListener('timeupdate', onTime);

  // ---- the release ----
  const title = () => data.title.trim() || 'untitled';
  const artist = () => data.artist.trim() || nameOf(char);
  const spinning = () => !!playing && !audio.paused;

  function coverArt(cls) {
    return h('div', { class: 'al-cover ' + (cls || '') },
      data.cover.imageId ? pic(data.cover.imageId, 'al-cover-img') : h('div', { class: 'al-cover-blank' }, h('span', { class: 'al-cover-word' }, title()), h('span', { class: 'al-cover-by' }, artist())));
  }

  function release() {
    const disc = h('div', { class: 'al-disc' + (spinning() ? ' spin' : '') },
      h('div', { class: 'al-disc-label' }, data.cover.imageId ? pic(data.cover.imageId) : null, h('i')));
    if (data.format === 'vinyl') {
      return h('div', { class: 'al-release vinyl' + (playing ? ' out' : '') }, disc, h('div', { class: 'al-sleeve' }, coverArt(), h('div', { class: 'al-sleeve-shine' })));
    }
    return h('div', { class: 'al-release cd' + (playing ? ' out' : '') }, disc,
      h('div', { class: 'al-case' }, h('div', { class: 'al-case-spine' }, h('span', {}, `${artist()} · ${title()}`)), coverArt(), h('div', { class: 'al-case-shine' })));
  }

  function trackRow(tr, i) {
    const on = playing === tr.id;
    return h('div', { class: 'al-track' + (on ? ' on' : '') + (tr.imageId ? '' : ' silent') },
      h('button', { type: 'button', class: 'al-play', disabled: !tr.imageId, title: tr.imageId ? (on && !audio.paused ? 'pause' : 'play') : '', onclick: () => playTrack(tr) },
        on && !audio.paused ? '❚❚' : tr.imageId ? '▶' : '–'),
      h('span', { class: 'al-track-n' }, String(i + 1).padStart(2, '0')),
      h('span', { class: 'al-track-title' }, tr.title.trim() || 'untitled'),
      tr.lyrics?.trim() ? h('button', { type: 'button', class: 'al-mini-btn', onclick: () => openBooklet(i + 1) }, 'lyrics') : null,
      h('span', { class: 'al-track-dur' }, durs[tr.id] ? fmt(durs[tr.id]) : ''));
  }

  function viewSide() {
    const cur = data.tracks.find(t => t.id === playing);
    return h('div', { class: 'al-info' },
      h('div', { class: 'al-kind' }, data.tracks.length > 6 ? 'album' : 'ep'),
      h('h3', { class: 'al-title' }, title()),
      h('div', { class: 'al-artist' }, artist(), data.year ? h('span', { class: 'al-year' }, ' · ' + data.year) : null),
      h('div', { class: 'al-tracks' }, data.tracks.length ? data.tracks.map(trackRow) : h('div', { class: 'al-empty' }, '...')),
      cur ? h('div', { class: 'al-now' }, h('div', { class: 'al-now-title' }, cur.title || 'untitled'), h('div', { class: 'al-progress' }, h('i')), h('div', { class: 'al-time' })) : null,
      h('div', { class: 'al-actions' },
        h('button', { type: 'button', class: 'btn sm', onclick: () => openBooklet(0) }, 'lyrics booklet'),
        playing ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { audio.pause(); audio.removeAttribute('src'); playing = null; drawAll(); } }, 'stop') : null));
  }

  // ---- editing ----
  function editSide() {
    const text = (key, ph, max = 80) => h('input', { type: 'text', value: data[key] || '', placeholder: ph, maxLength: max, oninput: e => { data[key] = e.target.value; save(); drawRelease(); } });
    return h('div', { class: 'al-edit' },
      h('label', { class: 'al-field' }, h('span', {}, 'title'), text('title', 'album title')),
      h('label', { class: 'al-field' }, h('span', {}, 'artist'), text('artist', nameOf(char))),
      h('label', { class: 'al-field' }, h('span', {}, 'year'), text('year', '2026', 12)),
      h('div', { class: 'al-field' }, h('span', {}, 'cover'),
        h('div', { class: 'al-row' },
          h('button', { type: 'button', class: 'btn ghost sm', onclick: changeCover }, data.cover.imageId ? 'change cover' : '+ cover art'),
          data.cover.imageId ? h('button', { type: 'button', class: 'link-btn', onclick: () => { store.deleteImage(data.cover.imageId); data.cover.imageId = null; save(); drawAll(); } }, 'remove') : null)),
      h('div', { class: 'al-field' }, h('span', {}, 'format'), segmented([{ value: 'cd', label: 'cd' }, { value: 'vinyl', label: 'vinyl' }], data.format, v => { data.format = v; save(); drawRelease(); })),
      h('div', { class: 'al-field' }, h('span', {}, 'color'), swatches(data.color, c => { data.color = c; save(); paintColor(); }, COLORS)),
      h('div', { class: 'al-field' }, h('span', {}, 'tracks')),
      h('div', { class: 'al-edit-tracks' }, data.tracks.map((tr, i) => trackEditor(tr, i))),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { data.tracks.push({ id: 'tr_' + uid(), title: '', imageId: null, lyrics: '' }); save(); drawAll(); } }, '+ track'));
  }

  function trackEditor(tr, i) {
    const move = d => { data.tracks.splice(i + d, 0, data.tracks.splice(i, 1)[0]); save(); drawAll(); };
    const lyr = autosize(h('textarea', { class: 'al-lyrics-edit', rows: 3, value: tr.lyrics || '', placeholder: 'lyrics', oninput: e => { tr.lyrics = e.target.value; save(); } }));
    return h('div', { class: 'al-edit-track' },
      h('div', { class: 'al-row' },
        h('span', { class: 'al-track-n' }, String(i + 1).padStart(2, '0')),
        h('input', { type: 'text', value: tr.title, placeholder: 'song title', maxLength: 80, oninput: e => { tr.title = e.target.value; save(); drawRelease(); } }),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => move(-1) }, '↑'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'move down', disabled: i === data.tracks.length - 1, onclick: () => move(1) }, '↓'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'delete', onclick: async () => {
          if ((tr.imageId || tr.lyrics?.trim()) && !await confirmDialog(`delete "${tr.title || 'this track'}"?`, { okLabel: 'delete', danger: true })) return;
          if (tr.imageId) store.deleteImage(tr.imageId);
          if (playing === tr.id) { audio.pause(); playing = null; }
          data.tracks = data.tracks.filter(x => x !== tr);
          save(); drawAll();
        } }, '✕')),
      h('div', { class: 'al-row' },
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => addSong(tr) }, tr.imageId ? 'change song' : '+ song file'),
        tr.imageId ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => playTrack(tr) }, playing === tr.id && !audio.paused ? 'pause' : 'play') : null),
      lyr);
  }

  async function addSong(tr) {
    const file = await pickFile('audio/*');
    if (!file) return;
    if (!file.type.startsWith('audio/') || !audio.canPlayType(file.type)) { toast(`${file.name} isn't a song this browser can play`, 'bad'); return; }
    if (file.size > MAX_SONG) { toast(`${file.name} is too big (${MAX_SONG / 1e6} mb max)`, 'bad'); return; }
    try {
      const old = tr.imageId;
      if (playing === tr.id) { audio.pause(); playing = null; }
      tr.imageId = await store.putImage(file);
      if (!tr.title.trim()) tr.title = file.name.replace(/\.[^.]+$/, '');
      if (old) store.deleteImage(old);
      save();
      drawAll();
    } catch (err) {
      console.error(err);
      toast(`couldn't save ${file.name}`, 'bad');
    }
  }

  async function changeCover() {
    const { uploadPic } = await import('./kit.js');
    const got = await uploadPic(1200, { aspect: 1 });
    if (!got) return;
    if (data.cover.imageId) store.deleteImage(data.cover.imageId);
    data.cover.imageId = got.imageId;
    save();
    drawAll();
  }

  // ---- the lyrics booklet: page 0 = the front, then one page per song, then the back ----
  function openBooklet(start = 0) {
    const pages = [
      { kind: 'front' },
      ...data.tracks.map((tr, i) => ({ kind: 'song', tr, i })),
      { kind: 'back' },
    ];
    let at = Math.min(start, pages.length - 1);
    const sheet = h('div', { class: 'al-page' });
    const count = h('span', { class: 'al-page-n' });
    const prev = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => turn(-1) }, '‹ back');
    const nextBtn = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => turn(1) }, 'next ›');
    const book = h('div', { class: 'al-booklet', style: { '--al': data.color } }, sheet, h('div', { class: 'al-booklet-nav' }, prev, count, nextBtn));
    function drawPage(dir = 0) {
      const p = pages[at];
      sheet.className = 'al-page' + (dir ? (dir > 0 ? ' flip-in-r' : ' flip-in-l') : '');
      if (p.kind === 'front') {
        fill(sheet, h('div', { class: 'al-page-front' }, coverArt('big'), h('div', { class: 'al-page-title' }, title()), h('div', { class: 'al-page-by' }, artist())));
      } else if (p.kind === 'back') {
        fill(sheet, h('div', { class: 'al-page-back' },
          h('ol', {}, data.tracks.map(tr => h('li', {}, tr.title || 'untitled'))),
          h('div', { class: 'al-page-small' }, `${artist()}${data.year ? ' · ' + data.year : ''}`)));
      } else {
        fill(sheet, h('div', { class: 'al-page-song' },
          h('div', { class: 'al-page-num' }, String(p.i + 1).padStart(2, '0')),
          h('h3', {}, p.tr.title || 'untitled'),
          h('div', { class: 'al-page-lyrics' }, (p.tr.lyrics || '').trim() || '...')));
      }
      count.textContent = `${at + 1} / ${pages.length}`;
      prev.disabled = at === 0;
      nextBtn.disabled = at === pages.length - 1;
    }
    function turn(d) {
      const n = at + d;
      if (n < 0 || n >= pages.length) return;
      at = n;
      drawPage(d);
    }
    const onKey = e => { if (e.key === 'ArrowRight') turn(1); else if (e.key === 'ArrowLeft') turn(-1); };
    document.addEventListener('keydown', onKey);
    openModal({ title: 'lyrics booklet', body: book, wide: true, onClose: () => document.removeEventListener('keydown', onKey) });
    drawPage();
  }

  // ---- put together ----
  const releaseBox = h('div', { class: 'al-stage' });
  const side = h('div', { class: 'al-side' });
  const editBtn = mine ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { editing = !editing; drawAll(); } }) : null;
  const wrap = h('div', { class: 'al-wrap' }, releaseBox, side);
  function paintColor() { wrap.style.setProperty('--al', data.color || '#ff4fa3'); }
  function drawRelease() { fill(releaseBox, release()); }
  function drawAll() {
    paintColor();
    drawRelease();
    fill(side, editing && mine ? editSide() : viewSide());
    if (editBtn) editBtn.textContent = editing ? 'done' : 'edit';
    onTime();
  }
  // song lengths for the tracklist
  for (const tr of data.tracks) {
    if (!tr.imageId) continue;
    store.imageURL(tr.imageId).then(url => {
      if (!url) return;
      const a = new Audio();
      a.preload = 'metadata';
      a.onloadedmetadata = () => { durs[tr.id] = a.duration; if (!editing) fill(side, viewSide()); a.removeAttribute('src'); };
      a.src = url;
    });
  }
  el.append(appBar(ctx, meta, editBtn), wrap);
  drawAll();

  return () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  };
}
