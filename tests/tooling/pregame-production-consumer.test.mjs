import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {PREGAME_PRODUCTION_CONSUMER_APPROVAL, PREGAME_PRODUCTION_CONSUMER_APPROVAL_SHA256,
  readPregameProductionConsumerApproval, readPregameConsumerApproval,
  acceptsPregameProductionFile} from '../../scripts/pregame-consumer-approval.mjs';
import {PREGAME_CONSUMER_CANDIDATE, PREGAME_CONSUMER_CANDIDATE_SHA256, PREGAME_CONSUMER_REVIEW_ENV,
  readVerifiedPregameConsumerInventory, readPregameConsumerCandidate,
  acceptsPregameCandidateFile} from '../../scripts/pregame-consumer-candidate.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const candidateRecord = JSON.parse(readFileSync(join(root, PREGAME_CONSUMER_CANDIDATE), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const appPath = 'apps/game/hosted/planet/app.mjs';
const appEntry = candidateRecord.files[appPath];
function mode(t, value) {
  const before = process.env[PREGAME_CONSUMER_REVIEW_ENV];
  if (value === undefined) delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
  else process.env[PREGAME_CONSUMER_REVIEW_ENV] = value;
  t.after(() => {
    if (before === undefined) delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
    else process.env[PREGAME_CONSUMER_REVIEW_ENV] = before;
  });
}
function temporary(t) {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-pregame-production-'));
  t.after(() => rmSync(destination, {recursive: true, force: true}));
  return destination;
}
function actualApproval() {
  // Positive fixtures use the actual independently approved record; no synthetic approval.
  return JSON.parse(readFileSync(join(root, PREGAME_PRODUCTION_CONSUMER_APPROVAL), 'utf8'));
}
function seed(t) {
  const destination = temporary(t);
  const record = actualApproval();
  const copy = (source, target = source) => {
    mkdirSync(dirname(join(destination, target)), {recursive: true});
    cpSync(join(root, source), join(destination, target));
  };
  for (const path of [PREGAME_PRODUCTION_CONSUMER_APPROVAL, PREGAME_CONSUMER_CANDIDATE,
    candidateRecord.artManifest.path, candidateRecord.existingConsumerApproval.path]) copy(path);
  for (const [path, entry] of Object.entries(candidateRecord.files)) {
    copy(entry.candidateBlob);
    copy(entry.candidateBlob, path);
    for (const digest of entry.acceptedPreviousHashes) copy(`${candidateRecord.historicalBlobsDirectory}/${digest}`);
  }
  for (const reference of [...record.captureEvidence.reports, ...record.captureEvidence.files, record.captureEvidence.acceptance]) copy(reference.path);
  return {destination, record};
}
function change(destination, path) {
  const file = join(destination, path);
  writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('\nunreviewed byte change\n')]));
}

test('absent production approval returns null through both public reader names', t => {
  mode(t, undefined);
  const destination = temporary(t);
  assert.equal(readPregameProductionConsumerApproval(destination), null);
  assert.equal(readPregameConsumerApproval(destination), null);
  assert.equal(readPregameConsumerApproval, readPregameProductionConsumerApproval);
});

test('a present invalid production approval throws without a fallback', t => {
  mode(t, undefined);
  const destination = temporary(t);
  const path = join(destination, PREGAME_PRODUCTION_CONSUMER_APPROVAL);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, '// deliberately unapproved negative fixture\n');
  assert.throws(() => readPregameProductionConsumerApproval(destination), /independent approval hash differs/);
});

test('a dangling approval symlink is invalid rather than absent', t => {
  mode(t, undefined);
  const destination = temporary(t);
  const path = join(destination, PREGAME_PRODUCTION_CONSUMER_APPROVAL);
  mkdirSync(dirname(path), {recursive: true});
  symlinkSync(join(destination, 'missing-approval-target'), path);
  assert.throws(() => readPregameProductionConsumerApproval(destination), /regular file required/);
});

test('default local mode remains disabled before any file reads for every non-1 value', t => {
  mode(t, undefined);
  for (const value of [undefined, '', '0', 'true', 'yes', '01', '1 ', ' 1']) {
    if (value === undefined) delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
    else process.env[PREGAME_CONSUMER_REVIEW_ENV] = value;
    assert.equal(readPregameConsumerCandidate('/missing/read-only-test-root'), null);
    assert.equal(acceptsPregameCandidateFile(candidateRecord, appPath, appEntry.previousSha256, appEntry.sha256), false);
  }
});

test('default production approval binds the actual complete eleven, evidence and immutable artwork identities', t => {
  mode(t, undefined);
  const {destination, record} = seed(t);
  const approval = readPregameProductionConsumerApproval(destination);
  assert.deepEqual(approval, record);
  assert.deepEqual(readPregameConsumerApproval(destination), record);
  assert.equal(sha(readFileSync(join(root, PREGAME_PRODUCTION_CONSUMER_APPROVAL))), PREGAME_PRODUCTION_CONSUMER_APPROVAL_SHA256);
  assert.equal(approval.schema, 'mothership.pregame-production-consumer-approval/1');
  assert.equal(approval.status, 'approved-production-consumer');
  assert.deepEqual(approval.candidate, {path: PREGAME_CONSUMER_CANDIDATE, sha256: PREGAME_CONSUMER_CANDIDATE_SHA256});
  assert.deepEqual(approval.files, candidateRecord.files);
  assert.equal(Object.keys(approval.files).length, 11);
  assert.equal(approval.artManifest.sha256, 'c2e5b6a423d2a583be669147b70a23e2391fce770372137e99f46c3c75b13b5d');
  assert.equal(approval.existingConsumerApproval.sha256, '8675a1d45cbf55aa69ccc65e18593d28c7ac54282ed52eb5c10e9b70e2c0511e');
  assert.ok(Object.isFrozen(approval) && Object.isFrozen(approval.files) && Object.isFrozen(approval.captureEvidence));
  assert.ok(approval.captureEvidence.reports.length > 0 && approval.captureEvidence.files.length > 0);
  for (const reference of [...approval.captureEvidence.reports, ...approval.captureEvidence.files, approval.captureEvidence.acceptance]) {
    const bytes = readFileSync(join(destination, reference.path));
    assert.equal(bytes.length, reference.bytes);
    assert.equal(sha(bytes), reference.sha256);
    assert.ok(Object.isFrozen(reference));
  }
  const prior = new Set();
  for (const [path, entry] of Object.entries(approval.files)) {
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.acceptedPreviousHashes));
    assert.equal(sha(readFileSync(join(destination, path))), entry.sha256);
    for (const digest of entry.acceptedPreviousHashes) {
      prior.add(digest);
      assert.equal(acceptsPregameProductionFile(approval, path, digest, entry.sha256), true);
      assert.equal(sha(readFileSync(join(destination, candidateRecord.historicalBlobsDirectory, digest))), digest);
    }
  }
  assert.equal(prior.size, 9);
  assert.equal(readPregameConsumerCandidate(destination), null);
});

test('production capabilities reject clones, unknown paths and every unapproved prior or current hash', t => {
  mode(t, undefined);
  const {destination} = seed(t);
  const approval = readPregameProductionConsumerApproval(destination);
  const clone = structuredClone(approval);
  for (const fake of [null, candidateRecord, clone, {files: approval.files}, Object.freeze(clone)]) {
    assert.equal(acceptsPregameProductionFile(fake, appPath, appEntry.previousSha256, appEntry.sha256), false);
  }
  assert.equal(acceptsPregameProductionFile(approval, 'unlisted.mjs', appEntry.previousSha256, appEntry.sha256), false);
  assert.equal(acceptsPregameProductionFile(approval, '__proto__', undefined, undefined), false);
  assert.equal(acceptsPregameProductionFile(approval, appPath, '0'.repeat(64), appEntry.sha256), false);
  assert.equal(acceptsPregameProductionFile(approval, appPath, appEntry.previousSha256, '0'.repeat(64)), false);
  for (const [path, entry] of Object.entries(approval.files).filter(([, entry]) => entry.previousSha256 === null)) {
    assert.deepEqual(entry.acceptedPreviousHashes, []);
    assert.equal(acceptsPregameProductionFile(approval, path, null, entry.sha256), false);
  }
});

test('internal inventory verification grants neither local nor production approval capabilities', t => {
  mode(t, '1');
  const {destination} = seed(t);
  const inventory = readVerifiedPregameConsumerInventory(destination);
  const candidate = readPregameConsumerCandidate(destination);
  const production = readPregameProductionConsumerApproval(destination);
  assert.deepEqual(inventory, candidate);
  assert.equal(acceptsPregameCandidateFile(inventory, appPath, appEntry.previousSha256, appEntry.sha256), false);
  assert.equal(acceptsPregameProductionFile(inventory, appPath, appEntry.previousSha256, appEntry.sha256), false);
  assert.equal(acceptsPregameProductionFile(candidate, appPath, appEntry.previousSha256, appEntry.sha256), false);
  assert.equal(acceptsPregameCandidateFile(production, appPath, appEntry.previousSha256, appEntry.sha256), false);
  assert.equal(acceptsPregameCandidateFile(candidate, appPath, appEntry.previousSha256, appEntry.sha256), true);
  assert.equal(acceptsPregameProductionFile(production, appPath, appEntry.previousSha256, appEntry.sha256), true);
  delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
  assert.equal(acceptsPregameCandidateFile(candidate, appPath, appEntry.previousSha256, appEntry.sha256), false);
  assert.equal(acceptsPregameProductionFile(production, appPath, appEntry.previousSha256, appEntry.sha256), true);
});

for (const [label, select, pattern] of [
  ['native consumer', () => appPath, /current content differs/],
  ['reviewed candidate blob', () => appEntry.candidateBlob, /candidate blob content differs/],
  ['preserved previous blob', () => `${candidateRecord.historicalBlobsDirectory}/${appEntry.previousSha256}`, /preserved previous content differs/],
  ['capture report', record => record.captureEvidence.reports[0].path, /evidence content differs/],
  ['captured artifact', record => record.captureEvidence.files[0].path, /evidence content differs/],
  ['actual acceptance artifact', record => record.captureEvidence.acceptance.path, /evidence content differs/],
  ['candidate record', () => PREGAME_CONSUMER_CANDIDATE, /independent approval hash differs/],
  ['production record', () => PREGAME_PRODUCTION_CONSUMER_APPROVAL, /independent approval hash differs/],
  ['08 art manifest', () => candidateRecord.artManifest.path, /art manifest binding differs/],
  ['old consumer approval', () => candidateRecord.existingConsumerApproval.path, /existing consumer approval differs/],
]) test(`production approval rejects drift in ${label}`, t => {
  mode(t, undefined);
  const {destination, record} = seed(t);
  change(destination, select(record));
  assert.throws(() => readPregameProductionConsumerApproval(destination), pattern);
});

test('rewriting the record and native/blob hashes together cannot self-authorize another consumer', t => {
  mode(t, undefined);
  const {destination, record} = seed(t);
  change(destination, appPath);
  const bytes = readFileSync(join(destination, appPath));
  const changed = structuredClone(record);
  changed.files[appPath].sha256 = sha(bytes);
  changed.files[appPath].bytes = bytes.length;
  changed.files[appPath].candidateBlob = `design/releases/candidate-blobs/${sha(bytes)}`;
  writeFileSync(join(destination, changed.files[appPath].candidateBlob), bytes);
  writeFileSync(join(destination, PREGAME_PRODUCTION_CONSUMER_APPROVAL), JSON.stringify(changed));
  assert.throws(() => readPregameProductionConsumerApproval(destination), /independent approval hash differs/);
});

for (const [label, select] of [
  ['native consumer', () => appPath],
  ['candidate review blob', () => appEntry.candidateBlob],
  ['preserved prior blob', () => `${candidateRecord.historicalBlobsDirectory}/${appEntry.previousSha256}`],
  ['capture report', record => record.captureEvidence.reports[0].path],
  ['capture output', record => record.captureEvidence.files[0].path],
  ['acceptance artifact', record => record.captureEvidence.acceptance.path],
  ['candidate record', () => PREGAME_CONSUMER_CANDIDATE],
  ['production record', () => PREGAME_PRODUCTION_CONSUMER_APPROVAL],
]) test(`production approval rejects symlink substitution of ${label}`, t => {
  mode(t, undefined);
  const {destination, record} = seed(t);
  const path = select(record);
  const original = join(destination, 'preserved-original');
  cpSync(join(destination, path), original);
  rmSync(join(destination, path));
  symlinkSync(original, join(destination, path));
  assert.throws(() => readPregameProductionConsumerApproval(destination), /regular file required/);
});

test('production approval rejects missing native, blob and capture inputs', t => {
  mode(t, undefined);
  const {destination, record} = seed(t);
  for (const path of [appPath, appEntry.candidateBlob, record.captureEvidence.reports[0].path]) {
    const bytes = readFileSync(join(destination, path));
    rmSync(join(destination, path));
    assert.throws(() => readPregameProductionConsumerApproval(destination), /ENOENT/);
    writeFileSync(join(destination, path), bytes);
  }
});

test('production approval rejects symlinked consumer and evidence parent directories', t => {
  mode(t, undefined);
  const {destination, record} = seed(t);
  for (const [index, path] of [appPath, record.captureEvidence.reports[0].path].entries()) {
    const directory = dirname(join(destination, path));
    const original = join(destination, `original-parent-${index}`);
    cpSync(directory, original, {recursive: true});
    rmSync(directory, {recursive: true});
    symlinkSync(original, directory);
    assert.throws(() => readPregameProductionConsumerApproval(destination), /regular file required/);
    rmSync(directory);
    cpSync(original, directory, {recursive: true});
  }
});
