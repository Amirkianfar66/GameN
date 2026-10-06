import type { FullPlayerView, SeatId } from '@mothership/contracts';
import type { ActionKind, TargetActionKind } from './types.js';

// The actions a connected phone can offer, and where each one's legality is read from.
// Nothing here decides what a player may do: an action is offered only while the player's
// own authoritative view lists it, and with exactly the choices that view lists.

/** Every action the connected phone knows how to offer, in the order it lists them. */
export const ACTION_KINDS: readonly ActionKind[] = ['move', 'shot', 'disable', 'protect', 'rescue', 'hack', 'showdown-shot'];

/**
 * The wire command each action that names one seat sends. The same name is the key under
 * which the player's view lists the seats the server will accept for it.
 */
export const TARGET_ACTION_COMMANDS = {
  shot: 'REGISTER_SHOT',
  disable: 'DISABLE',
  protect: 'PROTECT',
  rescue: 'RESCUE',
  hack: 'REQUEST_HACK',
  'showdown-shot': 'SHOWDOWN_SHOT',
} as const satisfies Record<TargetActionKind, string>;

export function isActionKind(value: unknown): value is ActionKind {
  return typeof value === 'string' && (ACTION_KINDS as readonly string[]).includes(value);
}

/**
 * The seats the server lists for one action right now, or null when the view does not open
 * that action at all. An empty list is an open action with nobody to choose.
 */
export function offeredTargets(view: FullPlayerView, kind: TargetActionKind): readonly SeatId[] | null {
  // The view states an ordinary shot twice, as a flag and as a list. Both must say it is open.
  if (kind === 'shot' && !view.self.shotAvailable) return null;
  return view.legalTargets[TARGET_ACTION_COMMANDS[kind]] ?? null;
}
