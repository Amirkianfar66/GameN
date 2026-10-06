// mothership:dev-only
//
// One small scene per authorized cue, for the storyboard page (which freezes it) and the
// motion page (which plays it). Each scene is the shell markup around the part the cue
// lands on, and a cue is shown the way a renderer shows it: by putting data-cue on the
// element that carries the matching data-cue-at, and taking it off again.
//
// Synthetic, like everything on these pages: no engine, no transport, no match.
// The two synthetic studies are not here. They have a module of their own, which only the
// studies page imports.

import { h, phaseEl, seatEl, shotCardEl, STATE_OPENING } from './kit.js';

// No data-screen: a scene is one part on a stage, so the page-level layout rules stay out of it.
export const sceneShell = (surface, { motion = 'full' } = {}, ...children) => h('div', {
  class: `ms-shell ms-shell--${surface}`, 'data-surface': surface, 'data-connection': 'live', 'data-motion': motion,
}, children);

const privately = (options, ...children) => sceneShell('player', options, h('div', { class: 'ms-private', 'data-open': 'true' }, h('div', { class: 'ms-private__panel' }, children)));

/** A Room A panel as the table display draws it, with the given seats standing in it. */
export function roomPanel(options, seats, state) {
  const zone = h('li', { class: 'ms-zone', 'data-zone': 'room-a', 'data-current': 'false' },
    h('h3', { class: 'ms-zone__name' }, 'Room A'),
    h('ul', { class: 'ms-seats' }, seats.map(seat => seatEl(seat, state, null))),
  );
  const board = h('section', { class: 'ms-panel ms-board', 'data-region': 'board' }, h('ul', { class: 'ms-zones', style: 'grid-template-columns: 1fr' }, zone));
  zone.style.gridColumn = 'auto';
  return { root: sceneShell('table', options, board), zone };
}

export const healthy = n => ({ n, location: 'Room A', health: 'Healthy', jailed: false, captain: false });

export const CUE_STAGES = {
  'cue-selection': {
    width: 330,
    ground: 'panel',
    build(options, copy) {
      const card = shotCardEl({ specimen: 'targeting', copy });
      card.querySelector('.ms-targets').replaceChildren(...[...card.querySelectorAll('.ms-targets > li')].slice(0, 2));
      return { root: privately(options, h('ul', { class: 'ms-cards' }, card)), marks: [[card, 'selection']] };
    },
  },
  'cue-registration': {
    width: 330,
    ground: 'panel',
    build(options, copy) {
      const card = shotCardEl({ specimen: 'registered', copy });
      return { root: privately(options, h('ul', { class: 'ms-cards' }, card)), marks: [[card.querySelector('[data-cue-at="registration"]'), 'registration']] };
    },
  },
  'cue-public-move': {
    width: 470,
    ground: '',
    build(options) {
      const state = { activeSeat: 0 };
      const { root, zone } = roomPanel(options, [healthy(2), healthy(7), healthy(4)], state);
      return { root, marks: [[zone.querySelector('[data-cue-at="seat-7/place"]'), 'public-move']] };
    },
  },
  'cue-status-change': {
    width: 330,
    ground: 'panel',
    build(options) {
      const state = { activeSeat: 0 };
      const seats = [healthy(8), { ...healthy(9), health: 'Injured' }];
      const list = h('ul', { class: 'ms-seats' }, seats.map(seat => seatEl(seat, state, null)));
      return { root: sceneShell('player', options, list), marks: [[list.querySelector('[data-cue-at="seat-9/health"]'), 'status-change']] };
    },
  },
  'cue-phase-change': {
    width: 340,
    ground: '',
    build(options) {
      const phase = phaseEl({ ...STATE_OPENING, activeSeat: 2 }, 1, { seconds: 59 });
      phase.style.position = 'static';
      return { root: sceneShell('player', options, phase), marks: [[phase.querySelector('[data-cue-at="phase"]'), 'phase-change']] };
    },
  },
  'cue-round-transition': {
    width: 560,
    ground: '',
    build(options) {
      const phase = phaseEl({ ...STATE_OPENING, round: 3, activeSeat: 6 }, null, { seconds: 59 });
      return { root: sceneShell('table', options, phase), marks: [[phase.querySelector('[data-cue-at="phase"]'), 'round-transition']] };
    },
  },
};

/**
 * Builds one scene from a table of stages. `at` freezes the cue at that many milliseconds;
 * without it the cue is left unmarked for the caller to play with play().
 */
export function buildScene(stages, id, { motion = 'full', effects = 'full', at = null, copy }) {
  const stage = stages[id];
  if (!stage) throw new Error(`No stage for ${id}`);
  const { root, marks, overlays = [] } = stage.build({ motion }, copy);
  const frame = h('div', { 'data-effects': effects === 'reduced' ? 'reduced' : null, style: `inline-size: ${stage.width}px` }, root);
  root.style.minBlockSize = '0';
  root.style.background = 'transparent';
  const play = () => {
    for (const [element, name] of marks) {
      element.removeAttribute('data-cue');
      // Reading a layout property makes the browser notice the attribute was gone.
      void element.offsetWidth;
      element.setAttribute('data-cue', name);
    }
    for (const overlay of overlays) {
      overlay.style.animationName = 'none';
      void overlay.offsetWidth;
      overlay.style.animationName = '';
    }
  };
  if (at !== null) {
    frame.style.setProperty('--cue-at', `${-at}ms`);
    frame.style.setProperty('--cue-play', 'paused');
    for (const [element, name] of marks) element.setAttribute('data-cue', name);
  }
  return { frame, play, ground: stage.ground };
}

export const buildCueScene = (cueId, options) => buildScene(CUE_STAGES, cueId, options);
