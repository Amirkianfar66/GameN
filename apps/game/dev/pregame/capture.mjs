// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {launchBrowser,connect,openPage,sleep} from '../../../../design/tools/lib/chrome.mjs';
const base=process.argv.find(a=>a.startsWith('--url='))?.slice(6)??'http://127.0.0.1:5189/';
const output=resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'/private/tmp/gamen-pregame-hosted-evidence');
const quick=process.argv.includes('--quick'),auditOnly=process.argv.includes('--audit-only');await mkdir(output,{recursive:true});
const checks=[],captures=[],videos=[],uniform=[],opened=[];
let launched,browser,page;
const newPage=async options=>{const value=await openPage(browser,options);opened.push(value);return value;};
const check=(name,details={})=>{checks.push({name,passed:true,...details});console.log(JSON.stringify({check:name,...details}));};
async function start(options){return page.evaluate(`window.pregameHarness.startCase(${JSON.stringify(options)})`);}
async function reveal(){await page.evaluate('window.pregameHarness.reveal()');await page.waitFor("document.querySelector('[data-pregame=role] svg')",'private film');}
async function snapshot(name){
 const path=resolve(output,`${name}.jpg`);const {data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:90,fromSurface:true});await writeFile(path,Buffer.from(data,'base64'));
 const metadata=await page.evaluate(`(()=>{const s=window.pregameHarness.app.session.getModel();return {viewport:[innerWidth,innerHeight],status:s.status,setupFlowVersion:s.setupFlowVersion,setup:s.setup,clock:s.setupClock,ownRole:s.ownRole?.role??null,ownSeat:s.selfSeatId,film:document.querySelector('[data-pregame]')?.dataset.pregame??null,stats:window.pregameHarness.app.presentationStats,captionBoxes:[...document.querySelectorAll('.pregame-caption')].map(n=>{const r=n.getBoundingClientRect();return {font:getComputedStyle(n).fontSize,left:r.left,top:r.top,right:r.right,bottom:r.bottom}})}})()`);
 captures.push({file:path,...metadata});return metadata;
}
async function viewport(width,height){await page.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});}
async function record(name,begin,durationMs){
 const directory=resolve(output,`${name}-frames`);await mkdir(directory,{recursive:true});let cursor=browser.events.length,index=0,chain=Promise.resolve();const frames=[];
 const pump=()=>{const events=browser.events.slice(cursor);cursor=browser.events.length;for(const event of events)if(event.method==='Page.screencastFrame'){
  const {data,metadata,sessionId}=event.params,path=resolve(directory,`${String(index++).padStart(5,'0')}.jpg`);frames.push({path,timestamp:metadata.timestamp});
  chain=chain.then(async()=>{await page.send('Page.screencastFrameAck',{sessionId});await writeFile(path,Buffer.from(data,'base64'));});
 }};
 await page.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:390,maxHeight:844,everyNthFrame:2});const timer=setInterval(pump,25);
 const beginAt=Date.now();await begin();await sleep(durationMs);await page.send('Page.stopScreencast');clearInterval(timer);pump();await chain;
 assert.ok(frames.length>1,'Runtime recording received no frames');
 let list='';for(let i=0;i<frames.length;i++){list+=`file '${frames[i].path}'\n`;list+=`duration ${i+1<frames.length?Math.max(.001,frames[i+1].timestamp-frames[i].timestamp):.1}\n`;}
 const input=resolve(directory,'frames.ffconcat'),file=resolve(output,`${name}.mp4`);await writeFile(input,list);
 await new Promise((done,fail)=>{const child=spawn('/opt/homebrew/bin/ffmpeg',['-v','error','-y','-safe','0','-f','concat','-i',input,'-fps_mode','vfr','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',b=>{error+=b});child.on('error',fail);child.on('exit',code=>code===0?done():fail(new Error(error)));});
 videos.push({file,sampledFrames:frames.length,recordingWallMs:Date.now()-beginAt,provenance:'Actual hosted consumer with synthetic transport; sampled VFR screencast, not app/device FPS'});
 console.log(JSON.stringify({video:name,frames:frames.length}));
}
try{
 launched=await launchBrowser();browser=await connect(launched.endpoint);page=await newPage({width:390,height:844,scale:1,mobile:true});await page.media({'prefers-reduced-motion':'no-preference'});
 await page.goto(base+'?kind=role', 'window.pregameHarness?.ready');
 try{await page.waitFor("window.pregameHarness.app.session.getModel().status==='reading'",'validated reading snapshot');}catch(error){const diagnostic=await page.evaluate('window.pregameHarness.diagnostic()');await writeFile(resolve(output,'diagnostic.json'),JSON.stringify(diagnostic,null,2));throw new Error(error.message+' '+JSON.stringify(diagnostic));}
 check('actual hosted app accepts registered0.8 and current R17 contract');

 await start({kind:'role',role:'doctor'});await reveal();assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().ownRole.role'),'Doctor');
 await page.evaluate("document.querySelector('.pregame-skip').click()");assert.equal(await page.evaluate("document.querySelector('[data-pregame]')"),null);
 assert.equal(await page.evaluate("window.pregameHarness.requests.some(r=>r.operation==='ready'||r.operation==='advance')"),false);check('private Skip returns to the card without Ready or advance');
 await page.evaluate('window.pregameHarness.refresh()');assert.equal(await page.evaluate("document.querySelector('[data-pregame]')"),null);check('refresh does not replay private film');
 await page.evaluate('window.pregameHarness.reloadApp({forgetSeen:true})');assert.equal(await page.evaluate("document.querySelector('[data-pregame]')"),null);await page.evaluate('window.pregameHarness.reveal()');assert.equal(await page.evaluate("document.querySelector('[data-pregame]')"),null);assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().ownRole.role'),'Doctor');check('fresh recovered app with no seen marker still skips intro and private replay');
 await page.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await page.evaluate("document.querySelector('.pregame-overlay,.pregame-caption,.ms-role-card')"),null);check('blur removes private scene, captions and card');
 await page.evaluate("window.dispatchEvent(new Event('focus'));window.pregameHarness.refresh()");await page.evaluate('window.pregameHarness.reveal()');assert.equal(await page.evaluate("document.querySelector('[data-pregame]')"),null);check('foreground reconnect and reveal do not replay private film');
 await start({kind:'role',role:'hacker'});await reveal();await page.evaluate('window.pregameHarness.revoke()');assert.equal(await page.evaluate("document.querySelector('.pregame-overlay,.pregame-caption,.ms-role-card')"),null);check('revocation clears private pixels and text');
 await start({kind:'role'});await reveal();await page.evaluate("window.pregameHarness.setUid('revoked-owner')");await page.waitFor("!document.querySelector('[data-pregame]')",'identity conceal');check('changed authentication clears private film');
 for(const count of [7,8,9]){
  await start({kind:'boarding',count,display:true,elapsed:8500});assert.equal(await page.evaluate("document.querySelector('[data-pregame]')?.dataset.pregame"),'boarding');assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().ownRole'),null);
  await page.evaluate("document.querySelector('.pregame-skip').click()");assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().status'),'boarding');assert.equal(await page.evaluate("window.pregameHarness.requests.some(r=>r.operation==='ready'||r.operation==='advance')"),false);
  await page.evaluate('window.pregameHarness.expire()');assert.equal(await page.evaluate("document.querySelector('[data-pregame]')"),null);assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().status'),'boarding');
  await page.evaluate('window.pregameHarness.serverRunning()');await page.waitFor("window.pregameHarness.app.session.getModel().status==='running'",'authoritative running');check(`public ${count}-player late join, Skip, expiry wait and server transition`);
 }
 await start({kind:'role',reduced:false});await reveal();await sleep(400);const before=await page.evaluate('performance.now()');await page.media({'prefers-reduced-motion':'reduce'});await page.waitFor("matchMedia('(prefers-reduced-motion: reduce)').matches",'OS Reduced preference');await sleep(250);assert.equal(await page.evaluate("document.querySelector('[data-pregame]')?.dataset.pregame"),'role');const held=await page.evaluate("document.querySelector('.pregame-picture-root').innerHTML");await sleep(120);assert.equal(await page.evaluate("document.querySelector('.pregame-picture-root').innerHTML"),held);check('effective Reduced switches to a held picture at the current local clock',{elapsedSinceSwitchMs:await page.evaluate('performance.now()')-before});await page.media({'prefers-reduced-motion':'no-preference'});

 const roles=quick?['doctor']:['doctor','insider','blue-disabler','red-disabler','supplier','engineer','undercover','hacker','alien'];
 for(const [width,height]of auditOnly?[]:quick?[[390,844]]:[[320,568],[390,844],[430,932]]){
  await viewport(width,height);
  for(const reduced of [false,true]){
   for(const role of width===390?roles:['doctor']){
    await start({kind:'role',role,reduced});await reveal();await sleep(5000);await snapshot(`${width}x${height}-${role}-${reduced?'reduced':'full'}-page`);await sleep(3500);await snapshot(`${width}x${height}-${role}-${reduced?'reduced':'full'}-title`);
   }
   for(const count of quick?[9]:[7,8,9]){await start({kind:'boarding',count,reduced,elapsed:7500,display:true});await sleep(200);await snapshot(`${width}x${height}-boarding-${count}-${reduced?'reduced':'full'}`);}
   await start({kind:'brand',reduced});await sleep(1100);await snapshot(`${width}x${height}-brand-${reduced?'reduced':'full'}`);
  }
  console.log(JSON.stringify({capturedViewport:[width,height],captures:captures.length}));
 }
 if(!quick&&!auditOnly){
  await viewport(390,844);
  for(const reduced of [false,true]){
   await record(`brand-${reduced?'reduced':'full'}`,()=>start({kind:'brand',reduced}),2250);
   await start({kind:'role',role:'doctor',reduced});await record(`doctor-${reduced?'reduced':'full'}`,()=>reveal(),10200);
   await record(`boarding-${reduced?'reduced':'full'}`,()=>start({kind:'boarding',reduced,count:9,display:true}),10200);
  }
 }

 // Fresh page/module graphs provide independent request-path evidence for every private role.
 for(const role of quick?['doctor']:['doctor','hacker','alien']){
  page=await newPage({width:390,height:844,scale:1,mobile:true});await page.goto(base+`?kind=role&role=${role}`,'window.pregameHarness?.ready');await reveal();await sleep(100);uniform.push({role,paths:[...new Set(page.requests().map(url=>new URL(url).pathname).filter(path=>path.includes('/pregame-films/')||path.startsWith('/art/')))].sort()});await page.evaluate('window.pregameHarness.dispose()');
 }
 for(const row of uniform)assert.deepEqual(row.paths,uniform[0].paths);check('private role art requests are uniform',{roles:uniform.map(r=>r.role),paths:uniform[0].paths.length});

 // Paused art cannot hold the real session; the old awaited loader would wait its eight seconds.
 page=await newPage({width:320,height:568,scale:1,mobile:true});await page.send('Fetch.enable',{patterns:[{urlPattern:'*/art/*',requestStage:'Request'}]});const stalledAt=Date.now(),eventStart=browser.events.length;
 await page.send('Page.navigate',{url:base+'?kind=role&role=doctor'});await page.waitFor('window.pregameHarness?.ready','session while art paused',7000);const readyMs=Date.now()-stalledAt;assert.ok(readyMs<7000);await reveal();assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().status'),'reading');check('paused uniform art does not block admission or film',{readyMs});
 for(const event of browser.events.slice(eventStart))if(event.method==='Fetch.requestPaused')await page.send('Fetch.continueRequest',{requestId:event.params.requestId});await page.send('Fetch.disable');await page.evaluate("document.querySelector('.pregame-skip').click()");assert.equal(await page.evaluate("window.pregameHarness.requests.some(r=>r.operation==='ready'||r.operation==='advance')"),false);
 page=await newPage({width:320,height:568,scale:1,mobile:true});await page.block(['*/art/*']);await page.goto(base+'?kind=role&role=doctor','window.pregameHarness?.ready');await reveal();await page.evaluate("document.querySelector('.pregame-skip').click()");assert.equal(await page.evaluate('window.pregameHarness.app.session.getModel().status'),'reading');assert.equal(await page.evaluate("window.pregameHarness.requests.some(r=>r.operation==='ready'||r.operation==='advance')"),false);check('failed uniform art keeps the role card and has no phase authority');
 await page.evaluate('window.pregameHarness.dispose()');assert.equal(await page.evaluate("document.querySelector('.pregame-overlay,.pregame-caption')"),null);check('disposal removes presentation resources');
 const contexts=opened.map((context,index)=>({index,problems:context.problems()})),problems=contexts.flatMap(context=>context.problems.map(message=>({context:context.index,message})));
 const runtimeExceptions=browser.events.filter(event=>event.method==='Runtime.exceptionThrown').map(event=>({sessionId:event.sessionId,message:event.params.exceptionDetails.exception?.description??event.params.exceptionDetails.text}));
 const report={browser:launched.version,provenance:'Synthetic transport through actual hosted app/session/controller; desktop Chromium only; no real multiplayer or physical-device acceptance',errorScope:'Every opened context; intentionally blocked-art failures excluded by the capture helper, Runtime exceptions aggregated across the browser',checks,captures,videos,uniform,contexts,problems,runtimeExceptions};await writeFile(resolve(output,'hosted-checks.json'),JSON.stringify(report,null,2)+'\n');assert.deepEqual(problems,[]);assert.deepEqual(runtimeExceptions,[]);console.log(JSON.stringify({passed:checks.length,captures:captures.length,videos:videos.length,contexts:contexts.length,problems,runtimeExceptions}));
}finally{browser?.close();await launched?.close();}
