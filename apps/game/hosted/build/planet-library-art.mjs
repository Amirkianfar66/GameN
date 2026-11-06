import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {PLANET_LIBRARY_GROUPS,PLANET_LIBRARY_MEDIA} from '../planet/library-assets.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const APPROVAL='9493e29a8ce1b06c6848846b0c8932d65c42abcb24b2b43aaf35ed7239aaf228';

/** Build only: the existing 0.5.0 fence stays intact; this adds the exact reviewed 0.6.0 supplement. */
export function preparePlanetLibraryArt(root){
 const record=readFileSync(resolve(root,'docs/integration/planet-library-art-approval-2026-11-06.json'));
 assert.equal(digest(record),APPROVAL,'Integration artwork approval changed');const approval=JSON.parse(record);
 const adoption=JSON.parse(readFileSync(resolve(root,'docs/frontend/planet-library-art-adoption.json'),'utf8'));
 assert.equal(adoption.approvalSha256,APPROVAL);assert.equal(adoption.assetManifestVersion,'design-0.6.0');assert.equal(approval.designerHead,'0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878');
 assert.deepEqual(adoption.files,approval.approvedFiles);assert.deepEqual(adoption.groups,PLANET_LIBRARY_GROUPS);assert.deepEqual(adoption.media,PLANET_LIBRARY_MEDIA);assert.equal(approval.approvedFiles.length,18);
 const files=approval.approvedFiles.map(file=>{
  assert.ok(file.consumerCandidate.startsWith('apps/game/candidates/planet-library/')&&!file.consumerCandidate.includes('..'));assert.ok(!/\/(review|stills)\//.test(file.source));
  const source=readFileSync(resolve(root,file.consumerCandidate));assert.equal(digest(source),file.sha256);assert.equal(source.length,file.bytes);
  let bytes=source;if(file.kind==='stylesheet'){const text=source.toString('utf8');assert.ok(text.startsWith('/* mothership:dev-only · '));bytes=Buffer.from(text.replace('mothership:dev-only · ',''));}
  assert.equal(digest(bytes),file.publication.sha256);assert.equal(bytes.length,file.publication.bytes);assert.ok(/^art\/planet-library\/[a-z0-9.-]+\.(css|mp4|webp)$/.test(file.publication.target));
  return {url:'/'+file.publication.target,bytes,sha256:file.publication.sha256};
 });
 const urls=new Set(files.map(f=>f.url));assert.equal(urls.size,18);for(const group of PLANET_LIBRARY_GROUPS)assert.ok(urls.has(group.url));for(const film of PLANET_LIBRARY_MEDIA)for(const key of ['video','poster'])assert.ok(urls.has(film[key]));
 return files;
}
export function planetLibraryAssetsPlugin(root){return {name:'planet-reviewed-library-art',buildStart(){for(const file of preparePlanetLibraryArt(root))this.emitFile({type:'asset',fileName:file.url.slice(1),source:file.bytes});},configureServer(server){const files=preparePlanetLibraryArt(root);server.middlewares.use((req,res,next)=>{const file=files.find(f=>f.url===req.url?.split('?')[0]);if(!file)return next();res.setHeader('content-type',file.url.endsWith('.css')?'text/css':file.url.endsWith('.mp4')?'video/mp4':'image/webp');res.end(file.bytes);});}};}
