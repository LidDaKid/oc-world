// computer apps: music player (plays the oc's real playlist through the site's player bar, with a visualizer),
// games (minesweeper + solitaire on the early 2000s look, 2048 + a word guess on the modern one) and settings.
// see the plug-in notes at the top of computer.js
//
// saved on the computer's data:
//   songs   [{ id, title, artist }]   songs typed in (they "play" without sound)
//   games   { mines: best seconds, sol: wins, g2048: best score, words: { played, won, streak } }

import { h, s, fill, uid, openModal, swatches, segmented, toast } from '../ui.js';
import { pic, sticker, nameOf, uploadPic } from './kit.js';
import { dropImage } from './phone-bits.js';
import { WALLS, SCHEMES, CURSORS, LOOKS, menuBar, tbtn, ICO } from './computer-bits.js';

export const DEF = { songs: [], games: { mines: 0, sol: 0, g2048: 0, words: { played: 0, won: 0, streak: 0 } } };

export const APPS = {
  music: { label: 'music player', labelNow: 'music', icon: '1f3b5', w: 360, h: 420, minW: 260, minH: 260, render: music, title: (p, api) => (api.look === 'y2k' ? 'ocamp' : 'music') },
  games: { label: 'games', icon: '1f3ae', w: 420, h: 300, render: games },
  mines: { label: 'minesweeper', icon: '1f4a3', w: 250, h: 330, minW: 220, minH: 280, hidden: true, only: 'y2k', render: mines },
  solitaire: { label: 'solitaire', icon: '1f0cf', w: 560, h: 440, minW: 300, minH: 300, hidden: true, only: 'y2k', render: solitaire },
  g2048: { label: '2048', icon: '1f522', w: 360, h: 470, minW: 260, minH: 380, hidden: true, only: 'modern', render: g2048 },
  words: { label: 'wordie', icon: '1f520', w: 360, h: 500, minW: 260, minH: 400, hidden: true, only: 'modern', render: words },
  settings: { label: 'control panel', labelNow: 'settings', icon: '2699-fe0f', w: 520, h: 440, minW: 280, render: settings, title: (p, api) => (api.look === 'y2k' ? 'display properties' : 'settings') },
};
const GAMES = { y2k: ['mines', 'solitaire'], modern: ['g2048', 'words'] };
const games2 = api => { api.d.games = { ...structuredClone(DEF.games), ...api.d.games }; return api.d.games; };

// ---------------------------------------------------------------- music
const playerBar = () => { const b = document.querySelector('.player'); return b && !b.hidden ? b : null; };
function playerState() {
  const bar = playerBar();
  if (!bar) return null;
  return { title: bar.querySelector('.player-title')?.textContent || '', playing: bar.querySelector('.player-btn.big')?.title === 'pause', seek: Number(bar.querySelector('.player-seek')?.value || 0) / 1000, time: bar.querySelector('.player-time')?.textContent || '' };
}
let fake = { id: null, playing: false, at: 0 }; // a typed-in song "playing"

function music(win, api) {
  const { d, mine, look, char } = api;
  const songs = () => [...char.playlist.map((sg, i) => ({ id: sg.id, title: sg.title || 'untitled', artist: nameOf(char), real: true, index: i })), ...(d.songs || []).map(sg => ({ ...sg, real: false }))];
  let picked = win.picked || null;
  const current = () => {
    const st = playerState(), list = songs();
    const real = st && list.find(sg => sg.real && sg.title === st.title);
    if (real && st.playing) return { song: real, playing: true, seek: st.seek, time: st.time };
    if (fake.playing) { const f = list.find(sg => sg.id === fake.id); if (f) return { song: f, playing: true, seek: fake.at, time: clock(fake.at * 200) }; }
    const sg = list.find(x => x.id === picked) || real || list[0] || null;
    return { song: sg, playing: false, seek: real && sg === real ? st.seek : 0, time: real && sg === real ? st.time : '0:00' };
  };
  const play = sg => {
    if (!sg) return;
    picked = win.picked = sg.id;
    if (sg.real) {
      fake.playing = false;
      const st = playerState();
      if (st && st.title === sg.title) { if (!st.playing) playerBar().querySelector('.player-btn.big').click(); }
      else document.querySelectorAll('.player .player-song')[sg.index]?.click();
    } else {
      const st = playerState();
      if (st?.playing) playerBar().querySelector('.player-btn.big').click();
      fake = { id: sg.id, playing: true, at: 0 };
    }
    tick();
  };
  const pause = () => { const st = playerState(); if (st?.playing) playerBar().querySelector('.player-btn.big').click(); fake.playing = false; tick(); };
  const stop = () => { pause(); fake.at = 0; const seek = document.querySelector('.player .player-seek'); if (seek && playerState()) { seek.value = 0; seek.dispatchEvent(new Event('input')); } tick(); };
  const step = k => { const list = songs(); if (!list.length) return; const i = list.findIndex(x => x.id === current().song?.id); play(list[(i + k + list.length) % list.length]); };
  const toggle = () => { const c = current(); if (c.playing) pause(); else play(c.song); };
  async function addSong() {
    const t = h('input', { type: 'text', placeholder: 'song', maxLength: 80, 'data-autofocus': '' });
    const a = h('input', { type: 'text', placeholder: 'artist', maxLength: 80 });
    openModal({
      title: 'add a song', body: h('div', { class: 'cpu-add' }, t, a),
      actions: [{ label: 'add', kind: 'primary', onClick: close => { if (!t.value.trim()) return t.focus(); d.songs.push({ id: 's_' + uid(), title: t.value.trim(), artist: a.value.trim() }); api.save(); close(); win.redraw(); } }],
    });
  }
  const removeSong = sg => { d.songs = d.songs.filter(x => x.id !== sg.id); if (fake.id === sg.id) fake.playing = false; api.save(); win.redraw(); };

  // the visualizer: bars that bounce while something's playing
  const cv = h('canvas', { class: 'cpu-vis', width: look === 'y2k' ? 152 : 240, height: look === 'y2k' ? 34 : 40 });
  const g = cv.getContext('2d');
  const N = look === 'y2k' ? 19 : 28;
  const bars = new Array(N).fill(0), peaks = new Array(N).fill(0);
  let raf = 0, t = 0;
  const draw = () => {
    if (!cv.isConnected) return;
    const on = current().playing;
    t += 0.08;
    const W = cv.width, H = cv.height, bw = W / N;
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < N; i++) {
      const want = on ? Math.max(0.05, Math.min(1, 0.55 + 0.35 * Math.sin(t * (1.3 + i * 0.17) + i) * Math.cos(t * 0.7 + i * 0.5) + (Math.random() - 0.5) * 0.35 - i / N * 0.25)) : 0;
      bars[i] += (want - bars[i]) * (want > bars[i] ? 0.6 : 0.15);
      peaks[i] = Math.max(peaks[i] - 0.015, bars[i]);
      const bh = bars[i] * H;
      if (look === 'y2k') {
        for (let y = 0; y < bh; y += 2) { const k = y / H; g.fillStyle = k > 0.75 ? '#ff2a1a' : k > 0.5 ? '#ffd21a' : '#1ee81e'; g.fillRect(i * bw + 1, H - y - 1, bw - 2, 1); }
        g.fillStyle = '#c8c8c8'; g.fillRect(i * bw + 1, H - peaks[i] * H - 2, bw - 2, 1);
      } else {
        const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, getAcc()); gr.addColorStop(1, '#ffffff');
        g.fillStyle = gr;
        roundBar(g, i * bw + 1.5, H - bh, bw - 3, bh, 2);
      }
    }
    raf = requestAnimationFrame(draw);
  };
  const getAcc = () => getComputedStyle(win.el).getPropertyValue('--acc').trim() || '#ff4fa3';
  const timeEl = h('b', { class: 'cpu-time' });
  const titleEl = h('span', { class: 'cpu-title' });
  const prog = h('i', { class: 'cpu-prog-fill' });
  const playBtn = h('button', { type: 'button', class: 'cpu-b cpu-play', title: 'play', onclick: toggle });
  const listEl = h('div', { class: 'cpu-list' });
  function tick() {
    if (!win.el.isConnected) return;
    const c = current();
    if (fake.playing) fake.at = Math.min(1, fake.at + 0.0015);
    const list = songs();
    const n = list.findIndex(x => x.id === c.song?.id) + 1;
    titleEl.textContent = c.song ? (look === 'y2k' ? `${n}. ${c.song.artist || nameOf(char)} - ${c.song.title}` : c.song.title) : look === 'y2k' ? 'ocamp' : '';
    timeEl.textContent = c.time || '0:00';
    prog.style.width = ((c.seek || 0) * 100) + '%';
    playBtn.classList.toggle('on', !!c.playing);
    playBtn.title = c.playing ? 'pause' : 'play';
    if (look === 'modern') fill(playBtn, c.playing ? h('i', { class: 'cpu-pause-ico' }) : h('i', { class: 'cpu-play-ico' }));
    listEl.querySelectorAll('.cpu-row').forEach(r => { r.classList.toggle('on', r.dataset.id === c.song?.id); r.classList.toggle('playing', r.dataset.id === c.song?.id && !!c.playing); });
  }
  const iv = setInterval(tick, 300);
  raf = requestAnimationFrame(draw);
  win.cleanup = () => { clearInterval(iv); cancelAnimationFrame(raf); };
  if (win.params.play) { const sg = songs().find(x => x.id === win.params.play); win.params.play = null; if (sg) setTimeout(() => play(sg), 50); }

  const list = songs();
  fill(listEl, list.length ? list.map((sg, i) => h('div', { class: 'cpu-row', 'data-id': sg.id, ondblclick: () => play(sg), onclick: () => { if (api.small() || look === 'modern') play(sg); } },
    h('span', { class: 'cpu-n' }, look === 'y2k' ? `${i + 1}.` : h('span', {}, h('em', {}, i + 1), h('span', { class: 'cpu-eq' }, h('i'), h('i'), h('i')))),
    h('span', { class: 'cpu-row-t' }, look === 'y2k' ? `${sg.artist || nameOf(char)} - ${sg.title}` : h('span', {}, h('b', {}, sg.title), h('small', {}, sg.artist || nameOf(char)))),
    !sg.real && mine ? h('button', { type: 'button', class: 'cpu-x', title: 'remove', onclick: e => { e.stopPropagation(); removeSong(sg); } }, '✕') : h('span', { class: 'cpu-row-tag' }, sg.real ? '♫' : ''))) : h('div', { class: 'cpu-empty' }, mine ? h('button', { type: 'button', class: 'cp-btn', onclick: addSong }, 'add a song') : null));
  tick();
  const btn = (cls, title, fn) => h('button', { type: 'button', class: 'cpu-b ' + cls, title, onclick: fn }, h('i'));
  if (look === 'y2k') {
    return h('div', { class: 'cpu cpu-amp' },
      h('div', { class: 'cpu-main' },
        h('div', { class: 'cpu-lcd' },
          h('div', { class: 'cpu-lcd-l' }, h('span', { class: 'cpu-state' }, '▶'), timeEl, cv),
          h('div', { class: 'cpu-lcd-r' }, h('div', { class: 'cpu-marq' }, titleEl), h('div', { class: 'cpu-kbps' }, h('b', {}, '128'), ' kbps ', h('b', {}, '44'), ' khz ', h('em', {}, 'stereo')))),
        h('div', { class: 'cpu-prog' }, prog),
        h('div', { class: 'cpu-btns' }, btn('cpu-prev', 'previous', () => step(-1)), playBtn, btn('cpu-pause', 'pause', pause), btn('cpu-stop', 'stop', stop), btn('cpu-next', 'next', () => step(1)))),
      h('div', { class: 'cpu-pl' }, h('div', { class: 'cpu-pl-head' }, 'playlist editor'), listEl,
        h('div', { class: 'cpu-pl-foot' }, mine ? h('button', { type: 'button', class: 'cpu-pl-b', onclick: addSong }, '+ add') : null, h('span', {}, `${list.length} songs`))));
  }
  return h('div', { class: 'cpu cpu-mod' },
    h('div', { class: 'cpu-hero' }, api.acctPic('cpu-cover'), h('div', {}, h('small', {}, 'playlist'), h('h3', {}, `${nameOf(char)}'s playlist`), h('span', {}, `${list.length} songs`)),
      mine ? h('button', { type: 'button', class: 'cpu-addb', title: 'add a song', onclick: addSong }, '+') : null),
    listEl,
    h('div', { class: 'cpu-now' },
      h('div', { class: 'cpu-now-t' }, titleEl, cv),
      h('div', { class: 'cpu-btns' }, btn('cpu-prev', 'previous', () => step(-1)), playBtn, btn('cpu-next', 'next', () => step(1))),
      h('div', { class: 'cpu-prog' }, prog), timeEl));
}
const clock = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
function roundBar(g, x, y, w, hh, r) { if (hh <= 0) return; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, [r, r, 0, 0]) : g.rect(x, y, w, hh); g.fill(); }

// ---------------------------------------------------------------- games launcher
function games(win, api) {
  const { look } = api;
  const gs = games2(api);
  const sub = { mines: gs.mines ? `best: ${gs.mines}s` : '', solitaire: gs.sol ? `won ${gs.sol}` : '', g2048: gs.g2048 ? `best: ${gs.g2048}` : '', words: gs.words.played ? `${gs.words.won}/${gs.words.played}` : '' };
  return h('div', { class: 'cpg-hub' }, GAMES[look].map(id => h('button', { type: 'button', class: 'cpg-card', 'data-game': id, ondblclick: () => look === 'y2k' && api.open(id), onclick: () => { if (look === 'modern' || api.small()) api.open(id); } },
    sticker(APPS[id].icon, 'cpg-card-ico'), h('b', {}, APPS[id].label), sub[id] ? h('span', {}, sub[id]) : null)));
}

// ---------------------------------------------------------------- minesweeper
function mines(win, api) {
  const gs = games2(api);
  const R = 9, C = 9, M = 10;
  const st = win.ms ||= { cells: null, over: false, won: false, start: 0, end: 0, flagMode: false };
  const fresh = () => { st.cells = Array.from({ length: R * C }, () => ({ mine: false, n: 0, open: false, flag: false })); st.over = st.won = false; st.start = st.end = 0; };
  if (!st.cells) fresh();
  const near = i => { const r = Math.floor(i / C), c = i % C, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < R && cc >= 0 && cc < C) out.push(rr * C + cc); } return out; };
  const lay = safe => {
    const avoid = new Set([safe, ...near(safe)]);
    let n = 0;
    while (n < M) { const i = Math.floor(Math.random() * R * C); if (avoid.has(i) || st.cells[i].mine) continue; st.cells[i].mine = true; n++; }
    st.cells.forEach((cell, i) => { cell.n = near(i).filter(j => st.cells[j].mine).length; });
    st.start = Date.now();
  };
  const open = i => {
    const cell = st.cells[i];
    if (cell.open || cell.flag || st.over) return;
    if (!st.start) lay(i);
    cell.open = true;
    if (cell.mine) { st.over = true; st.end = Date.now(); cell.boom = true; st.cells.forEach(x => { if (x.mine) x.open = true; }); return; }
    if (!cell.n) near(i).forEach(open);
    if (st.cells.filter(x => !x.open).length === M) {
      st.over = st.won = true; st.end = Date.now();
      const secs = Math.round((st.end - st.start) / 1000);
      if (!gs.mines || secs < gs.mines) { gs.mines = secs; api.save(); }
    }
  };
  const flag = i => { const cell = st.cells[i]; if (cell.open || st.over) return; cell.flag = !cell.flag; };
  const grid = h('div', { class: 'cpg-ms-grid' });
  const left = h('b', { class: 'cpg-lcd' }), time = h('b', { class: 'cpg-lcd' });
  const faceBtn = h('button', { type: 'button', class: 'cpg-face', title: 'new game', onclick: () => { fresh(); draw(); } });
  const flagBtn = h('button', { type: 'button', class: 'cpg-flag', title: 'flag mode', onclick: () => { st.flagMode = !st.flagMode; flagBtn.classList.toggle('on', st.flagMode); } }, h('i'));
  flagBtn.classList.toggle('on', st.flagMode);
  const lcd = n => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
  const drawTime = () => { time.textContent = lcd(st.start ? Math.floor(((st.end || Date.now()) - st.start) / 1000) : 0); };
  function draw() {
    left.textContent = lcd(M - st.cells.filter(x => x.flag).length);
    drawTime();
    faceBtn.textContent = st.won ? '😎' : st.over ? '😵' : '🙂';
    fill(grid, st.cells.map((cell, i) => {
      const b = h('button', { type: 'button', class: 'cpg-cell' + (cell.open ? ' open' : '') + (cell.boom ? ' boom' : '') + (cell.flag ? ' flag' : ''), 'data-i': i, 'data-n': cell.open && !cell.mine ? cell.n : '' },
        cell.open ? (cell.mine ? h('i', { class: 'cpg-mine' }) : cell.n || '') : cell.flag ? h('i', { class: 'cpg-flag-ico' }) : '');
      b.addEventListener('pointerdown', e => { if (e.button === 0 && !cell.open && !st.over) faceBtn.textContent = '😮'; });
      b.addEventListener('click', () => { if (st.flagMode) flag(i); else open(i); draw(); });
      b.addEventListener('contextmenu', e => { e.preventDefault(); flag(i); draw(); });
      return b;
    }));
  }
  draw();
  const iv = setInterval(drawTime, 500);
  win.cleanup = () => clearInterval(iv);
  return h('div', { class: 'cpg-ms' },
    menuBar([['game', [['new', () => { fresh(); draw(); }], null, ['best time: ' + (gs.mines ? gs.mines + 's' : '—'), () => {}, { off: true }], ['exit', () => win.close()]]]]),
    h('div', { class: 'cpg-ms-box' }, h('div', { class: 'cpg-ms-top' }, left, h('div', { class: 'cpg-ms-mid' }, faceBtn, flagBtn), time), grid));
}

// ---------------------------------------------------------------- solitaire (klondike, draw one)
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = c => c.s === 1 || c.s === 2;
function solitaire(win, api) {
  const gs = games2(api);
  const deal = () => {
    const deck = [];
    for (let su = 0; su < 4; su++) for (let r = 0; r < 13; r++) deck.push({ s: su, r, up: false, id: su * 13 + r });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const tab = Array.from({ length: 7 }, (_, i) => { const pile = deck.splice(0, i + 1); pile.at(-1).up = true; return pile; });
    return { stock: deck, waste: [], found: [[], [], [], []], tab, sel: null, won: false, moves: 0 };
  };
  const g = win.sol ||= deal();
  const board = h('div', { class: 'cpg-sol-board' });
  const canFound = (card, f) => (f.length ? f.at(-1).s === card.s && f.at(-1).r === card.r - 1 : card.r === 0);
  const canTab = (card, pile) => (pile.length ? pile.at(-1).up && red(pile.at(-1)) !== red(card) && pile.at(-1).r === card.r + 1 : card.r === 12);
  const pileOf = where => (where.t === 'w' ? g.waste : where.t === 'f' ? g.found[where.i] : g.tab[where.i]);
  const flipTops = () => g.tab.forEach(p => { if (p.length && !p.at(-1).up) p.at(-1).up = true; });
  const checkWin = () => {
    if (g.found.every(f => f.length === 13) && !g.won) { g.won = true; gs.sol++; api.save(); setTimeout(() => cascade(board), 100); }
  };
  // move the picked cards to `to`. true if it worked
  const moveTo = (from, idx, to) => {
    const src = pileOf(from);
    const cards = src.slice(idx);
    if (!cards.length) return false;
    if (to.t === 'f') { if (cards.length !== 1 || !canFound(cards[0], g.found[to.i])) return false; }
    else if (to.t === 't') { if (!canTab(cards[0], g.tab[to.i])) return false; }
    else return false;
    src.splice(idx);
    pileOf(to).push(...cards);
    g.moves++;
    flipTops();
    checkWin();
    return true;
  };
  const autoFound = (from, idx) => { const src = pileOf(from); if (idx !== src.length - 1) return false; for (let i = 0; i < 4; i++) if (moveTo(from, idx, { t: 'f', i })) return true; return false; };
  const pickOrDrop = (where, idx) => {
    if (g.sel) {
      const s0 = g.sel;
      g.sel = null;
      if (!(s0.t === where.t && s0.i === where.i) && moveTo(s0, s0.idx, where)) { draw(); return; }
      if (s0.t === where.t && s0.i === where.i && s0.idx === idx) { draw(); return; }
    }
    const pile = pileOf(where);
    if (idx == null || idx < 0 || !pile[idx]?.up) { draw(); return; }
    g.sel = { ...where, idx };
    draw();
  };
  const cardEl = (card, extra = {}) => card.up
    ? h('div', { class: 'cpg-card' + (red(card) ? ' red' : '') + (extra.sel ? ' sel' : ''), 'data-card': RANKS[card.r] + SUITS[card.s], style: extra.style },
      h('span', { class: 'cpg-c-tl' }, RANKS[card.r], h('br'), SUITS[card.s]), h('span', { class: 'cpg-c-mid' }, card.r > 9 ? RANKS[card.r] : SUITS[card.s]), h('span', { class: 'cpg-c-br' }, RANKS[card.r], h('br'), SUITS[card.s]))
    : h('div', { class: 'cpg-card back', style: extra.style });
  function draw() {
    const selected = (t, i, idx) => g.sel && g.sel.t === t && g.sel.i === i && idx >= g.sel.idx;
    const stock = h('div', { class: 'cpg-slot cpg-stock', onclick: () => {
      g.sel = null;
      if (g.stock.length) { const c = g.stock.pop(); c.up = true; g.waste.push(c); } else { g.stock = g.waste.reverse().map(c => ({ ...c, up: false })); g.waste = []; }
      draw();
    } }, g.stock.length ? cardEl(g.stock.at(-1)) : h('i', { class: 'cpg-recycle' }));
    const wasteTop = g.waste.at(-1);
    const waste = h('div', { class: 'cpg-slot cpg-waste' }, wasteTop ? (() => {
      const el = cardEl(wasteTop, { sel: selected('w', 0, g.waste.length - 1) });
      el.onclick = e => { e.stopPropagation(); pickOrDrop({ t: 'w', i: 0 }, g.waste.length - 1); };
      el.ondblclick = () => { g.sel = null; if (autoFound({ t: 'w', i: 0 }, g.waste.length - 1)) draw(); };
      return el;
    })() : null);
    const found = g.found.map((f, i) => {
      const slot = h('div', { class: 'cpg-slot cpg-found', 'data-f': i, onclick: () => pickOrDrop({ t: 'f', i }, f.length - 1) }, f.length ? cardEl(f.at(-1), { sel: selected('f', i, f.length - 1) }) : h('span', { class: 'cpg-found-mark' }, SUITS[i]));
      return slot;
    });
    const tabs = g.tab.map((pile, i) => h('div', { class: 'cpg-pile', 'data-t': i, onclick: e => { if (e.target === e.currentTarget) pickOrDrop({ t: 't', i }, pile.length - 1); } },
      pile.length ? pile.map((card, idx) => {
        const el = cardEl(card, { sel: selected('t', i, idx), style: { '--k': idx } });
        el.onclick = e => { e.stopPropagation(); pickOrDrop({ t: 't', i }, idx); };
        el.ondblclick = () => { g.sel = null; if (autoFound({ t: 't', i }, idx)) draw(); };
        return el;
      }) : h('div', { class: 'cpg-slot empty', onclick: () => pickOrDrop({ t: 't', i }, -1) })));
    fill(board, h('div', { class: 'cpg-sol-top' }, stock, waste, h('span'), ...found), h('div', { class: 'cpg-sol-tab' }, tabs));
  }
  draw();
  return h('div', { class: 'cpg-sol' },
    menuBar([['game', [['deal', () => { win.sol = deal(); win.redraw(); }], null, [`games won: ${gs.sol}`, () => {}, { off: true }], ['exit', () => win.close()]]]]),
    board,
    h('div', { class: 'cp-status' }, `moves: ${g.moves}`));
}
// the bouncing cards when you win
function cascade(board) {
  const cv = h('canvas', { class: 'cpg-cascade', width: board.clientWidth, height: board.clientHeight });
  board.append(cv);
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, cw = Math.max(28, Math.min(60, W / 9)), ch = cw * 1.4;
  let k = 0, card = null, frames = 0;
  const next = () => { const s2 = k % 4, r = 12 - Math.floor(k / 4) % 13; k++; return { x: W - cw * (1 + (s2 % 4) * 1.15) - 4, y: 6, vx: -(2 + Math.random() * 4) * (Math.random() < 0.5 ? 1 : -1), vy: -Math.random() * 3, s: s2, r }; };
  const loop = () => {
    if (!cv.isConnected || frames++ > 1400) { cv.remove(); return; }
    if (!card || card.x < -cw || card.x > W) card = next();
    card.vy += 0.5; card.x += card.vx; card.y += card.vy;
    if (card.y + ch > H) { card.y = H - ch; card.vy *= -0.78; }
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1;
    g.fillRect(card.x, card.y, cw, ch); g.strokeRect(card.x + 0.5, card.y + 0.5, cw - 1, ch - 1);
    g.fillStyle = card.s === 1 || card.s === 2 ? '#d00' : '#000';
    g.font = `bold ${Math.round(cw / 3)}px Arial`;
    g.fillText(RANKS[card.r] + SUITS[card.s], card.x + 3, card.y + cw / 3 + 1);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  cv.addEventListener('click', () => cv.remove());
}

// ---------------------------------------------------------------- 2048
function g2048(win, api) {
  const gs = games2(api);
  const st = win.g48 ||= { b: null, score: 0, over: false, won: false };
  const add = () => { const empty = st.b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0); if (!empty.length) return; st.b[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4; };
  const fresh = () => { st.b = new Array(16).fill(0); st.score = 0; st.over = st.won = false; add(); add(); };
  if (!st.b) fresh();
  let popped = new Set(), born = -1;
  const move = dir => {
    if (st.over) return false;
    const before = st.b.join();
    popped = new Set();
    for (let line = 0; line < 4; line++) {
      const idx = [0, 1, 2, 3].map(k => (dir === 'left' ? line * 4 + k : dir === 'right' ? line * 4 + 3 - k : dir === 'up' ? k * 4 + line : (3 - k) * 4 + line));
      const vals = idx.map(i => st.b[i]).filter(Boolean);
      const out = [];
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); st.score += vals[i] * 2; popped.add(idx[out.length - 1]); if (vals[i] * 2 === 2048) st.won = true; i++; } else out.push(vals[i]);
      }
      idx.forEach((i, k) => { st.b[i] = out[k] || 0; });
    }
    if (st.b.join() === before) return false;
    const empty = st.b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
    born = empty[Math.floor(Math.random() * empty.length)];
    st.b[born] = Math.random() < 0.9 ? 2 : 4;
    const stuck = !st.b.includes(0) && ![...Array(16).keys()].some(i => (i % 4 < 3 && st.b[i] === st.b[i + 1]) || (i < 12 && st.b[i] === st.b[i + 4]));
    if (stuck) st.over = true;
    if (st.score > gs.g2048) { gs.g2048 = st.score; api.save(); }
    return true;
  };
  const grid = h('div', { class: 'cpg-48-grid' });
  const score = h('b'), best = h('b');
  const draw = () => {
    score.textContent = st.score; best.textContent = gs.g2048;
    fill(grid, st.b.map((v, i) => h('div', { class: 'cpg-48-cell' + (v ? ' v' : '') + (popped.has(i) ? ' pop' : '') + (i === born ? ' born' : ''), 'data-v': v || '', 'data-i': i }, v || '')),
      st.over || st.won ? h('div', { class: 'cpg-48-over' }, h('b', {}, st.won && !st.over ? '2048!' : 'game over'), h('button', { type: 'button', class: 'cp-btn primary', onclick: () => { fresh(); draw(); } }, 'try again')) : null);
  };
  const go = dir => { if (move(dir)) draw(); };
  const keys = e => { const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' }[e.key]; if (dir) { e.preventDefault(); go(dir); } };
  win.el.addEventListener('keydown', keys);
  let sx = 0, sy = 0;
  grid.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  grid.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); });
  win.cleanup = () => win.el.removeEventListener('keydown', keys);
  win.onFocus = () => win.el.focus();
  setTimeout(() => win.el.focus(), 50);
  draw();
  return h('div', { class: 'cpg-48' },
    h('div', { class: 'cpg-48-top' }, h('h3', {}, '2048'), h('div', { class: 'cpg-48-score' }, h('span', {}, 'score'), score), h('div', { class: 'cpg-48-score' }, h('span', {}, 'best'), best),
      h('button', { type: 'button', class: 'cp-btn', onclick: () => { fresh(); draw(); } }, 'new')),
    grid,
    h('div', { class: 'cpg-48-pad' }, [['up', '▲'], ['left', '◀'], ['down', '▼'], ['right', '▶']].map(([dir, glyph]) => h('button', { type: 'button', class: 'cpg-48-arrow', 'data-dir': dir, title: dir, onclick: () => go(dir) }, glyph))));
}

// ---------------------------------------------------------------- wordie (a word guess)
const WORDS = ['ghoul', 'heart', 'skull', 'stars', 'candy', 'bloom', 'charm', 'gloss', 'music', 'vinyl', 'lyric', 'dream', 'night', 'witch', 'spell', 'magic', 'crush', 'roses', 'angel', 'fangs',
  'grave', 'mossy', 'frogs', 'bunny', 'kitty', 'cream', 'sugar', 'berry', 'peach', 'lemon', 'mango', 'glow', 'tiara', 'pearl', 'jewel', 'boots', 'skirt', 'scarf', 'plaid', 'black', 'pinks', 'hoody',
  'emoji', 'drama', 'gamer', 'songs', 'bands', 'drums', 'guitar', 'piano', 'opera', 'ghost', 'spook', 'batty', 'cloak', 'crypt', 'raven', 'moons', 'comet', 'fairy', 'pixie', 'elves', 'swirl', 'sweet',
  'sassy', 'flirt', 'bliss', 'glam', 'shiny', 'lucky', 'cozy', 'fuzzy', 'plush', 'teddy', 'lacey', 'velvet', 'satin', 'denim', 'chain', 'spike', 'studs', 'liner', 'blush', 'nails', 'curls', 'bangs',
  'ocean', 'storm', 'rainy', 'misty', 'cloud', 'frost', 'snowy', 'apple', 'cherry', 'grape', 'melon', 'honey', 'toast', 'pizza', 'sushi', 'latte', 'mocha', 'crown', 'queen', 'royal', 'story', 'poems']
  .filter(w => w.length === 5);
function words(win, api) {
  const gs = games2(api);
  const st = win.wd ||= { word: WORDS[Math.floor(Math.random() * WORDS.length)], rows: [], cur: '', done: false, won: false, shake: false };
  const grid = h('div', { class: 'cpg-wd-grid' });
  const kb = h('div', { class: 'cpg-wd-kb' });
  const marks = guess => {
    const out = new Array(5).fill('miss'), left = [...st.word];
    [...guess].forEach((ch, i) => { if (ch === st.word[i]) { out[i] = 'hit'; left[i] = null; } });
    [...guess].forEach((ch, i) => { if (out[i] === 'hit') return; const j = left.indexOf(ch); if (j >= 0) { out[i] = 'near'; left[j] = null; } });
    return out;
  };
  const keyState = {};
  const draw = () => {
    for (const k in keyState) delete keyState[k];
    st.rows.forEach(g => marks(g).forEach((m, i) => { const ch = g[i]; const rank = { hit: 3, near: 2, miss: 1 }; if ((rank[m] || 0) > (rank[keyState[ch]] || 0)) keyState[ch] = m; }));
    fill(grid, Array.from({ length: 6 }, (_, r) => {
      const g = st.rows[r];
      const typing = r === st.rows.length && !st.done;
      const m = g ? marks(g) : null;
      return h('div', { class: 'cpg-wd-row' + (typing && st.shake ? ' shake' : '') }, Array.from({ length: 5 }, (_, i) => {
        const ch = g ? g[i] : typing ? st.cur[i] || '' : '';
        return h('div', { class: 'cpg-wd-tile' + (m ? ' ' + m[i] : ch ? ' typed' : ''), style: { '--d': i * 0.08 + 's' } }, ch);
      }));
    }), st.done ? h('div', { class: 'cpg-wd-end' }, h('b', {}, st.won ? 'you got it!' : st.word), h('button', { type: 'button', class: 'cp-btn primary', onclick: () => { win.wd = null; win.redraw(); } }, 'play again')) : null);
    fill(kb, ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].map(row => h('div', { class: 'cpg-wd-krow' }, [...row].map(ch => ch === '+'
      ? h('button', { type: 'button', class: 'cpg-wd-key wide', onclick: () => press('Enter') }, 'enter')
      : ch === '-' ? h('button', { type: 'button', class: 'cpg-wd-key wide', title: 'delete', onclick: () => press('Backspace') }, '⌫')
        : h('button', { type: 'button', class: 'cpg-wd-key ' + (keyState[ch] || ''), 'data-key': ch, onclick: () => press(ch) }, ch)))));
    st.shake = false;
  };
  const press = key => {
    if (st.done) return;
    if (key === 'Enter') {
      if (st.cur.length < 5) { st.shake = true; draw(); return; }
      st.rows.push(st.cur);
      st.cur = '';
      if (st.rows.at(-1) === st.word || st.rows.length === 6) {
        st.done = true; st.won = st.rows.at(-1) === st.word;
        gs.words.played++; if (st.won) { gs.words.won++; gs.words.streak++; } else gs.words.streak = 0;
        api.save();
      }
    } else if (key === 'Backspace') st.cur = st.cur.slice(0, -1);
    else if (/^[a-z]$/i.test(key) && st.cur.length < 5) st.cur += key.toLowerCase();
    draw();
  };
  const keys = e => { if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-z]$/i.test(e.key)) { e.preventDefault(); press(e.key); } };
  win.el.addEventListener('keydown', keys);
  win.cleanup = () => win.el.removeEventListener('keydown', keys);
  win.onFocus = () => win.el.focus();
  setTimeout(() => win.el.focus(), 50);
  draw();
  return h('div', { class: 'cpg-wd' }, h('div', { class: 'cpg-wd-top' }, h('h3', {}, 'wordie'), h('span', {}, `streak ${gs.words.streak}`)), grid, kb);
}

// ---------------------------------------------------------------- settings
function settings(win, api) {
  const { d, mine, look } = api;
  const L = d[look];
  const save = () => { api.save(); };
  win.tab ||= 'look';
  const wallTile = (id, label) => h('button', { type: 'button', class: 'cps-wall' + (!L.imageId && L.wall === id ? ' on' : ''), 'data-wall': id, title: label, disabled: !mine, onclick: () => { L.wall = id; L.imageId = null; save(); api.redrawDesk(); win.redraw(); } },
    h('span', { class: 'cp-wall', 'data-wall': id }, h('i', { class: 'cp-wall-a' }), h('i', { class: 'cp-wall-b' })), h('span', { class: 'cps-wall-name' }, label));
  const uploadWall = async () => {
    const up = await uploadPic(1600, { aspect: look === 'y2k' ? 4 / 3 : 16 / 10 });
    if (!up) return;
    if (L.imageId && !d.pics.some(p => p.imageId === L.imageId)) dropImage(L.imageId);
    L.imageId = up.imageId;
    save(); api.redrawDesk(); win.redraw();
  };
  const sec = (label, ...kids) => h('div', { class: 'cps-sec' }, h('div', { class: 'cps-label' }, label), ...kids);
  const preview = () => h('div', { class: 'cps-mon' }, h('div', { class: 'cps-mon-screen' }, L.imageId ? pic(L.imageId, 'cps-mon-img') : h('span', { class: 'cp-wall', 'data-wall': L.wall }, h('i', { class: 'cp-wall-a' }), h('i', { class: 'cp-wall-b' }))), look === 'y2k' ? h('i', { class: 'cps-mon-stand' }) : null);
  const passIn = h('input', { type: 'password', class: 'cps-pass', maxLength: 40, value: '', placeholder: d.password ? '••••' : '', disabled: !mine, autocomplete: 'new-password' });
  const TABS = {
    look: () => [
      sec('look', segmented(LOOKS.map(([value, label]) => ({ value, label })), look, v => { if (mine) api.setLook(v); })),
      look === 'y2k'
        ? sec('color scheme', h('div', { class: 'cps-schemes' }, SCHEMES.map(([id, label, c]) => h('button', { type: 'button', class: 'cps-scheme' + (L.scheme === id ? ' on' : ''), 'data-scheme': id, disabled: !mine, style: { '--c': c }, onclick: () => { L.scheme = id; save(); api.paintScreen(); win.redraw(); } }, h('i'), label))))
        : [sec('accent color', swatches(L.accent, v => { L.accent = v; save(); api.paintScreen(); }, ['#ff4fa3', '#b18cff', '#6ec6ff', '#3a5bd9', '#7df9d0', '#39d353', '#ffd84d', '#ff7a3d', '#d81e5b', '#9b8aa8'])),
          sec('mode', segmented([{ value: 'light', label: 'light' }, { value: 'dark', label: 'dark' }], L.dark ? 'dark' : 'light', v => { if (!mine) return; L.dark = v === 'dark'; save(); api.paintScreen(); api.refreshAll(); }))],
      look === 'y2k' ? sec('mouse pointer', segmented(CURSORS.map(([value, label]) => ({ value, label })), L.cursor || 'normal', v => { if (!mine) return; L.cursor = v; save(); api.paintScreen(); })) : null,
    ],
    desktop: () => [
      preview(),
      sec(look === 'y2k' ? 'background' : 'wallpaper', h('div', { class: 'cps-walls' }, WALLS[look].map(([id, label]) => wallTile(id, label)),
        L.imageId ? h('button', { type: 'button', class: 'cps-wall on', 'data-wall': 'pic' }, h('span', { class: 'cp-wall' }, pic(L.imageId, 'cp-wall-img')), h('span', { class: 'cps-wall-name' }, 'my picture')) : null),
        mine ? h('button', { type: 'button', class: 'cp-btn cps-upload', onclick: uploadWall }, look === 'y2k' ? 'browse...' : 'upload a picture') : null),
    ],
    saver: () => [
      sec('screen saver', h('div', { class: 'cps-row' },
        h('select', { class: 'cps-select', disabled: !mine, onchange: e => { d.saver.kind = e.target.value; save(); win.redraw(); } },
          [['off', '(none)'], ['stars', 'starfield'], ['pipes', 'pipes'], ['text', 'flying text']].map(([v, l]) => h('option', { value: v, selected: d.saver.kind === v }, l))),
        h('button', { type: 'button', class: 'cp-btn cps-preview', onclick: () => api.startSaver() }, 'preview'))),
      d.saver.kind === 'text' ? sec('text', h('input', { type: 'text', class: 'cps-text', maxLength: 40, value: d.saver.text || '', placeholder: nameOf(api.char), disabled: !mine, oninput: e => { d.saver.text = e.target.value; save(); } })) : null,
      sec('wait', h('select', { class: 'cps-select', disabled: !mine, onchange: e => { d.saver.wait = Number(e.target.value); save(); } },
        [[30, '30 seconds'], [60, '1 minute'], [120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes']].map(([v, l]) => h('option', { value: v, selected: d.saver.wait === v }, l)))),
    ],
    account: () => [
      sec(look === 'y2k' ? 'picture' : 'account picture', h('div', { class: 'cps-acct' }, api.acctPic('cps-acct-pic'), h('b', {}, nameOf(api.char)),
        mine ? h('div', { class: 'cps-row' },
          h('button', { type: 'button', class: 'cp-btn', onclick: async () => { const up = await uploadPic(600, { aspect: 1 }); if (!up) return; dropImage(d.acct.imageId); d.acct.imageId = up.imageId; save(); api.refreshAll(); } }, 'change picture'),
          d.acct.imageId ? h('button', { type: 'button', class: 'cp-btn', onclick: () => { dropImage(d.acct.imageId); d.acct.imageId = null; save(); api.refreshAll(); } }, 'use my oc pic') : null) : null)),
      sec('password', mine ? h('div', { class: 'cps-row' }, passIn,
        h('button', { type: 'button', class: 'cp-btn', onclick: () => { const v = passIn.value; if (!v) { passIn.focus(); return; } d.password = v; save(); toast('password set'); win.redraw(); } }, d.password ? 'change' : 'set'),
        d.password ? h('button', { type: 'button', class: 'cp-btn', onclick: () => { d.password = ''; save(); toast('password removed'); win.redraw(); } }, 'remove') : null) : h('span', {}, d.password ? 'on' : 'off')),
    ],
  };
  const TAB_LABELS = look === 'y2k' ? [['look', 'themes'], ['desktop', 'desktop'], ['saver', 'screen saver'], ['account', 'user account']] : [['look', 'personalize'], ['desktop', 'wallpaper'], ['saver', 'lock screen'], ['account', 'accounts']];
  const tabs = h('div', { class: 'cps-tabs' }, TAB_LABELS.map(([id, label]) => h('button', { type: 'button', class: 'cps-tab' + (win.tab === id ? ' on' : ''), 'data-tab': id, onclick: () => { win.tab = id; win.redraw(); } }, label)));
  const body = h('div', { class: 'cps-body' }, TABS[win.tab]());
  if (look === 'y2k') return h('div', { class: 'cps cps-y2k' }, tabs, body, h('div', { class: 'cps-foot' }, h('button', { type: 'button', class: 'cp-btn', onclick: () => win.close() }, 'ok'), h('button', { type: 'button', class: 'cp-btn', onclick: () => win.close() }, 'cancel')));
  return h('div', { class: 'cps cps-mod' }, h('div', { class: 'cps-side' }, h('div', { class: 'cps-me' }, api.acctPic('cps-me-pic'), h('b', {}, nameOf(api.char))), tabs), body);
}
