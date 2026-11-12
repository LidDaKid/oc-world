// a world's alignment chart: every oc in the world on one 3x3. saved on world.alignment (shape in ocfun/alignment-core.js)

import { h } from '../ui.js';
import { store } from '../store.js';
import { renderAlignment } from '../ocfun/alignment-core.js';

export function render(el, { world, save }) {
  world.alignment ||= {};
  const box = h('div');
  el.append(h('div', { class: 'page alc-page', style: { '--c': world.color } }, box));
  const chart = renderAlignment(box, {
    data: world.alignment, save, readOnly: false,
    people: () => world.charIds.map(id => store.char(id)).filter(Boolean),
    ocLink: o => `#/w/${world.id}/ocs/${o.id}`,
  });
  return { refresh: chart.refresh };
}
