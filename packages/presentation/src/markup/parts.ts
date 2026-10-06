import { en } from '../copy/en.js';
import type {
  BannerModel, BlockedModel, MatchDetailsModel, PhaseStripModel, PlayerShellModel, SeatModel, SettingsModel, TableShellModel,
  TimerModel, ZoneModel,
} from '../model/types.js';
import { h } from './node.js';
import type { MarkupChild, MarkupElement } from './node.js';

// Element ids that a host may need to address. They never vary with a role.
export const SHELL_IDS = {
  main: 'ms-main',
  title: 'ms-title',
  blockedHeading: 'ms-blocked-heading',
  roleToggle: 'ms-role-toggle',
  rolePanel: 'ms-role-panel',
  reduceMotion: 'ms-reduce-motion',
} as const;

const hiddenText = (text: string): MarkupElement => h('span', { class: 'ms-visually-hidden' }, text);

export function renderMarkers(seat: SeatModel): MarkupElement {
  const children: MarkupChild[] = [];
  seat.markers.forEach((marker, index) => {
    if (index > 0) children.push(hiddenText(', '));
    children.push(h('span', { class: `ms-marker ms-marker--${marker.kind}`, 'data-variant': marker.variant }, marker.label));
  });
  return h('span', { class: 'ms-markers' }, children);
}

export function renderSeat(seat: SeatModel): MarkupElement {
  return h('li', { class: 'ms-seat', 'data-seat': seat.seatId, 'data-self': String(seat.isSelf), 'data-active': String(seat.isActive) },
    // The numeral repeats the visible name, so it is decoration for assistive technology.
    h('span', { class: 'ms-token', 'aria-hidden': 'true' }, String(seat.number)),
    h('span', { class: 'ms-seat__name' }, seat.label),
    hiddenText(': '),
    renderMarkers(seat),
  );
}

export function renderZones(zones: readonly ZoneModel[], idPrefix: string): MarkupElement {
  return h('ul', { class: 'ms-zones' }, zones.map(zone => {
    const headingId = `${idPrefix}-${zone.id}`;
    return h('li', { class: 'ms-zone', 'data-zone': zone.id, 'data-current': String(zone.containsSelf) },
      h('h3', { class: 'ms-zone__name', id: headingId }, en.location.name(zone.name)),
      zone.seats.length > 0
        ? h('ul', { class: 'ms-seats', 'aria-labelledby': headingId }, zone.seats.map(renderSeat))
        : h('p', { class: 'ms-zone__empty' }, zone.emptyText),
    );
  }));
}

function renderTimer(timer: TimerModel): MarkupElement {
  if (timer.state === 'none') {
    return h('div', { class: 'ms-timer', 'data-region': 'timer', 'data-state': 'none' }, h('p', { class: 'ms-timer__note' }, timer.spoken));
  }
  return h('div', { class: 'ms-timer', 'data-region': 'timer', 'data-state': timer.state, 'data-final': timer.state === 'running' && timer.finalSeconds ? 'true' : null },
    // role=timer is not a live region: a ticking value must not be read out every second.
    h('p', { class: 'ms-timer__value', role: 'timer', 'aria-live': 'off', 'aria-label': en.timer.label },
      h('span', { class: 'ms-timer__digits', 'aria-hidden': 'true' }, timer.display),
      hiddenText(timer.spoken),
    ),
    timer.state === 'expired' ? h('p', { class: 'ms-timer__note' }, timer.note) : null,
    timer.state === 'syncing' ? h('p', { class: 'ms-timer__note' }, timer.spoken) : null,
  );
}

export function renderPhase(phase: PhaseStripModel): MarkupElement {
  return h('section', { class: 'ms-phase', 'aria-labelledby': 'ms-phase-heading' },
    h('div', { class: 'ms-phase__labels', 'data-region': 'phase' },
      h('h2', { class: 'ms-phase__round', id: 'ms-phase-heading' }, phase.roundLabel),
      h('p', { class: 'ms-phase__label' }, phase.phaseLabel),
      phase.detail ? h('p', { class: 'ms-phase__detail' }, phase.detail) : null,
    ),
    renderTimer(phase.timer),
  );
}

function renderBanner(banner: BannerModel): MarkupElement {
  return h('div', { class: `ms-banner ms-banner--${banner.kind}`, 'data-variant': banner.variant, id: banner.id, role: 'note' },
    h('p', { class: 'ms-banner__text' }, banner.text),
    banner.action
      ? h('button', { type: 'button', class: 'ms-button', id: `${banner.id}-action`, 'data-intent': banner.action.intent }, banner.action.label)
      : null,
  );
}

export function renderBanners(banners: readonly BannerModel[]): MarkupElement {
  return h('div', { class: 'ms-banners', 'data-region': 'banners' }, banners.map(renderBanner));
}

export function renderSettings(settings: SettingsModel): MarkupElement {
  const hintId = `${SHELL_IDS.reduceMotion}-hint`;
  return h('section', { class: 'ms-settings', 'aria-labelledby': 'ms-settings-heading', 'data-region': 'settings' },
    h('h2', { class: 'ms-settings__heading', id: 'ms-settings-heading' }, settings.heading),
    h('div', { class: 'ms-field' },
      h('input', {
        type: 'checkbox', class: 'ms-checkbox', id: SHELL_IDS.reduceMotion, checked: settings.reduceMotion.checked,
        'aria-describedby': hintId, 'data-intent': 'settings/reduce-motion',
      }),
      h('label', { class: 'ms-field__label', for: SHELL_IDS.reduceMotion }, settings.reduceMotion.label),
      h('p', { class: 'ms-hint', id: hintId }, settings.reduceMotion.hint),
    ),
  );
}

export function renderDetails(details: MatchDetailsModel): MarkupElement {
  return h('details', { class: 'ms-details', 'data-region': 'details' },
    h('summary', { class: 'ms-details__summary' }, details.summary),
    h('dl', { class: 'ms-details__list' }, details.entries.map(entry => [
      h('dt', null, entry.term),
      h('dd', null, entry.value),
    ])),
  );
}

function renderBlocked(blocked: BlockedModel): MarkupElement {
  return h('section', { class: 'ms-panel ms-blocked', 'aria-labelledby': SHELL_IDS.blockedHeading, 'data-region': 'status' },
    // Focusable so a host can move focus here when the match is replaced by this screen.
    h('h1', { class: 'ms-blocked__heading', id: SHELL_IDS.blockedHeading, tabindex: '-1' }, blocked.heading),
    blocked.paragraphs.map(paragraph => h('p', null, paragraph)),
    h('button', { type: 'button', class: 'ms-button ms-button--primary', id: 'ms-blocked-action', 'data-intent': blocked.action.intent }, blocked.action.label),
  );
}

function renderConnecting(text: string): MarkupElement {
  return h('section', { class: 'ms-panel ms-connecting', 'aria-labelledby': 'ms-connecting-heading', 'data-region': 'status' },
    h('h1', { class: 'ms-connecting__heading', id: 'ms-connecting-heading' }, en.connecting.heading),
    h('p', null, text),
  );
}

/** Frame shared by both surfaces: skip link, banner, data-source and connection notes, main, footer. */
export function renderShell(
  model: PlayerShellModel | TableShellModel,
  header: MarkupChild,
  matchContent: MarkupChild,
  footer: MarkupChild,
): MarkupElement {
  const main = model.screen === 'blocked' && model.blocked ? renderBlocked(model.blocked)
    : model.screen === 'match' ? matchContent
    : renderConnecting(model.connectingText);
  return h('div', {
    class: `ms-shell ms-shell--${model.surface}`, 'data-surface': model.surface, 'data-screen': model.screen,
    'data-connection': model.connection, 'data-mode': model.mode, 'data-motion': model.motion,
  },
    h('a', { class: 'ms-skip', href: `#${SHELL_IDS.main}` }, en.skipToContent),
    h('header', { class: 'ms-header' },
      h('p', { class: 'ms-wordmark' }, en.appName),
      header,
    ),
    renderBanners(model.banners),
    h('main', { class: 'ms-main', id: SHELL_IDS.main, tabindex: '-1' }, main),
    h('footer', { class: 'ms-footer' }, renderSettings(model.settings), footer),
  );
}
