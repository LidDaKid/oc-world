// computer apps: file explorer (my documents / my pictures / my music / recycle bin), picture viewer,
// notepad + word (with word art), paint, webcam. see the plug-in notes at the top of computer.js
//
// saved on the computer's data:
//   docs  [{ id, kind: 'txt'|'doc', title, text (txt) | html (doc), at }]
//   pics  [{ id, imageId, name, from: 'upload'|'paint'|'webcam', at }]
//   cam   { imageId }  the webcam's picture (otherwise the account pic)

import { h, s, fill, uid, toast } from '../ui.js';
import { store } from '../store.js';
import { pic, sticker, nameOf, uploadPic } from './kit.js';
import { addPhotos, dropImage, shortDate } from './phone-bits.js';
import { docText, cleanHtml, WORDART, esc, menuBar, askText, tbtn, ICO } from './computer-bits.js';
import { openModal } from '../ui.js';

export const DEF = { docs: [], pics: [], cam: { imageId: null } };

const PLACES = [['docs', 'my documents', '1f4c1'], ['pics', 'my pictures', '1f5bc-fe0f'], ['music', 'my music', '1f3b5'], ['bin', 'recycle bin', '1f5d1-fe0f']];
const placeLabel = (at, look) => (look === 'modern' ? { docs: 'documents', pics: 'pictures', music: 'music', bin: 'recycle bin' }[at] : PLACES.find(p => p[0] === at)?.[1]) || 'my documents';
const KIND_ICON = { doc: '1f4c4', txt: '1f4dd', pic: '1f5bc-fe0f', site: '1f310', mail: '1f4e7', song: '1f3b5' };
const docIcon = doc => (doc.kind === 'txt' ? '1f4dd' : '1f4c4');
const docName = (doc, look) => (doc.title || 'untitled') + (look === 'y2k' ? (doc.kind === 'txt' ? '.txt' : '.doc') : '');

export const APPS = {
  files: { label: 'my documents', labelNow: 'files', icon: '1f4c1', w: 560, h: 380, title: (p, api) => placeLabel(p.at || 'docs', api.look), render: explorer },
  pics: { label: 'pictures', icon: '1f5bc-fe0f', w: 560, h: 380, hidden: true, only: 'modern', title: (p, api) => placeLabel(p.at || 'pics', api.look), render: (win, api) => { win.params.at ||= 'pics'; return explorer(win, api); } },
  bin: { label: 'recycle bin', icon: '1f5d1-fe0f', w: 520, h: 340, hidden: true, title: (p, api) => placeLabel(p.at || 'bin', api.look), render: (win, api) => { win.params.at ||= 'bin'; return explorer(win, api); } },
  viewer: { label: 'picture viewer', labelNow: 'photos', icon: '1f5bc-fe0f', w: 520, h: 420, hidden: true, title: (p, api) => api.d.pics.find(x => x.id === p.id)?.name || 'picture', render: viewer },
  notepad: { label: 'notepad', icon: '1f4dd', w: 460, h: 340, multi: true, key: p => p.id || '', title: (p, api) => `${docTitle(api, p.id)}${api.look === 'y2k' ? '.txt - notepad' : ''}`, render: notepad },
  word: { label: 'word', labelNow: 'docs', icon: '1f4c4', w: 600, h: 420, multi: true, key: p => p.id || '', title: (p, api) => `${docTitle(api, p.id)}${api.look === 'y2k' ? '.doc - word' : ''}`, render: word },
  paint: { label: 'paint', labelNow: 'draw', icon: '1f3a8', w: 620, h: 460, minW: 300, minH: 260, title: (p, api) => (api.look === 'y2k' ? `${api.d.pics.find(x => x.id === p.id)?.name || 'untitled'} - paint` : 'draw'), render: paint },
  webcam: { label: 'webcam', labelNow: 'camera', icon: '1f4f7', w: 460, h: 420, render: webcam },
};
const docTitle = (api, id) => api.d.docs.find(x => x.id === id)?.title || 'untitled';

// ---------------------------------------------------------------- explorer
function explorer(win, api) {
  const { d, mine, look } = api;
  const at = win.params.at || 'docs';
  let sel = null; // the item that's clicked on
  const root = h('div', { class: 'cpf cpf-' + at });
  const items = h('div', { class: 'cpf-items' });
  const tasks = h('div', { class: 'cpf-tasks' });
  const go = where => win.go({ at: where });
  const songs = () => [...api.char.playlist.map((sg, i) => ({ id: sg.id, title: sg.title || 'untitled', real: true, index: i })), ...(d.songs || []).map(sg => ({ ...sg, real: false }))];

  const openItem = it => {
    if (at === 'docs') api.open(it.kind === 'txt' ? 'notepad' : 'word', { id: it.id });
    else if (at === 'pics') api.open('viewer', { id: it.id });
    else if (at === 'music') api.open('music', { play: it.id });
    else if (at === 'bin') binPeek(it);
  };
  function binPeek(entry) {
    const it = entry.item;
    const body = entry.kind === 'pic' ? pic(it.imageId, 'cpf-peek-img')
      : entry.kind === 'doc' ? h('div', { class: 'cpf-peek-doc' }, docText(it) || ' ')
        : h('div', { class: 'cpf-peek-doc' }, it.title || it.subject || it.name || '', '\n\n', it.text || it.body || '');
    openModal({
      title: binName(entry), body: h('div', { class: 'cpf-peek' }, body),
      actions: mine ? [{ label: 'restore', kind: 'primary', onClick: close => { api.restore(entry); close(); } }] : [],
    });
  }
  const binName = e => (e.kind === 'doc' ? docName(e.item, look) : e.kind === 'pic' ? e.item.name : e.item.title || e.item.subject || e.item.name || 'item');

  function list() {
    if (at === 'docs') return [...d.docs].sort((a, b) => b.at - a.at).map(doc => ({ it: doc, icon: docIcon(doc), name: docName(doc, look), sub: shortDate(doc.at) }));
    if (at === 'pics') return d.pics.map(p => ({ it: p, img: p.imageId, name: p.name, sub: p.from }));
    if (at === 'music') return songs().map(sg => ({ it: sg, icon: '1f3b5', name: sg.title, sub: sg.artist || nameOf(api.char) }));
    return [...d.bin].reverse().map(e => ({ it: e, icon: KIND_ICON[e.kind] || '1f4c4', img: e.kind === 'pic' ? e.item.imageId : null, name: binName(e), sub: shortDate(e.at) }));
  }

  function drawItems() {
    const rows = list();
    fill(items, rows.length ? rows.map(r => {
      const b = h('button', { type: 'button', class: 'cpf-item' + (sel === r.it ? ' sel' : '') + (r.img ? ' thumb' : ''), title: r.name },
        h('span', { class: 'cpf-item-img' }, r.img ? pic(r.img) : sticker(r.icon)),
        h('span', { class: 'cpf-item-name' }, r.name),
        look === 'modern' ? h('span', { class: 'cpf-item-sub' }, r.sub) : null);
      b.addEventListener('click', () => { if (api.small()) { openItem(r.it); return; } sel = r.it; drawItems(); drawTasks(); });
      b.addEventListener('dblclick', () => openItem(r.it));
      return b;
    }) : h('div', { class: 'cpf-empty' }, at === 'bin' ? sticker('1f5d1-fe0f', 'cpf-empty-stk') : sticker(PLACES.find(p => p[0] === at)[2], 'cpf-empty-stk')));
  }

  const task = (label, fn, icon) => h('button', { type: 'button', class: 'cpf-task', onclick: fn }, icon ? icon() : null, h('span', {}, label));
  function drawTasks() {
    const t = [];
    if (mine) {
      if (at === 'docs') t.push(task(look === 'y2k' ? 'new text document' : 'new note', () => api.open('notepad', { id: newDoc(api, 'txt').id }), ICO.plus), task(look === 'y2k' ? 'new word document' : 'new document', () => api.open('word', { id: newDoc(api, 'doc').id }), ICO.plus));
      if (at === 'pics') t.push(task('upload pictures', async () => {
        const got = await addPhotos(true);
        got.forEach((g, i) => d.pics.push({ id: 'p_' + uid(), imageId: g.imageId, name: `picture ${d.pics.length + 1}`, from: 'upload', at: Date.now() + i }));
        if (got.length) { api.save(); api.refresh('files'); }
      }, ICO.plus), task('new drawing', () => api.open('paint', {}), ICO.plus));
      if (at === 'music') t.push(task('open music player', () => api.open('music'), null));
      if (at === 'bin' && d.bin.length) t.push(task('empty recycle bin', async () => {
        if (!(await api.ask(`are you sure you want to permanently delete these ${d.bin.length} items?`, 'yes', 'confirm delete'))) return;
        [...d.bin].forEach(e => api.forget(e));
      }, ICO.trash), task('restore all items', () => [...d.bin].forEach(e => api.restore(e)), ICO.restore));
      if (sel && at !== 'music') {
        if (at === 'bin') t.push(task('restore this item', () => { api.restore(sel); sel = null; }, ICO.restore), task('delete forever', async () => { if (await api.ask(`are you sure you want to permanently delete '${binName(sel)}'?`, 'yes', 'confirm delete')) { api.forget(sel); sel = null; } }, ICO.trash));
        else {
          t.push(task('open', () => openItem(sel), null));
          t.push(task('rename', async () => {
            const it = sel;
            const v = await askText('rename', at === 'docs' ? it.title : it.name);
            if (!v) return;
            if (at === 'docs') it.title = v; else it.name = v;
            api.save(); api.refresh('files'); api.refresh('word'); api.refresh('notepad');
          }, null));
          t.push(task('delete', () => { const it = sel; sel = null; api.toBin(at === 'docs' ? 'doc' : 'pic', it); api.wins.filter(w => w.params?.id === it.id && w.app !== 'files').forEach(w => w.close()); }, ICO.trash));
        }
      }
    }
    fill(tasks, t);
  }

  const places = h('div', { class: 'cpf-places' }, PLACES.map(([id, label, icon]) => h('button', { type: 'button', class: 'cpf-place' + (id === at ? ' on' : ''), 'data-at': id, onclick: () => go(id) }, sticker(icon, 'cpf-place-ico'), h('span', {}, placeLabel(id, look)))));
  drawItems(); drawTasks();
  if (look === 'y2k') {
    fill(root,
      menuBar([['file', [['new text document', () => mine && api.open('notepad', { id: newDoc(api, 'txt').id }), { off: !mine }], ['new word document', () => mine && api.open('word', { id: newDoc(api, 'doc').id }), { off: !mine }], null, ['close', () => win.close()]]],
        ['view', PLACES.map(([id, label]) => [label, () => go(id), { on: id === at }])]]),
      h('div', { class: 'cp-toolbar' },
        tbtn('back', [ICO.back(), h('span', {}, 'back')], () => go('docs'), 'wide'),
        tbtn('up', ICO.up(), () => go('docs')),
        h('div', { class: 'cp-addr' }, h('span', { class: 'cp-addr-label' }, 'address'), h('div', { class: 'cp-addr-box' }, sticker(PLACES.find(p => p[0] === at)[2], 'cp-addr-ico'), h('span', {}, `c:\\documents and settings\\${nameOf(api.char).toLowerCase().split(' ')[0]}\\${placeLabel(at, look)}`)))),
      h('div', { class: 'cpf-main' },
        h('div', { class: 'cpf-side' },
          h('div', { class: 'cpf-box' }, h('div', { class: 'cpf-box-head' }, at === 'bin' ? 'recycle bin tasks' : at === 'pics' ? 'picture tasks' : at === 'music' ? 'music tasks' : 'file and folder tasks'), tasks),
          h('div', { class: 'cpf-box' }, h('div', { class: 'cpf-box-head' }, 'other places'), places)),
        items),
      h('div', { class: 'cp-status' }, `${list().length} objects`));
  } else {
    fill(root,
      h('div', { class: 'cpf-top' }, h('b', {}, placeLabel(at, look)), tasks),
      h('div', { class: 'cpf-main' }, h('div', { class: 'cpf-side' }, places), items));
  }
  return root;
}

export function newDoc(api, kind) {
  const n = api.d.docs.filter(x => x.kind === kind).length + 1;
  const doc = { id: 'd_' + uid(), kind, title: kind === 'txt' ? `notes ${n}` : `document ${n}`, at: Date.now(), ...(kind === 'txt' ? { text: '' } : { html: '' }) };
  api.d.docs.push(doc);
  api.save();
  api.refresh('files');
  return doc;
}

// ---------------------------------------------------------------- picture viewer
function viewer(win, api) {
  const { d, mine } = api;
  const i = d.pics.findIndex(p => p.id === win.params.id);
  const p = d.pics[i];
  if (!p) return h('div', { class: 'cp-oops' }, 'this picture is gone');
  const step = k => win.go({ id: d.pics[(i + k + d.pics.length) % d.pics.length].id });
  const setWall = () => { const L = d[api.look]; L.imageId = p.imageId; api.save(); api.redrawDesk(); api.notify(api.look === 'y2k' ? 'desktop' : 'wallpaper', p.name, null, '1f5bc-fe0f'); };
  return h('div', { class: 'cpv' },
    h('div', { class: 'cpv-pic' }, pic(p.imageId, 'cpv-img')),
    h('div', { class: 'cpv-bar' },
      tbtn('previous', ICO.back(), () => step(-1)),
      tbtn('next', ICO.fwd(), () => step(1)),
      mine ? h('button', { type: 'button', class: 'cp-btn', onclick: setWall }, api.look === 'y2k' ? 'set as desktop background' : 'set as wallpaper') : null,
      mine ? h('button', { type: 'button', class: 'cp-btn', onclick: () => api.open('paint', { id: p.id }) }, 'edit') : null,
      mine ? tbtn('delete', ICO.trash(), () => { win.close(); api.toBin('pic', p); }) : null));
}

// ---------------------------------------------------------------- notepad
function notepad(win, api) {
  const { d, mine, look } = api;
  let doc = d.docs.find(x => x.id === win.params.id) || null;
  let wrap = true;
  const ta = h('textarea', { class: 'cpn-text', spellcheck: false, readOnly: !mine, value: doc?.text || '' });
  let t = 0;
  ta.addEventListener('input', () => {
    if (!doc) { doc = newDoc(api, 'txt'); win.params = { id: doc.id }; win.key = doc.id; }
    doc.text = ta.value;
    doc.at = Date.now();
    clearTimeout(t);
    t = setTimeout(() => { api.save(); api.refresh('files'); }, 400);
  });
  win.cleanup = () => { if (t) { clearTimeout(t); api.save(); } };
  const rename = async () => { if (!doc) { doc = newDoc(api, 'txt'); win.params = { id: doc.id }; } const v = await askText('save as', doc.title); if (v) { doc.title = v; api.save(); win.redraw(); api.refresh('files'); } };
  const fresh = () => api.open('notepad', { id: newDoc(api, 'txt').id });
  const trash = () => { if (!doc) return win.close(); win.close(); api.toBin('doc', doc); };
  return h('div', { class: 'cpn' + (wrap ? ' wrap' : '') },
    look === 'y2k' ? menuBar([
      ['file', [['new', fresh, { off: !mine }], ['save as...', rename, { off: !mine }], null, ['move to recycle bin', trash, { off: !mine }], ['exit', () => win.close()]]],
      ['format', [['word wrap', () => { wrap = !wrap; ta.parentNode.classList.toggle('wrap', wrap); }, { on: wrap }]]],
    ]) : h('div', { class: 'cpn-top' },
      h('button', { type: 'button', class: 'cp-btn ghost', onclick: rename, disabled: !mine }, doc?.title || 'untitled'),
      mine ? tbtn('new', ICO.plus(), fresh) : null, mine ? tbtn('delete', ICO.trash(), trash) : null),
    ta);
}

// ---------------------------------------------------------------- word (with word art)
const FONTS = ['Times New Roman', 'Arial', 'Comic Sans MS', 'Verdana', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact',
  'Caveat', 'Creepster', 'Special Elite', 'Pixelify Sans', 'Permanent Marker', 'UnifrakturMaguntia', 'Fredoka', 'Indie Flower', 'Rubik Glitch', 'Homemade Apple'];
const SIZES = [['1', '8'], ['2', '10'], ['3', '12'], ['4', '14'], ['5', '18'], ['6', '24'], ['7', '36']];
const COLORS = ['#000000', '#ff0000', '#ff4fa3', '#ff9900', '#ffd700', '#33cc33', '#0099ff', '#3333cc', '#9933ff', '#ffffff', '#808080', '#8b0000'];

function word(win, api) {
  const { d, mine, look } = api;
  let doc = d.docs.find(x => x.id === win.params.id) || null;
  const page = h('div', { class: 'cpw-page', contentEditable: mine ? 'true' : 'false', spellcheck: false });
  page.innerHTML = cleanHtml(doc?.html || '');
  let t = 0, range = null;
  const keep = () => {
    if (!doc) { doc = newDoc(api, 'doc'); win.params = { id: doc.id }; win.key = doc.id; }
    doc.html = cleanHtml(page.innerHTML);
    doc.at = Date.now();
    clearTimeout(t);
    t = setTimeout(() => { api.save(); api.refresh('files'); }, 400);
  };
  win.cleanup = () => { if (t) { clearTimeout(t); api.save(); } };
  page.addEventListener('input', keep);
  const remember = () => { const sl = getSelection(); if (sl.rangeCount && page.contains(sl.anchorNode)) range = sl.getRangeAt(0).cloneRange(); };
  page.addEventListener('keyup', remember);
  page.addEventListener('mouseup', remember);
  page.addEventListener('blur', remember);
  const back = () => { page.focus(); if (range) { const sl = getSelection(); sl.removeAllRanges(); sl.addRange(range); } };
  const cmd = (c, v = null) => { if (!mine) return; back(); document.execCommand('styleWithCSS', false, false); document.execCommand(c, false, v); remember(); keep(); };

  const wordArt = () => {
    if (!mine) return;
    let style = WORDART[0];
    const text = h('input', { type: 'text', maxLength: 40, value: '', placeholder: 'your text here', 'data-autofocus': '' });
    const gallery = h('div', { class: 'cpw-wa-gallery' });
    const draw = () => fill(gallery, WORDART.map(st => h('button', { type: 'button', class: 'cpw-wa-pick' + (st === style ? ' on' : ''), 'data-style': st, title: st, onclick: () => { style = st; draw(); } },
      waNode(st, 'word art'))));
    draw();
    openModal({
      title: 'word art gallery', wide: true,
      body: h('div', { class: 'cpw-wa-box' }, gallery, text),
      actions: [{ label: 'insert', kind: 'primary', onClick: close => {
        const v = text.value.trim();
        if (!v) { text.focus(); return; }
        close();
        back();
        const letters = [...v].map(ch => `<span>${esc(ch)}</span>`).join('');
        document.execCommand('insertHTML', false, `<div data-wa="${style}" contenteditable="false">${letters}</div><div><br></div>`);
        keep();
      } }],
    });
  };
  const sel = (cls, opts, onchange, title) => h('select', { class: 'cpw-sel ' + cls, title, disabled: !mine, onchange: e => { onchange(e.target.value); e.target.selectedIndex = 0; } }, opts);
  const colorPick = (title, c) => h('label', { class: 'cpw-color', title }, h('i', { style: { background: c === 'foreColor' ? '#ff0000' : '#ffff00' } }),
    h('input', { type: 'color', disabled: !mine, onchange: e => cmd(c, e.target.value) }));
  const tools = h('div', { class: 'cp-toolbar cpw-tools' },
    sel('cpw-font', [h('option', { value: '' }, look === 'y2k' ? 'Times New Roman' : 'font'), ...FONTS.map(f => h('option', { value: f, style: { fontFamily: `'${f}'` } }, f))], v => v && cmd('fontName', v), 'font'),
    sel('cpw-size', [h('option', { value: '' }, '12'), ...SIZES.map(([v, l]) => h('option', { value: v }, l))], v => v && cmd('fontSize', v), 'size'),
    h('span', { class: 'cpw-sep' }),
    tbtn('bold', h('b', {}, 'B'), () => cmd('bold'), 'cpw-b'),
    tbtn('italic', h('i', {}, 'I'), () => cmd('italic'), 'cpw-i'),
    tbtn('underline', h('u', {}, 'U'), () => cmd('underline'), 'cpw-u'),
    h('span', { class: 'cpw-sep' }),
    tbtn('align left', alignIco('l'), () => cmd('justifyLeft')),
    tbtn('center', alignIco('c'), () => cmd('justifyCenter')),
    tbtn('align right', alignIco('r'), () => cmd('justifyRight')),
    tbtn('bullets', h('span', { class: 'cpw-bul' }, '•≡'), () => cmd('insertUnorderedList')),
    h('span', { class: 'cpw-sep' }),
    colorPick('font color', 'foreColor'), colorPick('highlight', 'hiliteColor'),
    h('div', { class: 'cpw-swatches' }, COLORS.map(c => h('button', { type: 'button', class: 'cpw-sw', title: c, style: { background: c }, onmousedown: e => e.preventDefault(), onclick: () => cmd('foreColor', c) }))),
    h('span', { class: 'cpw-sep' }),
    h('button', { type: 'button', class: 'cpw-wa-btn', title: 'word art', disabled: !mine, onmousedown: e => e.preventDefault(), onclick: wordArt }, h('span', { 'data-wa': 'rainbow' }, 'A'), 'word art'));
  const rename = async () => { if (!doc) { doc = newDoc(api, 'doc'); win.params = { id: doc.id }; } const v = await askText('save as', doc.title); if (v) { doc.title = v; api.save(); win.redraw(); api.refresh('files'); } };
  const trash = () => { if (!doc) return win.close(); win.close(); api.toBin('doc', doc); };
  return h('div', { class: 'cpw' },
    look === 'y2k' ? menuBar([
      ['file', [['new', () => api.open('word', { id: newDoc(api, 'doc').id }), { off: !mine }], ['save as...', rename, { off: !mine }], null, ['move to recycle bin', trash, { off: !mine }], ['exit', () => win.close()]]],
      ['insert', [['word art...', wordArt, { off: !mine }], ['date and time', () => cmd('insertText', new Date().toLocaleString()), { off: !mine }]]],
    ]) : h('div', { class: 'cpw-top' }, h('button', { type: 'button', class: 'cp-btn ghost cpw-name', onclick: rename, disabled: !mine }, doc?.title || 'untitled'), mine ? tbtn('delete', ICO.trash(), trash) : null),
    tools,
    h('div', { class: 'cpw-desk' }, page));
}
// a word art sample / block
export const waNode = (style, text) => h('span', { class: 'cpw-wa', 'data-wa': style }, [...text].map(ch => h('span', {}, ch)));
const alignIco = k => s('svg', { viewBox: '0 0 16 16', class: 'cp-i' }, [3, 6, 9, 12].map((y, i) => {
  const w = i % 2 ? 8 : 12;
  const x = k === 'l' ? 2 : k === 'r' ? 14 - w : 8 - w / 2;
  return s('rect', { x, y, width: w, height: 1.6, fill: 'currentColor' });
}));

// ---------------------------------------------------------------- paint
const PALETTE = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'];
const MODERN_COLORS = ['#141114', '#ffffff', '#ff4fa3', '#ff8ac4', '#d81e5b', '#ff7a3d', '#ffd84d', '#9be564', '#7df9d0', '#6ec6ff', '#3a5bd9', '#b18cff', '#6b2fa3', '#9b8aa8'];
const TOOLS = [
  ['pencil', 'pencil', 'M3 17l1-4 9-9 3 3-9 9zM12 5l3 3'],
  ['brush', 'brush', 'M14 3l3 3-7 7-3-3zM7 10c-2 0-4 2-3.5 6 3 .5 5.5-1.5 5.5-3.5'],
  ['spray', 'airbrush', 'M7 8h6v9H7zM8.5 8V5.5h3V8M14.5 4.5h.1M16.5 3h.1M16.5 6h.1M18 4.5h.1'],
  ['eraser', 'eraser', 'M3 13l7-7 6 6-5 5H7zM9 17h8'],
  ['fill', 'fill', 'M4 10l6-6 6 6-6 6zM16 12c1 1.5 2 2.6 2 3.6a2 2 0 0 1-4 0c0-1 1-2.1 2-3.6'],
  ['picker', 'pick color', 'M14 3l3 3-2 2-1-1-7 7-3 1 1-3 7-7-1-1z'],
  ['line', 'line', 'M3 17 17 3'],
  ['rect', 'rectangle', 'M3 5h14v10H3z'],
  ['ellipse', 'ellipse', 'M10 4c4.4 0 7 2.7 7 6s-2.6 6-7 6-7-2.7-7-6 2.6-6 7-6z'],
];
const SIZES_PX = [2, 4, 8, 14, 24];

function paint(win, api) {
  const { d, mine, look } = api;
  const editing = d.pics.find(p => p.id === win.params.id) || null;
  const W = 640, H = 440;
  const cv = h('canvas', { class: 'cpp-canvas', width: W, height: H });
  const over = h('canvas', { class: 'cpp-over', width: W, height: H });
  const g = cv.getContext('2d', { willReadFrequently: true });
  const og = over.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  if (editing) store.imageURL(editing.imageId).then(url => { if (!url) return; const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, W, H); }; im.src = url; });
  const st = win.paintState ||= { tool: 'brush', fg: look === 'y2k' ? '#000000' : '#ff4fa3', bg: '#ffffff', size: 4 };
  const undo = [];
  const snap = () => { undo.push(g.getImageData(0, 0, W, H)); if (undo.length > 20) undo.shift(); };
  const doUndo = () => { const im = undo.pop(); if (im) g.putImageData(im, 0, 0); };
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  const dot = (ctx2, x, y, c) => { ctx2.fillStyle = c; ctx2.beginPath(); ctx2.arc(x, y, st.size / 2, 0, 7); ctx2.fill(); };
  const lineTo = (ctx2, a, b, c, w = st.size) => { ctx2.strokeStyle = c; ctx2.lineWidth = w; ctx2.lineCap = 'round'; ctx2.lineJoin = 'round'; ctx2.beginPath(); ctx2.moveTo(...a); ctx2.lineTo(...b); ctx2.stroke(); };
  const shape = (ctx2, a, b, c) => {
    ctx2.strokeStyle = c; ctx2.lineWidth = Math.max(1, st.size / 2);
    ctx2.beginPath();
    if (st.tool === 'line') { ctx2.lineCap = 'round'; ctx2.moveTo(...a); ctx2.lineTo(...b); }
    else if (st.tool === 'rect') ctx2.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    else ctx2.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, 7);
    ctx2.stroke();
  };
  let dirty = false;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (!mine) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch {}
    const color = e.button === 2 ? st.bg : st.fg;
    const p0 = at(e);
    const [x, y] = p0.map(Math.floor);
    if (st.tool === 'picker') { const px = g.getImageData(x, y, 1, 1).data; st.fg = '#' + [px[0], px[1], px[2]].map(n => n.toString(16).padStart(2, '0')).join(''); st.tool = 'brush'; drawTools(); return; }
    snap();
    dirty = true;
    if (st.tool === 'fill') { flood(g, x, y, color, W, H); return; }
    let last = p0;
    const c = st.tool === 'eraser' ? st.bg : color;
    if (st.tool === 'pencil') lineTo(g, p0, p0, c, Math.max(1, st.size / 2));
    else if (st.tool === 'brush' || st.tool === 'eraser') dot(g, ...p0, c);
    let sprayIv = 0, cur = p0;
    const spray = () => { for (let i = 0; i < st.size * 2; i++) { const a = Math.random() * 7, r = Math.random() * st.size * 1.6; g.fillStyle = c; g.fillRect(cur[0] + Math.cos(a) * r, cur[1] + Math.sin(a) * r, 1.2, 1.2); } };
    if (st.tool === 'spray') { spray(); sprayIv = setInterval(spray, 30); }
    const move = ev => {
      const p = at(ev);
      cur = p;
      if (st.tool === 'pencil') lineTo(g, last, p, c, Math.max(1, st.size / 2));
      else if (st.tool === 'brush' || st.tool === 'eraser') lineTo(g, last, p, c);
      else if (['line', 'rect', 'ellipse'].includes(st.tool)) { og.clearRect(0, 0, W, H); shape(og, p0, p, color); }
      last = p;
    };
    const up = ev => {
      clearInterval(sprayIv);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
      if (['line', 'rect', 'ellipse'].includes(st.tool)) { og.clearRect(0, 0, W, H); shape(g, p0, at(ev), color); }
    };
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  });
  const keys = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); } };
  win.el.addEventListener('keydown', keys);
  win.cleanup = () => win.el.removeEventListener('keydown', keys);

  async function saveIt() {
    if (!mine) return;
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const imageId = await store.putImage(blob);
    if (editing && d.pics.includes(editing)) { dropImage(editing.imageId); editing.imageId = imageId; editing.at = Date.now(); }
    else {
      const p = { id: 'p_' + uid(), imageId, name: `drawing ${d.pics.filter(x => x.from === 'paint').length + 1}`, from: 'paint', at: Date.now() };
      d.pics.push(p);
      win.params = { id: p.id };
    }
    dirty = false;
    api.save();
    api.refresh('files'); api.refresh('viewer');
    api.notify(look === 'y2k' ? 'my pictures' : 'pictures', `${d.pics.find(p => p.id === win.params.id)?.name} saved`, () => api.open('files', { at: 'pics' }), '1f3a8');
    win.setTitle(APPS.paint.title(win.params, api));
  }
  const clearAll = () => { snap(); g.fillStyle = st.bg; g.fillRect(0, 0, W, H); };

  const toolbox = h('div', { class: 'cpp-tools' });
  const sizes = h('div', { class: 'cpp-sizes' });
  const colors = h('div', { class: 'cpp-colors' });
  function drawTools() {
    fill(toolbox, TOOLS.map(([id, label, path]) => h('button', { type: 'button', class: 'cpp-tool' + (st.tool === id ? ' on' : ''), 'data-tool': id, title: label, onclick: () => { st.tool = id; drawTools(); } },
      s('svg', { viewBox: '0 0 20 20', class: 'cp-i' }, s('path', { d: path })))));
    fill(sizes, SIZES_PX.map(n => h('button', { type: 'button', class: 'cpp-size' + (st.size === n ? ' on' : ''), title: n + 'px', onclick: () => { st.size = n; drawTools(); } }, h('i', { style: { width: Math.min(18, n) + 'px', height: Math.min(18, n) + 'px' } }))));
    const list = look === 'y2k' ? PALETTE : MODERN_COLORS;
    fill(colors,
      look === 'y2k' ? h('div', { class: 'cpp-fgbg' }, h('i', { class: 'cpp-bgc', style: { background: st.bg } }), h('i', { class: 'cpp-fgc', style: { background: st.fg } })) : null,
      h('div', { class: 'cpp-pal' }, list.map(c => h('button', {
        type: 'button', class: 'cpp-c' + (st.fg === c ? ' on' : ''), style: { background: c }, title: c,
        onclick: () => { st.fg = c; drawTools(); }, oncontextmenu: e => { e.preventDefault(); st.bg = c; drawTools(); },
      }))),
      h('label', { class: 'cpp-custom', title: 'any color' }, h('input', { type: 'color', value: st.fg, oninput: e => { st.fg = e.target.value; colors.querySelector('.cpp-fgc')?.style.setProperty('background', st.fg); } })));
  }
  drawTools();
  const board = h('div', { class: 'cpp-board' }, h('div', { class: 'cpp-paper' }, cv, over));
  if (look === 'y2k') {
    return h('div', { class: 'cpp' },
      menuBar([
        ['file', [['new', () => { clearAll(); }], ['save', saveIt, { off: !mine }], null, ['exit', () => win.close()]]],
        ['edit', [['undo', doUndo], ['clear image', clearAll]]],
      ]),
      h('div', { class: 'cpp-mid' }, h('div', { class: 'cpp-side' }, toolbox, sizes), board),
      h('div', { class: 'cpp-bottom' }, colors, mine ? h('button', { type: 'button', class: 'cp-btn cpp-save', onclick: saveIt }, 'save') : null));
  }
  return h('div', { class: 'cpp' },
    h('div', { class: 'cpp-top' }, toolbox, h('span', { class: 'cpw-sep' }), sizes, h('span', { class: 'cpw-sep' }),
      tbtn('undo', ICO.restore(), doUndo), tbtn('clear', ICO.trash(), clearAll),
      mine ? h('button', { type: 'button', class: 'cp-btn primary cpp-save', onclick: saveIt }, 'save') : null),
    board,
    h('div', { class: 'cpp-bottom' }, colors));
}
// paint bucket: fill the area of one color
function flood(g, x, y, hex, W, H) {
  const img = g.getImageData(0, 0, W, H), px = img.data;
  const n = parseInt(hex.slice(1), 16), fr = n >> 16, fg = (n >> 8) & 255, fb = n & 255;
  const i0 = (y * W + x) * 4, tr = px[i0], tg = px[i0 + 1], tb = px[i0 + 2];
  if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 8) return;
  const same = i => Math.abs(px[i] - tr) + Math.abs(px[i + 1] - tg) + Math.abs(px[i + 2] - tb) < 90;
  const stack = [[x, y]];
  const seen = new Uint8Array(W * H);
  while (stack.length) {
    const [cx, cy] = stack.pop();
    let lx = cx;
    while (lx > 0 && !seen[cy * W + lx - 1] && same((cy * W + lx - 1) * 4)) lx--;
    for (let xx = lx; xx < W && !seen[cy * W + xx] && same((cy * W + xx) * 4); xx++) {
      const i = (cy * W + xx) * 4;
      seen[cy * W + xx] = 1;
      px[i] = fr; px[i + 1] = fg; px[i + 2] = fb; px[i + 3] = 255;
      if (cy > 0 && !seen[(cy - 1) * W + xx] && same(((cy - 1) * W + xx) * 4)) stack.push([xx, cy - 1]);
      if (cy < H - 1 && !seen[(cy + 1) * W + xx] && same(((cy + 1) * W + xx) * 4)) stack.push([xx, cy + 1]);
    }
  }
  g.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- webcam
const FILTERS = [
  ['normal', 'normal', ''], ['sepia', 'sepia', 'sepia(.9) contrast(1.1)'], ['bw', 'b&w', 'grayscale(1) contrast(1.25)'],
  ['comic', 'comic', 'saturate(2.6) contrast(1.6)'], ['thermal', 'thermal', 'invert(1) hue-rotate(180deg) saturate(4)'], ['xray', 'x-ray', 'grayscale(1) invert(1) contrast(1.4)'],
  ['alien', 'alien', 'hue-rotate(110deg) saturate(2)'], ['glow', 'glow', 'brightness(1.25) saturate(1.4) blur(1px)'], ['pop', 'pop art', ''], ['mirror', 'mirror', ''],
];
const POP = ['saturate(3) hue-rotate(0deg)', 'saturate(3) hue-rotate(90deg)', 'saturate(3) hue-rotate(200deg)', 'saturate(3) hue-rotate(290deg)'];

function webcam(win, api) {
  const { d, mine, look } = api;
  d.cam ||= { imageId: null };
  let f = win.camFilter || 'normal';
  const srcId = () => d.cam.imageId || d.acct.imageId || api.char.imageId;
  const view = h('div', { class: 'cpc-view' });
  const filterOf = id => FILTERS.find(x => x[0] === id);
  const shot = (cls, filter) => { const im = srcId() ? pic(srcId(), cls) : h('div', { class: cls + ' cpc-none' }, api.acctPic('cpc-pfp')); im.style.filter = filter; return im; };
  function drawView() {
    const fl = filterOf(f);
    fill(view,
      f === 'pop' ? h('div', { class: 'cpc-grid' }, POP.map(x => shot('cpc-img', x)))
        : f === 'mirror' ? h('div', { class: 'cpc-grid mirror' }, [0, 1, 2, 3].map(() => shot('cpc-img', '')))
          : shot('cpc-img', fl[2]),
      h('i', { class: 'cpc-rec' }),
      h('i', { class: 'cpc-scan' }));
    picks.querySelectorAll('.cpc-pick').forEach(b => b.classList.toggle('on', b.dataset.f === f));
  }
  const picks = h('div', { class: 'cpc-picks' }, FILTERS.map(([id, label, filter]) => h('button', { type: 'button', class: 'cpc-pick', 'data-f': id, onclick: () => { f = win.camFilter = id; drawView(); } },
    h('span', { class: 'cpc-thumb' }, id === 'pop' ? h('span', { class: 'cpc-mini-grid' }, POP.map(x => shot('cpc-mini', x))) : shot('cpc-mini', filter)),
    h('span', {}, label))));
  async function snapIt() {
    if (!mine) return;
    const flash = h('i', { class: 'cpc-flash' });
    const count = h('b', { class: 'cpc-count' }, '3');
    view.append(count);
    for (const n of ['3', '2', '1']) { count.textContent = n; await new Promise(r => setTimeout(r, window.__fastCam ? 30 : 600)); }
    count.remove();
    view.append(flash);
    setTimeout(() => flash.remove(), 500);
    const url = srcId() ? await store.imageURL(srcId()) : null;
    const cv = h('canvas', { width: 480, height: 360 });
    const g = cv.getContext('2d');
    g.fillStyle = api.char.color || '#ff4fa3'; g.fillRect(0, 0, 480, 360);
    let im = null;
    if (url) { im = new Image(); im.src = url; try { await im.decode(); } catch { im = null; } }
    const draw = (x, y, w, hh, filter, flipX = false, flipY = false) => {
      if (!im) return;
      g.save(); g.filter = filter || 'none';
      const k = Math.max(w / im.width, hh / im.height), iw = im.width * k, ih = im.height * k;
      g.beginPath(); g.rect(x, y, w, hh); g.clip();
      g.translate(x + w / 2, y + hh / 2); g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      g.drawImage(im, -iw / 2, -ih / 2, iw, ih);
      g.restore();
    };
    if (!im) {
      // no picture yet: the oc's initials on their color, like their portrait
      const initials = (nameOf(api.char).match(/\b\w/g) || ['?']).slice(0, 2).join('').toUpperCase();
      const one = () => { const c = document.createElement('canvas'); c.width = 240; c.height = 180; const x = c.getContext('2d'); x.fillStyle = api.char.color || '#ff4fa3'; x.fillRect(0, 0, 240, 180); x.fillStyle = 'rgba(255,255,255,.9)'; x.font = "bold 72px 'Pixelify Sans', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(initials, 120, 96); return c; };
      im = one();
    }
    if (f === 'pop') POP.forEach((x, i) => draw((i % 2) * 240, Math.floor(i / 2) * 180, 240, 180, x));
    else if (f === 'mirror') [0, 1, 2, 3].forEach(i => draw((i % 2) * 240, Math.floor(i / 2) * 180, 240, 180, '', i % 2 === 1, i > 1));
    else draw(0, 0, 480, 360, filterOf(f)[2]);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const p = { id: 'p_' + uid(), imageId: await store.putImage(blob), name: `webcam ${d.pics.filter(x => x.from === 'webcam').length + 1}`, from: 'webcam', at: Date.now() };
    d.pics.push(p);
    api.save();
    api.refresh('files');
    api.notify(look === 'y2k' ? 'my pictures' : 'pictures', `${p.name} saved`, () => api.open('viewer', { id: p.id }), '1f4f7');
  }
  const upload = async () => {
    const up = await uploadPic(1000, { aspect: 4 / 3 });
    if (!up) return;
    if (d.cam.imageId && !d.pics.some(p => p.imageId === d.cam.imageId)) dropImage(d.cam.imageId);
    d.cam.imageId = up.imageId;
    api.save();
    win.redraw();
  };
  drawView();
  return h('div', { class: 'cpc' },
    view,
    h('div', { class: 'cpc-bar' },
      mine ? h('button', { type: 'button', class: 'cp-btn', onclick: upload }, 'change picture') : null,
      mine && d.cam.imageId ? h('button', { type: 'button', class: 'cp-btn', onclick: () => { d.cam.imageId = null; api.save(); win.redraw(); } }, 'use my pic') : null,
      mine ? h('button', { type: 'button', class: 'cpc-snap', title: 'take photo', onclick: snapIt }, h('i')) : null),
    picks);
}
