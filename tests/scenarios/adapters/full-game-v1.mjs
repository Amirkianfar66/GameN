// Binding from the neutral scenario adapter interface (@mothership/balance) to Backend's
// full-game engine API. It contains no game logic: it forwards commands, clocks and recorded
// random facts, and maps engine state and audience projections to neutral observations.
//
// The API it expects (createFullGame, executeFullGame, advanceFullGame, abortFullGame,
// projectFullGame) was first published on the draft branch codex/backend-v1-core. At the
// bootstrap baseline @mothership/engine exports none of these, and load() reports that the
// engine is unavailable so that no scenario can be reported as executed.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED = ['createFullGame', 'executeFullGame', 'advanceFullGame', 'abortFullGame', 'projectFullGame'];
// The name every report of a run through this binding carries. The report gate accepts no other.
export const ADAPTER_NAME = 'full-game-v1';
const FIXTURE_START = 1_800_000_000_000;

/** @returns {Promise<{available: true, adapter: object, origin: string} | {available: false, reason: string, origin: string}>} */
export async function load(engineRoot) {
  const origin = engineRoot ? join(engineRoot, 'packages/engine/dist/index.js') : '@mothership/engine';
  let engine;
  try {
    engine = await import(engineRoot ? pathToFileURL(origin).href : '@mothership/engine');
  } catch (error) {
    return { available: false, origin, reason: `engine module could not be loaded (${error.code ?? error.message}); build it first` };
  }
  const missing = REQUIRED.filter(name => typeof engine[name] !== 'function');
  if (missing.length > 0) {
    return { available: false, origin, reason: `the engine at this commit does not export the full-game API (${missing.join(', ')} missing)` };
  }
  return { available: true, origin, adapter: createAdapter(engine) };
}

function protectionState(seat, round, queued) {
  // The engine holds a grant as a queued command until the round resolves.
  if (seat.protection === null) {
    return queued.some(item => item.command.type === 'PROTECT' && item.command.targetSeatId === seat.seatId) ? 'pending' : 'none';
  }
  if (seat.protection.consumed) return 'consumed';
  return seat.protection.activeFromRound <= round ? 'active' : 'pending';
}

function publicFacts(view) {
  return {
    round: view.round, phaseKind: view.phase.kind, activeSeat: view.activeSeatId,
    seats: view.seats.map(seat => ({
      seat: seat.seatId, health: seat.health, location: seat.location, jailed: seat.jailed, captain: seat.captain,
      revealedFaction: seat.revealedFaction,
    })),
    eligibleVoters: [...view.ballot.eligibleVoters], eligibleTargets: [...view.ballot.eligibleTargets],
    releaseTarget: view.ballot.releaseTargetSeatId,
    lastTally: view.lastTally === null ? null : {
      kind: view.lastTally.kind, counts: { ...view.lastTally.counts }, eligibleVoterCount: view.lastTally.eligibleVoterCount,
      yesCount: view.lastTally.yesCount, selected: view.lastTally.selectedSeatId, released: view.lastTally.released,
    },
    result: view.result === null ? null : { winner: view.result.winner, alienCoWinner: view.result.alienCoWinner },
    endReveal: view.endReveal === null ? null : {
      roles: view.endReveal.roles.map(item => ({ seat: item.seatId, role: item.role })), code: [...view.endReveal.code],
    },
  };
}

function playerFacts(view) {
  return {
    seat: view.self.seatId, publicFacts: publicFacts(view), role: view.self.role,
    ordinaryWeapons: view.self.ordinaryWeapons, rescuesRemaining: view.self.rescuesRemaining,
    legal: Object.fromEntries(Object.entries(view.legalTargets).map(([type, targets]) => [type, [...targets]])),
    moveDestinations: [...view.self.movementDestinations], releaseVoteAvailable: view.self.releaseVoteAvailable,
    codeAttemptAvailable: view.self.codeAttemptAvailable, pendingCount: view.ownPendingCommandIds.length,
    ownBallot: view.ownBallot, hasVoted: view.hasVoted, hackPartner: view.hackPartnerSeatId,
    knowledge: {
      insiderCandidates: [...view.knowledge.insiderCandidates], undercoverSeat: view.knowledge.undercoverSeatId,
      code: [...view.knowledge.code],
      scanResults: view.knowledge.scanResults.map(item => ({
        round: item.round, target: item.targetSeatId, guess: item.guess, matched: item.matched, inCode: item.inCode,
      })),
      protections: view.knowledge.protections.map(item => ({ seat: item.seatId, activeFromRound: item.activeFromRound, consumed: item.consumed })),
      // Whom Supplier armed (V1-16). The protocol-2 view has no field for it, and no engine
      // exports another read that carries it: finding G17 of the integration review. So the
      // binding reports that the engine tells the player nothing, which is what it does. When
      // Backend defines that read, this line and `raw.also` in observe() are where it is bound.
      armedBySupply: null,
    },
  };
}

function wireCommand(command) {
  switch (command.type) {
    case 'MOVE': return { type: 'MOVE', destination: command.destination };
    case 'SUPPLY': return { type: 'SUPPLY', targetSeatIds: command.targets };
    case 'SCAN': return { type: 'SCAN', targetSeatId: command.target, guess: command.guess };
    case 'SUBMIT_CODE': return { type: 'SUBMIT_CODE', seatIds: command.seats };
    case 'RELEASE_VOTE': return { type: 'RELEASE_VOTE', approve: command.approve };
    default: return { type: command.type, targetSeatId: command.target };
  }
}

function createAdapter(engine) {
  const pins = {
    adapter: ADAPTER_NAME,
    engineVersion: engine.FULL_ENGINE_VERSION ?? 'unknown',
    rulesetVersion: engine.FULL_RULESET_VERSION ?? 'unknown',
    rulesetHash: engine.FULL_RULESET_HASH ?? 'unknown',
    protocolVersion: 2,
  };
  return {
    pins,
    createMatch(setup, matchId) {
      // Identifiers count what they name and nothing else: a phase identifier counts phases, and a
      // command identifier counts the commands of the player who sent it. In a paired case the two
      // runs may send different numbers of commands, or the same commands at different moments. An
      // identifier that counted more would then differ between the runs for a reason that is the
      // harness's own: the phase identifier is in every view, and a player's own view lists the
      // identifiers of their pending commands.
      let phases = 0;
      const sent = new Map();   // seat -> how many commands that player has sent
      const receipts = {};      // seat -> the receipts of those commands, as the engine returned them
      const context = now => ({ now, nextPhaseId: `phase-${phases + 1}`, nextDeadlineToken: `deadline-${phases + 1}` });
      // The offered identifier was used if the engine opened a phase with it.
      const settle = () => { if (state.phase.id === `phase-${phases + 1}`) phases += 1; };
      let state = engine.createFullGame({
        matchId,
        setup: {
          playerCount: setup.playerCount, roleOrder: [...setup.roleOrder], codeExtraSeatIds: [...setup.codeExtraSeatIds],
          initialRooms: { ...setup.initialRooms }, roundOrders: setup.roundOrders.map(order => [...order]),
        },
        now: FIXTURE_START, phaseId: 'phase-start', deadlineToken: 'deadline-start', assetManifestVersion: 'balance-fixture-no-assets',
      });
      return {
        observe() {
          const views = engine.projectFullGame(state);
          const terminal = state.phase.endsAt === null;
          return {
            round: state.round, phaseKind: state.phase.kind, phaseId: state.phase.id,
            phaseStartedAt: state.phase.startedAt, phaseEndsAt: state.phase.endsAt, activeSeat: state.activeSeatId, terminal,
            result: state.result === null ? null : { winner: state.result.winner, alienCoWinner: state.result.alienCoWinner },
            truth: {
              code: [...state.code], codeSubmitted: state.codeSubmitted, codeCorrect: state.correctCode,
              releaseUsed: state.releaseUsed, hacksThisRound: state.hacksThisRound,
              seats: state.seats.map(seat => ({
                seat: seat.seatId, role: seat.role, faction: seat.faction, health: seat.health, jailed: seat.jailed,
                captain: seat.captain, location: seat.location, lastRoom: seat.lastRoom, ordinaryWeapons: seat.ordinaryWeapons,
                officerShotSpent: seat.officerShotSpent, specialShotAvailable: seat.specialShotAvailable,
                movedThisRound: seat.movedInRound, disablerSpent: seat.disablerSpent, rescuesRemaining: seat.rescuesRemaining,
                hackUsed: seat.hackUsed, scannedThisRound: seat.scanUsedRound === state.round,
                protection: protectionState(seat, state.round, state.queued),
                protectionActiveFromRound: seat.protection === null ? null : seat.protection.activeFromRound,
                lifetimeProtectionReceived: seat.lifetimeProtectionReceived,
              })),
            },
            publicView: publicFacts(views.public),
            playerViews: Object.fromEntries(Object.entries(views.players).map(([seat, view]) => [seat, playerFacts(view)])),
            // A receipt is read by the player who sent the command and by nobody else.
            raw: { public: views.public, players: views.players, receipts: structuredClone(receipts) },
            revisions: { public: state.viewRevisions.public, players: { ...state.viewRevisions.players } },
          };
        },
        command(actor, command, atMs) {
          sent.set(actor, (sent.get(actor) ?? 0) + 1);
          const request = {
            protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId: `command-${actor}-${sent.get(actor)}`,
            command: wireCommand(command),
          };
          let result;
          try {
            result = engine.executeFullGame(state, actor, request, context(atMs));
          } catch (error) {
            // The engine validates the wire shape first and throws on a malformed request.
            if (error?.name === 'ZodError' || Array.isArray(error?.issues)) return 'INVALID';
            throw error;
          }
          state = result.state;
          settle();
          (receipts[actor] ??= []).push(result.receipt);
          return result.receipt.status === 'accepted' ? 'REGISTERED' : result.receipt.code;
        },
        advance(atMs) {
          const result = engine.advanceFullGame(state, { ...context(atMs), phaseId: state.phase.id, deadlineToken: state.deadlineToken ?? 'no-deadline' });
          state = result.state;
          settle();
          return result.advanced;
        },
        abort(atMs) {
          state = engine.abortFullGame(state, context(atMs));
          settle();
        },
      };
    },
  };
}
