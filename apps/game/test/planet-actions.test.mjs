import assert from 'node:assert/strict';
import test from 'node:test';
import {ACTIONS_FLOWS,EVERY_ROLE_TILES,ROLE_TILES,actionsCancel,actionsChip,actionsFlow,actionsFrame,actionsHandlers,actionsListGroups,actionsPart,actionsStatus,actionsTarget,actionsTiles,actionsToast,
 confirmationFacts,holdActionsPick,ownLocation,slotLocation} from '../hosted/planet/actions-input.mjs';
import {shellHandlers,shellInput} from '../hosted/planet/shell-input.mjs';
import {roomSceneTargets} from '../hosted/planet/room-scene-input.mjs';
import {ACTION_LOOKS,checkActionCheck,checkActions,checkAfterRegister,checkOutcomeUnknown,checkPassNote,checkTargetList} from '../../../design/phone-ui/components/actions/actions.mjs';
import {nextPhoneShellInput,PHONE_SHELL_DEFAULTS} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';

// Actions on a player's phone is Designer's Actions component (the owner's plan of 16 November 2026, release 3).
// These cover the game's side: what each step gives the component's parts and the shell, whose data reaches them,
// this phone's own pick (which the model does not carry at the check), the taps' calls and Cancel. The component's
// own checkers (checkActions … checkPassNote) and the shell's (nextPhoneShellInput) accept every input built here.
const seat=(n,location,slotId,more={})=>({seatId:`seat-${n}`,location,slotId,health:'Healthy',jailed:false,...more});
const seats=[seat(1,'Room A','A1'),seat(2,'Room A','A2'),seat(3,'Hospital','H1',{health:'Injured'}),seat(4,'Room B','B1'),seat(5,'Room B','B2'),seat(6,'Room B','B3'),
 seat(7,'Command Room','C1'),seat(8,'Jail','J1',{jailed:true}),seat(9,null,null,{health:'Eliminated'})];
const identities=seats.map((s,i)=>({seatId:s.seatId,characterId:`c${i+1}`,displayName:`Crew ${i+1}`}));
const turn={id:'turn-1',kind:'ORDINARY_TURN',startedAt:0,endsAt:60000,nowMs:18000,remainingMs:42000,trusted:true,expired:false};
const offer=(type,targets=[],slots=[])=>({type,targetSeatIds:targets,slotIds:slots,windowIds:[],promiseTargetSeatIds:[]});
function model(over={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions:{assetManifestVersion:'design-0.8.0'},playerCount:9,connection:'live',message:null,concealed:false,dark:false,round:3,boardLabel:null,
  phase:turn,activeSeatId:'seat-4',offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},board:{seats},identities,talk:null,lastTally:null,
  panel:'board',action:null,canPass:true,canMove:true,moveRooms:[],canVote:false,ownBallot:null,promiseOfferCount:0,privateArea:null,recovery:null,food:null,...over};
}
const action=(type,step,values=[],more={})=>({type,label:type,step,choices:values.map(value=>({value,label:value})),selected:[],prompt:'Choose an offered character on the board.',confirmation:null,canConfirm:false,...more});
const actionsPanel=(offers,more={})=>model({panel:'actions',privateArea:{offers,hackFeedback:null,captainCommands:null,ownBallot:null},...more});
/** The flow this phone holds after the taps given, step by step through the models given. */
const through=(...steps)=>steps.reduce((flow,step)=>step.pick?holdActionsPick(flow,step.model,step.pick):actionsFlow(flow,step.model),null);
const common={viewer:'seat-4',status:'live',interactive:true,reducedMotion:false,versions:{assetManifestVersion:'design-0.8.0'}};
/** The shell's own normalization of an input: it accepts it. */
const kept=input=>nextPhoneShellInput(PHONE_SHELL_DEFAULTS,input);

test('the tiles (sheet 28): the role\'s own tile while offered, then Move, Private talk and Shoot, usable only as offered (T3)',()=>{
 assert.deepEqual(ROLE_TILES.concat(EVERY_ROLE_TILES).filter(type=>!Object.hasOwn(ACTION_LOOKS,type)),[]);
 // The Doctor's phone, the server offering Rescue and Move: Private talk and Shoot unavailable, with no reason (B1).
 const tiles=actionsTiles(actionsPanel([offer('PASS_TURN'),offer('RESCUE',['seat-3']),offer('MOVE',[],['B4'])]));
 assert.deepEqual(tiles.map(t=>`${t.type}:${t.state}`),['RESCUE:available','MOVE:available','REQUEST_HACK:unavailable','REGISTER_SHOT:unavailable']);
 assert.ok(tiles.every(t=>t.note===null&&t.reason===null&&t.badge===null));
 // The role is not under Actions (A7): a role's own tile the server does not offer is not shown.
 assert.deepEqual(actionsTiles(actionsPanel([])).map(t=>t.type),EVERY_ROLE_TILES);
 // The Hacker's order: Scan, Final Code, Hack Ship; the Alien's: Clone, Blackhole.
 assert.deepEqual(actionsTiles(actionsPanel([offer('ACTIVATE_SHIP_HACK'),offer('SUBMIT_CODE',['seat-1']),offer('SCAN',['seat-1'])])).slice(0,3).map(t=>t.type),['SCAN','SUBMIT_CODE','ACTIVATE_SHIP_HACK']);
 assert.deepEqual(actionsTiles(actionsPanel([offer('ACTIVATE_BLACKHOLE'),offer('ACTIVATE_CLONE')])).slice(0,2).map(t=>t.type),['ACTIVATE_CLONE','ACTIVATE_BLACKHOLE']);
 // The action under way: selected, sending, then registered while the controller holds it accepted (A5), even once no longer offered.
 const state=(step,offers=[offer('ACTIVATE_BLACKHOLE')])=>actionsTiles(actionsPanel(offers,{action:action('ACTIVATE_BLACKHOLE',step)}))[0].state;
 assert.deepEqual([state('confirm'),state('sending',[]),state('accepted',[])],['selected','sending','registered']);
 // The component's own check accepts the input, with the turn and the round.
 const part=actionsPart(actionsPanel([offer('RESCUE',['seat-3'])]),{frame:actionsFrame(actionsPanel([offer('RESCUE',['seat-3'])]))});
 assert.equal(part.name,'tiles');assert.deepEqual(checkActions(part.input).tiles.map(t=>t.type),['RESCUE',...EVERY_ROLE_TILES]);
 assert.equal(part.input.turn,'own');assert.equal(part.input.round,3);
 assert.equal(actionsPart(actionsPanel([],{activeSeatId:'seat-5'}),{frame:actionsFrame(actionsPanel([]))}).input.turn,'other');
 assert.equal(actionsPart(actionsPanel([],{dark:true}),{frame:{kind:'actions'}}).input.turn,'other');
});

test('the sheets: the tiles, the List, the check, After Register, Pass and "Outcome unknown", each from the component\'s helpers',()=>{
 // The tiles: "Actions" and the viewer's room on the public board (the role is not under Actions, A7).
 const tiles=actionsFrame(actionsPanel([]));
 assert.deepEqual(tiles,{id:'actions',title:'Actions',sub:'Room B',back:false,close:true,detent:'auto',actions:[],kind:'actions'});
 assert.equal(actionsFrame(actionsPanel([],{ownSeatId:'seat-9'})).sub,null);
 // The dark, a closed phase and the other panels are not Actions' (the game's own frames).
 assert.equal(actionsFrame(actionsPanel([],{dark:true})),undefined);
 assert.equal(actionsFrame(actionsPanel([],{phase:{...turn,expired:true}})),undefined);
 for(const panel of ['board','card','panels','settings'])assert.equal(actionsFrame(model({panel})),undefined,panel);
 // Choosing a person: no sheet (the target bar), or the List on the board.
 const rescue=action('RESCUE','targets',['seat-1','seat-3']);
 assert.equal(actionsFrame(model({action:rescue})),null);
 assert.deepEqual((({id,title,sub,back,close,kind})=>({id,title,sub,back,close,kind}))(actionsFrame(model({action:rescue}),{listOpen:true})),
  {id:'action-list',title:'Choose from a list',sub:'Rescue · everyone you can reach',back:true,close:false,kind:'action-list'});
 assert.equal(actionsFrame(model({action:action('MOVE','slots',['B4'])}),{listOpen:true}),null);
 // The check: Cancel (this phone's own) and Register, usable as the controller can confirm; busy while it sends.
 const check=actionsFrame(model({action:action('RESCUE','confirm',[],{canConfirm:true})}));
 assert.deepEqual([check.id,check.title,check.close,check.kind,check.actions.map(a=>[a.id,a.label,a.local===true,a.enabled!==false,!!a.busy])],
  ['action-check','Check and register',false,'action-check',[['cancel','Cancel',true,true,false],['register','Register Rescue',false,true,false]]]);
 assert.equal(actionsFrame(model({action:action('RESCUE','confirm',[],{canConfirm:false})})).actions[1].enabled,false);
 assert.deepEqual(actionsFrame(model({action:action('RESCUE','sending')})).actions[1],{id:'register',label:'Registering…',kind:'primary',busy:true,enabled:true});
 // After Register: the action's title and Done; a move none (its toast, Q2); Hack Ship and Blackhole none (L7).
 const after=actionsFrame(model({action:action('RESCUE','accepted')}));
 assert.deepEqual([after.id,after.title,after.actions.map(a=>[a.id,a.local])],['action-after','Rescue',[['done',true]]]);
 assert.equal(actionsFrame(model({action:action('MOVE','accepted')})),null);
 assert.equal(actionsFrame(model({action:action('ACTIVATE_BLACKHOLE','accepted')})),null);
 assert.equal(actionsFrame(model({panel:'actions',action:action('ACTIVATE_SHIP_HACK','accepted')})).id,'actions');
 // Pass (27.3), usable as offered, its Cancel off while Pass sends; nothing once accepted.
 assert.deepEqual(actionsFrame(model({action:action('PASS_TURN','confirm',[],{canConfirm:true})})).actions.map(a=>[a.id,a.enabled!==false]),[['cancel',true],['pass',true]]);
 assert.equal(actionsFrame(model({action:action('PASS_TURN','confirm',[],{canConfirm:false})})).actions[1].enabled,false);
 assert.deepEqual(actionsFrame(model({action:action('PASS_TURN','sending')})).actions.map(a=>[a.id,a.enabled!==false,!!a.busy]),[['cancel',false,false],['pass',true,true]]);
 assert.equal(actionsFrame(model({action:action('PASS_TURN','accepted')})),null);
 // "Outcome unknown" for any command (A4), its two buttons usable as the model says, Check receipt busy while it asks.
 const unknown=actionsFrame(model({recovery:{status:'unknown',canCheck:true,canRetry:false}}));
 assert.deepEqual([unknown.id,unknown.title,unknown.close,unknown.actions.map(a=>[a.id,a.label,a.enabled])],['action-unknown','Outcome unknown',false,[['retry','Retry the same',false],['check','Check receipt',true]]]);
 assert.deepEqual(actionsFrame(model({recovery:{status:'checking',canCheck:false,canRetry:false}})).actions.map(a=>[a.id,a.busy]),[['retry',false],['check',true]]);
 // The other commands' steps stay the game's.
 for(const type of ['VOTE','SCAN','SUBMIT_CODE','PANEL_CODE','BLOCK_MOVE','APPOINT_OFFICER','DECLARE_HACK_SIDE','OFFER_PROMISE','SHOW_WINDOW','CAPTAIN_RELEASE'])
  assert.equal(actionsFrame(model({action:action(type,'confirm',[],{canConfirm:true})})),undefined,type);
 // Every frame is the shell's to take.
 for(const sheet of [tiles,check,after,unknown,actionsFrame(model({action:rescue}),{listOpen:true}),actionsFrame(model({action:action('PASS_TURN','confirm')}))])assert.ok(kept({viewer:'seat-4',sheet}).sheet,sheet.id);
});

test('the target bar and the chip: a person, Supply\'s second, a move\'s position, the Disabler\'s position',()=>{
 const rescue=action('RESCUE','targets',['seat-1','seat-3','seat-5']);
 assert.deepEqual(actionsTarget(model({action:rescue})),{icon:'rescue',title:'Rescue',sub:'Choose a player'});
 assert.deepEqual(actionsTarget(model({action:rescue}),{view:'board'}),{icon:'rescue',title:'Rescue',sub:'Choose a player · every room'});
 assert.equal(actionsTarget(model({action:action('SUPPLY','targets',['seat-1','seat-5'],{selected:['seat-1']})})).sub,'Choose the second player');
 // At the check the bar gives way to the sheet.
 assert.equal(actionsTarget(model({action:action('RESCUE','confirm')})),null);
 // A move: in the viewer's room (Room B), whether the offer has a position here and in another room (the model's moveRooms).
 const move=over=>model({action:action('MOVE','slots',['B4'],{selected:['Room B']}),...over});
 assert.deepEqual(actionsTarget(move({moveRooms:['Room B','Command Room']})),{icon:'move',title:'Move within Room B',sub:'Choose an empty position · or another room on the Board'});
 assert.deepEqual(actionsTarget(move({moveRooms:['Room B']})),{icon:'move',title:'Move within Room B',sub:'Choose an empty position'});
 assert.deepEqual(actionsTarget(model({moveRooms:['Room A'],action:action('MOVE','targets',['Room A'])})),{icon:'move',title:'Move',sub:'No empty position in Room B · choose one on the Board'});
 assert.deepEqual(actionsTarget(move({moveRooms:['Room B']}),{view:'board'}),{icon:'move',title:'Move',sub:'Choose an empty position · uses this round’s move'});
 // Off the board there is no room of the viewer's to name: the board's words.
 assert.equal(actionsTarget(move({ownSeatId:'seat-9',moveRooms:['Room B']})).sub,'Choose an empty position · uses this round’s move');
 assert.equal(actionsTarget(model({action:action('MOVE','confirm')})),null);
 // The Disabler's position (sheet 30): choosing and while it sends, then fixed once the server has it.
 const targeting={windowId:'w',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3']};
 const dark=over=>model({dark:true,panel:'actions',privateArea:{blackoutTargeting:targeting,offers:[]},...over});
 for(const step of ['slots','sending','accepted'])assert.deepEqual(actionsTarget(dark({action:action('SELECT_BLACKOUT_SLOT',step,['A1'])})),{icon:'position',title:'Choose a position',sub:'Room A · any position, even empty'},step);
 assert.deepEqual(actionsTarget(dark({privateArea:{blackoutTargeting:{...targeting,selectable:false,selectedSlotId:'A3'}}})),{icon:'position',title:'Position A3 fixed',sub:'Resolves after the window · no effect shown now'});
 assert.equal(actionsTarget(dark({})),undefined);
 // The other commands keep the shell connection's bar.
 for(const type of ['BLOCK_MOVE','APPOINT_OFFICER','SCAN'])assert.equal(actionsTarget(model({action:action(type,'targets',['seat-1'])})),undefined,type);
 // The chip: people elsewhere on the public board from the room shown; the List on the board; a move's Board.
 assert.deepEqual(actionsChip(model({action:rescue}),{view:'room',room:'room-b'}),{id:'other-rooms',label:'Other rooms · 2',icon:'board',tone:'paper'});
 assert.equal(actionsChip(model({action:action('RESCUE','targets',['seat-5','seat-6'])}),{view:'room',room:'room-b'}),null);
 assert.deepEqual(actionsChip(model({action:rescue}),{view:'board'}),{id:'list',label:'List',icon:'players',tone:'paper'});
 assert.deepEqual(actionsChip(move({moveRooms:['Room B','Room A']}),{view:'room',room:'room-b'}),{id:'move-board',label:'Other rooms on the Board',icon:'board',tone:'paper'});
 assert.equal(actionsChip(move({moveRooms:['Room B']}),{view:'room',room:'room-b'}),null);
 assert.equal(actionsChip(move({moveRooms:['Room B','Room A']}),{view:'board'}),null);
 assert.equal(actionsChip(dark({action:action('SELECT_BLACKOUT_SLOT','slots',['A1'])}),{view:'room',room:'room-a'}),null);
 assert.equal(actionsChip(model({action:action('BLOCK_MOVE','targets',['seat-1'])}),{view:'room',room:'room-b'}),undefined);
 // The shell takes them.
 assert.ok(kept({viewer:'seat-4',target:actionsTarget(model({action:rescue})),chip:actionsChip(model({action:rescue}),{view:'room',room:'room-b'})}).chip);
});

test('the toasts once the server accepts: "Turn passed", "Moved to B4" with this phone\'s position, Hack Ship\'s and Blackhole\'s',()=>{
 assert.deepEqual(actionsToast(model({action:action('PASS_TURN','accepted')})),{id:'pass:turn-1',text:'Turn passed',icon:'info'});
 const moving=model({action:action('MOVE','slots',['B4'],{selected:['Room B']})});
 const flow=through({model:moving},{model:moving,pick:{slot:'B4'}},{model:model({action:action('MOVE','accepted')})});
 assert.deepEqual(actionsToast(model({action:action('MOVE','accepted')}),{flow}),{id:'MOVE:turn-1:B4',text:'Moved to B4',icon:'info'});
 // Without this phone's own position there is none to name.
 assert.equal(actionsToast(model({action:action('MOVE','accepted')})),null);
 assert.deepEqual(actionsToast(model({action:action('ACTIVATE_SHIP_HACK','accepted')})),{id:'ACTIVATE_SHIP_HACK:turn-1',text:'Hack Spaceship registered',icon:'check'});
 assert.equal(actionsToast(model({action:action('ACTIVATE_BLACKHOLE','accepted')})).text,'Blackhole registered');
 // After Register says the rest; nothing before acceptance; the other commands' are not Actions'.
 assert.equal(actionsToast(model({action:action('RESCUE','accepted')})),null);
 assert.equal(actionsToast(model({action:action('PASS_TURN','sending')})),undefined);
 assert.equal(actionsToast(model({action:action('VOTE','accepted')})),undefined);
});

test('this phone\'s pick: held from its taps while the model\'s action is that command, through its "Outcome unknown"; dropped otherwise',()=>{
 // A Rescue: the model has no person at the check or while it sends (A2), so the tap is held.
 const targets=model({action:action('RESCUE','targets',['seat-3'])});
 let flow=through({model:targets},{model:targets,pick:{seat:'seat-3'}},{model:model({action:action('RESCUE','confirm',[],{canConfirm:true})})});
 assert.deepEqual(flow,{match:'match-1',viewer:'seat-4',type:'RESCUE',phase:'turn-1',seats:['seat-3'],slot:null,room:null,stage:'checking'});
 flow=actionsFlow(flow,model({action:action('RESCUE','sending')}));assert.equal(flow.stage,'sent');assert.deepEqual(flow.seats,['seat-3']);
 // No answer: the recovery names no command (A4); this phone's own send is it, kept until it settles, also while reconnecting.
 flow=actionsFlow(flow,model({recovery:{status:'unknown',canCheck:true,canRetry:true}}));assert.equal(flow.stage,'unknown');
 assert.equal(actionsFlow(flow,model({connection:'stale',phase:null,recovery:{status:'unknown',canCheck:true,canRetry:false}})).stage,'unknown');
 const retrying=actionsFlow(flow,model({action:action('RESCUE','sending')}));assert.equal(retrying.stage,'retry');
 assert.equal(actionsFlow(retrying,model({action:action('RESCUE','accepted')})).stage,'accepted');
 // Settled (accepted, then the next view; or rejected): nothing is kept.
 assert.equal(actionsFlow(retrying,model()),null);
 // An "Outcome unknown" this phone did not see sent (a reload, or after a hidden page) has no flow.
 assert.equal(actionsFlow(null,model({recovery:{status:'unknown',canCheck:true,canRetry:false}})),null);
 assert.equal(actionsFlow(through({model:targets}),model({recovery:{status:'unknown',canCheck:true,canRetry:false}})),null);
 // Supply's two come from the model's selection; a move's room from its selection, its position from the tap.
 assert.deepEqual(actionsFlow(null,model({action:action('SUPPLY','confirm',[],{selected:['seat-1','seat-5']})})).seats,['seat-1','seat-5']);
 const moving=model({action:action('MOVE','slots',['B4'],{selected:['Room B']})});
 flow=through({model:moving},{model:moving,pick:{slot:'B4'}},{model:model({action:action('MOVE','confirm',[],{selected:['Room B']})})});
 assert.deepEqual([flow.slot,flow.room,flow.stage],['B4','Room B','checking']);
 assert.deepEqual([actionsFlow(flow,model({action:action('MOVE','sending')})).slot,actionsFlow(flow,model({action:action('MOVE','sending')})).room],['B4','Room B']);
 // Another command, another phase, viewer or match: a new flow, with nothing picked.
 assert.deepEqual(actionsFlow(flow,model({action:action('RESCUE','targets',['seat-3'])})).seats,[]);
 assert.equal(actionsFlow(flow,model({phase:{...turn,id:'turn-2'},action:action('MOVE','slots',['B4'],{selected:['Room B']})})).slot,null);
 assert.equal(actionsFlow(flow,model({ownSeatId:'seat-5',action:action('MOVE','slots',['B4'],{selected:['Room B']})})).slot,null);
 assert.equal(actionsFlow(flow,model({matchId:'match-2',action:action('MOVE','slots',['B4'],{selected:['Room B']})})).slot,null);
 // Concealed, on a display, for another command's action: nothing.
 assert.equal(actionsFlow(flow,model({concealed:true,action:action('MOVE','confirm')})),null);
 assert.equal(actionsFlow(flow,model({surface:'display',ownSeatId:null,action:action('MOVE','confirm')})),null);
 assert.equal(actionsFlow(flow,model({action:action('VOTE','targets',['seat-1'])})),null);
 assert.equal(holdActionsPick(null,model({action:action('VOTE','targets',['seat-1'])}),{seat:'seat-1'}),null);
});

test('the parts\' inputs: the List, the check (and while it sends), After Register, "Outcome unknown" and Pass, each accepted by the component',()=>{
 // The List (29): everyone the offer reaches, by room as the public board has them, the viewer's room first, then the board's order.
 const rescue=model({action:action('RESCUE','targets',['seat-1','seat-3','seat-5','seat-4','seat-9'],{selected:[]})});
 assert.deepEqual(actionsListGroups(rescue).map(g=>[g.room,g.people.map(p=>p.seat)]),[['Room B',['seat-5','seat-4']],['Room A',['seat-1']],['Hospital',['seat-3']],['Off board',['seat-9']]]);
 assert.deepEqual(actionsListGroups(rescue)[0].people[1],{seat:'seat-4',name:'Crew 4',character:'c4',health:'Healthy',you:true});
 const list=actionsPart(rescue,{frame:actionsFrame(rescue,{listOpen:true})});
 assert.equal(list.name,'list');assert.equal(checkTargetList(list.input).groups.length,4);
 // The check: this phone's pick, its room on the public board, and the game's own words after its question (B7).
 const check=model({action:action('RESCUE','confirm',[],{canConfirm:true,confirmation:'Rescue — Player 3?'})});
 const flow=through({model:model({action:action('RESCUE','targets',['seat-3'])}),pick:{seat:'seat-3'}},{model:check});
 const part=actionsPart(check,{frame:actionsFrame(check,{flow}),flow});
 assert.deepEqual(part,{name:'check',key:'check:RESCUE',input:{...common,type:'RESCUE',targets:[{seat:'seat-3',name:'Crew 3',character:'c3',room:'Hospital'}],position:null,facts:[],error:null}});
 assert.equal(checkActionCheck(part.input).targets[0].name,'Crew 3');
 assert.deepEqual(confirmationFacts('Move to Room B, B4? Entering or repositioning spends this round’s movement.'),['Entering or repositioning spends this round’s movement.']);
 assert.deepEqual(confirmationFacts('Supply Players 1 and 5? This uses the Round 3 Supply opportunity.'),['This uses the Round 3 Supply opportunity.']);
 assert.deepEqual([confirmationFacts('Activate Clone?'),confirmationFacts(null)],[[],[]]);
 // While it sends the model has neither person nor words: the check is given its status only, and keeps what it showed.
 const sending=model({action:action('RESCUE','sending')});
 assert.deepEqual(actionsPart(sending,{frame:actionsFrame(sending),flow:actionsFlow(flow,sending)}),{name:'check',key:'check:RESCUE',input:common});
 // A move: "Move to B4", its room, and its fact; with no tap of this phone's there is no position to name, and it draws nothing.
 const moving=model({action:action('MOVE','slots',['B4'],{selected:['Room B']})});
 const moveCheck=model({action:action('MOVE','confirm',[],{selected:['Room B'],canConfirm:true,confirmation:'Move to Room B, B4? Entering or repositioning spends this round’s movement.'})});
 const moved=through({model:moving},{model:moving,pick:{slot:'B4'}},{model:moveCheck});
 const movePart=actionsPart(moveCheck,{frame:actionsFrame(moveCheck),flow:moved});
 assert.deepEqual([movePart.input.type,movePart.input.position,movePart.input.targets,movePart.input.facts],['MOVE',{slot:'B4',room:'Room B'},[],['Entering or repositioning spends this round’s movement.']]);
 assert.equal(checkActionCheck(movePart.input).position.slot,'B4');
 assert.equal(actionsPart(moveCheck,{frame:actionsFrame(moveCheck),flow:null}).input.type,null);
 assert.equal(checkActionCheck(actionsPart(moveCheck,{frame:actionsFrame(moveCheck),flow:null}).input).type,null);
 // Supply's two people; an action with no person takes none.
 const supply=model({action:action('SUPPLY','confirm',[],{selected:['seat-1','seat-5'],canConfirm:true})});
 assert.deepEqual(checkActionCheck(actionsPart(supply,{frame:actionsFrame(supply),flow:actionsFlow(null,supply)}).input).targets.map(p=>p.seat),[1,5]);
 const clone=model({action:action('ACTIVATE_CLONE','confirm',[],{canConfirm:true})});
 assert.deepEqual(actionsPart(clone,{frame:actionsFrame(clone),flow:actionsFlow(null,clone)}).input.targets,[]);
 // After Register: the stamp each action takes, and the model's registration words; no time line or people (the model has none).
 const after=type=>actionsPart(model({action:action(type,'accepted',[],{prompt:'Registered. Resolution is pending.'})}),{frame:{kind:'action-after'}}).input;
 assert.deepEqual(['RESCUE','REQUEST_HACK','ACTIVATE_CLONE','ENGINEER_SUPPRESS'].map(type=>after(type).kind),['registered','accepted','active','captured']);
 assert.deepEqual((({title,detail,people,steps})=>({title,detail,people,steps}))(checkAfterRegister(after('RESCUE'))),{title:'Registered. Resolution is pending.',detail:null,people:null,steps:[]});
 // "Outcome unknown": the command this phone sent, with its person or position; none known, nothing named.
 const unknown=model({recovery:{status:'unknown',canCheck:true,canRetry:true}});
 const lost=actionsFlow(actionsFlow(flow,sending),unknown);
 const notice=actionsPart(unknown,{frame:actionsFrame(unknown,{flow:lost}),flow:lost});
 assert.deepEqual([notice.name,notice.input.type,notice.input.targets.map(p=>p.name),notice.input.position],['unknown','RESCUE',['Crew 3'],null]);
 assert.equal(checkOutcomeUnknown(notice.input).type,'RESCUE');
 const lostMove=actionsFlow(actionsFlow(moved,model({action:action('MOVE','sending')})),unknown);
 assert.deepEqual(actionsPart(unknown,{frame:{kind:'action-unknown'},flow:lostMove}).input.position,{slot:'B4',room:'Room B'});
 assert.deepEqual(actionsPart(unknown,{frame:{kind:'action-unknown'},flow:null}).input,{...common,type:null,targets:[],position:null});
 // Pass's line (27.3) is the model's: none (B6).
 const pass=model({action:action('PASS_TURN','confirm',[],{canConfirm:true})});
 assert.deepEqual(checkPassNote(actionsPart(pass,{frame:actionsFrame(pass)}).input).note,null);
 // Another frame, or none: no part.
 assert.equal(actionsPart(model({panel:'card'}),{frame:{id:'card',kind:'card'}}),null);
 assert.equal(actionsPart(model(),{frame:null}),null);
});

test('the taps: a tile begins its action; a move opens on the viewer\'s room; one tap of a position replays the room; the Disabler\'s fixes it',()=>{
 let current=model(),calls=[];
 const controller={
  begin:type=>{calls.push(['begin',type]);if(type==='MOVE')current={...current,action:action('MOVE','targets',['Room A','Room B'])};else current={...current,action:action(type,'targets',['seat-3'])};},
  choose:value=>{calls.push(['choose',value]);if(current.action?.type==='MOVE'&&current.action.step==='targets')current={...current,action:action('MOVE','slots',value==='Room B'?['B4']:['A3'],{selected:[value]})};},
  confirm:()=>{calls.push(['confirm']);},dismiss:()=>{calls.push(['dismiss']);},openPanel:panel=>{calls.push(['openPanel',panel]);},
 };
 let held=[],alive=true;
 const handlers=actionsHandlers({model:()=>current,...controller,hold:pick=>held.push(pick),live:()=>alive});
 handlers.onTile('RESCUE');
 assert.deepEqual(calls,[['begin','RESCUE']]);
 // A person from the List or the scene: held, then chosen.
 calls=[];handlers.onPick('seat-3');assert.deepEqual([calls,held],[[['choose','seat-3']],[{seat:'seat-3'}]]);
 // Move: from the board, so it ends with no sheet (Q2), and on the viewer's own room's positions (sheet 20).
 current=model();calls=[];held=[];handlers.onTile('MOVE');
 assert.deepEqual(calls,[['dismiss'],['begin','MOVE'],['choose','Room B']]);
 // A position of the room chosen: the position alone.
 calls=[];handlers.choose('B4');assert.deepEqual([calls,held],[[['choose','B4']],[{slot:'B4'}]]);
 // A position while the rooms are offered: its room, then the position.
 current={...model(),action:action('MOVE','targets',['Room A','Room B'])};calls=[];handlers.choose('A3');
 assert.deepEqual(calls,[['choose','Room A'],['choose','A3']]);
 // A position in another room than the one chosen: the move again from the rooms.
 current={...model(),action:action('MOVE','slots',['B4'],{selected:['Room B']})};calls=[];handlers.choose('A3');
 assert.deepEqual(calls,[['begin','MOVE'],['choose','Room A'],['choose','A3']]);
 // Move no longer offered: back to the tiles.
 controller.begin=type=>{calls.push(['begin',type]);};current=model();calls=[];
 actionsHandlers({model:()=>current,...controller,hold:()=>{}}).onTile('MOVE');
 assert.deepEqual(calls,[['dismiss'],['begin','MOVE'],['openPanel','actions']]);
 // The Disabler's position: one tap, as sheet 30 draws it: choose, then confirm (the controller checks the offer).
 current=model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1','A2'])});calls=[];held=[];handlers.choose('A2');
 assert.deepEqual([calls,held],[[['choose','A2'],['confirm']],[{slot:'A2'}]]);
 // The other commands' choices only choose.
 current=model({action:action('BLOCK_MOVE','targets',['seat-1'])});calls=[];handlers.choose('seat-1');assert.deepEqual(calls,[['choose','seat-1']]);
 // Once disposed, nothing.
 alive=false;calls=[];handlers.onTile('RESCUE');handlers.onPick('seat-3');handlers.choose('B4');assert.deepEqual(calls,[]);
});

test('Cancel: on the bar back to the tiles, a move\'s check back to choosing (Q1), a fixed position only hidden (T2); the shell routes it',()=>{
 assert.equal(actionsCancel(model({action:action('RESCUE','targets',['seat-3'])})),'tiles');
 assert.equal(actionsCancel(model({action:action('RESCUE','confirm')}),{where:'check'}),'tiles');
 assert.equal(actionsCancel(model({action:action('MOVE','confirm')}),{where:'check'}),'restart');
 assert.equal(actionsCancel(model({action:action('MOVE','slots',['B4'])})),'tiles');
 // While it sends, Cancel only closes the check (L5): back to the tiles, recalling nothing.
 assert.equal(actionsCancel(model({action:action('MOVE','sending')}),{where:'check'}),'tiles');
 assert.equal(actionsCancel(model({dark:true,action:action('SELECT_BLACKOUT_SLOT','slots',['A1'])})),'tiles');
 assert.equal(actionsCancel(model({dark:true,panel:'actions',privateArea:{blackoutTargeting:{windowId:'w',boundRoom:'Room A',selectable:false,selectedSlotId:'A1',slotIds:['A1']}}})),'dismiss');
 for(const over of [{},{action:action('PASS_TURN','confirm')},{action:action('BLOCK_MOVE','targets',['seat-1'])}])assert.equal(actionsCancel(model(over)),null);
 // The shell's intents: Register and Pass confirm; Done closes; Retry and Check receipt are the controller's; Cancel as above.
 const calls=[];
 const on=shellHandlers({openPanel:p=>calls.push(['openPanel',p]),begin:t=>calls.push(['begin',t]),confirm:()=>calls.push(['confirm']),dismiss:()=>calls.push(['dismiss']),toggleView:()=>calls.push(['toggle']),
  showBoard:()=>calls.push(['board']),openList:()=>calls.push(['list']),closeList:()=>calls.push(['closeList']),retry:()=>calls.push(['retry']),checkReceipt:()=>calls.push(['check']),
  cancelTarget:()=>calls.push(['cancelTarget']),cancelCheck:()=>calls.push(['cancelCheck'])});
 on.onSheetAction('register','action-check');on.onSheetAction('pass','pass');on.onSheetAction('done','action-after');on.onSheetAction('retry','action-unknown');on.onSheetAction('check','action-unknown');
 on.onSheetAction('cancel','action-check');on.onSheetAction('cancel','pass');on.onCancelTarget();
 on.onChip('other-rooms');on.onChip('move-board');on.onChip('list');on.onSheetBack('action-list');on.onSheetBack('windows');
 assert.deepEqual(calls,[['confirm'],['confirm'],['dismiss'],['retry'],['check'],['cancelCheck'],['dismiss'],['cancelTarget'],['board'],['board'],['list'],['closeList'],['openPanel','panels']]);
});

test('the shell\'s input for Actions\' steps is the component\'s, accepted by the shell; concealed or on a display, none of it',()=>{
 const flowModel=model({action:action('RESCUE','confirm',[],{canConfirm:true})});
 const input=shellInput(flowModel,{view:'room',room:'room-b',flow:null});
 assert.equal(input.sheet.id,'action-check');assert.equal(input.target,null);
 assert.equal(kept(input).sheet.actions[1].label,'Register Rescue');
 const passed=shellInput(model({action:action('PASS_TURN','accepted')}),{view:'room',room:'room-b'});
 assert.deepEqual([passed.sheet,passed.toast],[null,{id:'pass:turn-1',text:'Turn passed',icon:'info'}]);
 // Concealed: the shell drops this viewer's inputs, and no part has a frame to mount in.
 const hidden=model({concealed:true,panel:'actions',action:action('RESCUE','confirm'),recovery:{status:'unknown',canCheck:false,canRetry:false}});
 for(const value of [actionsFrame(hidden),actionsTarget(hidden),actionsChip(hidden,{view:'room',room:'room-b'}),actionsToast(hidden),actionsFlow(null,hidden)])assert.ok(value==null);
 assert.equal(actionsStatus(hidden),'concealed');
 const concealed=shellInput(hidden,{view:'room',room:'room-b'});
 assert.deepEqual([concealed.sheet,concealed.target,concealed.toast],[null,null,null]);
 // A display: no Actions at all.
 const display=model({surface:'display',ownSeatId:null,panel:'actions',action:action('RESCUE','targets',['seat-3'])});
 for(const value of [actionsFrame(display),actionsTarget(display),actionsChip(display,{view:'board'}),actionsToast(display)])assert.equal(value,undefined);
 assert.equal(actionsPart(display,{frame:{kind:'actions'}}),null);
 // Reconnecting or a closed phase: stale. (The controller then withholds the panel and the action, so the sheet closes.)
 assert.deepEqual([actionsStatus(model({connection:'stale'})),actionsStatus(model({phase:{...turn,expired:true}})),actionsStatus(model())],['stale','stale','live']);
 assert.equal(actionsFrame(model({connection:'stale',panel:'board',phase:null})),undefined);
 // Where the viewer and a position are.
 assert.deepEqual([ownLocation(model()),ownLocation(model({ownSeatId:'seat-9'})),slotLocation('B4'),slotLocation('C1'),slotLocation('H2'),slotLocation('Z9')],['Room B',null,'Room B','Command Room','Hospital',null]);
 assert.deepEqual(ACTIONS_FLOWS.filter(type=>!ACTION_LOOKS[type]?.register),[]);
});

test('the room scene marks this phone\'s pick at the check and while it sends, and the Disabler\'s fixed position (sheet 30)',()=>{
 const check=model({action:action('RESCUE','confirm')});
 const flow=through({model:model({action:action('RESCUE','targets',['seat-5'])}),pick:{seat:'seat-5'}},{model:check});
 assert.deepEqual(roomSceneTargets(check,'room-b',flow),{seats:['seat-5'],picked:['seat-5']});
 assert.deepEqual(roomSceneTargets(model({action:action('RESCUE','sending')}),'room-b',actionsFlow(flow,model({action:action('RESCUE','sending')}))),{seats:['seat-5'],picked:['seat-5']});
 assert.equal(roomSceneTargets(check,'room-b',null),null);
 // A move's position, filled, in its room only.
 const moving=model({action:action('MOVE','slots',['B4'],{selected:['Room B']})});
 const moved=through({model:moving},{model:moving,pick:{slot:'B4'}},{model:model({action:action('MOVE','confirm',[],{selected:['Room B']})})});
 assert.deepEqual(roomSceneTargets(model({action:action('MOVE','confirm',[],{selected:['Room B']})}),'room-b',moved),{slots:['B4'],picked:'B4',icon:'move'});
 assert.equal(roomSceneTargets(model({action:action('MOVE','confirm',[],{selected:['Room B']})}),'room-a',moved),null);
 // The Disabler's: while it sends and once accepted, the bound room's positions with the tapped one marked; then fixed from the view.
 const targeting={windowId:'w',boundRoom:'Room A',selectable:true,selectedSlotId:null,slotIds:['A1','A2','A3']};
 const dark=over=>model({dark:true,panel:'actions',board:null,privateArea:{blackoutTargeting:targeting,offers:[]},...over});
 const slots=dark({action:action('SELECT_BLACKOUT_SLOT','slots',['A1','A2','A3'])});
 const fixing=through({model:slots,pick:{slot:'A2'}},{model:dark({action:action('SELECT_BLACKOUT_SLOT','sending')})});
 assert.deepEqual(roomSceneTargets(dark({action:action('SELECT_BLACKOUT_SLOT','sending')}),'room-a',fixing),{slots:['A1','A2','A3'],picked:'A2',icon:'position'});
 assert.deepEqual(roomSceneTargets(dark({action:action('SELECT_BLACKOUT_SLOT','accepted')}),'room-a',actionsFlow(fixing,dark({action:action('SELECT_BLACKOUT_SLOT','accepted')}))),{slots:['A1','A2','A3'],picked:'A2',icon:'position'});
 assert.deepEqual(roomSceneTargets(dark({privateArea:{blackoutTargeting:{...targeting,selectable:false,selectedSlotId:'A3'}}}),'room-a'),{slots:['A1','A2','A3'],picked:'A3',icon:'position'});
 assert.equal(roomSceneTargets(dark({privateArea:{blackoutTargeting:{...targeting,selectable:false,selectedSlotId:'A3'}}}),'room-b'),null);
 // Concealed or on a display: none.
 assert.equal(roomSceneTargets({...check,concealed:true},'room-b',flow),null);
 assert.equal(roomSceneTargets({...check,surface:'display'},'room-b',flow),null);
});
