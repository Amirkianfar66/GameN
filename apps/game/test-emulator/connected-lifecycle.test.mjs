import assert from 'node:assert/strict';
import test from 'node:test';
import { readHostSession, readLobby } from '@mothership/game';
import { buildConnectedPlayerShellModel, buildTableShellModel, RoleSchema } from './support/presentation.mjs';
import { nextView, requestId, startedMatch } from './support/match.mjs';
import { until } from './support/rest-transport.mjs';

// EMULATOR-CONNECTED. Something that happens to a whole match, against the real local Auth,
// Firestore and Functions emulators: the host ends it. Everything goes through the
// documented operations and the Security Rules. The test transport polls where a browser
// listens.

const environment = { mode: 'emulator', connection: 'live', problem: null, deadline: { kind: 'none' }, motion: { reducedMotion: false, followsDevice: true } };
const ROLES = new RegExp(`\\b(${RoleSchema.options.join('|')})\\b`);
const body = (who, matchId, extra = {}) => ({ protocolVersion: 2, matchId, requestId: requestId(), ...extra });

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
