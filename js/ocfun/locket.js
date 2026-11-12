// locket: a heart (or oval / round) locket on a chain. the front has an engraving; tap it and the lid swings
// open to the two pictures inside. a picture can be an upload or any oc's pfp. they can have a few lockets.
//
// d.lockets = [{ id, shape, metal, engraving, left: { imageId, ocId }, right: { imageId, ocId } }]

import { h, fill, segmented, openModal, confirmDialog, uid } from '../ui.js';
import { appBar, uploadPic, pic, portrait, nameOf, worldmates, ocById } from './kit.js';
import { store } from '../store.js';
import { defaults } from './room-layer.js';

export const meta = { id: 'locket', label: 'locket', icon: '1f49d' };

const SHAPES = ['heart', 'oval', 'round'];
const METALS = ['gold', 'silver', 'rose gold', 'black'];
const DEF = { lockets: null, at: 0 };

function side(s, char) {
  if (s?.imageId) return pic(s.imageId, 'lkt-img');
  const oc = s?.ocId ? ocById(s.ocId) : null;
  if (oc) return oc.imageId ? pic(oc.imageId, 'lkt-img') : portrait(oc, 'lkt-pfp');
  return h('div', { class: 'lkt-blank' });
}

export function locket(l, char, { open = false } = {}) {
  const shape = l.shape || 'heart', metal = (l.metal || 'gold').replace(/\W/g, '');
  return h('div', { class: `lkt-locket lkt-${shape} lkt-${metal}${open ? ' open' : ''}` },
    h('div', { class: 'lkt-chain' }, h('i', { class: 'lkt-bail' })),
    h('div', { class: 'lkt-body' },
      h('div', { class: 'lkt-case' }, h('div', { class: 'lkt-hole' }, side(l.right, char)), h('div', { class: 'lkt-rim' })),
      h('div', { class: 'lkt-lid' },
        h('div', { class: 'lkt-front' }, h('div', { class: 'lkt-shine' }), h('div', { class: 'lkt-scroll' }), h('div', { class: 'lkt-engrave' }, l.engraving || '')),
        h('div', { class: 'lkt-inside' }, h('div', { class: 'lkt-hole' }, side(l.left, char)), h('div', { class: 'lkt-rim' })))));
}

export function render(el, ctx) {
  const { char } = ctx;
  const d = defaults(ctx.data, DEF);
  const edit = ctx.mine;
  if (!Array.isArray(d.lockets)) {
    d.lockets = [{ id: 'lk_' + uid(), shape: 'heart', metal: 'gold', engraving: 'forever', left: { ocId: char.id }, right: {} }];
    if (edit) ctx.save();
  }
  const save = () => { if (edit) ctx.save(); };
  let opened = false;
  const chips = h('div', { class: 'lkt-chips' });
  const stage = h('div', { class: 'lkt-stage' });
  el.append(appBar(ctx, meta,
    edit ? h('button', { class: 'btn ghost sm', onclick: () => editOne(cur()) }, 'edit') : null,
    edit ? h('button', { class: 'btn primary sm', onclick: () => {
      d.lockets.push({ id: 'lk_' + uid(), shape: SHAPES[d.lockets.length % 3], metal: METALS[d.lockets.length % 4], engraving: '', left: {}, right: {} });
      d.at = d.lockets.length - 1; opened = false; save(); draw(); editOne(cur());
    } }, '+ locket') : null), chips, stage);

  const cur = () => d.lockets[Math.max(0, Math.min(d.lockets.length - 1, d.at || 0))];

  function draw() {
    const l = cur();
    fill(chips, d.lockets.length > 1 ? d.lockets.map((x, i) => h('button', {
      type: 'button', class: `lkt-chip lkt-${(x.metal || 'gold').replace(/\W/g, '')}` + (x === l ? ' on' : ''), title: x.engraving || 'locket',
      onclick: () => { d.at = i; opened = false; save(); draw(); },
    }, h('i', { class: `lkt-mini lkt-${x.shape || 'heart'}` }))) : null);
    if (!l) { fill(stage); return; }
    const node = locket(l, char, { open: opened });
    node.querySelector('.lkt-body').onclick = () => { opened = !opened; node.classList.toggle('open', opened); };
    fill(stage, node);
  }

  function editOne(l) {
    if (!l) return;
    const field = (label, input) => h('label', { class: 'lkt-field' }, h('span', {}, label), input);
    const prev = h('div', { class: 'lkt-prev' });
    const redo = () => { fill(prev, locket(l, char, { open: true })); save(); draw(); };
    const mates = [char, ...worldmates(char.id)];
    const picker = key => {
      const box = h('div', { class: 'lkt-picker' });
      const drawP = () => {
        const s = l[key] ||= {};
        fill(box,
          h('select', { onchange: e => { if (s.imageId) store.deleteImage(s.imageId); s.imageId = null; s.ocId = e.target.value || null; drawP(); redo(); } },
            h('option', { value: '' }, s.imageId ? 'my picture' : '—'),
            mates.map(m => h('option', { value: m.id, selected: !s.imageId && s.ocId === m.id }, nameOf(m)))),
          h('button', { type: 'button', class: 'btn ghost sm', onclick: async () => {
            const got = await uploadPic(800, { aspect: 1 });
            if (!got) return;
            if (s.imageId) store.deleteImage(s.imageId);
            s.imageId = got.imageId; s.ocId = null; drawP(); redo();
          } }, s.imageId ? 'change picture' : '+ picture'));
      };
      drawP();
      return box;
    };
    redo();
    openModal({
      title: 'locket', wide: true,
      body: h('div', { class: 'lkt-edit' },
        h('div', { class: 'lkt-form' },
          field('engraving', h('input', { type: 'text', value: l.engraving || '', maxLength: 18, placeholder: 'forever', oninput: e => { l.engraving = e.target.value; redo(); } })),
          field('shape', segmented(SHAPES.map(v => ({ value: v, label: v })), l.shape || 'heart', v => { l.shape = v; redo(); })),
          field('metal', segmented(METALS.map(v => ({ value: v, label: v })), l.metal || 'gold', v => { l.metal = v; redo(); })),
          field('left picture', picker('left')),
          field('right picture', picker('right'))),
        prev),
      actions: [
        ...(d.lockets.length > 1 ? [{ label: 'delete', kind: 'ghost', onClick: async close => {
          if (!await confirmDialog('delete this locket?', { okLabel: 'delete', danger: true })) return;
          [l.left?.imageId, l.right?.imageId].forEach(id => id && store.deleteImage(id));
          d.lockets = d.lockets.filter(x => x !== l); d.at = 0;
          save(); draw(); close();
        } }] : []),
        { label: 'done', kind: 'primary', onClick: close => close() },
      ],
    });
  }

  draw();
}
