// phone. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'phone', label: 'phone', icon: '1f4f1' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'phone'));
}
