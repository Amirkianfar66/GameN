import assert from 'node:assert/strict';
import test from 'node:test';
import {NO_COMMAND_REASON,createPregameUi,pregameScreen,withheldStatus,busyWith,refusal,menuInput,displayInput,hostSetupInput,lobbyCounts,hostLobbyInput,joinInput,joinRequest,waitInput,
 recoverInput,charactersInput,roleInput,boardingInput,stageClock,roomCodeDraft,CHARACTERS,MOTION_LOCK_REASON,REGISTERED} from '../hosted/planet/pregame-input.mjs';
import {createPlanetPreferences} from '../hosted/planet/preferences.mjs';
import {nextMainMenuInput,MAIN_MENU_DEFAULTS} from '../../../design/phone-ui/components/main-menu/main-menu.mjs';
import {nextDisplaySettingsInput,DISPLAY_SETTINGS_DEFAULTS} from '../../../design/phone-ui/components/display-settings/display-settings.mjs';
import {nextHostLobbyInput,HOST_LOBBY_DEFAULTS} from '../../../design/phone-ui/components/host-room/host-lobby.mjs';
import {nextHostSetupInput,HOST_SETUP_DEFAULTS} from '../../../design/phone-ui/components/host-room/host-setup.mjs';
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
