// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/fx/captain.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The Captain's art (storyboards S6, S7 and S8 of the Designer's review of the owner's motion
// specification of 13 October 2026; docs/design/captain-films.md): the console plates the Captain
// presses, the command pulse that runs down the board's gutters to the Jail, the Jail's blast door
// opening for a RELEASE, and for an EJECT the emergency light, the airlock hatch, the suction, the
// exterior view and the memorial treatment of the characters it takes off the board.
//
// The approved rooms are unchanged. The Jail's door, lamp and keypad are drawn again over the room,
// element for element as the board's Jail scene draws them (design/board-motion/assets/scenes/
// jail.back.svg, printed in the Jail's colors), so that at rest the overlay is the room itself; a film
// then moves them. The airlock hatch is drawn only while an EJECT plays: the approved Jail has none.
// Pure geometry says where the console inset and the command pulse go (consoleBox(), conduitPoints()),
// keeping every caption and press area clear.
//
// Nothing here reads a role, a side, a faction or a cause: the console is the Captain's office, the
// command's consequence is public (CAPTAIN_OUTCOME), and a character taken off the board is drawn in
// the same grey whatever side it was on. Nothing graphic: no injury is drawn, ever.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude Code),
// in the comic vocabulary of the board: ink outlines, halftone, a limited palette. Nothing is written
// in the art; the words a screen shows (RELEASE, EJECT, USED, EJECTED, a count) are the page's own text.
// Pure functions that return SVG text or numbers, for Node and the browser alike.

import { INK, PAPER } from './scene-kit.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from './blocked-fx.mjs';
import { LABEL_MARGIN } from './label-box.mjs';

export const CAPTAIN_VERSION = 'board-v2-captain-0.1.0';

/**
 * The Captain's palette: RELEASE's green and EJECT's red, each with its light and its dull
 * (unavailable) shade; the hazard amber and caption yellow; the console's navy and steel; space,
 * the hull, the safety cover's clear plastic, the glove, and the memorial grey. Every color keeps
 * MIN_ACCENT_DISTANCE (CIE76) from the faction accents (captainColorDistances()), so that neither
 * command, nor anyone it takes off the board, reads as one side's.
 */
export const CAPTAIN = Object.freeze({
  green: '#36C46E', greenLight: '#A6F0C2', greenDeep: '#1F8A4C', greenDull: '#4E6B5C',
  red: '#D3271F', redGlow: '#FF5A3C', redDeep: '#A3170F', redDull: '#6E4744',
  amber: '#F2A33A', yellow: '#F7C52B', cyan: '#5FE0E8',
  navy: '#1B2747', steel: '#3A4A6B', slate: '#2A3346', dark: '#0F1730', used: '#5B6577',
  space: '#06080F', hull: '#4A5568', hullLight: '#8A97AB', cover: '#CFE6F5', glove: '#E3D6C2',
  memorial: '#9AA3B2', memorialLight: '#D5DAE2', memorialDark: '#5B6577',
});

/** Each Captain color's distance to the nearest faction accent, rounded, with the accent's name. */
export function captainColorDistances() {
  return Object.fromEntries(Object.entries(CAPTAIN).map(([name, hex]) => {
    const [faction, distance] = Object.entries(FACTION_ACCENTS).map(([id, accent]) => [id, cie76(hex, accent)]).sort((a, b) => a[1] - b[1])[0];
    return [name, { nearest: faction, distance: Math.round(distance) }];
  }));
}
export { MIN_ACCENT_DISTANCE };

const f = n => Number(n.toFixed(2));
const svg = (w, h, layer, body, defs = '', viewBox = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}<g data-layer="${layer}">${body}</g></svg>`;
const dotsPattern = (id, color, r = 1.4) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="${r}" fill="${color}"/></pattern>`;
const meets = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

// ---------- S8: the command plates, the safety cover, the glove ----------

/** The two commands and the states a plate is drawn in (S8; Frontend chooses the state from the Captain's own offers). */
export const COMMANDS = Object.freeze(['release', 'eject']);
export const PLATE_STATES = Object.freeze(['available', 'unavailable', 'pressed', 'used']);

/**
 * A plate's box, its button's centre and radius, and the label strip where the page writes the
 * command's word. 200 x 64; the S8 control and the console inset draw the same plate.
 */
export const PLATE = Object.freeze({ w: 200, h: 64, button: Object.freeze([34, 32]), r: 20, press: 3, label: Object.freeze({ x: 66, y: 14, w: 122, h: 36 }) });

const COMMAND_COLOR = Object.freeze({
  release: Object.freeze({ lit: CAPTAIN.green, light: CAPTAIN.greenLight, deep: CAPTAIN.greenDeep, dull: CAPTAIN.greenDull }),
  eject: Object.freeze({ lit: CAPTAIN.red, light: CAPTAIN.redGlow, deep: CAPTAIN.redDeep, dull: CAPTAIN.redDull }),
});

/** A command's icon at the button's centre: RELEASE an open padlock, EJECT the eject sign (a triangle over a bar). Never a weapon. */
function commandIcon(kind, color, [cx, cy]) {
  const dx = cx - 34, dy = cy - 32;
  const at = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(Number(x) + dx)} ${f(Number(y) + dy)}`);
  if (kind === 'release') {
    const shackle = at('M29 31 V25 A6 6 0 0 1 41 25 V27');
    return `<path d="${shackle}" fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round"/>`
      + `<path d="${shackle}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round"/>`
      + `<rect x="${f(25 + dx)}" y="${f(30 + dy)}" width="18" height="14" rx="3" fill="${color}" stroke="${INK}" stroke-width="2.5"/>`
      + `<circle cx="${f(34 + dx)}" cy="${f(36 + dy)}" r="1.9" fill="${INK}"/><path d="${at('M34 37 V40')}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  return `<path d="${at('M34 19 L45 32 H23 Z')}" fill="${color}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
    + `<rect x="${f(23 + dx)}" y="${f(36 + dy)}" width="22" height="6" rx="1.5" fill="${color}" stroke="${INK}" stroke-width="2.5"/>`;
}

/**
 * A command's plate in a state (S8), 200 x 64: a navy plate with its round button and a dark label
 * strip for the page's word. Without color the states differ by their outline and shape:
 *   available    a solid lit rim; the button lit, with a highlight
 *   unavailable  a dashed rim; the plate and the button dull, the icon dim
 *   pressed      the button 3 units down under an inner shadow, its rim brightest (Activated)
 *   used         no rim; the button dark (the page writes USED across the plate)
 */
export function plateSvg(kind, state) {
  if (!COMMANDS.includes(kind)) throw new Error(`No command ${kind}`);
  if (!PLATE_STATES.includes(state)) throw new Error(`No plate state ${state}`);
  const c = COMMAND_COLOR[kind];
  const { w, h, r, label: L } = PLATE;
  const lit = state === 'available' || state === 'pressed';
  const dy = state === 'pressed' ? PLATE.press : 0;
  const [bx, by] = [PLATE.button[0], PLATE.button[1] + dy];
  const id = `plate-${kind}-${state}`;
  const defs = dotsPattern(`${id}-dots`, INK, 1.3);
  const body = `<rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" rx="13" fill="${lit ? CAPTAIN.navy : CAPTAIN.slate}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M150 5 H190 Q195 5 195 10 V54 Q195 59 190 59 H128 Z" fill="url(#${id}-dots)" opacity="0.3"/>`;
  const rim = state === 'used' ? ''
    : state === 'unavailable' ? `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="9" fill="none" stroke="${CAPTAIN.hullLight}" stroke-width="2" stroke-dasharray="7 5"/>`
      : `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="9" fill="none" stroke="${c.light}" stroke-width="${state === 'pressed' ? 3 : 2}" opacity="${state === 'pressed' ? 1 : 0.8}"/>`;
  const fill = lit ? c.lit : state === 'used' ? CAPTAIN.used : c.dull;
  const icon = lit ? PAPER : state === 'used' ? CAPTAIN.hullLight : '#B9C4D3';
  const button = `<circle cx="${PLATE.button[0]}" cy="${PLATE.button[1]}" r="${r + 5}" fill="${CAPTAIN.steel}" stroke="${INK}" stroke-width="3"/>`
    + (dy ? `<circle cx="${PLATE.button[0]}" cy="${PLATE.button[1]}" r="${r + 1}" fill="${INK}" opacity="0.55"/>` : '')
    + `<circle cx="${bx}" cy="${by}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="3.5"/>`
    + (state === 'available' ? `<path d="M${bx - 13} ${by - 4} A14 14 0 0 1 ${bx + 5} ${by - 13}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>` : '')
    + (state === 'pressed' ? `<path d="M${bx - 18} ${by - 3} A18 18 0 0 1 ${bx + 18} ${by - 3} A20 13 0 0 0 ${bx - 18} ${by - 3} Z" fill="${INK}" opacity="0.4"/>` : '')
    + commandIcon(kind, icon, [bx, by]);
  const strip = `<rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="7" fill="${CAPTAIN.dark}" stroke="${INK}" stroke-width="2.5"/>`;
  return svg(w, h, `fx-plate-${kind}-${state}`, body + rim + button + strip, defs);
}

/**
 * The safety cover over EJECT's button: clear plastic on a hinge, with a hazard band on its free
 * edge. 72 x 100, drawn with its (2, 34) on the plate's (0, 0), so that its hinge is the plate's
 * line y = 6 and the button is under it. Frames: closed (over the button), lifting (raised toward us,
 * foreshortened) and open (standing up behind its hinge, the button free).
 */
export const COVER = Object.freeze({ w: 72, h: 100, at: Object.freeze([-2, -34]), frames: Object.freeze(['closed', 'lifting', 'open']) });

export function coverSvg(frame) {
  if (!COVER.frames.includes(frame)) throw new Error(`No cover frame ${frame}`);
  const lid = { closed: 'M7 40 H65 V85 Q65 92 58 92 H14 Q7 92 7 85 Z', lifting: 'M7 40 H65 L70 64 H2 Z', open: 'M7 40 H65 L61 12 H11 Z' }[frame];
  const band = { closed: [82, 92], lifting: [57, 64], open: [12, 19] }[frame];
  const shine = { closed: 'M15 45 H28 L18 86 H11 Z', lifting: 'M14 44 H26 L20 61 H8 Z', open: 'M17 38 H28 L27 16 H19 Z' }[frame];
  const id = `cover-${frame}`;
  const stripes = Array.from({ length: 10 }, (_, i) => `<path d="M${-6 + i * 9} ${band[1]} L${f(-6 + i * 9 + 9)} ${band[0]} H${f(-6 + i * 9 + 13.5)} L${f(-6 + i * 9 + 4.5)} ${band[1]} Z" fill="${INK}"/>`).join('');
  const defs = `<clipPath id="${id}-lid"><path d="${lid}"/></clipPath>`;
  const body = `<path d="${lid}" fill="${CAPTAIN.cover}" fill-opacity="0.3"/>`
    + `<g clip-path="url(#${id}-lid)"><rect x="0" y="${band[0]}" width="72" height="${band[1] - band[0]}" fill="${CAPTAIN.amber}"/>${stripes}<path d="${shine}" fill="#FFFFFF" opacity="0.5"/></g>`
    + `<path d="${lid}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<rect x="13" y="35" width="13" height="9" rx="2.5" fill="${CAPTAIN.steel}" stroke="${INK}" stroke-width="2"/><rect x="46" y="35" width="13" height="9" rx="2.5" fill="${CAPTAIN.steel}" stroke="${INK}" stroke-width="2"/>`;
  return svg(COVER.w, COVER.h, `fx-cover-${frame}`, body, defs);
}

/** The Captain's gloved hand, its index finger out: 56 x 72, its fingertip at `tip`. The same glove whoever is Captain. */
export const GLOVE = Object.freeze({ w: 56, h: 72, tip: Object.freeze([17, 4]) });

export function gloveSvg() {
  const g = CAPTAIN.glove;
  const fingers = `<path d="M23 30 Q24 24 30 24 Q35 24 35 30 V36" fill="${g}" stroke="${INK}" stroke-width="3"/>`
    + `<path d="M34 31 Q35 26 40 26 Q45 27 45 32 V39" fill="${g}" stroke="${INK}" stroke-width="3"/>`;
  const index = `<path d="M11 36 V11 Q11 4 17 4 Q23 4 23 11 V34" fill="${g}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  const palm = `<path d="M10 34 Q9 30 13 29 H44 Q49 30 48 37 L47 52 Q46 58 40 58 H17 Q10 58 9 50 Z" fill="${g}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M10 40 Q3 39 3 45 Q4 51 12 52" fill="${g}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M33 36 Q38 37 43 36 M24 36 Q28 37 32 36" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>`;
  const cuff = `<rect x="13" y="54" width="34" height="17" rx="3" fill="${CAPTAIN.navy}" stroke="${INK}" stroke-width="3"/><path d="M15 61 H45" stroke="${CAPTAIN.yellow}" stroke-width="3"/>`;
  return svg(GLOVE.w, GLOVE.h, 'fx-glove', cuff + palm + fingers + index);
}

/** EJECT's press, a hard click: a red comic burst round the button, no lettering. 80 x 80, centred on the button. */
export function clickSvg() {
  const points = Array.from({ length: 20 }, (_, i) => {
    const a = (i * Math.PI) / 10 - Math.PI / 2;
    const r = i % 2 ? 26 : 38;
    return `${f(40 + r * Math.cos(a))},${f(40 + r * Math.sin(a))}`;
  }).join(' ');
  return svg(80, 80, 'fx-click', `<polygon points="${points}" fill="${CAPTAIN.redGlow}" fill-opacity="0.22" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><polygon points="${points}" fill="none" stroke="${CAPTAIN.redGlow}" stroke-width="2.8" stroke-linejoin="round"/>`);
}

/** RELEASE's press: a green ring round the button that the film grows and fades. 80 x 80, centred on the button. */
export function ringSvg() {
  return svg(80, 80, 'fx-ring', `<circle cx="40" cy="40" r="33" fill="none" stroke="${CAPTAIN.green}" stroke-width="8" opacity="0.35"/><circle cx="40" cy="40" r="30" fill="none" stroke="${CAPTAIN.greenLight}" stroke-width="4"/>`);
}

// ---------- the console inset ----------

/**
 * The console inset: a close-up of the plate on the chart table, in a comic panel of its own, while
 * a film plays. 224 x 96, the plate at `plate` (its cover, open, reaching up to the inset's top).
 */
export const CONSOLE = Object.freeze({ w: 224, h: 96, plate: Object.freeze([12, 26]), minWidth: 96 });

/** The inset's frame: a navy panel with a steel bezel and four screws, the plate's bed. */
export function consoleSvg() {
  const { w, h } = CONSOLE;
  const defs = dotsPattern('console-dots', INK, 1.3);
  const body = `<rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" rx="10" fill="${CAPTAIN.steel}" stroke="${INK}" stroke-width="5"/>`
    + `<rect x="8" y="20" width="${w - 16}" height="${h - 28}" rx="8" fill="${CAPTAIN.slate}" stroke="${INK}" stroke-width="2.5"/>`
    + `<path d="M${w - 40} 5 H${w - 8} Q${w - 5} 5 ${w - 5} 9 V${h - 9} Q${w - 5} ${h - 5} ${w - 9} ${h - 5} H${w - 70} Z" fill="url(#console-dots)" opacity="0.3"/>`
    + [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${CAPTAIN.hullLight}" stroke="${INK}" stroke-width="1.8"/>`).join('')
    + `<path d="M24 11 H${w - 24}" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`;
  return svg(w, h, 'fx-console', body, defs);
}

/** A box ({ left, top, width, height }) grown by m on every side. */
const grow = (box, m) => ({ left: box.left - m, top: box.top - m, width: box.width + 2 * m, height: box.height + 2 * m });

/**
 * Where the console inset goes, in board pixels: in the top band, right of the Captain's place (its
 * press area and its name tag), below the band's caption line (no caption is lower), whole inside
 * the band, and off every box in keepClear (any target there: the capsule's seated participants'
 * own, which an ordinary turn never has). As large as fits, CONSOLE's size at most, centred in the
 * room it has; null where it would be narrower than CONSOLE.minWidth (the film then shows the
 * Captain's gesture alone).
 *   band       the top band's inside: { left, top, width, height } (the Command Room's panel, and the
 *              capsule's beside it where the board has one)
 *   cap        the band's caption line, from its top (the Command Room's caption band)
 *   captain    C1's press area { left, top, width, height } and tag (its name tag's band), in board px
 * Returns { left, top, width, height, scale } or null.
 */
export function consoleBox({ band, cap, captain, tag, keepClear = [] }) {
  const m = LABEL_MARGIN;
  const left = Math.max(captain.left + captain.width, tag ? tag.left + tag.width : -Infinity) + 2 * m;
  const top = band.top + cap + m;
  const right = band.left + band.width - m;
  const bottom = band.top + band.height - m;
  if (right - left <= 0 || bottom - top <= 0) return null;
  const scale = Math.min(1, (right - left) / CONSOLE.w, (bottom - top) / CONSOLE.h);
  const width = CONSOLE.w * scale, height = CONSOLE.h * scale;
  if (width < CONSOLE.minWidth) return null;
  const box = { left: f(left + (right - left - width) / 2), top: f(top + (bottom - top - height) / 2), width: f(width), height: f(height), scale: f(scale) };
  if (keepClear.some(other => meets(box, grow(other, m)))) return null;
  return box;
}

// ---------- the command pulse ----------

/**
 * The command pulse's way, in board pixels: from the console inset's foot (or the Captain's press
 * point where there is no inset) down to the gutter under the top band, along it to the board's
 * spine, down the spine to the gutter above the Jail, along it to the Jail's door and down into the
 * Jail to its door lamp. It runs in the board's gutters, between the panels, everywhere but its last
 * few pixels; it crosses no caption and no press area.
 *   boxes      fitBoardV2()'s room boxes ({ left, top, width, height } each, its border included)
 *   border     the panels' border (fitBoardV2().shell.border)
 *   jail       the Jail's scene frame in its panel ({ k, tx, ty }, frameScene())
 *   start      [x, y]: the console inset's foot, or the Captain's press point
 * Returns the polyline's points.
 */
export function conduitPoints({ boxes, border, jail, start }) {
  const top = boxes['command-room'];
  const a = boxes['room-a'], b = boxes['room-b'], j = boxes.jail;
  const under = top.top + top.height + (a.top - top.top - top.height) / 2;
  const spine = (a.left + a.width + b.left) / 2;
  const above = b.top + b.height + (j.top - b.top - b.height) / 2;
  const door = j.left + border + jail.tx + JAIL_DOOR.c[0] * jail.k;
  const lamp = j.top + border + jail.ty + JAIL_DOOR.lamp[1] * jail.k;
  return [start, [start[0], under], [spine, under], [spine, above], [door, above], [door, lamp]].map(([x, y]) => [f(x), f(y)]);
}

/** The length of a polyline and, at a share v of it (0 to 1), the point there and the polyline up to it. */
export function conduitAt(points, v) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((s, l) => s + l, 0);
  let left = Math.max(0, Math.min(1, v)) * total;
  const drawn = [points[0]];
  for (let i = 0; i < lengths.length; i += 1) {
    const [p, q] = [points[i], points[i + 1]];
    if (left >= lengths[i]) { drawn.push(q); left -= lengths[i]; continue; }
    const u = lengths[i] ? left / lengths[i] : 0;
    drawn.push([f(p[0] + (q[0] - p[0]) * u), f(p[1] + (q[1] - p[1]) * u)]);
    break;
  }
  return { total: f(total), head: drawn[drawn.length - 1], drawn };
}

/** The part of a polyline between the shares a and b of its length (0 <= a <= b <= 1): the pulse's tail. */
export function conduitSegment(points, a, b) {
  // Up to a: the vertices before a's segment, then a's point on it; up to b likewise, b's segment no earlier.
  const toA = conduitAt(points, a).drawn;
  const toB = conduitAt(points, Math.max(a, b)).drawn;
  return [toA[toA.length - 1], ...toB.slice(toA.length - 1)];
}

/** The pulse's head: a bright dot in its glow, in the command's color. 24 x 24, centred. */
export function pulseHeadSvg(kind) {
  const c = COMMAND_COLOR[kind];
  const defs = `<radialGradient id="head-${kind}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.35" stop-color="${c.light}"/><stop offset="1" stop-color="${c.lit}" stop-opacity="0"/></radialGradient>`;
  return svg(24, 24, `fx-pulse-head-${kind}`, `<circle cx="12" cy="12" r="11.5" fill="url(#head-${kind})"/><circle cx="12" cy="12" r="3.5" fill="#FFFFFF" stroke="${INK}" stroke-width="1"/>`, defs);
}

// ---------- the Jail's blast door, its lamp and its keypad ----------

/**
 * The Jail's door, lamp and keypad in the Jail's scene units (design/source/board/board-jail.svg,
 * lifted unchanged into design/board-motion/assets/scenes/jail.back.svg): the doorway's outline,
 * its centre line where its two leaves meet (each leaf slides `leaf` units into the wall), the lamp
 * over it and the keypad's screen. box: the overlay's box (x, y, w, h), door, lamp and keypad.
 */
export const JAIL_DOOR = Object.freeze({
  box: Object.freeze([340, 60, 480, 330]),
  doorway: 'M398 372 V136 L422 112 H602 L626 136 V372 Z',
  c: Object.freeze([512, 372]), leaf: 114, sill: 372,
  lamp: Object.freeze([512, 91]), wheel: Object.freeze([512, 252]),
  screen: Object.freeze({ x: 754, y: 196, w: 42, h: 22 }),
});

/**
 * The door's elements as the board's Jail draws them, in the Jail's colors (the export recipe's
 * board-jail map), copied element for element; only the two definitions they use are renamed, with
 * the overlay's prefix. The check holds every one of these to the scene file.
 */
export const JAIL_DOOR_ELEMENTS = Object.freeze({
  surface: '<path d="M398 372 V136 L422 112 H602 L626 136 V372 Z" fill="#E85C44"/>',
  band: [
    '<rect x="398" y="196" width="228" height="112" fill="#F4EBDD"/>',
    '<g fill="#151923"><polygon points="398,196 432,196 320,308 286,308"/><polygon points="466,196 500,196 388,308 354,308"/><polygon points="534,196 568,196 456,308 422,308"/><polygon points="602,196 636,196 524,308 490,308"/><polygon points="670,196 704,196 592,308 558,308"/><polygon points="738,196 772,196 660,308 626,308"/></g>',
    '<path d="M398 196 H626 M398 308 H626" fill="none" stroke="#151923" stroke-width="5"/>',
    '<path d="M560 112 H626 V372 H586 Z" fill="url(#halftone-ink-s-jail)"/>',
    '<path d="M398 136 L422 112 H470 L398 208 Z" fill="#F6A78F" opacity="0.6"/>',
  ],
  outline: '<path d="M398 372 V136 L422 112 H602 L626 136 V372 Z" fill="none" stroke="#151923" stroke-width="6" stroke-linejoin="round"/>',
  seam: '<path d="M512 112 V372" fill="none" stroke="#151923" stroke-width="4"/>',
  window: '<rect x="466" y="140" width="92" height="26" rx="5" fill="#10141C" stroke="#151923" stroke-width="4"/>',
  windowLine: '<path d="M478 153 H546" fill="none" stroke="#E85C44" stroke-width="3" stroke-linecap="round"/>',
  lock: '<rect x="484" y="226" width="56" height="52" rx="8" fill="#7E1B19" stroke="#151923" stroke-width="5"/>',
  wheel: '<circle cx="512" cy="252" r="13" fill="#F6A78F" stroke="#151923" stroke-width="4"/><path d="M512 242 V262 M502 252 H522" fill="none" stroke="#151923" stroke-width="3.5"/>',
  rivets: '<g fill="#7E1B19" stroke="#151923" stroke-width="2.5"><circle cx="414" cy="176" r="5"/><circle cx="610" cy="176" r="5"/><circle cx="414" cy="330" r="5"/><circle cx="610" cy="330" r="5"/><circle cx="414" cy="352" r="5"/><circle cx="610" cy="352" r="5"/></g>',
  lamp: '<path id="jail-lamp" d="M492 82 H532 V88 Q532 100 512 100 Q492 100 492 88 Z" fill="#F4EBDD" stroke="#151923" stroke-width="4" stroke-linejoin="round"/>',
  screen: '<rect x="754" y="196" width="42" height="22" rx="3" fill="#10141C" stroke="#151923" stroke-width="2.5"/><path d="M760 207 H778" fill="none" stroke="#F4EBDD" stroke-width="3" stroke-linecap="round"/>',
  halftone: '<pattern id="halftone-ink-s-jail" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">',
});

/** The signals a lamp or the keypad's screen shows: the room's own (normal), RELEASE's green, EJECT's red, the lockdown's amber. */
export const SIGNALS = Object.freeze(['normal', 'green', 'red', 'amber']);
const SIGNAL = Object.freeze({ green: [CAPTAIN.green, CAPTAIN.greenLight, CAPTAIN.greenDeep], red: [CAPTAIN.red, CAPTAIN.redGlow, CAPTAIN.redDeep], amber: [CAPTAIN.amber, '#FFD08A', '#9A5A12'] });

/** The corridor seen through the open doorway: the ship outside the cell, in the board's neutral steel. */
function corridor() {
  return '<rect x="398" y="112" width="228" height="260" fill="#10141C"/>'
    + '<path d="M398 112 L464 170 V300 L398 372 Z" fill="#34415A"/><path d="M626 112 L560 170 V300 L626 372 Z" fill="#222B3A"/>'
    + '<path d="M398 112 H626 L560 170 H464 Z" fill="#222B3A"/>'
    + '<path d="M398 372 L464 300 H560 L626 372 Z" fill="#55657E"/>'
    + '<rect x="464" y="170" width="96" height="130" fill="#34415A" stroke="#151923" stroke-width="3"/>'
    + '<rect x="488" y="176" width="48" height="8" rx="3" fill="#F4EBDD"/><ellipse cx="512" cy="300" rx="44" ry="7" fill="#F4EBDD" opacity="0.25"/>'
    + '<path d="M420 360 L476 304 M604 360 L548 304" stroke="#8696AE" stroke-width="3" stroke-linecap="round" opacity="0.7"/>';
}

/**
 * The door overlay at a moment, in the Jail's scene units (viewBox JAIL_DOOR.box): the doorway with
 * the corridor behind it, the two leaves slid open by `open` (0 shut to 1 open, into the wall), the
 * lock's wheel turned by `wheel` degrees, the lamp and the keypad's screen showing their signals.
 * At rest (open 0, wheel 0, both normal) it draws exactly what the room draws there. prefix keeps
 * its definitions' ids its own on a page with several.
 */
export function jailDoorSvg({ open = 0, wheel = 0, lamp = 'normal', keypad = 'normal', prefix = 'jd' } = {}) {
  if (!SIGNALS.includes(lamp) || !SIGNALS.includes(keypad)) throw new Error(`No signal ${lamp}/${keypad}`);
  const E = JAIL_DOOR_ELEMENTS;
  const [x, y, w, h] = JAIL_DOOR.box;
  const rename = text => text.replaceAll('halftone-ink-s-jail', `${prefix}-ht`).replaceAll('clip-jail-door', `${prefix}-door`);
  const defs = `<pattern id="${prefix}-ht" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="1.5" fill="#151923"/></pattern>`
    + `<clipPath id="${prefix}-door"><path d="${JAIL_DOOR.doorway}"/></clipPath>`
    + `<clipPath id="${prefix}-l"><rect x="380" y="100" width="132" height="280"/></clipPath><clipPath id="${prefix}-r"><rect x="512" y="100" width="132" height="280"/></clipPath>`;
  const turned = wheel ? E.wheel.replace('<path d="M512 242 V262 M502 252 H522"', `<path transform="rotate(${f(wheel)} 512 252)" d="M512 242 V262 M502 252 H522"`) : E.wheel;
  // A leaf: the door's whole surface and fittings, cut to its half and slid by dx.
  const leaf = (side, dx) => `<g clip-path="url(#${prefix}-door)"><g transform="translate(${f(dx)} 0)"><g clip-path="url(#${prefix}-${side})">`
    + E.surface + `<g clip-path="url(#${prefix}-door)">${E.band.map(rename).join('')}</g>`
    + E.seam + E.window + E.windowLine + E.lock + turned + E.rivets + '</g></g></g>';
  const slide = Math.max(0, Math.min(1, open)) * JAIL_DOOR.leaf;
  const door = slide > 0
    ? `<g clip-path="url(#${prefix}-door)">${corridor()}</g>${leaf('l', -slide)}${leaf('r', slide)}${E.outline}`
    // Shut: the room's own drawing, in its own order.
    : E.surface + `<g clip-path="url(#${prefix}-door)">${E.band.map(rename).join('')}</g>` + E.outline + E.seam + E.window + E.windowLine + E.lock + turned + E.rivets;
  const lit = (signal, at, r) => (signal === 'normal' ? '' : `<circle cx="${at[0]}" cy="${at[1]}" r="${r}" fill="url(#${prefix}-glow-${signal})"/>`);
  const glows = [...new Set([lamp, keypad].filter(s => s !== 'normal'))].map(s => `<radialGradient id="${prefix}-glow-${s}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${SIGNAL[s][1]}" stop-opacity="0.75"/><stop offset="1" stop-color="${SIGNAL[s][0]}" stop-opacity="0"/></radialGradient>`).join('');
  const lampMarkup = lamp === 'normal' ? E.lamp.replace(' id="jail-lamp"', '') : E.lamp.replace(' id="jail-lamp"', '').replace('fill="#F4EBDD"', `fill="${SIGNAL[lamp][0]}"`) + `<path d="M500 86 H512" stroke="${SIGNAL[lamp][1]}" stroke-width="3" stroke-linecap="round"/>`;
  const S = JAIL_DOOR.screen;
  const screen = keypad === 'normal' ? E.screen
    : `<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" rx="3" fill="${SIGNAL[keypad][2]}" stroke="#151923" stroke-width="2.5"/>`
      + (keypad === 'amber'
        ? `<path d="M${S.x + 4} ${S.y + 18} L${S.x + 14} ${S.y + 4} M${S.x + 16} ${S.y + 18} L${S.x + 26} ${S.y + 4} M${S.x + 28} ${S.y + 18} L${S.x + 38} ${S.y + 4}" stroke="${SIGNAL.red[0]}" stroke-width="4" stroke-linecap="round"/>`
        : `<path d="M760 207 H790" fill="none" stroke="${SIGNAL[keypad][1]}" stroke-width="3.5" stroke-linecap="round"/>`);
  return svg(w, h, 'fx-jail-door', lit(lamp, JAIL_DOOR.lamp, 30) + lit(keypad, [775, 207], 34) + door + lampMarkup + screen, defs + glows, `${x} ${y} ${w} ${h}`);
}

// ---------- EJECT: the airlock, the suction, the debris, the emergency light, the exterior ----------

/**
 * The airlock hatch, in the Jail's scene units: a round hatch in the back wall left of the blast
 * door, drawn only while an EJECT plays (the approved Jail has none). c its centre, r its hazard
 * ring's radius (its steel rim reaches r + 6), opening the radius of its opening, box the overlay's
 * box (x, y, w, h), its glow included. Placed where every phone's Jail panel shows its rim whole (from
 * x 217 on at 320 px wide), below the caption's band, clear of the pillar at x 332.
 */
export const AIRLOCK = Object.freeze({ c: Object.freeze([276, 226]), r: 50, opening: 39, box: Object.freeze([200, 150, 152, 152]), clamps: Object.freeze([45, 135, 225, 315]) });

/** A few stars, fixed: [x, y, r] in a 100-unit square. */
const STARS = Object.freeze([[12, 18, 1.4], [30, 70, 1], [44, 30, 1.8], [58, 82, 1.2], [70, 14, 1], [82, 52, 1.5], [22, 46, 0.9], [64, 58, 0.8], [90, 86, 1.1], [8, 88, 1], [50, 8, 0.9], [36, 92, 1.3]]);
const sparkle = (x, y, r) => `<path d="M${f(x)} ${f(y - r)} L${f(x + r * 0.28)} ${f(y - r * 0.28)} L${f(x + r)} ${f(y)} L${f(x + r * 0.28)} ${f(y + r * 0.28)} L${f(x)} ${f(y + r)} L${f(x - r * 0.28)} ${f(y + r * 0.28)} L${f(x - r)} ${f(y)} L${f(x - r * 0.28)} ${f(y - r * 0.28)} Z" fill="${PAPER}"/>`;

/** Space in a box: ink-black with halftone and stars, two of them comic sparkles. */
function spaceField(x, y, w, h, id) {
  const stars = STARS.map(([sx, sy, r]) => `<circle cx="${f(x + (sx / 100) * w)}" cy="${f(y + (sy / 100) * h)}" r="${f(r * Math.max(1, w / 120))}" fill="${PAPER}"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${CAPTAIN.space}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" opacity="0.35"/>${stars}`
    + sparkle(x + w * 0.76, y + h * 0.3, Math.max(4, w * 0.05)) + sparkle(x + w * 0.2, y + h * 0.66, Math.max(3, w * 0.035));
}

/**
 * The hatch at a moment (viewBox AIRLOCK.box): its steel ring with a hazard band, its four clamps
 * slid out by `clamps` (0 engaged to 1 released), and its iris opened by `open` (0 shut to 1 open)
 * onto space; `glow` its emergency rim light (0 to 1). prefix keeps its ids its own.
 */
export function airlockSvg({ clamps = 0, open = 0, glow = 0, prefix = 'al' } = {}) {
  const [cx, cy] = AIRLOCK.c;
  const { r, opening: o } = AIRLOCK;
  const [x, y, w, h] = AIRLOCK.box;
  const hole = Math.max(0, Math.min(1, open)) * o;
  const defs = dotsPattern(`${prefix}-dots`, INK, 1.3) + dotsPattern(`${prefix}-stars`, '#3A4A6B', 1)
    + `<clipPath id="${prefix}-hole"><circle cx="${cx}" cy="${cy}" r="${o}"/></clipPath>`
    + `<radialGradient id="${prefix}-glow" cx="50%" cy="50%" r="50%"><stop offset="0.6" stop-color="${CAPTAIN.redGlow}" stop-opacity="0.7"/><stop offset="1" stop-color="${CAPTAIN.red}" stop-opacity="0"/></radialGradient>`;
  const rim = glow > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r + 22}" fill="url(#${prefix}-glow)" opacity="${f(glow)}"/>` : '';
  const stripes = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i * Math.PI) / 8, a1 = a0 + Math.PI / 16;
    const p = (a, rr) => `${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`;
    return `<path d="M${p(a0, r - 1)} A${r - 1} ${r - 1} 0 0 1 ${p(a1, r - 1)} L${p(a1 + 0.12, o + 5)} A${o + 5} ${o + 5} 0 0 0 ${p(a0 + 0.12, o + 5)} Z" fill="${INK}"/>`;
  }).join('');
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="${CAPTAIN.hull}" stroke="${INK}" stroke-width="5"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CAPTAIN.amber}" stroke="${INK}" stroke-width="3"/>${stripes}`
    + `<circle cx="${cx}" cy="${cy}" r="${o + 4}" fill="${CAPTAIN.hullLight}" stroke="${INK}" stroke-width="3"/>`;
  const inside = `<g clip-path="url(#${prefix}-hole)">${spaceField(cx - o, cy - o, 2 * o, 2 * o, `${prefix}-stars`)}`
    // The iris: six blades closing the opening down to the hole.
    + (hole < o ? `<path d="M${cx - o} ${cy} A${o} ${o} 0 1 0 ${cx + o} ${cy} A${o} ${o} 0 1 0 ${cx - o} ${cy} Z M${f(cx - hole)} ${cy} A${f(hole)} ${f(hole)} 0 1 1 ${f(cx + hole)} ${cy} A${f(hole)} ${f(hole)} 0 1 1 ${f(cx - hole)} ${cy} Z" fill="${CAPTAIN.hull}" fill-rule="evenodd"/>`
      // Each blade's edge: straight, from the hole's rim to the opening's, turning as the iris opens.
      + Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 + open * 0.6;
        const p = (rr, da = 0) => `${f(cx + rr * Math.cos(a + da))} ${f(cy + rr * Math.sin(a + da))}`;
        return `<path d="M${p(hole)} L${p(o, 1.15)}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
      }).join('')
      + `<path d="M${cx + o * 0.15} ${cy - o * 0.95} A${o} ${o} 0 0 1 ${cx + o * 0.95} ${cy - o * 0.2} L${cx + o * 0.5} ${cy} Z" fill="url(#${prefix}-dots)" opacity="0.35"/>` : '')
    + (hole === 0 ? `<circle cx="${cx}" cy="${cy}" r="9" fill="${CAPTAIN.hullLight}" stroke="${INK}" stroke-width="3"/>` : '')
    + '</g>'
    + `<circle cx="${cx}" cy="${cy}" r="${o}" fill="none" stroke="${INK}" stroke-width="3.5"/>`;
  const out = Math.max(0, Math.min(1, clamps)) * 9;
  const clampMarks = AIRLOCK.clamps.map(deg => {
    const a = (deg * Math.PI) / 180;
    const d = o + 2 + out;
    const [px, py] = [cx + d * Math.cos(a), cy + d * Math.sin(a)];
    return `<rect x="${f(px - 8)}" y="${f(py - 5)}" width="16" height="10" rx="2.5" transform="rotate(${deg + 90} ${f(px)} ${f(py)})" fill="${CAPTAIN.hullLight}" stroke="${INK}" stroke-width="2.5"/>`;
  }).join('');
  return svg(w, h, 'fx-airlock', rim + ring + inside + clampMarks, defs, `${x} ${y} ${w} ${h}`);
}

/**
 * The suction, frame 1 to 3: tapered paper streaks over the Jail, all converging on the hatch, longer
 * as the air rushes out. In the Jail's scene units (viewBox 0 0 1024 768). The streaks start at the
 * room's edges and never touch the hatch's ring.
 */
export function suctionSvg(frame) {
  if (![1, 2, 3].includes(frame)) throw new Error(`No suction frame ${frame}`);
  const [cx, cy] = AIRLOCK.c;
  const from = [[860, 640], [940, 470], [760, 720], [620, 700], [900, 300], [700, 520], [520, 610], [380, 690], [820, 200], [600, 420], [460, 470], [300, 600], [980, 600], [720, 330]];
  const shift = [0, 0.1, 0.2][frame - 1];
  const reach = [0.3, 0.48, 0.62][frame - 1];
  const streaks = from.map(([sx, sy], i) => {
    const s = (shift + (i % 3) * 0.06) % 0.3;
    const ax = sx + (cx - sx) * s, ay = sy + (cy - sy) * s;
    const bx = sx + (cx - sx) * Math.min(0.86, s + reach), by = sy + (cy - sy) * Math.min(0.86, s + reach);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * (2.5 + (i % 2)), ny = ((bx - ax) / len) * (2.5 + (i % 2));
    return `<path d="M${f(ax + nx)} ${f(ay + ny)} L${f(bx)} ${f(by)} L${f(ax - nx)} ${f(ay - ny)} Z"/>`;
  }).join('');
  return svg(1024, 768, `fx-suction-${frame}`, `<g fill="${PAPER}" opacity="0.85">${streaks}</g>`);
}

/** Loose things the air takes: a sheet of paper (its lines no words) and a cup. 24 x 24 each, centred. */
export const DEBRIS = Object.freeze(['paper', 'cup']);
export function debrisSvg(kind) {
  if (kind === 'paper') return svg(24, 24, 'fx-debris-paper', `<path d="M5 3 H16 L20 7 V21 H5 Z" fill="${PAPER}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M8 10 H17 M8 13.5 H17 M8 17 H14" stroke="#8696AE" stroke-width="1.5"/>`);
  if (kind === 'cup') return svg(24, 24, 'fx-debris-cup', `<path d="M5 6 H17 L15.5 20 Q15 21.5 13.5 21.5 H8.5 Q7 21.5 6.5 20 Z" fill="#F6A78F" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M17 9 Q21 9 21 12.5 Q21 16 16 16" fill="none" stroke="${INK}" stroke-width="2"/><ellipse cx="11" cy="6" rx="6" ry="1.6" fill="#7E1B19" stroke="${INK}" stroke-width="1.6"/>`);
  throw new Error(`No debris ${kind}`);
}

/**
 * The emergency light: a red wash over a room's art, darker at its edges, that the film pulses at
 * under 2 Hz between low opacities (EJECT_FILM.emergency). 100 x 100, stretched over the panel; never
 * over a caption, a tag or a press area.
 */
export function emergencySvg() {
  const defs = `<radialGradient id="emergency" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="${CAPTAIN.redGlow}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${CAPTAIN.red}" stop-opacity="0.8"/><stop offset="1" stop-color="${CAPTAIN.redDeep}"/></radialGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" preserveAspectRatio="none">${`<defs>${defs}</defs>`}<g data-layer="fx-emergency"><rect width="100" height="100" fill="url(#emergency)"/></g></svg>`;
}

/**
 * The exterior: the ship's hull from outside, the airlock open in it, its interior lit red, against
 * space. 400 x 400, drawn to cover the Jail's panel (sliced to its shape): the film draws the
 * characters it took drifting away from `hatch`, small, as silhouettes.
 */
export const EXTERIOR = Object.freeze({ w: 400, h: 400, hatch: Object.freeze([150, 240]), r: 46 });

export function exteriorSvg() {
  const { w, h, r } = EXTERIOR;
  const [hx, hy] = EXTERIOR.hatch;
  const defs = dotsPattern('ext-dots', INK, 1.5) + dotsPattern('ext-stars', '#3A4A6B', 1.2)
    + `<radialGradient id="ext-inside" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${CAPTAIN.redGlow}"/><stop offset="1" stop-color="${CAPTAIN.redDeep}"/></radialGradient>`
    + `<clipPath id="ext-hull"><path d="M-10 410 L-10 120 Q120 150 230 250 Q300 320 330 410 Z"/></clipPath>`;
  const hull = `<path d="M-10 410 L-10 120 Q120 150 230 250 Q300 320 330 410 Z" fill="${CAPTAIN.hull}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<g clip-path="url(#ext-hull)">`
    + `<path d="M-10 175 Q110 200 205 280 M-10 240 Q90 260 170 330 M-10 310 Q60 325 120 380 M60 140 Q80 260 40 410 M150 180 Q190 300 150 410" fill="none" stroke="${INK}" stroke-width="3" opacity="0.6"/>`
    + `<path d="M200 230 Q290 300 320 410 H240 Q230 330 170 260 Z" fill="url(#ext-dots)" opacity="0.45"/>`
    + [[30, 170], [110, 200], [30, 260], [95, 290], [60, 350], [190, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${CAPTAIN.hullLight}" stroke="${INK}" stroke-width="1.5"/>`).join('')
    + `<path d="M-10 128 Q120 158 228 256" fill="none" stroke="${CAPTAIN.hullLight}" stroke-width="4" opacity="0.8"/>`
    + '</g>'
    + `<rect x="236" y="300" width="14" height="9" rx="3" fill="${CAPTAIN.red}" stroke="${INK}" stroke-width="2.5" transform="rotate(48 243 304)"/>`;
  const stripes = Array.from({ length: 12 }, (_, i) => {
    const a0 = (i * Math.PI) / 6, a1 = a0 + Math.PI / 12;
    const p = (a, rr) => `${f(hx + rr * Math.cos(a))} ${f(hy + rr * 0.8 * Math.sin(a))}`;
    return `<path d="M${p(a0, r)} A${r} ${r * 0.8} 0 0 1 ${p(a1, r)} L${p(a1, r - 9)} A${r - 9} ${(r - 9) * 0.8} 0 0 0 ${p(a0, r - 9)} Z" fill="${INK}"/>`;
  }).join('');
  const hatch = `<ellipse cx="${hx}" cy="${hy}" rx="${r + 6}" ry="${(r + 6) * 0.8}" fill="${CAPTAIN.hullLight}" stroke="${INK}" stroke-width="5"/>`
    + `<ellipse cx="${hx}" cy="${hy}" rx="${r}" ry="${r * 0.8}" fill="${CAPTAIN.amber}" stroke="${INK}" stroke-width="3"/>${stripes}`
    + `<ellipse cx="${hx}" cy="${hy}" rx="${r - 10}" ry="${(r - 10) * 0.8}" fill="url(#ext-inside)" stroke="${INK}" stroke-width="3.5"/>`
    + `<path d="M${hx - 20} ${hy - 6} Q${hx} ${hy - 22} ${hx + 24} ${hy - 4}" fill="none" stroke="#FFD0C2" stroke-width="3" opacity="0.6"/>`;
  return svg(w, h, 'fx-exterior', spaceField(0, 0, w, h, 'ext-stars') + hull + hatch, defs);
}

// ---------- after an EJECT: the memorial ----------

/** The memorial plaque's mark: a grey head and shoulders in a ring, 18 x 18; the count beside it is the page's text. */
export function plaqueSvg() {
  return svg(18, 18, 'fx-plaque', `<circle cx="9" cy="9" r="8" fill="${CAPTAIN.memorialDark}" stroke="${INK}" stroke-width="1.6"/>`
    + `<circle cx="9" cy="7" r="2.8" fill="${CAPTAIN.memorialLight}"/><path d="M4 14.5 Q4.5 10.6 9 10.6 Q13.5 10.6 14 14.5 Z" fill="${CAPTAIN.memorialLight}"/>`);
}

const hexes = /#[0-9A-Fa-f]{6}\b/g;
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * The memorial treatment: a drawing (a dressed figure's SVG) turned into a grey paper cut-out, every
 * color mapped by its lightness onto the memorial greys and the ink kept, so that the person is
 * recognizable and no clothes, skin or color says anything (no side, no role, no outfit). Used for
 * a character taken off the board, in the history Frontend lists them in and at the moment a body
 * leaves the Jail.
 */
export function memorialSvg(text) {
  const [dark, light] = [CAPTAIN.memorialDark, CAPTAIN.memorialLight].map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  return text.replace(hexes, hex => {
    if (hex.toUpperCase() === INK) return INK;
    const v = Math.max(0, Math.min(1, (luminance(hex) - 0.08) / 0.84));
    return `#${dark.map((d, i) => Math.round(d + (light[i] - d) * v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  });
}

/**
 * The cards of the characters off the board, as targets for a character choice that offers them (a
 * Code may name any seat, these included): each card the character's grey cut-out with its seat
 * and name (the page's text) beneath, the whole card the target, at least CARD.min square. They go
 * in the sheet's body over the Hospital and the Jail (js/turns.mjs turnsLayout()), opened from the
 * choosing row's tab while the choice lasts: in one row, or in two where one would make them
 * narrower than CARD.min, centred; null where even two rows do not fit (more than an EJECT can take
 * off the board: the Jail has five places).
 */
export const CARD = Object.freeze({ max: 72, min: 44, gap: 6, strip: 22 });

export function offBoardCards(body, count) {
  if (count <= 0) return [];
  for (const rows of [1, 2]) {
    const cols = Math.ceil(count / rows);
    const width = Math.min(CARD.max, Math.floor(((body.width - (cols - 1) * CARD.gap) / cols) * 100) / 100);
    const height = width + CARD.strip;
    if (width < CARD.min || rows * height + (rows - 1) * CARD.gap > body.height) continue;
    const left = body.left + (body.width - (cols * width + (cols - 1) * CARD.gap)) / 2;
    return Array.from({ length: count }, (_, i) => ({ left: f(left + (i % cols) * (width + CARD.gap)), top: f(body.top + Math.floor(i / cols) * (height + CARD.gap)), width: f(width), height: f(height) }));
  }
  return null;
}

/**
 * Where the memorial plaque goes in the Jail's panel: right of the caption, in its band, vertically
 * centred on it, whole inside the panel. caption is the caption's box; size the plaque's laid-out
 * [width, height]. Returns { left, top }.
 */
export function plaqueBox({ caption, size: [width, height], panel }) {
  const m = LABEL_MARGIN;
  return {
    left: f(Math.min(panel.width - width - m, caption.left + caption.width + 3 * m)),
    top: f(Math.max(m, Math.min(panel.cap - height - m, caption.top + (caption.height - height) / 2))),
  };
}
