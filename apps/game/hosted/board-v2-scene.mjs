// Paint preparation over public, already-validated logical slots. This renderer is dormant
// until the versioned slot reader, revised Claude layout and complete common art are adopted.
// It never allocates a slot, mutates gameplay, fetches a role-specific asset or runs a film.
import {sceneOf,slotsOf,BOARD_ROOMS,LOCATION_OF} from './board-v2-drawing/slots.mjs';
import {FRAME} from './scene-drawing/body.mjs';
import {frameScene} from './scene-drawing/frame.mjs';
import {INJURED,skeletonOf} from './scene-drawing/gestures.mjs';
import {CREW} from './scene-drawing/crew.mjs';
import {dressedFigureSvg,outfitFor} from './scene-drawing/wardrobe.mjs';
const [bx,by,box]=FRAME.box,[ax,ay]=FRAME.anchor;

/** Inputs are an internal public scene model, not an independently widened wire view. */
export function boardV2SceneFrame(roster,seats,{panels,pressAreas}) {
 const problems=[],usedSlots=new Set(),usedSeats=new Set(),rooms=[];
 if(![7,8,9].includes(roster))return {rooms:[],problems:['unsupported starting roster']};
 for(const seat of seats){
  if(!/^seat-[1-9]$/.test(seat.seatId)||Number(seat.seatId.slice(5))>roster||usedSeats.has(seat.seatId))problems.push('invalid or duplicate seat');
  usedSeats.add(seat.seatId);
  const room=BOARD_ROOMS.find(room=>LOCATION_OF[room]===seat.location);
  if(!room||!slotsOf(room,roster).some(slot=>slot.id===seat.slotId))problems.push(`${seat.seatId}: missing or incompatible stored slot`);
  if(usedSlots.has(seat.slotId))problems.push('duplicate stored slot');usedSlots.add(seat.slotId);
 }
 if(problems.length)return {rooms:[],problems};
 for(const room of BOARD_ROOMS){
  const panel=panels[room];if(!panel||panel.width<=0||panel.height<=0){problems.push(`${room}: missing laid-out panel`);continue;}
  const scene=sceneOf(room,roster),frame=frameScene(scene,panel),slots=slotsOf(room,roster);
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
    gesture,outfit:outfitFor(seat.location),mirror:slot.mirror,depth:slot.depth,
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
export function paintBoardV2(root,frame,boxes,{artForRoom,choices=[],hiddenSeatIds=[]}={}) {
 if(frame.problems.length)return {painted:false,problems:frame.problems,capsuleChoices:[]};
 const document=root.ownerDocument,hidden=new Set(hiddenSeatIds),capsuleChoices=[];
 const create=(tag,className)=>{const n=document.createElement(tag);n.className=className;return n;};
 const board=create('div','bv2-board');board.dataset.renderer='board-v2';board.setAttribute('aria-label','The ship');
 for(const room of frame.rooms){
  const section=create('section','bv2-room');section.dataset.room=room.room;section.setAttribute('aria-label',LOCATION_OF[room.room]);setBox(section,boxes[room.room]);
  const caption=create('h2','bv2-caption');caption.textContent=LOCATION_OF[room.room];section.append(caption);
  for(const asset of artForRoom(room.room)??[]){
   if(!/^--[a-zA-Z0-9-]+$/.test(asset.cssVar))throw Error('Unreviewed common-art variable');
   const layer=create('span','bv2-layer');layer.setAttribute('aria-hidden','true');layer.style.setProperty('--bv2-layer-art',`var(${asset.cssVar})`);
   setBox(layer,{left:room.frame.tx,top:room.frame.ty,width:1024*room.frame.k,height:768*room.frame.k});layer.style.zIndex=String(asset.depth);section.append(layer);
  }
  for(const figure of room.figures){
   const anchor=create('span','bv2-world-anchor');anchor.dataset.seat=figure.seatId;anchor.dataset.slot=figure.slotId;setBox(anchor,{left:figure.press.left,top:figure.press.top,width:figure.press.side,height:figure.press.side});section.append(anchor);
   const choice=choices.find(choice=>choice.value===figure.seatId);
   if(hidden.has(figure.seatId)){if(choice)capsuleChoices.push(choice);continue;}
   const actor=create('div','bv2-actor');actor.dataset.seat=figure.seatId;actor.dataset.slot=figure.slotId;
   for(const layer of ['body','front']){
    const svg=boardV2FigureSvg(figure,{layer});if(!svg)continue;
    const body=create('span','bv2-figure');body.dataset.mirror=String(figure.mirror);body.setAttribute('aria-hidden','true');body.innerHTML=svg;
    setBox(body,{left:figure.body.left,top:figure.body.top,width:figure.body.side,height:figure.body.side});body.style.zIndex=String(layer==='body'?Math.round(figure.depth)*2:1500+Math.round(figure.depth));actor.append(body);
   }
   const name=create('span','bv2-nameplate'),number=create('b','bv2-nameplate__number'),label=create('span','bv2-nameplate__name');
   number.textContent=figure.seatId.slice(5);label.textContent=figure.displayName??CREW[figure.characterId]?.sign??`Player ${figure.seatId.slice(5)}`;
   name.title=label.textContent;name.style.left=px(figure.name.left);name.style.top=px(figure.name.top);name.style.setProperty('--bv2-name-width',px(Math.min(76,room.panel.width)));name.append(number,label);actor.append(name);
   if(choice){const button=create('button','bv2-seat-target');button.type='button';button.id=choice.id;button.dataset.intent='action/choose';button.dataset.value=choice.value;button.setAttribute('aria-label',choice.label);button.setAttribute('aria-describedby','ms-action-step');setBox(button,{left:figure.press.left,top:figure.press.top,width:figure.press.side,height:figure.press.side});actor.append(button);}
   section.append(actor);
  }
  board.append(section);
 }
 root.replaceChildren(board);return {painted:true,problems:[],capsuleChoices};
}
