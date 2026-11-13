import type { FoodTaskPlayerView, FoodTaskPublicView, PlanetLocation, SeatId } from '@mothership/contracts';

export const FOOD_INITIAL_DOSES = 10;
export const FOOD_DELIVERY_DOSES = 10;
export const FOOD_OWN_MEAL_LIMIT = 9;

export type FoodMeal = FoodTaskPlayerView['ownMeals'][number];
export type FoodOrdinaryTurnEnd = FoodTaskPublicView['turnEnds'][number];
export type FoodHealth = 'Healthy' | 'Injured' | 'Eliminated';

export interface FoodHungerRecord {
  readonly round: number;
  readonly seatId: SeatId;
  readonly completionId: string;
  readonly order: number;
}

/** Server-only, whole-world authority. Never publish this object or truncate its dedup evidence. */
export interface FoodWorldLedger {
  readonly matchId: string | null;
  readonly doses: number;
  readonly deliveredTaskIds: readonly string[];
  readonly turnEnds: readonly FoodOrdinaryTurnEnd[];
  readonly meals: readonly FoodMeal[];
  readonly hunger: readonly FoodHungerRecord[];
}

export interface FoodOrdinaryCompletionInput {
  readonly matchId: string;
  readonly round: number;
  readonly seatId: SeatId;
  readonly sourcePhaseId: string;
  /** Global neutral ordinary-completion order, not an action/private-event cursor. */
  readonly order: number;
  readonly endedAt: number;
  readonly placement: FoodMeal['placement'];
  readonly health: FoodHealth;
  readonly location: PlanetLocation | null;
}

export interface FoodOrdinaryCompletionResult {
  readonly ledger: FoodWorldLedger;
  /** Null only when the player was eliminated before an ordinary completion occurred. */
  readonly turnEnd: FoodOrdinaryTurnEnd | null;
  readonly meal: FoodMeal | null;
  readonly applied: boolean;
}

export interface FoodHungerSeat {
  readonly seatId: SeatId;
  readonly health: FoodHealth;
}

const locationSlots = {
  'Room A': ['A1', 'A2', 'A3', 'A4', 'A5'],
  'Room B': ['B1', 'B2', 'B3', 'B4', 'B5'],
  'Command Room': ['C1'], Hospital: ['H1', 'H2', 'H3', 'H4'], Jail: ['J1', 'J2', 'J3', 'J4', 'J5'],
} as const;
const turnEndKeys = ['id', 'round', 'seatId', 'sourcePhaseId', 'order', 'endedAt', 'placement'] as const;

function identifier(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw Error(`Invalid ${name}`);
}

function integer(value: unknown, min: number, max: number, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw Error(`Invalid ${name}`);
}

function roundNumber(value: unknown): asserts value is number {
  integer(value, 1, Number.MAX_SAFE_INTEGER - 2, 'round');
}

function seatId(value: unknown): asserts value is SeatId {
  if (typeof value !== 'string' || !/^seat-[1-9]$/.test(value)) throw Error('Invalid seatId');
}

function health(value: unknown): asserts value is FoodHealth {
  if (typeof value !== 'string' || !['Healthy', 'Injured', 'Eliminated'].includes(value)) throw Error('Invalid health');
}

function location(value: unknown): asserts value is PlanetLocation | null {
  if (value !== null && (typeof value !== 'string' || !Object.hasOwn(locationSlots, value))) throw Error('Invalid location');
}

/** Accept data that survives JSON serialization exactly; never invoke a getter or toJSON. */
function exactObject(value: unknown, keys: readonly string[], name: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null)) throw Error(`Invalid ${name} object`);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) throw Error(`Invalid ${name} keys`);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) throw Error(`Invalid ${name} data field`);
  }
}

function dataArray(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw Error(`Invalid ${name} array`);
  const own = Reflect.ownKeys(value);
  if (own.length !== value.length + 1 || own.some(key => typeof key !== 'string'
    || key !== 'length' && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) throw Error(`Invalid ${name} array keys`);
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !('value' in descriptor) || !descriptor.enumerable) throw Error(`Invalid ${name} array data`);
  }
}

function assertPlacement(value: unknown): asserts value is FoodMeal['placement'] {
  if (value === null) return;
  exactObject(value, ['location', 'slotId'], 'placement');
  location(value.location);
  if (value.location === null || typeof value.slotId !== 'string'
    || !(locationSlots[value.location] as readonly string[]).includes(value.slotId)) throw Error('Invalid placement slot');
}

function assertOrdinaryFields(value: Record<string, unknown>): void {
  identifier(value.id, 'completion id');
  roundNumber(value.round);
  seatId(value.seatId);
  identifier(value.sourcePhaseId, 'sourcePhaseId');
  integer(value.order, 1, Number.MAX_SAFE_INTEGER, 'completion order');
  integer(value.endedAt, 0, Number.MAX_SAFE_INTEGER, 'ordinary completion time');
  assertPlacement(value.placement);
  if (value.id !== `food-turn-${value.round}-${value.seatId}`) throw Error('Completion id must identify its round and seat');
}

function assertTurnEnd(value: unknown): asserts value is FoodOrdinaryTurnEnd {
  exactObject(value, turnEndKeys, 'ordinary completion');
  assertOrdinaryFields(value);
}

function assertMeal(value: unknown): asserts value is FoodMeal {
  exactObject(value, [...turnEndKeys, 'result', 'dosesConsumed'], 'meal');
  assertOrdinaryFields(value);
  if (typeof value.result !== 'string' || !['ATE', 'NO_DOSE', 'IN_HOSPITAL'].includes(value.result)) throw Error('Invalid meal result');
  integer(value.dosesConsumed, 0, 1, 'meal doses');
  if (value.dosesConsumed !== (value.result === 'ATE' ? 1 : 0)) throw Error('Meal result and doses disagree');
  const placement = value.placement as FoodMeal['placement'];
  if (placement !== null && (placement.location === 'Hospital') !== (value.result === 'IN_HOSPITAL')) throw Error('Meal result and Hospital placement disagree');
}

function samePlacement(left: FoodMeal['placement'], right: FoodMeal['placement']): boolean {
  return left === null || right === null ? left === right : left.location === right.location && left.slotId === right.slotId;
}

/**
 * Strict saved-authority/replay boundary. Complete internal evidence is required, unlike a bounded
 * player projection. The surrounding match must also compare a bound matchId with state.matchId.
 */
export function assertFoodWorldLedger(value: unknown): asserts value is FoodWorldLedger {
  exactObject(value, ['matchId', 'doses', 'deliveredTaskIds', 'turnEnds', 'meals', 'hunger'], 'food ledger');
  if (value.matchId !== null) identifier(value.matchId, 'matchId');
  integer(value.doses, 0, Number.MAX_SAFE_INTEGER, 'food doses');
  dataArray(value.deliveredTaskIds, 'delivery IDs');
  dataArray(value.turnEnds, 'ordinary completions');
  dataArray(value.meals, 'meals');
  dataArray(value.hunger, 'hunger');
  const deliveries = new Set<string>();
  for (const id of value.deliveredTaskIds) {
    identifier(id, 'taskId');
    if (deliveries.has(id)) throw Error('Delivery IDs must be unique');
    deliveries.add(id);
  }
  if ((value.matchId === null) !== (value.turnEnds.length === 0)) throw Error('Match binding requires occurred ordinary history');
  if (value.meals.length !== value.turnEnds.length) throw Error('Every ordinary completion requires exactly one retained meal');
  const ids = new Set<string>(), roundSeats = new Set<string>(), orders = new Set<number>();
  const missed: FoodMeal[] = [];
  let previous: FoodOrdinaryTurnEnd | undefined;
  let eaten = 0;
  for (let index = 0; index < value.turnEnds.length; index++) {
    const turn = value.turnEnds[index], meal = value.meals[index];
    assertTurnEnd(turn);
    assertMeal(meal);
    const roundSeat = `${turn.round}:${turn.seatId}`;
    if (ids.has(turn.id) || roundSeats.has(roundSeat) || orders.has(turn.order)) throw Error('Ordinary completion identities and orders must be unique');
    ids.add(turn.id); roundSeats.add(roundSeat); orders.add(turn.order);
    if (previous !== undefined && (turn.order <= previous.order || turn.endedAt < previous.endedAt || turn.round < previous.round)) {
      throw Error('Retained ordinary history must preserve order, time and round');
    }
    if (meal.id !== turn.id || meal.round !== turn.round || meal.seatId !== turn.seatId
      || meal.sourcePhaseId !== turn.sourcePhaseId || meal.order !== turn.order || meal.endedAt !== turn.endedAt
      || !samePlacement(meal.placement, turn.placement)) throw Error('Meal must match its whole ordinary completion row');
    if (meal.result === 'ATE') eaten++;
    else if (meal.result === 'NO_DOSE') {
      // Deliveries add whole tens. Without delivery timestamps, this is the strongest prefix
      // exhaustion invariant: an empty stock can only follow 10, 20, 30, ... consumed doses.
      if (eaten < FOOD_INITIAL_DOSES || (eaten - FOOD_INITIAL_DOSES) % FOOD_DELIVERY_DOSES !== 0) {
        throw Error('Missed dose is impossible before available food is exhausted');
      }
      missed.push(meal);
    }
    previous = turn;
  }
  if (value.hunger.length !== missed.length) throw Error('Every missed dose requires exactly one retained hunger record');
  for (let index = 0; index < value.hunger.length; index++) {
    const hunger = value.hunger[index], meal = missed[index]!;
    exactObject(hunger, ['round', 'seatId', 'completionId', 'order'], 'hunger record');
    roundNumber(hunger.round); seatId(hunger.seatId); identifier(hunger.completionId, 'hunger completion id');
    integer(hunger.order, 1, Number.MAX_SAFE_INTEGER, 'hunger order');
    if (hunger.round !== meal.round || hunger.seatId !== meal.seatId || hunger.completionId !== meal.id || hunger.order !== meal.order) {
      throw Error('Hunger must match its missed meal in retained order');
    }
  }
  const expectedDoses = FOOD_INITIAL_DOSES + FOOD_DELIVERY_DOSES * deliveries.size - eaten;
  integer(expectedDoses, 0, Number.MAX_SAFE_INTEGER, 'accounted food doses');
  if (value.doses !== expectedDoses) throw Error('Food doses disagree with retained deliveries and meals');
}

function placementCopy(value: FoodMeal['placement']): FoodMeal['placement'] {
  return value === null ? null : { ...value };
}

function turnEndCopy(value: FoodOrdinaryTurnEnd): FoodOrdinaryTurnEnd {
  return { ...value, placement: placementCopy(value.placement) };
}

function mealCopy(value: FoodMeal): FoodMeal {
  return { ...value, placement: placementCopy(value.placement) };
}

function stock(ledger: FoodWorldLedger): void {
  integer(ledger.doses, 0, Number.MAX_SAFE_INTEGER, 'food doses');
}

function completionInput(value: FoodOrdinaryCompletionInput): void {
  identifier(value.matchId, 'matchId');
  roundNumber(value.round);
  seatId(value.seatId);
  identifier(value.sourcePhaseId, 'sourcePhaseId');
  integer(value.order, 1, Number.MAX_SAFE_INTEGER, 'completion order');
  integer(value.endedAt, 0, Number.MAX_SAFE_INTEGER, 'ordinary completion time');
  health(value.health);
  location(value.location);
  assertPlacement(value.placement);
  if (value.placement !== null && value.placement.location !== value.location) throw Error('Placement and location must agree');
}

export function createFoodWorldLedger(): FoodWorldLedger {
  return { matchId: null, doses: FOOD_INITIAL_DOSES, deliveredTaskIds: [], turnEnds: [], meals: [], hunger: [] };
}

/** Forks inherit the complete ledger, including costs and once-only evidence. */
export function copyFoodWorldLedger(ledger: FoodWorldLedger): FoodWorldLedger {
  stock(ledger);
  return {
    matchId: ledger.matchId, doses: ledger.doses, deliveredTaskIds: [...ledger.deliveredTaskIds],
    turnEnds: ledger.turnEnds.map(turnEndCopy), meals: ledger.meals.map(mealCopy),
    hunger: ledger.hunger.map(value => ({ ...value })),
  };
}

/** Call only for an authoritatively retained successful delivery, never a request or animation. */
export function addFoodDeliveryOnce(ledger: FoodWorldLedger, taskId: string): FoodWorldLedger {
  stock(ledger);
  identifier(taskId, 'taskId');
  if (ledger.deliveredTaskIds.includes(taskId)) return ledger;
  const doses = ledger.doses + FOOD_DELIVERY_DOSES;
  integer(doses, 0, Number.MAX_SAFE_INTEGER, 'food doses after delivery');
  return { ...copyFoodWorldLedger(ledger), doses, deliveredTaskIds: [...ledger.deliveredTaskIds, taskId] };
}

/**
 * Call exactly at the real ordinary-turn completion (Pass or timeout included), not a Hack end.
 * IDs are scoped by matchId and use round+seat, so maximum-length match/phase IDs need no truncation.
 * An existing round+seat always returns its occurred record, even after health/phase/time changes.
 */
export function finishFoodOrdinaryTurn(ledger: FoodWorldLedger, input: FoodOrdinaryCompletionInput): FoodOrdinaryCompletionResult {
  stock(ledger);
  completionInput(input);
  if (ledger.matchId !== null && ledger.matchId !== input.matchId) throw Error('Food ledger belongs to another match');

  const id = `food-turn-${input.round}-${input.seatId}`;
  const previous = ledger.turnEnds.find(value => value.id === id || value.round === input.round && value.seatId === input.seatId);
  if (previous !== undefined) {
    const meal = ledger.meals.find(value => value.id === previous.id);
    if (meal === undefined) throw Error('Ordinary completion is missing its retained meal');
    return { ledger, turnEnd: turnEndCopy(previous), meal: mealCopy(meal), applied: false };
  }

  // Eliminated seats are skipped; do not manufacture a turn end, meal, hunger record or match binding.
  if (input.health === 'Eliminated') return { ledger, turnEnd: null, meal: null, applied: false };

  const last = ledger.turnEnds.at(-1);
  if (last !== undefined && (input.order <= last.order || input.endedAt < last.endedAt || input.round < last.round)) {
    throw Error('Ordinary completions must follow recorded order, time and round');
  }
  const result: FoodMeal['result'] = input.location === 'Hospital' ? 'IN_HOSPITAL' : ledger.doses > 0 ? 'ATE' : 'NO_DOSE';
  const dosesConsumed = result === 'ATE' ? 1 : 0;
  const turnEnd: FoodOrdinaryTurnEnd = {
    id, round: input.round, seatId: input.seatId, sourcePhaseId: input.sourcePhaseId,
    order: input.order, endedAt: input.endedAt, placement: placementCopy(input.placement),
  };
  const meal: FoodMeal = { ...turnEndCopy(turnEnd), result, dosesConsumed };
  const next = copyFoodWorldLedger(ledger);
  return {
    ledger: {
      ...next, matchId: input.matchId, doses: ledger.doses - dosesConsumed,
      turnEnds: [...next.turnEnds, turnEndCopy(turnEnd)], meals: [...next.meals, mealCopy(meal)],
      hunger: result === 'NO_DOSE' ? [...next.hunger, {
        round: input.round, seatId: input.seatId, completionId: id, order: input.order,
      }] : next.hunger,
    },
    turnEnd, meal, applied: true,
  };
}

/** Bounded private projection only. Internal meals/turnEnds/hunger/delivery IDs remain retained. */
export function ownFoodMeals(ledger: FoodWorldLedger, ownSeatId: SeatId): FoodMeal[] {
  seatId(ownSeatId);
  return ledger.meals.filter(value => value.seatId === ownSeatId).slice(-FOOD_OWN_MEAL_LIMIT).map(mealCopy);
}

/**
 * Select after Sync and retained attacks/actions, immediately before Rescue. This does no damage.
 * The existing one-time round resolver owns injury episodes, beds and deadlines. It must exclude
 * newly hunger-injured seats from this round's Rescue, without disturbing prior valid Rescue.
 */
export function hungerCandidates(
  ledger: FoodWorldLedger,
  round: number,
  currentSeats: readonly FoodHungerSeat[],
  recordedTurnOrder: readonly SeatId[],
): SeatId[] {
  roundNumber(round);
  const seats = new Map<SeatId, FoodHungerSeat>();
  for (const value of currentSeats) {
    seatId(value.seatId);
    health(value.health);
    if (seats.has(value.seatId)) throw Error('Current seats must be distinct');
    seats.set(value.seatId, value);
  }
  const order = new Map<SeatId, number>();
  for (const [index, value] of recordedTurnOrder.entries()) {
    seatId(value);
    if (order.has(value)) throw Error('Recorded turn order must be distinct');
    order.set(value, index);
  }
  let previousOrder = -1;
  for (const value of ledger.turnEnds.filter(value => value.round === round)) {
    const index = order.get(value.seatId);
    if (index === undefined || index <= previousOrder) throw Error('Retained completions disagree with recorded turn order');
    previousOrder = index;
  }
  const hungry = new Set<SeatId>();
  for (const value of ledger.hunger.filter(value => value.round === round)) {
    const completion = ledger.turnEnds.find(turn => turn.id === value.completionId);
    const meal = ledger.meals.find(meal => meal.id === value.completionId);
    if (completion === undefined || completion.round !== round || completion.seatId !== value.seatId || completion.order !== value.order
      || meal?.result !== 'NO_DOSE' || meal.round !== round || meal.seatId !== value.seatId || meal.order !== value.order
      || !order.has(value.seatId) || !seats.has(value.seatId)) {
      throw Error('Hunger requires retained ordinary completion, missed meal and current seat');
    }
    hungry.add(value.seatId);
  }
  return recordedTurnOrder.filter(value => hungry.has(value) && seats.get(value)?.health === 'Healthy');
}
