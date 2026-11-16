globalThis[Symbol.for('mothership:dev-only')]=true;

import {performance} from 'node:perf_hooks';
import {loadReviewedFoodBackend, reviewedFoodBackend} from './backend.mjs';

// The ordinary-service trial stops at Join/briefing. It creates its own match
// and never transfers that running Task into the timed coordinator pilot.
export async function prepareFoodTrial() {
  const load = loadReviewedFoodBackend();
  const [{createLoopbackFoodStore}, {planetServiceHarness, ok}, {enterTimedPlanetBoarding}] = await Promise.all([
    load('dev/food-task-coordinator/firestore.mjs'),
    load('test/planet-service-helper.mjs'),
    load('test/planet-timed-reading-helper.mjs'),
  ]);
  const store = createLoopbackFoodStore();
  try {
    const h = await planetServiceHarness({count: 7, humans: 7, store, assetManifestVersion: 'design-0.9.0',
      setupFlowVersion: 3, engineProfile: 'food-task-1.4', sample: .2});
    const display = await h.admission(h.display, 'display', 'Table');
    ok(await h.approve(display));
    const {session} = await enterTimedPlanetBoarding(h);
    const job = await h.currentJob();
    const actors = h.players.slice(0, 2).map((uid, i) => ({
      label: 'crew-' + (i + 1), uid, matchId: h.matchId, arm: 'read',
      seatId: session.members.find(member => member.uid === uid).seatId,
    }));
    return {actors, variant: 'ordinary-invitations', backendSource: reviewedFoodBackend,
      baseline: (uid, request) => h.service.handle(uid, request),
      async startTrial() {
        const startedAt = session.setup.endsAt;
        h.setTime(startedAt);
        const result = await h.service.runDeadline(job);
        if (result.status !== 'advanced') throw Error('The ordinary service did not enter Food Supply');
        const origin = performance.now();
        h.reload({clock: () => startedAt + Math.floor(performance.now() - origin)});
      },
      close: () => store.close(),
    };
  } catch (error) {
    await store.close();
    throw error;
  }
}
