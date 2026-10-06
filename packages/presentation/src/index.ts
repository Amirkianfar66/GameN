import type { PlayerPresentationEvent, PlayerView, PublicPresentationEvent, PublicView } from '@mothership/contracts';

// A director must receive one audience's compatible snapshot/event pair.
// Deduplication and motion execution arrive with the event director slice.
export type PresentationInput =
  | { readonly view: PublicView; readonly events: readonly PublicPresentationEvent[] }
  | { readonly view: PlayerView; readonly events: readonly PlayerPresentationEvent[] };

// Three independent dimensions: lowering GPU cost never overrides a comfort setting.
export interface MotionPreferences {
  readonly reducedMotion: boolean;
  readonly reducedEffects: boolean;
  readonly muted: boolean;
}

export { en } from './copy/en.js';
export { createPlayerAnnouncer, createTableAnnouncer } from './model/announcements.js';
export type { Announcer } from './model/announcements.js';
export { displaySeconds, FINAL_SECONDS, formatClock, seatNumber } from './model/common.js';
export { buildPlayerShellModel } from './model/player-shell.js';
export { buildTableShellModel } from './model/table-shell.js';
export type * from './model/types.js';
export { escapeAttribute, escapeText, h, isElement, splitRegions, textOf, toHtml } from './markup/node.js';
export type { MarkupAttributes, MarkupAttributeValue, MarkupChild, MarkupElement, MarkupNode, MarkupTag, RegionSplit } from './markup/node.js';
export { SHELL_IDS } from './markup/parts.js';
export { renderPlayerShell } from './markup/player-shell.js';
export { renderTableShell } from './markup/table-shell.js';
