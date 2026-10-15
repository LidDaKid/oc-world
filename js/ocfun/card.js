// trading card. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'card', label: 'trading card', icon: '1f0cf' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'trading card'));
}
