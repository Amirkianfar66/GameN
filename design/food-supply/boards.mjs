// mothership:dev-only
//
// The Food Supply Task's storyboards: scripted runs of presses, played through the Task's own rules
// (./task.mjs) so that every frame shows what those rules give. Synthetic fixtures: the phone pack's
// invented roster (design/phone-ui/prototype/fixtures.mjs), Hana (seat 8, the Hoist) and Cleo
// (seat 3, the Boom), both from Room B, where the pack's fixtures put them. Times are milliseconds from the Task's start; the briefing ends at 4 s.
// Each caption is [from, to, text, key]: the key is the moment the storyboard draws. Each caption says what the frame shows; none claims a rule the owner has not confirmed, and
// the PROPOSED readings are marked.

import { TIMING } from './task.mjs';

/** The fixtures: who runs which control, their crew characters and their places before the Task. */
export const CAST = Object.freeze({
  hoist: Object.freeze({ seat: 8, name: 'Hana', character: 'c2', from: Object.freeze({ room: 'room-b', place: 'B3' }) }),
  boom: Object.freeze({ seat: 3, name: 'Cleo', character: 'c6', from: Object.freeze({ room: 'room-b', place: 'B1' }) }),
});
const SEATS = Object.freeze({ hoist: CAST.hoist.seat, boom: CAST.boom.seat });
const B = TIMING.briefing;

/** Presses: [t, role, dir] → steps for ./task.mjs. */
const presses = list => list.map(([at, role, dir]) => ({ at, seat: SEATS[role], dir }));
const up3 = (t0 = B + 600) => [[t0, 'hoist', 'up'], [t0 + 500, 'hoist', 'up'], [t0 + 1000, 'hoist', 'up']];
const toCradle = (t0, from = 3) => Array.from({ length: 7 - from }, (_, k) => [t0 + k * 500, 'boom', 'right']);

const board = ({ id, title, about, steps, captions, protection = { hoist: false, boom: false }, attack = { hoist: true, boom: true }, cuts = null, proposed = [] }) =>
  Object.freeze({ id, title, about, seats: SEATS, attack, protection, steps: Object.freeze(steps), captions: Object.freeze(captions), cuts, proposed: Object.freeze(proposed) });

export const BOARDS = Object.freeze([
  board({
    id: 'cooperation',
    title: 'Cooperation',
    about: 'Lift it out, drive it across, lower it into the cradle, both turn a key',
    steps: presses([
      [B + 600, 'hoist', 'up'], [B + 1000, 'boom', 'right'], [B + 1300, 'hoist', 'up'], [B + 1800, 'hoist', 'up'],
      [B + 2500, 'boom', 'right'], [B + 3000, 'boom', 'right'], [B + 3500, 'boom', 'right'], [B + 4000, 'boom', 'right'],
      [B + 4600, 'hoist', 'down'], [B + 5100, 'hoist', 'down'], [B + 5700, 'hoist', 'up'], [B + 6300, 'boom', 'right'],
    ]),
    captions: [
      [0, B, 'Briefing. Hana runs the Hoist (up and down) from the cab; Cleo the Boom (left and right) from the pulpit. The route is marked on both phones.', 2500],
      [B, B + 2400, 'Hana lifts the crate out of the intake. Cleo drives too soon: the crate bumps the rib, a clunk and nothing more.', B + 1100],
      [B + 2400, B + 4500, 'High enough, the crate goes across, passing over Cleo\'s own head: the pulpit lamp flashes while it is there.', B + 3300],
      [B + 4500, B + 5600, 'Over the lift, Hana lowers it into the cradle. The jaws close: docked.', B + 5300],
      [B + 5600, B + 9000, 'Each turns a key, Hana in the cab, Cleo at the end stop. The lift takes the crate up to the galley: +5 packages.', B + 7000],
    ],
  }),
  board({
    id: 'drop',
    title: "The Hoist's attack: the drop",
    about: 'Lower while the crate hangs over the Boom operator',
    steps: presses([...up3(), [B + 2300, 'boom', 'right'], [B + 2800, 'boom', 'right'], [B + 3600, 'hoist', 'down']]),
    captions: [
      [0, B + 2700, 'The crate goes up and across, as in cooperation.', B + 2600],
      [B + 2700, B + 3600, 'It hangs over Cleo, one Lower from Cleo\'s head. Both phones show it: the drop line, the warning mark, the flashing lamp.', B + 3300],
      [B + 3600, B + 4600, 'Hana presses Lower. The crate falls on Cleo: THUD! An unblocked attack is lethal, with no escape, and not the Hospital.', B + 3950],
      [B + 4600, B + 7000, 'The crate is on the pulpit, not in the cradle: the Task is lost. Hana returns alone.', B + 6000],
    ],
  }),
  board({
    id: 'ram',
    title: "The Boom's attack: the ram",
    about: "Drive the gantry into the Hoist operator's cab",
    steps: presses([...up3(), [B + 2300, 'boom', 'right'], [B + 3000, 'boom', 'left'], [B + 3500, 'boom', 'left'], [B + 4300, 'boom', 'left']]),
    captions: [
      [0, B + 2800, 'The crate goes up; Cleo drives one step, then back, away from the lift, toward Hana\'s cab.', B + 3300],
      [B + 2800, B + 4300, "At the cab's door the cab's lamp flashes on both phones and the warning mark shows: one more Left is the ram.", B + 4000],
      [B + 4300, B + 5300, 'Cleo presses Left. The bumper plate slams into the cab: SLAM! Lethal; the crate swings in with the gantry.', B + 4650],
      [B + 5300, B + 7500, 'The crate is not in the cradle: the Task is lost.', B + 6400],
    ],
  }),
  board({
    id: 'survivor',
    title: 'Survivor completion',
    about: 'The ram after docking: the crate stays clamped, and the survivor sends it alone',
    steps: presses([
      ...up3(), ...toCradle(B + 2300), [B + 4600, 'hoist', 'down'], [B + 5100, 'hoist', 'down'], [B + 5700, 'hoist', 'up'],
      ...Array.from({ length: 6 }, (_, k) => [B + 6400 + k * 380, 'boom', 'left']),
      ...Array.from({ length: 6 }, (_, k) => [B + 9200 + k * 380, 'boom', 'right']),
      [B + 11700, 'boom', 'right'],
    ]),
    captions: [
      [0, B + 5600, 'Cooperation up to the cradle: docked, the correct position. The jaws hold the crate; the gantry and the hook are free.', B + 5300],
      [B + 5600, B + 6400, 'Hana turns the Hoist\'s key. The lift needs every living operator\'s key: it waits for Cleo\'s.', B + 6000],
      [B + 6400, B + 8300, 'Cleo drives the empty gantry back toward the cab instead. Hana cannot escape.', B + 7600],
      [B + 8300, B + 9200, 'The ram: Hana is killed. The crate stays clamped in the cradle.', B + 8650],
      [B + 9200, B + 14500, 'Cleo drives back to the end stop and turns the Boom\'s key alone: delivered, +5 packages.', B + 12300],
    ],
  }),
  board({
    id: 'protection-drop',
    title: 'Protection against the drop',
    about: 'The Boom operator is Protected: the safety catch stops the crate',
    protection: { hoist: false, boom: true },
    steps: presses([...up3(), [B + 2300, 'boom', 'right'], [B + 2800, 'boom', 'right'], [B + 3600, 'hoist', 'down'],
      [B + 5200, 'boom', 'right'], [B + 5700, 'boom', 'right'], [B + 6300, 'hoist', 'down'], [B + 6800, 'hoist', 'down'], [B + 7400, 'hoist', 'up'], [B + 8000, 'boom', 'right']]),
    captions: [
      [0, B + 3600, 'The crate hangs over Cleo. Hana presses Lower.', B + 3300],
      [B + 3600, B + 5000, 'Cleo is Protected: the cable\'s safety catch stops the crate, CLANK! Both phones show the same STOPPED and nothing else; a participant without an attack opportunity is stopped the same way.', B + 3800],
      [B + 5000, B + 8000, "PROPOSED: the block spends Hana's one attack opportunity. Both alive, the Task goes on.", B + 6000],
      [B + 8000, B + 11000, 'Docked, both keys: delivered.', B + 8700],
    ],
    proposed: ['A blocked attack spends the attacker\'s opportunity'],
  }),
  board({
    id: 'protection-ram',
    title: 'Protection against the ram',
    about: "The Hoist operator is Protected: the cab's spring buffer stops the gantry",
    protection: { hoist: true, boom: false },
    steps: presses([...up3(), [B + 2300, 'boom', 'right'], [B + 3000, 'boom', 'left'], [B + 3500, 'boom', 'left'], [B + 4300, 'boom', 'left'],
      ...Array.from({ length: 5 }, (_, k) => [B + 5900 + k * 450, 'boom', 'right']), [B + 8600, 'hoist', 'down'], [B + 9100, 'hoist', 'down'], [B + 9700, 'hoist', 'up'], [B + 10300, 'boom', 'right']]),
    captions: [
      [0, B + 4300, 'Cleo drives back to the cab\'s door and presses Left.', B + 4000],
      [B + 4300, B + 5800, "Hana is Protected: the cab's spring buffer throws out and stops the gantry, CLANK! The same STOPPED on both phones.", B + 4500],
      [B + 5800, B + 9000, 'The Task goes on; Cleo drives the crate across after all.', B + 7600],
      [B + 9000, B + 13000, 'Docked, both keys: delivered.', B + 11000],
    ],
    proposed: ['A blocked attack spends the attacker\'s opportunity'],
  }),
  board({
    id: 'timeout',
    title: 'Lost: the time runs out',
    about: 'The crate never reaches the cradle before the deadline',
    steps: presses([...up3(), [B + 2300, 'boom', 'right'], [B + 2800, 'boom', 'right'], [B + 3300, 'boom', 'right']]).concat([{ at: B + TIMING.deadline }]),
    cuts: [[0, B + 4400], [B + TIMING.deadline - 4000, B + TIMING.deadline + 3200]],
    captions: [
      [0, B + 4400, 'The crate goes up and across, then stops over the open deck.', B + 4000],
      [B + TIMING.deadline - 4000, B + TIMING.deadline, 'Neither presses again. The timer runs down on both phones (PROPOSED: 45 seconds).', B + TIMING.deadline - 1500],
      [B + TIMING.deadline, B + TIMING.deadline + 3200, 'Time: the Task is lost. Nothing is delivered; both return.', B + TIMING.deadline + 1500],
    ],
    proposed: ['A 45-second deadline'],
  }),
  board({
    id: 'disconnect',
    title: 'Disconnect: the Task is cancelled',
    about: 'A participant is out of contact longer than the grace',
    steps: presses([...up3(), [B + 2300, 'boom', 'right']]).concat([{ at: B + 3000, seat: SEATS.boom, online: false }, { at: B + 3000 + TIMING.grace }]),
    cuts: [[0, B + 4600], [B + 3000 + TIMING.grace - 2500, B + 3000 + TIMING.grace + 3000]],
    captions: [
      [0, B + 3000, 'Mid-Task, Cleo\'s phone loses its connection.', B + 2800],
      [B + 3000, B + 3000 + TIMING.grace, 'PROPOSED: the Task runs on for an 8-second grace. Hana\'s phone says Cleo is offline and the Task goes on; an attack that lands now would stand.', B + 3000 + TIMING.grace - 2000],
      [B + 3000 + TIMING.grace, B + 3000 + TIMING.grace + 3000, 'Cleo is still out: the Task is cancelled. Nothing is delivered; both return to their places.', B + 3000 + TIMING.grace + 1500],
    ],
    proposed: ['An 8-second grace before a disconnect cancels'],
  }),
]);

export const boardOf = id => BOARDS.find(b => b.id === id) ?? null;
