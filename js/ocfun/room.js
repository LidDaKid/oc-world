// bedroom. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'room', label: 'bedroom', icon: '1f6cf-fe0f' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'bedroom'));
}
