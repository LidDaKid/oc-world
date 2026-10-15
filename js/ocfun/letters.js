// letters: write a letter from this oc to another oc (or a typed name). pick the stationery, handwriting,
// ink + sign-off, seal it in an envelope with a wax seal + stamp. letters land in BOTH ocs' letters app
// (the sender's "sent" and the other oc's "inbox"), opening one plays the unfold, and replies thread.
//
// a letter lives with whoever wrote it (char.fun.letters.letters). an oc's inbox is found by looking
// through every oc's letters for ones addressed to them.

import { h, s, fill, uid, openModal, confirmDialog, swatches, toast, autosize, initials } from '../ui.js';
import { store } from '../store.js';
import { dataFor, sticker, appBar, portrait, nameOf, ocById } from './kit.js';
import { who, face, freshRef, pickWho } from './phone-bits.js';

export const meta = { id: 'letters', label: 'letters', icon: '1f48c' };

export const PAPERS = [
  ['lined', 'lined'], ['floral', 'floral'], ['notebook', 'ripped notebook'], ['scented', 'scented pink'],
  ['midnight', 'black + silver'], ['parchment', 'old parchment'], ['stardew', 'farm letter'], ['graph', 'graph paper'],
];
export const FONTS = [
  ['caveat', 'Caveat'], ['indie', 'Indie Flower'], ['homemade', 'Homemade Apple'], ['reenie', 'Reenie Beanie'],
  ['shadows', 'Shadows Into Light'], ['patrick', 'Patrick Hand'], ['gloria', 'Gloria Hallelujah'],
  ['typewriter', 'Special Elite'], ['gothic', 'UnifrakturMaguntia'], ['pixel', 'Pixelify Sans'],
];
const INKS = ['#1d1a22', '#22337a', '#5b2a86', '#e0287a', '#b3122e', '#c9ccd6', '#c9a227', '#1f6b4f'];
const SIGNOFFS = ['love,', 'xoxo,', 'yours forever,', 'your bff,', 'miss you,', 'bye bye,', 'stay spooky,', 'sincerely,', 'with all my heart,'];
const SEALS = [['wax', null], ['heart', '1f496'], ['kiss', '1f48b'], ['bat', '1f987'], ['star', '2b50'], ['skull', '1f480'], ['bow', '1f380'], ['rose', '1f339']];
const WAX = ['#9e1b32', '#141114', '#d63384', '#5b2a86', '#c9a227', '#1f4e79', '#c0c0c8'];
const ENVS = ['#fbf7ef', '#d9b98c', '#ffc6dd', '#1d1a22', '#d9c8f0', '#b3122e', '#bfe3ff'];
const STAMPS = ['1f987', '1f339', '1f344', '1f98b', '1f319', '1f353', '1f3b8', '1f431', '1f5a4', '2b50', '1f47b', '1f308', '1f9db-200d-2640-fe0f', '1f52e', '1f3a7', '1f380'];

const allLetters = () => store.chars.flatMap(c => (c.fun?.letters?.letters || []).map(l => ({ l, owner: c })));
const fmtDay = ts => new Date(ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
const isDark = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return false; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110; };

export function render(el, ctx) {
  const { char, mine } = ctx;
  const d = dataFor(char, 'letters', { letters: [], opened: [] });
  d.opened ||= [];
  const save = () => ctx.save();
  let tab = 'inbox';
  const body = h('div', { class: 'lt-body' });
  let overlay = null;

  const inbox = () => allLetters().filter(x => x.l.to?.id === char.id).sort((a, b) => b.l.at - a.l.at);
  const sent = () => d.letters.filter(l => l.from?.id === char.id).map(l => ({ l, owner: char })).sort((a, b) => b.l.at - a.l.at);
  const unreadCount = () => inbox().filter(x => !d.opened.includes(x.l.id)).length;

  function draw() {
    const box = tab === 'inbox' ? inbox() : sent();
    const n = unreadCount();
    fill(body,
      h('div', { class: 'lt-top' },
        h('div', { class: 'lt-tabs' },
          h('button', { type: 'button', class: 'lt-tab' + (tab === 'inbox' ? ' on' : ''), onclick: () => { tab = 'inbox'; draw(); } }, sticker('1f4ec', 'lt-tab-stk'), 'inbox', n ? h('span', { class: 'lt-badge' }, n) : null),
          h('button', { type: 'button', class: 'lt-tab' + (tab === 'sent' ? ' on' : ''), onclick: () => { tab = 'sent'; draw(); } }, sticker('1f4ee', 'lt-tab-stk'), 'sent', h('span', { class: 'lt-count' }, sent().length))),
        mine ? h('button', { type: 'button', class: 'btn primary', onclick: () => compose() }, '✎ write a letter') : null),
      box.length ? h('div', { class: 'lt-pile' }, box.map((x, i) => envCard(x, i)))
        : h('div', { class: 'lt-empty' }, sticker(tab === 'inbox' ? '1f4ed' : '1f48c', 'lt-empty-stk'), mine && tab === 'sent' ? h('button', { type: 'button', class: 'btn primary sm', onclick: () => compose() }, 'write one') : null));
  }

  // ---- envelopes ----
  function envFront(l, { postmark = true } = {}) {
    const to = who(l.to), from = who(l.from);
    return h('div', { class: 'lt-front', style: envStyle(l) },
      h('div', { class: 'lt-return' }, h('span', {}, from.name)),
      h('div', { class: 'lt-stamp' }, h('div', { class: 'lt-stamp-in' }, sticker(l.stamp || '1f987', 'lt-stamp-stk')), h('span', { class: 'lt-stamp-val' }, '44')),
      postmark ? postmarkEl(l.at) : null,
      h('div', { class: 'lt-address font-' + (l.font || 'caveat') }, h('span', { class: 'lt-to-label' }, 'to'), h('b', {}, to.name)),
      h('i', { class: 'lt-airmail' }));
  }
  const envStyle = l => {
    const env = l.env || ENVS[0], ink = l.ink || INKS[0];
    const addr = isDark(env) ? (isDark(ink) ? '#f1ecf5' : ink) : (ink === INKS[5] ? '#6b6672' : ink);
    return { '--env': env, '--env-ink': isDark(env) ? '#f1ecf5' : '#2a2030', '--ink': ink, '--addr': addr, '--wax': l.seal?.color || WAX[0] };
  };
  function postmarkEl(ts) {
    const date = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase();
    return h('div', { class: 'lt-postmark' }, s('svg', { viewBox: '0 0 120 60' },
      s('circle', { cx: 30, cy: 30, r: 24, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
      s('circle', { cx: 30, cy: 30, r: 17, fill: 'none', stroke: 'currentColor', 'stroke-width': 1 }),
      s('text', { x: 30, y: 27, 'text-anchor': 'middle', 'font-size': 7, fill: 'currentColor', 'font-family': 'monospace', 'font-weight': 700 }, 'oc post'),
      s('text', { x: 30, y: 37, 'text-anchor': 'middle', 'font-size': 7, fill: 'currentColor', 'font-family': 'monospace' }, date),
      [0, 1, 2, 3].map(i => s('path', { d: `M58 ${15 + i * 10} q8 -5 16 0 t16 0 t16 0 t16 0`, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8 }))));
  }
  function sealEl(l, cls = '') {
    const kind = SEALS.find(x => x[0] === l.seal?.kind) || SEALS[0];
    if (!kind[1]) return h('div', { class: 'lt-seal wax ' + cls }, h('span', {}, initials(who(l.from).name).slice(0, 1)), h('i', { class: 'lt-seal-half a' }), h('i', { class: 'lt-seal-half b' }));
    return h('div', { class: 'lt-seal stk ' + cls }, sticker(kind[1], 'lt-seal-stk'));
  }
  function envCard({ l, owner }, i) {
    const unread = tab === 'inbox' && !d.opened.includes(l.id);
    const isReply = !!l.replyTo;
    return h('button', {
      type: 'button', class: 'lt-card' + (unread ? ' unread' : ''), style: { '--r': (((i * 37) % 9) - 4) * 0.7 + 'deg', animationDelay: i * 0.05 + 's' },
      onclick: () => read(l),
    }, envFront(l),
      h('div', { class: 'lt-card-meta' },
        tab === 'inbox' ? [face(l.from, 'xs'), h('span', {}, who(l.from).name)] : [face(l.to, 'xs'), h('span', {}, who(l.to).name)],
        isReply ? h('em', { class: 'lt-re' }, 're:') : null,
        h('time', {}, new Date(l.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase())),
      unread ? h('span', { class: 'lt-new' }, 'new') : null);
  }

  // ---- the letter paper ----
  function paperEl(l, edit = null) {
    const paper = h('div', { class: `lt-paper paper-${l.paper || 'lined'} font-${l.font || 'caveat'}`, style: { '--ink': l.ink || INKS[0] } });
    const deco = paperDeco(l.paper);
    if (edit) {
      const greet = h('input', { type: 'text', class: 'lt-greet', value: l.greeting, maxLength: 80, oninput: e => { l.greeting = e.target.value; } });
      const ta = autosize(h('textarea', { class: 'lt-text', value: l.text, maxLength: 6000, rows: 6, oninput: e => { l.text = e.target.value; } }));
      const signoff = h('input', { type: 'text', class: 'lt-signoff', value: l.signoff, maxLength: 40, oninput: e => { l.signoff = e.target.value; } });
      signoff.setAttribute('list', 'lt-signoffs');
      const sign = h('input', { type: 'text', class: 'lt-sign', value: l.sign, maxLength: 40, oninput: e => { l.sign = e.target.value; } });
      fill(paper, deco,
        h('div', { class: 'lt-date' }, fmtDay(l.at)),
        greet, ta,
        h('div', { class: 'lt-close' }, signoff, sign),
        h('datalist', { id: 'lt-signoffs' }, SIGNOFFS.map(v => h('option', { value: v }))));
      edit.focus = () => ta.focus();
    } else {
      fill(paper, deco,
        h('div', { class: 'lt-date' }, fmtDay(l.at)),
        l.greeting ? h('div', { class: 'lt-greet' }, l.greeting) : null,
        h('div', { class: 'lt-text' }, l.text),
        h('div', { class: 'lt-close' }, h('div', { class: 'lt-signoff' }, l.signoff), h('div', { class: 'lt-sign' }, l.sign)));
    }
    return paper;
  }
  function paperDeco(kind) {
    if (kind === 'floral') return [sticker('1f339', 'lt-flower f1'), sticker('1f338', 'lt-flower f2'), sticker('1f337', 'lt-flower f3'), sticker('1f33c', 'lt-flower f4')];
    if (kind === 'notebook') return h('div', { class: 'lt-holes' }, Array.from({ length: 9 }, () => h('i')));
    if (kind === 'scented') return [h('div', { class: 'lt-scent' }, Array.from({ length: 7 }, (_, i) => h('i', { style: { left: 8 + i * 13 + '%', animationDelay: i * 0.5 + 's' } }, i % 2 ? '♡' : '✧'))), sticker('1f48b', 'lt-kiss')];
    if (kind === 'midnight') return h('div', { class: 'lt-stars' });
    if (kind === 'stardew') return [h('div', { class: 'lt-sdv-top' }), h('div', { class: 'lt-sdv-bottom' })];
    return null;
  }

  // ---- reading (with the unfold) ----
  function threadOf(l) {
    const root = l.thread || l.id;
    return allLetters().map(x => x.l).filter(x => (x.thread || x.id) === root).sort((a, b) => a.at - b.at);
  }
  function read(l, { skipAnim = false } = {}) {
    closeOverlay();
    const toMe = l.to?.id === char.id;
    if (toMe && mine && !d.opened.includes(l.id)) { d.opened.push(l.id); save(); }
    const thread = threadOf(l);
    const at = thread.indexOf(l);
    const env = h('div', { class: 'lt-env3d', style: envStyle(l) },
      h('div', { class: 'lt-env-inside' }),
      h('div', { class: `lt-sheet paper-${l.paper || 'lined'}` }, h('i'), h('i')),
      h('div', { class: 'lt-pocket' }),
      h('div', { class: 'lt-flap' }),
      sealEl(l, 'on-flap'));
    const real = paperEl(l);
    real.classList.add('lt-real');
    const unfold = h('div', { class: 'lt-unfold' });
    const scene = h('div', { class: 'lt-scene' }, env, unfold, h('div', { class: 'lt-real-wrap' }, real));
    const canReply = mine && toMe && !!l.from;
    const bar = h('div', { class: 'lt-reader-bar' },
      thread.length > 1 ? h('button', { type: 'button', class: 'btn ghost sm', disabled: at <= 0, onclick: () => read(thread[at - 1], { skipAnim: true }) }, '‹ earlier') : null,
      thread.length > 1 ? h('span', { class: 'lt-thread-n' }, `${at + 1} / ${thread.length}`) : null,
      thread.length > 1 ? h('button', { type: 'button', class: 'btn ghost sm', disabled: at >= thread.length - 1, onclick: () => read(thread[at + 1], { skipAnim: true }) }, 'later ›') : null,
      h('span', { class: 'lt-bar-gap' }),
      mine && l.from?.id === char.id && d.letters.includes(l) ? h('button', {
        type: 'button', class: 'btn danger sm', onclick: async () => {
          if (!(await confirmDialog('throw this letter away?', { danger: true, okLabel: 'throw away' }))) return;
          d.letters = d.letters.filter(x => x !== l);
          save();
          closeOverlay();
          draw();
        },
      }, 'throw away') : null,
      canReply ? h('button', { type: 'button', class: 'btn primary sm', onclick: () => { closeOverlay(); compose(l); } }, '↩ write back') : null,
      h('button', { type: 'button', class: 'btn sm', onclick: () => closeOverlay() }, 'close'));
    overlay = h('div', { class: 'lt-reader', onclick: e => { if (e.target === overlay) finish(); } },
      h('div', { class: 'lt-from-line' }, face(l.from, 'sm'), h('span', {}, who(l.from).name), h('span', { class: 'lt-arrow' }, '→'), face(l.to, 'sm'), h('span', {}, who(l.to).name)),
      scene, bar);
    document.body.append(overlay);
    document.addEventListener('keydown', escClose, true);
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      scene.classList.add('read');
      env.remove();
      unfold.remove();
    }
    overlay.finish = finish;
    if (skipAnim) { finish(); return; }
    scene.addEventListener('click', e => { if (!done && !e.target.closest('button')) finish(); });
    // build the 3 folded panels from a measured copy of the letter
    requestAnimationFrame(() => {
      const H = real.offsetHeight, W = real.offsetWidth;
      const third = Math.ceil(H / 3);
      fill(unfold, [0, 1, 2].map(i => {
        const copy = paperEl(l);
        copy.style.width = W + 'px';
        copy.style.height = H + 'px';
        copy.style.minHeight = '0';
        copy.style.transform = `translateY(${-third * i}px)`;
        return h('div', { class: 'lt-panel p' + i, style: { height: (i === 2 ? H - third * 2 : third) + 'px' } },
          h('div', { class: 'lt-panel-in' }, copy),
          h('div', { class: `lt-panel-back paper-${l.paper || 'lined'}` }));
      }));
      unfold.style.width = W + 'px';
      scene.classList.add('go');
      later(650, () => scene.classList.add('crack'));
      later(1050, () => scene.classList.add('flap'));
      later(1650, () => scene.classList.add('slide'));
      later(2250, () => scene.classList.add('unfolding'));
      later(2700, () => scene.classList.add('unfold1'));
      later(3250, () => scene.classList.add('unfold2'));
      later(3900, finish);
    });
    overlay.timers = timers;
  }
  const escClose = e => { if (e.key === 'Escape' && overlay && !document.querySelector('.modal-wrap')) { e.stopImmediatePropagation(); closeOverlay(); } };
  function closeOverlay() {
    if (!overlay) return;
    overlay.timers?.forEach(clearTimeout);
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', escClose, true);
    draw();
  }

  // ---- writing ----
  function compose(replyTo = null) {
    const last = d.letters.at(-1);
    const l = {
      id: 'l_' + uid(), to: replyTo ? freshRef(replyTo.from) : null, from: { id: char.id, name: nameOf(char) },
      greeting: '', text: '', signoff: last?.signoff || 'love,', sign: nameOf(char).split(/\s+/)[0],
      paper: replyTo?.paper || last?.paper || 'lined', font: last?.font || 'caveat', ink: last?.ink || INKS[0],
      env: last?.env || ENVS[0], seal: { kind: last?.seal?.kind || 'wax', color: last?.seal?.color || WAX[0] }, stamp: last?.stamp || STAMPS[0],
      at: Date.now(), replyTo: replyTo?.id || null, thread: replyTo ? (replyTo.thread || replyTo.id) : null,
    };
    if (l.to) l.greeting = `dear ${who(l.to).name.split(/\s+/)[0].toLowerCase()},`;
    const paperBox = h('div', { class: 'lt-write-paper' });
    const edit = {};
    const drawPaper = () => { fill(paperBox, paperEl(l, edit)); };
    drawPaper();
    const whoBox = h('div', { class: 'lt-who' });
    const drawWho = () => fill(whoBox,
      h('span', { class: 'field-label' }, 'to'),
      l.to ? h('button', { type: 'button', class: 'lt-who-chip', onclick: pickTo }, face(l.to, 'sm'), h('b', {}, who(l.to).name), ' ▾')
        : h('button', { type: 'button', class: 'btn primary sm', onclick: pickTo }, 'pick who'),
      h('span', { class: 'field-label lt-from-label' }, 'from'),
      h('button', { type: 'button', class: 'lt-who-chip', onclick: pickFrom }, face(l.from, 'sm'), h('b', {}, who(l.from).name), ' ▾'));
    async function pickTo() {
      const r = await pickWho({ title: 'to', not: char.id, okLabel: 'send to them' });
      if (!r) return;
      const oldFirst = l.to ? who(l.to).name.split(/\s+/)[0].toLowerCase() : null;
      l.to = r;
      const first = who(r).name.split(/\s+/)[0].toLowerCase();
      if (!l.greeting || (oldFirst && l.greeting === `dear ${oldFirst},`)) l.greeting = `dear ${first},`;
      drawWho();
      drawPaper();
    }
    // a letter can be from this oc, or from a typed name to this oc (it shows in their inbox)
    async function pickFrom() {
      const choices = h('div', { class: 'lt-from-pick' },
        h('button', { type: 'button', class: 'who-pick-oc', style: { '--c': char.color }, onclick: () => { l.from = { id: char.id, name: nameOf(char) }; if (l.to?.id === char.id) l.to = null; m.close(); drawWho(); } }, portrait(char, 'md'), h('span', {}, nameOf(char))));
      const name = h('input', { type: 'text', placeholder: 'type a name', maxLength: 60 });
      const m = openModal({
        title: 'from', body: h('div', { class: 'who-pick' }, choices, h('div', { class: 'who-pick-typed' }, name)),
        actions: [{ label: 'from them', kind: 'primary', onClick: close => { const v = name.value.trim(); if (!v) return name.focus(); l.from = { id: null, name: v }; l.to = { id: char.id, name: nameOf(char) }; l.sign = v; close(); drawWho(); drawPaper(); } }],
      });
    }
    drawWho();

    const pickRow = (items, cur, onPick, render) => {
      const row = h('div', { class: 'lt-picks' });
      const drawRow = () => fill(row, items.map(it => h('button', { type: 'button', class: 'lt-pick' + (cur() === it[0] ? ' on' : ''), title: it[1], onclick: () => { onPick(it[0]); drawRow(); } }, render(it))));
      drawRow();
      return row;
    };
    const envPrev = h('div', { class: 'lt-env-prev' });
    const drawEnv = () => fill(envPrev, h('div', { class: 'lt-env-mini', style: envStyle(l) }, envFront(l, { postmark: false }), sealEl(l, 'mini-seal')));
    drawEnv();
    const sec = (label, ...kids) => h('div', { class: 'lt-sec' }, h('span', { class: 'field-label' }, label), ...kids);

    const panel = h('div', { class: 'lt-opts' },
      whoBox,
      sec('stationery', pickRow(PAPERS, () => l.paper, v => { l.paper = v; if (v === 'midnight' && l.ink === INKS[0]) l.ink = INKS[5]; if (v !== 'midnight' && l.ink === INKS[5]) l.ink = INKS[0]; drawPaper(); }, ([v, label]) => [h('i', { class: `lt-paper-chip paper-${v}` }), h('span', {}, label)])),
      sec('handwriting', pickRow(FONTS, () => l.font, v => { l.font = v; drawPaper(); drawEnv(); }, ([v]) => h('span', { class: `lt-font-chip font-${v}` }, 'xoxo'))),
      sec('ink', swatches(l.ink, c => { l.ink = c; paperBox.querySelector('.lt-paper')?.style.setProperty('--ink', c); drawEnv(); }, INKS)),
      sec('envelope', envPrev,
        h('div', { class: 'lt-sub' }, swatches(l.env, c => { l.env = c; drawEnv(); }, ENVS)),
        h('span', { class: 'field-label lt-mini-label' }, 'seal'),
        pickRow(SEALS, () => l.seal.kind, v => { l.seal.kind = v; drawEnv(); }, ([v, code]) => code ? sticker(code) : h('i', { class: 'lt-wax-chip', style: { '--wax': l.seal.color } })),
        h('div', { class: 'lt-sub' }, swatches(l.seal.color, c => { l.seal.color = c; drawEnv(); panel.querySelectorAll('.lt-wax-chip').forEach(x => x.style.setProperty('--wax', c)); }, WAX)),
        h('span', { class: 'field-label lt-mini-label' }, 'stamp'),
        pickRow(STAMPS.map(c => [c, '']), () => l.stamp, v => { l.stamp = v; drawEnv(); }, ([c]) => h('span', { class: 'lt-stamp-chip' }, sticker(c)))));

    const writer = h('div', { class: 'lt-writer' },
      h('div', { class: 'lt-writer-top' },
        h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { if ((l.text.trim()) && !(await confirmDialog('toss this letter?', { okLabel: 'toss it' }))) return; draw(); } }, '‹ back'),
        replyTo ? h('span', { class: 'lt-replying' }, '↩ ', who(replyTo.from).name) : null,
        h('button', { type: 'button', class: 'btn primary', onclick: () => seal(l, paperBox) }, '💌 seal it')),
      h('div', { class: 'lt-write-grid' }, paperBox, panel));
    fill(body, writer);
    setTimeout(() => (l.to ? edit.focus?.() : null), 100);
  }

  // ---- sealing (fold, into the envelope, seal, stamp, off it goes) ----
  function seal(l, paperBox) {
    if (!l.to) { toast('pick who it goes to', 'bad'); return; }
    if (!l.text.trim()) { toast('write something first', 'bad'); paperBox.querySelector('.lt-text')?.focus(); return; }
    l.to = freshRef(l.to);
    l.from = freshRef(l.from);
    l.at = Date.now();
    const paperNow = paperBox.querySelector('.lt-paper');
    const W = paperNow.offsetWidth, H = paperNow.offsetHeight;
    const third = Math.ceil(H / 3);
    const scale = Math.min(1, (window.innerHeight * 0.62) / H, (window.innerWidth * 0.9) / W);
    const stat = { ...l };
    const panels = h('div', { class: 'lt-unfold folding', style: { width: W + 'px', '--sc': scale } }, [0, 1, 2].map(i => {
      const copy = paperEl(stat);
      copy.style.width = W + 'px';
      copy.style.height = H + 'px';
      copy.style.minHeight = '0';
      copy.style.transform = `translateY(${-third * i}px)`;
      return h('div', { class: 'lt-panel p' + i, style: { height: (i === 2 ? H - third * 2 : third) + 'px' } },
        h('div', { class: 'lt-panel-in' }, copy),
        h('div', { class: `lt-panel-back paper-${l.paper}` }));
    }));
    const env = h('div', { class: 'lt-env3d sealing', style: envStyle(l) },
      h('div', { class: 'lt-env-face back' },
        h('div', { class: 'lt-env-inside' }),
        h('div', { class: `lt-sheet paper-${l.paper}` }, h('i'), h('i')),
        h('div', { class: 'lt-pocket' }),
        h('div', { class: 'lt-flap open' }),
        sealEl(l, 'on-flap')),
      h('div', { class: 'lt-env-face front' }, envFront(l, { postmark: false }), h('div', { class: 'lt-pm-wrap' }, postmarkEl(l.at))));
    const scene = h('div', { class: 'lt-scene sealing' }, panels, env);
    const ov = h('div', { class: 'lt-reader sealing' }, scene);
    document.body.append(ov);
    // save right away; the show is just for fun
    d.letters.push(l);
    save();
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const end = () => { timers.forEach(clearTimeout); ov.remove(); tab = 'sent'; draw(); toast(`sent to ${who(l.to).name} 💌`); };
    ov.addEventListener('click', end);
    requestAnimationFrame(() => {
      scene.classList.add('go');
      later(300, () => scene.classList.add('fold1'));
      later(800, () => scene.classList.add('fold2'));
      later(1350, () => scene.classList.add('shrink'));
      later(1900, () => scene.classList.add('insert'));
      later(2500, () => scene.classList.add('close'));
      later(3000, () => scene.classList.add('stamp'));
      later(3600, () => scene.classList.add('flip'));
      later(4200, () => scene.classList.add('postmark'));
      later(4900, () => scene.classList.add('fly'));
      later(5600, end);
    });
  }

  el.append(appBar(ctx, meta), body);
  draw();
  return () => { if (overlay) { overlay.timers?.forEach(clearTimeout); overlay.remove(); document.removeEventListener('keydown', escClose, true); } };
}
