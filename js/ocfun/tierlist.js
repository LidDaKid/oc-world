// tier list: rank this oc + their worldmates (or anything: words, pictures, 3d stickers) into tiers you name yourself.
// the board lives in tier-core.js (the world's tier list tab uses the same one). saved in char.fun.tierlist

import { appBar, worldmates } from './kit.js';
import { renderTiers } from './tier-core.js';

export const meta = { id: 'tierlist', label: 'tier list', icon: '1f3c6' };

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  el.append(appBar(ctx, meta));
  renderTiers(el, { data: ctx.data, people: () => [char, ...worldmates(char.id)], save, readOnly: !mine, ocLink: o => ctx.ocLink(o) });
}
