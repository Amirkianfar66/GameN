// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Recheck the six existing #223 part ids touched by Food, at both owner sizes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {PARTS} from '../../../../design/tools/lib/phone-ui-native-parts.mjs';
import {designAddress} from '../../../../design/tools/phone-ui-native-compare.mjs';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const root=resolve(new URL('../../../../',import.meta.url).pathname),build='/private/tmp/gamen-food-ordinary-review',out='/private/tmp/gamen-food-ordinary-comparison';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname,base=path.startsWith('/reference/')?root:build,name=path.startsWith('/reference/')?path.slice(10):path,target=resolve(base,'.'+name);if(!target.startsWith(base+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp','.json':'application/json'})[extname(target)]??'application/octet-stream');res.end(await readFile(target));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint),report={scope:'Existing #223 parts on predecessor fixtures after Food wiring. Both required sizes. Historical baseline differences remain; this is a regression capture, not Designer acceptance or adoption of #227/#228/#230.',provenance:JSON.parse(await readFile(resolve(build,'review-provenance.json'),'utf8')),parts:[],errors:[]};
const capture=async(page,name)=>{const r=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name),Buffer.from(r.data,'base64'));return name;};
try{
 for(const [width,height,text,size]of [[390,844,1,'390x844'],[320,568,2,'320x568']])for(const id of ['actions','panels','board','round-order','reconnecting','largest-text']){
  const part=PARTS.find(p=>p.id===id),native=await openPage(browser,{width,height,mobile:true,ownContext:true}),reference=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${id}-${width}-${height}-text${text}`;
  try{
   const params=new URLSearchParams(part.build.params??'');params.set('scenario',part.build.scenario);params.set('count','9');params.set('tuple','phone');
   await native.goto(`${origin}/index.html?${params}`,'window.planetHarness');await native.evaluate('window.planetHarness.candidateReady');
   await native.evaluate(`document.documentElement.style.fontSize='${text*100}%';document.dispatchEvent(new CustomEvent('mothership:preferences-change'))`);await sleep(part.build.settle??1800);
   for(const [op,a,b]of part.build.steps??[]){
    if(op==='wait')await sleep(a);
    else if(op==='eval')await native.evaluate(a);
    else if(op==='tap')await native.tap(a);
    else if(op==='tapText'){
     const selector=await native.evaluate(`(()=>{const re=new RegExp(${JSON.stringify(a)},'i'),node=[...document.querySelectorAll('button')].find(n=>re.test(n.textContent)&&n.getBoundingClientRect().height>0);if(!node)return null;node.id='ordinary-review-target';return '#'+node.id})()`);assert.ok(selector,id+' missing visible text target');await native.tap(selector);
    }else throw Error('Unimplemented part step '+op);
   }
   await reference.goto(`${origin}/reference${designAddress({...part,view:{size,text}})}`,'window.__phoneReady');await reference.evaluate('document.fonts.ready');await sleep(60);
   report.parts.push({id,profile:{width,height,text},native:await capture(native,prefix+'-native.png'),reference:await capture(reference,prefix+'-reference.png'),connection:await native.evaluate('planetHarness.app.game?.getModel().connection'),baseline:part.was});
  }finally{await native.close();await reference.close();}
 }
 report.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);assert.deepEqual(report.errors,[]);
}finally{await writeFile(resolve(out,'result.json'),JSON.stringify(report,null,2));browser.close();await chrome.close();server.close();}
console.log(`Existing Food-affected parts: ${report.parts.length} pairs; ${out}`);
