import { en } from '../copy/en.js';
import { SHELL_IDS, shotTargetId } from '../ids.js';
import type {
  ActionCardModel, ActionsModel, CardButtonModel, PlayerMatchModel, PlayerShellModel, PrivateAreaModel, ShotCardBody, ShotTargetModel,
} from '../model/types.js';
import { h } from './node.js';
import type { MarkupChild, MarkupElement } from './node.js';
import { hiddenText, renderDetails, renderMarkers, renderPhase, renderSeat, renderShell, renderZones } from './parts.js';

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

function renderButton(button: CardButtonModel): MarkupElement {
  return h('button', { type: 'button', class: button.primary ? 'ms-button ms-button--primary' : 'ms-button', id: button.id, 'data-intent': button.intent }, button.label);
}

// The line a step is focused on. It is not a control, so arriving there can never send anything.
function stepLine(className: string, text: string): MarkupElement {
  return h('p', { class: className, id: SHELL_IDS.shotStep, tabindex: '-1' }, text);
}

function renderTarget(target: ShotTargetModel): MarkupElement {
  return h('li', null,
    h('button', { type: 'button', class: 'ms-button ms-target', id: shotTargetId(target.seatId), 'data-intent': 'shot/choose-target', 'data-target-seat': target.seatId },
      // The numeral repeats the name, so it is decoration for assistive technology.
      h('span', { class: 'ms-token', 'aria-hidden': 'true' }, String(target.number)),
      h('span', { class: 'ms-target__name' }, target.label),
      hiddenText(', '),
      h('span', { class: 'ms-target__detail' }, target.detail),
    ));
}

function renderShotBody(body: ShotCardBody): MarkupChild {
  switch (body.step) {
    case 'idle': {
      const lines = [body.note, body.reason].filter((line): line is string => line !== null);
      return [
        lines.map((line, index) => (index === 0 ? stepLine('ms-card__text', line) : h('p', { class: 'ms-card__text' }, line))),
        body.open ? h('div', { class: 'ms-card__controls' }, renderButton(body.open)) : null,
      ];
    }
    case 'targeting':
      return [
        stepLine('ms-card__prompt', body.prompt),
        h('p', { class: 'ms-card__text' }, body.note),
        body.targets.length > 0
          ? h('ul', { class: 'ms-targets', 'aria-labelledby': SHELL_IDS.shotStep }, body.targets.map(renderTarget))
          : h('p', { class: 'ms-card__text' }, body.emptyText),
        h('div', { class: 'ms-card__controls' }, renderButton(body.back)),
      ];
    case 'confirming':
      return [
        stepLine('ms-card__prompt', body.prompt),
        h('p', { class: 'ms-card__text' }, body.consequence),
        h('div', { class: 'ms-card__controls' }, renderButton(body.confirm), renderButton(body.back)),
      ];
    case 'busy':
      return stepLine('ms-card__text ms-card__busy', body.text);
    case 'result':
      return [
        stepLine('ms-card__result', body.text),
        body.detail ? h('p', { class: 'ms-card__text' }, body.detail) : null,
        h('div', { class: 'ms-card__controls' }, renderButton(body.action)),
      ];
  }
}

function renderShotCard(card: ActionCardModel): MarkupElement {
  return h('li', { class: 'ms-card', 'data-action': card.id },
    // The title stays put while the part below is redrawn, so it can hold focus during a request.
    h('h4', { class: 'ms-card__title', id: SHELL_IDS.shotTitle, tabindex: '-1' }, card.title),
    h('div', {
      class: 'ms-card__state', 'data-region': 'shot', 'data-status': card.status, 'data-step': card.body.step, 'data-selected': String(card.selected),
      // If the line or control that held focus is gone after a redraw, focus stays with the card.
      'data-focus-fallback': SHELL_IDS.shotTitle,
    },
      h('p', { class: 'ms-card__status' }, card.statusLabel),
      renderShotBody(card.body),
    ),
  );
}

// Its own region inside the private panel: a notice or a step change redraws this part
// only, and the panel around it is not rebuilt.
function renderActions(actions: ActionsModel): MarkupElement {
  return h('div', { class: 'ms-actions', 'data-region': 'actions' },
    h('h3', { class: 'ms-private__subheading', id: 'ms-actions-heading' }, actions.heading),
    actions.notice ? h('p', { class: 'ms-notice' }, actions.notice) : null,
    h('ul', { class: 'ms-cards', 'aria-labelledby': 'ms-actions-heading' }, actions.cards.map(renderShotCard)),
  );
}

function renderPrivateArea(area: PrivateAreaModel): MarkupElement {
  return h('section', {
    class: 'ms-panel ms-private', 'aria-labelledby': 'ms-private-heading', 'data-region': 'private', 'data-open': String(area.open),
    // When the panel closes under the player, focus goes back to the control that opens it.
    'data-focus-fallback': SHELL_IDS.privateToggle,
  },
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
