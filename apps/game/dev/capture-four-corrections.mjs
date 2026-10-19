// mothership:dev-only — production controller/DOM over validated synthetic views.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {launchBrowser,connect,openPage,sleep} from './capture/browser.mjs';
const out=process.env.FOUR_CORRECTIONS_OUT??'/private/tmp/gamen-four-corrections';await mkdir(out,{recursive:true});
const server=await createServer({configFile:resolve('apps/game/dev/board/vite.config.mjs'),server:{host:'127.0.0.1',port:5303,strictPort:true}});
const records=[];let handle,browser;
const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
const measure=`(()=>{const rect=${rect.toString()};return {scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},parts:[...document.querySelectorAll('[data-film-part]')].map(n=>({part:n.dataset.filmPart,room:n.closest('[data-room]')?.dataset.room??null,...rect(n),text:n.textContent,hasSvg:!!n.querySelector('svg'),opacity:+getComputedStyle(n).opacity,filter:getComputedStyle(n).filter,transform:getComputedStyle(n).transform})),captions:[...document.querySelectorAll('[data-room=hospital] .bv2-caption,[data-room=jail] .bv2-caption')].map(n=>({text:n.textContent,...rect(n)})),notes:(()=>{const n=document.querySelector('.bv2-outcomes');return n?{text:n.textContent,live:n.getAttribute('aria-live'),clip:getComputedStyle(n).clipPath,...rect(n)}:null})(),actors:[...document.querySelectorAll('.bv2-actor')].map(n=>({seat:n.dataset.seat,slot:n.dataset.slot})),clone:(()=>{const n=document.querySelector('.bv2-clone-card');if(!n)return null;return {film:n.dataset.cloneFilm,state:n.dataset.cloneState,text:n.querySelector('p').textContent,...rect(n),stamps:[...n.querySelectorAll('[data-clone-stamp]')].map(s=>({kind:s.dataset.cloneStamp,text:s.textContent,hidden:s.getAttribute('aria-hidden'),opacity:+getComputedStyle(s).opacity,transform:getComputedStyle(s).transform,...rect(s)}))}})(),pass:(()=>{const n=document.querySelector('.phone-pass');return n?rect(n):null})(),privateOpen:window.__simulation.model().match.privateArea?.open??false}})()`;
async function record(p,name){const facts=await p.evaluate(measure);records.push({name,...facts});await p.screenshot(out+'/'+name+'.png',{viewport:true});return facts;}
async function freeze(p){await p.evaluate(`(()=>{window.__simulation.redeliver();const mono=performance.now(),wall=Math.floor(window.__simulation.model().match.boardLayout.clock.nowMs);window.__drawTime=mono;Object.defineProperty(performance,'now',{value:()=>window.__drawTime,configurable:true});Date.now=()=>wall+window.__drawTime-mono;window.__advanceDrawing=ms=>{window.__drawTime+=ms};})()`);}
async function advance(p,ms){await p.evaluate(`window.__advanceDrawing(${ms})`);await sleep(120);}
async function visit(p,{width,reduced=false,audience='player',extra=''}={}){const u=`http://127.0.0.1:5303/?scenario=board-v2&profile=four&roster=9&hack-stage=idle&as=${audience}${extra}`;await p.goto(u,'document.querySelector("[data-renderer=board-v2]")&&window.__simulation',15000);await p.foreground();if(reduced)await p.media({'prefers-reduced-motion':'reduce'});await sleep(80);await freeze(p);}
const gone={location:null,slotId:null,health:'Eliminated',medical:null,jailed:false};
const episode={admittedRound:5,rescueDueAfterRound:null,rescueOpportunity:'NO_ADDITIONAL_ROUND'};
try{
 await server.listen();handle=await launchBrowser();browser=await connect(handle.endpoint);
 for(const width of[320,390])for(const audience of['player','display'])for(const reduced of[false,true]){
  const p=await openPage(browser,{width,height:width===320?568:844,mobile:true,ownContext:true}),prefix=`${width}-${audience}-${reduced?'reduced':'normal'}`;
  try{
   await visit(p,{width,audience,reduced});
   const origin=await p.evaluate(`(${rect.toString()})(document.querySelector('.bv2-actor[data-seat="seat-1"] .bv2-figure[data-part=body]'))`);
   await p.evaluate(`window.__simulation.batch({'seat-1':${JSON.stringify(gone)},'seat-2':{location:'Room A',slotId:'A3',health:'Healthy',medical:null}},[{type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-1'},{type:'MEDICAL_OUTCOME',kind:'HEALED',health:'Healthy',seatId:'seat-2',presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId:'overlap-rescue',anchorId:'HV1',slotCount:9}}])`);
   try{await p.waitFor('document.querySelector("[data-film-part$=-full]")','overflow frame installed',5000);}catch(error){console.error(JSON.stringify(await p.evaluate('({model:window.__simulation.model(),parts:[...document.querySelectorAll("[data-film-part]")].map(n=>n.dataset.filmPart),art:document.documentElement.dataset.art,now:performance.now(),wall:Date.now()})')));throw error;}await advance(p,reduced?300:700);
   const grey=await record(p,prefix+'-overflow-grey');assert.equal(await p.evaluate('Boolean(document.querySelector("[data-film-part=offboard-plaque] svg"))'),true);const paper=grey.parts.find(n=>n.part.endsWith('-grey-body'));
   assert.ok(paper&&paper.room==='room-a'&&paper.opacity>.4);
   for(const key of['left','top','width','height'])assert.ok(Math.abs(paper[key]-origin[key])<.2,`${prefix}: held origin ${key}`);
   assert.ok(!grey.actors.some(n=>n.seat==='seat-1'),'removed world and capsule actors stay removed');
   assert.equal(grey.notes.live,'polite');assert.ok(grey.notes.text.includes('Hospital full')&&grey.notes.text.includes('Healed'));
   assert.ok(grey.notes.width<=1&&grey.notes.height<=1&&grey.notes.clip==='inset(50%)','live words cannot cover the caption band');
   assert.equal(grey.captions.length,2);assert.ok(grey.parts.some(n=>n.part.endsWith('-full')&&n.opacity>.5));
   if(!reduced){assert.ok(grey.parts.some(n=>n.part.endsWith('-origin-body')&&n.opacity>0));await advance(p,900);const lift=await record(p,prefix+'-overflow-lift');assert.ok(lift.parts.some(n=>n.part.endsWith('-paper-body')));await advance(p,750);const pop=await record(p,prefix+'-overflow-plaque-pop');const plaque=pop.parts.find(n=>n.part==='offboard-plaque');assert.ok(plaque&&parseFloat(plaque.transform.slice(7))>1.05);}
   else{await advance(p,600);const counted=await record(p,prefix+'-overflow-counted');assert.ok(!counted.parts.some(n=>n.part.endsWith('-grey-body')||n.part.endsWith('-paper-body')));assert.equal(counted.parts.find(n=>n.part==='offboard-plaque').transform,'matrix(1, 0, 0, 1, 0, 0)');}
   for(const mode of['fifth','held','body-held']){
    await visit(p,{width,audience,reduced});
    const fields={'seat-1':{location:'Hospital',slotId:'H2',health:'Injured',medical:episode,jailed:false}};
    if(mode==='body-held')fields['seat-2']={health:'Eliminated',medical:null,revealedFaction:'Blue'};
    await p.evaluate(`window.__simulation.batch(${JSON.stringify(fields)},[{type:'MEDICAL_OUTCOME',kind:'INJURY',health:'Injured',seatId:'seat-1',presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId:'admission-${mode}',anchorId:'${mode==='fifth'?'HV5':'HV1'}',slotCount:9}}])`);
    await p.waitFor('document.querySelector("[data-film-part$=-patient-body]")','physical-bed admission',5000);await advance(p,100);
    const entry=await record(p,prefix+'-admission-'+mode),patient=entry.parts.find(n=>n.part.endsWith('-patient-body'));
    assert.ok(patient&&(reduced?patient.opacity===1:patient.opacity<1&&patient.opacity>0));assert.equal(entry.actors.find(n=>n.seat==='seat-1').slot,'H2');assert.ok(!entry.actors.some(n=>n.slot==='H5'));
   }
   if(width===390&&audience==='display'){
    for(const kind of ['HEALED','DEATH','HELD-BODY','NO-ORIGIN']){
     await visit(p,{width,audience,reduced});
     const fields=kind==='DEATH'?{'seat-2':{health:'Eliminated',medical:null,revealedFaction:'Blue'}}:kind==='NO-ORIGIN'?{'seat-1':gone}:{'seat-2':{location:'Room A',slotId:'A3',health:'Healthy',medical:null}};
     if(kind==='HELD-BODY')fields['seat-1']={location:'Hospital',slotId:'H1',health:'Eliminated',medical:null,revealedFaction:'Blue'};
     const fact=kind==='NO-ORIGIN'?{type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-1'}:{type:'MEDICAL_OUTCOME',kind:kind==='DEATH'?'DEATH':'HEALED',health:kind==='DEATH'?'Eliminated':'Healthy',seatId:'seat-2',presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId:'negative-guard',anchorId:kind==='HELD-BODY'?'HV1':'HV5',slotCount:9}};
     if(kind==='NO-ORIGIN'){await p.evaluate(`window.__simulation.batch(${JSON.stringify(fields)})`);await sleep(100);await p.evaluate(`window.__simulation.batch({},[${JSON.stringify(fact)}])`);}
     else await p.evaluate(`window.__simulation.batch(${JSON.stringify(fields)},[${JSON.stringify(fact)}])`);
     await p.waitFor('document.querySelector(".bv2-outcomes")?.textContent.length>0','authorized fallback words',5000);await advance(p,700);
     const guard=await record(p,prefix+'-guard-'+kind.toLowerCase());
     assert.ok(!guard.parts.some(n=>n.part.endsWith('-patient-body')));assert.ok(!guard.actors.some(n=>n.slot==='H5'));
     if(kind==='NO-ORIGIN')assert.ok(!guard.parts.some(n=>/-(grey|origin|paper)-body$/.test(n.part)));
     if(kind==='HELD-BODY')assert.equal(guard.actors.find(n=>n.seat==='seat-1').slot,'H1');
    }
   }
  }finally{await p.close();}
 }
 for(const width of[320,390]){
  const p=await openPage(browser,{width,height:width===320?568:844,mobile:true,ownContext:true});
  try{
   await visit(p,{width,extra:'&seat=seat-7'});await p.tap('#ms-phone-actions');
   const plates=await p.evaluate(`(()=>{const rect=${rect.toString()};return [...document.querySelectorAll('button[data-captain-plate]')].map(n=>({kind:n.dataset.kind,...rect(n),hasArt:getComputedStyle(n).backgroundImage.startsWith('url('),color:getComputedStyle(n).color,word:rect(n.querySelector('.bv2-captain-word')),label:n.querySelector('.bv2-captain-word').textContent}))})()`);
   assert.equal(plates.length,2);for(const n of plates){assert.ok(n.width>=44&&n.height>=44);assert.ok(Math.abs(n.width/n.height-200/64)<.03,JSON.stringify(n));assert.ok(n.word.left>=n.left+n.width*.32);assert.ok(n.word.right<=n.right+1);assert.ok(n.hasArt);assert.equal(n.color,'rgb(244, 235, 221)');assert.ok(n.label==='RELEASE'||n.label==='EJECT');}assert.ok(plates[1].top>=plates[0].bottom-1,'one plate per row');
   const rec=await record(p,`${width}-captain-plates`);rec.plates=plates;
   for(const kind of ['release','eject']){
    await p.evaluate(`document.querySelector('button[data-kind="captain-${kind}"]').scrollIntoView({block:'center'})`);
    const control=await p.evaluate(`(()=>{const n=document.querySelector('button[data-kind="captain-${kind}"]'),r=n.getBoundingClientRect();return {width:r.width,height:r.height,hits:[[.5,.5],[.12,.12],[.88,.12],[.12,.88],[.88,.88]].every(([x,y])=>document.elementFromPoint(r.left+r.width*x,r.top+r.height*y)?.closest('button')===n)}})()`);
    assert.ok(control.width>=44&&control.height>=44&&control.hits,JSON.stringify(control));rec[`${kind}Control`]=control;
    await p.screenshot(out+`/${width}-captain-${kind}-visible.png`,{viewport:true});
   }
   await visit(p,{width});await p.evaluate(`window.__simulation.batch({'seat-1':${JSON.stringify(gone)}},[{type:'HOSPITAL_OVERFLOW_REMOVED',seatId:'seat-1'}])`);await advance(p,3000);await p.tap('#ms-phone-actions');await advance(p,500);await p.tap('#ms-action-open-code');
   await p.waitFor('document.querySelector("#bv2-offboard-toggle")','offboard toggle');const row=await p.evaluate(`[...document.querySelector('#bv2-offboard-toggle').parentNode.children].filter(n=>n.tagName==='BUTTON').map(n=>n.id)`);assert.equal(row[0],'bv2-offboard-toggle');await p.tap('#bv2-offboard-toggle');
   assert.equal(await p.evaluate('document.querySelector(".bv2-board").inert'),true);await record(p,`${width}-offboard-row-start`);
  }finally{await p.close();}
  for(const reduced of[false,true]){
   const q=await openPage(browser,{width,height:width===320?568:844,mobile:true,ownContext:true});
   try{
    await visit(q,{width,reduced,extra:'&role=Alien&seat=seat-6'});
    await q.evaluate(`window.__simulation.own({cloneStatus:{used:true,activatedRound:4,expiresAfterRound:5,active:true}})`);await sleep(80);
    assert.equal(await q.evaluate('document.querySelector(".bv2-clone-card")'),null);assert.equal(await q.evaluate('window.__simulation.model().match.privateArea.content'),null);
    await advance(q,3000);await q.tap('#ms-phone-actions');await q.waitFor('document.querySelector(".bv2-clone-card")?.dataset.cloneFilm==="activate"','queued activation first foreground',5000);
    await advance(q,reduced?900:1740);const active=await record(q,`${width}-clone-${reduced?'reduced':'normal'}-active-stamp`);
    assert.ok(active.clone.stamps.some(n=>n.kind==='active'&&n.opacity>.5&&n.hidden==='true'));assert.ok(active.clone.bottom<=active.pass.top-6);
    const ax=await q.send('Accessibility.getFullAXTree');assert.ok(!ax.nodes.some(n=>!n.ignored&&['CLONE ACTIVE','CLONE ENDED'].includes(n.name?.value)));
    await q.tap('#ms-phone-board');await q.evaluate(`window.__simulation.own({cloneStatus:{used:true,activatedRound:4,expiresAfterRound:5,active:false}},'SHOWDOWN')`);await sleep(80);
    assert.equal(await q.evaluate('document.querySelector(".bv2-clone-card")'),null);await advance(q,3000);await q.tap('#ms-phone-actions');await q.waitFor('document.querySelector(".bv2-clone-card")?.dataset.cloneFilm==="expire"','queued expiry first foreground',5000);
    await advance(q,reduced?900:840);const ended=await record(q,`${width}-clone-${reduced?'reduced':'normal'}-ended-stamp`);assert.ok(ended.clone.stamps.some(n=>n.kind==='ended'&&n.opacity>.5&&n.hidden==='true'));assert.ok(ended.clone.bottom<=ended.pass.top-6);
    await advance(q,2000);await q.tap('#ms-phone-board');await q.tap('#ms-phone-actions');assert.equal(await q.evaluate('document.querySelector(".bv2-clone-card")?.dataset.cloneFilm'),'rest');
    await q.evaluate("window.dispatchEvent(new Event('blur'))");assert.equal(await q.evaluate('document.querySelector(".bv2-clone-card")'),null);
   }finally{await q.close();}
  }
 }
 assert.equal(browser.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);console.log(`${records.length} correction records passed; normal/reduced, 320/390, player/display and own-only Clone.`);
}finally{const exceptions=browser?.events.filter(e=>e.method==='Runtime.exceptionThrown')??[];await writeFile(out+'/records.json',JSON.stringify({scope:'Production controller and DOM in Chromium over strict synthetic1.11 audience views; controlled browser clock for drawing stages only. No native service, physical device, Safari/WebKit or human screen-reader claim.',records,exceptions},null,2)+'\n');browser?.close();await handle?.close();await server.close();}
