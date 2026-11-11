import {crewPortraitVariable,disposeCrewMounts,setCrewMountActivity,setCrewPictureSurface} from '../crew-runtime.mjs';
import {PLANET_ACTION_LABELS,PLANET_PROMISE_LABELS,planetPromiseTerms,planetBlackholePresentation,planetTerminalArrival,planetPanelRequestText} from '@mothership/presentation';
import {PlanetDrawingSchema} from '@mothership/contracts';
import {turnsLayout} from '../board-v2-drawing/turns-four.mjs';
import {slotRects} from '../board-v2-drawing/fit-four.mjs';
import {BOARD_ROOMS,sceneOf,slotsOf,LOCATION_OF} from '../board-v2-drawing/slots-four.mjs';
import {boardV2SceneFrame,paintBoardV2} from '../board-v2-scene.mjs';
import {createBoardV2Films} from '../board-v2-films.mjs';
import {labelBox} from '../board-v2-drawing/label-box.mjs';
import {createBoardV2Blackout} from '../board-v2-blackout.mjs';
import {createBoardV2Capsule} from '../board-v2-capsule.mjs';
import {createPlanetRescuePainter} from './rescue.mjs';
import {createPlanetMotion,planetOutcomeWords,planetOutcomeTakesPrecedence} from './motion.mjs';
import {createPlanetLibrary} from './library.mjs';
import {createPlanetCinematic} from './cinematic.mjs';

const windowNames={A_B:'Room A ↔ Room B',A_HOSPITAL:'Room A ↔ Hospital',B_JAIL:'Room B ↔ Jail'};
const number=id=>id?`Player ${id.slice(5)}`:'—';
const putBox=(node,r)=>{if(!r)return;for(const k of ['left','top','width','height'])if(Number.isFinite(r[k]))node.style[k]=`${r[k]}px`;};
const roomFor=slot=>BOARD_ROOMS.find(room=>slotsOf(room,9).some(s=>s.id===slot));

/** Native consumer renderer: public scene DTOs feed approved pure drawings, never legacy wire views. */
export function mountPlanetRenderer(root,controller,{cinematics=[],terminalAction=null}={}){
 const document=root.ownerDocument,win=document.defaultView;
 const library=createPlanetLibrary(document);
 const readInsets=()=>{const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.append(probe);const style=win.getComputedStyle(probe),value={top:parseFloat(style.paddingTop)||0,right:parseFloat(style.paddingRight)||0,bottom:parseFloat(style.paddingBottom)||0,left:parseFloat(style.paddingLeft)||0};probe.remove();return value;};
 let safeInsets=readInsets();
 const el=(tag,text=null,cls=null)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,act,value=null)=>{const n=el('button',text);n.type='button';n.dataset.planetAction=act;if(value!==null)n.dataset.value=value;return n;};
 root.classList.add('ms-shell','planet-app');root.dataset.boardLayout='board-v2';root.dataset.screen='match';
 const header=el('header',null,'planet-header'),phase=el('strong'),timer=el('span',null,'planet-timer'),offices=el('small'),checkpoint=el('small'),instruction=el('p');
 instruction.id='ms-action-step';header.append(phase,timer,offices,checkpoint,instruction);
 const holder=el('div',null,'bv2-mount planet-board'),targets=el('div',null,'planet-targets');
 const nav=el('nav',null,'planet-nav');nav.setAttribute('aria-label','Player controls');
 for(const [label,value]of [['Board','board'],['Card','card'],['Actions','actions'],['More','more']]){const n=button(label,'panel',value);n.id=`planet-nav-${value}`;nav.append(n);}
 const pass=button('PASS','begin','PASS_TURN');pass.className='planet-pass';pass.id='planet-pass';
 const sheet=el('section',null,'planet-sheet ms-private');sheet.dataset.open='true';sheet.setAttribute('aria-label','Private controls');
 const sheetBody=el('div',null,'planet-sheet-body ms-private__panel'),sheetFoot=el('div',null,'planet-sheet-foot');sheet.append(sheetBody,sheetFoot);
 const status=el('p',null,'planet-status');status.setAttribute('role','status');
 const words=el('p',null,'ms-visually-hidden');words.setAttribute('aria-live','polite');
 const rosterText=el('ul',null,'ms-visually-hidden');rosterText.setAttribute('aria-label','Authorized board facts');
 const resultPanel=el('section',null,'planet-result');resultPanel.setAttribute('aria-label','Authoritative result');
 root.replaceChildren(holder,targets,header,nav,pass,sheet,status,words,resultPanel,rosterText);
 const media=win.matchMedia('(prefers-reduced-motion: reduce)'),motion=createPlanetMotion({transitDurationMs:cinematics.find(c=>c.name==='transit')?.durationMs??0}),capsule=createBoardV2Capsule(),blackout=createBoardV2Blackout(),films=createBoardV2Films(root,holder),rescue=createPlanetRescuePainter(holder),cinematic=createPlanetCinematic(holder,cinematics);
 let checkpointText='';
 let model=null,layout=null,frame=null,raf=null,disposed=false,more=false,uiKey=null,lastPanel='board';
 const drawings=new Map();
 const reduced=()=>model?.motion==='reduced'||document.documentElement.dataset.motion==='reduced'||media.matches;
 const completeArt=()=>{const loaded=new Set((document.documentElement.dataset.art??'').split(' '));return ['public-board','player-ui','roles','scene-art','abilities','board-v2-art','board-v2-motion-art','board-v2-films-art'].every(name=>loaded.has(name));};
 const artForRoom=room=>room==='hospital'?
  [{id:'back',cssVar:'--board-v2-film-scenes-hospital-ward-four-back',sceneDepth:-1000},...Object.entries(sceneOf(room,model.playerCount).layers).map(([id,layer])=>({id,cssVar:`--board-v2-film-scenes-hospital-ward-four-${id}`,sceneDepth:layer.depth}))]:
  [{id:'back',cssVar:`--bm-scene-${room}-back`,sceneDepth:-1000},...Object.entries(sceneOf(room,model.playerCount).layers).map(([id,layer])=>({id,cssVar:`--bm-scene-${room}-${id.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`,sceneDepth:layer.depth}))];
 const addText=(text,tag='p')=>sheetBody.append(el(tag,text));
 const beginButton=type=>{const b=button(PLANET_ACTION_LABELS[type],'begin',type);b.id=`planet-action-${type}`;return b;};
 function renderCard(p){
  if(!p?.role)return;
  const identity=model.identities.find(i=>i.seatId===model.ownSeatId),role=p.role;
  const card=el('div',null,'ms-role-card ms-role-card--full');card.dataset.team=role.faction.toLowerCase();if(role.device)card.dataset.device=role.device;
  if(/^c[1-9]$/.test(identity?.characterId??'')){card.dataset.character=identity.characterId;card.style.setProperty('--ms-role-person',crewPortraitVariable(identity.characterId,model.versions));}
  if(role.device)card.style.setProperty('--ms-role-device',`var(--ms-asset-device-${role.device}-held)`);
  else if(role.name==='Engineer'&&(document.documentElement.dataset.art??'').split(' ').includes('successor')){card.dataset.device='engineer';card.style.setProperty('--ms-role-device','var(--sw-asset-sw-device-engineer)');}
  const art=el('span',null,'ms-role-card__art');art.setAttribute('aria-hidden','true');
  const text=el('div',null,'ms-role-card__text');text.append(el('h2',role.name,'ms-role-card__name'),el('p',`${role.faction} team`,'ms-role-card__team'));card.append(art,text);sheetBody.append(card);
  for(const offer of p.offers??[])sheetBody.append(beginButton(offer.type));
  addText(role.guide);
  if(p.resources)addText(`Weapons ${p.resources.ordinaryWeapons} · Role Action ${p.resources.roleActionSpent?'spent':'available'} · Movement ${p.resources.movementSpent?'spent':'available'}`);
  const a=p.abilities,k=p.knowledge;
  if(k?.insiderSeatIds.length)addText(`Unmapped trio: ${k.insiderSeatIds.map(number).join(', ')}.`);
  if(k?.knownUndercoverSeatId)addText(`Undercover: ${number(k.knownUndercoverSeatId)}.`);
  for(const scan of k?.scanResults??[])addText(`Round ${scan.round}: ${number(scan.targetSeatId)}, ${scan.guess} guess ${scan.matched?'matched':'did not match'}${scan.inCode===null?'':`; ${scan.inCode?'in':'outside'} Code`}.`);
  if(role.name==='Hacker'){
   addText(`Final Code ${a.codeAttempted?'spent':'not submitted'} · Spaceship hack ${a.shipHackSpent?'spent':a.shipHackUnlocked?'unlocked':'locked'}.`);
   if(a.scanBlockedThroughRound!==null&&model.round<=a.scanBlockedThroughRound)addText(`Scan unavailable through Round ${a.scanBlockedThroughRound}.`);
  }
  if(a&&a.injectionsRemaining!==null)addText(`Shared injections remaining: ${a.injectionsRemaining}.`);
  if(role.name==='Engineer')addText(`Suppression ${a.engineerSpent?'spent':'unused'}.`);
  if(role.name==='Alien')addText(`Blackhole ${a.blackholeSpent?'spent':'unused'}.`);
  for(const grant of a?.protectionGrants??[])addText(`Protection for ${number(grant.targetSeatId)} from Round ${grant.activeFromRound}: ${grant.consumed?'consumed':'registered'}.`);
  const file=library.roleFile(model,p);if(file)sheetBody.append(file);
 }
 function renderPromises(p){
  addText('Promises','h2');if(!p?.promiseQuota)return;
  addText(`Accepted given: ${p.promiseQuota.given?'1 / 1':'0 / 1'} · Accepted received: ${p.promiseQuota.received?'1 / 1':'0 / 1'}`);
  for(const promise of p.promises??[]){
   const card=el('article',null,'planet-promise');card.append(el('h3',PLANET_PROMISE_LABELS[promise.kind]),el('p',planetPromiseTerms(promise)),el('strong',promise.accepted?promise.status:promise.offerStatus??'Offered'));
   library.decoratePromise(card,promise);sheetBody.append(card);
  }
  for(const o of p.offers??[])sheetBody.append(beginButton(o.type));
 }
 function paintDrawing(canvas,drawing){
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.lineCap='round';c.lineJoin='round';
  if(!PlanetDrawingSchema.safeParse(drawing).success)return;
  for(const stroke of drawing.strokes){c.strokeStyle=stroke.color;c.fillStyle=stroke.color;c.lineWidth=stroke.width;const [[x,y]]=stroke.points;c.beginPath();c.moveTo(x*canvas.width,y*canvas.height);for(const [px,py]of stroke.points.slice(1))c.lineTo(px*canvas.width,py*canvas.height);if(stroke.points.length===1){c.arc(x*canvas.width,y*canvas.height,stroke.width/2,0,Math.PI*2);c.fill();}else c.stroke();}
 }
 function renderWindows(p){
  addText('Windows','h2');addText(`Unverified claims · Expires after Round ${model.round}`);
  if(!p?.windows?.length){addText('No window is visible from your current location.');return;}
  for(const window of p.windows){
   const heading=el('h3',windowNames[window.windowId]);heading.prepend(library.art(`wn-lintel-${window.windowId.toLowerCase().replaceAll('_','-')}`));sheetBody.append(heading);
   for(const record of [...window.drawings].sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))){
    const figure=el('figure');const canvas=el('canvas');canvas.width=512;canvas.height=280;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Unverified drawing by ${number(record.authorSeatId)}, order ${record.order+1}`);paintDrawing(canvas,record.drawing);figure.append(canvas,el('figcaption',`${record.order+1}. ${number(record.authorSeatId)} · Round ${record.round}`));sheetBody.append(figure);
   }
   if(!window.canDraw){addText('View only from this position.');continue;}
   const key=`${model.round}:${window.windowId}:${model.board?.seats.find(s=>s.seatId===model.ownSeatId)?.slotId}`;
   let local=drawings.get(key);if(!local){local={strokes:[]};drawings.set(key,local);}
   const canvas=el('canvas',null,'planet-drawing');canvas.width=512;canvas.height=280;canvas.tabIndex=0;canvas.setAttribute('aria-label',`Local drawing for ${windowNames[window.windowId]}. Use pointer or touch to draw; arrow keys position the pen, Space draws.`);paintDrawing(canvas,local);
   const tools=el('div',null,'planet-drawing-tools'),ink=el('input'),width=el('select');ink.type='color';ink.value='#F7D886';ink.id=`planet-ink-${window.windowId}`;width.id=`planet-width-${window.windowId}`;
   const inkLabel=el('label','Ink');inkLabel.htmlFor=ink.id;tools.append(inkLabel,ink);for(const n of [2,4,8,12,24]){const o=el('option',String(n));o.value=String(n);width.append(o);}width.value='4';const widthLabel=el('label','Width');widthLabel.htmlFor=width.id;tools.append(widthLabel,width);
   let stroke=null,total=local.strokes.reduce((n,s)=>n+s.points.length,0),cursor=[.5,.5];
   const start=point=>{if(local.strokes.length>=128||total>=4096)return;stroke={color:ink.value.toUpperCase(),width:Number(width.value),points:[point]};local.strokes.push(stroke);total++;paintDrawing(canvas,local);};
   const append=point=>{if(!stroke||stroke.points.length>=512||total>=4096)return;stroke.points.push(point);total++;paintDrawing(canvas,local);};
   const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
   canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);start(point(e));});canvas.addEventListener('pointermove',e=>append(point(e)));for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{stroke=null;});
   canvas.addEventListener('keydown',e=>{
    if(e.key.startsWith('Arrow')){e.preventDefault();cursor=[Math.max(0,Math.min(1,cursor[0]+(e.key==='ArrowRight'?.04:e.key==='ArrowLeft'?-.04:0))),Math.max(0,Math.min(1,cursor[1]+(e.key==='ArrowDown'?.04:e.key==='ArrowUp'?-.04:0)))];if(e.shiftKey){if(!stroke)start(cursor);else append(cursor);}else stroke=null;}
    if(e.key===' '){e.preventDefault();start(cursor);stroke=null;}
   });
   const show=button('Show','show',window.windowId);show.id=`planet-show-${window.windowId}`;
   show.disabled=!p.offers?.some(o=>o.type==='SHOW_WINDOW'&&o.windowIds.includes(window.windowId));
   show.addEventListener('click',()=>controller.showDrawing(window.windowId,structuredClone(local)));
   const reset=button('Clear local draft','local-clear');reset.addEventListener('click',()=>{local.strokes=[];stroke=null;total=0;paintDrawing(canvas,local);});
   const undo=button('Undo local stroke','local-undo');undo.addEventListener('click',()=>{local.strokes.pop();stroke=null;total=local.strokes.reduce((n,s)=>n+s.points.length,0);paintDrawing(canvas,local);});
   sheetBody.append(tools,canvas,undo,reset,show);
  }
 }
 function renderAction(){
  const action=model.action;if(!action)return false;
  addText(action.label,'h2');addText(action.prompt);
  if(action.confirmation)addText(action.confirmation);
  const boardChoice=action.type!=='PANEL_CODE'&&action.choices.some(c=>/^seat-[1-9]$/.test(c.value))||action.type==='MOVE'&&['targets','slots'].includes(action.step)||action.type==='SELECT_BLACKOUT_SLOT'&&action.step==='slots';
  if(boardChoice){sheet.hidden=true;return true;}
  if(action.type==='PANEL_CODE')sheetBody.append(library.panelConsole(model,model.privateArea));
  const choices=el('div',null,action.type==='PANEL_CODE'?'planet-number-grid':'planet-choice-grid');
  for(const choice of action.choices){const b=button(choice.label,'choose',choice.value);b.id=`planet-choice-${choice.value}`;library.decorateChoice(b,action,choice);choices.append(b);}sheetBody.append(choices);
  if(action.canConfirm){const confirm=button('Register','confirm');confirm.id='planet-confirm';sheetFoot.append(confirm);}
  return true;
 }
 function renderUI(){
  const focus=document.activeElement?.id;
  sheetBody.replaceChildren();sheetFoot.replaceChildren();
  sheet.hidden=model.surface==='display'||model.concealed||model.phase?.expired||(!model.action&&model.panel==='board'&&!more&&!model.recovery);
  if(model.concealed||model.phase?.expired){more=false;drawings.clear();return;}
  const close=button('Close','close');close.id='planet-close';sheetFoot.append(close);
  if(model.recovery){addText('Outcome unknown','h2');addText('Check the original receipt. No replacement command is permitted.');const check=button('Check receipt','check');check.id='planet-check';check.disabled=!model.recovery.canCheck;sheetBody.append(check);if(model.recovery.canRetry)sheetBody.append(button('Retry original command','retry'));}
  else if(!renderAction()){
   const p=model.privateArea;
   if(more){addText('More','h2');for(const [label,value]of [['Promises','promises'],['Windows','windows'],['Navigation','navigation'],['Hospital panel','hospital']])sheetBody.append(button(label,'panel',value));}
   else if(model.panel==='card')renderCard(p);
   else if(model.panel==='promises')renderPromises(p);
   else if(model.panel==='windows')renderWindows(p);
   else if(model.panel==='navigation'){
    addText('Navigation','h2');const setting=model.versions?.engineVersion==='planet-game-1.1.0'&&model.phase?.kind==='NAV_SETTING';if(setting)addText('The course is being set.');if(p?.navigation){const picture=library.route(p.navigation);if(picture)sheetBody.append(picture);addText(`Position: ${p.navigation.position}`);if(!setting)addText(`Final direction: ${p.navigation.direction??'awaiting resolution'}`);if(p.offers?.some(o=>o.type==='CHOOSE_NAV_DIRECTION'))sheetBody.append(beginButton('CHOOSE_NAV_DIRECTION'));if(p.offers?.some(o=>o.type==='CONFIRM_NAVIGATION'))sheetBody.append(beginButton('CONFIRM_NAVIGATION'));}
    else addText('Current route and direction are private to the offices.');
   }else if(model.panel==='hospital'){
    addText('Hospital panel','h2');addText('One patient attempt with the Doctor’s original player number. A registered request resolves later.');
    if(model.board?.seats.some(s=>s.seatId===model.ownSeatId&&s.location==='Hospital'&&s.health!=='Eliminated'))sheetBody.append(library.panelConsole(model,p));
    const requestText=planetPanelRequestText(p?.panelRequest);if(requestText)addText(requestText);
    if(p?.panelAttemptSpent){if(!requestText)addText('Your panel attempt is spent.');}else if(p?.offers?.some(o=>o.type==='PANEL_CODE'))sheetBody.append(beginButton('PANEL_CODE'));else addText('The panel is not currently available.');
   }else if(model.panel==='actions'){
    addText('Actions','h2');
    if(p?.blackoutTargeting?.selectedSlotId)addText(`Your fixed selection: ${p.blackoutTargeting.selectedSlotId}.`);
    if(p?.ownBallot?.phaseId===model.phase.id)addText(`Your registered ballot: ${p.ownBallot.targetSeatId?number(p.ownBallot.targetSeatId):'Abstain'}.`);
    if(p?.captainCommands)for(const [type,used]of [['CAPTAIN_RELEASE',p.captainCommands.releaseUsed],['CAPTAIN_EJECT',p.captainCommands.ejectUsed]]){const b=beginButton(type),available=p.offers?.some(o=>o.type===type);b.disabled=used||!available;b.textContent=`${PLANET_ACTION_LABELS[type]} · ${used?'USED':available?'AVAILABLE':'UNAVAILABLE'}`;b.dataset.captainPlate=used?'used':available?'available':'unavailable';b.style.backgroundImage=`var(--board-v2-film-captain-plate-${type==='CAPTAIN_RELEASE'?'release':'eject'}-${b.dataset.captainPlate})`;sheetBody.append(b);}
    if(p?.hackFeedback)addText(p.hackFeedback.status==='DECLARED'?`Claim: ${p.hackFeedback.declaredSide}. Unverified.`:p.hackFeedback.status==='NO_DECLARATION'?'No side was declared.':'Waiting for the private claim.');
    const offers=p?.offers?.filter(o=>!['PASS_TURN','MOVE','SHOW_WINDOW','ACCEPT_PROMISE','DECLINE_PROMISE','OFFER_PROMISE','CHOOSE_NAV_DIRECTION','CONFIRM_NAVIGATION','PANEL_CODE','CAPTAIN_RELEASE','CAPTAIN_EJECT'].includes(o.type))??[];
    for(const offer of offers)sheetBody.append(beginButton(offer.type));
    if(!offers.length)addText('No action is currently offered.');
   }
  }
  if(focus&&root.querySelector(`[id="${CSS.escape(focus)}"]`))root.querySelector(`[id="${CSS.escape(focus)}"]`).focus({preventScroll:true});
  else if(model.action?.step==='confirm')sheetFoot.querySelector('#planet-confirm')?.focus({preventScroll:true});
 }
 function paint(){
  if(disposed||!model)return;raf=null;
  const sample=motion.sample();films.beforePaint();clearBlocks();
  if(frame&&layout?.fits){
   const choosing=model.action?.choices??[],choices=choosing.filter(c=>/^seat-[1-9]$/.test(c.value)).map(c=>({...c,id:`planet-seat-${c.value}`}));
   paintBoardV2(holder,frame,layout.board.boxes,{artForRoom,choices,marks:model.action?{picked:model.action.selected,numbered:['SUPPLY','SUBMIT_CODE'].includes(model.action.type)}:null,capsule:model.dark?null:capsule.sample(),canMove:model.surface==='player',blackout:blackout.sample(),versions:model.versions,reducedMotion:reduced()});
   paintNight();
   for(const heading of holder.querySelectorAll('button[data-move-room]'))heading.disabled=!model.moveRooms.includes(heading.dataset.moveRoom);
   const seats=(model.board?.seats??[]).map(seat=>({...seat,...model.identities.find(i=>i.seatId===seat.seatId)}));
   root.dataset.phoneView=model.panel==='card'?'actions':model.panel;
   films.paint({sample:{...sample,items:sample.items.filter(entry=>entry.kind!=='medical'||entry.clinical!=='HEALED')},frame,board:{playerCount:model.playerCount},seats,geometry:{sceneOf,slotsOf,slotRects},layout,enabled:completeArt()&&model.connection==='live'&&!model.concealed&&!model.phase?.expired,dark:model.dark||blackout.sample()?.dark===true,privateOpen:model.panel==='card',time:performance.now(),versions:model.versions});
   rescue.paint({entries:sample.items,frame,seats,enabled:completeArt()&&model.connection==='live'&&!model.concealed&&!model.phase?.expired,dark:model.dark||blackout.sample()?.dark===true});
   for(const room of frame.rooms){const parent=holder._boardV2Paint?.rooms.get(room.room);if(!parent)continue;
    for(const slot of slotRects(room.room,model.playerCount,room.panel).filter(s=>['A1','A2','B1','B2'].includes(s.id))){let mark=parent.querySelector(`[data-library-station="${slot.id}"]`);if(!mark){mark=el('span',null,'planet-window-station');mark.dataset.libraryStation=slot.id;mark.setAttribute('aria-hidden','true');parent.append(mark);}putBox(mark,{left:slot.left+slot.side*.25,top:slot.top+slot.side*.7,width:slot.side*.5,height:slot.side*.3});}
   }
   for(const actor of holder.querySelectorAll('.bv2-actor')){
    const seat=model.board?.seats.find(s=>s.seatId===actor.dataset.seat);let badge=actor.querySelector('.planet-office-badge');
    const label=[model.offices?.captainSeatId===actor.dataset.seat?'Captain':null,model.offices?.officerSeatId===actor.dataset.seat?'Officer':null].filter(Boolean).join(' · ');
    if(label){if(!badge){badge=el('b',null,'planet-office-badge');actor.append(badge);}badge.textContent=label;badge.dataset.officer=String(model.offices?.officerSeatId===actor.dataset.seat);const figure=frame.rooms.flatMap(r=>r.figures).find(f=>f.seatId===actor.dataset.seat);if(figure){badge.style.left=`${figure.press.left}px`;badge.style.top=`${figure.press.top-11}px`;badge.style.right='auto';}}else badge?.remove();
    let blocked=actor.querySelector('.planet-move-block');if(model.offices?.blockedSeatId===actor.dataset.seat){if(!blocked){blocked=el('span',null,'planet-move-block');blocked.setAttribute('aria-hidden','true');actor.append(blocked);}const figure=frame.rooms.flatMap(r=>r.figures).find(f=>f.seatId===actor.dataset.seat);if(figure){blocked.style.left=`${figure.press.left+figure.press.side-16}px`;blocked.style.top=`${figure.press.top}px`;}}else blocked?.remove();
   }
  }
  if(!frame||!layout?.fits)rescue.clear();
  const cinematicAnimating=cinematic.paint({model:{matchId:model.matchId,connection:model.connection,concealed:model.concealed||!document.hasFocus(),dark:model.dark,phase:model.phase,navigation:model.navigation,result:model.result},sample:{nowMs:sample.nowMs,special:sample.special.filter(e=>e.kind==='transit'&&e.occurrence?.audience.kind==='public').map(e=>({kind:e.kind,t:e.t}))},frame,layout,reduced:reduced()});
  const stage=planetBlackholePresentation(model),synced=stage!==null||!model.concealed&&!model.dark&&sample.special.some(effect=>effect.kind==='blackhole');
  root.dataset.syncCue=String(synced);checkpoint.textContent=checkpointText+(stage?(stage.status==='presenting'?' · Ship synchronized':' · Waiting for server'):synced?' · BLACKHOLE synced':'');
  for(const effect of sample.special)if(effect.kind==='blocked')paintBlock(effect);
  setCrewMountActivity(holder,model.connection==='live'&&!model.concealed&&!model.dark&&!model.phase?.expired);
  if(sample.animate||capsule.sample().animate||blackout.sample()?.animate||cinematicAnimating)raf=win.requestAnimationFrame(paint);
 }
 function clearBlocks(){for(const node of holder.querySelectorAll('.bv2-block-fx'))node.remove();for(const figure of holder.querySelectorAll('.bv2-figure'))figure.style.translate='0px 0px';}
 function paintBlock(effect){
  if(model.dark||blackout.sample()?.dark)return;
  const room=frame?.rooms.find(r=>r.figures.some(f=>f.seatId===effect.subjectId)),figure=room?.figures.find(f=>f.seatId===effect.subjectId),parent=holder._boardV2Paint?.rooms.get(room?.room);if(!figure||!parent)return;
  const f=effect.blockFrame,rect=figure.press,center=[rect.left+rect.side/2,rect.top+rect.side/2],group=el('div',null,'bv2-block-fx');group.dataset.blockId=effect.occurrence.id;group.setAttribute('aria-hidden','true');parent.append(group);
  const layer=(variable,opacity,scale=1)=>{const node=el('span');node.style.backgroundImage=`var(${variable})`;node.style.opacity=String(opacity);node.style.transform=`scale(${scale})`;putBox(node,{left:center[0]-rect.side,top:center[1]-rect.side,width:rect.side*2,height:rect.side*2});group.append(node);};
  layer('--board-v2-motion-fx-impact-1',f.star.on?1:0,f.star.scale);layer(`--board-v2-motion-fx-shield-${Math.max(1,f.shield.frame)}`,f.shield.opacity,f.shield.scale);layer('--board-v2-motion-fx-block-ring',f.ring.opacity,f.ring.scale);layer(`--board-v2-motion-fx-block-particles-${Math.max(1,f.particles.frame)}`,f.particles.opacity);
  const label=el('strong','ATTACK BLOCKED'),width=Math.min(128,room.panel.width-4),height=32,place=labelBox({rect:{...rect,press:center},panel:room.panel,size:[width,height],caption:{left:0,top:0,width:room.panel.width,height:room.panel.cap}});putBox(label,{...place,width,height});label.style.opacity=String(f.label.opacity);label.style.transform=`scale(${f.label.scale})`;group.append(label);
  for(const node of holder._boardV2Paint.actors.get(effect.subjectId)?.querySelectorAll('.bv2-figure')??[])node.style.translate=`${f.brace[0]}px ${f.brace[1]}px`;
 }
 function paintNight(){
  const night=blackout.sample();
  for(const room of frame?.rooms??[]){const section=holder._boardV2Paint?.rooms.get(room.room);if(!section)continue;
   for(const node of section.querySelectorAll('[data-planet-night]'))node.remove();
   if(!night)continue;
   const layer=el('span',null,'bv2-night-layer');layer.dataset.planetNight='dark';layer.setAttribute('aria-hidden','true');layer.style.backgroundImage=`var(${room.room==='hospital'?'--board-v2-film-lighting-hospital-ward-four-dark':`--board-v2-motion-${room.room}-dark`})`;layer.style.opacity=String(night.film.darkness);putBox(layer,{left:room.frame.tx,top:room.frame.ty,width:1024*room.frame.k,height:768*room.frame.k});section.append(layer);
   for(const r of slotRects(room.room,model.playerCount,room.panel)){const marker=el('span',null,'bv2-night-layer');marker.dataset.planetNight='marker';marker.setAttribute('aria-hidden','true');marker.style.backgroundImage=`var(--board-v2-motion-marker-${night.film.markers.style})`;marker.style.opacity=String(night.film.markers.opacity);putBox(marker,{left:r.left,top:r.top,width:r.side,height:r.side});section.append(marker);}
  }
 }
 function renderTargets(){
  targets.replaceChildren();const action=model.action;if(!layout?.fits||!action)return;
  for(const choice of action.choices){
   if(action.type==='MOVE'&&action.step==='targets')continue;
   const room=roomFor(choice.value);if(!room||!['MOVE','SELECT_BLACKOUT_SLOT'].includes(action.type))continue;
   const r=slotRects(room,model.playerCount,layout.board.panels[room]).find(s=>s.id===choice.value),b=layout.board.boxes[room];
   const target=button(choice.label,'choose',choice.value);target.className='bv2-slot-target';target.id=`planet-slot-${choice.value}`;target.setAttribute('aria-label',`Choose empty position ${choice.label}`);putBox(target,{left:b.left+layout.board.shell.border+r.left,top:b.top+layout.board.shell.border+r.top,width:r.side,height:r.side});targets.append(target);
  }
  const absent=action.choices.filter(c=>/^seat-[1-9]$/.test(c.value)&&!model.board?.seats.find(s=>s.seatId===c.value)?.location);
  if(absent.length){const memorial=el('div',null,'planet-offboard');memorial.append(el('span','Off board'));for(const choice of absent)memorial.append(button(choice.label,'choose',choice.value));targets.append(memorial);}
  if(sheet.hidden){const row=el('div',null,'planet-choice-row');putBox(row,layout.choosing);row.append(button('Cancel','close'),el('span',`${action.selected.length} selected`));const abstain=action.choices.find(c=>c.value==='abstain');if(abstain)row.append(button(abstain.label,'choose',abstain.value));targets.append(row);}
 }
 function render(next){
  if(disposed)return;model=next;setCrewPictureSurface(root,model.versions);
  root.dataset.planetPanel=model.panel;root.dataset.connection=model.connection;root.dataset.surface=model.surface;root.dataset.mode=model.mode;root.dataset.motion=reduced()?'reduced':'normal';root.dataset.blackout=model.dark?'dark':'none';
  phase.textContent=`${model.mode==='synthetic'?'SYNTHETIC · ':''}${model.round===null?'Connecting':`R${model.round} · ${(model.phase?.kind==='BLACKHOLE_PRESENTATION'?'BLACKHOLE SYNC':model.phase?.kind==='NAV_SETTING'?'SETTING COURSE':model.phase?.kind.replaceAll('_',' '))??''}${model.activeSeatId?` · P${model.activeSeatId.slice(5)}`:''}`}`;
  timer.textContent=model.phase?.remainingMs==null?'—':`${Math.ceil(model.phase.remainingMs/1000)}s`;timer.setAttribute('aria-label','Phase time remaining');
  offices.textContent=`Captain ${number(model.offices?.captainSeatId)} · Officer ${number(model.offices?.officerSeatId)}${model.offices?.blockedSeatId?` · Move blocked: ${number(model.offices.blockedSeatId)}`:''}`;
  checkpoint.textContent=(model.boardLabel?`${model.boardLabel} · `:'')+(model.talk?`Private talk: ${number(model.talk.actorSeatId)} + ${number(model.talk.targetSeatId)}`:`Turn: ${number(model.activeSeatId)}`);
  if(model.phase?.kind==='NAV_SETTING')checkpoint.textContent=(model.boardLabel?`${model.boardLabel} · `:'')+'The course is being set.';
  if(model.action?.prompt)checkpoint.textContent=model.action.prompt;
  checkpointText=checkpoint.textContent;
  instruction.textContent=model.action?.prompt??(model.dark?'Blackout':model.result?`${model.result.winner??'No team'} · ${model.result.reason.replaceAll('_',' ')}${model.result.alienCoWinner?' · Alien co-victory':''}`:'');
  rosterText.replaceChildren();for(const seat of model.board?.seats??[]){const identity=model.identities.find(i=>i.seatId===seat.seatId);rosterText.append(el('li',`${number(seat.seatId)}${identity?.displayName?`, ${identity.displayName}`:''}: ${seat.health}, ${seat.location??'off board'}${seat.slotId?`, ${seat.slotId}`:''}${seat.jailed?', detained':''}${model.offices?.captainSeatId===seat.seatId?', Captain':''}${model.offices?.officerSeatId===seat.seatId?', Officer':''}${seat.health==='Injured'&&seat.medical&&seat.medical.rescueOpportunity!=='CLOSED'&&seat.rescueDueAfterRound!==null?`, Rescue possible through Round ${seat.rescueDueAfterRound}`:''}.`));}
  resultPanel.replaceChildren();resultPanel.hidden=true;
  if(model.phase?.kind==='VOTE_RESULT'&&model.lastTally){resultPanel.hidden=false;resultPanel.append(el('h2',model.lastTally.kind==='JAIL_VOTE'?'Jail vote result':'Captain election result'),el('p',model.lastTally.outcome.replaceAll('_',' ')));for(const [seatId,count]of Object.entries(model.lastTally.counts))resultPanel.append(el('p',`${number(seatId)}: ${count}`));}
  if(model.result){resultPanel.hidden=false;const side=planetTerminalArrival(model),banner=el('h2',model.result.winner?`${model.result.winner} reached its planet`:'No winner','planet-end-banner');banner.prepend(library.art(`en-banner-${side?side.toLowerCase():'none'}`,'planet-library-fill'));resultPanel.append(banner,el('p',model.result.reason.replaceAll('_',' ')));if(model.result.alienCoWinner)resultPanel.append(el('p','Alien co-victory'));for(const reveal of model.endReveal?.roles??[])resultPanel.append(el('p',`${number(reveal.seatId)} · ${reveal.role}`));if(model.endReveal){const code=el('p',`Original Code: ${model.endReveal.code.map(number).join(', ')}`,'planet-end-code');code.prepend(library.art('en-code'));resultPanel.append(code);}}
  if(model.result&&terminalAction)resultPanel.append(terminalAction);
  if(model.concealed)resultPanel.hidden=true;
  status.textContent=model.message??'';status.hidden=!model.message;
  pass.disabled=!model.canPass;pass.hidden=model.surface==='display'||!!model.action||model.concealed;
  nav.hidden=model.surface==='display'||model.concealed;
  if(lastPanel!==model.panel){drawings.clear();more=false;lastPanel=model.panel;}
  if(model.privateArea===null||model.concealed||model.dark||model.phase?.expired)drawings.clear();
  const viewport={width:win.innerWidth,height:win.innerHeight};
  layout=model.playerCount?turnsLayout(viewport,model.playerCount,{insets:safeInsets}):null;
  holder.hidden=model.concealed||!layout?.fits;
  if(layout?.fits){
   putBox(header,{left:0,top:0,width:viewport.width,height:layout.board.shell.top});putBox(nav,{left:0,top:layout.board.navTop,width:viewport.width,height:viewport.height-layout.board.navTop});
   putBox(pass,{left:layout.board.pass.cx-layout.board.pass.r,top:layout.board.pass.cy-layout.board.pass.r,width:2*layout.board.pass.r,height:2*layout.board.pass.r});putBox(sheet,['card','windows','promises','hospital','navigation'].includes(model.panel)||['PANEL_CODE','OFFER_PROMISE'].includes(model.action?.type)?{left:6,top:layout.board.shell.top+6,width:viewport.width-12,height:layout.board.navTop-layout.board.shell.top-12}:layout.sheet);
   const seats=(model.board?.seats??[]).map(s=>({...s,...model.identities.find(i=>i.seatId===s.seatId)}));
   frame=boardV2SceneFrame(model.playerCount,seats,{panels:layout.board.panels,pressAreas:Object.fromEntries(BOARD_ROOMS.map(room=>[room,slotRects(room,model.playerCount,layout.board.panels[room])])),geometry:{sceneOf,slotsOf}});
   if(frame.problems.length){frame=null;holder.replaceChildren(el('p','The authorized board placement could not be drawn.'));}
  }else {frame=null;holder.replaceChildren();if(model.playerCount&&!model.concealed)status.textContent='This screen is too short for the fixed board. Rotate or increase its height.';}
  const key=JSON.stringify([model.versions,model.panel,more,model.action,model.privateArea,model.recovery,model.concealed,model.phase?.expired,model.round,model.result]);
  if(key!==uiKey){uiKey=key;renderUI();renderTargets();}
  nav.hidden=model.surface==='display'||model.concealed||targets.querySelector('.planet-choice-row')!==null;
  if(layout?.sheet){sheetBody.style.maxHeight=`${Math.max(44,['card','windows','promises','hospital','navigation'].includes(model.panel)||['PANEL_CODE','OFFER_PROMISE'].includes(model.action?.type)?layout.board.navTop-layout.board.shell.top-76:layout.sheet.body.height-10)}px`;}
  const clock=model.presentation?{current:model.connection==='live'&&!model.phase.expired,kind:model.phase.kind,phaseId:model.phase.id,nowMs:model.presentation.nowMs,startedAt:model.presentation.startedAt,endsAt:model.presentation.endsAt}:null;
  const talk=model.talk&&clock?{hackId:model.talk.id,actorSeatId:model.talk.actorSeatId,targetSeatId:model.talk.targetSeatId,stage:model.phase.kind,phaseId:model.phase.id,current:clock.current,startedAt:clock.startedAt,endsAt:clock.endsAt,elapsedMs:clock.nowMs-clock.startedAt}:null;
  blackout.update(clock,model.presentation?.blackout?{...model.presentation.blackout,snapshotId:model.presentation.blackout.windowId}:null,{visible:!model.concealed&&document.visibilityState==='visible',reducedMotion:reduced()});
  capsule.update(talk,clock,{visible:!model.concealed&&document.visibilityState==='visible',reducedMotion:reduced()});
  if(planetOutcomeTakesPrecedence(model))capsule.settle();
  motion.update(model,{reducedMotion:reduced(),visible:completeArt()&&document.visibilityState==='visible',focused:document.hasFocus()});
  const text=(model.presentation?.events??[]).filter(e=>e.expiresAt>model.presentation.nowMs).map(planetOutcomeWords).join(' ');if(words.textContent!==text)words.textContent=text;
  if(raf!==null)win.cancelAnimationFrame(raf);paint();
 }
 const onClick=e=>{
  const target=e.target.closest('button');if(!target||!root.contains(target)||target.disabled)return;
  if(target.dataset.moveRoom){controller.begin('MOVE');controller.choose(target.dataset.moveRoom);return;}
  if(target.dataset.intent==='action/choose'){controller.choose(target.dataset.value);return;}
  const action=target.dataset.planetAction,value=target.dataset.value;
  if(action==='panel'){if(value==='more'){more=!more;uiKey=null;render(controller.getModel());}else {more=false;controller.openPanel(value);}}
  if(action==='begin'){more=false;controller.begin(value);}
  if(action==='choose')controller.choose(value);
  if(action==='confirm')void controller.confirm();
  if(action==='close'){more=false;controller.dismiss();}
  if(action==='check')void controller.checkReceipt();
  if(action==='retry')void controller.retry();
 };
 const onKey=e=>{if(e.key==='Escape'){more=false;controller.dismiss();document.getElementById('planet-nav-board')?.focus();}};
 const onVisibility=()=>{controller.setVisible(document.visibilityState==='visible');if(document.visibilityState!=='visible'){motion.cancel();capsule.settle();blackout.settle();films.clear();rescue.clear();cinematic.clear();clearBlocks();drawings.clear();if(raf!==null)win.cancelAnimationFrame(raf);raf=null;}};
 const onMotion=()=>{motion.cancel();capsule.settle();blackout.settle();films.clear();rescue.clear();cinematic.clear();clearBlocks();if(raf!==null)win.cancelAnimationFrame(raf);raf=null;if(model)render(controller.getModel());};
 const onArt=()=>{uiKey=null;if(model)render(controller.getModel());};
 const onBlur=()=>{controller.dismiss();motion.cancel();capsule.settle();blackout.settle();films.clear();rescue.clear();cinematic.clear();clearBlocks();drawings.clear();if(raf!==null)win.cancelAnimationFrame(raf);raf=null;};
 const onFocus=()=>{if(model)render(controller.getModel());};
 const onResize=()=>{safeInsets=readInsets();uiKey=null;if(model)render(controller.getModel());};
 root.addEventListener('click',onClick);root.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',onVisibility);document.addEventListener('mothership:art-ready',onArt);media.addEventListener('change',onMotion);win.addEventListener('resize',onResize);win.addEventListener('blur',onBlur);win.addEventListener('focus',onFocus);
 const stop=controller.subscribe(render);
 return {dispose(){disposed=true;stop();root.removeEventListener('click',onClick);root.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('mothership:art-ready',onArt);media.removeEventListener('change',onMotion);win.removeEventListener('resize',onResize);win.removeEventListener('blur',onBlur);win.removeEventListener('focus',onFocus);if(raf!==null)win.cancelAnimationFrame(raf);disposeCrewMounts(holder);motion.dispose();capsule.dispose();blackout.dispose();films.dispose();rescue.dispose();cinematic.dispose();drawings.clear();delete root.dataset.crewArt;root.replaceChildren();}};
}
