// mothership:dev-only
//
// The Food Supply Task (docs/design/food-supply.md): a design proposal for the owner's confirmed
// highlights of 11 November 2026 and the owner's crane, on synthetic fixtures. These tests hold what
// it promises:
//  - every acceptance scenario, the nine storyboards and the edge cases, ends as it says;
//  - the confirmed rules: one control each on its own axis and no attack button; an unblocked attack
//    kills at once and never sends anyone to the Hospital; a survivor completes only from over the
//    platform; a disconnect cancels after the grace and a death before it stands; food is 5, +5, a
//    warning at 1;
//  - the owner's crane: the Winch's cab right of the platform, the locking panel that clicks from stop
//    to stop and cuts at the cab's stop, the crate's pendulum swing that can drop it on the Panel
//    operator;
//  - the owner's answers of 12 November: a kill on the Task is not an attack, and the safety catch
//    saves by luck one time in four, so a stop looks the same whether Protection or luck caused it,
//    and nothing a phone is built from carries Protection or the roll;
//  - Integration's review of 12 November: a press is resolved when the server receives it, bound to
//    a revision and a command id (a stale press is refused, a retry changes nothing); Protection is
//    read at each lethal press and used up by a block; the earliest ending wins; the participant's
//    projection is enough to draw the phone at any moment and carries nothing server-only;
//  - the timing the storyboards rely on: the click's rest and margin, the swing's reach and calming;
//  - every hint fits the largest text; every motion cue has a Reduce motion form;
//  - the handoff and the room art are what the export tool writes; the review files are recorded;
//    and nothing in the game's code refers to the package.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { CATCH, CLICK, FIXTURES, FOOD, ROLES, SERVER_ONLY, STOPS, SWING, TIMING, ZONES, act, atTime, hazards, landingAt, projection, simulate, startTask, sweep, swingOffset, tick, view } from '../../../design/food-supply/task.mjs';
import { BOXES, CRATE, HANG, OPERATORS, REGIONS, VIEW, stopX } from '../../../design/food-supply/layout.mjs';
import { BOARDS, CAST, MOMENTS } from '../../../design/food-supply/boards.mjs';
import { CUES, run } from '../../../design/food-supply/stage.mjs';
import { EDGES, SCENARIOS, differences, play } from '../../../design/food-supply/scenarios.mjs';
import { hintFor } from '../../../design/food-supply/hints.mjs';
import { CONFLICTS, OPEN_ITEMS, RULES, VISIBILITY } from '../../../design/food-supply/rules.mjs';
import { build, roomArt } from '../../../design/tools/food-supply-export.mjs';

const root = new URL('../../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SEATS = { winch: CAST.winch.seat, panel: CAST.panel.seat };
const B = TIMING.briefing;
const { release: R, platform: PLATFORM_AT, cab: CAB_AT, overConsole: OVER_CONSOLE } = MOMENTS;
/** The moment the panel's rest at a stop ends, on its first run right. */
const leaves = stop => R + stop * CLICK;
const start = (o = {}) => startTask({ seats: SEATS, at: 0, ...o });
const press = (at, role, what, extra = {}) => ({ at, seat: SEATS[role], act: what, ...extra });
const up = () => [press(B + 600, 'winch', 'raise'), press(R, 'panel', 'release')];
const finalOf = frames => frames[frames.length - 1].state;
const at = (frames, t) => tick([...frames].reverse().find(f => f.at <= t).state, t).state;

test('every acceptance scenario ends as it says: the nine storyboards and the edge cases', () => {
  assert.deepEqual(BOARDS.map(b => b.id), ['cooperation', 'chop', 'drop', 'standoff', 'protection-cut', 'protection-drop', 'mistakes', 'timeout', 'disconnect']);
  assert.ok(EDGES.length >= 30, `${EDGES.length} edge cases`);
  for (const s of SCENARIOS) assert.deepEqual(differences(s), [], s.id);
});

test('one control each on its own axis: the Winch vertical, the Panel horizontal, and no attack button', () => {
  assert.deepEqual(ROLES.winch.acts, ['raise', 'lower']);
  assert.deepEqual(ROLES.panel.acts, ['release', 'lock']);
  assert.equal(ROLES.winch.axis, 'vertical');
  assert.equal(ROLES.panel.axis, 'horizontal');
  // In every state of every storyboard, each phone offers only its own control and, once landed, its key.
  for (const b of BOARDS) {
    for (const f of run(b)) {
      for (const role of ['winch', 'panel']) {
        const acts = view(f.state, SEATS[role], f.at).buttons.map(x => x.act);
        for (const a of acts) assert.ok(ROLES[role].acts.includes(a) || a === 'key', `${b.id}: ${role} has ${a}`);
      }
    }
  }
  // A press of the other's control is refused; there is nothing else to press.
  const r = act({ ...start(), phase: 'running' }, press(B + 600, 'winch', 'lock'));
  assert.equal(r.events.at(-1).why, 'not-your-control');
});

test('the cooperative route delivers five packages in four presses and two keys, and the glow follows it', () => {
  const frames = run(BOARDS.find(b => b.id === 'cooperation'));
  for (const [i, f] of frames.entries()) {
    if (!f.step?.act) continue;
    const before = tick(frames[i - 1].state, f.at).state;
    const role = f.step.seat === SEATS.winch ? 'winch' : 'panel';
    const button = view(before, f.step.seat, f.at).buttons.find(x => x.act === f.step.act);
    assert.ok(button?.next, `${role} ${f.step.act} at ${f.at} glows`);
  }
  assert.equal(frames.filter(f => f.step?.act && f.step.act !== 'key').length, 4);
  assert.equal(frames.filter(f => f.step?.act === 'key').length, 2);
  assert.deepEqual(finalOf(frames).outcome, { result: 'delivered', packages: FOOD.perDelivery, alone: false });
});

test('food: five to start, five per delivery, the warning at one', () => {
  assert.deepEqual({ ...FOOD }, { initial: 5, perDelivery: 5, warnAt: 1 });
});

test('an unblocked lethal press kills at once, by the presser\'s own press, with no escape and no Hospital', () => {
  for (const [id, kind, victim] of [['chop', 'cut', 'winch'], ['drop', 'drop', 'panel']]) {
    const frames = run(BOARDS.find(b => b.id === id));
    const killed = frames.flatMap(f => f.events).find(e => e.type === 'KILLED');
    assert.equal(killed?.kind, kind, id);
    assert.equal(killed.victim, victim);
    const f = frames.find(x => x.events.includes(killed));
    assert.equal(f.step.seat, SEATS[killed.by], `${id}: the kill is the presser's own press`);
    assert.equal(finalOf(frames).alive[victim], false);
    assert.doesNotMatch(JSON.stringify(frames.flatMap(x => x.events)), /hospital/i);
  }
});

test('the owner\'s crane: the cab right of the platform, a lock at the cab\'s stop cuts, the swing can drop the crate on the console', () => {
  for (const id of ['crane-sides', 'locking-panel', 'pendulum']) assert.ok(RULES.some(r => r.id === id), id);
  assert.equal(STOPS, 7);
  assert.ok(FIXTURES.intake.stop < FIXTURES.console.stop && FIXTURES.console.stop < FIXTURES.platform.stop && FIXTURES.platform.stop < FIXTURES.cab.stop);
  assert.equal(FIXTURES.cab.stop, FIXTURES.platform.stop + 1, 'the cab is right of the platform');
  assert.equal(FIXTURES.cab.stop, STOPS - 1, 'at the rail\'s end');
  assert.deepEqual(REGIONS.cut.stops, [FIXTURES.cab.stop]);
  assert.equal(REGIONS.drop.centre, FIXTURES.console.stop);
  assert.equal(REGIONS.platform.centre, FIXTURES.platform.stop);
  // The picture agrees: the cab and the console stand at their stops, the crate hangs clear of the cab and over the operator's head.
  const inside = ([x, , w], s) => stopX(s) > x && stopX(s) < x + w;
  assert.ok(inside(BOXES.cab, FIXTURES.cab.stop) && inside(BOXES.console, FIXTURES.console.stop) && inside(BOXES.platform, FIXTURES.platform.stop));
  assert.ok(HANG - CRATE / 2 > BOXES.cab[1] + BOXES.cab[3], 'the hanging crate passes under the cab');
  assert.ok(HANG + CRATE / 2 < OPERATORS.panel.head, 'and over the Panel operator\'s head');
  // The zones a falling crate lands in.
  assert.equal(landingAt(FIXTURES.platform.stop + ZONES.platform), 'platform');
  assert.equal(landingAt(FIXTURES.console.stop - ZONES.console), 'console');
  assert.equal(landingAt(FIXTURES.platform.stop - 0.5), 'deck');
});

test('both phones see each danger while it lasts, from a margin before it, and the presser\'s button is striped and says it', () => {
  const clicking = simulate(start(), up());
  const atCab = at(clicking, CAB_AT - 100);
  assert.equal(hazards(atCab, CAB_AT - 100).cut, true);
  assert.deepEqual(view(atCab, SEATS.panel, CAB_AT - 100).warnings, ['panel-at-partner-cab']);
  assert.deepEqual(view(atCab, SEATS.winch, CAB_AT - 100).warnings, ['panel-at-your-cab']);
  assert.equal(view(atCab, SEATS.panel, CAB_AT - 100).buttons.find(x => x.act === 'lock').hazard, true);
  // Resting over the platform: no danger, and LOCK glows, until the margin before the panel snaps on.
  const early = at(clicking, PLATFORM_AT);
  assert.equal(hazards(early, PLATFORM_AT).cut, false, 'over the platform, no danger');
  assert.equal(view(early, SEATS.panel, PLATFORM_AT).buttons.find(x => x.act === 'lock').next, true);
  const late = leaves(5) - TIMING.margin + 10;
  const leaving = view(at(clicking, late), SEATS.panel, late).buttons.find(x => x.act === 'lock');
  assert.equal(leaving.stop, FIXTURES.platform.stop, 'still resting over the platform');
  assert.ok(leaving.hazard && leaving.leaving && !leaving.next, 'but a press now may arrive as it snaps on to the cab: striped, not glowing');
  const locked = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock')]);
  const swung = at(locked, OVER_CONSOLE);
  assert.equal(hazards(swung, OVER_CONSOLE).drop, true);
  assert.deepEqual(view(swung, SEATS.winch, OVER_CONSOLE).warnings, ['crate-over-partner']);
  assert.deepEqual(view(swung, SEATS.panel, OVER_CONSOLE).warnings, ['crate-over-you']);
  const lower = view(swung, SEATS.winch, OVER_CONSOLE).buttons.find(x => x.act === 'lower');
  assert.equal(lower.hazard, true);
  assert.equal(lower.next, false, 'the glow never asks for a kill');
  // The drop's warning starts a margin before the swing reaches the console.
  let first = null;
  for (let t = PLATFORM_AT; t < OVER_CONSOLE && first === null; t += 5) if (hazards(at(locked, t), t).drop) first = t;
  let reaches = null;
  for (let t = PLATFORM_AT; t < OVER_CONSOLE && reaches === null; t += 5) if (hazards(at(locked, t), t).zone === 'console') reaches = t;
  assert.ok(reaches - first >= TIMING.margin - 10, `warned ${reaches - first} ms before`);
  // No warning for a partner who is already out.
  assert.equal(hazards({ ...atCab, alive: { winch: false, panel: true } }, CAB_AT - 100).cut, false);
});

test('the click and the swing the storyboards rely on: a fast snap, a rest at each stop longer than the margin, the swing\'s reach and its calming', () => {
  assert.equal(CLICK, TIMING.move + TIMING.rest);
  assert.ok(TIMING.move < TIMING.rest && TIMING.margin < TIMING.rest, 'a fast snap, a rest longer than the margin');
  assert.deepEqual(sweep(0, 1, 0), { at: 0, dir: 1, stop: 1, resting: false });
  assert.deepEqual(sweep(0, 1, TIMING.move), { at: 1, dir: 1, stop: 1, resting: true });
  // Each stop takes a LOCK for one whole click: the snap toward it and the rest at it.
  for (let dt = 4 * CLICK; dt < 5 * CLICK; dt += 10) assert.equal(sweep(0, 1, dt).stop, FIXTURES.platform.stop, `${dt}`);
  assert.equal(sweep(0, 1, 5 * CLICK).stop, FIXTURES.cab.stop, 'then it snaps on to the cab');
  assert.deepEqual(sweep(0, 1, 6 * CLICK), { at: FIXTURES.cab.stop, dir: -1, stop: FIXTURES.platform.stop, resting: false }, 'and back from the rail\'s end');
  const swing = { since: 0, amp: SWING.lock, dir: 1 };
  // Locked over the platform, the swing reaches the console zone in its first second, then never again.
  assert.equal(landingAt(FIXTURES.platform.stop + swingOffset(swing, 975)), 'console');
  for (let t = 2300; t <= TIMING.deadline; t += 25) assert.notEqual(landingAt(FIXTURES.platform.stop + swingOffset(swing, t)), 'console', `${t} ms`);
  // It calms but never stops: every swing still passes over the platform and out of it.
  let widest = 0;
  for (let t = 40000; t <= 41300; t += 10) widest = Math.max(widest, Math.abs(swingOffset(swing, t)));
  assert.ok(widest > ZONES.platform && widest < SWING.least + 0.01, `${widest}`);
});

test('a survivor completes only from over the platform; anywhere else a death loses the Task', () => {
  assert.deepEqual(play(SCENARIOS.find(s => s.id === 'drop')).outcome, { result: 'delivered', packages: 5, alone: true });
  assert.deepEqual(play(SCENARIOS.find(s => s.id === 'standoff')).outcome, { result: 'delivered', packages: 5, alone: true });
  for (const id of ['chop', 'drop-from-the-console-stop']) assert.equal(play(SCENARIOS.find(s => s.id === id)).outcome.why, 'not-in-position', id);
  assert.equal(play(SCENARIOS.find(s => s.id === 'survivor-out-of-time')).outcome.why, 'time');
});

test('a stop looks the same whether Protection or the catch\'s luck caused it, and no phone carries either', () => {
  const cut = [...up(), press(CAB_AT, 'panel', 'lock')];
  const drop = [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower')];
  for (const [steps, victim] of [[cut, 'winch'], [drop, 'panel']]) {
    const protectedRun = simulate(start(), steps, { protection: { winch: victim === 'winch', panel: victim === 'panel' } });
    const luckyRun = simulate(start(), steps.map((s, i) => (i === steps.length - 1 ? { ...s, roll: 0.1 } : s)));
    const seen = frames => frames.map(f => Object.fromEntries(['winch', 'panel'].map(r => [r, { view: view(f.state, SEATS[r], f.at), projection: projection(f.state, SEATS[r], { observedAt: f.at, events: f.events }) }])));
    assert.deepEqual(seen(protectedRun), seen(luckyRun));
    assert.ok(protectedRun.flatMap(f => f.events).some(e => e.type === 'STOPPED'));
    assert.doesNotMatch(JSON.stringify(seen(protectedRun)), /protect|attack|opportunit|roll|CATCH|held|receipt/i);
    // The server keeps its own record of each lethal press: the roll and what held.
    assert.deepEqual(protectedRun.flatMap(f => f.events).filter(e => e.type === 'CATCH').map(e => e.held), ['protection']);
    assert.deepEqual(luckyRun.flatMap(f => f.events).filter(e => e.type === 'CATCH').map(e => e.held), ['luck']);
  }
});

test('Protection is the game\'s: read at each lethal press, and a block uses it up (Integration, 12 November)', () => {
  assert.ok(!('protection' in start()), 'the Task holds no Protection');
  assert.deepEqual(differences(SCENARIOS.find(s => s.id === 'protection-used-once')), []);
  const frames = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock'), press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.9 })], { protection: { winch: false, panel: true } });
  assert.deepEqual(frames[frames.length - 1].game.protection, { winch: false, panel: false }, 'the block used it up');
  // Read at the press: Protection the game gives later is read then; none is read from the Task's start.
  const later = act(at(simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock')]), OVER_CONSOLE), { ...press(OVER_CONSOLE, 'winch', 'lower', { roll: 0.9 }), protection: { winch: false, panel: true } });
  assert.ok(later.events.some(e => e.type === 'STOPPED'));
  assert.doesNotMatch(text('design/food-supply/task.mjs'), /clone\.active/);
});

test('a kill on the Task is not an attack, and the catch saves by luck one time in four (the owner, 12 November)', () => {
  assert.ok(!('attack' in start()), 'no attack opportunity comes into the Task');
  assert.doesNotMatch(text('design/food-supply/task.mjs'), /state\.attack/);
  for (const id of ['task-kills', 'lucky-catch']) assert.ok(RULES.some(r => r.id === id), id);
  assert.equal(CATCH.luck, 0.25);
  assert.match(CONFLICTS.find(c => c.id === 'mistake-or-attack').residual, /Settled/);
  assert.ok(!OPEN_ITEMS.some(o => o.id === 'mistakes'), 'decided');
  // Below 1 in 4 the catch holds; at 1 in 4 it does not; Protection holds once, whatever the roll.
  for (const id of ['lucky-catch-cut', 'lucky-catch-drop', 'luck-runs-out', 'protection-used-once']) assert.deepEqual(differences(SCENARIOS.find(s => s.id === id)), [], id);
  // A press that cannot kill never reads the roll: a roll on an ordinary lock changes nothing.
  const plain = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock')]);
  const rolled = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock', { roll: 0 })]);
  assert.deepEqual(rolled.map(f => f.events), plain.map(f => f.events));
});

test('a press is resolved when the server receives it, bound to a revision and a command id (Integration, 12 November)', () => {
  assert.ok(!('lag' in TIMING) && !('stop' in TIMING), 'no allowance for a phone\'s own time');
  assert.deepEqual(differences(SCENARIOS.find(s => s.id === 'press-resolves-on-arrival')), []);
  // The phone's own moment decides nothing.
  const late = leaves(5) + 80;
  const a = simulate(start(), [...up(), press(late, 'panel', 'lock', { shownAt: leaves(5) - 70 })]);
  const b = simulate(start(), [...up(), press(late, 'panel', 'lock', { shownAt: 0 })]);
  assert.deepEqual(a.map(f => f.events), b.map(f => f.events));
  // And when it was made, the phone warned: LOCK was striped for the rest's last margin.
  const shown = leaves(5) - 70;
  assert.equal(view(at(simulate(start(), up()), shown), SEATS.panel, shown).buttons.find(x => x.act === 'lock').hazard, true);
  for (const id of ['stale-press', 'retry-same-command', 'retry-keeps-the-roll', 'one-delivery']) assert.deepEqual(differences(SCENARIOS.find(s => s.id === id)), [], id);
  // A press for another Task is refused; each event has its identity, order and time.
  const other = act(at(simulate(start(), up()), PLATFORM_AT), press(PLATFORM_AT, 'panel', 'lock', { taskId: 'task-2' }));
  assert.equal(other.events.at(-1).why, 'not-this-task');
  const events = simulate(start(), BOARDS[0].steps).flatMap(f => f.events);
  assert.deepEqual(events.map(e => e.seq), events.map((_, i) => i + 1));
  for (const e of events) assert.ok(e.id && Number.isFinite(e.t), e.type);
});

test('the earliest ending wins, at the same moment the deadline first, and an ended Task stays as it ended', () => {
  for (const id of ['earliest-ending', 'ending-tie', 'no-revival', 'one-delivery']) assert.deepEqual(differences(SCENARIOS.find(s => s.id === id)), [], id);
  const frames = simulate(start(), SCENARIOS.find(s => s.id === 'earliest-ending').steps);
  assert.equal(frames[frames.length - 1].state.endedAt, TIMING.deadline, 'ended at the deadline, though processed later');
  // Idempotent: ticking an ended Task again changes nothing.
  const ended = frames[frames.length - 1].state;
  assert.deepEqual(tick(ended, TIMING.deadline + 60000).state.outcome, ended.outcome);
  assert.deepEqual(tick(ended, TIMING.deadline + 60000).events, []);
});

test('the participant\'s projection is enough to draw the phone at any moment, and carries nothing server-only', () => {
  for (const b of BOARDS) {
    const frames = run(b);
    for (const [i, f] of frames.entries()) {
      const until = frames[i + 1]?.at ?? f.at + 2000;
      for (const seat of Object.values(SEATS)) {
        const proj = projection(f.state, seat, { observedAt: f.at, events: f.events });
        const json = JSON.stringify(proj);
        assert.doesNotMatch(json, /receipts|pressRevision|protection|"CATCH"|"held"|"roll"/, `${b.id} ${f.at}`);
        for (let t = f.at; t < until; t += 97) assert.deepEqual(view(atTime(proj, t), seat, t), view(tick(f.state, t).state, seat, t), `${b.id} at ${t}`);
      }
    }
  }
  assert.deepEqual([...SERVER_ONLY], ['CATCH']);
});

test('a disconnect cancels after the grace; back in time nothing paused; a death before the cancellation stands', () => {
  const disconnect = play(SCENARIOS.find(s => s.id === 'disconnect'));
  assert.deepEqual(disconnect.outcome, { result: 'cancelled', why: 'disconnect', who: 'panel' });
  assert.equal(play(SCENARIOS.find(s => s.id === 'reconnect-in-grace')).outcome, null);
  assert.deepEqual(play(SCENARIOS.find(s => s.id === 'death-stands-in-grace')).alive, { winch: true, panel: false });
  assert.equal(TIMING.grace, 8000);
  // A phone out of contact cannot press: its controls are off, and nothing on it is striped.
  const offline = simulate(start(), [...up(), { at: R + 400, seat: SEATS.panel, online: false }]);
  for (const b of view(at(offline, CAB_AT - 100), SEATS.panel, CAB_AT - 100).buttons) assert.ok(!b.enabled && !b.hazard);
});

test('every hint fits three lines at 200% text on a 320-pixel phone', () => {
  const hints = new Set();
  for (const b of BOARDS) {
    const frames = run(b);
    const end = frames[frames.length - 1].at + 1000;
    for (let t = 0; t <= end; t += 50) {
      const recent = frames.filter(g => g.at <= t && t - g.at < 1500).flatMap(g => g.events);
      const state = at(frames, t);
      for (const seat of Object.values(SEATS)) hints.add(hintFor(view(state, seat, t), recent).text);
    }
  }
  assert.ok(hints.size >= 25, `${hints.size} hints`);
  for (const h of hints) assert.ok(h.length <= 40, `${h.length}: ${h}`);
});

test('every motion cue has its timing and a Reduce motion form; the click and the swing keep their stop and place', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    assert.ok(Number.isFinite(cue.ms) && cue.ms > 0, name);
    assert.ok(typeof cue.reduced === 'string' && cue.reduced.length > 3, name);
    assert.doesNotMatch(cue.reduced, /flash(?!ing)/i, `${name}: no flashing with Reduce motion`);
  }
  assert.match(CUES.click.reduced, /same stop at the same moment/);
  assert.match(CUES.swing.reduced, /place/);
  assert.ok(CUES.lock.ms < TIMING.rest, 'the blade is down before the panel would snap on');
});

test('the rules record: each confirmed rule met, the conflicts with a solution, visibility for every audience', () => {
  assert.equal(RULES.length, 31);
  for (const id of ['away-visible', 'partner-decline', 'crane-sides', 'locking-panel', 'pendulum', 'task-kills', 'lucky-catch', 'time-limit', 'click-stop']) assert.ok(RULES.some(r => r.id === id), id);
  assert.equal(TIMING.deadline, 30000, 'the owner: 30 seconds to complete the Task');
  const s = start();
  assert.equal(s.deadline - s.startedAt, 30000, 'counted from the Task\'s start: the briefing is inside it');
  assert.equal(view(s, SEATS.winch, 0).secondsLeft, 30);
  assert.equal(view(s, SEATS.winch, TIMING.briefing).secondsLeft, 26, 'the controls work for the last 26 s');
  assert.ok(!OPEN_ITEMS.some(o => o.id === 'public-away'), 'who is away is decided, not open');
  assert.match(CONFLICTS.find(c => c.id === 'deduced-attribution').residual, /Settled/);
  assert.match(CONFLICTS.find(c => c.id === 'blocked-attack-disclosure').residual, /Settled by the owner/);
  assert.match(VISIBILITY.others, /board shows who is away/);
  assert.ok(Number.isFinite(TIMING.answer) && TIMING.answer > 0, 'a time to answer the request');
  for (const r of RULES) assert.ok(r.rule && r.design, r.id);
  assert.equal(CONFLICTS.length, 5);
  for (const c of CONFLICTS) {
    assert.ok(c.conflict && c.solution && c.residual, c.id);
    for (const id of c.rules) assert.ok(RULES.some(r => r.id === id), `${c.id} cites ${id}`);
  }
  for (const k of ['participants', 'others', 'death', 'protection', 'mistakes', 'server']) assert.ok(VISIBILITY[k], k);
  // The gantry's dice accidents are gone: the only roll left is the catch's, read by a press that would kill.
  assert.doesNotMatch(text('design/food-supply/task.mjs'), /chance/);
  assert.match(text('design/food-supply/task.mjs'), /roll < CATCH\.luck/);
});

test('starting a Task: no one-Task limit, the two sit out food next round, a refusal passes on (the owner, 12 November)', () => {
  for (const id of ['next-round', 'next-volunteer', 'random-controls', 'food-count-only', 'leaving-free']) assert.ok(RULES.some(r => r.id === id), id);
  assert.ok(!RULES.some(r => r.id === 'one-initiation'), 'the owner withdrew the one-Task limit');
  for (const id of ['initiation-spent', 'deliberate-disconnect', 'roles', 'public-result']) assert.ok(!OPEN_ITEMS.some(o => o.id === id), `${id} is decided`);
  for (const id of ['next-round', 'next-volunteer']) assert.ok(OPEN_ITEMS.some(o => o.id === id), `${id}: the edges stay PROPOSED`);
  assert.match(CONFLICTS.find(c => c.id === 'disconnect-escape').residual, /costs nothing/);
  assert.match(CONFLICTS.find(c => c.id === 'survivor-paths').solution, /at random \(the owner/);
  assert.match(VISIBILITY.others, /only through the food count/);
  // No screen or handoff text keeps the withdrawn limit or the old decline.
  const handoff = text('design/food-supply/handoff.json');
  for (const file of ['design/food-supply/phone.mjs', 'design/tools/food-supply-export.mjs']) {
    assert.doesNotMatch(text(file), /initiation|one Task this match|use your own Task|ask someone else|is not used/i, file);
  }
  assert.doesNotMatch(handoff, /"one-initiation"|initiation-spent|asks someone else/);
  assert.match(text('design/food-supply/phone.mjs'), /If you join, neither of you can go for food next round/);
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
  // Integration's corrections: a dose, not a package; no public outcome; presses on arrival; the version target.
  assert.match(h.food.eating, /one dose/);
  assert.doesNotMatch(h.food.eating, /eats one package/);
  assert.doesNotMatch(JSON.stringify(h.state), /PROPOSED public/);
  assert.doesNotMatch(JSON.stringify(h.controls.command), /TIMING\.lag|counts at the moment its phone/);
  assert.match(JSON.stringify(h.controls.command), /commandId/);
  assert.equal(h.target.rulesetVersion, 'in-person-planet-food-task-2026-11-12');
});

test('the review files are recorded as rendered', { skip: !existsSync(new URL('design/food-supply/review/renders.json', root)) && 'no renders yet' }, () => {
  const record = JSON.parse(text('design/food-supply/review/renders.json'));
  const files = readdirSync(new URL('design/food-supply/review/', root)).filter(f => /\.(png|mp4)$/.test(f)).map(f => `design/food-supply/review/${f}`);
  assert.deepEqual(Object.keys(record.outputs).sort(), files.sort());
  for (const [path, entry] of Object.entries(record.outputs)) assert.equal(sha(readFileSync(new URL(path, root))), entry.sha256, path);
  assert.match(record.note, /not a phone/);
  // One sheet and one film per storyboard, and both participants' phones.
  for (const b of BOARDS) for (const f of [`board-${b.id}.png`, `film-${b.id}.mp4`]) assert.ok(files.includes(`design/food-supply/review/${f}`), f);
  for (const f of ['phones-winch.png', 'phones-panel.png', 'states.png', 'flow.png', 'large-text.png']) assert.ok(files.includes(`design/food-supply/review/${f}`), f);
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
