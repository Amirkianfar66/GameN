import { deleteApp, initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { browserSessionPersistence, initializeAuth, signInAnonymously } from 'firebase/auth';
import { collection, doc, initializeFirestore, memoryLocalCache, onSnapshot } from 'firebase/firestore';
import { collectionPath, documentPath } from '../connected/paths.js';
import type { ConnectedTransport } from '../connected/transport.js';
import { readHostedConfiguration } from './hosted-config.js';
import { postHostedOperation } from './hosted-request.js';

export interface HostedTransport extends ConnectedTransport {
  readonly mode: 'production';
  dispose(): Promise<void>;
}

let instances = 0;

/** Staging uses real Firebase services, with session Auth and memory-only match snapshots. */
export function createHostedTransport(input: unknown): HostedTransport {
  const config = readHostedConfiguration(input);
  if (!globalThis.isSecureContext || globalThis.location?.origin !== config.pageOrigin) {
    throw new TypeError('Hosted preview must run at its configured HTTPS origin');
  }
  if ('FIREBASE_APPCHECK_DEBUG_TOKEN' in globalThis) throw new TypeError('Debug attestation is not a hosted preview configuration');
  const app = initializeApp({ projectId: config.projectId, apiKey: config.apiKey, appId: config.appId,
    authDomain: config.authDomain, messagingSenderId: config.messagingSenderId }, `mothership-hosted-${++instances}`);
  // App Check starts before Auth or Firestore access, including listener access.
  const appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(config.recaptchaEnterpriseSiteKey), isTokenAutoRefreshEnabled: true });
  const auth = initializeAuth(app, { persistence: browserSessionPersistence });
  const database = initializeFirestore(app, { localCache: memoryLocalCache() });
  const stops = new Set<() => void>();
  const track = (stop: () => void): (() => void) => {
    const tracked = (): void => { stops.delete(tracked); stop(); };
    stops.add(tracked);
    return tracked;
  };
  const uid = (): string => {
    if (auth.currentUser === null) throw new Error('Not signed in');
    return auth.currentUser.uid;
  };
  return {
    mode: 'production',
    currentUid: () => auth.currentUser?.uid ?? null,
    async signIn() {
      await auth.authStateReady();
      // Fail before opening a session if the hosted origin cannot be attested.
      await getToken(appCheck);
      return auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
    },
    post: (operation, body) => postHostedOperation(config, {
      getIdToken: async () => {
        if (auth.currentUser === null) throw new Error('Not signed in');
        return auth.currentUser.getIdToken();
      },
      getAppCheckToken: async () => (await getToken(appCheck)).token,
      fetch: globalThis.fetch.bind(globalThis),
    }, operation, body),
    listenDocument(target, listener) {
      const [first, ...rest] = documentPath(target, uid());
      if (first === undefined) throw new TypeError('Not a documented listener path');
      return track(onSnapshot(doc(database, first, ...rest), { includeMetadataChanges: true },
        snapshot => listener.onSnapshot({ value: snapshot.exists() ? snapshot.data() : null,
          fresh: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites }),
        error => listener.onError(error.code === 'permission-denied' ? 'refused' : 'failed')));
    },
    listenCollection(target, listener) {
      const [first, ...rest] = collectionPath(target);
      if (first === undefined) throw new TypeError('Not a documented listener path');
      return track(onSnapshot(collection(database, first, ...rest), { includeMetadataChanges: true },
        snapshot => listener.onSnapshot({ value: snapshot.docs.map(item => ({ id: item.id, data: item.data() as unknown })),
          fresh: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites }),
        error => listener.onError(error.code === 'permission-denied' ? 'refused' : 'failed')));
    },
    async dispose() {
      for (const stop of [...stops]) stop();
      await deleteApp(app);
    },
  };
}
