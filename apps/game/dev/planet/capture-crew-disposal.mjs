globalThis[Symbol.for('mothership:dev-only')]=true;
// Actual setup/running consumers and approved review assets, with synthetic sessions.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {launchBrowser,connect,openPage} from '../../../../design/tools/lib/chrome.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),web=await mkdtemp(join(tmpdir(),'gamen-crew-disposal-')),assets='/private/tmp/gamen-crew-consumer-review-build/art';
await writeFile(join(web,'index.html'),'<!doctype html><title>Crew disposal check</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><body></body>');
const server=await createServer({configFile:false,root:web,plugins:[{name:'review-assets-for-disposal-check',configureServer(vite){vite.middlewares.use('/art/',async(req,res)=>{try{const file=resolve(assets,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(file.startsWith(assets+sep));res.setHeader('content-type',({'.css':'text/css','.mp4':'video/mp4','.webp':'image/webp'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});}}],server:{host:'127.0.0.1',port:0,fs:{allow:[root,web]}}});await server.listen();
const chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
try{
 const page=await openPage(browser,{width:390,height:844,mobile:true});await page.goto('http://127.0.0.1:'+server.httpServer.address().port,'document.readyState === "complete"');
 const result=await page.evaluate(`(async()=>{
  const base=${JSON.stringify('/@fs'+root)};
  const {mountPlanetApp}=await import(base+'apps/game/hosted/planet/app.mjs');
  const {mountPlanetRenderer}=await import(base+'apps/game/hosted/planet/render.mjs');
  const {sessionScenario}=await import(base+'apps/game/dev/planet/scenarios.mjs');
  const failures=[],cases=[],check=(ok,message)=>{if(!ok)failures.push(message);};
  const settle=async app=>{for(let i=0;i<100&&app.session.getModel().connection!=='live';i++)await new Promise(done=>setTimeout(done,20));};
  const memory=()=>{let value=null;return {load:()=>value,save:next=>{value=next;},clear:()=>{value=null;}};};
  let value=sessionScenario('choosing',{now:Date.now(),tuple:'crew'});
  const connection={mode:'synthetic',currentUid:()=> 'planet-synthetic-uid',signIn:async()=> 'planet-synthetic-uid',async request(request){if(request.operation==='read')return {ok:true,serverTimeMs:Date.now(),result:structuredClone(value)};throw Error('Unexpected disposal-test request '+request.operation);}};
  const options=()=>({connection,matchId:'planet-local',allowSynthetic:true,stores:{resume:memory(),requests:memory()}});
  const host=document.createElement('div');host.id='setup-host';host.dataset.hostOwner='retain';host.setAttribute('aria-label','Owned host');document.body.append(host);
  let app=await mountPlanetApp(host,options());await app.artReady;await settle(app);
  check(host.dataset.crewArt==='crew-drawing-1.0.0','setup was not selected before disposal');app.dispose();
  check(!host.hasAttribute('data-crew-art'),'setup disposal retained crew selector');check(host.id==='setup-host'&&host.dataset.hostOwner==='retain'&&host.getAttribute('aria-label')==='Owned host','setup disposal changed host attributes');
  value=sessionScenario('choosing',{now:Date.now(),tuple:'current'});app=await mountPlanetApp(host,options());await app.artReady;await settle(app);
  const choice=host.querySelector('#planet-character-c1');if(!choice)throw Error('Historical setup absent: '+JSON.stringify({status:app.session.getModel().status,connection:app.session.getModel().connection,message:app.session.getModel().message,selfSeatId:app.session.getModel().selfSeatId}));
  check(!host.hasAttribute('data-crew-art'),'setup reuse selected new crew for historical tuple');check(choice.style.getPropertyValue('--crew-picture').includes('--ms-asset-piece-crew-card-c1'),'setup reuse did not retain historical portrait dispatch');app.dispose();cases.push({name:'setup dispose and historical reuse',selectorCleared:true,hostAttributesPreserved:true});
  value=sessionScenario('board',{now:Date.now(),tuple:'crew'});app=await mountPlanetApp(host,options());await app.artReady;await settle(app);
  for(let i=0;i<100&&app.game?.getModel().connection!=='live';i++)await new Promise(done=>setTimeout(done,20));
  const running=host.firstElementChild,model=app.game.getModel();running.dataset.hostOwner='retain-running';running.setAttribute('aria-label','Running host');
  check(running.dataset.crewArt==='crew-drawing-1.0.0','running renderer was not selected before disposal');app.dispose();
  check(!host.hasAttribute('data-crew-art')&&!running.hasAttribute('data-crew-art'),'running disposal retained a crew selector');check(running.dataset.hostOwner==='retain-running'&&running.getAttribute('aria-label')==='Running host','running disposal changed host attributes');
  check(!document.querySelector('.crew-shared-art'),'running app disposal retained shared heads');
  host.append(running);const historical={...model,versions:{...model.versions,assetManifestVersion:'design-0.6.0'}},controller={getModel:()=>historical,subscribe(fn){fn(historical);return()=>{};},dismiss(){},setVisible(){}};
  const renderer=mountPlanetRenderer(running,controller);check(!running.hasAttribute('data-crew-art'),'running reuse selected new crew for historical tuple');check(!running.querySelector('[data-crew-instance]'),'running reuse mounted new crew for historical tuple');renderer.dispose();
  check(!running.hasAttribute('data-crew-art')&&running.dataset.hostOwner==='retain-running','historical renderer disposal changed unrelated attributes');host.remove();cases.push({name:'running dispose and historical reuse',selectorCleared:true,hostAttributesPreserved:true});
  return {scope:'Actual app and renderer dispose/reuse under synthetic sessions, desktop Chromium only',cases,failures};
 })()`);
 result.problems=page.problems();result.browser=chrome.version;await writeFile(resolve(process.argv[2]??join(root,'docs/frontend/evidence/crew-runtime-adoption/disposal-reuse.json')),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));await page.close();if(result.failures.length||result.problems.length)process.exitCode=1;
}finally{browser.close();await chrome.close();await server.close();await rm(web,{recursive:true,force:true});}
