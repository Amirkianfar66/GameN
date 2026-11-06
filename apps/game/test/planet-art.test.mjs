import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS} from '@mothership/contracts';
import {readPlanetView} from '../dist/index.js';
import {planetView} from './planet-support.mjs';
import {createPlanetLibraryAssets} from '../hosted/planet/art.mjs';
import {PLANET_LIBRARY_GROUPS} from '../hosted/planet/library-assets.mjs';
import {preparePlanetLibraryArt} from '../hosted/build/planet-library-art.mjs';
import {fileURLToPath} from 'node:url';

test('library art is an explicit new-match pairing; old packets retain the old artwork pin',()=>{
 const v=planetView();v.versions.assetManifestVersion='design-0.6.0';assert.ok(readPlanetView(v,v.matchId,v.self.seatId));
 for(const pins of [PLANET_ORIGINAL_PINS,PLANET_SYNC_PINS]){const old=structuredClone(v);old.versions={...pins,assetManifestVersion:'design-0.6.0'};delete old.abilities.engineerCapture;delete old.abilities.panelRequest;assert.equal(readPlanetView(old,old.matchId,old.self.seatId),null);old.versions.assetManifestVersion='design-0.5.0';assert.ok(readPlanetView(old,old.matchId,old.self.seatId));}
});
test('every role receives the same catalogue while only the verified new art pin activates it',async()=>{
 function document(){const links=[],root={dataset:{art:'board-v2-art'}},d=new EventTarget();d.documentElement=root;d.links=links;d.defaultView={Event,setTimeout:()=>1,clearTimeout:()=>{}};d.createElement=()=>{const link=new EventTarget();link.remove=()=>{link.removed=true;};return link;};d.head={append:link=>links.push(link)};return d;}
 const a=document(),b=document(),one=createPlanetLibraryAssets(a),two=createPlanetLibraryAssets(b),v=planetView().versions;
 one.setVersions(v);two.setVersions({...v,assetManifestVersion:'design-0.6.0'});assert.deepEqual(a.links.map(l=>l.href),b.links.map(l=>l.href));assert.equal(a.links.length,8);
 for(const doc of [a,b])for(const link of doc.links)link.dispatchEvent(new Event('load'));await Promise.all([one.ready,two.ready]);
 for(const group of PLANET_LIBRARY_GROUPS){assert.ok(!a.documentElement.dataset.art.split(' ').includes(group.token));assert.ok(b.documentElement.dataset.art.split(' ').includes(group.token));}
 two.setVersions(null);assert.equal(b.documentElement.dataset.art,'board-v2-art');one.dispose();two.dispose();assert.ok([...a.links,...b.links].every(l=>l.removed));
});
test('build input is the exact approved set with only its recorded CSS normalization',()=>{
 const files=preparePlanetLibraryArt(fileURLToPath(new URL('../../../',import.meta.url)));assert.equal(files.length,18);assert.equal(files.filter(f=>f.url.endsWith('.css')).length,8);assert.ok(files.every(f=>!f.url.includes('eject')&&!f.url.includes('/review/')&&!f.url.includes('/stills/')));
});
