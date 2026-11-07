globalThis[Symbol.for('mothership:dev-only')]=true;
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {launchBrowser,connect,openPage} from '../../../../design/tools/lib/chrome.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),web=await mkdtemp(join(tmpdir(),'gamen-crew-motion-'));
await writeFile(join(web,'index.html'),'<!doctype html><title>Crew consumer motion check</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><body></body>');
const server=await createServer({configFile:false,root:web,server:{host:'127.0.0.1',port:0,fs:{allow:[root,web]}}});await server.listen();
const chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
try{
 const page=await openPage(browser,{width:390,height:844,mobile:true});await page.media({'prefers-reduced-motion':'no-preference'});
 await page.goto('http://127.0.0.1:'+server.httpServer.address().port,'document.readyState === "complete"');
 const result=await page.evaluate(`(async()=>{const {checkCrewMotion}=await import(${JSON.stringify('/@fs'+root+'apps/game/dev/planet/crew-motion-check.mjs')});return checkCrewMotion();})()`);
 result.problems=page.problems();result.browser=chrome.version;
 await writeFile(resolve(process.argv[2]??join(root,'docs/frontend/evidence/crew-runtime-adoption/app-motion-checks.json')),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));await page.close();if(result.failures.length||result.problems.length)process.exitCode=1;
}finally{browser.close();await chrome.close();await server.close();await rm(web,{recursive:true,force:true});}
