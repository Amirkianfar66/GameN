import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PLANET_FOOD_TASK_PINS,PLANET_BLACKOUT_PINS,PLANET_GAME_PINS,PlanetVersionsSchema,
  PlanetPublicViewSchema} from '../../packages/contracts/dist/index.js';
import {createPlanetGame,projectPlanetPublic,decodePlanetGameState} from '../../packages/engine/dist/index.js';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
test('Food runtime tuple binds its own reviewed source authority and immutable parent',()=>{
  const path='rules/planet-successor-food-task-authority-2026-11-12.json',a=JSON.parse(read(path));
  assert.equal(hash(read(path)),PLANET_FOOD_TASK_PINS.rulesetHash);
  for(const source of [a.parent_authority,a.candidate_record,...a.sources])assert.equal(hash(read(source.path)),source.sha256,source.path);
  assert.equal(a.parent_authority.sha256,PLANET_BLACKOUT_PINS.rulesetHash);
  assert.equal(a.contract_commit,'5a5bb9068cd4fb085cb2482cd969058221d2c870');
  assert.equal(a.integration_base_commit,'f9e7e11bd6c23671f96832bf45d79146e6fd855c');
  assert.ok(Object.values(a.activation_boundary).every(v=>v===false));
  assert.equal(PLANET_GAME_PINS.engineVersion,'planet-game-1.1.0');
  const version={...PLANET_FOOD_TASK_PINS,assetManifestVersion:'food-test'};PlanetVersionsSchema.parse(version);
  assert.equal(PlanetVersionsSchema.safeParse({...version,rulesetHash:'a'.repeat(64)}).success,false);
});
for(const n of [7,8,9])test(`${n}: predecessors reject Food fields and same-round Food-return checkpoints`,()=>{
  const ids=Array.from({length:n},(_,i)=>`seat-${i+1}`),assetManifestVersion='food-version-control';
  const state=createPlanetGame({matchId:'food-version-control-'+n,playerCount:n,
    roleOrder:['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'].slice(0,n),
    initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),initialTurnOrder:ids,assetManifestVersion,
    versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion}},
  {now:0,nextPhaseId:'old-phase',nextDeadlineToken:'old-token',random:Array(32).fill(.5)});
  assert.equal(Object.hasOwn(state,'food'),false);assert.equal(Object.hasOwn(state.worlds['world-0'],'food'),false);
  assert.throws(()=>decodePlanetGameState({...structuredClone(state),food:{}}),/predecessor field absence/);
  const view=projectPlanetPublic(state);view.board.checkpoint='FOOD_RETURNED';view.board.finalizedRound=1;
  assert.equal(PlanetPublicViewSchema.safeParse(view).success,false);
  view.versions={...PLANET_FOOD_TASK_PINS,assetManifestVersion};PlanetPublicViewSchema.parse(view);
});
