// mothership:dev-only
//
// The Food Supply Task (docs/design/food-supply.md): a design proposal for the owner's confirmed
// highlights of 11 November 2026, on synthetic fixtures. These tests hold what it promises:
//  - every acceptance scenario, the eight storyboards and the edge cases, ends as it says;
//  - the confirmed rules: two buttons on one axis each and nothing else; an unblocked attack kills at
//    once and never sends anyone to the Hospital; a survivor completes only from the cradle; a
//    disconnect cancels after the grace and a death before it stands; food is 5, +5, a warning at 1;
//  - nothing a phone is built from carries an attack opportunity or Protection, and a stop looks the
//    same whichever of them caused it; the design never resets an opportunity itself;
//  - the machine is coherent: the cooperative route never enters a solid part, the regions are the
//    fixtures' cells, the drop and the ram are each one press past a warning both phones show;
//  - every hint fits the largest text; every motion cue has a Reduce motion form;
//  - the handoff and the room art are what the export tool writes; the review files are recorded;
//    and nothing in the game's code refers to the package.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { ACCIDENT, FIXTURES, FOOD, GRID, NEAR, ROLES, ROUTE, TIMING, act, hazards, nearZone, simulate, startTask, view } from '../../../design/food-supply/task.mjs';
import { REGIONS, VIEW } from '../../../design/food-supply/layout.mjs';
import { BOARDS, CAST } from '../../../design/food-supply/boards.mjs';
import { CUES, run } from '../../../design/food-supply/stage.mjs';
import { EDGES, SCENARIOS, differences, play } from '../../../design/food-supply/scenarios.mjs';
import { hintFor } from '../../../design/food-supply/hints.mjs';
import { CONFLICTS, OPEN_ITEMS, RULES, VISIBILITY } from '../../../design/food-supply/rules.mjs';
import { build, roomArt } from '../../../design/tools/food-supply-export.mjs';

const root = new URL('../../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SEATS = { hoist: CAST.hoist.seat, boom: CAST.boom.seat };
const B = TIMING.briefing;
const start = (o = {}) => startTask({ seats: SEATS, at: 0, ...o });
const press = (at, role, dir, extra = {}) => ({ at, seat: SEATS[role], dir, ...extra });
const finalOf = frames => frames[frames.length - 1].state;

test('every acceptance scenario ends as it says: the ten storyboards and the edge cases', () => {
  assert.equal(BOARDS.length, 10);
  assert.deepEqual(BOARDS.map(b => b.id), ['cooperation', 'drop', 'ram', 'survivor', 'protection-drop', 'protection-ram', 'accident', 'near-miss', 'timeout', 'disconnect']);
  assert.ok(EDGES.length >= 15);
  for (const s of SCENARIOS) assert.deepEqual(differences(s), [], s.id);
});

test('two buttons on one axis each: the Hoist vertical, the Boom horizontal, and no attack button', () => {
  assert.deepEqual(ROLES.hoist.dirs, ['up', 'down']);
  assert.deepEqual(ROLES.boom.dirs, ['left', 'right']);
  assert.equal(ROLES.hoist.axis, 'vertical');
  assert.equal(ROLES.boom.axis, 'horizontal');
  const s = { ...start(), phase: 'running' };
  for (const [role, seat] of Object.entries(SEATS)) {
    const v = view(s, seat);
    assert.deepEqual(v.buttons.map(b => b.dir), ROLES[role].dirs, 'the same two buttons in every state');
  }
  // Every press of the other axis is refused; there is nothing else to press.
  const r = act({ ...start(), phase: 'running' }, press(B + 600, 'hoist', 'right'));
  assert.equal(r.events.at(-1).why, 'not-your-axis');
});

test('the cooperative route delivers five packages in nine presses and two keys, and the glow follows it', () => {
  assert.equal(ROUTE.length, 11);
  let s = { ...start(), phase: 'running', runningAt: 0 };
  let t = 1000;
  for (const step of ROUTE) {
    const v = view(s, SEATS[step.role], t);
    const next = v.buttons.find(b => b.next);
    assert.ok(next, `the ${step.role} phone glows before press ${t}`);
    assert.equal(next.dir, step.dir);
    assert.equal(Boolean(next.key), Boolean(step.key));
    const r = act(s, press(t, step.role, step.dir));
    assert.ok(!r.events.some(e => ['REFUSED', 'BUMPED', 'STOPPED', 'KILLED'].includes(e.type)), JSON.stringify(r.events));
    s = r.state; t += 400;
  }
  assert.deepEqual(s.outcome, { result: 'delivered', packages: FOOD.perDelivery, alone: false });
});

test('food: five to start, five per delivery, the warning at one', () => {
  assert.deepEqual({ ...FOOD }, { initial: 5, perDelivery: 5, warnAt: 1 });
});

test('an unblocked attack kills at once, with no escape and no Hospital', () => {
  for (const id of ['drop', 'ram']) {
    const frames = run(BOARDS.find(b => b.id === id));
    const killed = frames.flatMap(f => f.events).find(e => e.type === 'KILLED');
    assert.ok(killed, id);
    const at = frames.find(f => f.events.includes(killed));
    // Resolved by the attacker's own press, in the same step: the victim never had a move to make.
    assert.ok(at.step.dir, `${id}: the kill is a press`);
    assert.equal(at.step.seat, SEATS[killed.by]);
    assert.equal(finalOf(frames).alive[killed.victim], false);
    assert.doesNotMatch(JSON.stringify(frames.flatMap(f => f.events)), /hospital/i);
  }
});

test('the drop is a Lower from the row over the Boom, the ram a Left from the cab door; both phones warn one press before', () => {
  assert.deepEqual(REGIONS.drop.cells, [[FIXTURES.pulpit.col, FIXTURES.pulpit.head]]);
  assert.deepEqual(REGIONS.dropWarning.cells, [[FIXTURES.pulpit.col, FIXTURES.pulpit.head + 1]]);
  assert.deepEqual(REGIONS.ram.cols, [FIXTURES.cab.col]);
  assert.deepEqual(REGIONS.ramWarning.cols, [FIXTURES.buffer.col]);
  const over = { ...start(), phase: 'running', crate: [FIXTURES.pulpit.col, FIXTURES.pulpit.head + 1], carriage: FIXTURES.pulpit.col };
  assert.equal(hazards(over).drop, true);
  assert.deepEqual(view(over, SEATS.hoist).warnings, ['crate-over-partner']);
  assert.deepEqual(view(over, SEATS.boom).warnings, ['crate-over-you']);
  assert.equal(view(over, SEATS.hoist).buttons.find(b => b.dir === 'down').hazard, true);
  const door = { ...start(), phase: 'running', crate: [FIXTURES.buffer.col, 3], carriage: FIXTURES.buffer.col };
  assert.equal(hazards(door).ram, true);
  assert.deepEqual(view(door, SEATS.boom).warnings, ['bumper-at-partner-cab']);
  assert.deepEqual(view(door, SEATS.hoist).warnings, ['bumper-at-your-cab']);
  assert.equal(view(door, SEATS.boom).buttons.find(b => b.dir === 'left').hazard, true);
  // No warning for a partner who is already out.
  assert.equal(hazards({ ...door, alive: { hoist: false, boom: true } }).ram, false);
});

test('the cooperative route never puts the crate into a solid part', () => {
  const solid = new Set([...REGIONS.rib.cells, ...REGIONS.pulpit.cells, [FIXTURES.liftBase.col, FIXTURES.liftBase.row]].map(c => c.join(',')));
  for (const b of BOARDS) {
    for (const e of run(b).flatMap(f => f.events)) {
      if (e.type === 'MOVED' && !(e.to.crate[0] === FIXTURES.pulpit.col && e.to.crate[1] === FIXTURES.pulpit.head)) assert.ok(!solid.has(e.to.crate.join(',')), `${b.id}: ${e.to.crate}`);
    }
  }
  assert.equal(GRID.cols, 7);
  assert.equal(GRID.rows, 4);
});

test('a survivor completes only from the cradle; anywhere else a death loses the Task', () => {
  const survivor = play(SCENARIOS.find(s => s.id === 'survivor'));
  assert.deepEqual(survivor.outcome, { result: 'delivered', packages: 5, alone: true });
  for (const id of ['drop', 'ram', 'death-stands']) assert.equal(play(SCENARIOS.find(s => s.id === id)).outcome.why, 'not-in-cradle', id);
});

test('a stop looks the same whether Protection or a spent opportunity caused it, and no phone carries either', () => {
  const steps = [press(B + 600, 'hoist', 'up'), press(B + 1100, 'hoist', 'up'), press(B + 1600, 'hoist', 'up'), press(B + 2300, 'boom', 'right'), press(B + 2800, 'boom', 'right'), press(B + 3600, 'hoist', 'down')];
  const protectedRun = simulate(start({ protection: { hoist: false, boom: true } }), steps);
  const spentRun = simulate(start({ attack: { hoist: false, boom: true } }), steps);
  const seen = frames => frames.map(f => ({ events: f.events, hoist: view(f.state, SEATS.hoist, f.at), boom: view(f.state, SEATS.boom, f.at) }));
  assert.deepEqual(seen(protectedRun), seen(spentRun));
  const projection = JSON.stringify(seen(protectedRun));
  assert.doesNotMatch(projection, /protect|attack|opportunit/i);
});

test('the design never resets an attack opportunity: it comes in with the Task and is only ever spent', () => {
  for (const b of BOARDS) {
    const frames = run(b);
    for (const [i, f] of frames.entries()) {
      if (!i) continue;
      for (const role of ['hoist', 'boom']) assert.ok(!(f.state.attack[role] && !frames[i - 1].state.attack[role]), `${b.id}: ${role} regained an opportunity`);
    }
  }
  // The owner decided the scope (11 November 2026): one per match, and a blocked attack uses it up.
  for (const id of ['opportunity-per-match', 'block-uses-it']) assert.ok(RULES.some(r => r.id === id), id);
  for (const id of ['opportunity-reset', 'block-spends']) assert.ok(!OPEN_ITEMS.some(o => o.id === id), `${id} is decided`);
  const blocked = finalOf(run(BOARDS.find(b => b.id === 'protection-drop')));
  assert.equal(blocked.attack.hoist, false, 'the block used up the Hoist\'s attack');
  assert.equal(blocked.alive.boom, true);
});

test('deliberate attacks only (PROPOSED): a stale press or a held repeat never attacks; a fresh press on the warning does', () => {
  const ready = finalOf(simulate(start(), [press(B + 600, 'hoist', 'up'), press(B + 1100, 'hoist', 'up'), press(B + 1600, 'hoist', 'up'), press(B + 2300, 'boom', 'right'), press(B + 2800, 'boom', 'right')]));
  assert.equal(act(ready, press(B + 3600, 'hoist', 'down', { shown: false })).events.at(-1).why, 'stale');
  assert.equal(act(ready, press(B + 3600, 'hoist', 'down', { repeat: true })).events.at(-1).why, 'repeat');
  assert.ok(act(ready, press(B + 3600, 'hoist', 'down', { shown: true })).events.some(e => e.type === 'KILLED'));
  // The flags can only stop the presser's own attack: an ordinary move goes ahead with either.
  assert.ok(act(ready, press(B + 3600, 'hoist', 'up', { shown: false, repeat: true })).events.some(e => e.type === 'BUMPED' || e.type === 'MOVED'));
});

test('accidents (the owner, 11 November 2026): both moving at once near one of them can kill by mistake, and uses no attack', () => {
  assert.ok(RULES.some(r => r.id === 'accidents'));
  assert.equal(ACCIDENT.window, 500);
  assert.equal(ACCIDENT.chance, 0.25);
  // The zones: beside the Boom operator's head, and the cab's door.
  assert.equal(nearZone([5, 3], 5), 'boom');
  assert.equal(nearZone([4, 3], 4), 'boom');
  assert.equal(nearZone([1, 3], 1), 'cab');
  assert.equal(nearZone([2, 3], 2), null);
  assert.equal(nearZone([6, 1], 6, true), null);
  assert.equal(NEAR.boom.victim, 'boom');
  assert.equal(NEAR.cab.victim, 'hoist');
  // The accident: lethal, flagged as an accident, with no one's name on it, and every attack still unused.
  for (const id of ['accident', 'race-accident', 'cab-lurch']) {
    const got = play(SCENARIOS.find(x => x.id === id));
    const kill = got.events.find(e => e.type === 'KILLED');
    assert.ok(kill?.accident, id);
    assert.equal(kill.by, undefined, `${id}: an accident is no one's attack`);
    assert.deepEqual(got.attack, { hoist: true, boom: true }, `${id}: no attack used`);
    assert.doesNotMatch(JSON.stringify(got.events), /hospital/i);
  }
  // No jolt without both moving at once in a zone.
  for (const id of ['cooperation', 'drop', 'ram', 'survivor', 'one-at-a-time', 'together-bump']) {
    const events = id.includes('-') || !BOARDS.some(b => b.id === id) ? play(SCENARIOS.find(x => x.id === id)).events : run(BOARDS.find(b => b.id === id)).flatMap(f => f.events);
    assert.ok(!events.some(e => e.type === 'NEAR_MISS' || e.accident), id);
  }
});

test('an accident shows nothing about Protection: a Protected victim and a lucky roll look the same to both phones', () => {
  const steps = [press(B + 600, 'hoist', 'up'), press(B + 1100, 'hoist', 'up'), press(B + 1600, 'hoist', 'up'), press(B + 2300, 'boom', 'right'), press(B + 2800, 'boom', 'right'), press(B + 3300, 'boom', 'right')];
  const unlucky = simulate(start({ protection: { hoist: false, boom: true } }), [...steps, press(B + 3500, 'hoist', 'down', { roll: 0.1 })]);
  const lucky = simulate(start(), [...steps, press(B + 3500, 'hoist', 'down', { roll: 0.9 })]);
  const seen = frames => frames.map(f => ({ events: f.events, hoist: view(f.state, SEATS.hoist, f.at), boom: view(f.state, SEATS.boom, f.at) }));
  assert.deepEqual(seen(unlucky), seen(lucky));
  assert.ok(unlucky.flatMap(f => f.events).some(e => e.type === 'NEAR_MISS'));
  assert.ok(!unlucky.flatMap(f => f.events).some(e => e.type === 'STOPPED' || e.type === 'KILLED'));
});

test('a disconnect cancels after the grace; back in time nothing paused; a death before the cancellation stands', () => {
  const disconnect = play(SCENARIOS.find(s => s.id === 'disconnect'));
  assert.deepEqual(disconnect.outcome, { result: 'cancelled', why: 'disconnect', who: 'boom' });
  const ended = disconnect.events.find(e => e.type === 'ENDED');
  const off = disconnect.events.find(e => e.type === 'OFFLINE');
  assert.ok(ended && off);
  assert.equal(play(SCENARIOS.find(s => s.id === 'reconnect-in-grace')).outcome, null);
  assert.deepEqual(play(SCENARIOS.find(s => s.id === 'death-stands')).alive, { hoist: true, boom: false });
  assert.equal(TIMING.grace, 8000);
});

test('every hint fits three lines at 200% text on a 320-pixel phone', () => {
  const hints = new Set();
  for (const b of BOARDS) {
    const frames = run(b);
    for (const f of frames) {
      const recent = frames.filter(g => g.at <= f.at + 300 && f.at + 300 - g.at < 1500).flatMap(g => g.events);
      for (const seat of Object.values(SEATS)) hints.add(hintFor(view(f.state, seat, f.at + 300), recent).text);
    }
  }
  assert.ok(hints.size >= 15, `${hints.size} hints`);
  for (const h of hints) assert.ok(h.length <= 40, `${h.length}: ${h}`);
});

test('every motion cue has its timing and a Reduce motion form', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    assert.ok(Number.isFinite(cue.ms) && cue.ms > 0, name);
    assert.ok(typeof cue.reduced === 'string' && cue.reduced.length > 3, name);
    assert.doesNotMatch(cue.reduced, /flash(?!ing)/i, `${name}: no flashing with Reduce motion`);
  }
  assert.ok(CUES.move.ms <= TIMING.interval, 'a move finishes before the next press can land');
});

test('the rules record: each confirmed rule met, the conflicts with a solution, visibility for every audience', () => {
  assert.equal(RULES.length, 20);
  // The owner's answers of 11 November 2026: who is away shows on the board, and a Partner can decline.
  for (const id of ['away-visible', 'partner-decline']) assert.ok(RULES.some(r => r.id === id), id);
  assert.ok(!OPEN_ITEMS.some(o => o.id === 'public-away'), 'who is away is decided, not open');
  assert.match(CONFLICTS.find(c => c.id === 'deduced-attribution').residual, /Settled/);
  assert.match(VISIBILITY.others, /board shows who is away/);
  assert.ok(Number.isFinite(TIMING.answer) && TIMING.answer > 0, 'a time to answer the request');
  for (const r of RULES) assert.ok(r.rule && r.design, r.id);
  assert.ok(CONFLICTS.length >= 3);
  for (const c of CONFLICTS) {
    assert.ok(c.conflict && c.solution && c.residual, c.id);
    for (const id of c.rules) assert.ok(RULES.some(r => r.id === id), `${c.id} cites ${id}`);
  }
  for (const k of ['participants', 'others', 'death', 'protection', 'server']) assert.ok(VISIBILITY[k], k);
});

test('the handoff and the room art are what the export tool writes', () => {
  const art = text('design/food-supply/art/supply-room.back.svg');
  const handoff = text('design/food-supply/handoff.json');
  assert.equal(handoff, `${JSON.stringify(build(art), null, 2)}\n`);
  const h = JSON.parse(handoff);
  assert.equal(h.art.back.sha256, sha(art));
  assert.equal(art, roomArt(), 'the art is the room module\'s drawing');
  assert.equal(h.base.commit, '8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d');
  assert.equal(h.base.ruleset.rulesetVersion, 'in-person-planet-blackout-before-vote-2026-11-10');
  for (const [path, digest] of Object.entries(h.sources)) assert.equal(sha(readFileSync(new URL(path, root))), digest, path);
  assert.equal(h.acceptance.length, SCENARIOS.length);
  assert.deepEqual(h.plane.phoneView.crop, [...VIEW]);
  assert.doesNotMatch(JSON.stringify(h.projection), /"(attack|protection)"/);
});

test('the review files are recorded as rendered', { skip: !existsSync(new URL('design/food-supply/review/renders.json', root)) && 'no renders yet' }, () => {
  const record = JSON.parse(text('design/food-supply/review/renders.json'));
  const files = readdirSync(new URL('design/food-supply/review/', root)).filter(f => /\.(png|mp4)$/.test(f)).map(f => `design/food-supply/review/${f}`);
  assert.deepEqual(Object.keys(record.outputs).sort(), files.sort());
  for (const [path, entry] of Object.entries(record.outputs)) assert.equal(sha(readFileSync(new URL(path, root))), entry.sha256, path);
  assert.match(record.note, /not a phone/);
});

test('the package is English, dev-only, and nothing in the game refers to it', () => {
  const dir = new URL('design/food-supply/', root);
  for (const f of readdirSync(dir)) {
    const path = new URL(f, dir);
    if (statSync(path).isDirectory()) continue;
    const body = readFileSync(path, 'utf8');
    if (f.endsWith('.mjs')) assert.ok(body.startsWith('// mothership:dev-only\n'), f);
    if (f.endsWith('.html') || f.endsWith('.css')) assert.match(body, /mothership:dev-only/, f);
    assert.doesNotMatch(body, /[؀-ۿ]/, `${f}: English only`);
    assert.doesNotMatch(body, /\b(?:she|her|hers|he|him|his)\b/, `${f}: names, not guessed pronouns`);
  }
  const gameDirs = ['apps/game/src', 'services', 'packages/engine', 'packages/contracts'];
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' || e.name === 'dist' ? [] : e.isDirectory() ? walk(new URL(`${e.name}/`, d)) : [new URL(e.name, d)]));
  for (const d of gameDirs) {
    const base = new URL(`${d}/`, root);
    if (!existsSync(base)) continue;
    for (const f of walk(base)) if (/\.(m?[jt]sx?|json|html|css)$/.test(f.pathname)) assert.doesNotMatch(readFileSync(f, 'utf8'), /food-supply/, f.pathname);
  }
});
