// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';

/** Read the actual rendered content, not only an asset-ready flag or a name tag. */
export async function checkCrewArt(page,{portraits=false,minFigures=1}={}){
 await page.evaluate('(window.planetHarness?.app??window.planetEmulator?.app).artReady');
 const result=await page.evaluate(`(async()=>{
  const visible=n=>!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden'&&Number(getComputedStyle(n).opacity)>0;
  const models=window.planetHarness?.app??window.planetEmulator?.app,versions=models.session.getModel().versions;
  const figures=[...document.querySelectorAll('.bv2-room .bv2-figure[data-part=body]')].filter(visible).map(n=>{const svg=n.querySelector('svg'),b=svg?.getBBox();return {seat:n.closest('[data-seat]')?.dataset.seat??null,hasSvg:!!svg,width:b?.width??0,height:b?.height??0,paths:svg?.querySelectorAll('path').length??0,missingReferences:[...(svg?.querySelectorAll('[href]')??[])].map(x=>x.getAttribute('href')).filter(h=>h?.startsWith('#')&&!document.getElementById(h.slice(1))).length};});
  const pictures=await Promise.all([...document.querySelectorAll('.planet-crew button')].map(async n=>{const image=getComputedStyle(n,'::before').backgroundImage,url=image.startsWith('url(')?image.slice(4,-1).replace(/^["']|["']$/g,''):null,picture=new Image();if(url)picture.src=url;let decoded=false;try{if(url){await picture.decode();decoded=picture.naturalWidth>0;}}catch{}return {character:n.dataset.character,decoded,visible:visible(n),imagePresent:image!=='none'};}));
  const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),instances=[...document.querySelectorAll('[data-crew-instance]')].map(n=>n.dataset.crewInstance);
  return {versions,crewSurface:document.querySelector('[data-crew-art]')?.dataset.crewArt??null,pictures,figures,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),instances,duplicateInstances:instances.filter((id,i)=>instances.indexOf(id)!==i)};
 })()`);
 if(portraits){assert.equal(result.pictures.length,9);assert.ok(result.pictures.every(p=>p.decoded&&p.visible&&p.imagePresent),'Portrait content is absent or undecodable');}
 else{assert.ok(result.figures.length>=minFigures,'Expected visible crew SVG content');assert.ok(result.figures.every(f=>f.hasSvg&&f.width>0&&f.height>0&&f.paths>0&&f.missingReferences===0),'Crew SVG content or shared references are absent');}
 assert.deepEqual(result.duplicateIds,[]);assert.deepEqual(result.duplicateInstances,[]);return result;
}
