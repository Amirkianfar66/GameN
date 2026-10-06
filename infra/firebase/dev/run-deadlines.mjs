// Run after npm run build. This file is excluded from the Functions artifact.
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLocalDeadlineEnvironment, createFirestoreDeadlineReader, createLocalDeadlineRunner } from './deadline-runner.mjs';

async function loadLocalRuntime(configuration) {
  // Validate first, then load and initialize Admin; no credentials or cloud fallback.
  const [{ initializeApp, deleteApp }, { getFirestore, FieldPath }, { createV1Service }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/firestore'), import('@mothership/game-api'),
  ]);
  const app = initializeApp({ projectId: configuration.projectId }, `local-deadlines-${randomUUID()}`);
  const db = getFirestore(app);
  return { db, documentIdField: FieldPath.documentId(), service: createV1Service({ db }),
    async close() { await db.terminate(); await deleteApp(app); } };
}
export async function startLocalDeadlineCli({ environment = process.env, loadRuntime = loadLocalRuntime,
  report = counts => console.log(JSON.stringify({ localDeadlines: counts })) } = {}) {
  const configuration = assertLocalDeadlineEnvironment(environment);
  const runtime = await loadRuntime(configuration);
  const runner = createLocalDeadlineRunner({ readPage: createFirestoreDeadlineReader(runtime.db, runtime.documentIdField),
    runDeadline: payload => runtime.service.runDeadline(payload), report });
  runner.start();
  return async () => { await runner.stop(); await runtime.close(); };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('No arguments supported');
    const stop = await startLocalDeadlineCli();
    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      try { await stop(); } catch { process.exitCode = 1; }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch {
    console.error('Local deadline runner could not start; check demo/loopback configuration and build output.');
    process.exitCode = 1;
  }
}
