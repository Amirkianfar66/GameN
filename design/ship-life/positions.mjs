// mothership:dev-only
//
// Ship life: what the occupant of each place does while other players take their turns, and where
// each room keeps its food capsule. A proposal for the owner (11 November 2026), in no release.
//
// An activity belongs to a place, never to a character, a role, a team, an inventory or a private
// choice: any of the nine can take any place and does that place's work. Every activity is
// decoration. Typing hacks nothing, handling a crate gives no food or weapon, working the cables
// repairs nothing, and nothing spends a move, a Role Action, a Public Action or a Task.
//
// The places, their anchors, scales and resting gestures are the game's own (the scenes in
// design/board-motion/scenes/ and the ward of four berths in design/room-pilot/ward-four.mjs).
// The rooms are the redrawn ones the owner approved on 8 November 2026 (room-drawing-1.0.0).

/** Each place's activity: its name, what it shows, and the props it uses. Hospital berths only rest. */
export const ACTIVITIES = Object.freeze({
  A1: { room: 'room-a', name: 'PC workstation', does: 'Types, pauses to read a monitor, adjusts a control, types again', props: [] },
  A2: { room: 'room-a', name: 'Open deck', does: 'Reads a maintenance checklist, glances round, lowers it', props: ['clipboard'] },
  A3: { room: 'room-a', name: 'Floor hatch', does: 'Small turns of the wrench in the hatch, inspects the fitting, rests', props: ['wrench'] },
  A4: { room: 'room-a', name: 'Crates', does: 'Reads a label, tightens a strap, lifts a small parcel and puts it back', props: ['parcel'] },
  A5: { room: 'room-a', name: 'Electrical panel', does: 'Traces the cables, holds a wire, checks a connector, settles', props: ['wire'] },
  B1: { room: 'room-b', name: 'Tablet', does: 'Scrolls a neutral diagram, taps, looks at the equipment nearby', props: ['tablet'] },
  B2: { room: 'room-b', name: 'Laptop', does: 'Types, pauses, tilts the screen a little, carries on', props: ['laptop'] },
  B3: { room: 'room-b', name: 'Specimen tank', does: 'Wipes a patch of the glass, looks at what is inside', props: ['cloth'] },
  B4: { room: 'room-b', name: 'Sample bench', does: 'Lifts a container, looks at it, puts it back, straightens the tray', props: ['vial'] },
  B5: { room: 'room-b', name: 'Microscope', does: 'Looks through it, turns the focus, looks up for a moment, looks again', props: [] },
  C1: { room: 'command-room', name: "Captain's table", does: 'Checks neutral instruments, shifts the hands, reads a small status tablet', props: ['tablet'], never: 'A direction, a course or a confirmed navigation' },
  H1: { room: 'hospital', name: 'Front-left berth', does: 'Breathes quietly, blinks, settles the pillow or an arm', props: [], rests: true },
  H2: { room: 'hospital', name: 'Front-right berth', does: 'Straightens the blanket, glances at a neutral bedside display, rests', props: [], rests: true },
  H3: { room: 'hospital', name: 'Back-left berth', does: 'Settles against the pillow, a small move of a hand or the head', props: [], rests: true },
  H4: { room: 'hospital', name: 'Back-right berth', does: 'Breathes quietly, turns the head a little', props: [], rests: true },
  J1: { room: 'jail', name: 'Bench', does: 'Rubs the hands, shifts the elbows on the knees, looks up for a moment', props: [] },
  J2: { room: 'jail', name: 'Door', does: 'Glances through the inspection slit (it does nothing), settles', props: [], never: 'An escape, lock picking or any way out' },
  J3: { room: 'jail', name: 'Wall', does: 'Shifts the weight, unfolds and folds the arms, looks round', props: [] },
  J4: { room: 'jail', name: 'Floor', does: 'Settles the seat, taps the fingers on a knee', props: [] },
  J5: { room: 'jail', name: 'Cot', does: 'Moves the head on the cot, stretches a hand, settles', props: [] },
});

/** The twenty places in reading order: each room's places as its scene lists them. */
export const PLACE_ORDER = Object.freeze(Object.keys(ACTIVITIES));

/**
 * Each room's food capsule, in the room's 1024 × 768 picture:
 *   kind: a wall unit ('wall'), a unit standing on a counter or console ('counter'), or the Jail's
 *         ration hatch set flush in the wall ('hatch'); box: the device [x, y, w, h]; hatch: its
 *         hatch [x, y, w, h]; z: where the board layers it (above the back picture, or above a
 *         counter that is a layer of its own);
 *   spot: the floor point a visitor stands on to use it, beside it and never in front of it, so the
 *         visitor's body never hides the hatch (the arm on the device's side reaches it), and the
 *         figure's scale there;
 *   paths: from a place, the floor between, as points ([x, y], or [x, y, depth] where the board
 *         layers a figure at another depth than its feet: behind Room B's bench, behind the
 *         Command Room's table). A straight walk where none is given. Every path keeps clear of
 *         what the back picture draws in front of a walker (it cannot hide one): the specimen
 *         tank in Room B, the chairs in the Command Room;
 *   depth: the room's depth line [y0, scale at y0, change per unit]: a walker's scale on the way;
 *   light: a shaft of the room's own light that crosses the device, drawn over it as over the wall.
 * The Hospital has none: its patients rest, and no visit is played there.
 */
export const CAPSULES = Object.freeze({
  // In the narrow recess between the pillar and the lockers, right of A4's crates: the only free wall
  // that covers no place, station, panel or window. The visitor stands right of it, before the lockers.
  'room-a': Object.freeze({
    kind: 'wall', box: [727, 212, 29, 100], hatch: [731, 258, 21, 24], z: 2,
    spot: [786, 414], scale: 0.952, depth: [394, 0.94, 0.00062],
    paths: Object.freeze({ A5: Object.freeze([[452, 474], [640, 470]]), A2: Object.freeze([[470, 492], [640, 474]]) }),
    light: Object.freeze({ points: [[562, 58], [716, 58], [812, 612], [470, 612]], y: [58, 612], stops: [[0, 0.4], [0.5, 0.16], [1, 0.07]] }),
  }),
  // On the bench's right end, against the wall under the panel: drawn over the bench (its own layer,
  // depth 470). The visitor stands right of the specimen tank and reaches across.
  'room-b': Object.freeze({
    kind: 'counter', box: [790, 322, 36, 60], hatch: [795, 342, 26, 20], z: 942,
    spot: [858, 508], scale: 0.96, depth: [488, 0.945, 0.000785],
    paths: Object.freeze({
      B1: Object.freeze([[845, 684]]), B2: Object.freeze([[845, 684]]), B3: Object.freeze([[722, 692], [845, 684]]),
      B4: Object.freeze([[700, 480, 390], [892, 470, 390], [894, 500]]), B5: Object.freeze([[560, 482, 390], [892, 470, 390], [894, 500]]),
    }),
  }),
  // On the console's right end, beside the window's frame. The visitor steps back from the chart
  // table, crosses behind it, and stands left of the device, right of the chair.
  'command-room': Object.freeze({
    kind: 'counter', box: [830, 262, 34, 56], hatch: [834, 280, 26, 20], z: 2,
    spot: [804, 424], scale: 1.04, depth: [424, 1.04, 0.0011],
    paths: Object.freeze({ C1: Object.freeze([[512, 432, 440], [740, 416]]) }),
  }),
  // The Jail's ration hatch, flush in the plain wall between the door's frame and the keypad: reached
  // without leaving the Jail. The visitor stands left of it, before the door's right side.
  jail: Object.freeze({
    kind: 'hatch', box: [692, 252, 38, 78], hatch: [697, 274, 28, 26], z: 2,
    spot: [652, 420], scale: 0.979, depth: [400, 0.97, 0.00043],
  }),
});

/** The rooms where a visit can be played: every room with a capsule. Never the Hospital. */
export const EATING_ROOMS = Object.freeze(Object.keys(CAPSULES));
