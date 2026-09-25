// collab worlds: a few people building one world together, live.
//
// there's no server and there are no accounts. it works like a stardew farm: the world lives on the
// host's device, and other people join it with a code while the host has the site open. browsers talk
// straight to each other (webrtc, through the free peerjs broker for the handshake).
//
//   host   world.collab = { role: 'host', code }
//   guest  world.collab = { role: 'guest', code, hostName, lastSync }   (their own saved copy of the world)
//
// what travels: the world itself, the ocs in its cast, the relationships between those ocs, and the
// pictures any of that uses. who may change what:
//   - the world (cast list, boards, maps, lore) + relationships: anyone who's connected
//   - an oc's own page: only whoever made it (char.owner). everyone else sees it read-only
//   - a guest who isn't connected can look at their copy but not change the world
// every change is sent as small path ops (see sync.js), always through the host, who passes it on.

import { store, imageIdsIn, MAX_VIDEO, MAX_SONG } from './store.js';
import { me } from './me.js';
import { diff, apply, sanitize, clone, replaceInPlace } from './sync.js';
import { fixWorld, fixChar, fixRel } from './model.js';

const PEER_SRC = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'ocworld-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L to mix up
const PEER_OPTS = {
  debug: 0,
  config: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      // free relay for connections that can't go direct (phones on mobile data, strict wifi)
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
  },
};
const FIX = { world: fixWorld, char: fixChar, rel: fixRel };
const KINDS = ['world', 'char', 'rel'];
const IMAGE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif'];
// moodboard videos travel the same way pictures do, just bigger
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-m4v'];
// + playlist songs
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-flac', 'audio/webm'];
const maxBytes = type => (VIDEO_TYPES.includes(type) ? MAX_VIDEO : AUDIO_TYPES.includes(type) ? MAX_SONG : 16e6);

const sessions = new Map(); // world id -> Session
const statusListeners = new Set();
const notify = () => statusListeners.forEach(fn => fn());

const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => ALPHABET[n % ALPHABET.length]).join('');
const find = (kind, id) => (kind === 'world' ? store.world(id) : kind === 'char' ? store.char(id) : store.rels.find(r => r.id === id));
const amongCast = (world, rel) => world.charIds.includes(rel.a) && (!rel.b || world.charIds.includes(rel.b));
const castRels = world => store.rels.filter(r => amongCast(world, r));

// the copy of a record that goes over the wire (a world's own sharing info stays home)
function bare(kind, rec) {
  const copy = clone(rec);
  if (kind === 'world') delete copy.collab;
  return copy;
}

// my ocs carry my name with them so other people's screens can say whose they are
function stamp(char) {
  if (!store.isMine(char) || (char.owner === me.id && char.ownerName === me.name)) return;
  Object.assign(char, { owner: me.id, ownerName: me.name });
  store.persist('char', char);
}

let peerLib = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  peerLib ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PEER_SRC;
    script.onload = resolve;
    script.onerror = () => { peerLib = null; script.remove(); reject(new Error('offline')); };
    document.head.append(script);
  });
  return peerLib;
}

// someone else's ocs only live here while a shared world needs them
let pruneTimer = null;
function pruneSoon() {
  clearTimeout(pruneTimer);
  pruneTimer = setTimeout(() => {
    for (const c of [...store.chars]) {
      if (!store.isMine(c) && !store.worldsOf(c.id).length) store.deleteChar(c.id, { force: true });
    }
  }, 1500);
}

let announceTimer = null;
let announceHard = false;
function announce(hard = false) {
  announceHard ||= hard;
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    store.announceRemote({ hard: announceHard });
    announceHard = false;
  }, 60);
}

class Session {
  constructor(world, joining = null) {
    this.world = world;
    this.role = world.collab.role;
    this.code = world.collab.code;
    this.status = 'connecting'; // 'connecting' | 'online' | 'offline' | 'taken' (= hosting from another tab)
    this.people = []; // [{ id, name, host }] everyone connected right now
    this.guests = new Map(); // host only: connection -> { id, name, seen }
    this.synced = new Map(); // "kind:id" -> the last version everyone has. changes are worked out against this
    this.timers = new Map(); // "kind:id" -> pending send
    this.asked = new Set(); // picture ids already asked for
    this.have = new Set(); // picture ids known to be saved here
    this.waiting = new Map(); // host only: picture id -> connections waiting for it
    this.joining = joining; // first time joining: { resolve, reject }
    this.closed = false;
    this.peer = null;
    this.conn = null; // guest only: the line to the host
    this.seen = 0;
    if (!joining) this.rememberAll();
    this.open();
    this.heartbeat = setInterval(() => this.beat(), 5000);
  }

  // ---- connecting ----

  setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    if (status !== 'online' && this.role === 'guest') this.people = [];
    notify();
    announce(); // the view-only state of a page can depend on this
  }

  async open() {
    try {
      await loadPeer();
    } catch {
      this.setStatus('offline');
      this.retry();
      return;
    }
    if (this.closed) return;
    const peer = this.peer = new window.Peer(this.role === 'host' ? PREFIX + this.code.toLowerCase() : undefined, PEER_OPTS);
    peer.on('open', () => {
      if (this.role === 'host') { this.setStatus('online'); this.updatePeople(); } else this.dial();
    });
    peer.on('connection', conn => { if (this.role === 'host') this.admit(conn); else conn.close(); });
    peer.on('disconnected', () => {
      if (this.closed || peer.destroyed) return;
      setTimeout(() => { if (!this.closed && !peer.destroyed && peer.disconnected) peer.reconnect(); }, 3000);
    });
    peer.on('error', err => {
      if (this.closed || peer !== this.peer) return;
      if (err.type === 'unavailable-id') { this.setStatus('taken'); this.retry(15000); }
      else if (err.type === 'peer-unavailable') { this.setStatus('offline'); this.retry(); }
      else if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'].includes(err.type)) { this.setStatus('offline'); this.retry(); }
    });
  }

  retry(ms = 6000) {
    if (this.closed) return;
    if (this.joining) { // first join doesn't keep trying forever
      this.joining.reject(new Error('nobody home'));
      this.close();
      return;
    }
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.closed) return;
      this.hangUp();
      if (this.role === 'guest') this.setStatus('connecting');
      this.open();
    }, ms);
  }

  hangUp() {
    try { this.peer?.destroy(); } catch {}
    this.peer = null;
    this.conn = null;
    this.guests.clear();
  }

  close() {
    this.closed = true;
    clearInterval(this.heartbeat);
    clearTimeout(this.retryTimer);
    this.timers.forEach(clearTimeout);
    this.hangUp();
    if (sessions.get(this.world.id) === this) sessions.delete(this.world.id);
    notify();
  }

  beat() {
    const now = Date.now();
    if (this.role === 'host') {
      for (const [conn, who] of this.guests) {
        if (now - who.seen > 20000) { try { conn.close(); } catch {} this.lost(conn); } else this.send(conn, { t: 'ping' });
      }
    } else if (this.conn && this.status === 'online') {
      if (now - this.seen > 20000) { try { this.conn.close(); } catch {} } else this.send(this.conn, { t: 'ping' });
    }
  }

  send(conn, msg) {
    try { if (conn?.open) conn.send(msg); } catch (err) { console.warn('collab send failed', err); }
  }

  // to everyone else. `except` = the connection a change came in on
  broadcast(msg, except = null) {
    if (this.role === 'guest') { if (this.conn !== except) this.send(this.conn, msg); } else for (const conn of this.guests.keys()) if (conn !== except) this.send(conn, msg);
  }

  // ---- host side ----

  admit(conn) {
    conn.on('data', msg => { try { this.fromGuest(conn, msg); } catch (err) { console.warn('collab: bad message', err); } });
    conn.on('close', () => this.lost(conn));
    conn.on('error', () => this.lost(conn));
  }

  lost(conn) {
    if (!this.guests.delete(conn)) return;
    for (const set of this.waiting.values()) set.delete(conn);
    this.updatePeople();
  }

  updatePeople() {
    this.people = [{ id: me.id, name: me.name, host: true }, ...[...this.guests.values()].map(g => ({ id: g.id, name: g.name }))];
    this.broadcast({ t: 'people', list: this.people });
    notify();
  }

  fromGuest(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') {
      this.asked.clear(); // anything that never arrived can be asked for again
      this.guests.set(conn, { id: String(msg.id).slice(0, 40), name: String(msg.name || 'someone').slice(0, 30), seen: Date.now() });
      const cast = store.cast(this.world);
      cast.forEach(stamp);
      this.send(conn, { t: 'welcome', hostName: me.name, world: bare('world', this.world), chars: cast.map(c => bare('char', c)), rels: castRels(this.world).map(clone) });
      this.updatePeople();
      return;
    }
    const who = this.guests.get(conn);
    if (!who) return;
    who.seen = Date.now();
    if (msg.t === 'mine') this.takeMine(conn, who, msg);
    else if (msg.t === 'need') this.servePictures(conn, msg.ids);
    else if (msg.t === 'img') this.keepPicture(msg);
    else if (['put', 'patch', 'del'].includes(msg.t) && this.allowed(who, msg)) {
      this.absorb(msg, conn);
      this.broadcast(msg, conn);
    }
  }

  // guests are family, but still: nobody edits someone else's oc, and nothing reaches outside this world
  allowed(who, msg) {
    if (!KINDS.includes(msg.kind) || typeof msg.id !== 'string') return false;
    const have = find(msg.kind, msg.id);
    if (msg.kind === 'world') return msg.t === 'patch' && msg.id === this.world.id;
    if (msg.kind === 'char') return have ? have.owner === who.id : msg.t === 'put' && msg.rec?.id === msg.id && msg.rec.owner === who.id;
    if (have) return amongCast(this.world, have);
    return msg.t === 'put' && msg.rec?.id === msg.id && amongCast(this.world, msg.rec);
  }

  // right after joining, a guest hands over the current version of their own ocs (they may have worked on
  // them while away) and the relationships that start from those ocs.
  takeMine(conn, who, msg) {
    const chars = (Array.isArray(msg.chars) ? msg.chars : []).filter(c => c?.owner === who.id && typeof c.id === 'string');
    for (const c of chars) {
      const put = { t: 'put', kind: 'char', id: c.id, rec: c };
      if (!this.allowed(who, put)) continue;
      this.absorb(put, conn);
      this.broadcast({ ...put, rec: bare('char', store.char(c.id)) }, conn);
    }
    // an oc of theirs that they deleted while away
    const kept = new Set(chars.map(c => c.id));
    for (const c of store.cast(this.world)) if (c.owner === who.id && !kept.has(c.id)) store.removeFromWorld(this.world, c.id);

    const theirs = new Set();
    for (const r of Array.isArray(msg.rels) ? msg.rels : []) {
      if (typeof r?.id !== 'string' || store.char(r.a)?.owner !== who.id || !amongCast(this.world, r)) continue;
      theirs.add(r.id);
      const have = find('rel', r.id);
      if (have && (have.updatedAt || 0) >= (r.updatedAt || 0)) continue;
      const put = { t: 'put', kind: 'rel', id: r.id, rec: r };
      this.absorb(put, conn);
      this.broadcast(put, conn);
    }
    for (const r of castRels(this.world)) {
      if (store.char(r.a)?.owner === who.id && !theirs.has(r.id)) store.remove('rel', r.id);
    }
  }

  // ---- guest side ----

  dial() {
    const conn = this.conn = this.peer.connect(PREFIX + this.code.toLowerCase(), { reliable: true });
    conn.on('open', () => { this.seen = Date.now(); this.send(conn, { t: 'hello', id: me.id, name: me.name }); });
    conn.on('data', msg => { try { this.fromHost(msg); } catch (err) { console.warn('collab: bad message', err); } });
    const gone = () => {
      if (this.conn !== conn) return;
      this.conn = null;
      this.setStatus('offline');
      this.retry();
    };
    conn.on('close', gone);
    conn.on('error', gone);
  }

  fromHost(msg) {
    if (!msg || typeof msg !== 'object') return;
    this.seen = Date.now();
    if (msg.t === 'welcome') this.takeSnapshot(msg);
    else if (msg.t === 'people') { this.people = Array.isArray(msg.list) ? msg.list.slice(0, 20) : []; notify(); }
    else if (msg.t === 'need') this.servePictures(this.conn, msg.ids);
    else if (msg.t === 'img') this.keepPicture(msg);
    else if (['put', 'patch', 'del'].includes(msg.t) && KINDS.includes(msg.kind) && this.status === 'online') this.absorb(msg, this.conn);
  }

  // the host's copy of everything wins, except my own ocs (mine wins) and relationships i changed more recently
  takeSnapshot(msg) {
    const world = this.world;
    const fresh = fixWorld(sanitize(msg.world));
    if (this.joining) {
      if (store.world(fresh.id)) { // this browser already has that world (it's the host's own browser, probably)
        this.joining.reject(new Error('already here'));
        this.close();
        return;
      }
      world.id = fresh.id;
    } else if (fresh.id !== world.id) return;

    const since = world.collab.lastSync || 0;
    const collab = { ...world.collab, hostName: String(msg.hostName || 'the host').slice(0, 30), lastSync: Date.now() };
    replaceInPlace(world, fresh).collab = collab;
    if (this.joining) { store.insert('world', world); sessions.set(world.id, this); } else store.persist('world', world);

    for (const raw of Array.isArray(msg.chars) ? msg.chars : []) {
      if (raw?.owner === me.id || typeof raw?.id !== 'string') continue;
      this.upsert('char', fixChar(sanitize(raw)));
    }
    const theirs = new Set();
    for (const raw of Array.isArray(msg.rels) ? msg.rels : []) {
      if (typeof raw?.id !== 'string') continue;
      theirs.add(raw.id);
      const have = find('rel', raw.id);
      if (!have || (raw.updatedAt || 0) >= (have.updatedAt || 0)) this.upsert('rel', fixRel(sanitize(raw)));
    }
    // a relationship the host doesn't have: either i made it while away (keep, it goes up below) or it was deleted over there
    for (const r of castRels(world)) {
      const madeAway = store.char(r.a) && store.isMine(store.char(r.a)) && (r.updatedAt || 0) > since;
      if (!theirs.has(r.id) && !madeAway) store.drop('rel', r.id);
    }

    const mine = store.cast(world).filter(c => store.isMine(c));
    mine.forEach(stamp);
    const mineIds = new Set(mine.map(c => c.id));
    this.send(this.conn, { t: 'mine', chars: mine.map(c => bare('char', c)), rels: castRels(world).filter(r => mineIds.has(r.a)).map(clone) });

    this.rememberAll();
    this.asked.clear();
    this.fetchPictures([world, store.cast(world)], this.conn);
    this.setStatus('online');
    pruneSoon();
    announce(true);
    if (this.joining) {
      this.joining.resolve(world);
      this.joining = null;
    }
  }

  // ---- changes coming in (either side) ----

  upsert(kind, rec) {
    const have = find(kind, rec.id);
    if (have) {
      const collab = have.collab;
      replaceInPlace(have, rec);
      if (collab) have.collab = collab;
      store.persist(kind, have);
    } else store.insert(kind, rec);
    return have || rec;
  }

  absorb(msg, from) {
    const { kind, id } = msg;
    const key = `${kind}:${id}`;
    if (msg.t === 'del') {
      this.synced.delete(key);
      const have = find(kind, id);
      if (kind === 'rel') store.drop('rel', id);
      else if (kind === 'char' && have && !store.isMine(have)) {
        imageIdsIn(have).forEach(imageId => store.deleteImage(imageId));
        store.drop('char', id);
      }
    } else if (msg.t === 'put') {
      if (!msg.rec || msg.rec.id !== id || kind === 'world') return;
      const live = this.upsert(kind, FIX[kind](sanitize(msg.rec)));
      this.synced.set(key, bare(kind, live));
      this.fetchPictures(live, from);
    } else {
      const live = find(kind, id);
      if (!live) return;
      const locked = kind === 'world' ? ['id', 'collab'] : ['id', 'owner'];
      FIX[kind](apply(live, msg.ops, locked));
      if (this.synced.has(key)) apply(this.synced.get(key), msg.ops, locked);
      else this.synced.set(key, bare(kind, live));
      store.persist(kind, live);
      this.fetchPictures(live, from);
      if (kind === 'world') this.forgetLeavers();
    }
    if (this.role === 'guest') this.world.collab.lastSync = Date.now();
    pruneSoon();
    announce();
  }

  // ---- changes going out (either side) ----

  rememberAll() {
    this.synced.clear();
    this.synced.set(`world:${this.world.id}`, bare('world', this.world));
    for (const c of store.cast(this.world)) this.synced.set(`char:${c.id}`, bare('char', c));
    for (const r of castRels(this.world)) this.synced.set(`rel:${r.id}`, clone(r));
  }

  concerns(kind, rec) {
    if (kind === 'world') return rec.id === this.world.id;
    if (kind === 'char') return this.world.charIds.includes(rec.id);
    return amongCast(this.world, rec);
  }

  // store.js calls this (through the listener at the bottom) for every change made on this device
  local(op, kind, rec) {
    const key = `${kind}:${rec.id}`;
    if (op === 'del') {
      if (!this.synced.has(key)) return;
      this.flushAll(); // anything still waiting goes first so things arrive in the order they happened
      this.synced.delete(key);
      this.broadcast({ t: 'del', kind, id: rec.id });
    } else if (this.concerns(kind, rec)) {
      clearTimeout(this.timers.get(key));
      this.timers.set(key, setTimeout(() => this.flush(kind, rec), 150));
    }
  }

  flushAll() {
    for (const key of [...this.timers.keys()]) {
      const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
      const rec = find(kind, id);
      clearTimeout(this.timers.get(key));
      if (rec) this.flush(kind, rec); else this.timers.delete(key);
    }
  }

  flush(kind, rec) {
    const key = `${kind}:${rec.id}`;
    this.timers.delete(key);
    if (kind === 'char') stamp(rec);
    const now = bare(kind, rec);
    const before = this.synced.get(key);
    if (!before) this.broadcast({ t: 'put', kind, id: rec.id, rec: now });
    else {
      const ops = diff(before, now);
      if (!ops.length) return;
      if (kind === 'world') this.shareNewcomers(); // an oc has to exist over there before the cast list mentions them
      this.broadcast({ t: 'patch', kind, id: rec.id, ops });
    }
    this.synced.set(key, now);
  }

  // ocs that just joined the cast, and relationships that are now between two cast members
  shareNewcomers() {
    this.forgetLeavers();
    for (const c of store.cast(this.world)) if (!this.synced.has(`char:${c.id}`)) this.flush('char', c);
    for (const r of castRels(this.world)) if (!this.synced.has(`rel:${r.id}`)) this.flush('rel', r);
  }

  // once an oc is out of the cast nobody else keeps them, so if they come back they have to be sent whole again
  forgetLeavers() {
    for (const key of [...this.synced.keys()]) {
      const id = key.slice(key.indexOf(':') + 1);
      if (key.startsWith('char:') && !this.world.charIds.includes(id)) this.synced.delete(key);
      if (key.startsWith('rel:')) {
        const rel = find('rel', id);
        if (rel && !amongCast(this.world, rel)) this.synced.delete(key);
      }
    }
  }

  // ---- pictures ----
  // records only carry picture ids. whoever is missing the actual picture asks the person the record came from.

  async fetchPictures(thing, from) {
    const unsure = imageIdsIn(thing).filter(id => !this.have.has(id) && !this.asked.has(id));
    unsure.forEach(id => this.asked.add(id)); // claimed right away so two changes in a row don't both ask
    const missing = [];
    for (const id of unsure) {
      if (await store.imageRecord(id)) { this.asked.delete(id); this.have.add(id); } else missing.push(id);
    }
    if (missing.length) this.send(from, { t: 'need', ids: missing });
  }

  async servePictures(conn, ids) {
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 200)) {
      if (typeof id !== 'string') continue;
      const rec = await store.imageRecord(id);
      if (rec) this.send(conn, { t: 'img', id: rec.id, type: rec.type, buf: rec.buf });
      else if (this.role === 'host') { // probably still on its way here from another guest
        if (!this.waiting.has(id)) this.waiting.set(id, new Set());
        this.waiting.get(id).add(conn);
      }
    }
  }

  async keepPicture(msg) {
    const buf = ArrayBuffer.isView(msg.buf) ? msg.buf.buffer.slice(msg.buf.byteOffset, msg.buf.byteOffset + msg.buf.byteLength) : msg.buf;
    if (typeof msg.id !== 'string' || ![...IMAGE_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES].includes(msg.type) || !(buf instanceof ArrayBuffer) || buf.byteLength > maxBytes(msg.type)) return;
    if (!this.asked.has(msg.id)) return; // only pictures we asked for
    const rec = { id: msg.id, type: msg.type, buf };
    await store.keepImageRecord(rec);
    for (const conn of this.waiting.get(msg.id) || []) this.send(conn, { t: 'img', ...rec });
    this.waiting.delete(msg.id);
    announce();
  }
}

// ---- wiring into the store ----

store.onLocal(({ op, kind, rec }) => {
  for (const session of sessions.values()) session.local(op, kind, rec);
  if (kind === 'world') pruneSoon();
});

store.guard = (kind, rec) => {
  if (kind === 'char' && !store.isMine(rec)) {
    const session = [...sessions.values()].find(s => s.synced.has(`char:${rec.id}`));
    return { why: `only ${rec.ownerName || 'whoever made them'} can change ${rec.name || 'this oc'}`, restore: session?.synced.get(`char:${rec.id}`) };
  }
  if (kind === 'world' && rec.collab?.role === 'guest' && sessions.get(rec.id)?.status !== 'online') {
    return { why: `${rec.collab.hostName || 'the host'} is offline, so this world is view-only right now`, restore: sessions.get(rec.id)?.synced.get(`world:${rec.id}`) };
  }
  return null;
};

// ---- what the rest of the app uses ----

export const collab = {
  // on startup: pick every shared world back up
  start() {
    for (const world of store.worlds) if (world.collab?.code && !sessions.has(world.id)) sessions.set(world.id, new Session(world));
  },

  session: worldId => sessions.get(worldId) || null,
  onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); },
  link: code => `${location.origin}${location.pathname}#/join/${code}`,
  // accepts a bare code or a whole pasted invite link
  cleanCode: text => String(text).trim().split('/').pop().replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12),

  share(world) {
    if (world.collab) return sessions.get(world.id);
    world.collab = { role: 'host', code: newCode() };
    store.persist('world', world);
    const session = new Session(world);
    sessions.set(world.id, session);
    notify();
    return session;
  },

  // everyone who's connected drops off and the old code stops working
  stop(world) {
    sessions.get(world.id)?.close();
    delete world.collab;
    store.persist('world', world);
    notify();
  },

  renew(world) {
    this.stop(world);
    return this.share(world);
  },

  // first time joining someone's world. resolves with the world once the first copy has arrived
  join(text) {
    const code = this.cleanCode(text);
    const have = store.worlds.find(w => w.collab?.code === code);
    if (have) return Promise.resolve(have);
    return new Promise((resolve, reject) => {
      const stub = fixWorld({ id: 'joining_' + code, name: '', collab: { role: 'guest', code } });
      const session = new Session(stub, { resolve, reject });
      setTimeout(() => {
        if (!session.joining) return;
        session.joining.reject(new Error('nobody home'));
        session.close();
      }, 25000);
    });
  },

  // a guest walking away: their copy of the world goes, and so do the other people's ocs that came with it
  async leave(world) {
    sessions.get(world.id)?.close();
    await Promise.all(imageIdsIn(world).map(imageId => store.deleteImage(imageId)));
    await store.drop('world', world.id);
    pruneSoon();
    notify();
  },
};
