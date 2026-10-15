// one-time share links for an oc's page. the oc (+ its pictures and songs) goes up in pieces, the
// first person to open the link gets it, then it's gone. lives in netlify blobs.
//
//   POST   /api/share/new                    { name, parts }      -> { token, key }      (key = the creator's)
//   PUT    /api/share/<token>/part/<i>       x-key, raw bytes
//   POST   /api/share/<token>/done           x-key                -> ready to open
//   POST   /api/share/<token>/open                                -> { viewKey, parts, name } once, then 410
//   GET    /api/share/<token>/part/<i>?v=<viewKey>                -> the bytes (for a little while after opening)
//   POST   /api/share/<token>/gone           x-view-key           -> pieces deleted (the viewer has everything)
//   GET    /api/share/<token>/status         x-key                -> { state, openedAt }
//   DELETE /api/share/<token>                x-key                -> cancelled

import { getStore } from '@netlify/blobs';

const ORIGINS = ['https://liddakid.github.io', 'https://oc-world-xo.netlify.app', 'http://127.0.0.1:4173', 'http://localhost:4173'];
const MAX_PART = 4.5e6;
const MAX_PARTS = 60; // ~270mb
const WINDOW = 15 * 60e3; // how long the opener has to finish downloading
const EXPIRES = 7 * 24 * 3600e3; // unopened links

const store = () => getStore({ name: 'oc-shares', consistency: 'strong' });

function cors(req) {
  const origin = req.headers.get('origin') || '';
  const ok = ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+--oc-world-xo\.netlify\.app$/.test(origin);
  return {
    'access-control-allow-origin': ok ? origin : ORIGINS[0],
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, x-key, x-view-key',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

const randomKey = (n = 24) => Buffer.from(crypto.getRandomValues(new Uint8Array(n))).toString('base64url');
const hash = async s => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).toString('base64url');

async function wipeParts(s, token) {
  const { blobs } = await s.list({ prefix: `p/${token}/` });
  await Promise.all(blobs.map(b => s.delete(b.key)));
}

export default async (req) => {
  const head = cors(req);
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...head, 'content-type': 'application/json', 'cache-control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: head });

  const url = new URL(req.url);
  const bits = url.pathname.replace(/^.*\/api\/share\/?/, '').split('/').filter(Boolean);
  const s = store();

  try {
    if (bits[0] === 'new' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const parts = Math.floor(Number(body.parts));
      if (!(parts >= 1 && parts <= MAX_PARTS)) return json({ error: 'too big' }, 413);
      const token = randomKey(24);
      const key = randomKey(24);
      await s.setJSON(`i/${token}`, { state: 'uploading', parts, name: String(body.name || '').slice(0, 80), created: Date.now(), keyHash: await hash(key) });
      return json({ token, key });
    }

    const token = bits[0];
    if (!token || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return json({ error: 'not found' }, 404);
    const info = await s.get(`i/${token}`, { type: 'json' });
    if (!info) return json({ state: 'gone' }, 404);
    const isCreator = async () => !!req.headers.get('x-key') && (await hash(req.headers.get('x-key'))) === info.keyHash;
    const expired = info.state !== 'opened' && Date.now() - info.created > EXPIRES;
    if (expired && info.state !== 'expired') {
      await wipeParts(s, token);
      info.state = 'expired';
      await s.setJSON(`i/${token}`, info);
    }
    const action = bits[1] || '';

    if (action === 'part' && req.method === 'PUT') {
      if (!(await isCreator()) || info.state !== 'uploading') return json({ error: 'no' }, 403);
      const i = Number(bits[2]);
      if (!(Number.isInteger(i) && i >= 0 && i < info.parts)) return json({ error: 'bad part' }, 400);
      const buf = await req.arrayBuffer();
      if (buf.byteLength > MAX_PART) return json({ error: 'too big' }, 413);
      await s.set(`p/${token}/${i}`, buf);
      return json({ ok: true });
    }

    if (action === 'done' && req.method === 'POST') {
      if (!(await isCreator()) || info.state !== 'uploading') return json({ error: 'no' }, 403);
      const { blobs } = await s.list({ prefix: `p/${token}/` });
      if (blobs.length !== info.parts) return json({ error: 'missing parts', have: blobs.length }, 409);
      info.state = 'ready';
      await s.setJSON(`i/${token}`, info);
      return json({ ok: true });
    }

    if (action === 'open' && req.method === 'POST') {
      if (info.state !== 'ready') return json({ state: info.state === 'uploading' ? 'gone' : info.state }, 410);
      const viewKey = randomKey(24);
      Object.assign(info, { state: 'opened', openedAt: Date.now(), viewHash: await hash(viewKey) });
      await s.setJSON(`i/${token}`, info);
      return json({ viewKey, parts: info.parts, name: info.name });
    }

    if (action === 'part' && req.method === 'GET') {
      const v = url.searchParams.get('v') || '';
      if (info.state !== 'opened' || !v || (await hash(v)) !== info.viewHash) return json({ error: 'no' }, 403);
      if (Date.now() - info.openedAt > WINDOW) { await wipeParts(s, token); return json({ state: 'opened' }, 410); }
      const buf = await s.get(`p/${token}/${Number(bits[2])}`, { type: 'arrayBuffer' });
      if (!buf) return json({ error: 'not found' }, 404);
      return new Response(buf, { headers: { ...head, 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
    }

    if (action === 'gone' && req.method === 'POST') {
      const v = req.headers.get('x-view-key') || '';
      if (info.state !== 'opened' || (await hash(v)) !== info.viewHash) return json({ error: 'no' }, 403);
      await wipeParts(s, token);
      return json({ ok: true });
    }

    if (action === 'status' && req.method === 'GET') {
      if (!(await isCreator())) return json({ error: 'no' }, 403);
      return json({ state: info.state, openedAt: info.openedAt || null, created: info.created });
    }

    if (!action && req.method === 'DELETE') {
      if (!(await isCreator())) return json({ error: 'no' }, 403);
      await wipeParts(s, token);
      await s.delete(`i/${token}`);
      return json({ ok: true });
    }

    return json({ error: 'not found' }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: 'server' }, 500);
  }
};

export const config = { path: ['/api/share', '/api/share/*'] };
