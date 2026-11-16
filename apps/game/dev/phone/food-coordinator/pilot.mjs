globalThis[Symbol.for('mothership:dev-only')]=true;

import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

// The Backend experiment owns seeding, Firestore, engine and owner scheduling.
// This starts its unchanged driver once the operator has opened the two pages.
export async function prepareFoodTrial({onEvent}) {
  const backend = process.env.GAMEN_FOOD_COORDINATOR_BACKEND;
  if (!backend) throw Error('Set GAMEN_FOOD_COORDINATOR_BACKEND to the reviewed Backend worktree');
  const path = name => pathToFileURL(resolve(backend, 'services/game-api/dev/food-task-coordinator', name)).href;
  const [{createLoopbackFoodStore}, {createFoodTaskCoordinator}, {seedTwoHumanTask}, {startFoodTaskOwner}] =
    await Promise.all(['firestore.mjs', 'coordinator.mjs', 'fixture.mjs', 'drive.mjs'].map(name => import(path(name))));
  const store = createLoopbackFoodStore();
  try {
    const assetManifestVersion = 'design-0.9.0';
    const seed = await seedTwoHumanTask(store, 7, {assetManifestVersion});
    const {session, task} = seed, startAt = task.options.startedAt;
    if (session.state.versions.assetManifestVersion !== assetManifestVersion) {
      throw Error('Backend pilot fixture must create its normal session with the approved Food art pin');
    }
    let openedAt = null, driver = null;
    const serverNow = () => openedAt === null ? startAt : startAt + Math.floor(performance.now() - openedAt);
    const coordinator = createFoodTaskCoordinator({store, clock: serverNow, onEvent});
    const taskId = await coordinator.openTask({session});
    const identities = session.members.map(({seatId, characterId, displayName}) => ({seatId, characterId, displayName}));
    const actors = [
      {label: 'winch', uid: seed.winch, seatId: task.options.winchSeatId},
      {label: 'panel', uid: seed.panel, seatId: task.options.panelSeatId},
    ].map(actor => ({...actor, identities, arm: 'push', matchId: session.state.matchId}));
    return {coordinator, taskId, actors, serverNow,
      async startTrial() {
        if (openedAt !== null) return;
        openedAt = performance.now();
        driver = startFoodTaskOwner({coordinator, taskId, clock: serverNow, failed: () => console.error('Food Task owner stopped')});
        await driver;
      },
      async close() {
        try { if (driver) await (await driver).stop(); } finally { await store.close(); }
      },
    };
  } catch (error) {
    await store.close();
    throw error;
  }
}
