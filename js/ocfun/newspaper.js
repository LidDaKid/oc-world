// newspaper: a front page about this oc (masthead, headline, the big story, more articles, classifieds).
// the page lives in newspaper-core.js (the world's newspaper tab uses the same one). saved in char.fun.newspaper

import { appBar, nameOf } from './kit.js';
import { renderPaper } from './newspaper-core.js';

export const meta = { id: 'newspaper', label: 'newspaper', icon: '1f4f0' };

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  el.append(appBar(ctx, meta));
  const empty = !ctx.data.headline && !ctx.data.lead?.text;
  renderPaper(el, { data: ctx.data, defaultName: `the ${nameOf(char).toLowerCase()} times`, save, readOnly: !mine, startEditing: empty });
}
