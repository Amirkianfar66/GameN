// Paint preparation over public, already-validated logical slots. This renderer is dormant
// until the versioned slot reader, revised Claude layout and complete common art are adopted.
// It never allocates a slot, mutates gameplay, fetches a role-specific asset or runs a film.
import {sceneOf,slotsOf,BOARD_ROOMS,LOCATION_OF} from './board-v2-drawing/slots.mjs';
import {FRAME} from './scene-drawing/body.mjs';
import {frameScene} from './scene-drawing/frame.mjs';
import {INJURED,skeletonOf} from './scene-drawing/gestures.mjs';
import {CREW} from './scene-drawing/crew.mjs';
import {dressedFigureSvg,outfitFor} from './scene-drawing/wardrobe.mjs';
import {capsulePerson,homePerson} from './board-v2-drawing/capsule-film.mjs';
import {statusOf} from './board-v2-drawing/capsule-figures.mjs';
import {frameCapsule,capsuleTargets,CAPSULE_SIZE} from './board-v2-drawing/capsule-scene.mjs';
const [bx,by,box]=FRAME.box,[ax,ay]=FRAME.anchor;

/** Inputs are an internal public scene model, not an independently widened wire view. */
export function boardV2SceneFrame(roster,seats,{panels,pressAreas,geometry={sceneOf,slotsOf}}) {
 const problems=[],usedSlots=new Set(),usedSeats=new Set(),rooms=[];
 if(![7,8,9].includes(roster))return {rooms:[],problems:['unsupported starting roster']};
 for(const seat of seats){
  if(!/^seat-[1-9]$/.test(seat.seatId)||Number(seat.seatId.slice(5))>roster||usedSeats.has(seat.seatId))problems.push('invalid or duplicate seat');
  usedSeats.add(seat.seatId);
  if(seat.location===null&&seat.slotId===null&&seat.health==='Eliminated')continue;
  const room=BOARD_ROOMS.find(room=>LOCATION_OF[room]===seat.location);
  if(!room||!geometry.slotsOf(room,roster).some(slot=>slot.id===seat.slotId))problems.push(`${seat.seatId}: missing or incompatible stored slot`);
  if(usedSlots.has(seat.slotId))problems.push('duplicate stored slot');usedSlots.add(seat.slotId);
 }
 if(problems.length)return {rooms:[],problems};
 for(const room of BOARD_ROOMS){
  const panel=panels[room];if(!panel||panel.width<=0||panel.height<=0){problems.push(`${room}: missing laid-out panel`);continue;}
  const scene=geometry.sceneOf(room,roster),frame=frameScene(scene,panel),slots=geometry.slotsOf(room,roster);
  // The revised approved layout supplies its exact slot rectangles. Do not substitute
  // the historical fixed-44 helper or copy an unadopted fit implementation here.
  const presses=new Map((pressAreas[room]??[]).map(rect=>[rect.id,rect]));
  if(slots.some(slot=>{const r=presses.get(slot.id);return !r||![r.left,r.top,r.side].every(Number.isFinite)||r.side<44
   ||r.left<0||r.top<panel.cap||r.left+r.side>panel.width||r.top+r.side>panel.height-panel.pad;})){
   problems.push(`${room}: missing or invalid approved press geometry`);continue;
  }
  const figures=seats.filter(seat=>seat.location===LOCATION_OF[room]).map(seat=>{
   const slot=slots.find(slot=>slot.id===seat.slotId),rect=presses.get(slot.id),unit=slot.scale*frame.k;
   const gesture=seat.health==='Eliminated'?slot.down:seat.health==='Injured'?`${slot.gesture}${INJURED}`:slot.gesture;
   return {seatId:seat.seatId,slotId:slot.id,characterId:seat.characterId,displayName:seat.displayName,health:seat.health,
    location:seat.location,jailed:seat.jailed===true,
    gesture,outfit:outfitFor(seat.location),mirror:slot.mirror,depth:slot.depth,
    slot,sceneFrame:frame,
    body:{left:frame.tx+slot.at[0]*frame.k-(ax-bx)*unit,top:frame.ty+slot.at[1]*frame.k-(ay-by)*unit,side:box*unit},
    press:rect,name:{left:frame.tx+slot.pressAt[0]*frame.k,top:Math.min(panel.height-16,rect.top+rect.side-14)},
   };
  });
  rooms.push({room,panel,frame,figures,layers:Object.entries(scene.layers??{}).map(([id,layer])=>({id,depth:layer.depth}))});
 }
 return {rooms:problems.length?[]:rooms,problems};
}

/** Reviewed wardrobe/rig only; names remain semantic text in the caller's DOM. */
export function boardV2FigureSvg(figure,{layer='body'}={}) {
 if(!CREW[figure.characterId])return null;
 return dressedFigureSvg(CREW[figure.characterId],skeletonOf(figure.gesture),{outfit:figure.outfit,prefix:`bv2-${figure.seatId}-${layer}`,layer});
}

const px=value=>`${value}px`;
const setBox=(node,box)=>{for(const [property,key]of [['left','left'],['top','top'],['width','width'],['height','height']])node.style[property]=px(box[key]);};
/** Dormant DOM adapter. `artForRoom` supplies only uniform, preloaded approved CSS vars;
 * layout boxes/presses come from the revised Designer fit. There is no fetch or allocator.
 * Hidden cinematic actors keep their world anchor for the current-return resolver; their
 * exact same choice objects are returned to the capsule painter, never silently dropped.
 */
export function paintBoardV2(root,frame,boxes,{artForRoom,choices=[],marks=null,capsule=null,canMove=false,pass=null,blackout=null}={}) {
 if(frame.problems.length)return {painted:false,problems:frame.problems,capsuleChoices:[]};
 const document=root.ownerDocument;
 const create=(tag,className)=>{const n=document.createElement(tag);n.className=className;return n;};
 let owned=root._boardV2Paint;
 if(!owned){const board=create('div','bv2-board');board.dataset.renderer='board-v2';board.setAttribute('aria-label','The ship');
  const heading=create('h2','ms-visually-hidden');heading.id='ms-comic-board-heading';heading.textContent='The ship';board.append(heading);
  owned=root._boardV2Paint={board,rooms:new Map(),actors:new Map(),capsuleActors:new Map()};}
 const {board,rooms,actors}=owned;
 const dark=blackout?.dark===true;
 board.inert=dark;board.setAttribute('aria-hidden',String(dark));
 root.dataset.blackout=dark?'dark':blackout?'preview':'none';
 if(!root.contains(board))root.replaceChildren(board);
 const setTarget=(actor,id,rect,choice,picked,description)=>{
  let target=actor.querySelector('.bv2-seat-target');
  if(!choice){target?.remove();target=null;}else{
   if(!target){target=create('button','bv2-seat-target');target.type='button';actor.append(target);}
   target.id=id;target.dataset.intent='action/choose';target.dataset.value=choice.value;
   target.setAttribute('aria-label',`${choice.label}${description??''}`);target.setAttribute('aria-describedby','ms-action-step');
   setBox(target,{left:rect.left,top:rect.top,width:rect.side,height:rect.side});
  }
  let mark=actor.querySelector('.bv2-pick');
  if(picked<0){mark?.remove();}else{if(!mark){mark=create('span','bv2-pick');mark.setAttribute('aria-hidden','true');actor.append(mark);}mark.textContent=marks?.numbered?String(picked+1):'✓';mark.style.left=px(rect.left);mark.style.top=px(rect.top);}
  actor.dataset.offered=String(Boolean(choice));actor.dataset.picked=String(picked>=0);
 };
 const nameplate=(actor,id,name,position,width)=>{
  let label=actor.querySelector('.bv2-nameplate');if(!label){label=create('span','bv2-nameplate');const n=create('b','bv2-nameplate__number'),text=create('span','bv2-nameplate__name');label.append(n,text);actor.append(label);}
  label.children[0].textContent=id.slice(5);label.children[1].textContent=name;label.title=name;
  label.style.left=px(position.left);label.style.top=px(position.top);label.style.setProperty('--bv2-name-width',px(width));
 };
 const figure=(actor,who,person,scene,opacity=1,ghost=false)=>{
  const unit=person.scale*scene.k;
  for(const layer of ['body','front']){
   let node=actor.querySelector(`.bv2-figure[data-part="${layer}"]`);if(!node){node=create('span','bv2-figure');node.dataset.part=layer;node.setAttribute('aria-hidden','true');actor.append(node);}
   const key=JSON.stringify([who.characterId,who.outfit,person.sk,layer]);
   if(node._figureKey!==key){node.innerHTML=CREW[who.characterId]?dressedFigureSvg(CREW[who.characterId],person.sk,{outfit:who.outfit,prefix:`bv2-${who.seatId}-${actor.dataset.place}-${layer}`,layer}):'';node._figureKey=key;}
   setBox(node,{left:scene.tx+person.at[0]*scene.k-(ax-bx)*unit,top:scene.ty+person.at[1]*scene.k-(ay-by)*unit,width:box*unit,height:box*unit});
   node.dataset.mirror=String(person.mirror);node.style.opacity=String(opacity*(blackout?.film.peopleOpacity??1));node.style.filter=ghost?'grayscale(1)':'';
   node.style.zIndex=String(layer==='body'?2*Math.round(who.depth):1500+Math.round(who.depth));
  }
 };
 const all=dark?[]:frame.rooms.flatMap(r=>r.figures),present=new Set(all.map(f=>f.seatId));
 for(const [id,actor]of actors)if(!present.has(id)){actor.remove();actors.delete(id);}
 const bySeat=new Map(all.map(f=>[f.seatId,f])),pair=dark?[]:capsule?.seatIds??[];
 for(const room of frame.rooms){
  let section=rooms.get(room.room);
  if(!section){section=create('section','bv2-room');section.dataset.room=room.room;section.setAttribute('aria-label',LOCATION_OF[room.room]);rooms.set(room.room,section);board.append(section);}
  setBox(section,boxes[room.room]);
  let caption=section.querySelector('.bv2-room-heading');
  if(!caption){caption=create(canMove&&['room-a','room-b','command-room'].includes(room.room)?'button':'h2','bv2-room-heading');
   if(caption.tagName==='BUTTON'){caption.type='button';caption.classList.add('bv2-room-move');caption.id=`phone-move-${room.room}`;caption.dataset.moveRoom=LOCATION_OF[room.room];caption.setAttribute('aria-label',`Move to ${LOCATION_OF[room.room]}`);}
   const words=create('span','bv2-caption');words.textContent=LOCATION_OF[room.room];caption.append(words);section.append(caption);}
  for(const asset of artForRoom(room.room)??[]){
   if(!/^--[a-zA-Z0-9-]+$/.test(asset.cssVar)||!Number.isFinite(asset.sceneDepth))throw Error('Invalid reviewed common-art descriptor');
   const z=2*Math.round(asset.sceneDepth)+1;
   if(asset.paintZIndex!==undefined&&asset.paintZIndex!==z)throw Error('Source depth / paint z-index mismatch');
   let layer=section.querySelector(`[data-art-layer="${asset.id}"]`);if(!layer){layer=create('span','bv2-layer');layer.dataset.artLayer=asset.id;layer.setAttribute('aria-hidden','true');section.append(layer);}
   layer.style.setProperty('--bv2-layer-art',`var(${asset.cssVar})`);setBox(layer,{left:room.frame.tx,top:room.frame.ty,width:1024*room.frame.k,height:768*room.frame.k});layer.style.zIndex=String(z);
  }
  for(const who of dark?[]:room.figures){
   let actor=actors.get(who.seatId);if(!actor){actor=create('div','bv2-actor');actor.dataset.seat=who.seatId;actor.dataset.place='world';actors.set(who.seatId,actor);}if(actor.parentNode!==section)section.append(actor);
   actor.dataset.slot=who.slotId;actor.dataset.character=who.characterId;actor.dataset.health=who.health;actor.setAttribute('aria-label',`${who.displayName??`Player ${who.seatId.slice(5)}`}, ${who.location}, ${who.health}${who.jailed?', detained':''}`);
   const index=pair.indexOf(who.seatId),personState=index<0?null:capsule.film.people[`P${index+1}`];
   const rest=skeletonOf(who.gesture),status=statusOf({health:who.health,jailed:who.jailed,room:room.room});
   const home=personState?.home;
   const posed=home?homePerson(who.slot,home,rest,status):{at:who.slot.at,scale:who.slot.scale,mirror:who.slot.mirror,sk:rest};
   const ghost=home?.ghost>0&&home.figure===0;
   figure(actor,who,posed,who.sceneFrame,ghost?0.35:(home?.figure??1),ghost);
   nameplate(actor,who.seatId,who.displayName??CREW[who.characterId]?.sign??`Player ${who.seatId.slice(5)}`,who.name,Math.min(76,room.panel.width));
   let badge=actor.querySelector('.bv2-away');if(home?.ghost>0){if(!badge){badge=create('span','bv2-away');badge.setAttribute('aria-hidden','true');actor.append(badge);}badge.style.left=px(who.press.left+who.press.side-20);badge.style.top=px(who.press.top-10);badge.style.setProperty('--bv2-layer-art','var(--board-v2-art-capsule-badge)');}else badge?.remove();
   const choice=choices.find(c=>c.value===who.seatId),picked=marks?.picked.indexOf(who.seatId)??-1;
   setTarget(actor,choice?.id,who.press,choice,picked,' at their actual position');
  }
 }
 if(boxes.capsule){
  let section=owned.capsule;if(!section){section=create('section','bv2-room bv2-capsule');section.dataset.room='capsule';section.setAttribute('aria-label','Private talk');const caption=create('h2','bv2-caption');caption.textContent='Private talk';section.append(caption);board.append(section);owned.capsule=section;}
  setBox(section,boxes.capsule);const panel={width:boxes.capsule.width-4,height:boxes.capsule.height-4},scene=frameCapsule(panel);
  for(const [id,z]of [['back',0],[`door-${capsule?.film.door??0}`,100],['busy',3000]]){
   const type=id.startsWith('door-')?'door':id;let layer=section.querySelector(`[data-capsule-layer="${type}"]`);
   if(!layer){layer=create('span','bv2-layer');layer.dataset.capsuleLayer=type;layer.setAttribute('aria-hidden','true');section.append(layer);}
   layer.style.setProperty('--bv2-layer-art',`var(--board-v2-art-capsule-${id})`);setBox(layer,{left:scene.tx,top:scene.ty,width:CAPSULE_SIZE[0]*scene.k,height:CAPSULE_SIZE[1]*scene.k});layer.style.zIndex=String(z);layer.hidden=id==='busy'&&!capsule?.film.busy;
  }
  const targets=capsuleTargets(panel);
  for(let i=0;i<2;i++){
   const id=`P${i+1}`,seatId=pair[i],who=bySeat.get(seatId),state=capsule?.film.people[id]?.capsule;
   let actor=owned.capsuleActors.get(id);
   if(!who||!state||state.state==='empty'){actor?.remove();owned.capsuleActors.delete(id);continue;}
   if(!actor){actor=create('div','bv2-actor');actor.dataset.place=id;owned.capsuleActors.set(id,actor);section.append(actor);}
   actor.dataset.seat=seatId;actor.dataset.character=who.characterId;actor.dataset.state=state.state;
   const posed=capsulePerson(id,state,statusOf({health:who.health,jailed:who.jailed,room:who.location==='Jail'?'jail':''}),{exchangeId:capsule.session.hackId,talkMs:capsule.stage==='talk'?capsule.t:0,reduced:capsule.reduced});
   if(posed)figure(actor,{...who,depth:100+Math.round(posed.at[1])},posed,scene,state.opacity);
   nameplate(actor,seatId,who.displayName??CREW[who.characterId]?.sign??`Player ${seatId.slice(5)}`,{left:panel.width*(i?0.75:0.25),top:panel.height-15},panel.width/2-2);
   const choice=['seated','sitting'].includes(state.state)?choices.find(c=>c.value===seatId):null;
   setTarget(actor,choice?`${choice.id}-capsule`:null,targets[i],choice,marks?.picked.indexOf(seatId)??-1,', seated in private talk');
  }
 }
 return {painted:true,problems:[],capsuleChoices:choices.filter(c=>pair.includes(c.value)),board};
}
