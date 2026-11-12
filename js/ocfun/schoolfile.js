// school file: the oc's manila folder from the front office. tabs for the report card, teacher notes,
// detention slips and permission slips, all drawn like real school paperwork.
// saved in char.fun.schoolfile = { tab, report: { school, year, term, rows: [{ id, subject, grade, comment }] },
//   notes: [{ id, teacher, text }], detentions: [{ id, date, teacher, reason, signed }], slips: [{ id, trip, date, cost, parent, signed }] }

import { h, fill, uid, confirmDialog } from '../ui.js';
import { appBar, nameOf } from './kit.js';

export const meta = { id: 'schoolfile', label: 'school file', icon: '1f4cb' };

const TABS = [['report', 'report card'], ['notes', 'teacher notes'], ['detention', 'detention'], ['slips', 'permission slips']];
const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
const POINTS = { 'A+': 4, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, 'D-': .7, F: 0 };
const SUBJECTS = ['english', 'math', 'history', 'science', 'art', 'gym'];

export function render(el, ctx) {
  const { char, mine, save } = ctx;
  const d = ctx.data;
  d.tab ||= 'report';
  d.report ||= { school: '', year: '', term: '', rows: [] };
  if (!d.report.rows.length && mine) d.report.rows = SUBJECTS.map(subject => ({ id: uid(), subject, grade: '', comment: '' }));
  d.notes ||= [];
  d.detentions ||= [];
  d.slips ||= [];

  const ro = mine ? {} : { readOnly: true, disabled: true };
  const field = (obj, key, ph, cls = '', type = 'text', after = null) => h('input', {
    type, class: 'sf-field ' + cls, value: obj[key] || '', placeholder: mine ? ph : '', ...ro,
    oninput: e => { obj[key] = e.target.value; save(); after?.(); },
  });
  const area = (obj, key, ph, cls = '') => h('textarea', {
    class: 'sf-area ' + cls, rows: 3, value: obj[key] || '', placeholder: mine ? ph : '', ...ro,
    oninput: e => { obj[key] = e.target.value; save(); },
  });
  const xBtn = (list, item, redraw) => mine ? h('button', {
    type: 'button', class: 'sf-x', title: 'remove', onclick: async () => {
      if (!await confirmDialog('throw this one out?', { okLabel: 'remove', danger: true })) return;
      list.splice(list.indexOf(item), 1); save(); redraw();
    },
  }, '✕') : null;
  const sig = name => h('span', { class: 'sf-sig' }, name);

  const tabs = h('div', { class: 'sf-tabs' });
  const sheet = h('div', { class: 'sf-sheet' });

  function drawTabs() {
    fill(tabs, h('div', { class: 'sf-label' }, h('span', {}, 'student file'), h('b', {}, nameOf(char))), TABS.map(([id, label]) => h('button', {
      type: 'button', class: 'sf-tab' + (d.tab === id ? ' on' : ''),
      onclick: () => { d.tab = id; save(); draw(); },
    }, label)));
  }

  // ---- report card ----
  function report() {
    const r = d.report;
    const gpaEl = h('div', { class: 'sf-gpa' });
    const drawGpa = () => {
      const pts = r.rows.map(x => POINTS[x.grade]).filter(v => v != null);
      fill(gpaEl, h('small', {}, 'gpa'), h('b', {}, pts.length ? (pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(2) : '—'));
    };
    drawGpa();
    const body = h('tbody');
    const drawRows = () => fill(body, r.rows.map(row => h('tr', {},
      h('td', {}, field(row, 'subject', 'subject', 'sf-subj')),
      h('td', { class: 'sf-grade-cell' }, mine
        ? h('select', { class: 'sf-grade grade-' + gradeTone(row.grade), onchange: e => { row.grade = e.target.value; e.target.className = 'sf-grade grade-' + gradeTone(row.grade); save(); drawGpa(); } },
          h('option', { value: '' }, '—'), GRADES.map(g => h('option', { value: g, selected: g === row.grade }, g)))
        : h('span', { class: 'sf-grade grade-' + gradeTone(row.grade) }, row.grade || '—')),
      h('td', {}, field(row, 'comment', 'comment', 'sf-comment')),
      h('td', { class: 'sf-x-cell' }, xBtn(r.rows, row, () => { drawRows(); drawGpa(); })))));
    drawRows();
    return h('div', { class: 'sf-paper sf-report' },
      h('div', { class: 'sf-letterhead' },
        h('div', { class: 'sf-crest' }, '✦'),
        h('div', { class: 'sf-lh-text' }, field(r, 'school', 'school name', 'sf-school'), h('div', { class: 'sf-lh-sub' }, 'official report card')),
        gpaEl),
      h('div', { class: 'sf-info' },
        h('label', {}, h('span', {}, 'student'), h('b', { class: 'sf-student' }, nameOf(char))),
        h('label', {}, h('span', {}, 'year'), field(r, 'year', '2006')),
        h('label', {}, h('span', {}, 'term'), field(r, 'term', 'fall'))),
      h('table', { class: 'sf-table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'subject'), h('th', {}, 'grade'), h('th', {}, 'teacher comment'), h('th'))),
        body),
      mine ? h('button', { type: 'button', class: 'btn ghost sm sf-add', onclick: () => { r.rows.push({ id: uid(), subject: '', grade: '', comment: '' }); save(); drawRows(); } }, '+ class') : null,
      h('div', { class: 'sf-stamp sf-stamp-office' }, 'front office'));
  }

  // ---- teacher notes: index cards ----
  function notes() {
    const wrap = h('div', { class: 'sf-cards' });
    const draw = () => fill(wrap,
      d.notes.map((n, i) => h('div', { class: 'sf-index', style: { '--r': (i % 2 ? 1.2 : -1.4) + 'deg' } },
        h('div', { class: 'sf-index-head' }, field(n, 'teacher', 'teacher', 'sf-teacher'), xBtn(d.notes, n, draw)),
        area(n, 'text', 'note', 'sf-index-text'))),
      !d.notes.length && !mine ? h('div', { class: 'sf-none' }, '—') : null);
    draw();
    return h('div', { class: 'sf-notes' }, wrap,
      mine ? h('button', { type: 'button', class: 'btn ghost sm sf-add', onclick: () => { d.notes.push({ id: uid(), teacher: '', text: '' }); save(); draw(); } }, '+ note') : null);
  }

  // ---- detention slips: pink carbon copies ----
  function detention() {
    const wrap = h('div', { class: 'sf-slips' });
    const draw = () => fill(wrap,
      d.detentions.map(s => {
        const sigBox = h('div', { class: 'sf-sign-line' });
        const drawSig = () => fill(sigBox, s.signed ? sig(nameOf(char)) : null, h('small', {}, 'student signature'));
        drawSig();
        return h('div', { class: 'sf-slip sf-detention' + (s.signed ? ' signed' : '') },
          h('div', { class: 'sf-slip-head' }, h('b', {}, 'detention'), h('span', { class: 'sf-slip-no' }, 'no. ' + (s.id.slice(0, 5).toUpperCase())), xBtn(d.detentions, s, draw)),
          h('div', { class: 'sf-slip-row' },
            h('label', {}, h('span', {}, 'date'), field(s, 'date', '', '', 'date')),
            h('label', {}, h('span', {}, 'teacher'), field(s, 'teacher', 'teacher'))),
          h('label', { class: 'sf-block' }, h('span', {}, 'reason'), area(s, 'reason', 'what happened')),
          sigBox,
          mine ? h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!s.signed, onchange: e => { s.signed = e.target.checked; save(); drawSig(); e.target.closest('.sf-slip').classList.toggle('signed', s.signed); } }), ' signed') : null,
          h('div', { class: 'sf-stamp sf-stamp-red' }, 'detention'));
      }),
      !d.detentions.length && !mine ? h('div', { class: 'sf-none' }, '—') : null);
    draw();
    return h('div', {}, wrap,
      mine ? h('button', { type: 'button', class: 'btn ghost sm sf-add', onclick: () => { d.detentions.unshift({ id: uid(), date: '', teacher: '', reason: '', signed: false }); save(); draw(); } }, '+ detention slip') : null);
  }

  // ---- permission slips ----
  function slips() {
    const wrap = h('div', { class: 'sf-slips' });
    const draw = () => fill(wrap,
      d.slips.map(s => {
        const sigBox = h('div', { class: 'sf-sign-line' });
        const drawSig = () => fill(sigBox, s.signed ? sig(s.parent || 'mom') : null, h('small', {}, 'parent / guardian signature'));
        drawSig();
        const stamp = h('div', { class: 'sf-stamp sf-stamp-ok' }, 'approved');
        return h('div', { class: 'sf-slip sf-permission' + (s.signed ? ' signed' : '') },
          h('div', { class: 'sf-slip-head' }, h('b', {}, 'permission slip'), xBtn(d.slips, s, draw)),
          h('div', { class: 'sf-perm-line' }, 'i give permission for ', h('b', {}, nameOf(char)), ' to go on'),
          h('label', { class: 'sf-block' }, h('span', {}, 'trip'), field(s, 'trip', 'the aquarium')),
          h('div', { class: 'sf-slip-row' },
            h('label', {}, h('span', {}, 'date'), field(s, 'date', '', '', 'date')),
            h('label', {}, h('span', {}, 'cost'), field(s, 'cost', '$5')),
            h('label', {}, h('span', {}, 'parent'), field(s, 'parent', 'name', '', 'text', drawSig))),
          sigBox,
          mine ? h('label', { class: 'sf-check' }, h('input', { type: 'checkbox', checked: !!s.signed, onchange: e => { s.signed = e.target.checked; save(); drawSig(); e.target.closest('.sf-slip').classList.toggle('signed', s.signed); } }), ' signed') : null,
          h('div', { class: 'sf-tear' }),
          stamp);
      }),
      !d.slips.length && !mine ? h('div', { class: 'sf-none' }, '—') : null);
    draw();
    return h('div', {}, wrap,
      mine ? h('button', { type: 'button', class: 'btn ghost sm sf-add', onclick: () => { d.slips.unshift({ id: uid(), trip: '', date: '', cost: '', parent: '', signed: false }); save(); draw(); } }, '+ permission slip') : null);
  }

  function draw() {
    drawTabs();
    fill(sheet, d.tab === 'notes' ? notes() : d.tab === 'detention' ? detention() : d.tab === 'slips' ? slips() : report());
  }

  el.append(appBar(ctx, meta),
    h('div', { class: 'sf-desk' },
      h('div', { class: 'sf-folder' },
        tabs,
        h('div', { class: 'sf-inside' }, h('div', { class: 'sf-clip' }), sheet))));
  draw();
}

function gradeTone(g) {
  if (!g) return 'none';
  if (g.startsWith('A')) return 'a';
  if (g.startsWith('B')) return 'b';
  if (g.startsWith('C')) return 'c';
  return 'f';
}
