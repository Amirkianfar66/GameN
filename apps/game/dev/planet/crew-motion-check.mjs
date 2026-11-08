globalThis[Symbol.for('mothership:dev-only')]=true;
// Real consumer components with synthetic models; no authority or performance claim.
import {mountPlanetRenderer} from '../../hosted/planet/render.mjs';
import {applyPhoneKit} from '../../hosted/phone-kit.mjs';
import {createComicMotion} from '../../hosted/comic-motion.mjs';
import {disposeCrewMounts} from '../../hosted/crew-runtime.mjs';
import {makePlanetScenario} from './scenarios.mjs';
import '../../hosted/board-v2.css';
import '../../hosted/planet/planet.css';
import '../../hosted/crew-runtime.css';

export async function checkCrewMotion(){
 const failures=[],cases=[],check=(ok,message)=>{if(!ok)failures.push(message);};
 const wait=ms=>new Promise(done=>setTimeout(done,ms));
 // The reviewed reduced mode retains blinks and meaningful poses; test drift/hair only.
 const hooks='[data-crew-head],[data-crew-hang],[data-crew-back-hair]';
 const drawing=nodes=>nodes.map(n=>[...n.querySelectorAll(hooks)].map(h=>[h.getAttribute('transform'),h.getAttribute('d')])).flat();
 const dump=nodes=>JSON.stringify(drawing(nodes));
 const instances=nodes=>nodes.map(n=>({node:n,svg:n.firstElementChild,prefix:n.dataset.crewInstance}));
 const same=refs=>refs.every(({node,svg,prefix})=>node.firstElementChild===svg&&node.dataset.crewInstance===prefix);
 const owned=(root,selector='[data-crew-instance]')=>[...root.querySelectorAll(selector)];
 check(!matchMedia('(prefers-reduced-motion: reduce)').matches,'test requires OS full motion');
 document.documentElement.dataset.art='public-board player-ui roles scene-art abilities board-v2-art board-v2-motion-art board-v2-films-art';
 const root=document.createElement('div');root.className='planet-app ms-shell';document.body.append(root);
 const view=makePlanetScenario('board',{now:Date.now(),tuple:'crew'});
 const identities=view.board.seats.map((s,i)=>({seatId:s.seatId,displayName:`Crew ${i+1}`,characterId:`c${i+1}`}));
 let model={protocolVersion:3,versions:view.versions,surface:'player',mode:'synthetic',connection:'live',message:null,matchId:view.matchId,playerCount:9,round:view.round,revision:view.viewRevision,board:view.board,boardLabel:null,phase:{...view.phase,nowMs:Date.now(),remainingMs:59000,trusted:true,expired:false},offices:view.offices,talk:null,navigation:view.navigation,result:null,endReveal:null,lastTally:null,identities,panel:'board',concealed:false,activeSeatId:view.activeSeatId,ownSeatId:'seat-8',canPass:true,canMove:false,moveRooms:[],dark:false,action:null,privateArea:null,presentation:{nowMs:Date.now(),startedAt:view.phase.startedAt,endsAt:view.phase.endsAt,events:[],blackout:null,clone:null},recovery:null,motion:'full'};
 let listener;
 const controller={getModel:()=>model,subscribe(fn){listener=fn;fn(model);return()=>{listener=null;};},dismiss(){},setVisible(){},begin(){},choose(){}};
 const renderer=mountPlanetRenderer(root,controller);
 const emit=patch=>{model={...model,...patch};listener(model);};
 async function idleCase(name,nodes,toggle){
  check(nodes.length>=2,name+' missing Mira/Echo drawings');
  const refs=instances(nodes),moving=dump(nodes);await wait(150);check(dump(nodes)!==moving,name+' full motion did not advance');
  toggle(true);const neutral=dump(nodes);check(same(refs),name+' preference remounted a figure');
  await wait(200);check(dump(nodes)===neutral,name+' in-app Reduced left head/hair moving');
  toggle(false);check(same(refs),name+' full preference remounted a figure');
  const resumed=dump(nodes);await wait(150);check(dump(nodes)!==resumed,name+' full motion did not resume');
  cases.push({name,figures:nodes.length,stableInstances:same(refs)});
 }
 try{
  const board=owned(root,'.bv2-actor[data-place="world"][data-character="c8"] [data-crew-instance],.bv2-actor[data-place="world"][data-character="c9"] [data-crew-instance]');
  await idleCase('native board idle: OS full, app toggle',board,reduced=>emit({motion:reduced?'reduced':'full'}));
  // The current wire clock drives a real capsule entrance; no timer is changed by the preference.
  let start=Date.now();const talk={id:'motion-check-talk',actorSeatId:'seat-8',targetSeatId:'seat-9'};
  emit({talk,phase:{...model.phase,id:'motion-check-declare',kind:'HACK_DECLARE',startedAt:start-100,endsAt:start+9900},presentation:{...model.presentation,nowMs:start,startedAt:start-100,endsAt:start+9900}});
  start=Date.now();emit({phase:{...model.phase,id:'motion-check-result',kind:'HACK_RESULT',startedAt:start,endsAt:start+5000},presentation:{...model.presentation,nowMs:start,startedAt:start,endsAt:start+5000}});
  await wait(220);const clock=JSON.stringify(model.phase),revision=model.revision;
  emit({motion:'reduced'});const capsule=owned(root,'.bv2-capsule [data-crew-instance]'),settled=dump(capsule),rest=instances(capsule);
  await wait(200);check(capsule.length>=2,'capsule entrance had no figures');check(dump(capsule)===settled,'app Reduced during capsule movement left head/hair moving');check(same(rest),'reduced capsule kept remounting');
  emit({motion:'full'});await wait(180);check(JSON.stringify(model.phase)===clock&&model.revision===revision,'preference changed the phase or revision');
  check([...root.querySelectorAll('.bv2-capsule .bv2-actor')].every(n=>n.dataset.state==='seated'),'full motion replayed capsule entrance');
  cases.push({name:'native capsule: app Reduced during entrance, restore full without replay',figures:capsule.length,phaseUnchanged:true});
  start=Date.now();emit({talk:null,panel:'card',phase:{...model.phase,id:'motion-check-own',kind:'PRE_TURN',startedAt:start,endsAt:start+15000},presentation:{nowMs:start,startedAt:start,endsAt:start+15000,events:[],blackout:null,clone:{used:true,active:true,expiresAfterRound:7}},privateArea:{role:{name:'Alien',faction:'Alien',guide:'Synthetic motion review',device:'alien'},abilities:{},resources:{ordinaryWeapons:0,roleActionSpent:false,movementSpent:false}}});
  const clone=owned(root,'.bv2-clone-card [data-crew-instance]');
  await idleCase('private Clone idle: OS full, app toggle',clone,reduced=>emit({motion:reduced?'reduced':'full'}));
  const ward=structuredClone(view.board);
  for(const [id,slot]of [['seat-8','H1'],['seat-9','H2']])Object.assign(ward.seats.find(s=>s.seatId===id),{location:'Hospital',slotId:slot,health:'Injured',rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});
  emit({board:ward,panel:'board',privateArea:null,presentation:{...model.presentation,clone:null}});
  const patients=owned(root,'[data-film-part="critical-seat-8-body"],[data-film-part="critical-seat-9-body"]');
  await idleCase('native Hospital film figures: OS full, app toggle',patients,reduced=>emit({motion:reduced?'reduced':'full'}));
  renderer.dispose();

  const phone=document.createElement('div');phone.innerHTML='<div class="ms-board"><div class="ms-seat" data-seat="seat-1" data-character="c8"></div><div class="ms-seat" data-seat="seat-2" data-character="c9"></div></div><section data-result-id="motion-vote"><div data-phone-kit="vote-stage"></div></section>';document.body.append(phone);
  const facts=[1,2].map(n=>({seatId:`seat-${n}`,health:'Healthy',location:'Room A',isActive:false}));
  let phoneModel={screen:'match',motion:'full',match:{versions:view.versions,board:{zones:[{id:'room-a',seats:facts}]},voteResult:{id:'motion-vote',outcome:'RUNOFF_REQUIRED',selectedSeatId:null,tiedSeatIds:['seat-1','seat-2'],eligibleVoterCount:2,counts:[{seatId:'seat-1',votes:1},{seatId:'seat-2',votes:1}]}}};
  applyPhoneKit(phone,phoneModel);
  await idleCase('phone kit cached result: OS full, app toggle',owned(phone),reduced=>{phoneModel={...phoneModel,motion:reduced?'reduced':'full'};applyPhoneKit(phone,phoneModel);});
  disposeCrewMounts(phone);phone.remove();

  const travel=document.createElement('div'),fx=document.createElement('div');
  travel.innerHTML='<div class="ms-board"><div class="ms-seat" data-seat="seat-1" data-character="c8" data-gesture="stand" data-outfit="crew" data-mirror="false"><span class="ms-token" data-figure="c8|stand|crew" style="position:fixed;left:20px;top:200px;width:70px;height:70px"></span></div></div>';
  document.body.append(travel,fx);const motion=createComicMotion(travel,{fx});
  const travelModel=(room,pref='full')=>({screen:'match',connection:'live',motion:pref,match:{versions:view.versions,phase:{roundLabel:'Round 6',phaseLabel:'Turn'},roster:{zones:[{id:room,seats:[{seatId:'seat-1',health:'Healthy',jailed:false,captain:false,isActive:false,markers:[]}]}]}}});
  motion.after(travelModel('room-a'),motion.before());const before=motion.before();travel.querySelector('.ms-token').style.left='200px';motion.after(travelModel('room-b'),before);
  await wait(150);check(fx.querySelector('[data-crew-instance]')!==null,'travel did not mount the new crew');
  motion.after(travelModel('room-b','reduced'),motion.before());check(fx.children.length===0,'app Reduced retained a travel flyer');check(travel.querySelector('[data-moving]')===null,'app Reduced kept the playable figure hidden');
  const replay=motion.after(travelModel('room-b'),motion.before());await wait(100);check(replay.length===0&&fx.children.length===0,'full preference replayed travel');
  motion.dispose();travel.remove();fx.remove();cases.push({name:'native travel: app Reduced during flight, restore full without replay',playableFigureVisible:true});
  check(document.querySelectorAll('.crew-shared-art').length===0,'consumer disposal retained shared heads');
 }finally{renderer.dispose();root.remove();}
 return {scope:'Real native consumer components under synthetic models, OS full motion and in-app Reduced toggles. Desktop only; no release-build or phone-performance acceptance.',cases,failures};
}
