import type { PlayerView, SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import { SHELL_IDS } from '../ids.js';
import { isCurrent, seatNumber } from './common.js';
import type {
  ActionCardModel, CardButtonModel, PlayerShellInput, SeatModel, ShellEnvironment, ShotCardBody, ShotCardStatus, ShotFlowInput, ShotTargetModel,
} from './types.js';

/**
 * Whether the interface lets the player start or send a shot right now. This is gating,
 * not eligibility: it uses only the server's own availability flag, whose turn it is, and
 * whether this device is looking at current, unexpired facts. The server's answer to the
 * command is what decides.
 */
export type ShotGate =
  | { readonly open: true }
  /** paused: the view is out of date or the phase clock has run out. It says nothing about the player. */
  | { readonly open: false; readonly why: 'unavailable' | 'paused' | 'not-your-turn' };

export function resolveShotGate(env: ShellEnvironment, view: PlayerView): ShotGate {
  if (!view.self.shotAvailable) return { open: false, why: 'unavailable' };
  if (!isCurrent(env) || env.deadline.kind === 'expired') return { open: false, why: 'paused' };
  if (view.phase.kind !== 'ORDINARY_TURN' || view.activeSeatId !== view.self.seatId) return { open: false, why: 'not-your-turn' };
  return { open: true };
}

/**
 * Seats offered as targets. PROVISIONAL: a hint, not a legal-target list. Wire protocol 1
 * carries no server-computed targets, so this applies the one targeting requirement the
 * current rule source states outright (a target in the same location) and nothing else:
 * no health, Jail, Captain or Command Room inference. Offering oneself is left out because
 * no source settles it. A protocol that supplies legal targets replaces this function.
 */
export function shotTargetCandidates(view: PlayerView): SeatId[] {
  const own = view.seats.find(seat => seat.seatId === view.self.seatId);
  if (!own) return [];
  return view.seats
    .filter(seat => seat.seatId !== own.seatId && seat.location === own.location)
    .map(seat => seat.seatId)
    .sort((a, b) => seatNumber(a) - seatNumber(b));
}

function button(id: string, label: string, intent: CardButtonModel['intent'], primary = false): CardButtonModel {
  return { id, label, intent, primary };
}

function card(status: ShotCardStatus, selected: boolean, body: ShotCardBody): ActionCardModel {
  return { id: 'shot', title: en.shot.title, status, statusLabel: en.shot.status[status], selected, body };
}

// A target is described by the same public status every other player can see, and no more.
function targetModel(seats: readonly SeatModel[], seatId: SeatId): ShotTargetModel {
  const number = seatNumber(seatId);
  const seat = seats.find(candidate => candidate.seatId === seatId);
  const detail = (seat?.markers ?? []).filter(marker => marker.kind !== 'self' && marker.kind !== 'turn').map(marker => marker.label).join(', ');
  return { seatId, number, label: en.seat.label(number), detail };
}

function targetingBody(view: PlayerView, seats: readonly SeatModel[]): ShotCardBody {
  return {
    step: 'targeting',
    prompt: en.shot.targetPrompt,
    note: en.shot.targetNote,
    targets: shotTargetCandidates(view).map(seatId => targetModel(seats, seatId)),
    emptyText: en.shot.targetEmpty,
    back: button(SHELL_IDS.shotBack, en.shot.cancel, 'shot/back'),
  };
}

function settled(text: string, detail: string | null): ShotCardBody {
  return { step: 'result', outcome: 'not-registered', text, detail, action: button(SHELL_IDS.shotDismiss, en.shot.ok, 'shot/dismiss', true) };
}

/**
 * The Shot card for one moment of the flow. Every seat gets the same card; only the
 * server-supplied availability and this device's own progress differ.
 */
export function buildShotCard(input: PlayerShellInput, view: PlayerView, seats: readonly SeatModel[]): ActionCardModel {
  const gate = resolveShotGate(input, view);
  // A choice that has not been sent cannot outlive the conditions it was made under.
  const choosing = input.shot.step === 'targeting' || input.shot.step === 'confirming';
  const shot: ShotFlowInput = choosing && !gate.open ? { step: 'idle', registeredTargetSeatId: null } : input.shot;

  switch (shot.step) {
    case 'idle': {
      const remembered = shot.registeredTargetSeatId;
      const pending = view.ownPendingCommandIds.length > 0;
      const note = remembered !== null ? en.shot.registeredAt(seatNumber(remembered)) : pending ? en.shot.registeredEarlier : null;
      // This device's own accepted command is newer than the view on screen. The action is
      // not offered again until the view has caught up with it.
      const awaitingView = remembered !== null && !pending;
      return card(note !== null ? 'registered' : view.self.shotAvailable ? 'available' : 'unavailable', false, {
        step: 'idle',
        open: gate.open && !awaitingView ? button(SHELL_IDS.shotOpen, en.shot.open, 'shot/open', true) : null,
        reason: !gate.open && gate.why === 'not-your-turn' ? en.shot.reasonNotYourTurn : null,
        note,
      });
    }
    case 'targeting':
      return card('targeting', true, targetingBody(view, seats));
    case 'confirming': {
      // The chosen player is no longer among the hints, so the choice is asked for again.
      if (!shotTargetCandidates(view).includes(shot.targetSeatId)) return card('targeting', true, targetingBody(view, seats));
      return card('confirming', true, {
        step: 'confirming',
        prompt: en.shot.confirmPrompt(seatNumber(shot.targetSeatId)),
        consequence: en.shot.confirmConsequence,
        confirm: button(SHELL_IDS.shotConfirm, en.shot.confirm, 'shot/confirm', true),
        back: button(SHELL_IDS.shotBack, en.shot.chooseAgain, 'shot/back'),
      });
    }
    case 'submitting':
      return card('submitting', true, { step: 'busy', text: en.shot.submitting });
    case 'checking':
      return card('checking', true, { step: 'busy', text: en.shot.checking });
    case 'unknown':
      return card('unknown', true, {
        step: 'result', outcome: 'unknown', text: en.shot.unknown, detail: en.shot.unknownDetail,
        action: button(SHELL_IDS.shotCheck, en.shot.checkAgain, 'shot/check-again', true),
      });
    case 'registered':
      return card('registered', false, {
        step: 'result', outcome: 'registered', text: en.shot.registered(seatNumber(shot.targetSeatId)), detail: en.shot.registeredDetail,
        action: button(SHELL_IDS.shotDismiss, en.shot.done, 'shot/dismiss', true),
      });
    case 'rejected':
      return card('not-registered', false, settled(en.shot.rejected[shot.code], shot.code === 'NOT_ALLOWED' ? en.shot.tryAgainHint : null));
    case 'not-registered': {
      const retryable = shot.reason === 'NOT_SENT' || shot.reason === 'COMMAND_ID_CONFLICT';
      return card('not-registered', false, settled(en.shot.notRegistered[shot.reason], retryable ? en.shot.tryAgainHint : null));
    }
  }
}

/**
 * Where keyboard focus belongs after the player moved the card to another step. A step that
 * asks or reports something is focused on that line, never on the control that would send a
 * command. While a command is in flight focus rests on the card's title, which is not
 * redrawn, and the result is spoken instead.
 */
export function shotStepFocusId(shotCard: ActionCardModel): string {
  const body = shotCard.body;
  if (body.step === 'busy') return SHELL_IDS.shotTitle;
  if (body.step !== 'idle') return SHELL_IDS.shotStep;
  // Back where the flow starts: on the control that opens it, when there is one.
  if (body.open !== null) return body.open.id;
  return body.note !== null || body.reason !== null ? SHELL_IDS.shotStep : SHELL_IDS.shotTitle;
}
