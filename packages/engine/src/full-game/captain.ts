import { appendOutcome } from './outcomes.js';
import { assertHospitalOverflowState } from './hospital-four.js';
import { IdentifierSchema, SeatIdSchema } from '@mothership/contracts';
import type { SeatId } from '@mothership/contracts';
import { captainCommandsEnabled, blackoutEnabled, hospitalFourEnabled } from './model.js';
import type { FullGameState } from './model.js';
import type { GameSeat } from './roster.js';
import { assertMedicalState, placeMedicalSeats } from './medical.js';

export type CaptainCommandType = 'CAPTAIN_RELEASE' | 'CAPTAIN_EJECT';
const fields = ['captainPowersUsed', 'pendingCaptainReveal', 'pendingEjectStage'] as const;
const alive = (seat: GameSeat): boolean => seat.health !== 'Eliminated';
const numeric = (id: SeatId): number => Number(id.slice(5));
const survives = (state: FullGameState, faction: 'Blue' | 'Red'): boolean =>
  state.seats.some(seat => seat.faction === faction && alive(seat));
const survival = (state: FullGameState) => ({ blueAlive: survives(state, 'Blue'), redAlive: survives(state, 'Red') });
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function survivalShape(value: unknown): boolean {
  return exact(value, ['blueAlive', 'redAlive']) && typeof value['blueAlive'] === 'boolean' && typeof value['redAlive'] === 'boolean';
}

/** Validate persisted private evidence. Journal replay separately proves its provenance. */
export function assertCaptainState(state: FullGameState): void {
  assertHospitalOverflowState(state);
  if (!captainCommandsEnabled(state.versions)) {
    if (fields.some(field => Object.hasOwn(state, field)) || state.seats.some(seat => seat.location === null || seat.slotId === null)) {
      throw new Error('Captain companion fields require the exact Captain tuple');
    }
    return;
  }
  if (!Number.isInteger(state.round) || state.round < 1 || state.round > 5
    || fields.some(field => !Object.hasOwn(state, field))) throw new Error('Missing or invalid Captain state');
  const uses = state.captainPowersUsed;
  if (!exact(uses, ['releaseUsed', 'ejectUsed']) || typeof uses.releaseUsed !== 'boolean' || typeof uses.ejectUsed !== 'boolean') {
    throw new Error('Invalid global Captain uses');
  }
  for (const seat of state.seats) {
    if (seat.location === null || seat.slotId === null) {
      if ((!uses.ejectUsed && !(hospitalFourEnabled(state.versions) && seat.hospitalOverflow !== null)) || seat.location !== null || seat.slotId !== null || seat.health !== 'Eliminated' || seat.jailed || seat.captain
        || seat.medicalEpisode !== null || !Number.isSafeInteger(seat.medicalEpisodeCount) || seat.medicalEpisodeCount! < 0) {
        throw new Error('Invalid retained off-board seat');
      }
    } else if (seat.location === 'Jail' && alive(seat) && (seat.health !== 'Healthy' || !seat.jailed || seat.captain)) {
      throw new Error('Invalid living physical-Jail prisoner');
    }
  }
  const reveal = state.pendingCaptainReveal, stage = state.pendingEjectStage;
  if (reveal === null && stage === null) return;
  if (!exact(reveal, ['round', 'seatIds']) || !exact(stage, ['round', 'actorSeatId', 'commandId', 'before', 'after'])
    || !uses.ejectUsed || reveal.round !== state.round || stage.round !== state.round
    || !Array.isArray(reveal.seatIds) || reveal.seatIds.length === 0 || reveal.seatIds.length > state.playerCount
    || new Set(reveal.seatIds).size !== reveal.seatIds.length || !reveal.seatIds.every(id => SeatIdSchema.safeParse(id).success)
    || !SeatIdSchema.safeParse(stage.actorSeatId).success || !IdentifierSchema.safeParse(stage.commandId).success
    || !survivalShape(stage.before) || !survivalShape(stage.after)
    || (state.phase.kind==='BLACKOUT' && !blackoutEnabled(state.versions))
    || !['BLACKOUT','ORDINARY_TURN', 'HACK_DECLARE', 'HACK_RESULT', 'HACK', 'JAIL_VOTE', 'VOTE_RESULT', 'ABORTED'].includes(state.phase.kind)) {
    throw new Error('Invalid pending Captain checkpoint evidence');
  }
  const actor = state.seats.find(seat => seat.seatId === stage.actorSeatId);
  if (!actor || reveal.seatIds.includes(actor.seatId)) throw new Error('Invalid EJECT actor binding');
  const before = stage.before as { blueAlive: boolean; redAlive: boolean };
  const after = stage.after as { blueAlive: boolean; redAlive: boolean };
  if ((!before.blueAlive && after.blueAlive) || (!before.redAlive && after.redAlive)
    || (actor.faction === 'Blue' && (!before.blueAlive || !after.blueAlive))
    || (actor.faction === 'Red' && (!before.redAlive || !after.redAlive))
    || (!after.blueAlive && survives(state, 'Blue')) || (!after.redAlive && survives(state, 'Red'))) {
    throw new Error('Invalid elimination-stage survival evidence');
  }
  for (const id of reveal.seatIds) {
    const seat = state.seats.find(value => value.seatId === id);
    if (!seat || seat.location !== null || seat.slotId !== null || seat.health !== 'Eliminated'
      || (seat.faction === 'Blue' && !before.blueAlive) || (seat.faction === 'Red' && !before.redAlive)) {
      throw new Error('Invalid deferred EJECT victim');
    }
  }
}

/** The enclosing command admission owns its authenticated identity and server-time check. */
export function captainCommandAllowed(state: FullGameState, actor: GameSeat, type: CaptainCommandType): boolean {
  assertCaptainState(state);
  if (!captainCommandsEnabled(state.versions) || !state.seats.includes(actor)
    || !['CAPTAIN_RELEASE', 'CAPTAIN_EJECT'].includes(type) || state.phase.kind !== 'ORDINARY_TURN'
    || state.activeSeatId !== actor.seatId || actor.health !== 'Healthy' || actor.jailed || !actor.captain
    || actor.location !== 'Command Room') return false;
  const used = type === 'CAPTAIN_RELEASE' ? state.captainPowersUsed!.releaseUsed : state.captainPowersUsed!.ejectUsed;
  return !used && state.seats.some(seat => seat.location === 'Jail' && seat.jailed && alive(seat));
}

/** Immediate, complete physical-Jail result; role/move resources and registered effects remain intact. */
export function executeCaptainCommand(state: FullGameState, actor: GameSeat, type: CaptainCommandType, commandId: string): void {
  assertMedicalState(state);
  assertCaptainState(state);
  if (!IdentifierSchema.safeParse(commandId).success || !captainCommandAllowed(state, actor, type)) {
    throw new Error('Captain command is not allowed');
  }
  const prisoners = state.seats.filter(seat => seat.location === 'Jail' && seat.jailed && alive(seat));
  if (type === 'CAPTAIN_RELEASE') {
    state.captainPowersUsed!.releaseUsed = true;
    for (const seat of prisoners) seat.jailed = false;
    placeMedicalSeats(state);
  } else {
    const before = survival(state);
    const removedSeatIds=state.seats.filter(value=>value.location==='Jail').map(value=>value.seatId);
    state.captainPowersUsed!.ejectUsed = true;
    for (const seat of state.seats.filter(value => value.location === 'Jail')) {
      seat.health = 'Eliminated'; seat.location = null; seat.slotId = null;
      seat.jailed = false; seat.captain = false; seat.medicalEpisode = null;
    }
    state.pendingCaptainReveal = { round: state.round, seatIds: prisoners.map(seat => seat.seatId).sort((a, b) => numeric(a) - numeric(b)) };
    state.pendingEjectStage = { round: state.round, actorSeatId: actor.seatId, commandId, before, after: survival(state) };
    if(hospitalFourEnabled(state.versions))appendOutcome(state,{type:'CAPTAIN_OUTCOME',phaseId:state.phase.id,round:state.round,kind:'EJECT',seatIds:removedSeatIds});
  }
  assertMedicalState(state);
  assertCaptainState(state);
}

/** Called only after the complete normal registered stage; never evaluates victory itself. */
export function closeCaptainCheckpoint(state: FullGameState): boolean {
  assertCaptainState(state);
  if (!captainCommandsEnabled(state.versions) || state.phase.kind === 'ABORTED') return false;
  const stage = state.pendingEjectStage;
  const simultaneous = stage !== null && stage !== undefined && stage.before.blueAlive && stage.before.redAlive
    && !stage.after.blueAlive && !stage.after.redAlive;
  state.pendingCaptainReveal = null; state.pendingEjectStage = null;
  return simultaneous;
}
