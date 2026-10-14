// mothership:dev-only — produces an unapplied exact-file proposal, never edits runtime or fences.
globalThis[Symbol.for('mothership:dev-only')] = true;
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const source=resolve(process.argv[2]??root),out=resolve(process.argv[3]??'/private/tmp/gamen-board-v2-core-proposal');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const entries=[
 ['design/board-v2/scenes/slots.mjs','slots.mjs','cf329360c86b512d83a9ab4a2df5a7147ba30d7e716c82a7ffa27c5308dadbc1',[
  ['../../board-motion/figures/gestures.mjs','../scene-drawing/gestures.mjs'],['../../board-motion/scenes/frame.mjs','../scene-drawing/frame.mjs'],['../../board-motion/scenes/index.mjs','../scene-drawing/scenes.mjs']]],
 ['design/board-v2/scenes/hospital-ward.mjs','hospital-ward.mjs','d6af092a86322a81cc941bc41aade276063b5ba209a18a402a1c5195096dc2be',[
  ['../../board-motion/figures/body.mjs','../scene-drawing/body.mjs'],['../../board-motion/figures/gestures.mjs','../scene-drawing/gestures.mjs'],['../../board-motion/scenes/frame.mjs','../scene-drawing/frame.mjs'],['../../board-motion/scenes/kit.mjs','./scene-kit.mjs']]],
 ['design/board-v2/js/fit.mjs','fit.mjs','637d98955361d11e067d326e4ac0a95177334c77661bc9d177edf801ad7d0be6',[
  ['../../board-motion/scenes/frame.mjs','../scene-drawing/frame.mjs'],['../scenes/slots.mjs','./slots.mjs']]],
 ['design/board-motion/scenes/kit.mjs','scene-kit.mjs','9e9489bfddaa37ccac06b049934e097b068cae54539a455c151a66935055c14b',[]],
];
const proposal={status:'Unapplied exact-file proposal; Integration must review pins, manifest and source fence before runtime adoption',baseCommit:'37f573afca9023e8e4a92375375cea96638d120f',sourceCommit:'15e61f0bbd043930a578900862be9d5156b3b602',drawingCommit:'ebf0263d92cbe66c67a4ce5c64b822a3658031e8',sourcePr:'https://github.com/Amirkianfar66/GameN/pull/130',ports:{},assets:[],style:{source:'design/board-v2/css/page.css',sourceSha256:'7046e8c95857c361f82e9d1eb2f2776ea5b414c238e49cc132fc4c0739b20a72',disposition:'Review-page stylesheet excluded as a whole; exact component values are inputs to a future owned selector adaptation'},pending:'Claude capsule drawings/film/poses and revised fit module; no guessed source file or hash',excluded:['design/board-v2/js/page.js','design/board-v2/js/blackout-view.mjs','design/board-v2/js/blocked-view.mjs','design/board-v2/js/fixtures.mjs','design/board-v2/css/page.css as a runtime stylesheet','design/board-v2/contract/*.json as runtime data','design/board-v2/assets/manifest.json as runtime manifest','design/board-v2/review and design/tools controllers'],deferred:'Lighting/Blackout/ATTACK BLOCKED candidate packs stay inventoried separately; they are not prerequisites for the captions, nameplates, navigation or capsule public data boundary.'};
let patch='';
for(const [path,file,expected,replacements] of entries){
 const bytes=await readFile(join(source,path));if(hash(bytes)!==expected)throw Error(`Source pin mismatch: ${path}`);
 let text=bytes.toString('utf8');if(!text.startsWith('// mothership:dev-only\n'))throw Error(`Unexpected sentinel: ${path}`);text=text.slice('// mothership:dev-only\n'.length);
 for(const [from,to]of replacements){const token=`'${from}'`;if(text.split(token).length!==2)throw Error(`Import is not unique: ${path}: ${from}`);text=text.replace(token,`'${to}'`);}
 const runtime=`apps/game/hosted/board-v2-drawing/${file}`;
 proposal.ports[runtime]={source:path,sourceSha256:expected,runtimeSha256:hash(text),transformation:'Remove first dev-only comment line and rewrite only the listed imports',imports:Object.fromEntries(replacements)};
 const prepared=join(out,runtime);await mkdir(dirname(prepared),{recursive:true});await writeFile(prepared,text);
 patch+=`diff --git a/${runtime} b/${runtime}\nnew file mode 100644\n--- /dev/null\n+++ b/${runtime}\n@@ -0,0 +1,${text.trimEnd().split('\n').length} @@\n${text.trimEnd().split('\n').map(line=>'+'+line).join('\n')}\n`;
}
const manifest=JSON.parse(await readFile(join(source,'design/board-v2/assets/manifest.json'),'utf8'));
for(const file of (await readdir(join(source,'design/board-v2/assets/scenes'))).sort()){
 const path=`design/board-v2/assets/scenes/${file}`,bytes=await readFile(join(source,path));proposal.assets.push({source:path,sourceSha256:hash(bytes),disposition:'Exact SVG for common scene bundle; no per-role, per-claim or per-participant request'});
}
proposal.wardManifestSha256=hash(await readFile(join(source,'design/board-v2/assets/manifest.json')));
await mkdir(out,{recursive:true});await writeFile(join(out,'proposal.json'),JSON.stringify(proposal,null,2)+'\n');await writeFile(join(out,'ports.patch'),patch);
console.log(`${entries.length} exact proposed ports, ${proposal.assets.length} ward SVGs; no runtime file or shared pin edited. ${out}`);
