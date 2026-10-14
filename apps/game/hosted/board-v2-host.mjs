// Connected native Board V2 adapter. Geometry comes only from Claude's exact pure ports;
// gameplay comes only from the validated model. RAF changes drawings, never a phase/command.
import {turnsLayout} from './board-v2-drawing/turns.mjs';
import {slotRects} from './board-v2-drawing/fit.mjs';
import {BOARD_ROOMS,sceneOf} from './board-v2-drawing/slots.mjs';
import {boardV2SceneFrame,paintBoardV2} from './board-v2-scene.mjs';
import {createBoardV2Blackout} from './board-v2-blackout.mjs';
import {slotsOf,LOCATION_OF} from './board-v2-drawing/slots.mjs';
import {blockedFrame} from './board-v2-drawing/blocked-film.mjs';
import {labelBox} from './board-v2-drawing/label-box.mjs';
import {createBoardV2Capsule} from './board-v2-capsule.mjs';

const px=n=>`${n}px`;
const box=(node,r)=>{if(!node||!r)return;for(const name of ['left','top','width','height'])if(Number.isFinite(r[name]))node.style[name]=px(r[name]);};
const safeInsets=document=>{
 const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;padding:var(--bv2-safe-top,env(safe-area-inset-top)) var(--bv2-safe-right,env(safe-area-inset-right)) var(--bv2-safe-bottom,env(safe-area-inset-bottom)) var(--bv2-safe-left,env(safe-area-inset-left))';document.body.append(probe);
 const s=getComputedStyle(probe),out={top:parseFloat(s.paddingTop)||0,right:parseFloat(s.paddingRight)||0,bottom:parseFloat(s.paddingBottom)||0,left:parseFloat(s.paddingLeft)||0};probe.remove();return out;
};

export function createBoardV2Host(root,{now=()=>performance.now()}={}) {
 const document=root.ownerDocument,holder=document.createElement('div');holder.className='bv2-mount';
 const capsule=createBoardV2Capsule({now}),blackout=createBoardV2Blackout({now}),identities=new Map();
 const blocks=new Map(),announced=new Set();
 const settleBlocks=()=>{blocks.clear();for(const fx of holder.querySelectorAll('.bv2-block-fx'))fx.remove();for(const figure of holder.querySelectorAll('.bv2-figure'))figure.style.translate='0px 0px';};
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let model=null,layout=null,frame=null,geometryKey=null,raf=null,disposed=false,tab=false,worldKey=null;
 const stop=()=>{if(raf!==null)cancelAnimationFrame(raf);raf=null;};
 const artForRoom=room=>{
  if(room==='hospital')return [{id:'back',cssVar:`--board-v2-art-ward-${model.match.boardLayout.playerCount}-back`,sceneDepth:-1000},
   ...Object.entries(sceneOf(room,model.match.boardLayout.playerCount).layers).map(([id,layer])=>({id,cssVar:`--board-v2-art-ward-berth-${id}`,sceneDepth:layer.depth,paintZIndex:2*Math.round(layer.depth)+1}))];
  return [{id:'back',cssVar:`--bm-scene-${room}-back`,sceneDepth:-1000},...Object.entries(sceneOf(room,model.match.boardLayout.playerCount).layers).map(([id,layer])=>({id,cssVar:`--bm-scene-${room}-${id.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`,sceneDepth:layer.depth}))];
 };
 function paint(){
  if(disposed||!layout?.fits||!frame)return;
  const card=root.dataset.phoneView==='actions'?model.match.privateArea?.content?.actions.card:null;
  const choices=card?.body.step==='choosing'?card.body.choices.filter(c=>c.number!==null):[];
  const sample=capsule.sample(),night=blackout.sample();
  paintBoardV2(holder,frame,layout.board.boxes,{artForRoom,choices,marks:card?.board??null,capsule:night?.dark?null:sample,canMove:model.surface==='player',blackout:night});
  paintNight(night,card);
  paintOutcomes(night);
  root.dataset.boardDark=String(night?.dark===true);
  if((sample.animate||night?.animate||blocks.size>0)&&document.visibilityState==='visible')raf=requestAnimationFrame(paint);else raf=null;
 }

 function commonLayer(section,name,cssVar,rect,opacity){
  let node=section.querySelector(`[data-night-layer="${name}"]`);
  if(!node){node=document.createElement('span');node.className='bv2-night-layer';node.dataset.nightLayer=name;node.setAttribute('aria-hidden','true');section.append(node);}
  node.style.backgroundImage=`var(${cssVar})`;node.style.opacity=String(opacity);box(node,rect);return node;
 }
 function paintNight(night,card){
  const active=holder._boardV2Paint,board=active?.board;if(!board)return;
  for(const room of frame.rooms){
   const section=active.rooms.get(room.room),f=night?.film;
   if(!f){section.querySelector('.bv2-room-heading').style.opacity='1';for(const node of section.querySelectorAll('.bv2-night-layer'))node.remove();continue;}
   const darkName=room.room==='hospital'?`hospital-ward-${model.match.boardLayout.playerCount}-dark`:`${room.room}-dark`;
   commonLayer(section,'dark',`--board-v2-motion-${darkName}`,{left:room.frame.tx,top:room.frame.ty,width:1024*room.frame.k,height:768*room.frame.k},f.darkness);
   for(const rect of slotRects(room.room,model.match.boardLayout.playerCount,room.panel)){
    commonLayer(section,`marker-${rect.id}`,`--board-v2-motion-marker-${f.markers.style}`,{left:rect.left,top:rect.top,width:rect.side,height:rect.side},f.markers.opacity);
   }
   const caption=section.querySelector('.bv2-room-heading');caption.style.opacity=String(f.captions);
   if(f.sparks.frame){const plan=f.sparks.plan[room.room];const spark=commonLayer(section,'spark','--board-v2-motion-fx-spark-'+f.sparks.frame,
    {left:room.frame.tx+(plan.at[0]-55)*room.frame.k,top:room.frame.ty+(plan.at[1]-30)*room.frame.k,width:110*room.frame.k,height:60*room.frame.k},1);spark.style.rotate=`${plan.tilt}deg`;}
   else section.querySelector('[data-night-layer="spark"]')?.remove();
  }
  let controls=holder.querySelector('.bv2-blackout-controls');
  const choices=night?.dark&&card?.kind==='blackout-slot'&&card.body.step==='choosing'?card.body.choices:[];
  if(!choices.length){controls?.remove();return;}
  if(!controls){controls=document.createElement('div');controls.className='bv2-blackout-controls';controls.setAttribute('aria-label','Your private frozen positions');holder.append(controls);}
  const slotSet=new Set(choices.map(c=>c.value));for(const node of controls.children)if(!slotSet.has(node.dataset.value))node.remove();
  for(const choice of choices){const room=BOARD_ROOMS.find(r=>slotsOf(r,model.match.boardLayout.playerCount).some(s=>s.id===choice.value));if(!room)continue;
   const r=slotRects(room,model.match.boardLayout.playerCount,layout.board.panels[room]).find(r=>r.id===choice.value),b=layout.board.boxes[room];
   let button=controls.querySelector(`[data-value="${choice.value}"]`);if(!button){button=document.createElement('button');button.type='button';button.className='bv2-slot-target';button.dataset.value=choice.value;button.dataset.intent='action/choose';controls.append(button);}
   button.id=choice.id;button.setAttribute('aria-label',choice.label);button.setAttribute('aria-describedby','ms-action-step');button.textContent=choice.value;
   box(button,{left:b.left+layout.board.shell.border+r.left,top:b.top+layout.board.shell.border+r.top,width:r.side,height:r.side});
  }
 }
 function paintOutcomes(night){
  const events=model.match.outcomes??[],reduced=media.matches||model.motion==='reduced';
  let notes=holder.querySelector('.bv2-outcomes');
  if(!notes){notes=document.createElement('section');notes.className='bv2-outcomes';notes.setAttribute('aria-live','polite');notes.setAttribute('aria-label','Authoritative outcomes');holder.append(notes);}
  const texts=events.filter(e=>e.fact.type!=='ATTACK_BLOCKED').map(e=>{
   const f=e.fact,who='seatId'in f?`Player ${f.seatId.slice(5)}`:f.seatIds.map(id=>`Player ${id.slice(5)}`).join(', ');
   return f.type==='MEDICAL_OUTCOME'?`${who}: ${f.kind==='INJURY'?'Injured':f.kind==='HEALED'?'Healed':'Eliminated'}.`
    :f.type==='CAPTAIN_OUTCOME'?`${who}: ${f.kind==='RELEASE'?'released from detention':'ejected'}.`
    :`${who}: ${f.location??'off board'}.`;
  });
  for(const event of events.filter(e=>e.fact.type==='ATTACK_BLOCKED'))if(!announced.has(event.eventId)){
   announced.add(event.eventId);blocks.set(event.eventId,{event,start:now()+(night?520:0)});
  }
  for(const [id,entry]of blocks){
   const f=entry.event.fact,room=BOARD_ROOMS.find(r=>LOCATION_OF[r]===f.location),section=holder._boardV2Paint?.rooms.get(room);
   if(night?.dark)continue;
   const t=now()-entry.start,film=blockedFrame(t,{reduced});
   if(film.done||!section){section?.querySelector(`[data-block-id="${id}"]`)?.remove();blocks.delete(id);continue;}
   const figure=frame.rooms.find(r=>r.room===room)?.figures.find(f=>f.seatId===entry.event.fact.seatId);
   // A checkpoint slot is not a persisted allocation. If the subject moved, keep the neutral
   // occurrence but do not attach its effect to another character or manufacture a bed.
   if(!figure||figure.slotId!==f.slotId){if(t>=0)texts.push(`Attack blocked on Player ${f.seatId.slice(5)}.`);continue;}
   let fx=section.querySelector(`[data-block-id="${id}"]`);if(!fx){fx=document.createElement('div');fx.className='bv2-block-fx';fx.dataset.blockId=id;fx.setAttribute('aria-hidden','true');section.append(fx);}
   const rect=figure.press,center=[rect.left+rect.side/2,rect.top+rect.side/2];
   const layer=(key,variable,opacity,scale=1)=>{let n=fx.querySelector(`[data-part="${key}"]`);if(!n){n=document.createElement('span');n.dataset.part=key;fx.append(n);}n.style.backgroundImage=`var(${variable})`;n.style.opacity=String(opacity);n.style.transform=`scale(${scale})`;box(n,{left:center[0]-rect.side,top:center[1]-rect.side,width:rect.side*2,height:rect.side*2});};
   layer('star','--board-v2-motion-fx-impact-1',film.star.on?1:0,film.star.scale);
   layer('shield','--board-v2-motion-fx-shield-'+Math.max(1,film.shield.frame),film.shield.opacity,film.shield.scale);
   layer('ring','--board-v2-motion-fx-block-ring',film.ring.opacity,film.ring.scale);
   layer('particles','--board-v2-motion-fx-block-particles-'+Math.max(1,film.particles.frame),film.particles.opacity);
   let label=fx.querySelector('strong');if(!label){label=document.createElement('strong');label.textContent='ATTACK BLOCKED';fx.append(label);}
   const width=Math.min(128,figure.sceneFrame.width??layout.board.panels[room].width-4),height=32;
   const place=labelBox({rect:{...rect,press:center},panel:layout.board.panels[room],size:[width,height],caption:{left:0,top:0,width:layout.board.panels[room].width,height:layout.board.panels[room].cap}});
   box(label,{...place,width,height});label.style.opacity=String(film.label.opacity);label.style.transform=`scale(${film.label.scale})`;
   if(film.announce)texts.push(`Attack blocked on Player ${f.seatId.slice(5)}.`);
   const actor=holder._boardV2Paint.actors.get(f.seatId);for(const body of actor?.querySelectorAll('.bv2-figure')??[])body.style.translate=`${film.brace[0]}px ${film.brace[1]}px`;
  }
  const key=texts.join('\n');if(notes.textContent!==key)notes.textContent=key;notes.hidden=!texts.length;
  box(notes,{left:layout.sheet.left+8,top:layout.sheet.top+8,width:layout.sheet.width-16});
 }
 function controls(){
  const {board,choosing}=layout;
  const fallbackTop=Math.min(board.navTop-150,Math.max(board.insets.top+board.shell.top+100,holder.querySelector('.bv2-too-short')?.getBoundingClientRect().bottom+8||0));
  const sheet=layout.sheet??{left:board.insets.left+8,top:fallbackTop,width:board.usable.width-16,height:board.navTop-fallbackTop,
   body:{height:board.navTop-fallbackTop-52},actions:{top:board.navTop-48,height:44,
    start:{left:board.insets.left+8,width:board.pass.cx-board.pass.r-board.insets.left-14},
    end:{left:board.pass.cx+board.pass.r+6,width:window.innerWidth-board.insets.right-board.pass.cx-board.pass.r-14}}};
  const nativeChoose=root.querySelector('.bv2-choosing');
  const choosingSeats=layout.fits&&Boolean(nativeChoose);
  root.dataset.boardChoosing=String(choosingSeats);root.dataset.boardPrivateTab=String(choosingSeats&&tab);
  const nav=root.querySelector('.phone-nav');
  if(nav){box(nav,{left:0,top:board.navTop,width:window.innerWidth,height:window.innerHeight-board.navTop});nav.style.setProperty('--bv2-nav-controls',px(board.shell.nav));}
  const pass=root.querySelector('.phone-pass');if(pass){box(pass,{left:board.pass.cx-board.pass.r,top:board.pass.cy-board.pass.r-board.navTop,width:2*board.pass.r,height:2*board.pass.r});}
  const phase=root.querySelector('.ms-phase');
  if(phase){box(phase,{left:board.insets.left,top:board.insets.top,width:board.usable.width,height:board.shell.top});phase.style.setProperty('--bv2-header-height',px(board.shell.top));}
  const banners=root.querySelector('.ms-banners');
  if(banners){box(banners,sheet);banners.style.maxHeight=px(sheet.height);banners.hidden=!banners.querySelector('.ms-banner--connection');}
  const reconnect=banners?.querySelector('[data-intent="session/reconnect"]');
  if(reconnect)box(reconnect,{left:sheet.actions.start.left,top:sheet.actions.top,width:sheet.actions.start.width,height:sheet.actions.height});
  const recovery=root.querySelector('.bv2-recovery');
  if(recovery){const top=sheet.top+(banners&&!banners.hidden?Math.min(sheet.body.height-30,banners.querySelector('.ms-banner__text')?.getBoundingClientRect().height??70)+8:0);
   box(recovery,{left:sheet.left,top,width:sheet.width,height:Math.max(44,board.navTop-top)});
   box(recovery.querySelector('[data-intent="action/check-again"]'),{left:sheet.actions.end.left,top:sheet.actions.top,width:sheet.actions.end.width,height:sheet.actions.height});}
  if(!layout.fits)return;
  for(const surface of root.querySelectorAll('.ms-private[data-open="true"],.phone-menu,.phone-action-dock')){
   box(surface,sheet);surface.style.setProperty('--bv2-sheet-height',px(sheet.height));
  }
  const claim=root.querySelector('.hack-feedback');
  const docks=[...root.querySelectorAll('.phone-action-dock')];
  let claimHeight=0;
  if(claim){box(claim,{left:sheet.left,top:sheet.top,width:sheet.width});claim.style.maxHeight=px(sheet.capacity);claim.style.height='auto';
   claimHeight=claim.getBoundingClientRect().height;
   const command=docks.find(d=>!d.querySelector('.bv2-choosing'));
   const body=command?.querySelector('.bv2-command-body');
   const intrinsic=body?.scrollHeight??0;
   const fold=Boolean(command)&&model.match.capsule?.stage!=='HACK_RESULT'&&claimHeight+intrinsic+6+sheet.actions.height>sheet.capacity;
   claim.dataset.folded=String(fold);
   let reveal=claim.querySelector('.bv2-claim-show');
   if(fold){if(!reveal){reveal=document.createElement('button');reveal.type='button';reveal.className='bv2-claim-show';reveal.id='bv2-claim-show';reveal.dataset.boardClaim='show';reveal.textContent='Show claim';claim.append(reveal);}claimHeight=sheet.actions.height;claim.style.height=px(claimHeight);}
   else reveal?.remove();
  }
  for(const panel of root.querySelectorAll('.ms-private[data-open="true"]:not(.phone-action-dock)')){
   const top=sheet.top+(claim?claimHeight+6:0);box(panel,{left:sheet.left,top,width:sheet.width,height:Math.max(44,board.navTop-top)});
  }
  for(const dock of docks){
   const native=dock.querySelector('.bv2-choosing'),body=dock.querySelector('.bv2-command-body'),actions=dock.querySelector('.bv2-command-controls');
   if(native){
    box(dock,choosing);box(actions,{left:0,top:choosing.row.top,width:window.innerWidth,height:choosing.row.height});
    const prompt=dock.querySelector('#ms-action-step');box(prompt,{left:board.insets.left+6,top:board.insets.top,width:Math.max(0,board.usable.width-96),height:board.shell.top});
    const status=dock.querySelector('#bv2-choice-private');if(status)status.hidden=!claim;
   }else{
    const top=sheet.top+(claim?claimHeight+6:0);
    box(dock,{left:sheet.left,top,width:sheet.width,height:Math.max(44,board.navTop-top)});
    if(body){body.style.maxHeight=px(Math.max(1,sheet.actions.top-top-6));body.style.overflow='auto';}
    const buttons=actions?[...actions.querySelectorAll('button')]:[];
    for(let i=0;i<buttons.length;i++){const r=buttons.length===1||i===buttons.length-1?sheet.actions.end:sheet.actions.start;
     box(buttons[i],{left:r.left,top:sheet.actions.top,width:r.width,height:sheet.actions.height});}
   }
  }
 }
 function after(next){
  model=next;
  const enabled=next.screen==='match'&&next.match?.boardLayout?.id==='board-v2-0.1.1';
  stop();
  if(!enabled){holder.remove();delete root.dataset.boardLayout;capsule.dispose();blackout.dispose();settleBlocks();geometryKey=null;frame=null;return false;}
  root.dataset.boardLayout='board-v2';
  const original=root.querySelector('.ms-board');if(!original)return false;
  for(const node of original.querySelectorAll('.ms-seat[data-seat]'))identities.set(node.dataset.seat,{characterId:node.dataset.character??null,displayName:node.dataset.displayName??null});
  const safe=safeInsets(document),ratio=Math.max(1,parseFloat(getComputedStyle(document.documentElement).fontSize)/16);
  const key=JSON.stringify([window.innerWidth,window.innerHeight,next.match.boardLayout.playerCount,safe,ratio]);
  if(key!==geometryKey){capsule.settle();layout=turnsLayout({width:window.innerWidth,height:window.innerHeight},next.match.boardLayout.playerCount,{insets:safe,bars:ratio>1?{top:Math.ceil(36+88*(ratio-1))}:undefined,actions:ratio>=2?64:44});geometryKey=key;}
  original.dataset.boardV2='true';
  if(holder.parentNode!==original)original.replaceChildren(holder);
  holder.style.width=px(window.innerWidth);holder.style.height=px(window.innerHeight);
  root.dataset.boardFits=String(layout.fits);
  if(!layout.fits){holder.replaceChildren();holder._boardV2Paint=null;
   const message=document.createElement('p');message.className='bv2-too-short';message.id='ms-comic-board-heading';message.tabIndex=-1;
   message.textContent='This screen is too short to show the board. Use a taller view or reduce the text size. Navigation remains available.';holder.append(message);frame=null;controls();return true;}
  const seats=(next.match.boardLayout.seats??(next.match.board?.zones??next.match.roster?.zones??[]).flatMap(z=>z.seats)).map(s=>({...s,...identities.get(s.seatId)}));
  const layoutFrame={panels:layout.board.panels,pressAreas:Object.fromEntries(BOARD_ROOMS.map(r=>[r,slotRects(r,next.match.boardLayout.playerCount,layout.board.panels[r])]))};
  frame=boardV2SceneFrame(next.match.boardLayout.playerCount,seats,layoutFrame);
  if(frame.problems.length){holder.replaceChildren();const warning=document.createElement('p');warning.className='bv2-too-short';warning.textContent='The board could not be read. Reconnect to continue.';holder.append(warning);return true;}
  const publicKey=JSON.stringify([next.match.capsule?.phaseId,next.match.boardLayout.clock.phaseId]);
  if(publicKey!==worldKey){tab=false;worldKey=publicKey;}
  capsule.update(next.match.capsule,next.match.boardLayout.clock,{visible:document.visibilityState==='visible',reducedMotion:next.motion==='reduced'||media.matches});
  blackout.update(next.match.boardLayout.clock,next.match.boardLayout.blackout,{visible:document.visibilityState==='visible',reducedMotion:next.motion==='reduced'||media.matches});
  controls();paint();return true;
 }
 const reduced=()=>{stop();capsule.settle();blackout.settle();settleBlocks();if(model)after(model);};
 const visibility=()=>{if(document.visibilityState!=='visible'){stop();capsule.settle();blackout.settle();settleBlocks();if(model)paint();}else if(model)after(model);};
 const onClick=event=>{const button=event.target.closest?.('[data-board-private],[data-board-claim]');if(!button||!root.contains(button))return;
  if(button.dataset.boardClaim){const claim=root.querySelector('.hack-feedback');if(claim){claim.dataset.folded='false';claim.style.height='auto';claim.style.zIndex='6700';claim.style.maxHeight=px(layout.sheet.height);button.remove();}return;}
  tab=!tab;controls();
 };
 root.addEventListener('click',onClick);media.addEventListener('change',reduced);document.addEventListener('visibilitychange',visibility);
 return {after,resize(){if(model){geometryKey=null;after(model);}},dispose(){disposed=true;stop();capsule.dispose();blackout.dispose();blocks.clear();holder.remove();root.removeEventListener('click',onClick);media.removeEventListener('change',reduced);document.removeEventListener('visibilitychange',visibility);},getLayout:()=>layout};
}
