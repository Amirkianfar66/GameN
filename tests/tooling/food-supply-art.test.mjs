import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FOOD_STATIC_ART, prepareFoodSupplyArt, foodSupplyAssetsPlugin} from '../../scripts/food-supply-art.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
function fixture(t) {
  const folder = mkdtempSync(resolve(tmpdir(),'gamen-food-art-'));
  t.after(() => rmSync(folder,{recursive:true,force:true}));
  const record = JSON.parse(readFileSync(resolve(root,FOOD_STATIC_ART)));
  for (const path of [FOOD_STATIC_ART,...Object.keys(record.inputs),...record.assets.map(a => a.source)]) {
    const destination = resolve(folder,path);
    mkdirSync(dirname(destination),{recursive:true});
    writeFileSync(destination,readFileSync(resolve(root,path)));
  }
  return {folder,record};
}

test('Food artwork build emits the complete uniform 37-file set without executing design code', () => {
  const assets = prepareFoodSupplyArt(root), emitted = [];
  assert.equal(assets.length,37);
  assert.equal(new Set(assets.map(a => a.url)).size,37);
  assert.equal(assets.reduce((n,a) => n+a.bytes.length,0),3613319);
  const plugin = foodSupplyAssetsPlugin(root);
  plugin.buildStart.call({emitFile:file => emitted.push(file)});
  assert.deepEqual(emitted.map(file => '/'+file.fileName), assets.map(a => a.url));
  assert.ok(emitted.every(file => file.type==='asset' && Buffer.isBuffer(file.source)));
  assert.ok(!emitted.some(file => /review|stills|\.mjs$|\.html$/.test(file.fileName)));
});

test('an edited static inventory cannot authorize a replacement asset', t => {
  const {folder,record} = fixture(t);
  record.assets[0].source = 'design/food-supply/phone.mjs';
  writeFileSync(resolve(folder,FOOD_STATIC_ART),JSON.stringify(record));
  assert.throws(() => prepareFoodSupplyArt(folder),/independent static inventory differs/);
});

test('changed SVG bytes fail even when their published name is unchanged', t => {
  const {folder,record} = fixture(t), path = record.assets[0].source;
  writeFileSync(resolve(folder,path),Buffer.concat([readFileSync(resolve(folder,path)),Buffer.from(' ')]));
  assert.throws(() => prepareFoodSupplyArt(folder),/input differs/);
});

test('a symbolic link cannot replace a hash-identical static source', t => {
  const {folder,record} = fixture(t), path = record.assets[0].source;
  unlinkSync(resolve(folder,path));
  symlinkSync(resolve(root,path),resolve(folder,path));
  assert.throws(() => prepareFoodSupplyArt(folder),/regular input required/);
});

test('development requests receive only named static files; unknown paths pass through', () => {
  let serve;
  foodSupplyAssetsPlugin(root).configureServer({middlewares:{use:handler => {serve=handler;}}});
  const headers = {}, response = {setHeader:(k,v) => {headers[k]=v;}, end:value => {response.body=value;}};
  let passed = 0;
  serve({url:'/art/food-supply/supply-room.back.svg?review=1'},response,() => passed++);
  assert.ok(Buffer.isBuffer(response.body));assert.equal(headers['content-type'],'image/svg+xml');assert.equal(passed,0);
  serve({url:'/art/food-supply/../review/private.svg'},response,() => passed++);
  assert.equal(passed,1);
});
