// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';

const directory='/private/tmp/gamen-food-preview',out=resolve(process.argv[2]??'/private/tmp/gamen-food-component-smoke');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(directory+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Native Food controller/components on accepted synthetic wire examples; desktop Chromium only. Preliminary component QA, not complete comparison, API/runtime tuple/art admission, physical-device or Designer acceptance.',provenance:JSON.parse(await readFile(resolve(directory,'food-review-provenance.json'),'utf8')),browser:await browser.send('Browser.getVersion'),cases:[],errors:[]};
const repo=resolve(new URL('../../../../',import.meta.url).pathname);
async function verifySources(){for(const entry of facts.provenance.modules){const bytes=await readFile(resolve(repo,entry.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'Native source changed after build: '+entry.path);}}
const capture=async(page,file)=>{const {data}=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,file),Buffer.from(data,'base64'));return file;};
const layout=page=>page.evaluate(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},frame=document.querySelector('.planet-food'),problems=[];
 for(const node of frame.querySelectorAll('.fs-ctl:not([hidden])')){const r=node.getBoundingClientRect();if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)problems.push(node.id+' leaves viewport');for(const t of node.querySelectorAll('.fs-label,.fs-sub'))if(t.scrollWidth>t.clientWidth+1)problems.push(node.id+' clips words');}
 for(const card of frame.querySelectorAll('.fs-card')){const r=card.getBoundingClientRect();if(r.bottom>innerHeight+.5)problems.push('card leaves viewport');if(card.classList.contains('fs-brief')&&card.scrollHeight>card.clientHeight+1)problems.push('briefing scrolls');}
 return {width:innerWidth,height:innerHeight,rootWidth:document.documentElement.scrollWidth,header:rect(frame.querySelector('.tb')),controls:[...frame.querySelectorAll('.fs-ctl:not([hidden])')].map(n=>({id:n.id,rect:rect(n),label:n.getAttribute('aria-label')})),problems};})()`);
try{
 await verifySources();
 for(const [width,height,text,safe]of [[390,844,1,'47,34'],[320,568,2,'20,0']])for(const motion of ['normal','reduced']){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${width}-${height}-text${text}-${motion}`;
  try{
   await page.goto(`${origin}/?text=${text}&safe=${safe}&motion=${motion}`,'window.foodHarness');await sleep(300);
   const initial=await layout(page);assert.deepEqual(initial.problems,[]);assert.equal(initial.rootWidth,width);
   const initialImage=await capture(page,prefix+'-hold.png');
   // Public names are text, even when they contain markup-significant characters.
   await page.evaluate(`window.foodHarness.names(${JSON.stringify('<>&"\'')})`);
   const escaped=await page.evaluate(`(()=>{const frame=document.querySelector('.planet-food');return {text:frame.querySelector('.tb-name').textContent,tags:[...frame.querySelectorAll('.fs-art .tag')].map(n=>n.textContent),injected:frame.querySelectorAll('script,iframe,object').length};})()`);
   assert.ok(escaped.text.includes('<>&"\''));assert.ok(escaped.tags.some(s=>s.includes('<>&"\'')));assert.equal(escaped.injected,0);
   await page.evaluate("window.foodHarness.setLost(true);window.heldFoodButton=document.querySelector('#food-control-hold')");
   const point=await page.evaluate("(()=>{const r=window.heldFoodButton.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
   await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await page.waitFor('window.foodHarness.sent.length===1','DOWN sent');
   await page.evaluate("window.foodHarness.names('Other words');window.foodHarness.renderer.refresh()");
   assert.equal(await page.evaluate("window.heldFoodButton===document.querySelector('#food-control-hold')"),true);
   await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitFor('window.foodHarness.sent.length===2','UP despite pending DOWN');
   const causal=await page.evaluate('window.foodHarness.sent');assert.equal(causal[0].command.input.edge,'DOWN');assert.equal(causal[1].command.input.edge,'UP');assert.equal(causal[1].command.input.gestureSequence,causal[0].command.input.gestureSequence);assert.notEqual(causal[1].commandId,causal[0].commandId);
   await page.waitFor("window.foodHarness.controller.getModel().feedback?.status==='unknown'",'unknown let-go answer');
   const inputImage=await capture(page,prefix+'-unknown-let-go.png');
   await page.goto(`${origin}/?text=${text}&safe=${safe}&motion=${motion}&brief=1`,'window.foodHarness');
   const brief=await layout(page);assert.deepEqual(brief.problems,[]);assert.equal(await page.evaluate("document.querySelector('.fs-controls').inert"),true);const briefImage=await capture(page,prefix+'-brief.png');
   facts.cases.push({profile:prefix,initial,brief,markupNamesAreText:escaped,causalRelease:causal.map(q=>({commandId:q.commandId,phaseId:q.phaseId,command:q.command})),captures:{initialImage,inputImage,briefImage}});
  }finally{await page.close();}
 }
 facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Log.entryAdded'&&e.params.entry.level==='error').map(e=>e.params);
 assert.deepEqual(facts.errors,[]);
 await verifySources();facts.sourcesVerifiedBeforeAndAfter=true;
}finally{await writeFile(resolve(out,'result.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();server.close();}
console.log(`Food component smoke: ${facts.cases.length} profiles; evidence ${out}`);
