// letters. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'letters', label: 'letters', icon: '1f48c' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'letters'));
}
