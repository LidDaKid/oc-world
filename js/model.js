// what the saved things look like, and how to make new ones.
//
//   world = { id, name, blurb, emoji, icon, color, charIds, boards, maps, lore }
//   char  = { id, name, tagline, color, imageId, tags, basics, sections, gallery, moodboard, playlist, page }
//   home  = the home page's layout (blankHome below)
//
// moodboard items are videos: { id, imageId, caption }. playlist items are songs: { id, imageId, title }. the video file is kept with the pictures, so it's
// still under a key called imageId (store.js finds every file by that name for backups + deleting).
//   rel   = { id, a, b, bName, label, back, color, line, arrow, note }
//
// ocs are their own thing (they don't live inside a world). a world just keeps a list of who's in it,
// so an oc can be in no worlds, one, or a few.
//
// a rel is "a" and "b" knowing each other. `a` is always an oc. `b` is an oc id, or null when the other
// person is just a typed name (then it's in `bName`).
//   label = what b is to a      ("little sister")
//   back  = what a is to b      ("big sister"), or null when it's the same word from both sides

import { uid } from './ui.js';

const BASICS = ['nickname', 'age', 'birthday', 'pronouns', 'gender', 'species', 'height', 'role'];
const SECTIONS = ['personality', 'backstory', 'appearance', 'likes + dislikes'];

// colors, fonts, corners + background picture. both the home page and an oc's page have these (see look.js).
// null = "just use the site theme"
export const blankLook = () => ({ bg: null, text: null, border: null, accent: null, wallpaper: { imageId: null, tile: false }, fontHead: null, fontBody: null, corners: 'round' });

// how an oc's own page looks: a look, plus the top part (banner, pfp) and which tabs show in what order
export const blankPage = () => ({
  ...blankLook(),
  banner: null, bannerFade: false, bannerPic: { imageId: null }, bannerSize: 'normal',
  heroAlign: 'left', pfpShape: 'rounded', pfpSize: 'normal', width: 'normal',
  tabs: null, hiddenTabs: [], moodLayout: 'grid', videoBg: null,
  musicAutoplay: true, musicShuffle: false,
});

// the home page's layout. it lives on this device only (it's not part of any oc or world).
export const HOME_SECTIONS = ['header', 'worlds', 'ocs'];
export const blankHome = () => ({
  id: 'home',
  look: blankLook(),
  siteName: '', siteEmoji: '', logoPic: { imageId: null },
  title: '', subtitle: '', headerPic: { imageId: null }, headerColor: null, headerSize: 'normal', headerAlign: 'center',
  order: [...HOME_SECTIONS], hidden: [],
  ocSize: 'normal', ocLayout: 'grid', pfpShape: 'rounded', showTagline: true, showTags: true,
  worldSize: 'normal', width: 'normal',
});

export function fixHome(home) {
  const out = { ...blankHome(), ...home };
  out.look = { ...blankLook(), ...out.look };
  out.look.wallpaper = { imageId: null, tile: false, ...out.look.wallpaper };
  out.headerPic = { imageId: null, ...out.headerPic };
  out.logoPic = { imageId: null, ...out.logoPic };
  out.order = [...new Set([...(out.order || []).filter(id => HOME_SECTIONS.includes(id)), ...HOME_SECTIONS])];
  out.hidden = (out.hidden || []).filter(id => HOME_SECTIONS.includes(id));
  return out;
}

// the fix* functions fill in anything an older save is missing, so old stuff always opens

export function fixChar(c) {
  c.name ||= '';
  c.tagline ||= '';
  c.color ||= '#ff4fa3';
  c.imageId ??= null;
  c.tags ||= [];
  c.basics ||= [];
  c.sections ||= [];
  c.gallery ||= [];
  c.moodboard ||= [];
  c.playlist ||= [];
  c.page = { ...blankPage(), ...c.page };
  c.page.wallpaper = { imageId: null, tile: false, ...c.page.wallpaper };
  c.page.bannerPic = { imageId: null, ...c.page.bannerPic };
  if (!Array.isArray(c.page.hiddenTabs)) c.page.hiddenTabs = [];
  c.createdAt ||= Date.now();
  return c;
}

export function newChar(fields = {}) {
  return fixChar({
    id: 'c_' + uid(),
    basics: BASICS.map(label => ({ label, value: '' })),
    sections: SECTIONS.map(title => ({ title, text: '' })),
    ...fields,
  });
}

export function fixWorld(w) {
  w.name ||= 'untitled world';
  w.emoji ||= '🪐';
  w.icon = { imageId: null, ...w.icon }; // an uploaded icon, used instead of the emoji
  w.color ||= '#ff4fa3';
  w.blurb ||= '';
  w.charIds ||= [];
  w.boards ||= [];
  w.maps ||= [];
  w.lore ||= [];
  for (const b of w.boards) { b.nodes ||= []; b.edges ||= []; b.hiddenRels ||= []; }
  for (const m of w.maps) { m.pins ||= []; m.strokes ||= []; }
  w.createdAt ||= Date.now();
  return w;
}

export function newWorld(fields = {}) {
  return fixWorld({ id: 'w_' + uid(), ...fields });
}

export function fixRel(r) {
  r.b ??= null;
  r.bName ||= '';
  r.label ||= '';
  r.back ??= null;
  r.color ||= '#ff4fa3';
  r.line ||= 'solid';
  r.arrow ||= 'none';
  r.note ||= '';
  r.createdAt ||= Date.now();
  return r;
}

export function newRel(fields = {}) {
  return fixRel({ id: 'r_' + uid(), ...fields });
}

export const newBoard = name => ({ id: 'b_' + uid(), name, nodes: [], edges: [], hiddenRels: [] });

// the first version kept ocs inside each world, and relationships only as lines on a board.
// this pulls a v1 world apart into the new shape. nothing gets thrown away:
// every oc comes out, and every oc-to-oc line becomes a real relationship.
export function splitV1World(old) {
  const world = old;
  const chars = (world.characters || []).map(fixChar);
  const rels = [];
  for (const board of world.boards || []) {
    const nodes = new Map((board.nodes || []).map(n => [n.id, n]));
    const stay = [];
    for (const e of board.edges || []) {
      const A = nodes.get(e.a), B = nodes.get(e.b);
      if (A?.kind !== 'oc' || B?.kind !== 'oc') {
        stay.push(e);
        continue;
      }
      const flipped = e.arrow === 'from'; // v1 "from" meant b -> a
      const oneWay = e.arrow === 'to' || e.arrow === 'from';
      const twin = rels.find(r => r.label === (e.label || '') &&
        ((r.a === A.charId && r.b === B.charId) || (r.a === B.charId && r.b === A.charId)));
      if (twin) continue; // same line drawn on two boards
      rels.push(newRel({
        a: flipped ? B.charId : A.charId,
        b: flipped ? A.charId : B.charId,
        label: e.label || '',
        back: oneWay ? '' : null,
        color: e.color,
        line: e.line,
        arrow: oneWay ? 'to' : e.arrow,
      }));
    }
    board.edges = stay;
  }
  world.charIds = chars.map(c => c.id);
  delete world.characters;
  return { world: fixWorld(world), chars, rels };
}
