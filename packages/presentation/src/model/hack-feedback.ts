import { supportsDeclaredHack } from '@mothership/contracts';
import type { FullPlayerView } from '@mothership/contracts';
import { isCurrent, seatNumber } from './common.js';
import type { ConnectedPlayerInput, HackFeedbackModel } from './types.js';

/** Only current, authorized participant feedback reaches the private panel. */
export function buildHackFeedback(input: ConnectedPlayerInput, view: FullPlayerView): HackFeedbackModel | null {
  const stage = view.phase.kind;
  if (!supportsDeclaredHack(view.versions) || !isCurrent(input) || input.deadline.kind !== 'running'
    || !input.privacy.revealed || input.privacy.concealed || view.audience.seatId !== view.self.seatId
    || !['HACK_DECLARE', 'HACK_RESULT', 'HACK'].includes(stage)) return null;
  const f = view.hackFeedback;
  const partner = view.hackPartnerSeatId;
  const initiator = view.activeSeatId;
  if (!f || !f.hackId || f.phaseId !== view.phase.id || f.round !== view.round || partner === null
    || partner === view.self.seatId || initiator === null || !view.seats.some(seat => seat.seatId === partner)
    || (initiator !== view.self.seatId && initiator !== partner)) return null;
  if (stage === 'HACK_DECLARE') {
    if (f.hackId !== view.phase.id || f.status !== 'AWAITING_DECLARATION' || f.declaredSide !== null) return null;
  } else if (f.hackId === view.phase.id || f.status === 'AWAITING_DECLARATION'
    || (f.status === 'DECLARED' ? !['Blue', 'Red', 'Alien'].includes(f.declaredSide ?? '') : f.status !== 'NO_DECLARATION' || f.declaredSide !== null)) return null;
  const declarer = initiator === view.self.seatId ? partner : view.self.seatId;
  const message = stage === 'HACK_DECLARE'
    ? (declarer === view.self.seatId ? 'Choose Blue, Red or Alien.' : `Waiting for Player ${seatNumber(declarer)}’s declaration.`)
    : f.status === 'NO_DECLARATION' ? 'No side declared' : `Player ${seatNumber(declarer)} claims ${f.declaredSide?.toUpperCase()}.`;
  return { id: f.hackId, phaseId: f.phaseId, stage: stage as HackFeedbackModel['stage'], declaringSeatId: declarer,
    heading: stage === 'HACK_DECLARE' ? 'Private declaration' : stage === 'HACK_RESULT' ? 'Private Hack claim' : 'Private conversation',
    message, note: stage === 'HACK_DECLARE' ? 'Only the two participants receive this declaration.' : 'Declarations may be bluffs.', declaredSide: f.declaredSide };
}
