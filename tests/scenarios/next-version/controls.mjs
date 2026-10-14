// Controls on the versions that exist. Each one plays a short, fixed line through a built engine
// under one explicitly named ruleset and holds what the engine does to what that ruleset's own
// sources say. They are here for two reasons. They show, by execution, what a version does today
// at every point where the specification of 13 October 2026 says the next version will differ, so
// that no expectation of the next version can be mistaken for behaviour somebody has seen. And
// they are the first independent run of the two rulesets Backend published after the capacity
// audit: the five-second vote result and the declared-side Hack.
//
// A control is not a case of the next version. It is never run against a ruleset other than its
// own, and an engine that does not name that ruleset runs nothing.
//
// The driver below contains no game rule. It forwards commands and trusted times to the engine
// and reads back the engine's state and the views it projects.
import { LAYOUTS, factsOf, roster } from './catalog.mjs';

export const RULESETS = Object.freeze({
  V13: 'in-person-v1-capacity-resolution-2026-10-12',
  V14: 'in-person-v1-vote-results-2026-10-12',
  V15: 'in-person-v1-declared-hack-2026-10-12',
});
// Where each ruleset's rules are written. The two later overlays are on Backend's draft branches
// and not in this checkout; their decisions are cited by the identifiers the overlays give them.
export const RULESET_SOURCES = Object.freeze({
  V13: { engineVersion: 'full-game-1.3.0', rulesetHash: 'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e',
    overlay: 'rules/overlays/room-capacity-resolution-owner-decision-2026-10-12.json', published: 'the integration baseline, PR #114' },
  V14: { engineVersion: 'full-game-1.4.0', rulesetHash: '617173762d5a1589d0adce55d4742a3aa70f6d5af03a968b6ab9f90d5392b010',
    overlay: 'rules/overlays/vote-result-owner-decision-2026-10-12.json', published: 'Backend draft PR #125' },
  V15: { engineVersion: 'full-game-1.5.0', rulesetHash: '1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c',
    overlay: 'rules/overlays/declared-hack-owner-decision-2026-10-12.json', published: 'Backend draft PR #131' },
});
// The decisions of the two overlays that are not in this checkout, so that a citation can be checked for its form.
export const LATER_DECISIONS = Object.freeze({
  'VOTE-RESULT': 5, 'HACK-DECLARE': 7, PASS: 6,
});

const START = 1_800_000_000_000;
const TUPLE_KEYS = ['protocolVersion', 'engineVersion', 'rulesetVersion', 'rulesetHash'];
const ASSETS = 'balance-fixture-no-assets';
const canonical = value => JSON.stringify(value, (_, item) => (item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item));

/** The version tuple an engine names for a ruleset, or null. */
export function tupleFor(engine, ruleset) {
  const found = Object.values(engine).find(value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && TUPLE_KEYS.every(key => key in value) && value.rulesetVersion === ruleset);
  return found === undefined ? null : Object.fromEntries(TUPLE_KEYS.map(key => [key, found[key]]));
}

/**
 * One match under one tuple. Times are trusted server times; `at` is in milliseconds from the
 * opening of the current phase.
 */
export function openMatch(engine, tuple, mode, options = {}) {
  const seats = roster(mode);
  const ids = seats.map(item => `seat-${item.seat}`);
  const seatOf = role => { const found = seats.find(item => item.role === role); if (found === undefined) throw new Error(`no ${role} with ${mode} players`); return `seat-${found.seat}`; };
  const rooms = LAYOUTS[options.layout ?? 'MIX'].rooms(mode);
  const initialRooms = Object.fromEntries(Object.entries(rooms).flatMap(([room, roles]) => roles.map(role => [seatOf(role), room])));
  const ascending = [...ids];
  const roundOrders = Array.from({ length: 5 }, (_, index) => [...(options.orders?.[index + 1] ?? ascending)]);
  let phases = 0;
  let commands = 0;
  let sent = 0;
  let closed = 0;
  const context = now => ({ now, nextPhaseId: `phase-${phases + 1}`, nextDeadlineToken: `deadline-${phases + 1}` });
  let state = engine.createFullGame({
    matchId: `control-${mode}`, now: START, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: ASSETS,
    setup: { playerCount: mode, roleOrder: seats.map(item => item.role), codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'], initialRooms, roundOrders },
    versions: { ...tuple, assetManifestVersion: ASSETS },
  });
  if (TUPLE_KEYS.some(key => state.versions?.[key] !== tuple[key])) throw new Error('the engine did not record the tuple it was asked for');
  const settle = before => { if (state.phase.id !== before) phases += 1; };
  const match = {
    mode, ids, seatOf, facts: factsOf(mode),
    get state() { return state; },
    get counters() { return { phasesClosed: closed, commandsSent: sent, commandsAccepted: commands }; },
    phase: () => ({ kind: state.phase.kind, round: state.round, active: state.activeSeatId, startedAt: state.phase.startedAt, endsAt: state.phase.endsAt, length: state.phase.endsAt === null ? null : state.phase.endsAt - state.phase.startedAt }),
    seat: role => state.seats.find(item => item.seatId === seatOf(role)),
    views: () => engine.projectFullGame(state),
    /** Send one command for a role at `at` ms into the phase. Returns the engine's answer. */
    send(role, command, at = 1000) {
      const actor = role.startsWith('seat-') ? role : seatOf(role);
      const before = state.phase.id;
      sent += 1;
      let result;
      try {
        result = engine.executeFullGame(state, actor, { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId: `command-${sent}`, command }, context(state.phase.startedAt + at));
      } catch (error) {
        if (error?.name === 'ZodError' || Array.isArray(error?.issues)) return 'INVALID';
        throw error;
      }
      state = result.state;
      settle(before);
      if (result.receipt.status === 'accepted') commands += 1;
      return result.receipt.status === 'accepted' ? 'REGISTERED' : result.receipt.code;
    },
    /** Close the current phase `late` ms after its deadline. Negative `late` asks before the deadline. */
    close(late = 0) {
      if (state.phase.endsAt === null) return false;
      const before = state.phase.id;
      const result = engine.advanceFullGame(state, { ...context(state.phase.endsAt + late), phaseId: state.phase.id, deadlineToken: state.deadlineToken });
      state = result.state;
      settle(before);
      if (result.advanced) closed += 1;
      return result.advanced;
    },
    /** Close phases on time until the condition holds. */
    until(condition, label) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (condition(state)) return;
        if (!match.close()) throw new Error(`the match stopped before: ${label}`);
      }
      throw new Error(`not reached in 400 phases: ${label}`);
    },
    toPhase: (kind, round = null) => match.until(current => current.phase.kind === kind && (round === null || current.round === round), `${kind}${round === null ? '' : ` of Round ${round}`}`),
    /** The turn of one role in a round. */
    toTurn: (role, round) => match.until(current => current.phase.kind === 'ORDINARY_TURN' && current.round === round && current.activeSeatId === seatOf(role), `the ${role}'s turn in Round ${round}`),
    /** Ballots of the first `count` players who may vote, the target left out, for one target. */
    ballots(target, count) {
      const seat = target === null ? null : target.startsWith('seat-') ? target : seatOf(target);
      const voters = state.eligibleVoters.filter(id => id !== seat).slice(0, count);
      return voters.map(id => match.send(id, { type: 'VOTE', targetSeatId: seat }));
    },
  };
  return match;
}

const publicSeat = (view, seat) => view.seats.find(item => item.seatId === seat);
// Undercover is a name used without an article.
const the = role => (role === 'Undercover' ? 'Undercover' : `the ${role}`);

// ---------------------------------------------------------------------------------------------
// The controls. `sources` are the rows or decisions the expectation is read from; `changes` are
// the cases of the next version that expect something else at the same point, or the same thing.
// ---------------------------------------------------------------------------------------------
const controls = [];
const control = (code, title, spec) => { controls.push({ code, title, ...spec }); };

control('V13-01', 'The Jail vote closes straight into the resolution: there is no result window', {
  sources: ['R-RES-01', 'R-FLOW-03', 'R-FLOW-07'], changes: ['BLK-01'], contrast: 'V14',
  note: 'The five-second result exists from the vote-result ruleset on; the window after it is the next version\'s.',
  run(match, t) {
    match.toTurn('Blue Disabler', 1);
    t.check('the Disable is accepted', match.send('Blue Disabler', { type: 'DISABLE', targetSeatId: match.seatOf('Alien') }), 'REGISTERED');
    match.toPhase('JAIL_VOTE', 1);
    t.check('the Jail vote is a window of sixty seconds', match.phase().length, 60000);
    const closing = match.phase().endsAt;
    match.close();
    t.check('the phase after the Jail vote', match.phase().kind, 'CAPTAIN_ELECTION');
    t.check('it opens at the closing of the vote', match.phase().startedAt, closing);
    t.check('the attack has resolved by then', match.seat('Alien').health, 'Injured');
  },
});
control('V13-02', 'A Hack is one phase of sixty seconds, and only the two read who the partner is', {
  sources: ['R-FLOW-06', 'R-VIEW-07', 'R-HACK-02', 'BAL-C12'], changes: ['HCK-01', 'HCK-03'], contrast: 'V15',
  note: 'The next version makes the pair public and puts fifteen and five seconds before the sixty.',
  run(match, t, twin) {
    const play = (current, target) => {
      current.toTurn('Insider', 1);
      t.check(`the request to ${the(target)} is accepted`, current.send('Insider', { type: 'REQUEST_HACK', targetSeatId: current.seatOf(target) }), 'REGISTERED');
      current.close();
    };
    play(match, 'Supplier');
    t.check('the phase after the turn', match.phase().kind, 'HACK');
    t.check('its length', match.phase().length, 60000);
    const views = match.views();
    t.check('the public view names the initiator as the active player', views.public.activeSeatId, match.seatOf('Insider'));
    t.check('the initiator reads the partner', views.players[match.seatOf('Insider')].hackPartnerSeatId, match.seatOf('Supplier'));
    t.check('the partner reads the initiator', views.players[match.seatOf('Supplier')].hackPartnerSeatId, match.seatOf('Insider'));
    t.check('nobody else reads a partner', match.ids.filter(id => ![match.seatOf('Insider'), match.seatOf('Supplier')].includes(id)).every(id => views.players[id].hackPartnerSeatId === null), true);
    const other = twin();
    play(other, 'Hacker');
    const others = other.views();
    t.check('with another partner the public view is the same', canonical(views.public) === canonical(others.public), true);
    t.check('and so is the view of a player in the other room', canonical(views.players[match.seatOf('Cracker')]) === canonical(others.players[other.seatOf('Cracker')]), true);
  },
});
control('V13-03', 'A move is accepted during the last player\'s Hack and refused in the Jail vote', {
  sources: ['R-MOVE-01', 'R-FLOW-06'], changes: ['MOV-04', 'MOV-05'], contrast: 'V15',
  note: 'The next version closes voluntary movement when the final ordinary turn ends, before that Hack.',
  run(match, t) {
    const last = match.facts.last;
    const partner = match.facts.officer ? 'Hacker' : 'Undercover';
    match.toTurn(last, 1);
    t.check('the last player\'s Hack request is accepted', match.send(last, { type: 'REQUEST_HACK', targetSeatId: match.seatOf(partner) }), 'REGISTERED');
    match.close();
    t.check('the phase after the last turn', match.phase().kind, 'HACK');
    t.check('a move during that Hack', match.send('Cracker', { type: 'MOVE', destination: 'Room B' }), 'REGISTERED');
    t.check('the Insider is offered Room A during that Hack', match.views().players[match.seatOf('Insider')].self.movementDestinations.includes('Room A'), true);
    match.close();
    t.check('the phase after that Hack', match.phase().kind, 'JAIL_VOTE');
    t.check('the Insider is offered nothing in the Jail vote', match.views().players[match.seatOf('Insider')].self.movementDestinations.length, 0);
    t.check('a move in the Jail vote', match.send('Insider', { type: 'MOVE', destination: 'Room A' }), 'NOT_ALLOWED');
  },
});
control('V13-04', 'A move while a Captain election is being held', {
  sources: ['R-MOVE-08'], changes: ['MOV-14'],
  note: 'The rulebook leaves this open (D16), so nothing is expected here: what the engine does is recorded. The packet does not say what the next version does (NV-F-05).',
  run(match, t) {
    match.toPhase('CAPTAIN_ELECTION', 2);
    t.record('the Cracker is offered a destination during the election', match.views().players[match.seatOf('Cracker')].self.movementDestinations.includes('Room B'));
    t.record('a move sent during the election', match.send('Cracker', { type: 'MOVE', destination: 'Room B' }));
    t.record('the round whose move it used', match.state.round);
  },
});
control('V13-05', 'A Disabler names a player on their own turn, and an injury does not kill with time', {
  sources: ['R-ROLE-05', 'R-ACT-07', 'R-STATE-02', 'R-STATE-06'], changes: ['BLK-02', 'HSP-01'],
  note: 'In the next version the Disabler names no player, and the patient dies at the end of the following round.',
  run(match, t) {
    match.toTurn('Blue Disabler', 1);
    t.check('the Disable names a player in the same room and is accepted', match.send('Blue Disabler', { type: 'DISABLE', targetSeatId: match.seatOf('Undercover') }), 'REGISTERED');
    t.check('the use is spent when it is accepted', match.seat('Blue Disabler').disablerSpent, true);
    match.until(current => current.round === 2, 'Round 2');
    t.check('the target is Injured after Round 1', match.seat('Undercover').health, 'Injured');
    t.check('and in Hospital', match.seat('Undercover').location, 'Hospital');
    match.until(current => current.round === 5 && current.phase.kind === 'ORDINARY_TURN', 'the first turn of Round 5');
    t.check('three rounds later, with no Rescue, the target is still Injured', match.seat('Undercover').health, 'Injured');
  },
});
control('V13-06', 'A player who is Jailed and Injured is in Jail', {
  sources: ['R-STATE-07', 'R-ACT-05', 'R-ACT-06'], changes: ['HSP-02'],
  note: 'In the next version such a player is in Hospital and stays detained.',
  run(match, t) {
    match.toTurn('Blue Disabler', 1);
    t.check('the Disable is accepted', match.send('Blue Disabler', { type: 'DISABLE', targetSeatId: match.seatOf('Undercover') }), 'REGISTERED');
    match.toPhase('JAIL_VOTE', 1);
    t.check('the ballots are accepted', match.ballots('Undercover', match.facts.need).every(answer => answer === 'REGISTERED'), true);
    match.until(current => current.round === 2, 'Round 2');
    const seat = match.seat('Undercover');
    t.check('health', seat.health, 'Injured');
    t.check('Jailed', seat.jailed, true);
    t.check('location', seat.location, 'Jail');
  },
});
control('V13-07', 'A block is read by Undercover and by nobody else', {
  sources: ['R-PROT-06', 'R-VIEW-06', 'R-PROT-03'], changes: ['DEF-01', 'DEF-03'],
  note: 'In the next version the seats in the target\'s room are told that an attack was blocked.',
  run(match, t, twin) {
    const play = (current, attack) => {
      current.toTurn('Undercover', 1);
      t.check('the grant is accepted', current.send('Undercover', { type: 'PROTECT', targetSeatId: current.seatOf('Cracker') }), 'REGISTERED');
      current.toTurn('Blue Disabler', 2);
      if (attack) t.check('the Disable is accepted', current.send('Blue Disabler', { type: 'DISABLE', targetSeatId: current.seatOf('Cracker') }), 'REGISTERED');
      current.until(state => state.round === 3, 'Round 3');
    };
    play(match, true);
    const quiet = twin();
    play(quiet, false);
    t.check('the attacked player is Healthy', match.seat('Cracker').health, 'Healthy');
    t.check('the Protection is used up', match.seat('Cracker').protection?.consumed, true);
    const [a, b] = [match.views(), quiet.views()];
    t.check('the public view is the same as in a run without the attack', canonical(a.public) === canonical(b.public), true);
    t.check('the attacked player\'s view is the same', canonical(a.players[match.seatOf('Cracker')]) === canonical(b.players[quiet.seatOf('Cracker')]), true);
    t.check('a room-mate\'s view is the same', canonical(a.players[match.seatOf('Alien')]) === canonical(b.players[quiet.seatOf('Alien')]), true);
    t.check('Undercover\'s view differs', canonical(a.players[match.seatOf('Undercover')]) === canonical(b.players[quiet.seatOf('Undercover')]), false);
  },
});
control('V13-08', 'A release takes the Captain\'s choice and then a vote', {
  sources: ['R-VOTE-05', 'R-VOTE-06', 'R-VOTE-07', 'R-FLOW-13'], changes: ['CAP-01'],
  note: 'The next version has no release ballot: the Captain releases every prisoner at once, on their own turn.',
  run(match, t) {
    match.toPhase('JAIL_VOTE', 1);
    match.ballots('Undercover', match.facts.need);
    match.toPhase('CAPTAIN_ELECTION', 2);
    match.ballots('Insider', 2);
    match.until(current => current.round === 2 && current.phase.kind !== 'CAPTAIN_ELECTION', 'the turns of Round 2');
    t.check('the Insider is Captain', match.seat('Insider').captain, true);
    match.until(current => current.phase.kind !== 'ORDINARY_TURN', 'the end of the turns of Round 2');
    t.check('after the turns the Captain is asked', match.phase().kind, 'RELEASE_CHOICE');
    t.check('the choice is accepted', match.send('Insider', { type: 'RELEASE_CHOICE', targetSeatId: match.seatOf('Undercover') }), 'REGISTERED');
    match.close();
    t.check('then everybody votes', match.phase().kind, 'RELEASE_VOTE');
    t.check('the prisoner is still in Jail during the vote', match.seat('Undercover').jailed, true);
    const voters = match.state.eligibleVoters.slice(0, match.facts.need);
    t.check('the approvals are accepted', voters.every(id => match.send(id, { type: 'RELEASE_VOTE', approve: true }) === 'REGISTERED'), true);
    match.close();
    t.check('released when the vote closes', match.seat('Undercover').jailed, false);
    t.check('back in the room they were last in', match.seat('Undercover').location, 'Room A');
    t.check('the Jail vote follows', match.phase().kind, 'JAIL_VOTE');
  },
});
control('V13-09', 'The showdown moves everybody who is left to the Final Zone', {
  sources: ['R-SHOW-01', 'R-SHOW-02', 'R-WIN-10'], changes: ['SHW-01'],
  note: 'In the next version nobody is moved: players stay in their rooms, Hospital and Jail included.',
  run(match, t) {
    const jailed = match.mode === 8 ? ['Insider', 'Supplier'] : ['Insider', 'Supplier', 'Cracker'];
    jailed.forEach((role, index) => {
      match.toPhase('JAIL_VOTE', index + 1);
      t.check(`the ballots of Round ${index + 1} are accepted`, match.ballots(role, match.facts.need).every(answer => answer === 'REGISTERED'), true);
    });
    match.until(current => current.phase.kind === 'SHOWDOWN' || current.phase.endsAt === null, 'the end of Round 5');
    t.check('no winner after Round 5: the showdown opens', match.phase().kind, 'SHOWDOWN');
    t.check('every player is in the Final Zone', match.state.seats.every(seat => seat.location === 'Final Zone'), true);
    t.check('the prisoners are still Jailed there', jailed.every(role => match.seat(role).jailed), true);
  },
});
control('V13-10', 'An Eliminated player\'s faction is public in the first phase after the resolution', {
  sources: ['R-RES-05', 'R-VIEW-03'], changes: ['CAP-02'],
  note: 'After an EJECT the next version shows a player as Eliminated before it shows their faction; today\'s public view cannot hold that.',
  run(match, t) {
    match.toTurn('Blue Disabler', 4);
    t.check('the Disable is accepted', match.send('Blue Disabler', { type: 'DISABLE', targetSeatId: match.seatOf('Alien') }), 'REGISTERED');
    match.toTurn('Undercover', 4);
    t.check('the shot is accepted', match.send('Undercover', { type: 'REGISTER_SHOT', targetSeatId: match.seatOf('Alien') }), 'REGISTERED');
    match.until(current => current.round === 5, 'Round 5');
    const seat = publicSeat(match.views().public, match.seatOf('Alien'));
    t.check('public health', seat.health, 'Eliminated');
    t.check('public faction, in the same view', seat.revealedFaction, 'Alien');
  },
});

control('V14-01', 'A Jail vote ends in a result of five seconds; what it decides applies at once, and the round resolves afterwards', {
  sources: ['VOTE-RESULT-01', 'VOTE-RESULT-02', 'VOTE-RESULT-03'], changes: ['BLK-01', 'VOT-01'], contrast: 'V13',
  note: 'The next version keeps this and puts the fifteen-second window between the result and the resolution.',
  run(match, t, twin) {
    // The same vote by two different sets of voters: the first who may vote, and the last.
    const play = (current, pick) => {
      current.toTurn('Blue Disabler', 1);
      t.check('the Disable is accepted', current.send('Blue Disabler', { type: 'DISABLE', targetSeatId: current.seatOf('Alien') }), 'REGISTERED');
      current.toPhase('JAIL_VOTE', 1);
      const target = current.seatOf('Undercover');
      const voters = pick(current.state.eligibleVoters.filter(id => id !== target));
      t.check('the ballots are accepted', voters.every(id => current.send(id, { type: 'VOTE', targetSeatId: target }) === 'REGISTERED'), true);
      const closing = current.phase().endsAt;
      current.close();
      return { closing, voters, views: current.views() };
    };
    const need = match.facts.need;
    const first = play(match, able => able.slice(0, need));
    const closing = first.closing;
    t.check('the phase after the Jail vote', match.phase().kind, 'VOTE_RESULT');
    t.check('it opens at the closing of the vote', match.phase().startedAt, closing);
    t.check('its length', match.phase().length, 5000);
    t.check('the player is Jailed during the result', match.seat('Undercover').jailed, true);
    t.check('and in Jail', match.seat('Undercover').location, 'Jail');
    t.check('the registered attack has not resolved yet', match.seat('Alien').health, 'Healthy');
    const view = first.views.public;
    t.check('the outcome is public', view.voteResult?.outcome, 'PLAYER_JAILED');
    t.check('with the player it names', view.voteResult?.selectedSeatId, match.seatOf('Undercover'));
    t.check('and the total for that player', view.voteResult?.counts?.[match.seatOf('Undercover')], need);
    // Who voted is in no payload: with other voters and the same total, nobody can tell the runs apart.
    const second = play(twin(), able => able.slice(-need));
    const both = first.voters.filter(id => second.voters.includes(id));
    t.check('the twin run was voted by other players', canonical(first.voters) === canonical(second.voters), false);
    t.check('with other voters and the same total the public view is the same', canonical(view) === canonical(second.views.public), true);
    t.check('and so is the view of each player who voted in both runs', both.length > 0 && both.every(id => canonical(first.views.players[id]) === canonical(second.views.players[id])), true);
    match.close();
    t.check('after the result the attack has resolved', match.seat('Alien').health, 'Injured');
    t.check('the next phase', match.phase().kind, 'CAPTAIN_ELECTION');
    t.check('opens when the result ends', match.phase().startedAt, closing + 5000);
  },
});
control('V14-02', 'Nothing is accepted during a result', {
  sources: ['VOTE-RESULT-04'], changes: ['VOT-03'], contrast: 'V13',
  note: 'The next version keeps this for the result. For the window after it the packet does not say whether a Code is accepted (NV-F-07).',
  run(match, t) {
    match.toPhase('JAIL_VOTE', 1);
    match.close();
    t.check('the result of Round 1 is open', match.phase().kind, 'VOTE_RESULT');
    t.check('a move', match.send('Cracker', { type: 'MOVE', destination: 'Room B' }), 'NOT_ALLOWED');
    t.check('a ballot', match.send('Cracker', { type: 'VOTE', targetSeatId: null }), 'NOT_ALLOWED');
    t.check('no destination is offered', match.views().players[match.seatOf('Cracker')].self.movementDestinations.length, 0);
    match.toPhase('JAIL_VOTE', 5);
    t.check('in the Jail vote of Round 5 the Hacker can still enter the Code', match.views().players[match.seatOf('Hacker')].self.codeAttemptAvailable, true);
    match.close();
    t.check('the result of Round 5 is open', match.phase().kind, 'VOTE_RESULT');
    t.check('the Code is not on offer during it', match.views().players[match.seatOf('Hacker')].self.codeAttemptAvailable, false);
    t.check('a Code sent during it', match.send('Hacker', { type: 'SUBMIT_CODE', seatIds: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] }), 'NOT_ALLOWED');
    t.check('the attempt is not used', match.state.codeSubmitted, false);
  },
});
control('V14-03', 'A closure that comes late takes nothing from the phase after it', {
  sources: ['VOTE-RESULT-04', 'VOTE-RESULT-05'], changes: ['VOT-02'], contrast: 'V13',
  note: 'The next version must hold the same for the result, both halves of the window and the phase after the resolution.',
  run(match, t) {
    match.toPhase('JAIL_VOTE', 1);
    const due = match.phase().endsAt;
    t.check('asked one millisecond early, the vote stays open', match.close(-1), false);
    match.close(2000);
    t.check('closed two seconds late, the result opens then', match.phase().startedAt, due + 2000);
    t.check('and lasts its five seconds', match.phase().length, 5000);
    const resultDue = match.phase().endsAt;
    t.check('asked one millisecond early, the result stays open', match.close(-1), false);
    match.close(3000);
    t.check('closed three seconds late, the next phase opens then', match.phase().startedAt, resultDue + 3000);
    t.check('and has its sixty seconds', match.phase().length, 60000);
  },
});
control('V14-04', 'An election and its runoff each end in a result, and the elected Captain is placed when the vote closes', {
  sources: ['VOTE-RESULT-01', 'VOTE-RESULT-03', 'R-CAPT-02', 'R-CAPT-05'], changes: ['VOT-04', 'VOT-01'], contrast: 'V13',
  note: 'Kept by the next version.',
  run(match, t) {
    match.toPhase('CAPTAIN_ELECTION', 2);
    const [first, second, third, fourth, fifth] = match.state.eligibleVoters;
    for (const [voter, target] of [[first, 'Insider'], [second, 'Insider'], [third, 'Cracker'], [fourth, 'Cracker']]) match.send(voter, { type: 'VOTE', targetSeatId: match.seatOf(target) });
    match.close();
    t.check('a tie ends in a result', match.phase().kind, 'VOTE_RESULT');
    t.check('that says a runoff is needed', match.views().public.voteResult?.outcome, 'RUNOFF_REQUIRED');
    t.check('nobody is Captain yet', match.state.seats.some(seat => seat.captain), false);
    match.close();
    t.check('then the runoff', match.phase().kind, 'CAPTAIN_ELECTION');
    t.check('between the two who tied', canonical([...match.state.eligibleTargets].sort()), canonical([match.seatOf('Insider'), match.seatOf('Cracker')].sort()));
    t.check('with its sixty seconds', match.phase().length, 60000);
    for (const voter of [first, second, fifth]) match.send(voter, { type: 'VOTE', targetSeatId: match.seatOf('Insider') });
    match.close();
    t.check('the runoff ends in a result', match.phase().kind, 'VOTE_RESULT');
    t.check('that names the winner', match.views().public.voteResult?.outcome, 'CAPTAIN_ELECTED');
    t.check('who is Captain during the result', match.seat('Insider').captain, true);
    t.check('and in Command Room', match.seat('Insider').location, 'Command Room');
    match.close();
    t.check('then the first turn of Round 2', match.phase().kind, 'ORDINARY_TURN');
    t.check('with its sixty seconds', match.phase().length, 60000);
  },
});
control('V14-05', 'A vote in which nobody votes still ends in a result', {
  sources: ['VOTE-RESULT-01'], changes: ['BLK-01'], contrast: 'V13',
  note: 'Kept by the next version.',
  run(match, t) {
    match.toPhase('JAIL_VOTE', 1);
    match.close();
    t.check('after a Jail vote without ballots', match.phase().kind, 'VOTE_RESULT');
    t.check('the outcome', match.views().public.voteResult?.outcome, 'NO_JAIL_SELECTION');
    match.close();
    t.check('then the election', match.phase().kind, 'CAPTAIN_ELECTION');
    match.close();
    t.check('after an election without ballots', match.phase().kind, 'VOTE_RESULT');
    t.check('the outcome', match.views().public.voteResult?.outcome, 'NO_CAPTAIN_ELECTED');
    match.close();
    t.check('then the first turn of Round 2', match.phase().kind, 'ORDINARY_TURN');
  },
});
control('V14-06', 'A release vote ends in a result, and the Jail vote after it has its full time', {
  sources: ['VOTE-RESULT-01', 'VOTE-RESULT-03', 'R-VOTE-06'], changes: ['CAP-01'], contrast: 'V13',
  note: 'The next version has no release vote.',
  run(match, t) {
    match.toPhase('JAIL_VOTE', 1);
    match.ballots('Undercover', match.facts.need);
    match.toPhase('CAPTAIN_ELECTION', 2);
    match.ballots('Insider', 2);
    match.toPhase('RELEASE_CHOICE', 2);
    t.check('the choice is accepted', match.send('Insider', { type: 'RELEASE_CHOICE', targetSeatId: match.seatOf('Undercover') }), 'REGISTERED');
    match.close();
    const voters = match.state.eligibleVoters.slice(0, match.facts.need);
    t.check('the approvals are accepted', voters.every(id => match.send(id, { type: 'RELEASE_VOTE', approve: true }) === 'REGISTERED'), true);
    match.close();
    t.check('the release vote ends in a result', match.phase().kind, 'VOTE_RESULT');
    t.check('the outcome', match.views().public.voteResult?.outcome, 'PLAYER_RELEASED');
    t.check('the player is free during the result', match.seat('Undercover').jailed, false);
    match.close();
    t.check('then the Jail vote', match.phase().kind, 'JAIL_VOTE');
    t.check('with its sixty seconds', match.phase().length, 60000);
  },
});

const openHack = (match, t, initiator, target, round = 1) => {
  match.toTurn(initiator, round);
  t.check(`${the(initiator)}'s request to ${the(target)} is accepted`, match.send(initiator, { type: 'REQUEST_HACK', targetSeatId: match.seatOf(target) }), 'REGISTERED');
  const due = match.phase().endsAt;
  match.close();
  return due;
};
control('V15-01', 'Fifteen, five, sixty: a declaration ends the first stage early', {
  sources: ['HACK-DECLARE-01', 'HACK-DECLARE-03', 'HACK-DECLARE-06'], changes: ['HCK-03'], contrast: 'V14',
  note: 'Kept by the next version, which fits the entrance into the five seconds.',
  run(match, t) {
    const opened = openHack(match, t, 'Insider', 'Supplier');
    t.check('the phase after the turn', match.phase().kind, 'HACK_DECLARE');
    t.check('it opens when the turn closes', match.phase().startedAt, opened);
    t.check('its length', match.phase().length, 15000);
    t.check('the active player stays the initiator', match.phase().active, match.seatOf('Insider'));
    t.check('the declaration, four seconds in', match.send('Supplier', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }, 4000), 'REGISTERED');
    t.check('the result opens at the declaration', match.phase().kind === 'HACK_RESULT' && match.phase().startedAt === opened + 4000, true);
    t.check('its length', match.phase().length, 5000);
    t.check('the active player stays the initiator', match.phase().active, match.seatOf('Insider'));
    match.close();
    t.check('then the conversation', match.phase().kind, 'HACK');
    t.check('opening when the result ends', match.phase().startedAt, opened + 9000);
    t.check('its length', match.phase().length, 60000);
    match.close();
    t.check('then the next player\'s turn', match.phase().kind === 'ORDINARY_TURN' && match.phase().active === match.seatOf('Cracker'), true);
    t.check('with its sixty seconds', match.phase().length, 60000);
  },
});
control('V15-02', 'No declaration: the result says so and makes up no side', {
  sources: ['HACK-DECLARE-03'], changes: ['HCK-04'], contrast: 'V14',
  note: 'Kept by the next version.',
  run(match, t) {
    const opened = openHack(match, t, 'Insider', 'Supplier');
    t.check('asked one millisecond before the fifteen seconds, the stage stays open', match.close(-1), false);
    match.close();
    t.check('after fifteen seconds without a declaration', match.phase().kind === 'HACK_RESULT' && match.phase().startedAt === opened + 15000, true);
    const views = match.views().players;
    for (const role of ['Insider', 'Supplier']) {
      t.check(`${the(role)} reads that no side was declared`, views[match.seatOf(role)].hackFeedback?.status, 'NO_DECLARATION');
      t.check(`and ${the(role)} reads no side`, views[match.seatOf(role)].hackFeedback?.declaredSide, null);
    }
    t.check('its length', match.phase().length, 5000);
    match.close();
    t.check('then the conversation, sixty seconds', match.phase().kind === 'HACK' && match.phase().length === 60000, true);
  },
});
control('V15-03', 'Who may declare what', {
  sources: ['HACK-DECLARE-02', 'R-ROLE-12', 'R-ROLE-16'], changes: ['HCK-02'], contrast: 'V14',
  note: 'Kept by the next version.',
  run(match, t, twin) {
    openHack(match, t, 'Insider', 'Supplier');
    t.check('the initiator cannot declare', match.send('Insider', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), 'NOT_ALLOWED');
    t.check('a Blue player declaring Red', match.send('Supplier', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Red' }), 'NOT_ALLOWED');
    t.check('the stage is still open', match.phase().kind, 'HACK_DECLARE');
    t.check('a Blue player declaring Blue', match.send('Supplier', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), 'REGISTERED');
    const red = twin();
    openHack(red, t, 'Cracker', 'Undercover');
    t.check('Undercover declaring Blue', red.send('Undercover', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' }), 'REGISTERED');
    const alien = twin();
    openHack(alien, t, 'Cracker', 'Alien');
    t.check('the Alien declaring Red', alien.send('Alien', { type: 'DECLARE_HACK_SIDE', declaredSide: 'Red' }), 'REGISTERED');
  },
});
control('V15-04', 'The claim and the partner are read by the two only', {
  sources: ['HACK-DECLARE-04', 'R-VIEW-07'], changes: ['HCK-01', 'HCK-02'], contrast: 'V14',
  note: 'The next version keeps the claim private and makes the pair public.',
  run(match, t, twin) {
    const play = (current, target, side) => {
      openHack(current, t, 'Cracker', target);
      t.check(`${the(target)} declares ${side}`, current.send(target, { type: 'DECLARE_HACK_SIDE', declaredSide: side }, 4000), 'REGISTERED');
      return current.views();
    };
    const blue = play(match, 'Undercover', 'Blue');
    const pair = [match.seatOf('Cracker'), match.seatOf('Undercover')];
    for (const id of pair) t.check(`${id === pair[0] ? 'the initiator' : 'the target'} reads the declared side`, blue.players[id].hackFeedback?.declaredSide, 'Blue');
    t.check('nobody else reads any feedback', match.ids.filter(id => !pair.includes(id)).every(id => blue.players[id].hackFeedback === null), true);
    t.check('nobody else reads a partner', match.ids.filter(id => !pair.includes(id)).every(id => blue.players[id].hackPartnerSeatId === null), true);
    t.check('the public view has no feedback field', 'hackFeedback' in blue.public, false);
    const other = twin();
    const red = play(other, 'Undercover', 'Red');
    t.check('with the other side declared the public view is the same', canonical(blue.public) === canonical(red.public), true);
    t.check('and every uninvolved player\'s view is the same', match.ids.filter(id => !pair.includes(id)).every(id => canonical(blue.players[id]) === canonical(red.players[id])), true);
    const third = twin();
    const alien = play(third, 'Alien', 'Blue');
    const involved = [...pair, match.seatOf('Alien')];
    t.check('with another target the public view is the same', canonical(blue.public) === canonical(alien.public), true);
    t.check('and so is the view of every player who is in neither pair', match.ids.filter(id => !involved.includes(id)).every(id => canonical(blue.players[id]) === canonical(alien.players[id])), true);
  },
});
control('V15-05', 'A move is accepted in each of the three stages, also in the last player\'s Hack', {
  sources: ['HACK-DECLARE-06', 'R-MOVE-01'], changes: ['MOV-03', 'MOV-05'], contrast: 'V14',
  note: 'The next version keeps the first and reverses the second: after the final ordinary turn nobody moves.',
  run(match, t) {
    const last = match.facts.last;
    openHack(match, t, last, match.facts.officer ? 'Hacker' : 'Undercover');
    t.check('declaration stage', match.phase().kind, 'HACK_DECLARE');
    t.check('a move in it', match.send('Cracker', { type: 'MOVE', destination: 'Room B' }), 'REGISTERED');
    match.close();
    t.check('result stage', match.phase().kind, 'HACK_RESULT');
    t.check('a move in it', match.send('Insider', { type: 'MOVE', destination: 'Room A' }), 'REGISTERED');
    match.close();
    t.check('conversation stage', match.phase().kind, 'HACK');
    t.check('a move in it', match.send('Blue Disabler', { type: 'MOVE', destination: 'Room B' }), 'REGISTERED');
    match.close();
    t.check('the Jail vote follows', match.phase().kind, 'JAIL_VOTE');
  },
});
control('V15-06', 'Deadlines that come late take nothing from the stage after them', {
  sources: ['HACK-DECLARE-07', 'HACK-DECLARE-03'], changes: ['HCK-06'], contrast: 'V14',
  note: 'Kept by the next version.',
  run(match, t) {
    const opened = openHack(match, t, 'Insider', 'Supplier');
    match.close(2000);
    t.check('declaration closed two seconds late: the result opens then', match.phase().kind === 'HACK_RESULT' && match.phase().startedAt === opened + 17000, true);
    t.check('and lasts five seconds', match.phase().length, 5000);
    match.close(2000);
    t.check('result closed two seconds late: the conversation opens then', match.phase().kind === 'HACK' && match.phase().startedAt === opened + 24000, true);
    t.check('and lasts sixty seconds', match.phase().length, 60000);
  },
});
control('V15-07', 'A Code is refused in the two preludes and accepted in the conversation', {
  sources: ['HACK-DECLARE-06', 'R-ROLE-15'], changes: ['VOT-03'], contrast: 'V14',
  note: 'Kept by the next version. Whether a Code is accepted in the window after the vote is not stated (NV-F-07).',
  run(match, t) {
    const code = { type: 'SUBMIT_CODE', seatIds: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] };
    openHack(match, t, 'Insider', 'Supplier', 5);
    t.check('a Code in the declaration stage', match.send('Hacker', code), 'NOT_ALLOWED');
    match.close();
    t.check('a Code in the result stage', match.send('Hacker', code), 'NOT_ALLOWED');
    t.check('the attempt is still unused', match.state.codeSubmitted, false);
    match.close();
    t.check('a Code in the conversation', match.send('Hacker', code), 'REGISTERED');
    t.check('the attempt is used', match.state.codeSubmitted, true);
  },
});

export const CONTROLS = Object.freeze(controls.map(item => Object.freeze({ ...item, version: item.code.split('-')[0] })));
export const controlId = (mode, code) => `CTL-M${mode}-${code}`;
export const controlsOf = version => CONTROLS.filter(item => item.version === version);

/**
 * Run every control of one ruleset for one number of players.
 * @returns {{ id: string, code: string, mode: number, title: string, status: 'passed' | 'failed' | 'recorded', checks: object[], records: object[], error: string | null, phasesClosed: number, commandsSent: number }[]}
 */
/** One control under one tuple. The verdict is the checks': a line that stops early has failed. */
function runOne(engine, item, tuple, mode) {
  const checks = [];
  const records = [];
  const matches = [];
  const open = () => { const match = openMatch(engine, tuple, mode); matches.push(match); return match; };
  const t = {
    check(label, observed, expected) { checks.push({ label, expected, observed: observed === undefined ? '(nothing)' : observed, ok: observed !== undefined && canonical(observed) === canonical(expected) }); },
    record(label, observed) { records.push({ label, observed: observed === undefined ? '(nothing)' : observed }); },
  };
  let error = null;
  try {
    item.run(open(), t, open);
  } catch (problem) {
    error = problem instanceof Error ? problem.message : String(problem);
  }
  const failed = error !== null || checks.some(check => !check.ok);
  // A control that expects nothing has shown nothing: it is recorded, never passed.
  const status = failed ? 'failed' : checks.length === 0 ? 'recorded' : 'passed';
  const counters = matches.reduce((sum, match) => ({ phasesClosed: sum.phasesClosed + match.counters.phasesClosed, commandsSent: sum.commandsSent + match.counters.commandsSent }), { phasesClosed: 0, commandsSent: 0 });
  return { id: controlId(mode, item.code), code: item.code, mode, title: item.title, status, checks, records, error, ...counters };
}

export function runControls(engine, version, mode) {
  const tuple = tupleFor(engine, RULESETS[version]);
  if (tuple === null) throw new Error(`the engine does not name ${RULESETS[version]}`);
  return controlsOf(version).map(item => runOne(engine, item, tuple, mode));
}

// The controls that say two runs look the same to somebody, and what an engine would have to
// publish for them to be wrong. Each leak adds one fact to the public view and changes no rule.
const LEAKS = Object.freeze([
  { leak: 'who cast a ballot', code: 'V14-01', add: (state, memory) => ({ whoVoted: memory.voters }) },
  { leak: 'the partner of a Hack', code: 'V13-02', add: state => ({ partner: state.activeHack?.targetSeatId ?? null }) },
  { leak: 'the partner of a Hack', code: 'V15-04', add: state => ({ partner: state.activeHack?.targetSeatId ?? null }) },
]);

/**
 * A second control of the controls: the engine is wrapped so that its public view says one thing
 * it must not say, and the control that compares two runs has to fail on it, at a comparison.
 * @returns {{ id: string, code: string, mode: number, leak: string, detected: boolean, where: string | null }[]}
 */
export function runLeaks(engine, mode) {
  return LEAKS.filter(item => tupleFor(engine, RULESETS[item.code.split('-')[0]]) !== null).map(item => {
    const memory = new WeakMap();
    const recall = state => memory.get(state) ?? { voters: [] };
    const leaky = {
      ...engine,
      executeFullGame(state, actor, request, context) {
        const result = engine.executeFullGame(state, actor, request, context);
        const before = recall(state);
        memory.set(result.state, request.command.type === 'VOTE' && result.receipt.status === 'accepted' ? { voters: [...before.voters, actor] } : before);
        return result;
      },
      advanceFullGame(state, context) { const result = engine.advanceFullGame(state, context); memory.set(result.state, recall(state)); return result; },
      projectFullGame(state) { const views = engine.projectFullGame(state); return { ...views, public: { ...views.public, ...item.add(state, recall(state)) } }; },
    };
    const control = CONTROLS.find(candidate => candidate.code === item.code);
    const run = runOne(leaky, control, tupleFor(engine, RULESETS[control.version]), mode);
    const first = run.checks.find(check => !check.ok);
    // Caught only where a comparison of two runs fails; a control that fails anywhere else has shown nothing about the leak.
    return { id: controlId(mode, item.code), code: item.code, mode, leak: item.leak, detected: run.status === 'failed' && first !== undefined && /is the same/.test(first.label), where: first?.label ?? run.error };
  });
}

/**
 * The controls of the controls. A control that says what is particular to its version must fail
 * when the same engine is asked for the version it is contrasted with. Each such control is run
 * there on purpose; "detected" means it failed, as it must. This says nothing about that other
 * version: it shows that the control can tell the two apart.
 * @returns {{ id: string, code: string, mode: number, ownRuleset: string, runUnder: string, detected: boolean, firstDifference: string | null }[]}
 */
export function runContrasts(engine, mode) {
  return CONTROLS.filter(item => item.contrast !== undefined && tupleFor(engine, RULESETS[item.contrast]) !== null).map(item => {
    const run = runOne(engine, item, tupleFor(engine, RULESETS[item.contrast]), mode);
    const first = run.checks.find(check => !check.ok);
    return {
      id: controlId(mode, item.code), code: item.code, mode, ownRuleset: RULESETS[item.version], runUnder: RULESETS[item.contrast], detected: run.status === 'failed',
      firstDifference: first !== undefined ? `${first.label}: expected ${JSON.stringify(first.expected)}, observed ${JSON.stringify(first.observed)}` : run.error,
    };
  });
}
