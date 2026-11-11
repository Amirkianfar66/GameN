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
import {phoneReviewBase} from './review-base.mjs';

// Native candidate code runs unchanged. The review serves only art from the frozen,
// fully verified release tree. This is not a production build or source-approval bypass:
// ordinary current-tree Vite/preparation/check:sources still enforce every current hash.
const candidateRoot=fileURLToPath(new URL('../../../../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const artwork=phoneReviewBase(candidateRoot,process.env.GAMEN_PHONE_ART_BASE),artRoot=artwork.root;
const entry=path=>{const bytes=readFileSync(path);return {path:relative(candidateRoot,path),sha256:sha(bytes),bytes:bytes.length};};
const provenancePlugin={name:'excluded-phone-review-provenance',generateBundle(_options,bundle){
 const paths=new Set(Object.values(bundle).filter(b=>b.type==='chunk').flatMap(b=>Object.keys(b.modules)).map(id=>id.split('?')[0]).filter(id=>id.startsWith(candidateRoot)&&!id.includes('/node_modules/')&&existsSync(id)));
 for(const dir of ['apps/game/src/planet','packages/presentation/src/planet'])for(const name of readdirSync(resolve(candidateRoot,dir)))if(name.endsWith('.ts'))paths.add(resolve(candidateRoot,dir,name));
 const data={scope:connected?'Real local Auth/Firestore/HTTP/Functions/Tasks consumer review after one seeded native-history prefix before role disclosure; not a fresh lobby-to-Blackout journey or final presentation screenshots. Candidate native modules and immutable assets are pinned below; current-tree production approval remains separate.':'Excluded synthetic presentation review. Candidate native modules plus immutable assets verified from clean approved-main snapshot; current-tree production approval is still required.',candidate:{root:candidateRoot,head:execFileSync('git',['-C',candidateRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['-C',candidateRoot,'status','--porcelain'],{encoding:'utf8'}).trim(),modules:[...paths].sort().map(entry),reviewTooling:['apps/game/dev/phone/vite.config.mjs','apps/game/dev/phone/review-base.mjs'].map(path=>entry(resolve(candidateRoot,path)))},artwork:{...artwork,loadedBy:'Unchanged candidate-tree asset plugins reading clean approved-main inputs and running their full asset/source verification',outputs:Object.values(bundle).filter(b=>b.type==='asset'&&b.fileName.startsWith('art/')).map(b=>({path:b.fileName,sha256:sha(b.source),bytes:Buffer.byteLength(b.source)})).sort((a,b)=>a.path.localeCompare(b.path))}};
 this.emitFile({type:'asset',fileName:'review-provenance.json',source:JSON.stringify(data,null,2)+'\n'});
}};
const connected=process.env.GAMEN_PHONE_CONNECTED==='1',blackout=process.env.GAMEN_PHONE_BLACKOUT==='1';
export default {root:fileURLToPath(new URL(connected?'./connected/':'.',import.meta.url)),publicDir:false,plugins:[comicAssetsPlugin(artRoot),planetLibraryAssetsPlugin(artRoot),crewDrawingAssetsPlugin(artRoot),pregameAssetsPlugin(artRoot),provenancePlugin],build:{target:'es2022',cssMinify:false,outDir:blackout?connected?'/private/tmp/gamen-blackout-connected-preview':'/private/tmp/gamen-blackout-preview':connected?'/private/tmp/gamen-phone-connected-preview':'/private/tmp/gamen-phone-preview',emptyOutDir:true,sourcemap:false}};
