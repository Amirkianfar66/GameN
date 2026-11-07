import { isActionKind } from './actions.js';
import { isSeatId } from './common.js';
import type { ShellIntent, ShellIntentType } from './types.js';

type PlainIntentType = Exclude<ShellIntentType, 'shot/choose-target' | 'settings/reduce-motion' | 'action/open' | 'action/choose'>;

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
  'action/pass': true,
  'action/back': true,
  'action/confirm': true,
  'action/check-again': true,
  'action/dismiss': true,
};

/** What a control carries besides its intent name: a seat on a target, the state of a checkbox. */
export interface IntentParams {
  readonly seatId?: string | undefined;
  readonly checked?: boolean | undefined;
  /** Which action an "open" control is for. */
  readonly kind?: string | undefined;
  /** The destination or seat a choice control stands for. */
  readonly value?: string | undefined;
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
  if (type === 'action/open') return isActionKind(params.kind) ? { type, kind: params.kind } : null;
  // The value is carried as it is and judged by the screen against what the server offers.
  if (type === 'action/choose') return typeof params.value === 'string' && params.value.length > 0 && params.value.length <= 32 ? { type, value: params.value } : null;
  return null;
}
