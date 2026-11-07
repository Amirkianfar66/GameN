globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../../../../design/tools/lib/chrome.mjs';
const directory=resolve('/private/tmp/gamen-crew-consumer-review-build');
const out=resolve(process.argv[2]??'docs/frontend/evidence/crew-runtime-adoption');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}const file=resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(directory+sep))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.mp4':'video/mp4','.webp':'image/webp','.png':'image/png'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Excluded review build of native consumer, synthetic authority, approved scoped asset bytes. Desktop Chromium viewport emulation only; normal release inventory approval and physical-device acceptance remain pending.',designerHead:'8cee39d89798390d03c2a4a9fe457fa6de387bda',registrationBase:'a1ad3e541f3b7ea0789b4ec2f2dd777c7764f414',browser:chrome.version,cases:[]};
const boxes=page=>page.evaluate(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(n=>Math.round(n*100)/100);};return {overflow:[document.documentElement.scrollWidth>innerWidth,document.documentElement.scrollHeight>innerHeight],actors:[...document.querySelectorAll('.bv2-actor[data-place="world"]')].map(n=>({seat:n.dataset.seat,slot:n.dataset.slot,name:rect(n.querySelector('.bv2-nameplate')),body:rect(n.querySelector('.bv2-figure[data-part="body"]'))})),targets:[...document.querySelectorAll('.bv2-seat-target')].map(n=>({id:n.id,box:rect(n)})),pictureCount:document.querySelectorAll('.planet-crew [data-character]').length};})()`);
const go=async(page,scenario,tuple='crew')=>{await page.goto(`${origin}/?scenario=${scenario}&tuple=${tuple}`,'window.planetHarness');await page.evaluate('window.planetHarness.candidateReady');await sleep(100);};
const record=async(page,name)=>{const layout=await boxes(page);assert.equal(layout.overflow[0],false,name);assert.ok(layout.targets.every(t=>t.box[2]>=43.5&&t.box[3]>=43.5),name+' target size');const screenshot=name+'.png';await page.screenshot(resolve(out,screenshot),{viewport:true});facts.cases.push({name,layout,screenshot});return layout;};
try{
 if(!process.argv.includes('--effects'))for(const [width,height]of [[320,568],[390,844],[430,932]])for(const reduced of [false,true]){
  const page=await openPage(browser,{width,height,mobile:true}),prefix=`${width}-${height}-${reduced?'reduced':'full'}`;await page.media({'prefers-reduced-motion':reduced?'reduce':'no-preference'});
  await go(page,'board','current');const old=await boxes(page);assert.equal(await page.evaluate("document.querySelectorAll('[data-crew-instance]').length"),0);await page.screenshot(resolve(out,prefix+'-historical-board.png'),{viewport:true});
  await go(page,'board');const current=await record(page,prefix+'-board');assert.deepEqual(current.actors,old.actors,'historical/current slot and name/body geometry');assert.equal(current.actors.length,9);
  await page.evaluate("window.planetHarness.app.game.begin('SCAN')");await record(page,prefix+'-targets');
  const before=new Set(page.requests().filter(u=>!u.includes('/?')).map(u=>new URL(u).pathname));
  await page.evaluate("window.planetHarness.app.game.dismiss();window.planetHarness.app.game.openPanel('card')");await record(page,prefix+'-own-card');
  const after=new Set(page.requests().filter(u=>!u.includes('/?')).map(u=>new URL(u).pathname));assert.deepEqual(after,before,'private card fetched extra asset');
  await go(page,'choosing');const selector=await record(page,prefix+'-selector');assert.equal(selector.pictureCount,9);assert.equal(await page.evaluate("document.querySelectorAll('.crew-shared-art').length"),0,'leaving game retained shared head definitions');
  await go(page,'promises');await record(page,prefix+'-capsule');
  const references=await page.evaluate(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),set=new Set(ids),missing=[];for(const n of document.querySelectorAll('svg *'))for(const a of n.attributes){for(const m of a.value.matchAll(/url\\(#([^)]+)\\)/g))if(!set.has(m[1]))missing.push(m[1]);if(a.name==='href'&&a.value.startsWith('#')&&!set.has(a.value.slice(1)))missing.push(a.value);}return {ids:ids.length,unique:set.size,missing};})()`);assert.equal(references.ids,references.unique,prefix+' duplicate ids');assert.deepEqual(references.missing,[],prefix+' missing SVG reference');
  assert.deepEqual(page.problems(),[],prefix+' browser errors');facts.cases.push({name:prefix+'-checks',references,commonCrewCss:page.requests().filter(u=>/\/art\/crew-.*\.css$/.test(u)).map(u=>new URL(u).pathname),problems:page.problems()});
  await page.evaluate('window.planetHarness.app.dispose()');assert.equal(await page.evaluate("document.querySelectorAll('.crew-shared-art').length"),0,'dispose retained shared head defs');await page.close();
 }
 if(process.argv.includes('--effects')){
  const page=await openPage(browser,{width:390,height:844,mobile:true});
  await go(page,'doctor');await record(page,'390-844-full-hospital-gown');
  await page.evaluate(`(async()=>{const h=window.planetHarness,v=structuredClone(h.value),p=v.playerView;p.viewRevision++;for(const [id,slot]of [['seat-4','H2'],['seat-5','H3'],['seat-6','H4']])Object.assign(p.board.seats.find(s=>s.seatId===id),{health:'Injured',location:'Hospital',slotId:slot,rescueDueAfterRound:7,medical:{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}});v.publicView=h.publicPlanet(p);await h.replace(v);})()`);

  await page.evaluate(`(async()=>{const h=window.planetHarness,v=structuredClone(h.value),p=v.playerView,stamp=Date.now();p.viewRevision++;const s=p.board.seats.find(s=>s.seatId==='seat-7');Object.assign(s,{health:'Eliminated',location:null,slotId:null,rescueDueAfterRound:null,medical:null});p.events=[{id:'crew-review-overflow',kind:'HOSPITAL_OVERFLOW_REMOVED',round:p.round,phaseId:p.phase.id,viewRevision:p.viewRevision,publishedAt:stamp,expiresAt:stamp+30000,audience:{kind:'public'},seatIds:['seat-7'],actorSeatId:null,location:null,slotId:null,clinicalAnchor:null}];v.publicView=h.publicPlanet(p);await h.replace(v);})()`);
  await sleep(700);
  const memorial=await page.evaluate(`(()=>{const n=document.querySelector('[data-film-part="crew-review-overflow-grey-body"]');return {present:!!n,instance:n?.dataset.crewInstance,opacity:n?.style.opacity,figures:document.querySelectorAll('.bv2-actor[data-place="world"]').length};})()`);
  assert.equal(memorial.present,true,'overflow grey figure not rendered');assert.ok(memorial.instance,'overflow did not use the new crew drawing');assert.ok(Number(memorial.opacity)>0,'overflow grey figure invisible');assert.equal(memorial.figures,8);
  await record(page,'390-844-full-memorial');facts.cases.push({name:'memorial-checks',memorial});
  await go(page,'alien');await page.evaluate("window.planetHarness.app.game.openPanel('card')");await sleep(100);await record(page,'390-844-full-private-clone');
  const clone=await page.evaluate(`(()=>{const card=document.querySelector('.bv2-clone-card'),ids=[...document.querySelectorAll('[id]')].map(n=>n.id),set=new Set(ids),missing=[];for(const node of document.querySelectorAll('svg *'))for(const a of node.attributes){for(const m of a.value.matchAll(/url\\(#([^)]+)\\)/g))if(!set.has(m[1]))missing.push(m[1]);if(a.name==='href'&&a.value.startsWith('#')&&!set.has(a.value.slice(1)))missing.push(a.value);}return {present:!!card,parts:card?.querySelectorAll('[data-clone-part]').length,ids:ids.length,unique:set.size,missing};})()`);
  assert.equal(clone.present,true);assert.equal(clone.ids,clone.unique);assert.deepEqual(clone.missing,[]);assert.deepEqual(page.problems(),[]);facts.cases.push({name:'effects-checks',clone,problems:page.problems()});
  await go(page,'alien','current');await page.evaluate("window.planetHarness.app.game.openPanel('card')");await page.screenshot(resolve(out,'390-844-historical-private-clone.png'),{viewport:true});
  await page.evaluate('window.planetHarness.app.dispose()');assert.equal(await page.evaluate("document.querySelectorAll('.crew-shared-art').length"),0);await page.close();
 }
 const recordFile=process.argv.includes('--effects')?'effects-checks.json':'viewport-checks.json';
 await writeFile(resolve(out,recordFile),JSON.stringify(facts,null,2)+'\n');console.log(JSON.stringify({cases:facts.cases.length,captures:facts.cases.filter(c=>c.screenshot).length,failures:0,scope:facts.scope},null,2));
}catch(error){facts.failure=String(error.stack??error);await writeFile(resolve(out,process.argv.includes('--effects')?'effects-checks.json':'viewport-checks.json'),JSON.stringify(facts,null,2)+'\n');throw error;}
finally{browser.close();await chrome.close();await new Promise(done=>server.close(done));}
