// a world's newspaper: one front page for the whole world. saved on world.newspaper (shape in ocfun/newspaper-core.js)

import { h } from '../ui.js';
import { renderPaper } from '../ocfun/newspaper-core.js';

export function render(el, { world, save }) {
  world.newspaper ||= {};
  const box = h('div');
  el.append(h('div', { class: 'page nwp-page', style: { '--c': world.color } }, box));
  const empty = !world.newspaper.headline && !world.newspaper.lead?.text;
  const paper = renderPaper(box, { data: world.newspaper, defaultName: `the ${world.name.toLowerCase()} gazette`, save, readOnly: false, startEditing: empty });
  return { refresh: paper.refresh };
}
