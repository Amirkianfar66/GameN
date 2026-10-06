import { en } from '../copy/en.js';
import { buildBanners, buildBlocked, buildDetails, buildPhaseStrip, buildSeats, buildSettings, buildZones, resolveScreen } from './common.js';
import type { TableMatchModel, TableShellInput, TableShellModel } from './types.js';

function buildMatch(input: TableShellInput, view: NonNullable<TableShellInput['view']>): TableMatchModel {
  // The table has no seat of its own, so nothing here can be phrased from a player's side.
  const seats = buildSeats(view, null);
  return {
    phase: buildPhaseStrip(view, null, input.deadline),
    board: { heading: en.roster.boardHeading, zones: buildZones(seats) },
    roster: {
      heading: en.roster.tableHeading,
      caption: en.roster.caption,
      columns: en.roster.column,
      rows: seats.map(seat => ({
        seat,
        jail: seat.jailed ? en.roster.yes : en.roster.no,
        captain: seat.captain ? en.roster.yes : en.roster.no,
        turn: seat.isActive ? en.roster.yes : en.roster.no,
      })),
    },
    details: buildDetails(view, input.mode),
  };
}

export function buildTableShellModel(input: TableShellInput): TableShellModel {
  const screen = resolveScreen(input, input.view !== null);
  return {
    surface: 'table',
    title: en.title.table,
    screen,
    mode: input.mode,
    connection: input.connection,
    motion: input.motion.reducedMotion ? 'reduced' : 'full',
    banners: buildBanners(input, input.view !== null),
    blocked: buildBlocked(input),
    connectingText: en.connecting.text,
    settings: buildSettings(input.motion),
    match: screen === 'match' && input.view !== null ? buildMatch(input, input.view) : null,
  };
}
