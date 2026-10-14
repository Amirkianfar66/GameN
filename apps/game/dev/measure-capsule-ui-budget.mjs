// mothership:dev-only — measures the released production markup for the Designer's revised fit.
globalThis[Symbol.for('mothership:dev-only')]=true;
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from './capture/browser.mjs';
const out=resolve(process.argv[2]),base=process.argv[3]??'http://127.0.0.1:5195/';await mkdir(out,{recursive:true});
const handle=await launchBrowser(),browser=await connect(handle.endpoint),facts=[];
const measure=`(() => {const box=n=>{if(!n)return null;const b=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:b.x,y:b.y,w:b.width,h:b.height,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,padding:s.padding,margin:s.margin,border:s.borderWidth,font:s.fontSize,line:s.lineHeight,text:n.innerText?.replace(/\\s+/g,' ').trim()??null};};const names={status:'.ms-phase',nav:'.phone-nav',board:'.ms-board',dock:'.phone-action-dock',strip:'.phone-strip',prompt:'.ms-card__prompt',detail:'.phone-strip__detail',controls:'.ms-card__controls',choices:'.phone-strip__answers',claim:'[data-region="hack-feedback"]'};return {viewport:[innerWidth,innerHeight],font:getComputedStyle(document.documentElement).fontSize,grid:getComputedStyle(document.querySelector('.ms-main')).gridTemplateRows,boxes:Object.fromEntries(Object.entries(names).map(([k,s])=>[k,box(document.querySelector(s))])),buttons:[...document.querySelectorAll('.phone-action-dock button')].map(n=>({id:n.id,value:n.dataset.value??null,...box(n)}))};})()`;
async function record(p,name,size,mode){await sleep(90);facts.push({name,size,mode,...await p.evaluate(measure)});}
try{
 for(const size of [[320,568],[390,844]])for(const mode of ['normal','safe-area','enlarged'])for(const scenario of ['phone-full-jail','phone-full-hospital','declared-hack-target']){
  const p=await openPage(browser,{width:size[0],height:size[1],mobile:true,ownContext:true});
  try{
   if(mode==='safe-area')await p.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:20,bottom:16,left:0,right:0}});
   if(mode==='enlarged')await p.send('Page.setFontSizes',{fontSizes:{standard:32}});
   await p.goto(`${base}?scenario=${scenario}`,"document.querySelector('.ms-timer[data-state=\"running\"]')",20000);await p.foreground();if(mode==='enlarged')await p.evaluate("document.documentElement.style.fontSize='32px'");
   await p.tap('#ms-phone-actions');
   const kind=scenario==='phone-full-jail'?'code':scenario==='phone-full-hospital'?'rescue':'declare-hack-side';
   if(kind==='declare-hack-side')await record(p,'declare-offer',size,mode);
   await p.tap(`[data-intent="action/open"][data-kind="${kind}"]`);await record(p,`${kind}-choosing`,size,mode);
   if(kind==='code'){
    for(const [i,n]of [1,2,4,9].entries()){await p.tap(`.phone-character-target[data-value="seat-${n}"]`);if(i<3)await record(p,`code-partial-${i+1}`,size,mode);}
   }else if(kind==='rescue')await p.tap('.phone-character-target[data-value="seat-6"]');else await p.tap('[data-intent="action/choose"][data-value="Blue"]');
   await record(p,`${kind}-confirm`,size,mode);
   if(size[0]===320&&mode==='safe-area')await p.screenshot(join(out,`${kind}-safe-confirm.png`),{viewport:true});
   if(kind==='declare-hack-side'){await p.evaluate("window.__simulation.hack('HACK_RESULT','Blue')");await record(p,'hack-private-result',size,mode);await p.evaluate("window.__simulation.hack('HACK','Blue')");await record(p,'hack-private-conversation',size,mode);}
  }finally{await p.close();}
 }
 const p=await openPage(browser,{width:320,height:568,mobile:true,ownContext:true});try{
  await p.goto(`${base}?scenario=declared-hack-target&answer=lost&latency=30`,"document.querySelector('.ms-timer[data-state=\"running\"]')",20000);await p.foreground();await p.tap('#ms-phone-actions');await p.tap('[data-intent="action/open"][data-kind="declare-hack-side"]');await p.tap('[data-intent="action/choose"][data-value="Blue"]');await sleep(450);await p.tap('#ms-action-confirm');await p.waitFor("document.querySelector('[data-status=\"unknown\"]')",'unknown declaration receipt',12000);await p.evaluate("window.__simulation.hack('HACK_RESULT','Blue')");await record(p,'hack-claim-plus-unknown-receipt',[320,568],'normal');
 }finally{await p.close();}
 console.log(`${facts.length} real production-markup sizing records`);
}finally{await writeFile(join(out,'ui-budget.json'),JSON.stringify({scope:'Released 37f573af/design-0.3.0 production markup over authored fixtures; sizing input for revised Claude fit, not Board-v2/capsule or Backend acceptance',facts},null,2)+'\n');await browser.close();await handle.close();}
