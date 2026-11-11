// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
import {phoneLayouts} from '../../hosted/planet/phone-layout.mjs';
const directory=resolve(process.argv[2]),out=resolve(process.argv[3]),reduced=!process.argv.includes('--motion');await mkdir(out,{recursive:true});
const provenance=JSON.parse(await readFile(resolve(directory,'review-provenance.json'),'utf8'));
async function verify(){for(const e of provenance.candidate.modules)assert.equal(createHash('sha256').update(await readFile(resolve(provenance.candidate.root,e.path))).digest('hex'),e.sha256,e.path);}
await verify();await writeFile(resolve(out,'review-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,path=resolve(directory,'.'+(name==='/'?'/index.html':name));if(!path.startsWith(directory+sep))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Designer #229 canonical cold fallback, bounded reflow, pointer cancellation and authority/offer guards. Explicit synthetic authority, desktop Chromium only.',candidate:provenance.candidate.head,reduced,cases:[]};
async function picture(page,name){const {data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:false});await writeFile(resolve(out,name+'.jpg'),Buffer.from(data,'base64'));return name+'.jpg';}
async function geometry(page,count,mode){
 const data=await page.evaluate(`(()=>{const h=window.planetHarness,m=h.app.game.getModel();return {dark:m.dark,board:m.board,identities:m.identities,figures:document.querySelectorAll('.bv2-actor').length,view:document.querySelector('.planet-stage').dataset.view,names:/Crew [1-9]/.test(document.body.innerText),viewport:{width:innerWidth,height:innerHeight,top:parseFloat(document.querySelector('.planet-app').style.getPropertyValue('--phone-top')),nav:parseFloat(document.querySelector('.planet-app').style.getPropertyValue('--phone-nav'))},positions:h.value.publicView?.board.seats.map(s=>({location:s.location,slotId:s.slotId,eliminated:s.health==='Eliminated'}))??[],markers:[...document.querySelectorAll('.bv2-room:not([hidden]) [data-planet-night=marker]')].map(n=>({id:n.dataset.slot,left:parseFloat(n.style.left),top:parseFloat(n.style.top),side:parseFloat(n.style.width)}))};})()`);
 assert.equal(data.dark,true);assert.equal(data.board,null);assert.deepEqual(data.identities,[]);assert.equal(data.figures,0);assert.equal(data.names,false);
 const layout=phoneLayouts(data.viewport,count,mode==='lit'?data.positions:[],{frameAll:mode==='all'}),expected=data.view==='board'?Object.values(layout.boardPresses).flat():layout.roomPresses['room-a'];assert.deepEqual(data.markers.map(m=>m.id).sort(),expected.map(m=>m.id).sort());data.markers.sort((a,b)=>a.id.localeCompare(b.id));expected.sort((a,b)=>a.id.localeCompare(b.id));
 for(const [i,m]of data.markers.entries())for(const key of ['left','top','side'])assert.ok(Math.abs(m[key]-expected[i][key])<.001,JSON.stringify({m,expected:expected[i],key}));
 return {view:data.view,viewport:data.viewport,markers:data.markers};
}
try{
 for(const count of [7,8,9])for(const [width,height,text]of [[390,844,1],[320,568,2]])for(const [name,tuple,extra,mode]of [['public','blackout','','lit'],['missing','blackout','&framing=missing','all'],['mismatch','blackout','&framing=mismatch','all'],['legacy','phone','','all']]){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${count}-${width}-${text*100}-${name}`;
  try{
   await page.media({'prefers-reduced-motion':reduced?'reduce':'no-preference'});
   await page.goto(`${origin}/?scenario=blackout&count=${count}&tuple=${tuple}&sparse=1&picked=A3${extra}`,'window.planetHarness');
   await page.evaluate(`document.documentElement.style.fontSize='${text*100}%';document.dispatchEvent(new CustomEvent('mothership:preferences-change'));window.planetHarness.candidateReady`);
   await page.waitFor("window.planetHarness.app.game.getModel().dark&&document.querySelector('.bv2-room:not([hidden]) [data-planet-night=marker]')",'cold geometry');
   const cold=await geometry(page,count,mode);await page.tap('#planet-nav-actions');await page.tap('#planet-action-SELECT_BLACKOUT_SLOT');
   assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().privateArea.blackoutTargeting.selectedSlotId'),'A3');
   const initial=count===9?await picture(page,prefix+'-cold'):null;
   const point=await page.evaluate("(()=>{const r=document.querySelector('#planet-slot-A1').getBoundingClientRect();window.__pointerCancelled=0;document.addEventListener('pointercancel',()=>window.__pointerCancelled++,true);return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
   await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   const changed=width===390?{width:320,height:568}:{width:390,height:844};await page.send('Emulation.setDeviceMetricsOverride',{...changed,deviceScaleFactor:1,mobile:true});await sleep(160);
   await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(100);
   assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().action.step'),'slots','No position may be chosen by the old gesture');assert.ok(await page.evaluate('window.__pointerCancelled>0'));
   // Replay duplicate delayed clicks from the cancelled gesture, explicitly synthetic.
   await page.evaluate("(()=>{const n=document.querySelector('#planet-slot-A1');for(let i=0;i<2;i++)n.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));})()");
   assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().action.step'),'slots','Every delayed click stays cancelled until a new pointer gesture');
   const resized=await geometry(page,count,mode);await page.tap('#planet-nav-board');const board=await geometry(page,count,mode);assert.equal(board.view,'board');
   await page.evaluate(`document.documentElement.style.fontSize='${text===1?200:100}%';document.dispatchEvent(new CustomEvent('mothership:preferences-change'))`);await sleep(100);const boardReflow=await geometry(page,count,mode);
   await page.tap('#planet-nav-board');const roomAgain=await geometry(page,count,mode);assert.equal(roomAgain.view,'room');await page.tap('#planet-slot-A2');assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().action.step'),'confirm');
   const choice=await page.evaluate('JSON.stringify(window.planetHarness.app.game.getModel().action)');
   await page.evaluate(`document.documentElement.style.fontSize='${text*100}%';document.dispatchEvent(new CustomEvent('mothership:preferences-change'))`);await sleep(120);
   assert.equal(await page.evaluate('JSON.stringify(window.planetHarness.app.game.getModel().action)'),choice);assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().privateArea.blackoutTargeting.selectedSlotId'),'A3');
   const textReflow=await geometry(page,count,mode),reflowCapture=count===9?await picture(page,prefix+'-reflow'):null;
   const confirmPoint=await page.evaluate("(()=>{const r=document.querySelector('#planet-confirm').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
   await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[confirmPoint]});await page.evaluate("window.dispatchEvent(new Event('blur'))");await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await page.evaluate('window.planetHarness.app.game?.getModel().action??null'),null);
   assert.equal(await page.evaluate("document.querySelectorAll('.bv2-slot-target').length"),0);
   await page.evaluate("window.dispatchEvent(new Event('focus'));window.planetHarness.app.session.refresh()");await page.waitFor('window.planetHarness.app.game?.getModel().phase?.trusted&&window.planetHarness.app.game.getModel().dark','fresh authorized game after blur');
   await page.tap('#planet-nav-actions');assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().privateArea.blackoutTargeting.selectedSlotId'),'A3');await page.tap('#planet-action-SELECT_BLACKOUT_SLOT');await page.tap('#planet-slot-A2');assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().action.step'),'confirm');
   await page.evaluate("window.planetHarness.setUid('revoked');window.planetHarness.app.session.refresh()");await page.waitFor("!document.querySelector('.bv2-slot-target')",'revoked targeting removed');
   assert.equal(await page.evaluate('window.planetHarness.app.game?.getModel().action??null'),null);
   assert.equal(await page.evaluate("window.planetHarness.requests.filter(r=>r.operation==='command').length"),0);
   facts.cases.push({name,count,width,height,text,mode,cold,resized,board,boardReflow,roomAgain,textReflow,initial,reflowCapture,pointerCancelled:true,localChoicePreserved:true,acceptedSlotPreserved:true,noCommand:true,revokedTargetsRemoved:true});
  }catch(error){facts.failure={case:prefix,error:error.stack};await picture(page,prefix+'-failure');throw error;}finally{await page.close();}
 }
}finally{await verify();facts.sourcesUnchanged=true;facts.runtimeErrors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text);await writeFile(resolve(out,'facts.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();await new Promise(done=>server.close(done));}
assert.deepEqual(facts.runtimeErrors,[]);console.log(JSON.stringify({cases:facts.cases.length,out}));
