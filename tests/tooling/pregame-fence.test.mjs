import {pregameProductionFixturePaths,restoreHistoricalPregameFixture} from './support/pregame-production-fixture.mjs';
import {PREGAME_PRODUCTION_CONSUMER_APPROVAL,readPregameConsumerApproval} from '../../scripts/pregame-consumer-approval.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {CANDIDATE_DRAWING_POLICY,PLANET_DRAWING_POLICY,CREW_DRAWING_POLICY,CREW_CONSUMER_DRAWING_POLICY,
  PREGAME_DRAWING_POLICY,PREGAME_PRODUCTION_DRAWING_POLICY,PHONE_UI_PRODUCTION_DRAWING_POLICY,
  readDrawingPolicy,productionDrawingProblems,prototypeReferences} from '../../design/tools/lib/drawing-port-fence.mjs';
import {PREGAME_CONSUMER_CANDIDATE,PREGAME_CONSUMER_REVIEW_ENV} from '../../scripts/pregame-consumer-candidate.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const prefix='apps/game/hosted/pregame-films/';
function fixture(t){
  const target=mkdtempSync(join(tmpdir(),'gamen-pregame-fence-'));t.after(()=>rmSync(target,{recursive:true,force:true}));
  const policy=readDrawingPolicy(root),paths=new Set([...pregameProductionFixturePaths(root),
    CANDIDATE_DRAWING_POLICY,PLANET_DRAWING_POLICY,CREW_DRAWING_POLICY,CREW_CONSUMER_DRAWING_POLICY,PREGAME_DRAWING_POLICY,
    'design/tools/lib/reviewed-drawing-ports.json',...Object.keys(policy.requiredFiles),...Object.keys(policy.sourceHashes),
    ...Object.keys(policy.ports),...Object.keys(policy.styles),...Object.keys(policy.metadataFiles),...Object.keys(policy.buildFiles),
    ...Object.values(policy.styles).map(entry=>entry.source),...Object.values(policy.buildFiles).flatMap(entry=>Object.keys(entry.assetHashes)),
  ]);
  for(const path of paths){mkdirSync(dirname(join(target,path)),{recursive:true});cpSync(join(root,path),join(target,path));}
  return target;
}
const append=(target,path,value)=>writeFileSync(join(target,path),readFileSync(join(target,path),'utf8')+value);
const rejects=async(target,pattern)=>assert.match((await productionDrawingProblems(target)).join('\n'),pattern);

test('phone adoption retains every drawing port, source pin and style while admitting exact native files only', async t=>{
  const target=fixture(t),current=readDrawingPolicy(target);
  rmSync(join(target,PHONE_UI_PRODUCTION_DRAWING_POLICY));
  const previous=readDrawingPolicy(target);
  for(const key of ['ports','sourceHashes','styles'])assert.deepEqual(current[key],previous[key],key);
  assert.equal(Object.keys(current.ports).length,78);
  assert.equal(Object.keys(current.sourceHashes).length,83);
  assert.notDeepEqual(current.requiredFiles,previous.requiredFiles);
  assert.notDeepEqual(await productionDrawingProblems(target),[], 'new native bytes require their exact fence supplement');
  cpSync(join(root,PHONE_UI_PRODUCTION_DRAWING_POLICY),join(target,PHONE_UI_PRODUCTION_DRAWING_POLICY));
  assert.deepEqual(await productionDrawingProblems(target),[]);
});

test('a malformed or symlinked phone fence supplement cannot silently fall back', t=>{
  const target=fixture(t),path=join(target,PHONE_UI_PRODUCTION_DRAWING_POLICY);
  append(target,PHONE_UI_PRODUCTION_DRAWING_POLICY,'\n');
  assert.throws(()=>readDrawingPolicy(target),/Phone UI drawing approval content hash differs/);
  rmSync(path);symlinkSync(join(root,PHONE_UI_PRODUCTION_DRAWING_POLICY),path);
  assert.throws(()=>readDrawingPolicy(target),/Phone UI drawing approval must be a regular file/);
});
function candidateFixture(t){
  const target=fixture(t),candidate=JSON.parse(readFileSync(join(target,PREGAME_CONSUMER_CANDIDATE)));
  restoreHistoricalPregameFixture(root,target);
  for(const [path,entry] of Object.entries(candidate.files)){
    mkdirSync(dirname(join(target,path)),{recursive:true});cpSync(join(target,entry.candidateBlob),join(target,path));
  }
  return {target,candidate};
}
async function reviewMode(value,run){
  const previous=process.env[PREGAME_CONSUMER_REVIEW_ENV];
  if(value===undefined)delete process.env[PREGAME_CONSUMER_REVIEW_ENV];else process.env[PREGAME_CONSUMER_REVIEW_ENV]=value;
  try{return await run();}finally{
    if(previous===undefined)delete process.env[PREGAME_CONSUMER_REVIEW_ENV];else process.env[PREGAME_CONSUMER_REVIEW_ENV]=previous;
  }
}

test('pregame supplements authorize exactly 22 named drawing derivatives while all historical policies still pass',async t=>{
  const policy=readDrawingPolicy(root),ports=Object.keys(policy.ports).filter(path=>path.startsWith(prefix));
  assert.equal(ports.length,22);assert.ok(ports.every(path=>path.endsWith('.mjs')&&!/(?:review|stage|fixtures|renders)/.test(path)));
  const catalog=JSON.parse(readFileSync(join(root,'design/releases/pregame-runtime-ports.json')));
  assert.equal(catalog.dependencies.length,22);
  for(const entry of [...catalog.entries,...catalog.dependencies]){
    assert.equal(policy.requiredFiles[entry.source],entry.sourceSha256);
    assert.equal(policy.requiredFiles[entry.runtime],entry.runtimeSha256);
  }
  for(const path of ports)assert.doesNotMatch(readFileSync(join(root,path),'utf8'),/REVIEW_ROSTERS/);
  assert.deepEqual(await productionDrawingProblems(root),[]);
  assert.deepEqual(await productionDrawingProblems(fixture(t)),[]);
});

test('every unlisted pregame file is refused, including nested review media and fixture/stage entries',async t=>{
  const target=fixture(t);
  for(const file of ['extra.mjs','roles/extra.mjs','review/preview.mp4','stage.html','stage.mjs','films.mjs','renders.mjs','boarding/fixtures.mjs']){
    const path=prefix+file;mkdirSync(dirname(join(target,path)),{recursive:true});writeFileSync(join(target,path),'unreviewed');
    assert.ok((await productionDrawingProblems(target)).some(problem=>problem.startsWith(path+': unreviewed file')),path);
    rmSync(join(target,path));
  }
});

test('missing or altered pregame ports and fixture-tail reinsertion cannot inherit directory approval',async t=>{
  const target=fixture(t),path=prefix+'boarding/roster.mjs';
  rmSync(join(target,path));await rejects(target,/boarding\/roster\.mjs: required candidate drawing input differs/);
  cpSync(join(root,path),join(target,path));append(target,path,'\nexport const REVIEW_ROSTERS = {};\n');
  await rejects(target,/boarding\/roster\.mjs: reviewed drawing port content hash differs/);
});

test('altered source and frozen crew/rig dependencies fail independently of unchanged derivative metadata',async t=>{
  const target=fixture(t);
  for(const path of ['design/pregame-films/roles/doctor.mjs','design/crew-drawing/source/crew.mjs','design/board-motion/figures/motion.mjs',
    'apps/game/hosted/crew-drawing/crew.mjs','apps/game/hosted/scene-drawing/motion.mjs']){
    append(target,path,'\n// changed\n');await rejects(target,/frozen drawing source hash differs|required candidate drawing input differs/);
    cpSync(join(root,path),join(target,path));
  }
});

test('catalog or source-approval claims cannot repin an altered runtime port',async t=>{
  const target=fixture(t),catalog='design/releases/pregame-runtime-ports.json',approval='docs/integration/pregame-source-art-approval-2026-11-08.json';
  for(const path of [catalog,approval]){
    append(target,path,'\n');await rejects(target,/required candidate drawing input differs/);cpSync(join(root,path),join(target,path));
  }
  const cast=prefix+'kit/cast.mjs';
  append(target,cast,'\n// self-issued hook\n');
  const hash=createHash('sha256').update(readFileSync(join(target,cast))).digest('hex');
  const changedCatalog=JSON.parse(readFileSync(join(target,catalog)));
  changedCatalog.entries.find(entry=>entry.runtime===cast).runtimeSha256=hash;
  writeFileSync(join(target,catalog),JSON.stringify(changedCatalog,null,2)+'\n');
  const changedApproval=JSON.parse(readFileSync(join(target,approval)));
  changedApproval.runtimePins[cast]=hash;
  writeFileSync(join(target,approval),JSON.stringify(changedApproval,null,2)+'\n');
  await rejects(target,/cast\.mjs: reviewed drawing port content hash differs/);
  await rejects(target,/pregame-runtime-ports\.json: required candidate drawing input differs/);
  await rejects(target,/pregame-source-art-approval-2026-11-08\.json: required candidate drawing input differs/);
  const changedPolicy=JSON.parse(readFileSync(join(target,PREGAME_DRAWING_POLICY)));
  changedPolicy.ports[cast].sha256=hash;
  changedPolicy.requiredFiles[cast]=hash;
  writeFileSync(join(target,PREGAME_DRAWING_POLICY),JSON.stringify(changedPolicy,null,2)+'\n');
  await rejects(target,/Pregame drawing approval content hash differs/);
});

test('deleting the pregame supplement cannot certify remaining ports under historical approval',async t=>{
  const target=fixture(t);rmSync(join(target,PREGAME_DRAWING_POLICY));
  await rejects(target,/pregame-films\/.*: unreviewed file/);
});

test('registration manifest and verification code remain exact approved inputs',async t=>{
  const target=fixture(t),production=readPregameConsumerApproval(root);
  for(const path of ['design/releases/design-0.8.0.json','scripts/pregame-runtime-ports.mjs','scripts/runtime-art-release.mjs']){
    append(target,path,'\n');
    const problems=await productionDrawingProblems(target);
    if(production&&path==='design/releases/design-0.8.0.json')assert.match(problems.join('\n'),/^Pregame consumer candidate: art manifest binding differs$/);
    else assert.ok(problems.some(problem=>problem===path+': required candidate drawing input differs'),path);
    cpSync(join(root,path),join(target,path));
  }
});

test('new drawing directories do not follow symlinks as an unreviewed file escape',async t=>{
  const target=fixture(t),path=prefix+'linked.mjs';symlinkSync(join(target,prefix+'brand/brand.mjs'),join(target,path));
  await rejects(target,/linked\.mjs: symlink in the adopted drawing ports/);
  rmSync(join(target,path));
  renameSync(join(target,prefix),join(target,'pregame-original'));
  symlinkSync(join(target,'pregame-original'),join(target,prefix.slice(0,-1)));
  await rejects(target,/pregame-films: symlink in the adopted drawing ports/);
});

test('design pregame stage/fixture references remain forbidden outside the named runtime derivatives',async t=>{
  const target=fixture(t),path='apps/game/hosted/unreviewed-pregame.mjs';
  const injections=["import '../../../../design/pregame-films/stage.mjs';", "import('design/' + 'pregame-films/films.mjs');",
    "fetch('/design/%70regame-films/review/pilot.mp4');", "import 'design/\\u0070regame-films/renders.mjs';"];
  for(const content of injections){
    assert.equal(prototypeReferences(path,content).length,1);writeFileSync(join(target,path),content);
    await rejects(target,/unreviewed-pregame\.mjs: production code refers to the pregame-films prototype/);
  }
  assert.equal(prototypeReferences(path,"import '../pregame-films/roles/film.mjs';").length,0,'Native reviewed drawing paths are distinct from the design prototype');
});

test('the exact consumer set requires local review or verified production acceptance',async t=>{
  const {target}=candidateFixture(t),production=readPregameConsumerApproval(root);
  for(const value of [undefined,'0','true'])await reviewMode(value,async()=>{
    if(production)assert.deepEqual(await productionDrawingProblems(target),[]);
    else await rejects(target,/required candidate drawing input differs|reviewed native metadata file content hash differs/);
  });
  await reviewMode('1',async()=>assert.deepEqual(await productionDrawingProblems(target),[]));
});

test('an adopted production policy requires its final approval even in local-review mode',async t=>{
  if(readPregameConsumerApproval(root)===null){t.skip('Final production approval is not present in the source checkpoint');return;}
  assert.equal(readDrawingPolicy(root).productionConsumerApproval,true);
  const {target}=candidateFixture(t);rmSync(join(target,PREGAME_PRODUCTION_CONSUMER_APPROVAL));
  for(const value of [undefined,'1'])await reviewMode(value,()=>rejects(target,/^Required production consumer approval is missing$/));
});

test('local review rejects changed consumers, missing preserved bytes and self-edited approval',async t=>{
  const {target,candidate}=candidateFixture(t),[path,entry]=Object.entries(candidate.files)[0];
  await reviewMode('1',async()=>{
    append(target,path,'\n// changed after review\n');await rejects(target,/Pregame consumer candidate: current content differs/);
    cpSync(join(target,entry.candidateBlob),join(target,path));
    const previous=Object.values(candidate.files).flatMap(entry=>entry.acceptedPreviousHashes)[0];
    const blob=candidate.historicalBlobsDirectory+'/'+previous;
    rmSync(join(target,blob));assert.ok((await productionDrawingProblems(target)).some(problem=>problem.includes(blob)));
    cpSync(join(root,blob),join(target,blob));
    append(target,PREGAME_CONSUMER_CANDIDATE,'\n');await rejects(target,/Pregame consumer candidate: independent approval hash differs/);
  });
});

test('local consumer review retains prototype, drawing inventory and frozen source checks',async t=>{
  const {target}=candidateFixture(t);
  await reviewMode('1',async()=>{
    const media=prefix+'review/unapproved.mp4';mkdirSync(dirname(join(target,media)),{recursive:true});writeFileSync(join(target,media),'unreviewed');
    await rejects(target,/review\/unapproved\.mp4: unreviewed file/);rmSync(join(target,media));
    const script='apps/game/hosted/unreviewed-candidate.mjs';writeFileSync(join(target,script),"import '../../../../design/pregame-films/stage.mjs';");
    await rejects(target,/unreviewed-candidate\.mjs: production code refers to the pregame-films prototype/);rmSync(join(target,script));
    append(target,'design/crew-drawing/source/crew.mjs','\n');await rejects(target,/frozen drawing source hash differs/);
  });
});


test('a dangling production policy is invalid and cannot masquerade as historical absence',async t=>{
  const target=fixture(t);
  rmSync(join(target,PREGAME_PRODUCTION_DRAWING_POLICY));
  symlinkSync(join(target,'missing-production-policy.json'),join(target,PREGAME_PRODUCTION_DRAWING_POLICY));
  await rejects(target,/Pregame production drawing approval must be a regular file/);
});
