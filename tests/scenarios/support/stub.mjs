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
      undercoverSeat: seat.role === 'Hacker' ? seatOf('Undercover') : null, code: seat.role === 'Alien' ? [...code] : [], scanResults: [], protections: [],
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
 */
export function stubAdapter({ outcomes = [], mutate = null, refuseSetup = false } = {}) {
  return {
    pins: { adapter: 'stub', engineVersion: 'stub', rulesetVersion: 'stub', rulesetHash: 'stub', protocolVersion: 0 },
    createMatch(setup) {
      if (refuseSetup) throw new Error('stub refuses this setup');
      let observation = openingObservation(setup);
      let index = 0;
      return {
        observe: () => structuredClone(observation),
        command(actor, command) {
          const outcome = outcomes[index] ?? 'NOT_ALLOWED';
          index += 1;
          if (outcome === 'REGISTERED' && mutate !== null) observation = mutate(structuredClone(observation), actor, command);
          return outcome;
        },
        advance: () => false,
        abort() {},
      };
    },
  };
}
