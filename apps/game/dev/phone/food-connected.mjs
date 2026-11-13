// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Real Auth/HTTP/Functions/Tasks journey through native browser controls.
// The Node test policy sees only this phone's authorized Food view. It is not
// imported into the browser or production, and never chooses an outcome/time.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
import {assertLocalEmulators,createEmulatorIdentity,projectId} from '../../../../infra/firebase/test/helpers.mjs';
const repo=resolve(new URL('../../../../',import.meta.url).pathname),backend=process.env.GAMEN_FOOD_BACKEND_ROOT??repo;
const {chooseFoodBotInput}=await import(pathToFileURL(resolve(backend,'services/game-api/dist/food-bot-policy.js')));
const hosts=assertLocalEmulators();assert.equal(hosts.authHost,'127.0.0.1:9199');assert.equal(hosts.functionsHost,'127.0.0.1:5101');
const build='/private/tmp/gamen-food-connected-preview',out=process.env.GAMEN_FOOD_CONNECTED_OUT??'/private/tmp/gamen-food-connected-journey';await mkdir(out,{recursive:true});
const counts=process.env.GAMEN_FOOD_CONNECTED_COUNTS?process.env.GAMEN_FOOD_CONNECTED_COUNTS.split(',').map(Number):[7,8,9];assert.ok(counts.every(n=>[7,8,9].includes(n)));
const report={scope:'Real local authenticated native app on normal setup, own-view-only automated human taps and authoritative partner workers. No seeded history, injected clock, manual advance/runBots, direct worker call or private-state read. Desktop Chromium only; no staging/device/Designer acceptance.',
 candidateProvenance:JSON.parse(await readFile(resolve(build,'food-review-provenance.json'),'utf8')),cases:[],errors:[]};
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,path=resolve(build,'.'+(name==='/'?'/index.html':name));if(!path.startsWith(build+sep))throw Error('path');
 res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp','.json':'application/json'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(5173,'127.0.0.1',done);});
const origin='http://localhost:5173',chrome=await launchBrowser(),browser=await connect(chrome.endpoint),displayChrome=await launchBrowser(),displayBrowser=await connect(displayChrome.endpoint),matches=[];
async function invoke(identity,body){const began=performance.now(),response=await fetch(`http://${hosts.functionsHost}/${projectId}/us-central1/planetApi`,{
 method:'POST',signal:AbortSignal.timeout(12000),headers:{'content-type':'application/json',origin,authorization:`Bearer ${identity.idToken}`},body:JSON.stringify(body)});
 const answer=await response.json();assert.equal(response.status,200,'HTTP '+body.operation);assert.equal(answer.ok,true,body.operation+': '+answer.error?.code);return {value:answer.result,ms:performance.now()-began};}
const operation=(operation,matchId,extra={})=>({operation,matchId,requestId:randomUUID(),...extra});
async function waitFor(fn,label,limit=120000){const end=performance.now()+limit;while(performance.now()<end){const value=await fn();if(value)return value;await sleep(250);}throw Error('Timed out: '+label);}
const foodModel=page=>page.evaluate(`(()=>{const f=planetEmulator.app.food?.getModel();return f?{view:f.view,clock:f.clock,fresh:f.fresh,pendingCount:f.pendingCount,
 canAnswer:f.canAnswer,canHold:f.canHold,canPanelRelease:f.canPanelRelease,canPanelLock:f.canPanelLock,canKey:f.canKey,physicalHolding:f.physicalHolding,needsContactOff:f.needsContactOff,feedback:f.feedback?.status??null}:null;})()`);
const capture=async(page,name)=>{const r=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name),Buffer.from(r.data,'base64'));return name;};
async function fill(page,selector,value){await page.evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
async function join(page,roomCode,name,kind='player'){
 await page.goto(origin,'window.planetEmulator');await sleep(4500);
 await page.tap('#planet-entry-join');await fill(page,'#planet-room-code',roomCode);await fill(page,'#planet-display-name',name);
 if(kind==='display')await page.evaluate(`(()=>{const n=document.querySelector('#planet-join-kind');n.value='display';n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await page.tap('#planet-join');
 // A browser tap starts the asynchronous admission. Wait for that original
 // authorized response before the host reads its committed pending list.
 const receipt=await waitFor(()=>page.evaluate('planetEmulator.operations.find(o=>o.operation==="requestAdmission")??null'),kind+' admission response',15000);
 assert.equal(receipt.status,200,kind+' admission HTTP');assert.equal(receipt.ok,true,kind+' admission: '+receipt.code);
}
async function point(page,id){return page.evaluate(`(()=>{const n=document.querySelector(${JSON.stringify('#'+id)});if(!n||n.getAttribute('aria-disabled')==='true')return null;const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:1};})()`);}
async function tapInput(page,id){const p=await point(page,id);if(!p)return false;await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return true;}
try{
 for(const count of counts){
  const host=await createEmulatorIdentity(),created=(await invoke(host,{operation:'create',requestId:randomUUID(),playerCount:count})).value;
  matches.push({host,matchId:created.matchId});const trace=createHash('sha256').update(created.matchId).digest('hex').slice(0,12),stage=(name,fields={})=>console.log(JSON.stringify({count,trace,stage:name,...fields}));
  stage('CREATED');const width=count===8?320:390,height=count===8?568:844,text=count===8?2:1,reduced=count===9;
  // Separate headless browser processes model two devices without a focus change
  // on the display concealing the participant's held contact.
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),display=await openPage(displayBrowser,{width:390,height:844,mobile:true,ownContext:true});
  let held=false,networkChecked=false,caseResult={count,trace,profile:{width,height,text,reduced},stages:[],commands:[]};
  try{
   await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`performance.setResourceTimingBufferSize(5000);localStorage.setItem('mothership:planet:presentation-preferences',JSON.stringify({textScale:${text},reduced:${reduced}}))`});
   await display.send('Page.addScriptToEvaluateOnNewDocument',{source:'performance.setResourceTimingBufferSize(5000)'});
   await join(page,created.roomCode,`Food ${count}`);await join(display,created.roomCode,`Table ${count}`,'display');
   const pending=(await invoke(host,{operation:'read',matchId:created.matchId})).value.pendingAdmissions;
   assert.equal(pending.length,2);for(const p of pending)await invoke(host,operation('approveAdmission',created.matchId,{admissionId:p.id}));
   await invoke(host,operation('setBots',created.matchId,{count:count-1}));await invoke(host,operation('beginSetup',created.matchId));stage('SETUP');
   await waitFor(()=>page.evaluate('planetEmulator.app.session.getModel().status==="reading"'),'normal role reading');
   await waitFor(()=>page.evaluate('planetEmulator.app.session.getModel().canReady'),'manual Ready eligibility',50000);await page.tap('#planet-ready');stage('READY');
   await waitFor(async()=>{const m=await foodModel(page);return m?.canAnswer;},'automatic private invitation',60000);
   await page.tap('#food-action-join');stage('JOIN_SENT');
   const first=await waitFor(async()=>{const m=await foodModel(page);return m?.view?.participantTask?m:false;},'private Task',15000),task=first.view.participantTask;
   assert.equal(task.returnsAt-task.startedAt,32500);caseResult.control=task.selfControl;caseResult.taskDurationMs=task.returnsAt-task.startedAt;stage('TASK',{control:task.selfControl});
   await display.waitFor('planetEmulator.app.game?.getModel().connection==="live"','authorized public display');
   await capture(page,`task-${count}-${task.selfControl.toLowerCase()}.png`);
   let outcome=null,lastTask=task,returned=null;const finishBy=performance.now()+65000;
   while(performance.now()<finishBy){
    const m=await foodModel(page),t=m?.view?.participantTask;
    if(m?.view&&m.view.step===null){returned=m;break;}
    if(!t||m.clock.status!=='synced'){await sleep(50);continue;}
    assert.equal(t.taskId,task.taskId);assert.equal(t.returnsAt,task.returnsAt);lastTask=t;outcome=t.outcome??outcome;
    const publicState=await display.evaluate('({foodController:planetEmulator.app.food!==null,privateArt:document.querySelectorAll(".fs-art,.fs-card").length,own:planetEmulator.app.game?.getModel().ownSeatId,roster:planetEmulator.app.game?.getModel().food?.rosterSeatIds.length})');
    assert.equal(publicState.foodController,false);assert.equal(publicState.privateArt,0);assert.equal(publicState.own,null);if(publicState.roster!==undefined)assert.equal(publicState.roster,count);
    if(t.stage==='ENDED'){
     if(held){await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=false;}
     await sleep(100);continue;
    }
    // Stop only this phone's network briefly after an admitted Hold. The user
    // keeps the same real browser contact; no release may be fabricated.
    if(!networkChecked&&held&&m.pendingCount===0&&t.ownGesture?.currentHolder){
     const before=await page.evaluate('planetEmulator.operations.filter(o=>o.operation==="foodCommand").length');
     await page.send('Network.enable');await page.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await sleep(650);
     const after=await page.evaluate('planetEmulator.operations.filter(o=>o.operation==="foodCommand").length');assert.equal(after,before);
     assert.equal(await page.evaluate('planetEmulator.app.food.getModel().physicalHolding'),true,'network loss must retain the same physical contact, even when a failed request has no HTTP log');
     await page.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});networkChecked=true;caseResult.networkDropWithoutRelease=true;
     await sleep(100);continue;
    }
    const decision=chooseFoodBotInput({...m.view,serverNowMs:Math.floor(m.clock.serverNowMs)}),input=decision.command?.type==='TASK_PRESS'?decision.command.input:null;
    let acted=false;
    if(m.fresh&&input?.kind==='HOLD'&&input.edge==='DOWN'&&m.canHold&&!held){const p=await point(page,'food-control-hold');if(p){await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});held=true;acted=true;}}
    else if(input?.kind==='HOLD'&&input.edge==='UP'&&held){await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=false;acted=true;}
    else if(m.fresh&&input?.kind==='KEY'&&m.canKey)acted=await tapInput(page,'food-control-key');
    else if(m.fresh&&input?.kind==='PANEL_RELEASE'&&m.canPanelRelease||m.fresh&&input?.kind==='PANEL_LOCK'&&m.canPanelLock)acted=await tapInput(page,'food-panel-main');
    if(acted)caseResult.commands.push({kind:input.kind,...(input.kind==='HOLD'?{edge:input.edge}:{})});
    const delay=decision.nextWakeAt===null?75:Math.max(5,Math.min(100,decision.nextWakeAt-m.clock.serverNowMs));await sleep(acted?10:delay);
   }
   assert.ok(returned,'authoritative common return');assert.ok(returned.clock.serverNowMs>=task.returnsAt);assert.equal(outcome?.kind,'DELIVERED',JSON.stringify({count,control:task.selfControl,outcome:outcome?.kind,reason:outcome?.reason,commands:caseResult.commands}));
   assert.equal(returned.view.stock.doses,20);assert.equal(await page.evaluate('planetEmulator.app.game.getModel().board.checkpoint'),'FOOD_RETURNED');
   caseResult.outcome='DELIVERED';caseResult.returnStockDoses=returned.view.stock.doses;caseResult.ownReturnPlacePresent=!!lastTask.ownReturnPlacement;stage('RETURNED');
   await capture(page,`return-${count}.png`);await capture(display,`display-return-${count}.png`);
   const assets=await page.evaluate('performance.getEntriesByType("resource").map(r=>r.name).filter(n=>new URL(n).pathname.startsWith("/art/food-supply/"))');
   const displayAssets=await display.evaluate('performance.getEntriesByType("resource").map(r=>r.name).filter(n=>new URL(n).pathname.startsWith("/art/food-supply/"))');
   const paths=urls=>[...new Set(urls.map(u=>new URL(u).pathname))].sort();assert.equal(paths(assets).length,37);assert.deepEqual(paths(assets),paths(displayAssets));caseResult.uniformAssets=37;
   await waitFor(()=>page.evaluate('planetEmulator.app.game?.getModel().canPass'),'own ordinary Pass',100000);await page.tap('#planet-pass');await page.waitFor('document.querySelector("#planet-confirm")','Pass confirmation');await page.tap('#planet-confirm');
   const meal=await waitFor(async()=>{const m=await foodModel(page);return m?.view?.ownMeals.at(-1);},'authorized own meal',15000);assert.equal(meal.result,'ATE');assert.equal(meal.dosesConsumed,1);caseResult.ownMeal='ATE_ONCE';stage('MEAL');
   caseResult.operations=await page.evaluate('planetEmulator.operations');caseResult.displayOperations=await display.evaluate('planetEmulator.operations');caseResult.publicStayedPrivate=true;report.cases.push(caseResult);
  }catch(error){caseResult.error=error.message;caseResult.operations=await page.evaluate('planetEmulator.operations').catch(()=>[]);caseResult.displayOperations=await display.evaluate('planetEmulator.operations').catch(()=>[]);report.cases.push(caseResult);await capture(page,`failure-${count}.png`).catch(()=>{});await capture(display,`failure-display-${count}.png`).catch(()=>{});throw error;}
  finally{if(held)await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await page.close();await display.close();}
 }
 report.errors=[...browser.events,...displayBrowser.events].filter(e=>e.method==='Runtime.exceptionThrown').map(e=>({text:e.params.exceptionDetails?.text}));assert.deepEqual(report.errors,[]);
}finally{
 for(const m of matches)await invoke(m.host,operation('abort',m.matchId)).catch(()=>{});
 await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));browser.close();displayBrowser.close();await chrome.close();await displayChrome.close();server.close();
}
console.log(`Real native Food journeys: ${report.cases.length}; ${out}`);
