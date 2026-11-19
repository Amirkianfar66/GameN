import {roleCaptions,rolePageText} from '../pregame-films/roles/film.mjs';
import {createPregameScene} from './pregame-scene.mjs';
import {ENTRY_TITLE_MARKUP} from '../../../../design/phone-ui/components/main-menu/entry-title.mjs';
import '../../../../design/phone-ui/components/main-menu/entry-title.css';
import './pregame.css';

/** One presentation surface; every exit destroys the private scene, captions and retained bindings. */
export function mountPregamePresentation(root,controller,{
 preferences=()=>({reduced:false}),boardingFilm=()=>null,boardingWindow=()=>null,onBoardingEnd,legacyBoarding=()=>false,
}={}){
 const document=root.ownerDocument,win=document.defaultView,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 let overlay=null,picture=null,captions=null,words=null,skip=null,scene=null,key=null,raf=null,disposed=false,lastPaint=-Infinity,previousFocus=null,previousInert=false,slotSize=null;
 let boardingFade=null,entryTimer=null;
 const el=(tag,className)=>{const n=document.createElement(tag);n.className=className;return n;};
 function clear(){
  const endedBoarding=overlay||boardingFade?null:picture;
  boardingFade=null;
  if(entryTimer!==null){win.clearTimeout(entryTimer);entryTimer=null;}
  if(raf!==null)win.cancelAnimationFrame(raf);raf=null;scene?.dispose();scene=null;key=null;
  if(overlay){overlay.replaceChildren();overlay.remove();overlay=null;root.inert=previousInert;if(previousFocus?.isConnected&&document.hasFocus()&&document.visibilityState==='visible')previousFocus.focus({preventScroll:true});}
  picture=null;captions=null;words=null;skip=null;previousFocus=null;slotSize=null;
  if(endedBoarding)onBoardingEnd?.(endedBoarding);
 }
 function mount(film,slot){
  clear();key=film.key;lastPaint=-Infinity;
  const options=film.kind==='role'?{role:film.role,character:film.character,seat:film.seat}:film.kind==='boarding'?{roster:film.roster}:{};
  if(slot){
   picture=slot;
   picture.setAttribute('aria-hidden','true');
   scene=createPregameScene(picture,{kind:'boarding',options});
   return;
  }
  previousFocus=document.activeElement;previousInert=root.inert;root.inert=true;
  overlay=el('section','pregame-overlay');overlay.dataset.pregame=film.kind;
  if(film.kind==='brand'){
   overlay.setAttribute('role','status');
   overlay.dataset.entryMotion=preferences().reduced||media.matches?'reduced':'full';
   overlay.innerHTML=ENTRY_TITLE_MARKUP;
   root.after(overlay);
   return;
  }
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',film.kind==='role'?'Your role film':'The crew boards the ship');
  picture=el('div','pregame-picture-root');picture.setAttribute('aria-hidden','true');captions=el('div','pregame-captions');captions.setAttribute('aria-hidden','true');words=el('p','pregame-screen-reader');words.setAttribute('role','status');words.setAttribute('aria-live','polite');
  overlay.append(picture,captions,words);
  if(film.kind==='role'){skip=el('button','pregame-skip');skip.type='button';skip.textContent='Skip film';skip.addEventListener('click',()=>{controller.skip();sync(true)});overlay.append(skip);}
  overlay.addEventListener('keydown',event=>{if(!skip)return;if(event.key==='Escape'){event.preventDefault();controller.skip();sync(true);}else if(event.key==='Tab'){event.preventDefault();skip.focus();}});
  scene=createPregameScene(picture,{kind:film.kind,options});root.parentNode.insertBefore(overlay,root.nextSibling);skip?.focus({preventScroll:true});
 }
 function visibleBoardingWindow(slot){
  if(!slot?.isConnected||slot!==boardingFilm()||document.visibilityState!=='visible'||!document.hasFocus())return null;
  return boardingWindow();
 }
 function skipBoarding(){
  const film=controller.sample(),slot=picture;
  const binding=film?.kind==='boarding'&&film.key===key?visibleBoardingWindow(slot):null;
  controller.skip();
  if(binding){
   // The stage hides Skip now. Keep the last public picture in its own fading layer.
   onBoardingEnd?.(slot);
   const animation=slot.parentElement?.getAnimations?.().find(value=>value.transitionProperty==='opacity');
   if(animation)boardingFade={binding,animation};
  }
  sync(true);
 }
 function nextFrame(){
  if(raf===null)raf=win.requestAnimationFrame(()=>{raf=null;sync();});
 }
 function sync(force=false){
  if(disposed)return;
  const film=controller.sample();
  if(!film){
   if(boardingFade?.animation.playState==='running'&&visibleBoardingWindow(picture)===boardingFade.binding){
    nextFrame();
    return;
   }
   clear();
   return;
  }
  const slot=film.kind==='boarding'?boardingFilm():null;
  if(film.kind==='boarding'&&!slot&&!legacyBoarding()){clear();return;}
  try{
   if(key!==film.key||(slot?picture!==slot:!overlay))mount(film,slot);
   if(film.kind==='brand'){
    // A preference change can finish the reveal. Keep the original entry deadline.
    if(overlay.dataset.entryMotion==='full'&&(preferences().reduced||media.matches))overlay.dataset.entryMotion='reduced';
    if(entryTimer===null)entryTimer=win.setTimeout(()=>{
     entryTimer=null;
     sync();
    },Math.max(1,Math.ceil(film.durationMs-film.t)));
    return;
   }
   const now=win.performance.now();
   if(force||now-lastPaint>=1000/30){
    if(slot&&(force||!slotSize)){
     const {width,height}=slot.getBoundingClientRect();
     if(width>0&&height>0)slotSize={width,height};
    }
    const {width,height}=slotSize??{width:win.innerWidth,height:win.innerHeight};
    const variant=preferences().reduced||media.matches?'reduced':'full';
    scene.paint(film.t,{width,height,variant});
    if(overlay){
     const boxes=film.kind==='role'?roleCaptions(film.t,{width,height,role:film.role,variant}):[];
     while(captions.children.length>boxes.length)captions.lastChild.remove();
     boxes.forEach((box,i)=>{let node=captions.children[i];if(!node){node=el('p','pregame-caption');captions.append(node);}const text=box.lines.join('\n');if(node.textContent!==text)node.textContent=text;node.style.left=`${box.x}px`;node.style.top=`${box.y-(1-box.drop)*10}px`;node.style.opacity=String(box.opacity);node.style.transform=`rotate(${box.tilt}deg)`;});
     const text=film.kind==='role'?rolePageText(film.t,{role:film.role,variant}):'The crew boards the ship.';if(words.textContent!==text)words.textContent=text;
    }
    lastPaint=now;
   }
  }catch{
    // A failed drawing is a local dismissal, with no service command or changed deadline.
    controller.skip();clear();return;
  }
  nextFrame();
 }
 const preference=()=>sync(true),resize=()=>sync(true);
 media.addEventListener('change',preference);document.addEventListener('mothership:preferences-change',preference);win.addEventListener('resize',resize);
 return {sync,clear,skipBoarding,get stats(){return scene?.stats??null},dispose(){disposed=true;clear();media.removeEventListener('change',preference);document.removeEventListener('mothership:preferences-change',preference);win.removeEventListener('resize',resize);}};
}
