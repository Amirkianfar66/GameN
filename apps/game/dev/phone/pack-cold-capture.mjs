// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
const root=resolve(process.argv[2]),out=resolve(process.argv[3]);await mkdir(out,{recursive:true});
const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(head,'388cc052f2a608a3bdbbba457e53e8686abd54e6');assert.equal(execFileSync('git',['-C',root,'status','--porcelain'],{encoding:'utf8'}).trim(),'');
const {designAddress}=await import(pathToFileURL(resolve(root,'design/tools/phone-ui-native-compare.mjs')));
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+sep))throw Error('path');res.setHeader('content-type',({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'})[extname(p)]??'application/octet-stream');res.end(await readFile(p));}catch{res.statusCode=404;res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint),facts={scope:'Supplemental exact Designer sheet30 cold and cold-pick reference states; desktop Chromium only.',designHead:head,cases:[]};
try{
 for(const [width,height,text]of [[390,844,1],[320,568,2]])for(const state of ['cold','cold-pick']){
  const page=await openPage(browser,{width,height,mobile:true,ownContext:true});try{
   const address=designAddress({design:'s=blackout&state='+state,view:{size:width+'x'+height,text}});await page.goto(origin+address,'window.__phoneReady===true');await page.evaluate('document.fonts.ready');await sleep(450);
   const counts=await page.evaluate("({figures:document.querySelectorAll('.fig').length,tags:document.querySelectorAll('.tag').length,positions:document.querySelectorAll('.press').length})");assert.equal(counts.figures,0);assert.equal(counts.tags,0);
   const file=`${width}-${height}-${text*100}-${state}.jpg`,{data}=await page.send('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:false});await writeFile(resolve(out,file),Buffer.from(data,'base64'));facts.cases.push({width,height,text,state,address,counts,file});
  }finally{await page.close();}
 }
}finally{facts.runtimeErrors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.exception?.description??e.params.exceptionDetails.text);await writeFile(resolve(out,'facts.json'),JSON.stringify(facts,null,2)+'\n');browser.close();await chrome.close();await new Promise(done=>server.close(done));}
assert.deepEqual(facts.runtimeErrors,[]);console.log(JSON.stringify({cases:facts.cases.length,out}));
