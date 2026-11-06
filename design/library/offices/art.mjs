// mothership:dev-only
//
// Library group 6: the offices' remaining pictures, in the family of the reviewed board's Captain
// badge (design/exports/public-board/marker-captain.*: an ink glyph on a paper disc with an ink rim
// and an offset ink shadow, 32 px glyph, 36 px badge). The Officer gets the same disc with two
// chevrons, so the two public offices read as a pair and never as each other (a star and two
// chevrons) and never as a secret role (no role or device picture is used: the old Blue Officer
// role's device art is superseded and not reused). A block is a temporary state, not an office, so
// its disc has a dashed rim; on the board it is a strip of hazard tape at the blocked figure's feet.
// Monochrome ink and paper for the badges, as the Captain's; the tape adds the dossier's caption
// yellow. Every colour keeps MIN_ACCENT_DISTANCE from the faction accents; no picture holds a word.

export const OFFICE_ART_VERSION = 'library-offices-0.1.0';

export const O = Object.freeze({ ink: '#151923', paper: '#F4EBDD', yellow: '#F7C52B', steel: '#3A4A6B', navy: '#1B2747', plate: '#8D97A8' });

function asset(name, about, w, h, body, stretch = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${OFFICE_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/offices/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${stretch ? ' preserveAspectRatio="none"' : ''}><g id="${name}">${body}</g></svg>\n`;
}

// ---------- glyphs (32 x 32, as the Captain's glyph) ----------

/** Two chevrons, point up: ink, each with a paper inner line (the Captain's star has a paper inner star). */
function officerGlyph() {
  const chevron = dy => `<path d="M4 ${18 + dy} L16 ${9 + dy} L28 ${18 + dy} L28 ${23.5 + dy} L16 ${14.5 + dy} L4 ${23.5 + dy} Z" fill="${O.ink}" stroke="${O.ink}" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<path d="M8 ${19.6 + dy} L16 ${13.6 + dy} L24 ${19.6 + dy}" fill="none" stroke="${O.paper}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<g data-layer="glyph-officer">${chevron(-4)}${chevron(5)}</g>`;
}
/** An arrow stopped by a wall: no voluntary move (reads at 24 px, where a boot print does not). */
function blockedGlyph() {
  return `<g data-layer="glyph-blocked"><path d="M3.5 16 H17" stroke="${O.ink}" stroke-width="4.5" stroke-linecap="round"/>`
    + `<path d="M15 9 L23 16 L15 23 Z" fill="${O.ink}" stroke="${O.ink}" stroke-width="1.6" stroke-linejoin="round"/>`
    + `<rect x="24.5" y="4.5" width="5" height="23" rx="1.2" fill="${O.ink}"/></g>`;
}
/** A badge: the reviewed Captain badge's disc (shadow, paper, ink rim) with a glyph at 0.66; dashed for a temporary state. */
const badge = (glyph, dashed = false) => `<g data-layer="badge-disc"><circle cx="19.5" cy="19.5" r="14.5" fill="${O.ink}"/><circle cx="17" cy="17" r="14.5" fill="${O.paper}" stroke="${O.ink}" stroke-width="2.5"${dashed ? ' stroke-dasharray="4.2 2.6"' : ''}/></g>`
  + `<g transform="translate(17 17) scale(0.66) translate(-16 -16)">${glyph}</g>`;

export function officerGlyphSvg() { return asset('of-glyph-officer', 'The Officer\'s glyph: two chevrons (the Captain\'s is a star). A public office, never a role.', 32, 32, officerGlyph()); }
export function officerBadgeSvg() { return asset('of-badge-officer', 'The Officer\'s badge on the board and on name tags: the Captain badge\'s paper disc with two chevrons.', 36, 36, badge(officerGlyph())); }
export function blockedGlyphSvg() { return asset('of-glyph-blocked', 'The movement block\'s glyph: an arrow stopped by a wall.', 32, 32, blockedGlyph()); }
export function blockedBadgeSvg() { return asset('of-badge-blocked', 'The movement block\'s badge for this round: the same disc with a dashed rim (a state that ends with the round, not an office).', 36, 36, badge(blockedGlyph(), true)); }

/** The board's block marker: a strip of hazard tape at the blocked figure's feet (stretched to its box). */
export function tapeSvg() {
  const stripes = Array.from({ length: 9 }, (_, i) => `<path d="M${-8 + i * 13} 24 L${4 + i * 13} 0 L${10 + i * 13} 0 L${-2 + i * 13} 24 Z" fill="${O.ink}"/>`).join('');
  const body = `<rect x="0" y="0" width="96" height="24" fill="${O.yellow}"/>${stripes}<rect x="1" y="1" width="94" height="22" fill="none" stroke="${O.ink}" stroke-width="2"/>`;
  return asset('of-tape-blocked', 'The board\'s movement-block marker: hazard tape across the blocked figure\'s feet, for this round only.', 96, 24, body, true);
}

/** Tray marks: the appointment (the Officer badge on a ribbon) and the block (the stopped arrow over tape). */
export function iconAppointSvg() {
  const body = `<path d="M15 28 L11 44 L18 40 L22 46 L24 30 Z M33 28 L37 44 L30 40 L26 46 L24 30 Z" fill="${O.steel}" stroke="${O.ink}" stroke-width="2" stroke-linejoin="round"/>`
    + `<g transform="translate(6 2)">${badge(officerGlyph())}</g>`;
  return asset('of-icon-appoint', 'The tray mark for the Captain\'s appointment: the Officer badge on a ribbon.', 48, 48, body);
}
export function iconBlockSvg() {
  const body = `<g transform="translate(6 0)">${badge(blockedGlyph(), true)}</g><g transform="translate(4 36) scale(0.42 0.42)"><rect x="0" y="0" width="96" height="24" fill="${O.yellow}"/>`
    + Array.from({ length: 9 }, (_, i) => `<path d="M${-8 + i * 13} 24 L${4 + i * 13} 0 L${10 + i * 13} 0 L${-2 + i * 13} 24 Z" fill="${O.ink}"/>`).join('') + `<rect x="1" y="1" width="94" height="22" fill="none" stroke="${O.ink}" stroke-width="3"/></g>`;
  return asset('of-icon-block', 'The tray mark for the Officer\'s movement block: the stopped arrow over a strip of tape.', 48, 48, body);
}

/** Every picture of group 6, by name. */
export function officeAssets() {
  return {
    'of-glyph-officer': { svg: officerGlyphSvg(), size: '32x32', role: 'public: the Officer\'s glyph', about: 'The Officer\'s glyph, two chevrons, for name tags and lists; the Captain\'s glyph is the reviewed star.' },
    'of-badge-officer': { svg: officerBadgeSvg(), size: '36x36', role: 'public: the Officer\'s badge', about: 'The Officer\'s badge on the board, in the reviewed Captain badge\'s family.' },
    'of-glyph-blocked': { svg: blockedGlyphSvg(), size: '32x32', role: 'public: the block\'s glyph', about: 'The movement block\'s glyph, an arrow stopped by a wall, for name tags and lists this round.' },
    'of-badge-blocked': { svg: blockedBadgeSvg(), size: '36x36', role: 'public: the block\'s badge', about: 'The movement block\'s badge, with a dashed rim because it ends with the round.' },
    'of-tape-blocked': { svg: tapeSvg(), size: '96x24', role: 'public: the board\'s block marker', about: 'Hazard tape across the blocked figure\'s feet, at the slot\'s feet anchor, for this round only.' },
    'of-icon-appoint': { svg: iconAppointSvg(), size: '48x48', role: 'Captain-private: tray mark', about: 'The tray mark for the Captain\'s Officer appointment, during its 30 seconds.' },
    'of-icon-block': { svg: iconBlockSvg(), size: '48x48', role: 'Officer-private: tray mark', about: 'The tray mark for the Officer\'s movement block, during the 15-second pre-turn window.' },
  };
}
