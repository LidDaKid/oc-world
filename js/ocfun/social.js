// socials. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'social', label: 'socials', icon: '1f4ac' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'socials'));
}
