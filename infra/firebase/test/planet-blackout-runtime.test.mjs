import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANET_BLACKOUT_ENGINE_PROFILE,PLANET_PHONE_ENGINE_PROFILE} from '@mothership/contracts';
import {assertPlanetRuntimeEnvironment} from '../dist/planet-runtime.js';
const emulator={GCLOUD_PROJECT:'demo-mothership',FUNCTIONS_EMULATOR:'true',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9199',
 FIRESTORE_EMULATOR_HOST:'127.0.0.1:8180',MOTHERSHIP_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5101'};
test('Blackout profile startup is an exact independent opt-in without enabling creation or changing setup/art',()=>{
 for(const setupFlowVersion of [undefined,'1','2','3'])for(const profile of [undefined,PLANET_PHONE_ENGINE_PROFILE,PLANET_BLACKOUT_ENGINE_PROFILE]){
  const settings=assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_ENGINE_PROFILE:profile,
   MOTHERSHIP_PLANET_SETUP_FLOW_VERSION:setupFlowVersion,MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION:'design-0.8.0'});
  assert.equal(settings.engineProfile,profile);assert.equal(settings.creationEnabled,false);assert.equal(settings.assetManifestVersion,'design-0.8.0');
  assert.equal(settings.setupFlowVersion,setupFlowVersion==='2'?2:setupFlowVersion==='3'?3:undefined);
 }
 for(const profile of ['planet-game-1.3.0','blackout-before-vote-1.2','blackout-before-vote-1.3 ','BLACKOUT-BEFORE-VOTE-1.3'])
  assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,MOTHERSHIP_PLANET_ENGINE_PROFILE:profile}),/Unsupported Planet engine profile/);
 assert.throws(()=>assertPlanetRuntimeEnvironment({...emulator,FIRESTORE_EMULATOR_HOST:'remote.example:8180',MOTHERSHIP_PLANET_ENGINE_PROFILE:PLANET_BLACKOUT_ENGINE_PROFILE}));
});
