import { en } from '../copy/en.js';
import { SHELL_IDS } from '../ids.js';
import type { ActionChoiceModel, CardButtonModel, ConnectedActionBody, ConnectedActionCardModel, ConnectedPlayerShellModel, ConnectedPrivateAreaModel } from '../model/types.js';
import { h } from './node.js';
import type { MarkupChild, MarkupElement } from './node.js';
import { hiddenText, renderDetails, renderPhase, renderShell, renderVote, renderZones } from './parts.js';
import { renderButton, renderLocation } from './player-shell.js';

// The connected phone. Outside the private panel it is the same markup as every other
// player screen. Inside, one card for the player's own command, redrawn in nested regions so
// a control becoming active does not disturb the line above it that may hold focus.

function controls(...buttons: readonly (CardButtonModel | null)[]): MarkupElement {
  return h('div', { class: 'ms-card__controls', 'data-region': 'action-controls' }, buttons.map(button => (button ? renderButton(button) : null)));
}

// The line a step is focused on. It is not a control, so arriving there can never send anything.
function stepLine(className: string, text: string): MarkupElement {
  return h('p', { class: className, id: SHELL_IDS.actionStep, tabindex: '-1' }, text);
}

/** The element that names one listed action. Its control is named by it. */
const offerNameId = (kind: string): string => `ms-action-offer-${kind}`;

function renderChoice(choice: ActionChoiceModel): MarkupElement {
  return h('li', null,
    h('button', { type: 'button', class: 'ms-button ms-target', id: choice.id, 'data-intent': 'action/choose', 'data-value': choice.value },
      // The numeral repeats the name, so it is decoration for assistive technology.
      choice.number === null ? null : h('span', { class: 'ms-token', 'aria-hidden': 'true' }, String(choice.number)),
      h('span', { class: 'ms-target__name' }, choice.label),
      choice.detail ? [hiddenText(', '), h('span', { class: 'ms-target__detail' }, choice.detail)] : null,
    ));
}

function renderBody(body: ConnectedActionBody): MarkupChild {
  switch (body.step) {
    case 'idle':
      return [
        h('ul', { class: 'ms-offers', 'aria-labelledby': SHELL_IDS.actionTitle }, body.offers.map(offer => h('li', { class: 'ms-offer', 'data-kind': offer.kind },
          h('span', { class: 'ms-offer__name', id: offerNameId(offer.kind) }, offer.label), hiddenText(': '), h('span', { class: 'ms-offer__status' }, offer.statusLabel),
          // Several actions can be open at once with the same words on their controls. Each
          // control is named by its action first, then by its own words.
          offer.open ? h('button', {
            type: 'button', class: 'ms-button ms-button--primary', id: offer.open.id, 'aria-labelledby': `${offerNameId(offer.kind)} ${offer.open.id}`,
            'data-intent': 'action/open', 'data-kind': offer.kind,
          }, offer.open.label) : null,
        ))),
        body.note ? h('p', { class: 'ms-card__text' }, body.note) : null,
      ];
    case 'choosing':
      return [
        stepLine('ms-card__prompt', body.prompt),
        h('p', { class: 'ms-card__text' }, body.note),
        h('ul', { class: 'ms-targets', 'aria-labelledby': SHELL_IDS.actionStep }, body.choices.map(renderChoice)),
        controls(body.back),
      ];
    case 'confirming':
      return [stepLine('ms-card__prompt', body.prompt), h('p', { class: 'ms-card__text' }, body.consequence), controls(body.confirm, body.back)];
    case 'busy':
      return stepLine('ms-card__text ms-card__busy', body.text);
    case 'result':
      return [stepLine('ms-card__result', body.text), body.detail ? h('p', { class: 'ms-card__text' }, body.detail) : null, controls(body.action)];
  }
}

function renderCard(card: ConnectedActionCardModel): MarkupElement {
  return h('div', { class: 'ms-card', 'data-action': 'connected' },
    // The title stays put while the part below is redrawn, so it can hold focus during a request.
    h('h4', { class: 'ms-card__title', id: SHELL_IDS.actionTitle, tabindex: '-1' }, card.title),
    h('div', {
      class: 'ms-card__state', 'data-region': 'action', 'data-status': card.status, 'data-step': card.body.step, 'data-selected': String(card.selected),
      // If the line or control that held focus is gone after a redraw, focus stays with the card.
      'data-focus-fallback': SHELL_IDS.actionTitle,
    },
      h('p', { class: 'ms-card__status' }, card.statusLabel),
      renderBody(card.body),
    ),
  );
}

function renderPrivateArea(area: ConnectedPrivateAreaModel): MarkupElement {
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
        area.content.hack ? h('p', { class: 'ms-notice', id: 'ms-hack-with' }, area.content.hack) : null,
        area.content.ballot ? h('p', { class: 'ms-notice', id: 'ms-own-ballot' }, area.content.ballot) : null,
        h('div', { class: 'ms-actions', 'data-region': 'actions' },
          h('h3', { class: 'ms-private__subheading', id: 'ms-actions-heading' }, area.content.actions.heading),
          area.content.actions.notice ? h('p', { class: 'ms-notice' }, area.content.actions.notice) : null,
          renderCard(area.content.actions.card),
        ),
      ] : null,
    ),
  );
}

export function renderConnectedPlayerShell(model: ConnectedPlayerShellModel): MarkupElement {
  const match = model.match;
  const content: MarkupChild = match ? [
    h('h1', { class: 'ms-title', id: SHELL_IDS.title }, h('span', { class: 'ms-title__prefix' }, `${en.surface.youAre} `), match.identity.label),
    renderPhase(match.phase),
    renderLocation(match.location),
    renderPrivateArea(match.privateArea),
    renderVote(match.vote),
    h('section', { class: 'ms-panel ms-roster', 'aria-labelledby': 'ms-roster-heading', 'data-region': 'roster' },
      h('h2', { class: 'ms-panel__heading', id: 'ms-roster-heading' }, match.roster.heading),
      renderZones(match.roster.zones, 'ms-roster-zone'),
    ),
  ] : null;
  return renderShell(model, h('p', { class: 'ms-surface' }, en.surface.player), content, match ? renderDetails(match.details) : null);
}
