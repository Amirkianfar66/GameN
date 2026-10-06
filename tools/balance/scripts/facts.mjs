// Prints the arithmetic quoted in docs/balance/rules-audit-v1.md, "Structural consequences".
// These are counts that follow from the rules. They are not playtest results.
import { damageBudget, durationBound, factionCounts, jailThreshold, scanInformationBound } from '@mothership/balance';

const minutes = seconds => `${Math.round(seconds / 60)} min`;
for (const mode of [7, 8, 9]) {
  const counts = factionCounts(mode);
  const damage = damageBudget(mode);
  const clock = durationBound(mode);
  console.log(`\n${mode} players: Blue ${counts.Blue}, Red ${counts.Red}, Alien ${counts.Alien}`);
  console.log(`  starting Power: Blue ${counts.Blue + 1}, Red ${counts.Red}; votes needed to jail with everyone voting: ${jailThreshold(mode)} of ${mode}`);
  console.log(`  attacks before the showdown: ${damage.attacksBeforeShowdown}; most eliminations before the showdown: ${damage.maxEliminationsBeforeShowdown}`);
  console.log(`  Red elimination win before the showdown: ${damage.redEliminationWinBeforeShowdown}; Blue: ${damage.blueEliminationWinBeforeShowdown}`);
  console.log(`  damage to eliminate everyone but Alien: ${damage.hitPointsOfNonAlienPlayers}; most a whole match can deal: ${damage.maxTotalDamageIncludingShowdown}; Alien solo reachable: ${damage.alienSoloReachable}`);
  console.log(`  clock alone: at least ${minutes(clock.minimumSeconds)}; with the listed extras ${minutes(clock.typicalUpperSeconds)}`);
  console.log('  best chance of the exact Code from successful Scans alone (see the stated assumptions):');
  for (const row of scanInformationBound(mode)) {
    console.log(`    ${row.successfulScans} Scans: ${row.correctStates} in ${row.hiddenStates} (${(row.probability * 100).toFixed(1)}%)`);
  }
}
