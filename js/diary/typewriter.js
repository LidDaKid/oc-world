// typewriter mode: every key clacks (quietly) and each new letter strikes onto the paper. enter rings the bell.

import { h } from '../ui.js';
import { sound } from './sound.js';

const KEY = 'ocw-typewriter';
export const typewriter = {
  get on() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } },
  set on(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* just for this visit */ } },
};

// where a letter sits inside the page's textarea: a hidden copy of the textarea (same class + style, same spot)
// with the text up to there, and a marker on the letter
function caretAt(ta, pos) {
  const m = h('div', { class: ta.className, 'aria-hidden': 'true' });
  m.style.cssText = ta.style.cssText;
  Object.assign(m.style, { visibility: 'hidden', pointerEvents: 'none', overflow: 'hidden' });
  m.textContent = ta.value.slice(0, pos);
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 30;
  const mark = h('span', { style: { display: 'inline-block', height: lh + 'px', verticalAlign: 'top' } }, ta.value.slice(pos, pos + 1) || '.');
  m.append(mark);
  ta.parentNode.append(m);
  const out = { x: m.offsetLeft + mark.offsetLeft, y: m.offsetTop + mark.offsetTop, lh };
  m.remove();
  return out;
}

// hook a page's textarea up. page = the paper element the letters land on
export function typewriterKeys(ta, page) {
  ta.addEventListener('input', e => {
    if (!typewriter.on) return;
    const type = e.inputType || '';
    if (type === 'insertLineBreak' || (type === 'insertText' && e.data == null)) {
      sound.ding();
      page.animate([{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' });
      return;
    }
    if (type.startsWith('delete')) { sound.clack(true); return; }
    if (!type.startsWith('insert') || !e.data) return;
    const ch = e.data.slice(-1);
    sound.clack(ch === ' ');
    if (ch === ' ') return;
    const pos = ta.selectionStart - 1;
    const c = caretAt(ta, pos);
    const cs = getComputedStyle(ta);
    const strike = h('span', {
      class: 'tw-strike',
      style: {
        left: c.x + 'px', top: c.y + 'px', height: c.lh + 'px', lineHeight: c.lh + 'px',
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, color: cs.color,
      },
    }, ch);
    page.append(strike);
    strike.animate([
      { transform: 'translateY(-7px) scale(1.7)', opacity: 0, filter: 'blur(1.5px)' },
      { transform: 'translateY(0) scale(.92)', opacity: 1, filter: 'blur(0)', offset: .38 },
      { transform: 'scale(1)', opacity: .9, offset: .55 },
      { transform: 'scale(1)', opacity: 0 },
    ], { duration: 300, easing: 'ease-out', fill: 'both' }).finished.then(() => strike.remove(), () => strike.remove());
    page.animate([{ translate: '0 0' }, { translate: '0 .8px' }, { translate: '0 0' }], { duration: 70 });
  });
}
