import type { SeatId } from '@mothership/contracts';
import { en } from '../copy/en.js';
import type {
  AudienceFacts, BannerModel, BlockedModel, DataSourceMode, DeadlineEstimate, LocationName, MarkerModel, MatchDetailsModel,
  MotionSettingsInput, PhaseStripModel, SeatModel, SettingsModel, ShellEnvironment, TimerModel, ZoneModel,
} from './types.js';

type AudienceView = AudienceFacts;

const SEAT_NUMBER: Readonly<Record<SeatId, number>> = {
  'seat-1': 1, 'seat-2': 2, 'seat-3': 3, 'seat-4': 4, 'seat-5': 5, 'seat-6': 6, 'seat-7': 7, 'seat-8': 8, 'seat-9': 9,
};
export function seatNumber(seatId: SeatId): number {
  return SEAT_NUMBER[seatId];
}
export function isSeatId(value: unknown): value is SeatId {
  return typeof value === 'string' && Object.hasOwn(SEAT_NUMBER, value);
}

// Display order only. It implies no adjacency, route or capacity.
const ZONES: readonly { readonly name: LocationName; readonly id: string }[] = [
  { name: 'Room A', id: 'room-a' },
  { name: 'Room B', id: 'room-b' },
  { name: 'Command Room', id: 'command-room' },
  { name: 'Hospital', id: 'hospital' },
  { name: 'Jail', id: 'jail' },
  { name: 'Final Zone', id: 'final-zone' },
];

/** The last seconds of a countdown get one spoken notice and a text label, never color alone. */
export const FINAL_SECONDS = 10;

export function resolveScreen(env: ShellEnvironment, hasView: boolean): 'connecting' | 'match' | 'blocked' {
  if (env.problem === 'incompatible-protocol' || env.problem === 'integrity') return 'blocked';
  return hasView ? 'match' : 'connecting';
}

/** True only when the shown view is known to be the current authoritative one. */
export function isCurrent(env: ShellEnvironment): boolean {
  return env.connection === 'live' && env.problem === null;
}

function isActiveTurn(view: AudienceView, seatId: SeatId): boolean {
  return view.phase.kind === 'ORDINARY_TURN' && view.activeSeatId === seatId;
}

export function buildSeats(view: AudienceView, selfSeatId: SeatId | null): SeatModel[] {
  return view.seats
    .map((seat): SeatModel => {
      const number = seatNumber(seat.seatId);
      const isSelf = seat.seatId === selfSeatId;
      const isActive = isActiveTurn(view, seat.seatId);
      const markers: MarkerModel[] = [];
      if (isSelf) markers.push({ kind: 'self', variant: 'self', label: en.marker.self });
      if (isActive) markers.push({ kind: 'turn', variant: 'active', label: en.marker.turn });
      markers.push({ kind: 'health', variant: seat.health.toLowerCase(), label: en.marker.health(seat.health) });
      if (seat.jailed) markers.push({ kind: 'jail', variant: 'jailed', label: en.marker.jailed });
      if (seat.captain) markers.push({ kind: 'captain', variant: 'captain', label: en.marker.captain });
      // A faction is public only once the server reveals it, and is shown only then.
      if ('revealedFaction' in seat && seat.revealedFaction !== null) {
        markers.push({ kind: 'faction', variant: seat.revealedFaction.toLowerCase(), label: en.marker.faction(seat.revealedFaction) });
      }
      return {
        seatId: seat.seatId, number, label: isSelf ? en.seat.labelSelf(number) : en.seat.label(number),
        isSelf, isActive, location: seat.location, health: seat.health, jailed: seat.jailed, captain: seat.captain, markers,
      };
    })
    .sort((a, b) => a.number - b.number);
}

export function buildZones(seats: readonly SeatModel[]): ZoneModel[] {
  const zones: ZoneModel[] = [];
  for (const zone of ZONES) {
    const occupants = seats.filter(seat => seat.location === zone.name);
    // The Final Zone exists on screen only while the authorized view places someone in it.
    if (zone.name === 'Final Zone' && occupants.length === 0) continue;
    zones.push({
      id: zone.id, name: zone.name, seats: occupants, emptyText: en.location.empty,
      containsSelf: occupants.some(seat => seat.isSelf),
    });
  }
  return zones;
}

export function displaySeconds(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function buildTimer(deadline: DeadlineEstimate): TimerModel {
  switch (deadline.kind) {
    case 'none':
      return { state: 'none', spoken: en.timer.none };
    case 'unsynced':
      return { state: 'syncing', display: en.timer.syncingDisplay, spoken: en.timer.syncing };
    case 'expired':
      return { state: 'expired', display: en.timer.expiredDisplay, spoken: en.timer.expired, note: en.timer.waiting };
    case 'running': {
      const seconds = displaySeconds(deadline.remainingMs);
      return { state: 'running', display: formatClock(seconds), spoken: en.timer.remaining(seconds), finalSeconds: seconds <= FINAL_SECONDS };
    }
  }
}

export function phaseLabel(view: AudienceView, selfSeatId: SeatId | null): string {
  const { kind } = view.phase;
  if (kind === 'ROUND_RESOLUTION') return en.phase.resolution;
  // Every other kind is named as it is. None is described by what the players should do in it.
  if (kind !== 'ORDINARY_TURN') return en.phase.kind[kind];
  if (view.activeSeatId === null) return en.phase.turnUnassigned;
  return view.activeSeatId === selfSeatId ? en.phase.yourTurn : en.phase.turnOf(seatNumber(view.activeSeatId));
}

function phaseDetail(view: AudienceView): string | null {
  const { kind } = view.phase;
  if (kind === 'ROUND_RESOLUTION') return en.phase.resolutionDetail;
  // This build shows these phases and their clock and cannot take part in them yet. Saying
  // so is better than a screen that looks as if nothing could be done in the game.
  if (kind === 'ORDINARY_TURN' || kind === 'FINISHED' || kind === 'ABORTED') return null;
  return en.phase.notPlayableYet;
}

export function buildPhaseStrip(view: AudienceView, selfSeatId: SeatId | null, deadline: DeadlineEstimate): PhaseStripModel {
  return {
    roundLabel: en.phase.round(view.round),
    phaseLabel: phaseLabel(view, selfSeatId),
    detail: phaseDetail(view),
    timer: buildTimer(deadline),
  };
}

/** One spoken sentence pair describing where the match stands, e.g. "Round 2. Your turn." */
export function phaseSummary(view: AudienceView, selfSeatId: SeatId | null): string {
  return `${en.phase.round(view.round)}. ${phaseLabel(view, selfSeatId)}.`;
}

export function buildBanners(env: ShellEnvironment, hasView: boolean): BannerModel[] {
  const banners: BannerModel[] = [];
  if (env.mode === 'fixture') {
    banners.push({ id: 'ms-banner-source', kind: 'data-source', variant: 'fixture', text: en.banner.fixture, action: null });
  } else if (env.mode === 'emulator') {
    banners.push({ id: 'ms-banner-source', kind: 'data-source', variant: 'emulator', text: en.banner.emulator, action: null });
  }
  const reconnect = { intent: 'session/reconnect', label: en.banner.reconnect } as const;
  if (env.problem === 'unreadable-update') {
    banners.push({
      id: 'ms-banner-connection', kind: 'connection', variant: 'unreadable',
      text: hasView ? en.banner.unreadable : en.banner.unreadableNoView, action: reconnect,
    });
  } else if (env.connection === 'stale' && env.problem === null) {
    banners.push({ id: 'ms-banner-connection', kind: 'connection', variant: 'stale', text: en.banner.stale, action: reconnect });
  }
  return banners;
}

export function buildBlocked(env: ShellEnvironment): BlockedModel | null {
  const action = { intent: 'app/reload', label: en.blocked.reload } as const;
  if (env.problem === 'incompatible-protocol') return { ...en.blocked.incompatible, action };
  if (env.problem === 'integrity') return { ...en.blocked.integrity, action };
  return null;
}

export function buildSettings(motion: MotionSettingsInput): SettingsModel {
  const hint = !motion.followsDevice ? en.settings.chosen : motion.reducedMotion ? en.settings.followsDeviceOn : en.settings.followsDeviceOff;
  return { heading: en.settings.heading, reduceMotion: { label: en.settings.reduceMotion, checked: motion.reducedMotion, hint } };
}

export function buildDetails(view: AudienceView, mode: DataSourceMode): MatchDetailsModel {
  return {
    summary: en.details.summary,
    entries: [
      { term: en.details.match, value: view.matchId },
      { term: en.details.source, value: en.details.sourceName(mode) },
      { term: en.details.protocol, value: String(view.versions.protocolVersion) },
      { term: en.details.ruleset, value: view.versions.rulesetVersion },
      { term: en.details.rulesetHash, value: `${view.versions.rulesetHash.slice(0, 12)}…` },
      { term: en.details.engine, value: view.versions.engineVersion },
      { term: en.details.assets, value: view.versions.assetManifestVersion },
    ],
  };
}
