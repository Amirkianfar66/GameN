// mothership:dev-only
//
// Builds the player and table shells for the Designer's review pages.
//
// The markup follows what Frontend produces (packages/presentation/src/markup at fccadf7,
// agent/frontend-motion-gallery), rebuilt here by hand from a reading of it: same elements,
// classes, ids and data attributes, so the reference stylesheet is judged against the real
// hooks. It is a copy, not Frontend's code, and it can drift: check it against their branch
// before relying on a detail. Additions the design proposes are made only when `proposals`
// is on, and each carries data-design-proposal.
//
// EVERYTHING DRAWN IS SYNTHETIC. The states below are authored for looking at layout. They
// follow no rule and are the outcome of nothing. No engine, transport or contract fixture
// is involved, and none of this is shipped.
//
// This module never touches the synthetic studies. Only studies.html does.

import { en } from './copy.js';

export function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const hidden = text => h('span', { class: 'ms-visually-hidden' }, text);
const seatId = n => `seat-${n}`;
// The Final Zone is listed only while a view places someone in it, as in Frontend's model.
const ZONES = [['Room A', 'room-a'], ['Room B', 'room-b'], ['Command Room', 'command-room'], ['Hospital', 'hospital'], ['Jail', 'jail'], ['Final Zone', 'final-zone']];
const zoneIdOf = name => ZONES.find(([zone]) => zone === name)[1];

const seat = (n, location, health = 'Healthy', extra = {}) => ({ n, location, health, jailed: false, captain: false, ...extra });

/** A phone's first view of a round: the seating Frontend's own fixture harness uses. */
export const STATE_OPENING = {
  label: 'Synthetic layout state A',
  round: 2,
  activeSeat: 1,
  seats: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => seat(n, n === 5 ? 'Command Room' : n >= 7 ? 'Room B' : 'Room A', 'Healthy', { captain: n === 5 })),
};

/** A busier table: six standees in Room A, and every public marker somewhere. */
export const STATE_BUSY = {
  label: 'Synthetic layout state B',
  round: 3,
  activeSeat: 4,
  seats: [
    seat(1, 'Room A'), seat(2, 'Room A'), seat(3, 'Room A'), seat(4, 'Room A'), seat(5, 'Room A', 'Healthy', { captain: true }), seat(6, 'Room A'),
    seat(7, 'Room B'), seat(8, 'Hospital', 'Injured'), seat(9, 'Jail', 'Healthy', { jailed: true }),
  ],
};

/** Every public health state standing in Room A, with the active Captain among them. */
export const STATE_VARIED = {
  label: 'Synthetic layout state C',
  round: 5,
  activeSeat: 4,
  seats: [
    seat(1, 'Room A'), seat(2, 'Room A', 'Injured'), seat(3, 'Room A', 'Eliminated'), seat(4, 'Room A', 'Injured', { captain: true }),
    seat(5, 'Command Room'), seat(6, 'Command Room', 'Eliminated'), seat(7, 'Hospital', 'Injured'),
    seat(8, 'Jail', 'Injured', { jailed: true }), seat(9, 'Jail', 'Healthy', { jailed: true }),
  ],
};

/**
 * The widest words everywhere at once, for measuring only. No rule produces this and it is
 * never drawn into a review image: it exists so that a layout that holds here holds for
 * anything a view can say.
 */
export const STATE_STRESS = {
  label: 'Synthetic stress state: every marker on every seat. Measured, never shown.',
  round: 99,
  activeSeat: 9,
  seats: [1, 2, 3, 4, 5, 6, 7, 8].map(n => seat(n, 'Room A', n % 2 ? 'Eliminated' : 'Injured', { jailed: true, captain: true }))
    .concat([seat(9, 'Command Room', 'Eliminated', { jailed: true, captain: true })]),
};

export const STATES = { A: STATE_OPENING, B: STATE_BUSY, C: STATE_VARIED, D: STATE_STRESS };

// Variants as Frontend names them: self, active, the health word in lower case, jailed, captain.
function markersOf(seatModel, state, viewer) {
  const markers = [];
  if (viewer === seatModel.n) markers.push({ kind: 'self', variant: 'self', label: en.marker.self });
  if (state.activeSeat === seatModel.n) markers.push({ kind: 'turn', variant: 'active', label: en.marker.turn });
  markers.push({ kind: 'health', variant: seatModel.health.toLowerCase(), label: seatModel.health });
  if (seatModel.jailed) markers.push({ kind: 'jail', variant: 'jailed', label: en.marker.jailed });
  if (seatModel.captain) markers.push({ kind: 'captain', variant: 'captain', label: en.marker.captain });
  return markers;
}

export function markersEl(seatModel, state, viewer, { withoutSelf = false } = {}) {
  const markers = markersOf(seatModel, state, viewer).filter(marker => !(withoutSelf && marker.kind === 'self'));
  const children = [];
  markers.forEach((marker, index) => {
    if (index > 0) children.push(hidden(', '));
    children.push(h('span', {
      class: `ms-marker ms-marker--${marker.kind}`, 'data-variant': marker.variant,
      'data-cue-at': marker.kind === 'health' ? `${seatId(seatModel.n)}/health` : null,
    }, marker.label));
  });
  return h('span', { class: 'ms-markers' }, children);
}

export function seatEl(seatModel, state, viewer) {
  return h('li', {
    class: 'ms-seat', 'data-seat': seatId(seatModel.n), 'data-self': String(viewer === seatModel.n), 'data-active': String(state.activeSeat === seatModel.n),
    'data-cue-at': `${seatId(seatModel.n)}/place`,
  },
    h('span', { class: 'ms-token', 'aria-hidden': 'true' }, seatModel.n),
    h('span', { class: 'ms-seat__name' }, viewer === seatModel.n ? en.seat.labelSelf(seatModel.n) : en.seat.label(seatModel.n)),
    hidden(': '),
    markersEl(seatModel, state, viewer),
  );
}

export function zonesEl(state, viewer, idPrefix) {
  const own = state.seats.find(candidate => candidate.n === viewer);
  return h('ul', { class: 'ms-zones' }, ZONES.map(([name, id]) => {
    const seats = state.seats.filter(candidate => candidate.location === name);
    if (name === 'Final Zone' && seats.length === 0) return null;
    return h('li', { class: 'ms-zone', 'data-zone': id, 'data-current': String(own?.location === name) },
      h('h3', { class: 'ms-zone__name', id: `${idPrefix}-${id}` }, name),
      seats.length > 0
        ? h('ul', { class: 'ms-seats', 'aria-labelledby': `${idPrefix}-${id}` }, seats.map(candidate => seatEl(candidate, state, viewer)))
        : h('p', { class: 'ms-zone__empty' }, en.location.empty),
    );
  }));
}

/**
 * The phase caption and countdown. `timerState` is running, syncing, expired or none, as
 * Frontend's timer model names them; `seconds` is what a running timer shows.
 */
export function phaseEl(state, viewer, { seconds = 42, timerState = 'running' } = {}) {
  const resolving = state.phaseKind === 'ROUND_RESOLUTION';
  const label = resolving ? en.phase.resolution
    : state.activeSeat === null ? en.phase.turnUnassigned
    : viewer === state.activeSeat ? en.phase.yourTurn : en.phase.turnOf(state.activeSeat);
  const clock = `${Math.floor(seconds / 60)}:${seconds % 60 < 10 ? '0' : ''}${seconds % 60}`;
  const timer = timerState === 'none'
    ? h('div', { class: 'ms-timer', 'data-region': 'timer', 'data-state': 'none' }, h('p', { class: 'ms-timer__note' }, en.timer.none))
    : h('div', { class: 'ms-timer', 'data-region': 'timer', 'data-state': timerState, 'data-final': timerState === 'running' && seconds <= 10 ? 'true' : null },
      h('p', { class: 'ms-timer__value', role: 'timer', 'aria-live': 'off', 'aria-label': en.timer.label },
        h('span', { class: 'ms-timer__digits', 'aria-hidden': 'true' }, timerState === 'syncing' ? en.timer.syncingDisplay : timerState === 'expired' ? en.timer.expiredDisplay : clock),
        hidden(timerState === 'syncing' ? en.timer.syncing : timerState === 'expired' ? en.timer.expired : en.timer.remaining(seconds)),
      ),
      timerState === 'expired' ? h('p', { class: 'ms-timer__note' }, en.timer.waiting) : null,
      timerState === 'syncing' ? h('p', { class: 'ms-timer__note' }, en.timer.syncing) : null,
    );
  return h('section', { class: 'ms-phase', 'aria-labelledby': 'ms-phase-heading' },
    h('div', { class: 'ms-phase__labels', 'data-region': 'phase', 'data-cue-at': 'phase' },
      h('h2', { class: 'ms-phase__round', id: 'ms-phase-heading' }, en.phase.round(state.round)),
      h('p', { class: 'ms-phase__label' }, label),
      resolving ? h('p', { class: 'ms-phase__detail' }, en.phase.resolutionDetail) : null,
    ),
    timer,
  );
}

function bannersEl({ connection, fixture = true }) {
  const banners = [];
  if (fixture) {
    banners.push(h('div', { class: 'ms-banner ms-banner--data-source', 'data-variant': 'fixture', id: 'ms-banner-source', role: 'note' },
      h('p', { class: 'ms-banner__text' }, en.banner.fixture)));
  }
  if (connection === 'stale') {
    banners.push(h('div', { class: 'ms-banner ms-banner--connection', 'data-variant': 'stale', id: 'ms-banner-connection', role: 'note' },
      h('p', { class: 'ms-banner__text' }, en.banner.stale),
      h('button', { type: 'button', class: 'ms-button', id: 'ms-banner-connection-action', 'data-intent': 'session/reconnect' }, en.banner.reconnect)));
  }
  return h('div', { class: 'ms-banners', 'data-region': 'banners' }, banners);
}

function settingsEl() {
  return h('section', { class: 'ms-settings', 'aria-labelledby': 'ms-settings-heading', 'data-region': 'settings' },
    h('h2', { class: 'ms-settings__heading', id: 'ms-settings-heading' }, en.settings.heading),
    h('div', { class: 'ms-field' },
      h('label', { class: 'ms-field__label', for: 'ms-reduce-motion' },
        h('input', { type: 'checkbox', class: 'ms-checkbox', id: 'ms-reduce-motion', 'aria-describedby': 'ms-reduce-motion-hint', 'data-intent': 'settings/reduce-motion' }),
        h('span', { class: 'ms-field__text' }, en.settings.reduceMotion),
      ),
      h('p', { class: 'ms-hint', id: 'ms-reduce-motion-hint' }, en.settings.followsDeviceOff),
    ),
  );
}

function detailsEl() {
  const entries = [[en.details.match, 'synthetic-layout'], [en.details.source, en.details.sourceFixture], [en.details.protocol, '1']];
  return h('details', { class: 'ms-details', 'data-region': 'details' },
    h('summary', { class: 'ms-details__summary', id: 'ms-details-summary' }, en.details.summary),
    h('dl', { class: 'ms-details__list' }, entries.map(([term, value]) => [h('dt', null, term), h('dd', null, value)])),
  );
}

function shellEl({ surface, connection = 'live', motion = 'full' }, header, content) {
  return h('div', {
    class: `ms-shell ms-shell--${surface}`, 'data-surface': surface, 'data-screen': 'match', 'data-connection': connection,
    'data-mode': 'fixture', 'data-motion': motion,
  },
    h('a', { class: 'ms-skip', href: '#ms-main' }, en.skipToContent),
    h('header', { class: 'ms-header' }, h('p', { class: 'ms-wordmark' }, en.appName), header),
    bannersEl({ connection }),
    h('main', { class: 'ms-main', id: 'ms-main', tabindex: '-1' }, content),
    h('footer', { class: 'ms-footer' }, settingsEl(), detailsEl()),
  );
}

const button = (id, label, intent, { primary = false, disabled = false } = {}) => h('button', {
  type: 'button', class: primary ? 'ms-button ms-button--primary' : 'ms-button', id, 'data-intent': intent, 'aria-disabled': disabled ? 'true' : null,
}, label);
const controls = (...buttons) => h('div', { class: 'ms-card__controls', 'data-region': 'shot-controls' }, buttons);
const stepLine = (className, text) => h('p', { class: className, id: 'ms-shot-step', tabindex: '-1' }, text);

/**
 * Every picture of the Shot card that Frontend's model can produce: its ten statuses, and
 * the three things the idle step can say while the status is the same.
 *
 *   status    the data-status Frontend sets
 *   step      the data-step Frontend sets
 *   needs     the public state this picture can only occur in, or null for any
 *   pip       PROPOSED resource pip, drawn from the seat's own view and nothing else:
 *             registered while the view lists the seat's own pending command, available
 *             while self.shotAvailable is true, and none while a command of this card is
 *             unaccounted for or the view says neither.
 */
export const SHOT_SPECIMENS = {
  available: { status: 'available', step: 'idle', needs: 'own-turn', pip: 'available' },
  'available-waiting': { status: 'available', step: 'idle', needs: 'other-turn', pip: 'available' },
  'available-paused': { status: 'available', step: 'idle', needs: 'stale', pip: 'available' },
  targeting: { status: 'targeting', step: 'targeting', needs: 'own-turn', pip: 'available' },
  confirming: { status: 'confirming', step: 'confirming', needs: 'own-turn', pip: 'available' },
  submitting: { status: 'submitting', step: 'busy', needs: null, pip: null },
  checking: { status: 'checking', step: 'busy', needs: null, pip: null },
  unknown: { status: 'unknown', step: 'result', needs: null, pip: null },
  registered: { status: 'registered', step: 'result', needs: null, pip: 'registered' },
  'registered-idle': { status: 'registered', step: 'idle', needs: null, pip: 'registered' },
  'was-registered': { status: 'was-registered', step: 'result', needs: null, pip: null },
  unavailable: { status: 'unavailable', step: 'idle', needs: null, pip: null },
  'not-registered': { status: 'not-registered', step: 'result', needs: null, pip: 'available' },
};

/** Which design state each picture is, and the fact it is drawn from, for the state sheet. */
export const SHOT_SPECIMEN_NOTES = {
  available: ['Idle', 'self.shotAvailable is true, the view is current and it is this seat’s own turn.'],
  'available-waiting': ['Idle · not this seat’s turn', 'self.shotAvailable is true and activeSeatId is another seat. The status is still Available: only the control is missing.'],
  'available-paused': ['Reconnect', 'self.shotAvailable is true and the view is stale. No control; the notice above the cards says why.'],
  targeting: ['Selection · Targeting', 'Local only. The player picked the card up; nothing has been sent.'],
  confirming: ['Targeting · Confirmation', 'Local only. A target is chosen; nothing has been sent.'],
  submitting: ['Pending', 'The command is on its way. No second command can start.'],
  checking: ['Pending', 'No usable answer yet; the client is asking for the receipt.'],
  unknown: ['Pending · Unknown', 'Checking gave up. Nothing is assumed either way.'],
  registered: ['Registered · the report', 'An accepted receipt on this device. Not a result. Stays until the player presses Done.'],
  'registered-idle': ['Registered', 'The seat’s view lists its own pending command, or this device registered it. The target is named only where this device knows it.'],
  'was-registered': ['Was registered · the nearest to Spent', 'This device’s own registration has left the pending list. Nothing says the shot was used: protocol 1 has no field for spent (DSN-D02). It lasts until Done.'],
  unavailable: ['Unavailable', 'self.shotAvailable is false. The view gives no reason, so none is shown.'],
  'not-registered': ['Unavailable · Rejected', 'A rejection receipt or a safe error. The words come from its code.'],
};

const STEP_SELECTED = new Set(['targeting', 'confirming', 'submitting', 'checking', 'unknown']);

function shotBody(id, target, state, viewer) {
  const own = state.seats.find(candidate => candidate.n === viewer);
  const candidates = state.seats.filter(candidate => candidate.n !== viewer && candidate.location === own.location);
  switch (id) {
    case 'available':
      return [controls(button('ms-shot-open', en.shot.open, 'shot/open', { primary: true }))];
    case 'available-waiting':
      return [stepLine('ms-card__text', en.shot.reasonNotYourTurn)];
    case 'available-paused':
    case 'unavailable':
      return [];
    case 'registered-idle':
      return [stepLine('ms-card__text', target === null ? en.shot.registeredEarlier : en.shot.registeredAt(target))];
    case 'targeting':
      return [
        stepLine('ms-card__prompt', en.shot.targetPrompt),
        h('p', { class: 'ms-card__text' }, en.shot.targetNote),
        candidates.length > 0
          ? h('ul', { class: 'ms-targets', 'aria-labelledby': 'ms-shot-step' }, candidates.map(candidate => h('li', null,
            h('button', { type: 'button', class: 'ms-button ms-target', id: `ms-shot-target-seat-${candidate.n}`, 'data-intent': 'shot/choose-target', 'data-target-seat': seatId(candidate.n) },
              h('span', { class: 'ms-token', 'aria-hidden': 'true' }, candidate.n),
              h('span', { class: 'ms-target__name' }, en.seat.label(candidate.n)),
              hidden(', '),
              h('span', { class: 'ms-target__detail' }, markersOf(candidate, state, viewer).filter(marker => marker.kind !== 'self' && marker.kind !== 'turn').map(marker => marker.label).join(', ')),
            ))))
          : h('p', { class: 'ms-card__text' }, en.shot.targetEmpty),
        controls(button('ms-shot-back', en.shot.cancel, 'shot/back')),
      ];
    case 'confirming':
      return [
        stepLine('ms-card__prompt', en.shot.confirmPrompt(target)),
        h('p', { class: 'ms-card__text' }, en.shot.confirmConsequence),
        controls(button('ms-shot-confirm', en.shot.confirm, 'shot/confirm', { primary: true }), button('ms-shot-back', en.shot.chooseAgain, 'shot/back')),
      ];
    case 'submitting':
      return [stepLine('ms-card__text ms-card__busy', en.shot.submitting)];
    case 'checking':
      return [stepLine('ms-card__text ms-card__busy', en.shot.checking)];
    case 'unknown':
      return [stepLine('ms-card__result', en.shot.unknown), h('p', { class: 'ms-card__text' }, en.shot.unknownDetail), controls(button('ms-shot-check', en.shot.checkAgain, 'shot/check-again', { primary: true }))];
    case 'registered':
      return [stepLine('ms-card__result', target === null ? en.shot.registeredNoTarget : en.shot.registered(target)), h('p', { class: 'ms-card__text' }, en.shot.registeredDetail), controls(button('ms-shot-dismiss', en.shot.done, 'shot/dismiss', { primary: true }))];
    case 'was-registered':
      return [stepLine('ms-card__result', target === null ? en.shot.wasRegisteredNoTarget : en.shot.wasRegistered(target)), h('p', { class: 'ms-card__text' }, en.shot.wasRegisteredDetail), controls(button('ms-shot-dismiss', en.shot.done, 'shot/dismiss', { primary: true }))];
    case 'not-registered':
      return [stepLine('ms-card__result', en.shot.rejectedNotAllowed), h('p', { class: 'ms-card__text' }, en.shot.tryAgainHint), controls(button('ms-shot-dismiss', en.shot.ok, 'shot/dismiss', { primary: true }))];
    default:
      throw new Error(`Unknown shot specimen ${id}`);
  }
}

export function shotCardEl({ specimen = 'available', target = 2, state = STATE_OPENING, viewer = 1, proposals = true, copy = null } = {}) {
  const spec = SHOT_SPECIMENS[specimen];
  if (!spec) throw new Error(`Unknown shot specimen ${specimen}`);
  return h('li', { class: 'ms-card', 'data-action': 'shot' },
    h('h4', { class: 'ms-card__title', id: 'ms-shot-title', tabindex: '-1' },
      en.shot.title,
      proposals && copy && spec.pip ? h('span', { class: 'ms-card__pips', 'data-design-proposal': 'resource-pips' },
        h('span', { class: 'ms-pip', 'data-pip': spec.pip, role: 'img', 'aria-label': copy.resourcePip[spec.pip] })) : null,
    ),
    h('div', {
      class: 'ms-card__state', 'data-region': 'shot', 'data-status': spec.status, 'data-step': spec.step, 'data-selected': String(STEP_SELECTED.has(spec.status)),
      'data-focus-fallback': 'ms-shot-title',
    },
      h('p', { class: 'ms-card__status', 'data-cue-at': 'registration' }, en.shot.status[spec.status]),
      shotBody(specimen, target, state, viewer),
    ),
  );
}

// Which picture a role has, and the token its team word's swatch takes. The client sets
// both as custom properties on the card, inside the private sheet. A role with no entry
// has no picture yet and is drawn as its name, exactly as Frontend draws it today.
const ROLE_LOOK = { Officer: { art: '--ms-asset-card-officer-art', accent: '--ms-color-faction-blue' } };

export function roleCardEl({ role = 'Officer', proposals = true, copy = null, expanded = false } = {}) {
  const words = proposals ? copy?.roleCard?.[role] : null;
  if (!words) return h('p', { class: 'ms-role-card' }, role);
  const look = ROLE_LOOK[role] ?? null;
  const art = () => (look ? h('span', { class: 'ms-role-card__art', 'aria-hidden': 'true' }) : null);
  return h('div', {
    class: 'ms-role-card', 'data-design-proposal': 'role-card-structure',
    style: look ? `--ms-role-art: var(${look.art}); --ms-team-accent: var(${look.accent})` : null,
  },
    art(),
    h('div', { class: 'ms-role-card__text' },
      h('p', { class: 'ms-role-card__name' }, words.name),
      h('p', { class: 'ms-role-card__team' }, words.team),
    ),
    h('details', { class: 'ms-role-card__more', open: expanded },
      h('summary', null, words.more),
      expanded ? art() : null,
      h('p', { class: 'ms-role-card__summary' }, words.summary),
      h('p', { class: 'ms-role-card__summary' }, words.limit),
    ),
  );
}

export function privateAreaEl({ open = false, specimen = 'available', target = 2, state = STATE_OPENING, viewer = 1, role = 'Officer', connection = 'live', proposals = true, docked = true, copy = null, roleExpanded = false } = {}) {
  return h('section', {
    class: `ms-panel ms-private${proposals && docked ? ' ms-private--docked' : ''}`, 'aria-labelledby': 'ms-private-heading', 'data-region': 'private', 'data-open': String(open),
    'data-focus-fallback': 'ms-private-toggle', 'data-design-proposal': proposals && docked ? 'private-dock' : null,
  },
    h('h2', { class: 'ms-panel__heading', id: 'ms-private-heading' }, en.privateArea.heading),
    h('p', { class: 'ms-hint', id: 'ms-private-hint' }, en.privateArea.hint),
    h('button', {
      type: 'button', class: 'ms-button', id: 'ms-private-toggle', 'aria-expanded': String(open), 'aria-controls': 'ms-private-panel',
      'aria-describedby': 'ms-private-hint', 'data-intent': 'private/toggle',
    }, open ? en.privateArea.hide : en.privateArea.show),
    // The panel element always exists so aria-controls resolves; its private content does not.
    h('div', { class: 'ms-private__panel', id: 'ms-private-panel', hidden: !open },
      open ? [
        h('h3', { class: 'ms-private__subheading', id: 'ms-role-heading' }, en.privateArea.role),
        roleCardEl({ role, proposals, copy, expanded: roleExpanded }),
        h('div', { class: 'ms-actions', 'data-region': 'actions' },
          h('h3', { class: 'ms-private__subheading', id: 'ms-actions-heading' }, en.actions.heading),
          connection === 'stale' ? h('p', { class: 'ms-notice' }, en.actions.pausedStale) : null,
          h('ul', { class: 'ms-cards', 'aria-labelledby': 'ms-actions-heading' }, shotCardEl({ specimen, target, state, viewer, proposals, copy })),
        ),
      ] : null,
    ),
  );
}

/**
 * The public state a picture of the Shot card needs, so that a review page never shows a
 * card that contradicts the caption above it. `turn` and `connection` may be given to ask
 * for one public state outright; a picture that cannot occur in it is refused.
 */
export function publicStateFor({ specimen, state, viewer, turn = 'auto', connection = 'auto' }) {
  const needs = SHOT_SPECIMENS[specimen]?.needs;
  if (needs === undefined) throw new Error(`Unknown shot specimen ${specimen}`);
  const wantedTurn = turn !== 'auto' ? turn : needs === 'own-turn' ? 'own' : needs === 'other-turn' ? 'other' : state.activeSeat === viewer ? 'own' : 'other';
  const wantedConnection = connection !== 'auto' ? connection : needs === 'stale' ? 'stale' : 'live';
  if (needs === 'own-turn' && (wantedTurn !== 'own' || wantedConnection !== 'live')) throw new Error(`${specimen} only occurs on the seat's own turn with a current view`);
  if (needs === 'other-turn' && (wantedTurn !== 'other' || wantedConnection !== 'live')) throw new Error(`${specimen} only occurs on another seat's turn with a current view`);
  if (needs === 'stale' && wantedConnection !== 'stale') throw new Error(`${specimen} only occurs on a stale view`);
  const other = state.seats.find(candidate => candidate.n !== viewer).n;
  const activeSeat = wantedTurn === 'own' ? viewer : state.activeSeat !== viewer && state.activeSeat !== null ? state.activeSeat : other;
  return { state: { ...state, activeSeat }, connection: wantedConnection };
}

export function playerShell({ state = STATE_OPENING, viewer = 1, role = 'Officer', open = false, specimen = 'available', target = 2, turn = 'auto', connection = 'auto', motion = 'full', proposals = true, copy = null, roleExpanded = false } = {}) {
  const shown = publicStateFor({ specimen, state, viewer, turn, connection });
  const own = shown.state.seats.find(candidate => candidate.n === viewer);
  if (!own) throw new Error(`No seat ${viewer} in this state`);
  const others = shown.state.seats.filter(candidate => candidate.n !== viewer && candidate.location === own.location);
  const location = h('section', { class: 'ms-panel ms-location', 'aria-labelledby': 'ms-location-heading', 'data-region': 'location' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-location-heading' }, en.location.heading),
    // PROPOSED. Where a seat is, is public: the element is the same on every phone.
    proposals ? h('span', { class: 'ms-location__art', 'data-location': zoneIdOf(own.location), 'aria-hidden': 'true', 'data-design-proposal': 'location-art' }) : null,
    h('p', { class: 'ms-location__name' }, own.location),
    h('p', { class: 'ms-location__status' },
      h('span', { class: 'ms-location__status-label' }, `${en.location.status}: `),
      markersEl(own, shown.state, viewer, { withoutSelf: true }),
    ),
    h('h3', { class: 'ms-location__others', id: 'ms-location-others' }, en.location.others),
    others.length > 0
      ? h('ul', { class: 'ms-seats', 'aria-labelledby': 'ms-location-others' }, others.map(candidate => seatEl(candidate, shown.state, viewer)))
      : h('p', { class: 'ms-zone__empty' }, en.location.alone),
  );
  const roster = h('section', { class: 'ms-panel ms-roster', 'aria-labelledby': 'ms-roster-heading', 'data-region': 'roster' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-roster-heading' }, en.roster.playerHeading),
    zonesEl(shown.state, viewer, 'ms-roster-zone'),
  );
  const privateArea = privateAreaEl({ open, specimen, target, state: shown.state, viewer, role, connection: shown.connection, proposals, copy, roleExpanded });
  const title = h('h1', { class: 'ms-title', id: 'ms-title' }, h('span', { class: 'ms-title__prefix' }, `${en.surface.youAre} `), en.seat.label(viewer));
  const phase = phaseEl(shown.state, viewer);
  // Frontend's order today is title, phase, location, private, roster. The proposal docks
  // the private sheet at the bottom edge, so it comes last.
  const content = proposals ? [title, phase, location, roster, privateArea] : [title, phase, location, privateArea, roster];
  return shellEl({ surface: 'player', connection: shown.connection, motion }, h('p', { class: 'ms-surface' }, en.surface.player), content);
}

export function tableShell({ state = STATE_BUSY, connection = 'live', motion = 'full' } = {}) {
  const column = label => h('th', { scope: 'col' }, label);
  const roster = h('section', { class: 'ms-panel ms-roster', id: 'ms-roster', 'aria-labelledby': 'ms-roster-heading', 'data-region': 'roster', tabindex: '0' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-roster-heading' }, en.roster.tableHeading),
    h('table', { class: 'ms-table' },
      h('caption', { class: 'ms-visually-hidden' }, en.roster.caption),
      h('thead', null, h('tr', null, column(en.roster.column.player), column(en.roster.column.location), column(en.roster.column.health), column(en.roster.column.status))),
      h('tbody', null, state.seats.map(seatModel => {
        const status = markersOf(seatModel, state, null).filter(marker => marker.kind !== 'health').map(marker => marker.label).join(', ') || en.roster.noStatus;
        return h('tr', { 'data-seat': seatId(seatModel.n), 'data-active': String(state.activeSeat === seatModel.n) },
          h('th', { scope: 'row' }, en.seat.label(seatModel.n)),
          h('td', { 'data-cue-at': `${seatId(seatModel.n)}/place` }, seatModel.location),
          h('td', { 'data-cue-at': `${seatId(seatModel.n)}/health` }, seatModel.health),
          h('td', null, status),
        );
      })),
    ),
  );
  return shellEl({ surface: 'table', connection, motion }, null, [
    h('h1', { class: 'ms-title', id: 'ms-title' }, en.surface.table),
    phaseEl(state, null),
    h('section', { class: 'ms-panel ms-board', 'aria-labelledby': 'ms-board-heading', 'data-region': 'board' },
      h('h2', { class: 'ms-panel__heading', id: 'ms-board-heading' }, en.roster.boardHeading),
      zonesEl(state, null, 'ms-board-zone'),
    ),
    roster,
  ]);
}

export async function loadProposedCopy() {
  const response = await fetch('/contract/copy.en.proposed.json');
  if (!response.ok) throw new Error('Could not load the proposed copy');
  return response.json();
}

/**
 * Wait until what the page draws is on screen. Pictures that arrive as custom properties
 * are decoded when first drawn, so each one in use is decoded here before a render is taken.
 */
export async function settle() {
  await document.fonts.ready;
  await Promise.all([...document.images].map(image => (image.complete ? null : new Promise(done => { image.onload = image.onerror = done; }))));
  const pictures = new Set();
  const collect = style => {
    for (const property of ['background-image', 'mask-image']) {
      for (const match of style.getPropertyValue(property).matchAll(/url\("(data:image\/svg\+xml[^"]*)"\)/g)) pictures.add(match[1]);
    }
  };
  for (const node of document.querySelectorAll('*')) {
    collect(getComputedStyle(node));
    collect(getComputedStyle(node, '::before'));
    collect(getComputedStyle(node, '::after'));
  }
  await Promise.all([...pictures].map(source => {
    const image = new Image();
    image.src = source;
    return image.decode().catch(() => {});
  }));
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
}
