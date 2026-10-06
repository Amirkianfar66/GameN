import assert from 'node:assert/strict';
import test from 'node:test';
import { createActionFlow, DEFAULT_ACTION_FLOW_TIMING } from '@mothership/game';
import { nextView, ports, startedMatch } from './support/match.mjs';

// EMULATOR-CONNECTED. The protocol-2 command flow against the real local Auth, Firestore
// and Functions emulators: commands whose answer or request is lost, a page that is
// reloaded with only identifiers kept, and a real phase change at the server's deadline.
//
// "Lost" is arranged in the test's own API wrapper: the request really reaches the
// service, or really does not, and the client is told nothing. "Reload" makes a new flow
// over the one string the old one kept. The test transport polls where a browser listens,
// so listener reconnection is not what is exercised here.

const GUARD = DEFAULT_ACTION_FLOW_TIMING.controlGuardMs;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const NO_ANSWER = { kind: 'no-response', reason: 'transport-error' };

/** What a page keeps across a reload: at most one string, here in the test's memory. */
function keptStore() {
  const store = { value: null, ever: [], load: () => store.value, save(value) { store.value = value; store.ever.push(value); }, clear() { store.value = null; } };
  return store;
}

/** A player's flow over the real API, with a hook to lose answers or requests. */
function flowFor(player, matchId, kept, lose = {}) {
  const counts = { command: 0, receipt: 0 };
  const api = {
    async command(request) {
      counts.command += 1;
      if (lose.request?.()) return NO_ANSWER;
      const real = await player.api.command(request);
      return lose.answer?.() ? NO_ANSWER : real;
    },
    async receipt(request) {
      counts.receipt += 1;
      return player.api.receipt(request);
    },
  };
  const flow = createActionFlow({ api, ports: { ...ports, unresolved: kept }, matchId, seatId: player.seatId });
  const fresh = view => flow.observe({ view, current: true, inTime: true, panelOpen: true, foreground: true });
  const settled = (step, timeoutMs = 12_000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for step ${step}; at ${flow.getState().step}`)), timeoutMs);
    const check = () => {
      if (flow.getState().step !== step) return;
      clearTimeout(timer);
      stop();
      resolve(flow.getState());
    };
    const stop = flow.subscribe(check);
    check();
  });
  /** Chooses the first destination the server offers and confirms it once the control is active. */
  async function confirmMove(view) {
    fresh(view);
    const destination = view.self.movementDestinations[0];
    assert.equal(flow.open('move'), true);
    assert.equal(flow.choose({ kind: 'move', destination }), true);
    await sleep(GUARD + 30);
    assert.equal(flow.confirm(), true);
    return destination;
  }
  return { flow, counts, fresh, settled, confirmMove };
}
const once = () => { let left = 1; return () => left-- > 0; };
const locationOf = (view, seatId) => view.seats.find(seat => seat.seatId === seatId).location;
const commandCalls = player => player.requests.filter(request => request.operation === 'v1Command').length;

test('connected: an answer that is lost, a request that is lost, and a reload with the answer lost all end as one accepted move each', async t => {
  const { players, matchId, display } = await startedMatch(t);
  const [first, second, third] = players.filter(player => player.view.self.movementDestinations.length > 0);
  assert.notEqual(third, undefined, 'At least three players may move in the first phase');

  // The service decides the command and its answer never arrives.
  const lostAnswer = flowFor(first, matchId, keptStore(), { answer: once() });
  const firstDestination = await lostAnswer.confirmMove(first.view);
  assert.deepEqual((await lostAnswer.settled('accepted')).choice, { kind: 'move', destination: firstDestination });
  assert.deepEqual([lostAnswer.counts.command, commandCalls(first)], [1, 1], 'Settled by looking the receipt up; nothing was sent twice');
  assert.equal(lostAnswer.counts.receipt >= 1, true);

  // The request never reaches the service: no receipt exists, so the identical command goes again.
  const lostRequest = flowFor(second, matchId, keptStore(), { request: once() });
  const secondDestination = await lostRequest.confirmMove(second.view);
  await lostRequest.settled('accepted');
  assert.deepEqual([lostRequest.counts.command, commandCalls(second)], [2, 1], 'One attempt lost on the way, one that arrived');

  // The page is reloaded while its command is unaccounted for. Only identifiers were kept.
  const kept = keptStore();
  const beforeReload = flowFor(third, matchId, kept, { answer: once() });
  const thirdDestination = await beforeReload.confirmMove(third.view);
  await beforeReload.settled('checking');
  assert.deepEqual(Object.keys(JSON.parse(kept.value)).sort(), ['commandId', 'matchId', 'phaseId', 'seatId']);
  assert.doesNotMatch(kept.value, /Room|MOVE|move|destination/);
  beforeReload.flow.dispose();
  const sentBefore = commandCalls(third);
  const afterReload = flowFor(third, matchId, kept);
  assert.deepEqual(afterReload.flow.getState(), { step: 'checking', choice: null, recovered: true });
  afterReload.fresh(await nextView(third, { kind: 'player-view', matchId }, third.store, () => true, 'the reloaded page’s view'));
  assert.deepEqual(await afterReload.settled('accepted'), { step: 'accepted', choice: null, armed: false });
  assert.equal(commandCalls(third), sentBefore, 'The reloaded page asked and sent nothing');
  assert.equal(kept.value, null);

  // Each of the three moved exactly once, in the authoritative public view.
  const moved = await nextView(display, { kind: 'public-view', matchId }, display.store,
    view => [[first, firstDestination], [second, secondDestination], [third, thirdDestination]].every(([player, destination]) => locationOf(view, player.seatId) === destination), 'all three moves in the public view');
  assert.equal(moved.phase.id, first.view.phase.id, 'All within the first phase');
});

test('connected: the phase changes only when the server says so; a command lost before it is then known not to have been accepted', { timeout: 120_000 }, async t => {
  const { players, matchId, display, publicView } = await startedMatch(t);
  const mover = players.find(player => player.view.self.movementDestinations.length > 0);
  const firstPhase = publicView.phase.id;

  // The request is lost and the page is reloaded: nothing reached the service, and the page no longer has the payload.
  const kept = keptStore();
  const before = flowFor(mover, matchId, kept, { request: () => true });
  await before.confirmMove(mover.view);
  await before.settled('checking');
  before.flow.dispose();
  const reloaded = flowFor(mover, matchId, kept);
  reloaded.fresh(mover.view);
  // While its phase is open, "no receipt" settles nothing: the command stays pending and nothing new is offered.
  assert.equal((await reloaded.settled('unknown')).phaseOver, false);
  assert.equal(reloaded.flow.open('move'), false);
  await sleep(GUARD + 30);
  assert.equal(reloaded.flow.dismiss(), false);
  assert.equal(commandCalls(mover), 0, 'Nothing was ever sent for it');

  // Before the deadline the phase cannot be advanced, by anyone.
  assert.equal((await display.api.advance(matchId, firstPhase)).kind, 'unchanged');
  assert.equal((await mover.api.advance(matchId, firstPhase)).kind, 'unchanged');
  assert.equal(display.store.current().phase.id, firstPhase);

  // At the server's deadline, and not before, the phase changes. The client asks; the server decides.
  const time = await display.api.serverTime(matchId);
  const remaining = publicView.phase.endsAt - time.sample.serverTimeMs;
  assert.equal(remaining > 0 && remaining <= 60_000, true);
  await sleep(remaining + 400);
  const advanced = await display.api.advance(matchId, firstPhase);
  assert.equal(['advanced', 'unchanged'].includes(advanced.kind), true, 'Advanced by this request, or already by the server’s own deadline task');
  const nextPublic = await nextView(display, { kind: 'public-view', matchId }, display.store, view => view.phase.id !== firstPhase, 'the next phase in the public view', 15_000);
  assert.equal(nextPublic.phase.endsAt - nextPublic.phase.startedAt, 60_000, 'A new 60-second window, opened by the server');
  assert.equal(nextPublic.viewRevision > publicView.viewRevision, true);
  assert.equal((await display.api.advance(matchId, firstPhase)).kind, 'unchanged', 'The old phase cannot be advanced again');

  // The reloaded page sees a fresh view of the later phase, asks after it, and learns the command was not accepted.
  const later = await nextView(mover, { kind: 'player-view', matchId }, mover.store, view => view.phase.id !== firstPhase, 'the mover’s view of the next phase', 15_000);
  reloaded.fresh(later);
  assert.deepEqual(await reloaded.settled('not-accepted'), { step: 'not-accepted', choice: null, reason: 'PHASE_OVER', armed: false });
  assert.equal(kept.value, null);
  assert.equal(locationOf(later, mover.seatId), locationOf(mover.view, mover.seatId), 'And indeed it did not move');

  // A command for the closed phase that arrives now is a stored rejection, never an acceptance.
  const lateRequest = { protocolVersion: 2, matchId, phaseId: firstPhase, commandId: ports.ids.next(), command: { type: 'MOVE', destination: mover.view.self.movementDestinations[0] } };
  const late = await mover.api.command(lateRequest);
  assert.deepEqual([late.kind, late.receipt?.status, late.receipt?.code], ['receipt', 'rejected', 'PHASE_CLOSED']);
  assert.deepEqual((await mover.api.receipt({ protocolVersion: 2, matchId, commandId: lateRequest.commandId })).receipt, late.receipt);

  // A new intent for the current phase, with a new identifier, is accepted.
  await sleep(GUARD + 30);
  assert.equal(reloaded.flow.dismiss(), true);
  if (later.self.movementDestinations.length > 0) {
    const destination = await reloaded.confirmMove(later);
    assert.deepEqual((await reloaded.settled('accepted')).choice, { kind: 'move', destination });
    const [sent] = mover.requests.filter(request => request.operation === 'v1Command' && request.body.phaseId !== firstPhase);
    assert.equal(sent.body.phaseId, later.phase.id);
    assert.notEqual(sent.body.commandId, lateRequest.commandId);
  }
});
