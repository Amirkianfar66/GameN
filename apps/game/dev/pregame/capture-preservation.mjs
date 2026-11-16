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
import {createPlanetGame,projectPlanetPublic,projectPlanetFoodPublic} from '../../../../packages/engine/dist/index.js';
import {connect,launchBrowser,openPage,sleep} from '../../../../design/tools/lib/chrome.mjs';
import {applyHostedPreviewHeaders,createHostedPreviewHeaders} from '../../../../scripts/hosted-preview-policy.mjs';

const repo=fileURLToPath(new URL('../../../../',import.meta.url));
const harness=fileURLToPath(new URL('.',import.meta.url));
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function required(name){
 const value=process.argv.find(arg=>arg.startsWith('--'+name+'='))?.slice(name.length+3);
 assert.ok(value,'Pass --'+name+'=PATH');
 return resolve(value);
}
const output=required('output');
const staticDir=required('baseline-hosted-output');
const publishedFile=required('published-release');
const project='gamen-mothership-staging';
const headers=createHostedPreviewHeaders(project);
const publishedBytes=await readFile(publishedFile);
const published=JSON.parse(publishedBytes);
assert.equal(published.projectId,project);
const baseline={commit:git(staticDir,'rev-parse','HEAD'),clean:git(staticDir,'status','--porcelain')===''};
assert.ok(baseline.clean,'Use a clean checkout to build the baseline hosted artwork');
const art=new Map();
for(const file of published.files.filter(item=>item.path.startsWith('art/'))){
 const bytes=await readFile(join(staticDir,file.path));
 assert.equal(bytes.length,file.bytes,file.path);
 assert.equal(sha(bytes),file.sha256,file.path);
 art.set(file.path,bytes);
}
assert.ok(art.size>0,'Use the published file inventory with its complete art directory');

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.png':'image/png'};
const buildDir=await mkdtemp(join(tmpdir(),'gamen-pregame-preservation-'));
const report={
 scope:'Local desktop Chromium with synthetic session transport, running the actual Planet app and film renderer.',
 candidate:{commit:git(repo,'rev-parse','HEAD'),dirty:git(repo,'status','--porcelain')},
 artwork:{baseline,publishedSource:published.sourceCommit,publishedBundleSha256:published.bundleSha256,
  publishedReleaseSha256:sha(publishedBytes),artManifestSha256:published.planetRelease.artManifestSha256,files:art.size},
 headers,headersSha256:sha(JSON.stringify(headers)),
 checks:[],captures:[],policy:[],
};
let server,chrome,browser,page;
const byKind=kind=>'document.querySelector("[data-pregame='+kind+'] .pregame-picture-root svg")';
const privatePixels="document.querySelector('[data-pregame=role], .pregame-caption, .ms-role-card')";
const readyControl="document.getElementById('planet-ready')?.disabled === false";
const readState=()=>page.evaluate('('+function state(){
 const h=window.pregameHarness,m=h.app.session.getModel(),dialog=document.querySelector('[data-pregame]');
 return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,connection:m.connection,status:m.status,
  versions:m.versions,flow:m.setupFlowVersion,setup:m.setup,now:m.setupClock.serverNowMs??null,
  canReady:m.canReady,readyButtonDisabled:document.querySelector('#planet-ready')?.disabled??null,
  role:m.ownRole?.role??null,film:dialog?.dataset.pregame??null,svg:!!dialog?.querySelector('.pregame-picture-root svg'),
  stats:h.app.presentationStats,operations:h.requests.map(x=>x.operation),
  gamePhase:h.app.game?.getModel().phase?.kind??null};
}.toString()+')()');
const elapse=s=>s.now-s.setup.startedAt;
const assertNoReady=s=>assert.ok(s.operations.every(operation=>['requestAdmission','read'].includes(operation)),
 'Unexpected session operations: '+s.operations.join(', '));
const pass=(name,detail)=>{report.checks.push({name,detail});console.log(name);};
const start=options=>page.evaluate('window.pregameHarness.startCase('+JSON.stringify(options)+')');
const reveal=(open=true)=>page.evaluate('window.pregameHarness.reveal('+open+')');
const clickSkip=()=>page.evaluate("document.querySelector('.pregame-skip').click()");
const waitForFilm=kind=>page.waitFor(byKind(kind),kind+' SVG');

async function open(width,height){
 page=await openPage(browser,{width,height,scale:1,mobile:true});
 await page.media({'prefers-reduced-motion':'no-preference'});
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:[
  'window.__filmPolicy = [];',
  'document.addEventListener("securitypolicyviolation", e => window.__filmPolicy.push({',
  '  directive: e.violatedDirective, blocked: e.blockedURI, source: new URL(e.sourceFile || location.href).pathname,',
  '  line: e.lineNumber, column: e.columnNumber',
  '}));',
 ].join('\n')});
 await page.goto(report.url,'window.pregameHarness?.ready');
}
async function snapshot(part,name,label){
 const state=await readState();
 const [width,height]=state.viewport;
 const {data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:90,fromSurface:true});
 const file=join(output,width+'x'+height+'-'+name+'.jpg'),bytes=Buffer.from(data,'base64');
 await writeFile(file,bytes);
 report.captures.push({part,label,file,sha256:sha(bytes),...state});
}
async function finishPage(){
 assert.deepEqual(page.problems(),[],'Chromium reported a page or request failure');
 for(const v of await page.evaluate('window.__filmPolicy')){
  // Zod probes eval in a try/catch. This CSP report is expected only at that expression.
  const line=(await readFile(join(buildDir,v.source),'utf8')).split('\n')[v.line-1]??'';
  const nearby=line.slice(Math.max(0,v.column-160),v.column+60);
  assert.ok(v.directive==='script-src'&&v.blocked==='eval'&&/try\{return Function\((?:\x60\x60|""|'')\),!0\}catch\{return!1\}/.test(nearby),JSON.stringify(v));
  report.policy.push({...v,kind:'Zod caught eval probe'});
 }
 await page.evaluate('window.pregameHarness.dispose()');
 await page.close();
}

function publicRunningSnapshot({matchId,playerCount,versions}){
 const ids=Array.from({length:playerCount},(_,i)=>'seat-'+(i+1));
 const roleOrder=['Insider','Doctor','Blue Disabler','Supplier','Undercover','Hacker','Alien','Red Disabler','Engineer'].slice(0,playerCount);
 const now=Date.now();
 const state=createPlanetGame({matchId,playerCount,roleOrder,initialTurnOrder:ids,
  initialRooms:Object.fromEntries(ids.map((id,i)=>[id,i<4?'Room A':'Room B'])),assetManifestVersion:versions.assetManifestVersion,versions},
 {now,nextPhaseId:'pregame-fixture-first-phase',nextDeadlineToken:'pregame-fixture-first-deadline',random:Array(64).fill(.99)});
 return {publicView:projectPlanetPublic(state),foodPublicView:projectPlanetFoodPublic(state,now),playerView:null,foodPlayerView:null};
}

try{
 await mkdir(output,{recursive:true});
 // Bundle the changed app for the development fixture and use separately verified baseline art.
 await build({root:harness,configFile:false,publicDir:false,logLevel:'warn',
  build:{outDir:buildDir,emptyOutDir:true,target:'es2022',cssMinify:false,sourcemap:false}});
 const files=(await readdir(buildDir,{withFileTypes:true,recursive:true})).filter(entry=>entry.isFile());
 report.fixtureFiles=await Promise.all(files.map(async entry=>{
  const file=join(entry.parentPath,entry.name),bytes=await readFile(file);
  return {path:relative(buildDir,file),bytes:bytes.length,sha256:sha(bytes)};
 }));
 report.fixtureFiles.sort((a,b)=>a.path.localeCompare(b.path));
 server=createServer(async(request,response)=>{
  applyHostedPreviewHeaders(response,project);
  try{
   const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
   const name=path==='/'?'index.html':path.slice(1),file=resolve(buildDir,name);
   assert.ok(file.startsWith(buildDir+sep));
   const bytes=name.startsWith('art/')?art.get(name):await readFile(file);
   if(!bytes){response.writeHead(404).end();return;}
   response.writeHead(200,{'Content-Type':mime[extname(name)]??'application/octet-stream'}).end(bytes);
  }catch{response.writeHead(404).end();}
 });
 await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
 report.url='http://127.0.0.1:'+server.address().port+'/';
 const response=await fetch(report.url);
 assert.equal(response.status,200);
 for(const {key,value} of headers)assert.equal(response.headers.get(key),value,key);
 await response.text();
 chrome=await launchBrowser();
 report.browser=chrome.version;
 browser=await connect(chrome.endpoint);

 await open(390,844);
 await start({release:'food',role:'doctor',elapsed:15500});
 assert.equal((await readState()).role,'Doctor');
 await reveal(false);
 assert.ok(await page.evaluate('!'+privatePixels));
 await reveal();
 await page.waitFor("document.querySelector('.ms-role-card h2')?.textContent==='Doctor'","Food role card");
 const card=await readState();
 assert.equal(card.flow,3);
 assert.equal(card.versions.assetManifestVersion,'design-0.9.0');
 assert.equal(card.setup.roleFilmStartsAt-card.setup.startedAt,20000);
 assert.equal(card.setup.endsAt-card.setup.roleFilmStartsAt,10000);
 assert.ok(elapse(card)<20000&&!card.film&&card.readyButtonDisabled);
 await snapshot('role-card','food-role-card','Admitted Food player, card before the film');
 await waitForFilm('role');
 const first=await readState();
 assert.ok(elapse(first)>=20000&&elapse(first)<30000&&!first.canReady);
 const picture=await page.evaluate(byKind('role')+'.outerHTML');
 await sleep(240);
 assert.notEqual(await page.evaluate(byKind('role')+'.outerHTML'),picture,'Full motion should draw successive SVG states');
 await page.waitFor("Date.now()-window.pregameHarness.value.setup.roleFilmStartsAt>=5500",'role briefing beat');
 await snapshot('role-film','food-role-full','Food role film in its final ten seconds');
 await page.waitFor(readyControl+" && !document.querySelector('[data-pregame]')",'manual Ready after the film');
 const ready=await readState();
 assert.equal(ready.status,'reading');
 assert.ok(elapse(ready)>=30000&&!ready.readyButtonDisabled);
 assertNoReady(ready);
 await snapshot('role-ready','food-role-ready','Reading ends at 30 seconds with Ready enabled');
 pass('Food card, animated SVG and manual Ready follow the 20s/10s server window',{cardMs:elapse(card),firstFilmMs:elapse(first),readyMs:elapse(ready)});

 await start({release:'food',elapsed:22500});
 await reveal();
 await waitForFilm('role');
 const beforeReload=await readState();
 await page.evaluate('window.pregameHarness.reloadApp({forgetSeen:true})');
 await page.waitFor("window.pregameHarness.app.session.getModel().status==='reading'",'same authorized reading after reload');
 await waitForFilm('role');
 const seek=await readState();
 assert.deepEqual(seek.setup,beforeReload.setup);
 assert.ok(elapse(seek)>=elapse(beforeReload)&&elapse(seek)<30000);
 await clickSkip();
 assert.ok(await page.evaluate("!document.querySelector('[data-pregame]') && !!document.querySelector('.ms-role-card')"));
 await page.evaluate('window.pregameHarness.reloadApp()');
 await reveal();
 assert.ok(await page.evaluate("!document.querySelector('[data-pregame]')"));
 assertNoReady(await readState());
 pass('Food recovery uses the same saved window and Skip stays local across reload',{beforeReloadMs:elapse(beforeReload),revealAfterReloadMs:elapse(seek)});

 await start({release:'food',elapsed:17500});
 await reveal(false);
 await page.evaluate('window.pregameHarness.reloadApp()');
 await page.waitFor("Date.now()>=window.pregameHarness.value.setup.roleFilmStartsAt",'concealed role film window');
 assert.ok(await page.evaluate('!'+privatePixels));
 await reveal();
 await waitForFilm('role');
 await page.evaluate('window.pregameHarness.revoke()');
 assert.ok(await page.evaluate('!'+privatePixels));
 assert.equal((await readState()).role,null);
 await start({release:'food',display:true,elapsed:23000});
 assert.equal((await readState()).status,'reading');
 assert.ok(await page.evaluate('!'+privatePixels+" && !document.querySelector('#planet-role-reveal')"));
 pass('Food role concealment persists on reload, and disclosure clears on authorization loss');

 await start({release:'food',kind:'boarding',display:true,elapsed:4200});
 await waitForFilm('boarding');
 const board=await readState();
 assert.equal(board.flow,3);
 assert.equal(board.setup.endsAt-board.setup.startedAt,10000);
 assert.equal(board.role,null);
 assert.ok(elapse(board)>=4200&&elapse(board)<10000);
 await snapshot('boarding','food-boarding-full','Shared display, Food boarding film inside the saved interval');
 await clickSkip();
 const skipped=await readState();
 assert.equal(skipped.status,'boarding');
 assert.equal(skipped.film,null);
 assertNoReady(skipped);
 await page.evaluate('window.pregameHarness.expire()');
 const waiting=await readState();
 assert.equal(waiting.status,'boarding');
 assert.equal(waiting.film,null);
 assertNoReady(waiting);
 const {matchId,playerCount,versions}=await page.evaluate('(()=>{const v=window.pregameHarness.value;return {matchId:v.matchId,playerCount:v.playerCount,versions:v.versions};})()');
 assert.ok(matchId.startsWith('synthetic-pregame'));
 const views=publicRunningSnapshot({matchId,playerCount,versions});
 await page.evaluate('window.pregameHarness.serverRunning('+JSON.stringify(views)+')');
 await page.waitFor("window.pregameHarness.app.game?.getModel().connection==='live'",'authoritative running snapshot');
 const running=await readState();
 assert.equal(running.status,'running');
 assert.equal(running.gamePhase,views.publicView.phase.kind);
 assertNoReady(running);
 pass('Food boarding SVG, local Skip, expiry wait and server transition',{boardingMs:elapse(board),finalPhase:running.gamePhase});

 await start({release:'historical'});
 await reveal();
 await waitForFilm('role');
 assert.equal((await readState()).versions.assetManifestVersion,'design-0.8.0');
 await start({release:'historical',kind:'boarding',elapsed:4500,display:true});
 await waitForFilm('boarding');
 assertNoReady(await readState());
 pass('Saved design-0.8.0 flow 2 renders both films');

 for(const release of ['mixed','invalid'])for(const kind of ['role','boarding']){
  await start({release,kind,elapsed:kind==='role'?24000:5000,display:kind==='boarding'});
  await reveal();
  const invalid=await readState();
  assert.equal(invalid.connection,'error');
  assert.equal(invalid.versions,null);
  assert.equal(invalid.film,null);
  assert.equal(invalid.role,null);
  assert.ok(await page.evaluate('!'+privatePixels));
 }
 await start({release:'older-art'});
 await reveal();
 assert.ok(await page.evaluate("document.querySelector('.ms-role-card') && !document.querySelector('[data-pregame]')"));
 pass('Mixed and forged tuples fail closed while a saved earlier artwork tuple still shows the card');

 await page.media({'prefers-reduced-motion':'reduce'});
 await start({release:'food',elapsed:24200});
 await reveal();
 await waitForFilm('role');
 const still=await page.evaluate(byKind('role')+'.outerHTML');
 await sleep(220);
 assert.equal(await page.evaluate(byKind('role')+'.outerHTML'),still,'Reduce motion holds artwork within a beat');
 await snapshot('role-film','food-role-reduced','Food role film with device Reduce motion');
 await start({release:'food',kind:'boarding',display:true,elapsed:5500});
 await waitForFilm('boarding');
 await snapshot('boarding','food-boarding-reduced','Food boarding film with device Reduce motion');
 pass('Device Reduce motion keeps a still Role beat and renders Boarding');
 await finishPage();

 await open(430,932);
 for(const reduced of [false,true]){
  const mode=reduced?'reduced':'full';
  if(!reduced){
   await start({release:'food',role:'doctor',elapsed:4500});
   await reveal();
   await snapshot('role-card','food-role-card','Admitted Food player, card before the film');
  }
  await start({release:'food',role:'doctor',elapsed:25500,reduced});
  await reveal();
  await waitForFilm('role');
  await snapshot('role-film','food-role-'+mode,'Food role film, '+mode+' motion');
  await start({release:'food',kind:'boarding',display:true,elapsed:5500,reduced});
  await waitForFilm('boarding');
  await snapshot('boarding','food-boarding-'+mode,'Food boarding film, '+mode+' motion');
 }
 await start({release:'food',role:'doctor',elapsed:30400});
 await reveal();
 await page.waitFor(readyControl,'manual Ready at 430 × 932');
 const final=await readState();
 assert.ok(final.canReady&&!final.film);
 assertNoReady(final);
 await snapshot('role-ready','food-role-ready','Reading ends at 30 seconds with Ready enabled');
 await finishPage();
 report.passed=true;
}catch(error){
 report.passed=false;
 report.error=error.stack;
 throw error;
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
