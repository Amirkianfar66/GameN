// mothership:dev-only
// Actual production DOM over strict synthetic 1.11 audience views; native service evidence is separate.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchBrowser,connect,openPage,sleep} from './capture/browser.mjs';
const out='/private/tmp/gamen-hospital-four-browser';await mkdir(out,{recursive:true});
const handle=await launchBrowser(),browser=await connect(handle.endpoint),records=[];
const base='http://127.0.0.1:5297/?scenario=board-v2&profile=four&hack-stage=idle';
const measurements=`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===n}};const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return {scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),actors:[...document.querySelectorAll('.bv2-actor')].map(n=>({seat:n.dataset.seat,slot:n.dataset.slot})),films:[...document.querySelectorAll('[data-film-part]')].map(n=>n.dataset.filmPart),targets:[...document.querySelectorAll('.bv2-seat-target,.bv2-offboard-cards button')].map(n=>({id:n.id,value:n.dataset.value,...rect(n)})),text:document.body.innerText,clone:document.querySelector('.bv2-clone-card')?.innerText??null,private:window.__simulation.model().match.privateArea?.open,loaded:document.documentElement.dataset.art}})()`;
async function record(p,name){const value=await p.evaluate(measurements);records.push({name,...value});assert.deepEqual(value.duplicateIds,[],`${name}: duplicate IDs`);await p.screenshot(out+'/'+name+'.png',{viewport:true});return value;}
try{
 for(const count of [7,8,9])for(const width of [320,390]){
  const p=await openPage(browser,{width,height:width===320?568:844,mobile:true,ownContext:true});
  try{
   await p.goto(`${base}&roster=${count}`,'document.querySelector("[data-renderer=board-v2]")',15000);await p.foreground();
   const resting=await record(p,`r${count}-${width}-critical`);assert.equal(resting.scroll.height,width===320?568:844);assert.equal(resting.loaded.split(' ').length,9);assert.equal(await p.evaluate('document.querySelectorAll("[data-room=hospital] [data-art-layer]").length'),7);
   await p.tap('#ms-phone-actions');await p.tap('#ms-action-open-code');
   const targets=await record(p,`r${count}-${width}-targets`);assert.equal(targets.targets.length,count);assert.ok(targets.targets.every(r=>r.width>=44&&r.height>=44&&r.hit));
   // Newer committed injury/overflow in one revision; original seat identities remain.
   await p.evaluate(`window.__simulation.batch({'seat-1':{location:null,slotId:null,health:'Eliminated',medical:null,jailed:false},'seat-2':{location:'Room A',slotId:'A3',health:'Healthy',medical:null}},[{type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-1'},{type:'MEDICAL_OUTCOME',kind:'HEALED',health:'Healthy',seatId:'seat-2',presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId:'batch-live',anchorId:'HV1',slotCount:${count}}}])`);
   await p.waitFor('document.querySelector(".bv2-outcomes")?.textContent.includes("Hospital full")&&document.querySelector(".bv2-outcomes")?.textContent.includes("Healed")','authorized overflow words',5000);await sleep(120);
   const live=await record(p,`r${count}-${width}-overlap`);assert.ok(!live.actors.some(a=>a.seat==='seat-1'));assert.ok(live.films.some(id=>id.includes('-patient-body')));if(count===7)assert.ok(live.films.some(id=>id.includes('-vitals')));
   await p.waitFor('document.querySelector("#bv2-offboard-toggle")','canonical off board Code tab',4000);await p.tap('#bv2-offboard-toggle');
   const off=await record(p,`r${count}-${width}-offboard`);const choice=off.targets.find(x=>x.value==='seat-1');assert.ok(choice&&choice.width>=44&&choice.height>=44&&choice.hit);assert.equal(await p.evaluate('document.querySelector(".bv2-board").inert'),true);
   await p.tap('#ms-action-choice-seat-1');await p.waitFor('window.__simulation.model().match.privateArea.content.actions.card.board.picked.includes("seat-1")','original off board seat selection',3000);
   await p.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await p.evaluate('document.querySelector(".bv2-clone-card")'),null);assert.equal(await p.evaluate('document.querySelectorAll("[data-film-part]").length'),0);
  }finally{await p.close();}
 }
 const q=await openPage(browser,{width:390,height:844,mobile:true,ownContext:true});
 try{
  await q.goto(`${base}&roster=9&role=Alien&seat=seat-6`,'document.querySelector("[data-renderer=board-v2]")',15000);await q.foreground();await q.tap('#ms-phone-actions');
  await q.evaluate('window.__simulation.own({cloneStatus:{used:true,activatedRound:4,expiresAfterRound:5,active:true}})');await q.waitFor('document.querySelector(".bv2-clone-card")','own private clone',5000);await record(q,'private-clone-active');
  assert.equal(await q.evaluate('Boolean(document.querySelector(".bv2-board [data-clone-part]"))'),false);
  await q.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await q.evaluate('document.querySelector(".bv2-clone-card")'),null);await q.evaluate("window.dispatchEvent(new Event('focus'))");await q.tap('#ms-phone-actions');await q.waitFor('document.querySelector(".bv2-clone-card")','reopened at rest');
  await q.media({'prefers-reduced-motion':'reduce'});await q.evaluate(`window.__simulation.own({cloneStatus:{used:true,activatedRound:4,expiresAfterRound:5,active:false}},'SHOWDOWN')`);await record(q,'private-clone-expiry-reduced');
  await q.evaluate('window.__simulation.stale()');await q.waitFor('!document.querySelector(".bv2-clone-card")','stale private concealment',5000);
 }finally{await q.close();}
 console.log(`${records.length} hospital-four actual DOM records passed.`);
}finally{const exceptions=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');await writeFile(out+'/records.json',JSON.stringify({scope:'Chromium production controller and host over strict synthetic 1.11 views and outcomes. No native service, physical phone or screen-reader claim.',records,exceptions},null,2)+'\n');browser.close();await handle.close();if(exceptions.length)console.error(JSON.stringify(exceptions.map(x=>x.params?.exceptionDetails?.text)));}
