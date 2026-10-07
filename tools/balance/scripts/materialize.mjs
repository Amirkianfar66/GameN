// Writes the per-mode scenario files from the catalogue, or with --check verifies that the
// committed files are exactly what the catalogue produces.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildCatalog } from '../../../tests/scenarios/v1/catalog.mjs';
import { GROUPS, renderFile, scenarioFileUrl } from '../../../tests/scenarios/v1/files.mjs';

const checkOnly = process.argv.includes('--check');
const catalog = buildCatalog();
let stale = 0;
for (const group of GROUPS) {
  const text = renderFile(group, catalog[group]);
  const url = scenarioFileUrl(group);
  if (checkOnly) {
    let current = null;
    try { current = readFileSync(url, 'utf8'); } catch { /* missing file counts as stale */ }
    if (current !== text) { stale += 1; console.error(`Stale scenario file: ${url.pathname}`); }
  } else {
    writeFileSync(url, text);
    console.log(`${String(catalog[group].length).padStart(4)} scenarios -> ${url.pathname.split('/').slice(-4).join('/')}`);
  }
}
if (stale > 0) { console.error('Run: npm run materialize --workspace @mothership/balance'); process.exit(1); }
if (checkOnly) console.log('Scenario files match the catalogue.');
