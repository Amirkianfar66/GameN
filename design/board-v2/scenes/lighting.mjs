// mothership:dev-only
//
// The Blackout's lighting art (storyboard S1 of the Designer's review of the owner's motion
// specification of 13 October 2026; docs/design/blackout-window.md): how a room looks with its
// lights out, where its ceiling lights are, the sparks a light throws when the power fails, the
// impact on a hit position and the position markers. Pure functions that return SVG text or
// numbers, for Node and the browser alike.
//
// Nothing here takes a role, a side, a request, a selection, a phase or an audience. The one
// input that varies a picture is the lighting window's public id, which picks the light that
// sparks in each room, so that every phone and the display draw the same window the same way.

import { INK, PAPER } from '../../board-motion/scenes/kit.mjs';

export const LIGHTING_VERSION = 'board-v2-lighting-0.1.0';

/** The electric yellow of the ability art's sparks (design/abilities, dossier-spark). */
export const SPARK = '#F7C52B';
/** A spark's and a flash's white-hot core. */
export const CORE = '#FFF8E4';

/**
 * Each room's ceiling lights, in its scene's units: the lower edge of each light panel the room
 * draws at the top of its back wall, where its cone of light starts (the scenes' lightCone()).
 * The Jail's is its caged lamp over the door; the Hospital's are the approved sick bay's, which
 * the ward keeps.
 */
export const FIXTURES = Object.freeze({
  'command-room': Object.freeze([[300, 58], [512, 58], [724, 58]]),
  'room-a': Object.freeze([[381, 58], [639, 58]]),
  'room-b': Object.freeze([[381, 58], [639, 58]]),
  hospital: Object.freeze([[380, 58], [646, 58]]),
  jail: Object.freeze([[512, 96]]),
});

/** FNV-1a, 32 bits: a stable number from a string. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * The light each room's sparks come from: its right-hand one. A board panel shows the middle of
 * its scene with the room's caption over its upper left, so the right-hand light is the one clear
 * of the caption on every phone; where it is above the panel's top, the sparks hang from the top
 * edge (the board's to clamp).
 */
export const SPARK_LIGHT = Object.freeze(Object.fromEntries(Object.entries(FIXTURES).map(([room, fixtures]) => [room, fixtures.length - 1])));

/**
 * How each room's light sparks for a lighting window: where along the light, which way the sparks
 * fall and their tilt, from the window's public id alone. The same window draws the same sparks
 * everywhere; nothing about a request can change them.
 */
export function sparkPlan(windowId) {
  if (typeof windowId !== 'string' || !windowId) throw new Error('sparkPlan needs the window\'s public id');
  return Object.fromEntries(Object.entries(FIXTURES).map(([room, fixtures]) => {
    const h = hash(`${windowId}|${room}`);
    const [x, y] = fixtures[SPARK_LIGHT[room]];
    return [room, Object.freeze({ fixture: SPARK_LIGHT[room], at: Object.freeze([x + ((h >>> 4) % 49) - 24, y]), mirror: Boolean((h >>> 8) & 1), tilt: ((h >>> 9) % 21) - 10 })];
  }));
}

// ---------- the room with its lights out ----------

const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const toHex = rgb => `#${rgb.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const linear = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
/** Relative luminance (WCAG) of a #RRGGBB color. */
export const luminance = hex => { const [r, g, b] = channels(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** The dark the rooms go to: a fill's color runs from LOW (ink) to HIGH (paper), with a trace of its room's hue. */
export const NIGHT = Object.freeze({ low: '#0C1018', high: '#1F2737', hue: 0.07, line: '#4B5A77', space: 0.42 });

/**
 * A fill's color with the lights out: almost ink, a little lighter where the room was light, and
 * a trace of the room's hue (its color's difference from gray, so the trace adds no light).
 */
export function nightFill(hex) {
  const shade = mix(channels(NIGHT.low), channels(NIGHT.high), Math.sqrt(luminance(hex)));
  const color = channels(hex);
  const gray = (color[0] + color[1] + color[2]) / 3;
  return toHex(shade.map((v, i) => v + (color[i] - gray) * NIGHT.hue));
}

/** A line's color with the lights out: every line of the room's drawing, faint steel, so the room still reads as a room. */
export const nightLine = () => NIGHT.line;

/** The view through a window with the lights out: space stays, dimmed, the brightest thing in the room. */
export const nightSpace = hex => toHex(mix(channels(NIGHT.low), channels(hex), NIGHT.space));

/**
 * A room's drawing with its lights out: every fill and stroke color of the SVG mapped by the
 * night rule, the groups named in `space` (the view through its windows) by the gentler one.
 * `spans` are [start, end) offsets of those groups in the markup.
 */
export function nightMarkup(svg, spans = []) {
  const recolor = (text, fill, stroke) => text
    .replace(/(fill|stop-color)="(#[0-9A-Fa-f]{6})"/g, (_, name, hex) => `${name}="${fill(hex)}"`)
    .replace(/stroke="(#[0-9A-Fa-f]{6})"/g, (_, hex) => `stroke="${stroke(hex)}"`);
  let out = '';
  let at = 0;
  for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
    out += recolor(svg.slice(at, start), nightFill, nightLine) + recolor(svg.slice(start, end), nightSpace, nightSpace);
    at = end;
  }
  return out + recolor(svg.slice(at), nightFill, nightLine);
}

// ---------- sparks, impact, markers ----------

const f = n => Number(n.toFixed(2));
/** A jagged bolt from (x, y) along `angle` degrees (0 is right, 90 down) for `length`, as an inked yellow line. */
function bolt(x, y, angle, length, { width = 2.4, kinks = 3 } = {}) {
  const a = (angle * Math.PI) / 180;
  const [dx, dy, nx, ny] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
  const points = [[x, y]];
  for (let i = 1; i <= kinks; i += 1) {
    const along = (length * i) / (kinks + 0.4);
    const off = (i % 2 ? 1 : -1) * length * 0.16;
    points.push([x + dx * along + nx * off, y + dy * along + ny * off]);
  }
  points.push([x + dx * length, y + dy * length]);
  const d = `M${points.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L')}`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(width + 2.6)}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${SPARK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
/** A star of `points` points round (cx, cy), as polygon points. */
const star = (cx, cy, points, outer, inner, turn = 0) => Array.from({ length: points * 2 }, (_, i) => {
  const angle = ((i * 180) / points + turn - 90) * (Math.PI / 180);
  const r = i % 2 ? inner : outer;
  return `${f(cx + r * Math.cos(angle))},${f(cy + r * Math.sin(angle))}`;
}).join(' ');

const ember = (x, y, r = 2.6) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${SPARK}" stroke="${INK}" stroke-width="1.6"/>`;
const streak = (x, y, length) => `<path d="M${f(x)} ${f(y - length)} L${f(x)} ${f(y - 3)}" stroke="${SPARK}" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`;

/** The spark sprite's box: 120 x 120, the light's lower edge at SPARK_ORIGIN. */
export const SPARK_BOX = 120;
export const SPARK_ORIGIN = Object.freeze([60, 18]);

/**
 * A light's sparks when the power fails, frame 1 (it shorts), 2 (it bursts) or 3 (the sparks
 * fall). Small, from the light itself, falling: never toward anyone. 120 x 120, the light's
 * lower edge at SPARK_ORIGIN.
 */
export function sparkSvg(frame) {
  const [x, y] = SPARK_ORIGIN;
  let body;
  if (frame === 1) {
    // It shorts: a white-hot star at the light and three bolts.
    body = [128, 90, 52].map((angle, i) => bolt(x, y + 4, angle, [30, 36, 30][i], { width: 3.4, kinks: 2 })).join('')
      + `<polygon points="${star(x, y + 4, 6, 17, 7.5, 0)}" fill="${CORE}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  } else if (frame === 2) {
    // It bursts: longer bolts, the first embers flying out.
    body = [150, 118, 90, 62, 30].map((angle, i) => bolt(x, y + 3, angle, [34, 48, 54, 48, 34][i], { width: 3.2, kinks: 2 })).join('')
      + [[30, 62], [44, 84], [76, 84], [90, 62], [60, 98]].map(([ex, ey]) => ember(ex, ey, 3)).join('')
      + `<polygon points="${star(x, y + 3, 6, 12, 5.5, 30)}" fill="${CORE}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  } else if (frame === 3) {
    body = `<ellipse cx="${x}" cy="${y + 6}" rx="15" ry="7" fill="#55657E" opacity="0.55"/>`
      + [[30, 84, 10], [44, 100, 12], [62, 106, 14], [80, 94, 12], [94, 80, 10], [22, 66, 8]].map(([ex, ey, length]) => streak(ex, ey, length) + ember(ex, ey, 2.2)).join('');
  } else {
    throw new Error(`No spark frame ${frame}`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPARK_BOX} ${SPARK_BOX}" width="${SPARK_BOX}" height="${SPARK_BOX}"><g data-layer="fx-spark-${frame}">${body}</g></svg>`;
}

/** A still bolt, 24 x 24: the reduced-motion sign of the power failure in each room's caption, in place of the flicker and sparks. */
export function boltIconSvg() {
  const d = 'M14.5 2 L5.5 13.2 L11.2 13.2 L8.8 22 L18.5 9.8 L12.6 9.8 Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g data-layer="fx-bolt"><path d="${d}" fill="${SPARK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g></svg>`;
}

/** The impact sprite's box: 160 x 160, centred on the hit position's press point. */
export const IMPACT_BOX = 160;
/** The flash's radius in the impact's box: the only part bright enough to count as a flash. */
export const IMPACT_FLASH_RADIUS = 30;

/**
 * An authorized hit, centred on the position's press point, frame 1 (the flash), 2 (the comic
 * star) or 3 (its rays breaking). Symmetric: no muzzle, beam, trail or direction, so nothing in
 * it points at anyone. 160 x 160.
 */
export function impactSvg(frame) {
  const c = IMPACT_BOX / 2;
  let body;
  if (frame === 1) {
    body = `<circle cx="${c}" cy="${c}" r="${IMPACT_FLASH_RADIUS}" fill="${CORE}" stroke="${INK}" stroke-width="3"/>`
      + `<circle cx="${c}" cy="${c}" r="17" fill="#FFFFFF"/>`
      + `<polygon points="${star(c, c, 8, 40, 30, 22.5)}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  } else if (frame === 2) {
    body = `<polygon points="${star(c, c, 12, 72, 40)}" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
      + `<polygon points="${star(c, c, 12, 48, 26, 15)}" fill="${SPARK}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
      + `<circle cx="${c}" cy="${c}" r="13" fill="${CORE}" stroke="${INK}" stroke-width="2.4"/>`;
  } else if (frame === 3) {
    body = Array.from({ length: 12 }, (_, i) => {
      const a = ((i * 30) - 90) * (Math.PI / 180);
      const tip = [c + 76 * Math.cos(a), c + 76 * Math.sin(a)];
      const left = [c + 54 * Math.cos(a - 0.11), c + 54 * Math.sin(a - 0.11)];
      const right = [c + 54 * Math.cos(a + 0.11), c + 54 * Math.sin(a + 0.11)];
      return `<polygon points="${[left, tip, right].map(([px, py]) => `${f(px)},${f(py)}`).join(' ')}" fill="${PAPER}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
    }).join('') + Array.from({ length: 6 }, (_, i) => {
      const a = ((i * 60) - 60) * (Math.PI / 180);
      return `<circle cx="${f(c + 40 * Math.cos(a))}" cy="${f(c + 40 * Math.sin(a))}" r="3.2" fill="${SPARK}" stroke="${INK}" stroke-width="1.6"/>`;
    }).join('');
  } else {
    throw new Error(`No impact frame ${frame}`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IMPACT_BOX} ${IMPACT_BOX}" width="${IMPACT_BOX}" height="${IMPACT_BOX}"><g data-layer="fx-impact-${frame}">${body}</g></svg>`;
}

/** A marker's colors in each state; its numeral is text, drawn over the disc. */
export const MARKER_STATES = Object.freeze({
  // Lights on: the ink disc and paper ring of the board's tokens, readable over any room.
  preview: Object.freeze({ disc: INK, ring: PAPER, outer: INK, numeral: PAPER, dash: null }),
  // Lights out: a dark disc and a faint steel ring, the numeral the brightest thing on the board.
  dark: Object.freeze({ disc: NIGHT.low, ring: '#8C9BB4', outer: '#33405A', numeral: '#DCE3EE', dash: null }),
  // The eligible Disabler's own choice, on their phone only: a gold ring.
  chosen: Object.freeze({ disc: NIGHT.low, ring: SPARK, outer: SPARK, numeral: '#F7D886', dash: '3 3' }),
});

/** A position marker's disc in a state (preview, dark or chosen): 44 x 44, drawn at 22 px, its numeral the page's text. */
export function markerSvg(state) {
  const look = MARKER_STATES[state];
  if (!look) throw new Error(`No marker state ${state}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44"><g data-layer="marker-${state}">`
    + `<circle cx="22" cy="22" r="20.4" fill="none" stroke="${look.outer}" stroke-width="2.6"${look.dash ? ` stroke-dasharray="${look.dash}"` : ''}/>`
    + `<circle cx="22" cy="22" r="16.8" fill="${look.disc}" stroke="${look.ring}" stroke-width="3.4"/>`
    + '</g></svg>';
}
