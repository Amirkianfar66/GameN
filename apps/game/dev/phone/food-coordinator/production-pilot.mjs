globalThis[Symbol.for('mothership:dev-only')]=true;

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const assetManifestVersion = 'design-0.9.0';
const engineProfile = 'food-task-1.4';

/** Run the production service and HTTP handlers with a private loopback queue. */
export async function prepareProductionFoodTrial({backend, backendSource, kind}) {
  const load = path => import(pathToFileURL(resolve(backend, path)).href);
  const [
    {createLoopbackFoodStore}, {seedTwoHumanTask}, {planetServiceHarness, ok}, {enterTimedPlanetBoarding},
    {PLANET_FOOD_OWNER_INBOX_PROFILE: foodAuthorityProfile, createProductionPlanetService},
    {createPlanetHttpHandler, createPlanetDeadlineHandler}, {createPlanetFoodInboxEnqueuer, createPlanetFoodInboxHandler},
  ] = await Promise.all([
    load('services/game-api/dev/food-task-coordinator/firestore.mjs'),
    load('services/game-api/dev/food-task-coordinator/fixture.mjs'),
    load('services/game-api/test/planet-service-helper.mjs'),
    load('services/game-api/test/planet-timed-reading-helper.mjs'),
    load('services/game-api/dist/index.js'),
    load('infra/firebase/dist/planet.js'),
    load('infra/firebase/dist/planet-food-worker.js'),
  ]);
  const store = createLoopbackFoodStore();
  const activity = {wakeEnqueues: 0, workerStarts: 0, workerFailures: 0, dispatchFailures: 0};
  const timers = new Set(), queued = new Set(), workers = new Set();
  let h, startAt, boarding, actors, clockStartedAt = null, pump = null, scanning = null, stopping = false;
  try {
    if (kind === 'invitations') {
      h = await planetServiceHarness({count: 7, humans: 7, store, assetManifestVersion, setupFlowVersion: 3,
        engineProfile, foodAuthorityProfile, sample: .2});
      ok(await h.approve(await h.admission(h.display, 'display', 'Table')));
      const {session} = await enterTimedPlanetBoarding(h);
      startAt = session.setup.endsAt;
      const {taskId: _outboxId, ...job} = await h.currentJob();
      boarding = job;
      actors = h.players.slice(0, 2).map((uid, index) => ({label: 'crew-' + (index + 1), uid,
        seatId: session.members.find(member => member.uid === uid).seatId}));
    } else {
      const seed = await seedTwoHumanTask(store, 7, {assetManifestVersion, foodAuthorityProfile});
      ({h} = seed);
      startAt = seed.task.options.startedAt;
      actors = [
        {label: 'winch', uid: seed.winch, seatId: seed.task.options.winchSeatId},
        {label: 'panel', uid: seed.panel, seatId: seed.task.options.panelSeatId},
      ];
    }
    assert.equal((await h.current()).foodAuthorityProfile, foodAuthorityProfile);
    const clock = () => startAt + (clockStartedAt === null ? 0 : Math.floor(performance.now() - clockStartedAt));
    const service = createProductionPlanetService({store, clock, assetManifestVersion, setupFlowVersion: 3, engineProfile, foodAuthorityProfile});
    const handleWake = createPlanetFoodInboxHandler(service);
    const enqueue = createPlanetFoodInboxEnqueuer({async enqueue(wake, {id, scheduleTime}) {
      if (queued.has(id)) return;
      queued.add(id);
      activity.wakeEnqueues++;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (stopping) return;
        activity.workerStarts++;
        const running = handleWake(wake).catch(() => { activity.workerFailures++; }).finally(() => workers.delete(running));
        workers.add(running);
      }, Math.max(0, scheduleTime.valueOf() - clock()));
      timers.add(timer);
    }});

    async function dispatch() {
      try {
        for (const path of await store.listKeys('foodInboxWake', 100)) {
          if (stopping) break;
          await service.dispatchFoodInboxWake(path.slice('foodInboxWake/'.length), enqueue);
        }
      } catch {
        activity.dispatchFailures++;
      }
    }
    function scan() {
      scanning = dispatch().finally(() => {
        if (!stopping) pump = setTimeout(scan, 100);
      });
    }
    return {
      actors: actors.map(actor => ({...actor, matchId: h.matchId, arm: 'production'})),
      variant: 'production-food-inbox', backendSource, activity,
      production: ({origin, ...verifiers}) => createPlanetHttpHandler({service, clock,
        configuration: {allowedOrigins: [origin], emulator: false}, ...verifiers}),
      async startTrial() {
        if (clockStartedAt !== null) return;
        if (boarding) await createPlanetDeadlineHandler(service)(boarding);
        clockStartedAt = performance.now();
        scan();
      },
      async close() {
        try {
          if (clockStartedAt !== null && workers.size) {
            const match = await h.current();
            if (match.state?.food?.step?.kind === 'AWAY')
              await service.handle(h.host, {operation: 'abort', matchId: h.matchId, requestId: randomUUID()});
          }
        } finally {
          stopping = true;
          clearTimeout(pump);
          for (const timer of timers) clearTimeout(timer);
          await Promise.allSettled([scanning, ...workers]);
          await store.close();
        }
      },
    };
  } catch (error) {
    await store.close();
    throw error;
  }
}
