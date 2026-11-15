// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {extname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {connect,launchBrowser,openPage} from '../../../../design/tools/lib/chrome.mjs';
import {applyHostedPreviewHeaders,createHostedPreviewHeaders} from '../../../../scripts/hosted-preview-policy.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const fixture=join(root,'apps/game/dev/phone/food');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function pathArg(name){
 const value=process.argv.find(arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3);
 assert.ok(value,'Pass --'+name+'=PATH');
 return resolve(value);
}
const output=pathArg('output'),hosted=pathArg('baseline-hosted-output');
const heartbeatRecovery=process.argv.includes('--heartbeat-recovery');
const releaseBytes=await readFile(join(hosted,'preview-release.json')),release=JSON.parse(releaseBytes);
const project='gamen-mothership-staging',headers=createHostedPreviewHeaders(project);
assert.equal(release.projectId,project);
const art=new Map();
for(const entry of release.files.filter(item=>item.path.startsWith('art/'))){
 const bytes=await readFile(join(hosted,entry.path));
 assert.equal(bytes.length,entry.bytes,entry.path);
 assert.equal(sha(bytes),entry.sha256,entry.path);
 art.set(entry.path,bytes);
}
assert.ok(art.size);
const kinds={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml',
 '.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2'};
const report={scope:'Desktop Chromium with synthetic seat-bound snapshots and controllable transport. Browser touch. Production response headers.',
 candidate:{commit:git('rev-parse','HEAD'),dirty:git('status','--porcelain')},
 timingScope:heartbeatRecovery?'Controlled heartbeat refusal, READ order and simulated blur/refocus. The fixture clock advances to make the fallback due. No hosted latency measurement.'
  :'Browser monotonic samples around synthetic receipt/READ gates. The script does not measure hosted credentials, HTTP or server timings.',
 art:{source:release.sourceCommit,manifestSha256:release.planetRelease.artManifestSha256,bundleSha256:release.bundleSha256,
  inventorySha256:sha(releaseBytes),files:art.size},headers,headersSha256:sha(JSON.stringify(headers)),
 viewports:[],captures:[],policy:[],
};
if(heartbeatRecovery)report.sessionSha256=sha(await readFile(join(root,'apps/game/src/planet/session.ts')));
const buildDir=await mkdtemp(join(tmpdir(),'gamen-food-causal-capture-'));
let server,chrome,browser;
const harness='window.foodAppHarness';
const waiting=operation=>harness+'.causal.waiting('+JSON.stringify(operation)+')';
const model=harness+'.app.food.getModel()';
const action=(name,enabled=true)=>"(()=>{const node=document.querySelector('#food-panel-main');return node?.dataset.act==="+JSON.stringify(name)+
 " && node.getAttribute('aria-disabled')==="+(enabled?'null':"'true'")+";})()";
const touch=async(page,selector,release=true)=>{
 const point=await page.evaluate("(()=>{const node=document.querySelector("+JSON.stringify(selector)+");if(!node||node.hidden)return null;"+
  "const b=node.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;return node.contains(document.elementFromPoint(x,y))?{x,y}:null;})()");
 assert.ok(point,'Control is the actual touch target '+selector);
 await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
 if(release)await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const trace=page=>page.evaluate(harness+'.causal.events.map(({operation,input,at})=>({operation,input,at}))');
function stage(page,caseId,refresh){
 return page.evaluate(harness+'.causal.stage('+JSON.stringify(caseId)+','+refresh+')');
}
async function capture(page,part,label){
 const size=await page.evaluate('[innerWidth,innerHeight]');
 const file=size.join('x')+'-'+label+'.png';
 const result=await page.send('Page.captureScreenshot',{format:'png',fromSurface:true});
 const bytes=Buffer.from(result.data,'base64');
 await writeFile(join(output,file),bytes);
 report.captures.push({file,viewport:size,part,label,sha256:sha(bytes)});
}
async function inspectPage(page){
 assert.deepEqual(page.problems().filter(problem=>!problem.endsWith('/favicon.ico')),[]);
 for(const event of await page.evaluate('window.foodPolicy')){
  const line=(await readFile(join(buildDir,event.path),'utf8')).split('\n')[event.line-1]??'';
  const near=line.slice(Math.max(0,event.column-160),event.column+60);
  assert.ok(event.directive==='script-src'&&event.blocked==='eval'&&/try\{return Function\((?:\x60\x60|""|'')\),!0\}catch\{return!1\}/.test(near),JSON.stringify(event));
  report.policy.push({...event,kind:'Caught Zod eval probe'});
 }
}
async function panel(page,origin){
 await page.goto(origin+'app.html?case=food-panel-03&causal=panel&safe=47,34',harness+'?.ready');
 await page.waitFor(action('release'),'Panel RELEASE enabled');
 await page.evaluate(harness+".causal.park('read');"+harness+".causal.park('foodCommand');void "+harness+".app.session.refresh()");
 await page.waitFor(waiting('read'),'older READ in flight');
 await touch(page,'#food-panel-main');
 await page.waitFor(waiting('foodCommand'),'physical RELEASE dispatched');
 await page.waitFor("document.querySelector('#food-panel-main')?.getAttribute('aria-busy')==='true'",'RELEASE Sending feedback');
 await capture(page,'food-panel-03','panel-release-sending');
 const released=await page.evaluate(harness+".causal.open('foodCommand')");
 await page.waitFor(model+".feedback?.status==='accepted'","RELEASE original receipt");
 const accepted=await page.evaluate('performance.now()');
 assert.ok(await page.evaluate(action('release',false)));
 await touch(page,'#food-panel-main');
 assert.equal((await trace(page)).filter(event=>event.operation==='foodCommand').length,1,'The disabled press is not queued');
 await stage(page,'food-panel-04',false);
 const before=await trace(page),readCount=before.filter(event=>event.operation==='read').length;
 await page.waitFor(harness+".app.session.getModel().connection==='stale'",'8-second local freshness timeout',10000);
 assert.ok(await page.evaluate("document.querySelector('#food-panel-main')?.getAttribute('aria-disabled')==='true'"));
 const oldSettled=await page.evaluate(harness+".causal.open('read')");
 await page.waitFor(action('lock'),'LOCK from the new READ');
 const records=await trace(page),newRead=records.filter(event=>event.operation==='read')[readCount];
 assert.ok(newRead&&newRead.at>=oldSettled&&newRead.at-oldSettled<300,'Deferred refresh started before the 500 ms fallback poll');
 assert.equal(records.filter(event=>event.operation==='foodCommand').length,1);
 await capture(page,'food-panel-04','panel-lock-from-new-read');
 await touch(page,'#food-panel-main');
 await page.waitFor(model+".feedback?.status==='accepted'&&"+model+".feedback?.name==='LOCK'",'LOCK original receipt');
 assert.deepEqual((await trace(page)).filter(event=>event.operation==='foodCommand').map(event=>event.input),['PANEL_RELEASE','PANEL_LOCK']);
 await inspectPage(page);
 return {releaseGateToAcceptedObservationMs:accepted-released,oldReadSettlementToNextReadMs:newRead.at-oldSettled};
}

async function winch(page,origin){
 const initial=origin+'app.html?case=food-winch-02&causal=winch&holdClosure=1&safe=47,34';
 await page.goto(initial,harness+'?.ready');
 await page.waitFor(model+'.canHold','Winch Hold offered');
 await page.evaluate(harness+".causal.park('read');"+harness+".causal.park('foodCommand');void "+harness+".app.session.refresh()");
 await page.waitFor(waiting('read'),'Winch older READ in flight');
 await touch(page,'#food-control-hold',false);
 await page.waitFor(waiting('foodCommand'),'physical DOWN dispatched');
 await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitFor(harness+".causal.events.some(event=>event.input==='UP')",'physical UP dispatched while DOWN and READ are pending');
 assert.deepEqual((await trace(page)).filter(event=>event.operation==='foodCommand').map(event=>event.input),['DOWN','UP']);
 await page.waitFor(model+".feedback?.status==='unknown'","original UP uncertainty");
 const saved=await page.evaluate(harness+".closureStored().entries.map(q=>q.command.input.edge)");
 assert.deepEqual(saved,['DOWN','UP']);
 await stage(page,'food-winch-03',false);
 await inspectPage(page);

 await page.goto(origin+'app.html?case=food-winch-03&causal=recovered&holdClosure=1&safe=47,34',harness+'?.ready');
 await page.waitFor(waiting('foodCommand'),'recovered contact closure in flight');
 await page.waitFor(waiting('foodReceipt'),'original receipt lookup in flight');
 const before=(await trace(page)).filter(event=>['foodCommand','foodReceipt'].includes(event.operation));
 assert.deepEqual(before.slice(0,2).map(event=>event.operation),['foodCommand','foodReceipt']);
 assert.equal(before[0].input,'HOLD_RECOVER_OFF');
 await page.waitFor("document.querySelector('#food-control-hold')?.getAttribute('aria-busy')==='true'",'closure Sending feedback');
 await capture(page,'food-winch-03','winch-recovered-release-sending');
 await page.evaluate(harness+".causal.open('foodCommand')");
 await page.waitFor(model+".feedback?.receipt?.result?.effect==='RECOVERED_CLOSED'",'verified high-water closure');
 assert.equal(await page.evaluate(model+'.pendingCount'),0);
 assert.equal(await page.evaluate(model+'.canKey'),false);
 await stage(page,'food-winch-12',true);
 await page.waitFor(model+'.canKey && document.querySelector("#food-control-key")?.getAttribute("aria-disabled")===null','KEY from authorized landed view');
 await capture(page,'food-winch-12','winch-key-after-closure');
 await page.evaluate(harness+".causal.open('foodReceipt')");
 assert.equal(await page.evaluate(model+'.pendingCount'),0);
 assert.deepEqual((await trace(page)).filter(event=>event.operation==='foodCommand').map(event=>event.input),['HOLD_RECOVER_OFF']);
 await inspectPage(page);
 return {closureLedReceiptLookup:true,lookupStillBlockedWhenClosureRetired:true};
}

async function parkHeartbeatAndRead(page){
 await page.evaluate(harness+".causal.park('read');"+harness+".causal.park('foodHeartbeat');void "+harness+".app.session.refresh()");
 await page.waitFor(waiting('read'),'READ pending before the heartbeat');
 await page.evaluate(harness+'.causal.allowFallback()');
 await page.waitFor(waiting('foodHeartbeat'),'fallback heartbeat dispatched');
}

async function heartbeat(page,origin){
 const concealed=model+".view===null && !document.querySelector('.planet-food.ph:not([hidden]) .fs-ctl')";
 const live=harness+".app.session.getModel().connection==='live'";
 const readCount=async()=>(await trace(page)).filter(event=>event.operation==='read').length;
 const requestCount=harness+".causal.events.filter(event=>event.operation==='read').length";
 await page.goto(origin+'app.html?case=food-panel-03&causal=heartbeat&safe=47,34',harness+'?.ready');
 await page.waitFor(action('release'),'Panel RELEASE authorized');
 await parkHeartbeatAndRead(page);
 await page.evaluate(harness+'.causal.refuseHeartbeat()');
 await page.waitFor(concealed,'current authorization refusal hides the Task');
 const before=await readCount();
 await page.evaluate(harness+".causal.open('read');"+harness+".causal.park('read')");
 await page.waitFor(requestCount+'==='+String(before+1)+' && '+waiting('read'),'new READ after the old request settles');
 assert.equal(await page.evaluate(concealed),true,'the pre-refusal response cannot restore controls');
 assert.equal(await page.evaluate(harness+".app.session.getModel().connection==='error'"),true);
 await capture(page,'reconnecting','concealed-awaiting-authorized-read');
 await page.evaluate(harness+".causal.open('read')");
 await page.waitFor(live+' && '+action('release'),'new authorized view restores RELEASE');
 await capture(page,'food-panel-03','panel-release-after-authorized-read');
 await inspectPage(page);

 await page.goto(origin+'app.html?case=food-winch-02&causal=heartbeat&safe=47,34',harness+'?.ready');
 const hold=model+".canHold && document.querySelector('#food-control-hold')?.getAttribute('aria-disabled')===null";
 await page.waitFor(hold,'Winch Hold authorized');
 await parkHeartbeatAndRead(page);
 await page.evaluate("window.dispatchEvent(new Event('blur'))");
 await page.waitFor(concealed,'blur conceals the Task');
 const beforeFocus=await readCount();
 await page.evaluate("window.dispatchEvent(new Event('focus'));"+harness+".causal.open('read')");
 await page.waitFor(requestCount+'>'+String(beforeFocus)+' && '+live+' && '+hold,'fresh foreground READ restores Hold');
 await page.evaluate(harness+".causal.park('read');"+harness+".causal.refuseHeartbeat()");
 await page.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
 assert.equal(await page.evaluate(live+' && '+hold),true,'obsolete denial does not conceal freshly authorized Hold');
 await capture(page,'food-winch-02','winch-hold-after-obsolete-refusal');
 await inspectPage(page);
 return {oldReadStayedConcealed:true,newReadRestoredRelease:true,obsoleteRefusalPreservedHold:true};
}

await mkdir(output,{recursive:true});
try{
 // The fixture bundles the current app. The art files are the verified, immutable
 // baseline bytes, while the registered-hosted consumer follows its own admission.
 await build({root:fixture,publicDir:false,configFile:false,logLevel:'warn',
  build:{outDir:buildDir,emptyOutDir:true,cssMinify:false,target:'es2022',rollupOptions:{input:join(fixture,'app.html')}}});
 const files=(await readdir(buildDir,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile());
 report.fixtureFiles=await Promise.all(files.map(async entry=>{
  const file=join(entry.parentPath,entry.name),bytes=await readFile(file);
  return {path:relative(buildDir,file),bytes:bytes.length,sha256:sha(bytes)};
 }));
 server=createServer(async(request,response)=>{
  applyHostedPreviewHeaders(response,project);
  try{
   const name=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1);
   const file=resolve(buildDir,name);
   if(!file.startsWith(buildDir+sep)){response.writeHead(404).end();return;}
   const bytes=name.startsWith('art/')?art.get(name):await readFile(file);
   if(!bytes){response.writeHead(404).end();return;}
   response.writeHead(200,{'Content-Type':kinds[extname(name)]??'application/octet-stream'}).end(bytes);
  }catch{response.writeHead(404).end();}
 });
 await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
 const origin='http://127.0.0.1:'+server.address().port+'/';
 report.fixtureUrl=origin+'app.html';
 const response=await fetch(report.fixtureUrl);assert.equal(response.status,200);
 for(const {key,value}of headers)assert.equal(response.headers.get(key),value,key);
 await response.text();
 chrome=await launchBrowser();report.browser=chrome.version;browser=await connect(chrome.endpoint);
 for(const [width,height]of [[390,844],[430,932]]){
  const page=await openPage(browser,{width,height,mobile:true});
  try{
   await page.send('Page.addScriptToEvaluateOnNewDocument',{source:[
    'window.foodPolicy=[];',
    'document.addEventListener("securitypolicyviolation", e=>window.foodPolicy.push({',
    'directive:e.violatedDirective,blocked:e.blockedURI,path:new URL(e.sourceFile||location.href).pathname,line:e.lineNumber,column:e.columnNumber',
    '}));',
   ].join('\n')});
   report.viewports.push(heartbeatRecovery?{width,height,heartbeat:await heartbeat(page,origin)}
    :{width,height,panel:await panel(page,origin),winch:await winch(page,origin)});
  }finally{await page.close();}
 }
 report.passed=true;
}catch(error){
 report.passed=false;report.error=error.stack;throw error;
}finally{
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 browser?.close();
 await chrome?.close();
 if(server?.listening){
  const closed=new Promise(done=>server.close(done));
  server.closeAllConnections();
  await closed;
 }
 await rm(buildDir,{recursive:true,force:true});
}
