import { en } from '../copy/en.js';
import type { TableMatchModel, TableShellModel } from '../model/types.js';
import { h } from './node.js';
import type { MarkupChild, MarkupElement } from './node.js';
import { renderDetails, renderPhase, renderShell, renderZones, SHELL_IDS } from './parts.js';

function renderRoster(roster: TableMatchModel['roster']): MarkupElement {
  const column = (label: string): MarkupElement => h('th', { scope: 'col' }, label);
  // Focusable so that a keyboard can scroll the table sideways when a narrow display clips it.
  return h('section', { class: 'ms-panel ms-roster', id: 'ms-roster', 'aria-labelledby': 'ms-roster-heading', 'data-region': 'roster', tabindex: '0' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-roster-heading' }, roster.heading),
    h('table', { class: 'ms-table' },
      h('caption', { class: 'ms-visually-hidden' }, roster.caption),
      h('thead', null, h('tr', null,
        column(roster.columns.player), column(roster.columns.location), column(roster.columns.health), column(roster.columns.status),
      )),
      h('tbody', null, roster.rows.map(row =>
        h('tr', { 'data-seat': row.seat.seatId, 'data-active': String(row.seat.isActive) },
          h('th', { scope: 'row' }, row.seat.label),
          h('td', null, en.location.name(row.seat.location)),
          h('td', null, en.marker.health(row.seat.health)),
          h('td', null, row.status),
        ))),
    ),
  );
}

export function renderTableShell(model: TableShellModel): MarkupElement {
  const match = model.match;
  const content: MarkupChild = match ? [
    h('h1', { class: 'ms-title', id: SHELL_IDS.title }, en.surface.table),
    renderPhase(match.phase),
    h('section', { class: 'ms-panel ms-board', 'aria-labelledby': 'ms-board-heading', 'data-region': 'board' },
      h('h2', { class: 'ms-panel__heading', id: 'ms-board-heading' }, match.board.heading),
      renderZones(match.board.zones, 'ms-board-zone'),
    ),
    renderRoster(match.roster),
  ] : null;
  return renderShell(
    model,
    null,
    content,
    match ? renderDetails(match.details) : null,
  );
}
