// mixtape: decorate cassettes (shell, label, j-card track list, stickers + doodles on the case), and play them in a walkman.
// saved in char.fun.mixtape = { tapes: [tape], cur: tapeId }
// tape = { id, title, shell, labelColor, labelFont, card, cardPattern, font, ink, player,
//          tracks: [{ id, text, songId }], deco: [{ id, kind: 'stk' | 'doodle' | 'word', code, x, y, r, k }] }
// songId points at a song in char.playlist, so pressing play really plays it.

import { h, fill, uid, toast, confirmDialog, swatches, segmented } from '../ui.js';
import { store } from '../store.js';
import { appBar, sticker, dataFor } from './kit.js';
import {
  SHELLS, PLAYERS, FONTS, fontCss, INKS, CARDS, LABELS, PAPERS, STICKER_TRAY, DOODLES, WORDS,
  doodleSvg, cassette, paperClass,
} from './mixtape-parts.js';

export const meta = { id: 'mixtape', label: 'mixtape', icon: '1f4fc' };

const fmt = t => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00');

function newTape(char, n) {
  const first = (char.name || '').trim().split(/\s+/)[0].toLowerCase();
  return {
    id: 't_' + uid(), title: n ? `mix vol. ${n + 1}` : first ? `${first}'s mix` : 'my mix',
    shell: ['pink', 'clear', 'black', 'glitter', 'neon', 'purple'][n % 6], labelColor: '#fff6e8', labelFont: 'marker',
    card: ['#141114', '#ffd1e6', '#c9b3ff', '#fff6e8'][n % 4], cardPattern: 'plain', font: 'caveat', ink: '#ff4fa3', player: 'silver',
    tracks: [], deco: [], createdAt: Date.now(),
  };
}

function fixTape(t) {
  t.tracks ||= [];
  t.deco ||= [];
  t.shell ||= 'pink';
  t.labelColor ||= '#fff6e8';
  t.labelFont ||= 'marker';
  t.card ||= '#141114';
  t.cardPattern ||= 'plain';
  t.font ||= 'caveat';
  t.ink ||= '#ff4fa3';
  t.player ||= 'silver';
  return t;
}

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'mixtape', { tapes: [], cur: null });
  data.tapes.forEach(fixTape);
  const songs = () => char.playlist || [];
  const songOf = tr => (tr?.songId ? songs().find(x => x.id === tr.songId) || null : null);
  let tape = data.tapes.find(t => t.id === data.cur) || data.tapes[0] || null;
  let opened = false; // the case
  let tab = 'tracks';
  let picked = null; // a deco item being moved
  let trayTab = 'music';

  // ---- the sound ----
  const audio = new Audio();
  audio.preload = 'auto';
  let loaded = null; // the tape that's in the walkman
  let at = -1; // which track
  let ffHeld = null, rwTimer = null, holdTimer = null, fakeTimer = null;
  let mode = 'stop'; // 'play' | 'pause' | 'stop'

  const playable = () => (loaded ? loaded.tracks.map((tr, i) => [i, songOf(tr)]).filter(([, sg]) => sg) : []);

  async function loadTrack(i, play = true) {
    const tr = loaded?.tracks[i];
    const sg = songOf(tr);
    at = i;
    if (!sg) return;
    const url = await store.imageURL(sg.imageId);
    if (loaded?.tracks[at] !== tr) return;
    if (!url) { toast("couldn't find that song", 'bad'); return; }
    if (audio.getAttribute('src') !== url) audio.src = url;
    else audio.currentTime = 0;
    if (play) {
      pausePagePlayer();
      mode = 'play';
      await audio.play().catch(() => { mode = 'pause'; });
    }
    drawDeck();
  }

  // the oc page's own music bar shouldn't play over the tape
  function pausePagePlayer() {
    const btn = document.querySelector('.player:not([hidden]) .player-btn.big');
    if (btn && btn.textContent.includes('⏸')) btn.click();
  }

  function insert(t) {
    if (loaded === t) return;
    eject(true);
    loaded = t;
    at = -1;
    walkman.classList.remove('inserting');
    void walkman.offsetWidth;
    walkman.classList.add('inserting');
    drawCase();
    drawShelf();
  }

  function eject(quiet) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    loaded = null;
    at = -1;
    mode = 'stop';
    stopHold();
    clearTimeout(fakeTimer);
    if (!quiet) drawAll();
  }

  function play() {
    if (!tape) return;
    if (loaded !== tape) insert(tape);
    const list = playable();
    if (!list.length) {
      // nothing linked: the reels give it a spin anyway
      mode = 'play';
      drawDeck();
      clearTimeout(fakeTimer);
      fakeTimer = setTimeout(() => { mode = 'stop'; drawDeck(); }, 1600);
      return;
    }
    if (at < 0 || !songOf(loaded.tracks[at])) { loadTrack(list[0][0]); return; }
    pausePagePlayer();
    mode = 'play';
    audio.play().catch(() => { mode = 'pause'; drawDeck(); });
    drawDeck();
  }
  function pause() { audio.pause(); mode = 'pause'; drawDeck(); }
  function stop() { audio.pause(); if (audio.src) audio.currentTime = 0; mode = 'stop'; clearTimeout(fakeTimer); drawDeck(); }
  function step(dir) {
    const list = playable();
    if (!list.length) return;
    const pos = list.findIndex(([i]) => i === at);
    if (dir < 0 && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const next = list[(pos + dir + list.length) % list.length];
    if (dir > 0 && pos === list.length - 1) {
      // end of the tape: flip back to the start and stop
      loadTrack(list[0][0], false).then(() => { mode = 'stop'; drawDeck(); });
      return;
    }
    loadTrack(next[0], mode === 'play' || mode === 'stop');
  }
  function playTrack(i) {
    if (!tape) return;
    insert(tape);
    if (!songOf(tape.tracks[i])) return;
    loadTrack(i);
  }

  // hold ▶▶ = fast forward with the chipmunk squeal, tap = next. hold ◀◀ = rewind, tap = back.
  function holdStart(dir) {
    if (!loaded || !audio.src) { holdTimer = 'tap'; return; }
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (dir > 0) {
        ffHeld = true;
        audio.preservesPitch = false;
        audio.playbackRate = 4;
        if (audio.paused) audio.play().catch(() => {});
        walkman.classList.add('ff');
      } else {
        walkman.classList.add('rw');
        rwTimer = setInterval(() => { audio.currentTime = Math.max(0, audio.currentTime - .5); drawProgress(); }, 60);
      }
    }, 260);
  }
  function holdEnd(dir) {
    if (holdTimer) {
      if (holdTimer !== 'tap') clearTimeout(holdTimer);
      holdTimer = null;
      step(dir);
      return;
    }
    stopHold();
  }
  function stopHold() {
    if (ffHeld) {
      audio.playbackRate = 1;
      audio.preservesPitch = true;
      if (mode !== 'play') audio.pause();
      ffHeld = null;
    }
    clearInterval(rwTimer);
    rwTimer = null;
    walkman.classList.remove('ff', 'rw');
  }

  audio.addEventListener('timeupdate', () => drawProgress());
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('play', () => { if (!ffHeld) { mode = 'play'; drawDeck(); } });
  audio.addEventListener('pause', () => { if (!ffHeld && mode === 'play' && !audio.ended) { mode = 'pause'; drawDeck(); } });

  // ---- the shelf of tapes ----
  const shelf = h('div', { class: 'mx-shelf' });
  function drawShelf() {
    fill(shelf,
      data.tapes.map(t => {
        const c = cassette(t, 'mini');
        return h('button', {
          type: 'button', class: 'mx-shelf-tape' + (t === tape ? ' on' : '') + (t === loaded ? ' playing' : ''), title: t.title,
          onclick: () => { if (tape === t) return; tape = t; data.cur = t.id; opened = false; picked = null; if (mine) save(); drawAll(); },
        }, c);
      }),
      mine ? h('button', { type: 'button', class: 'mx-shelf-new', title: 'new mixtape', onclick: addTape }, '+') : null);
  }

  function addTape() {
    const t = newTape(char, data.tapes.length);
    data.tapes.push(t);
    tape = t;
    data.cur = t.id;
    opened = false;
    tab = 'tracks';
    save();
    drawAll();
  }

  async function removeTape() {
    if (!tape || !await confirmDialog(`throw out "${tape.title || 'this mixtape'}"?`, { okLabel: 'throw out', danger: true })) return;
    if (loaded === tape) eject(true);
    data.tapes = data.tapes.filter(t => t !== tape);
    tape = data.tapes[0] || null;
    data.cur = tape?.id || null;
    save();
    drawAll();
  }

  // ---- the case ----
  const caseBox = h('div', { class: 'mx-case-stage' });
  let front = null;
  function jcardFront() {
    const f = h('div', { class: 'mx-front ' + paperClass(tape), style: { '--card': tape.card, '--ink': tape.ink } },
      h('div', { class: 'mx-front-title', style: { fontFamily: fontCss(tape.labelFont), color: tape.ink } }, tape.title),
      h('div', { class: 'mx-front-spine', style: { fontFamily: fontCss(tape.labelFont) } }, tape.title));
    for (const d of tape.deco) f.append(decoEl(d));
    f.addEventListener('pointerdown', e => {
      if (e.target === f && picked) { picked = null; drawCase(); drawEditor(); }
    });
    return f;
  }

  function decoEl(d) {
    const kid = d.kind === 'stk' ? sticker(d.code, 'mx-deco-stk')
      : d.kind === 'word' ? h('span', { class: 'mx-deco-word', style: { fontFamily: fontCss(tape.font), color: tape.ink } }, d.code)
        : h('span', { class: 'mx-deco-doodle', style: { color: tape.ink } }, doodleSvg(d.code));
    const item = h('div', {
      class: 'mx-deco' + (picked === d.id ? ' on' : ''),
      style: { left: d.x + '%', top: d.y + '%', transform: `translate(-50%, -50%) rotate(${d.r}deg) scale(${d.k})` },
    }, kid);
    if (mine && tab === 'case') {
      item.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (picked !== d.id) { picked = d.id; front.querySelectorAll('.mx-deco').forEach(x => x.classList.toggle('on', x === item)); drawEditor(); }
        const r = front.getBoundingClientRect();
        const move = ev => {
          d.x = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
          d.y = Math.max(0, Math.min(100, ((ev.clientY - r.top) / r.height) * 100));
          item.style.left = d.x + '%';
          item.style.top = d.y + '%';
        };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); save(); };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
      });
    }
    return item;
  }

  function trackList(t, cls) {
    const half = Math.ceil(t.tracks.length / 2);
    const side = (label, list, start) => h('div', { class: 'mx-side' },
      h('div', { class: 'mx-side-head' }, label),
      list.map((tr, i) => h('div', { class: 'mx-line' + (loaded === t && at === start + i ? ' now' : '') },
        h('span', { class: 'mx-line-n' }, start + i + 1 + '.'),
        h('span', { class: 'mx-line-text' }, tr.text || songOf(tr)?.title || ' '),
        songOf(tr) ? h('span', { class: 'mx-line-note' }, '♪') : null)));
    const two = t.tracks.length > 8;
    return h('div', {
      class: `mx-tracks ${paperClass(t)} ${cls || ''}` + (two ? ' two' : ''),
      style: { '--card': t.card, '--ink': t.ink, fontFamily: fontCss(t.font), '--lines': two ? Math.max(6, half + 1) : Math.max(7, t.tracks.length + 2) },
    },
      side('side a', t.tracks.slice(0, half), 0),
      side('side b', t.tracks.slice(half), half));
  }

  function drawCase() {
    if (!tape) {
      fill(caseBox, h('div', { class: 'mx-empty' }, sticker('1f4fc', 'mx-empty-stk'),
        mine ? h('button', { type: 'button', class: 'btn primary', onclick: addTape }, '+ new mixtape') : null));
      return;
    }
    front = jcardFront();
    const inTray = cassette(tape, 'in-tray' + (loaded === tape ? ' gone' : ''));
    const lid = h('div', { class: 'mx-lid' },
      h('div', { class: 'mx-lid-front' }, front, h('div', { class: 'mx-plastic' })),
      h('div', { class: 'mx-lid-back' }, trackList(tape, 'inside'), h('div', { class: 'mx-plastic' })));
    const toggle = () => {
      opened = !opened;
      theCase.classList.toggle('open', opened);
      openBtn.textContent = opened ? 'close' : 'open';
    };
    const theCase = h('div', {
      class: 'mx-case' + (opened ? ' open' : '') + (tab === 'case' && mine ? ' decorating' : ''),
      onclick: e => {
        if (tab === 'case' && mine && !opened) return; // decorating
        if (e.target.closest('.mx-deco')) return;
        toggle();
      },
    },
      h('div', { class: 'mx-tray' }, h('div', { class: 'mx-tray-spokes' }, h('i'), h('i')), inTray, h('div', { class: 'mx-plastic' })),
      lid);
    const openBtn = h('button', { type: 'button', class: 'btn sm', onclick: toggle }, opened ? 'close' : 'open');
    fill(caseBox, h('div', { class: 'mx-case-wrap' }, theCase), h('div', { class: 'mx-case-btns' },
      openBtn,
      h('button', { type: 'button', class: 'btn primary sm', onclick: () => { play(); } }, '▶ play')));
  }

  // ---- the walkman ----
  const reelsBox = h('div', { class: 'mx-wm-door' });
  const lcdTrack = h('span', { class: 'mx-lcd-n' });
  const lcdTitle = h('span', { class: 'mx-lcd-title' });
  const lcdTime = h('span', { class: 'mx-lcd-time' });
  const lcdMarquee = h('div', { class: 'mx-lcd-marquee' }, lcdTitle);
  const playBtn = h('button', { type: 'button', class: 'mx-key big', title: 'play', onclick: () => (mode === 'play' ? pause() : play()) });
  const key = (label, title, extra = {}) => h('button', { type: 'button', class: 'mx-key', title, ...extra }, label);
  const holdKey = (label, title, dir) => key(label, title, {
    onpointerdown: e => { e.preventDefault(); holdStart(dir); },
    onpointerup: () => holdEnd(dir),
    onpointerleave: () => { if (!holdTimer) stopHold(); },
    onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(dir); } },
  });
  const seek = h('input', {
    type: 'range', class: 'mx-seek', min: 0, max: 1000, value: 0, title: 'seek',
    oninput: e => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; },
  });
  const vol = h('input', {
    type: 'range', class: 'mx-vol', min: 0, max: 1, step: .01, value: .8, title: 'volume',
    oninput: e => { audio.volume = Number(e.target.value); },
  });
  audio.volume = .8;
  const walkman = h('div', { class: 'mx-walkman' },
    h('div', { class: 'mx-wm-top' },
      h('span', { class: 'mx-wm-brand' }, 'oc-man'),
      h('span', { class: 'mx-wm-led' }),
      sticker('1f3a7', 'mx-wm-phones')),
    reelsBox,
    h('div', { class: 'mx-lcd' }, h('div', { class: 'mx-lcd-row' }, lcdTrack, lcdTime), lcdMarquee),
    seek,
    h('div', { class: 'mx-keys' },
      key('⏏', 'eject', { onclick: () => eject() }),
      holdKey('◀◀', 'back', -1),
      playBtn,
      holdKey('▶▶', 'skip', 1),
      key('■', 'stop', { onclick: stop })),
    h('div', { class: 'mx-wm-bottom' }, h('span', { class: 'mx-vol-ico' }, '🔈'), vol));
  let deckTape = null;

  function drawDeck() {
    walkman.dataset.color = (loaded || tape)?.player || 'silver';
    walkman.classList.toggle('playing', mode === 'play');
    walkman.classList.toggle('empty', !loaded);
    if (deckTape?.tape !== loaded) {
      deckTape = loaded ? cassette(loaded, 'in-deck') : null;
      if (deckTape) deckTape.tape = loaded;
      fill(reelsBox, deckTape, h('div', { class: 'mx-wm-glass' }));
    }
    const tr = loaded?.tracks[at];
    const list = playable();
    fill(playBtn, mode === 'play' ? '❚❚' : '▶');
    playBtn.title = mode === 'play' ? 'pause' : 'play';
    lcdTrack.textContent = !loaded ? '--' : (mode === 'play' ? '▶ ' : mode === 'pause' ? '❚❚ ' : '■ ') + (at >= 0 ? String(at + 1).padStart(2, '0') : '--');
    const title = !loaded ? (tape ? tape.title : '') : !list.length ? 'no songs linked' : tr ? (tr.text || songOf(tr)?.title || '') : loaded.title;
    if (lcdTitle.textContent !== title) {
      lcdTitle.textContent = title;
      requestAnimationFrame(() => lcdMarquee.classList.toggle('scroll', lcdTitle.scrollWidth > lcdMarquee.clientWidth));
    }
    drawProgress();
    // the track list lights up the song that's on
    caseBox.querySelectorAll('.mx-line').forEach((ln, i) => ln.classList.toggle('now', loaded === tape && i === at));
    editorBox.querySelectorAll('.mx-row').forEach((row, i) => row.classList.toggle('now', loaded === tape && i === at));
    shelf.querySelectorAll('.mx-shelf-tape').forEach((b, i) => b.classList.toggle('playing', data.tapes[i] === loaded));
  }

  function drawProgress() {
    const d = audio.duration;
    if (document.activeElement !== seek) seek.value = d ? Math.round((audio.currentTime / d) * 1000) : 0;
    lcdTime.textContent = loaded && audio.src ? fmt(audio.currentTime) : '0:00';
    if (deckTape && loaded) {
      const n = Math.max(1, loaded.tracks.length);
      const within = d ? audio.currentTime / d : 0;
      deckTape.setReels(((Math.max(0, at) + within) / n));
    }
  }

  // ---- the editor ----
  const editorBox = h('div', { class: 'mx-editor' });
  function drawEditor() {
    if (!tape) { fill(editorBox); return; }
    if (!mine) {
      fill(editorBox, h('h3', { class: 'mx-h' }, tape.title), tracksView());
      return;
    }
    fill(editorBox,
      segmented([
        { value: 'tracks', label: 'tracks' }, { value: 'card', label: 'j-card' },
        { value: 'label', label: 'tape' }, { value: 'case', label: 'stickers' },
      ], tab, v => {
        tab = v;
        picked = null;
        if (v === 'case' && opened) opened = false;
        if (v === 'tracks' || v === 'card') opened = true;
        drawCase();
        drawEditor();
      }),
      h('div', { class: 'mx-pane' }, { tracks: tracksPane, card: cardPane, label: labelPane, case: decoPane }[tab]()));
  }

  function tracksView() {
    return h('div', { class: 'mx-rows' }, tape.tracks.map((tr, i) => h('div', { class: 'mx-row view' + (loaded === tape && at === i ? ' now' : '') },
      h('span', { class: 'mx-row-n' }, i + 1),
      h('span', { class: 'mx-row-text', style: { fontFamily: fontCss(tape.font) } }, tr.text || songOf(tr)?.title || ''),
      songOf(tr) ? h('button', { type: 'button', class: 'icon-btn sm', title: 'play this', onclick: () => playTrack(i) }, '▶') : null)));
  }

  function tracksPane() {
    const rows = h('div', { class: 'mx-rows' });
    const redraw = () => { opened = true; save(); drawCase(); drawEditor(); };
    tape.tracks.forEach((tr, i) => {
      rows.append(h('div', { class: 'mx-row' + (loaded === tape && at === i ? ' now' : '') },
        h('span', { class: 'mx-row-n' }, i + 1),
        h('input', {
          type: 'text', class: 'mx-row-text', value: tr.text, maxLength: 80, placeholder: songOf(tr)?.title || 'artist - song',
          style: { fontFamily: fontCss(tape.font) },
          oninput: e => { tr.text = e.target.value; save(); drawCase(); drawDeck(); },
        }),
        songs().length ? h('select', {
          class: 'mx-row-song' + (tr.songId ? ' on' : ''), title: 'link a song',
          onchange: e => { tr.songId = e.target.value || null; redraw(); drawDeck(); },
        },
          h('option', { value: '' }, '♪ —'),
          songs().map(sg => h('option', { value: sg.id, selected: sg.id === tr.songId }, '♪ ' + (sg.title || 'untitled')))) : null,
        h('div', { class: 'mx-row-btns' },
          songOf(tr) ? h('button', { type: 'button', class: 'icon-btn sm', title: 'play this', onclick: () => playTrack(i) }, '▶') : null,
          h('button', { type: 'button', class: 'icon-btn sm', title: 'move up', disabled: i === 0, onclick: () => { tape.tracks.splice(i - 1, 0, tape.tracks.splice(i, 1)[0]); redraw(); } }, '↑'),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'move down', disabled: i === tape.tracks.length - 1, onclick: () => { tape.tracks.splice(i + 1, 0, tape.tracks.splice(i, 1)[0]); redraw(); } }, '↓'),
          h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: () => { tape.tracks.splice(i, 1); if (loaded === tape && at >= tape.tracks.length) at = -1; redraw(); } }, '×'))));
    });
    return [
      rows,
      h('div', { class: 'mx-add-row' },
        h('button', {
          type: 'button', class: 'btn sm', disabled: tape.tracks.length >= 24,
          onclick: () => { tape.tracks.push({ id: 'k_' + uid(), text: '', songId: null }); redraw(); [...editorBox.querySelectorAll('.mx-row-text')].pop()?.focus(); },
        }, '+ track'),
        songs().length ? h('button', {
          type: 'button', class: 'btn ghost sm',
          onclick: () => {
            const have = new Set(tape.tracks.map(t => t.songId));
            for (const sg of songs()) if (!have.has(sg.id) && tape.tracks.length < 24) tape.tracks.push({ id: 'k_' + uid(), text: '', songId: sg.id });
            redraw();
          },
        }, '+ all their songs') : null),
      h('div', { class: 'mx-sub' }, 'handwriting'),
      fontChips('font'),
      h('div', { class: 'mx-sub' }, 'ink'),
      swatches(tape.ink, c => { tape.ink = c; save(); drawCase(); }, INKS),
    ];
  }

  function fontChips(key) {
    return h('div', { class: 'mx-fonts' }, FONTS.map(([id, css]) => h('button', {
      type: 'button', class: 'mx-font' + (tape[key] === id ? ' on' : ''), style: { fontFamily: css }, title: id,
      onclick: () => { tape[key] = id; save(); drawCase(); drawEditor(); drawShelf(); },
    }, key === 'font' ? 'side a' : 'abc')));
  }

  function cardPane() {
    return [
      h('div', { class: 'mx-sub' }, 'paper'),
      swatches(tape.card, c => { tape.card = c; save(); drawCase(); drawShelf(); }, CARDS),
      h('div', { class: 'mx-papers' }, PAPERS.map(p => h('button', {
        type: 'button', class: `mx-paper-pick mx-paper paper-${p}` + (tape.cardPattern === p ? ' on' : ''), title: p,
        style: { '--card': tape.card, '--ink': tape.ink },
        onclick: () => { tape.cardPattern = p; save(); drawCase(); drawEditor(); },
      }))),
    ];
  }

  function labelPane() {
    return [
      h('input', {
        type: 'text', class: 'mx-title-input', value: tape.title, maxLength: 40, placeholder: 'title',
        style: { fontFamily: fontCss(tape.labelFont) },
        oninput: e => { tape.title = e.target.value; save(); drawCase(); drawShelf(); drawDeck(); },
      }),
      h('div', { class: 'mx-sub' }, 'title font'),
      fontChips('labelFont'),
      h('div', { class: 'mx-sub' }, 'shell'),
      h('div', { class: 'mx-shells' }, SHELLS.map(([id, label]) => h('button', {
        type: 'button', class: 'mx-shell-pick' + (tape.shell === id ? ' on' : ''), title: label,
        onclick: () => { tape.shell = id; save(); drawAll(); },
      }, cassette({ ...tape, shell: id }, 'tiny'), h('span', {}, label)))),
      h('div', { class: 'mx-sub' }, 'label'),
      swatches(tape.labelColor, c => { tape.labelColor = c; save(); drawCase(); drawShelf(); }, LABELS),
      h('div', { class: 'mx-sub' }, 'walkman'),
      h('div', { class: 'mx-players' }, PLAYERS.map(([id, label]) => h('button', {
        type: 'button', class: `mx-player-pick wm-${id}` + (tape.player === id ? ' on' : ''), title: label,
        onclick: () => { tape.player = id; save(); drawDeck(); drawEditor(); },
      }))),
      h('div', { class: 'mx-danger' }, h('button', { type: 'button', class: 'btn danger sm', onclick: removeTape }, 'throw out tape')),
    ];
  }

  function decoPane() {
    const sel = tape.deco.find(d => d.id === picked);
    const add = (kind, code) => {
      const d = { id: 'm_' + uid(), kind, code, x: 20 + Math.random() * 60, y: 25 + Math.random() * 50, r: Math.round(Math.random() * 30 - 15), k: 1 };
      tape.deco.push(d);
      picked = d.id;
      save();
      drawCase();
      drawEditor();
    };
    const change = fn => { fn(sel); save(); drawCase(); };
    return [
      sel ? h('div', { class: 'mx-sel' },
        h('button', { type: 'button', class: 'icon-btn sm', title: 'smaller', onclick: () => change(d => d.k = Math.max(.4, +(d.k - .15).toFixed(2))) }, '−'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'bigger', onclick: () => change(d => d.k = Math.min(3, +(d.k + .15).toFixed(2))) }, '+'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'turn left', onclick: () => change(d => d.r -= 15) }, '⟲'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'turn right', onclick: () => change(d => d.r += 15) }, '⟳'),
        h('button', { type: 'button', class: 'icon-btn sm', title: 'to the front', onclick: () => change(d => { tape.deco.splice(tape.deco.indexOf(d), 1); tape.deco.push(d); }) }, '⇡'),
        h('button', {
          type: 'button', class: 'icon-btn sm', title: 'remove',
          onclick: () => { tape.deco = tape.deco.filter(d => d !== sel); picked = null; save(); drawCase(); drawEditor(); },
        }, '×')) : null,
      h('div', { class: 'mx-tray-tabs' }, [...Object.keys(STICKER_TRAY), 'doodles'].map(k => h('button', {
        type: 'button', class: 'mx-tray-tab' + (trayTab === k ? ' on' : ''), onclick: () => { trayTab = k; drawEditor(); },
      }, k))),
      trayTab === 'doodles'
        ? h('div', { class: 'mx-tray' + '-grid' },
          Object.keys(DOODLES).map(k => h('button', { type: 'button', class: 'mx-pick doodle', title: k, style: { color: tape.ink }, onclick: () => add('doodle', k) }, doodleSvg(k))),
          WORDS.map(w => h('button', { type: 'button', class: 'mx-pick word', style: { color: tape.ink, fontFamily: fontCss(tape.font) }, onclick: () => add('word', w) }, w)))
        : h('div', { class: 'mx-tray-grid' }, STICKER_TRAY[trayTab].map(code => h('button', { type: 'button', class: 'mx-pick', onclick: () => add('stk', code) }, sticker(code)))),
      tape.deco.length ? h('div', { class: 'mx-add-row' }, h('button', {
        type: 'button', class: 'btn ghost sm',
        onclick: async () => { if (await confirmDialog('take every sticker off?', { okLabel: 'take off', danger: true })) { tape.deco = []; picked = null; save(); drawCase(); drawEditor(); } },
      }, 'clear stickers')) : null,
    ];
  }

  function drawAll() {
    drawShelf();
    drawCase();
    drawDeck();
    drawEditor();
  }

  el.append(
    appBar(ctx, meta),
    shelf,
    caseBox,
    h('div', { class: 'mx-lower' + (tape || mine ? '' : ' hide') }, walkman, editorBox));
  drawAll();

  const onKey = e => { if (e.key === 'Escape' && picked) { picked = null; drawCase(); drawEditor(); } };
  addEventListener('keydown', onKey);
  return () => {
    removeEventListener('keydown', onKey);
    stopHold();
    clearTimeout(fakeTimer);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  };
}
