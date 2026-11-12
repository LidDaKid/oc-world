// alignment chart: place this oc + everyone in their world on the 3x3 (lawful good ... chaotic evil, or your own 9 boxes).
// the chart lives in alignment-core.js (the world's alignment tab uses the same one).
// saved in char.fun.alignment (see alignment-core.js for the shape)

import { appBar, worldmates } from './kit.js';
import { renderAlignment } from './alignment-core.js';

export const meta = { id: 'alignment', label: 'alignment chart', icon: '2696-fe0f' };

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  el.append(appBar(ctx, meta));
  renderAlignment(el, { data: ctx.data, people: () => [char, ...worldmates(char.id)], save, readOnly: !mine, ocLink: o => ctx.ocLink(o) });
}
