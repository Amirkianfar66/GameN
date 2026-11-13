// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const directory='/private/tmp/gamen-food-preview',out='/private/tmp/gamen-food-app-smoke';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,path=resolve(directory,'.'+(name==='/'?'/app.html':name));if(!path.startsWith(directory+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Full native app on synthetic candidate-engine snapshots. Desktop Chromium only; no API/emulator, physical-device or Designer acceptance.',cases:[],errors:[]};
const shot=async(page,name)=>{const r=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name),Buffer.from(r.data,'base64'));};
try{
 for(const [width,height,text,safe]of [[390,844,1,'47,34'],[320,568,2,'20,0']])for(const motion of ['normal','reduced']){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${width}-${height}-text${text}-${motion}`;
  try{
   await page.goto(`${origin}/app.html?case=food-winch-02&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');await sleep(250);
   const ready=await page.evaluate(`(()=>{const g=foodAppHarness.app.game.getModel(),f=foodAppHarness.app.food.getModel(),node=document.querySelector('#food-control-hold');return {connection:g.connection,seats:g.board?.seats.length,identities:g.identities.length,phase:g.phase.kind,canHold:f.canHold,button:!!node,crew:document.querySelector('.planet-app').dataset.crewArt,hiddenNativeBars:[...document.querySelectorAll('.planet-header,.planet-nav')].every(n=>getComputedStyle(n).display==='none'),whole:node?node.getBoundingClientRect().bottom<=innerHeight:false};})()`);
   assert.equal(ready.connection,'live');assert.equal(ready.seats,9);assert.equal(ready.identities,9);assert.equal(ready.phase,'FOOD_SUPPLY');assert.equal(ready.crew,'crew-drawing-1.0.0');assert.equal(ready.canHold,true);assert.equal(ready.button,true);assert.equal(ready.hiddenNativeBars,true);assert.equal(ready.whole,true);
   await shot(page,prefix+'-task.png');
   // Keyboard repeat and assistive activation use the same one Hold control.
   await page.evaluate('document.querySelector("#food-control-hold").focus()');
   await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,text:' '});
   await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,text:' ',autoRepeat:true});
   await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
   await page.waitFor('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").length===2','one keyboard DOWN and UP');
   await page.evaluate('document.querySelector("#food-control-hold").click()');
   await page.waitFor('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").length===3','assistive DOWN');
   await page.evaluate('document.querySelector("#food-control-hold").click()');
   await page.waitFor('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").length===4','assistive UP');
   const keyboardAssistive=await page.evaluate('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").map(q=>q.request.command.input.edge)');assert.deepEqual(keyboardAssistive,['DOWN','UP','DOWN','UP']);
   await page.goto(`${origin}/app.html?case=food-winch-02&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');await sleep(80);
   // Actual browser pointer down, redraw, blur and visibility-only return.
   await page.evaluate('foodAppHarness.setHoldCommands(true);window.originalHold=document.querySelector("#food-control-hold")');
   const point=await page.evaluate('(()=>{const r=originalHold.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
   await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await page.waitFor('foodAppHarness.sent.some(q=>q.operation==="foodCommand")','Food DOWN');
   await page.evaluate('dispatchEvent(new Event("blur"))');await page.waitFor('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").length===2','UP before conceal');
   assert.equal(await page.evaluate('foodAppHarness.app.food.getModel().view===null'),true);
   assert.equal(await page.evaluate('document.querySelectorAll(".planet-food .fs-art,.planet-food .fs-card").length'),0);
   await page.evaluate('document.dispatchEvent(new Event("visibilitychange"))');await page.waitFor('foodAppHarness.app.food.getModel().fresh','visibility-only resume');
   const inputs=await page.evaluate('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").map(q=>q.request.command.input)'),causal=inputs.filter(x=>x.kind==='HOLD');assert.deepEqual(causal.map(x=>x.edge),['DOWN','UP']);assert.equal(causal[0].gestureSequence,causal[1].gestureSequence);assert.ok(inputs.filter(x=>x.kind!=='HOLD').every(x=>x.kind==='HOLD_RECOVER_OFF'));
   await page.goto(`${origin}/app.html?case=food-flow-01&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');await sleep(150);
   assert.match(await page.evaluate('document.querySelector(".planet-food .sheet").textContent'),/Start a Task/);await shot(page,prefix+'-tasks.png');
   await page.evaluate('document.querySelector("#food-settings")?.click()');
   await page.waitFor('foodAppHarness.app.game.getModel().panel==="settings"','native settings');
   await page.waitFor('document.querySelector(".planet-food.ph").hidden','Food sheet yields to settings');
   assert.equal(await page.evaluate('document.querySelector(".planet-food.ph").hidden'),true);
   await page.evaluate('document.querySelector("#planet-close").click()');await page.waitFor('!document.querySelector(".planet-food.ph").hidden','return from settings');
   await page.goto(`${origin}/app.html?case=food-winch-02&abort=1&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');
   await page.waitFor('document.querySelector("#planet-terminal-food-receipts")','Food-only aborted recovery');
   assert.equal(await page.evaluate('foodAppHarness.app.food.getModel().pendingCount'),1);
   await page.evaluate('document.querySelector("#planet-terminal-food-receipts").click()');await page.waitFor('document.querySelector("#planet-return-lobby")','settled abort return');
   const recovery=await page.evaluate('({lookups:foodAppHarness.lookups,commands:foodAppHarness.sent.filter(q=>q.operation==="foodCommand")})');assert.equal(recovery.lookups.length,1);assert.equal(recovery.commands.length,0);await shot(page,prefix+'-aborted-recovered.png');
   await page.goto(`${origin}/app.html?case=food-panel-03&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');
   await page.evaluate('document.querySelector("#food-panel-main").focus()');
   await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
   await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,autoRepeat:true});
   await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
   const panel=await page.evaluate('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").map(q=>q.request.command.input.kind)');assert.deepEqual(panel,['PANEL_RELEASE']);
   await page.goto(`${origin}/app.html?case=food-states-15&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');await sleep(180);
   const waiting=await page.evaluate('(()=>{const n=document.querySelector("#food-control-hold"),m=foodAppHarness.app.food.getModel(),s=getComputedStyle(n);return {label:n.getAttribute("aria-label"),pressed:n.getAttribute("aria-pressed"),pending:n.hasAttribute("data-pending"),glow:n.hasAttribute("data-next"),outline:s.outlineStyle,offset:s.outlineOffset,transform:s.transform,physical:m.physicalHolding,crate:m.view.participantTask.crate};})()');
   assert.equal(waiting.label,'Hold. Waiting for the hook.');assert.equal(waiting.pressed,'true');assert.equal(waiting.pending,true);assert.equal(waiting.glow,false);assert.equal(waiting.outline,'dashed');assert.equal(waiting.offset,'-9px');assert.equal(waiting.physical,true);assert.equal(waiting.crate.state,'INTAKE');assert.equal(waiting.crate.motion,null);if(motion==='reduced')assert.equal(waiting.transform,'none');
   await page.evaluate('foodAppHarness.prepareEarlyUp();document.querySelector("#food-control-hold").click()');
   await page.waitFor('!foodAppHarness.app.food.getModel().physicalHolding&&foodAppHarness.app.food.getModel().pendingCount===0&&!foodAppHarness.app.food.getModel().view.participantTask.ownGesture.pendingIntent','original pending UP settles without lift');
   const pendingOff=await page.evaluate('({crate:foodAppHarness.app.food.getModel().view.participantTask.crate,edges:foodAppHarness.sent.filter(q=>q.operation==="foodCommand").map(q=>q.request.command.input.edge),pressed:document.querySelector("#food-control-hold").getAttribute("aria-pressed")})');
   assert.deepEqual(pendingOff.edges,['DOWN','UP']);assert.deepEqual(pendingOff.crate,waiting.crate);assert.equal(pendingOff.pressed,'false');
   facts.cases.push({profile:prefix,ready,keyboardAssistive,causal,panelKeyboardNoRepeat:panel,abortedRecovery:recovery,pendingHold:{waiting,afterOriginalUp:pendingOff}});
  }catch(error){facts.failure={message:error.message,state:await page.evaluate('({game:foodAppHarness?.app.game?.getModel(),food:foodAppHarness?.app.food?.getModel(),session:foodAppHarness?.app.session.getModel(),body:document.body.innerText})').catch(()=>null)};await shot(page,prefix+'-failure.png');throw error;}finally{await page.close();}
 }
 facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);assert.deepEqual(facts.errors,[]);
}finally{facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);await writeFile(resolve(out,'result.json'),JSON.stringify(facts,null,2));browser.close();await chrome.close();server.close();}
console.log(`Native Food app smoke: ${facts.cases.length} profiles; ${out}`);
