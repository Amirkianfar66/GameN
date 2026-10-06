import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedApi, readAdmission, readHostSession, readLobby } from '@mothership/game';
import { createEmulatorTransport } from '../dist/browser/firebase-transport.js';
import { emulatorHosts, PROJECT, realPorts } from './support/rest-transport.mjs';

// EMULATOR-CONNECTED. The real Firebase web client, as the browser page will use it,
// against the local Auth, Firestore and Functions emulators: real listeners, real snapshot
// metadata. It runs here in Node, so it is the SDK and the wire that are exercised, not a
// browser: storage, tab lifecycle and a real network going away are for the browser journeys.

const ports = realPorts();
const requestId = () => ports.ids.next();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function client(t) {
  const hosts = emulatorHosts();
  const [firestoreHost, firestorePort] = hosts.firestore.split(':');
  /** What the transport handed to fetch, as it handed it. */
  const requests = [];
  const transport = createEmulatorTransport({
    projectId: PROJECT, authOrigin: `http://${hosts.auth}`, firestoreHost, firestorePort: Number(firestorePort), functionsOrigin: `http://${hosts.functions}`,
    credentialPersistence: 'memory',
    // A browser adds its page's origin by itself, and the Functions accept only the documented local ones.
    fetch: (url, init) => {
      requests.push({ url, init });
      return fetch(url, { ...init, headers: { ...init.headers, origin: 'http://localhost:5173' } });
    },
  });
  t.after(() => transport.dispose());
  return { transport, requests, api: createConnectedApi(transport, ports) };
}
/** Collects what a listener is handed, and waits for a snapshot that satisfies a test. */
function listen(start) {
  const snapshots = [];
  let errors = 0;
  /** Why each failure happened, as the transport said. */
  const reasons = [];
  const waiters = new Set();
  const stop = start({
    onSnapshot(snapshot) { snapshots.push(snapshot); for (const check of [...waiters]) check(); },
    onError(reason) { errors += 1; reasons.push(reason); for (const check of [...waiters]) check(); },
  });
  const until = (test, label, timeoutMs = 8_000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiters.delete(check); reject(new Error(`Timed out waiting for: ${label}`)); }, timeoutMs);
    const check = () => {
      const hit = snapshots.find(test);
      if (hit === undefined) return;
      clearTimeout(timer);
      waiters.delete(check);
      resolve(hit);
    };
    waiters.add(check);
    check();
  });
  const untilError = (timeoutMs = 8_000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the listener to fail')), timeoutMs);
    const check = () => { if (errors > 0) { clearTimeout(timer); waiters.delete(check); resolve(); } };
    waiters.add(check);
    check();
  });
  return { snapshots, stop, until, untilError, errors: () => errors, reasons };
}

test('connected (Firebase web client): identity, operations, live listeners and snapshot freshness', async t => {
  const host = client(t);
  const player = client(t);
  const outsider = client(t);

  // An anonymous identity, and the same one when asked again.
  assert.equal(host.transport.currentUid(), null);
  const hostUid = await host.transport.signIn();
  assert.match(hostUid, /^[A-Za-z0-9_-]{1,128}$/);
  assert.equal(await host.transport.signIn(), hostUid);
  const playerUid = await player.transport.signIn();
  await outsider.transport.signIn();
  assert.notEqual(playerUid, hostUid, 'Two clients in one process are two identities');

  // Operations go through the SDK's own ID token; no UID is in any body.
  const created = await host.api.createMatch({ protocolVersion: 2, requestId: requestId(), playerCount: 7 });
  assert.equal(created.kind, 'done', JSON.stringify(created));
  const { matchId, roomCode } = created.result;
  await assert.rejects(() => host.transport.post('v1Anything', {}), /Not a documented operation/);
  // One request left, to the local Functions and nowhere else, and it may not be redirected:
  // a redirect would carry the token and the body to another host.
  assert.equal(host.requests.length, 1);
  const [{ url, init }] = host.requests;
  assert.equal(url, `http://${emulatorHosts().functions}/${PROJECT}/us-central1/v1CreateMatch`);
  assert.deepEqual([init.method, init.redirect, init.cache], ['POST', 'error', 'no-store']);
  assert.match(init.headers.authorization, /^Bearer \S+$/);
  assert.doesNotMatch(init.body, new RegExp(hostUid), 'The identity travels in the token, never in a body');

  // The host's session document, by a real listener. Whatever comes first, what is called
  // fresh is the server's confirmed document.
  const session = listen(listener => host.transport.listenDocument({ kind: 'session', matchId }, listener));
  const fresh = await session.until(snapshot => snapshot.fresh && snapshot.value !== null, 'a server-confirmed session document');
  assert.deepEqual(readHostSession(fresh.value), { kind: 'accepted', value: { hostUid, playerCount: 7, status: 'lobby', roomCode } });
  for (const snapshot of session.snapshots.slice(0, session.snapshots.indexOf(fresh))) assert.equal(snapshot.fresh, false, 'Anything delivered before it was not called fresh');

  // A listener the rules refuse fails; it is not an empty document.
  const denied = listen(listener => player.transport.listenDocument({ kind: 'session', matchId }, listener));
  await denied.untilError();
  assert.deepEqual(denied.snapshots, []);
  assert.deepEqual(denied.reasons, ['refused'], 'The transport says the rules refused it, which is not a lost connection');

  // A request for admission, and the requester's own document by listener.
  const requested = await player.api.requestAdmission({ protocolVersion: 2, requestId: requestId(), roomCode, initialRoom: 'Room B' });
  assert.equal(requested.kind, 'done', JSON.stringify(requested));
  const own = listen(listener => player.transport.listenDocument({ kind: 'admission', matchId, admissionId: requested.result.admissionId }, listener));
  const pending = await own.until(snapshot => snapshot.fresh && snapshot.value !== null, 'own admission');
  assert.deepEqual(readAdmission(pending.value).value.status, 'pending');
  // A document that does not exist is delivered as null, not as an error.
  const missing = listen(listener => player.transport.listenDocument({ kind: 'admission', matchId, admissionId: 'no-such-admission' }, listener));
  await assert.rejects(() => missing.until(snapshot => snapshot.value !== null, 'nothing', 600), /Timed out/);

  // The host's list of requests, by a collection listener.
  const list = listen(listener => host.transport.listenCollection({ kind: 'admissions', matchId }, listener));
  const one = await list.until(snapshot => snapshot.fresh && snapshot.value.length === 1, 'one request in the host’s list');
  assert.deepEqual([one.value[0].id, readAdmission(one.value[0].data).value.uid], [requested.result.admissionId, playerUid]);

  // The host approves. The requester's listener is told by the server, without asking again.
  const before = own.snapshots.length;
  const approved = await host.api.approveAdmission({ protocolVersion: 2, matchId, requestId: requestId(), admissionId: requested.result.admissionId, seatId: 'seat-4' });
  assert.equal(approved.kind, 'done', JSON.stringify(approved));
  const pushed = await own.until(snapshot => snapshot.fresh && readAdmission(snapshot.value).value?.status === 'approved', 'the approval, pushed to the requester');
  assert.equal(readAdmission(pushed.value).value.seatId, 'seat-4');
  assert.equal(own.snapshots.length > before, true);

  // Now seated, the player can listen to the lobby; someone never admitted cannot.
  const lobby = listen(listener => player.transport.listenDocument({ kind: 'lobby', matchId }, listener));
  const seen = await lobby.until(snapshot => snapshot.fresh && snapshot.value !== null, 'the lobby');
  assert.deepEqual(readLobby(seen.value, matchId).value.seats, [{ seatId: 'seat-4', initialRoom: 'Room B' }]);
  const refused = listen(listener => outsider.transport.listenDocument({ kind: 'lobby', matchId }, listener));
  await refused.untilError();
  assert.deepEqual(refused.reasons, ['refused']);

  // A stopped listener hears nothing more.
  own.stop();
  const heard = own.snapshots.length;
  assert.equal((await host.api.admitDisplay({ protocolVersion: 2, matchId, requestId: requestId(), displayUid: (await outsider.transport.signIn()) })).kind, 'done');
  await sleep(400);
  assert.equal(own.snapshots.length, heard);
  // The one just admitted as a display can now read the lobby, with a new listener.
  const admitted = listen(listener => outsider.transport.listenDocument({ kind: 'lobby', matchId }, listener));
  await admitted.until(snapshot => snapshot.fresh && snapshot.value !== null, 'the lobby, for the admitted display');
});
