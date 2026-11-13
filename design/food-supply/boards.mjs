// mothership:dev-only
//
// The Food Supply Task's storyboards: scripted runs of presses, played through the Task's own rules
// (./task.mjs) so that every frame shows what those rules give. Synthetic fixtures: the phone pack's
// invented roster (design/phone-ui/prototype/fixtures.mjs), Hana (seat 8, the Winch) and Cleo (seat
// 3, the Panel), both from Room B, where the pack's fixtures put them. Times are milliseconds from
// the Task's start; the briefing ends at 4 s. The press times follow from the panel's click and the
// crate's swing (task.mjs): released from stop 1, the panel snaps on a stop every 0.25 s (twice as fast:
// the owner, 13 November 2026) and rests at each, so it rests over the platform from 1.05 s to 1.25 s
// after the release and over the cab from 1.3 s to 1.5 s; locked, the crate's swing is first over the
// console 0.975 s later. The Winch holds the crate up from its raise (the finger down on Hold) to its
// lower (the finger off). Each press is timed by the moment the server receives it, which is what
// decides it (task.mjs act()).
// Each caption is [from, to, text, key]: the key is the moment the storyboard draws. Each caption
// says what the frame shows; none claims a rule the owner has not confirmed, and the PROPOSED
// readings are marked.

import { CLICK, TIMING, simulate, startTask, sweep, tick, view } from './task.mjs';

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
/** A moment the panel rests at a stop on its first run right after the release: 100 ms into its rest (a LOCK made in its glow arrives then). */
const restingAt = stop => RELEASE + (stop - 1) * CLICK + TIMING.move + 100;
/** The same moment for a panel released at `releaseAt` from stop `from` going `dir`: 100 ms into its first rest at `stop`. */
function restsAt(releaseAt, from, dir, stop) {
  for (let dt = 0; dt < 6000; dt += 5) { const p = sweep(from, dir, dt); if (p.stop === stop && p.resting) return releaseAt + dt + 100; }
  throw new Error(`the panel never rests at ${stop}`);
}
const PLATFORM_AT = restingAt(5), CAB_AT = restingAt(6), OVER_CONSOLE = PLATFORM_AT + 975;

/** The first moment from `from` on when the Winch's phone says let go: the swing holds the crate over the platform for the whole margin. */
function steadyLower(list, from, protection) {
  const frames = simulate(startTask({ seats: SEATS }), presses(list), { protection });
  const last = frames[frames.length - 1].state;
  for (let t = from; t < from + 4000; t += 5) {
    const hold = view(tick(last, t).state, SEATS.winch, t).buttons.find(b => b.act === 'hold');
    if (hold?.holding && hold.next) return t;
  }
  throw new Error(`no steady moment after ${from}`);
}

/** Cooperation's moments, shared by several storyboards and the review pages. */
const COOP_UP = [...upAndAway(), [PLATFORM_AT, 'panel', 'lock']];
const LOWER_AT = steadyLower(COOP_UP, PLATFORM_AT + 2300);
const LANDED_AT = LOWER_AT + TIMING.lower;
/** Key moments of the storyboards, for the review pages: the release, the rests over the platform and the cab, the swing over the console, the steady let-go. */
export const MOMENTS = Object.freeze({ briefing: B, release: RELEASE, platform: PLATFORM_AT, cab: CAB_AT, overConsole: OVER_CONSOLE, lower: LOWER_AT, landed: LANDED_AT });

const board = ({ id, title, about, steps, captions, protection = { winch: false, panel: false }, cuts = null, proposed = [] }) =>
  Object.freeze({ id, title, about, seats: SEATS, protection, steps: Object.freeze(steps), captions: Object.freeze(captions), cuts, proposed: Object.freeze(proposed) });

// The storyboards' own moments.
const STANDOFF_RELEASE = LOWER_AT + 1300, STANDOFF_LOCK = STANDOFF_RELEASE + TIMING.move + 150;
const PCUT_RELEASE = CAB_AT + 1300, PCUT_LOCK = PCUT_RELEASE + TIMING.move + 150;
const PCUT_UP = [...upAndAway(), [CAB_AT, 'panel', 'lock'], [PCUT_RELEASE, 'panel', 'release'], [PCUT_LOCK, 'panel', 'lock']];
const PCUT_LOWER = steadyLower(PCUT_UP, PCUT_LOCK + 2300, { winch: true, panel: false });
// Protection against the drop: the brake holds the crate; the Winch's finger takes it back.
const PDROP_HOLD = OVER_CONSOLE + 700;
const PDROP_LOWER = steadyLower([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower'], [PDROP_HOLD, 'winch', 'raise']], PLATFORM_AT + 2300, { winch: false, panel: true });
// Mistakes: a lock one stop early, then a let-go too soon that breaks the crate; the hook fetches a new one.
const EARLY_LOCK = restingAt(4), RETRY_RELEASE = EARLY_LOCK + 900, RETRY_LOCK = RETRY_RELEASE + TIMING.move + 150;
const TOO_SOON = RETRY_LOCK + 325;
const FETCH_RELEASE = TOO_SOON + 700, FETCH_LOCK = restsAt(FETCH_RELEASE, 5, 1, 0);
const LIFT_AGAIN = FETCH_LOCK + 450, CARRY_RELEASE = LIFT_AGAIN + 900, CARRY_LOCK = restsAt(CARRY_RELEASE, 0, 1, 5);
const MISTAKES_UP = [...upAndAway(), [EARLY_LOCK, 'panel', 'lock'], [RETRY_RELEASE, 'panel', 'release'], [RETRY_LOCK, 'panel', 'lock'], [TOO_SOON, 'winch', 'lower'],
  [FETCH_RELEASE, 'panel', 'release'], [FETCH_LOCK, 'panel', 'lock'], [LIFT_AGAIN, 'winch', 'raise'], [CARRY_RELEASE, 'panel', 'release'], [CARRY_LOCK, 'panel', 'lock']];
const MISTAKES_LOWER = steadyLower(MISTAKES_UP, CARRY_LOCK + 2300);
const SHORT_LOCK = restingAt(2), OUT_AT = RELEASE + 700;

export const BOARDS = Object.freeze([
  board({
    id: 'cooperation',
    title: 'Cooperation',
    about: 'Hold it up, release the panel, lock it as it rests over the platform, let go as the swing holds it over the platform, both turn a key',
    steps: presses([...COOP_UP, [LOWER_AT, 'winch', 'lower'], [LOWER_AT + 600, 'winch', 'key'], [LOWER_AT + 1200, 'panel', 'key']]),
    captions: [
      [0, B, 'Briefing. Hana runs the Winch (up and down) from the cab at stop 7; Cleo runs the locking Panel (left and right) from the console at stop 5. The platform is stop 6.', 2500],
      [B, RELEASE, 'Hana presses and holds Hold: the crate rises out of the intake at stop 1, and stays up while Hana holds.', B + 900],
      [RELEASE, PLATFORM_AT, 'Cleo releases the panel: it clicks along the rail, snapping to the next stop and resting there, four stops a second. LOCK glows on Cleo\'s phone as it comes to stop 6.', PLATFORM_AT - 100],
      [PLATFORM_AT, LOWER_AT, 'Locked over the platform, the crate swings, wide at first, then calmer. While the swing reaches over Cleo, Hold is striped on Hana\'s phone (letting go would drop it on Cleo) and the console lamp flashes on both. Hana keeps holding.', OVER_CONSOLE],
      [LOWER_AT, LOWER_AT + 600, 'Hold glows once the swing holds the crate over the platform: let go now. Hana lets go: it lands, and the platform\'s jaws close.', LANDED_AT + 200],
      [LOWER_AT + 600, LOWER_AT + 3700, 'Each turns a key, Hana in the cab, Cleo at the console. The lift takes the crate down to the galley: +5 packages.', LOWER_AT + 1700],
    ],
  }),
  board({
    id: 'chop',
    title: "The cut: the panel locked over the cab",
    about: "Lock the panel as it rests over the Winch operator's cab",
    steps: presses([...upAndAway(), [CAB_AT, 'panel', 'lock']]),
    captions: [
      [0, RELEASE, 'Hana holds the crate up; Cleo releases the panel.', B + 1200],
      [RELEASE, CAB_AT, 'The panel clicks past the platform to the rail\'s end, over Hana\'s cab. Both phones show it: LOCK is striped on Cleo\'s phone from the moment it is about to leave stop 6, and the cab\'s lamp flashes.', CAB_AT - 100],
      [CAB_AT, CAB_AT + 1000, 'Cleo locks it there. The blade drops into the cab: CHOP! By mistake, or not: no phone can tell. Lethal, with no escape and no Hospital, and not an attack: it uses nothing.', CAB_AT + 300],
      [CAB_AT + 1000, CAB_AT + 3500, 'The crate hangs from the panel at stop 7, not over the platform: the Task is lost. Cleo returns alone.', CAB_AT + 2300],
    ],
  }),
  board({
    id: 'drop',
    title: "The drop: the crate let go over the console",
    about: 'Let go while the swing has the crate over the Panel operator: it falls on them and breaks, and with the Panel out no one can fetch another, so the Task is lost',
    steps: presses([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower']]),
    captions: [
      [0, PLATFORM_AT, 'Up, released, locked over the platform, as in cooperation.', PLATFORM_AT - 100],
      [PLATFORM_AT, OVER_CONSOLE, 'The crate swings out over Cleo at the console. Both phones show it: Hold is striped on Hana\'s phone, the console lamp flashes.', OVER_CONSOLE - 75],
      [OVER_CONSOLE, OVER_CONSOLE + 1200, 'Hana lets go just then: the crate falls on Cleo, THUD!, and breaks. By mistake, or not; lethal, with no escape, and not the Hospital.', OVER_CONSOLE + 275],
      [OVER_CONSOLE + 1200, OVER_CONSOLE + 3500, 'A new crate waits in the intake, but with Cleo out no one can bring the hook to it: the Task is lost. Hana returns alone.', OVER_CONSOLE + 2300],
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
      [PCUT_LOWER, PCUT_LOWER + 4000, 'Hana, holding all along, lets go once the swing holds it over the platform: landed; both keys: delivered.', PCUT_LOWER + 1900],
    ],
  }),
  board({
    id: 'protection-drop',
    title: 'Protection against the drop',
    about: "The Panel operator has Protection: the winch's brake catches the crate, and the block uses the Protection up",
    protection: { winch: false, panel: true },
    steps: presses([...COOP_UP, [OVER_CONSOLE, 'winch', 'lower'], [PDROP_HOLD, 'winch', 'raise'], [PDROP_LOWER, 'winch', 'lower'], [PDROP_LOWER + 600, 'winch', 'key'], [PDROP_LOWER + 1200, 'panel', 'key']]),
    captions: [
      [0, OVER_CONSOLE, 'Locked over the platform; the crate swings out over Cleo, and Hana lets go.', OVER_CONSOLE - 75],
      [OVER_CONSOLE, PDROP_HOLD, 'Cleo has Protection: the winch\'s brake catches the crate, CLANK! The block uses the Protection up. The same STOPPED on both phones, as when the catch holds by luck; the crate swings on, held by the brake.', OVER_CONSOLE + 175],
      [PDROP_HOLD, PDROP_LOWER + 600, 'Hana presses Hold again to take it back, waits until the swing holds the crate over the platform, and lets go: landed.', PDROP_LOWER + 500],
      [PDROP_LOWER + 600, PDROP_LOWER + 3700, 'Both keys: delivered.', PDROP_LOWER + 1700],
    ],
  }),
  board({
    id: 'mistakes',
    title: 'Mistakes that cost only time',
    about: 'A lock one stop early, a let-go too soon: the crate breaks, the hook fetches a new one from the intake, and it still goes down',
    steps: presses([...MISTAKES_UP, [MISTAKES_LOWER, 'winch', 'lower'], [MISTAKES_LOWER + 700, 'winch', 'key'], [MISTAKES_LOWER + 1300, 'panel', 'key']]),
    captions: [
      [0, EARLY_LOCK, 'Up and released, as in cooperation: Hana holds the crate up under the clicking panel.', RELEASE + 400],
      [EARLY_LOCK, RETRY_RELEASE, 'Cleo locks one stop early, over Cleo\'s own console: the crate swings right over Cleo. Hold is striped on Hana\'s phone, and Hana keeps holding.', EARLY_LOCK + 650],
      [RETRY_RELEASE, TOO_SOON, 'Cleo releases, and locks again as it rests over the platform.', RETRY_LOCK + 150],
      [TOO_SOON, FETCH_RELEASE, 'Hana lets go too soon, at the far end of the swing: it misses the platform and breaks on the deck, CRASH! A new crate rises into the intake.', TOO_SOON + 650],
      [FETCH_RELEASE, LIFT_AGAIN, 'Cleo releases the empty hook and locks it back over the intake, at stop 1.', FETCH_LOCK + 150],
      [LIFT_AGAIN, MISTAKES_LOWER + 700, 'Hana holds again: the new crate rises. Cleo carries it back and locks it over the platform; Hana lets go as the swing holds it there: it lands.', MISTAKES_LOWER + 400],
      [MISTAKES_LOWER + 700, MISTAKES_LOWER + 3700, 'Both keys: delivered, seconds later than in cooperation. A broken crate costs time, not food.', MISTAKES_LOWER + 1800],
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
      [0, OUT_AT, 'Up and released; the panel clicks along the rail, Hana holding the crate under it.', OUT_AT - 250],
      [OUT_AT, OUT_AT + TIMING.grace, 'Cleo\'s phone loses its connection. The Task runs on for an 8-second grace; the panel clicks on, and Hana\'s phone says Cleo is offline. A cut or a drop that landed now would stand. Leaving on purpose costs nothing more (the owner).', OUT_AT + TIMING.grace - 2000],
      [OUT_AT + TIMING.grace, OUT_AT + TIMING.grace + 3000, 'Cleo is still out: the Task is cancelled. Nothing is delivered; both return to their places at the end of the Task\'s time.', OUT_AT + TIMING.grace + 1500],
    ],
  }),
]);

export const boardOf = id => BOARDS.find(b => b.id === id) ?? null;
