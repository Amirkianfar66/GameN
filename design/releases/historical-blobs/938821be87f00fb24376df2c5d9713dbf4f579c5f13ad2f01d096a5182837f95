//
// The shared ATTACK BLOCKED art (storyboard S4 of the Designer's review of the owner's motion
// specification of 13 October 2026; docs/design/attack-blocked.md): the shield that blooms round
// a character whose attack was blocked, the ring that absorbs the attack and the particles it
// throws off. The brief asks for one treatment whichever defense stopped the attack, the Alien's
// Clone or the Undercover's Protection: the same colors, timing, particles, energy wave, reaction
// and words. So nothing here takes a cause, a role, a grantor, a count or a direction. Pure
// functions that return SVG text or numbers, for Node and the browser alike.

import { INK, PAPER } from './scene-kit.mjs';

export const BLOCKED_VERSION = 'board-v2-blocked-0.1.0';

/**
 * The shield's colors: a white-hot core, a pale cyan glow and rim, a deeper cyan for its
 * halftone. Kept well away from the three faction accents (shieldColorDistances()), so that no
 * block reads as one side's.
 */
export const SHIELD = Object.freeze({ core: '#FFFFFF', glow: '#E8FBFF', rim: '#A6E6F0', deep: '#3EA6BC' });

/**
 * The faction accents of the design tokens, color.factionPrivateOrRevealed of tokens-0.4.0 (the
 * check holds this copy to them): for measuring only, never drawn here.
 */
export const FACTION_ACCENTS = Object.freeze({ blue: '#70AFFF', red: '#FF8C8C', alien: '#C4A4FF' });

/** The least CIE76 distance a shield color keeps from every faction accent. */
export const MIN_ACCENT_DISTANCE = 30;

// ---------- color distance (CIE76 in L*a*b*, as the design tokens measure theirs) ----------

const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function lab(hex) {
  const [r, g, b] = channels(hex).map(linear);
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / 1,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ].map(v => (v > 216 / 24389 ? Math.cbrt(v) : (841 / 108) * v + 4 / 29));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}
/** CIE76 distance between two #RRGGBB colors. */
export const cie76 = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

/** Each shield color's distance to the nearest faction accent, rounded, with the accent's name. */
export function shieldColorDistances() {
  return Object.fromEntries(Object.entries(SHIELD).map(([name, hex]) => {
    const [faction, distance] = Object.entries(FACTION_ACCENTS).map(([id, accent]) => [id, cie76(hex, accent)]).sort((a, b) => a[1] - b[1])[0];
    return [name, { nearest: faction, distance: Math.round(distance) }];
  }));
}

// ---------- the art ----------

const f = n => Number(n.toFixed(2));
/** A pointy-topped hexagon of radius r round (cx, cy), as polygon points. */
const hexagon = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
  const a = ((60 * i - 90) * Math.PI) / 180;
  return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
}).join(' ');

/** The shield's box: 200 x 200, centred on the press point (the chest); drawn at SHIELD_SIZE times the press side. */
export const SHIELD_BOX = 200;
export const SHIELD_SIZE = 2.1;
/** The outer hexagon's radius in the box. */
export const SHIELD_RADIUS = 84;
/** The radius, in the box, of the flash's white-hot core: the only part bright enough to count as a flash. */
export const SHIELD_FLASH_RADIUS = 32;

/**
 * The shield, frame 1 (it flashes on: a white-hot core in a pale hexagon), 2 (the bubble: a
 * translucent hexagon with an inner rim, halftone shading and a highlight) or 3 (it is spent: the
 * outline breaking up). Symmetric: it points at no one. 200 x 200.
 */
export function shieldSvg(frame) {
  const c = SHIELD_BOX / 2;
  const R = SHIELD_RADIUS;
  const defs = `<defs>
    <radialGradient id="shield-fill" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${SHIELD.core}" stop-opacity="0.95"/><stop offset="0.55" stop-color="${SHIELD.glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${SHIELD.rim}" stop-opacity="0.35"/></radialGradient>
    <radialGradient id="shield-core" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${SHIELD.core}"/><stop offset="0.6" stop-color="${SHIELD.core}"/><stop offset="1" stop-color="${SHIELD.glow}" stop-opacity="0"/></radialGradient>
    <pattern id="shield-dots" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4" cy="4" r="1.6" fill="${SHIELD.deep}"/></pattern>
    <clipPath id="shield-clip"><polygon points="${hexagon(c, c, R - 3)}"/></clipPath>
  </defs>`;
  let body;
  if (frame === 1) {
    body = `<polygon points="${hexagon(c, c, R)}" fill="${SHIELD.glow}" fill-opacity="0.7" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
      + `<polygon points="${hexagon(c, c, R - 12)}" fill="none" stroke="${SHIELD.rim}" stroke-width="4" stroke-linejoin="round"/>`
      // The white-hot core: solid to 0.6 of its radius, then fading into the glow.
      + `<circle cx="${c}" cy="${c}" r="${SHIELD_FLASH_RADIUS}" fill="url(#shield-core)"/>`;
  } else if (frame === 2) {
    body = `<polygon points="${hexagon(c, c, R)}" fill="url(#shield-fill)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
      // Halftone shading in the lower right, comic style, inside the bubble.
      + `<g clip-path="url(#shield-clip)"><path d="M${c + 10} ${c + R} L${c + R} ${c - 10} L${c + R} ${c + R} Z" fill="url(#shield-dots)" opacity="0.55"/></g>`
      + `<polygon points="${hexagon(c, c, R - 12)}" fill="none" stroke="${SHIELD.rim}" stroke-width="3.5" stroke-linejoin="round"/>`
      // A highlight on the upper left facet.
      + `<path d="M${f(c - R * 0.62)} ${f(c - R * 0.18)} L${f(c - R * 0.2)} ${f(c - R * 0.66)}" stroke="${SHIELD.core}" stroke-width="6" stroke-linecap="round"/>`;
  } else if (frame === 3) {
    // Spent: six outline segments with gaps, and a glint at each corner.
    const corners = hexagon(c, c, R).split(' ').map(p => p.split(',').map(Number));
    body = corners.map(([x, y], i) => {
      const [nx, ny] = corners[(i + 1) % 6];
      const a = [x + (nx - x) * 0.18, y + (ny - y) * 0.18];
      const b = [x + (nx - x) * 0.82, y + (ny - y) * 0.82];
      return `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
        + `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${SHIELD.rim}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<circle cx="${f(x)}" cy="${f(y)}" r="3.2" fill="${SHIELD.core}" stroke="${INK}" stroke-width="1.6"/>`;
    }).join('');
  } else {
    throw new Error(`No shield frame ${frame}`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHIELD_BOX} ${SHIELD_BOX}" width="${SHIELD_BOX}" height="${SHIELD_BOX}">${defs}<g data-layer="fx-shield-${frame}">${body}</g></svg>`;
}

/** The energy ring that absorbs the attack: 200 x 200, centred like the shield; the film scales and fades it. */
export function blockRingSvg() {
  const c = SHIELD_BOX / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHIELD_BOX} ${SHIELD_BOX}" width="${SHIELD_BOX}" height="${SHIELD_BOX}"><g data-layer="fx-block-ring">`
    + `<circle cx="${c}" cy="${c}" r="80" fill="none" stroke="${INK}" stroke-width="9"/>`
    + `<circle cx="${c}" cy="${c}" r="80" fill="none" stroke="${SHIELD.rim}" stroke-width="4.5"/>`
    + `<circle cx="${c}" cy="${c}" r="68" fill="none" stroke="${SHIELD.glow}" stroke-width="2" stroke-dasharray="6 7"/>`
    + '</g></svg>';
}

/** The particles' distance from the centre and size, by frame: eight, symmetric, scattering outward. */
export const PARTICLE_FRAMES = Object.freeze([Object.freeze({ radius: 58, size: 9 }), Object.freeze({ radius: 74, size: 7 }), Object.freeze({ radius: 90, size: 5 })]);

/** Eight particles scattering from the shield, frame 1, 2 or 3: diamonds at every 45 degrees. 200 x 200. */
export function blockParticlesSvg(frame) {
  const look = PARTICLE_FRAMES[frame - 1];
  if (!look) throw new Error(`No particle frame ${frame}`);
  const c = SHIELD_BOX / 2;
  const diamonds = Array.from({ length: 8 }, (_, i) => {
    const a = ((45 * i - 90) * Math.PI) / 180;
    const [x, y] = [c + look.radius * Math.cos(a), c + look.radius * Math.sin(a)];
    const s = look.size;
    return `<polygon points="${f(x)},${f(y - s)} ${f(x + s * 0.6)},${f(y)} ${f(x)},${f(y + s)} ${f(x - s * 0.6)},${f(y)}" fill="${i % 2 ? SHIELD.rim : PAPER}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" transform="rotate(${45 * i} ${f(x)} ${f(y)})"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHIELD_BOX} ${SHIELD_BOX}" width="${SHIELD_BOX}" height="${SHIELD_BOX}"><g data-layer="fx-block-particles-${frame}">${diamonds}</g></svg>`;
}
