// A thin driver over the engine's public full-game API for the checks of the four-bed Hospital.
// It contains no game rule. It sends commands and deadlines, records every step with a digest of
// the state it produced, and replays the record. The Balance scenario runner cannot play this
// tuple: its adapter and command language predate stored positions, the Blackout window and
// Hospital episodes. This driver follows the controls driver of PR #133 instead.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const START = 1_800_000_000_000;
export const ROLE_ORDER = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', 'Red Disabler', 'Officer'];
export const ART = 'design-0.5.0';

const json = value => JSON.parse(JSON.stringify(value));
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const seatIds = mode => Array.from({ length: mode }, (_, index) => `seat-${index + 1}`);
const number = id => Number(id.slice(5));

/** The three built modules a check reads: the engine, the contracts and the service's anchor rule. */
export async function loadApi(root) {
  const paths = {
    engine: join(root, 'packages/engine/dist/index.js'),
    contracts: join(root, 'packages/contracts/dist/index.js'),
    service: join(root, 'services/game-api/dist/full-game.js'),
  };
  const missing = Object.entries(paths).filter(([, path]) => !existsSync(path)).map(([name]) => name);
  if (missing.length > 0) return { available: false, reason: `not built at ${root}: ${missing.join(', ')} (run npm run build)` };
  const [engine, contracts, service] = await Promise.all(Object.values(paths).map(path => import(pathToFileURL(path).href)));
  if (typeof engine.HOSPITAL_FOUR_FULL_GAME_VERSION_PINS !== 'object') {
    return { available: false, reason: 'the engine at this commit does not name the four-bed tuple' };
  }
  return { available: true, engine, contracts, service, pins: { ...engine.HOSPITAL_FOUR_FULL_GAME_VERSION_PINS } };
}

/**
 * A match under the four-bed tuple. `rooms.A` lists the seats that start in Room A; every other
 * seat starts in Room B. `orders` gives the turn order of each round (default: by player number).
 */
export function openMatch(api, mode, { rooms, orders = {}, codeExtra = ['seat-1', 'seat-2', 'seat-3'] } = {}) {
  const { engine } = api;
  const ids = seatIds(mode);
  const args = {
    matchId: `balance-hospital-four-${mode}`, now: START, phaseId: 'phase-0', deadlineToken: 'deadline-0',
    assetManifestVersion: ART, versions: { ...api.pins, assetManifestVersion: ART },
    setup: {
      playerCount: mode, roleOrder: ROLE_ORDER.slice(0, mode), codeExtraSeatIds: [...codeExtra],
      initialRooms: Object.fromEntries(ids.map(id => [id, rooms.A.includes(id) ? 'Room A' : 'Room B'])),
      roundOrders: [1, 2, 3, 4, 5].map(round => [...(orders[round] ?? ids)]),
    },
  };
  return track(api, engine.createFullGame(json(args)), { kind: 'native', args });
}

/** Continue from a state built by hand. The record says so, and the replay starts from that state. */
export function constructed(api, state, how) {
  return track(api, json(state), { kind: 'constructed', how });
}

function track(api, initial, origin) {
  const { engine } = api;
  let state = initial;
  let ids = 0;
  const sent = new Map();
  const steps = [];
  const start = json(initial);
  const context = now => { ids += 1; return { now, nextPhaseId: `phase-${ids}`, nextDeadlineToken: `deadline-${ids}` }; };

  const match = {
    origin, steps,
    get state() { return state; },
    views() { return engine.projectFullGame(state); },
    seat(id) { return state.seats.find(seat => seat.seatId === id); },
    publicSeat(id) { return engine.projectFullGame(state).public.seats.find(seat => seat.seatId === id); },
    /** Sends a command in the current phase. Returns the receipt; the state changes only if it was accepted. */
    send(actor, command, at = state.phase.startedAt + 1) {
      sent.set(actor, (sent.get(actor) ?? 0) + 1);
      const request = { protocolVersion: 2, matchId: state.matchId, phaseId: state.phase.id, commandId: `command-${actor}-${sent.get(actor)}`, command };
      const ctx = context(at);
      const before = state;
      const result = engine.executeFullGame(before, actor, json(request), json(ctx));
      // The same input gives the same output, and the input is not changed.
      const again = engine.executeFullGame(json(before), actor, json(request), json(ctx));
      steps.push({ kind: 'command', actor, request, context: ctx, receipt: result.receipt,
        deterministic: digest(again) === digest(result), digest: digest(result.state), board: board(engine, result.state) });
      state = result.state;
      return result.receipt;
    },
    /** Lets the current phase reach its deadline. */
    tick() {
      if (state.phase.endsAt === null) throw new Error(`no deadline in ${state.phase.kind}`);
      const ctx = { ...context(state.phase.endsAt), phaseId: state.phase.id, deadlineToken: state.deadlineToken };
      const before = state;
      const result = engine.advanceFullGame(before, json(ctx));
      if (!result.advanced) throw new Error(`deadline of ${before.phase.kind} did not advance`);
      const again = engine.advanceFullGame(json(before), json(ctx));
      const repeated = engine.advanceFullGame(result.state, json(ctx));
      steps.push({ kind: 'deadline', context: ctx, deterministic: digest(again) === digest(result), repeatedAdvanced: repeated.advanced,
        digest: digest(result.state), from: before.phase.kind, board: board(engine, result.state) });
      state = result.state;
      return before;
    },
    /** Advances deadlines until the predicate holds. */
    until(predicate, label) {
      for (let bound = 0; !predicate(state); bound += 1) {
        if (bound > 300 || state.phase.endsAt === null) throw new Error(`never reached ${label}`);
        match.tick();
      }
    },
    toTurn(round, seat) {
      match.until(s => s.round === round && s.phase.kind === 'ORDINARY_TURN' && s.activeSeatId === seat, `the turn of ${seat} in Round ${round}`);
    },
    toRound(round) {
      match.until(s => s.round === round && s.phase.kind === 'ORDINARY_TURN', `the first turn of Round ${round}`);
    },
    toPhase(kind, round = state.round) {
      match.until(s => s.round === round && s.phase.kind === kind, `${kind} of Round ${round}`);
    },
    /** In the window of the round, a Disabler selects the position the target holds in the frozen map. */
    select(disabler, target) {
      match.toPhase('BLACKOUT');
      const targeting = engine.projectFullGame(state).players[disabler].self.blackoutTargeting;
      if (targeting === null) throw new Error(`${disabler} has no Blackout to aim`);
      const slot = engine.projectFullGame(state).public.seats.find(seat => seat.seatId === target).slotId;
      return match.send(disabler, { type: 'SELECT_BLACKOUT_SLOT', snapshotId: targeting.snapshotId, room: targeting.room, slotId: slot }, targeting.darkStartsAt);
    },
    /**
     * Lets the round resolve: the vote, its result and the window close without further input, or
     * the showdown reaches its deadline. Returns the state the resolution started from.
     */
    resolve() {
      const round = state.round;
      if (state.phase.kind === 'SHOWDOWN') return match.tick();
      match.until(s => s.round === round && s.phase.kind === 'BLACKOUT', `the window of Round ${round}`);
      return match.tick();
    },
    /** Plays the record again from its start and compares every receipt and every state. */
    replay() {
      let current = origin.kind === 'native' ? engine.createFullGame(json(origin.args)) : json(start);
      const differences = [];
      steps.forEach((step, index) => {
        if (step.kind === 'command') {
          const result = engine.executeFullGame(current, step.actor, json(step.request), json(step.context));
          if (digest(result.receipt) !== digest(step.receipt)) differences.push(`step ${index}: receipt`);
          current = result.state;
        } else {
          const result = engine.advanceFullGame(current, json(step.context));
          if (!result.advanced) differences.push(`step ${index}: deadline did not advance`);
          current = result.state;
        }
        if (digest(current) !== step.digest) differences.push(`step ${index}: state`);
      });
      const views = digest(engine.projectFullGame(current)) === digest(engine.projectFullGame(state));
      return {
        steps: steps.length, differences, views, outcomes: digest(current.outcomes) === digest(state.outcomes),
        deterministic: steps.every(step => step.deterministic), repeatedDeadlines: steps.filter(step => step.kind === 'deadline').every(step => step.repeatedAdvanced === false),
      };
    },
  };
  return match;
}

/** Sorted by player number. */
export const byNumber = list => [...list].sort((left, right) => number(left) - number(right));

// What the board shows after a step: every seat that is still listed, and who holds which bed.
function board(engine, state) {
  const seats = engine.projectFullGame(state).public.seats;
  return {
    listed: seats.map(seat => seat.seatId),
    hospital: seats.filter(seat => seat.location === 'Hospital').map(seat => [seat.seatId, seat.slotId]),
    phase: state.phase.kind, round: state.round,
  };
}
