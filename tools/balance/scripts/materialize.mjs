// Writes the per-mode scenario files from the catalogues, or with --check verifies that the
// committed files are exactly what the catalogues produce. There are two suites of fixtures: the
// Version 1 catalogue and the room-capacity fixtures beside it. The acceptance cases of the next
// version are written the same way, as a file of cases and a readable matrix for each number of
// players; they are specifications and not fixtures, and nothing here runs them.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCapacityCatalog } from '../../../tests/scenarios/capacity/catalog.mjs';
import { GROUPS as CAPACITY_GROUPS, capacityFileUrl, renderCapacityFile } from '../../../tests/scenarios/capacity/files.mjs';
import { casesOf } from '../../../tests/scenarios/next-version/catalog.mjs';
import { AUDIT_PATH, EVIDENCE_COMMITTED, EVIDENCE_PATH, MODES, acceptanceFileUrl, matrixFileUrl, renderAcceptanceFile, renderMatrix } from '../../../tests/scenarios/next-version/files.mjs';
import { AUDIT_TABLES, EVIDENCE_TABLES, fillGenerated } from '../../../tests/scenarios/next-version/tables.mjs';
import { buildCatalog } from '../../../tests/scenarios/v1/catalog.mjs';
import { GROUPS, renderFile, scenarioFileUrl } from '../../../tests/scenarios/v1/files.mjs';

const checkOnly = process.argv.includes('--check');
const catalog = buildCatalog();
const capacity = buildCapacityCatalog();
const files = [
  ...GROUPS.map(group => ({ scenarios: catalog[group], text: renderFile(group, catalog[group]), url: scenarioFileUrl(group) })),
  ...CAPACITY_GROUPS.map(group => ({ scenarios: capacity[group], text: renderCapacityFile(group, capacity[group]), url: capacityFileUrl(group) })),
  ...MODES.flatMap(mode => {
    const cases = casesOf(mode);
    return [
      { scenarios: cases, what: 'cases', text: renderAcceptanceFile(mode, cases), url: acceptanceFileUrl(mode) },
      { scenarios: cases, what: 'cases', text: renderMatrix(mode, cases), url: matrixFileUrl(mode) },
    ];
  }),
];
let stale = 0;
for (const { scenarios, text, url, what = 'scenarios' } of files) {
  if (checkOnly) {
    let current = null;
    try { current = readFileSync(url, 'utf8'); } catch { /* missing file counts as stale */ }
    if (current !== text) { stale += 1; console.error(`Stale scenario file: ${url.pathname}`); }
  } else {
    mkdirSync(dirname(fileURLToPath(url)), { recursive: true });
    writeFileSync(url, text);
    console.log(`${String(scenarios.length).padStart(4)} ${what} -> ${url.pathname.split('/').slice(-4).join('/')}`);
  }
}
// The documents of the next-version audit print tables between markers. The tables are computed;
// the prose around them is written by hand and is left alone.
const repository = new URL('../../../', import.meta.url);
for (const { path, tables } of [{ path: AUDIT_PATH, tables: AUDIT_TABLES }, ...(EVIDENCE_COMMITTED ? [{ path: EVIDENCE_PATH, tables: EVIDENCE_TABLES }] : [])]) {
  const url = new URL(path, repository);
  const current = readFileSync(url, 'utf8');
  const filled = fillGenerated(current, tables());
  if (checkOnly) {
    if (filled !== current) { stale += 1; console.error(`Stale tables in: ${path}`); }
  } else {
    writeFileSync(url, filled);
    console.log(`      tables -> ${path}`);
  }
}
if (stale > 0) { console.error('Run: npm run materialize --workspace @mothership/balance'); process.exit(1); }
if (checkOnly) console.log('Scenario files and the acceptance matrix match the catalogues.');
