// Connected native Board V2 adapter. Geometry comes only from Claude's exact pure ports;
// gameplay comes only from the validated model. RAF changes drawings, never a phase/command.
import {turnsLayout} from './board-v2-drawing/turns.mjs';
import {slotRects} from './board-v2-drawing/fit.mjs';
import {BOARD_ROOMS,sceneOf} from './board-v2-drawing/slots.mjs';
import {boardV2SceneFrame,paintBoardV2} from './board-v2-scene.mjs';
import {createBoardV2Capsule} from './board-v2-capsule.mjs';

const px=n=>`${n}px`;
const box=(node,r)=>{if(!node||!r)return;for(const name of ['left','top','width','height'])if(Number.isFinite(r[name]))node.style[name]=px(r[name]);};
const safeInsets=document=>{
 const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.append(probe);
 const s=getComputedStyle(probe),out={top:parseFloat(s.paddingTop)||0,right:parseFloat(s.paddingRight)||0,bottom:parseFloat(s.paddingBottom)||0,left:parseFloat(s.paddingLeft)||0};probe.remove();return out;
};

export function createBoardV2Host(root,{now=()=>performance.now()}={}) {
 const document=root.ownerDocument,holder=document.createElement('div');holder.className='bv2-mount';
 const capsule=createBoardV2Capsule({now}),identities=new Map();
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
  const sample=capsule.sample();
  paintBoardV2(holder,frame,layout.board.boxes,{artForRoom,choices,marks:card?.board??null,capsule:sample,canMove:model.surface==='player'});
  if(sample.animate&&document.visibilityState==='visible')raf=requestAnimationFrame(paint);else raf=null;
 }
 function controls(){
  const {board,choosing,sheet}=layout;
  const nativeChoose=root.querySelector('.bv2-choosing');
  const choosingSeats=layout.fits&&Boolean(nativeChoose);
  root.dataset.boardChoosing=String(choosingSeats);root.dataset.boardPrivateTab=String(choosingSeats&&tab);
  const nav=root.querySelector('.phone-nav');
  if(nav){box(nav,{left:0,top:board.navTop,width:window.innerWidth,height:window.innerHeight-board.navTop});nav.style.setProperty('--bv2-nav-controls',px(board.shell.nav));}
  const pass=root.querySelector('.phone-pass');if(pass){box(pass,{left:board.pass.cx-board.pass.r,top:board.pass.cy-board.pass.r-board.navTop,width:2*board.pass.r,height:2*board.pass.r});}
  const phase=root.querySelector('.ms-phase');
  if(phase){box(phase,{left:board.insets.left,top:board.insets.top,width:board.usable.width,height:board.shell.top});phase.style.setProperty('--bv2-header-height',px(board.shell.top));}
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
  if(!enabled){holder.remove();delete root.dataset.boardLayout;capsule.dispose();geometryKey=null;frame=null;return false;}
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
  const seats=(next.match.board?.zones??next.match.roster?.zones??[]).flatMap(z=>z.seats).map(s=>({...s,...identities.get(s.seatId)}));
  const layoutFrame={panels:layout.board.panels,pressAreas:Object.fromEntries(BOARD_ROOMS.map(r=>[r,slotRects(r,next.match.boardLayout.playerCount,layout.board.panels[r])]))};
  frame=boardV2SceneFrame(next.match.boardLayout.playerCount,seats,layoutFrame);
  if(frame.problems.length){holder.replaceChildren();const warning=document.createElement('p');warning.className='bv2-too-short';warning.textContent='The board could not be read. Reconnect to continue.';holder.append(warning);return true;}
  const publicKey=JSON.stringify([next.match.capsule?.phaseId,next.match.boardLayout.clock.phaseId]);
  if(publicKey!==worldKey){tab=false;worldKey=publicKey;}
  capsule.update(next.match.capsule,next.match.boardLayout.clock,{visible:document.visibilityState==='visible',reducedMotion:next.motion==='reduced'||media.matches});
  controls();paint();return true;
 }
 const reduced=()=>{stop();capsule.settle();if(model)after(model);};
 const visibility=()=>{if(document.visibilityState!=='visible'){stop();capsule.settle();if(model)paint();}else if(model)after(model);};
 const onClick=event=>{const button=event.target.closest?.('[data-board-private],[data-board-claim]');if(!button||!root.contains(button))return;
  if(button.dataset.boardClaim){const claim=root.querySelector('.hack-feedback');if(claim){claim.dataset.folded='false';claim.style.height='auto';claim.style.zIndex='6700';claim.style.maxHeight=px(layout.sheet.height);button.remove();}return;}
  tab=!tab;controls();
 };
 root.addEventListener('click',onClick);media.addEventListener('change',reduced);document.addEventListener('visibilitychange',visibility);
 return {after,resize(){if(model){geometryKey=null;after(model);}},dispose(){disposed=true;stop();capsule.dispose();holder.remove();root.removeEventListener('click',onClick);media.removeEventListener('change',reduced);document.removeEventListener('visibilitychange',visibility);},getLayout:()=>layout};
}
