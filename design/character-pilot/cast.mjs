// mothership:dev-only
//
// The pilot's three characters (the owner's decisions of 7 November 2026): Mira, Nova and Atlas
// from the owner's own redesign sheet, restyled on the approved rig's skeletons. Their ids are the
// crew's (c8, c6, c4). Nothing of a role or a team is drawn on anyone; every colour here is kept
// at least MIN_ACCENT_DISTANCE from each faction accent (a test holds it).
//
// What the owner decided for this pilot:
// - Mira: no hijab ("it is not good for rigging"); long wavy hair, as the sheet draws her.
// - Colours "as recommended": Nova's pink moves from the red team's colour toward magenta, and
//   Echo's purple (not in the pilot) toward a dusty violet, each far from every faction accent.
// - Atlas and Juno told apart by build: Atlas is the heavy one.
// - The portraits are framed like iOS app icons (portrait.mjs).

/** The crew suit of the redesign: warm canvas with charcoal panels, chunky boots. Public tones. */
export const SUIT = Object.freeze({
  light: '#DCCDB2',
  dark: '#4A4543',
  pad: '#6A5D53',
  boot: '#4E443F',
  sole: '#2B2624',
  belt: '#574B44',
});

/**
 * How a body is built, as factors on the rig's thickness: arm and leg radii, the torso's width and
 * a belly. The heavy build is Atlas's (the owner: tell Atlas and Juno apart by build).
 */
export const BUILDS = Object.freeze({
  slim: Object.freeze({ arm: 0.86, leg: 0.88, torso: 0.9, belly: 0, neck: 0.92 }),
  regular: Object.freeze({ arm: 0.94, leg: 0.95, torso: 0.98, belly: 0, neck: 1 }),
  heavy: Object.freeze({ arm: 1.2, leg: 1.18, torso: 1.3, belly: 0.75, neck: 1.25 }),
});

/**
 * field: the portrait's ground and the suit's trim family; accent: shoulder pads, collar, cuffs,
 * buckle and boot bands. hair, hairLight: the hair and its light.
 */
export const PILOT_CAST = Object.freeze({
  c8: Object.freeze({
    id: 'c8', sign: 'Mira', build: 'regular', hairStyle: 'long',
    skin: '#E2AE82', hair: '#3B2617', hairLight: '#7A5236', field: '#D2B48C', accent: '#9C7A50',
  }),
  c6: Object.freeze({
    id: 'c6', sign: 'Nova', build: 'slim', hairStyle: 'bob', headphones: true,
    skin: '#EEC7A0', hair: '#1F1C22', hairLight: '#4D4852', field: '#C2408F', accent: '#8F2E6A', gear: '#3B3740',
  }),
  c4: Object.freeze({
    id: 'c4', sign: 'Atlas', build: 'heavy', hairStyle: 'quiff', mustache: true, goatee: true,
    skin: '#D19B6E', hair: '#25201F', hairLight: '#4E4441', field: '#2F9461', accent: '#1F6B45',
  }),
});

/**
 * The colour changes the owner accepted, with the cie76 distance of each to the nearest faction
 * accent (blue #70AFFF, red #FF8C8C, alien #C4A4FF): before, on the redesign sheet, and proposed.
 * Echo is not in the pilot; its proposal is recorded so the next characters start from it.
 */
export const COLOUR_PROPOSALS = Object.freeze([
  Object.freeze({ id: 'c6', sign: 'Nova', role: 'field', current: '#EE7FAE', sheet: '#D9507F', proposed: '#C2408F' }),
  Object.freeze({ id: 'c6', sign: 'Nova', role: 'accent', current: '#B5447A', sheet: '#C74F66', proposed: '#8F2E6A' }),
  Object.freeze({ id: 'c9', sign: 'Echo', role: 'field', current: '#39404E', sheet: '#6E60A8', proposed: '#5A4F7E' }),
  Object.freeze({ id: 'c9', sign: 'Echo', role: 'accent', current: '#1C212B', sheet: '#4E4478', proposed: '#3F3A5E' }),
]);

/** The pilot's characters in the order its sheets show them. */
export const PILOT_ORDER = Object.freeze(['c8', 'c6', 'c4']);
export const PILOT_VERSION = 'character-pilot-0.1.0';
