import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CAPACITY_FILES, CAPACITY_PINS, capacityContract, assertCapacityScenarios, assertCapacityWalk } from '../../scripts/test-capacity.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const provenance={head:'1234567890abcdef1234567890abcdef12345678',branch:'codex/capacity-guard',node:'v22.21.1'};
const contract=capacityContract(root,provenance);
const window={startedAt:Date.parse('2026-10-12T00:00:00.000Z'),finishedAt:Date.parse('2026-10-12T00:00:01.000Z')};
const pins=()=>({...contract.sources,engine:contract.engine,engineCommit:provenance.head,workingTreeCommit:provenance.head,
  branch:provenance.branch,engineCommitBasis:'head of this checkout',engineTreeClean:true,engineBuildSha256:contract.build,
  node:provenance.node,rulesetAskedFor:CAPACITY_PINS.rulesetVersion,roomCapacity:5,generatedAt:'2026-10-12T00:00:00.500Z'});
function scenarios(){
  const runs=contract.cases.map(c=>({scenarioId:c.id,mode:c.mode,group:c.group,status:c.status,decisionIds:c.decisionIds,
    failure:null,invariantViolations:[],transitions:c.status==='passed'?1:0,commands:c.status==='passed'?1:0}));
  return {schema:'mothership.balance.scenario-run/1',pins:{...pins(),suite:'capacity',capacityFileHashes:CAPACITY_FILES},runs,
    totals:{total:122,passed:107,failed:0,blocked:0,notRun:15},byGroup:{
      'mode-7':{total:38,passed:33,failed:0,blocked:0,notRun:5},
      'mode-8':{total:38,passed:33,failed:0,blocked:0,notRun:5},
      'mode-9':{total:46,passed:41,failed:0,blocked:0,notRun:5},
      unsupported:{total:0,passed:0,failed:0,blocked:0,notRun:0},
    }};
}
function playouts(){return {schema:'mothership.balance.walk/1',pins:{...pins(),rooms:'capped',pressFullRooms:0.25},
  engine:contract.engine,engineCommit:provenance.head,seedsPerMode:200,seedLabels:'walk-1 .. walk-200',
  policy:{activity:0.6,noise:0.25,coordination:0.5,maxPhases:400,rooms:'capped',pressFullRooms:0.25,
    description:'uniform random choice among offered commands, plus arbitrary commands'},
  modes:Object.fromEntries(['7','8','9'].map(mode=>[mode,{playouts:200,completed:200,phases:20,commandsAccepted:20,
    invariantViolations:0,hintMismatches:0,replayMismatches:0,playoutsWithAViolation:0,terminalReached:{unfinished:0},examples:[],
    occupancy:{phasesOverCapacity:0,playoutsOverCapacity:0,movesIntoAFullRoom:0,movesTowardsAFullRoom:10}}]))};}
test('capacity gate accepts complete synthetic reports for the reviewed catalogue and tuple',()=>{
  assert.equal(assertCapacityScenarios(scenarios(),contract,window).passed,107);
  assert.deepEqual(assertCapacityWalk(playouts(),contract,window),{completed:600,perMode:200});
});
for(const [name,mutate] of [
  ['old ruleset',r=>r.pins.rulesetAskedFor='in-person-v1-capacity-2026-10-11'],
  ['wrong engine tuple',r=>r.pins.engine.rulesetHash='a'.repeat(64)],
  ['stated source only',r=>r.pins.engineCommitBasis='stated on the command line, not checked'],
  ['dirty engine',r=>r.pins.engineTreeClean=false],
  ['different build',r=>r.pins.engineBuildSha256='b'.repeat(64)],
  ['old report',r=>r.pins.generatedAt='2026-10-11T00:00:00.500Z'],
  ['wrong fixture digest',r=>r.pins.capacityFileHashes['mode-7.scenarios.json']='c'.repeat(64)],
  ['missing case',r=>r.runs.pop()],
  ['duplicate case',r=>r.runs[1]=r.runs[0]],
  ['failure hidden by green totals',r=>r.runs[0].status='failed'],
  ['manual case counted as passed',r=>r.runs.find(c=>c.status==='not-run').status='passed'],
  ['invariant hidden by green totals',r=>r.runs[0].invariantViolations.push({invariant:'INV-CAP-01',message:'private sentinel'})],
  ['no transitions',r=>r.runs.forEach(c=>{c.transitions=0;c.commands=0;})],
  ['missing mode totals',r=>delete r.byGroup['mode-9']],
]) test(`capacity scenarios reject ${name}`,()=>{
  const report=structuredClone(scenarios());mutate(report);
  assert.throws(()=>assertCapacityScenarios(report,contract,window),e=>/Balance gate: capacity/.test(e.message)&&!e.message.includes('private sentinel'));
});
for(const [name,mutate] of [
  ['missing mode',r=>delete r.modes[9]],
  ['fewer playouts',r=>r.modes[7].completed=199],
  ['hint mismatch',r=>r.modes[8].hintMismatches=1],
  ['replay mismatch',r=>r.modes[9].replayMismatches=1],
  ['unfinished game',r=>r.modes[9].terminalReached.unfinished=1],
  ['over-capacity phase',r=>r.modes[7].occupancy.phasesOverCapacity=1],
  ['accepted move into full room',r=>r.modes[8].occupancy.movesIntoAFullRoom=1],
  ['no full-room attempts',r=>r.modes[9].occupancy.movesTowardsAFullRoom=0],
  ['different setup policy',r=>r.policy.rooms='seeded'],
]) test(`capacity playouts reject ${name}`,()=>{
  const report=structuredClone(playouts());mutate(report);
  assert.throws(()=>assertCapacityWalk(report,contract,window),/Balance gate: capacity/);
});
