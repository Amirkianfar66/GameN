import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { SeatSessionSchema } from '@mothership/contracts';
import { readLobby } from '@mothership/game';
import { createFakeHost } from './support/fakes.mjs';
import { createFakeConnectedTransport, lobbyView, MATCH, playerView } from './support/connected.mjs';

// Execute the actual hosted recovery branch and its listener helpers. UI boundaries are
// inert test nodes; no CSS, browser Auth or production network is needed for this race.
const entry = readFileSync(new URL('../hosted/main.js', import.meta.url), 'utf8');
const helpers = entry.slice(entry.indexOf('const RETRY_FIRST_MS'), entry.indexOf('/** Lobby listeners'));
const player = entry.slice(entry.indexOf('async function player(uid)'), entry.indexOf('async function display(uid)'));
const session = { schemaVersion: 1, protocolVersion: 2, matchId: MATCH, seatId: 'seat-1', bindingRevision: 2 };
const target = kind => ({ kind, matchId: MATCH });
const startedLobby = () => lobbyView(value => {
  value.status = 'running';
  value.seats = Array.from({ length: 7 }, (_, index) => ({ seatId: `seat-${index + 1}`, initialRoom: 'Room A' }));
});

async function reloadedAfterLostReply() {
  const host = createFakeHost();
  const fake = createFakeConnectedTransport(host);
  await fake.transport.signIn();
  // Recovery committed, but its reply was lost before reload. The recovery code and
  // request body are gone; only the public match identifier/recovering marker survived.
  let resumeState = { device: 'player', matchId: MATCH, recovering: true };
  const saved = [], pickers = [], frames = [], opened = [], lobbyWatchers = [];
  const node = (tag, text, attributes = {}) => ({ tag, text, attributes, append() {}, addEventListener() {} });
  const bindings = {
    transport: fake.transport,
    window: { setTimeout: (...args) => host.ports.scheduler.setTimeout(...args), clearTimeout: id => host.ports.scheduler.clearTimeout(id) },
    ports: host.ports, readLobby, SeatSessionSchema, lobbyWatchers,
    MATCH_ID: /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,
    ENDED_IN_LOBBY: 'Ended before starting',
    resume: { load: () => resumeState, save: value => { resumeState = value; saved.push(value); }, clear: () => { resumeState = null; } },
    lifecycle: { unsettled: () => null, abandon: () => true },
    el: node, facts: value => value, frame: (title, ...content) => frames.push(content),
    identityPicker: (matchId, seatId) => { const result = node('picker', seatId); pickers.push({ matchId, seatId }); return result; },
    createConnectedPlayerScreen: options => options,
    renderComicPlayerShell() {}, showMatch: screen => opened.push(screen),
  };
  const enter = runInNewContext(`${helpers}\n${player}\nplayer;`, bindings);
  await enter('test-uid-1');
  return { host, fake, saved, pickers, frames, opened, stop: () => { for (const stop of lobbyWatchers.splice(0)) stop(); } };
}

test('lost lobby recovery reply plus reload restores the identity picker from fresh own session metadata', async () => {
  const s = await reloadedAfterLostReply();
  await s.fake.deliver(target('lobby'), lobbyView());
  assert.equal(s.pickers.length, 0);
  await s.fake.deliver(target('seat-session'), session, false);
  await s.fake.deliver(target('seat-session'), { ...session, matchId: 'another-match' });
  await s.fake.deliver(target('seat-session'), { ...session, schemaVersion: 2 });
  await s.fake.deliver(target('seat-session'), { ...session, privateRole: 'Supplier' });
  assert.equal(s.pickers.length, 0, 'Cached, wrong-match and malformed bindings cannot identify this seat');
  await s.fake.deliver(target('seat-session'), session);
  assert.equal(s.pickers.length, 1);
  assert.equal(s.pickers[0].seatId, 'seat-1');
  assert.equal(s.saved.at(-1).seatId, 'seat-1');
  assert.equal(s.saved.at(-1).recovering, undefined);
  assert.deepEqual(Object.keys(s.saved.at(-1)).sort(), ['device', 'matchId', 'seatId']);
  assert.ok(s.frames.at(-1).some(node => node.tag === 'picker'), 'The restored picker is in the waiting page');
  await s.fake.deliver(target('seat-session'), session);
  assert.equal(s.pickers.length, 1, 'Repeated snapshots preserve the current form');
  s.stop();
});

test('legacy missing seat metadata keeps waiting and still opens from the own view after start', async () => {
  const s = await reloadedAfterLostReply();
  await s.fake.deliver(target('lobby'), lobbyView());
  await s.fake.deliver(target('seat-session'), null);
  assert.equal(s.pickers.length, 0);
  assert.equal(s.saved.length, 0);
  await s.fake.deliver(target('lobby'), startedLobby());
  await s.fake.deliver(target('player-view'), playerView('seat-1'));
  assert.equal(s.opened.length, 1);
  assert.equal(s.opened[0].seatId, 'seat-1');
  s.stop();
});

test('a binding callback after the Auth identity changes cannot restore another identity picker', async () => {
  const s = await reloadedAfterLostReply();
  await s.fake.deliver(target('lobby'), lobbyView());
  s.fake.transport.currentUid = () => 'different-uid';
  await s.fake.deliver(target('seat-session'), session);
  assert.equal(s.pickers.length, 0);
  assert.equal(s.saved.length, 0);
  s.stop();
});

test('a late binding after the lobby starts cannot replace the running page with an identity picker', async () => {
  const s = await reloadedAfterLostReply();
  await s.fake.deliver(target('lobby'), lobbyView());
  await s.fake.deliver(target('lobby'), startedLobby());
  await s.fake.deliver(target('seat-session'), session);
  assert.equal(s.pickers.length, 0);
  await s.fake.deliver(target('player-view'), playerView('seat-1'));
  assert.equal(s.opened.length, 1);
  s.stop();
});

test('a late binding after a lobby read becomes uncertain cannot claim that the player is seated', async () => {
  const s = await reloadedAfterLostReply();
  await s.fake.deliver(target('lobby'), lobbyView());
  await s.fake.fail(target('lobby'), 'authorization-uncertain');
  await s.fake.deliver(target('seat-session'), session);
  assert.equal(s.pickers.length, 0);
  assert.equal(s.saved.length, 0);
  await s.host.advance(1500);
  await s.fake.deliver(target('lobby'), lobbyView());
  await s.fake.deliver(target('seat-session'), session);
  assert.equal(s.pickers.length, 1, 'A newly confirmed lobby can resolve the binding after reconnect');
  s.stop();
});
