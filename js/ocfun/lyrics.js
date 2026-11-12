// lyrics notebook: the oc's songs written out on messy notebook pages.
// a line written as ~~like this~~ shows up scribbled out.
// saved in char.fun.lyrics = { songs: [{ id, title, text, ink, paper }], cur }

import { h, fill, uid, confirmDialog, segmented, autosize } from '../ui.js';
import { appBar, dataFor } from './kit.js';

export const meta = { id: 'lyrics', label: 'lyrics notebook', icon: '1f4dd' };

const INKS = { blue: '#2346a8', black: '#1d1820', pink: '#e8358f', purple: '#7a3fd1', red: '#c4213a', glitter: '#b1449a' };
const PAPERS = ['lined', 'grid', 'black', 'pink'];
const DOODLES = ['♡', '☆', '✿', '☾', '♪', '✦', '†'];

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'lyrics', { songs: [], cur: null });
  data.songs ||= [];
  let song = data.songs.find(s => s.id === data.cur) || data.songs[0] || null;
  let editing = false;

  function addSong() {
    const s = { id: 'ly_' + uid(), title: '', text: '', ink: 'blue', paper: 'lined', createdAt: Date.now() };
    data.songs.push(s);
    song = s;
    data.cur = s.id;
    editing = true;
    save();
    draw();
    requestAnimationFrame(() => el.querySelector('.ly-title-in')?.focus());
  }

  // the written page: each line its own row so ~~lines~~ can be scribbled out
  function writtenPage(s) {
    const lines = (s.text || '').split('\n');
    let seed = s.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const doodles = Array.from({ length: 3 }, () => h('span', { class: 'ly-doodle', style: { top: (12 + rand() * 76) + '%', left: (rand() < .5 ? 1 : 93) + '%', rotate: (rand() * 40 - 20) + 'deg' } }, DOODLES[Math.floor(rand() * DOODLES.length)]));
    return [
      h('h3', { class: 'ly-song-title' }, s.title.trim() || 'untitled'),
      h('div', { class: 'ly-lines' }, lines.map(line => {
        const m = line.trim().match(/^~~(.*)~~$/);
        if (!line.trim()) return h('div', { class: 'ly-line gap' }, ' ');
        const tilt = (rand() * 1.4 - .7).toFixed(2);
        return m
          ? h('div', { class: 'ly-line scratched', style: { rotate: tilt + 'deg' } }, h('span', {}, m[1]))
          : h('div', { class: 'ly-line', style: { rotate: tilt + 'deg' } }, line);
      })),
      doodles,
    ];
  }

  function editPage(s) {
    const area = autosize(h('textarea', { class: 'ly-text-in', value: s.text, placeholder: 'lyrics', oninput: e => { s.text = e.target.value; save(); } }));
    return [
      h('input', { type: 'text', class: 'ly-title-in', value: s.title, placeholder: 'song title', maxLength: 80, oninput: e => { s.title = e.target.value; save(); drawList(); } }),
      area,
    ];
  }

  const list = h('div', { class: 'ly-tabs' });
  const pageBox = h('div', { class: 'ly-book' });
  const tools = h('div', { class: 'ly-tools' });

  function drawList() {
    fill(list, data.songs.map((s, i) => h('button', {
      type: 'button', class: 'ly-tab' + (s === song ? ' on' : ''), style: { '--i': i % 5 },
      onclick: () => { song = s; data.cur = s.id; editing = false; save(); draw(); },
    }, s.title.trim() || 'untitled')),
    mine ? h('button', { type: 'button', class: 'ly-tab add', onclick: addSong }, '+ song') : null);
  }

  function draw() {
    drawList();
    if (!song) {
      fill(pageBox, h('div', { class: 'ly-page paper-lined ink-blue empty' }, h('div', { class: 'ly-rings' }), h('div', { class: 'ly-paper' }, h('div', { class: 'ly-lines' }, h('div', { class: 'ly-line' }, '...')))));
      fill(tools);
      return;
    }
    song.ink ||= 'blue';
    song.paper ||= 'lined';
    fill(pageBox, h('div', { class: `ly-page paper-${song.paper} ink-${song.ink}`, style: { '--ink-c': INKS[song.ink] || INKS.blue } },
      h('div', { class: 'ly-rings' }),
      h('div', { class: 'ly-paper' }, editing ? editPage(song) : writtenPage(song))));
    fill(tools, mine ? [
      h('button', { type: 'button', class: 'btn sm ' + (editing ? '' : 'ghost'), onclick: () => { editing = !editing; draw(); } }, editing ? 'done' : 'write'),
      editing ? h('button', { type: 'button', class: 'btn ghost sm', onclick: scratchLine }, 'scribble out a line') : null,
      h('div', { class: 'ly-tool-group' }, segmented(Object.keys(INKS).map(k => ({ value: k, label: k })), song.ink, v => { song.ink = v; save(); draw(); })),
      h('div', { class: 'ly-tool-group' }, segmented(PAPERS.map(k => ({ value: k, label: k })), song.paper, v => { song.paper = v; save(); draw(); })),
      h('button', { type: 'button', class: 'link-btn danger', onclick: async () => {
        if (!await confirmDialog(`tear out "${song.title || 'this song'}"?`, { okLabel: 'tear it out', danger: true })) return;
        data.songs = data.songs.filter(x => x !== song);
        song = data.songs[0] || null;
        data.cur = song?.id || null;
        save();
        draw();
      } }, 'tear out'),
    ] : []);
  }

  // wraps the line the cursor is on in ~~ ~~ (or unwraps it)
  function scratchLine() {
    const area = el.querySelector('.ly-text-in');
    if (!area) return;
    const v = area.value, pos = area.selectionStart;
    const start = v.lastIndexOf('\n', pos - 1) + 1;
    let end = v.indexOf('\n', pos);
    if (end < 0) end = v.length;
    const line = v.slice(start, end);
    const m = line.trim().match(/^~~(.*)~~$/);
    const next = m ? m[1] : line.trim() ? `~~${line}~~` : line;
    area.value = v.slice(0, start) + next + v.slice(end);
    song.text = area.value;
    save();
    area.focus();
    area.setSelectionRange(start + next.length, start + next.length);
  }

  el.append(appBar(ctx, meta), h('div', { class: 'ly-wrap' }, list, pageBox, tools));
  draw();
}
