// mothership:dev-only
// Reproduce the Sheet 19 placement review against the retained #320 native phone build.
// Run from the repository root: node review.mjs <phone build> <output directory>.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const [buildArg, outArg] = process.argv.slice(2);
assert.ok(buildArg && outArg, 'Supply the native phone build and an output directory');
const build = resolve(buildArg), output = resolve(outArg);
const helper = name => import(pathToFileURL(resolve('design/tools/lib', name)));
const { connect, launchBrowser, openPage, sleep } = await helper('chrome.mjs');
const { bundlePreview, classify, POLICY_LISTENER, recordedHeaders, serve, sha256 } = await helper('component-check.mjs');
const runtime = '533be55945de82536596f2043a1093c1c73f08c1';
const artwork = '64e55516d2f0026842c5c2a675f2eccda20e0a9e';
const provenance = JSON.parse(await readFile(join(build, 'review-provenance.json'), 'utf8'));
assert.equal(provenance.candidate.head, runtime);
assert.equal(provenance.candidate.dirty, false);
assert.equal(provenance.artwork.head, artwork);
const evidenceHead = '78e98dd45fbc43c380fda9fa7642f75627b5cf65';
const stages = 'document.querySelector(".ms-boarding-stage")';
const playing = `${stages}?.dataset.view === 'film' && !!document.querySelector('.ms-bst-picture svg')`;
const h = 'window.planetHarness';
const observation = `(() => {
  const root = ${stages}, model = ${h}.app.session.getModel();
  const film = root.querySelector('.ms-bst-film'), picture = root.querySelector('.ms-bst-picture');
  const svg = picture.querySelector(':scope > svg, :scope > .pregame-picture > svg');
  const hold = root.querySelector('.ms-bst-hold'), cover = root.querySelector('.ms-bst-cover');
  const skip = root.querySelector('[data-intent=skip]');
  const box = node => node ? Object.fromEntries(['x','y','width','height'].map(k => [k, node.getBoundingClientRect()[k]])) : null;
  const visible = node => !!node && node.getClientRects().length > 0 && node.checkVisibility({opacityProperty:true,visibilityProperty:true});
  const hidden = node => node.inert && node.getAttribute('aria-hidden') === 'true';
  return { view:root.dataset.view, status:root.dataset.status, name:root.getAttribute('aria-label'), motion:root.dataset.motion,
    stage:box(root), slot:box(picture), svg:box(svg), svgCount:picture.querySelectorAll(':scope > svg, :scope > .pregame-picture > svg').length,
    visibleSkip:[...document.querySelectorAll('button')].filter(b=>visible(b) && /skip/i.test(b.textContent)).length, skip:visible(skip)?box(skip):null,
    overlay:!!document.querySelector('.pregame-overlay'), filmHidden:hidden(film), holdingHidden:hidden(hold),
    cover:visible(cover) && cover.contains(document.elementFromPoint(innerWidth/2,innerHeight/2)),
    title:visible(hold) && !hidden(hold)?hold.querySelector('.ms-k-wait-title').textContent:null,
    titleBox:!hidden(hold)?box(hold.querySelector('.ms-k-wait-title')):null, tile:!hidden(hold)?box(hold.querySelector('.ms-k-wait-tile')):null,
    line:!hidden(hold)?hold.querySelector('.ms-k-wait-line').textContent.trim():null,
    clockStatus:model.setupClock.status, timerVisible:!hidden(hold) && visible(hold.querySelector('.ms-k-wait-line')), connection:model.connection, seat:model.selfSeatId, isDisplay:${h}.value.admission?.kind==='display',
    elapsed:model.setupClock.status === 'synced' && model.setup ? model.setupClock.serverNowMs-model.setup.startedAt:null,
    deadline:model.setup?.endsAt??null, activeGame:!!${h}.app.game, commands:${h}.requests.filter(r=>r.operation==='command').length,
    focusOnStage:document.activeElement===root };
})()`;
// Sample the actual CSS animation via the browser's native frame timestamps, independently of the held fixture clocks.
const transition = trigger => `(() => {
 const root=${stages}, film=root.querySelector('.ms-bst-film'), slot=root.querySelector('.ms-bst-picture'), skip=root.querySelector('[data-intent=skip]');
 const from=document.timeline.currentTime, samples=[];
 function sample(time){const style=getComputedStyle(film);samples.push({ms:Math.round(time-from),opacity:Number(style.opacity),visibility:style.visibility,svg:!!slot.querySelector('svg'),view:root.dataset.view});}
 sample(from);skip.focus();${trigger};sample(from);
 return new Promise(done=>{function frame(time){sample(time);if(time-from>=270)done(samples);else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
})()`;
// Capture one natural browser paint during each unpaused transition. Record a time bracket because a
// compositor screenshot can span several frames. The frame trace determines the exact picture lifetime.
async function observeFade(page, trigger, file, width, height) {
  await page.evaluate(`void(window.placementFadeStart=document.timeline.currentTime,window.placementFrames=${transition(trigger)})`);
  await page.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
  const time = () => page.evaluate('Math.round(document.timeline.currentTime-window.placementFadeStart)');
  const fromMs = await time();
  const snapshot = await page.send('Page.captureScreenshot', {format:'jpeg', quality:82, clip:{x:0,y:0,width,height,scale:1}});
  const toMs = await time();
  const bytes = Buffer.from(snapshot.data,'base64');
  await writeFile(join(output,file),bytes);
  return {file,sha256:sha256(bytes),fromMs,toMs,frames:await page.evaluate('window.placementFrames')};
}
async function admitDisplay(page) {
  await page.waitFor("document.querySelector('[data-screen=menu]') && !document.querySelector('.pregame-overlay')", 'menu after the intro');
  await page.evaluate("document.querySelector('[data-intent=join]').click()");
  await page.waitFor("document.querySelector('[data-screen=join] input')", 'Join form');
  await page.evaluate(`(() => {const form=document.querySelector('[data-screen=join]');
    for(const [selector,value] of [['input:not([autocomplete=nickname])','PLANET'],['input[autocomplete=nickname]','Table view']]){
      const input=form.querySelector(selector);input.value=value;input.dispatchEvent(new InputEvent('input',{bubbles:true}));}
    form.querySelector('[data-intent=device][data-value=display]').click();form.querySelector('[data-intent=ask]').click();})()`);
  await page.waitFor(`${h}.app.session.getModel().pendingAdmission?.kind === 'display'`, 'admitted-display request');
}
// Hold the synthetic server and monotonic clocks for matched film frames. Native requestAnimationFrame, CSS and input still run.
async function freezeTime(page, at = null) {
  await page.evaluate(`(() => {const wall=${at ?? 'Date.now()'}, mono=performance.now();window.placementDelta=0;
    Date.now=()=>wall+window.placementDelta;
    Object.defineProperty(performance,'now',{configurable:true,value:()=>mono+window.placementDelta});})()`);
}
async function setBoarding(page, display, setup = null) {
  return page.evaluate(`(async()=>{const h=planetHarness,v=structuredClone(h.value),now=h.now();
    ${display ? "v.admission={...v.admission,status:'admitted'};v.members=h.fixture('display').members;" : ''}
    v.status='boarding';v.privateRole=v.playerView=v.publicView=null;v.members=v.members.map(m=>({...m,ready:true}));
    v.setup=${setup ? JSON.stringify(setup) : "{id:'phone-boarding',startedAt:now-1500,endsAt:now+8500}"};
    await h.replace(v);return v.setup;})()`);
}
const served = await serve(build), origin = served.origin;
const expected = recordedHeaders(), response = await fetch(origin + '/index.html');
const headers = expected.headers.map(({key})=>({key,value:response.headers.get(key)}));
assert.deepEqual(headers, expected.headers);
const html = await response.text(), entry = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/)[1];
const chrome=await launchBrowser(), browser=await connect(chrome.endpoint);
const data={part:'boarding', sheet:19, evidenceHead, runtime, artwork, originalProvenance:provenance,
  source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), driverSha256:sha256(await readFile(fileURLToPath(import.meta.url))),
  browser:chrome.version, headerHash:expected.headersSha256, responseHeaders:headers, entry:{path:entry,sha256:sha256(await readFile(join(build,entry)))},
  method:'Production headers. Synthetic normal player and display admission. Both fixture clocks held at sheet cues. CSS, paint, session, input and lifecycle use the integrated browser implementation. Zero simulated safe inset.', captures:{}, journeys:{}};
await mkdir(output,{recursive:true});
try {
 for(const [width,height] of [[390,844],[430,932]])for(const mode of ['player','display','reduced']){
  const display=mode==='display', size=`${width}x${height}`, key=`${size}-${mode}`;
  const query=display?'scenario=join&flow=3':'scenario=reading&flow=3&elapsed=31000';
  const url=`${origin}/index.html?${query}&count=9&tuple=blackout`;
  const page=await openPage(browser,{width,height,scale:2});
  try {
   await page.send('Emulation.setFocusEmulationEnabled',{enabled:true});
   await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`${POLICY_LISTENER}localStorage.setItem('mothership:planet:presentation-preferences',JSON.stringify({reduced:${mode==='reduced'},textScale:1}));`});
   const ready=async()=>{await page.evaluate(`${h}.app.artReady`);await page.waitFor("document.documentElement.dataset.artSettled==='true'",'art ready');};
   await page.goto(url,h);await ready();if(display)await admitDisplay(page);
   await freezeTime(page);const setup=await setBoarding(page,display);
   const read=()=>page.evaluate(observation);
   const take=async(name)=>{
    const seen=await read(), file=`${key}-${name}.jpg`;
    const {data:encoded}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:82,clip:{x:0,y:0,width,height,scale:1}});
    const bytes=Buffer.from(encoded,'base64');await writeFile(join(output,file),bytes);
    data.captures[`${key}/${name}`]={file,sha256:sha256(bytes),url,...seen};return seen;
   };
   const moveTo=async(ms)=>{await page.evaluate(`(async()=>{placementDelta=${ms}-1500;await planetHarness.app.session.refresh()})()`);};
   const checkFilm=async(name,ms)=>{await page.waitFor(playing,'boarding film');await sleep(280);const s=await take(name);
    assert.equal(s.view,'film');assert.equal(s.elapsed,ms);assert.equal(s.visibleSkip,display?0:1);assert.equal(s.overlay,false);
    assert.deepEqual(s.stage,{x:0,y:0,width,height});assert.deepEqual(s.svg,s.stage);assert.equal(s.svgCount,1);
    if(s.skip){assert.equal(width-s.skip.x-s.skip.width,14);assert.equal(height-s.skip.y-s.skip.height,14);}
   };
   if(mode!=='reduced')await checkFilm('film15',1500);
   if(display){await moveTo(4000);await checkFilm('film4',4000);}
   await moveTo(6000);await checkFilm('film6',6000);
   const journey=data.journeys[key]={};
   if(mode!=='reduced'){
    await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))");
    await page.waitFor(`${stages}?.dataset.status==='concealed'&&!document.querySelector('.ms-bst-picture svg')`,'concealed boarding');
    const hidden=await take('concealed');assert.ok(hidden.cover && hidden.filmHidden && hidden.holdingHidden && hidden.visibleSkip===0 && hidden.svgCount===0);
    await page.evaluate("planetHarness.setReadFailure(true);placementDelta=5100;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))");
    await page.waitFor(`${stages}?.dataset.status==='stale'&&!document.querySelector('.ms-bst-picture svg')`,'stale without picture');
    const stale=await take('stale');assert.equal(stale.visibleSkip,0);assert.notEqual(stale.clockStatus,'synced');
    journey.withheld={clockStatus:stale.clockStatus,visibleLine:stale.timerVisible?stale.line:null};
    await page.evaluate("planetHarness.setReadFailure(false);document.querySelector('.ms-boarding-stage [data-intent=retry]').click()");
    await page.waitFor(playing,'resumed window');await sleep(260);const resumed=await take('resumed');
    assert.equal(resumed.deadline,setup.endsAt);assert.equal(resumed.elapsed,6600);assert.equal(resumed.visibleSkip,display?0:1);assert.equal(resumed.svgCount,1);
    journey.recoveredSameWindow=true;
   }
   if(!display){
    const fade=await observeFade(page,'skip.click()',`${key}-skip.jpg`,width,height);
    journey.skipFrames=fade.frames;
    const {frames,...snapshot}=fade;
    journey.skipCapture=snapshot;
    const held=await read();
    assert.equal(held.view,'holding');assert.equal(held.svgCount,0);assert.equal(held.focusOnStage,true);assert.equal(held.commands,0);
    if(mode==='player'){
     await page.goto(url,h);await ready();await freezeTime(page,setup.startedAt+7000);await setBoarding(page,false,setup);
     await page.waitFor(`${stages}?.dataset.view==='holding'`,'same window after reload');const after=await read();
     assert.equal(after.deadline,setup.endsAt);assert.equal(after.visibleSkip,0);assert.equal(after.svgCount,0);assert.equal(after.elapsed,7000);
     journey.skipSurvivesReload=true;
    }
   }
   const problems=page.problems().filter(p=>!p.endsWith('/favicon.ico'));assert.deepEqual(problems,[]);
   const violations=await page.evaluate('window.__policy');for(const violation of violations)violation.kind=await classify(build,violation);
   assert.ok(violations.every(v=>v.kind!=='unexpected'));journey.problems=problems;journey.violations=violations;
   console.log(`${key}: supplemental captures and journey recorded`);
  }finally{await page.close();}
 }
 // The canonical preview uses the same stage, the verified boarding SVG and the sheet's safe areas.
 const canonical = await bundlePreview({repo:process.cwd(),root:resolve('design/phone-ui/components/boarding-stage/preview'),name:'boarding-placement-reference'});
 const reference = await serve(canonical);
 data.reference = {};
 try {
  for (const [width,height] of [[390,844],[430,932]]) {
   for (const variant of ['full','reduced']) {
    const size=`${width}x${height}`, key=`${size}-${variant}`;
    const page=await openPage(browser,{width,height,scale:2});
    try {
     const url=`${reference.origin}/index.html?single=1&size=${size}&state=${variant==='reduced'?'reduced':'film6'}`;
     await page.goto(url,'window.__boardingStage');
     await page.evaluate('window.__boardingStage.ready');
     await sleep(290);
     const stage='window.__boardingStage.mounted[0]';
     const fade=await observeFade(page,`${stage}.update({view:'holding',skip:null})`,`${size}-reference-${variant}-skip.jpg`,width,height);
     const visibleFrames=fade.frames.filter(frame=>frame.visibility==='visible' && frame.opacity>0);
     assert.ok(visibleFrames.length>=2 && visibleFrames.every(frame=>frame.svg));
     data.reference[key]={url,...fade};
     if(variant==='full'){
      await page.evaluate(`${stage}.update({status:'stale',clock:null,view:'holding',skip:null})`);
      await sleep(260);
      const line=await page.evaluate(`(() => {const n=document.querySelector('.ms-k-wait-line');return {hidden:n.hidden,text:n.textContent}})()`);
      assert.deepEqual(line,{hidden:true,text:''});
      const file=`${size}-reference-stale-unsynced.jpg`;
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:82,clip:{x:0,y:0,width,height,scale:1}});
      const bytes=Buffer.from(shot.data,'base64');
      await writeFile(join(output,file),bytes);
      data.reference[key].staleWithoutClock={file,sha256:sha256(bytes),line};
     }
    } finally { await page.close(); }
   }
  }
 } finally { await new Promise(done=>reference.server.close(done)); }
}finally{
 browser.close();await chrome.close();await new Promise(done=>served.server.close(done));
 await writeFile(join(output,'placement.json'),JSON.stringify(data,null,2)+'\n');
}
