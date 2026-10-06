import { en } from '../copy/en.js';
import type { ActionsModel, PlayerMatchModel, PlayerShellModel, PrivateAreaModel } from '../model/types.js';
import { h } from './node.js';
import type { MarkupChild, MarkupElement } from './node.js';
import { renderDetails, renderMarkers, renderPhase, renderSeat, renderShell, renderZones, SHELL_IDS } from './parts.js';

function renderLocation(location: PlayerMatchModel['location']): MarkupElement {
  return h('section', { class: 'ms-panel ms-location', 'aria-labelledby': 'ms-location-heading', 'data-region': 'location' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-location-heading' }, location.heading),
    h('p', { class: 'ms-location__name' }, en.location.name(location.name)),
    h('p', { class: 'ms-location__status' },
      h('span', { class: 'ms-location__status-label' }, `${location.statusLabel}: `),
      renderMarkers({ ...location.self, markers: location.self.markers.filter(marker => marker.kind !== 'self') }),
    ),
    h('h3', { class: 'ms-location__others', id: 'ms-location-others' }, location.othersHeading),
    location.others.length > 0
      ? h('ul', { class: 'ms-seats', 'aria-labelledby': 'ms-location-others' }, location.others.map(renderSeat))
      : h('p', { class: 'ms-zone__empty' }, location.aloneText),
  );
}

function renderActions(actions: ActionsModel): MarkupChild {
  return [
    h('h3', { class: 'ms-private__subheading', id: 'ms-actions-heading' }, actions.heading),
    actions.notice ? h('p', { class: 'ms-notice' }, actions.notice) : null,
    h('ul', { class: 'ms-cards', 'aria-labelledby': 'ms-actions-heading' }, actions.cards.map(card =>
      h('li', { class: 'ms-card', 'data-action': card.id, 'data-status': card.status },
        h('h4', { class: 'ms-card__title' }, card.title),
        h('p', { class: 'ms-card__status' }, card.statusLabel),
      ))),
  ];
}

function renderPrivateArea(area: PrivateAreaModel): MarkupElement {
  return h('section', { class: 'ms-panel ms-private', 'aria-labelledby': 'ms-private-heading', 'data-region': 'private', 'data-open': String(area.open) },
    h('h2', { class: 'ms-panel__heading', id: 'ms-private-heading' }, area.heading),
    h('p', { class: 'ms-hint', id: 'ms-private-hint' }, area.hint),
    h('button', {
      type: 'button', class: 'ms-button', id: SHELL_IDS.privateToggle, 'aria-expanded': String(area.open),
      'aria-controls': SHELL_IDS.privatePanel, 'aria-describedby': 'ms-private-hint', 'data-intent': 'private/toggle',
    }, area.toggleLabel),
    // The panel element always exists so aria-controls resolves; its private content does not.
    h('div', { class: 'ms-private__panel', id: SHELL_IDS.privatePanel, hidden: area.content === null },
      area.content ? [
        h('h3', { class: 'ms-private__subheading', id: 'ms-role-heading' }, area.content.role.label),
        h('p', { class: 'ms-role-card' }, area.content.role.name),
        renderActions(area.content.actions),
      ] : null,
    ),
  );
}

export function renderPlayerShell(model: PlayerShellModel): MarkupElement {
  const match = model.match;
  const content: MarkupChild = match ? [
    h('h1', { class: 'ms-title', id: SHELL_IDS.title }, h('span', { class: 'ms-title__prefix' }, `${en.surface.youAre} `), match.identity.label),
    renderPhase(match.phase),
    renderLocation(match.location),
    renderPrivateArea(match.privateArea),
    h('section', { class: 'ms-panel ms-roster', 'aria-labelledby': 'ms-roster-heading', 'data-region': 'roster' },
      h('h2', { class: 'ms-panel__heading', id: 'ms-roster-heading' }, match.roster.heading),
      renderZones(match.roster.zones, 'ms-roster-zone'),
    ),
  ] : null;
  return renderShell(
    model,
    h('p', { class: 'ms-surface' }, en.surface.player),
    content,
    match ? renderDetails(match.details) : null,
  );
}
