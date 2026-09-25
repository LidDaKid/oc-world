// relationships between ocs: the presets, how one reads from each person's side, and the editor.
// (the shape of a rel is explained at the top of model.js)

import { h, clear, fill, toast, openModal, confirmDialog, swatches, segmented, field } from './ui.js';
import { store } from './store.js';
import { newRel } from './model.js';
import { portrait, nameOf } from './parts.js';

// [what they are to you, what you are back, line color]
// back: null = same word from both sides, '' = one-sided
export const REL_PRESETS = [
  ['bestie', null, '#ffd84d'], ['friend', null, '#7df9d0'], ['dating', null, '#ff4fa3'], ['married', null, '#ff4fa3'],
  ['crush', '', '#ff8ac4'], ['ex', null, '#9b8aa8'], ['sibling', null, '#6ec6ff'], ['twin', null, '#6ec6ff'],
  ['parent', 'kid', '#6ec6ff'], ['kid', 'parent', '#6ec6ff'], ['cousin', null, '#6ec6ff'], ['family', null, '#6ec6ff'],
  ['rival', null, '#ff9a3d'], ['enemy', null, '#ff5d6c'], ['mentor', 'student', '#b18cff'], ['student', 'mentor', '#b18cff'],
  ['bandmate', null, '#9be564'], ['roommate', null, '#9be564'], ['pet', 'owner', '#ff9a3d'], ["it's complicated", null, '#e3c6ff'],
];

// a rel is stored once but shows up on both people's pages. this reads it from one person's side.
export function seenFrom(rel, charId) {
  const mine = rel.a === charId;
  const other = mine ? (rel.b ? store.char(rel.b) : null) : store.char(rel.a);
  const same = rel.back == null;
  return {
    other, // an oc, or null when it's only a typed name
    otherName: other ? nameOf(other) : rel.bName,
    theyAre: mine || same ? rel.label : rel.back, // what the other person is to charId
    iAm: same ? null : mine ? rel.back : rel.label, // what charId is to them. null = same word
  };
}

// me = the oc whose side we're on. rel = one to edit (or leave out for a new one).
// other = an oc to start with already picked. onHide = adds a "hide on this board" button.
export function openRelEditor({ me, rel = null, other = null, onDone = () => {}, onHide = null }) {
  const view = rel ? seenFrom(rel, me.id) : null;
  const mine = !rel || rel.a === me.id;
  const arrowOut = mine ? 'to' : 'from', arrowIn = mine ? 'from' : 'to';
  const state = {
    char: view ? view.other : other,
    locked: !!(view?.other || other),
    name: view && !view.other ? view.otherName : '',
    theyAre: view?.theyAre || '',
    same: view ? view.iAm == null : true,
    iAm: view?.iAm || '',
    color: rel?.color || '#ff4fa3',
    line: rel?.line || 'solid',
    arrow: !rel || rel.arrow === 'none' || rel.arrow === 'both' ? rel?.arrow || 'none' : rel.arrow === arrowOut ? 'out' : 'in',
    note: rel?.note || '',
  };
  const others = store.chars.filter(c => c.id !== me.id);
  const myName = nameOf(me);
  const theirName = () => (state.char ? nameOf(state.char) : state.name.trim()) || 'them';

  // ---- who: pick one of your ocs, or just type a name ----
  const whoBox = h('div', { class: 'who-picker' });
  function drawWho() {
    if (state.char) {
      fill(whoBox, h('div', { class: 'who-picked', style: { '--c': state.char.color } },
        portrait(state.char, 'sm'), h('strong', {}, nameOf(state.char)),
        state.locked ? null : h('button', { type: 'button', class: 'icon-btn sm', title: 'pick someone else', onclick: () => { state.char = null; drawWho(); drawSides(); } }, '✕')));
      return;
    }
    const options = h('div', { class: 'who-options' });
    const drawOptions = () => {
      const q = state.name.trim().toLowerCase();
      const found = others.filter(c => !q || nameOf(c).toLowerCase().includes(q)).slice(0, 10);
      fill(options,
        found.map(c => h('button', {
          type: 'button', class: 'who-option', style: { '--c': c.color },
          onclick: () => { state.char = c; state.name = ''; drawWho(); drawSides(); },
        }, portrait(c, 'xs'), nameOf(c))),
        q && !found.some(c => nameOf(c).toLowerCase() === q)
          ? h('p', { class: 'field-hint' }, `"${state.name.trim()}" saves as just a name`) : null);
    };
    fill(whoBox,
      h('input', {
        type: 'text', value: state.name, maxLength: 60, placeholder: others.length ? 'pick an oc below, or type any name' : 'type a name',
        'data-autofocus': true, oninput: e => { state.name = e.target.value; drawOptions(); drawSides(); },
      }),
      options);
    drawOptions();
  }

  // ---- what they are to each other ----
  const theyAreInput = h('input', {
    type: 'text', value: state.theyAre, maxLength: 40, placeholder: 'pick one below, or type your own',
    'data-autofocus': state.locked ? true : null, oninput: e => state.theyAre = e.target.value,
  });
  const colorPicker = swatches(state.color, c => state.color = c);
  const theyAreLabel = h('span', { class: 'field-label' });
  const sides = h('div', {});
  function drawSides() {
    const who = state.char ? nameOf(state.char) : state.name.trim();
    theyAreLabel.textContent = who ? `${who} is ${myName}'s…` : `they are ${myName}'s…`;
    fill(sides, state.char ? [
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: state.same, onchange: e => { state.same = e.target.checked; drawSides(); } }),
        ' it’s the same from both sides'),
      state.same ? null : field(`and ${myName} is ${theirName()}'s…`,
        h('input', { type: 'text', value: state.iAm, maxLength: 40, placeholder: 'empty = one-sided',oninput: e => state.iAm = e.target.value })),
    ] : null);
  }

  function pickPreset([label, back, color]) {
    Object.assign(state, { theyAre: label, same: back == null, iAm: back || '', color });
    theyAreInput.value = label;
    colorPicker.set(color);
    drawSides();
  }

  function commit(close) {
    const typed = state.name.trim();
    const who = state.char || others.find(c => nameOf(c).toLowerCase() === typed.toLowerCase());
    if (!who && !typed) {
      toast('who is it with? pick an oc or type a name', 'bad');
      return;
    }
    const target = rel || newRel({ a: me.id });
    const theyAre = state.theyAre.trim(), iAm = state.iAm.trim();
    const same = !who || state.same;
    if (mine) Object.assign(target, { b: who ? who.id : null, bName: who ? '' : typed, label: theyAre, back: same ? null : iAm });
    else Object.assign(target, { label: same ? theyAre : iAm, back: same ? null : theyAre });
    Object.assign(target, {
      color: state.color, line: state.line, note: state.note.trim(),
      arrow: state.arrow === 'out' ? arrowOut : state.arrow === 'in' ? arrowIn : state.arrow,
    });
    if (rel) store.save('rel', target);
    else store.add('rel', target);
    close();
    onDone(target);
  }

  drawWho();
  drawSides();
  openModal({
    title: rel ? 'edit relationship' : 'new relationship',
    body: [
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'who'), whoBox),
      h('div', { class: 'field' }, theyAreLabel, theyAreInput),
      h('div', { class: 'chip-row' }, REL_PRESETS.map(p =>
        h('button', { type: 'button', class: 'chip', style: { '--c': p[2] }, onclick: () => pickPreset(p) }, p[0]))),
      sides,
      field('notes', h('textarea', { rows: 2, value: state.note, oninput: e => state.note = e.target.value })),
      field('color', colorPicker),
      h('details', { class: 'more' },
        h('summary', {}, 'line style'),
        field('line', segmented([
          { value: 'solid', label: '━━ solid' }, { value: 'dashed', label: '╍╍ dashed' }, { value: 'dotted', label: '┅┅ dotted' },
        ], state.line, v => state.line = v)),
        field('arrows', segmented([
          { value: 'none', label: 'none' }, { value: 'out', label: `${myName} → them` },
          { value: 'in', label: `them → ${myName}` }, { value: 'both', label: '↔ both' },
        ], state.arrow, v => state.arrow = v))),
    ],
    actions: [
      rel ? {
        label: 'delete', kind: 'danger', onClick: async close => {
          if (!await confirmDialog(`delete this relationship? it comes off both of their pages and every board.`, { okLabel: 'delete', danger: true })) return;
          await store.remove('rel', rel.id);
          close();
          onDone(null);
        },
      } : null,
      rel && onHide ? { label: 'hide on this board', onClick: close => { close(); onHide(rel); } } : null,
      { label: 'cancel', onClick: close => close() },
      { label: rel ? 'save' : 'add', kind: 'primary', onClick: commit },
    ].filter(Boolean),
  });
}
