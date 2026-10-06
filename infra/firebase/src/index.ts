import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { createGameService } from '@mothership/game-api';
import { createHttpHandler } from './http.js';
import { createTrustedDeadlineHandler } from './tasks.js';

const app = getApps()[0] ?? initializeApp();
const service = createGameService({ db: getFirestore(app) });
const dependencies = {
  service,
  verifyIdToken: (token: string) => getAuth(app).verifyIdToken(token, true),
  verifyAppCheckToken: (token: string) => getAppCheck(app).verifyToken(token),
  environment: {
    projectId: app.options.projectId ?? process.env['GCLOUD_PROJECT'] ?? process.env['GCP_PROJECT'] ?? '',
    ...(process.env['FUNCTIONS_EMULATOR'] === undefined ? {} : { functionsEmulator: process.env['FUNCTIONS_EMULATOR'] }),
    ...(process.env['FIREBASE_AUTH_EMULATOR_HOST'] === undefined ? {} : { authEmulatorHost: process.env['FIREBASE_AUTH_EMULATOR_HOST'] }),
    ...(process.env['FIRESTORE_EMULATOR_HOST'] === undefined ? {} : { firestoreEmulatorHost: process.env['FIRESTORE_EMULATOR_HOST'] }),
  },
};

// No public deadline, seed, phase override or vote-bypass endpoint exists.
const options = { region: 'us-central1', timeoutSeconds: 30, cors: false } as const;
export const command = onRequest(options, createHttpHandler('command', dependencies));
export const receipt = onRequest(options, createHttpHandler('receipt', dependencies));
export const advance = onRequest(options, createHttpHandler('advance', dependencies));
export const serverTime = onRequest(options, createHttpHandler('serverTime', dependencies));

const handleDeadline = createTrustedDeadlineHandler(service);
export const deadlineTask = onTaskDispatched({
  region: 'us-central1',
  invoker: 'private',
  timeoutSeconds: 30,
  retryConfig: { maxAttempts: 5, minBackoffSeconds: 1, maxBackoffSeconds: 30 },
  rateLimits: { maxConcurrentDispatches: 10 },
}, async request => handleDeadline(request.data));

export const firebaseDirection = {
  status: 'emulator-first-slice',
  authentication: 'Firebase Auth',
  commands: 'Cloud Functions for Firebase, second generation',
  persistence: 'Firestore',
  deadlines: 'Cloud Tasks with a durable outbox',
  productionDeliveryVerified: false,
} as const;
