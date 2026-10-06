// A connected transport for tests, speaking to the LOCAL Firebase emulators over their HTTP
// interfaces: the Auth emulator's sign-up, the Functions emulator's JSON operations, and
// the Firestore emulator's REST reads made with the caller's own ID token, so Security
// Rules apply to every read exactly as they do to a browser.
//
// Test-only. It refuses any host that is not loopback and any project but the demo one.
// It is not the browser transport: it polls where a browser listens, so it says nothing
// about listener metadata or caching. What it does establish is that the client core reads
// and writes the real backend's protocol.
import { collectionPath, documentPath } from '@mothership/game';

export const PROJECT = 'demo-mothership';
const LOOPBACK = /^(?:127\.0\.0\.1|localhost|\[::1\]):[0-9]{1,5}$/;

function host(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!LOOPBACK.test(value)) throw new Error(`Emulator tests need a loopback ${name}`);
  return value;
}

/** The emulator hosts, or an error when this was not started through the emulator command. */
export function emulatorHosts() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST === undefined || process.env.FIRESTORE_EMULATOR_HOST === undefined) {
    throw new Error('Start these tests through `npm run test:emulator --workspace @mothership/game`');
  }
  if (process.env.GCLOUD_PROJECT !== undefined && process.env.GCLOUD_PROJECT !== PROJECT) throw new Error(`Emulator tests permit only ${PROJECT}`);
  return {
    auth: host('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9199'),
    firestore: host('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8180'),
    functions: host('MOTHERSHIP_FUNCTIONS_EMULATOR_HOST', '127.0.0.1:5101'),
  };
}

function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decode(item)]));
  throw new Error('Unsupported Firestore value');
}
const decodeDocument = document => decode({ mapValue: { fields: document.fields ?? {} } });

/**
 * @param {object} [options]
 * @param {number} [options.pollMs] How often a "listener" reads its document again.
 * @param {string} [options.origin] The browser origin the Functions emulator is told. It allows only the two documented local ones.
 */
export function createRestEmulatorTransport({ pollMs = 100, origin = 'http://localhost:5173' } = {}) {
  const hosts = emulatorHosts();
  const documents = `http://${hosts.firestore}/v1/projects/${PROJECT}/databases/(default)/documents`;
  let identity = null;
  const polls = new Set();
  /** Every request this transport made, for tests that count them. */
  const requests = [];

  const bearer = () => (identity === null ? {} : { authorization: `Bearer ${identity.idToken}` });

  function poll(read, listener) {
    let stopped = false;
    let last;
    let failed = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const value = await read();
        if (stopped) return;
        const serialized = JSON.stringify(value);
        if (serialized !== last) {
          last = serialized;
          failed = false;
          // A REST read is answered by the server: there is no cache to be stale.
          listener.onSnapshot({ value, fresh: true });
        }
      } catch (error) {
        if (stopped) return;
        last = undefined;
        // HTTP 403 is the rules refusing the read. Anything else is the read failing.
        if (!failed) listener.onError(error?.refused === true ? 'refused' : 'failed');
        failed = true;
      }
      if (!stopped) handle.timer = setTimeout(tick, pollMs);
    };
    const handle = { timer: setTimeout(tick, 0) };
    const stop = () => {
      stopped = true;
      clearTimeout(handle.timer);
      polls.delete(stop);
    };
    polls.add(stop);
    return stop;
  }

  const transport = {
    mode: 'emulator',
    currentUid: () => identity?.uid ?? null,
    async signIn() {
      if (identity !== null) return identity.uid;
      const response = await fetch(`http://${hosts.auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
      });
      if (!response.ok) throw new Error(`Auth emulator sign-up failed with HTTP ${response.status}`);
      const body = await response.json();
      identity = { uid: body.localId, idToken: body.idToken, refreshToken: body.refreshToken };
      return identity.uid;
    },
    async post(operation, body) {
      requests.push({ operation, body: structuredClone(body) });
      const response = await fetch(`http://${hosts.functions}/${PROJECT}/us-central1/${operation}`, {
        method: 'POST', headers: { 'content-type': 'application/json', origin, ...bearer() }, body: JSON.stringify(body),
      });
      // A failure is a JSON body too. Only an answer that is not JSON at all is "no answer".
      return JSON.parse(await response.text());
    },
    listenDocument(target, listener) {
      const path = documentPath(target, identity?.uid ?? '').join('/');
      return poll(async () => {
        const response = await fetch(`${documents}/${path}`, { headers: bearer() });
        if (response.status === 404) return null;
        if (!response.ok) throw Object.assign(new Error(`Read failed with HTTP ${response.status}`), { refused: response.status === 403 });
        return decodeDocument(await response.json());
      }, listener);
    },
    listenCollection(target, listener) {
      const segments = collectionPath(target);
      const collectionId = segments.at(-1);
      const parent = segments.slice(0, -1).join('/');
      return poll(async () => {
        const response = await fetch(`${documents}/${parent}:runQuery`, {
          method: 'POST', headers: { 'content-type': 'application/json', ...bearer() }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId }] } }),
        });
        if (!response.ok) throw Object.assign(new Error(`Query failed with HTTP ${response.status}`), { refused: response.status === 403 });
        const rows = await response.json();
        return rows.filter(row => row.document !== undefined).map(row => ({ id: row.document.name.split('/').at(-1), data: decodeDocument(row.document) }))
          .sort((a, b) => a.id.localeCompare(b.id));
      }, listener);
    },
  };
  return {
    transport,
    requests,
    /** Reads any document path with this identity, to check what the rules allow. Returns the HTTP status. */
    async rawStatus(path) {
      return (await fetch(`${documents}/${path}`, { headers: bearer() })).status;
    },
    /** Stops every listener this transport started. */
    close() {
      for (const stop of [...polls]) stop();
    },
  };
}

/** Ports backed by the real clock. performance.now() is monotonic and ignores the wall clock. */
export function realPorts() {
  let next = 0;
  return {
    clock: { now: () => performance.now() },
    scheduler: { setTimeout: (callback, delayMs) => setTimeout(callback, delayMs), clearTimeout: handle => clearTimeout(handle) },
    ids: { next: () => `emu-${Date.now().toString(36)}-${(next++).toString(36)}-${Math.random().toString(36).slice(2, 10)}` },
  };
}

/** Resolves with the first value for which `test` is true, or rejects after the limit. */
export function until(subscribe, test, label, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(new Error(`Timed out waiting for: ${label}`));
    }, timeoutMs);
    const stop = subscribe(value => {
      if (!test(value)) return;
      clearTimeout(timer);
      queueMicrotask(() => stop());
      resolve(value);
    });
  });
}
