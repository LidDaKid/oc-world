// family tree: built from this oc's relationships. every family word (mom, big sister, grandpa, step-dad,
// son-in-law...) puts that person on a generation row, then gold lines join them up like a portrait wall.
// nothing is saved here: it reads store.relsOf(char.id) every time (add family with the relationship editor).

import { h, s, fill } from '../ui.js';
import { store } from '../store.js';
import { seenFrom, openRelEditor } from '../rels.js';
import { appBar, sticker, portrait, nameOf } from './kit.js';

export const meta = { id: 'familytree', label: 'family tree', icon: '1f333' };

const W = '(?:^|[\\s-])'; // a word start (labels like "step-mom" or "big sister")
const KIN = [
  ['greatgrandkid', 3, new RegExp('great[\\s-]*grand[\\s-]*(son|daughter|kid|child|baby)')],
  ['greatgrandparent', -3, /great[\s-]*grand/],
  ['grandkid', 2, /grand[\s-]*(son|daughter|kid|child|baby)/],
  ['grandparent', -2, /grand[\s-]*(ma|pa|mother|father|parent|mom|dad|mum)|granny|\bgran\b|\bnana\b|gramps|grams/],
  ['niece', 1, /niece|nephew/],
  ['child', 1, new RegExp(W + '(step|half)?[\\s-]*(son|daughter|kid|child|children|baby|babies)s?\\b')],
  ['auntuncle', -1, /aunt|auntie|uncle/],
  ['parent', -1, new RegExp(W + '(step|birth|adoptive|foster)?[\\s-]*(mom|mother|mama|mum|mommy|dad|father|papa|daddy|parent|guardian)s?\\b')],
  ['sibling', 0, new RegExp(W + '(step|half|big|little|older|younger|twin)?[\\s-]*(sister|brother|sibling|sis|bro|twin)s?\\b')],
  ['cousin', 0, /cousin/],
  ['partner', 0, /wife|husband|spouse|partner|girlfriend|boyfriend|fianc|married|dating|soulmate|\bgf\b|\bbf\b/],
];
export function kinOf(label) {
  const l = ' ' + String(label || '').toLowerCase().trim();
  if (!l.trim()) return null;
  for (const [kind, gen, re] of KIN) if (re.test(l)) return { kind, gen };
  return null;
}

export function render(el, ctx) {
  const { char, mine } = ctx;
  const stage = h('div', { class: 'ft-stage' });
  const tree = h('div', { class: 'ft-tree' });
  const lines = s('svg', { class: 'ft-lines' });
  stage.append(lines, tree);

  let people = [];
  function gather() {
    people = store.relsOf(char.id).map(rel => {
      const v = seenFrom(rel, char.id);
      const kin = kinOf(v.theyAre);
      return kin ? { id: rel.id, oc: v.other, name: v.otherName || '?', label: v.theyAre, ...kin } : null;
    }).filter(Boolean);
  }

  const node = p => {
    const inner = [
      h('div', { class: 'ft-frame' }, portrait(p.me ? char : p.oc || { name: p.name, color: char.color }, 'ft-pic')),
      h('div', { class: 'ft-plaque' }, h('b', {}, p.me ? nameOf(char) : p.oc ? nameOf(p.oc) : p.name), p.me ? null : h('span', {}, p.label)),
    ];
    const attrs = { class: 'ft-node ft-' + (p.me ? 'me' : p.kind), dataset: { id: p.me ? 'me' : p.id } };
    return p.oc && !p.me ? h('a', { ...attrs, href: ctx.ocLink(p.oc) }, inner) : h('div', attrs, inner);
  };

  function draw() {
    gather();
    if (!people.length) {
      fill(body, h('div', { class: 'ft-empty' }, sticker('1f333', 'ft-empty-stk'), h('h3', {}, 'no family yet'), addBtn()));
      return;
    }
    fill(body, stage);
    const me = { me: true, gen: 0, kind: 'me' };
    const gens = [...new Set([0, ...people.map(p => p.gen)])].sort((a, b) => a - b);
    const order = { auntuncle: 0, parent: 1, cousin: 0, sibling: 1, me: 2, partner: 3, child: 0, niece: 1 };
    fill(tree, gens.map(g => {
      const row = (g === 0 ? [...people.filter(p => p.gen === 0), me] : people.filter(p => p.gen === g))
        .sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1));
      return h('div', { class: 'ft-row', dataset: { gen: g } }, h('div', { class: 'ft-row-label' }, ROW_NAMES[g] || ''), h('div', { class: 'ft-row-people' }, row.map(node)));
    }));
    requestAnimationFrame(drawLines);
  }
  const ROW_NAMES = { '-3': 'great-grandparents', '-2': 'grandparents', '-1': 'parents', 0: '', 1: 'kids', 2: 'grandkids', 3: 'great-grandkids' };

  // gold lines: everyone hooks onto the right person in the row above/next to them
  function drawLines() {
    if (!stage.isConnected) return;
    const box = stage.getBoundingClientRect();
    lines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    lines.setAttribute('width', box.width);
    lines.setAttribute('height', box.height);
    const at = id => {
      const n = stage.querySelector(`[data-id="${id}"] .ft-frame`);
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, top: r.top - box.top, bottom: r.bottom - box.top, y: r.top - box.top + r.height / 2, l: r.left - box.left, r: r.right - box.left };
    };
    const first = kind => people.find(p => p.kind === kind);
    const parent = first('parent'), partner = first('partner'), child = first('child'), au = first('auntuncle');
    const paths = [];
    const down = (a, b, cls = '') => { if (a && b) { const m = (a.bottom + b.top) / 2; paths.push(s('path', { d: `M${a.x} ${a.bottom}C${a.x} ${m} ${b.x} ${m} ${b.x} ${b.top}`, class: 'ft-line ' + cls })); } };
    const side = (a, b, cls = '') => { if (a && b) { const [L, R] = a.x < b.x ? [a, b] : [b, a]; paths.push(s('path', { d: `M${L.r + 4} ${L.y}L${R.l - 4} ${R.y}`, class: 'ft-line ' + cls })); } };
    const me = at('me');
    for (const p of people) {
      const pt = at(p.id);
      if (!pt) continue;
      if (p.kind === 'parent') down(pt, me);
      else if (p.kind === 'grandparent') down(pt, at(parent?.id) || me);
      else if (p.kind === 'greatgrandparent') down(pt, at(first('grandparent')?.id) || at(parent?.id) || me);
      else if (p.kind === 'auntuncle') { const gp = first('grandparent'); if (gp) down(at(gp.id), pt); else if (parent) side(at(parent.id), pt, 'soft'); else down(pt, me, 'soft'); }
      else if (p.kind === 'sibling') { if (parent) down(at(parent.id), pt); else side(me, pt); }
      else if (p.kind === 'cousin') { if (au) down(at(au.id), pt, 'soft'); else side(me, pt, 'soft'); }
      else if (p.kind === 'partner') side(me, pt, 'love');
      else if (p.kind === 'child') down(me, pt);
      else if (p.kind === 'niece') down(at(first('sibling')?.id) || me, pt, 'soft');
      else if (p.kind === 'grandkid') down(at(child?.id) || me, pt);
      else if (p.kind === 'greatgrandkid') down(at(first('grandkid')?.id) || at(child?.id) || me, pt);
    }
    if (partner) {
      const a = me, b = at(partner.id);
      if (a && b) paths.push(s('text', { x: (a.x + b.x) / 2, y: a.y, class: 'ft-heart' }, '♥'));
    }
    fill(lines, paths);
  }

  const addBtn = () => mine ? h('button', { class: 'btn ghost sm', onclick: () => openRelEditor({ me: char, onDone: draw }) }, '+ family') : null;
  const body = h('div', { class: 'ft-body' });
  el.append(appBar(ctx, meta, addBtn()), h('div', { class: 'ft-wall' }, body));
  draw();

  const ro = new ResizeObserver(() => requestAnimationFrame(drawLines));
  ro.observe(stage);
  addEventListener('resize', drawLines);
  return () => { ro.disconnect(); removeEventListener('resize', drawLines); };
}
