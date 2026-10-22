import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRoster } from '../dist/full-game/roster.js';
import { evaluateVictory, healthyPower } from '../dist/full-game/victory.js';

const roles = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
function roster() {
  return buildRoster({
    playerCount: 7, roleOrder: roles, codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'],
    initialRooms: Object.fromEntries(roles.map((_, index) => [`seat-${index + 1}`, 'Room A'])),
  }).seats;
}
function evaluate(seats, overrides = {}) {
  return evaluateVictory({ seats, round: 2, correctCode: false, codeEligibleNow: false, simultaneousElimination: false, finalCheckpoint: false, ...overrides });
}

test('healthy power excludes injury/Jail and includes one eligible Alien bonus without treating it as Blue membership', () => {
  const seats = roster();
  assert.deepEqual(healthyPower(seats), { bluePower: 5, redPower: 2 });
  seats[0].health = 'Injured';
  seats[1].jailed = true;
  seats[4].health = 'Injured';
  assert.deepEqual(healthyPower(seats), { bluePower: 3, redPower: 1 });
  seats[6].jailed = true;
  assert.deepEqual(healthyPower(seats), { bluePower: 2, redPower: 1 });
  seats[6].jailed = false;
  seats[6].health = 'Injured';
  assert.deepEqual(healthyPower(seats), { bluePower: 2, redPower: 1 });
});

test('elimination victories require an actual Healthy member and Alien co-wins only with Blue while non-eliminated', () => {
  const seats = roster();
  seats.filter(seat => seat.faction === 'Red').forEach(seat => { seat.health = 'Eliminated'; });
  assert.deepEqual(evaluate(seats), { winner: 'Blue', alienCoWinner: true });
  seats[6].health = 'Injured';
  assert.deepEqual(evaluate(seats), { winner: 'Blue', alienCoWinner: true });
  seats[6].health = 'Eliminated';
  assert.deepEqual(evaluate(seats), { winner: 'Blue', alienCoWinner: false });
  seats.filter(seat => seat.faction === 'Blue').forEach(seat => { seat.health = 'Injured'; });
  assert.equal(evaluate(seats), null);
  const redWins = roster();
  redWins.filter(seat => seat.faction === 'Blue').forEach(seat => { seat.health = 'Eliminated'; });
  assert.deepEqual(evaluate(redWins), { winner: 'Red', alienCoWinner: false });
  redWins.filter(seat => seat.faction === 'Red').forEach(seat => { seat.health = 'Injured'; });
  assert.equal(evaluate(redWins), null);
});

test('Healthy jailed members meet the minimum health requirement while their power remains zero', () => {
  const seats = roster();
  seats.filter(seat => seat.faction === 'Red').forEach(seat => { seat.health = 'Eliminated'; });
  seats.filter(seat => seat.faction === 'Blue').forEach(seat => { seat.jailed = true; });
  assert.deepEqual(healthyPower(seats), { bluePower: 1, redPower: 0 });
  assert.deepEqual(evaluate(seats), { winner: 'Blue', alienCoWinner: true });
});

test('Code victory runs at the caller-selected Round 5 checkpoint and needs no power superiority', () => {
  const seats = roster();
  assert.equal(evaluate(seats, { correctCode: true }), null);
  assert.equal(evaluate(seats, { round: 5, correctCode: true, codeEligibleNow: false }), null);
  assert.deepEqual(evaluate(seats, { round: 5, correctCode: true, codeEligibleNow: true }), { winner: 'Red', alienCoWinner: false });
  seats.filter(seat => seat.faction === 'Red').forEach(seat => { seat.jailed = true; });
  assert.deepEqual(evaluate(seats, { round: 5, correctCode: true, codeEligibleNow: true }), { winner: 'Red', alienCoWinner: false });
  seats.filter(seat => seat.faction === 'Red').forEach(seat => { seat.health = 'Injured'; });
  assert.equal(evaluate(seats, { round: 5, correctCode: true, codeEligibleNow: true }), null);
});

test('normal Round 5 power victory uses strict superiority, no correct Code and the actual Blue minimum', () => {
  const seats = roster();
  assert.equal(evaluate(seats, { round: 5, codeEligibleNow: false }), null);
  assert.deepEqual(evaluate(seats, { round: 5, codeEligibleNow: true }), { winner: 'Blue', alienCoWinner: true });
  seats[0].health = 'Injured';
  seats[1].health = 'Injured';
  seats[6].health = 'Injured';
  assert.deepEqual(healthyPower(seats), { bluePower: 2, redPower: 2 });
  assert.equal(evaluate(seats, { round: 5, codeEligibleNow: true }), null);
  seats.filter(seat => seat.faction === 'Blue').forEach(seat => { seat.health = 'Injured'; });
  seats.filter(seat => seat.faction === 'Red').forEach(seat => { seat.health = 'Injured'; });
  seats[6].health = 'Healthy';
  assert.deepEqual(healthyPower(seats), { bluePower: 1, redPower: 0 });
  assert.equal(evaluate(seats, { round: 5, codeEligibleNow: true }), null);
});

test('Alien solo requires explicit complete-stage simultaneity evidence and survival, not just faction absence', () => {
  const seats = roster();
  seats.filter(seat => seat.faction !== 'Alien').forEach(seat => { seat.health = 'Eliminated'; });
  assert.equal(evaluate(seats), null);
  assert.deepEqual(evaluate(seats, { simultaneousElimination: true }), { winner: 'Alien', alienCoWinner: false });
  seats[6].health = 'Injured';
  seats[6].jailed = true;
  assert.deepEqual(evaluate(seats, { simultaneousElimination: true }), { winner: 'Alien', alienCoWinner: false });
  seats[6].health = 'Eliminated';
  assert.equal(evaluate(seats, { simultaneousElimination: true }), null);
});

test('normal R5 no-winner returns null for showdown; only explicit terminal checkpoint returns Draw', () => {
  const seats = roster();
  seats[0].health = 'Injured';
  seats[1].health = 'Injured';
  seats[6].health = 'Injured';
  assert.equal(evaluate(seats, { round: 5, codeEligibleNow: true, finalCheckpoint: false }), null);
  assert.deepEqual(evaluate(seats, { round: 5, codeEligibleNow: true, finalCheckpoint: true }), { winner: 'Draw', alienCoWinner: false });
  assert.throws(() => evaluate(seats, { round: 4, finalCheckpoint: true }));
  assert.throws(() => evaluate(seats, { round: 6 }));
});

test('victory predicates preserve source state and never reveal private resources or roles in results', () => {
  const seats = roster();
  const before = structuredClone(seats);
  const result = evaluate(seats, { round: 5, codeEligibleNow: true });
  assert.deepEqual(seats, before);
  assert.deepEqual(Object.keys(result).sort(), ['alienCoWinner', 'winner']);
  assert.equal(JSON.stringify(result).includes('Undercover'), false);
  assert.equal(JSON.stringify(result).includes('seat-'), false);
});
