import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLANET_SYNC_PINS as PLANET_GAME_PINS, PlanetPublicViewSchema, PlanetPlayerViewSchema} from '@mothership/contracts';
import {projectPlanetPublic, projectPlanetPlayer, stampPlanetEventPublications} from '../dist/planet-game/projection.js';
import {createPlanetGame} from '../dist/planet-game/lifecycle.js';

// Constructed authority snapshots exercise projection/privacy boundaries. These
// are not native command histories, emulator acceptance or human balance evidence.
const copy = value => structuredClone(value);
const ROLES = ['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'];
const START = 1_800_000_000_000;
function fixture(count) {
  const ids = ROLES.slice(0,count).map((_,i)=>`seat-${i+1}`);
  const seats = ids.map((seatId,i)=>({seatId,health:'Healthy',location:i<4?'Room A':'Room B',
    slotId:i<4?`A${i+1}`:`B${i-3}`,lastRoom:i<4?'Room A':'Room B',jailed:false,revealedFaction:null,
    rescueDueAfterRound:null,medical:null,ordinaryWeapons:i===4?1:0,roleActionSpent:false,shotSpent:false,
    protection:null,protectionEver:false,clone:{used:false,active:false,expiresAfterRound:null},blackoutSpent:false,engineerSpent:false}));
  const world = {seats,actions:[],injectionsRemaining:2,captainSeatId:null,officerSeatId:null,releaseUsed:false,ejectUsed:false,
    shipHackSpent:false,shipHackOverride:false,suppressedSeatIds:[],events:[]};
  return {matchId:`planet-projection-${count}`,versions:{...PLANET_GAME_PINS,assetManifestVersion:'planet-projection-fixture'},playerCount:count,
    round:4,phase:{id:'phase-ordinary',kind:'ORDINARY_TURN',startedAt:START,endsAt:START+60_000},deadlineToken:'deadline-private',evaluatedAt:START,
    roles:Object.fromEntries(ids.map((id,i)=>[id,ROLES[i]])),code:['seat-5','seat-7','seat-1','seat-2'],
    worlds:{Original:world},realityOf:Object.fromEntries(ids.map(id=>[id,'Original'])),currentWorldId:'Original',blackholeActive:false,blackoutPreviewComplete:false,eventPublications:{},nextWorldNumber:1,
    global:{promiseEvaluation:{},movementSpent:[],blockedSeatId:null,lastBlockedSeatId:null,blackholeSpent:false,blackholeRound:null,panelAttempts:[],
      scanResults:[],scanUsedRound:null,scanBlockedThroughRound:null,codeAttempted:false,shipHackUnlocked:false,hackCounts:{},hackSpent:[],
      promises:[],promiseGiven:[],promiseReceived:[],declinedPromiseIds:[],drawings:[],roundOrders:{4:ids}},
    turnOrder:ids,turnIndex:0,activeSeatId:'seat-1',hack:null,panelOpen:true,ballot:null,lastTally:null,afterVote:null,electionNeeded:false,
    navigation:{position:'Junction',direction:null,lastMovedRound:3,arrivedAt:null,started:true},result:null,
    finalized:{round:3,seats:seats.map(s=>({seatId:s.seatId,health:s.health,location:s.location,slotId:s.slotId,jailed:s.jailed,
      captain:false,officer:false,revealedFaction:null,rescueDueAfterRound:null,medical:null})),events:[]},
    revisions:{public:1,players:Object.fromEntries(ids.map(id=>[id,1]))}};
}
const world = state => state.worlds.Original;
const seat = (state,id) => world(state).seats.find(s=>s.seatId===id);
function makeEvent(count,id,kind='RESCUED',recipients=null,seatIds=['seat-2'],round=4) {
  return {event:{id,kind,round,phaseId:'phase-event-source',viewRevision:1,publishedAt:START,expiresAt:START+30_000,
    audience:recipients===null?{kind:'public'}:{kind:'player',seatId:recipients[0]},seatIds,actorSeatId:null,location:'Room A',
    slotId:kind==='ATTACK_BLOCKED'?'A2':null,clinicalAnchor:['INJURED','RESCUED','ELIMINATED'].includes(kind)
      ?{kind:'CLINICAL_VIGNETTE',batchId:'clinical-batch',anchorId:'HV1',slotCount:count}:null},recipients};
}
function phase(state,kind,duration) {
  state.phase={id:`phase-${kind}`,kind,startedAt:START,endsAt:duration===null?null:START+duration};
}
function office(state,captain='seat-1',officer='seat-3') {
  world(state).captainSeatId=captain;world(state).officerSeatId=officer;
  for(const s of state.finalized.seats){s.captain=s.seatId===captain;s.officer=s.seatId===officer;}
}
for(const count of [7,8,9]) {
  const event=(...args)=>makeEvent(count,...args);
  test(`${count}: native SETUP starts with exact PRE_TURN projections and no private authority leaks`,()=>{
    const ids=ROLES.slice(0,count).map((_,i)=>`seat-${i+1}`),setup={matchId:`native-planet-projection-${count}`,playerCount:count,
      roleOrder:ROLES.slice(0,count),initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),
      initialTurnOrder:ids,assetManifestVersion:'planet-projection-native-fixture'};
    const state=createPlanetGame(setup,{now:START,nextPhaseId:'native-initial',nextDeadlineToken:'native-deadline',random:[]});
    const before=copy(state),pub=projectPlanetPublic(state);assert.equal(pub.round,1);assert.equal(pub.phase.kind,'PRE_TURN');
    assert.equal(pub.phase.endsAt-pub.phase.startedAt,15_000);assert.equal(pub.board.finalizedRound,0);assert.deepEqual(pub.offices,{captainSeatId:null,officerSeatId:null,blockedSeatId:null});
    PlanetPublicViewSchema.parse(pub);for(const id of ids){const own=projectPlanetPlayer(state,id);PlanetPlayerViewSchema.parse(own);
      assert.equal(own.abilities.captainCommands,null);assert.equal(own.ownBallot,null);assert.equal(own.privateNavigation,null);}
    assert.deepEqual(state,before);
  });
  test(`${count}: exact projections preserve the renamed original roster and unmapped Code knowledge`,()=>{
    const s=fixture(count),p=projectPlanetPublic(s);PlanetPublicViewSchema.parse(p);
    assert.equal(p.board.kind,'FINALIZED');assert.equal(p.board.seats.length,count);assert.equal(p.endReveal,null);
    for(const id of s.turnOrder){const v=projectPlanetPlayer(s,id);PlanetPlayerViewSchema.parse(v);assert.equal(v.self.seatId,id);
      assert.equal(v.board.kind,'PLAYER_CURRENT');assert.equal(v.knowledge.knownUndercoverSeatId,['Hacker','Red Disabler'].includes(v.self.role)?'seat-5':null);
      assert.deepEqual(v.knowledge.insiderSeatIds,v.self.role==='Insider'?['seat-2','seat-5','seat-7']:[]);
      assert.equal(v.abilities.injectionsRemaining,v.self.role==='Doctor'?2:null);assert.equal(v.abilities.clone===null,v.self.role!=='Alien');}
    assert.equal(JSON.stringify(projectPlanetPlayer(s,'seat-7')).includes('"code":'),false,'Alien never receives the full Code');
    assert.throws(()=>projectPlanetPlayer(s,'seat-9'+count));
  });
  test(`${count}: speculative physical resources, hidden knowledge and branches do not change the public projection`,()=>{
    const s=fixture(count),before=projectPlanetPublic(s);s.worlds.Beta=copy(world(s));s.realityOf['seat-2']='Beta';s.nextWorldNumber=25;s.blackholeActive=true;
    world(s).injectionsRemaining=0;world(s).shipHackSpent=true;world(s).shipHackOverride=true;world(s).suppressedSeatIds=['seat-1','seat-4'];
    seat(s,'seat-7').clone={used:true,active:true,expiresAfterRound:5};seat(s,'seat-5').ordinaryWeapons=10;
    s.global.scanResults.push({round:4,targetSeatId:'seat-7',guess:'Alien',matched:true,inCode:true});s.global.scanUsedRound=4;
    s.global.codeAttempted=true;s.global.shipHackUnlocked=true;s.global.panelAttempts=['seat-1'];s.global.hackSpent=['seat-2'];
    world(s).events.push(event('private-storage-100','ATTACK_BLOCKED',['seat-2']));
    assert.deepEqual(projectPlanetPublic(s),before);
  });
  test(`${count}: own-world effects never notify a foreign target or alter another player's current board`,()=>{
    const s=fixture(count),original=projectPlanetPlayer(s,'seat-1');s.worlds.Beta=copy(world(s));s.realityOf['seat-2']='Beta';
    const doctor=s.worlds.Beta.seats.find(s=>s.seatId==='seat-2');doctor.health='Injured';doctor.location='Hospital';doctor.slotId='H1';doctor.rescueDueAfterRound=5;doctor.medical={admittedRound:4,rescueDueAfterRound:5,rescueOpportunity:'NEXT_NORMAL_ROUND'};
    s.worlds.Beta.events.push(event('beta-rescue','RESCUED',null,['seat-1']));s.worlds.Beta.injectionsRemaining=0;
    const own=projectPlanetPlayer(s,'seat-2');assert.equal(own.board.seats.find(s=>s.seatId==='seat-2').slotId,'H1');assert.equal(own.events.length,1);
    assert.deepEqual(projectPlanetPlayer(s,'seat-1'),original);assert.equal(own.abilities.injectionsRemaining,0);
    assert.equal(projectPlanetPublic(s).board.seats.find(s=>s.seatId==='seat-2').health,'Healthy');
  });
  test(`${count}: frozen room recipients survive movement/offboarding and exclude later occupants and public audiences`,()=>{
    const s=fixture(count);seat(s,'seat-1').health='Eliminated';seat(s,'seat-1').location=null;seat(s,'seat-1').slotId=null;
    seat(s,'seat-5').location='Room A';seat(s,'seat-5').slotId='A1';
    const blocked=event('frozen-original-999','ATTACK_BLOCKED',['seat-1','seat-2']);world(s).events.push(blocked);s.finalized.events.push(copy(blocked));
    assert.equal(projectPlanetPlayer(s,'seat-1').events.length,1);assert.equal(projectPlanetPlayer(s,'seat-2').events.length,1);
    assert.equal(projectPlanetPlayer(s,'seat-5').events.length,0);assert.deepEqual(projectPlanetPublic(s).events,[]);
    assert.equal(projectPlanetPlayer(s,'seat-1').board.seats.length,count,'Offboarding preserves original identity');
  });
  test(`${count}: hidden storage IDs/counts do not change audience-local occurrence identities`,()=>{
    const a=fixture(count),b=fixture(count),visible=event('storage-counter-2','RESCUED');
    world(a).events=[copy(visible)];world(b).events=[event('hidden-before','ATTACK_BLOCKED',['seat-2']),{...copy(visible),event:{...visible.event,id:'storage-counter-800'}}];
    assert.deepEqual(projectPlanetPlayer(a,'seat-1').events,projectPlanetPlayer(b,'seat-1').events);
    for(const s of [a,b]){s.finalized.events=[event('private-public-counter','ATTACK_BLOCKED',['seat-2']),copy(visible)];}
    assert.deepEqual(projectPlanetPublic(a).events,projectPlanetPublic(b).events);assert.match(projectPlanetPublic(a).events[0].id,/^planet-4-[a-f0-9]{16}-0$/);
    b.finalized.events=[];world(b).events.push({...copy(visible),event:{...visible.event,id:'second-distinct-occurrence'}});
    assert.equal(projectPlanetPlayer(b,'seat-1').events.length,2,'Identical authorized facts remain separate occurrences');
  });
  test(`${count}: canonical visible facts hide attack order and later occurrences do not rename earlier ones`,()=>{
    const a=fixture(count),b=fixture(count),x=event('attack-order-x','ATTACK_BLOCKED',['seat-1'],['seat-3']),y=event('attack-order-y','ATTACK_BLOCKED',['seat-1'],['seat-2']);
    world(a).events=[x,y];world(b).events=[copy(y),copy(x)];
    assert.deepEqual(projectPlanetPlayer(a,'seat-1').events,projectPlanetPlayer(b,'seat-1').events);
    const rescue=event('release-first','RESCUED');world(a).events=[rescue];const original=projectPlanetPlayer(a,'seat-1').events[0];
    world(a).events.push({...event('later-eject','CAPTAIN_EJECT',null,['seat-4']),event:{...event('later-eject','CAPTAIN_EJECT',null,['seat-4']).event,actorSeatId:'seat-1'}});
    const changed=projectPlanetPlayer(a,'seat-1').events.find(e=>e.kind==='RESCUED');assert.deepEqual(changed,original);
    assert.ok(projectPlanetPlayer(a,'seat-1').events.every(e=>e.id.length<=128));
  });
  test(`${count}: clinical publication preserves injury before healing/death without exposing attack order`,()=>{
    for(const terminal of ['RESCUED','ELIMINATED']) {
      const s=fixture(count),injury=event('injury-source','INJURED'),end=event('terminal-source',terminal);
      world(s).events=[end,injury];s.finalized.events=copy(world(s).events);
      const own=projectPlanetPlayer(s,'seat-1').events,publicEvents=projectPlanetPublic(s).events;
      assert.deepEqual(own.map(e=>e.kind),['INJURED',terminal]);assert.deepEqual(publicEvents.map(e=>e.kind),['INJURED',terminal]);
      const original=own.map(e=>e.id);world(s).events.reverse();s.finalized.events.reverse();
      assert.deepEqual(projectPlanetPlayer(s,'seat-1').events.map(e=>e.id),original);
    }
  });
  test(`${count}: only current-round player events are merged and finalized/world duplicates are delivered once`,()=>{
    const s=fixture(count),e=event('shared-storage-id');s.finalized.events=[event('old-round','RESCUED',null,['seat-2'],3),copy(e)];world(s).events=[copy(e)];
    const v=projectPlanetPlayer(s,'seat-1');assert.equal(v.events.length,1);assert.equal(v.events[0].round,4);
    assert.equal(JSON.stringify(v.events).includes('shared-storage-id'),false);
  });
  test(`${count}: speculative office changes are private until Sync and never create a public navigation view`,()=>{
    const s=fixture(count);office(s);world(s).officerSeatId=null;world(s).captainSeatId=null;
    assert.deepEqual(projectPlanetPublic(s).offices,{captainSeatId:'seat-1',officerSeatId:'seat-3',blockedSeatId:null});
    assert.equal(projectPlanetPlayer(s,'seat-1').privateNavigation,null);s.panelOpen=false;
    assert.deepEqual(projectPlanetPublic(s).offices,{captainSeatId:null,officerSeatId:null,blockedSeatId:null});
    assert.equal('privateNavigation'in projectPlanetPublic(s),false);
  });
  test(`${count}: navigation position/direction and genuine tie/confirmation controls are office-private`,()=>{
    const s=fixture(count);office(s);s.navigation.position='R2';s.navigation.direction='Red';phase(s,'NAV_TIE',15_000);s.panelOpen=false;
    assert.equal(projectPlanetPlayer(s,'seat-3').privateNavigation.tieChoice,true);assert.equal(projectPlanetPlayer(s,'seat-1').privateNavigation.tieChoice,false);
    assert.equal(projectPlanetPlayer(s,'seat-2').privateNavigation,null);assert.deepEqual(projectPlanetPublic(s).navigation,{lastMovedRound:3,arrivedAt:null});
    phase(s,'NAV_CAPTAIN_CONFIRM',15_000);assert.equal(projectPlanetPlayer(s,'seat-1').privateNavigation.confirmation,'CAPTAIN');
    assert.equal(projectPlanetPlayer(s,'seat-3').privateNavigation.confirmation,null);phase(s,'NAV_OFFICER_CONFIRM',15_000);
    assert.equal(projectPlanetPlayer(s,'seat-3').privateNavigation.confirmation,'OFFICER');
  });
  test(`${count}: Hacker discovery is global and selected-world activation is private to Hacker`,()=>{
    const s=fixture(count);s.global.codeAttempted=true;s.global.shipHackUnlocked=true;s.global.scanUsedRound=4;s.global.scanBlockedThroughRound=5;
    s.global.scanResults=[{round:4,targetSeatId:'seat-2',guess:'Blue',matched:true,inCode:true}];world(s).shipHackSpent=true;
    for(const id of s.turnOrder){const v=projectPlanetPlayer(s,id),h=id==='seat-6';assert.equal(v.abilities.codeAttempted,h);assert.equal(v.abilities.shipHackUnlocked,h);
      assert.equal(v.abilities.shipHackSpent,h);assert.equal(v.abilities.scanBlockedThroughRound,h?5:null);assert.equal(v.knowledge.scanResults.length,h?1:0);}
    assert.equal(projectPlanetPlayer(s,'seat-6').self.roleActionSpent,true);s.worlds.Beta=copy(world(s));s.worlds.Beta.shipHackSpent=false;s.realityOf['seat-6']='Beta';
    const v=projectPlanetPlayer(s,'seat-6');assert.equal(v.abilities.shipHackUnlocked,true);assert.equal(v.abilities.shipHackSpent,false);
  });
  test(`${count}: Protection grants and lifetime Alien state have only their authorized audience`,()=>{
    const s=fixture(count);seat(s,'seat-2').protection={donorSeatId:'seat-5',activeFromRound:5,consumed:false};seat(s,'seat-2').protectionEver=true;
    seat(s,'seat-7').clone={used:true,active:true,expiresAfterRound:5};s.global.blackholeSpent=true;s.global.blackholeRound=4;
    for(const id of s.turnOrder){const v=projectPlanetPlayer(s,id);assert.equal(v.abilities.protectionGrants.length,id==='seat-5'?1:0);
      assert.equal(v.abilities.blackholeSpent,id==='seat-7');assert.equal(v.abilities.clone?.used??false,id==='seat-7');}
    assert.equal(projectPlanetPlayer(s,'seat-7').self.roleActionSpent,true);
    assert.deepEqual(projectPlanetPlayer(s,'seat-5').abilities.protectionGrants,[{targetSeatId:'seat-2',activeFromRound:5,consumed:false}]);
  });
  test(`${count}: private declaration result stays in the public talk pair`,()=>{
    const s=fixture(count);s.hack={id:'hack-private',actorSeatId:'seat-1',targetSeatId:'seat-2',status:'DECLARED',declaredSide:'Red'};phase(s,'HACK_RESULT',5_000);
    const pub=projectPlanetPublic(s);assert.deepEqual(pub.hackSession,{id:'hack-private',actorSeatId:'seat-1',targetSeatId:'seat-2'});
    assert.equal(JSON.stringify(pub).includes('declaredSide'),false);
    for(const id of s.turnOrder)assert.equal(projectPlanetPlayer(s,id).hackFeedback?.declaredSide??null,['seat-1','seat-2'].includes(id)?'Red':null);
    phase(s,'ORDINARY_TURN',60_000);assert.equal(projectPlanetPublic(s).hackSession,null);assert.equal(projectPlanetPlayer(s,'seat-1').hackFeedback,null);
  });
  test(`${count}: Blackout exposes common fixed timing and only each admitted Disabler's frozen positions`,()=>{
    const s=fixture(count);phase(s,'BLACKOUT',15_000);s.panelOpen=false;
    world(s).actions.push({actorSeatId:'seat-3',commandId:'request-blackout-private',command:{type:'REQUEST_BLACKOUT'},order:2,boundRoom:'Room A',selectedSlotId:null});
    if(count>=8)world(s).actions.push({actorSeatId:'seat-8',commandId:'request-red-private',command:{type:'REQUEST_BLACKOUT'},order:7,boundRoom:'Room B',selectedSlotId:'B2'});
    assert.deepEqual(projectPlanetPublic(s).blackout,{windowId:'phase-BLACKOUT',previewEndsAt:START+5_000,endsAt:START+15_000});
    for(const id of s.turnOrder){const v=projectPlanetPlayer(s,id);assert.equal(v.blackoutTargeting!==null,['seat-3',...(count>=8?['seat-8']:[])].includes(id));}
    assert.deepEqual(projectPlanetPlayer(s,'seat-3').blackoutTargeting.slotIds,['A1','A2','A3','A4','A5']);
    assert.equal(projectPlanetPlayer(s,'seat-3').blackoutTargeting.selectable,false,'The first five seconds remain lit');
    s.evaluatedAt=START+5_000;assert.equal(projectPlanetPlayer(s,'seat-3').blackoutTargeting.selectable,true);
    s.evaluatedAt=START+15_000;assert.equal(projectPlanetPlayer(s,'seat-3').blackoutTargeting.selectable,false);s.evaluatedAt=START+5_000;
    if(count>=8){assert.equal(projectPlanetPlayer(s,'seat-8').blackoutTargeting.selectedSlotId,'B2');assert.equal(projectPlanetPlayer(s,'seat-8').blackoutTargeting.selectable,false);}
    assert.equal(JSON.stringify(projectPlanetPublic(s)).includes('request-blackout-private'),false);
    seat(s,'seat-3').jailed=true;seat(s,'seat-3').location='Jail';seat(s,'seat-3').slotId='J1';assert.equal(projectPlanetPlayer(s,'seat-3').blackoutTargeting,null);
  });
  test(`${count}: Promises and quotas remain pair-private without revealing unrelated accepted records`,()=>{
    const s=fixture(count);s.global.promises=[{id:'promise-pair',giverSeatId:'seat-1',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null,
      round:4,electionId:null,accepted:true,status:'Pending',offerStatus:'accepted'}];s.global.promiseGiven=['seat-1'];s.global.promiseReceived=['seat-2'];
    for(const id of s.turnOrder){const v=projectPlanetPlayer(s,id);assert.equal(v.promises.length,['seat-1','seat-2'].includes(id)?1:0);
      assert.deepEqual(v.promiseQuota,{given:id==='seat-1',received:id==='seat-2'});}
    assert.equal(JSON.stringify(projectPlanetPublic(s)).includes('promise-pair'),false);
  });
  test(`${count}: declined and expired drafts retain explicit pair-private offer status`,()=>{
    const s=fixture(count),draft={id:'declined-draft',giverSeatId:'seat-1',recipientSeatId:'seat-2',kind:'MEET_A',targetSeatId:null,
      round:4,electionId:null,accepted:false,status:'Pending',offerStatus:'declined'};
    s.global.promises=[draft,{...copy(draft),id:'accepted-history',accepted:true,status:'Not fulfilled',offerStatus:'accepted'}];s.global.declinedPromiseIds=['declined-draft'];
    assert.deepEqual(projectPlanetPlayer(s,'seat-1').promises.map(p=>p.offerStatus),['declined','accepted']);
    assert.deepEqual(projectPlanetPlayer(s,'seat-2').promises.map(p=>p.offerStatus),['declined','accepted']);
    assert.deepEqual(projectPlanetPlayer(s,'seat-3').promises,[]);
  });
  test(`${count}: publication stamps follow actual audience visibility through a later Sync`,()=>{
    const s=fixture(count);s.worlds.Beta=copy(world(s));s.realityOf['seat-2']='Beta';
    const e=event('source-first-private','CAPTAIN_RELEASE',null,['seat-4']);e.event.actorSeatId='seat-1';world(s).events=[e];
    const beforeStamp=copy(s);projectPlanetPublic(s);projectPlanetPlayer(s,'seat-1');assert.deepEqual(s,beforeStamp,'Projectors never stamp');
    stampPlanetEventPublications(s);assert.equal(s.eventPublications.public[e.event.id],undefined);
    assert.equal(s.eventPublications['player:seat-2'][e.event.id],undefined);
    const own=projectPlanetPlayer(s,'seat-1').events[0];assert.equal(own.publishedAt,START);assert.equal(own.viewRevision,1);
    s.evaluatedAt=START+40_000;s.revisions.public=8;s.revisions.players['seat-2']=9;s.panelOpen=false;
    s.realityOf['seat-2']='Original';delete s.worlds.Beta;s.finalized.events=copy(world(s).events);stampPlanetEventPublications(s);
    const pub=projectPlanetPublic(s).events[0],newAudience=projectPlanetPlayer(s,'seat-2').events[0];
    assert.deepEqual(projectPlanetPlayer(s,'seat-1').events[0],own,'The original private publication cannot replay at Sync');
    assert.equal(pub.publishedAt,START+40_000);assert.equal(pub.viewRevision,8);assert.equal(pub.expiresAt-pub.publishedAt,30_000);
    assert.deepEqual(pub.audience,{kind:'public'});assert.equal(newAudience.publishedAt,START+40_000);assert.equal(newAudience.viewRevision,9);
    assert.deepEqual(newAudience.audience,{kind:'player',seatId:'seat-2'});assert.equal(pub.id,own.id);assert.equal(newAudience.id,own.id);
    const ledger=copy(s.eventPublications);s.evaluatedAt+=100_000;stampPlanetEventPublications(s);assert.deepEqual(s.eventPublications,ledger);
  });
  test(`${count}: frozen defense occurrences stamp only original room audiences and retain independent wire envelopes`,()=>{
    const s=fixture(count),e=event('room-source','ATTACK_BLOCKED',['seat-1','seat-2']);world(s).events=[e];s.finalized.events=[copy(e)];
    stampPlanetEventPublications(s);assert.equal(s.eventPublications.public[e.event.id],undefined);assert.equal(s.eventPublications['player:seat-3'][e.event.id],undefined);
    const a=projectPlanetPlayer(s,'seat-1').events[0],b=projectPlanetPlayer(s,'seat-2').events[0];
    assert.deepEqual(a.audience,{kind:'player',seatId:'seat-1'});assert.deepEqual(b.audience,{kind:'player',seatId:'seat-2'});
    assert.equal(a.phaseId,'phase-event-source');assert.equal(a.slotId,'A2');assert.equal(a.clinicalAnchor,null);assert.equal(a.id,b.id);
    e.recipients=null;assert.throws(()=>projectPlanetPlayer(s,'seat-3'),/frozen player recipients/);
  });
  test(`${count}: secret clock advancement across event expiry never changes stored public view bytes`,()=>{
    const s=fixture(count),e=event('public-ttl');world(s).events=[copy(e)];s.finalized.events=[e];stampPlanetEventPublications(s);
    const before=projectPlanetPublic(s);s.evaluatedAt=START+31_000;s.global.scanUsedRound=4;
    s.global.scanResults=[{round:4,targetSeatId:'seat-7',guess:'Alien',matched:true,inCode:true}];stampPlanetEventPublications(s);
    assert.deepEqual(projectPlanetPublic(s),before,'Consumers gate expiresAt; secret commits do not remove public metadata');
    assert.equal(projectPlanetPublic(s).events[0].expiresAt,START+30_000);
  });
  test(`${count}: clinical anchors retain roster geometry and reject malformed or overflow clinical claims`,()=>{
    const s=fixture(count),e=event('valid-hv5','INJURED');e.event.clinicalAnchor.anchorId='HV5';world(s).events=[e];
    assert.equal(projectPlanetPlayer(s,'seat-1').events[0].clinicalAnchor.anchorId,'HV5','HV5 is valid metadata, not a fifth physical bed');
    const good=copy(e);e.event.clinicalAnchor=null;assert.throws(()=>projectPlanetPlayer(s,'seat-1'),/clinical anchor/);
    world(s).events=[copy(good)];world(s).events[0].event.clinicalAnchor.slotCount=4;assert.throws(()=>projectPlanetPlayer(s,'seat-1'));
    world(s).events=[copy(good)];world(s).events[0].event.clinicalAnchor.slotCount=count===7?8:7;assert.throws(()=>projectPlanetPlayer(s,'seat-1'),/clinical anchor/);
    world(s).events=[copy(good)];world(s).events[0].event.kind='HOSPITAL_OVERFLOW_REMOVED';assert.throws(()=>projectPlanetPlayer(s,'seat-1'),/clinical anchor/);
    const overflow=event('overflow-no-bed','HOSPITAL_OVERFLOW_REMOVED',null,['seat-2']);overflow.event.location=null;overflow.event.slotId=null;
    world(s).events=[overflow];assert.equal(projectPlanetPlayer(s,'seat-1').events[0].clinicalAnchor,null);
  });
  test(`${count}: Captain availability is current-office-only and ballot echoes carry the active voting phase`,()=>{
    const s=fixture(count);office(s);world(s).releaseUsed=true;
    for(const id of s.turnOrder)assert.deepEqual(projectPlanetPlayer(s,id).abilities.captainCommands,id==='seat-1'?{releaseUsed:true,ejectUsed:false}:null);
    s.worlds.Beta=copy(world(s));s.worlds.Beta.captainSeatId='seat-2';s.worlds.Beta.releaseUsed=false;s.realityOf['seat-2']='Beta';
    assert.deepEqual(projectPlanetPlayer(s,'seat-2').abilities.captainCommands,{releaseUsed:false,ejectUsed:false});
    phase(s,'JAIL_VOTE',60_000);s.panelOpen=false;s.ballot={kind:'JAIL_VOTE',eligibleVoters:[...s.turnOrder],eligibleTargets:[...s.turnOrder],votes:{'seat-1':null,'seat-2':'seat-4'},runoff:false,electionId:'jail-election'};
    assert.deepEqual(projectPlanetPlayer(s,'seat-1').ownBallot,{phaseId:'phase-JAIL_VOTE',targetSeatId:null});
    assert.deepEqual(projectPlanetPlayer(s,'seat-2').ownBallot,{phaseId:'phase-JAIL_VOTE',targetSeatId:'seat-4'});assert.equal(projectPlanetPlayer(s,'seat-3').ownBallot,null);
    s.lastTally={kind:'JAIL_VOTE',phaseId:'phase-JAIL_VOTE',counts:{'seat-4':1},eligibleVoterCount:count,selectedSeatId:null,tiedSeatIds:[],outcome:'NO_JAIL_SELECTION'};
    phase(s,'VOTE_RESULT',5_000);assert.equal(projectPlanetPlayer(s,'seat-1').ownBallot,null);assert.equal(projectPlanetPublic(s).lastTally.phaseId,'phase-JAIL_VOTE');
  });
  test(`${count}: finished reveal retains every original/offboard identity; abort never publishes secret roles`,()=>{
    const s=fixture(count);seat(s,'seat-2').health='Eliminated';seat(s,'seat-2').location=null;seat(s,'seat-2').slotId=null;
    s.finalized.seats.find(s=>s.seatId==='seat-2').health='Eliminated';s.finalized.seats.find(s=>s.seatId==='seat-2').location=null;s.finalized.seats.find(s=>s.seatId==='seat-2').slotId=null;
    phase(s,'FINISHED',null);s.panelOpen=false;s.result={winner:'Red',reason:'ARRIVAL',alienCoWinner:true};s.navigation.arrivedAt='Red';
    const pub=projectPlanetPublic(s);assert.equal(pub.endReveal.roles.length,count);assert.deepEqual(pub.endReveal.code,s.code);
    assert.equal(pub.endReveal.roles.find(r=>r.seatId==='seat-2').role,'Doctor');assert.equal(projectPlanetPlayer(s,'seat-7').board.seats.length,count);
    phase(s,'ABORTED',null);s.result={winner:null,reason:'ABORTED',alienCoWinner:false};assert.equal(projectPlanetPublic(s).endReveal,null);
  });
  test(`${count}: outputs are immutable independent copies and malformed versions fail closed`,()=>{
    const s=fixture(count),before=copy(s),a=projectPlanetPublic(s),p=projectPlanetPlayer(s,'seat-2');assert.deepEqual(s,before);
    a.board.seats[0].health='Eliminated';a.phase.id='mutated';p.board.seats[0].slotId=null;p.versions.assetManifestVersion='mutated';
    assert.deepEqual(s,before);assert.deepEqual(projectPlanetPublic(s).board.seats,before.finalized.seats);
    s.versions.rulesetHash='0'.repeat(64);assert.throws(()=>projectPlanetPublic(s));assert.throws(()=>projectPlanetPlayer(s,'seat-2'));
  });
}
