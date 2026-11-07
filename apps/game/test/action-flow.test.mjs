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

test('when the seat is no longer this device’s, everything about a command is let go at once and nothing more is asked', async () => {
  // In every state a command can be in: being chosen, waiting for its answer, being checked on, unknown.
  const reach = {
    confirming: async s => { await s.toConfirm(SHOT); },
    submitting: async s => {
      await s.toConfirm(SHOT);
      s.script.command.push(() => new Promise(() => {}));
      s.flow.confirm();
      await flush();
    },
    checking: async s => {
      await s.toConfirm(SHOT);
      s.script.command.push(s.noAnswer);
      s.script.receipt.push(() => new Promise(() => {}));
      s.flow.confirm();
      await flush();
    },
    unknown: async s => {
      await s.toConfirm(SHOT);
      s.flow.confirm();
      await flush();
      await s.host.advance(FIRST + SECOND + THIRD + 3 * JITTER + 60_000);
    },
  };
  for (const [step, arrange] of Object.entries(reach)) {
    const s = setup();
    s.observe(armedView());
    await arrange(s);
    assert.equal(s.state().step, step);
    if (step !== 'confirming') assert.match(s.host.kept, /"commandId"/, `${step}: the identifiers are kept for a reload`);
    const [sent, looked, notified] = [s.sent.length, s.looked.length, s.notified()];

    assert.equal(s.flow.release(), true, step);
    assert.deepEqual(s.state(), { step: 'idle' }, `${step}: nothing of the command or the choice is held`);
    assert.equal(s.host.kept, null, `${step}: nothing is kept for a reload`);
    assert.equal(s.host.pendingTimers(), 0, `${step}: no check is planned`);
    assert.equal(s.notified(), notified, 'It does not notify: the caller is drawing');
    // Time passes, the view the server refused is gone, and nothing is sent or asked.
    s.observe(null, { current: false });
    await s.host.advance(120_000);
    assert.deepEqual([s.sent.length, s.looked.length], [sent, looked], `${step}: nothing more leaves the device`);
    assert.deepEqual(s.state(), { step: 'idle' });
    assert.equal(s.flow.release(), false, 'Releasing again changes nothing');
  }

  // An answer that was on its way when the seat was lost is not taken up.
  const s = setup();
  s.observe(armedView());
  await s.toConfirm(SHOT);
  let arrive;
  s.script.command.push(request => new Promise(resolve => { arrive = () => resolve(s.receipt(request)); }));
  s.flow.confirm();
  await flush();
  s.flow.release();
  arrive();
  await flush();
  assert.deepEqual([s.state(), s.host.kept], [{ step: 'idle' }, null]);
  // A reloaded page that was about to ask what became of a command an earlier page left: that is let go too.
  const reloaded = setup({ kept: JSON.stringify({ matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-one', commandId: 'left-by-an-earlier-page' }) });
  assert.notEqual(reloaded.state().step, 'idle', 'It had taken the command up');
  const asked = reloaded.looked.length;
  assert.equal(reloaded.flow.release(), true);
  assert.deepEqual([reloaded.state(), reloaded.host.kept], [{ step: 'idle' }, null]);
  reloaded.observe(armedView());
  await flush();
  await reloaded.host.advance(120_000);
  assert.deepEqual([reloaded.state().step, reloaded.looked.length, reloaded.sent.length], ['idle', asked, 0], 'and it is not asked about afterwards');
  // With nothing in hand and nothing kept, there is nothing to let go.
  const idle = setup();
  assert.equal(idle.flow.release(), false);
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

// ---- Ballots ----

const VOTERS = ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7'];
/** Seat 1's view of a Jail vote the server has opened for it. Synthetic: no rule produced it. */
const jailVote = (change = () => {}) => playerView('seat-1', view => {
  view.phase = { ...view.phase, id: 'phase-jail-vote', kind: 'JAIL_VOTE' };
  view.activeSeatId = null;
  view.self.movementDestinations = [];
  view.ballot = { eligibleVoters: [...VOTERS], eligibleTargets: ['seat-3', 'seat-5', 'seat-1'], releaseTargetSeatId: null };
  view.legalTargets = { VOTE: ['seat-3', 'seat-5', 'seat-1'] };
  change(view);
});
/** The Captain's view of the release choice, with seat 4 in Jail. */
const releaseChoice = () => playerView('seat-1', view => {
  view.phase = { ...view.phase, id: 'phase-release-choice', kind: 'RELEASE_CHOICE' };
  view.self.movementDestinations = [];
  view.seats[0] = { ...view.seats[0], captain: true, location: 'Command Room' };
  view.seats[3] = { ...view.seats[3], jailed: true, location: 'Jail' };
  view.ballot = { eligibleVoters: [], eligibleTargets: ['seat-4'], releaseTargetSeatId: null };
  view.legalTargets = { RELEASE_CHOICE: ['seat-4'] };
});
/** A voter's view of the vote on releasing seat 4. */
const releaseVote = (change = () => {}) => playerView('seat-1', view => {
  view.phase = { ...view.phase, id: 'phase-release-vote', kind: 'RELEASE_VOTE' };
  view.activeSeatId = null;
  view.self.movementDestinations = [];
  view.seats[3] = { ...view.seats[3], jailed: true, location: 'Jail' };
  view.ballot = { eligibleVoters: [...VOTERS], eligibleTargets: [], releaseTargetSeatId: 'seat-4' };
  view.self.releaseVoteAvailable = true;
  change(view);
});
const BALLOTS = [
  { name: 'a vote for a seat', view: jailVote, choice: { kind: 'vote', targetSeatId: 'seat-5' }, command: { type: 'VOTE', targetSeatId: 'seat-5' } },
  { name: 'a vote for the player’s own seat', view: jailVote, choice: { kind: 'vote', targetSeatId: 'seat-1' }, command: { type: 'VOTE', targetSeatId: 'seat-1' } },
  { name: 'an abstention', view: jailVote, choice: { kind: 'vote', targetSeatId: null }, command: { type: 'VOTE', targetSeatId: null } },
  { name: 'a release request', view: releaseChoice, choice: { kind: 'release-choice', targetSeatId: 'seat-4' }, command: { type: 'RELEASE_CHOICE', targetSeatId: 'seat-4' } },
  { name: 'no release request', view: releaseChoice, choice: { kind: 'release-choice', targetSeatId: null }, command: { type: 'RELEASE_CHOICE', targetSeatId: null } },
  { name: 'yes to a release', view: releaseVote, choice: { kind: 'release-vote', approve: true }, command: { type: 'RELEASE_VOTE', approve: true } },
  { name: 'no to a release', view: releaseVote, choice: { kind: 'release-vote', approve: false }, command: { type: 'RELEASE_VOTE', approve: false } },
  { name: 'an abstention on a release', view: releaseVote, choice: { kind: 'release-vote', approve: null }, command: { type: 'RELEASE_VOTE', approve: null } },
];

test('a ballot is offered from the view’s own statement that it is open, and from nowhere else', () => {
  for (const kind of ['vote', 'release-choice', 'release-vote']) assert.deepEqual(offeredChoices(playerView(), kind), [], `${kind}: the view does not open it`);
  assert.deepEqual(offeredChoices(jailVote(), 'vote'), [{ kind: 'vote', targetSeatId: 'seat-3' }, { kind: 'vote', targetSeatId: 'seat-5' }, { kind: 'vote', targetSeatId: 'seat-1' }, { kind: 'vote', targetSeatId: null }]);
  assert.deepEqual(offeredChoices(releaseChoice(), 'release-choice'), [{ kind: 'release-choice', targetSeatId: 'seat-4' }, { kind: 'release-choice', targetSeatId: null }]);
  assert.deepEqual(offeredChoices(releaseVote(), 'release-vote'), [{ kind: 'release-vote', approve: true }, { kind: 'release-vote', approve: false }, { kind: 'release-vote', approve: null }]);
  // A phase that is a vote opens nothing by its name: the server has not listed this seat a ballot.
  assert.deepEqual(offeredChoices(jailVote(view => { view.legalTargets = {}; }), 'vote'), []);
  assert.deepEqual(offeredChoices(releaseVote(view => { view.self.releaseVoteAvailable = false; }), 'release-vote'), []);
  // One ballot's opening is not another's.
  assert.deepEqual(offeredChoices(jailVote(), 'release-choice'), []);
  assert.deepEqual(offeredChoices(jailVote(), 'release-vote'), []);
  assert.deepEqual(offeredChoices(releaseChoice(), 'vote'), []);
  assert.deepEqual(offeredChoices(releaseVote(), 'vote'), []);
  // Nor does a vote open an action that names a seat.
  for (const kind of ['shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot']) assert.deepEqual(offeredChoices(jailVote(), kind), [], kind);
});

test('each ballot is the same flow: one confirmation, one schema-valid command of its own type, and nothing of it kept', async () => {
  for (const { name, view, choice, command } of BALLOTS) {
    const s = setup();
    const shown = view();
    s.observe(shown);
    assert.equal(s.flow.open(choice.kind), true, name);
    assert.deepEqual(s.state(), { step: 'choosing', kind: choice.kind });
    assert.equal(s.flow.choose(choice), true, name);
    await s.host.advance(GUARD);
    s.script.command.push(request => s.receipt(request));
    assert.equal(s.flow.confirm(), true);
    assert.equal(s.flow.confirm(), false, 'A second activation finds nothing to do');
    await flush();
    assert.equal(s.sent.length, 1, name);
    assert.deepEqual(s.sent[0].command, command, name);
    assert.equal(FullCommandRequestSchema.safeParse(s.sent[0]).success, true, name);
    assert.deepEqual([s.sent[0].matchId, s.sent[0].phaseId], [MATCH, shown.phase.id]);
    assert.deepEqual(s.state(), { step: 'accepted', choice, armed: false });
    // A ballot is private: only the command's identifiers were ever kept, and they are gone again.
    assert.equal(s.host.everKept.every(record => Object.keys(JSON.parse(record)).sort().join() === 'commandId,matchId,phaseId,seatId'), true, name);
    assert.equal(s.host.everKept.some(record => /VOTE|RELEASE|approve|seat-[2-9]|none|yes|no\b/.test(record.replace(shown.phase.id, ''))), false, `${name}: neither the ballot nor its kind is kept`);
    assert.equal(s.host.kept, null);
  }
});

test('a ballot can only be an answer the server offers for the ballot that was opened', async () => {
  const s = setup();
  s.observe(jailVote());
  assert.equal(s.flow.open('release-vote'), false, 'A ballot the view does not open cannot be opened');
  assert.equal(s.flow.open('release-choice'), false);
  assert.equal(s.flow.open('vote'), true);
  // A seat the server did not list, and answers that belong to other ballots.
  assert.equal(s.flow.choose({ kind: 'vote', targetSeatId: 'seat-2' }), false);
  assert.equal(s.flow.choose({ kind: 'release-vote', approve: true }), false);
  assert.equal(s.flow.choose({ kind: 'release-choice', targetSeatId: null }), false);
  assert.equal(s.flow.choose({ kind: 'shot', targetSeatId: 'seat-3' }), false);
  assert.deepEqual(s.state(), { step: 'choosing', kind: 'vote' });
  assert.deepEqual(s.sent, []);

  // The Captain may name only a seat the server lists, or nobody.
  const captain = setup();
  captain.observe(releaseChoice());
  assert.equal(captain.flow.open('release-choice'), true);
  assert.equal(captain.flow.choose({ kind: 'release-choice', targetSeatId: 'seat-5' }), false);
  assert.equal(captain.flow.choose({ kind: 'vote', targetSeatId: 'seat-4' }), false);
  assert.equal(captain.flow.choose({ kind: 'release-choice', targetSeatId: null }), true);
});

test('a ballot that was not sent does not outlive its vote, or the server’s offer of it', async () => {
  // The vote closes while the player is still deciding: nothing is sent, then or later.
  const s = setup();
  const view = jailVote();
  s.observe(view);
  await s.toConfirm({ kind: 'vote', targetSeatId: 'seat-5' });
  s.observe(nextPhase(view));
  assert.deepEqual(s.state(), { step: 'idle' });
  assert.equal(s.flow.confirm(), false);
  assert.deepEqual(s.sent, []);

  // The candidate leaves the server's list: asked to choose again among those that remain.
  const shrunk = setup();
  shrunk.observe(view);
  await shrunk.toConfirm({ kind: 'vote', targetSeatId: 'seat-5' });
  shrunk.observe(jailVote(next => { next.viewRevision = view.viewRevision + 1; next.legalTargets = { VOTE: ['seat-3'] }; next.ballot.eligibleTargets = ['seat-3']; }));
  assert.deepEqual(shrunk.state(), { step: 'choosing', kind: 'vote' });

  // The server stops offering the ballot altogether, in the same phase: the card closes at once, with nothing left to choose.
  const withdrawn = setup();
  withdrawn.observe(view);
  await withdrawn.toConfirm({ kind: 'vote', targetSeatId: 'seat-5' });
  withdrawn.observe(jailVote(next => { next.viewRevision = view.viewRevision + 1; next.legalTargets = {}; next.hasVoted = true; next.ownBallot = 'seat-3'; }));
  assert.deepEqual(withdrawn.state(), { step: 'idle' });
  assert.equal(withdrawn.flow.confirm(), false);
  assert.equal(withdrawn.flow.open('vote'), false);
  assert.deepEqual(withdrawn.sent, []);

  // The clock runs out with the ballot unsent: it is dropped, and the confirm control does nothing.
  const late = setup();
  late.observe(view);
  await late.toConfirm({ kind: 'vote', targetSeatId: null });
  late.observe(undefined, { inTime: false });
  assert.deepEqual(late.state(), { step: 'idle' });
  assert.equal(late.flow.confirm(), false);
  assert.deepEqual(late.sent, []);
});

test('a ballot whose answer is lost is asked about and sent again as the identical request, and is one ballot', async () => {
  const s = setup();
  const view = jailVote();
  s.observe(view);
  await s.toConfirm({ kind: 'vote', targetSeatId: 'seat-5' });
  // The first answer never arrives; the lookup finds no receipt; the identical request then gets one.
  s.script.command.push(s.noAnswer, request => s.receipt(request));
  s.script.receipt.push(s.unknown);
  assert.equal(s.flow.confirm(), true);
  await flush();
  assert.equal(s.state().step, 'checking');
  await s.host.advance(FIRST);
  await flush();
  assert.equal(s.sent.length, 2);
  assert.deepEqual(s.sent[1], s.sent[0], 'The identical request, with the same command identifier');
  assert.deepEqual(s.looked.map(request => request.commandId), [s.sent[0].commandId]);
  assert.deepEqual(s.state(), { step: 'accepted', choice: { kind: 'vote', targetSeatId: 'seat-5' }, armed: false });

  // A reloaded page knows only the identifiers. It asks, and never sends a ballot it no longer has.
  const kept = JSON.stringify({ matchId: MATCH, seatId: 'seat-1', phaseId: view.phase.id, commandId: 'ballot-before-reload' });
  const reloaded = setup({ kept });
  reloaded.script.receipt.push(request => reloaded.found({ ...request, phaseId: view.phase.id }));
  // The server's view after the reload says the seat has voted; the receipt says the command was accepted.
  reloaded.observe(jailVote(next => { next.legalTargets = {}; next.hasVoted = true; next.ownBallot = 'seat-5'; }));
  await flush();
  assert.deepEqual(reloaded.sent, []);
  assert.deepEqual(reloaded.state(), { step: 'accepted', choice: null, armed: false });
});

// ---- Actions whose choice has several parts ----

/** Seat 1's views with a Scan, a Supply or a Code attempt opened by the server. Synthetic: no rule produced them. */
const scanView = (seats = ['seat-3', 'seat-5', 'seat-1'], change = () => {}) => playerView('seat-1', view => { view.legalTargets = { SCAN: seats }; change(view); });
const supplyView = (seats = ['seat-3', 'seat-5', 'seat-1'], change = () => {}) => playerView('seat-1', view => { view.round = 3; view.legalTargets = { SUPPLY: seats }; change(view); });
const codeView = (change = () => {}) => playerView('seat-1', view => { view.round = 5; view.self.codeAttemptAvailable = true; change(view); });
const SCAN = { kind: 'scan', targetSeatId: 'seat-3', guess: 'Red' };
const SUPPLY = { kind: 'supply', targetSeatIds: ['seat-5', 'seat-3'] };
const CODE = { kind: 'code', seatIds: ['seat-7', 'seat-2', 'seat-5', 'seat-3'] };

test('a choice with several parts is picked one part at a time, only from what the view offers next, and becomes one command', async () => {
  const cases = [
    { name: 'a Scan', view: scanView(), kind: 'scan', refused: [['seat-2', 'Red'], ['seat-3', 'seat-5', 'Green']], picks: ['seat-3', 'Red'], choice: SCAN, command: { type: 'SCAN', targetSeatId: 'seat-3', guess: 'Red' } },
    { name: 'a Supply', view: supplyView(), kind: 'supply', refused: [['seat-2', 'Blue'], ['seat-5', 'seat-5', 'seat-2']], picks: ['seat-5', 'seat-3'], choice: SUPPLY, command: { type: 'SUPPLY', targetSeatIds: ['seat-5', 'seat-3'] } },
    { name: 'a Code attempt', view: codeView(), kind: 'code', refused: [['seat-8', 'Red'], ['seat-7', 'seat-7'], ['seat-2', 'seat-9'], ['seat-5', 'seat-2']], picks: ['seat-7', 'seat-2', 'seat-5', 'seat-3'], choice: CODE, command: { type: 'SUBMIT_CODE', seatIds: ['seat-7', 'seat-2', 'seat-5', 'seat-3'] } },
  ];
  for (const { name, view, kind, refused, picks, choice, command } of cases) {
    const s = setup();
    assert.equal(s.flow.pick(picks[0]), false, 'Nothing can be picked before the action is opened');
    s.observe(view);
    assert.equal(s.flow.open(kind), true, name);
    assert.deepEqual(s.state(), { step: 'choosing', kind });
    // Before each part: names the view does not offer next are not picked. The first of each list is tried, then the right part.
    const taken = [];
    for (const [index, part] of picks.entries()) {
      for (const wrong of refused[index] ?? []) assert.equal(s.flow.pick(wrong), false, `${name}: ${wrong} is not offered after ${taken.join()}`);
      assert.deepEqual(s.state(), taken.length > 0 ? { step: 'choosing', kind, picked: taken } : { step: 'choosing', kind });
      assert.equal(s.flow.pick(part), true, `${name}: ${part}`);
      taken.push(part);
    }
    // The last part makes the choice whole. It is not sent: it is asked about.
    assert.deepEqual(s.state(), { step: 'confirming', choice, armed: false }, name);
    assert.equal(s.flow.pick('seat-1'), false, 'A whole choice takes no more parts');
    assert.deepEqual(s.sent, []);
    await s.host.advance(GUARD);
    s.script.command.push(request => s.receipt(request));
    assert.equal(s.flow.confirm(), true);
    assert.equal(s.flow.confirm(), false, 'A second activation finds nothing to do');
    await flush();
    assert.equal(s.sent.length, 1, name);
    assert.deepEqual(s.sent[0].command, command, name);
    assert.equal(FullCommandRequestSchema.safeParse(s.sent[0]).success, true, name);
    assert.deepEqual(s.state(), { step: 'accepted', choice, armed: false });
    // Only the command's identifiers were ever kept: no seat it named, no guess, no kind.
    assert.equal(s.host.everKept.every(record => Object.keys(JSON.parse(record)).sort().join() === 'commandId,matchId,phaseId,seatId'), true, name);
    assert.equal(s.host.everKept.some(record => /seat-[2-9]|Red|SCAN|SUPPLY|CODE/.test(record)), false, `${name}: nothing of the choice is kept`);
    assert.equal(s.host.kept, null);
  }
  // Listed choice by choice, an action with several parts lists nothing: its parts are asked for one at a time.
  for (const [view, kind] of [[scanView(), 'scan'], [supplyView(), 'supply'], [codeView(), 'code']]) assert.deepEqual(offeredChoices(view, kind), []);
});

test('a whole choice can also be given at once, and is held to the same view', async () => {
  for (const [view, choice, wrong] of [
    [scanView(), SCAN, [{ ...SCAN, targetSeatId: 'seat-2' }, { ...SCAN, guess: 'Green' }, SUPPLY]],
    [supplyView(), SUPPLY, [{ kind: 'supply', targetSeatIds: ['seat-5', 'seat-5'] }, { kind: 'supply', targetSeatIds: ['seat-5', 'seat-2'] }, SCAN]],
    [codeView(), CODE, [{ kind: 'code', seatIds: ['seat-7', 'seat-7', 'seat-5', 'seat-3'] }, { kind: 'code', seatIds: ['seat-8', 'seat-2', 'seat-5', 'seat-3'] }, SCAN]],
  ]) {
    const s = setup();
    s.observe(view);
    assert.equal(s.flow.open(choice.kind), true);
    for (const other of wrong) assert.equal(s.flow.choose(other), false, JSON.stringify(other));
    assert.equal(s.flow.choose(choice), true);
    assert.deepEqual(s.state(), { step: 'confirming', choice, armed: false });
  }
  // An action the view does not open, or opens with too few seats for a whole choice, cannot be opened.
  const s = setup();
  s.observe(playerView());
  for (const kind of ['scan', 'supply', 'code']) assert.equal(s.flow.open(kind), false, kind);
  s.observe(supplyView(['seat-3']));
  assert.equal(s.flow.open('supply'), false, 'Fewer seats than a Supply names');
  s.observe(scanView([]));
  assert.equal(s.flow.open('scan'), false);
});

test('the last pick can be undone, and choosing again starts from nothing', async () => {
  const s = setup();
  s.observe(codeView());
  s.flow.open('code');
  for (const part of ['seat-7', 'seat-2', 'seat-5']) s.flow.pick(part);
  assert.deepEqual(s.state(), { step: 'choosing', kind: 'code', picked: ['seat-7', 'seat-2', 'seat-5'] });
  assert.equal(s.flow.back(), true);
  assert.deepEqual(s.state(), { step: 'choosing', kind: 'code', picked: ['seat-7', 'seat-2'] });
  assert.equal(s.flow.pick('seat-5'), true, 'What was undone can be picked again');
  assert.equal(s.flow.pick('seat-3'), true);
  assert.equal(s.state().step, 'confirming');
  // From the question, back means choosing again from the start.
  assert.equal(s.flow.back(), true);
  assert.deepEqual(s.state(), { step: 'choosing', kind: 'code' });
  assert.equal(s.flow.back(), true);
  assert.deepEqual(s.state(), { step: 'idle' });
  assert.equal(s.flow.back(), false);
  assert.deepEqual(s.sent, []);
});

test('a selection does not outlive the view it was made from', async () => {
  // The seat picked for a Scan leaves the server's list: the picks are dropped and the player chooses again.
  const scan = setup();
  const before = scanView();
  scan.observe(before);
  scan.flow.open('scan');
  scan.flow.pick('seat-3');
  scan.observe(scanView(['seat-5', 'seat-1'], view => { view.viewRevision = before.viewRevision + 1; }));
  assert.deepEqual(scan.state(), { step: 'choosing', kind: 'scan' });
  assert.equal(scan.flow.pick('Red'), false, 'A guess without a seat is not a part');
  // The server stops offering the Scan: the action closes.
  scan.observe(playerView('seat-1', view => { view.viewRevision = before.viewRevision + 2; }));
  assert.deepEqual(scan.state(), { step: 'idle' });

  // A Supply needs two seats. With one left on the list no whole choice can be made, so the action closes.
  const supply = setup();
  const two = supplyView();
  supply.observe(two);
  supply.flow.open('supply');
  supply.flow.pick('seat-5');
  supply.observe(supplyView(['seat-5'], view => { view.viewRevision = two.viewRevision + 1; }));
  assert.deepEqual(supply.state(), { step: 'idle' });

  // A whole Code attempt, waiting to be confirmed, when the view stops opening it: closed, and nothing is sent.
  const code = setup();
  const open = codeView();
  code.observe(open);
  code.flow.open('code');
  for (const part of CODE.seatIds) code.flow.pick(part);
  await code.host.advance(GUARD);
  code.observe(codeView(view => { view.viewRevision = open.viewRevision + 1; view.self.codeAttemptAvailable = false; }));
  assert.deepEqual(code.state(), { step: 'idle' });
  assert.equal(code.flow.confirm(), false);

  // A new phase, a closed panel, a clock that ran out: picks made so far are dropped.
  for (const leave of [s => s.observe(nextPhase(open)), s => s.observe(undefined, { panelOpen: false }), s => s.observe(undefined, { inTime: false }), s => s.observe(undefined, { current: false })]) {
    const s = setup();
    s.observe(open);
    s.flow.open('code');
    s.flow.pick('seat-7');
    s.flow.pick('seat-2');
    leave(s);
    assert.deepEqual(s.state(), { step: 'idle' });
    assert.equal(s.flow.pick('seat-5'), false);
    assert.deepEqual(s.sent, []);
  }
  assert.deepEqual([scan.sent, supply.sent, code.sent], [[], [], []]);
});

test('the one Code attempt whose answer is lost is asked about and sent again as the identical request', async () => {
  const s = setup();
  s.observe(codeView());
  s.flow.open('code');
  for (const part of CODE.seatIds) s.flow.pick(part);
  await s.host.advance(GUARD);
  s.script.command.push(s.noAnswer, request => s.receipt(request));
  s.script.receipt.push(s.unknown);
  assert.equal(s.flow.confirm(), true);
  await flush();
  assert.equal(s.state().step, 'checking');
  await s.host.advance(FIRST);
  await flush();
  assert.equal(s.sent.length, 2);
  assert.deepEqual(s.sent[1], s.sent[0], 'The identical request, with the same command identifier');
  assert.deepEqual(s.sent[0].command, { type: 'SUBMIT_CODE', seatIds: CODE.seatIds });
  assert.deepEqual(s.state(), { step: 'accepted', choice: CODE, armed: false });

  // After a reload the attempt itself is gone from the device. The page asks about it and can send nothing.
  const kept = JSON.stringify({ matchId: MATCH, seatId: 'seat-1', phaseId: 'phase-one', commandId: 'code-before-reload' });
  const reloaded = setup({ kept });
  reloaded.script.receipt.push(request => reloaded.found({ ...request, phaseId: 'phase-one' }));
  reloaded.observe(codeView(view => { view.self.codeAttemptAvailable = false; }));
  await flush();
  assert.deepEqual(reloaded.sent, []);
  assert.deepEqual(reloaded.state(), { step: 'accepted', choice: null, armed: false });
});



test('Pass uses one durable command with the private panel closed, and settles across a phase change', async () => {
  const s=setup();
  const view=playerView('seat-1',v=>{v.legalTargets.PASS_TURN=['seat-1'];});
  s.observe(view,{panelOpen:false});
  s.script.command.push(s.noAnswer);
  assert.equal(s.flow.pass(),true);
  assert.equal(s.flow.pass(),false,'Double tap cannot send a second command');
  await flush();
  assert.equal(s.sent.length,1);
  assert.deepEqual(s.sent[0].command,{type:'PASS_TURN'});
  FullCommandRequestSchema.parse(s.sent[0]);
  const kept=JSON.parse(s.host.kept);
  assert.deepEqual(Object.keys(kept).sort(),['commandId','matchId','phaseId','seatId']);
  const moved=nextPhase(view);moved.legalTargets={};moved.activeSeatId='seat-2';
  s.script.receipt.push(s.found(s.sent[0]));
  s.observe(moved);
  await s.host.advance(FIRST);
  assert.equal(s.state().step,'accepted');
  assert.equal(s.host.kept,null);
  assert.equal(s.sent.length,1,'A fresh new phase needs only a receipt lookup');
});
test('Pass requires its own server hint, current time/view/foreground, and no unresolved or unsent action', async () => {
  for(const override of [{current:false},{inTime:false},{foreground:false}]) {
    const s=setup();s.observe(playerView('seat-1',v=>{v.legalTargets.PASS_TURN=['seat-1'];}),override);
    assert.equal(s.flow.pass(),false);assert.equal(s.sent.length,0);
  }
  for(const alter of [()=>{},v=>{v.legalTargets.PASS_TURN=['seat-2'];},v=>{v.legalTargets.PASS_TURN=['seat-1'];v.activeSeatId='seat-2';},v=>{v.legalTargets.PASS_TURN=['seat-1'];v.phase.kind='HACK';}]) {
    const s=setup();s.observe(playerView('seat-1',alter));assert.equal(s.flow.pass(),false);
  }
  const s=setup();s.observe(playerView('seat-1',v=>{v.legalTargets.PASS_TURN=['seat-1'];}));
  s.flow.open('move');assert.equal(s.flow.pass(),false,'Do not discard an unfinished choice');
  s.flow.back();s.script.command.push(r=>s.receipt(r));assert.equal(s.flow.pass(),true);await flush();
  assert.equal(s.flow.pass(),false,'Receipt acknowledgment guard still applies');
  await s.host.advance(GUARD);
  s.observe(nextPhase(playerView()));assert.equal(s.flow.pass(),false);
});
