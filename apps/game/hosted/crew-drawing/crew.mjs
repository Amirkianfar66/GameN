//
// The crew of nine in the restyle the owner approved on 7 November 2026 (the pilot of Mira, Nova
// and Atlas, then "Go a head with all of them"; docs/design/character-pilot.md). A drawing release
// for runtime adoption (DSN-REQ-17, docs/design/crew-drawing-release.md).
//
// CREW is a drop-in for the rig's CREW (the rig's crew.mjs): the same public ids
// (c1 to c9), the same call signs and the same flags, so a consumer that names a character by its
// id or prints its sign is unchanged. It adds what the new drawing needs: the id, the build, the
// traced skin and hair, and what each wears on the head. Nothing here, or anywhere in the drawing,
// says a role, a team, an ability or a status; every colour keeps at least the game's minimum
// distance from each faction accent (a test holds it).

/** This release's version, for manifests and the art-release candidate. */
export const CREW_DRAWING_VERSION = 'crew-drawing-1.0.0';

/** The crew suit: warm canvas with charcoal panels, chunky boots. Public tones, the same for everyone. */
export const SUIT = Object.freeze({
  light: '#DCCDB2',
  dark: '#4A4543',
  pad: '#6A5D53',
  boot: '#4E443F',
  sole: '#2B2624',
  belt: '#574B44',
});

/** How a body is built, as factors on the rig's thickness. Atlas is heavy and Juno slim (the owner). */
export const BUILDS = Object.freeze({
  slim: Object.freeze({ arm: 0.86, leg: 0.88, torso: 0.9, belly: 0, neck: 0.92 }),
  regular: Object.freeze({ arm: 0.94, leg: 0.95, torso: 0.98, belly: 0, neck: 1 }),
  heavy: Object.freeze({ arm: 1.2, leg: 1.18, torso: 1.3, belly: 0.75, neck: 1.25 }),
});

/**
 * The nine, by public id. field: the portrait's ground; accent: shoulder pads, collar, cuffs,
 * buckle and boot bands; skin and hair: the traced art's; band, gear, lens: what is worn on the
 * head, as the back view draws it. The flags (glasses, beard, mustache, headset, goggles, shades)
 * are the rig's, kept for consumers that read them.
 */
export const CREW = Object.freeze({
  c1: Object.freeze({ id: 'c1', sign: 'Vega', build: 'regular', hairStyle: 'afro', skin: '#CA7C3E', hair: '#3D2D24', hairLight: '#5F483B', field: '#EE8B3A', accent: '#B45A16', band: '#E97D2A', glasses: true }),
  c2: Object.freeze({ id: 'c2', sign: 'Rigel', build: 'regular', hairStyle: 'beanie', skin: '#F9CE95', hair: '#B95008', hairLight: '#E26710', field: '#F3CB3F', accent: '#B98F12', band: '#E76B11', beard: true }),
  c3: Object.freeze({ id: 'c3', sign: 'Lyra', build: 'slim', hairStyle: 'bun', skin: '#F5B56C', hair: '#2F231C', hairLight: '#644B3C', field: '#AFCF4E', accent: '#6F8E22', band: '#A3A63E' }),
  c4: Object.freeze({ id: 'c4', sign: 'Atlas', build: 'heavy', hairStyle: 'quiff', skin: '#F4B266', hair: '#231C17', hairLight: '#54453A', field: '#2F9461', accent: '#1F6B45' }),
  c5: Object.freeze({ id: 'c5', sign: 'Orion', build: 'regular', hairStyle: 'bald', skin: '#F9CA94', hair: '#F9E5CA', hairLight: '#A8937E', field: '#33ADA2', accent: '#177168', mustache: true }),
  c6: Object.freeze({ id: 'c6', sign: 'Nova', build: 'slim', hairStyle: 'bob', skin: '#FAC98C', hair: '#1F1915', hairLight: '#4D3D34', field: '#C2408F', accent: '#8F2E6A', gear: '#5D524F', headphones: true, headset: true }),
  c7: Object.freeze({ id: 'c7', sign: 'Juno', build: 'slim', hairStyle: 'messy', skin: '#F8C98C', hair: '#824F26', hairLight: '#A9622D', field: '#9A6A47', accent: '#5E3B22', gear: '#504135', lens: '#D1BB9E', goggles: true }),
  c8: Object.freeze({ id: 'c8', sign: 'Mira', build: 'regular', hairStyle: 'long', skin: '#EDAD78', hair: '#583927', hairLight: '#7A5236', field: '#D2B48C', accent: '#9C7A50' }),
  c9: Object.freeze({ id: 'c9', sign: 'Echo', build: 'regular', hairStyle: 'locs', skin: '#B96928', hair: '#7B6351', hairLight: '#8C735F', field: '#5A4F7E', accent: '#3F3A5E', gear: '#E9D4BD', lens: '#13120F', shades: true }),
});

/** The crew's order, as the owner's sheet reads. */
export const CREW_ORDER = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);

/**
 * The character a drawing call names: this module's own entry, by id, or by the call sign of an
 * entry of the rig's CREW (which has no id), so a consumer still holding the rig's CREW draws the
 * same person. Throws for anyone else.
 */
export function crewMember(c) {
  const found = (c && CREW[c.id]) || Object.values(CREW).find(m => m.sign === c?.sign);
  if (!found) throw new Error(`Unknown crew member: ${c?.id ?? c?.sign ?? c}`);
  return found;
}
