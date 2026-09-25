// where everything gets saved.
//
// right now that's IndexedDB in the browser (so: this device, this browser). everything is loaded
// into memory once at startup (store.worlds / store.chars / store.rels) and pages just read those.
// the app only ever talks to `store`, and `store` only talks to an adapter. when accounts happen,
// a cloud adapter with the same methods swaps in here and the rest of the app doesn't change.

import { uid, toast } from './ui.js';
import { me } from './me.js';
import { replaceInPlace } from './sync.js';
import { fixWorld, fixChar, fixRel, fixHome, blankHome, splitV1World } from './model.js';

const DB_NAME = 'oc-world';
const DB_VERSION = 3;
const FORMAT_VERSION = 2;
const STORES = { world: 'worlds', char: 'chars', rel: 'rels' };
export const MAX_VIDEO = 100e6; // biggest moodboard video (bytes)

// ---- local adapter (IndexedDB) ----

let dbPromise;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = req.result, tx = req.transaction;
        if (e.oldVersion < 1) {
          db.createObjectStore('worlds', { keyPath: 'id' });
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (e.oldVersion < 2) {
          const chars = db.createObjectStore('chars', { keyPath: 'id' });
          const rels = db.createObjectStore('rels', { keyPath: 'id' });
          const attic = db.createObjectStore('attic', { keyPath: 'id' });
          if (e.oldVersion === 1) {
            // moving from v1: ocs come out of their worlds. an untouched copy of the old data goes in
            // the attic first, just in case.
            const worlds = tx.objectStore('worlds');
            worlds.getAll().onsuccess = ev => {
              const old = ev.target.result;
              attic.put({ id: 'v1-worlds', savedAt: Date.now(), worlds: structuredClone(old) });
              for (const w of old) {
                const out = splitV1World(w);
                worlds.put(out.world);
                out.chars.forEach(c => chars.put(c));
                out.rels.forEach(r => rels.put(r));
              }
            };
          }
        }
        // v3: a spot for this device's own stuff (the home page layout)
        if (e.oldVersion < 3) db.createObjectStore('meta', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        // if a newer version of the site opens in another tab, let go so it can upgrade
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
  }
  return dbPromise;
}

function run(storeNames, mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    const out = fn(t);
    t.oncomplete = () => resolve(out);
    t.onerror = t.onabort = () => reject(t.error);
  }));
}

const localAdapter = {
  async loadAll() {
    const reqs = await run(Object.values(STORES), 'readonly', t =>
      Object.fromEntries(Object.entries(STORES).map(([kind, name]) => [kind, t.objectStore(name).getAll()])));
    return { worlds: reqs.world.result, chars: reqs.char.result, rels: reqs.rel.result };
  },
  getMeta: id => run('meta', 'readonly', t => t.objectStore('meta').get(id)).then(req => req.result),
  putMeta: rec => run('meta', 'readwrite', t => { t.objectStore('meta').put(rec); }),
  // entries: [{ kind, rec }]
  putMany: entries => run(Object.values(STORES), 'readwrite', t => {
    for (const { kind, rec } of entries) t.objectStore(STORES[kind]).put(rec);
  }),
  get: (kind, id) => run(STORES[kind], 'readonly', t => t.objectStore(STORES[kind]).get(id)).then(req => req.result),
  delete: (kind, id) => run(STORES[kind], 'readwrite', t => { t.objectStore(STORES[kind]).delete(id); }),
  // images are stored as { id, type, buf } (ArrayBuffer is the most portable thing to put in IndexedDB)
  putImage: rec => run('images', 'readwrite', t => { t.objectStore('images').put(rec); }),
  getImage: id => run('images', 'readonly', t => t.objectStore('images').get(id)).then(req => req.result),
  deleteImage: id => run('images', 'readwrite', t => { t.objectStore('images').delete(id); }),
};

const adapter = localAdapter;

// ---- helpers ----

// every picture reference anywhere lives under a key called `imageId`
function walkImageIds(node, fn) {
  if (Array.isArray(node)) node.forEach(n => walkImageIds(n, fn));
  else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (k === 'imageId') { if (typeof node[k] === 'string') node[k] = fn(node[k]) ?? node[k]; }
      else walkImageIds(node[k], fn);
    }
  }
}

export function imageIdsIn(thing) {
  const ids = new Set();
  walkImageIds(thing, id => { ids.add(id); });
  return [...ids];
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ---- the store ----

const mem = { world: [], char: [], rel: [], home: blankHome() };
let homeTimer = null;
const pending = new Map(); // "kind:id" -> { kind, rec }
const urlCache = new Map(); // imageId -> Promise<object url | null>
const listeners = new Set();
const localListeners = new Set(); // told about every change made on this device (collab sends these out)
const remoteListeners = new Set(); // told when data changed underneath the page (collab brought something in)
let status = 'saved';
let saveTimer = null;
let lastRefusal = 0;

function setStatus(next) {
  status = next;
  listeners.forEach(fn => fn(status));
}

// an edit that isn't allowed (someone else's oc, a shared world whose host is offline): put the record
// back how it was saved, tell the page to redraw, say why.
async function refuse(kind, rec, { why, restore }) {
  const good = restore ? structuredClone(restore) : await adapter.get(kind, rec.id);
  if (good) {
    const keep = rec.collab; // a world's own sharing info is never part of what gets synced
    replaceInPlace(rec, (kind === 'world' ? fixWorld : kind === 'char' ? fixChar : fixRel)(good));
    if (keep) rec.collab = keep;
    store.persist(kind, rec);
  }
  store.announceRemote({ hard: true });
  if (Date.now() - lastRefusal > 2500) toast(why, 'bad');
  lastRefusal = Date.now();
}

export const store = {
  async init() {
    const all = await adapter.loadAll();
    mem.world = all.worlds.map(fixWorld);
    mem.char = all.chars.map(fixChar).sort((a, b) => a.createdAt - b.createdAt);
    mem.rel = all.rels.map(fixRel).sort((a, b) => a.createdAt - b.createdAt);
    mem.home = fixHome(await adapter.getMeta('home'));
  },

  // ---- the home page layout (this device only, never shared in collab) ----
  get home() { return mem.home; },
  resetHome() {
    mem.home = blankHome();
    this.saveHome();
  },
  saveHome() {
    mem.home.touched = true;
    setStatus('saving');
    clearTimeout(homeTimer);
    homeTimer = setTimeout(() => this.flushHome(), 300);
  },
  async flushHome() {
    if (!homeTimer) return;
    clearTimeout(homeTimer);
    homeTimer = null;
    try {
      await adapter.putMeta(structuredClone(mem.home));
      if (!pending.size) setStatus('saved');
    } catch (err) {
      console.error('save failed', err);
      setStatus('error');
    }
  },

  get worlds() { return [...mem.world].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },
  get chars() { return mem.char; },
  get rels() { return mem.rel; },
  world: id => mem.world.find(w => w.id === id) || null,
  char: id => mem.char.find(c => c.id === id) || null,
  cast: world => world.charIds.map(id => store.char(id)).filter(Boolean),
  worldsOf: charId => mem.world.filter(w => w.charIds.includes(charId)),
  relsOf: charId => mem.rel.filter(r => r.a === charId || r.b === charId),

  // fn gets 'saving' | 'saved' | 'error'
  onStatus(fn) {
    listeners.add(fn);
    fn(status);
    return () => listeners.delete(fn);
  },

  onLocal(fn) { localListeners.add(fn); },
  onRemote(fn) { remoteListeners.add(fn); },
  // hard = whole records were swapped out, so pages should rebuild instead of just redrawing
  announceRemote(info = {}) { remoteListeners.forEach(fn => fn(info)); },

  // collab.js sets this: (kind, rec) => nothing if the edit is fine, or { why, restore } if it isn't
  // (restore = a good copy of the record to put back)
  guard: null,
  isMine: char => !char.owner || char.owner === me.id,

  // kind is 'world' | 'char' | 'rel'
  add(kind, rec) {
    if (kind === 'char') rec.owner ??= me.id;
    mem[kind].push(rec);
    this.save(kind, rec);
    return rec;
  },

  // call this after any change. writes are bundled up so typing doesn't hammer the disk.
  save(kind, rec) {
    const no = this.guard?.(kind, rec);
    if (no) {
      refuse(kind, rec, no);
      return;
    }
    rec.updatedAt = Date.now();
    this.persist(kind, rec);
    localListeners.forEach(fn => fn({ op: 'put', kind, rec }));
  },

  // the quiet versions: same as save / add / remove but without announcing it as a change made here.
  // collab.js uses them for changes that arrived from someone else.
  persist(kind, rec) {
    pending.set(`${kind}:${rec.id}`, { kind, rec });
    setStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => this.flush(), 400);
  },

  insert(kind, rec) {
    mem[kind].push(rec);
    this.persist(kind, rec);
    return rec;
  },

  async drop(kind, id) {
    mem[kind] = mem[kind].filter(rec => rec.id !== id);
    pending.delete(`${kind}:${id}`);
    await adapter.delete(kind, id);
  },

  async flush() {
    await this.flushHome();
    clearTimeout(saveTimer);
    if (!pending.size) return;
    const entries = [...pending.values()];
    pending.clear();
    try {
      await adapter.putMany(entries);
      if (!pending.size) setStatus('saved');
    } catch (err) {
      console.error('save failed', err);
      setStatus('error');
    }
  },

  async remove(kind, id) {
    const rec = mem[kind].find(r => r.id === id);
    await this.drop(kind, id);
    if (rec) localListeners.forEach(fn => fn({ op: 'del', kind, rec }));
  },

  // ---- bigger moves ----

  // takes an oc out of one world: off its cast list, its boards and its pins. the oc itself is fine.
  removeFromWorld(world, charId) {
    world.charIds = world.charIds.filter(id => id !== charId);
    for (const board of world.boards) {
      const gone = new Set(board.nodes.filter(n => n.charId === charId).map(n => n.id));
      if (!gone.size) continue;
      board.nodes = board.nodes.filter(n => !gone.has(n.id));
      board.edges = board.edges.filter(e => !gone.has(e.a) && !gone.has(e.b));
    }
    for (const map of world.maps) {
      for (const pin of map.pins) pin.charIds = (pin.charIds || []).filter(id => id !== charId);
    }
    this.save('world', world);
  },

  // force = also allowed for someone else's oc (collab uses it to clear out copies nobody needs any more)
  async deleteChar(id, { force = false } = {}) {
    const char = this.char(id);
    if (!char || (!force && !this.isMine(char))) return;
    // the people who knew them keep the relationship, it just turns into a typed name
    for (const r of [...mem.rel]) {
      if (r.a !== id && r.b !== id) continue;
      if (r.a === id && !r.b) {
        await this.remove('rel', r.id);
        continue;
      }
      if (r.a === id) Object.assign(r, { a: r.b, label: r.back ?? r.label });
      Object.assign(r, { b: null, bName: char.name || 'someone', back: null, arrow: 'none' });
      this.save('rel', r);
    }
    for (const world of this.worldsOf(id)) this.removeFromWorld(world, id);
    await Promise.all(imageIdsIn(char).map(imageId => this.deleteImage(imageId)));
    await this.remove('char', id);
  },

  // the ocs in it are NOT deleted, they just aren't in this world any more
  async deleteWorld(id) {
    const world = this.world(id);
    if (!world) return;
    await Promise.all(imageIdsIn(world).map(imageId => this.deleteImage(imageId)));
    await this.remove('world', id);
  },

  // ---- pictures ----

  async putImage(blob) {
    const id = 'img_' + uid();
    await adapter.putImage({ id, type: blob.type, buf: await blob.arrayBuffer() });
    return id;
  },

  imageURL(id) {
    if (!id) return Promise.resolve(null);
    if (!urlCache.has(id)) {
      urlCache.set(id, adapter.getImage(id).then(rec => {
        if (rec) return URL.createObjectURL(new Blob([rec.buf], { type: rec.type }));
        urlCache.delete(id); // not here (yet). in a collab world it might still be on its way, so ask again next time
        return null;
      }));
    }
    return urlCache.get(id);
  },

  // moving pictures between people: the raw { id, type, buf } record
  imageRecord: id => adapter.getImage(id),
  async keepImageRecord(rec) {
    await adapter.putImage({ id: rec.id, type: rec.type, buf: rec.buf });
    urlCache.delete(rec.id);
  },

  async deleteImage(id) {
    if (!id) return;
    const url = await urlCache.get(id);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(id);
    await adapter.deleteImage(id);
  },

  // ---- backups: one json file, pictures included ----

  async exportData(worlds, chars, rels, scope, home) {
    await this.flush();
    const data = { app: 'oc-world', version: FORMAT_VERSION, scope, exportedAt: new Date().toISOString(), worlds, chars, rels, home, images: {} };
    for (const imageId of imageIdsIn([worlds, chars, home])) {
      const rec = await adapter.getImage(imageId);
      if (rec) data.images[imageId] = await blobToDataURL(new Blob([rec.buf], { type: rec.type }));
    }
    return data;
  },

  exportEverything() {
    return this.exportData(mem.world, mem.char, mem.rel, 'everything', mem.home.touched ? mem.home : undefined);
  },

  // a world, everyone in it, and the relationships between them
  exportWorld(id) {
    const world = this.world(id);
    const cast = new Set(world.charIds);
    const rels = mem.rel.filter(r => cast.has(r.a) && (!r.b || cast.has(r.b)));
    return this.exportData([world], this.cast(world), rels, 'world');
  },

  // everything in the file lands as brand new copies, so loading a backup can never overwrite anything
  async importBackup(file) {
    if (!file || file.app !== 'oc-world') throw new Error('not an oc world backup');
    let { worlds = [], chars = [], rels = [], home = null } = structuredClone(file);
    if (file.world) { // a v1 backup: one world with its ocs inside it
      const out = splitV1World(structuredClone(file.world));
      worlds = [out.world];
      chars = out.chars;
      rels = out.rels;
    }

    const ids = new Map();
    const fresh = (old, prefix) => {
      ids.set(old, prefix + uid());
      return ids.get(old);
    };
    for (const [oldId, dataURL] of Object.entries(file.images || {})) {
      ids.set(oldId, await this.putImage(await (await fetch(dataURL)).blob()));
    }
    walkImageIds([worlds, chars, home], imageId => ids.get(imageId));

    // whatever comes out of a backup is yours, and isn't being shared with anyone
    for (const c of chars) Object.assign(c, { id: fresh(c.id, 'c_'), owner: me.id, ownerName: undefined });
    for (const w of worlds) delete w.collab;
    rels = rels.filter(r => ids.has(r.a) && (!r.b || ids.has(r.b)));
    for (const r of rels) Object.assign(r, { id: fresh(r.id, 'r_'), a: ids.get(r.a), b: r.b ? ids.get(r.b) : null });
    for (const w of worlds) {
      fixWorld(w);
      w.id = fresh(w.id, 'w_');
      w.charIds = w.charIds.map(id => ids.get(id)).filter(Boolean);
      for (const board of w.boards) {
        board.nodes = board.nodes.filter(n => n.kind !== 'oc' || ids.has(n.charId));
        for (const n of board.nodes) if (n.kind === 'oc') n.charId = ids.get(n.charId);
        board.hiddenRels = board.hiddenRels.map(id => ids.get(id)).filter(Boolean);
      }
      for (const map of w.maps) {
        for (const pin of map.pins) pin.charIds = (pin.charIds || []).map(id => ids.get(id)).filter(Boolean);
      }
    }

    // a home layout only comes in if you never made your own
    const tookHome = !!home && !mem.home.touched;
    if (tookHome) {
      mem.home = fixHome({ ...home, id: 'home' });
      this.saveHome();
    } else if (home) {
      imageIdsIn(home).forEach(id => this.deleteImage(id));
    }

    const now = Date.now();
    worlds.forEach(w => mem.world.push(Object.assign(w, { updatedAt: now })));
    chars.forEach(c => mem.char.push(fixChar(c)));
    rels.forEach(r => mem.rel.push(fixRel(r)));
    await adapter.putMany([
      ...worlds.map(rec => ({ kind: 'world', rec })),
      ...chars.map(rec => ({ kind: 'char', rec })),
      ...rels.map(rec => ({ kind: 'rel', rec })),
    ]);
    return { worlds: worlds.length, chars: chars.length, home: tookHome };
  },
};

// one last save if the tab is being closed or hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});
window.addEventListener('pagehide', () => store.flush());

// ask the browser not to clear our data when the disk gets full
navigator.storage?.persist?.().catch(() => {});
