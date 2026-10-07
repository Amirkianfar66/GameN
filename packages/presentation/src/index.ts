// Three independent dimensions: lowering GPU cost never overrides a comfort setting.
export interface MotionPreferences {
  readonly reducedMotion: boolean;
  readonly reducedEffects: boolean;
  readonly muted: boolean;
}

export { en } from './copy/en.js';
export { createPlayerDirector, createPublicDirector } from './director/director.js';
export type { Cue, Director, IssuedCue, PlayerDirector } from './director/director.js';
export { createPlayerAnnouncer, createTableAnnouncer } from './model/announcements.js';
export type { Announcer } from './model/announcements.js';
export { displaySeconds, FINAL_SECONDS, formatClock, isCurrent, isSeatId, resolveScreen, seatNumber } from './model/common.js';
export { parseShellIntent } from './model/intent.js';
export type { IntentParams } from './model/intent.js';
export { buildPlayerShellModel } from './model/player-shell.js';
export { resolveShotGate, shotStepFocusId, shotTargetCandidates } from './model/shot.js';
export type { ShotGate } from './model/shot.js';
export { buildTableShellModel } from './model/table-shell.js';
export type * from './model/types.js';
export { escapeAttribute, escapeText, h, isElement, splitRegions, textOf, toHtml } from './markup/node.js';
export type { MarkupAttributes, MarkupAttributeValue, MarkupChild, MarkupElement, MarkupNode, MarkupTag, RegionSplit } from './markup/node.js';
export { planRedraw } from './markup/redraw.js';
export type { RedrawPlan, RedrawStep } from './markup/redraw.js';
export { SHELL_IDS, shotTargetId } from './ids.js';
export { renderPlayerShell } from './markup/player-shell.js';
export { renderTableShell } from './markup/table-shell.js';
