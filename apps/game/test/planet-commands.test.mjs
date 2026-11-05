import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PlanetCommandRequestSchema,PlanetCommandTypeSchema} from '@mothership/contracts';
import {ids,planetView,rig} from './planet-support.mjs';
const simple=['PASS_TURN','ACTIVATE_SHIP_HACK','ENGINEER_SUPPRESS','ACTIVATE_BLACKHOLE','ACTIVATE_CLONE','REQUEST_BLACKOUT','CAPTAIN_RELEASE','CAPTAIN_EJECT','CONFIRM_NAVIGATION'];
const roles={ACTIVATE_SHIP_HACK:'Hacker',ENGINEER_SUPPRESS:'Engineer',ACTIVATE_BLACKHOLE:'Alien',ACTIVATE_CLONE:'Alien',REQUEST_BLACKOUT:'Blue Disabler',CAPTAIN_RELEASE:'Insider',CAPTAIN_EJECT:'Insider'};
const cases=simple.map(type=>({type,role:roles[type]??'Hacker',choose:[],command:{type}}));
cases.push(
 {type:'MOVE',choose:['Room B','B5'],command:{type:'MOVE',destination:'Room B',slotId:'B5'}},
 ...['REGISTER_SHOT','PROTECT','RESCUE','APPOINT_OFFICER','BLOCK_MOVE','REQUEST_HACK'].map(type=>({type,role:type==='RESCUE'?'Doctor':type==='PROTECT'||type==='REGISTER_SHOT'?'Undercover':'Hacker',choose:['seat-1'],command:{type,targetSeatId:'seat-1'}})),
 {type:'SUPPLY',role:'Supplier',choose:['seat-1','seat-2'],command:{type:'SUPPLY',targetSeatIds:['seat-1','seat-2']}},
 {type:'SCAN',choose:['seat-1','Alien'],command:{type:'SCAN',targetSeatId:'seat-1',guess:'Alien'}},
 {type:'SUBMIT_CODE',choose:ids.slice(0,4),command:{type:'SUBMIT_CODE',seatIds:ids.slice(0,4)}},
 {type:'CHOOSE_NAV_DIRECTION',choose:['Red'],command:{type:'CHOOSE_NAV_DIRECTION',direction:'Red'}},
 {type:'VOTE',choose:['abstain'],command:{type:'VOTE',targetSeatId:null}},
 {type:'DECLARE_HACK_SIDE',choose:['Blue'],command:{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'}},
 {type:'PANEL_CODE',choose:['seat-2'],command:{type:'PANEL_CODE',doctorSeatId:'seat-2'}},
 {type:'OFFER_PROMISE',choose:['seat-1','JAIL_VOTE','seat-3'],command:{type:'OFFER_PROMISE',recipientSeatId:'seat-1',kind:'JAIL_VOTE',targetSeatId:'seat-3'}},
 ...['ACCEPT_PROMISE','DECLINE_PROMISE'].map(type=>({type,choose:['incoming-promise'],command:{type,promiseId:'incoming-promise'}})),
 {type:'SELECT_BLACKOUT_SLOT',choose:['A3'],command:{type:'SELECT_BLACKOUT_SLOT',windowId:'blackout-1',slotId:'A3'}},
 {type:'SHOW_WINDOW',choose:[],command:{type:'SHOW_WINDOW',windowId:'A_B',drawing:{strokes:[{color:'#F7D886',width:4,points:[[0,0],[1,1]]}]}}},
);
assert.deepEqual(cases.map(c=>c.type).sort(),[...PlanetCommandTypeSchema.options].sort(),'every shared command has a consumer flow');
for(const entry of cases)test(`Planet command form: ${entry.type}`,async()=>{
 const v=planetView(entry.role??'Hacker');
 v.offers=[{type:entry.type,targetSeatIds:ids,slotIds:entry.type==='SELECT_BLACKOUT_SLOT'?['A1','A2','A3']:['B5','C1'],windowIds:['A_B'],promiseTargetSeatIds:ids}];
 if(entry.type==='SUPPLY'){v.round=3;v.board.finalizedRound=2;v.navigation.lastMovedRound=2;}
 if(entry.type==='ACTIVATE_SHIP_HACK'){v.abilities.codeAttempted=true;v.abilities.shipHackUnlocked=true;}
 if(['OFFER_PROMISE','ACCEPT_PROMISE','DECLINE_PROMISE','DECLARE_HACK_SIDE'].includes(entry.type)){
  v.phase={id:'phase-talk',kind:'HACK',startedAt:1000,endsAt:61000};v.hackSession={id:'talk-1',actorSeatId:v.self.seatId,targetSeatId:'seat-1'};
  if(entry.type==='DECLARE_HACK_SIDE')v.phase={id:'phase-declare',kind:'HACK_DECLARE',startedAt:1000,endsAt:16000};
  v.promises=[{id:'incoming-promise',giverSeatId:'seat-1',recipientSeatId:v.self.seatId,kind:'MEET_A',targetSeatId:null,round:v.round,electionId:null,accepted:false,status:'Pending',offerStatus:'offered'}];
 }
 if(entry.type==='SELECT_BLACKOUT_SLOT'){
  v.phase={id:'phase-dark',kind:'BLACKOUT',startedAt:1000,endsAt:16000};v.blackout={windowId:'blackout-1',previewEndsAt:6000,endsAt:16000};v.blackoutTargeting={windowId:'blackout-1',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3']};
 }
 if(entry.type==='SHOW_WINDOW')v.windows=[{windowId:'A_B',canDraw:true,drawings:[]}];
 const r=rig(v,{now:entry.type==='SELECT_BLACKOUT_SLOT'?6001:1000});await r.controller.start();
 if(entry.type==='SHOW_WINDOW')r.controller.showDrawing('A_B',entry.command.drawing);else{r.controller.begin(entry.type);for(const value of entry.choose)r.controller.choose(value);}
 assert.equal(r.read().action?.step,'confirm');
 if(entry.type==='OFFER_PROMISE')assert.match(r.read().action.confirmation,/Player 3/);
 if(entry.type==='ACCEPT_PROMISE')assert.match(r.read().action.confirmation,/both in Room A.*Round 6/);
 await r.controller.confirm();assert.equal(r.sent.length,1);assert.deepEqual(r.sent[0].command,entry.command);assert.ok(PlanetCommandRequestSchema.safeParse(r.sent[0]).success);r.controller.dispose();
});
test('a changed empty slot is rechecked at confirmation',async()=>{
 const r=rig();await r.controller.start();r.controller.begin('MOVE');r.controller.choose('Room B');r.controller.choose('B5');
 const next=planetView();next.viewRevision=2;next.board.seats[4].location='Room B';next.board.seats[4].slotId='B5';r.push(next);await r.controller.confirm();assert.equal(r.sent.length,0);assert.equal(r.read().action,null);r.controller.dispose();
});
test('Promise outcomes remain the server statuses when a current board changes',async()=>{
 const v=planetView();v.promises=[{id:'accepted-promise',giverSeatId:v.self.seatId,recipientSeatId:'seat-1',kind:'MEET_A',targetSeatId:null,round:6,electionId:null,accepted:true,status:'Pending',offerStatus:'accepted'}];v.promiseQuota.given=true;
 const r=rig(v);await r.controller.start();r.controller.openPanel('promises');assert.equal(r.read().privateArea.promises[0].status,'Pending');
 const next=structuredClone(v);next.viewRevision=2;next.board.seats[5].location='Room A';next.board.seats[5].slotId='A5';next.board.seats[4].location='Room B';next.board.seats[4].slotId='B1';r.push(next);assert.equal(r.read().privateArea.promises[0].status,'Pending');r.controller.dispose();
});
test('private office route cannot enter a non-office view',async()=>{
 const v=planetView();v.privateNavigation={position:'R2',direction:'Red',tieChoice:false,confirmation:null};const r=rig(v);await r.controller.start();assert.equal(r.read().connection,'error');assert.equal(r.read().board,null);r.controller.dispose();
});
test('Blackout removes occupants and window contents while retaining fixed slot choices',async()=>{
 const v=planetView('Blue Disabler');v.phase={id:'phase-dark',kind:'BLACKOUT',startedAt:0,endsAt:15000};v.blackout={windowId:'blackout-1',previewEndsAt:5000,endsAt:15000};v.blackoutTargeting={windowId:'blackout-1',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3']};v.offers=[{type:'SELECT_BLACKOUT_SLOT',targetSeatIds:[],slotIds:['A1','A2','A3'],windowIds:[]}];
 const r=rig(v);await r.controller.start();await r.advance(5000);assert.equal(r.read().dark,true);assert.equal(r.read().board,null);r.controller.openPanel('windows');assert.deepEqual(r.read().privateArea.windows,[]);r.controller.begin('SELECT_BLACKOUT_SLOT');assert.deepEqual(r.read().action.choices.map(c=>c.value),['A1','A2','A3']);
 const next=structuredClone(v);next.viewRevision=2;next.blackoutTargeting.slotIds=['A4'];r.push(next);assert.equal(r.read().connection,'error');r.controller.dispose();
});
