// mothership:dev-only
//
// The Food Supply Task's acceptance scenarios for Backend, Frontend and Game Balance: the nine
// storyboards (./boards.mjs) and the edge cases below, each a start, a list of steps and what must
// follow. Each states its expectation independently; packages/design-tokens/test/food-supply.test.mjs
// plays it through the design's mechanics model (./task.mjs) and checks that the model agrees, and
// design/tools/food-supply-export.mjs writes them into handoff.json. A design reference on the
// phone pack's invented roster (Hana, seat 8, the Winch; Cleo, seat 3, the Panel), not the engine.

import { CLICK, TIMING, startTask, simulate, sweep } from './task.mjs';
import { BOARDS, CAST, MOMENTS } from './boards.mjs';

const SEATS = Object.freeze({ winch: CAST.winch.seat, panel: CAST.panel.seat });
const B = TIMING.briefing;
const press = (at, role, act, extra = {}) => ({ at, seat: SEATS[role], act, ...extra });
const offline = (at, role) => ({ at, seat: SEATS[role], online: false });
const online = (at, role) => ({ at, seat: SEATS[role], online: true });
/** Hold it up out of the intake (raise), release the panel from stop 1 going right (the storyboards' own moments). */
const R = MOMENTS.release;
const up = () => [press(B + 600, 'winch', 'raise'), press(R, 'panel', 'release')];
const PLATFORM_AT = MOMENTS.platform, CAB_AT = MOMENTS.cab, OVER_CONSOLE = MOMENTS.overConsole;
/** On the panel's first run right: 100 ms into its rest at a stop; the moment its rest at a stop ends and it snaps on. */
const restingAt = stop => R + (stop - 1) * CLICK + TIMING.move + 100;
const leaves = stop => R + stop * CLICK;
/** For a panel released at `at` from stop `from` going `dir`: 100 ms into its first rest at `stop`. */
const restsAt = (at, from, dir, stop) => { for (let dt = 0; dt < 6000; dt += 5) { const q = sweep(from, dir, dt); if (q.stop === stop && q.resting) return at + dt + 100; } return null; };
/** Locked over the platform, let go at the far end of the swing: over the deck past the platform, the crate breaks. */
const TOO_SOON = PLATFORM_AT + 325;
/** Up, locked over the platform, let go when the swing holds it there: landed, the keys free from MOMENTS.landed. */
const land = () => [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(MOMENTS.lower, 'winch', 'lower')];
const LANDED = MOMENTS.landed;
/** The Task's revision after these steps: what a phone shows, and binds its next press to. */
const revisionAfter = steps => { const f = simulate(startTask({ seats: SEATS }), steps); return f[f.length - 1].state.revision; };
/** Landed; then Cleo releases the empty hook and locks it over the cab: the cut, with the crate on the platform. */
const cutLanded = () => [...land(), press(LANDED + 900, 'panel', 'release'), press(LANDED + 900 + TIMING.move + 150, 'panel', 'lock')];

/**
 * Edge cases. expect: the outcome at the end (null: still running), who is alive, and facts about
 * the events (a type that must appear, one that must not, how many of a type, a refusal's reason,
 * where a lock happened, where a crate dropped back or broke, how many stops). Each press is timed by the moment the server
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
    id: 'release-needs-the-crate-up', about: 'The panel will not run off a crate waiting under its hook: RELEASE first needs the Winch\'s Hold.',
    steps: [press(B + 600, 'panel', 'release')],
    expect: { outcome: null, refused: ['crate-down'], absent: ['RELEASED'] },
  },
  {
    id: 'busy-while-raising', about: 'While the crate is still rising, the panel cannot be released.',
    steps: [press(B + 600, 'winch', 'raise'), press(B + 800, 'panel', 'release')],
    expect: { outcome: null, refused: ['busy'] },
  },
  {
    id: 'let-go-while-moving', about: 'The owner\'s hold (13 November 2026): the Winch keeps the crate up only while the finger is on Hold. Let go while the panel runs, the crate falls off the moving hook: over the deck it breaks, and a new crate waits in the intake.',
    steps: [...up(), press(R + 400, 'winch', 'lower')],
    expect: { outcome: null, broken: ['deck'], present: ['LOWERED', 'BROKEN'], absent: ['KILLED', 'LANDED'] },
  },
  {
    id: 'no-landing-on-the-move', about: 'Even over the platform, a crate let go from a panel still clicking breaks: it lands only from a locked panel.',
    steps: [...up(), press(restingAt(5), 'winch', 'lower')],
    expect: { outcome: null, broken: ['platform'], absent: ['LANDED'] },
  },
  {
    id: 'let-go-never-stale', about: 'The finger comes off Hold at once, before its hold has reached the server: the let-go, made on the picture before the hold, is never stale. The crate, still rising, drops back into the hatch, whole.',
    steps: [press(B + 600, 'winch', 'raise', { revision: 0 }), press(B + 800, 'winch', 'lower', { revision: 0 })],
    expect: { outcome: null, missed: ['intake'], absent: ['REFUSED', 'BROKEN'] },
  },
  {
    id: 'fetch-a-new-crate', about: 'The early Hold (the owner, 13 November 2026). A crate breaks; the new one waits in the intake. Hana holds at once, with the hook away over the platform: the hold waits, and nothing is lifted. Cleo releases the empty hook and locks it over stop 1, and the waiting hold lifts the new crate then.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(TOO_SOON, 'winch', 'lower'), press(TOO_SOON + 600, 'winch', 'raise'),
      press(TOO_SOON + 700, 'panel', 'release'), press(restsAt(TOO_SOON + 700, 5, 1, 0), 'panel', 'lock')],
    expect: { outcome: null, broken: ['deck'], locked: [5, 0], present: ['PENDING'], absent: ['REFUSED', 'PENDING_OFF'], counts: { RAISED: 2 } },
  },
  {
    id: 'early-hold-let-go', about: 'Held early, then let go before the hook comes: the waiting hold ends, nothing was lifted, and nothing falls. The hook locked over stop 1 then lifts nothing until Hana holds again.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(TOO_SOON, 'winch', 'lower'), press(TOO_SOON + 600, 'winch', 'raise'), press(TOO_SOON + 650, 'winch', 'lower'),
      press(TOO_SOON + 700, 'panel', 'release'), press(restsAt(TOO_SOON + 700, 5, 1, 0), 'panel', 'lock')],
    expect: { outcome: null, broken: ['deck'], locked: [5, 0], present: ['PENDING', 'PENDING_OFF'], absent: ['REFUSED'], counts: { RAISED: 1, BROKEN: 1 } },
  },
  {
    id: 'early-hold-waits-for-the-crate', about: 'Let go over the hatch, the crate drops back in. Held again while it is still settling, under the hook locked over stop 1, the hold waits, and lifts the crate the moment it is in.',
    steps: [press(B + 600, 'winch', 'raise'), press(B + 800, 'winch', 'lower'), press(B + 900, 'winch', 'raise'), press(B + 1800, 'panel', 'release')],
    expect: { outcome: null, missed: ['intake'], present: ['PENDING', 'RELEASED'], absent: ['REFUSED', 'PENDING_OFF'], counts: { RAISED: 2 } },
  },
  {
    id: 'hold-never-stale', about: 'A hold is never stale. Made on the picture before Cleo\'s LOCK over stop 1, it reaches the server after it and lifts the new crate: the finger is on Hold, and the server lifts, takes back or waits by what it holds when the hold arrives.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(TOO_SOON, 'winch', 'lower'), press(TOO_SOON + 700, 'panel', 'release'),
      press(restsAt(TOO_SOON + 700, 5, 1, 0), 'panel', 'lock'), press(restsAt(TOO_SOON + 700, 5, 1, 0) + 50, 'winch', 'raise', { revision: 5 })],
    expect: { outcome: null, broken: ['deck'], locked: [5, 0], absent: ['REFUSED', 'PENDING'], counts: { RAISED: 2 } },
  },
  {
    id: 'lock-twice', about: 'A second LOCK on a locked panel does nothing: the button sends what it showed, so a double tap never releases it.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(PLATFORM_AT + 100, 'panel', 'lock')],
    expect: { outcome: null, refused: ['locked'], locked: [5] },
  },
  {
    id: 'lock-at-rest', about: 'The panel rests 0.2 s at each stop (the owner\'s, twice as fast as first approved). A LOCK the server receives at any moment of its rest over the platform, even the last, locks it there.',
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
    id: 'stale-press', about: 'A RELEASE made on the revision before the crate landed reaches the server after the landing: refused as stale, never resolved on a picture that is gone.',
    steps: [...land(), press(LANDED + 50, 'panel', 'release', { revision: revisionAfter([...up(), press(PLATFORM_AT, 'panel', 'lock')]) })],
    expect: { outcome: null, refused: ['stale'], counts: { RELEASED: 1 }, present: ['LANDED'] },
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
    id: 'drop-from-the-console-stop', about: 'Locked over the console instead of the platform, the crate swings right over the Panel operator. Let go then, it falls on them and breaks: the Task is lost.',
    steps: [...up(), press(restingAt(4), 'panel', 'lock'), press(restingAt(4) + 650, 'winch', 'lower')],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, locked: [4], broken: ['console'], alive: { winch: true, panel: false } },
  },
  {
    id: 'lucky-catch-cut', about: 'The owner\'s luck: Hana has no Protection, but the server\'s roll for the lock is under 1 in 4: the roof buffer holds, CLANK!, exactly as a Protection block shows.',
    steps: [...up(), press(CAB_AT, 'panel', 'lock', { roll: 0.1 })],
    expect: { outcome: null, alive: { winch: true, panel: true }, present: ['STOPPED'], absent: ['KILLED'] },
  },
  {
    id: 'lucky-catch-drop', about: 'The same luck on the drop: the winch\'s brake holds and the crate swings on, whole.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.2 })],
    expect: { outcome: null, alive: { winch: true, panel: true }, present: ['STOPPED'], absent: ['KILLED', 'BROKEN'] },
  },
  {
    id: 'brake-holds-it', about: 'After a stopped drop the brake holds the crate up: a let-go does nothing until Hana\'s finger takes it back with Hold (TAKEN), and the next let-go drops it from wherever it is then.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.2 }), press(OVER_CONSOLE + 100, 'winch', 'lower'), press(OVER_CONSOLE + 200, 'winch', 'raise')],
    expect: { outcome: null, alive: { winch: true, panel: true }, refused: ['not-holding'], present: ['STOPPED', 'TAKEN'], absent: ['KILLED'] },
  },
  {
    id: 'luck-runs-out', about: 'A roll of 1 in 4 or more: the catch does not hold, and the cut kills.',
    steps: [...up(), press(CAB_AT, 'panel', 'lock', { roll: 0.25 })],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: false, panel: true }, present: ['KILLED'] },
  },
  {
    id: 'protection-used-once', about: 'Cleo has Protection. The first drop is stopped by it, and the block uses it up, as any block does (packages/engine physical.ts). Hana holds again and lets go again at once: with a roll of 1 in 4 or more, the second drop kills.',
    protection: { winch: false, panel: true },
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.9 }), press(OVER_CONSOLE + 10, 'winch', 'raise'), press(OVER_CONSOLE + 25, 'winch', 'lower', { roll: 0.9 })],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: true, panel: false }, stops: 1, present: ['KILLED'] },
  },
  {
    id: 'back-into-the-intake', about: 'Let go over the intake, before the panel moves: the crate drops back into the hatch, whole. Nothing worse.',
    steps: [press(B + 600, 'winch', 'raise'), press(B + 1600, 'winch', 'lower')],
    expect: { outcome: null, missed: ['intake'], absent: ['KILLED', 'STOPPED', 'BROKEN'] },
  },
  {
    id: 'landed-winch-idle', about: 'Landed, the crate is clamped: Hold cannot lift it off the platform.',
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
    id: 'keys-together', about: 'Landed, both turn their keys at the same moment, each on the picture before the other\'s key: both count, and the crate goes down. A turned key changes nothing another press depends on (found by the playable test, 13 November 2026).',
    steps: [...land(), press(LANDED + 600, 'winch', 'key', { revision: revisionAfter(land()) }), press(LANDED + 640, 'panel', 'key', { revision: revisionAfter(land()) })],
    expect: { outcome: { result: 'delivered', packages: 5, alone: false }, absent: ['REFUSED', 'KILLED'] },
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
    id: 'death-stands-in-grace', about: 'A drop that lands while its victim is out of contact stands: the crate breaks and the Task is lost at once, not cancelled when the grace runs out. The dead participant\'s connection no longer matters.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), offline(PLATFORM_AT + 200, 'panel'), press(OVER_CONSOLE, 'winch', 'lower'), { at: PLATFORM_AT + 200 + TIMING.grace + 500 }],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: true, panel: false }, broken: ['console'] },
  },
  {
    id: 'offline-victim-cut', about: "Landed; the Winch operator drops out of contact and the Panel operator cuts. The death stands and the Panel's key alone sends the crate.",
    steps: [...land(), offline(LANDED + 100, 'winch'), ...cutLanded().slice(-2), press(LANDED + 1900, 'panel', 'key'), { at: LANDED + 100 + TIMING.grace + 500 }],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true } },
  },
  {
    id: 'dead-cannot-press', about: "A killed participant's presses do nothing: cut with the crate on the platform, Hana's key is refused.",
    steps: [...cutLanded(), press(LANDED + 1700, 'winch', 'key')],
    expect: { outcome: null, refused: ['down'], alive: { winch: false, panel: true } },
  },
  {
    id: 'survivor-out-of-time', about: 'After the cut on the landed crate, Cleo can finish alone, but only before the deadline: here Cleo never turns the key, and the Task is lost on time.',
    steps: [...cutLanded(), { at: TIMING.deadline }],
    expect: { outcome: { result: 'lost', why: 'time' }, alive: { winch: false, panel: true } },
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
  if (e.broken && !same(got.events.filter(x => x.type === 'BROKEN').map(x => x.on), e.broken)) out.push(`broken ${JSON.stringify(got.events.filter(x => x.type === 'BROKEN').map(x => x.on))}`);
  if (e.stops !== undefined && types.filter(t => t === 'STOPPED').length !== e.stops) out.push(`${types.filter(t => t === 'STOPPED').length} stops`);
  return out;
}

/** The storyboards' own expectations: how each must end, and the events that must occur. */
export const BOARD_EXPECT = Object.freeze({
  cooperation: { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, locked: [5], present: ['LANDED', 'SENT'], absent: ['KILLED', 'STOPPED', 'MISSED', 'BROKEN'] },
  chop: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: false, panel: true }, locked: [6], present: ['KILLED'] },
  drop: { outcome: { result: 'lost', why: 'not-in-position' }, alive: { winch: true, panel: false }, broken: ['console'], present: ['KILLED'], absent: ['LANDED', 'SENT'] },
  standoff: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true }, locked: [5, 6], present: ['LANDED', 'KILLED', 'SENT'] },
  'protection-cut': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, locked: [6, 5], present: ['STOPPED', 'SENT'], absent: ['KILLED'] },
  'protection-drop': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, present: ['STOPPED', 'TAKEN', 'SENT'], absent: ['KILLED', 'BROKEN'] },
  mistakes: { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { winch: true, panel: true }, locked: [4, 5, 0, 5], broken: ['deck'], absent: ['KILLED', 'STOPPED'] },
  timeout: { outcome: { result: 'lost', why: 'time' }, alive: { winch: true, panel: true }, locked: [2], absent: ['KILLED', 'SENT'] },
  disconnect: { outcome: { result: 'cancelled', why: 'disconnect', who: 'panel' }, alive: { winch: true, panel: true }, present: ['OFFLINE'], absent: ['SENT', 'LOCKED'] },
});

/** Every acceptance scenario: the storyboards first, then the edge cases. */
export const SCENARIOS = Object.freeze([
  ...BOARDS.map(b => Object.freeze({ id: b.id, about: b.about, protection: b.protection, steps: b.steps, expect: BOARD_EXPECT[b.id], board: true, proposed: b.proposed })),
  ...EDGES,
]);
