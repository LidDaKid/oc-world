// id cards. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'ids', label: 'id cards', icon: '1faaa' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'id cards'));
}
