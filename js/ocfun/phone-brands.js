// the big-name apps (pinterest, discord, tiktok...), split over three files so they stay readable.
// each file plugs in the same way phone-calls.js does (see the top of phone.js); this just merges them.
import * as a from './phone-brands-a.js';
import * as b from './phone-brands-b.js';
import * as c from './phone-brands-c.js';

const PARTS = [a, b, c];
const each = (fn, api) => PARTS.flatMap(m => { try { return fn(m, api) || []; } catch (err) { console.error(err); return []; } });

export const APPS = Object.assign({}, ...PARTS.map(m => m.APPS || {}));
export const DEF = Object.assign({}, ...PARTS.map(m => m.DEF || {}));
export function install(api) { for (const m of PARTS) m.install?.(api); }
export const lockNotifs = api => each((m, x) => m.lockNotifs?.(x), api);
export const badges = api => Object.assign({}, ...each((m, x) => [m.badges?.(x) || {}], api));
