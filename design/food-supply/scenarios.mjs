// mothership:dev-only
//
// The Food Supply Task's acceptance scenarios for Backend, Frontend and Game Balance: the eight
// storyboards (./boards.mjs) and the edge cases below, each a start, a list of steps and what must
// follow. Each states its expectation independently; packages/design-tokens/test/food-supply.test.mjs
// plays it through the design's mechanics model (./task.mjs) and checks that the model agrees, and
// design/tools/food-supply-export.mjs writes them into handoff.json. A design reference on the
// phone pack's invented roster (Hana, seat 8, the Hoist; Cleo, seat 3, the Boom), not the engine.

import { TIMING, startTask, simulate } from './task.mjs';
import { BOARDS, CAST } from './boards.mjs';

const SEATS = Object.freeze({ hoist: CAST.hoist.seat, boom: CAST.boom.seat });
const B = TIMING.briefing;
const press = (at, role, dir) => ({ at, seat: SEATS[role], dir });
const offline = (at, role) => ({ at, seat: SEATS[role], online: false });
const online = (at, role) => ({ at, seat: SEATS[role], online: true });
/** Raise three times: out of the intake, to the top row. */
const lift = (t = B + 600) => [press(t, 'hoist', 'up'), press(t + 500, 'hoist', 'up'), press(t + 1000, 'hoist', 'up')];
/** Drive from column 2 to column `to`. */
const drive = (t, to, from = 2) => Array.from({ length: to - from }, (_, k) => press(t + k * 500, 'boom', 'right'));
/** Lift, drive across and lower into the cradle: docked at B + 5100. */
const dock = () => [...lift(), ...drive(B + 2300, 6), press(B + 4600, 'hoist', 'down'), press(B + 5100, 'hoist', 'down')];

/**
 * Edge cases. expect: the outcome at the end (null: still running), who is alive, and facts about
 * the events (a type that must appear, one that must not, a refusal's reason).
 */
export const EDGES = Object.freeze([
  {
    id: 'briefing-refused', about: 'A press during the briefing does nothing.',
    steps: [press(1000, 'hoist', 'up')],
    expect: { outcome: null, refused: ['briefing'], absent: ['MOVED'] },
  },
  {
    id: 'too-soon', about: 'A second press within the interval is refused; holding a button repeats at the interval.',
    steps: [press(B + 600, 'hoist', 'up'), press(B + 600 + TIMING.interval - 100, 'hoist', 'up'), press(B + 600 + TIMING.interval, 'hoist', 'up')],
    expect: { outcome: null, refused: ['too-soon'], moves: 2 },
  },
  {
    id: 'not-your-axis', about: "A participant cannot press the other axis: the Hoist has no Left.",
    steps: [press(B + 600, 'hoist', 'left')],
    expect: { outcome: null, refused: ['not-your-axis'] },
  },
  {
    id: 'intake-holds', about: 'While the crate sits in the intake hatch, driving the gantry is a bump.',
    steps: [press(B + 600, 'boom', 'right')],
    expect: { outcome: null, bumped: ['in-intake'], moves: 0 },
  },
  {
    id: 'rib-blocks', about: 'The crate crosses the rib only at the top row.',
    steps: [press(B + 600, 'hoist', 'up'), press(B + 1100, 'boom', 'right')],
    expect: { outcome: null, bumped: ['rib'] },
  },
  {
    id: 'pulpit-blocks', about: "Lowering from the top row elsewhere is free; below the top row the crate cannot enter the pulpit's column from the side.",
    steps: [...lift(), press(B + 2300, 'boom', 'right'), press(B + 2800, 'boom', 'right'), press(B + 3300, 'boom', 'right'), press(B + 3800, 'hoist', 'down'), press(B + 4400, 'boom', 'left')],
    expect: { outcome: null, bumped: ['pulpit'], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'no-opportunity', about: 'A Hoist who used the one attack of the match in an earlier Task lowers over the Boom: STOPPED, exactly as Protection would show.',
    attack: { hoist: false, boom: true },
    steps: [...lift(), ...drive(B + 2300, 4), press(B + 3600, 'hoist', 'down')],
    expect: { outcome: null, alive: { hoist: true, boom: true }, present: ['STOPPED'], absent: ['KILLED'] },
  },
  {
    id: 'blocked-twice', about: 'A Protected Boom: the drop is stopped, and again on a second try: the first block used up the Hoist\'s one attack.',
    protection: { hoist: false, boom: true },
    steps: [...lift(), ...drive(B + 2300, 4), press(B + 3600, 'hoist', 'down'), press(B + 4200, 'hoist', 'down')],
    expect: { outcome: null, alive: { hoist: true, boom: true }, stops: 2, absent: ['KILLED'] },
  },
  {
    id: 'key-release', about: "The Boom's key turns only at the end stop with the crate docked; driving away releases it.",
    steps: [...dock(), press(B + 5700, 'boom', 'right'), press(B + 6300, 'boom', 'left')],
    expect: { outcome: null, present: ['DOCKED', 'KEY', 'KEY_RELEASED'], absent: ['SENT'] },
  },
  {
    id: 'docked-hoist-down', about: 'Docked, the Hoist cannot lower further: a bump, and no drop is possible.',
    steps: [...dock(), press(B + 5700, 'hoist', 'down')],
    expect: { outcome: null, bumped: ['cradle'] },
  },
  {
    id: 'reconnect-in-grace', about: 'Out of contact for less than the grace: the Task never paused, and it goes on.',
    steps: [...lift(), offline(B + 2000, 'boom'), online(B + 2000 + TIMING.grace - 1000, 'boom'), ...drive(B + 2000 + TIMING.grace, 6), { at: B + 2000 + TIMING.grace + 3000 }],
    expect: { outcome: null, present: ['OFFLINE', 'ONLINE'], moves: 7 },
  },
  {
    id: 'death-stands', about: 'An attack that lands while the partner is out of contact stands: the Task ends lost, not cancelled.',
    steps: [...lift(), ...drive(B + 2300, 4), offline(B + 3300, 'boom'), press(B + 3600, 'hoist', 'down'), { at: B + 3300 + TIMING.grace + 500 }],
    expect: { outcome: { result: 'lost', why: 'not-in-cradle' }, alive: { hoist: true, boom: false } },
  },
  {
    id: 'offline-victim-docked', about: "Docked; the Hoist drops out of contact and the Boom rams the cab. The death stands, the dead Hoist's connection no longer matters, and the Boom sends alone.",
    steps: [...dock(), offline(B + 5600, 'hoist'), ...Array.from({ length: 6 }, (_, k) => press(B + 6000 + k * 400, 'boom', 'left')), ...Array.from({ length: 7 }, (_, k) => press(B + 8600 + k * 400, 'boom', 'right')), { at: B + 5600 + TIMING.grace + 4000 }],
    expect: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { hoist: false, boom: true } },
  },
  {
    id: 'dead-cannot-press', about: "A killed participant's presses do nothing.",
    steps: [...dock(), ...Array.from({ length: 6 }, (_, k) => press(B + 6000 + k * 400, 'boom', 'left')), press(B + 8600, 'hoist', 'up')],
    expect: { outcome: null, refused: ['down'], alive: { hoist: false, boom: true } },
  },
  {
    id: 'race-jolt', about: "Attacks are deliberate. Cleo drives the crate back over Cleo's own head just as Hana's Lower, pressed on the old picture, arrives: not an attack, only a jerk of the winch; with both moving at once it is a jolt, here a close call. A fresh Lower on the warning then drops it.",
    steps: [...lift(), ...drive(B + 2300, 5), press(B + 4000, 'boom', 'left'), { ...press(B + 4050, 'hoist', 'down'), shown: false }, { ...press(B + 4700, 'hoist', 'down'), shown: true }],
    expect: { outcome: { result: 'lost', why: 'not-in-cradle' }, present: ['JERKED', 'NEAR_MISS'], alive: { hoist: true, boom: false } },
  },
  {
    id: 'race-accident', about: 'The same race with an unlucky roll: the jerk and the drive together swing the crate into Cleo. An accident: Hana\'s attack is not used.',
    steps: [...lift(), ...drive(B + 2300, 5), press(B + 4000, 'boom', 'left'), { ...press(B + 4050, 'hoist', 'down'), shown: false, roll: 0.1 }],
    expect: { outcome: { result: 'lost', why: 'not-in-cradle' }, accident: true, alive: { hoist: true, boom: false }, attack: { hoist: true, boom: true } },
  },
  {
    id: 'cab-lurch', about: "The gantry at the cab's door and both moving at once: an unlucky roll lurches it into the cab. An accident: the Hoist is killed and the Task is lost.",
    steps: [...lift(), press(B + 2300, 'boom', 'left'), { ...press(B + 2500, 'hoist', 'down'), roll: 0.1 }],
    expect: { outcome: { result: 'lost', why: 'not-in-cradle' }, accident: true, alive: { hoist: false, boom: true }, attack: { hoist: true, boom: true } },
  },
  {
    id: 'protected-close-call', about: 'The Boom is Protected and the roll is unlucky: still only a close call. No STOPPED, so an accident shows nothing about Protection.',
    protection: { hoist: false, boom: true },
    steps: [...lift(), ...drive(B + 2300, 5), { ...press(B + 3500, 'hoist', 'down'), roll: 0.1 }],
    expect: { outcome: null, alive: { hoist: true, boom: true }, present: ['NEAR_MISS'], absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'one-at-a-time', about: 'The same crossing, but Hana waits until Cleo has stopped: no jolt, whatever the roll.',
    steps: [...lift(), ...drive(B + 2300, 5), { ...press(B + 3900, 'hoist', 'down'), roll: 0 }],
    expect: { outcome: null, absent: ['NEAR_MISS', 'KILLED'] },
  },
  {
    id: 'together-bump', about: "Both press at once at the cab's door, but Hana's Raise only bumps the rail: nothing moved, so no jolt.",
    steps: [...lift(), press(B + 2300, 'boom', 'left'), { ...press(B + 2400, 'hoist', 'up'), roll: 0 }],
    expect: { outcome: null, bumped: ['rail'], absent: ['NEAR_MISS', 'KILLED'] },
  },
  {
    id: 'hold-stops-at-warning', about: 'PROPOSED deliberate attacks only. A held Raise or Lower repeats, but a repeat never carries into an attack: it stops at the warning, and only a fresh press attacks.',
    steps: [...lift(), ...drive(B + 2300, 4), { ...press(B + 3600, 'hoist', 'down'), repeat: true, shown: true }],
    expect: { outcome: null, refused: ['repeat'], alive: { hoist: true, boom: true }, absent: ['KILLED', 'STOPPED'] },
  },
  {
    id: 'cancel-without-death', about: 'A participant out of contact for the whole grace: the Task is cancelled; both are alive and return.',
    steps: [...lift(), offline(B + 2000, 'hoist'), { at: B + 2000 + TIMING.grace }],
    expect: { outcome: { result: 'cancelled', why: 'disconnect', who: 'hoist' }, alive: { hoist: true, boom: true } },
  },
].map(Object.freeze));

/** What a scenario's run gave: the outcome, who is alive, and the events. */
export function play({ attack = { hoist: true, boom: true }, protection = { hoist: false, boom: false }, steps }) {
  const frames = simulate(startTask({ seats: SEATS, attack, protection, at: 0 }), steps);
  const last = frames[frames.length - 1].state;
  const events = frames.flatMap(f => f.events);
  return { outcome: last.outcome, alive: { ...last.alive }, attack: { ...last.attack }, events };
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
  for (const why of e.bumped ?? []) if (!got.events.some(x => x.type === 'BUMPED' && x.why === why)) out.push(`no bump (${why})`);
  if (e.moves !== undefined && types.filter(t => t === 'MOVED').length !== e.moves) out.push(`${types.filter(t => t === 'MOVED').length} moves`);
  if (e.stops !== undefined && types.filter(t => t === 'STOPPED').length !== e.stops) out.push(`${types.filter(t => t === 'STOPPED').length} stops`);
  if (e.accident !== undefined && !got.events.some(x => x.type === 'KILLED' && Boolean(x.accident) === e.accident)) out.push(`no ${e.accident ? 'accident' : 'attack'} kill`);
  if (e.attack && !same(got.attack, e.attack)) out.push(`attack ${JSON.stringify(got.attack)}`);
  return out;
}

/** The storyboards' own expectations: how each must end, and the events that must occur. */
export const BOARD_EXPECT = Object.freeze({
  cooperation: { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { hoist: true, boom: true }, present: ['BUMPED', 'DOCKED', 'SENT'], absent: ['KILLED', 'STOPPED'] },
  drop: { outcome: { result: 'lost', why: 'not-in-cradle' }, alive: { hoist: true, boom: false }, present: ['KILLED'] },
  ram: { outcome: { result: 'lost', why: 'not-in-cradle' }, alive: { hoist: false, boom: true }, present: ['KILLED'] },
  survivor: { outcome: { result: 'delivered', packages: 5, alone: true }, alive: { hoist: false, boom: true }, present: ['DOCKED', 'KILLED', 'SENT'] },
  'protection-drop': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { hoist: true, boom: true }, present: ['STOPPED', 'SENT'], absent: ['KILLED'] },
  'protection-ram': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { hoist: true, boom: true }, present: ['STOPPED', 'SENT'], absent: ['KILLED'] },
  accident: { outcome: { result: 'lost', why: 'not-in-cradle' }, alive: { hoist: true, boom: false }, accident: true, attack: { hoist: true, boom: true } },
  'near-miss': { outcome: { result: 'delivered', packages: 5, alone: false }, alive: { hoist: true, boom: true }, present: ['NEAR_MISS', 'SENT'], absent: ['KILLED'] },
  timeout: { outcome: { result: 'lost', why: 'time' }, alive: { hoist: true, boom: true }, absent: ['KILLED', 'SENT'] },
  disconnect: { outcome: { result: 'cancelled', why: 'disconnect', who: 'boom' }, alive: { hoist: true, boom: true }, present: ['OFFLINE'], absent: ['SENT'] },
});

/** Every acceptance scenario: the storyboards first, then the edge cases. */
export const SCENARIOS = Object.freeze([
  ...BOARDS.map(b => Object.freeze({ id: b.id, about: b.about, attack: b.attack, protection: b.protection, steps: b.steps, expect: BOARD_EXPECT[b.id], board: true, proposed: b.proposed })),
  ...EDGES,
]);
