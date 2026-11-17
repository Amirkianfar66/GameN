import {crewPortraitVariable,disposeCrewMounts,setCrewMountActivity,setCrewPictureSurface} from '../crew-runtime.mjs';
import {PLANET_ACTION_LABELS,PLANET_PROMISE_LABELS,planetPromiseTerms,planetBlackholePresentation,planetTerminalArrival,planetPanelRequestText,planetHasPrivateFeedback,planetRoundOrderText} from '@mothership/presentation';
import {PlanetDrawingSchema} from '@mothership/contracts';
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
import {phoneLayouts,phoneRoom,createBlackoutGeometry} from './phone-layout.mjs';
import {labelPhoneControl,phoneActionIcon,phonePanelIcon} from './phone-controls.mjs';
import {createFoodUi} from './food-ui.mjs';
import {foodGauge} from './food-gauge.mjs';
import {FRAME} from '../scene-drawing/body.mjs';
import {INJURED} from '../scene-drawing/gestures.mjs';
import {outfitFor} from '../scene-drawing/wardrobe.mjs';
import {mountRoomScene,roomSceneFrame,roomScenePlaces,ROOM_SCENE_DEFAULTS} from '../../../../design/phone-ui/components/room-scene/room-scene.mjs';
import {roomSceneArtReady,roomSceneHandlers,roomSceneInput,roomSceneInputKey,roomSceneKey,roomSceneLifecycle,roomScenePeople,roomSceneStatus} from './room-scene-input.mjs';
import {mountPhoneShell} from '../../../../design/phone-ui/components/phone-shell/phone-shell.mjs';
import {connectShellLifecycle,createServerClock,phaseClosed,shellFocusOrder,shellHandlers,shellHostSheet,shellInput,shellRuns} from './shell-input.mjs';

const windowNames={A_B:'Room A ↔ Room B',A_HOSPITAL:'Room A ↔ Hospital',B_JAIL:'Room B ↔ Jail'};
const number=id=>id?`Player ${id.slice(5)}`:'—';
const putBox=(node,r)=>{if(!r)return;for(const k of ['left','top','width','height'])if(Number.isFinite(r[k]))node.style[k]=`${r[k]}px`;};
const roomFor=slot=>BOARD_ROOMS.find(room=>slotsOf(room,9).some(s=>s.id===slot));
const [rigX,rigY,rigSide]=FRAME.box,[rigAnchorX,rigAnchorY]=FRAME.anchor;

/** Native consumer renderer: public scene DTOs feed approved pure drawings, never legacy wire views. */
export function mountPlanetRenderer(root,controller,{cinematics=[],terminalAction=null,settings=null,food=null,reconnect=null,hostSheet=null}={}){
 const document=root.ownerDocument,win=document.defaultView;
 const library=createPlanetLibrary(document);
 const el=(tag,text=null,cls=null)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,act,value=null)=>{const n=el('button',text);n.type='button';n.dataset.planetAction=act;if(value!==null)n.dataset.value=value;return n;};
 root.classList.add('ms-shell','planet-app');root.dataset.boardLayout='board-v2';root.dataset.screen='match';
 // The match's frame is Designer's phone shell (design/phone-ui/components/phone-shell; the owner's plan of
 // 16 November 2026, release 2): its top bar, tabs, target bar, chip, banners, toast and the docked sheet's
 // frame. This renderer gives it this phone's input (shell-input.mjs), mounts the stage in it, the game's own
 // sheet content in its sheet body and Food's gauge beside its clock, and owns its lifecycle.
 // What the old header also said for screen readers stays, unseen: the offices, the shared checkpoint and the
 // current step (#ms-action-step, which the board's position targets name as their description).
 const facts=el('div',null,'ms-visually-hidden planet-match-facts'),offices=el('small'),checkpoint=el('small',null,'planet-shared-checkpoint'),instruction=el('p');
 instruction.id='ms-action-step';facts.append(offices,checkpoint,instruction);
 const foodUi=createFoodUi(document),foodClock=foodUi.h('span.planet-food.fs-clock.food-native-clock');let gaugeDoses=null;
 const stage=el('main',null,'planet-stage');stage.setAttribute('aria-label','Ship view');
 const holder=el('div',null,'bv2-mount planet-board'),targets=el('div',null,'planet-targets');
 // The room scene's host: the room area between the bars, under the holder (which lays today's films over it).
 const sceneHost=el('div',null,'planet-room-scene');sceneHost.hidden=true;Object.assign(sceneHost.style,{position:'absolute',left:'0px',top:'0px'});
 // The game's own sheet content (release 3 replaces it with Designer's components), mounted in the shell's sheet body.
 const sheetBody=el('div',null,'planet-sheet-body ms-private__panel');
 const status=el('p',null,'planet-status');status.setAttribute('role','status');
 const words=el('p',null,'ms-visually-hidden');words.setAttribute('aria-live','polite');
 const rosterText=el('ul',null,'ms-visually-hidden');rosterText.setAttribute('aria-label','Authorized board facts');
 const resultPanel=el('section',null,'planet-result');resultPanel.setAttribute('aria-label','Authoritative result');
 const scrollSpace=el('div',null,'planet-scroll-space');scrollSpace.setAttribute('aria-hidden','true');
 const shellHost=el('div',null,'planet-shell-host');
 // The frozen Food port's shared display places its banner under `.planet-header` (food-app.mjs mountFoodPublic):
 // an empty, unseen box the height of the shell's top bar keeps that place.
 const barMeasure=el('div',null,'planet-header planet-bar-measure');barMeasure.setAttribute('aria-hidden','true');
 stage.append(sceneHost,holder,targets,scrollSpace);root.replaceChildren(shellHost,barMeasure,words,rosterText,facts);
 const media=win.matchMedia('(prefers-reduced-motion: reduce)'),motion=createPlanetMotion({transitDurationMs:cinematics.find(c=>c.name==='transit')?.durationMs??0}),capsule=createBoardV2Capsule(),blackout=createBoardV2Blackout(),films=createBoardV2Films(root,holder),rescue=createPlanetRescuePainter(holder),cinematic=createPlanetCinematic(holder,cinematics);
 let checkpointText='';
 let model=null,layout=null,frame=null,raf=null,disposed=false,more=false,uiKey=null,lastPanel='board',sceneMode='room',currentRoom='room-a',allLayouts=null;
 let foodSurface={active:false,exclusive:false,top:null,bottom:null};
 const blackoutGeometry=createBlackoutGeometry();let targetKey=null,lastOwnRoom=null,lastOwnTalk=null;
 let scene=null,sceneOn=false,sceneKey=null,sceneInput=null,sceneMarks=null,sceneRunning=true,blurred=false;
 // The shell's state here: its last input, the frame of its open sheet, the board's List, the round last seen
 // live (the reconnecting bar names it), a toast (kept, so it shows its whole time once), its layout, and the
 // model painted before this one (a phase that closed under an open choice is told from the two: phaseClosed()).
 let shellKey=null,shellFrame=null,listOpen=false,listKey=null,lastRound=null,toast=null,shellRunning=true,shellLayout=null,choosing=false,opener=null,before=null;
 // The match's trusted server time (G18), observed on each model: the round stamp's clock, with shell-input.mjs roundStart().
 const serverClock=createServerClock({monotonic:()=>win.performance.now()});
 // The shell's own element (its mount's `element`) holds its controls: the sheet's footer actions and the controls
 // the focus returns to are found there by their intents.
 const focusConfirm=()=>shell.element?.querySelector('[data-intent="sheet-action"][data-value="confirm"]')?.focus({preventScroll:true});
 const focusBack=()=>{const pick=shellFocusOrder(opener,{choosing}).map(css=>shell.element?.querySelector(css)).find(Boolean);pick?.focus({preventScroll:true});};
 const shell=mountPhoneShell(shellHost,{},shellHandlers({
  live:()=>!disposed&&!!model,
  openPanel:panel=>{more=false;controller.openPanel(panel);},
  begin:type=>{more=false;controller.begin(type);},
  confirm:()=>void controller.confirm(),
  dismiss:()=>{more=false;listOpen=false;controller.dismiss();},
  toggleView:()=>switchView(),
  showBoard:()=>{sceneMode='board';uiKey=null;render(controller.getModel());},
  openList:()=>{listOpen=true;render(controller.getModel());},
  closeList:()=>{listOpen=false;render(controller.getModel());},
  reconnect:()=>reconnect?.(),
  layout:next=>{shellLayout=next;render(controller.getModel());},
  opened:detail=>{opener=detail;},
  focusReturn:()=>focusBack(),
  // The host sheet (hostSheet: { frame(), mount(body), action(id), back(), close(), toast() }), while it is the open sheet.
  host:hostSheet&&{open:()=>shellFrame?.kind==='host',action:id=>{hostSheet.action(id);if(model)render(controller.getModel());},
   back:()=>{hostSheet.back();uiKey=null;if(model)render(controller.getModel());},close:()=>hostSheet.close()},
 }));
 shell.stage.append(stage);
 // The game's own result window and status line lie over the room in the shell's cover: under its bars, target
 // bar, banner, toast and sheet, as the pack layers them (the handoff: "a result window over the room"). Until
 // the result window's component (#267) they are today's, between the bars as before.
 shell.slot('cover').append(resultPanel,status);
 const rects=(room,count,panel)=>sceneMode==='room'?allLayouts.roomPresses[room]:allLayouts.boardPresses[room];
 const drawings=new Map();
 const reduced=()=>model?.motion==='reduced'||document.documentElement.dataset.motion==='reduced'||media.matches;
 const completeArt=()=>{const loaded=new Set((document.documentElement.dataset.art??'').split(' '));return ['public-board','player-ui','roles','scene-art','abilities','board-v2-art','board-v2-motion-art','board-v2-films-art'].every(name=>loaded.has(name));};
 const artForRoom=room=>room==='hospital'?
  [{id:'back',cssVar:'--board-v2-film-scenes-hospital-ward-four-back',sceneDepth:-1000},...Object.entries(sceneOf(room,model.playerCount).layers).map(([id,layer])=>({id,cssVar:`--board-v2-film-scenes-hospital-ward-four-${id}`,sceneDepth:layer.depth}))]:
  [{id:'back',cssVar:`--bm-scene-${room}-back`,sceneDepth:-1000},...Object.entries(sceneOf(room,model.playerCount).layers).map(([id,layer])=>({id,cssVar:`--bm-scene-${room}-${id.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`,sceneDepth:layer.depth}))];
 const addText=(text,tag='p')=>sheetBody.append(el(tag,text));
 const beginButton=type=>{const b=labelPhoneControl(button(PLANET_ACTION_LABELS[type],'begin',type),PLANET_ACTION_LABELS[type],phoneActionIcon(type));b.id=`planet-action-${type}`;b.classList.add('planet-action-tile');return b;};
 function rosterGrid({choices=[],selected=[],counts=null,result=false}={}){
  const wrap=el('div',null,'planet-roster');
  const grid=el('div',null,'planet-roster-grid');grid.setAttribute('aria-label',result?'Vote totals by player':'Choose a player');
  for(let n=1;n<=9;n++){
   if(n>model.playerCount){const empty=el('span',null,'planet-roster-empty');empty.setAttribute('aria-hidden','true');grid.append(empty);continue;}
   const id=`seat-${n}`,who=model.identities.find(i=>i.seatId===id),choice=choices.find(c=>c.value===id);
   const cell=result?el('div',null,'planet-roster-cell'):button('', 'choose',id);cell.classList.add('planet-roster-cell');cell.dataset.seat=id;
   const image=el('span',null,'planet-roster-portrait');image.setAttribute('aria-hidden','true');if(who?.characterId)image.style.backgroundImage=crewPortraitVariable(who.characterId,model.versions);
   const seat=el('b',String(n),'planet-roster-seat'),name=el('span',who?.displayName??number(id),'planet-roster-name');seat.setAttribute('aria-hidden','true');cell.append(seat,image,name);cell.dataset.result=String(result);
   if(id===model.ownSeatId){const you=el('small','You','planet-roster-you');you.setAttribute('aria-hidden','true');cell.append(you);}
   if(result){const published=Object.hasOwn(counts,id),count=el('strong',published?String(counts[id]):'—','planet-vote-count');count.setAttribute('aria-hidden','true');name.setAttribute('aria-hidden','true');cell.append(count);cell.dataset.winner=String(model.lastTally.selectedSeatId===id);cell.setAttribute('role','group');cell.setAttribute('aria-label',`Player ${n}, ${who?.displayName??number(id)}, ${published?`${counts[id]} votes`:'count not published'}${id===model.ownSeatId?', You':''}`);}
   else{cell.id=`planet-choice-${id}`;cell.disabled=!choice;cell.setAttribute('aria-pressed',String(selected.includes(id)));cell.setAttribute('aria-label',`Player ${n}, ${who?.displayName??number(id)}${id===model.ownSeatId?', You':''}${choice?'':', unavailable'}`);if(!choice)cell.append(el('small','Unavailable','planet-roster-note'));}
   grid.append(cell);
  }wrap.append(grid);return wrap;
 }
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
  if(!p?.promiseQuota)return;
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
 // An action's body. Its name is the sheet's title and its Pass, Vote or Register is the sheet's footer action
 // (shell-input.mjs shellSheet); choosing on the scene or the board shows the target bar instead.
 function renderAction(){
  const action=model.action;
  if(!action.confirmation)addText(action.prompt);
  if(action.confirmation)addText(action.confirmation);
  if(action.type==='PANEL_CODE')sheetBody.append(library.panelConsole(model,model.privateArea));
  if(action.type==='VOTE'&&action.step==='targets'){
   sheetBody.append(rosterGrid({choices:action.choices,selected:action.selected}));
   const abstain=action.choices.find(c=>c.value==='abstain');if(abstain)sheetBody.append(button('Abstain','choose','abstain'));return;
  }
  const choices=el('div',null,['PANEL_CODE','SUBMIT_CODE'].includes(action.type)?'planet-number-grid':'planet-choice-grid');
  const visibleChoices=action.type==='DECLARE_HACK_SIDE'&&action.step==='faction'?['Blue','Red','Alien'].map(value=>({value,label:value})):action.choices;
  for(const choice of visibleChoices){const b=button(choice.label,'choose',choice.value);b.id=`planet-choice-${choice.value}`;b.disabled=!action.choices.some(c=>c.value===choice.value);library.decorateChoice(b,action,choice);choices.append(b);}sheetBody.append(choices);
 }
 /** The game's own content for the shell's open sheet (`sheetFrame`, from shellSheet); its title, Back, Close and footer are the shell's. */
 function renderUI(sheetFrame){
  const focus=document.activeElement?.id;
  sheetBody.replaceChildren();
  if(model.concealed){more=false;drawings.clear();return;}
  if(!sheetFrame)return;
  const p=model.privateArea;
  if(sheetFrame.kind==='recovery'){addText('Check the original receipt. No replacement command is permitted.');const check=button('Check receipt','check');check.id='planet-check';check.disabled=!model.recovery.canCheck;sheetBody.append(check);if(model.recovery.canRetry)sheetBody.append(button('Retry original command','retry'));}
  // The board's List (sheet 29): the same choice as text, which the old target bar carried as "Target list".
  else if(sheetFrame.kind==='target-list'){for(const choice of model.action.choices)if(/^seat-[1-9]$/.test(choice.value)){const who=model.identities.find(i=>i.seatId===choice.value),b=button(`${who?.displayName??choice.label} · ${number(choice.value)}`,'choose',choice.value);b.id=`planet-list-${choice.value}`;sheetBody.append(b);}}
  else if(sheetFrame.kind==='pass'){/* Sheet 27.3: the title asks; Cancel and Pass are the sheet's own. */}
  else if(sheetFrame.kind==='action')renderAction();
  else if(sheetFrame.kind==='settings')settings?.(sheetBody);
  else if(sheetFrame.kind==='host')hostSheet?.mount(sheetBody);
  else if(sheetFrame.kind==='dark'){addText('People and windows are hidden.');if(model.panel==='actions')for(const o of p?.offers??[])sheetBody.append(beginButton(o.type));}
  else if(sheetFrame.kind==='expired'){/* The title says it: waiting for the server. */}
  else if(sheetFrame.kind==='panels'){if(food&&model.food)sheetBody.append(button('Tasks','food-tasks'));for(const [label,value]of [['Windows','windows'],['Navigation','navigation'],['Hospital panel','hospital'],['Players','players'],['Round order','round-order']]){const b=labelPhoneControl(button(label,'panel',value),label,phonePanelIcon(value));b.classList.add('planet-panel-option');sheetBody.append(b);}}
  else if(sheetFrame.kind==='players'){for(const seat of model.board?.seats??[]){const who=model.identities.find(i=>i.seatId===seat.seatId);addText(`${number(seat.seatId)} · ${who?.displayName??''} · ${model.food?.step?.kind==='AWAY'&&model.food.step.awaySeatIds.includes(seat.seatId)?'Away on the Food Supply Task':`${seat.location??'Off board'} · ${seat.health}${seat.jailed?' · Detained':''}`}`);}}
  else if(sheetFrame.kind==='round-order'){addText('Follow the current phase and the server clock.');addText(planetRoundOrderText(model.versions));}
  else if(sheetFrame.kind==='card')renderCard(p);
  else if(sheetFrame.kind==='promises')renderPromises(p);
  else if(sheetFrame.kind==='windows')renderWindows(p);
  else if(sheetFrame.kind==='navigation'){
   const setting=planetHasPrivateFeedback(model.versions)&&model.phase?.kind==='NAV_SETTING';if(setting)addText('The course is being set.');if(p?.navigation){const picture=library.route(p.navigation);if(picture)sheetBody.append(picture);addText(`Position: ${p.navigation.position}`);if(!setting)addText(`Final direction: ${p.navigation.direction??'awaiting resolution'}`);if(p.offers?.some(o=>o.type==='CHOOSE_NAV_DIRECTION'))sheetBody.append(beginButton('CHOOSE_NAV_DIRECTION'));if(p.offers?.some(o=>o.type==='CONFIRM_NAVIGATION'))sheetBody.append(beginButton('CONFIRM_NAVIGATION'));}
   else addText('Current route and direction are private to the offices.');
  }else if(sheetFrame.kind==='hospital'){
   addText('One patient attempt with the Doctor’s original player number. A registered request resolves later.');
   if(model.board?.seats.some(s=>s.seatId===model.ownSeatId&&s.location==='Hospital'&&s.health!=='Eliminated'))sheetBody.append(library.panelConsole(model,p));
   const requestText=planetPanelRequestText(p?.panelRequest);if(requestText)addText(requestText);
   if(p?.panelAttemptSpent){if(!requestText)addText('Your panel attempt is spent.');}else if(p?.offers?.some(o=>o.type==='PANEL_CODE'))sheetBody.append(beginButton('PANEL_CODE'));else addText('The panel is not currently available.');
  }else if(sheetFrame.kind==='actions'){
   if(food&&model.food)sheetBody.append(button('Tasks','food-tasks'));
   if(p?.blackoutTargeting?.selectedSlotId)addText(`Your fixed selection: ${p.blackoutTargeting.selectedSlotId}.`);
   if(p?.ownBallot?.phaseId===model.phase.id)addText(`Your registered ballot: ${p.ownBallot.targetSeatId?number(p.ownBallot.targetSeatId):'Abstain'}.`);
   if(p?.captainCommands)for(const [type,used]of [['CAPTAIN_RELEASE',p.captainCommands.releaseUsed],['CAPTAIN_EJECT',p.captainCommands.ejectUsed]]){const b=beginButton(type),available=p.offers?.some(o=>o.type===type);b.disabled=used||!available;labelPhoneControl(b,`${PLANET_ACTION_LABELS[type]} · ${used?'USED':available?'AVAILABLE':'UNAVAILABLE'}`,phoneActionIcon(type));b.dataset.captainPlate=used?'used':available?'available':'unavailable';b.style.backgroundImage=`var(--board-v2-film-captain-plate-${type==='CAPTAIN_RELEASE'?'release':'eject'}-${b.dataset.captainPlate})`;sheetBody.append(b);}
   if(p?.hackFeedback)addText(p.hackFeedback.status==='DECLARED'?`Claim: ${p.hackFeedback.declaredSide}. Unverified.`:p.hackFeedback.status==='NO_DECLARATION'?'No side was declared.':'Waiting for the private claim.');
   const offers=p?.offers?.filter(o=>!['PASS_TURN','MOVE','SHOW_WINDOW','ACCEPT_PROMISE','DECLINE_PROMISE','OFFER_PROMISE','CHOOSE_NAV_DIRECTION','CONFIRM_NAVIGATION','PANEL_CODE','CAPTAIN_RELEASE','CAPTAIN_EJECT'].includes(o.type))??[];
   for(const offer of offers)sheetBody.append(beginButton(offer.type));
   if(!offers.length)addText('No action is currently offered.');
  }
  mountSheetBody();
  if(focus&&root.querySelector(`[id="${CSS.escape(focus)}"]`))root.querySelector(`[id="${CSS.escape(focus)}"]`).focus({preventScroll:true});
  else if(model.action?.step==='confirm')focusConfirm();
 }
 /** The game's content goes in the shell's sheet body; a new sheet (a new id) starts with an empty one. */
 function mountSheetBody(){const body=shell.sheetBody;if(body&&sheetBody.parentNode!==body)body.append(sheetBody);}
 /** The first tab: Board and Room switch the view on this phone only (today's Board button); it never sends a move. */
 function switchView(){sceneMode=sceneMode==='room'?'board':'room';if(sceneMode==='room'&&!model.action&&lastOwnRoom)currentRoom=lastOwnTalk?'capsule':lastOwnRoom;uiKey=null;if(model.action)render(controller.getModel());else controller.dismiss();}
 /** The shell's own motion (a toast, a long press) runs only while the page shows and the window has the focus. */
 function syncShellActivity(){const run=shellRuns({visible:document.visibilityState==='visible',blurred});if(run!==shellRunning){shellRunning=run;if(run)shell.resume();else shell.suspend();}}
 // The room view on a player's phone is the room scene's (design/phone-ui/components/room-scene; the
 // owner, 15 November 2026, for all five rooms). This renderer gives it the room's inputs, sends its taps
 // to the controller and owns its lifecycle; the board view, the capsule and the display stay on paintBoardV2.
 function retireBoardPaint(){films.clear();rescue.clear();cinematic.clear();clearBlocks();disposeCrewMounts(holder);holder._boardV2Paint?.board?.remove();holder.replaceChildren();delete holder._boardV2Paint;}
 function closeScene(){if(!scene)return;scene.dispose();scene=null;sceneKey=null;sceneInput=null;sceneMarks=null;sceneRunning=true;}
 function syncSceneActivity(){if(!scene)return;const run=document.visibilityState==='visible'&&!blurred&&!model?.concealed&&!foodSurface.exclusive;if(run!==sceneRunning){sceneRunning=run;if(run)scene.resume();else scene.suspend();}}
 function paintScene(){
  // The room area is the shell's stage (layout().stage, kept current by onLayout).
  const shown=shellLayout?.stage??shell.layout()?.stage,size={width:shown?.width??allLayouts.width,height:shown?.height??allLayouts.stageHeight};
  const input=roomSceneInput(model,{room:currentRoom,size,dark:blackout.sample()?.dark===true,reducedMotion:reduced(),interactive:!foodSurface.active,artReady:roomSceneArtReady(document.documentElement.dataset),monotonic:()=>win.performance.now()});
  // The pack hides the room's own control under a docked sheet (the shell's handoff, "A sheet").
  if(shellFrame)input.control=null;
  putBox(sceneHost,{left:0,top:0,...size});
  if(!scene){
   scene=mountRoomScene(sceneHost,input,roomSceneHandlers({choose:value=>controller.choose(value),openPanel:panel=>{more=false;controller.openPanel(panel);},focusNext:focusConfirm}));
   sceneKey=roomSceneKey(model);sceneInput=roomSceneInputKey(input);sceneRunning=true;syncSceneActivity();
  }else{const key=roomSceneInputKey(input);if(key!==sceneInput){sceneInput=key;scene.update(input);}}
  return sceneOverlay(input);
 }
 /** Today's films and effects in the scene's own films container (room-scene 0.4.0), which makes no stacking
  * context, so their z-indexes interleave with the room as on the board: one section per room, the current
  * one framed by the scene's layout(), the others by its framing and hidden, as the board's other rooms were. */
 function sceneOverlay(input){
  const shown=scene.layout(),insets=ROOM_SCENE_DEFAULTS.insets,count=model.playerCount;
  let owned=holder._boardV2Paint;
  if(!owned?.scene){
   const board=el('div',null,'planet-scene-films');Object.assign(board.style,{position:'absolute',pointerEvents:'none'});
   owned=holder._boardV2Paint={scene:true,board,rooms:new Map(),actors:new Map(),capsuleActors:new Map()};
  }
  if(owned.board.parentNode!==scene.films)scene.films.append(owned.board);putBox(owned.board,{left:0,top:0,...input.size});
  // The scene's people as the films see the board's actors: a detached stub each, whose figure a film hides
  // (a stand-in) or moves (the recoil). sceneFilmMarks() reads them back for the scene to draw.
  const here=new Set(shown.people.map(p=>String(p.seat)));
  for(const seat of here)if(!owned.actors.has(seat)){const actor=el('div');actor.append(el('span',null,'bv2-figure'));owned.actors.set(seat,actor);}
  for(const seat of owned.actors.keys())if(!here.has(seat))owned.actors.delete(seat);
  const away=new Set(model.food?.step?.kind==='AWAY'?model.food.step.awaySeatIds:[]);
  const seats=(model.board?.seats??[]).filter(s=>!away.has(s.seatId)).map(s=>({...s,...model.identities.find(i=>i.seatId===s.seatId)}));
  const rooms=[],presses={},boxes={},panels={};
  for(const room of BOARD_ROOMS){
   const here=room===currentRoom,slots=slotsOf(room,count);let f,panel,places;
   if(here){f={k:shown.frame.k,tx:shown.frame.tx,ty:shown.frame.ty};panel={width:shown.frame.panel.width,height:shown.frame.panel.height,cap:insets.top,pad:insets.bottom};places=shown.places.map(p=>({id:p.slot,left:p.left,top:p.top,side:p.side}));}
   else{const state={room,roster:count,size:input.size,insets,people:roomScenePeople(model,room),lighting:'lit',hold:null,roomArt:input.roomArt},framed=roomSceneFrame(state,null);
    f={k:framed.k,tx:framed.tx,ty:framed.ty};panel=framed.panel;places=roomScenePlaces(state,framed).map(p=>({id:p.id,left:p.left,top:p.top,side:p.side}));}
   presses[room]=places.map(p=>{const slot=slots.find(s=>s.id===p.id);return {...p,press:[f.tx+slot.pressAt[0]*f.k,f.ty+slot.pressAt[1]*f.k],badge:[f.tx+slot.badgeAt[0]*f.k,f.ty+slot.badgeAt[1]*f.k],frame:f};});
   // Who is where in the current room only while the scene's lit room shows them (layout().people).
   const present=here?new Set(shown.people.map(p=>String(p.seat))):null;
   const figures=seats.filter(s=>s.location===LOCATION_OF[room]&&(!present||present.has(s.seatId))).flatMap(s=>{
    const slot=slots.find(x=>x.id===s.slotId),rect=presses[room].find(r=>r.id===s.slotId);if(!slot||!rect)return [];
    const unit=slot.scale*f.k,gesture=s.health==='Eliminated'?slot.down:s.health==='Injured'?`${slot.gesture}${INJURED}`:slot.gesture;
    return [{seatId:s.seatId,slotId:slot.id,characterId:s.characterId,displayName:s.displayName,health:s.health,location:s.location,jailed:s.jailed===true,gesture,outfit:outfitFor(s.location),mirror:slot.mirror,depth:slot.depth,slot,sceneFrame:f,
     body:{left:f.tx+slot.at[0]*f.k-(rigAnchorX-rigX)*unit,top:f.ty+slot.at[1]*f.k-(rigAnchorY-rigY)*unit,side:rigSide*unit},press:rect,name:{left:rect.left+rect.side/2,top:Math.min(panel.height-panel.pad-26,rect.top+rect.side-2)}}];
   });
   rooms.push({room,panel,frame:f,figures,layers:[]});boxes[room]={left:0,top:0,...input.size};panels[room]=panel;
   let section=owned.rooms.get(room);
   if(!section){section=el('div',null,'planet-scene-room');section.dataset.room=room;section.setAttribute('aria-hidden','true');Object.assign(section.style,{position:'absolute',overflow:'hidden',pointerEvents:'none'});owned.rooms.set(room,section);owned.board.append(section);}
   putBox(section,{left:0,top:0,width:panel.width,height:panel.height});section.hidden=!here;
  }
  return {input,frame:{rooms,problems:[]},layout:{fits:true,board:{shell:{border:0,top:0},navTop:input.size.height,boxes,panels},contentHeight:input.size.height},rects:room=>presses[room],people:shown.people};
 }
 /** The films' stand-ins and the recoil, read back from the actor stubs, for the scene to draw (room-scene 0.4.0). */
 function sceneFilmMarks(){
  const owned=holder._boardV2Paint;if(!scene||!owned?.scene)return;
  const standIns=[];let brace=null;
  for(const [seat,actor]of owned.actors){const figure=actor.firstChild,moved=/^(-?[\d.]+)px (-?[\d.]+)px$/.exec(figure.style.translate);
   if(figure.style.visibility==='hidden')standIns.push(seat);if(moved&&(Number(moved[1])||Number(moved[2])))brace={seat,dx:Number(moved[1]),dy:Number(moved[2])};}
  const key=JSON.stringify([standIns,brace]);if(key!==sceneMarks){sceneMarks=key;scene.update({standIns,brace});}
 }
 /** The Officer's move block on the blocked person's press square, as on the board. The scene's tags show the offices. */
 function paintSceneMarks(view){
  const parent=holder._boardV2Paint?.rooms.get(currentRoom);if(!parent)return;
  const blocked=view.people.find(p=>String(p.seat)===model.offices?.blockedSeatId);let mark=parent.querySelector('.planet-move-block');
  if(!blocked){mark?.remove();return;}
  if(!mark){mark=el('span',null,'planet-move-block');mark.setAttribute('aria-hidden','true');parent.append(mark);}
  mark.style.left=`${blocked.left+blocked.side-16}px`;mark.style.top=`${blocked.top}px`;
 }
 function paint(){
  if(disposed||!model)return;raf=null;
  const sample=motion.sample();films.beforePaint();clearBlocks();
  const view=frame&&layout?.fits&&sceneOn?paintScene():null,shown=view?.frame??frame,where=view?.layout??layout,presses=view?view.rects:rects;
  if(frame&&layout?.fits){
   if(!view){
    const choosing=model.action?.choices??[],choices=choosing.filter(c=>/^seat-[1-9]$/.test(c.value)).map(c=>({...c,label:`${model.identities.find(i=>i.seatId===c.value)?.displayName??number(c.value)} · ${number(c.value)}`,id:`planet-seat-${c.value}`}));
    paintBoardV2(holder,frame,layout.board.boxes,{artForRoom,choices,marks:model.action?{picked:model.action.selected,numbered:['SUPPLY','SUBMIT_CODE'].includes(model.action.type)}:null,capsule:model.dark?null:capsule.sample(),canMove:model.surface==='player'&&sceneMode==='board',blackout:blackout.sample(),versions:model.versions,reducedMotion:reduced()});
    for(const [id,node]of holder._boardV2Paint?.rooms??[])node.hidden=sceneMode==='room'&&id!==currentRoom;
    if(holder._boardV2Paint?.capsule)holder._boardV2Paint.capsule.hidden=sceneMode==='room'&&currentRoom!=='capsule';
    paintNight();
    for(const heading of holder.querySelectorAll('button[data-move-room]')){const available=!model.dark&&model.canMove&&model.moveRooms.includes(heading.dataset.moveRoom);heading.disabled=!available;heading.setAttribute('aria-disabled',String(!available));heading.setAttribute('aria-label',`Move to ${heading.dataset.moveRoom}${available?'':', unavailable'}`);}
   }
   const seats=(model.board?.seats??[]).map(seat=>({...seat,...model.identities.find(i=>i.seatId===seat.seatId)}));
   root.dataset.phoneView=model.panel==='card'?'actions':model.panel;
   films.paint({sample:{...sample,items:sample.items.filter(entry=>entry.kind!=='medical'||entry.clinical!=='HEALED')},frame:shown,board:{playerCount:model.playerCount},seats,geometry:{sceneOf,slotsOf,slotRects:presses},layout:where,enabled:completeArt()&&model.connection==='live'&&!model.concealed&&!model.phase?.expired,dark:model.dark||blackout.sample()?.dark===true,privateOpen:model.panel==='card',time:performance.now(),versions:model.versions});
   rescue.paint({entries:sample.items,frame:shown,seats,enabled:completeArt()&&model.connection==='live'&&!model.concealed&&!model.phase?.expired,dark:model.dark||blackout.sample()?.dark===true});
   // The Blackout film in the scene (sheet 30): its darkness while the scene is lit, and no markers.
   if(view)paintNight(shown,presses,view.input.lighting==='lit',false);
   for(const room of shown.rooms){const parent=holder._boardV2Paint?.rooms.get(room.room);if(!parent)continue;
    for(const slot of presses(room.room,model.playerCount,room.panel).filter(s=>['A1','A2','B1','B2'].includes(s.id))){let mark=parent.querySelector(`[data-library-station="${slot.id}"]`);if(!mark){mark=el('span',null,'planet-window-station');mark.dataset.libraryStation=slot.id;mark.setAttribute('aria-hidden','true');parent.append(mark);}mark.hidden=model.dark;putBox(mark,{left:slot.left+slot.side*.25,top:slot.top+slot.side*.7,width:slot.side*.5,height:slot.side*.3});}
   }
   if(view)paintSceneMarks(view);
   else{
    for(const actor of holder.querySelectorAll('.bv2-actor')){
     const seat=model.board?.seats.find(s=>s.seatId===actor.dataset.seat);let badge=actor.querySelector('.planet-office-badge');
     const label=[model.offices?.captainSeatId===actor.dataset.seat?'Captain':null,model.offices?.officerSeatId===actor.dataset.seat?'Officer':null].filter(Boolean).join(' · ');
     if(label){if(!badge){badge=el('b',null,'planet-office-badge');actor.append(badge);}badge.textContent=label;badge.dataset.officer=String(model.offices?.officerSeatId===actor.dataset.seat);const figure=frame.rooms.flatMap(r=>r.figures).find(f=>f.seatId===actor.dataset.seat);if(figure){badge.style.left=`${figure.press.left}px`;badge.style.top=`${figure.press.top-11}px`;badge.style.right='auto';}}else badge?.remove();
     let blocked=actor.querySelector('.planet-move-block');if(model.offices?.blockedSeatId===actor.dataset.seat){if(!blocked){blocked=el('span',null,'planet-move-block');blocked.setAttribute('aria-hidden','true');actor.append(blocked);}const figure=frame.rooms.flatMap(r=>r.figures).find(f=>f.seatId===actor.dataset.seat);if(figure){blocked.style.left=`${figure.press.left+figure.press.side-16}px`;blocked.style.top=`${figure.press.top}px`;}}else blocked?.remove();
    }
   }
  }
  if(!frame||!layout?.fits)rescue.clear();
  const cinematicAnimating=cinematic.paint({model:{matchId:model.matchId,connection:model.connection,concealed:model.concealed||!document.hasFocus(),dark:model.dark,phase:model.phase,navigation:model.navigation,result:model.result},sample:{nowMs:sample.nowMs,special:sample.special.filter(e=>e.kind==='transit'&&e.occurrence?.audience.kind==='public').map(e=>({kind:e.kind,t:e.t}))},frame:shown,layout:where,reduced:reduced()});
  const stage=planetBlackholePresentation(model),synced=stage!==null||!model.concealed&&!model.dark&&sample.special.some(effect=>effect.kind==='blackhole');
  root.dataset.syncCue=String(synced);checkpoint.textContent=checkpointText+(stage?(stage.status==='presenting'?' · Ship synchronized':' · Waiting for server'):synced?' · BLACKHOLE synced':'');
  for(const effect of sample.special)if(effect.kind==='blocked')paintBlock(effect,shown);
  if(view)sceneFilmMarks();
  setCrewMountActivity(holder,model.connection==='live'&&!model.concealed&&!model.dark&&!model.phase?.expired);
  if(sample.animate||capsule.sample().animate||blackout.sample()?.animate||cinematicAnimating)raf=win.requestAnimationFrame(paint);
 }
 function clearBlocks(){for(const node of holder.querySelectorAll('.bv2-block-fx'))node.remove();for(const figure of holder.querySelectorAll('.bv2-figure'))figure.style.translate='0px 0px';
  const owned=holder._boardV2Paint;if(owned?.scene){for(const node of owned.board.querySelectorAll('.bv2-block-fx'))node.remove();for(const actor of owned.actors.values())actor.firstChild.style.translate='0px 0px';}}
 function paintBlock(effect,shown=frame){
  if(model.dark||blackout.sample()?.dark)return;
  const room=shown?.rooms.find(r=>r.figures.some(f=>f.seatId===effect.subjectId)),figure=room?.figures.find(f=>f.seatId===effect.subjectId),parent=holder._boardV2Paint?.rooms.get(room?.room);if(!figure||!parent)return;
  const f=effect.blockFrame,rect=figure.press,center=[rect.left+rect.side/2,rect.top+rect.side/2],group=el('div',null,'bv2-block-fx');group.dataset.blockId=effect.occurrence.id;group.setAttribute('aria-hidden','true');parent.append(group);
  const layer=(variable,opacity,scale=1)=>{const node=el('span');node.style.backgroundImage=`var(${variable})`;node.style.opacity=String(opacity);node.style.transform=`scale(${scale})`;putBox(node,{left:center[0]-rect.side,top:center[1]-rect.side,width:rect.side*2,height:rect.side*2});group.append(node);};
  layer('--board-v2-motion-fx-impact-1',f.star.on?1:0,f.star.scale);layer(`--board-v2-motion-fx-shield-${Math.max(1,f.shield.frame)}`,f.shield.opacity,f.shield.scale);layer('--board-v2-motion-fx-block-ring',f.ring.opacity,f.ring.scale);layer(`--board-v2-motion-fx-block-particles-${Math.max(1,f.particles.frame)}`,f.particles.opacity);
  const label=el('strong','ATTACK BLOCKED'),width=Math.min(128,room.panel.width-4),height=32,place=labelBox({rect:{...rect,press:center},panel:room.panel,size:[width,height],caption:{left:0,top:0,width:room.panel.width,height:room.panel.cap}});putBox(label,{...place,width,height});label.style.opacity=String(f.label.opacity);label.style.transform=`scale(${f.label.scale})`;group.append(label);
  for(const node of holder._boardV2Paint.actors.get(effect.subjectId)?.querySelectorAll('.bv2-figure')??[])node.style.translate=`${f.brace[0]}px ${f.brace[1]}px`;
 }
 // The Blackout film (S1): the rooms' darkness and the position markers. In the room scene (sheet 30) only
 // the darkness is drawn, and only while the scene is lit (the flicker, the lights' return): in the dark the
 // scene's own lights-out picture is that darkness, and a layer over it would hide its windows (z 2802).
 // Sheet 30 has no markers; the Disabler's positions are the scene's own offered positions.
 function paintNight(shown=frame,presses=rects,darkness=true,markers=true){
  const night=blackout.sample();
  for(const room of shown?.rooms??[]){const section=holder._boardV2Paint?.rooms.get(room.room);if(!section)continue;
   for(const node of section.querySelectorAll('[data-planet-night]'))node.remove();
   if(!night)continue;
   if(darkness){const layer=el('span',null,'bv2-night-layer');layer.dataset.planetNight='dark';layer.setAttribute('aria-hidden','true');layer.style.backgroundImage=`var(${room.room==='hospital'?'--board-v2-film-lighting-hospital-ward-four-dark':`--board-v2-motion-${room.room}-dark`})`;layer.style.opacity=String(night.film.darkness);putBox(layer,{left:room.frame.tx,top:room.frame.ty,width:1024*room.frame.k,height:768*room.frame.k});section.append(layer);}
   if(markers)for(const r of presses(room.room,model.playerCount,room.panel)){const marker=el('span',null,'bv2-night-layer');marker.dataset.planetNight='marker';marker.dataset.slot=r.id;marker.setAttribute('aria-hidden','true');marker.style.backgroundImage=`var(--board-v2-motion-marker-${night.film.markers.style})`;marker.style.opacity=String(night.film.markers.opacity);putBox(marker,{left:r.left,top:r.top,width:r.side,height:r.side});section.append(marker);}
  }
 }
 function renderTargets(){
  targets.replaceChildren();const action=model.action;if(!layout?.fits||!action)return;
  for(const choice of action.choices){
   if(action.type==='MOVE'&&action.step==='targets')continue;
   const room=roomFor(choice.value);if(!room||!['MOVE','SELECT_BLACKOUT_SLOT'].includes(action.type))continue;
   // In the room view the room scene draws this viewer's offered positions.
   if(sceneMode==='room')continue;
   const r=rects(room,model.playerCount,layout.board.panels[room]).find(s=>s.id===choice.value),b=layout.board.boxes[room];
   const target=button(choice.label,'choose',choice.value);target.className='bv2-slot-target';target.id=`planet-slot-${choice.value}`;target.setAttribute('aria-label',`Choose ${action.type==='SELECT_BLACKOUT_SLOT'?'fixed':'empty'} position ${choice.label}`);target.setAttribute('aria-describedby','ms-action-step');putBox(target,{left:b.left+layout.board.shell.border+r.left,top:b.top+layout.board.shell.border+r.top,width:r.side,height:r.side});targets.append(target);
  }
  const absent=action.choices.filter(c=>/^seat-[1-9]$/.test(c.value)&&!model.board?.seats.find(s=>s.seatId===c.value)?.location);
  if(absent.length){const memorial=el('div',null,'planet-offboard');memorial.append(el('span','Off board'));for(const choice of absent)memorial.append(button(choice.label,'choose',choice.value));targets.append(memorial);}
 }
 function render(next){
  if(disposed)return;model=next;setCrewPictureSurface(root,model.versions);
  root.dataset.planetPanel=model.panel;root.dataset.connection=model.connection;root.dataset.surface=model.surface;root.dataset.mode=model.mode;root.dataset.motion=reduced()?'reduced':'normal';root.dataset.blackout=model.dark?'dark':'none';root.dataset.phase=model.phase?.kind??'';
  root.dataset.ownTurn=String(!model.dark&&model.activeSeatId===model.ownSeatId);
  if(model.connection==='live'&&Number.isSafeInteger(model.round))lastRound=model.round;
  serverClock.observe(model);
  const closed=phaseClosed(before,model);before=model;
  // Only the exact Food tuple supplies these sanitized public facts. Ordinary
  // phones and the display get the same gauge, beside the shell's clock; no private Task is consulted.
  const clockSlot=shell.slot('clock');
  if(model.food&&!model.concealed&&model.connection==='live'){
   if(foodClock.parentElement!==clockSlot)clockSlot.append(foodClock);
   const doses=model.food.stock.doses;
   if(doses!==gaugeDoses){foodClock.querySelector('.fs-food')?.remove();foodClock.append(foodGauge(foodUi,doses));gaugeDoses=doses;}
  }else if(foodClock.isConnected){foodClock.remove();foodClock.querySelector('.fs-food')?.remove();gaugeDoses=null;}
  offices.textContent=model.dark?'':`Captain ${number(model.offices?.captainSeatId)} · Officer ${number(model.offices?.officerSeatId)}${model.offices?.blockedSeatId?` · Move blocked: ${number(model.offices.blockedSeatId)}`:''}`;
  checkpoint.textContent=model.dark?'Blackout':model.boardLabel??'';
  if(model.phase?.kind==='NAV_SETTING')checkpoint.textContent=(model.boardLabel?`${model.boardLabel} · `:'')+'The course is being set.';
  if(model.action?.prompt)checkpoint.textContent=model.action.prompt;
  checkpointText=checkpoint.textContent;
  instruction.textContent=model.action?.prompt??(model.dark?'Blackout':model.result?`${model.result.winner??'No team'} · ${model.result.reason.replaceAll('_',' ')}${model.result.alienCoWinner?' · Alien co-victory':''}`:'');
  rosterText.replaceChildren();for(const seat of model.board?.seats??[]){const identity=model.identities.find(i=>i.seatId===seat.seatId);rosterText.append(el('li',`${number(seat.seatId)}${identity?.displayName?`, ${identity.displayName}`:''}: ${seat.health}, ${seat.location??'off board'}${seat.slotId?`, ${seat.slotId}`:''}${seat.jailed?', detained':''}${model.food?.step?.kind==='AWAY'&&model.food.step.awaySeatIds.includes(seat.seatId)?', away on the Food Supply Task':''}${model.offices?.captainSeatId===seat.seatId?', Captain':''}${model.offices?.officerSeatId===seat.seatId?', Officer':''}${seat.health==='Injured'&&seat.medical&&seat.medical.rescueOpportunity!=='CLOSED'&&seat.rescueDueAfterRound!==null?`, Rescue possible through Round ${seat.rescueDueAfterRound}`:''}.`));}
  resultPanel.replaceChildren();resultPanel.hidden=true;
  if(model.phase?.kind==='VOTE_RESULT'&&model.lastTally&&!model.phase.expired){const outcome={CAPTAIN_ELECTED:'Captain elected',RUNOFF_REQUIRED:'Runoff next',NO_CAPTAIN_ELECTED:'No Captain elected',PLAYER_JAILED:'Player detained',JAIL_FULL:'Jail full · no transfer',NO_JAIL_SELECTION:'No player selected'}[model.lastTally.outcome];resultPanel.hidden=false;resultPanel.append(el('h2',model.lastTally.kind==='JAIL_VOTE'?'Jail vote result':'Captain election result'),el('p',outcome),el('p',`${model.lastTally.eligibleVoterCount} eligible voters`),rosterGrid({counts:model.lastTally.counts,result:true}));}
  if(model.result){resultPanel.hidden=false;const side=planetTerminalArrival(model),banner=el('h2',model.result.winner?`${model.result.winner} reached its planet`:'No winner','planet-end-banner');banner.prepend(library.art(`en-banner-${side?side.toLowerCase():'none'}`,'planet-library-fill'));resultPanel.append(banner,el('p',model.result.reason.replaceAll('_',' ')));if(model.result.alienCoWinner)resultPanel.append(el('p','Alien co-victory'));for(const reveal of model.endReveal?.roles??[])resultPanel.append(el('p',`${number(reveal.seatId)} · ${reveal.role}`));if(model.endReveal){const code=el('p',`Original Code: ${model.endReveal.code.map(number).join(', ')}`,'planet-end-code');code.prepend(library.art('en-code'));resultPanel.append(code);}}
  if(model.result&&terminalAction)resultPanel.append(terminalAction);
  if(model.concealed||model.dark)resultPanel.hidden=true;
  if(lastPanel!==model.panel){drawings.clear();more=false;lastPanel=model.panel;}
  if(model.privateArea===null||model.concealed||model.dark||model.phase?.expired)drawings.clear();
  const ownRoom=phoneRoom(model.board?.seats.find(s=>s.seatId===model.ownSeatId)?.location);
  if(ownRoom&&ownRoom!==lastOwnRoom){currentRoom=ownRoom;lastOwnRoom=ownRoom;}
  const ownTalk=!model.dark&&['HACK_DECLARE','HACK_RESULT','HACK'].includes(model.phase?.kind)&&model.ownSeatId&&[model.talk?.actorSeatId,model.talk?.targetSeatId].includes(model.ownSeatId)?model.talk.id:null;
  if(ownTalk!==lastOwnTalk){currentRoom=ownTalk?'capsule':ownRoom??lastOwnRoom??currentRoom;if(ownTalk)sceneMode='room';lastOwnTalk=ownTalk;}
  if(model.surface==='display')sceneMode='board';
  const targeting=model.action&&['targets','slots'].includes(model.action.step)&&!['VOTE','SUBMIT_CODE','PANEL_CODE'].includes(model.action.type);
  const nextTargetKey=targeting?`${model.phase.id}:${model.action.type}:${model.action.step}:${model.action.selected.join(',')}`:null;
  if(nextTargetKey&&targetKey!==nextTargetKey){
   if(model.action.type==='MOVE')sceneMode='board';
   else if(model.action.type==='SELECT_BLACKOUT_SLOT'){currentRoom=phoneRoom(model.privateArea?.blackoutTargeting?.boundRoom)??currentRoom;sceneMode='room';}
   else {const rooms=[...new Set(model.action.choices.map(c=>phoneRoom(model.board?.seats.find(s=>s.seatId===c.value)?.location)).filter(Boolean))];if(rooms.length===1){currentRoom=rooms[0];sceneMode='room';}else sceneMode='board';}
  }targetKey=nextTargetKey;
  // The board's List belongs to one choosing step: it ends with it.
  const nextListKey=model.action&&model.phase?`${model.phase.id}:${model.action.type}:${model.action.step}`:null;if(nextListKey!==listKey){listOpen=false;listKey=nextListKey;}
  root.dataset.foodChrome=String(foodSurface.active);
  // The shell: this phone's input (shell-input.mjs). While the Food surface owns the chrome (active, or its
  // Task over the whole screen) the shell is concealed under it: its bars keep their shape as empty material,
  // with no name, time or control, as today's header and nav were hidden and inert.
  const input=shellInput(model,{view:sceneMode,room:currentRoom,food:foodSurface,reducedMotion:reduced(),lastRound,listOpen,closed});
  input.sheet=shellHostSheet(input.sheet,hostSheet?.frame()??null);
  // The host sheet's own toast (Copied, a receipt), once, when the game gives none.
  const nextToast=input.toast??hostSheet?.toast?.()??null;if(nextToast)toast=nextToast;
  if(input.status==='concealed')toast=null;else input.toast=toast;
  shellFrame=input.sheet;choosing=!!input.target;
  // The shared display's status line and a message stay the game's; while the reconnecting banner shows, it says it.
  // Concealed, it hides itself, as everything of this viewer's in the shell does.
  status.textContent=model.dark?'':model.message??'';status.hidden=!status.textContent||model.action?.prompt===model.message||input.banner?.kind==='reconnecting'||input.status==='concealed';
  const nextShellKey=JSON.stringify(input);if(nextShellKey!==shellKey){shellKey=nextShellKey;shell.update(input);}
  syncShellActivity();mountSheetBody();
  // The bars' heights and the stage come from the shell: its layout() is measured after the update above. The
  // private talk's two buttons cover the stage's foot, which the board's layout keeps clear.
  const shellBars=shell.layout()??{size:{width:win.innerWidth,height:win.innerHeight},bars:{top:0,bottom:0},covered:{bottom:0}};
  const top=shellBars.bars.top,bottom=Math.max(shellBars.bars.bottom,shellBars.covered.bottom);
  root.style.setProperty('--phone-top',`${top}px`);
  // Keep this coordinate-only cache through conceal/reconnect. Fresh phase data or
  // disposal retires it; no people, names, identities or private selections enter it.
  allLayouts=model.playerCount?blackoutGeometry.read(model.phase?.kind==='BLACKOUT'?model.presentation?.blackout?.windowId:null,()=>phoneLayouts({width:shellBars.size.width,height:shellBars.size.height,top,nav:bottom},model.playerCount)):null;
  if(allLayouts)root.style.setProperty('--phone-top',`${allLayouts.top}px`);
  layout=allLayouts?.[sceneMode]??null;
  // While the model withholds the room (hidden, or reconnecting) a mounted scene stays and takes only its
  // status: its frame, held through a Blackout window, survives, as the board's coordinate cache does.
  const step=roomSceneLifecycle({mounted:!!scene,key:sceneKey},model,{view:sceneMode,room:currentRoom,fits:!!layout?.fits}),nextScene=!['none','dispose'].includes(step);
  if(nextScene!==sceneOn){sceneOn=nextScene;retireBoardPaint();if(!sceneOn)closeScene();}
  if(step==='remount'){closeScene();retireBoardPaint();}
  if(step==='status'){const status=roomSceneStatus(model);if(sceneInput!==`viewless:${status}`){sceneInput=`viewless:${status}`;scene.update({status});}}
  sceneHost.hidden=!sceneOn||foodSurface.exclusive;holder.style.pointerEvents=sceneOn?'none':'';syncSceneActivity();
  holder.hidden=model.concealed||foodSurface.exclusive||!layout?.fits;stage.inert=foodSurface.exclusive;
  if(layout?.fits){
   holder.style.height=`${layout.contentHeight}px`;holder.style.width=`${allLayouts.width}px`;targets.style.width=`${allLayouts.width}px`;targets.style.height=`${layout.contentHeight}px`;stage.dataset.view=sceneMode;
   // Absence filters drawing only; canonical seats, identities and commands stay complete.
   const away=new Set(model.food?.step?.kind==='AWAY'?model.food.step.awaySeatIds:[]);
   const seats=(model.board?.seats??[]).filter(s=>!away.has(s.seatId)).map(s=>({...s,...model.identities.find(i=>i.seatId===s.seatId),...(s.seatId===model.ownSeatId?{displayName:'You'}:{})}));
   const frames=sceneMode==='room'?allLayouts.roomFrames:allLayouts.boardFrames,presses=sceneMode==='room'?allLayouts.roomPresses:allLayouts.boardPresses;
   frame=boardV2SceneFrame(model.playerCount,seats,{panels:layout.board.panels,pressAreas:presses,geometry:{sceneOf,slotsOf,frameScene:(_scene,_panel,room)=>frames[room]}});
   if(frame.problems.length){frame=null;if(sceneOn){closeScene();retireBoardPaint();}holder.replaceChildren(el('p','The authorized board placement could not be drawn.'));}
  }else {frame=null;holder.replaceChildren();}
  const key=JSON.stringify([model.versions,model.panel,more,model.action,model.privateArea,model.recovery,model.concealed,model.phase?.expired,model.phase?.id,model.round,model.result,model.dark,model.identities,sceneMode,currentRoom,model.canMove,shellFrame?.id??null,listOpen]);
  if(key!==uiKey){uiKey=key;renderUI(shellFrame);}renderTargets();
  rosterText.hidden=foodSurface.exclusive;
  // The board scrolls between the shell's bars when it is taller than the stage; no room, figure or
  // fixed-slot coordinate moves for it.
  scrollSpace.style.height=`${layout?.contentHeight??0}px`;
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
  if(target.dataset.moveRoom){if(sceneMode!=='board'||model.dark||!model.canMove||!model.moveRooms.includes(target.dataset.moveRoom))return;if(model.action?.type!=='MOVE')controller.begin('MOVE');controller.choose(target.dataset.moveRoom);return;}
  if(target.dataset.intent==='action/choose'){controller.choose(target.dataset.value);return;}
  const action=target.dataset.planetAction,value=target.dataset.value;
  if(action==='food-tasks'){controller.dismiss();food?.openTasks();return;}
  if(action==='panel'){if(value==='board')switchView();else {more=false;controller.openPanel(value==='more'?'panels':value);}}
  if(action==='begin'){more=false;controller.begin(value);}
  if(action==='choose')controller.choose(value);
  if(action==='confirm')void controller.confirm();
  if(action==='close'){more=false;listOpen=false;controller.dismiss();}
  if(action==='check')void controller.checkReceipt();
  if(action==='retry')void controller.retry();
 };
 // Escape closes what is open, as today's Close; the shell moves the focus to itself when the focused control ends.
 const onKey=e=>{if(e.key==='Escape'){more=false;listOpen=false;controller.dismiss();}};
 const onVisibility=()=>{controller.setVisible(document.visibilityState==='visible');syncSceneActivity();syncShellActivity();if(document.visibilityState!=='visible'){motion.cancel();capsule.settle();blackout.settle();films.clear();rescue.clear();cinematic.clear();clearBlocks();drawings.clear();if(raf!==null)win.cancelAnimationFrame(raf);raf=null;}};
 const onMotion=()=>{motion.cancel();capsule.settle();blackout.settle();films.clear();rescue.clear();cinematic.clear();clearBlocks();if(raf!==null)win.cancelAnimationFrame(raf);raf=null;if(model)render(controller.getModel());};
 const onArt=()=>{uiKey=null;if(model)render(controller.getModel());};
 const onBlur=()=>{blurred=true;syncSceneActivity();syncShellActivity();controller.dismiss();motion.cancel();capsule.settle();blackout.settle();films.clear();rescue.clear();cinematic.clear();clearBlocks();drawings.clear();if(raf!==null)win.cancelAnimationFrame(raf);raf=null;};
 const onFocus=()=>{blurred=false;if(model)render(controller.getModel());syncSceneActivity();syncShellActivity();};
 const onResize=()=>{uiKey=null;if(model)render(controller.getModel());};
 // The shell reports its bars' and stage's sizes (onLayout), which replaced the old bars' ResizeObserver.
 const disconnect=connectShellLifecycle({doc:document,win,media,root},{click:onClick,keydown:onKey,visibility:onVisibility,art:onArt,preferences:onResize,motion:onMotion,resize:onResize,blur:onBlur,focus:onFocus});
 const stop=controller.subscribe(render);
 return {get view(){return sceneMode;},bars(){const bars=disposed?null:shell.layout()?.bars;return {top:bars?.top??0,bottom:bars?.bottom??0};},
  foodSurface(next){if(JSON.stringify(next)===JSON.stringify(foodSurface))return;foodSurface=next;uiKey=null;if(model)render(controller.getModel());},
  navigate(next){if(next==='switch'){sceneMode=sceneMode==='room'?'board':'room';if(sceneMode==='room'&&lastOwnRoom)currentRoom=lastOwnTalk?'capsule':lastOwnRoom;uiKey=null;controller.dismiss();}else controller.openPanel(next);},
  settingsChanged(){if(model?.panel==='settings'){uiKey=null;render(controller.getModel());}},dispose(){if(disposed)return;disposed=true;stop();closeScene();disconnect();blackoutGeometry.clear();if(raf!==null)win.cancelAnimationFrame(raf);disposeCrewMounts(holder);motion.dispose();capsule.dispose();blackout.dispose();films.dispose();rescue.dispose();cinematic.dispose();drawings.clear();shell.dispose();delete root.dataset.crewArt;root.replaceChildren();}};
}
