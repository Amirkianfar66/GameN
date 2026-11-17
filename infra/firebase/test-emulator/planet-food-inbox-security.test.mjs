import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID, createHash} from 'node:crypto';
import {initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {assertLocalEmulators, createEmulatorIdentity, firestoreRequest, projectId} from '../test/helpers.mjs';

test('Food pending inbox stays server-only even for its named participant', async () => {
  assertLocalEmulators();
  const app = initializeApp({projectId}, 'food-inbox-security-' + randomUUID());
  const db = getFirestore(app);
  const scope = createHash('sha256').update(randomUUID()).digest('hex');
  const intent = createHash('sha256').update(randomUUID()).digest('hex');
  const collection = `planetFoodInboxes/${scope}/pending`;
  const path = `${collection}/${intent}`;
  try {
    const participant = await createEmulatorIdentity(), other = await createEmulatorIdentity();
    await db.doc(path).create({uid: participant.uid, priorityAt: 1});
    for (const idToken of [undefined, participant.idToken, other.idToken]) {
      assert.equal((await firestoreRequest(path, {idToken})).status, 403);
      assert.equal((await firestoreRequest(collection, {idToken})).status, 403);
      assert.equal((await firestoreRequest(path, {idToken, method: 'PATCH', data: {priorityAt: 0}})).status, 403);
      assert.equal((await firestoreRequest(path, {idToken, method: 'DELETE'})).status, 403);
    }
    assert.equal((await db.doc(path).get()).get('priorityAt'), 1);
  } finally {
    await db.doc(path).delete();
    await db.terminate();
    await deleteApp(app);
  }
});
