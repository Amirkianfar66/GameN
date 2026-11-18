import assert from 'node:assert/strict';
import test from 'node:test';
import {NO_COMMAND_REASON,roundStampInput,createPregameUi,pregameScreen,withheldStatus,busyWith,refusal,menuInput,displayInput,hostSetupInput,lobbyCounts,hostLobbyInput,joinInput,joinRequest,waitInput,
 recoverInput,settleRecovery,charactersInput,roleInput,boardingInput,stageClock,roomCodeDraft,CHARACTERS,MOTION_LOCK_REASON,REGISTERED} from '../hosted/planet/pregame-input.mjs';
import {createPlanetPreferences} from '../hosted/planet/preferences.mjs';
import {nextMainMenuInput,MAIN_MENU_DEFAULTS} from '../../../design/phone-ui/components/main-menu/main-menu.mjs';
import {nextDisplaySettingsInput,DISPLAY_SETTINGS_DEFAULTS} from '../../../design/phone-ui/components/display-settings/display-settings.mjs';
import {nextHostLobbyInput,HOST_LOBBY_DEFAULTS} from '../../../design/phone-ui/components/host-room/host-lobby.mjs';
import {nextHostSetupInput,HOST_SETUP_DEFAULTS} from '../../../design/phone-ui/components/host-room/host-setup.mjs';
import {nextRoundStampInput,ROUND_STAMP_DEFAULTS} from '../../../design/phone-ui/components/round-stamp/round-stamp.mjs';
import {roundStart} from '../hosted/planet/shell-input.mjs';
import {HOST_COMMANDS,createHostUi,hostControlsOffered,settingsSheetInput,hostControlsInput,hostReceipt,hostRetrySent,hostSettle,keptArt} from '../hosted/planet/pregame-input.mjs';
import {nextHostControlsInput,hostControlsSheet,HOST_CONTROLS_DEFAULTS,CODE_MASK} from '../../../design/phone-ui/components/host-controls/host-controls.mjs';
import {nextJoinFormInput,JOIN_FORM_DEFAULTS} from '../../../design/phone-ui/components/join-room/join-form.mjs';
import {nextJoinWaitInput,JOIN_WAIT_DEFAULTS} from '../../../design/phone-ui/components/join-room/join-wait.mjs';
import {nextRecoverInput,RECOVER_DEFAULTS} from '../../../design/phone-ui/components/recover/recover.mjs';
import {nextCharacterSelectInput,CHARACTER_SELECT_DEFAULTS} from '../../../design/phone-ui/components/character-select/character-select.mjs';
import {nextRoleStageInput,ROLE_STAGE_DEFAULTS} from '../../../design/phone-ui/components/role-stage/role-stage.mjs';
import {nextBoardingStageInput,BOARDING_STAGE_DEFAULTS} from '../../../design/phone-ui/components/boarding-stage/boarding-stage.mjs';

// Before the match, the Planet app draws Designer's pre-game components (the owner's plan of 16 November 2026,
// release 4). These cover the game's side: which screen each session state shows, what each component is given
// (every input passes the component's own checker), whose data reaches it, and what the connection leaves out
// because the game doesn't give it yet (G1–G5, G7, G14).
const member=(n,more={})=>({seatId:`seat-${n}`,displayName:`Crew ${n}`,characterId:`c${n}`,controller:n<=3?'human':'bot',ready:false,...more});
const members=Array.from({length:9},(_,i)=>member(i+1));
function model(over={}){
 return {mode:'synthetic',connection:'live',message:null,matchId:'match-1',roomCode:'K7Q2XM',status:'lobby',versions:{assetManifestVersion:'design-0.8.0'},isHost:false,selfSeatId:'seat-4',playerCount:9,members,
  pendingAdmissions:[],setup:null,setupFlowVersion:3,setupClock:{status:'unsynced'},remainingMs:null,canChoose:false,canReady:false,canReturnToLobby:false,busy:false,uncertain:false,
  ownRole:null,recoveryCode:null,pendingAdmission:null,...over};
}
const entry=over=>model({matchId:null,roomCode:null,status:null,selfSeatId:null,members:[],playerCount:null,versions:null,...over});
const prefs={reduced:false,reducedMotion:false,deviceReduced:false,textScale:1};
const draft=(over={})=>({roomCode:'',displayName:'',kind:'player',...over});
const shown={visible:true};
const ui=(over={})=>Object.assign(createPregameUi(),over);

test('which screen: the menu and its four screens before a match; the app\'s own view when the session is not live or uncertain',()=>{
 assert.equal(pregameScreen(entry(),ui()),'menu');
 for(const [mode,screen]of [['display','display'],['join','join'],['recover','recover'],['menu','menu']])assert.equal(pregameScreen(entry(),ui({mode})),screen,mode);
 // Host setup is drawn without the team mix the game doesn't give yet (G1 (a); host-setup 0.1.1).
 assert.equal(pregameScreen(entry(),ui({mode:'host'})),'host-setup');
 // Today's Reconnect and Retry stay: there is no offline signal to give the menu (G14).
 assert.equal(pregameScreen(entry({connection:'error'}),ui()),null);
 assert.equal(pregameScreen(entry({connection:'connecting'}),ui()),null);
 assert.equal(pregameScreen(entry({uncertain:true}),ui()),null);
 assert.equal(pregameScreen(model({uncertain:true}),ui()),null);
});

test('which screen: the lobby, waiting, the stages; today\'s view for a seatless host device (G15), a display in the lobby and an error',()=>{
 assert.equal(pregameScreen(model({isHost:true,selfSeatId:null}),ui()),'host-lobby');
 assert.equal(pregameScreen(model(),ui()),'join-wait');
 assert.equal(pregameScreen(entry({pendingAdmission:{kind:'player',roomCode:'K7Q2XM',status:null}}),ui()),'join-wait');
 assert.equal(pregameScreen(model({selfSeatId:null}),ui()),null,'an admitted shared display shows the display\'s own screens');
 assert.equal(pregameScreen(model({status:'choosing'}),ui()),'characters');
 assert.equal(pregameScreen(model({status:'reading'}),ui()),'role');
 assert.equal(pregameScreen(model({status:'boarding'}),ui()),'boarding');
 for(const status of ['choosing','reading','boarding'])assert.equal(pregameScreen(model({status,isHost:true,selfSeatId:null}),ui()),null,status);
 assert.equal(pregameScreen(model({status:'boarding',selfSeatId:null}),ui()),'boarding','a display boards with the crew');
 for(const status of ['running','finished','aborted'])assert.equal(pregameScreen(model({status}),ui()),null,status);
 assert.equal(pregameScreen(model({connection:'error',status:null}),ui()),null);
 assert.equal(pregameScreen(model({status:null}),ui()),null,'withheld data: the mounted screen is kept by the manager, never redrawn from nothing');
 // Recover's answer holds the screen until Continue, even once the match runs.
 assert.equal(pregameScreen(model({status:'running',matchId:'match-9',selfSeatId:'seat-2'}),ui({recover:{matchId:'match-9',codeLength:0,pending:null,recovered:{matchId:'match-9'}}})),'recover');
});

test('withheld: hidden is concealed, reconnecting is stale; an authorization error drops the screen (G11)',()=>{
 assert.equal(withheldStatus(model({status:null}),{visible:false}),'concealed');
 assert.equal(withheldStatus(model({status:null,connection:'stale'}),shown),'stale');
 assert.equal(withheldStatus(model({status:null}),shown),'stale','a read not yet back is reconnecting, as last seen');
 assert.equal(withheldStatus(model({status:null,connection:'error'}),shown),null);
 assert.equal(withheldStatus(entry(),shown),null);
});

test('the menu and Display settings: every choice while the session is free, no offline note (G14), the phone\'s own Reduce Motion as the lock (G9)',()=>{
 const menu=menuInput(entry(),ui(),prefs);
 assert.equal(menu.notice,null);
 assert.deepEqual([menu.join,menu.host,menu.recover].map(c=>c.enabled),[true,true,true]);
 assert.equal(menuInput(entry({busy:true}),ui(),prefs).join.enabled,false);
 nextMainMenuInput(MAIN_MENU_DEFAULTS,menu);
 const free=displayInput({...prefs,reducedMotion:true,textScale:1.5});
 assert.deepEqual(free,{reducedMotion:true,motionLock:null,textScale:1.5});
 const locked=displayInput({...prefs,deviceReduced:true});
 assert.deepEqual(locked.motionLock,{reason:MOTION_LOCK_REASON});assert.equal(locked.reducedMotion,false,'the stored choice stays the player\'s own');
 nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS,locked);
});

test('one busy flag becomes one busy control: the command this phone last sent (G10)',()=>{
 const busy=model({isHost:true,selfSeatId:null,busy:true,pendingAdmissions:[{id:'a1',kind:'player',displayName:'Dev'},{id:'a2',kind:'display',displayName:'TV'}],members:members.slice(0,5)});
 const sent=ui({lastOp:'approveAdmission:a2'}),lobby=hostLobbyInput(busy,sent,prefs);
 assert.deepEqual(lobby.requests.map(r=>[r.id,r.admit.enabled,r.admit.busy]),[['a1',false,false],['a2',false,true]]);
 assert.equal(lobby.bots.busy,false);assert.equal(lobby.start.busy,false);
 assert.equal(busyWith(busy,ui({lastOp:'setBots'}),'setBots'),true);
 assert.equal(busyWith(model(),ui({lastOp:'setBots'}),'setBots'),false);
 assert.equal(hostSetupInput(entry({busy:true}),ui({lastOp:'create'}),prefs).open.busy,true);
});

test('the lobby: today\'s bot range and seats to fill, moved unchanged (G2); members by seat; requests by device',()=>{
 const five=members.slice(0,5),host=model({isHost:true,selfSeatId:null,members:five,pendingAdmissions:[{id:'a1',kind:'display',displayName:'TV'}]});
 assert.deepEqual(lobbyCounts(host),{humans:3,bots:2,max:6,missing:4,startReason:'4 more seats to fill'});
 const lobby=hostLobbyInput(host,ui(),prefs);
 assert.deepEqual(lobby.seats,{filled:5,total:9});
 assert.deepEqual(lobby.members.map(m=>[m.seat,m.kind]),[[1,'person'],[2,'person'],[3,'person'],[4,'bot'],[5,'bot']]);
 assert.deepEqual(lobby.requests[0],{id:'a1',name:'TV',device:'display',admit:{enabled:true,busy:false,reason:null}});
 assert.deepEqual(lobby.start,{enabled:false,busy:false,reason:'4 more seats to fill'});
 assert.deepEqual(hostLobbyInput(model({isHost:true,selfSeatId:null}),ui(),prefs).start,{enabled:true,busy:false,reason:null});
 // A host with a seat is the lobby's host row.
 assert.equal(hostLobbyInput(model({isHost:true,selfSeatId:'seat-1'}),ui(),prefs).members[0].kind,'host');
 // G6: no command to leave a lobby, so Leave is drawn unavailable with the connection's words.
 assert.deepEqual(lobby.leave,{enabled:false,busy:false,reason:NO_COMMAND_REASON});assert.equal(NO_COMMAND_REASON,'Not available in this test');
 assert.deepEqual(nextHostLobbyInput(HOST_LOBBY_DEFAULTS,lobby).leave,lobby.leave);
});

test('host setup: today\'s counts and draft; no team mix until the game gives one, so no line under 7/8/9 (G1 (a))',()=>{
 const setup=hostSetupInput(entry(),ui({hostCount:8}),prefs);
 assert.deepEqual(setup.counts.map(c=>c.value),[7,8,9]);assert.equal(setup.count,8);
 assert.ok(setup.counts.every(c=>c.mix===null));
 nextHostSetupInput(HOST_SETUP_DEFAULTS,setup);
 assert.deepEqual(hostSetupInput(entry(),ui(),prefs,{mix:n=>`mix ${n}`}).counts[0],{value:7,mix:'mix 7'});
 assert.equal(hostSetupInput(entry({message:'That operation is not currently allowed.'}),ui({lastOp:'create'}),prefs).error,'That operation is not currently allowed.');
});

test('join: the draft as the contract writes it, the name\'s rule, the session\'s own refusal words (G3)',()=>{
 assert.equal(roomCodeDraft(' k7-q2xm9 '),'K7Q2XM');
 const form=joinInput(entry(),ui(),draft({roomCode:'K7Q2XM',displayName:' Dev '}),prefs);
 assert.deepEqual({code:form.code,count:form.nameCount,max:form.nameMax,error:form.nameError,codeError:form.codeError,device:form.device},{code:'K7Q2XM',count:3,max:12,error:null,codeError:null,device:'player'});
 nextJoinFormInput(JOIN_FORM_DEFAULTS,form);
 // Ask, as sheet 12 draws it: unavailable with an empty or partial form, available once the draft makes a request.
 assert.equal(form.ask.enabled,true);
 for(const partial of [draft(),draft({roomCode:'K7',displayName:'Dev'}),draft({roomCode:'K7Q2XM',displayName:''}),draft({roomCode:'K7Q2XM',displayName:'A'.repeat(13)})])
  assert.equal(joinInput(entry(),ui(),partial,prefs).ask.enabled,false,JSON.stringify(partial));
 assert.deepEqual(joinInput(entry({busy:true}),ui({lastOp:'requestAdmission'}),draft({roomCode:'K7Q2XM',displayName:'Dev'}),prefs).ask,{enabled:false,busy:true,reason:null});
 assert.equal(joinInput(entry(),ui(),draft({displayName:'A'.repeat(13)}),prefs).nameError,'Use 1–12 characters.');
 assert.equal(joinInput(entry(),ui(),draft(),prefs).nameError,null,'no rule before typing');
 assert.equal(joinInput(entry(),ui({join:{tried:true}}),draft(),prefs).nameError,'Use 1–12 characters.','the rule once Ask was tried');
 assert.deepEqual(joinRequest(draft({roomCode:'k7q2xm',displayName:' Dev ',kind:'display'})),{operation:'requestAdmission',roomCode:'K7Q2XM',kind:'display',displayName:'Dev'});
 assert.equal(joinRequest(draft({roomCode:'K7Q2',displayName:'Dev'})),null);
 assert.equal(joinRequest(draft({roomCode:'K7Q2XM',displayName:''})),null);
 const refused=entry({message:'The session was not found.'});
 assert.equal(joinInput(refused,ui({lastOp:'requestAdmission'}),draft(),prefs).error,'The session was not found.');
 assert.equal(joinInput(refused,ui({lastOp:'create'}),draft(),prefs).error,null,'another screen\'s refusal is not Join\'s');
 assert.equal(refusal(entry({message:REGISTERED}),ui({lastOp:'requestAdmission'}),'requestAdmission'),null,'a registered request is not a refusal');
});

test('waiting: the request\'s state, then the seat once admitted; the session\'s error words under the line',()=>{
 const pending=waitInput(entry({pendingAdmission:{kind:'player',roomCode:'K7Q2XM',status:null}}),ui(),draft({displayName:'Dev'}),prefs);
 assert.deepEqual({view:pending.view,code:pending.roomCode,name:pending.name,error:pending.error},{view:'pending',code:'K7Q2XM',name:'Dev',error:null});
 // G6: no command to withdraw a request, leave a lobby or drop a settled request, so all three are unavailable.
 for(const name of ['cancel','leave','back'])assert.deepEqual(nextJoinWaitInput(JOIN_WAIT_DEFAULTS,pending)[name],{enabled:false,busy:false,reason:NO_COMMAND_REASON},name);
 for(const status of ['closed','declined'])assert.equal(waitInput(entry({pendingAdmission:{kind:'player',roomCode:'K7Q2XM',status}}),ui(),draft(),prefs).view,status);
 assert.equal(waitInput(entry({connection:'error',message:'The admission request could not be verified.',pendingAdmission:{kind:'player',roomCode:'K7Q2XM',status:null}}),ui(),draft(),prefs).error,'The admission request could not be verified.');
 const admitted=waitInput(model({members:members.slice(0,5)}),ui(),draft({displayName:'Crew 4'}),prefs);
 assert.deepEqual({view:admitted.view,seat:admitted.seat,seats:admitted.seats},{view:'admitted',seat:4,seats:{filled:5,total:9}});
 nextJoinWaitInput(JOIN_WAIT_DEFAULTS,admitted);
 // After a reload the draft is gone, and so is the name (G12).
 assert.equal(waitInput(model(),ui(),draft(),prefs).name,null);
});

test('recover: Recover seat once both boxes hold something; no code length (G4); the seat from the redeemed match; the code never in an input',()=>{
 const empty=recoverInput(entry(),ui(),prefs);
 assert.equal(empty.recover.enabled,false);assert.equal(empty.codeLength,null);assert.equal(empty.codeError,null);
 const filled=recoverInput(entry(),ui({recover:{matchId:'match-9',codeLength:32,pending:null,recovered:null}}),prefs);
 assert.equal(filled.recover.enabled,true);
 assert.ok(!('recoveryCode' in filled)&&!('code' in filled),'the code is never given back');
 nextRecoverInput(RECOVER_DEFAULTS,filled);
 const back=recoverInput(model({matchId:'match-9',selfSeatId:'seat-6',status:'running'}),ui({recover:{matchId:'match-9',codeLength:0,pending:null,recovered:{matchId:'match-9'}}}),prefs);
 assert.deepEqual({view:back.view,seat:back.seat},{view:'recovered',seat:6});
 nextRecoverInput(RECOVER_DEFAULTS,back);
});

test('an exact Recover retry waits for the verified seat and still opens Continue',()=>{
 const state=ui({mode:'recover',lastOp:'redeemRecovery'});
 state.recover.matchId='match-9';
 state.recover.pending='match-9';
 for(const session of [
  entry({busy:true}),entry({uncertain:true}),entry({uncertain:true,busy:true}),
  entry({matchId:'match-9',connection:'stale'}),
 ]){
  state.recover=settleRecovery(session,state);
  assert.equal(state.recover.pending,'match-9');
  assert.equal(state.recover.recovered,null);
 }

 const verified=model({matchId:'match-9',status:'running',selfSeatId:'seat-6'});
 state.recover=settleRecovery(verified,state);
 assert.equal(state.recover.pending,null);
 assert.equal(pregameScreen(verified,state),'recover');
 assert.equal(recoverInput(verified,state,prefs).seat,6);

 const refused=ui({lastOp:'redeemRecovery'});
 refused.recover.pending='match-9';
 assert.deepEqual(settleRecovery(entry({message:'The session request was refused.'}),refused),{
  ...refused.recover,pending:null,
 });
});

test('character selection: the public grid and clock; this phone\'s choice, saving while sent; never closed or assigned (G5)',()=>{
 const choosing=model({status:'choosing',selfSeatId:'seat-6',members:members.map(m=>m.seatId==='seat-6'?{...m,characterId:null}:m),canChoose:true,remainingMs:21000});
 const input=charactersInput(choosing,ui(),prefs,shown);
 assert.equal(input.characters,CHARACTERS);assert.deepEqual(CHARACTERS.map(c=>c.name).slice(0,3),['Vega','Rigel','Lyra']);
 assert.equal(input.holders.c1,1);assert.equal(input.holders.c6,undefined);
 assert.deepEqual({mine:input.mine,choose:input.choose.enabled,timer:input.timer,closed:input.closed,status:input.status},{mine:null,choose:true,timer:{remainingMs:21000},closed:false,status:'live'});
 nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS,input);
 assert.deepEqual(charactersInput({...choosing,busy:true},ui({lastOp:'chooseCharacter',choosing:'c6'}),prefs,shown).mine,{id:'c6',state:'saving'});
 assert.deepEqual(charactersInput(model({status:'choosing',selfSeatId:'seat-6'}),ui(),prefs,shown).mine,{id:'c6',state:'confirmed'});
 assert.equal(charactersInput(choosing,ui(),prefs,{visible:false}).status,'concealed');
 assert.equal(charactersInput({...choosing,connection:'stale'},ui(),prefs,shown).status,'stale');
});

test('a refused character choice uses the existing toast with the session message (G3)',()=>{
 const choosing=model({status:'choosing',message:'That operation is not currently allowed.'});
 const state=ui({lastOp:'chooseCharacter',operationAttempt:1});
 const refused=charactersInput(choosing,state,prefs,shown);
 assert.deepEqual(nextCharacterSelectInput(CHARACTER_SELECT_DEFAULTS,refused).toast,{
  id:'choose-character-1',text:choosing.message,icon:'info',
 });
 state.operationAttempt++;
 assert.notEqual(charactersInput(choosing,state,prefs,shown).toast.id,refused.toast.id);
 assert.equal(charactersInput({...choosing,busy:true},state,prefs,shown).toast,null);
 assert.equal(charactersInput(choosing,state,prefs,{visible:false}).toast,null);
 assert.equal(charactersInput(choosing,ui({lastOp:'ready'}),prefs,shown).toast,null);
});

test('the role stage: the server\'s interval, the card without knowledge or facts (G7, G16), hidden until shown, the stamp once ready',()=>{
 const setup={id:'s1',startedAt:1000,roleFilmStartsAt:21000,endsAt:31000},clock={status:'synced',serverNowMs:6000,uncertaintyMs:40};
 const role={role:'Hacker',faction:'Red',knowledge:{insiderSeatIds:['seat-1','seat-2','seat-3'],knownUndercoverSeatId:'seat-5'}};
 const reading=model({status:'reading',selfSeatId:'seat-6',setup,setupClock:clock,ownRole:role});
 const input=roleInput(reading,ui(),prefs,shown);
 assert.deepEqual(input.clock,{elapsedMs:5000,filmAtMs:20000,endsAtMs:30000});
 assert.deepEqual(input.card,{role:'Hacker',team:'Red',facts:null,character:'c6',device:'hacker',art:'ok'});
 assert.ok(!JSON.stringify(input).includes('seat-5')&&!JSON.stringify(input).includes('insider'),'no knowledge reaches the stage');
 assert.equal(input.view,'card');assert.equal(input.status,'live');
 nextRoleStageInput(ROLE_STAGE_DEFAULTS,input);
 assert.equal(roleInput({...reading,setupClock:{...clock,serverNowMs:22000}},ui(),prefs,shown).view,'after');
 // The session's reveal flag off: the card's back with Show role.
 assert.equal(roleInput({...reading,ownRole:null},ui(),prefs,shown).status,'concealed');
 // Once ready the session withholds the role: the stamp and the count, not the back.
 const ready=roleInput({...reading,ownRole:null,members:members.map(m=>({...m,ready:true}))},ui(),prefs,shown);
 assert.deepEqual({status:ready.status,mode:ready.ready.mode,card:ready.card,roster:ready.roster},{status:'live',mode:'done',card:null,roster:{ready:9,total:9}});
 assert.equal(roleInput(reading,ui(),prefs,{visible:false}).status,'concealed');
 assert.equal(roleInput({...reading,setupClock:{status:'unsynced'}},ui(),prefs,shown).clock,null);
});

test('a pending Ready keeps the card down and locks repeat input until the session responds',()=>{
 const reading=model({status:'reading',busy:true,selfSeatId:'seat-6'});
 const state=ui({lastOp:'ready'});
 const pending=nextRoleStageInput(ROLE_STAGE_DEFAULTS,roleInput(reading,state,prefs,shown));
 assert.equal(pending.ready.busy,true);
 assert.equal(pending.ready.enabled,false);
 assert.equal(pending.interactive,false);
 assert.equal(pending.card,null);
 assert.equal(pending.roster.ready,0);
 const hidden=nextRoleStageInput(pending,roleInput(reading,state,prefs,{visible:false}));
 assert.equal(hidden.status,'concealed');
 assert.equal(hidden.card,null);
 assert.equal(roleInput({...reading,connection:'stale'},state,prefs,shown).status,'stale');
 assert.equal(roleInput({...reading,busy:false},state,prefs,shown).interactive,true);
});

test('boarding: the server\'s interval, holding while it runs, then waiting; no Skip, as the film is today\'s',()=>{
 const boarding=model({status:'boarding',selfSeatId:'seat-6',setup:{id:'b1',startedAt:1000,endsAt:11000},setupClock:{status:'synced',serverNowMs:4000,uncertaintyMs:40}});
 const input=boardingInput(boarding,prefs,shown);
 assert.deepEqual({clock:input.clock,view:input.view,skip:input.skip},{clock:{elapsedMs:3000,endsAtMs:10000},view:'holding',skip:null});
 nextBoardingStageInput(BOARDING_STAGE_DEFAULTS,input);
 assert.equal(boardingInput({...boarding,setupClock:{status:'synced',serverNowMs:12000,uncertaintyMs:40}},prefs,shown).view,'waiting');
 assert.equal(stageClock({...boarding,setup:null}),null);
});

test('preferences: the stored choice apart from the phone\'s own Reduce Motion, two setters and a subscription (G9)',()=>{
 const store=new Map(),listeners=new Map(),media={matches:true,addEventListener(){},removeEventListener(){}};
 const html={style:{fontSize:''},dataset:{}};
 const document={documentElement:html,defaultView:null,addEventListener:(t,f)=>listeners.set(f,t),removeEventListener:(t,f)=>listeners.delete(f),dispatchEvent:e=>{for(const [f,t]of listeners)if(t===e.type)f(e);}};
 document.defaultView={matchMedia:()=>media,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},CustomEvent:class{constructor(type){this.type=type;}}};
 const preferences=createPlanetPreferences(document);
 assert.deepEqual(preferences.state(),{reducedMotion:false,deviceReduced:true,reduced:true,textScale:1});
 let heard=0;const stop=preferences.subscribe(()=>heard++);
 preferences.setTextScale(2);assert.equal(html.style.fontSize,'200%');assert.equal(preferences.state().textScale,2);
 preferences.setReducedMotion(true);assert.equal(preferences.state().reducedMotion,true);
 assert.deepEqual(JSON.parse(store.get('mothership:planet:presentation-preferences')),{reduced:true,textScale:2});
 preferences.setTextScale(3);preferences.setReducedMotion('yes');assert.equal(heard,2,'only real changes are saved and heard');
 stop();preferences.setTextScale(1);assert.equal(heard,2);
 preferences.dispose();
});

test('the round stamp (part 9): Round 1\'s Before turns over the room, with the shell\'s clock and status; nothing else',()=>{
 const clock=Object.freeze({now:()=>1_000_600});
 const phase={id:'phase-r1-pre',kind:'PRE_TURN',startedAt:1_000_000,endsAt:1_015_000,nowMs:1_000_500,trusted:true,expired:false};
 const moment=roundStart({round:1,phase});
 const input=roundStampInput(moment,{clock,status:'live',reducedMotion:false,room:true});
 assert.deepEqual({...input,clock:null},{round:1,window:{id:'phase-r1-pre',startedAt:1_000_000},clock:null,status:'live',reducedMotion:false});
 assert.equal(input.clock,clock);
 // The stamp's own checker takes it: its keys only, and nothing of a player.
 assert.deepEqual(Object.keys(nextRoundStampInput(ROUND_STAMP_DEFAULTS,input)).sort(),Object.keys(ROUND_STAMP_DEFAULTS).sort());
 // Not mounted: another round or phase, no moment, or the room view not showing.
 assert.equal(roundStampInput(roundStart({round:2,phase}),{clock,status:'live',reducedMotion:false,room:true}),null);
 assert.equal(roundStampInput(roundStart({round:1,phase:{...phase,kind:'TURN'}}),{clock,status:'live',reducedMotion:false,room:true}),null);
 // Under the Food rules the match opens in Food Supply: no stamp then; it lands at Round 1's first Before turns.
 assert.equal(roundStampInput(roundStart({round:1,phase:{...phase,kind:'FOOD_SUPPLY'}}),{clock,status:'live',reducedMotion:false,room:true}),null);
 assert.equal(roundStampInput(moment,{clock,status:'live',reducedMotion:false,room:false}),null);
 // No trusted clock: mounted, with none, so the stamp draws nothing. The shell's status goes as it is.
 for(const status of ['live','stale','concealed'])nextRoundStampInput(ROUND_STAMP_DEFAULTS,roundStampInput(moment,{clock:null,status,reducedMotion:true,room:true}));
 assert.equal(roundStampInput(moment,{clock:undefined,status:'stale',reducedMotion:true,room:true}).clock,null);
});

// ── In the match: Settings and Host controls (part 8) ─────────────────────────────────────────────

const running=(over={})=>model({status:'running',isHost:true,selfSeatId:'seat-1',...over});
const gameView=(over={})=>({surface:'player',ownSeatId:'seat-1',connection:'live',concealed:false,dark:false,panel:'settings',versions:{assetManifestVersion:'design-0.8.0'},...over});
const hostUi=(over={})=>Object.assign(createHostUi(),over);

test('Settings in the match: Display settings\' input, and the Host controls row only for the host while the match runs, outside a blackout',()=>{
 const input=settingsSheetInput(prefs,{host:true});
 assert.deepEqual(input,{...displayInput(prefs),hostControls:{enabled:true,reason:null}});
 assert.equal(nextDisplaySettingsInput(DISPLAY_SETTINGS_DEFAULTS,input).hostControls.enabled,true);
 assert.equal(settingsSheetInput(prefs).hostControls,null);
 assert.equal(hostControlsOffered(running(),gameView()),true);
 assert.equal(hostControlsOffered(running({isHost:false}),gameView()),false,'not the host');
 assert.equal(hostControlsOffered(running({status:'finished'}),gameView()),false,'the match is over: no command to send');
 assert.equal(hostControlsOffered(running(),gameView({dark:true})),false,'today\'s blackout hides them');
 assert.equal(hostControlsOffered(running(),null),false);
});

test('Host controls: the four commands while the session is free, only the one sent busy (G10); the seats are today\'s human members, by seat',()=>{
 const free=hostControlsInput(running(),gameView(),hostUi());
 const checked=nextHostControlsInput(HOST_CONTROLS_DEFAULTS,free);
 assert.equal(checked.status,'live');assert.equal(checked.viewer,'seat-1');
 for(const name of ['deadline','bots','abort'])assert.deepEqual(free[name],{enabled:true,busy:false,reason:null},name);
 assert.deepEqual(free.seats.map(s=>[s.seat,s.name,s.character,s.enabled]),[[1,'Crew 1','c1',true],[2,'Crew 2','c2',true],[3,'Crew 3','c3',true]],'humans only; bots have no code');
 assert.equal(free.code,null);
 const bots=hostControlsInput(running({busy:true}),gameView(),hostUi({lastOp:'runBots'}));
 assert.deepEqual(bots.bots,{enabled:false,busy:true,reason:null});
 assert.deepEqual(bots.deadline,{enabled:false,busy:false,reason:null},'the session sends one at a time');
 const issuing=hostControlsInput(running({busy:true}),gameView(),hostUi({lastOp:'issueRecovery',asked:{seat:2}}));
 assert.deepEqual(issuing.seats.map(s=>s.busy),[false,true,false],'only the seat asked for');
 // The session's uncertain request refuses them all with its own words; reconnecting and hidden are the shell's.
 const unsure=hostControlsInput(running({uncertain:true,message:'Session request outcome unknown. Retry the original request.'}),gameView(),hostUi());
 assert.equal(unsure.abort.reason,'Session request outcome unknown. Retry the original request.');assert.equal(unsure.abort.enabled,false);
 // Retry (host-controls 0.1.1; the Lead's answer of 17 November): only while the session's own request waits, busy while it is sent again.
 assert.deepEqual(unsure.retry,{enabled:true,busy:false});
 assert.equal(free.retry,null);
 assert.deepEqual(hostControlsInput(running({uncertain:true,busy:true,message:'x'}),gameView(),hostUi()).retry,{enabled:false,busy:true});
 assert.equal(hostControlsInput(running({connection:'stale'}),gameView(),hostUi()).status,'stale');
 assert.equal(hostControlsInput(running(),gameView({connection:'stale'}),hostUi()).status,'stale');
 assert.equal(hostControlsInput(running(),gameView({concealed:true}),hostUi()).status,'concealed');
 assert.equal(hostControlsInput(running(),gameView({surface:'display'}),hostUi()).viewer,null);
 assert.deepEqual(HOST_COMMANDS,['advance','runBots','issueRecovery','abort']);
});

test('Host controls: the issued code is the session\'s, for the seat this phone asked (G4), with no minutes; its value only while revealed, never hidden or concealed',()=>{
 const session=running({recoveryCode:'SYNTHETIC-RECOVERY-CODE'});
 const hidden=hostControlsInput(session,gameView(),hostUi({view:'code',asked:{seat:2}}));
 assert.deepEqual(hidden.code,{seat:2,name:'Crew 2',matchId:'match-1',revealed:false,value:null,minutes:null});
 assert.equal(nextHostControlsInput(HOST_CONTROLS_DEFAULTS,hidden).code.value,null);
 assert.deepEqual(hostControlsSheet(hidden).actions.map(a=>a.id),['reveal','copy']);
 const shownCode=hostControlsInput(session,gameView(),hostUi({view:'code',asked:{seat:2},revealed:true}));
 assert.equal(shownCode.code.value,'SYNTHETIC-RECOVERY-CODE');
 assert.deepEqual(hostControlsSheet(shownCode).actions.map(a=>a.id),['hide','copy']);
 assert.equal(hostControlsInput(session,gameView({concealed:true}),hostUi({view:'code',asked:{seat:2},revealed:true})).code,null,'concealed: no code');
 assert.equal(hostControlsInput(session,gameView(),hostUi({view:'list',asked:{seat:2},revealed:true})).code,null,'only in its card');
 assert.equal(hostControlsInput(running(),gameView(),hostUi({view:'code',asked:{seat:2}})).code,null,'no code held');
 assert.equal(hostControlsInput(session,gameView(),hostUi({view:'code',asked:null})).code,null,'not one this phone asked for');
 assert.equal(JSON.stringify(hidden).includes('SYNTHETIC'),false,'hidden, the input never holds it');
 assert.equal(CODE_MASK.includes('S'),false);
});

test('Host controls\' receipts: the session\'s own words for what this sheet sent, once it settles; none for an issued code',()=>{
 assert.deepEqual(hostReceipt(running({message:REGISTERED}),hostUi({lastOp:'advance'})),{text:REGISTERED,icon:'check'});
 assert.deepEqual(hostReceipt(running({message:null}),hostUi({lastOp:'advance'})),{text:REGISTERED,icon:'check'},'its next read clears the word');
 assert.deepEqual(hostReceipt(running({uncertain:true,message:'Session request outcome unknown. Retry the original request.'}),hostUi({lastOp:'abort'})),{text:'Session request outcome unknown. Retry the original request.',icon:'info'});
 assert.deepEqual(hostReceipt(running({message:'That operation is not currently allowed.'}),hostUi({lastOp:'runBots'})),{text:'That operation is not currently allowed.',icon:'info'});
 assert.equal(hostReceipt(running({message:REGISTERED}),hostUi({lastOp:'issueRecovery'})),null,'its card is the receipt');
 assert.deepEqual(hostReceipt(running({message:'The session request was refused.'}),hostUi({lastOp:'issueRecovery'})),{text:'The session request was refused.',icon:'info'});
 assert.equal(hostReceipt(running({busy:true,message:REGISTERED}),hostUi({lastOp:'abort'})),null,'still in flight');
 assert.equal(hostReceipt(running({message:REGISTERED}),hostUi({lastOp:'create'})),null,'not this sheet\'s');
});

test('Host controls\' requests settle once: the card for the seat asked, kept while unknown, and Retry only for this sheet\'s own',()=>{
 const UNKNOWN='Session request outcome unknown. Retry the original request.';
 // Asked for seat 2's code: sent, taken up, then the answer is lost. The sheet keeps the request and says so.
 let ui=hostUi({open:true,lastOp:'issueRecovery',asked:{seat:2}}),step=hostSettle(running({busy:true}),ui,'asked');
 assert.equal(step.sent,'taken');assert.equal(step.receipt,null);
 step=hostSettle(running({uncertain:true,message:UNKNOWN}),step.ui,step.sent);
 assert.equal(step.sent,null);assert.equal(step.ui.lastOp,'issueRecovery','kept while the outcome is unknown');assert.equal(step.ui.view,'list');
 assert.deepEqual(step.receipt,{text:UNKNOWN,icon:'info'});
 // Retry sends the same request again: it is this sheet's, so it settles as it would have, with seat 2's card.
 ui=step.ui;let sent=hostRetrySent(ui);assert.equal(sent,'asked');
 step=hostSettle(running({uncertain:true,busy:true,message:UNKNOWN}),ui,sent);assert.equal(step.sent,'taken');
 step=hostSettle(running({recoveryCode:'SYNTHETIC-RECOVERY-CODE',message:REGISTERED}),step.ui,step.sent);
 assert.equal(step.ui.view,'code');assert.equal(step.ui.revealed,false);assert.deepEqual(step.ui.asked,{seat:2});assert.equal(step.ui.lastOp,null,'settled');
 assert.equal(step.receipt,null,'its card is the receipt');
 assert.equal(hostControlsInput(running({recoveryCode:'SYNTHETIC-RECOVERY-CODE'}),gameView(),step.ui).code.seat,2);
 // A settled command: its receipt, and the sheet no longer holds it.
 step=hostSettle(running({message:REGISTERED}),hostUi({lastOp:'advance'}),'taken');
 assert.deepEqual(step.receipt,{text:REGISTERED,icon:'check'});assert.equal(step.ui.lastOp,null);
 assert.equal(hostRetrySent(step.ui),null,'nothing of this sheet\'s to retry');
 // A request restored after a reload isn't this sheet's: Retry settles it with no receipt and no card (the Lead's (a)).
 ui=hostUi({open:true});sent=hostRetrySent(ui);assert.equal(sent,null);
 step=hostSettle(running({busy:true,uncertain:true,message:UNKNOWN}),ui,sent);step=hostSettle(running({recoveryCode:'SYNTHETIC-RECOVERY-CODE',message:REGISTERED}),step.ui,step.sent);
 assert.equal(step.ui.view,'list');assert.equal(step.receipt,null);
 assert.equal(hostControlsInput(running({recoveryCode:'SYNTHETIC-RECOVERY-CODE'}),gameView(),step.ui).code,null);
 // One the session never took up (it sends nothing while busy or uncertain) stays unsettled, with no receipt.
 step=hostSettle(running(),hostUi({lastOp:'runBots'}),'asked');assert.equal(step.sent,'asked');assert.equal(step.receipt,null);
});

test('the match\'s art stays while the same match\'s data is withheld; another match, or none, sets it as before',()=>{
 const pins={assetManifestVersion:'design-0.8.0'},other={assetManifestVersion:'design-0.9.0'};
 // Live: the session's versions, remembered for its match.
 let step=keptArt({matchId:'m1',versions:pins},null);
 assert.deepEqual(step,{versions:pins,seen:{matchId:'m1',versions:pins}});
 // Reconnecting, or back before the first fresh read: the same match, no versions: the last ones seen stay.
 step=keptArt({matchId:'m1',versions:null},step.seen);
 assert.equal(step.versions,pins);assert.deepEqual(step.seen,{matchId:'m1',versions:pins});
 // Another match, with no versions yet: none, and nothing remembered.
 assert.deepEqual(keptArt({matchId:'m2',versions:null},step.seen),{versions:null,seen:null});
 // No match (the menu, before a match): none.
 assert.deepEqual(keptArt({matchId:null,versions:null},step.seen),{versions:null,seen:null});
 // A match's own versions always win, and are what is remembered.
 assert.deepEqual(keptArt({matchId:'m1',versions:other},step.seen),{versions:other,seen:{matchId:'m1',versions:other}});
 assert.deepEqual(keptArt(null,null),{versions:null,seen:null});
});
