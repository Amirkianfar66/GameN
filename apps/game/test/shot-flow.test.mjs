import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerViewSchema, ReceiptLookupRequestSchema, RegisterShotSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerApiClient, createShotFlow, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { createFakeHost, createFakeTransport, flush } from './support/fakes.mjs';

const { before, afterRegistration } = createOfficerFixture('protected');
const SERVER_EPOCH = before.public.phase.startedAt;
const CANDIDATES = ['seat-2', 'seat-3', 'seat-4', 'seat-6'];
const GUARD = DEFAULT_SHOT_FLOW_TIMING.confirmGuardMs;
const [FIRST, SECOND, THIRD] = DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs;

/** Frontend-authored synthetic variations, each still valid against the contract schema. */
function variant(view, change) {
  const copy = structuredClone(view);
  change(copy);
  return PlayerViewSchema.parse(copy);
}
const listing = (view, commandId) => variant(view, v => { v.viewRevision += 1; v.self.shotAvailable = false; v.ownPendingCommandIds = [commandId]; });
const nextPhase = view => variant(view, v => {
  v.viewRevision += 5;
  v.phase = { id: 'phase-b', kind: 'ORDINARY_TURN', startedAt: v.phase.endsAt, endsAt: v.phase.endsAt + 60_000 };
  v.activeSeatId = 'seat-2';
});

function setup(options = {}) {
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host);
  const ports = options.ids ? { ...host.ports, ids: options.ids } : host.ports;
  const api = createPlayerApiClient(fake.transport, ports, 8_000);
  const flow = createShotFlow({ api, ports, timing: options.timing });
  let notified = 0;
  flow.subscribe(() => { notified += 1; });
  const context = (overrides = {}) => ({ view: before.officer, canAct: true, candidates: CANDIDATES, panelOpen: true, current: true, foreground: true, ...overrides });
  flow.observe(context());

  const time = () => host.serverNow();
  const receipt = (command, status, code) => ({
    protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId, commandId: command.commandId, status, code,
  });
  const answers = {
    accepted: command => ({ ok: true, serverTimeMs: time(), receipt: receipt(command, 'accepted', 'REGISTERED') }),
    rejected: code => command => ({ ok: true, serverTimeMs: time(), receipt: receipt(command, 'rejected', code) }),
    failure: code => () => ({ ok: false, serverTimeMs: time(), error: { code } }),
    lost: () => Promise.reject(new Error('connection lost')),
    silent: () => new Promise(() => {}),
    unknown: () => ({ status: 'unknown', serverTimeMs: time() }),
    found: (status, code) => request => ({
      status: 'found', serverTimeMs: time(),
      receipt: { ...receipt({ ...request, phaseId: fake.calls.submitCommand[0].phaseId }, status, code) },
    }),
  };
  const onSubmit = answer => { fake.respond.submitCommand = async command => answer(command); };
  const onLookup = answer => { fake.respond.lookupReceipt = async request => answer(request); };

  /** Walks to the confirm step for Player 2 and waits out the double-tap guard. */
  async function readyToConfirm(seatId = 'seat-2') {
    assert.equal(flow.open(), true);
    assert.equal(flow.chooseTarget(seatId), true);
    await host.advance(GUARD);
  }
  async function send(seatId) {
    await readyToConfirm(seatId);
    assert.equal(flow.confirm(), true);
    await flush();
  }
  return { host, fake, flow, context, answers, onSubmit, onLookup, readyToConfirm, send, notified: () => notified, sent: () => fake.calls.submitCommand, looked: () => fake.calls.lookupReceipt };
}

test('choosing is local: the flow walks to the confirm step and back without sending anything or telling anyone', async () => {
  const { flow, sent, looked, notified } = setup();
  assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: null });
  // Nothing but the first step is reachable from idle.
  for (const attempt of [() => flow.chooseTarget('seat-2'), () => flow.confirm(), () => flow.back(), () => flow.checkAgain(), () => flow.dismiss()]) assert.equal(attempt(), false);
  assert.equal(flow.open(), true);
  assert.equal(flow.open(), false);
  assert.deepEqual(flow.getState(), { step: 'targeting' });
  // Only a seat that was offered can be chosen.
  for (const seatId of ['seat-1', 'seat-5', 'seat-9']) assert.equal(flow.chooseTarget(seatId), false, seatId);
  assert.equal(flow.chooseTarget('seat-3'), true);
  assert.deepEqual(flow.getState(), { step: 'confirming', targetSeatId: 'seat-3' });
  assert.equal(flow.back(), true);
  assert.deepEqual(flow.getState(), { step: 'targeting' });
  assert.equal(flow.chooseTarget('seat-2'), true);
  assert.equal(flow.back(), true);
  assert.equal(flow.back(), true);
  assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: null });
  assert.deepEqual([sent().length, looked().length, notified()], [0, 0, 0]);
});

test('a confirmation sends one well-formed command built from the view, with a fresh identifier and nothing else', async () => {
  const { host, flow, sent, readyToConfirm } = setup();
  await readyToConfirm('seat-4');
  assert.equal(flow.confirm(), true);
  assert.deepEqual(flow.getState(), { step: 'submitting', targetSeatId: 'seat-4' });
  assert.equal(sent().length, 1, 'The request leaves as the control is activated, not a tick later');
  const [command] = sent();
  assert.deepEqual(command, {
    protocolVersion: 1, matchId: before.officer.matchId, phaseId: before.officer.phase.id, commandId: 'command-1',
    command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' },
  });
  // Strict schema: no actor, role, clock or outcome field could ride along.
  assert.deepEqual(RegisterShotSchema.parse(command), command);
  assert.deepEqual(host.issuedIds, ['command-1']);
});

test('one confirmation, one command: a second activation, or the second tap of a double tap, sends nothing', async () => {
  const { host, flow, sent, onSubmit, answers } = setup();
  onSubmit(answers.silent);
  flow.open();
  flow.chooseTarget('seat-2');
  // The confirm control has only just appeared under the finger that chose the target.
  assert.equal(flow.confirm(), false);
  await host.advance(GUARD - 1);
  assert.equal(flow.confirm(), false);
  assert.equal(sent().length, 0);
  await host.advance(1);
  assert.equal(flow.confirm(), true);
  assert.equal(flow.confirm(), false);
  assert.equal(flow.confirm(), false);
  assert.equal(sent().length, 1);
  // While the command is unresolved there is no way to start over, pick someone else or walk away from it.
  for (const attempt of [() => flow.open(), () => flow.chooseTarget('seat-3'), () => flow.back(), () => flow.dismiss(), () => flow.checkAgain()]) assert.equal(attempt(), false);
  assert.deepEqual(flow.getState(), { step: 'submitting', targetSeatId: 'seat-2' });
  assert.equal(sent().length, 1);
  assert.deepEqual(host.issuedIds, ['command-1']);
});

test('a receipt is the server’s word: accepted registers, rejected says which rejection', async () => {
  const accepted = setup();
  accepted.onSubmit(accepted.answers.accepted);
  await accepted.send();
  assert.deepEqual(accepted.flow.getState(), { step: 'registered', targetSeatId: 'seat-2' });
  assert.equal(accepted.notified(), 1);
  assert.equal(accepted.looked().length, 0, 'An answered command needs no reconciliation');

  for (const code of ['PHASE_CLOSED', 'NOT_ALLOWED']) {
    const rejected = setup();
    rejected.onSubmit(rejected.answers.rejected(code));
    await rejected.send();
    assert.deepEqual(rejected.flow.getState(), { step: 'rejected', targetSeatId: 'seat-2', code });
    // Terminal for that identifier: it is never sent again.
    await rejected.host.advance(60_000);
    assert.equal(rejected.sent().length, 1);
    assert.equal(rejected.looked().length, 0);
  }
});

test('on the only attempt, a safe error that commits nothing settles as not registered; UNAVAILABLE does not', async () => {
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT']) {
    const { host, flow, send, sent, looked, onSubmit, answers } = setup();
    onSubmit(answers.failure(code));
    await send();
    assert.deepEqual(flow.getState(), { step: 'not-registered', targetSeatId: 'seat-2', reason: code });
    await host.advance(60_000);
    assert.deepEqual([sent().length, looked().length], [1, 0], `${code}: the command is never sent again, so it cannot become registered later`);
  }
  const { flow, send, onSubmit, answers } = setup();
  onSubmit(answers.failure('UNAVAILABLE'));
  await send();
  assert.deepEqual(flow.getState(), { step: 'checking', targetSeatId: 'seat-2' }, 'The outcome of that attempt is unknown');
});

test('no answer is never taken as failure: the receipt is looked up, by identifiers only', async () => {
  const silences = {
    'the connection failed': s => s.onSubmit(s.answers.lost),
    'nothing came back in time': s => s.onSubmit(s.answers.silent),
    'the answer could not be read': s => s.onSubmit(() => ({ ok: true, receipt: 'garbled' })),
    'the answer was about another command': s => s.onSubmit(command => s.answers.accepted({ ...command, commandId: 'someone-elses' })),
  };
  for (const [name, arrange] of Object.entries(silences)) {
    const s = setup();
    arrange(s);
    s.onLookup(s.answers.found('accepted', 'REGISTERED'));
    await s.readyToConfirm();
    s.flow.confirm();
    // Long enough for a request that never answers to time out.
    await s.host.advance(8_000);
    assert.deepEqual(s.flow.getState(), { step: 'checking', targetSeatId: 'seat-2' }, name);
    assert.equal(s.looked().length, 0, 'The first check waits a moment');
    await s.host.advance(FIRST);
    assert.deepEqual(s.flow.getState(), { step: 'registered', targetSeatId: 'seat-2' }, name);
    // The lookup carries the match and command identifiers and nothing about the choice.
    assert.deepEqual(s.looked(), [{ protocolVersion: 1, matchId: before.officer.matchId, commandId: 'command-1' }]);
    assert.deepEqual(ReceiptLookupRequestSchema.parse(s.looked()[0]), s.looked()[0]);
    assert.equal(s.sent().length, 1, 'A receipt was found, so nothing was sent again');
  }
});

test('with no receipt yet, the identical command is sent again: same identifier, same payload, never a new one', async () => {
  const { host, flow, send, sent, looked, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  onLookup(answers.unknown);
  await send('seat-3');
  assert.equal(flow.getState().step, 'checking');
  // Round one: no receipt, so the same command goes again, and is lost again.
  await host.advance(FIRST);
  assert.deepEqual([looked().length, sent().length], [1, 2]);
  onSubmit(answers.accepted);
  await host.advance(SECOND);
  assert.deepEqual([looked().length, sent().length], [2, 3]);
  assert.deepEqual(flow.getState(), { step: 'registered', targetSeatId: 'seat-3' });
  for (const command of sent()) assert.deepEqual(command, sent()[0]);
  assert.deepEqual(host.issuedIds, ['command-1'], 'One choice, one identifier, however many times it is sent');
});

test('a command that arrives after its phase closed ends as the server’s stored rejection, not as a guess', async () => {
  const { host, flow, context, send, sent, onSubmit, onLookup, answers, looked } = setup();
  onSubmit(answers.lost);
  onLookup(() => Promise.reject(new Error('offline')));
  await send();
  // The turn ends while the outcome is still unknown. The client concludes nothing from that.
  flow.observe(context({ view: nextPhase(before.officer), canAct: false }));
  assert.equal(flow.getState().step, 'checking');
  assert.equal(looked().length, 1, 'A new phase is a reason to ask again at once');
  // That check finds the server unreachable. The next one gets through: no receipt exists,
  // the identical command is sent again, and the server rejects it durably.
  await flush();
  onLookup(answers.unknown);
  onSubmit(answers.rejected('PHASE_CLOSED'));
  await host.advance(FIRST);
  assert.deepEqual(flow.getState(), { step: 'rejected', targetSeatId: 'seat-2', code: 'PHASE_CLOSED' });
  assert.deepEqual(sent()[1], sent()[0]);
});

test('automatic checking is bounded, never sends into silence, and then admits it does not know', async () => {
  const { host, flow, send, sent, looked, onSubmit, onLookup, answers, notified } = setup();
  onSubmit(answers.lost);
  onLookup(answers.lost);
  await send();
  assert.equal(notified(), 1);
  await host.advance(FIRST);
  assert.equal(looked().length, 1);
  assert.equal(flow.getState().step, 'checking');
  await host.advance(SECOND);
  assert.equal(looked().length, 2);
  assert.equal(flow.getState().step, 'checking');
  await host.advance(THIRD);
  assert.equal(looked().length, 3);
  assert.deepEqual(flow.getState(), { step: 'unknown', targetSeatId: 'seat-2' });
  assert.equal(notified(), 2);
  assert.equal(sent().length, 1, 'The server could not be asked, so the command was not sent again');
  // It stops there. Nothing happens until someone has a reason to ask again.
  await host.advance(600_000);
  assert.deepEqual([looked().length, sent().length, host.pendingTimers()], [3, 1, 0]);
  assert.equal(flow.getState().step, 'unknown');

  // A safe error from the lookup is no answer about the command either.
  const refused = setup();
  refused.onSubmit(refused.answers.failure('UNAVAILABLE'));
  refused.onLookup(refused.answers.failure('FORBIDDEN'));
  await refused.send();
  await refused.host.advance(FIRST + SECOND + THIRD);
  assert.equal(refused.flow.getState().step, 'unknown');
  assert.equal(refused.sent().length, 1);
});

test('Check again asks once more on request, and settles as soon as the server can answer', async () => {
  const { host, flow, send, sent, looked, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  onLookup(answers.lost);
  await send();
  await host.advance(FIRST + SECOND + THIRD);
  assert.equal(flow.getState().step, 'unknown');
  assert.equal(flow.checkAgain(), true);
  assert.equal(flow.getState().step, 'checking');
  assert.equal(looked().length, 4, 'Asked immediately');
  assert.equal(flow.checkAgain(), false, 'Not while a check is already under way');
  await flush();
  assert.equal(flow.getState().step, 'unknown', 'One request, one round');
  await host.advance(60_000);
  assert.equal(looked().length, 4);

  onLookup(answers.unknown);
  onSubmit(answers.accepted);
  assert.equal(flow.checkAgain(), true);
  await flush();
  assert.deepEqual(flow.getState(), { step: 'registered', targetSeatId: 'seat-2' });
  assert.deepEqual(sent()[1], sent()[0]);
});

test('reconnecting, returning to the foreground or a new phase each restart the checks at once', async () => {
  const triggers = {
    reconnect: s => { s.flow.observe(s.context({ current: false })); s.flow.observe(s.context({ current: true })); },
    foreground: s => { s.flow.observe(s.context({ foreground: false, panelOpen: false })); s.flow.observe(s.context({ foreground: true, panelOpen: false })); },
    'new phase': s => { s.flow.observe(s.context({ view: nextPhase(before.officer), canAct: false })); },
  };
  for (const [name, trigger] of Object.entries(triggers)) {
    const s = setup();
    s.onSubmit(s.answers.lost);
    s.onLookup(s.answers.lost);
    await s.send();
    await s.host.advance(FIRST + SECOND + THIRD);
    assert.equal(s.flow.getState().step, 'unknown', name);
    const asked = s.looked().length;
    s.onLookup(s.answers.found('accepted', 'REGISTERED'));
    trigger(s);
    assert.equal(s.flow.getState().step, 'checking', name);
    assert.equal(s.looked().length, asked + 1, `${name}: asked without waiting`);
    await flush();
    assert.deepEqual(s.flow.getState(), { step: 'registered', targetSeatId: 'seat-2' }, name);
  }

  // Seeing the same state again is not a reason, and the first attempt is never raced.
  const steady = setup();
  steady.onSubmit(steady.answers.silent);
  await steady.readyToConfirm();
  steady.flow.confirm();
  steady.flow.observe(steady.context({ current: false }));
  steady.flow.observe(steady.context({ current: true }));
  steady.flow.observe(steady.context({ view: nextPhase(before.officer), canAct: false }));
  assert.equal(steady.looked().length, 0);
  assert.equal(steady.flow.getState().step, 'submitting');
});

test('a restarted check gets a full budget again and does not run two checks at once', async () => {
  const { host, flow, context, send, looked, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  onLookup(answers.silent);
  await send();
  await host.advance(FIRST);
  assert.equal(looked().length, 1, 'One lookup is waiting on the server');
  // The connection comes back while that lookup is still out.
  flow.observe(context({ current: false }));
  flow.observe(context({ current: true }));
  assert.equal(looked().length, 1, 'It is not doubled');
  // It times out; the budget granted by the reconnect is then spent, one round at a time.
  await host.advance(8_000);
  for (let round = 0; round < 6 && flow.getState().step === 'checking'; round += 1) await host.advance(8_000 + THIRD);
  assert.equal(flow.getState().step, 'unknown');
  assert.equal(looked().length, 1 + DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs.length);
});

test('the player’s own view settles a command: listed means registered, whatever arrives afterwards', async () => {
  const { host, flow, context, readyToConfirm, onSubmit, notified } = setup();
  let release;
  onSubmit(command => new Promise(resolve => { release = () => resolve({ ok: true, serverTimeMs: host.serverNow(), receipt: { protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId, commandId: command.commandId, status: 'rejected', code: 'NOT_ALLOWED' } }); }));
  await readyToConfirm();
  flow.confirm();
  // The view listing the command gets here before the answer to the request does.
  flow.observe(context({ view: listing(before.officer, 'command-1'), canAct: false }));
  assert.deepEqual(flow.getState(), { step: 'registered', targetSeatId: 'seat-2' });
  assert.equal(notified(), 0, 'The caller that brought the view reads the state itself');
  release();
  await flush();
  assert.deepEqual(flow.getState(), { step: 'registered', targetSeatId: 'seat-2' }, 'A late answer about a settled command changes nothing');
  assert.equal(notified(), 0);

  // A view that lists some other command says nothing about this one.
  const other = setup();
  other.onSubmit(other.answers.silent);
  await other.readyToConfirm();
  other.flow.confirm();
  other.flow.observe(other.context({ view: listing(before.officer, 'not-this-one'), canAct: false }));
  assert.equal(other.flow.getState().step, 'submitting');
});

test('a receipt that cannot belong to the command is not believed', async () => {
  const { host, flow, send, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  // Right identifier, wrong phase: the lookup response format cannot rule this out by itself.
  onLookup(request => ({ status: 'found', serverTimeMs: host.serverNow(), receipt: { protocolVersion: 1, matchId: request.matchId, phaseId: 'phase-z', commandId: request.commandId, status: 'accepted', code: 'REGISTERED' } }));
  await send();
  await host.advance(FIRST + SECOND + THIRD);
  assert.equal(flow.getState().step, 'unknown');
});

test('a choice that was not sent does not outlive the conditions it was made under', async () => {
  const dropped = {
    'the panel closes': { panelOpen: false },
    'the page is backgrounded': { panelOpen: false, foreground: false },
    'the connection is lost': { canAct: false, current: false },
    'the turn ends': { canAct: false },
  };
  for (const [name, change] of Object.entries(dropped)) {
    for (const step of ['targeting', 'confirming']) {
      const { flow, context, sent } = setup();
      flow.open();
      if (step === 'confirming') flow.chooseTarget('seat-2');
      flow.observe(context(change));
      assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: null }, `${name}, ${step}`);
      // And it does not come back when the condition does.
      flow.observe(context());
      assert.equal(flow.getState().step, 'idle', name);
      assert.equal(flow.confirm(), false);
      assert.equal(sent().length, 0);
    }
  }
  // The chosen player is no longer offered: the choice is asked for again, never sent.
  const { host, flow, context, sent } = setup();
  flow.open();
  flow.chooseTarget('seat-2');
  await host.advance(GUARD);
  flow.observe(context({ candidates: ['seat-3', 'seat-4'] }));
  assert.deepEqual(flow.getState(), { step: 'targeting' });
  assert.equal(flow.confirm(), false);
  assert.equal(sent().length, 0);
});

test('nothing can be started or sent while the interface would not allow it', async () => {
  for (const blocked of [{ canAct: false }, { panelOpen: false }, { view: null }]) {
    const { flow, context } = setup();
    flow.observe(context(blocked));
    assert.equal(flow.open(), false, JSON.stringify(blocked));
  }
  // The gate closes in the instant before the confirmation: nothing is sent.
  const { host, flow, context, sent } = setup();
  flow.open();
  flow.chooseTarget('seat-2');
  await host.advance(GUARD);
  flow.observe(context({ canAct: false }));
  assert.equal(flow.confirm(), false);
  assert.equal(sent().length, 0);
});

test('the registered target is remembered in memory only while the view still stands behind it', async () => {
  const { flow, context, send, onSubmit, answers } = setup();
  onSubmit(answers.accepted);
  await send('seat-4');
  assert.equal(flow.dismiss(), true);
  // The receipt beat the view: the view on screen still calls the shot available.
  assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: 'seat-4' });
  assert.equal(flow.open(), false, 'This device’s own accepted command is newer than its view');
  flow.observe(context());
  assert.equal(flow.open(), false);
  // The view catches up and lists the command.
  flow.observe(context({ view: listing(before.officer, 'command-1'), canAct: false }));
  assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: 'seat-4' });
  // It stays remembered across a phase change for as long as the view lists it.
  const laterListed = variant(nextPhase(before.officer), v => { v.self.shotAvailable = false; v.ownPendingCommandIds = ['command-1']; });
  flow.observe(context({ view: laterListed, canAct: false }));
  assert.equal(flow.getState().registeredTargetSeatId, 'seat-4');
  // Once the view no longer lists it, the memory goes with it.
  flow.observe(context({ view: variant(laterListed, v => { v.viewRevision += 1; v.ownPendingCommandIds = []; }), canAct: false }));
  assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: null });

  // Never listed at all, and the phase moved on: nothing stands behind the memory.
  const unlisted = setup();
  unlisted.onSubmit(unlisted.answers.accepted);
  await unlisted.send();
  unlisted.flow.dismiss();
  unlisted.flow.observe(unlisted.context({ view: nextPhase(before.officer), canAct: false }));
  assert.deepEqual(unlisted.flow.getState(), { step: 'idle', registeredTargetSeatId: null });
});

test('after a rejection the player can choose again, and that is a new command with a new identifier', async () => {
  const { host, flow, send, sent, onSubmit, answers } = setup();
  onSubmit(answers.rejected('NOT_ALLOWED'));
  await send('seat-2');
  assert.equal(flow.dismiss(), true);
  assert.deepEqual(flow.getState(), { step: 'idle', registeredTargetSeatId: null });
  onSubmit(answers.accepted);
  await send('seat-3');
  assert.deepEqual(flow.getState(), { step: 'registered', targetSeatId: 'seat-3' });
  assert.deepEqual(sent().map(command => [command.commandId, command.command.targetSeatId]), [['command-1', 'seat-2'], ['command-2', 'seat-3']]);
  assert.deepEqual(host.issuedIds, ['command-1', 'command-2']);
});

test('a command that cannot be named properly is never sent', async () => {
  const sources = {
    'the source fails': { next() { throw new Error('no entropy'); } },
    'an empty identifier': { next: () => '' },
    'an identifier the contract refuses': { next: () => 'not a valid id!' },
    'not a string': { next: () => 42 },
  };
  for (const [name, ids] of Object.entries(sources)) {
    const { flow, readyToConfirm, sent } = setup({ ids });
    await readyToConfirm();
    assert.equal(flow.confirm(), true, name);
    assert.deepEqual(flow.getState(), { step: 'not-registered', targetSeatId: 'seat-2', reason: 'NOT_SENT' }, name);
    assert.equal(sent().length, 0, name);
  }
  // A repeated identifier could make the server answer a new choice with an old receipt.
  const { flow, send, readyToConfirm, sent, onSubmit, answers } = setup({ ids: { next: () => 'same-every-time' } });
  onSubmit(answers.rejected('NOT_ALLOWED'));
  await send('seat-2');
  flow.dismiss();
  await readyToConfirm('seat-3');
  flow.confirm();
  assert.deepEqual(flow.getState(), { step: 'not-registered', targetSeatId: 'seat-3', reason: 'NOT_SENT' });
  assert.equal(sent().length, 1);
});

test('a disposed flow does nothing more: no timers, no checks, no word of late answers', async () => {
  const { host, flow, send, looked, onSubmit, onLookup, answers, notified } = setup();
  onSubmit(answers.lost);
  onLookup(answers.found('accepted', 'REGISTERED'));
  await send();
  assert.equal(host.pendingTimers(), 1);
  const told = notified();
  flow.dispose();
  flow.dispose();
  assert.equal(host.pendingTimers(), 0);
  await host.advance(60_000);
  assert.equal(looked().length, 0);
  assert.equal(notified(), told);
  for (const attempt of [() => flow.open(), () => flow.back(), () => flow.confirm(), () => flow.checkAgain(), () => flow.dismiss()]) assert.equal(attempt(), false);
});

test('timing values are client parameters that a host may tune; none of them is a rule', async () => {
  const { host, flow, send, looked, onSubmit, onLookup, answers } = setup({ timing: { confirmGuardMs: GUARD, recheckDelaysMs: [50] } });
  onSubmit(answers.lost);
  onLookup(answers.lost);
  await send();
  await host.advance(50);
  assert.equal(looked().length, 1);
  assert.equal(flow.getState().step, 'unknown', 'One delay configured, one automatic check');
  assert.deepEqual(DEFAULT_SHOT_FLOW_TIMING, { confirmGuardMs: 400, recheckDelaysMs: [1_000, 2_000, 4_000] });
  assert.equal(afterRegistration.officer.ownPendingCommandIds.length, 1);
});
