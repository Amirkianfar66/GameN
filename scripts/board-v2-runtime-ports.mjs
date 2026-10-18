// Integration-owned source fence proposed by Frontend. No runtime side effects.
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function verifyBoardV2RuntimePorts(root) {
 const bytes=readFileSync(resolve(root,'design/releases/board-v2-runtime-ports.json'));
 if(sha(bytes)!=='b44c9ef74fff41b5409949b628b360b1f12e736cc88d8321d58ed3c2226f78ac')throw Error('Board V2 reviewed port catalog drift');
 const motionBytes=readFileSync(resolve(root,'design/releases/board-v2-motion-ports.json'));
 if(sha(motionBytes)!=='d667358a96438942943999bd643e7a16c717373f9393ff9ec8c5a43e87a0d87f')throw Error('Board V2 reviewed motion port catalog drift');
 const filmsBytes=readFileSync(resolve(root,'design/releases/board-v2-films-ports.json'));
 if(sha(filmsBytes)!=='a750b2e49e1c0f086e687b24f8569e66f318cd03468452ec131a29dd6f78f0d3')throw Error('Board V2 candidate film port catalog drift');
 const catalog={entries:[...JSON.parse(bytes).entries,...JSON.parse(motionBytes).entries,...JSON.parse(filmsBytes).entries]};
 const directory='apps/game/hosted/board-v2-drawing/';
 const expected=catalog.entries.map(entry=>entry.runtime).sort();
 const actual=readdirSync(resolve(root,directory),{withFileTypes:true,recursive:true})
   .filter(entry=>entry.isFile()).map(entry=>resolve(entry.parentPath??entry.path,entry.name));
 if(JSON.stringify(actual.sort())!==JSON.stringify(expected.map(path=>resolve(root,path)).sort()))throw Error('Unreviewed or missing Board V2 drawing port');
 for(const entry of catalog.entries){
  const bytes=readFileSync(resolve(root,entry.runtime));
  if(sha(bytes)!==entry.runtimeSha256)throw Error(`Board V2 derivative drift: ${entry.runtime}`);
  const source=readFileSync(resolve(root,entry.source));
  if(sha(source)!==entry.sourceSha256)throw Error(`Board V2 original source drift: ${entry.source}`);
  let derivative=source.toString('utf8').replace(/^\/\/ mothership:dev-only\n/,'');
  for(const[from,to]of Object.entries(entry.imports))derivative=derivative.replaceAll("'"+from+"'","'"+to+"'");
  derivative=(entry.runtimeHeader??'')+derivative;
  if(derivative!==bytes.toString('utf8'))throw Error(`Board V2 source reconstruction drift: ${entry.source}`);
 }
 return catalog.entries.length;
}
