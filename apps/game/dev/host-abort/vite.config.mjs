// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {comicAssetsPlugin} from '../../hosted/comic-assets.mjs';
import {crewDrawingAssetsPlugin} from '../../../../scripts/crew-drawing-art.mjs';
import {pregameAssetsPlugin} from '../../../../scripts/pregame-art-release.mjs';
import {planetLibraryAssetsPlugin} from '../../hosted/build/planet-library-art.mjs';

// Native candidate code runs unchanged. The review serves only art from the frozen,
// fully verified release tree. This is not a production build or source-approval bypass:
// ordinary current-tree Vite/preparation/check:sources still enforce every current hash.
const artRoot=process.env.GAMEN_HOST_ABORT_ART_BASE;
if(!artRoot||execFileSync('git',['-C',artRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!=='74d64700a5b99388ca99f2c39fb7ea7a9519215e'||execFileSync('git',['-C',artRoot,'status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Phone review requires a clean exact 74d64700 artwork tree');
const candidateRoot=fileURLToPath(new URL('../../../../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const entry=path=>{const bytes=readFileSync(path);return {path:relative(candidateRoot,path),sha256:sha(bytes),bytes:bytes.length};};
const provenancePlugin={name:'excluded-phone-review-provenance',generateBundle(_options,bundle){
 const paths=new Set(Object.values(bundle).filter(b=>b.type==='chunk').flatMap(b=>Object.keys(b.modules)).map(id=>id.split('?')[0]).filter(id=>id.startsWith(candidateRoot)&&!id.includes('/node_modules/')&&existsSync(id)));
 for(const dir of ['apps/game/src/planet','packages/presentation/src/planet'])for(const name of readdirSync(resolve(candidateRoot,dir)))if(name.endsWith('.ts'))paths.add(resolve(candidateRoot,dir,name));
 const assetTooling=['apps/game/hosted/comic-assets.mjs','apps/game/hosted/build/planet-library-art.mjs','scripts/crew-drawing-art.mjs','scripts/pregame-art-release.mjs','scripts/runtime-art-release.mjs','scripts/pregame-consumer-approval.mjs','scripts/pregame-consumer-candidate.mjs'];
 const data={scope:'Excluded native host-abort regression with synthetic service responses and clean exact released art. No live room, private role, credential, multiplayer or physical-device evidence. Integration source adoption remains separate.',candidate:{root:candidateRoot,head:execFileSync('git',['-C',candidateRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['-C',candidateRoot,'status','--porcelain'],{encoding:'utf8'}).trim(),modules:[...paths].sort().map(entry)},artwork:{root:artRoot,head:'74d64700a5b99388ca99f2c39fb7ea7a9519215e',sourceTreeClean:true,loadedBy:'Unchanged candidate-tree asset plugins reading frozen-release inputs and running their full asset/source verification',tooling:assetTooling.map(path=>{const item=entry(resolve(candidateRoot,path));if(item.sha256!==sha(readFileSync(resolve(artRoot,path))))throw Error('Asset review tooling differs from frozen release: '+path);return item;}),outputs:Object.values(bundle).filter(b=>b.type==='asset'&&b.fileName.startsWith('art/')).map(b=>({path:b.fileName,sha256:sha(b.source),bytes:Buffer.byteLength(b.source)})).sort((a,b)=>a.path.localeCompare(b.path))}};
 this.emitFile({type:'asset',fileName:'review-provenance.json',source:JSON.stringify(data,null,2)+'\n'});
}};

export default {root:fileURLToPath(new URL('.',import.meta.url)),publicDir:false,plugins:[comicAssetsPlugin(artRoot),planetLibraryAssetsPlugin(artRoot),crewDrawingAssetsPlugin(artRoot),pregameAssetsPlugin(artRoot),provenancePlugin],build:{target:'es2022',cssMinify:false,outDir:'/private/tmp/gamen-host-abort-preview',emptyOutDir:true,sourcemap:false}};
