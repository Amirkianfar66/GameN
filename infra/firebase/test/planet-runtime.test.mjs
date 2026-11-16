import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPlanetRuntimeEnvironment} from '../dist/planet-runtime.js';
import {PLANET_PHONE_ENGINE_PROFILE,PLANET_FOOD_TASK_ENGINE_PROFILE} from '@mothership/contracts';
import {PLANET_FOOD_OWNER_INBOX_PROFILE} from '@mothership/game-api';
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
  for(const setupFlowVersion of ['','0','4','02','boarding','true',' 2']){
    assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:setupFlowVersion}),/Unsupported Planet setup flow/);
  }
  const selected=assertPlanetRuntimeEnvironment({GCLOUD_PROJECT:'staging-project',MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.7.0',
    MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:'2',MOTHERSHIP_ALLOWED_ORIGINS:'["https://staging.example"]'});
  assert.equal(selected.setupFlowVersion,2);assert.equal(selected.creationEnabled,false);assert.equal(selected.emulator,false);
});
test('timed reading and the phone engine profile are independent opt-ins and neither enables creation or selects artwork',()=>{
  for(const setupFlowVersion of [undefined,'1','2','3'])for(const engineProfile of [undefined,PLANET_PHONE_ENGINE_PROFILE]){
    const selected=assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:setupFlowVersion,
      MOTHERSHIP_PLANET_ENGINE_PROFILE:engineProfile,MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.8.0'});
    assert.equal(selected.setupFlowVersion,setupFlowVersion==='2'?2:setupFlowVersion==='3'?3:undefined);
    assert.equal(selected.engineProfile,engineProfile);assert.equal(selected.creationEnabled,false);assert.equal(selected.assetManifestVersion,'design-0.8.0');
    assert.equal(Object.hasOwn(selected,'engineProfile'),engineProfile!==undefined);
  }
  for(const engineProfile of ['', 'planet-game-1.2.0', 'phone-private-choices-1.1', ' '+PLANET_PHONE_ENGINE_PROFILE]){
    assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_ENGINE_PROFILE:engineProfile}),/Unsupported Planet engine profile/);
  }
  const production=assertPlanetRuntimeEnvironment({GCLOUD_PROJECT:'staging-project',MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.6.0',
    MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:'3',MOTHERSHIP_PLANET_ENGINE_PROFILE:PLANET_PHONE_ENGINE_PROFILE,
    MOTHERSHIP_ALLOWED_ORIGINS:'["https://staging.example"]'});
  assert.equal(production.setupFlowVersion,3);assert.equal(production.engineProfile,PLANET_PHONE_ENGINE_PROFILE);assert.equal(production.creationEnabled,false);
});

test('Food runtime remains an explicit profile without changing creation, setup or artwork defaults',()=>{
  const defaults=assertPlanetRuntimeEnvironment(emulator);
  assert.equal(Object.hasOwn(defaults,'engineProfile'),false);
  const selected=assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_ENGINE_PROFILE:PLANET_FOOD_TASK_ENGINE_PROFILE});
  assert.equal(selected.engineProfile,PLANET_FOOD_TASK_ENGINE_PROFILE);
  assert.equal(selected.creationEnabled,false);
  assert.equal(selected.setupFlowVersion,undefined);
  assert.equal(selected.assetManifestVersion,defaults.assetManifestVersion);
});

test('request timing is an independent strict opt-in and leaves match configuration unchanged',()=>{
  const defaults=assertPlanetRuntimeEnvironment(emulator);
  assert.equal(defaults.requestTimingEnabled,undefined);
  assert.deepEqual(assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_REQUEST_TIMING:'false'}),defaults);
  const {requestTimingEnabled,...enabled}=assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_REQUEST_TIMING:'true'});
  assert.equal(requestTimingEnabled,true);assert.deepEqual(enabled,defaults);
  for(const value of ['', 'yes', '1', ' true'])assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,
    MOTHERSHIP_PLANET_REQUEST_TIMING:value}),/Invalid Planet request timing switch/);
});

test('Food ownership selection is explicit, Food-only and cannot enable creation',()=>{
  const environment={...emulator,MOTHERSHIP_PLANET_ENGINE_PROFILE:PLANET_FOOD_TASK_ENGINE_PROFILE};
  const ordinary=assertPlanetRuntimeEnvironment(environment);
  assert.equal(Object.hasOwn(ordinary,'foodAuthorityProfile'),false);
  const {foodAuthorityProfile,...selected}=assertPlanetRuntimeEnvironment({...environment,
    MOTHERSHIP_PLANET_FOOD_AUTHORITY_PROFILE:PLANET_FOOD_OWNER_INBOX_PROFILE});
  assert.equal(foodAuthorityProfile,PLANET_FOOD_OWNER_INBOX_PROFILE);
  assert.deepEqual(selected,ordinary);
  assert.equal(selected.creationEnabled,false);
  for(const value of ['', 'true', 'food-owner-inbox-2', ' '+PLANET_FOOD_OWNER_INBOX_PROFILE])
    assert.throws(()=>assertPlanetRuntimeEnvironment({...environment,MOTHERSHIP_PLANET_FOOD_AUTHORITY_PROFILE:value}),/Food authority profile/);
  for(const engineProfile of [undefined,PLANET_PHONE_ENGINE_PROFILE])
    assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_ENGINE_PROFILE:engineProfile,
      MOTHERSHIP_PLANET_FOOD_AUTHORITY_PROFILE:PLANET_FOOD_OWNER_INBOX_PROFILE}),/Food authority profile/);
});
