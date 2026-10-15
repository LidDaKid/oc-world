// mood ring. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'mood', label: 'mood ring', icon: '1f48d' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'mood ring'));
}
