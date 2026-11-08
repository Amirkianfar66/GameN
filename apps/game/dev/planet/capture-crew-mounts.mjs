globalThis[Symbol.for('mothership:dev-only')]=true;
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
import {launchBrowser,connect,openPage} from '../../../../design/tools/lib/chrome.mjs';
const web=await mkdtemp(join(tmpdir(),'gamen-crew-mount-'));await writeFile(web+'/index.html','<!doctype html><title>Crew mount lifecycle test</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><body></body>');
const repo=fileURLToPath(new URL('../../../../',import.meta.url)),out=resolve(process.argv[2]??join(repo,'docs/frontend/evidence/crew-runtime-adoption/mount-lifecycle.json')),server=await createServer({configFile:false,root:web,server:{host:'127.0.0.1',port:0,fs:{allow:[repo,web]}}});await server.listen();
const origin='http://127.0.0.1:'+server.httpServer.address().port,chrome=await launchBrowser();let browser;
try{
 browser=await connect(chrome.endpoint);const page=await openPage(browser,{width:390,height:844,scale:1});await page.goto(origin,'document.readyState === "complete"');
 const facts=await page.evaluate(`(async()=>{
  const base=${JSON.stringify('/@fs'+repo+'apps/game/hosted/')};
  const {paintCrewFigure,setCrewMountActivity,crewMountStats,disposeCrewMounts,setCrewPictureSurface}=await import(base+'crew-runtime.mjs');
  const {walkPose}=await import(base+'scene-drawing/motion.mjs');const {skeletonOf}=await import(base+'scene-drawing/gestures.mjs');
  const versions={protocolVersion:3,engineVersion:'planet-game-1.1.0',rulesetVersion:'in-person-planet-private-feedback-2026-11-06',rulesetHash:'4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa',assetManifestVersion:'design-0.7.0'};
  const failures=[],check=(v,s)=>{if(!v)failures.push(s);};
  const make=()=>{const scope=document.createElement('div'),node=document.createElement('span');scope.append(node);document.body.append(scope);return {scope,node};};
  Object.defineProperty(performance,'now',{configurable:true,value:()=>1000});
  const a=make(),b=make();setCrewPictureSurface(a.scope,versions);setCrewPictureSurface(b.scope,versions);
  paintCrewFigure(a.scope,a.node,versions,'c8',walkPose(.1));setCrewMountActivity(a.scope,false);
  const svg=a.node.firstElementChild,els=[...svg.getElementsByTagName('*')],prefix=a.node.dataset.crewInstance;
  paintCrewFigure(a.scope,a.node,versions,'c8',walkPose(.2));
  check(a.node.firstElementChild===svg,'walking replaced SVG');check(els.every((n,i)=>n===svg.getElementsByTagName('*')[i]),'walking replaced elements');check(prefix===a.node.dataset.crewInstance,'walking changed prefix');
  for(let i=0;i<120;i++)paintCrewFigure(a.scope,a.node,versions,'c8',walkPose((i*16.6667+Math.sin(i*.71)*.8)/225));
  const continuous=crewMountStats(a.scope);check(continuous.mounts===1,'walking remounted');check(continuous.templates===0,'continuous samples cached');
  paintCrewFigure(b.scope,b.node,versions,'c8',skeletonOf('stand'),{cacheTemplate:true});setCrewMountActivity(b.scope,false);
  const extra=document.createElement('span');b.scope.append(extra);paintCrewFigure(b.scope,extra,versions,'c8',skeletonOf('stand'),{cacheTemplate:true});
  const cached=crewMountStats(b.scope);check(cached.templatesBuilt===1&&cached.templates===1,'same named pose not reused');
  const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),set=new Set(ids),missing=[];
  for(const node of document.querySelectorAll('svg *'))for(const attr of node.attributes){for(const m of attr.value.matchAll(/url\\(#([^)]+)\\)/g))if(!set.has(m[1]))missing.push(m[1]);if(attr.name==='href'&&attr.value.startsWith('#')&&!set.has(attr.value.slice(1)))missing.push(attr.value);}
  check(ids.length===set.size,'duplicate IDs');check(missing.length===0,'unresolved refs');check(document.querySelectorAll('.crew-shared-art').length===1,'heads not shared per document');
  const stoppedBefore=crewMountStats(a.scope).running;setCrewMountActivity(a.scope,true);window.dispatchEvent(new Event('blur'));check(!crewMountStats(a.scope).running,'blur retained RAF');window.dispatchEvent(new Event('focus'));check(crewMountStats(a.scope).running,'focus did not resume');setCrewMountActivity(a.scope,false);
  disposeCrewMounts(a.scope);check(crewMountStats(a.scope).instances===0&&!crewMountStats(a.scope).running,'dispose kept instances or RAF');check(document.querySelectorAll('.crew-shared-art').length===1,'first owner removed referenced heads');
  disposeCrewMounts(b.scope);check(document.querySelectorAll('.crew-shared-art').length===0,'last owner retained heads');check(!a.node.firstElementChild&&!b.node.firstElementChild&&!extra.firstElementChild,'dispose retained figures');
  const c=make();paintCrewFigure(c.scope,c.node,versions,'c4',skeletonOf('stand'));setCrewMountActivity(c.scope,false);
  const fallback=paintCrewFigure(c.scope,c.node,{...versions,assetManifestVersion:'design-0.6.0'},'c4',skeletonOf('stand'));check(fallback===false&&!c.node.firstElementChild,'historical fallback retained new figure');check(document.querySelectorAll('.crew-shared-art').length===0,'historical switch retained definitions');
  return {continuous,cached,ids:{total:ids.length,unique:set.size,missing},stoppedBefore,failures};
 })()`);
 const result={scope:'Isolated real-DOM lifecycle test; no runtime release-build bypass or phone performance claim',facts,problems:page.problems(),browser:chrome.version};
 await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));await page.close();if(facts.failures.length||result.problems.length)process.exitCode=1;
}finally{browser?.close();await chrome.close();await server.close();await rm(web,{recursive:true,force:true});}
