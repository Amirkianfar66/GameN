import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_BLACKOUT_PINS,PLANET_FOOD_TASK_PINS,PLANET_GAME_PINS} from '@mothership/contracts';
import {PLANET_WINDOW_ENDPOINTS,planetRoundOrderText} from '@mothership/presentation';
import {PANELS_OPENS,PANELS_STEP_KINDS,panelsFrame,panelsHandlers,panelsInput,panelsPart,panelsPlayers,panelsSteps,panelsView,panelsWindows} from '../hosted/planet/panels-input.mjs';
import {shellInput,shellSheet} from '../hosted/planet/shell-input.mjs';
import {PANELS_DEFAULTS,PANELS_SHEET_ID,PANEL_DESTINATIONS,ROUND_STEP_ICONS,nextPanelsInput,panelsSheet,playerLine} from '../../../design/phone-ui/components/panels/panels.mjs';
import {nextPhoneShellInput,PHONE_SHELL_DEFAULTS} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';

// The Panels tab on a player's phone is Designer's panels component (#296; the owner's plan of 16 November 2026,
// release 3, step 1). These cover the game's side: which panel is which view, the sheet, this room's windows, the
// players' public facts, the round's steps in the game's words, the taps, the frozen Food release's own words, and
// that the component's own check (nextPanelsInput) and the shell's (nextPhoneShellInput) accept what is built here.
const seat=(n,location,more={})=>({seatId:`seat-${n}`,location,slotId:null,health:'Healthy',jailed:false,...more});
const seats=[seat(3,'Hospital',{health:'Injured'}),seat(1,'Room A'),seat(2,'Room A'),seat(4,'Room B'),seat(5,'Room B'),seat(6,'Command Room'),
 seat(7,'Jail',{jailed:true,health:'Injured'}),seat(8,null,{health:'Eliminated'}),seat(9,'Room B')];
const identities=[1,2,3,4,5,6,7,8].map(n=>({seatId:`seat-${n}`,characterId:`c${n}`,displayName:`Crew ${n}`}));
const turn={id:'turn-1',kind:'ORDINARY_TURN',startedAt:0,endsAt:60000,nowMs:18000,remainingMs:42000,trusted:true,expired:false};
const versions={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'};
// The private area carries this phone's own role; nothing of it may reach the Panels tab.
const privateArea={role:{roleId:'ALIEN',faction:'ALIEN_FACTION',secret:'private-marker'},offers:[],hackFeedback:null,captainCommands:null,ownBallot:null};
function model(over={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions,playerCount:9,connection:'live',message:null,concealed:false,dark:false,round:3,boardLabel:null,
  phase:turn,activeSeatId:'seat-4',offices:{captainSeatId:'seat-1',officerSeatId:'seat-5',blockedSeatId:null},board:{seats},identities,talk:null,lastTally:null,
  panel:'panels',action:null,canPass:true,canMove:true,moveRooms:[],canVote:false,ownBallot:null,promiseOfferCount:0,privateArea,recovery:null,food:null,...over};
}
/** The component's own normalization of an input: it accepts it. */
const accepted=input=>nextPanelsInput(PANELS_DEFAULTS,input);
const kept=input=>nextPhoneShellInput(PHONE_SHELL_DEFAULTS,input);

test('the three views are the game\'s panels, Panels, Players and Round order, in one sheet: the component\'s frame for each',()=>{
 assert.deepEqual(['panels','players','round-order'].map(panel=>panelsView(model({panel}))),['list','players','round-order']);
 for(const [panel,view]of [['panels','list'],['players','players'],['round-order','round-order']]){
  const frame=panelsFrame(model({panel}));
  assert.deepEqual(frame,{sub:null,...panelsSheet({view}),kind:'panels'},panel);
  assert.equal(frame.id,PANELS_SHEET_ID);assert.ok(kept({viewer:'seat-4',sheet:frame}).sheet,panel);
 }
 // "Panels" has ✕ at the shell's height; Players and Round order Back and ✕, large (the Lead's answer 1).
 assert.deepEqual((({title,back,close,detent})=>({title,back,close,detent}))(panelsFrame(model())),{title:'Panels',back:false,close:true,detent:'auto'});
 assert.deepEqual((({title,back,detent})=>({title,back,detent}))(panelsFrame(model({panel:'players'}))),{title:'Players',back:true,detent:'large'});
 assert.deepEqual((({title,back,detent})=>({title,back,detent}))(panelsFrame(model({panel:'round-order'}))),{title:'Round order',back:true,detent:'large'});
 // The shell's sheet is the component's for the three, and stays the game's for every other panel.
 for(const panel of ['panels','players','round-order'])assert.deepEqual(shellSheet(model({panel})),panelsFrame(model({panel})),panel);
 assert.deepEqual(shellInput(model({panel:'players'}),{view:'room',room:'room-b'}).sheet,panelsFrame(model({panel:'players'})));
 for(const panel of ['board','actions','card','promises','windows','navigation','hospital','settings']){assert.equal(panelsView(model({panel})),null,panel);assert.equal(panelsFrame(model({panel})),null,panel);}
 assert.equal(shellSheet(model({panel:'windows'})).id,'windows');assert.equal(shellSheet(model({panel:'navigation'})).back,true);
 // Not on the shared display, not while concealed; the dark and a closed phase keep the game's own frames.
 assert.equal(panelsFrame(model({surface:'display'})),null);assert.equal(panelsFrame(model({concealed:true})),null);
 assert.equal(shellSheet(model({dark:true})).kind,'dark');assert.equal(shellSheet(model({phase:{...turn,expired:true}})).kind,'expired');
});

test('the Windows row: this room\'s windows as pairs of room names, from the game\'s own endpoints and the public board',()=>{
 const rooms=location=>panelsWindows(model({board:{seats:[seat(4,location)]}})).rooms;
 assert.deepEqual(rooms('Room B'),[['Room A','Room B'],['Room B','Jail']]);
 assert.deepEqual(rooms('Room A'),[['Room A','Room B'],['Room A','Hospital']]);
 assert.deepEqual(rooms('Hospital'),[['Room A','Hospital']]);
 assert.deepEqual(rooms('Jail'),[['Room B','Jail']]);
 // No window here: in the Command Room, off the board, or with no seat; still enabled, opening Windows (answer 3).
 for(const where of ['Command Room',null])assert.deepEqual(panelsWindows(model({board:{seats:[seat(4,where)]}})),{enabled:true,reason:null,rooms:[]},String(where));
 assert.deepEqual(panelsWindows(model({ownSeatId:'seat-9',board:{seats:[seat(4,'Room B')]}})).rooms,[]);
 // Every pair is one of the game's windows, and each names this room.
 for(const pair of rooms('Room A'))assert.ok(Object.values(PLANET_WINDOW_ENDPOINTS).some(p=>p[0]===pair[0]&&p[1]===pair[1])&&pair.includes('Room A'));
 // Every destination opens, as today's buttons did: the model gives no reason outside its own panel (#222).
 const input=panelsInput(model());
 assert.deepEqual([input.windows.enabled,input.navigation,input.hospital],[true,{enabled:true,reason:null},{enabled:true,reason:null}]);
 assert.deepEqual(accepted(input).windows.rooms,[['Room A','Room B'],['Room B','Jail']]);
});

test('Players: every seat\'s public facts, in seat order, and nothing else; the component\'s lines from them',()=>{
 const players=panelsPlayers(model());
 assert.deepEqual(players.map(p=>p.seat),[1,2,3,4,5,6,7,8,9]);
 for(const p of players)assert.deepEqual(Object.keys(p),['seat','name','character','location','health','jailed','captain','officer']);
 assert.deepEqual(players[0],{seat:1,name:'Crew 1',character:'c1',location:'Room A',health:'Healthy',jailed:false,captain:true,officer:false});
 assert.deepEqual(players[4],{seat:5,name:'Crew 5',character:'c5',location:'Room B',health:'Healthy',jailed:false,captain:false,officer:true});
 // A seat the identities do not name is "Player 9", with no portrait; the board's jail and health stay as given.
 assert.deepEqual(players[8],{seat:9,name:'Player 9',character:null,location:'Room B',health:'Healthy',jailed:false,captain:false,officer:false});
 assert.deepEqual(accepted({players}).players.map(playerLine),['Room A','Room A','Hospital · Injured','Room B','Room B','Command Room','In Jail · Injured','Eliminated','Room B']);
 // No offices, no badges.
 assert.ok(panelsPlayers(model({offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null}})).every(p=>!p.captain&&!p.officer));
 assert.ok(panelsPlayers(model({offices:undefined})).every(p=>!p.captain&&!p.officer));
 // "(you)" is the component's, from this phone's seat number.
 assert.equal(panelsInput(model()).viewer,4);assert.equal(panelsInput(model({ownSeatId:null})).viewer,null);
 // Privacy: the private area's role and faction reach no input, for any view.
 for(const panel of ['panels','players','round-order']){
  const text=JSON.stringify(panelsPart(model({panel}),{frame:panelsFrame(model({panel}))}));
  for(const word of ['ALIEN','faction','role','private-marker','offers'])assert.ok(!text.includes(word),`${panel}: ${word}`);
 }
 // A role or faction on a player is the component's to refuse; the game never sends one.
 assert.throws(()=>accepted({players:[{...players[0],role:'ALIEN'}]}),/public facts/);
});

test('Round order: the game\'s steps in the ruleset\'s order and words for each tuple, each with its kind\'s icon and no timing',()=>{
 const food={...PLANET_FOOD_TASK_PINS},legacy={...PLANET_GAME_PINS,assetManifestVersion:'design-0.8.0'};
 for(const v of [versions,food,legacy,null]){
  const steps=panelsSteps(v);
  assert.deepEqual(steps.map(s=>s.title),planetRoundOrderText(v).split(' · '),JSON.stringify(v));
  // Every step the game names has its own kind, and its icon (answer 5); none has a timing, which the game has no words for.
  assert.ok(steps.every(s=>s.kind!=='step'&&Object.hasOwn(ROUND_STEP_ICONS,s.kind)&&s.timing===null));
  assert.deepEqual(accepted({steps}).steps,steps);
 }
 assert.deepEqual(panelsSteps(food).slice(0,3).map(s=>s.kind),['food-supply','pre-turn','turns']);
 assert.deepEqual(panelsSteps(versions).map(s=>s.kind),['turns','private-talk','sync','blackout','hospital','jail-vote','result','resolution','navigation']);
 assert.deepEqual(panelsSteps(legacy).map(s=>s.kind),['turns','private-talk','sync','jail-vote','result','blackout','resolution','navigation']);
 for(const kind of Object.values(PANELS_STEP_KINDS))assert.ok(Object.hasOwn(ROUND_STEP_ICONS,kind),kind);
 // A step the game later names otherwise keeps its words, with the Round order icon (the component's fallback).
 assert.equal(PANELS_STEP_KINDS['A new step'],undefined);
 assert.deepEqual(panelsInput(model({panel:'round-order'})).steps,panelsSteps(versions));
});

test('the part: the component in the Panels tab\'s sheet, keyed once for its three views; the Food release keeps its own Players words',()=>{
 const part=panel=>panelsPart(model({panel}),{frame:panelsFrame(model({panel}))});
 for(const [panel,view]of [['panels','list'],['players','players'],['round-order','round-order']]){
  const p=part(panel);
  assert.deepEqual([p.name,p.key,p.input.view],['panels','panels',view],panel);
  assert.equal(accepted(p.input).view,view);
 }
 // Only with the Panels tab's sheet: another sheet, or none, has no part.
 assert.equal(panelsPart(model(),{frame:null}),null);assert.equal(panelsPart(model(),{frame:{kind:'actions'}}),null);
 assert.equal(panelsPart(model({panel:'windows'}),{frame:shellSheet(model({panel:'windows'}))}),null);
 // The shell's status and the device's Reduce motion reach it; reconnecting keeps the rows (answer 6), concealed refuses them.
 assert.deepEqual((({status,interactive,reducedMotion})=>({status,interactive,reducedMotion}))(panelsPart(model(),{frame:panelsFrame(model()),status:'stale',reducedMotion:true}).input),{status:'stale',interactive:true,reducedMotion:true});
 assert.equal(accepted(panelsPart(model(),{frame:panelsFrame(model()),status:'concealed'}).input).status,'concealed');
 // While players are away on the frozen Food release's Task, Players stays the game's own words (answers 4 and 7);
 // the list and Round order stay the component's.
 const away={step:{kind:'AWAY',awaySeatIds:['seat-2']}},food={...PLANET_FOOD_TASK_PINS};
 assert.equal(panelsPart(model({panel:'players',food:away,versions:food}),{frame:panelsFrame(model({panel:'players'}))}),null);
 assert.equal(panelsPart(model({panel:'panels',food:away,versions:food}),{frame:panelsFrame(model())}).input.view,'list');
 assert.equal(panelsPart(model({panel:'round-order',food:away,versions:food}),{frame:panelsFrame(model({panel:'round-order'}))}).input.steps[0].title,'Food Supply');
 assert.equal(panelsPart(model({panel:'players',food:{step:{kind:'SUPPLY'}},versions:food}),{frame:panelsFrame(model({panel:'players'}))}).input.view,'players');
});

test('the taps: each row opens the game\'s own panel, as today\'s buttons did; nothing else is sent',()=>{
 assert.deepEqual(PANELS_OPENS,PANEL_DESTINATIONS);
 const calls=[];let live=true;
 const h=panelsHandlers({openPanel:panel=>calls.push(['openPanel',panel]),focusReturn:detail=>calls.push(['focusReturn',detail]),live:()=>live});
 for(const destination of [...PANEL_DESTINATIONS,'promises','settings','actions','board',undefined])h.onOpen(destination);
 h.onFocusReturn({target:'sheet-close'});
 live=false;h.onOpen('windows');h.onFocusReturn({target:'sheet-close'});
 assert.deepEqual(calls,[...PANEL_DESTINATIONS.map(d=>['openPanel',d]),['focusReturn',{target:'sheet-close'}]]);
 assert.deepEqual(Object.keys(h).sort(),['onFocusReturn','onOpen']);
 // Without a focus return, the tap is still safe.
 assert.doesNotThrow(()=>panelsHandlers({openPanel:()=>{}}).onFocusReturn({}));
});
