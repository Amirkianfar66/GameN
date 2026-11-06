import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetPlayerNumberChoices,planetSupplyDelivery,planetTerminalArrival} from '../dist/index.js';
const observation=()=>({matchId:'match',seatId:'seat-6',round:3,revision:2,phaseKind:'BLACKOUT',finalizedRound:2,lastMovedRound:2,ordinaryWeapons:0});
test('number labels sort numerically while preserving offered canonical command identities',()=>{
 assert.deepEqual(planetPlayerNumberChoices(['seat-9','seat-2','seat-6']),[{value:'seat-2',label:'2'},{value:'seat-6',label:'6'},{value:'seat-9',label:'9'}]);
});
test('a weapon increase is Supply only across the live Round 3 finalized opportunity',()=>{
 const before=observation(),after={...before,revision:3,phaseKind:'NAV_CAPTAIN_CONFIRM',finalizedRound:3,ordinaryWeapons:1};assert.deepEqual(planetSupplyDelivery(before,after),{round:3,count:1});
 for(const changed of [{round:6},{phaseKind:'BLACKHOLE_PRESENTATION'},{finalizedRound:2},{lastMovedRound:3},{revision:2},{seatId:'seat-2'},{matchId:'other'},{ordinaryWeapons:2}])assert.equal(planetSupplyDelivery(before,{...after,...changed}),null);
 assert.equal(planetSupplyDelivery(null,after),null);assert.equal(planetSupplyDelivery({...before,round:6},{...after,round:6}),null);
});
test('colored arrivals require matching live authoritative terminal facts',()=>{
 const model={connection:'live',concealed:false,phase:{kind:'FINISHED',trusted:true},result:{reason:'ARRIVAL',winner:'Blue'},navigation:{arrivedAt:'Blue'}};
 assert.equal(planetTerminalArrival(model),'Blue');for(const changed of [{connection:'stale'},{concealed:true},{phase:{kind:'JAIL_VOTE',trusted:true}},{phase:{kind:'FINISHED',trusted:false}},{result:{reason:'NO_SURVIVORS',winner:null}},{navigation:{arrivedAt:'Red'}}])assert.equal(planetTerminalArrival({...model,...changed}),null);
});
