import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PlayerViewSchema, PublicViewSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';

test('both synthetic fixtures pin source provenance and all nine canonical seats with powers off', () => {
  const mode = JSON.parse(readFileSync(new URL('../../rules/overlays/player-modes-officer.json', import.meta.url))).modes['9'];
  const hash = createHash('sha256').update(readFileSync(new URL('../../rules/source-manifest.json', import.meta.url))).digest('hex');
  for (const variant of ['protected', 'unprotected']) {
    const fixture = createOfficerFixture(variant);
    assert.equal(fixture.fixtureOnly, true);
    assert.equal(fixture.provenance.sourceManifestSha256, hash);
    assert.equal(fixture.before.public.versions.rulesetHash, hash);
    assert.equal(fixture.serverOnly.optionalPowers, false);
    assert.deepEqual(fixture.serverOnly.seats.map(s => s.role).sort(), [...mode.blue_roles, ...mode.red_roles, 'Alien'].sort());
    assert.equal(fixture.before.public.round, 2);
    assert.equal(fixture.before.public.seats[0].location, 'Room A');
    assert.equal(fixture.before.public.seats[1].location, 'Room A');
    assert.equal(fixture.serverOnly.officerOrdinaryShotsRemaining, 1);
    for (const stage of [fixture.before, fixture.afterRegistration]) {
      PublicViewSchema.parse(stage.public);
      PlayerViewSchema.parse(stage.officer);
      PlayerViewSchema.parse(stage.target);
    }
  }
});

test('Protection truth differs only in the server-only fixture; all audience payloads are identical', () => {
  const protectedFixture = createOfficerFixture('protected');
  const unprotectedFixture = createOfficerFixture('unprotected');
  assert.deepEqual(protectedFixture.before, unprotectedFixture.before);
  assert.deepEqual(protectedFixture.afterRegistration, unprotectedFixture.afterRegistration);
  assert.equal(protectedFixture.serverOnly.protection.grantedInRound, 1);
  assert.equal(protectedFixture.serverOnly.protection.activeFromRound, 2);
  assert.equal(protectedFixture.serverOnly.protection.lifetimeReceipts, 1);
  assert.equal(unprotectedFixture.serverOnly.protection, null);
});

test('authored registration examples change only the Officer snapshot and private event', () => {
  const { before, afterRegistration, command } = createOfficerFixture('protected');
  assert.deepEqual(afterRegistration.public, before.public);
  assert.deepEqual(afterRegistration.target, before.target);
  assert.deepEqual(afterRegistration.publicEvents, []);
  assert.deepEqual(afterRegistration.targetEvents, []);
  assert.equal(afterRegistration.officer.viewRevision, before.officer.viewRevision + 1);
  assert.equal(afterRegistration.officer.self.shotAvailable, false);
  assert.deepEqual(afterRegistration.officer.ownPendingCommandIds, [command.commandId]);
  assert.equal(afterRegistration.officerEvents[0].viewRevision, afterRegistration.officer.viewRevision);
  assert.equal(afterRegistration.officerEvents[0].fact.type, 'COMMAND_REGISTERED');
});

test('fixture calls return independent data for replay setup', () => {
  const changed = createOfficerFixture('protected');
  changed.before.public.seats[0].health = 'Eliminated';
  assert.equal(createOfficerFixture('protected').before.public.seats[0].health, 'Healthy');
});
