// café order: the oc's usual order (+ their worldmates' orders on the same menu board). the drink shows as a cup
// with their name scribbled on it, spelled wrong like a real barista would.
//   data: { cafe, orders: { [ocId]: { drink, size, temp, milk, syrups: [], toppings: [], food, extra, cupName } }, at }

import { h, fill, segmented } from '../ui.js';
import { appBar, worldmates, portrait, nameOf } from './kit.js';

export const meta = { id: 'cafe', label: 'café order', icon: '2615' };

const DRINKS = {
  latte: '#c99a6b', 'iced coffee': '#8a5a3c', 'cold brew': '#3a2318', mocha: '#5a3424', matcha: '#8fc46a', chai: '#d4a373',
  'hot chocolate': '#6b3e2e', frappe: '#d9b48f', 'boba tea': '#c8a98a', 'pink drink': '#ff9ec6', lemonade: '#ffe066', tea: '#c77d3a', smoothie: '#ff6fa8', espresso: '#2a1610',
};
const SIZES = ['small', 'medium', 'large', 'huge'];
const MILKS = ['whole', 'oat', 'almond', 'soy', 'coconut', 'none'];
const SYRUPS = ['vanilla', 'caramel', 'hazelnut', 'lavender', 'rose', 'brown sugar', 'pumpkin spice', 'peppermint', 'strawberry', 'white mocha'];
const TOPS = ['whipped cream', 'caramel drizzle', 'chocolate drizzle', 'cold foam', 'cinnamon', 'sprinkles', 'boba pearls', 'cookie crumbs', 'marshmallows'];
const FOOD = ['none', 'croissant', 'muffin', 'cookie', 'cake pop', 'bagel', 'macarons', 'cheesecake', 'cinnamon roll', 'sandwich'];
const blank = () => ({ drink: 'latte', size: 'medium', temp: 'iced', milk: 'oat', syrups: ['vanilla'], toppings: [], food: 'none', extra: '', cupName: '' });

// how a busy barista writes your name
export function misspell(name) {
  const n = (name || '').trim().split(/\s+/)[0] || '';
  if (!n) return '???';
  const swaps = [
    s => s.replace(/ie$/i, 'ee').replace(/y$/i, 'ie'),
    s => s.replace(/ph/gi, 'f').replace(/c(?=[aou])/gi, 'k'),
    s => s.replace(/([aeiou])/i, '$1$1'),
    s => s.replace(/([^aeiou])/i, '$1$1'),
    s => (s.length > 4 ? s.slice(0, -2) + s.at(-1) : s + 'h'),
    s => s.replace(/a/i, 'u').replace(/o/i, 'oe'),
    s => s.replace(/i/i, 'y').replace(/e$/i, 'a'),
  ];
  let k = 0;
  for (const ch of n) k = (k * 31 + ch.charCodeAt(0)) % 997;
  const out = swaps[k % swaps.length](n);
  return out.toLowerCase() === n.toLowerCase() ? swaps[(k + 1) % swaps.length](n) + 'e' : out;
}

function cup(o, name) {
  const color = DRINKS[o.drink] || '#c99a6b';
  const iced = o.temp === 'iced';
  const sizeK = { small: .82, medium: .92, large: 1, huge: 1.1 }[o.size] || .92;
  const tops = o.toppings || [];
  return h('div', { class: 'caf-cup ' + (iced ? 'iced' : 'hot'), style: { '--drink': color, '--k': sizeK } },
    tops.includes('whipped cream') || tops.includes('cold foam') ? h('i', { class: 'caf-whip' + (tops.includes('cold foam') ? ' foam' : '') }) : null,
    iced ? h('i', { class: 'caf-straw' }) : h('i', { class: 'caf-lid' }),
    h('div', { class: 'caf-body' },
      h('i', { class: 'caf-liquid' }),
      iced ? h('i', { class: 'caf-ice' }) : null,
      tops.includes('boba pearls') || o.drink === 'boba tea' ? h('i', { class: 'caf-boba' }) : null,
      tops.some(t => /drizzle/.test(t)) ? h('i', { class: 'caf-drizzle' }) : null,
      !iced ? h('i', { class: 'caf-sleeve' }) : null,
      h('span', { class: 'caf-name' }, o.cupName?.trim() || misspell(name))),
    !iced ? h('i', { class: 'caf-steam' }) : null);
}

const orderLine = o => [o.size, o.temp === 'iced' ? 'iced' : 'hot', o.drink].join(' ');
const orderBits = o => [o.milk && o.milk !== 'none' && !['lemonade', 'espresso', 'tea', 'smoothie'].includes(o.drink) ? o.milk + ' milk' : null, ...(o.syrups || []).map(s => s + ' syrup'), ...(o.toppings || [])].filter(Boolean);

export function render(el, ctx) {
  const d = ctx.data;
  d.orders ||= {};
  d.cafe ||= '';
  const edit = ctx.mine;
  const save = () => { if (edit) ctx.save(); };
  const people = () => [ctx.char, ...worldmates(ctx.char.id)];
  if (!d.orders[ctx.char.id]) { d.orders[ctx.char.id] = blank(); save(); }
  let at = ctx.char.id;
  const who = () => people().find(p => p.id === at) || ctx.char;

  const board = h('div', { class: 'caf-board' });
  const counter = h('div', { class: 'caf-counter' });
  el.append(appBar(ctx, meta), h('div', { class: 'caf-app' }, board, counter));

  function drawBoard() {
    const list = people().filter(p => d.orders[p.id]);
    fill(board,
      h('div', { class: 'caf-board-head' },
        edit ? h('input', { type: 'text', class: 'caf-cafe-name', value: d.cafe, placeholder: 'the café', maxLength: 40, oninput: e => { d.cafe = e.target.value; save(); } })
          : h('div', { class: 'caf-cafe-name' }, d.cafe || 'the café'),
        h('div', { class: 'caf-board-sub' }, 'the usual')),
      h('div', { class: 'caf-menu' }, list.map(p => {
        const o = d.orders[p.id];
        return h('button', { type: 'button', class: 'caf-menu-row' + (p.id === at ? ' on' : ''), style: { '--c': p.color }, onclick: () => { at = p.id; draw(); } },
          portrait(p, 'sm'),
          h('div', { class: 'caf-menu-text' },
            h('div', { class: 'caf-menu-who' }, nameOf(p)),
            h('div', { class: 'caf-menu-drink' }, orderLine(o)),
            orderBits(o).length ? h('div', { class: 'caf-menu-bits' }, orderBits(o).join(' · ')) : null,
            o.food && o.food !== 'none' ? h('div', { class: 'caf-menu-food' }, '+ ' + o.food) : null),
          h('span', { class: 'caf-menu-dots' }));
      })),
      edit ? h('div', { class: 'caf-add' }, people().filter(p => !d.orders[p.id]).map(p =>
        h('button', { type: 'button', class: 'chip', onclick: () => { d.orders[p.id] = blank(); at = p.id; save(); draw(); } }, '+ ' + nameOf(p)))) : null);
  }

  function drawCounter() {
    const p = who();
    const o = d.orders[p.id];
    if (!o) { fill(counter); return; }
    const many = (list, key) => h('div', { class: 'caf-picks' }, list.map(v => h('button', {
      type: 'button', class: 'caf-pick' + (o[key].includes(v) ? ' on' : ''), disabled: !edit,
      onclick: () => { o[key] = o[key].includes(v) ? o[key].filter(x => x !== v) : [...o[key], v]; save(); draw(); },
    }, v)));
    const one = (label, list, key) => h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, label),
      edit ? segmented(list.map(v => ({ value: v, label: v })), o[key], v => { o[key] = v; save(); draw(); }) : h('div', { class: 'caf-val' }, o[key]));
    fill(counter,
      h('div', { class: 'caf-stage', style: { '--c': p.color } },
        h('i', { class: 'caf-saucer' }),
        cup(o, nameOf(p)),
        o.food && o.food !== 'none' ? h('div', { class: 'caf-plate' }, h('i', { class: 'caf-food food-' + o.food.replace(/\W/g, '') }), h('span', {}, o.food)) : null),
      h('div', { class: 'caf-ticket' },
        h('div', { class: 'caf-ticket-head' }, portrait(p, 'sm'), h('b', {}, nameOf(p))),
        h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, 'drink'),
          edit ? h('select', { class: 'caf-select', onchange: e => { o.drink = e.target.value; save(); draw(); } }, Object.keys(DRINKS).map(k => h('option', { value: k, selected: k === o.drink }, k)))
            : h('div', { class: 'caf-val' }, o.drink)),
        one('hot or iced', ['hot', 'iced'], 'temp'),
        one('size', SIZES, 'size'),
        one('milk', MILKS, 'milk'),
        h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, 'syrups'), many(SYRUPS, 'syrups')),
        h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, 'toppings'), many(TOPS, 'toppings')),
        h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, 'food'),
          edit ? h('select', { class: 'caf-select', onchange: e => { o.food = e.target.value; save(); draw(); } }, FOOD.map(k => h('option', { value: k, selected: k === o.food }, k)))
            : h('div', { class: 'caf-val' }, o.food)),
        edit ? h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, 'name on the cup'),
          h('input', { type: 'text', value: o.cupName || '', placeholder: misspell(nameOf(p)), maxLength: 20, oninput: e => { o.cupName = e.target.value; save(); drawStageOnly(); } })) : null,
        edit ? h('div', { class: 'caf-group' }, h('span', { class: 'caf-label' }, 'extra'),
          h('input', { type: 'text', value: o.extra || '', placeholder: 'light ice', maxLength: 80, oninput: e => { o.extra = e.target.value; save(); } }))
          : o.extra ? h('div', { class: 'caf-extra' }, o.extra) : null,
        edit && p.id !== ctx.char.id ? h('button', { type: 'button', class: 'link-btn danger', onclick: () => { delete d.orders[p.id]; at = ctx.char.id; save(); draw(); } }, 'take off the menu') : null));
  }
  function drawStageOnly() {
    const p = who(), o = d.orders[p.id];
    counter.querySelector('.caf-cup')?.replaceWith(cup(o, nameOf(p)));
  }
  function draw() { drawBoard(); drawCounter(); }
  draw();
}
