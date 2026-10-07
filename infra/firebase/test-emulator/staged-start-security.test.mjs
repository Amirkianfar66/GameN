import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FullSetupDocumentSchema, FullSetupPlayerViewSchema } from '@mothership/contracts';
import { FULL_ENGINE_VERSION, FULL_RULESET_VERSION, FULL_RULESET_HASH } from '@mothership/engine';
import { assertLocalEmulators, projectId, createEmulatorIdentity, firestoreRequest, firestoreEventQuery } from '../test/helpers.mjs';

async function harness() {
  assertLocalEmulators();
  const app = initializeApp({ projectId }, `setup-security-${randomUUID()}`), db = getFirestore(app);
  const [host, player, peer, display, outsider, replacement] = await Promise.all(Array.from({ length: 6 }, () => createEmulatorIdentity()));
  const matchId = `setup-security-${randomUUID()}`, root = `matches/${matchId}`, dealId = 'synthetic-current-deal';
  const control = { protocolVersion: 2, hostUid: host.uid, playerCount: 7, status: 'awaiting-ready', lifecycleVersion: 'staged-start-1', gameStarted: false };
  const readingStartedAt = Date.now() - 1000;
  const setup = FullSetupDocumentSchema.parse({ schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', matchId, playerCount: 7, revision: 1, stage: 'awaiting-ready', dealId, setupId: 'synthetic-setup',
    choosingStartedAt: readingStartedAt - 30_000, choosingEndsAt: readingStartedAt, readingStartedAt, readingEndsAt: readingStartedAt + 30_000,
    seats: Array.from({ length: 7 }, (_, index) => ({ seatId: `seat-${index + 1}`, confirmed: true, ready: false })) });
  const preview = (seatId, bindingRevision = 1) => FullSetupPlayerViewSchema.parse({ schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1',
    versions: { protocolVersion: 2, rulesetVersion: FULL_RULESET_VERSION, rulesetHash: FULL_RULESET_HASH, engineVersion: FULL_ENGINE_VERSION, assetManifestVersion: 'synthetic-assets' },
    matchId, playerCount: 7, dealId, bindingRevision, audience: { kind: 'player', seatId }, self: { seatId, role: 'Insider' } });
  const batch = db.batch();
  for (const [suffix, value] of [
    ['control/session', control], ['setup/public', setup],
    ['setup/deal', { schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', dealId, versions: preview('seat-1').versions }],
    [`members/${host.uid}`, { kind: 'display' }], [`members/${display.uid}`, { kind: 'display' }],
    [`members/${player.uid}`, { kind: 'player', seatId: 'seat-1', bindingRevision: 1 }],
    [`members/${peer.uid}`, { kind: 'player', seatId: 'seat-2', bindingRevision: 1 }],
    ['seats/seat-1', { controller: 'human', uid: player.uid, bindingRevision: 1 }],
    ['seats/seat-2', { uid: peer.uid, bindingRevision: 1 }],
    [`setupPlayerViews/${player.uid}`, preview('seat-1')], [`setupPlayerViews/${peer.uid}`, preview('seat-2')],
  ]) batch.set(db.doc(`${root}/${suffix}`), value);
  await batch.commit();
  return { app, db, root, matchId, host, player, peer, display, outsider, replacement, control, setup, preview,
    read: (suffix, identity, options = {}) => firestoreRequest(`${root}/${suffix}`, { idToken: identity?.idToken, ...options }),
    set: (suffix, value) => db.doc(`${root}/${suffix}`).set(value),
    close: async () => { await db.terminate(); await deleteApp(app); } };
}

test('staged role Rules enforce a strict own-role envelope, current deal and lifecycle with no host/display shortcut', async () => {
  const h = await harness();
  try {
    for (const identity of [h.host, h.display, h.player, h.peer]) assert.equal((await h.read('setup/public', identity)).status, 200);
    for (const identity of [undefined, h.outsider]) assert.equal((await h.read('setup/public', identity)).status, 403);
    const suffix = `setupPlayerViews/${h.player.uid}`, original = h.preview('seat-1');
    assert.equal((await h.read(suffix, h.player)).status, 200);
    assert.equal((await h.read(`setupPlayerViews/${h.peer.uid}`, h.peer)).status, 200, 'Legacy human binding without controller remains supported');
    for (const identity of [h.host, h.display, h.peer, h.outsider, undefined]) assert.equal((await h.read(suffix, identity)).status, 403);
    for (const value of [
      { ...original, matchId: 'another-match' }, { ...original, dealId: 'prior-deal' }, { ...original, bindingRevision: 2 },
      { ...original, schemaVersion: 2 }, { ...original, protocolVersion: 1 }, { ...original, lifecycleVersion: 'future-setup' },
      { ...original, audience: { kind: 'player', seatId: 'seat-2' } }, { ...original, self: { seatId: 'seat-2', role: 'Insider' } },
      { ...original, playerCount: 8 }, { ...original, self: { seatId: 'seat-1', role: 'Officer' } },
      { ...original, knowledge: { code: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] } },
      { ...original, self: { ...original.self, insiderCandidates: ['seat-2', 'seat-3', 'seat-4'] } },
      { ...original, audience: { ...original.audience, allRoles: ['Insider'] } },
      { ...original, versions: { ...original.versions, protocolVersion: 1 } },
      { ...original, versions: { ...original.versions, rulesetHash: 'invalid' } },
      { ...original, versions: { ...original.versions, privateCode: 'synthetic-private' } },
    ]) {
      await h.set(suffix, value); assert.equal((await h.read(suffix, h.player)).status, 403);
    }
    await h.set(suffix, original);
    for (const stage of ['lobby', 'choosing', 'running', 'aborted']) {
      await h.set('control/session', { ...h.control, status: stage });
      assert.equal((await h.read(suffix, h.player)).status, 403);
    }
    await h.set('control/session', h.control);
    for (const stage of ['lobby', 'choosing', 'running', 'aborted']) {
      await h.set('setup/public', { ...h.setup, stage });
      assert.equal((await h.read(suffix, h.player)).status, 403);
    }
    await h.set('setup/public', h.setup);
    for (const patch of [{ lifecycleVersion: 'future-setup' }, { gameStarted: true }]) {
      await h.set('control/session', { ...h.control, ...patch });
      assert.equal((await h.read(suffix, h.player)).status, 403);
    }
    await h.set('control/session', h.control);
    assert.equal((await h.read(suffix, h.player)).status, 200);
    for (const path of ['setup/public', suffix]) assert.equal((await h.read(path, h.player, { method: 'PATCH', data: original })).status, 403);
    assert.equal((await h.read('setupPlayerViews', h.player)).status, 403);
    assert.equal((await h.read('setup', h.player)).status, 403);
    // Host may see their own preview only after acquiring a real active human seat.
    await h.set(`members/${h.host.uid}`, { kind: 'player', seatId: 'seat-3', bindingRevision: 1 });
    await h.set('seats/seat-3', { controller: 'human', uid: h.host.uid, bindingRevision: 1 });
    await h.set(`setupPlayerViews/${h.host.uid}`, h.preview('seat-3'));
    assert.equal((await h.read(`setupPlayerViews/${h.host.uid}`, h.host)).status, 200);
  } finally { await h.close(); }
});

test('staged role recovery Rules revoke old identities and forged bot memberships while allowing an authorized missing read', async () => {
  const h = await harness();
  try {
    const old = `setupPlayerViews/${h.player.uid}`, replacement = `setupPlayerViews/${h.replacement.uid}`;
    await h.set('seats/seat-1', { controller: 'human', uid: h.replacement.uid, bindingRevision: 2 });
    await h.set(`members/${h.replacement.uid}`, { kind: 'player', seatId: 'seat-1', bindingRevision: 2 });
    await h.set(replacement, h.preview('seat-1'));
    assert.equal((await h.read(old, h.player)).status, 403);
    assert.equal((await h.read('setup/public', h.player)).status, 403);
    assert.equal((await h.read(replacement, h.replacement)).status, 403, 'Transferred preview must carry current binding revision');
    await h.set(replacement, h.preview('seat-1', 2));
    assert.equal((await h.read(replacement, h.replacement)).status, 200);
    await h.db.doc(`${h.root}/${old}`).delete();
    assert.equal((await h.read(old, h.player)).status, 403, 'Revocation must not turn into an authorized missing read');
    await h.db.doc(`${h.root}/${replacement}`).delete();
    assert.equal((await h.read(replacement, h.replacement)).status, 404, 'Missing own preview does not deny current seat membership');
    await h.set('seats/seat-4', { controller: 'bot', bindingRevision: 1 });
    await h.set(`members/${h.outsider.uid}`, { kind: 'player', seatId: 'seat-4', bindingRevision: 1 });
    await h.set(`setupPlayerViews/${h.outsider.uid}`, h.preview('seat-4'));
    assert.equal((await h.read(`setupPlayerViews/${h.outsider.uid}`, h.outsider)).status, 403);
    assert.equal((await h.read('setup/public', h.outsider)).status, 403);
    await h.set('seats/seat-4', { controller: 'bot', uid: h.outsider.uid, bindingRevision: 1 });
    assert.equal((await h.read(`setupPlayerViews/${h.outsider.uid}`, h.outsider)).status, 403, 'Even a forged bot UID cannot become a human audience');
  } finally { await h.close(); }
});

test('new staged lifecycle gates all gameplay reads through launch and setup abort while retaining seat sessions and legacy reads', async () => {
  const h = await harness();
  try {
    const publicView = { matchId: h.matchId, audience: { kind: 'public' }, viewRevision: 1 };
    const privateView = { matchId: h.matchId, audience: { kind: 'player', seatId: 'seat-1' }, self: { seatId: 'seat-1' }, viewRevision: 1 };
    const own = { schemaVersion: 1, protocolVersion: 2, matchId: h.matchId, seatId: 'seat-1', bindingRevision: 1 };
    for (const [suffix, value] of [
      ['views/public', publicView], [`playerViews/${h.player.uid}`, privateView], [`ownAcknowledgments/${h.player.uid}`, own], [`seatSessions/${h.player.uid}`, own],
      ['audienceEvents/public/items/1-0', { matchId: h.matchId, audience: { kind: 'public' } }],
      ['audienceEvents/p-seat-1/items/1-0', { matchId: h.matchId, audience: { kind: 'player', seatId: 'seat-1' } }],
    ]) await h.set(suffix, value);
    const gameplayPaths = ['views/public', `playerViews/${h.player.uid}`, `ownAcknowledgments/${h.player.uid}`, 'audienceEvents/public/items/1-0', 'audienceEvents/p-seat-1/items/1-0'];
    for (const status of ['lobby', 'choosing', 'awaiting-ready', 'aborted']) {
      await h.set('control/session', { ...h.control, status, gameStarted: false });
      for (const path of gameplayPaths) assert.equal((await h.read(path, h.player)).status, 403);
      assert.equal((await firestoreEventQuery(h.matchId, 'public', h.player)).status, 403);
      assert.equal((await firestoreEventQuery(h.matchId, 'p-seat-1', h.player, 'seat-1')).status, 403);
      assert.equal((await h.read(`seatSessions/${h.player.uid}`, h.player)).status, 200);
    }
    for (const status of ['running', 'aborted']) {
      await h.set('control/session', { ...h.control, status, gameStarted: true });
      for (const path of gameplayPaths) assert.equal((await h.read(path, h.player)).status, 200);
      assert.equal((await firestoreEventQuery(h.matchId, 'public', h.player)).status, 200);
      assert.equal((await firestoreEventQuery(h.matchId, 'p-seat-1', h.player, 'seat-1')).status, 200);
    }
    for (const lifecycleVersion of ['future-start', null]) {
      await h.set('control/session', { ...h.control, status: 'running', gameStarted: true, lifecycleVersion });
      for (const path of gameplayPaths) assert.equal((await h.read(path, h.player)).status, 403);
    }
    // Previously running protocol-2 sessions have no marker and remain readable.
    const { lifecycleVersion: _lifecycle, gameStarted: _started, ...legacy } = h.control;
    await h.set('control/session', { ...legacy, status: 'running' });
    for (const path of gameplayPaths) assert.equal((await h.read(path, h.player)).status, 200);
    await h.db.doc(`${h.root}/setup/public`).delete();
    assert.equal((await h.read('setup/public', h.player)).status, 404, 'Legacy clients can distinguish missing additive setup metadata');
    assert.equal((await h.read(`setupPlayerViews/${h.player.uid}`, h.player)).status, 403);
    // Existing protocol-1 fixture audiences also retain their approved read path.
    await h.db.doc(`${h.root}/control/session`).delete();
    assert.equal((await h.read('views/public', h.player)).status, 200);
    assert.equal((await h.read(`playerViews/${h.player.uid}`, h.player)).status, 200);
  } finally { await h.close(); }
});


test('timed role Rules refuse premature previews and stale prepared deals while preserving early-Ready reading access', async () => {
  const h = await harness();
  try {
    const suffix = `setupPlayerViews/${h.player.uid}`;
    const prepared = { schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', dealId: h.setup.dealId, versions: h.preview('seat-1').versions };
    // Admin fixtures simulate invalid server publications; the client cannot create them.
    for (const patch of [
      { readingStartedAt: null }, { readingEndsAt: h.setup.readingStartedAt + 29_999 },
      { choosingEndsAt: h.setup.choosingStartedAt + 29_999 }, { readingStartedAt: h.setup.choosingEndsAt - 1 },
      { setupId: null },
    ]) {
      await h.set('setup/public', { ...h.setup, ...patch });
      assert.equal((await h.read(suffix, h.player)).status, 403);
    }
    const futureReading = Date.now() + 60_000;
    await h.set('setup/public', { ...h.setup, choosingStartedAt: futureReading - 30_000, choosingEndsAt: futureReading,
      readingStartedAt: futureReading, readingEndsAt: futureReading + 30_000 });
    assert.equal((await h.read(suffix, h.player)).status, 403, 'Trusted request time must reach the published reading start');
    await h.set('setup/public', h.setup);
    await h.db.doc(`${h.root}/setup/deal`).delete();
    assert.equal((await h.read(suffix, h.player)).status, 403, 'A visible preview requires the current durable prepared deal');
    for (const patch of [
      { dealId: 'another-deal' }, { schemaVersion: 2 }, { protocolVersion: 1 }, { lifecycleVersion: 'future-setup' },
      { versions: { ...prepared.versions, assetManifestVersion: 'another-manifest' } },
    ]) {
      await h.set('setup/deal', { ...prepared, ...patch });
      assert.equal((await h.read(suffix, h.player)).status, 403);
    }
    await h.set('setup/deal', prepared);
    await h.set('setup/public', { ...h.setup, seats: h.setup.seats.map(seat => seat.seatId === 'seat-1' ? { ...seat, ready: true } : seat) });
    assert.equal((await h.read(suffix, h.player)).status, 200, 'Early Ready does not discard private role access during the reading window');
    const elapsedReading = Date.now() - 31_000;
    await h.set('setup/public', { ...h.setup, choosingStartedAt: elapsedReading - 30_000, choosingEndsAt: elapsedReading,
      readingStartedAt: elapsedReading, readingEndsAt: elapsedReading + 30_000 });
    assert.equal((await h.read(suffix, h.player)).status, 200, 'Reading remains available while waiting for the final human Ready');
    for (const path of ['setup/deal', `setupOutbox/${'a'.repeat(64)}`]) {
      for (const identity of [h.host, h.player, h.display]) assert.equal((await h.read(path, identity)).status, 403);
    }
  } finally { await h.close(); }
});
