// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage} from '../capture/browser.mjs';
const directory='/private/tmp/gamen-blackout-preview',out=resolve(process.argv[2]??'/private/tmp/gamen-round-order-review');await mkdir(out,{recursive:true});
const provenance=JSON.parse(await readFile(resolve(directory,'review-provenance.json'),'utf8'));
async function verify(){for(const item of provenance.candidate.modules)assert.equal(createHash('sha256').update(await readFile(resolve(provenance.candidate.root,item.path))).digest('hex'),item.sha256,'Source changed: '+item.path);return true;}
await verify();await writeFile(resolve(out,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,path=resolve(directory,'.'+(name==='/'?'/index.html':name));if(!path.startsWith(directory+sep))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint),facts={scope:'Round-order copy only: actual native panel against explicit synthetic saved-tuple projections. No gameplay/timer/device claim; prior evidence retains its actual source identity.',generatedAt:new Date().toISOString(),browser:await browser.send('Browser.getVersion'),sourcesVerifiedBefore:true,cases:[]};
const historical='Player turns · Private talk · Sync when applicable · Jail vote · Result · Blackout · Resolution · Navigation';
const current='Player turns · Private talk · Sync when applicable · Blackout · Damage and Hospital placement · Jail vote · Result · Remaining resolution and Rescue · Navigation';
async function picture(page,name){const {data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:false});await writeFile(resolve(out,name+'.jpg'),Buffer.from(data,'base64'));return name+'.jpg';}
try{
 for(const [tuple,width,height,scale]of [['original',390,844,1],['sync',390,844,1],['current',390,844,1],['phone',390,844,1],['blackout',390,844,1],['blackout',320,568,2]]){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),name=`${tuple}-${width}-${height}-${scale*100}`;
  try{await page.goto(`${origin}/?scenario=hacker&tuple=${tuple}&count=9`,'window.planetHarness');await page.evaluate(`document.documentElement.style.fontSize='${scale*100}%';document.dispatchEvent(new CustomEvent('mothership:preferences-change'));window.planetHarness.candidateReady`);await page.waitFor("window.planetHarness.app.game?.getModel().connection==='live'",'native saved-tuple presentation');
   await page.tap('#planet-nav-panels');await page.tap('[data-planet-action=panel][data-value=round-order]');
   const panel=await page.evaluate("(()=>{const body=document.querySelector('.planet-sheet-body'),p=body.querySelector('p:last-child'),range=document.createRange();range.selectNodeContents(p);const b=body.getBoundingClientRect();return {heading:body.querySelector('h2').textContent,text:p.textContent,versions:window.planetHarness.app.game.getModel().versions,allLinesWithinWidth:[...range.getClientRects()].every(r=>r.left>=b.left&&r.right<=b.right),scrollHeight:body.scrollHeight,clientHeight:body.clientHeight};})()");
   assert.equal(panel.heading,'Round order');assert.equal(panel.text,tuple==='blackout'?current:historical);assert.ok(panel.allLinesWithinWidth);const top=await picture(page,name+'-top');
   await page.evaluate("(()=>{const body=document.querySelector('.planet-sheet-body');body.scrollTop=body.scrollHeight;})()");const endVisible=await page.evaluate("(()=>{const body=document.querySelector('.planet-sheet-body'),p=body.querySelector('p:last-child'),range=document.createRange();range.selectNodeContents(p);const line=[...range.getClientRects()].at(-1),b=body.getBoundingClientRect();return line.top>=b.top&&line.bottom<=b.bottom;})()");assert.ok(endVisible);const bottom=await picture(page,name+'-bottom');
   const commands=await page.evaluate("window.planetHarness.requests.filter(r=>r.operation==='command').length");assert.equal(commands,0);facts.cases.push({name,passed:true,...panel,lastLineReachable:endVisible,commandRequests:commands,captures:{top,bottom}});
  }catch(error){facts.failure={case:name,error:error.stack};await picture(page,name+'-failure');throw error;}finally{await page.close();}
 }
}finally{facts.sourcesUnchangedThroughRun=await verify();facts.runtimeErrors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text);await writeFile(resolve(out,'facts.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();await new Promise(done=>server.close(done));}
assert.deepEqual(facts.runtimeErrors,[]);console.log(JSON.stringify({passed:facts.cases.length,out}));
