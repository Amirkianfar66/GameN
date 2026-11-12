// mothership:dev-only
//
// The Food Supply Task's acceptance scenarios for Backend, Frontend and Game Balance: the nine
// storyboards (./boards.mjs) and the edge cases below, each a start, a list of steps and what must
// follow. Each states its expectation independently; packages/design-tokens/test/food-supply.test.mjs
// plays it through the design's mechanics model (./task.mjs) and checks that the model agrees, and
// design/tools/food-supply-export.mjs writes them into handoff.json. A design reference on the
// phone pack's invented roster (Hana, seat 8, the Winch; Cleo, seat 3, the Panel), not the engine.

import { CLICK, TIMING, startTask, simulate } from './task.mjs';
import { BOARDS, CAST, MOMENTS } from './boards.mjs';

const SEATS = Object.freeze({ winch: CAST.winch.seat, panel: CAST.panel.seat });
const B = TIMING.briefing;
const press = (at, role, act, extra = {}) => ({ at, seat: SEATS[role], act, ...extra });
const offline = (at, role) => ({ at, seat: SEATS[role], online: false });
const online = (at, role) => ({ at, seat: SEATS[role], online: true });
/** Raise out of the intake, release the panel from stop 1 going right (the storyboards' own moments). */
const R = MOMENTS.release;
const up = () => [press(B + 600, 'winch', 'raise'), press(R, 'panel', 'release')];
const PLATFORM_AT = MOMENTS.platform, CAB_AT = MOMENTS.cab, OVER_CONSOLE = MOMENTS.overConsole;
/** On the panel's first run right: 100 ms into its rest at a stop; the moment its rest at a stop ends and it snaps on. */
const restingAt = stop => R + (stop - 1) * CLICK + TIMING.move + 100;
const leaves = stop => R + stop * CLICK;
/** Up, locked over the platform, lowered when the swing holds it there: landed, the keys free from MOMENTS.landed. */
const land = () => [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(MOMENTS.lower, 'winch', 'lower')];
const LANDED = MOMENTS.landed;
/** The Task's revision after these steps: what a phone shows, and binds its next press to. */
const revisionAfter = steps => { const f = simulate(startTask({ seats: SEATS }), steps); return f[f.length - 1].state.revision; };
/** The drop's survivor: raised again and lowered in when steady (the drop storyboard's own moments). */
const dropBoard = () => BOARDS.find(b => b.id === 'drop');

/**
 * Edge cases. expect: the outcome at the end (null: still running), who is alive, and facts about
 * the events (a type that must appear, one that must not, how many of a type, a refusal's reason,
 * where a lock or a miss happened, how many stops). Each press is timed by the moment the server
 * receives it. roll: the server's random number for a press that would kill. protection: the game's
 * applicable Protection when the scenario starts, read at each lethal press and used up by a block.
 */
export const EDGES = Object.freeze([
  {
    id: 'briefing-refused', about: 'A press during the briefing does nothing.',
    steps: [press(1000, 'winch', 'raise')],
    expect: { outcome: null, refused: ['briefing'], absent: ['RAISED'] },
  },
  {
    id: 'not-your-control', about: "A participant cannot press the other's control: the Winch has no LOCK.",
    steps: [press(B + 600, 'winch', 'lock')],
    expect: { outcome: null, refused: ['not-your-control'] },
  },
  {
    id: 'release-needs-the-crate-up', about: 'The panel will not run while the crate is down on its hook: RELEASE first needs the Winch\'s Raise.',
    steps: [press(B + 600, 'panel', 'release')],
    expect: { outcome: null, refused: ['crate-down'], absent: ['RELEASED'] },
  },
  {
    id: 'busy-while-raising', about: 'While the crate is still rising, the panel cannot be released.',
    steps: [press(B + 600, 'winch', 'raise'), press(B + 800, 'panel', 'release')],
    expect: { outcome: null, refused: ['busy'] },
  },
  {
    id: 'lower-needs-the-lock', about: 'While the panel runs, the winch is held: Lower does nothing until the panel is locked.',
    steps: [...up(), press(R + 400, 'winch', 'lower')],
    expect: { outcome: null, refused: ['unlocked'], absent: ['LOWERED'] },
  },
  {
    id: 'lock-twice', about: 'A second LOCK on a locked panel does nothing: the button sends what it showed, so a double tap never releases it.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(PLATFORM_AT + 100, 'panel', 'lock')],
    expect: { outcome: null, refused: ['locked'], locked: [5] },
  },
  {
    id: 'lock-at-rest', about: 'The panel rests 0.4 s at each stop (the owner\'s). A LOCK the server receives at any moment of its rest over the platform, even the last, locks it there.',
    steps: [...up(), press(leaves(5) - 1, 'panel', 'lock')],
    expect: { outcome: null, locked: [5], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'lock-in-the-snap', about: 'Once the panel snaps on from the platform toward the cab, a LOCK takes the stop it is snapping to: stop 7, the cut.',
    steps: [...up(), press(leaves(5) + 1, 'panel', 'lock')],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, locked: [6], alive: { winch: false, panel: true } },
  },
  {
    id: 'press-resolves-on-arrival', about: 'A LOCK pressed while Cleo\'s phone showed the panel resting over 6, near the end of its rest, reaches the server after the panel has snapped on toward 7. It is resolved where the panel is when it arrives: at 7, the cut. The phone had warned: LOCK is striped for the rest\'s last 0.15 s (the owner\'s margin). shownAt, the phone\'s own moment, decides nothing.',
    steps: [...up(), press(leaves(5) + 80, 'panel', 'lock', { shownAt: leaves(5) - 70 })],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, locked: [6], present: ['KILLED'] },
  },
  {
    id: 'stale-press', about: 'A Lower made on the revision before the panel was released reaches the server after the release: refused as stale, never resolved on a picture that is gone.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(PLATFORM_AT + 1500, 'panel', 'release'), press(PLATFORM_AT + 1550, 'winch', 'lower', { revision: revisionAfter([...up(), press(PLATFORM_AT, 'panel', 'lock')]) })],
    expect: { outcome: null, refused: ['stale'], absent: ['LOWERED'] },
  },
  {
    id: 'retry-same-command', about: 'A LOCK retried with the same command id, after its answer was lost: the server returns the first answer and changes nothing. A retry is never a second press.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock', { commandId: 'cleo-lock-1' }), press(PLATFORM_AT + 400, 'panel', 'lock', { commandId: 'cleo-lock-1' })],
    expect: { outcome: null, locked: [5], present: ['RECEIPT'], absent: ['REFUSED'] },
  },
  {
    id: 'retry-keeps-the-roll', about: 'A LOCK at the cab that the catch stopped by luck is retried with the same command id: the first answer stands. No second roll, so no second chance to kill.',
    steps: [...up(), press(CAB_AT, 'panel', 'lock', { commandId: 'cleo-lock-2', roll: 0.1 }), press(CAB_AT + 300, 'panel', 'lock', { commandId: 'cleo-lock-2', roll: 0.9 })],
    expect: { outcome: null, alive: { winch: true, panel: true }, stops: 1, present: ['STOPPED', 'RECEIPT'], absent: ['KILLED'] },
  },
  {
    id: 'drop-from-the-console-stop', about: 'Locked over the console instead of the platform, the crate swings right over the Panel operator. Lowered then, it falls on them, and the panel is not over the platform: the Task is lost.',
    steps: [...up(), press(restingAt(4), 'panel', 'lock'), press(restingAt(4) + 650, 'winch', 'lower')],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, locked: [4], alive: { winch: true, panel: false } },
  },
  {
    id: 'lucky-catch-cut', about: 'The owner\'s luck: Hana has no Protection, but the server\'s roll for the lock is under 1 in 4: the roof buffer holds, CLANK!, exactly as a Protection block shows.',
    steps: [...up(), press(CAB_AT, 'panel', 'lock', { roll: 0.1 })],
    expect: { outcome: null, alive: { winch: true, panel: true }, present: ['STOPPED'], absent: ['KILLED'] },
  },
  {
    id: 'lucky-catch-drop', about: 'The same luck on the drop: the winch\'s brake holds and the crate swings on.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.2 })],
    expect: { outcome: null, alive: { winch: true, panel: true }, present: ['STOPPED'], absent: ['KILLED'] },
  },
  {
    id: 'luck-runs-out', about: 'A roll of 1 in 4 or more: the catch does not hold, and the cut kills.',
    steps: [...up(), press(CAB_AT, 'panel', 'lock', { roll: 0.25 })],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: false, panel: true }, present: ['KILLED'] },
  },
  {
    id: 'protection-used-once', about: 'Cleo has Protection. The first drop is stopped by it, and the block uses it up, as any block does (packages/engine physical.ts). A second drop at once, with a roll of 1 in 4 or more, kills.',
    protection: { winch: false, panel: true },
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.9 }), press(OVER_CONSOLE + 25, 'winch', 'lower', { roll: 0.9 })],
    expect: { outcome: null, alive: { winch: true, panel: false }, stops: 1, present: ['KILLED'] },
  },
  {
    id: 'back-into-the-intake', about: 'Lowered again at once over the intake, the crate goes back into the hatch: a miss, nothing worse.',
    steps: [press(B + 600, 'winch', 'raise'), press(B + 1600, 'winch', 'lower')],
    expect: { outcome: null, missed: ['intake'], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'landed-winch-idle', about: 'Landed, the crate is clamped: the Winch cannot raise it off the platform.',
    steps: [...land(), press(LANDED + 200, 'winch', 'raise')],
    expect: { outcome: null, refused: ['landed'], present: ['LANDED'] },
  },
  {
    id: 'key-before-landing', about: 'The keys work only once the crate has landed.',
    steps: [...up(), press(R + 400, 'winch', 'key')],
    expect: { outcome: null, refused: ['not-landed'], absent: ['KEY'] },
  },
  {
    id: 'key-twice', about: 'A turned key stays turned; a second turn does nothing.',
    steps: [...land(), press(LANDED + 100, 'winch', 'key'), press(LANDED + 400, 'winch', 'key')],
    expect: { outcome: null, refused: ['turned'], present: ['KEY'] },
  },
  {
    id: 'keys-stay-turned', about: 'PROPOSED. Landed, Hana turns the Winch\'s key; Cleo releases the empty panel, lets it click past the cab and back, and locks it over the platform again, then turns the Panel\'s key: delivered by both, Hana\'s key still turned.',
    steps: [...land(), press(LANDED + 300, 'winch', 'key'), press(LANDED + 900, 'panel', 'release'), press(LANDED + 900 + CLICK + TIMING.move + 100, 'panel', 'lock'), press(LANDED + 900 + 2 * CLICK + 300, 'panel', 'key')],
    expect: { outcome: { result: 'delivered', packages: 5, alone: false }, locked: [5, 5], absent: ['KILLED'] },
  },
  {
    id: 'cut-after-own-key', about: 'Landed, Cleo turns the Panel\'s key first, then releases and cuts: Hana dies with the crate on the platform, and Cleo\'s key is already turned, so it goes down at once.',
    steps: [...land(), press(LANDED + 300, 'panel', 'key'), press(LANDED + 900, 'panel', 'release'), press(LANDED + 900 + TIMING.move + 150, 'panel', 'lock')],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true } },
  },
  {
    id: 'one-delivery', about: 'The last key\'s press is retried with the same command id: the first answer stands. One delivery, five packages, never ten.',
    steps: [...land(), press(LANDED + 100, 'winch', 'key'), press(LANDED + 400, 'panel', 'key', { commandId: 'cleo-key' }), press(LANDED + 700, 'panel', 'key', { commandId: 'cleo-key' })],
    expect: { outcome: { result: 'delivered', packages: 5, alone: false }, counts: { SENT: 1 }, present: ['RECEIPT'] },
  },
  {
    id: 'reconnect-in-grace', about: 'Out of contact for less than the grace: the Task never paused, and it goes on.',
    steps: [press(B + 600, 'winch', 'raise'), offline(B + 1000, 'panel'), online(B + 1000 + TIMING.grace - 1000, 'panel'), press(B + 1000 + TIMING.grace, 'panel', 'release'), { at: B + 1000 + TIMING.grace + 2000 }],
    expect: { outcome: null, present: ['OFFLINE', 'ONLINE', 'RELEASED'] },
  },
  {
    id: 'death-stands-in-grace', about: 'A drop that lands while its victim is out of contact stands; the panel is over the platform, so the Winch goes on alone and delivers. The dead participant\'s connection no longer matters.',
    steps: [...dropBoard().steps.slice(0, 4), offline(PLATFORM_AT + 200, 'panel'), ...dropBoard().steps.slice(4), { at: PLATFORM_AT + 200 + TIMING.grace + 500 }].sort((a, b) => a.at - b.at),
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: true, panel: false } },
  },
  {
    id: 'offline-victim-cut', about: "Landed; the Winch operator drops out of contact and the Panel operator cuts. The death stands and the Panel's key alone sends the crate.",
    steps: [...land(), offline(LANDED + 100, 'winch'), press(LANDED + 900, 'panel', 'release'), press(LANDED + 900 + TIMING.move + 150, 'panel', 'lock'), press(LANDED + 1900, 'panel', 'key'), { at: LANDED + 100 + TIMING.grace + 500 }],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true } },
  },
  {
    id: 'dead-cannot-press', about: "A killed participant's presses do nothing.",
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower'), press(OVER_CONSOLE + 500, 'panel', 'release')],
    expect: { outcome: null, refused: ['down'], alive: { winch: true, panel: false } },
  },
  {
    id: 'survivor-out-of-time', about: 'After the drop, the Winch can finish alone, but only before the deadline: here Hana never lowers it in, and the Task is lost on time.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower'), { at: TIMING.deadline }],
    expect: { outcome: { result: 'lost', why: 'time' }, alive: { winch: true, panel: false } },
  },
  {
    id: 'cancel-without-death', about: 'A participant out of contact for the whole grace: the Task is cancelled; both are alive and return.',
    steps: [press(B + 600, 'winch', 'raise'), offline(B + 1000, 'winch'), { at: B + 1000 + TIMING.grace }],
    expect: { outcome: { result: 'cancelled', why: 'disconnect', who: 'winch' }, alive: { winch: true, panel: true } },
  },
  {
    id: 'earliest-ending', about: 'The deadline passes at 30 s and a participant\'s grace runs out at 33 s, but the server gets to the Task only at 34 s: the earlier boundary decides. Lost on time at 30 s, not cancelled.',
    steps: [press(B + 600, 'winch', 'raise'), offline(TIMING.deadline - TIMING.grace + 3000, 'winch'), { at: TIMING.deadline + 4000 }],
    expect: { outcome: { result: 'lost', why: 'time' }, alive: { winch: true, panel: true } },
  },
  {
    id: 'ending-tie', about: 'The deadline and a participant\'s grace run out at the same moment: the deadline comes first. Lost on time.',
    steps: [press(B + 600, 'winch', 'raise'), offline(TIMING.deadline - TIMING.grace, 'winch'), { at: TIMING.deadline + 100 }],
    expect: { outcome: { result: 'lost', why: 'time' } },
  },
  {
    id: 'no-revival', about: 'A participant comes back after the Task was cancelled: the Task stays cancelled, and their press does nothing.',
    steps: [press(B + 600, 'winch', 'raise'), offline(B + 1000, 'winch'), { at: B + 1000 + TIMING.grace + 10 }, online(B + 1000 + TIMING.grace + 2000, 'winch'), press(B + 1000 + TIMING.grace + 2100, 'winch', 'lower')],
    expect: { outcome: { result: 'cancelled', why: 'disconnect', who: 'winch' }, refused: ['ended'], absent: ['ONLINE', 'LOWERED'] },
  },
].map(Object.freeze));

/** What a scenario's run gave: the outcome, who is alive, and the events. */
export function play({ protection = { winch: false, panel: false }, steps }) {
  const frames = simulate(startTask({ seats: SEATS, at: 0 }), steps, { protection });
  const last = frames[frames.length - 1].state;
  const events = frames.flatMap(f => f.events);
  return { outcome: last.outcome, alive: { ...last.alive }, events };
}

/** The differences between a scenario's expectation and its run (none: the model agrees). */
export function differences(scenario) {
  const got = play(scenario);
  const e = scenario.expect;
  const out = [];
  const types = got.events.map(x => x.type);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (e.outcome === null ? got.outcome !== null : !same(Object.fromEntries(Object.entries(got.outcome ?? {}).filter(([k]) => k in e.outcome)), e.outcome)) out.push(`outcome ${JSON.stringify(got.outcome)}`);
  if (e.alive && !same(got.alive, e.alive)) out.push(`alive ${JSON.stringify(got.alive)}`);
  for (const t of e.present ?? []) if (!types.includes(t)) out.push(`no ${t}`);
  for (const t of e.absent ?? []) if (types.includes(t)) out.push(`a ${t}`);
  for (const [t, n] of Object.entries(e.counts ?? {})) if (types.filter(x => x === t).length !== n) out.push(`${types.filter(x => x === t).length} ${t}`);
  for (const why of e.refused ?? []) if (!got.events.some(x => x.type === 'REFUSED' && x.why === why)) out.push(`no refusal (${why})`);
  if (e.locked && !same(got.events.filter(x => x.type === 'LOCKED').map(x => x.stop), e.locked)) out.push(`locked at ${JSON.stringify(got.events.filter(x => x.type === 'LOCKED').map(x => x.stop))}`);
  if (e.missed && !same(got.events.filter(x => x.type === 'MISSED').map(x => x.on), e.missed)) out.push(`missed ${JSON.stringify(got.events.filter(x => x.type === 'MISSED').map(x => x.on))}`);
  if (e.stops !== undefined && types.filter(t => t === 'STOPPED').length !== e.stops) out.push(`${types.filter(t => t === 'STOPPED').length} stops`);
  return out;
}

/** The storyboards' own expectations: how each must end, and the events that must occur. */
export const BOARD_EXPECT = Object.freeze({
  cooperation: { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, locked: [5], present: ['LANDED', 'SENT'], absent: ['KILLED', 'STOPPED', 'MISSED'] },
  chop: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: false, panel: true }, locked: [6], present: ['KILLED'] },
  drop: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: true, panel: false }, present: ['KILLED', 'LANDED', 'SENT'] },
  standoff: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true }, locked: [5, 6], present: ['LANDED', 'KILLED', 'SENT'] },
  'protection-cut': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, locked: [6, 5], present: ['STOPPED', 'SENT'], absent: ['KILLED'] },
  'protection-drop': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, present: ['STOPPED', 'SENT'], absent: ['KILLED'] },
  mistakes: { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, locked: [4, 5], missed: ['deck'], absent: ['KILLED', 'STOPPED'] },
  timeout: { outcome: { result: 'lost', why: 'time' }, alive: { winch: true, panel: true }, locked: [2], absent: ['KILLED', 'SENT'] },
  disconnect: { outcome: { result: 'cancelled', why: 'disconnect', who: 'panel' }, alive: { winch: true, panel: true }, present: ['OFFLINE'], absent: ['SENT', 'LOCKED'] },
});

/** Every acceptance scenario: the storyboards first, then the edge cases. */
export const SCENARIOS = Object.freeze([
  ...BOARDS.map(b => Object.freeze({ id: b.id, about: b.about, protection: b.protection, steps: b.steps, expect: BOARD_EXPECT[b.id], board: true, proposed: b.proposed })),
  ...EDGES,
]);
