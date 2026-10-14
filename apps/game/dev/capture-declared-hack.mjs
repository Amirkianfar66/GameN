// mothership:dev-only — real client markup over schema-checked synthetic snapshots.
globalThis[Symbol.for('mothership:dev-only')] = true;
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { launchBrowser, connect, openPage, sleep } from './capture/browser.mjs';
const output=resolve(process.argv[2]),base=process.argv[3]??'http://127.0.0.1:5193/';
await mkdir(output,{recursive:true});
const handle=await launchBrowser(),browser=await connect(handle.endpoint),facts=[];
const measure=`(() => {const n=document.querySelector('[data-region="hack-feedback"]');return {claim:n?.innerText??null,phase:document.querySelector('.ms-phase__label')?.textContent,timer:document.querySelector('.ms-timer__value')?.textContent,privateOpen:document.querySelector('.ms-private')?.dataset.open,sideways:document.scrollingElement.scrollWidth>innerWidth+1,commands:window.__simulation.log.length,animations:document.getAnimations().length};})()`;
async function record(page,name,size){const f=await page.evaluate(measure);facts.push({name,size,fixture:true,...f});return f;}
try {
 for(const size of [[320,568],[390,844]]) {
  const [width,height]=size,page=await openPage(browser,{width,height,mobile:true,ownContext:true});
  try {
   await page.goto(`${base}?scenario=declared-hack-target&latency=30`,"document.querySelector('.ms-timer[data-state=\"running\"]')",20000);await page.foreground();
   await page.tap('#ms-phone-actions');await sleep(100);
   await page.tap('[data-intent="action/open"][data-kind="declare-hack-side"]');await sleep(100);
   const choices=await page.evaluate("[...document.querySelectorAll('[data-intent=\"action/choose\"]')].map(n=>({value:n.dataset.value,label:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))");
   assert.deepEqual(choices.map(c=>c.value),['Blue','Red','Alien']);assert.ok(choices.every(c=>c.width>=44&&c.height>=44));
   let f=await record(page,'three-uniform-choices',size);assert.equal(f.sideways,false);assert.equal(f.commands,0);
   await page.tap('[data-intent="action/choose"][data-value="Blue"]');await sleep(450);await page.tap('#ms-action-confirm');await sleep(200);
   f=await record(page,'one-declaration',size);assert.equal(f.commands,1);
   await page.evaluate("window.__simulation.hack('HACK_RESULT','Blue')");await sleep(100);
   f=await record(page,'five-second-private-claim',size);assert.match(f.claim,/claims BLUE/);
   await page.evaluate("window.dispatchEvent(new Event('blur'))");await sleep(70);
   f=await record(page,'blur-with-visible-document',size);assert.equal(f.claim,null);assert.equal(await page.evaluate("document.visibilityState"),'visible');
   await page.evaluate("window.dispatchEvent(new Event('focus'))");await sleep(50);assert.equal((await record(page,'focus-does-not-reopen',size)).claim,null);
   await page.tap('#ms-phone-actions');await sleep(100);assert.match((await record(page,'explicit-reopen',size)).claim,/claims BLUE/);
   await page.evaluate('window.__simulation.stale()');await sleep(70);assert.equal((await record(page,'stale-concealment',size)).claim,null);
   await page.evaluate('window.__simulation.redeliver()');await sleep(150);assert.equal((await record(page,'reconnect-does-not-reopen',size)).claim,null);
   await page.evaluate("window.__simulation.hack('HACK','Blue')");await sleep(100);await page.tap('#ms-phone-actions');await sleep(100);
   f=await record(page,'full-conversation',size);assert.match(f.claim,/claims BLUE/);assert.match(f.timer,/0:5[89]|1:00/);
   await page.media({'prefers-reduced-motion':'reduce'});await sleep(100);
   const motion=await page.evaluate("document.getAnimations().map(a=>({target:a.effect?.target?.className,name:a.animationName,state:a.playState}))");
   assert.ok(motion.every(a=>a.name==='board-fade'),'Reduced motion permits only the finite opacity fade');
   await sleep(250);f=await record(page,'reduced-motion-current-state',size);assert.equal(f.animations,0);
   await page.evaluate("document.documentElement.style.fontSize='32px';document.querySelector('.ms-shell').style.fontSize='28px'");await sleep(100);f=await record(page,'enlarged-text',size);assert.equal(f.sideways,false);
   await page.screenshot(join(output,`${width}x${height}-private-hack-enlarged.png`),{viewport:true});
   await page.tap('#ms-action-dismiss');await sleep(100);
   f=await record(page,'enlarged-receipt-control-reachable',size);assert.equal(f.commands,1);
   assert.equal(await page.evaluate("document.querySelector('.phone-strip')"),null,'Dismissing the receipt removes the empty action tray');assert.match(f.claim,/claims BLUE/);
  } finally {await page.close();}
 }
 const display=await openPage(browser,{width:1280,height:720,ownContext:true});
 try {await display.goto(`${base}?scenario=declared-hack-target&hack-stage=HACK_RESULT&as=display`,"document.querySelector('.ms-timer[data-state=\"running\"]')",20000);const f=await record(display,'public-display',[1280,720]);assert.equal(f.claim,null);assert.equal(await display.evaluate("document.body.innerText.includes('claims BLUE')"),false);} finally {await display.close();}
 await writeFile(join(output,'declared-hack-browser.json'),JSON.stringify({source:'schema-checked synthetic snapshots, not Backend acceptance',facts},null,2)+'\n');
 console.log(`Declared-Hack browser checks: ${facts.length} records passed`);
} finally {await browser.close();await handle.close();}
