import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRoster } from '../dist/full-game/roster.js';

// Explicit synthetic role order and room inputs. These do not select a production
// randomness algorithm, initial placement policy or optional-power configuration.
const roles = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
function input(playerCount = 7) {
  const roleOrder = [...roles, ...(playerCount >= 8 ? ['Red Disabler'] : []), ...(playerCount === 9 ? ['Officer'] : [])];
  return {
    playerCount, roleOrder, codeExtraSeatIds: ['seat-1', 'seat-3', 'seat-6'],
    initialRooms: Object.fromEntries(roleOrder.map((_, index) => [`seat-${index + 1}`, index % 2 === 0 ? 'Room A' : 'Room B'])),
  };
}

for (const [playerCount, expectedFactions] of [[7, { Blue: 4, Red: 2, Alien: 1 }], [8, { Blue: 4, Red: 3, Alien: 1 }], [9, { Blue: 5, Red: 3, Alien: 1 }]]) {
  test(`confirmed ${playerCount}-seat roster preserves distinct roles, factions and explicit placement`, () => {
    const source = input(playerCount);
    const saved = structuredClone(source);
    const { seats } = buildRoster(source);
    assert.deepEqual(source, saved);
    assert.equal(seats.length, playerCount);
    assert.equal(new Set(seats.map(seat => seat.role)).size, playerCount);
    assert.deepEqual(Object.fromEntries(Object.keys(expectedFactions).map(faction => [faction, seats.filter(seat => seat.faction === faction).length])), expectedFactions);
    assert.equal(seats.some(seat => seat.role === 'Officer'), playerCount === 9);
    for (const seat of seats) {
      assert.equal(seat.location, source.initialRooms[seat.seatId]);
      assert.equal(seat.lastRoom, source.initialRooms[seat.seatId]);
      assert.equal(seat.health, 'Healthy');
      assert.equal(seat.captain, false);
      assert.equal(seat.jailed, false);
      assert.equal(seat.protection, null);
      assert.equal(seat.specialShotAvailable, false);
    }
  });
}

test('initial knowledge exposes only the source-defined facts to its owning role', () => {
  const { seats, code } = buildRoster(input(9));
  const get = role => seats.find(seat => seat.role === role);
  assert.deepEqual(get('Insider').knowledge.insiderCandidates, ['seat-2', 'seat-5', 'seat-7']);
  assert.equal(get('Insider').knowledge.undercoverSeatId, null);
  assert.deepEqual(get('Insider').knowledge.code, []);
  assert.equal(get('Hacker').knowledge.undercoverSeatId, 'seat-5');
  assert.deepEqual(get('Hacker').knowledge.insiderCandidates, []);
  assert.deepEqual(get('Hacker').knowledge.code, []);
  assert.deepEqual(get('Alien').knowledge.code, code);
  for (const seat of seats.filter(seat => !['Insider', 'Hacker', 'Alien'].includes(seat.role))) {
    assert.deepEqual(seat.knowledge, { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [] });
  }
  // Private knowledge contains neutral seat numbers, no labeled Insider role mapping
  // or mutual Red faction roster. The full seats array itself is server-only.
  assert.equal(get('Insider').knowledge.insiderCandidates.some(candidate => typeof candidate !== 'string'), false);
});

test('Code is a four-number unordered set, always includes Alien and excludes Undercover', () => {
  const first = input(7);
  const second = input(7);
  second.codeExtraSeatIds.reverse();
  assert.deepEqual(buildRoster(first).code, buildRoster(second).code);
  const { seats, code } = buildRoster(first);
  assert.equal(code.length, 4);
  assert.equal(new Set(code).size, 4);
  assert.equal(code.includes(seats.find(seat => seat.role === 'Alien').seatId), true);
  assert.equal(code.includes(seats.find(seat => seat.role === 'Undercover').seatId), false);
  const reordered = input(7);
  reordered.roleOrder.reverse();
  reordered.codeExtraSeatIds = ['seat-2', 'seat-4', 'seat-7'];
  const moved = buildRoster(reordered);
  assert.equal(moved.code.includes('seat-1'), true);
  assert.equal(moved.code.includes('seat-3'), false);
});

test('resources initialize only confirmed starting grants; other weapons need an approved grant', () => {
  const { seats } = buildRoster(input(9));
  for (const seat of seats) {
    assert.equal(seat.ordinaryWeapons, ['Undercover', 'Officer'].includes(seat.role) ? 1 : 0);
    assert.equal(seat.rescuesRemaining, seat.role === 'Cracker' ? 2 : 0);
    assert.equal(seat.officerShotSpent, false);
    assert.equal(seat.hackUsed, false);
    assert.equal(seat.disablerSpent, false);
    assert.equal(seat.mainActionUsedRound, null);
    assert.equal(seat.scanUsedRound, null);
    assert.equal(seat.lifetimeProtectionReceived, false);
  }
  // Alien receives no initial grant; it can receive a later Supplier weapon.
});

test('canonical roster and Code validation reject malformed or unsupported deal inputs', () => {
  const mutations = [
    state => { state.playerCount = 6; },
    state => { state.roleOrder[0] = 'Officer'; },
    state => { state.roleOrder[0] = 'Cracker'; },
    state => { state.roleOrder.pop(); },
    state => { state.codeExtraSeatIds = ['seat-1', 'seat-1', 'seat-3']; },
    state => { state.codeExtraSeatIds = ['seat-1', 'seat-3', 'seat-7']; },
    state => { state.codeExtraSeatIds = ['seat-1', 'seat-3', 'seat-5']; },
    state => { state.codeExtraSeatIds = ['seat-1', 'seat-3', 'seat-9']; },
    state => { state.codeExtraSeatIds = ['seat-1', 'seat-3']; },
    state => { delete state.initialRooms['seat-2']; },
    state => { state.initialRooms['seat-2'] = 'Hospital'; },
    state => { state.initialRooms['seat-8'] = 'Room A'; },
  ];
  for (const mutate of mutations) {
    const source = input(7);
    mutate(source);
    assert.throws(() => buildRoster(source), Error);
  }
});

test('separate private knowledge arrays and return values cannot mutate other seats or inputs', () => {
  const source = input(7);
  const roster = buildRoster(source);
  roster.code[0] = 'seat-9';
  assert.deepEqual(roster.seats.find(seat => seat.role === 'Alien').knowledge.code, ['seat-1', 'seat-3', 'seat-6', 'seat-7']);
  roster.seats.find(seat => seat.role === 'Hacker').knowledge.scanResults.push({ round: 1, targetSeatId: 'seat-2', guess: 'Blue', matched: true, inCode: false });
  assert.deepEqual(roster.seats.find(seat => seat.role === 'Insider').knowledge.scanResults, []);
  assert.deepEqual(source.codeExtraSeatIds, ['seat-1', 'seat-3', 'seat-6']);
});
