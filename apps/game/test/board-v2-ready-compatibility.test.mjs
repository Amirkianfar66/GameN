import assert from 'node:assert/strict';
import test from 'node:test';
import { HOSPITAL_FOUR_VERSION_PINS, CLONE_VERSION_PINS, BLACKOUT_VERSION_PINS, DECLARED_HACK_VERSION_PINS } from '@mothership/contracts';
import { readyCompatibility } from '../hosted/ready-compatibility.mjs';
import { bundlesFor } from '../hosted/art.mjs';

const versions = { ...CLONE_VERSION_PINS, assetManifestVersion: 'design-0.4.0' };
const complete = [...bundlesFor('player'), 'board-v2-art', 'setup-art', 'board-v2-motion-art'];
test('new Ready echoes only the exact complete gameplay and loaded artwork agreement', () => {
  assert.deepEqual(readyCompatibility(versions, { bundles: complete, settled: true }), { kind: 'supported', acceptedVersions: versions });
  for (const missing of complete) for (const settled of [false, true]) {
    assert.deepEqual(readyCompatibility(versions, { bundles: complete.filter(name => name !== missing), settled }),
      { kind: settled ? 'reload' : 'loading', acceptedVersions: null });
  }
});
test('intermediate or crossed tuples cannot borrow the new Ready acknowledgment', () => {
  for (const wrong of [{ ...versions, assetManifestVersion: 'design-0.3.0' }, { ...BLACKOUT_VERSION_PINS, assetManifestVersion: 'design-0.4.0' },
    { ...DECLARED_HACK_VERSION_PINS, assetManifestVersion: 'design-0.4.0' }, { ...versions, rulesetHash: DECLARED_HACK_VERSION_PINS.rulesetHash }]) {
    assert.deepEqual(readyCompatibility(wrong, { bundles: complete, settled: true }), { kind: 'reload', acceptedVersions: null });
  }
  assert.equal(readyCompatibility({ ...DECLARED_HACK_VERSION_PINS, assetManifestVersion: 'design-0.3.0' },
    { bundles: bundlesFor('player'), settled: true }).kind, 'supported');
});

test('four-bed Ready requires the exact gameplay/art pair and all nine bundles; historical agreements remain valid',()=>{
 const next={...HOSPITAL_FOUR_VERSION_PINS,assetManifestVersion:'design-0.5.0'},all=[...complete,'board-v2-films-art'];
 assert.deepEqual(readyCompatibility(next,{bundles:all,settled:true}),{kind:'supported',acceptedVersions:next});
 for(const missing of all)assert.equal(readyCompatibility(next,{bundles:all.filter(n=>n!==missing),settled:true}).kind,'reload');
 for(const v of [{...versions,assetManifestVersion:'design-0.5.0'},{...next,assetManifestVersion:'design-0.4.0'}])assert.equal(readyCompatibility(v,{bundles:all,settled:true}).kind,'reload');
});
