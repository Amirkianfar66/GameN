import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFullGame, HOSPITAL_FOUR_FULL_GAME_VERSION_PINS as PINS, CLONE_FULL_GAME_VERSION_PINS as OLD } from '../dist/index.js';
import { slotIdsFor, boardSlotIdsFor, initializeBoardSlots, assignMissingBoardSlots, moveBoardSeat, assertBoardSlots } from '../dist/full-game/slots.js';
import { roomHasSpace } from '../dist/full-game/capacity.js';

// Slot/capacity primitives only. Placement mutations below are explicitly synthetic
// working rosters, not medical histories or evidence of native admission effects.
const copy = value => structuredClone(value);
const byId = (state, id) => state.seats.find(seat => seat.seatId === id);
const numbered = (prefix, n) => Array.from({ length:n }, (_, i) => `${prefix}${i+1}`);
function fixture(n, pins=PINS) {
  const roles=['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(n>=8?['Red Disabler']:[]),...(n===9?['Officer']:[])];
  const ids=roles.map((_, i)=>`seat-${i+1}`), assetManifestVersion=pins.engineVersion===PINS.engineVersion?'design-0.5.0':'hospital-four-slot-fixture';
  return createFullGame({matchId:'hospital-four-slots',now:1800000000000,phaseId:'initial-phase',deadlineToken:'initial-token',assetManifestVersion,
    versions:{...pins,assetManifestVersion},setup:{playerCount:n,roleOrder:roles,codeExtraSeatIds:['seat-1','seat-2','seat-3'],
      initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),roundOrders:Array.from({length:5},()=>[...ids])}});
}
function ward(n, pins=PINS) {
  const state=fixture(n,pins);
  for(let i=1;i<=4;i++)Object.assign(byId(state,`seat-${i}`),{location:'Hospital',slotId:`H${i}`,health:i===1?'Eliminated':'Injured',jailed:i===2,captain:false});
  return state;
}
function failsUnchanged(state, operation) {
  const before=copy(state);assert.throws(()=>operation(state));assert.deepEqual(state,before,'Failed slot operations are atomic');
}
for(const n of [7,8,9]) {
  test(`${n}: exact Hospital4 inventory leaves historical primitive and other rooms unchanged`,()=>{
    const state=fixture(n), old=fixture(n,OLD);
    assert.deepEqual(slotIdsFor('Hospital',n),numbered('H',n));
    assert.deepEqual(boardSlotIdsFor(old,'Hospital'),numbered('H',n));
    assert.deepEqual(boardSlotIdsFor(state,'Hospital'),numbered('H',4));
    for(const [room,prefix,count]of[['Room A','A',5],['Room B','B',5],['Jail','J',5],['Command Room','C',1]])
      assert.deepEqual(boardSlotIdsFor(state,room),numbered(prefix,count));
    const changed=boardSlotIdsFor(state,'Hospital');changed.pop();assert.deepEqual(boardSlotIdsFor(state,'Hospital'),numbered('H',4));
    for(const room of['Final Zone',null,''])assert.throws(()=>boardSlotIdsFor(state,room));
    for(const count of[4,6,10])assert.throws(()=>boardSlotIdsFor({...state,playerCount:count},'Hospital'));
    assertBoardSlots(state);assertBoardSlots(old);
  });
  test(`${n}: four occupied Hospital places include retained body and detained patient`,()=>{
    const state=ward(n);assertBoardSlots(state);assert.equal(roomHasSpace(state,'Hospital'),false);
    assert.equal(byId(state,'seat-1').health,'Eliminated');assert.equal(byId(state,'seat-2').jailed,true);
    failsUnchanged(state,s=>moveBoardSeat(s,byId(s,'seat-5'),'Hospital'));
    assert.deepEqual(state.seats.filter(s=>s.location==='Hospital').map(s=>s.slotId),numbered('H',4));
  });
  test(`${n}: healed departure leaves a hole; next entrant takes that lowest free place without shifting bodies`,()=>{
    const state=ward(n), body=copy(byId(state,'seat-1'));byId(state,'seat-2').health='Healthy';byId(state,'seat-2').jailed=false;
    moveBoardSeat(state,byId(state,'seat-2'),'Room A');assert.equal(roomHasSpace(state,'Hospital'),true);
    byId(state,'seat-6').health='Injured';moveBoardSeat(state,byId(state,'seat-6'),'Hospital');
    assert.equal(byId(state,'seat-6').slotId,'H2');assert.deepEqual(byId(state,'seat-1'),body);
    assert.equal(byId(state,'seat-3').slotId,'H3');assert.equal(byId(state,'seat-4').slotId,'H4');
    assert.equal(roomHasSpace(state,'Hospital'),false);assertBoardSlots(state);
  });
  test(`${n}: numeric assignment preserves partial working-roster order and established holes`,()=>{
    const source=fixture(n), state={...source,seats:['seat-7','seat-5','seat-1','seat-3'].map(id=>copy(byId(source,id)))};
    for(const seat of state.seats){seat.location='Hospital';seat.health='Injured';delete seat.slotId;}
    byId(state,'seat-1').slotId='H3';const order=state.seats.map(s=>s.seatId);
    assignMissingBoardSlots(state);assert.deepEqual(state.seats.map(s=>s.seatId),order);
    assert.deepEqual(Object.fromEntries(state.seats.map(s=>[s.seatId,s.slotId])),{'seat-7':'H4','seat-5':'H2','seat-1':'H3','seat-3':'H1'});
    failsUnchanged(state,assertBoardSlots);
  });
  test(`${n}: fifth working admission and successor H5 fail before partial assignment`,()=>{
    const state=ward(n);Object.assign(byId(state,'seat-5'),{location:'Hospital',health:'Injured'});delete byId(state,'seat-5').slotId;
    for(const action of[assignMissingBoardSlots,initializeBoardSlots,assertBoardSlots])failsUnchanged(state,action);
    const bad=ward(n);byId(bad,'seat-4').slotId='H5';
    for(const action of[assignMissingBoardSlots,initializeBoardSlots,assertBoardSlots])failsUnchanged(bad,action);
  });
  test(`${n}: last-place transfers serialize without repacking or allocating a fifth bed`,()=>{
    const state=ward(n);byId(state,'seat-4').health='Healthy';moveBoardSeat(state,byId(state,'seat-4'),'Room A');
    byId(state,'seat-6').health='Injured';moveBoardSeat(state,byId(state,'seat-6'),'Hospital');assert.equal(byId(state,'seat-6').slotId,'H4');
    failsUnchanged(state,s=>moveBoardSeat(s,byId(s,'seat-7'),'Hospital'));
    failsUnchanged(state,s=>moveBoardSeat(s,copy(byId(s,'seat-6')),'Room B'));
    assertBoardSlots(state);
  });
  test(`${n}: stored 1.10 ward may still hold five through the complete starting roster`,()=>{
    const state=fixture(n,OLD);
    for(const [i,seat]of state.seats.entries())Object.assign(seat,{location:'Hospital',health:'Injured',slotId:`H${i+1}`,jailed:false,captain:false});
    assertBoardSlots(state);initializeBoardSlots(state);assert.equal(state.seats.length,n);
    assert.equal(roomHasSpace(state,'Hospital'),false);assert.equal(state.seats.at(-1).slotId,`H${n}`);
    byId(state,'seat-1').health='Healthy';moveBoardSeat(state,byId(state,'seat-1'),'Room A');assert.equal(roomHasSpace(state,'Hospital'),true);
  });
}
