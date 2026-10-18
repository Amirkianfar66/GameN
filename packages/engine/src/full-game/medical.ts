import { assertHospitalOverflowState } from './hospital-four.js';
import { appendOutcome, clinicalOutcome } from './outcomes.js';
import { medicalRescueOpportunity } from '@mothership/contracts';
import type { FullMedicalStatus, SeatId } from '@mothership/contracts';
import { boardMedicalEnabled, hospitalFourEnabled } from './model.js';
import type { FullGameState } from './model.js';
import type { GameSeat } from './roster.js';
import { ordinaryReturnDestination } from './capacity.js';
import { assertBoardSlots, assignMissingBoardSlots, initializeBoardSlots, moveBoardSeat } from './slots.js';

export function initializeMedicalState(state: FullGameState): void {
  for (const seat of state.seats) { seat.medicalEpisodeCount = 0; seat.medicalEpisode = null; }
  initializeBoardSlots(state);
}

/** Only complete checkpoint states may be persisted or projected. Never repair a save. */
export function assertMedicalState(state: FullGameState): void {
  assertHospitalOverflowState(state);
  if (!boardMedicalEnabled(state.versions)) return;
  if (!Number.isInteger(state.round) || state.round < 1 || state.round > 5) throw new Error('Invalid medical round');
  assertBoardSlots(state);
  if (['RELEASE_CHOICE','RELEASE_VOTE'].includes(state.phase.kind)) throw new Error('Captain companion required');
  if (state.seats.filter(s=>s.captain).length > 1) throw new Error('Multiple Captains');
  for (const seat of state.seats) {
    const count = seat.medicalEpisodeCount, episode = seat.medicalEpisode;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || episode === undefined) throw new Error('Missing or invalid medical history');
    if (seat.captain && (seat.health !== 'Healthy' || seat.jailed)) throw new Error('Invalid Captain status');
    if (seat.health === 'Healthy' && (seat.location === 'Hospital' || (seat.location === 'Jail' && !seat.jailed) || (seat.jailed && seat.location !== 'Jail'))) throw new Error('Unfinished medical placement');
    if (seat.health !== 'Injured') { if (episode !== null) throw new Error('Inactive medical episode required'); continue; }
    if (episode === null || count === 0 || episode.number !== count || !Number.isInteger(episode.admittedRound)
      || episode.admittedRound < 1 || episode.admittedRound > state.round
      || episode.deathDueAfterRound !== (episode.admittedRound === 5 ? null : episode.admittedRound + 1)
      || (episode.deathDueAfterRound !== null && episode.deathDueAfterRound < state.round)
      || (state.phase.kind === 'SHOWDOWN' && episode.deathDueAfterRound !== null)) throw new Error('Invalid active medical episode');
  }
}

/** Ephemeral only: never store, serialize or project a partially resolved candidate. */
export interface MedicalResolutionBatch {
  state:FullGameState;
  outcomeOffset:number;
  candidates:Map<SeatId,{location:NonNullable<GameSeat['location']>;slotId:string}>;
}
export function beginMedicalResolution(state:FullGameState):MedicalResolutionBatch|undefined {
  if (!hospitalFourEnabled(state.versions)) return undefined;
  if (!Array.isArray(state.outcomes)) throw new Error('Missing medical outcome history');
  return { state, outcomeOffset:state.outcomes.length, candidates:new Map() };
}

/** Called after protection. Logical admission happens in this very damage step.
 * Slot sealing waits for the atomic checkpoint so departing patients free beds first.
 */
export function recordMedicalDamage(state: FullGameState, seat: GameSeat, batch?: MedicalResolutionBatch): void {
  if (seat.health === 'Eliminated') return;
  if (hospitalFourEnabled(state.versions)) {
    if (!batch || batch.state !== state || !state.seats.includes(seat)) throw new Error('Hospital injury requires its atomic resolution batch');
    if (seat.health === 'Healthy') {
      if (seat.location === null || typeof seat.slotId !== 'string' || batch.candidates.has(seat.seatId)) throw new Error('Invalid new Hospital candidate');
      batch.candidates.set(seat.seatId, { location:seat.location, slotId:seat.slotId });
    }
  }
  seat.captain = false;
  if (seat.health === 'Injured') {
    seat.health = 'Eliminated'; seat.medicalEpisode = null; clinicalOutcome(state,seat.seatId,'DEATH');
    return;
  }
  const count = seat.medicalEpisodeCount! + 1;
  if (!Number.isSafeInteger(count)) throw new Error('Medical episode counter exhausted');
  seat.medicalEpisodeCount = count;
  seat.medicalEpisode = { number:count, admittedRound:state.round, deathDueAfterRound:state.round === 5 ? null : state.round + 1 };
  seat.health = 'Injured'; clinicalOutcome(state,seat.seatId,'INJURY');
  // The successor reserves no physical bed before healed-first reconciliation.
  if (hospitalFourEnabled(state.versions)) return;
  seat.location = 'Hospital';
  // Remember actual departure even if Rescue returns to the same room in this batch.
  delete seat.slotId;
}

export function healMedicalSeat(seat: GameSeat, state?:FullGameState): void {
  if (seat.health !== 'Injured') return;
  seat.health = 'Healthy'; seat.medicalEpisode = null; if(state) clinicalOutcome(state,seat.seatId,'HEALED');
}

export function applyDueMedicalDeaths(state: FullGameState): void {
  for (const seat of state.seats) {
    if (seat.health !== 'Injured') continue;
    if (seat.medicalEpisode === undefined || seat.medicalEpisode === null) throw new Error('Missing medical episode');
    const due = seat.medicalEpisode.deathDueAfterRound;
    if (due !== null && due <= state.round) {
      seat.health = 'Eliminated'; seat.captain = false; seat.medicalEpisode = null; clinicalOutcome(state,seat.seatId,'DEATH');
    }
  }
}

/** Immediate Jail tally never removes an Injured detainee from Hospital. */
export function placeImmediateMedicalSeat(state: FullGameState, seat: GameSeat): void {
  if (seat.health !== 'Healthy' || seat.jailed) seat.captain = false;
  if (seat.health === 'Injured') return;
  if (seat.jailed && seat.health === 'Healthy') moveBoardSeat(state,seat,'Jail');
}

/** Canonical whole-stage final placement; unchanged occupants and bodies keep slots.
 * Free healed beds before assigning entrants, then return free players numerically.
 */
export function placeMedicalSeats(state: FullGameState, batch?: MedicalResolutionBatch): void {
  if (hospitalFourEnabled(state.versions) && batch !== undefined) { placeFourBedMedicalSeats(state,batch); return; }
  const returning = (seat: GameSeat) => seat.health === 'Healthy' && !seat.jailed
    && (seat.location === 'Hospital' || seat.location === 'Jail' || (seat.location === 'Command Room' && !seat.captain));
  const returners = state.seats.filter(returning).map(s=>({...s})).sort((a,b)=>Number(a.seatId.slice(5))-Number(b.seatId.slice(5)));
  const working: FullGameState = { ...state, seats:state.seats.filter(s=>!returning(s)).map(s=>({...s})) };
  for (const seat of working.seats) {
    if (seat.health === 'Injured' && seat.location !== 'Hospital') throw new Error('Missing immediate Hospital admission');
    if (seat.health === 'Healthy' && seat.jailed && seat.location !== 'Jail') {
      seat.location = 'Jail'; delete seat.slotId;
    }
  }
  assignMissingBoardSlots(working);
  for (const seat of returners) {
    seat.location = ordinaryReturnDestination(working,seat);
    delete seat.slotId;
    working.seats.push(seat);
    assignMissingBoardSlots(working);
  }
  for (const seat of state.seats) {
    const placed = working.seats.find(s=>s.seatId === seat.seatId)!;
    seat.location = placed.location; seat.slotId = placed.slotId!; seat.lastRoom = placed.lastRoom;
  }
}

export function projectMedicalStatus(state: FullGameState, seat: GameSeat): FullMedicalStatus | null {
  if (seat.health !== 'Injured') return null;
  const episode = seat.medicalEpisode!;
  return { admittedRound:episode.admittedRound, rescueDueAfterRound:episode.deathDueAfterRound,
    rescueOpportunity:medicalRescueOpportunity(state.round,state.phase.kind,episode.deathDueAfterRound) };
}

/** Healed departures first, then numeric new patients/bodies, then numeric ordinary returns. */
function placeFourBedMedicalSeats(state:FullGameState,batch:MedicalResolutionBatch):void {
  if (batch.state !== state || !Array.isArray(state.outcomes) || batch.outcomeOffset > state.outcomes.length) throw new Error('Invalid medical batch');
  const candidates = new Set(batch.candidates.keys());
  const ordinaryReturn = (seat:GameSeat) => seat.health === 'Healthy' && !seat.jailed
    && (candidates.has(seat.seatId) || seat.location === 'Hospital' || seat.location === 'Jail' || (seat.location === 'Command Room' && !seat.captain));
  const number = (seat:GameSeat) => Number(seat.seatId.slice(5));
  const returners = state.seats.filter(ordinaryReturn).map(seat=>({...seat})).sort((a,b)=>number(a)-number(b));
  const working:FullGameState = { ...state, seats:state.seats.filter(seat=>!ordinaryReturn(seat) && !candidates.has(seat.seatId)).map(seat=>({...seat})) };
  // Returning detained healed patients free their Hospital places before entrants.
  for (const seat of working.seats) if (seat.health === 'Healthy' && seat.jailed && seat.location !== 'Jail') {
    seat.location='Jail'; delete seat.slotId;
  }
  const denied = new Set<SeatId>();
  for (const original of [...state.seats].filter(seat=>candidates.has(seat.seatId)).sort((a,b)=>number(a)-number(b))) {
    if (ordinaryReturn(original)) continue;
    const seat = {...original}; delete seat.slotId;
    if (seat.health === 'Healthy') {
      if (!seat.jailed) throw new Error('Missing candidate ordinary return');
      seat.location='Jail';
    } else if (working.seats.filter(occupant=>occupant.location==='Hospital').length < 4) {
      seat.location='Hospital';
    } else {
      seat.health='Eliminated'; seat.location=null; seat.slotId=null; seat.jailed=false; seat.captain=false; seat.medicalEpisode=null;
      seat.hospitalOverflow={phaseId:state.phase.id,round:state.round}; denied.add(seat.seatId);
    }
    working.seats.push(seat);
  }
  assignMissingBoardSlots(working);
  for (const seat of returners) {
    seat.location=ordinaryReturnDestination(working,seat); delete seat.slotId;
    working.seats.push(seat); assignMissingBoardSlots(working);
  }
  for (const seat of state.seats) {
    const placed=working.seats.find(value=>value.seatId===seat.seatId);
    if (!placed) throw new Error('Incomplete medical resolution roster');
    Object.assign(seat,placed);
  }
  // Suppress only this batch's provisional medical facts for denied candidates.
  // Earlier history and unrelated subjects/defensive occurrences remain exact.
  state.outcomes=state.outcomes.slice(0,batch.outcomeOffset).concat(state.outcomes.slice(batch.outcomeOffset).filter(record=>
    !(record.fact.type==='MEDICAL_OUTCOME' && denied.has(record.fact.seatId))));
  for (const seatId of [...denied].sort((a,b)=>Number(a.slice(5))-Number(b.slice(5)))) {
    appendOutcome(state,{type:'HOSPITAL_OVERFLOW_REMOVED',phaseId:state.phase.id,round:state.round,seatId});
  }
}
