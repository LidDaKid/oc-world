// mash: the sleepover game on notebook paper. fill the lists, hold to draw the spiral (how many rings = the magic
// number), then it counts around every list crossing out every Nth thing until one is left in each. that's their future.
// saved in char.fun.mash = { lists: { [cat]: [strings] }, custom: [{ id, name, items }], results: [{ id, at, n, picks: [{ label, value }] }] }

import { h, fill, uid, toast, confirmDialog } from '../ui.js';
import { appBar, nameOf, worldmates, fmtDate } from './kit.js';

export const meta = { id: 'mash', label: 'mash', icon: '1f3e0' };

const HOME = ['mansion', 'apartment', 'shack', 'house'];
const CATS = [
  { id: 'partner', label: 'partner', start: [] },
  { id: 'kids', label: 'kids', start: ['0', '1', '3', '12'] },
  { id: 'car', label: 'car', start: ['pink convertible', 'hearse', 'minivan', 'bike'] },
  { id: 'job', label: 'job', start: ['rock star', 'vampire hunter', 'fashion designer', 'mall cop'] },
  { id: 'city', label: 'city', start: ['new salem', 'paris', 'tokyo', 'their hometown'] },
  { id: 'pet', label: 'pet', start: ['bat', 'cat', 'spider', 'goldfish'] },
];
const MAX = 6;
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.lists ||= {};
  for (const c of CATS) if (!Array.isArray(d.lists[c.id])) d.lists[c.id] = c.id === 'partner' ? worldmates(char.id).slice(0, 4).map(nameOf) : [...c.start];
  d.custom ||= [];
  d.results ||= [];

  let playing = null; // { n, items: [{ cat, label, text, out, el }], ... } while a game runs
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };

  const body = h('div', { class: 'msh' });
  el.append(appBar(ctx, meta), body);

  const allCats = () => [
    { id: 'home', label: 'm.a.s.h.', items: HOME, fixed: true },
    ...CATS.map(c => ({ id: c.id, label: c.label, items: d.lists[c.id] })),
    ...d.custom.map(c => ({ id: c.id, label: c.name || 'something', items: c.items, custom: c })),
  ];

  function draw() {
    fill(body,
      h('div', { class: 'msh-paper' },
        h('div', { class: 'msh-head' },
          h('div', { class: 'msh-letters' }, ['m', 'a', 's', 'h'].map(l => h('span', {}, l))),
          h('div', { class: 'msh-who' }, nameOf(char)),
          spiral()),
        h('div', { class: 'msh-grid' }, allCats().map(catBox)),
        mine && !playing ? h('div', { class: 'msh-under' },
          h('button', { class: 'btn ghost sm', onclick: () => { d.custom.push({ id: 'mc_' + uid(), name: '', items: ['', ''] }); save(); draw(); } }, '+ list')) : null),
      results());
  }

  function catBox(c) {
    const items = c.items;
    const box = h('div', { class: 'msh-cat' + (c.fixed ? ' fixed' : ''), dataset: { cat: c.id } });
    const title = c.custom && mine && !playing
      ? h('input', { type: 'text', class: 'msh-cat-name', value: c.custom.name, placeholder: 'list name', maxLength: 24, oninput: e => { c.custom.name = e.target.value; save(); } })
      : h('div', { class: 'msh-cat-name' }, c.label);
    box.append(h('div', { class: 'msh-cat-head' }, title,
      c.custom && mine && !playing ? h('button', { type: 'button', class: 'icon-btn sm', title: 'remove', onclick: async () => {
        if (c.custom.items.some(Boolean) && !await confirmDialog('remove this list?', { okLabel: 'remove', danger: true })) return;
        d.custom = d.custom.filter(x => x !== c.custom); save(); draw();
      } }, '✕') : null));
    const ol = h('ol', { class: 'msh-items' });
    items.forEach((t, i) => {
      const li = h('li', { class: 'msh-item', dataset: { cat: c.id, i } });
      if (mine && !playing && !c.fixed) {
        li.append(h('input', { type: 'text', value: t, maxLength: 40, oninput: e => { items[i] = e.target.value; save(); } }),
          h('button', { type: 'button', class: 'msh-x', title: 'remove', onclick: () => { items.splice(i, 1); save(); draw(); } }, '✕'));
      } else li.append(h('span', { class: 'msh-t' }, t || '...'));
      ol.append(li);
    });
    box.append(ol);
    if (mine && !playing && !c.fixed && items.length < MAX) {
      box.append(h('button', { type: 'button', class: 'msh-add', onclick: () => { items.push(''); save(); draw(); } }, '+'));
    }
    if (c.id === 'partner' && mine && !playing) {
      const mates = worldmates(char.id).filter(o => !items.includes(nameOf(o)));
      if (mates.length && items.length < MAX) {
        box.append(h('div', { class: 'msh-mates' }, mates.slice(0, 6).map(o => h('button', { type: 'button', class: 'msh-mate', style: { '--c': o.color },
          onclick: () => { const blank = items.indexOf(''); if (blank >= 0) items[blank] = nameOf(o); else items.push(nameOf(o)); save(); draw(); } }, '+ ' + nameOf(o)))));
      }
    }
    return box;
  }

  // ---- the spiral: hold it down to draw, more rings = bigger magic number ----
  function spiral() {
    const wrap = h('div', { class: 'msh-spiral-wrap' });
    if (!mine) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-60 -60 120 120');
    svg.setAttribute('class', 'msh-spiral');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'msh-spiral-line');
    svg.append(path);
    const numEl = h('div', { class: 'msh-num' }, playing ? String(playing.n) : '');
    const drawSpiral = turns => {
      let dstr = 'M0 0';
      const steps = Math.max(2, Math.round(turns * 40));
      for (let i = 1; i <= steps; i++) {
        const a = (i / 40) * Math.PI * 2, r = (i / 40) * 7.2;
        dstr += ` L${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
      }
      path.setAttribute('d', dstr);
    };
    let holding = false, t0 = 0, raf = 0;
    const tick = () => {
      if (!holding) return;
      const turns = Math.min(7.6, .4 + (performance.now() - t0) / 380);
      drawSpiral(turns);
      raf = requestAnimationFrame(tick);
    };
    const pad = h('button', {
      type: 'button', class: 'msh-pad', disabled: !!playing, title: 'hold to draw the spiral',
      onpointerdown: e => {
        if (playing || !ready()) { if (!ready()) toast('every list needs at least 2 things'); return; }
        e.preventDefault();
        pad.setPointerCapture(e.pointerId);
        holding = true; t0 = performance.now();
        raf = requestAnimationFrame(tick);
      },
      onpointerup: () => {
        if (!holding) return;
        holding = false;
        cancelAnimationFrame(raf);
        const turns = Math.min(7.6, .4 + (performance.now() - t0) / 380);
        const n = Math.max(3, Math.min(9, Math.round(turns + 1.6)));
        drawSpiral(turns);
        // the line across the spiral, then count
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0'); line.setAttribute('y1', '-58'); line.setAttribute('x2', '0'); line.setAttribute('y2', '0');
        line.setAttribute('class', 'msh-cut');
        svg.append(line);
        numEl.textContent = String(n);
        numEl.classList.add('pop');
        play(n);
      },
    }, svg, numEl);
    if (playing) drawSpiral(Math.min(7.6, playing.n - 1.6));
    wrap.append(h('div', { class: 'msh-spiral-label' }, 'spiral'), pad);
    return wrap;
  }

  const ready = () => allCats().every(c => c.items.filter(t => t.trim()).length >= 2 || c.items.filter(t => t.trim()).length === 0) && allCats().some(c => c.items.filter(t => t.trim()).length >= 2);

  // ---- play: count around crossing out every nth, skipping lists that are down to one ----
  function play(n) {
    stop();
    const cats = allCats().map(c => ({ ...c, live: c.items.filter(t => t.trim()) })).filter(c => c.live.length);
    playing = { n, cats };
    draw();
    // the order you count in: every list top to bottom, round and round
    const slots = [];
    for (const c of cats) c.live.forEach((t, i) => slots.push({ cat: c.id, i: c.items.indexOf(t), text: t, out: false }));
    const left = cat => slots.filter(s => s.cat === cat && !s.out).length;
    const done = () => cats.every(c => left(c.id) <= 1);
    const nodeOf = s => body.querySelector(`.msh-item[data-cat="${s.cat}"][data-i="${s.i}"]`);
    let at = -1;
    const fast = calm();
    const step = () => {
      if (!body.isConnected) return;
      if (done()) return finish(slots, cats);
      let count = 0;
      while (count < n) {
        at = (at + 1) % slots.length;
        const s = slots[at];
        if (!s.out && left(s.cat) > 1) count++;
      }
      const s = slots[at];
      s.out = true;
      const node = nodeOf(s);
      if (node) {
        node.classList.add('out');
        if (!fast) { node.classList.add('hit'); setTimeout(() => node.classList.remove('hit'), 300); }
      }
      // a list down to one = circled
      if (left(s.cat) === 1) {
        const last = slots.find(x => x.cat === s.cat && !x.out);
        nodeOf(last)?.classList.add('kept');
      }
      timer = setTimeout(step, fast ? 0 : 420);
    };
    // lists that only had one thing are kept right away
    for (const c of cats) if (c.live.length === 1) requestAnimationFrame(() => nodeOf(slots.find(s => s.cat === c.id))?.classList.add('kept'));
    timer = setTimeout(step, fast ? 0 : 700);
  }

  function finish(slots, cats) {
    const picks = cats.map(c => ({ label: c.fixed ? 'lives in a' : c.label, value: slots.find(s => s.cat === c.id && !s.out).text }));
    const res = { id: 'mr_' + uid(), at: Date.now(), n: playing.n, picks };
    d.results.unshift(res);
    d.results = d.results.slice(0, 12);
    save();
    timer = setTimeout(() => { playing = null; draw(); body.querySelector('.msh-result')?.classList.add('fresh'); }, calm() ? 0 : 900);
  }

  function results() {
    if (!d.results.length) return null;
    const [latest, ...older] = d.results;
    return h('div', { class: 'msh-results' },
      futureCard(latest, true),
      older.length ? h('div', { class: 'msh-older' }, older.map(r => futureCard(r, false))) : null);
  }
  function futureCard(r, big) {
    return h('div', { class: 'msh-result' + (big ? ' big' : '') },
      h('div', { class: 'msh-result-head' },
        h('span', { class: 'msh-result-title' }, 'their future'),
        h('span', { class: 'msh-result-n' }, '#' + r.n),
        h('span', { class: 'msh-result-date' }, fmtDate(r.at)),
        mine ? h('button', { type: 'button', class: 'msh-x', title: 'remove', onclick: () => { d.results = d.results.filter(x => x !== r); save(); draw(); } }, '✕') : null),
      h('div', { class: 'msh-picks' }, r.picks.map(p => h('div', { class: 'msh-pick' }, h('span', { class: 'msh-pick-k' }, p.label), h('span', { class: 'msh-pick-v' }, p.value)))));
  }

  draw();
  return () => stop();
}
