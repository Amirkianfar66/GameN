import {createHash, randomUUID} from 'node:crypto';
import {initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createFirestorePlanetStore} from '../../dist/planet-store.js';

// This adapter is used only by the developer harness. Match the existing
// authority adapter's transactions, envelope validation and retry classification.
export function createLoopbackFoodStore() {
  const endpoint = process.env.FIRESTORE_EMULATOR_HOST;
  if (!/^127\.0\.0\.1:[1-9]\d{0,4}$/.test(endpoint ?? '') || Number(endpoint.split(':')[1]) > 65535) {
    throw new Error('The Food prototype requires a loopback Firestore emulator');
  }
  const app = initializeApp({projectId: 'demo-mothership'}, `food-coordinator-${randomUUID()}`);
  const db = getFirestore(app);
  const store = createFirestorePlanetStore(db);
  return {
    ...store,
    watch(key, changed, failed) {
      const document = createHash('sha256').update(key).digest('hex');
      return db.collection('planetDocuments').doc(document).onSnapshot(changed, failed);
    },
    async close() {
      await db.terminate();
      await deleteApp(app);
    },
  };
}
