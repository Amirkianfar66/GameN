// mothership:dev-only
//
// The private Hack's model (design/phone-kit/js/hack.js, issue #121) draws only feedback bound to the view's current
// phase: its phaseId is the phase's own id, it names its exchange, its status belongs to the stage and its side to its
// status. Anything else draws nothing, never a guessed stage and never "No side declared" in its place. The shape is the
// contract as Frontend reviewed Backend's ba1842f (not on the remote here); these tests check the prototype's reading of it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIDES, STAGE_STATUSES, claimSentence, hackFeedbackProblem, hackModel } from '../../../design/phone-kit/js/hack.js';
import { SCENARIOS, VIEWER, hackExchangeId, hackPhaseId, staleHackFeedback } from '../../../design/board-motion/js/fixtures.js';

const seats = [1, 2, 3, 4, 5].map(n => ({ n, name: `Player ${n}`, character: `c${n}` }));
const PHASE = { HACK_DECLARE: 'phase-declare-b', HACK_RESULT: 'phase-result-b', HACK: 'phase-talk-b' };
const phase = kind => ({ kind, id: PHASE[kind], startedAt: 0, endsAt: 5000 });
const feedback = (kind, status, declaredSide = null, more = {}) => ({ hackId: 'hack-b', phaseId: PHASE[kind], status, declaredSide, ...more });
// Player 3 is this phone: the initiator (the active seat) with Player 5 as its target, or the target of Player 5.
const asInitiator = (kind, fb) => hackModel({ phase: phase(kind), initiator: 3, viewer: 3, feedback: fb, partner: 5, seats });
const asTarget = (kind, fb, canDeclare = false) => hackModel({ phase: phase(kind), initiator: 5, viewer: 3, feedback: fb, partner: 5, canDeclare, seats });

test('feedback bound to the current phase draws, for both participants and every stage', () => {
  const declare = asTarget('HACK_DECLARE', feedback('HACK_DECLARE', 'AWAITING_DECLARATION'), true);
  assert.equal(declare?.stage, 'declare');
  assert.equal(declare.canDeclare, true);
  assert.equal(declare.hackId, 'hack-b');
  assert.equal(declare.phaseId, 'phase-declare-b');
  assert.equal(asInitiator('HACK_DECLARE', feedback('HACK_DECLARE', 'AWAITING_DECLARATION'))?.audience, 'initiator');
  for (const side of SIDES) {
    assert.equal(asInitiator('HACK_RESULT', feedback('HACK_RESULT', 'DECLARED', side))?.declared, side);
    assert.equal(asTarget('HACK', feedback('HACK', 'DECLARED', side))?.declared, side);
  }
  const none = asInitiator('HACK_RESULT', feedback('HACK_RESULT', 'NO_DECLARATION'));
  assert.equal(none?.status, 'NO_DECLARATION');
  assert.equal(none.declared, null);
  assert.equal(claimSentence(none), 'No side declared. Player 5 did not declare a side in time.');
  assert.equal(asTarget('HACK', feedback('HACK', 'NO_DECLARATION'))?.declared, null);
});

test('the review\'s reproduction: HACK_RESULT phase-current with feedback for phase-obsolete draws nothing', () => {
  const fb = { hackId: 'hack-b', phaseId: 'phase-obsolete', status: 'DECLARED', declaredSide: 'Red' };
  const current = { kind: 'HACK_RESULT', id: 'phase-current' };
  assert.equal(hackFeedbackProblem(current, fb), 'the feedback belongs to another phase');
  assert.equal(hackModel({ phase: current, initiator: 3, viewer: 3, feedback: fb, partner: 5, seats }), null);
});

test('feedback from an earlier phase of the same exchange is refused', () => {
  // The claim's phase still holding the declaration window's feedback (same hackId, the earlier phaseId).
  const fromDeclare = feedback('HACK_DECLARE', 'AWAITING_DECLARATION');
  assert.equal(hackFeedbackProblem(phase('HACK_RESULT'), fromDeclare), 'the feedback belongs to another phase');
  assert.equal(asInitiator('HACK_RESULT', fromDeclare), null);
  // Consistent in itself (DECLARED Red is a valid talk status): only its phase id says it is the claim's.
  const fromResult = feedback('HACK_RESULT', 'DECLARED', 'Red');
  assert.equal(hackFeedbackProblem(phase('HACK'), fromResult), 'the feedback belongs to another phase');
  assert.equal(asInitiator('HACK', fromResult), null);
  assert.equal(asTarget('HACK', fromResult), null);
  // And the claim's phase given the declaration window's feedback once more, for the target that may declare.
  assert.equal(asTarget('HACK_DECLARE', feedback('HACK_RESULT', 'NO_DECLARATION'), true), null);
});

test('feedback from another exchange is refused, even when its claim is consistent', () => {
  const other = { hackId: 'hack-a', phaseId: 'phase-result-a', status: 'DECLARED', declaredSide: 'Blue' };
  assert.equal(hackFeedbackProblem(phase('HACK_RESULT'), other), 'the feedback belongs to another phase');
  assert.equal(asInitiator('HACK_RESULT', other), null);
  assert.equal(asTarget('HACK_DECLARE', { hackId: 'hack-a', phaseId: 'phase-declare-a', status: 'AWAITING_DECLARATION', declaredSide: null }, true), null);
  assert.equal(asTarget('HACK', { hackId: 'hack-a', phaseId: 'phase-talk-a', status: 'NO_DECLARATION', declaredSide: null }), null);
});

test('a missing phase id or exchange id is refused', () => {
  const fb = feedback('HACK_RESULT', 'DECLARED', 'Red');
  assert.equal(hackFeedbackProblem({ kind: 'HACK_RESULT' }, fb), 'the phase has no id');
  assert.equal(hackModel({ phase: { kind: 'HACK_RESULT' }, initiator: 3, viewer: 3, feedback: fb, partner: 5, seats }), null);
  assert.equal(hackModel({ phase: { kind: 'HACK_RESULT', id: '' }, initiator: 3, viewer: 3, feedback: { ...fb, phaseId: '' }, partner: 5, seats }), null);
  for (const phaseId of [undefined, null, '', 7]) {
    assert.equal(asInitiator('HACK_RESULT', { ...fb, phaseId }), null, String(phaseId));
    assert.equal(hackFeedbackProblem(phase('HACK_RESULT'), { ...fb, phaseId }), 'the feedback names no phase');
  }
  for (const hackId of [undefined, null, '']) {
    assert.equal(asInitiator('HACK_RESULT', { ...fb, hackId }), null, String(hackId));
    assert.equal(hackFeedbackProblem(phase('HACK_RESULT'), { ...fb, hackId }), 'the feedback names no exchange');
  }
});

test('a status and a side that do not belong together are refused, never drawn as "No side declared"', () => {
  const invalid = [
    ['HACK_RESULT', feedback('HACK_RESULT', 'DECLARED', null), 'DECLARED without one of the three sides'],
    ['HACK_RESULT', feedback('HACK_RESULT', 'DECLARED', 'Purple'), 'DECLARED without one of the three sides'],
    ['HACK_RESULT', feedback('HACK_RESULT', 'DECLARED', 'red'), 'DECLARED without one of the three sides'],
    ['HACK', feedback('HACK', 'DECLARED', undefined), 'DECLARED without one of the three sides'],
    ['HACK_RESULT', feedback('HACK_RESULT', 'NO_DECLARATION', 'Blue'), 'a side with NO_DECLARATION'],
    ['HACK_DECLARE', feedback('HACK_DECLARE', 'AWAITING_DECLARATION', 'Red'), 'a side with AWAITING_DECLARATION'],
    ['HACK_RESULT', feedback('HACK_RESULT', 'VERIFIED', 'Red'), 'VERIFIED in HACK_RESULT'],
    ['HACK_RESULT', feedback('HACK_RESULT', undefined), 'no status in HACK_RESULT'],
    // A status the stage cannot carry: awaited after its window, or decided inside it.
    ['HACK_RESULT', feedback('HACK_RESULT', 'AWAITING_DECLARATION'), 'AWAITING_DECLARATION in HACK_RESULT'],
    ['HACK', feedback('HACK', 'AWAITING_DECLARATION'), 'AWAITING_DECLARATION in HACK'],
    ['HACK_DECLARE', feedback('HACK_DECLARE', 'DECLARED', 'Red'), 'DECLARED in HACK_DECLARE'],
    ['HACK_DECLARE', feedback('HACK_DECLARE', 'NO_DECLARATION'), 'NO_DECLARATION in HACK_DECLARE'],
  ];
  for (const [kind, fb, problem] of invalid) {
    assert.equal(hackFeedbackProblem(phase(kind), fb), problem, `${kind} ${fb.status} ${fb.declaredSide}`);
    for (const model of [asInitiator(kind, fb), asTarget(kind, fb, true)]) {
      assert.equal(model, null, `${kind} ${fb.status} ${fb.declaredSide}`);
      assert.equal(claimSentence(model), null);
    }
  }
  assert.deepEqual(Object.keys(STAGE_STATUSES), ['declare', 'result', 'talk']);
});

test('the participant and partner checks still hold', () => {
  const fb = feedback('HACK_RESULT', 'DECLARED', 'Red');
  const at = (args) => hackModel({ phase: phase('HACK_RESULT'), feedback: fb, seats, ...args });
  assert.equal(at({ initiator: 5, viewer: 3, partner: null }), null, 'a view without a partner');
  assert.equal(at({ initiator: 3, viewer: 3, partner: 3 }), null, 'its own partner');
  assert.equal(at({ initiator: 3, viewer: 3, partner: 9 }), null, 'a partner not in the match');
  assert.equal(at({ initiator: 4, viewer: 3, partner: 5 }), null, 'a target whose partner is not the initiator');
  assert.equal(at({ initiator: null, viewer: 3, partner: 5 }), null, 'no initiator');
  assert.equal(hackModel({ phase: phase('HACK_RESULT'), initiator: 3, viewer: 3, feedback: null, partner: 5, seats }), null, 'no feedback');
  assert.equal(hackModel({ phase: { kind: 'ORDINARY_TURN', id: 'turn' }, initiator: 3, viewer: 3, feedback: fb, partner: 5, seats }), null, 'outside the Hack');
  // The model takes no role: a role passed beside the inputs changes nothing.
  const plain = asTarget('HACK_DECLARE', feedback('HACK_DECLARE', 'AWAITING_DECLARATION'), true);
  const withRole = hackModel({ phase: phase('HACK_DECLARE'), initiator: 5, viewer: 3, feedback: feedback('HACK_DECLARE', 'AWAITING_DECLARATION'), partner: 5, canDeclare: true, seats, role: 'Undercover' });
  assert.deepEqual(withRole, plain);
});

test('every Hack fixture is bound to its phase, and its out-of-order variants are refused', () => {
  const stages = { HACK_DECLARE: 0, HACK_RESULT: 0, HACK: 0 };
  for (const entry of SCENARIOS.filter(item => item.group === 'Private Hack')) {
    const state = entry.s();
    const fb = state.private.hackFeedback;
    if (!fb) continue;
    const current = state.public.phase, round = state.public.round;
    const draw = given => hackModel({ phase: current, initiator: state.public.active, viewer: VIEWER, feedback: given, partner: state.private.hackPartner, seats: state.public.seats });
    assert.equal(hackFeedbackProblem(current, fb), null, entry.id);
    assert.equal(fb.hackId, hackExchangeId(round), entry.id);
    assert.equal(fb.phaseId, hackPhaseId(current.kind, round), entry.id);
    assert.ok(draw(fb), entry.id);
    stages[current.kind] += 1;
    // Another exchange's feedback, always; the same exchange's from its previous phase, except in its first phase.
    const other = staleHackFeedback('other', current, fb, round), earlier = staleHackFeedback('earlier', current, fb, round);
    assert.notEqual(other.hackId, fb.hackId, `${entry.id}: another exchange`);
    assert.equal(hackFeedbackProblem(current, other), 'the feedback belongs to another phase', `${entry.id} other`);
    assert.equal(draw(other), null, `${entry.id} other`);
    if (current.kind === 'HACK_DECLARE') { assert.equal(earlier, null, entry.id); continue; }
    assert.equal(earlier.hackId, fb.hackId, `${entry.id}: the same exchange`);
    assert.equal(hackFeedbackProblem(current, earlier), 'the feedback belongs to another phase', `${entry.id} earlier`);
    assert.equal(draw(earlier), null, `${entry.id} earlier`);
  }
  assert.deepEqual(stages, { HACK_DECLARE: 10, HACK_RESULT: 7, HACK: 3 });
});
