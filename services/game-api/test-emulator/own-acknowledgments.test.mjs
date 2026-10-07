import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  FullOperationResponseSchema, FullCommandResponseSchema, FullAdvanceResponseSchema,
  FullLookupResponseSchema, FullServerTimeResponseSchema,
  OwnAcknowledgmentsSchema, SeatSessionSchema,
} from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';
import { decodeV1State } from '../dist/full-game.js';
import { assertLocalEmulators, projectId, createEmulatorIdentity, firestoreRequest } from '../../../infra/firebase/test/helpers.mjs';

let app, db, serial = 0;
const same = (actual, expected, message = 'Synthetic private evidence must match') => assert.equal(isDeepStrictEqual(actual, expected), true, message);
const success = response => {
  FullOperationResponseSchema.parse(response);
  assert.equal(response.ok, true, 'The synthetic service operation must succeed');
  return response.result;
};
before(() => {
  assertLocalEmulators();
  app = initializeApp({ projectId }, `own-acknowledgments-${randomUUID()}`);
  db = getFirestore(app);
});
after(async () => { await db?.terminate(); if (app) await deleteApp(app); });

async function harness({ hostPlays = false } = {}) {
  let now = 2_100_000_000_000 + ++serial * 100_000_000;
  const options = { db, clock: () => now, shuffle: items => [...items] };
  const service = createV1Service(options), host = await createEmulatorIdentity();
  const players = await Promise.all(Array.from({ length: 7 }, (_, index) => hostPlays && index === 0 ? host : createEmulatorIdentity()));
  const created = success(await service.createMatch(host.uid, { protocolVersion: 2, requestId: randomUUID(), playerCount: 7 }));
  const base = db.collection('matches').doc(created.matchId);
  const request = fields => ({ protocolVersion: 2, matchId: base.id, requestId: randomUUID(), ...fields });
  for (let index = 0; index < players.length; index++) {
    const admission = success(await service.requestAdmission(players[index].uid, {
      protocolVersion: 2, requestId: randomUUID(), roomCode: created.roomCode, initialRoom: 'Room A',
    }));
    success(await service.approveAdmission(host.uid, request({ admissionId: admission.admissionId, seatId: `seat-${index + 1}` })));
  }
  success(await service.startMatch(host.uid, request()));
  return { service, options, host, players, base, request, now: () => now, setTime: value => { now = value; },
    current: async () => decodeV1State((await base.collection('engine').doc('current').get()).data()) };
}
async function tick(h) {
  const state = await h.current();
  assert.notEqual(state.phase.endsAt, null, 'The synthetic match must still have a deadline');
  h.setTime(state.phase.endsAt);
  const response = FullAdvanceResponseSchema.parse(await h.service.runDeadline({ matchId: h.base.id, phaseId: state.phase.id, deadlineToken: state.deadlineToken }));
  assert.equal(response.result, 'advanced');
}
async function until(h, predicate) {
  for (let count = 0; ; count++) {
    const state = await h.current();
    if (predicate(state)) return state;
    assert.ok(count < 150, 'The synthetic lifecycle checkpoint must be reachable');
    await tick(h);
  }
}
const pathFor = (h, collection, identity) => `${h.base.path}/${collection}/${identity.uid}`;
const read = (h, collection, owner, reader = owner) => firestoreRequest(pathFor(h, collection, owner), { idToken: reader?.idToken });
const acknowledgment = async (h, identity) => OwnAcknowledgmentsSchema.parse((await db.doc(pathFor(h, 'ownAcknowledgments', identity)).get()).data());
async function stable(paths, action) {
  const before = await Promise.all(paths.map(path => db.doc(path).get()));
  await action();
  const after = await Promise.all(paths.map(path => db.doc(path).get()));
  before.forEach((snapshot, index) => {
    same(after[index].data(), snapshot.data(), 'Unrelated private document bytes must remain unchanged');
    assert.ok(after[index].updateTime.isEqual(snapshot.updateTime), 'Unrelated private document updateTime must remain unchanged');
  });
}
async function supply(h) {
  const state = await until(h, next => next.round === 3 && next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-4');
  const payload = { protocolVersion: 2, matchId: h.base.id, phaseId: state.phase.id, commandId: randomUUID(),
    command: { type: 'SUPPLY', targetSeatIds: ['seat-1', 'seat-2'] } };
  const job = { matchId: h.base.id, phaseId: state.phase.id, deadlineToken: state.deadlineToken };
  const response = FullCommandResponseSchema.parse(await h.service.submit(h.players[3].uid, payload));
  assert.equal(response.receipt.status, 'accepted');
  return { payload, receipt: response.receipt, job };
}

// Service transitions use the real Firestore transaction store and real Auth identities.
// Only clock/deal order are injected; no Functions listener or cloud task queue is used.
test('Supply writes durable own-only outcomes without rewriting uninvolved documents; retries and stale deadlines grant once', async () => {
  const h = await harness();
  await until(h, next => next.round === 3 && next.phase.kind === 'ORDINARY_TURN' && next.activeSeatId === 'seat-4');
  const allAcknowledgments = h.players.map(identity => pathFor(h, 'ownAcknowledgments', identity));
  const nonActorViews = h.players.filter((_, index) => index !== 3).map(identity => pathFor(h, 'playerViews', identity));
  let registration;
  await stable([...allAcknowledgments, `${h.base.path}/views/public`, ...nonActorViews], async () => { registration = await supply(h); });
  same((await acknowledgment(h, h.players[3])).supplierResults, []);
  const uninvolved = [2, 4, 5, 6].map(index => pathFor(h, 'ownAcknowledgments', h.players[index]));
  await stable(uninvolved, () => until(h, next => next.round === 4));
  const supplier = await acknowledgment(h, h.players[3]);
  same(supplier.supplierResults, [{ round: 3, commandId: registration.payload.commandId, successfulRecipientSeatIds: ['seat-1', 'seat-2'] }]);
  same(supplier.receivedSupply, []);
  assert.equal(supplier.revision, 2);
  for (const index of [0, 1]) {
    const recipient = await acknowledgment(h, h.players[index]);
    same(recipient.supplierResults, []);
    same(recipient.receivedSupply, [{ round: 3, ordinaryWeaponsGranted: 1 }]);
    assert.equal(recipient.revision, 2);
    assert.equal(JSON.stringify(recipient).includes(registration.payload.commandId), false);
    assert.equal(JSON.stringify(recipient).includes('seat-4'), false);
  }
  const state = await h.current();
  same(state.seats.slice(0, 2).map(seat => seat.ordinaryWeapons), [1, 1]);
  assert.equal(state.supplierGrantResults.length, 1);
  await stable(allAcknowledgments, async () => {
    const restarted = createV1Service(h.options);
    const retry = FullCommandResponseSchema.parse(await restarted.submit(h.players[3].uid, registration.payload));
    same(retry.receipt, registration.receipt);
    const stale = FullAdvanceResponseSchema.parse(await restarted.runDeadline(registration.job));
    assert.equal(stale.result, 'unchanged');
    await tick(h);
  });
  same((await acknowledgment(h, h.players[3])).supplierResults, supplier.supplierResults);
  assert.equal((await h.current()).supplierGrantResults.length, 1);
  same((await h.current()).seats.slice(0, 2).map(seat => seat.ordinaryWeapons), [1, 1]);
});

test('own acknowledgment and session Rules deny every other audience, collection reads and client writes', async () => {
  const h = await harness(), owner = h.players[3];
  const [display, outsider] = await Promise.all([createEmulatorIdentity(), createEmulatorIdentity()]);
  success(await h.service.admitDisplay(h.host.uid, h.request({ displayUid: display.uid })));
  for (const collection of ['ownAcknowledgments', 'seatSessions']) {
    assert.equal((await read(h, collection, owner)).status, 200);
    for (const identity of [h.players[0], h.host, display, outsider, null]) {
      assert.equal((await read(h, collection, owner, identity)).status, 403);
    }
    assert.equal((await firestoreRequest(`${h.base.path}/${collection}`, { idToken: owner.idToken })).status, 403);
    const ref = db.doc(pathFor(h, collection, owner)), value = (await ref.get()).data();
    assert.equal((await firestoreRequest(ref.path, { idToken: owner.idToken, method: 'PATCH', data: value })).status, 403);
    assert.equal((await firestoreRequest(ref.path, { idToken: owner.idToken, method: 'DELETE' })).status, 403);
    await ref.delete();
    try { assert.equal((await firestoreRequest(ref.path, { idToken: owner.idToken, method: 'PATCH', data: value })).status, 403); }
    finally { await ref.set(value); }
  }
  assert.equal((await firestoreRequest(`${h.base.path}/seats/seat-4`, { idToken: owner.idToken })).status, 403);
});

test('own-document Rules bind schema, match, seat and revision to the active reverse seat binding', async () => {
  const h = await harness(), owner = h.players[3];
  for (const collection of ['ownAcknowledgments', 'seatSessions']) {
    const ref = db.doc(pathFor(h, collection, owner)), value = (await ref.get()).data();
    for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { matchId: 'another-match' }, { seatId: 'seat-1' }, { bindingRevision: 2 }]) {
      await ref.set({ ...value, ...patch });
      try { assert.equal((await read(h, collection, owner)).status, 403); }
      finally { await ref.set(value); }
    }
    assert.equal((await read(h, collection, owner)).status, 200);
  }
  const binding = h.base.collection('seats').doc('seat-4'), originalBinding = (await binding.get()).data();
  for (const patch of [{ uid: h.players[0].uid }, { bindingRevision: 2 }]) {
    await binding.set({ ...originalBinding, ...patch });
    try { for (const collection of ['ownAcknowledgments', 'seatSessions']) assert.equal((await read(h, collection, owner)).status, 403); }
    finally { await binding.set(originalBinding); }
  }
  const membership = h.base.collection('members').doc(owner.uid), originalMembership = (await membership.get()).data();
  await membership.set({ ...originalMembership, seatId: 'seat-1' });
  try { for (const collection of ['ownAcknowledgments', 'seatSessions']) assert.equal((await read(h, collection, owner)).status, 403); }
  finally { await membership.set(originalMembership); }
});

test('active owners can observe missing legacy documents while raw bindings remain private', async () => {
  const h = await harness(), owner = h.players[3];
  for (const collection of ['ownAcknowledgments', 'seatSessions']) {
    await db.doc(pathFor(h, collection, owner)).delete();
    assert.equal((await read(h, collection, owner)).status, 404);
    assert.equal((await read(h, collection, owner, h.players[0])).status, 403);
    assert.equal((await read(h, collection, owner, null)).status, 403);
  }
  assert.equal((await firestoreRequest(`${h.base.path}/seats/seat-4`, { idToken: owner.idToken })).status, 403);
});

test('a host who owns a player seat can read only that seat acknowledgment and session', async () => {
  const h = await harness({ hostPlays: true });
  for (const collection of ['ownAcknowledgments', 'seatSessions']) {
    assert.equal((await read(h, collection, h.host)).status, 200);
    assert.equal((await read(h, collection, h.players[3], h.host)).status, 403);
  }
});

test('seat recovery transfers durable acknowledgments and session metadata atomically and revokes the old Auth identity', async () => {
  const h = await harness(), old = h.players[3];
  const registration = await supply(h);
  await until(h, next => next.round === 4);
  const previous = await acknowledgment(h, old);
  const issued = success(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-4' })));
  assert.equal(typeof issued.recoveryToken, 'string');
  const replacement = await createEmulatorIdentity();
  success(await h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
  const transferred = await acknowledgment(h, replacement);
  same(transferred, { ...previous, bindingRevision: 2, revision: previous.revision + 1 });
  const session = SeatSessionSchema.parse((await db.doc(pathFor(h, 'seatSessions', replacement)).get()).data());
  same(session, { schemaVersion: 1, protocolVersion: 2, matchId: h.base.id, seatId: 'seat-4', bindingRevision: 2 });
  for (const collection of ['ownAcknowledgments', 'seatSessions']) {
    assert.equal((await db.doc(pathFor(h, collection, old)).get()).exists, false);
    assert.equal((await read(h, collection, old)).status, 403);
    assert.equal((await read(h, collection, replacement, old)).status, 403);
    assert.equal((await read(h, collection, replacement, h.players[0])).status, 403);
    assert.equal((await read(h, collection, replacement)).status, 200);
  }
  assert.equal((await h.base.collection('members').doc(old.uid).get()).exists, false);
  const binding = (await h.base.collection('seats').doc('seat-4').get()).data();
  const membership = (await h.base.collection('members').doc(replacement.uid).get()).data();
  assert.equal(binding.uid === replacement.uid, true, 'The reverse seat binding must name the replacement identity');
  assert.equal(binding.bindingRevision, 2);
  same(membership, { kind: 'player', seatId: 'seat-4', bindingRevision: 2 });
  assert.equal((await h.service.submit(old.uid, registration.payload)).error?.code, 'FORBIDDEN');
  const retry = FullCommandResponseSchema.parse(await h.service.submit(replacement.uid, registration.payload));
  same(retry.receipt, registration.receipt);
  same(await acknowledgment(h, replacement), transferred);
  assert.equal((await h.current()).supplierGrantResults.length, 1);
});


test('legacy engine 1.0.0 refuses state and binding mutations while receipt/time reads and grant issuance remain supported', async () => {
  const h = await harness(), replacement = await createEmulatorIdentity();
  const first = await h.current();
  const recorded = { protocolVersion: 2, matchId: h.base.id, phaseId: first.phase.id, commandId: randomUUID(),
    command: { type: 'MOVE', destination: 'Room B' } };
  const accepted = FullCommandResponseSchema.parse(await h.service.submit(h.players[0].uid, recorded));
  assert.equal(accepted.receipt.status, 'accepted');
  await tick(h);
  // A valid, unconsumed grant must exist before the legacy mutation guard is exercised.
  const issued = success(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-1' })));
  const batch = db.batch();
  batch.update(h.base.collection('engine').doc('current'), {
    'versions.engineVersion': 'full-game-1.0.0', supplierGrantResults: FieldValue.delete(),
  });
  for (const ref of [h.base.collection('views').doc('public'), ...h.players.map(identity => h.base.collection('playerViews').doc(identity.uid))]) {
    batch.update(ref, { 'versions.engineVersion': 'full-game-1.0.0' });
  }
  await batch.commit();
  const legacy = await h.current();
  assert.equal(legacy.versions.engineVersion, 'full-game-1.0.0');
  assert.equal(Object.hasOwn(legacy, 'supplierGrantResults'), false);

  const snapshot = async () => {
    const entries = new Map();
    const collections = ['engine', 'control', 'lobby', 'views', 'playerViews', 'ownAcknowledgments', 'seatSessions',
      'seats', 'members', 'receipts', 'outbox', 'events', 'recovery', 'identityAudit'];
    const queries = [
      ...collections.map(name => h.base.collection(name).get()),
      ...['public', ...h.players.map((_, index) => `p-seat-${index + 1}`)].map(key => h.base.collection('audienceEvents').doc(key).collection('items').get()),
      db.collection('identityOperations').where('uid', 'in', [h.host.uid, ...h.players.map(identity => identity.uid), replacement.uid]).get(),
    ];
    for (const query of await Promise.all(queries)) for (const doc of query.docs) {
      entries.set(doc.ref.path, { data: doc.data(), updateTime: doc.updateTime });
    }
    return entries;
  };
  // Rate counters are intentionally excluded: compatible reads and refused identity
  // operations may update their own request budget without mutating match facts.
  const protectedDocuments = await snapshot();
  const command = { protocolVersion: 2, matchId: h.base.id, phaseId: legacy.phase.id, commandId: randomUUID(),
    command: { type: 'MOVE', destination: 'Room B' } };
  const refuse = async operation => {
    const response = await operation();
    assert.equal(response.error?.code, 'UNSUPPORTED_PROTOCOL');
    same(await snapshot(), protectedDocuments, 'A legacy-version refusal must not rewrite match, binding or operation-receipt evidence');
  };
  await refuse(() => h.service.submit(h.players[1].uid, command));
  h.setTime(legacy.phase.endsAt);
  await refuse(() => h.service.advance(h.players[1].uid, { protocolVersion: 2, matchId: h.base.id, phaseId: legacy.phase.id }));
  await refuse(() => h.service.runDeadline({ matchId: h.base.id, phaseId: legacy.phase.id, deadlineToken: legacy.deadlineToken }));
  await refuse(() => h.service.abortMatch(h.host.uid, h.request()));
  await refuse(() => h.service.redeemSeatRecovery(replacement.uid, h.request({ recoveryToken: issued.recoveryToken })));
  assert.equal((await h.base.collection('recovery').doc('seat-1').get()).get('consumed'), false);

  const known = FullLookupResponseSchema.parse(await h.service.lookup(h.players[0].uid, {
    protocolVersion: 2, matchId: h.base.id, commandId: recorded.commandId,
  }));
  assert.equal(known.status, 'found');
  same(known.receipt, accepted.receipt);
  const unknown = FullLookupResponseSchema.parse(await h.service.lookup(h.players[1].uid, {
    protocolVersion: 2, matchId: h.base.id, commandId: command.commandId,
  }));
  assert.equal(unknown.status, 'unknown');
  const time = FullServerTimeResponseSchema.parse(await h.service.serverTime(h.players[1].uid, { protocolVersion: 2, matchId: h.base.id }));
  assert.equal(time.serverTimeMs, h.now());
  same(await snapshot(), protectedDocuments, 'Compatible read operations must leave match facts and sidecars unchanged');

  // Issuing a recovery capability does not rotate a seat or evaluate engine state.
  // The service deliberately still supports this operation for a legacy match.
  const fixedPaths = [`${h.base.path}/engine/current`, `${h.base.path}/views/public`,
    ...h.players.flatMap(identity => ['playerViews', 'ownAcknowledgments', 'seatSessions', 'members'].map(collection => pathFor(h, collection, identity))),
    ...h.players.map((_, index) => `${h.base.path}/seats/seat-${index + 1}`)];
  await stable(fixedPaths, async () => {
    const stillIssued = success(await h.service.issueSeatRecovery(h.host.uid, h.request({ seatId: 'seat-2' })));
    assert.equal(typeof stillIssued.recoveryToken, 'string');
  });
  assert.equal((await h.base.collection('recovery').doc('seat-2').get()).get('consumed'), false);
});
