// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const directory='/private/tmp/gamen-food-preview',out=process.env.GAMEN_FOOD_CHROME_OUT??'/private/tmp/gamen-food-chrome-regression',expectStale=process.env.GAMEN_FOOD_CHROME_EXPECT_STALE==='1';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,path=resolve(directory,'.'+(name==='/'?'/app.html':name));if(!path.startsWith(directory+sep))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const result={scope:'Actual native browser lifecycle on typed candidate-engine fixture transitions and exact original receipts, with preserved adapter closure history. Synthetic, not a live API/multiplayer/device/paint claim. All acceptance actions use enabled visible physical UI; no direct begin/confirm/command calls.',expectStale,provenance:JSON.parse(await readFile(resolve(directory,'food-review-provenance.json'),'utf8')),cases:[],errors:[]};
const shot=async(page,name)=>{const r=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(out,name),Buffer.from(r.data,'base64'));return name;};
const facts=page=>page.evaluate(`(()=>{const g=foodAppHarness.app.game.getModel(),f=foodAppHarness.app.food.getModel(),root=document.querySelector('#planet-root'),nav=root.querySelector('.planet-nav'),pass=document.querySelector('#planet-pass');
 const button=n=>{if(!n)return null;const r=n.getBoundingClientRect(),point={x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),id:1},hit=document.elementFromPoint(point.x,point.y),ancestors=[];let visible=r.width>0&&r.height>0;
 for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);if(p.inert)ancestors.push({tag:p.tagName,id:p.id,classes:p.className});if(s.display==='none'||['hidden','collapse'].includes(s.visibility)||Number(s.opacity)===0)visible=false;}
 return {id:n.id,disabled:n.disabled,ariaDisabled:n.getAttribute('aria-disabled'),visible,ancestorInert:ancestors,rect:{x:r.x,y:r.y,width:r.width,height:r.height},point,inViewport:point.x>=0&&point.y>=0&&point.x<innerWidth&&point.y<innerHeight,whole:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hitMatches:hit===n||n.contains(hit),hit:{tag:hit?.tagName??null,id:hit?.id??null,classes:typeof hit?.className==='string'?hit.className:null}};};
 return {mountId:root.id,model:{connection:g.connection,canPass:g.canPass,phase:g.phase,activeSeatId:g.activeSeatId,ownSeatId:g.ownSeatId,action:g.action?{type:g.action.type,step:g.action.step,canConfirm:g.action.canConfirm}:null},rootDataFoodChrome:root.dataset.foodChrome,
 foodSurfaceActiveRendered:root.dataset.foodChrome==='true',navInert:nav.inert,food:{step:f.view?.step?.kind??null,invitation:!!f.view?.invitation,participantTask:!!f.view?.participantTask,closures:f.view?.requestClosures.map(c=>({state:c.state,roundMatches:c.round===f.view.round,stepMatches:c.foodStepId===f.view.step?.stepId})),pending:f.pendingCount},
 pass:button(pass),confirm:button(document.querySelector('#planet-confirm')),close:button(document.querySelector('#planet-close')),settings:button(document.querySelector('#planet-top-settings')),
 activeFoodCards:[...document.querySelectorAll('.planet-food .fs-card,.planet-food .sheet')].filter(n=>n.getBoundingClientRect().height>0).length,
 ordinaryCommands:foodAppHarness.sent.filter(q=>q.operation==='command').map(q=>({type:q.request.command.type,commandId:q.request.commandId})),ownMeals:f.view?.ownMeals.map(m=>({round:m.round,result:m.result,dosesConsumed:m.dosesConsumed}))};})()`);
async function physical(page,selector){
 const f=await page.evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)return null;const r=n.getBoundingClientRect(),point={x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),id:1},hit=document.elementFromPoint(point.x,point.y);let visible=r.width>0&&r.height>0,inert=false;for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);inert||=p.inert;if(s.display==='none'||['hidden','collapse'].includes(s.visibility)||Number(s.opacity)===0)visible=false;}return {point,ready:visible&&!inert&&!n.disabled&&n.getAttribute('aria-disabled')!=='true'&&(hit===n||n.contains(hit))&&point.x>=0&&point.y>=0&&point.x<innerWidth&&point.y<innerHeight};})()`);
 if(!f?.ready)return false;await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[f.point]});await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return true;
}
try{
 for(const [width,height,text,safe]of[[390,844,1,'47,34'],[320,568,2,'20,0']])for(const motion of['normal','reduced'])for(const state of['JOINED','DECLINED','WITHDRAWN']){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${state.toLowerCase()}-${width}-${height}-text${text}-${motion}`,c={profile:prefix,state};result.cases.push(c);
  try{
   await page.goto(`${origin}/app.html?case=food-flow-04&chromeLifecycle=${state}&text=${text}&safe=${safe}&motion=${motion}`,'window.foodAppHarness?.ready');await page.evaluate('Promise.all([foodAppHarness.app.artReady,document.fonts.ready])');
   if(state==='JOINED'||state==='WITHDRAWN'){
    await page.evaluate('foodAppHarness.prepareChromeAction()');assert.equal(await physical(page,state==='JOINED'?'#food-action-join':'#food-action-withdraw'),true,'visible original request action');
    await page.waitFor('foodAppHarness.app.food.getModel().feedback?.status==="accepted"','exact engine request receipt');
   }else await page.evaluate('foodAppHarness.chromeStage("current")');
   await sleep(80);c.current=await facts(page);c.current.image=await shot(page,prefix+'-current.png');
   await page.evaluate('foodAppHarness.chromeStage("returned")');await sleep(80);c.returned=await facts(page);c.returned.image=await shot(page,prefix+'-returned.png');
   await page.evaluate('foodAppHarness.chromeStage("ownTurn")');await sleep(100);c.ownTurn=await facts(page);c.ownTurn.image=await shot(page,prefix+'-own-turn.png');
   assert.equal(c.ownTurn.model.canPass,true);assert.equal(c.ownTurn.food.step,null);assert.equal(c.ownTurn.food.invitation,false);assert.equal(c.ownTurn.food.participantTask,false);assert.equal(c.ownTurn.food.closures.length,1);assert.equal(c.ownTurn.food.closures[0].stepMatches,false);
   if(expectStale){
    assert.equal(c.ownTurn.rootDataFoodChrome,'true');assert.equal(c.ownTurn.navInert,true);assert.equal(c.ownTurn.activeFoodCards,0);assert.equal(await physical(page,'#planet-pass'),false,'stale overlay blocks physical Pass');assert.equal(c.ownTurn.ordinaryCommands.length,0);
   }else{
    assert.equal(c.ownTurn.rootDataFoodChrome,'false');assert.equal(c.ownTurn.navInert,false);assert.equal(c.ownTurn.pass.disabled,false);assert.equal(c.ownTurn.pass.hitMatches,true);assert.equal(c.ownTurn.pass.whole,true);
    assert.equal(await physical(page,'#planet-top-settings'),true,'ordinary settings');await page.waitFor('document.querySelector("#planet-close")','visible settings close');assert.equal(await physical(page,'#planet-close'),true,'ordinary menu return');await sleep(80);
    c.menuReturn=await facts(page);c.menuReturn.image=await shot(page,prefix+'-menu-return.png');assert.equal(c.menuReturn.navInert,false);assert.equal(c.menuReturn.rootDataFoodChrome,'false');
    await page.evaluate('foodAppHarness.prepareChromePass()');assert.equal(await physical(page,'#planet-pass'),true,'enabled physical Pass');await page.waitFor('document.querySelector("#planet-confirm")','visible Pass confirmation');
    c.confirmation=await facts(page);c.confirmation.image=await shot(page,prefix+'-confirmation.png');assert.equal(c.confirmation.model.action.type,'PASS_TURN');assert.equal(c.confirmation.confirm.hitMatches,true);assert.equal(c.confirmation.confirm.whole,true);
    assert.equal(await physical(page,'#planet-confirm'),true,'physical confirmation');await page.waitFor('foodAppHarness.sent.filter(q=>q.operation==="command").length===1','one exact ordinary command');await page.waitFor('foodAppHarness.app.food.getModel().view.ownMeals.at(-1)?.round===3','engine ordinary meal observation');
    c.after=await facts(page);assert.equal(c.after.ordinaryCommands.length,1);assert.equal(c.after.ordinaryCommands[0].type,'PASS_TURN');assert.equal(c.after.food.closures.length,1);if(state==='JOINED'){assert.equal(c.after.ownMeals.at(-1).result,'ATE');assert.equal(c.after.ownMeals.at(-1).dosesConsumed,1);}
   }
  }catch(error){c.error=error.message;c.failure=await facts(page).catch(()=>null);await shot(page,prefix+'-failure.png');throw error;}finally{await page.close();}
 }
}finally{result.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>({text:e.params.exceptionDetails?.text}));await writeFile(resolve(out,'result.json'),JSON.stringify(result,null,2));browser.close();await chrome.close();server.close();}
assert.deepEqual(result.errors,[]);console.log(`Native closure chrome: ${result.cases.length} profiles; expectStale=${expectStale}; ${out}`);
