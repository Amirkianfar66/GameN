globalThis[Symbol.for('mothership:dev-only')]=true;
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
/** Excluded preview publication only. Production keeps the shared approval fences. */
export function planetCandidateArtPlugin(root){
 const proposal=JSON.parse(readFileSync(resolve(root,'docs/frontend/planet-library-adoption-proposal.json'),'utf8'));
 const files=proposal.files.map(entry=>{
  if(entry.productionAdopted!==false||!entry.candidate.startsWith('apps/game/candidates/planet-library/')||!entry.url.startsWith('/candidate-art/'))throw Error('Candidate publication boundary');
  const bytes=readFileSync(resolve(root,entry.candidate));
  if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Candidate bytes changed: ${entry.candidate}`);
  return {...entry,content:bytes};
 });
 return {name:'planet-candidate-art-preview',
  resolveId(id){return id==='virtual:planet-library-candidates'?'\0planet-library-candidates':null;},
  load(id){return id==='\0planet-library-candidates'?`globalThis[Symbol.for('mothership:dev-only')]=true;export default ${JSON.stringify({groups:proposal.groups.map(g=>({token:g.artToken,url:proposal.files.find(f=>f.candidate===g.stylesheet).url})),cinematics:proposal.cinematicFamilies})};`:null;},
  generateBundle(){for(const entry of files)this.emitFile({type:'asset',fileName:entry.url.slice(1),source:entry.content});},
  configureServer(server){server.middlewares.use((request,response,next)=>{const entry=files.find(f=>f.url===request.url?.split('?')[0]);if(!entry)return next();response.setHeader('content-type',entry.kind==='stylesheet'?'text/css':entry.kind==='video'?'video/mp4':'image/webp');response.end(entry.content);});}
 };
}
