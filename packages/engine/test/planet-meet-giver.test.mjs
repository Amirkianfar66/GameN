import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectPlanetPlayer} from '../dist/index.js';
import {planetWorldDriver,currentWorld,worldSeat,moveAcross} from './planet-world-helper.mjs';
for(const count of [7,8,9])for(const room of ['Room A','Room B'])test(`${count}: native Meet in ${room} checks giver alone, independently of recipient placement`,()=>{
 for(const fulfilled of [true,false]){
  const initialRooms=room==='Room B'?Object.fromEntries(Array.from({length:count},(_,i)=>[`seat-${i+1}`,['seat-2','seat-3','seat-5','seat-6'].includes(`seat-${i+1}`)?'Room A':'Room B'])):undefined;
  const d=planetWorldDriver(count,{initialRooms});d.deadline();const recipient=room==='Room A'?'seat-2':'seat-4';
  assert.equal(worldSeat(currentWorld(d),'seat-1').location,room);
  d.command('seat-1',{type:'REQUEST_HACK',targetSeatId:recipient});d.deadline();d.command(recipient,{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'});d.deadline();
  d.command('seat-1',{type:'OFFER_PROMISE',recipientSeatId:recipient,kind:room==='Room A'?'MEET_A':'MEET_B',targetSeatId:null});
  d.command(recipient,{type:'ACCEPT_PROMISE',promiseId:d.history.at(-1).request.commandId});moveAcross(d,fulfilled?recipient:'seat-1');
  assert.equal(d.state.global.promises[0].status,'Pending');d.until(s=>s.phase.kind==='JAIL_VOTE');
  assert.equal(worldSeat(currentWorld(d),fulfilled?'seat-1':recipient).location,room);
  assert.equal(d.state.global.promises[0].status,fulfilled?'Fulfilled':'Not fulfilled');
  for(const id of d.ids)assert.equal(projectPlanetPlayer(d.state,id).promises.length,['seat-1',recipient].includes(id)?1:0);
  d.replay();
 }
});
