globalThis[Symbol.for('mothership:dev-only')]=true;
import {createServer} from 'node:http';
import {readFile,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {launchBrowser,connect,openPage,sleep} from '../../../../design/tools/lib/chrome.mjs';
const directory='/private/tmp/gamen-crew-consumer-review-build',out=resolve(process.argv[2]??'docs/frontend/evidence/crew-runtime-adoption');await mkdir(out,{recursive:true});
const frames=await mkdtemp('/private/tmp/gamen-crew-video-'),fps=15,count=525;
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/favicon.ico'){res.statusCode=204;res.end();return;}const file=resolve(directory,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(directory+sep))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.mp4':'video/mp4','.webp':'image/webp'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
try{
 const page=await openPage(browser,{width:390,height:844,mobile:true});await page.goto(origin+'/?scenario=board&tuple=crew&crewPair=hair','window.planetHarness');await page.evaluate('window.planetHarness.candidateReady');
 let segmentStart=Date.now(),segmentFrame=0;
 for(let i=0;i<count;i++){
  if(i===105){await page.evaluate("window.planetHarness.scene('choosing')");segmentStart=Date.now();segmentFrame=i;}
  if(i===180){await page.evaluate("window.planetHarness.scene('reading')");await page.evaluate("document.getElementById('planet-role-reveal').click()");segmentStart=Date.now();segmentFrame=i;}
  if(i===270){await page.evaluate("window.planetHarness.scene('promises')");segmentStart=Date.now();segmentFrame=i;}
  if(i===420){await page.media({'prefers-reduced-motion':'reduce'});segmentStart=Date.now();segmentFrame=i;}
  const delay=segmentStart+(i-segmentFrame)*1000/fps-Date.now();if(delay>0)await sleep(delay);
  const {data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:false});await writeFile(resolve(frames,`frame-${String(i).padStart(5,'0')}.jpg`),Buffer.from(data,'base64'));
  if(i%105===0)console.log(`Captured ${i}/${count} frames`);
 }
 const problems=page.problems();await page.close();
 const video=resolve(out,'crew-runtime-review.mp4');execFileSync('ffmpeg',['-v','error','-framerate',String(fps),'-i',resolve(frames,'frame-%05d.jpg'),'-frames:v',String(count),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',video]);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames','-of','json',video],{encoding:'utf8'}));
 const result={scope:'35-second native-consumer review video, independently initialized synthetic fixtures; desktop Chromium only. Not gameplay timing, device performance or release-build acceptance.',fps,frames:count,durationSeconds:35,sourceHead:'8cee39d89798390d03c2a4a9fe457fa6de387bda',browser:chrome.version,segments:[{start:0,end:7,view:'Nine-crew board, full motion'},{start:7,end:12,view:'All-nine square-icon character selector'},{start:12,end:18,view:'Own-phone reading card with baked icon'},{start:18,end:28,view:'Mira and Echo in native capsule poses, full motion'},{start:28,end:35,view:'Same capsule with reduced motion; meaningful poses retained'}],problems,probe};
 await writeFile(resolve(out,'video.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(problems.length)process.exitCode=1;
}finally{browser.close();await chrome.close();await new Promise(done=>server.close(done));await rm(frames,{recursive:true,force:true});}
