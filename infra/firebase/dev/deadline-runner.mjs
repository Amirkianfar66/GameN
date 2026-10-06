// Development only: no SDK initialization, production export or network listener.
const identifier = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const controlPath = /^matches\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})\/control\/session$/;
const hosts = {
  FIRESTORE_EMULATOR_HOST: ['', 8180], FIREBASE_FIRESTORE_EMULATOR_ADDRESS: ['', 8180],
  FIREBASE_AUTH_EMULATOR_HOST: ['', 9199], FUNCTIONS_EMULATOR_HOST: ['', 5101],
  MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: ['', 5101], CLOUD_TASKS_EMULATOR_HOST: ['', 9499],
  CLOUD_EVENTARC_EMULATOR_HOST: ['http://', 9299], FIREBASE_EMULATOR_HUB: ['', 4500],
  FIREBASE_LOGGING_EMULATOR_HOST: ['', 4600],
};
export function assertLocalDeadlineEnvironment(environment) {
  const fail = () => { throw new Error('Local deadlines require the loopback demo-mothership emulators'); };
  let firebaseProject;
  if (environment.FIREBASE_CONFIG !== undefined) {
    let config;
    try { config = JSON.parse(environment.FIREBASE_CONFIG); } catch { fail(); }
    if (!config || typeof config !== 'object' || Array.isArray(config)) fail();
    firebaseProject = config.projectId;
    if (firebaseProject !== undefined && firebaseProject !== 'demo-mothership') fail();
  }
  const projects = [environment.GCLOUD_PROJECT, environment.GCP_PROJECT, firebaseProject].filter(value => value !== undefined);
  if (projects.length === 0 || projects.some(value => value !== 'demo-mothership')
      || environment.FIRESTORE_EMULATOR_HOST === undefined
      || environment.GOOGLE_APPLICATION_CREDENTIALS !== undefined
      || environment.K_SERVICE !== undefined
      || (environment.FUNCTION_TARGET !== undefined || environment.FUNCTION_NAME !== undefined) && environment.FUNCTIONS_EMULATOR !== 'true') fail();
  for (const key of Object.keys(environment).filter(key => key.includes('EMULATOR') && environment[key] !== undefined)) {
    if (key === 'FUNCTIONS_EMULATOR') { if (environment[key] !== 'true') fail(); continue; }
    const expected = hosts[key];
    if (!expected) fail();
    const value = environment[key];
    if (typeof value !== 'string' || !value.startsWith(expected[0])) fail();
    const match = value.slice(expected[0].length).match(/^(?:127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$/);
    if (!match || Number(match[1]) !== expected[1]) fail();
  }
  return Object.freeze({ projectId: 'demo-mothership' });
}

// Root match documents need not exist. Controls identify live matches; old outbox
// history and dispatch status never decide whether a current phase is due.
export function createFirestoreDeadlineReader(db, documentIdField) {
  return async ({ limit, cursor }) => {
    let query = db.collectionGroup('control').where('protocolVersion', '==', 2)
      .where('status', '==', 'running').orderBy(documentIdField).limit(limit);
    if (cursor !== null) query = query.startAfter(db.doc(cursor));
    const page = await query.get();
    const controls = page.docs.filter(doc => controlPath.test(doc.ref.path));
    const states = controls.length === 0 ? [] : await db.getAll(...controls.map(doc => db.doc(doc.ref.path.replace(/control\/session$/, 'engine/current'))));
    return {
      entries: controls.map((doc, index) => ({ path: doc.ref.path, state: states[index].data() })),
      scanned: page.size,
      nextCursor: page.size === limit ? page.docs.at(-1).ref.path : null,
    };
  };
}

export function createLocalDeadlineRunner({ readPage, runDeadline, clock = Date.now, pageSize = 50, pollMs = 1_000,
  scheduler = { setTimeout, clearTimeout }, report = () => {} }) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100
      || !Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) throw new Error('Invalid local runner bounds');
  let cursor = null, inFlight = null, timer = null, stopped = true, generation = 0;
  async function evaluate() {
    const counts = { scanned: 0, due: 0, advanced: 0, unchanged: 0, failed: 0, skipped: 0 };
    try {
      const page = await readPage({ limit: pageSize, cursor });
      if (!page || !Array.isArray(page.entries) || page.entries.length > pageSize
          || !Number.isSafeInteger(page.scanned) || page.scanned < page.entries.length || page.scanned > pageSize
          || !(page.nextCursor === null || typeof page.nextCursor === 'string')) throw new Error('Invalid local page');
      counts.scanned = page.scanned;
      for (const entry of page.entries) {
        const match = typeof entry?.path === 'string' ? entry.path.match(controlPath) : null;
        const state = entry?.state, phase = state?.phase;
        if (!match || state?.matchId !== match[1] || state?.versions?.protocolVersion !== 2
            || !phase || typeof phase.id !== 'string' || !identifier.test(phase.id)
            || typeof state.deadlineToken !== 'string' || !identifier.test(state.deadlineToken)
            || !Number.isSafeInteger(phase.endsAt) || phase.endsAt < 0
            || ['FINISHED', 'ABORTED'].includes(phase.kind)) { counts.skipped++; continue; }
        const now = clock();
        if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid local clock');
        if (phase.endsAt > now) continue;
        counts.due++;
        const payload = { matchId: match[1], phaseId: phase.id, deadlineToken: state.deadlineToken };
        try {
          const response = await runDeadline(payload);
          if (response?.protocolVersion === 2 && response.matchId === payload.matchId && response.phaseId === payload.phaseId
              && ['advanced', 'unchanged'].includes(response.result)) counts[response.result]++;
          else counts.failed++;
        } catch { counts.failed++; }
      }
      cursor = page.nextCursor;
    } catch { counts.failed++; } // Retain the page cursor for a failed read; retry next tick.
    const result = Object.freeze(counts);
    try { report(result); } catch { /* Diagnostic failure must not stop deadline evaluation. */ }
    return result;
  }
  function tick() {
    if (inFlight === null) inFlight = evaluate().finally(() => { inFlight = null; });
    return inFlight;
  }
  async function poll(epoch) {
    await tick();
    if (!stopped && epoch === generation) timer = scheduler.setTimeout(() => { timer = null; void poll(epoch); }, pollMs);
  }
  return {
    tick,
    start() { if (stopped) { stopped = false; void poll(++generation); } },
    async stop() { stopped = true; generation++; if (timer !== null) scheduler.clearTimeout(timer); timer = null; await inFlight; },
  };
}
