import {roleCaptions,rolePageText} from '../pregame-films/roles/film.mjs';
import {createPregameScene} from './pregame-scene.mjs';
import './pregame.css';

/** One presentation surface; every exit destroys the private scene, captions and retained bindings. */
export function mountPregamePresentation(root,controller,{preferences=()=>({reduced:false})}={}){
 const document=root.ownerDocument,win=document.defaultView,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 let overlay=null,picture=null,captions=null,words=null,skip=null,scene=null,key=null,raf=null,disposed=false,lastPaint=-Infinity,previousFocus=null,previousInert=false;
 const el=(tag,className)=>{const n=document.createElement(tag);n.className=className;return n;};
 function clear(){
  if(raf!==null)win.cancelAnimationFrame(raf);raf=null;scene?.dispose();scene=null;key=null;
  if(overlay){overlay.replaceChildren();overlay.remove();overlay=null;root.inert=previousInert;if(previousFocus?.isConnected&&document.hasFocus()&&document.visibilityState==='visible')previousFocus.focus({preventScroll:true});}
  picture=null;captions=null;words=null;skip=null;previousFocus=null;
 }
 function mount(film){
  clear();key=film.key;previousFocus=document.activeElement;previousInert=root.inert;root.inert=true;
  overlay=el('section','pregame-overlay');overlay.dataset.pregame=film.kind;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',film.kind==='role'?'Your role film':film.kind==='boarding'?'The crew boards the ship':'Game N, by Plan B');
  picture=el('div','pregame-picture-root');picture.setAttribute('aria-hidden','true');captions=el('div','pregame-captions');captions.setAttribute('aria-hidden','true');words=el('p','pregame-screen-reader');words.setAttribute('role','status');words.setAttribute('aria-live','polite');
  overlay.append(picture,captions,words);
  if(film.kind!=='brand'){skip=el('button','pregame-skip');skip.type='button';skip.textContent='Skip film';skip.addEventListener('click',()=>{controller.skip();sync(true)});overlay.append(skip);}
  overlay.addEventListener('keydown',event=>{if(!skip)return;if(event.key==='Escape'){event.preventDefault();controller.skip();sync(true);}else if(event.key==='Tab'){event.preventDefault();skip.focus();}});
  const options=film.kind==='role'?{role:film.role,character:film.character,seat:film.seat}:film.kind==='boarding'?{roster:film.roster}:{};
  scene=createPregameScene(picture,{kind:film.kind,options});root.parentNode.insertBefore(overlay,root.nextSibling);skip?.focus({preventScroll:true});lastPaint=-Infinity;
 }
 function sync(force=false){
  if(disposed)return;
  const film=controller.sample();if(!film){clear();return;}
  if(key!==film.key)mount(film);
  const now=win.performance.now();
  if(force||now-lastPaint>=1000/30){
   const variant=preferences().reduced||media.matches?'reduced':'full',width=win.innerWidth,height=win.innerHeight;
   try{
    scene.paint(film.t,{width,height,variant});
    const boxes=film.kind==='role'?roleCaptions(film.t,{width,height,role:film.role,variant}):[];
    while(captions.children.length>boxes.length)captions.lastChild.remove();
    boxes.forEach((box,i)=>{let node=captions.children[i];if(!node){node=el('p','pregame-caption');captions.append(node);}const text=box.lines.join('\n');if(node.textContent!==text)node.textContent=text;node.style.left=`${box.x}px`;node.style.top=`${box.y-(1-box.drop)*10}px`;node.style.opacity=String(box.opacity);node.style.transform=`rotate(${box.tilt}deg)`;});
    const text=film.kind==='role'?rolePageText(film.t,{role:film.role,variant}):film.kind==='brand'?'Game N, by Plan B':'The crew boards the ship.';if(words.textContent!==text)words.textContent=text;
    lastPaint=now;
   }catch{
    // A failed drawing is a local dismissal, with no service command or changed deadline.
    controller.skip();clear();return;
   }
  }
  if(raf===null)raf=win.requestAnimationFrame(()=>{raf=null;sync();});
 }
 const preference=()=>sync(true),resize=()=>sync(true);
 media.addEventListener('change',preference);document.addEventListener('mothership:preferences-change',preference);win.addEventListener('resize',resize);
 return {sync,clear,get stats(){return scene?.stats??null},dispose(){disposed=true;clear();media.removeEventListener('change',preference);document.removeEventListener('mothership:preferences-change',preference);win.removeEventListener('resize',resize);}};
}
