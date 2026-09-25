// lore: pages for everything about the world that isn't a person
//
// an entry is { id, title, kind, body, imageId }

import { store } from '../store.js';
import { h, clear, uid, toast, confirmDialog, autosize, pickFile, shrinkImage } from '../ui.js';

const KINDS = [
  ['place', '🏠', 'places'], ['group', '👥', 'groups'], ['history', '📜', 'history'], ['magic', '✨', 'magic + powers'],
  ['creature', '🐾', 'creatures'], ['item', '🗝️', 'items'], ['other', '📌', 'other'],
];
const iconOf = kind => (KINDS.find(k => k[0] === kind) || KINDS[KINDS.length - 1])[1];

export function render(el, { world, sub, save, go }) {
  const entry = sub && world.lore.find(x => x.id === sub);
  let filter = 'all';

  const list = h('div', { class: 'lore-items' });
  const drawList = () => {
    clear(list);
    const shown = world.lore.filter(x => filter === 'all' || x.kind === filter);
    for (const x of shown) {
      list.append(h('a', { class: 'lore-item' + (x === entry ? ' on' : ''), href: `#/w/${world.id}/lore/${x.id}` },
        h('span', { class: 'lore-item-icon' }, iconOf(x.kind)), h('span', {}, x.title || 'untitled page')));
    }
  };

  const filters = h('div', { class: 'chip-row' });
  const drawFilters = () => {
    clear(filters);
    const used = KINDS.filter(([kind]) => world.lore.some(x => x.kind === kind));
    if (used.length < 2) return;
    for (const [kind, icon, label] of [['all', '', 'all'], ...used]) {
      filters.append(h('button', { class: 'chip' + (filter === kind ? ' on' : ''), onclick: () => { filter = kind; drawFilters(); drawList(); } }, icon, ' ', label));
    }
  };

  function addEntry() {
    const x = { id: 'l_' + uid(), title: '', kind: filter === 'all' ? 'place' : filter, body: '', imageId: null };
    world.lore.push(x);
    save();
    go(`w/${world.id}/lore/${x.id}`);
  }

  el.append(h('div', { class: 'lore' + (entry ? ' has-entry' : '') },
    h('aside', { class: 'lore-list' },
      h('div', { class: 'page-head' }, h('h1', {}, 'lore'), h('button', { class: 'btn primary sm', onclick: addEntry }, '+ new page')),
      filters,
      list),
    h('div', { class: 'lore-page' }, entry ? editor(entry) : placeholder())));
  drawFilters();
  drawList();

  function placeholder() {
    return h('div', { class: 'lore-empty' },
      h('div', { class: 'lore-empty-icon' }, '📖'),
      h('button', { class: 'btn primary', onclick: addEntry }, '+ new page'));
  }

  function editor(x) {
    const banner = h('div', { class: 'lore-banner' });
    const drawBanner = () => {
      clear(banner);
      if (x.imageId) {
        const img = h('img', { alt: '' });
        store.imageURL(x.imageId).then(url => { if (url) img.src = url; });
        banner.append(img, h('div', { class: 'lore-banner-actions' },
          h('button', { class: 'link-btn', onclick: changePic }, 'change pic'),
          h('button', { class: 'link-btn', onclick: () => { store.deleteImage(x.imageId); x.imageId = null; save(); drawBanner(); } }, 'remove')));
      } else {
        banner.append(h('button', { class: 'link-btn', onclick: changePic }, '+ add a picture'));
      }
    };

    async function changePic() {
      const file = await pickFile('image/*');
      if (!file) return;
      try {
        const { blob } = await shrinkImage(file, 1400);
        const old = x.imageId;
        x.imageId = await store.putImage(blob);
        if (old) store.deleteImage(old);
        save();
        drawBanner();
      } catch (err) {
        console.error(err);
        toast("couldn't read that picture", 'bad');
      }
    }

    const kinds = h('div', { class: 'chip-row' });
    const drawKinds = () => {
      clear(kinds);
      for (const [kind, icon, label] of KINDS) {
        kinds.append(h('button', { class: 'chip' + (x.kind === kind ? ' on' : ''), onclick: () => { x.kind = kind; save(); drawKinds(); drawFilters(); drawList(); } }, icon, ' ', label));
      }
    };

    async function remove() {
      if (!await confirmDialog(`delete the "${x.title || 'untitled'}" page? this can't be undone.`, { okLabel: 'delete page', danger: true })) return;
      if (x.imageId) store.deleteImage(x.imageId);
      world.lore = world.lore.filter(y => y !== x);
      save();
      go(`w/${world.id}/lore`);
    }

    drawBanner();
    drawKinds();
    const titleInput = h('input', {
      type: 'text', class: 'profile-name', value: x.title, placeholder: 'page title', maxLength: 80,
      oninput: e => { x.title = e.target.value; save(); drawList(); },
    });
    if (!x.title) requestAnimationFrame(() => titleInput.focus());
    return h('div', { class: 'lore-editor' },
      h('div', { class: 'page-head' },
        h('a', { class: 'back-link lore-back', href: `#/w/${world.id}/lore` }, '← all lore'),
        h('button', { class: 'link-btn danger', onclick: remove }, 'delete page')),
      titleInput,
      kinds,
      banner,
      autosize(h('textarea', { class: 'section-text lore-body', value: x.body, placeholder: '…', oninput: e => { x.body = e.target.value; save(); } })));
  }
}
