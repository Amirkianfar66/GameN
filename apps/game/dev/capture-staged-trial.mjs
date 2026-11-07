// mothership:dev-only
// Native Chromium evidence for the hosted trial over synthetic strict-schema views.
// No backend, real match, physical phone or deployed workflow is claimed by these captures.
globalThis[Symbol.for('mothership:dev-only')] = true;
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { connect, launchBrowser, openPage, sleep } from './capture/browser.mjs';
import { MEASURE, problemsOf, REACHABLE } from './capture/board-measure.mjs';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(process.argv[2] ?? 'staged-trial-evidence');
const base = process.env.MOTHERSHIP_BOARD_URL ?? 'http://127.0.0.1:5188/';
const quick = process.argv.includes('--quick');
await mkdir(output, { recursive: true });
const facts = [], problems = [];
const bp = await launchBrowser(); const browser = await connect(bp.endpoint);
const ready = `window.__simulation && document.querySelector('.ms-board .ms-seat')`;
const PROBE = `(() => {
  const frames = new Set(), listeners = new Map();
  const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => { let id; id = raf(at => { frames.delete(id); callback(at); }); frames.add(id); return id; };
  window.cancelAnimationFrame = id => { frames.delete(id); cancel(id); };
  for (const method of ['addEventListener','removeEventListener']) {
    const original = MediaQueryList.prototype[method];
    MediaQueryList.prototype[method] = function(type, listener, ...args) {
      if (type === 'change' && this.media === '(prefers-reduced-motion: reduce)') {
        if (!listeners.has(this)) listeners.set(this, new Set());
        if (method === 'addEventListener') listeners.get(this).add(listener); else listeners.get(this).delete(listener);
      }
      return original.call(this, type, listener, ...args);
    };
  }
  window.__trialProbe = { frames: () => frames.size, listeners: () => [...listeners.values()].reduce((n,set) => n + set.size,0) };
})();`;
const EXTRA = `(() => {
  const close = document.querySelector('.ms-private[data-open="true"] #phone-private-close');
  const b = close?.getBoundingClientRect();
  const hit = b ? document.elementFromPoint(b.x + b.width/2,b.y+b.height/2) : null;
  const state = document.querySelector('.phone-strip > .ms-card__state');
  return {
    art: document.documentElement.dataset.art,
    kitRequests: performance.getEntriesByType('resource').filter(e=>/abilities\\.art\\./.test(e.name)).length,
    privateOpen: Boolean(document.querySelector('.ms-private[data-open="true"]')),
    privateArt: document.querySelectorAll('.ab-file,.ab-chip,.ab-kit,.ab-printout,.ab-guard,.ab-slip').length,
    actionArt: state?.querySelectorAll('.ab-chip,.ab-code-card,.ab-cell,.ab-rounds,.ab-mic,.ab-tags,.ab-box,.ab-vials').length ?? 0,
    privateAnnouncements: document.querySelectorAll('[data-private="true"]').length,
    closeReachable: b ? b.width>=43.99&&b.height>=43.99&&b.top>=0&&b.bottom<=innerHeight+.5&&(hit===close||close.contains(hit)) : null,
    files: [...document.querySelectorAll('.ab-file')].map(n=>n.dataset.file),
    chipSeats: [...(state?.querySelectorAll('.ab-chip')??[])].map(n=>n.dataset.seat),
    phase: document.querySelector('.ms-phase__label')?.textContent,
    result: document.querySelector('.trial-result')?.dataset.winner ?? null,
    cast: document.querySelectorAll('.trial-cast__member').length,
    sceneCount: document.querySelectorAll('.scene-back').length,
    bodies: [...document.querySelectorAll('.ms-board .ms-seat')].map(n=>({seat:n.dataset.seat,place:n.dataset.place,gesture:n.dataset.gesture,figure:n.querySelector('.ms-token')?.dataset.figure,svg:Boolean(n.querySelector('.ms-token svg')),background:getComputedStyle(n.querySelector('.ms-token')).backgroundImage==='none'})),
    moving: document.querySelectorAll('.ms-seat[data-moving]').length,
    effects: document.querySelectorAll('.phone-fx > *').length,
    raf: window.__trialProbe.frames(), listeners: window.__trialProbe.listeners(),
    animations: document.getAnimations().filter(a=>a.playState==='running').length,
    frames: window.__simulation.frames,
  };
})()`;
async function open(scenario, size, query = '', font = null) {
  const page = await openPage(browser, { width:size[0],height:size[1],mobile:!query.includes('as=display'),ownContext:true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  if (font) await page.send('Page.setFontSizes',{fontSizes:{standard:font}});
  await page.goto(`${base}?scenario=${scenario}${query}`, ready, 20_000); await page.foreground(); await sleep(180);
  return page;
}
async function record(page, name, { shot = false, phone = true, wait = 80, check = null } = {}) {
  await sleep(wait);
  const measured = await page.evaluate(MEASURE), extra = await page.evaluate(EXTRA);
  const found = problemsOf(measured,{phone});
  if (extra.closeReachable===false) found.push('private Hide control is unreachable');
  if (check) found.push(...check(extra,measured));
  facts.push({name,...measured,...extra,problems:found});
  for (const problem of found) problems.push(`${name}: ${problem}`);
  if (shot) await page.screenshot(join(output,`${name}.png`),{viewport:true});
  console.log(`${name}: ${found.length ? found.join('; ') : 'passed'}`);
  return extra;
}
const require = (yes, message) => yes ? [] : [message];
async function action(page, kind) { await page.tap('#ms-phone-actions'); await page.waitFor(`document.querySelector('#ms-action-open-${kind}')`,'action offered'); await page.tap(`#ms-action-open-${kind}`); }
const pick = (page, value) => typeof value === 'number' ? page.tap(`.phone-character-target[data-value="seat-${value}"]`) : page.tap(`.phone-strip .ms-target[data-value="${value}"]`);
async function exactPose(page, n) {
  const body = `${repo}apps/game/hosted/scene-drawing/body.mjs`, crew = `${repo}apps/game/hosted/scene-drawing/crew.mjs`, gestures = `${repo}apps/game/hosted/scene-drawing/gestures.mjs`;
  return page.evaluate(`(async()=>{const {figureSvg}=await import('/@fs'+${JSON.stringify(body)});const {CREW}=await import('/@fs'+${JSON.stringify(crew)});const {skeletonOf}=await import('/@fs'+${JSON.stringify(gestures)});const piece=document.querySelector('.ms-board .ms-seat[data-seat="seat-${n}"]');const template=document.createElement('template');template.innerHTML=figureSvg(CREW[piece.dataset.character],skeletonOf(piece.dataset.gesture),{prefix:'scene-${n}-body'});return template.innerHTML===piece.querySelector('.ms-token').innerHTML})()`);
}
try {
 for (const size of [[320,568],[390,844]]) {
  const tag=size.join('x');
  for (const scenario of quick ? ['scan-results','alien-code'] : ['insider','scan-results','alien-code','protection-states','cracker-no-rescues','supplier-results']) {
   const page=await open(scenario,size);
   await record(page,`${tag}-${scenario}-closed`,{check:e=>require(e.privateArt===0&&!e.privateOpen,'private content before deliberate reveal')});
   await page.tap('#ms-private-toggle');
   await record(page,`${tag}-${scenario}-card`,{shot:true,wait:1150,check:e=>require(e.privateArt>0&&e.kitRequests===1,'uniform kit or private treatment missing')});
   if (scenario==='scan-results'||scenario==='alien-code'||scenario==='insider') {
    await page.tap('.ab-photo');await record(page,`${tag}-${scenario}-inspect`,{shot:true});
    await page.press('Escape');
   }
   await page.evaluate('window.__simulation.stale()');
   await record(page,`${tag}-${scenario}-stale`,{check:e=>require(!e.privateOpen&&e.privateArt===0&&e.privateAnnouncements===0,'stale view retained private content')});
   await page.evaluate('window.__simulation.redeliver()');
   await record(page,`${tag}-${scenario}-fresh-closed`,{check:e=>require(!e.privateOpen&&e.privateArt===0,'restoring current view reopened the card')});
   await page.tap('#ms-private-toggle');await record(page,`${tag}-${scenario}-reopened`,{wait:120,check:e=>require(e.kitRequests===1,'reopening fetched a private asset')});
   await page.close();
  }
  const journeys = quick ? [['shot','shot',[5]],['code','code',[9,2,6,1]]] : [['shot','shot',[5]],['disable','disable',[5]],['rescue','rescue',[6]],['protect','protect',[1]],['hack','hack',[8]],['scan','scan',[5,'Red']],['supply','supply',[8,1]],['code','code',[9,2,6,1]],['showdown','showdown-shot',[1]],['election','vote',[5]],['release-choice','release-choice',[9]],['release-vote','release-vote',['yes']]];
  for (const [scenario,kind,picks] of journeys) {
   const page=await open(scenario,size,'&latency=360');await action(page,kind);
   await record(page,`${tag}-${kind}-choose`,{check:(e,m)=>require(m.targets.every(t=>t.big&&t.hit),'offered target is not reachable')});
   for (const value of picks) await pick(page,value);
   await record(page,`${tag}-${kind}-confirm`,{shot:true,wait:400,check:e=>require(kind==='code'?e.chipSeats.join(',')==='1,2,6,9':kind==='supply'?e.chipSeats.join(',')==='1,8':true,'a set is not in seat order')});
   await page.tap('#ms-action-confirm');
   await record(page,`${tag}-${kind}-sending`,{wait:70});
   await page.waitFor(`document.querySelector('.phone-strip [data-status="accepted"]')`,'accepted receipt');
   await record(page,`${tag}-${kind}-registered`,{shot:kind==='supply'||kind==='code',wait:300});
   await page.evaluate('window.__simulation.expire()');
   await record(page,`${tag}-${kind}-expired`,{check:e=>require(e.actionArt===0,'expired view retained private action artwork')});
   await page.close();
  }
  if(!quick) for(const [scenario,kind,count] of [['crowd-shot','shot',8],['crowd-vote','vote',9],['crowd-command','vote',9],['crowd-jail','code',9],['crowd-room-b-supply','supply',9],['crowd-hospital','rescue',9]]) {
   const page=await open(scenario,size);await action(page,kind);
   await record(page,`${tag}-${scenario}-targets`,{shot:true,check:(e,m)=>[...require(e.bodies.length===9,'a legacy crowded seat was dropped'),...require(m.targets.length===count,'crowd offer count differs'),...require(m.overlaps.length===0,'crowd targets overlap')]});
   const unreachable=await page.evaluate(REACHABLE);if(unreachable.length)problems.push(`${tag}-${scenario}: unreachable ${unreachable}`);
   await page.close();
  }
  const moving=await open('spread',size);await moving.evaluate('window.__simulation.motion(false)');
  await moving.evaluate(`window.__simulation.publicSeat(6,{location:'Room B',health:'Injured'})`);
  await record(moving,`${tag}-move-injured`,{shot:true,wait:55,check:e=>require(e.raf===1&&e.effects===3&&e.moving===1,'full-body travel did not start')});
  await moving.evaluate(`window.__simulation.publicSeat(6,{health:'Healthy'})`);
  const pose=await exactPose(moving,6);
  await record(moving,`${tag}-move-then-healthy`,{shot:true,wait:20,check:e=>[...require(pose,'cancel restored old SVG'),...require(e.raf===0&&e.effects===0&&e.moving===0,'health change left motion ownership')]});
  await moving.evaluate(`window.__simulation.publicSeat(6,{location:'Room A',health:'Injured'})`);await sleep(40);
  const beforeFrames=await moving.evaluate('window.__simulation.frames');
  await moving.media({'prefers-reduced-motion':'reduce'});
  await record(moving,`${tag}-explicit-full-os-reduced`,{shot:true,wait:20,check:e=>[...require(e.raf===0&&e.effects===0&&e.moving===0,'OS reduction left native/RAF ownership'),...require(e.frames===beforeFrames,'OS reduction emitted a screen frame')]});
  await moving.media({'prefers-reduced-motion':'no-preference'});await record(moving,`${tag}-full-restored-no-replay`,{check:e=>require(e.raf===0&&e.effects===0,'full motion replayed old travel')});
  await moving.evaluate(`window.__simulation.publicSeat(6,{location:'Room B'})`);await sleep(35);
  await moving.send('Emulation.setDeviceMetricsOverride',{width:size[1],height:size[0],deviceScaleFactor:1,mobile:true});
  await record(moving,`${tag}-rotation-settles-travel`,{phone:false,wait:120,check:e=>require(e.raf===0&&e.effects===0&&e.moving===0,'resize retained travel ownership')});
  await moving.send('Emulation.setDeviceMetricsOverride',{width:size[0],height:size[1],deviceScaleFactor:1,mobile:true});
  await moving.evaluate(`window.__simulation.publicSeat(6,{location:'Room A'})`);await sleep(25);
  await moving.evaluate('window.__simulation.dispose()');
  const disposed=await moving.evaluate('({raf:window.__trialProbe.frames(),listeners:window.__trialProbe.listeners(),effects:document.querySelectorAll(".phone-fx > *").length})');
  facts.push({name:`${tag}-dispose`,...disposed,problems:[]});if(disposed.raf||disposed.listeners||disposed.effects)problems.push(`${tag}-dispose: ownership leaked`);
  await moving.close();
  if(!quick){
   const pass=await open('spread',size);await pass.tap('#ms-phone-pass');await record(pass,`${tag}-pass-sending`,{shot:true});await pass.waitFor(`document.querySelector('.phone-strip [data-status="accepted"]')`,'Pass accepted');await record(pass,`${tag}-pass-registered`,{check:e=>require(e.files.length===0,'Pass revealed a role file')});await pass.close();
   for(const as of ['', '&as=display']) for(const end of ['finished','aborted']) {
    const page=await open('spread',size,as);await page.evaluate(`window.__simulation.end('${end}')`);
    await record(page,`${tag}-${as?'display':'phone'}-${end}`,{shot:true,phone:!as,wait:550,check:e=>[...require(end==='finished'?e.cast===9&&e.result==='blue':e.cast===0&&e.result==='aborted','terminal public facts differ'),...require(!as||e.kitRequests===0,'display loaded private ability kit')]});
    await page.close();
   }
   const cap=await open('capped-room-a',size);const full=await cap.evaluate(`document.querySelector('.ms-zone[data-zone="room-a"] .scene-full')?.textContent`);await record(cap,`${tag}-capped-full`,{shot:true,check:()=>require(full?.includes('FULL'),'reviewed capped tuple lacks FULL')});await cap.close();
   const fallback=await open('shot',size,'&scenes=off&kit=off');await action(fallback,'shot');await record(fallback,`${tag}-asset-fallback`,{shot:true,check:(e,m)=>require(!e.art.includes('scene-art')&&!e.art.includes('abilities')&&m.targets.every(t=>t.hit&&t.big),'fallback lost usable controls')});await fallback.close();
   const large=await open('scan-results',size,'',32);await large.tap('#ms-private-toggle');await record(large,`${tag}-large-text-private`,{shot:true,wait:1100,check:e=>require(e.closeReachable===true,'large text hides Hide')});await large.close();
  }
 }
 const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.text+': '+(e.params.exceptionDetails.exception?.description??''));
 problems.push(...errors);
} catch(error) { problems.push(String(error.stack));console.error(error); }
finally {
 browser.close();await bp.close();
 const inputs={};
 async function hashTree(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await hashTree(path);else if(/\.(?:mjs|js|ts|css|json)$/.test(path))inputs[relative(repo,path)]=createHash('sha256').update(await readFile(path)).digest('hex');}}
 for(const dir of ['apps/game/hosted','packages/presentation/src','apps/game/dev/board'])await hashTree(join(repo,dir));
 inputs['apps/game/dev/capture-staged-trial.mjs']=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
 await writeFile(join(output,'facts.json'),JSON.stringify({scope:'Synthetic strict-schema views through the actual hosted host, presentation, CSS and native browser. No backend or physical-device acceptance.',inputs,steps:facts.length,problems,facts},null,2)+'\n');
 console.log(JSON.stringify({steps:facts.length,problems:problems.length,output}));
 if(problems.length)process.exitCode=1;
}
