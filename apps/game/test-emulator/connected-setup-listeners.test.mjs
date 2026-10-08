import assert from 'node:assert/strict';
import test from 'node:test';
import { createConnectedApi, createSetupFeed, readLobby } from '@mothership/game';
import { createEmulatorTransport } from '../dist/browser/firebase-transport.js';
import { emulatorHosts, PROJECT, realPorts } from './support/rest-transport.mjs';

// Real SDK listeners across the two setup transactions, with actual local Functions
// and Tasks delivery in CI. No Admin reads, injected roles, shortened deadlines,
// browser reloads or browser-driven setup advancement.
const ports = realPorts();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function eventually(check, label, timeoutMs = 8_000) {
  const end = performance.now() + timeoutMs;
  while (performance.now() < end) { const value = check(); if (value) return value; await pause(50); }
  assert.fail(`Timed out waiting for ${label}`);
}
function done(result) { assert.equal(result.kind, 'done', JSON.stringify(result)); return result.result; }
function client() {
  const hosts = emulatorHosts(), [firestoreHost, port] = hosts.firestore.split(':');
  const origin = process.env.MOTHERSHIP_TEST_SETUP_ORIGIN ?? 'http://localhost:5173';
  assert.ok(['http://localhost:5173', 'http://127.0.0.1:5176'].includes(origin));
  const transport = createEmulatorTransport({ projectId: PROJECT, authOrigin: `http://${hosts.auth}`,
    firestoreHost, firestorePort: Number(port), functionsOrigin: `http://${hosts.functions}`, credentialPersistence: 'memory',
    fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, origin } }),
  });
  return { transport, api: createConnectedApi(transport, ports) };
}
const request = extra => ({ protocolVersion: 2, requestId: ports.ids.next(), ...extra });

test('live SDK setup listeners receive the dealt role and final-Ready launch without reloading', { timeout: 120_000 }, async t => {
  const host = client(), players = [client(), client()];
  let matchId, finished = false; const stops = [], feeds = [], failures = [];
  t.after(async () => {
    if (matchId && !finished) await host.api.abortMatch(request({ matchId }));
    feeds.forEach(feed => feed.dispose()); stops.forEach(stop => stop());
    await Promise.all([host, ...players].map(who => who.transport.dispose()));
  });
  await Promise.all([host, ...players].map(who => who.transport.signIn()));
  const created = done(await host.api.createMatch(request({ playerCount: 7 }))); matchId = created.matchId;
  done(await host.api.setPracticeBots(request({ schemaVersion: 1, matchId, botCount: 5 })));
  for (const [index, player] of players.entries()) {
    const admission = done(await player.api.requestAdmission(request({ roomCode: created.roomCode })));
    const seatId = `seat-${index + 6}`;
    done(await host.api.approveAdmission(request({ matchId, admissionId: admission.admissionId, seatId })));
    const monitored = { ...player.transport, listenDocument(target, listener) {
      return player.transport.listenDocument(target, { ...listener, onError(reason) {
        failures.push({ kind: target.kind, reason }); listener.onError(reason);
      } });
    } };
    const feed = createSetupFeed({ transport: monitored, ports, matchId, seatId }); feed.start(); feeds.push(feed);
    let lobby = null; player.lobby = () => lobby;
    stops.push(player.transport.listenDocument({ kind: 'lobby', matchId }, { onSnapshot(snapshot) {
      if (!snapshot.fresh) return; const parsed = readLobby(snapshot.value, matchId);
      if (parsed.kind === 'accepted') lobby = parsed.value;
    }, onError(reason) { failures.push({ kind: 'lobby', reason }); } }));
    await eventually(() => feed.binding() && feed.public()?.stage === 'lobby', 'current setup binding');
  }
  done(await host.api.beginSetup(request({ schemaVersion: 1, matchId })));
  const reading = await eventually(() => feeds[0].public()?.stage === 'awaiting-ready' && feeds[0].public(), 'automatic role dealing', 45_000);
  assert.equal(reading.choosingEndsAt - reading.choosingStartedAt, 30_000);
  assert.equal(reading.readingEndsAt - reading.readingStartedAt, 30_000);
  assert.ok(reading.readingStartedAt >= reading.choosingEndsAt);
  const own = await Promise.all(feeds.map(feed => eventually(() => feed.own(), 'authorized own-role listener')));
  assert.ok(own.every(value => value.dealId === reading.dealId));
  const ready = index => players[index].api.readyForMatch(request({ schemaVersion: 1, matchId,
    dealId: own[index].dealId, bindingRevision: own[index].bindingRevision }));
  assert.equal(done(await ready(0)).stage, 'awaiting-ready');
  await eventually(() => feeds[0].public()?.seats.find(seat => seat.seatId === 'seat-6')?.ready, 'first Ready');
  assert.equal(feeds[0].own(), null);
  const time = await host.api.serverTime(matchId); assert.equal(time.kind, 'time');
  await pause(Math.max(0, reading.readingEndsAt - time.sample.serverTimeMs + 300));
  assert.ok(feeds.every(feed => feed.public()?.stage === 'awaiting-ready'), 'The missing human still gates launch after reading');
  assert.ok(players.every(player => player.lobby()?.status === 'lobby'));
  assert.equal(done(await ready(1)).stage, 'running');
  await Promise.all(feeds.map(feed => eventually(() => feed.public()?.stage === 'running', 'live running setup')));
  await Promise.all(players.map(player => eventually(() => player.lobby()?.status === 'running', 'live running lobby')));
  assert.ok(feeds.every(feed => feed.own() === null));
  assert.deepEqual(failures, [], 'Permission transitions must not strand the existing public watch stream');
  done(await host.api.abortMatch(request({ matchId }))); finished = true;
});
