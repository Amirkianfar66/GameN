import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {PREGAME_CONSUMER_CANDIDATE, PREGAME_CONSUMER_CANDIDATE_SHA256, PREGAME_CONSUMER_REVIEW_ENV,
  readPregameConsumerCandidate, acceptsPregameCandidateFile} from '../../scripts/pregame-consumer-candidate.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const record = JSON.parse(readFileSync(join(root, PREGAME_CONSUMER_CANDIDATE), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function review(t, value = '1') {
  const before = process.env[PREGAME_CONSUMER_REVIEW_ENV];
  if (value === undefined) delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
  else process.env[PREGAME_CONSUMER_REVIEW_ENV] = value;
  t.after(() => {
    if (before === undefined) delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
    else process.env[PREGAME_CONSUMER_REVIEW_ENV] = before;
  });
}
function fixture(t) {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-pregame-consumer-'));
  t.after(() => rmSync(destination, {recursive: true, force: true}));
  const copy = (source, target = source) => {
    mkdirSync(dirname(join(destination, target)), {recursive: true});
    cpSync(join(root, source), join(destination, target));
  };
  for (const path of [PREGAME_CONSUMER_CANDIDATE, record.artManifest.path, record.existingConsumerApproval.path]) copy(path);
  for (const [path, entry] of Object.entries(record.files)) {
    copy(entry.candidateBlob);
    copy(entry.candidateBlob, path);
    for (const digest of entry.acceptedPreviousHashes) copy(`${record.historicalBlobsDirectory}/${digest}`);
  }
  return destination;
}
function change(destination, path) {
  const file = join(destination, path);
  writeFileSync(file, readFileSync(file, 'utf8') + '\n// unreviewed content\n');
}

test('candidate review is disabled without exactly the one explicit flag and reads no files', t => {
  review(t, '0');
  for (const value of [undefined, '', '0', 'true', 'yes', '01', '1 ', ' 1']) {
    if (value === undefined) delete process.env[PREGAME_CONSUMER_REVIEW_ENV];
    else process.env[PREGAME_CONSUMER_REVIEW_ENV] = value;
    assert.equal(readPregameConsumerCandidate('/this/directory/does/not/exist'), null);
  }
});

test('the independently pinned record permits only the exact eleven local consumer files', t => {
  review(t);
  const destination = fixture(t);
  const candidate = readPregameConsumerCandidate(destination);
  assert.equal(sha(readFileSync(join(root, PREGAME_CONSUMER_CANDIDATE))), PREGAME_CONSUMER_CANDIDATE_SHA256);
  assert.equal(candidate.status, 'local-review-only');
  assert.equal(Object.keys(candidate.files).length, 11);
  assert.equal(candidate.files['apps/game/hosted/planet/app.mjs'].sha256,
    '610711ad7b38bc77936c4f7817dc6c389ce83110c70b198d3b476373b1cca0ca');
  assert.ok(Object.isFrozen(candidate) && Object.isFrozen(candidate.files));
  for (const [path, entry] of Object.entries(candidate.files)) {
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.acceptedPreviousHashes));
    assert.equal(readFileSync(join(destination, path)).length, entry.bytes);
    for (const previous of entry.acceptedPreviousHashes) assert.equal(acceptsPregameCandidateFile(candidate, path, previous, entry.sha256), true);
    assert.equal(acceptsPregameCandidateFile(candidate, path, '0'.repeat(64), entry.sha256), false);
    assert.equal(acceptsPregameCandidateFile(candidate, path, entry.previousSha256, '0'.repeat(64)), false);
  }
  assert.equal(acceptsPregameCandidateFile(candidate, 'unlisted.mjs', '0'.repeat(64), '0'.repeat(64)), false);
  assert.equal(acceptsPregameCandidateFile(null, 'unlisted.mjs', '0'.repeat(64), '0'.repeat(64)), false);
  assert.equal(acceptsPregameCandidateFile(structuredClone(candidate), 'apps/game/hosted/planet/app.mjs',
    candidate.files['apps/game/hosted/planet/app.mjs'].previousSha256,
    candidate.files['apps/game/hosted/planet/app.mjs'].sha256), false);
  assert.equal(acceptsPregameCandidateFile(candidate, '__proto__', undefined, undefined), false);
  process.env[PREGAME_CONSUMER_REVIEW_ENV] = '0';
  const app = candidate.files['apps/game/hosted/planet/app.mjs'];
  assert.equal(acceptsPregameCandidateFile(candidate, 'apps/game/hosted/planet/app.mjs', app.previousSha256, app.sha256), false);
});

test('accepted previous identities include the baseline and exact 06/07/08 inventory hashes', () => {
  const manifests = [6, 7, 8].map(version => JSON.parse(readFileSync(join(root, `design/releases/design-0.${version}.0.json`), 'utf8')));
  const previous = new Set();
  for (const [path, entry] of Object.entries(record.files)) {
    const expected = new Set(entry.previousSha256 ? [entry.previousSha256] : []);
    for (const manifest of manifests) for (const kind of ['sources', 'runtimeFiles']) {
      if (manifest[kind][path]) expected.add(manifest[kind][path]);
    }
    assert.deepEqual(entry.acceptedPreviousHashes, [...expected].sort());
    assert.equal(entry.candidateBlob, `design/releases/candidate-blobs/${entry.sha256}`);
    assert.equal(sha(readFileSync(join(root, entry.candidateBlob))), entry.sha256);
    for (const digest of expected) {
      previous.add(digest);
      assert.equal(sha(readFileSync(join(root, record.historicalBlobsDirectory, digest))), digest);
    }
  }
  assert.equal(previous.size, 9);
});

for (const [label, path, pattern] of [
  ['current consumer', 'apps/game/hosted/planet/app.mjs', /current content differs/],
  ['candidate review blob', record.files['apps/game/hosted/planet/app.mjs'].candidateBlob, /candidate blob content differs/],
  ['preserved previous blob', `${record.historicalBlobsDirectory}/${record.files['apps/game/hosted/planet/app.mjs'].previousSha256}`, /preserved previous content differs/],
  ['08 art manifest', record.artManifest.path, /art manifest binding differs/],
  ['existing immutable consumer approval', record.existingConsumerApproval.path, /existing consumer approval differs/],
  ['candidate approval', PREGAME_CONSUMER_CANDIDATE, /independent approval hash differs/],
]) test(`local review rejects changed ${label}`, t => {
  review(t);
  const destination = fixture(t);
  change(destination, path);
  assert.throws(() => readPregameConsumerCandidate(destination), pattern);
});

test('changing candidate bytes, blob and record together cannot authorize another consumer', t => {
  review(t);
  const destination = fixture(t);
  const path = 'apps/game/hosted/planet/app.mjs';
  change(destination, path);
  const bytes = readFileSync(join(destination, path));
  const changed = structuredClone(record);
  changed.files[path].sha256 = sha(bytes);
  changed.files[path].bytes = bytes.length;
  changed.files[path].candidateBlob = `design/releases/candidate-blobs/${sha(bytes)}`;
  writeFileSync(join(destination, changed.files[path].candidateBlob), bytes);
  writeFileSync(join(destination, PREGAME_CONSUMER_CANDIDATE), JSON.stringify(changed));
  assert.throws(() => readPregameConsumerCandidate(destination), /independent approval hash differs/);
});

for (const [label, path] of [
  ['consumer', 'apps/game/hosted/planet/app.mjs'],
  ['candidate blob', record.files['apps/game/hosted/planet/app.mjs'].candidateBlob],
  ['previous blob', `${record.historicalBlobsDirectory}/${record.files['apps/game/hosted/planet/app.mjs'].previousSha256}`],
  ['approval', PREGAME_CONSUMER_CANDIDATE],
]) test(`local review rejects a symlink substituted for the ${label}`, t => {
  review(t);
  const destination = fixture(t);
  const target = join(destination, 'original-bytes');
  cpSync(join(destination, path), target);
  rmSync(join(destination, path));
  symlinkSync(target, join(destination, path));
  assert.throws(() => readPregameConsumerCandidate(destination), /regular file required/);
});

test('local review rejects a symlink in a consumer parent directory', t => {
  review(t);
  const destination = fixture(t);
  const directory = join(destination, 'apps/game/hosted/planet');
  const original = join(destination, 'original-planet');
  cpSync(directory, original, {recursive: true});
  rmSync(directory, {recursive: true});
  symlinkSync(original, directory);
  assert.throws(() => readPregameConsumerCandidate(destination), /regular file required/);
});
