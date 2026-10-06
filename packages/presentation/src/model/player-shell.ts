import { en } from '../copy/en.js';
import {
  buildBanners, buildBlocked, buildDetails, buildPhaseStrip, buildSeats, buildSettings, buildZones, isCurrent, resolveScreen, seatNumber,
} from './common.js';
import type { ActionsModel, PlayerMatchModel, PlayerShellInput, PlayerShellModel, RoleDrawerModel } from './types.js';

function buildActions(input: PlayerShellInput, shotAvailable: boolean): ActionsModel {
  if (input.privacy.concealed) {
    return { heading: en.actions.heading, concealedText: en.actions.concealed, notice: null, cards: [] };
  }
  const notice = !isCurrent(input) ? en.actions.pausedStale : input.deadline.kind === 'expired' ? en.actions.pausedExpired : null;
  return {
    heading: en.actions.heading,
    concealedText: null,
    notice,
    // Every seat gets the same card. Only the server-supplied status differs, so the layout
    // of a phone does not depend on the role dealt to it.
    cards: [{
      id: 'shot', title: en.actions.shot.title, status: shotAvailable ? 'available' : 'unavailable',
      statusLabel: shotAvailable ? en.actions.shot.available : en.actions.shot.unavailable,
    }],
  };
}

function buildMatch(input: PlayerShellInput, view: NonNullable<PlayerShellInput['view']>): PlayerMatchModel {
  const selfSeatId = view.self.seatId;
  const seats = buildSeats(view, selfSeatId);
  const self = seats.find(seat => seat.isSelf);
  if (!self) throw new Error('A validated player view always contains its own seat');
  const open = input.privacy.roleDrawerOpen && !input.privacy.concealed;
  const roleDrawer: RoleDrawerModel = {
    heading: en.role.heading,
    open,
    toggleLabel: open ? en.role.hide : en.role.show,
    hint: en.role.hint,
    // A closed or concealed drawer carries no role at all; it is not merely hidden by style.
    role: open ? { label: en.role.label, name: view.self.role } : null,
  };
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
    actions: buildActions(input, view.self.shotAvailable),
    roleDrawer,
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
