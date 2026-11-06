// mothership:dev-only
//
// Library group 2: navigation. The offices' private Y-route instrument, in the Captain console's
// language (design/board-v2/fx/captain.mjs: a steel bezel, four screws, a slate screen, ink contours),
// and the small public marks of a movement. The public transit and arrival films are drawn by
// films.mjs from the cinematic library; this module holds the still pictures.
//
// PRIVATE art (the panel, its ship token and course overlays): drawn only inside an office holder's
// own open private sheet, concealed on blur like every private sheet. The arms are told apart by
// shape and by words, never by a blue or red hue: the Blue arm is one line with round lamps and a
// ringed planet, the Red arm a double line with diamond lamps and a cratered planet with a moon. A
// glance across the table at an office's phone shows a map, not a coloured direction. Every colour
// keeps MIN_ACCENT_DISTANCE from the faction accents (the test checks it).
//
// No picture holds a word: the arm names, the place names and every sentence are page text placed at
// the anchors below.

import { CAPTAIN } from '../../board-v2/fx/captain.mjs';
import { MOVES, POSITIONS } from './route.mjs';

export const NAV_ART_VERSION = 'library-navigation-0.1.0';

/** The palette: the Captain console's neutrals, the dossier's ink and paper, caption yellow. */
export const N = Object.freeze({
  ink: '#151923', paper: '#F4EBDD', caption: CAPTAIN.yellow, amber: CAPTAIN.amber,
  navy: CAPTAIN.navy, steel: CAPTAIN.steel, slate: CAPTAIN.slate, dark: CAPTAIN.dark,
  hull: CAPTAIN.hull, hullLight: CAPTAIN.hullLight, screen: '#141C30', grid: '#24314F',
});

/** The panel's size and every place's anchor on it (panel pixels; the page uses them as percentages). */
export const PANEL = Object.freeze({ w: 320, h: 236 });
export const ANCHORS = Object.freeze({
  Start: Object.freeze([160, 210]),
  Junction: Object.freeze([160, 164]),
  B1: Object.freeze([114, 126]),
  B2: Object.freeze([78, 88]),
  'Blue Planet': Object.freeze([46, 46]),
  R1: Object.freeze([206, 126]),
  R2: Object.freeze([242, 88]),
  'Red Planet': Object.freeze([274, 46]),
});
/** Where the page sets the place names (text, never in a picture): beside each node, clear of the lines. */
export const LABELS = Object.freeze({
  Start: Object.freeze({ at: [184, 210], align: 'start' }),
  Junction: Object.freeze({ at: [184, 166], align: 'start' }),
  'Blue Planet': Object.freeze({ at: [46, 76], align: 'center' }),
  'Red Planet': Object.freeze({ at: [274, 76], align: 'center' }),
});
/** An anchor as percentages of the panel, for absolutely placed page parts. */
export const anchorPercent = position => {
  const [x, y] = ANCHORS[position];
  return { left: Number(((x / PANEL.w) * 100).toFixed(3)), top: Number(((y / PANEL.h) * 100).toFixed(3)) };
};

const f = v => Number((+v).toFixed(2));
const dots = (id, color, r = 0.7) => `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r="${r}" fill="${color}"/></pattern>`;

function asset(name, about, w, h, body, defs = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${NAV_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/navigation/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}<g id="${name}">${body}</g></svg>\n`;
}

// ---------- the route's marks ----------

const line = (a, b, attrs) => `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" ${attrs}/>`;
/** The Blue arm's line: one stroke. */
const singleLine = (a, b) => line(a, b, `stroke="${N.hullLight}" stroke-width="3.6" stroke-linecap="round"`);
/** The Red arm's line: two strokes, drawn as a wide stroke with the screen showing through its middle. */
const doubleLine = (a, b) => line(a, b, `stroke="${N.hullLight}" stroke-width="8" stroke-linecap="round"`) + line(a, b, `stroke="${N.screen}" stroke-width="3" stroke-linecap="round"`);
/** A rung: the dotted path a switch takes between the same depth on the two arms. */
const rung = (a, b) => line(a, b, `stroke="${N.steel}" stroke-width="2.4" stroke-dasharray="1.5 6" stroke-linecap="round"`);

const roundLamp = ([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${N.navy}" stroke="${N.hullLight}" stroke-width="2.6"/><circle cx="${x}" cy="${y}" r="2.4" fill="${N.hullLight}"/>`;
const diamondLamp = ([x, y]) => `<path d="M${x} ${y - 9} L${x + 9} ${y} L${x} ${y + 9} L${x - 9} ${y} Z" fill="${N.navy}" stroke="${N.hullLight}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${x} ${y - 2.8} L${x + 2.8} ${y} L${x} ${y + 2.8} L${x - 2.8} ${y} Z" fill="${N.hullLight}"/>`;
/** The Junction: a ring with a small fork, where the route divides. */
const junction = ([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${N.navy}" stroke="${N.hullLight}" stroke-width="2.6"/><path d="M${x} ${y + 5.5} V${y + 0.5} L${x - 4.5} ${y - 4.5} M${x} ${y + 0.5} L${x + 4.5} ${y - 4.5}" fill="none" stroke="${N.hullLight}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
/** Start: the cradle the ship leaves, an open bracket under a small lamp. */
const dock = ([x, y]) => `<path d="M${x - 9} ${y - 5} V${y + 5} H${x + 9} V${y - 5}" fill="none" stroke="${N.hullLight}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x}" cy="${y - 1}" r="2.6" fill="${N.hullLight}"/>`;

/** The Blue arm's planet: a ringed world (no hue: steel and paper). */
function ringedPlanet([x, y], r = 15) {
  return `<ellipse cx="${x}" cy="${y}" rx="${f(r * 1.75)}" ry="${f(r * 0.5)}" fill="none" stroke="${N.hullLight}" stroke-width="2.4" transform="rotate(-16 ${x} ${y})"/>`
    + `<circle cx="${x}" cy="${y}" r="${r}" fill="${N.steel}" stroke="${N.ink}" stroke-width="2.6"/>`
    + `<path d="M${f(x - r * 0.8)} ${f(y - r * 0.3)} Q${x} ${f(y - r * 0.55)} ${f(x + r * 0.85)} ${f(y - r * 0.15)} M${f(x - r * 0.9)} ${f(y + r * 0.25)} Q${x} ${f(y + 0.05 * r)} ${f(x + r * 0.9)} ${f(y + r * 0.35)}" fill="none" stroke="${N.hullLight}" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`
    + `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#nav-shade)" opacity="0.5"/>`
    // The ring's front half, over the planet.
    + `<path d="M${f(x - r * 1.68)} ${f(y + r * 0.47)} A${f(r * 1.75)} ${f(r * 0.5)} -16 0 0 ${f(x + r * 1.68)} ${f(y - r * 0.47)}" fill="none" stroke="${N.hullLight}" stroke-width="2.4" stroke-linecap="round"/>`;
}
/** The Red arm's planet: a cratered world with a small moon (no hue: steel and paper). */
function crateredPlanet([x, y], r = 15) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${N.steel}" stroke="${N.ink}" stroke-width="2.6"/>`
    + [[-0.35, -0.3, 0.26], [0.32, 0.18, 0.2], [-0.15, 0.45, 0.14]].map(([dx, dy, cr]) => `<circle cx="${f(x + dx * r)}" cy="${f(y + dy * r)}" r="${f(cr * r)}" fill="${N.slate}" stroke="${N.hullLight}" stroke-width="1.4"/>`).join('')
    + `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#nav-shade)" opacity="0.5"/>`
    + `<circle cx="${f(x + r * 1.3)}" cy="${f(y + r * 0.95)}" r="${f(r * 0.3)}" fill="${N.hull}" stroke="${N.hullLight}" stroke-width="1.6"/>`;
}

// ---------- the panel ----------

/** The office's route instrument: bezel, screen, the Y with its rungs, lamps and the two planets. */
export function panelSvg() {
  const { w, h } = PANEL;
  const A = ANCHORS;
  const defs = dots('nav-dots', N.ink, 0.8)
    + `<pattern id="nav-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0 H0 V16" fill="none" stroke="${N.grid}" stroke-width="1"/></pattern>`
    + `<radialGradient id="nav-shade" cx="0.35" cy="0.3" r="0.8"><stop offset="0.55" stop-color="${N.ink}" stop-opacity="0"/><stop offset="1" stop-color="${N.ink}" stop-opacity="0.85"/></radialGradient>`
    + `<radialGradient id="nav-glass" cx="0.5" cy="0.12" r="0.9"><stop offset="0" stop-color="${N.hullLight}" stop-opacity="0.16"/><stop offset="0.6" stop-color="${N.hullLight}" stop-opacity="0"/></radialGradient>`;
  const bezel = `<rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" rx="14" fill="${N.steel}" stroke="${N.ink}" stroke-width="5"/>`
    + `<path d="M${w - 70} 5 H${w - 14} Q${w - 5} 5 ${w - 5} 14 V${h - 14} Q${w - 5} ${h - 5} ${w - 14} ${h - 5} H${w - 110} Z" fill="url(#nav-dots)" opacity="0.32"/>`
    + [[11, 11], [w - 11, 11], [11, h - 11], [w - 11, h - 11]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${N.hullLight}" stroke="${N.ink}" stroke-width="1.8"/><path d="M${x - 1.8} ${y - 1.8} L${x + 1.8} ${y + 1.8}" stroke="${N.ink}" stroke-width="1.2"/>`).join('');
  const screen = `<rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="9" fill="${N.screen}" stroke="${N.ink}" stroke-width="3"/>`
    + `<rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="9" fill="url(#nav-grid)" opacity="0.8"/>`;
  const route = line(A.Start, A.Junction, `stroke="${N.hullLight}" stroke-width="3.6" stroke-linecap="round"`)
    + singleLine(A.Junction, A.B1) + singleLine(A.B1, A.B2) + singleLine(A.B2, A['Blue Planet'])
    + doubleLine(A.Junction, A.R1) + doubleLine(A.R1, A.R2) + doubleLine(A.R2, A['Red Planet'])
    + rung(A.B1, A.R1) + rung(A.B2, A.R2);
  const lamps = dock(A.Start) + junction(A.Junction) + roundLamp(A.B1) + roundLamp(A.B2) + diamondLamp(A.R1) + diamondLamp(A.R2)
    + ringedPlanet(A['Blue Planet']) + crateredPlanet(A['Red Planet']);
  const glass = `<rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="9" fill="url(#nav-glass)"/>`
    + `<path d="M30 28 H${w - 150}" stroke="${N.hullLight}" stroke-width="2" stroke-linecap="round" opacity="0.1"/>`;
  return asset('nav-panel', 'The offices\' private route instrument: the Y from Start through the Junction to the two planets; the arms told apart by line, lamp and planet shape, never by hue. Place names are page text at the anchors.', w, h, bezel + screen + route + lamps + glass, defs);
}

/** The ship's token on the panel: a small hull seen from above, nose up, its centre on the anchor. */
export function shipTokenSvg() {
  const body = `<path d="M16 3 Q21 9 21 17 L25 25 L21 26 L16 23 L11 26 L7 25 L11 17 Q11 9 16 3 Z" fill="${N.paper}" stroke="${N.ink}" stroke-width="2.2" stroke-linejoin="round"/>`
    + `<path d="M16 8 Q18.4 11 18.4 14 H13.6 Q13.6 11 16 8 Z" fill="${N.navy}" stroke="${N.ink}" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<path d="M13 27.5 Q16 31 19 27.5" fill="none" stroke="${N.caption}" stroke-width="2.4" stroke-linecap="round"/>`;
  return asset('nav-ship', 'The ship on the office panel: the token placed at the current position\'s anchor; it steps from anchor to anchor.', 32, 32, body);
}

/** The ring around the place the course leads to. */
const targetRing = ([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${N.caption}" stroke-width="2.6" stroke-dasharray="5 4"/>`;

/** One movement's course over the panel (same size, transparent): a dashed arrow from one place to the next. */
export function courseSvg(from, to) {
  const a = ANCHORS[from];
  const b = ANCHORS[to];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  // Start clear of the token, stop clear of the target ring; an arrowhead at the end.
  const s = [a[0] + ux * 15, a[1] + uy * 15];
  const e = [b[0] - ux * 19, b[1] - uy * 19];
  const head = [[e[0] + ux * 9, e[1] + uy * 9], [e[0] - uy * 6.5, e[1] + ux * 6.5], [e[0] + uy * 6.5, e[1] - ux * 6.5]];
  const body = line(s, e, `stroke="${N.ink}" stroke-width="7" stroke-linecap="round" opacity="0.55"`)
    + line(s, e, `stroke="${N.caption}" stroke-width="3.6" stroke-dasharray="7 5" stroke-linecap="round"`)
    + `<path d="M${head.map(p => `${f(p[0])} ${f(p[1])}`).join(' L')} Z" fill="${N.caption}" stroke="${N.ink}" stroke-width="1.6" stroke-linejoin="round"/>`
    + targetRing(b);
  return asset(`nav-course-${slug(from)}-${slug(to)}`, `The course from ${from} to ${to}, over the panel: drawn for the final direction while the offices acknowledge it, and both of a place's courses while the Officer chooses an undecided course.`, PANEL.w, PANEL.h, body);
}
export const slug = position => position.toLowerCase().replace(/\s+/g, '-');

/** The tray mark for the offices' Course panel: a compass rose in the console's steel. */
export function iconCourseSvg() {
  const body = `<circle cx="24" cy="24" r="20" fill="${N.navy}" stroke="${N.ink}" stroke-width="3"/>`
    + `<circle cx="24" cy="24" r="14" fill="none" stroke="${N.hullLight}" stroke-width="1.8" stroke-dasharray="2 4"/>`
    + `<path d="M24 8 L28 24 L24 40 L20 24 Z" fill="${N.paper}" stroke="${N.ink}" stroke-width="1.8" stroke-linejoin="round"/>`
    + `<path d="M24 8 L28 24 H20 Z" fill="${N.caption}" stroke="${N.ink}" stroke-width="1.8" stroke-linejoin="round"/>`
    + `<circle cx="24" cy="24" r="2.6" fill="${N.ink}"/>`;
  return asset('nav-icon-course', 'The tray mark for the offices\' Course panel.', 48, 48, body);
}

/** The public chip's mark: the ship in profile with three motion lines, no direction, no colour of a side. */
export function chipMovedSvg() {
  const body = `<path d="M3 14 H11 M1 19 H9 M4 24 H10" stroke="${N.hullLight}" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path d="M13 19 Q14 12 22 11 L34 11 Q42 12 47 19 Q42 26 34 27 L22 27 Q14 26 13 19 Z" fill="${N.paper}" stroke="${N.ink}" stroke-width="2.2" stroke-linejoin="round"/>`
    + `<path d="M34 14 Q40 15 43 19 H34 Z" fill="${N.navy}" stroke="${N.ink}" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<path d="M18 16 V22" stroke="${N.ink}" stroke-width="1.6" stroke-linecap="round"/>`
    + `<circle cx="12.5" cy="19" r="2.2" fill="${N.amber}" stroke="${N.ink}" stroke-width="1.2"/>`;
  return asset('nav-chip-moved', 'The public mark beside "Round N: the ship moved": the ship in profile, the same for every movement.', 48, 38, body);
}

/** Every asset of the group: name, picture, size and use. */
export function navigationAssets() {
  const out = {
    'nav-panel': { svg: panelSvg(), size: `${PANEL.w}x${PANEL.h}`, role: 'office-private: the route instrument', about: 'The offices\' private route instrument; the arms told apart by shape, never by hue.' },
    'nav-ship': { svg: shipTokenSvg(), size: '32x32', role: 'office-private: the ship token', about: 'The ship token, centred on the current position\'s anchor.' },
    'nav-icon-course': { svg: iconCourseSvg(), size: '48x48', role: 'office-private: tray mark', about: 'The tray mark for the offices\' Course panel.' },
    'nav-chip-moved': { svg: chipMovedSvg(), size: '48x38', role: 'public: movement chip', about: 'The public mark for a completed movement, the same every round.' },
  };
  for (const move of MOVES) {
    const name = `nav-course-${slug(move.from)}-${slug(move.to)}`;
    out[name] = { svg: courseSvg(move.from, move.to), size: `${PANEL.w}x${PANEL.h}`, role: `office-private: course ${move.from} to ${move.to} (${move.kind})`, about: `The course from ${move.from} to ${move.to} (${move.direction}, ${move.kind}).` };
  }
  return out;
}

/** Every anchor is a route position (the test holds the two lists together). */
export const ANCHOR_POSITIONS = Object.freeze(Object.keys(ANCHORS));
export const ROUTE_POSITIONS = POSITIONS;
