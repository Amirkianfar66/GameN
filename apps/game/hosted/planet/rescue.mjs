// Planet-only machinery vignette over reviewed pure art. Current tokens and nameplates
// belong to the authoritative scene and are never hidden, copied or relocated here.
import {fourBerthKit,fourFilmBerth,fourRescueFrame} from '../board-v2-drawing/medical-four.mjs';
import {DRONE,DRONE_SCENE,droneFit,droneSvg,berthScreenSvg,lampSvg,scanLineSvg,hologramSvg,pulseSvg} from '../board-v2-drawing/medical-fx.mjs';

const box=(node,r)=>{for(const key of ['left','top','width','height'])node.style[key]=`${r[key]}px`;};
const unitBox=(f,x,y,w,h)=>({left:f.tx+x*f.k,top:f.ty+y*f.k,width:w*f.k,height:h*f.k});
function namespaceSvg(svg,prefix){
 for(const id of [...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))svg=svg.replaceAll(`id="${id}"`,`id="${prefix}-${id}"`).replaceAll(`url(#${id})`,`url(#${prefix}-${id})`).replaceAll(`href="#${id}"`,`href="#${prefix}-${id}"`);
 return svg;
}
/** Keep only the machinery of the successful occurrence at its valid, unoccupied anchor. */
export function createPlanetRescuePainter(holder){
 const document=holder.ownerDocument,nodes=new Map();let used=new Set();
 const make=(parent,key,rect,svg,{opacity=1,scale=1,z=2200}={})=>{
  used.add(key);let node=nodes.get(key);
  if(!node){node=document.createElement('span');node.className='bv2-film planet-rescue-fx';node.dataset.filmPart=key;node.setAttribute('aria-hidden','true');nodes.set(key,node);}
  if(node.parentNode!==parent)parent.append(node);
  box(node,rect);node.style.opacity=String(opacity);node.style.transform=`scale(${scale})`;node.style.zIndex=String(z);
  const safe=namespaceSvg(svg,`planet-${key}`);if(node._svg!==safe){node.innerHTML=safe;node._svg=safe;}return node;
 };
 const clear=()=>{for(const node of nodes.values())node.remove();nodes.clear();};
 return {
  paint({entries=[],frame,seats=[],enabled=false,dark=false}={}){
   used=new Set();const room=frame?.rooms.find(r=>r.room==='hospital'),parent=holder._boardV2Paint?.rooms.get('hospital');
   if(enabled&&!dark&&room&&parent)for(const entry of entries){
    if(entry.kind!=='medical'||entry.clinical!=='HEALED')continue;
    const who=seats.find(s=>s.seatId===entry.subjectId),anchor=entry.occurrence.clinicalAnchor;
    if(who?.health!=='Healthy'||!['Room A','Room B','Jail'].includes(who.location)||!anchor)continue;
    const selection=fourFilmBerth(anchor,seats.map(s=>({seat:s.seatId,slotId:s.slotId})),who.seatId);
    if(!selection.plays||selection.berth!==entry.berth)continue;
    const kit=fourBerthKit(selection.berth),f=room.frame;
    const keepClear=[{left:0,top:0,width:room.panel.width,height:room.panel.cap},...room.figures.flatMap(p=>[{left:p.press.left,top:p.press.top,width:p.press.side,height:p.press.side},{left:p.name.left-38,top:p.name.top,width:76,height:16}])];
    const fit=droneFit({kit,frame:f,keepClear}),film=fourRescueFrame(entry.t,selection.berth,{reduced:entry.reduced,fit}),key=entry.event.eventId;
    const m=kit.monitor,l=kit.lamp;
    make(parent,`${key}-screen`,unitBox(f,m.x,m.y,m.w,m.h),berthScreenSvg(film.inset.kind),{z:900});
    make(parent,`${key}-lamp`,unitBox(f,l.cx-l.r*2,l.cy-l.r*2,l.r*4,l.r*4),lampSvg(film.lamp.state==='dark'?'off':film.lamp.state),{opacity:film.lamp.opacity,z:901});
    const width=DRONE_SCENE.width*kit.scale*f.k*fit;
    if(film.drone?.at&&film.drone.opacity){
     const height=width*DRONE.h/DRONE.w,[x,y]=film.drone.at;
     make(parent,`${key}-drone`,{left:f.tx+x*f.k-width*DRONE.lens[0]/DRONE.w,top:f.ty+y*f.k-height*DRONE.lens[1]/DRONE.h,width,height},droneSvg(film.drone.frame),{opacity:film.drone.opacity});
    }
    const chest=[f.tx+kit.chest[0]*f.k,f.ty+kit.chest[1]*f.k];
    if(film.scan?.opacity){const w=kit.bed.w*f.k*1.15,h=w*16/140,y=f.ty+(kit.bed.y+kit.bed.h*.7*film.scan.y)*f.k;make(parent,`${key}-scan`,{left:chest[0]-w/2,top:y-h/2,width:w,height:h},scanLineSvg(),{opacity:film.scan.opacity});}
    if(film.hologram?.opacity){const side=width*.55;make(parent,`${key}-holo`,{left:chest[0]-side/2,top:chest[1]-side*.75,width:side,height:side},hologramSvg(),{opacity:film.hologram.opacity});}
    if(film.pulse?.opacity){const side=width*.9;make(parent,`${key}-pulse`,{left:chest[0]-side/2,top:chest[1]-side/2,width:side,height:side},pulseSvg(film.pulse.frame),{opacity:film.pulse.opacity,scale:film.pulse.scale});}
   }
   for(const [key,node]of nodes)if(!used.has(key)){node.remove();nodes.delete(key);}
  },clear,dispose:clear,
 };
}
