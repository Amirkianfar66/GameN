// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Inspect the drawn reference in its own page; never import its Task model into
// a native module or use it as the authority for native packet outcomes.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const repo=resolve(fileURLToPath(new URL('../../../../',import.meta.url))),preview='/private/tmp/gamen-food-preview',out='/private/tmp/gamen-food-layout-audit';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname,root=path.startsWith('/design/')||path.startsWith('/apps/game/hosted/')?repo:preview,target=resolve(root,'.'+(path==='/'?'/index.html':path));if(!target.startsWith(root+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[extname(target)]??'application/octet-stream');res.end(await readFile(target));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint),facts={scope:'Read-only source/native layout audit; synthetic desktop Chromium, text200%,320x568; no layout changes or visual approval',cases:[]};
const measure=page=>page.evaluate(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},sub=document.querySelector('.tb-sub'),hint=document.querySelector('.fs-hint'),view=document.querySelector('.fs-view'),box=view.getBoundingClientRect();return {topSub:{text:sub.textContent,rect:rect(sub),position:getComputedStyle(sub).position,clip:getComputedStyle(sub).clipPath},hint:{text:hint.textContent,clientWidth:hint.clientWidth,scrollWidth:hint.scrollWidth},tags:[...document.querySelectorAll('.fs-art .tag')].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,rect:rect(n),whole:r.left>=box.left-.5&&r.right<=box.right+.5&&r.bottom<=box.bottom+.5}})};})()`);
try{
 const native=await openPage(browser,{width:320,height:568,mobile:true,ownContext:true});
 await native.goto(`${origin}/?packet=task-panel-initial&text=2&safe=20,0`,'window.foodHarness');
 await native.evaluate(`(()=>{const h=window.foodHarness,v=structuredClone(h.value),t=v.participantTask;v.viewRevision++;t.panel.locked=false;t.panel.stop=5;t.panel.direction=1;t.panel.anchorAt=v.serverNowMs-65;t.panel.blade.state='RAISED';t.crate.state='HELD';t.crate.holder='WINCH';t.crate.height=1;t.people.find(p=>p.seatId===t.winchSeatId).online=false;v.offers=[{type:'TASK_PRESS',taskId:t.taskId,controlSessionId:t.controlSessionId,controlRevision:t.controlRevision,inputs:['PANEL_LOCK'],crateId:t.crate.id}];h.names('WWWWWWWWWWWW');return h.replace(v);})()`);await sleep(200);
 facts.cases.push({name:'native-panel-long-name-offline-cab-warning',...(await measure(native))});let shot=await native.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,'native-panel-long-name.png'),Buffer.from(shot.data,'base64'));await native.close();
 const map=JSON.parse(await readFile(resolve(repo,'docs/frontend/food-supply-comparison-map.json'),'utf8')),query=map.cases.find(c=>c.id==='food-large-07').reference.query;
 const reference=await openPage(browser,{width:320,height:568,mobile:true,ownContext:true});await reference.goto(`${origin}/design/food-supply/phone.html?${query}&text=2&safe=20,0`,'window.__phoneReady');await sleep(150);
 facts.cases.push({name:'exact-designer-food-large-07-offline-plus-cab-warning',referenceQuery:query,...(await measure(reference))});shot=await reference.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,'reference-large-07.png'),Buffer.from(shot.data,'base64'));await reference.close();
}finally{await writeFile(resolve(out,'result.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();server.close();}
console.log(JSON.stringify(facts,null,2));
