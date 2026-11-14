import {createFoodHoldInput} from '@mothership/game';
import {foodTaskRevisionBody} from '@mothership/contracts';
import {foodPackageCount,foodPackagesText} from '@mothership/presentation';
import {crewPortraitVariable} from '../crew-runtime.mjs';
import {createFoodUi} from './food-ui.mjs';
import {foodDisplay,foodControlSub} from './food-display.mjs';
import {foodSceneSvg} from './food-scene.mjs';
import {foodPoseAt,FOOD_CUES} from './food-pose.mjs';
import {TAGS,BOXES,VIEW} from './food-geometry.mjs';
import {withFoodGauge} from './food-gauge.mjs';
import {fitFoodTags} from './food-tags.mjs';
import './food-kit.css';
import './food.css';
import './food-host.css';

/** The native Food surface. It consumes one own-seat controller, public identity
 * and the same-response ordinary board. No review navigation or Task simulator. */
export function mountFoodRenderer(root,controller,{identities=()=>[],ordinary=()=>null,assets=null,preferences=()=>({reduced:false}),navigate=()=>{},settings=()=>{},exclusive=()=>{},surface=()=>{},boardMode=()=> 'room',bars=()=>({top:0,bottom:0})}={}){
 const document=root.ownerDocument,win=document.defaultView;
 const ui=createFoodUi(document,{portrait:(character,{size=36,alt=''})=>{
  const node=document.createElement('span');node.className='pt food-portrait';node.style.width=`${size}px`;node.style.height=`${size}px`;
  node.style.setProperty('--food-portrait',crewPortraitVariable(character,controller.getModel().view?.versions));
  if(alt){node.setAttribute('role','img');node.setAttribute('aria-label',alt);}else node.setAttribute('aria-hidden','true');return node;
 }});
 const {h,ic,topBar,tabs,pill,toast,banner,button,row,list,groupLabel,groupNote,sheet}=ui;
 const frame=h('div.planet-food.ph');root.classList.add('planet-food-host');root.append(frame);
 const person=seatId=>{const identity=identities().find(x=>x.seatId===seatId);return {seat:Number(seatId?.slice(5)??0),name:identity?.displayName??`Player ${seatId?.slice(5)??''}`,character:identity?.characterId??null,seatId};};
 const name=id=>person(id).name;
 const room=()=>ordinary()?.board?.seats.find(s=>s.seatId===controller.getModel().view?.seatId)?.location??null;
 let model=controller.getModel(),disposed=false,raf=null,screen=null,selected=null,taskId=null,taskNodes=null,lastStructure=null,lastHeader=null,lastFrame=-Infinity;
 let closedRequests=new Set(),activeRequest=null,lastFoodStock=null,stockToast=null,stockToastIcon='supply',hadTask=null;
 let lastFlowKey=null,feedbackSeen=null,feedbackShownAt=null,lastStepId=undefined;
 const panelKeys=new Set();
 const hold=createFoodHoldInput({down:()=>controller.holdDown(),up:()=>controller.holdUp(),held:()=>controller.getModel().physicalHolding||controller.getModel().needsContactOff});
 const put=(node,text)=>{if(node.textContent!==String(text))node.textContent=String(text);};
 const attr=(node,key,value)=>{if(value===null||value===false||value===undefined)node.removeAttribute(key);else node.setAttribute(key,value===true?'':String(value));};
 function replace(parent,...nodes){const focus=document.activeElement?.id;parent.replaceChildren(...nodes.flat().filter(Boolean));if(focus)parent.querySelector(`#${win.CSS.escape(focus)}`)?.focus({preventScroll:true});}
 function snapshotTime(){const clock=controller.getModel().clock;return clock.status==='synced'?clock.serverNowMs:null;}
 function focusCard(){const card=frame.querySelector('.fs-card,.sheet');if(card){card.tabIndex=-1;card.focus({preventScroll:true});}}
 function close(){screen=null;selected=null;lastStructure=null;render();}
 const actButton=(label,act,options={})=>{const node=button(label,options);node.dataset.food=act;node.id=`food-action-${act}`;return node;};
 function sourceHeader(v,now){
  const t=v?.task,step=model.view?.step;
  if(t){const own=person(model.view.seatId),them=person(v.partnerSeatId),sub=v.partner==='offline'?`${them.name} is offline`:v.partner==='down'?`${them.name} is out`:`Food Supply · you run the ${v.role==='winch'?'Winch':'Panel'}`;
   const node=topBar({kind:'pair',pair:[own,them],sub,seconds:v.phase==='ended'?null:v.secondsLeft,urgentAt:10,menu:{go:'food:settings'}});
   if(v.partner!=='alive')node.dataset.partner=v.partner;node.querySelector('[data-tb="menu"]').id='food-settings';return withFoodGauge(ui,node,model.view.stock.doses);
  }
  if(step){const seconds=now===null?null:Math.max(0,Math.ceil(((step.kind==='ASKING'?step.askingEndsAt:step.returnsAt)-now)/1000));
   const node=topBar({kind:'phase',icon:'supply',title:'Food Supply',sub:step.kind==='ASKING'?'Who goes for food?':'The turns start after it',seconds,round:model.view.round,promises:{go:'food:promises',badge:ordinary()?.promiseOfferCount??0},menu:{go:'food:settings'}});node.querySelector('[data-tb="menu"]').id='food-settings';return withFoodGauge(ui,node,model.view.stock.doses);}
  const ordinaryModel=ordinary(),active=ordinaryModel?.activeSeatId;
  const node=topBar({kind:active?'turn':'phase',who:active?person(active):null,self:active===model.view?.seatId,title:`Round ${model.view?.round??''}`,
   sub:ordinaryModel?.phase?.kind==='PRE_TURN'?'Pre-turn':'',seconds:ordinaryModel?.phase?.remainingMs===null?null:(ordinaryModel?.phase?.remainingMs??0)/1000,round:model.view?.round,promises:{go:'food:promises',badge:ordinaryModel?.promiseOfferCount??0},menu:{go:'food:settings'}});
  node.querySelector('[data-tb="menu"]').id='food-settings';return withFoodGauge(ui,node,model.view.stock.doses);
 }
 function updateHeader(v,now){
  const stamp=JSON.stringify([v?.role,v?.partner,v?.phase,v?.secondsLeft,model.view?.step?.kind,model.view?.round,model.view?.stock.doses,now===null?null:Math.ceil(now/1000),identities()]);
  if(stamp===lastHeader)return;lastHeader=stamp;const old=frame.querySelector(':scope > .tb'),node=sourceHeader(v,now),focus=document.activeElement?.id;
  if(old)old.replaceWith(node);else frame.prepend(node);if(focus==='food-settings')node.querySelector('#food-settings')?.focus({preventScroll:true});
 }
 function taskSkeleton(task){
  hold.releaseAll();taskId=task.taskId;screen=null;selected=null;lastStructure=null;lastHeader=null;replace(frame);
  const art=h('div.fs-art'),view=h('div.fs-view',{role:'img'},art),hintText=h('span'),hintIcon=ic('info',{filled:true});
  const hint=h('p.fs-hint',{role:'status','aria-live':'polite'},hintIcon,hintText);
  const controls=h('div.fs-controls',{role:'group','aria-label':`${task.selfControl==='WINCH'?'Winch':'Panel'} controls`});
  const role=h('div.fs-role'),instrument=h('div.food-instrument'),dock=h('div.fs-dock',instrument,controls),panel=h('section.fs-panel',{'aria-label':'Your controls'},role,hint,dock);
  const body=h('div.fs-screen',view,panel),cards=h('div.food-cards'),notices=h('div.food-notices');frame.append(body,cards,notices);
  taskNodes={art,view,role,hint,hintIcon,hintText,controls,instrument,body,cards,notices,buttons:new Map(),cardKey:null,artKey:null,roleKey:null,instrumentKey:null};
 }
 function control(b,v){
  const id=b.act==='release'||b.act==='lock'?'food-panel-main':`food-control-${b.act}`;
  let node=taskNodes.buttons.get(id);if(!node){node=h('button.fs-ctl',{type:'button',id});taskNodes.buttons.set(id,node);taskNodes.controls.append(node);}
  const f=model.feedback,sending=f?.status==='sending'&&(b.act==='hold'?['Hold','let-go'].includes(f.name):f.name==={key:'key',release:'RELEASE',lock:'LOCK'}[b.act]);
  const sub=foodControlSub(b,v,{sending}),blocked=b.act!=='hold'&&(model.pendingCount>0||f?.status==='unknown');
  const enabled=b.enabled&&!blocked,signature=JSON.stringify([b.label,sub,b.act,b.turned,b.pending]);
  if(node.dataset.face!==signature){node.dataset.face=signature;
   const icon=b.act==='hold'?b.pending?ic('hourglass',{filled:true}):h('span',{html:'<svg class="arrow" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 4 L30 22 H22 V30 H12 V22 H4 Z" fill="currentColor" stroke="#0A0D14" stroke-width="2" stroke-linejoin="round"/></svg>'}):ic(b.act==='key'?b.turned?'check':'key':b.act,{filled:true});
   replace(node,h('span.fs-face',icon,h('span.fs-label',b.label,h('span.fs-sub',sub))));
  }
  node.hidden=false;node.dataset.act=b.act;attr(node,'aria-label',`${b.label}. ${b.hazard?`Warning: ${sub}`:sub}.`);
  attr(node,'aria-disabled',enabled?null:'true');attr(node,'aria-busy',sending?'true':null);attr(node,'aria-pressed',b.act==='hold'?String(!!(b.holding||b.pending)):null);
  for(const [key,value]of Object.entries({'data-next':enabled&&b.next,'data-hazard':enabled&&b.hazard,'data-key':b.act==='key'&&!b.turned,'data-turned':b.turned,'data-holding':b.act==='hold'&&b.holding,'data-pending':b.act==='hold'&&b.pending,'data-sending':sending}))attr(node,key,value?true:null);
  attr(node,'data-zone',b.act==='hold'&&b.holding?b.zone:null);return id;
 }
 function instrument(v){
  if(v.crate.state==='landed'||v.phase==='ended')return null;
  if(v.role==='panel')return h('div.fs-strip',{'aria-hidden':'true','data-locked':v.panel.locked?'':null},
   ...Array.from({length:7},(_,s)=>h('span',{'data-goal':s===v.goal?'':null,'data-cut':s===6?'':null,'data-you':s===4?'':null,'data-at':v.panel.locked&&v.panel.stop===s?'':null,'data-now':!v.panel.locked&&v.panel.stop===s?'':null},s===4?ic('self',{filled:true}):h('b',String(s+1)))),
   h('i.fs-marker',{style:{left:`${(v.panel.at+.5)/7*100}%`}}));
  const f=x=>Math.max(0,Math.min(1,(x-3.2)/3))*100,band=(centre,half)=>({left:`${f(centre-half)}%`,width:`${f(centre+half)-f(centre-half)}%`});
  return h('div.fs-meter-wrap',{'aria-hidden':'true'},h('div.fs-meter',{'data-live':v.crate.state==='hanging'&&v.crate.holder==='winch'&&v.panel.locked?'':null},
   h('span.fs-zone',{'data-zone':'console',style:band(4,.42)}),h('span.fs-zone',{'data-zone':'platform',style:band(5,.3)}),h('i.fs-crate',{style:{left:`${f(v.crate.x)}%`},'data-out':v.crate.x<3.2||v.crate.x>6.2?'':null})),
   h('p.fs-legend',h('span',{'data-zone':'console'}),`Over ${name(v.task.panelSeatId)}`,h('span',{'data-zone':'platform'}),'Over the platform'));
 }
 function taskCard(v,now){
  const t=v.task,own=t.people.find(p=>p.seatId===model.view.seatId),where=t.ownReturnPlacement?.location??null,location=where?` ${where}`:'';
  if(t.stage==='BRIEFING'){
   const lines=v.role==='winch'?['Hold it up. Let go over 6.',`Over ${v.partnerName}, it falls on ${v.partnerName}.`]:['Release it, then lock it at 6.',`LOCK at 7 cuts ${v.partnerName}.`];
   return {key:'briefing',node:h('section.fs-card.fs-brief',{role:'dialog','aria-label':`You run the ${v.role==='winch'?'Winch':'Panel'}`,style:{top:'calc(var(--top) + 16px)',maxHeight:'calc(100% - var(--top) - 28px)'}},
    h('h2',`You run the ${v.role==='winch'?'Winch':'Panel'}`),h('ul',h('li',ic(v.role==='winch'?'move':'lock',{filled:true}),h('span',lines[0])),h('li',ic('warning',{filled:true}),h('span',lines[1]))),
    h('div',{style:{display:'flex',alignItems:'baseline',gap:'10px'}},h('span.fs-count',String(v.briefingLeft)),h('p','Starting')))};
  }
  const unsettled=t.people.some(p=>p.death&&now-p.death.at<FOOD_CUES.impact);if(unsettled)return null;
  let title,stamp,tone=null,body;
  if(own?.death){title='You are out';stamp='Eliminated';const how=own.death.mechanism==='CUT'?"The panel's blade came down into your cab.":'The crate fell on you.';
   body=[h('p',`${how} Not the Hospital: you are out of the match.`),h('p',`You return to${location} as you fell.`)];
  }else if(t.outcome){const o=t.outcome,back=h('p',`You go back to${location} at the end of the Task's time.`);
   if(o.kind==='DELIVERED'){title='Delivered';stamp=`+${o.dosesAdded/2} packages`;tone='accent';body=[h('p',"The crate went down to the galley. The ship's food stock rises by five."),back];}
   else if(o.kind==='CANCELLED'){title='Task cancelled';stamp='Cancelled';body=[h('p',o.disconnectedSeatId===model.view.seatId?'You lost your connection. Nothing was delivered.':`${name(o.disconnectedSeatId)} lost their connection. Nothing was delivered.`),back];}
   else {title='Task lost';stamp='Lost';body=[h('p',({TIME:'The time ran out before the crate went down.',CRATE_BROKEN_NO_FETCHER:'The crate broke, and no one was left to fetch another.',NOT_OVER_PLATFORM:'The crate was not over the platform.'})[o.reason]),back];}
  }else return null;
  return {key:JSON.stringify([title,stamp,body.map(n=>n.textContent)]),node:h('section.fs-card',{role:'alertdialog','aria-label':title,style:{top:'calc(var(--top) + 24px)',maxHeight:'calc(100% - var(--top) - 36px)'}},h('span.stamp.fs-stamp',{'data-tone':tone},stamp),h('h2',title),body)};
 }
 function updateTask(v,now,reduced){
  if(taskId!==v.task.taskId||!taskNodes)taskSkeleton(v.task);frame.dataset.screen='food-task';updateHeader(v,now);
  const nodes=taskNodes,top=frame.querySelector('.tb').offsetHeight;nodes.body.style.top=`${top}px`;nodes.view.style.flexBasis=`${Math.round(frame.clientWidth*VIEW[3]/VIEW[2])}px`;
  const roleKey=JSON.stringify([v.role,v.partner,identities()]);
  if(roleKey!==nodes.roleKey){nodes.roleKey=roleKey;replace(nodes.role,pill(`${v.role==='winch'?'Winch':'Panel'} · ${v.role==='winch'?'up and down':'left and right'}`,{icon:v.role==='panel'?'lock':'move',tone:'accent'}),
   h('span.fs-who',{'data-state':v.partner},h('b',`${person(v.partnerSeatId).seat} ${v.partnerName}`),` · ${v.partnerRole==='winch'?'Winch':'Panel'}${v.partner==='down'?' · Out':v.partner==='offline'?' · Offline':''}`));}
  nodes.controls.dataset.role=v.role;attr(nodes.controls,'data-landed',v.crate.state==='landed'?'':null);
  put(nodes.hintText,v.hint.text);if(nodes.hint.dataset.icon!==v.hint.icon){const icon=ic(v.hint.icon,{filled:true});nodes.hintIcon.replaceWith(icon);nodes.hintIcon=icon;nodes.hint.dataset.icon=v.hint.icon;}nodes.hint.dataset.tone=v.hint.tone;
  const liveIds=new Set(v.buttons.map(b=>control(b,v)));for(const [id,node]of nodes.buttons)node.hidden=!liveIds.has(id);
  replace(nodes.instrument,instrument(v));
  const pose=foodPoseAt(v.task,now,{reduced,guide:v.guide}),art=h('span',{html:foodSceneSvg(pose,{assets,characters:{winch:person(v.task.winchSeatId).character,panel:person(v.task.panelSeatId).character},prefix:'food-native'})});
  replace(nodes.art,...art.childNodes);attr(nodes.view,'data-dim',pose.dim>.5?'':null);
  for(const role of ['winch','panel']){const seatId=role==='winch'?v.task.winchSeatId:v.task.panelSeatId,who=person(seatId),status=v.task.people.find(x=>x.seatId===seatId),[tx,ty]=TAGS[role],x=role==='winch'?BOXES.cab[0]+BOXES.cab[2]-6:tx;
   nodes.art.append(h('span.tag',{'data-self':role===v.role?'':null,'data-anchor':role==='winch'?'end':null,style:{left:`${(x-VIEW[0])/VIEW[2]*100}%`,top:`min(${(ty-14-VIEW[1])/VIEW[3]*100}%, calc(100% - 30px))`}},
    h('b.num',String(who.seat)),h('span',role===v.role?'You':who.name),!status.alive?h('span.status','· Out'):role!==v.role&&!status.online?h('span.status','· Offline'):null));}
  fitFoodTags(nodes.art,nodes.view);
  const panelDescription=v.panel.locked?`The panel is locked at stop ${v.panel.stop+1}.`:`The panel is clicking along the rail, now at stop ${v.panel.stop+1}.`;
  nodes.view.setAttribute('aria-label',`The Supply Room. ${panelDescription} ${v.crate.state==='intake'?'A crate waits in the intake.':v.crate.state==='landed'?'The crate is on the platform.':v.crate.state==='sent'?'The crate has gone down.':`${v.crate.holder==='winch'?'The Winch':'The brake'} holds the crate up, now over stop ${Math.round(v.crate.x)+1}.`}${v.broken?` ${v.broken} crates have broken.`:''}${v.warnings.length?' Warning shown.':''}`);
  const card=taskCard(v,now),cardChanged=(card?.key??null)!==nodes.cardKey;
  if(cardChanged){nodes.cardKey=card?.key??null;replace(nodes.cards,card?.node);if(card)focusCard();else if(document.activeElement===document.body)nodes.controls.querySelector('button:not([hidden])')?.focus({preventScroll:true});}
  else if(card?.key==='briefing'){put(nodes.cards.querySelector('.fs-count'),v.briefingLeft);}
  nodes.controls.inert=!!card;
  const notices=[];const stop=v.recent.find(e=>e.kind==='STOPPED');if(stop&&v.phase==='running')notices.push(toast(stop.mechanism==='CUT'?"Stopped · the cab's buffer held":'Stopped · the winch brake held','block'));
  if(v.offline)notices.push(banner({icon:'offline',title:'Reconnecting…',sub:'The Task goes on without your presses.'}));
  const f=model.feedback;if(f&&['Hold','let-go','LOCK','RELEASE','key'].includes(f.name)){
   if(f.status==='unknown')notices.push(banner({icon:'offline',title:`Checking your ${f.name}…`,sub:'The connection dropped on the way.'}));
   if(f.status==='rejected'&&!f.recovered)notices.push(banner({icon:'info',title:`Your ${f.name} was not done`,sub:'The crane had moved on.'}));
   if(f.recovered&&feedbackShownAt!==null&&now-feedbackShownAt<1500&&['accepted','rejected'].includes(f.status))notices.push(toast(`Your ${f.name} ${f.status==='accepted'?'went through':'did not go through'}.`,f.status==='accepted'?'check':'info'));
  }
  replace(nodes.notices,notices.length?h('div.fs-banner',{style:{top:`${top+12}px`}},notices):null);
 }

 // Outside-Task sheets are built only on a changed state, preserving focused rows
 // and in-flight Join/Cancel controls while the top-bar clock redraws.
 function flow(top,tight){return buildFoodFlow({ui,h,model,person,name,room,screen,selected,closedRequests,activeRequest,top,tight,
  locationOf:seatId=>ordinary()?.board?.seats.find(s=>s.seatId===seatId)?.location??null,
  setActive:value=>{activeRequest=value;},actButton});}
 function updateFlow(now,chrome){
  if(taskNodes){hold.releaseAll();taskNodes=null;taskId=null;lastStructure=null;replace(frame);lastHeader=null;}
  frame.dataset.screen=`food-${screen??'room'}`;if(chrome)updateHeader(null,now);else{frame.querySelector(':scope > .tb')?.remove();lastHeader=null;}
  const tight=frame.clientWidth/(parseFloat(win.getComputedStyle(document.documentElement).fontSize)||16)<14;
  const signature=JSON.stringify([screen,selected,tight,boardMode(),ordinary()?.board,ordinary()?.phase?.kind,ordinary()?.activeSeatId,foodTaskRevisionBody(model.view),model.canAsk,model.canAnswer,model.canWithdraw,model.feedback,identities(),stockToast,stockToastIcon]);
  if(signature===lastStructure)return;lastStructure=signature;
  const focus=document.activeElement?.id,scroll=frame.querySelector('.sheet-body')?.scrollTop??0;
  const flowKey=JSON.stringify([screen,model.view?.invitation?.requestId,model.view?.invitation?.state,model.feedback?.receipt?.status==='rejected'?model.feedback.receipt.requestClosure?.state:null]);
  const header=frame.querySelector(':scope > .tb');replace(frame,header,chrome?tabs({view:boardMode(),open:screen?'actions':null,hero:'pass-off',go:{switch:'food:switch',actions:'food:tasks',card:'food:card',panels:'food:panels'}}):null);
  const top=header?.offsetHeight??bars().top,nodes=flow(top,tight);frame.append(...nodes);
  const away=model.view?.step?.kind==='AWAY';if(away&&!screen&&!nodes.length)frame.append(h('div.fs-banner',{style:{top:`${top+44}px`}},banner({icon:'supply',title:'Two players are away on the Food Supply Task',sub:'The board shows who. They come back when its time is up; the Task shows on their phones only.'})));
  if(!screen&&!nodes.length&&!away&&stockToast)frame.append(h('div.fs-banner',{style:{top:`${top+44}px`}},toast(stockToast,stockToastIcon)));
  if(nodes.length){const next=focus?frame.querySelector(`#${win.CSS.escape(focus)}`):null;if(next){const body=frame.querySelector('.sheet-body');if(body)body.scrollTop=scroll;next.focus({preventScroll:true});}else if(flowKey!==lastFlowKey)focusCard();}
  lastFlowKey=flowKey;
 }
 function render(){
  if(disposed)return;model=controller.getModel();const now=snapshotTime(),view=model.view,reduced=!!preferences().reduced;
  frame.dataset.motion=reduced?'reduced':'normal';
  const task=view?.participantTask,taskVisible=task&&now!==null&&now<task.returnsAt;
  exclusive(!!taskVisible);
  if(!model.visible||!view){frame.hidden=true;replace(frame);taskNodes=null;taskId=null;lastStructure=null;lastHeader=null;surface({active:false,exclusive:false,top:null,bottom:null});return;}
  if(ordinary()?.panel&&ordinary().panel!=='board'){frame.hidden=true;surface({active:false,exclusive:!!taskVisible,top:null,bottom:null});return;}
  if(task&&now===null){frame.hidden=true;surface({active:false,exclusive:true,top:null,bottom:null});return;}
  const nextStep=view.step?.stepId??null;
  if(lastStepId!==undefined&&lastStepId!==nextStep){selected=null;if(screen==='partners')screen='tasks';lastStructure=null;}lastStepId=nextStep;
  const feedbackKey=JSON.stringify([model.feedback?.commandId,model.feedback?.status,model.feedback?.recovered]);
  if(feedbackKey!==feedbackSeen){feedbackSeen=feedbackKey;feedbackShownAt=now;}
  const request=view.invitation;if(request?.state==='PENDING')activeRequest=request.requestId;
  if(lastFoodStock!==null&&view.stock.doses>lastFoodStock){stockToast=`Food stock: ${foodPackagesText(view.stock.doses)} (+${foodPackageCount(view.stock.doses-lastFoodStock)})`;stockToastIcon='supply';}
  else if(lastFoodStock!==null&&view.stock.doses<lastFoodStock)stockToast=null;
  lastFoodStock=view.stock.doses;
  if(hadTask&&!task&&now!==null&&now>=hadTask.returnsAt){
   const own=hadTask.people.find(p=>p.seatId===view.seatId),where=room(),o=hadTask.outcome;
   if(own?.death){stockToast='You are out: you were killed on the Task.';stockToastIcon='info';}
   else if(o&&where){stockToast=o.kind==='DELIVERED'?`Back in ${where}. Delivered: +${o.dosesAdded/2} packages.`:o.kind==='CANCELLED'?`Back in ${where}. The Task was cancelled.`:`Back in ${where}. The Task was lost.`;stockToastIcon=o.kind==='DELIVERED'?'check':'info';}
   hadTask=null;
  }
  const chrome=!!(taskVisible||screen||request!==null||view.requestClosures.some(c=>c.requestId===activeRequest&&c.round===view.round&&c.foodStepId===view.step?.stepId&&!closedRequests.has(c.requestId))||view.step);
  const show=true;
  frame.hidden=!show;if(!show){if(taskNodes){hold.releaseAll();taskNodes=null;taskId=null;replace(frame);lastStructure=null;lastHeader=null;}return;}
  if(taskVisible){hadTask=task;updateTask(foodDisplay(model,now,{reduced,names:name}),now,reduced);}else updateFlow(now,chrome);
  for(const node of frame.querySelectorAll('.fs-card,.fs-card-body'))attr(node,'data-scrolls',node.scrollHeight>node.clientHeight+1?'':null);
  surface({active:chrome,exclusive:!!taskVisible,top:chrome?frame.querySelector(':scope > .tb')?.offsetHeight??0:null,bottom:chrome?frame.querySelector(':scope > .tabs')?.offsetHeight??0:null});
 }
 function pointerDown(e){const node=e.target.closest?.('.fs-ctl');if(!node||e.button!==0||e.isPrimary===false)return;
  if(node.dataset.act==='hold'){
   if(node.getAttribute('aria-disabled')==='true'&&!controller.getModel().physicalHolding&&!controller.getModel().needsContactOff)return;
   e.preventDefault();hold.pointerDown(e.pointerId);try{node.setPointerCapture(e.pointerId);}catch{}
  }else if(node.getAttribute('aria-disabled')!=='true'){e.preventDefault();void controller.press(({release:'PANEL_RELEASE',lock:'PANEL_LOCK',key:'KEY'})[node.dataset.act]);}
 }
 const pointerUp=e=>hold.pointerUp(e.pointerId);
 function keyDown(e){
  if(e.key==='Escape'){if(screen!==null){e.preventDefault();e.stopPropagation();close();}else if(taskNodes||model.view?.invitation){e.preventDefault();e.stopPropagation();}return;}
  const node=e.target.closest?.('.fs-ctl');if(!node||![' ','Enter'].includes(e.key))return;e.preventDefault();
  if(node.dataset.act==='hold'){if(node.getAttribute('aria-disabled')!=='true'||controller.getModel().physicalHolding||controller.getModel().needsContactOff)hold.keyDown(e.key,e.repeat);}
  else if(!e.repeat&&!panelKeys.has(e.key)&&node.getAttribute('aria-disabled')!=='true'){panelKeys.add(e.key);void controller.press(({release:'PANEL_RELEASE',lock:'PANEL_LOCK',key:'KEY'})[node.dataset.act]);}
 }
 const keyUp=e=>{hold.keyUp(e.key);panelKeys.delete(e.key);};
 function activate(e){
  const node=e.target.closest?.('button');if(!node)return;
  if(node.classList.contains('fs-ctl')){if(e.detail!==0)return;e.preventDefault();if(node.dataset.act==='hold'){
   if(node.getAttribute('aria-disabled')!=='true'||controller.getModel().physicalHolding||controller.getModel().needsContactOff)hold.assistiveClick();
  }else if(node.getAttribute('aria-disabled')!=='true')void controller.press(({release:'PANEL_RELEASE',lock:'PANEL_LOCK',key:'KEY'})[node.dataset.act]);return;}
  if(node.getAttribute('aria-disabled')==='true')return;
  const action=node.dataset.food??node.dataset.go;
  if(node.dataset.partner){selected=node.dataset.partner;lastStructure=null;render();return;}
  if(action==='ask'){if(selected)void controller.ask(selected);return;}
  if(action==='join'||action==='decline'){void controller.answer(action==='join'?'JOIN':'DECLINE');return;}
  if(action==='withdraw'){void controller.withdraw();return;}
  if(action==='ok'){if(activeRequest)closedRequests.add(activeRequest);activeRequest=null;close();return;}
  if(action==='food:tasks'||action==='tasks'){screen='tasks';selected=null;lastStructure=null;render();return;}
  if(action==='partners'||action==='howto'){screen=action;lastStructure=null;render();return;}
  if(action==='food:settings'){settings();return;}
  if(action==='close'||action==='back'){if(action==='back'&&screen!=='tasks')screen='tasks';else screen=null;lastStructure=null;render();return;}
  if(action?.startsWith('food:')){close();navigate(action.slice(5));}
 }
 const release=()=>{hold.releaseAll();panelKeys.clear();};
 const blur=event=>{if(event?.target!==win)return;release();controller.setVisible(false);};
 const visibility=()=>{if(document.visibilityState==='hidden'){release();controller.setVisible(false);}else resume();};
 const resume=()=>controller.setVisible(document.visibilityState!=='hidden');
 const preferencesChanged=()=>{lastStructure=null;lastHeader=null;render();};
 frame.addEventListener('pointerdown',pointerDown);frame.addEventListener('keydown',keyDown);frame.addEventListener('click',activate);
 win.addEventListener('pointerup',pointerUp,true);win.addEventListener('pointercancel',pointerUp,true);win.addEventListener('keyup',keyUp,true);
 win.addEventListener('blur',blur,true);win.addEventListener('focus',resume);document.addEventListener('visibilitychange',visibility,true);document.addEventListener('mothership:preferences-change',preferencesChanged);
 const unsubscribe=controller.subscribe(render),unart=assets?.subscribe?.(()=>{if(taskNodes)taskNodes.artKey=null;render();});
 function tick(stamp){if(disposed)return;raf=win.requestAnimationFrame(tick);if(stamp-lastFrame<1000/60)return;lastFrame=stamp;if(document.visibilityState!=='hidden')render();}
 raf=win.requestAnimationFrame(tick);
 return {openTasks(){screen='tasks';lastStructure=null;render();},close,refresh:render,release,
  dispose(){if(disposed)return;release();disposed=true;if(raf!==null)win.cancelAnimationFrame(raf);unsubscribe();unart?.();hold.dispose();
   frame.removeEventListener('pointerdown',pointerDown);frame.removeEventListener('keydown',keyDown);frame.removeEventListener('click',activate);
   win.removeEventListener('pointerup',pointerUp,true);win.removeEventListener('pointercancel',pointerUp,true);win.removeEventListener('keyup',keyUp,true);
   win.removeEventListener('blur',blur,true);win.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',visibility,true);document.removeEventListener('mothership:preferences-change',preferencesChanged);frame.remove();exclusive(false);surface({active:false,exclusive:false,top:null,bottom:null});}};
}

function buildFoodFlow({ui,h,model,person,name,room,screen,selected,closedRequests,activeRequest,setActive,actButton,locationOf,top,tight}){
 const {sheet,row,list,groupLabel,groupNote,ic}=ui,v=model.view,r=v.invitation,where=room(),location=where??'';
 const cardStyle={top:`calc(var(--top) + ${tight?8:60}px)`,maxHeight:`calc(100% - var(--top) - ${tight?20:72}px)`},tightAttr=tight?'':null;
 const f=model.feedback,closure=f?.receipt?.status==='rejected'?f.receipt.requestClosure:v.requestClosures.find(c=>c.requestId===activeRequest&&!closedRequests.has(c.requestId));
 const layout=(title,body,foot,options={})=>sheet({title,sub:'Food Supply Task',body,foot,close:'close',...options});
 const accepted=f?.receipt?.status==='accepted'&&f.receipt.result.kind==='REQUEST'?f.receipt.result:null;
 if(accepted?.state==='JOINED'&&r?.requestId===accepted.requestId&&r.partnerSeatId===v.seatId)return [h('section.fs-card',{role:'alertdialog','aria-label':'Joined a Task','data-tight':tightAttr,style:cardStyle},
  h('span.stamp.fs-stamp',{'data-tone':'accent'},'Partner'),h('h2',`You joined ${name(r.volunteerSeatId)}'s Food Supply Task`),h('p',`You are going to the Supply Room. Your place in ${location} is kept for your return.`),h('p',h('b','Briefing in a moment.')))];
 const closed=closure??(accepted&&r?.requestId===accepted.requestId&&accepted.state!=='PENDING'?{...r,state:accepted.state}:null);
 if(r?.state==='PENDING'&&!closed){
  setActive(r.requestId);
  if(r.volunteerSeatId===v.seatId)return layout(`Waiting for ${name(r.partnerSeatId)}`,[groupNote(`${name(r.partnerSeatId)} can join or decline. If not, the next volunteer goes.`)],
   [actButton('Waiting…','wait',{busy:true,block:true,disabled:true}),actButton('Cancel','withdraw',{kind:'plain',block:true,disabled:!model.canWithdraw})],{close:false});
  const joining=f?.status==='sending'&&f.name==='Join',title=`${name(r.volunteerSeatId)} asks you to join the Food Supply Task`;
  return [h('section.fs-card',{role:'alertdialog','aria-label':'Asked to join a Task','data-tight':tightAttr,style:cardStyle},
   h('div.fs-card-body',h('span.stamp.fs-stamp',{'data-tone':'accent'},'Partner request'),h('h2',title),
   h('p',`You would go to the Supply Room together, one of you on each control. Your place in ${location} is kept for your return.`),
   h('p','If you join, neither of you can go for food next round.')),h('div.fs-card-foot',h('div.fs-answer',actButton('Decline','decline',{kind:'secondary',block:true,disabled:!model.canAnswer}),actButton(joining?'Joining…':'Join','join',{icon:joining?null:'check',block:true,busy:joining,disabled:!model.canAnswer})),
   h('p.fs-timer','Answer within 15 s. No answer counts as a decline.')))];
 }
 if(closed&&closed.round===v.round&&closed.foodStepId===v.step?.stepId&&!closedRequests.has(closed.requestId)){
  if(closed.volunteerSeatId===v.seatId){
   if(closed.state==='JOINED')return layout(f?.name==='Cancel'?'Too late to cancel':'Starting the Food Supply Task',[groupNote(f?.name==='Cancel'?'The Task is starting. Going to the Supply Room…':'Going to the Supply Room…')],actButton('Starting…','wait',{busy:true,block:true,disabled:true}),{sub:`${name(closed.partnerSeatId)} ${f?.name==='Cancel'?'joined first':'joined'}`,close:false});
   return layout(closed.state==='WITHDRAWN'?'Request withdrawn':`${name(closed.partnerSeatId)} declined`,[groupNote('The next volunteer goes: anyone else can ask while the step lasts.'),groupNote('You can volunteer again next round.')],actButton('OK','ok',{block:true}));
  }
  if(closed.state==='WITHDRAWN'||closed.state==='EXPIRED')return [h('section.fs-card',{role:'alertdialog','aria-label':'Too late to join','data-tight':tightAttr,style:cardStyle},
   h('div.fs-card-body',h('span.stamp.fs-stamp','Too late'),h('h2','Too late to join'),h('p',closed.state==='WITHDRAWN'?`${name(closed.volunteerSeatId)} had withdrawn the request before your answer arrived.`:'The 15 seconds ran out before your answer arrived. It counts as a decline.'),h('p',`You stay in ${location}.`)),h('div.fs-card-foot',h('div.fs-answer',actButton('OK','ok',{block:true}))))];
 }
 if(screen==='howto'){
  const sections=[['When','Once a round, at its start, before the turns. The two who go cannot go again the next round.'],['Two of you, one control each','The game picks who runs which control. The Panel moves the crane left and right; the Winch moves the crate up and down.'],['The Panel',"RELEASE sets the locking panel clicking from stop to stop along the rail, fast. LOCK stops it at the stop it rests at. Lock it at 6, over the platform. At 7 it cuts the Winch's cab."],['The Winch','One button: Hold. Press and hold to lift the crate, and keep holding while it moves. Locked, the crate swings. Let go when it swings over the platform: it lands. Over the Panel it falls on them. Anywhere else it breaks, and the hook must fetch a new one from the hatch at 1.'],['Then','Both turn a key: +5 packages for the ship.'],['The time','30 seconds for the whole Task, the short briefing included.'],['Mistakes','A late LOCK or a let-go at the wrong moment can kill. Nothing tells a mistake from a betrayal. Your press counts when it reaches the ship, a moment after you press: the stripes warn you early for that.'],['Leaving',"If you lose your connection for 8 seconds, the Task is cancelled. It costs you nothing more. Whatever happens, you both go back at the end of the Task's time."]];
  return sheet({title:'How the Food Supply Task works',sub:'Read it now: the Task itself lasts 30 seconds',back:'back',close:'close',detent:'large',body:sections.flatMap(([title,text])=>[groupLabel(title),groupNote(text)])});
 }
 if(screen==='partners')return layout('Choose your Partner',[
  groupLabel('Players'),list(v.partnerChoices.map(p=>{const identity=person(p.seatId),reason=({WENT_LAST_ROUND:'Went for food last round',IN_HOSPITAL:'Not available now',JAILED:'Not available now',ELIMINATED:'Not available now',NOT_AVAILABLE_NOW:'Not available now'})[p.reason];
   const offered=model.canAsk&&v.offers.some(o=>o.type==='TASK_ASK'&&o.partnerSeatIds.includes(p.seatId));
   const rowNode=row({lead:h('b.num',String(identity.seat)),title:identity.name,sub:p.available&&offered?locationOf(p.seatId):reason??'Not available now',disabled:!p.available||!offered,trail:selected===p.seatId?ic('check',{filled:true}):null});rowNode.dataset.partner=p.seatId;rowNode.setAttribute('aria-pressed',String(selected===p.seatId));rowNode.id=`food-partner-${p.seatId}`;return rowNode;})),
  groupNote("If the player you ask declines, the next volunteer goes. Last round's two, and anyone in the Hospital or the Jail, cannot go. The game picks the controls at random.")],actButton(selected?`Ask ${name(selected)}`:'Ask','ask',{icon:'supply',block:true,disabled:!model.canAsk||!selected}),{back:'back',close:'close',detent:'large'});
 if(screen==='tasks'){
  const reason=v.ownAvailability.reason,sub=({NOT_IN_STEP:'Opens at the start of each round',WENT_LAST_ROUND:'You went for food last round',REQUEST_PENDING:'Someone is asking a Partner',REFUSED_THIS_ROUND:'Not available now',TASK_ALREADY_STARTED:'Not available now',NOT_AVAILABLE_NOW:'Not available now'})[reason];
  return sheet({title:'Start a Task',sub:'With a Partner you choose. Once a round, before the turns.',detent:'auto',close:'close',body:[list(
   row({icon:'supply',title:'Food Supply',sub:model.canAsk?'Land a ration crate on the galley lift: +5 packages':sub??'Not available now',chevron:model.canAsk,disabled:!model.canAsk,go:'partners'}),
   row({icon:'panel',title:'Engine',sub:'Its own Task, designed separately',disabled:true}),row({icon:'info',title:'How the Food Supply Task works',sub:'Read it now: the Task itself lasts 30 seconds',chevron:true,go:'howto'})),
   groupNote(reason==='NOT_IN_STEP'?'The Food Supply Task runs only at the start of a round, before the turns.':reason==='WENT_LAST_ROUND'?`The two who go for food cannot go again the next round. You can go again in round ${v.round+1}.`:reason==='REQUEST_PENDING'?'One request at a time. If it is refused, anyone else can ask while the step lasts.':'Anyone can volunteer. You and your Partner cannot go for food again next round.') ]});
 }
 return [];
}
