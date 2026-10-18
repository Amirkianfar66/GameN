import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareBoardV2FilmsArt,FILMS_ART_CATALOG} from '../hosted/build/board-v2-films-art.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('all fourteen reviewed pure ports and one hundred SVG derivatives retain their recorded bytes',async()=>{
 const proof=JSON.parse(readFileSync(resolve(root,'docs/frontend/designer-films-runtime-provenance.json'),'utf8'));
 assert.equal(proof.modules.length,14);assert.equal(proof.assets.length,100);
 for(const item of [...proof.modules,...proof.assets]){
  const bytes=readFileSync(resolve(root,item.runtimePath));assert.equal(sha(bytes),item.runtimeSha256,item.runtimePath);
  assert.match(item.sourceSha256,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(bytes.toString('utf8'),/mothership:dev-only/);
 }
 for(const item of proof.modules)await import(new URL(`../../../${item.runtimePath}`,import.meta.url));
});

test('the entire film supplement is deterministic, static and independent of audience or role',()=>{
 const art=prepareBoardV2FilmsArt(root),again=prepareBoardV2FilmsArt(root);
 assert.equal(art.assetCount,100);assert.equal(art.sha256,again.sha256);
 assert.equal(sha(art.stylesheet),art.sha256);assert.equal(Buffer.byteLength(art.stylesheet),art.byteLength);
 assert.equal((art.stylesheet.match(/: url\("data:image\/svg\+xml,/g)??[]).length,100);
 assert.doesNotMatch(art.stylesheet,/https?:\/\/|@import|mothership:dev-only/);
 assert.equal(art.url,`/art/board-v2-films.art.${art.sha256.slice(0,10)}.css`);
});

test('the film supplement fails closed on any unreviewed catalog or SVG derivative',()=>{
 const temp=mkdtempSync(join(tmpdir(),'gamen-film-art-'));
 try{
  const original=readFileSync(resolve(root,FILMS_ART_CATALOG));
  const catalog=JSON.parse(original),path=resolve(temp,FILMS_ART_CATALOG);
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,original);
  const first=catalog.assets[0],asset=resolve(temp,first.runtimePath);
  mkdirSync(dirname(asset),{recursive:true});writeFileSync(asset,readFileSync(resolve(root,first.runtimePath))+' ');
  assert.throws(()=>prepareBoardV2FilmsArt(temp),/source changed/);
  catalog.assets.pop();writeFileSync(path,JSON.stringify(catalog));
  assert.throws(()=>prepareBoardV2FilmsArt(temp),/catalog differs/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
