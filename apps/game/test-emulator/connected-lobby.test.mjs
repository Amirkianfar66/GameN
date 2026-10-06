import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedPlayerStore, createConnectedPublicStore, readAdmission, readHostSession, readLobby } from '@mothership/game';
import { participant, requestId } from './support/match.mjs';
import { until } from './support/rest-transport.mjs';

// EMULATOR-CONNECTED. The Frontend client core against the real local Auth, Firestore and
// Functions emulators: real identities, real Security Rules, the real protocol-2 service.
//
// What it is not: a browser, a listener (the test transport polls), a deployed project, or
// a full match. Run with `npm run test:emulator --workspace @mothership/game`; it is not
// part of `npm run verify`, which needs neither Java nor the emulators.

const SEVEN_PLAYER_ROLES = ['Alien', 'Blue Disabler', 'Cracker', 'Hacker', 'Insider', 'Supplier', 'Undercover'];
/** The next value a document listener delivers for which `test` holds. */
const document = (who, target, read, check, label) => until(
  deliver => who.transport.listenDocument(target, { onSnapshot: snapshot => deliver(read(snapshot.value)), onError: () => deliver({ kind: 'error' }) }),
  outcome => outcome.kind === 'accepted' && check(outcome.value ?? outcome.view),
  label,
);

test('connected: a host creates a seven-player lobby, seats seven players, admits a display and starts; each audience then reads only its own view; a move gets a real receipt', async t => {
  const host = await participant();
  const display = await participant();
  const players = await Promise.all(Array.from({ length: 7 }, () => participant()));
  const everyone = [host, display, ...players];
  t.after(() => everyone.forEach(who => who.close()));

  // 1. The host creates the lobby. The same request again is the same lobby, not a second one.
  const create = { protocolVersion: 2, requestId: requestId(), playerCount: 7 };
  const created = await host.api.createMatch(create);
  assert.equal(created.kind, 'done', JSON.stringify(created));
  const { matchId, roomCode } = created.result;
  assert.deepEqual((await host.api.createMatch(create)).result, created.result);
  const session = await document(host, { kind: 'session', matchId }, readHostSession, () => true, 'the host’s session document');
  assert.deepEqual(session.value, { hostUid: host.uid, playerCount: 7, status: 'lobby', roomCode });

  // 2. Seven players authenticate and ask to be admitted. Asking grants nothing yet.
  const requested = await Promise.all(players.map((player, index) => player.api.requestAdmission({
    protocolVersion: 2, requestId: requestId(), roomCode, initialRoom: index % 2 === 0 ? 'Room A' : 'Room B',
  })));
  for (const [index, request] of requested.entries()) {
    assert.equal(request.kind, 'done', JSON.stringify(request));
    assert.equal(request.result.matchId, matchId);
    const own = await document(players[index], { kind: 'admission', matchId, admissionId: request.result.admissionId }, readAdmission, () => true, 'own pending admission');
    assert.deepEqual([own.value.uid, own.value.status], [players[index].uid, 'pending']);
    assert.equal(await players[index].rawStatus(`matches/${matchId}/lobby/public`), 403, 'A pending requester cannot read the lobby');
  }
  // A wrong room code admits nobody and says nothing about why.
  const stranger = await participant();
  everyone.push(stranger);
  const refused = await stranger.api.requestAdmission({ protocolVersion: 2, requestId: requestId(), roomCode: '0'.repeat(12), initialRoom: 'Room A' });
  assert.deepEqual([refused.kind, refused.code], ['api-failure', 'FORBIDDEN']);

  // 3. The host sees every request, approves each to a seat, admits the display, and starts.
  const pending = await until(
    deliver => host.transport.listenCollection({ kind: 'admissions', matchId }, { onSnapshot: snapshot => deliver(snapshot.value), onError: () => deliver([]) }),
    items => items.length === 7, 'seven admission requests in the host’s list',
  );
  const byUid = new Map(pending.map(item => {
    const admission = readAdmission(item.data);
    assert.equal(admission.kind, 'accepted', `The host's admission list is readable: ${JSON.stringify(item.data)}`);
    return [admission.value.uid, item.id];
  }));
  const seatOf = new Map();
  for (const [index, player] of players.entries()) {
    const seatId = `seat-${index + 1}`;
    const approved = await host.api.approveAdmission({ protocolVersion: 2, matchId, requestId: requestId(), admissionId: byUid.get(player.uid), seatId });
    assert.deepEqual([approved.kind, approved.result?.seatId], ['done', seatId], JSON.stringify(approved));
    seatOf.set(player, seatId);
  }
  // A player cannot approve, admit or start: host capability comes from the verified identity alone.
  const notHost = await players[0].api.startMatch({ protocolVersion: 2, matchId, requestId: requestId() });
  assert.deepEqual([notHost.kind, notHost.code], ['api-failure', 'FORBIDDEN']);
  assert.equal((await host.api.admitDisplay({ protocolVersion: 2, matchId, requestId: requestId(), displayUid: display.uid })).kind, 'done');

  // Each player learns its seat from its own admission, and can now read the lobby.
  for (const [index, player] of players.entries()) {
    const own = await document(player, { kind: 'admission', matchId, admissionId: requested[index].result.admissionId }, readAdmission, admission => admission.status === 'approved', 'own approved admission');
    assert.equal(own.value.seatId, seatOf.get(player));
  }
  const lobby = await document(players[3], { kind: 'lobby', matchId }, payload => readLobby(payload, matchId), value => value.seats.length === 7, 'a full lobby');
  assert.deepEqual([lobby.value.status, lobby.value.playerCount, lobby.value.seats.map(seat => seat.seatId)], ['lobby', 7, [1, 2, 3, 4, 5, 6, 7].map(n => `seat-${n}`)]);

  const start = { protocolVersion: 2, matchId, requestId: requestId() };
  assert.equal((await host.api.startMatch(start)).kind, 'done');
  assert.equal((await host.api.startMatch(start)).kind, 'done', 'Starting again with the same request deals nothing new');

  // 4. The shared display receives public information only.
  const publicStore = createConnectedPublicStore({ matchId });
  const shown = await document(display, { kind: 'public-view', matchId }, payload => publicStore.accept(payload), () => true, 'the public view');
  const publicView = shown.view;
  assert.deepEqual([publicView.playerCount, publicView.round, publicView.phase.kind, publicView.seats.length], [7, 1, 'ORDINARY_TURN', 7]);
  assert.equal(publicView.phase.endsAt - publicView.phase.startedAt, 60_000);
  assert.deepEqual([publicView.result, publicView.endReveal], [null, null]);
  assert.doesNotMatch(JSON.stringify(publicView), /"role"|"self"|"knowledge"|"legalTargets"|"code"/);
  assert.equal(await display.rawStatus(`matches/${matchId}/playerViews/${players[0].uid}`), 403, 'The display cannot read a private view');
  assert.equal(await display.rawStatus(`matches/${matchId}/control/session`), 403, 'nor the host’s session');
  assert.equal(await display.rawStatus(`matches/${matchId}/engine/current`), 403, 'nor anything server-only');

  // 5. Each player receives its own authorized private view and no one else's.
  const views = new Map();
  for (const player of players) {
    const store = createConnectedPlayerStore({ matchId, seatId: seatOf.get(player) });
    const own = await document(player, { kind: 'player-view', matchId }, payload => store.accept(payload), () => true, 'own private view');
    assert.deepEqual([own.view.audience.seatId, own.view.self.seatId], [seatOf.get(player), seatOf.get(player)]);
    views.set(player, own.view);
  }
  assert.deepEqual([...views.values()].map(view => view.self.role).sort(), SEVEN_PLAYER_ROLES, 'Seven players, the seven-player roster, each role once');
  assert.equal(await players[0].rawStatus(`matches/${matchId}/playerViews/${players[1].uid}`), 403, 'A player cannot read another player’s view');
  // The same public facts in every audience's own view.
  for (const view of views.values()) assert.deepEqual([view.round, view.phase.id, view.activeSeatId, view.seats], [publicView.round, publicView.phase.id, publicView.activeSeatId, publicView.seats]);
  // In a seven-player match no ordinary shot is open in round 1 (adoption assessment, G5).
  for (const view of views.values()) assert.deepEqual([view.self.shotAvailable, view.legalTargets.REGISTER_SHOT], [false, undefined]);

  // 6. A legal movement, taken from the server's own list of destinations.
  const mover = players.find(player => views.get(player).self.movementDestinations.length > 0);
  assert.notEqual(mover, undefined, 'Somebody may move');
  const before = views.get(mover);
  const destination = before.self.movementDestinations[0];
  const move = { protocolVersion: 2, matchId, phaseId: before.phase.id, commandId: requestId(), command: { type: 'MOVE', destination } };

  // A display has no seat and cannot send a command.
  const fromDisplay = await display.api.command(move);
  assert.deepEqual([fromDisplay.kind, fromDisplay.code], ['api-failure', 'FORBIDDEN']);

  // 7. A real receipt, the same receipt on an identical retry, and the same one by lookup.
  const accepted = await mover.api.command(move);
  assert.deepEqual([accepted.kind, accepted.receipt?.status, accepted.receipt?.code], ['receipt', 'accepted', 'REGISTERED'], JSON.stringify(accepted));
  assert.deepEqual((await mover.api.command(move)).receipt, accepted.receipt);
  const found = await mover.api.receipt({ protocolVersion: 2, matchId, commandId: move.commandId });
  assert.deepEqual([found.kind, found.receipt], ['found', accepted.receipt]);
  // The same identifier with another payload is a conflict and leaves the original alone.
  const conflict = await mover.api.command({ ...move, command: { type: 'MOVE', destination: before.seats.find(seat => seat.seatId === before.self.seatId).location } });
  assert.deepEqual([conflict.kind, conflict.code], ['api-failure', 'COMMAND_ID_CONFLICT']);
  // Another player's lookup of that identifier finds nothing: receipts are per seat.
  const other = players.find(player => player !== mover);
  assert.equal((await other.api.receipt({ protocolVersion: 2, matchId, commandId: move.commandId })).kind, 'unknown');

  // The move is in the authoritative views: public, and the mover's own.
  const moverSeat = seatOf.get(mover);
  const publicAfter = await document(display, { kind: 'public-view', matchId }, payload => publicStore.accept(payload), view => view.seats.find(seat => seat.seatId === moverSeat).location === destination, 'the public view after the move');
  assert.equal(publicAfter.view.viewRevision > publicView.viewRevision, true);
  const ownStore = createConnectedPlayerStore({ matchId, seatId: moverSeat });
  const ownAfter = await document(mover, { kind: 'player-view', matchId }, payload => ownStore.accept(payload), view => view.seats.find(seat => seat.seatId === moverSeat).location === destination, 'the mover’s own view after the move');
  assert.deepEqual(ownAfter.view.self.movementDestinations, [], 'One movement per round');
  assert.deepEqual(ownAfter.view.ownPendingCommandIds, [], 'A move takes effect at once; it is not a queued command');

  // A second move in the same round is a durable rejection, not an error.
  const again = { ...move, commandId: requestId(), command: { type: 'MOVE', destination: before.seats.find(seat => seat.seatId === moverSeat).location } };
  const rejected = await mover.api.command(again);
  assert.deepEqual([rejected.kind, rejected.receipt?.status, rejected.receipt?.code], ['receipt', 'rejected', 'NOT_ALLOWED']);
  assert.deepEqual((await mover.api.receipt({ protocolVersion: 2, matchId, commandId: again.commandId })).receipt, rejected.receipt);

  // Trusted time and deadline catch-up, as an admitted display.
  const time = await display.api.serverTime(matchId);
  assert.equal(time.kind, 'time');
  assert.equal(time.sample.serverTimeMs >= publicView.phase.startedAt && time.sample.serverTimeMs < publicView.phase.endsAt, true, 'Server time is inside the first phase');
  assert.equal((await display.api.advance(matchId, publicView.phase.id)).kind, 'unchanged', 'An unexpired phase cannot be advanced');
  assert.deepEqual((({ kind, code }) => [kind, code])(await stranger.api.serverTime(matchId)), ['api-failure', 'FORBIDDEN'], 'Someone who was never admitted gets no time either');
});
