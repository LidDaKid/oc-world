// mixtape. (not built yet)

import { h } from '../ui.js';

export const meta = { id: 'mixtape', label: 'mixtape', icon: '1f4fc' };

export function render(el, ctx) {
  el.append(h('div', { class: 'fun-soon' }, 'mixtape'));
}
