import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS} from '@mothership/contracts';
import {hasCrewDrawing,crewFigureSvg,crewPortraitVariable,crewForVersions} from '../hosted/crew-runtime.mjs';
import {CREW as oldCrew} from '../hosted/scene-drawing/crew.mjs';
import {dressedFigureSvg as oldFigure} from '../hosted/scene-drawing/wardrobe.mjs';
import {skeletonOf} from '../hosted/scene-drawing/gestures.mjs';
const current={...PLANET_GAME_PINS,assetManifestVersion:'design-0.7.0'},historical={...current,assetManifestVersion:'design-0.6.0'};
test('crew dispatch requires every approved gameplay and art pin',()=>{
 assert.equal(hasCrewDrawing(current),true);assert.equal(hasCrewDrawing(historical),false);assert.equal(hasCrewDrawing(null),false);
 for(const patch of [{protocolVersion:2},{engineVersion:'planet-game-1.0.1'},{rulesetVersion:'other'},{rulesetHash:'0'.repeat(64)},{assetManifestVersion:'design-0.9.0'}])assert.equal(hasCrewDrawing({...current,...patch}),false);
});
test('pregame release preserves every selected crew appearance and exact gameplay pin',()=>{
 const pregame={...current,assetManifestVersion:'design-0.8.0'};assert.equal(hasCrewDrawing(pregame),true);assert.equal(crewForVersions(pregame),crewForVersions(current));
 for(let n=1;n<=9;n++)for(const pose of ['stand','walk','tablet']){const sk=skeletonOf(pose);assert.equal(crewFigureSvg(`c${n}`,sk,{versions:pregame,prefix:'same-person'}),crewFigureSvg(`c${n}`,sk,{versions:current,prefix:'same-person'}));assert.equal(crewPortraitVariable(`c${n}`,pregame),crewPortraitVariable(`c${n}`,current));}
 assert.equal(crewPortraitVariable('c1',{...pregame,rulesetHash:'0'.repeat(64)}),'none');assert.equal(crewFigureSvg('c1',skeletonOf('stand'),{versions:{...pregame,rulesetHash:'0'.repeat(64)}}),null);
});
test('historical figures remain byte-identical to the original drawing factory',()=>{
 for(const id of ['c1','c4','c8','c9'])for(const outfit of ['crew','gown','prison']){
  const sk=skeletonOf('think'),options={prefix:`legacy-${id}`,outfit};
  assert.equal(crewFigureSvg(id,sk,{...options,versions:historical}),oldFigure(oldCrew[id],sk,options));
 }
 assert.equal(crewForVersions(historical),oldCrew);
 assert.equal(crewFigureSvg('c1',skeletonOf('stand'),{versions:{...current,rulesetHash:'0'.repeat(64)}}),null);
});
test('all nine picture bindings use square app icons only on the selected crew release',()=>{
 for(let n=1;n<=9;n++){
  assert.equal(crewPortraitVariable(`c${n}`,current),`var(--ms-asset-crew-portrait-c${n}, none)`);
  assert.equal(crewPortraitVariable(`c${n}`,historical),`var(--ms-asset-piece-crew-card-c${n}, none)`);
 }
 assert.equal(crewPortraitVariable('bad',current),'none');
});
test('exact phone1.2 pins retain every approved0.7/0.8 portrait and figure; near-miss tuples stay rejected',()=>{
 for(const assetManifestVersion of ['design-0.7.0','design-0.8.0']){const phone={...PLANET_PHONE_OFFER_PINS,assetManifestVersion},released={...PLANET_GAME_PINS,assetManifestVersion};assert.equal(hasCrewDrawing(phone),true);
  for(let n=1;n<=9;n++)for(const outfit of ['crew','gown','prison'])for(const pose of ['stand','walk','tablet']){const options={prefix:'same-public-figure',outfit};assert.equal(crewPortraitVariable('c'+n,phone),crewPortraitVariable('c'+n,released));assert.equal(crewFigureSvg('c'+n,skeletonOf(pose),{...options,versions:phone}),crewFigureSvg('c'+n,skeletonOf(pose),{...options,versions:released}));}
  for(const patch of [{engineVersion:'planet-game-1.2.1'},{rulesetHash:'0'.repeat(64)},{rulesetVersion:'other'}]){assert.equal(hasCrewDrawing({...phone,...patch}),false);assert.equal(crewPortraitVariable('c1',{...phone,...patch}),'none');}
 }
});
test('private role/faction inputs cannot select a different public character drawing',()=>{
 const sk=skeletonOf('stand'),options={versions:current,prefix:'public-person'};
 const original=crewFigureSvg('c8',sk,options);
 for(const role of ['Doctor','Hacker','Alien'])for(const faction of ['Blue','Red','Alien'])assert.equal(crewFigureSvg('c8',sk,{...options,versions:{...current,role,faction}}),original);
});
