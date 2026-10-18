// Build-time common drawing supplement. The catalog is owned by Frontend; Integration
// pairs its exact output with a new immutable production art/Ready agreement.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export const FILMS_ART_CATALOG='apps/game/hosted/board-v2-film-art/catalog.json';
export const FILMS_ART_CATALOG_SHA256='16e7846488f3f9ca0be359bed1b8a34164d31dcde6f839d6e8b301e868a62636';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error(`Board V2 films art: ${message}`);};

/** The entire neutral drawing set. No role, seat, audience, match or action input. */
export function prepareBoardV2FilmsArt(root){
 const bytes=readFileSync(resolve(root,FILMS_ART_CATALOG));
 check(sha(bytes)===FILMS_ART_CATALOG_SHA256,'catalog differs');
 const catalog=JSON.parse(bytes),variables=new Set(),declarations=[];
 check(catalog.schemaVersion===1&&catalog.assets.length===100,'complete source set required');
 for(const asset of catalog.assets){
  check(asset.runtimePath.startsWith('apps/game/hosted/board-v2-film-art/')&&!asset.runtimePath.includes('..')&&!asset.runtimePath.includes('\\'),'unsafe source path');
  check(/^--board-v2-film-[a-z0-9-]+$/.test(asset.cssVariable)&&!variables.has(asset.cssVariable),'duplicate or invalid variable');
  variables.add(asset.cssVariable);
  const source=readFileSync(resolve(root,asset.runtimePath));
  check(sha(source)===asset.runtimeSha256,`source changed: ${asset.runtimePath}`);
  const svg=source.toString('utf8');
  check(svg.startsWith('<svg')&&svg.includes(`viewBox="${asset.viewBox}"`),'SVG geometry differs');
  check(!/<(?:script|foreignObject|image|style)\b/i.test(svg)&&!/\bon[a-z]+\s*=/i.test(svg)
   &&!/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)&&!/url\(\s*["']?(?!#)/i.test(svg),'non-static SVG');
  declarations.push(`  ${asset.cssVariable}: url("data:image/svg+xml,${encodeURIComponent(svg)}");`);
 }
 const stylesheet=`/* Mothership common medical, Captain, four-bed and Clone drawing art. */\n:root {\n${declarations.join('\n')}\n}\n`;
 const digest=sha(stylesheet);
 return Object.freeze({catalogSha256:FILMS_ART_CATALOG_SHA256,stylesheet,sha256:digest,url:`/art/board-v2-films.art.${digest.slice(0,10)}.css`,assetCount:catalog.assets.length,byteLength:Buffer.byteLength(stylesheet)});
}
