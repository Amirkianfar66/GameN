import { en } from '../copy/en.js';
import {
  buildBanners, buildBlocked, buildDetails, buildPhaseStrip, buildSeats, buildSettings, buildZones, isCurrent, resolveScreen, seatNumber,
} from './common.js';
import type { ActionsModel, PlayerMatchModel, PlayerShellInput, PlayerShellModel, PrivateAreaModel } from './types.js';

function buildActions(input: PlayerShellInput, shotAvailable: boolean): ActionsModel {
  const notice = !isCurrent(input) ? en.actions.pausedStale : input.deadline.kind === 'expired' ? en.actions.pausedExpired : null;
  return {
    heading: en.actions.heading,
    notice,
    // Every seat gets the same card. Only the server-supplied status differs.
    cards: [{
      id: 'shot', title: en.actions.shot.title, status: shotAvailable ? 'available' : 'unavailable',
      statusLabel: shotAvailable ? en.actions.shot.available : en.actions.shot.unavailable,
    }],
  };
}

function buildPrivateArea(input: PlayerShellInput, view: NonNullable<PlayerShellInput['view']>): PrivateAreaModel {
  const open = input.privacy.revealed && !input.privacy.concealed;
  return {
    heading: en.privateArea.heading,
    hint: en.privateArea.hint,
    open,
    toggleLabel: open ? en.privateArea.hide : en.privateArea.show,
    // Closed or backgrounded, the role and the action status are not merely hidden by
    // style: they are not in the model, so they cannot reach the document.
    content: open ? { role: { label: en.privateArea.role, name: view.self.role }, actions: buildActions(input, view.self.shotAvailable) } : null,
  };
}

function buildMatch(input: PlayerShellInput, view: NonNullable<PlayerShellInput['view']>): PlayerMatchModel {
  const selfSeatId = view.self.seatId;
  const seats = buildSeats(view, selfSeatId);
  const self = seats.find(seat => seat.isSelf);
  if (!self) throw new Error('A validated player view always contains its own seat');
  return {
    identity: { seatId: selfSeatId, number: seatNumber(selfSeatId), label: en.seat.label(seatNumber(selfSeatId)) },
    phase: buildPhaseStrip(view, selfSeatId, input.deadline),
    location: {
      heading: en.location.heading,
      name: self.location,
      statusLabel: en.location.status,
      self,
      othersHeading: en.location.others,
      others: seats.filter(seat => !seat.isSelf && seat.location === self.location),
      aloneText: en.location.alone,
    },
    privateArea: buildPrivateArea(input, view),
    roster: { heading: en.roster.playerHeading, zones: buildZones(seats) },
    details: buildDetails(view, input.mode),
  };
}

export function buildPlayerShellModel(input: PlayerShellInput): PlayerShellModel {
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
