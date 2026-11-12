// mothership:dev-only
//
// The Food Supply Task's storyboards: scripted runs of presses, played through the Task's own rules
// (./task.mjs) so that every frame shows what those rules give. Synthetic fixtures: the phone pack's
// invented roster (design/phone-ui/prototype/fixtures.mjs), Hana (seat 8, the Winch) and Cleo (seat
// 3, the Panel), both from Room B, where the pack's fixtures put them. Times are milliseconds from
// the Task's start; the briefing ends at 4 s. The press times follow from the sweep and the swing
// (task.mjs): released from stop 1, the panel is over the platform 1.1 s later and over the cab
// 1.32 s later; locked, the crate's swing is first over the console 0.975 s later and passes over
// the platform every 0.65 s.
// Each caption is [from, to, text, key]: the key is the moment the storyboard draws. Each caption
// says what the frame shows; none claims a rule the owner has not confirmed, and the PROPOSED
// readings are marked.

import { TIMING } from './task.mjs';

/** The fixtures: who runs which control, their crew characters and their places before the Task. */
export const CAST = Object.freeze({
  winch: Object.freeze({ seat: 8, name: 'Hana', character: 'c2', from: Object.freeze({ room: 'room-b', place: 'B3' }) }),
  panel: Object.freeze({ seat: 3, name: 'Cleo', character: 'c6', from: Object.freeze({ room: 'room-b', place: 'B1' }) }),
});
const SEATS = Object.freeze({ winch: CAST.winch.seat, panel: CAST.panel.seat });
const B = TIMING.briefing;

/** Presses: [t, role, act, extra] → steps for ./task.mjs. */
const presses = list => list.map(([at, role, act, extra = {}]) => ({ at, seat: SEATS[role], act, ...extra }));
/** Raise out of the intake, release the panel from stop 1. */
const upAndAway = () => [[B + 600, 'winch', 'raise'], [B + 1600, 'panel', 'release']];
/** Released at B + 1600: over the platform at B + 2700, over the cab at B + 2920. */
const PLATFORM_AT = B + 2700, CAB_AT = B + 2920;

const board = ({ id, title, about, steps, captions, protection = { winch: false, panel: false }, cuts = null, proposed = [] }) =>
  Object.freeze({ id, title, about, seats: SEATS, protection, steps: Object.freeze(steps), captions: Object.freeze(captions), cuts, proposed: Object.freeze(proposed) });

export const BOARDS = Object.freeze([
  board({
    id: 'cooperation',
    title: 'Cooperation',
    about: 'Raise it, release the panel, lock it over the platform, lower it as the swing passes over the platform, both turn a key',
    steps: presses([...upAndAway(), [PLATFORM_AT, 'panel', 'lock'], [PLATFORM_AT + 2600, 'winch', 'lower'], [B + 6200, 'winch', 'key'], [B + 6800, 'panel', 'key']]),
    captions: [
      [0, B, 'Briefing. Hana runs the Winch (up and down) from the cab at stop 7; Cleo runs the locking Panel (left and right) from the console at stop 5. The platform is stop 6.', 2500],
      [B, B + 1600, 'Hana raises the crate out of the intake at stop 1.', B + 900],
      [B + 1600, PLATFORM_AT, 'Cleo releases the panel: it sweeps along the rail, a stop every 0.22 s. LOCK glows on Cleo\'s phone as it passes stop 6.', B + 2650],
      [PLATFORM_AT, PLATFORM_AT + 2600, 'Locked over the platform, the crate swings, wide at first, then calmer. While the swing is over Cleo, Lower is striped on Hana\'s phone and the console lamp flashes on both. Hana waits.', PLATFORM_AT + 975],
      [PLATFORM_AT + 2600, B + 6200, 'As the swing passes over the platform, Hana lowers: it lands, and the platform\'s jaws close.', B + 5800],
      [B + 6200, B + 9300, 'Each turns a key, Hana in the cab, Cleo at the console. The lift takes the crate down to the galley: +5 packages.', B + 7300],
    ],
  }),
  board({
    id: 'chop',
    title: "The cut: the panel locked over the cab",
    about: "Lock the panel over the Winch operator's cab",
    steps: presses([...upAndAway(), [CAB_AT, 'panel', 'lock']]),
    captions: [
      [0, B + 1600, 'Hana raises the crate; Cleo releases the panel.', B + 1200],
      [B + 1600, CAB_AT, 'The panel runs past the platform to the rail\'s end, over Hana\'s cab. Both phones show it: LOCK is striped on Cleo\'s phone, the cab\'s lamp flashes.', B + 2860],
      [CAB_AT, B + 3900, 'Cleo locks it there. The blade drops into the cab: CHOP! By mistake, or not: no phone can tell. Lethal, with no escape and no Hospital, and not an attack: it uses nothing.', B + 3200],
      [B + 3900, B + 6400, 'The crate hangs from the panel at stop 7, not over the platform: the Task is lost. Cleo returns alone.', B + 5200],
    ],
  }),
  board({
    id: 'drop',
    title: "The drop: the crate lowered over the console",
    about: 'Lower while the swing has the crate over the Panel operator; the panel stays over the platform, so the Winch finishes alone',
    steps: presses([...upAndAway(), [PLATFORM_AT, 'panel', 'lock'], [PLATFORM_AT + 975, 'winch', 'lower'], [B + 4600, 'winch', 'raise'], [B + 6400, 'winch', 'lower'], [B + 7200, 'winch', 'key']]),
    captions: [
      [0, PLATFORM_AT, 'Up, released, locked over the platform, as in cooperation.', B + 2650],
      [PLATFORM_AT, PLATFORM_AT + 975, 'The crate swings out over Cleo at the console. Both phones show it: Lower is striped on Hana\'s phone, the console lamp flashes.', PLATFORM_AT + 900],
      [PLATFORM_AT + 975, B + 4600, 'Hana lowers just then: the crate falls on Cleo, THUD! By mistake, or not; lethal, with no escape, and not the Hospital.', PLATFORM_AT + 1250],
      [B + 4600, B + 7200, 'The panel is still locked over the platform, the correct position, so Hana can finish alone: Hana raises the crate again and lowers it onto the platform.', B + 6900],
      [B + 7200, B + 10000, 'Hana turns the Winch\'s key alone: delivered, +5 packages.', B + 8300],
    ],
  }),
  board({
    id: 'standoff',
    title: 'Survivor completion: the standoff',
    about: 'Landed, the Winch turns its key; the Panel releases the empty panel instead, cuts, and sends the crate alone',
    steps: presses([...upAndAway(), [PLATFORM_AT, 'panel', 'lock'], [PLATFORM_AT + 2600, 'winch', 'lower'], [B + 6200, 'winch', 'key'], [B + 6900, 'panel', 'release'], [B + 7120, 'panel', 'lock'], [B + 8000, 'panel', 'key']]),
    captions: [
      [0, B + 6000, 'Cooperation up to the landing: the crate is on the platform, the correct position. The jaws hold it; the hook is free.', B + 5800],
      [B + 6000, B + 6900, 'Hana turns the Winch\'s key. The lift needs every living operator\'s key: it waits for Cleo\'s.', B + 6600],
      [B + 6900, B + 7120, 'Cleo releases the empty panel instead: it runs toward Hana\'s cab. Hana cannot escape.', B + 7060],
      [B + 7120, B + 8000, 'Cleo locks it over the cab: CHOP! Hana is killed. The crate stays clamped on the platform.', B + 7400],
      [B + 8000, B + 10600, 'Cleo turns the Panel\'s key alone: delivered, +5 packages.', B + 9100],
    ],
  }),
  board({
    id: 'protection-cut',
    title: 'Protection against the cut',
    about: "The Winch operator is Protected: the cab's roof buffer catches the blade",
    protection: { winch: true, panel: false },
    steps: presses([...upAndAway(), [CAB_AT, 'panel', 'lock'], [B + 4400, 'panel', 'release'], [B + 4620, 'panel', 'lock'], [B + 4620 + 2600, 'winch', 'lower'], [B + 8000, 'winch', 'key'], [B + 8600, 'panel', 'key']]),
    captions: [
      [0, CAB_AT, 'The panel runs to the cab\'s stop, and Cleo locks it there.', B + 2860],
      [CAB_AT, B + 4400, 'Hana is Protected: the cab\'s roof buffer throws across and catches the blade, CLANK! Both phones show the same STOPPED and nothing else. The catch also holds by luck one time in four, so a CLANK! proves nothing.', B + 3150],
      [B + 4400, B + 7220, 'Both alive, the Task goes on: released again, and locked over the platform.', B + 4900],
      [B + 7220, B + 11000, 'Hana lowers it onto the platform; both keys: delivered.', B + 9100],
    ],
  }),
  board({
    id: 'protection-drop',
    title: 'Protection against the drop',
    about: "The Panel operator is Protected: the winch's brake catches the crate",
    protection: { winch: false, panel: true },
    steps: presses([...upAndAway(), [PLATFORM_AT, 'panel', 'lock'], [PLATFORM_AT + 975, 'winch', 'lower'], [PLATFORM_AT + 2600, 'winch', 'lower'], [B + 6200, 'winch', 'key'], [B + 6800, 'panel', 'key']]),
    captions: [
      [0, PLATFORM_AT + 975, 'Locked over the platform; the crate swings out over Cleo, and Hana lowers.', PLATFORM_AT + 900],
      [PLATFORM_AT + 975, B + 5000, 'Cleo is Protected: the winch\'s brake catches the crate, CLANK! The same STOPPED on both phones, as when the catch holds by luck; the crate swings on.', PLATFORM_AT + 1150],
      [B + 5000, B + 6200, 'Hana waits for the swing over the platform, and lowers: landed.', B + 5800],
      [B + 6200, B + 9300, 'Both keys: delivered.', B + 7300],
    ],
  }),
  board({
    id: 'mistakes',
    title: 'Mistakes that cost only time',
    about: 'A lock one stop early, a Lower too soon: each is put right, and the crate still goes down',
    steps: presses([...upAndAway(), [B + 2400, 'panel', 'lock'], [B + 3300, 'panel', 'release'], [B + 3520, 'panel', 'lock'], [B + 3845, 'winch', 'lower'], [B + 4600, 'winch', 'raise'], [B + 6350, 'winch', 'lower'], [B + 7200, 'winch', 'key'], [B + 7800, 'panel', 'key']]),
    captions: [
      [0, B + 2400, 'Up and released, as in cooperation.', B + 2000],
      [B + 2400, B + 3300, 'Cleo locks one stop early, over Cleo\'s own console: the crate swings right over Cleo. Lower is striped on Hana\'s phone, and Hana waits.', B + 3050],
      [B + 3300, B + 3845, 'Cleo releases and locks again, over the platform this time.', B + 3700],
      [B + 3845, B + 4600, 'Hana lowers too soon, at the far end of the swing: it misses the platform, CLUNK, onto the deck.', B + 4350],
      [B + 4600, B + 6350, 'Hana raises it again: lifted off the deck it barely swings. Lowered as it passes over the platform, it lands.', B + 6000],
      [B + 6350, B + 9800, 'Both keys: delivered, about three seconds later than in cooperation.', B + 8300],
    ],
  }),
  board({
    id: 'timeout',
    title: 'Lost: the time runs out',
    about: 'The crate never lands before the deadline',
    steps: presses([...upAndAway(), [B + 2000, 'panel', 'lock']]).concat([{ at: TIMING.deadline }]),
    cuts: [[0, B + 4400], [TIMING.deadline - 4000, TIMING.deadline + 3200]],
    captions: [
      [0, B + 4400, 'Up and released; Cleo locks it at stop 3, short of the platform, and neither presses again.', B + 3000],
      [TIMING.deadline - 4000, TIMING.deadline, 'The timer runs down on both phones: 30 seconds for the whole Task, the briefing included (the owner).', TIMING.deadline - 1500],
      [TIMING.deadline, TIMING.deadline + 3200, 'Time: the Task is lost. Nothing is delivered; both return.', TIMING.deadline + 1500],
    ],
  }),
  board({
    id: 'disconnect',
    title: 'Disconnect: the Task is cancelled',
    about: 'A participant is out of contact longer than the grace',
    steps: presses(upAndAway()).concat([{ at: B + 2300, seat: SEATS.panel, online: false }, { at: B + 2300 + TIMING.grace }]),
    cuts: [[0, B + 4600], [B + 2300 + TIMING.grace - 2500, B + 2300 + TIMING.grace + 3000]],
    captions: [
      [0, B + 2300, 'Up and released; the panel sweeps.', B + 2100],
      [B + 2300, B + 2300 + TIMING.grace, 'Cleo\'s phone loses its connection. PROPOSED: the Task runs on for an 8-second grace; the panel sweeps on, and Hana\'s phone says Cleo is offline. A cut or a drop that landed now would stand.', B + 2300 + TIMING.grace - 2000],
      [B + 2300 + TIMING.grace, B + 2300 + TIMING.grace + 3000, 'Cleo is still out: the Task is cancelled. Nothing is delivered; both return to their places.', B + 2300 + TIMING.grace + 1500],
    ],
    proposed: ['An 8-second grace before a disconnect cancels'],
  }),
]);

export const boardOf = id => BOARDS.find(b => b.id === id) ?? null;
