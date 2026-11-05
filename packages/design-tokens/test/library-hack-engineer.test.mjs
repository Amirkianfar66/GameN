// mothership:dev-only
//
// Library group 1 (design/library/hack-engineer/; docs/design/library/hack-engineer.md): the
// Hacker's final Code and ship hack, the Engineer's capture. These test the proposal's own modules:
// the state map from a player view, the art's palette, the generated assets and the motion. None of
// them is a rule or a server answer; the server's offers stay the only authority on what may be done.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { LIBRARY_ART_VERSION, P, libraryAssets } from '../../../design/library/hack-engineer/art.mjs';
import { LIBRARY_COPY, listSeats } from '../../../design/library/hack-engineer/copy.mjs';
import { FRAMES, MOTION, motionEnd } from '../../../design/library/hack-engineer/motion.mjs';
import { STATES, engineerState, finalCodeState, roleActionBlockers, shipHackState } from '../../../design/library/hack-engineer/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const PLACES = { 1: 'Room A', 2: 'Room A', 3: 'Room A', 4: 'Room A', 5: 'Room B', 6: 'Room B', 7: 'Command Room', 8: 'Hospital', 9: 'Jail' };
function view({ role, seat, round = 3, phase = 'ORDINARY_TURN', active = seat, health = 'Healthy', location = PLACES[seat], jailed = false, roleActionSpent = false, abilities = {}, offers = [], lastMovedRound = round - 1, places = PLACES }) {
  return {
    round, phase: { kind: phase }, activeSeatId: active, navigation: { lastMovedRound, arrivedAt: null }, self: { seatId: seat, role, roleActionSpent },
    board: { kind: 'PLAYER_CURRENT', seats: Object.keys(places).map(Number).map(n => ({ seatId: n, health: n === seat ? health : 'Healthy', location: n === seat ? location : places[n], slotId: null, jailed: n === seat ? jailed : n === 9, captain: false, officer: false, revealedFaction: null })) },
    abilities: { codeAttempted: false, shipHackUnlocked: false, shipHackSpent: false, engineerSpent: false, ...abilities },
    offers: offers.map(type => ({ type, targetSeatIds: [], slotIds: [], windowIds: [], promiseTargetSeatIds: [] })),
  };
}
const H = o => view({ role: 'Hacker', seat: 3, ...o });
const E = o => view({ role: 'Engineer', seat: 4, ...o });

test('the final Code: Round 2 on, one attempt, its answer read from the unlock, never offered without the server', () => {
  assert.equal(finalCodeState(H({ round: 1, offers: ['SUBMIT_CODE'] })).state, 'round1');
  assert.equal(finalCodeState(H({ offers: ['SUBMIT_CODE'] })).state, 'available');
  assert.equal(finalCodeState(H({})).state, 'closed');
  assert.equal(finalCodeState(H({ offers: ['SUBMIT_CODE'] }), { pending: 'SUBMIT_CODE' }).state, 'sending');
  assert.equal(finalCodeState(H({ abilities: { codeAttempted: true, shipHackUnlocked: true } })).state, 'correct');
  assert.equal(finalCodeState(H({ abilities: { codeAttempted: true } })).state, 'wrong');
  // A late answer for an attempt already recorded never goes back to sending.
  assert.equal(finalCodeState(H({ abilities: { codeAttempted: true } }), { pending: 'SUBMIT_CODE' }).state, 'wrong');
  // Injured or Jailed may still submit (P18): the offer decides, not the seat's place.
  assert.equal(finalCodeState(H({ health: 'Injured', location: 'Hospital', offers: ['SUBMIT_CODE'] })).state, 'available');
  assert.equal(finalCodeState(H({ health: 'Eliminated', location: null })).state, 'none');
  assert.equal(finalCodeState(E({ offers: ['SUBMIT_CODE'] })).state, 'none');
});

test('the ship hack: sealed until unlocked, eligible only when offered, retained this round, used after', () => {
  const unlocked = { codeAttempted: true, shipHackUnlocked: true };
  assert.equal(shipHackState(H({})).state, 'sealed');
  assert.equal(shipHackState(H({ abilities: { codeAttempted: true } })).state, 'sealed');
  assert.equal(shipHackState(H({ abilities: unlocked, offers: ['ACTIVATE_SHIP_HACK'] })).state, 'eligible');
  assert.deepEqual(shipHackState(H({ abilities: unlocked, active: 5 })), { state: 'armed', blockers: ['notYourTurn'] });
  assert.deepEqual(shipHackState(H({ abilities: unlocked, health: 'Injured', location: 'Hospital' })).blockers, ['injured']);
  assert.deepEqual(shipHackState(H({ abilities: unlocked, jailed: true, location: 'Jail' })).blockers, ['jailed']);
  assert.deepEqual(shipHackState(H({ abilities: unlocked, location: 'Command Room' })).blockers, ['notInAB']);
  assert.deepEqual(shipHackState(H({ abilities: unlocked, roleActionSpent: true })).blockers, ['actionUsed']);
  // Every fact in order, and a server that withholds the offer for its own reason.
  assert.deepEqual(shipHackState(H({ abilities: unlocked, active: 5, roleActionSpent: true })).blockers, ['notYourTurn', 'actionUsed']);
  assert.deepEqual(shipHackState(H({ abilities: unlocked })).blockers, ['notNow']);
  assert.equal(shipHackState(H({ abilities: unlocked, offers: ['ACTIVATE_SHIP_HACK'] }), { pending: 'ACTIVATE_SHIP_HACK' }).state, 'sending');
  const spent = { ...unlocked, shipHackSpent: true, shipHackRound: 3 };
  assert.equal(shipHackState(H({ abilities: spent })).state, 'retained');
  assert.equal(shipHackState(H({ abilities: spent, lastMovedRound: 3 })).state, 'used');
  assert.equal(shipHackState(H({ round: 4, abilities: spent })).state, 'used');
  // Without the round (R9) a spent hack is only "used": the round is never guessed.
  assert.deepEqual(shipHackState(H({ abilities: { ...unlocked, shipHackSpent: true } })), { state: 'used', round: null });
});

test('the Engineer\'s capture: offered from A/B, a preview of the opposite room, and the server\'s fixed identities after', () => {
  assert.deepEqual(engineerState(E({ offers: ['ENGINEER_SUPPRESS'] })), { state: 'available', room: 'Room B', preview: [5, 6] });
  assert.deepEqual(engineerState(E({ location: 'Room B', offers: ['ENGINEER_SUPPRESS'] })).preview, [1, 2, 3]);
  assert.deepEqual(engineerState(E({ offers: ['ENGINEER_SUPPRESS'], places: { ...PLACES, 5: 'Room A', 6: 'Jail' } })).preview, []);
  assert.equal(engineerState(E({ offers: ['ENGINEER_SUPPRESS'] }), { pending: 'ENGINEER_SUPPRESS' }).state, 'sending');
  assert.deepEqual(engineerState(E({ active: 2 })).blockers, ['notYourTurn']);
  assert.deepEqual(engineerState(E({ location: 'Command Room' })).blockers, ['notInAB']);
  // The record is the server's, not the board: after the capture the captured may move, the print does not.
  const moved = { ...PLACES, 5: 'Hospital', 6: 'Room A', 1: 'Room B' };
  assert.deepEqual(engineerState(E({ places: moved, abilities: { engineerSpent: true, engineerCapture: { round: 3, seatIds: [6, 5] } } })), { state: 'captured', round: 3, seatIds: [5, 6] });
  assert.deepEqual(engineerState(E({ round: 4, abilities: { engineerSpent: true, engineerCapture: { round: 3, seatIds: [5, 6] } } })), { state: 'used', round: 3, seatIds: [5, 6] });
  // Without the record (R8), no identities are drawn.
  assert.deepEqual(engineerState(E({ abilities: { engineerSpent: true } })), { state: 'used', round: null, seatIds: null });
  assert.equal(engineerState(H({ offers: ['ENGINEER_SUPPRESS'] })).state, 'none');
});

test('every state each map returns is listed, and the blockers are the listed ones', () => {
  for (const s of [finalCodeState(H({ round: 1 })), finalCodeState(H({})), finalCodeState(H({ offers: ['SUBMIT_CODE'] }))]) assert.ok(STATES.finalCode.includes(s.state));
  for (const s of [shipHackState(H({})), shipHackState(H({ abilities: { shipHackUnlocked: true, codeAttempted: true } }))]) assert.ok(STATES.shipHack.includes(s.state));
  const blockers = roleActionBlockers(H({ active: 5, roleActionSpent: true, location: 'Command Room' }));
  for (const b of blockers) assert.ok(STATES.blockers.includes(b));
  for (const b of STATES.blockers) assert.equal(typeof LIBRARY_COPY.blockers[b], 'string');
});

test('a seat list in words never splits a label: "Player 5, Eli and Player 6, Fay", never "Player 5, Eli, Player 6 and Fay"', () => {
  const [ada, ben, cy, eli, fay] = [[1, 'Ada'], [2, 'Ben'], [3, 'Cy'], [5, 'Eli'], [6, 'Fay']].map(([n, name]) => ({ n, name }));
  assert.equal(listSeats([]), '');
  assert.equal(listSeats([eli]), 'Player 5, Eli');
  assert.equal(listSeats([eli, fay]), 'Player 5, Eli and Player 6, Fay');
  assert.equal(listSeats([ada, ben, cy]), 'Player 1, Ada; Player 2, Ben and Player 3, Cy');
  assert.match(LIBRARY_COPY.captureAsk('Room B', [eli, fay]), /: Player 5, Eli and Player 6, Fay\. /);
  assert.equal(LIBRARY_COPY.captured([eli, fay], 3), 'Captured: Player 5, Eli and Player 6, Fay. Their navigation input is zero through Round 3.');
  assert.equal(LIBRARY_COPY.captureUsed([eli, fay], 3), 'Captured in Round 3: Player 5, Eli and Player 6, Fay.');
});

test('the group\'s art keeps off every faction accent and uses the dossier\'s palette only', () => {
  const assets = libraryAssets();
  assert.equal(Object.keys(assets).length, 13);
  const palette = new Set(Object.values(P).map(c => c.toUpperCase()));
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 20, name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      assert.ok(palette.has(hex.toUpperCase()), `${name}: ${hex} is not the dossier's`);
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
    }
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build();
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/hack-engineer/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, LIBRARY_ART_VERSION);
  assert.equal(manifest.assets.length, 13);
});

test('the motion: once, bounded, a dark shutter (never a light flash), and reduced as two fades only', () => {
  for (const kind of Object.keys(FRAMES)) {
    assert.ok(MOTION[kind].end <= 1200, kind);
    const last = FRAMES[kind](motionEnd(kind), {});
    assert.equal(last.done, true, kind);
    assert.equal(last.stamp.opacity, 1, kind);
    for (let t = 0; t <= motionEnd(kind, true); t += 10) {
      const f = FRAMES[kind](t, { reduced: true });
      assert.deepEqual(Object.keys(f).sort(), ['after', 'before', 'done', 'reduced', 'stamp']);
      assert.equal(f.stamp.scale, 1);
    }
  }
  for (let t = 0; t <= MOTION.capture.end; t += 10) {
    const f = FRAMES.capture(t);
    assert.ok(f.shutter >= 0 && f.shutter <= 0.85);
  }
  assert.equal(FRAMES.capture(MOTION.capture.end).develop, 0);
  assert.equal(FRAMES.insert(MOTION.insert.end).seated, true);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/hack-engineer/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length, 'a capture is listed twice (one page load overwrote another\'s file)');
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
    assert.equal(bytes.length, entry.bytes, entry.file);
  }
});
