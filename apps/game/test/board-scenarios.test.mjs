import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, playerView } from '../dev/board/scenarios.mjs';

// The board simulation (apps/game/dev/board/) is evidence only where what a scenario offers is
// what the engine could offer in that state. The engine is not a dependency of the client, so
// its gates are restated here from packages/engine/src/full-game/lifecycle.ts (at 94a49ce).
// What a view does not show (a Main Action already used, a Hack already requested, a move
// already made) can explain an offer that is absent, so an absent offer is accepted unless
// nothing private could withhold it. A scenario that says it is unreachable is excused only
// from the reachability checks at the end.

const NOW = 1_800_000_000_000;
const alive = seat => seat.health !== 'Eliminated';
const ready = seat => seat.health === 'Healthy' && !seat.jailed;
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function problemsOf(definition) {
  const view = playerView(definition, NOW);
  const phase = view.phase.kind;
  const self = view.seats.find(seat => seat.seatId === view.self.seatId);
  const actor = { ...self, role: view.self.role };
  const ids = filter => view.seats.filter(filter).map(seat => seat.seatId);
  const seatOf = id => view.seats.find(seat => seat.seatId === id);
  const local = (target, selfAllowed, remoteRescue = false) => alive(target) && (selfAllowed || target.seatId !== actor.seatId) && target.location !== 'Command Room'
    && (target.location === actor.location || (remoteRescue && actor.role === 'Cracker' && ['Room A', 'Room B'].includes(actor.location) && target.location === 'Hospital'));
  const ownTurn = phase === 'ORDINARY_TURN' && view.activeSeatId === actor.seatId;
  const passRules = view.versions.rulesetVersion === 'in-person-v1-pass-2026-10-08';
  const problems = [];

  // Each command: whether its gate opens in this state, and the targets the engine would list.
  const gates = {
    PASS_TURN: [ownTurn && alive(actor) && passRules, [actor.seatId]],
    REGISTER_SHOT: [ownTurn && ready(actor) && view.self.ordinaryWeapons > 0 && (actor.role === 'Officer' || view.round >= 4), ids(seat => local(seat, false))],
    REQUEST_HACK: [ownTurn && alive(actor), ids(seat => local(seat, false))],
    DISABLE: [ownTurn && ready(actor) && /Disabler$/.test(actor.role), ids(seat => local(seat, false))],
    PROTECT: [ownTurn && ready(actor) && actor.role === 'Undercover', ids(seat => local(seat, true))],
    SUPPLY: [ownTurn && ready(actor) && actor.role === 'Supplier' && view.round === 3, ids(seat => local(seat, true))],
    SCAN: [ownTurn && ready(actor) && actor.role === 'Hacker', ids(seat => local(seat, true))],
    RESCUE: [ownTurn && actor.role === 'Cracker' && alive(actor) && !actor.jailed && view.self.rescuesRemaining > 0,
      ids(seat => local(seat, true, true) && (ready(actor) || seat.seatId === actor.seatId))],
    SHOWDOWN_SHOT: [phase === 'SHOWDOWN' && alive(actor), ids(seat => alive(seat) && seat.seatId !== actor.seatId)],
    VOTE: [['JAIL_VOTE', 'CAPTAIN_ELECTION'].includes(phase) && view.ballot.eligibleVoters.includes(actor.seatId), view.ballot.eligibleTargets],
    RELEASE_CHOICE: [phase === 'RELEASE_CHOICE' && view.activeSeatId === actor.seatId, view.ballot.eligibleTargets],
  };
  for (const [command, targets] of Object.entries(view.legalTargets)) {
    const [open, expected] = gates[command];
    if (!open) problems.push(`${command} offered where the engine does not open it`);
    else if (!same(targets, expected)) problems.push(`${command} offers ${[...targets].sort()}; the engine, ${[...expected].sort()}`);
  }
  // Nothing private withholds Pass on the player's own ordinary turn.
  if (gates.PASS_TURN[0] && !view.legalTargets.PASS_TURN) problems.push('Pass not offered on the player\'s own turn');
  if (view.self.codeAttemptAvailable && !(actor.role === 'Hacker' && alive(actor) && view.round === 5 && !['SHOWDOWN', 'FINISHED', 'ABORTED'].includes(phase))) {
    problems.push('a Code attempt offered outside a living Hacker\'s round 5');
  }

  // The public ballot.
  if (['JAIL_VOTE', 'CAPTAIN_ELECTION', 'RELEASE_VOTE'].includes(phase) && !same(view.ballot.eligibleVoters, ids(alive))) problems.push(`${phase}: the voters are not every living character`);
  if (phase === 'JAIL_VOTE' && !same(view.ballot.eligibleTargets, ids(seat => alive(seat) && !seat.jailed))) problems.push('JAIL_VOTE: the targets are not every living, free character');
  if (phase === 'CAPTAIN_ELECTION' && view.ballot.eligibleTargets.some(id => !ready(seatOf(id)))) problems.push('CAPTAIN_ELECTION: a candidate who is not Healthy and free');
  if (phase === 'RELEASE_CHOICE' && !same(view.ballot.eligibleTargets, ids(seat => alive(seat) && seat.jailed))) problems.push('RELEASE_CHOICE: the targets are not the living jailed');
  if (phase === 'RELEASE_CHOICE' && !seatOf(view.activeSeatId)?.captain) problems.push('RELEASE_CHOICE: the active character is not the Captain');
  if (phase === 'RELEASE_VOTE') {
    const subject = seatOf(view.ballot.releaseTargetSeatId);
    if (!subject || !alive(subject) || !subject.jailed) problems.push('RELEASE_VOTE: the subject is not a living jailed character');
  }

  // Movement: A and B for the Healthy and free before voting, and the Command Room for the Captain.
  const destinations = view.self.movementDestinations;
  const rooms = ['Room A', 'Room B', ...(actor.captain ? ['Command Room'] : [])].filter(room => room !== actor.location);
  if (destinations.length > 0 && !(['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION'].includes(phase) && ready(actor))) problems.push('movement offered where the engine does not allow it');
  else if (destinations.length > 0 && !same(destinations, rooms)) problems.push(`movement to ${[...destinations].sort()}; the engine, ${[...rooms].sort()}`);
  // An election opens its round, so nobody has moved yet.
  if (phase === 'CAPTAIN_ELECTION' && ready(actor) && destinations.length === 0) problems.push('CAPTAIN_ELECTION: no movement, though nobody has moved yet this round');

  // Reachability.
  if (!definition.unreachable) {
    if (phase === 'CAPTAIN_ELECTION' && view.round < 2) problems.push('an election in round 1: the first opens round 2');
    if (phase === 'CAPTAIN_ELECTION' && view.seats.some(seat => seat.captain)) problems.push('an election while there is a Captain');
    if (view.seats.some(seat => seat.location === 'Command Room' && !seat.captain)) problems.push('someone other than the Captain in the Command Room');
    if (view.seats.filter(seat => seat.jailed).length > view.round - (phase === 'SHOWDOWN' ? 0 : 1)) problems.push('more characters jailed than Jail votes so far');
  }
  return problems;
}

test('every board simulation scenario offers what the engine would offer in its state', () => {
  const found = Object.fromEntries(Object.entries(SCENARIOS).map(([id, definition]) => [id, problemsOf(definition)]).filter(([, problems]) => problems.length > 0));
  assert.deepEqual(found, {});
  // The states no match reaches are the board's crowd stress cases, and each says why.
  assert.deepEqual(Object.entries(SCENARIOS).filter(([, definition]) => definition.unreachable).map(([id]) => id).sort(), ['crowd-command', 'crowd-hospital', 'crowd-jail']);
});

test('the check refuses the mistakes a fixture can make', () => {
  const everyone = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const refuses = (definition, pattern) => assert.ok(problemsOf(definition).some(problem => pattern.test(problem)), `${pattern}: ${JSON.stringify(problemsOf(definition))}`);
  refuses({ ...SCENARIOS.code, round: 2 }, /a Code attempt offered outside a living Hacker's round 5/);
  refuses({ ...SCENARIOS.supply, round: 2 }, /SUPPLY offered where the engine does not open it/);
  refuses({ ...SCENARIOS.supply, offers: { ...SCENARIOS.supply.offers, supply: [1, 5, 8] } }, /SUPPLY offers seat-1,seat-5,seat-8; the engine/);
  refuses({ ...SCENARIOS.rescue, offers: { ...SCENARIOS.rescue.offers, rescue: [6] } }, /RESCUE offers seat-6; the engine/);
  refuses({ ...SCENARIOS.spread, offers: { ...SCENARIOS.spread.offers, move: ['Room B', 'Command Room'] } }, /movement to Command Room,Room B; the engine, Room B/);
  refuses({ ...SCENARIOS.shot, offers: { move: ['Room B'], shot: [1, 5, 8] } }, /Pass not offered/);
  refuses({ ...SCENARIOS.shot, offers: { ...SCENARIOS.shot.offers, shot: [1, 2, 5, 8] } }, /REGISTER_SHOT offers seat-1,seat-2,seat-5,seat-8; the engine/);
  refuses({ ...SCENARIOS.election, ballot: { voters: everyone, targets: everyone }, offers: { vote: everyone, move: ['Room B'] } }, /a candidate who is not Healthy and free/);
  refuses({ ...SCENARIOS.election, round: 1 }, /an election in round 1/);
  refuses({ ...SCENARIOS.election, offers: { vote: SCENARIOS.election.offers.vote } }, /no movement, though nobody has moved yet/);
  refuses({ ...SCENARIOS.jail, ballot: { voters: [1, 2, 3, 4, 5, 7, 8], targets: [1, 2, 3, 4, 5, 6, 7, 8] } }, /JAIL_VOTE: the voters are not every living character/);
  refuses({ ...SCENARIOS.jail, ballot: { voters: everyone, targets: [1, 2, 4, 5, 7, 8] }, offers: { vote: [1, 2, 4, 5, 7, 8] } }, /JAIL_VOTE: the targets are not every living, free character/);
  refuses({ ...SCENARIOS['release-vote'], ballot: { ...SCENARIOS['release-vote'].ballot, voters: [1, 2, 3, 4, 5, 6, 7, 8] } }, /RELEASE_VOTE: the voters/);
  refuses({ ...SCENARIOS['crowd-command'], unreachable: undefined }, /someone other than the Captain in the Command Room/);
  refuses({ ...SCENARIOS['crowd-jail'], unreachable: undefined }, /more characters jailed than Jail votes so far/);
});
