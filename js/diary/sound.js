// little made-up sounds for the diary (no sound files): typewriter clacks, the bell, the lock clicking, paper ripping, fire.
// everything is very quiet. the browser only lets sound start after a click or a key, which is always when these play.

let ctx = null, master = null, noiseBuf = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = .55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noise(t, dur, { type = 'bandpass', freq = 2000, q = 1, gain = .05, attack = .002 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * .5);
  src.stop(t + dur + .02);
  return { src, f, g };
}

function tone(t, dur, { freq = 440, to = null, type = 'sine', gain = .04, attack = .003 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + .02);
}

// waking the audio up takes a moment, so do it quietly in a spare moment after the first click (not in the middle of an animation)
function warm() {
  if (ctx) return;
  if (location.hash.startsWith('#/diary')) (window.requestIdleCallback || setTimeout)(() => ac());
  else listen();
}
function listen() {
  document.addEventListener('pointerdown', warm, { once: true, capture: true });
  document.addEventListener('keydown', warm, { once: true, capture: true });
}
listen();

const go = fn => { if (!ac()) return; try { fn(ctx.currentTime); } catch { /* no sound, no big deal */ } };

export const sound = {
  // one typewriter key
  clack: (space = false) => go(t => {
    const p = .85 + Math.random() * .3;
    noise(t, .035, { freq: (space ? 1300 : 2600) * p, q: 1.4, gain: space ? .05 : .07 });
    tone(t, .05, { freq: 150 * p, to: 60, gain: .05 });
    noise(t + .012, .02, { type: 'highpass', freq: 5000, gain: .02 });
  }),
  // the bell at the end of a line
  ding: () => go(t => {
    noise(t, .05, { freq: 1500, q: 2, gain: .04 });
    tone(t + .03, 1.5, { freq: 2093, gain: .035 });
    tone(t + .03, 1.1, { freq: 4186, gain: .012 });
    tone(t + .03, .8, { freq: 6270, gain: .005 });
  }),
  key: () => go(t => { tone(t, .06, { freq: 1200, type: 'triangle', gain: .02 }); }),
  wrong: () => go(t => {
    tone(t, .14, { freq: 180, type: 'square', gain: .012 });
    tone(t + .16, .2, { freq: 140, type: 'square', gain: .012 });
  }),
  unlock: () => go(t => {
    noise(t, .03, { freq: 4200, q: 3, gain: .06 });
    tone(t, .12, { freq: 1900, gain: .02 });
    noise(t + .14, .05, { freq: 3000, q: 2, gain: .07 });
    tone(t + .14, .3, { freq: 2600, gain: .02 });
  }),
  lock: () => go(t => {
    noise(t, .05, { freq: 2600, q: 2, gain: .08 });
    tone(t, .2, { freq: 900, to: 700, gain: .02 });
  }),
  peel: () => go(t => { noise(t, .09, { type: 'highpass', freq: 3500, gain: .025, attack: .04 }); }),
  // paper tearing: a crackly sweep
  rip: (dur = .55) => go(t => {
    const { f, g } = noise(t, dur, { freq: 900, q: .8, gain: .09, attack: .02 });
    f.frequency.exponentialRampToValueAtTime(3200, t + dur);
    for (let s = t + .03; s < t + dur - .05; s += .018 + Math.random() * .03) g.gain.setValueAtTime(.03 + Math.random() * .08, s);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  }),
  // fire: a soft whoosh with little pops
  burn: (dur = 2.2) => go(t => {
    const { g } = noise(t, dur, { type: 'lowpass', freq: 700, gain: .05, attack: .3 });
    g.gain.setValueAtTime(.05, t + dur * .7);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    for (let s = t + .1; s < t + dur; s += .03 + Math.random() * .12) noise(s, .012, { type: 'highpass', freq: 2500 + Math.random() * 3000, gain: .02 + Math.random() * .04 });
  }),
  pop: () => go(t => { tone(t, .09, { freq: 500, to: 900, type: 'triangle', gain: .025 }); }),
};
