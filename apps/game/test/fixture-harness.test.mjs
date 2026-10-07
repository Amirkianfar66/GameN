import assert from 'node:assert/strict';
import { request } from 'node:http';
import test from 'node:test';
import {
  ApiFailureSchema, CommandResponseSchema, PlayerPresentationEventSchema, PlayerViewSchema, PublicPresentationEventSchema, PublicViewSchema,
  ReceiptLookupResponseSchema, RoleSchema, ServerTimeResponseSchema,
} from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createTableScreen } from '@mothership/game';
import { renderPlayerShell, renderTableShell, toHtml } from '@mothership/presentation';
import { createFixtureTransport } from '../dev/fixture/fixture-transport.mjs';
import { AUDIENCES, COMMAND_PLANS, createScenario, EVENT_INJECTIONS, SLOW_ANSWER_MS, STEPS, SYNTHETIC_FACTS } from '../dev/fixture/scenario.mjs';
import { createDevServer, resolveStatic } from '../dev/serve.mjs';
import { createFakeHost, flush } from './support/fakes.mjs';

const roles = RoleSchema.options;
const schemaFor = audience => (audience === 'public' ? PublicViewSchema : PlayerViewSchema);

function recorder() {
  const events = [];
  return { events, listener: { onPayload: payload => events.push(payload), onConnectionChange: state => events.push(state) } };
}

test('every view the scripted scenario emits satisfies the shared contract at every step', () => {
  for (const variant of ['protected', 'unprotected']) {
    let now = 1_000;
    const scenario = createScenario({ now: () => now, variant });
    do {
      now += 5_000;
      for (const audience of AUDIENCES) {
        const view = scenario.viewFor(audience);
        assert.deepEqual(schemaFor(audience).parse(view), view, `${variant} ${scenario.step().id} ${audience}`);
      }
    } while (scenario.advance());
    assert.equal(scenario.step().id, STEPS.at(-1).id);
    assert.equal(scenario.advance(), false, 'The script ends; it does not loop or invent further steps');
  }
});

test('the first two steps are the authored contract fixture, byte for byte', () => {
  const authored = createOfficerFixture('protected');
  const scenario = createScenario({ now: () => 0 });
  assert.deepEqual(scenario.viewFor('public'), authored.before.public);
  assert.deepEqual(scenario.viewFor('seat-1'), authored.before.officer);
  assert.deepEqual(scenario.viewFor('seat-2'), authored.before.target);
  scenario.advance();
  assert.equal(scenario.step().id, 'registered');
  assert.deepEqual(scenario.viewFor('public'), authored.afterRegistration.public);
  assert.deepEqual(scenario.viewFor('seat-1'), authored.afterRegistration.officer);
  assert.deepEqual(scenario.viewFor('seat-2'), authored.afterRegistration.target);
  assert.deepEqual(STEPS.map(step => step.source.startsWith('authored')), [true, true, false, false]);
});

test('server-only fixture truth never leaves the scenario, whatever is asked of it', () => {
  for (const variant of ['protected', 'unprotected']) {
    const scenario = createScenario({ now: () => 0, variant });
    const emitted = [];
    for (const audience of AUDIENCES) scenario.subscribe(audience, { onPayload: payload => emitted.push([audience, payload]), onConnectionChange: () => {} });
    while (scenario.advance());
    for (const audience of AUDIENCES) {
      scenario.redeliver(audience);
      scenario.inject(audience, 'incompatible-protocol');
      scenario.inject(audience, 'unreadable');
    }
    // One seat's view may be misdelivered to the other seat to test the client. It is
    // refused for the public feed: nothing private goes there under any control.
    scenario.inject('seat-1', 'other-audience');
    scenario.inject('seat-2', 'other-audience');
    assert.throws(() => scenario.inject('public', 'other-audience'), /never sent on the public feed/);
    assert.throws(() => scenario.inject('seat-3', 'unreadable'), /Unknown fixture audience/);
    const everything = JSON.stringify([emitted, scenario.status(), AUDIENCES.map(audience => scenario.viewFor(audience))]);
    for (const secret of ['serverOnly', 'protection', 'grantedBy', 'resolutionExpectation', 'officerOrdinaryShotsRemaining', 'lifetimeReceipts']) {
      assert.equal(everything.includes(secret), false, `${variant}: ${secret}`);
    }
    // The public feed and the operator status name no role at all; a phone names only its own.
    const publicOnly = JSON.stringify([emitted.filter(([audience]) => audience === 'public'), scenario.status()]);
    for (const role of roles) assert.equal(publicOnly.includes(role), false, role);
    // Apart from the deliberate misdelivery above, a phone's feed names only its own role.
    const seatTwo = emitted.filter(([audience]) => audience === 'seat-2').map(([, payload]) => payload);
    const misdelivered = seatTwo.filter(payload => payload.self?.seatId === 'seat-1');
    assert.equal(misdelivered.length, 1);
    const ownFeed = JSON.stringify(seatTwo.filter(payload => payload.self?.seatId !== 'seat-1'));
    for (const role of roles.filter(role => role !== 'Insider')) assert.equal(ownFeed.includes(role), false, role);
  }
});

test('the two variants are indistinguishable to every audience through the whole script', () => {
  const run = variant => {
    let now = 0;
    const scenario = createScenario({ now: () => now, variant });
    const emitted = [];
    for (const audience of AUDIENCES) scenario.subscribe(audience, { onPayload: payload => emitted.push([audience, payload]), onConnectionChange: () => {} });
    do { now += 7_000; } while (scenario.advance());
    return emitted;
  };
  assert.deepEqual(run('protected'), run('unprotected'));
});

test('a hidden registration is delivered to the registering seat and to nobody else', () => {
  const scenario = createScenario({ now: () => 0 });
  const feeds = Object.fromEntries(AUDIENCES.map(audience => [audience, recorder()]));
  for (const audience of AUDIENCES) scenario.subscribe(audience, feeds[audience].listener);
  const counts = () => AUDIENCES.map(audience => feeds[audience].events.length);
  assert.deepEqual(counts(), [2, 2, 2], 'connected, then the current view');
  scenario.advance();
  assert.deepEqual(counts(), [2, 3, 2]);
  assert.deepEqual(feeds['seat-1'].events.at(-1).ownPendingCommandIds, ['fixture-command-1']);
  scenario.advance();
  assert.deepEqual(counts(), [3, 4, 3], 'A public phase change reaches everyone');
});

test('a feed follows the transport contract: connected, then the current view, again after every reconnect', () => {
  const scenario = createScenario({ now: () => 0 });
  const { events, listener } = recorder();
  const stop = scenario.subscribe('public', listener);
  assert.deepEqual(events.map(event => (typeof event === 'string' ? event : `rev ${event.viewRevision}`)), ['connected', 'rev 10']);
  scenario.setConnected('public', false);
  scenario.advance();
  scenario.advance();
  assert.deepEqual(events.slice(2), ['disconnected'], 'Nothing is delivered while the feed is down');
  scenario.setConnected('public', true);
  assert.deepEqual(events.slice(3).map(event => (typeof event === 'string' ? event : `rev ${event.viewRevision}`)), ['connected', 'rev 11']);
  stop();
  scenario.advance();
  assert.equal(events.length, 5);
  assert.throws(() => scenario.subscribe('seat-3', listener), /Unknown fixture audience/);
});

test('server time is virtual: it starts at the authored phase start and can be run forward', () => {
  let now = 9_000_000;
  const scenario = createScenario({ now: () => now });
  const started = scenario.viewFor('public').phase.startedAt;
  assert.equal(scenario.serverTimeMs(), started);
  now += 12_500;
  assert.equal(scenario.serverTimeMs(), started + 12_500);
  scenario.skipToDeadline();
  assert.equal(scenario.serverTimeMs(), started + 60_000);
  assert.equal(scenario.viewFor('public').phase.id, 'phase-a', 'Running the clock out does not advance the phase');
  now += 3_000;
  scenario.advance();
  scenario.advance();
  const next = scenario.viewFor('public').phase;
  assert.deepEqual([next.kind, next.startedAt, next.endsAt - next.startedAt], ['ORDINARY_TURN', started + 63_000, 60_000], 'The next turn gets its full minute from when it opens');
});

test('the first turn can be ended without the scripted registration, and the views stay valid', () => {
  let now = 0;
  const scenario = createScenario({ now: () => now });
  now = 12_000;
  assert.equal(scenario.endFirstTurn(), true);
  assert.equal(scenario.step().id, 'next-turn');
  for (const audience of AUDIENCES) {
    const view = scenario.viewFor(audience);
    assert.deepEqual(schemaFor(audience).parse(view), view, audience);
    assert.deepEqual([view.phase.id, view.activeSeatId, view.phase.endsAt - view.phase.startedAt], ['phase-b', 'seat-2', 60_000]);
  }
  // Nobody registered anything on the way.
  assert.deepEqual([scenario.viewFor('seat-1').self.shotAvailable, scenario.viewFor('seat-1').ownPendingCommandIds], [true, []]);
  assert.equal(scenario.endFirstTurn(), false, 'Only the first turn can be ended this way');
  assert.equal(scenario.advance(), true);
  assert.equal(scenario.step().id, 'resolution');
  assert.equal(scenario.endFirstTurn(), false);
});

test('the real player screen runs against the fixture transport, labeled as fixture throughout', async () => {
  const host = createFakeHost();
  let now = 0;
  const scenario = createScenario({ now: () => now });
  const screen = createPlayerScreen({ transport: createFixtureTransport(scenario, 'seat-1'), matchId: 'fixture-match-a', ports: host.ports, host: { reload() {} } });
  screen.start();
  await flush();
  let { model } = screen.getFrame();
  assert.equal(model.mode, 'fixture');
  assert.equal(model.banners[0].text, 'Fixture data. A synthetic development scenario, not a live match.');
  assert.equal(model.match.phase.phaseLabel, 'Your turn');
  assert.equal(model.match.privateArea.content, null, 'nothing private until asked');
  assert.equal(model.match.phase.timer.display, '1:00');
  screen.dispatch({ type: 'private/toggle' });
  assert.equal(screen.getFrame().model.match.privateArea.content.actions.cards[0].statusLabel, 'Available');

  scenario.advance();
  await flush();
  assert.equal(screen.getFrame().model.match.privateArea.content.actions.cards[0].statusLabel, 'Registered');
  now += 2_000;
  scenario.advance();
  await flush();
  model = screen.getFrame().model;
  assert.equal(model.match.phase.phaseLabel, 'Player 2’s turn');
  scenario.advance();
  await flush();
  model = screen.getFrame().model;
  assert.equal(model.match.phase.phaseLabel, 'Round resolution');
  assert.equal(model.match.location.self.health, 'Healthy', 'The script shows no outcome');
  assert.equal(toHtml(renderPlayerShell(model)).includes('Fixture data.'), true);
  screen.dispose();
});

test('the real table screen is unmoved by the registration step and never sees a role', async () => {
  const host = createFakeHost();
  const scenario = createScenario({ now: () => 0 });
  const transport = createFixtureTransport(scenario, 'public');
  assert.deepEqual(Object.keys(transport).sort(), ['advanceIfExpired', 'audience', 'mode', 'serverTime', 'subscribe']);
  const screen = createTableScreen({ transport, matchId: 'fixture-match-a', ports: host.ports, host: { reload() {} } });
  screen.start();
  await flush();
  const frame = screen.getFrame();
  scenario.advance();
  await flush();
  assert.equal(screen.getFrame(), frame);
  while (scenario.advance()) await flush();
  await flush();
  const html = toHtml(renderTableShell(screen.getFrame().model));
  for (const role of roles) assert.equal(html.includes(role), false, role);
  screen.dispose();
});

test('the operator’s bad payloads exercise the client’s defences end to end', async () => {
  const host = createFakeHost();
  const scenario = createScenario({ now: () => 0 });
  const screen = createPlayerScreen({ transport: createFixtureTransport(scenario, 'seat-2'), matchId: 'fixture-match-a', ports: host.ports, host: { reload() {} } });
  screen.start();
  await flush();
  scenario.inject('seat-2', 'unreadable');
  assert.deepEqual(screen.getFrame().model.banners.map(banner => banner.variant), ['fixture', 'unreadable']);
  scenario.redeliver('seat-2');
  assert.deepEqual(screen.getFrame().model.banners.map(banner => banner.variant), ['fixture']);
  scenario.inject('seat-2', 'incompatible-protocol');
  assert.equal(screen.getFrame().model.blocked.heading, 'Update required');
  scenario.redeliver('seat-2');
  assert.equal(screen.getFrame().model.screen, 'match');
  scenario.inject('seat-2', 'other-audience');
  assert.equal(screen.getFrame().model.blocked.heading, 'Match data check failed');
  assert.equal(JSON.stringify(screen.getFrame().model).includes('Officer'), false, 'The other seat’s role is not shown');
  scenario.redeliver('seat-2');
  assert.equal(screen.getFrame().model.screen, 'blocked');
  assert.throws(() => scenario.inject('seat-2', 'made-up'), /Unknown injection/);
  screen.dispose();
});

// --- The scripted command desk ---
//
// It follows the command contract as stated for protocol 1 and applies no game rule.
// These tests pin that behavior, so a journey test that leans on it leans on something known.

const MATCH = 'fixture-match-a';
const shot = (commandId, targetSeatId = 'seat-2', phaseId = 'phase-a') => ({
  protocolVersion: 1, matchId: MATCH, phaseId, commandId, command: { type: 'REGISTER_SHOT', targetSeatId },
});
const lookup = commandId => ({ protocolVersion: 1, matchId: MATCH, commandId });
const receiptOf = result => CommandResponseSchema.parse(result.body).receipt;
const errorOf = result => ApiFailureSchema.parse(result.body).error.code;
const found = (scenario, audience, commandId) => ReceiptLookupResponseSchema.parse(scenario.lookupReceipt(audience, lookup(commandId)).body);

test('an accepted registration changes the actor’s own view and nobody else’s, to the authored view with the client’s identifier', () => {
  for (const variant of ['protected', 'unprotected']) {
    const authored = createOfficerFixture(variant);
    const scenario = createScenario({ now: () => 0, variant });
    const feeds = Object.fromEntries(AUDIENCES.map(audience => [audience, recorder()]));
    for (const audience of AUDIENCES) scenario.subscribe(audience, feeds[audience].listener);
    const heard = Object.fromEntries(AUDIENCES.map(audience => [audience, feeds[audience].events.length]));

    const result = scenario.submitCommand('seat-1', shot('client-id-1'));
    assert.deepEqual(result, {
      answered: true,
      body: { ok: true, serverTimeMs: authored.before.public.phase.startedAt, receipt: { protocolVersion: 1, matchId: MATCH, phaseId: 'phase-a', commandId: 'client-id-1', status: 'accepted', code: 'REGISTERED' } },
    });
    // The authored afterRegistration views, with the client's identifier in place of the authored one.
    assert.deepEqual(scenario.viewFor('seat-1'), { ...authored.afterRegistration.officer, ownPendingCommandIds: ['client-id-1'] });
    assert.deepEqual(scenario.viewFor('public'), authored.afterRegistration.public);
    assert.deepEqual(scenario.viewFor('seat-2'), authored.afterRegistration.target);
    assert.equal(scenario.step().id, 'registered');
    // What makes it hidden: the table and the target hear nothing at all.
    assert.equal(feeds.public.events.length, heard.public);
    assert.equal(feeds['seat-2'].events.length, heard['seat-2']);
    assert.equal(feeds['seat-1'].events.length, heard['seat-1'] + 1);
    // Nothing in the answer or the views says what will come of it.
    assert.equal(JSON.stringify([result, scenario.viewFor('seat-1')]).includes('Injured'), false);
  }
});

test('the desk keeps to the stated command contract: one durable receipt per identifier, replayed before phase or time is looked at', () => {
  let now = 0;
  const scenario = createScenario({ now: () => now });
  const first = receiptOf(scenario.submitCommand('seat-1', shot('id-1')));
  assert.equal(first.status, 'accepted');
  const revision = scenario.viewFor('seat-1').viewRevision;

  // The identical command again: the original receipt, and nothing happens twice.
  assert.deepEqual(receiptOf(scenario.submitCommand('seat-1', shot('id-1'))), first);
  assert.equal(scenario.viewFor('seat-1').viewRevision, revision);
  // The same identifier with another payload conflicts and leaves the original alone.
  assert.equal(errorOf(scenario.submitCommand('seat-1', shot('id-1', 'seat-3'))), 'COMMAND_ID_CONFLICT');
  assert.equal(errorOf(scenario.submitCommand('seat-1', shot('id-1', 'seat-2', 'phase-b'))), 'COMMAND_ID_CONFLICT');
  assert.deepEqual(found(scenario, 'seat-1', 'id-1'), { status: 'found', serverTimeMs: scenario.viewFor('public').phase.startedAt, receipt: first });

  // The phase moves on. The original still gets its receipt back; a new identifier for the
  // old phase is rejected, and that rejection is stored like any other receipt.
  now += 5_000;
  scenario.advance();
  assert.equal(scenario.viewFor('public').phase.id, 'phase-b');
  assert.deepEqual(receiptOf(scenario.submitCommand('seat-1', shot('id-1'))), first);
  const late = receiptOf(scenario.submitCommand('seat-1', shot('id-2')));
  assert.deepEqual([late.status, late.code, late.phaseId], ['rejected', 'PHASE_CLOSED', 'phase-a']);
  assert.deepEqual(found(scenario, 'seat-1', 'id-2').receipt, late);
  assert.deepEqual(receiptOf(scenario.submitCommand('seat-1', shot('id-2'))), late);

  // A receipt belongs to the seat that sent the command; no other seat can read it.
  assert.equal(found(scenario, 'seat-2', 'id-1').status, 'unknown');
  assert.equal(found(scenario, 'seat-1', 'never-sent').status, 'unknown');
  assert.equal(scenario.status().commands.receipts, 2);
});

test('a command is for the phase that is open now: past its deadline it is rejected, however little', () => {
  let now = 0;
  const scenario = createScenario({ now: () => now });
  const other = createScenario({ now: () => now });
  now = 59_999;
  assert.equal(receiptOf(scenario.submitCommand('seat-1', shot('in-time'))).status, 'accepted');
  now = 60_000;
  assert.deepEqual([receiptOf(other.submitCommand('seat-1', shot('too-late'))).code, other.viewFor('seat-1').self.shotAvailable], ['PHASE_CLOSED', true]);
  // Round resolution has no deadline and takes no shot.
  const resolved = createScenario({ now: () => 0 });
  while (resolved.advance());
  assert.equal(receiptOf(resolved.submitCommand('seat-1', shot('during-resolution', 'seat-2', 'phase-c'))).code, 'PHASE_CLOSED');
});

test('the desk is not an engine: it holds one scripted registration and never judges a target', () => {
  // Any target is accepted for the scripted registration. That is a statement about this
  // double, not about the game: the real server decides which targets are allowed.
  for (const target of ['seat-2', 'seat-6', 'seat-9', 'seat-1']) {
    const scenario = createScenario({ now: () => 0 });
    assert.equal(receiptOf(scenario.submitCommand('seat-1', shot('any', target))).status, 'accepted', target);
  }
  const scenario = createScenario({ now: () => 0 });
  // Player 2's own authored view calls no shot available, and it is not Player 2's turn.
  assert.equal(receiptOf(scenario.submitCommand('seat-2', shot('p2'))).code, 'NOT_ALLOWED');
  assert.equal(receiptOf(scenario.submitCommand('seat-1', shot('p1-first'))).status, 'accepted');
  // After its registration the Officer's own view calls the shot unavailable.
  assert.equal(receiptOf(scenario.submitCommand('seat-1', shot('p1-second', 'seat-3'))).code, 'NOT_ALLOWED');
  assert.deepEqual(scenario.viewFor('seat-1').ownPendingCommandIds, ['p1-first']);
});

test('requests are refused before the match is read, with the contract’s own safe errors, and nothing is stored', () => {
  const scenario = createScenario({ now: () => 0 });
  const refusals = [
    [{ ...shot('v2'), protocolVersion: 2 }, 'UNSUPPORTED_PROTOCOL'],
    [{ ...shot('extra'), actorSeatId: 'seat-1' }, 'INVALID_REQUEST'],
    [{ ...shot('clock'), now: 5 }, 'INVALID_REQUEST'],
    [{}, 'INVALID_REQUEST'],
    [shot('bad id!'), 'INVALID_REQUEST'],
    [{ ...shot('elsewhere'), matchId: 'another-match' }, 'FORBIDDEN'],
  ];
  for (const [payload, code] of refusals) assert.equal(errorOf(scenario.submitCommand('seat-1', payload)), code, JSON.stringify(payload));
  // The table display has no command and no receipt.
  assert.equal(errorOf(scenario.submitCommand('public', shot('from-table'))), 'FORBIDDEN');
  assert.equal(errorOf(scenario.lookupReceipt('public', lookup('from-table'))), 'FORBIDDEN');
  assert.equal(errorOf(scenario.lookupReceipt('seat-1', { ...lookup('x'), protocolVersion: 2 })), 'UNSUPPORTED_PROTOCOL');
  assert.equal(errorOf(scenario.lookupReceipt('seat-1', { ...lookup('x'), targetSeatId: 'seat-2' })), 'INVALID_REQUEST');
  assert.equal(scenario.status().commands.receipts, 0);
  assert.equal(scenario.viewFor('seat-1').self.shotAvailable, true);
  assert.throws(() => scenario.submitCommand('seat-7', shot('x')), /Unknown fixture audience/);
  assert.throws(() => scenario.lookupReceipt('seat-7', lookup('x')), /Unknown fixture audience/);
});

test('the operator can arrange each kind of answer once; the desk then answers as scripted again', () => {
  const fresh = plan => {
    const scenario = createScenario({ now: () => 0 });
    scenario.planNextCommand(plan);
    assert.equal(scenario.status().commands.next, plan);
    return scenario;
  };
  for (const [plan, code] of [['reject-not-allowed', 'NOT_ALLOWED'], ['reject-phase-closed', 'PHASE_CLOSED']]) {
    const scenario = fresh(plan);
    const rejected = receiptOf(scenario.submitCommand('seat-1', shot('a')));
    assert.deepEqual([rejected.status, rejected.code], ['rejected', code]);
    assert.deepEqual(found(scenario, 'seat-1', 'a').receipt, rejected, 'A rejection is stored');
    assert.equal(scenario.viewFor('seat-1').self.shotAvailable, true);
    assert.equal(scenario.status().commands.next, 'scripted');
    assert.equal(receiptOf(scenario.submitCommand('seat-1', shot('b'))).status, 'accepted');
  }

  // Decided and stored, but the answer never arrives.
  const acknowledged = fresh('lose-acknowledgment');
  assert.deepEqual(acknowledged.submitCommand('seat-1', shot('a')), { answered: false });
  assert.equal(found(acknowledged, 'seat-1', 'a').receipt.status, 'accepted');
  assert.deepEqual(acknowledged.viewFor('seat-1').ownPendingCommandIds, ['a']);

  // Lost on the way: the desk never saw it.
  const dropped = fresh('drop-request');
  assert.deepEqual(dropped.submitCommand('seat-1', shot('a')), { answered: false });
  assert.equal(found(dropped, 'seat-1', 'a').status, 'unknown');
  assert.equal(dropped.viewFor('seat-1').self.shotAvailable, true);
  assert.equal(receiptOf(dropped.submitCommand('seat-1', shot('a'))).status, 'accepted', 'The same command, sent again, is decided then');

  const unavailable = fresh('unavailable');
  assert.equal(errorOf(unavailable.submitCommand('seat-1', shot('a'))), 'UNAVAILABLE');
  assert.equal(found(unavailable, 'seat-1', 'a').status, 'unknown');

  // Slow to arrive: nothing is decided, stored or shown until the request gets there.
  const slow = fresh('slow');
  const onItsWay = slow.submitCommand('seat-1', shot('a'));
  assert.deepEqual([onItsWay.answered, onItsWay.delayMs], ['later', SLOW_ANSWER_MS]);
  assert.equal(found(slow, 'seat-1', 'a').status, 'unknown');
  assert.equal(slow.viewFor('seat-1').self.shotAvailable, true);
  assert.equal(receiptOf(onItsWay.resume()).status, 'accepted');
  assert.deepEqual(slow.viewFor('seat-1').ownPendingCommandIds, ['a']);
  // If the turn ends while it is on its way, it arrives too late like any other.
  const late = fresh('slow');
  const travelling = late.submitCommand('seat-1', shot('a'));
  late.endFirstTurn();
  assert.equal(receiptOf(travelling.resume()).code, 'PHASE_CLOSED');
  const quick = createScenario({ now: () => 0, slowAnswerMs: 20 });
  quick.planNextCommand('slow');
  assert.equal(quick.submitCommand('seat-1', shot('a')).delayMs, 20);
  // A request on its way is answered as scripted when it arrives. It neither uses up nor
  // obeys whatever the operator arranged meanwhile for a later request.
  const queued = fresh('slow');
  const waiting = queued.submitCommand('seat-1', shot('a'));
  queued.planNextCommand('slow');
  const arrived = waiting.resume();
  assert.deepEqual([arrived.answered, receiptOf(arrived).status], [true, 'accepted'], 'Decided on arrival, not held back a second time');
  assert.equal(queued.status().commands.next, 'slow', 'The later arrangement is still waiting for its own request');
  const rejectedLater = fresh('slow');
  const first = rejectedLater.submitCommand('seat-1', shot('a'));
  rejectedLater.planNextCommand('reject-not-allowed');
  assert.equal(receiptOf(first.resume()).status, 'accepted');
  assert.equal(receiptOf(rejectedLater.submitCommand('seat-1', shot('b'))).code, 'NOT_ALLOWED');
  // If the service has gone silent by the time it arrives, it gets no answer like any other.
  const silenced = fresh('slow');
  const lateArrival = silenced.submitCommand('seat-1', shot('a'));
  silenced.setCommandService('silent');
  assert.deepEqual(lateArrival.resume(), { answered: false });
  assert.equal(silenced.status().commands.receipts, 0);

  assert.throws(() => createScenario().planNextCommand('always-win'), /Unknown command plan/);
  assert.deepEqual(COMMAND_PLANS.includes('scripted') && COMMAND_PLANS.length, 7);
});

test('a silent command service answers nothing and stores nothing, while the feeds carry on', () => {
  const scenario = createScenario({ now: () => 0 });
  const feed = recorder();
  scenario.subscribe('seat-1', feed.listener);
  scenario.setCommandService('silent');
  scenario.planNextCommand('reject-not-allowed');
  assert.deepEqual(scenario.submitCommand('seat-1', shot('a')), { answered: false });
  assert.deepEqual(scenario.lookupReceipt('seat-1', lookup('a')), { answered: false });
  assert.deepEqual([scenario.status().commands.service, scenario.status().commands.receipts, scenario.status().commands.next], ['silent', 0, 'reject-not-allowed']);
  assert.equal(scenario.isConnected('seat-1'), true);
  scenario.redeliver('seat-1');
  assert.equal(feed.events.length, 3, 'The feed still delivers');
  scenario.setCommandService('answering');
  assert.equal(found(scenario, 'seat-1', 'a').status, 'unknown');
  assert.equal(receiptOf(scenario.submitCommand('seat-1', shot('a'))).code, 'NOT_ALLOWED', 'The arrangement waited for a request that reached the desk');
  assert.throws(() => scenario.setCommandService('broken'), /Unknown command service state/);
});

test('a restart forgets receipts and arrangements, and the operator status never shows a target, an identifier or a role', () => {
  const scenario = createScenario({ now: () => 0 });
  scenario.submitCommand('seat-1', shot('secret-command-id', 'seat-4'));
  scenario.planNextCommand('unavailable');
  scenario.setCommandService('silent');
  const status = scenario.status();
  assert.deepEqual(status.commands, { service: 'silent', next: 'unavailable', receipts: 1, last: { audience: 'seat-1', status: 'accepted', code: 'REGISTERED' } });
  const text = JSON.stringify(status);
  for (const word of ['secret-command-id', 'seat-4', 'targetSeatId', ...roles]) assert.equal(text.includes(word), false, word);
  scenario.restart();
  assert.deepEqual(scenario.status().commands, { service: 'answering', next: 'scripted', receipts: 0, last: null });
  assert.equal(found(scenario, 'seat-1', 'secret-command-id').status, 'unknown');
});

test('the in-process transport hands answers over unvalidated and turns "no answer" into a failed request', async () => {
  const scenario = createScenario({ now: () => 0 });
  const waits = [];
  const transport = createFixtureTransport(scenario, 'seat-1', { wait: async ms => { waits.push(ms); } });
  assert.deepEqual(Object.keys(transport).sort(), ['advanceIfExpired', 'audience', 'lookupReceipt', 'mode', 'serverTime', 'submitCommand', 'subscribe']);
  assert.equal(ReceiptLookupResponseSchema.parse(await transport.lookupReceipt(lookup('a'))).status, 'unknown');
  scenario.planNextCommand('drop-request');
  await assert.rejects(transport.submitCommand(shot('a')), /no answer/);
  scenario.planNextCommand('slow');
  assert.equal(CommandResponseSchema.parse(await transport.submitCommand(shot('a'))).receipt.status, 'accepted');
  assert.deepEqual(waits, [SLOW_ANSWER_MS]);
  // Without a way to wait, a slow request simply arrives at once.
  const other = createScenario({ now: () => 0 });
  other.planNextCommand('slow');
  assert.equal(CommandResponseSchema.parse(await createFixtureTransport(other, 'seat-1').submitCommand(shot('a'))).receipt.status, 'accepted');
  // Expiry catch-up is not scripted: the client does not call it yet.
  assert.equal(ApiFailureSchema.parse(await transport.advanceIfExpired({})).error.code, 'UNAVAILABLE');
  assert.ok(ServerTimeResponseSchema.safeParse(await transport.serverTime()).success);
  // The table's transport still has no way to send a command or read a receipt.
  assert.deepEqual(Object.keys(createFixtureTransport(scenario, 'public')).sort(), ['advanceIfExpired', 'audience', 'mode', 'serverTime', 'subscribe']);
});

// --- The loopback development server ---

async function withServer(t) {
  const devServer = createDevServer({ now: () => 0 });
  const origin = await devServer.listen(0);
  t.after(() => devServer.close());
  return { devServer, origin };
}

async function firstEvents(origin, audience, count) {
  const controller = new AbortController();
  const response = await fetch(`${origin}/api/fixture/stream?audience=${audience}`, { signal: controller.signal });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/event-stream/);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  const events = [];
  while (events.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    for (;;) {
      const end = text.indexOf('\n\n');
      if (end === -1) break;
      const block = text.slice(0, end);
      text = text.slice(end + 2);
      const name = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (name) events.push({ name, data: JSON.parse(data) });
    }
  }
  controller.abort();
  return events;
}

test('the server streams each audience its own authored view and nothing server-only', async t => {
  const { origin } = await withServer(t);
  const authored = createOfficerFixture('protected');
  for (const [audience, expected] of [['public', authored.before.public], ['seat-1', authored.before.officer], ['seat-2', authored.before.target]]) {
    const [event] = await firstEvents(origin, audience, 1);
    assert.equal(event.name, 'payload');
    assert.deepEqual(event.data, expected);
  }
  assert.equal((await fetch(`${origin}/api/fixture/stream?audience=seat-9`)).status, 400);
  assert.equal((await fetch(`${origin}/api/fixture/stream`)).status, 400);
  const time = ServerTimeResponseSchema.parse(await (await fetch(`${origin}/api/fixture/time`)).json());
  assert.equal(time.serverTimeMs, authored.before.public.phase.startedAt);
});

test('a browser can load the client modules but never the contract fixture or anything off the allowlist', async t => {
  const { origin } = await withServer(t);
  for (const [path, type] of [
    ['/', 'text/html'], ['/harness/player.html', 'text/html'], ['/harness/host.js', 'text/javascript'], ['/styles/shell.css', 'text/css'],
    ['/styles/tokens.css', 'text/css'], ['/modules/game/index.js', 'text/javascript'], ['/modules/presentation/index.js', 'text/javascript'],
    ['/modules/contracts/index.js', 'text/javascript'], ['/modules/zod/index.js', 'text/javascript'],
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('content-type').startsWith(type), true, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
  }
  for (const path of [
    '/modules/contracts/fixtures.js', '/modules/contracts/fixtures.d.ts', '/modules/game/index.d.ts', '/modules/zod/package.json',
    // On a filesystem that ignores case these name the same files as the allowed or denied ones.
    '/modules/contracts/Fixtures.js', '/modules/contracts/FIXTURES.js', '/modules/contracts/fixtures.JS', '/modules/contracts/FIXTURES.JS',
    '/modules/game/Index.js', '/modules/Game/index.js', '/harness/Player.html', '/modules/zod/Package.json', '/Styles/shell.css',
    '/modules/game/../../package.json', '/modules/game/%2e%2e/%2e%2e/package.json', '/modules/game/..%2f..%2fpackage.json',
    '/harness/../serve.mjs', '/harness/../fixture/scenario.mjs', '/harness/.hidden', '/modules/zod/index.cjs',
    '/package.json', '/rules/source-manifest.json', '/apps/game/dev/serve.mjs', '/.git/config', '/modules/game/', '/nope',
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
    assert.equal((await response.text()).includes('serverOnly'), false, path);
  }
  assert.match(await (await fetch(`${origin}/styles/tokens.css`)).text(), /--ms-color-canvas: #10141C;/);
});

test('the path mapping refuses traversal, odd separators and wrong case before any file is opened', () => {
  // fetch normalizes dot segments away before sending, so the mapping is exercised directly.
  for (const path of [
    '/modules/game/../../package.json', '/modules/game/../dev/serve.mjs', '/modules/game/./index.js', '/modules/game//index.js',
    '/modules/game/..', '/modules/game/', '/modules/game', '/harness/../serve.mjs', '/harness/.hidden', '/modules/game/.git/config',
    '/modules/game/screens\\screen.js', '/modules/game/C:/x.js', '/modules/game/index.js\0.css',
    '/modules/contracts/fixtures.js', '/modules/contracts/Fixtures.js', '/modules/contracts/FIXTURES.JS', '/modules/contracts/fixture.js',
    '/modules/contracts/index.d.ts', '/modules/contracts/package.json', '/modules/game/Index.js', '/modules/game/missing.js', '/nope',
  ]) {
    assert.equal(resolveStatic(path), null, path);
  }
  assert.match(resolveStatic('/modules/game/index.js'), /apps\/game\/dist\/index\.js$/);
  assert.match(resolveStatic('/modules/contracts/index.js'), /packages\/contracts\/dist\/index\.js$/);
  assert.match(resolveStatic('/harness/player.html'), /apps\/game\/dev\/harness\/player\.html$/);
  assert.match(resolveStatic('/'), /harness\/index\.html$/);
});

test('harness pages are served under a policy that forbids inline script and inline style', async t => {
  const { origin } = await withServer(t);
  for (const path of ['/', '/harness/player.html', '/harness/table.html', '/harness/operator.html']) {
    const response = await fetch(origin + path);
    const policy = response.headers.get('content-security-policy');
    const html = await response.text();
    assert.match(policy, /default-src 'none'/, path);
    assert.match(policy, /style-src 'self'(;|$)/, path);
    assert.equal(policy.includes("'unsafe-inline'") || policy.includes("'unsafe-eval'"), false, path);
    const importMaps = html.match(/<script type="importmap">/g)?.length ?? 0;
    assert.equal((policy.match(/'sha256-/g) ?? []).length, importMaps, path);
    assert.equal(/<style|style="|\son[a-z]+="/i.test(html), false, `${path} has inline style or handlers`);
    assert.equal(html.includes('mothership:dev-only'), true, path);
    assert.equal(/fixtures\.js|@mothership\/contracts\/fixtures/.test(html), false, path);
  }
});

test('the server answers only on its loopback name and refuses pages from other origins', async t => {
  const { origin, devServer } = await withServer(t);
  const port = Number(new URL(origin).port);
  // The bind is the real control: a client that is not a browser can send any Host it likes.
  assert.equal(devServer.address().address, '127.0.0.1');
  // fetch does not let a caller choose the Host header, so these go through node:http.
  const statusForHost = host => new Promise((resolveStatus, rejectStatus) => {
    request({ host: '127.0.0.1', port, path: '/api/fixture/time', headers: { host } }, response => {
      response.resume();
      resolveStatus(response.statusCode);
    }).on('error', rejectStatus).end();
  });
  assert.equal(await statusForHost(`127.0.0.1:${port}`), 200);
  assert.equal(await statusForHost(`localhost:${port}`), 200);
  // A name that merely resolves to this machine (DNS rebinding) is not accepted.
  assert.equal(await statusForHost('attacker.example'), 421);
  assert.equal(await statusForHost(`attacker.example:${port}`), 421);
  assert.equal(await statusForHost(`127.0.0.1:${port + 1}`), 421);
  assert.equal((await fetch(`${origin}/api/operator/status`, { headers: { origin: 'https://attacker.example' } })).status, 403);
  const post = (path, init = {}) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', ...init });
  assert.equal((await post('/api/operator/advance', { headers: { 'content-type': 'application/json', origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await post('/api/operator/advance', { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await post('/api/operator/redeliver', { body: 'not json' })).status, 400);
  assert.equal((await post('/api/operator/redeliver', { body: '[]' })).status, 400);
  // A well-formed body is refused for its size alone, and a small one is accepted.
  assert.equal((await post('/api/operator/redeliver', { body: JSON.stringify({ pad: 'x'.repeat(5_000) }) })).status, 413);
  assert.equal((await post('/api/operator/redeliver', { body: JSON.stringify({ pad: 'x'.repeat(3_000) }) })).status, 200);
  assert.equal((await post('/api/operator/made-up')).status, 400);
  assert.equal((await post('/api/operator/inject', { body: JSON.stringify({ audience: 'seat-1', kind: 'made-up' }) })).status, 400);
  assert.equal((await post('/api/operator/drop', { body: JSON.stringify({ audience: 'seat-7' }) })).status, 400);
  assert.equal((await fetch(`${origin}/api/fixture/time`, { method: 'DELETE' })).status, 405);
  // HEAD on a stream is answered at once instead of holding a subscriber open.
  const head = await fetch(`${origin}/api/fixture/stream?audience=public`, { method: 'HEAD', signal: AbortSignal.timeout(2_000) });
  assert.equal(head.status, 405);
  assert.equal(devServer.scenario.status().subscribers.public, 0);
});

test('a bad payload is aimed at one named seat and never reaches the public feed', async t => {
  const { origin, devServer } = await withServer(t);
  const inject = body => fetch(`${origin}/api/operator/inject`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const publicFeed = [];
  devServer.scenario.subscribe('public', { onPayload: payload => publicFeed.push(payload), onConnectionChange: () => {} });
  assert.equal((await inject({ kind: 'other-audience' })).status, 400, 'no audience named');
  assert.equal((await inject({ kind: 'other-audience', audience: 'all' })).status, 400, 'broadcast refused');
  assert.equal((await inject({ kind: 'other-audience', audience: 'public' })).status, 400, 'public refused');
  assert.equal((await inject({ kind: 'other-audience', audience: 'seat-2' })).status, 200);
  assert.equal((await inject({ kind: 'unreadable', audience: 'public' })).status, 200, 'a non-private bad payload may be sent to the table');
  const sent = JSON.stringify(publicFeed);
  for (const role of roles) assert.equal(sent.includes(role), false, role);
  assert.equal(sent.includes('"self"'), false);
});

test('operator actions drive the script over HTTP', async t => {
  const { origin, devServer } = await withServer(t);
  const post = async (path, body = {}) => {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 200, path);
    return response.json();
  };
  let status = await post('/api/operator/advance');
  assert.deepEqual([status.fixtureOnly, status.step.id, status.revisions], [true, 'registered', { public: 10, 'seat-1': 21, 'seat-2': 30 }]);
  assert.equal(JSON.stringify(status).includes('Officer'), false);
  status = await post('/api/operator/expire');
  assert.equal(status.serverTimeMs, status.phase.endsAt);
  status = await post('/api/operator/drop', { audience: 'public' });
  assert.deepEqual(status.connected, { public: false, 'seat-1': true, 'seat-2': true });
  status = await post('/api/operator/expire');
  assert.deepEqual(status.connected, { public: false, 'seat-1': true, 'seat-2': true }, 'Running the clock out leaves a dropped feed dropped');
  await assert.rejects(() => fetch(`${origin}/api/fixture/stream?audience=public`), 'A dropped feed is a failed connection, not an error page');
  status = await post('/api/operator/restore', { audience: 'all' });
  assert.equal(status.connected.public, true);
  assert.equal(ApiFailureSchema.parse(await post('/api/fixture/advance-if-expired')).error.code, 'UNAVAILABLE');
  status = await post('/api/operator/end-turn');
  assert.deepEqual([status.step.id, status.phase.id], ['next-turn', 'phase-b']);
  status = await post('/api/operator/plan-command', { plan: 'reject-not-allowed' });
  assert.equal(status.commands.next, 'reject-not-allowed');
  status = await post('/api/operator/command-service', { state: 'silent' });
  assert.equal(status.commands.service, 'silent');
  for (const [path, body] of [['/api/operator/plan-command', { plan: 'always-win' }], ['/api/operator/plan-command', {}], ['/api/operator/command-service', { state: 'broken' }]]) {
    const refused = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(refused.status, 400, path);
  }
  status = await post('/api/operator/restart', { variant: 'unprotected' });
  assert.deepEqual(status.commands, { service: 'answering', next: 'scripted', receipts: 0, last: null });
  assert.deepEqual([status.variant, status.step.id], ['unprotected', 'officer-turn']);
  assert.equal(devServer.scenario.step().id, 'officer-turn');
});

test('command and receipt requests work over HTTP for a named seat, and an arranged silence is a failed request', async t => {
  const devServer = createDevServer({ now: () => 0, slowAnswerMs: 40 });
  const origin = await devServer.listen(0);
  t.after(() => devServer.close());
  const post = (path, body) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  // The seat is named in the address. Without one there is nobody to answer.
  for (const path of ['/api/fixture/submit-command', '/api/fixture/lookup-receipt', '/api/fixture/submit-command?audience=seat-7']) {
    assert.equal((await post(path, shot('a'))).status, 400, path);
  }
  assert.equal(ApiFailureSchema.parse(await (await post('/api/fixture/submit-command?audience=public', shot('a'))).json()).error.code, 'FORBIDDEN');
  assert.equal(ReceiptLookupResponseSchema.parse(await (await post('/api/fixture/lookup-receipt?audience=seat-1', lookup('a'))).json()).status, 'unknown');

  // No answer: an empty gateway error, at once. The connection is not cut, because a browser
  // re-sends a request by itself when that happens.
  const unanswered = async response => [response.status, await response.text()];
  devServer.scenario.planNextCommand('drop-request');
  assert.deepEqual(await unanswered(await post('/api/fixture/submit-command?audience=seat-1', shot('a'))), [504, '']);
  assert.equal(devServer.scenario.status().commands.receipts, 0);
  devServer.scenario.planNextCommand('lose-acknowledgment');
  assert.deepEqual(await unanswered(await post('/api/fixture/submit-command?audience=seat-1', shot('a'))), [504, '']);
  assert.equal(devServer.scenario.status().commands.receipts, 1);
  const recovered = ReceiptLookupResponseSchema.parse(await (await post('/api/fixture/lookup-receipt?audience=seat-1', lookup('a'))).json());
  assert.deepEqual([recovered.status, recovered.receipt.status], ['found', 'accepted']);

  // The identical command again gets the original receipt; a slow request is held back, then decided.
  devServer.scenario.planNextCommand('slow');
  const started = performance.now();
  const response = await post('/api/fixture/submit-command?audience=seat-1', shot('a'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(CommandResponseSchema.parse(await response.json()).receipt, recovered.receipt);
  assert.equal(performance.now() - started >= 35, true);

  // Two slow requests in a row: each is held back once and then answered in full.
  devServer.scenario.planNextCommand('slow');
  const firstSlow = post('/api/fixture/submit-command?audience=seat-1', shot('a'));
  await new Promise(resolve => setTimeout(resolve, 10));
  devServer.scenario.planNextCommand('slow');
  const secondSlow = post('/api/fixture/submit-command?audience=seat-1', shot('a'));
  for (const answer of [await firstSlow, await secondSlow]) {
    assert.equal(answer.status, 200);
    assert.deepEqual(CommandResponseSchema.parse(await answer.json()).receipt, recovered.receipt);
  }

  devServer.scenario.setCommandService('silent');
  assert.equal((await post('/api/fixture/lookup-receipt?audience=seat-1', lookup('a'))).status, 504);
  assert.equal((await post('/api/fixture/submit-command?audience=seat-1', shot('b'))).status, 504);
  // The fixture server never logs or echoes a command: its status shows a count, not a choice.
  const status = await (await fetch(`${origin}/api/operator/status`)).json();
  assert.equal(JSON.stringify(status).includes('seat-2'), true, 'audience keys only');
  assert.equal(JSON.stringify(status.commands).includes('seat-2'), false);
});

test('an open stream receives later views and a restart notice, and is closed when the feed is dropped', async t => {
  const { origin, devServer } = await withServer(t);
  const pending = firstEvents(origin, 'seat-1', 4);
  await new Promise(resolve => setTimeout(resolve, 50));
  devServer.scenario.advance();
  devServer.scenario.restart();
  const events = await pending;
  // The registration event travels on the same connection as the views, as a message of its own kind.
  assert.deepEqual(events.map(event => event.name), ['payload', 'payload', 'presentation-event', 'restart']);
  assert.deepEqual(events[1].data.ownPendingCommandIds, ['fixture-command-1']);
  assert.deepEqual(PlayerPresentationEventSchema.parse(events[2].data).fact, { type: 'COMMAND_REGISTERED', commandId: 'fixture-command-1' });
  assert.equal(events[2].data.viewRevision, events[1].data.viewRevision);

  const controller = new AbortController();
  const response = await fetch(`${origin}/api/fixture/stream?audience=seat-2`, { signal: controller.signal });
  const reader = response.body.getReader();
  await reader.read();
  devServer.scenario.setConnected('seat-2', false);
  let closed = false;
  for (let attempt = 0; attempt < 5 && !closed; attempt += 1) closed = (await reader.read()).done;
  assert.equal(closed, true);
  controller.abort();
});

// Presentation events. The scripted streams follow what the integration owner has proposed
// for delivering events; they are not the result of an engine and prove nothing about one.

const eventSchemaFor = audience => (audience === 'public' ? PublicPresentationEventSchema : PlayerPresentationEventSchema);

/** Records everything each audience's feed delivers, in order, tagged by kind. */
function tap(scenario, audiences = AUDIENCES) {
  const feeds = Object.fromEntries(audiences.map(audience => [audience, []]));
  for (const audience of audiences) {
    scenario.subscribe(audience, {
      onConnectionChange: state => feeds[audience].push({ kind: state }),
      onPayload: view => feeds[audience].push({ kind: 'view', view }),
      onEventPayload: event => feeds[audience].push({ kind: 'event', event }),
    });
  }
  const brief = audience => feeds[audience].map(item => (item.kind === 'view' ? `view ${item.view.viewRevision}` : item.kind === 'event' ? `event ${item.event.eventId}@${item.event.viewRevision}` : item.kind));
  const eventsOf = audience => feeds[audience].filter(item => item.kind === 'event').map(item => item.event);
  return { feeds, brief, eventsOf };
}

test('every event the scripted scenario emits satisfies the shared contract and agrees with the view it was written with', () => {
  for (const variant of ['protected', 'unprotected']) {
    let now = 0;
    const scenario = createScenario({ now: () => now, variant });
    const { feeds, eventsOf } = tap(scenario);
    do { now += 5_000; } while (scenario.advance());
    for (const fact of ['move', 'status', 'move', 'status']) scenario.synthetic(fact);
    for (const audience of AUDIENCES) {
      const views = new Map(feeds[audience].filter(item => item.kind === 'view').map(item => [item.view.viewRevision, item.view]));
      assert.equal(eventsOf(audience).length > 0, true);
      for (const event of eventsOf(audience)) {
        assert.deepEqual(eventSchemaFor(audience).parse(event), event, `${variant} ${audience} ${event.eventId}`);
        const view = views.get(event.viewRevision);
        assert.notEqual(view, undefined, 'An event is written with a view of the same revision');
        assert.deepEqual([event.matchId, event.audience], [view.matchId, view.audience]);
        const { fact } = event;
        if (fact.type === 'PHASE_CHANGED') assert.equal(view.phase.id, fact.phaseId);
        if (fact.type === 'PUBLIC_MOVE') assert.equal(view.seats.find(seat => seat.seatId === fact.seatId).location, fact.to);
        if (fact.type === 'PUBLIC_HEALTH_CHANGED') assert.equal(view.seats.find(seat => seat.seatId === fact.seatId).health, fact.health);
        if (fact.type === 'COMMAND_REGISTERED') assert.deepEqual(view.ownPendingCommandIds, [fact.commandId]);
      }
      const ids = eventsOf(audience).map(event => event.eventId);
      assert.equal(new Set(ids).size, ids.length, 'Identifiers are unique within a stream');
      for (const id of ids) for (const role of roles) assert.equal(id.toLowerCase().includes(role.toLowerCase()), false);
    }
  }
});

test('a registration puts the authored fact on the registering seat’s stream and nothing on any other', () => {
  const authored = createOfficerFixture('protected').afterRegistration;
  // Stepped by the operator: the authored registration itself.
  const stepped = createScenario({ now: () => 0 });
  const steppedTap = tap(stepped);
  stepped.advance();
  assert.deepEqual(steppedTap.eventsOf('public'), authored.publicEvents);
  assert.deepEqual(steppedTap.eventsOf('seat-2'), authored.targetEvents);
  const [event] = steppedTap.eventsOf('seat-1');
  assert.equal(steppedTap.eventsOf('seat-1').length, 1);
  // The authored event, in an envelope numbered by this script.
  assert.deepEqual({ ...event, eventId: authored.officerEvents[0].eventId }, authored.officerEvents[0]);

  // Sent by the phone: the same fact with the client's own identifier.
  const sent = createScenario({ now: () => 0 });
  const sentTap = tap(sent);
  sent.submitCommand('seat-1', shot('client-command-7'));
  assert.deepEqual(sentTap.eventsOf('public'), []);
  assert.deepEqual(sentTap.eventsOf('seat-2'), []);
  assert.deepEqual(sentTap.eventsOf('seat-1').map(item => [item.viewRevision, item.fact]), [[21, { type: 'COMMAND_REGISTERED', commandId: 'client-command-7' }]]);
  assert.deepEqual(sentTap.brief('public'), ['connected', 'view 10'], 'The table hears nothing at all');
  assert.deepEqual(sentTap.brief('seat-2'), ['connected', 'view 30']);

  // A rejected command writes nothing anywhere.
  const rejected = createScenario({ now: () => 0 });
  const rejectedTap = tap(rejected);
  rejected.planNextCommand('reject-not-allowed');
  rejected.submitCommand('seat-1', shot('client-command-8'));
  for (const audience of AUDIENCES) assert.deepEqual(rejectedTap.eventsOf(audience), []);
});

test('nobody else can tell from their own stream whether a registration happened: not from an event, a revision or an identifier', () => {
  const run = registered => {
    let now = 0;
    const scenario = createScenario({ now: () => now });
    const { feeds } = tap(scenario, ['public', 'seat-2']);
    now += 3_000;
    if (registered) scenario.submitCommand('seat-1', shot('client-command-9', 'seat-2'));
    now += 3_000;
    scenario.endFirstTurn();
    now += 3_000;
    scenario.advance();
    scenario.synthetic('move');
    return feeds;
  };
  assert.deepEqual(run(true), run(false));
});

test('a stream is kept and handed over again whenever a feed comes up, and nothing is delivered while it is down', () => {
  const scenario = createScenario({ now: () => 0 });
  const live = tap(scenario, ['seat-1']);
  scenario.advance();
  scenario.advance();
  assert.deepEqual(live.brief('seat-1'), ['connected', 'view 20', 'view 21', 'event fixture-event-1@21', 'view 22', 'event fixture-event-2@22']);

  // Someone who subscribes now gets the current view and the whole stream.
  const late = tap(scenario, ['seat-1']);
  assert.deepEqual(late.brief('seat-1'), ['connected', 'view 22', 'event fixture-event-1@21', 'event fixture-event-2@22']);

  scenario.setConnected('seat-1', false);
  scenario.advance();
  assert.deepEqual(late.brief('seat-1').slice(4), ['disconnected']);
  scenario.setConnected('seat-1', true);
  assert.deepEqual(late.brief('seat-1').slice(5), ['connected', 'view 23', 'event fixture-event-1@21', 'event fixture-event-2@22', 'event fixture-event-3@23']);

  const count = late.feeds['seat-1'].length;
  scenario.redeliverEvents('seat-1');
  assert.deepEqual(late.brief('seat-1').slice(count), ['event fixture-event-1@21', 'event fixture-event-2@22', 'event fixture-event-3@23']);
  assert.deepEqual(scenario.status().events, { order: 'view-first', stored: { public: 2, 'seat-1': 3, 'seat-2': 2 } });
  assert.throws(() => scenario.redeliverEvents('seat-3'), /Unknown fixture audience/);

  scenario.restart();
  assert.deepEqual(scenario.status().events, { order: 'view-first', stored: { public: 0, 'seat-1': 0, 'seat-2': 0 } }, 'A new match session starts with empty streams');
});

test('the operator can have events delivered before the view they belong to', () => {
  const scenario = createScenario({ now: () => 0 });
  scenario.setEventOrder('event-first');
  assert.equal(scenario.status().events.order, 'event-first');
  const { brief } = tap(scenario, ['public']);
  scenario.advance();
  scenario.advance();
  assert.deepEqual(brief('public'), ['connected', 'view 10', 'event fixture-event-1@11', 'view 11']);
  // On coming up, the stream arrives before the view as well.
  const late = tap(scenario, ['public']);
  assert.deepEqual(late.brief('public'), ['connected', 'event fixture-event-1@11', 'view 11']);
  scenario.setEventOrder('view-first');
  scenario.advance();
  assert.deepEqual(brief('public').slice(4), ['view 12', 'event fixture-event-2@12']);
  assert.throws(() => scenario.setEventOrder('random'), /Unknown event order/);
});

test('the synthetic public facts move one bystander and change one bystander’s status, for every audience alike', () => {
  const scenario = createScenario({ now: () => 0 });
  const { eventsOf } = tap(scenario);
  const seatOf = (audience, seatId) => scenario.viewFor(audience).seats.find(seat => seat.seatId === seatId);
  const untouched = () => JSON.stringify(AUDIENCES.map(audience => scenario.viewFor(audience).seats.filter(seat => seat.seatId !== 'seat-8' && seat.seatId !== 'seat-9')));
  const before = untouched();
  assert.deepEqual(SYNTHETIC_FACTS, ['move', 'status']);

  scenario.synthetic('move');
  scenario.synthetic('status');
  for (const audience of AUDIENCES) {
    assert.deepEqual([seatOf(audience, 'seat-8').location, seatOf(audience, 'seat-9').health], ['Room A', 'Injured']);
    assert.deepEqual(eventsOf(audience).map(event => event.fact), [
      { type: 'PUBLIC_MOVE', seatId: 'seat-8', from: 'Room B', to: 'Room A' },
      { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-9', health: 'Injured' },
    ]);
    assert.deepEqual(schemaFor(audience).parse(scenario.viewFor(audience)), scenario.viewFor(audience));
  }
  scenario.synthetic('move');
  scenario.synthetic('status');
  for (const audience of AUDIENCES) assert.deepEqual([seatOf(audience, 'seat-8').location, seatOf(audience, 'seat-9').health], ['Room B', 'Healthy']);
  assert.equal(untouched(), before, 'Neither the scripted shot’s actor nor its target, nor anyone else, is touched');
  assert.equal(scenario.step().id, 'officer-turn', 'The script itself has not moved');
  assert.deepEqual(scenario.status().revisions, { public: 14, 'seat-1': 24, 'seat-2': 34 });
  assert.throws(() => scenario.synthetic('shot'), /Unknown synthetic fact/);
});

test('bad events can be aimed at one feed to test the client; nothing private goes on the public stream and nothing injected is kept', () => {
  const scenario = createScenario({ now: () => 0 });
  const { eventsOf } = tap(scenario);
  assert.deepEqual(EVENT_INJECTIONS, ['incompatible-protocol', 'unreadable', 'other-audience']);
  for (const audience of AUDIENCES) {
    scenario.injectEvent(audience, 'incompatible-protocol');
    scenario.injectEvent(audience, 'unreadable');
  }
  scenario.injectEvent('seat-2', 'other-audience');
  assert.throws(() => scenario.injectEvent('public', 'other-audience'), /never sent on the public stream/);
  assert.throws(() => scenario.injectEvent('seat-2', 'nonsense'), /Unknown event injection/);
  assert.throws(() => scenario.injectEvent('seat-3', 'unreadable'), /Unknown fixture audience/);

  assert.equal(eventsOf('public').length, 2);
  assert.equal(JSON.stringify(eventsOf('public')).includes('COMMAND_REGISTERED'), false);
  for (const audience of AUDIENCES) {
    const [otherProtocol, unreadable] = eventsOf(audience);
    assert.equal(otherProtocol.protocolVersion, 2);
    assert.equal(eventSchemaFor(audience).safeParse(unreadable).success, false);
  }
  // Seat 2 is handed an event addressed to seat 1, at the revision of seat 2's own view.
  const misdelivered = eventsOf('seat-2')[2];
  assert.deepEqual([misdelivered.audience, misdelivered.viewRevision, misdelivered.fact.type], [{ kind: 'player', seatId: 'seat-1' }, 30, 'COMMAND_REGISTERED']);
  assert.equal(PlayerPresentationEventSchema.safeParse(misdelivered).success, true, 'Well-formed: only the client’s own checks keep it off the screen');
  assert.deepEqual(scenario.status().events.stored, { public: 0, 'seat-1': 0, 'seat-2': 0 });

  // Nothing is sent to a feed that is down, though its stream holds events to hand over.
  scenario.synthetic('move');
  assert.equal(scenario.status().events.stored['seat-1'], 1, 'There is something a redelivery would send');
  scenario.setConnected('seat-1', false);
  const count = eventsOf('seat-1').length;
  scenario.injectEvent('seat-1', 'unreadable');
  scenario.redeliverEvents('seat-1');
  assert.equal(eventsOf('seat-1').length, count);
  // Up again, the same redelivery does send it.
  scenario.setConnected('seat-1', true);
  const up = eventsOf('seat-1').length;
  scenario.redeliverEvents('seat-1');
  assert.equal(eventsOf('seat-1').length, up + 1);
});

test('the registered step follows whatever the operator did before it: revisions never go back and nobody else hears of it', () => {
  // From the authored start it is exactly the authored step.
  const authored = createScenario();
  authored.advance();
  assert.equal(authored.step().id, 'registered');
  for (const [audience, name] of [['public', 'public'], ['seat-1', 'officer'], ['seat-2', 'target']]) {
    assert.deepEqual(authored.viewFor(audience), createOfficerFixture('protected').afterRegistration[name], `${audience}: the authored view after registration`);
  }

  // After synthetic facts moved every view on, the step still only touches the Officer.
  const scenario = createScenario();
  const { feeds } = tap(scenario);
  scenario.synthetic('move');
  scenario.synthetic('status');
  const revisions = { ...scenario.status().revisions };
  const stored = { ...scenario.status().events.stored };
  const seen = Object.fromEntries(AUDIENCES.map(audience => [audience, feeds[audience].length]));
  const others = Object.fromEntries(['public', 'seat-2'].map(audience => [audience, scenario.viewFor(audience)]));
  scenario.advance();
  assert.equal(scenario.step().id, 'registered');
  assert.deepEqual(scenario.status().revisions, { ...revisions, 'seat-1': revisions['seat-1'] + 1 }, 'One revision on for the Officer, and no revision anywhere goes back');
  assert.deepEqual(scenario.status().events.stored, { ...stored, 'seat-1': stored['seat-1'] + 1 }, 'One event, on the Officer’s stream');
  for (const audience of ['public', 'seat-2']) {
    assert.equal(feeds[audience].length, seen[audience], `${audience}: an untouched audience hears nothing`);
    assert.deepEqual(scenario.viewFor(audience), others[audience]);
  }
  const officer = scenario.viewFor('seat-1');
  assert.deepEqual([officer.self.shotAvailable, officer.ownPendingCommandIds.length], [false, 1]);
  assert.equal(PlayerViewSchema.safeParse(officer).success, true);
  // What the synthetic facts changed is still there: the step did not put the authored board back.
  assert.equal(officer.seats.find(seat => seat.seatId === 'seat-8').location, others.public.seats.find(seat => seat.seatId === 'seat-8').location);
  assert.equal(officer.seats.find(seat => seat.seatId === 'seat-9').health, 'Injured');
  // And the rest of the script still runs forward from there.
  scenario.advance();
  scenario.advance();
  const end = scenario.status().revisions;
  for (const audience of AUDIENCES) assert.equal(end[audience] > revisions[audience], true, audience);
});

test('no event and no status line carries server-only truth, and the public stream names no role and no command', () => {
  for (const variant of ['protected', 'unprotected']) {
    let now = 0;
    const scenario = createScenario({ now: () => now, variant });
    const { eventsOf } = tap(scenario);
    scenario.submitCommand('seat-1', shot('secret-command-id', 'seat-4'));
    do { now += 4_000; } while (scenario.advance());
    for (const fact of SYNTHETIC_FACTS) scenario.synthetic(fact);
    for (const audience of AUDIENCES) scenario.redeliverEvents(audience);
    const everything = JSON.stringify([AUDIENCES.map(eventsOf), scenario.status()]);
    for (const secret of ['serverOnly', 'protection', 'grantedBy', 'resolutionExpectation', 'officerOrdinaryShotsRemaining', 'lifetimeReceipts', 'targetSeatId', 'seat-4', ...roles]) {
      assert.equal(everything.includes(secret), false, `${variant}: ${secret}`);
    }
    for (const audience of ['public', 'seat-2']) {
      const stream = JSON.stringify(eventsOf(audience));
      for (const word of ['COMMAND_REGISTERED', 'secret-command-id', 'commandId']) assert.equal(stream.includes(word), false, `${audience}: ${word}`);
    }
    assert.equal(JSON.stringify(scenario.status()).includes('secret-command-id'), false);
  }
});

test('the two variants put identical events on every stream through the whole script', () => {
  const run = variant => {
    let now = 0;
    const scenario = createScenario({ now: () => now, variant });
    const { feeds } = tap(scenario);
    scenario.submitCommand('seat-1', shot('client-command-1'));
    do { now += 7_000; } while (scenario.advance());
    for (const fact of SYNTHETIC_FACTS) scenario.synthetic(fact);
    return feeds;
  };
  assert.deepEqual(run('protected'), run('unprotected'));
});

test('event controls work over HTTP, refuse what the script does not know, and show counts only', async t => {
  const { origin, devServer } = await withServer(t);
  const send = (path, body = {}) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const post = async (path, body) => {
    const response = await send(path, body);
    assert.equal(response.status, 200, path);
    return response.json();
  };
  const { eventsOf } = tap(devServer.scenario);

  let status = await post('/api/operator/synthetic', { fact: 'move' });
  assert.deepEqual(status.events, { order: 'view-first', stored: { public: 1, 'seat-1': 1, 'seat-2': 1 } });
  status = await post('/api/operator/synthetic', { fact: 'status' });
  assert.deepEqual(status.revisions, { public: 12, 'seat-1': 22, 'seat-2': 32 });
  status = await post('/api/operator/event-order', { order: 'event-first' });
  assert.equal(status.events.order, 'event-first');
  await post('/api/operator/redeliver-events', { audience: 'seat-2' });
  assert.deepEqual([eventsOf('public').length, eventsOf('seat-1').length, eventsOf('seat-2').length], [2, 2, 4]);
  await post('/api/operator/redeliver-events', { audience: 'all' });
  assert.deepEqual([eventsOf('public').length, eventsOf('seat-1').length, eventsOf('seat-2').length], [4, 4, 6]);
  await post('/api/operator/inject-event', { audience: 'seat-2', kind: 'other-audience' });
  await post('/api/operator/inject-event', { audience: 'public', kind: 'unreadable' });
  assert.equal(eventsOf('seat-2').at(-1).audience.seatId, 'seat-1');
  assert.equal(JSON.stringify(eventsOf('public')).includes('COMMAND_REGISTERED'), false);

  for (const [path, body] of [
    ['/api/operator/synthetic', { fact: 'shot' }], ['/api/operator/synthetic', {}],
    ['/api/operator/event-order', { order: 'shuffled' }],
    ['/api/operator/redeliver-events', { audience: 'seat-9' }],
    ['/api/operator/inject-event', { kind: 'unreadable' }], ['/api/operator/inject-event', { kind: 'unreadable', audience: 'all' }],
    ['/api/operator/inject-event', { kind: 'other-audience', audience: 'public' }], ['/api/operator/inject-event', { kind: 'nonsense', audience: 'seat-1' }],
  ]) assert.equal((await send(path, body)).status, 400, `${path} ${JSON.stringify(body)}`);

  status = await post('/api/operator/restart', {});
  assert.deepEqual(status.events, { order: 'view-first', stored: { public: 0, 'seat-1': 0, 'seat-2': 0 } });
});
