// dress up. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'dressup', label: 'dress up', icon: '1f457' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'dress up'));
}
