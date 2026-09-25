// who's in this world. ocs aren't owned by a world: this is just the world's cast list,
// so you can make a new oc right here or pull in ones you already made.

import { store } from '../store.js';
import { newChar } from '../model.js';
import { h, fill, openModal, confirmDialog } from '../ui.js';
import { ocCard, portrait, nameOf, emptyState, worldIcon } from '../parts.js';

export function render(el, { world, go }) {
  let query = '';
  const grid = h('div', { class: 'card-grid' });
  const head = h('div', { class: 'page-head' });
  el.append(h('div', { class: 'page' }, head, grid));
  draw();

  function draw() {
    const cast = store.cast(world);
    const outside = store.chars.filter(c => store.isMine(c) && !world.charIds.includes(c.id));
    fill(head,
      h('h1', {}, 'ocs ', h('span', { class: 'count' }, cast.length || '')),
      h('div', { class: 'page-head-actions' },
        cast.length > 5 ? h('input', { type: 'search', class: 'search', value: query, placeholder: 'search', oninput: e => { query = e.target.value; drawGrid(); } }) : null,
        outside.length ? h('button', { class: 'btn ghost sm', onclick: () => addExisting(outside) }, '+ add existing ocs') : null));
    drawGrid();
  }

  function drawGrid() {
    const cast = store.cast(world);
    if (!cast.length) {
      fill(grid, emptyState(worldIcon(world), 'nobody here yet', null,
        h('button', { class: 'btn primary', onclick: addOc }, '+ new oc')));
      return;
    }
    const q = query.trim().toLowerCase();
    fill(grid,
      h('button', { class: 'card card-new', onclick: addOc }, h('span', { class: 'plus' }, '+'), 'new oc'),
      cast.filter(c => !q || [c.name, c.tagline, ...c.tags].join(' ').toLowerCase().includes(q)).map(c =>
        ocCard(c, `#/w/${world.id}/ocs/${c.id}`,
          h('button', { class: 'card-x', title: `take out of ${world.name}`, onclick: e => { e.preventDefault(); takeOut(c); } }, '✕'))));
  }

  function addOc() {
    const char = store.add('char', newChar());
    world.charIds.push(char.id);
    store.save('world', world);
    go(`w/${world.id}/ocs/${char.id}`);
  }

  function addExisting(outside) {
    const picked = new Set();
    const list = h('div', { class: 'pick-list' });
    const drawList = () => fill(list, outside.map(c =>
      h('button', {
        type: 'button', class: 'pick-row' + (picked.has(c.id) ? ' on' : ''), style: { '--c': c.color },
        onclick: () => { picked.has(c.id) ? picked.delete(c.id) : picked.add(c.id); drawList(); },
      }, portrait(c, 'sm'), h('span', { class: 'pick-name' }, nameOf(c)), h('span', { class: 'pick-tick' }, picked.has(c.id) ? '✓' : '+'))));
    drawList();
    openModal({
      title: `add ocs to ${world.name}`,
      body: list,
      actions: [
        { label: 'cancel', onClick: close => close() },
        {
          label: 'add them', kind: 'primary', onClick: close => {
            world.charIds.push(...picked);
            store.save('world', world);
            close();
            draw();
          },
        },
      ],
    });
  }

  async function takeOut(c) {
    const ok = await confirmDialog(
      `take ${nameOf(c)} out of ${world.name}? they won't be deleted.`,
      { okLabel: 'take them out' });
    if (!ok) return;
    store.removeFromWorld(world, c.id);
    draw();
  }
}
