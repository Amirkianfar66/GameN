// Brings a real match up on the local emulators through the client core, for tests that
// need one already running. Test-only.
import assert from 'node:assert/strict';
import { createConnectedApi, createConnectedPlayerStore, createConnectedPublicStore, readAdmission } from '@mothership/game';
import { createRestEmulatorTransport, realPorts, until } from './rest-transport.mjs';

export const ports = realPorts();
export const requestId = () => ports.ids.next();

/** One signed-in participant: its own identity, transport and API client. */
export async function participant() {
  const rest = createRestEmulatorTransport();
  const uid = await rest.transport.signIn();
  return { ...rest, uid, api: createConnectedApi(rest.transport, ports) };
}

/** The next view a document listener delivers that the store accepts and for which `check` holds. */
export function nextView(who, target, store, check = () => true, label = 'a view', timeoutMs = 8_000) {
  return until(
    deliver => who.transport.listenDocument(target, { onSnapshot: snapshot => deliver(store.accept(snapshot.value)), onError: () => deliver({ kind: 'error' }) }),
    outcome => (outcome.kind === 'accepted' || outcome.kind === 'unchanged') && check(outcome.view),
    label, timeoutMs,
  ).then(outcome => outcome.view);
}

/**
 * A started match: a host, a display and `playerCount` seated players, each with the view
 * it is entitled to. Everything goes through the documented operations.
 */
export async function startedMatch(t, playerCount = 7) {
  const host = await participant();
  const display = await participant();
  const players = await Promise.all(Array.from({ length: playerCount }, () => participant()));
  t.after(() => [host, display, ...players].forEach(who => who.close()));

  const created = await host.api.createMatch({ protocolVersion: 2, requestId: requestId(), playerCount });
  assert.equal(created.kind, 'done', JSON.stringify(created));
  const { matchId, roomCode } = created.result;
  const requested = await Promise.all(players.map((player, index) => player.api.requestAdmission({
    protocolVersion: 2, requestId: requestId(), roomCode, initialRoom: index % 2 === 0 ? 'Room A' : 'Room B',
  })));
  const admissions = await until(
    deliver => host.transport.listenCollection({ kind: 'admissions', matchId }, { onSnapshot: snapshot => deliver(snapshot.value), onError: () => deliver([]) }),
    items => items.length === playerCount, 'every admission request',
  );
  const byUid = new Map(admissions.map(item => [readAdmission(item.data).value.uid, item.id]));
  for (const [index, player] of players.entries()) {
    player.seatId = `seat-${index + 1}`;
    assert.equal(requested[index].kind, 'done');
    const approved = await host.api.approveAdmission({ protocolVersion: 2, matchId, requestId: requestId(), admissionId: byUid.get(player.uid), seatId: player.seatId });
    assert.equal(approved.kind, 'done', JSON.stringify(approved));
  }
  assert.equal((await host.api.admitDisplay({ protocolVersion: 2, matchId, requestId: requestId(), displayUid: display.uid })).kind, 'done');
  assert.equal((await host.api.startMatch({ protocolVersion: 2, matchId, requestId: requestId() })).kind, 'done');

  display.store = createConnectedPublicStore({ matchId });
  const publicView = await nextView(display, { kind: 'public-view', matchId }, display.store, () => true, 'the public view');
  for (const player of players) {
    player.store = createConnectedPlayerStore({ matchId, seatId: player.seatId });
    player.view = await nextView(player, { kind: 'player-view', matchId }, player.store, () => true, 'a private view');
  }
  return { host, display, players, matchId, publicView };
}
