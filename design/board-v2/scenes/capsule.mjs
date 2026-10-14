// mothership:dev-only
//
// The private-talk capsule: the owner's request of 14 October 2026, recorded by Integration ("a
// private room or capsule next to the command room ... with width of 1/2 of that room ... for
// private talk for 2 players"), for the Private Chamber of the owner's motion specification of
// 13 October 2026 (G-02; Q-HK01 to Q-HK03), storyboard S2 of the Designer's review.
// docs/design/private-capsule.md.
//
// It is scenery, not a room. A Hack's two participants are drawn walking there and sitting there
// for the conversation, but they stay where the authoritative state has them: in their room, at
// their slot, which keeps its press area. The capsule has no slots, no press areas and no tag,
// changes no location, occupancy, capacity, eligibility, movement or immunity, and is empty
// whenever no exchange is on. fit.mjs lays it out beside the Command Room, half its width
// ({ capsule: true }).
//
// The room: a small cabin of dark metal behind a sliding door, two chairs facing each other
// across a small round table, one lamp hanging over it, a door-status light over the door and a
// small control panel beside it. Drawn half a room wide (512 x 768 scene units) in the camera of
// the approved rooms (design/board-motion/scenes/kit.mjs: the deck's back edge at y 372, its
// front edge at 748), so that at half the Command Room's width it is framed at about the Command
// Room's scale: 0.95 to 1.0 of it on the taller phones (from 360 x 740 up), 0.87 of it on the
// short ones (320 x 568, 360 x 640, 375 x 667). Its seated people are drawn a little smaller than
// the Captain at C1 (0.87 of the Captain's size at 390 x 844).
//
// Like every scene, it is drawn in the neutral steel family, ink and paper, then printed in its
// own colors by a recolor map: CAPSULE_RECOLOR, a deep navy turning violet in the light (S2's
// "dark metallic navy with purple shadows"), apart from the Command Room's gold beside it and
// Room B's purple below it. Its accents are drawn in their own colors: the lamp's and the
// door-status light's caption yellow, a token of 0.4.0, never red or blue. Nothing in it belongs
// to a role, a side or a claim, and nothing is written: its label is the board's caption.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude
// Code), in the drawing vocabulary of the scenes: paths, shapes, patterns and clip paths.

import { INK, PAPER, S, SCENE_DEFS, circle, ellipse, halftone, line, path, poly, rect } from '../../board-motion/scenes/kit.mjs';

export const CAPSULE_VERSION = 'board-v2-capsule-0.1.0';
/** The capsule scene's size in scene units: half a room's 1024 x 768. */
export const CAPSULE_SIZE = Object.freeze([512, 768]);

/**
 * The capsule's colors for the steel family, as an export recipe's recolor map: the deep navy of
 * the phone kit's frame (design/phone-kit/css/phone-kit.css, --pk-navy-900 #0A1530) lightening
 * toward violet. A proposal: no reviewed recipe exists for a capsule (design/source/export-recipes.json
 * is unchanged).
 */
export const CAPSULE_RECOLOR = Object.freeze({
  '#222B3A': '#0D1733', '#34415A': '#1B2A57', '#55657E': '#303F80', '#8696AE': '#5763A9', '#B9C4D3': '#9C9CD9',
});
/**
 * The accents, drawn in their own colors (tokens 0.4.0): the lamp's light, and the door-status
 * light when the capsule is in use. The status light comes on for every exchange alike, so it says
 * nothing about a side; it is still never red or blue, so that nobody can read one into it: like
 * every color the capsule adds for an exchange (the light, the badge, the pair's outline), it is
 * at least MIN_ACCENT_DISTANCE from every faction accent (design/board-v2/fx/blocked.mjs).
 */
export const CAPSULE_ACCENTS = Object.freeze({
  lamp: '#F7C52B', // color.caption
  glow: '#F9E48C', // color.room.commandRoom.pale
  busy: '#F7C52B', // color.caption
  busyGlow: '#F9E48C', // color.room.commandRoom.pale
});

// ---------- the room's geometry, in scene units ----------

/** The back wall's foot (the deck's back edge) and the deck's front edge, as in every room's camera. */
const BACK = 372;
const FRONT = 748;
/** The deck's outline, back left to front left: where the participants' feet may go. */
export const DECK = Object.freeze([[66, BACK], [446, BACK], [502, FRONT], [10, FRONT]].map(point => Object.freeze(point)));
/**
 * The doorway in the back wall, right of the lamp: its opening and the frame around it. On the
 * right, where the board's caption never lies over it (a caption sits at a panel's top left).
 */
export const DOOR = Object.freeze({ x0: 318, x1: 418, top: 164, sill: BACK, frame: 12 });
/** The door's drawn positions, closed to open: DOOR_FRAMES - 1 is fully open. */
export const DOOR_FRAMES = 4;
/** The table: its top's centre and radii, and its foot. */
export const TABLE = Object.freeze({ cx: 256, top: 574, rx: 78, ry: 17, foot: 654 });

/**
 * The two seats: where a sitting participant is drawn (its anchor, in scene units, as the slots'
 * `at`), how large and which way it faces (mirror: true faces right). P1 is the left chair, P2
 * the right one; the lower player number sits at P1, so the order says nothing but the numbers.
 * Presentation anchors only: not slots, not targets, not locations.
 */
export const CAPSULE_SEATS = Object.freeze([
  Object.freeze({ id: 'P1', side: 'left', chair: 126, at: Object.freeze([134.4, 650]), scale: 1.05, mirror: true }),
  Object.freeze({ id: 'P2', side: 'right', chair: 386, at: Object.freeze([377.6, 650]), scale: 1.05, mirror: false }),
]);
/** Where an entering or leaving participant stands in the open doorway: on its sill, smaller for being further back. */
export const DOORWAY = Object.freeze({ at: Object.freeze([368, BACK + 2]), scale: 0.9 });
/** Where a participant stops, in front of its chair, before it turns and sits: [x, y] of its anchor. */
export const BESIDE = Object.freeze({ P1: Object.freeze([164, 650]), P2: Object.freeze([348, 650]) });
/**
 * Each participant's path in, through the points its feet pass, from the doorway to its stop
 * beside its chair: P1's goes left along the back of the cabin, behind the table, then forward
 * along its chair's front edge; P2's comes forward to its own chair, right of the table. Neither
 * crosses the table or the other's chair. The way out is the same path backward.
 */
export const PATHS = Object.freeze({
  P1: Object.freeze([DOORWAY.at, Object.freeze([164, 480]), BESIDE.P1]),
  P2: Object.freeze([DOORWAY.at, BESIDE.P2]),
});

// ---------- drawing ----------

/** The capsule's floor: plates in the rooms' camera, a pool of lamplight, shade along its edges. */
function deck() {
  const quad = DECK;
  return [
    poly(quad, S.light, { stroke: 0 }),
    '<g clip-path="url(#clip-capsule-floor)">',
    poly([[60, BACK + 24], [452, BACK + 24], [446, BACK], [66, BACK]], S.mid, { stroke: 0 }),
    poly([[66, BACK], [110, BACK], [74, FRONT], [10, FRONT]], S.mid, { stroke: 0 }),
    halftone([[110, BACK], [140, BACK], [116, FRONT], [74, FRONT]], 'm'),
    poly([[446, BACK], [406, BACK], [442, FRONT], [502, FRONT]], S.mid, { stroke: 0 }),
    halftone([[406, BACK], [378, BACK], [404, FRONT], [442, FRONT]], 'm'),
    halftone([[56, BACK + 24], [456, BACK + 24], [460, BACK + 42], [52, BACK + 42]], 's'),
    // The lamp's pool on the deck round the table.
    ellipse(TABLE.cx, TABLE.foot - 4, 168, 40, CAPSULE_ACCENTS.glow, { opacity: 0.16 }),
    ellipse(TABLE.cx, TABLE.foot - 4, 112, 26, CAPSULE_ACCENTS.glow, { opacity: 0.16 }),
    line(`M171 ${BACK} L140 ${FRONT} M256 ${BACK} V${FRONT} M341 ${BACK} L372 ${FRONT}`, { width: 2.5, opacity: 0.24 }),
    line('M58 430 H454 M44 520 H468 M26 640 H486', { width: 2.5, opacity: 0.24 }),
    `<g fill="${INK}" opacity="0.4">`,
    ...[[150, 440], [362, 440], [118, 600], [394, 600]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`),
    '</g>',
    halftone([[10, FRONT], [502, FRONT], [492, 702], [20, 702]], 's', { opacity: 0.7 }),
    '</g>',
  ].join('');
}

/** The cabin: its ceiling, its side walls and its back wall with the doorway's frame, a vent, a trim and the control panel. */
function shell() {
  const { x0, x1, top, sill, frame } = DOOR;
  return [
    // What is behind the cabin's edges: the dark of the board.
    rect(0, 0, 512, 768, S.deep, { stroke: 0 }),
    // The back wall, its panels and the violet trim along it.
    rect(66, 64, 380, BACK - 64, S.mid, { stroke: 0 }),
    rect(66, 64, 380, 26, S.shadow, { stroke: 0 }),
    halftone([[66, 90], [446, 90], [446, 112], [66, 112]], 's'),
    line('M128 90 V' + BACK + ' M384 90 V' + BACK, { width: 3, opacity: 0.5 }),
    rect(66, 282, 380, 14, S.light, { stroke: 2.5 }),
    halftone([[66, 296], [446, 296], [446, BACK], [66, BACK]], 's', { opacity: 0.8 }),
    `<g fill="${INK}" opacity="0.45">`,
    ...[[84, 104], [428, 104], [84, 268], [428, 268], [146, 104], [366, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`),
    '</g>',
    // The ceiling, a lit strip along its front edge.
    poly([[0, 0], [512, 0], [446, 64], [66, 64]], S.shadow, { stroke: 3 }),
    halftone([[0, 0], [512, 0], [446, 64], [66, 64]], 'm', { opacity: 0.8 }),
    rect(150, 40, 212, 9, S.pale, { stroke: 2, rx: 3 }),
    // The side walls, dark, lit at their front edges.
    poly([[0, 0], [66, 64], [66, BACK], [0, 768]], S.shadow, { stroke: 3 }),
    halftone([[0, 0], [66, 64], [66, BACK], [0, 768]], 'l', { opacity: 0.7 }),
    poly([[512, 0], [446, 64], [446, BACK], [512, 768]], S.shadow, { stroke: 3 }),
    halftone([[512, 0], [446, 64], [446, BACK], [512, 768]], 'm', { opacity: 0.6 }),
    // A vent in the left wall; the control panel on the right one, beside the doorway: three
    // lamps and a small key grid, nothing written.
    poly([[18, 150], [46, 168], [46, 238], [18, 226]], S.deep, { stroke: 2.5 }),
    line('M22 176 L42 188 M22 192 L42 204 M22 208 L42 220', { width: 2, color: S.mid }),
    poly([[456, 196], [492, 178], [492, 262], [456, 276]], S.deep, { stroke: 3 }),
    ...[0, 1, 2].map(i => circle(464 + i * 9, 206 - i * 4.5, 3.2, i === 0 ? S.pale : S.light, { stroke: 1.3 })),
    ...[0, 1, 2].flatMap(c => [0, 1].map(r => poly([[461 + c * 9, 222 + r * 14 - c * 4.5], [467 + c * 9, 219 + r * 14 - c * 4.5], [467 + c * 9, 228 + r * 14 - c * 4.5], [461 + c * 9, 231 + r * 14 - c * 4.5]], S.mid, { stroke: 1.2 }))),
    // The doorway's frame, standing out of the wall, and its sill. Its header carries the
    // door-status light, unlit here (busy.svg lights it).
    rect(x0 - frame, top - frame, x1 - x0 + 2 * frame, sill - top + frame, S.light, { stroke: 4, rx: 10 }),
    halftone([[x1, top], [x1 + frame, top], [x1 + frame, sill], [x1, sill]], 's'),
    rect(x0 - frame - 4, sill - 6, x1 - x0 + 2 * frame + 8, 10, S.pale, { stroke: 2.5, rx: 2 }),
    rect(x0 + 8, top - frame - 2, x1 - x0 - 16, 10, S.deep, { stroke: 2, rx: 4 }),
    // The opening: a dim corridor beyond, a strip of its light down the middle.
    rect(x0, top, x1 - x0, sill - top, S.deep, { stroke: 3 }),
    rect((x0 + x1) / 2 - 10, top + 10, 20, sill - top - 20, PAPER, { stroke: 0, opacity: 0.08 }),
    poly([[x0, sill], [x1, sill], [x1 - 22, sill - 34], [x0 + 22, sill - 34]], S.shadow, { stroke: 0 }),
  ].join('');
}

/** The lamp hanging over the table on its cable, lit: its shade, its bulb, its glow and its cone of light. */
function lamp() {
  return [
    poly([[214, 132], [298, 132], [372, TABLE.top + 4], [140, TABLE.top + 4]], CAPSULE_ACCENTS.glow, { stroke: 0, opacity: 0.1 }),
    ellipse(256, 140, 78, 30, CAPSULE_ACCENTS.glow, { opacity: 0.22 }),
    line('M256 0 V104', { width: 5 }),
    line('M256 0 V104', { width: 2, color: S.light }),
    poly([[230, 102], [282, 102], [300, 132], [212, 132]], S.mid, { stroke: 3.5 }),
    halftone([[264, 102], [282, 102], [300, 132], [276, 132]], 's'),
    ellipse(256, 132, 38, 8, CAPSULE_ACCENTS.lamp, { stroke: 3 }),
    ellipse(256, 131, 22, 4, PAPER, { opacity: 0.85 }),
  ].join('');
}

/** A chair seen side on, its back on the outer side: centre x, facing +1 (right) or -1 (left). */
function chair(cx, facing) {
  const back = cx - facing * 34;
  const seatY = 598;
  const out = [
    // Its shadow, its foot and its column.
    ellipse(cx, 654, 40, 8, INK, { opacity: 0.45 }),
    ellipse(cx, 652, 30, 7, S.mid, { stroke: 2.5 }),
    rect(cx - 5, seatY + 10, 10, 40, S.mid, { stroke: 2.5 }),
    // The back, standing on the outer side, and its cushion.
    path(`M${back - 7} ${seatY + 8} L${back - 7} 492 Q${back - 7} 482 ${back + 3} 482 L${back + 3} 482 Q${back + 13} 482 ${back + 13} 492 L${back + 13} ${seatY + 8} Z`, S.light, { stroke: 3 }),
    rect(back - 3 + (facing > 0 ? 6 : -6) - 2, 492, 8, 92, S.pale, { stroke: 2, rx: 3 }),
    // The seat, its cushion lit on top.
    rect(cx - 40, seatY - 4, 80, 16, S.light, { stroke: 3, rx: 5 }),
    rect(cx - 36, seatY - 4, 72, 5, S.pale, { stroke: 0, rx: 2 }),
    halftone([[cx - 40, seatY + 4], [cx + 40, seatY + 4], [cx + 40, seatY + 12], [cx - 40, seatY + 12]], 's'),
  ];
  return out.join('');
}

/** The small round table between the chairs, lit from above. */
function table() {
  const { cx, top, rx, ry, foot } = TABLE;
  return [
    ellipse(cx, foot, 54, 11, INK, { opacity: 0.45 }),
    ellipse(cx, foot - 2, 36, 8, S.mid, { stroke: 2.5 }),
    rect(cx - 8, top + 8, 16, foot - top - 10, S.mid, { stroke: 2.5 }),
    halftone([[cx + 2, top + 10], [cx + 8, top + 10], [cx + 8, foot - 4], [cx + 2, foot - 4]], 's'),
    // The top's thickness, then the top, its lit half and its rim.
    path(`M${cx - rx} ${top} L${cx - rx} ${top + 9} A${rx} ${ry} 0 0 0 ${cx + rx} ${top + 9} L${cx + rx} ${top} Z`, S.mid, { stroke: 3 }),
    ellipse(cx, top, rx, ry, S.pale, { stroke: 3 }),
    path(`M${cx - rx + 10} ${top - 2} A${rx - 10} ${ry - 5} 0 0 1 ${cx + rx - 10} ${top - 2} Z`, CAPSULE_ACCENTS.glow, { stroke: 0, opacity: 0.45 }),
    ellipse(cx, top, rx - 22, ry - 6, PAPER, { opacity: 0.18 }),
  ].join('');
}

/** The empty capsule, door closed and its light unlit: everything but the door's leaves and the busy light. */
function back() {
  return [shell(), deck(), lamp(), chair(CAPSULE_SEATS[0].chair, 1), chair(CAPSULE_SEATS[1].chair, -1), table()].join('');
}

/**
 * The door's two leaves at a position, 0 closed to DOOR_FRAMES - 1 open: each slides into the
 * wall on its side, clipped to the opening. Each leaf has a window slit and a lit edge.
 */
function leaves(position) {
  const { x0, x1, top, sill } = DOOR;
  const half = (x1 - x0) / 2;
  const shift = (half * position) / (DOOR_FRAMES - 1);
  const leaf = (x, side) => [
    rect(x, top, half, sill - top, S.light, { stroke: 3 }),
    rect(x + (side < 0 ? 12 : 16), top + 30, half - 28, 70, S.deep, { stroke: 2.5, rx: 4 }),
    rect(x + (side < 0 ? 16 : 20), top + 34, 6, 62, PAPER, { stroke: 0, opacity: 0.18 }),
    rect(x + 6, top + 130, half - 12, 10, S.mid, { stroke: 2, rx: 2 }),
    halftone(side < 0 ? [[x, top], [x + 12, top], [x + 12, sill], [x, sill]] : [[x + half - 12, top], [x + half, top], [x + half, sill], [x + half - 12, sill]], 's'),
  ].join('');
  if (position >= DOOR_FRAMES - 1) return '';
  return `<g clip-path="url(#clip-capsule-door)">${leaf(x0 - shift, -1)}${leaf(x0 + half + shift, 1)}${line(`M${x0 + half - shift} ${top} V${sill} M${x0 + half + shift} ${top} V${sill}`, { width: 3 })}</g>`;
}

/** The door-status light lit, along the doorway's header: the capsule is in use. Public: it says the two are inside, nothing more. */
function busy() {
  const { x0, x1, top, frame } = DOOR;
  const y = top - frame - 2;
  return [
    ellipse((x0 + x1) / 2, y + 5, (x1 - x0) / 2 + 18, 22, CAPSULE_ACCENTS.busyGlow, { opacity: 0.3 }),
    rect(x0 + 8, y, x1 - x0 - 16, 10, CAPSULE_ACCENTS.busy, { stroke: 2, rx: 4 }),
    rect(x0 + 14, y + 2, (x1 - x0) / 3, 3, PAPER, { stroke: 0, rx: 1.5, opacity: 0.6 }),
  ].join('');
}

const CLIPS = `<clipPath id="clip-capsule-floor"><polygon points="${DECK.map(point => point.join(',')).join(' ')}"/></clipPath><clipPath id="clip-capsule-door"><rect x="${DOOR.x0}" y="${DOOR.top}" width="${DOOR.x1 - DOOR.x0}" height="${DOOR.sill - DOOR.top}"/></clipPath>`;

/** Swaps the steel family for the capsule's colors (as composeScene() does with a room's recipe). */
export const recolorCapsule = markup => Object.entries(CAPSULE_RECOLOR).reduce((text, [from, to]) => text.replace(new RegExp(from, 'gi'), to), markup);

/** A layer of the capsule as a whole SVG in its 512 x 768 scene, in its colors. */
function svg(id, body) {
  const [w, h] = CAPSULE_SIZE;
  return recolorCapsule(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>${SCENE_DEFS}${CLIPS}</defs>
  <g id="capsule-${id}">${body}</g>
</svg>
`);
}

/**
 * The capsule's layers, back to front, each the whole scene's size: what a screen stacks in the
 * capsule's panel. back: the empty cabin, door closed, its light unlit. door-0 to door-3: the
 * door's leaves, closed to open (door-3 is the open doorway: no leaf). busy: the door-status
 * light lit, while the two are inside. The participants are drawn between the door and busy
 * layers, by the same figures as everywhere on the board.
 */
export function capsuleLayers() {
  return {
    back: svg('back', back()),
    ...Object.fromEntries(Array.from({ length: DOOR_FRAMES }, (_, i) => [`door-${i}`, svg(`door-${i}`, leaves(i))])),
    busy: svg('busy', busy()),
  };
}

/**
 * The part of the cabin a panel shows, in scene units: top to bottom, from above the status
 * light over the doorway to the chairs' feet; across, from the left wall to the right.
 */
export const CAPSULE_VIEW = Object.freeze({ top: 140, bottom: 660, left: 32, right: 480 });
/**
 * What a panel too short for the whole view keeps, top to bottom, in scene units: from the status
 * light over the doorway to just below the seated pair's chins (the sitting pose's head is
 * centred at y 504 at the seats' scale).
 */
export const CAPSULE_KEEP = Object.freeze({ top: DOOR.top - DOOR.frame - 4, bottom: 535 });
/** The strip at the panel's foot where the seated participants' name tags go, in CSS px: the pair is framed above it. */
export const TAG_STRIP = 15;

/**
 * How the capsule is framed in its panel (CSS pixels, the panel's inside): its scale k and
 * offset, as frameScene() gives a room's. The scene always covers the panel. Its scale is the
 * larger of covering the panel and fitting CAPSULE_VIEW into it; across, it centres on that view.
 * Up and down, the pair comes first: the whole view, centred, where it fits; otherwise
 * CAPSULE_KEEP (the status light to the pair's chins), centred above the name tags' strip, the
 * floor cropped; and where even that does not fit, the pair's heads just above the strip, the
 * light cropped. At every phone size the pair's heads are whole and above their name tags; at
 * the phones measured the light is too (design/tools/board-v2-check.mjs).
 */
export function frameCapsule({ width, height }) {
  const [w, h] = CAPSULE_SIZE;
  const { top, bottom, left, right } = CAPSULE_VIEW;
  const k = Math.max(width / w, height / h, Math.min(width / (right - left), height / (bottom - top)));
  const tx = Math.min(0, Math.max(width - w * k, width / 2 - (w / 2) * k));
  const room = height - TAG_STRIP;
  const want = height / k >= bottom - top - 0.01 ? height / 2 - ((top + bottom) / 2) * k
    : (CAPSULE_KEEP.bottom - CAPSULE_KEEP.top) * k <= room ? room / 2 - ((CAPSULE_KEEP.top + CAPSULE_KEEP.bottom) / 2) * k
      : room - CAPSULE_KEEP.bottom * k;
  const ty = Math.min(0, Math.max(height - h * k, want));
  return { k, tx, ty };
}

/** The badge's size in its own units (it is drawn 22 CSS pixels square, as a Blackout position number is). */
export const BADGE_SIZE = 48;

/**
 * The capsule's badge: a small capsule with two heads in it, inside an ink disc ringed in caption
 * yellow. It marks the two participants while the board names them (at their places, and on their
 * away markers) and means "in the private talk", nothing more: no microphone, no sound waves, no
 * speech balloon, no side.
 */
export function capsuleBadgeSvg() {
  const c = BADGE_SIZE / 2;
  return recolorCapsule(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BADGE_SIZE} ${BADGE_SIZE}" width="${BADGE_SIZE}" height="${BADGE_SIZE}">
  <g id="capsule-badge">${[
    circle(c, c, c - 3, INK, { stroke: 0 }),
    `<circle cx="${c}" cy="${c}" r="${c - 4.5}" fill="none" stroke="${CAPSULE_ACCENTS.lamp}" stroke-width="3"/>`,
    rect(c - 14, c - 8, 28, 16, S.mid, { stroke: 0, rx: 8 }),
    `<rect x="${c - 14}" y="${c - 8}" width="28" height="16" rx="8" fill="none" stroke="${CAPSULE_ACCENTS.lamp}" stroke-width="2"/>`,
    circle(c - 6.5, c, 3.6, PAPER, { stroke: 0 }),
    circle(c + 6.5, c, 3.6, PAPER, { stroke: 0 }),
  ].join('')}</g>
</svg>
`);
}
