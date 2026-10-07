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
  const setup = FullSetupDocumentSchema.parse({ schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', matchId, playerCount: 7, revision: 1, stage: 'awaiting-ready', dealId,
    seats: Array.from({ length: 7 }, (_, index) => ({ seatId: `seat-${index + 1}`, confirmed: true, ready: false })) });
  const preview = (seatId, bindingRevision = 1) => FullSetupPlayerViewSchema.parse({ schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1',
    versions: { protocolVersion: 2, rulesetVersion: FULL_RULESET_VERSION, rulesetHash: FULL_RULESET_HASH, engineVersion: FULL_ENGINE_VERSION, assetManifestVersion: 'synthetic-assets' },
    matchId, playerCount: 7, dealId, bindingRevision, audience: { kind: 'player', seatId }, self: { seatId, role: 'Insider' } });
  const batch = db.batch();
  for (const [suffix, value] of [
    ['control/session', control], ['setup/public', setup],
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

test('staged role recovery Rules revoke old identities and forged bot memberships while allowing authorized preview deletion', async () => {
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
    assert.equal((await h.read(replacement, h.replacement)).status, 404, 'Ready deletes own preview without denying current seat membership');
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
