// magazine. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'magazine', label: 'magazine', icon: '1f4f0' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'magazine'));
}
