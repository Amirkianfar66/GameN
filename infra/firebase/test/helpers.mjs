export const projectId = 'demo-mothership';
const localHost = /^(?:127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$/;

function host(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!localHost.test(value)) throw new Error(`Tests require a loopback ${name}`);
  return value;
}

export function assertLocalEmulators() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST === undefined
    || process.env.FIRESTORE_EMULATOR_HOST === undefined) {
    throw new Error('Start this test through the repository Emulator Suite command');
  }
  if (process.env.GCLOUD_PROJECT !== undefined && process.env.GCLOUD_PROJECT !== projectId) {
    throw new Error('Emulator tests permit only demo-mothership');
  }
  return {
    authHost: host('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9199'),
    firestoreHost: host('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8180'),
    functionsHost: host('MOTHERSHIP_FUNCTIONS_EMULATOR_HOST', '127.0.0.1:5101'),
  };
}

async function result(response) {
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = raw; }
  return { status: response.status, headers: response.headers, body };
}

export async function createEmulatorIdentity() {
  const { authHost } = assertLocalEmulators();
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Auth emulator sign-up failed with HTTP ${response.status}`);
  const body = await response.json();
  return { uid: body.localId, idToken: body.idToken, refreshToken: body.refreshToken };
}

export async function refreshEmulatorIdentity(refreshToken) {
  const { authHost } = assertLocalEmulators();
  const response = await fetch(`http://${authHost}/securetoken.googleapis.com/v1/token?key=emulator-only`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error(`Auth emulator refresh failed with HTTP ${response.status}`);
  const body = await response.json();
  return { uid: body.user_id, idToken: body.id_token, refreshToken: body.refresh_token };
}

export async function invokeFunction(name, payload, { idToken, headers = {}, method = 'POST' } = {}) {
  const { functionsHost } = assertLocalEmulators();
  if (!['command', 'receipt', 'advance', 'serverTime'].includes(name)) throw new Error('Unknown fixture function');
  return result(await fetch(`http://${functionsHost}/${projectId}/us-central1/${name}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(idToken === undefined ? {} : { authorization: `Bearer ${idToken}` }),
      ...headers,
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(payload) }),
  }));
}

export function encodeFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)])) } };
}

export async function firestoreRequest(path, { idToken, method = 'GET', data } = {}) {
  const { firestoreHost } = assertLocalEmulators();
  if (!/^[A-Za-z0-9_/-]+$/.test(path)) throw new Error('Invalid emulator document path');
  return result(await fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(idToken === undefined ? {} : { authorization: `Bearer ${idToken}` }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(encodeFirestoreValue(data).mapValue) }),
  }));
}

export async function firestoreEventQuery(matchId, audienceKey, identity, seatId) {
  const { firestoreHost } = assertLocalEmulators();
  const path = `matches/${matchId}/audienceEvents/${audienceKey}`;
  const filters = [{ fieldFilter: { field: { fieldPath: 'audience.kind' }, op: 'EQUAL', value: { stringValue: audienceKey === 'public' ? 'public' : 'player' } } }];
  if (audienceKey !== 'public') filters.push({ fieldFilter: { field: { fieldPath: 'audience.seatId' }, op: 'EQUAL', value: { stringValue: seatId } } });
  return result(await fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}:runQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${identity.idToken}` },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'items' }],
      where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } },
    } }),
  }));
}
