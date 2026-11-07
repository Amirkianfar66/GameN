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
export { createConnectedPlayerAnnouncer, createPlayerAnnouncer, createTableAnnouncer } from './model/announcements.js';
export {
  ACTION_KINDS, choiceValue, completeChoice, COMPOUND_ACTION_COMMANDS, FACTIONS, isActionKind, isCompoundKind, isOffered, nextOptions, NOBODY, offeredChoices,
  offeredTargets, openness, sameChoice, SEAT_BALLOT_COMMANDS, TARGET_ACTION_COMMANDS,
} from './model/actions.js';
export { buildKnowledge } from './model/knowledge.js';
export { buildResult, matchOutcome } from './model/result.js';
export { actionStepFocusId, buildConnectedPlayerShellModel, describeAction } from './model/connected-player.js';
export type { Announcer } from './model/announcements.js';
export { displaySeconds, FINAL_SECONDS, formatClock, isCurrent, isSeatId, resolveScreen, seatNumber } from './model/common.js';
export { parseShellIntent } from './model/intent.js';
export type { IntentParams } from './model/intent.js';
export { buildPlayerShellModel } from './model/player-shell.js';
export { resolveShotGate, shotStepFocusId, shotTargetCandidates } from './model/shot.js';
export type { ShotGate } from './model/shot.js';
export { buildTableShellModel } from './model/table-shell.js';
export { BOARD_ROOMS, isBoardRoom, placeSeats, rowsFor, stationsFor } from './model/stations.js';
export type { BoardRoom, Station } from './model/stations.js';
export { buildVotePanel, ownBallotLine, tallyResult } from './model/votes.js';
export type * from './model/types.js';
export { escapeAttribute, escapeText, h, isElement, splitRegions, textOf, toHtml } from './markup/node.js';
export type { MarkupAttributes, MarkupAttributeValue, MarkupChild, MarkupElement, MarkupNode, MarkupTag, RegionSplit } from './markup/node.js';
export { planRedraw } from './markup/redraw.js';
export type { RedrawPlan, RedrawStep } from './markup/redraw.js';
export { actionChoiceId, actionOpenId, SHELL_IDS, shotTargetId } from './ids.js';
export { renderConnectedPlayerShell } from './markup/connected-player.js';
export { renderPlayerShell } from './markup/player-shell.js';
export { renderTableShell } from './markup/table-shell.js';

export { renderComicPlayerShell, renderComicTableShell, renderComicRoleCard } from './markup/comic-shell.js';
export type { ComicContext, ComicIdentity } from './markup/comic-shell.js';
