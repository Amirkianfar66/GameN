// Constructed pure-module controls, not native lifecycle/Sync, service or Balance evidence.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLANET_GAME_PINS, PlanetPromiseSchema, PlanetWindowDrawingSchema } from '@mothership/contracts';
import { socialPlanetCommand, planetWindows, finalizePlanetPromises } from '../dist/planet-game/social.js';

const copy = value => structuredClone(value);
const picture = () => ({strokes:[{color:'#123ABC',width:3,points:[[0,0],[0.5,0.5],[1,1]]}]});
function fixture(count=7) {
  const roles=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien',...(count>=8?['Red Disabler']:[]),...(count===9?['Engineer']:[])];
  const ids=roles.map((_,i)=>`seat-${i+1}`);
  const seats=ids.map((seatId,i)=>({seatId,health:'Healthy',location:i<5?'Room A':'Room B',slotId:i<5?`A${i+1}`:`B${i-4}`,lastRoom:i<5?'Room A':'Room B',jailed:false,revealedFaction:null,rescueDueAfterRound:null,
    ordinaryWeapons:0,roleActionSpent:false,shotSpent:false,protection:null,protectionEver:false,clone:{used:false,active:false,expiresAfterRound:null},blackoutSpent:false,engineerSpent:false}));
  return {matchId:'social-fixture',versions:{...PLANET_GAME_PINS,assetManifestVersion:'social-test-art'},playerCount:count,round:3,
    phase:{id:'talk-phase',kind:'HACK',startedAt:1000,endsAt:61000},evaluatedAt:1100,deadlineToken:'talk-deadline',
    roles:Object.fromEntries(ids.map((id,i)=>[id,roles[i]])),code:['seat-1','seat-2','seat-5','seat-7'],
    worlds:{Original:{seats,actions:[],injectionsRemaining:2,captainSeatId:null,officerSeatId:null,releaseUsed:false,ejectUsed:false,shipHackSpent:false,shipHackOverride:false,suppressedSeatIds:[],events:[]}},
    realityOf:Object.fromEntries(ids.map(id=>[id,'Original'])),currentWorldId:'Original',blackholeActive:false,nextWorldNumber:1,
    global:{movementSpent:[],blockedSeatId:null,lastBlockedSeatId:null,blackholeSpent:false,blackholeRound:null,panelAttempts:[],scanResults:[],scanUsedRound:null,scanBlockedThroughRound:null,codeAttempted:false,shipHackUnlocked:false,
      hackCounts:Object.fromEntries(ids.map(id=>[id,0])),hackSpent:[],promises:[],promiseGiven:[],promiseReceived:[],declinedPromiseIds:[],promiseEvaluation:{},drawings:[],roundOrders:{}},
    turnOrder:ids,turnIndex:0,activeSeatId:'seat-1',hack:{id:'private-talk',actorSeatId:'seat-1',targetSeatId:'seat-2',declaredSide:null,status:'NO_DECLARATION'},panelOpen:true,
    ballot:null,lastTally:null,afterVote:null,electionNeeded:false,navigation:{position:'Junction',direction:null,lastMovedRound:2,arrivedAt:null,started:true},result:null,
    finalized:{round:2,seats:[],events:[]},revisions:{public:1,players:Object.fromEntries(ids.map(id=>[id,1]))}};
}
const seat = (s,id,world='Original') => s.worlds[world].seats.find(value=>value.seatId===id);
function unchanged(s,operation) { const before=copy(s);assert.equal(operation(),false);assert.deepEqual(s,before); }
function offer(s,kind,{id='promise-one',giver='seat-1',recipient='seat-2',target=null}={}) {
  s.hack={id:'private-talk',actorSeatId:giver,targetSeatId:recipient,declaredSide:null,status:'NO_DECLARATION'};
  assert.equal(socialPlanetCommand(s,giver,{type:'OFFER_PROMISE',recipientSeatId:recipient,kind,targetSeatId:target},id),true);
  return s.global.promises.find(p=>p.id===id);
}
function accepted(s,kind,options={}) {
  const p=offer(s,kind,options);assert.equal(socialPlanetCommand(s,p.recipientSeatId,{type:'ACCEPT_PROMISE',promiseId:p.id},`accept-${p.id}`),true);PlanetPromiseSchema.parse(p);return p;
}
const election = (s,patch={}) => finalizePlanetPromises(s,'ELECTION',{electionId:'next-election',ballotPhaseId:'first-ballot',candidateSeatIds:['seat-2','seat-3'],votes:{'seat-1':'seat-2'},electionComplete:true,captainSeatId:'seat-2',...patch});

for(const count of [7,8,9]) {
  test(`${count}: six strict fixed Promise cards require recipient acceptance in the active private conversation`,()=>{
    for(const kind of ['CAPTAIN_SUPPORT','OFFICER_SELECTION','JAIL_VOTE','NO_JAIL_VOTE','MEET_A','MEET_B']) {
      const s=fixture(count),p=offer(s,kind,{target:kind==='JAIL_VOTE'?'seat-7':null});
      assert.equal(p.accepted,false);assert.equal(p.offerStatus,'offered');assert.deepEqual(s.global.promiseGiven,[]);assert.deepEqual(s.global.promiseReceived,[]);
      unchanged(s,()=>socialPlanetCommand(s,'seat-3',{type:'ACCEPT_PROMISE',promiseId:p.id},'outsider-accept'));
      assert.equal(socialPlanetCommand(s,'seat-2',{type:'ACCEPT_PROMISE',promiseId:p.id},'accept-draft'),true);
      assert.equal(p.accepted,true);assert.equal(p.offerStatus,'accepted');assert.deepEqual(s.global.promiseGiven,['seat-1']);assert.deepEqual(s.global.promiseReceived,['seat-2']);
      unchanged(s,()=>socialPlanetCommand(s,'seat-2',{type:'ACCEPT_PROMISE',promiseId:p.id},'second-accept'));
    }
  });
  test(`${count}: malformed/outside-talk/dead actions refuse without mutation and rejected drafts leave quotas free`,()=>{
    const s=fixture(count);
    for(const command of [{type:'OFFER_PROMISE',recipientSeatId:'seat-1',kind:'MEET_A',targetSeatId:null},
      {type:'OFFER_PROMISE',recipientSeatId:'seat-3',kind:'MEET_A',targetSeatId:null},
      {type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'JAIL_VOTE',targetSeatId:null},
      {type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:'seat-3'}])unchanged(s,()=>socialPlanetCommand(s,'seat-1',command,'invalid-offer'));
    const p=offer(s,'MEET_A');assert.equal(socialPlanetCommand(s,'seat-2',{type:'DECLINE_PROMISE',promiseId:p.id},'decline'),true);
    assert.equal(p.offerStatus,'declined');PlanetPromiseSchema.parse(p);
    assert.deepEqual(s.global.promiseGiven,[]);assert.deepEqual(s.global.promiseReceived,[]);
    unchanged(s,()=>socialPlanetCommand(s,'seat-2',{type:'ACCEPT_PROMISE',promiseId:p.id},'declined-accept'));
    accepted(s,'MEET_B',{id:'replacement'});
    const phases=['ORDINARY_TURN','HACK_DECLARE','HACK_RESULT','FINISHED','ABORTED'];
    for(const kind of phases){const other=fixture(count);other.phase.kind=kind;unchanged(other,()=>socialPlanetCommand(other,'seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null},'outside-talk'));}
    const dead=fixture(count);seat(dead,'seat-1').health='Eliminated';unchanged(dead,()=>socialPlanetCommand(dead,'seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null},'dead-offer'));
  });
  test(`${count}: accepted given/received quotas survive finalization and whole-world replacement, while directions remain independent`,()=>{
    const s=fixture(count),p=accepted(s,'MEET_A');finalizePlanetPromises(s,'MEETING');assert.equal(p.status,'Fulfilled');
    s.worlds.Beta=copy(s.worlds.Original);s.currentWorldId='Beta';for(const id of Object.keys(s.realityOf))s.realityOf[id]='Beta';s.round++;
    s.hack={id:'next-talk',actorSeatId:'seat-1',targetSeatId:'seat-3',declaredSide:null,status:'NO_DECLARATION'};
    unchanged(s,()=>socialPlanetCommand(s,'seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-3',kind:'MEET_A',targetSeatId:null},'given-again'));
    s.hack={...s.hack,actorSeatId:'seat-3',targetSeatId:'seat-2'};
    unchanged(s,()=>socialPlanetCommand(s,'seat-3',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null},'received-again'));
    accepted(s,'MEET_B',{id:'reverse',giver:'seat-2',recipient:'seat-1'});
    assert.deepEqual(s.global.promiseGiven,['seat-1','seat-2']);assert.equal(p.status,'Fulfilled');
  });
  test(`${count}: meeting evaluation waits for Sync and uses final pair locations, never each actor's speculative scene`,()=>{
    const s=fixture(count),p=accepted(s,'MEET_A');s.worlds.Beta=copy(s.worlds.Original);s.realityOf['seat-1']='Beta';s.blackholeActive=true;
    for(const id of ['seat-1','seat-2']){seat(s,id).location='Room B';seat(s,id).slotId=id==='seat-1'?'B3':'B4';}
    finalizePlanetPromises(s,'MEETING');assert.equal(p.status,'Pending');s.blackholeActive=false;finalizePlanetPromises(s,'MEETING');assert.equal(p.status,'Not fulfilled');
    for(const id of ['seat-1','seat-2'])seat(s,id).location='Room A';finalizePlanetPromises(s,'MEETING');assert.equal(p.status,'Not fulfilled','Finalized result is immutable');
    const together=fixture(count),ok=accepted(together,'MEET_B');for(const id of ['seat-1','seat-2'])seat(together,id).location='Room B';finalizePlanetPromises(together,'MEETING');assert.equal(ok.status,'Fulfilled');
  });
  test(`${count}: Jail Promise evaluates actual votes even when a full physical Jail prevents admission`,()=>{
    const s=fixture(count),p=accepted(s,'JAIL_VOTE',{target:'seat-7'});
    for(let n=1;n<=5;n++)Object.assign(seat(s,`seat-${n}`),{location:'Jail',slotId:`J${n}`,jailed:true});
    finalizePlanetPromises(s,'JAIL',{votes:{'seat-1':'seat-7'}});assert.equal(p.status,'Fulfilled');assert.equal(seat(s,'seat-7').jailed,false);
    const abstained=fixture(count),no=accepted(abstained,'NO_JAIL_VOTE');finalizePlanetPromises(abstained,'JAIL',{votes:{'seat-1':null}});assert.equal(no.status,'Fulfilled');
    const broken=fixture(count),bad=accepted(broken,'NO_JAIL_VOTE');finalizePlanetPromises(broken,'JAIL',{votes:{'seat-1':'seat-2'}});assert.equal(bad.status,'Not fulfilled');
  });
  test(`${count}: an occurring Jail ballot cannot fulfill either Jail Promise for an eliminated or otherwise ineligible giver`,()=>{
    for(const kind of ['JAIL_VOTE','NO_JAIL_VOTE'])for(const withBallot of [false,true]) {
      const s=fixture(count),p=accepted(s,kind,{target:kind==='JAIL_VOTE'?'seat-7':null});
      // Construct a selected-world EJECT result; the discarded actor world still has a living giver.
      s.worlds.Selected=copy(s.worlds.Original);s.currentWorldId='Selected';
      Object.assign(seat(s,'seat-1','Selected'),{health:'Eliminated',location:null,slotId:null,jailed:false});
      if(withBallot)s.ballot={kind:'JAIL_VOTE',eligibleVoters:Object.keys(s.roles).filter(id=>id!=='seat-1'),eligibleTargets:['seat-7'],votes:{},runoff:false,electionId:'jail-ballot'};
      finalizePlanetPromises(s,'JAIL',withBallot?{}:{votes:{}});
      assert.equal(p.status,'Not fulfilled');assert.equal(p.offerStatus,'accepted');PlanetPromiseSchema.parse(p);
      assert.deepEqual(s.global.promiseGiven,['seat-1']);assert.deepEqual(s.global.promiseReceived,['seat-2']);
      finalizePlanetPromises(s,'JAIL',{votes:{'seat-1':'seat-7'}});finalizePlanetPromises(s,'ROUND_END');
      assert.equal(p.status,'Not fulfilled','The final result cannot be repaired by a later callback');
    }
    const excluded=fixture(count),blocked=accepted(excluded,'NO_JAIL_VOTE');
    excluded.ballot={kind:'JAIL_VOTE',eligibleVoters:['seat-2'],eligibleTargets:['seat-2'],votes:{},runoff:false,electionId:'jail-ballot'};
    finalizePlanetPromises(excluded,'JAIL');assert.equal(blocked.status,'Not fulfilled','Actual ballot eligibility overrides living-state fallback');
    for(const withBallot of [false,true])for(const votes of [{},{'seat-1':null}]) {
      const s=fixture(count),p=accepted(s,'NO_JAIL_VOTE');
      if(withBallot)s.ballot={kind:'JAIL_VOTE',eligibleVoters:Object.keys(s.roles),eligibleTargets:['seat-2'],votes,runoff:false,electionId:'jail-ballot'};
      finalizePlanetPromises(s,'JAIL',withBallot?{}:{votes});
      assert.equal(p.status,'Fulfilled','An eligible omitted or explicit-null ballot remains abstention');
    }
  });
  test(`${count}: absent same-round opportunities are Condition not met, future election cards wait and all prior results remain immutable`,()=>{
    const s=fixture(count),p=accepted(s,'NO_JAIL_VOTE');finalizePlanetPromises(s,'JAIL');assert.equal(p.status,'Pending','Missing ballots cannot fabricate success');finalizePlanetPromises(s,'ROUND_END');assert.equal(p.status,'Condition not met');
    const future=fixture(count),f=accepted(future,'CAPTAIN_SUPPORT');finalizePlanetPromises(future,'ROUND_END');assert.equal(f.status,'Pending');future.round++;finalizePlanetPromises(future,'MATCH_END');assert.equal(f.status,'Condition not met');
    finalizePlanetPromises(s,'JAIL',{votes:{}});assert.equal(p.status,'Condition not met');
  });
  test(`${count}: Captain Support follows every actual candidacy ballot/runoff, counting a repeated close once`,()=>{
    const s=fixture(count),p=accepted(s,'CAPTAIN_SUPPORT');
    election(s,{electionComplete:false});election(s,{electionComplete:false});assert.equal(s.global.promiseEvaluation[p.id].candidateBallots,1);
    election(s,{ballotPhaseId:'runoff',votes:{'seat-1':null}});assert.equal(p.status,'Not fulfilled');assert.equal(s.global.promiseEvaluation[p.id].candidateBallots,2);
    const later=fixture(count),ok=accepted(later,'CAPTAIN_SUPPORT');election(later,{candidateSeatIds:['seat-3'],electionComplete:false,votes:{}});election(later,{ballotPhaseId:'runoff'});assert.equal(ok.status,'Fulfilled');
    const absent=fixture(count),none=accepted(absent,'CAPTAIN_SUPPORT');election(absent,{candidateSeatIds:['seat-3'],votes:{'seat-1':'seat-3'}});assert.equal(none.status,'Condition not met');
  });
  test(`${count}: election promises bind one future election and Officer Selection depends on giver victory and actual appointment`,()=>{
    const s=fixture(count),p=accepted(s,'OFFICER_SELECTION');finalizePlanetPromises(s,'ROUND_END');s.round+=2;
    election(s,{captainSeatId:'seat-1'});assert.equal(p.status,'Pending');
    finalizePlanetPromises(s,'APPOINTMENT',{electionId:'other-election',captainSeatId:'seat-1',officerSeatId:'seat-2'});assert.equal(p.status,'Pending');
    finalizePlanetPromises(s,'APPOINTMENT',{electionId:'next-election',captainSeatId:'seat-1',officerSeatId:'seat-2'});assert.equal(p.status,'Fulfilled');
    const lost=fixture(count),no=accepted(lost,'OFFICER_SELECTION');election(lost,{captainSeatId:'seat-3'});assert.equal(no.status,'Condition not met');
    const timeout=fixture(count),miss=accepted(timeout,'OFFICER_SELECTION');election(timeout,{captainSeatId:'seat-1'});finalizePlanetPromises(timeout,'APPOINTMENT',{captainSeatId:'seat-1',officerSeatId:null});assert.equal(miss.status,'Not fulfilled');
  });
  test(`${count}: window endpoint/station permissions are exact, free and nontransitive, including Hospital/Jail`,()=>{
    const s=fixture(count);assert.deepEqual(planetWindows(s,'seat-1').map(w=>[w.windowId,w.canDraw]),[['A_B',true],['A_HOSPITAL',false]]);
    assert.deepEqual(planetWindows(s,'seat-2').map(w=>[w.windowId,w.canDraw]),[['A_B',false],['A_HOSPITAL',true]]);
    assert.deepEqual(planetWindows(s,'seat-6').map(w=>[w.windowId,w.canDraw]),[['A_B',true],['B_JAIL',false]]);
    assert.deepEqual(planetWindows(s,'seat-7').map(w=>[w.windowId,w.canDraw]),[['A_B',false],['B_JAIL',true]]);
    Object.assign(seat(s,'seat-3'),{location:'Hospital',slotId:'H1',health:'Injured'});assert.deepEqual(planetWindows(s,'seat-3').map(w=>[w.windowId,w.canDraw]),[['A_HOSPITAL',false]]);
    Object.assign(seat(s,'seat-4'),{location:'Jail',slotId:'J1',jailed:true});assert.deepEqual(planetWindows(s,'seat-4').map(w=>[w.windowId,w.canDraw]),[['B_JAIL',false]]);
    Object.assign(seat(s,'seat-5'),{location:'Command Room',slotId:'C1'});assert.deepEqual(planetWindows(s,'seat-5'),[]);
    s.global.blockedSeatId='seat-1';assert.equal(socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing:picture()},'blocked-artist'),true);
    assert.deepEqual(s.global.movementSpent,[]);assert.equal(seat(s,'seat-1').roleActionSpent,false);assert.equal(seat(s,'seat-1').shotSpent,false);
    unchanged(s,()=>socialPlanetCommand(s,'seat-3',{type:'SHOW_WINDOW',windowId:'A_HOSPITAL',drawing:picture()},'patient-draw'));
  });
  test(`${count}: shown drawings append immutable author records with window-local order and round expiry`,()=>{
    const s=fixture(count),drawing=picture();assert.equal(socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing},'first-art'),true);
    assert.equal(socialPlanetCommand(s,'seat-2',{type:'SHOW_WINDOW',windowId:'A_HOSPITAL',drawing:picture()},'other-window'),true);
    assert.equal(socialPlanetCommand(s,'seat-6',{type:'SHOW_WINDOW',windowId:'A_B',drawing:picture()},'second-art'),true);
    assert.deepEqual(planetWindows(s,'seat-1')[0].drawings.map(d=>[d.id,d.authorSeatId,d.order]),[['first-art','seat-1',0],['second-art','seat-6',1]]);
    drawing.strokes[0].points[0][0]=0.8;assert.equal(s.global.drawings[0].drawing.strokes[0].points[0][0],0);
    const shown=planetWindows(s,'seat-1');shown[0].drawings[0].drawing.strokes[0].points[0][0]=0.9;assert.equal(s.global.drawings[0].drawing.strokes[0].points[0][0],0);
    s.global.drawings.forEach(d=>PlanetWindowDrawingSchema.parse(d));
    unchanged(s,()=>socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing:picture()},'first-art'));
    s.worlds.Beta=copy(s.worlds.Original);s.realityOf['seat-1']='Beta';assert.equal(planetWindows(s,'seat-1')[0].drawings.length,2);
    finalizePlanetPromises(s,'ROUND_END');assert.deepEqual(s.global.drawings,[]);
  });
  test(`${count}: Blackout darkness and terminal/ended rounds never expose drawings through another view`,()=>{
    const s=fixture(count);s.phase={id:'blackout',kind:'BLACKOUT',startedAt:1000,endsAt:16000};
    assert.equal(socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing:picture()},'lit-art',5999),true);
    assert.equal(planetWindows(s,'seat-1',5999)[0].drawings.length,1);
    assert.deepEqual(planetWindows(s,'seat-1',6000),[]);unchanged(s,()=>socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing:picture()},'dark-art',6000));
    s.phase.kind='ORDINARY_TURN';s.navigation.lastMovedRound=s.round;assert.deepEqual(planetWindows(s,'seat-1'),[]);
    for(const kind of ['FINISHED','ABORTED']){s.phase.kind=kind;assert.deepEqual(planetWindows(s,'seat-1'),[]);unchanged(s,()=>socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing:picture()},'terminal'));}
  });
}

test('window Show uses the strict bounded vector contract, with no markup/URL/erase channel',()=>{
  for(const drawing of [{svg:'<script />'},{strokes:[]},{strokes:[{color:'red',width:1,points:[[0,0]]}]},
    {strokes:[{color:'#123456',width:25,points:[[0,0]]}]},{strokes:[{color:'#123456',width:1,points:[[2,0]]}]},
    {strokes:[{color:'#123456',width:1,points:[[0,0]],url:'https://example.invalid'}]},
    {strokes:Array.from({length:9},()=>({color:'#123456',width:1,points:Array.from({length:512},()=>[0,0])}))}]) {
    const s=fixture();unchanged(s,()=>socialPlanetCommand(s,'seat-1',{type:'SHOW_WINDOW',windowId:'A_B',drawing},'invalid-picture'));
  }
});

test('draft acceptance remains pair-private and current-round; finalized records and quotas cannot be replaced',()=>{
  const s=fixture(),p=offer(s,'MEET_A');s.round++;unchanged(s,()=>socialPlanetCommand(s,'seat-2',{type:'ACCEPT_PROMISE',promiseId:p.id},'late-accept'));
  const other=fixture();accepted(other,'JAIL_VOTE',{target:'seat-7'});finalizePlanetPromises(other,'JAIL',{votes:{'seat-1':'seat-7'}});
  unchanged(other,()=>socialPlanetCommand(other,'seat-1',{type:'OFFER_PROMISE',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null},'replace-result'));
  assert.equal(other.global.promises[0].status,'Fulfilled');
});


test('missing winner evidence and speculative opportunity callbacks never invent Promise results',()=>{
  const s=fixture(),p=accepted(s,'OFFICER_SELECTION');
  finalizePlanetPromises(s,'ELECTION',{electionId:'future-election',ballotPhaseId:'ballot',candidateSeatIds:['seat-1','seat-2'],votes:{'seat-1':'seat-1'},electionComplete:true});
  assert.equal(p.status,'Pending');assert.equal(s.global.promiseEvaluation[p.id].captainWon,null);
  const speculative=fixture(),meeting=accepted(speculative,'MEET_A');speculative.blackholeActive=true;
  const before=copy(speculative);
  for(const opportunity of ['MEETING','JAIL','ELECTION','APPOINTMENT','ROUND_END'])finalizePlanetPromises(speculative,opportunity,{electionId:'speculative',ballotPhaseId:'ballot',candidateSeatIds:['seat-2'],votes:{'seat-1':'seat-2'},electionComplete:true,captainSeatId:'seat-1',officerSeatId:'seat-2'});
  assert.equal(meeting.status,'Pending');assert.deepEqual(speculative,before);
});


test('offer history distinguishes declined and expired drafts without consuming quotas or rewriting accepted results',()=>{
  const s=fixture(),declined=offer(s,'MEET_A',{id:'declined-draft'});
  assert.equal(socialPlanetCommand(s,'seat-2',{type:'DECLINE_PROMISE',promiseId:declined.id},'decline-draft'),true);
  const expired=offer(s,'MEET_B',{id:'expired-draft'});
  const committed=accepted(s,'CAPTAIN_SUPPORT',{id:'accepted-card'});
  finalizePlanetPromises(s,'ROUND_END');
  assert.deepEqual(s.global.promises.map(p=>[p.id,p.offerStatus,p.accepted,p.status]),[
    ['declined-draft','declined',false,'Pending'],['expired-draft','expired',false,'Pending'],['accepted-card','accepted',true,'Pending'],
  ]);
  for(const p of s.global.promises)PlanetPromiseSchema.parse(p);
  assert.deepEqual(s.global.promiseGiven,['seat-1']);assert.deepEqual(s.global.promiseReceived,['seat-2']);
  finalizePlanetPromises(s,'MATCH_END');assert.equal(committed.offerStatus,'accepted');assert.equal(committed.status,'Condition not met');
  assert.equal(declined.offerStatus,'declined');assert.equal(expired.offerStatus,'expired');
});

test('declined or expired offer state cannot be accepted again even if a separate legacy decline index is absent',()=>{
  for(const offerStatus of ['declined','expired']){
    const s=fixture(),p=offer(s,'MEET_A');p.offerStatus=offerStatus;
    unchanged(s,()=>socialPlanetCommand(s,'seat-2',{type:'ACCEPT_PROMISE',promiseId:p.id},'revive-draft'));
    unchanged(s,()=>socialPlanetCommand(s,'seat-2',{type:'DECLINE_PROMISE',promiseId:p.id},'decline-again'));
    assert.deepEqual(s.global.promiseGiven,[]);assert.deepEqual(s.global.promiseReceived,[]);PlanetPromiseSchema.parse(p);
  }
});
