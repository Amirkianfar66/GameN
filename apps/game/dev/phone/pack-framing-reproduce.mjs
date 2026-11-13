// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node apps/game/dev/phone/pack-framing-reproduce.mjs <clean 89935bd6 pack worktree> <output folder>');
const root=resolve(process.argv[2]),out=resolve(process.argv[3]);
if(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!=='89935bd6c0a37abfbe6da8130205d6d8a16e80e1'||execFileSync('git',['-C',root,'status','--porcelain'],{encoding:'utf8'}).trim())throw Error('The original T1 reproduction requires the clean exact 89935bd6 pack');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+sep))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint),page=await openPage(browser,{width:390,height:844,mobile:true,ownContext:true});let facts;
try{
 await page.goto(origin+'/design/phone-ui/prototype/index.html?s=room&room=room-a&safe=0','document.querySelector(".fig")');
 facts=await page.evaluate(`(async()=>{
 const {paintRoom,phoneFrame}=await import('/design/phone-ui/prototype/art.mjs'),{sceneOf,slotsOf}=await import('/apps/game/hosted/board-v2-drawing/slots-four.mjs');
 const chosen=[2,1,3,4,5],seats=chosen.map((seat,i)=>({seat,name:'Crew '+seat,character:'c'+seat,location:'Room A',slot:'A'+(i+1),health:'Healthy',jailed:false}));
 const host=document.createElement('div');host.id='exact-pack-fixture';host.style.cssText='position:fixed;left:2px;top:62px;width:386px;height:712px;overflow:hidden;background:#10141c;z-index:99999';document.body.append(host);
 paintRoom(host,{room:'room-a',roster:7,seats,width:386,height:712,cap:44,pad:8,fit:'phone',self:2,active:2,ambient:false});
 const figures=[...host.querySelectorAll('.fig[data-part=body]')].map((n,i)=>{const svg=n.querySelector('svg'),b=svg.getBBox(),m=svg.getScreenCTM(),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));return {seat:chosen[i],left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};});
 return {pack:'89935bd6c0a37abfbe6da8130205d6d8a16e80e1',scope:'Exact approved pack paintRoom with the same 7-player full-Room-A native reproduction fixture and 386x712 panel; camera/art reproduction only.',seats,frame:phoneFrame(sceneOf('room-a',7),{width:386,height:712,cap:44,pad:8},slotsOf('room-a',7)),figures};
 })()`);
 await sleep(500);await page.screenshot(out+'/pack-full-room-a-390x844.png',{viewport:true});
 await writeFile(out+'/facts.json',JSON.stringify(facts,null,2)+'\n');console.log(JSON.stringify(facts));
}finally{await page.close();browser.close();await chrome.close();await new Promise(done=>server.close(done));}
