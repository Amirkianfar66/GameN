import { z } from 'zod';
import { supportsBoardMedical } from './full-game-versions.js';
import type { FullGameplayPins } from './full-game-versions.js';

export const BoardSlotIdSchema = z.string().regex(/^(?:[ABJ][1-5]|C1|H[1-9])$/);
export const FullMedicalStatusSchema = z.strictObject({
  admittedRound: z.number().int().min(1).max(5),
  rescueDueAfterRound: z.number().int().min(2).max(5).nullable(),
  rescueOpportunity: z.enum(['NEXT_NORMAL_ROUND','CURRENT_NORMAL_ROUND','NO_ADDITIONAL_ROUND','CLOSED']),
});
export type FullMedicalStatus = z.infer<typeof FullMedicalStatusSchema>;

/** Episode facts are authoritative. No client wall-clock or observation age is used. */
export function medicalRescueOpportunity(round: number, phaseKind: string, due: number | null): FullMedicalStatus['rescueOpportunity'] {
  if (phaseKind === 'FINISHED' || phaseKind === 'ABORTED') return 'CLOSED';
  if (phaseKind === 'SHOWDOWN' || due === null) return 'NO_ADDITIONAL_ROUND';
  return due === round ? 'CURRENT_NORMAL_ROUND' : 'NEXT_NORMAL_ROUND';
}

type MedicalView = {
  versions: FullGameplayPins; playerCount: number; round: number; phase: { kind: string };
  seats: Array<{ location: string; health: string; jailed: boolean; captain: boolean;
    slotId?: string | undefined; medical?: FullMedicalStatus | null | undefined }>;
};

/** Version gate placement and clinical facts together, including legacy omission. */
export function validBoardMedicalView(view: MedicalView): boolean {
  if (!supportsBoardMedical(view.versions)) return view.seats.every(s => !Object.hasOwn(s,'slotId') && !Object.hasOwn(s,'medical'));
  if (['RELEASE_CHOICE','RELEASE_VOTE'].includes(view.phase.kind)) return false;
  const occupied = new Set<string>();
  const prefixes: Record<string,string> = { 'Room A':'A','Room B':'B',Jail:'J','Command Room':'C',Hospital:'H' };
  for (const seat of view.seats) {
    if (!Object.hasOwn(seat,'slotId') || !Object.hasOwn(seat,'medical') || seat.slotId === undefined || seat.medical === undefined) return false;
    const prefix = prefixes[seat.location], maximum = prefix === 'H' ? view.playerCount : prefix === 'C' ? 1 : 5;
    if (prefix === undefined || !BoardSlotIdSchema.safeParse(seat.slotId).success
      || seat.slotId[0] !== prefix || Number(seat.slotId.slice(1)) > maximum || occupied.has(seat.slotId)) return false;
    occupied.add(seat.slotId);
    if ((seat.captain && (seat.health !== 'Healthy' || seat.jailed))
      || (seat.location === 'Command Room' && !seat.captain)
      || (seat.health === 'Healthy' && (seat.location === 'Hospital' || (seat.location === 'Jail' && !seat.jailed) || (seat.jailed && seat.location !== 'Jail')))) return false;
    if (seat.health !== 'Injured') { if (seat.medical !== null) return false; continue; }
    const episode = seat.medical;
    if (seat.location !== 'Hospital' || episode === null || episode.admittedRound > view.round
      || episode.rescueDueAfterRound !== (episode.admittedRound === 5 ? null : episode.admittedRound + 1)
      || (episode.rescueDueAfterRound !== null && episode.rescueDueAfterRound < view.round)
      || (view.phase.kind === 'SHOWDOWN' && episode.rescueDueAfterRound !== null)
      || episode.rescueOpportunity !== medicalRescueOpportunity(view.round,view.phase.kind,episode.rescueDueAfterRound)) return false;
  }
  return view.seats.filter(s=>s.captain).length <= 1 && view.seats.filter(s=>s.location === 'Jail'
    || (s.location === 'Hospital' && s.health === 'Injured' && s.jailed)).length <= 5;
}
