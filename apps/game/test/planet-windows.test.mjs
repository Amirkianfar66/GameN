import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import {WINDOWS_NONE,WINDOWS_NOT_AVAILABLE,WINDOWS_SHEET_ID,WINDOWS_START,windowsFlow,windowsFrame,windowsHandlers,windowsInput,windowsList,windowsOpen,
 windowsPart} from '../hosted/planet/windows-input.mjs';
import {shellHandlers,shellInput,shellSheet,shellTarget,shellChip} from '../hosted/planet/shell-input.mjs';
import {WINDOWS_DEFAULTS,nextWindowsInput,windowsSheet} from '../../../design/phone-ui/components/windows/windows.mjs';
import {nextPhoneShellInput,PHONE_SHELL_DEFAULTS} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';

// Windows on a player's phone are Designer's windows component (#299; the owner's plan of 16 November 2026, release 3,
// step 3). These cover the game's side: when the sheet is Windows', the input from the model (this room's windows by
// name, the station, this round's drawings with their authors' names, Frontend's words when no window is given, Show
// as offered), this phone's drawing and Show, the shown view once the view has the drawing, and that the component's
// own check (nextWindowsInput) and the shell's (nextPhoneShellInput) accept what is built here.
const seat=(n,location,slotId=null)=>({seatId:`seat-${n}`,location,slotId,health:'Healthy',jailed:false});
const identities=[1,2,3,4,5,6,7,8].map(n=>({seatId:`seat-${n}`,characterId:`c${n}`,displayName:`Crew ${n}`}));
const turn={id:'turn-1',kind:'ORDINARY_TURN',startedAt:0,endsAt:60000,nowMs:1000,remainingMs:59000,trusted:true,expired:false};
const versions={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'};
const stroke=(x,color='#F7D886')=>({color,width:6,points:[[x,0.2],[x+0.1,0.4]]});
const drawing=(id,author,order,more={})=>({id,windowId:'A_HOSPITAL',authorSeatId:`seat-${author}`,round:3,order,drawing:{strokes:[stroke(order/10)]},...more});
const SHOW=Object.freeze({type:'SHOW_WINDOW',targetSeatIds:[],slotIds:[],windowIds:['A_HOSPITAL'],promiseTargetSeatIds:[]});
// Crew 4's phone, at A2 in Room A: the station of Room A ↔ Hospital. Crew 1 has shown one drawing there, and Crew 9
// (no identity) one at Room A ↔ Room B.
function model(over={},area={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions,playerCount:9,connection:'live',message:null,concealed:false,dark:false,round:3,revision:7,boardLabel:null,
  phase:turn,activeSeatId:'seat-4',offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},
  board:{seats:[seat(1,'Room A','A1'),seat(4,'Room A','A2'),seat(5,'Room B','B1'),seat(9,'Room A','A3')]},identities,talk:null,
  lastTally:null,panel:'windows',action:null,canPass:true,canMove:false,moveRooms:[],canVote:false,ownBallot:null,promiseOfferCount:0,recovery:null,food:null,
  privateArea:{windows:[{windowId:'A_B',canDraw:false,drawings:[{...drawing('d-9',9,0),windowId:'A_B'}]},{windowId:'A_HOSPITAL',canDraw:true,drawings:[drawing('d-1',1,0)]}],
   offers:[SHOW],...area},...over};
}
const act=(step,more={})=>({type:'SHOW_WINDOW',label:'Show drawing',step,selected:[],choices:[],prompt:step==='accepted'?'Registered. Waiting for the authoritative view.':step==='sending'?'Registering…':'Review the drawing before Show.',
 confirmation:null,canConfirm:step==='confirm',...more});
const draft=(strokes=[stroke(0.5,'#57BBA8')],windowId='A_HOSPITAL')=>({windowId,ink:'#57BBA8',strokes});
/** The component's own normalization of an input: it accepts it. */
const accepted=input=>nextWindowsInput(WINDOWS_DEFAULTS,input);
const kept=input=>nextPhoneShellInput(PHONE_SHELL_DEFAULTS,input);
const ON={enabled:true,busy:false,reason:null},OFF={enabled:false,busy:false,reason:WINDOWS_NOT_AVAILABLE},BUSY={enabled:true,busy:true,reason:null};

test('Windows are the component\'s one sheet: the panel, or Show drafted or under way; never on the display, concealed, in the dark or once the phase has run out',()=>{
 assert.equal(windowsOpen(model()),true);
 for(const step of ['confirm','sending','accepted'])assert.equal(windowsOpen(model({action:act(step)})),true,step);
 // Another command keeps its own sheet; another panel is not Windows'.
 assert.equal(windowsOpen(model({action:{...act('targets'),type:'VOTE'}})),false);
 for(const panel of ['board','actions','panels','promises','card'])assert.equal(windowsOpen(model({panel})),false,panel);
 for(const over of [{surface:'display',ownSeatId:null},{concealed:true},{dark:true},{phase:{...turn,expired:true}}])assert.equal(windowsOpen(model(over)),false,JSON.stringify(over));
 // The shell's sheet: the component's frame, one id for every view; Back (to Panels), ✕, large; Show in the footer.
 const frame=shellSheet(model());
 assert.deepEqual([frame.id,frame.kind,frame.title,frame.sub,frame.back,frame.close,frame.detent],[WINDOWS_SHEET_ID,'windows','Windows',null,true,true,'large']);
 assert.deepEqual(frame.actions.map(a=>[a.id,a.enabled,a.busy]),[['show',false,false]],'off while the draft is empty, the form\'s own state');
 assert.deepEqual(shellSheet(model(),{windows:{...WINDOWS_START,key:'3:A_HOSPITAL:A2',draft:draft()}}).actions.map(a=>[a.id,a.enabled]),[['show',true]]);
 assert.deepEqual(shellSheet(model({action:act('sending')}),{windows:{...WINDOWS_START,key:'3:A_HOSPITAL:A2',draft:draft()}}).actions.map(a=>[a.id,a.busy]),[['show',true]]);
 assert.equal(shellSheet(model({action:act('confirm')})).id,WINDOWS_SHEET_ID,'Show drafted keeps the sheet');
 assert.ok(kept({viewer:'seat-4',sheet:frame}).sheet);
 // Show never chooses on the scene: no target bar or chip.
 assert.equal(shellTarget(model({action:act('confirm')})),null);assert.equal(shellChip(model({action:act('confirm')})),null);
 // Not Windows': the shell's frame for the dark, a closed phase, and nothing on a display or while concealed.
 assert.equal(shellSheet(model({dark:true})).kind,'dark');assert.equal(shellSheet(model({phase:{...turn,expired:true}})).kind,'expired');
 assert.equal(shellSheet(model({surface:'display',ownSeatId:null})),null);assert.equal(shellSheet(model({concealed:true})),null);
 assert.equal(windowsFrame(model({panel:'board'})),null);
});

test('the input: this room\'s windows by name with this player\'s room first, the station where the model lets them draw, and this round\'s drawings with their authors\' names',()=>{
 const list=windowsList(model());
 assert.deepEqual(list.map(w=>[w.windowId,w.rooms,w.station]),[['A_B',['Room A','Room B'],null],['A_HOSPITAL',['Room A','Hospital'],'A2']]);
 // The drawings as the model gives them, each author by name: the identity's, or "Player n" with a no-break space.
 assert.deepEqual(list[1].drawings,[{id:'d-1',order:0,round:3,author:{seat:1,name:'Crew 1'},drawing:{strokes:[stroke(0)]}}]);
 assert.deepEqual(list[0].drawings[0].author,{seat:9,name:'Player\u00a09'});
 // From Room B, the window's other room comes first: Room B ↔ Room A, and Room B ↔ Jail.
 const fromB=model({board:{seats:[seat(4,'Room B','B2')]}},{windows:[{windowId:'A_B',canDraw:false,drawings:[]},{windowId:'B_JAIL',canDraw:true,drawings:[]}]});
 assert.deepEqual(windowsList(fromB).map(w=>[w.rooms,w.station]),[[['Room B','Room A'],null],[['Room B','Jail'],'B2']]);
 // A window the game doesn't know, or a drawing with no seat, is left out.
 assert.deepEqual(windowsList(model({},{windows:[{windowId:'NOPE',canDraw:false,drawings:[]}]})),[]);
 assert.deepEqual(windowsList(model({},{windows:[{windowId:'A_B',canDraw:false,drawings:[{...drawing('x','x',0),authorSeatId:'host'}]}]}))[0].drawings,[]);
 // The whole input, which the component's own check accepts, with Show as the model offers it.
 const input=windowsInput(model(),{flow:{...WINDOWS_START,key:'3:A_HOSPITAL:A2',draft:draft()}});
 assert.deepEqual([input.view,input.viewer,input.none,input.shown,input.show],['windows',4,null,null,ON]);
 assert.deepEqual(input.draft,draft());assert.ok(accepted(input));
 assert.deepEqual(windowsInput(model({},{offers:[]})).show,OFF,'no offer: "Not available now" (T3)');
 assert.deepEqual(windowsInput(model({},{offers:[{...SHOW,windowIds:['A_B']}]})).show,OFF,'offered at another window');
 assert.deepEqual(windowsInput(model({action:act('sending')})).show,BUSY);
 // No window given: the game's own sentence, as the title, with no line (W1): one for a room with no window and windows closed.
 const none=windowsInput(model({board:{seats:[seat(4,'Command Room','C1')]}},{windows:[]}));
 assert.deepEqual([none.windows,none.none,none.draft],[[],{title:WINDOWS_NONE,line:null},null]);assert.ok(accepted(none));
 assert.equal(WINDOWS_NONE,'No window is visible from your current location.');
 // A draft for another window is not this station's: the box starts blank.
 assert.equal(windowsInput(model(),{flow:{...WINDOWS_START,draft:draft(undefined,'A_B')}}).draft,null);
 // The part, only for the Windows sheet; the frame's footer follows the input.
 const flow={...WINDOWS_START,key:'3:A_HOSPITAL:A2',draft:draft()};
 assert.deepEqual(windowsPart(model(),{frame:shellSheet(model(),{windows:flow}),flow,status:'stale',reducedMotion:true}),{name:'windows',key:'windows',input:windowsInput(model(),{flow,status:'stale',reducedMotion:true})});
 assert.equal(windowsPart(model({panel:'card'}),{frame:shellSheet(model({panel:'card'}))}),null);
 assert.deepEqual(windowsFrame(model(),{flow}).actions,windowsSheet(windowsInput(model(),{flow})).actions);
 assert.deepEqual(shellInput(model(),{view:'room',room:'capsule',windows:flow}).sheet.actions.map(a=>[a.id,a.enabled]),[['show',true]]);
});

test('the drawing being made is this phone\'s own: kept between openings in its round, window and place; gone when concealed, for another viewer, or with a new round',()=>{
 const first=windowsFlow(null,model());
 assert.deepEqual(first,{...WINDOWS_START,viewer:'match-1:seat-4',key:'3:A_HOSPITAL:A2'});
 const drawn={...first,draft:draft()};
 assert.deepEqual(windowsFlow(drawn,model()),drawn,'kept as it is');
 // The sheet closed (the model then withholds the windows), then opened again: the same draft.
 const closed=windowsFlow(drawn,model({panel:'board',privateArea:{}}));
 assert.deepEqual(closed.draft,draft());assert.deepEqual(windowsFlow(closed,model()).draft,draft());
 // Shut while a Show of it is under way, sending or accepted: the draft goes with it, as today's sheet's drawing went
 // on closing (accepted, the drawing is in the list; refused, the status line says so); it can't be shown twice.
 for(const sent of [{windowId:'A_HOSPITAL',mine:[],accepted:false,at:null},{windowId:'A_HOSPITAL',mine:[],accepted:true,at:8}]){
  const shut=windowsFlow({...drawn,sent},model({panel:'board',privateArea:{}}));
  assert.deepEqual([shut.draft,shut.sent,shut.view],[null,null,'windows']);assert.equal(windowsFlow(shut,model()).draft,null);
 }
 // A new round, another place or another window: a blank draft.
 assert.equal(windowsFlow(drawn,model({round:4})).draft,null);
 assert.equal(windowsFlow(drawn,model({board:{seats:[seat(4,'Room A','A1')]}},{windows:[{windowId:'A_B',canDraw:true,drawings:[]}]})).draft,null);
 // Concealed or on a display: nothing kept. Another match or seat starts afresh.
 assert.equal(windowsFlow(drawn,model({concealed:true})),null);assert.equal(windowsFlow(drawn,model({surface:'display',ownSeatId:null})),null);
 assert.equal(windowsFlow(drawn,model({matchId:'match-2'})).draft,null);
 // Away from the station, the draft waits; its input gives none.
 const away=model({board:{seats:[seat(4,'Room A','A3')]}},{windows:[{windowId:'A_B',canDraw:false,drawings:[]},{windowId:'A_HOSPITAL',canDraw:false,drawings:[]}]});
 assert.deepEqual(windowsFlow(drawn,away).draft,draft());assert.equal(windowsInput(away,{flow:drawn}).draft,null);
});

test('Show: the controller\'s own draft of the drawing, then confirm; the shown view once the view has the new drawing; refused, the draft stays',()=>{
 let m=model(),flow=windowsFlow({...WINDOWS_START,draft:draft()},m),calls=[],alive=true;
 // windowsFlow sets the key from the model, which drops a draft made before it: give the draft once the key is set.
 flow={...flow,draft:draft()};
 const handlers=windowsHandlers({model:()=>m,flow:()=>flow,setFlow:next=>{flow=next;},
  showDrawing:(windowId,d)=>{calls.push(['showDrawing',windowId,d]);if(m.privateArea.offers.length)m={...m,action:act('confirm')};},
  confirm:()=>{calls.push(['confirm']);m={...m,action:act('sending')};return Promise.resolve();},live:()=>alive});
 handlers.action('show');
 assert.deepEqual(calls,[['showDrawing','A_HOSPITAL',{strokes:draft().strokes}],['confirm']]);
 assert.deepEqual(flow.sent,{windowId:'A_HOSPITAL',mine:[],accepted:false,at:null});
 // While it sends: Show busy, and a second tap sends nothing.
 flow=windowsFlow(flow,m);assert.deepEqual(windowsInput(m,{flow}).show,BUSY);
 handlers.action('show');assert.equal(calls.length,2);
 // Accepted: busy until the view has the drawing (A5).
 m={...m,action:act('accepted'),revision:8};flow=windowsFlow(flow,m);
 assert.deepEqual([flow.sent.accepted,flow.sent.at],[true,8]);assert.deepEqual(windowsInput(m,{flow}).show,BUSY);
 // The next view has it: the shown view, the drawing just shown this player's own, and the draft used.
 m=model({revision:9},{windows:[{windowId:'A_B',canDraw:false,drawings:[]},{windowId:'A_HOSPITAL',canDraw:true,drawings:[drawing('d-1',1,0),drawing('d-4',4,1)]}]});
 flow=windowsFlow(flow,m);
 assert.deepEqual([flow.view,flow.shown,flow.draft,flow.sent],['shown','d-4',null,null]);
 const shown=windowsInput(m,{flow});assert.deepEqual([shown.view,shown.shown],['shown','d-4']);assert.ok(accepted(shown));
 assert.deepEqual(windowsSheet(shown).actions.map(a=>[a.id,a.local]),[['done',true]]);
 // Done: the view again, with a blank draft.
 handlers.action('done');assert.deepEqual([flow.view,flow.shown,flow.draft],['windows',null,null]);
 // The sheet closing ends the shown view too.
 assert.equal(windowsFlow({...flow,view:'shown',shown:'d-4'},model({panel:'board',privateArea:{}})).view,'windows');
});

test('a Show that does not go through: refused by the controller, refused by the server, or with nothing drawn',()=>{
 // Refused by the server: the action drops with no acceptance and no new drawing; the draft stays for another try,
 // and the game's status line says what happened (the component draws no refusal).
 const m=model(),flow={...windowsFlow(null,m),draft:draft(),sent:{windowId:'A_HOSPITAL',mine:[],accepted:false,at:null}};
 const after=windowsFlow(flow,model({message:'That window is not available.'}));
 assert.deepEqual([after.sent,after.draft,after.view],[null,draft(),'windows']);
 // Accepted, but the next view has no drawing of this player's: no longer busy, the draft kept.
 const waited=windowsFlow({...flow,sent:{...flow.sent,accepted:true,at:8}},model({revision:9}));
 assert.deepEqual([waited.sent,waited.draft],[null,draft()]);
 // A drawing of this player's that was there when Show was sent is not the one just shown.
 const old=model({action:act('sending')},{windows:[{windowId:'A_HOSPITAL',canDraw:true,drawings:[drawing('d-1',1,0),drawing('d-4',4,1)]}]});
 const still=windowsFlow({...flow,sent:{...flow.sent,mine:['d-4']}},old);
 assert.deepEqual([still.view,still.shown,still.sent?.mine],['windows',null,['d-4']]);
 // The shown view needs its drawing, at this station, by this player: otherwise the view.
 assert.equal(windowsFlow({...flow,sent:null,view:'shown',shown:'d-9'},model()).view,'windows','not at this window');
 assert.equal(windowsInput(model(),{flow:{...flow,sent:null,view:'shown',shown:'d-1'}}).view,'windows','another player\'s');
 // The controller refuses the draft (no offer): nothing sent, nothing under way.
 let calls=[],state={...windowsFlow(null,m),draft:draft()};
 const quiet=windowsHandlers({model:()=>model({},{offers:[]}),flow:()=>state,setFlow:next=>{state=next;},showDrawing:(...a)=>calls.push(['showDrawing',...a]),confirm:()=>calls.push(['confirm'])});
 quiet.action('show');assert.deepEqual(calls.map(c=>c[0]),['showDrawing']);assert.equal(state.sent,null);
 // Nothing drawn, no station, the shown view, or after the renderer has gone: Show calls nothing.
 calls=[];let live=true;
 for(const [over,f] of [[{},{...windowsFlow(null,m),draft:null}],[{},{...windowsFlow(null,m),draft:draft([])}],
  [{board:{seats:[seat(4,'Room A','A3')]},privateArea:{windows:[{windowId:'A_HOSPITAL',canDraw:false,drawings:[]}],offers:[SHOW]}},{...windowsFlow(null,m),draft:draft()}],
  [{},{...windowsFlow(null,m),draft:draft(),view:'shown'}]]){
  const h=windowsHandlers({model:()=>model(over),flow:()=>f,setFlow:()=>calls.push(['set']),showDrawing:(...a)=>calls.push(['showDrawing',...a]),confirm:()=>calls.push(['confirm']),live:()=>live});
  h.action('show');
 }
 assert.deepEqual(calls,[]);
 const gone=windowsHandlers({model:()=>m,flow:()=>({...windowsFlow(null,m),draft:draft()}),setFlow:()=>calls.push(['set']),showDrawing:()=>calls.push(['showDrawing']),confirm:()=>calls.push(['confirm']),live:()=>false});
 gone.action('show');gone.action('done');gone.onDraft(draft());assert.deepEqual(calls,[]);
});

test('the component\'s drafts are kept as reported, for the station\'s window only',()=>{
 let m=model(),flow=windowsFlow(null,m);
 const h=windowsHandlers({model:()=>m,flow:()=>flow,setFlow:next=>{flow=next;},showDrawing:()=>{},confirm:()=>{}});
 h.onDraft(draft());assert.deepEqual(flow.draft,draft());
 h.onDraft(draft([stroke(0.1),stroke(0.2)]));assert.equal(flow.draft.strokes.length,2,'the whole draft, replaced');
 h.onDraft(draft([]));assert.deepEqual(flow.draft.strokes,[],'Clear');
 // Another window's, or while a Show is under way or shown: not taken.
 const before=flow;h.onDraft(draft(undefined,'A_B'));assert.equal(flow,before);
 flow={...flow,sent:{windowId:'A_HOSPITAL',mine:[],accepted:false,at:null}};const sending=flow;h.onDraft(draft());assert.equal(flow,sending);
});

test('the shell connection hands the Windows sheet\'s footer to its handlers; its Back returns to Panels, and ✕ closes it',()=>{
 const calls=[];const record=name=>(...args)=>calls.push([name,...args]);
 const handlers=shellHandlers({openPanel:record('openPanel'),begin:record('begin'),confirm:record('confirm'),dismiss:record('dismiss'),toggleView:record('toggleView'),
  showBoard:record('showBoard'),openList:record('openList'),closeList:record('closeList'),windows:{action:record('windows')}});
 handlers.onSheetAction('show',WINDOWS_SHEET_ID);handlers.onSheetAction('done',WINDOWS_SHEET_ID);
 handlers.onSheetBack(WINDOWS_SHEET_ID);handlers.onSheetClose(WINDOWS_SHEET_ID);
 assert.deepEqual(calls,[['windows','show'],['windows','done'],['openPanel','panels'],['dismiss']]);
 // Another sheet's Done is still the shell's.
 calls.length=0;handlers.onSheetAction('done','action-after');assert.deepEqual(calls,[['dismiss']]);
});
