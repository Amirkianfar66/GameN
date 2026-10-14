import test from 'node:test';
import assert from 'node:assert/strict';
import {boardV2SceneFrame,boardV2FigureSvg} from '../hosted/board-v2-scene.mjs';
import {slotsOf,BOARD_ROOMS} from '../hosted/board-v2-drawing/slots.mjs';
const panels=Object.fromEntries(BOARD_ROOMS.map(room=>[room,{width:room==='command-room'?376:176,height:room==='hospital'||room==='jail'?186:room==='command-room'?190:320,cap:room==='hospital'||room==='jail'?32:44,pad:8}]));
// Explicit internal layout fixtures exercise rendering; exact revised-fit geometry is
// a separate Designer/Integration acceptance, not silently reimplemented in this test.
const layout=roster=>({panels,pressAreas:Object.fromEntries(BOARD_ROOMS.map(room=>[room,slotsOf(room,roster).map((slot,i)=>({id:slot.id,left:(i%3)*48,top:panels[room].cap+Math.floor(i/3)*46,side:44}))]))});
const person=(seatId,slotId,location,health='Healthy')=>({seatId,slotId,location,health,characterId:'c1',displayName:'A <name>'});
test('stored holes and public slot identity survive occupancy changes; the renderer never reassigns an entrant',()=>{
 const seats=[person('seat-1','A4','Room A'),person('seat-2','A1','Room A')];
 const first=boardV2SceneFrame(7,seats,layout(7)).rooms.find(r=>r.room==='room-a');
 const after=boardV2SceneFrame(7,[seats[0]],layout(7)).rooms.find(r=>r.room==='room-a');
 assert.deepEqual(first.figures[0],after.figures[0]);assert.equal(after.figures[0].slotId,'A4');
 assert.equal(boardV2SceneFrame(7,[{...seats[0],slotId:null}],layout(7)).rooms.length,0);
 assert.equal(boardV2SceneFrame(7,[...seats,{...seats[0],seatId:'seat-3'}],layout(7)).rooms.length,0);
});
test('the exact ward supports 7/8/9 berths, gown/health poses and front-layer depth without moving an injured detainee',()=>{
 for(const roster of [7,8,9]){
  const slotId=`H${roster}`,seat={...person('seat-1',slotId,'Hospital','Injured'),jailed:true};
  const frame=boardV2SceneFrame(roster,[seat],layout(roster));assert.deepEqual(frame.problems,[]);const ward=frame.rooms.find(r=>r.room==='hospital');
  assert.equal(slotsOf('hospital',roster).length,roster);assert.equal(ward.layers.length,roster);assert.equal(ward.figures[0].outfit,'gown');assert.match(ward.figures[0].gesture,/injured/);assert.equal(ward.figures[0].slotId,slotId);
  assert.ok(ward.layers.some(layer=>Math.round(layer.depth)*2+1>Math.round(ward.figures[0].depth)*2));assert.match(boardV2FigureSvg(ward.figures[0]),/<svg/);
  assert.ok(Number.isFinite(ward.figures[0].name.top));assert.ok(ward.figures[0].press.side>=44);
 }
 const dead=boardV2SceneFrame(7,[person('seat-1','H1','Hospital','Eliminated')],layout(7)).rooms.find(r=>r.room==='hospital').figures[0];assert.match(dead.gesture,/still/);
});
test('original room scene facts and public wardrobe determine figures; hidden data cannot affect the output',()=>{
 const seat=person('seat-1','J2','Jail');const base=boardV2SceneFrame(7,[seat],layout(7));
 assert.deepEqual(boardV2SceneFrame(7,[{...seat,role:'Hacker',declaredSide:'Blue',privateTruth:'anything'}],layout(7)),base);
 assert.equal(base.rooms.find(r=>r.room==='jail').figures[0].outfit,'prison');
 assert.deepEqual(boardV2SceneFrame(7,[person('seat-1','A1','Jail')],layout(7)).rooms,[]);
 const invalid=layout(7);invalid.pressAreas.hospital=[];assert.deepEqual(boardV2SceneFrame(7,[person('seat-1','H1','Hospital')],invalid).rooms,[]);
});
