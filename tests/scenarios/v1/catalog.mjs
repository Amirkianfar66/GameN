// Authoring source of the Version 1 scenario fixtures (issue #5).
//
// Every expectation here is derived by hand from docs/balance/game-rules.md and names the rules
// it rests on. Nothing is copied from an engine's output. A case that depends on an undecided
// question is `blocked`: it asserts nothing, and at most probes what an engine currently does.
//
// The three modes are materialized into separate files by tools/balance/scripts/materialize.mjs
// and must never be pooled. Optional Original Powers are off in every case.
import { ROLES_BY_MODE, deriveSetup, expectedCode, factionOf, jailThreshold, seatIdsFor } from '@mothership/balance';

const PLANS = {
  A: { roles: 'canonical', rooms: 'all-a', orders: 'seeded' },
  B: { roles: 'canonical', rooms: 'split', orders: 'seeded' },
};

/** Seed labels read v1-<plan>-<n>; the plan letter selects how the facts are derived. */
export function setupFromSeed(mode, seed) {
  const plan = PLANS[seed.split('-')[1]];
  if (plan === undefined) throw new Error(`Unknown setup plan in seed ${seed}`);
  return deriveSetup(mode, seed, plan);
}

// ---------------------------------------------------------------------------------------------
// Step and check builders
const ref = role => `@${role}`;
const turn = (round, role) => ({ op: 'until', round, phase: 'ORDINARY_TURN', active: ref(role) });
const phase = (round, kind) => ({ op: 'until', round, phase: kind });
const untilPhase = kind => ({ op: 'until', phase: kind });
const startOf = round => ({ op: 'until', round });
const expire = (times = 1) => ({ op: 'expire', times });
const cmd = (actor, command, expect = 'REGISTERED', at) => ({ op: 'command', actor: ref(actor), command, expect, ...(at ? { at } : {}) });
const probe = (actor, command, label) => ({ op: 'probe', actor: ref(actor), command, label });
const note = (label, field) => ({ op: 'note', label, match: field });
const mark = name => ({ op: 'mark', name });
const check = (...checks) => ({ op: 'assert', checks });

const shot = target => ({ type: 'REGISTER_SHOT', target: ref(target) });
const disable = target => ({ type: 'DISABLE', target: ref(target) });
const protect = target => ({ type: 'PROTECT', target: ref(target) });
const rescue = target => ({ type: 'RESCUE', target: ref(target) });
const hack = target => ({ type: 'REQUEST_HACK', target: ref(target) });
const scan = (target, guess) => ({ type: 'SCAN', target: ref(target), guess });
const supply = (first, second) => ({ type: 'SUPPLY', targets: [ref(first), ref(second)] });
const vote = target => ({ type: 'VOTE', target: target === null ? null : ref(target) });
const move = destination => ({ type: 'MOVE', destination });
const special = target => ({ type: 'SHOWDOWN_SHOT', target: ref(target) });
const submit = seats => ({ type: 'SUBMIT_CODE', seats });
const choose = target => ({ type: 'RELEASE_CHOICE', target: target === null ? null : ref(target) });
const approve = value => ({ type: 'RELEASE_VOTE', approve: value });

const truth = (role, field, equals) => ({ truth: ref(role), field, equals });
const pub = (role, field, equals) => ({ public: ref(role), field, equals });
const is = (field, equals) => ({ match: field, equals });
const fact = (name, equals) => ({ publicFact: name, equals });
const factSet = (name, roles) => ({ publicFact: name, sameSet: roles.map(ref) });
const sees = (role, field, equals) => ({ visible: ref(role), field, equals });
const seesSet = (role, field, roles) => ({ visible: ref(role), field, sameSet: roles.map(ref) });
const count = (name, equals) => ({ count: name, equals });
const tally = (role, equals) => ({ tallyCount: ref(role), equals });
const unchanged = (since, audiences) => ({ unchanged: { since, audiences } });
const changed = (since, audiences) => ({ changed: { since, audiences } });
const onlyActorSaw = (since, actor) => unchanged(since, { allPlayersExcept: [ref(actor)] });

// ---------------------------------------------------------------------------------------------
// Rules that a scenario uses besides the ones it is about, read mechanically from the commands it
// expects to be accepted, the checkpoints it runs to and the weapon counts it checks. The list is
// generous on purpose: it exists to find every scenario a rule touches, so that a changed reading
// can be followed to the cases that must be derived again. It decides no expectation.
const USED_BY_ACCEPTED_COMMAND = {
  RESCUE: ['R-ROLE-02', 'R-ACT-07'], SUPPLY: ['R-ROLE-07'], SCAN: ['R-ROLE-13', 'R-ROLE-14'], REQUEST_HACK: ['R-HACK-01', 'R-HACK-02'],
  MOVE: ['R-MOVE-01'], SUBMIT_CODE: ['R-ROLE-15'], RELEASE_CHOICE: ['R-VOTE-05'], RELEASE_VOTE: ['R-VOTE-06'],
  SHOWDOWN_SHOT: ['R-SHOW-02', 'R-SHOW-04'], DISABLE: ['R-ACT-07'], PROTECT: ['R-PROT-01', 'R-PROT-02', 'R-ACT-07'],
};
const REGISTERED_ACTIONS = ['DISABLE', 'REGISTER_SHOT', 'PROTECT', 'RESCUE', 'SUPPLY'];

function leadUpRules(steps) {
  const used = new Set();
  const use = (...ids) => { for (const id of ids) used.add(id); };
  let round = 1; // 6 stands for "Round 5 has resolved"
  let phase = 'ORDINARY_TURN';
  let betweenRounds = false;
  let jailedIn = null; // the first round with an accepted Jail ballot
  let protections = 0;
  let candidate = null; // who the last election ballot named
  let captainInside = null; // a Captain who was placed in Command Room and has not left it
  const actedIn = new Map(); // round -> players who registered an action in it
  for (const step of steps) {
    if (step.op === 'until') {
      if (step.phase === 'CAPTAIN_ELECTION' && step.round === undefined && round === 1) use('R-CAPT-01');
      if (step.phase === 'SHOWDOWN' || step.phase === 'FINISHED') round = 6;
      else if (step.round !== undefined) round = step.round;
      else if (step.phase !== 'CAPTAIN_ELECTION' && betweenRounds) round += 1;
      betweenRounds = step.phase === 'CAPTAIN_ELECTION' && step.round === undefined;
      phase = step.phase ?? 'UNKNOWN';
      if (step.phase === 'SHOWDOWN') use('R-WIN-10', 'R-SHOW-01', 'R-WIN-01', 'R-WIN-04');
    } else if (step.op === 'expire') {
      if (betweenRounds) {
        round += 1;
        betweenRounds = false;
        captainInside = candidate;
      }
      if (phase === 'SHOWDOWN' && jailedIn !== null) use('R-SHOW-10');
      phase = 'UNKNOWN';
    } else if (step.op === 'command' && step.expect === 'REGISTERED') {
      const type = step.command.type;
      use(...(USED_BY_ACCEPTED_COMMAND[type] ?? []));
      if (REGISTERED_ACTIONS.includes(type)) actedIn.set(round, [...(actedIn.get(round) ?? []), step.actor]);
      if (type === 'DISABLE') {
        use(step.actor === '@Red Disabler' ? 'R-ROLE-06' : 'R-ROLE-05');
        if (round < 4) use('R-ROLE-17');
      }
      if (type === 'REGISTER_SHOT') use('R-SHOT-02', step.actor === '@Officer' ? 'R-ROLE-11' : 'R-SHOT-03');
      if (type === 'PROTECT') {
        protections += 1;
        if (protections > 1) use('R-PROT-08');
      }
      if (type === 'MOVE' && step.actor === captainInside) {
        // The Captain leaves Command Room and keeps the title; the destination is reading D33.
        if (step.command.destination !== 'Command Room') use('R-MOVE-05', 'R-MOVE-09', 'R-CAPT-09');
        captainInside = null;
      }
      if (type === 'VOTE' && phase === 'CAPTAIN_ELECTION') {
        use('R-CAPT-02', 'R-CAPT-04', 'R-CAPT-05');
        candidate = step.command.target;
      }
      if (type === 'VOTE' && phase === 'JAIL_VOTE') {
        use('R-VOTE-02', 'R-VOTE-03');
        jailedIn ??= round;
        // A player voted into Jail in the round in which they registered an action: it still resolves.
        if ((actedIn.get(round) ?? []).includes(step.command.target)) use('R-ACT-05', 'R-RES-01');
      }
    }
    if (step.op === 'assert') {
      for (const check of step.checks) {
        // An exact list of phases, or a count of release choices, says that no idle window opened.
        if (check.trace !== undefined || check.count === 'releaseChoicePhases') use('R-FLOW-13');
        // A weapon count rests on who starts with a weapon.
        if ((check.count ?? check.field) !== 'ordinaryWeapons') continue;
        const holder = check.truth ?? check.visible ?? null;
        use('R-SETUP-13');
        if (holder !== '@Undercover' && holder !== '@Officer') use('R-SETUP-14');
      }
    }
    // A player sent to Jail in one round is relied on as Jailed in a later one.
    if (jailedIn !== null && round > jailedIn) use('R-VOTE-08');
  }
  return used;
}

// Give each shooter one target from the list so that nobody is given themself: first fit, in order.
function allot(shooters, targets) {
  const left = [...targets];
  const out = [];
  const place = index => {
    if (index === shooters.length) return true;
    for (let pick = 0; pick < left.length; pick += 1) {
      if (left[pick] === shooters[index] || left.indexOf(left[pick]) !== pick) continue;
      const [target] = left.splice(pick, 1);
      out.push([shooters[index], target]);
      if (place(index + 1)) return true;
      out.pop();
      left.splice(pick, 0, target);
    }
    return false;
  };
  if (!place(0)) throw new Error('no allotment of targets without a self-target');
  return out;
}

// ---------------------------------------------------------------------------------------------
// Per-mode context
function context(mode) {
  const roles = ROLES_BY_MODE[mode];
  const seatIds = seatIdsFor(mode);
  const A = setupFromSeed(mode, 'v1-A-1');
  const B = setupFromSeed(mode, 'v1-B-1');
  const seatOf = (setup, role) => seatIds[setup.roleOrder.indexOf(role)];
  const roleAt = (setup, seat) => setup.roleOrder[Number(seat.slice(5)) - 1];
  const orderOf = (setup, round) => setup.roundOrders[round - 1].map(seat => roleAt(setup, seat));
  const byTurn = (setup, round, list) => {
    const order = orderOf(setup, round);
    return [...list].sort((left, right) => order.indexOf(left) - order.indexOf(right));
  };
  // Steps taken by several players on their own turns, emitted in that round's turn order.
  const acts = (round, map, setup = A) => byTurn(setup, round, Object.keys(map)).flatMap(role => [turn(round, role), ...map[role]]);
  const voters = (howMany, exclude = []) => roles.filter(role => !exclude.includes(role)).slice(0, howMany);
  const T = jailThreshold(mode);
  const jail = (round, target, howMany = T, exclude = []) => [phase(round, 'JAIL_VOTE'), ...voters(howMany, exclude).map(voter => cmd(voter, vote(target)))];
  const elect = role => [untilPhase('CAPTAIN_ELECTION'), cmd(role, vote(role)), expire()];
  const code = expectedCode(A);
  const outside = seatIds.filter(seat => !code.includes(seat));
  const wrongCode = [...code.slice(0, 3), outside[0]];
  const has = role => roles.includes(role);
  const scenarios = [];
  const add = (area, number, title, options) => {
    const setup = options.setup === undefined ? A : options.setup;
    const steps = options.steps ?? [];
    const dependsOn = [...new Set([...leadUpRules(steps), ...(options.depends ?? [])])].filter(id => !options.rules.includes(id)).sort();
    scenarios.push({
      id: `V1-M${mode}-${area}-${String(number).padStart(2, '0')}${options.suffix ?? ''}`,
      group: `mode-${mode}`, mode, title,
      status: options.status ?? 'ready', kind: options.kind ?? 'rules_correctness',
      areas: options.areas, ruleRefs: options.rules, dependsOn, lineage: options.lineage ?? [],
      decisionIds: options.decisions ?? [], optionalPowers: false,
      setup, steps, note: options.note ?? '',
    });
  };
  return { mode, roles, seatIds, A, B, seatOf, orderOf, byTurn, acts, voters, T, jail, elect, code, wrongCode, has, scenarios, add };
}

// Two attacks on one Healthy target in the same round. With eight or nine players both Disablers
// can do it in Round 1. With seven the second attack is Undercover's weapon, so Round 4.
function doubleAttack(M, target, extra = {}) {
  if (M.has('Red Disabler')) {
    return { round: 1, steps: M.acts(1, { 'Blue Disabler': [cmd('Blue Disabler', disable(target))], 'Red Disabler': [cmd('Red Disabler', disable(target))], ...extra }) };
  }
  return { round: 4, steps: M.acts(4, { 'Blue Disabler': [cmd('Blue Disabler', disable(target))], Undercover: [cmd('Undercover', shot(target))], ...extra }) };
}

// Equal Power at the Round 5 check, so that no side wins and the showdown begins, with an Injured
// Insider and at least one Jailed player among the participants.
function toEqualPower(M, injureWith = 'Blue Disabler') {
  const injure = injureWith === 'Officer' ? cmd('Officer', shot('Insider')) : cmd('Blue Disabler', disable('Insider'));
  const steps = [turn(1, injureWith), injure, ...M.jail(1, 'Cracker')];
  if (M.mode !== 8) steps.push(...M.jail(2, 'Supplier'));
  return steps;
}

function build(mode) {
  const M = context(mode);
  const { add, acts, jail, elect, A, B, T } = M;
  const N = mode;
  const all = [...M.roles];
  const first = round => M.orderOf(A, round)[0];
  const startingWeapons = M.has('Officer') ? 2 : 1;
  // An attack by whichever role is asked to attack: a Disabler use, or an ordinary shot.
  const attack = (role, target) => cmd(role, role === 'Blue Disabler' || role === 'Red Disabler' ? disable(target) : shot(target));

  // ----- Setup ---------------------------------------------------------------------------------
  add('SETUP', 1, 'The match holds exactly the roles and factions of this mode', {
    areas: ['mode-setup'], rules: ['R-SETUP-01', `R-SETUP-0${mode - 5}`, 'R-SETUP-05', 'R-STATE-09', 'R-FLOW-02', 'R-CAPT-01'], lineage: ['BAL-001'],
    note: 'Every player starts in Room A in this setup: no rule limits how many players a room holds.',
    steps: [check(...all.map(role => truth(role, 'faction', factionOf(role))), count('captains', 0), count('eliminated', 0), is('round', 1), is('phase', 'ORDINARY_TURN'), is('active', ref(first(1))))],
  });
  add('SETUP', 2, 'The Code is four different numbers, with Alien and without Undercover', {
    areas: ['mode-setup'], rules: ['R-SETUP-08', 'R-SETUP-11'], lineage: ['BAL-002'],
    steps: [check({ visible: ref('Alien'), field: 'code', sameSet: M.code }, { visible: ref('Alien'), field: 'code', includes: ref('Alien') }, { visible: ref('Alien'), field: 'code', excludes: ref('Undercover') })],
  });
  add('SETUP', 3, 'Only Insider, Hacker and Alien start with private knowledge', {
    areas: ['mode-setup', 'authorized-views'], rules: ['R-SETUP-09', 'R-SETUP-10', 'R-SETUP-11', 'R-SETUP-12', 'R-VIEW-04', 'R-VIEW-05'], lineage: [],
    steps: [check(
      seesSet('Insider', 'insiderCandidates', ['Undercover', 'Alien', 'Cracker']), sees('Hacker', 'undercoverSeat', ref('Undercover')),
      ...all.filter(role => role !== 'Insider').map(role => sees(role, 'insiderCandidates', [])),
      // Undercover knows their own seat; whether their own view repeats it is not a disclosure.
      ...all.filter(role => role !== 'Hacker' && role !== 'Undercover').map(role => sees(role, 'undercoverSeat', null)),
      ...all.filter(role => role !== 'Alien').map(role => sees(role, 'code', [])),
      ...all.map(role => sees(role, 'role', role)),
    )],
  });
  add('SETUP', 4, 'Only Undercover, and Officer with nine players, start with an ordinary weapon', {
    areas: ['mode-setup', 'resources'], rules: ['R-SETUP-13', 'R-SETUP-14', 'R-ROLE-12'], lineage: [],
    steps: [check(...all.map(role => truth(role, 'ordinaryWeapons', role === 'Undercover' || role === 'Officer' ? 1 : 0)),
      truth('Cracker', 'rescuesRemaining', 2), count('ordinaryWeapons', startingWeapons), sees('Undercover', 'ordinaryWeapons', 1))],
  });
  add('SETUP', 5, 'Players start in the room they chose, whatever role they are dealt', {
    areas: ['mode-setup', 'movement'], rules: ['R-SETUP-07', 'R-SETUP-05'], lineage: ['BAL-101'], setup: B,
    steps: [check(...all.map(role => truth(role, 'location', B.initialRooms[M.seatOf(B, role)])), ...all.map(role => pub(role, 'location', B.initialRooms[M.seatOf(B, role)])))],
  });

  {
    const attempts = role => [cmd(role, disable('Cracker'), 'NOT_ALLOWED'), cmd(role, protect('Cracker'), 'NOT_ALLOWED'), cmd(role, rescue('Cracker'), 'NOT_ALLOWED'),
      cmd(role, scan('Cracker', 'Blue'), 'NOT_ALLOWED'), cmd(role, supply('Cracker', 'Hacker'), 'NOT_ALLOWED')];
    add('SETUP', 6, 'Insider and Alien have no role action, and nobody uses another role\'s action', {
      areas: ['mode-setup', 'resources'], rules: ['R-ROLE-01', 'R-ROLE-19', 'R-ROLE-02', 'R-ROLE-05', 'R-ROLE-13', 'R-PROT-01', 'R-ROLE-07'], lineage: [],
      steps: [...acts(1, { Insider: attempts('Insider'), Alien: attempts('Alien') }), check(sees('Insider', 'pendingCount', 0), sees('Alien', 'pendingCount', 0))],
    });
  }

  // ----- Rounds, turns and clocks --------------------------------------------------------------
  const turnsOf = round => M.orderOf(A, round).map(() => 'ORDINARY_TURN');
  add('FLOW', 1, 'With no input a match runs five rounds in the drawn order and ends on Power', {
    areas: ['phase-transitions', 'victory'], rules: ['R-FLOW-01', 'R-FLOW-02', 'R-FLOW-03', 'R-FLOW-04', 'R-CAPT-01', 'R-CAPT-06', 'R-WIN-04', 'R-WIN-07'], lineage: ['BAL-019'],
    steps: [untilPhase('FINISHED'), check(
      { trace: { kinds: [...turnsOf(1), 'JAIL_VOTE', ...[2, 3, 4, 5].flatMap(round => ['CAPTAIN_ELECTION', ...turnsOf(round), 'JAIL_VOTE']), 'FINISHED'] } },
      ...[1, 2, 3, 4, 5].map(round => ({ traceTurns: { round, actives: M.orderOf(A, round).map(ref) } })),
      is('winner', 'Blue'), is('alienCoWinner', true), is('round', 5), count('showdownPhases', 0), count('eliminated', 0),
    )],
  });
  add('FLOW', 2, 'A turn, a Jail vote and a Captain election are each one 60-second window', {
    areas: ['timing', 'phase-transitions'], rules: ['R-FLOW-05', 'R-FLOW-07'], lineage: ['BAL-017'], kind: 'timing',
    steps: [check(is('windowMs', 60_000)), expire(), check(is('windowMs', 60_000), is('phase', 'ORDINARY_TURN')),
      phase(1, 'JAIL_VOTE'), check(is('windowMs', 60_000)), untilPhase('CAPTAIN_ELECTION'), check(is('windowMs', 60_000))],
  });
  add('FLOW', 3, 'A vote stays open until its deadline even when everyone has voted', {
    areas: ['timing', 'voting'], rules: ['R-FLOW-07', 'R-CAPT-01'], lineage: ['BAL-107'], kind: 'timing',
    note: 'Every player votes for themself, so every eligible voter has answered and nobody reaches the threshold.',
    steps: [phase(1, 'JAIL_VOTE'), ...all.map(role => cmd(role, vote(role))), { op: 'expireEarly', beforeDeadlineMs: 1 }, check(is('phase', 'JAIL_VOTE')), expire(), check(is('phase', 'CAPTAIN_ELECTION'), count('jailed', 0))],
  });
  add('FLOW', 4, 'A ballot is accepted just before the deadline and refused at it', {
    areas: ['timing', 'voting'], rules: ['R-FLOW-08'], lineage: ['BAL-108'], kind: 'timing',
    steps: [phase(1, 'JAIL_VOTE'), cmd('Insider', vote('Cracker'), 'REGISTERED', 'deadline-1'), cmd('Hacker', vote('Cracker'), 'PHASE_CLOSED', 'deadline'), expire(), check(tally('Cracker', 1))],
  });
  add('FLOW', 5, 'Injured and Jailed players keep their turn', {
    areas: ['phase-transitions'], rules: ['R-FLOW-04', 'R-STATE-03', 'R-STATE-04'], lineage: [],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...jail(1, 'Alien'), phase(2, 'JAIL_VOTE'),
      check(truth('Insider', 'health', 'Injured'), truth('Alien', 'jailed', true), { traceTurns: { round: 2, actives: M.orderOf(A, 2).map(ref) } })],
  });
  {
    const hit = doubleAttack(M, 'Insider');
    const next = hit.round + 1;
    add('FLOW', 6, 'An Eliminated player takes no further turn', {
      areas: ['phase-transitions', 'elimination'], rules: ['R-FLOW-11', 'R-STATE-01'], lineage: [],
      steps: [...hit.steps, phase(next, 'JAIL_VOTE'), check(truth('Insider', 'health', 'Eliminated'), { traceTurns: { round: next, actives: M.orderOf(A, next).filter(role => role !== 'Insider').map(ref) } })],
    });
  }
  add('FLOW', 7, 'Ending a turn or a Hack conversation early', {
    status: 'blocked', decisions: ['D17'], areas: ['timing'], rules: ['R-FLOW-09'], setup: null, kind: 'decision_boundary',
    note: 'No command for ending a turn exists in any source, so there is nothing to probe. FLOW-10 probes the other part of D17.',
  });
  add('FLOW', 8, 'Announcing the whole turn order at the start of a round', { status: 'blocked', decisions: ['D20'], areas: ['authorized-views'], rules: ['R-FLOW-10'], setup: null, kind: 'decision_boundary' });
  add('FLOW', 9, 'What an Eliminated player may say or show at the table', { status: 'blocked', decisions: ['D19'], areas: ['elimination'], rules: ['R-FLOW-12'], setup: null, kind: 'decision_boundary' });

  // ----- Movement ------------------------------------------------------------------------------
  add('MOVE', 1, 'One move per round, and none once voting has begun', {
    areas: ['movement'], rules: ['R-MOVE-01', 'R-MOVE-03', 'R-MOVE-07'], lineage: ['BAL-008'],
    steps: [cmd('Insider', move('Room B')), cmd('Insider', move('Room A'), 'NOT_ALLOWED'), check(truth('Insider', 'location', 'Room B'), truth('Insider', 'movedThisRound', true), pub('Insider', 'location', 'Room B')),
      phase(1, 'JAIL_VOTE'), cmd('Cracker', move('Room B'), 'NOT_ALLOWED'), phase(2, 'ORDINARY_TURN'), cmd('Insider', move('Room A')), check(truth('Insider', 'location', 'Room A'))],
  });
  add('MOVE', 2, 'Nobody leaves Hospital or Jail by choice', {
    areas: ['movement'], rules: ['R-MOVE-02', 'R-STATE-06'], lineage: ['BAL-008'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...jail(1, 'Alien'), phase(2, 'ORDINARY_TURN'),
      check(truth('Insider', 'location', 'Hospital'), truth('Alien', 'location', 'Jail'), sees('Insider', 'moveDestinations', []), sees('Alien', 'moveDestinations', [])),
      cmd('Insider', move('Room A'), 'NOT_ALLOWED'), cmd('Insider', move('Room B'), 'NOT_ALLOWED'), cmd('Alien', move('Room A'), 'NOT_ALLOWED')],
  });
  add('MOVE', 3, 'Only the Captain enters Command Room, from either room, with the one move of the round', {
    areas: ['movement'], rules: ['R-MOVE-04', 'R-MOVE-05', 'R-MOVE-06', 'R-MOVE-09', 'R-CAPT-05', 'R-CAPT-09'], lineage: ['BAL-009', 'BAL-102'],
    steps: [cmd('Insider', move('Command Room'), 'NOT_ALLOWED'), ...elect('Cracker'),
      check(truth('Cracker', 'location', 'Command Room'), truth('Cracker', 'captain', true), truth('Cracker', 'movedThisRound', false)),
      cmd('Insider', move('Command Room'), 'NOT_ALLOWED'), cmd('Cracker', move('Room A')), check(truth('Cracker', 'captain', true), truth('Cracker', 'location', 'Room A')),
      cmd('Cracker', move('Command Room'), 'NOT_ALLOWED'),
      phase(3, 'ORDINARY_TURN'), cmd('Cracker', move('Command Room')), check(truth('Cracker', 'location', 'Command Room')),
      phase(4, 'ORDINARY_TURN'), cmd('Cracker', move('Room B')), phase(5, 'ORDINARY_TURN'), cmd('Cracker', move('Command Room')),
      check(truth('Cracker', 'location', 'Command Room'), truth('Cracker', 'captain', true))],
  });
  {
    const mover = first(1) === 'Insider' ? 'Cracker' : 'Insider';
    add('MOVE', 4, 'A move is public and does not wait for the mover\'s own turn', {
      areas: ['movement', 'authorized-views'], rules: ['R-MOVE-07', 'R-MOVE-01'], lineage: ['BAL-008'],
      steps: [mark('before'), cmd(mover, move('Room B')), check(changed('before', 'public'), changed('before', 'all-players'), pub(mover, 'location', 'Room B'))],
    });
  }
  add('MOVE', 5, 'Moving while a Captain election is being voted', {
    status: 'blocked', decisions: ['D16'], areas: ['movement'], rules: ['R-MOVE-08'], kind: 'decision_boundary',
    steps: [untilPhase('CAPTAIN_ELECTION'), probe('Insider', move('Room B'), 'MOVE during a Captain election')],
  });

  // ----- Captain and Command Room --------------------------------------------------------------
  add('CAPT', 1, 'The first election follows Round 1 and the most votes win', {
    areas: ['voting', 'phase-transitions'], rules: ['R-CAPT-01', 'R-CAPT-02', 'R-CAPT-04', 'R-CAPT-05'], lineage: ['BAL-102'],
    steps: [check(count('captains', 0)), untilPhase('CAPTAIN_ELECTION'), check(count('electionPhases', 1), factSet('eligibleTargets', all), factSet('eligibleVoters', all), { traceTurns: { round: 2, actives: [] } }),
      cmd('Insider', vote('Cracker')), expire(),
      check(truth('Cracker', 'captain', true), truth('Cracker', 'location', 'Command Room'), pub('Cracker', 'captain', true), fact('tallyKind', 'CAPTAIN_ELECTION'), fact('tallySelected', ref('Cracker')), tally('Cracker', 1), fact('tallyEligibleVoterCount', N), count('captains', 1))],
  });
  add('CAPT', 2, 'A tie leads to a runoff among the tied candidates only', {
    areas: ['voting'], rules: ['R-CAPT-02'], lineage: ['BAL-102'],
    steps: [untilPhase('CAPTAIN_ELECTION'), cmd('Insider', vote('Cracker')), cmd('Hacker', vote('Cracker')), cmd('Alien', vote('Supplier')), cmd('Undercover', vote('Supplier')), expire(),
      check(is('phase', 'CAPTAIN_ELECTION'), factSet('eligibleTargets', ['Cracker', 'Supplier']), count('captains', 0), count('electionPhases', 2)),
      cmd('Hacker', vote('Insider'), 'NOT_ALLOWED'), cmd('Insider', vote('Cracker')), expire(), check(truth('Cracker', 'captain', true), count('captains', 1))],
  });
  add('CAPT', 3, 'If nobody votes nobody becomes Captain and the election is retried next round', {
    areas: ['voting', 'phase-transitions'], rules: ['R-CAPT-06', 'R-FLOW-08'], lineage: ['BAL-102'],
    steps: [untilPhase('CAPTAIN_ELECTION'), expire(), check(count('captains', 0), is('phase', 'ORDINARY_TURN'), is('round', 2)),
      phase(2, 'JAIL_VOTE'), expire(), check(is('phase', 'CAPTAIN_ELECTION'), count('electionPhases', 2), { traceTurns: { round: 3, actives: [] } })],
  });
  add('CAPT', 4, 'Candidates must be Healthy and free, while Injured and Jailed players still vote', {
    areas: ['voting'], rules: ['R-CAPT-03', 'R-CAPT-04'], lineage: ['BAL-102'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...jail(1, 'Alien'), untilPhase('CAPTAIN_ELECTION'),
      check(factSet('eligibleTargets', all.filter(role => role !== 'Insider' && role !== 'Alien')), factSet('eligibleVoters', all)),
      cmd('Hacker', vote('Insider'), 'NOT_ALLOWED'), cmd('Hacker', vote('Alien'), 'NOT_ALLOWED'), cmd('Insider', vote('Cracker')), cmd('Alien', vote('Cracker')), expire(),
      check(truth('Cracker', 'captain', true), tally('Cracker', 2))],
  });
  add('CAPT', 5, 'A Captain voted into Jail loses the title at once and a new election follows', {
    areas: ['voting', 'phase-transitions'], rules: ['R-CAPT-07', 'R-CAPT-12', 'R-CAPT-14', 'R-ACT-03'], lineage: ['BAL-102'],
    steps: [...elect('Cracker'), ...jail(2, 'Cracker'), expire(),
      check(truth('Cracker', 'jailed', true), truth('Cracker', 'captain', false), truth('Cracker', 'location', 'Jail'), count('captains', 0), is('phase', 'CAPTAIN_ELECTION'), count('electionPhases', 2))],
  });
  add('CAPT', 6, 'A Captain outside Command Room can be attacked and loses the title when Injured', {
    areas: ['resolution-order'], rules: ['R-CAPT-07', 'R-CAPT-09', 'R-CAPT-14', 'R-MOVE-05'], lineage: ['BAL-009'],
    steps: [...elect('Cracker'), cmd('Cracker', move('Room A')), turn(2, 'Blue Disabler'), cmd('Blue Disabler', disable('Cracker')), check(truth('Cracker', 'captain', true)),
      phase(2, 'JAIL_VOTE'), expire(), check(truth('Cracker', 'health', 'Injured'), truth('Cracker', 'captain', false), truth('Cracker', 'location', 'Hospital'), is('phase', 'CAPTAIN_ELECTION'))],
  });
  add('CAPT', 7, 'Nobody inside Command Room can be targeted', {
    areas: ['resources'], rules: ['R-CAPT-08', 'R-ROLE-14'], lineage: ['BAL-006'],
    steps: [...elect('Cracker'), ...acts(2, {
      'Blue Disabler': [cmd('Blue Disabler', disable('Cracker'), 'NOT_ALLOWED')],
      Hacker: [cmd('Hacker', scan('Cracker', 'Blue'), 'NOT_ALLOWED'), cmd('Hacker', hack('Cracker'), 'NOT_ALLOWED')],
      Undercover: [cmd('Undercover', protect('Cracker'), 'NOT_ALLOWED')],
      ...(M.has('Officer') ? { Officer: [cmd('Officer', shot('Cracker'), 'NOT_ALLOWED')] } : {}),
    }), check(truth('Cracker', 'health', 'Healthy'), truth('Blue Disabler', 'disablerSpent', false))],
  });
  add('CAPT', 8, 'A Captain inside Command Room cannot act on anyone', {
    areas: ['resources'], rules: ['R-CAPT-11', 'R-ACT-02'], lineage: [],
    steps: [turn(1, 'Blue Disabler'), ...elect('Blue Disabler'), turn(2, 'Blue Disabler'), check(sees('Blue Disabler', 'legal:DISABLE', []), sees('Blue Disabler', 'legal:REQUEST_HACK', [])),
      cmd('Blue Disabler', disable('Insider'), 'NOT_ALLOWED'), cmd('Blue Disabler', hack('Insider'), 'NOT_ALLOWED')],
  });
  add('CAPT', 9, 'A tied election repeats for as long as it ties, and a runoff in which nobody votes elects nobody', {
    areas: ['voting', 'timing'], rules: ['R-CAPT-13', 'R-CAPT-02', 'R-CAPT-06', 'R-FLOW-08'], lineage: ['BAL-102'],
    steps: [untilPhase('CAPTAIN_ELECTION'),
      ...[1, 2, 3].flatMap(() => [cmd('Insider', vote('Cracker')), cmd('Alien', vote('Supplier')), expire(),
        check(is('phase', 'CAPTAIN_ELECTION'), factSet('eligibleTargets', ['Cracker', 'Supplier']), count('captains', 0))]),
      check(count('electionPhases', 4)), expire(), check(count('captains', 0), is('phase', 'ORDINARY_TURN'), is('round', 2), count('electionPhases', 4))],
  });
  {
    // Four Jail votes and every remaining player injured in Round 4 leave nobody Healthy and free.
    const noCandidate = [...jail(1, 'Hacker'), ...jail(2, 'Alien'), turn(3, 'Supplier'), cmd('Supplier', supply('Cracker', 'Insider')), ...jail(3, 'Supplier'),
      ...acts(4, {
        Undercover: [cmd('Undercover', shot('Insider'))], Insider: [cmd('Insider', shot('Cracker'))], Cracker: [cmd('Cracker', shot('Undercover'))],
        ...(M.has('Red Disabler') ? { 'Blue Disabler': [cmd('Blue Disabler', disable('Red Disabler'))] } : {}),
        ...(M.has('Officer') ? { 'Red Disabler': [cmd('Red Disabler', disable('Officer'))] } : {}),
      }), ...jail(4, 'Blue Disabler')];
    add('CAPT', 10, 'With no eligible candidate no election is held and Round 5 is played without a Captain', {
      areas: ['voting', 'phase-transitions'], rules: ['R-CAPT-06', 'R-CAPT-03', 'R-FLOW-13'], lineage: ['BAL-102'],
      note: 'Reachable only at the start of Round 5. Three elections were held before it, after Rounds 1, 2 and 3; that none is held after Round 4 is reading D37.',
      steps: [...noCandidate, phase(5, 'ORDINARY_TURN'), check(count('electionPhases', 3), count('captains', 0), count('jailed', 4), count('injured', N - 4), count('eliminated', 0))],
    });
  }
  // A Captain inside Command Room and an action aimed at themself. Each case ends with the same
  // command accepted outside the room, so that the refusal inside is the room's doing.
  add('CAPT', 11, 'A Captain inside Command Room cannot Scan themself', {
    areas: ['resources', 'movement'], rules: ['R-CAPT-15'], lineage: [],
    steps: [...elect('Hacker'), turn(2, 'Hacker'), check(truth('Hacker', 'location', 'Command Room')), cmd('Hacker', scan('Hacker', 'Red'), 'NOT_ALLOWED'), check(sees('Hacker', 'scanCount', 0)),
      cmd('Hacker', move('Room A')), cmd('Hacker', scan('Hacker', 'Red')), check(sees('Hacker', 'scanCount', 1))],
  });
  add('CAPT', 12, 'A Captain inside Command Room cannot protect themself', {
    areas: ['resources', 'movement'], rules: ['R-CAPT-15', 'R-PROT-05'], lineage: [],
    steps: [...elect('Undercover'), turn(2, 'Undercover'), check(truth('Undercover', 'location', 'Command Room')), cmd('Undercover', protect('Undercover'), 'NOT_ALLOWED'),
      check(truth('Undercover', 'lifetimeProtectionReceived', false)), cmd('Undercover', move('Room A')), cmd('Undercover', protect('Undercover')), check(truth('Undercover', 'lifetimeProtectionReceived', true))],
  });
  add('CAPT', 13, 'A Captain inside Command Room cannot Rescue themself', {
    areas: ['resources', 'movement'], rules: ['R-CAPT-15'], lineage: [],
    steps: [...elect('Cracker'), turn(2, 'Cracker'), check(truth('Cracker', 'location', 'Command Room')), cmd('Cracker', rescue('Cracker'), 'NOT_ALLOWED'),
      check(truth('Cracker', 'rescuesRemaining', 2)), cmd('Cracker', move('Room A')), cmd('Cracker', rescue('Cracker')), check(truth('Cracker', 'rescuesRemaining', 1))],
  });

  // ----- Shooting ------------------------------------------------------------------------------
  add('SHOT', 1, 'A direct shot spends the weapon at once and injures a Healthy target at resolution', {
    areas: ['resources', 'resolution-order'], rules: ['R-SHOT-01', 'R-SHOT-02', 'R-SHOT-05', 'R-SHOT-06', 'R-STATE-01', 'R-STATE-06'], lineage: ['BAL-003'],
    steps: [turn(4, 'Undercover'), cmd('Undercover', shot('Insider')), check(truth('Undercover', 'ordinaryWeapons', 0), sees('Undercover', 'pendingCount', 1), truth('Insider', 'health', 'Healthy')),
      startOf(5), check(truth('Insider', 'health', 'Injured'), truth('Insider', 'location', 'Hospital'), pub('Insider', 'health', 'Injured'), sees('Undercover', 'pendingCount', 0))],
  });
  add('SHOT', 2, 'An ordinary weapon cannot be fired before Round 4', {
    areas: ['resources', 'phase-transitions'], rules: ['R-SHOT-03', 'R-SHOT-05'], lineage: ['BAL-004'],
    steps: [...[1, 2, 3].flatMap(round => [turn(round, 'Undercover'), cmd('Undercover', shot('Insider'), 'NOT_ALLOWED'), check(sees('Undercover', 'legalOffered:REGISTER_SHOT', false))]),
      turn(4, 'Undercover'), cmd('Undercover', shot('Insider')), check(truth('Undercover', 'ordinaryWeapons', 0))],
  });
  add('SHOT', 3, 'An ordinary weapon kept until Round 5 can be fired then', {
    areas: ['resources'], rules: ['R-SHOT-03'], lineage: ['BAL-004'],
    steps: [turn(5, 'Undercover'), cmd('Undercover', shot('Insider')), untilPhase('FINISHED'), check(truth('Insider', 'health', 'Injured'))],
  });
  add('SHOT', 4, 'An Injured player cannot shoot', {
    areas: ['resources'], rules: ['R-SHOT-02', 'R-STATE-03'], lineage: ['BAL-006'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Undercover')), turn(4, 'Undercover'), check(truth('Undercover', 'health', 'Injured'), sees('Undercover', 'legalOffered:REGISTER_SHOT', false)),
      cmd('Undercover', shot('Insider'), 'NOT_ALLOWED'), check(truth('Undercover', 'ordinaryWeapons', 1))],
  });
  add('SHOT', 5, 'A Jailed player cannot shoot', {
    areas: ['resources'], rules: ['R-SHOT-02', 'R-STATE-04'], lineage: ['BAL-006'],
    steps: [...jail(1, 'Undercover'), turn(4, 'Undercover'), check(truth('Undercover', 'jailed', true)), cmd('Undercover', shot('Insider'), 'NOT_ALLOWED'), check(truth('Undercover', 'ordinaryWeapons', 1))],
  });
  {
    // A turn that precedes Undercover's in Round 4 or 5, to show that a shot waits for the own turn.
    const round = [4, 5].find(candidate => M.orderOf(B, candidate)[0] !== 'Undercover') ?? 4;
    const earlier = M.orderOf(B, round)[0] === 'Undercover' ? null : M.orderOf(B, round)[0];
    add('SHOT', 6, 'A shot needs the own turn, the same location and another player, once per turn', {
      areas: ['resources', 'movement'], rules: ['R-SHOT-02', 'R-SHOT-04', 'R-SHOT-05', 'R-ACT-02', 'R-ACT-04'], lineage: ['BAL-006'], setup: B,
      steps: [...(earlier === null ? [] : [turn(round, earlier), cmd('Undercover', shot('Cracker'), 'NOT_ALLOWED')]), turn(round, 'Undercover'),
        cmd('Undercover', shot('Insider'), 'NOT_ALLOWED'), cmd('Undercover', shot('Undercover'), 'NOT_ALLOWED'), cmd('Undercover', shot('Cracker')), cmd('Undercover', shot('Supplier'), 'NOT_ALLOWED'),
        check(truth('Undercover', 'ordinaryWeapons', 0), sees('Undercover', 'pendingCount', 1))],
    });
  }
  // SHOT-07 is withdrawn: refusing a command that carries an archived field is a property of the
  // wire contract, not of a rule. The number is not reused.
  add('SHOT', 8, 'A Main Action, a Shot and a Hack request are separate opportunities in one turn', {
    areas: ['resources'], rules: ['R-ACT-01', 'R-SHOT-04', 'R-SHOT-05', 'R-HACK-02'], lineage: [],
    steps: [turn(4, 'Undercover'), cmd('Undercover', protect('Hacker')), cmd('Undercover', shot('Insider')), cmd('Undercover', hack('Cracker')),
      check(sees('Undercover', 'pendingCount', 2), truth('Undercover', 'hackUsed', true), truth('Undercover', 'ordinaryWeapons', 0)), cmd('Undercover', protect('Cracker'), 'NOT_ALLOWED')],
  });

  // ----- Officer (nine players only) -----------------------------------------------------------
  if (M.has('Officer')) {
    add('OFF', 1, 'Officer may fire the one shot from Round 1', {
      areas: ['resources'], rules: ['R-ROLE-11', 'R-SHOT-01', 'R-SHOT-05'], lineage: ['BAL-004'],
      steps: [turn(1, 'Officer'), cmd('Officer', shot('Insider')), check(truth('Officer', 'officerShotSpent', true), truth('Officer', 'ordinaryWeapons', 0)), startOf(2), check(truth('Insider', 'health', 'Injured'))],
    });
    add('OFF', 2, 'A spent Officer who receives Supplier\'s weapon still cannot shoot again', {
      areas: ['resources'], rules: ['R-ROLE-11', 'R-ROLE-07'], lineage: ['BAL-005'],
      steps: [turn(1, 'Officer'), cmd('Officer', shot('Insider')), turn(3, 'Supplier'), cmd('Supplier', supply('Officer', 'Cracker')), startOf(4),
        check(truth('Officer', 'ordinaryWeapons', 1), sees('Officer', 'ordinaryWeapons', 1), truth('Cracker', 'ordinaryWeapons', 1)),
        turn(4, 'Officer'), check(sees('Officer', 'legalOffered:REGISTER_SHOT', false)), cmd('Officer', shot('Cracker'), 'NOT_ALLOWED'),
        turn(5, 'Officer'), cmd('Officer', shot('Cracker'), 'NOT_ALLOWED'), check(truth('Officer', 'ordinaryWeapons', 1))],
    });
    add('OFF', 3, 'An Officer holding two weapons still fires only once in the match', {
      areas: ['resources'], rules: ['R-ROLE-11', 'R-ROLE-07', 'R-SHOT-05'], lineage: ['BAL-005'],
      steps: [turn(3, 'Supplier'), cmd('Supplier', supply('Officer', 'Cracker')), turn(4, 'Officer'), check(truth('Officer', 'ordinaryWeapons', 2)), cmd('Officer', shot('Cracker')),
        check(truth('Officer', 'ordinaryWeapons', 1), truth('Officer', 'officerShotSpent', true)), turn(5, 'Officer'), cmd('Officer', shot('Alien'), 'NOT_ALLOWED')],
    });
    {
      const earlier = M.orderOf(B, 1)[0] === 'Officer' ? null : M.orderOf(B, 1)[0];
      add('OFF', 4, 'Officer\'s shot follows the ordinary rules for turn, location and target', {
        areas: ['resources', 'movement'], rules: ['R-ROLE-11', 'R-SHOT-02', 'R-SHOT-04', 'R-ACT-04'], lineage: ['BAL-004'], setup: B,
        steps: [...(earlier === null ? [] : [turn(1, earlier), cmd('Officer', shot('Cracker'), 'NOT_ALLOWED')]), turn(1, 'Officer'),
          cmd('Officer', shot('Insider'), 'NOT_ALLOWED'), cmd('Officer', shot('Officer'), 'NOT_ALLOWED'), cmd('Officer', shot('Cracker')), cmd('Officer', shot('Supplier'), 'NOT_ALLOWED')],
      });
    }
  }

  // ----- Disablers -----------------------------------------------------------------------------
  add('DIS', 1, 'Blue Disabler has one use, from Round 1, spent when accepted', {
    areas: ['resources'], rules: ['R-ROLE-05', 'R-ROLE-17', 'R-ACT-07', 'R-ACT-01'], lineage: [],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), check(truth('Blue Disabler', 'disablerSpent', true), truth('Insider', 'health', 'Healthy')), cmd('Blue Disabler', disable('Cracker'), 'NOT_ALLOWED'),
      turn(2, 'Blue Disabler'), check(truth('Insider', 'health', 'Injured'), truth('Insider', 'location', 'Hospital')), cmd('Blue Disabler', disable('Cracker'), 'NOT_ALLOWED')],
  });
  if (M.has('Red Disabler')) {
    add('DIS', 2, 'Red Disabler has one use and no ordinary weapon', {
      areas: ['resources'], rules: ['R-ROLE-06', 'R-SETUP-14'], lineage: ['BAL-001'],
      steps: [turn(1, 'Red Disabler'), cmd('Red Disabler', disable('Insider')), turn(2, 'Red Disabler'), cmd('Red Disabler', disable('Cracker'), 'NOT_ALLOWED'),
        turn(4, 'Red Disabler'), cmd('Red Disabler', shot('Cracker'), 'NOT_ALLOWED'), check(truth('Red Disabler', 'ordinaryWeapons', 0), truth('Insider', 'health', 'Injured'))],
    });
  }
  {
    const hit = doubleAttack(M, 'Insider');
    add('DIS', 3, 'Two attacks in one round eliminate, and only the faction is revealed', {
      areas: ['elimination', 'authorized-views'], rules: ['R-STATE-01', 'R-STATE-02', 'R-RES-05', 'R-VIEW-03'], lineage: ['BAL-024'],
      steps: [...hit.steps, check(pub('Insider', 'health', 'Healthy'), pub('Insider', 'revealedFaction', null)), phase(hit.round, 'JAIL_VOTE'), expire(),
        check(truth('Insider', 'health', 'Eliminated'), pub('Insider', 'health', 'Eliminated'), pub('Insider', 'revealedFaction', 'Blue'), fact('endRevealPresent', false), count('eliminated', 1))],
    });
  }
  add('DIS', 4, 'A Disabler must target another player in the same location', {
    areas: ['resources', 'movement'], rules: ['R-ACT-02', 'R-ACT-04', 'R-ROLE-05'], lineage: [], setup: B,
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider'), 'NOT_ALLOWED'), cmd('Blue Disabler', disable('Blue Disabler'), 'NOT_ALLOWED'), check(truth('Blue Disabler', 'disablerSpent', false)), cmd('Blue Disabler', disable('Cracker'))],
  });
  {
    const second = M.has('Red Disabler') ? { round: 2, actor: 'Red Disabler', command: disable('Insider') } : { round: 4, actor: 'Undercover', command: shot('Insider') };
    add('DIS', 5, 'A player in Hospital is out of reach of attacks', {
      areas: ['elimination', 'movement'], rules: ['R-ACT-02', 'R-MOVE-02', 'R-STATE-06'], lineage: [],
      steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), turn(second.round, second.actor), check(truth('Insider', 'location', 'Hospital')), cmd(second.actor, second.command, 'NOT_ALLOWED')],
    });
  }

  // ----- Protection ----------------------------------------------------------------------------
  add('PROT', 1, 'Undercover may protect themself, and a new Protection blocks nothing in its own round', {
    areas: ['resources', 'resolution-order'], rules: ['R-PROT-01', 'R-PROT-02'], lineage: ['BAL-010'],
    steps: [...acts(1, { Undercover: [cmd('Undercover', protect('Undercover'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Undercover'))] }),
      check(truth('Undercover', 'protection', 'pending')), phase(2, 'ORDINARY_TURN'), check(truth('Undercover', 'health', 'Injured'), truth('Undercover', 'protection', 'active'))],
  });
  {
    const later = M.has('Red Disabler') ? { round: 3, actor: 'Red Disabler', command: disable('Insider') } : { round: 4, actor: 'Undercover', command: shot('Insider') };
    add('PROT', 2, 'An active Protection blocks one attack, is used up, and does not block the next', {
      areas: ['resources', 'resolution-order'], rules: ['R-PROT-02', 'R-PROT-03', 'R-ACT-07'], lineage: ['BAL-012'],
      steps: [turn(1, 'Undercover'), cmd('Undercover', protect('Insider')), turn(2, 'Blue Disabler'), check(truth('Insider', 'protection', 'active')), cmd('Blue Disabler', disable('Insider')),
        startOf(3), check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'protection', 'consumed'), truth('Blue Disabler', 'disablerSpent', true)),
        turn(later.round, later.actor), cmd(later.actor, later.command), startOf(later.round + 1), check(truth('Insider', 'health', 'Injured'), truth('Insider', 'protection', 'consumed'))],
    });
  }
  add('PROT', 3, 'A player receives Protection once in a match, even after it is used up', {
    areas: ['resources'], rules: ['R-PROT-05', 'R-PROT-08'], lineage: ['BAL-011'],
    steps: [turn(1, 'Undercover'), cmd('Undercover', protect('Insider')), check(truth('Insider', 'lifetimeProtectionReceived', true)),
      ...acts(2, { Undercover: [cmd('Undercover', protect('Insider'), 'NOT_ALLOWED'), cmd('Undercover', protect('Cracker'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }),
      turn(3, 'Undercover'), check(truth('Insider', 'protection', 'consumed'), { visible: ref('Undercover'), field: 'legal:PROTECT', excludes: ref('Insider') }),
      cmd('Undercover', protect('Insider'), 'NOT_ALLOWED'), cmd('Undercover', protect('Undercover')), turn(4, 'Undercover'), cmd('Undercover', protect('Undercover'), 'NOT_ALLOWED')],
  });
  add('PROT', 4, 'A Jail vote ignores Protection and does not use it up', {
    areas: ['voting', 'resources'], rules: ['R-PROT-04', 'R-VOTE-04'], lineage: ['BAL-013'],
    steps: [turn(1, 'Undercover'), cmd('Undercover', protect('Insider')), ...jail(2, 'Insider'), expire(), check(truth('Insider', 'jailed', true), truth('Insider', 'health', 'Healthy'), truth('Insider', 'protection', 'active'))],
  });
  add('PROT', 5, 'Protection needs a target in the same location, which a Hospital patient is not', {
    areas: ['resources', 'movement'], rules: ['R-PROT-01', 'R-ACT-02'], lineage: [], setup: B,
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Cracker')), turn(2, 'Undercover'), check(truth('Cracker', 'location', 'Hospital')),
      cmd('Undercover', protect('Cracker'), 'NOT_ALLOWED'), cmd('Undercover', protect('Insider'), 'NOT_ALLOWED'), cmd('Undercover', protect('Supplier'))],
  });
  add('PROT', 6, 'Only Undercover learns that a Protection was granted, became active and was used up', {
    areas: ['authorized-views'], rules: ['R-PROT-06', 'R-VIEW-05', 'R-VIEW-06', 'R-VIEW-07', 'R-ACT-08'], lineage: ['BAL-109', 'BAL-024'], kind: 'privacy',
    steps: [turn(1, 'Undercover'), mark('before-grant'), cmd('Undercover', protect('Insider')), check(onlyActorSaw('before-grant', 'Undercover'), sees('Undercover', 'pendingCount', 1), truth('Insider', 'protection', 'pending'), sees('Insider', 'protectionSeats', [])),
      turn(2, 'Blue Disabler'), check(sees('Undercover', 'protectionState:@Insider', 'active'), sees('Insider', 'protectionSeats', [])), cmd('Blue Disabler', disable('Insider')),
      startOf(3), check(sees('Undercover', 'protectionState:@Insider', 'consumed'), sees('Insider', 'protectionSeats', []), sees('Blue Disabler', 'protectionSeats', []), sees('Blue Disabler', 'pendingCount', 0), pub('Insider', 'health', 'Healthy'))],
  });
  {
    const pair = M.has('Red Disabler')
      ? { grant: 1, round: 2, steps: acts(2, { 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], 'Red Disabler': [cmd('Red Disabler', disable('Insider'))] }) }
      : { grant: 3, round: 4, steps: acts(4, { 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], Undercover: [cmd('Undercover', shot('Insider'))] }) };
    add('PROT', 7, 'Of two attacks on a protected player, one is blocked and the other lands', {
      areas: ['resolution-order', 'resources'], rules: ['R-PROT-03', 'R-RES-04'], lineage: ['BAL-105'],
      steps: [turn(pair.grant, 'Undercover'), cmd('Undercover', protect('Insider')), ...pair.steps, startOf(pair.round + 1), check(truth('Insider', 'health', 'Injured'), truth('Insider', 'protection', 'consumed'), count('eliminated', 0))],
    });
  }

  add('PROT', 8, 'A Protection granted by an Undercover who is then voted into Jail is still granted', {
    areas: ['resolution-order', 'voting'], rules: ['R-ACT-05', 'R-PROT-02', 'R-PROT-03'], lineage: ['BAL-007'],
    steps: [turn(1, 'Undercover'), cmd('Undercover', protect('Insider')), ...jail(1, 'Undercover'), turn(2, 'Blue Disabler'), check(truth('Undercover', 'jailed', true), truth('Insider', 'protection', 'active')),
      cmd('Blue Disabler', disable('Insider')), startOf(3), check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'protection', 'consumed'))],
  });

  // ----- Rescue --------------------------------------------------------------------------------
  add('RESC', 1, 'An Injured Cracker rescues themself and returns to their last room', {
    areas: ['resources', 'movement'], rules: ['R-ROLE-03', 'R-ROLE-02', 'R-STATE-08', 'R-ACT-07'], lineage: ['BAL-014', 'BAL-101'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Cracker')), turn(2, 'Cracker'), check(truth('Cracker', 'location', 'Hospital')), cmd('Cracker', rescue('Cracker')), check(truth('Cracker', 'rescuesRemaining', 1)),
      startOf(3), check(truth('Cracker', 'health', 'Healthy'), truth('Cracker', 'location', 'Room A'))],
  });
  add('RESC', 2, 'Cracker rescues a Hospital patient from a room, without moving', {
    areas: ['resources', 'movement'], rules: ['R-ROLE-04', 'R-STATE-08'], lineage: ['BAL-103', 'BAL-101'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), turn(2, 'Cracker'), check({ visible: ref('Cracker'), field: 'legal:RESCUE', includes: ref('Insider') }),
      cmd('Cracker', rescue('Insider')), check(truth('Cracker', 'location', 'Room A'), truth('Cracker', 'movedThisRound', false)), startOf(3), check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Room A'))],
  });
  {
    const hit = doubleAttack(M, 'Insider', { Cracker: [cmd('Cracker', rescue('Insider'))] });
    add('RESC', 3, 'A Rescue cannot bring back an Eliminated player and its use is still spent', {
      areas: ['elimination', 'resources'], rules: ['R-ROLE-02', 'R-ACT-07', 'R-STATE-02', 'R-RES-01', 'R-STATE-01'], lineage: ['BAL-014'],
      steps: [...hit.steps, phase(hit.round, 'JAIL_VOTE'), expire(), check(truth('Insider', 'health', 'Eliminated'), truth('Cracker', 'rescuesRemaining', 1))],
    });
  }
  add('RESC', 4, 'A Rescue heals an injury received in the same round', {
    areas: ['resolution-order'], rules: ['R-RES-01', 'R-ROLE-02'], lineage: ['BAL-014'],
    steps: [...acts(1, { Cracker: [cmd('Cracker', rescue('Insider'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }), startOf(2),
      check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Room A'), truth('Cracker', 'rescuesRemaining', 1), truth('Blue Disabler', 'disablerSpent', true))],
  });
  add('RESC', 5, 'Cracker has two Rescues in a match', {
    areas: ['resources'], rules: ['R-ROLE-02', 'R-ACT-07'], lineage: ['BAL-014'],
    steps: [turn(1, 'Cracker'), cmd('Cracker', rescue('Insider')), cmd('Cracker', rescue('Supplier'), 'NOT_ALLOWED'), turn(2, 'Cracker'), cmd('Cracker', rescue('Insider')), check(truth('Cracker', 'rescuesRemaining', 0)),
      turn(3, 'Cracker'), cmd('Cracker', rescue('Insider'), 'NOT_ALLOWED')],
  });
  {
    const both = M.has('Red Disabler')
      ? { round: 2, steps: acts(1, { 'Blue Disabler': [cmd('Blue Disabler', disable('Cracker'))], 'Red Disabler': [cmd('Red Disabler', disable('Insider'))] }) }
      : { round: 5, steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Cracker')), turn(4, 'Undercover'), cmd('Undercover', shot('Insider'))] };
    add('RESC', 6, 'An Injured Cracker cannot rescue anyone else', {
      areas: ['resources'], rules: ['R-ROLE-03', 'R-STATE-03'], lineage: ['BAL-014'],
      steps: [...both.steps, turn(both.round, 'Cracker'), check(truth('Cracker', 'location', 'Hospital'), truth('Insider', 'location', 'Hospital')), cmd('Cracker', rescue('Insider'), 'NOT_ALLOWED'), cmd('Cracker', rescue('Cracker'))],
    });
  }
  add('RESC', 7, 'A Jailed Cracker cannot rescue', {
    areas: ['resources'], rules: ['R-STATE-04', 'R-ROLE-02'], lineage: ['BAL-014'],
    steps: [...jail(1, 'Cracker'), turn(2, 'Cracker'), cmd('Cracker', rescue('Cracker'), 'NOT_ALLOWED'), cmd('Cracker', rescue('Insider'), 'NOT_ALLOWED'), check(truth('Cracker', 'rescuesRemaining', 2))],
  });
  add('RESC', 8, 'Healing does not release from Jail', {
    areas: ['resolution-order', 'voting'], rules: ['R-VOTE-08', 'R-STATE-08', 'R-RES-01', 'R-ACT-06', 'R-STATE-04'], lineage: ['BAL-014', 'BAL-104'],
    steps: [...acts(1, { Cracker: [cmd('Cracker', rescue('Insider'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }), ...jail(1, 'Insider'), expire(),
      check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'jailed', true), truth('Insider', 'location', 'Jail'))],
  });
  add('RESC', 9, 'From a room, a Rescue reaches the same room and Hospital only', {
    areas: ['resources', 'movement'], rules: ['R-ROLE-04', 'R-ACT-02'], lineage: ['BAL-103'], setup: B,
    steps: [...M.jail(1, 'Supplier'), turn(2, 'Cracker'), cmd('Cracker', rescue('Insider'), 'NOT_ALLOWED'), cmd('Cracker', rescue('Supplier'), 'NOT_ALLOWED'), check(truth('Cracker', 'rescuesRemaining', 2))],
  });

  add('RESC', 10, 'A Rescue registered by a Cracker who is then voted into Jail still heals', {
    areas: ['resolution-order', 'voting'], rules: ['R-ACT-05', 'R-RES-01', 'R-ROLE-02'], lineage: ['BAL-007'],
    steps: [...acts(1, { Cracker: [cmd('Cracker', rescue('Insider'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }), ...jail(1, 'Cracker'), expire(),
      check(truth('Cracker', 'jailed', true), truth('Insider', 'health', 'Healthy'), truth('Cracker', 'rescuesRemaining', 1))],
  });

  // ----- Supplier ------------------------------------------------------------------------------
  add('SUP', 1, 'Supplier arms two players in Round 3: the registration is private and each recipient sees their own weapon', {
    areas: ['resources', 'authorized-views'], rules: ['R-ROLE-07', 'R-ROLE-08', 'R-VIEW-02', 'R-VIEW-07', 'R-SHOT-05'], lineage: ['BAL-109'],
    steps: [turn(3, 'Supplier'), mark('before-supply'), cmd('Supplier', supply('Insider', 'Cracker')), check(onlyActorSaw('before-supply', 'Supplier'), truth('Insider', 'ordinaryWeapons', 0)),
      startOf(4), check(truth('Insider', 'ordinaryWeapons', 1), truth('Cracker', 'ordinaryWeapons', 1), sees('Insider', 'ordinaryWeapons', 1), sees('Supplier', 'ordinaryWeapons', 0), count('ordinaryWeapons', startingWeapons + 2)),
      turn(4, 'Insider'), cmd('Insider', shot('Hacker')), check(truth('Insider', 'ordinaryWeapons', 0))],
  });
  add('SUP', 2, 'Supplier acts in Round 3 only, once', {
    areas: ['resources', 'phase-transitions'], rules: ['R-ROLE-07', 'R-ACT-01'], lineage: [],
    steps: [...[1, 2].flatMap(round => [turn(round, 'Supplier'), cmd('Supplier', supply('Insider', 'Cracker'), 'NOT_ALLOWED')]), turn(3, 'Supplier'), cmd('Supplier', supply('Insider', 'Cracker')),
      cmd('Supplier', supply('Alien', 'Hacker'), 'NOT_ALLOWED'), turn(4, 'Supplier'), cmd('Supplier', supply('Alien', 'Hacker'), 'NOT_ALLOWED'), check(count('ordinaryWeapons', startingWeapons + 2))],
  });
  add('SUP', 3, 'The two recipients must be different players in Supplier\'s location', {
    areas: ['resources', 'movement'], rules: ['R-ROLE-07', 'R-ACT-02'], lineage: [], setup: B,
    steps: [turn(3, 'Supplier'), cmd('Supplier', supply('Insider', 'Cracker'), 'NOT_ALLOWED'), cmd('Supplier', supply('Cracker', 'Cracker'), 'REFUSED'), cmd('Supplier', supply('Cracker', 'Hacker'))],
  });
  add('SUP', 4, 'A recipient injured in Round 3 still receives the weapon', {
    areas: ['resolution-order', 'resources'], rules: ['R-ROLE-07', 'R-RES-01'], lineage: [],
    steps: [...acts(3, { Supplier: [cmd('Supplier', supply('Insider', 'Cracker'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }), startOf(4),
      check(truth('Insider', 'health', 'Injured'), truth('Insider', 'ordinaryWeapons', 1), truth('Cracker', 'ordinaryWeapons', 1))],
  });
  if (M.has('Red Disabler')) {
    add('SUP', 5, 'A recipient eliminated in Round 3 receives nothing', {
      areas: ['resolution-order', 'elimination'], rules: ['R-ROLE-07', 'R-RES-01', 'R-ACT-06'], lineage: [],
      steps: [...acts(3, { Supplier: [cmd('Supplier', supply('Insider', 'Cracker'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], 'Red Disabler': [cmd('Red Disabler', disable('Insider'))] }), startOf(4),
        check(truth('Insider', 'health', 'Eliminated'), truth('Insider', 'ordinaryWeapons', 0), truth('Cracker', 'ordinaryWeapons', 1), count('ordinaryWeapons', startingWeapons + 1))],
    });
  }
  add('SUP', 6, 'A Supplier who is Injured on their Round 3 turn distributes nothing', {
    areas: ['resources'], rules: ['R-STATE-03', 'R-ROLE-07'], lineage: [],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Supplier')), turn(3, 'Supplier'), cmd('Supplier', supply('Insider', 'Cracker'), 'NOT_ALLOWED'), startOf(4), check(count('ordinaryWeapons', startingWeapons))],
  });
  add('SUP', 7, 'A Supplier who is Jailed on their Round 3 turn distributes nothing', {
    areas: ['resources'], rules: ['R-STATE-04', 'R-ROLE-07'], lineage: [],
    steps: [...jail(1, 'Supplier'), turn(3, 'Supplier'), cmd('Supplier', supply('Insider', 'Cracker'), 'NOT_ALLOWED'), startOf(4), check(count('ordinaryWeapons', startingWeapons))],
  });
  add('SUP', 8, 'Supplier naming themself as a recipient', {
    status: 'blocked', decisions: ['D11'], areas: ['resources'], rules: ['R-ROLE-09'], kind: 'decision_boundary',
    steps: [turn(3, 'Supplier'), probe('Supplier', supply('Supplier', 'Insider'), 'SUPPLY naming Supplier and one other player')],
  });
  add('SUP', 9, 'Supplier with only one other player in the room', {
    status: 'blocked', decisions: ['D12', 'D11'], areas: ['resources', 'movement'], rules: ['R-ROLE-10'], kind: 'decision_boundary',
    steps: [phase(3, 'ORDINARY_TURN'), cmd('Supplier', move('Room B')), cmd('Insider', move('Room B')), turn(3, 'Supplier'),
      probe('Supplier', supply('Insider', 'Cracker'), 'SUPPLY naming the one player present and a player in another room'),
      probe('Supplier', supply('Insider', 'Supplier'), 'SUPPLY naming the one player present and Supplier')],
  });

  add('SUP', 10, 'A Supplier injured in Round 3 after registering still distributes', {
    areas: ['resolution-order', 'resources'], rules: ['R-ACT-05', 'R-ROLE-07', 'R-RES-01'], lineage: ['BAL-007'],
    steps: [...acts(3, { Supplier: [cmd('Supplier', supply('Insider', 'Cracker'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Supplier'))] }), startOf(4),
      check(truth('Supplier', 'health', 'Injured'), truth('Insider', 'ordinaryWeapons', 1), truth('Cracker', 'ordinaryWeapons', 1))],
  });

  // ----- Scan ----------------------------------------------------------------------------------
  const inCode = role => M.code.includes(M.seatOf(A, role));
  add('SCAN', 1, 'A wrong guess reveals nothing and uses the round\'s Scan', {
    areas: ['resources', 'authorized-views'], rules: ['R-ROLE-13', 'R-ROLE-14', 'R-ACT-01'], lineage: ['BAL-015'],
    steps: [turn(1, 'Hacker'), cmd('Hacker', scan('Insider', 'Red')), check(sees('Hacker', 'scanCount', 1), sees('Hacker', 'lastScanMatched', false), sees('Hacker', 'lastScanInCode', null), truth('Hacker', 'scannedThisRound', true)),
      cmd('Hacker', scan('Cracker', 'Blue'), 'NOT_ALLOWED'), check(sees('Hacker', 'scanCount', 1))],
  });
  add('SCAN', 2, 'A correct guess reveals only whether the target is in the Code, once per round', {
    areas: ['resources', 'authorized-views'], rules: ['R-ROLE-13', 'R-ROLE-14', 'R-SETUP-08'], lineage: ['BAL-015'],
    steps: [turn(1, 'Hacker'), cmd('Hacker', scan('Insider', 'Blue')), check(sees('Hacker', 'lastScanMatched', true), sees('Hacker', 'lastScanInCode', inCode('Insider'))),
      turn(2, 'Hacker'), cmd('Hacker', scan('Alien', 'Alien')), check(sees('Hacker', 'lastScanMatched', true), sees('Hacker', 'lastScanInCode', true)),
      turn(3, 'Hacker'), cmd('Hacker', scan('Undercover', 'Red')), check(sees('Hacker', 'lastScanMatched', true), sees('Hacker', 'lastScanInCode', false)),
      turn(4, 'Hacker'), cmd('Hacker', scan('Hacker', 'Red')), check(sees('Hacker', 'lastScanMatched', true), sees('Hacker', 'lastScanInCode', inCode('Hacker')), sees('Hacker', 'scanCount', 4))],
  });
  add('SCAN', 3, 'A Scan of another player, Undercover included, needs the same location', {
    areas: ['resources', 'movement'], rules: ['R-ROLE-13', 'R-ACT-02'], lineage: ['BAL-015'], setup: B,
    steps: [cmd('Undercover', move('Room B')), turn(1, 'Hacker'), cmd('Hacker', scan('Insider', 'Blue'), 'NOT_ALLOWED'), cmd('Hacker', scan('Undercover', 'Red'), 'NOT_ALLOWED'), check(sees('Hacker', 'scanCount', 0)),
      cmd('Hacker', scan('Hacker', 'Red')), check(sees('Hacker', 'scanCount', 1))],
  });
  add('SCAN', 4, 'An Injured Hacker cannot Scan', {
    areas: ['resources'], rules: ['R-ROLE-18', 'R-STATE-03', 'R-ROLE-13'], lineage: ['BAL-015'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Hacker')), turn(2, 'Hacker'), cmd('Hacker', scan('Hacker', 'Red'), 'NOT_ALLOWED'), check(sees('Hacker', 'scanCount', 0))],
  });
  add('SCAN', 5, 'A Jailed Hacker cannot Scan', {
    areas: ['resources'], rules: ['R-ROLE-18', 'R-STATE-04', 'R-ROLE-13'], lineage: ['BAL-015'],
    steps: [...jail(1, 'Hacker'), turn(2, 'Hacker'), cmd('Hacker', scan('Hacker', 'Red'), 'NOT_ALLOWED'), check(sees('Hacker', 'scanCount', 0))],
  });
  add('SCAN', 6, 'A Scan result reaches Hacker at once and nobody else', {
    areas: ['authorized-views'], rules: ['R-ROLE-14', 'R-VIEW-05', 'R-VIEW-07'], lineage: ['BAL-109', 'BAL-024'], kind: 'privacy',
    steps: [turn(1, 'Hacker'), mark('before-scan'), cmd('Hacker', scan('Insider', 'Blue')), check(onlyActorSaw('before-scan', 'Hacker'), sees('Hacker', 'scanCount', 1), is('phase', 'ORDINARY_TURN'))],
  });
  {
    const round = [1, 2, 3, 4, 5].find(candidate => M.orderOf(A, candidate)[0] !== 'Hacker');
    add('SCAN', 7, 'A Scan needs Hacker\'s own turn', {
      areas: ['resources', 'phase-transitions'], rules: ['R-ROLE-18'], lineage: ['BAL-015'],
      steps: [turn(round, first(round)), cmd('Hacker', scan('Hacker', 'Red'), 'NOT_ALLOWED'), check(sees('Hacker', 'scanCount', 0)), turn(round, 'Hacker'), cmd('Hacker', scan('Hacker', 'Red')), check(sees('Hacker', 'scanCount', 1))],
    });
  }

  // ----- Standard Hack -------------------------------------------------------------------------
  {
    const [one, two, three] = M.orderOf(A, 1);
    const partner = role => all.find(other => other !== role);
    add('HACK', 1, 'A Hack is requested inside the turn and adds a separate minute after it', {
      areas: ['timing', 'phase-transitions'], rules: ['R-FLOW-06', 'R-HACK-02'], lineage: ['BAL-017'], kind: 'timing',
      steps: [turn(1, one), cmd(one, hack(partner(one))), check(is('phase', 'ORDINARY_TURN')), expire(),
        check(is('phase', 'HACK'), is('windowMs', 60_000), sees(one, 'hackPartner', ref(partner(one))), sees(partner(one), 'hackPartner', ref(one)), truth(one, 'hackUsed', true)),
        expire(), check(is('phase', 'ORDINARY_TURN'), is('active', ref(two)), count('hackPhases', 1))],
    });
    const again = M.byTurn(A, 2, [one, three]);
    add('HACK', 2, 'One initiation per player in a match and two conversations in a round', {
      areas: ['resources'], rules: ['R-HACK-01', 'R-ACT-01'], lineage: ['BAL-018'],
      steps: [turn(1, one), cmd(one, hack(partner(one))), turn(1, two), cmd(two, hack(partner(two))), turn(1, three), cmd(three, hack(partner(three)), 'NOT_ALLOWED'),
        ...again.flatMap(role => [turn(2, role), role === one ? cmd(one, hack(partner(one)), 'NOT_ALLOWED') : cmd(three, hack(partner(three)))]),
        phase(2, 'JAIL_VOTE'), check(count('hackPhases', 3))],
    });
    add('HACK', 5, 'A Hack request stays private until the conversation opens', {
      areas: ['authorized-views'], rules: ['R-VIEW-07', 'R-VIEW-02', 'R-FLOW-06'], lineage: ['BAL-024'], kind: 'privacy',
      steps: [turn(1, one), mark('before-request'), cmd(one, hack(partner(one))), check(onlyActorSaw('before-request', one)), expire(), check(is('phase', 'HACK'), changed('before-request', 'public'))],
    });
  }
  {
    const actor = M.orderOf(B, 1).find(role => B.initialRooms[M.seatOf(B, role)] === 'Room A');
    const sameRoom = all.find(role => role !== actor && B.initialRooms[M.seatOf(B, role)] === 'Room A');
    add('HACK', 3, 'A Hack names another player in the same location', {
      areas: ['resources', 'movement'], rules: ['R-HACK-02', 'R-ACT-02', 'R-ACT-04'], lineage: ['BAL-018'], setup: B,
      steps: [turn(1, actor), cmd(actor, hack('Insider'), 'NOT_ALLOWED'), cmd(actor, hack(actor), 'NOT_ALLOWED'), check(truth(actor, 'hackUsed', false)), cmd(actor, hack(sameRoom))],
    });
  }
  add('HACK', 4, 'Two Jailed players may hold a Hack with each other, and not with anyone outside', {
    areas: ['resources', 'voting'], rules: ['R-HACK-03', 'R-STATE-04', 'R-ACT-02'], lineage: ['BAL-018'],
    steps: [...jail(1, 'Alien'), ...jail(2, 'Insider'), turn(3, 'Alien'), cmd('Alien', hack('Cracker'), 'NOT_ALLOWED'), cmd('Alien', hack('Insider')), expire(), check(is('phase', 'HACK'), sees('Insider', 'hackPartner', ref('Alien')))],
  });
  add('HACK', 6, 'How a Hack conversation is conducted', { status: 'blocked', decisions: ['D18'], areas: ['timing'], rules: ['R-HACK-07'], setup: null, kind: 'decision_boundary' });
  add('HACK', 7, 'Players are shown the truth rule and the embargo, including the Round 5 embargo', {
    status: 'manual', areas: ['authorized-views'], rules: ['R-HACK-04', 'R-HACK-05'], lineage: ['BAL-018'], setup: null, kind: 'conduct',
    note: 'Conduct rules. Evidence is the player instructions in the app and observation in a playtest, not an engine run.',
  });

  // ----- Code ----------------------------------------------------------------------------------
  const notHackerTurn = round => M.orderOf(A, round).find(role => role !== 'Hacker');
  add('CODE', 1, 'Hacker has one attempt in Round 5 and the order of the numbers does not matter', {
    areas: ['resources', 'phase-transitions'], rules: ['R-ROLE-15', 'R-SETUP-08'], lineage: ['BAL-016', 'BAL-002'],
    steps: [turn(5, notHackerTurn(5)), check(sees('Hacker', 'codeAttemptAvailable', true)), cmd('Hacker', submit([...M.code].reverse())),
      check(is('codeSubmitted', true), is('codeCorrect', true), sees('Hacker', 'codeAttemptAvailable', false)), cmd('Hacker', submit(M.code), 'NOT_ALLOWED')],
  });
  add('CODE', 2, 'A wrong Code uses up the attempt', {
    areas: ['resources'], rules: ['R-ROLE-15'], lineage: ['BAL-016', 'BAL-002'],
    steps: [phase(5, 'ORDINARY_TURN'), cmd('Hacker', submit(M.wrongCode)), check(is('codeSubmitted', true), is('codeCorrect', false)), cmd('Hacker', submit(M.code), 'NOT_ALLOWED'), check(is('codeCorrect', false))],
  });
  add('CODE', 3, 'Only Hacker submits, and only in Round 5', {
    areas: ['resources', 'phase-transitions'], rules: ['R-ROLE-15'], lineage: ['BAL-016'],
    steps: [phase(4, 'ORDINARY_TURN'), check(sees('Hacker', 'codeAttemptAvailable', false)), cmd('Hacker', submit(M.code), 'NOT_ALLOWED'),
      phase(5, 'ORDINARY_TURN'), cmd('Alien', submit(M.code), 'NOT_ALLOWED'), cmd('Undercover', submit(M.code), 'NOT_ALLOWED'), check(is('codeSubmitted', false)), cmd('Hacker', submit(M.code))],
  });
  add('CODE', 4, 'An Injured Hacker may still submit', {
    areas: ['resources'], rules: ['R-ROLE-15', 'R-STATE-03'], lineage: ['BAL-016'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Hacker')), phase(5, 'ORDINARY_TURN'), check(truth('Hacker', 'health', 'Injured')), cmd('Hacker', submit(M.code)), check(is('codeCorrect', true))],
  });
  add('CODE', 5, 'A Jailed Hacker may still submit', {
    areas: ['resources'], rules: ['R-ROLE-15', 'R-STATE-04'], lineage: ['BAL-016'],
    steps: [...jail(1, 'Hacker'), phase(5, 'ORDINARY_TURN'), check(truth('Hacker', 'jailed', true)), cmd('Hacker', submit(M.code)), check(is('codeCorrect', true))],
  });
  {
    const hit = doubleAttack(M, 'Hacker');
    add('CODE', 6, 'An Eliminated Hacker cannot submit and nobody inherits the attempt', {
      areas: ['elimination', 'resources'], rules: ['R-ROLE-15', 'R-FLOW-11'], lineage: ['BAL-016'],
      steps: [...hit.steps, phase(5, 'ORDINARY_TURN'), check(truth('Hacker', 'health', 'Eliminated'), sees('Hacker', 'codeAttemptAvailable', false)),
        cmd('Hacker', submit(M.code), 'NOT_ALLOWED'), cmd('Undercover', submit(M.code), 'NOT_ALLOWED'), check(is('codeSubmitted', false))],
    });
  }
  add('CODE', 7, 'The attempt may be made during the Round 5 Jail vote', {
    areas: ['phase-transitions', 'resources'], rules: ['R-ROLE-15', 'R-ACT-03'], lineage: ['BAL-016', 'BAL-106'],
    steps: [phase(5, 'JAIL_VOTE'), cmd('Hacker', submit(M.code)), check(is('codeCorrect', true))],
  });
  add('CODE', 8, 'A correct Code wins for Red at the Round 5 check, not at the moment of submission', {
    areas: ['victory', 'phase-transitions'], rules: ['R-WIN-06', 'R-WIN-07', 'R-WIN-09', 'R-VIEW-08'], lineage: ['BAL-106'],
    steps: [phase(5, 'ORDINARY_TURN'), cmd('Hacker', submit(M.code)), check(is('terminal', false), is('hasResult', false), fact('endRevealPresent', false)),
      untilPhase('FINISHED'), check(is('winner', 'Red'), is('alienCoWinner', false), is('round', 5), count('showdownPhases', 0), fact('endRevealPresent', true))],
  });
  {
    const shooters = M.has('Red Disabler') ? { Insider: [cmd('Insider', shot('Hacker'))], Cracker: [cmd('Cracker', shot('Red Disabler'))] } : { Insider: [cmd('Insider', shot('Hacker'))] };
    add('CODE', 9, 'A correct Code with no Healthy Red player wins nothing and the showdown begins', {
      areas: ['victory'], rules: ['R-WIN-13', 'R-WIN-06', 'R-WIN-04', 'R-WIN-10', 'R-WIN-02'], lineage: ['BAL-106'],
      steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Undercover')), turn(3, 'Supplier'), cmd('Supplier', supply('Insider', 'Cracker')), ...acts(4, shooters),
        phase(5, 'ORDINARY_TURN'), check(...['Undercover', 'Hacker', ...(M.has('Red Disabler') ? ['Red Disabler'] : [])].map(role => truth(role, 'health', 'Injured'))),
        cmd('Hacker', submit(M.code)), untilPhase('SHOWDOWN'), check(is('codeCorrect', true), is('hasResult', false), is('round', 5))],
    });
  }
  add('CODE', 10, 'A Code submission is known only to Hacker', {
    areas: ['authorized-views'], rules: ['R-VIEW-07', 'R-VIEW-02'], lineage: ['BAL-024'], kind: 'privacy',
    steps: [turn(5, notHackerTurn(5)), mark('before-code'), cmd('Hacker', submit(M.code)), check(onlyActorSaw('before-code', 'Hacker'))],
  });

  // ----- Jail vote -----------------------------------------------------------------------------
  add('VOTE', 1, `A Jail vote succeeds with ${T} of ${N} votes and does no damage`, {
    areas: ['voting'], rules: ['R-VOTE-01', 'R-VOTE-03', 'R-STATE-04'], lineage: ['BAL-013'],
    steps: [...jail(1, 'Insider'), expire(), check(truth('Insider', 'jailed', true), truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Jail'), pub('Insider', 'jailed', true),
      fact('tallyKind', 'JAIL_VOTE'), fact('tallySelected', ref('Insider')), tally('Insider', T), fact('tallyEligibleVoterCount', N))],
  });
  add('VOTE', 2, `${T - 1} of ${N} votes jail nobody, even when no other ballot is cast`, {
    areas: ['voting'], rules: ['R-VOTE-03', 'R-FLOW-08'], lineage: ['BAL-013', 'BAL-107'],
    steps: [...jail(1, 'Insider', T - 1), expire(), check(truth('Insider', 'jailed', false), fact('tallySelected', null), tally('Insider', T - 1), fact('tallyEligibleVoterCount', N), count('jailed', 0))],
  });
  {
    const half = Math.floor(N / 2);
    const firstHalf = all.slice(0, half);
    const secondHalf = all.slice(half, half * 2);
    add('VOTE', 3, mode === 8 ? 'A 4 against 4 tie jails nobody although each side has exactly half' : `A ${half} against ${half} tie jails nobody`, {
      areas: ['voting'], rules: ['R-VOTE-03'], lineage: ['BAL-013'],
      note: mode === 8 ? '' : 'With an odd number of voters a tie cannot reach the threshold; the case still shows that no tied player is jailed.',
      steps: [phase(1, 'JAIL_VOTE'), ...firstHalf.map(role => cmd(role, vote('Insider'))), ...secondHalf.map(role => cmd(role, vote('Cracker'))), expire(),
        check(count('jailed', 0), fact('tallySelected', null), tally('Insider', half), tally('Cracker', half))],
    });
  }
  add('VOTE', 4, 'Injured and Jailed players vote, a Jailed player cannot be voted for, and a self-vote counts', {
    areas: ['voting'], rules: ['R-VOTE-02'], lineage: ['BAL-013'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...jail(1, 'Alien'), phase(2, 'JAIL_VOTE'),
      check(factSet('eligibleVoters', all), factSet('eligibleTargets', all.filter(role => role !== 'Alien'))),
      cmd('Hacker', vote('Alien'), 'NOT_ALLOWED'), cmd('Insider', vote('Cracker')), cmd('Alien', vote('Cracker')), cmd('Cracker', vote('Cracker')), expire(), check(tally('Cracker', 3), fact('tallyEligibleVoterCount', N))],
  });
  add('VOTE', 5, 'A ballot is final and stays private until the totals are published', {
    areas: ['voting', 'authorized-views'], rules: ['R-VOTE-02', 'R-VOTE-09', 'R-VIEW-01', 'R-VIEW-07'], lineage: ['BAL-024', 'BAL-107'], kind: 'privacy',
    steps: [phase(1, 'JAIL_VOTE'), mark('before-ballot'), cmd('Insider', vote('Cracker')), check(onlyActorSaw('before-ballot', 'Insider'), sees('Insider', 'hasVoted', true), sees('Insider', 'ownBallot', ref('Cracker'))),
      cmd('Insider', vote('Supplier'), 'NOT_ALLOWED'), expire(), check(fact('tallyKind', 'JAIL_VOTE'), tally('Cracker', 1), tally('Supplier', 0))],
  });
  add('VOTE', 6, 'A Jailed player talks and votes but cannot act or move', {
    areas: ['voting', 'resources'], rules: ['R-STATE-04', 'R-MOVE-02'], lineage: ['BAL-006'],
    steps: [...jail(1, 'Blue Disabler'), turn(2, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider'), 'NOT_ALLOWED'), cmd('Blue Disabler', move('Room A'), 'NOT_ALLOWED'),
      phase(2, 'JAIL_VOTE'), cmd('Blue Disabler', vote('Insider')), check(truth('Blue Disabler', 'disablerSpent', false))],
  });
  {
    const hit = doubleAttack(M, 'Insider');
    const next = hit.round + 1;
    add('VOTE', 7, 'An Eliminated player does not vote and is not counted', {
      areas: ['voting', 'elimination'], rules: ['R-FLOW-11', 'R-VOTE-02', 'R-VOTE-03'], lineage: ['BAL-013'],
      steps: [...hit.steps, phase(next, 'JAIL_VOTE'), check(factSet('eligibleVoters', all.filter(role => role !== 'Insider')), factSet('eligibleTargets', all.filter(role => role !== 'Insider'))),
        cmd('Insider', vote('Cracker'), 'NOT_ALLOWED'), expire(), check(fact('tallyEligibleVoterCount', N - 1))],
    });
  }

  // ----- Release -------------------------------------------------------------------------------
  // After the Captain has chosen, the cases run to the release vote instead of closing the choice
  // window themselves: whether that window closes at once is undecided (D17).
  const releaseSetup = [...jail(1, 'Insider'), ...elect('Cracker'), untilPhase('RELEASE_CHOICE')];
  const releaseVote = [cmd('Cracker', choose('Insider')), untilPhase('RELEASE_VOTE')];
  add('REL', 1, 'The Captain asks for one prisoner\'s release; a passed vote frees them to their last room before the Jail vote', {
    areas: ['voting', 'movement'], rules: ['R-VOTE-05', 'R-VOTE-06', 'R-VOTE-07', 'R-VOTE-10', 'R-CAPT-10', 'R-FLOW-07'], lineage: ['BAL-101'],
    note: 'That the choice stays private until the release vote opens (R-VIEW-07) is not asserted here: it cannot be told apart from D17.',
    steps: [...releaseSetup, check(is('round', 2), is('active', ref('Cracker')), factSet('eligibleTargets', ['Insider']), is('windowMs', 60_000)),
      cmd('Hacker', choose('Insider'), 'NOT_ALLOWED'), ...releaseVote,
      check(fact('releaseTarget', ref('Insider')), is('windowMs', 60_000)), ...M.voters(T).map(voter => cmd(voter, approve(true))), expire(),
      check(is('phase', 'JAIL_VOTE'), truth('Insider', 'jailed', false), truth('Insider', 'location', 'Room A'), fact('tallyKind', 'RELEASE_VOTE'), fact('tallyReleased', true), fact('tallyYesCount', T), is('releaseUsed', true))],
  });
  add('REL', 2, 'A failed release vote uses up the one request of the match', {
    areas: ['voting', 'resources'], rules: ['R-VOTE-06', 'R-VOTE-05', 'R-FLOW-13'], lineage: ['BAL-101'],
    steps: [...releaseSetup, ...releaseVote, ...M.voters(T - 1).map(voter => cmd(voter, approve(true))), expire(),
      check(truth('Insider', 'jailed', true), fact('tallyReleased', false), is('releaseUsed', true)), phase(3, 'JAIL_VOTE'), check(count('releaseChoicePhases', 1))],
  });
  add('REL', 3, 'Declining, or not choosing, uses nothing and the choice returns next round', {
    areas: ['voting', 'resources'], rules: ['R-VOTE-05', 'R-FLOW-08'], lineage: ['BAL-101', 'BAL-107'],
    steps: [...releaseSetup, cmd('Cracker', choose(null)), untilPhase('JAIL_VOTE'), check(is('round', 2), is('releaseUsed', false), truth('Insider', 'jailed', true)),
      phase(3, 'RELEASE_CHOICE'), expire(), check(is('phase', 'JAIL_VOTE'), is('releaseUsed', false)), phase(4, 'RELEASE_CHOICE'), check(count('releaseChoicePhases', 3))],
  });
  add('REL', 4, 'A released player who is Injured goes to Hospital', {
    areas: ['voting', 'movement'], rules: ['R-STATE-07', 'R-VOTE-07', 'R-VOTE-10'], lineage: ['BAL-101'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...releaseSetup, check(truth('Insider', 'health', 'Injured'), truth('Insider', 'location', 'Jail')),
      ...releaseVote, ...M.voters(T).map(voter => cmd(voter, approve(true))), expire(), check(truth('Insider', 'jailed', false), truth('Insider', 'location', 'Hospital'), truth('Insider', 'health', 'Injured'))],
  });
  add('REL', 5, 'Without a Captain there is no release', {
    areas: ['voting'], rules: ['R-CAPT-10', 'R-VOTE-05', 'R-FLOW-13'], lineage: ['BAL-101'],
    steps: [...jail(1, 'Insider'), phase(3, 'JAIL_VOTE'), check(count('releaseChoicePhases', 0), count('captains', 0), truth('Insider', 'jailed', true))],
  });
  add('REL', 6, 'A released player can be voted back into Jail in the same round, and the one request is then gone', {
    areas: ['voting'], rules: ['R-VOTE-10', 'R-VOTE-02', 'R-VOTE-05', 'R-FLOW-03', 'R-FLOW-13'], lineage: ['BAL-101'],
    steps: [...releaseSetup, ...releaseVote, ...M.voters(T).map(voter => cmd(voter, approve(true))), expire(),
      check(is('phase', 'JAIL_VOTE'), is('round', 2), truth('Insider', 'jailed', false), factSet('eligibleTargets', all)),
      ...M.voters(T).map(voter => cmd(voter, vote('Insider'))), expire(),
      check(truth('Insider', 'jailed', true), truth('Insider', 'location', 'Jail'), truth('Cracker', 'captain', true), is('releaseUsed', true)),
      phase(3, 'JAIL_VOTE'), check(count('releaseChoicePhases', 1), truth('Insider', 'jailed', true))],
  });
  add('REL', 7, 'The release choice is offered only when the Captain can use it', {
    areas: ['voting', 'phase-transitions'], rules: ['R-FLOW-13', 'R-VOTE-05'], lineage: [],
    note: 'In Round 2 there is a Captain and nobody in Jail, so no choice is offered. In Round 3 there is a prisoner and the request is unused.',
    steps: [...elect('Cracker'), phase(2, 'JAIL_VOTE'), check(count('releaseChoicePhases', 0), count('captains', 1), count('jailed', 0)),
      ...M.voters(T).map(voter => cmd(voter, vote('Insider'))), phase(3, 'RELEASE_CHOICE'),
      check(count('releaseChoicePhases', 1), is('active', ref('Cracker')), factSet('eligibleTargets', ['Insider']), is('releaseUsed', false))],
  });
  add('FLOW', 10, 'Whether the release-choice window closes as soon as the Captain has chosen', {
    status: 'blocked', decisions: ['D17'], areas: ['timing', 'voting'], rules: ['R-FLOW-09'], kind: 'decision_boundary',
    steps: [...releaseSetup, cmd('Cracker', choose('Insider')), note('phase right after the Captain chose a prisoner', 'phase')],
  });

  // ----- Location lock (V1-06) -----------------------------------------------------------------
  add('LOCK', 1, 'A target who changes rooms after being targeted is still hit', {
    areas: ['resolution-order', 'movement'], rules: ['R-ACT-06'], lineage: ['BAL-104'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), cmd('Insider', move('Room B')), startOf(2), check(truth('Insider', 'health', 'Injured'))],
  });
  add('LOCK', 2, 'A target voted into Jail first is still hit', {
    areas: ['resolution-order', 'voting'], rules: ['R-ACT-06', 'R-RES-01', 'R-STATE-07'], lineage: ['BAL-104'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...jail(1, 'Insider'), expire(), check(truth('Insider', 'jailed', true), truth('Insider', 'health', 'Injured'), truth('Insider', 'location', 'Jail'))],
  });
  add('LOCK', 3, 'A Captain who walks into Command Room after being targeted is still hit', {
    areas: ['resolution-order', 'movement'], rules: ['R-ACT-06', 'R-CAPT-08', 'R-CAPT-07'], lineage: ['BAL-104'],
    note: 'Command Room protection is checked at registration only. See the audit, "Points where two sources pull apart".',
    steps: [...elect('Cracker'), cmd('Cracker', move('Room A')), turn(3, 'Blue Disabler'), cmd('Blue Disabler', disable('Cracker')), cmd('Cracker', move('Command Room')), check(truth('Cracker', 'location', 'Command Room')),
      startOf(4), check(truth('Cracker', 'health', 'Injured'), truth('Cracker', 'captain', false), truth('Cracker', 'location', 'Hospital'))],
  });
  add('LOCK', 4, 'An attacker who leaves the room after registering still hits', {
    areas: ['resolution-order', 'movement'], rules: ['R-ACT-06', 'R-ACT-05'], lineage: ['BAL-104'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), cmd('Blue Disabler', move('Room B')), startOf(2), check(truth('Insider', 'health', 'Injured'))],
  });

  // ----- Registered actions and resolution order -----------------------------------------------
  {
    // Effects resolve in turn order (R-RES-02). The attacked actor is the one whose turn comes later,
    // so that it is already Injured when its own attack resolves.
    const round = M.has('Red Disabler') ? 1 : 4;
    const [earlier, later] = M.byTurn(A, round, M.has('Red Disabler') ? ['Blue Disabler', 'Red Disabler'] : ['Blue Disabler', 'Undercover']);
    add('ORDER', 1, 'A registered action still resolves after its actor was Injured earlier in the same resolution', {
      areas: ['resolution-order'], rules: ['R-ACT-05', 'R-RES-02'], lineage: ['BAL-007'],
      steps: [...acts(round, { [earlier]: [attack(earlier, later)], [later]: [attack(later, 'Insider')] }), startOf(round + 1),
        check(truth(later, 'health', 'Injured'), truth('Insider', 'health', 'Injured'), count('injured', 2), count('eliminated', 0))],
    });
  }
  add('ORDER', 2, 'A registered action still resolves after its actor is voted into Jail', {
    areas: ['resolution-order', 'voting'], rules: ['R-ACT-05', 'R-RES-01'], lineage: ['BAL-007'],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...jail(1, 'Blue Disabler'), expire(), check(truth('Blue Disabler', 'jailed', true), truth('Insider', 'health', 'Injured'))],
  });
  {
    // Three attackers. The one whose turn comes last is attacked by the other two, so that it is
    // already Eliminated when its own attack resolves.
    const plan = mode === 9 ? { round: 1, before: [], trio: ['Blue Disabler', 'Red Disabler', 'Officer'] }
      : mode === 8 ? { round: 4, before: [], trio: ['Blue Disabler', 'Red Disabler', 'Undercover'] }
        : { round: 4, before: [turn(3, 'Supplier'), cmd('Supplier', supply('Cracker', 'Alien'))], trio: ['Blue Disabler', 'Undercover', 'Cracker'] };
    const [one, two, last] = M.byTurn(A, plan.round, plan.trio);
    add('ORDER', 3, 'A registered action still resolves after its actor was Eliminated earlier in the same resolution', {
      areas: ['resolution-order', 'elimination'], rules: ['R-ACT-05', 'R-RES-02'], lineage: ['BAL-007'],
      steps: [...plan.before, ...acts(plan.round, { [one]: [attack(one, last)], [two]: [attack(two, last)], [last]: [attack(last, 'Insider')] }), startOf(plan.round + 1),
        check(truth(last, 'health', 'Eliminated'), truth('Insider', 'health', 'Injured'), count('eliminated', 1), count('injured', 1))],
    });
  }
  {
    // Two draws of the turn order. The second is the first seed that puts the two attackers the
    // other way round in the round of the attacks.
    const round = M.has('Red Disabler') ? 2 : 4;
    const grant = M.has('Red Disabler') ? 1 : 3;
    const pair = M.has('Red Disabler') ? ['Blue Disabler', 'Red Disabler'] : ['Blue Disabler', 'Undercover'];
    const leader = setup => M.byTurn(setup, round, pair)[0];
    let reversed = null;
    for (let draw = 2; reversed === null; draw += 1) {
      if (draw > 50) throw new Error('no seed reverses the two attackers');
      const candidate = setupFromSeed(mode, `v1-A-${draw}`);
      if (leader(candidate) !== leader(A)) reversed = candidate;
    }
    for (const [suffix, setup] of [['a', A], ['b', reversed]]) {
      add('ORDER', 4, `Two attacks on a protected player end the same way whichever attacker's turn comes first (draw ${suffix})`, {
        areas: ['resolution-order'], rules: ['R-RES-04', 'R-RES-02', 'R-PROT-03'], lineage: ['BAL-105'], setup, suffix,
        note: `In this draw ${leader(setup)} takes the earlier turn.`,
        steps: [turn(grant, 'Undercover'), cmd('Undercover', protect('Insider')),
          ...acts(round, { [pair[0]]: [attack(pair[0], 'Insider')], [pair[1]]: [attack(pair[1], 'Insider')], Cracker: [cmd('Cracker', rescue('Supplier'))] }, setup), startOf(round + 1),
          check(truth('Insider', 'health', 'Injured'), truth('Insider', 'protection', 'consumed'), truth('Supplier', 'health', 'Healthy'), truth('Cracker', 'rescuesRemaining', 1), count('eliminated', 0), count('injured', 1))],
      });
    }
  }
  add('ORDER', 5, 'In Round 3 the attack resolves before the Rescue, and a Jail vote stops neither them nor Supplier\'s weapon', {
    areas: ['resolution-order'], rules: ['R-RES-01', 'R-ACT-06', 'R-ROLE-07'], lineage: ['BAL-104', 'BAL-105'],
    steps: [...acts(3, { Supplier: [cmd('Supplier', supply('Insider', 'Cracker'))], Cracker: [cmd('Cracker', rescue('Insider'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }), ...jail(3, 'Insider'), expire(),
      check(truth('Insider', 'jailed', true), truth('Insider', 'location', 'Jail'), truth('Insider', 'health', 'Healthy'), truth('Insider', 'ordinaryWeapons', 1), truth('Cracker', 'ordinaryWeapons', 1), truth('Cracker', 'rescuesRemaining', 1))],
  });

  // ----- Victory -------------------------------------------------------------------------------
  // Jailing Blue players lowers Blue Power by one each. `equal` reaches Blue Power = Red Power.
  const equal = mode === 8 ? ['Insider', 'Cracker'] : ['Insider', 'Cracker', 'Supplier'];
  const jailEach = list => list.flatMap((role, index) => jail(index + 1, role));
  add('WIN', 1, 'No result exists before the end of Round 5 when nobody is eliminated', {
    areas: ['victory', 'phase-transitions'], rules: ['R-WIN-09', 'R-WIN-04', 'R-WIN-07', 'R-VIEW-08'], lineage: ['BAL-019'],
    steps: [phase(5, 'JAIL_VOTE'), check(is('hasResult', false), fact('endRevealPresent', false)), expire(), check(is('phase', 'FINISHED'), is('winner', 'Blue'), is('alienCoWinner', true), fact('endRevealPresent', true))],
  });
  add('WIN', 2, 'Equal Power is not enough for Blue, so the showdown begins', {
    areas: ['victory', 'showdown'], rules: ['R-WIN-04', 'R-WIN-01', 'R-WIN-10', 'R-SHOW-01'], lineage: ['BAL-019'],
    steps: [...jailEach(equal), untilPhase('SHOWDOWN'), check(is('round', 5), is('hasResult', false), count('jailed', equal.length), count('showdownPhases', 1))],
  });
  add('WIN', 3, 'One point more Power than Red wins for Blue at the end of Round 5', {
    areas: ['victory'], rules: ['R-WIN-04', 'R-WIN-01', 'R-WIN-07'], lineage: ['BAL-019'],
    steps: [...jailEach(equal.slice(0, -1)), untilPhase('FINISHED'), check(is('winner', 'Blue'), is('alienCoWinner', true), count('showdownPhases', 0))],
  });
  add('WIN', 4, 'A Healthy Alien adds one to Blue Power, and a Jailed Alien adds nothing', {
    areas: ['victory'], rules: ['R-WIN-01', 'R-ROLE-16', 'R-WIN-10'], lineage: ['BAL-019'],
    steps: [...jailEach([...equal.slice(0, -1), 'Alien']), untilPhase('SHOWDOWN'), check(is('hasResult', false), truth('Alien', 'jailed', true), count('jailed', equal.length))],
  });
  add('WIN', 5, 'An Injured player counts zero Power', {
    areas: ['victory'], rules: ['R-WIN-01', 'R-STATE-03', 'R-WIN-10'], lineage: ['BAL-019'],
    steps: [...toEqualPower(M), untilPhase('SHOWDOWN'), check(is('hasResult', false), truth('Insider', 'health', 'Injured'), count('jailed', equal.length - 1), count('injured', 1))],
  });
  {
    // Every Blue player Healthy but Jailed, Alien free and Healthy, no Red player Healthy and free.
    const steps = mode === 7
      ? [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Hacker')), ...jail(1, 'Blue Disabler'), ...jail(2, 'Insider'), ...jail(3, 'Cracker'), ...jail(4, 'Supplier'), ...jail(5, 'Undercover')]
      : mode === 8
        ? [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Hacker')), ...jail(1, 'Blue Disabler'), ...jail(2, 'Insider'), turn(3, 'Supplier'), cmd('Supplier', supply('Alien', 'Cracker')), ...jail(3, 'Cracker'),
          turn(4, 'Alien'), cmd('Alien', shot('Red Disabler')), ...jail(4, 'Supplier'), ...jail(5, 'Undercover')]
        : [...acts(1, { 'Blue Disabler': [cmd('Blue Disabler', disable('Hacker'))], Officer: [cmd('Officer', shot('Undercover'))] }), ...jail(1, 'Blue Disabler'), ...jail(2, 'Officer'),
          turn(3, 'Supplier'), cmd('Supplier', supply('Alien', 'Cracker')), ...jail(3, 'Insider'), turn(4, 'Alien'), cmd('Alien', shot('Red Disabler')), ...jail(4, 'Supplier'), ...jail(5, 'Cracker')];
    add('WIN', 6, 'Blue wins on Power when its only Healthy players are Jailed', {
      areas: ['victory'], rules: ['R-WIN-11', 'R-WIN-04', 'R-WIN-01', 'R-WIN-07'], lineage: [],
      note: 'Blue Power is 1 from the free Alien and Red Power is 0. That a Healthy but Jailed Blue player satisfies R-WIN-02 is reading D14.',
      steps: [...steps, expire(), check(is('phase', 'FINISHED'), is('winner', 'Blue'), is('alienCoWinner', true), count('showdownPhases', 0), count('jailed', 5))],
    });
  }
  {
    const hit = doubleAttack(M, 'Alien');
    add('WIN', 8, 'When Blue wins and Alien has been Eliminated, Alien does not win', {
      areas: ['victory', 'elimination'], rules: ['R-WIN-07', 'R-WIN-04'], lineage: [],
      steps: [...hit.steps, untilPhase('FINISHED'), check(truth('Alien', 'health', 'Eliminated'), is('winner', 'Blue'), is('alienCoWinner', false))],
    });
  }
  add('WIN', 9, 'An Injured Alien still wins with Blue', {
    areas: ['victory'], rules: ['R-WIN-07', 'R-WIN-04'], lineage: [],
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Alien')), untilPhase('FINISHED'), check(truth('Alien', 'health', 'Injured'), is('winner', 'Blue'), is('alienCoWinner', true))],
  });
  add('WIN', 10, 'An Injured Alien adds no Power', {
    areas: ['victory'], rules: ['R-WIN-01', 'R-WIN-04', 'R-ROLE-16', 'R-WIN-10'], lineage: ['BAL-019'],
    note: 'One Blue player fewer is Jailed than in WIN-02. With a Healthy Alien that is a Blue win (WIN-03); with an Injured Alien the Powers are equal.',
    steps: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Alien')), ...jailEach(equal.slice(0, -1)), untilPhase('SHOWDOWN'),
      check(is('hasResult', false), truth('Alien', 'health', 'Injured'), count('jailed', equal.length - 1), count('injured', 1))],
  });
  add('WIN', 7, 'A match in which no victory can still be reached', { status: 'blocked', decisions: ['D15'], areas: ['victory', 'phase-transitions'], rules: ['R-WIN-12'], setup: null, kind: 'decision_boundary' });

  // ----- Final showdown ------------------------------------------------------------------------
  const showdown = [...toEqualPower(M), untilPhase('SHOWDOWN')];
  add('SHOW', 1, 'The showdown gathers every player left, Injured and Jailed included, and gives each one special shot', {
    areas: ['showdown', 'phase-transitions'], rules: ['R-SHOW-01', 'R-SHOW-02', 'R-SHOW-10', 'R-MOVE-06', 'R-FLOW-07', 'R-STATE-05'], lineage: ['BAL-019', 'BAL-020'],
    steps: [...showdown, check(count('finalZone', N), count('specialShots', N), truth('Insider', 'health', 'Injured'), truth('Insider', 'location', 'Final Zone'),
      truth('Cracker', 'jailed', true), truth('Cracker', 'location', 'Final Zone'), is('windowMs', 60_000), is('round', 5), count('showdownPhases', 1))],
  });
  if (M.has('Officer')) {
    add('SHOW', 2, 'An Officer who has fired the ordinary shot still receives the special shot', {
      areas: ['showdown', 'resources'], rules: ['R-SHOW-09', 'R-SHOW-02', 'R-ROLE-11'], lineage: ['BAL-020', 'BAL-005'],
      steps: [...toEqualPower(M, 'Officer'), untilPhase('SHOWDOWN'), check(truth('Officer', 'officerShotSpent', true), truth('Officer', 'specialShotAvailable', true)), cmd('Officer', special('Hacker')), check(truth('Officer', 'specialShotAvailable', false))],
    });
  }
  add('SHOW', 3, 'A special shot is registered in secret, once, and is spent at registration', {
    areas: ['showdown', 'authorized-views', 'resources'], rules: ['R-SHOW-04', 'R-SHOW-07', 'R-VIEW-07'], lineage: ['BAL-020', 'BAL-024'], kind: 'privacy',
    steps: [...showdown, mark('before-special'), cmd('Alien', special('Hacker')), check(onlyActorSaw('before-special', 'Alien'), truth('Alien', 'specialShotAvailable', false), truth('Hacker', 'health', 'Healthy')),
      cmd('Alien', special('Undercover'), 'NOT_ALLOWED')],
  });
  {
    // Special shots resolve in the Round 5 turn order. The last shooter of that order is shot by
    // the first two, so it is Eliminated before its own shot resolves.
    const order = M.orderOf(A, 5);
    const [one, two] = order;
    const last = order.at(-1);
    const bystander = all.find(role => role !== 'Insider' && ![one, two, last].includes(role));
    add('SHOW', 4, 'A special shot resolves even when its shooter was eliminated earlier in the order', {
      areas: ['showdown', 'resolution-order', 'elimination'], rules: ['R-SHOW-05', 'R-SHOW-08'], lineage: ['BAL-021', 'BAL-023'],
      note: 'The winner is not asserted: who the four players are follows the recorded turn order.',
      steps: [...showdown, cmd(one, special(last)), cmd(two, special(last)), cmd(last, special(bystander)), expire(),
        check(truth(last, 'health', 'Eliminated'), truth(bystander, 'health', 'Injured'), count('eliminated', 1), is('phase', 'FINISHED'))],
    });
  }
  add('SHOW', 5, 'In the Final Zone a Captain has no room protection, and an active Protection blocks one special shot', {
    areas: ['showdown', 'resources'], rules: ['R-SHOW-03', 'R-SHOW-06', 'R-SHOW-08', 'R-CAPT-07', 'R-PROT-03'], lineage: ['BAL-022'],
    steps: [...acts(1, { Undercover: [cmd('Undercover', protect('Blue Disabler'))], 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))] }), ...jail(1, 'Cracker'), ...elect('Blue Disabler'),
      ...(mode === 8 ? [] : jail(2, 'Supplier')), untilPhase('SHOWDOWN'),
      check(truth('Blue Disabler', 'captain', true), truth('Blue Disabler', 'location', 'Final Zone'), truth('Blue Disabler', 'protection', 'active')),
      cmd('Hacker', special('Blue Disabler')), cmd('Undercover', special('Blue Disabler')), expire(),
      check(truth('Blue Disabler', 'health', 'Injured'), truth('Blue Disabler', 'protection', 'consumed'), truth('Blue Disabler', 'captain', false), is('winner', 'Draw'))],
  });
  add('SHOW', 6, 'A special shot at a player who is already Eliminated does nothing and is not given back', {
    areas: ['showdown', 'elimination', 'resources'], rules: ['R-SHOW-07', 'R-SHOW-08'], lineage: ['BAL-107'],
    steps: [...showdown, cmd('Hacker', special('Insider')), cmd('Undercover', special('Insider')), expire(),
      check(truth('Insider', 'health', 'Eliminated'), count('eliminated', 1), count('injured', 0), truth('Undercover', 'specialShotAvailable', false), truth('Hacker', 'specialShotAvailable', false), is('winner', 'Draw'))],
  });
  add('SHOW', 7, 'Nobody shoots: nothing changes, the match is a Draw and roles and the Code are revealed', {
    areas: ['showdown', 'victory', 'authorized-views'], rules: ['R-SHOW-04', 'R-SHOW-08', 'R-VIEW-08', 'R-FLOW-08'], lineage: ['BAL-023', 'BAL-107'],
    steps: [...showdown, check(fact('endRevealPresent', false)), expire(),
      check(is('phase', 'FINISHED'), is('terminal', true), is('winner', 'Draw'), is('alienCoWinner', false), count('eliminated', 0), count('showdownPhases', 1), fact('endRevealPresent', true)),
      cmd('Alien', special('Hacker'), 'PHASE_CLOSED')],
  });
  add('SHOW', 8, 'After the showdown Power is compared again and Blue can win on it', {
    areas: ['showdown', 'victory'], rules: ['R-SHOW-08', 'R-WIN-04', 'R-WIN-07'], lineage: ['BAL-023'],
    steps: [...showdown, cmd('Blue Disabler', special('Hacker')), expire(), check(truth('Hacker', 'health', 'Injured'), is('winner', 'Blue'), is('alienCoWinner', true), count('eliminated', 0))],
  });
  {
    // Every Red player eliminated in the showdown by non-Red shooters, with a Healthy free Blue left.
    const plan = mode === 7
      ? { before: toEqualPower(M), shots: [['Insider', 'Undercover'], ['Cracker', 'Undercover'], ['Supplier', 'Hacker'], ['Blue Disabler', 'Hacker']] }
      : mode === 8
        ? { before: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Hacker')), ...jailEach(['Insider', 'Cracker', 'Supplier'])],
          shots: [['Insider', 'Hacker'], ['Cracker', 'Undercover'], ['Supplier', 'Undercover'], ['Blue Disabler', 'Red Disabler'], ['Alien', 'Red Disabler']] }
        : { before: [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Hacker')), ...jailEach(['Insider', 'Cracker', 'Supplier', 'Officer'])],
          shots: [['Insider', 'Hacker'], ['Cracker', 'Undercover'], ['Supplier', 'Undercover'], ['Officer', 'Red Disabler'], ['Alien', 'Red Disabler']] };
    const reds = all.filter(role => factionOf(role) === 'Red');
    add('SHOW', 9, 'Blue wins the showdown by eliminating every Red player', {
      areas: ['showdown', 'victory', 'elimination'], rules: ['R-WIN-03', 'R-SHOW-08', 'R-WIN-07', 'R-VIEW-03', 'R-RES-05'], lineage: ['BAL-023'],
      steps: [...plan.before, untilPhase('SHOWDOWN'), check(is('hasResult', false)), ...plan.shots.map(([shooter, target]) => cmd(shooter, special(target))), expire(),
        check(...reds.map(role => truth(role, 'health', 'Eliminated')), ...reds.map(role => pub(role, 'revealedFaction', 'Red')), truth('Blue Disabler', 'health', 'Healthy'), truth('Blue Disabler', 'jailed', false),
          is('winner', 'Blue'), is('alienCoWinner', true))],
    });
    add('SHOW', 16, 'Blue wins by elimination when its only Healthy players are Jailed', {
      areas: ['showdown', 'victory'], rules: ['R-WIN-11', 'R-WIN-03', 'R-SHOW-05', 'R-SHOW-08', 'R-WIN-07'], lineage: ['BAL-023'],
      note: 'The shots of SHOW-09 and one more, at the only Blue player who is Healthy and free. That the Jailed Healthy Blue players satisfy R-WIN-02 is reading D14.',
      steps: [...plan.before, untilPhase('SHOWDOWN'), ...plan.shots.map(([shooter, target]) => cmd(shooter, special(target))), cmd(reds[0], special('Blue Disabler')), expire(),
        check(...reds.map(role => truth(role, 'health', 'Eliminated')), truth('Blue Disabler', 'health', 'Injured'), truth('Cracker', 'health', 'Healthy'), truth('Cracker', 'jailed', true),
          is('winner', 'Blue'), is('alienCoWinner', true))],
    });
  }
  {
    // Every Red player is Eliminated by the shooters who come first in the Round 5 order, and the
    // shooters after them injure every Blue player who was still Healthy. A victory check between
    // two shots would find a Blue win. The check after the whole stage finds no Healthy Blue player.
    const before = mode === 7 ? toEqualPower(M)
      : [...acts(1, { 'Blue Disabler': [cmd('Blue Disabler', disable('Hacker'))], 'Red Disabler': [cmd('Red Disabler', disable('Insider'))] }),
        ...jailEach(mode === 8 ? ['Cracker', 'Supplier'] : ['Cracker', 'Supplier', 'Officer'])];
    const atRed = mode === 7 ? ['Undercover', 'Undercover', 'Hacker', 'Hacker'] : ['Hacker', 'Undercover', 'Undercover', 'Red Disabler', 'Red Disabler'];
    const atBlue = ['Blue Disabler', 'Cracker', 'Supplier', ...(mode === 9 ? ['Officer'] : [])];
    const order = M.orderOf(A, 5);
    const shots = [...allot(order.slice(0, atRed.length), atRed), ...allot(order.slice(atRed.length), atBlue)];
    const reds = all.filter(role => factionOf(role) === 'Red');
    const blues = all.filter(role => factionOf(role) === 'Blue');
    add('SHOW', 10, 'Victory is judged only after every special shot: a Blue win that exists between two shots is gone at the end', {
      areas: ['showdown', 'victory', 'resolution-order'], rules: ['R-RES-03', 'R-SHOW-05', 'R-SHOW-08', 'R-WIN-02', 'R-WIN-03'], lineage: ['BAL-023'],
      note: 'No Blue player is Healthy at the end, Jailed or free, so the result does not depend on reading D14.',
      steps: [...before, untilPhase('SHOWDOWN'), check(is('hasResult', false), truth('Blue Disabler', 'health', 'Healthy')), ...shots.map(([shooter, target]) => cmd(shooter, special(target))), expire(),
        check(...reds.map(role => truth(role, 'health', 'Eliminated')), ...blues.map(role => truth(role, 'health', 'Injured')), truth('Alien', 'health', 'Healthy'), count('eliminated', reds.length),
          is('phase', 'FINISHED'), is('winner', 'Draw'), is('alienCoWinner', false))],
    });
  }
  add('SHOW', 11, 'A Protection granted in Round 5 does not block a special shot', {
    areas: ['showdown', 'resources'], rules: ['R-PROT-07', 'R-PROT-02', 'R-SHOW-06', 'R-SHOW-08', 'R-WIN-04', 'R-WIN-01'], lineage: ['BAL-022'],
    steps: [...toEqualPower(M), turn(5, 'Undercover'), cmd('Undercover', protect('Hacker')), untilPhase('SHOWDOWN'), check(truth('Hacker', 'protection', 'pending')),
      cmd('Blue Disabler', special('Hacker')), expire(), check(truth('Hacker', 'health', 'Injured'), truth('Hacker', 'protection', 'pending'), is('winner', 'Blue'))],
  });
  add('SHOW', 12, 'The Code cannot be submitted during the showdown', {
    areas: ['showdown', 'resources'], rules: ['R-ROLE-15'], lineage: ['BAL-106'],
    steps: [...showdown, check(sees('Hacker', 'codeAttemptAvailable', false)), cmd('Hacker', submit(M.code), 'NOT_ALLOWED'), check(is('codeSubmitted', false))],
  });

  {
    // Every Blue player eliminated in the showdown. Insider enters it Injured; nobody targets themself.
    const shots = mode === 7
      ? [['Hacker', 'Cracker'], ['Undercover', 'Cracker'], ['Alien', 'Supplier'], ['Insider', 'Supplier'], ['Cracker', 'Blue Disabler'], ['Supplier', 'Blue Disabler'], ['Blue Disabler', 'Insider']]
      : mode === 8
        ? [['Hacker', 'Cracker'], ['Undercover', 'Cracker'], ['Red Disabler', 'Supplier'], ['Alien', 'Supplier'], ['Cracker', 'Blue Disabler'], ['Supplier', 'Blue Disabler'], ['Blue Disabler', 'Insider']]
        : [['Hacker', 'Cracker'], ['Undercover', 'Cracker'], ['Red Disabler', 'Supplier'], ['Alien', 'Supplier'], ['Cracker', 'Blue Disabler'], ['Supplier', 'Blue Disabler'], ['Blue Disabler', 'Officer'], ['Insider', 'Officer'], ['Officer', 'Insider']];
    const blues = all.filter(role => factionOf(role) === 'Blue');
    add('SHOW', 13, 'Red wins the showdown by eliminating every Blue player, and Alien does not win', {
      areas: ['showdown', 'victory', 'elimination'], rules: ['R-WIN-05', 'R-WIN-07', 'R-SHOW-08', 'R-SHOW-05'], lineage: ['BAL-023'],
      steps: [...showdown, ...shots.map(([shooter, target]) => cmd(shooter, special(target))), expire(),
        check(...blues.map(role => truth(role, 'health', 'Eliminated')), is('winner', 'Red'), is('alienCoWinner', false), count('eliminated', blues.length))],
    });
  }
  {
    // One player eliminated before the showdown, then equal Power.
    const hit = doubleAttack(M, 'Insider');
    const jailed = mode === 8 ? ['Cracker'] : ['Cracker', 'Supplier'];
    // The eliminated player casts no ballot, so the Jail votes are carried by the others.
    const votes = jailed.flatMap((role, index) => jail(index + 1, role, T, ['Insider']));
    const before = hit.round === 1 ? [...hit.steps, ...votes] : [...votes, ...hit.steps];
    add('SHOW', 14, 'A player eliminated before the showdown is not moved to it and receives no special shot', {
      areas: ['showdown', 'elimination'], rules: ['R-SHOW-02', 'R-FLOW-11'], lineage: ['BAL-020'],
      steps: [...before, untilPhase('SHOWDOWN'), check(truth('Insider', 'health', 'Eliminated'), truth('Insider', 'specialShotAvailable', false), count('finalZone', N - 1), count('specialShots', N - 1)),
        cmd('Insider', special('Hacker'), 'NOT_ALLOWED')],
    });
  }
  add('SHOW', 15, 'A special shot aimed at the shooter', {
    status: 'blocked', decisions: ['D34'], areas: ['showdown', 'resources'], rules: ['R-SHOW-11'], kind: 'decision_boundary',
    steps: [...showdown, probe('Alien', special('Alien'), 'SHOWDOWN_SHOT naming the shooter')],
  });

  // ----- Authorized views ----------------------------------------------------------------------
  add('VIEW', 1, 'A refused command changes nothing that anyone can see', {
    areas: ['authorized-views'], rules: ['R-ACT-09', 'R-VIEW-07'], lineage: ['BAL-024'], kind: 'privacy',
    steps: [turn(1, 'Undercover'), mark('before-refusals'), cmd('Undercover', shot('Insider'), 'NOT_ALLOWED'), cmd('Insider', disable('Cracker'), 'NOT_ALLOWED'), cmd('Alien', submit(M.code), 'NOT_ALLOWED'),
      cmd('Cracker', move('Command Room'), 'NOT_ALLOWED'), check(unchanged('before-refusals', 'public'), unchanged('before-refusals', 'all-players'))],
  });
  {
    const hit = doubleAttack(M, 'Alien');
    add('VIEW', 2, 'An Eliminated Alien is revealed as Alien, and nothing else is revealed', {
      areas: ['authorized-views', 'elimination'], rules: ['R-VIEW-03', 'R-RES-05', 'R-VIEW-02'], lineage: ['BAL-024'], kind: 'privacy',
      steps: [...hit.steps, phase(hit.round, 'JAIL_VOTE'), expire(), check(pub('Alien', 'revealedFaction', 'Alien'), ...all.filter(role => role !== 'Alien').map(role => pub(role, 'revealedFaction', null)), fact('endRevealPresent', false))],
    });
  }
  {
    const [one, two] = M.orderOf(A, 1);
    add('VIEW', 3, 'The round, the phase and whose turn it is are public', {
      areas: ['authorized-views', 'phase-transitions'], rules: ['R-VIEW-09', 'R-FLOW-02'], lineage: [],
      steps: [check(fact('round', 1), fact('phase', 'ORDINARY_TURN'), fact('active', ref(one))), expire(), check(fact('phase', 'ORDINARY_TURN'), fact('active', ref(two))),
        phase(1, 'JAIL_VOTE'), check(fact('round', 1), fact('phase', 'JAIL_VOTE')), untilPhase('CAPTAIN_ELECTION'), check(fact('phase', 'CAPTAIN_ELECTION')),
        phase(2, 'ORDINARY_TURN'), check(fact('round', 2), fact('active', ref(first(2))))],
    });
  }

  // ----- Operating policy ----------------------------------------------------------------------
  add('OPS', 1, 'A host abort ends the match without a winner', {
    areas: ['operating-policy', 'phase-transitions'], rules: ['R-OPS-02'], lineage: ['BAL-108'],
    steps: [turn(1, first(1)), { op: 'abort' }, check(is('phase', 'ABORTED'), is('terminal', true), is('hasResult', false)), cmd('Insider', move('Room B'), 'PHASE_CLOSED')],
  });
  add('OPS', 3, 'What an aborted match reveals', {
    status: 'blocked', decisions: ['D35'], areas: ['operating-policy', 'authorized-views'], rules: ['R-VIEW-10'], kind: 'decision_boundary',
    steps: [turn(1, first(1)), { op: 'abort' }, note('roles and the Code public after a host abort', 'endRevealPresent')],
  });
  add('OPS', 2, 'Disconnect, reconnect, retry and seat recovery keep the same seat, role and resources', {
    status: 'manual', areas: ['operating-policy'], rules: ['R-OPS-01', 'R-OPS-03'], lineage: ['BAL-108', 'BAL-025'], setup: null, kind: 'technical_contract',
    note: 'Service behaviour. Backend owns the transaction, scheduler and recovery tests; replay determinism is checked here for every executed scenario.',
  });

  // ----- Original Powers -----------------------------------------------------------------------
  add('POW', 1, 'Original Powers with seven or nine players, and with special shots', { status: 'blocked', decisions: ['D10'], areas: ['resources'], rules: ['R-POW-02'], lineage: ['BAL-110'], setup: null, kind: 'decision_boundary' });

  return M.scenarios;
}

// ---------------------------------------------------------------------------------------------
// Configurations the rules do not allow. They belong to no mode.
function unsupported() {
  const scenarios = [];
  const seven = setupFromSeed(7, 'v1-A-1');
  const eight = setupFromSeed(8, 'v1-A-1');
  const add = (number, title, rules, setup) => {
    scenarios.push({
      id: `V1-UX-SETUP-${String(number).padStart(2, '0')}`, group: 'unsupported', mode: null, title, status: 'ready', kind: 'setup_refusal',
      areas: ['mode-setup'], ruleRefs: rules, dependsOn: [], lineage: ['BAL-001'], decisionIds: [], optionalPowers: false, setup, steps: [{ op: 'createRejected' }], note: '',
    });
  };
  const seats = howMany => seatIdsFor(howMany);
  const rooms = howMany => Object.fromEntries(seats(howMany).map(seat => [seat, 'Room A']));
  const orders = howMany => Array.from({ length: 5 }, () => seats(howMany));
  add(1, 'A six-player match cannot be created', ['R-SETUP-01'], {
    seed: 'invalid-six-players', playerCount: 6, roleOrder: ['Hacker', 'Supplier', 'Alien', 'Undercover', 'Insider', 'Cracker'],
    initialRooms: rooms(6), codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-5'], roundOrders: orders(6),
  });
  add(2, 'A ten-player match cannot be created', ['R-SETUP-01'], {
    seed: 'invalid-ten-players', playerCount: 10, roleOrder: [...ROLES_BY_MODE[9], 'Insider'],
    initialRooms: rooms(10), codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'], roundOrders: orders(10),
  });
  add(3, 'Officer cannot be dealt in a seven-player match', ['R-SETUP-04', 'R-SETUP-02'], { ...seven, seed: 'invalid-officer-at-seven', roleOrder: seven.roleOrder.map(role => (role === 'Supplier' ? 'Officer' : role)) });
  add(4, 'An eight-player match cannot be dealt without Red Disabler', ['R-SETUP-03', 'R-SETUP-05'], { ...eight, seed: 'invalid-duplicate-role', roleOrder: eight.roleOrder.map(role => (role === 'Red Disabler' ? 'Insider' : role)) });
  const seatOf = role => seats(7)[seven.roleOrder.indexOf(role)];
  const spare = seats(7).filter(seat => seat !== seatOf('Alien') && seat !== seatOf('Undercover'));
  add(5, 'A Code that contains Undercover cannot be dealt', ['R-SETUP-08'], { ...seven, seed: 'invalid-code-with-undercover', codeExtraSeatIds: [seatOf('Undercover'), spare[0], spare[1]] });
  add(6, 'A Code with fewer than four different numbers cannot be dealt', ['R-SETUP-08'], { ...seven, seed: 'invalid-code-duplicate', codeExtraSeatIds: [seatOf('Alien'), spare[0], spare[1]] });
  add(7, 'A player cannot start outside Room A and Room B', ['R-SETUP-07'], { ...seven, seed: 'invalid-starting-room', initialRooms: { ...seven.initialRooms, 'seat-1': 'Hospital' } });
  add(8, 'A turn order that leaves a player out cannot be recorded', ['R-FLOW-02', 'R-FLOW-04'], { ...seven, seed: 'invalid-turn-order', roundOrders: seven.roundOrders.map((order, index) => (index === 2 ? order.slice(1) : order)) });
  return scenarios;
}

export function buildCatalog() {
  return { 7: build(7), 8: build(8), 9: build(9), unsupported: unsupported() };
}

export const CATALOG_FILES = { 7: 'mode-7.scenarios.json', 8: 'mode-8.scenarios.json', 9: 'mode-9.scenarios.json', unsupported: 'unsupported.scenarios.json' };
