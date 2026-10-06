import { isSeatId } from './common.js';
import type { ShellIntent, ShellIntentType } from './types.js';

type PlainIntentType = Exclude<ShellIntentType, 'shot/choose-target' | 'settings/reduce-motion'>;

// A record, not a list, so adding an intent to the model without deciding how a control
// carries it fails to compile here.
const PLAIN: Readonly<Record<PlainIntentType, true>> = {
  'private/toggle': true,
  'session/reconnect': true,
  'app/reload': true,
  'shot/open': true,
  'shot/back': true,
  'shot/confirm': true,
  'shot/check-again': true,
  'shot/dismiss': true,
};

/** What a control carries besides its intent name: a seat on a target, the state of a checkbox. */
export interface IntentParams {
  readonly seatId?: string | undefined;
  readonly checked?: boolean | undefined;
}

/**
 * Turns what a host read off a control into a typed intent, or null when it is not one.
 * Hosts go through this instead of assembling intents, so a control can never make a
 * screen act on a name or a seat the shells do not define.
 */
export function parseShellIntent(type: string | undefined, params: IntentParams = {}): ShellIntent | null {
  if (type === undefined) return null;
  if (Object.hasOwn(PLAIN, type)) return { type: type as PlainIntentType };
  if (type === 'shot/choose-target') return isSeatId(params.seatId) ? { type, seatId: params.seatId } : null;
  if (type === 'settings/reduce-motion') return typeof params.checked === 'boolean' ? { type, checked: params.checked } : null;
  return null;
}
