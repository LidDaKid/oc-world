// locker. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'locker', label: 'locker', icon: '1f512' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'locker'));
}
