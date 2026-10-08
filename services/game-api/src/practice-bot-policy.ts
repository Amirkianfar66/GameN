import { FullCommandSchema, FullPlayerViewSchema } from '@mothership/contracts';
import type { FullCommand, FullPlayerView, SeatId } from '@mothership/contracts';
import { FULL_RULESET_VERSION, FULL_RULESET_HASH, isSupportedFullGameVersions } from '@mothership/engine';

// This is a practice heuristic over one authorized audience, not a balance model.
// Reviewed parent and ordinary-turn Pass overlay; Powers off. Pass remains player intent.
export const PRACTICE_BOT_RULESET_VERSION = FULL_RULESET_VERSION;
export const PRACTICE_BOT_RULESET_HASH = FULL_RULESET_HASH;

/**
 * Ordered candidates, at most one per command type. The caller must reproject after
 * each action and reconcile receipts; this pure function does not remember attempts.
 * No state, pooled knowledge, faction truth, clock or random source is accepted.
 */
export function choosePracticeBotActions(input: FullPlayerView): readonly FullCommand[] {
  if (arguments.length !== 1) throw new TypeError('Practice policy requires exactly one player view');
  const view = FullPlayerViewSchema.parse(input);
  if (!isSupportedFullGameVersions(view.versions)) {
    throw new TypeError('Unsupported practice ruleset');
  }
  const self = view.seats.find(seat => seat.seatId === view.self.seatId)!;
  if (['FINISHED', 'ABORTED'].includes(view.phase.kind) || self.health === 'Eliminated') return [];
  const commands: FullCommand[] = [];
  const targets = (type: string): SeatId[] => [...(view.legalTargets[type] ?? [])].sort();
  const firstOther = (type: string): SeatId | undefined => targets(type).find(seat => seat !== self.seatId);
  const ownTurn = view.phase.kind === 'ORDINARY_TURN' && view.activeSeatId === self.seatId;

  if (ownTurn) {
    if (view.self.role === 'Cracker' && view.self.rescuesRemaining > 0) {
      const target = targets('RESCUE').find(seat => view.seats.find(candidate => candidate.seatId === seat)?.health === 'Injured');
      if (target) commands.push({ type: 'RESCUE', targetSeatId: target });
    }
    if (['Blue Disabler', 'Red Disabler'].includes(view.self.role) && view.self.disablerAvailable) {
      const target = firstOther('DISABLE');
      if (target) commands.push({ type: 'DISABLE', targetSeatId: target });
    }
    if (view.self.role === 'Undercover') {
      const allowed = targets('PROTECT');
      const target = allowed.includes(self.seatId) ? self.seatId : allowed[0];
      if (target) commands.push({ type: 'PROTECT', targetSeatId: target });
    }
    if (view.self.role === 'Supplier' && view.round === 3) {
      const allowed = targets('SUPPLY');
      if (allowed.length >= 2) commands.push({ type: 'SUPPLY', targetSeatIds: [allowed[0]!, allowed[1]!] });
    }
    if (view.self.role === 'Hacker' && view.self.scanAvailable) {
      const allowed = targets('SCAN');
      const known = new Set(view.knowledge.scanResults.filter(result => result.matched).map(result => result.targetSeatId));
      const target = allowed.find(seat => !known.has(seat)) ?? allowed[0];
      if (target) {
        const previous = view.knowledge.scanResults.find(result => result.targetSeatId === target && result.matched);
        const guess = target === self.seatId || target === view.knowledge.undercoverSeatId ? 'Red'
          : previous?.guess ?? view.seats.find(seat => seat.seatId === target)?.revealedFaction ?? 'Blue';
        commands.push({ type: 'SCAN', targetSeatId: target, guess });
      }
    }
    if (view.self.shotAvailable && view.self.ordinaryWeapons > 0) {
      const target = firstOther('REGISTER_SHOT');
      if (target) commands.push({ type: 'REGISTER_SHOT', targetSeatId: target });
    }
  }

  if (['CAPTAIN_ELECTION', 'JAIL_VOTE'].includes(view.phase.kind) && !view.hasVoted
    && view.ballot.eligibleVoters.includes(self.seatId) && Object.hasOwn(view.legalTargets, 'VOTE')) {
    commands.push({ type: 'VOTE', targetSeatId: targets('VOTE')[0] ?? null });
  }
  if (view.phase.kind === 'RELEASE_CHOICE' && view.activeSeatId === self.seatId
    && Object.hasOwn(view.legalTargets, 'RELEASE_CHOICE')) {
    commands.push({ type: 'RELEASE_CHOICE', targetSeatId: targets('RELEASE_CHOICE')[0] ?? null });
  }
  if (view.phase.kind === 'RELEASE_VOTE' && view.self.releaseVoteAvailable && !view.hasVoted
    && view.ballot.eligibleVoters.includes(self.seatId)) {
    commands.push({ type: 'RELEASE_VOTE', approve: true });
  }
  if (view.phase.kind === 'SHOWDOWN') {
    const target = firstOther('SHOWDOWN_SHOT');
    if (target) commands.push({ type: 'SHOWDOWN_SHOT', targetSeatId: target });
  }

  // Movement can be available outside one's ordinary turn, including Hack/election.
  if (['ORDINARY_TURN', 'HACK', 'CAPTAIN_ELECTION'].includes(view.phase.kind)
    && self.health === 'Healthy' && !self.jailed && ['Room A', 'Room B', 'Command Room'].includes(self.location)
    && !(self.captain && self.location === 'Command Room')) {
    const preference = self.captain ? ['Command Room', 'Room A', 'Room B'] as const : ['Room A', 'Room B'] as const;
    const destination = preference.find(room => room !== self.location && view.self.movementDestinations.includes(room));
    if (destination) commands.push({ type: 'MOVE', destination });
  }

  // A Hacker guesses from its own authorized Scan membership evidence, never the
  // Alien's Code. Eliminated seats and the Hacker are still possible Code members.
  if (view.self.role === 'Hacker' && view.round === 5 && view.self.codeAttemptAvailable && view.phase.kind !== 'SHOWDOWN') {
    const positives = new Set(view.knowledge.scanResults.filter(result => result.matched && result.inCode === true).map(result => result.targetSeatId));
    const negatives = new Set(view.knowledge.scanResults.filter(result => result.matched && result.inCode === false).map(result => result.targetSeatId));
    const candidates = view.seats.map(seat => seat.seatId).filter(seat => seat !== view.knowledge.undercoverSeatId && !negatives.has(seat)).sort();
    const guess = [...candidates.filter(seat => positives.has(seat)), ...candidates.filter(seat => !positives.has(seat))].slice(0, 4);
    if (guess.length === 4) commands.push({ type: 'SUBMIT_CODE', seatIds: guess });
  }
  return commands.map(command => FullCommandSchema.parse(command));
}
