// EMULATOR-CONNECTED. A measurement, not a test: it asserts nothing about timing and is not
// part of the suite (the suite runs *.test.mjs).
//
// How long the local emulators take to answer seven commands sent to one match at the same
// moment, as a table of players does when a vote opens. Each run brings up a match of its
// own through the documented operations; every seat then registers a move in the first
// phase, all at once, through the client's own API functions and the test transport (plain
// HTTP from Node, no browser). Three more commands are then sent one at a time in the same
// match, for comparison. "timeout" is the client's own wait for an answer running out.
//
// With the emulators running (npm run dev:emulators --workspace @mothership/game), from
// apps/game:
//
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 \
//   MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 GCLOUD_PROJECT=demo-mothership \
//   node test-emulator/measure-simultaneous-commands.mjs [runs]
//
// The figures say something about these emulators on this machine. They say nothing about
// a deployed backend.
import { requestId, startedMatch } from './support/match.mjs';

const RUNS = Number(process.argv[2] ?? 5);
const closing = [];
const lifetime = { after: close => closing.push(close) };

async function timed(player, matchId) {
  const [destination] = player.view.self.movementDestinations;
  const started = performance.now();
  const answer = await player.api.command({ protocolVersion: 2, matchId, phaseId: player.view.phase.id, commandId: requestId(), command: { type: 'MOVE', destination } });
  return { ms: Math.round(performance.now() - started), answer: answer.receipt?.status ?? answer.code ?? answer.reason ?? answer.kind };
}
const line = answers => answers.map(each => `${each.ms} ms ${each.answer}`).join(', ');

const slowest = [];
try {
  for (let run = 1; run <= RUNS; run += 1) {
    const { players, matchId } = await startedMatch(lifetime);
    const together = (await Promise.all(players.map(player => timed(player, matchId)))).sort((a, b) => a.ms - b.ms);
    const alone = [];
    for (const player of players.slice(0, 3)) alone.push(await timed(player, matchId));
    slowest.push(together.at(-1).ms);
    console.log(`run ${run}: seven at once: ${line(together)}`);
    console.log(`run ${run}: then one at a time: ${line(alone)}`);
  }
  console.log(`slowest of the seven, run by run: ${slowest.join(', ')} ms`);
} finally {
  for (const close of closing) close();
}
