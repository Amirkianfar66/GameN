// mothership:dev-only — exact production drawing/controls over authored strict-schema views.
globalThis[Symbol.for('mothership:dev-only')] = true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from './capture/browser.mjs';
import {MEASURE,problemsOf} from './capture/board-measure.mjs';
const output=resolve(process.argv[2]),base=process.argv[3]??'http://127.0.0.1:5194/';
await mkdir(output,{recursive:true});const handle=await launchBrowser(),browser=await connect(handle.endpoint),facts=[];
const privateMotion=`document.getAnimations().filter(a=>a.effect?.target?.closest('[data-region="hack-feedback"]')).length`;
const publicMotion=`document.getAnimations().filter(a=>a.effect?.target?.matches('.feedback-window--vote')).length`;
async function record(page,name,size,{enlarged=false,result=false}={}){
 const measured=await page.evaluate(MEASURE),problems=problemsOf(measured);
 if(!enlarged&&measured.boardScrollsInside)problems.push('normal board scrolls inside');
 assert.deepEqual(problems,[],name);
 const extra=await page.evaluate(`(() => {const p=document.querySelector('[data-result-id]'),h=document.querySelector('[data-region="hack-feedback"]');return {resultId:p?.dataset.resultId??null,outcome:p?.dataset.outcome??null,resultText:p?.innerText??null,claim:h?.innerText??null,publicFigures:document.querySelectorAll('.ms-board .ms-token[data-figure]').length,privateAnimations:${privateMotion},publicAnimations:${publicMotion},commands:window.__simulation.log.length};})()`);
 if(extra.resultId){
  const bounds=await page.evaluate(`(() => {const p=document.querySelector('[data-result-id]'),r=p.getBoundingClientRect(),s=document.querySelector('.ms-phase').getBoundingClientRect(),n=document.querySelector('.phone-nav').getBoundingClientRect();return {top:r.top,bottom:r.bottom,statusBottom:s.bottom,navTop:n.top,scrollHeight:p.scrollHeight,clientHeight:p.clientHeight,pointerEvents:getComputedStyle(p).pointerEvents,overflow:getComputedStyle(p).overflowY};})()`);
  assert.ok(bounds.top>=bounds.statusBottom-1&&bounds.bottom<=bounds.navTop+1,'The result stays below the actual header and above navigation');extra.resultBounds=bounds;
  if(enlarged&&bounds.scrollHeight>bounds.clientHeight+1){
   assert.notEqual(bounds.pointerEvents,'none');assert.ok(['auto','scroll'].includes(bounds.overflow));
   await page.send('Input.synthesizeScrollGesture',{x:size[0]/2,y:(bounds.top+bounds.bottom)/2,yDistance:-600,speed:4000,gestureSourceType:'touch'});
   const end=await page.evaluate(`(() => {const p=document.querySelector('[data-result-id]'),lines=p.querySelectorAll('.feedback-window__detail'),n=lines[lines.length-1],r=n.getBoundingClientRect(),b=p.getBoundingClientRect();return {scrollTop:p.scrollTop,lastTextTop:r.top,lastTextBottom:r.bottom,top:b.top,bottom:b.bottom};})()`);
   assert.ok(end.scrollTop>0&&end.lastTextTop>=end.top-1&&end.lastTextBottom<=end.bottom+1,'Native touch scrolling reaches the final result text');extra.resultTextReach=end;
  }
 }
 if(result){assert.equal(extra.publicFigures,9);assert.equal(await page.evaluate("getComputedStyle(document.querySelector('.ms-board')).display !== 'none'"),true);}
 facts.push({name,size,enlarged,...measured,...extra});await page.screenshot(join(output,`${size.join('x')}-${name}.png`),{viewport:true});return extra;
}
try{
 for(const size of [[320,568],[390,844]]){
  for(const scenario of ['result-captain','result-runoff','result-abstain','result-jailed','result-jail-tie','result-released','result-release-denied']){
   const p=await openPage(browser,{width:size[0],height:size[1],mobile:true,ownContext:true});
   try{await p.goto(`${base}?scenario=${scenario}&phase-start=${Date.now()-350}`,"document.querySelector('.pk-vr__stage svg')",20000);await p.foreground();await record(p,scenario,size,{result:true});}finally{await p.close();}
  }
  const p=await openPage(browser,{width:size[0],height:size[1],mobile:true,ownContext:true});
  try{
   await p.goto(`${base}?scenario=declared-hack-target&latency=30`,"document.querySelector('.ms-timer[data-state=\"running\"]')",20000);await p.foreground();await p.tap('#ms-phone-actions');await record(p,'hack-declaration-offer',size);
   await p.tap('[data-intent="action/open"][data-kind="declare-hack-side"]');await record(p,'hack-three-choices',size);
   await p.evaluate("window.__simulation.hack('HACK_RESULT','Blue')");await sleep(35);assert.equal(await p.evaluate(privateMotion),1,'Fresh declaration-to-claim entry fades once');
   await p.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await p.evaluate(privateMotion),0);assert.equal(await p.evaluate("document.querySelector('[data-region=\"hack-feedback\"]')"),null);
   await p.evaluate("window.dispatchEvent(new Event('focus'))");assert.equal(await p.evaluate("document.querySelector('[data-region=\"hack-feedback\"]')"),null);
   await record(p,'hack-mid-entry-blur',size);await p.tap('#ms-phone-actions');assert.equal(await p.evaluate(privateMotion),0,'Explicit reopen is settled');await record(p,'hack-result-reopened',size);
   await p.evaluate("window.__simulation.hack('HACK','Blue')");await record(p,'hack-conversation',size);
   await p.evaluate("window.__simulation.hack('HACK_DECLARE',null)");await p.evaluate("window.__simulation.hack('HACK_RESULT','Red')");await sleep(20);assert.equal(await p.evaluate(privateMotion),1);await p.media({'prefers-reduced-motion':'reduce'});await p.waitFor(`${privateMotion} === 0`,'reduced-motion change cancels the private entry',200);await record(p,'hack-reduced-mid-entry',size);
  }finally{await p.close();}
  const q=await openPage(browser,{width:size[0],height:size[1],mobile:true,ownContext:true});
  try{
   await q.goto(`${base}?scenario=result-runoff&await-result`,"window.__simulation && document.querySelector('#ms-phone-more')",20000);await q.foreground();await q.evaluate('window.__simulation.showResult()');await sleep(20);assert.equal(await q.evaluate(publicMotion),1,'Fresh public result entry fades once');await q.media({'prefers-reduced-motion':'reduce'});await q.waitFor(`${publicMotion} === 0`,'reduced-motion change cancels the public entry',200);await record(q,'vote-reduced-mid-entry',size,{result:true});
   await q.send('Page.setFontSizes',{fontSizes:{standard:32}});await q.evaluate("document.documentElement.style.fontSize='32px'");await record(q,'vote-enlarged',size,{enlarged:true,result:true});await q.tap('#ms-phone-more');await record(q,'vote-enlarged-menu',size,{enlarged:true});
  }finally{await q.close();}
 }
 const lost=await openPage(browser,{width:320,height:568,mobile:true,ownContext:true});
 try{
  await lost.goto(`${base}?scenario=declared-hack-target&latency=30&answer=lost`,"document.querySelector('.ms-timer[data-state=\"running\"]')",20000);await lost.foreground();await lost.tap('#ms-phone-actions');await lost.tap('[data-intent="action/open"][data-kind="declare-hack-side"]');await lost.tap('[data-intent="action/choose"][data-value="Blue"]');await sleep(450);await lost.tap('#ms-action-confirm');await lost.waitFor("document.querySelector('[data-status=\"unknown\"]')",'lost declaration response',12000);
  const receipt=await lost.evaluate('window.__simulation.receipt()');assert.ok(receipt.commandId);
  const kept=await lost.evaluate("Object.values(sessionStorage).map(value=>{try{return JSON.parse(value);}catch{return null;}}).find(value=>value?.commandId)");assert.deepEqual(Object.keys(kept).sort(),['commandId','matchId','phaseId','seatId']);assert.equal(kept.commandId,receipt.commandId);
  await lost.evaluate("window.__simulation.hack('HACK_RESULT','Blue')");await sleep(320);await record(lost,'hack-claim-with-uncertain-receipt',[320,568]);
  await lost.evaluate("window.dispatchEvent(new Event('blur'))");await lost.evaluate("window.dispatchEvent(new Event('focus'))");await lost.tap('#ms-phone-actions');await lost.evaluate('window.__simulation.recover()');await sleep(450);await lost.evaluate("document.querySelector('#ms-action-check')?.click()");await lost.waitFor("document.querySelector('[data-status=\"accepted\"]')",'same stored declaration receipt',5000);assert.equal(await lost.evaluate('window.__simulation.log.length'),1);assert.equal((await lost.evaluate('window.__simulation.receipt()')).commandId,receipt.commandId);assert.equal(await lost.evaluate(`window.__simulation.operations.filter(o=>o.operation==='v1Receipt').every(o=>o.commandId===${JSON.stringify(receipt.commandId)})`),true);await record(lost,'hack-same-receipt-recovered',[320,568]);
 }finally{await lost.close();}
 console.log(`${facts.length} phone-kit visual/lifecycle records passed`);
}finally{await writeFile(join(output,'review.json'),JSON.stringify({scope:'Local Chromium over schema-checked fixtures; no Backend/device/deployment acceptance',facts},null,2)+'\n');await browser.close();await handle.close();}
