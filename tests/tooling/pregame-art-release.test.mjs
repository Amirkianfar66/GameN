import {pregameProductionFixturePaths,restoreHistoricalPregameFixture} from './support/pregame-production-fixture.mjs';
import {PREGAME_PRODUCTION_CONSUMER_APPROVAL,readPregameConsumerApproval} from '../../scripts/pregame-consumer-approval.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {CREW_ART_VERSION, CREW_CONSUMER_APPROVAL, PREGAME_ART_VERSION, RUNTIME_ART_VERSION,
  readCrewConsumerApproval, readRuntimeArtRelease, assertRuntimeArtOutput} from '../../scripts/runtime-art-release.mjs';
import {PREGAME_APPROVAL, readPregameSourceApproval} from '../../scripts/pregame-runtime-ports.mjs';
import {PREGAME_CONSUMER_CANDIDATE,PREGAME_CONSUMER_REVIEW_ENV} from '../../scripts/pregame-consumer-candidate.mjs';
import {pregameAssetsPlugin} from '../../scripts/pregame-art-release.mjs';
import {comicAssetsPlugin} from '../../apps/game/hosted/comic-assets.mjs';
import {planetLibraryAssetsPlugin} from '../../apps/game/hosted/build/planet-library-art.mjs';
import {crewDrawingAssetsPlugin} from '../../scripts/crew-drawing-art.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(join(root,path));
function temporary(t){const dir=mkdtempSync(join(tmpdir(),'gamen-pregame-release-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
function seed(t){
  const dir=temporary(t),release=readRuntimeArtRelease(root,PREGAME_ART_VERSION),approval=readPregameSourceApproval(root);
  const paths=new Set([...pregameProductionFixturePaths(root),'design/releases/design-0.8.0.json','design/releases/design-0.7.0.json','design/releases/design-0.6.0.json','design/releases/design-0.5.0.json',release.integrationApproval.path,release.libraryIntegrationApproval.path,
    approval.approvedRuntimeHook.evidence.path,PREGAME_CONSUMER_CANDIDATE,CREW_CONSUMER_APPROVAL,...Object.keys(readCrewConsumerApproval(root).requiredFiles),
    ...Object.keys(release.sources),...Object.keys(release.runtimeFiles),
    ...Object.keys(approval.sourcePins),...Object.keys(approval.runtimePins)]);
  const candidate=JSON.parse(read(PREGAME_CONSUMER_CANDIDATE));
  for(const entry of Object.values(candidate.files)){
    paths.add(entry.candidateBlob);
    for(const digest of entry.acceptedPreviousHashes)paths.add(`design/releases/historical-blobs/${digest}`);
  }
  for(const path of paths){mkdirSync(dirname(join(dir,path)),{recursive:true});cpSync(join(root,path),join(dir,path));}
  return dir;
}

test('pregame source registration preserves published artwork, gameplay pins and creation defaults',()=>{
  const release=readRuntimeArtRelease(root,PREGAME_ART_VERSION),previous=readRuntimeArtRelease(root,CREW_ART_VERSION);
  assert.equal(release.registrationScope,'source-ports');
  assert.equal(release.consumerFinalization,undefined,'crew07 finalization must not imply pregame consumer acceptance');
  assert.equal(release.baseManifest.path,'design/releases/design-0.7.0.json');
  assert.equal(release.baseManifest.sha256,previous.manifestSha256);
  for(const key of ['gameplayPins','tokens','bundles','media','consumerApproval'])assert.deepEqual(release[key],previous[key],key);
  for(const key of ['sources','runtimeFiles'])for(const [path,digest]of Object.entries(previous[key]))assert.equal(release[key][path],digest,path);
  assert.equal(Object.keys(release.runtimeFiles).length-Object.keys(previous.runtimeFiles).length,22);
  assert.equal(release.pregameRelease.ports,22);
  assert.deepEqual(release.pregameRelease.durationsMs,{brand:2000,role:10000,boarding:10000});
  assert.equal(release.pregameRelease.boardingSetupFlowVersion,2);
  assert.equal(RUNTIME_ART_VERSION,'design-0.5.0');
  assert.equal(hash(read('design/releases/design-0.6.0.json')),'eeb4a88c7b71166a1c9782231ccd7fa81931cb50eed112e3d6153a862751bec4');
  assert.equal(hash(read('design/releases/design-0.7.0.json')),'0ab15cfec53dd7be09d265685ffada52e01d26681b9a2b7d02c17c2b30b1da79');
});

test('source checkpoint excludes review artifacts and does not authorize the pending app consumer',t=>{
  const release=readRuntimeArtRelease(root,PREGAME_ART_VERSION);
  for(const path of [...Object.keys(release.sources),...Object.keys(release.runtimeFiles)]){
    assert.doesNotMatch(path,/\/(review|stills)\/|REVIEW_ROSTERS/);
    assert.doesNotMatch(path,/design\/pregame-films\/.*(?:stage|films|renders)\.(?:mjs|html)$/);
  }
  const dir=seed(t);
  const production=readPregameConsumerApproval(root);
  writeFileSync(join(dir,'apps/game/hosted/crew-runtime.mjs'),'// unreviewed consumer');
  for(const version of ['design-0.6.0',CREW_ART_VERSION,PREGAME_ART_VERSION])
    assert.throws(()=>readRuntimeArtRelease(dir,version),production?/^Error: (?:Pregame consumer candidate|Phone UI production consumer): current content differs:/:/crew consumer content differs/);
});

test('source or runtime drift and a self-edited candidate manifest fail independently',t=>{
  const dir=seed(t),approval=readPregameSourceApproval(root);
  for(const path of [Object.keys(approval.sourcePins)[0],Object.keys(approval.runtimePins)[0],PREGAME_APPROVAL]){
    writeFileSync(join(dir,path),'// drift');
    assert.throws(()=>readRuntimeArtRelease(dir,PREGAME_ART_VERSION));
    cpSync(join(root,path),join(dir,path));
  }
  const path='design/releases/design-0.8.0.json',manifest=JSON.parse(readFileSync(join(dir,path)));
  manifest.registrationScope='adopted';writeFileSync(join(dir,path),JSON.stringify(manifest));
  assert.throws(()=>readRuntimeArtRelease(dir,PREGAME_ART_VERSION),readPregameConsumerApproval(root)?/art manifest binding differs/:/approved manifest differs/);
  assert.throws(()=>readRuntimeArtRelease(root,'design-0.8.1'),/unknown art release/);
});

test('new build guard validates source registration without emitting assets or activating setup',t=>{
  const plugin=pregameAssetsPlugin(root);let emitted=0;
  plugin.buildStart.call({emitFile(){emitted++;}});plugin.configureServer({});assert.equal(emitted,0);
  const dir=seed(t);writeFileSync(join(dir,'apps/game/hosted/pregame-films/kit/cast.mjs'),'// changed hook');
  assert.throws(()=>pregameAssetsPlugin(dir).buildStart());
});

test('unchanged complete uniform output validates for06,07 and source registration08',t=>{
  const output=temporary(t),context={emitFile(file){const path=join(output,file.fileName);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,file.source);}};
  for(const plugin of [comicAssetsPlugin(root),planetLibraryAssetsPlugin(root),crewDrawingAssetsPlugin(root),pregameAssetsPlugin(root)])plugin.buildStart.call(context);
  for(const version of ['design-0.6.0',CREW_ART_VERSION,PREGAME_ART_VERSION])assert.equal(assertRuntimeArtOutput(readRuntimeArtRelease(root,version),output),27);
});

// Materialize the exact local-review checkpoint without final production acceptance.
test('explicit local review accepts only the complete reviewed candidate while preserving old release identities',t=>{
  const dir=seed(t),record=JSON.parse(read(PREGAME_CONSUMER_CANDIDATE));
  restoreHistoricalPregameFixture(root,dir);
  rmSync(join(dir,PREGAME_PRODUCTION_CONSUMER_APPROVAL),{force:true});
  for(const [path,entry]of Object.entries(record.files)){mkdirSync(dirname(join(dir,path)),{recursive:true});cpSync(join(root,entry.candidateBlob),join(dir,path));}
  assert.throws(()=>readRuntimeArtRelease(dir,PREGAME_ART_VERSION),/crew consumer content differs/);
  const old=process.env[PREGAME_CONSUMER_REVIEW_ENV];
  process.env[PREGAME_CONSUMER_REVIEW_ENV]='1';
  try{
    for(const version of ['design-0.6.0',CREW_ART_VERSION,PREGAME_ART_VERSION]){
      const release=readRuntimeArtRelease(dir,version);
      assert.equal(release.manifestSha256,hash(read(`design/releases/${version}.json`)));
    }
    pregameAssetsPlugin(dir).configureServer({});
    writeFileSync(join(dir,'apps/game/hosted/planet/app.mjs'),'// unreviewed successor');
    assert.throws(()=>readRuntimeArtRelease(dir,PREGAME_ART_VERSION),/current content differs/);
  }finally{if(old===undefined)delete process.env[PREGAME_CONSUMER_REVIEW_ENV];else process.env[PREGAME_CONSUMER_REVIEW_ENV]=old;}
});
