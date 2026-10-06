import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionPath, createConnectedApi, createConnectedPlayerSession, createConnectedPlayerStore, createConnectedPublicStore, documentPath, readAdmission,
  readHostSession, readLobby, SUPPORTED_CONNECTED_VERSIONS,
} from '@mothership/game';
import { createFakeHost } from './support/fakes.mjs';
import { createSessionFrom } from '../dist/session/audience-session.js';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createFakeConnectedTransport, EPOCH, lobbyView, MATCH, playerView, publicView } from './support/connected.mjs';

// Protocol-2 documents entering client state. Synthetic, hand-built data: this shows what
// the client believes and refuses, and nothing about what a backend sends.

const unreadable = { kind: 'rejected', rejection: { kind: 'unreadable' } };

test('the connected client displays wire protocol 2 and nothing else', () => {
  assert.deepEqual(SUPPORTED_CONNECTED_VERSIONS, [2]);
  const store = createConnectedPublicStore({ matchId: MATCH });
  // A protocol-1 view, valid for its own protocol, is recognized as another protocol, not as corrupt.
  const fixture = createOfficerFixture('protected').before.public;
  assert.deepEqual(store.accept(fixture), { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 1 } });
  assert.deepEqual(store.accept({ ...publicView(), versions: { ...publicView().versions, protocolVersion: 3 } }), { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 3 } });
  assert.equal(store.current(), null);
});

test('a public store holds a public view of its own match and never a player’s', () => {
  const store = createConnectedPublicStore({ matchId: MATCH });
  const view = publicView();
  assert.deepEqual(store.accept(view), { kind: 'accepted', view });
  assert.deepEqual(store.accept(playerView()), unreadable);
  assert.deepEqual(store.accept({ ...view, matchId: 'another-match', viewRevision: 9 }), { kind: 'rejected', rejection: { kind: 'wrong-match' } });
  assert.equal(JSON.stringify(store.current()).includes('role'), false);
  // Seven, eight and nine players are all valid rosters.
  for (const count of [8, 9]) assert.equal(createConnectedPublicStore({ matchId: MATCH }).accept(publicView(() => {}, count)).kind, 'accepted');
});

test('a player store holds only the approved seat’s own view, and that seat keeps its role', () => {
  const store = createConnectedPlayerStore({ matchId: MATCH, seatId: 'seat-1' });
  assert.deepEqual(store.accept(playerView('seat-2')), unreadable, 'Another seat’s view is not this store’s to hold');
  assert.deepEqual(store.accept(publicView()), unreadable);
  const own = playerView('seat-1');
  assert.deepEqual(store.accept(own), { kind: 'accepted', view: own });
  const otherRole = playerView('seat-1', view => { view.viewRevision += 1; view.self.role = 'Supplier'; });
  assert.deepEqual(store.accept(otherRole), { kind: 'rejected', rejection: { kind: 'identity-changed' } });
  assert.equal(store.current().self.role, 'Cracker');
});

test('revisions only move forward: a repeat proves freshness, a conflict is refused, and a lower one is dropped unless the server itself confirmed it', () => {
  const store = createConnectedPlayerStore({ matchId: MATCH, seatId: 'seat-1' });
  const first = playerView();
  store.accept(first);
  assert.deepEqual(store.accept(structuredClone(first)), { kind: 'unchanged', view: first });
  // A lower revision that may be a cached copy or a replay proves nothing and changes nothing.
  const lower = playerView('seat-1', view => { view.viewRevision -= 1; });
  assert.deepEqual(store.accept(lower), { kind: 'ignored-stale' });
  assert.deepEqual(store.accept(lower, { confirmed: false }), { kind: 'ignored-stale' });
  assert.deepEqual(store.current(), first);
  // The same one confirmed by the server: the match went backwards under this client.
  assert.deepEqual(store.accept(lower, { confirmed: true }), { kind: 'rejected', rejection: { kind: 'revision-regressed' } });
  assert.deepEqual(store.current(), first, 'It is not taken for the current view');
  const table = createConnectedPublicStore({ matchId: MATCH });
  table.accept(publicView());
  assert.deepEqual(table.accept(publicView(view => { view.viewRevision -= 1; }), { confirmed: true }), { kind: 'rejected', rejection: { kind: 'revision-regressed' } });
  assert.deepEqual(store.accept(playerView('seat-1', view => { view.round = 2; })), { kind: 'rejected', rejection: { kind: 'revision-conflict' } });
  const next = playerView('seat-1', view => { view.viewRevision += 1; view.self.movementDestinations = []; });
  assert.deepEqual(store.accept(next), { kind: 'accepted', view: next });
});

test('a field the contract does not list never enters client state', () => {
  const store = createConnectedPlayerStore({ matchId: MATCH, seatId: 'seat-1' });
  for (const extra of [{ targetSeatId: 'seat-2' }, { protection: true }, { engine: {} }]) {
    assert.deepEqual(store.accept({ ...playerView(), ...extra }), unreadable);
  }
  assert.deepEqual(store.accept({ ...playerView(), self: { ...playerView().self, faction: 'Blue' } }), unreadable);
  for (const garbage of [null, undefined, 0, 'view', [], {}]) assert.deepEqual(store.accept(garbage), unreadable);
});

test('the lobby is read strictly and pinned to the match asked for', () => {
  const lobby = lobbyView();
  assert.deepEqual(readLobby(lobby, MATCH), { kind: 'accepted', value: lobby });
  assert.deepEqual(readLobby(null, MATCH), { kind: 'missing' });
  assert.deepEqual(readLobby(lobby, 'another-match'), { kind: 'rejected', rejection: { kind: 'wrong-match' } });
  assert.deepEqual(readLobby({ ...lobby, protocolVersion: 1 }, MATCH), { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 1 } });
  assert.deepEqual(readLobby({ ...lobby, hostUid: 'someone' }, MATCH), unreadable);
  assert.deepEqual(readLobby({ ...lobby, seats: [{ seatId: 'seat-1', initialRoom: 'Command Room' }] }, MATCH), unreadable);
  for (const garbage of [undefined, 0, 'lobby', []]) assert.deepEqual(readLobby(garbage, MATCH), unreadable);
});

test('a store can let go of the view it holds, and still takes nothing that belongs to another seat or match', () => {
  const store = createConnectedPlayerStore({ matchId: MATCH, seatId: 'seat-1' });
  const held = store.accept(playerView('seat-1'), { confirmed: true });
  assert.equal(held.kind, 'accepted');
  assert.equal(store.current().self.role, 'Cracker');
  store.forget();
  assert.equal(store.current(), null, 'Nothing private is left in the store');
  store.forget();
  // What it was pinned to is kept: another role in the same seat is still not this seat's view.
  assert.deepEqual(store.accept(playerView('seat-1', view => { view.self.role = 'Supplier'; view.self.rescuesRemaining = 0; }), { confirmed: true }).rejection, { kind: 'identity-changed' });
  assert.equal(store.current(), null);
  // The seat's own view is readable again if it ever arrives, at whatever revision.
  assert.equal(store.accept(playerView('seat-1', view => { view.viewRevision = 1; }), { confirmed: true }).kind, 'accepted');
});

test('a refused session tells its store to let go of the view, so nothing private is left behind it', async () => {
  const host = createFakeHost({ serverStart: EPOCH });
  const real = createConnectedPlayerStore({ matchId: MATCH, seatId: 'seat-1' });
  let forgotten = 0;
  const store = { accept: (...parameters) => real.accept(...parameters), current: () => real.current(), forget() { forgotten += 1; real.forget(); } };
  let feed = null;
  const session = createSessionFrom({
    mode: 'emulator', store, ports: host.ports,
    feed: { subscribe(listener) { feed = listener; return () => {}; } },
    time: { serverTime: async () => ({ kind: 'no-response' }), cancelPending() {} },
  });
  session.start();
  feed.onConnectionChange('connected');
  feed.onPayload(playerView('seat-1'), true);
  assert.deepEqual([session.getState().view.self.role, real.current().self.role, forgotten], ['Cracker', 'Cracker', 0]);
  feed.onRefused();
  assert.deepEqual([session.getState().view, real.current(), forgotten], [null, null, 1]);
  session.dispose();
});

test('a session the server refuses lets go of its view at once, for good, and says why', async () => {
  const host = createFakeHost({ serverStart: EPOCH });
  const fake = createFakeConnectedTransport(host);
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const api = createConnectedApi(fake.transport, host.ports);
  const session = createConnectedPlayerSession({ transport: fake.transport, api, matchId: MATCH, ports: host.ports, seatId: 'seat-1' });
  const OWN = { kind: 'player-view', matchId: MATCH };
  let notified = 0;
  session.subscribe(() => { notified += 1; });
  session.start();
  await fake.deliver(OWN, playerView('seat-1'));
  assert.deepEqual([session.getState().connection, session.getState().problem, session.getState().view.self.role], ['live', null, 'Cracker']);

  // A listener that fails without saying why is a lost connection: the view is kept, as stale.
  await fake.fail(OWN);
  assert.deepEqual([session.getState().connection, session.getState().problem, session.getState().view?.self.role], ['stale', null, 'Cracker']);
  session.reconnect();
  await fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 1; }));
  assert.equal(session.getState().connection, 'live');

  // Refused: the view is gone from the session's state in the same step.
  const before = notified;
  await fake.fail(OWN, 'refused');
  assert.deepEqual([session.getState().view, session.getState().problem, session.getState().connection], [null, 'no-access', 'connecting']);
  assert.equal(notified > before, true);
  // Nothing brings it back: not a later view, not asking again.
  await fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 5; }));
  session.reconnect();
  await fake.deliver(OWN, playerView('seat-1', view => { view.viewRevision += 6; }));
  assert.deepEqual([session.getState().view, session.getState().problem], [null, 'no-access']);
  session.dispose();
});

test('an admission is read as exactly the fields the service writes, and nothing more', () => {
  const pending = { uid: 'uid-A', initialRoom: 'Room A', requestedAt: 1_900_000_000_000, status: 'pending' };
  const approved = { ...pending, status: 'approved', seatId: 'seat-3' };
  assert.deepEqual(readAdmission(pending), { kind: 'accepted', value: pending });
  assert.deepEqual(readAdmission(approved), { kind: 'accepted', value: approved });
  assert.deepEqual(readAdmission(null), { kind: 'missing' });
  for (const bad of [
    { ...pending, seatId: 'seat-3' }, { ...approved, seatId: undefined }, { ...approved, seatId: 'seat-10' }, { ...pending, status: 'rejected' },
    { ...pending, initialRoom: 'Command Room' }, { ...pending, uid: 'has spaces' }, { ...pending, requestedAt: -1 }, { ...pending, role: 'Officer' },
    { uid: 'uid-A' }, [], 'admission', 7,
  ]) assert.deepEqual(readAdmission(bad), unreadable, JSON.stringify(bad));
});

test('a host’s session document is read as exactly the fields the service writes, and shows no engine state', () => {
  const session = { protocolVersion: 2, hostUid: 'host-uid', playerCount: 7, status: 'lobby', roomCode: 'A1B2C3D4E5F6', createdAt: 1_900_000_000_000 };
  assert.deepEqual(readHostSession(session), { kind: 'accepted', value: { hostUid: 'host-uid', playerCount: 7, status: 'lobby', roomCode: 'A1B2C3D4E5F6' } });
  assert.deepEqual(readHostSession(null), { kind: 'missing' });
  assert.deepEqual(readHostSession({ ...session, protocolVersion: 3 }), { kind: 'rejected', rejection: { kind: 'incompatible-protocol', receivedVersion: 3 } });
  for (const bad of [
    { ...session, playerCount: 6 }, { ...session, status: 'paused' }, { ...session, roomCode: 'short' }, { ...session, roomCode: 'a1b2c3d4e5f6' },
    { ...session, roles: {} }, { ...session, hostUid: '' }, { hostUid: 'host-uid' }, [], 'session',
  ]) assert.deepEqual(readHostSession(bad), unreadable, JSON.stringify(bad));
});

test('listener paths are the documented ones, built from checked identifiers only', () => {
  const uid = 'uid_A-1';
  assert.deepEqual(documentPath({ kind: 'lobby', matchId: MATCH }, uid), ['matches', MATCH, 'lobby', 'public']);
  assert.deepEqual(documentPath({ kind: 'public-view', matchId: MATCH }, uid), ['matches', MATCH, 'views', 'public']);
  assert.deepEqual(documentPath({ kind: 'player-view', matchId: MATCH }, uid), ['matches', MATCH, 'playerViews', uid]);
  assert.deepEqual(documentPath({ kind: 'session', matchId: MATCH }, uid), ['matches', MATCH, 'control', 'session']);
  assert.deepEqual(documentPath({ kind: 'admission', matchId: MATCH, admissionId: 'adm-1' }, uid), ['matches', MATCH, 'admissions', 'adm-1']);
  assert.deepEqual(collectionPath({ kind: 'admissions', matchId: MATCH }), ['matches', MATCH, 'admissions']);
  // A caller can only ever name its own private view, and cannot smuggle a path through an identifier.
  for (const matchId of ['a/b', '../x', '', 'a b']) assert.throws(() => documentPath({ kind: 'lobby', matchId }, uid), /match identifier/);
  assert.throws(() => documentPath({ kind: 'admission', matchId: MATCH, admissionId: 'a/b' }, uid), /admission identifier/);
  assert.throws(() => documentPath({ kind: 'player-view', matchId: MATCH }, 'uid/other'), /identity/);
  assert.throws(() => collectionPath({ kind: 'admissions', matchId: 'a/b' }), /match identifier/);
  // Server-only collections have no target kind at all.
  for (const kind of ['engine', 'receipts', 'seats', 'members', 'recovery', 'events', 'outbox']) assert.throws(() => documentPath({ kind, matchId: MATCH }, uid), /Not a documented listener path/);
});
