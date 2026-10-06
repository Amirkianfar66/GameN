import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedPlayerStore, readHostSession, readLobby } from '@mothership/game';
import { buildConnectedPlayerShellModel, buildTableShellModel, RoleSchema } from './support/presentation.mjs';
import { nextView, participant, requestId, startedMatch } from './support/match.mjs';
import { until } from './support/rest-transport.mjs';

// EMULATOR-CONNECTED. Two things that happen to a whole match or a whole seat, against the
// real local Auth, Firestore and Functions emulators: the host ends the match, and a seat is
// moved to another identity with a one-time code. Everything goes through the documented
// operations and the Security Rules. The test transport polls where a browser listens.

const environment = { mode: 'emulator', connection: 'live', problem: null, deadline: { kind: 'none' }, motion: { reducedMotion: false, followsDevice: true } };
const ROLES = new RegExp(`\\b(${RoleSchema.options.join('|')})\\b`);
const body = (who, matchId, extra = {}) => ({ protocolVersion: 2, matchId, requestId: requestId(), ...extra });
/** Waits for a document listener to end, and says why the transport said it did. */
const refusal = (who, target, timeoutMs = 8_000) => until(
  deliver => who.transport.listenDocument(target, { onSnapshot: () => {}, onError: reason => deliver({ reason }) }),
  outcome => outcome.reason !== undefined, 'the listener to end', timeoutMs,
).then(outcome => outcome.reason);

test('connected: the host ends a match; every audience’s view says so and reveals nothing; nobody else can end it, and it cannot be ended twice', async t => {
  const { host, display, players, matchId } = await startedMatch(t);
  const [first] = players;

  // Only the host may end the match.
  const byPlayer = await first.api.abortMatch(body(first, matchId));
  assert.deepEqual([byPlayer.kind, byPlayer.code], ['api-failure', 'FORBIDDEN']);
  const byDisplay = await display.api.abortMatch(body(display, matchId));
  assert.deepEqual([byDisplay.kind, byDisplay.code], ['api-failure', 'FORBIDDEN']);
  assert.equal((await nextView(display, { kind: 'public-view', matchId }, display.store)).phase.kind, 'ORDINARY_TURN', 'The match goes on');

  const ended = await host.api.abortMatch(body(host, matchId));
  assert.deepEqual([ended.kind, ended.result], ['done', true]);

  // The public view: ended by the host, no deadline, no winner, nothing revealed.
  const publicView = await nextView(display, { kind: 'public-view', matchId }, display.store, view => view.phase.kind === 'ABORTED', 'the public view of the ended match');
  assert.deepEqual([publicView.phase.endsAt, publicView.result, publicView.endReveal, publicView.activeSeatId], [null, null, null, null]);
  assert.equal(publicView.seats.every(seat => seat.revealedFaction === null), true);
  const table = buildTableShellModel({ ...environment, view: publicView });
  assert.deepEqual(table.match.result, { heading: 'Result', outcome: 'The host ended this match. There is no winner.', lines: [], reveal: null });
  assert.deepEqual([table.match.phase.phaseLabel, table.match.phase.timer.state], ['Match ended by the host', 'none']);
  assert.doesNotMatch(JSON.stringify(table), ROLES, 'The shared display names no role');

  // Every player's own view: the same end, and nothing left that could be done.
  for (const player of players) {
    const view = await nextView(player, { kind: 'player-view', matchId }, player.store, candidate => candidate.phase.kind === 'ABORTED', `${player.seatId}'s view of the ended match`);
    assert.deepEqual([view.result, view.endReveal, view.legalTargets, view.self.movementDestinations], [null, null, {}, []], player.seatId);
    assert.equal(view.self.role, player.view.self.role, 'A seat keeps knowing its own role');
    const phone = buildConnectedPlayerShellModel({ ...environment, view, privacy: { concealed: false, revealed: true }, action: { step: 'idle' } });
    assert.deepEqual([phone.match.result.outcome, phone.match.privateArea.content.actions.notice], ['The host ended this match. There is no winner.', 'The match is over.']);
    assert.equal(phone.match.privateArea.content.actions.card.body.offers.every(offer => offer.open === null), true);
  }

  // A command sent now is answered with a receipt that rejects it; the client does not guess.
  const late = await first.api.command({ protocolVersion: 2, matchId, phaseId: publicView.phase.id, commandId: requestId(), command: { type: 'MOVE', destination: 'Room B' } });
  assert.deepEqual([late.kind, late.receipt?.status, late.receipt?.code], ['receipt', 'rejected', 'PHASE_CLOSED']);

  // What the host reads says so too, and the match cannot be ended again or started.
  const session = await until(
    deliver => host.transport.listenDocument({ kind: 'session', matchId }, { onSnapshot: snapshot => deliver(readHostSession(snapshot.value)), onError: () => {} }),
    read => read.kind === 'accepted' && read.value.status === 'aborted', 'the host’s session document',
  );
  assert.equal(session.value.status, 'aborted');
  const lobby = await until(
    deliver => display.transport.listenDocument({ kind: 'lobby', matchId }, { onSnapshot: snapshot => deliver(readLobby(snapshot.value, matchId)), onError: () => {} }),
    read => read.kind === 'accepted' && read.value.status === 'aborted', 'the lobby',
  );
  assert.equal(lobby.value.seats.length, 7);
  const again = await host.api.abortMatch(body(host, matchId));
  assert.deepEqual([again.kind, again.code], ['api-failure', 'FORBIDDEN']);
  const restart = await host.api.startMatch(body(host, matchId));
  assert.equal(restart.kind, 'api-failure');
});

test('connected: a seat is moved with a one-time code; the new identity has the seat as it stood, and the old one is refused', async t => {
  const { host, display, players, matchId } = await startedMatch(t);
  const old = players[6];
  const before = old.view;
  const publicBefore = await nextView(display, { kind: 'public-view', matchId }, display.store);

  // Only the host may ask for a code, and only for a seat that is taken.
  const byPlayer = await players[0].api.issueSeatRecovery(body(players[0], matchId, { seatId: old.seatId }));
  assert.deepEqual([byPlayer.kind, byPlayer.code], ['api-failure', 'FORBIDDEN']);
  const vacant = await host.api.issueSeatRecovery(body(host, matchId, { seatId: 'seat-9' }));
  assert.deepEqual([vacant.kind, vacant.code], ['api-failure', 'FORBIDDEN']);

  const request = body(host, matchId, { seatId: old.seatId });
  const issued = await host.api.issueSeatRecovery(request);
  assert.equal(issued.kind, 'done', JSON.stringify(issued));
  const { recoveryToken, expiresAt } = issued.result;
  assert.match(recoveryToken, /^[A-Za-z0-9_-]{43}$/);
  const validForMs = expiresAt - issued.sample.serverTimeMs;
  assert.equal(validForMs > 0 && validForMs <= 600_000, true, `The server names when the code ends: ${validForMs} ms from its own time`);
  // The service gives a code out once: the same request again is answered without it.
  const replayed = await host.api.issueSeatRecovery(request);
  assert.deepEqual([replayed.kind, replayed.result], ['done', { seatId: old.seatId, recoveryToken: null, expiresAt }]);

  // Issuing changes nothing by itself: the seat's own identity still reads its view.
  assert.equal(await old.rawStatus(`matches/${matchId}/playerViews/${old.uid}`), 200);

  // Something that is not the code opens nothing.
  const newcomer = await participant();
  const third = await participant();
  t.after(() => [newcomer, third].forEach(who => who.close()));
  const wrong = await newcomer.api.redeemSeatRecovery(body(newcomer, matchId, { recoveryToken: `${recoveryToken.slice(0, 42)}${recoveryToken.endsWith('A') ? 'B' : 'A'}` }));
  assert.deepEqual([wrong.kind, wrong.code], ['api-failure', 'FORBIDDEN']);
  // A player already in the match cannot take a second seat with it.
  const greedy = await players[0].api.redeemSeatRecovery(body(players[0], matchId, { recoveryToken }));
  assert.deepEqual([greedy.kind, greedy.code], ['api-failure', 'FORBIDDEN']);

  // The newcomer redeems it and is the seat.
  const recovered = await newcomer.api.redeemSeatRecovery(body(newcomer, matchId, { recoveryToken }));
  assert.deepEqual([recovered.kind, recovered.result], ['done', { seatId: old.seatId }]);
  const store = createConnectedPlayerStore({ matchId, seatId: old.seatId });
  const taken = await nextView(newcomer, { kind: 'player-view', matchId }, store, () => true, 'the seat’s view, for its new identity');
  // Nothing is dealt again and nothing is reset: the role, what the seat knows and what it holds are what they were.
  assert.deepEqual([taken.self, taken.knowledge, taken.audience], [before.self, before.knowledge, before.audience]);

  // The old identity is refused, by the rules, and what it sends is refused by the service.
  assert.equal(await refusal(old, { kind: 'player-view', matchId }), 'refused');
  assert.equal(await old.rawStatus(`matches/${matchId}/playerViews/${old.uid}`), 403);
  assert.equal(await old.rawStatus(`matches/${matchId}/playerViews/${newcomer.uid}`), 403, 'and it cannot read the seat under its new identity either');
  assert.equal(await refusal(old, { kind: 'lobby', matchId }), 'refused');
  const stale = await old.api.command({ protocolVersion: 2, matchId, phaseId: taken.phase.id, commandId: requestId(), command: { type: 'MOVE', destination: 'Room B' } });
  assert.deepEqual([stale.kind, stale.code], ['api-failure', 'FORBIDDEN']);

  // The code is spent, for anyone.
  const reused = await third.api.redeemSeatRecovery(body(third, matchId, { recoveryToken }));
  assert.deepEqual([reused.kind, reused.code], ['api-failure', 'FORBIDDEN']);
  assert.equal(await third.rawStatus(`matches/${matchId}/playerViews/${third.uid}`), 403);

  // Nothing public changed, and the other seats are untouched.
  const publicAfter = await nextView(display, { kind: 'public-view', matchId }, display.store);
  assert.deepEqual(publicAfter.seats, publicBefore.seats);
  assert.equal(await players[0].rawStatus(`matches/${matchId}/playerViews/${players[0].uid}`), 200);

  // The new identity plays the seat: a real receipt for a move the server offers it, if it offers one now.
  if (taken.self.movementDestinations.length > 0) {
    const [destination] = taken.self.movementDestinations;
    const moved = await newcomer.api.command({ protocolVersion: 2, matchId, phaseId: taken.phase.id, commandId: requestId(), command: { type: 'MOVE', destination } });
    assert.deepEqual([moved.kind, moved.receipt?.status], ['receipt', 'accepted']);
    const shown = await nextView(display, { kind: 'public-view', matchId }, display.store, view => view.seats.find(seat => seat.seatId === old.seatId).location === destination, 'the move on the public view');
    assert.equal(shown.seats.find(seat => seat.seatId === old.seatId).location, destination);
  }
});
