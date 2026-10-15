// a song on a page: it plays while that page is open and stops when you turn away.
// the little cassette (or record) on the page plays + pauses it.
// browsers won't start sound before you've clicked something, so then it waits (and wiggles) until you do.

import { h } from '../ui.js';
import { store } from '../store.js';

export function songPlayer() {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  let current = null; // the imageId that's loaded
  let paused = false; // they paused it themselves
  let blocked = false; // the browser said not yet
  let fade = null;
  const widgets = new Set();

  const refresh = () => {
    for (const w of [...widgets]) {
      if (!w.el.isConnected) { widgets.delete(w); continue; }
      const mine = w.song.imageId === current;
      w.el.classList.toggle('playing', mine && !audio.paused);
      w.el.classList.toggle('waiting', mine && blocked && audio.paused && !paused);
    }
  };
  audio.addEventListener('play', refresh);
  audio.addEventListener('pause', refresh);

  function ramp(to, ms) {
    cancelAnimationFrame(fade);
    const from = audio.volume, t0 = performance.now();
    return new Promise(done => {
      const step = now => {
        const k = Math.min(1, (now - t0) / ms);
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) fade = requestAnimationFrame(step); else done();
      };
      fade = requestAnimationFrame(step);
    });
  }

  async function start() {
    try {
      audio.volume = 0;
      await audio.play();
      blocked = false;
      ramp(.85, 700);
    } catch {
      blocked = true;
      const retry = () => { document.removeEventListener('pointerdown', retry, true); document.removeEventListener('keydown', retry, true); if (current && blocked && !paused) start(); };
      document.addEventListener('pointerdown', retry, true);
      document.addEventListener('keydown', retry, true);
    }
    refresh();
  }

  // the song that should be playing now (null = none)
  async function want(song) {
    const id = song?.imageId || null;
    if (id === current) {
      if (id && audio.paused && !paused && !blocked) start();
      return;
    }
    if (current && !audio.paused) await ramp(0, 350);
    audio.pause();
    current = id;
    paused = false;
    if (!id) { audio.removeAttribute('src'); audio.load(); refresh(); return; }
    const url = await store.imageURL(id);
    if (current !== id) return;
    if (!url) { current = null; refresh(); return; }
    audio.src = url;
    start();
  }

  function toggle(song) {
    if (song.imageId !== current) { want(song); return; }
    if (audio.paused) { paused = false; start(); } else { paused = true; ramp(0, 200).then(() => audio.pause()); }
  }

  // the thing on the page you click
  function widget(song) {
    const el = songLook(song, true);
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', e => { e.stopPropagation(); toggle(song); });
    widgets.add({ el, song });
    requestAnimationFrame(refresh);
    return el;
  }

  return {
    want, toggle, widget,
    get playing() { return current && !audio.paused ? current : null; },
    stop() {
      cancelAnimationFrame(fade);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      current = null;
      widgets.clear();
    },
  };
}

// the little cassette / record. live = a button you can press
export function songLook(song, live = false) {
  const look = song.look === 'vinyl' ? 'vinyl' : 'cassette';
  const title = (song.title || '').slice(0, 26);
  return h(live ? 'button' : 'div', { type: live ? 'button' : null, class: 'song song-' + look, title: song.title || '' },
    look === 'cassette'
      ? h('span', { class: 'cs-body' },
        h('i', { class: 'cs-label' }, title),
        h('i', { class: 'cs-window' }, h('i', { class: 'cs-reel l' }), h('i', { class: 'cs-reel r' })),
        h('i', { class: 'cs-screws' }))
      : h('span', { class: 'vy' },
        h('i', { class: 'vy-sleeve' }, h('b', {}, title)),
        h('i', { class: 'vy-disc' }, h('i', { class: 'vy-label' }))),
    live ? h('span', { class: 'song-state' }) : null);
}
