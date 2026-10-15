// yearbook. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'yearbook', label: 'yearbook', icon: '1f4d6' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'yearbook'));
}
