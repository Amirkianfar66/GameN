globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const out=resolve(process.argv[2]??'docs/frontend/evidence/planet-consumer-fixes');await mkdir(out,{recursive:true});
const directory=resolve('/private/tmp/gamen-planet-preview');
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(directory+sep))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Synthetic production-consumer checks in desktop Chromium phone emulation; no hosted or device acceptance.',generatedAt:new Date().toISOString(),browser:await browser.send('Browser.getVersion'),cases:[]};
const picture=async(page,name)=>{await page.screenshot(resolve(out,`${name}.png`));return `${name}.png`;};
try{
 for(const [width,height]of [[320,568],[390,844]])for(const reduced of [false,true]){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${width}-${height}-${reduced?'reduced':'normal'}`;await page.media({'prefers-reduced-motion':reduced?'reduce':'no-preference'});
  await page.goto(`${origin}/?scenario=join`,'window.planetHarness');
  const invalid=await page.evaluate(`(()=>{const n=document.querySelector('#planet-display-name');n.value='x'.repeat(13);n.dispatchEvent(new Event('input'));return {valid:n.checkValidity(),hint:document.querySelector('#planet-name-hint').textContent};})()`);assert.equal(invalid.valid,false);assert.match(invalid.hint,/12/);
  const unicode=await page.evaluate(`(()=>{const n=document.querySelector('#planet-display-name');n.value='😀'.repeat(12);n.dispatchEvent(new Event('input'));document.querySelector('#planet-room-code').value='PLANET';document.querySelector('#planet-join-kind').value='display';return {valid:n.checkValidity(),count:[...n.value].length};})()`);assert.equal(unicode.valid,true);assert.equal(unicode.count,12);
  await page.evaluate("document.querySelector('#planet-join').scrollIntoView({block:'center'})");await page.tap('#planet-join');await page.waitFor("document.querySelector('#planet-check-admission')",'pending request waiting UI');
  const pending=await page.evaluate(`(()=>{const h=window.planetHarness,m=h.app.session.getModel();return {pending:m.pendingAdmission,status:m.status,members:m.members.length,gameMounted:!!h.app.game,text:document.body.innerText};})()`);assert.equal(pending.pending.kind,'display');assert.equal(pending.status,null);assert.equal(pending.members,0);assert.equal(pending.gameMounted,false);assert.match(pending.text,/Waiting for the server to confirm admission/);
  const pendingImage=await picture(page,`${prefix}-pending-display`);await page.goto(`${origin}/?scenario=join`,'window.planetHarness');assert.equal(await page.evaluate("window.planetHarness.app.session.getModel().pendingAdmission.kind"),'display');
  await page.evaluate("window.planetHarness.admission('seatless')");assert.equal(await page.evaluate('window.planetHarness.app.game'),null);assert.equal(await page.evaluate('window.planetHarness.app.session.getModel().pendingAdmission.kind'),'display');
  facts.cases.push({name:`${prefix}-unicode-and-pending-recovery`,passed:true,invalid,unicode,pending,seatlessSnapshotDoesNotApprove:true,screenshot:pendingImage});
  await page.evaluate("window.planetHarness.admission('player')");await page.waitFor("window.planetHarness.app.game?.getModel().connection==='live'",'authoritative assigned player seat');assert.equal(await page.evaluate('window.planetHarness.app.session.getModel().pendingAdmission'),null);assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().ownSeatId'),'seat-6');
  facts.cases.push({name:`${prefix}-assigned-player-membership`,passed:true,screenshot:await picture(page,`${prefix}-assigned-player`)});
  await page.goto(`${origin}/?scenario=navigation`,'window.planetHarness');await page.evaluate("window.planetHarness.app.game.openPanel('navigation')");assert.equal(await page.evaluate("!!document.querySelector('#planet-action-CONFIRM_NAVIGATION')"),true);
  await page.evaluate(`(()=>{const h=window.planetHarness,v=structuredClone(h.value);v.playerView.viewRevision++;v.playerView.offers=[];v.publicView=h.publicPlanet(v.playerView);return h.replace(v);})()`);assert.equal(await page.evaluate("!!document.querySelector('#planet-action-CONFIRM_NAVIGATION')"),false);await page.press('Escape');
  facts.cases.push({name:`${prefix}-acknowledgement-legal-offers`,passed:true,screenshot:await picture(page,`${prefix}-acknowledgement-closed`)});
  await page.goto(`${origin}/?scenario=promises`,'window.planetHarness');await page.evaluate("window.planetHarness.app.game.openPanel('promises')");const terms=await page.evaluate("document.querySelector('.planet-promise').textContent");assert.match(terms,/Player 1 will be in Room A/);assert.ok(!terms.includes('both'));
  await page.evaluate("document.querySelector('.planet-promise strong').scrollIntoView({block:'center'})");await sleep(60);facts.cases.push({name:`${prefix}-giver-only-promise`,passed:true,terms,screenshot:await picture(page,`${prefix}-giver-only-promise`)});await page.close();
 }
 facts.runtimeErrors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text);assert.deepEqual(facts.runtimeErrors,[]);
}finally{await writeFile(resolve(out,'facts.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();await new Promise(done=>server.close(done));}
console.log(JSON.stringify({passed:facts.cases.length,screenshots:facts.cases.length,output:out}));
