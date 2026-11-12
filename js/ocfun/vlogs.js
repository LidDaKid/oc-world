// camcorder: video diary entries, played inside a camcorder viewfinder (rec dot, date stamp, battery, corner brackets).
// saved in char.fun.vlogs = { entries: [{ id, title, date ('yyyy-mm-dd'), imageId (the video) }], cur }

import { h, fill, uid, toast, confirmDialog, openModal, pickFile } from '../ui.js';
import { store, MAX_VIDEO } from '../store.js';
import { appBar, dataFor } from './kit.js';

export const meta = { id: 'vlogs', label: 'camcorder', icon: '1f4f9' };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const stamp = d => {
  const t = d ? new Date(d + 'T12:00:00') : new Date();
  return isNaN(t) ? '' : t.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase().replace(',', '');
};
const code = t => {
  t = Math.max(0, t || 0);
  const p = n => String(Math.floor(n)).padStart(2, '0');
  return `${p(t / 3600)}:${p((t % 3600) / 60)}:${p(t % 60)}`;
};

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'vlogs', { entries: [], cur: null });
  data.entries ||= [];
  const sorted = () => [...data.entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let entry = data.entries.find(e => e.id === data.cur) || sorted()[0] || null;

  const video = h('video', { class: 'cc-video', playsInline: true, preload: 'metadata' });
  const timeEl = h('span', { class: 'cc-tc' });
  const modeEl = h('span', { class: 'cc-mode' });
  const finder = h('div', { class: 'cc-finder' });
  const listBox = h('div', { class: 'cc-tapes' });
  const info = h('div', { class: 'cc-info' });

  const playing = () => !video.paused && !video.ended;
  video.addEventListener('timeupdate', () => { timeEl.textContent = code(video.currentTime); });
  for (const ev of ['play', 'pause', 'ended']) video.addEventListener(ev, () => drawFinderState());

  function drawFinderState() {
    finder.classList.toggle('rolling', playing());
    modeEl.textContent = playing() ? 'PLAY ▶' : video.ended ? 'END' : entry ? 'PAUSE ❚❚' : 'STBY';
  }

  async function load(e) {
    entry = e;
    data.cur = e?.id || null;
    video.pause();
    video.removeAttribute('src');
    if (e?.imageId) {
      const url = await store.imageURL(e.imageId);
      if (entry !== e) return;
      if (url) video.src = url;
    }
    timeEl.textContent = code(0);
    drawAll();
  }

  function toggle() {
    if (!entry?.imageId) return;
    if (playing()) video.pause();
    else {
      const btn = document.querySelector('.player:not([hidden]) .player-btn.big');
      if (btn && btn.textContent.includes('⏸')) btn.click();
      video.play().catch(() => {});
    }
  }

  function viewfinder() {
    fill(finder,
      video,
      entry ? null : h('div', { class: 'cc-static' }),
      h('div', { class: 'cc-overlay' },
        h('i', { class: 'cc-corner tl' }), h('i', { class: 'cc-corner tr' }), h('i', { class: 'cc-corner bl' }), h('i', { class: 'cc-corner br' }),
        h('div', { class: 'cc-top' }, h('span', { class: 'cc-rec' }, h('b'), 'REC'), modeEl, h('span', { class: 'cc-batt' }, h('i'), h('i'), h('i'))),
        h('div', { class: 'cc-bottom' }, h('span', { class: 'cc-date' }, entry ? stamp(entry.date) : stamp()), timeEl),
        h('div', { class: 'cc-cross' })),
      entry?.imageId ? h('button', { type: 'button', class: 'cc-hit', title: 'play', onclick: toggle }) : null);
    drawFinderState();
  }

  function drawInfo() {
    if (!entry) { fill(info); return; }
    fill(info, mine
      ? [
        h('input', { type: 'text', class: 'cc-title-in', value: entry.title, placeholder: 'title', maxLength: 80, oninput: e => { entry.title = e.target.value; save(); drawList(); } }),
        h('div', { class: 'cc-row' },
          h('input', { type: 'date', value: entry.date || '', onchange: e => { entry.date = e.target.value; save(); drawAll(); } }),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: toggle }, 'play / pause'),
          h('button', { type: 'button', class: 'link-btn danger', onclick: remove }, 'delete')),
      ]
      : [h('h3', { class: 'cc-title' }, entry.title || 'untitled'), h('div', { class: 'cc-sub' }, stamp(entry.date))]);
  }

  function drawList() {
    fill(listBox, sorted().map(e => h('button', {
      type: 'button', class: 'cc-tape' + (e === entry ? ' on' : ''), onclick: () => load(e),
    }, h('span', { class: 'cc-tape-label' }, h('span', { class: 'cc-tape-title' }, e.title || 'untitled'), h('span', { class: 'cc-tape-date' }, stamp(e.date))), h('span', { class: 'cc-tape-win' }, h('i'), h('i')))),
    mine ? h('button', { type: 'button', class: 'cc-tape add', onclick: add }, '+ new vlog') : null);
  }

  function drawAll() { viewfinder(); drawInfo(); drawList(); }

  async function add() {
    const file = await pickFile('video/*');
    if (!file) return;
    if (!file.type.startsWith('video/') || !video.canPlayType(file.type)) { toast(`${file.name} isn't a video this browser can play`, 'bad'); return; }
    if (file.size > MAX_VIDEO) { toast(`that video is too big (${MAX_VIDEO / 1e6} mb max)`, 'bad'); return; }
    const title = h('input', { type: 'text', value: file.name.replace(/\.[^.]+$/, ''), maxLength: 80, dataset: { autofocus: '' } });
    const date = h('input', { type: 'date', value: today() });
    openModal({
      title: 'new vlog', body: [title, date],
      actions: [
        { label: 'nvm', onClick: close => close() },
        { label: 'save', kind: 'primary', onClick: async close => {
          let imageId;
          try { imageId = await store.putImage(file); } catch (err) { console.error(err); toast(`couldn't save ${file.name}`, 'bad'); return; }
          const e = { id: 'vl_' + uid(), title: title.value.trim(), date: date.value || today(), imageId, createdAt: Date.now() };
          data.entries.push(e);
          save();
          close();
          load(e);
        } },
      ],
    });
  }

  async function remove() {
    if (!entry || !await confirmDialog(`delete "${entry.title || 'this vlog'}"?`, { okLabel: 'delete', danger: true })) return;
    video.pause();
    video.removeAttribute('src');
    store.deleteImage(entry.imageId);
    data.entries = data.entries.filter(x => x !== entry);
    save();
    load(sorted()[0] || null);
  }

  el.append(appBar(ctx, meta), h('div', { class: 'cc-wrap' },
    h('div', { class: 'cc-cam' }, h('div', { class: 'cc-body' }, finder), h('div', { class: 'cc-strap' })), info, listBox));
  load(entry);

  return () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}
