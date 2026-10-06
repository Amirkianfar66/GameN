import assert from 'node:assert/strict';
import test from 'node:test';
import { createOfficerFixture } from '@mothership/contracts/fixtures';
import { createPlayerApiClient, createPublicApiClient, DEFAULT_API_TIMEOUT_MS } from '@mothership/game';
import { createFakeHost, createFakeTransport, flush } from './support/fakes.mjs';

const { command, acceptedReceipt } = createOfficerFixture('protected');
const lookup = { protocolVersion: 1, matchId: command.matchId, commandId: command.commandId };
const expiry = { protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId };

function setup(audience = 'player') {
  const host = createFakeHost();
  const fake = createFakeTransport(host, { audience });
  const client = audience === 'player' ? createPlayerApiClient(fake.transport, host.ports) : createPublicApiClient(fake.transport, host.ports);
  return { host, fake, client };
}

test('an accepted registration returns the receipt and a clock sample, and nothing about an outcome', async () => {
  const { host, fake, client } = setup();
  fake.respond.submitCommand = async () => ({ ok: true, serverTimeMs: host.serverNow(), receipt: acceptedReceipt });
  const result = await client.submit(command);
  assert.equal(result.kind, 'receipt');
  assert.deepEqual(result.receipt, acceptedReceipt);
  assert.deepEqual(Object.keys(result.receipt).sort(), ['code', 'commandId', 'matchId', 'phaseId', 'protocolVersion', 'status']);
  assert.deepEqual(result.sample, { requestedAt: 5_000, receivedAt: 5_000, serverTimeMs: 1_800_000_000_000 });
  assert.deepEqual(fake.calls.submitCommand, [command]);
});

test('game rejections stay receipts; transport errors stay failures', async () => {
  const { host, fake, client } = setup();
  for (const code of ['PHASE_CLOSED', 'NOT_ALLOWED']) {
    fake.respond.submitCommand = async () => ({ ok: true, serverTimeMs: host.serverNow(), receipt: { ...acceptedReceipt, status: 'rejected', code } });
    const result = await client.submit(command);
    assert.equal(result.kind, 'receipt');
    assert.deepEqual([result.receipt.status, result.receipt.code], ['rejected', code]);
  }
  for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'COMMAND_ID_CONFLICT', 'UNAVAILABLE']) {
    fake.respond.submitCommand = async () => ({ ok: false, serverTimeMs: host.serverNow(), error: { code } });
    const result = await client.submit(command);
    assert.deepEqual([result.kind, result.code], ['api-failure', code]);
    assert.equal(result.sample.serverTimeMs, host.serverNow());
  }
});

test('a receipt for a different command, phase or match is not trusted', async () => {
  const { host, fake, client } = setup();
  for (const field of ['commandId', 'phaseId', 'matchId']) {
    fake.respond.submitCommand = async () => ({ ok: true, serverTimeMs: host.serverNow(), receipt: { ...acceptedReceipt, [field]: 'someone-elses' } });
    assert.deepEqual(await client.submit(command), { kind: 'no-response', reason: 'unreadable-response' }, field);
  }
});

test('answers that do not satisfy the contract are unreadable, including ones with extra detail', async () => {
  const { host, fake, client } = setup();
  for (const payload of [
    null, undefined, 'ok', {}, { ok: true }, { ok: true, serverTimeMs: 1, receipt: { ...acceptedReceipt, code: 'DAMAGE_APPLIED' } },
    { ok: true, serverTimeMs: 1, receipt: { ...acceptedReceipt, targetSeatId: 'seat-2' } },
    { ok: true, serverTimeMs: 1, receipt: { ...acceptedReceipt, protection: true } },
    { ok: false, serverTimeMs: 1, error: { code: 'NOT_ALLOWED', details: 'target is protected' } },
    { ok: false, serverTimeMs: 1, error: { code: 'UNAVAILABLE', message: 'stack trace' } },
  ]) {
    fake.respond.submitCommand = async () => payload;
    assert.deepEqual(await client.submit(command), { kind: 'no-response', reason: 'unreadable-response' }, JSON.stringify(payload));
  }
  void host;
});

test('a lost connection or a thrown transport leaves the outcome unknown, not failed', async () => {
  const { fake, client } = setup();
  fake.respond.submitCommand = () => Promise.reject(new Error('socket closed'));
  assert.deepEqual(await client.submit(command), { kind: 'no-response', reason: 'transport-error' });
  fake.respond.submitCommand = () => { throw new Error('not connected'); };
  assert.deepEqual(await client.submit(command), { kind: 'no-response', reason: 'transport-error' });
});

test('a call that never answers times out, and a late answer is ignored', async () => {
  const { host, fake, client } = setup();
  let resolveLate;
  fake.respond.submitCommand = () => new Promise(resolve => { resolveLate = resolve; });
  const pending = client.submit(command);
  await host.advance(DEFAULT_API_TIMEOUT_MS - 1);
  assert.equal(host.pendingTimers(), 1);
  await host.advance(1);
  assert.deepEqual(await pending, { kind: 'no-response', reason: 'timeout' });
  resolveLate({ ok: true, serverTimeMs: host.serverNow(), receipt: acceptedReceipt });
  await flush();
  assert.equal(host.pendingTimers(), 0);
});

test('a settled call releases its timer', async () => {
  const { host, fake, client } = setup();
  fake.respond.submitCommand = async () => ({ ok: true, serverTimeMs: host.serverNow(), receipt: acceptedReceipt });
  await client.submit(command);
  await client.serverTime();
  assert.equal(host.pendingTimers(), 0);
});

test('cancelling settles every pending call and leaves no timer behind', async () => {
  const { host, fake, client } = setup();
  fake.respond.submitCommand = () => new Promise(() => {});
  fake.respond.serverTime = () => new Promise(() => {});
  const calls = [client.submit(command), client.serverTime()];
  assert.equal(host.pendingTimers(), 2);
  client.cancelPending();
  assert.deepEqual(await Promise.all(calls), [{ kind: 'no-response', reason: 'cancelled' }, { kind: 'no-response', reason: 'cancelled' }]);
  assert.equal(host.pendingTimers(), 0);
});

test('the client refuses to send a command that breaks the shared contract', async () => {
  const { fake, client } = setup();
  for (const bad of [
    { ...command, actorSeatId: 'seat-1' },
    { ...command, command: { ...command.command, damage: 1 } },
    { ...command, command: { ...command.command, identifiedSeatId: 'seat-3' } },
    { ...command, commandId: '../x' },
    { ...command, protocolVersion: 2 },
    { ...command, sentAt: 123 },
  ]) {
    await assert.rejects(() => client.submit(bad), /does not satisfy the shared contract/);
  }
  await assert.rejects(() => client.lookupReceipt({ ...lookup, callerUid: 'other' }), /shared contract/);
  await assert.rejects(() => client.advanceIfExpired({ ...expiry, now: 0 }), /shared contract/);
  await assert.rejects(() => client.advanceIfExpired({ ...expiry, force: true }), /shared contract/);
  assert.deepEqual(fake.calls.submitCommand, []);
  assert.deepEqual(fake.calls.lookupReceipt, []);
  assert.deepEqual(fake.calls.advanceIfExpired, []);
});

test('receipt lookup distinguishes found, unknown and failure, using only non-secret identifiers', async () => {
  const { host, fake, client } = setup();
  fake.respond.lookupReceipt = async () => ({ status: 'found', serverTimeMs: host.serverNow(), receipt: acceptedReceipt });
  const found = await client.lookupReceipt(lookup);
  assert.deepEqual([found.kind, found.receipt.code], ['found', 'REGISTERED']);
  assert.deepEqual(fake.calls.lookupReceipt, [{ protocolVersion: 1, matchId: 'fixture-match-a', commandId: 'fixture-command-1' }]);

  fake.respond.lookupReceipt = async () => ({ status: 'unknown', serverTimeMs: host.serverNow() });
  const unknown = await client.lookupReceipt(lookup);
  assert.equal(unknown.kind, 'unknown', 'Unknown is not a rejection');
  assert.equal('receipt' in unknown, false);

  fake.respond.lookupReceipt = async () => ({ ok: false, serverTimeMs: host.serverNow(), error: { code: 'FORBIDDEN' } });
  assert.deepEqual([(await client.lookupReceipt(lookup)).kind, (await client.lookupReceipt(lookup)).code], ['api-failure', 'FORBIDDEN']);

  fake.respond.lookupReceipt = async () => ({ status: 'found', serverTimeMs: host.serverNow(), receipt: { ...acceptedReceipt, commandId: 'another-command' } });
  assert.deepEqual(await client.lookupReceipt(lookup), { kind: 'no-response', reason: 'unreadable-response' });
});

test('expiry catch-up reports the server’s decision and carries no client clock', async () => {
  const { host, fake, client } = setup('public');
  for (const result of ['advanced', 'unchanged']) {
    fake.respond.advanceIfExpired = async request => ({ ...request, serverTimeMs: host.serverNow(), result });
    assert.equal((await client.advanceIfExpired(expiry)).kind, result);
  }
  assert.deepEqual(fake.calls.advanceIfExpired[0], { protocolVersion: 1, matchId: 'fixture-match-a', phaseId: 'phase-a' });
  fake.respond.advanceIfExpired = async request => ({ ...request, phaseId: 'phase-z', serverTimeMs: host.serverNow(), result: 'advanced' });
  assert.deepEqual(await client.advanceIfExpired(expiry), { kind: 'no-response', reason: 'unreadable-response' });
});

test('server time yields a sample bounded by the local send and receive readings', async () => {
  const { host, fake, client } = setup('public');
  fake.delayServerTime(120);
  const pending = client.serverTime();
  await host.advance(120);
  const result = await pending;
  assert.equal(result.kind, 'time');
  assert.deepEqual(result.sample, { requestedAt: 5_000, receivedAt: 5_120, serverTimeMs: 1_800_000_000_060 });
});

test('the table display’s client has no way to submit a command or read a receipt', () => {
  const { client, fake } = setup('public');
  assert.deepEqual(Object.keys(client).sort(), ['advanceIfExpired', 'cancelPending', 'serverTime']);
  assert.equal('submitCommand' in fake.transport, false);
  assert.equal('lookupReceipt' in fake.transport, false);
});
