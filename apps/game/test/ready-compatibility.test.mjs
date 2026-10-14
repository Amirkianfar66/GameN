import assert from 'node:assert/strict';
import test from 'node:test';
import { DECLARED_HACK_VERSION_PINS, VOTE_RESULT_VERSION_PINS } from '@mothership/contracts';
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
test('Ready accepts only the reviewed 1.4/0.2 and 1.5/0.3 release pairs after every player bundle loads',()=>{
  const releases=[versions,{...DECLARED_HACK_VERSION_PINS,assetManifestVersion:'design-0.3.0'}];
  for(const release of releases) {
    assert.deepEqual(readyCompatibility(release,loaded),{kind:'supported',acceptedVersions:release});
    for(const omitted of loaded.bundles) {
      const bundles=loaded.bundles.filter(bundle=>bundle!==omitted);
      assert.deepEqual(readyCompatibility(release,{bundles,settled:false}),{kind:'loading',acceptedVersions:null});
      assert.deepEqual(readyCompatibility(release,{bundles,settled:true}),{kind:'reload',acceptedVersions:null});
    }
  }
  for(const crossed of [{...VOTE_RESULT_VERSION_PINS,assetManifestVersion:'design-0.3.0'},{...DECLARED_HACK_VERSION_PINS,assetManifestVersion:'design-0.2.0'},{...DECLARED_HACK_VERSION_PINS,assetManifestVersion:'unknown-assets'}])
    assert.deepEqual(readyCompatibility(crossed,loaded),{kind:'reload',acceptedVersions:null});
});
