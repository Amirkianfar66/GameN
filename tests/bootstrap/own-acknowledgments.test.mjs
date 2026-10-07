import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OwnAcknowledgmentsSchema, OwnAcknowledgmentsReadSchema, ReceivedSupplySchema,
  SupplierGrantResultSchema, SeatSessionSchema, parseOwnAcknowledgments, FullPlayerViewSchema,
} from '../../packages/contracts/dist/index.js';

const result = { round: 3, commandId: 'supply-command', successfulRecipientSeatIds: ['seat-1', 'seat-2'] };
const supplier = { schemaVersion: 1, protocolVersion: 2, matchId: 'ack-contract-match', seatId: 'seat-4',
  bindingRevision: 1, revision: 2, historyAvailable: true, supplierResults: [result], receivedSupply: [] };
const recipient = { ...supplier, seatId: 'seat-1', supplierResults: [], receivedSupply: [{ round: 3, ordinaryWeaponsGranted: 1 }] };
const session = { schemaVersion: 1, protocolVersion: 2, matchId: supplier.matchId, seatId: supplier.seatId, bindingRevision: 1 };
const invalid = (schema, value) => assert.equal(schema.safeParse(value).success, false);

test('own acknowledgments distinguish successful grants, own receipt and unavailable legacy history', () => {
  for (const value of [supplier, recipient,
    { ...supplier, revision: 1, supplierResults: [] },
    { ...supplier, revision: 0, historyAvailable: false, supplierResults: [] },
    { ...supplier, supplierResults: [{ ...result, successfulRecipientSeatIds: [] }] },
    { ...supplier, bindingRevision: 2, revision: 3 },
  ]) assert.deepEqual(OwnAcknowledgmentsSchema.parse(value), value);
  assert.equal(OwnAcknowledgmentsReadSchema.parse(null), null);
});

test('strict acknowledgment schemas reject authority, secret fields and malformed resource evidence', () => {
  for (const extra of [{ uid: 'forged-identity' }, { role: 'Supplier' }, { correctCode: true }, { globalRevision: 100 }, { evaluatedAt: 100 }]) {
    invalid(OwnAcknowledgmentsSchema, { ...supplier, ...extra });
  }
  for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { bindingRevision: 0 },
    { bindingRevision: 1.5 }, { bindingRevision: Number.MAX_SAFE_INTEGER + 1 }, { revision: -1 },
    { revision: 100 }, { historyAvailable: false }, { supplierResults: [result, result], revision: 3 },
    { receivedSupply: [recipient.receivedSupply[0], recipient.receivedSupply[0]], supplierResults: [], revision: 3 },
  ]) invalid(OwnAcknowledgmentsSchema, { ...supplier, ...patch });
  for (const patch of [{ round: 2 }, { commandId: '' }, { successfulRecipientSeatIds: ['seat-1', 'seat-1'] },
    { successfulRecipientSeatIds: ['seat-1', 'seat-2', 'seat-3'] }, { successfulRecipientSeatIds: ['seat-0'] }, { supplierSeatId: 'seat-4' },
  ]) invalid(SupplierGrantResultSchema, { ...result, ...patch });
  for (const patch of [{ round: 2 }, { ordinaryWeaponsGranted: 2 }, { supplierSeatId: 'seat-4' },
    { commandId: result.commandId }, { otherRecipientSeatIds: ['seat-2'] },
  ]) invalid(ReceivedSupplySchema, { ...recipient.receivedSupply[0], ...patch });
});

test('own acknowledgment parsing binds match, seat and current recovery revision with an explicit missing-document fallback', () => {
  const expected = { matchId: supplier.matchId, seatId: supplier.seatId, bindingRevision: 1 };
  assert.deepEqual(parseOwnAcknowledgments(supplier, expected), supplier);
  for (const payload of [null, undefined]) assert.equal(parseOwnAcknowledgments(payload, expected), null);
  for (const patch of [{ matchId: 'another-match' }, { seatId: 'seat-1' }, { bindingRevision: 2 }]) {
    assert.throws(() => parseOwnAcknowledgments(supplier, { ...expected, ...patch }), /audience or binding does not match/u);
  }
  assert.throws(() => parseOwnAcknowledgments({ ...supplier, revision: 99 }, expected));
});

test('seat sessions expose only the strict own-seat binding metadata', () => {
  assert.deepEqual(SeatSessionSchema.parse(session), session);
  assert.deepEqual(SeatSessionSchema.parse({ ...session, bindingRevision: 2 }), { ...session, bindingRevision: 2 });
  for (const extra of [{ uid: 'forged-identity' }, { role: 'Supplier' }, { recoveryToken: 'forged-token' }, { revision: 1 }]) {
    invalid(SeatSessionSchema, { ...session, ...extra });
  }
  for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { seatId: 'seat-0' }, { bindingRevision: 0 }, { bindingRevision: 1.5 }]) {
    invalid(SeatSessionSchema, { ...session, ...patch });
  }
});

test('existing strict protocol-2 player views still parse exactly and reject acknowledgment fields', () => {
  const view = {
    versions: { protocolVersion: 2, rulesetVersion: 'in-person-v1-2026-10-06', rulesetHash: 'a'.repeat(64), engineVersion: 'full-game-1.0.0', assetManifestVersion: 'legacy-assets-v1' },
    matchId: supplier.matchId, viewRevision: 7, playerCount: 7, round: 3,
    phase: { id: 'legacy-phase', kind: 'ORDINARY_TURN', startedAt: 1_000, endsAt: 61_000 }, activeSeatId: 'seat-4',
    audience: { kind: 'player', seatId: 'seat-4' },
    seats: Array.from({ length: 7 }, (_, index) => ({ seatId: `seat-${index + 1}`, health: 'Healthy', location: 'Room A', jailed: false, captain: false, revealedFaction: null })),
    ballot: { eligibleVoters: [], eligibleTargets: [], releaseTargetSeatId: null }, lastTally: null, result: null, endReveal: null,
    self: { seatId: 'seat-4', role: 'Supplier', movementDestinations: ['Room B'], releaseVoteAvailable: false, ordinaryWeapons: 0,
      shotAvailable: false, rescuesRemaining: 0, disablerAvailable: false, hackAvailable: false, scanAvailable: false, codeAttemptAvailable: false },
    knowledge: { insiderCandidates: [], undercoverSeatId: null, code: [], scanResults: [], protections: [] },
    legalTargets: { SUPPLY: ['seat-1', 'seat-2'] }, ownPendingCommandIds: [], ownBallot: null, hasVoted: false, hackPartnerSeatId: null,
  };
  assert.deepEqual(FullPlayerViewSchema.parse(view), view);
  for (const patch of [{ ownAcknowledgments: supplier }, { supplierResults: supplier.supplierResults }, { receivedSupply: recipient.receivedSupply }]) {
    invalid(FullPlayerViewSchema, { ...view, ...patch });
  }
});
