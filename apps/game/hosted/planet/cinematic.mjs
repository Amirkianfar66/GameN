import {planetTerminalArrival} from '@mothership/presentation';
import {PLANET_LIBRARY_MEDIA} from './library-assets.mjs';

/** Native underlays only, from the exact Integration-approved common media catalogue. */
export function createPlanetCinematic(holder,catalogue=[]){
 const document=holder.ownerDocument,win=document.defaultView,assets=new Map(),canvases=new Map();
 const field=document.createElement('canvas'),fieldContext=field.getContext('2d');
 const approved=new Map(PLANET_LIBRARY_MEDIA.map(f=>[f.name,f])),allowedUrls=new Set(PLANET_LIBRARY_MEDIA.flatMap(f=>[f.video,f.poster]));
 let previous=null,arrivalPhase=null;
 const mediaUrl=value=>{const url=new URL(value,win.location.href);if(url.origin!==win.location.origin||!allowedUrls.has(url.pathname)||url.search||url.hash)throw TypeError('Unreviewed media location');return url.href;};
 for(const item of catalogue){
  const expected=approved.get(item.name);if(!expected||item.video!==expected.video||item.poster!==expected.poster||item.durationMs!==expected.durationMs)throw TypeError('Unknown cinematic asset');
  const video=document.createElement('video'),poster=new win.Image(),entry={...item,video,poster,failed:false,blocked:false};
  video.preload='auto';video.muted=true;video.playsInline=true;video.src=mediaUrl(item.video);poster.src=mediaUrl(item.poster);
  video.addEventListener('error',()=>{entry.failed=true;});assets.set(item.name,entry);video.load();
 }
 function clear(){for(const canvas of canvases.values())canvas.remove();canvases.clear();for(const entry of assets.values())entry.video.pause();delete holder.dataset.cinematic;}
 function paint({model,sample,frame,layout,reduced=false}={}){
  if(model?.phase?.kind==='FINISHED'&&previous&&previous.matchId===model.matchId&&!['FINISHED','ABORTED'].includes(previous.kind))arrivalPhase=model.phase.id;
  if(!fieldContext||!model||!sample||model.connection!=='live'||model.concealed||model.dark||!model.phase?.trusted||model.phase.expired||!frame||!layout?.fits){if(!model||model.connection!=='live'||model.concealed||model.dark||!model.phase?.trusted||!frame||!layout?.fits){previous=null;arrivalPhase=null;}clear();return false;}
  if(model.phase.kind!=='FINISHED')arrivalPhase=null;
  previous={matchId:model.matchId,kind:model.phase.kind};
  const serverNow=Number.isFinite(sample.nowMs)?sample.nowMs:model.phase?.nowMs;
  if(!Number.isFinite(serverNow)){clear();return false;}
  let name=null,t=0;
  const arrival=arrivalPhase===model.phase.id?planetTerminalArrival(model):null;
  if(arrival){name=`arrival-${arrival.toLowerCase()}`;t=serverNow-model.phase.startedAt;}
  else if(model.phase.kind==='BLACKHOLE_PRESENTATION'){name='blackhole';t=serverNow-model.phase.startedAt;}
  else{const movement=sample.special.find(entry=>entry.kind==='transit');if(movement){name='transit';t=movement.t;}}
  const asset=assets.get(name),end=reduced?(name==='blackhole'?1440:160):asset?.durationMs??0;
  if(!asset||asset.failed||t<0||t>=end||model.phase.endsAt!==null&&serverNow>=model.phase.endsAt){clear();return false;}
  for(const other of assets.values())if(other!==asset)other.video.pause();
  const video=asset.video,canPlay=!reduced&&!asset.blocked&&video.readyState>=2&&Number.isFinite(video.duration)&&video.duration>0;
  if(!canPlay)video.pause();
  let picture=null;
  if(canPlay){const seek=Math.min(t/1000,Math.max(0,video.duration-.04));if(Number.isFinite(seek)&&Math.abs(video.currentTime-seek)>.12)video.currentTime=seek;if(video.paused)void video.play().catch(()=>{asset.blocked=true;});picture=video;}
  else if(asset.poster.complete&&asset.poster.naturalWidth>0)picture=asset.poster;
  if(!picture){clear();return false;}
  const width=Math.max(1,Math.ceil(holder.clientWidth)),height=Math.max(1,Math.ceil(holder.clientHeight));
  if(field.width!==width||field.height!==height){field.width=width;field.height=height;}
  const pw=picture.videoWidth??picture.naturalWidth,ph=picture.videoHeight??picture.naturalHeight,scale=Math.max(width/pw,height/ph);
  try{fieldContext.clearRect(0,0,width,height);fieldContext.drawImage(picture,(width-pw*scale)/2,(height-ph*scale)/2,pw*scale,ph*scale);}catch{clear();return false;}
  const visible=new Set();
  for(const room of frame.rooms){
   const parent=holder._boardV2Paint?.rooms.get(room.room),box=layout.board.boxes[room.room];if(!parent||!box)continue;visible.add(room.room);
   let canvas=canvases.get(room.room);if(!canvas){canvas=document.createElement('canvas');canvas.className='planet-cinematic-field';canvas.setAttribute('aria-hidden','true');canvases.set(room.room,canvas);}if(canvas.parentNode!==parent)parent.append(canvas);
   const w=Math.max(1,Math.ceil(room.panel.width)),h=Math.max(1,Math.ceil(room.panel.height));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   canvas.style.width=`${room.panel.width}px`;canvas.style.height=`${room.panel.height}px`;canvas.style.opacity=String(name==='blackhole'?.88:name==='transit'?.85:1);
   const c=canvas.getContext('2d');if(!c)continue;c.clearRect(0,0,w,h);c.drawImage(field,box.left,box.top,w,h,0,0,w,h);
  }
  for(const [room,canvas]of canvases)if(!visible.has(room)){canvas.remove();canvases.delete(room);}
  holder.dataset.cinematic=name;
  return !reduced&&canPlay;
 }
 return {paint,clear(){previous=null;arrivalPhase=null;clear();},dispose(){previous=null;arrivalPhase=null;clear();for(const entry of assets.values()){entry.video.removeAttribute('src');entry.video.load();entry.poster.removeAttribute('src');}assets.clear();}};
}
