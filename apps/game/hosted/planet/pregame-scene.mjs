import {brandSvg} from '../pregame-films/brand/brand.mjs';
import {roleSvg} from '../pregame-films/roles/film.mjs';
import {boardingSvg} from '../pregame-films/boarding/boarding.mjs';
import {withRetainedFigures} from '../pregame-films/kit/cast.mjs';
import {dressedFigureSvg} from '../crew-drawing/wardrobe.mjs';
import {applyCrewFrame,crewFrame,applyCrewPose,crewPoseFrame} from '../crew-drawing/mount.mjs';

let instance = 0;
const NS='http://www.w3.org/2000/svg';
const drawFilm=(kind,t,options)=>kind==='brand'?brandSvg(t,options):kind==='role'?roleSvg(t,options):boardingSvg(t,options);
function namespace(markup,prefix){
 const ids=new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
 return markup.replace(/(\sid="|url\(#|href="#)([^"')]+)/g,(all,lead,id)=>ids.has(id)?`${lead}${prefix}${id}`:all);
}
function nodeKey(node){
 if(node.nodeType!==1)return null;
 if(node.id)return `id:${node.id}`;
 if(node.hasAttribute('data-pregame-figure'))return `figure:${node.getAttribute('data-pregame-figure')}`;
 const child=node.querySelector('[id],[data-pregame-figure]');
 return child?`${node.localName}:${child.id||child.getAttribute('data-pregame-figure')}`:null;
}
function compatible(a,b){return a?.nodeType===b.nodeType&&(a.nodeType!==1||a.localName===b.localName&&nodeKey(a)===nodeKey(b));}

/** Update the environment's attributes; a mounted crew figure is an opaque retained subtree. */
function reconcile(current,next,stats){
 if(current.nodeType!==1){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;return;}
 for(const a of [...current.attributes])if(!next.hasAttribute(a.name))current.removeAttribute(a.name);
 for(const a of next.attributes)if(current.getAttribute(a.name)!==a.value){current.setAttribute(a.name,a.value);stats.attributes++;}
 if(next.hasAttribute('data-pregame-figure'))return;
 const keyed=new Map([...current.childNodes].map(n=>[nodeKey(n),n]).filter(([key])=>key!==null));
 let cursor=current.firstChild;
 for(const desired of next.childNodes){
  let candidate=nodeKey(desired)?keyed.get(nodeKey(desired)):cursor;
  if(!compatible(candidate,desired)){candidate=current.ownerDocument.importNode(desired,true);current.insertBefore(candidate,cursor);stats.environmentInsertions++;}
  else if(candidate!==cursor)current.insertBefore(candidate,cursor);
  reconcile(candidate,desired,stats);cursor=candidate.nextSibling;
 }
 while(cursor){const after=cursor.nextSibling;current.removeChild(cursor);cursor=after;}
}

/**
 * The approved renderer supplies lightweight environment/pose samples. Traced crew art is omitted
 * from those samples: each figure mounts once, then the frozen crew API changes its attributes.
 * The sampled environment is reconciled in place. No full heavy film SVG replaces the scene on RAF.
 * Reduced pictures are drawn once per beat and crossfaded as retained layers.
 */
export function createPregameScene(holder,{kind,options}){
 const document=holder.ownerDocument,win=document.defaultView,prefix=`pregame-${++instance}-`;
 const parser=new win.DOMParser(),figures=new WeakMap(),reducedLayers=new Map();
 const stats={samples:0,figureMounts:0,poseUpdates:0,headUpdates:0,environmentInsertions:0,attributes:0,largestSampleBytes:0};
 let svg=null,disposed=false,variant=null,size=null,reducedFinish=null;
 const parse=markup=>{const root=parser.parseFromString(markup,'image/svg+xml').documentElement;if(root.localName!=='svg')throw new Error('Film drawing failed');return root;};
 const clear=()=>{holder.replaceChildren();svg=null;reducedFinish=null;reducedLayers.clear();};
 function reduced(t,o){
  const starts=kind==='role'?[0,3000,7800]:kind==='boarding'?[0,2400,5200,6900,8900]:[0];
  const fadeMs=kind==='role'?80:160;
  const index=starts.findLastIndex(at=>t>=at),selected=Math.max(0,index),fade=Math.min(1,Math.max(0,(t-starts[selected])/fadeMs));
  const needed=new Set([selected,...(kind==='role'&&selected>0&&fade<1?[selected-1]:[])]);
  for(const [i,layer]of reducedLayers)if(!needed.has(i)){layer.remove();reducedLayers.delete(i);}
  for(const i of [...needed].sort((a,b)=>a-b)){
   let layer=reducedLayers.get(i);
   if(!layer){
    // Stable moment after the beat's fade. Brand is inexpensive and uses the full sampler below.
    const at=starts[i]+(kind==='role'?80:160);
    const markup=namespace(drawFilm(kind,at,o),`${prefix}still-${i}-`);
    const drawing=parse(markup);
    if(kind==='role'){
     // Keep the reference's four finishing rectangles outside the crossfade, in the same SVG
     // backdrop. Flattening two already-graded SVG images changes blend modes at the boundaries.
     const children=[...drawing.children],finish=children.slice(-4);
     if(finish.some(n=>n.localName!=='rect')||!finish[2].getAttribute('filter')?.includes('rf-fin-grain'))throw new Error('Unexpected pinned role finish');
     if(!svg){
      svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${o.width} ${o.height}`);svg.setAttribute('width',String(o.width));svg.setAttribute('height',String(o.height));
      const night=document.createElementNS(NS,'rect');night.setAttribute('width',String(o.width));night.setAttribute('height',String(o.height));night.setAttribute('fill','#07090F');svg.append(night);
      const refs=[...finish.map(n=>n.outerHTML).join('').matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1]);
      const definitions=refs.map(id=>drawing.querySelector(`[id="${id}"]`)?.outerHTML??'').join('');
      const shared=parse(namespace(`<svg xmlns="${NS}"><defs>${definitions}</defs>${finish.map(n=>n.outerHTML).join('')}</svg>`,`${prefix}finish-`));
      reducedFinish=document.createElementNS(NS,'g');reducedFinish.append(...[...shared.childNodes].map(n=>document.importNode(n,true)));svg.append(reducedFinish);holder.append(svg);
     }
     layer=document.createElementNS(NS,'g');layer.append(...children.slice(0,-4).map(n=>document.importNode(n,true)));svg.insertBefore(layer,reducedFinish);
    }else{layer=document.createElement('div');layer.className='pregame-picture';layer.append(document.importNode(drawing,true));holder.append(layer);}
    reducedLayers.set(i,layer);stats.samples++;
   }
   layer.style.opacity=String(i===selected?fade:1);
   if(kind==='boarding')layer.style.opacity=String(fade*(1-Math.min(1,Math.max(0,(t-9700)/260))));
  }
 }
 return {stats,
  paint(t,{width,height,variant:nextVariant='full'}={}){
   if(disposed)return;
   const o={...options,width,height,variant:nextVariant};
   const nextSize=`${width}:${height}`;
   if(variant!==nextVariant||size!==nextSize){clear();variant=nextVariant;size=nextSize;}
   if(nextVariant==='reduced'&&kind!=='brand'){reduced(t,o);return;}
   const samples=new Map();
   const markup=withRetainedFigures(figure=>{samples.set(figure.id,figure);return `<svg xmlns="${NS}" viewBox="-90 -40 300 300" width="300" height="300"><g data-pregame-figure="${figure.id}"/></svg>`;},()=>drawFilm(kind,t,o));
   stats.samples++;stats.largestSampleBytes=Math.max(stats.largestSampleBytes,markup.length);
   const next=parse(namespace(markup,prefix));
   if(!svg){svg=document.importNode(next,true);holder.append(svg);}else reconcile(svg,next,stats);
   for(const [id,figure]of samples){
    let target=svg.querySelector(`[data-pregame-figure="${id}"]`);if(!target)continue;
    const config={outfit:figure.outfit,prefix:prefix+figure.prefix,inline:true,live:true,motion:figure.motion};
    const signature=JSON.stringify([figure.sk,figure.motion,figure.outfit]);
    const skeleton=JSON.stringify([figure.sk,figure.outfit]);
    let cached=figures.get(target);
    if(cached?.signature===signature)continue;
    const mount=()=>{const body=parse(dressedFigureSvg(figure.member,figure.sk,config));target.replaceChildren(...[...body.childNodes].map(n=>document.importNode(n,true)));stats.figureMounts++;};
    if(!cached){mount();cached={};}
    else if(cached.skeleton===skeleton){applyCrewFrame(target,crewFrame(figure.member,figure.sk,figure.motion));stats.headUpdates++;}
    else if(applyCrewPose(target,crewPoseFrame(figure.member,figure.sk,config))<0){
     // A structural pose switch needs a fresh root so the crew renderer discards its cached bindings.
     const replacement=document.createElementNS(NS,'g');replacement.setAttribute('data-pregame-figure',id);target.replaceWith(replacement);target=replacement;mount();cached={};
    }
    cached.signature=signature;cached.skeleton=skeleton;figures.set(target,cached);stats.poseUpdates++;
   }
  },
  dispose(){disposed=true;clear();},
 };
}
