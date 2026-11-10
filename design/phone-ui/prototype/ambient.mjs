// mothership:dev-only
//
// Ambient motion in the rooms (the owner, 9 November 2026): "The monitors and screens look not
// static. Windows of spaceship in any room not static feeling like the spaceship moving in space.
// Some color buttons and lights on/off generally some dynamic environment." Then, of Room A: "Room A
// is fine just for the window i try to create different stars planets effect to make the vast space
// interesting", "Lets create a window for Room B too", and of the rest (10 November 2026): "Yes i am
// happy you can go for all rooms".
//
// A decorative layer drawn in a scene's own coordinates (1024 × 768; the capsule's 512 × 768), placed
// with the same frame as the room's art, just above its back picture and under every person. It
// redraws only what moves: the space seen through a window (a voyage: stars at three depths, dust, a
// galaxy, and things that pass the glass — the room's own planet, giants, moons, a double star, a
// comet, asteroids), the screens (lines that retype, a scrolling trace, a heartbeat, a cursor, a sonar
// ping, an atom's orbits) and small keys, lights, bubbles, light running along pipes and dust in a
// lamp's light. Everything else stays the approved art, except where a window is added: Room B's
// middle screen becomes its window, and its atom diagram moves to the small screen on the right wall.
//
// With the lights out (the Blackout's dark pictures, which cover the whole room) only the windows
// move: the same voyage, dimmed by the night rule's space mix (design/board-v2/scenes/lighting.mjs),
// drawn over the dark picture; every screen and light is off. Room B's window and moved screen are
// drawn there too, in the night colours, so the room keeps its shape in the dark.
//
// It never shows a game fact. It is the same on every phone at every moment, whatever happens in the
// match, and nothing in it depends on a role, a team or a choice. No window ever shows a blue, red or
// lavender world, a black hole, or anything that changes with the ship's course, which is the
// offices' secret. Nothing moves that the game uses to say something: not the Command Room's chart
// table, the Hospital's berth monitors, the Jail's keypad keys and lamp, or the capsule's door light.
// Under Reduce motion it is a still picture. The review renders hold it still at a given time
// (amb=<seconds>); the live prototype (live=1) lets it run.

import { NIGHT, nightMarkup } from '../../board-v2/scenes/lighting.mjs';

const INK = '#151923';
const SPACE = '#10141C';
const PAPER = '#F4EBDD';
const PAPER_SHADE = '#E3D6C2';
const PAPER_DEEP = '#CBBBA2';
// Lights: the rooms' own light colours, never a team's (tokens 0.5.0: Command Room light, Hospital light).
const GOLD = '#EFC62F';
const TEAL = '#57BBA8';
const OFF = '#34415A';
// The far objects: the rooms' own families (tokens 0.5.0), never a team's.
const GOLD_DEEP = '#C4950F';
const GOLD_PALE = '#F9E48C';
const GOLD_SHADOW = '#7A5A0C';
const TEAL_MID = '#1F8A80';
const TEAL_PALE = '#A6DFD0';
const STEEL = { shadow: '#34415A', mid: '#55657E', light: '#8696AE', pale: '#B9C4D3' };

/**
 * A window's voyage: over one loop, things pass the glass right to left at their own depth and speed.
 * home: the room's own planet, which starts in place (so a still frame is the approved art), drifts
 * out (leave, by out %), and comes back from the other side (back, from from %). flybys: at, the scene
 * point each is drawn around; enter/leave, its offsets outside the glass; span, when it crosses, in %
 * of the loop; front, drawn in front of the home planet. dust: halftone clouds; sparkle: a bright star
 * [x, y, scale]; glare: [path, opacity] on the glass.
 */
const VOYAGE_A = {
  period: 90,
  home: { kind: 'room-a', cx: 600, cy: 322, r: 132, leave: [-340, 36], out: 38, back: [340, -30], from: 80 },
  flybys: [
    { kind: 'giant', at: [512, 198], enter: [150, 10], leave: [-150, -10], span: [29, 78] },
    { kind: 'moon', at: [512, 156], enter: [125, 18], leave: [-125, -8], span: [63, 92] },
    { kind: 'comet', at: [512, 150], enter: [200, -36], leave: [-210, 44], span: [9, 40] },
    { kind: 'rocks', at: [500, 236], enter: [170, -20], leave: [-170, 30], span: [50, 61], front: true },
  ],
  dust: { tile: 260, clouds: [
    { d: 'M430 254 C450 224 500 230 520 248 C548 238 590 252 584 278 C560 298 470 300 440 286 C420 278 418 264 430 254 Z', tone: 'teal' },
    { d: 'M560 138 C580 118 640 124 652 146 C670 158 660 186 630 184 C600 190 566 176 560 158 Z', tone: 'ochre' },
    { d: 'M452 150 C462 136 492 138 498 152 C504 166 486 176 468 172 C454 170 446 160 452 150 Z', tone: 'teal', o: 0.7 },
  ] },
  sparkle: [471, 199, 1.71],
  glare: [['M436 176 L496 118 L524 118 L430 210 Z', 0.16], ['M446 232 L560 120 L574 124 L452 246 Z', 0.1]],
};

/** Room B's voyage: its own teal planet, a cream banded giant, two small moons, a comet, asteroids. */
const VOYAGE_B = {
  period: 110,
  home: { kind: 'teal', cx: 430, cy: 330, r: 130, leave: [-320, 40], out: 36, back: [470, -40], from: 78 },
  flybys: [
    { kind: 'banded', at: [512, 184], enter: [175, 8], leave: [-175, -8], span: [24, 70] },
    { kind: 'twins', at: [512, 160], enter: [165, 14], leave: [-165, -10], span: [52, 84] },
    { kind: 'comet', at: [512, 150], enter: [200, -24], leave: [-205, 34], span: [6, 34] },
    { kind: 'rocks', at: [500, 222], enter: [205, -16], leave: [-205, 22], span: [40, 50], front: true },
  ],
  dust: { tile: 300, clouds: [
    { d: 'M560 214 C580 190 630 192 646 214 C664 226 652 252 624 252 C596 258 566 244 560 228 Z', tone: 'teal' },
    { d: 'M396 140 C410 124 456 126 466 144 C480 156 470 176 446 174 C420 178 400 164 396 150 Z', tone: 'ochre' },
    { d: 'M500 236 C508 226 530 228 534 238 C538 248 524 254 512 252 C502 250 496 244 500 236 Z', tone: 'ochre', o: 0.7 },
  ] },
  sparkle: [604, 150, 1.3],
  glare: [['M388 240 L474 128 L502 128 L404 252 Z', 0.1], ['M562 252 L636 156 L646 160 L574 252 Z', 0.07]],
};

/**
 * The Command Room's voyage, across its wide window: its own vast cream world sinks out of sight
 * and rises again (it moves only up and down, so its drawn edges stay hidden behind the frame);
 * meanwhile a comet, a ringed cream giant, a far double star, an asteroid belt and a grey moon pass.
 */
const VOYAGE_C = {
  period: 120,
  home: { kind: 'command', cx: 512, cy: 900, r: 668, leave: [0, 128], out: 30, back: [0, 128], from: 80 },
  flybys: [
    { kind: 'comet', at: [512, 150], enter: [400, -44], leave: [-420, 60], span: [5, 28] },
    { kind: 'ringed', at: [512, 192], enter: [400, -6], leave: [-400, 8], span: [24, 72] },
    { kind: 'binary', at: [512, 138], enter: [380, 6], leave: [-380, -4], span: [40, 92] },
    { kind: 'belt', at: [512, 236], enter: [480, -16], leave: [-480, 20], span: [50, 66], front: true },
    { kind: 'moon', at: [512, 170], enter: [380, 16], leave: [-380, -6], span: [70, 94] },
  ],
  dust: { tile: 640, clouds: [
    { d: 'M262 222 C290 196 350 200 372 222 C398 214 430 230 420 254 C392 270 300 268 272 254 C252 246 250 232 262 222 Z', tone: 'teal' },
    { d: 'M620 140 C640 120 700 124 714 146 C734 158 722 186 690 184 C660 190 626 176 620 158 Z', tone: 'ochre' },
    { d: 'M500 134 C510 120 540 122 546 136 C552 150 534 160 516 156 C502 154 494 144 500 134 Z', tone: 'teal', o: 0.7 },
  ] },
  sparkle: [250, 159, 1.15],
  glare: [['M210 250 L330 130 L362 130 L210 284 Z', 0.14], ['M600 292 L760 130 L776 134 L620 292 Z', 0.1]],
};

/** The Hospital's voyage, in its tall narrow window: its cream world sinks and rises; a comet, a small ringed giant, asteroids and a moon go by. */
const VOYAGE_H = {
  period: 100,
  home: { kind: 'ward', cx: 760, cy: 372, r: 130, leave: [0, 120], out: 30, back: [0, 120], from: 82 },
  flybys: [
    { kind: 'comet', at: [807, 156], enter: [110, -26], leave: [-120, 34], span: [8, 24] },
    { kind: 'ringed', at: [807, 196], enter: [120, 4], leave: [-120, -4], span: [30, 58], scale: 0.62 },
    { kind: 'rocks', at: [800, 240], enter: [130, -10], leave: [-130, 14], span: [46, 54], front: true, scale: 0.7 },
    { kind: 'moon', at: [807, 168], enter: [100, 10], leave: [-100, -6], span: [62, 80] },
  ],
  dust: { tile: 150, clouds: [
    { d: 'M770 236 C786 220 818 222 826 238 C838 248 830 266 808 266 C788 270 772 258 770 246 Z', tone: 'teal' },
    { d: 'M818 142 C830 130 856 132 862 146 C870 156 862 170 846 168 C828 172 818 162 818 152 Z', tone: 'ochre' },
  ] },
  sparkle: [846, 163, 1],
  glare: [['M748 220 L800 126 L822 126 L748 262 Z', 0.14]],
};

/** Room A, from design/source/board/board-room-a.svg and design/board-motion/scenes/room-a.mjs. */
const ROOM_A = {
  // Room A's blues, as the export prints the neutral family.
  tone: { pale: '#A9CAEB', mid: '#2D609E', light: '#5C92CC' },
  windows: [{ shape: 'round', cx: 512, cy: 210, r: 89.8, voyage: VOYAGE_A }],
  monitors: [{ x: 450, y: 318, w: 66, h: 48, tilt: -4, phase: 0 }, { x: 526, y: 312, w: 70, h: 52, tilt: 3, phase: 2.7 }],
  consoles: [{ x: 170, y: 134, w: 102, h: 58, rx: 4, ping: [254, 176] }],
  keys: [{ x: 172, y: 204, w: 22, h: 16, lit: GOLD }, { x: 202, y: 204, w: 22, h: 16, lit: TEAL }, { x: 232, y: 204, w: 22, h: 16, lit: PAPER }],
  // The junction box's three lights (A5), and three status lights added on the desk's front edge (A1).
  lights: [{ cx: 346, cy: 212, r: 2.6, on: GOLD, blink: 'slow' }, { cx: 356, cy: 212, r: 2.6, on: TEAL, blink: 'flicker' }, { cx: 366, cy: 212, r: 2.6, on: PAPER, blink: 'fast' },
    { cx: 449, cy: 400, r: 2.4, on: TEAL, blink: 'slow' }, { cx: 458, cy: 400, r: 2.4, on: GOLD, blink: 'fast' }, { cx: 467, cy: 400, r: 2.4, on: PAPER, blink: 'flicker' }],
};

/**
 * Room B, from design/source/board/board-room-b.svg and design/board-motion/scenes/room-b.mjs. Its
 * middle screen (372–652 × 118–262) becomes a window in the room's own paned style (the slit window's
 * frame: an ink edge, a pale band, an ink line; ink mullions), so the phone's room view shows space.
 * The atom diagram moves to the slit window's place on the right wall, as a small screen.
 */
const ROOM_B = {
  // Room B's purples, as the export prints the neutral family.
  tone: { pale: '#DCB6EE', mid: '#7A3CAD', light: '#AE6CD3', shadow: '#4B2079' },
  windows: [{ shape: 'rect', x: 382, y: 128, w: 260, h: 124, frame: 'paned', voyage: VOYAGE_B,
    // The ceiling's two light cones fall across the window as they fell across the screen.
    cones: [[[300, 58], [462, 58], [580, 640], [250, 640]], [[562, 58], [716, 58], [820, 650], [500, 650]]], coneOpacity: 0.09 }],
  atoms: [{ x: 742, y: 126, w: 130, h: 46 }],
  covers: [{ x: 754, y: 242, w: 104, h: 48, fill: '#4B2079' }],
  bars: [{ d: 'M760 250 H852', len: 92 }, { d: 'M760 266 H832', len: 72 }, { d: 'M760 282 H846', len: 86 }],
  keys: [{ x: 760, y: 218, w: 22, h: 14, lit: GOLD }, { x: 790, y: 218, w: 22, h: 14, lit: TEAL }, { x: 820, y: 218, w: 22, h: 14, lit: PAPER }],
  // The specimen tank's liquid (tank(772, 646) in room-b.mjs): bubbles rise through it.
  bubbles: [{ x: 726, y: 430, w: 92, h: 182 }],
};

/**
 * The Command Room, from design/source/board/board-command-room.svg: the bridge's great window
 * (the glass inside its pale frame), the four console screens under it and the lower row of key
 * lamps. The chart table stays as drawn: nothing on it moves, so it never seems to plot a course.
 */
const COMMAND_ROOM = {
  // The Command Room's golds, as the export prints the neutral family.
  tone: { pale: '#F9E48C', mid: '#C4950F', light: '#EFC62F', shadow: '#7A5A0C' },
  windows: [{ shape: 'path', d: 'M207 118.4 L226.9 107 H797.1 L817 118.4 V281 H207 Z', box: { x: 207, y: 107, w: 610, h: 174 }, voyage: VOYAGE_C,
    // The two mullions and the frame's glint, drawn again over the view, as the art draws them over its glass.
    over: `<rect x="398" y="96" width="16" height="196" fill="#F9E48C" stroke="${INK}" stroke-width="5"/>
      <rect x="610" y="96" width="16" height="196" fill="#F9E48C" stroke="${INK}" stroke-width="5"/>
      <path d="M206 128 L232 108 H300" fill="none" stroke="${PAPER}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    overBoxes: [[395.5, 93.5, 21, 201], [607.5, 93.5, 21, 201]],
    // The ceiling's light falling across the window's middle, as it falls on the art (command-room.mjs).
    cones: [[[300, 40], [724, 40], [724, 560], [300, 560]]], coneOpacity: 0.08 }],
  texts: [{ x: 196, y: 326, w: 96, h: 36, rx: 4 }, { x: 318, y: 326, w: 96, h: 36, rx: 4 }, { x: 584, y: 326, w: 96, h: 36, rx: 4 }, { x: 706, y: 326, w: 96, h: 36, rx: 4 }],
  keys: [446, 472, 498, 524, 550].map((x, i) => ({ x, y: 350, w: 18, h: 10, lit: [TEAL, PAPER][i % 2], unlit: '#F9E48C' })),
};

/**
 * The Hospital's four-bed ward (apps/game/hosted/board-v2-film-art/scenes/hospital-ward-four.back.svg):
 * its tall window, the wall's heart monitor and the two keys under it, and the ceiling's vent and small light.
 * The berths' own monitors and lamps stay as drawn: they belong to whoever lies there, so they never
 * change by themselves.
 */
const HOSPITAL = {
  // The Hospital's teals, as the export prints the neutral family.
  tone: { pale: '#A6DFD0', mid: '#1F8A80', light: '#57BBA8', shadow: '#155B58' },
  windows: [{ shape: 'rect', x: 751, y: 131, w: 112, h: 160, rx: 5, voyage: VOYAGE_H }],
  ecgs: [{ x: 172, y: 142, w: 106, h: 72, rx: 5, base: 182, from: 180 }],
  keys: [{ x: 174, y: 226, w: 22, h: 14, lit: GOLD, unlit: PAPER }, { x: 204, y: 226, w: 22, h: 14, lit: PAPER, unlit: '#A6DFD0' }],
  // The ceiling's air vent between the lamps turns, and the small light beside it blinks: what a phone's view keeps in sight.
  fans: [{ cx: 512, cy: 45, rx: 18, ry: 5.5 }],
  lights: [{ cx: 540, cy: 37, r: 3, on: GOLD, off: '#A6DFD0', blink: 'slow', ink: 1.5 }],
};

/**
 * The Jail, from design/source/board/board-jail.svg and design/board-motion/scenes/jail.mjs. No
 * window. Its keypad waits with a blinking cursor (its keys never light: that would read as someone
 * keying the code), the door's display keeps a slow standby scan, light runs along the pipes and dust
 * drifts in the lamp's cone. The lamp itself stays as drawn.
 */
const JAIL = {
  tone: { pale: '#F6A78F', mid: '#BE2D26', light: '#E85C44', shadow: '#7E1B19' },
  cursors: [{ x: 754, y: 196, w: 42, h: 22, rx: 3, d: 'M760 207 H778' }],
  scans: [{ x: 478, y: 153, len: 68 }],
  glints: [{ x0: 698, x1: 884, y: 126, d: 0 }, { x0: 698, x1: 884, y: 148, d: -3.4 }],
  motes: { cone: [[470, 62], [554, 62], [664, 600], [360, 600]], n: 16, seed: 0x6a11 },
};

/**
 * The private-talk capsule (design/board-v2/scenes/capsule.mjs, 512 × 768): the three lamps of the
 * control panel on its right wall blink, two of its keys light in turn and dust drifts in the lamp's
 * light. The lamp stays steady, and the door-status light over the doorway is the game's (busy.svg)
 * and never changes by itself.
 */
const CAPSULE = {
  size: [512, 768],
  z: 1,
  keyStep: 1.6,
  // The capsule's navy, as CAPSULE_RECOLOR prints the neutral family.
  tone: { pale: '#9C9CD9', mid: '#303F80', light: '#5763A9', shadow: '#1B2A57' },
  lights: [0, 1, 2].map(i => ({ cx: 464 + i * 9, cy: 206 - i * 4.5, r: 3.2, on: [GOLD, TEAL, PAPER][i], off: i ? '#5763A9' : '#9C9CD9', blink: ['slow', 'flicker', 'fast'][i], ink: 1.3 })),
  keys: [0, 2].map((c, i) => ({ points: [[461 + c * 9, 222 - c * 4.5], [467 + c * 9, 219 - c * 4.5], [467 + c * 9, 228 - c * 4.5], [461 + c * 9, 231 - c * 4.5]], lit: [GOLD, TEAL][i], unlit: '#303F80', ink: 1.2 })),
  // Dust drifting in the lamp's cone over the table (lamp() in capsule.mjs), the one movement a phone's view always shows.
  motes: { cone: [[214, 132], [298, 132], [372, 578], [140, 578]], n: 12, seed: 0xca95 },
};

export const AMBIENT_ROOMS = Object.freeze({ 'room-a': ROOM_A, 'room-b': ROOM_B, 'command-room': COMMAND_ROOM, hospital: HOSPITAL, jail: JAIL, capsule: CAPSULE });

let seq = 0;
const f = n => Number(n.toFixed(2));

/** A small deterministic random sequence, so every phone draws the same sky. */
function random(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Halftone patterns as the approved art draws them (9 px cells at 45°). */
const halftone = (id, r, fill) => `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="4.5" cy="4.5" r="${r}" fill="${fill}"/></pattern>`;

const boxOf = v => (v.shape === 'round' ? { x: v.cx - v.r, y: v.cy - v.r, w: 2 * v.r, h: 2 * v.r } : v.shape === 'path' ? v.box : { x: v.x, y: v.y, w: v.w, h: v.h });

/** A window's glass, as a clip's shape: a round port, a (rounded) rectangle or the drawn outline. */
const glassShape = v => (v.shape === 'round' ? `<circle cx="${v.cx}" cy="${v.cy}" r="${v.r}"/>` : v.shape === 'path' ? `<path d="${v.d}"/>`
  : `<rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}"${v.rx ? ` rx="${v.rx}"` : ''}/>`);

/** The planet's limb in Room A's window, as drawn; its bands drift so it seems to turn. */
function planetRoomA(clip) {
  return `<g class="amb-bob">
    <circle cx="600" cy="322" r="132" fill="${PAPER_DEEP}"/>
    <path d="M478 286 C500 236 552 202 612 198 C566 220 534 252 520 300 C514 322 514 342 520 362 L470 340 Z" fill="${PAPER}"/>
    <path d="M540 214 C600 200 660 222 700 268 L720 420 L560 430 C600 380 610 300 540 214 Z" fill="url(#${clip.ht}-m)"/>
    <path d="M610 230 C660 236 700 268 716 316 L740 440 L640 440 C676 380 672 290 610 230 Z" fill="url(#${clip.ht}-l)"/>
    <g clip-path="url(#${clip.id})"><g class="amb-bands">
      <path d="M486 300 C530 280 590 276 650 290" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M500 330 C540 316 590 312 640 322" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    </g></g>
    <circle cx="600" cy="322" r="132" fill="none" stroke="${INK}" stroke-width="5"/>
  </g>`;
}

/** Room B's own planet: teal, lit from the upper left, its bands drifting so it seems to turn. */
function planetTeal(clip, { cx, cy, r }) {
  return `<g class="amb-bob">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${TEAL}"/>
    <g clip-path="url(#${clip.id})">
      <g class="amb-bands">
        <path d="M${cx - 116} ${cy - 92} C${cx - 40} ${cy - 120} ${cx + 40} ${cy - 122} ${cx + 116} ${cy - 96}" fill="none" stroke="${TEAL_MID}" stroke-width="5" stroke-linecap="round"/>
        <path d="M${cx - 126} ${cy - 56} C${cx - 40} ${cy - 84} ${cx + 40} ${cy - 86} ${cx + 128} ${cy - 62}" fill="none" stroke="${TEAL_MID}" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>
        <path d="M${cx - 128} ${cy - 22} C${cx - 40} ${cy - 46} ${cx + 40} ${cy - 48} ${cx + 132} ${cy - 26}" fill="none" stroke="${TEAL_PALE}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
      </g>
      <path d="M${cx - 98} ${cy - 82} C${cx - 62} ${cy - 118} ${cx - 12} ${cy - 132} ${cx + 38} ${cy - 124}" fill="none" stroke="${TEAL_PALE}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
      <path d="M${cx + 30} ${cy - 132} C${cx + 100} ${cy - 112} ${cx + 140} ${cy - 50} ${cx + 136} ${cy + 20} L${cx + 152} ${cy + 20} L${cx + 152} ${cy - 142} Z" fill="url(#${clip.ht}-m)"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="5"/>
  </g>`;
}

/** The Command Room's world, as drawn: a vast cream planet across the window's foot; its bands drift so it seems to turn. */
function planetCommand(clip) {
  return `<g class="amb-bob">
    <circle cx="512" cy="900" r="668" fill="${PAPER_DEEP}" stroke="${INK}" stroke-width="5"/>
    <path d="M190 300 V282 C330 232 420 226 512 226 C604 226 694 232 834 282 V300 Z" fill="${PAPER}"/>
    <path d="M190 300 V292 C340 250 430 246 512 246 C594 246 684 250 834 292 V300 Z" fill="${PAPER_DEEP}"/>
    <path d="M560 252 C680 256 770 276 834 300 H560 Z" fill="url(#${clip.ht}-m)"/>
    <path d="M700 266 C760 276 800 286 834 300 H700 Z" fill="url(#${clip.ht}-l)"/>
    <g clip-path="url(#${clip.id})"><g class="amb-bands">
      <path d="M240 286 C330 266 420 258 500 258 M300 296 C380 282 440 276 520 274" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    </g></g>
  </g>`;
}

/** The Hospital's world, as drawn in the ward's window: a cream planet's limb, lit from above, shaded at the right. */
function planetWard(clip) {
  return `<g class="amb-bob">
    <circle cx="760" cy="372" r="130" fill="${PAPER_DEEP}" stroke="${INK}" stroke-width="5"/>
    <path d="M742 246 C790 240 838 262 872 300 H742 Z" fill="${PAPER}"/>
    <path d="M742 262 C790 256 832 274 860 300 H742 Z" fill="${PAPER_DEEP}"/>
    <path d="M800 262 C836 272 858 286 872 304 H800 Z" fill="url(#${clip.ht}-m)"/>
  </g>`;
}

/** Each window's own world, by kind. */
const HOMES = Object.freeze({
  'room-a': clip => planetRoomA(clip),
  teal: (clip, home) => planetTeal(clip, home),
  command: clip => planetCommand(clip),
  ward: clip => planetWard(clip),
});

/** Stars in three depths, drifting right to left at three speeds, each tile drawn twice so it loops. */
function starfield(b, rand) {
  const x0 = b.x - 2, y0 = b.y - 2, sw = b.w + 4, sh = b.h + 4, tile = Math.ceil(sw) + 8;
  // As many stars for the glass's area as Room A's port holds (about 180 × 180), so a wide or a narrow window is as full.
  const area = (b.w * b.h) / 32400, fill = Math.abs(area - 1) < 0.2 ? 1 : area;
  const layers = [
    { n: 26, r: [0.7, 1.1], o: 0.6, dur: 84 },
    { n: 13, r: [1.1, 1.6], o: 0.85, dur: 42 },
    { n: 6, r: [1.7, 2.3], o: 1, dur: 20 },
  ];
  return layers.map((L, li) => {
    const stars = Array.from({ length: Math.max(2, Math.round(L.n * fill)) }, (_, i) => {
      const x = x0 + rand() * tile, y = y0 + rand() * sh, r = L.r[0] + rand() * (L.r[1] - L.r[0]);
      const tw = li > 0 && i % 3 === 0 ? ` class="amb-twinkle" style="--d:${f(2.4 + rand() * 2.2)}s;--o:${f(-rand() * 4)}s"` : '';
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"${tw}/>`;
    }).join('');
    const extra = li === 0 ? galaxy(x0 + tile * 0.28, y0 + sh * 0.3) : li === 1 ? [0.18, 0.66].map((u, k) => sparkle(x0 + tile * u, y0 + sh * (k ? 0.24 : 0.7), k ? 0.8 : 1)).join('') : '';
    return `<g class="amb-drift" style="--dur:${L.dur}s;--dx:-${tile}px" fill="${PAPER}" opacity="${L.o}">${stars}${extra}<g transform="translate(${tile} 0)">${stars}${extra}</g></g>`;
  }).join('');
}

/** A distant galaxy: a bright core and two arms, seen at a slant. */
function galaxy(x, y) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(-24) scale(1 0.42)">
    <circle r="10" fill="${PAPER}" opacity="0.12"/>
    <path d="M0 0 C4 -6 13 -7 18 -1 M0 0 C-4 6 -13 7 -18 1" fill="none" stroke="${PAPER_DEEP}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>
    <circle r="2.6" fill="${PAPER}"/>
  </g>`;
}

/** A bright star with four points, twinkling. */
const sparkle = (x, y, s = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path class="amb-sparkle" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill="${PAPER}"/></g>`;

/** Dust clouds in halftone dots, teal and ochre, drifting slower than the farthest stars. */
function dust(V, p) {
  const { tile, clouds } = V.dust;
  const all = clouds.map(c => `<path d="${c.d}" fill="url(#${p}-dust-${c.tone})"${c.o ? ` opacity="${c.o}"` : ''}/>`).join('');
  return `<g class="amb-drift" style="--dur:${V.period}s;--dx:-${tile}px">${all}<g transform="translate(${tile} 0)">${all}</g></g>`;
}

/** The things a window's voyage passes, each drawn around (0, 0), comic ink like the room. */
const PASSERS = {
  giant: p => `<path d="M-46 0 A46 10 0 0 1 46 0" fill="none" stroke="${INK}" stroke-width="5" transform="rotate(-14)"/>
    <path d="M-46 0 A46 10 0 0 1 46 0" fill="none" stroke="${PAPER}" stroke-width="2.6" transform="rotate(-14)"/>
    <circle r="22" fill="${GOLD}"/>
    <g clip-path="url(#${p}-giant)">
      <path d="M-24 -9 C-8 -12 8 -12 24 -9" fill="none" stroke="${GOLD_DEEP}" stroke-width="4"/>
      <path d="M-24 3 C-8 0 8 0 24 3" fill="none" stroke="${GOLD_DEEP}" stroke-width="3"/>
      <path d="M-24 13 C-8 11 8 11 24 13" fill="none" stroke="${GOLD_SHADOW}" stroke-width="2.4" opacity="0.8"/>
      <circle cx="10" cy="9" r="22" fill="url(#${p}-ht-s)"/>
      <path d="M-15 -10 A18 18 0 0 1 2 -19" fill="none" stroke="${GOLD_PALE}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <circle r="22" fill="none" stroke="${INK}" stroke-width="3"/>
    <path d="M-46 0 A46 10 0 0 0 46 0" fill="none" stroke="${INK}" stroke-width="5" transform="rotate(-14)"/>
    <path d="M-46 0 A46 10 0 0 0 46 0" fill="none" stroke="${PAPER}" stroke-width="2.6" transform="rotate(-14)"/>`,
  // A cream giant in bands, with an ochre storm, no rings.
  banded: p => `<circle r="26" fill="${PAPER_SHADE}"/>
    <g clip-path="url(#${p}-banded)">
      <path d="M-28 -12 C-10 -15 10 -15 28 -12" fill="none" stroke="${PAPER_DEEP}" stroke-width="5"/>
      <path d="M-28 -1 C-10 -4 10 -4 28 -1" fill="none" stroke="${GOLD_DEEP}" stroke-width="3" opacity="0.7"/>
      <path d="M-28 10 C-10 7 10 7 28 10" fill="none" stroke="${PAPER_DEEP}" stroke-width="5"/>
      <path d="M-28 19 C-10 17 10 17 28 19" fill="none" stroke="${GOLD_SHADOW}" stroke-width="2.4" opacity="0.6"/>
      <ellipse cx="8" cy="5" rx="6.5" ry="3.6" fill="${GOLD_DEEP}" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="12" cy="11" r="26" fill="url(#${p}-ht-s)"/>
      <path d="M-18 -12 A21 21 0 0 1 0 -22" fill="none" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <circle r="26" fill="none" stroke="${INK}" stroke-width="3"/>`,
  moon: p => `<circle r="13" fill="${STEEL.pale}"/>
    <g clip-path="url(#${p}-moon)">
      <circle cx="-4" cy="-3" r="3" fill="${STEEL.light}" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="5" cy="4" r="2.2" fill="${STEEL.light}" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="-3" cy="7" r="1.5" fill="${STEEL.light}" stroke="${INK}" stroke-width="1"/>
      <circle cx="7" cy="6" r="13" fill="url(#${p}-ht-s)"/>
    </g>
    <circle r="13" fill="none" stroke="${INK}" stroke-width="2.5"/>`,
  // Two small moons, a grey one cratered and a cream one in shade.
  twins: p => `<g transform="translate(-12 2)"><circle r="9" fill="${STEEL.pale}"/>
      <circle cx="-2" cy="-2" r="2.2" fill="${STEEL.light}" stroke="${INK}" stroke-width="1"/><circle cx="3" cy="3" r="1.5" fill="${STEEL.light}" stroke="${INK}" stroke-width="1"/>
      <circle r="9" fill="none" stroke="${INK}" stroke-width="2.2"/></g>
    <g transform="translate(15 -8)"><circle r="5.5" fill="${PAPER_DEEP}"/><circle cx="1.6" cy="1.6" r="5.5" fill="url(#${p}-ht-s)" clip-path="url(#${p}-twin)"/>
      <circle r="5.5" fill="none" stroke="${INK}" stroke-width="2"/></g>`,
  comet: p => `<g transform="rotate(-11)"><path d="M0 -3.4 C20 -4.2 44 -2.6 74 -0.6 L74 0.6 C44 2.6 20 4.2 0 3.4 Z" fill="url(#${p}-tail)"/></g>
    <circle r="7.5" fill="${TEAL_PALE}" opacity="0.25"/>
    <circle r="3.3" fill="${PAPER}"/>`,
  rocks: () => rocksOf([[-34, -6, 9, 7, 'cw'], [0, 8, 13, 11, 'ccw'], [30, -12, 6, 5, 'cw'], [54, 14, 5, 6, 'ccw']]),
  // A long belt of tumbling rocks, for the Command Room's wide window.
  belt: () => rocksOf([[-150, -4, 7, 8, 'cw'], [-104, 10, 10, 6, 'ccw'], [-60, -10, 6, 5, 'cw'], [-18, 6, 12, 9, 'ccw'], [26, -8, 8, 7, 'cw'], [70, 12, 9, 6, 'ccw'], [112, -6, 5, 5, 'cw'], [150, 8, 7, 8, 'ccw']]),
  // A cream world in ochre bands, its pale teal ring tilted the other way from Room A's giant.
  ringed: p => `<path d="M-58 0 A58 12 0 0 1 58 0" fill="none" stroke="${INK}" stroke-width="5" transform="rotate(16)"/>
    <path d="M-58 0 A58 12 0 0 1 58 0" fill="none" stroke="${TEAL_PALE}" stroke-width="2.6" transform="rotate(16)"/>
    <circle r="30" fill="${PAPER}"/>
    <g clip-path="url(#${p}-ringed)">
      <path d="M-32 -14 C-12 -18 12 -18 32 -14" fill="none" stroke="${GOLD_DEEP}" stroke-width="5" opacity="0.75"/>
      <path d="M-32 0 C-12 -3 12 -3 32 0" fill="none" stroke="${PAPER_DEEP}" stroke-width="6"/>
      <path d="M-32 14 C-12 11 12 11 32 14" fill="none" stroke="${GOLD_DEEP}" stroke-width="3.5" opacity="0.6"/>
      <circle cx="13" cy="11" r="30" fill="url(#${p}-ht-s)"/>
    </g>
    <circle r="30" fill="none" stroke="${INK}" stroke-width="3"/>
    <path d="M-58 0 A58 12 0 0 0 58 0" fill="none" stroke="${INK}" stroke-width="5" transform="rotate(16)"/>
    <path d="M-58 0 A58 12 0 0 0 58 0" fill="none" stroke="${TEAL_PALE}" stroke-width="2.6" transform="rotate(16)"/>`,
  // A far double star: two small suns turning slowly round each other.
  binary: () => `<g class="amb-spin" style="--dur:40s">
      <g transform="translate(-9 0)"><circle r="8" fill="${GOLD_PALE}" opacity="0.18"/><path d="${star4(5)}" fill="${PAPER}"/></g>
      <g transform="translate(9 0)"><circle r="6" fill="${TEAL_PALE}" opacity="0.18"/><path d="${star4(3.6)}" fill="${GOLD_PALE}"/></g>
    </g>`,
};

/** A four-pointed star of radius r. */
function star4(r) {
  const k = r / 7;
  return `M0 ${f(-7 * k)} L${f(1.8 * k)} ${f(-1.8 * k)} L${f(7 * k)} 0 L${f(1.8 * k)} ${f(1.8 * k)} L0 ${f(7 * k)} L${f(-1.8 * k)} ${f(1.8 * k)} L${f(-7 * k)} 0 L${f(-1.8 * k)} ${f(-1.8 * k)} Z`;
}

/** Rocks, each [x, y, size, seconds per turn, direction], tumbling as they go. */
function rocksOf(list) {
  return list.map(([x, y, s, dur, dir], i) => {
    const pts = Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2, rr = s * (0.78 + ((k * 37 + i * 11) % 9) / 30); return `${f(Math.cos(a) * rr)},${f(Math.sin(a) * rr)}`; }).join(' ');
    return `<g transform="translate(${x} ${y})"><g class="amb-spin" data-dir="${dir}" style="--dur:${dur}s">
      <polygon points="${pts}" fill="${i % 2 ? STEEL.mid : STEEL.light}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${f(s * 0.2)}" cy="${f(s * 0.15)}" r="${f(s * 0.22)}" fill="${STEEL.shadow}"/>
      <path d="M${f(-s * 0.6)} ${f(-s * 0.2)} Q${f(-s * 0.4)} ${f(-s * 0.6)} 0 ${f(-s * 0.7)}" fill="none" stroke="${STEEL.pale}" stroke-width="1.6" stroke-linecap="round"/>
    </g></g>`;
  }).join('');
}

/** The keyframes of one window's voyage: each passer crosses once a loop; the room's planet leaves and returns. */
function voyageCss(V, w) {
  const { period, home, flybys } = V;
  const t = ([x, y]) => `translate(${x}px, ${y}px)`;
  let css = `@keyframes ${w}-home { 0% { transform: translate(0, 0); animation-timing-function: ease-in; } ${home.out}% { transform: ${t(home.leave)}; } ${home.out + 0.01}%, ${home.from}% { transform: ${t(home.back)}; animation-timing-function: ease-out; } 100% { transform: translate(0, 0); } }
  .amb .${w}-home { animation: ${w}-home ${period}s linear infinite; }`;
  flybys.forEach((fb, k) => {
    css += `@keyframes ${w}-fly${k} { 0%, ${fb.span[0]}% { transform: ${t(fb.enter)}; } ${fb.span[1]}%, 100% { transform: ${t(fb.leave)}; } }
    .amb .${w}-fly${k} { animation: ${w}-fly${k} ${period}s linear infinite; }`;
  });
  return `<style>${css}</style>`;
}

/** A paned window's frame in the room's own style (Room B's slit window): ink, a pale band, ink; ink mullions. */
function panedFrame(v, tone, p, i) {
  const { x, y, w, h } = v;
  const cones = (v.cones ?? []).map(pts => `<polygon points="${pts.map(q => q.join(',')).join(' ')}" fill="${PAPER}" opacity="${v.coneOpacity}"/>`).join('');
  const mullions = `M${f(x + w / 3)} ${y} V${y + h} M${f(x + (2 * w) / 3)} ${y} V${y + h}`;
  return `<path d="${mullions}" stroke="${INK}" stroke-width="10"/>
    <path d="${mullions}" stroke="${tone.pale}" stroke-width="4"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${tone.pale}" stroke-width="16"/>
    <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="none" stroke="${INK}" stroke-width="5"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="5"/>
    ${cones ? `<g clip-path="url(#${p}-frame${i})">${cones}</g>` : ''}`;
}

/**
 * One window: the glass, its voyage, its glare and what the art draws over its glass (mullions, a
 * light cone) or, for an added window, its frame. With the lights out (night) the voyage is dimmed
 * by the night rule's space mix and what is drawn over it takes the night colours.
 */
function windowView(v, p, i, rand, tone, night = false) {
  const b = boxOf(v), V = v.voyage, w = `${p}-w${i}`;
  const clip = { id: `${p}-home${i}`, ht: `${p}-ht` };
  const passers = V.flybys.map((fb, k) => {
    const art = PASSERS[fb.kind](p);
    return { front: Boolean(fb.front), svg: `<g transform="translate(${fb.at[0]} ${fb.at[1]})"><g class="${w}-fly${k}">${fb.scale ? `<g transform="scale(${fb.scale})">${art}</g>` : art}</g></g>` };
  });
  const home = HOMES[V.home.kind](clip, V.home);
  const [m1x, m1y] = [f(b.x + b.w * 1.02), f(b.y + b.h * 0.045)], [m2x, m2y] = [f(b.x + b.w * 0.94), f(b.y + b.h * 0.7)];
  const cones = !night && v.frame !== 'paned' && v.cones ? `<g clip-path="url(#${p}-cone${i})">${v.cones.map(pts => `<polygon points="${pts.map(q => q.join(',')).join(' ')}" fill="${PAPER}" opacity="${v.coneOpacity}"/>`).join('')}</g>` : '';
  return `${voyageCss(V, w)}<g clip-path="url(#${p}-glass${i})">
    ${v.shape === 'round' ? `<circle cx="${v.cx}" cy="${v.cy}" r="${v.r + 8}" fill="${SPACE}"/>` : `<rect x="${b.x - 8}" y="${b.y - 8}" width="${b.w + 16}" height="${b.h + 16}" fill="${SPACE}"/>`}
    ${dust(V, p)}
    ${starfield(b, rand)}
    ${sparkle(...V.sparkle)}
    <g class="amb-meteor"><path d="M${m1x} ${m1y} l-28 13" stroke="${PAPER}" stroke-width="2.4" stroke-linecap="round"/><path d="M${f(m1x - 28)} ${f(m1y + 13)} l-30 14" stroke="${PAPER}" stroke-width="1.4" stroke-linecap="round" opacity="0.45"/></g>
    <g class="amb-meteor2"><path d="M${m2x} ${m2y} l-26 9" stroke="${PAPER}" stroke-width="2" stroke-linecap="round"/><path d="M${f(m2x - 26)} ${f(m2y + 9)} l-26 9" stroke="${PAPER}" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/></g>
    ${passers.filter(x => !x.front).map(x => x.svg).join('')}
    <g class="${w}-home">${home}</g>
    ${passers.filter(x => x.front).map(x => x.svg).join('')}
    ${V.glare.map(([d, o]) => `<path d="${d}" fill="${PAPER}" opacity="${o}"/>`).join('')}${night ? `
    <rect x="${b.x - 8}" y="${b.y - 8}" width="${b.w + 16}" height="${b.h + 16}" fill="${NIGHT.low}" opacity="${f(1 - NIGHT.space)}"/>` : ''}
  </g>
  ${v.over ? (night ? nightMarkup(v.over) : v.over) : ''}${cones}
  ${v.frame === 'paned' ? (night ? nightMarkup(panedFrame({ ...v, cones: null }, tone, p, i)) : panedFrame(v, tone, p, i)) : ''}`;
}

/** A desk monitor's screen (kit.mjs monitor()): its lines retype, its trace scrolls, a cursor blinks. */
function monitorScreen(m, tone, p, i) {
  const { x, y, w, h } = m;
  const sx = x + 6, sy = y + 6, sw = w - 12, sh = h - 12;
  const lines = [[y + 16, w * 0.62], [y + 26, w * 0.78], [y + 36, w * 0.45]];
  const id = `${p}-scr${i}`;
  const chartX = x + w * 0.58, period = 28, rise = [3, 11, 6, 9];
  const zig = Array.from({ length: 13 }, (_, k) => `${k ? 'L' : 'M'}${f(chartX + k * 7)} ${f(y + h - 12 - rise[k % 4])}`).join(' ');
  return `<g transform="rotate(${m.tilt} ${x + w / 2} ${y + h})">
    <clipPath id="${id}"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="2"/></clipPath>
    <g clip-path="url(#${id})">
      <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${tone.pale}"/>
      ${lines.map(([ly, lw], k) => { const len = f(lw - 12); return `<path class="amb-type" style="--len:${len}px;--d:${f(-m.phase - k * 0.45)}s" d="M${x + 12} ${ly} H${f(x + lw)}" stroke="${tone.mid}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${len} ${len}"/>`; }).join('')}
      <rect class="amb-cursor" style="--d:${f(-m.phase)}s" x="${f(x + w * 0.45 + 4)}" y="${y + 32}" width="4" height="8" fill="${tone.mid}"/>
      <g clip-path="url(#${id}c)"><g class="amb-trace" style="--dx:-${period}px;--d:${f(-m.phase)}s"><path d="${zig}" fill="none" stroke="${tone.light}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></g>
      <clipPath id="${id}c"><rect x="${f(chartX)}" y="${y + h - 30}" width="${f(x + w - 12 - chartX)}" height="22"/></clipPath>
      <path d="M${sx} ${sy} H${f(x + w * 0.42)} L${sx} ${f(y + h * 0.6)} Z" fill="${PAPER}" opacity="0.45"/>
    </g>
  </g>`;
}

/** A wall console's dark screen: its marks change length, a sonar ping rings out from its dial. */
function consoleScreen(c, p, i) {
  const id = `${p}-con${i}`;
  const [px, py] = c.ping;
  const marks = [[c.y + 16, 55], [c.y + 28, 71], [c.y + 40, 33]];
  return `<clipPath id="${id}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx}"/></clipPath>
  <g clip-path="url(#${id})">
    <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${SPACE}"/>
    ${marks.map(([my, mw], k) => `<path class="amb-bar amb-bar${k}" style="--len:${mw}px" d="M${c.x + 11} ${my} H${c.x + 11 + mw}" stroke="${PAPER}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${mw} ${mw}"/>`).join('')}
    <circle cx="${px}" cy="${py}" r="5.5" fill="none" stroke="${PAPER}" stroke-width="2.5"/>
    <circle class="amb-ping" cx="${px}" cy="${py}" r="5.5" fill="none" stroke="${PAPER}" stroke-width="2"/>
    <circle class="amb-dot" cx="${px}" cy="${py}" r="1.6" fill="${PAPER}"/>
  </g>
  <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.rx}" fill="none" stroke="${INK}" stroke-width="3"/>`;
}

/** A small dark screen with an atom whose orbits turn (Room B's diagram, moved to the right wall). */
function atomScreen(a, tone) {
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  return `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${SPACE}"/>
    <path d="M${a.x + 10} ${a.y + 12} H${a.x + 30} M${a.x + 10} ${a.y + 20} H${a.x + 24} M${a.x + a.w - 32} ${a.y + a.h - 10} H${a.x + a.w - 10}" stroke="${tone.light}" stroke-width="2.5" stroke-linecap="round"/>
    <g class="amb-spin" style="--dur:24s"><g fill="none" stroke="${PAPER}" stroke-width="2">
      <ellipse cx="${cx}" cy="${cy}" rx="24" ry="8"/>
      <ellipse cx="${cx}" cy="${cy}" rx="24" ry="8" transform="rotate(60 ${cx} ${cy})"/>
      <ellipse cx="${cx}" cy="${cy}" rx="24" ry="8" transform="rotate(120 ${cx} ${cy})"/>
    </g></g>
    <circle class="amb-sparkle" cx="${cx}" cy="${cy}" r="3.6" fill="${PAPER}"/>
    <rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="none" stroke="${INK}" stroke-width="5"/>`;
}

/** Panel lines that change length (a readout), over a cover of the panel's own colour. */
function bars(list, cover, tone) {
  return `${cover.map(c => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${c.fill}"/>`).join('')}
    ${list.map((b, k) => `<path class="amb-bar amb-bar${k}" style="--len:${b.len}px" d="${b.d}" stroke="${tone.light}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${b.len} ${b.len}"/>`).join('')}`;
}

/** Bubbles rising through a tank's liquid, each at its own pace. */
function bubbles(t, p, i) {
  const id = `${p}-tank${i}`;
  const list = [[0.22, 4, 5.2, 0], [0.48, 3, 6.4, -2.1], [0.7, 3.5, 4.6, -3.3], [0.34, 2.6, 5.8, -1.2], [0.58, 2.2, 4.2, -0.6], [0.8, 2.8, 6.9, -4.4], [0.14, 2.4, 5.5, -2.8]];
  return `<clipPath id="${id}"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}"/></clipPath>
    <g clip-path="url(#${id})">${list.map(([u, r, dur, d]) => `<circle class="amb-bubble" style="--dur:${dur}s;--d:${d}s;--rise:-${t.h + 12}px" cx="${f(t.x + t.w * u)}" cy="${t.y + t.h + 6}" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="1.5" opacity="0.9"/>`).join('')}</g>`;
}

/** Keys that light one after another, each in its own colour; at rest each is its drawn colour. A key is a rectangle or a drawn quad (points). */
function keys(list, tone, step = 0.9) {
  const period = list.length * step;
  return list.map((k, i) => {
    const unlit = k.unlit ?? tone.light;
    const style = `--lit:${k.lit};--unlit:${unlit};--dur:${f(period)}s;--d:${f(-((list.length - i) % list.length) * step)}s`;
    return k.points
      ? `<polygon class="amb-key" style="${style}" points="${k.points.map(q => q.join(',')).join(' ')}" fill="${unlit}" stroke="${INK}" stroke-width="${k.ink ?? 2.5}" stroke-linejoin="round"/>`
      : `<rect class="amb-key" style="${style}" x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="2" fill="${unlit}" stroke="${INK}" stroke-width="${k.ink ?? 2.5}"/>`;
  }).join('');
}

/** Small indicator lights: a soft glow and a core, on and off. */
function lights(list) {
  return list.map(l => `<g class="amb-led amb-led-${l.blink}" style="--on:${l.on};--off:${l.off ?? OFF}">
    <circle class="amb-led-glow" cx="${l.cx}" cy="${l.cy}" r="${f(l.r * 2.4)}" fill="${l.on}"/>
    <circle class="amb-led-core" cx="${l.cx}" cy="${l.cy}" r="${l.r}" fill="${l.on}"${l.ink ? ` stroke="${INK}" stroke-width="${l.ink}"` : ''}/>
  </g>`).join('');
}

/** A console's small dark screen (the Command Room's four): its two drawn lines retype, a cursor blinks after them. */
function textScreen(s, i) {
  const { x, y, w, h, rx } = s;
  // As drawn: two lines, 42 and 62 long, 10 in from the screen's left edge.
  const lines = [[y + 12, 42], [y + 24, 62]];
  return `<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" rx="${rx}" fill="${SPACE}"/>
    ${lines.map(([ly, len], k) => `<path class="amb-type" style="--len:${len}px;--d:${f(-(i * 1.7) - k * 0.5)}s" d="M${x + 10} ${ly} H${x + 10 + len}" stroke="${PAPER}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${len} ${len}"/>`).join('')}
    <rect class="amb-cursor" style="--d:${f(-i * 0.4)}s" x="${x + 78}" y="${y + 20}" width="4" height="8" fill="${PAPER}"/>`;
}

/** The ward's heart monitor: its drawn trace runs on, a beat every 1.2 s (the beat as drawn, flat between). */
function ecgScreen(e, p, i) {
  const id = `${p}-ecg${i}`, step = 90, b = e.base;
  const beat = x => `M${x} ${b} H${x + 26} L${x + 34} ${b - 22} L${x + 44} ${b + 18} L${x + 54} ${b - 10} L${x + 62} ${b} H${x + step}`;
  const d = [-1, 0, 1, 2].map(k => beat(e.from + k * step)).join(' ');
  return `<clipPath id="${id}"><rect x="${e.x + 1.5}" y="${e.y + 1.5}" width="${e.w - 3}" height="${e.h - 3}" rx="${e.rx}"/></clipPath>
    <rect x="${e.x + 1.5}" y="${e.y + 1.5}" width="${e.w - 3}" height="${e.h - 3}" rx="${e.rx}" fill="${SPACE}"/>
    <g clip-path="url(#${id})"><g class="amb-scroll" style="--dur:1.2s;--dx:-${step}px"><path d="${d}" fill="none" stroke="${PAPER}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
}

/** A keypad's small screen waiting for a code: its drawn dash blinks as a cursor. */
function cursorScreen(c) {
  return `<rect x="${c.x + 1.25}" y="${c.y + 1.25}" width="${c.w - 2.5}" height="${c.h - 2.5}" rx="${c.rx}" fill="${SPACE}"/>
    <path class="amb-cursor" style="--d:0s" d="${c.d}" fill="none" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>`;
}

/** A display's standby scan: a short light running to and fro along its drawn line. */
const scanLine = s => `<path class="amb-scan" style="--dx:${s.len - 14}px" d="M${s.x} ${s.y} h14" stroke="${PAPER}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`;

/** A ceiling vent's fan, seen from below: three blades turning slowly inside its drawn hub. */
function fan(v, p, i) {
  const id = `${p}-fan${i}`;
  const blade = `M0 0 Q6 -5 ${v.rx} -3 L${v.rx} 3 Q6 3 0 0 Z`;
  return `<clipPath id="${id}"><ellipse cx="${v.cx}" cy="${v.cy}" rx="${v.rx - 1}" ry="${v.ry - 1}"/></clipPath>
    <g clip-path="url(#${id})"><g transform="translate(${v.cx} ${v.cy}) scale(1 ${f(v.ry / v.rx)})"><g class="amb-spin" style="--dur:5s">
      <circle r="${v.rx}" fill="none"/>${[0, 120, 240].map(a => `<path d="${blade}" transform="rotate(${a})" fill="${PAPER}" opacity="0.55"/>`).join('')}
    </g></g></g>`;
}

/** Light running along a pipe's highlight now and then. */
const glints = list => list.map(g => `<path class="amb-glint" style="--dur:7s;--d:${g.d}s;--dx:${g.x1 - g.x0 - 26}px" d="M${g.x0} ${g.y} h26" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>`).join('');

/** Dust drifting in a lamp's cone of light, each mote on its own slow path. */
function motes(m, p) {
  const rand = random(m.seed), id = `${p}-motes`;
  const [[ax, ay], [bx], [cx, cy], [dx]] = m.cone;
  const list = Array.from({ length: m.n }, () => {
    const t = 0.08 + rand() * 0.84, y = ay + (cy - ay) * t;
    const left = ax + (dx - ax) * t, right = bx + (cx - bx) * t, x = left + (right - left) * (0.12 + rand() * 0.76);
    return `<circle class="amb-mote" style="--dur:${f(9 + rand() * 7)}s;--d:${f(-rand() * 12)}s;--mx:${f(4 + rand() * 6)}px;--my:${f(-3 - rand() * 6)}px;--o:${f(0.35 + rand() * 0.3)}" cx="${f(x)}" cy="${f(y)}" r="${f(1 + rand() * 0.9)}" fill="${PAPER}"/>`;
  }).join('');
  return `<clipPath id="${id}"><polygon points="${m.cone.map(q => q.join(',')).join(' ')}"/></clipPath><g clip-path="url(#${id})">${list}</g>`;
}

/**
 * The ambient layer for one room (or the capsule), framed like its art ({ tx, ty, k }), or null when
 * there is nothing to draw. Lit, it sits just above the back picture (z −1998; the capsule's, z 1)
 * and under the people. With the lights out (dark) it holds only the windows, dimmed, and Room B's
 * moved screen, switched off, and sits just over the dark picture (z 2802). It takes no taps.
 */
export function ambientLayer(room, frame, { dark = false } = {}) {
  const def = AMBIENT_ROOMS[room];
  if (!def) return null;
  const windows = def.windows ?? [];
  if (dark && !windows.length && !def.atoms) return null;
  const [W, H] = def.size ?? [1024, 768];
  const p = `amb${++seq}`;
  const rand = random(0x5eed + room.length * 977);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'amb');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.room = room;
  if (dark) svg.dataset.lights = 'out';
  Object.assign(svg.style, { left: `${frame.tx}px`, top: `${frame.ty}px`, width: `${W * frame.k}px`, height: `${H * frame.k}px`, zIndex: dark ? '2802' : String(def.z ?? -1998) });
  const defs = `<defs>${halftone(`${p}-ht-s`, 1.5, INK)}${halftone(`${p}-ht-m`, 2.5, INK)}${halftone(`${p}-ht-l`, 3.5, INK)}
      <pattern id="${p}-dust-teal" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.4" fill="${TEAL_MID}"/></pattern>
      <pattern id="${p}-dust-ochre" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.3" fill="${GOLD_SHADOW}"/></pattern>
      <linearGradient id="${p}-tail" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${PAPER}" stop-opacity="0.85"/><stop offset="1" stop-color="${TEAL_PALE}" stop-opacity="0"/></linearGradient>
      <clipPath id="${p}-giant"><circle r="22"/></clipPath><clipPath id="${p}-moon"><circle r="13"/></clipPath>
      <clipPath id="${p}-banded"><circle r="26"/></clipPath><clipPath id="${p}-twin"><circle r="5.5"/></clipPath><clipPath id="${p}-ringed"><circle r="30"/></clipPath>
      ${windows.map((v, i) => `<clipPath id="${p}-glass${i}">${glassShape(v)}</clipPath>
        <clipPath id="${p}-home${i}"><circle cx="${v.voyage.home.cx}" cy="${v.voyage.home.cy}" r="${v.voyage.home.r - 2.5}"/></clipPath>
        ${v.frame ? `<clipPath id="${p}-frame${i}"><rect x="${v.x - 13}" y="${v.y - 13}" width="${v.w + 26}" height="${v.h + 26}"/></clipPath>` : ''}${v.cones && !v.frame ? `<clipPath id="${p}-cone${i}">${glassShape(v)}${(v.overBoxes ?? []).map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}</clipPath>` : ''}`).join('')}</defs>`;
  if (dark) {
    // Lights out: the windows' voyages, dimmed; Room B's moved screen, off (the dark picture still has the slit window there).
    svg.innerHTML = `${defs}
    ${windows.map((v, i) => windowView(v, p, i, rand, def.tone, true)).join('')}
    ${(def.atoms ?? []).map(a => nightMarkup(`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${SPACE}" stroke="${INK}" stroke-width="5"/>`)).join('')}`;
    return svg;
  }
  svg.innerHTML = `${defs}
    ${windows.map((v, i) => windowView(v, p, i, rand, def.tone)).join('')}
    ${(def.monitors ?? []).map((m, i) => monitorScreen(m, def.tone, p, i)).join('')}
    ${(def.consoles ?? []).map((c, i) => consoleScreen(c, p, i)).join('')}
    ${(def.atoms ?? []).map(a => atomScreen(a, def.tone)).join('')}
    ${def.bars ? bars(def.bars, def.covers ?? [], def.tone) : ''}
    ${(def.bubbles ?? []).map((t, i) => bubbles(t, p, i)).join('')}
    ${keys(def.keys ?? [], def.tone, def.keyStep)}
    ${lights(def.lights ?? [])}${def.texts || def.ecgs || def.fans || def.cursors || def.scans || def.glints || def.motes ? `
    ${(def.texts ?? []).map((s, i) => textScreen(s, i)).join('')}
    ${(def.ecgs ?? []).map((e, i) => ecgScreen(e, p, i)).join('')}
    ${(def.fans ?? []).map((v, i) => fan(v, p, i)).join('')}
    ${(def.cursors ?? []).map(c => cursorScreen(c)).join('')}
    ${(def.scans ?? []).map(scanLine).join('')}
    ${glints(def.glints ?? [])}
    ${def.motes ? motes(def.motes, p) : ''}` : ''}`;
  return svg;
}

/**
 * Live, the layer runs. Otherwise it is held still at `at` seconds, so every review render of a
 * state is the same picture.
 */
export function settleAmbient(root, { live = false, at = 0 } = {}) {
  if (live) return;
  for (const svg of root.querySelectorAll('svg.amb')) {
    for (const a of svg.getAnimations({ subtree: true })) { a.pause(); a.currentTime = at * 1000; }
  }
}
