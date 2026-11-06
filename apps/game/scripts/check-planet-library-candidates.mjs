// Verifies the proposed source bytes and keeps unapproved candidates out of publication.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)),proposal=JSON.parse(readFileSync(resolve(root,'docs/frontend/planet-library-adoption-proposal.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),digests=new Set(),urls=new Set();
assert.equal(proposal.designerHead,'ff7b689a17282e63606506bbf151d79c7da858fc');assert.equal(proposal.groups.length,8);assert.equal(proposal.files.length,20);
for(const entry of proposal.files){
 assert.equal(entry.productionAdopted,false);assert.ok(entry.candidate.startsWith('apps/game/candidates/planet-library/')&&!entry.candidate.includes('..'));assert.ok(!entry.source.includes('/review/'));assert.ok(!urls.has(entry.url));urls.add(entry.url);
 const bytes=readFileSync(resolve(root,entry.candidate));assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);digests.add(entry.sha256);
 const publication=entry.proposedPublication;assert.equal(publication.requiresIntegrationApproval,true);assert.equal(publication.published,false);
 const normalized=entry.kind==='stylesheet'?Buffer.from(bytes.toString('utf8').replace('mothership:dev-only · ',''),'utf8'):bytes;assert.equal(normalized.length,publication.bytes);assert.equal(hash(normalized),publication.sha256);digests.add(publication.sha256);
}
const files=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(resolve(directory,item.name)):[resolve(directory,item.name)]);
const at=process.argv.indexOf('--bundle');let scanned=0;
if(at>=0){const directory=resolve(process.argv[at+1]);for(const path of files(directory)){
 const bytes=readFileSync(path);assert.ok(!digests.has(hash(bytes)),`Unapproved candidate in production: ${path}`);
 if(['.js','.css','.html'].includes(extname(path))){const body=bytes.toString('utf8');for(const url of urls)assert.ok(!body.includes(url),`Candidate URL reached publication: ${path}`);}scanned++;
}}
console.log(`Planet candidate provenance: 20 exact candidates, 8 groups; unapproved bytes absent from ${scanned} production files`);
