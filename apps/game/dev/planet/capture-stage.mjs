globalThis[Symbol.for('mothership:dev-only')]=true;
// P27 consumer checks with explicit synthetic server snapshots. No engine or hosted claims.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';

const out=resolve(process.argv[2]??'docs/frontend/evidence/planet-p27-stage');
await mkdir(out,{recursive:true});
const directory=resolve('/private/tmp/gamen-planet-preview');
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname,file=resolve(directory,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(directory+sep))throw Error('path');
  res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Synthetic P27 protocol-3 snapshots through the production consumer, desktop Chromium phone emulation; no Firebase, engine, hosted or physical-device acceptance.',generatedAt:new Date().toISOString(),browser:await browser.send('Browser.getVersion'),cases:[]};
const snapshot=page=>page.evaluate(`(()=>{
 const h=window.planetHarness,m=h.app.game.getModel(),root=document.querySelector('.planet-app'),header=root.querySelector('.planet-header').getBoundingClientRect(),boxes=[...root.querySelectorAll('.bv2-seat-target,.bv2-nameplate,.bv2-caption')].map(n=>n.getBoundingClientRect());
 return {phase:m.phase,stage:h.presentation(),syncCue:root.dataset.syncCue==='true',headerText:root.querySelector('.planet-header').textContent,noOverlay:!root.querySelector('.planet-special'),headerClear:boxes.every(r=>r.bottom<=header.top||r.top>=header.bottom||r.right<=header.left||r.left>=header.right),capsuleActors:root.querySelectorAll('.bv2-capsule .bv2-actor').length,targets:root.querySelectorAll('.bv2-seat-target').length,canMove:m.canMove,canPass:m.canPass,action:m.action,offers:m.privateArea?.offers??[],promise:m.privateArea?.promises?.find(p=>p.id==='given-promise')?.status??null,commands:h.requests.filter(r=>r.operation==='command').length,art:document.documentElement.dataset.art??'',overflow:[document.documentElement.scrollWidth>innerWidth,document.documentElement.scrollHeight>innerHeight]};
})()`);
const picture=async(page,name)=>{await page.screenshot(resolve(out,`${name}.png`));return `${name}.png`;};
const reconnect=async page=>{
 await page.evaluate('window.planetHarness.setVisible(false)');assert.equal(await page.evaluate('window.planetHarness.presentation()'),null);
 await sleep(160);await page.evaluate('window.planetHarness.setVisible(true)');
 await page.waitFor("window.planetHarness.app.game?.getModel().connection==='live'&&window.planetHarness.app.game.getModel().phase?.trusted",'fresh server view after foreground');
};
const waitEnd=async page=>{const remaining=await page.evaluate('Math.max(0,window.planetHarness.value.publicView.phase.endsAt-Date.now())');await sleep(remaining+180);};
try{
 for(const [width,height]of [[320,568],[390,844]])for(const reduced of [false,true]){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true}),prefix=`${width}-${height}-${reduced?'reduced':'normal'}`;
  await page.media({'prefers-reduced-motion':reduced?'reduce':'no-preference'});
  // Both meeting participants already occupy B; only an authoritative vote snapshot settles the Promise.
  await page.goto(`${origin}/?scenario=promise-results`,'window.planetHarness&&(!window.planetHarness.app.game||window.planetHarness.app.game.getModel().connection==="live"&&window.planetHarness.app.game.getModel().phase?.trusted)');
  await page.evaluate(`(()=>{const h=window.planetHarness,v=structuredClone(h.value),p=v.playerView;p.viewRevision++;Object.assign(p.board.seats.find(s=>s.seatId==='seat-1'),{location:'Room B',slotId:'B5'});v.publicView=h.publicPlanet(p);return h.replace(v);})()`);
  await page.evaluate('window.planetHarness.startPresentation()');await page.waitFor('window.planetHarness.presentation()!==null','authoritative Sync start');await page.evaluate("window.planetHarness.app.game.openPanel('promises')");
  const fresh=await snapshot(page);assert.equal(fresh.stage.durationMs,6000);assert.equal(fresh.promise,'Pending');assert.equal(fresh.canMove,false);assert.equal(fresh.canPass,false);assert.equal(fresh.syncCue,true);assert.equal(fresh.noOverlay,true);assert.equal(fresh.headerClear,true);assert.equal(fresh.capsuleActors,0);
  const freshImage=await picture(page,`${prefix}-presentation-promise-pending`);
  await page.evaluate("document.querySelector('.planet-app').dispatchEvent(new Event('animationend',{bubbles:true}));document.dispatchEvent(new Event('ended'))");await sleep(1700);
  const afterFilm=await snapshot(page);assert.equal(afterFilm.phase.kind,'BLACKHOLE_PRESENTATION');assert.ok(afterFilm.stage.elapsedMs>1600);assert.equal(afterFilm.syncCue,true);assert.equal(afterFilm.promise,'Pending');
  await page.evaluate("window.planetHarness.app.game.openPanel('actions');window.planetHarness.app.game.begin('VOTE');window.planetHarness.app.game.begin('PANEL_CODE');window.planetHarness.app.game.begin('MOVE');window.planetHarness.app.game.confirm()");assert.equal((await snapshot(page)).commands,0);
  await waitEnd(page);const waiting=await snapshot(page);assert.equal(waiting.phase.kind,'BLACKHOLE_PRESENTATION');assert.equal(waiting.stage.status,'awaiting-view');assert.equal(waiting.stage.remainingMs,0);assert.match(waiting.headerText,/Waiting for server/);assert.equal(waiting.commands,0);
  const waitingImage=await picture(page,`${prefix}-expired-waiting-for-server`);
  await page.evaluate('window.planetHarness.openJailVote({fulfillMeetings:true})');await page.evaluate("window.planetHarness.app.game.openPanel('promises')");const vote=await snapshot(page);assert.equal(vote.stage,null);assert.equal(vote.phase.kind,'JAIL_VOTE');assert.equal(vote.phase.endsAt-vote.phase.startedAt,60000);assert.ok(vote.phase.remainingMs>58000);assert.equal(vote.promise,'Fulfilled');assert.equal(vote.syncCue,false);
  await page.tap('#planet-close');await page.tap('#planet-nav-actions');await page.tap('#planet-action-VOTE');const ballot=await snapshot(page);assert.equal(ballot.targets,9);assert.equal(ballot.headerClear,true);assert.deepEqual(ballot.overflow,[false,false]);
  const voteImage=await picture(page,`${prefix}-new-full-vote-targets`);await page.tap('#planet-seat-seat-3');await page.tap('#planet-confirm');
  assert.equal(await page.evaluate("window.planetHarness.requests.find(r=>r.operation==='command').request.phaseId===window.planetHarness.value.playerView.phase.id"),true);
  facts.cases.push({name:`${prefix}-six-seconds-then-delayed-full-vote`,passed:true,fresh,afterOptionalFilmDuration:afterFilm,expired:waiting,vote,ballot,screenshots:[freshImage,waitingImage,voteImage]});

  await page.goto(`${origin}/?scenario=board`,'window.planetHarness&&(!window.planetHarness.app.game||window.planetHarness.app.game.getModel().connection==="live"&&window.planetHarness.app.game.getModel().phase?.trusted)');await page.evaluate('window.planetHarness.startPresentation(3500)');const late=await snapshot(page);assert.ok(late.stage.elapsedMs>=3500&&late.stage.elapsedMs<4500);assert.ok(late.stage.remainingMs<=2500);
  await page.evaluate('window.planetHarness.replace(window.planetHarness.value)');await reconnect(page);const resumed=await snapshot(page);assert.equal(resumed.stage.phaseId,late.stage.phaseId);assert.equal(resumed.stage.startedAt,late.stage.startedAt);assert.equal(resumed.stage.endsAt,late.stage.endsAt);assert.ok(resumed.stage.elapsedMs>=late.stage.elapsedMs);assert.ok(resumed.stage.remainingMs<=late.stage.remainingMs);assert.equal(resumed.capsuleActors,0);
  facts.cases.push({name:`${prefix}-late-duplicate-foreground-seeks`,passed:true,late,resumed,screenshots:[await picture(page,`${prefix}-late-foreground-seek`)]});
  await waitEnd(page);await page.evaluate('window.planetHarness.openJailVote()');await reconnect(page);const returned=await snapshot(page);assert.equal(returned.phase.kind,'JAIL_VOTE');assert.equal(returned.stage,null);assert.equal(returned.syncCue,false);assert.equal(returned.capsuleActors,0);
  facts.cases.push({name:`${prefix}-return-after-stage-no-replay`,passed:true,current:returned,screenshots:[await picture(page,`${prefix}-vote-foreground-no-replay`)]});

  // Block all common artwork before the first read, then restore it only after the vote has started.
  await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*/art/*']});await page.goto(`${origin}/?scenario=board`,'window.planetHarness&&(!window.planetHarness.app.game||window.planetHarness.app.game.getModel().connection==="live"&&window.planetHarness.app.game.getModel().phase?.trusted)');await page.evaluate('window.planetHarness.startPresentation(5200)');const noArt=await snapshot(page);assert.equal(noArt.art,'');assert.equal(noArt.syncCue,true);assert.equal(noArt.stage.durationMs,6000);const missingImage=await picture(page,`${prefix}-missing-art-presentation`);
  await waitEnd(page);await page.evaluate('window.planetHarness.openJailVote()');const missingVote=await snapshot(page);assert.equal(missingVote.phase.endsAt-missingVote.phase.startedAt,60000);assert.equal(missingVote.stage,null);assert.equal(missingVote.syncCue,false);
  await page.send('Network.setBlockedURLs',{urls:[]});await page.evaluate('window.planetHarness.reloadArt()');const restored=await snapshot(page);assert.notEqual(restored.art,'');assert.equal(restored.phase.id,missingVote.phase.id);assert.equal(restored.syncCue,false);assert.equal(restored.stage,null);
  facts.cases.push({name:`${prefix}-missing-art-progress-and-restore`,passed:true,noArt,missingVote,restored,screenshots:[missingImage,await picture(page,`${prefix}-art-restored-vote-no-replay`)]});

  await page.goto(`${origin}/?scenario=board`,'window.planetHarness&&(!window.planetHarness.app.game||window.planetHarness.app.game.getModel().connection==="live"&&window.planetHarness.app.game.getModel().phase?.trusted)');assert.equal((await snapshot(page)).stage,null);await page.evaluate('window.planetHarness.openJailVote()');const ordinary=await snapshot(page);assert.equal(ordinary.phase.kind,'JAIL_VOTE');assert.equal(ordinary.phase.endsAt-ordinary.phase.startedAt,60000);assert.equal(ordinary.stage,null);assert.equal(ordinary.syncCue,false);
  facts.cases.push({name:`${prefix}-ordinary-round-skips-presentation`,passed:true,current:ordinary,screenshots:[await picture(page,`${prefix}-ordinary-full-vote`)]});

  await page.goto(`${origin}/?scenario=display`,'window.planetHarness&&(!window.planetHarness.app.game||window.planetHarness.app.game.getModel().connection==="live"&&window.planetHarness.app.game.getModel().phase?.trusted)');await page.evaluate('window.planetHarness.startPresentation(3500)');const display=await snapshot(page);assert.equal(display.stage.durationMs,6000);assert.equal(display.syncCue,true);assert.equal(display.noOverlay,true);assert.equal(display.headerClear,true);assert.match(display.headerText,/Last finalized board/);assert.equal(await page.evaluate('window.planetHarness.value.playerView'),null);
  facts.cases.push({name:`${prefix}-shared-display-header`,passed:true,current:display,screenshots:[await picture(page,`${prefix}-shared-display-presentation`)]});
  await page.close();console.log(`${prefix}: 6 P27 browser flows passed`);
 }
 facts.runtimeErrors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text);assert.deepEqual(facts.runtimeErrors,[]);
}finally{
 await writeFile(resolve(out,'facts.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();await new Promise(done=>server.close(done));
}
console.log(JSON.stringify({passed:facts.cases.length,screenshots:facts.cases.flatMap(c=>c.screenshots).length,output:out}));
