// Authoring source of the room-capacity fixtures (issue #96).
//
// The rule is the game owner's decision of 11 October 2026: at most five players are in Room A,
// Room B, Hospital and Jail at any time. It is recorded in issue #96 and in
// docs/design/owner-decisions.md of Designer's PR #88. Every expectation here is derived by hand
// from that decision and from docs/balance/game-rules.md, and names the rows it rests on; the
// R-CAP rows are in docs/balance/capacity-audit.md. Nothing is copied from an engine's output. The
// cases were written before Backend's implementation was read (commit ce4d9d0 of this branch holds
// them as they then stood). Three questions were open then. Backend's record of the owner's
// further decisions, docs/decisions/2026-10-11-room-capacity.md at b0ab779, answers two of them,
// and cases 24 and 26 were changed from blocked to ready on that record and say so. A case that
// needs a question still open is `blocked`: it asserts nothing and records what an engine does.
//
// An independent review of commit 8eb5cef then found what the cases had missed, and cases 28, 29
// and 35 to 43 answer it: a Captain who is hit after entering Command Room; whether a waiting
// player is ever admitted; an Eliminated player's place against a return; a full room outside the
// ordinary turns. The nine-player Hospital cases were rebuilt so that the patient with the highest
// number is the one healed and the one who must keep a place, which the first construction could
// not tell from other orders.
//
// On 11 October 2026 the owner then decided the three questions that were open (CAP-D2, CAP-D4,
// CAP-D5) and when starting rooms are drawn. Cases 25, 27, 42 and 43 had been blocked and are ready;
// case 45 is new. The implementation of PR #98 was written before those decisions. Case 44 is
// blocked on a question they raise (CAP-D6).
//
// These fixtures are a suite of their own beside tests/scenarios/v1/. They run under the ruleset
// that carries the rule. The Version 1 catalogue is left as reviewed and runs under the rulesets
// it was written for, where every player may start in one room. The three modes are separate
// files and must never be pooled. Optional Original Powers are off in every case.
import { ROLES_BY_MODE, ROOM_CAPACITY, jailThreshold, roomsWithinCapacity, seatIdsFor } from '@mothership/balance';
import { setupFromSeed } from '../v1/catalog.mjs';

// ---------------------------------------------------------------------------------------------
// Starting layouts. Each names who starts in Room B; everyone else starts in Room A. Roles, the
// Code and the five turn orders are those of the Version 1 setup `v1-A-1`, so that a case here
// differs from a Version 1 case in where players start and in nothing else.
const without = (mode, roles) => ROLES_BY_MODE[mode].filter(role => !roles.includes(role));
const FIVE = ['Blue Disabler', 'Insider', 'Supplier', 'Undercover', 'Hacker'];
const LAYOUTS = {
  // Room B is full. Room A holds Cracker and Alien, with Red Disabler and Officer where they play.
  b5: () => FIVE,
  // The same with the rooms exchanged: Room A is full.
  a5: mode => without(mode, FIVE),
  // Room B has one place left. Room A holds three, four or five players.
  b4: () => ['Blue Disabler', 'Supplier', 'Undercover', 'Cracker'],
  // Room B is full and holds nobody who can attack in Round 1. Blue Disabler is outside it.
  refuge: () => ['Insider', 'Cracker', 'Supplier', 'Undercover', 'Hacker'],
  // Room B is full and holds two attackers and their target: both Disablers, or with seven
  // players Blue Disabler and Undercover.
  fight: mode => ['Blue Disabler', mode === 7 ? 'Undercover' : 'Red Disabler', 'Insider', 'Cracker', 'Supplier'],
  // Laid out so that every damage the mode has can fall on a different player.
  ward: mode => (mode === 7 ? ['Blue Disabler', 'Supplier', 'Insider', 'Alien', 'Hacker']
    : mode === 8 ? ['Blue Disabler', 'Red Disabler', 'Supplier', 'Insider', 'Alien']
      : ['Officer', 'Hacker', 'Undercover', 'Cracker']),
  // Not a legal start under the rule: six players in one room.
  a6: mode => ROLES_BY_MODE[mode].slice(6),
  b6: mode => ROLES_BY_MODE[mode].slice(0, 6),
};

/** Seed labels read cap-<layout>. The label reproduces the setup. */
export function setupFromLabel(mode, seed) {
  const layout = LAYOUTS[seed.replace(/^cap-/, '')];
  if (!seed.startsWith('cap-') || layout === undefined) throw new Error(`Unknown capacity layout in seed ${seed}`);
  const base = setupFromSeed(mode, 'v1-A-1');
  const inB = layout(mode);
  const initialRooms = Object.fromEntries(seatIdsFor(mode).map((seat, index) => [seat, inB.includes(base.roleOrder[index]) ? 'Room B' : 'Room A']));
  return { ...base, seed, initialRooms };
}

// ---------------------------------------------------------------------------------------------
// Step and check builders, as in the Version 1 catalogue.
const ref = role => `@${role}`;
const turn = (round, role) => ({ op: 'until', round, phase: 'ORDINARY_TURN', active: ref(role) });
const phase = (round, kind) => ({ op: 'until', round, phase: kind });
const untilPhase = kind => ({ op: 'until', phase: kind });
// The first ordinary turn of a round. An election between two rounds is let pass.
const open = round => phase(round, 'ORDINARY_TURN');
const expire = (times = 1) => ({ op: 'expire', times });
const cmd = (actor, command, expect = 'REGISTERED', at) => ({ op: 'command', actor: ref(actor), command, expect, ...(at ? { at } : {}) });
const mark = name => ({ op: 'mark', name });
const check = (...checks) => ({ op: 'assert', checks });
const note = (label, field) => ({ op: 'note', label, match: field });
const noteOf = (label, role, field) => ({ op: 'note', label, truth: ref(role), field });

const shot = target => ({ type: 'REGISTER_SHOT', target: ref(target) });
const disable = target => ({ type: 'DISABLE', target: ref(target) });
const rescue = target => ({ type: 'RESCUE', target: ref(target) });
const hack = target => ({ type: 'REQUEST_HACK', target: ref(target) });
const supply = (first, second) => ({ type: 'SUPPLY', targets: [ref(first), ref(second)] });
const vote = target => ({ type: 'VOTE', target: ref(target) });
const move = destination => ({ type: 'MOVE', destination });
const choose = target => ({ type: 'RELEASE_CHOICE', target: ref(target) });
const approve = value => ({ type: 'RELEASE_VOTE', approve: value });

const truth = (role, field, equals) => ({ truth: ref(role), field, equals });
const pub = (role, field, equals) => ({ public: ref(role), field, equals });
const is = (field, equals) => ({ match: field, equals });
const sees = (role, field, equals) => ({ visible: ref(role), field, equals });
const seesSet = (role, field, roles) => ({ visible: ref(role), field, sameSet: roles.map(ref) });
const count = (name, equals) => ({ count: name, equals });
const factSet = (name, roles) => ({ publicFact: name, sameSet: roles.map(ref) });
const holds = (location, equals) => count(`occupants:${location}`, equals);
// The table and every player: nobody was shown anything new.
const nobodySaw = since => ({ unchanged: { since, audiences: { allPlayersExcept: [] } } });

const MANUAL_NOTE = 'Not an engine run. The engine binding of this suite reaches the pure engine only; this needs the service, a device or people.';

function build(mode) {
  const roles = ROLES_BY_MODE[mode];
  const N = mode;
  const T = jailThreshold(mode);
  const has = role => roles.includes(role);
  const base = setupFromSeed(mode, 'v1-A-1');
  const setups = {};
  const setup = name => (setups[name] ??= setupFromLabel(mode, `cap-${name}`));
  const startsIn = (name, role) => setup(name).initialRooms[seatIdsFor(mode)[base.roleOrder.indexOf(role)]];
  const inRoom = (name, room) => roles.filter(role => startsIn(name, role) === room);
  const orderOf = round => base.roundOrders[round - 1].map(seat => base.roleOrder[Number(seat.slice(5)) - 1]);
  // Steps taken by several players on their own turns, in that round's turn order.
  const acts = (round, map) => [...Object.keys(map)].sort((left, right) => orderOf(round).indexOf(left) - orderOf(round).indexOf(right))
    .flatMap(role => [turn(round, role), ...map[role]]);
  const voters = (exclude = []) => roles.filter(role => !exclude.includes(role)).slice(0, T);
  const jail = (round, target, exclude = []) => [phase(round, 'JAIL_VOTE'), ...voters(exclude).map(voter => cmd(voter, vote(target)))];
  const elect = role => [untilPhase('CAPTAIN_ELECTION'), cmd(role, vote(role)), expire()];
  // The Captain asks for a prisoner's release in that round and the vote passes. It ends in the Jail vote.
  const release = (round, captain, prisoner, exclude = []) => [phase(round, 'RELEASE_CHOICE'), cmd(captain, choose(prisoner)), untilPhase('RELEASE_VOTE'),
    ...voters(exclude).map(voter => cmd(voter, approve(true))), expire()];

  const scenarios = [];
  const add = (number, title, options) => {
    const start = options.setup === undefined ? setup('b5') : options.setup;
    if (start !== null && !options.illegalStart && !roomsWithinCapacity(start.initialRooms)) throw new Error(`CAP-${number}: the starting layout puts more than ${ROOM_CAPACITY} players in a room`);
    scenarios.push({
      id: `V1-M${mode}-CAP-${String(number).padStart(2, '0')}`, group: `mode-${mode}`, mode, title,
      status: options.status ?? 'ready', kind: options.kind ?? 'rules_correctness', areas: options.areas,
      ruleRefs: options.rules, dependsOn: (options.depends ?? []).filter(id => !options.rules.includes(id)).sort(), lineage: [],
      decisionIds: options.decisions ?? [], optionalPowers: false, setup: start, steps: options.steps ?? [], note: options.note ?? '',
    });
  };

  // ----- Starting rooms --------------------------------------------------------------------------
  for (const [number, name, full] of [[1, 'b5', 'Room B'], [2, 'a5', 'Room A']]) {
    const other = full === 'Room A' ? 'Room B' : 'Room A';
    add(number, `A match starts with five players in ${full} and the other ${N - 5} in ${other}`, {
      areas: ['mode-setup', 'movement'], rules: ['R-CAP-01', 'R-CAP-06'], depends: ['R-SETUP-05'], setup: setup(name),
      note: `The fullest start the rule allows with ${N} players${N === 9 ? ', and with nine the only split there is' : ''}. The engine takes recorded rooms; drawing them is the service's work (CAP-30).`,
      steps: [check(holds(full, 5), holds(other, N - 5), holds('Hospital', 0), holds('Jail', 0), holds('Command Room', 0),
        ...roles.map(role => pub(role, 'location', startsIn(name, role))), is('round', 1), is('phase', 'ORDINARY_TURN'))],
    });
  }
  for (const [number, name, room] of [[3, 'a6', 'Room A'], [4, 'b6', 'Room B']]) {
    add(number, `A match does not start with six players in ${room}`, {
      areas: ['mode-setup'], rules: ['R-CAP-16', 'R-CAP-01', 'R-CAP-06'], setup: setup(name), illegalStart: true,
      note: 'The rule holds at any time, the first moment included, so no match under it begins with six players in a room. That the engine refuses such a start is how that is checked here; the six decided cases do not say which part of the system has to refuse.',
      steps: [{ op: 'createRejected' }],
    });
  }

  // ----- Movement --------------------------------------------------------------------------------
  const outside = inRoom('b5', 'Room A');
  add(5, 'A full room is offered to nobody; the other room is offered as before', {
    areas: ['movement', 'authorized-views'], rules: ['R-CAP-02'], depends: ['R-MOVE-01', 'R-MOVE-03'],
    note: `Room B holds five. With ${N} players Room A holds ${N - 5}, so it has a place for anyone from Room B.`,
    steps: [check(holds('Room B', 5), ...outside.map(role => sees(role, 'moveDestinations', [])), ...FIVE.map(role => sees(role, 'moveDestinations', ['Room A'])))],
  });
  add(6, 'A move into a full room is refused, shows nobody anything and does not use the round\'s move', {
    areas: ['movement', 'authorized-views'], rules: ['R-CAP-02', 'R-CAP-08'], depends: ['R-ACT-09'],
    steps: [mark('before'), cmd('Alien', move('Room B'), 'REFUSED'),
      check(nobodySaw('before'), truth('Alien', 'location', 'Room A'), truth('Alien', 'movedThisRound', false), holds('Room B', 5), holds('Room A', N - 5))],
  });
  add(7, 'A place that a player leaves can be taken at once, also by a player who was refused before', {
    areas: ['movement'], rules: ['R-CAP-10', 'R-CAP-02', 'R-CAP-08'], depends: ['R-MOVE-01', 'R-MOVE-07'],
    note: N === 9 ? 'With nine players the one free place changes rooms with every move: after Hacker\'s move Room A is the full room, until Alien leaves it.' : '',
    steps: [cmd('Alien', move('Room B'), 'REFUSED'), cmd('Hacker', move('Room A')), check(holds('Room B', 4), sees('Alien', 'moveDestinations', ['Room B'])),
      cmd('Alien', move('Room B')), check(truth('Alien', 'location', 'Room B'), pub('Alien', 'location', 'Room B'), holds('Room B', 5), holds('Room A', N - 5), sees('Cracker', 'moveDestinations', [])),
      cmd('Cracker', move('Room B'), 'REFUSED'), check(truth('Cracker', 'location', 'Room A'))],
  });
  add(8, 'Of two moves for the last place, the first to arrive is accepted and the second is refused', {
    areas: ['movement', 'resolution-order'], rules: ['R-CAP-09', 'R-CAP-02', 'R-CAP-08'], depends: ['R-MOVE-01', 'R-MOVE-07'], setup: setup('b4'),
    note: `Room B holds four and Room A ${N - 4}. The two moves are sent one after the other, Insider's first. That the service keeps the order in which two phones' moves arrive is CAP-32.`,
    steps: [check(holds('Room B', 4), sees('Insider', 'moveDestinations', ['Room B']), sees('Alien', 'moveDestinations', ['Room B'])),
      cmd('Insider', move('Room B'), 'REGISTERED', 'start'), cmd('Alien', move('Room B'), 'REFUSED', 'start'),
      check(truth('Insider', 'location', 'Room B'), truth('Alien', 'location', 'Room A'), truth('Alien', 'movedThisRound', false), holds('Room B', 5), holds('Room A', N - 5),
        sees('Alien', 'moveDestinations', []))],
  });
  {
    const beside = inRoom('refuge', 'Room A').filter(role => role !== 'Blue Disabler');
    add(9, 'A player outside a full room can neither enter it nor act on anyone in it', {
      areas: ['movement', 'resources'], rules: ['R-CAP-17', 'R-CAP-02'], depends: ['R-ACT-02', 'R-ROLE-05', 'R-ACT-09'], setup: setup('refuge'),
      note: 'Capacity adds no exception to the same-location rule. What it adds is that the five inside cannot be joined, so nobody outside can reach them until one of them leaves.',
      steps: [turn(1, 'Blue Disabler'), check(seesSet('Blue Disabler', 'legal:DISABLE', beside), sees('Blue Disabler', 'moveDestinations', [])),
        cmd('Blue Disabler', disable('Insider'), 'NOT_ALLOWED'), cmd('Blue Disabler', move('Room B'), 'REFUSED'),
        check(truth('Blue Disabler', 'disablerSpent', false), truth('Blue Disabler', 'location', 'Room A'), seesSet('Blue Disabler', 'legal:DISABLE', beside), truth('Insider', 'health', 'Healthy'))],
    });
  }

  // ----- Who holds a place -------------------------------------------------------------------------
  {
    const second = has('Red Disabler') ? 'Red Disabler' : 'Undercover';
    const round = has('Red Disabler') ? 1 : 4;
    add(10, 'An Eliminated player keeps their place: the room stays full', {
      areas: ['elimination', 'movement'], rules: ['R-CAP-03', 'R-CAP-02'], depends: ['R-STATE-01', 'R-ROLE-05', ...(has('Red Disabler') ? ['R-ROLE-06', 'R-ROLE-17'] : ['R-SHOT-02', 'R-SHOT-03'])], setup: setup('fight'),
      note: `Two attacks on one Healthy player in Round ${round}: ${has('Red Disabler') ? 'both Disablers' : 'Blue Disabler and Undercover\'s weapon, which with seven players is the earliest two attacks can meet'}.`,
      steps: [...acts(round, { 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], [second]: [cmd(second, second === 'Undercover' ? shot('Insider') : disable('Insider'))] }),
        open(round + 1), check(truth('Insider', 'health', 'Eliminated'), truth('Insider', 'location', 'Room B'), pub('Insider', 'location', 'Room B'), holds('Room B', 5),
          sees('Alien', 'moveDestinations', [])),
        cmd('Alien', move('Room B'), 'REFUSED'), check(truth('Alien', 'location', 'Room A'))],
    });
  }
  const injure = [turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider'))];
  add(11, 'An Injured player is in Hospital from the end of the round, and their place in the room is free', {
    areas: ['movement', 'resolution-order'], rules: ['R-CAP-10', 'R-CAP-01'], depends: ['R-STATE-06', 'R-ROLE-05'],
    steps: [...injure, open(2), check(truth('Insider', 'health', 'Injured'), truth('Insider', 'location', 'Hospital'), holds('Hospital', 1), holds('Room B', 4), sees('Alien', 'moveDestinations', ['Room B'])),
      cmd('Alien', move('Room B')), check(holds('Room B', 5))],
  });
  add(12, 'A healed player returns to their last room when it has a place', {
    areas: ['movement', 'resolution-order'], rules: ['R-CAP-07', 'R-STATE-08'], depends: ['R-ROLE-02', 'R-ROLE-04', 'R-ROLE-05'],
    note: 'Cracker heals from Room A without moving (R-ROLE-04). Nobody took the place, so the last room is not full and the rule of the other room does not apply.',
    steps: [...injure, turn(2, 'Cracker'), cmd('Cracker', rescue('Insider')), open(3),
      check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Room B'), holds('Room B', 5), holds('Hospital', 0))],
  });
  add(13, 'A healed player whose last room is full goes to the other room', {
    areas: ['movement', 'resolution-order'], rules: ['R-CAP-07', 'R-CAP-11'], depends: ['R-STATE-08', 'R-ROLE-02', 'R-ROLE-04', 'R-ROLE-05'],
    steps: [...injure, open(2), cmd('Alien', move('Room B')), check(holds('Room B', 5)), turn(2, 'Cracker'), cmd('Cracker', rescue('Insider')), open(3),
      check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Room A'), pub('Insider', 'location', 'Room A'), holds('Room B', 5), holds('Hospital', 0))],
  });
  add(14, 'A released player returns to their last room when it has a place', {
    areas: ['voting', 'movement'], rules: ['R-CAP-07', 'R-VOTE-07'], depends: ['R-VOTE-05', 'R-VOTE-06', 'R-VOTE-10', 'R-CAPT-05'],
    steps: [...jail(1, 'Supplier'), ...elect('Cracker'), ...release(2, 'Cracker', 'Supplier'),
      check(is('phase', 'JAIL_VOTE'), truth('Supplier', 'jailed', false), truth('Supplier', 'location', 'Room B'), holds('Room B', 5), holds('Jail', 0))],
  });
  add(15, 'A released player whose last room is full goes to the other room', {
    areas: ['voting', 'movement'], rules: ['R-CAP-07', 'R-CAP-11'], depends: ['R-VOTE-07', 'R-VOTE-05', 'R-VOTE-06', 'R-VOTE-10', 'R-CAPT-05'],
    steps: [...jail(1, 'Supplier'), ...elect('Cracker'), open(2), check(holds('Room B', 4), holds('Jail', 1)), cmd('Alien', move('Room B')), ...release(2, 'Cracker', 'Supplier'),
      check(is('phase', 'JAIL_VOTE'), truth('Supplier', 'jailed', false), truth('Supplier', 'health', 'Healthy'), truth('Supplier', 'location', 'Room A'), pub('Supplier', 'location', 'Room A'),
        holds('Room B', 5), holds('Jail', 0))],
  });

  // ----- Command Room ------------------------------------------------------------------------------
  add(16, 'Electing a Captain frees their place, and Command Room is never refused to its Captain', {
    areas: ['movement', 'voting'], rules: ['R-CAP-01', 'R-CAP-10'], depends: ['R-CAPT-05', 'R-MOVE-04', 'R-MOVE-05', 'R-MOVE-09'],
    steps: [...elect('Supplier'), open(2),
      check(truth('Supplier', 'location', 'Command Room'), truth('Supplier', 'captain', true), holds('Command Room', 1), holds('Room B', 4), sees('Alien', 'moveDestinations', ['Room B']),
        sees('Supplier', 'moveDestinations', ['Room A', 'Room B'])),
      cmd('Supplier', move('Room A')), check(truth('Supplier', 'location', 'Room A'), truth('Supplier', 'captain', true), holds('Command Room', 0)),
      open(3), check(sees('Supplier', 'moveDestinations', ['Command Room', 'Room B'])), cmd('Supplier', move('Command Room')),
      check(truth('Supplier', 'location', 'Command Room'), holds('Command Room', 1))],
  });
  add(17, 'A Captain leaving Command Room is offered only a room with a place, and keeps the move if refused', {
    areas: ['movement'], rules: ['R-CAP-02', 'R-CAP-08'], depends: ['R-CAPT-05', 'R-MOVE-05', 'R-MOVE-09', 'R-MOVE-04'],
    steps: [...elect('Supplier'), open(2), cmd('Alien', move('Room B')), check(holds('Room B', 5), sees('Supplier', 'moveDestinations', ['Room A'])),
      cmd('Supplier', move('Room B'), 'REFUSED'), check(truth('Supplier', 'location', 'Command Room'), truth('Supplier', 'movedThisRound', false)),
      cmd('Supplier', move('Room A')), check(truth('Supplier', 'location', 'Room A'), truth('Supplier', 'captain', true)),
      open(3), check(sees('Supplier', 'moveDestinations', ['Command Room'])), cmd('Supplier', move('Command Room')), check(truth('Supplier', 'location', 'Command Room'))],
  });
  add(18, 'A Captain voted into Jail from Command Room and released later goes to the other room when their last room is full', {
    areas: ['voting', 'movement'], rules: ['R-CAP-07', 'R-CAP-11'], depends: ['R-CAPT-14', 'R-CAPT-12', 'R-CAPT-07', 'R-CAPT-05', 'R-VOTE-07', 'R-VOTE-05', 'R-VOTE-06', 'R-VOTE-10'],
    note: 'The last room is the room the Captain was elected from. Their place there was taken while they were in Command Room.',
    steps: [...elect('Supplier'), open(2), cmd('Alien', move('Room B')), ...jail(2, 'Supplier'), ...elect('Cracker'), open(3),
      check(truth('Supplier', 'jailed', true), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Jail'), truth('Cracker', 'location', 'Command Room'), holds('Room B', 5)),
      ...release(3, 'Cracker', 'Supplier'),
      check(is('phase', 'JAIL_VOTE'), truth('Supplier', 'jailed', false), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Room A'), holds('Room B', 5), holds('Command Room', 1))],
  });

  // ----- Jail --------------------------------------------------------------------------------------
  {
    const sent = ['Undercover', 'Hacker', has('Red Disabler') ? 'Red Disabler' : 'Alien', has('Red Disabler') ? 'Alien' : 'Insider', has('Red Disabler') ? 'Insider' : 'Cracker'];
    add(19, 'Five Jail votes in five rounds fill the Jail, and there is no sixth vote', {
      areas: ['voting', 'victory'], rules: ['R-CAP-05', 'R-CAP-12'], depends: ['R-VOTE-01', 'R-VOTE-02', 'R-VOTE-03', 'R-FLOW-01', 'R-WIN-04', 'R-WIN-01'],
      note: `One player is sent each round: ${sent.join(', ')}. Every Red player is among them, so Blue has the greater Power at the Round 5 check and the match ends there with the five still in Jail.`,
      steps: [...[1, 2, 3, 4].flatMap(round => [...jail(round, sent[round - 1]), open(round + 1), check(holds('Jail', round), count('jailed', round))]),
        ...jail(5, sent[4]), expire(), check(is('phase', 'FINISHED'), is('winner', 'Blue'), count('jailed', 5), holds('Jail', 5))],
    });
  }

  // ----- Final Zone --------------------------------------------------------------------------------
  add(20, `The Final Zone holds all ${N} players: it is not a room`, {
    areas: ['showdown', 'movement'], rules: ['R-CAP-01'], depends: ['R-SHOW-01', 'R-SHOW-02', 'R-WIN-10', 'R-WIN-01', 'R-ROLE-05', 'R-VOTE-01'],
    note: 'Power is equal at the Round 5 check, so the showdown begins: Insider is Injured and Cracker' + (mode === 8 ? ' is' : ' and Supplier are') + ' Jailed.',
    steps: [...injure, ...jail(1, 'Cracker'), ...(mode === 8 ? [] : jail(2, 'Supplier')), untilPhase('SHOWDOWN'),
      check(count('finalZone', N), holds('Final Zone', N), holds('Room A', 0), holds('Room B', 0), holds('Hospital', 0), holds('Jail', 0), count('eliminated', 0))],
  });

  // ----- Hospital ----------------------------------------------------------------------------------
  // Every damage the mode has before the showdown, each on a different player, all by the end of Round 4.
  const allDamage = mode === 7 ? [
    ...injure, turn(3, 'Supplier'), cmd('Supplier', supply('Alien', 'Hacker')),
    ...acts(4, { Alien: [cmd('Alien', shot('Blue Disabler'))], Hacker: [cmd('Hacker', shot('Supplier'))], Undercover: [cmd('Undercover', shot('Cracker'))] }),
  ] : mode === 8 ? [
    ...acts(1, { 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], 'Red Disabler': [cmd('Red Disabler', disable('Alien'))] }),
    turn(3, 'Supplier'), cmd('Supplier', supply('Blue Disabler', 'Red Disabler')),
    ...acts(4, { 'Blue Disabler': [cmd('Blue Disabler', shot('Supplier'))], 'Red Disabler': [cmd('Red Disabler', shot('Blue Disabler'))], Undercover: [cmd('Undercover', shot('Cracker'))] }),
  ] : null;
  // With nine players, in three parts so that a Rescue, an election or a vote can be set between
  // them. After Round 1 the patients are players 1, 6 and 9 (Hacker, Insider, Blue Disabler); in
  // Round 4 players 2, 4 and 7 are hurt (Supplier, Officer, Red Disabler). The patient with the
  // highest number and the hurt players with lower ones are what tells the orders of placement apart.
  const nine = {
    first: acts(1, { 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], 'Red Disabler': [cmd('Red Disabler', disable('Blue Disabler'))], Officer: [cmd('Officer', shot('Hacker'))] }),
    arm: [turn(3, 'Supplier'), cmd('Supplier', supply('Red Disabler', 'Alien'))],
    last: extra => acts(4, { 'Red Disabler': [cmd('Red Disabler', shot('Supplier'))], Alien: [cmd('Alien', shot('Red Disabler'))], Undercover: [cmd('Undercover', shot('Officer'))], ...extra }),
  };
  const most = { 7: 4, 8: 5, 9: 6 }[mode];
  add(21, mode === 9 ? 'Six players Injured by the end of Round 4: five are in Hospital, the sixth waits where they are, and no patient loses a place'
    : `The most players that can be Injured at once is ${most}: Hospital ${mode === 8 ? 'is exactly full and nobody waits' : 'never fills'}`, {
    areas: ['resolution-order', 'resources'], rules: mode === 9 ? ['R-CAP-04', 'R-CAP-13', 'R-CAP-15'] : ['R-CAP-13', 'R-CAP-01'],
    depends: ['R-SETUP-13', 'R-ROLE-05', 'R-ROLE-07', 'R-SHOT-02', 'R-SHOT-03', 'R-STATE-06', ...(mode === 7 ? [] : ['R-ROLE-06']), ...(mode === 9 ? ['R-ROLE-11'] : [])],
    setup: setup('ward'),
    note: mode === 9 ? 'Every damage a nine-player match has before the showdown falls on a different player and nobody is healed. The three patients of Round 1 keep their places, the one with the highest number among them. Who of the three hurt in Round 4 waits is case 24.'
      : `Every damage a ${N}-player match has before the showdown falls on a different player and nobody is healed. There is no further damage to give, so no ${N}-player match has a ${most + 1}th Injured player.`,
    steps: mode === 9 ? [...nine.first, ...nine.arm, ...nine.last({}), open(5),
      check(count('injured', 6), count('eliminated', 0), holds('Hospital', 5), count('waiting', 1), truth('Insider', 'location', 'Hospital'), truth('Blue Disabler', 'location', 'Hospital'), truth('Hacker', 'location', 'Hospital'))]
      : [...allDamage, open(5), check(count('injured', most), count('eliminated', 0), holds('Hospital', most), count('waiting', 0), count('ordinaryWeapons', 0))],
  });
  if (mode === 9) {
    add(22, 'Five players Injured after a Rescue in the same round: all five are in Hospital and nobody waits, whatever the healed player\'s number', {
      areas: ['resolution-order', 'resources'], rules: ['R-CAP-14', 'R-CAP-18', 'R-CAP-04'], depends: ['R-RES-01', 'R-ROLE-02', 'R-ROLE-04', 'R-STATE-08', 'R-CAP-13'], setup: setup('ward'),
      note: 'Three patients, of whom player 9 is healed in Round 4, and players 2, 4 and 7 hurt in Round 4. Five players are Injured afterwards, so there is no sixth and nobody waits: the place the healed player leaves is free in that resolution. An engine that placed everyone in one pass by player number would reach player 7 before player 9 had left, and leave player 7 waiting.',
      steps: [...nine.first, ...nine.arm, ...nine.last({ Cracker: [cmd('Cracker', rescue('Blue Disabler'))] }), open(5),
        check(count('injured', 5), holds('Hospital', 5), count('waiting', 0), truth('Red Disabler', 'location', 'Hospital'), truth('Blue Disabler', 'health', 'Healthy'), truth('Blue Disabler', 'location', 'Room A'))],
    });
    const freed = [...nine.first, ...elect('Cracker'), ...jail(2, 'Insider'), ...nine.arm, ...nine.last({}), ...release(5, 'Cracker', 'Insider')];
    add(23, 'A prisoner released while Injured does not become a sixth player in Hospital', {
      areas: ['voting', 'resolution-order'], rules: ['R-CAP-01'], depends: ['R-VOTE-05', 'R-VOTE-06', 'R-VOTE-10', 'R-STATE-07', 'R-CAP-13', 'R-CAPT-05'], setup: setup('ward'),
      note: 'Insider is Injured and Jailed, and five other players are in Hospital. The release is the Captain\'s to ask for and the table\'s to grant as before. Where Insider is then placed is case 26; this case asserts only that Hospital still holds five.',
      steps: [...freed, check(is('phase', 'JAIL_VOTE'), is('round', 5), truth('Insider', 'jailed', false), truth('Insider', 'health', 'Injured'), count('injured', 6), holds('Hospital', 5))],
    });
    add(24, 'When more players are hurt in one round than Hospital has places, the lower player numbers get them', {
      areas: ['resolution-order'], rules: ['R-CAP-18', 'R-CAP-04', 'R-CAP-15'], depends: ['R-CAP-13'], setup: setup('ward'),
      note: 'Players 2 (Supplier), 4 (Officer) and 7 (Red Disabler) are hurt in Round 4 and Hospital has two places, so Red Disabler waits. Red Disabler was the first of the three to be attacked and Officer the last, and Officer has the last turn of that round, so an order by attack or by turn would leave Officer waiting. Player 9 is a patient and keeps the place: an order by number over patients and newcomers alike would put player 9 out. Blocked on CAP-D1 until Backend\'s record of the owner\'s choice (CAP-ORDER-01) was read.',
      steps: [...nine.first, ...nine.arm, ...nine.last({}), open(5),
        check(count('waiting', 1), is('waiting', [ref('Red Disabler')]), truth('Red Disabler', 'health', 'Injured'), truth('Red Disabler', 'location', 'Room A'),
          truth('Supplier', 'location', 'Hospital'), truth('Officer', 'location', 'Hospital'), truth('Blue Disabler', 'location', 'Hospital'), holds('Hospital', 5))],
    });
    add(26, 'A prisoner released while Injured, with Hospital full, stays in Jail as a free player', {
      areas: ['voting', 'resolution-order'], rules: ['R-CAP-20', 'R-CAP-01'], depends: ['R-STATE-07', 'R-VOTE-10', 'R-VOTE-02', 'R-WIN-04', 'R-WIN-01', 'R-CAP-13'], setup: setup('ward'),
      note: 'R-STATE-07 sends a prisoner released while Injured to Hospital, and Hospital holds five. Backend\'s record (CAPACITY-04) applies the owner\'s words for a player refused by Hospital, who stays where they are: the released player is free and still stands in Jail, and may be voted for again. No place comes free, so they are still there when the match ends at the Round 5 check. Blocked on CAP-D3 until that record was read.',
      steps: [...freed, check(truth('Insider', 'jailed', false), truth('Insider', 'location', 'Jail'), pub('Insider', 'location', 'Jail'), pub('Insider', 'jailed', false), holds('Jail', 1), holds('Hospital', 5),
        factSet('eligibleTargets', roles)),
      expire(), check(is('phase', 'FINISHED'), is('winner', 'Blue'), truth('Insider', 'location', 'Jail'), truth('Insider', 'jailed', false), holds('Hospital', 5))],
    });
    add(36, 'A player who waits goes to Hospital at the end of the next round, when a place has come free', {
      areas: ['resolution-order', 'victory'], rules: ['R-CAP-04', 'R-CAP-14', 'R-CAP-18'], depends: ['R-ROLE-02', 'R-ROLE-04', 'R-STATE-08', 'R-WIN-04', 'R-WIN-01', 'R-CAP-13'], setup: setup('ward'),
      note: 'Red Disabler waits through Round 5. Cracker heals a patient in Round 5, so a place is free when the round resolves. The match ends at the Round 5 check with a Blue win, which leaves every player where the resolution put them.',
      steps: [...nine.first, ...nine.arm, ...nine.last({}), turn(5, 'Cracker'), check(truth('Red Disabler', 'location', 'Room A')), cmd('Cracker', rescue('Insider')), phase(5, 'JAIL_VOTE'), expire(),
        check(is('phase', 'FINISHED'), is('winner', 'Blue'), truth('Red Disabler', 'health', 'Injured'), truth('Red Disabler', 'location', 'Hospital'), truth('Insider', 'health', 'Healthy'),
          truth('Insider', 'location', 'Room A'), holds('Hospital', 5), count('waiting', 0))],
    });
    add(37, 'A player who waits in a room can be healed by a Cracker in that room, and not from the other room', {
      areas: ['resources', 'movement'], rules: ['R-CAP-17', 'R-CAP-04'], depends: ['R-ROLE-02', 'R-ROLE-04', 'R-ACT-02', 'R-MOVE-01', 'R-WIN-10', 'R-CAP-13'], setup: setup('ward'),
      note: 'Cracker reaches into Hospital from either room (R-ROLE-04), and a waiting player is not in Hospital. Red Disabler waits in Room A; Cracker is in Room B, cannot name them, moves to Room A and can. With Red Disabler healed, Power is equal at the Round 5 check and the showdown begins.',
      steps: [...nine.first, ...nine.arm, ...nine.last({}), turn(5, 'Cracker'),
        check({ visible: ref('Cracker'), field: 'legal:RESCUE', excludes: ref('Red Disabler') }, { visible: ref('Cracker'), field: 'legal:RESCUE', includes: ref('Insider') }),
        cmd('Cracker', rescue('Red Disabler'), 'NOT_ALLOWED'), cmd('Cracker', move('Room A')),
        check({ visible: ref('Cracker'), field: 'legal:RESCUE', includes: ref('Red Disabler') }, { visible: ref('Cracker'), field: 'legal:RESCUE', includes: ref('Insider') }),
        cmd('Cracker', rescue('Red Disabler')), untilPhase('SHOWDOWN'), check(truth('Red Disabler', 'health', 'Healthy'), count('injured', 5))],
    });
    add(38, 'The released prisoner who stands in Jail goes to Hospital at the end of the round, when a place has come free', {
      areas: ['voting', 'resolution-order'], rules: ['R-CAP-20', 'R-CAP-04'], depends: ['R-VOTE-01', 'R-VOTE-02', 'R-VOTE-03', 'R-STATE-07', 'R-RES-01', 'R-WIN-04', 'R-WIN-01', 'R-CAP-13'], setup: setup('ward'),
      note: 'After the release the table votes a patient, Hacker, into Jail. That frees a place before the round resolves, and the released player, who is free and Injured and stands in Jail, takes it.',
      steps: [...freed, ...voters().map(voter => cmd(voter, vote('Hacker'))), expire(),
        check(is('phase', 'FINISHED'), is('winner', 'Blue'), truth('Insider', 'location', 'Hospital'), truth('Insider', 'jailed', false), truth('Hacker', 'location', 'Jail'), truth('Hacker', 'jailed', true),
          holds('Hospital', 5), holds('Jail', 1), count('waiting', 0))],
    });
    add(43, 'A Captain hurt after entering Command Room, with no place in Hospital, waits in their last room', {
      areas: ['resolution-order', 'movement'], rules: ['R-CAP-24', 'R-CAP-04', 'R-CAP-18'], depends: ['R-CAPT-07', 'R-CAPT-05', 'R-ACT-06', 'R-MOVE-04', 'R-CAP-13'], setup: setup('ward'),
      note: 'Red Disabler is Captain, is shot in Room A, then enters Command Room. Of the three hurt in Round 4 they have the highest number and get no place. A player without a place stays where they are, and a player who is no longer Captain cannot stay in Command Room: they are seated like a returning player. Blocked on CAP-D5 until the owner decided it on 11 October 2026.',
      steps: [...nine.first, ...elect('Red Disabler'), open(2), cmd('Red Disabler', move('Room A')), ...nine.arm, ...nine.last({}), cmd('Red Disabler', move('Command Room')), open(5),
        check(count('waiting', 1), is('waiting', [ref('Red Disabler')]), truth('Red Disabler', 'health', 'Injured'), truth('Red Disabler', 'captain', false), truth('Red Disabler', 'location', 'Room A'),
          holds('Hospital', 5), holds('Command Room', 0))],
    });
  }
  add(25, 'A healed player returns to their last room when a room-mate leaves it for Hospital in the same round', {
    areas: ['resolution-order', 'movement'], rules: ['R-CAP-19', 'R-CAP-26', 'R-CAP-07'], depends: ['R-STATE-08', 'R-RES-01', 'R-ROLE-02', 'R-ROLE-04', 'R-ROLE-05', 'R-SHOT-02', 'R-SHOT-03', 'R-MOVE-01'],
    note: 'Room B holds five when Round 4 resolves: Supplier is hurt and leaves it for Hospital, and Insider is healed and comes back from Hospital. Room B has a place once the round has resolved, and the healed player takes it. Blocked on CAP-D2 until the owner decided it on 11 October 2026.',
    steps: [...injure, open(2), cmd('Alien', move('Room B')),
      ...acts(4, { Cracker: [cmd('Cracker', rescue('Insider'))], Undercover: [cmd('Undercover', shot('Supplier'))] }), open(5),
      check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Room B'), truth('Supplier', 'location', 'Hospital'), holds('Room B', 5), holds('Hospital', 1))],
  });
  add(27, 'After being sent to the other room, that room is the player\'s last room', {
    areas: ['resolution-order', 'movement'], rules: ['R-CAP-22', 'R-CAP-07'], depends: ['R-STATE-08', 'R-VOTE-07', 'R-VOTE-05', 'R-VOTE-06', 'R-VOTE-10', 'R-CAPT-05', 'R-ROLE-02', 'R-ROLE-04', 'R-ROLE-05', 'R-MOVE-01'],
    note: 'Supplier is released while Room B, their last room, is full, and is sent to Room A. Later Supplier is hurt in Room A and healed, and by then both rooms have a place. The last room is the room the player was last in, so Supplier returns to Room A. Blocked on CAP-D4 until the owner decided it on 11 October 2026.',
    steps: [...jail(1, 'Supplier'), ...elect('Alien'), open(2), cmd('Cracker', move('Room B')), ...release(2, 'Alien', 'Supplier'),
      open(3), cmd('Blue Disabler', move('Room A')), turn(3, 'Blue Disabler'), cmd('Blue Disabler', disable('Supplier')),
      turn(4, 'Cracker'), cmd('Cracker', rescue('Supplier')), open(5), check(truth('Supplier', 'health', 'Healthy'), truth('Supplier', 'location', 'Room A'), pub('Supplier', 'location', 'Room A'))],
  });

  // ----- A Captain who is hit after entering Command Room -------------------------------------------
  // Where an action's target is when it resolves does not matter (R-ACT-06): a Captain named in a
  // room is hit although they have entered Command Room since. They lose the title at once (R-CAPT-07).
  {
    // The Captain is attacked in Room B and enters Command Room; a patient whose last room is Room B is healed in the same round.
    const fourth = has('Red Disabler') ? 'Red Disabler' : 'Alien';
    const attacker = has('Red Disabler') ? 'Red Disabler' : 'Undercover';
    const round = has('Red Disabler') ? 3 : 4;
    add(28, 'A Captain hurt after entering Command Room goes to Hospital and holds no place in a room: a healed player returns to their last room', {
      areas: ['resolution-order', 'movement'], rules: ['R-CAP-07', 'R-CAP-23'],
      depends: ['R-CAPT-14', 'R-CAPT-07', 'R-CAPT-05', 'R-ACT-06', 'R-STATE-06', 'R-STATE-08', 'R-ROLE-02', 'R-ROLE-04', 'R-ROLE-05', 'R-MOVE-04', ...(has('Red Disabler') ? ['R-ROLE-06'] : ['R-SHOT-02', 'R-SHOT-03'])],
      note: `Room B, Insider's last room, holds four players before Round ${round} resolves and four after it. The Captain is hurt inside Command Room and goes to Hospital like any Injured player (R-CAPT-14); the rules give no moment at which they are in Room B. An engine that sets the hurt Captain down in their last room on the way would make it five for that moment and turn the healed player away.`,
      steps: [...injure, ...elect('Supplier'), open(2), cmd('Supplier', move('Room B')), cmd(fourth, move('Room B')), check(holds('Room B', 5)),
        ...acts(round, { [attacker]: [cmd(attacker, attacker === 'Undercover' ? shot('Supplier') : disable('Supplier'))], Cracker: [cmd('Cracker', rescue('Insider'))] }),
        cmd('Supplier', move('Command Room')), check(truth('Supplier', 'location', 'Command Room'), holds('Room B', 4)), open(round + 1),
        check(truth('Supplier', 'health', 'Injured'), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Hospital'), truth('Insider', 'health', 'Healthy'),
          truth('Insider', 'location', 'Room B'), holds('Room B', 5), holds('Hospital', 1))],
    });
  }
  {
    const hurtAndHealed = [...elect('Supplier'), open(2), cmd('Supplier', move('Room B')),
      ...acts(3, { 'Blue Disabler': [cmd('Blue Disabler', disable('Supplier'))], Cracker: [cmd('Cracker', rescue('Supplier'))] }), cmd('Supplier', move('Command Room'))];
    add(29, 'A Captain hurt and healed in one round after entering Command Room is Captain no more and returns to their last room', {
      areas: ['resolution-order', 'movement'], rules: ['R-CAP-07'], depends: ['R-CAPT-14', 'R-CAPT-07', 'R-CAPT-05', 'R-ACT-06', 'R-RES-01', 'R-ROLE-02', 'R-ROLE-05', 'R-MOVE-04'], setup: setup('b4'),
      note: 'The sixth decided case names "a Captain who loses the title". This is how one reaches a room at once: the attack resolves before the Rescue (R-RES-01), the title is lost on the injury and does not come back with the healing, and a player who is no longer Captain and is Healthy returns to their last room (R-CAPT-14).',
      steps: [...hurtAndHealed, check(truth('Supplier', 'location', 'Command Room'), truth('Supplier', 'captain', true), holds('Room B', 3)), open(4),
        check(truth('Supplier', 'health', 'Healthy'), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Room B'), count('captains', 0), holds('Command Room', 0), holds('Room B', 4),
          truth('Blue Disabler', 'disablerSpent', true), truth('Cracker', 'rescuesRemaining', 1))],
    });
    add(35, 'A Captain who loses the title inside Command Room and whose last room is full goes to the other room', {
      areas: ['resolution-order', 'movement'], rules: ['R-CAP-07', 'R-CAP-11'], depends: ['R-CAPT-14', 'R-CAPT-07', 'R-CAPT-05', 'R-ACT-06', 'R-RES-01', 'R-ROLE-02', 'R-ROLE-05', 'R-MOVE-04', 'R-MOVE-01'], setup: setup('b4'),
      note: 'As case 29, and two players enter Room B after the Captain has left it for Command Room.',
      steps: [...hurtAndHealed, cmd('Insider', move('Room B')), cmd('Alien', move('Room B')), check(holds('Room B', 5)), open(4),
        check(truth('Supplier', 'health', 'Healthy'), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Room A'), pub('Supplier', 'location', 'Room A'), holds('Room B', 5), holds('Command Room', 0))],
    });
  }
  {
    const second = has('Red Disabler') ? 'Red Disabler' : 'Undercover';
    const round = has('Red Disabler') ? 3 : 4;
    add(42, 'A Captain who is Eliminated after entering Command Room lies in their last room and holds a place there', {
      areas: ['elimination', 'movement'], rules: ['R-CAP-24', 'R-CAP-03'],
      depends: ['R-CAPT-07', 'R-CAPT-05', 'R-ACT-06', 'R-STATE-01', 'R-ROLE-05', 'R-MOVE-04', 'R-MOVE-01', ...(has('Red Disabler') ? ['R-ROLE-06'] : ['R-SHOT-02', 'R-SHOT-03'])], setup: setup('b4'),
      note: 'Two attacks are registered on the Captain in Room B, who then enters Command Room. Command Room is for the Captain, so the Eliminated player is seated like a returning player: in their last room, where they hold one of the five places for the rest of the match. Blocked on CAP-D5 until the owner decided it on 11 October 2026.',
      steps: [...elect('Supplier'), open(2), cmd('Supplier', move('Room B')), ...(has('Red Disabler') ? [cmd('Red Disabler', move('Room B'))] : []),
        ...acts(round, { 'Blue Disabler': [cmd('Blue Disabler', disable('Supplier'))], [second]: [cmd(second, second === 'Undercover' ? shot('Supplier') : disable('Supplier'))] }),
        cmd('Supplier', move('Command Room')), open(round + 1),
        check(truth('Supplier', 'health', 'Eliminated'), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Room B'), pub('Supplier', 'location', 'Room B'),
          holds('Room B', has('Red Disabler') ? 5 : 4), holds('Command Room', 0), count('captains', 0), sees('Alien', 'moveDestinations', has('Red Disabler') ? [] : ['Room B']))],
    });
  }
  add(45, 'A Captain who loses the title inside Command Room is seated once the round has resolved: a place a room-mate is leaving is free', {
    areas: ['resolution-order', 'movement'], rules: ['R-CAP-24', 'R-CAP-19', 'R-CAP-26', 'R-CAP-07'],
    depends: ['R-CAPT-14', 'R-CAPT-07', 'R-CAPT-05', 'R-ACT-06', 'R-RES-01', 'R-ROLE-02', 'R-ROLE-05', 'R-SHOT-02', 'R-SHOT-03', 'R-MOVE-04', 'R-MOVE-01'], setup: setup('b4'),
    note: 'As case 35, but one of the five players in Room B is hurt in the same round and leaves for Hospital. At the moment the Captain is hit, Room B holds five others; once the round has resolved it holds four, and the Captain who lost the title returns to it.',
    steps: [...elect('Supplier'), open(2), cmd('Supplier', move('Room B')), cmd('Alien', move('Room B')), check(holds('Room B', 5)),
      ...acts(4, { 'Blue Disabler': [cmd('Blue Disabler', disable('Supplier'))], Cracker: [cmd('Cracker', rescue('Supplier'))], Undercover: [cmd('Undercover', shot('Alien'))] }),
      cmd('Supplier', move('Command Room')), cmd('Insider', move('Room B')), check(holds('Room B', 5), truth('Supplier', 'location', 'Command Room')), open(5),
      check(truth('Supplier', 'health', 'Healthy'), truth('Supplier', 'captain', false), truth('Supplier', 'location', 'Room B'), truth('Alien', 'health', 'Injured'), truth('Alien', 'location', 'Hospital'),
        holds('Room B', 5), holds('Command Room', 0))],
  });
  add(44, 'Which of two returning players gets the one place left in the last room they share', {
    status: 'blocked', decisions: ['CAP-D6'], areas: ['resolution-order', 'movement'], rules: ['R-CAP-27'], depends: ['R-CAP-07', 'R-CAP-19', 'R-CAP-24'], setup: setup('b4'),
    note: 'When Round 4 resolves, the Captain is Eliminated inside Command Room and Insider is healed. Room B is the last room of both and has one place. The decisions say that each is seated once the round has resolved, and not which of them first.',
    steps: [open(1), cmd('Insider', move('Room B')), turn(1, 'Blue Disabler'), cmd('Blue Disabler', disable('Insider')), ...elect('Supplier'), open(2), cmd('Supplier', move('Room B')), cmd('Alien', move('Room B')),
      turn(3, 'Supplier'), cmd('Supplier', supply('Blue Disabler', 'Cracker')),
      ...acts(4, { Undercover: [cmd('Undercover', shot('Supplier'))], 'Blue Disabler': [cmd('Blue Disabler', shot('Supplier'))], Cracker: [cmd('Cracker', rescue('Insider'))] }),
      cmd('Supplier', move('Command Room')), open(5), noteOf('where the Eliminated Captain lies', 'Supplier', 'location'), noteOf('where the healed player is', 'Insider', 'location')],
  });

  // ----- Places and returns together ----------------------------------------------------------------
  {
    const early = has('Red Disabler');
    const second = early ? 'Red Disabler' : 'Undercover';
    const kill = acts(early ? 1 : 4, { 'Blue Disabler': [cmd('Blue Disabler', disable('Insider'))], [second]: [cmd(second, second === 'Undercover' ? shot('Insider') : disable('Insider'))] });
    const back = round => [open(round), cmd('Alien', move('Room B')), check(holds('Room B', 5), truth('Insider', 'health', 'Eliminated')), ...release(round, 'Hacker', 'Supplier', ['Insider'])];
    add(39, 'An Eliminated player\'s place counts against a returning player too: the released player goes to the other room', {
      areas: ['elimination', 'voting', 'movement'], rules: ['R-CAP-03', 'R-CAP-07'],
      depends: ['R-STATE-01', 'R-ROLE-05', 'R-VOTE-05', 'R-VOTE-06', 'R-VOTE-07', 'R-VOTE-10', 'R-CAPT-05', 'R-MOVE-01', ...(early ? ['R-ROLE-06', 'R-ROLE-17'] : ['R-SHOT-02', 'R-SHOT-03'])], setup: setup('fight'),
      note: 'Room B, the released player\'s last room, holds four living players and one Eliminated. That is five.',
      steps: [...(early ? [...kill, ...jail(1, 'Supplier'), ...elect('Hacker'), ...back(2)] : [...jail(1, 'Supplier'), ...elect('Hacker'), ...kill, ...back(5)]),
        check(is('phase', 'JAIL_VOTE'), truth('Supplier', 'jailed', false), truth('Supplier', 'location', 'Room A'), truth('Insider', 'location', 'Room B'), holds('Room B', 5))],
    });
  }
  {
    const first = orderOf(1)[0];
    add(40, 'A full room cannot be entered during a Hack conversation or while a Captain is elected', {
      areas: ['movement', 'phase-transitions'], rules: ['R-CAP-02', 'R-CAP-08'], depends: ['R-MOVE-01', 'R-MOVE-07', 'R-HACK-02', 'R-FLOW-06'],
      note: 'A move may be made at any moment before voting begins, and those moments include a Hack conversation. Whether a player may move at all while a Captain is elected is not decided (D16); a move into a full room is refused under either answer.',
      steps: [turn(1, first), cmd(first, hack('Supplier')), untilPhase('HACK'), check(holds('Room B', 5), sees('Alien', 'moveDestinations', [])), cmd('Alien', move('Room B'), 'REFUSED'),
        untilPhase('CAPTAIN_ELECTION'), cmd('Alien', move('Room B'), 'REFUSED'), check(truth('Alien', 'location', 'Room A'), holds('Room B', 5))],
    });
  }
  add(41, 'A released player and a healed player want the same last place in one round: the release comes first', {
    areas: ['voting', 'resolution-order', 'movement'], rules: ['R-CAP-07', 'R-CAP-10'], depends: ['R-VOTE-10', 'R-VOTE-07', 'R-STATE-08', 'R-RES-01', 'R-ROLE-02', 'R-ROLE-04', 'R-ROLE-05', 'R-CAPT-05', 'R-MOVE-01'],
    note: 'Room B holds four, and two absent players have it as their last room: Supplier in Jail and Insider in Hospital. A release takes effect when its vote closes (R-VOTE-10), before the round resolves, so Supplier has the place when Insider is healed.',
    steps: [...injure, ...jail(1, 'Supplier'), ...elect('Alien'), open(2), cmd('Cracker', move('Room B')), check(holds('Room B', 4)), turn(2, 'Cracker'), cmd('Cracker', rescue('Insider')),
      ...release(2, 'Alien', 'Supplier'), check(is('phase', 'JAIL_VOTE'), truth('Supplier', 'location', 'Room B'), holds('Room B', 5)), open(3),
      check(truth('Insider', 'health', 'Healthy'), truth('Insider', 'location', 'Room A'), truth('Supplier', 'location', 'Room B'), holds('Room B', 5))],
  });

  // ----- What an engine run cannot show ------------------------------------------------------------
  const manual = (number, title, rules, text) => add(number, title, { status: 'manual', areas: ['operating-policy'], rules, setup: null, note: `${text} ${MANUAL_NOTE}` });
  manual(30, `Starting rooms are drawn by the service once, for all ${N} players together, when the roster is complete`, ['R-CAP-25', 'R-CAP-06', 'R-CAP-16'],
    `Many lobbies of ${N} players: nobody has a room before everyone has joined; no room starts with more than five; the splits come as often as section 4.1 of the audit gives for equally likely legal assignments; any two players start together equally often; the order of joining, the order of approval, the character chosen and the role dealt afterwards make no difference.`);
  manual(31, 'A lobby whose rooms were drawn before the rule and put six players in one room', ['R-CAP-16', 'R-CAP-21'],
    'Such a lobby either starts under the ruleset it was prepared for, or is given rooms the rule allows. It must not start under this ruleset with six in a room, and it must not be left unable to start.');
  manual(32, 'Two phones move for the last place at the same moment', ['R-CAP-09', 'R-CAP-02'],
    'The service accepts exactly one and refuses the other, whatever the timing, and a retry of the refused one is refused again while the room is full.');
  manual(33, 'A match that began before the rule plays on under its own ruleset, and its replay is unchanged', ['R-CAP-21'],
    'A running match of an earlier ruleset still lets a sixth player into a room after the new engine is deployed, and a recorded match replays to the same end state.');
  manual(34, 'What a refused mover is shown, and what the table sees', ['R-CAP-02', 'R-CAP-08'],
    'The phone does not show the full room as a destination. If a move is refused because the place was taken a moment before, the mover is told plainly and the table sees nothing.');

  return scenarios.sort((left, right) => left.id.localeCompare(right.id));
}

export function buildCapacityCatalog() {
  return { 7: build(7), 8: build(8), 9: build(9) };
}

export const CAPACITY_FILES = { 7: 'mode-7.scenarios.json', 8: 'mode-8.scenarios.json', 9: 'mode-9.scenarios.json' };
