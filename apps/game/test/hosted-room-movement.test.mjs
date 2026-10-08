import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnectedPlayerScreen, DEFAULT_ACTION_FLOW_TIMING } from '@mothership/game';
import { openRoomMovement } from '../hosted/room-movement.mjs';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView } from './support/connected.mjs';
const OWN = { kind: 'player-view', matchId: MATCH };
async function setup(change = () => {}, fresh = true) {
  const host = createFakeHost({ serverStart: EPOCH }), fake = createFakeConnectedTransport(host);
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const screen = createConnectedPlayerScreen({ transport: fake.transport, matchId: MATCH, seatId: 'seat-1', ports: host.ports, host: { reload() {} } });
  screen.start(); await fake.deliver(OWN, playerView('seat-1', change), fresh);
  return { host, fake, screen, card: () => screen.getFrame().model.match.privateArea.content?.actions.card };
}
test('a room tap opens guarded confirmation; only the explicit confirmation sends MOVE', async () => {
  const s = await setup();
  assert.equal(openRoomMovement(s.screen, 'Room B'), null);
  assert.equal(s.card().status, 'confirming');
  assert.match(s.card().body.prompt, /Room B/);
  assert.equal(s.fake.callsTo('v1Command').length, 0);
  s.screen.dispatch({ type: 'action/confirm' });
  assert.equal(s.fake.callsTo('v1Command').length, 0, 'Double-tap guard is retained');
  s.fake.respond.v1Command = async request => ({ ok: true, serverTimeMs: s.host.serverNow(), receipt: { protocolVersion: 2, matchId: MATCH, phaseId: request.phaseId, commandId: request.commandId, status: 'accepted', code: 'REGISTERED' } });
  await s.host.advance(DEFAULT_ACTION_FLOW_TIMING.controlGuardMs);
  s.screen.dispatch({ type: 'action/confirm' }); await flush();
  assert.deepEqual(s.fake.callsTo('v1Command')[0].command, { type: 'MOVE', destination: 'Room B' });
  assert.equal(s.card().status, 'accepted'); s.screen.dispose();
});
test('room controls cannot invent Captain access, consumed movement, stale eligibility or Hospital/Jail exit', async () => {
  for (const [destination, change, fresh] of [
    ['Command Room', () => {}, true], ['Room A', () => {}, true],
    ['Room B', view => { view.self.movementDestinations = []; }, true],
    ['Room B', view => { view.seats[0].location = 'Hospital'; view.seats[0].health = 'Injured'; view.self.movementDestinations = []; }, true],
    ['Room B', view => { view.seats[0].location = 'Jail'; view.seats[0].jailed = true; view.self.movementDestinations = []; }, true],
    ['Room B', () => {}, false], ['Hospital', () => {}, true],
  ]) {
    const s = await setup(change, fresh);
    assert.equal(typeof openRoomMovement(s.screen, destination), 'string');
    assert.ok(!s.card() || s.card().status === 'idle');
    assert.equal(s.fake.callsTo('v1Command').length, 0); s.screen.dispose();
  }
});
test('room taps cannot replace an in-flight command or its receipt identity', async () => {
  const s = await setup(view => { view.self.movementDestinations = ['Room B', 'Command Room']; });
  s.fake.respond.v1Command = () => new Promise(() => {});
  openRoomMovement(s.screen, 'Room B'); await s.host.advance(DEFAULT_ACTION_FLOW_TIMING.controlGuardMs);
  s.screen.dispatch({ type: 'action/confirm' }); await flush();
  const pending = s.host.kept;
  assert.equal(s.card().status, 'submitting');
  assert.match(openRoomMovement(s.screen, 'Command Room'), /current action/);
  assert.equal(s.card().status, 'submitting'); assert.equal(s.host.kept, pending);
  assert.equal(s.fake.callsTo('v1Command').length, 1); s.screen.dispose();
});
test('phase expiry or concealment still discards an unsent room choice', async () => {
  for (const conceal of [true, false]) {
    const s = await setup(); openRoomMovement(s.screen, 'Room B');
    if (conceal) s.screen.dispatch({ type: 'private/toggle' });
    else await s.host.advance(60_001);
    s.screen.dispatch({ type: 'action/confirm' }); await flush();
    assert.equal(s.fake.callsTo('v1Command').length, 0); s.screen.dispose();
  }
});
