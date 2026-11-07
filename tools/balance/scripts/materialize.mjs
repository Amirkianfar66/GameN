// Writes the per-mode scenario files from the catalogues, or with --check verifies that the
// committed files are exactly what the catalogues produce. There are two suites: the Version 1
// catalogue and the room-capacity fixtures beside it.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildCapacityCatalog } from '../../../tests/scenarios/capacity/catalog.mjs';
import { GROUPS as CAPACITY_GROUPS, capacityFileUrl, renderCapacityFile } from '../../../tests/scenarios/capacity/files.mjs';
import { buildCatalog } from '../../../tests/scenarios/v1/catalog.mjs';
import { GROUPS, renderFile, scenarioFileUrl } from '../../../tests/scenarios/v1/files.mjs';

const checkOnly = process.argv.includes('--check');
const catalog = buildCatalog();
const capacity = buildCapacityCatalog();
const files = [
  ...GROUPS.map(group => ({ scenarios: catalog[group], text: renderFile(group, catalog[group]), url: scenarioFileUrl(group) })),
  ...CAPACITY_GROUPS.map(group => ({ scenarios: capacity[group], text: renderCapacityFile(group, capacity[group]), url: capacityFileUrl(group) })),
];
let stale = 0;
for (const { scenarios, text, url } of files) {
  if (checkOnly) {
    let current = null;
    try { current = readFileSync(url, 'utf8'); } catch { /* missing file counts as stale */ }
    if (current !== text) { stale += 1; console.error(`Stale scenario file: ${url.pathname}`); }
  } else {
    writeFileSync(url, text);
    console.log(`${String(scenarios.length).padStart(4)} scenarios -> ${url.pathname.split('/').slice(-4).join('/')}`);
  }
}
if (stale > 0) { console.error('Run: npm run materialize --workspace @mothership/balance'); process.exit(1); }
if (checkOnly) console.log('Scenario files match the catalogues.');
