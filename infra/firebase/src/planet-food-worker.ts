import {createHash} from 'node:crypto';
import {IdentifierSchema, TimestampSchema} from '@mothership/contracts';
import {PLANET_FOOD_INBOX_VERSION} from '@mothership/game-api';
import type {PlanetFoodInboxWake} from '@mothership/game-api';

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

/** Private outbox payload, never a browser command or an owner credential. */
export function isPlanetFoodInboxWake(value: unknown): value is PlanetFoodInboxWake {
  if (!exactKeys(value, ['kind', 'id', 'scope', 'wakeAt']) || value['kind'] !== 'food-inbox'
    || !IdentifierSchema.safeParse(value['id']).success || !TimestampSchema.safeParse(value['wakeAt']).success
    || !Number.isFinite(new Date(value['wakeAt'] as number).getTime())) return false;
  const scope = value['scope'];
  return exactKeys(scope, ['version', 'matchId', 'phaseId', 'taskId'])
    && scope['version'] === PLANET_FOOD_INBOX_VERSION
    && ['matchId', 'phaseId', 'taskId'].every(key => IdentifierSchema.safeParse(scope[key]).success);
}

/** Stable across retries and object-key order; a different wake gets a different task. */
export function planetFoodInboxQueueId(wake: PlanetFoodInboxWake): string {
  if (!isPlanetFoodInboxWake(wake)) throw new Error('Invalid private Food wake');
  return 'food-inbox-' + createHash('sha256').update(JSON.stringify([
    wake.kind, wake.scope.version, wake.scope.matchId, wake.scope.phaseId, wake.scope.taskId, wake.id, wake.wakeAt,
  ])).digest('hex');
}

export function createPlanetFoodInboxEnqueuer(queue: {
  enqueue(payload: PlanetFoodInboxWake, options: {id: string; scheduleTime: Date}): Promise<void>;
}) {
  return async (wake: PlanetFoodInboxWake): Promise<void> => {
    const id = planetFoodInboxQueueId(wake);
    // Copy only validated fields, so a caller cannot mutate a queued intent.
    const payload: PlanetFoodInboxWake = {kind: wake.kind, id: wake.id, scope: {...wake.scope}, wakeAt: wake.wakeAt};
    try { await queue.enqueue(payload, {id, scheduleTime: new Date(payload.wakeAt)}); }
    catch (error) {
      if (error === null || typeof error !== 'object' || !('code' in error)
        || !['functions/task-already-exists', 'ALREADY_EXISTS', 6].includes(error.code as string | number)) throw error;
    }
  };
}

/** Resolves only after bounded work finishes or its continuation is durable. */
export function createPlanetFoodInboxHandler(service: {
  runFoodInbox(wake: PlanetFoodInboxWake): Promise<void>;
}) {
  return async (payload: unknown): Promise<void> => {
    if (!isPlanetFoodInboxWake(payload)) throw new Error('Invalid private Food wake');
    try { await service.runFoodInbox(payload); }
    catch { throw new Error('Planet Food worker unavailable'); }
  };
}
