import assert from 'node:assert/strict';
import {test} from 'node:test';
import {foodPanelAt,foodCrateAt,foodTrajectoryAt,foodPackageCount,planetBoardLabel} from '../dist/index.js';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';

const panel={locked:false,stop:0,direction:1,anchorAt:1000};
test('the 50ms snap/200ms rest and end reversal retain one logical LOCK stop in both preferences',()=>{
 for(const [dt,stop,resting]of [[0,1,false],[25,1,false],[50,1,true],[249,1,true],[250,2,false],[1499,6,true],[1500,5,false],[3000,1,false]]){
  const normal=foodPanelAt(panel,1000+dt),reduced=foodPanelAt(panel,1000+dt,true);
  assert.equal(normal.stop,stop);assert.equal(reduced.stop,stop);assert.equal(reduced.at,stop);assert.equal(normal.resting,resting);
 }assert.equal(foodPanelAt(panel,1025).at,.5);
});
test('partial-lift falls keep their actual vertical origin, distinguish destinations and seek the current time',()=>{
 const m={fromX:0,toX:0,fromHeight:.5,toHeight:0,easing:'CUBIC_IN',startedAt:1000,endsAt:1300};
 const half=foodTrajectoryAt(m,1150);assert.equal(half.height,.4375);assert.equal(658-half.height*250,548.625);
 assert.equal(foodTrajectoryAt(m,1300).height,0);assert.equal(foodTrajectoryAt({...m,toHeight:.36},1300).height,.36);
 assert.equal(foodTrajectoryAt(m,1001,{reduced:true}).height,0);assert.equal(m.endsAt,1300);
 assert.equal(foodTrajectoryAt(m,900).height,.5);assert.equal(foodTrajectoryAt(m,9000).height,0);
});
test('a reduced swing keeps physical rail position while removing tilt and vertical motion',()=>{
 const t={panel:{...panel,locked:true,stop:5,swing:{startedAt:1000,amplitude:.9,direction:1}},crate:{state:'HELD',x:5,height:1,motion:null}};
 const normal=foodCrateAt(t,1325),reduced=foodCrateAt(t,1325,true);
 assert.equal(normal.x,reduced.x);assert.ok(normal.tilt!==0);assert.equal(reduced.tilt,0);assert.equal(reduced.height,1);
});
test('integer doses format half packages without floating point stock arithmetic',()=>{
 assert.deepEqual([0,1,2,3,10,11].map(foodPackageCount),['0','½','1','1½','5','5½']);
});
test('a new Food return publication never falls back to an old finalized-round result caption',()=>{
 assert.equal(planetBoardLabel({versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'},board:{kind:'FINALIZED',finalizedRound:3,checkpoint:'FOOD_RETURNED'}}),null);
});
