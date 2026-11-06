// mothership:dev-only
//
// The nine role films: each current role's team, the device its role card draws (the reviewed
// held-device exports under their historical ids, and library group 8's Engineer device: the same
// pictures as design/library/successor/names.mjs ROLE_DEVICES), the team emblem on its title plate
// (library group 7's), and its film:
//   pilot       drawn (the Doctor), for the owner's review on a phone
//   storyboard  in docs/design/cinematic/role-reveal.md only, to be drawn after the pilot's review
// The two Disablers share one film, frame for frame; only the plate's name and emblem differ.
//
// Every phone ships every device, emblem and crew portrait below (ROLE_REVEAL_ASSETS), whatever role
// it was dealt and whoever it plays: nothing is fetched for a dealt role (the art direction: "fetching
// only a dealt role or hidden action can disclose identity").

import { CURRENT_ROLES } from '../../../library/successor/names.mjs';
import { DOCTOR_PANELS } from './doctor.mjs';

/** Paths from the stage's page (design/cinematic/). */
const ROLES_DIR = '../exports/roles';
export const DEVICE_FILES = Object.freeze({
  Insider: `${ROLES_DIR}/device-insider.held.a1ee17deeb.svg`,
  Doctor: `${ROLES_DIR}/device-cracker.held.bbb6dc87a8.svg`,
  'Blue Disabler': `${ROLES_DIR}/device-blue-disabler.held.d31e0ca8b7.svg`,
  Supplier: `${ROLES_DIR}/device-supplier.held.d3b15d7502.svg`,
  Undercover: `${ROLES_DIR}/device-undercover.held.7e6afbf356.svg`,
  Hacker: `${ROLES_DIR}/device-hacker.held.de106a4fc3.svg`,
  Alien: `${ROLES_DIR}/device-alien.held.63a0609fbd.svg`,
  'Red Disabler': `${ROLES_DIR}/device-red-disabler.held.c72bccd5e5.svg`,
  Engineer: '../library/successor/assets/sw-device-engineer.svg',
});

/**
 * Each crew character's portrait on the role card (the public board's crew card pieces, 84 x 96): the
 * opener's card on the desk is the player's own role card, so it shows their own portrait.
 */
const PIECES_DIR = '../exports/public-board';
export const PORTRAIT_FILES = Object.freeze({
  c1: `${PIECES_DIR}/piece-crew.card-c1.b8ee37c22e.svg`,
  c2: `${PIECES_DIR}/piece-crew.card-c2.fa486c89e9.svg`,
  c3: `${PIECES_DIR}/piece-crew.card-c3.73339084a9.svg`,
  c4: `${PIECES_DIR}/piece-crew.card-c4.e4067febcb.svg`,
  c5: `${PIECES_DIR}/piece-crew.card-c5.0c33e38fd5.svg`,
  c6: `${PIECES_DIR}/piece-crew.card-c6.1a5d90c548.svg`,
  c7: `${PIECES_DIR}/piece-crew.card-c7.7ac4db8356.svg`,
  c8: `${PIECES_DIR}/piece-crew.card-c8.130c29c947.svg`,
  c9: `${PIECES_DIR}/piece-crew.card-c9.56a0fdbe4a.svg`,
});

export const EMBLEM_FILES = Object.freeze({
  Blue: '../library/end/assets/en-emblem-blue.svg',
  Red: '../library/end/assets/en-emblem-red.svg',
  Alien: '../library/end/assets/en-emblem-alien.svg',
});

/** Each role's team (docs/specifications/planet-successor/game-design.md, "Setup and identity"). */
export const TEAMS = Object.freeze({
  Insider: 'Blue', Doctor: 'Blue', 'Blue Disabler': 'Blue', Supplier: 'Blue', Engineer: 'Blue',
  Undercover: 'Red', Hacker: 'Red', 'Red Disabler': 'Red',
  Alien: 'Alien',
});

/** The film each role plays: the two Disablers share one. */
export const FILM_OF = Object.freeze(Object.fromEntries(CURRENT_ROLES.map(role => [role, role.endsWith('Disabler') ? 'Disabler' : role])));

/** The films drawn so far, by film id: three panel functions each. */
const DRAWN = Object.freeze({ Doctor: DOCTOR_PANELS });

export const ROLE_FILMS = Object.freeze(Object.fromEntries(CURRENT_ROLES.map(role => [role, Object.freeze({
  role,
  team: TEAMS[role],
  film: FILM_OF[role],
  device: DEVICE_FILES[role],
  emblem: EMBLEM_FILES[TEAMS[role]],
  status: DRAWN[FILM_OF[role]] ? 'pilot' : 'storyboard',
  panels: DRAWN[FILM_OF[role]] ?? null,
})])));

/** Every picture any role film draws: what every phone ships and preloads, whatever its role. */
export const ROLE_REVEAL_ASSETS = Object.freeze([...new Set([...Object.values(DEVICE_FILES), ...Object.values(EMBLEM_FILES), ...Object.values(PORTRAIT_FILES)])]);
