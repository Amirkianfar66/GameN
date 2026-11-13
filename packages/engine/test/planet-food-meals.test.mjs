import assert from 'node:assert/strict';
import test from 'node:test';
import { FoodTaskMealSchema, FoodTaskTurnEndSchema } from '@mothership/contracts';
import {
  addFoodDeliveryOnce, assertFoodWorldLedger, copyFoodWorldLedger, createFoodWorldLedger,
  finishFoodOrdinaryTurn, hungerCandidates, ownFoodMeals,
} from '../dist/planet-game/food-meals.js';

const roster = count => Array.from({ length: count }, (_, index) => `seat-${index + 1}`);
const physical = count => roster(count).map(seatId => ({ seatId, health: 'Healthy',
  rescueDueAfterRound: null, protection: { consumed: false }, clone: { active: true } }));
const placement = seatId => {
  const number = Number(seatId.slice(5));
  return number <= 5 ? { location: 'Room A', slotId: `A${number}` }
    : { location: 'Room B', slotId: `B${number - 5}` };
};
const completion = (round, seatId, order, overrides = {}) => ({
  matchId: 'meal-test-match', round, seatId, sourcePhaseId: `ordinary-${round}-${seatId}`,
  order, endedAt: 1000 + order, health: 'Healthy', location: placement(seatId).location,
  placement: placement(seatId), ...overrides,
});
function roundOf(ledger, count, round, { order = roster(count), forSeat = () => ({}) } = {}) {
  const results = [];
  let nextOrder = (ledger.turnEnds.at(-1)?.order ?? 0) + 1;
  for (const seatId of order) {
    const result = finishFoodOrdinaryTurn(ledger, completion(round, seatId, nextOrder++, forSeat(seatId)));
    ledger = result.ledger;
    results.push(result);
  }
  return { ledger, results };
}
function emptyStock(count) {
  let ledger = createFoodWorldLedger();
  ledger = roundOf(ledger, count, 1).ledger;
  return roundOf(ledger, count, 2).ledger;
}
function freeze(value) {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

test('new ledgers own ten integer doses and have independent evidence arrays', () => {
  const first = createFoodWorldLedger();
  const second = createFoodWorldLedger();
  assert.deepEqual(first, { matchId: null, doses: 10, deliveredTaskIds: [], turnEnds: [], meals: [], hunger: [] });
  assert.notEqual(first.meals, second.meals);
  assert.notEqual(first.hunger, second.hunger);
});

for (const count of [7, 8, 9]) {
  test(`${count} players: ordinary Pass/timeout seam drains in occurred order and retries never charge twice`, () => {
    let ledger = createFoodWorldLedger();
    const original = structuredClone(ledger);
    for (const round of [1, 2]) {
      for (const seatId of roster(count)) {
        // Pass and timeout share this exact ordinary-completion seam; neither is a Hack completion.
        const input = completion(round, seatId, ledger.turnEnds.length + 1);
        const before = structuredClone(ledger);
        const result = finishFoodOrdinaryTurn(freeze(ledger), input);
        assert.equal(result.applied, true);
        assert.equal(result.meal.id, result.turnEnd.id);
        FoodTaskMealSchema.parse(result.meal);
        FoodTaskTurnEndSchema.parse(result.turnEnd);
        assert.deepEqual(ledger, before);
        ledger = result.ledger;
        const after = structuredClone(ledger);
        const retry = finishFoodOrdinaryTurn(freeze(ledger), {
          ...input, order: 9000, sourcePhaseId: 'late-retry-phase', endedAt: 90000,
          health: 'Eliminated', location: null, placement: null,
        });
        assert.equal(retry.applied, false);
        assert.deepEqual(retry.meal, result.meal);
        assert.deepEqual(retry.turnEnd, result.turnEnd);
        assert.deepEqual(retry.ledger, after);
      }
    }
    assert.deepEqual(original, createFoodWorldLedger());
    assert.equal(ledger.doses, 0);
    assert.equal(ledger.meals.filter(meal => meal.result === 'ATE').length, 10);
    assert.equal(ledger.meals.filter(meal => meal.result === 'NO_DOSE').length, 2 * count - 10);
    assert.deepEqual(hungerCandidates(ledger, 2, physical(count), roster(count)), roster(count).slice(10 - count));
    assert.equal(ledger.turnEnds.length, 2 * count);
  });

  test(`${count} players: last doses go to recorded ordinary completion order, including gaps in global order`, () => {
    let ledger = roundOf(createFoodWorldLedger(), count, 1).ledger;
    const order = [...roster(count)].reverse();
    const available = ledger.doses;
    const results = [];
    for (const [index, seatId] of order.entries()) {
      const result = finishFoodOrdinaryTurn(ledger, completion(2, seatId, 100 + index * 3));
      ledger = result.ledger;
      results.push(result.meal);
    }
    assert.deepEqual(results.filter(meal => meal.result === 'ATE').map(meal => meal.seatId), order.slice(0, available));
    assert.deepEqual(hungerCandidates(ledger, 2, physical(count), order), order.slice(available));
    assert.throws(() => hungerCandidates(ledger, 2, physical(count), roster(count)), /recorded turn order/);
  });

  test(`${count} players: living Hospital patients consume zero, Jail prisoners eat or become hungry`, () => {
    const pass = roundOf(createFoodWorldLedger(), count, 1, { forSeat: seatId =>
      seatId === 'seat-1' ? { location: 'Hospital', placement: { location: 'Hospital', slotId: 'H1' } }
        : seatId === 'seat-2' ? { health: 'Injured', location: 'Hospital', placement: { location: 'Hospital', slotId: 'H2' } }
          : seatId === 'seat-3' ? { location: 'Jail', placement: { location: 'Jail', slotId: 'J1' } } : {} });
    assert.equal(pass.ledger.doses, 10 - (count - 2));
    assert.deepEqual(pass.results.slice(0, 2).map(result => [result.meal.result, result.meal.dosesConsumed]),
      [['IN_HOSPITAL', 0], ['IN_HOSPITAL', 0]]);
    assert.equal(pass.results[2].meal.result, 'ATE');
    assert.equal(pass.results[2].meal.placement.location, 'Jail');
    let hungry = emptyStock(count);
    const hospital = finishFoodOrdinaryTurn(hungry, completion(3, 'seat-1', 2 * count + 1,
      { health: 'Injured', location: 'Hospital', placement: { location: 'Hospital', slotId: 'H1' } }));
    hungry = hospital.ledger;
    const jail = finishFoodOrdinaryTurn(hungry, completion(3, 'seat-2', 2 * count + 2,
      { location: 'Jail', placement: { location: 'Jail', slotId: 'J1' } }));
    assert.equal(hospital.meal.result, 'IN_HOSPITAL');
    assert.equal(jail.meal.result, 'NO_DOSE');
    assert.deepEqual(hungerCandidates(jail.ledger, 3, physical(count), roster(count)), ['seat-2']);
  });

  test(`${count} players: eliminated seats have no fabricated ordinary completion, meal or hunger`, () => {
    const initial = freeze(createFoodWorldLedger());
    const skipped = finishFoodOrdinaryTurn(initial, completion(1, 'seat-1', 1,
      { health: 'Eliminated', location: null, placement: null }));
    assert.equal(skipped.applied, false);
    assert.equal(skipped.turnEnd, null);
    assert.equal(skipped.meal, null);
    assert.deepEqual(skipped.ledger, initial);
    const order = roster(count).filter(seatId => seatId !== 'seat-1');
    const result = roundOf(skipped.ledger, count, 1, { order });
    assert.equal(result.ledger.turnEnds.length, count - 1);
    assert.equal(result.ledger.doses, 10 - count + 1);
    assert.equal(result.ledger.hunger.length, 0);
  });

  test(`${count} players: fork deep copies inherited delivery/costs, Sync retains a whole selected ledger`, () => {
    let base = addFoodDeliveryOnce(createFoodWorldLedger(), 'task-inherited');
    base = roundOf(base, count, 1).ledger;
    base = roundOf(base, count, 2).ledger;
    const baseBefore = structuredClone(base);
    const a = roundOf(copyFoodWorldLedger(freeze(base)), count, 3).ledger;
    let b = roundOf(copyFoodWorldLedger(freeze(base)), count, 3, { forSeat: seatId => seatId === 'seat-1'
      ? { health: 'Injured', location: 'Hospital', placement: { location: 'Hospital', slotId: 'H1' } } : {} }).ledger;
    assert.deepEqual(base, baseBefore);
    assert.deepEqual(a.meals.slice(0, 2 * count), base.meals);
    assert.deepEqual(b.meals.slice(0, 2 * count), base.meals);
    assert.equal(addFoodDeliveryOnce(a, 'task-inherited').doses, a.doses);
    assert.equal(addFoodDeliveryOnce(b, 'task-inherited').doses, b.doses);
    assert.equal(a.hunger.filter(value => value.round === 3).length - b.hunger.filter(value => value.round === 3).length, 1);
    b = addFoodDeliveryOnce(b, 'task-b-only');
    const worlds = { a, b };
    const selected = copyFoodWorldLedger(worlds.b);
    delete worlds.a;
    assert.deepEqual(selected, b);
    assert.equal(selected.doses, 10);
    assert.equal(a.doses, 0);
    assert.deepEqual(selected.deliveredTaskIds, ['task-inherited', 'task-b-only']);
    assert.equal(selected.meals.length, 3 * count);
    assert.equal(selected.meals.find(value => value.round === 3 && value.seatId === 'seat-1').result, 'IN_HOSPITAL');
    const copy = copyFoodWorldLedger(base);
    copy.meals[0].placement.slotId = 'A5';
    copy.turnEnds[0].placement.slotId = 'A5';
    copy.deliveredTaskIds.push('copy-only');
    assert.deepEqual(base, baseBefore);
  });

  test(`${count} players: own last-nine suffix never discards internal dedup or publishes another seat`, () => {
    let ledger = createFoodWorldLedger();
    for (let round = 1; round <= 12; round++) {
      ledger = addFoodDeliveryOnce(ledger, `task-${round}`);
      ledger = roundOf(ledger, count, round).ledger;
    }
    const before = structuredClone(ledger);
    const own = ownFoodMeals(ledger, 'seat-1');
    assert.equal(own.length, 9);
    assert.deepEqual(own.map(value => value.round), [4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(own.every(value => value.seatId === 'seat-1'), true);
    own.forEach(value => FoodTaskMealSchema.parse(value));
    own[0].placement.slotId = 'A5';
    const retry = finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 9999, { endedAt: 99999 }));
    assert.equal(retry.applied, false);
    assert.equal(retry.meal.round, 1);
    assert.equal(ledger.meals.length, 12 * count);
    assert.deepEqual(retry.ledger, before);
  });

  test(`${count} players: hunger uses health at retained resolution without changing medical episodes or defenses`, () => {
    const ledger = roundOf(emptyStock(count), count, 3).ledger;
    const seats = physical(count);
    seats[0].health = 'Injured';
    seats[0].rescueDueAfterRound = 4;
    seats[1].health = 'Eliminated';
    const before = structuredClone(seats);
    const candidates = hungerCandidates(freeze(ledger), 3, freeze(seats), roster(count));
    assert.deepEqual(candidates, roster(count).slice(2));
    assert.deepEqual(seats, before);
    // An existing injured episode receives no extra hit/deadline. A patient healed before this
    // resolution is Healthy now and can have a new hunger injury; this selector still applies none.
    const healed = structuredClone(seats);
    healed[0].health = 'Healthy';
    healed[0].rescueDueAfterRound = null;
    assert.deepEqual(hungerCandidates(ledger, 3, healed, roster(count)), ['seat-1', ...roster(count).slice(2)]);
    assert.equal(seats[0].rescueDueAfterRound, 4);
    assert.deepEqual(hungerCandidates(ledger, 4, healed, roster(count)), []);
    assert.equal(seats[2].protection.consumed, false);
    assert.equal(seats[2].clone.active, true);
  });
}

test('delivery adds exactly ten once per retained task and never mutates its input', () => {
  const original = freeze(createFoodWorldLedger());
  const delivered = addFoodDeliveryOnce(original, 'task-1');
  assert.equal(original.doses, 10);
  assert.equal(delivered.doses, 20);
  assert.deepEqual(delivered.deliveredTaskIds, ['task-1']);
  assert.deepEqual(addFoodDeliveryOnce(freeze(delivered), 'task-1'), delivered);
  const next = addFoodDeliveryOnce(delivered, 'task-2');
  assert.equal(next.doses, 30);
  assert.deepEqual(next.deliveredTaskIds, ['task-1', 'task-2']);
});

test('duplicate retained hunger is unique and no previous-round hunger is reapplied by selection', () => {
  const ledger = emptyStock(7);
  const duplicate = { ...ledger, hunger: [...ledger.hunger, ...ledger.hunger] };
  assert.deepEqual(hungerCandidates(duplicate, 2, physical(7), roster(7)), ['seat-4', 'seat-5', 'seat-6', 'seat-7']);
  assert.deepEqual(hungerCandidates(duplicate, 3, physical(7), roster(7)), []);
});

test('retained occurrence IDs remain valid with maximum-length match and phase IDs', () => {
  const result = finishFoodOrdinaryTurn(createFoodWorldLedger(), completion(Number.MAX_SAFE_INTEGER - 2, 'seat-9', 1,
    { matchId: 'm'.repeat(128), sourcePhaseId: 'p'.repeat(128) }));
  FoodTaskMealSchema.parse(result.meal);
  FoodTaskTurnEndSchema.parse(result.turnEnd);
  assert.equal(result.ledger.matchId, 'm'.repeat(128));
  assert.equal(result.meal.id, `food-turn-${Number.MAX_SAFE_INTEGER - 2}-seat-9`);
});

test('input placement cannot mutate retained evidence or another returned occurrence', () => {
  const input = completion(1, 'seat-1', 1);
  const result = finishFoodOrdinaryTurn(createFoodWorldLedger(), input);
  input.placement.slotId = 'A2';
  result.meal.placement.slotId = 'A3';
  result.turnEnd.placement.slotId = 'A4';
  assert.equal(result.ledger.meals[0].placement.slotId, 'A1');
  assert.equal(result.ledger.turnEnds[0].placement.slotId, 'A1');
});

test('nonfinite/unsafe/fractional values, mismatched placement and cross-match ledger use reject', () => {
  const ledger = createFoodWorldLedger();
  for (const bad of [NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1, { endedAt: bad })), /completion time/);
    assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1, { order: bad })), /completion order/);
    assert.throws(() => addFoodDeliveryOnce({ ...ledger, doses: bad }, 'task-1'), /food doses/);
  }
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(0, 'seat-1', 1)), /round/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 0)), /completion order/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1, { sourcePhaseId: 'bad phase' })), /sourcePhaseId/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1, { location: 'Jail' })), /[Pp]lacement/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1, { location: 'toString', placement: null })), /location/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1, { placement: { location: 'Room A', slotId: 'B1' } })), /[Pp]lacement/);
  const bound = finishFoodOrdinaryTurn(ledger, completion(1, 'seat-1', 1)).ledger;
  assert.throws(() => finishFoodOrdinaryTurn(bound, completion(1, 'seat-1', 1, { matchId: 'other-match' })), /another match/);
  assert.throws(() => addFoodDeliveryOnce({ ...ledger, doses: Number.MAX_SAFE_INTEGER - 9 }, 'task-1'), /after delivery/);
  assert.throws(() => addFoodDeliveryOnce(ledger, 'bad task'), /taskId/);
});

test('new completions reject reused order, backward time or round, without inventing a tie priority', () => {
  const ledger = finishFoodOrdinaryTurn(createFoodWorldLedger(), completion(2, 'seat-1', 20)).ledger;
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(2, 'seat-2', 20)), /recorded order/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(2, 'seat-2', 21, { endedAt: 1019 })), /recorded order/);
  assert.throws(() => finishFoodOrdinaryTurn(ledger, completion(1, 'seat-2', 21)), /recorded order/);
  const sameTime = finishFoodOrdinaryTurn(ledger, completion(2, 'seat-2', 23, { endedAt: 1020 }));
  assert.equal(sameTime.applied, true);
  assert.equal(sameTime.meal.order, 23);
});

test('hunger fails closed on missing evidence/current seat or contradictory recorded order', () => {
  const ledger = emptyStock(7);
  assert.throws(() => hungerCandidates(ledger, 2, physical(7), ['seat-1', 'seat-1']), /distinct/);
  assert.throws(() => hungerCandidates(ledger, 2, [...physical(7), physical(7)[0]], roster(7)), /distinct/);
  assert.throws(() => hungerCandidates(ledger, 2, physical(7).slice(0, 6), roster(7)), /current seat/);
  assert.throws(() => hungerCandidates({ ...ledger, meals: [] }, 2, physical(7), roster(7)), /missed meal/);
  assert.throws(() => hungerCandidates({ ...ledger, hunger: [{ ...ledger.hunger[0], order: 999 }] }, 2, physical(7), roster(7)), /retained ordinary/);
  assert.throws(() => hungerCandidates(ledger, 2, physical(7), roster(7).slice(1)), /recorded turn order/);
});

for (const count of [7, 8, 9]) {
  test(`${count} players: saved authority round-trips complete histories after branch selection and later delivery`, () => {
    let base = addFoodDeliveryOnce(createFoodWorldLedger(), 'task-before-first-meal');
    assert.doesNotThrow(() => assertFoodWorldLedger(base));
    for (const round of [1, 2, 3]) base = roundOf(base, count, round).ledger;
    const discarded = copyFoodWorldLedger(base);
    const selected = addFoodDeliveryOnce(copyFoodWorldLedger(base), 'task-selected-only');
    const saved = JSON.parse(JSON.stringify(selected));
    const before = JSON.stringify(saved);
    assert.doesNotThrow(() => assertFoodWorldLedger(freeze(saved)));
    assert.equal(JSON.stringify(saved), before);
    assert.equal(saved.meals.length, 3 * count);
    assert.equal(saved.turnEnds.length, 3 * count);
    assert.notDeepEqual(saved.deliveredTaskIds, discarded.deliveredTaskIds);
    assert.equal(saved.doses, 10);
    // Complete internal history remains valid even when the separately published own suffix is bounded.
    assert.equal(ownFoodMeals(saved, 'seat-1').length, 3);
  });
}

test('saved authority accepts initial, delivery-only and null-placement records without inventing a match binding', () => {
  assert.doesNotThrow(() => assertFoodWorldLedger(createFoodWorldLedger()));
  const deliveryOnly = addFoodDeliveryOnce(createFoodWorldLedger(), 'task-first');
  assert.equal(deliveryOnly.matchId, null);
  assert.doesNotThrow(() => assertFoodWorldLedger(deliveryOnly));
  const meal = finishFoodOrdinaryTurn(deliveryOnly, completion(1, 'seat-1', 1, { placement: null })).ledger;
  assert.doesNotThrow(() => assertFoodWorldLedger(meal));
  const hospital = finishFoodOrdinaryTurn(meal, completion(1, 'seat-2', 2,
    { health: 'Injured', location: 'Hospital', placement: null })).ledger;
  assert.doesNotThrow(() => assertFoodWorldLedger(hospital));
});

test('saved authority rejects stock changes, duplicated delivery and truncated dedup histories', () => {
  const ledger = emptyStock(9);
  const before = JSON.stringify(ledger);
  assert.throws(() => assertFoodWorldLedger({ ...ledger, doses: 1 }), /deliveries and meals/);
  assert.throws(() => assertFoodWorldLedger({ ...ledger, deliveredTaskIds: ['task-1', 'task-1'], doses: 20 }), /unique/);
  assert.throws(() => assertFoodWorldLedger({ ...ledger, meals: ledger.meals.slice(-9) }), /exactly one retained meal/);
  const truncated = { ...ledger, turnEnds: ledger.turnEnds.slice(-9), meals: ledger.meals.slice(-9) };
  assert.throws(() => assertFoodWorldLedger(truncated), /food is exhausted|accounted food doses|deliveries and meals/);
  assert.throws(() => assertFoodWorldLedger({ ...ledger, hunger: ledger.hunger.slice(1) }), /exactly one retained hunger/);
  assert.equal(JSON.stringify(ledger), before);
});

test('saved authority rejects unbound occurred history and bound empty history', () => {
  const ledger = emptyStock(7);
  assert.throws(() => assertFoodWorldLedger({ ...ledger, matchId: null }), /Match binding/);
  assert.throws(() => assertFoodWorldLedger({ ...createFoodWorldLedger(), matchId: 'meal-test-match' }), /Match binding/);
  for (const matchId of [undefined, '', 'bad match', 123, {}, 'm'.repeat(129)]) {
    assert.throws(() => assertFoodWorldLedger({ ...ledger, matchId }), /matchId/);
  }
});

test('saved authority rejects changed identity, duplicated occurrence and reused neutral order', () => {
  const ledger = emptyStock(7);
  const corrupt = edit => { const copy = structuredClone(ledger); edit(copy); return copy; };
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => {
    copy.turnEnds[1].id = copy.turnEnds[0].id;
    copy.meals[1].id = copy.meals[0].id;
  })), /identify its round and seat|unique/);
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => {
    copy.turnEnds[1] = structuredClone(copy.turnEnds[0]);
    copy.meals[1] = structuredClone(copy.meals[0]);
  })), /unique/);
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => {
    copy.turnEnds[1].order = copy.turnEnds[0].order;
    copy.meals[1].order = copy.meals[0].order;
  })), /unique/);
  for (const field of ['id', 'round', 'seatId', 'sourcePhaseId', 'order', 'endedAt', 'placement']) {
    const copy = structuredClone(ledger);
    copy.meals[0][field] = { id: 'food-turn-1-seat-2', round: 2, seatId: 'seat-2', sourcePhaseId: 'other-phase',
      order: 999, endedAt: 999, placement: { location: 'Room A', slotId: 'A2' } }[field];
    assert.throws(() => assertFoodWorldLedger(copy), /identify its round and seat|whole ordinary completion/);
  }
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => { copy.turnEnds[1].endedAt = 0; copy.meals[1].endedAt = 0; })), /preserve order/);
});

test('saved authority validates hunger as a complete ordered correlation to missed meals', () => {
  const ledger = emptyStock(8);
  const corrupt = edit => { const copy = structuredClone(ledger); edit(copy); return copy; };
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => { copy.hunger.push(structuredClone(copy.hunger[0])); })), /exactly one/);
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => { copy.hunger.reverse(); })), /retained order/);
  for (const patch of [{ completionId: 'other-completion' }, { round: 1 }, { seatId: 'seat-1' }, { order: 999 }]) {
    assert.throws(() => assertFoodWorldLedger(corrupt(copy => { Object.assign(copy.hunger[0], patch); })), /missed meal/);
  }
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => { copy.meals[0].dosesConsumed = 0; })), /result and doses/);
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => {
    copy.meals[0].result = 'IN_HOSPITAL'; copy.meals[0].dosesConsumed = 0;
  })), /Hospital placement/);
  assert.throws(() => assertFoodWorldLedger(corrupt(copy => { copy.meals[0].result = 'UNKNOWN'; })), /meal result/);
  // Even balanced final stock cannot legitimize a missed dose before the initial food was consumed.
  const impossible = finishFoodOrdinaryTurn(createFoodWorldLedger(), completion(1, 'seat-1', 1)).ledger;
  impossible.meals[0].result = 'NO_DOSE'; impossible.meals[0].dosesConsumed = 0;
  impossible.hunger.push({ round: 1, seatId: 'seat-1', completionId: impossible.meals[0].id, order: 1 });
  impossible.doses = 10;
  assert.throws(() => assertFoodWorldLedger(impossible), /food is exhausted/);
});

test('saved authority rejects nonfinite, fractional, unsafe and unknown seat/round identities', () => {
  const ledger = emptyStock(7);
  for (const bad of [NaN, Infinity, -Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, 10n, '0']) {
    assert.throws(() => assertFoodWorldLedger({ ...ledger, doses: bad }), /food doses/);
  }
  for (const field of ['round', 'order', 'endedAt']) {
    for (const bad of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const copy = structuredClone(ledger);
      copy.turnEnds[0][field] = bad;
      assert.throws(() => assertFoodWorldLedger(copy), /round|order|time/);
    }
  }
  for (const bad of ['seat-0', 'seat-10', 'seat-x', null, {}]) {
    const copy = structuredClone(ledger);
    copy.turnEnds[0].seatId = bad;
    assert.throws(() => assertFoodWorldLedger(copy), /seatId/);
  }
  assert.throws(() => assertFoodWorldLedger({ ...ledger, deliveredTaskIds: ['bad task'] }), /taskId/);
  const copy = structuredClone(ledger);
  copy.turnEnds[0].placement.slotId = 'B1';
  assert.throws(() => assertFoodWorldLedger(copy), /placement slot/);
});

test('saved authority rejects extra branch/secret fields at every nested level', () => {
  const ledger = emptyStock(7);
  for (const select of [copy => copy, copy => copy.turnEnds[0], copy => copy.meals[0],
    copy => copy.hunger[0], copy => copy.meals[0].placement]) {
    const copy = structuredClone(ledger);
    select(copy).worldId = 'hidden-world';
    assert.throws(() => assertFoodWorldLedger(copy), /keys/);
  }
  assert.throws(() => assertFoodWorldLedger({ ...ledger, ownMeals: [] }), /keys/);
  const copy = structuredClone(ledger);
  copy.meals[0].protection = { grantorSeatId: 'seat-2' };
  assert.throws(() => assertFoodWorldLedger(copy), /keys/);
});

test('saved authority accepts plain JSON data only and rejects accessors, symbols, sparse arrays and serialization hooks', () => {
  const ledger = emptyStock(7);
  let reads = 0;
  const getter = { ...ledger };
  Object.defineProperty(getter, 'doses', { enumerable: true, get() { reads++; return 0; } });
  assert.throws(() => assertFoodWorldLedger(getter), /data field/);
  assert.equal(reads, 0);
  const nonenumerable = { ...ledger };
  Object.defineProperty(nonenumerable, 'doses', { value: 0, enumerable: false });
  assert.throws(() => assertFoodWorldLedger(nonenumerable), /data field/);
  const symbol = { ...ledger, [Symbol('world')]: 'hidden' };
  assert.throws(() => assertFoodWorldLedger(symbol), /keys/);
  assert.throws(() => assertFoodWorldLedger(Object.assign(Object.create({ role: 'secret' }), ledger)), /object/);
  assert.throws(() => assertFoodWorldLedger({ ...ledger, toJSON() { return createFoodWorldLedger(); } }), /keys/);
  const sparse = structuredClone(ledger);
  delete sparse.turnEnds[0];
  assert.throws(() => assertFoodWorldLedger(sparse), /array keys|array data/);
  const extra = structuredClone(ledger);
  extra.meals.worldId = 'hidden-world';
  assert.throws(() => assertFoodWorldLedger(extra), /array keys/);
  const arrayGetter = structuredClone(ledger);
  Object.defineProperty(arrayGetter.meals, '0', { enumerable: true, get() { reads++; return ledger.meals[0]; } });
  assert.throws(() => assertFoodWorldLedger(arrayGetter), /array data/);
  assert.equal(reads, 0);
  for (const value of [null, [], 0, 'ledger', undefined, new Date()]) assert.throws(() => assertFoodWorldLedger(value), /object/);
});
