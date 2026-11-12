// mothership:dev-only
//
// The Food Supply Task's acceptance scenarios for Backend, Frontend and Game Balance: the nine
// storyboards (./boards.mjs) and the edge cases below, each a start, a list of steps and what must
// follow. Each states its expectation independently; packages/design-tokens/test/food-supply.test.mjs
// plays it through the design's mechanics model (./task.mjs) and checks that the model agrees, and
// design/tools/food-supply-export.mjs writes them into handoff.json. A design reference on the
// phone pack's invented roster (Hana, seat 8, the Winch; Cleo, seat 3, the Panel), not the engine.

import { TIMING, startTask, simulate } from './task.mjs';
import { BOARDS, CAST } from './boards.mjs';

const SEATS = Object.freeze({ winch: CAST.winch.seat, panel: CAST.panel.seat });
const B = TIMING.briefing;
const press = (at, role, act, extra = {}) => ({ at, seat: SEATS[role], act, ...extra });
const offline = (at, role) => ({ at, seat: SEATS[role], online: false });
const online = (at, role) => ({ at, seat: SEATS[role], online: true });
/** Raise out of the intake, release the panel from stop 1: over the platform at B + 2700, over the cab at B + 2920. */
const up = () => [press(B + 600, 'winch', 'raise'), press(B + 1600, 'panel', 'release')];
const PLATFORM_AT = B + 2700, CAB_AT = B + 2920, OVER_CONSOLE = PLATFORM_AT + 975;
/** Up, locked over the platform, lowered onto it as the swing passes over: landed, the keys free from B + 5600. */
const land = () => [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(PLATFORM_AT + 2600, 'winch', 'lower')];

/**
 * Edge cases. expect: the outcome at the end (null: still running), who is alive, and facts about
 * the events (a type that must appear, one that must not, a refusal's reason, where a lock or a
 * miss happened, how many stops). roll: the server's random number for a press that would kill.
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
    steps: [...up(), press(B + 2000, 'winch', 'lower')],
    expect: { outcome: null, refused: ['unlocked'], absent: ['LOWERED'] },
  },
  {
    id: 'lock-twice', about: 'A second LOCK on a locked panel does nothing: the button sends what it showed, so a double tap never releases it.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(PLATFORM_AT + 100, 'panel', 'lock')],
    expect: { outcome: null, refused: ['locked'], locked: [5] },
  },
  {
    id: 'lock-rounds-to-the-platform', about: 'A lock takes the nearest stop: just short of half way between 6 and 7, it locks over the platform.',
    steps: [...up(), press(B + 1600 + 1209, 'panel', 'lock')],
    expect: { outcome: null, locked: [5], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'lock-rounds-to-the-cab', about: 'From half way between 6 and 7 on, a lock takes stop 7: the cut. The danger begins half a stop before the rail\'s end.',
    steps: [...up(), press(B + 1600 + 1210, 'panel', 'lock')],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, locked: [6], alive: { winch: false, panel: true } },
  },
  {
    id: 'press-counts-as-shown', about: 'PROPOSED press timing. A LOCK made with the panel over the platform arrives 250 ms later, when the panel is already over the cab: it counts where the phone showed it.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock', { arrival: PLATFORM_AT + 250 })],
    expect: { outcome: null, locked: [5], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'late-press', about: 'PROPOSED press timing. A press that arrives more than 300 ms after it was made is refused, and the phone shows where the panel is now.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock', { arrival: PLATFORM_AT + TIMING.lag + 100 })],
    expect: { outcome: null, refused: ['late'], absent: ['LOCKED'] },
  },
  {
    id: 'stale-press', about: 'PROPOSED press timing. A Lower made on a picture from before the panel was released arrives after the release: refused, never resolved on a picture that is gone.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(B + 3500, 'panel', 'release'), press(B + 3400, 'winch', 'lower', { arrival: B + 3550 })],
    expect: { outcome: null, refused: ['stale'], absent: ['LOWERED'] },
  },
  {
    id: 'drop-from-the-console-stop', about: 'Locked over the console instead of the platform, the crate swings right over the Panel operator. Lowered then, it falls on them, and the panel is not over the platform: the Task is lost.',
    steps: [...up(), press(B + 2480, 'panel', 'lock'), press(B + 2480 + 650, 'winch', 'lower')],
    expect: { outcome: { result: 'lost', why: 'not-in-position' }, locked: [4], alive: { winch: true, panel: false } },
  },
  {
    id: 'lucky-catch-cut', about: 'The owner\'s luck: Hana is not Protected, but the server\'s roll for the lock is under 1 in 4: the roof buffer holds, CLANK!, exactly as Protection would show.',
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
    id: 'blocked-twice', about: 'A Protected Panel operator: the drop is stopped, and again on a second try at once. Protection holds every time, whatever the roll.',
    protection: { winch: false, panel: true },
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.9 }), press(OVER_CONSOLE + 25, 'winch', 'lower', { roll: 0.9 })],
    expect: { outcome: null, alive: { winch: true, panel: true }, stops: 2, absent: ['KILLED'] },
  },
  {
    id: 'back-into-the-intake', about: 'Lowered again at once over the intake, the crate goes back into the hatch: a miss, nothing worse.',
    steps: [press(B + 600, 'winch', 'raise'), press(B + 1600, 'winch', 'lower')],
    expect: { outcome: null, missed: ['intake'], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'landed-winch-idle', about: 'Landed, the crate is clamped: the Winch cannot raise it off the platform.',
    steps: [...land(), press(B + 5800, 'winch', 'raise')],
    expect: { outcome: null, refused: ['landed'], present: ['LANDED'] },
  },
  {
    id: 'key-before-landing', about: 'The keys work only once the crate has landed.',
    steps: [...up(), press(B + 2000, 'winch', 'key')],
    expect: { outcome: null, refused: ['not-landed'], absent: ['KEY'] },
  },
  {
    id: 'key-twice', about: 'A turned key stays turned; a second turn does nothing.',
    steps: [...land(), press(B + 6000, 'winch', 'key'), press(B + 6300, 'winch', 'key')],
    expect: { outcome: null, refused: ['turned'], present: ['KEY'] },
  },
  {
    id: 'keys-stay-turned', about: 'PROPOSED. Landed, Hana turns the Winch\'s key; Cleo releases the empty panel and locks it again short of the cab, then turns the Panel\'s key: delivered by both, Hana\'s key still turned.',
    steps: [...land(), press(B + 6200, 'winch', 'key'), press(B + 6900, 'panel', 'release'), press(B + 7340, 'panel', 'lock'), press(B + 7800, 'panel', 'key')],
    expect: { outcome: { result: 'delivered', packages: 5, alone: false }, locked: [5, 5], absent: ['KILLED'] },
  },
  {
    id: 'cut-after-own-key', about: 'Landed, Cleo turns the Panel\'s key first, then releases and cuts: Hana dies with the crate on the platform, and Cleo\'s key is already turned, so it goes down at once.',
    steps: [...land(), press(B + 6200, 'panel', 'key'), press(B + 6900, 'panel', 'release'), press(B + 7120, 'panel', 'lock')],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true } },
  },
  {
    id: 'reconnect-in-grace', about: 'Out of contact for less than the grace: the Task never paused, and it goes on.',
    steps: [press(B + 600, 'winch', 'raise'), offline(B + 1000, 'panel'), online(B + 1000 + TIMING.grace - 1000, 'panel'), press(B + 1000 + TIMING.grace, 'panel', 'release'), { at: B + 1000 + TIMING.grace + 2000 }],
    expect: { outcome: null, present: ['OFFLINE', 'ONLINE', 'RELEASED'] },
  },
  {
    id: 'death-stands-in-grace', about: 'A drop that lands while its victim is out of contact stands; the panel is over the platform, so the Winch goes on alone and delivers. The dead participant\'s connection no longer matters.',
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), offline(B + 3000, 'panel'), press(OVER_CONSOLE, 'winch', 'lower'), press(B + 4600, 'winch', 'raise'), press(B + 6400, 'winch', 'lower'), press(B + 7200, 'winch', 'key'), { at: B + 3000 + TIMING.grace + 500 }],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: true, panel: false } },
  },
  {
    id: 'offline-victim-cut', about: "Landed; the Winch operator drops out of contact and the Panel operator cuts. The death stands and the Panel's key alone sends the crate.",
    steps: [...land(), offline(B + 6000, 'winch'), press(B + 6900, 'panel', 'release'), press(B + 7120, 'panel', 'lock'), press(B + 8000, 'panel', 'key'), { at: B + 6000 + TIMING.grace + 500 }],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { winch: false, panel: true } },
  },
  {
    id: 'dead-cannot-press', about: "A killed participant's presses do nothing.",
    steps: [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower'), press(B + 4000, 'panel', 'release')],
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
].map(Object.freeze));

/** What a scenario's run gave: the outcome, who is alive, and the events. */
export function play({ protection = { winch: false, panel: false }, steps }) {
  const frames = simulate(startTask({ seats: SEATS, protection, at: 0 }), steps);
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
