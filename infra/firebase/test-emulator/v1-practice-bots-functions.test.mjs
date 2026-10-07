import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullOperationResponseSchema, FullSetPracticeBotsResponseSchema, FullPracticeBotsDocumentSchema, FullPublicViewSchema } from '@mothership/contracts';
import { assertLocalEmulators, projectId, createEmulatorIdentity } from '../test/helpers.mjs';
import { decodeV1State } from '../../../services/game-api/dist/full-game.js';

// Full guarded Auth/Firestore/Functions suite only. No skip or manual worker fallback.
const operations = new Set(['v1CreateMatch', 'v1SetPracticeBots', 'v1StartMatch', 'v1AbortMatch']);
async function invoke(name, payload, identity) {
  const { functionsHost } = assertLocalEmulators(); assert.ok(operations.has(name));
  const response = await fetch(`http://${functionsHost}/${projectId}/us-central1/${name}`, {
    signal: AbortSignal.timeout(30_000), method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173', authorization: `Bearer ${identity.idToken}` },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 200, 'Authenticated guarded practice HTTP operation must succeed');
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  return response.json();
}
const op = value => { FullOperationResponseSchema.parse(value); assert.equal(value.ok, true); return value.result; };

test('actual private Firestore engine trigger runs configured bots after real HTTP start with no worker or client gameplay invocation', async () => {
  assertLocalEmulators();
  const app = initializeApp({ projectId }, 'practice-functions-' + randomUUID()), db = getFirestore(app), host = await createEmulatorIdentity();
  let matchId;
  try {
    const created = op(await invoke('v1CreateMatch', { protocolVersion: 2, requestId: randomUUID(), playerCount: 7 }, host));
    matchId = created.matchId; const base = db.collection('matches').doc(matchId);
    const request = fields => ({ protocolVersion: 2, matchId, requestId: randomUUID(), ...fields });
    const body = { schemaVersion: 1, ...request({ botCount: 7 }) };
    const configured = FullSetPracticeBotsResponseSchema.parse(await invoke('v1SetPracticeBots', body, host));
    assert.equal(configured.ok, true); assert.equal(configured.matchId, matchId); assert.equal(configured.requestId, body.requestId);
    assert.equal(configured.botSeatIds.length, 7);
    op(await invoke('v1StartMatch', request(), host));

    // Observe the real emulator's onDocumentWritten delivery; never call runPracticeBots.
    const initial = decodeV1State((await base.collection('engine').doc('current').get()).data());
    const setup = (await base.collection('events').get()).docs.map(doc => doc.data()).find(record => record.kind === 'SETUP');
    assert.ok(setup); assert.equal(initial.phase.id, setup.phaseId); assert.ok(initial.phase.endsAt > Date.now());
    const expires = Math.min(Date.now() + 45_000, initial.phase.endsAt);
    let commands = [];
    do {
      commands = (await base.collection('events').get()).docs.map(doc => doc.data()).filter(record => record.kind === 'COMMAND' && record.controller === 'bot' && record.request.phaseId === setup.phaseId && record.now < initial.phase.endsAt);
      if (commands.some(record => record.receipt.status === 'accepted')) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    } while (Date.now() < expires);
    assert.ok(commands.some(record => record.receipt.status === 'accepted'), 'The actual private Firestore trigger must commit an accepted bot command without any client gameplay request');
    const receipts = (await base.collection('receipts').get()).docs;
    assert.ok(receipts.some(doc => doc.get('controller') === 'bot' && doc.get('receipt.status') === 'accepted'));
    assert.equal(new Set(commands.map(record => record.actorSeatId + '/' + record.request.commandId)).size, commands.length);
    assert.ok(commands.every(record => record.policyVersion === 'practice-1' && !Object.hasOwn(record, 'verifiedUid')));
    const practice = FullPracticeBotsDocumentSchema.parse((await base.collection('practice').doc('public').get()).data());
    assert.deepEqual(practice.botSeatIds, configured.botSeatIds);
    FullPublicViewSchema.parse((await base.collection('views').doc('public').get()).data());
    for (const collection of ['playerViews', 'ownAcknowledgments', 'seatSessions']) assert.equal((await base.collection(collection).get()).size, 0);
    assert.deepEqual((await base.collection('members').get()).docs.map(doc => doc.id), [host.uid]);
    const bindings = (await base.collection('seats').get()).docs;
    assert.equal(bindings.length, 7); assert.ok(bindings.every(doc => doc.get('controller') === 'bot' && !Object.hasOwn(doc.data(), 'uid')));
  } finally {
    try {
      if (matchId) op(await invoke('v1AbortMatch', { protocolVersion: 2, matchId, requestId: randomUUID() }, host));
    } finally {
      await db.terminate(); await deleteApp(app);
    }
  }
});
