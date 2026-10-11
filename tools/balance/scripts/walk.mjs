// Seeded random-policy playouts with the rulebook invariants checked after every transition.
//
//   node scripts/walk.mjs [--engine-root <dir>] [--engine-commit <sha>] [--seeds 200] [--out <file.json>] [--require-engine]
//     [--ruleset <ruleset version>] [--rooms seeded|capped] [--room-capacity 5] [--occupancy]
//
// --ruleset        The ruleset every match is created under; the engine's own default without it.
// --rooms          How starting rooms are drawn: an independent draw for each player (`seeded`,
//                  the default, and the rule until issue #96), or the same made legal under the
//                  capacity rule (`capped`).
// --room-capacity  Holds every playout to the capacity invariants (INV-CAP-01 to 03). Give it for
//                  a ruleset that carries the rule, and for none that does not.
// --occupancy      Adds to the summary how full the places got. It is on with --room-capacity.
//
// Exit status: 1 on any invariant violation, hint mismatch, replay mismatch or unfinished playout;
// 2 when nothing was run that could count: --require-engine was given and no engine is available,
// the command line cannot be understood, or the engine commit it states contradicts the checkout;
// otherwise 0.
//
// What this is for: legality, resource accounting, phase transitions, elimination and audience
// boundaries over many reachable states, and whether the engine's own target hints agree with
// what it accepts. What it is not: evidence about human play. Only whether a terminal category
// was reached at all is reported; how often a random policy reaches it is not recorded.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_WALK, walk } from '@mothership/balance';
import { load } from '../../../tests/scenarios/adapters/full-game-v1.mjs';
import { invocationPath, readArgs } from './args.mjs';
import { buildPins, noteProvenance } from './pins.mjs';

const refuse = message => { console.error(`FAILED: ${message} Nothing was run.`); process.exit(2); };
const { values, flags } = readArgs({ values: ['engine-root', 'engine-commit', 'seeds', 'out', 'ruleset', 'rooms', 'room-capacity'], flags: ['require-engine', 'occupancy'] }, refuse);
const rooms = values.rooms ?? 'seeded';
if (rooms !== 'seeded' && rooms !== 'capped') refuse(`--rooms ${rooms} is neither seeded nor capped.`);
const roomCapacity = values['room-capacity'] === null ? null : Number(values['room-capacity']);
if (roomCapacity !== null && (!Number.isInteger(roomCapacity) || roomCapacity < 1)) refuse('--room-capacity needs a whole number of at least 1.');
const withOccupancy = flags.occupancy || roomCapacity !== null;
// A run that names a ruleset, a way of drawing rooms or a capacity records them. A plain run carries the pins it always did.
const asked = values.ruleset === null && rooms === 'seeded' && roomCapacity === null ? {} : { rulesetAskedFor: values.ruleset, rooms, roomCapacity };
const engineRoot = values['engine-root'] === null ? null : invocationPath(values['engine-root']);
const seeds = Number(values.seeds ?? 200);
const out = values.out;
// A run of no playouts would find no problem. It is refused, not passed.
if (!Number.isInteger(seeds) || seeds < 1) {
  console.error('FAILED: --seeds needs a whole number of at least 1.');
  process.exit(1);
}
const write = report => {
  if (out === null) return;
  const target = invocationPath(out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 1)}\n`);
  console.log(`Summary written to ${target}`);
};

const loaded = await load(engineRoot, { ruleset: values.ruleset, roomCapacity });
const built = buildPins({ engineRoot, engineCommit: values['engine-commit'], adapter: loaded.available ? loaded.adapter : null, runner: '@mothership/balance seeded playouts', extra: asked });
if ('problem' in built) refuse(built.problem);
const pins = built.pins;
if (!loaded.available) {
  // Nothing ran. With --require-engine that is a failure of the gate, with its own exit status.
  console.log(`NOT RUN. No playout was run. Engine adapter unavailable: ${loaded.reason}`);
  // The report is written all the same, so that an older report in its place cannot be taken for this run.
  write({ schema: 'mothership.balance.walk/1', pins, verdict: 'not-run', reason: loaded.reason, seedsPerMode: seeds, node: process.version, modes: {} });
  process.exit(flags['require-engine'] ? 2 : 0);
}
const summary = { schema: 'mothership.balance.walk/1', pins, engine: loaded.adapter.pins, engineCommit: pins.engineCommit, policy: { ...DEFAULT_WALK, description: 'uniform random choice among offered commands, plus arbitrary commands' }, seedsPerMode: seeds, seedLabels: `walk-1 .. walk-${seeds}`, node: process.version, modes: {} };
let problems = 0;
for (const mode of [7, 8, 9]) {
  const stats = {
    playouts: 0, completed: 0, phases: 0, commandsAccepted: 0, commandsRejected: 0, invariantViolations: 0, hintMismatches: 0,
    replayMismatches: 0, showdowns: 0, mostEliminatedBeforeShowdown: 0, mostJailedAtOnce: 0,
    windowMinutes: { min: Infinity, max: 0 }, terminal: { Blue: 0, Red: 0, Alien: 0, Draw: 0, unfinished: 0 }, alienCoWin: 0, examples: [],
  };
  // How full the places got, over all playouts of the mode. Counts of what was reached and of how
  // the engine answered; under a random policy they say nothing about how people would play.
  const occupancy = {
    most: {}, phasesOpened: 0, phasesWithAFullRoom: 0, phasesOverCapacity: 0, playoutsOverCapacity: 0, playoutsWithAFullRoom: 0,
    movesTowardsAFullRoom: 0, movesIntoAFullRoom: 0, returns: 0, returnsToTheOtherRoom: 0, returnsToTheOtherRoomThoughTheLastHadAPlace: 0,
    mostWaiting: 0, playoutsWithSomeoneWaiting: 0, startsWithAFullRoom: 0,
  };
  for (let index = 1; index <= seeds; index += 1) {
    const seed = `walk-${index}`;
    const result = walk(loaded.adapter, mode, seed, { ...DEFAULT_WALK, rooms });
    const again = walk(loaded.adapter, mode, seed, { ...DEFAULT_WALK, rooms });
    for (const [place, held] of Object.entries(result.occupancy.most)) occupancy.most[place] = Math.max(occupancy.most[place] ?? 0, held);
    for (const key of ['phasesOpened', 'phasesWithAFullRoom', 'phasesOverCapacity', 'movesTowardsAFullRoom', 'movesIntoAFullRoom', 'returns', 'returnsToTheOtherRoom', 'returnsToTheOtherRoomThoughTheLastHadAPlace']) {
      occupancy[key] += result.occupancy[key];
    }
    occupancy.mostWaiting = Math.max(occupancy.mostWaiting, result.occupancy.mostWaiting);
    if (result.occupancy.mostWaiting > 0) occupancy.playoutsWithSomeoneWaiting += 1;
    if (result.occupancy.phasesOverCapacity > 0) occupancy.playoutsOverCapacity += 1;
    if (result.occupancy.phasesWithAFullRoom > 0) occupancy.playoutsWithAFullRoom += 1;
    const startsInA = Object.values(result.setup.initialRooms).filter(room => room === 'Room A').length;
    if (Math.max(startsInA, mode - startsInA) === 5) occupancy.startsWithAFullRoom += 1;
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
    if (result.completed) {
      stats.windowMinutes.min = Math.min(stats.windowMinutes.min, result.windowSeconds / 60);
      stats.windowMinutes.max = Math.max(stats.windowMinutes.max, result.windowSeconds / 60);
    }
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
  if (stats.completed === 0) stats.windowMinutes = null;
  if (withOccupancy) {
    stats.occupancy = occupancy;
    console.log(`  places: most at once ${Object.entries(occupancy.most).map(([place, held]) => `${place} ${held}`).join(', ')}; most waiting for Hospital ${occupancy.mostWaiting}`);
    console.log(`  a room was full in ${occupancy.phasesWithAFullRoom} of ${occupancy.phasesOpened} phases and over capacity in ${occupancy.phasesOverCapacity}; moves towards a full room ${occupancy.movesTowardsAFullRoom}, accepted ${occupancy.movesIntoAFullRoom}`);
    console.log(`  returns from Hospital or Jail ${occupancy.returns}, to the other room ${occupancy.returnsToTheOtherRoom}, of which the last room had a place afterwards ${occupancy.returnsToTheOtherRoomThoughTheLastHadAPlace}`);
  }
  console.log(stats.windowMinutes === null ? '  clock length not available: no playout finished' : `  clock length ${stats.windowMinutes.min.toFixed(0)} to ${stats.windowMinutes.max.toFixed(0)} minutes of windows under this policy`);
  for (const example of stats.examples) console.log(`  example ${example.seed}: ${JSON.stringify(example)}`);
}
noteProvenance(pins);
write(summary);
if (problems > 0) process.exit(1);
