// the music player on an oc's page: their playlist (songs uploaded in page style), in a little bar in the corner.
// it lives outside the page itself, so switching tabs on the same oc doesn't restart the song.
// app.js calls music.keepOnly() on every page change, which stops it once you leave that oc.

import { h, fill } from './ui.js';
import { store } from './store.js';

const audio = new Audio();
audio.preload = 'auto';
let char = null;
let order = []; // song ids in the order they'll play (shuffled or not)
let at = 0;
let repeat = 'all'; // 'all' | 'one'
let listOpen = false;

const saved = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const keep = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
audio.volume = Number(saved('ocw-volume', 0.7));
let mini = saved('ocw-player-mini', '') === '1';

const songs = () => char?.playlist || [];
const song = () => songs().find(s => s.id === order[at]) || null;
const fmt = t => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00');

// ---- the bar ----

const bar = h('div', { class: 'player', hidden: true });
const title = h('div', { class: 'player-title' });
const time = h('span', { class: 'player-time' });
const seek = h('input', {
  type: 'range', class: 'player-seek', min: 0, max: 1000, value: 0, title: 'seek',
  oninput: e => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; },
});
const playBtn = h('button', { type: 'button', class: 'player-btn big', title: 'play', onclick: () => toggle() });
const shuffleBtn = h('button', { type: 'button', class: 'player-btn player-shuffle', title: 'shuffle', onclick: () => setShuffle(!char.page.musicShuffle) }, '⇄');
const repeatBtn = h('button', { type: 'button', class: 'player-btn player-repeat', title: 'repeat', onclick: () => { repeat = repeat === 'all' ? 'one' : 'all'; draw(); } });
const volume = h('input', {
  type: 'range', class: 'player-volume', min: 0, max: 1, step: 0.01, value: audio.volume, title: 'volume',
  oninput: e => { audio.volume = Number(e.target.value); keep('ocw-volume', audio.volume); },
});
const list = h('div', { class: 'player-list', hidden: true });

bar.append(
  list,
  h('div', { class: 'player-row' },
    h('button', { type: 'button', class: 'player-btn', title: 'songs', onclick: () => { listOpen = !listOpen; draw(); } }, '♫'),
    h('div', { class: 'player-mid' }, title, h('div', { class: 'player-seek-row' }, seek, time)),
    h('div', { class: 'player-controls' },
      h('button', { type: 'button', class: 'player-btn', title: 'back', onclick: () => back() }, '⏮'),
      playBtn,
      h('button', { type: 'button', class: 'player-btn', title: 'skip', onclick: () => skip() }, '⏭'),
      shuffleBtn, repeatBtn, volume),
    h('button', { type: 'button', class: 'player-btn player-min', title: 'smaller', onclick: () => { mini = !mini; keep('ocw-player-mini', mini ? '1' : ''); draw(); } })));
document.body.append(bar);

// ---- skins + visualizer (page style > music extras). the analyser is only made once someone turns one on ----
const viz = h('canvas', { class: 'player-viz', width: 240, height: 40, hidden: true });
bar.querySelector('.player-mid').append(viz);
let actx = null, analyser = null, levels = null, vizKind = 'off', vizLoop = false;
function ensureAnalyser() {
  if (analyser) return analyser;
  try {
    actx = new AudioContext();
    const src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser();
    analyser.fftSize = 128;
    levels = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    analyser.connect(actx.destination);
  } catch (err) { console.error(err); analyser = null; }
  return analyser;
}
audio.addEventListener('play', () => { if (actx?.state === 'suspended') actx.resume(); });
function level() {
  if (!analyser || audio.paused) return 0;
  analyser.getByteFrequencyData(levels);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += levels[i];
  return sum / (12 * 255);
}
function drawViz() {
  if (vizKind === 'off' || bar.hidden) { vizLoop = false; return; }
  const g = viz.getContext('2d'), w = viz.width, hgt = viz.height;
  g.clearRect(0, 0, w, hgt);
  const color = getComputedStyle(bar).getPropertyValue('--c').trim() || '#ff4fa3';
  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(levels);
    g.fillStyle = color; g.strokeStyle = color;
    if (vizKind === 'bars') {
      const n = 32, bw = w / n;
      for (let i = 0; i < n; i++) { const v = levels[i] / 255; g.fillRect(i * bw + 1, hgt - v * hgt, bw - 2, v * hgt); }
    } else if (vizKind === 'wave') {
      g.lineWidth = 2; g.beginPath();
      for (let i = 0; i < 48; i++) { const v = levels[i] / 255, x = (i / 47) * w, y = hgt / 2 + Math.sin(i * .7 + performance.now() / 160) * v * hgt / 2; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
  }
  bar.style.setProperty('--level', level().toFixed(3));
  requestAnimationFrame(drawViz);
}

function draw() {
  const s = song();
  bar.hidden = !char || !songs().length;
  if (bar.hidden) return;
  bar.style.setProperty('--c', char.color);
  bar.classList.toggle('mini', mini);
  title.textContent = s ? s.title || 'untitled' : '';
  fill(playBtn, audio.paused ? '▶' : '⏸');
  playBtn.title = audio.paused ? 'play' : 'pause';
  shuffleBtn.classList.toggle('on', !!char.page.musicShuffle);
  repeatBtn.classList.toggle('on', repeat === 'one');
  fill(repeatBtn, '↻', repeat === 'one' ? h('sup', {}, '1') : null);
  repeatBtn.title = repeat === 'one' ? 'repeating this song' : 'repeating the playlist';
  bar.querySelector('.player-min').textContent = mini ? '⤢' : '–';
  list.hidden = !listOpen || mini;
  fill(list, songs().map(item => h('button', {
    type: 'button', class: 'player-song' + (item === s ? ' on' : ''),
    onclick: () => { at = order.indexOf(item.id); load(true); },
  }, item === s && !audio.paused ? '♪ ' : '', item.title || 'untitled')));
  drawTime();
  if ('mediaSession' in navigator && s) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: s.title || 'untitled', artist: char.name || 'oc world' });
  }
}

function drawTime() {
  const d = audio.duration;
  if (document.activeElement !== seek) seek.value = d ? Math.round((audio.currentTime / d) * 1000) : 0;
  time.textContent = `${fmt(audio.currentTime)} / ${fmt(d)}`;
}

// ---- playing ----

function makeOrder(keepCurrent) {
  const current = keepCurrent ? order[at] : null;
  order = songs().map(s => s.id);
  if (char.page.musicShuffle) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  if (current && order.includes(current)) {
    order.splice(order.indexOf(current), 1);
    order.unshift(current);
  }
  at = 0;
}

async function load(play) {
  const s = song();
  if (!s) { audio.removeAttribute('src'); audio.load(); draw(); return; }
  const url = await store.imageURL(s.imageId);
  if (song() !== s) return; // skipped again while this one was loading
  if (!url) { draw(); return; }
  if (audio.getAttribute('src') !== url) audio.src = url;
  if (play) await audio.play().catch(() => {}); // the browser may block sound until someone clicks the page
  draw();
}

function toggle() {
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function skip() {
  if (!order.length) return;
  at = (at + 1) % order.length;
  load(true);
}

function back() {
  if (audio.currentTime > 3 || order.length < 2) { audio.currentTime = 0; return; }
  at = (at - 1 + order.length) % order.length;
  load(true);
}

function setShuffle(on) {
  char.page.musicShuffle = on;
  if (store.isMine(char)) store.save('char', char);
  makeOrder(true);
  draw();
}

audio.addEventListener('timeupdate', drawTime);
audio.addEventListener('loadedmetadata', drawTime);
audio.addEventListener('play', draw);
audio.addEventListener('pause', draw);
audio.addEventListener('ended', () => {
  if (repeat === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); } else skip();
});

if ('mediaSession' in navigator) {
  const on = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch {} };
  on('play', () => audio.play().catch(() => {}));
  on('pause', () => audio.pause());
  on('nexttrack', skip);
  on('previoustrack', back);
}

export const music = {
  // how the player looks for this oc: skin + visualizer
  setLook({ skin = 'normal', visualizer = 'off', listen = false } = {}) {
    bar.dataset.skin = skin;
    vizKind = visualizer;
    bar.dataset.viz = visualizer;
    viz.hidden = !['bars', 'wave'].includes(visualizer);
    if (visualizer !== 'off' || listen) ensureAnalyser();
    if (visualizer !== 'off' && !vizLoop) { vizLoop = true; requestAnimationFrame(drawViz); }
  },
  // how loud the song is right now, 0..1 (for the beat glow)
  level,
  // play one song from their playlist
  playSong(id) {
    if (!char) return;
    const i = order.indexOf(id);
    if (i < 0) return;
    at = i;
    load(true);
  },
  get playingId() { return audio.paused ? null : order[at] || null; },

  // an oc's page opened (or redrew). same oc = keep going, new oc = their playlist from the top.
  show(next) {
    if (char && char.id === next.id) {
      char = next;
      this.refresh();
      return;
    }
    this.stop();
    char = next;
    listOpen = false;
    makeOrder(false);
    load(!!char.page.musicAutoplay);
  },

  // the playlist was changed (songs added / removed / moved)
  refresh() {
    if (!char) return;
    const ids = songs().map(s => s.id);
    const playing = order[at];
    if (order.length !== ids.length || !ids.every(id => order.includes(id))) {
      makeOrder(true);
      if (!ids.includes(playing)) { load(!audio.paused); return; }
    } else if (!char.page.musicShuffle) {
      order = ids;
      at = Math.max(0, order.indexOf(playing));
    }
    draw();
  },

  // every page change: stop unless we're still on this oc
  keepOnly(charId) {
    if (char && char.id !== charId) this.stop();
  },

  stop() {
    bar.dataset.skin = 'normal';
    vizKind = 'off';
    viz.hidden = true;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    char = null;
    order = [];
    at = 0;
    draw();
  },
};
