import type { FullPlayerView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { actionChoiceId, actionOpenId, SHELL_IDS } from '../ids.js';
import { ACTION_KINDS, offeredTargets } from './actions.js';
import {
  buildBanners, buildBlocked, buildDetails, buildPhaseStrip, buildSeats, buildSettings, buildZones, isCurrent, resolveScreen, seatNumber,
} from './common.js';
import type {
  ActionChoice, ActionChoiceModel, ActionFlowState, ActionKind, ActionOfferModel, CardButtonModel, ConnectedActionBody, ConnectedActionCardModel,
  ConnectedActionStatus, ConnectedPlayerInput, ConnectedPlayerMatchModel, ConnectedPlayerShellModel, ConnectedPrivateAreaModel, SeatModel,
} from './types.js';

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
// ordinary shot are always listed, open or not. Every other action is listed only while the
// server's view opens it: which roles have which actions is the server's knowledge, not this
// screen's.
function offer(input: ConnectedPlayerInput, view: FullPlayerView, kind: ActionKind): ActionOfferModel | null {
  const targets = kind === 'move' ? null : offeredTargets(view, kind);
  if (kind !== 'move' && kind !== 'shot' && targets === null) return null;
  const count = kind === 'move' ? view.self.movementDestinations.length : targets?.length ?? 0;
  // On a view the server no longer confirms, or after the countdown, "available" would be a
  // claim about the present that this device cannot make: the offer is the last one it was sent.
  // The category open and nobody to target is said as it is, not as "unavailable".
  const statusLabel = count > 0 ? (mayStart(input) ? en.action.offer.available : en.action.offer.paused)
    : targets !== null ? en.action.offer.noTarget : en.action.offer.unavailable;
  return {
    kind, label: en.action.kind[kind], statusLabel,
    open: count > 0 && mayStart(input) ? { id: actionOpenId(kind), label: en.action.open[kind] } : null,
  };
}

function choices(view: FullPlayerView, kind: ActionKind, seats: readonly SeatModel[]): ActionChoiceModel[] {
  if (kind === 'move') {
    return view.self.movementDestinations.map(destination => ({ id: actionChoiceId(destination), value: destination, label: en.location.name(destination), detail: null, number: null }));
  }
  return [...(offeredTargets(view, kind) ?? [])].sort((a, b) => seatNumber(a) - seatNumber(b)).map(seatId => {
    const seat = seats.find(candidate => candidate.seatId === seatId);
    // A target is described by the same public status every other player can see, and no more.
    const detail = (seat?.markers ?? []).filter(marker => marker.kind !== 'self' && marker.kind !== 'turn').map(marker => marker.label).join(', ');
    // Where the server lists the player's own seat, it is named as theirs.
    const label = seatId === view.self.seatId ? en.seat.labelSelf(seatNumber(seatId)) : en.seat.label(seatNumber(seatId));
    return { id: actionChoiceId(seatId), value: seatId, label, detail, number: seatNumber(seatId) };
  });
}

const whoIs = (targetSeatId: SeatId, selfSeatId: SeatId | null): string => en.action.who(seatNumber(targetSeatId), targetSeatId === selfSeatId);
const confirmPrompt = (choice: ActionChoice, selfSeatId: SeatId): string =>
  (choice.kind === 'move' ? en.action.confirmMove(choice.destination) : en.action.confirmTarget[choice.kind](whoIs(choice.targetSeatId, selfSeatId)));

/**
 * What became of the player's command, in one line, or null for a step that reports nothing.
 * Used for the card and for what is spoken, so the two never say different things.
 */
export function describeAction(action: ActionFlowState, selfSeatId: SeatId | null = null): string | null {
  switch (action.step) {
    case 'submitting': return action.choice === null ? en.action.submitting.unknownKind : en.action.submitting[action.choice.kind];
    case 'checking': return action.recovered ? en.action.checkingAfterReload : en.action.checking;
    case 'unknown': return en.action.unknown;
    case 'accepted':
      if (action.choice === null) return en.action.acceptedAfterReload;
      return action.choice.kind === 'move' ? en.action.moved(action.choice.destination) : en.action.acceptedTarget[action.choice.kind](whoIs(action.choice.targetSeatId, selfSeatId));
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
    case 'choosing':
      return { status: 'choosing', title: titled(action.kind), body: {
        step: 'choosing', prompt: en.action.choosePrompt[action.kind], note: en.action.chooseNote, choices: choices(view, action.kind, seats),
        back: button(SHELL_IDS.actionBack, en.action.cancel, 'action/back'),
      } };
    case 'confirming':
      return { status: 'confirming', title: titled(action.choice.kind), body: {
        step: 'confirming', prompt: confirmPrompt(action.choice, view.self.seatId), consequence: en.action.consequence[action.choice.kind],
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
      const detail = action.choice === null ? en.action.acceptedAfterReloadDetail : action.choice.kind === 'move' ? en.action.movedDetail : en.action.acceptedDetail[action.choice.kind];
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
  const notice = !isCurrent(input) ? en.actions.pausedStale
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
