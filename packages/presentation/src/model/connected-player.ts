import type { FullPlayerView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { actionChoiceId, actionOpenId, SHELL_IDS } from '../ids.js';
import { ACTION_KINDS, choiceValue, isCompoundKind, nextOptions, offeredChoices, openness } from './actions.js';
import {
  buildBanners, buildBlocked, buildDetails, buildPhaseStrip, buildSeats, buildSettings, buildZones, isCurrent, isSeatId, resolveScreen, seatNumber,
} from './common.js';
import { buildKnowledge } from './knowledge.js';
import { buildResult } from './result.js';
import type {
  ActionChoice, ActionChoiceModel, ActionFlowState, ActionKind, ActionOfferModel, CardButtonModel, ConnectedActionBody, ConnectedActionCardModel,
  ConnectedActionStatus, ConnectedPlayerInput, ConnectedPlayerMatchModel, ConnectedPlayerShellModel, ConnectedPrivateAreaModel, SeatModel,
} from './types.js';
import { buildVotePanel, ownBallotLine } from './votes.js';

// A player's phone connected under wire protocol 2. Everything outside the private panel is
// built by the same functions as for every other audience. Inside it there is one card for
// the player's own command, because the seat has one command in progress at a time.
//
// Nothing here decides what a player may do. What is offered is the server's own list of
// destinations and legal targets, and only while the view is fresh and a clock this device
// can trust says the phase is still running.

/**
 * The interface would let the player start something right now. Gating, not eligibility.
 * A countdown that has ended closes it, and so does having no trusted clock to tell.
 */
const mayStart = (input: ConnectedPlayerInput): boolean => isCurrent(input) && input.deadline.kind === 'running';

function button(id: string, label: string, intent: CardButtonModel['intent'], primary = false, disabled = false): CardButtonModel {
  return { id, label, intent, primary, disabled };
}

// One line of the idle card, or null when the action is not listed at all. A move and an
// ordinary shot are always listed, open or not. Every other action, and every ballot, is
// listed only while the server's view opens it: which roles have which actions, and who may
// vote on what, is the server's knowledge, not this screen's.
function offer(input: ConnectedPlayerInput, view: FullPlayerView, kind: ActionKind): ActionOfferModel | null {
  const state = openness(view, kind);
  if (state === 'closed' && kind !== 'shot') return null;
  // On a view the server no longer confirms, or after the countdown, "available" would be a
  // claim about the present that this device cannot make: the offer is the last one it was sent.
  // The category open and nobody to name is said as it is, not as "unavailable".
  const statusLabel = state === 'open' ? (mayStart(input) ? en.action.offer.available : en.action.offer.paused)
    : state === 'closed' || kind === 'move' ? en.action.offer.unavailable
      : kind === 'supply' || kind === 'code' ? en.action.offer.tooFew : en.action.offer.noTarget;
  return {
    kind, label: en.action.kind[kind], statusLabel,
    open: state === 'open' && mayStart(input) ? { id: actionOpenId(kind), label: en.action.open[kind] } : null,
  };
}

const whoIs = (targetSeatId: SeatId, selfSeatId: SeatId | null): string => en.action.who(seatNumber(targetSeatId), targetSeatId === selfSeatId);
/** What a vote is on, read from the phase the server reports. The wire command is the same for both. */
const votedOn = (view: FullPlayerView): 'CAPTAIN_ELECTION' | 'JAIL_VOTE' | 'other' =>
  (view.phase.kind === 'CAPTAIN_ELECTION' || view.phase.kind === 'JAIL_VOTE' ? view.phase.kind : 'other');
/** The jailed player a release vote is on, as the public ballot names them. */
const releaseSubject = (view: FullPlayerView): string | null =>
  (view.ballot.releaseTargetSeatId === null ? null : whoIs(view.ballot.releaseTargetSeatId, view.self.seatId));

const answerChoice = (value: string, label: string): ActionChoiceModel => ({ id: actionChoiceId(value), value, label, detail: null, number: null });

function seatChoice(view: FullPlayerView, seatId: SeatId, seats: readonly SeatModel[]): ActionChoiceModel {
  const seat = seats.find(candidate => candidate.seatId === seatId);
  // A seat is described by the same public status every other player can see, and no more.
  const detail = (seat?.markers ?? []).filter(marker => marker.kind !== 'self' && marker.kind !== 'turn').map(marker => marker.label).join(', ');
  // Where the server lists the player's own seat, it is named as theirs.
  const label = seatId === view.self.seatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId));
  return { id: actionChoiceId(seatId), value: seatId, label, detail, number: seatNumber(seatId) };
}

function choiceModel(view: FullPlayerView, choice: Exclude<ActionChoice, { kind: 'scan' | 'supply' | 'code' }>, seats: readonly SeatModel[]): ActionChoiceModel {
  const value = choiceValue(choice);
  if (choice.kind === 'move') return answerChoice(value, en.location.name(choice.destination));
  if (choice.kind === 'release-vote') return answerChoice(value, choice.approve === null ? en.action.ballot.abstain : choice.approve ? en.action.ballot.yes : en.action.ballot.no);
  // The answer that names nobody: an abstention in a vote, no request from the Captain.
  if (choice.targetSeatId === null) return answerChoice(value, choice.kind === 'vote' ? en.action.ballot.abstain : en.action.ballot.noRequest);
  return seatChoice(view, choice.targetSeatId, seats);
}

/** What may be picked now: for an action with several parts, the next part, given the parts already picked. */
function choices(view: FullPlayerView, kind: ActionKind, picked: readonly string[], seats: readonly SeatModel[]): ActionChoiceModel[] {
  if (isCompoundKind(kind)) {
    // Seats in seat order; a guess is one of the factions, named as it is.
    const options = [...(nextOptions(view, kind, picked) ?? [])];
    return options.sort((a, b) => (isSeatId(a) && isSeatId(b) ? seatNumber(a) - seatNumber(b) : 0))
      .map(value => (isSeatId(value) ? seatChoice(view, value, seats) : answerChoice(value, value)));
  }
  const offered = [...(offeredChoices(view, kind) ?? [])] as Exclude<ActionChoice, { kind: 'scan' | 'supply' | 'code' }>[];
  // Seats in seat order, with the answer that names nobody after them. Places and answers stay as the view gives them.
  const rank = (choice: ActionChoice): number => ('targetSeatId' in choice ? (choice.targetSeatId === null ? Number.MAX_SAFE_INTEGER : seatNumber(choice.targetSeatId)) : 0);
  return offered.sort((a, b) => rank(a) - rank(b)).map(choice => choiceModel(view, choice, seats));
}

/** Seats in a list: by public number, in seat order, the player's own marked as theirs. */
const listedSeats = (view: FullPlayerView, seatIds: readonly SeatId[]): string => [...seatIds].sort((a, b) => seatNumber(a) - seatNumber(b))
  .map(seatId => (seatId === view.self.seatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId)))).join(', ');

function choosePrompt(view: FullPlayerView, kind: ActionKind, picked: readonly string[]): string {
  const [first] = picked;
  switch (kind) {
    case 'vote': return en.action.ballot.votePrompt[votedOn(view)];
    case 'release-vote': return en.action.ballot.releaseVotePrompt(releaseSubject(view));
    case 'scan': return isSeatId(first) ? en.action.compound.scanGuess(whoIs(first, view.self.seatId)) : en.action.compound.scanSeat;
    case 'supply': return picked.length === 0 ? en.action.compound.supplyFirst : en.action.compound.supplySecond;
    case 'code': return en.action.compound.codePick(4 - picked.length);
    default: return en.action.choosePrompt[kind];
  }
}

const seatName = (view: FullPlayerView, seatId: SeatId): string => (seatId === view.self.seatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId)));

/**
 * The parts already picked, in words, or null when there are none. Only seats are named: a
 * guess is picked last. They are listed in the order they were picked, so that the last one
 * named is the one going back takes away.
 */
function progress(view: FullPlayerView, picked: readonly string[]): string | null {
  const seatIds = picked.filter(isSeatId);
  return seatIds.length === 0 ? null : en.action.compound.picked(seatIds.map(seatId => seatName(view, seatId)).join(', '));
}

/** Going back with something picked takes the last pick away, and says which one. */
function undoLabel(view: FullPlayerView, picked: readonly string[]): string {
  const last = picked.at(-1);
  return isSeatId(last) ? en.action.compound.undo(seatName(view, last)) : en.action.compound.undoLast;
}

function confirmPrompt(choice: ActionChoice, view: FullPlayerView): string {
  const who = (seatId: SeatId): string => whoIs(seatId, view.self.seatId);
  switch (choice.kind) {
    case 'move': return en.action.confirmMove(choice.destination);
    case 'vote': return choice.targetSeatId === null ? en.action.ballot.confirmAbstain : en.action.ballot.confirmVote[votedOn(view)](who(choice.targetSeatId));
    case 'release-choice': return choice.targetSeatId === null ? en.action.ballot.confirmNoRequest : en.action.ballot.confirmRelease(who(choice.targetSeatId));
    case 'release-vote':
      if (choice.approve === null) return en.action.ballot.confirmAbstain;
      return en.action.ballot.confirmReleaseVote[choice.approve ? 'yes' : 'no'](releaseSubject(view));
    case 'scan': return en.action.compound.confirmScan(who(choice.targetSeatId), choice.guess);
    case 'supply': return en.action.compound.confirmSupply(who(choice.targetSeatIds[0]), who(choice.targetSeatIds[1]));
    case 'code': return en.action.compound.confirmCode(listedSeats(view, choice.seatIds));
    default: return en.action.confirmTarget[choice.kind](who(choice.targetSeatId));
  }
}

/** About this screen and, for a ballot, the one thing about it the approved rules make final. */
const consequence = (choice: ActionChoice): string =>
  (choice.kind === 'release-choice' && choice.targetSeatId === null ? en.action.ballot.consequenceNoRequest : en.action.consequence[choice.kind]);

/** What the server accepted, in the words of its receipt. Never what came of it. */
function acceptedText(choice: ActionChoice, selfSeatId: SeatId | null): string {
  switch (choice.kind) {
    case 'move': return en.action.moved(choice.destination);
    case 'vote': return choice.targetSeatId === null ? en.action.ballot.abstained : en.action.ballot.votedFor(whoIs(choice.targetSeatId, selfSeatId));
    case 'release-choice': return choice.targetSeatId === null ? en.action.ballot.noRequestMade : en.action.ballot.releaseRequested(whoIs(choice.targetSeatId, selfSeatId));
    case 'release-vote': return choice.approve === null ? en.action.ballot.abstained : en.action.ballot.releaseVoted[choice.approve ? 'yes' : 'no'];
    case 'scan': return en.action.compound.scanAccepted(whoIs(choice.targetSeatId, selfSeatId), choice.guess);
    case 'supply': return en.action.compound.supplyAccepted(whoIs(choice.targetSeatIds[0], selfSeatId), whoIs(choice.targetSeatIds[1], selfSeatId));
    // The attempt itself is not repeated: it is the most private thing a phone ever sends.
    case 'code': return en.action.compound.codeAccepted;
    default: return en.action.acceptedTarget[choice.kind](whoIs(choice.targetSeatId, selfSeatId));
  }
}

/** Where the outcome of an accepted command is to be read. A receipt is not an outcome. */
function acceptedDetail(choice: ActionChoice): string {
  switch (choice.kind) {
    case 'move': return en.action.movedDetail;
    case 'vote':
    case 'release-choice':
    case 'release-vote': return en.action.ballot.acceptedDetail[choice.kind];
    case 'scan': return en.action.compound.scanDetail;
    case 'supply': return en.action.compound.supplyDetail;
    case 'code': return en.action.compound.codeDetail;
    default: return en.action.acceptedDetail[choice.kind];
  }
}

/**
 * What became of the player's command, in one line, or null for a step that reports nothing.
 * Used for the card and for what is spoken, so the two never say different things.
 */
export function describeAction(action: ActionFlowState, selfSeatId: SeatId | null = null): string | null {
  switch (action.step) {
    case 'submitting': return action.choice === null ? en.action.submitting.unknownKind : en.action.submitting[action.choice.kind];
    case 'checking': return action.recovered ? en.action.checkingAfterReload : en.action.checking;
    case 'unknown': return en.action.unknown;
    case 'accepted': return action.choice === null ? en.action.acceptedAfterReload : acceptedText(action.choice, selfSeatId);
    case 'rejected': return en.action.rejected[action.code];
    case 'not-accepted': return en.action.notAccepted[action.reason];
    default: return null;
  }
}

function buildBody(input: ConnectedPlayerInput, view: FullPlayerView, seats: readonly SeatModel[]): { status: ConnectedActionStatus; title: string; body: ConnectedActionBody } {
  // A choice that has not been sent cannot outlive the conditions it was made under.
  const unsent = input.action.step === 'choosing' || input.action.step === 'confirming';
  const action: ActionFlowState = unsent && !mayStart(input) ? { step: 'idle' } : input.action;
  const titled = (kind: ActionKind | null): string => (kind === null ? en.action.title : en.action.kind[kind]);
  const acknowledge = (label: string, armed: boolean): CardButtonModel => button(SHELL_IDS.actionDismiss, label, 'action/dismiss', true, !armed);

  switch (action.step) {
    case 'idle': {
      const queued = view.ownPendingCommandIds.length;
      const offers = ACTION_KINDS.map(kind => offer(input, view, kind)).filter(listed => listed !== null);
      return { status: 'idle', title: en.action.title, body: { step: 'idle', offers, note: queued > 0 ? en.action.queued(queued) : null } };
    }
    case 'choosing': {
      const picked = action.picked ?? [];
      return { status: 'choosing', title: titled(action.kind), body: {
        step: 'choosing', prompt: choosePrompt(view, action.kind, picked), note: en.action.chooseNote, choices: choices(view, action.kind, picked, seats),
        progress: progress(view, picked),
        // With something picked, going back takes the last pick away; with nothing, it puts the action down.
        back: button(SHELL_IDS.actionBack, picked.length > 0 ? undoLabel(view, picked) : en.action.cancel, 'action/back'),
      } };
    }
    case 'confirming':
      return { status: 'confirming', title: titled(action.choice.kind), body: {
        step: 'confirming', prompt: confirmPrompt(action.choice, view), consequence: consequence(action.choice),
        confirm: button(SHELL_IDS.actionConfirm, en.action.confirm[action.choice.kind], 'action/confirm', true, !action.armed),
        back: button(SHELL_IDS.actionBack, en.action.chooseAgain, 'action/back'),
      } };
    case 'submitting':
    case 'checking':
      return { status: action.step, title: titled(action.choice?.kind ?? null), body: { step: 'busy', text: describeAction(action, view.self.seatId) ?? '' } };
    case 'unknown':
      return { status: 'unknown', title: titled(action.choice?.kind ?? null), body: {
        step: 'result', outcome: 'unknown', text: en.action.unknown,
        detail: action.phaseOver ? en.action.unknownPhaseOver : action.recovered ? en.action.unknownAfterReload : en.action.unknownDetail,
        // The card stays until the server has answered about the command. There is no control
        // to put an unaccounted-for command aside, whatever phase it is by now.
        action: button(SHELL_IDS.actionCheck, en.action.checkAgain, 'action/check-again', true, !action.armed),
      } };
    case 'accepted': {
      // A receipt is not an outcome. Each wording says what was accepted and where the outcome is to be read.
      const detail = action.choice === null ? en.action.acceptedAfterReloadDetail : acceptedDetail(action.choice);
      return { status: 'accepted', title: titled(action.choice?.kind ?? null), body: {
        step: 'result', outcome: 'accepted', text: describeAction(action, view.self.seatId) ?? '', detail, action: acknowledge(en.action.done, action.armed),
      } };
    }
    case 'rejected':
      return { status: 'not-accepted', title: titled(action.choice?.kind ?? null), body: {
        step: 'result', outcome: 'not-accepted', text: en.action.rejected[action.code], detail: action.code === 'NOT_ALLOWED' ? en.action.tryAgainHint : null,
        action: acknowledge(en.action.ok, action.armed),
      } };
    case 'not-accepted': {
      const retryable = action.reason === 'NOT_SENT' || action.reason === 'COMMAND_ID_CONFLICT' || action.reason === 'REQUEST_ID_CONFLICT' || action.reason === 'PHASE_OVER';
      return { status: 'not-accepted', title: titled(action.choice?.kind ?? null), body: {
        step: 'result', outcome: 'not-accepted', text: en.action.notAccepted[action.reason], detail: retryable ? en.action.tryAgainHint : null,
        action: acknowledge(en.action.ok, action.armed),
      } };
    }
  }
}

function buildCard(input: ConnectedPlayerInput, view: FullPlayerView, seats: readonly SeatModel[]): ConnectedActionCardModel {
  const { status, title, body } = buildBody(input, view, seats);
  return { title, status, statusLabel: en.action.status[status], selected: !['idle', 'accepted', 'not-accepted'].includes(status), body };
}

function buildPrivateArea(input: ConnectedPlayerInput, view: FullPlayerView, seats: readonly SeatModel[]): ConnectedPrivateAreaModel {
  const open = input.privacy.revealed && !input.privacy.concealed;
  const over = view.phase.kind === 'FINISHED' || view.phase.kind === 'ABORTED';
  const notice = !isCurrent(input) ? en.actions.pausedStale
    : over ? en.actions.matchOver
      : input.deadline.kind === 'expired' ? en.actions.pausedExpired
        : input.deadline.kind === 'unsynced' ? en.actions.pausedUnsynced : null;
  return {
    heading: en.privateArea.heading,
    hint: en.privateArea.hint,
    open,
    toggleLabel: open ? en.privateArea.hide : en.privateArea.show,
    // Closed or backgrounded, the role and every step of an action are not merely hidden by
    // style: they are not in the model, so they cannot reach the document.
    content: open ? {
      role: { label: en.privateArea.role, name: view.self.role },
      // The server's own statement that this seat is in a Hack, and who with.
      hack: view.hackPartnerSeatId === null ? null : en.action.hackWith(seatNumber(view.hackPartnerSeatId)),
      // The server's own statement of this seat's ballot in the vote that is open.
      ballot: ownBallotLine(view),
      knowledge: buildKnowledge(view),
      actions: { heading: en.actions.heading, notice, card: buildCard(input, view, seats) },
    } : null,
  };
}

function buildMatch(input: ConnectedPlayerInput, view: FullPlayerView): ConnectedPlayerMatchModel {
  const selfSeatId = view.self.seatId;
  const seats = buildSeats(view, selfSeatId);
  const self = seats.find(seat => seat.isSelf);
  if (!self) throw new Error('A validated player view always contains its own seat');
  return {
    identity: { seatId: selfSeatId, number: seatNumber(selfSeatId), label: en.seat.label(seatNumber(selfSeatId)) },
    phase: buildPhaseStrip(view, selfSeatId, input.deadline),
    location: {
      heading: en.location.heading, name: self.location, statusLabel: en.location.status, self,
      othersHeading: en.location.others, others: seats.filter(seat => !seat.isSelf && seat.location === self.location), aloneText: en.location.alone,
    },
    privateArea: buildPrivateArea(input, view, seats),
    vote: buildVotePanel(view),
    result: buildResult(view, selfSeatId),
    roster: { heading: en.roster.playerHeading, zones: buildZones(seats) },
    details: buildDetails(view, input.mode),
  };
}

export function buildConnectedPlayerShellModel(input: ConnectedPlayerInput): ConnectedPlayerShellModel {
  const screen = resolveScreen(input, input.view !== null);
  const match = screen === 'match' && input.view !== null ? buildMatch(input, input.view) : null;
  return {
    surface: 'player',
    title: match ? en.title.player(match.identity.number) : en.title.playerConnecting,
    screen,
    mode: input.mode,
    connection: input.connection,
    motion: input.motion.reducedMotion ? 'reduced' : 'full',
    banners: buildBanners(input, input.view !== null),
    blocked: buildBlocked(input),
    connectingText: en.connecting.text,
    settings: buildSettings(input.motion),
    match,
  };
}

/**
 * Where keyboard focus belongs after the player moved the card to another step: on the line
 * that asks or reports, never on the control that would send a command. While a command is
 * in flight focus rests on the card's title, which is not redrawn.
 */
export function actionStepFocusId(card: ConnectedActionCardModel): string {
  if (card.body.step === 'busy') return SHELL_IDS.actionTitle;
  if (card.body.step !== 'idle') return SHELL_IDS.actionStep;
  return card.body.offers.find(candidate => candidate.open !== null)?.open?.id ?? SHELL_IDS.actionTitle;
}
