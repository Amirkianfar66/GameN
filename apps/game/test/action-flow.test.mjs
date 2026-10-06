import assert from 'node:assert/strict';
import test from 'node:test';
import { FullCommandRequestSchema } from '@mothership/contracts';
import { createActionFlow, DEFAULT_ACTION_FLOW_TIMING, offeredChoices } from '@mothership/game';
import { createFakeHost, flush } from './support/fakes.mjs';
import { MATCH, playerView } from './support/connected.mjs';

// The protocol-2 command flow by itself, against an API whose every answer the test
// scripts. Synthetic views; no backend and no rule is involved here.

const { controlGuardMs: GUARD, recheckDelaysMs: [FIRST, SECOND, THIRD], retryJitterMs: JITTER } = DEFAULT_ACTION_FLOW_TIMING;
const MOVE = { kind: 'move', destination: 'Room B' };
const SHOT = { kind: 'shot', targetSeatId: 'seat-3' };
/** Seat 1's view with a shot open against seats 3 and 5. Synthetic: no rule produced it. */
const armedView = (change = () => {}) => playerView('seat-1', view => {
  view.self.shotAvailable = true;
  view.self.ordinaryWeapons = 1;
  view.legalTargets = { REGISTER_SHOT: ['seat-3', 'seat-5'] };
  change(view);
});
const nextPhase = view => playerView('seat-1', next => {
  Object.assign(next, structuredClone(view));
  next.viewRevision = view.viewRevision + 1;
  next.phase = { ...view.phase, id: 'phase-two' };
});

function setup({ kept = null, seatId = 'seat-1' } = {}) {
  const host = createFakeHost();
  host.kept = kept;
  const sent = [];
  const looked = [];
  const script = { command: [], receipt: [] };
  const answer = (queue, fallback) => async request => {
    const next = queue.length > 0 ? queue.shift() : fallback;
    return typeof next === 'function' ? next(request) : next;
  };
  const noAnswer = { kind: 'no-response', reason: 'transport-error' };
  const api = {
    command: async request => { sent.push(structuredClone(request)); return answer(script.command, noAnswer)(request); },
    receipt: async request => { looked.push(structuredClone(request)); return answer(script.receipt, noAnswer)(request); },
  };
  const flow = createActionFlow({ api, ports: host.ports, matchId: MATCH, seatId });
  let notified = 0;
  flow.subscribe(() => { notified += 1; });
  const sample = { requestedAt: 0, receivedAt: 0, serverTimeMs: 0 };
  const receipt = (request, status = 'accepted', code = 'REGISTERED') => ({ kind: 'receipt', sample, receipt: { protocolVersion: 2, matchId: request.matchId, phaseId: request.phaseId, commandId: request.commandId, status, code } });
  let context = { view: null, current: true, inTime: true, panelOpen: true, foreground: true };
  const observe = (view, overrides = {}) => {
    context = { ...context, ...(view === undefined ? {} : { view }), ...overrides };
    flow.observe(context);
    return flow.getState();
  };
  /** Opens an action, picks a choice and waits out the double-tap guard. */
  async function toConfirm(choice = MOVE) {
    assert.equal(flow.open(choice.kind), true);
    assert.equal(flow.choose(choice), true);
    await host.advance(GUARD);
  }
  return {
    host, flow, sent, looked, script, observe, toConfirm, receipt, sample,
    failure: (code, retryAfterMs = null) => ({ kind: 'api-failure', code, retryAfterMs, sample }),
    found: (request, status, code) => ({ kind: 'found', sample, receipt: receipt(request, status, code).receipt }),
    unknown: { kind: 'unknown', sample },
    noAnswer,
    state: () => flow.getState(),
    notified: () => notified,
  };
}

test('what may be chosen is the server’s own list and nothing else', () => {
  const plain = playerView();
  assert.deepEqual(offeredChoices(plain, 'move'), [{ kind: 'move', destination: 'Room B' }]);
  assert.deepEqual(offeredChoices(plain, 'shot'), []);
  assert.deepEqual(offeredChoices(armedView(), 'shot'), [{ kind: 'shot', targetSeatId: 'seat-3' }, { kind: 'shot', targetSeatId: 'seat-5' }]);
  // The category is open and nobody can be targeted: there is nothing to choose.
  assert.deepEqual(offeredChoices(armedView(view => { view.legalTargets = { REGISTER_SHOT: [] }; }), 'shot'), []);
  // Targets listed while the category is closed are not offered either.
  assert.deepEqual(offeredChoices(armedView(view => { view.self.shotAvailable = false; }), 'shot'), []);
  // Keys of commands this client does not offer, and keys it does not know, drive nothing.
  assert.deepEqual(offeredChoices(playerView('seat-1', view => { view.legalTargets = { PROTECT: ['seat-2'], SOMETHING_NEW: ['seat-4'] }; }), 'shot'), []);
  assert.deepEqual(offeredChoices(playerView('seat-1', view => { view.self.movementDestinations = []; }), 'move'), []);
});

test('a move: one confirmation, one schema-valid command for the phase it was chosen in, and the server’s receipt', async () => {
  const s = setup();
  s.observe(playerView());
  assert.deepEqual(s.state(), { step: 'idle' });
  assert.equal(s.flow.open('move'), true);
  assert.deepEqual(s.state(), { step: 'choosing', kind: 'move' });
  assert.equal(s.flow.choose({ kind: 'move', destination: 'Command Room' }), false, 'Not on the server’s list');
  assert.equal(s.flow.choose(SHOT), false, 'Not the kind that was opened');
  assert.equal(s.flow.choose(MOVE), true);
  assert.deepEqual(s.state(), { step: 'confirming', choice: MOVE, armed: false });
  assert.equal(s.flow.confirm(), false, 'The control is not active the instant it appears');
  await s.host.advance(GUARD);
  assert.deepEqual(s.state(), { step: 'confirming', choice: MOVE, armed: true });

  s.script.command.push(request => s.receipt(request));
  assert.equal(s.flow.confirm(), true);
  assert.equal(s.flow.confirm(), false, 'A second activation finds nothing to send');
  assert.deepEqual(s.state(), { step: 'submitting', choice: MOVE });
  await flush();
  assert.equal(s.sent.length, 1);
  assert.deepEqual(FullCommandRequestSchema.parse(s.sent[0]), s.sent[0]);
  assert.deepEqual([s.sent[0].matchId, s.sent[0].phaseId, s.sent[0].command], [MATCH, 'phase-one', { type: 'MOVE', destination: 'Room B' }]);
  assert.deepEqual(s.state(), { step: 'accepted', choice: MOVE, armed: false });
  assert.equal(s.flow.dismiss(), false, 'Nor can the result be acknowledged the instant it appears');
  await s.host.advance(GUARD);
  assert.equal(s.flow.dismiss(), true);
  assert.deepEqual(s.state(), { step: 'idle' });
  assert.deepEqual(s.looked, []);
});

test('a shot is the same flow with the server’s legal targets', async () => {
  const s = setup();
  s.observe(armedView());
  await s.toConfirm(SHOT);
  s.script.command.push(request => s.receipt(request));
  s.flow.confirm();
  await flush();
  assert.deepEqual(s.sent[0].command, { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' });
  assert.deepEqual(s.state(), { step: 'accepted', choice: SHOT, armed: false });
  // A target the server does not list cannot be chosen, and an open category with no target cannot be opened.
  const none = setup();
  none.observe(armedView(view => { view.legalTargets = { REGISTER_SHOT: [] }; }));
  assert.equal(none.flow.open('shot'), false);
  const other = setup();
  other.observe(armedView());
  other.flow.open('shot');
  assert.equal(other.flow.choose({ kind: 'shot', targetSeatId: 'seat-2' }), false);
});

test('only the identifiers of a command are kept across a reload, from before it is sent until its outcome is known', async () => {
  const s = setup();
  s.observe(armedView());
  await s.toConfirm(SHOT);
  let release;
  s.script.command.push(request => new Promise(resolve => { release = () => resolve(s.receipt(request)); }));
  s.flow.confirm();
  assert.notEqual(s.host.kept, null, 'Kept before the request is on its way');
  await flush();
  const kept = JSON.parse(s.host.kept);
  assert.deepEqual(Object.keys(kept).sort(), ['commandId', 'matchId', 'phaseId', 'seatId']);
  assert.deepEqual(kept, { matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-one', commandId: s.sent[0].commandId });
  assert.doesNotMatch(s.host.kept, /seat-3|REGISTER_SHOT|shot|move|Room|Cracker/);
  release();
  await flush();
  assert.equal(s.host.kept, null, 'Removed once the outcome is known');
  assert.equal(s.host.everKept.length, 1);
});

test('nothing is offered or sent unless the view is fresh, the clock has not run out and the private panel is open', async () => {
  for (const closed of [{ current: false }, { inTime: false }, { panelOpen: false }]) {
    const s = setup();
    s.observe(playerView(), closed);
    assert.equal(s.flow.open('move'), false, JSON.stringify(closed));
  }
  // The same conditions take an unsent choice away again, at either step.
  for (const closed of [{ current: false }, { inTime: false }, { panelOpen: false }]) {
    for (const step of ['choosing', 'confirming']) {
      const s = setup();
      s.observe(playerView());
      s.flow.open('move');
      if (step === 'confirming') s.flow.choose(MOVE);
      assert.deepEqual(s.observe(undefined, closed), { step: 'idle' }, `${step} ${JSON.stringify(closed)}`);
      // Conditions coming back do not bring the choice back.
      assert.deepEqual(s.observe(undefined, { current: true, inTime: true, panelOpen: true }), { step: 'idle' });
      assert.deepEqual(s.sent, []);
    }
  }
  // Confirming at the very moment the view stops being fresh sends nothing.
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.observe(undefined, { current: false });
  assert.equal(s.flow.confirm(), false);
  assert.deepEqual(s.sent, []);
});

test('an unsent choice is cleared when the phase changes, and a choice the server withdraws is asked for again', async () => {
  const s = setup();
  const view = armedView();
  s.observe(view);
  await s.toConfirm(SHOT);
  assert.deepEqual(s.observe(nextPhase(view)), { step: 'idle' }, 'A choice belongs to the phase it was made in');

  const withdrawn = setup();
  withdrawn.observe(view);
  await withdrawn.toConfirm(SHOT);
  const without = armedView(next => { next.viewRevision += 1; next.legalTargets = { REGISTER_SHOT: ['seat-5'] }; });
  assert.deepEqual(withdrawn.observe(without), { step: 'choosing', kind: 'shot' });
  assert.equal(withdrawn.flow.choose(SHOT), false);
  // And when nothing of that kind is offered any more, the action is put down.
  assert.deepEqual(withdrawn.observe(armedView(next => { next.viewRevision += 2; next.legalTargets = {}; next.self.shotAvailable = false; })), { step: 'idle' });
});

test('one command at a time for the seat: no new intent while one is unresolved or unacknowledged', async () => {
  const s = setup();
  s.observe(armedView());
  await s.toConfirm(MOVE);
  s.flow.confirm();
  await flush();
  assert.equal(s.state().step, 'checking', 'No answer came');
  for (const kind of ['move', 'shot']) assert.equal(s.flow.open(kind), false, `${kind} while another command is unaccounted for`);
  assert.equal(s.flow.choose(SHOT), false);
  assert.equal(s.flow.back(), false);
  s.script.receipt.push(request => s.found({ ...s.sent[0], ...request }));
  await s.host.advance(FIRST);
  assert.equal(s.state().step, 'accepted');
  assert.equal(s.flow.open('shot'), false, 'Not before the result has been acknowledged');
  await s.host.advance(GUARD);
  s.flow.dismiss();
  assert.equal(s.flow.open('shot'), true);
});

test('no answer is not failure: the receipt is looked up, then the identical command is sent again, and checking is bounded', async () => {
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  assert.deepEqual(s.state(), { step: 'checking', choice: MOVE, recovered: false });
  // First check: no receipt yet, so the very same request goes again; still no answer.
  s.script.receipt.push(s.unknown);
  await s.host.advance(FIRST);
  assert.deepEqual([s.looked.length, s.sent.length], [1, 2]);
  assert.deepEqual(s.sent[1], s.sent[0], 'Byte for byte the first one: same identifier, phase and payload');
  assert.deepEqual(s.looked[0], { protocolVersion: 2, matchId: MATCH, commandId: s.sent[0].commandId });
  // Second check: the lookup itself gets no answer. Nothing is sent into that silence.
  await s.host.advance(SECOND);
  assert.deepEqual([s.looked.length, s.sent.length], [2, 2]);
  // Third check, then the automatic checks are over.
  await s.host.advance(THIRD);
  assert.deepEqual([s.looked.length, s.sent.length], [3, 2]);
  assert.deepEqual(s.state(), { step: 'unknown', choice: MOVE, recovered: false, phaseOver: false, armed: false });
  await s.host.advance(60_000);
  assert.deepEqual([s.looked.length, s.sent.length], [3, 2], 'Nothing more by itself');
  assert.equal(s.flow.dismiss(), false, 'While its phase is open the command cannot be left');
  // Asking again by hand settles it when the server answers.
  s.script.receipt.push(s.unknown);
  s.script.command.push(request => s.receipt(request));
  assert.equal(s.flow.checkAgain(), true);
  await flush();
  assert.equal(s.state().step, 'accepted');
  assert.equal(s.host.kept, null);
});

test('a rate-limit answer is waited out for at least as long as the server said, and the same request goes again', async () => {
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.script.command.push(s.failure('RATE_LIMITED', 5_000));
  s.flow.confirm();
  await flush();
  assert.equal(s.state().step, 'checking');
  s.script.receipt.push(s.unknown);
  s.script.command.push(request => s.receipt(request));
  await s.host.advance(5_000 + JITTER - 1);
  assert.deepEqual([s.looked.length, s.sent.length], [0, 1], 'Not a moment before the delay the server named, plus the jitter');
  await s.host.advance(1);
  assert.deepEqual([s.looked.length, s.sent.length], [1, 2]);
  assert.equal(s.sent[1].commandId, s.sent[0].commandId, 'The same operation and identifier, not a new one');
  assert.equal(s.state().step, 'accepted');

  // The same for a lookup that is told to wait, and for a delay the server left out.
  const lookup = setup();
  lookup.observe(playerView());
  await lookup.toConfirm();
  lookup.flow.confirm();
  await flush();
  lookup.script.receipt.push(lookup.failure('RATE_LIMITED', 9_000), lookup.unknown);
  lookup.script.command.push(request => lookup.receipt(request));
  await lookup.host.advance(FIRST);
  assert.equal(lookup.looked.length, 1);
  await lookup.host.advance(9_000 + JITTER - 1);
  assert.equal(lookup.looked.length, 1);
  await lookup.host.advance(1);
  assert.equal(lookup.state().step, 'accepted');
});

test('a safe failure settles only the invocation it answered', async () => {
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT', 'REQUEST_ID_CONFLICT']) {
    // As the first answer to the command: that request committed nothing.
    const first = setup();
    first.observe(playerView());
    await first.toConfirm();
    first.script.command.push(first.failure(code));
    first.flow.confirm();
    await flush();
    assert.deepEqual(first.state(), { step: 'not-accepted', choice: MOVE, reason: code, armed: false }, code);
    assert.equal(first.host.kept, null);

    // After an attempt that went unanswered: the earlier attempt may have been decided, so nothing is concluded.
    const later = setup();
    later.observe(playerView());
    await later.toConfirm();
    later.flow.confirm();
    await flush();
    later.script.receipt.push(later.unknown);
    later.script.command.push(later.failure(code));
    await later.host.advance(FIRST);
    assert.equal(later.state().step, 'checking', `${code} after an unanswered attempt`);
    assert.notEqual(later.host.kept, null);
  }
  // "Try again later" is never a decision.
  const unavailable = setup();
  unavailable.observe(playerView());
  await unavailable.toConfirm();
  unavailable.script.command.push(unavailable.failure('UNAVAILABLE'));
  unavailable.flow.confirm();
  await flush();
  assert.equal(unavailable.state().step, 'checking');
});

test('a rejection receipt is the server’s final decision and is shown as given', async () => {
  for (const code of ['PHASE_CLOSED', 'NOT_ALLOWED']) {
    const s = setup();
    s.observe(playerView());
    await s.toConfirm();
    s.script.command.push(request => s.receipt(request, 'rejected', code));
    s.flow.confirm();
    await flush();
    assert.deepEqual(s.state(), { step: 'rejected', choice: MOVE, code, armed: false });
    assert.equal(s.host.kept, null);
  }
  // A receipt found for another phase cannot be this command's.
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  s.script.receipt.push(request => s.found({ ...s.sent[0], ...request, phaseId: 'phase-other' }));
  await s.host.advance(FIRST);
  assert.equal(s.state().step, 'checking');
});

test('the player’s own view settles a command it lists, even against this device’s earlier conclusion', async () => {
  const waiting = setup();
  const view = armedView();
  waiting.observe(view);
  await waiting.toConfirm(SHOT);
  waiting.flow.confirm();
  await flush();
  assert.equal(waiting.state().step, 'checking');
  const listing = commandId => armedView(next => { next.viewRevision += 1; next.self.shotAvailable = false; next.legalTargets = {}; next.ownPendingCommandIds = [commandId]; });
  assert.deepEqual(waiting.observe(listing(waiting.sent[0].commandId)), { step: 'accepted', choice: SHOT, armed: false });
  assert.equal(waiting.host.kept, null);
  await waiting.host.advance(FIRST + SECOND + THIRD);
  assert.deepEqual(waiting.looked, [], 'Nothing left to ask');

  const refused = setup();
  refused.observe(view);
  await refused.toConfirm(SHOT);
  refused.script.command.push(refused.failure('FORBIDDEN'));
  refused.flow.confirm();
  await flush();
  assert.equal(refused.state().step, 'not-accepted');
  assert.equal(refused.observe(listing('some-other-command')).step, 'not-accepted', 'Another command in the list says nothing about this one');
  assert.equal(refused.observe(listing(refused.sent[0].commandId)).step, 'accepted');
});

test('the phase moves on while a command is unaccounted for: it is asked about at once and ends as the server’s stored decision', async () => {
  const s = setup();
  const view = playerView();
  s.observe(view);
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  s.script.receipt.push(s.unknown);
  s.script.command.push(request => s.receipt(request, 'rejected', 'PHASE_CLOSED'));
  s.observe(nextPhase(view));
  await flush();
  assert.deepEqual([s.looked.length, s.sent.length], [1, 2], 'Asked without waiting for the next timer');
  assert.equal(s.sent[1].phaseId, 'phase-one', 'The original command, for its original phase');
  assert.deepEqual(s.state(), { step: 'rejected', choice: MOVE, code: 'PHASE_CLOSED', armed: false });
});

test('coming back asks at once: the feed fresh again, or the page in front again', async () => {
  for (const [away, back] of [[{ current: false }, { current: true }], [{ foreground: false, panelOpen: false }, { foreground: true }]]) {
    const s = setup();
    s.observe(playerView());
    await s.toConfirm();
    s.flow.confirm();
    await flush();
    s.observe(undefined, away);
    const asked = s.looked.length;
    s.script.receipt.push(request => s.found({ ...s.sent[0], ...request }));
    s.observe(undefined, back);
    await flush();
    assert.equal(s.looked.length, asked + 1, JSON.stringify(back));
    assert.equal(s.state().step, 'accepted');
  }
});

const KEPT = { matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-one', commandId: 'kept-command' };

test('a reloaded page asks about its command before anything else, and never sends it again', async () => {
  const s = setup({ kept: JSON.stringify(KEPT) });
  assert.deepEqual(s.state(), { step: 'checking', choice: null, recovered: true });
  assert.equal(s.flow.open('move'), false, 'Nothing new is offered meanwhile');
  await s.host.advance(60_000);
  assert.deepEqual(s.looked, [], 'Not before there is a view to judge the answer against');
  s.script.receipt.push(request => s.found({ ...KEPT, ...request }));
  s.observe(playerView());
  await flush();
  assert.deepEqual(s.looked, [{ protocolVersion: 2, matchId: MATCH, commandId: 'kept-command' }]);
  assert.deepEqual(s.sent, [], 'Its payload is gone and is not rebuilt');
  assert.deepEqual(s.state(), { step: 'accepted', choice: null, armed: false });
  assert.equal(s.host.kept, null);
});

test('after a reload, "no receipt" settles nothing while the command’s phase is open', async () => {
  const s = setup({ kept: JSON.stringify(KEPT) });
  s.script.receipt.push(s.unknown, s.unknown, s.unknown);
  s.observe(playerView());
  await flush();
  // The first of the three checks was made at once, on the first view.
  await s.host.advance(FIRST + SECOND);
  assert.equal(s.looked.length, 3);
  assert.deepEqual(s.state(), { step: 'unknown', choice: null, recovered: true, phaseOver: false, armed: false });
  assert.deepEqual(s.sent, []);
  await s.host.advance(GUARD);
  assert.equal(s.flow.dismiss(), false, 'It stays pending: an attempt still on its way could be accepted');
  assert.equal(s.flow.open('move'), false);
  assert.notEqual(s.host.kept, null);
});

test('after a reload, once a fresh view shows the phase closed, a lookup made after that view settles it', async () => {
  const s = setup({ kept: JSON.stringify(KEPT) });
  const view = playerView();
  s.script.receipt.push(s.unknown);
  s.observe(view);
  await flush();
  assert.equal(s.state().step, 'checking');
  // A view that is not known to be fresh proves nothing about the phase.
  s.script.receipt.push(s.unknown);
  s.observe(nextPhase(view), { current: false });
  await flush();
  assert.equal(s.state().step, 'checking');
  assert.equal(s.state().recovered, true);
  // Fresh again, on the later phase: asked again, after that view, and not on the heels of the last check.
  const asked = s.looked.length;
  s.script.receipt.push(s.unknown);
  s.observe(undefined, { current: true });
  await flush();
  assert.equal(s.looked.length, asked, 'Two checks are never started within a second of each other');
  await s.host.advance(FIRST);
  assert.equal(s.looked.length, asked + 1);
  assert.deepEqual(s.state(), { step: 'not-accepted', choice: null, reason: 'PHASE_OVER', armed: false });
  assert.equal(s.host.kept, null);
  assert.deepEqual(s.sent, [], 'And the old identifier is never used again');
  await s.host.advance(GUARD);
  s.flow.dismiss();
  s.observe(playerView('seat-1', next => { next.viewRevision = view.viewRevision + 2; next.phase = { ...view.phase, id: 'phase-two' }; }));
  assert.equal(s.flow.open('move'), true, 'A new intent for the current phase is offered');
  s.flow.choose(MOVE);
  await s.host.advance(GUARD);
  s.script.command.push(request => s.receipt(request));
  s.flow.confirm();
  await flush();
  assert.notEqual(s.sent[0].commandId, 'kept-command');
  assert.equal(s.sent[0].phaseId, 'phase-two');
});

test('after a reload a found receipt is final whatever the phase, and a view that lists the command settles it too', async () => {
  const late = setup({ kept: JSON.stringify(KEPT) });
  late.script.receipt.push(request => late.found({ ...KEPT, ...request }, 'rejected', 'PHASE_CLOSED'));
  late.observe(nextPhase(playerView()));
  await flush();
  assert.deepEqual(late.state(), { step: 'rejected', choice: null, code: 'PHASE_CLOSED', armed: false });

  const listed = setup({ kept: JSON.stringify(KEPT) });
  assert.deepEqual(listed.observe(playerView('seat-1', view => { view.ownPendingCommandIds = ['kept-command']; })), { step: 'accepted', choice: null, armed: false });
  assert.deepEqual(listed.looked, []);
});

test('a kept record that is not this seat’s, not this match’s or not readable is discarded, not asked about', () => {
  for (const kept of [
    JSON.stringify({ ...KEPT, matchId: 'another-match' }), JSON.stringify({ ...KEPT, seatId: 'seat-2' }), JSON.stringify({ ...KEPT, commandId: 'has spaces' }),
    JSON.stringify({ matchId: MATCH }), '{not json', 'null', '[]', '',
  ]) {
    const s = setup({ kept });
    assert.deepEqual(s.state(), { step: 'idle' }, kept);
    assert.equal(s.host.kept, null, kept);
  }
});

test('a host whose storage or identifier source fails cannot make the flow send something unaccountable', async () => {
  // A store that refuses, and one that takes the record and does not keep it: either way the
  // command could not be asked about after a reload, so it is not sent at all.
  for (const [name, breakStore] of [
    ['a store that throws', ports => { ports.unresolved.save = () => { throw new Error('storage full'); }; }],
    ['a store that keeps nothing', ports => { ports.unresolved.save = () => {}; }],
    ['a store that cannot be read back', ports => { ports.unresolved.load = () => { throw new Error('blocked'); }; }],
  ]) {
    const s = setup();
    breakStore(s.host.ports);
    s.observe(playerView());
    await s.toConfirm();
    s.script.command.push(request => s.receipt(request));
    assert.equal(s.flow.confirm(), true, name);
    await flush();
    assert.deepEqual(s.state(), { step: 'not-accepted', choice: MOVE, reason: 'NOT_RECORDED', armed: false }, name);
    assert.deepEqual(s.sent, [], `${name}: nothing left this device`);
    // A page loaded afterwards has nothing to ask about, and rightly: nothing was sent.
    await s.host.advance(GUARD);
    assert.equal(s.flow.dismiss(), true);
    assert.equal(s.flow.open('move'), true, 'The player can try again');
  }

  const noIds = setup();
  noIds.host.ports.ids.next = () => { throw new Error('no randomness'); };
  noIds.observe(playerView());
  await noIds.toConfirm();
  noIds.flow.confirm();
  assert.deepEqual(noIds.state(), { step: 'not-accepted', choice: MOVE, reason: 'NOT_SENT', armed: false });
  assert.deepEqual(noIds.sent, []);

  // An identifier is used for one command only.
  const repeat = setup();
  repeat.host.ports.ids.next = () => 'always-the-same';
  repeat.observe(playerView());
  await repeat.toConfirm();
  repeat.script.command.push(request => repeat.receipt(request));
  repeat.flow.confirm();
  await flush();
  await repeat.host.advance(GUARD);
  repeat.flow.dismiss();
  await repeat.toConfirm();
  repeat.flow.confirm();
  assert.equal(repeat.state().reason, 'NOT_SENT');
  assert.equal(repeat.sent.length, 1);
});

test('an answer that arrives after the command was settled changes nothing', async () => {
  // Settled by the player's own view, which lists the command, while the first send is still out.
  const s = setup();
  const view = armedView();
  s.observe(view);
  await s.toConfirm(SHOT);
  let release;
  s.script.command.push(request => new Promise(resolve => { release = () => resolve(s.receipt(request, 'rejected', 'NOT_ALLOWED')); }));
  s.flow.confirm();
  await flush();
  assert.equal(s.state().step, 'submitting');
  s.observe(armedView(next => { next.viewRevision = view.viewRevision + 1; next.ownPendingCommandIds = [s.sent[0].commandId]; }));
  assert.equal(s.state().step, 'accepted', 'The view is authoritative');
  release();
  await flush();
  await s.host.advance(60_000);
  assert.deepEqual(s.state(), { step: 'accepted', choice: SHOT, armed: true }, 'The late answer, though it says otherwise, is about a command already accounted for');
  assert.deepEqual([s.sent.length, s.looked.length], [1, 0]);
});

test('dispose stops everything, and a late answer after it changes nothing', async () => {
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  let release;
  s.script.command.push(request => new Promise(resolve => { release = () => resolve(s.receipt(request, 'rejected', 'NOT_ALLOWED')); }));
  s.flow.confirm();
  await flush();
  s.flow.dispose();
  s.flow.dispose();
  const notified = s.notified();
  release();
  await flush();
  await s.host.advance(60_000);
  assert.equal(s.state().step, 'submitting', 'Nothing changes after disposal');
  assert.equal(s.notified(), notified);
  assert.equal(s.host.pendingTimers(), 0);
  for (const act of [() => s.flow.open('move'), () => s.flow.choose(MOVE), () => s.flow.back(), () => s.flow.confirm(), () => s.flow.checkAgain(), () => s.flow.dismiss()]) assert.equal(act(), false);
});

test('a safe failure does not settle a command while another attempt at it is still on its way; that attempt’s receipt then does', async () => {
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN']) {
    const s = setup();
    s.observe(playerView());
    await s.toConfirm();
    // Turned away before the server looked: nothing is unanswered so far.
    s.script.command.push(s.failure('RATE_LIMITED', 0));
    s.flow.confirm();
    await flush();
    // First check: no receipt, so the identical request goes again. This one hangs.
    let release;
    s.script.receipt.push(s.unknown);
    s.script.command.push(request => new Promise(resolve => { release = () => resolve(s.receipt(request)); }));
    await s.host.advance(FIRST);
    assert.deepEqual([s.looked.length, s.sent.length], [1, 2]);
    // The feed drops and comes back, which starts a newer check while that attempt is still out.
    s.observe(undefined, { current: false });
    s.observe(undefined, { current: true });
    s.script.receipt.push(s.unknown);
    s.script.command.push(s.failure(code));
    await s.host.advance(FIRST);
    assert.deepEqual([s.looked.length, s.sent.length], [2, 3]);
    assert.notEqual(s.state().step, 'not-accepted', `${code}: the hung attempt may still be accepted`);
    assert.notEqual(s.host.kept, null, 'Its identifiers are still kept');
    assert.equal(s.flow.dismiss(), false);
    assert.equal(s.flow.open('move'), false, 'and no new intent can be started');
    // The hung attempt is answered: accepted. That is the server's decision on this command.
    release();
    await flush();
    assert.deepEqual(s.state(), { step: 'accepted', choice: MOVE, armed: false }, code);
    assert.equal(s.host.kept, null);
  }
});

test('a receipt settles the command whichever check it answers, even one a newer check has overtaken', async () => {
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  // The first check's lookup hangs.
  let release;
  s.script.receipt.push(request => new Promise(resolve => { release = () => resolve(s.found({ ...s.sent[0], ...request })); }));
  await s.host.advance(FIRST);
  assert.equal(s.looked.length, 1);
  // A newer check starts and gets no answer.
  s.observe(undefined, { current: false });
  s.observe(undefined, { current: true });
  await s.host.advance(FIRST);
  assert.equal(s.looked.length, 2);
  assert.equal(s.state().step, 'checking');
  release();
  await flush();
  assert.equal(s.state().step, 'accepted');
  // Anything less than a receipt from an overtaken check is about the past and decides nothing.
  const other = setup();
  other.observe(playerView());
  await other.toConfirm();
  other.script.command.push(other.failure('RATE_LIMITED', 0));
  other.flow.confirm();
  await flush();
  let answer;
  other.script.receipt.push(() => new Promise(resolve => { answer = () => resolve(other.unknown); }));
  await other.host.advance(FIRST);
  other.observe(undefined, { current: false });
  other.observe(undefined, { current: true });
  await other.host.advance(FIRST);
  const sent = other.sent.length;
  answer();
  await flush();
  assert.equal(other.sent.length, sent, 'An overtaken check sends nothing');
});

test('a wait the server named outlasts everything that would otherwise ask at once', async () => {
  const WAIT = 30_000;
  const s = setup();
  const view = playerView();
  s.observe(view);
  await s.toConfirm();
  s.script.command.push(s.failure('RATE_LIMITED', WAIT));
  s.flow.confirm();
  await flush();
  const toldAt = s.host.localNow();
  // The feed flaps, the page is hidden and shown, the phase moves on. Each would start a check at once.
  await s.host.advance(200);
  s.observe(undefined, { current: false });
  s.observe(undefined, { current: true });
  await s.host.advance(200);
  s.observe(undefined, { foreground: false, panelOpen: false });
  s.observe(undefined, { foreground: true, panelOpen: true });
  await s.host.advance(200);
  s.observe(nextPhase(view));
  await s.host.advance(WAIT + JITTER - 600 - 1);
  assert.deepEqual([s.looked.length, s.sent.length], [0, 1], 'Nothing about this command leaves the device before the server allows');
  assert.equal(s.host.localNow() - toldAt, WAIT + JITTER - 1);
  s.script.receipt.push(s.unknown);
  await s.host.advance(1);
  assert.equal(s.looked.length, 1, 'Then it asks');

  // The same when a lookup is told to wait and the player keeps pressing "Check again".
  const again = setup();
  again.observe(playerView());
  await again.toConfirm();
  again.flow.confirm();
  await flush();
  await again.host.advance(FIRST + SECOND + THIRD);
  assert.equal(again.state().step, 'unknown');
  await again.host.advance(GUARD);
  again.script.receipt.push(again.failure('RATE_LIMITED', 10_000));
  assert.equal(again.flow.checkAgain(), true);
  await again.host.advance(FIRST);
  const asked = again.looked.length;
  assert.equal(asked, 4, 'The lookup that was told to wait');
  assert.equal(again.state().step, 'unknown');
  for (let press = 0; press < 5; press += 1) {
    await again.host.advance(GUARD);
    again.flow.checkAgain();
    await flush();
  }
  assert.equal(again.looked.length, asked, 'Five presses inside the wait: no lookup');
  assert.equal(again.state().step, 'checking', 'The check that was asked for is waiting its turn');
  again.script.receipt.push(request => again.found({ ...again.sent[0], ...request }));
  await again.host.advance(10_000);
  assert.equal(again.state().step, 'accepted', 'When the wait is over it runs');
  assert.equal(again.looked.length, asked + 1);
});

test('a feed that flaps, or a player who keeps pressing, cannot make it ask more than once a second', async () => {
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  await s.host.advance(FIRST);
  const before = s.looked.length;
  for (let flap = 0; flap < 20; flap += 1) {
    s.observe(undefined, { current: false });
    s.observe(undefined, { current: true });
    await s.host.advance(100);
  }
  // Two seconds of flapping: a check at most each second.
  assert.equal(s.looked.length - before <= 2, true, `${s.looked.length - before} lookups in two seconds`);
  assert.equal(s.looked.length - before >= 1, true, 'and coming back does still ask');
});

test('after being told to wait, a command the server never looked at is sent only if the present still allows it', async () => {
  const view = playerView();
  const cases = {
    'the countdown ran out': s => s.observe(undefined, { inTime: false }),
    'the phase moved on': s => s.observe(nextPhase(view)),
    'the server no longer offers the choice': s => s.observe(playerView('seat-1', next => { next.viewRevision = view.viewRevision + 1; next.self.movementDestinations = []; })),
  };
  for (const [name, change] of Object.entries(cases)) {
    const s = setup();
    s.observe(view);
    await s.toConfirm();
    s.script.command.push(s.failure('RATE_LIMITED', 3_000));
    s.flow.confirm();
    await flush();
    change(s);
    s.script.receipt.push(s.unknown, s.unknown);
    await s.host.advance(3_000 + JITTER + FIRST);
    assert.deepEqual(s.state(), { step: 'not-accepted', choice: MOVE, reason: 'NOT_SENT', armed: true }, name);
    assert.equal(s.sent.length, 1, `${name}: the one request the server turned away, and no other`);
    assert.equal(s.looked.length, 1, 'It asked first, and the server knew of no such command');
    assert.equal(s.host.kept, null);
  }
  // Still allowed: it goes again, the identical request.
  const allowed = setup();
  allowed.observe(view);
  await allowed.toConfirm();
  allowed.script.command.push(allowed.failure('RATE_LIMITED', 3_000), request => allowed.receipt(request));
  allowed.flow.confirm();
  await flush();
  allowed.script.receipt.push(allowed.unknown);
  await allowed.host.advance(3_000 + JITTER);
  assert.equal(allowed.state().step, 'accepted');
  assert.deepEqual(allowed.sent[1], allowed.sent[0]);
});

test('no command leaves on a view the server has not confirmed, and one that may have been decided is taken up again when it has', async () => {
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  // The first attempt went unanswered, and the feed is stale.
  s.observe(undefined, { current: false });
  s.script.receipt.push(s.unknown, s.unknown, s.unknown);
  await s.host.advance(FIRST + SECOND + THIRD);
  assert.equal(s.looked.length, 3, 'It may ask');
  assert.equal(s.sent.length, 1, 'It may not send');
  assert.equal(s.state().step, 'unknown');
  // Confirmed again: the identical request, whatever the clock says by now, because the
  // first attempt may have been decided and only the server can say.
  s.script.receipt.push(s.unknown);
  s.script.command.push(request => s.receipt(request, 'rejected', 'PHASE_CLOSED'));
  s.observe(undefined, { current: true, inTime: false });
  await s.host.advance(FIRST);
  assert.deepEqual(s.sent[1], s.sent[0]);
  assert.deepEqual(s.state(), { step: 'rejected', choice: MOVE, code: 'PHASE_CLOSED', armed: false });
});

test('a command whose outcome is unknown cannot be put away, whatever phase it is by now', async () => {
  const s = setup();
  const view = playerView();
  s.observe(view);
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  // The phase moves on and no lookup is ever answered.
  s.observe(nextPhase(view));
  await flush();
  await s.host.advance(FIRST + SECOND);
  assert.deepEqual(s.state(), { step: 'unknown', choice: MOVE, recovered: false, phaseOver: true, armed: false });
  await s.host.advance(GUARD);
  assert.equal(s.flow.dismiss(), false, 'No answer, no leaving');
  assert.equal(s.flow.open('move'), false);
  assert.notEqual(s.host.kept, null, 'The identifiers stay kept');
  // The same on a page that was reloaded.
  const reloaded = setup({ kept: s.host.kept });
  reloaded.observe(nextPhase(view));
  await flush();
  await reloaded.host.advance(FIRST + SECOND);
  assert.equal(reloaded.state().step, 'unknown');
  await reloaded.host.advance(GUARD);
  assert.equal(reloaded.flow.dismiss(), false);
  assert.equal(reloaded.flow.open('move'), false);
  assert.notEqual(reloaded.host.kept, null);
  // Asking again is the way on. Here the server knows nothing of it, after the phase was over.
  reloaded.script.receipt.push(reloaded.unknown);
  assert.equal(reloaded.flow.checkAgain(), true);
  await reloaded.host.advance(FIRST);
  assert.equal(reloaded.state().reason, 'PHASE_OVER');
  assert.equal(reloaded.host.kept, null);
});

test('an overtaken check that comes back empty starts nothing, and one told to wait meanwhile holds the newer check’s send', async () => {
  // Two checks out at once; the older one's lookup comes back with no answer.
  const s = setup();
  s.observe(playerView());
  await s.toConfirm();
  s.flow.confirm();
  await flush();
  let releaseOld;
  s.script.receipt.push(() => new Promise(resolve => { releaseOld = () => resolve(s.noAnswer); }));
  await s.host.advance(FIRST);
  s.observe(undefined, { current: false });
  s.observe(undefined, { current: true });
  s.script.receipt.push(() => new Promise(() => {}));
  await s.host.advance(FIRST);
  assert.equal(s.looked.length, 2, 'The newer check is out, and hangs');
  releaseOld();
  await flush();
  await s.host.advance(FIRST + SECOND + THIRD);
  assert.equal(s.looked.length, 2, 'The older check plans nothing of its own');
  assert.equal(s.state().step, 'checking', 'and does not call the outcome unknown over the head of the newer one');

  // The older check's re-send is told to wait while the newer check is asking.
  const told = setup();
  told.observe(playerView());
  await told.toConfirm();
  told.flow.confirm();
  await flush();
  let answerSend;
  told.script.receipt.push(told.unknown);
  told.script.command.push(() => new Promise(resolve => { answerSend = () => resolve(told.failure('RATE_LIMITED', 20_000)); }));
  await told.host.advance(FIRST);
  assert.equal(told.sent.length, 2, 'The identical request is out, and hangs');
  told.observe(undefined, { current: false });
  told.observe(undefined, { current: true });
  let answerLookup;
  told.script.receipt.push(() => new Promise(resolve => { answerLookup = () => resolve(told.unknown); }));
  await told.host.advance(FIRST);
  assert.equal(told.looked.length, 2);
  answerSend();
  await flush();
  answerLookup();
  await flush();
  assert.equal(told.sent.length, 2, 'Told to wait a moment ago: this check does not send into that wait');
  told.script.receipt.push(told.unknown);
  told.script.command.push(request => told.receipt(request));
  await told.host.advance(20_000 + JITTER);
  assert.equal(told.state().step, 'accepted');
  assert.equal(told.sent.length, 3);
  assert.deepEqual(told.sent[2], told.sent[0]);
});

test('a wait the server named also holds the first send of the next command, which then goes only if still allowed', async () => {
  const WAIT = 30_000;
  async function waitingAfterAnAcceptedShot() {
    const s = setup();
    const view = armedView();
    s.observe(view);
    await s.toConfirm(SHOT);
    s.flow.confirm();
    await flush();
    // The lookup is told to wait; then the player's own view lists the shot, which settles it.
    s.script.receipt.push(s.failure('RATE_LIMITED', WAIT));
    await s.host.advance(FIRST);
    const toldAt = s.host.localNow();
    const listed = armedView(next => { next.viewRevision = view.viewRevision + 1; next.ownPendingCommandIds = [s.sent[0].commandId]; next.self.shotAvailable = false; next.legalTargets = {}; });
    s.observe(listed);
    assert.equal(s.state().step, 'accepted');
    await s.host.advance(GUARD);
    s.flow.dismiss();
    // Two seconds into the wait the player confirms a move.
    await s.host.advance(2_000 - GUARD);
    await s.toConfirm(MOVE);
    assert.equal(s.flow.confirm(), true);
    await flush();
    assert.deepEqual(s.state(), { step: 'submitting', choice: MOVE });
    assert.equal(s.sent.length, 1, 'Nothing new has left the device');
    assert.notEqual(s.host.kept, null, 'Its identifiers are kept all the same');
    return { s, listed, remaining: WAIT + JITTER - (s.host.localNow() - toldAt) };
  }

  const held = await waitingAfterAnAcceptedShot();
  held.s.script.command.push(request => held.s.receipt(request));
  await held.s.host.advance(held.remaining - 1);
  assert.equal(held.s.sent.length, 1, 'Not a moment before the server allows');
  await held.s.host.advance(1);
  assert.equal(held.s.sent.length, 2);
  assert.deepEqual(held.s.sent[1].command, { type: 'MOVE', destination: 'Room B' });
  assert.equal(held.s.state().step, 'accepted');

  // The phase moves on during the wait: the move the server never saw is not sent afterwards.
  const moved = await waitingAfterAnAcceptedShot();
  moved.s.observe(nextPhase(moved.listed));
  await moved.s.host.advance(moved.remaining);
  assert.deepEqual(moved.s.state(), { step: 'not-accepted', choice: MOVE, reason: 'NOT_SENT', armed: false });
  assert.equal(moved.s.sent.length, 1);
  assert.equal(moved.s.host.kept, null);
});

// ---- The other actions that name one seat ----

const TARGET_COMMANDS = { disable: 'DISABLE', protect: 'PROTECT', rescue: 'RESCUE', hack: 'REQUEST_HACK', 'showdown-shot': 'SHOWDOWN_SHOT' };
/** Seat 1's view with one of them opened by the server for the seats given. Synthetic: no rule produced it. */
const opening = (command, seats, change = () => {}) => playerView('seat-1', view => {
  view.legalTargets = { ...view.legalTargets, [command]: seats };
  change(view);
});

test('each action that names a seat is offered from the view’s own list under its own command, and from nowhere else', () => {
  for (const [kind, command] of Object.entries(TARGET_COMMANDS)) {
    assert.deepEqual(offeredChoices(playerView(), kind), [], `${kind}: the view does not open it`);
    assert.deepEqual(offeredChoices(opening(command, ['seat-4', 'seat-1']), kind), [{ kind, targetSeatId: 'seat-4' }, { kind, targetSeatId: 'seat-1' }], kind);
    assert.deepEqual(offeredChoices(opening(command, []), kind), [], `${kind}: open with nobody to choose`);
    // Seats listed for any other command are not this action's.
    for (const other of ['REGISTER_SHOT', 'VOTE', 'SCAN', ...Object.values(TARGET_COMMANDS)].filter(name => name !== command)) {
      assert.deepEqual(offeredChoices(opening(other, ['seat-4'], view => { view.self.shotAvailable = true; }), kind), [], `${kind} is not opened by ${other}`);
    }
  }
});

test('each of them is the same flow: one confirmation, one schema-valid command of its own type for the seat chosen', async () => {
  for (const [kind, command] of Object.entries(TARGET_COMMANDS)) {
    const s = setup();
    const view = opening(command, ['seat-4', 'seat-1']);
    s.observe(view);
    assert.equal(s.flow.open(kind), true, kind);
    assert.deepEqual(s.state(), { step: 'choosing', kind });
    // Not on the list, another kind of choice, another action's choice for a seat that is on this list.
    assert.equal(s.flow.choose({ kind, targetSeatId: 'seat-5' }), false);
    assert.equal(s.flow.choose({ kind: 'move', destination: 'Room B' }), false);
    assert.equal(s.flow.choose({ kind: kind === 'disable' ? 'protect' : 'disable', targetSeatId: 'seat-4' }), false, 'A choice is for the action that was opened');
    const choice = { kind, targetSeatId: 'seat-4' };
    assert.equal(s.flow.choose(choice), true);
    await s.host.advance(GUARD);
    s.script.command.push(request => s.receipt(request));
    assert.equal(s.flow.confirm(), true);
    assert.equal(s.flow.confirm(), false, 'A second activation finds nothing to do');
    await flush();
    assert.equal(s.sent.length, 1, kind);
    assert.deepEqual(s.sent[0].command, { type: command, targetSeatId: 'seat-4' });
    assert.equal(FullCommandRequestSchema.safeParse(s.sent[0]).success, true);
    assert.deepEqual([s.sent[0].matchId, s.sent[0].phaseId], [MATCH, view.phase.id]);
    assert.deepEqual(s.state(), { step: 'accepted', choice, armed: false });
    // Only the identifiers were ever kept, and they are gone again.
    assert.equal(s.host.everKept.every(record => Object.keys(JSON.parse(record)).sort().join() === 'commandId,matchId,phaseId,seatId'), true);
    assert.equal(s.host.everKept.some(record => record.includes('seat-4') || record.includes(command)), false, 'Neither the target nor the kind of command is kept');
    assert.equal(s.host.kept, null);

    // The player's own seat, where the server lists it.
    const own = setup();
    own.observe(view);
    own.flow.open(kind);
    assert.equal(own.flow.choose({ kind, targetSeatId: 'seat-1' }), true);
    await own.host.advance(GUARD);
    own.script.command.push(request => own.receipt(request));
    own.flow.confirm();
    await flush();
    assert.deepEqual(own.sent[0].command, { type: command, targetSeatId: 'seat-1' });
  }
});

test('an action the server withdraws is withdrawn here too: the list shrinks, the action closes, and nothing is sent for what is gone', async () => {
  for (const [kind, command] of Object.entries(TARGET_COMMANDS)) {
    // The chosen seat leaves the list: asked to choose again.
    const s = setup();
    const view = opening(command, ['seat-4', 'seat-5']);
    s.observe(view);
    s.flow.open(kind);
    s.flow.choose({ kind, targetSeatId: 'seat-4' });
    await s.host.advance(GUARD);
    s.observe(opening(command, ['seat-5'], next => { next.viewRevision = view.viewRevision + 1; }));
    assert.deepEqual(s.state(), { step: 'choosing', kind }, kind);
    assert.equal(s.flow.confirm(), false);
    // The server no longer opens the action at all: nothing is left to choose.
    s.observe(playerView('seat-1', next => { next.viewRevision = view.viewRevision + 2; }));
    assert.deepEqual(s.state(), { step: 'idle' }, kind);
    assert.equal(s.flow.open(kind), false);
    assert.deepEqual(s.sent, []);
  }
});
