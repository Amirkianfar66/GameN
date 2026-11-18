import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import {planetPromiseTerms} from '@mothership/presentation';
import {PROMISES_NOT_AVAILABLE,PROMISES_SHEET_ID,PROMISES_START,PROMISE_COMMANDS,promisesFlow,promisesFrame,promisesGiven,promisesHandlers,promisesIncoming,promisesInput,promisesOpen,
 promisesPart,promisesPartner,promisesReceived,promisesToast} from '../hosted/planet/promises-input.mjs';
import {shellChip,shellHandlers,shellInput,shellSheet,shellTarget,shellToast} from '../hosted/planet/shell-input.mjs';
import {PROMISES_DEFAULTS,nextPromisesInput,promisesSheet} from '../../../design/phone-ui/components/promises/promises.mjs';
import {nextPhoneShellInput,PHONE_SHELL_DEFAULTS} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';

// Promises on a player's phone are Designer's promises component (#297; the owner's plan of 16 November 2026, release
// 3, step 2). These cover the game's side: when the sheet is Promises', the input from the model (the quota, the talk's
// partner, the offers, the pair's Promises with Frontend's exact terms), this phone's view and draft, the receipt's
// toast, the taps that make the controller's own draft, and that the component's own check (nextPromisesInput) and the
// shell's (nextPhoneShellInput) accept what is built here.
const seat=(n,location)=>({seatId:`seat-${n}`,location,slotId:null,health:'Healthy',jailed:false});
const seats=[1,2,3,4,5,6,7,8,9].map(n=>seat(n,n<5?'Room A':'Room B'));
const identities=[1,2,3,4,5,6,7,8].map(n=>({seatId:`seat-${n}`,characterId:`c${n}`,displayName:`Crew ${n}`}));
const talking={id:'talk-1',kind:'HACK',startedAt:0,endsAt:60000,nowMs:1000,remainingMs:59000,trusted:true,expired:false};
const turn={...talking,id:'turn-1',kind:'ORDINARY_TURN'};
const versions={...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'};
const offer=(type,targets=[],promiseTargets=[])=>({type,targetSeatIds:targets,slotIds:[],windowIds:[],promiseTargetSeatIds:promiseTargets});
const OFFERS=[offer('OFFER_PROMISE',['seat-1'],['seat-1','seat-3','seat-9']),offer('ACCEPT_PROMISE',['seat-4']),offer('DECLINE_PROMISE',['seat-4'])];
const promise=(id,giver,recipient,kind,more={})=>({id,giverSeatId:`seat-${giver}`,recipientSeatId:`seat-${recipient}`,kind,targetSeatId:null,round:3,electionId:null,
 accepted:false,status:'Pending',offerStatus:'offered',...more});
const accept=p=>({...p,accepted:true,offerStatus:'accepted'});
// Crew 4's phone, in the 60 s talk with Crew 1, who has offered Meet in Room A.
function model(over={},area={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions,playerCount:9,connection:'live',message:null,concealed:false,dark:false,round:3,revision:7,boardLabel:null,
  phase:talking,activeSeatId:null,offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},board:{seats},identities,talk:{id:'talk',actorSeatId:'seat-4',targetSeatId:'seat-1'},
  lastTally:null,panel:'promises',action:null,canPass:false,canMove:false,moveRooms:[],canVote:false,ownBallot:null,promiseOfferCount:1,recovery:null,food:null,
  privateArea:{promises:[promise('in-1',1,4,'MEET_A')],promiseQuota:{given:false,received:false},offers:OFFERS,...area},...over};
}
const act=(type,step,more={})=>({type,label:type,step,selected:[],choices:[],prompt:step==='accepted'?'Registered. Waiting for the authoritative view.':step==='sending'?'Registering…':'',
 confirmation:null,canConfirm:step==='confirm',...more});
/** The component's own normalization of an input: it accepts it. */
const accepted=input=>nextPromisesInput(PROMISES_DEFAULTS,input);
const kept=input=>nextPhoneShellInput(PHONE_SHELL_DEFAULTS,input);
const ON={enabled:true,busy:false,reason:null},OFF={enabled:false,busy:false,reason:PROMISES_NOT_AVAILABLE},BUSY={enabled:true,busy:true,reason:null};

test('Promises are the component\'s one sheet: the panel, or its three commands drafted or under way; never on the display, concealed, in the dark or once the phase has run out',()=>{
 assert.deepEqual(PROMISE_COMMANDS,['OFFER_PROMISE','ACCEPT_PROMISE','DECLINE_PROMISE']);
 assert.equal(promisesOpen(model()),true);
 for(const type of PROMISE_COMMANDS)for(const step of ['targets','promise','number','confirm','sending','accepted'])assert.equal(promisesOpen(model({panel:'board',action:act(type,step)})),true,`${type} ${step}`);
 // Another command drafted from the Promises panel (the ballot, from the hero) keeps its own sheet.
 assert.equal(promisesOpen(model({action:act('VOTE','targets')})),false);
 for(const panel of ['board','actions','card','panels','windows','settings'])assert.equal(promisesOpen(model({panel})),false,panel);
 for(const over of [{surface:'display'},{concealed:true},{dark:true},{phase:{...talking,expired:true}}])assert.equal(promisesOpen(model(over)),false,JSON.stringify(over));
 const frame=promisesFrame(model());
 assert.deepEqual(frame,{sub:null,...promisesSheet(promisesInput(model())),kind:'promises'});
 assert.equal(frame.id,PROMISES_SHEET_ID);assert.ok(kept({viewer:'seat-4',sheet:frame}).sheet);
 assert.deepEqual((({title,back,close,detent,actions})=>({title,back,close,detent,actions}))(frame),{title:'Promises',back:false,close:true,detent:'large',actions:[]});
 // The shell's sheet is the component's; the other sheets keep theirs.
 assert.deepEqual(shellSheet(model()),frame);
 assert.deepEqual(shellInput(model(),{view:'room',room:'capsule'}).sheet,frame);
 assert.equal(shellSheet(model({action:act('VOTE','targets',{choices:[{value:'seat-1',label:'Player 1'}]})})).id,'action:VOTE');
 assert.equal(shellSheet(model({dark:true})).kind,'dark');assert.equal(shellSheet(model({phase:{...talking,expired:true}})).kind,'expired');
 assert.equal(promisesFrame(model({panel:'windows'})),null);assert.equal(shellSheet(model({panel:'windows'})).id,'windows');
 // While the controller's own draft passes its steps (the partner, a kind, Jail Vote's player), nothing chooses on
 // the scene: no target bar and no chip, and the sheet stays Promises'.
 for(const [step,choices]of [['targets',['seat-1']],['promise',['CAPTAIN_SUPPORT','MEET_B']],['number',['seat-1','seat-3']]]){
  const m=model({action:act('OFFER_PROMISE',step,{choices:choices.map(value=>({value,label:value}))})});
  assert.equal(shellTarget(m),null,step);assert.equal(shellChip(m),null,step);assert.equal(shellSheet(m,{promises:{view:'confirm',kind:'MEET_B',target:null}}).kind,'promises',step);
 }
});

test('the Promises panel never falls through to a bare title: with no other command, it is the component\'s sheet, or the shell\'s Blackout and "Waiting for the server"',()=>{
 const phases=[talking,turn,{...turn,id:'vote-1',kind:'JAIL_VOTE'},{...turn,id:'captain-1',kind:'CAPTAIN_ELECTION'},{...turn,id:'blackout-1',kind:'BLACKOUT'},{...turn,id:'open-1',endsAt:null,remainingMs:null}];
 const talks=[{id:'talk',actorSeatId:'seat-4',targetSeatId:'seat-1'},{id:'talk',actorSeatId:'seat-2',targetSeatId:'seat-3'},null];
 const areas=[{},{promises:[],offers:[]},{promises:[accept(promise('given',4,1,'MEET_B')),accept(promise('received',3,4,'JAIL_VOTE',{targetSeatId:'seat-2'}))],promiseQuota:{given:true,received:true},offers:[]}];
 const views=[null,{view:'kinds',kind:null,target:null},{view:'confirm',kind:'JAIL_VOTE',target:'seat-3'},{view:'incoming',kind:null,target:null}];
 const actions=[null,...PROMISE_COMMANDS.flatMap(type=>['targets','promise','number','confirm','sending','accepted'].map(step=>act(type,step)))];
 let count=0;
 for(const phase of phases)for(const talk of talks)for(const area of areas)for(const dark of [false,true])for(const expired of [false,true])for(const action of actions)for(const view of views){
  // The controller gives no action once the phase has run out (an action needs its `valid`), and no Promise is
  // offered in the dark (its phaseAllows), so a Promise command is never under way in either.
  if(action&&(dark||expired))continue;
  const m=model({phase:{...phase,expired},talk,dark,action},area),flow=promisesFlow(view,m),sheet=shellSheet(m,{promises:flow});
  const what=JSON.stringify({phase:phase.kind,talk:talk?.actorSeatId??null,area:areas.indexOf(area),dark,expired,action:action&&`${action.type} ${action.step}`,view});
  if(dark)assert.deepEqual([sheet?.id,sheet?.kind,sheet?.title],['dark:promises','dark','Blackout'],what);
  else if(expired)assert.deepEqual([sheet?.id,sheet?.kind,sheet?.title],['expired','expired','Waiting for the server'],what);
  else{assert.equal(sheet?.id,PROMISES_SHEET_ID,what);assert.deepEqual(sheet,promisesFrame(m,{flow}),what);}
  count++;
 }
 assert.equal(count,6*3*3*views.length*(4+PROMISE_COMMANDS.length*6));
 // Those two are the shell's frames for every panel, as before.
 assert.equal(shellSheet(model({panel:'windows',dark:true})).title,'Blackout');assert.equal(shellSheet(model({panel:'windows',phase:{...talking,expired:true}})).title,'Waiting for the server');
 // With another command under way, the Promises panel changes nothing: the sheet is that command's, as from the board.
 for(const a of [act('VOTE','targets',{choices:[{value:'seat-1',label:'Player 1'}]}),act('PASS_TURN','confirm'),act('SCAN','targets',{choices:[{value:'seat-2',label:'Crew 2'}]}),
  act('SCAN','confirm'),act('SCAN','accepted'),act('MOVE','slots',{choices:[{value:'A3',label:'A3'}]}),act('SELECT_BLACKOUT_SLOT','slots')]){
  for(const dark of [false,true]){
   const m=model({action:a,dark});
   assert.equal(promisesOpen(m),false,a.type);assert.deepEqual(shellSheet(m),shellSheet({...m,panel:'board'}),`${a.type} ${a.step} ${dark}`);
  }
 }
});

test('the input: the quota, the talk\'s partner only during the 60 s talk, the commands as the model offers them, Jail Vote\'s players exactly the offer\'s',()=>{
 const input=promisesInput(model());
 assert.equal(input.viewer,4);assert.equal(input.versions,versions);assert.equal(input.view,'list');assert.equal(input.status,'live');
 assert.deepEqual(input.quota,{given:false,received:false});
 assert.deepEqual(promisesInput(model({},{promiseQuota:{given:true,received:true}})).quota,{given:true,received:true});
 assert.deepEqual(input.talk,{seat:1,name:'Crew 1',character:'c1'});
 assert.deepEqual(input.offer,ON);assert.deepEqual(input.answer,{accept:ON,decline:ON});
 // Exactly the offer's promiseTargetSeatIds, in its order; a seat with no identity is "Player n".
 assert.deepEqual(input.targets,[{seat:1,name:'Crew 1',character:'c1'},{seat:3,name:'Crew 3',character:'c3'},{seat:9,name:'Player 9',character:null}]);
 // The talk's other player, whichever side this phone is on; nobody's when this phone isn't in the talk.
 assert.equal(promisesPartner(model({talk:{id:'t',actorSeatId:'seat-2',targetSeatId:'seat-4'}})),'seat-2');
 assert.equal(promisesPartner(model({talk:{id:'t',actorSeatId:'seat-2',targetSeatId:'seat-3'}})),null);
 // Only in the 60 s talk (HACK), the only phase in which a Promise is offered or answered: not while the target
 // declares, not at the claim, not in a turn.
 for(const kind of ['HACK_DECLARE','HACK_RESULT','ORDINARY_TURN','JAIL_VOTE']){
  const m=model({phase:{...talking,kind}});
  assert.equal(promisesPartner(m),null,kind);assert.equal(promisesInput(m).talk,null,kind);assert.equal(promisesInput(m).offer,null,kind);
 }
 // Not offered: refused with T3's words, as the model gives no reason (A1); busy while it sends.
 const none=model({},{offers:[]});
 assert.deepEqual(promisesInput(none).offer,OFF);assert.deepEqual(promisesInput(none).answer,{accept:OFF,decline:OFF});assert.deepEqual(promisesInput(none).targets,[]);
 assert.deepEqual(promisesInput(model({action:act('OFFER_PROMISE','sending')},{offers:[]})).offer,BUSY);
 assert.deepEqual(promisesInput(model({action:act('ACCEPT_PROMISE','sending')},{offers:[]})).answer,{accept:BUSY,decline:OFF});
 assert.deepEqual(promisesInput(model({action:act('DECLINE_PROMISE','sending')},{offers:[]})).answer,{accept:OFF,decline:BUSY});
 assert.equal(promisesInput(model(),{status:'stale',reducedMotion:true}).status,'stale');assert.equal(promisesInput(model(),{reducedMotion:true}).reducedMotion,true);
 for(const m of [model(),none,model({phase:turn})])assert.ok(accepted(promisesInput(m)));
});

test('the Promises: the pair\'s, given and received as the projection has them, with Frontend\'s exact terms; declined and expired offers leave',()=>{
 const incoming=promise('in-1',1,4,'MEET_A');
 assert.deepEqual(promisesInput(model()).received,{id:'in-1',kind:'MEET_A',giver:{seat:1,name:'Crew 1',character:'c1'},recipient:{seat:4,name:'Crew 4',character:'c4'},
  state:'offered',status:null,terms:planetPromiseTerms(incoming),when:null,why:null,condition:null});
 assert.equal(promisesIncoming(model()).id,'in-1');assert.equal(promisesInput(model()).given,null);
 // The given one: the accepted one, else the newest offer still waiting; never a declined or expired one.
 const older=promise('out-1',4,1,'MEET_B'),newer=promise('out-2',4,1,'JAIL_VOTE',{targetSeatId:'seat-3'});
 assert.equal(promisesGiven(model({},{promises:[older,newer]})).id,'out-2');
 assert.equal(promisesGiven(model({},{promises:[accept(older),newer]})).id,'out-1');
 assert.equal(promisesGiven(model({},{promises:[{...older,offerStatus:'declined'},{...newer,offerStatus:'expired'}]})),null);
 const given=promisesInput(model({},{promises:[accept(newer)]})).given;
 assert.deepEqual(given,{id:'out-2',kind:'JAIL_VOTE',giver:{seat:4,name:'Crew 4',character:'c4'},recipient:{seat:1,name:'Crew 1',character:'c1'},
  state:'accepted',status:'Pending',terms:'Player 4 votes for Player 3 at the next Jail vote of Round 3; admission is not required.',when:null,why:null,condition:null});
 assert.equal(promisesInput(model({},{promises:[accept({...older,status:'Not fulfilled'})]})).given.status,'Not fulfilled');
 // The received one: the accepted one; else, in the talk, the partner's newest offer, which only that talk answers.
 const fromOther=promise('in-2',2,4,'NO_JAIL_VOTE');
 assert.equal(promisesReceived(model({},{promises:[fromOther,incoming]})).id,'in-1');
 assert.equal(promisesReceived(model({},{promises:[fromOther]})),null);
 assert.equal(promisesReceived(model({phase:turn},{promises:[incoming]})),null);
 assert.equal(promisesReceived(model({phase:turn},{promises:[accept(fromOther)]})).id,'in-2');
 assert.equal(promisesReceived(model({},{promises:[{...incoming,offerStatus:'declined'}]})),null);
 assert.equal(promisesIncoming(model({},{promises:[accept(incoming)]})),null);
 // A Promise that names another pair never reaches the component, and nothing else of this phone's does.
 const other=promise('x-1',2,3,'MEET_A');
 const input=promisesInput(model({},{promises:[other,incoming],role:{secret:'private-marker'}}));
 assert.equal(input.received.id,'in-1');assert.equal(input.given,null);
 assert.ok(!JSON.stringify(input).includes('x-1')&&!JSON.stringify(input).includes('private-marker'));
 for(const m of [model({},{promises:[accept(older),accept(incoming)]}),model({phase:turn},{promises:[accept(newer),accept(fromOther)]})])assert.ok(accepted(promisesInput(m)));
});

test('the view and the draft are this phone\'s own, kept to what the model allows, with the terms in Frontend\'s words',()=>{
 assert.equal(promisesFlow({view:'kinds',kind:'MEET_A',target:null},model({panel:'board'})),null);
 assert.deepEqual(promisesFlow(null,model()),PROMISES_START);
 assert.deepEqual(promisesFlow({view:'kinds',kind:'MEET_B',target:null},model()),{view:'kinds',kind:'MEET_B',target:null});
 // The talk over, or the offer to answer gone: the list.
 for(const view of ['kinds','target','confirm','incoming'])assert.deepEqual(promisesFlow({view,kind:'JAIL_VOTE',target:3},model({phase:turn})),PROMISES_START,view);
 assert.deepEqual(promisesFlow({view:'incoming',kind:null,target:null},model({},{promises:[]})),PROMISES_START);
 assert.deepEqual(promisesFlow({view:'incoming',kind:null,target:null},model()),{view:'incoming',kind:null,target:null});
 // A command's receipt: the list, where the next view shows the Promise.
 for(const type of PROMISE_COMMANDS)assert.deepEqual(promisesFlow({view:'confirm',kind:'MEET_A',target:null},model({action:act(type,'accepted')})),PROMISES_START,type);
 // Jail Vote's player: only for Jail Vote, and only while the offer still names them; kept while the offer sends,
 // when the model withholds the offer.
 assert.deepEqual(promisesFlow({view:'confirm',kind:'MEET_A',target:3},model()),{view:'confirm',kind:'MEET_A',target:null});
 assert.deepEqual(promisesFlow({view:'confirm',kind:'JAIL_VOTE',target:2},model()),{view:'target',kind:'JAIL_VOTE',target:null});
 assert.deepEqual(promisesFlow({view:'confirm',kind:'JAIL_VOTE',target:3},model({action:act('OFFER_PROMISE','sending')},{offers:[]})),{view:'confirm',kind:'JAIL_VOTE',target:3});
 assert.deepEqual(promisesFlow({view:'target',kind:'MEET_A',target:null},model()),{view:'kinds',kind:'MEET_A',target:null});
 assert.deepEqual(promisesFlow({view:'confirm',kind:null,target:null},model()),{view:'kinds',kind:null,target:null});
 assert.deepEqual(promisesFlow({view:'kinds',kind:'BOGUS',target:null},model()),{view:'kinds',kind:null,target:null});
 // The terms of the offer being made: Frontend's words, as the controller's own check words them.
 const terms=kind=>planetPromiseTerms({kind,giverSeatId:'seat-4',recipientSeatId:'seat-1',targetSeatId:kind==='JAIL_VOTE'?'seat-3':null,round:3,electionId:null});
 assert.deepEqual(promisesInput(model(),{flow:{view:'confirm',kind:'MEET_B',target:null}}).draft,{kind:'MEET_B',target:null,terms:terms('MEET_B')});
 assert.deepEqual(promisesInput(model(),{flow:{view:'confirm',kind:'JAIL_VOTE',target:3}}).draft,{kind:'JAIL_VOTE',target:3,terms:terms('JAIL_VOTE')});
 assert.equal(promisesInput(model(),{flow:{view:'target',kind:'JAIL_VOTE',target:null}}).draft.terms,null);
 // While it sends the model withholds the offer and its players: the terms still name the player.
 const sending=promisesInput(model({action:act('OFFER_PROMISE','sending')},{offers:[]}),{flow:{view:'confirm',kind:'JAIL_VOTE',target:3}});
 assert.deepEqual(sending.draft,{kind:'JAIL_VOTE',target:null,terms:terms('JAIL_VOTE')});assert.deepEqual(sending.offer,BUSY);
 for(const flow of [{view:'kinds',kind:'MEET_B',target:null},{view:'target',kind:'JAIL_VOTE',target:3},{view:'confirm',kind:'JAIL_VOTE',target:3},{view:'incoming',kind:null,target:null}]){
  assert.ok(accepted(promisesInput(model(),{flow})),flow.view);
  assert.equal(promisesFrame(model(),{flow}).id,PROMISES_SHEET_ID,flow.view);assert.ok(kept({viewer:'seat-4',sheet:promisesFrame(model(),{flow})}).sheet,flow.view);
 }
 assert.ok(accepted(sending));
 assert.equal(promisesFrame(model(),{flow:{view:'kinds',kind:null,target:null}}).title,'Offer to Crew 1');
 // The shell connection passes this phone's view and draft through to the sheet.
 const kinds={view:'kinds',kind:'MEET_B',target:null};
 assert.deepEqual(shellSheet(model(),{promises:kinds}),promisesFrame(model(),{flow:kinds}));
 assert.deepEqual(shellInput(model(),{view:'room',room:'capsule',promises:kinds}).sheet,promisesFrame(model(),{flow:kinds}));
 assert.deepEqual(shellInput(model(),{view:'room',room:'capsule',promises:kinds}).sheet.actions.map(a=>[a.id,a.enabled]),[['next',true]]);
 assert.equal(promisesFrame(model(),{flow:{view:'incoming',kind:null,target:null}}).title,'Offer from Crew 1');
});

test('the part in the sheet\'s body, and a command\'s receipt in the shell\'s toast in Frontend\'s words',()=>{
 const frame=promisesFrame(model());
 assert.deepEqual(promisesPart(model(),{frame,flow:null,status:'live',reducedMotion:true}),{name:'promises',key:'promises',input:promisesInput(model(),{status:'live',reducedMotion:true})});
 assert.equal(promisesPart(model(),{frame:null}),null);assert.equal(promisesPart(model(),{frame:{...frame,kind:'panels'}}),null);
 const toast=promisesToast(model({action:act('OFFER_PROMISE','accepted')}));
 assert.deepEqual(toast,{id:'OFFER_PROMISE:talk-1:7',text:'Registered. Waiting for the authoritative view.',icon:'check'});
 assert.deepEqual(shellToast(model({action:act('ACCEPT_PROMISE','accepted')})),{id:'ACCEPT_PROMISE:talk-1:7',text:'Registered. Waiting for the authoritative view.',icon:'check'});
 assert.ok(kept({viewer:'seat-4',toast}).toast);
 for(const m of [model({action:act('OFFER_PROMISE','sending')}),model({action:act('VOTE','accepted')}),model(),model({surface:'display',action:act('OFFER_PROMISE','accepted')}),model({concealed:true,action:act('OFFER_PROMISE','accepted')})])
  assert.equal(promisesToast(m),null);
});

test('the taps: the view and draft are local; Offer makes the controller\'s own draft in one go and confirms; Accept and Decline answer the incoming offer',()=>{
 const run=({at=model(),flow:start=PROMISES_START,steps=2,refuse=false,live=true}={})=>{
  const calls=[];let current=at,flow=start,chosen=0;
  const step=()=>chosen>=steps?'confirm':'targets';
  const h=promisesHandlers({model:()=>current,flow:()=>flow,setFlow:next=>{flow=next;calls.push(['flow',next]);},
   begin:type=>{calls.push(['begin',type]);if(!refuse){chosen=0;current={...current,action:act(type,'targets')};}},
   choose:value=>{calls.push(['choose',value]);if(current.action){chosen++;current={...current,action:act(current.action.type,step())};}},
   confirm:()=>{calls.push(['confirm']);return Promise.resolve();},focusReturn:detail=>calls.push(['focus',detail]),live:()=>live});
  return {h,calls,flow:()=>flow};
 };
 let t=run();
 t.h.onOffer();assert.deepEqual(t.flow(),{view:'kinds',kind:null,target:null});
 t.h.action('next');assert.equal(t.flow().view,'kinds');
 t.h.onKind('BOGUS');assert.equal(t.flow().kind,null);
 t.h.onKind('JAIL_VOTE');t.h.action('next');assert.deepEqual(t.flow(),{view:'target',kind:'JAIL_VOTE',target:null});
 t.h.action('next');assert.equal(t.flow().view,'target');
 t.h.onTarget(3);t.h.action('next');assert.deepEqual(t.flow(),{view:'confirm',kind:'JAIL_VOTE',target:3});
 t.h.action('back');assert.equal(t.flow().view,'target');t.h.action('next');
 t.h.back();assert.equal(t.flow().view,'target');t.h.back();assert.equal(t.flow().view,'kinds');t.h.back();assert.equal(t.flow().view,'list');
 // A kind other than Jail Vote drops the player; Next goes straight to the terms, whose Back returns to the kinds.
 t.h.onOffer();t.h.onKind('JAIL_VOTE');t.h.onTarget(3);assert.equal(t.flow().target,3);
 t.h.onKind('MEET_B');assert.equal(t.flow().target,null);t.h.action('next');assert.equal(t.flow().view,'confirm');
 t.h.action('back');assert.equal(t.flow().view,'kinds');
 assert.ok(t.calls.every(([what])=>what==='flow'),'only local until Offer');
 // Offer: the controller's own steps, the partner, the kind (and Jail Vote's player), then its confirm.
 t=run({flow:{view:'confirm',kind:'MEET_B',target:null}});t.h.action('offer');
 assert.deepEqual(t.calls,[['begin','OFFER_PROMISE'],['choose','seat-1'],['choose','MEET_B'],['confirm']]);
 t=run({flow:{view:'confirm',kind:'JAIL_VOTE',target:3},steps:3});t.h.action('offer');
 assert.deepEqual(t.calls,[['begin','OFFER_PROMISE'],['choose','seat-1'],['choose','JAIL_VOTE'],['choose','seat-3'],['confirm']]);
 // The controller's refusal stops it: nothing chosen or confirmed after a refused begin; no confirm unless it is ready.
 t=run({flow:{view:'confirm',kind:'MEET_B',target:null},refuse:true});t.h.action('offer');assert.deepEqual(t.calls,[['begin','OFFER_PROMISE']]);
 t=run({flow:{view:'confirm',kind:'MEET_B',target:null},steps:5});t.h.action('offer');assert.ok(!t.calls.some(([what])=>what==='confirm'));
 // Not from another view, out of the talk, or without Jail Vote's player.
 for(const [at,flow]of [[model(),{view:'kinds',kind:'MEET_B',target:null}],[model({phase:turn}),{view:'confirm',kind:'MEET_B',target:null}],[model(),{view:'confirm',kind:'JAIL_VOTE',target:null}]]){
  t=run({at,flow});t.h.action('offer');assert.deepEqual(t.calls,[],JSON.stringify(flow));
 }
 // Accept and Decline: the incoming offer's id, then confirm.
 for(const [id,type]of [['accept','ACCEPT_PROMISE'],['decline','DECLINE_PROMISE']]){
  t=run({flow:{view:'incoming',kind:null,target:null},steps:1});t.h.action(id);
  assert.deepEqual(t.calls,[['begin',type],['choose','in-1'],['confirm']],id);
  t=run({flow:{view:'list',kind:null,target:null},steps:1});t.h.action(id);assert.deepEqual(t.calls,[],`${id} from the list`);
  t=run({at:model({},{promises:[]}),flow:{view:'incoming',kind:null,target:null},steps:1});t.h.action(id);assert.deepEqual(t.calls,[],`${id} with nothing to answer`);
 }
 t=run();t.h.onIncoming();assert.equal(t.flow().view,'incoming');t.h.back();assert.equal(t.flow().view,'list');
 t=run();t.h.onFocusReturn({intent:'kind',value:'MEET_A'});assert.deepEqual(t.calls,[['focus',{intent:'kind',value:'MEET_A'}]]);
 // Once the renderer is disposed, nothing is called.
 t=run({live:false,flow:{view:'confirm',kind:'MEET_B',target:null}});
 t.h.onOffer();t.h.onKind('MEET_A');t.h.onTarget(3);t.h.onIncoming();t.h.action('offer');t.h.action('next');t.h.back();t.h.onFocusReturn({});
 assert.deepEqual(t.calls,[]);
});

test('the shell connection hands the Promises sheet\'s footer and Back to its handlers; ✕ closes it as every sheet',()=>{
 const calls=[];
 const handlers=shellHandlers({openPanel:p=>calls.push(['openPanel',p]),begin:t=>calls.push(['begin',t]),confirm:()=>calls.push(['confirm']),dismiss:()=>calls.push(['dismiss']),
  toggleView:()=>{},showBoard:()=>{},openList:()=>{},closeList:()=>calls.push(['closeList']),
  promises:{action:id=>calls.push(['promises',id]),back:()=>calls.push(['promises-back'])}});
 for(const id of ['next','back','offer','accept','decline','confirm'])handlers.onSheetAction(id,PROMISES_SHEET_ID);
 handlers.onSheetBack(PROMISES_SHEET_ID);handlers.onSheetClose(PROMISES_SHEET_ID);
 // Every other sheet's as before.
 handlers.onSheetAction('register','action-check');handlers.onSheetBack('windows');handlers.onSheetBack('action-list');
 assert.deepEqual(calls,[['promises','next'],['promises','back'],['promises','offer'],['promises','accept'],['promises','decline'],['promises','confirm'],['promises-back'],['dismiss'],
  ['confirm'],['openPanel','panels'],['closeList']]);
 // An open host sheet keeps its own.
 const hosted=[];
 const withHost=shellHandlers({openPanel:()=>{},begin:()=>{},confirm:()=>{},dismiss:()=>{},toggleView:()=>{},showBoard:()=>{},openList:()=>{},closeList:()=>{},
  host:{open:()=>true,action:id=>hosted.push(['host',id]),back:()=>hosted.push(['host-back']),close:()=>{}},promises:{action:id=>hosted.push(['promises',id]),back:()=>hosted.push(['promises-back'])}});
 withHost.onSheetAction('next',PROMISES_SHEET_ID);withHost.onSheetBack(PROMISES_SHEET_ID);
 assert.deepEqual(hosted,[['host','next'],['host-back']]);
});
