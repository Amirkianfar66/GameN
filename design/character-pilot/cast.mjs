// mothership:dev-only
//
// The crew of nine from the owner's own redesign sheet, restyled on the approved rig's skeletons.
// The pilot's three (Mira, Nova and Atlas: the owner's decisions of 7 November 2026) came first and
// were approved ("i am happy with results"); the other six followed on the owner's go-ahead ("Go a
// head with all of them"). Their ids are the crew's (c1 to c9). Nothing of a role or a team is
// drawn on anyone; every colour here is kept at least MIN_ACCENT_DISTANCE from each faction accent
// (a test holds it).
//
// What the owner decided for the pilot, and so for the crew:
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
 * buckle and boot bands. hair, hairLight: the hair and its light. skin and hair are the traced
 * art's, so the neck, the hands and the head from behind match the face. gear, band, lens: what a
 * character wears on the head, as the back view draws it.
 */
export const PILOT_CAST = Object.freeze({
  c1: Object.freeze({
    id: 'c1', sign: 'Vega', build: 'regular', hairStyle: 'afro',
    skin: '#CA7C3E', hair: '#3D2D24', hairLight: '#5F483B', band: '#E97D2A', field: '#EE8B3A', accent: '#B45A16',
  }),
  c2: Object.freeze({
    id: 'c2', sign: 'Rigel', build: 'regular', hairStyle: 'beanie',
    skin: '#F9CE95', hair: '#B95008', hairLight: '#E26710', band: '#E76B11', field: '#F3CB3F', accent: '#B98F12',
  }),
  c3: Object.freeze({
    id: 'c3', sign: 'Lyra', build: 'slim', hairStyle: 'bun',
    skin: '#F5B56C', hair: '#2F231C', hairLight: '#644B3C', band: '#A3A63E', field: '#AFCF4E', accent: '#6F8E22',
  }),
  c5: Object.freeze({
    id: 'c5', sign: 'Orion', build: 'regular', hairStyle: 'bald',
    skin: '#F9CA94', hair: '#F9E5CA', hairLight: '#A8937E', field: '#33ADA2', accent: '#177168',
  }),
  c7: Object.freeze({
    id: 'c7', sign: 'Juno', build: 'slim', hairStyle: 'messy',
    skin: '#F8C98C', hair: '#824F26', hairLight: '#A9622D', gear: '#504135', lens: '#D1BB9E', field: '#9A6A47', accent: '#5E3B22',
  }),
  c9: Object.freeze({
    id: 'c9', sign: 'Echo', build: 'regular', hairStyle: 'locs',
    skin: '#B96928', hair: '#7B6351', hairLight: '#8C735F', gear: '#E9D4BD', lens: '#13120F', field: '#5A4F7E', accent: '#3F3A5E',
  }),
  c8: Object.freeze({
    id: 'c8', sign: 'Mira', build: 'regular', hairStyle: 'long',
    skin: '#EDAD78', hair: '#583927', hairLight: '#7A5236', field: '#D2B48C', accent: '#9C7A50',
  }),
  c6: Object.freeze({
    id: 'c6', sign: 'Nova', build: 'slim', hairStyle: 'bob', headphones: true,
    skin: '#FAC98C', hair: '#1F1915', hairLight: '#4D3D34', field: '#C2408F', accent: '#8F2E6A', gear: '#5D524F',
  }),
  c4: Object.freeze({
    id: 'c4', sign: 'Atlas', build: 'heavy', hairStyle: 'quiff',
    skin: '#F4B266', hair: '#231C17', hairLight: '#54453A', field: '#2F9461', accent: '#1F6B45',
  }),
});

/**
 * The colour changes the owner accepted, with the cie76 distance of each to the nearest faction
 * accent (blue #70AFFF, red #FF8C8C, alien #C4A4FF): before, on the redesign sheet, and proposed.
 * Echo was not in the pilot; the crew draws Echo in the proposed violet.
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
/** The whole crew, in the crew's order (the owner's sheet reads the same way). */
export const CREW_ORDER = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);
export const CREW_VERSION = 'character-crew-0.1.0';
