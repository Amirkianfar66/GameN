// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const directory='/private/tmp/gamen-food-preview',out=process.env.GAMEN_FOOD_RECOVERY_OUT??'/private/tmp/gamen-food-recovery-native';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,path=resolve(directory,'.'+(name==='/'?'/app.html':name));if(!path.startsWith(directory+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Full native app on explicitly synthetic transport/recovery boundaries. Actual native DOWN/UP are deliberately not delivered; the unchanged canonical landed packet is a separate presentation boundary, not a causal engine-history claim. Exact synthetic recovery receipt, actual browser reload and KEY touch. Desktop Chromium only; no API, device or Designer acceptance.',provenance:JSON.parse(await readFile(resolve(directory,'food-review-provenance.json'),'utf8')),cases:[],errors:[]};
const shot=async(page,name)=>{const r=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name),Buffer.from(r.data,'base64'));return name;};
const state=page=>page.evaluate(`(()=>{const m=foodAppHarness.app.food.getModel(),n=document.querySelector('#food-control-key'),r=n?.getBoundingClientRect(),s=foodAppHarness.closureStored();return {pendingCount:m.pendingCount,canKey:m.canKey,canCheck:m.canCheck,feedback:m.feedback?.status??null,recovered:m.feedback?.recovered??false,receiptEffect:m.feedback?.receipt?.result?.effect??null,storedEntries:s?.entries.length??0,contactSequence:s?.contact?.highestSequence??null,physicalHolding:m.physicalHolding,controls:n?{label:n.getAttribute('aria-label'),disabled:n.getAttribute('aria-disabled')==='true',busy:n.getAttribute('aria-busy')==='true',rect:{x:r.x,y:r.y,width:r.width,height:r.height},whole:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}:null,inputs:foodAppHarness.sent.filter(q=>q.operation==='foodCommand').map(q=>({kind:q.request.command.input?.kind,edge:q.request.command.input?.edge??null})),lookups:foodAppHarness.lookups.length,body:document.querySelector('.planet-food.ph').innerText};})()`);
try{
 for(const [width,height,text,safe]of [[390,844,1,'47,34'],[320,568,2,'20,0']])for(const motion of ['normal','reduced']){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),profile=`${width}-${height}-text${text}-${motion}`,record={profile};facts.cases.push(record);
  const url=`${origin}/app.html?case=food-winch-02&holdClosure=1&text=${text}&safe=${safe}&motion=${motion}`;
  try{
   await page.goto(url,'window.foodAppHarness?.ready');await page.evaluate('Promise.all([foodAppHarness.app.artReady,document.fonts.ready])');
   await page.waitFor('foodAppHarness.app.food.getModel().canHold','offered Hold');
   const point=await page.evaluate('(()=>{const r=document.querySelector("#food-control-hold").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:1};})()');
   await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitFor('foodAppHarness.app.food.getModel().pendingCount===2&&foodAppHarness.app.food.getModel().feedback?.status==="unknown"','two never-delivered originals');
   await page.evaluate('foodAppHarness.stageClosureLanded()');
   await page.waitFor('foodAppHarness.app.food.getModel().pendingCount===3&&foodAppHarness.app.food.getModel().feedback?.status==="unknown"','unknown original recovery');
   await sleep(70);record.pending=await state(page);assert.equal(record.pending.canKey,false);assert.equal(record.pending.controls.disabled,true);assert.equal(record.pending.controls.whole,true);assert.equal(record.pending.physicalHolding,false);
   assert.deepEqual(record.pending.inputs,[{kind:'HOLD',edge:'DOWN'},{kind:'HOLD',edge:'UP'},{kind:'HOLD_RECOVER_OFF',edge:null}]);
   record.pending.image=await shot(page,profile+'-pending.png');
   await page.evaluate('foodAppHarness.settleClosureReceipt()');await page.waitFor('foodAppHarness.app.food.getModel().pendingCount===0&&foodAppHarness.app.food.getModel().canKey','verified closure enables KEY');
   await sleep(70);record.recovered=await state(page);assert.equal(record.recovered.canCheck,false);assert.equal(record.recovered.feedback,'accepted');assert.equal(record.recovered.recovered,true);assert.equal(record.recovered.receiptEffect,'RECOVERED_CLOSED');assert.equal(record.recovered.storedEntries,0);assert.equal(record.recovered.controls.disabled,false);assert.equal(record.recovered.controls.whole,true);
   record.recovered.image=await shot(page,profile+'-recovered.png');
   await page.goto(url,'window.foodAppHarness?.ready');await page.evaluate('Promise.all([foodAppHarness.app.artReady,document.fonts.ready])');await sleep(70);
   record.reloaded=await state(page);assert.equal(record.reloaded.pendingCount,0);assert.equal(record.reloaded.canKey,true);assert.equal(record.reloaded.canCheck,false);assert.equal(record.reloaded.controls.disabled,false);assert.equal(record.reloaded.controls.whole,true);assert.deepEqual(record.reloaded.inputs,[]);assert.equal(record.reloaded.lookups,0);
   record.reloaded.image=await shot(page,profile+'-reloaded.png');
   await page.tap('#food-control-key');await page.waitFor('foodAppHarness.sent.some(q=>q.operation==="foodCommand")','actual KEY touch');
   record.afterKey=await state(page);assert.deepEqual(record.afterKey.inputs,[{kind:'KEY',edge:null}]);
  }catch(error){record.error=error.message;record.failure=await state(page).catch(()=>null);await shot(page,profile+'-failure.png');throw error;}finally{await page.close();}
 }
 facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);assert.deepEqual(facts.errors,[]);
}finally{facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);await writeFile(resolve(out,'result.json'),JSON.stringify(facts,null,2));browser.close();await chrome.close();server.close();}
console.log(`Native Food recovery: ${facts.cases.length} profiles; ${out}`);
