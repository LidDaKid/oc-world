// answering machine: a 2000s answering machine full of voicemails from other ocs.
// a voicemail can be typed, recorded for real (the microphone), or both.
// saved in char.fun.answering = { msgs: [{ id, from (oc id or null), name, text, imageId (the recording), at, heard }], color }

import { h, fill, uid, toast, confirmDialog, openModal, swatches } from '../ui.js';
import { store } from '../store.js';
import { appBar, dataFor, portrait, nameOf, worldmates } from './kit.js';

export const meta = { id: 'answering', label: 'answering machine', icon: '260e-fe0f' };

const SHELLS = ['#ff4fa3', '#1d1820', '#b18cff', '#f2eef6', '#ff5d6c', '#7df9d0'];
const MAX_REC = 120; // seconds

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const data = dataFor(char, 'answering', { msgs: [], color: '#1d1820' });
  data.msgs ||= [];
  let at = Math.max(0, data.msgs.findIndex(m => !m.heard));
  if (at < 0 || at >= data.msgs.length) at = 0;
  let playing = false;
  let typed = 0; // how much of the typed message is showing
  let typeTimer = null;

  const audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('ended', () => { playing = false; draw(); });
  let beepCtx = null;

  const unheard = () => data.msgs.filter(m => !m.heard).length;
  const cur = () => data.msgs[at] || null;
  const fromName = m => (m.from ? nameOf(store.char(m.from)) : m.name?.trim() || 'unknown number');
  const when = ts => new Date(ts).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).toLowerCase();

  function beep() {
    try {
      beepCtx ||= new AudioContext();
      const o = beepCtx.createOscillator(), v = beepCtx.createGain(), t = beepCtx.currentTime;
      o.type = 'sine'; o.frequency.value = 1000;
      v.gain.setValueAtTime(.08, t); v.gain.exponentialRampToValueAtTime(.0001, t + .35);
      o.connect(v).connect(beepCtx.destination);
      o.start(t); o.stop(t + .36);
    } catch { /* no beep */ }
  }

  function stopAll() {
    audio.pause();
    clearInterval(typeTimer);
    playing = false;
  }

  async function play() {
    const m = cur();
    if (!m) return;
    if (playing) { stopAll(); draw(); return; }
    stopAll();
    playing = true;
    typed = 0;
    if (!m.heard) { m.heard = true; save(); }
    beep();
    draw();
    const text = m.text || '';
    if (text) {
      typeTimer = setInterval(() => {
        typed = Math.min(text.length, typed + 2);
        const t = el.querySelector('.am-msg-text');
        if (t) t.textContent = text.slice(0, typed);
        if (typed >= text.length) { clearInterval(typeTimer); if (!m.imageId) { playing = false; draw(); } }
      }, 35);
    }
    if (m.imageId) {
      const url = await store.imageURL(m.imageId);
      if (!url || cur() !== m || !playing) return;
      audio.src = url;
      setTimeout(() => { if (playing && cur() === m) audio.play().catch(() => { playing = false; draw(); }); }, 380);
    }
  }
  function step(d) {
    if (!data.msgs.length) return;
    stopAll();
    at = (at + d + data.msgs.length) % data.msgs.length;
    typed = 0;
    draw();
  }
  async function remove() {
    const m = cur();
    if (!m) return;
    if (!await confirmDialog(`delete the message from ${fromName(m)}?`, { okLabel: 'delete', danger: true })) return;
    stopAll();
    if (m.imageId) store.deleteImage(m.imageId);
    data.msgs = data.msgs.filter(x => x !== m);
    at = Math.min(at, Math.max(0, data.msgs.length - 1));
    save();
    draw();
  }

  // ---- leave a message ----
  function newMessage() {
    const mates = worldmates(char.id);
    const draft = { from: mates[0]?.id || null, name: '', text: '', blob: null, secs: 0 };
    const nameIn = h('input', { type: 'text', placeholder: 'name', maxLength: 40, hidden: !!draft.from, oninput: e => draft.name = e.target.value });
    const who = mates.length ? h('select', { onchange: e => { draft.from = e.target.value || null; nameIn.hidden = !!draft.from; } },
      mates.map(c => h('option', { value: c.id }, nameOf(c))), h('option', { value: '' }, 'someone else')) : null;
    const text = h('textarea', { rows: 3, maxLength: 600, placeholder: 'the message', oninput: e => draft.text = e.target.value });
    const recBox = h('div', { class: 'am-rec' });
    let rec = null, stream = null, chunks = [], recTimer = null, started = 0;
    const preview = new Audio();
    function drawRec() {
      fill(recBox,
        rec ? h('button', { type: 'button', class: 'btn sm am-rec-on', onclick: stopRec }, h('span', { class: 'am-dot' }), ' stop ', h('span', { class: 'am-rec-time' }, '0:00'))
          : h('button', { type: 'button', class: 'btn ghost sm', onclick: startRec }, h('span', { class: 'am-dot' }), draft.blob ? ' record again' : ' record'),
        draft.blob && !rec ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { preview.src = URL.createObjectURL(draft.blob); preview.play().catch(() => {}); } }, 'listen') : null,
        draft.blob && !rec ? h('span', { class: 'am-rec-len' }, `${draft.secs}s`) : null,
        draft.blob && !rec ? h('button', { type: 'button', class: 'link-btn', onclick: () => { draft.blob = null; drawRec(); } }, 'remove') : null);
    }
    async function startRec() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error(err);
        toast("couldn't use the microphone", 'bad');
        return;
      }
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        draft.blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' });
        draft.secs = Math.max(1, Math.round((Date.now() - started) / 1000));
        stream.getTracks().forEach(t => t.stop());
        stream = null;
        rec = null;
        clearInterval(recTimer);
        drawRec();
      };
      started = Date.now();
      rec.start();
      drawRec();
      recTimer = setInterval(() => {
        const s = Math.round((Date.now() - started) / 1000);
        const t = recBox.querySelector('.am-rec-time');
        if (t) t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        if (s >= MAX_REC) stopRec();
      }, 250);
    }
    function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
    drawRec();
    openModal({
      title: 'leave a message',
      body: [who, nameIn, text, recBox],
      actions: [
        { label: 'nvm', onClick: close => close() },
        { label: 'save', kind: 'primary', onClick: async close => {
          if (rec) { toast('stop recording first'); return; }
          if (!draft.text.trim() && !draft.blob) { toast('type something or record something'); return; }
          let imageId = null;
          if (draft.blob) {
            try { imageId = await store.putImage(draft.blob); } catch (err) { console.error(err); toast("couldn't save the recording", 'bad'); return; }
          }
          data.msgs.push({ id: 'vm_' + uid(), from: who ? draft.from : null, name: draft.name.trim(), text: draft.text.trim(), imageId, secs: draft.secs || 0, at: Date.now(), heard: false });
          at = data.msgs.length - 1;
          save();
          close();
          draw();
        } },
      ],
      onClose: () => { stopRec(); clearInterval(recTimer); stream?.getTracks().forEach(t => t.stop()); preview.pause(); },
    });
  }

  // ---- the machine ----
  const box = h('div', { class: 'am-wrap' });
  function draw() {
    const m = cur();
    const n = unheard();
    const total = data.msgs.length;
    const showText = m ? (playing ? (m.text || '').slice(0, typed) : m.text || '') : '';
    fill(box, h('div', { class: 'am-machine' + (playing ? ' playing' : ''), style: { '--shell': data.color || '#1d1820' } },
      h('div', { class: 'am-top' },
        h('div', { class: 'am-lcd' },
          h('span', { class: 'am-lcd-big' + (n ? ' blink' : '') }, String(n || total).padStart(2, '0')),
          h('span', { class: 'am-lcd-small' }, n ? 'new' : 'msgs'),
          m ? h('span', { class: 'am-lcd-at' }, `${at + 1}/${total}`) : null),
        h('div', { class: 'am-led' + (n ? ' on' : '') }),
        h('div', { class: 'am-grille' })),
      h('div', { class: 'am-tape' }, h('div', { class: 'am-reel l' }), h('div', { class: 'am-tape-band' }), h('div', { class: 'am-reel r' })),
      h('div', { class: 'am-buttons' },
        h('button', { type: 'button', class: 'am-btn', title: 'back', disabled: total < 2, onclick: () => step(-1) }, '⏮'),
        h('button', { type: 'button', class: 'am-btn big', title: playing ? 'stop' : 'play', disabled: !m, onclick: play }, playing ? '■' : '▶'),
        h('button', { type: 'button', class: 'am-btn', title: 'next', disabled: total < 2, onclick: () => step(1) }, '⏭'),
        mine ? h('button', { type: 'button', class: 'am-btn del', title: 'delete', disabled: !m, onclick: remove }, '✕') : null)),
    h('div', { class: 'am-msg' + (m ? '' : ' none') },
      m ? [
        h('div', { class: 'am-msg-head' },
          m.from && store.char(m.from) ? portrait(store.char(m.from), 'sm') : h('div', { class: 'am-unknown' }, '?'),
          h('div', {}, h('div', { class: 'am-msg-from' }, fromName(m)), h('div', { class: 'am-msg-when' }, when(m.at), m.imageId ? ` · ${m.secs || ''}${m.secs ? 's' : ''}` : '')),
          m.heard ? null : h('span', { class: 'am-new' }, 'new')),
        m.text ? h('div', { class: 'am-msg-text' }, showText) : null,
        m.imageId ? h('div', { class: 'am-wave' + (playing ? ' on' : '') }, Array.from({ length: 22 }, (_, i) => h('i', { style: { '--i': i } }))) : null,
      ] : h('div', { class: 'am-none' }, 'no messages')),
    mine ? h('div', { class: 'am-actions' },
      h('button', { type: 'button', class: 'btn sm', onclick: newMessage }, '+ leave a message'),
      swatches(data.color, c => { data.color = c; save(); draw(); }, SHELLS)) : null);
  }
  el.append(appBar(ctx, meta), box);
  draw();

  return () => {
    stopAll();
    audio.removeAttribute('src');
    audio.load();
    beepCtx?.close().catch(() => {});
  };
}
