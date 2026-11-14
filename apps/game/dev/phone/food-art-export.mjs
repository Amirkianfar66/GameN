// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Offline, named SVG candidates only. This tool imports no Task simulator.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dressedFigureSvg} from '../../../../design/crew-drawing/source/wardrobe.mjs';
import {CREW, CREW_ORDER} from '../../../../design/crew-drawing/source/crew.mjs';
import {skeletonOf} from '../../../../design/board-motion/figures/gestures.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const manifest=JSON.parse(readFileSync(resolve(root,'docs/frontend/food-supply-art-adoption.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=process.argv.includes('--write');
if(process.argv.slice(2).some(a=>!['--check','--write'].includes(a))||process.argv.includes('--check')&&write)throw Error('Use --check or --write');
for(const [path,pin]of Object.entries({...manifest.sourcePins,...manifest.offlineOperatorExportClosure})){
 const bytes=readFileSync(resolve(root,path));
 if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)throw Error(`Approved drawing source differs: ${path}`);
}
const handoff=JSON.parse(readFileSync(resolve(root,'design/food-supply/handoff.json'),'utf8'));
const prefix='apps/game/candidates/food-supply/assets/';
const outputs=new Map(manifest.outputs.map(entry=>[entry.source,entry]));
const seen=new Set();
function output(path,content){
 const source=prefix+path,entry=outputs.get(source),bytes=Buffer.from(content);
 if(!entry||!source.startsWith(prefix)||source.includes('..')||seen.has(source))throw Error(`Unexpected candidate: ${source}`);
 if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error(`Candidate drawing differs: ${source}`);
 const target=resolve(root,source);
 if(write){mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}
 else if(!readFileSync(target).equals(bytes))throw Error(`Stored candidate differs: ${source}`);
 seen.add(source);
}
output('supply-room.back.svg',readFileSync(resolve(root,'design/food-supply/art/supply-room.back.svg')));
for(const id of CREW_ORDER)for(const station of ['panel','winch'])for(const state of ['alive','out']){
 const o=handoff.operators[station],part=`fs-op-${id}-${station}-${state}`;
 const svg=dressedFigureSvg(CREW[id],skeletonOf(state==='out'?o.down:o.gesture),{outfit:'crew',prefix:`${part}-${station}`,layer:'body'});
 // Exact station placement from scene.mjs drawOperator; the figure's anchor is (62,233)
 // inside its [-90,-40,300,300] frame. No gameplay coordinate is inferred here.
 const [fx,fy]=o.feet,s=o.scale,x=fx-152*s,y=fy-273*s;
 const placed=svg.replace(/^<svg([^>]*?) viewBox="([^"]*)"[^>]*>/,(_,attrs,vb)=>`<svg${attrs.replace(/ (?:width|height|preserveAspectRatio)="[^"]*"/g,'')} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(300*s).toFixed(1)}" height="${(300*s).toFixed(1)}" viewBox="${vb}">`);
 const [cx,cy,cw,ch]=handoff.boxes.cab;
 const body=station==='winch'?`<defs><clipPath id="${part}-cab-inside"><rect x="${cx}" y="${cy+18}" width="${cw}" height="${ch-18}"/></clipPath></defs><g clip-path="url(#${part}-cab-inside)">${placed}</g>`:placed;
 output(`operators/${id}-${station}-${state}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="1024" height="768">${body}</svg>\n`);
}
if(seen.size!==outputs.size||seen.size!==37)throw Error('Exactly the named 37 static candidates are required');
console.log(`Food static candidates: ${seen.size} byte-identical files; ${write?'written':'checked'}; no production admission.`);
