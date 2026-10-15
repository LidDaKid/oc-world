// ship-o-meter. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'ships', label: 'ship-o-meter', icon: '1f498' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'ship-o-meter'));
}
