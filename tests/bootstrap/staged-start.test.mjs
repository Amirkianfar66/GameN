import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SETUP_LIFECYCLE_VERSION, FullSetupDocumentSchema, FullSetupPlayerViewSchema,
  FullBeginSetupRequestSchema, FullConfirmSetupChoiceRequestSchema, FullReadyForMatchRequestSchema,
  FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema,
  FullLobbyViewSchema, FullStartMatchRequestSchema,
} from '../../packages/contracts/dist/index.js';

const wire = { schemaVersion: 1, protocolVersion: 2 };
const request = { ...wire, matchId: 'setup-match', requestId: 'setup-request' };
const versions = { protocolVersion: 2, rulesetVersion: 'in-person-v1-2026-10-06',
  rulesetHash: '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90',
  engineVersion: 'full-game-1.1.0', assetManifestVersion: 'comic.1.0' };
const seats = (count, confirmed = false, ready = false) => Array.from({ length: count }, (_, index) => ({
  seatId: `seat-${index + 1}`, confirmed, ready,
}));
const setup = (playerCount = 7, stage = 'choosing') => ({ ...wire, lifecycleVersion: SETUP_LIFECYCLE_VERSION,
  matchId: request.matchId, playerCount, revision: 1, stage, dealId: null, seats: seats(playerCount) });
const preview = (playerCount = 7, role = 'Insider', seatId = 'seat-1') => ({
  ...wire, lifecycleVersion: SETUP_LIFECYCLE_VERSION, versions, matchId: request.matchId, playerCount,
  dealId: 'prepared-deal', bindingRevision: 1, audience: { kind: 'player', seatId }, self: { seatId, role },
});
const confirmation = { ...request, bindingRevision: 1, displayName: 'Pilot', characterId: 'c1' };
const readiness = { ...request, dealId: 'prepared-deal', bindingRevision: 1 };
const response = { ...request, ok: true, serverTimeMs: 1_000, revision: 2 };
const ownResponse = { ...response, seatId: 'seat-1', bindingRevision: 1 };
const responseSchemas = [FullBeginSetupResponseSchema, FullConfirmSetupChoiceResponseSchema, FullReadyForMatchResponseSchema];
const invalid = (schema, value) => assert.equal(schema.safeParse(value).success, false);
const valid = (schema, value) => assert.deepEqual(schema.parse(value), value);

for (const count of [7, 8, 9]) {
  test(`neutral setup supports the ${count}-seat lifecycle without role or gameplay facts`, () => {
    const choosing = setup(count);
    valid(FullSetupDocumentSchema, { ...choosing, stage: 'lobby', seats: [] });
    valid(FullSetupDocumentSchema, { ...choosing, stage: 'lobby', seats: [choosing.seats[0], choosing.seats[count - 1]] });
    valid(FullSetupDocumentSchema, choosing);
    valid(FullSetupDocumentSchema, { ...choosing, seats: seats(count, true) });
    const awaiting = { ...choosing, stage: 'awaiting-ready', dealId: 'prepared-deal', seats: seats(count, true) };
    valid(FullSetupDocumentSchema, awaiting);
    valid(FullSetupDocumentSchema, { ...awaiting, seats: seats(count, true, true) });
    valid(FullSetupDocumentSchema, { ...awaiting, stage: 'running', seats: seats(count, true, true) });
    valid(FullSetupDocumentSchema, { ...choosing, stage: 'aborted', seats: [] });
    valid(FullSetupDocumentSchema, { ...awaiting, stage: 'aborted', seats: [seats(count, true, true)[0]] });
  });
}

test('setup roster rejects duplicate, unsorted, out-of-mode and non-neutral seat records', () => {
  const value = setup();
  for (const roster of [value.seats.slice(1), [...value.seats].reverse(), [...value.seats.slice(0, 6), value.seats[0]],
    [...value.seats.slice(0, 6), { seatId: 'seat-8', confirmed: false, ready: false }]]) {
    invalid(FullSetupDocumentSchema, { ...value, seats: roster });
  }
  for (const extra of [{ uid: 'private-user' }, { role: 'Alien' }, { initialRoom: 'Room A' }, { bindingRevision: 1 }]) {
    invalid(FullSetupDocumentSchema, { ...value, seats: [{ ...value.seats[0], ...extra }, ...value.seats.slice(1)] });
  }
  invalid(FullSetupDocumentSchema, { ...value, stage: 'aborted', seats: [{ seatId: 'seat-1', confirmed: false, ready: true }] });
});

test('setup stages reject premature dealing, readiness and incomplete confirmation', () => {
  const choosing = setup(), awaiting = { ...choosing, stage: 'awaiting-ready', dealId: 'prepared-deal', seats: seats(7, true) };
  for (const value of [
    { ...choosing, stage: 'lobby', seats: seats(7, true) },
    { ...choosing, stage: 'lobby', dealId: 'premature-deal' },
    { ...choosing, dealId: 'premature-deal' },
    { ...choosing, seats: seats(7, true, true) },
    { ...awaiting, dealId: null }, { ...awaiting, seats: seats(6, true) },
    { ...awaiting, seats: choosing.seats }, { ...awaiting, stage: 'running' },
    { ...awaiting, stage: 'running', dealId: null, seats: seats(7, true, true) },
    { ...choosing, stage: 'complete' },
  ]) invalid(FullSetupDocumentSchema, value);
});

test('public setup strictly rejects role truth, authority and unreviewed versions', () => {
  const value = setup();
  for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { lifecycleVersion: 'another-lifecycle' },
    { matchId: '' }, { playerCount: 6 }, { revision: -1 }, { revision: Number.MAX_SAFE_INTEGER + 1 },
    { roleOrder: ['Insider'] }, { code: ['seat-1'] }, { uid: 'private-user' }, { phase: 'ORDINARY_TURN' },
    { versions }, { deadlineToken: 'private-token' }]) invalid(FullSetupDocumentSchema, { ...value, ...patch });
});

for (const count of [7, 8, 9]) {
  test(`own role preview respects audience and ${count}-player role availability`, () => {
    const roles = ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien',
      ...(count >= 8 ? ['Red Disabler'] : []), ...(count === 9 ? ['Officer'] : [])];
    for (const role of roles) valid(FullSetupPlayerViewSchema, preview(count, role, `seat-${count}`));
    if (count < 9) invalid(FullSetupPlayerViewSchema, preview(count, 'Officer'));
    if (count < 8) invalid(FullSetupPlayerViewSchema, preview(count, 'Red Disabler'));
  });
}

test('own role preview cannot carry starting knowledge or live gameplay affordances', () => {
  const value = preview();
  for (const extra of [{ knowledge: { insiderCandidates: ['seat-2', 'seat-3', 'seat-4'] } }, { roleOrder: ['Insider'] },
    { code: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] }, { legalTargets: {} }, { phase: { kind: 'ORDINARY_TURN' } },
    { revision: 1 }, { uid: 'private-user' }, { ready: true }]) invalid(FullSetupPlayerViewSchema, { ...value, ...extra });
  for (const extra of [{ ordinaryWeapons: 1 }, { shotAvailable: true }, { faction: 'Blue' }]) {
    invalid(FullSetupPlayerViewSchema, { ...value, self: { ...value.self, ...extra } });
  }
});

test('own role preview binds protocol, deal, seat and positive recovery revision', () => {
  const value = preview();
  for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { lifecycleVersion: 'other-start' },
    { versions: { ...versions, protocolVersion: 1 } }, { dealId: null }, { dealId: '' },
    { bindingRevision: 0 }, { bindingRevision: 1.5 }, { bindingRevision: Number.MAX_SAFE_INTEGER + 1 },
    { audience: { kind: 'public' } }, { audience: { kind: 'player', seatId: 'seat-2' } },
    { audience: { kind: 'player', seatId: 'seat-8' }, self: { seatId: 'seat-8', role: 'Insider' } },
  ]) invalid(FullSetupPlayerViewSchema, { ...value, ...patch });
  valid(FullSetupPlayerViewSchema, { ...value, bindingRevision: 2 });
});

test('startup requests are strict explicit intent and bind readiness to its prepared deal', () => {
  for (const [schema, value] of [[FullBeginSetupRequestSchema, request],
    [FullConfirmSetupChoiceRequestSchema, confirmation], [FullReadyForMatchRequestSchema, readiness]]) {
    valid(schema, value);
    for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { requestId: '' }, { matchId: '' },
      { uid: 'forged-user' }, { seatId: 'seat-2' }, { now: 1 }, { role: 'Officer' }, { lifecycleVersion: SETUP_LIFECYCLE_VERSION }]) {
      invalid(schema, { ...value, ...patch });
    }
  }
  for (const schema of [FullConfirmSetupChoiceRequestSchema, FullReadyForMatchRequestSchema]) {
    const value = schema === FullConfirmSetupChoiceRequestSchema ? confirmation : readiness;
    for (const bindingRevision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) invalid(schema, { ...value, bindingRevision });
  }
  for (const patch of [{ displayName: '' }, { displayName: ' '.repeat(3) }, { displayName: 'a'.repeat(13) },
    { displayName: 'name\u0000' }, { characterId: 'c10' }, { displayName: undefined }, { characterId: undefined }]) {
    invalid(FullConfirmSetupChoiceRequestSchema, { ...confirmation, ...patch });
  }
  invalid(FullReadyForMatchRequestSchema, { ...readiness, dealId: null });
  invalid(FullReadyForMatchRequestSchema, { ...readiness, dealId: '' });
  const noDeal = { ...readiness }; delete noDeal.dealId; invalid(FullReadyForMatchRequestSchema, noDeal);
});

test('Begin supports choosing and immediate all-bot running, with matching deal availability', () => {
  for (const value of [{ ...response, stage: 'choosing', dealId: null },
    { ...response, stage: 'running', dealId: 'prepared-deal' }]) valid(FullBeginSetupResponseSchema, value);
  for (const patch of [{ stage: 'awaiting-ready', dealId: 'prepared-deal' }, { stage: 'choosing', dealId: 'prepared-deal' },
    { stage: 'running', dealId: null }]) invalid(FullBeginSetupResponseSchema, { ...response, ...patch });
});

test('Confirm and Ready successes identify their own binding and distinct startup stages', () => {
  for (const value of [{ ...ownResponse, stage: 'choosing', dealId: null },
    { ...ownResponse, stage: 'awaiting-ready', dealId: 'prepared-deal' }]) valid(FullConfirmSetupChoiceResponseSchema, value);
  for (const value of [{ ...ownResponse, stage: 'awaiting-ready', dealId: 'prepared-deal' },
    { ...ownResponse, stage: 'running', dealId: 'prepared-deal' }]) valid(FullReadyForMatchResponseSchema, value);
  for (const patch of [{ stage: 'choosing', dealId: 'prepared-deal' }, { stage: 'awaiting-ready', dealId: null },
    { stage: 'running', dealId: 'prepared-deal' }]) invalid(FullConfirmSetupChoiceResponseSchema, { ...ownResponse, ...patch });
  for (const patch of [{ stage: 'choosing', dealId: null }, { stage: 'awaiting-ready', dealId: null },
    { stage: 'aborted', dealId: 'prepared-deal' }]) invalid(FullReadyForMatchResponseSchema, { ...ownResponse, ...patch });
});

test('startup success envelopes require request binding and reject extra authority or secret fields', () => {
  const values = [{ ...response, stage: 'choosing', dealId: null },
    { ...ownResponse, stage: 'choosing', dealId: null }, { ...ownResponse, stage: 'awaiting-ready', dealId: 'prepared-deal' }];
  responseSchemas.forEach((schema, index) => {
    const value = values[index];
    for (const key of ['matchId', 'requestId', 'schemaVersion', 'protocolVersion', 'revision', 'dealId', 'stage']) {
      const missing = { ...value }; delete missing[key]; invalid(schema, missing);
    }
    for (const patch of [{ schemaVersion: 2 }, { protocolVersion: 1 }, { revision: -1 }, { role: 'Alien' },
      { code: ['seat-1'] }, { verifiedUid: 'private-user' }, { lifecycleVersion: SETUP_LIFECYCLE_VERSION }]) {
      invalid(schema, { ...value, ...patch });
    }
    if (index !== 0) for (const patch of [{ seatId: 'seat-0' }, { bindingRevision: 0 }]) invalid(schema, { ...value, ...patch });
  });
});

test('startup failures preserve typed recoverable causes without error text or private payloads', () => {
  const codes = ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_REQUEST', 'UNSUPPORTED_PROTOCOL', 'UNSUPPORTED_SCHEMA',
    'REQUEST_ID_CONFLICT', 'UNAVAILABLE', 'RATE_LIMITED', 'ROSTER_INCOMPLETE', 'CHARACTER_TAKEN',
    'NAME_TAKEN', 'SETUP_LOCKED', 'STALE_DEAL', 'STALE_BINDING'];
  for (const schema of responseSchemas) {
    for (const code of codes) valid(schema, { ...wire, ok: false, serverTimeMs: 1_000, error: { code, retryAfterMs: 250 } });
    const value = { ...wire, ok: false, serverTimeMs: 1_000, error: { code: 'STALE_DEAL' } };
    valid(schema, value);
    for (const error of [{ code: 'RAW_DATABASE_ERROR' }, { code: 'STALE_DEAL', message: 'private detail' },
      { code: 'STALE_DEAL', retryAfterMs: -1 }, { code: 'STALE_DEAL', retryAfterMs: null },
      { code: 'STALE_DEAL', dealId: 'another-deal' }]) invalid(schema, { ...value, error });
    invalid(schema, { ...value, role: 'Alien' });
  }
});

test('existing strict lobby and start contracts remain unchanged by additive startup documents', () => {
  const lobby = { protocolVersion: 2, matchId: request.matchId, playerCount: 7, status: 'lobby', seats: [] };
  valid(FullLobbyViewSchema, lobby);
  invalid(FullLobbyViewSchema, { ...lobby, stage: 'choosing' });
  const legacyStart = { protocolVersion: 2, matchId: request.matchId, requestId: request.requestId };
  valid(FullStartMatchRequestSchema, legacyStart);
  invalid(FullStartMatchRequestSchema, { ...legacyStart, schemaVersion: 1 });
});
