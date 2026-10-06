import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { assertLocalEmulators, projectId, createEmulatorIdentity, firestoreRequest, firestoreEventQuery } from '../test/helpers.mjs';

async function createNamedIdentity(app, uid) {
  const { authHost } = assertLocalEmulators();
  const email = `named-${randomUUID()}@example.test`, password = 'emulator-only-test-123';
  await getAuth(app).createUser({ uid, email, password });
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return { uid, idToken: (await response.json()).idToken };
}
async function admissionQuery(matchId, identity, onlyOwn = false) {
  const { firestoreHost } = assertLocalEmulators();
  return fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/matches/${matchId}:runQuery`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${identity.idToken}` },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'admissions' }], ...(onlyOwn ? { where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: identity.uid } } } } : {}) } }),
  });
}

test('V1 Rules require active reverse binding; host/display stay public; p-seat event keys avoid UID collision', async () => {
  assertLocalEmulators();
  const app = initializeApp({ projectId }, `full-security-${randomUUID()}`), db = getFirestore(app);
  const [host, target, display, outsider, replacement] = await Promise.all(Array.from({ length: 5 }, () => createEmulatorIdentity()));
  const player = await createNamedIdentity(app, 'public');
  const matchId = `full-security-${randomUUID()}`, root = `matches/${matchId}`;
  const view = seatId => ({ matchId, versions: { protocolVersion: 2 }, audience: { kind: 'player', seatId }, self: { seatId, role: 'synthetic-private-role' }, viewRevision: 1 });
  const event = (audience, fact) => ({ protocolVersion: 2, matchId, audience, viewRevision: 1, fact });
  const batch = db.batch();
  for (const [path, value] of [
    [`${root}/control/session`, { protocolVersion: 2, hostUid: host.uid, playerCount: 7, status: 'running', roomCode: 'synthetic-room-code' }],
    [`${root}/lobby/public`, { protocolVersion: 2, matchId, playerCount: 7, status: 'running', seats: [] }],
    [`${root}/members/${host.uid}`, { kind: 'display' }], [`${root}/members/${display.uid}`, { kind: 'display' }],
    [`${root}/members/${player.uid}`, { kind: 'player', seatId: 'seat-1', bindingRevision: 1 }],
    [`${root}/members/${target.uid}`, { kind: 'player', seatId: 'seat-2', bindingRevision: 1 }],
    [`${root}/seats/seat-1`, { uid: player.uid, bindingRevision: 1 }], [`${root}/seats/seat-2`, { uid: target.uid, bindingRevision: 1 }],
    [`${root}/views/public`, { matchId, versions: { protocolVersion: 2 }, audience: { kind: 'public' }, viewRevision: 1 }],
    [`${root}/playerViews/${player.uid}`, view('seat-1')], [`${root}/playerViews/${target.uid}`, view('seat-2')],
    [`${root}/engine/current`, { serverOnly: 'synthetic-role-map' }],
    [`${root}/admissions/request-a`, { uid: outsider.uid, initialRoom: 'Room A', status: 'pending' }],
    [`${root}/admissions/request-b`, { uid: target.uid, initialRoom: 'Room B', status: 'approved', seatId: 'seat-2' }],
    [`${root}/audienceEvents/public/items/1-0`, event({ kind: 'public' }, { type: 'PHASE_CHANGED', phaseId: 'phase-a' })],
    [`${root}/audienceEvents/p-seat-1/items/1-0`, event({ kind: 'player', seatId: 'seat-1' }, { type: 'PRIVATE_RESULT', commandId: 'command-a' })],
  ]) batch.set(db.doc(path), value);
  await batch.commit();
  try {
    for (const identity of [host, display, player, target]) {
      assert.equal((await firestoreRequest(`${root}/views/public`, { idToken: identity.idToken })).status, 200);
      assert.equal((await firestoreRequest(`${root}/lobby/public`, { idToken: identity.idToken })).status, 200);
    }
    assert.equal((await firestoreRequest(`${root}/control/session`, { idToken: host.idToken })).status, 200);
    assert.equal((await firestoreRequest(`${root}/control/session`, { idToken: display.idToken })).status, 403);
    assert.equal((await admissionQuery(matchId, host)).status, 200);
    assert.equal((await admissionQuery(matchId, outsider, true)).status, 200);
    assert.equal((await admissionQuery(matchId, outsider)).status, 403);
    assert.equal((await firestoreRequest(`${root}/admissions/request-a`, { idToken: outsider.idToken })).status, 200);
    assert.equal((await firestoreRequest(`${root}/admissions/request-b`, { idToken: outsider.idToken })).status, 403);
    assert.equal((await firestoreRequest(`${root}/playerViews/${player.uid}`, { idToken: player.idToken })).status, 200);
    assert.equal((await firestoreEventQuery(matchId, 'p-seat-1', player, 'seat-1')).status, 200);
    assert.equal((await firestoreEventQuery(matchId, 'public', player)).status, 200);
    for (const identity of [host, display, target, outsider]) {
      assert.equal((await firestoreRequest(`${root}/playerViews/${player.uid}`, { idToken: identity.idToken })).status, 403);
      assert.equal((await firestoreEventQuery(matchId, 'p-seat-1', identity, 'seat-1')).status, 403);
    }
    for (const identity of [host, player, display]) assert.equal((await firestoreRequest(`${root}/engine/current`, { idToken: identity.idToken })).status, 403);
    for (const path of [`${root}/views/public`, `${root}/playerViews/${player.uid}`, `${root}/members/${player.uid}`, `${root}/seats/seat-1`, `${root}/control/session`, `${root}/audienceEvents/p-seat-1/items/1-0`]) {
      assert.equal((await firestoreRequest(path, { idToken: player.idToken, method: 'PATCH', data: view('seat-1') })).status, 403);
    }
    // Recover seat: a stale membership cannot read the old UID view or retained seat history.
    await db.doc(`${root}/seats/seat-1`).set({ uid: replacement.uid, bindingRevision: 2 });
    await db.doc(`${root}/members/${replacement.uid}`).set({ kind: 'player', seatId: 'seat-1', bindingRevision: 1 });
    await db.doc(`${root}/playerViews/${replacement.uid}`).set(view('seat-1'));
    assert.equal((await firestoreRequest(`${root}/views/public`, { idToken: player.idToken })).status, 403);
    assert.equal((await firestoreRequest(`${root}/playerViews/${player.uid}`, { idToken: player.idToken })).status, 403);
    assert.equal((await firestoreEventQuery(matchId, 'p-seat-1', player, 'seat-1')).status, 403);
    assert.equal((await firestoreRequest(`${root}/playerViews/${replacement.uid}`, { idToken: replacement.idToken })).status, 403);
    await db.doc(`${root}/members/${replacement.uid}`).set({ kind: 'player', seatId: 'seat-1', bindingRevision: 2 });
    assert.equal((await firestoreRequest(`${root}/playerViews/${replacement.uid}`, { idToken: replacement.idToken })).status, 200);
    assert.equal((await firestoreEventQuery(matchId, 'p-seat-1', replacement, 'seat-1')).status, 200);
  } finally { await db.terminate(); await deleteApp(app); }
});
