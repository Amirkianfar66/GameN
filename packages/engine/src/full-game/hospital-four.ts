import { IdentifierSchema } from '@mothership/contracts';
import { hospitalFourEnabled } from './model.js';
import type { FullGameState } from './model.js';

function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

/** Constructor-only. Historical tuples never gain a private overflow field. */
export function initializeHospitalOverflowState(state: FullGameState): void {
  if (!hospitalFourEnabled(state.versions)) return;
  for (const seat of state.seats) seat.hospitalOverflow = null;
}

/** An off-board overflow is permanent and independently evidenced, never a Captain power use. */
export function assertHospitalOverflowState(state: FullGameState): void {
  const records = state.outcomes?.filter(record => record.fact.type === 'HOSPITAL_OVERFLOW_REMOVED') ?? [];
  if (!hospitalFourEnabled(state.versions)) {
    if (records.length || state.seats.some(seat => Object.hasOwn(seat, 'hospitalOverflow'))) {
      throw new Error('Hospital overflow requires its exact gameplay tuple');
    }
    return;
  }
  if (!Array.isArray(state.outcomes) || !Number.isInteger(state.round) || state.round < 1 || state.round > 5) {
    throw new Error('Missing Hospital overflow history');
  }
  const ejects = state.outcomes.filter(record=>record.fact.type==='CAPTAIN_OUTCOME' && record.fact.kind==='EJECT');
  if (ejects.length > 1 || typeof state.captainPowersUsed?.ejectUsed !== 'boolean'
    || state.captainPowersUsed.ejectUsed !== (ejects.length === 1)) throw new Error('Invalid EJECT occurrence provenance');
  for (const record of ejects) {
    const fact=record.fact;
    if (fact.type !== 'CAPTAIN_OUTCOME' || fact.kind !== 'EJECT' || record.recipientSeatIds !== null
      || !fact.seatIds.every(id=>state.seats.some(seat=>seat.seatId===id && seat.health==='Eliminated' && seat.location===null && seat.slotId===null))) {
      throw new Error('Invalid retained EJECT occurrence');
    }
  }
  for (const record of records) {
    const fact = record.fact;
    if (fact.type !== 'HOSPITAL_OVERFLOW_REMOVED' || record.recipientSeatIds !== null
      || !state.seats.some(seat => seat.seatId === fact.seatId)) throw new Error('Invalid Hospital overflow outcome');
  }
  for (const seat of state.seats) {
    if (!Object.hasOwn(seat, 'hospitalOverflow')) throw new Error('Missing Hospital overflow provenance');
    const proof = seat.hospitalOverflow;
    const matches = records.filter(record => record.fact.type === 'HOSPITAL_OVERFLOW_REMOVED' && record.fact.seatId === seat.seatId);
    const ejectMatches=ejects.filter(record=>record.fact.type==='CAPTAIN_OUTCOME' && record.fact.seatIds.includes(seat.seatId));
    if (proof === null) {
      if (matches.length || (seat.location===null && ejectMatches.length!==1)) throw new Error('Missing offboard occurrence provenance');
      continue;
    }
    if (!exact(proof, ['phaseId', 'round']) || !IdentifierSchema.safeParse(proof.phaseId).success
      || typeof proof.round !== 'number' || !Number.isInteger(proof.round) || proof.round < 1 || proof.round > state.round
      || seat.health !== 'Eliminated' || seat.location !== null || seat.slotId !== null || seat.jailed || seat.captain
      || seat.medicalEpisode !== null || !Number.isSafeInteger(seat.medicalEpisodeCount) || seat.medicalEpisodeCount! < 1
      || ejectMatches.length !== 0 || matches.length !== 1 || matches[0]!.fact.phaseId !== proof.phaseId || matches[0]!.fact.round !== proof.round) {
      throw new Error('Invalid permanent Hospital overflow provenance');
    }
  }
}
