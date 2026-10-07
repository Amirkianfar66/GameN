// Test-only delivery adapter: Firebase's Functions suite does not emulate Cloud Tasks.
// Wait the real deadline and deliver only this match's persisted setup intent through
// the real service. Player/public observations still use authenticated Rules reads.
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createV1Service } from '../../../../services/game-api/dist/index.js';
import { deliverSetupDeadline } from '../../../../services/game-api/test-emulator/staged-start-helper.mjs';
import { emulatorHosts, PROJECT } from './rest-transport.mjs';

export async function deliverSetupDeadlineForTest(matchId, stage) {
  emulatorHosts(); // Requires explicit loopback Auth/Firestore and the demo project.
  const app = initializeApp({ projectId: PROJECT }, `frontend-setup-${randomUUID()}`);
  const db = getFirestore(app);
  try {
    await deliverSetupDeadline({ base: db.collection('matches').doc(matchId),
      service: createV1Service({ db, clock: Date.now }) }, stage);
  } finally { await db.terminate(); await deleteApp(app); }
}
