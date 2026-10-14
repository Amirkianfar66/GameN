import { supportsPublicHack } from '@mothership/contracts';
import { isCurrent } from './common.js';
import type { AudienceFacts, PublicCapsuleModel, ShellEnvironment } from './types.js';

/** Consume a view already accepted by the exact shared schema; never widen a wire shape. */
export function publicCapsuleProps(
  view: AudienceFacts, environment: ShellEnvironment,
): { readonly playerCount?: number; readonly capsule?: PublicCapsuleModel | null } {
  if (!supportsPublicHack(view.versions) || !('hackSession' in view)) return {};
  const props = { playerCount: view.playerCount, capsule: null };
  const session = view.hackSession;
  const phase = view.phase;
  if (!session || !['HACK_DECLARE', 'HACK_RESULT', 'HACK'].includes(phase.kind) || phase.endsAt === null
    || session.actorSeatId !== view.activeSeatId || session.actorSeatId === session.targetSeatId
    || ![session.actorSeatId, session.targetSeatId].every(id => view.seats.some(seat => seat.seatId === id))
    || (phase.kind === 'HACK_DECLARE' ? session.hackId !== phase.id : session.hackId === phase.id)) return props;
  const duration = phase.endsAt - phase.startedAt;
  const synchronized = environment.deadline.kind === 'running' || environment.deadline.kind === 'expired';
  const remainingMs = environment.deadline.kind === 'running'
    ? Math.max(0, Math.min(duration, environment.deadline.remainingMs)) : 0;
  return { playerCount: view.playerCount, capsule: {
    hackId: session.hackId, actorSeatId: session.actorSeatId, targetSeatId: session.targetSeatId,
    phaseId: phase.id, stage: phase.kind as PublicCapsuleModel['stage'],
    startedAt: phase.startedAt, endsAt: phase.endsAt,
    elapsedMs: synchronized ? duration - remainingMs : 0, remainingMs,
    current: synchronized && isCurrent(environment), inTime: remainingMs > 0,
  } };
}
