import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FullCommandRequestSchema,FullPlayerViewSchema,FullPublicViewSchema,FullPhaseSchema,FullPublicEventSchema,FullPlayerEventSchema} from '@mothership/contracts';
import {DECLARED_HACK_FULL_GAME_VERSION_PINS as FULL_GAME_VERSION_PINS,VOTE_RESULT_FULL_GAME_VERSION_PINS,createFullGame,executeFullGame,advanceFullGame,projectFullGame} from '@mothership/engine';
import {choosePracticeBotActions} from '../../services/game-api/dist/practice-bot-policy.js';
const rolesFor=n=>['Insider','Cracker','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(n>=8?['Red Disabler']:[]),...(n===9?['Officer']:[])];
let serial=0;
function ctx(now){return {now,nextPhaseId:`contract-hack-phase-${++serial}`,nextDeadlineToken:`contract-hack-token-${serial}`};}
function make(n,role='Undercover',pins=FULL_GAME_VERSION_PINS){
 const roles=rolesFor(n),i=roles.indexOf(role);[roles[1],roles[i]]=[roles[i],roles[1]];
 const ids=roles.map((_,i)=>`seat-${i+1}`),extra=ids.filter((_,i)=>!['Undercover','Alien'].includes(roles[i])).slice(0,3);
 let s=createFullGame({matchId:'contract-hack',assetManifestVersion:'contract-assets',versions:{...pins,assetManifestVersion:'contract-assets'},now:100,phaseId:'contract-initial',deadlineToken:'contract-initial-token',setup:{playerCount:n,roleOrder:roles,codeExtraSeatIds:extra,initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<5?'Room A':'Room B'])),roundOrders:Array.from({length:5},()=>ids)}});
 const command=(actor,c)=>{const next=executeFullGame(s,actor,{protocolVersion:2,matchId:s.matchId,phaseId:s.phase.id,commandId:`contract-command-${++serial}`,command:c},ctx(s.phase.startedAt+1));assert.equal(next.receipt.status,'accepted');s=next.state;};
 command('seat-1',{type:'REQUEST_HACK',targetSeatId:'seat-2'});command('seat-1',{type:'PASS_TURN'});
 return {get state(){return s;},declare(side){command('seat-2',{type:'DECLARE_HACK_SIDE',declaredSide:side});},next(){const r=advanceFullGame(s,{...ctx(s.phase.endsAt),phaseId:s.phase.id,deadlineToken:s.deadlineToken});assert.equal(r.advanced,true);s=r.state;}};
}
const invalid=(schema,value)=>assert.equal(schema.safeParse(value).success,false);
for(const n of [7,8,9]){
 test(`${n} seats: declaration envelope accepts all three claims without role, truth or target fields`,()=>{
  const base={protocolVersion:2,matchId:'contract-hack',phaseId:'current-phase',commandId:'declare-command',command:{type:'DECLARE_HACK_SIDE',declaredSide:'Blue'}};
  for(const side of ['Blue','Red','Alien'])FullCommandRequestSchema.parse({...base,command:{type:'DECLARE_HACK_SIDE',declaredSide:side}});
  for(const side of ['Green',null,1])invalid(FullCommandRequestSchema,{...base,command:{type:'DECLARE_HACK_SIDE',declaredSide:side}});
  for(const key of ['targetSeatId','role','actualFaction','truthful','matched'])invalid(FullCommandRequestSchema,{...base,command:{...base.command,[key]:'private'}});
 });
 test(`${n} seats: current feedback binds exact phase, exchange, round and private audience`,()=>{
  const h=make(n);const projected=projectFullGame(h.state),target=projected.players['seat-2'],initiator=projected.players['seat-1'];
  assert.deepEqual(Object.keys(target.hackFeedback).sort(),['hackId','phaseId','round','status','declaredSide'].sort());
  assert.deepEqual(target.legalTargets.DECLARE_HACK_SIDE,['seat-2']);assert.equal(initiator.legalTargets.DECLARE_HACK_SIDE,undefined);
  assert.equal(projected.players['seat-3'].hackFeedback,null);assert.equal(projected.public.hackFeedback,undefined);
  for(const v of [target,initiator,projected.players['seat-3']])FullPlayerViewSchema.parse(v);
  for(const patch of [{phaseId:'obsolete-phase'},{hackId:'obsolete-exchange'},{round:2},{status:'DECLARED',declaredSide:'Blue'}])invalid(FullPlayerViewSchema,{...target,hackFeedback:{...target.hackFeedback,...patch}});
  invalid(FullPlayerViewSchema,{...target,hackFeedback:undefined});const absent=structuredClone(target);delete absent.hackFeedback;invalid(FullPlayerViewSchema,absent);
  invalid(FullPlayerViewSchema,{...target,legalTargets:{DECLARE_HACK_SIDE:['seat-1']}});
  invalid(FullPlayerViewSchema,{...initiator,legalTargets:{DECLARE_HACK_SIDE:['seat-1']}});
  invalid(FullPlayerViewSchema,{...projected.players['seat-3'],hackFeedback:target.hackFeedback});
  h.declare('Alien');const result=projectFullGame(h.state).players['seat-1'];FullPlayerViewSchema.parse(result);
  invalid(FullPlayerViewSchema,{...initiator,hackPartnerSeatId:null,hackFeedback:null});
  invalid(FullPlayerViewSchema,{...result,hackPartnerSeatId:null,hackFeedback:null});
  assert.equal(result.hackFeedback.hackId,target.hackFeedback.hackId);assert.equal(result.hackFeedback.phaseId,h.state.phase.id);
  invalid(FullPlayerViewSchema,{...result,hackFeedback:target.hackFeedback});
  for(const patch of [{declaredSide:null},{status:'NO_DECLARATION'},{truthful:true},{matched:true},{actualFaction:'Red'}])invalid(FullPlayerViewSchema,{...result,hackFeedback:{...result.hackFeedback,...patch}});
  h.next();const talk=projectFullGame(h.state).players['seat-1'];FullPlayerViewSchema.parse(talk);invalid(FullPlayerViewSchema,{...talk,hackPartnerSeatId:null,hackFeedback:null});invalid(FullPlayerViewSchema,{...talk,hackFeedback:result.hackFeedback});
 });
 test(`${n} seats: new phase durations, tuple gates and Code embargo remain strict`,()=>{
  const h=make(n),declaration=projectFullGame(h.state);assert.equal(declaration.public.phase.endsAt-declaration.public.phase.startedAt,15000);
  for(const kind of ['HACK_DECLARE','HACK_RESULT','HACK','VOTE_RESULT','ORDINARY_TURN']){
   const duration=kind==='HACK_DECLARE'?15000:['HACK_RESULT','VOTE_RESULT'].includes(kind)?5000:60000;
   FullPhaseSchema.parse({id:'phase',kind,startedAt:100,endsAt:100+duration});
   for(const wrong of [duration-1,duration+1,60001])invalid(FullPhaseSchema,{id:'phase',kind,startedAt:100,endsAt:100+wrong});
  }
  for(const versions of [{...declaration.public.versions,engineVersion:'full-game-1.4.0'},{...VOTE_RESULT_FULL_GAME_VERSION_PINS,assetManifestVersion:'contract-assets'}])invalid(FullPublicViewSchema,{...declaration.public,versions});
  const own=declaration.players['seat-2'];invalid(FullPlayerViewSchema,{...own,self:{...own.self,codeAttemptAvailable:true}});
  h.next();const noInput=projectFullGame(h.state).players['seat-1'];assert.equal(noInput.hackFeedback.status,'NO_DECLARATION');assert.equal(noInput.hackFeedback.declaredSide,null);FullPlayerViewSchema.parse(noInput);
  h.next();FullPlayerViewSchema.parse(projectFullGame(h.state).players['seat-1']);h.next();const ended=projectFullGame(h.state).players['seat-1'];assert.equal(ended.hackFeedback,null);assert.equal(ended.hackPartnerSeatId,null);
 });
 test(`${n} seats: public views and neutral events reject all private claim fields`,()=>{
  const h=make(n);h.declare('Red');const v=projectFullGame(h.state);
  for(const field of ['hackFeedback','hackPartnerSeatId','declaredSide','actualFaction','truthful','role']){
   invalid(FullPublicViewSchema,{...v.public,[field]:v.players['seat-1'].hackFeedback});
   const e={protocolVersion:2,matchId:h.state.matchId,eventId:'neutral-event',viewRevision:0,audience:{kind:'public'},fact:{type:'PHASE_CHANGED',phaseId:h.state.phase.id,[field]:'private'}};
   invalid(FullPublicEventSchema,e);invalid(FullPlayerEventSchema,{...e,audience:{kind:'player',seatId:'seat-1'}});
  }
 });
 test(`${n} seats: historical1.4 omits feedback and does not acquire declaration phases or offers`,()=>{
  const h=make(n,'Undercover',VOTE_RESULT_FULL_GAME_VERSION_PINS),v=projectFullGame(h.state);
  assert.equal(h.state.phase.kind,'HACK');assert.equal(Object.hasOwn(v.players['seat-1'],'hackFeedback'),false);
  invalid(FullPlayerViewSchema,{...v.players['seat-1'],hackFeedback:null});invalid(FullPlayerViewSchema,{...v.players['seat-1'],legalTargets:{DECLARE_HACK_SIDE:['seat-1']}});
 });
 for(const role of rolesFor(n))test(`${n} seats: ${role} practice target uses only its own authorized side`,()=>{
  const h=make(n,role),v=projectFullGame(h.state),own=v.players['seat-2'];
  assert.deepEqual(own.legalTargets.DECLARE_HACK_SIDE,['seat-2']);
  const expected=role==='Alien'?'Alien':['Undercover','Hacker','Red Disabler'].includes(role)?'Red':'Blue';
  const actions=choosePracticeBotActions(own);assert.deepEqual(actions[0],{type:'DECLARE_HACK_SIDE',declaredSide:expected});
  assert.equal(actions.some(c=>c.type==='REQUEST_HACK'||c.type==='SUBMIT_CODE'),false);
  assert.equal(choosePracticeBotActions(v.players['seat-1']).some(c=>c.type==='DECLARE_HACK_SIDE'),false);
  assert.equal(choosePracticeBotActions(v.players['seat-3']).some(c=>c.type==='DECLARE_HACK_SIDE'),false);
  h.declare(expected);assert.equal(choosePracticeBotActions(projectFullGame(h.state).players['seat-2']).some(c=>c.type==='DECLARE_HACK_SIDE'),false);
 });
}
