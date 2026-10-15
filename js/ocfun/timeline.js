// timeline. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'timeline', label: 'timeline', icon: '23f3' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'timeline'));
}
