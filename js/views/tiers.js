// a world's tier lists: every oc in the world can be ranked. saved on world.tiers (shape in ocfun/tier-core.js)

import { h } from '../ui.js';
import { store } from '../store.js';
import { renderTiers } from '../ocfun/tier-core.js';

export function render(el, { world, save }) {
  world.tiers ||= {};
  const box = h('div');
  el.append(h('div', { class: 'page tir-page', style: { '--c': world.color } }, h('div', { class: 'page-head' }, h('h1', {}, 'tier lists')), box));
  const board = renderTiers(box, {
    data: world.tiers, save, readOnly: false,
    people: () => world.charIds.map(id => store.char(id)).filter(Boolean),
    ocLink: o => `#/w/${world.id}/ocs/${o.id}`,
  });
  return { refresh: board.refresh };
}
