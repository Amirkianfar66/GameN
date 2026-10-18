// mothership:dev-only
// Native commands/receipts from the production screen over the isolated local service adapter.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchBrowser,connect,openPage,sleep} from './capture/browser.mjs';
const out='/private/tmp/gamen-four-native';await mkdir(out,{recursive:true});const h=await launchBrowser(),browser=await connect(h.endpoint),records=[];
const status=()=>fetch('http://127.0.0.1:19391/status').then(r=>r.json());
async function record(p,name){const value=await p.evaluate(`({text:document.body.innerText,step:window.__native.model().match.privateArea?.content?.actions.card.body.step,clone:document.querySelector('.bv2-clone-card')?.innerText??null,cloneFilm:document.querySelector('.bv2-clone-card')?.dataset.cloneFilm??null,films:[...document.querySelectorAll('[data-film-part]')].map(n=>n.dataset.filmPart),stored:sessionStorage.getItem('mothership:unresolved-command')})`);records.push({name,...value});await p.screenshot(out+'/'+name+'.png',{viewport:true});return value;}
try{
 for(const count of [7,8,9])for(const kind of ['release','eject']){
  const p=await openPage(browser,{width:320,height:568,mobile:true,ownContext:true});
  try{
   await p.goto(`http://127.0.0.1:5297/four-native.html?seat=seat-1&roster=${count}&kind=${kind}`,'document.querySelector("[data-renderer=board-v2]")',60000);await p.foreground();await p.tap('#ms-phone-actions');
   await p.waitFor(`document.querySelector('#ms-action-open-captain-${kind}')`,'native Captain offer',15000);await record(p,`r${count}-${kind}-offer`);
   const offer=await p.evaluate(`(()=>{const n=document.querySelector('#ms-action-open-captain-${kind}'),r=n.getBoundingClientRect();return {width:r.width,height:r.height,image:getComputedStyle(n).backgroundImage.startsWith('url(')}})()`);assert.ok(offer.width>=44&&offer.height>=44&&offer.image,'The native plate must have its loaded source image');
   await p.tap(`#ms-action-open-captain-${kind}`);await p.waitFor('window.__native.model().match.privateArea.content.actions.card.body.step==="confirming"','native command confirmation');
   if(kind==='release')assert.ok((await record(p,`r${count}-${kind}-confirm`)).text.includes('Release all living prisoners currently in Jail?'));
   await sleep(450);await p.tap('#ms-action-confirm');
   await p.waitFor('window.__native.model().match.privateArea.content.actions.card.status==="accepted"','original command accepted/recovered',12000);
   const after=await record(p,`r${count}-${kind}-registered`),snapshot=(await status()).find(v=>v.key===`${count}-${kind}`),commands=snapshot.requests.filter(r=>r.operation==='command');
   assert.equal(new Set(commands.map(r=>r.commandId)).size,1);assert.equal(snapshot.state.captainPowersUsed[kind+'Used'],true);assert.equal(snapshot.state.captainPowersUsed[(kind==='release'?'eject':'release')+'Used'],false);
   assert.equal(snapshot.state.seats.find(s=>s.seatId==='seat-4').location,kind==='release'?'Room A':null);
   if(kind==='release'){assert.ok(snapshot.requests.some(r=>r.operation==='receipt'&&r.commandId===commands[0].commandId));assert.equal(after.stored,null);}
   await sleep(800);await p.waitFor('document.querySelector("#ms-action-dismiss")&&!document.querySelector("#ms-action-dismiss").disabled','registered receipt control',4000);const done=await p.evaluate(`(()=>{const n=document.querySelector('#ms-action-dismiss'),r=n.getBoundingClientRect();return {width:r.width,height:r.height,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===n}})()`);assert.ok(done.width>=44&&done.height>=44&&done.hit);await p.tap('#ms-action-dismiss');await record(p,`r${count}-${kind}-dismissed`);await p.waitFor('window.__native.model().match.privateArea.content.actions.card.body.step==="idle"','return to native actions');
   assert.equal(await p.evaluate(`Boolean(document.querySelector('#ms-action-open-captain-${kind==='release'?'eject':'release'}'))`),false,'After clearing living Jail occupants the other command is not falsely offered');
   await p.tap('#ms-phone-board');await record(p,`r${count}-${kind}-public-film`);
  }finally{await p.close();}
 }
 const q=await openPage(browser,{width:390,height:844,mobile:true,ownContext:true});
 try{await q.goto('http://127.0.0.1:5297/four-native.html?seat=seat-7&roster=7&kind=clone','document.querySelector("[data-renderer=board-v2]")',60000);await q.foreground();await q.tap('#ms-phone-actions');await q.waitFor('document.querySelector("#ms-action-open-activate-clone")','native own Clone offer',15000);await q.tap('#ms-action-open-activate-clone');await sleep(450);await q.tap('#ms-action-confirm');await q.waitFor('document.querySelector(".bv2-clone-card")','committed private Clone card',12000);const active=await record(q,'native-clone-accepted');assert.ok(active.clone.includes('Clone active through Round 3.'));const visible=await q.evaluate(`(()=>{const c=document.querySelector('.bv2-clone-card'),r=c.getBoundingClientRect();return {display:getComputedStyle(c).display,width:r.width,height:r.height,bottom:r.bottom,passTop:document.querySelector('.phone-pass').getBoundingClientRect().top}})()`);assert.ok(visible.display!=='none'&&visible.width>=180&&visible.height>=100);assert.ok(visible.bottom<=visible.passTop-6,JSON.stringify(visible));records.at(-1).cloneGeometry=visible;const state=(await status()).find(v=>v.key==='7-clone');assert.equal(state.state.seats.find(s=>s.seatId==='seat-7').cloneStatus.used,true);await q.reload('document.querySelector("[data-renderer=board-v2]")',15000);await q.foreground();await q.tap('#ms-phone-actions');await q.waitFor('document.querySelector(".bv2-clone-card")?.dataset.cloneFilm==="rest"','active Clone resumes at rest');await record(q,'native-clone-reloaded-at-rest');await q.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await q.evaluate('document.querySelector(".bv2-clone-card")'),null);
 }finally{await q.close();}
 assert.equal(browser.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
 console.log(`${records.length} native browser records passed, including 7/8/9 Captain commands and original-id receipt recovery.`);
}finally{await writeFile(out+'/browser.json',JSON.stringify({scope:'Production screen/host with real local Auth, Firestore Rules and service decisions after legal synthetic setup. No production Functions, automatic Tasks, random-native-setup or physical-device claim.',records,exceptions:browser.events.filter(e=>e.method==='Runtime.exceptionThrown')},null,2)+'\n');browser.close();await h.close();}
