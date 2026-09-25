// connections: boards where you drop ocs and see the lines between them
//
// a board is { id, name, nodes, edges, hiddenRels }
//   node = { id, kind: 'oc', charId, x, y }  or  { id, kind: 'note', text, color, x, y }
//
// two kinds of lines end up on a board:
//   - relationships (store.rels). they belong to the ocs, not the board, so any two ocs who know each
//     other get their line automatically on every board they're both on. board.hiddenRels turns one off here.
//   - board.edges: lines that touch a text bubble. those only exist on this board.
//     edge = { id, a, b, label, color, line, arrow }   (a + b are node ids)
//
// nodes + labels are plain html, the lines are one svg underneath, and they all
// sit inside the same zoomable viewport so they stay glued together.

import { store } from '../store.js';
import { newBoard } from '../model.js';
import { h, s, clear, fill, uid, openModal, confirmDialog, hasOpenModal, swatches, segmented, field } from '../ui.js';
import { PanZoom } from '../panzoom.js';
import { portrait, nameOf, zoomButtons } from '../parts.js';
import { openRelEditor } from '../rels.js';

const OC_RADIUS = 47; // where lines stop so they don't run over someone's face

export function render(el, { world, sub, save, go }) {
  if (!world.boards.length) {
    world.boards.push(newBoard('everyone'));
    save();
  }
  const board = world.boards.find(b => b.id === sub) || world.boards[0];
  // tidy up anything pointing at an oc that no longer exists
  board.nodes = board.nodes.filter(n => n.kind !== 'oc' || store.char(n.charId));
  board.edges = board.edges.filter(e => board.nodes.some(n => n.id === e.a) && board.nodes.some(n => n.id === e.b));

  let selected = null;
  let connect = null; // { from, drag }
  let lines = []; // what's drawn right now, see collectLines()
  const nodeEls = new Map();
  const lineEls = new Map();
  const offsets = new Map(); // line id -> how far it bows out, so two lines between the same pair don't overlap

  const nodeById = id => board.nodes.find(n => n.id === id);
  const titleOf = n => (n.kind === 'oc' ? nameOf(store.char(n.charId)) : n.text);

  // ---- dom ----

  const lineLayer = s('g');
  const rubber = s('path', { class: 'rubber' });
  const svg = s('svg', { class: 'edges' }, lineLayer, rubber);
  const labelLayer = h('div', { class: 'edge-labels' });
  const nodeLayer = h('div', { class: 'nodes' });
  const viewport = h('div', { class: 'viewport' }, svg, labelLayer, nodeLayer);
  const selBar = h('div', { class: 'sel-bar', hidden: true });
  const emptyMsg = h('div', { class: 'canvas-empty' }, 'tap an oc to put them on the board');
  const canvas = h('div', { class: 'canvas dots' }, viewport, emptyMsg, selBar);
  const side = h('aside', { class: 'board-side' });
  const bar = h('div', { class: 'board-bar' });
  const wrap = h('div', { class: 'board-wrap' + (window.innerWidth < 760 ? ' side-closed' : '') }, side, h('div', { class: 'board-main' }, bar, canvas));
  el.append(wrap);

  const pz = new PanZoom(canvas, viewport, {
    minK: 0.15, maxK: 3,
    canPan: e => !e.target.closest('.node, .edge, .edge-label, .sel-bar'),
    onTap: () => { if (connect) cancelConnect(); else select(null); },
    onChange: p => {
      canvas.style.backgroundSize = `${28 * p.k}px ${28 * p.k}px`;
      canvas.style.backgroundPosition = `${p.x}px ${p.y}px`;
    },
  });

  // ---- which lines are on this board ----

  function collectLines() {
    const nodeOf = new Map(board.nodes.filter(n => n.kind === 'oc').map(n => [n.charId, n]));
    lines = [];
    for (const rel of store.rels) {
      const A = nodeOf.get(rel.a), B = rel.b && nodeOf.get(rel.b);
      if (!A || !B || board.hiddenRels.includes(rel.id)) continue;
      const same = rel.back == null || rel.back === rel.label;
      // when the two sides are different words, each word sits next to the person it describes
      lines.push({
        id: rel.id, a: A.id, b: B.id, color: rel.color, line: rel.line, arrow: rel.arrow, rel,
        labels: same ? [[rel.label, 0.5]] : [[rel.back, 0.26], [rel.label, 0.74]],
      });
    }
    for (const e of board.edges) lines.push({ ...e, edge: e, labels: [[e.label, 0.5]] });

    offsets.clear();
    const groups = new Map();
    for (const l of lines) {
      const key = l.a < l.b ? `${l.a}|${l.b}` : `${l.b}|${l.a}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(l);
    }
    for (const list of groups.values()) list.forEach((l, i) => offsets.set(l.id, (i - (list.length - 1) / 2) * 46));
  }

  // ---- geometry ----

  // the spot where a line leaving node n toward (tx, ty) crosses n's outline
  function outlinePoint(n, tx, ty) {
    let dx = tx - n.x, dy = ty - n.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    if (n.kind === 'oc') return { x: n.x + dx * OC_RADIUS, y: n.y + dy * OC_RADIUS, dx, dy };
    const bubble = nodeEls.get(n.id)?.firstElementChild;
    const hw = (bubble?.offsetWidth || 120) / 2 + 7, hh = (bubble?.offsetHeight || 44) / 2 + 7;
    const t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    return { x: n.x + dx * t, y: n.y + dy * t, dx, dy };
  }

  function arrowHead(p) {
    // p is on the outline, (dx, dy) points away from the node, so the tip sits at p
    const bx = p.x + p.dx * 14, by = p.y + p.dy * 14;
    const nx = -p.dy * 7, ny = p.dx * 7;
    return `M${p.x},${p.y} L${bx + nx},${by + ny} L${bx - nx},${by - ny} Z`;
  }

  function placeLine(l) {
    const els = lineEls.get(l.id);
    const A = nodeById(l.a), B = nodeById(l.b);
    if (!els || !A || !B) return;
    // the bow direction is worked out from the pair in a fixed order so a->b and b->a bow opposite ways
    const [P, Q] = A.id < B.id ? [A, B] : [B, A];
    const len = Math.hypot(Q.x - P.x, Q.y - P.y) || 1;
    const off = offsets.get(l.id) || 0;
    const mx = (A.x + B.x) / 2 + (-(Q.y - P.y) / len) * off;
    const my = (A.y + B.y) / 2 + ((Q.x - P.x) / len) * off;
    // control point that makes the curve pass through (mx, my)
    const cx = 2 * mx - (A.x + B.x) / 2, cy = 2 * my - (A.y + B.y) / 2;
    const a = outlinePoint(A, cx, cy), b = outlinePoint(B, cx, cy);
    const arrowAtA = l.arrow === 'from' || l.arrow === 'both';
    const arrowAtB = l.arrow === 'to' || l.arrow === 'both';
    // pull the line back a little under an arrowhead so the round cap doesn't poke out the tip
    const ax = a.x + (arrowAtA ? a.dx * 8 : 0), ay = a.y + (arrowAtA ? a.dy * 8 : 0);
    const bx = b.x + (arrowAtB ? b.dx * 8 : 0), by = b.y + (arrowAtB ? b.dy * 8 : 0);
    const d = `M${ax},${ay} Q${cx},${cy} ${bx},${by}`;
    els.line.setAttribute('d', d);
    els.hit.setAttribute('d', d);
    els.arrows.setAttribute('d', (arrowAtA ? arrowHead(a) : '') + (arrowAtB ? arrowHead(b) : ''));
    els.labels.forEach((labelEl, i) => {
      const t = l.labels[i][1], u = 1 - t;
      labelEl.style.left = u * u * ax + 2 * u * t * cx + t * t * bx + 'px';
      labelEl.style.top = u * u * ay + 2 * u * t * cy + t * t * by + 'px';
    });
  }

  const linesOf = nodeId => lines.filter(l => l.a === nodeId || l.b === nodeId);

  // ---- drawing ----

  function drawLines() {
    clear(lineLayer);
    clear(labelLayer);
    lineEls.clear();
    collectLines();
    for (const l of lines) {
      const line = s('path', { class: 'edge-line ' + (l.line || 'solid'), stroke: l.color });
      const arrows = s('path', { class: 'edge-arrows', fill: l.color });
      const hit = s('path', { class: 'edge-hit' });
      lineLayer.append(s('g', { class: 'edge', onclick: () => editLine(l) }, line, arrows, hit));
      const labels = l.labels.map(([text]) =>
        h('button', { class: 'edge-label', style: { '--c': l.color }, hidden: !text, onclick: () => editLine(l) }, text));
      labelLayer.append(...labels);
      lineEls.set(l.id, { line, arrows, hit, labels });
      placeLine(l);
    }
    drawBar();
  }

  function drawNodes() {
    clear(nodeLayer);
    nodeEls.clear();
    for (const n of board.nodes) {
      const c = n.kind === 'oc' ? store.char(n.charId) : null;
      const nodeEl = h('div', {
        class: `node node-${n.kind}` + (n.id === selected ? ' selected' : ''),
        dataset: { id: n.id },
        style: { left: n.x + 'px', top: n.y + 'px', '--c': c ? c.color : n.color },
        onpointerdown: e => onNodeDown(e, n),
        ondblclick: () => (c ? go(`w/${world.id}/ocs/${c.id}`) : editNote(n)),
      },
        c ? [portrait(c, 'node-pic'), h('div', { class: 'node-name' }, nameOf(c))]
          : h('div', { class: 'node-bubble' }, n.text),
        h('div', { class: 'node-handle', title: 'drag onto someone to connect them' }, '+'));
      nodeLayer.append(nodeEl);
      nodeEls.set(n.id, nodeEl);
    }
    emptyMsg.hidden = board.nodes.length > 0;
  }

  function drawAll() {
    drawNodes(); // nodes first: bubble sizes are measured when placing lines
    drawLines();
    drawSide();
    drawSelBar();
  }

  function drawSide() {
    const cast = store.cast(world);
    const placed = new Map(board.nodes.filter(n => n.kind === 'oc').map(n => [n.charId, n]));
    fill(side,
      h('div', { class: 'side-title' }, 'ocs'),
      !cast.length ? h('a', { class: 'btn ghost sm', href: `#/w/${world.id}/ocs` }, '+ add ocs to this world') : null,
      cast.map(c => {
        const node = placed.get(c.id);
        return h('button', { class: 'side-oc' + (node ? ' placed' : ''), onclick: () => (node ? findNode(node) : addOc(c)) },
          portrait(c, 'sm'), h('span', { class: 'side-oc-name' }, nameOf(c)), node ? h('span', { class: 'tick' }, '✓') : null);
      }),
      h('div', { class: 'side-actions' },
        cast.some(c => !placed.has(c.id)) ? h('button', { class: 'btn ghost sm', onclick: addEveryone }, 'add everyone') : null,
        h('button', { class: 'btn ghost sm', onclick: () => editNote(null) }, '+ text bubble')));
  }

  function drawSelBar() {
    clear(selBar);
    const n = selected && nodeById(selected);
    if (connect) {
      selBar.append(h('span', {}, `tap who ${titleOf(nodeById(connect.from))} connects to`),
        h('button', { class: 'btn ghost sm', onclick: cancelConnect }, 'cancel'));
    } else if (n) {
      selBar.append(h('strong', { class: 'sel-name' }, titleOf(n)),
        h('button', { class: 'btn primary sm', onclick: () => startConnect(n.id) }, '🧶 connect'),
        n.kind === 'oc'
          ? h('button', { class: 'btn ghost sm', onclick: () => go(`w/${world.id}/ocs/${n.charId}`) }, 'profile')
          : h('button', { class: 'btn ghost sm', onclick: () => editNote(n) }, 'edit'),
        h('button', { class: 'btn ghost sm', onclick: () => removeNode(n) }, 'take off board'));
    }
    selBar.hidden = !connect && !n;
  }

  function drawBar() {
    const hidden = board.hiddenRels.filter(id => store.rels.some(r => r.id === id)).length;
    fill(bar,
      h('button', { class: 'icon-btn', title: 'show / hide the oc list', onclick: () => wrap.classList.toggle('side-closed') }, '☰'),
      world.boards.length > 1
        ? h('select', { class: 'board-select', value: board.id, onchange: e => go(`w/${world.id}/web/${e.target.value}`) },
          world.boards.map(b => h('option', { value: b.id }, b.name)))
        : h('strong', { class: 'board-name' }, board.name),
      h('button', { class: 'icon-btn', title: 'rename this board', onclick: renameBoard }, '✏️'),
      h('button', { class: 'btn ghost sm', onclick: addBoard }, '+ board'),
      world.boards.length > 1 ? h('button', { class: 'link-btn danger', onclick: removeBoard }, 'delete board') : null,
      hidden ? h('button', { class: 'link-btn', onclick: () => { board.hiddenRels = []; save(); drawLines(); } }, `show ${hidden} hidden`) : null,
      h('div', { class: 'bar-spacer' }),
      zoomButtons(() => pz, fit));
  }

  // ---- selecting + moving ----

  function select(id) {
    if (selected === id) return;
    nodeEls.get(selected)?.classList.remove('selected');
    selected = id;
    nodeEls.get(id)?.classList.add('selected');
    drawSelBar();
  }

  function onNodeDown(e, n) {
    if (e.button !== 0) return;
    if (connect && !connect.drag) {
      finishConnect(n.id);
      return;
    }
    if (e.target.closest('.node-handle')) {
      startConnect(n.id, e);
      return;
    }
    const nodeEl = nodeEls.get(n.id);
    const start = { x: e.clientX, y: e.clientY, nx: n.x, ny: n.y };
    let moved = false;
    nodeEl.setPointerCapture(e.pointerId);
    const move = ev => {
      if (ev.pointerId !== e.pointerId || pz.pinching) return;
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      nodeEl.classList.add('dragging');
      n.x = Math.round(start.nx + dx / pz.k);
      n.y = Math.round(start.ny + dy / pz.k);
      nodeEl.style.left = n.x + 'px';
      nodeEl.style.top = n.y + 'px';
      linesOf(n.id).forEach(placeLine);
    };
    const up = ev => {
      if (ev.pointerId !== e.pointerId) return;
      nodeEl.removeEventListener('pointermove', move);
      nodeEl.removeEventListener('pointerup', up);
      nodeEl.removeEventListener('pointercancel', up);
      nodeEl.classList.remove('dragging');
      if (moved) save();
      else select(n.id);
    };
    nodeEl.addEventListener('pointermove', move);
    nodeEl.addEventListener('pointerup', up);
    nodeEl.addEventListener('pointercancel', up);
  }

  // ---- connecting ----
  // two ways in: drag the little + handle onto someone, or hit "connect" then tap someone.

  function drawRubber(clientX, clientY) {
    const from = nodeById(connect.from);
    const p = pz.toWorld(clientX, clientY);
    rubber.setAttribute('d', `M${from.x},${from.y} L${p.x},${p.y}`);
  }

  function startConnect(fromId, dragEvent) {
    connect = { from: fromId, drag: !!dragEvent };
    canvas.classList.add('connecting');
    select(fromId);
    drawSelBar();
    if (!dragEvent) return;
    const handle = dragEvent.target;
    handle.setPointerCapture(dragEvent.pointerId);
    const move = ev => drawRubber(ev.clientX, ev.clientY);
    const up = ev => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      const target = ev.type === 'pointerup' && document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.node');
      if (target && target.dataset.id !== fromId) finishConnect(target.dataset.id);
      else cancelConnect();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function cancelConnect() {
    connect = null;
    canvas.classList.remove('connecting');
    rubber.removeAttribute('d');
    drawSelBar();
  }

  function finishConnect(toId) {
    const from = nodeById(connect.from), to = nodeById(toId);
    cancelConnect();
    if (from === to) return;
    // two ocs = a real relationship (shows on their pages too). anything with a text bubble = a line just for this board.
    if (from.kind === 'oc' && to.kind === 'oc') {
      openRelEditor({ me: store.char(from.charId), other: store.char(to.charId), onDone: drawLines });
    } else {
      editEdge({ a: from.id, b: to.id }, true);
    }
  }

  canvas.addEventListener('pointermove', e => {
    if (connect && !connect.drag) drawRubber(e.clientX, e.clientY);
  });

  function editLine(l) {
    if (l.edge) editEdge(l.edge);
    else {
      openRelEditor({
        me: store.char(l.rel.a), rel: l.rel, onDone: drawLines,
        onHide: rel => { board.hiddenRels.push(rel.id); save(); drawLines(); },
      });
    }
  }

  function editEdge(edge, isNew = false) {
    const draft = { label: '', color: '#ffd84d', line: 'solid', arrow: 'none', ...edge };
    const A = titleOf(nodeById(draft.a)), B = titleOf(nodeById(draft.b));
    openModal({
      title: `${A} + ${B}`,
      body: [
        field('label', h('input', { type: 'text', value: draft.label, maxLength: 40, 'data-autofocus': true, oninput: e => draft.label = e.target.value })),
        field('color', swatches(draft.color, c => draft.color = c)),
        field('line', segmented([
          { value: 'solid', label: '━━ solid' }, { value: 'dashed', label: '╍╍ dashed' }, { value: 'dotted', label: '┅┅ dotted' },
        ], draft.line, v => draft.line = v)),
        field('arrows', segmented([
          { value: 'none', label: 'none' }, { value: 'to', label: `${A} → ${B}` },
          { value: 'from', label: `${B} → ${A}` }, { value: 'both', label: '↔ both' },
        ], draft.arrow, v => draft.arrow = v)),
      ],
      actions: [
        isNew ? null : {
          label: 'delete', kind: 'danger', onClick: close => {
            board.edges = board.edges.filter(e => e !== edge);
            save();
            close();
            drawLines();
          },
        },
        { label: 'cancel', onClick: close => close() },
        {
          label: isNew ? 'connect' : 'save', kind: 'primary', onClick: close => {
            draft.label = draft.label.trim();
            if (isNew) board.edges.push({ id: 'e_' + uid(), ...draft });
            else Object.assign(edge, draft);
            save();
            close();
            drawLines();
          },
        },
      ].filter(Boolean),
    });
  }

  // ---- adding + removing ----

  function dropSpot() {
    const c = pz.center();
    const jitter = () => Math.round((Math.random() - 0.5) * 160);
    return { x: Math.round(c.x) + jitter(), y: Math.round(c.y) + jitter() };
  }

  function addOc(c) {
    const node = { id: 'n_' + uid(), kind: 'oc', charId: c.id, ...dropSpot() };
    board.nodes.push(node);
    save();
    drawAll();
    select(node.id);
  }

  function addEveryone() {
    const placed = new Set(board.nodes.map(n => n.charId));
    const missing = store.cast(world).filter(c => !placed.has(c.id));
    const center = pz.center();
    const radius = Math.max(190, missing.length * 42);
    missing.forEach((c, i) => {
      const angle = (i / missing.length) * Math.PI * 2 - Math.PI / 2;
      board.nodes.push({ id: 'n_' + uid(), kind: 'oc', charId: c.id, x: Math.round(center.x + Math.cos(angle) * radius), y: Math.round(center.y + Math.sin(angle) * radius) });
    });
    save();
    drawAll();
    fit();
  }

  function editNote(node) {
    const draft = { text: node?.text || '', color: node?.color || '#ffd84d' };
    openModal({
      title: 'text bubble',
      body: [
        field('text', h('input', { type: 'text', value: draft.text, maxLength: 80, placeholder: 'a group, a place, an event', 'data-autofocus': true, oninput: e => draft.text = e.target.value })),
        field('color', swatches(draft.color, c => draft.color = c)),
      ],
      actions: [
        { label: 'cancel', onClick: close => close() },
        {
          label: node ? 'save' : 'add', kind: 'primary', onClick: close => {
            const text = draft.text.trim();
            if (!text) return;
            if (node) Object.assign(node, { text, color: draft.color });
            else board.nodes.push({ id: 'n_' + uid(), kind: 'note', text, color: draft.color, ...dropSpot() });
            save();
            close();
            drawAll();
          },
        },
      ],
    });
  }

  async function removeNode(n) {
    // relationship lines come back if the oc is put on the board again. lines to text bubbles don't.
    const count = board.edges.filter(e => e.a === n.id || e.b === n.id).length;
    if (count && !await confirmDialog(`take ${titleOf(n)} off this board? ${count === 1 ? 'the line' : `${count} lines`} to text bubbles will go too.`, { okLabel: 'take off' })) return;
    board.nodes = board.nodes.filter(x => x !== n);
    board.edges = board.edges.filter(e => e.a !== n.id && e.b !== n.id);
    selected = null;
    save();
    drawAll();
  }

  function findNode(node) {
    pz.centerOn(node.x, node.y);
    select(node.id);
  }

  function fit() {
    if (!board.nodes.length) {
      pz.k = 1;
      pz.centerOn(0, 0);
      return;
    }
    const xs = board.nodes.map(n => n.x), ys = board.nodes.map(n => n.y);
    const x = Math.min(...xs) - 90, y = Math.min(...ys) - 90;
    pz.fit({ x, y, w: Math.max(...xs) + 90 - x, h: Math.max(...ys) + 110 - y }, { pad: 30, maxK: 1 });
  }

  // ---- boards ----

  function nameBoardModal(title, value, onDone) {
    let name = value;
    openModal({
      title,
      body: field('name', h('input', { type: 'text', value, maxLength: 40, placeholder: 'family tree, the band, season 2', 'data-autofocus': true, oninput: e => name = e.target.value })),
      actions: [
        { label: 'cancel', onClick: close => close() },
        { label: 'ok', kind: 'primary', onClick: close => { if (name.trim()) { close(); onDone(name.trim()); } } },
      ],
    });
  }

  function renameBoard() {
    nameBoardModal('rename board', board.name, name => { board.name = name; save(); drawBar(); });
  }

  function addBoard() {
    nameBoardModal('new board', '', name => {
      const b = newBoard(name);
      world.boards.push(b);
      save();
      go(`w/${world.id}/web/${b.id}`);
    });
  }

  async function removeBoard() {
    if (!await confirmDialog(`delete the "${board.name}" board? your ocs and their relationships stay.`, { okLabel: 'delete board', danger: true })) return;
    world.boards = world.boards.filter(b => b !== board);
    save();
    go(`w/${world.id}/web`);
  }

  // ---- keys ----

  function onKey(e) {
    if (hasOpenModal() || e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Escape') {
      if (connect) cancelConnect();
      else select(null);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      removeNode(nodeById(selected));
    }
  }
  document.addEventListener('keydown', onKey);

  drawAll();
  requestAnimationFrame(fit);

  return {
    cleanup() {
      pz.destroy();
      document.removeEventListener('keydown', onKey);
    },
    // someone else in a collab world changed something: redraw without moving the camera
    refresh() {
      if (!world.boards.includes(board)) return go(`w/${world.id}/web`);
      if (pz.pointers.size) return setTimeout(() => this.refresh(), 300); // mid-drag, try again in a sec
      if (selected && !nodeById(selected)) selected = null;
      if (connect && !nodeById(connect.from)) cancelConnect();
      drawAll();
    },
  };
}
