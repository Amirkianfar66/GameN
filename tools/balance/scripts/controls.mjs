// Negative controls for the scenario harness.
//
//   node scripts/controls.mjs --engine-root <dir> [--engine-commit <sha>] [--out <file.json>]
//
// Each control copies a ready scenario and makes exactly one of its expectations wrong: a
// command expected to be accepted is expected to be refused, or an asserted value is changed.
// A run of that copy must fail. A control that still passes would mean the expectation checks
// nothing. This tests the harness and the fixtures, not the engine.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runScenario } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { loadGroup } from '../../../tests/scenarios/v1/files.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] ?? null; };
const engineRoot = option('--engine-root');
const out = option('--out');
const loaded = await load(engineRoot ? resolve(engineRoot) : null);
if (!loaded.available) {
  console.log(`No control was run. Engine adapter unavailable: ${loaded.reason}`);
  process.exit(0);
}
const adapter = loaded.adapter;

function wrongValue(value) {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return value + 1;
  if (value === null) return 'seat-1';
  if (value === 'Healthy') return 'Injured';
  if (value === 'Injured' || value === 'Eliminated') return 'Healthy';
  if (typeof value === 'string') return `${value}-changed`;
  if (Array.isArray(value)) return [...value, 'seat-1'];
  return undefined;
}

function* controls(scenario) {
  for (let index = 0; index < scenario.steps.length; index += 1) {
    const step = scenario.steps[index];
    if (step.op === 'command') {
      const copy = structuredClone(scenario);
      copy.steps[index].expect = step.expect === 'REGISTERED' ? 'NOT_ALLOWED' : 'REGISTERED';
      yield { kind: 'command expectation', where: `step ${index}`, scenario: copy };
    }
    if (step.op !== 'assert') continue;
    for (let position = 0; position < step.checks.length; position += 1) {
      const check = step.checks[position];
      const copy = structuredClone(scenario);
      const target = copy.steps[index].checks[position];
      if ('equals' in check) {
        const changed = wrongValue(check.equals);
        if (changed === undefined) continue;
        target.equals = changed;
      } else if ('sameSet' in check && check.sameSet.length > 0) target.sameSet = check.sameSet.slice(1);
      else if ('includes' in check) { target.excludes = check.includes; delete target.includes; }
      else if ('excludes' in check) { target.includes = check.excludes; delete target.excludes; }
      else if ('unchanged' in check) { target.changed = check.unchanged; delete target.unchanged; }
      else if ('changed' in check) { target.unchanged = check.changed; delete target.changed; }
      else if ('trace' in check) target.trace = { kinds: check.trace.kinds.slice(1) };
      else if ('traceTurns' in check) target.traceTurns = { round: check.traceTurns.round, actives: [...check.traceTurns.actives, 'seat-1'] };
      else continue;
      yield { kind: 'asserted fact', where: `step ${index} check ${position}`, scenario: copy };
    }
  }
}

const summary = { schema: 'mothership.balance.controls/1', engine: adapter.pins, engineCommit: option('--engine-commit') ?? 'not stated', node: process.version, modes: {}, undetected: [] };
for (const mode of [7, 8, 9]) {
  const stats = { scenarios: 0, controls: 0, detected: 0, undetected: 0, baselineNotPassing: 0 };
  for (const scenario of loadGroup(String(mode)).scenarios.filter(item => item.status === 'ready' && item.setup !== null)) {
    stats.scenarios += 1;
    if (runScenario(scenario, adapter, '').status !== 'passed') { stats.baselineNotPassing += 1; continue; }
    for (const control of controls(scenario)) {
      stats.controls += 1;
      if (runScenario(control.scenario, adapter, '').status === 'failed') stats.detected += 1;
      else { stats.undetected += 1; summary.undetected.push(`${scenario.id} ${control.where} (${control.kind})`); }
    }
  }
  summary.modes[mode] = stats;
  console.log(`mode ${mode}: ${stats.scenarios} ready scenarios, ${stats.controls} controls, ${stats.detected} detected, ${stats.undetected} undetected${stats.baselineNotPassing > 0 ? `, ${stats.baselineNotPassing} scenarios skipped because they do not pass unmodified` : ''}`);
}
for (const line of summary.undetected.slice(0, 40)) console.log(`UNDETECTED ${line}`);
if (out !== null) {
  const target = resolve(process.env.INIT_CWD ?? process.cwd(), out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(summary, null, 1)}\n`);
  console.log(`Summary written to ${target}`);
}
if (summary.undetected.length > 0) process.exit(1);
