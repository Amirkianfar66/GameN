// mothership:dev-only — browser lifecycle checks over schema-checked synthetic views.
globalThis[Symbol.for('mothership:dev-only')] = true;
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchBrowser, connect, openPage, sleep } from './capture/browser.mjs';

const output=resolve(process.argv[2] ?? 'feedback-lifecycle-evidence');
const base=process.argv[3] ?? 'http://127.0.0.1:5192/';
await mkdir(output,{recursive:true});
const handle=await launchBrowser(),browser=await connect(handle.endpoint),facts=[];
const measure=`(() => {
 const result=document.querySelector('[data-result-id]');
 return {id:result?.dataset.resultId ?? null,text:result?.innerText ?? null,timer:document.querySelector('.ms-timer__value')?.textContent,
  expired:document.querySelector('.ms-timer')?.dataset.state === 'expired',
  phase:document.querySelector('.ms-phase__label')?.textContent,
  pageScrolls:document.scrollingElement.scrollHeight>innerHeight+1,sideways:document.scrollingElement.scrollWidth>innerWidth+1,
  secretHooks:[...document.querySelectorAll('[data-device],[data-team],[data-board-target],.phone-character-target,.phone-move-ghost')].filter(n=>n.closest('#app')).length,
  actionsDisabled:document.querySelector('#ms-phone-actions')?.disabled ?? null,
  privateText:document.querySelector('.ms-private[data-open="true"]')?.innerText ?? null,
  animations:document.getAnimations().length};
})()`;

try {
 for(const [width,height] of [[320,568],[390,844],[1280,720]]) {
  const display=width>600,page=await openPage(browser,{width,height,mobile:!display,ownContext:true});
  try {
   const startedAt=Date.now()-250;
   await page.goto(`${base}?scenario=result-runoff&phase-start=${startedAt}${display?'&as=display':''}`,"document.querySelector('[data-result-id]')",20000);
   await page.foreground();
   let value=await page.evaluate(measure);facts.push({name:'current',size:[width,height],...value});
   assert.equal(value.id,'phase-result-1');assert.match(value.text,/Round 2.*Captain election/s);assert.equal(value.secretHooks,0);
   if(!display)assert.equal(value.actionsDisabled,true);
   await page.screenshot(join(output,`${width}x${height}-current.png`),{viewport:true});
   await page.evaluate('window.__simulation.motion(false)');
   await page.media({'prefers-reduced-motion':'reduce'});await sleep(100);
   value=await page.evaluate(measure);facts.push({name:'os-reduced-with-explicit-full',size:[width,height],...value});
   assert.equal(value.id,'phase-result-1');assert.equal(value.animations,0);
   await page.evaluate('window.__simulation.stale()');await sleep(100);
   value=await page.evaluate(measure);facts.push({name:'stale',size:[width,height],...value});assert.equal(value.id,null);
   await page.evaluate('window.__simulation.redeliver()');await sleep(100);
   value=await page.evaluate(measure);facts.push({name:'reconnected',size:[width,height],...value});assert.equal(value.id,'phase-result-1');
   // Fixed fixture timestamps survive reload: this is the same synthetic server phase.
   await page.reload("document.querySelector('[data-result-id]')",20000);
   value=await page.evaluate(measure);facts.push({name:'reload-same-window',size:[width,height],...value});
   assert.equal(value.id,'phase-result-1');assert.notEqual(value.timer,'0:05');
   await page.waitFor("document.querySelector('.ms-timer[data-state=\"expired\"]') && !document.querySelector('[data-result-id]')",'authoritative window expired',10000);
   value=await page.evaluate(measure);facts.push({name:'expired-awaiting-server',size:[width,height],...value});
   assert.equal(value.phase,'Vote result');assert.equal(value.privateText,null);assert.equal(value.secretHooks,0);
   await page.screenshot(join(output,`${width}x${height}-expired.png`),{viewport:true});
  } finally {await page.close();}
 }
} finally {
 await writeFile(join(output,'facts.json'),JSON.stringify({scope:'Chromium fixture lifecycle; no backend/device/visual acceptance claim; preserved framing remains provisional',facts},null,2)+'\n');
 browser.close();await handle.close();
}
console.log(`${facts.length} lifecycle records passed`);
