// diaries: this oc's diaries standing on a shelf in their room. click one to open it.
// (diaries live in store.diaries; each one has charId = whose diary it is)

import { h, fill, toast, openModal } from '../ui.js';
import { store } from '../store.js';
import { newDiary } from '../model.js';
import { book3d } from '../diary/covers.js';
import { appBar, sticker, portrait, nameOf } from './kit.js';

export const meta = { id: 'diaries', label: 'diaries', icon: '1f4d3' };

const LIGHTS = ['#ff4fa3', '#b18cff', '#ffd84d', '#ff8ac4', '#7df9d0'];

export function render(el, ctx) {
  const { char, mine, go } = ctx;
  const small = () => innerWidth < 560;
  const room = h('div', { class: 'dy-room' });
  const mineList = () => store.diaries.filter(d => d.charId === char.id);
  const others = () => store.diaries.filter(d => d.charId !== char.id);

  function newOne() {
    const d = store.addDiary(newDiary({ charId: char.id }));
    go(`diary/${d.id}/cover`);
  }

  function unassign(d) {
    d.charId = null;
    store.saveDiary(d);
    toast('taken off the shelf');
    draw();
  }

  function pick() {
    const list = others();
    if (!list.length) { toast('no other diaries yet'); return; }
    const modal = openModal({
      title: `give ${nameOf(char)} a diary`,
      wide: true,
      body: h('div', { class: 'dy-pick' }, list.map(d => {
        const owner = store.char(d.charId);
        return h('button', {
          type: 'button', class: 'dy-pick-book', title: d.cover.title.text || 'diary',
          onclick: () => {
            d.charId = char.id;
            store.saveDiary(d);
            modal.close();
            toast('on the shelf ♡');
            draw();
          },
        },
          h('div', { class: 'dy-pick-3d' }, book3d(d, { scale: .2 })),
          h('span', { class: 'dy-pick-title' }, d.cover.title.text || 'diary'),
          owner ? h('span', { class: 'dy-pick-owner', style: { '--c': owner.color } }, portrait(owner, 'xs'), nameOf(owner)) : null);
      })),
    });
  }

  function book(d, i) {
    const scale = small() ? .24 : .3;
    return h('div', { class: 'dy-slot', style: { '--i': i } },
      h('a', {
        class: 'dy-book', href: `#/diary/${d.id}`, title: d.cover.title.text || 'diary',
        onclick: e => { e.preventDefault(); go('diary/' + d.id); },
      }, book3d(d, { scale })),
      mine ? h('button', { type: 'button', class: 'dy-x', title: 'take off the shelf', onclick: () => unassign(d) }, '×') : null);
  }

  function draw() {
    const books = mineList();
    const deco = [
      h('div', { class: 'dy-slot deco candle' }, h('div', { class: 'dy-glow' }), sticker('1f56f-fe0f', 'dy-deco-stk')),
      h('div', { class: 'dy-slot deco plant' }, sticker('1fab4', 'dy-deco-stk')),
    ];
    fill(room,
      h('div', { class: 'dy-lights' }, Array.from({ length: 18 }, (_, i) => h('span', { class: 'dy-bulb', style: { '--c': LIGHTS[i % LIGHTS.length], '--d': (i * .37) % 2 + 's' } }))),
      h('div', { class: 'dy-poster' }, portrait(char, 'dy-poster-pic'), h('span', { class: 'dy-poster-name' }, nameOf(char))),
      sticker('1f408-200d-2b1b', 'dy-cat'),
      h('div', { class: 'dy-shelf' + (books.length ? '' : ' empty'), style: { '--rowh': small() ? '190px' : '236px' } },
        deco[0],
        books.map(book),
        mine ? h('div', { class: 'dy-slot' }, h('button', { type: 'button', class: 'dy-new', title: 'new diary', onclick: newOne }, h('span', {}, '+'))) : null,
        deco[1],
        !books.length && !mine ? h('div', { class: 'dy-slot deco' }, sticker('1f4d3', 'dy-deco-stk ghost')) : null));
  }

  el.append(
    appBar(ctx, meta,
      mine ? h('button', { type: 'button', class: 'btn primary sm', onclick: newOne }, '+ new diary') : null,
      mine && others().length ? h('button', { type: 'button', class: 'btn sm', onclick: pick }, 'pick a diary') : null),
    room);
  draw();

  let wasSmall = small();
  const onResize = () => { if (small() !== wasSmall) { wasSmall = small(); draw(); } };
  addEventListener('resize', onResize);
  return () => removeEventListener('resize', onResize);
}
