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
//  - the owner's crane: the Winch's cab right of the platform, the fast locking panel that cuts at
//    the cab's stop, the crate's pendulum swing that can drop it on the Panel operator;
//  - the owner's answers of 12 November: a kill on the Task is not an attack, and the safety catch
//    saves by luck one time in four, so a stop looks the same whether Protection or luck caused it,
//    and nothing a phone is built from carries Protection or the roll;
//  - the timing the storyboards rely on: the sweep's beat, the swing's reach and its calming;
//  - every hint fits the largest text; every motion cue has a Reduce motion form;
//  - the handoff and the room art are what the export tool writes; the review files are recorded;
//    and nothing in the game's code refers to the package.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { CATCH, FIXTURES, FOOD, ROLES, STOPS, SWING, TIMING, ZONES, act, hazards, landingAt, simulate, startTask, sweep, swingOffset, tick, view } from '../../../design/food-supply/task.mjs';
import { BOXES, CRATE, HANG, OPERATORS, REGIONS, VIEW, stopX } from '../../../design/food-supply/layout.mjs';
import { BOARDS, CAST } from '../../../design/food-supply/boards.mjs';
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
const PLATFORM_AT = B + 2700, CAB_AT = B + 2920, OVER_CONSOLE = PLATFORM_AT + 975;
const start = (o = {}) => startTask({ seats: SEATS, at: 0, ...o });
const press = (at, role, what, extra = {}) => ({ at, seat: SEATS[role], act: what, ...extra });
const up = () => [press(B + 600, 'winch', 'raise'), press(B + 1600, 'panel', 'release')];
const finalOf = frames => frames[frames.length - 1].state;
const at = (frames, t) => tick([...frames].reverse().find(f => f.at <= t).state, t).state;

test('every acceptance scenario ends as it says: the nine storyboards and the edge cases', () => {
  assert.deepEqual(BOARDS.map(b => b.id), ['cooperation', 'chop', 'drop', 'standoff', 'protection-cut', 'protection-drop', 'mistakes', 'timeout', 'disconnect']);
  assert.ok(EDGES.length >= 25, `${EDGES.length} edge cases`);
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

test('both phones see each danger while it lasts, and the presser\'s button is striped and says it', () => {
  const sweeping = simulate(start(), up());
  const atCab = at(sweeping, B + 2860);
  assert.equal(hazards(atCab, B + 2860).cut, true);
  assert.deepEqual(view(atCab, SEATS.panel, B + 2860).warnings, ['panel-at-partner-cab']);
  assert.deepEqual(view(atCab, SEATS.winch, B + 2860).warnings, ['panel-at-your-cab']);
  assert.equal(view(atCab, SEATS.panel, B + 2860).buttons.find(x => x.act === 'lock').hazard, true);
  assert.equal(hazards(atCab, B + 2650).cut, false, 'over the platform, no danger');
  const locked = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock')]);
  const swung = at(locked, OVER_CONSOLE);
  assert.equal(hazards(swung, OVER_CONSOLE).drop, true);
  assert.deepEqual(view(swung, SEATS.winch, OVER_CONSOLE).warnings, ['crate-over-partner']);
  assert.deepEqual(view(swung, SEATS.panel, OVER_CONSOLE).warnings, ['crate-over-you']);
  const lower = view(swung, SEATS.winch, OVER_CONSOLE).buttons.find(x => x.act === 'lower');
  assert.equal(lower.hazard, true);
  assert.equal(lower.next, false, 'the glow never asks for a kill');
  // No warning for a partner who is already out.
  assert.equal(hazards({ ...atCab, alive: { winch: false, panel: true } }, B + 2860).cut, false);
});

test('the timing the storyboards rely on: the sweep\'s beat, the swing\'s reach and its calming', () => {
  assert.equal(sweep(0, 1, 1100).at, FIXTURES.platform.stop);
  assert.equal(sweep(0, 1, 1320).at, FIXTURES.cab.stop);
  assert.deepEqual(sweep(0, 1, 1430), { at: 5.5, dir: -1 });
  assert.equal(Math.round(sweep(0, 1, 1209).at), FIXTURES.platform.stop);
  assert.equal(Math.round(sweep(0, 1, 1210).at), FIXTURES.cab.stop, 'the cut begins half way between 6 and 7');
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
    const protectedRun = simulate(start({ protection: { winch: victim === 'winch', panel: victim === 'panel' } }), steps);
    const luckyRun = simulate(start(), steps.map((s, i) => (i === steps.length - 1 ? { ...s, roll: 0.1 } : s)));
    const seen = frames => frames.map(f => ({ events: f.events, winch: view(f.state, SEATS.winch, f.at), panel: view(f.state, SEATS.panel, f.at) }));
    assert.deepEqual(seen(protectedRun), seen(luckyRun));
    assert.ok(protectedRun.flatMap(f => f.events).some(e => e.type === 'STOPPED'));
    assert.doesNotMatch(JSON.stringify(seen(protectedRun)), /protect|attack|opportunit|roll/i);
  }
});

test('a kill on the Task is not an attack, and the catch saves by luck one time in four (the owner, 12 November)', () => {
  assert.ok(!('attack' in start()), 'no attack opportunity comes into the Task');
  assert.doesNotMatch(text('design/food-supply/task.mjs'), /state\.attack/);
  for (const id of ['task-kills', 'lucky-catch']) assert.ok(RULES.some(r => r.id === id), id);
  assert.equal(CATCH.luck, 0.25);
  assert.match(CONFLICTS.find(c => c.id === 'mistake-or-attack').residual, /Settled/);
  assert.ok(!OPEN_ITEMS.some(o => o.id === 'mistakes'), 'decided');
  // Below 1 in 4 the catch holds; at 1 in 4 it does not; Protection holds whatever the roll.
  for (const id of ['lucky-catch-cut', 'lucky-catch-drop', 'luck-runs-out', 'blocked-twice']) assert.deepEqual(differences(SCENARIOS.find(s => s.id === id)), [], id);
  // A press that cannot kill never reads the roll: a roll on an ordinary lock changes nothing.
  const plain = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock')]);
  const rolled = simulate(start(), [...up(), press(PLATFORM_AT, 'panel', 'lock', { roll: 0 })]);
  assert.deepEqual(rolled.map(f => f.events), plain.map(f => f.events));
});

test('press timing (PROPOSED): a press counts where its phone showed it, within the allowance', () => {
  assert.deepEqual(differences(SCENARIOS.find(s => s.id === 'press-counts-as-shown')), []);
  for (const [id, why] of [['late-press', 'late'], ['stale-press', 'stale']]) {
    assert.ok(play(SCENARIOS.find(s => s.id === id)).events.some(e => e.type === 'REFUSED' && e.why === why), id);
  }
  assert.equal(TIMING.lag, 300);
});

test('a disconnect cancels after the grace; back in time nothing paused; a death before the cancellation stands', () => {
  const disconnect = play(SCENARIOS.find(s => s.id === 'disconnect'));
  assert.deepEqual(disconnect.outcome, { result: 'cancelled', why: 'disconnect', who: 'panel' });
  assert.equal(play(SCENARIOS.find(s => s.id === 'reconnect-in-grace')).outcome, null);
  assert.deepEqual(play(SCENARIOS.find(s => s.id === 'death-stands-in-grace')).alive, { winch: true, panel: false });
  assert.equal(TIMING.grace, 8000);
  // A phone out of contact cannot press: its controls are off, and nothing on it is striped.
  const offline = simulate(start(), [...up(), { at: B + 2000, seat: SEATS.panel, online: false }]);
  for (const b of view(at(offline, B + 2860), SEATS.panel, B + 2860).buttons) assert.ok(!b.enabled && !b.hazard);
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

test('every motion cue has its timing and a Reduce motion form; the sweep and the swing keep their place', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    assert.ok(Number.isFinite(cue.ms) && cue.ms > 0, name);
    assert.ok(typeof cue.reduced === 'string' && cue.reduced.length > 3, name);
    assert.doesNotMatch(cue.reduced, /flash(?!ing)/i, `${name}: no flashing with Reduce motion`);
  }
  assert.match(CUES.sweep.reduced, /place/);
  assert.match(CUES.swing.reduced, /place/);
  assert.ok(CUES.lock.ms < TIMING.stop, 'the blade is down before the panel would have reached the next stop');
});

test('the rules record: each confirmed rule met, the conflicts with a solution, visibility for every audience', () => {
  assert.equal(RULES.length, 26);
  for (const id of ['away-visible', 'partner-decline', 'crane-sides', 'locking-panel', 'pendulum', 'task-kills', 'lucky-catch', 'time-limit']) assert.ok(RULES.some(r => r.id === id), id);
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
  // One sheet and one film per storyboard, and both participants' phones.
  for (const b of BOARDS) for (const f of [`board-${b.id}.png`, `film-${b.id}.mp4`]) assert.ok(files.includes(`design/food-supply/review/${f}`), f);
  for (const f of ['phones-winch.png', 'phones-panel.png']) assert.ok(files.includes(`design/food-supply/review/${f}`), f);
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
