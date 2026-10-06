import { en } from '../copy/en.js';
import type { ActionsModel, PlayerMatchModel, PlayerShellModel, RoleDrawerModel } from '../model/types.js';
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

function renderActions(actions: ActionsModel): MarkupElement {
  const body: MarkupChild = actions.concealedText !== null
    ? h('p', { class: 'ms-concealed' }, actions.concealedText)
    : [
      actions.notice ? h('p', { class: 'ms-notice' }, actions.notice) : null,
      h('ul', { class: 'ms-cards' }, actions.cards.map(card =>
        h('li', { class: 'ms-card', 'data-action': card.id, 'data-status': card.status },
          h('h3', { class: 'ms-card__title' }, card.title),
          h('p', { class: 'ms-card__status' }, card.statusLabel),
        ))),
    ];
  return h('section', { class: 'ms-panel ms-actions', 'aria-labelledby': 'ms-actions-heading', 'data-region': 'actions' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-actions-heading' }, actions.heading),
    body,
  );
}

function renderRoleDrawer(drawer: RoleDrawerModel): MarkupElement {
  return h('section', { class: 'ms-panel ms-role', 'aria-labelledby': 'ms-role-heading', 'data-region': 'role', 'data-open': String(drawer.open) },
    h('h2', { class: 'ms-panel__heading', id: 'ms-role-heading' }, drawer.heading),
    h('p', { class: 'ms-hint', id: 'ms-role-hint' }, drawer.hint),
    h('button', {
      type: 'button', class: 'ms-button', id: SHELL_IDS.roleToggle, 'aria-expanded': String(drawer.open),
      'aria-controls': SHELL_IDS.rolePanel, 'aria-describedby': 'ms-role-hint', 'data-intent': 'role-drawer/toggle',
    }, drawer.toggleLabel),
    // The panel element always exists so aria-controls resolves; its secret content does not.
    h('div', { class: 'ms-role__panel', id: SHELL_IDS.rolePanel, hidden: drawer.role === null },
      drawer.role ? h('dl', { class: 'ms-role__facts' }, h('dt', null, drawer.role.label), h('dd', null, drawer.role.name)) : null,
    ),
  );
}

export function renderPlayerShell(model: PlayerShellModel): MarkupElement {
  const match = model.match;
  const content: MarkupChild = match ? [
    h('h1', { class: 'ms-title', id: SHELL_IDS.title }, h('span', { class: 'ms-title__prefix' }, `${en.surface.youAre} `), match.identity.label),
    renderPhase(match.phase),
    renderLocation(match.location),
    renderActions(match.actions),
    renderRoleDrawer(match.roleDrawer),
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
