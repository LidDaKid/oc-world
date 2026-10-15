// polaroid wall. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'polaroids', label: 'polaroid wall', icon: '1f4f8' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'polaroid wall'));
}
