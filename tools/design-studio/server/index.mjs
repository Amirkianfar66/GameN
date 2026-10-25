import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { readFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { parseBoard } from './model.mjs';

const ownerEmail = defineString('STUDIO_OWNER_EMAIL');
const pageOrigin = defineString('STUDIO_ORIGIN');
const app = getApps().find(a => a.name === 'design-studio-server') || initializeApp({}, 'design-studio-server');
const db = getFirestore(app);
const initial = parseBoard(JSON.parse(readFileSync(new URL('./private-data/initial.json', import.meta.url))));
const seed = parseBoard(JSON.parse(readFileSync(new URL('./private-data/seed.json', import.meta.url))));
const references = JSON.parse(readFileSync(new URL('./private-data/references.json', import.meta.url)));
const prefix = '/development/design-studio/api';
const boardIdPattern = /^[a-zA-Z0-9_:-][a-zA-Z0-9_.:-]{0,159}$/;
function pack(board) {
  const raw = JSON.stringify(board);
  if (Buffer.byteLength(raw) > 1_450_000) throw Object.assign(Error('Board exceeds the online size limit. Export a backup.'), { status: 413 });
  const blob = gzipSync(raw);
  if (blob.length > 800_000) throw Object.assign(Error('Board exceeds the online size limit. Export a backup.'), { status: 413 });
  return blob;
}
const unpack = data => parseBoard(JSON.parse(gunzipSync(data.blob, { maxOutputLength: 1_500_000 }).toString()));
const failure = (status, message) => Object.assign(Error(message), { status });

export const designStudioApi = onRequest({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 2, minInstances: 0, cors: false, invoker: 'public' }, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Vary', 'Authorization, Origin');
  const send = (status, data) => res.status(status).json(data);
  try {
    if (!ownerEmail.value() || !pageOrigin.value()) return send(503, { error: 'Studio access is not configured.' });
    if (req.headers.origin && req.headers.origin !== pageOrigin.value()) return send(403, { error: 'This origin is not permitted.' });
    if (!['GET', 'POST', 'PUT'].includes(req.method)) return send(405, { error: 'Unsupported method.' });
    const bearer = /^Bearer ([^\s]{1,8192})$/.exec(req.headers.authorization || '');
    if (!bearer) return send(401, { error: 'Sign in to your designer account.' });
    const attestation = req.headers['x-firebase-appcheck'];
    if (typeof attestation !== 'string' || attestation.length > 8192) return send(401, { error: 'Reload the studio to refresh device verification.' });
    try { await getAppCheck(app).verifyToken(attestation); }
    catch { return send(401, { error: 'Reload the studio to refresh device verification.' }); }
    let identity;
    try { identity = await getAuth(app).verifyIdToken(bearer[1], true); }
    catch { return send(401, { error: 'Your sign-in expired. Sign in again.' }); }
    if (!identity.email_verified || identity.email?.toLowerCase() !== ownerEmail.value().trim().toLowerCase() || identity.firebase?.sign_in_provider === 'anonymous') {
      return send(403, { error: 'This account does not have access to Design Studio.' });
    }
    const url = new URL(req.originalUrl, pageOrigin.value());
    const path = url.pathname;
    if (!path.startsWith(prefix + '/')) return send(404, { error: 'Not found.' });
    if (req.method === 'GET' && path === prefix + '/session') return send(200, { authorized: true });
    if (req.method === 'GET' && path === prefix + '/seed') return send(200, seed);
    if (req.method === 'GET' && path === prefix + '/references') return send(200, references);
    if (['POST', 'PUT'].includes(req.method)) {
      if (req.headers.origin !== pageOrigin.value()) return send(403, { error: 'Same origin required.' });
      if (!req.is('application/json')) return send(415, { error: 'JSON required.' });
      if (!req.rawBody || req.rawBody.length > 1_500_000) return send(413, { error: 'Board exceeds the online size limit. Export a backup.' });
    }
    const boards = db.collection('designStudioOwners').doc(identity.uid).collection('boards');
    const initialRef = boards.doc(initial.id);
    // Initialize once per verified designer. Never replace saved user revisions.
    await db.runTransaction(async tx => {
      if ((await tx.get(initialRef)).exists) return;
      const createdAt = new Date().toISOString();
      tx.create(initialRef, { title: initial.title, revision: 1, updatedAt: createdAt });
      tx.create(initialRef.collection('revisions').doc('1'), { blob: pack(initial), revision: 1, createdAt });
    });
    if (req.method === 'GET' && path === prefix + '/boards') {
      const found = await boards.orderBy('updatedAt', 'desc').limit(100).get();
      return send(200, { boards: found.docs.map(d => ({ id: d.id, title: d.data().title, revision: d.data().revision })), dataPath: 'GameN private cloud storage · revision history retained' });
    }
    const match = path.slice(prefix.length).match(/^\/boards\/([^/]+)(\/revisions)?$/);
    if (match && !boardIdPattern.test(match[1])) return send(400, { error: 'Invalid board identifier.' });
    const ref = match ? boards.doc(match[1]) : null;
    if (req.method === 'GET' && ref) {
      const head = await ref.get();
      if (!head.exists) return send(404, { error: 'Board not found.' });
      if (match[2]) {
        const revisions = await ref.collection('revisions').orderBy('revision', 'desc').limit(50).get();
        return send(200, { revisions: revisions.docs.map(d => ({ revision: d.data().revision, createdAt: d.data().createdAt })) });
      }
      const revision = url.searchParams.has('revision') ? Number(url.searchParams.get('revision')) : head.data().revision;
      if (!Number.isSafeInteger(revision) || revision < 1) return send(400, { error: 'Invalid revision.' });
      const saved = await ref.collection('revisions').doc(String(revision)).get();
      return saved.exists ? send(200, { board: unpack(saved.data()), revision }) : send(404, { error: 'Revision not found.' });
    }
    if ((req.method === 'POST' && path === prefix + '/boards') || (req.method === 'PUT' && ref && !match[2])) {
      const board = parseBoard(req.body?.board);
      if (req.method === 'POST') board.id = 'board-' + randomUUID();
      else if (board.id !== match[1]) return send(400, { error: 'Board identifier does not match.' });
      const blob = pack(board), createdAt = new Date().toISOString();
      const target = boards.doc(board.id);
      const revision = await db.runTransaction(async tx => {
        const current = await tx.get(target);
        if (req.method === 'PUT' && (!Number.isSafeInteger(req.body.revision) || !current.exists || current.data().revision !== req.body.revision)) {
          throw failure(409, 'A newer saved version exists. Keep your work with Save current as a new board or Export.');
        }
        if (req.method === 'POST' && current.exists) throw failure(409, 'This board already exists.');
        const next = req.method === 'POST' ? 1 : current.data().revision + 1;
        tx.set(target, { title: board.title, revision: next, updatedAt: createdAt });
        tx.create(target.collection('revisions').doc(String(next)), { blob, revision: next, createdAt });
        return next;
      });
      return send(req.method === 'POST' ? 201 : 200, { board, revision });
    }
    return send(404, { error: 'Not found.' });
  } catch (error) {
    if (error?.issues) return send(400, { error: 'Invalid board. Check the imported document and try again.' });
    if (error?.status) return send(error.status, { error: error.message });
    console.error('Studio storage request failed', error?.name || 'Error');
    return send(500, { error: 'Online save is unavailable. Your browser draft remains; export a backup and retry.' });
  }
});
