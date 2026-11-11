import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetPlayerNumberChoices,planetPanelRequestText,planetTerminalArrival,planetHasLibraryArt,planetSupportsAssets,planetRoundOrderText} from '../dist/index.js';
import {PLANET_GAME_PINS,PLANET_SYNC_PINS,PLANET_ORIGINAL_PINS,PLANET_PHONE_OFFER_PINS,PLANET_BLACKOUT_PINS} from '@mothership/contracts';
test('round order names pre-vote Blackout damage only for exact 1.3, preserving historical and mixed tuples',()=>{
 const legacy='Player turns · Private talk · Sync when applicable · Jail vote · Result · Blackout · Resolution · Navigation';
 const current={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'},steps=planetRoundOrderText(current).split(' · ');
 assert.deepEqual(steps.slice(3),['Blackout','Damage and Hospital placement','Jail vote','Result','Remaining resolution and Rescue','Navigation']);
 for(const pins of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS,PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS])assert.equal(planetRoundOrderText({...pins,assetManifestVersion:'design-0.8.0'}),legacy);
 for(const patch of [{protocolVersion:2},{engineVersion:'planet-game-1.3.1'},{engineVersion:PLANET_PHONE_OFFER_PINS.engineVersion},{rulesetVersion:PLANET_GAME_PINS.rulesetVersion},{rulesetHash:PLANET_GAME_PINS.rulesetHash}])assert.equal(planetRoundOrderText({...current,...patch}),legacy);
 for(const missing of [null,undefined])assert.equal(planetRoundOrderText(missing),legacy);
});
test('library activation requires the exact reviewed art and gameplay pairing',()=>{
 const versions={...PLANET_GAME_PINS,assetManifestVersion:'design-0.6.0'};assert.equal(planetHasLibraryArt(versions),true);assert.equal(planetHasLibraryArt(null),false);assert.equal(planetHasLibraryArt({...versions,assetManifestVersion:'design-0.5.0'}),false);assert.equal(planetSupportsAssets({...versions,assetManifestVersion:'design-0.5.0'}),true);assert.equal(planetSupportsAssets({...PLANET_SYNC_PINS,assetManifestVersion:'design-0.6.0'}),false);
});
test('crew art reuses library mechanics only under the exact registered gameplay tuple',()=>{
 const versions={...PLANET_GAME_PINS,assetManifestVersion:'design-0.7.0'};
 assert.equal(planetHasLibraryArt(versions),true);assert.equal(planetSupportsAssets(versions),true);
 for(const changed of [{engineVersion:'planet-game-1.0.1'},{rulesetHash:'0'.repeat(64)},{rulesetVersion:'other'},{protocolVersion:2},{assetManifestVersion:'design-0.9.0'}]){
  assert.equal(planetHasLibraryArt({...versions,...changed}),false);
  assert.equal(planetSupportsAssets({...versions,...changed}),false);
 }
});
test('pregame art extends library consumption without changing saved release choices',()=>{
 for(const assetManifestVersion of ['design-0.6.0','design-0.7.0','design-0.8.0']){const versions={...PLANET_GAME_PINS,assetManifestVersion};assert.equal(planetHasLibraryArt(versions),true);assert.equal(planetSupportsAssets(versions),true);assert.equal(planetHasLibraryArt({...versions,rulesetHash:'0'.repeat(64)}),false);}
});
test('number labels sort numerically while preserving offered canonical command identities',()=>{
 assert.deepEqual(planetPlayerNumberChoices(['seat-9','seat-2','seat-6']),[{value:'seat-2',label:'2'},{value:'seat-6',label:'6'},{value:'seat-9',label:'9'}]);
});
test('patient feedback uses its authorized request status, and queued never means treated',()=>{
 assert.equal(planetPanelRequestText(null),null);assert.equal(planetPanelRequestText(undefined),null);
 const request={commandId:'own-request',round:4,status:'QUEUED'};assert.match(planetPanelRequestText(request),/reserved; treatment is not confirmed/);
 assert.match(planetPanelRequestText({...request,status:'WRONG'}),/number was wrong/);assert.match(planetPanelRequestText({...request,status:'TREATED'}),/request treated you/);
 assert.match(planetPanelRequestText({...request,status:'NO_EFFECT'}),/no effect/);assert.match(planetPanelRequestText({...request,status:'DISCARDED'}),/discarded/);
});
test('colored arrivals require matching live authoritative terminal facts',()=>{
 const model={connection:'live',concealed:false,phase:{kind:'FINISHED',trusted:true},result:{reason:'ARRIVAL',winner:'Blue'},navigation:{arrivedAt:'Blue'}};
 assert.equal(planetTerminalArrival(model),'Blue');for(const changed of [{connection:'stale'},{concealed:true},{phase:{kind:'JAIL_VOTE',trusted:true}},{phase:{kind:'FINISHED',trusted:false}},{result:{reason:'NO_SURVIVORS',winner:null}},{navigation:{arrivedAt:'Red'}}])assert.equal(planetTerminalArrival({...model,...changed}),null);
});
