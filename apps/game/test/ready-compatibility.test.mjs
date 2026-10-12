import assert from 'node:assert/strict';
import test from 'node:test';
import { VOTE_RESULT_VERSION_PINS } from '@mothership/contracts';
import { readyCompatibility } from '../hosted/ready-compatibility.mjs';
import { bundlesFor } from '../hosted/art.mjs';
const versions={...VOTE_RESULT_VERSION_PINS,assetManifestVersion:'design-0.2.0'};
const loaded={bundles:bundlesFor('player'),settled:true};

test('Ready compatibility refuses mixed/unknown pins and missing complete art',()=>{
  assert.deepEqual(readyCompatibility(versions,loaded),{kind:'supported',acceptedVersions:versions});
  for(const changed of [{engineVersion:'full-game-99.0.0'},{rulesetHash:'a'.repeat(64)},{rulesetVersion:'unknown-ruleset'},{assetManifestVersion:'unknown-assets'}])
    assert.deepEqual(readyCompatibility({...versions,...changed},loaded),{kind:'reload',acceptedVersions:null});
  assert.deepEqual(readyCompatibility(versions,{bundles:['roles'],settled:false}),{kind:'loading',acceptedVersions:null});
  assert.deepEqual(readyCompatibility(versions,{bundles:['roles'],settled:true}),{kind:'reload',acceptedVersions:null});
});
