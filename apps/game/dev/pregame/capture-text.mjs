// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../../../../design/tools/lib/chrome.mjs';
const output=resolve(process.argv[2]??'/private/tmp/gamen-pregame-large-text');await mkdir(output,{recursive:true});let launched,browser;
try{
 launched=await launchBrowser();browser=await connect(launched.endpoint);const page=await openPage(browser,{width:320,height:568,scale:1,mobile:true});await page.goto('http://127.0.0.1:5189/?kind=role&role=supplier&textScale=2','window.pregameHarness?.ready');
 const cases=[];
 for(const reduced of [false,true]){
  await page.evaluate(`window.pregameHarness.startCase({kind:'role',role:'supplier',textScale:2,reduced:${reduced}})`);await page.evaluate('window.pregameHarness.reveal()');await page.waitFor("document.querySelector('[data-pregame=role] svg')",'large-text private film');await sleep(5050);
  const pageText=await page.evaluate(`(()=>{const boxes=[...document.querySelectorAll('.pregame-caption')].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,font:getComputedStyle(n).fontSize,left:r.left,top:r.top,right:r.right,bottom:r.bottom,scroll:n.scrollWidth,client:n.clientWidth}}),b=document.querySelector('.pregame-skip').getBoundingClientRect();return {rootFont:getComputedStyle(document.documentElement).fontSize,boxes,skip:{left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height},documentWidth:document.documentElement.scrollWidth}})()`);
  assert.equal(pageText.rootFont,'32px');assert.ok(pageText.boxes.some(b=>b.text==='The Belt markets.'));for(const box of pageText.boxes){assert.equal(box.font,'26px');assert.ok(box.left>=0&&box.right<=320.5&&box.top>=0&&box.bottom<=568.5);assert.ok(box.scroll<=box.client+1);}assert.ok(pageText.skip.width>=44&&pageText.skip.height>=44&&pageText.skip.right<=320&&pageText.skip.bottom<=568);
  const pageFile=resolve(output,`320x568-supplier-200-${reduced?'reduced':'full'}-page.png`);await page.screenshot(pageFile,{viewport:true});await sleep(3850);
  const title=await page.evaluate(`(()=>{const nodes=[...document.querySelectorAll('.pregame-picture-root path[stroke="#2979FF"]')],rects=nodes.map(n=>n.getBoundingClientRect());return {words:document.querySelector('.pregame-screen-reader').textContent,titlePaths:nodes.length,inside:rects.every(r=>r.left>=0&&r.right<=320&&r.top>=0&&r.bottom<=568),skip:!!document.querySelector('.pregame-skip'),film:document.querySelector('[data-pregame]')?.dataset.pregame}})()`);assert.equal(title.words,'Supplier');assert.ok(title.titlePaths>0&&title.inside&&title.skip&&title.film==='role');
  const titleFile=resolve(output,`320x568-supplier-200-${reduced?'reduced':'full'}-title.png`);await page.screenshot(titleFile,{viewport:true});await page.evaluate("document.querySelector('.pregame-skip').click()");assert.equal(await page.evaluate("window.pregameHarness.requests.some(r=>r.operation==='ready'||r.operation==='advance')"),false);
  cases.push({reduced,pageFile,titleFile,pageText,title,skipKeepsReadyUnchanged:true});
 }
 const report={browser:launched.version,scope:'Actual hosted consumer, synthetic transport,320x568 CSS pixels,200 percent app text preference,full and Reduced; no screen-reader/device acceptance',cases,problems:page.problems()};assert.deepEqual(report.problems,[]);await writeFile(resolve(output,'large-text-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{browser?.close();await launched?.close();}
