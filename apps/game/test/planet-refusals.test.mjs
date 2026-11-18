import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import {planetRegistrationText} from '@mothership/presentation';
import {PHASE_CLOSED_WORDS,SENDING_WORDS,refusalStatus,refusalWords} from '../hosted/planet/refusal-words.mjs';
import {actionsCancel,actionsFlow,actionsFrame,actionsPart,actionsRefusal,holdActionsPick} from '../hosted/planet/actions-input.mjs';
import {PROMISES_START,promisesFlow,promisesInput,promisesRefusal,withoutRefusal} from '../hosted/planet/promises-input.mjs';
import {checkActionCheck} from '../../../design/phone-ui/components/actions/actions.mjs';
import {PROMISES_DEFAULTS,nextPromisesInput} from '../../../design/phone-ui/components/promises/promises.mjs';
import {planetView,rig} from './planet-support.mjs';

// A refused command's words in the open sheet (R2 with A3; the Lead's approval of 18 November 2026, and the owner's
// for its look). The controller gives no structured refusal, so the connection reads the model's message, verbatim,
// and leaves out only Frontend's own words for a command sending or registered and for a phase the server closed
// (refusal-words.mjs). Those are pinned here against the real controller (the Lead's note 1): a change of Frontend's
// words fails this file before a note could show them. R6, a structured refusal, replaces this reading of words.

/** The server's receipt for a request: accepted, or refused with one of its codes (PlanetReceiptSchema). */
const receipt=(request,code=null)=>({receipt:{protocolVersion:3,matchId:request.matchId,phaseId:request.phaseId,commandId:request.commandId,
 ...(code?{status:'rejected',code}:{status:'accepted',code:'REGISTERED'})},serverTimeMs:1000});
/** The rig's transport answering one command only when told to, so the step while it sends can be seen. */
function held(r){
 let answer=null;
 r.transport.command=request=>{r.sent.push(structuredClone(request));return new Promise(done=>{answer=code=>done(receipt(request,code));});};
 return code=>answer(code);
}
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
/**
 * The Hacker's Move to B5 in Room B on the real controller, through the connection's own flow as the phone holds it:
 * each model the controller paints, and the position held before its choose (render.mjs's tap).
 */
function moveToB5(r){
 let flow=null;
 r.controller.openPanel('actions');
 r.controller.begin('MOVE');flow=actionsFlow(flow,r.read());
 r.controller.choose('Room B');flow=actionsFlow(flow,r.read());
 flow=holdActionsPick(flow,r.read(),{slot:'B5'});
 r.controller.choose('B5');flow=actionsFlow(flow,r.read());
 return flow;
}

test('Frontend\'s words the connection leaves out are the real controller\'s: sending, registered and phase closed',async()=>{
 // Sending: the controller's message and the model's sending prompt.
 const sending=rig(planetView(),{reply:'never'});await sending.controller.start();
 moveToB5(sending);void sending.controller.confirm();await settle();
 assert.equal(sending.read().action.step,'sending');
 assert.equal(sending.read().message,SENDING_WORDS);
 assert.equal(sending.read().action.prompt,SENDING_WORDS);
 assert.equal(refusalWords(sending.read(),'MOVE'),null);
 sending.controller.dispose();

 // Registered: Frontend's exported words, the message once the server accepts.
 const accepted=rig(planetView());await accepted.controller.start();
 moveToB5(accepted);await accepted.controller.confirm();
 assert.equal(accepted.read().message,planetRegistrationText('MOVE'));
 assert.equal(refusalWords({...accepted.read(),action:null},'MOVE'),null,'a registration is never a refusal, with or without its action');
 accepted.controller.dispose();

 // The server closed the phase: the shell's to say, never a note in the sheet (the Lead's note 2).
 const closed=rig(planetView());await closed.controller.start();
 const answer=held(closed);moveToB5(closed);const sent=closed.controller.confirm();await settle();answer('PHASE_CLOSED');await sent;
 assert.equal(closed.read().action,null);
 assert.equal(closed.read().message,PHASE_CLOSED_WORDS);
 assert.equal(refusalWords(closed.read(),'MOVE'),null);
 closed.controller.dispose();
});

test('the server\'s refusal of this phone\'s Register holds its check, with the model\'s words and Register off',async()=>{
 const r=rig(planetView());await r.controller.start();
 const answer=held(r);let flow=moveToB5(r);
 assert.equal(flow.stage,'checking');assert.equal(flow.slot,'B5');
 const check=actionsPart(r.read(),{frame:actionsFrame(r.read(),{flow}),flow});
 assert.equal(checkActionCheck(check.input).position.slot,'B5');
 const sent=r.controller.confirm();await settle();
 flow=actionsFlow(flow,r.read());assert.equal(flow.stage,'sent');
 answer('NOT_ALLOWED');await sent;
 const model=r.read();
 assert.equal(model.action,null);assert.equal(model.recovery,null);
 const words=model.message;
 assert.ok(typeof words==='string'&&words.trim()&&![SENDING_WORDS,PHASE_CLOSED_WORDS,planetRegistrationText('MOVE')].includes(words));
 assert.equal(refusalWords(model,'MOVE'),words,'verbatim: the model\'s own words');

 flow=actionsFlow(flow,model);
 assert.deepEqual({stage:flow.stage,refusal:flow.refusal,refusedAt:flow.refusedAt,slot:flow.slot},{stage:'refused',refusal:words,refusedAt:model.revision,slot:'B5'});
 assert.equal(actionsRefusal(flow),words);
 assert.equal(actionsFlow(flow,model),flow,'held while the model is the same');
 const frame=actionsFrame(model,{flow});
 assert.equal(frame.kind,'action-check');
 assert.deepEqual(frame.actions.map(a=>[a.id,a.enabled??true,!!a.busy]),[['cancel',true,false],['register',false,false]],'Cancel stays local; Register is off');
 const part=actionsPart(model,{frame,flow});
 assert.equal(part.key,check.key,'the same check, kept by its key');
 assert.deepEqual(part.input.error,{text:words});
 assert.deepEqual(checkActionCheck(part.input).error,{text:words,detail:null},'the component takes it');
 assert.equal(actionsCancel(model,{where:'check',flow}),'tiles','Cancel returns to the tiles');
 assert.equal(actionsCancel(model,{where:'check',flow:null}),null,'with nothing refused there is no check to cancel');
 assert.equal(r.sent.length,1,'nothing sent again');

 // The session reads the same view again (every 2 s), and the controller clears its message: the words stay.
 r.push(planetView());
 assert.equal(r.read().message,null);assert.equal(r.read().revision,model.revision);
 assert.equal(actionsFlow(flow,r.read()),flow,'a re-read of the same view keeps them');
 assert.deepEqual(actionsPart(r.read(),{frame:actionsFrame(r.read(),{flow}),flow}).input.error,{text:words});
 // They go with the next view.
 const next=planetView();next.viewRevision=2;r.push(next);
 assert.equal(r.read().message,null);
 assert.equal(actionsFlow(flow,r.read()),null);
 assert.equal(actionsFrame(r.read(),{flow:null}).kind,'actions','the tiles again');
 r.controller.dispose();
});

test('a refused check goes with a phase change, the phase\'s end, a hidden phone, other words, the next view, a lost connection and Outcome unknown',async()=>{
 const r=rig(planetView());await r.controller.start();
 const answer=held(r);let flow=moveToB5(r);const sent=r.controller.confirm();await settle();
 flow=actionsFlow(flow,r.read());answer('NOT_ALLOWED');await sent;
 const model=r.read();flow=actionsFlow(flow,model);assert.equal(flow.stage,'refused');
 assert.equal(actionsFlow(flow,{...model,phase:{...model.phase,id:'phase-7-turn'}}),null,'another phase');
 assert.equal(actionsFlow(flow,{...model,phase:{...model.phase,expired:true}}),null,'its time up');
 assert.equal(actionsFlow(flow,{...model,concealed:true}),null,'the phone put away');
 assert.equal(actionsFlow(flow,{...model,message:'Another message.'}),null,'other words');
 assert.equal(actionsFlow(flow,{...model,message:null}),flow,'not a re-read of the same view');
 assert.equal(actionsFlow(flow,{...model,message:null,connection:'stale'}),null,'a connection not live');
 assert.equal(actionsFlow(flow,{...model,recovery:{status:'unknown',canCheck:true,canRetry:true}}),null,'Outcome unknown');
 assert.equal(actionsFlow(flow,{...model,revision:model.revision+1}),null,'another view');
 // Only a sent Register is read: the same words after a choice still being made are the status line's.
 assert.equal(actionsFlow({...flow,stage:'checking'},model),null);
 assert.equal(refusalWords({...model,connection:'stale'},'MOVE'),null,'not while the connection is not live');
 assert.equal(refusalWords({...model,recovery:{status:'unknown',canCheck:true,canRetry:true}},'MOVE'),null,'Outcome unknown is Actions\' own part');
 r.controller.setVisible(false);assert.equal(actionsFlow(flow,r.read()),null);
 r.controller.dispose();
});

// Promises: the phone's own Offer, Accept or Decline, seen under way (`sent`), then gone from the model with words.
const seat=(n,location)=>({seatId:`seat-${n}`,location,slotId:null,health:'Healthy',jailed:false});
const identities=[1,2,3,4,5,6,7,8,9].map(n=>({seatId:`seat-${n}`,characterId:`c${n}`,displayName:`Crew ${n}`}));
const offer=(type,targets=[],promiseTargets=[])=>({type,targetSeatIds:targets,slotIds:[],windowIds:[],promiseTargetSeatIds:promiseTargets});
/** Crew 4's phone in the 60 s talk with Crew 1, on Promises' terms, with nothing chosen on the controller. */
function talk(over={}){
 return {surface:'player',matchId:'match-1',ownSeatId:'seat-4',versions:{...PLANET_BLACKOUT_PINS,assetManifestVersion:'design-0.8.0'},playerCount:9,connection:'live',message:null,
  concealed:false,dark:false,round:3,revision:7,boardLabel:null,phase:{id:'talk-1',kind:'HACK',startedAt:0,endsAt:60000,nowMs:1000,remainingMs:59000,trusted:true,expired:false},
  activeSeatId:null,offices:{captainSeatId:null,officerSeatId:null,blockedSeatId:null},board:{seats:[1,2,3,4,5,6,7,8,9].map(n=>seat(n,n<5?'Room A':'Room B'))},identities,
  talk:{id:'talk',actorSeatId:'seat-4',targetSeatId:'seat-1'},lastTally:null,panel:'promises',action:null,canPass:false,canMove:false,moveRooms:[],canVote:false,ownBallot:null,
  promiseOfferCount:0,recovery:null,food:null,
  privateArea:{promises:[],promiseQuota:{given:false,received:false},offers:[offer('OFFER_PROMISE',['seat-1'],['seat-1','seat-3'])]},...over};
}
const terms={view:'confirm',kind:'MEET_B',target:null};
const sendingOffer={type:'OFFER_PROMISE',label:'Offer Promise',step:'sending',selected:[],choices:[],prompt:SENDING_WORDS,confirmation:null,canConfirm:false};

test('Promises: this phone\'s own refused command keeps its terms with the model\'s words, and only then',()=>{
 const refused='The server did not allow that command.';
 const under=promisesFlow({...terms,sent:'OFFER_PROMISE'},talk({action:sendingOffer,message:SENDING_WORDS}));
 assert.deepEqual(under,{...terms,sent:'OFFER_PROMISE'},'under way: no words yet');
 const flow=promisesFlow(under,talk({message:refused}));
 assert.deepEqual(flow,{...terms,error:refused,errorAt:7});
 assert.equal(promisesRefusal(flow),refused);
 const input=promisesInput(talk({message:refused}),{flow});
 assert.equal(input.error,refused);assert.equal(input.view,'confirm');
 assert.equal(nextPromisesInput(PROMISES_DEFAULTS,input).error,refused,'the component takes it');
 assert.deepEqual(promisesFlow(flow,talk({message:refused})),flow,'held while the model is the same');
 // Frontend's own words, a lost connection and Outcome unknown are not refusals; nor words with no send of this phone's.
 for(const message of [PHASE_CLOSED_WORDS,planetRegistrationText('OFFER_PROMISE'),SENDING_WORDS,'',null])
  assert.deepEqual(promisesFlow(under,talk({message})),terms,`not a refusal: ${message}`);
 assert.deepEqual(promisesFlow(under,talk({message:refused,connection:'stale'})),terms);
 assert.deepEqual(promisesFlow(under,talk({message:refused,recovery:{status:'unknown',canCheck:true,canRetry:true}})),terms);
 assert.deepEqual(promisesFlow(terms,talk({message:refused})),terms,'no send of this phone\'s');
 // Accepted: the list, as before.
 assert.deepEqual(promisesFlow(under,talk({action:{...sendingOffer,step:'accepted',prompt:planetRegistrationText('OFFER_PROMISE')}})),PROMISES_START);
});

test('Promises: the words go with the next view, other words, a new choice, the player\'s next tap, the talk and a hidden phone',()=>{
 const refused='The server did not allow that command.';
 const flow=promisesFlow({...terms,sent:'OFFER_PROMISE'},talk({message:refused}));
 assert.equal(flow.error,refused);
 assert.deepEqual(promisesFlow(flow,talk({message:refused,revision:8})),terms,'the next view');
 assert.deepEqual(promisesFlow(flow,talk({message:'Other words.'})),terms,'other words');
 assert.deepEqual(promisesFlow(flow,talk({message:null})),flow,'a re-read of the same view keeps them');
 assert.deepEqual(promisesFlow(flow,talk({message:null,revision:8})),terms,'and the next view takes them');
 assert.deepEqual(promisesFlow(flow,talk({message:refused,connection:'stale'})),terms,'a connection not live');
 assert.deepEqual(promisesFlow(flow,talk({message:null,recovery:{status:'unknown',canCheck:true,canRetry:true}})),terms,'Outcome unknown');
 const choosing={type:'ACCEPT_PROMISE',label:'Accept Promise',step:'promise',selected:[],choices:[],prompt:'',confirmation:null,canConfirm:false};
 assert.equal(promisesFlow(flow,talk({message:refused,action:choosing})).error,undefined,'a new choice on the controller');
 assert.deepEqual(withoutRefusal(flow),terms,'the next tap (render.mjs: go, sending and calm)');
 assert.equal(promisesFlow({...flow,view:'kinds'},talk({message:refused})).error,undefined,'a view with no footer for it');
 assert.deepEqual(promisesFlow(flow,talk({message:refused,phase:{...talk().phase,kind:'ORDINARY_TURN',id:'turn-2'},talk:null})),PROMISES_START,'the talk over');
 assert.equal(promisesFlow(flow,talk({message:refused,concealed:true})),null,'the phone put away');
 assert.equal(promisesFlow(flow,talk({message:refused,phase:{...talk().phase,expired:true}})),null,'the talk\'s time up');
 // Accept or Decline, refused in the incoming view, keep that view.
 const incoming=talk({privateArea:{...talk().privateArea,promises:[{id:'in-1',giverSeatId:'seat-1',recipientSeatId:'seat-4',kind:'MEET_A',targetSeatId:null,round:3,electionId:null,
  accepted:false,status:'Pending',offerStatus:'offered'}]}});
 const answered=promisesFlow({view:'incoming',kind:null,target:null,sent:'ACCEPT_PROMISE'},{...incoming,message:refused});
 assert.deepEqual(answered,{view:'incoming',kind:null,target:null,error:refused,errorAt:7});
});

test('the status line says a refusal\'s words once: still while the sheet shows them, and after while they are the same message',()=>{
 const words='The server did not allow that command.',at={message:words,revision:7},said={words,revision:7};
 // The sheet shows them: the line keeps still.
 assert.deepEqual(refusalStatus(null,at,words),{said,quiet:true});
 assert.deepEqual(refusalStatus(null,{...at,message:null},words),{said,quiet:false},'held through a read: the line has nothing to say');
 // The sheet no longer shows them (Back, Cancel, a tab): still while the message is those words in that view.
 assert.deepEqual(refusalStatus(said,at,null),{said,quiet:true});
 // Once the message or the view moves on, the same words again are new, and the line says them: a new send says
 // "Registering…" first, a read of the view clears the message, a new view is another revision.
 for(const moved of [{...at,message:SENDING_WORDS},{...at,message:null},{...at,revision:8},{...at,message:'Other words.'}])
  assert.deepEqual(refusalStatus(said,moved,null),{said:null,quiet:false},JSON.stringify(moved));
 assert.deepEqual(refusalStatus(null,at,null),{said:null,quiet:false},'words no sheet showed: the line says them');
 // Through a sequence: shown, Back, a Pass sent and refused with the same words in the same view.
 let state=refusalStatus(null,at,words);
 state=refusalStatus(state.said,at,null);assert.equal(state.quiet,true,'after Back');
 state=refusalStatus(state.said,{...at,message:SENDING_WORDS},null);assert.equal(state.quiet,false,'the Pass sends');
 state=refusalStatus(state.said,at,null);assert.equal(state.quiet,false,'its refusal is said');
});
