// Integration gate for the approved capacity-resolution tuple. Historical rules keep
// their separate catalogue gate; reports from it cannot satisfy this check.
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readBalanceProvenance, readBalanceReport, runBalanceProcess } from './test-balance.mjs';
import { requireBalance } from './test-balance-reports.mjs';
import { sourceHashes, engineBuildDigest } from '../tools/balance/scripts/pins.mjs';

export const CAPACITY_PINS = Object.freeze({ protocolVersion: 2, engineVersion: 'full-game-1.3.0',
  rulesetVersion: 'in-person-v1-capacity-resolution-2026-10-12',
  rulesetHash: 'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e' });
export const CAPACITY_FILES = Object.freeze({
  'mode-7.scenarios.json': 'd7116d4aad94e124d07303385ab971391659338a15cf2091a83cb74954d7c62e',
  'mode-8.scenarios.json': '52935468539164a4f378fa26d73b0a57c3dc85d1b66115daa0098b49f38a91b2',
  'mode-9.scenarios.json': '3fffcbae1760f066b8e6e164aa8c439bbfc5980e4699fdd27e29743462e8d133',
});
export const CAPACITY_PLAYOUTS = 200;
const root = fileURLToPath(new URL('../', import.meta.url));
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v);
const same = (a, b, label) => requireBalance(canonical(a) === canonical(b), `capacity ${label}`);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const empty = (value, label) => same(value, [], label);
const integer = (value, label) => requireBalance(Number.isSafeInteger(value) && value >= 0, `capacity ${label}`);
const count = runs => ({ total:runs.length, passed:runs.filter(r=>r.status==='passed').length,
  failed:runs.filter(r=>r.status==='failed').length, blocked:runs.filter(r=>r.status==='blocked').length,
  notRun:runs.filter(r=>r.status==='not-run').length });

export function capacityContract(checkout, provenance) {
  same(hash(join(checkout,'rules/overlays/room-capacity-resolution-owner-decision-2026-10-12.json')), CAPACITY_PINS.rulesetHash, 'owner overlay changed');
  same(hash(join(checkout,'tests/scenarios/capacity/catalog.mjs')), '0ded007ae1ea4268467bdeb49ff5fc9a5ec450e89730602bd307c9e9a36656d8', 'catalogue source changed');
  same(hash(join(checkout,'docs/balance/capacity-audit.md')), 'c60230d78c6752eacbcbacbaaf9b2b953f90975a75eb42a9b4dcbe272e1a255a', 'independent audit changed');
  const cases = [];
  for (const [name, digest] of Object.entries(CAPACITY_FILES)) {
    const path = join(checkout,'tests/scenarios/capacity',name);
    same(hash(path), digest, 'fixture file changed');
    const file = JSON.parse(readFileSync(path,'utf8'));
    same(file.optionalPowers, false, 'Original Powers changed');
    for (const scenario of file.scenarios) {
      requireBalance(['ready','manual'].includes(scenario.status), 'capacity unreviewed fixture status');
      cases.push({id:scenario.id,mode:file.mode,group:`mode-${file.mode}`,
        status:scenario.status==='ready'?'passed':'not-run',decisionIds:scenario.decisionIds});
    }
  }
  same(count(cases), {total:122,passed:107,failed:0,blocked:0,notRun:15}, 'catalogue totals changed');
  const engine = {adapter:'full-game-v1',...CAPACITY_PINS,binaryEngineVersion:CAPACITY_PINS.engineVersion,
    binaryRulesetVersion:CAPACITY_PINS.rulesetVersion,binaryRulesetHash:CAPACITY_PINS.rulesetHash};
  return { ...provenance,cases,engine,sources:sourceHashes(checkout),build:engineBuildDigest(checkout) };
}
export function assertCapacityPins(report, contract, window) {
  const pins = report?.pins;
  requireBalance(pins && typeof pins === 'object', 'capacity missing provenance');
  for (const [key,value] of Object.entries(contract.sources)) same(pins[key],value,`${key} mismatch`);
  same(pins.engine,contract.engine,'engine tuple mismatch');
  same(pins.engineCommit,contract.head,'engine commit mismatch');
  same(pins.workingTreeCommit,contract.head,'working commit mismatch');
  same(pins.branch,contract.branch,'branch mismatch');
  same(pins.engineCommitBasis,'head of this checkout','engine commit was not read');
  same(pins.engineTreeClean,true,'dirty engine');
  same(pins.engineBuildSha256,contract.build,'built engine mismatch');
  same(pins.node,'v22.21.1','toolchain mismatch');
  same(pins.rulesetAskedFor,CAPACITY_PINS.rulesetVersion,'wrong ruleset requested');
  same(pins.roomCapacity,5,'room limit mismatch');
  const at=Date.parse(pins.generatedAt);
  requireBalance(Number.isFinite(at) && at>=window.startedAt && at<=window.finishedAt,'capacity report is not fresh');
}
export function assertCapacityScenarios(report, contract, window) {
  assertCapacityPins(report,contract,window);
  same(report.schema,'mothership.balance.scenario-run/1','scenario schema');
  same(report.pins.suite,'capacity','wrong scenario suite');
  same(report.pins.capacityFileHashes,CAPACITY_FILES,'fixture hashes mismatch');
  requireBalance(Array.isArray(report.runs) && report.runs.length===contract.cases.length,'capacity incomplete scenarios');
  const expected=new Map(contract.cases.map(c=>[c.id,c])), seen=new Set();
  let transitions=0,commands=0;
  for (const run of report.runs) {
    const spec=expected.get(run.scenarioId);
    requireBalance(spec && !seen.has(run.scenarioId),'capacity unknown or duplicate case');
    seen.add(run.scenarioId);
    for (const key of ['mode','group','status','decisionIds']) same(run[key],spec[key],`case ${key}`);
    same(run.failure,null,'scenario failure'); empty(run.invariantViolations,'scenario invariant violations');
    integer(run.transitions,'transition count'); integer(run.commands,'command count');
    if (spec.status==='not-run') {same(run.transitions,0,'manual case transition');same(run.commands,0,'manual case command');}
    transitions+=run.transitions;commands+=run.commands;
  }
  requireBalance(transitions>0 && commands>0,'capacity no engine execution');
  same(report.totals,{total:122,passed:107,failed:0,blocked:0,notRun:15},'scenario totals');
  for(const group of ['mode-7','mode-8','mode-9','unsupported']) same(report.byGroup?.[group],count(report.runs.filter(r=>r.group===group)),'mode totals');
  return report.totals;
}
export function assertCapacityWalk(report,contract,window) {
  assertCapacityPins(report,contract,window);
  same(report.schema,'mothership.balance.walk/1','walk schema');
  same(report.engine,contract.engine,'walk engine tuple');same(report.engineCommit,contract.head,'walk engine commit');
  same(report.seedsPerMode,CAPACITY_PLAYOUTS,'playout count');same(report.seedLabels,'walk-1 .. walk-200','seed labels');
  same(report.policy,{activity:0.6,noise:0.25,coordination:0.5,maxPhases:400,rooms:'capped',pressFullRooms:0.25,
    description:'uniform random choice among offered commands, plus arbitrary commands'},'playout policy');
  same(report.pins.rooms,'capped','starting rooms');same(report.pins.pressFullRooms,0.25,'full-room exercise');
  same(Object.keys(report.modes).sort(),['7','8','9'],'playout modes');
  for(const mode of ['7','8','9']) {
    const stats=report.modes[mode];
    same(stats.playouts,200,'executed playouts');same(stats.completed,200,'completed playouts');
    for(const key of ['invariantViolations','hintMismatches','replayMismatches','playoutsWithAViolation']) same(stats[key],0,`playout ${key}`);
    same(stats.terminalReached?.unfinished,0,'unfinished matches');empty(stats.examples,'playout errors');
    requireBalance(stats.phases>0 && stats.commandsAccepted>0,'capacity playouts did no work');
    for(const key of ['phasesOverCapacity','playoutsOverCapacity','movesIntoAFullRoom']) same(stats.occupancy?.[key],0,`occupancy ${key}`);
    requireBalance(stats.occupancy?.movesTowardsAFullRoom>0,'capacity full rooms were not exercised');
  }
  return {completed:600,perMode:200};
}
export async function runCapacityGate(checkout=root) {
  const provenance=readBalanceProvenance(checkout),contract=capacityContract(checkout,provenance);
  const engine=await import(pathToFileURL(join(checkout,'packages/engine/dist/index.js')).href);
  same(engine.FULL_GAME_VERSION_PINS,CAPACITY_PINS,'runtime defaults');
  const directory=mkdtempSync(join(tmpdir(),'mothership-capacity-release-')),startedAt=Date.now();
  const common=['--require-engine','--engine-commit',provenance.head,'--ruleset',CAPACITY_PINS.rulesetVersion];
  for(const [name,script,args,check] of [
    ['scenarios','run-scenarios.mjs',['--suite','capacity'],assertCapacityScenarios],
    ['playouts','walk.mjs',['--seeds','200','--rooms','capped','--room-capacity','5'],assertCapacityWalk],
  ]) {
    const file=join(directory,`${name}.json`);
    runBalanceProcess(process.execPath,[join(checkout,'tools/balance/scripts',script),...common,...args,'--out',file],checkout,join(directory,`${name}.log`));
    check(readBalanceReport(file),contract,{startedAt,finishedAt:Date.now()});
    same(readBalanceProvenance(checkout),provenance,'checkout changed during checks');
    same(engineBuildDigest(checkout),contract.build,'build changed during checks');
  }
  console.log(`Capacity release gate: 107 scenarios passed, 15 explicit manual; 600 playouts completed without invariant, hint or replay failures. Source ${provenance.head}.`);
  console.log(`Capacity release evidence: ${directory}`);
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) runCapacityGate().catch(error=>{
  console.error(error instanceof Error && error.message.startsWith('Balance gate:')?error.message:'Balance gate: capacity verification failed');
  process.exitCode=1;
});
