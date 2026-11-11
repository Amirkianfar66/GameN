import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_PHONE_OFFER_PINS,PlanetPlayerViewSchema} from '@mothership/contracts';
import {planetRegistrationText,planetPromiseTerms} from '@mothership/presentation';
import {phoneLayouts,phoneRoomFrame,createBlackoutGeometry} from '../hosted/planet/phone-layout.mjs';
import {planetView,rig,ids} from './planet-support.mjs';
import {readPlanetView} from '../dist/index.js';
import {BOARD_ROOMS,LOCATION_OF,slotsOf} from '../hosted/board-v2-drawing/slots-four.mjs';

test('T1 room cameras use the corrected Designer outline framing',()=>{
 const panel={width:386,height:712,cap:44,pad:8};
 const full=phoneRoomFrame('room-a',9,panel,slotsOf('room-a',9));
 assert.ok(full.k<.85,'The formerly clipped full Room A must zoom enough for the painted outline');
 const single=phoneRoomFrame('room-a',9,panel,slotsOf('room-a',9).slice(0,1));assert.ok(single.k>full.k);
});

test('T1 uses only shown positions and keeps every canonical target distinct at normal and enlarged text',()=>{
 for(const [width,height]of [[320,568],[390,844],[430,932]])for(const count of [7,8,9])for(const [top,nav]of [[60,74],[160,110]]){
  for(const room of BOARD_ROOMS)for(const shown of [slotsOf(room,count).slice(0,1),slotsOf(room,count)]){
   const positions=shown.map(s=>({location:LOCATION_OF[room],slotId:s.id})),layouts=phoneLayouts({width,height,top,nav},count,positions),panel=layouts.roomPanel,presses=layouts.roomPresses[room];
   assert.deepEqual(layouts.roomFrames[room],phoneRoomFrame(room,count,panel,shown));
   const decorated=positions.map((p,i)=>({...p,seatId:`secret-${i}`,displayName:'Private identity',health:'Injured',characterId:'c9'}));assert.deepEqual(phoneLayouts({width,height,top,nav},count,decorated),layouts);
   for(const slot of slotsOf(room,count)){
   const r=presses.find(p=>p.id===slot.id),centre=[r.left+r.side/2,r.top+r.side/2];assert.ok(r.side>=44);assert.ok(!presses.some(other=>other!==r&&centre[0]>other.left&&centre[0]<other.left+other.side&&centre[1]>other.top&&centre[1]<other.top+other.side),`${room}/${slot.id} target centre belongs to its own slot`);
   assert.ok(r.left>=0&&r.top>=panel.cap&&r.left+r.side<=panel.width+.0001&&r.top+r.side<=panel.height-panel.pad+.0001);
   }
   assert.ok(!/secret-|Private identity|characterId|health|seatId/.test(JSON.stringify(layouts)));
  }
 }
});

test('Blackout keeps geometry for both views through text/layout changes without retaining a roster',()=>{
 for(const [width,height]of [[320,568],[390,844],[430,932]])for(const count of [7,8,9]){
  const cache=createBlackoutGeometry();
  const positions=slotsOf('jail',count).map(s=>({location:'Jail',slotId:s.id}));
  const lit=cache.read('one-window',()=>phoneLayouts({width,height,top:80,nav:72},count,positions));
  const dark=cache.read('one-window',()=>phoneLayouts({width,height,top:160,nav:110},count));assert.strictEqual(dark,lit);
  for(const presses of [lit.roomPresses,lit.boardPresses])for(const [room,list]of Object.entries(presses))for(const r of list){assert.ok(r.side>=44);assert.ok(r.left>=0&&r.top>=0);assert.ok(r.badge.length===2&&r.badge.every(Number.isFinite));assert.ok(!Object.hasOwn(r,'seatId'));assert.ok(!Object.hasOwn(r,'characterId'));}
  assert.ok(!/displayName|targetSeatId|seat-\d|characterId/.test(JSON.stringify(lit)));cache.clear();assert.notStrictEqual(cache.read('one-window',()=>phoneLayouts({width,height,top:160,nav:110},count)),lit);
 }
});
test('cold geometry prepares once, rejects missing input and cannot reuse another window',()=>{
 const cache=createBlackoutGeometry();let calls=0;
 assert.equal(cache.read('cold',()=>{calls++;return null;}),null);
 const cold=cache.read('cold',()=>{calls++;return phoneLayouts({width:390,height:844,top:80,nav:72},9,[{location:'Jail',slotId:'J1'}]);});
 assert.strictEqual(cache.read('cold',()=>{throw Error('dark updates must not reframe');}),cold);assert.equal(calls,2);
 assert.equal(cache.read('another-window',()=>null),null);
 const next=cache.read(null,()=>phoneLayouts({width:390,height:844,top:80,nav:72},9));assert.notStrictEqual(next,cold);
 assert.notStrictEqual(cache.read('cold',()=>next),cold);
});
function blackout(){const v=planetView('Blue Disabler');v.phase={id:'darkness',kind:'BLACKOUT',startedAt:1000,endsAt:16000};v.blackout={windowId:'blackout-one',previewEndsAt:6000,endsAt:16000};v.activeSeatId=null;v.blackoutTargeting={windowId:'blackout-one',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3','A4','A5']};v.offers=[{type:'SELECT_BLACKOUT_SLOT',targetSeatIds:[],slotIds:v.blackoutTargeting.slotIds,windowIds:[]}];return v;}
test('darkness removes identities and private content from every alternate panel; only bound slots remain',async()=>{
 const v=blackout(),r=rig(v);r.transport.identities=()=>ids.map((seatId,i)=>({seatId,characterId:`c${i+1}`,displayName:`SYNTHETIC${i+1}`}));await r.controller.start();assert.equal(r.read().identities.length,9);assert.equal(r.read().board.seats.length,9);
 await r.advance(5000);assert.equal(r.read().dark,true);assert.deepEqual(r.read().identities,[]);assert.equal(r.read().board,null);
 for(const panel of ['card','windows','promises','navigation','hospital','players','panels']){r.controller.openPanel(panel);assert.ok(!JSON.stringify(r.read().privateArea).includes('SYNTHETIC'));assert.ok(!JSON.stringify(r.read().privateArea).includes('Blue Disabler'));assert.equal(r.read().board,null);assert.deepEqual(r.read().identities,[]);}
 r.controller.begin('SELECT_BLACKOUT_SLOT');assert.deepEqual(r.read().action.choices.map(c=>c.value),v.blackoutTargeting.slotIds);r.controller.choose('B1');assert.equal(r.read().action.step,'slots');r.controller.choose('A2');await r.controller.confirm();assert.equal(r.sent[0].command.slotId,'A2');r.controller.dispose();
});
test('voting requires an authoritative offer and voter eligibility and never exposes an own ballot to display',async()=>{
 const v=planetView();v.phase={id:'vote',kind:'JAIL_VOTE',startedAt:1000,endsAt:61000};v.offers=[{type:'VOTE',targetSeatIds:ids,slotIds:[],windowIds:[]}];v.activeSeatId=null;const r=rig(v);await r.controller.start();assert.equal(r.read().canVote,true);r.controller.begin('VOTE');r.controller.choose('seat-2');await r.controller.confirm();assert.equal(r.sent[0].command.targetSeatId,'seat-2');
 const next=structuredClone(v);next.viewRevision++;next.ownBallot={phaseId:'vote',targetSeatId:'seat-2'};r.push(next);assert.equal(r.read().canVote,false);assert.deepEqual(r.read().ownBallot,next.ownBallot);r.controller.begin('VOTE');assert.equal(r.read().action,null);r.controller.dispose();
 for(const eligible of [[],['seat-1']]){const other=structuredClone(v);other.ballot.eligibleVoters=eligible;const s=rig(other);await s.controller.start();assert.equal(s.read().canVote,false);s.controller.begin('VOTE');assert.equal(s.read().action,null);s.controller.dispose();}
});
test('candidate private declarations use exactly the offered permission subset; historical offers stay unchanged',async()=>{
 for(const role of ['Doctor','Hacker','Undercover','Alien']){const v=planetView(role);v.versions={...PLANET_PHONE_OFFER_PINS,assetManifestVersion:'design-0.8.0'};v.phase={id:'declare',kind:'HACK_DECLARE',startedAt:1000,endsAt:16000};v.hackSession={id:'talk',actorSeatId:'seat-1',targetSeatId:v.self.seatId};const sides=['Undercover','Alien'].includes(role)?['Blue','Red','Alien']:[v.self.faction];v.offers=[{type:'DECLARE_HACK_SIDE',declaredSides:sides,targetSeatIds:[],slotIds:[],windowIds:[]}];assert.ok(PlanetPlayerViewSchema.safeParse(v).success);const r=rig(v);await r.controller.start();r.controller.begin('DECLARE_HACK_SIDE');assert.deepEqual(r.read().action.choices.map(c=>c.value),sides);if(sides.length===1){r.controller.choose(sides[0]==='Red'?'Blue':'Red');assert.equal(r.read().action.step,'faction');}r.controller.choose(sides[0]);await r.controller.confirm();assert.equal(r.sent[0].command.declaredSide,sides[0]);r.controller.dispose();}
});
test('candidate Hospital number choices include eliminated original seats and preserve stable command IDs',async()=>{
 const v=planetView();v.versions={...PLANET_PHONE_OFFER_PINS,assetManifestVersion:'design-0.8.0'};Object.assign(v.board.seats[0],{health:'Eliminated',location:null,slotId:null});Object.assign(v.board.seats[5],{health:'Injured',location:'Hospital',slotId:'H1',rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});v.offers=[{type:'PANEL_CODE',targetSeatIds:ids,slotIds:[],windowIds:[]}];const r=rig(v);await r.controller.start();r.controller.begin('PANEL_CODE');assert.deepEqual(r.read().action.choices.map(c=>[c.value,c.label]),ids.map((id,i)=>[id,String(i+1)]));r.controller.choose('seat-1');await r.controller.confirm();assert.equal(r.sent[0].command.doctorSeatId,'seat-1');r.controller.dispose();
});
test('accepted receipt words distinguish immediate state, queued effects, talk and next-round Protection',()=>{
 for(const type of ['ACTIVATE_CLONE','ENGINEER_SUPPRESS'])assert.match(planetRegistrationText(type),/current state/);
 assert.match(planetRegistrationText('PROTECT'),/next normal round/);assert.match(planetRegistrationText('REQUEST_HACK'),/current turn/);for(const type of ['REGISTER_SHOT','RESCUE','SELECT_BLACKOUT_SLOT'])assert.match(planetRegistrationText(type),/pending/);
 const terms=planetPromiseTerms({kind:'CAPTAIN_SUPPORT',giverSeatId:'seat-1',recipientSeatId:'seat-2',targetSeatId:null,round:1,electionId:null});assert.match(terms,/every ballot/);assert.match(terms,/is a candidate/);
});
test('lifetime Promise quotas block another acceptance and impossible accepted histories fail closed',async()=>{
 const v=planetView();v.phase={id:'talk-phase',kind:'HACK',startedAt:1000,endsAt:61000};v.hackSession={id:'talk',actorSeatId:'seat-1',targetSeatId:v.self.seatId};v.promiseQuota.received=true;v.offers=[{type:'ACCEPT_PROMISE',targetSeatIds:[],slotIds:[],windowIds:[]}];v.promises=[{id:'new-offer',giverSeatId:'seat-1',recipientSeatId:v.self.seatId,kind:'MEET_A',targetSeatId:null,round:6,electionId:null,accepted:false,status:'Pending',offerStatus:'offered'}];const r=rig(v);await r.controller.start();r.controller.openPanel('promises');assert.deepEqual(r.read().privateArea.offers,[]);r.controller.begin('ACCEPT_PROMISE');assert.equal(r.read().action,null);assert.equal(r.sent.length,0);r.controller.dispose();
 v.promises=[1,2].map(n=>({id:'accepted-'+n,giverSeatId:'seat-'+n,recipientSeatId:v.self.seatId,kind:'MEET_A',targetSeatId:null,round:6,electionId:null,accepted:true,status:'Pending',offerStatus:'accepted'}));assert.equal(readPlanetView(v,'planet-local',v.self.seatId),null);
});
test('P18 retains offered final Code during darkness, including a living injured or jailed Hacker',async()=>{
 for(const state of ['Healthy','Jailed','Injured']){const v=planetView();v.versions={...PLANET_PHONE_OFFER_PINS,assetManifestVersion:'design-0.8.0'};v.phase={id:'code-dark',kind:'BLACKOUT',startedAt:1000,endsAt:16000};v.activeSeatId=null;v.blackout={windowId:'code-dark',previewEndsAt:6000,endsAt:16000};v.offers=[{type:'SUBMIT_CODE',targetSeatIds:ids,slotIds:[],windowIds:[]}];
  if(state==='Jailed')Object.assign(v.board.seats[5],{location:'Jail',slotId:'J1',jailed:true});
  if(state==='Injured')Object.assign(v.board.seats[5],{health:'Injured',location:'Hospital',slotId:'H1',jailed:true,rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});
  const r=rig(v);await r.controller.start();await r.advance(6000);r.controller.openPanel('actions');assert.equal(r.read().dark,true);assert.equal(r.read().board,null);assert.deepEqual(r.read().identities,[]);assert.deepEqual(r.read().privateArea.offers.map(o=>o.type),['SUBMIT_CODE']);r.controller.begin('SUBMIT_CODE');for(const id of ids.slice(0,4))r.controller.choose(id);await r.controller.confirm();assert.deepEqual(r.sent[0].command,{type:'SUBMIT_CODE',seatIds:ids.slice(0,4)});r.controller.dispose();
 }
});
