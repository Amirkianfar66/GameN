import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { verifyBoardV2RuntimePorts } from '../../scripts/board-v2-runtime-ports.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const catalogs = ['board-v2-runtime-ports.json', 'board-v2-motion-ports.json', 'board-v2-films-ports.json'].map(name => `design/releases/${name}`);
const entries = catalogs.flatMap(path => JSON.parse(readFileSync(join(root, path))).entries);

function candidate(t) {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-film-ports-'));
  t.after(() => rmSync(destination, { recursive: true, force: true }));
  for (const path of new Set([...catalogs, ...entries.flatMap(entry => [entry.runtime, entry.source])])) {
    mkdirSync(dirname(join(destination, path)), { recursive: true });
    cpSync(join(root, path), join(destination, path));
  }
  return destination;
}

test('all 27 Board V2 ports reconstruct from their original source with only recorded adaptations', () => {
  assert.equal(verifyBoardV2RuntimePorts(root), 27);
});
test('the new supplement does not permit additional drawing modules', t => {
  const destination = candidate(t);
  writeFileSync(join(destination, 'apps/game/hosted/board-v2-drawing/unreviewed.mjs'), 'export const unreviewed = true;');
  assert.throws(() => verifyBoardV2RuntimePorts(destination), /Unreviewed or missing/);
});
for (const field of ['runtime', 'source']) test(`the new supplement rejects changed ${field} bytes`, t => {
  const destination = candidate(t), path = entries.at(-1)[field];
  writeFileSync(join(destination, path), readFileSync(join(destination, path), 'utf8') + '\nchanged');
  assert.throws(() => verifyBoardV2RuntimePorts(destination), /drift/);
});
test('the supplement catalog cannot authorize changed derivatives by editing itself', t => {
  const destination = candidate(t), path = catalogs.at(-1);
  writeFileSync(join(destination, path), readFileSync(join(destination, path), 'utf8') + '\n');
  assert.throws(() => verifyBoardV2RuntimePorts(destination), /film port catalog drift/);
});
