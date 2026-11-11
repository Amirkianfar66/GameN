// mothership:dev-only
//
// The phone interface pack (docs/design/phone-ui.md). These tests hold what its handoff promises:
//   - the catalog covers every required screen group (A–Q), the flow, the matrix, the components,
//     the three phone sizes, larger text and Reduce motion, and every frame names a real screen;
//   - the committed review sheets are the ones the render tool recorded, and the recorded checks of
//     every frame are clean: no sideways overflow, no control under 44 px, no text under 11 px, no
//     text cut off, every letter at least 4.5:1 (3:1 large) against what is drawn behind it at every
//     pixel of its ink, glass and art included, at each sampled moment of the rooms' ambient motion,
//     and no page error; the smallest phone with the Largest text is among the measured frames;
//   - after Register, each action shows its own state: waiting ones are never drawn as a result; a
//     private talk, a Clone and the Engineer's capture say what happened at once;
//   - a hack declaration offers the same three sides to every role and lets only the Undercover and
//     the Alien claim any; each Promise result is a valid match moment (one given, one received);
//   - the glass keeps the owner's 56% with a halo under light words, and a result says each count once;
//   - the room view is framed wider than the first draft (the owner found it too zoomed in, 9
//     November 2026): it fills the space between the bars and keeps everyone present in view;
//   - each tab (Board, Actions, Pass, Card, Panels) and the top bar's Promises and settings menu (⋮)
//     have a tap-by-tap sheet (the owner, 9 November 2026), and every tap the sheets draw lands on a
//     control the prototype really shows;
//   - the rooms’ ambient motion (the owner, 9 and 10 November 2026) covers every room and the private-
//     talk capsule, draws the same on every phone from nothing but the room, shows one voyage for the
//     whole ship on one clock, never uses a team’s colour, keeps only the windows (dimmed) with the
//     lights out, and holds still under Reduce motion;
//   - the kit’s colours are tokens 0.5.0’s, the icon family is whole and its exports are current;
//   - synthetic-fixture labels stay outside the proposed interface; everything is development-only,
//     and no game code imports the pack.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SHEETS, SIZES } from '../../../design/phone-ui/sheets/catalog.mjs';
import { screenRegistry } from '../../../design/phone-ui/prototype/screens.mjs';
import { ICONS, ICON_NAMES } from '../../../design/phone-ui/prototype/icons.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, board } from '../../../design/phone-ui/prototype/fixtures.mjs';
import { EDGE_CLEAR, LOCATION_OF, phoneFrame } from '../../../design/phone-ui/prototype/art.mjs';
import { BOARD_ROOMS, sceneOf, slotsOf } from '../../../apps/game/hosted/board-v2-drawing/slots-four.mjs';
import { frameScene } from '../../../apps/game/hosted/scene-drawing/frame.mjs';
import { phoneUiAssets } from '../../../design/tools/phone-ui-assets.mjs';
import { AMBIENT_ROOMS, SKY, SKY_EPOCH, WINDOW_DELAY, ambientLayer, settleAmbient, windowCrossings } from '../../../design/phone-ui/prototype/ambient.mjs';
import { afterRegister } from '../../../design/phone-ui/prototype/screens-game.mjs';
import { PROMISE_RESULTS, declarableSides } from '../../../design/phone-ui/prototype/screens-more.mjs';
import { CONTRAST_MOMENTS } from '../../../design/tools/phone-ui-render.mjs';
import { NIGHT } from '../../../design/board-v2/scenes/lighting.mjs';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const PACK = join(REPO, 'design/phone-ui');
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });

test('the catalog covers every required screen group, view and diagram', () => {
  const ids = SHEETS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'sheet numbers are unique');
  assert.deepEqual([...ids], [...ids].sort(), 'sheets are numbered in order');
  for (const section of 'ABCDEFGHIJKLMNOPQ') assert.ok(SHEETS.some(s => s.section === section), `section ${section} has a sheet`);
  for (const kind of ['flow', 'phases', 'matrix', 'foundations', 'icons', 'controls', 'timeline', 'art', 'compare', 'taps']) assert.ok(SHEETS.some(s => s.kind === kind), `a ${kind} sheet`);
  const frames = SHEETS.flatMap(s => s.frames ?? []);
  for (const size of ['320x568', '390x844', '430x932', '390x664']) assert.ok(frames.some(f => (f.size ?? '390x844') === size), `a frame at ${size}`);
  assert.ok(frames.some(f => f.text === '1.5') && frames.some(f => f.text === '2'), 'larger text at 150% and 200%');
  assert.ok(frames.filter(f => f.motion === 'reduced').length >= 4, 'Reduce motion examples');
  for (const f of frames) assert.ok(SIZES[f.size ?? '390x844'], `known size ${f.size}`);
  const phases = SHEETS.find(s => s.kind === 'phases');
  assert.match(phases.status, /Integration proposal/, 'the Blackout order is labelled an Integration proposal');
});

test('every frame names a screen of the prototype', () => {
  const screens = screenRegistry();
  for (const sheet of SHEETS) for (const f of sheet.frames ?? []) {
    const name = new URLSearchParams(f.q).get('s');
    assert.equal(typeof screens[name], 'function', `${sheet.id} “${f.label}”: screen ${name}`);
  }
  for (const required of ['intro', 'menu', 'host-setup', 'host-lobby', 'join', 'join-wait', 'recover', 'choose', 'role', 'boarding', 'room', 'board', 'actions', 'card', 'panels', 'settings', 'promises', 'windows', 'vote', 'result', 'captain', 'officer', 'nav', 'talk', 'scan', 'code', 'panel', 'blackout', 'blackhole', 'eliminated', 'end', 'system']) assert.equal(typeof screens[required], 'function', required);
});

test('the review sheets are the recorded renders, and every measured frame is clean', () => {
  const checks = JSON.parse(read('design/phone-ui/review/checks.json'));
  assert.deepEqual(checks.sheets.map(s => s.id), SHEETS.map(s => s.id), 'every sheet was rendered and recorded');
  for (const s of checks.sheets) {
    const file = join(REPO, s.file);
    assert.ok(existsSync(file), s.file);
    assert.equal(sha(readFileSync(file)), s.sha256, `${s.file} is the recorded render`);
    assert.deepEqual(s.problems, [], `${s.id}: no page errors`);
    const sheet = SHEETS.find(x => x.id === s.id);
    assert.equal(s.frames.length, sheet.kind === 'compare' ? 2 : sheet.frames?.length ?? 0, `${s.id}: every frame measured`);
    for (const f of s.frames) {
      assert.equal(f.error, undefined, `${s.id} ${f.label}: measured`);
      assert.equal(f.overflowX, false, `${s.id} ${f.label}: no sideways overflow`);
      assert.deepEqual(f.small, [], `${s.id} ${f.label}: controls at least 44 px`);
      assert.deepEqual(f.tinyText, [], `${s.id} ${f.label}: no text under 11 px`);
      // Measured against what is drawn behind it, glass and art included (sheet.mjs, "Text contrast").
      assert.ok(f.contrast && !f.contrast.error, `${s.id} ${f.label}: text contrast measured`);
      assert.deepEqual(f.contrast.low, [], `${s.id} ${f.label}: every letter at least 4.5:1 (3:1 for large text) at every pixel of its ink`);
      assert.ok([0, CONTRAST_MOMENTS.length].includes(f.contrast.moments), `${s.id} ${f.label}: measured at every sampled moment of the ambient motion`);
      assert.equal(f.clipped, 0, `${s.id} ${f.label}: no text cut off (${f.clippedText})`);
    }
  }
  assert.deepEqual(checks.contrast.moments, [...CONTRAST_MOMENTS], 'the recorded moments are the tool’s');
  assert.ok(checks.sheets.some(s => s.frames.some(f => f.contrast.moving > 0)), 'some letters were measured over moving backgrounds');
  // Integration's review of d52a8ae9: the results and ballots at 320 × 568 with the Largest (200%) text are measured.
  const smallest = checks.sheets.flatMap(s => s.frames).filter(f => f.width === 320 && f.height === 568 && /text=2/.test(f.src) && /s=(result|vote)&/.test(f.src));
  assert.ok(smallest.some(f => /s=result&/.test(f.src)) && smallest.some(f => /s=vote&/.test(f.src)), 'the result and the ballot at 320 × 568 with 200% text');
  assert.ok(existsSync(join(PACK, 'review/contact-sheet.jpg')), 'the numbered contact sheet');
  const provenance = JSON.parse(read('design/phone-ui/review/inputs/provenance.json'));
  for (const input of provenance.inputs) assert.ok(existsSync(join(REPO, input.file)), input.file);
});

test('the room view is framed wider than the first draft, fills the space between the bars and keeps everyone present in view', () => {
  // 390 × 844 with the bars at their default size: 99 px above (47 px safe area) and 92 px below (34 px).
  const panel = { width: 390, height: 844 - 99 - 92, cap: 46, pad: 8 };
  for (const [room, fixture] of Object.entries(ROOM_FIXTURES)) {
    const scene = sceneOf(room, 9);
    const present = board({ roster: 9, place: fixture.place }).filter(s => s.location === LOCATION_OF[room] && s.slot)
      .map(s => slotsOf(room, 9).find(slot => slot.id === s.slot));
    const frame = phoneFrame(scene, panel, present);
    // The first draft framed the whole phone with the game's frameScene(), under the bars.
    const first = frameScene(scene, { width: 390, height: 844, cap: 99 + 46, pad: 92 + 8 });
    assert.ok(frame.k <= first.k * 0.8, `${room}: people at least a fifth smaller than in the first draft`);
    const [ix0, iy0, ix1, iy1] = scene.inner;
    assert.ok(frame.tx <= -ix0 * frame.k + 0.01 && frame.tx + ix1 * frame.k >= panel.width - 0.01, `${room}: the picture fills the width`);
    assert.ok(frame.ty <= -iy0 * frame.k + 0.01 && frame.ty + iy1 * frame.k >= panel.height - 0.01, `${room}: the picture fills the height`);
    const xs = present.map(slot => frame.tx + slot.pressAt[0] * frame.k);
    const fits = Math.max(...xs) - Math.min(...xs) <= panel.width - 2 * EDGE_CLEAR;
    for (const x of xs) assert.ok(fits ? x >= EDGE_CLEAR - 0.01 && x <= panel.width - EDGE_CLEAR + 0.01 : x >= 0 && x <= panel.width, `${room}: a person present at ${x.toFixed(0)} px is in view`);
  }
});

test('each tab and each top-bar button has a tap-by-tap sheet, and every tap drawn lands on a real control', () => {
  for (const key of ['switch', 'actions', 'hero', 'card', 'panels']) {
    assert.ok(SHEETS.some(s => s.kind === 'taps' && s.frames[0].tap === `[data-tab="${key}"]`), `a tap-by-tap sheet starts by tapping the ${key} tab`);
  }
  // The top bar's Promises (after the name) and settings menu (⋮, beside the clock): the owner, 9 November.
  for (const key of ['promises', 'menu']) {
    assert.ok(SHEETS.some(s => s.kind === 'taps' && s.frames.some(f => f.tap === `[data-tb="${key}"]`)), `a tap-by-tap sheet taps the top bar's ${key}`);
  }
  const checks = JSON.parse(read('design/phone-ui/review/checks.json'));
  const recorded = checks.sheets.flatMap(s => s.frames.filter(f => 'tap' in f).map(f => ({ ...f, sheet: s.id })));
  for (const f of recorded) assert.equal(f.tap, true, `${f.sheet} “${f.label}”: the tapped control is on screen`);
  assert.equal(recorded.length, SHEETS.flatMap(s => (s.frames ?? []).filter(f => f.tap)).length, 'the render checked every tap');
});

test('the rooms’ ambient motion covers every room, shows no game fact and is still under Reduce motion', () => {
  const rooms = ['room-a', 'room-b', 'command-room', 'hospital', 'jail', 'capsule'];
  assert.deepEqual(Object.keys(AMBIENT_ROOMS).sort(), [...rooms].sort(), 'every room and the capsule');
  for (const room of ['room-a', 'room-b', 'command-room', 'hospital']) assert.ok(AMBIENT_ROOMS[room].windows?.[0]?.voyage, `${room} has a window`);
  for (const room of ['jail', 'capsule']) assert.equal(AMBIENT_ROOMS[room].windows, undefined, `${room} has no window`);
  // What the game uses to say something never moves: no keypad keys or lamp in the Jail.
  assert.equal(AMBIENT_ROOMS.jail.keys, undefined, 'the Jail keypad’s keys never light');
  assert.equal(AMBIENT_ROOMS.jail.lights, undefined, 'the Jail’s lamp is left as drawn');
  // One voyage for the whole ship (the owner, 10 November 2026): one sky, one clock, one speed.
  const kinds = new Set(['giant', 'banded', 'ringed', 'moon', 'twins', 'binary', 'comet', 'rocks', 'belt', 'teal']);
  for (const fb of SKY.flybys) assert.ok(kinds.has(fb.kind), `${fb.kind} is one of the sky’s own things (never a black hole)`);
  const windowed = BOARD_ROOMS.filter(room => AMBIENT_ROOMS[room]?.windows);
  assert.deepEqual(windowed, ['command-room', 'room-a', 'room-b', 'hospital'], 'four rooms have a window');
  for (const [k, room] of windowed.entries()) {
    const v = AMBIENT_ROOMS[room].windows[0];
    assert.equal(v.delay, WINDOW_DELAY[room], `${room} sits on the ship’s line`);
    if (k) assert.ok(v.delay > AMBIENT_ROOMS[windowed[k - 1]].windows[0].delay, `${room} sees the sky after ${windowed[k - 1]}, front to back as the board stacks them`);
    assert.ok(['room-a', 'command', 'ward', 'cream'].includes(v.voyage.home.kind), `${room}: the one cream world at rest`);
    // Every passer crosses every window within one loop, so a still at 0 s shows only the home world and the stars.
    const box = v.shape === 'round' ? { w: 2 * v.r } : v.box ?? { w: v.w };
    for (const c of windowCrossings(box, v.delay)) assert.ok(c.from >= 0 && c.to <= SKY.period, `${room}: the ${c.kind} crosses within the voyage`);
  }
  // One clock: live, every room is at the ship’s time and runs on; held, at the review’s time.
  const animation = () => ({ currentTime: 0, paused: false, pause() { this.paused = true; } });
  const layer = list => ({ querySelectorAll: () => [{ getAnimations: () => list }] });
  const [live, held] = [animation(), animation()];
  settleAmbient(layer([live]), { live: true, now: SKY_EPOCH + 61000 });
  settleAmbient(layer([held]), { at: 45 });
  assert.deepEqual([live.currentTime, live.paused, held.currentTime, held.paused], [61000, false, 45000, true]);
  // Drawn from the room alone: the module imports only the night rule, and draws the same markup every time.
  const source = read('design/phone-ui/prototype/ambient.mjs');
  assert.deepEqual([...source.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]), ['../../board-v2/scenes/lighting.mjs']);
  const tokens = JSON.parse(read('packages/design-tokens/src/tokens-0.5.0.json'));
  const css = read('design/phone-ui/prototype/ambient.css');
  for (const hex of Object.values(tokens.color.factionPrivateOrRevealed)) {
    assert.doesNotMatch(source + css, new RegExp(String(hex), 'i'), `no team colour (${hex})`);
  }
  const before = globalThis.document;
  globalThis.document = { createElementNS: () => ({ attrs: {}, style: {}, dataset: {}, setAttribute(k, v) { this.attrs[k] = v; }, innerHTML: '' }) };
  try {
    const draw = (room, opts) => ambientLayer(room, { tx: 0, ty: 0, k: 1 }, opts)?.innerHTML.replace(/amb\d+-/g, 'amb-');
    for (const room of rooms) assert.equal(draw(room), draw(room), `${room} draws the same every time`);
    // Lights out: only the windows move, dimmed by the night rule; no screen, key or light.
    for (const room of ['room-a', 'room-b', 'command-room', 'hospital']) {
      const dark = draw(room, { dark: true });
      assert.ok(dark.includes(`fill="${NIGHT.low}" opacity="${Number((1 - NIGHT.space).toFixed(2))}"`), `${room}: its windows dimmed with the lights out`);
      assert.doesNotMatch(dark, /amb-(key|led|type|cursor|bar|ping|scroll|bubble|mote|glint|scan)/, `${room}: every screen and light off`);
    }
    for (const room of ['jail', 'capsule']) assert.equal(draw(room, { dark: true }), undefined, `${room}: nothing moves with the lights out`);
  } finally {
    globalThis.document = before;
  }
  assert.match(css, /mothership:dev-only/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.amb \* \{ animation-play-state: paused !important; \} \}/, 'still under the system’s Reduce motion');
  assert.match(css, /\[data-motion="reduced"\] \.amb \*/, 'still under the game’s Reduce motion');
  assert.ok(SHEETS.some(s => s.slug === 'ambient-motion'), 'a review sheet shows a moment of each room');
});

test('after Register, each action says what happened, and a waiting action never looks resolved', () => {
  const eli = { seat: 5, name: 'Eli' }, gus = { seat: 7, name: 'Gus' }, ava = { seat: 1, name: 'Ava' };
  const waits = { rescue: eli, protect: gus, supply: null, shoot: gus, blackout: null };
  for (const [act, target] of Object.entries(waits)) {
    const a = afterRegister(act, target, 'room-a');
    assert.equal(a.stamp, 'REGISTERED', act);
    assert.equal(a.tone, 'pending', `${act}: an outline stamp, not a result's`);
    assert.match(a.detail, /^This is not a result\./, `${act}: not a result`);
    assert.equal(a.steps[0][0], 'done', act);
    assert.ok(a.steps.slice(1).every(([state]) => state !== 'done'), `${act}: what follows is still to come`);
  }
  assert.match(afterRegister('protect', gus, 'room-a').detail, /active from Round 4/, 'Protection is active from the next round');
  const talk = afterRegister('talk', ava, 'room-a');
  assert.equal(talk.stamp, 'ACCEPTED');
  assert.match(talk.detail, /starts after this turn/, 'a private talk starts after the current turn');
  const clone = afterRegister('clone', null, 'room-a');
  assert.equal(clone.stamp, 'ACTIVE');
  assert.match(clone.detail, /^Active from now, through the attacks at the end of Round 4/, 'Clone: active at once (CLONE-01), through the next round’s attacks (P17)');
  const capture = afterRegister('suppress', null, 'room-a');
  assert.equal(capture.stamp, 'CAPTURED');
  const inB = board({ roster: 9, place: ROOM_FIXTURES['room-a'].place }).filter(s => s.location === 'Room B').map(s => s.seat);
  assert.deepEqual(capture.people.map(x => x.seat), inB, 'the Engineer’s capture names who was in Room B (P14)');
  const source = read('design/phone-ui/prototype/screens-game.mjs');
  assert.doesNotMatch(source, /Nothing happens yet\. It resolves after the vote/, 'the old generic line is gone');
});

test('other rooms are chosen on the board, with the list as its text alternative', () => {
  const targeting = SHEETS.find(s => s.slug === 'targeting');
  assert.ok(targeting.frames.some(f => /^s=board&state=targets&/.test(f.q) && f.tap), 'the board, with a person tapped');
  assert.ok(targeting.frames.some(f => /state=offroom/.test(f.q)), 'the same choice as a list');
  assert.ok(targeting.frames.some(f => /state=targeting/.test(f.q) && f.tap === '.offroom .btn'), 'Other rooms is tapped from the room');
});

test('a hack declaration: the same three sides for every role, any side only for the Undercover and the Alien', () => {
  const own = { Doctor: 'blue', Insider: 'blue', 'Blue Disabler': 'blue', Supplier: 'blue', Engineer: 'blue', 'Red Disabler': 'red', Hacker: 'red' };
  for (const [role, side] of Object.entries(own)) assert.deepEqual(declarableSides(role), [side], `${role} declares its own side`);
  for (const role of ['Undercover', 'Alien']) assert.deepEqual(declarableSides(role), ['blue', 'red', 'alien'], `${role} may bluff`);
  const talk = SHEETS.find(s => s.slug === 'private-talk');
  assert.ok(talk.frames.some(f => /stage=declare&role=Doctor/.test(f.q)) && talk.frames.some(f => /stage=declare&role=Undercover/.test(f.q)), 'both cases drawn');
});

test('Promise results are valid match moments, and Captain Support says which ballots count', () => {
  const statuses = new Set();
  for (const [name, r] of Object.entries(PROMISE_RESULTS)) {
    const [given, received] = /Given (\d)\/1 · Received (\d)\/1/.exec(r.quota).slice(1).map(Number);
    assert.ok(given <= 1 && received <= 1, `${name}: within the lifetime quota`);
    assert.equal(Boolean(r.given), given === 1, `${name}: the given Promise matches the quota`);
    assert.equal(Boolean(r.received), received === 1, `${name}: the received Promise matches the quota`);
    for (const x of [r.given, r.received].filter(Boolean)) statuses.add(x.status);
  }
  assert.deepEqual([...statuses].sort(), ['Condition not met', 'Fulfilled', 'Not fulfilled', 'Pending'], 'each result state is its own scenario');
  assert.match(read('design/phone-ui/prototype/screens-more.mjs'), /in every ballot of that election in which the recipient is a candidate/, 'Captain Support’s terms (P23)');
});

test('the glass keeps the owner’s level, light words on it carry a halo, and a result says each count once', () => {
  const css = read('design/phone-ui/prototype/kit.css');
  assert.match(css, /--glass-filter: blur\(2px\) saturate\(1\.3\) brightness\(0\.56\);/, 'the room at 56% behind glass (the owner, 9 November; kept 10 November)');
  assert.match(css, /\.sheet \{[^}]*text-shadow: var\(--glass-halo\);/, 'light words on glass carry the halo');
  assert.match(css, /--glass-halo: 0 0 1px [^;]+, 0 0 3px [^;]+, 0 0 8px [^;]+;/, 'the halo has no offset, so it surrounds each letter');
  const vote = read('design/phone-ui/prototype/screens-vote.mjs');
  assert.doesNotMatch(vote, /note: `\$\{n\} \$\{n === 1/, 'no “N votes” line under a counted name (the owner, 10 November)');
  assert.match(vote, /label: `Player \$\{seat\.seat\}, \$\{seat\.name\}, \$\{n\} \$\{n === 1 \? 'vote' : 'votes'\}`/, 'the accessible name still says the count');
});

test('the kit’s colours, type and motion are tokens 0.5.0', () => {
  const tokens = JSON.parse(read('packages/design-tokens/src/tokens-0.5.0.json'));
  const css = read('design/phone-ui/prototype/kit.css');
  const value = name => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1].trim();
  const c = tokens.color;
  const expected = {
    canvas: c.canvas, panel: c.panel, paper: c.paper, 'paper-shade': c.paperShade, 'paper-deep': c.paperDeep, ink: c.ink,
    'text-primary': c.textPrimary, 'text-secondary': c.textSecondary, 'public-token': c.publicToken, accent: c.interactiveAccent,
    focus: c.focusRing, caption: c.caption, 'steel-deep': c.steel.deep, 'steel-shadow': c.steel.shadow, 'steel-mid': c.steel.mid,
    'steel-light': c.steel.light, 'steel-pale': c.steel.pale, 'faction-blue': c.factionPrivateOrRevealed.blue, 'faction-red': c.factionPrivateOrRevealed.red,
    'faction-alien': c.factionPrivateOrRevealed.alien, 'room-a': c.room.roomA.mid, 'room-b': c.room.roomB.mid, 'room-command': c.room.commandRoom.mid,
    'room-hospital': c.room.hospital.mid, 'room-jail': c.room.jail.mid,
    't-selection': `${tokens.motionMs.selection}ms`, 't-card': `${tokens.motionMs.cardTransition}ms`, 't-public-move': `${tokens.motionMs.publicMove}ms`,
    't-round': `${tokens.motionMs.roundTransition}ms`, 't-reduced': `${tokens.motionMs.reducedMotionFade}ms`,
    'ease-standard': tokens.motionEasing.standard, 'ease-settle': tokens.motionEasing.settle, 'ease-snap': tokens.motionEasing.snap,
    target: `${tokens.interaction.minimumTargetCssPx}px`,
  };
  for (const [name, want] of Object.entries(expected)) assert.equal(value(name)?.toUpperCase(), String(want).toUpperCase(), `--${name}`);
  // Faction colours are defined once and used only for team chips (a player's own card, claims, the end reveal).
  const all = ['kit.css', 'screens.css'].map(f => read(`design/phone-ui/prototype/${f}`)).join('\n');
  const uses = all.split('\n').filter(line => /var\(--faction-/.test(line));
  assert.ok(uses.length > 0 && uses.every(line => /team-chip/.test(line)), 'faction colours only in team chips');
});

test('the icon family is whole and its exports are current', () => {
  assert.ok(ICON_NAMES.length >= 60);
  // Panels is stacked layers, the settings menu a vertical ⋮ and Promises a handshake (the owner, 9 November).
  for (const name of ['panels', 'menu', 'promise']) assert.ok(ICONS[name], `the ${name} icon`);
  assert.equal(ICONS.more, undefined, 'More is now Panels');
  for (const name of ICON_NAMES) {
    const icon = ICONS[name];
    assert.ok(icon.label && icon.label.length > 1, `${name} has an accessible name`);
    assert.ok(['navigation', 'action', 'status', 'phase', 'entry', 'utility'].includes(icon.group), `${name} group`);
    assert.ok(icon.parts.length > 0);
  }
  for (const [file, text] of Object.entries(phoneUiAssets())) assert.equal(read(`design/phone-ui/assets/${file}`), text, `design/phone-ui/assets/${file} is current`);
});

test('fixture labels stay outside the proposed interface', () => {
  assert.match(FIXTURE_LABEL, /^Synthetic fixture/);
  for (const file of readdirSync(join(PACK, 'prototype')).filter(f => /^(screens.*|ui|art|icons)\.mjs$/.test(f))) {
    const text = read(`design/phone-ui/prototype/${file}`);
    assert.doesNotMatch(text, /FIXTURE_LABEL|Synthetic fixture/, `${file} draws no fixture label inside a phone`);
  }
});

test('the pack is development-only and no game code imports it', () => {
  const files = [...walk(join(PACK, 'prototype')), ...walk(join(PACK, 'sheets')), join(REPO, 'design/tools/phone-ui-render.mjs'), join(REPO, 'design/tools/phone-ui-assets.mjs'), join(REPO, 'design/tools/phone-ui-clickable.mjs')]
    .filter(f => /\.(mjs|html|css)$/.test(f));
  for (const f of files) assert.match(readFileSync(f, 'utf8'), /mothership:dev-only/, f);
  const roots = ['apps/game/src', 'apps/game/hosted', 'packages/contracts/src', 'packages/engine/src', 'packages/presentation/src', 'services', 'infra'].map(p => join(REPO, p)).filter(existsSync);
  for (const f of roots.flatMap(walk).filter(f => /\.(m?[jt]s|html|css)$/.test(f) && !f.includes('node_modules') && !f.includes(`${'/'}dist${'/'}`))) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /phone-ui\/(prototype|sheets|assets)/, `${f} does not import the pack`);
  }
});
