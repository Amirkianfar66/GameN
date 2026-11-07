import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CREW_CONSUMER_APPROVAL, readCrewConsumerApproval, readRuntimeArtRelease, assertRuntimeArtOutput, PLANET_ART_VERSION, PLANET_ART_MANIFEST } from '../../scripts/runtime-art-release.mjs';
import { preparePlanetLibraryArt } from '../../apps/game/hosted/build/planet-library-art.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = () => readRuntimeArtRelease(root, PLANET_ART_VERSION);
function candidate(t) {
  const output=mkdtempSync(join(tmpdir(),'gamen-planet-art-'));
  t.after(()=>rmSync(output,{recursive:true,force:true}));
  const release=manifest();
  const files=new Set([PLANET_ART_MANIFEST,release.baseManifest.path,release.integrationApproval.path,
    CREW_CONSUMER_APPROVAL,...Object.keys(readCrewConsumerApproval(root).requiredFiles),
    ...Object.keys(release.sources),...Object.keys(release.runtimeFiles)]);
  for(const path of files){mkdirSync(dirname(join(output,path)),{recursive:true});cpSync(join(root,path),join(output,path));}
  return output;
}
test('Planet registry binds the reviewed exact authority, common catalogue and inherited board',()=>{
  const release=manifest();
  assert.equal(release.gameplayPins.engineVersion,'planet-game-1.1.0');
  assert.equal(Object.keys(release.bundles).length,17);
  assert.deepEqual(Object.keys(release.media).sort(),['arrival-blue','arrival-red','blackhole','rescue','transit']);
  const legacy=readRuntimeArtRelease(root);
  assert.equal(legacy.manifestVersion,'design-0.5.0');
  for(const [name,entry] of Object.entries(legacy.bundles))assert.deepEqual(release.bundles[name],entry);
});
test('every emitted Planet stylesheet and film has the exact registered publication bytes',t=>{
  const output=mkdtempSync(join(tmpdir(),'gamen-planet-output-'));
  t.after(()=>rmSync(output,{recursive:true,force:true}));
  const files=preparePlanetLibraryArt(root),release=manifest();
  for(const file of files){const path=join(output,file.url.slice(1));mkdirSync(dirname(path),{recursive:true});writeFileSync(path,file.bytes);}
  const supplement={...release,bundles:Object.fromEntries(Object.entries(release.bundles).filter(([name])=>name.startsWith('planet-library-')))};
  assert.equal(assertRuntimeArtOutput(supplement,output),18);
  const video=join(output,release.media.blackhole.video.slice(1));writeFileSync(video,'wrong or truncated movie');
  assert.throws(()=>assertRuntimeArtOutput(supplement,output),/published output differs: blackhole-video/);
});
test('substitution of a review movie cannot be authorized by editing the manifest',t=>{
  const output=candidate(t),path=join(output,PLANET_ART_MANIFEST),release=JSON.parse(readFileSync(path,'utf8'));
  release.media.blackhole.video='/review/eject.mp4';writeFileSync(path,JSON.stringify(release));
  assert.throws(()=>readRuntimeArtRelease(output,PLANET_ART_VERSION),/approved manifest differs/);
});
test('changed approval and changed source bytes fail the independent release check',t=>{
  const output=candidate(t),release=manifest();
  writeFileSync(join(output,release.integrationApproval.path),'{}');
  assert.throws(()=>readRuntimeArtRelease(output,PLANET_ART_VERSION),/content differs|integration approval differs/);
  cpSync(join(root,release.integrationApproval.path),join(output,release.integrationApproval.path));
  const source=Object.keys(release.sources).find(path=>path.includes('candidates/planet-library/')&&path.endsWith('.mp4'));
  assert.ok(source);writeFileSync(join(output,source),'different movie');
  assert.throws(()=>readRuntimeArtRelease(output,PLANET_ART_VERSION),/content differs/);
});
