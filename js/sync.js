// the small engine under collab worlds: work out exactly what changed in a record, and replay
// that change on somebody else's copy.
//
// a change is a list of ops, each aimed at a path into the record:
//   { path: ['boards', 'b_1', 'nodes', 'n_7', 'x'], set: 120 }
//   { path: ['lore', 'l_3'], add: { …whole new lore page… } }
//   { path: ['maps', 'm_2', 'pins', 'p_9'], del: true }
// lists of things that have an `id` are walked by id (so two people moving two different ocs on the
// same board never step on each other). anything else (text, numbers, plain lists) is swapped whole.

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const COLOR_KEYS = new Set(['color', 'bg', 'border', 'paper']); // not 'text': that's also what real writing is stored under
const HEX = /^#[0-9a-f]{3,8}$/i;

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const hasIds = v => Array.isArray(v) && v.length > 0 && v.every(x => isObj(x) && typeof x.id === 'string');
const isIdList = (a, b) => Array.isArray(a) && Array.isArray(b) && (hasIds(a) || hasIds(b)) && (hasIds(a) || !a.length) && (hasIds(b) || !b.length);

export const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export function diff(prev, next, path = [], ops = []) {
  if (isIdList(prev, next)) {
    const before = new Map(prev.map(x => [x.id, x]));
    for (const item of next) {
      if (before.has(item.id)) diff(before.get(item.id), item, [...path, item.id], ops);
      else ops.push({ path: [...path, item.id], add: clone(item) });
      before.delete(item.id);
    }
    for (const id of before.keys()) ops.push({ path: [...path, id], del: true });
  } else if (isObj(prev) && isObj(next)) {
    for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) {
      if (!(k in next) || next[k] === undefined) { if (prev[k] !== undefined) ops.push({ path: [...path, k], unset: true }); }
      else if (!(k in prev) || prev[k] === undefined) ops.push({ path: [...path, k], set: clone(next[k]) });
      else diff(prev[k], next[k], [...path, k], ops);
    }
  } else if (JSON.stringify(prev) !== JSON.stringify(next)) {
    ops.push({ path, set: clone(next) });
  }
  return ops;
}

// colors end up inside css, so anything arriving from someone else has to really be a color
const okValue = (key, value) => !COLOR_KEYS.has(key) || value == null || (typeof value === 'string' && HEX.test(value));

// changes `target` in place (objects that already exist keep being the same objects, so whatever page
// is showing them right now keeps working). ops that don't make sense are skipped, never thrown.
export function apply(target, ops, blockedRoots = []) {
  for (const op of Array.isArray(ops) ? ops : []) {
    const path = op?.path;
    if (!Array.isArray(path) || !path.length || path.some(k => typeof k !== 'string' || BAD_KEYS.has(k))) continue;
    if (blockedRoots.includes(path[0])) continue;
    let node = target;
    for (const key of path.slice(0, -1)) {
      node = Array.isArray(node) ? node.find(x => x?.id === key) : node?.[key];
      if (!node || typeof node !== 'object') break;
    }
    if (!node || typeof node !== 'object') continue;
    const last = path[path.length - 1];
    if (Array.isArray(node)) {
      const i = node.findIndex(x => x?.id === last);
      if (op.del) { if (i >= 0) node.splice(i, 1); }
      else if (isObj(op.add) && op.add.id === last) {
        const item = sanitize(op.add);
        if (i >= 0) Object.assign(node[i], item);
        else node.push(item);
      }
    } else if (op.unset) delete node[last];
    else if ('set' in op && okValue(last, op.set)) node[last] = sanitize(op.set);
  }
  return target;
}

// scrub a whole record that came from someone else
export function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!isObj(value)) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (BAD_KEYS.has(k) || !okValue(k, v)) continue;
    out[k] = sanitize(v);
  }
  return out;
}

// swap everything inside `target` for what's in `fresh`, keeping `target` the same object
export function replaceInPlace(target, fresh) {
  for (const k of Object.keys(target)) delete target[k];
  return Object.assign(target, fresh);
}
