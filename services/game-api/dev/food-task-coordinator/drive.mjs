import {randomUUID} from 'node:crypto';

/** One local owner loop. Durable inputs and due times survive stopping it. */
export async function startFoodTaskOwner({coordinator, taskId, clock = Date.now, ownerId = randomUUID(), failed = () => {}}) {
  let owner = await coordinator.acquire(taskId, ownerId);
  if (!owner) throw new Error('Another Food Task owner is live');
  let active = true, queued = false, busy = null, timer, unwatch;
  function stop() {
    active = false;
    clearTimeout(timer);
    unwatch?.();
    return busy ?? Promise.resolve();
  }
  function error(reason) {
    void stop();
    failed(reason);
  }
  const wake = () => {
    if (!active) return;
    queued = true;
    if (busy) return;
    clearTimeout(timer);
    busy = (async () => {
      let nextAt = null;
      do {
        queued = false;
        const at = clock();
        if (owner.expiresAt - at <= 3000) {
          owner = await coordinator.acquire(taskId, ownerId);
          if (!owner) throw new Error('Food Task ownership was lost');
        }
        ({nextAt} = await coordinator.runDue(taskId, owner));
      } while (active && queued);
      if (active && nextAt !== null) timer = setTimeout(wake, Math.max(0, Math.min(nextAt, owner.expiresAt - 3000) - clock()));
    })().catch(error).finally(() => { busy = null; if (queued) wake(); });
  };
  unwatch = coordinator.wakeOnAdmission(taskId, wake, error);
  wake();
  return {owner: () => owner, stop};
}
