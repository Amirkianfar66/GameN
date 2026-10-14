// mothership:dev-only — actual production DOM over strict synthetic wire views, not native service acceptance.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from './capture/browser.mjs';
const output=process.env.BOARD_V2_OUTPUT??'/private/tmp/gamen-bv2-evidence';await mkdir(output,{recursive:true});
const handle=await launchBrowser(),browser=await connect(handle.endpoint),records=[];
const base='http://127.0.0.1:5197/?scenario=board-v2';
const measured=`(()=>{const r=n=>{const b=n.getBoundingClientRect();return {left:b.left,top:b.top,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};return {header:r(document.querySelector('.ms-phase')),scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},duplicateIds:[...document.querySelectorAll('[id]')].map(n=>n.id).filter((id,i,a)=>a.indexOf(id)!==i),targets:[...document.querySelectorAll('.bv2-seat-target')].map(n=>({id:n.id,value:n.dataset.value,...r(n)})),body:document.body.innerText}})()`;
async function record(p,name,extra={}){const facts=await p.evaluate(measured);assert.deepEqual(facts.duplicateIds,[]);records.push({name,...facts,...extra});await p.screenshot(join(output,name+'.png'),{viewport:true});return facts;}
try{
 for(const roster of [7,8,9])for(const [width,height]of [[320,568],[390,844]]){
  const p=await openPage(browser,{width,height,mobile:true,ownContext:true});
  try{await p.goto(`${base}&roster=${roster}&hack-stage=HACK`,'document.querySelector("[data-renderer=board-v2]")',15000);await p.foreground();await p.tap('#ms-phone-actions');await p.tap('[data-kind="code"]');
   const facts=await record(p,`r${roster}-${width}-choosing`);
   assert.equal(facts.header.height,width===320?36:52);assert.equal(facts.scroll.height,height);assert.equal(facts.targets.length,roster+2);
   const probes=await p.evaluate(`(()=>{const failures=[];for(const b of document.querySelectorAll('.bv2-seat-target')){const r=b.getBoundingClientRect();for(const[x,y]of [[r.left+r.width/2,r.top+r.height/2],[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2]]){const hit=document.elementFromPoint(x,y)?.closest('button');if(hit!==b)failures.push({id:b.id,x,y,hit:hit?.id});}}return failures})()`);assert.deepEqual(probes,[]);
   const id=facts.targets[0].id;await p.evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`);await sleep(1200);assert.equal(await p.evaluate('document.activeElement.id'),id,'countdown and film ticks preserve the target node/focus');
   await p.tap('#ms-action-choice-seat-1-capsule');assert.equal(await p.evaluate('window.__simulation.model().match.privateArea.content.actions.card.board.picked[0]'),'seat-1');
   for(const value of ['seat-2','seat-3','seat-6'])await p.tap(`.bv2-seat-target[data-value="${value}"]`);
   await sleep(450);await record(p,`r${roster}-${width}-confirm`);
   const buttons=await p.evaluate(`(()=>{return [...document.querySelectorAll('.bv2-command-controls button')].map(b=>{const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button');return {id:b.id,width:r.width,height:r.height,visible:hit===b,text:getComputedStyle(b).color}})})()`);assert.ok(buttons.every(b=>b.width>=44&&b.height>=44&&b.visible));
   await p.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await p.evaluate('document.querySelector(".bv2-seat-target")'),null);assert.equal(await p.evaluate('document.querySelector(".hack-feedback")'),null);
  }finally{await p.close();}
 }
 const p=await openPage(browser,{width:390,height:844,mobile:true,ownContext:true});
 try{await p.goto(`${base}&roster=9&hack-stage=HACK_DECLARE`,'document.querySelector("[data-renderer=board-v2]")',15000);await p.foreground();
  await p.evaluate("window.__simulation.hack('HACK_RESULT','Red')");await sleep(2100);assert.ok(await p.evaluate('Boolean(document.querySelector(".bv2-capsule [data-state=entering],.bv2-capsule [data-state=sitting]"))'));await record(p,'fresh-entry-390');
  await p.media({'prefers-reduced-motion':'reduce'});await sleep(60);assert.equal(await p.evaluate('document.querySelector(".bv2-capsule [data-place=P1]").dataset.state'),'seated');await record(p,'reduced-entry-settled-390');
  await p.goto(`${base}&roster=9&hack-stage=HACK_RESULT`,'document.querySelector(".bv2-capsule [data-place=P1]")',15000);assert.equal(await p.evaluate('document.querySelector(".bv2-capsule [data-place=P1]").dataset.state'),'seated');
  await p.send('Page.setFontSizes',{fontSizes:{standard:32}});await p.evaluate("document.documentElement.style.fontSize='32px'");await p.waitFor('document.querySelector(".ms-phase").getBoundingClientRect().height===124','enlarged header');await record(p,'text200-390');
 }finally{await p.close();}
 const q=await openPage(browser,{width:320,height:568,mobile:true,ownContext:true});
 try{await q.goto(`${base}&roster=9&hack-stage=HACK`,'document.querySelector("[data-renderer=board-v2]")',15000);await q.evaluate("document.documentElement.style.setProperty('--bv2-safe-top','20px');document.documentElement.style.setProperty('--bv2-safe-bottom','16px');window.dispatchEvent(new Event('resize'))");await q.waitFor('document.querySelector("[data-board-fits=false]")','safe-area fallback');await record(q,'safe20-16-too-short-320',{safeArea:'Instrumented CSS insets; not a physical-device measurement'});
  assert.ok(await q.evaluate('document.querySelector("#ms-phone-actions").getBoundingClientRect().height>=44'));assert.equal(await q.evaluate('document.querySelector("[data-renderer=board-v2]")'),null);
 }finally{await q.close();}
 console.log(`${records.length} actual DOM records passed; synthetic wire fixtures, no native-service/device claim.`);
}finally{await writeFile(join(output,'browser-records.json'),JSON.stringify({scope:'Actual production render/action flow in Chromium over strict synthetic native-field views. Native service evidence is separate.',records,exceptions:browser.events.filter(e=>e.method==='Runtime.exceptionThrown')},null,2)+'\n');browser.close();await handle.close();}
