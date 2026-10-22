import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { assertLocalEmulators, projectId, createEmulatorIdentity, firestoreRequest, firestoreEventQuery } from '../test/helpers.mjs';

test('Auth emulator identities can read only admitted audience paths; direct writes and private reads are denied', async () => {
  assertLocalEmulators();
  const app = initializeApp({ projectId }, `security-${randomUUID()}`);
  const db = getFirestore(app);
  const [officer, target, display, outsider] = await Promise.all(Array.from({ length: 4 }, () => createEmulatorIdentity()));
  const matchId = `security-${randomUUID()}`;
  const root = `matches/${matchId}`;
  const publicView = { matchId, audience: { kind: 'public' }, viewRevision: 1 };
  const player = seatId => ({ matchId, audience: { kind: 'player', seatId }, self: { seatId, role: 'fixture-role' }, viewRevision: 1 });
  const publicEvent = { matchId, audience: { kind: 'public' }, viewRevision: 1, fact: { type: 'PHASE_CHANGED', phaseId: 'phase-a' } };
  const playerEvent = { matchId, audience: { kind: 'player', seatId: 'seat-1' }, viewRevision: 1, fact: { type: 'COMMAND_REGISTERED', commandId: 'command-a' } };
  try {
    const batch = db.batch();
    for (const [path, data] of [
      [`${root}/members/${officer.uid}`, { kind: 'player', seatId: 'seat-1', host: true }],
      [`${root}/members/${target.uid}`, { kind: 'player', seatId: 'seat-2' }],
      [`${root}/members/${display.uid}`, { kind: 'display' }],
      [`${root}/views/public`, publicView],
      [`${root}/playerViews/${officer.uid}`, player('seat-1')],
      [`${root}/playerViews/${target.uid}`, player('seat-2')],
      [`${root}/engine/current`, { protection: true, secret: 'server-only-fixture' }],
      [`${root}/events/event-a`, { secret: 'server-only-fixture' }],
      [`${root}/receipts/receipt-a`, { secret: 'server-only-fixture' }],
      [`${root}/outbox/task-a`, { secret: 'server-only-fixture' }],
      [`${root}/audienceEvents/public/items/1-0`, publicEvent],
      [`${root}/audienceEvents/${officer.uid}/items/1-0`, playerEvent],
    ]) batch.set(db.doc(path), data);
    await batch.commit();

    for (const identity of [officer, target, display]) {
      assert.equal((await firestoreRequest(`${root}/views/public`, { idToken: identity.idToken })).status, 200);
    }
    assert.equal((await firestoreRequest(`${root}/playerViews/${officer.uid}`, { idToken: officer.idToken })).status, 200);
    assert.equal((await firestoreRequest(`${root}/playerViews/${target.uid}`, { idToken: target.idToken })).status, 200);

    for (const [path, identity] of [
      [`${root}/views/public`, outsider],
      [`${root}/playerViews/${target.uid}`, officer],
      [`${root}/playerViews/${officer.uid}`, target],
      [`${root}/playerViews/${officer.uid}`, display],
      [`${root}/engine/current`, officer],
      [`${root}/events/event-a`, officer],
      [`${root}/receipts/receipt-a`, officer],
      [`${root}/outbox/task-a`, officer],
      [`${root}/members/${officer.uid}`, officer],
      [`${root}/audienceEvents/${officer.uid}/items/1-0`, target],
    ]) {
      const result = await firestoreRequest(path, { idToken: identity.idToken });
      assert.equal(result.status, 403);
      assert.equal(JSON.stringify(result.body).includes('server-only-fixture'), false);
      assert.equal(JSON.stringify(result.body).includes('fixture-role'), false);
    }
    assert.equal((await firestoreRequest(`${root}/views/public`)).status, 403);
    for (const path of [`${root}/views/public`, `${root}/playerViews/${officer.uid}`, `${root}/engine/current`, `${root}/members/${officer.uid}`, `${root}/audienceEvents/public/items/1-0`]) {
      assert.equal((await firestoreRequest(path, { idToken: officer.idToken, method: 'PATCH', data: publicView })).status, 403);
      assert.equal((await firestoreRequest(path, { idToken: officer.idToken, method: 'DELETE' })).status, 403);
    }

    assert.equal((await firestoreEventQuery(matchId, 'public', display)).status, 200);
    assert.equal((await firestoreEventQuery(matchId, officer.uid, officer, 'seat-1')).status, 200);
    assert.equal((await firestoreEventQuery(matchId, officer.uid, target, 'seat-1')).status, 403);
    assert.equal((await firestoreEventQuery(matchId, 'public', outsider)).status, 403);

    // A view with a mismatched seat is not admitted merely because its document UID matches.
    await db.doc(`${root}/playerViews/${officer.uid}`).set(player('seat-2'));
    assert.equal((await firestoreRequest(`${root}/playerViews/${officer.uid}`, { idToken: officer.idToken })).status, 403);
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
});
