// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';

/** Read the actual rendered content, not only an asset-ready flag or a name tag. */
export async function checkCrewArt(page,{portraits=false,minFigures=1,clinical=false}={}){
 await page.evaluate('(window.planetHarness?.app??window.planetEmulator?.app).artReady');
 const result=await page.evaluate(`(async()=>{
  const visible=n=>!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden'&&Number(getComputedStyle(n).opacity)>0;
  const models=window.planetHarness?.app??window.planetEmulator?.app,versions=models.session.getModel().versions;
  const selector=${JSON.stringify(clinical)}?'.bv2-room .bv2-film[data-film-part^="critical-"][data-film-part$="-body"]':'.bv2-room .bv2-figure[data-part=body]';
  const figures=[...document.querySelectorAll(selector)].filter(visible).map(n=>{const svg=n.querySelector('svg'),b=svg?.getBBox();return {seat:n.closest('[data-seat]')?.dataset.seat??n.dataset.filmPart?.slice(9,-5)??null,hasSvg:!!svg,width:b?.width??0,height:b?.height??0,paths:svg?.querySelectorAll('path').length??0,missingReferences:[...(svg?.querySelectorAll('[href]')??[])].map(x=>x.getAttribute('href')).filter(h=>h?.startsWith('#')&&!document.getElementById(h.slice(1))).length};});
  const pictures=await Promise.all([...document.querySelectorAll('.planet-crew button')].map(async n=>{const image=getComputedStyle(n,'::before').backgroundImage,url=image.startsWith('url(')?image.slice(4,-1).replace(/^["']|["']$/g,''):null,picture=new Image();if(url)picture.src=url;let decoded=false;try{if(url){await picture.decode();decoded=picture.naturalWidth>0;}}catch{}return {character:n.dataset.character,decoded,visible:visible(n),imagePresent:image!=='none'};}));
  const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),instances=[...document.querySelectorAll('[data-crew-instance]')].map(n=>n.dataset.crewInstance);
  return {versions,crewSurface:document.querySelector('[data-crew-art]')?.dataset.crewArt??null,pictures,figures,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),instances,duplicateInstances:instances.filter((id,i)=>instances.indexOf(id)!==i)};
 })()`);
 if(portraits){assert.equal(result.pictures.length,9);assert.ok(result.pictures.every(p=>p.decoded&&p.visible&&p.imagePresent),'Portrait content is absent or undecodable');}
 else{assert.ok(result.figures.length>=minFigures,'Expected visible crew SVG content');assert.ok(result.figures.every(f=>f.hasSvg&&f.width>0&&f.height>0&&f.paths>0&&f.missingReferences===0),'Crew SVG content or shared references are absent');}
 assert.deepEqual(result.duplicateIds,[]);assert.deepEqual(result.duplicateInstances,[]);return result;
}

/** Measure the drawn silhouette in screen coordinates, including clipping by the
 * room, stage and an optional target prompt. An offscreen SVG is not acceptance. */
export async function checkRoomFigures(page,{seats=null,minVisibleRatio=.98,includePrompt=false,clinical=false}={}){
 const result=await page.evaluate(`(async()=>{
  const stage=document.querySelector('.planet-stage').getBoundingClientRect(),bar=document.querySelector('.planet-target-bar'),limit=${JSON.stringify(includePrompt)}&&bar&&!bar.hidden?bar.getBoundingClientRect().top:stage.bottom,wanted=${JSON.stringify(seats)};
  async function paintedBounds(svg){
   const clone=svg.cloneNode(true),defs=clone.querySelector('defs')??clone.insertBefore(document.createElementNS(svg.namespaceURI,'defs'),clone.firstChild),pending=[],seen=new Set();
   function references(node){for(const n of [node,...node.querySelectorAll('*')])for(const a of n.attributes??[]){if(a.localName==='href'&&a.value.startsWith('#'))pending.push(a.value.slice(1));let at=a.value.indexOf('url(#');while(at>=0){const end=a.value.indexOf(')',at);if(end<0)break;pending.push(a.value.slice(at+5,end));at=a.value.indexOf('url(#',end);}}}
   references(clone);while(pending.length){const id=pending.pop();if(seen.has(id))continue;seen.add(id);if(clone.querySelector('#'+CSS.escape(id)))continue;const original=document.getElementById(id);if(original){const copy=original.cloneNode(true);defs.append(copy);references(copy);}}
   clone.setAttribute('width','512');clone.setAttribute('height','512');const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'})),image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d');c.drawImage(image,0,0,512,512);URL.revokeObjectURL(url);const pixels=c.getImageData(0,0,512,512).data;let x0=512,y0=512,x1=-1,y1=-1,count=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>10){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}const v=svg.viewBox.baseVal;return {x:v.x+x0/512*v.width,y:v.y+y0/512*v.height,width:(x1-x0+1)/512*v.width,height:(y1-y0+1)/512*v.height,pixels:count};
  }
  return Promise.all([...document.querySelectorAll('.bv2-room:not([hidden]) .bv2-actor')].filter(n=>!wanted||wanted.includes(n.dataset.seat)).map(async actor=>{
   const figure=${JSON.stringify(clinical)}?actor.closest('.bv2-room').querySelector('[data-film-part="critical-'+actor.dataset.seat+'-body"]'):actor.querySelector('.bv2-figure[data-part=body]');
   const svg=figure.querySelector('svg'),raw=svg.getBBox(),b=await paintedBounds(svg),m=svg.getScreenCTM(),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m)),room=actor.closest('.bv2-room').getBoundingClientRect();
   const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y)),clip={left:Math.max(stage.left,room.left),right:Math.min(stage.right,room.right),top:Math.max(stage.top,room.top),bottom:Math.min(limit,room.bottom)},visibleWidth=Math.max(0,Math.min(right,clip.right)-Math.max(left,clip.left)),visibleHeight=Math.max(0,Math.min(bottom,clip.bottom)-Math.max(top,clip.top));
   return {seat:actor.dataset.seat,slot:actor.dataset.slot,room:actor.closest('.bv2-room').dataset.room,clinical:${JSON.stringify(clinical)},paintedPixels:b.pixels,rawSvgBounds:{x:raw.x,y:raw.y,width:raw.width,height:raw.height},bounds:{left,right,top,bottom,width:right-left,height:bottom-top},clip,visibleRatio:visibleWidth*visibleHeight/((right-left)*(bottom-top)),opacity:Number(getComputedStyle(figure).opacity)};
  }));
 })()`);
 assert.ok(result.length>0,'Expected actual room figures');if(seats)assert.deepEqual(result.map(r=>r.seat).sort(),[...seats].sort());
 for(const r of result){assert.ok(r.paintedPixels>20&&r.bounds.width>=16&&r.bounds.height>=24,'Figure must be visibly identifiable: '+JSON.stringify(r));assert.ok(r.opacity>0&&r.visibleRatio>=minVisibleRatio,'Drawn figure is clipped: '+JSON.stringify(r));}
 return result;
}
