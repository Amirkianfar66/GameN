import assert from 'node:assert/strict';
import test from 'node:test';
import { VOTE_RESULT_VERSION_PINS, DECLARED_HACK_VERSION_PINS, CLONE_VERSION_PINS } from '@mothership/contracts';
import { readyTestAcknowledgment } from '../test-emulator/support/match.mjs';
test('the SDK harness adopts only explicit gameplay/art pairs, retaining its no-art fixtures',()=>{
 for(const [pins,art] of [[VOTE_RESULT_VERSION_PINS,'design-0.2.0'],[DECLARED_HACK_VERSION_PINS,'design-0.3.0'],[VOTE_RESULT_VERSION_PINS,'0.0.0-no-assets'],[DECLARED_HACK_VERSION_PINS,'0.0.0-no-assets']]) {
  const versions={...pins,assetManifestVersion:art};assert.deepEqual(readyTestAcknowledgment(versions),{acceptedVersions:versions});
 }
 for(const [pins,art] of [[VOTE_RESULT_VERSION_PINS,'design-0.3.0'],[DECLARED_HACK_VERSION_PINS,'design-0.2.0'],[DECLARED_HACK_VERSION_PINS,'unknown-art']])
  assert.throws(()=>readyTestAcknowledgment({...pins,assetManifestVersion:art}),/Known emulator gameplay and artifact pair/);
});

test('new Clone Ready harness adopts only its exact art pair and preserves no-assets fixtures',()=>{
 const versions={...CLONE_VERSION_PINS,assetManifestVersion:'design-0.4.0'};assert.deepEqual(readyTestAcknowledgment(versions),{acceptedVersions:versions});
 assert.throws(()=>readyTestAcknowledgment({...versions,assetManifestVersion:'design-0.3.0'}),/Known emulator gameplay/);
 assert.throws(()=>readyTestAcknowledgment({...DECLARED_HACK_VERSION_PINS,assetManifestVersion:'design-0.4.0'}),/Known emulator gameplay/);
 assert.ok(readyTestAcknowledgment({...versions,assetManifestVersion:'0.0.0-no-assets'}));
});
