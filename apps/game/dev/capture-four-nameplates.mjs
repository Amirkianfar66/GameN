// mothership:dev-only — real renderer/CSS over explicit synthetic public views.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {launchBrowser,connect,openPage} from './capture/browser.mjs';
import {BOARD_ROOMS,LOCATION_OF,slotsOf} from '../hosted/board-v2-drawing/slots-four.mjs';
const out=process.env.NAMEPLATE_OUT??'/private/tmp/gamen-four-nameplates';await mkdir(out,{recursive:true});
const server=await createServer({configFile:resolve('apps/game/dev/board/vite.config.mjs'),server:{host:'127.0.0.1',port:5302,strictPort:true,fs:{allow:[resolve('.')]}}});
const records=[];let handle,browser;
const inspect=`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {labels:[...document.querySelectorAll('.bv2-actor .bv2-nameplate')].map(label=>{const n=label.querySelector('b'),text=label.querySelector('.bv2-nameplate__name'),room=label.closest('.bv2-room'),b=room.getBoundingClientRect(),s=getComputedStyle(room);return {seat:label.closest('[data-seat]').dataset.seat,slot:label.closest('[data-seat]').dataset.slot??null,room:room.dataset.room,label:rect(label),number:rect(n),name:rect(text),nameText:text.textContent,textOverflow:getComputedStyle(text).textOverflow,ellipsis:text.scrollWidth>text.clientWidth,content:{left:b.left+parseFloat(s.borderLeftWidth),top:b.top+parseFloat(s.borderTopWidth),right:b.right-parseFloat(s.borderRightWidth),bottom:b.bottom-parseFloat(s.borderBottomWidth)}}}),bodies:[...document.querySelectorAll('.bv2-figure')].map(n=>({seat:n.closest('[data-seat]').dataset.seat,part:n.dataset.part,...rect(n)})),targets:[...document.querySelectorAll('.bv2-seat-target')].map(n=>{const r=rect(n),points=[[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]];return {id:n.id,value:n.dataset.value,...r,hit:points.every(([x,y])=>document.elementFromPoint(r.left+r.width*x,r.top+r.height*y)?.closest('button')===n)}})}})()`;
async function record(p,name,{long=false,targets=false}={}){const facts=await p.evaluate(inspect);records.push({name,...facts});assert.ok(facts.labels.length,name);for(const f of facts.labels){for(const box of[f.label,f.number])assert.ok(box.left>=f.content.left-.5&&box.top>=f.content.top-.5&&box.right<=f.content.right+.5&&box.bottom<=f.content.bottom+.5,`${name}: ${JSON.stringify(f)}`);if(long){assert.equal(f.textOverflow,'ellipsis');assert.equal(f.ellipsis,true,`${name}: ${JSON.stringify(f)}`);assert.ok(f.number.width>=12);}}if(targets){assert.ok(facts.targets.length);assert.ok(facts.targets.every(t=>t.width>=44&&t.height>=44&&t.hit));}return facts;}

try{
 await server.listen();handle=await launchBrowser();browser=await connect(handle.endpoint);
 for(const width of[320,390])for(const count of[7,8,9]){
  const p=await openPage(browser,{width,height:width===320?568:844,mobile:true,ownContext:true});
  try{
   const base=`http://127.0.0.1:5302/?scenario=board-v2&profile=four&roster=${count}`;
   await p.goto(base+'&hack-stage=idle','document.querySelector("[data-renderer=board-v2]")',15000);await p.foreground();await p.tap('#ms-phone-actions');await p.tap('#ms-action-open-code');
   const before=await record(p,`r${count}-${width}-short`,{targets:true});
   await p.goto(base+'&hack-stage=idle&names=long','document.querySelector("[data-renderer=board-v2]")',15000);await p.foreground();await p.tap('#ms-phone-actions');await p.tap('#ms-action-open-code');const after=await record(p,`r${count}-${width}-long`,{long:true,targets:true});assert.deepEqual(after.bodies,before.bodies);assert.deepEqual(after.targets,before.targets);await p.screenshot(out+`/r${count}-${width}-long.png`,{viewport:true});
   await p.goto(base+'&hack-stage=HACK','document.querySelector(".bv2-capsule .bv2-actor[data-state=seated]")',15000);await p.foreground();await p.tap('#ms-phone-actions');await p.tap('#ms-action-open-code');
   const capsule=await record(p,`r${count}-${width}-capsule-short`,{targets:true});assert.equal(capsule.labels.filter(f=>f.room==='capsule').length,2);
   await p.goto(base+'&hack-stage=HACK&names=long','document.querySelector(".bv2-capsule .bv2-actor[data-state=seated]")',15000);await p.foreground();await p.tap('#ms-phone-actions');await p.tap('#ms-action-open-code');await p.waitFor('Array.from(document.querySelectorAll(".bv2-nameplate__name")).every(n=>n.textContent.length===12)','long capsule identity names rendered',5000);const capsuleLong=await record(p,`r${count}-${width}-capsule-long`,{long:true,targets:true});assert.deepEqual(capsuleLong.bodies,capsule.bodies);assert.deepEqual(capsuleLong.targets,capsule.targets);await p.screenshot(out+`/r${count}-${width}-capsule-long.png`,{viewport:true});
   await p.goto(base+'&hack-stage=idle&as=display&seat=seat-1&names=long','document.querySelector("[data-renderer=board-v2]")',15000);await p.foreground();
   const allOff=Object.fromEntries(Array.from({length:count},(_,i)=>[`seat-${i+1}`,{location:null,slotId:null,health:'Eliminated',medical:null,jailed:false,captain:false,revealedFaction:'Blue'}]));
   let first=true;const slots=[];
   for(const room of BOARD_ROOMS)for(const slot of slotsOf(room,count)){
    const fields={location:LOCATION_OF[room],slotId:slot.id,health:room==='hospital'?'Injured':'Healthy',medical:room==='hospital'?{admittedRound:5,rescueDueAfterRound:null,rescueOpportunity:'NO_ADDITIONAL_ROUND'}:null,jailed:room==='jail',captain:room==='command-room',revealedFaction:null};
    const changes=first?{...allOff,'seat-1':fields}:{'seat-1':fields};first=false;
    await p.evaluate(`window.__simulation.batch(${JSON.stringify(changes)})`);await p.waitFor(`document.querySelector('.bv2-actor[data-seat="seat-1"]')?.dataset.slot===${JSON.stringify(slot.id)}`,`public slot ${room}/${slot.id} painted`,3000);
    const facts=await p.evaluate(inspect);for(const f of facts.labels){assert.ok(f.label.left>=f.content.left-.5&&f.label.right<=f.content.right+.5&&f.label.top>=f.content.top-.5&&f.label.bottom<=f.content.bottom+.5,JSON.stringify(f));assert.ok(f.number.left>=f.content.left-.5&&f.number.right<=f.content.right+.5);assert.equal(f.ellipsis,true);}slots.push({slot:slot.id,...facts.labels[0]});
   }
   records.push({name:`r${count}-${width}-all-fixed-slots-long`,slots});
  }finally{await p.close();}
 }
 assert.equal(browser.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);console.log(`${records.length} nameplate records passed; short/long names, all fixed slots, capsule aliases, preserved body/target geometry and 44px centre/corner hit tests.`);
}finally{const exceptions=browser?.events.filter(e=>e.method==='Runtime.exceptionThrown')??[];await writeFile(out+'/records.json',JSON.stringify({scope:'Chromium production renderer/CSS over explicit synthetic 1.11 public fixtures, with schema-validated synthetic long public names; no native service or physical device claim.',records,exceptions},null,2)+'\n');browser?.close();await handle?.close();await server.close();}
