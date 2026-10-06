import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerSnapshotStore, createPublicSnapshotStore, probeProtocolVersion, SUPPORTED_PROTOCOL_VERSIONS } from '@mothership/game';

const { before, afterRegistration } = createOfficerFixture('protected');
const matchId = before.public.matchId;
const altered = (view, change) => {
  const copy = structuredClone(view);
  change(copy);
  return copy;
};
const rejection = outcome => (outcome.kind === 'rejected' ? outcome.rejection.kind : outcome.kind);

test('authored fixture views are accepted and held as the current view', () => {
  const store = createPlayerSnapshotStore({ matchId });
  assert.equal(store.current(), null);
  const outcome = store.accept(before.officer);
  assert.equal(outcome.kind, 'accepted');
  assert.deepEqual(outcome.view, before.officer);
  assert.equal(store.current(), outcome.view);
  const next = store.accept(afterRegistration.officer);
  assert.equal(next.kind, 'accepted');
  assert.deepEqual(store.current().ownPendingCommandIds, ['fixture-command-1']);
});

test('the public route cannot hold a player view, and a player route cannot hold a public one', () => {
  const publicStore = createPublicSnapshotStore({ matchId });
  assert.equal(rejection(publicStore.accept(before.officer)), 'unreadable');
  assert.equal(rejection(publicStore.accept(before.target)), 'unreadable');
  assert.equal(publicStore.current(), null);
  assert.equal(publicStore.accept(before.public).kind, 'accepted');
  assert.equal(JSON.stringify(publicStore.current()).includes('Officer'), false);
  assert.equal(rejection(createPlayerSnapshotStore({ matchId }).accept(before.public)), 'unreadable');
});

test('a field the contract does not list never enters client state', () => {
  const store = createPublicSnapshotStore({ matchId });
  for (const change of [
    view => { view.roles = { 'seat-1': 'Officer' }; },
    view => { view.seats[1].protection = true; },
    view => { view.seats[0].role = 'Officer'; },
    view => { view.phase.deadlineToken = 'server-only'; },
    view => { view.internalSequence = 99; },
    view => { view.updatedAt = 1; },
  ]) {
    assert.equal(rejection(store.accept(altered(before.public, change))), 'unreadable');
  }
  assert.equal(store.current(), null);
  const player = createPlayerSnapshotStore({ matchId });
  assert.equal(rejection(player.accept(altered(before.target, view => { view.self.protection = true; }))), 'unreadable');
  assert.equal(rejection(player.accept(altered(before.officer, view => { view.pendingTargets = ['seat-2']; }))), 'unreadable');
});

test('another protocol version is recognized as incompatible rather than corrupt', () => {
  const store = createPublicSnapshotStore({ matchId });
  const outcome = store.accept(altered(before.public, view => { view.versions.protocolVersion = 2; view.newField = true; }));
  assert.deepEqual(outcome, { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 2 } });
  // Even a payload this build could not otherwise read is classified by its version alone.
  assert.equal(rejection(store.accept({ versions: { protocolVersion: 7 }, anything: ['else'] })), 'incompatible-protocol');
  assert.equal(rejection(store.accept(altered(before.public, view => { view.versions.protocolVersion = 0; }))), 'incompatible-protocol');
  assert.deepEqual(SUPPORTED_PROTOCOL_VERSIONS, [1]);
});

test('the protocol probe trusts nothing but a well-formed version number', () => {
  assert.equal(probeProtocolVersion(before.public), 1);
  for (const payload of [null, undefined, 'text', 3, [], {}, { versions: null }, { versions: 'x' }, { versions: {} }, { versions: { protocolVersion: '1' } }, { versions: { protocolVersion: 1.5 } }, { versions: { protocolVersion: -1 } }, { versions: { protocolVersion: Number.NaN } }]) {
    assert.equal(probeProtocolVersion(payload), null, JSON.stringify(payload));
  }
});

test('garbage is unreadable, never a crash and never a view', () => {
  const store = createPlayerSnapshotStore({ matchId });
  for (const payload of [null, undefined, '', 'text', 0, [], {}, { versions: {} }, altered(before.officer, view => { view.seats.pop(); }), altered(before.officer, view => { view.round = 6; }), altered(before.officer, view => { view.phase.endsAt += 1; })]) {
    assert.equal(rejection(store.accept(payload)), 'unreadable');
  }
  assert.equal(store.current(), null);
});

test('a view for another match is refused', () => {
  const store = createPublicSnapshotStore({ matchId });
  assert.equal(rejection(store.accept(altered(before.public, view => { view.matchId = 'another-match'; }))), 'wrong-match');
  assert.throws(() => createPublicSnapshotStore({ matchId: '../not-an-id' }), /valid match id/);
  assert.throws(() => createPlayerSnapshotStore({ matchId: '' }), /valid match id/);
});

test('a seat keeps its identity: another seat or a different role is an integrity failure', () => {
  const store = createPlayerSnapshotStore({ matchId });
  store.accept(before.officer);
  assert.equal(rejection(store.accept(before.target)), 'identity-changed');
  const redealt = altered(afterRegistration.officer, view => { view.self.role = 'Insider'; });
  assert.equal(rejection(store.accept(redealt)), 'identity-changed');
  assert.deepEqual(store.current(), before.officer, 'The held view is untouched by a refused one');
  assert.equal(store.accept(afterRegistration.officer).kind, 'accepted');
});

test('pinned versions and player count cannot change during a match', () => {
  const store = createPublicSnapshotStore({ matchId });
  store.accept(before.public);
  const bumped = change => altered(before.public, view => { view.viewRevision += 1; change(view); });
  assert.equal(rejection(store.accept(bumped(view => { view.versions.rulesetVersion = 'other-ruleset'; }))), 'pins-changed');
  assert.equal(rejection(store.accept(bumped(view => { view.versions.engineVersion = '9.9.9'; }))), 'pins-changed');
  assert.equal(rejection(store.accept(bumped(view => { view.versions.rulesetHash = 'f'.repeat(64); }))), 'pins-changed');
  assert.equal(rejection(store.accept(bumped(view => { view.versions.assetManifestVersion = 'next'; }))), 'pins-changed');
  assert.equal(store.accept(bumped(() => {})).kind, 'accepted');
});

test('revisions only move forward; a repeat proves freshness and a conflict is refused', () => {
  const store = createPublicSnapshotStore({ matchId });
  const first = store.accept(before.public).view;
  const repeat = store.accept(structuredClone(before.public));
  assert.equal(repeat.kind, 'unchanged');
  assert.equal(repeat.view, first, 'The same object is kept so nothing re-renders');
  // Key order on the wire is irrelevant to equality.
  const reordered = Object.fromEntries(Object.entries(before.public).reverse());
  assert.equal(store.accept(reordered).kind, 'unchanged');

  const conflict = altered(before.public, view => { view.seats[1].health = 'Injured'; });
  assert.equal(rejection(store.accept(conflict)), 'revision-conflict');

  const later = altered(before.public, view => { view.viewRevision += 7; view.seats[1].health = 'Injured'; });
  assert.equal(store.accept(later).kind, 'accepted');
  assert.equal(rejection(store.accept(before.public)), 'ignored-stale');
  assert.equal(store.current().seats[1].health, 'Injured');
});

test('the store exposes views and outcomes only, with no revision arithmetic for callers to misuse', () => {
  const store = createPublicSnapshotStore({ matchId });
  assert.deepEqual(Object.keys(store).sort(), ['accept', 'current']);
  const outcome = store.accept(before.public);
  assert.deepEqual(Object.keys(outcome).sort(), ['kind', 'view']);
});

test('held views are frozen so no consumer can edit server facts in place', () => {
  const store = createPlayerSnapshotStore({ matchId });
  const view = store.accept(before.officer).view;
  assert.throws(() => { view.self.shotAvailable = false; }, TypeError);
  assert.throws(() => { view.seats[0].health = 'Eliminated'; }, TypeError);
  assert.throws(() => { view.seats.push({}); }, TypeError);
  assert.throws(() => { view.ownPendingCommandIds.push('x'); }, TypeError);
  assert.equal(Object.isFrozen(view.phase), true);
});

test('the caller’s payload object is not retained, so later mutation of it changes nothing', () => {
  const store = createPublicSnapshotStore({ matchId });
  const payload = structuredClone(before.public);
  store.accept(payload);
  payload.seats[0].health = 'Eliminated';
  payload.round = 5;
  assert.equal(store.current().seats[0].health, 'Healthy');
  assert.equal(store.current().round, 2);
});

test('both fixture variants are indistinguishable to every store', () => {
  const guarded = createOfficerFixture('protected');
  const open = createOfficerFixture('unprotected');
  for (const stage of ['before', 'afterRegistration']) {
    assert.deepEqual(createPublicSnapshotStore({ matchId }).accept(guarded[stage].public), createPublicSnapshotStore({ matchId }).accept(open[stage].public));
    for (const seat of ['officer', 'target']) {
      assert.deepEqual(createPlayerSnapshotStore({ matchId }).accept(guarded[stage][seat]), createPlayerSnapshotStore({ matchId }).accept(open[stage][seat]));
    }
  }
});
