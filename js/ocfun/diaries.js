// diaries. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'diaries', label: 'diaries', icon: '1f4d3' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'diaries'));
}
