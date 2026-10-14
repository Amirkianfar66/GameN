import { supportsBoardMedical } from '@mothership/contracts';
import type { FullMedicalStatus } from '@mothership/contracts';
import { isCurrent } from './common.js';
import type { AudienceFacts, PublicBoardModel, PublicSeat, ShellEnvironment } from './types.js';

/** Copy the shared validated placement; never allocate from occupancy or infer an episode. */
export function boardSeatProps(view: AudienceFacts, seat: PublicSeat): {
  readonly slotId?: string; readonly medical?: FullMedicalStatus | null;
} {
  if (!supportsBoardMedical(view.versions) || !('slotId' in seat) || !('medical' in seat)
    || typeof seat.slotId !== 'string' || seat.medical === undefined) return {};
  return { slotId: seat.slotId, medical: seat.medical === null ? null : { ...seat.medical } };
}

export function publicBoardProps(view: AudienceFacts, environment: ShellEnvironment): { readonly boardLayout?: PublicBoardModel } {
  if (!supportsBoardMedical(view.versions)) return {};
  const phase = view.phase;
  const duration = phase.endsAt === null ? null : phase.endsAt - phase.startedAt;
  const nowMs = duration !== null && environment.deadline.kind === 'running'
    ? phase.endsAt! - Math.max(0, Math.min(duration, environment.deadline.remainingMs))
    : phase.endsAt !== null && environment.deadline.kind === 'expired' ? phase.endsAt : null;
  return { boardLayout: { id: 'board-v2-0.1.1', playerCount: view.playerCount,
    clock: { phaseId: phase.id, kind: phase.kind, startedAt: phase.startedAt, endsAt: phase.endsAt,
      nowMs, current: isCurrent(environment) && nowMs !== null } } };
}

export function medicalOpportunityText(medical: FullMedicalStatus): string {
  switch (medical.rescueOpportunity) {
    case 'NEXT_NORMAL_ROUND': return `Rescue opportunity through Round ${medical.rescueDueAfterRound}.`;
    case 'CURRENT_NORMAL_ROUND': return `Rescue opportunity this round (Round ${medical.rescueDueAfterRound}).`;
    case 'NO_ADDITIONAL_ROUND': return 'No additional normal round for Rescue.';
    case 'CLOSED': return 'Rescue opportunity closed.';
  }
}
