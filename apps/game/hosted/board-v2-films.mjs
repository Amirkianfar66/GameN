// Native painter over the reviewed pure drawing ports. All inputs are authorized model facts.
// Optional drawings never create a target, modify a placement, send a command or fetch an asset.
import {FRAME} from './scene-drawing/body.mjs';
import {CREW} from './scene-drawing/crew.mjs';
import {skeletonOf,INJURED} from './scene-drawing/gestures.mjs';
import {dressedFigureSvg,outfitFor} from './scene-drawing/wardrobe.mjs';
import {walkingPose} from './board-v2-drawing/capsule-figures.mjs';
import {blend,TIMELINES,sample as sampleMotion} from './scene-drawing/motion.mjs';
import {pressPoint} from './scene-drawing/frame.mjs';
import {berthState,criticalFrame} from './board-v2-drawing/medical-film.mjs';
import {fourBerthKit,fourRescueFrame} from './board-v2-drawing/medical-four.mjs';
import {berthScreenSvg,lampSvg,vitalsInsetSvg,tagBox,insetBox,droneFit,DRONE,DRONE_SCENE,droneSvg,scanLineSvg,hologramSvg,pulseSvg} from './board-v2-drawing/medical-fx.mjs';
import {captainPose,ejectPose} from './board-v2-drawing/captain-figures.mjs';
import {walkToDoor,pullToHatch,captainButtonStates,plateFor,DOOR_STEP,RELEASE_FILM} from './board-v2-drawing/captain-film.mjs';
import {consoleBox,consoleSvg,plateSvg,jailDoorSvg,airlockSvg,conduitPoints,conduitAt,EXTERIOR,exteriorSvg,plaqueBox,plaqueSvg,memorialSvg,JAIL_DOOR,COVER,GLOVE,PLATE,gloveSvg,coverSvg,ringSvg,clickSvg,AIRLOCK} from './board-v2-drawing/captain-fx.mjs';
import {spinePlaqueBox,fullStampBox,overflowWay} from './board-v2-drawing/overflow-fx.mjs';
import {CLONE,cloneCardLayout,outlineSvg,halftoneSvg,scanSvg,stageSvg} from './board-v2-drawing/clone-fx.mjs';
import {cloneWords,cloneFrame,cloneEnd} from './board-v2-drawing/clone-film.mjs';
const [BX,BY,SIZE]=FRAME.box,[AX,AY]=FRAME.anchor;
const px=n=>`${n}px`;
const box=(node,r)=>{for(const key of ['left','top','width','height'])node.style[key]=px(r[key]);};
const unitBox=(f,x,y,w,h)=>({left:f.tx+x*f.k,top:f.ty+y*f.k,width:w*f.k,height:h*f.k});

const namespaceSvg=(svg,prefix)=>{const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);for(const id of ids)svg=svg.replaceAll(`id="${id}"`,`id="${prefix}-${id}"`).replaceAll(`url(#${id})`,`url(#${prefix}-${id})`).replaceAll(`href="#${id}"`,`href="#${prefix}-${id}"`);return svg;};
const nameBand=who=>({left:who.name.left-38,top:who.name.top,width:76,height:16});
export function createBoardV2Films(root,holder){
 const document=root.ownerDocument,nodes=new Map(),restored=new Map();let used=new Set();
 const caption=room=>{
  const parent=holder._boardV2Paint.rooms.get(room.room),node=parent?.querySelector('.bv2-caption');
  if(!node)return {left:0,top:0,width:room.panel.width,height:room.panel.cap};
  const a=parent.getBoundingClientRect(),b=node.getBoundingClientRect();return {left:b.left-a.left-2,top:b.top-a.top-2,width:b.width,height:b.height};
 };
 const make=(parent,key,rect,{svg=null,art=null,text=null,opacity=1,scale=1,z=2200}={})=>{
  if(!parent||!rect)return null;used.add(key);let node=nodes.get(key);
  if(!node){node=document.createElement('span');node.className='bv2-film';node.dataset.filmPart=key;node.setAttribute('aria-hidden','true');nodes.set(key,node);}
  if(node.parentNode!==parent)parent.append(node);box(node,rect);node.style.opacity=String(opacity);node.style.transform=`scale(${scale})`;node.style.zIndex=String(z);
  if(svg!==null)svg=namespaceSvg(svg,`native-${key}`);
  if(svg!==null&&node._svg!==svg){node.innerHTML=svg;node._svg=svg;}else if(text!==null)node.textContent=text;
  if(art)node.style.backgroundImage=`var(--board-v2-film-${art})`;
  return node;
 };
 const hide=id=>{for(const place of [holder._boardV2Paint?.actors.get(id),...[...(holder._boardV2Paint?.capsuleActors.values()??[])].filter(n=>n.dataset.seat===id)]){
  for(const node of place?.querySelectorAll('.bv2-figure,.bv2-away')??[]){if(!restored.has(node))restored.set(node,node.style.visibility);node.style.visibility='hidden';}
 }};
 function beforePaint(){for(const [node,value]of restored)node.style.visibility=value;restored.clear();}
 function figure(parent,key,who,slot,f,sk,{opacity=1,silhouette=false,body=false,memorial=false,outfit=outfitFor(who.location),z=1000,offset=[0,0]}={}){
  if(!CREW[who.characterId])return;
  const unit=slot.scale*f.k;
  for(const layer of ['body','front']){
   const rig=dressedFigureSvg(CREW[who.characterId],sk,{outfit,prefix:`film-${key}-${layer}`,layer}),svg=memorial?memorialSvg(rig):rig;
   const node=make(parent,`${key}-${layer}`,{left:f.tx+slot.at[0]*f.k-(AX-BX)*unit+offset[0],top:f.ty+slot.at[1]*f.k-(AY-BY)*unit+offset[1],width:SIZE*unit,height:SIZE*unit},{svg,opacity,z:layer==='front'?1500+z/2:z});
   node.style.transform=`scaleX(${slot.mirror?-1:1})`;node.style.transformOrigin=`${(AX-BX)/SIZE*100}% 50%`;
   node.style.filter=silhouette?'brightness(0)':body&&!memorial?'grayscale(1)':'';
  }
 }
 function monitor(room,key,kit,kind,lamp,opacity=1){
  const parent=holder._boardV2Paint.rooms.get('hospital'),f=room.frame,m=kit.monitor,l=kit.lamp;
  make(parent,`${key}-screen`,unitBox(f,m.x,m.y,m.w,m.h),{svg:berthScreenSvg(kind),z:900});
  make(parent,`${key}-lamp`,unitBox(f,l.cx-l.r*2,l.cy-l.r*2,l.r*4,l.r*4),{svg:lampSvg(lamp==='dark'?'off':lamp),opacity,z:901});
 }
 function bedLight(room,key,kit,dim){
  if(dim<=0)return;const l=kit.bedLight,node=make(holder._boardV2Paint.rooms.get('hospital'),`${key}-bed-light`,unitBox(room.frame,l.cx-l.rx,l.cy-l.ry,l.rx*2,l.ry*2),{opacity:dim,z:2});node.style.backgroundColor='#091923';node.style.borderRadius='50%';
 }
 function patient(room,key,who,berth,state){
  const slot=room.figures.find(f=>f.slotId===berth)?.slot??room.slots.find(s=>s.id===berth);
  if(!slot)return;
  const pose=state.pose==='healthy'?'bedSitting':state.pose==='still'?slot.down:`${slot.gesture}${INJURED}`;
  const [pressX,pressY]=pressPoint(skeletonOf(pose));
  const at=[slot.mirror?slot.pressAt[0]-(AX-pressX)*slot.scale:slot.pressAt[0]-(pressX-AX)*slot.scale,slot.pressAt[1]-(pressY-AY)*slot.scale];
  hide(who.seatId);figure(holder._boardV2Paint.rooms.get('hospital'),key,who,{...slot,at},room.frame,skeletonOf(pose),{outfit:'gown',z:2*Math.round(slot.depth),offset:state.offset??[0,0],opacity:state.opacity??1});
 }
 function clinical(entry,room,seats){
  const {berth,subjectId,event}=entry,who=seats.find(s=>s.seatId===subjectId),kit=fourBerthKit(berth),parent=holder._boardV2Paint.rooms.get('hospital');
  const rect=room.presses.find(r=>r.id===berth),held=room.figures.filter(w=>w.seatId!==subjectId).map(w=>({left:w.press.left,top:w.press.top,width:w.press.side,height:w.press.side}));
  const key=event.eventId,fit=droneFit({kit,frame:room.frame,keepClear:[caption(room),...held]}),droneWidth=DRONE_SCENE.width*kit.scale*room.frame.k*fit;
  const f=entry.clinical==='HEALED'?fourRescueFrame(entry.t,berth,{reduced:entry.reduced,fit}):entry.frame;
  if(entry.clinical==='INJURY'){const state=berthState(who);monitor(room,key,kit,f.monitor.kind,state.lamp,f.lamp.on?f.lamp.opacity:0);patient(room,`${key}-patient`,who,berth,{pose:'injured',offset:[0,f.breath??0],opacity:f.figure.opacity});return;}
  patient(room,`${key}-patient`,who,berth,f.patient);
  bedLight(room,key,kit,(f.bedLight??0));
  monitor(room,key,kit,f.inset.kind,f.lamp.state,f.lamp.opacity);
  const inset=insetBox({rect,panel:room.panel,width:Math.max(60,Math.min(84,room.panel.width*.42)),caption:caption(room),keepClear:held});
  if(inset)make(parent,`${key}-vitals`,inset,{svg:vitalsInsetSvg(f.inset.kind,{sweep:f.inset.sweep,dot:f.inset.dot??0}),opacity:f.inset.opacity,scale:f.inset.scale});
  if(f.drone?.at&&f.drone.opacity){
   const w=droneWidth,h=w*DRONE.h/DRONE.w;
   const [x,y]=f.drone.at,point=[room.frame.tx+x*room.frame.k,room.frame.ty+y*room.frame.k];
   make(parent,`${key}-drone`,{left:point[0]-w*DRONE.lens[0]/DRONE.w,top:point[1]-h*DRONE.lens[1]/DRONE.h,width:w,height:h},{svg:droneSvg(f.drone.frame),opacity:f.drone.opacity});
  }
  const chest=[room.frame.tx+kit.chest[0]*room.frame.k,room.frame.ty+kit.chest[1]*room.frame.k];
  if(f.scan?.opacity){const width=kit.bed.w*room.frame.k*1.15,height=width*16/140,y=room.frame.ty+(kit.bed.y+kit.bed.h*.7*f.scan.y)*room.frame.k;make(parent,`${key}-scan`,{left:chest[0]-width/2,top:y-height/2,width,height},{svg:scanLineSvg(),opacity:f.scan.opacity});}
  if(f.hologram?.opacity){const side=droneWidth*.55;make(parent,`${key}-holo`,{left:chest[0]-side/2,top:chest[1]-side*.75,width:side,height:side},{svg:hologramSvg(),opacity:f.hologram.opacity});}
  if(f.pulse?.opacity){const side=droneWidth*.9;make(parent,`${key}-pulse`,{left:chest[0]-side/2,top:chest[1]-side/2,width:side,height:side},{svg:pulseSvg(f.pulse.frame),opacity:f.pulse.opacity,scale:f.pulse.scale});}

 }
 function captain(entry,rooms,seats,layout){
  const f=entry.frame,jail=rooms.find(r=>r.room==='jail'),command=rooms.find(r=>r.room==='command-room');if(!jail||!command)return;
  const prefix=entry.event.eventId,parent=holder._boardV2Paint.rooms.get('jail'),cap=seats.find(s=>s.seatId===entry.captain?.seatId),capFigure=command.figures.find(s=>s.seatId===cap?.seatId);
  if(capFigure&&f.captain){hide(cap.seatId);figure(holder._boardV2Paint.rooms.get('command-room'),`${prefix}-captain`,cap,capFigure.slot,command.frame,captainPose(f.captain.from,f.captain.to,f.captain.v),{z:2*Math.round(capFigure.depth),outfit:'crew'});}
  make(parent,`${prefix}-door`,unitBox(jail.frame,...JAIL_DOOR.box),{svg:jailDoorSvg({...f.door,prefix:`${prefix}-door`}),z:1});
  const commandBox=layout.board.boxes['command-room'];
  const inset=capFigure?consoleBox({band:{left:0,top:0,width:command.panel.width,height:command.panel.height},cap:command.panel.cap,captain:{left:capFigure.press.left,top:capFigure.press.top,width:capFigure.press.side,height:capFigure.press.side},tag:nameBand(capFigure),keepClear:[]}):null;
  if(inset&&f.inset.opacity){
   const container=make(holder._boardV2Paint.rooms.get('command-room'),`${prefix}-console-frame`,inset,{opacity:f.inset.opacity,scale:f.inset.scale});
   const s=inset.scale,layer=(name,x,y,w,h,options)=>make(container,`${prefix}-inset-${name}`,{left:x*s,top:y*s,width:w*s,height:h*s},options);
   layer('console',0,0,224,96,{svg:consoleSvg(),z:1});layer('plate',12,26,200,64,{svg:plateSvg(entry.command.toLowerCase(),f.inset.plate),z:2});
   const label=layer('word',12+PLATE.label.x,26+PLATE.label.y,PLATE.label.w,PLATE.label.h,{text:entry.command,z:3});label.style.fontSize=px(18*s);label.style.lineHeight=px(PLATE.label.h*s);label.style.textAlign='center';label.style.fontWeight='900';label.style.color='#F4EBDD';
   if(f.inset.cover)layer('cover',12+COVER.at[0],26+COVER.at[1],COVER.w,COVER.h,{svg:coverSvg(f.inset.cover),z:4});
   const button=[12+PLATE.button[0],26+PLATE.button[1]];
   if(f.inset.ring)layer('ring',button[0]-40,button[1]-40,80,80,{svg:ringSvg(),opacity:f.inset.ring.opacity,scale:f.inset.ring.scale,z:5});
   if(f.inset.click)layer('click',button[0]-40,button[1]-40,80,80,{svg:clickSvg(),opacity:f.inset.click.opacity,scale:f.inset.click.scale,z:5});
   if(f.inset.glove){const g=f.inset.glove;layer('glove',button[0]+g.lift*14-GLOVE.tip[0],button[1]+g.lift*30-GLOVE.tip[1],GLOVE.w,GLOVE.h,{svg:gloveSvg(),opacity:g.opacity,z:6});}
  }
  if(f.pulse&&capFigure){const b=layout.board.shell.border,start=[commandBox.left+b+(inset?inset.left+inset.width/2:capFigure.name.left),commandBox.top+b+(inset?inset.top+inset.height:capFigure.press.top)];
   const points=conduitPoints({boxes:layout.board.boxes,border:b,jail:{...jail.frame,tx:layout.board.boxes.jail.left+b+jail.frame.tx,ty:layout.board.boxes.jail.top+b+jail.frame.ty},start}),at=conduitAt(points,f.pulse.v).head;
   make(holder,`${prefix}-pulse`,{left:at[0]-8,top:at[1]-8,width:16,height:16},{art:`captain-pulse-head-${entry.command.toLowerCase()}`,opacity:f.pulse.opacity,z:3100});}
  if(f.airlock?.reveal)make(parent,`${prefix}-airlock`,unitBox(jail.frame,...AIRLOCK.box),{svg:airlockSvg({...f.airlock,prefix:`${prefix}-hatch`}),opacity:f.airlock.reveal,z:1800});
  if(f.emergency)make(parent,`${prefix}-emergency`,unitBox(jail.frame,0,0,1024,768),{art:'captain-emergency',opacity:f.emergency,z:1700});
  if(f.suction?.opacity)make(parent,`${prefix}-suction`,unitBox(jail.frame,0,0,1024,768),{art:`captain-suction-${f.suction.frame}`,opacity:f.suction.opacity,z:1801});
  if(f.debris?.opacity)for(const [kind,from,spin]of[['paper',[740,548],260],['cup',[612,596],-200]]){const v=f.debris.v,u=v*v,side=34*(1-.6*u),x=from[0]+(AIRLOCK.c[0]-from[0])*u,y=from[1]+(AIRLOCK.c[1]-from[1])*u-Math.sin(Math.PI*u)*60;const n=make(parent,`${prefix}-debris-${kind}`,unitBox(jail.frame,x-side/2,y-side/2,side,side),{art:`captain-debris-${kind}`,opacity:f.debris.opacity,z:1495});n.style.rotate=`${Math.round(spin*u)}deg`;}
  for(let i=0;i<entry.subjects.length;i++){
   const subject=entry.subjects[i],person=f.people[i],who=seats.find(s=>s.seatId===subject.seatId),slot=jail.slots.find(s=>s.id===subject.before?.slotId);
   // No held-before snapshot means no invented Jail origin. The committed snapshot remains visible.
   if(!person||!slot||!who||entry.reduced)continue;
   const sk=skeletonOf(subject.body?slot.down:slot.gesture);let placed=slot,posed=sk,opacity=1;
   if(entry.command==='RELEASE'){
    if(person.state==='settled')continue;
    if(person.state==='up')posed=blend(sk,walkingPose(0,{jailed:true}),person.v);
    if(person.state==='door'){placed={...slot,...walkToDoor(slot,person.v)};posed=walkingPose(person.v*2,{jailed:true});}
    if(person.state==='through'){placed={...slot,at:[DOOR_STEP.at[0],DOOR_STEP.at[1]+(DOOR_STEP.through[1]-DOOR_STEP.at[1])*person.v],scale:DOOR_STEP.scale*(1-.08*person.v),mirror:false};posed=walkingPose(2+person.v,{jailed:true});opacity=1-person.v;}
    const destination=rooms.flatMap(r=>r.figures.map(f=>({room:r,figure:f}))).find(p=>p.figure.seatId===who.seatId);
    if(person.state==='across'&&destination){
     const b=layout.board.shell.border,from=[layout.board.boxes.jail.left+b+jail.frame.tx+DOOR_STEP.through[0]*jail.frame.k,layout.board.boxes.jail.top+b+jail.frame.ty+DOOR_STEP.through[1]*jail.frame.k],to=[layout.board.boxes[destination.room.room].left+b+destination.figure.sceneFrame.tx+destination.figure.slot.at[0]*destination.figure.sceneFrame.k,layout.board.boxes[destination.room.room].top+b+destination.figure.sceneFrame.ty+destination.figure.slot.at[1]*destination.figure.sceneFrame.k];
     const v=person.v,u=v<.5?2*v*v:1-(-2*v+2)**2/2,d=Math.hypot(to[0]-from[0],to[1]-from[1]),at=[from[0]+(to[0]-from[0])*u,from[1]+(to[1]-from[1])*u-Math.sin(Math.PI*u)*.06*d],scale=DOOR_STEP.scale*jail.frame.k+(destination.figure.slot.scale*destination.figure.sceneFrame.k-DOOR_STEP.scale*jail.frame.k)*u;
     hide(who.seatId);figure(holder,`${prefix}-${who.seatId}-across`,who,{at,scale,mirror:to[0]>from[0]},{k:1,tx:0,ty:0},walkingPose(v*1.5,{jailed:true}),{outfit:'prison',z:3100});continue;
    }
    if(person.state==='land'&&destination){hide(who.seatId);figure(holder._boardV2Paint.rooms.get(destination.room.room),`${prefix}-${who.seatId}-land`,who,destination.figure.slot,destination.figure.sceneFrame,sampleMotion(TIMELINES.arrive(skeletonOf(destination.figure.gesture),RELEASE_FILM.walk.land,walkingPose(1.5,{})),person.v*RELEASE_FILM.walk.land),{z:2*Math.round(destination.figure.depth)});continue;}
   }else{
    if(person.state==='gone'||person.state==='settled')continue;
    if(person.state==='dissolve')opacity=1-person.v;
    else if(person.state==='pulled'){placed={...slot,...pullToHatch(slot,person.v,i)};opacity=placed.opacity;posed=ejectPose(sk,{tumbling:Math.min(1,person.v*3)});}
    else posed=ejectPose(sk,{startled:person.state==='startle'?person.v:0,braced:person.state==='brace'?person.v:0});
   }
   hide(who.seatId);figure(parent,`${prefix}-${who.seatId}`,who,placed,jail.frame,posed,{outfit:'prison',opacity,body:subject.body,silhouette:entry.command==='EJECT'&&!subject.body&&person.state==='pulled',z:2*Math.round(slot.depth)});
  }
  if(f.exterior?.opacity){
   const cover=Math.max(jail.panel.width/EXTERIOR.w,jail.panel.height/EXTERIOR.h),ox=(jail.panel.width-EXTERIOR.w*cover)/2,oy=(jail.panel.height-EXTERIOR.h*cover)/2;
   make(parent,`${prefix}-exterior`,{left:ox,top:oy,width:EXTERIOR.w*cover,height:EXTERIOR.h*cover},{svg:exteriorSvg(),opacity:f.exterior.opacity,z:2300});
   entry.subjects.filter(s=>!s.body).forEach((subject,i)=>{const who=seats.find(s=>s.seatId===subject.seatId),v=Math.max(0,Math.min(1,f.exterior.drift*1.15-i*.08)),angle=-1.45+(entry.subjects.length>1?i*1.3/(entry.subjects.length-1):.65),reach=(24+(110+18*(i%2))*v)*cover,scale=.075*cover*3.2*(1-.4*v),at=[ox+EXTERIOR.hatch[0]*cover+Math.cos(angle)*reach,oy+EXTERIOR.hatch[1]*cover+Math.sin(angle)*reach+108*scale];figure(parent,`${prefix}-drift-${who.seatId}`,who,{at,scale,mirror:i%2===1},{k:1,tx:0,ty:0},ejectPose(skeletonOf('stand'),{tumbling:1}),{opacity:f.exterior.opacity,silhouette:true,outfit:'prison',z:2400});});
  }
 }
 function overflow(entry,rooms,seats,layout){
  const room=rooms.find(r=>r.room==='hospital'),f=entry.frame,p=holder._boardV2Paint.rooms.get('hospital');
  const stamp=fullStampBox({caption:caption(room),size:[84,24],panel:room.panel,keepClear:room.figures.map(nameBand)});
  if(stamp)make(p,`${entry.event.eventId}-full`,{...stamp,width:84,height:24},{text:'HOSPITAL FULL',opacity:f.full.opacity,scale:f.full.scale??1});
  const originRoom=rooms.find(r=>r.room===({'Room A':'room-a','Room B':'room-b','Command Room':'command-room','Jail':'jail','Hospital':'hospital'}[entry.origin?.location]));
  const slot=originRoom?.slots.find(s=>s.id===entry.origin?.slotId),who=seats.find(s=>s.seatId===entry.subjectId);
  // Both stages use only the held-before placement and public identity. These
  // decorative copies never restore an interactive world/capsule actor.
  if(slot&&who){
   const held={...who,...entry.origin},pose=skeletonOf(held.health==='Eliminated'?slot.down:held.health==='Injured'?`${slot.gesture}${INJURED}`:slot.gesture),parent=holder._boardV2Paint.rooms.get(originRoom.room);
   if(f.figure.opacity)figure(parent,`${entry.event.eventId}-origin`,held,slot,originRoom.frame,pose,{opacity:f.figure.opacity,z:2*Math.round(slot.depth)});
   if(f.figure.grey)figure(parent,`${entry.event.eventId}-grey`,held,slot,originRoom.frame,pose,{opacity:f.figure.grey,body:true,memorial:true,z:2*Math.round(slot.depth)+1});
  }
  if(slot&&who&&f.flyer?.opacity&&!entry.reduced){const b=layout.board.boxes[originRoom.room],at=[b.left+layout.board.shell.border+originRoom.frame.tx+slot.pressAt[0]*originRoom.frame.k,b.top+layout.board.shell.border+originRoom.frame.ty+slot.pressAt[1]*originRoom.frame.k],target=[layout.board.boxes.hospital.left,layout.board.boxes.jail.top];
   const point=overflowWay(at,target,f.flyer.v);figure(holder,`${entry.event.eventId}-paper`,who,{at:point,scale:.18*f.flyer.scale,mirror:false},{k:1,tx:0,ty:0},skeletonOf(slot.down),{opacity:f.flyer.opacity,body:true,memorial:true,outfit:outfitFor(entry.origin.location),z:3100});}
 }
 function privateCard(own,seats){
  let card=root.querySelector('.bv2-clone-card');
  const panel=root.dataset.phoneView==='actions'?root.querySelector('.ms-private[data-open="true"] .ms-private__panel'):null;
  const who=seats.find(s=>s.seatId===own?.seatId);
  if(!own||!panel||!CREW[who?.characterId]){card?.remove();root.dataset.boardClone='false';for(const line of root.querySelectorAll('[data-clone-duplicate]')){line.hidden=false;delete line.dataset.cloneDuplicate;}return;}
  root.dataset.boardClone='true';for(const line of root.querySelectorAll('.bv2-private-status'))if(line.textContent===cloneWords(own.status)){line.hidden=true;line.dataset.cloneDuplicate='true';}
  if(!card){card=document.createElement('div');card.className='bv2-clone-card';card.dataset.private='true';const drawing=document.createElement('div');drawing.className='bv2-clone-drawing';drawing.setAttribute('aria-hidden','true');const words=document.createElement('p');card.append(drawing,words);panel.prepend(card);}
  card.dataset.cloneState=own.state;card.dataset.cloneFilm=own.film??'rest';
  const width=Math.max(180,panel.clientWidth-12),l=cloneCardLayout({width,height:100}),drawing=card.firstElementChild;card.style.minHeight='100px';
  const full=dressedFigureSvg(CREW[who.characterId],skeletonOf('stand'),{outfit:outfitFor(who.location),prefix:'own-clone-card'}),f=own.frame;
  box(drawing,{left:0,top:0,width:l.portrait.left+l.portrait.width+6,height:l.height});
  const kind=own.state==='active'?'activate':'expire',state=f??cloneFrame(kind,cloneEnd(kind,own.reduced),{reduced:own.reduced});
  // This subtree is removed on concealment. All SVG comes from pure reviewed rig functions.
  drawing.innerHTML='';
  const part=(key,r,svg,opacity)=>{if(!opacity)return;const n=document.createElement('span');n.className='bv2-film';n.dataset.clonePart=key;box(n,r);n.innerHTML=namespaceSvg(svg,`private-clone-${key}`);n.style.opacity=String(opacity);drawing.append(n);};
  part('stage',{left:0,top:0,width:l.portrait.left+l.portrait.width+6,height:l.height},stageSvg({width:l.portrait.left+l.portrait.width+6,height:l.height,real:l.real.feet[0],clone:l.clone.feet[0],floor:l.real.feet[1],lit:state.pad,prefix:'own-stage'}),1);
  const rect=p=>({left:p.left,top:p.top,width:p.size,height:p.size});
  part('real',rect(l.real),full,state.real.opacity);part('outline',rect(l.real),outlineSvg(full,{prefix:'own-outline'}),state.outline.opacity);
  part('duplicate',rect(l.clone),full,state.clone.opacity);part('halftone',rect(l.clone),halftoneSvg(full,{density:state.halftone.density,prefix:'own-halftone'}),state.halftone.opacity);
  if(state.scan)part('scan',{left:l.portrait.left,top:l.portrait.top+state.scan.y*l.portrait.height,width:l.portrait.width,height:10},scanSvg({width:l.portrait.width,height:10,prefix:'own-scan'}),state.scan.opacity??1);
  for(const kind of ['active','ended']){
   let stamp=card.querySelector(`[data-clone-stamp="${kind}"]`);
   if(!stamp){stamp=document.createElement('span');stamp.className='bv2-clone-stamp';stamp.dataset.cloneStamp=kind;stamp.setAttribute('aria-hidden','true');stamp.textContent=kind==='active'?'CLONE ACTIVE':'CLONE ENDED';card.insertBefore(stamp,card.lastElementChild);}
   stamp.style.left=px(l.words.left);stamp.style.opacity=String(state.stamps[kind].opacity);stamp.style.transform=`scale(${state.stamps[kind].scale})`;stamp.style.color=kind==='active'?CLONE.scan:CLONE.ended;
  }
  card.lastElementChild.textContent=cloneWords(own.status);card.lastElementChild.style.marginLeft=px(l.words.left);
 }
 function commandPlates(captain,card){
  if(!captain){root.querySelector('.bv2-captain-states')?.remove();return;}
  const states=captainButtonStates({self:{seatId:'own',captainCommandUses:captain.uses},legalTargets:{CAPTAIN_RELEASE:captain.releaseAvailable?['own']:[],CAPTAIN_EJECT:captain.ejectAvailable?['own']:[]}},card?.body.step==='busy'?(card.kind==='captain-release'?'release':card.kind==='captain-eject'?'eject':null):null);
  for(const kind of ['release','eject'])for(const button of root.querySelectorAll(`button[data-kind="captain-${kind}"]`)){
   button.dataset.captainPlate=states[kind];button.style.setProperty('--captain-plate',`var(--board-v2-film-captain-plate-${kind}-${plateFor(states[kind])})`);
   const label=kind.toUpperCase();let word=button.querySelector('.bv2-captain-word');if(!word){word=document.createElement('span');word.className='bv2-captain-word';button.replaceChildren(word);}word.textContent=label;button.setAttribute('aria-label',`Captain ${kind==='release'?'Release':'Eject'}`);
   button.title=`${label}: ${states[kind]}`;
  }
  let strip=root.querySelector('.bv2-captain-states');
  const closed=['release','eject'].filter(kind=>!root.querySelector(`button[data-kind="captain-${kind}"]`));
  const panel=card?.body.step==='idle'?root.querySelector('.ms-private[data-open="true"] .ms-private__panel'):null;
  if(!panel||!closed.length){strip?.remove();return;}
  if(!strip){strip=document.createElement('div');strip.className='bv2-captain-states';strip.dataset.private='true';strip.setAttribute('aria-hidden','true');panel.prepend(strip);}
  strip.replaceChildren();for(const kind of closed){const plate=document.createElement('div');plate.dataset.captainPlate=states[kind];const word=document.createElement('span');word.className='bv2-captain-word';word.textContent=`${kind.toUpperCase()} · ${states[kind]}`;plate.append(word);plate.style.setProperty('--captain-plate',`var(--board-v2-film-captain-plate-${kind}-${plateFor(states[kind])})`);strip.append(plate);}
 }
 return {beforePaint,paint({sample,frame,board,seats,geometry,layout,enabled,dark=false,privateOpen=false,captain:captainState=null,card=null,time=0}){
  used=new Set();
  const rooms=frame.rooms.map(r=>({...r,slots:geometry.slotsOf(r.room,board.playerCount),presses:geometry.slotRects(r.room,board.playerCount,r.panel)}));
  if(enabled&&!dark){
   const hospital=rooms.find(r=>r.room==='hospital');
   for(const who of seats.filter(s=>s.location==='Hospital')){
    const state=berthState(who),kit=fourBerthKit(who.slotId);bedLight(hospital,`rest-${who.seatId}`,kit,state.bedLight==='off'?1:0);monitor(hospital,`rest-${who.seatId}`,kit,state.monitor,state.lamp);
    const rect=hospital.presses.find(r=>r.id===who.slotId);
    if(state.tag||state.detention){const text=[state.tag?(state.tag.text?`RESCUE ${state.tag.text}`:'NO RESCUE'):null,state.detention?'DETAINED':null].filter(Boolean).join('\n'),height=state.detention?28:16,place=tagBox({plate:rect.badge,size:[Math.min(68,hospital.panel.width/2),height],panel:hospital.panel,keepClear:hospital.figures.map(nameBand)});
     make(holder._boardV2Paint.rooms.get('hospital'),`tag-${who.seatId}`,{...place,width:Math.min(68,hospital.panel.width/2),height},{text,opacity:sample.items.find(e=>e.kind==='medical'&&e.subjectId===who.seatId&&e.clinical==='INJURY')?.frame.tag.opacity??1});}
    if(who.health==='Injured'&&!sample.items.some(e=>e.kind==='medical'&&e.subjectId===who.seatId)){
     const breath=criticalFrame(time,{reduced:sample.reduced});patient(hospital,`critical-${who.seatId}`,who,who.slotId,{pose:'injured',offset:[0,breath.breath??0]});
    }
   }
   for(const entry of sample.items){if(entry.kind==='medical')clinical(entry,hospital,seats);else if(entry.kind==='captain')captain(entry,rooms,seats,layout);else overflow(entry,rooms,seats,layout);}
   const off=seats.filter(s=>s.health==='Eliminated'&&s.location===null&&s.slotId===null);
   const plaqueScale=Math.max(1,...sample.items.filter(e=>e.kind==='overflow').map(e=>e.frame.plaque.scale));
   if(off.length){const place=spinePlaqueBox({hospital:layout.board.boxes.hospital,jail:layout.board.boxes.jail,border:layout.board.shell.border,cap:layout.board.panels.jail.cap,size:[76,22]});
    const jail=rooms.find(r=>r.room==='jail'),fallback=place?null:plaqueBox({caption:caption(jail),size:[60,18],panel:jail.panel});
    const plaque=make(place?holder:holder._boardV2Paint.rooms.get('jail'),'offboard-plaque',place??{...fallback,width:60,height:18},{z:4900,scale:plaqueScale});
    plaque.classList.add('bv2-memorial');
    if(!plaque.firstElementChild){const icon=document.createElement('span'),count=document.createElement('b');icon.innerHTML=plaqueSvg();plaque.append(icon,count);}
    plaque.lastElementChild.textContent=String(off.length);plaque.title=`${off.length} off board`;
   }
  }
  privateCard(enabled&&privateOpen?sample.own:null,seats);if(enabled&&privateOpen)commandPlates(captainState,card);
  for(const[key,node]of nodes)if(!used.has(key)){node.remove();nodes.delete(key);}
 },clear(){beforePaint();root.dataset.boardClone='false';for(const line of root.querySelectorAll('[data-clone-duplicate]')){line.hidden=false;delete line.dataset.cloneDuplicate;}for(const node of nodes.values())node.remove();nodes.clear();root.querySelector('.bv2-clone-card')?.remove();root.querySelector('.bv2-captain-states')?.remove();},dispose(){this.clear();}};
}
