import assert from 'node:assert/strict';
import { request } from 'node:http';
import test from 'node:test';
import {
  ApiFailureSchema, CommandResponseSchema, PlayerViewSchema, PublicViewSchema, ReceiptLookupResponseSchema, RoleSchema, ServerTimeResponseSchema,
} from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerScreen, createTableScreen } from '@mothership/game';
import { renderPlayerShell, renderTableShell, toHtml } from '@mothership/presentation';
import { createFixtureTransport } from '../dev/fixture/fixture-transport.mjs';
import { AUDIENCES, COMMAND_PLANS, createScenario, SLOW_ANSWER_MS, STEPS } from '../dev/fixture/scenario.mjs';
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
  const pending = firstEvents(origin, 'seat-1', 3);
  await new Promise(resolve => setTimeout(resolve, 50));
  devServer.scenario.advance();
  devServer.scenario.restart();
  const events = await pending;
  assert.deepEqual(events.map(event => event.name), ['payload', 'payload', 'restart']);
  assert.deepEqual(events[1].data.ownPendingCommandIds, ['fixture-command-1']);

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
