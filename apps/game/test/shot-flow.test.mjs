import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerViewSchema, ReceiptLookupRequestSchema, RegisterShotSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerApiClient, createShotFlow, DEFAULT_SHOT_FLOW_TIMING } from '@mothership/game';
import { createFakeHost, createFakeTransport, flush } from './support/fakes.mjs';

const { before } = createOfficerFixture('protected');
const MATCH = before.officer.matchId;
const SERVER_EPOCH = before.public.phase.startedAt;
const CANDIDATES = ['seat-2', 'seat-3', 'seat-4', 'seat-6'];
const GUARD = DEFAULT_SHOT_FLOW_TIMING.controlGuardMs;
const [FIRST, SECOND, THIRD] = DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs;
const ROUNDS = DEFAULT_SHOT_FLOW_TIMING.recheckDelaysMs.length;

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
  const host = options.host ?? createFakeHost({ serverStart: SERVER_EPOCH });
  const fake = createFakeTransport(host);
  const ports = { ...host.ports, ...(options.ids ? { ids: options.ids } : {}), ...(options.unresolved ? { unresolved: options.unresolved } : {}) };
  const api = createPlayerApiClient(fake.transport, ports, 8_000);
  const flow = createShotFlow({ api, ports, matchId: options.matchId ?? MATCH, timing: options.timing });
  let notified = 0;
  flow.subscribe(() => { notified += 1; });
  const context = (overrides = {}) => ({ view: before.officer, canAct: true, candidates: CANDIDATES, panelOpen: true, current: true, foreground: true, ...overrides });
  if (options.observe !== false) flow.observe(context());

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
    /** A stored receipt for the command, in the phase it was sent in unless another is named. */
    found: (status, code, phaseId = before.officer.phase.id) => request => ({ status: 'found', serverTimeMs: time(), receipt: receipt({ ...request, phaseId }, status, code) }),
  };
  const onSubmit = answer => { fake.respond.submitCommand = async command => answer(command); };
  const onLookup = answer => { fake.respond.lookupReceipt = async request => answer(request); };

  /** Walks to the confirm step for a seat and waits until its control is active. */
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
  /** The state without the flag that only says whether its control is active yet. */
  const step = () => {
    const { armed, ...rest } = flow.getState();
    return rest;
  };
  return { host, fake, flow, context, answers, onSubmit, onLookup, readyToConfirm, send, step, notified: () => notified, sent: () => fake.calls.submitCommand, looked: () => fake.calls.lookupReceipt };
}

const IDLE = { step: 'idle', registered: null };
const CHECKING = { step: 'checking', recovered: false };
const UNKNOWN = { step: 'unknown', recovered: false, phaseOver: false };
const everyIntent = flow => [() => flow.open(), () => flow.chooseTarget('seat-3'), () => flow.back(), () => flow.confirm(), () => flow.checkAgain(), () => flow.dismiss()];

test('choosing is local: the flow walks to the confirm step and back without sending anything or telling anyone', async () => {
  const { flow, step, sent, looked, notified } = setup();
  assert.deepEqual(flow.getState(), IDLE);
  // Nothing but the first step is reachable from idle.
  for (const attempt of [() => flow.chooseTarget('seat-2'), () => flow.confirm(), () => flow.back(), () => flow.checkAgain(), () => flow.dismiss()]) assert.equal(attempt(), false);
  assert.equal(flow.open(), true);
  assert.equal(flow.open(), false);
  assert.deepEqual(flow.getState(), { step: 'targeting' });
  // Only a seat that was offered can be chosen.
  for (const seatId of ['seat-1', 'seat-5', 'seat-9']) assert.equal(flow.chooseTarget(seatId), false, seatId);
  assert.equal(flow.chooseTarget('seat-3'), true);
  assert.deepEqual(step(), { step: 'confirming', targetSeatId: 'seat-3' });
  assert.equal(flow.back(), true);
  assert.deepEqual(flow.getState(), { step: 'targeting' });
  assert.equal(flow.chooseTarget('seat-2'), true);
  assert.equal(flow.back(), true);
  assert.equal(flow.back(), true);
  assert.deepEqual(flow.getState(), IDLE);
  assert.deepEqual([sent().length, looked().length, notified()], [0, 0, 0]);
});

test('a confirmation sends one well-formed command built from the view, with a fresh identifier and nothing else', async () => {
  const { host, flow, step, sent, readyToConfirm } = setup();
  await readyToConfirm('seat-4');
  assert.equal(flow.confirm(), true);
  assert.deepEqual(step(), { step: 'submitting' });
  assert.equal(sent().length, 1, 'The request leaves as the control is activated, not a tick later');
  const [command] = sent();
  assert.deepEqual(command, {
    protocolVersion: 1, matchId: MATCH, phaseId: before.officer.phase.id, commandId: 'command-1',
    command: { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' },
  });
  // Strict schema: no actor, role, clock or outcome field could ride along.
  assert.deepEqual(RegisterShotSchema.parse(command), command);
  assert.deepEqual(host.issuedIds, ['command-1']);
});

test('a command carries the phase its choice was made in, whatever that phase is called', async () => {
  const ownTurnLater = variant(before.officer, v => { v.viewRevision += 9; v.round = 3; v.phase = { id: 'round-3-turn-1', kind: 'ORDINARY_TURN', startedAt: v.phase.endsAt + 600_000, endsAt: v.phase.endsAt + 660_000 }; });
  const { flow, context, sent, readyToConfirm } = setup({ observe: false });
  flow.observe(context({ view: ownTurnLater }));
  await readyToConfirm('seat-3');
  flow.observe(context({ view: ownTurnLater }));
  assert.equal(flow.confirm(), true);
  assert.equal(sent()[0].phaseId, 'round-3-turn-1');
});

test('a control that has just appeared does nothing yet, and the flow says when it becomes active', async () => {
  const { host, flow, sent, onSubmit, answers, notified } = setup();
  onSubmit(answers.silent);
  flow.open();
  flow.chooseTarget('seat-2');
  // The confirm control has only just appeared under the finger that chose the target.
  assert.equal(flow.getState().armed, false);
  assert.equal(flow.confirm(), false);
  await host.advance(GUARD - 1);
  assert.equal(flow.getState().armed, false);
  assert.equal(flow.confirm(), false);
  assert.equal(sent().length, 0);
  assert.equal(notified(), 0);
  await host.advance(1);
  assert.equal(flow.getState().armed, true);
  assert.equal(notified(), 1, 'Told once, so the control can be redrawn as active');
  assert.equal(flow.confirm(), true);
  assert.equal(sent().length, 1);
  // A timer that fires a moment early by the clock must not leave the control drawn as
  // inactive: nothing else would come along to redraw it.
  const real = createFakeHost({ serverStart: SERVER_EPOCH });
  const hasty = { ...real.ports.scheduler, setTimeout: (callback, delayMs) => real.ports.scheduler.setTimeout(callback, delayMs - 1) };
  const early = setup({ host: { ...real, ports: { ...real.ports, scheduler: hasty }, serverNow: () => real.serverNow() } });
  early.flow.open();
  early.flow.chooseTarget('seat-2');
  await real.advance(GUARD - 1);
  assert.equal(early.notified(), 1, 'The timer has fired, a millisecond before the clock says the wait is over');
  assert.equal(early.flow.getState().armed, true);
  // Going back and choosing again starts the wait again.
  const again = setup();
  again.flow.open();
  again.flow.chooseTarget('seat-2');
  await again.host.advance(GUARD);
  again.flow.back();
  again.flow.chooseTarget('seat-3');
  assert.equal(again.flow.getState().armed, false);
  assert.equal(again.flow.confirm(), false);
});

test('one confirmation, one command; and while its outcome is open there is no way to start over or walk away', async () => {
  const { host, flow, step, context, sent, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  onLookup(answers.lost);
  flow.open();
  flow.chooseTarget('seat-2');
  await host.advance(GUARD);
  assert.equal(flow.confirm(), true);
  assert.equal(flow.confirm(), false);
  assert.equal(flow.confirm(), false);
  assert.equal(sent().length, 1);
  // Submitting: nothing is accepted.
  for (const attempt of everyIntent(flow)) assert.equal(attempt(), false);
  assert.deepEqual(step(), { step: 'submitting' });
  await flush();
  // Checking: the same.
  assert.deepEqual(step(), CHECKING);
  for (const attempt of everyIntent(flow)) assert.equal(attempt(), false);
  await host.advance(FIRST + SECOND + THIRD + GUARD);
  // Unknown, with the command's phase still open: only another check is offered. A changed
  // target would be a second command while the first might still land.
  assert.deepEqual(step(), UNKNOWN);
  for (const attempt of [() => flow.open(), () => flow.chooseTarget('seat-3'), () => flow.back(), () => flow.confirm(), () => flow.dismiss()]) assert.equal(attempt(), false);
  assert.deepEqual(step(), UNKNOWN);
  assert.equal(sent().length, 1);
  assert.deepEqual(host.issuedIds, ['command-1']);
  // Once that phase is over the command can no longer be newly accepted, and the card may be left.
  flow.observe(context({ view: nextPhase(before.officer), canAct: false }));
  await flush();
  await host.advance(FIRST + SECOND + THIRD + GUARD);
  assert.deepEqual(step(), { ...UNKNOWN, phaseOver: true });
  assert.equal(flow.dismiss(), true);
  assert.deepEqual(flow.getState(), IDLE);
});

test('a receipt is the server’s word: accepted registers, rejected says which rejection', async () => {
  const accepted = setup();
  accepted.onSubmit(accepted.answers.accepted);
  await accepted.send();
  assert.deepEqual(accepted.step(), { step: 'registered', targetSeatId: 'seat-2', pending: true });
  assert.equal(accepted.notified(), 2, 'Once when the confirm control became active, once for the answer');
  assert.equal(accepted.looked().length, 0, 'An answered command needs no reconciliation');

  for (const code of ['PHASE_CLOSED', 'NOT_ALLOWED']) {
    const rejected = setup();
    rejected.onSubmit(rejected.answers.rejected(code));
    await rejected.send();
    assert.deepEqual(rejected.step(), { step: 'rejected', code });
    // Terminal for that identifier: it is never sent again.
    await rejected.host.advance(60_000);
    assert.equal(rejected.sent().length, 1);
    assert.equal(rejected.looked().length, 0);
  }
});

test('the first answer to a command settles it as not registered only for errors that commit nothing; UNAVAILABLE does not', async () => {
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT']) {
    const { host, step, send, sent, looked, onSubmit, answers } = setup();
    onSubmit(answers.failure(code));
    await send();
    assert.deepEqual(step(), { step: 'not-registered', reason: code });
    await host.advance(60_000);
    assert.deepEqual([sent().length, looked().length], [1, 0], `${code}: the command is never sent again`);
  }
  const { step, send, onSubmit, answers } = setup();
  onSubmit(answers.failure('UNAVAILABLE'));
  await send();
  assert.deepEqual(step(), CHECKING, 'The outcome of that attempt is unknown');
});

test('once an attempt has gone unanswered, a later safe error settles nothing: an earlier copy may still have landed', async () => {
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT', 'UNAVAILABLE']) {
    const { host, step, send, sent, onSubmit, onLookup, answers } = setup();
    onSubmit(answers.lost);
    onLookup(answers.unknown);
    await send();
    // No receipt yet, so the identical command is sent again, and this time the server refuses to look at it.
    onSubmit(answers.failure(code));
    await host.advance(FIRST);
    assert.equal(sent().length, 2, code);
    assert.deepEqual(step(), CHECKING, `${code} on a retry says nothing about the first attempt`);
    await host.advance(SECOND + THIRD);
    assert.deepEqual(step(), UNKNOWN, code);
  }
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
    assert.deepEqual(s.step(), CHECKING, name);
    assert.equal(s.looked().length, 0, 'The first check waits a moment');
    await s.host.advance(FIRST);
    assert.deepEqual(s.step(), { step: 'registered', targetSeatId: 'seat-2', pending: true }, name);
    // The lookup carries the match and command identifiers and nothing about the choice.
    assert.deepEqual(s.looked(), [{ protocolVersion: 1, matchId: MATCH, commandId: 'command-1' }]);
    assert.deepEqual(ReceiptLookupRequestSchema.parse(s.looked()[0]), s.looked()[0]);
    assert.equal(s.sent().length, 1, 'A receipt was found, so nothing was sent again');
  }
});

test('with no receipt yet, the identical command is sent again: same identifier, same payload, never a new one', async () => {
  const { host, step, send, sent, looked, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  onLookup(answers.unknown);
  await send('seat-3');
  assert.deepEqual(step(), CHECKING);
  // Round one: no receipt, so the same command goes again, and is lost again.
  await host.advance(FIRST);
  assert.deepEqual([looked().length, sent().length], [1, 2]);
  onSubmit(answers.accepted);
  await host.advance(SECOND);
  assert.deepEqual([looked().length, sent().length], [2, 3]);
  assert.deepEqual(step(), { step: 'registered', targetSeatId: 'seat-3', pending: true });
  for (const command of sent()) assert.deepEqual(command, sent()[0]);
  assert.deepEqual(host.issuedIds, ['command-1'], 'One choice, one identifier, however many times it is sent');
});

test('a command that arrives after its phase closed ends as the server’s stored rejection, not as a guess', async () => {
  const { host, flow, step, context, send, sent, onSubmit, onLookup, answers, looked } = setup();
  onSubmit(answers.lost);
  onLookup(answers.lost);
  await send();
  // The turn ends while the outcome is still unknown. The client concludes nothing from that.
  flow.observe(context({ view: nextPhase(before.officer), canAct: false }));
  assert.deepEqual(step(), CHECKING);
  assert.equal(looked().length, 1, 'A new phase is a reason to ask again at once');
  // That check finds the server unreachable. The next one gets through: no receipt exists,
  // the identical command is sent again, and the server rejects it durably.
  await flush();
  onLookup(answers.unknown);
  onSubmit(answers.rejected('PHASE_CLOSED'));
  await host.advance(FIRST);
  assert.deepEqual(step(), { step: 'rejected', code: 'PHASE_CLOSED' });
  assert.deepEqual(sent()[1], sent()[0]);
});

test('automatic checking is bounded, never sends into silence, and then admits it does not know', async () => {
  const { host, step, send, sent, looked, onSubmit, onLookup, answers, notified } = setup();
  onSubmit(answers.lost);
  onLookup(answers.lost);
  await send();
  const told = notified();
  await host.advance(FIRST);
  assert.equal(looked().length, 1);
  assert.deepEqual(step(), CHECKING);
  await host.advance(SECOND);
  assert.equal(looked().length, 2);
  assert.deepEqual(step(), CHECKING);
  await host.advance(THIRD);
  assert.equal(looked().length, 3);
  assert.deepEqual(step(), UNKNOWN);
  assert.equal(notified(), told + 1);
  assert.equal(sent().length, 1, 'The server could not be asked, so the command was not sent again');
  // It stops there. Nothing happens until someone has a reason to ask again.
  await host.advance(600_000);
  assert.deepEqual([looked().length, sent().length, host.pendingTimers()], [3, 1, 0]);
  assert.deepEqual(step(), UNKNOWN);

  // A safe error from the lookup is no answer about the command either.
  const refused = setup();
  refused.onSubmit(refused.answers.failure('UNAVAILABLE'));
  refused.onLookup(refused.answers.failure('FORBIDDEN'));
  await refused.send();
  await refused.host.advance(FIRST + SECOND + THIRD);
  assert.deepEqual(refused.step(), UNKNOWN);
  assert.equal(refused.sent().length, 1);
});

test('Check again asks once more on request, and settles as soon as the server can answer', async () => {
  const { host, flow, step, send, sent, looked, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  onLookup(answers.lost);
  await send();
  await host.advance(FIRST + SECOND + THIRD);
  assert.deepEqual(step(), UNKNOWN);
  // Its control has only just appeared.
  assert.equal(flow.checkAgain(), false);
  await host.advance(GUARD);
  assert.equal(flow.checkAgain(), true);
  assert.deepEqual(step(), CHECKING);
  assert.equal(looked().length, 4, 'Asked immediately');
  assert.equal(flow.checkAgain(), false, 'Not while a check is already under way');
  await flush();
  assert.deepEqual(step(), UNKNOWN, 'One request, one round');
  await host.advance(60_000);
  assert.equal(looked().length, 4);

  onLookup(answers.unknown);
  onSubmit(answers.accepted);
  assert.equal(flow.checkAgain(), true);
  await flush();
  assert.deepEqual(step(), { step: 'registered', targetSeatId: 'seat-2', pending: true });
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
    assert.equal(s.flow.getState().step, 'registered', name);
    assert.equal(s.flow.getState().targetSeatId, 'seat-2', name);
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

test('a fresh reason to ask does not wait behind a check that is stuck: the newer one goes out and the older answer is ignored', async () => {
  const { host, flow, step, context, send, sent, looked, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  // The first lookup is sent into a dead connection and hangs.
  let answerStuck;
  onLookup(() => new Promise(resolve => { answerStuck = () => resolve(answers.unknown()); }));
  await send();
  await host.advance(FIRST);
  assert.equal(looked().length, 1);
  // The connection comes back a moment later.
  onLookup(answers.silent);
  flow.observe(context({ current: false }));
  flow.observe(context({ current: true }));
  assert.equal(looked().length, 2, 'Asked again at once, not after the stuck request times out');
  // The stuck lookup finally answers "no receipt". Its round is over; it must not send anything.
  answerStuck();
  await flush();
  assert.equal(sent().length, 1);
  assert.deepEqual(step(), CHECKING);
  // The newer check runs its own course with a full budget of its own.
  for (let round = 0; round < ROUNDS + 2 && flow.getState().step === 'checking'; round += 1) await host.advance(8_000 + THIRD);
  assert.deepEqual(step(), UNKNOWN);
  assert.equal(looked().length, 1 + ROUNDS);
});

test('the player’s own view settles a command: listed means registered, whatever arrives afterwards', async () => {
  const { host, flow, step, context, readyToConfirm, onSubmit, notified } = setup();
  let release;
  onSubmit(command => new Promise(resolve => { release = () => resolve({ ok: true, serverTimeMs: host.serverNow(), receipt: { protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId, commandId: command.commandId, status: 'rejected', code: 'NOT_ALLOWED' } }); }));
  await readyToConfirm();
  flow.confirm();
  const told = notified();
  // The view listing the command gets here before the answer to the request does.
  flow.observe(context({ view: listing(before.officer, 'command-1'), canAct: false }));
  assert.deepEqual(step(), { step: 'registered', targetSeatId: 'seat-2', pending: true });
  assert.equal(notified(), told, 'The caller that brought the view reads the state itself');
  release();
  await flush();
  assert.deepEqual(step(), { step: 'registered', targetSeatId: 'seat-2', pending: true }, 'A late answer about a settled command changes nothing');

  // A view that lists some other command says nothing about this one.
  const other = setup();
  other.onSubmit(other.answers.silent);
  await other.readyToConfirm();
  other.flow.confirm();
  other.flow.observe(other.context({ view: listing(before.officer, 'not-this-one'), canAct: false }));
  assert.equal(other.flow.getState().step, 'submitting');
});

test('the view is the authority even over this device’s own conclusion: a command it lists is registered', async () => {
  // The first answer said the request committed nothing, yet a copy of it got through.
  for (const arrange of [s => s.onSubmit(s.answers.failure('UNAUTHENTICATED')), s => s.onSubmit(s.answers.rejected('NOT_ALLOWED'))]) {
    const s = setup();
    arrange(s);
    await s.send('seat-4');
    assert.equal(['not-registered', 'rejected'].includes(s.flow.getState().step), true);
    s.flow.observe(s.context({ view: listing(before.officer, 'command-1'), canAct: false }));
    assert.deepEqual(s.step(), { step: 'registered', targetSeatId: 'seat-4', pending: true }, 'The target is still known, because the page never forgot it');
    await s.host.advance(GUARD);
    assert.equal(s.flow.dismiss(), true);
    assert.deepEqual(s.flow.getState(), { step: 'idle', registered: { targetSeatId: 'seat-4' } });
  }
  // Another command being listed changes nothing.
  const other = setup();
  other.onSubmit(other.answers.rejected('NOT_ALLOWED'));
  await other.send();
  other.flow.observe(other.context({ view: listing(before.officer, 'somebody-elses'), canAct: false }));
  assert.deepEqual(other.step(), { step: 'rejected', code: 'NOT_ALLOWED' });
});

test('a receipt that cannot belong to the command is not believed', async () => {
  const { host, step, send, onSubmit, onLookup, answers } = setup();
  onSubmit(answers.lost);
  // Right identifier, wrong phase: the lookup response format cannot rule this out by itself.
  onLookup(answers.found('accepted', 'REGISTERED', 'phase-z'));
  await send();
  await host.advance(FIRST + SECOND + THIRD);
  assert.deepEqual(step(), UNKNOWN);
});

test('a choice that was not sent does not outlive the conditions it was made under', async () => {
  const dropped = {
    'the panel closes': { panelOpen: false },
    'the page is backgrounded': { panelOpen: false, foreground: false },
    'the connection is lost': { canAct: false, current: false },
    'the turn ends': { canAct: false },
    // The gate is open again in a new phase, as it would be if this seat were active twice running.
    'another phase opens for the same seat': { view: variant(before.officer, v => { v.viewRevision += 1; v.phase = { ...v.phase, id: 'phase-next' }; }) },
    'the view is gone': { view: null },
  };
  for (const [name, change] of Object.entries(dropped)) {
    for (const stage of ['targeting', 'confirming']) {
      const { host, flow, context, sent } = setup();
      flow.open();
      if (stage === 'confirming') flow.chooseTarget('seat-2');
      await host.advance(GUARD);
      flow.observe(context(change));
      assert.deepEqual(flow.getState(), IDLE, `${name}, ${stage}`);
      // And it does not come back when the condition does.
      flow.observe(context());
      assert.deepEqual(flow.getState(), IDLE, name);
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

test('nothing can be started while the interface would not allow it', () => {
  for (const blocked of [{ canAct: false }, { panelOpen: false }, { view: null }]) {
    const { flow, context } = setup();
    flow.observe(context(blocked));
    assert.equal(flow.open(), false, JSON.stringify(blocked));
    assert.deepEqual(flow.getState(), IDLE);
  }
});

test('a registration report stays until it is acknowledged, and stops promising a resolution once the view has moved on', async () => {
  const pendingOf = flow => [flow.getState().step, flow.getState().pending];
  // Listed by the view: registered and waiting.
  const listed = setup();
  listed.onSubmit(listed.answers.accepted);
  await listed.send('seat-4');
  assert.deepEqual(pendingOf(listed.flow), ['registered', true], 'Before the view has caught up it is taken to be waiting');
  listed.flow.observe(listed.context({ view: listing(before.officer, 'command-1'), canAct: false }));
  assert.deepEqual(pendingOf(listed.flow), ['registered', true]);
  // A later phase that still lists it: the same.
  const laterListed = variant(nextPhase(before.officer), v => { v.self.shotAvailable = false; v.ownPendingCommandIds = ['command-1']; });
  listed.flow.observe(listed.context({ view: laterListed, canAct: false }));
  assert.deepEqual(pendingOf(listed.flow), ['registered', true]);
  // The view stops listing it. The player has still not acknowledged the report, so it stays,
  // but it must no longer say the shot is waiting to be resolved.
  listed.flow.observe(listed.context({ view: variant(laterListed, v => { v.viewRevision += 1; v.ownPendingCommandIds = []; }), canAct: false }));
  assert.deepEqual(pendingOf(listed.flow), ['registered', false]);
  assert.equal(listed.flow.getState().targetSeatId, 'seat-4');
  await listed.host.advance(GUARD);
  assert.equal(listed.flow.dismiss(), true);
  assert.deepEqual(listed.flow.getState(), IDLE);

  // The receipt is only found after the phase is over and the view lists nothing: the player
  // is still told it was registered. Dropping the report would leave them never knowing.
  const late = setup();
  late.onSubmit(late.answers.lost);
  late.onLookup(late.answers.lost);
  await late.send();
  late.onLookup(late.answers.found('accepted', 'REGISTERED'));
  late.flow.observe(late.context({ view: nextPhase(before.officer), canAct: false }));
  await flush();
  assert.deepEqual(pendingOf(late.flow), ['registered', false]);

  // A rejection likewise stays until the player has seen it, whatever the view does.
  const rejected = setup();
  rejected.onSubmit(rejected.answers.rejected('PHASE_CLOSED'));
  await rejected.send();
  rejected.flow.observe(rejected.context({ view: nextPhase(before.officer), canAct: false }));
  assert.deepEqual(rejected.step(), { step: 'rejected', code: 'PHASE_CLOSED' });
});

test('the registered target is remembered in memory only while the view still stands behind it', async () => {
  const { host, flow, context, send, onSubmit, answers } = setup();
  onSubmit(answers.accepted);
  await send('seat-4');
  await host.advance(GUARD);
  assert.equal(flow.dismiss(), true);
  // The receipt beat the view: the view on screen still calls the shot available.
  assert.deepEqual(flow.getState(), { step: 'idle', registered: { targetSeatId: 'seat-4' } });
  assert.equal(flow.open(), false, 'This device’s own accepted command is newer than its view');
  flow.observe(context());
  assert.equal(flow.open(), false);
  // The view catches up and lists the command.
  flow.observe(context({ view: listing(before.officer, 'command-1'), canAct: false }));
  assert.deepEqual(flow.getState(), { step: 'idle', registered: { targetSeatId: 'seat-4' } });
  // It stays remembered across a phase change for as long as the view lists it.
  const laterListed = variant(nextPhase(before.officer), v => { v.self.shotAvailable = false; v.ownPendingCommandIds = ['command-1']; });
  flow.observe(context({ view: laterListed, canAct: false }));
  assert.deepEqual(flow.getState().registered, { targetSeatId: 'seat-4' });
  // Once the view no longer lists it, the memory goes with it.
  flow.observe(context({ view: variant(laterListed, v => { v.viewRevision += 1; v.ownPendingCommandIds = []; }), canAct: false }));
  assert.deepEqual(flow.getState(), IDLE);

  // Un-listed in the very phase it was sent in: gone just the same, not kept until the phase ends.
  const samePhase = setup();
  samePhase.onSubmit(samePhase.answers.accepted);
  await samePhase.send();
  await samePhase.host.advance(GUARD);
  samePhase.flow.dismiss();
  samePhase.flow.observe(samePhase.context({ view: listing(before.officer, 'command-1'), canAct: false }));
  samePhase.flow.observe(samePhase.context({ view: variant(before.officer, v => { v.viewRevision += 2; v.self.shotAvailable = false; }), canAct: false }));
  assert.deepEqual(samePhase.flow.getState(), IDLE);

  // Never listed at all, and the phase moved on: nothing stands behind the memory.
  const unlisted = setup();
  unlisted.onSubmit(unlisted.answers.accepted);
  await unlisted.send();
  await unlisted.host.advance(GUARD);
  unlisted.flow.dismiss();
  unlisted.flow.observe(unlisted.context({ view: nextPhase(before.officer), canAct: false }));
  assert.deepEqual(unlisted.flow.getState(), IDLE);
});

test('a result cannot be acknowledged in the instant it appears, and a rejection is still there after a double tap', async () => {
  for (const answer of ['accepted', 'rejected']) {
    const { host, flow, send, onSubmit, answers } = setup();
    onSubmit(answer === 'accepted' ? answers.accepted : answers.rejected('NOT_ALLOWED'));
    await send();
    const shown = flow.getState();
    assert.equal(shown.armed, false);
    // The second tap of a double tap on "Register shot" lands on the control that replaced it.
    assert.equal(flow.dismiss(), false);
    await host.advance(GUARD - 1);
    assert.equal(flow.dismiss(), false);
    assert.equal(flow.getState().step, shown.step, 'Still there to be read');
    await host.advance(1);
    assert.equal(flow.getState().armed, true);
    assert.equal(flow.dismiss(), true);
  }
});

test('after a rejection the player can choose again, and that is a new command with a new identifier', async () => {
  const { host, flow, step, send, sent, onSubmit, answers } = setup();
  onSubmit(answers.rejected('NOT_ALLOWED'));
  await send('seat-2');
  await host.advance(GUARD);
  assert.equal(flow.dismiss(), true);
  assert.deepEqual(flow.getState(), IDLE);
  onSubmit(answers.accepted);
  await send('seat-3');
  assert.deepEqual(step(), { step: 'registered', targetSeatId: 'seat-3', pending: true });
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
    const { host, flow, step, readyToConfirm, sent } = setup({ ids });
    await readyToConfirm();
    assert.equal(flow.confirm(), true, name);
    assert.deepEqual(step(), { step: 'not-registered', reason: 'NOT_SENT' }, name);
    assert.equal(sent().length, 0, name);
    assert.equal(host.kept, null, 'Nothing was sent, so nothing is kept');
  }
  // A repeated identifier could make the server answer a new choice with an old receipt.
  const { host, flow, step, send, readyToConfirm, sent, onSubmit, answers } = setup({ ids: { next: () => 'same-every-time' } });
  onSubmit(answers.rejected('NOT_ALLOWED'));
  await send('seat-2');
  await host.advance(GUARD);
  flow.dismiss();
  await readyToConfirm('seat-3');
  flow.confirm();
  assert.deepEqual(step(), { step: 'not-registered', reason: 'NOT_SENT' });
  assert.equal(sent().length, 1);
});

// --- Across a page reload ---

const KEPT = { matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-a', commandId: 'command-1' };
/** A new flow over what an earlier page left behind, as after a reload. */
const reloaded = (host, options = {}) => setup({ host, observe: false, ...options });

test('only the identifiers of an unresolved command are kept, from the moment it is sent until its outcome is known', async () => {
  const endings = {
    'an accepted receipt': [s => s.onSubmit(s.answers.accepted), async () => {}],
    'a rejected receipt': [s => s.onSubmit(s.answers.rejected('NOT_ALLOWED')), async () => {}],
    'a safe error on the first answer': [s => s.onSubmit(s.answers.failure('FORBIDDEN')), async () => {}],
    'the view listing it': [s => s.onSubmit(s.answers.silent), async s => { s.flow.observe(s.context({ view: listing(before.officer, 'command-1'), canAct: false })); }],
    'a receipt found later': [s => { s.onSubmit(s.answers.lost); s.onLookup(s.answers.found('rejected', 'PHASE_CLOSED')); }, async s => { await s.host.advance(FIRST); }],
  };
  for (const [name, [arrange, finish]] of Object.entries(endings)) {
    const s = setup();
    arrange(s);
    await s.readyToConfirm('seat-4');
    assert.equal(s.host.kept, null, 'Choosing keeps nothing');
    s.flow.confirm();
    assert.deepEqual(JSON.parse(s.host.kept), KEPT, `${name}: kept as it is sent`);
    await flush();
    await finish(s);
    assert.equal(s.host.kept, null, `${name}: taken out again once the outcome is known`);
    // Nothing that was ever kept says whom, or what role: identifiers only.
    for (const value of s.host.everKept) {
      assert.deepEqual(Object.keys(JSON.parse(value)).sort(), ['commandId', 'matchId', 'phaseId', 'seatId']);
      assert.doesNotMatch(value, /seat-4|Officer|REGISTER_SHOT|target/);
    }
  }
  // While the outcome is unknown it stays kept: that is exactly when a reload needs it.
  const open = setup();
  open.onSubmit(open.answers.lost);
  open.onLookup(open.answers.lost);
  await open.send();
  await open.host.advance(FIRST + SECOND + THIRD);
  assert.equal(open.flow.getState().step, 'unknown');
  assert.deepEqual(JSON.parse(open.host.kept), KEPT);
});

test('a reloaded page asks what became of its command before it offers anything, and can never send it again', async () => {
  const first = setup();
  first.onSubmit(first.answers.silent);
  await first.readyToConfirm('seat-3');
  first.flow.confirm();
  first.flow.dispose();

  const page = reloaded(first.host);
  // Until a view arrives it cannot even tell whose command this is; it asks nothing yet.
  assert.deepEqual(page.flow.getState(), { step: 'checking', recovered: true });
  assert.equal(page.looked().length, 0);
  page.onLookup(page.answers.unknown);
  page.flow.observe(page.context());
  assert.deepEqual(page.looked(), [{ protocolVersion: 1, matchId: MATCH, commandId: 'command-1' }]);
  // Locked: the earlier request may still land, and a new choice could race it.
  for (const attempt of everyIntent(page.flow)) assert.equal(attempt(), false);
  await flush();
  await page.host.advance(FIRST + SECOND + THIRD + GUARD);
  assert.deepEqual(page.step(), { step: 'unknown', recovered: true, phaseOver: false });
  for (const attempt of [() => page.flow.open(), () => page.flow.dismiss(), () => page.flow.confirm()]) assert.equal(attempt(), false);
  assert.equal(page.sent().length, 0, 'It kept no target, so there is nothing it could send');
  assert.deepEqual(page.host.issuedIds, ['command-1'], 'And it made up no new command');
  assert.deepEqual(JSON.parse(page.host.kept), KEPT, 'Still kept, for the next reload');

  // The earlier request lands after all: the receipt is found, and the page says what it knows.
  page.onLookup(page.answers.found('accepted', 'REGISTERED'));
  assert.equal(page.flow.checkAgain(), true);
  await flush();
  assert.deepEqual(page.step(), { step: 'registered', targetSeatId: null, pending: true });
  assert.equal(page.host.kept, null);
});

test('after a reload, a found receipt settles the command either way, and a view that lists it settles it without asking', async () => {
  for (const [status, code, expected] of [['accepted', 'REGISTERED', { step: 'registered', targetSeatId: null, pending: true }], ['rejected', 'NOT_ALLOWED', { step: 'rejected', code: 'NOT_ALLOWED' }]]) {
    const host = createFakeHost({ serverStart: SERVER_EPOCH });
    host.kept = JSON.stringify(KEPT);
    const page = reloaded(host);
    page.onLookup(page.answers.found(status, code));
    page.flow.observe(page.context());
    await flush();
    assert.deepEqual(page.step(), expected);
    assert.equal(host.kept, null);
  }
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  host.kept = JSON.stringify(KEPT);
  const page = reloaded(host);
  page.flow.observe(page.context({ view: listing(before.officer, 'command-1'), canAct: false }));
  assert.deepEqual(page.step(), { step: 'registered', targetSeatId: null, pending: true });
  assert.equal(page.looked().length, 0);
  assert.equal(host.kept, null);
  // The reminder after acknowledging names no target either.
  await page.host.advance(GUARD);
  page.flow.dismiss();
  assert.deepEqual(page.flow.getState(), { step: 'idle', registered: { targetSeatId: null } });
});

test('after a reload, no receipt once the command’s phase is over means it was never registered and never will be', async () => {
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  host.kept = JSON.stringify(KEPT);
  const page = reloaded(host);
  page.onLookup(page.answers.unknown);
  // Same phase: no receipt proves nothing, the request may still be on its way.
  page.flow.observe(page.context());
  await flush();
  assert.deepEqual(page.step(), { step: 'checking', recovered: true });
  // The phase ends. A lookup made after that, finding nothing, closes the matter: a command
  // for a phase that is no longer open is rejected whenever it arrives.
  page.flow.observe(page.context({ view: nextPhase(before.officer), canAct: false }));
  await flush();
  assert.deepEqual(page.step(), { step: 'not-registered', reason: 'PHASE_OVER' });
  assert.equal(host.kept, null);
  assert.equal(page.sent().length, 0);
});

test('a lookup that was asked while the phase was still open cannot close the matter by being answered late', async () => {
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  host.kept = JSON.stringify(KEPT);
  const page = reloaded(host);
  let answerEarly;
  page.onLookup(() => new Promise(resolve => { answerEarly = () => resolve(page.answers.unknown()); }));
  page.flow.observe(page.context());
  // The phase ends while that lookup is still out. A new one is asked; make it hang too.
  page.onLookup(page.answers.silent);
  page.flow.observe(page.context({ view: nextPhase(before.officer), canAct: false }));
  assert.equal(page.looked().length, 2);
  // "No receipt" was true of a moment when the command could still have been accepted.
  answerEarly();
  await flush();
  assert.deepEqual(page.step(), { step: 'checking', recovered: true });
});

test('an unknown result can be left once its phase is over, reloaded or not, and nothing is kept afterwards', async () => {
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  host.kept = JSON.stringify(KEPT);
  const page = reloaded(host);
  page.onLookup(page.answers.failure('FORBIDDEN'));
  page.flow.observe(page.context({ view: nextPhase(before.officer), canAct: false }));
  await flush();
  await page.host.advance(FIRST + SECOND + THIRD + GUARD);
  // The server will not answer this device, so the page cannot find out. It says so and lets go.
  assert.deepEqual(page.step(), { step: 'unknown', recovered: true, phaseOver: true });
  assert.equal(page.flow.dismiss(), true);
  assert.deepEqual(page.flow.getState(), IDLE);
  assert.equal(host.kept, null);
});

test('what was kept is used only if it is this match’s and this seat’s, and well-formed; anything else is thrown away', async () => {
  const discarded = {
    'another match': JSON.stringify({ ...KEPT, matchId: 'another-match' }),
    'not JSON': '{not json',
    'not an object': '"command-1"',
    'a missing field': JSON.stringify({ matchId: MATCH, seatId: 'seat-1', commandId: 'command-1' }),
    'an identifier the contract refuses': JSON.stringify({ ...KEPT, commandId: 'no spaces allowed' }),
    'a seat that does not exist': JSON.stringify({ ...KEPT, seatId: 'seat-12' }),
    'something smuggled along': JSON.stringify({ ...KEPT, phaseId: { $ne: null } }),
  };
  for (const [name, value] of Object.entries(discarded)) {
    const host = createFakeHost({ serverStart: SERVER_EPOCH });
    host.kept = value;
    const page = reloaded(host);
    assert.deepEqual(page.flow.getState(), IDLE, name);
    assert.equal(host.kept, null, `${name}: cleared`);
    page.flow.observe(page.context());
    assert.equal(page.looked().length, 0, name);
    assert.equal(page.flow.open(), true, name);
  }
  // Left by another seat's page in the same tab: seen only once the view says who this is.
  const host = createFakeHost({ serverStart: SERVER_EPOCH });
  host.kept = JSON.stringify({ ...KEPT, seatId: 'seat-2' });
  const page = reloaded(host);
  assert.equal(page.flow.getState().step, 'checking');
  page.flow.observe(page.context());
  assert.deepEqual(page.flow.getState(), IDLE);
  assert.equal(page.looked().length, 0, 'Not this seat’s to ask about');
  assert.equal(host.kept, null);
});

test('a host whose storage fails costs only the memory across a reload, never the command', async () => {
  const broken = { load() { throw new Error('storage disabled'); }, save() { throw new Error('quota'); }, clear() { throw new Error('storage disabled'); } };
  const { step, send, onSubmit, answers } = setup({ unresolved: broken });
  onSubmit(answers.accepted);
  await send();
  assert.deepEqual(step(), { step: 'registered', targetSeatId: 'seat-2', pending: true });
  // A store that returns something other than a string is treated as empty.
  const odd = setup({ unresolved: { load: () => ({ commandId: 'command-1' }), save() {}, clear() {} } });
  assert.deepEqual(odd.flow.getState(), IDLE);
});

// --- Disposal ---

test('a disposed flow does nothing more, whatever was under way: no timers, no checks, no word of late answers', async () => {
  // A request in flight when the page goes away, which then fails: nothing may follow from it.
  const inFlight = setup();
  inFlight.onSubmit(inFlight.answers.lost);
  inFlight.onLookup(inFlight.answers.found('accepted', 'REGISTERED'));
  await inFlight.readyToConfirm();
  inFlight.flow.confirm();
  const told = inFlight.notified();
  inFlight.flow.dispose();
  inFlight.flow.dispose();
  await flush();
  assert.equal(inFlight.host.pendingTimers(), 0, 'The failed request did not start a check');
  await inFlight.host.advance(60_000);
  assert.equal(inFlight.looked().length, 0);
  assert.equal(inFlight.notified(), told);
  assert.deepEqual(inFlight.flow.getState(), { step: 'submitting' });

  // A check already scheduled.
  const scheduled = setup();
  scheduled.onSubmit(scheduled.answers.lost);
  await scheduled.send();
  assert.equal(scheduled.host.pendingTimers() > 0, true);
  scheduled.flow.dispose();
  assert.equal(scheduled.host.pendingTimers(), 0);
  await scheduled.host.advance(60_000);
  assert.equal(scheduled.looked().length, 0);

  // In every state, an intent that would otherwise be accepted is refused, and a view changes nothing.
  const states = {
    idle: [async () => {}, s => s.flow.open()],
    targeting: [async s => { s.flow.open(); }, s => s.flow.back()],
    'targeting (choose)': [async s => { s.flow.open(); }, s => s.flow.chooseTarget('seat-2')],
    confirming: [async s => { await s.readyToConfirm(); }, s => s.flow.confirm()],
    registered: [async s => { s.onSubmit(s.answers.accepted); await s.send(); await s.host.advance(GUARD); }, s => s.flow.dismiss()],
    unknown: [async s => { s.onSubmit(s.answers.lost); s.onLookup(s.answers.lost); await s.send(); await s.host.advance(FIRST + SECOND + THIRD + GUARD); }, s => s.flow.checkAgain()],
  };
  for (const [name, [reach, intent]] of Object.entries(states)) {
    const live = setup();
    await reach(live);
    const gone = setup();
    await reach(gone);
    const state = gone.flow.getState();
    gone.flow.dispose();
    assert.equal(intent(gone), false, `${name}: refused once disposed`);
    assert.equal(intent(live), true, `${name}: and accepted otherwise, so the refusal means something`);
    gone.flow.observe(gone.context({ view: listing(before.officer, 'command-1'), canAct: false, panelOpen: false }));
    assert.deepEqual(gone.flow.getState(), state, `${name}: a view changes nothing`);
    assert.equal(gone.host.pendingTimers(), 0, name);
  }
});

test('timing values are client parameters that a host may tune; none of them is a rule', async () => {
  const { host, flow, step, looked, onSubmit, onLookup, answers } = setup({ timing: { controlGuardMs: 50, recheckDelaysMs: [70] } });
  onSubmit(answers.lost);
  onLookup(answers.lost);
  flow.open();
  flow.chooseTarget('seat-2');
  await host.advance(49);
  assert.equal(flow.confirm(), false);
  await host.advance(1);
  assert.equal(flow.confirm(), true);
  await flush();
  await host.advance(70);
  assert.equal(looked().length, 1);
  assert.deepEqual(step(), UNKNOWN, 'One delay configured, one automatic check');
  assert.deepEqual(DEFAULT_SHOT_FLOW_TIMING, { controlGuardMs: 400, recheckDelaysMs: [1_000, 2_000, 4_000] });
});
