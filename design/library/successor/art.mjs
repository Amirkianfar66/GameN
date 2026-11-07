// mothership:dev-only
//
// Library group 8: the successor sweep's new pictures.
//   sw-device-engineer  the ninth Blue role's held device, in the reviewed role devices' exact family
//                       (design/exports/roles: the same sleeve, cuff, fist and grip, the same
//                       private-blue palette), holding library group 1's signal clamp, its wave and
//                       LED glowing in the Blue roles' private glow. PRIVATE: only on the Engineer's
//                       own card and sheet.
//   sw-crate            the Round 3 Supply's receipt: a sealed crate. PRIVATE to each recipient.
//   sw-code-plate       the lobby's room-code plate: six sunken slots for the code (page text).
// No picture holds a word, a name or a number.

export const SUCCESSOR_ART_VERSION = 'library-successor-0.1.0';

/** The reviewed role devices' palette (design/exports/roles/device-*.held.svg), and the dossier's neutrals for the rest. */
export const DEVICE = Object.freeze({ ink: '#151923', paper: '#F4EBDD', sleeve: '#C6CDD4', glow: '#70AFFF', steelDark: '#34415A', steel: '#55657E', steelLight: '#8696AE', steelPale: '#B9C4D3', core: '#222B3A' });
export const NEUTRAL = Object.freeze({ ink: '#151923', paper: '#F4EBDD', cream: '#E6D8C0', steel: '#3A4A6B', navy: '#1B2747', plate: '#8D97A8', yellow: '#F7C52B', night: '#0D1422' });

function asset(name, about, w, h, body, defs = '', stretch = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${SUCCESSOR_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/successor/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${stretch ? ' preserveAspectRatio="none"' : ''}>${defs ? `<defs>${defs}</defs>` : ''}<g id="${name}">${body}</g></svg>\n`;
}

// ---------- the Engineer's held device ----------

const D = DEVICE;
/** The reviewed devices' arm and fist, unchanged in shape (from device-cracker.held), under this device's ids. */
const arm = id => `<g id="${id}-arm"><polygon points="64,103 92,97 126,150 80,150" fill="${D.sleeve}" stroke="${D.ink}" stroke-width="3" stroke-linejoin="round"/>`
  + `<polygon points="84,118 98,107 126,150 100,150" fill="url(#${id}-dots)" opacity="0.6"/>`
  + `<polygon points="64.5,104 92,98 96.5,105.5 69,112" fill="${D.glow}" stroke="${D.ink}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
const fist = id => `<g id="${id}-fist"><path d="M55 84 Q55 75 64 75 H81 Q90 75 90 85 V98 Q90 107 81 107 H64 Q55 107 55 98 Z" fill="${D.sleeve}" stroke="${D.ink}" stroke-width="3" stroke-linejoin="round"/>`
  + `<path d="M78 76 H82 Q90 76 90 85 V98 Q90 107 82 107 H76 Q82 92 78 76 Z" fill="url(#${id}-dots)" opacity="0.55"/>`
  + `<path d="M59 84.5 H78 M59 91.5 H78 M59 98.5 H78" fill="none" stroke="${D.ink}" stroke-width="1.9" stroke-linecap="round"/>`
  + `<rect x="52" y="69" width="26" height="11" rx="5.5" fill="${D.sleeve}" stroke="${D.ink}" stroke-width="2.8" transform="rotate(-10 65 74.5)"/></g>`;
/** The head: library group 1's signal clamp (open jaws on a dial, a cable), on a grip post into the fist. */
const head = id => `<g id="${id}-head"><rect x="66" y="56" width="12" height="24" rx="4" fill="${D.steelDark}" stroke="${D.ink}" stroke-width="3"/>`
  + `<circle cx="72" cy="38" r="24" fill="${D.steelPale}" stroke="${D.ink}" stroke-width="3"/><circle cx="72" cy="38" r="17" fill="${D.core}" stroke="${D.ink}" stroke-width="2"/>`
  + `<path d="M56 22 Q72 12 88 22 L84 31 Q72 25 60 31 Z" fill="${D.steel}" stroke="${D.ink}" stroke-width="2.4" stroke-linejoin="round"/>`
  + `<path d="M56 54 Q72 64 88 54 L84 45 Q72 51 60 45 Z" fill="${D.steel}" stroke="${D.ink}" stroke-width="2.4" stroke-linejoin="round"/>`
  + `<path d="M95 20 Q104 13 107 5" fill="none" stroke="${D.ink}" stroke-width="3" stroke-linecap="round"/></g>`;
const glow = id => `<g id="${id}-glow"><path d="M56 38 q4 -7 8 0 t8 0 t8 0 t8 0" fill="none" stroke="${D.glow}" stroke-width="2.8" stroke-linecap="round"/>`
  + `<circle cx="91" cy="56" r="4.5" fill="${D.glow}" stroke="${D.ink}" stroke-width="2"/><path d="M89.5 54.5 L90.5 55.5" stroke="${D.paper}" stroke-width="1.4" stroke-linecap="round"/></g>`;

export function engineerDeviceSvg() {
  const id = 'sw-device-engineer';
  const defs = `<pattern id="${id}-dots" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2" cy="2" r="0.85" fill="${D.ink}"/></pattern>`;
  return asset(id, 'The Engineer\'s held device, in the reviewed role devices\' family: the same sleeve, cuff and fist, holding library group 1\'s signal clamp, its wave and LED in the Blue roles\' private glow. Over the lower right of the character\'s card, grip at (78, 104). PRIVATE: the Engineer\'s own card and sheet.', 120, 140,
    `<g data-layer="${id}-all">${arm(id)}${head(id)}${glow(id)}${fist(id)}</g>`, defs);
}

// ---------- the Supply's crate, the lobby's code plate ----------

/** A sealed crate with straps and a yellow seal tag: one ordinary weapon delivered (never what kind, never from whom). */
export function crateSvg() {
  const N = NEUTRAL;
  const body = `<rect x="9" y="19" width="48" height="36" rx="3" fill="${N.ink}" opacity="0.4"/><rect x="7" y="16" width="48" height="36" rx="3" fill="${N.cream}" stroke="${N.ink}" stroke-width="2.6"/>`
    + `<path d="M7 26 H55 M7 42 H55" stroke="${N.ink}" stroke-width="1.6" opacity="0.5"/><path d="M19 16 V52 M43 16 V52" stroke="${N.steel}" stroke-width="5"/><path d="M19 16 V52 M43 16 V52" stroke="${N.ink}" stroke-width="1.2" opacity="0.5"/>`
    + `<path d="M7 16 L13 9 H61 L55 16 Z" fill="${N.paper}" stroke="${N.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="M55 16 L61 9 V45 L55 52 Z" fill="${N.plate}" stroke="${N.ink}" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<rect x="25" y="28" width="12" height="10" rx="2" fill="${N.yellow}" stroke="${N.ink}" stroke-width="2"/><circle cx="31" cy="33" r="1.8" fill="${N.ink}"/>`;
  return asset('sw-crate', 'The Round 3 Supply\'s receipt: a sealed, strapped crate with a yellow seal tag. PRIVATE to each recipient; never drawn on the board.', 64, 64, body);
}
/** The room code's plate: six sunken slots for the six characters (page text). */
export function codePlateSvg() {
  const N = NEUTRAL;
  const slots = Array.from({ length: 6 }, (_, i) => `<rect x="${12 + i * 37}" y="12" width="31" height="40" rx="5" fill="${N.night}" stroke="${N.ink}" stroke-width="2"/>`).join('');
  return asset('sw-code-plate', 'The lobby\'s room-code plate: six sunken slots; the code\'s characters are page text over them.', 248, 64, `<rect x="2" y="3" width="244" height="58" rx="10" fill="${N.navy}" stroke="${N.ink}" stroke-width="3"/>${slots}`, '', true);
}

/** Every picture of group 8, by name. */
export function successorAssets() {
  return {
    'sw-device-engineer': { svg: engineerDeviceSvg(), size: '120x140', role: 'private: the Engineer\'s held device (role card and sheet)', about: 'The Engineer\'s held device in the reviewed role devices\' family, holding the signal clamp.' },
    'sw-crate': { svg: crateSvg(), size: '64x64', role: 'private: the Supply\'s receipt (each recipient)', about: 'The Round 3 Supply\'s receipt on a recipient\'s own phone: a sealed crate.' },
    'sw-code-plate': { svg: codePlateSvg(), size: '248x64', role: 'lobby: the room code\'s plate', about: 'The lobby\'s room-code plate; the code is page text over its six slots.' },
  };
}
