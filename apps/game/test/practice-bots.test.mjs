import test from 'node:test';
import assert from 'node:assert/strict';
import { createComicFeeds, createConnectedApi, createLifecycleRequests, documentPath } from '@mothership/game';
import { createFakeHost } from './support/fakes.mjs';
import { createFakeConnectedTransport, MATCH } from './support/connected.mjs';
const target = { kind: 'practice-bots', matchId: MATCH };
const document = (revision = 1, bots = ['seat-2']) => ({ schemaVersion: 1, protocolVersion: 2, matchId: MATCH, revision, policyVersion: 'practice-1', botSeatIds: bots });
const request = requestId => ({ schemaVersion: 1, protocolVersion: 2, matchId: MATCH, requestId, botCount: 1 });
const success = (host, body) => ({ schemaVersion: 1, protocolVersion: 2, matchId: MATCH, requestId: body.requestId, ok: true, serverTimeMs: host.serverNow(), revision: 2, botSeatIds: ['seat-2'] });
function setup() {
  const host = createFakeHost(), fake = createFakeConnectedTransport(host);
  fake.transport.currentUid = () => 'host-uid';
  const feed = createComicFeeds({ transport: fake.transport, ports: host.ports, matchId: MATCH });
  feed.start();
  return { host, fake, feed, api: createConnectedApi(fake.transport, host.ports) };
}
test('public practice feed distinguishes fresh legacy absence from unknown or cached data', async () => {
  const { fake, feed } = setup();
  assert.equal(feed.practiceStatus(), 'unavailable');
  await fake.deliver(target, null, false); assert.equal(feed.practiceStatus(), 'unavailable');
  await fake.deliver(target, null); assert.equal(feed.practiceStatus(), 'absent');
  await fake.deliver(target, document()); assert.deepEqual(feed.practice(), document());
  assert.equal(feed.practiceStatus(), 'current');
  await fake.fail(target, 'authorization-uncertain');
  assert.equal(feed.practice(), null); assert.equal(feed.practiceStatus(), 'unavailable');
  assert.deepEqual(documentPath(target, 'host-uid'), ['matches', MATCH, 'practice', 'public']);
  assert.equal(fake.listeners({ kind: 'player-view', matchId: MATCH }), 0);
  assert.equal(fake.listeners({ kind: 'own-acknowledgments', matchId: MATCH }), 0);
  feed.dispose();
});
test('practice metadata rejects extra secrets, wrong match, revision regression and changing a confirmed revision', async () => {
  for (const altered of [{ ...document(), role: 'Hacker' }, { ...document(), matchId: 'another-match' }, { ...document(), schemaVersion: 2 }]) {
    const { fake, feed } = setup();
    await fake.deliver(target, altered); await fake.deliver(target, document());
    assert.equal(feed.practice(), null); assert.equal(feed.practiceStatus(), 'unavailable'); feed.dispose();
  }
  for (const altered of [document(1), document(2, ['seat-3']), null]) {
    const { fake, feed } = setup(); await fake.deliver(target, document(2)); await fake.deliver(target, altered);
    assert.equal(feed.practice(), null); assert.equal(feed.practiceStatus(), 'unavailable'); feed.dispose();
  }
});
test('practice feed cannot retain membership facts across quarantine or Auth identity change', async () => {
  const { fake, feed } = setup(); await fake.deliver(target, document());
  fake.transport.currentUid = () => 'other-host';
  assert.equal(feed.practice(), null); assert.equal(feed.practiceStatus(), 'unavailable');
  feed.quarantine(); assert.equal(fake.listeners(target), 0);
  feed.dispose();
});
test('bot setup binds the response to its request and rejects malformed or mismatched successes', async () => {
  const { host, fake, api, feed } = setup();
  fake.respond.v1SetPracticeBots = async body => success(host, body);
  const result = await api.setPracticeBots(request('setup-1'));
  assert.equal(result.kind, 'done'); assert.deepEqual(result.result.botSeatIds, ['seat-2']);
  assert.equal(fake.calls[0].operation, 'v1SetPracticeBots');
  assert.deepEqual(fake.calls[0].body, request('setup-1'));
  for (const change of [value => ({ ...value, matchId: 'wrong-match' }), value => ({ ...value, requestId: 'wrong-request' }),
    value => ({ ...value, botSeatIds: [] }), value => ({ ...value, role: 'Hacker' }), value => ({ ...value, schemaVersion: 2 })]) {
    fake.respond.v1SetPracticeBots = async body => change(success(host, body));
    assert.equal((await api.setPracticeBots(request('setup-1'))).kind, 'no-response');
  }
  const before = fake.calls.length;
  await assert.rejects(() => api.setPracticeBots({ ...request('setup-1'), botCount: 10 }));
  await assert.rejects(() => api.setPracticeBots({ ...request('setup-1'), actorUid: 'someone-else' }));
  assert.equal(fake.calls.length, before); feed.dispose();
});
test('a lost setup answer keeps the original bot count/request and meaningful capacity refusals', async () => {
  const { host, fake, api, feed } = setup(); let first = true;
  const flow = createLifecycleRequests({ ids: host.ports.ids, clock: host.ports.clock });
  fake.respond.v1SetPracticeBots = async body => { if (first) { first = false; throw Error('lost reply'); } return success(host, body); };
  assert.equal((await flow.send('bots', request, body => api.setPracticeBots(body))).kind, 'unsettled');
  const result = await flow.send('bots', id => ({ ...request(id), botCount: 0 }), body => api.setPracticeBots(body));
  assert.equal(result.kind, 'done'); assert.deepEqual(fake.calls[0].body, fake.calls[1].body);
  for (const code of ['CAPACITY_EXCEEDED', 'LOBBY_LOCKED', 'FORBIDDEN', 'RATE_LIMITED']) {
    fake.respond.v1SetPracticeBots = async () => ({ schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: host.serverNow(), error: { code } });
    assert.equal((await api.setPracticeBots(request('different'))).code, code);
  }
  feed.dispose();
});
