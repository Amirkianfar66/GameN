// Seeded random-policy playouts with the rulebook invariants checked after every transition.
//
//   node scripts/walk.mjs [--engine-root <dir>] [--engine-commit <sha>] [--seeds 200] [--out <file.json>]
//
// What this is for: legality, resource accounting, phase transitions, elimination and audience
// boundaries over many reachable states, and whether the engine's own target hints agree with
// what it accepts. What it is not: evidence about human play. Only whether a terminal category
// was reached at all is reported; how often a random policy reaches it is not recorded.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DEFAULT_WALK, walk } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] ?? null; };
const engineRoot = option('--engine-root');
const seeds = Number(option('--seeds') ?? 200);
const out = option('--out');

const loaded = await load(engineRoot ? resolve(engineRoot) : null);
if (!loaded.available) {
  console.log(`No playout was run. Engine adapter unavailable: ${loaded.reason}`);
  process.exit(0);
}
const summary = { schema: 'mothership.balance.walk/1', engine: loaded.adapter.pins, engineCommit: option('--engine-commit') ?? 'not stated', policy: { ...DEFAULT_WALK, description: 'uniform random choice among offered commands, plus arbitrary commands' }, seedsPerMode: seeds, seedLabels: `walk-1 .. walk-${seeds}`, node: process.version, modes: {} };
let problems = 0;
for (const mode of [7, 8, 9]) {
  const stats = {
    playouts: 0, completed: 0, phases: 0, commandsAccepted: 0, commandsRejected: 0, invariantViolations: 0, hintMismatches: 0,
    replayMismatches: 0, showdowns: 0, mostEliminatedBeforeShowdown: 0, mostJailedAtOnce: 0,
    windowMinutes: { min: Infinity, max: 0 }, terminal: { Blue: 0, Red: 0, Alien: 0, Draw: 0, unfinished: 0 }, alienCoWin: 0, examples: [],
  };
  for (let index = 1; index <= seeds; index += 1) {
    const seed = `walk-${index}`;
    const result = walk(loaded.adapter, mode, seed);
    const again = walk(loaded.adapter, mode, seed);
    stats.playouts += 1;
    stats.completed += result.completed ? 1 : 0;
    stats.phases += result.phases;
    stats.commandsAccepted += result.commandsAccepted;
    stats.commandsRejected += result.commandsRejected;
    stats.invariantViolations += result.violations.length;
    stats.hintMismatches += result.hintMismatches.length;
    if (again.endDigest !== result.endDigest) stats.replayMismatches += 1;
    if (result.showdown) stats.showdowns += 1;
    stats.mostEliminatedBeforeShowdown = Math.max(stats.mostEliminatedBeforeShowdown, result.eliminatedBeforeShowdown);
    stats.mostJailedAtOnce = Math.max(stats.mostJailedAtOnce, result.maxJailed);
    stats.windowMinutes.min = Math.min(stats.windowMinutes.min, result.windowSeconds / 60);
    stats.windowMinutes.max = Math.max(stats.windowMinutes.max, result.windowSeconds / 60);
    stats.terminal[result.winner ?? 'unfinished'] += 1;
    if (result.alienCoWinner === true) stats.alienCoWin += 1;
    if ((result.violations.length > 0 || result.hintMismatches.length > 0) && stats.examples.length < 5) {
      stats.examples.push({ seed, violations: result.violations.slice(0, 3), hintMismatches: result.hintMismatches.slice(0, 3) });
    }
  }
  problems += stats.invariantViolations + stats.hintMismatches + stats.replayMismatches + (stats.playouts - stats.completed);
  summary.modes[mode] = stats;
  console.log(`mode ${mode}: ${stats.playouts} playouts, ${stats.completed} finished, ${stats.phases} phases, ${stats.commandsAccepted} accepted and ${stats.commandsRejected} refused commands`);
  console.log(`  invariant violations ${stats.invariantViolations}, hint mismatches ${stats.hintMismatches}, replay mismatches ${stats.replayMismatches}`);
  console.log(`  reached: showdown ${stats.showdowns > 0}; most players Eliminated before a showdown ${stats.mostEliminatedBeforeShowdown}; most players Jailed at once ${stats.mostJailedAtOnce}`);
  const reached = Object.fromEntries(['Blue', 'Red', 'Alien', 'Draw'].map(name => [name, stats.terminal[name] > 0]));
  console.log(`  terminal categories reached at least once: Blue ${reached.Blue}, Red ${reached.Red}, Alien solo ${reached.Alien}, Draw ${reached.Draw}, Alien co-win ${stats.alienCoWin > 0}`);
  // Frequencies under a random policy say nothing about balance and are deliberately not kept.
  stats.terminalReached = { ...reached, alienCoWin: stats.alienCoWin > 0, unfinished: stats.terminal.unfinished };
  stats.showdownReached = stats.showdowns > 0;
  delete stats.terminal;
  delete stats.alienCoWin;
  delete stats.showdowns;
  console.log(`  clock length ${stats.windowMinutes.min.toFixed(0)} to ${stats.windowMinutes.max.toFixed(0)} minutes of windows under this policy`);
  for (const example of stats.examples) console.log(`  example ${example.seed}: ${JSON.stringify(example)}`);
}
if (out !== null) {
  const target = resolve(process.env.INIT_CWD ?? process.cwd(), out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(summary, null, 1)}\n`);
  console.log(`Summary written to ${target}`);
}
if (problems > 0) process.exit(1);
