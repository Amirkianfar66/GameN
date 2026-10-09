// mothership:dev-only
//
// The pilot's board: where each character stands in each room, and which pose it takes.
// Everything here is chosen from public facts only: who is in which room (ordered by seat
// number), who is Captain, Injured or Jailed. Nothing private, and nothing a role could
// explain, chooses a station, a pose, a stance or a direction.
//
// Coordinates are in the room drawing's own units (1024 x 768). A panel shows a window of
// the drawing; a figure's anchor (its feet, its seat, or the line where a prop hides it) is
// pinned to a point of the drawing, so a figure stays on the floor whatever the panel's size.

import { GEOMETRY } from '../../board-motion/figures/geometry.mjs';

export const ART = 1024;
export const ART_H = 768;

/**
 * The figures' boxes and anchors: the board-motion figures' own geometry (the rig now lives in
 * design/board-motion/figures/), with the width of each pose's torso for its press area.
 */
const TORSO = { standing: 51, standingFolded: 51, standingBack: 51, walking: 51, leaning: 60, inBed: 53, onBench: 46, atConsole: 46, out: 51 };
export const POSE_BOX = Object.fromEntries(Object.entries(GEOMETRY).map(([pose, g]) => [pose, { box: g.box, anchor: g.anchor, torso: TORSO[pose], front: Boolean(g.front) }]));

/** A standing character's three stances, one per seat number, so that a full room is not nine clones. */
export const STANCES = ['standing', 'standingFolded', 'standingBack'];
export const stanceOf = seat => STANCES[(seat - 1) % STANCES.length];

/**
 * How big a person is at a depth of the floor: the drawings' furniture gives the scale (the
 * Jail bench, the chart table, the Hospital bed), and nearer is bigger.
 */
export const depthScale = y => 1 + (y - 380) * 0.0016;

/**
 * The five rooms. view: the window of the drawing the panel shows [x, y, width, height].
 * prop: a piece of furniture lifted from the drawing, laid over the characters behind it,
 * with the depth it stands at. stations: by how many are in the room, in seat order. A
 * station is a place in the picture, not a seat or a capacity.
 */
export const ROOMS = {
  'command-room': {
    location: 'Command Room',
    art: '--ms-asset-board-command-room-full',
    prop: { art: '--bm-asset-command-room-prop-table', z: 560 },
    view: [72, 170, 880, 410],
    // The Captain leans over the chart table, as in the owner's reference.
    special: { when: 'captain', at: [512, 446], pose: 'leaning', scale: 1.45 },
    stations: {
      1: [[512, 590]],
      2: [[230, 590], [800, 590]],
      3: [[200, 590], [512, 596], [830, 590]],
    },
  },
  'room-a': {
    location: 'Room A',
    art: '--ms-asset-board-room-a-full',
    view: [212, 6, 600, 758],
    // A back row stands far enough behind that its heads clear the front row's press areas.
    stations: {
      1: [[512, 690]],
      2: [[400, 700], [624, 700]],
      3: [[330, 720], [694, 720], [512, 480]],
      4: [[320, 720], [704, 720], [430, 470], [600, 470]],
      5: [[306, 720], [512, 728], [718, 720], [410, 470], [614, 470]],
    },
  },
  'room-b': {
    location: 'Room B',
    art: '--ms-asset-board-room-b-full',
    prop: { art: '--bm-asset-room-b-prop-counter', z: 505 },
    view: [240, 6, 600, 758],
    // The first in the room works at the laboratory counter, while four or fewer are in the
    // room; five stand in two rows, as in Room A, and nobody is hidden behind the others.
    special: { when: 'first', at: [566, 394], pose: 'leaning', scale: 1.3, upTo: 4 },
    stations: {
      1: [[380, 700]],
      2: [[350, 710], [740, 710]],
      3: [[330, 720], [545, 740], [760, 720]],
      4: [[330, 720], [545, 740], [760, 720], [430, 570]],
      5: [[330, 720], [545, 728], [760, 720], [440, 560], [650, 560]],
    },
  },
  hospital: {
    location: 'Hospital',
    art: '--ms-asset-board-hospital-full',
    prop: { art: '--bm-asset-hospital-prop-bed', z: 565 },
    view: [100, 92, 600, 642],
    // The first Injured character in the room sits up in the left bed. The plate goes beside the
    // head: above it is the room's caption.
    special: { when: 'injured', at: [236, 414], pose: 'inBed', scale: 1.5, plate: 'right' },
    stations: {
      1: [[520, 700]],
      2: [[430, 710], [620, 700]],
      3: [[400, 720], [610, 720], [520, 480]],
      4: [[380, 720], [580, 720], [455, 480], [615, 470]],
    },
  },
  jail: {
    location: 'Jail',
    art: '--ms-asset-board-jail-full',
    view: [110, 92, 600, 642],
    // The first Jailed character in the room sits on the bench, hunched. The plate goes under
    // the bench: above it is the room's caption.
    special: { when: 'jailed', at: [250, 342], pose: 'onBench', scale: 1.3, plate: 'below' },
    stations: {
      1: [[520, 700]],
      2: [[440, 710], [630, 700]],
      3: [[400, 720], [620, 720], [520, 480]],
      4: [[380, 720], [600, 720], [465, 480], [625, 470]],
    },
  },
};

export const ROOM_ORDER = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
/** The rooms a player can move to by pressing their name, as on the board-motion prototype. */
export const MOVE_ROOMS = ['room-a', 'room-b'];

/** The nine characters, seated 1 to 9. The names are the proposed call signs, synthetic. */
export const CAST = [
  { seat: 1, character: 'c1', name: 'Vega' },
  { seat: 2, character: 'c2', name: 'Rigel' },
  { seat: 3, character: 'c3', name: 'Lyra' },
  { seat: 4, character: 'c4', name: 'Atlas' },
  { seat: 5, character: 'c5', name: 'Orion' },
  { seat: 6, character: 'c6', name: 'Nova' },
  { seat: 7, character: 'c7', name: 'Juno' },
  { seat: 8, character: 'c8', name: 'Mira' },
  { seat: 9, character: 'c9', name: 'Echo' },
];

/** Synthetic public states: where everyone is, who is Captain, Injured, Jailed. The viewer is seat 7. */
export const SCENARIOS = {
  spread: {
    title: 'A round in play',
    viewer: 7,
    captain: 1,
    injured: [8],
    jailed: [9],
    rooms: { 'command-room': [1], 'room-a': [2, 3, 4, 7], 'room-b': [5, 6], hospital: [8], jail: [9] },
  },
  full: {
    title: 'Five in Room A',
    viewer: 7,
    captain: 1,
    injured: [8],
    jailed: [9],
    rooms: { 'command-room': [1], 'room-a': [2, 3, 4, 6, 7], 'room-b': [5], hospital: [8], jail: [9] },
  },
  fullB: {
    title: 'Five in Room B',
    viewer: 7,
    captain: 1,
    injured: [],
    jailed: [],
    rooms: { 'command-room': [1], 'room-a': [7, 8, 9], 'room-b': [2, 3, 4, 5, 6], hospital: [], jail: [] },
  },
  fullH: {
    title: 'Five in the Hospital',
    viewer: 7,
    captain: 1,
    injured: [2, 3],
    jailed: [9],
    rooms: { 'command-room': [1], 'room-a': [7], 'room-b': [8], hospital: [2, 3, 4, 5, 6], jail: [9] },
  },
  fullJ: {
    title: 'Five in the Jail',
    viewer: 7,
    captain: 1,
    injured: [2],
    jailed: [3, 4, 5, 6, 9],
    rooms: { 'command-room': [1], 'room-a': [7], 'room-b': [8], hospital: [2], jail: [3, 4, 5, 6, 9] },
  },
  crowded: {
    title: 'Busy Hospital and Jail',
    viewer: 7,
    captain: 1,
    injured: [2, 8],
    jailed: [4, 9],
    rooms: { 'command-room': [1], 'room-a': [3, 7], 'room-b': [5, 6], hospital: [8, 2], jail: [9, 4] },
  },
};

/**
 * Every character's place: room, pose, anchor point, scale, mirrored or not, and depth order.
 * Pure: the same public state gives the same board on every phone.
 */
export function layout(state) {
  const placed = [];
  for (const room of ROOM_ORDER) {
    const spec = ROOMS[room];
    const seats = [...(state.rooms[room] ?? [])].sort((a, b) => a - b);
    // The one character a room's special station takes, chosen by a public fact.
    const takes = seats.find(seat => {
      if (!spec.special || seats.length > (spec.special.upTo ?? Infinity)) return false;
      if (spec.special.when === 'captain') return seat === state.captain;
      if (spec.special.when === 'injured') return state.injured.includes(seat);
      if (spec.special.when === 'jailed') return state.jailed.includes(seat);
      return seat === seats[0];
    });
    if (takes !== undefined) {
      const { at, pose, scale, plate = 'above' } = spec.special;
      placed.push({ seat: takes, room, pose, at, scale, mirror: false, z: at[1], special: true, plate });
    }
    const standing = seats.filter(seat => seat !== takes);
    const stations = spec.stations[standing.length] ?? [];
    standing.forEach((seat, index) => {
      const at = stations[index];
      if (!at) throw new Error(`${spec.location} has no station for ${standing.length} standing`);
      const centre = spec.view[0] + spec.view[2] / 2;
      // Characters face into the room: those right of its middle are drawn mirrored.
      placed.push({ seat, room, pose: stanceOf(seat), at, scale: depthScale(at[1]), mirror: at[0] > centre + 8, z: at[1], special: false, plate: 'above' });
    });
  }
  return placed;
}

/** The box a figure's picture covers in the drawing's units: [x, y, width, height]. */
export function figureBox({ pose, at, scale, mirror }) {
  const { box: [minX, minY, w, h], anchor: [ax, ay] } = POSE_BOX[pose];
  const fromLeft = mirror ? w - (ax - minX) : ax - minX;
  return [at[0] - fromLeft * scale, at[1] - (ay - minY) * scale, w * scale, h * scale];
}

/** The top of a figure's drawn body (its head), in the drawing's units. */
const headTop = entry => { const [, y, , h] = figureBox(entry); return y + h * 0.04; };

/**
 * The press areas of every figure, in the drawing's units [x, y, width, height]: the body from
 * the head down to the hips for a standing character, the part above the prop for one at a
 * prop. Each is at least one 44 px target wide and high (min(room) gives that size in the
 * drawing's units at the panel's size). Areas are laid from the front of a room to the back:
 * an area behind ends where an area in front of it begins, and grows upward into the wall
 * behind instead, so no two areas in a room overlap.
 */
export function pressBoxes(placed, min) {
  const boxes = new Map();
  for (const entry of [...placed].sort((a, b) => b.z - a.z)) {
    const size = min(entry.room);
    const [, , , h] = figureBox(entry);
    const half = Math.max(POSE_BOX[entry.pose].torso * entry.scale * 1.1, size / 2);
    const centre = entry.at[0];
    let top = headTop(entry);
    let bottom = entry.pose === 'onBench' ? entry.at[1] + h * 0.3 : entry.special ? entry.at[1] : entry.at[1] - h * 0.3;
    for (const other of placed) {
      const box = boxes.get(other.seat);
      if (!box || other.room !== entry.room) continue;
      if (box[0] + box[2] > centre - half && box[0] < centre + half) bottom = Math.min(bottom, box[1] - 2);
    }
    if (bottom - top < size) top = bottom - size;
    boxes.set(entry.seat, [centre - half, top, half * 2, bottom - top]);
  }
  return boxes;
}
