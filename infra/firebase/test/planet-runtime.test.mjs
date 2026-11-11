import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPlanetRuntimeEnvironment} from '../dist/planet-runtime.js';
const emulator={GCLOUD_PROJECT:'demo-mothership',FUNCTIONS_EMULATOR:'true',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9199',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8180',MOTHERSHIP_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5101'};
test('Planet creation is explicitly off by default and independently configures reviewed artwork',()=>{
  assert.equal(assertPlanetRuntimeEnvironment(emulator).creationEnabled,false);
  const result=assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_CREATION_ENABLED:'true',MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.6.0'});
  assert.equal(result.creationEnabled,true);assert.equal(result.assetManifestVersion,'design-0.6.0');assert.equal(result.creationVersions,undefined);
});
test('Planet production needs explicit art and preserves project/emulator/origin guards',()=>{
  for(const environment of [{GCLOUD_PROJECT:'production'},{...emulator,FIRESTORE_EMULATOR_HOST:'remote.example:8180'},{...emulator,GCLOUD_PROJECT:'production'},{...emulator,MOTHERSHIP_PLANET_CREATION_ENABLED:'yes'},{...emulator,MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'../escape'}])assert.throws(()=>assertPlanetRuntimeEnvironment(environment));
  const result=assertPlanetRuntimeEnvironment({GCLOUD_PROJECT:'staging-project',MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.6.0',MOTHERSHIP_ALLOWED_ORIGINS:'["https://staging.example"]'});
  assert.equal(result.emulator,false);assert.equal(result.assetManifestVersion,'design-0.6.0');assert.deepEqual(result.allowedOrigins,['https://staging.example']);
  assert.throws(()=>assertPlanetRuntimeEnvironment({GCLOUD_PROJECT:'staging-project',MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'0.0.0-no-assets'}));
});
test('boarding creation flow is independent of artwork and absent by default or explicit legacy selection',()=>{
  const legacy=assertPlanetRuntimeEnvironment(emulator);
  assert.equal(Object.hasOwn(legacy,'setupFlowVersion'),false);
  assert.deepEqual(assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:'1'}),legacy);
  for(const assetManifestVersion of ['design-0.6.0','design-0.7.0']){
    const settings={...emulator,MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:assetManifestVersion};
    assert.equal(Object.hasOwn(assertPlanetRuntimeEnvironment(settings),'setupFlowVersion'),false);
    const selected=assertPlanetRuntimeEnvironment({...settings,MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:'2'});
    assert.equal(selected.setupFlowVersion,2);assert.equal(selected.assetManifestVersion,assetManifestVersion);
    assert.equal(selected.creationEnabled,false,'The setup setting cannot itself enable match creation');
  }
});
test('unsupported setup flow settings fail startup and production accepts the explicit supported flow',()=>{
  for(const setupFlowVersion of ['','0','3','02','boarding','true',' 2']){
    assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:setupFlowVersion}),/Unsupported Planet setup flow/);
  }
  const selected=assertPlanetRuntimeEnvironment({GCLOUD_PROJECT:'staging-project',MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.7.0',
    MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:'2',MOTHERSHIP_ALLOWED_ORIGINS:'["https://staging.example"]'});
  assert.equal(selected.setupFlowVersion,2);assert.equal(selected.creationEnabled,false);assert.equal(selected.emulator,false);
});
