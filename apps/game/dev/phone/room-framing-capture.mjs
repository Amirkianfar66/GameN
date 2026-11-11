// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
import {checkCrewArt,checkRoomFigures} from './art-checks.mjs';

const directory=resolve(process.argv[2]??'/private/tmp/gamen-phone-preview');
const out=resolve(process.argv[3]??'/private/tmp/gamen-phone-room-framing-review');
await mkdir(out,{recursive:true});
const provenance=JSON.parse(await readFile(resolve(directory,'review-provenance.json'),'utf8'));
async function verify(){for(const entry of provenance.candidate.modules)assert.equal(createHash('sha256').update(await readFile(resolve(provenance.candidate.root,entry.path))).digest('hex'),entry.sha256,'Source changed: '+entry.path);}
await verify();await writeFile(resolve(out,'review-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
const server=createServer(async(req,res)=>{try{
 const name=new URL(req.url,'http://localhost').pathname,path=resolve(directory,'.'+(name==='/'?'/index.html':name));
 if(!path.startsWith(directory+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));
}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'T1 native room and cold-Blackout regression with explicit synthetic authority; desktop Chromium only. No production admission, physical-device or multiplayer claim.',candidate:provenance.candidate.head,browser:await browser.send('Browser.getVersion'),rooms:[],blackout:[],figureFailures:[]};
async function picture(page,name){const {data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:false});await writeFile(resolve(out,name+'.jpg'),Buffer.from(data,'base64'));return name+'.jpg';}
async function visit(page,scenario,count,text){
 await page.goto(`${origin}/?scenario=${scenario}&count=${count}&tuple=blackout`,'window.planetHarness');
 await page.evaluate(`document.documentElement.style.fontSize='${text*100}%';document.dispatchEvent(new CustomEvent('mothership:preferences-change'));window.planetHarness.candidateReady`);
 await page.waitFor("window.planetHarness.app.game?.getModel().phase?.trusted&&!window.planetHarness.app.game.getModel().concealed",'fresh synchronized game');
}
const markers=page=>page.evaluate(`(()=>{
 const values=[...document.querySelectorAll('.bv2-room:not([hidden]) [data-planet-night=marker]')].map(n=>{const r=n.getBoundingClientRect();return {room:n.closest('.bv2-room').dataset.room,id:n.dataset.slot,x:r.x,y:r.y,width:r.width,height:r.height};});
 return values.sort((a,b)=>(a.room+a.id).localeCompare(b.room+b.id));
})()`);
async function assertDark(page){
 const result=await page.evaluate(`(()=>{const m=window.planetHarness.app.game.getModel();return {dark:m.dark,board:m.board,identities:m.identities,figures:document.querySelectorAll('.bv2-actor').length,roster:document.querySelectorAll('.planet-roster-portrait').length,names:/Crew [1-9]/.test(document.body.innerText)};})()`);
 assert.deepEqual(result,{dark:true,board:null,identities:[],figures:0,roster:0,names:false});
 const values=await markers(page);assert.deepEqual(values.map(m=>m.id),['A1','A2','A3','A4','A5']);return values;
}
try{
 for(const count of [7,8,9])for(const [width,height,text]of [[390,844,1],[320,568,2]]){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${width}-${height}-${text*100}-${count}`;
  try{
   await page.media({'prefers-reduced-motion':'reduce'});await visit(page,'doctor',count,text);
   for(const [room,location,slotPrefix,capacity]of [['room-a','Room A','A',5],['room-b','Room B','B',5],['command-room','Command Room','C',1],['hospital','Hospital','H',4],['jail','Jail','J',5]])for(const size of new Set([1,capacity])){
    const chosen=[2,1,3,4,5].slice(0,size).map(n=>'seat-'+n);
    await page.evaluate(`(()=>{
     const h=window.planetHarness,v=structuredClone(h.value),p=h.makePlanetScenario('doctor',{now:h.now(),count:${count},tuple:'blackout'}),chosen=${JSON.stringify(chosen)},location=${JSON.stringify(location)},prefix=${JSON.stringify(slotPrefix)},t=h.now();
     const free=[['Room A','A',5],['Room B','B',5],['Jail','J',5],['Hospital','H',4]].filter(([loc])=>loc!==location).flatMap(([loc,pre,n])=>Array.from({length:n},(_,i)=>[loc,pre+(i+1)]));
     p.viewRevision=v.playerView.viewRevision+1;p.phase={id:'fit-'+prefix+'-'+${size},kind:'ORDINARY_TURN',startedAt:t-1000,endsAt:t+59000};p.offers=[];
     for(const seat of p.board.seats){const index=chosen.indexOf(seat.seatId),[loc,slot]=index>=0?[location,prefix+(index+1)]:free.shift();
      Object.assign(seat,{location:loc,slotId:slot,health:loc==='Hospital'?'Injured':'Healthy',jailed:loc==='Jail',captain:loc==='Command Room',officer:false,rescueDueAfterRound:loc==='Hospital'?7:null,medical:loc==='Hospital'?{admittedRound:6,rescueDueAfterRound:7,rescueOpportunity:'NEXT_NORMAL_ROUND'}:null});
     }
     p.offices={captainSeatId:location==='Command Room'?chosen[0]:null,officerSeatId:null,blockedSeatId:null};v.playerView=p;v.publicView=h.publicPlanet(p);return h.replace(v);
    })()`);
    await page.waitFor(`document.querySelector('.bv2-room[data-room="${room}"]:not([hidden]) .bv2-actor[data-seat="seat-2"] svg')`,'room body drawn');
    const clinical=room==='hospital';if(clinical)await page.waitFor("document.querySelector('[data-film-part=critical-seat-2-body] svg')",'painted clinical patient');
    await sleep(100);const art=await checkCrewArt(page,{clinical});let figures=[],wholeFigures=true;
    try{figures=await checkRoomFigures(page,{seats:chosen,clinical});}catch(error){
     wholeFigures=false;facts.figureFailures.push({width,height,text,count,room,size,error:error.message});
     // Complete the other states for Designer, while keeping the whole-figure assertion
     // a failing result for this run. This diagnostic does not grant visual acceptance.
     figures=await checkRoomFigures(page,{seats:chosen,minVisibleRatio:0,clinical});
    }
    const capture=count===9||!wholeFigures?await picture(page,prefix+'-'+room+'-'+size):null;
    facts.rooms.push({width,height,text,count,room,size,artFigures:art.figures.length,figures,wholeFigures,capture});
   }
   await visit(page,'blackout',count,text);await page.waitFor("document.querySelector('.bv2-room:not([hidden]) [data-planet-night=marker]')",'cold dark neutral geometry');
   const cold=await assertDark(page),coldCapture=count===9?await picture(page,prefix+'-blackout-cold'):null;
   await page.tap('#planet-nav-actions');await page.tap('#planet-action-SELECT_BLACKOUT_SLOT');
   const targets=await page.evaluate(`['A1','A2','A3','A4','A5'].map(id=>{const n=document.querySelector('#planet-slot-'+id),r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id,width:r.width,height:r.height,reachable:hit===n||n.contains(hit)};})`);
   assert.ok(targets.every(t=>t.reachable&&t.width>=44&&t.height>=44));await page.tap('#planet-slot-A3');assert.equal(await page.evaluate('window.planetHarness.app.game.getModel().action.step'),'confirm');await page.press('Escape');
   await page.evaluate('window.planetHarness.setReadFailure(true);window.planetHarness.app.session.refresh()');assert.equal(await page.evaluate("document.querySelectorAll('.bv2-slot-target').length"),0);
   await page.evaluate('window.planetHarness.setReadFailure(false);window.planetHarness.app.session.refresh()');await page.waitFor('window.planetHarness.app.game.getModel().dark','dark after reconnect');assert.deepEqual(await assertDark(page),cold);
   await page.evaluate(`(()=>{const h=window.planetHarness,v=structuredClone(h.value),p=v.playerView,t=h.now();p.viewRevision++;p.phase={id:'preview-freeze',kind:'BLACKOUT',startedAt:t-3500,endsAt:t+11500};p.blackout={windowId:p.phase.id,previewEndsAt:t+1500,endsAt:t+11500};p.blackoutTargeting.windowId=p.phase.id;v.publicView=h.publicPlanet(p);return h.replace(v);})()`);
   await page.waitFor('!window.planetHarness.app.game.getModel().dark','new lit preview');await sleep(100);const lit=await markers(page);assert.equal(lit.length,5);
   await page.waitFor('window.planetHarness.app.game.getModel().dark','actual preview deadline');assert.deepEqual(await assertDark(page),lit);
   await page.evaluate(`(()=>{const h=window.planetHarness,v=structuredClone(h.value);v.publicView.viewRevision++;Object.assign(v.publicView.board.seats[0],{location:'Jail',slotId:'J1',jailed:true});return h.replace(v);})()`);assert.deepEqual(await assertDark(page),lit);
   const darkCapture=count===9?await picture(page,prefix+'-blackout-frozen'):null;
   assert.equal(await page.evaluate("window.planetHarness.requests.filter(r=>r.operation==='command').length"),0);
   facts.blackout.push({width,height,text,count,cold,lit,targets,coldCapture,darkCapture,freezeAcrossDarkUpdates:true,reconnectPreservesGeometry:true,noCommandSent:true});
  }catch(error){facts.failure={case:prefix,error:error.stack};await picture(page,prefix+'-failure');throw error;}finally{await page.close();}
 }
}finally{
 await verify();facts.sourcesUnchangedThroughRun=true;facts.runtimeErrors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text);
 await writeFile(resolve(out,'facts.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();await new Promise(done=>server.close(done));
}
console.log(JSON.stringify({rooms:facts.rooms.length,blackout:facts.blackout.length,figureFailures:facts.figureFailures.length,out}));
assert.deepEqual(facts.runtimeErrors,[]);assert.deepEqual(facts.figureFailures,[],'Every shown figure must be whole; failures require Designer agreement in #222 before changing the camera');
