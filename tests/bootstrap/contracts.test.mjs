import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AdvanceIfExpiredRequestSchema, AdvanceIfExpiredResponseSchema, ApiFailureSchema, CommandResponseSchema,
  PhaseSchema, PlayerViewSchema, PublicViewSchema, ReceiptLookupRequestSchema, ReceiptLookupResponseSchema,
  ReceiptSchema, RegisterShotSchema, ServerTimeResponseSchema,
} from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';

test('direct-shot command carries context but no client authority or archived identification', () => {
  const { command } = createOfficerFixture('protected');
  assert.deepEqual(RegisterShotSchema.parse(command), command);
  for (const field of ['actorUid', 'actorSeatId', 'evaluatedAt', 'damage', 'role']) {
    assert.equal(RegisterShotSchema.safeParse({ ...command, [field]: 'untrusted' }).success, false, field);
  }
  for (const field of ['identifiedSeatId', 'guessedFaction', 'damage']) {
    assert.equal(RegisterShotSchema.safeParse({ ...command, command: { ...command.command, [field]: 'untrusted' } }).success, false, field);
  }
});

test('malformed IDs, missing fields, unexpected versions and unknown actions fail closed', () => {
  const { command } = createOfficerFixture('unprotected');
  for (const value of [null, {}, { ...command, protocolVersion: 2 }, { ...command, commandId: '../secret' }, { ...command, matchId: '' }, { ...command, phaseId: 'x'.repeat(129) }, { ...command, command: { type: 'SKIP_VOTE' } }, { ...command, command: { ...command.command, targetSeatId: 'seat-10' } }]) {
    assert.equal(RegisterShotSchema.safeParse(value).success, false);
  }
});

test('accepted registration, game rejection, transport failure and unknown outcome stay distinct', () => {
  const { acceptedReceipt } = createOfficerFixture('protected');
  assert.ok(ReceiptSchema.safeParse(acceptedReceipt).success);
  assert.ok(ReceiptSchema.safeParse({ ...acceptedReceipt, status: 'rejected', code: 'NOT_ALLOWED' }).success);
  for (const extra of [{ code: 'DAMAGE_APPLIED' }, { code: 'PHASE_CLOSED' }, { status: 'unknown' }, { protection: true }]) {
    assert.equal(ReceiptSchema.safeParse({ ...acceptedReceipt, ...extra }).success, false);
  }
  assert.ok(CommandResponseSchema.safeParse({ ok: true, serverTimeMs: 123, receipt: acceptedReceipt }).success);
  assert.ok(ApiFailureSchema.safeParse({ ok: false, serverTimeMs: 123, error: { code: 'COMMAND_ID_CONFLICT' } }).success);
  assert.equal(ApiFailureSchema.safeParse({ ok: false, serverTimeMs: 123, error: { code: 'NOT_ALLOWED', details: 'secret' } }).success, false);
  assert.ok(ReceiptLookupResponseSchema.safeParse({ status: 'unknown', serverTimeMs: 123 }).success);
  assert.ok(ReceiptLookupResponseSchema.safeParse({ status: 'found', serverTimeMs: 123, receipt: acceptedReceipt }).success);
});

test('receipt recovery needs only non-secret IDs; expiry catch-up cannot carry a clock or scheduler token', () => {
  const { command } = createOfficerFixture('protected');
  const lookup = { protocolVersion: 1, matchId: command.matchId, commandId: command.commandId };
  assert.ok(ReceiptLookupRequestSchema.safeParse(lookup).success);
  assert.equal(ReceiptLookupRequestSchema.safeParse({ ...lookup, callerUid: 'other-player' }).success, false);
  const expiry = { protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId };
  assert.ok(AdvanceIfExpiredRequestSchema.safeParse(expiry).success);
  for (const extra of [{ now: 0 }, { deadlineToken: 'private-token' }, { force: true }]) {
    assert.equal(AdvanceIfExpiredRequestSchema.safeParse({ ...expiry, ...extra }).success, false);
  }
  assert.ok(AdvanceIfExpiredResponseSchema.safeParse({ ...expiry, serverTimeMs: 123, result: 'unchanged' }).success);
  assert.ok(ServerTimeResponseSchema.safeParse({ protocolVersion: 1, serverTimeMs: 123 }).success);
});

test('public schema rejects private facts at every represented level', () => {
  const view = createOfficerFixture('protected').before.public;
  for (const field of ['self', 'roles', 'code', 'protection', 'pendingTargets', 'internalSequence', 'updatedAt']) {
    assert.equal(PublicViewSchema.safeParse({ ...view, [field]: 'private' }).success, false, field);
  }
  for (const field of ['role', 'faction', 'weapon', 'protection']) {
    const altered = structuredClone(view);
    altered.seats[0][field] = 'private';
    assert.equal(PublicViewSchema.safeParse(altered).success, false, field);
  }
  const altered = structuredClone(view);
  altered.phase.deadlineToken = 'server-only';
  assert.equal(PublicViewSchema.safeParse(altered).success, false);
});

test('composed player view is bound to its seat and cannot be parsed as public', () => {
  const { before } = createOfficerFixture('protected');
  assert.ok(PlayerViewSchema.safeParse(before.officer).success);
  assert.equal(PublicViewSchema.safeParse(before.officer).success, false);
  assert.equal(PlayerViewSchema.safeParse({ ...before.officer, audience: { kind: 'player', seatId: 'seat-2' } }).success, false);
  assert.equal(PlayerViewSchema.safeParse({ ...before.target, self: { ...before.target.self, protection: true } }).success, false);
  for (const seats of [before.public.seats.slice(1), before.public.seats.map(() => before.public.seats[0])]) {
    assert.equal(PublicViewSchema.safeParse({ ...before.public, seats }).success, false);
  }
});

test('phase encoding preserves 60 seconds and leaves resolution without an invented deadline', () => {
  const phase = createOfficerFixture('protected').before.public.phase;
  assert.ok(PhaseSchema.safeParse(phase).success);
  for (const endsAt of [phase.startedAt, phase.startedAt + 59_999, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(PhaseSchema.safeParse({ ...phase, endsAt }).success, false);
  }
  assert.ok(PhaseSchema.safeParse({ id: 'resolution', kind: 'ROUND_RESOLUTION', startedAt: phase.endsAt, endsAt: null }).success);
  assert.equal(PhaseSchema.safeParse({ ...phase, kind: 'VOTE' }).success, false);
});
