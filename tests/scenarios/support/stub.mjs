// A scripted stand-in for an engine, used only to test the runner's own accounting and the
// invariant checks. It has no rules: it replays whatever outcomes and observations a test gives it.
import { expectedCode, factionOf, seatIdsFor } from '@mothership/balance';

/** A rule-consistent opening observation for a setup. Tests then bend it to provoke a check. */
export function openingObservation(setup) {
  const seats = seatIdsFor(setup.playerCount);
  const code = expectedCode(setup);
  const seatOf = role => seats[setup.roleOrder.indexOf(role)];
  const truthSeats = seats.map((seat, index) => {
    const role = setup.roleOrder[index];
    return {
      seat, role, faction: factionOf(role), health: 'Healthy', jailed: false, captain: false, location: setup.initialRooms[seat],
      lastRoom: setup.initialRooms[seat], ordinaryWeapons: role === 'Undercover' || role === 'Officer' ? 1 : 0, officerShotSpent: false,
      specialShotAvailable: false, movedThisRound: false, disablerSpent: false, rescuesRemaining: role === 'Cracker' ? 2 : 0, hackUsed: false,
      scannedThisRound: false, protection: 'none', protectionActiveFromRound: null, lifetimeProtectionReceived: false,
    };
  });
  const publicView = {
    round: 1, phaseKind: 'ORDINARY_TURN', activeSeat: setup.roundOrders[0][0],
    seats: truthSeats.map(seat => ({ seat: seat.seat, health: seat.health, location: seat.location, jailed: false, captain: false, revealedFaction: null })),
    eligibleVoters: [], eligibleTargets: [], releaseTarget: null, lastTally: null, result: null, endReveal: null,
  };
  const playerViews = Object.fromEntries(truthSeats.map(seat => [seat.seat, {
    seat: seat.seat, publicFacts: structuredClone(publicView), role: seat.role, ordinaryWeapons: seat.ordinaryWeapons, rescuesRemaining: seat.rescuesRemaining,
    legal: {}, moveDestinations: [], releaseVoteAvailable: false, codeAttemptAvailable: false, pendingCount: 0, ownBallot: null, hasVoted: false, hackPartner: null,
    knowledge: {
      insiderCandidates: seat.role === 'Insider' ? [seatOf('Undercover'), seatOf('Alien'), seatOf('Cracker')] : [],
      undercoverSeat: seat.role === 'Hacker' ? seatOf('Undercover') : null, code: seat.role === 'Alien' ? [...code] : [], scanResults: [], protections: [], armedBySupply: null,
    },
  }]));
  return {
    round: 1, phaseKind: 'ORDINARY_TURN', phaseId: 'phase-1', phaseStartedAt: 1_000_000, phaseEndsAt: 1_060_000, activeSeat: setup.roundOrders[0][0],
    terminal: false, result: null,
    truth: { code, codeSubmitted: false, codeCorrect: false, releaseUsed: false, hacksThisRound: 0, seats: truthSeats },
    publicView, playerViews,
    raw: { public: structuredClone(publicView), players: Object.fromEntries(Object.entries(playerViews).map(([seat, view]) => [seat, { role: view.role, public: structuredClone(publicView) }])) },
    revisions: { public: 0, players: Object.fromEntries(seats.map(seat => [seat, 0])) },
  };
}

/**
 * @param outcomes command outcomes returned in order; after the list ends every command is NOT_ALLOWED
 * @param mutate optional function applied to the observation after each accepted command
 * @param turns when true, a phase can be closed: the turn passes to the next player of Round 1, and
 *   after the last of them nothing closes any more. Without it no phase ever closes.
 * @param onTurn optional function applied to the observation after each such change of turn
 * @param receipt optional function that says what the sender of a command gets back for it
 */
export function stubAdapter({ outcomes = [], mutate = null, refuseSetup = false, turns = false, onTurn = null, receipt = null } = {}) {
  return {
    pins: { adapter: 'stub', engineVersion: 'stub', rulesetVersion: 'stub', rulesetHash: 'stub', protocolVersion: 0 },
    createMatch(setup) {
      if (refuseSetup) throw new Error('stub refuses this setup');
      let observation = openingObservation(setup);
      let index = 0;
      let phase = 1;
      const receipts = {};
      return {
        observe: () => ({ ...structuredClone(observation), raw: { ...structuredClone(observation.raw), receipts: structuredClone(receipts) } }),
        command(actor, command) {
          const outcome = outcomes[index] ?? 'NOT_ALLOWED';
          index += 1;
          (receipts[actor] ??= []).push(receipt === null ? { outcome } : receipt(actor, command, outcome, structuredClone(observation)));
          if (outcome === 'REGISTERED' && mutate !== null) observation = mutate(structuredClone(observation), actor, command);
          return outcome;
        },
        advance(atMs) {
          const order = setup.roundOrders[0];
          const next = turns ? order[order.indexOf(observation.activeSeat) + 1] : undefined;
          if (next === undefined) return false;
          phase += 1;
          observation = passTurn(structuredClone(observation), next, phase, atMs);
          if (onTurn !== null) observation = onTurn(observation, phase);
          return true;
        },
        abort() {},
      };
    },
  };
}

// The next player's turn, written into every copy of the public facts as an engine would write it.
function passTurn(observation, seat, phase, atMs) {
  observation.activeSeat = seat;
  observation.phaseId = `phase-${phase}`;
  observation.phaseStartedAt = atMs;
  observation.phaseEndsAt = atMs + 60_000;
  observation.publicView.activeSeat = seat;
  observation.raw.public.activeSeat = seat;
  observation.revisions.public += 1;
  for (const [player, view] of Object.entries(observation.playerViews)) {
    view.publicFacts.activeSeat = seat;
    observation.raw.players[player].public.activeSeat = seat;
    observation.revisions.players[player] += 1;
  }
  return observation;
}
