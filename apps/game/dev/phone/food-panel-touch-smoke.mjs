// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage} from '../capture/browser.mjs';
import {touchRenderedPanel} from './food-connected-panel.mjs';
const directory='/private/tmp/gamen-food-preview',out=process.env.GAMEN_FOOD_PANEL_TOUCH_OUT??'/private/tmp/gamen-food-panel-touch-smoke';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,path=resolve(directory,'.'+(name==='/'?'/app.html':name));if(!path.startsWith(directory+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Synthetic full native app, actual rendered control/hit guard and physical PANEL touch. No API, gameplay-history, device or new visual approval claim.',cases:[],errors:[]};
try{
 for(const [width,height,text,safe]of[[390,844,1,'47,34'],[320,568,2,'20,0']])for(const motion of['normal','reduced']){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),record={profile:`${width}-${height}-text${text}-${motion}`};facts.cases.push(record);
  try{
   await page.goto(`${origin}/app.html?case=food-panel-03&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');await page.evaluate('Promise.all([foodAppHarness.app.artReady,document.fonts.ready])');
   const expected={id:'food-panel-main',action:'release',kind:'PANEL_RELEASE'};
   record.touch=await touchRenderedPanel(page,expected,{appGlobal:'foodAppHarness'});assert.equal(record.touch.acted,true);
   await page.waitFor('foodAppHarness.app.food.getModel().feedback?.status==="accepted"','original synthetic PANEL receipt');
   const inputs=await page.evaluate('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").map(q=>q.request.command.input.kind)');assert.deepEqual(inputs,['PANEL_RELEASE']);record.inputs=inputs;
   record.repeat=await touchRenderedPanel(page,expected,{appGlobal:'foodAppHarness'});assert.equal(record.repeat.acted,false,'accepted original cannot be repeated before a new authoritative view');
   assert.equal(await page.evaluate('foodAppHarness.sent.filter(q=>q.operation==="foodCommand").length'),1);
  }catch(error){record.error=error.message;throw error;}finally{await page.close();}
 }
}finally{facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>({text:e.params.exceptionDetails?.text}));await writeFile(resolve(out,'result.json'),JSON.stringify(facts,null,2));browser.close();await chrome.close();server.close();}
assert.deepEqual(facts.errors,[]);console.log(`Native rendered PANEL touch: ${facts.cases.length} profiles; ${out}`);
