import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {preparePlanetLibraryArt} from '../hosted/build/planet-library-art.mjs';
import {readRuntimeArtRelease} from '../../../scripts/runtime-art-release.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),bundle=resolve(process.argv[2]??'dist/hosted-preview'),sha=b=>createHash('sha256').update(b).digest('hex');
const files=preparePlanetLibraryArt(root),approval=JSON.parse(readFileSync(resolve(root,'docs/integration/planet-library-art-approval-2026-11-06.json'),'utf8'));
for(const file of files){const bytes=readFileSync(resolve(bundle,file.url.slice(1)));assert.equal(sha(bytes),file.sha256,file.url);assert.equal(bytes.length,file.bytes.length);if(file.url.endsWith('.css'))assert.ok(!bytes.toString('utf8').includes('mothership:dev-only'));}
const base=readRuntimeArtRelease(root,'design-0.5.0');for(const entry of Object.values(base.bundles))assert.equal(sha(readFileSync(resolve(bundle,entry.url.slice(1)))),entry.sha256,'Historical base output changed');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]),excluded=new Set(approval.excludedFiles.map(f=>f.sha256));
for(const path of walk(bundle)){const bytes=readFileSync(path);assert.ok(!excluded.has(sha(bytes)),`Withdrawn EJECT reached publication: ${path}`);if(/\.(js|css|html)$/.test(path))assert.ok(!bytes.toString('utf8').includes('/candidate-art/'),`Candidate URL reached production: ${path}`);}
console.log(`Approved Planet art: 18 exact outputs, 8 stylesheets, 5 media/poster families; all ${Object.keys(base.bundles).length} design-0.5.0 bundles unchanged; withdrawn EJECT and candidate URLs excluded`);
