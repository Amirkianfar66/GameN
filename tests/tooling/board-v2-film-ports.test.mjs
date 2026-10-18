import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { verifyBoardV2RuntimePorts } from '../../scripts/board-v2-runtime-ports.mjs';
import { fourClinicalBerth, fourFilmBerth } from '../../apps/game/hosted/board-v2-drawing/medical-four.mjs';

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

test('the corrected runtime helper distinguishes four physical beds from valid roster-sized clinical anchors', () => {
  for (const slotCount of [7,8,9]) for (let number=1; number<=slotCount; number++) {
    const anchor={kind:'CLINICAL_VIGNETTE',batchId:'review-batch',anchorId:`HV${number}`,slotCount};
    assert.deepEqual(fourFilmBerth(anchor,[],'seat-1'),number<=4
      ? {berth:`H${number}`,plays:true,holder:null}
      : {berth:null,plays:false,holder:null});
  }
  assert.throws(()=>fourClinicalBerth({anchorId:'HV5',slotCount:7}),/names no bed/);
  for (const anchor of [{anchorId:'HV8',slotCount:7},{anchorId:'HV5',slotCount:4},{anchorId:'HV0',slotCount:9},{anchorId:'H4',slotCount:9}]) {
    assert.throws(()=>fourFilmBerth(anchor,[],'seat-1'));
  }
});
test('the corrected helper still protects retained beds after explicit wire identity normalization', () => {
  const seats=[{seatId:'seat-1',slotId:null,health:'Healthy'},{seatId:'seat-7',slotId:'H4',health:'Eliminated'}]
    .map(({seatId,slotId})=>({seat:seatId,slotId}));
  assert.deepEqual(fourFilmBerth({anchorId:'HV4',slotCount:7},seats,'seat-1'),{berth:'H4',plays:false,holder:'seat-7'});
  assert.deepEqual(fourFilmBerth({anchorId:'HV5',slotCount:7},seats,'seat-1'),{berth:null,plays:false,holder:null});
});
