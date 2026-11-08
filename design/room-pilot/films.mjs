// mothership:dev-only
//
// The films' pieces of the rooms, redrawn with the rooms (room-drawing-1.0.0, docs/design/room-
// drawing-release.md). A few films draw parts of a room again, over the room, so that they can
// move them: the Captain's RELEASE and EJECT films draw the Jail's blast door, its lamp and its
// keypad's screen (design/board-v2/fx/captain.mjs jailDoorSvg(), "at rest the overlay is the room
// itself"). With the Jail redrawn, those pieces are redrawn here from the same picture, each
// exactly as the redrawn Jail draws it (./ink-room.mjs, pick: the same seed, part and tone), and
// trimmed as the release's pictures are (./trim.mjs), so that the door at rest is the room, pixel
// for pixel, and then slides open in the room's own hand. The room's light that falls on the door
// (the lamp's shaft, the dark at the panel's edges) is drawn over the pieces and stays where it is
// while they move. The lamp's and the screen's signals (RELEASE's green, EJECT's red, the
// lockdown's amber) are the film's colours, drawn in the same hand.
// Node and the browser alike: it reads SVG text and returns strings.

import { inkCanvas } from '../crew-drawing/source/ink.mjs';
import { inkRoomSvg } from './ink-room.mjs';
import { trimSvg } from './trim.mjs';

/** The Captain's signal colours (design/board-v2/fx/captain.mjs CAPTAIN and SIGNAL), read and not changed. */
export const SIGNAL_COLOURS = Object.freeze({
  green: Object.freeze(['#36C46E', '#A6F0C2', '#1F8A4C']),
  red: Object.freeze(['#D3271F', '#FF5A3C', '#A3170F']),
  amber: Object.freeze(['#F2A33A', '#FFD08A', '#9A5A12']),
});
export const SIGNALS = Object.freeze(['normal', 'green', 'red', 'amber']);
/** The board's neutral steel (design/board-motion/scenes/kit.mjs S), the corridor's family. */
const STEEL = Object.freeze({ deep: '#222B3A', shadow: '#34415A', mid: '#55657E', light: '#8696AE', pale: '#B9C4D3' });

// Today's door, as the Jail's picture draws it (design/board-motion/assets/scenes/jail.back.svg).
const DOORWAY = 'M398 372 V136 L422 112 H602 L626 136 V372 Z';
const STRIPES = ['398,196 432,196', '466,196 500,196', '534,196 568,196', '602,196 636,196', '670,196 704,196', '738,196 772,196'];
const is = (node, tag, attrs) => node.tag === tag && Object.entries(attrs).every(([name, value]) => node.attrs[name] === value);
const PIECES = {
  surface: node => is(node, 'path', { d: DOORWAY, fill: '#E85C44' }),
  band: node => is(node, 'rect', { x: '398', y: '196', width: '228', height: '112' })
    || (node.tag === 'polygon' && STRIPES.some(start => node.attrs.points?.startsWith(start)))
    || is(node, 'path', { d: 'M398 196 H626 M398 308 H626' }) || is(node, 'path', { d: 'M560 112 H626 V372 H586 Z' })
    || is(node, 'path', { d: 'M398 136 L422 112 H470 L398 208 Z' }),
  outline: node => is(node, 'path', { d: DOORWAY, fill: 'none' }),
  seam: node => is(node, 'path', { d: 'M512 112 V372' }),
  window: node => is(node, 'rect', { x: '466', y: '140' }) || is(node, 'path', { d: 'M478 153 H546' }),
  lock: node => is(node, 'rect', { x: '484', y: '226' }),
  wheel: node => is(node, 'circle', { cx: '512', cy: '252', r: '13' }),
  cross: node => is(node, 'path', { d: 'M512 242 V262 M502 252 H522' }),
  rivets: node => node.tag === 'circle' && node.attrs.r === '5' && ['414', '610'].includes(node.attrs.cx) && ['176', '330', '352'].includes(node.attrs.cy),
  lamp: node => node.attrs.id === 'jail-lamp' || is(node, 'path', { d: 'M500 86 H512' }),
  screen: node => is(node, 'rect', { x: '754', y: '196' }) || is(node, 'path', { d: 'M760 207 H778' }) || is(node, 'path', { d: 'M760 207 H790' })
    || is(node, 'path', { d: 'M758 214 L768 200 M770 214 L780 200 M782 214 L792 200' }),
  light: node => is(node, 'polygon', { points: '470,62 554,62 664,600 360,600' }),
};
const any = names => node => names.some(name => PIECES[name](node));

const LAMP = '<path id="jail-lamp" d="M492 82 H532 V88 Q532 100 512 100 Q492 100 492 88 Z" fill="#F4EBDD" stroke="#151923" stroke-width="4" stroke-linejoin="round"/>';
const SCREEN = '<rect x="754" y="196" width="42" height="22" rx="3" fill="#10141C" stroke="#151923" stroke-width="2.5"/><path d="M760 207 H778" fill="none" stroke="#F4EBDD" stroke-width="3" stroke-linecap="round"/>';

/** Today's Jail with its lamp lit by a signal: the lamp in the signal's colour, and its glint (as the film draws it). */
function lampLit(text, signal) {
  if (signal === 'normal') return text;
  const [color, light] = SIGNAL_COLOURS[signal];
  if (!text.includes(LAMP)) throw new Error('The Jail\'s lamp is no longer the one the film draws');
  return text.replace(LAMP, LAMP.replace('fill="#F4EBDD"', `fill="${color}"`) + `<path d="M500 86 H512" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`);
}
/** Today's Jail with its keypad's screen showing a signal, as the film draws it: a bar, or the lockdown's hazard strokes. */
function screenLit(text, signal) {
  if (signal === 'normal') return text;
  const [, light, deep] = SIGNAL_COLOURS[signal];
  if (!text.includes(SCREEN)) throw new Error('The Jail\'s keypad screen is no longer the one the film draws');
  const mark = signal === 'amber'
    ? `<path d="M758 214 L768 200 M770 214 L780 200 M782 214 L792 200" fill="none" stroke="${SIGNAL_COLOURS.red[0]}" stroke-width="4" stroke-linecap="round"/>`
    : `<path d="M760 207 H790" fill="none" stroke="${light}" stroke-width="3.5" stroke-linecap="round"/>`;
  return text.replace(SCREEN, `<rect x="754" y="196" width="42" height="22" rx="3" fill="${deep}" stroke="#151923" stroke-width="2.5"/>${mark}`);
}

/** The corridor seen through the open doorway (fx/captain.mjs corridor()), in the board's neutral steel. */
const CORRIDOR = '<rect x="398" y="112" width="228" height="260" fill="#10141C"/>'
  + '<path d="M398 112 L464 170 V300 L398 372 Z" fill="#34415A"/><path d="M626 112 L560 170 V300 L626 372 Z" fill="#222B3A"/>'
  + '<path d="M398 112 H626 L560 170 H464 Z" fill="#222B3A"/>'
  + '<path d="M398 372 L464 300 H560 L626 372 Z" fill="#55657E"/>'
  + '<rect x="464" y="170" width="96" height="130" fill="#34415A" stroke="#151923" stroke-width="3"/>'
  + '<rect x="488" y="176" width="48" height="8" rx="3" fill="#F4EBDD"/><ellipse cx="512" cy="300" rx="44" ry="7" fill="#F4EBDD" opacity="0.25"/>'
  + '<path d="M420 360 L476 304 M604 360 L548 304" stroke="#8696AE" stroke-width="3" stroke-linecap="round" opacity="0.7"/>';

/** A drawing's top-level definitions, by id, and its body, as text. */
function split(svg) {
  const open = svg.indexOf('<defs>'), close = svg.indexOf('</defs>');
  const defsText = open < 0 ? '' : svg.slice(open + 6, close);
  const body = svg.slice(close < 0 ? svg.indexOf('>') + 1 : close + 7, svg.lastIndexOf('</svg>'));
  const defs = new Map();
  let depth = 0, start = 0;
  for (const m of defsText.matchAll(/<(\/?)([\w:-]+)[^>]*?(\/?)>/g)) {
    if (m[1]) { depth -= 1; if (!depth) defs.set(defsText.slice(start, m.index + m[0].length).match(/ id="([^"]+)"/)[1], defsText.slice(start, m.index + m[0].length)); continue; }
    if (!depth) start = m.index;
    if (m[3]) { if (!depth) defs.set(m[0].match(/ id="([^"]+)"/)[1], m[0]); } else depth += 1;
  }
  return { defs, body };
}
const refsOf = text => [...text.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);

/** A piece: its body, and only the definitions it uses (and those they use). */
function piece(svg) {
  const { defs, body } = split(svg);
  const used = new Set(), queue = refsOf(body);
  while (queue.length) {
    const id = queue.pop();
    if (used.has(id) || !defs.has(id)) continue;
    used.add(id);
    queue.push(...refsOf(defs.get(id)));
  }
  return Object.freeze({ defs: [...defs].filter(([id]) => used.has(id)).map(([, def]) => def).join(''), body });
}

/**
 * The Jail door's pieces, redrawn as the redrawn Jail draws them: jailText, today's Jail picture;
 * family, the Jail's colour family (tokens 0.5.0). Each piece is { defs, body } in the Jail's
 * scene units, its ids under its own prefix (jd and a capital letter, for the film to give each
 * overlay its own):
 *   shut      the door at rest, but for its wheel's cross and its rivets: surface, band, outline,
 *             seam, window, lock, wheel, in the room's order;
 *   leaf      the same without the outline (each leaf is cut from it and slid);
 *   cross     the wheel's cross (the film turns it); rivets; outline;
 *   lamp      the lamp in each signal (normal is the room's); screen: the keypad's screen in each;
 *   light     the room's light over the door (the lamp's shaft, the dark at the panel's edges);
 *   corridor  the corridor seen through the open doorway;
 *   airlock   the EJECT hatch's fixed parts: its rim, its inner rim, and a clamp (airlockArt()).
 */
export function jailDoorArt(jailText, family) {
  const draw = (prefix, names, { text = jailText, finishing = false } = {}) => piece(trimSvg(inkRoomSvg(text, family, { prefix, pick: any(names), finishing })));
  return Object.freeze({
    shut: draw('jdS', ['surface', 'band', 'outline', 'seam', 'window', 'lock', 'wheel']),
    leaf: draw('jdA', ['surface', 'band', 'seam', 'window', 'lock', 'wheel']),
    cross: draw('jdX', ['cross']),
    rivets: draw('jdR', ['rivets']),
    outline: draw('jdO', ['outline']),
    lamp: Object.freeze(Object.fromEntries(SIGNALS.map((signal, i) => [signal, draw(`jdL${i}`, ['lamp'], { text: lampLit(jailText, signal) })]))),
    screen: Object.freeze(Object.fromEntries(SIGNALS.map((signal, i) => [signal, draw(`jdK${i}`, ['screen'], { text: screenLit(jailText, signal) })]))),
    light: draw('jdG', ['light'], { finishing: true }),
    corridor: piece(trimSvg(inkRoomSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768">${CORRIDOR}</svg>`, STEEL, { prefix: 'jdC', layer: true }))),
    airlock: airlockArt(inkCanvas),
  });
}

/** The Captain's hull steel and hazard amber (design/board-v2/fx/captain.mjs CAPTAIN), read and not changed. */
const HULL = Object.freeze({ hull: '#4A5568', hullLight: '#8A97AB', amber: '#F2A33A' });
const ring = (cx, cy, r, n = 48) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);

/**
 * The airlock's hatch for the EJECT film (fx/captain.mjs AIRLOCK: centre [276, 226], ring radius 50,
 * opening 39), its fixed parts in the crew's ink: the steel rim, the hazard band and the inner rim;
 * and one clamp, at the origin, for the film to place and slide. The band's stripes, the iris and the
 * space behind it stay the film's.
 */
export function airlockArt(cv) {
  const [cx, cy, r, o] = [276, 226, 50, 39];
  const rim = cv('jdH');
  rim.form(ring(cx, cy, r + 6), HULL.hull, { weight: 3.4, depth: 6, tension: 1, wobble: 0.5, step: 4, seed: 11 });
  rim.form(ring(cx, cy, r), HULL.amber, { weight: 2.2, depth: 4, tension: 1, wobble: 0.4, step: 4, seed: 12, hatch: false });
  const inner = cv('jdI');
  inner.form(ring(cx, cy, o + 4, 40), HULL.hullLight, { weight: 2.2, depth: 3, tension: 1, wobble: 0.4, step: 3, seed: 13 });
  const clamp = cv('jdM');
  clamp.form([[-8, -5], [8, -5], [8, 5], [-8, 5]], HULL.hullLight, { weight: 1.8, depth: 2, tension: 0, wobble: 0.2, step: 2.5, seed: 14, hatch: false });
  const out = canvas => piece(trimSvg(canvas.svg({ viewBox: '0 0 1024 768', width: 1024, height: 768 })));
  return Object.freeze({ rim: out(rim), inner: out(inner), clamp: out(clamp) });
}

// ---------- the Hospital's films: the drone, a berth's monitor and its lamp ----------

/** The medical palette's colours these use (design/board-v2/fx/medical.mjs MEDICAL), read and not changed. */
const MEDICAL = Object.freeze({ cyan: '#5FE0E8', amber: '#F2A33A', warn: '#C7372B', screen: '#0D1A22' });
/** The drone's poses (fx/medical.mjs DRONE.frames) and a lamp's states (LAMP_STATES), in their order. */
export const DRONE_FRAMES = Object.freeze(['folded', 'open', 'charge', 'pulse']);
export const LAMP_STATES = Object.freeze(['off', 'amber', 'red', 'calm']);
const LAMP_CORE = Object.freeze({ off: MEDICAL.screen, amber: MEDICAL.amber, red: MEDICAL.warn, calm: MEDICAL.cyan });

/** A berth monitor's frame, 40 x 24: glass, so inked round without a cel shadow, as the crew's screens are. */
function screenFrame() {
  const cv = inkCanvas('mdS');
  const [x, y, w, h, r] = [1, 1, 38, 22, 3];
  const corner = (cx, cy, from) => Array.from({ length: 4 }, (_, i) => [cx + Math.cos(from + (i / 3) * (Math.PI / 2)) * r, cy + Math.sin(from + (i / 3) * (Math.PI / 2)) * r]);
  const points = [...corner(x + w - r, y + r, -Math.PI / 2), ...corner(x + w - r, y + h - r, 0), ...corner(x + r, y + h - r, Math.PI / 2), ...corner(x + r, y + r, Math.PI)];
  cv.form(points, MEDICAL.screen, { weight: 1.7, depth: 0, tension: 0, wobble: 0.2, step: 2.5, seed: 21, rim: false, hatch: false, grain: false });
  return piece(trimSvg(cv.svg({ viewBox: '0 0 40 24', width: 40, height: 24 })));
}

/**
 * The Hospital films' pieces in the crew's hand (room-drawing-1.0.0): drones, today's drone in each
 * pose (fx/medical.mjs droneSvg(), its SVG text by frame), each shape drawn again in the crew's ink
 * at its place in the same 160 x 132 box, so the drone still hangs by its lens; the berth monitor's
 * frame (40 x 24) and a status lamp's core in each state (40 x 40, centred), the pieces the film's
 * traces, glows and halos are drawn on. Each is { defs, body }, its ids under its own prefix (md and
 * a capital letter).
 */
export function medicalArt(drones) {
  const sprite = (text, prefix, box) => piece(trimSvg(inkRoomSvg(text, STEEL, { prefix, layer: true, box })));
  const small = (body, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  return Object.freeze({
    drone: Object.freeze(Object.fromEntries(DRONE_FRAMES.map((frame, i) => [frame, sprite(drones[frame], `mdD${i}`, [160, 132])]))),
    screen: screenFrame(),
    lamp: Object.freeze(Object.fromEntries(LAMP_STATES.map((state, i) => [state, sprite(small(`<circle cx="20" cy="20" r="6.5" fill="${LAMP_CORE[state]}" stroke="#151923" stroke-width="2.5"/>`, 40, 40), `mdL${i}`, [40, 40])]))),
  });
}

// ---------- the private-talk capsule ----------

/** The capsule's colours (design/board-v2/scenes/capsule.mjs CAPSULE_RECOLOR), dark to light, read and not changed. */
export const CAPSULE_FAMILY = Object.freeze({ deep: '#0D1733', shadow: '#1B2A57', mid: '#303F80', light: '#5763A9', pale: '#9C9CD9' });
/** The capsule's pictures redrawn (design/board-v2/assets/capsule/, today's, by name); badge.svg, a tag, stays as it is. */
export const CAPSULE_PICTURES = Object.freeze(['back', 'door-0', 'door-1', 'door-2', 'door-3', 'busy']);

/**
 * The private-talk capsule beside the Command Room (design/board-v2/scenes/capsule.mjs), redrawn
 * in the crew's hand as the rooms are (room-drawing-1.0.0): today's pictures (texts, by name),
 * each shape drawn again at its place in the same 512 x 768 scene; the back darkens toward the
 * panel's edges as the rooms do; dark, the capsule shut with its lights out (back and door-0
 * together, as today's is), by the night rule (./night.mjs). Whole pictures, as SVG text: drawn,
 * and trimmed for release (./trim.mjs).
 */
export function capsuleArt(texts, nightRoomSvg) {
  const box = [512, 768];
  const drawn = Object.fromEntries(CAPSULE_PICTURES.map((name, i) => [name, inkRoomSvg(texts[name], CAPSULE_FAMILY, { prefix: `cp${i}`, layer: true, box })]));
  // The dark gathering at the panel's edges, as the rooms', over the cabin.
  const dark = `<radialGradient id="cp0-dark" cx="0.5" cy="0.56" r="0.7"><stop offset="0.5" stop-color="#151923" stop-opacity="0"/><stop offset="0.82" stop-color="#151923" stop-opacity="0.4"/><stop offset="1" stop-color="#151923" stop-opacity="0.7"/></radialGradient>`;
  drawn.back = drawn.back.replace('<defs>', `<defs>${dark}`).replace(/<\/svg>$/, '<g data-light="dark"><rect x="0" y="0" width="512" height="768" fill="url(#cp0-dark)"/></g></svg>');
  drawn.dark = nightRoomSvg([drawn.back, drawn['door-0']], { box });
  return Object.freeze({ drawn: Object.freeze(drawn), trimmed: Object.freeze(Object.fromEntries(Object.entries(drawn).map(([name, svg]) => [name, trimSvg(svg)]))) });
}

/** The Hospital films' art as a module (design/room-drawing/source/medical-art.mjs), written by design/tools/room-drawing-export.mjs. */
export function medicalArtModule(art) {
  return `// mothership:dev-only
//
// The Hospital films' pieces in the crew's hand (room-drawing-1.0.0; design/room-pilot/films.mjs
// medicalArt()): the medical drone in each pose, a berth monitor's frame and a status lamp's core in
// each state. Generated by design/tools/room-drawing-export.mjs from today's drone (design/releases/
// source-snapshots/cb9386bd716dc346160509d5e49d7348fdaf4f84/design/board-v2/assets/medical/): do not
// edit. Each piece is { defs, body }, its ids under its own prefix (md and a capital letter);
// ./medical.mjs draws them.

export const MEDICAL_ART = ${JSON.stringify(art, null, 1)};
`;
}

/** The art as a module (design/room-drawing/source/jail-door-art.mjs), written by design/tools/room-drawing-export.mjs. */
export function jailDoorArtModule(art) {
  return `// mothership:dev-only
//
// The Jail door's pieces for the Captain's films, redrawn as the redrawn Jail draws them
// (room-drawing-1.0.0; design/room-pilot/films.mjs jailDoorArt()). Generated by
// design/tools/room-drawing-export.mjs from design/board-motion/assets/scenes/jail.back.svg: do not
// edit. Each piece is { defs, body } in the Jail's scene units, its ids under its own prefix (jd and
// a capital letter); ./captain.mjs jailDoorSvg() composes them and gives each overlay its own ids.

export const JAIL_DOOR_ART = ${JSON.stringify(art, null, 1)};
`;
}
