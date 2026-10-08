import assert from 'node:assert/strict';
import test from 'node:test';
import { FullCommandSchema, FullPlayerViewSchema } from '@mothership/contracts';
import {
  PRACTICE_BOT_POLICY_VERSION, FullPracticeBotsDocumentSchema, FullSetPracticeBotsRequestSchema,
  FullSetPracticeBotsResponseSchema, FullPracticeBotsErrorCodeSchema,
} from '../../../packages/contracts/dist/practice-bots.js';
import { createFullGame, projectFullGame, executeFullGame, FULL_GAME_VERSION_PINS, LEGACY_FULL_GAME_VERSION_PINS } from '@mothership/engine';
import { choosePracticeBotActions, PRACTICE_BOT_RULESET_VERSION, PRACTICE_BOT_RULESET_HASH } from '../dist/practice-bot-policy.js';

const seats = count => Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
const roles = count => ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
  ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
function setup(count, extra = ['seat-1', 'seat-2', 'seat-3']) {
  return { playerCount: count, roleOrder: roles(count), codeExtraSeatIds: extra,
    initialRooms: Object.fromEntries(seats(count).map(seat => [seat, 'Room A'])),
    roundOrders: Array.from({ length: 5 }, () => seats(count)) };
}
function stateFor(count = 7, kind = 'ORDINARY_TURN', round = 1, active = 'seat-1', extra) {
  const state = createFullGame({ matchId: 'practice-policy-match', setup: setup(count, extra), now: 100,
    phaseId: 'practice-initial', deadlineToken: 'practice-deadline', assetManifestVersion: 'test-assets' });
  state.round = round; state.activeSeatId = active;
  state.phase = { id: `practice-${kind}`, kind, startedAt: 100, endsAt: ['FINISHED', 'ABORTED'].includes(kind) ? null : 60_100 };
  state.deadlineToken = state.phase.endsAt === null ? null : 'practice-deadline';
  if (kind === 'FINISHED') state.result = { winner: 'Draw', alienCoWinner: false };
  return state;
}
const own = (state, seat = state.activeSeatId ?? 'seat-1') => projectFullGame(state).players[seat];
const type = (actions, kind) => actions.find(action => action.type === kind);
const invalid = (schema, value) => assert.equal(schema.safeParse(value).success, false);
let nextCommand = 0;
function execute(state, seat, command) {
  FullCommandSchema.parse(command);
  const result = executeFullGame(state, seat, { protocolVersion: 2, matchId: state.matchId,
    phaseId: state.phase.id, commandId: `practice-command-${++nextCommand}`, command },
  { now: 101, nextPhaseId: 'practice-next', nextDeadlineToken: 'practice-next-deadline' });
  assert.equal(result.receipt.status, 'accepted', 'Every chosen command must be accepted by the real engine');
  return result.state;
}
const request = { schemaVersion: 1, protocolVersion: 2, requestId: 'practice-request', matchId: 'practice-match', botCount: 6 };
const metadata = { schemaVersion: 1, protocolVersion: 2, matchId: 'practice-match', revision: 0,
  policyVersion: 'practice-1', botSeatIds: ['seat-2', 'seat-3'] };
const success = { schemaVersion: 1, protocolVersion: 2, ok: true, serverTimeMs: 100,
  matchId: request.matchId, requestId: request.requestId, revision: 1, botSeatIds: metadata.botSeatIds };

test('practice configuration is strict and bounded, including an explicit zero-bot request', () => {
  assert.equal(PRACTICE_BOT_POLICY_VERSION, 'practice-1');
  for (let botCount = 0; botCount <= 9; botCount++) FullSetPracticeBotsRequestSchema.parse({ ...request, botCount });
  for (const botCount of [-1, 10, 1.5, NaN, Infinity, null, '6']) invalid(FullSetPracticeBotsRequestSchema, { ...request, botCount });
  for (const field of ['uid', 'seatId', 'botSeatIds', 'policyVersion', 'roles', 'code', 'truth'])
    invalid(FullSetPracticeBotsRequestSchema, { ...request, [field]: 'spoofed' });
  for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { matchId: '../match' }, { requestId: '' }])
    invalid(FullSetPracticeBotsRequestSchema, { ...request, ...patch });
});

test('independent practice metadata accepts only sorted unique seat labels without hidden data', () => {
  FullPracticeBotsDocumentSchema.parse(metadata);
  FullPracticeBotsDocumentSchema.parse({ ...metadata, botSeatIds: [] });
  FullPracticeBotsDocumentSchema.parse({ ...metadata, revision: 9, botSeatIds: seats(9) });
  for (const botSeatIds of [['seat-2', 'seat-2'], ['seat-3', 'seat-2'], ['seat-10'], seats(9).concat('seat-1')])
    invalid(FullPracticeBotsDocumentSchema, { ...metadata, botSeatIds });
  for (const patch of [{ policyVersion: 'practice-2' }, { schemaVersion: 2 }, { protocolVersion: 1 },
    { revision: -1 }, { revision: Number.MAX_SAFE_INTEGER + 1 }, { uid: 'private' }, { roles: roles(7) }, { code: ['seat-7'] }, { actions: [] }])
    invalid(FullPracticeBotsDocumentSchema, { ...metadata, ...patch });
});

test('practice success binds the exact request and match; failures have only typed bounded errors', () => {
  FullSetPracticeBotsResponseSchema.parse(success);
  for (const field of ['requestId', 'matchId', 'schemaVersion', 'protocolVersion', 'botSeatIds']) {
    const candidate = { ...success }; delete candidate[field]; invalid(FullSetPracticeBotsResponseSchema, candidate);
  }
  for (const patch of [{ requestId: '' }, { matchId: '../match' }, { botSeatIds: ['seat-3', 'seat-2'] }, { uid: 'private' }, { error: { code: 'UNAVAILABLE' } }])
    invalid(FullSetPracticeBotsResponseSchema, { ...success, ...patch });
  for (const code of FullPracticeBotsErrorCodeSchema.options) {
    const failure = { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 100, error: { code, retryAfterMs: 1000 } };
    FullSetPracticeBotsResponseSchema.parse(failure);
    invalid(FullSetPracticeBotsResponseSchema, { ...failure, error: { ...failure.error, cause: 'private' } });
    invalid(FullSetPracticeBotsResponseSchema, { ...failure, error: { ...failure.error, retryAfterMs: -1 } });
  }
  invalid(FullSetPracticeBotsResponseSchema, { schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 100, error: { code: 'UNKNOWN' } });
});

for (const count of [7, 8, 9]) {
  test(`${count}-seat role actions use real projection hints and remain engine-accepted after each fresh projection`, () => {
    for (const [index, role] of roles(count).entries()) {
      const seat = `seat-${index + 1}`;
      let state = stateFor(count, 'ORDINARY_TURN', 4, seat);
      if (role === 'Supplier') state.round = 3;
      if (role === 'Cracker') { state.seats[index].health = 'Injured'; state.seats[index].location = 'Hospital'; }
      const used = new Set();
      for (let step = 0; step < 5; step++) {
        const view = own(state, seat), before = JSON.stringify(view);
        const candidates = choosePracticeBotActions(view);
        assert.deepEqual(candidates, choosePracticeBotActions(view));
        assert.equal(JSON.stringify(view), before, 'Policy must not mutate private views');
        assert.equal(new Set(candidates.map(command => command.type)).size, candidates.length);
        assert.equal(candidates.some(command => command.type === 'REQUEST_HACK'), false);
        const command = candidates.find(candidate => !used.has(candidate.type));
        if (!command) break;
        used.add(command.type); state = execute(state, seat, command);
      }
      if (role === 'Supplier') assert.equal(used.has('SUPPLY'), true);
      if (role === 'Cracker') assert.equal(used.has('RESCUE'), true);
      if (role.includes('Disabler')) assert.equal(used.has('DISABLE'), true);
      if (role === 'Undercover') assert.equal(used.has('PROTECT') && used.has('REGISTER_SHOT'), true);
      if (role === 'Hacker') assert.equal(used.has('SCAN'), true);
      if (role === 'Officer') assert.equal(used.has('REGISTER_SHOT'), true);
    }
  });
  test(`${count}-seat election, Jail, release and showdown commands bind actual eligible phases`, () => {
    for (const kind of ['CAPTAIN_ELECTION', 'JAIL_VOTE', 'RELEASE_CHOICE', 'RELEASE_VOTE', 'SHOWDOWN']) {
      const state = stateFor(count, kind);
      state.eligibleVoters = seats(count); state.eligibleTargets = ['seat-3', 'seat-2'];
      if (kind === 'RELEASE_VOTE') state.releaseTargetSeatId = 'seat-2';
      if (kind === 'SHOWDOWN') { state.seats[0].specialShotAvailable = true; state.seats[0].health = 'Injured'; state.seats[0].jailed = true; }
      const commands = choosePracticeBotActions(own(state));
      const expected = kind === 'CAPTAIN_ELECTION' || kind === 'JAIL_VOTE' ? 'VOTE' : kind === 'SHOWDOWN' ? 'SHOWDOWN_SHOT' : kind;
      assert.ok(type(commands, expected)); execute(state, 'seat-1', type(commands, expected));
      const changed = own(state); changed.hasVoted = true; changed.self.releaseVoteAvailable = false;
      if (kind === 'CAPTAIN_ELECTION' || kind === 'JAIL_VOTE' || kind === 'RELEASE_VOTE') assert.equal(type(choosePracticeBotActions(changed), expected), undefined);
    }
  });
}

test('a queued main action still permits a separate shot and movement after reprojecting', () => {
  let state = stateFor(7, 'ORDINARY_TURN', 4, 'seat-5');
  state = execute(state, 'seat-5', type(choosePracticeBotActions(own(state)), 'PROTECT'));
  const view = own(state); assert.equal(view.ownPendingCommandIds.length, 1);
  const next = choosePracticeBotActions(view);
  assert.ok(type(next, 'REGISTER_SHOT')); assert.ok(type(next, 'MOVE'));
  execute(state, 'seat-5', type(next, 'REGISTER_SHOT'));
});

test('missing vote/choice hints differ from explicit empty legal sets', () => {
  for (const kind of ['CAPTAIN_ELECTION', 'JAIL_VOTE', 'RELEASE_CHOICE']) {
    const state = stateFor(7, kind); state.eligibleVoters = ['seat-1']; state.eligibleTargets = [];
    const view = own(state), commandType = kind === 'RELEASE_CHOICE' ? kind : 'VOTE';
    assert.deepEqual(type(choosePracticeBotActions(view), commandType), { type: commandType, targetSeatId: null });
    execute(state, 'seat-1', type(choosePracticeBotActions(view), commandType));
    delete view.legalTargets[commandType]; assert.equal(type(choosePracticeBotActions(view), commandType), undefined);
    if (kind === 'RELEASE_CHOICE') { view.legalTargets[commandType] = []; view.activeSeatId = 'seat-2'; assert.equal(type(choosePracticeBotActions(view), commandType), undefined); }
  }
});

test('off-turn movement and Hack-phase movement are permitted without requesting a conversation', () => {
  for (const kind of ['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION']) {
    const state = stateFor(7, kind, 1, 'seat-2'); const view = own(state, 'seat-1');
    const commands = choosePracticeBotActions(view); assert.ok(type(commands, 'MOVE'));
    assert.equal(type(commands, 'REQUEST_HACK'), undefined); execute(state, 'seat-1', type(commands, 'MOVE'));
  }
});

test('movement respects availability, health, Jail and Captain routing from the own public seat facts', () => {
  const state = stateFor(), view = own(state);
  for (const change of [v => { v.self.movementDestinations = []; }, v => { v.seats[0].health = 'Injured'; },
    v => { v.seats[0].jailed = true; }, v => { v.seats[0].location = 'Hospital'; }]) {
    const changed = structuredClone(view); change(changed); assert.equal(type(choosePracticeBotActions(changed), 'MOVE'), undefined);
  }
  view.seats[0].captain = true; view.self.movementDestinations = ['Room B', 'Command Room'];
  assert.deepEqual(type(choosePracticeBotActions(view), 'MOVE'), { type: 'MOVE', destination: 'Command Room' });
  view.seats[0].location = 'Command Room'; assert.equal(type(choosePracticeBotActions(view), 'MOVE'), undefined);
});

test('Supplier requires two current legal recipients; ordinary ammo alone never fabricates a shot', () => {
  const supplier = own(stateFor(9, 'ORDINARY_TURN', 3, 'seat-4'));
  supplier.legalTargets.SUPPLY = ['seat-9', 'seat-2'];
  assert.deepEqual(type(choosePracticeBotActions(supplier), 'SUPPLY').targetSeatIds, ['seat-2', 'seat-9']);
  supplier.legalTargets.SUPPLY = ['seat-9']; assert.equal(type(choosePracticeBotActions(supplier), 'SUPPLY'), undefined);
  const officer = own(stateFor(9, 'ORDINARY_TURN', 1, 'seat-9'));
  officer.self.shotAvailable = false; assert.equal(type(choosePracticeBotActions(officer), 'REGISTER_SHOT'), undefined);
  officer.self.shotAvailable = true; officer.legalTargets.REGISTER_SHOT = []; assert.equal(type(choosePracticeBotActions(officer), 'REGISTER_SHOT'), undefined);
});

test('Rescue chooses only visibly Injured permitted seats and does not waste a lifetime use on Healthy targets', () => {
  const state = stateFor(7, 'ORDINARY_TURN', 1, 'seat-2');
  assert.equal(type(choosePracticeBotActions(own(state)), 'RESCUE'), undefined);
  state.seats[0].health = 'Injured'; state.seats[0].location = 'Hospital';
  const command = type(choosePracticeBotActions(own(state)), 'RESCUE'); assert.equal(command.targetSeatId, 'seat-1'); execute(state, 'seat-2', command);
});

test('Round 5 Code can use own membership evidence off-turn, including self and eliminated candidates', () => {
  for (const kind of ['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION', 'RELEASE_CHOICE', 'RELEASE_VOTE', 'JAIL_VOTE']) {
    const state = stateFor(7, kind, 5, 'seat-1', ['seat-1', 'seat-3', 'seat-6']); state.seats[0].health = 'Eliminated';
    const view = own(state, 'seat-6');
    view.knowledge.scanResults = [{ round: 4, targetSeatId: 'seat-6', guess: 'Red', matched: true, inCode: true },
      { round: 3, targetSeatId: 'seat-2', guess: 'Blue', matched: true, inCode: false },
      { round: 2, targetSeatId: 'seat-3', guess: 'Red', matched: false, inCode: null }];
    const command = type(choosePracticeBotActions(view), 'SUBMIT_CODE');
    assert.ok(command.seatIds.includes('seat-6')); assert.ok(command.seatIds.includes('seat-1'));
    assert.ok(command.seatIds.includes('seat-3')); assert.equal(command.seatIds.includes('seat-2') || command.seatIds.includes('seat-5'), false);
    execute(state, 'seat-6', command);
  }
});

test('Code and Scan do not pool another bot audience or consult the Alien Code truth', () => {
  const first = stateFor(7, 'ORDINARY_TURN', 5, 'seat-6', ['seat-1', 'seat-2', 'seat-3']);
  const second = stateFor(7, 'ORDINARY_TURN', 5, 'seat-6', ['seat-2', 'seat-3', 'seat-4']);
  assert.notDeepEqual(first.code, second.code);
  assert.deepEqual(own(first), own(second));
  assert.deepEqual(choosePracticeBotActions(own(first)), choosePracticeBotActions(own(second)));
  const view = own(first); view.legalTargets.SCAN = ['seat-6'];
  assert.deepEqual(type(choosePracticeBotActions(view), 'SCAN'), { type: 'SCAN', targetSeatId: 'seat-6', guess: 'Red' });
  view.legalTargets.SCAN = ['seat-5'];
  assert.equal(type(choosePracticeBotActions(view), 'SCAN').guess, 'Red');
});

test('target and roster order do not affect deterministic choices; input and returned commands stay independent', () => {
  const state = stateFor(9, 'ORDINARY_TURN', 3, 'seat-4'); const view = own(state), changed = structuredClone(view);
  changed.seats.reverse(); changed.self.movementDestinations.reverse();
  for (const targets of Object.values(changed.legalTargets)) targets.reverse();
  assert.deepEqual(choosePracticeBotActions(view), choosePracticeBotActions(changed));
  const frozen = structuredClone(view);
  const deepFreeze = value => { if (value && typeof value === 'object') { for (const item of Object.values(value)) deepFreeze(item); Object.freeze(value); } return value; };
  const chosen = choosePracticeBotActions(deepFreeze(frozen)); chosen[0].targetSeatIds[0] = 'seat-9';
  assert.deepEqual(frozen, view); assert.deepEqual(choosePracticeBotActions(view), choosePracticeBotActions(changed));
});

test('terminal, eliminated and unavailable actors produce no fabricated actions', () => {
  for (const kind of ['FINISHED', 'ABORTED']) assert.deepEqual(choosePracticeBotActions(own(stateFor(7, kind))), []);
  const state = stateFor(); state.seats[0].health = 'Eliminated'; assert.deepEqual(choosePracticeBotActions(own(state)), []);
  const view = own(stateFor(7, 'JAIL_VOTE')); view.ballot.eligibleVoters = []; view.legalTargets = {};
  assert.deepEqual(choosePracticeBotActions(view), []);
});

test('strict policy boundary rejects authoritative state, extra facts, wrong audiences, unsupported rules and extra arguments', () => {
  const state = stateFor(), view = own(state);
  FullPlayerViewSchema.parse(view);
  for (const payload of [state, projectFullGame(state).public, { view, truth: state }, { ...view, botKnowledge: {} },
    { ...view, audience: { kind: 'player', seatId: 'seat-2' } },
    { ...view, versions: { ...view.versions, protocolVersion: 1 } }]) assert.throws(() => choosePracticeBotActions(payload));
  for (const versions of [{ ...view.versions, rulesetVersion: 'future-rules' }, { ...view.versions, rulesetHash: '0'.repeat(64) }])
    assert.throws(() => choosePracticeBotActions({ ...view, versions }), /Unsupported practice ruleset/);
  assert.throws(() => choosePracticeBotActions(view, state), /exactly one player view/);
  const unknown = structuredClone(view); unknown.legalTargets.ACTIVATE_ORIGINAL_POWER = ['seat-1'];
  assert.deepEqual(choosePracticeBotActions(unknown), choosePracticeBotActions(view));
  assert.equal(PRACTICE_BOT_RULESET_VERSION, state.versions.rulesetVersion);
  assert.equal(PRACTICE_BOT_RULESET_HASH, state.versions.rulesetHash);
});

for (const [label, pins] of [['current', FULL_GAME_VERSION_PINS], ['legacy', LEGACY_FULL_GAME_VERSION_PINS]]) {
  test(`practice policy supports exact ${label} pins without automatically passing a turn`, () => {
    for (const count of [7, 8, 9]) for (const kind of ['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION', 'JAIL_VOTE', 'RELEASE_CHOICE', 'RELEASE_VOTE', 'SHOWDOWN', 'FINISHED', 'ABORTED']) {
      const state = stateFor(count, kind);
      state.versions = { ...pins, assetManifestVersion: state.versions.assetManifestVersion };
      state.eligibleVoters = seats(count); state.eligibleTargets = ['seat-2'];
      const view = own(state);
      const before = structuredClone(view), actions = choosePracticeBotActions(view);
      assert.deepEqual(actions, choosePracticeBotActions(view)); assert.deepEqual(view, before);
      assert.equal(actions.some(command => command.type === 'PASS_TURN'), false, `${count}/${kind}/${label}`);
      actions.forEach(command => FullCommandSchema.parse(command));
      if (kind === 'ORDINARY_TURN') {
        assert.deepEqual(view.legalTargets.PASS_TURN, label === 'current' ? ['seat-1'] : undefined);
        assert.ok(type(actions, 'MOVE'), 'Existing practice actions remain available');
        execute(state, 'seat-1', type(actions, 'MOVE'));
        const noWork = structuredClone(view); noWork.legalTargets = {}; noWork.self.movementDestinations = [];
        assert.deepEqual(choosePracticeBotActions(noWork), [], 'An idle bot waits for its deadline');
      }
    }
  });
}

test('practice policy rejects mixed supported tuples rather than silently promoting legacy rules', () => {
  const view = own(stateFor());
  for (const patch of [{ engineVersion: LEGACY_FULL_GAME_VERSION_PINS.engineVersion },
    { rulesetVersion: LEGACY_FULL_GAME_VERSION_PINS.rulesetVersion, rulesetHash: LEGACY_FULL_GAME_VERSION_PINS.rulesetHash },
    { engineVersion: 'full-game-1.0.0' }]) {
    assert.throws(() => choosePracticeBotActions({ ...view, versions: { ...view.versions, ...patch } }), /Unsupported practice ruleset/);
  }
});
