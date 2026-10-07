import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  CREW_CATALOG_VERSION, CREW_NAME_MAX_LENGTH, CrewCharacterIdSchema, CrewDisplayNameSchema,
  FullLobbyIdentityDocumentSchema, FullSetLobbyIdentityRequestSchema, FullSetLobbyIdentityResponseSchema,
  FullOperationResponseSchema, FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema,
} from '@mothership/contracts';
import { createV1Service } from '../dist/index.js';

const request = { schemaVersion: 1, protocolVersion: 2, matchId: 'synthetic-match', requestId: 'synthetic-request', displayName: 'Supplier', characterId: 'c1' };
const document = { schemaVersion: 1, protocolVersion: 2, catalogVersion: 'crew-0.1.0', matchId: 'synthetic-match', revision: 0, locked: false,
  seats: [{ seatId: 'seat-1', displayName: null, characterId: null }] };

test('crew catalog and display names have a public bounded text contract, not role semantics', () => {
  assert.equal(CREW_CATALOG_VERSION, 'crew-0.1.0'); assert.equal(CREW_NAME_MAX_LENGTH, 12);
  for (let i = 1; i <= 9; i++) CrewCharacterIdSchema.parse('c' + i);
  for (const value of ['c0', 'c10', 'Officer', '../c1', null]) assert.equal(CrewCharacterIdSchema.safeParse(value).success, false);
  for (const value of ['Supplier', 'Officer', 'Hacker', '<b>Bob</b>', '🙂'.repeat(12), 'é'.repeat(12)]) CrewDisplayNameSchema.parse(value);
  for (const value of ['', '   ', 'x'.repeat(13), '🙂'.repeat(13), 'a\nb', '\u0000', '\ud800']) assert.equal(CrewDisplayNameSchema.safeParse(value).success, false);
});

test('identity documents require paired values, unique seats/characters and no private additions', () => {
  FullLobbyIdentityDocumentSchema.parse(document);
  FullLobbyIdentityDocumentSchema.parse({ ...document, locked: true, seats: [{ seatId: 'seat-1', displayName: 'Officer', characterId: 'c2' }] });
  for (const seats of [
    [{ seatId: 'seat-1', displayName: 'Player', characterId: null }],
    [{ seatId: 'seat-1', displayName: null, characterId: 'c1' }],
    [document.seats[0], document.seats[0]],
    [{ seatId: 'seat-1', displayName: 'A', characterId: 'c1' }, { seatId: 'seat-2', displayName: 'B', characterId: 'c1' }],
    [{ seatId: 'seat-1', displayName: 'A', characterId: 'c1', uid: 'private-uid' }],
  ]) assert.equal(FullLobbyIdentityDocumentSchema.safeParse({ ...document, seats }).success, false);
  for (const field of ['role', 'device', 'uid', 'code', 'target', 'initialRoom']) assert.equal(FullLobbyIdentityDocumentSchema.safeParse({ ...document, [field]: 'private' }).success, false);
});

test('identity request/response are separate strict versioned shapes; existing views remain unchanged', async () => {
  FullSetLobbyIdentityRequestSchema.parse(request);
  for (const key of Object.keys(request)) { const candidate = { ...request }; delete candidate[key]; assert.equal(FullSetLobbyIdentityRequestSchema.safeParse(candidate).success, false); }
  for (const field of ['uid', 'seatId', 'bindingRevision', 'role', 'catalogVersion']) assert.equal(FullSetLobbyIdentityRequestSchema.safeParse({ ...request, [field]: 'spoofed' }).success, false);
  const ack = { schemaVersion: 1, protocolVersion: 2, ok: true, serverTimeMs: 100, revision: 1 };
  FullSetLobbyIdentityResponseSchema.parse(ack);
  assert.equal(FullOperationResponseSchema.safeParse(ack).success, false);
  for (const code of ['UNAUTHENTICATED','FORBIDDEN','INVALID_REQUEST','UNSUPPORTED_PROTOCOL','UNSUPPORTED_SCHEMA','REQUEST_ID_CONFLICT','CHARACTER_TAKEN','IDENTITY_LOCKED','UNAVAILABLE','RATE_LIMITED'])
    FullSetLobbyIdentityResponseSchema.parse({ schemaVersion: 1, protocolVersion: 2, ok: false, serverTimeMs: 100, error: { code } });
  const examples = JSON.parse(await readFile(new URL('./examples/protocol2.synthetic.json', import.meta.url)));
  // The permanent existing protocol-2 catalog still parses; no identity fields are added.
  const values = JSON.stringify(examples);
  assert.equal(values.includes('characterId'), false);
  for (const schema of [FullPublicViewSchema, FullPlayerViewSchema, FullLobbyViewSchema]) assert.equal(schema.safeParse(document).success, false);
});

test('identity preflight rejects invalid/versioned/spoofed input before storage', async () => {
  const db = new Proxy({}, { get() { assert.fail('invalid request reached storage'); } });
  const service = createV1Service({ db, clock: () => 100 });
  for (const [uid, payload, code] of [
    ['', request, 'UNAUTHENTICATED'], ['uid/child', request, 'UNAUTHENTICATED'],
    ['uid', { ...request, protocolVersion: 3 }, 'UNSUPPORTED_PROTOCOL'],
    ['uid', { ...request, schemaVersion: 2 }, 'UNSUPPORTED_SCHEMA'],
    ['uid', { ...request, seatId: 'seat-2' }, 'INVALID_REQUEST'],
    ['uid', { ...request, displayName: '🙂'.repeat(13) }, 'INVALID_REQUEST'],
    ['uid', { ...request, matchId: 'bad/path' }, 'INVALID_REQUEST'],
  ]) {
    const response = FullSetLobbyIdentityResponseSchema.parse(await service.setLobbyIdentity(uid, payload));
    assert.equal(response.error.code, code);
  }
});
