// mothership:dev-only
//
// Library group 4: Promises, in the dossier's paper-and-ink language (design/abilities: paper
// slips, ink contours, halftone, label tapes and stamps) with the console navy of the earlier
// groups for the card's header band. New pictures only.
//
// PAIR-PRIVATE art: drawn only inside the giver's or the recipient's own open private sheet,
// concealed on blur. Six kinds, each with its own silhouette (a ballot with a star, a shield, a
// barred window with a ballot going in, the same window refused, an arched door, a square door),
// so no kind depends on a hue. No colour is a faction's: every colour keeps MIN_ACCENT_DISTANCE
// from the faction accents. The results are four seals that differ in shape as well as colour; "Not
// fulfilled" is a plain grey seal with a bar, never a red cross or anything that reads as a lie.
// Every word, name, number and room letter is page text over the pictures' anchors.

export const PROMISE_ART_VERSION = 'library-promises-0.1.0';

/** The palette: the dossier's ink and paper, its caption yellow, the console navy and steel, a plate grey, and two seal colours. */
export const P = Object.freeze({
  ink: '#151923', paper: '#F4EBDD', cream: '#E6D8C0', yellow: '#F7C52B', amber: '#F2A33A',
  navy: '#1B2747', steel: '#3A4A6B', shade: '#24314F', plate: '#8D97A8', stable: '#6FE3B0',
});

/** The kind icons and seals are square; the room letter on a door sits at DOOR_PLATE (icon pixels, page text). */
export const ICON = 64;
export const DOOR_PLATE = Object.freeze({ x: 23, y: 22, w: 18, h: 16 });
export const platePercent = () => {
  const pc = v => Number(((v / ICON) * 100).toFixed(3));
  return { left: pc(DOOR_PLATE.x), top: pc(DOOR_PLATE.y), width: pc(DOOR_PLATE.w), height: pc(DOOR_PLATE.h) };
};

const dots = (id, color, r = 0.8) => `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r="${r}" fill="${color}"/></pattern>`;

function asset(name, about, w, h, body, defs = '', stretch = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${PROMISE_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/promises/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${stretch ? ' preserveAspectRatio="none"' : ''}>${defs ? `<defs>${defs}</defs>` : ''}<g id="${name}">${body}</g></svg>\n`;
}
const shadow = (d, dx = 2.5, dy = 3) => `<path d="${d}" transform="translate(${dx} ${dy})" fill="${P.ink}" opacity="0.4"/>`;

// ---------- the card's header band ----------

/** The header band behind a card's kind icon and title: navy, a halftone corner, a caption-yellow rule. */
export function bandSvg() {
  const body = `<rect x="0" y="0" width="320" height="56" fill="${P.navy}"/>`
    + `<rect x="196" y="0" width="124" height="56" fill="url(#pr-band-dots)"/>`
    + `<path d="M0 50 H320 V56 H0 Z" fill="${P.yellow}"/>`
    + `<path d="M0 49 H320" stroke="${P.ink}" stroke-width="2"/>`;
  return asset('pr-band', 'A card\'s header band (navy, halftone, a yellow rule); stretched to the band\'s box (it grows with the reader\'s text), the icon and title over it.', 320, 56, body, dots('pr-band-dots', P.steel, 1.1), true);
}

// ---------- the six kinds ----------

/** A ballot slip: a tilted paper rectangle with three ink rules (the box for a name). */
const slip = (x, y, w, h, angle) => `<g transform="rotate(${angle} ${x + w / 2} ${y + h / 2})">${shadow(`M${x} ${y} h${w} v${h} h-${w} Z`, 2, 2)}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${P.paper}" stroke="${P.ink}" stroke-width="2.5"/>`
  + `<path d="M${x + 5} ${y + h - 9} h${w - 10} M${x + 5} ${y + h - 5} h${w - 16}" stroke="${P.plate}" stroke-width="1.6"/></g>`;
const star = (cx, cy, r, fill) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`; });
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>`;
};
/** A barred window: the Jail's sign on the board, square, three bars. */
const bars = (x, y, s) => `${shadow(`M${x} ${y} h${s} v${s} h-${s} Z`)}<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="3" fill="${P.shade}" stroke="${P.ink}" stroke-width="3"/>`
  + [1, 2, 3].map(i => `<path d="M${(x + (s * i) / 4).toFixed(2)} ${y + 3} V${y + s - 3}" stroke="${P.plate}" stroke-width="3.2" stroke-linecap="round"/>`).join('')
  + `<path d="M${x + 3} ${y + s * 0.42} H${x + s - 3}" stroke="${P.steel}" stroke-width="2.4"/>`;
/** Two heads at a threshold: a meeting (no faces, no characters). */
const heads = (y) => `<circle cx="21" cy="${y}" r="5.5" fill="${P.cream}" stroke="${P.ink}" stroke-width="2.2"/><circle cx="43" cy="${y}" r="5.5" fill="${P.cream}" stroke="${P.ink}" stroke-width="2.2"/>`
  + `<path d="M13 ${y + 13} q8 -9 16 0 M35 ${y + 13} q8 -9 16 0" stroke="${P.ink}" stroke-width="2.2" fill="${P.cream}"/>`;

const KIND_ART = {
  CAPTAIN_SUPPORT: () => slip(14, 10, 34, 44, -8) + star(31, 28, 13, P.yellow),
  OFFICER_SELECTION: () => {
    const d = 'M32 7 L53 14 V31 C53 45 43 53 32 58 C21 53 11 45 11 31 V14 Z';
    return `${shadow(d)}<path d="${d}" fill="${P.steel}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M20 28 L32 36 L44 28 M20 39 L32 47 L44 39" stroke="${P.yellow}" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="M32 13 L47 18 V24" stroke="${P.plate}" stroke-width="1.8" fill="none" opacity="0.8"/>`;
  },
  JAIL_VOTE: () => bars(10, 20, 36) + slip(36, 4, 20, 26, 14) + `<path d="M46 34 v12 m-5 -5 l5 5 l5 -5" stroke="${P.yellow}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  NO_JAIL_VOTE: () => bars(14, 18, 36) + slip(42, 30, 16, 22, 8)
    + `<circle cx="32" cy="36" r="16" fill="none" stroke="${P.paper}" stroke-width="7"/><circle cx="32" cy="36" r="16" fill="none" stroke="${P.ink}" stroke-width="3.4"/><path d="M20.7 47.3 L43.3 24.7" stroke="${P.ink}" stroke-width="3.4" stroke-linecap="round"/>`,
  MEET_A: () => {
    const d = 'M14 58 V24 C14 12 22 6 32 6 C42 6 50 12 50 24 V58 Z';
    return `${shadow(d)}<path d="${d}" fill="${P.steel}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`
      + `<rect x="${DOOR_PLATE.x}" y="${DOOR_PLATE.y}" width="${DOOR_PLATE.w}" height="${DOOR_PLATE.h}" rx="2.5" fill="${P.paper}" stroke="${P.ink}" stroke-width="2"/>` + heads(46);
  },
  MEET_B: () => {
    const d = 'M12 58 V8 H52 V58 Z';
    return `${shadow(d)}<path d="${d}" fill="${P.steel}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`
      + `<path d="M12 17 H52" stroke="${P.ink}" stroke-width="2.4"/><rect x="18" y="10.5" width="28" height="4.5" fill="${P.shade}"/>`
      + `<rect x="${DOOR_PLATE.x}" y="${DOOR_PLATE.y}" width="${DOOR_PLATE.w}" height="${DOOR_PLATE.h}" rx="1" fill="${P.paper}" stroke="${P.ink}" stroke-width="2"/>` + heads(46);
  },
};
export const KIND_FILES = Object.freeze({
  CAPTAIN_SUPPORT: 'pr-kind-captain-support', OFFICER_SELECTION: 'pr-kind-officer-selection', JAIL_VOTE: 'pr-kind-jail-vote',
  NO_JAIL_VOTE: 'pr-kind-no-jail-vote', MEET_A: 'pr-kind-meet-a', MEET_B: 'pr-kind-meet-b',
});
const KIND_ABOUT = {
  CAPTAIN_SUPPORT: 'Captain Support: a ballot slip with a captain\'s star.',
  OFFICER_SELECTION: 'Officer Selection: the public office\'s shield with two chevrons (never a secret role\'s mark).',
  JAIL_VOTE: 'Jail Vote: the barred window with a ballot going in.',
  NO_JAIL_VOTE: 'No Jail Vote: the barred window refused (a ring and bar), the ballot held outside.',
  MEET_A: 'Meet in A: an arched door, two heads at its threshold; the room letter is page text on its plate.',
  MEET_B: 'Meet in B: a square door with a transom, two heads at its threshold; the room letter is page text on its plate.',
};
export function kindSvg(kind) {
  const draw = KIND_ART[kind];
  if (!draw) throw new Error(`No Promise kind ${kind}`);
  return asset(KIND_FILES[kind], `${KIND_ABOUT[kind]} Pair-private; drawn on the card's band and the chooser tile.`, ICON, ICON, draw());
}

// ---------- the four results ----------

export const SEAL_FILES = Object.freeze({
  Pending: 'pr-seal-pending', Fulfilled: 'pr-seal-fulfilled', 'Not fulfilled': 'pr-seal-not-fulfilled', 'Condition not met': 'pr-seal-condition-not-met',
});
const SEAL_ART = {
  Pending: () => `<circle cx="32" cy="34" r="25" fill="${P.ink}" opacity="0.35"/><circle cx="32" cy="32" r="25" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/><circle cx="32" cy="32" r="19.5" fill="none" stroke="${P.amber}" stroke-width="5"/>`
    + `<path d="M24 20 H40 L32 32 L40 44 H24 L32 32 Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="M27.5 42 H36.5 L32 37 Z" fill="${P.amber}"/>`,
  Fulfilled: () => `<circle cx="32" cy="34" r="25" fill="${P.ink}" opacity="0.35"/><circle cx="32" cy="32" r="25" fill="${P.stable}" stroke="${P.ink}" stroke-width="3"/><circle cx="32" cy="32" r="19.5" fill="none" stroke="${P.paper}" stroke-width="1.6" opacity="0.8"/>`
    + `<path d="M21 33 L29 41 L44 23" stroke="${P.ink}" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  'Not fulfilled': () => `<circle cx="32" cy="34" r="25" fill="${P.ink}" opacity="0.35"/><circle cx="32" cy="32" r="25" fill="${P.plate}" stroke="${P.ink}" stroke-width="3"/><circle cx="32" cy="32" r="19.5" fill="none" stroke="${P.paper}" stroke-width="1.6" opacity="0.7"/>`
    + `<path d="M20 32 H44" stroke="${P.ink}" stroke-width="5.5" stroke-linecap="round"/>`,
  'Condition not met': () => `<circle cx="32" cy="32" r="25" fill="${P.paper}"/><circle cx="32" cy="32" r="25" fill="none" stroke="${P.ink}" stroke-width="3" stroke-dasharray="6 5"/>`
    + `<circle cx="22" cy="32" r="3" fill="${P.plate}"/><circle cx="32" cy="32" r="3" fill="${P.plate}"/><circle cx="42" cy="32" r="3" fill="${P.plate}"/>`,
};
const SEAL_ABOUT = {
  Pending: 'Pending: an open amber ring and an hourglass.',
  Fulfilled: 'Fulfilled: a green seal with a check.',
  'Not fulfilled': 'Not fulfilled: a plain grey seal with a bar (never a cross; it is not proof of a lie).',
  'Condition not met': 'Condition not met: a dashed, empty ring (the opportunity did not happen).',
};
export function sealSvg(status) {
  const draw = SEAL_ART[status];
  if (!draw) throw new Error(`No Promise status ${status}`);
  return asset(SEAL_FILES[status], `${SEAL_ABOUT[status]} Pair-private; the words beside it carry the meaning too.`, ICON, ICON, draw());
}

// ---------- the offer in transit, and the tray mark ----------

/** The offer in transit: a sealed envelope (sending, waiting, arriving). */
export function envelopeSvg() {
  const d = 'M8 18 H56 V50 H8 Z';
  const body = `${shadow(d)}<path d="${d}" fill="${P.paper}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M8 50 L27 33 M56 50 L37 33" stroke="${P.plate}" stroke-width="2"/>`
    + `<path d="M8 18 L32 37 L56 18" fill="${P.cream}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`
    + `<circle cx="32" cy="36" r="5.5" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2"/>`;
  return asset('pr-envelope', 'The offer in transit: a sealed envelope (sending, waiting for an answer, arriving).', ICON, ICON, body);
}

/** The tray mark: a small card with its band and a seal. */
export function iconPromiseSvg() {
  const body = `<rect x="7" y="9" width="36" height="32" rx="4" fill="${P.ink}" opacity="0.4"/><rect x="5" y="7" width="36" height="32" rx="4" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>`
    + `<path d="M6.5 8.5 H39.5 V17 H6.5 Z" fill="${P.navy}"/><path d="M6.5 17 H39.5" stroke="${P.yellow}" stroke-width="2"/>`
    + `<path d="M11 24 H31 M11 29 H25" stroke="${P.plate}" stroke-width="2"/>`
    + `<circle cx="35" cy="34" r="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="2.4"/><circle cx="35" cy="34" r="5" fill="none" stroke="${P.amber}" stroke-width="2.6"/>`;
  return asset('pr-icon-promise', 'The tray mark for Promises: a small card with its band and a seal.', 48, 48, body);
}

/** Every picture of group 4, by name. */
export function promiseAssets() {
  const out = {
    'pr-band': { svg: bandSvg(), size: '320x56', role: 'pair-private: the card\'s header band', about: 'A card\'s header band, stretched to the card\'s width; the icon and the title go over it.' },
    'pr-envelope': { svg: envelopeSvg(), size: '64x64', role: 'pair-private: the offer in transit', about: 'The offer in transit: sending, waiting for an answer, and arriving.' },
    'pr-icon-promise': { svg: iconPromiseSvg(), size: '48x48', role: 'pair-private: tray mark', about: 'The tray mark for Promises, beside the ledger\'s entry.' },
  };
  for (const [kind, file] of Object.entries(KIND_FILES)) out[file] = { svg: kindSvg(kind), size: '64x64', role: `pair-private: kind ${kind}`, about: KIND_ABOUT[kind] };
  for (const [status, file] of Object.entries(SEAL_FILES)) out[file] = { svg: sealSvg(status), size: '64x64', role: `pair-private: result ${status}`, about: SEAL_ABOUT[status] };
  return out;
}
