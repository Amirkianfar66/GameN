// mothership:dev-only
//
// The Food Supply Task's storyboards: scripted runs of presses, played through the Task's own rules
// (./task.mjs) so that every frame shows what those rules give. Synthetic fixtures: the phone pack's
// invented roster (design/phone-ui/prototype/fixtures.mjs), Hana (seat 8, the Winch) and Cleo (seat
// 3, the Panel), both from Room B, where the pack's fixtures put them. Times are milliseconds from
// the Task's start; the briefing ends at 4 s. The press times follow from the panel's click and the
// crate's swing (task.mjs): released from stop 1, the panel snaps on a stop every 0.5 s and rests at
// each, so it rests over the platform from 2.1 s to 2.5 s after the release and over the cab from 2.6
// s to 3 s; locked, the crate's swing is first over the console 0.975 s later. Each press is timed by
// the moment the server receives it, which is what decides it (task.mjs act()).
// Each caption is [from, to, text, key]: the key is the moment the storyboard draws. Each caption
// says what the frame shows; none claims a rule the owner has not confirmed, and the PROPOSED
// readings are marked.

import { CLICK, TIMING, simulate, startTask, tick, view } from './task.mjs';

/** The fixtures: who runs which control, their crew characters and their places before the Task. */
export const CAST = Object.freeze({
  winch: Object.freeze({ seat: 8, name: 'Hana', character: 'c2', from: Object.freeze({ room: 'room-b', place: 'B3' }) }),
  panel: Object.freeze({ seat: 3, name: 'Cleo', character: 'c6', from: Object.freeze({ room: 'room-b', place: 'B1' }) }),
});
const SEATS = Object.freeze({ winch: CAST.winch.seat, panel: CAST.panel.seat });
const B = TIMING.briefing;

/** Presses: [t, role, act, extra] → steps for ./task.mjs. */
const presses = list => list.map(([at, role, act, extra = {}]) => ({ at, seat: SEATS[role], act, ...extra }));
/** The release: the crate raised out of the intake, the panel released from stop 1 going right. */
const RELEASE = B + 1600;
const upAndAway = () => [[B + 600, 'winch', 'raise'], [RELEASE, 'panel', 'release']];
/** A moment the panel rests at a stop on its first run right after the release: 100 ms into its rest, inside the glow. */
const restingAt = stop => RELEASE + (stop - 1) * CLICK + TIMING.move + 100;
const PLATFORM_AT = restingAt(5), CAB_AT = restingAt(6), OVER_CONSOLE = PLATFORM_AT + 975;

/** The first moment from `from` on when the Winch's phone lights Lower: the swing holds the crate over the platform for the whole margin. */
function steadyLower(list, from, protection) {
  const frames = simulate(startTask({ seats: SEATS }), presses(list), { protection });
  const last = frames[frames.length - 1].state;
  for (let t = from; t < from + 4000; t += 5) {
    if (view(tick(last, t).state, SEATS.winch, t).buttons.find(b => b.act === 'lower')?.next) return t;
  }
  throw new Error(`no steady moment after ${from}`);
}

/** Cooperation's moments, shared by several storyboards and the review pages. */
const COOP_UP = [...upAndAway(), [PLATFORM_AT, 'panel', 'lock']];
const LOWER_AT = steadyLower(COOP_UP, PLATFORM_AT + 2300);
const LANDED_AT = LOWER_AT + TIMING.lower;
/** Key moments of the storyboards, for the review pages: the release, the rests over the platform and the cab, the swing over the console, the steady Lower. */
export const MOMENTS = Object.freeze({ briefing: B, release: RELEASE, platform: PLATFORM_AT, cab: CAB_AT, overConsole: OVER_CONSOLE, lower: LOWER_AT, landed: LANDED_AT, dropRaise: OVER_CONSOLE + 1300 });

const board = ({ id, title, about, steps, captions, protection = { winch: false, panel: false }, cuts = null, proposed = [] }) =>
  Object.freeze({ id, title, about, seats: SEATS, protection, steps: Object.freeze(steps), captions: Object.freeze(captions), cuts, proposed: Object.freeze(proposed) });

// The storyboards' own moments.
const DROP_RAISE = OVER_CONSOLE + 1300;
const DROP_LOWER = steadyLower([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower'], [DROP_RAISE, 'winch', 'raise']], DROP_RAISE + 500);
const STANDOFF_RELEASE = LOWER_AT + 1300, STANDOFF_LOCK = STANDOFF_RELEASE + TIMING.move + 150;
const PCUT_RELEASE = CAB_AT + 1300, PCUT_LOCK = PCUT_RELEASE + TIMING.move + 150;
const PCUT_UP = [...upAndAway(), [CAB_AT, 'panel', 'lock'], [PCUT_RELEASE, 'panel', 'release'], [PCUT_LOCK, 'panel', 'lock']];
const PCUT_LOWER = steadyLower(PCUT_UP, PCUT_LOCK + 2300, { winch: true, panel: false });
const PDROP_LOWER = steadyLower([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower']], PLATFORM_AT + 2300, { winch: false, panel: true });
const EARLY_LOCK = restingAt(4), RETRY_RELEASE = EARLY_LOCK + 900, RETRY_LOCK = RETRY_RELEASE + TIMING.move + 150;
const TOO_SOON = RETRY_LOCK + 325, RAISE_AGAIN = TOO_SOON + 1100;
const MISTAKES_UP = [...upAndAway(), [EARLY_LOCK, 'panel', 'lock'], [RETRY_RELEASE, 'panel', 'release'], [RETRY_LOCK, 'panel', 'lock'], [TOO_SOON, 'winch', 'lower'], [RAISE_AGAIN, 'winch', 'raise']];
const MISTAKES_LOWER = steadyLower(MISTAKES_UP, RAISE_AGAIN + TIMING.raise + 50);
const SHORT_LOCK = restingAt(2), OUT_AT = RELEASE + 700;

export const BOARDS = Object.freeze([
  board({
    id: 'cooperation',
    title: 'Cooperation',
    about: 'Raise it, release the panel, lock it as it rests over the platform, lower it as the swing holds it over the platform, both turn a key',
    steps: presses([...COOP_UP, [LOWER_AT, 'winch', 'lower'], [LOWER_AT + 600, 'winch', 'key'], [LOWER_AT + 1200, 'panel', 'key']]),
    captions: [
      [0, B, 'Briefing. Hana runs the Winch (up and down) from the cab at stop 7; Cleo runs the locking Panel (left and right) from the console at stop 5. The platform is stop 6.', 2500],
      [B, RELEASE, 'Hana raises the crate out of the intake at stop 1.', B + 900],
      [RELEASE, PLATFORM_AT, 'Cleo releases the panel: it clicks along the rail, snapping to the next stop and resting there, a stop every half second. LOCK glows on Cleo\'s phone while it rests over stop 6.', PLATFORM_AT - 100],
      [PLATFORM_AT, LOWER_AT, 'Locked over the platform, the crate swings, wide at first, then calmer. While the swing reaches over Cleo, Lower is striped on Hana\'s phone and the console lamp flashes on both. Hana waits.', OVER_CONSOLE],
      [LOWER_AT, LOWER_AT + 600, 'Lower glows once the swing holds the crate over the platform. Hana lowers: it lands, and the platform\'s jaws close.', LANDED_AT + 200],
      [LOWER_AT + 600, LOWER_AT + 3700, 'Each turns a key, Hana in the cab, Cleo at the console. The lift takes the crate down to the galley: +5 packages.', LOWER_AT + 1700],
    ],
  }),
  board({
    id: 'chop',
    title: "The cut: the panel locked over the cab",
    about: "Lock the panel as it rests over the Winch operator's cab",
    steps: presses([...upAndAway(), [CAB_AT, 'panel', 'lock']]),
    captions: [
      [0, RELEASE, 'Hana raises the crate; Cleo releases the panel.', B + 1200],
      [RELEASE, CAB_AT, 'The panel clicks past the platform to the rail\'s end, over Hana\'s cab. Both phones show it: LOCK is striped on Cleo\'s phone from the moment it is about to leave stop 6, and the cab\'s lamp flashes.', CAB_AT - 100],
      [CAB_AT, CAB_AT + 1000, 'Cleo locks it there. The blade drops into the cab: CHOP! By mistake, or not: no phone can tell. Lethal, with no escape and no Hospital, and not an attack: it uses nothing.', CAB_AT + 300],
      [CAB_AT + 1000, CAB_AT + 3500, 'The crate hangs from the panel at stop 7, not over the platform: the Task is lost. Cleo returns alone.', CAB_AT + 2300],
    ],
  }),
  board({
    id: 'drop',
    title: "The drop: the crate lowered over the console",
    about: 'Lower while the swing has the crate over the Panel operator; the panel stays over the platform, so the Winch finishes alone',
    steps: presses([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower'], [DROP_RAISE, 'winch', 'raise'], [DROP_LOWER, 'winch', 'lower'], [DROP_LOWER + 700, 'winch', 'key']]),
    captions: [
      [0, PLATFORM_AT, 'Up, released, locked over the platform, as in cooperation.', PLATFORM_AT - 100],
      [PLATFORM_AT, OVER_CONSOLE, 'The crate swings out over Cleo at the console. Both phones show it: Lower is striped on Hana\'s phone, the console lamp flashes.', OVER_CONSOLE - 75],
      [OVER_CONSOLE, DROP_RAISE, 'Hana lowers just then: the crate falls on Cleo, THUD! By mistake, or not; lethal, with no escape, and not the Hospital.', OVER_CONSOLE + 275],
      [DROP_RAISE, DROP_LOWER + 700, 'The panel is still locked over the platform, the correct position, so Hana can finish alone: Hana raises the crate again and lowers it onto the platform.', DROP_LOWER + 400],
      [DROP_LOWER + 700, DROP_LOWER + 3500, 'Hana turns the Winch\'s key alone: delivered, +5 packages.', DROP_LOWER + 1800],
    ],
  }),
  board({
    id: 'standoff',
    title: 'Survivor completion: the standoff',
    about: 'Landed, the Winch turns its key; the Panel releases the empty panel instead, cuts, and sends the crate alone',
    steps: presses([...COOP_UP, [LOWER_AT, 'winch', 'lower'], [LOWER_AT + 600, 'winch', 'key'], [STANDOFF_RELEASE, 'panel', 'release'], [STANDOFF_LOCK, 'panel', 'lock'], [STANDOFF_LOCK + 900, 'panel', 'key']]),
    captions: [
      [0, LOWER_AT + 400, 'Cooperation up to the landing: the crate is on the platform, the correct position. The jaws hold it; the hook is free.', LANDED_AT + 200],
      [LOWER_AT + 400, STANDOFF_RELEASE, 'Hana turns the Winch\'s key. The lift needs every living operator\'s key: it waits for Cleo\'s.', LOWER_AT + 1000],
      [STANDOFF_RELEASE, STANDOFF_LOCK, 'Cleo releases the empty panel instead: it clicks on toward Hana\'s cab. Hana cannot escape.', STANDOFF_RELEASE + 120],
      [STANDOFF_LOCK, STANDOFF_LOCK + 900, 'Cleo locks it over the cab: CHOP! Hana is killed. The crate stays clamped on the platform.', STANDOFF_LOCK + 300],
      [STANDOFF_LOCK + 900, STANDOFF_LOCK + 3500, 'Cleo turns the Panel\'s key alone: delivered, +5 packages.', STANDOFF_LOCK + 2000],
    ],
  }),
  board({
    id: 'protection-cut',
    title: 'Protection against the cut',
    about: "The Winch operator has Protection: the cab's roof buffer catches the blade, and the block uses the Protection up",
    protection: { winch: true, panel: false },
    steps: presses([...PCUT_UP, [PCUT_LOWER, 'winch', 'lower'], [PCUT_LOWER + 700, 'winch', 'key'], [PCUT_LOWER + 1300, 'panel', 'key']]),
    captions: [
      [0, CAB_AT, 'The panel clicks on to the cab\'s stop, and Cleo locks it there.', CAB_AT - 100],
      [CAB_AT, PCUT_RELEASE, 'Hana has Protection: the cab\'s roof buffer throws across and catches the blade, CLANK! The block uses the Protection up, as any block does. Both phones show the same STOPPED and nothing else; the catch also holds by luck one time in four, so a CLANK! proves nothing.', CAB_AT + 250],
      [PCUT_RELEASE, PCUT_LOWER, 'Both alive, the Task goes on: released again, it clicks back to the platform, and Cleo locks it there.', PCUT_LOCK + 200],
      [PCUT_LOWER, PCUT_LOWER + 4000, 'Hana lowers it onto the platform once the swing holds it there; both keys: delivered.', PCUT_LOWER + 1900],
    ],
  }),
  board({
    id: 'protection-drop',
    title: 'Protection against the drop',
    about: "The Panel operator has Protection: the winch's brake catches the crate, and the block uses the Protection up",
    protection: { winch: false, panel: true },
    steps: presses([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower'], [PDROP_LOWER, 'winch', 'lower'], [PDROP_LOWER + 600, 'winch', 'key'], [PDROP_LOWER + 1200, 'panel', 'key']]),
    captions: [
      [0, OVER_CONSOLE, 'Locked over the platform; the crate swings out over Cleo, and Hana lowers.', OVER_CONSOLE - 75],
      [OVER_CONSOLE, PDROP_LOWER, 'Cleo has Protection: the winch\'s brake catches the crate, CLANK! The block uses the Protection up. The same STOPPED on both phones, as when the catch holds by luck; the crate swings on.', OVER_CONSOLE + 175],
      [PDROP_LOWER, PDROP_LOWER + 600, 'Hana waits until the swing holds the crate over the platform, and lowers: landed.', PDROP_LOWER + 500],
      [PDROP_LOWER + 600, PDROP_LOWER + 3700, 'Both keys: delivered.', PDROP_LOWER + 1700],
    ],
  }),
  board({
    id: 'mistakes',
    title: 'Mistakes that cost only time',
    about: 'A lock one stop early, a Lower too soon: each is put right, and the crate still goes down',
    steps: presses([...MISTAKES_UP, [MISTAKES_LOWER, 'winch', 'lower'], [MISTAKES_LOWER + 700, 'winch', 'key'], [MISTAKES_LOWER + 1300, 'panel', 'key']]),
    captions: [
      [0, EARLY_LOCK, 'Up and released, as in cooperation.', RELEASE + 700],
      [EARLY_LOCK, RETRY_RELEASE, 'Cleo locks one stop early, over Cleo\'s own console: the crate swings right over Cleo. Lower is striped on Hana\'s phone, and Hana waits.', EARLY_LOCK + 650],
      [RETRY_RELEASE, TOO_SOON, 'Cleo releases, and locks again as it rests over the platform.', RETRY_LOCK + 150],
      [TOO_SOON, RAISE_AGAIN, 'Hana lowers too soon, at the far end of the swing: it misses the platform, CLUNK, onto the deck.', TOO_SOON + 500],
      [RAISE_AGAIN, MISTAKES_LOWER + 700, 'Hana raises it again: lifted off the deck it barely swings. Lowered over the platform, it lands.', MISTAKES_LOWER + 400],
      [MISTAKES_LOWER + 700, MISTAKES_LOWER + 3700, 'Both keys: delivered, a few seconds later than in cooperation.', MISTAKES_LOWER + 1800],
    ],
  }),
  board({
    id: 'timeout',
    title: 'Lost: the time runs out',
    about: 'The crate never lands before the deadline',
    steps: presses([...upAndAway(), [SHORT_LOCK, 'panel', 'lock']]).concat([{ at: TIMING.deadline }]),
    cuts: [[0, SHORT_LOCK + 900], [TIMING.deadline - 4000, TIMING.deadline + 3200]],
    captions: [
      [0, SHORT_LOCK + 900, 'Up and released; Cleo locks it at stop 3, short of the platform, and neither presses again.', SHORT_LOCK + 500],
      [TIMING.deadline - 4000, TIMING.deadline, 'The timer runs down on both phones: 30 seconds for the whole Task, the briefing included (the owner).', TIMING.deadline - 1500],
      [TIMING.deadline, TIMING.deadline + 3200, 'Time: the Task is lost. Nothing is delivered; both return.', TIMING.deadline + 1500],
    ],
  }),
  board({
    id: 'disconnect',
    title: 'Disconnect: the Task is cancelled',
    about: 'A participant is out of contact longer than the grace',
    steps: presses(upAndAway()).concat([{ at: OUT_AT, seat: SEATS.panel, online: false }, { at: OUT_AT + TIMING.grace }]),
    cuts: [[0, OUT_AT + 2300], [OUT_AT + TIMING.grace - 2500, OUT_AT + TIMING.grace + 3000]],
    captions: [
      [0, OUT_AT, 'Up and released; the panel clicks along the rail.', OUT_AT - 250],
      [OUT_AT, OUT_AT + TIMING.grace, 'Cleo\'s phone loses its connection. The Task runs on for an 8-second grace; the panel clicks on, and Hana\'s phone says Cleo is offline. A cut or a drop that landed now would stand. Leaving on purpose costs nothing more (the owner).', OUT_AT + TIMING.grace - 2000],
      [OUT_AT + TIMING.grace, OUT_AT + TIMING.grace + 3000, 'Cleo is still out: the Task is cancelled. Nothing is delivered; both return to their places at the end of the Task\'s time.', OUT_AT + TIMING.grace + 1500],
    ],
  }),
]);

export const boardOf = id => BOARDS.find(b => b.id === id) ?? null;
