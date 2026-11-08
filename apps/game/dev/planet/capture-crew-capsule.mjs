globalThis[Symbol.for('mothership:dev-only')]=true;
// Record the real capsule consumer from an ordinary guarded build. Synthetic
// authority supplies increasing revisions; it never waits for a film to finish.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,mkdtemp,writeFile,rm,readdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launchBrowser,connect,openPage,sleep} from '../../../../design/tools/lib/chrome.mjs';
import {readRuntimeArtRelease} from '../../../../scripts/runtime-art-release.mjs';

const repo=fileURLToPath(new URL('../../../../',import.meta.url));
const build=resolve(process.argv[2]??'/private/tmp/gamen-crew-capsule-guarded-469b709b');
const out=resolve(process.argv[3]??'docs/frontend/evidence/crew-release-469b709b');
const width=390,height=844,scale=2,sampleMs=50;
const release=readRuntimeArtRelease(repo,'design-0.7.0');
await mkdir(out,{recursive:true});
const scratch=await mkdtemp('/private/tmp/gamen-capsule-frames-');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_entries','format=duration:stream=codec_type,width,height,nb_read_frames,avg_frame_rate','-of','json',file],{encoding:'utf8'}));
const facts={scope:'Desktop Chromium visual record from the ordinary guarded native build and its real renderer, driven by schema-validated presentation snapshots. Entrance and exit are independently initialized fixtures; this is not controller/transport acceptance, a real match or physical-phone performance measurement.',releaseCommit:'469b709b6689a1063ec36a10c70b8b6e2420c18c',reviewedHead:'060eae93f38c97ffc1fc3735e2f659894be6af80',designerHead:'8cee39d89798390d03c2a4a9fe457fa6de387bda',manifestSha256:release.manifestSha256,buildCommand:'vite build --config apps/game/dev/planet/vite.config.mjs --outDir '+build,viewport:{width,height,devicePixelRatio:scale,videoWidth:width*scale,videoHeight:height*scale},nominalSamplingIntervalMs:sampleMs,playback:'normal speed; 2x means pixel density',variants:[],failures:[]};
facts.buildFiles=Object.fromEntries(await Promise.all((await readdir(resolve(build,'assets'))).sort().map(async name=>['assets/'+name,sha(await readFile(resolve(build,'assets',name)))])));

const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/favicon.ico'){res.statusCode=204;res.end();return;}const file=resolve(build,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(build+sep));res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.mp4':'video/mp4','.webp':'image/webp'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);facts.browser=chrome.version;

const snapshot=({kind,duration,remaining=duration,phaseId,talk=true,receiptTime=null})=>`(()=>{const h=window.planetHarness,p=structuredClone(h.value.playerView),now=${receiptTime??'Date.now()'};p.viewRevision=Math.max(p.viewRevision,h.presentationFixture.getModel().revision??0)+1;p.phase={id:${JSON.stringify(phaseId)},kind:${JSON.stringify(kind)},startedAt:now-${duration-remaining},endsAt:now+${remaining}};p.hackSession=${talk?"{id:'capsule-walk-record',actorSeatId:'seat-6',targetSeatId:'seat-1'}":'null'};p.offers=[];p.events=[];p.promises=[];p.hackFeedback=null;h.presentationFixture.advance(p,now);return {revision:p.viewRevision,phase:p.phase,receiptTime:now};})()`;
const state=page=>page.evaluate(`(()=>{const h=window.planetHarness,m=h.presentationFixture.getModel();return {revision:m.revision,kind:m.phase?.kind,phaseId:m.phase?.id,expired:m.phase?.expired,connection:m.connection,capsule:[...document.querySelectorAll('.bv2-capsule .bv2-actor')].map(n=>({seat:n.dataset.seat,character:n.dataset.character,state:n.dataset.state})),home:[...document.querySelectorAll('.bv2-actor[data-place="world"]')].filter(n=>['seat-1','seat-6'].includes(n.dataset.seat)).map(n=>({seat:n.dataset.seat,slot:n.dataset.slot,opacity:n.querySelector('.bv2-figure[data-part="body"]')?.style.opacity})),instances:[...document.querySelectorAll('[data-crew-instance]')].map(n=>n.dataset.crewInstance)};})()`);

async function recordSegment(variant,direction){
 const page=await openPage(browser,{width,height,scale,mobile:true});
 await page.media({'prefers-reduced-motion':variant==='reduced'?'reduce':'no-preference'});
 const name=`capsule-${direction}-${variant}-2x`,dir=resolve(scratch,name);await mkdir(dir);
 const result={direction,phaseSnapshots:[],samples:[],screenshots:[]};
 try{
  await page.goto(origin+'/?scenario=board&tuple=crew&crewPair=hair','window.planetHarness');await page.evaluate('window.planetHarness.candidateReady');
  await page.waitFor('window.planetHarness.app.game?.getModel().connection === "live"','live synthetic view');
  await page.evaluate('window.planetHarness.startPresentationFixture()');
  if(direction==='in')result.phaseSnapshots.push(await page.evaluate(snapshot({kind:'HACK_DECLARE',duration:15000,phaseId:`record-${variant}-declare`})));
  else{
   // Independently initialize a late 60 s conversation. The next synthetic
   // receipt advances authority to its end while the preceding view is fresh;
   // it does not shorten either phase or wait for the capsule animation.
   const before=await page.evaluate(snapshot({kind:'HACK',duration:60000,remaining:5000,phaseId:`record-${variant}-talk`}));
   const after=await page.evaluate(snapshot({kind:'ORDINARY_TURN',duration:60000,phaseId:`record-${variant}-turn`,talk:false,receiptTime:before.phase.endsAt+10}));
   result.phaseSnapshots.push(before,after);
  }
  const started=Date.now(),length=direction==='in'?4900:2900;let next=started,transitioned=false,index=0;
  while(Date.now()-started<length){
   if(direction==='in'&&!transitioned&&Date.now()-started>=350){result.phaseSnapshots.push(await page.evaluate(snapshot({kind:'HACK_RESULT',duration:5000,phaseId:`record-${variant}-result` })));transitioned=true;}
   if(next>Date.now())await sleep(next-Date.now());
   const at=Date.now()-started,s=await state(page);result.samples.push({atMs:at,...s});assert.equal(s.connection,'live',JSON.stringify(s));assert.equal(s.expired,false,JSON.stringify(s));
   const file=resolve(dir,`frame-${String(index).padStart(4,'0')}.jpg`),capture=await page.send('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:false});await writeFile(file,Buffer.from(capture.data,'base64'));
   const wanted=direction==='in'?[2200,4200]:[800,2500];
   if(wanted[result.screenshots.length]!==undefined&&at>=wanted[result.screenshots.length]){const shot=`${name}-${result.screenshots.length+1}.png`;await page.screenshot(resolve(out,shot),{viewport:true});result.screenshots.push(shot);}
   index++;next=started+index*sampleMs;
  }
  const final=await state(page),states=new Set(result.samples.flatMap(s=>s.capsule.map(p=>p.state)));
  if(variant==='full')for(const seat of ['seat-1','seat-6'])assert.ok(result.samples.some(s=>s.capsule.some(p=>p.seat===seat&&p.state===(direction==='in'?'entering':'leaving'))),name+' did not show a fresh walk for '+seat);
  else assert.ok(![...states].some(s=>['entering','leaving','standing','sitting'].includes(s)),name+' reduced motion traveled');
  if(direction==='in')assert.equal(final.capsule.filter(p=>p.state==='seated').length,2);else{assert.equal(final.capsule.length,0);assert.ok(final.home.every(p=>Number(p.opacity)===1));}
  const refs=await page.evaluate(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),set=new Set(ids),missing=[];for(const n of document.querySelectorAll('svg *'))for(const a of n.attributes){for(const m of a.value.matchAll(/url\\(#([^)]+)\\)/g))if(!set.has(m[1]))missing.push(m[1]);if(a.name==='href'&&a.value.startsWith('#')&&!set.has(a.value.slice(1)))missing.push(a.value);}return {total:ids.length,unique:set.size,missing};})()`);assert.equal(refs.total,refs.unique);assert.deepEqual(refs.missing,[]);result.references=refs;
  result.problems=page.problems();assert.deepEqual(result.problems,[]);
  await page.evaluate('window.planetHarness.presentationFixture.dispose()');assert.equal(await page.evaluate('document.querySelectorAll(".crew-shared-art,[data-crew-art]").length'),0);
  result.observedStates=[...states];result.frameCount=index;result.elapsedMs=Date.now()-started;
  const gaps=result.samples.slice(1).map((s,i)=>s.atMs-result.samples[i].atMs).sort((a,b)=>a-b);
  result.capturedIntervalMs={median:gaps[Math.ceil(gaps.length*.5)-1],p95:gaps[Math.ceil(gaps.length*.95)-1],max:gaps.at(-1)};
  result.cadenceNote='Recording sample intervals, not renderer frame-time measurements';
  const lines=['ffconcat version 1.0'];result.samples.forEach((s,i)=>{lines.push(`file '${resolve(dir,`frame-${String(i).padStart(4,'0')}.jpg`)}'`);lines.push('duration '+((i+1<result.samples.length?result.samples[i+1].atMs-s.atMs:sampleMs)/1000).toFixed(3));});await writeFile(resolve(dir,'frames.ffconcat'),lines.join('\n')+'\n');
  result.video=name+'.mp4';execFileSync('ffmpeg',['-v','error','-f','concat','-safe','0','-i',resolve(dir,'frames.ffconcat'),'-fps_mode','vfr','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',resolve(out,result.video)]);
  result.probe=probe(resolve(out,result.video));assert.equal(result.probe.streams.length,1);assert.equal(result.probe.streams[0].width,width*scale);assert.equal(result.probe.streams[0].height,height*scale);result.sha256=sha(await readFile(resolve(out,result.video)));
  return result;
 }catch(error){await writeFile(resolve(out,name+'-attempt.json'),JSON.stringify({...result,failure:String(error)},null,2)+'\n');throw error;}finally{await page.close();}
}

try{
 for(const variant of ['full','reduced']){
  const segments=[];for(const direction of ['in','out']){console.log('Recording '+variant+' walk-'+direction+' at 2x');segments.push(await recordSegment(variant,direction));}
  const list=resolve(scratch,variant+'.ffconcat');await writeFile(list,segments.map(s=>`file '${resolve(out,s.video)}'`).join('\n')+'\n');
  const video=`capsule-walk-${variant}-2x.mp4`;execFileSync('ffmpeg',['-v','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart','-an','-y',resolve(out,video)]);
  facts.variants.push({variant,segments,video,probe:probe(resolve(out,video)),sha256:sha(await readFile(resolve(out,video)))});
 }
 await writeFile(resolve(out,'capsule-record.json'),JSON.stringify(facts,null,2)+'\n');console.log(JSON.stringify({variants:facts.variants.map(v=>({variant:v.variant,video:v.video,duration:v.probe.format.duration})),failures:0}));
}catch(error){facts.failures.push(String(error.stack??error));await writeFile(resolve(out,'capsule-record.json'),JSON.stringify(facts,null,2)+'\n');throw error;}
finally{browser.close();await chrome.close();await new Promise(done=>server.close(done));await rm(scratch,{recursive:true,force:true});}
