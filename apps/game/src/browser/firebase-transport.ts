import { deleteApp, initializeApp } from 'firebase/app';
import { browserSessionPersistence, connectAuthEmulator, initializeAuth, inMemoryPersistence, signInAnonymously } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, initializeFirestore, memoryLocalCache, onSnapshot } from 'firebase/firestore';
import { collectionPath, documentPath } from '../connected/paths.js';
import { V1_OPERATIONS } from '../connected/transport.js';
import type { ConnectedTransport } from '../connected/transport.js';

// The Firebase web client behind the connected transport boundary, for the LOCAL EMULATORS
// only. It follows docs/backend/protocol2-client-handoff.md:
//   - Firestore keeps its cache in memory. Nothing of a match is written to disk.
//   - A snapshot is fresh only when the server confirmed it: not from the cache and with no
//     local write pending. Listeners ask for metadata changes, because the confirmation can
//     arrive without the bytes changing.
//   - Operations are plain JSON POSTs with the caller's current ID token. The identity is
//     the SDK's; no UID travels in a body.
//
// It refuses any host that is not loopback and any project but the demo one, so an
// emulator ID token can never be sent to a live project. There is no production
// configuration here: none has been reviewed, and nothing is deployed.

const DEMO_PROJECT = 'demo-mothership';
const LOOPBACK_HOST = /^(?:127\.0\.0\.1|localhost)$/;
const LOOPBACK_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):[0-9]{1,5}$/;

export interface EmulatorTransportOptions {
  /** Must be the demo project. Stated so that a caller cannot forget which backend this is. */
  readonly projectId: string;
  /** e.g. http://127.0.0.1:9199 */
  readonly authOrigin: string;
  readonly firestoreHost: string;
  readonly firestorePort: number;
  /** e.g. http://127.0.0.1:5101 */
  readonly functionsOrigin: string;
  /**
   * Where the sign-in credential is kept. session: the tab's session storage, so a reload
   * keeps the seat and closing the tab ends it. memory: gone with the page. PROVISIONAL:
   * the policy per kind of device is undecided (adoption assessment, G4). Whatever is
   * chosen here, no match data is stored with it.
   */
  readonly credentialPersistence: 'session' | 'memory';
  /** Injected so that a test outside a browser can supply the Origin header a browser would. */
  readonly fetch?: typeof globalThis.fetch;
}

export interface EmulatorTransport extends ConnectedTransport {
  readonly mode: 'emulator';
  /** Stops every listener and releases the SDK. */
  dispose(): Promise<void>;
}

let instances = 0;

export function createEmulatorTransport(options: EmulatorTransportOptions): EmulatorTransport {
  if (options.projectId !== DEMO_PROJECT) throw new TypeError('The emulator transport serves only the demo project');
  if (!LOOPBACK_ORIGIN.test(options.authOrigin) || !LOOPBACK_ORIGIN.test(options.functionsOrigin) || !LOOPBACK_HOST.test(options.firestoreHost)
    || !Number.isInteger(options.firestorePort) || options.firestorePort < 1 || options.firestorePort > 65_535) {
    throw new TypeError('The emulator transport reaches loopback hosts only');
  }
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);

  // One named SDK app per transport, so that two identities in one process stay apart.
  instances += 1;
  const app = initializeApp({ projectId: DEMO_PROJECT, apiKey: 'emulator-only' }, `mothership-emulator-${instances}`);
  const auth = initializeAuth(app, { persistence: options.credentialPersistence === 'session' ? browserSessionPersistence : inMemoryPersistence });
  connectAuthEmulator(auth, options.authOrigin, { disableWarnings: true });
  const database = initializeFirestore(app, { localCache: memoryLocalCache() });
  connectFirestoreEmulator(database, options.firestoreHost, options.firestorePort);

  const stops = new Set<() => void>();
  function track(stop: () => void): () => void {
    const untracked = (): void => {
      stops.delete(untracked);
      stop();
    };
    stops.add(untracked);
    return untracked;
  }
  const uid = (): string => {
    const user = auth.currentUser;
    if (user === null) throw new Error('Not signed in');
    return user.uid;
  };

  return {
    mode: 'emulator',
    currentUid: () => auth.currentUser?.uid ?? null,
    async signIn() {
      // A credential kept from before the reload is restored first: the same identity, not a new one.
      await auth.authStateReady();
      if (auth.currentUser !== null) return auth.currentUser.uid;
      return (await signInAnonymously(auth)).user.uid;
    },
    async post(operation, body) {
      if (!V1_OPERATIONS.includes(operation)) throw new TypeError('Not a documented operation');
      const user = auth.currentUser;
      if (user === null) throw new Error('Not signed in');
      const response = await send(`${options.functionsOrigin}/${DEMO_PROJECT}/us-central1/${operation}`, {
        method: 'POST',
        // Never cached, never replayed by the browser from a store of its own.
        cache: 'no-store',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify(body),
      });
      // A failure is a JSON body too. Only an answer that is not JSON at all is "no answer".
      return JSON.parse(await response.text()) as unknown;
    },
    listenDocument(target, listener) {
      const [first, ...rest] = documentPath(target, uid());
      if (first === undefined) throw new TypeError('Not a documented listener path');
      return track(onSnapshot(doc(database, first, ...rest), { includeMetadataChanges: true },
        snapshot => listener.onSnapshot({
          value: snapshot.exists() ? snapshot.data() : null,
          fresh: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites,
        }),
        () => listener.onError(),
      ));
    },
    listenCollection(target, listener) {
      const [first, ...rest] = collectionPath(target);
      if (first === undefined) throw new TypeError('Not a documented listener path');
      return track(onSnapshot(collection(database, first, ...rest), { includeMetadataChanges: true },
        snapshot => listener.onSnapshot({
          value: snapshot.docs.map(item => ({ id: item.id, data: item.data() as unknown })),
          fresh: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites,
        }),
        () => listener.onError(),
      ));
    },
    async dispose() {
      for (const stop of [...stops]) stop();
      await deleteApp(app);
    },
  };
}
