// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
import base from './vite.config.mjs';
import {phoneReviewBase} from './review-base.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(resolve(root,'docs/frontend/food-supply-art-adoption.json'),'utf8'));
const candidates={name:'excluded-unadmitted-food-candidates',generateBundle(){
 for(const output of manifest.outputs){const bytes=readFileSync(resolve(root,output.source));if(hash(bytes)!==output.sha256||bytes.length!==output.bytes)throw Error('Food static candidate differs');
  this.emitFile({type:'asset',fileName:'art/food-supply/'+output.source.split('/assets/')[1],source:bytes});}
}};
const provenance={name:'excluded-food-component-provenance',generateBundle(_options,bundle){
 const art=phoneReviewBase(root,process.env.GAMEN_PHONE_ART_BASE);
 const moduleSet=new Set(Object.values(bundle).filter(x=>x.type==='chunk').flatMap(x=>Object.keys(x.modules)).map(id=>id.split('?')[0]).filter(id=>id.startsWith(root)&&!id.includes('/node_modules/')));
 for(const dir of ['apps/game/src/planet','packages/presentation/src/planet'])for(const name of readdirSync(resolve(root,dir)))if(name.endsWith('.ts'))moduleSet.add(resolve(root,dir,name));
 const modules=[...moduleSet];
 const entry=path=>{const bytes=readFileSync(path);return {path:relative(root,path),sha256:hash(bytes),bytes:bytes.length};};
 this.emitFile({type:'asset',fileName:'food-review-provenance.json',source:JSON.stringify({scope:'Excluded native Food component review on synthetic accepted wire examples. No connected API, runtime tuple or artwork admission, complete ordinary-board journey, device evidence or Designer approval.',candidateHead:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),candidateDirty:!!execFileSync('git',['-C',root,'status','--porcelain'],{encoding:'utf8'}).trim(),contractHead:'5a5bb9068cd4fb085cb2482cd969058221d2c870',frozenOrdinaryArt:art,foodArtwork:'37 hash-checked unadmitted static candidates',exactFoodPortraitDispatch:'pending reviewed runtime pin registration',modules:modules.sort().map(entry),outputs:Object.values(bundle).filter(x=>x.type==='asset').map(x=>({path:x.fileName,sha256:hash(x.source),bytes:Buffer.byteLength(x.source)}))},null,2)+'\n'});
}};
export default {...base,root:fileURLToPath(new URL('./food/',import.meta.url)),plugins:[...base.plugins.filter(p=>p.name!=='excluded-phone-review-provenance'),candidates,provenance],build:{...base.build,outDir:'/private/tmp/gamen-food-preview'}};
