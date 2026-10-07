import { OwnAcknowledgmentsSchema } from '@mothership/contracts';
import type { OwnAcknowledgments, SeatId } from '@mothership/contracts';
import type { FullGameState } from './model.js';

/** Own-seat durable private evidence. It is separate from protocol-2 game views. */
export function projectOwnAcknowledgments(state: FullGameState, seatId: SeatId, bindingRevision = 1): OwnAcknowledgments {
  if (!state.seats.some(seat => seat.seatId === seatId)) throw new Error('Acknowledgments require an existing seat');
  if (!Number.isSafeInteger(bindingRevision) || bindingRevision < 1) throw new Error('Invalid acknowledgment binding revision');
  const historyAvailable = state.supplierGrantResults !== undefined;
  const ledger = historyAvailable ? state.supplierGrantResults! : [];
  if (!Array.isArray(ledger)) throw new Error('Invalid acknowledgment history');
  const supplierResults = ledger.filter(result => result.supplierSeatId === seatId).map(result => ({
    round: result.round, commandId: result.commandId, successfulRecipientSeatIds: [...result.successfulRecipientSeatIds],
  }));
  const receivedSupply = ledger.filter(result => result.successfulRecipientSeatIds.includes(seatId)).map(result => ({
    round: result.round, ordinaryWeaponsGranted: 1 as const,
  }));
  // Neither another player's evidence nor journal/phase advancement changes this
  // audience's revision. Binding changes also advance it for same-UID recovery.
  const revision = bindingRevision - 1 + (historyAvailable ? 1 : 0) + supplierResults.length + receivedSupply.length;
  if (!Number.isSafeInteger(revision)) throw new Error('Acknowledgment revision overflow');
  return OwnAcknowledgmentsSchema.parse({
    schemaVersion: 1, protocolVersion: 2, matchId: state.matchId, seatId, bindingRevision,
    revision, historyAvailable, supplierResults, receivedSupply,
  });
}
