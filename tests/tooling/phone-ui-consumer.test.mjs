import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {PHONE_UI_CONSUMER_APPROVAL, PHONE_UI_CONSUMER_APPROVAL_SHA256,
  readPhoneUiConsumerApproval, acceptsPhoneUiConsumerFile} from '../../scripts/phone-ui-consumer-approval.mjs';
import {readPregameProductionConsumerApproval, acceptsPregameProductionFile} from '../../scripts/pregame-consumer-approval.mjs';
import {pregameProductionFixturePaths} from './support/pregame-production-fixture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
const copy = (destination, path) => {
  mkdirSync(dirname(join(destination, path)), {recursive: true});
  cpSync(join(root, path), join(destination, path));
};
function temporary(t) {
  const destination = mkdtempSync(join(tmpdir(), 'gamen-phone-adoption-'));
  t.after(() => rmSync(destination, {recursive: true, force: true}));
  return destination;
}
function seed(t) {
  // Positive cases use the actual independently pinned review, never a fabricated approval.
  const record = readPhoneUiConsumerApproval(root);
  assert.ok(record, 'An exact reviewed native adoption is required');
  const destination = temporary(t);
  for (const path of pregameProductionFixturePaths(root)) copy(destination, path);
  return {destination, record};
}
function change(destination, path) {
  const file = join(destination, path);
  writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('\nunreviewed change\n')]));
}

test('absence preserves history, but invalid or dangling approval cannot become absence', t => {
  const destination = temporary(t);
  assert.equal(readPhoneUiConsumerApproval(destination), null);
  const path = join(destination, PHONE_UI_CONSUMER_APPROVAL);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, '{}');
  assert.throws(() => readPhoneUiConsumerApproval(destination), /independent approval hash differs/);
  rmSync(path); symlinkSync(join(destination, 'missing.json'), path);
  assert.throws(() => readPhoneUiConsumerApproval(destination), /regular file required/);
});

test('reviewed phone bytes extend consumption without rewriting the historical acceptance or artwork', t => {
  const {destination, record} = seed(t);
  const approval = readPhoneUiConsumerApproval(destination);
  const old = readPregameProductionConsumerApproval(destination);
  assert.deepEqual(approval, record);
  assert.equal(sha(readFileSync(join(root, PHONE_UI_CONSUMER_APPROVAL))), PHONE_UI_CONSUMER_APPROVAL_SHA256);
  assert.ok(Object.isFrozen(approval) && Object.isFrozen(approval.files) && Object.isFrozen(approval.captureEvidence));
  assert.deepEqual(old, JSON.parse(readFileSync(join(root, record.parentApproval.path))));
  for (const binding of [record.parentApproval, record.parentCandidate, record.artManifest])
    assert.equal(sha(readFileSync(join(destination, binding.path))), binding.sha256);
  for (const [path, entry] of Object.entries(record.files)) {
    assert.equal(sha(readFileSync(join(destination, path))), entry.sha256);
    assert.equal(sha(readFileSync(join(destination, entry.candidateBlob))), entry.sha256);
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.acceptedPreviousHashes));
    for (const previous of entry.acceptedPreviousHashes) {
      assert.equal(acceptsPhoneUiConsumerFile(approval, path, previous, entry.sha256), true);
      assert.equal(acceptsPregameProductionFile(old, path, previous, entry.sha256), true);
      assert.equal(sha(readFileSync(join(destination, 'design/releases/historical-blobs', previous))), previous);
    }
  }
});

test('a claimed or cloned approval, unknown path and unreviewed digest have no acceptance capability', t => {
  const {destination} = seed(t), approval = readPhoneUiConsumerApproval(destination);
  const [path, entry] = Object.entries(approval.files).find(([, entry]) => entry.acceptedPreviousHashes.length);
  const previous = entry.acceptedPreviousHashes[0];
  for (const fake of [null, structuredClone(approval), {files: approval.files}, Object.freeze(structuredClone(approval))])
    assert.equal(acceptsPhoneUiConsumerFile(fake, path, previous, entry.sha256), false);
  for (const [name, before, after] of [[path, '0'.repeat(64), entry.sha256], [path, previous, '0'.repeat(64)],
    ['__proto__', previous, entry.sha256], ['apps/game/hosted/unreviewed.mjs', previous, entry.sha256]])
    assert.equal(acceptsPhoneUiConsumerFile(approval, name, before, after), false);
});

test('current files, candidate blobs, preserved predecessors and evidence are independently required', t => {
  const {destination, record} = seed(t);
  const [path, entry] = Object.entries(record.files).find(([, entry]) => entry.acceptedPreviousHashes.length);
  const changes = [path, entry.candidateBlob, `design/releases/historical-blobs/${entry.acceptedPreviousHashes[0]}`,
    record.captureEvidence.reports[0].path, record.captureEvidence.files[0].path, record.captureEvidence.acceptance.path];
  for (const target of changes) {
    change(destination, target);
    assert.throws(() => readPhoneUiConsumerApproval(destination), /content differs/, target);
    copy(destination, target);
    rmSync(join(destination, target));
    assert.throws(() => readPhoneUiConsumerApproval(destination), /ENOENT/, target);
    copy(destination, target);
  }
});

test('editing parent records or the artwork manifest cannot repin the native candidate', t => {
  const {destination, record} = seed(t);
  for (const reference of [record.parentApproval, record.parentCandidate, record.artManifest]) {
    change(destination, reference.path);
    assert.throws(() => readPhoneUiConsumerApproval(destination), /immutable binding differs/);
    copy(destination, reference.path);
  }
  change(destination, PHONE_UI_CONSUMER_APPROVAL);
  assert.throws(() => readPhoneUiConsumerApproval(destination), /independent approval hash differs/);
});

test('a native or evidence symlink is rejected even when its target contains the approved bytes', t => {
  const {destination, record} = seed(t);
  for (const path of [Object.keys(record.files)[0], record.captureEvidence.files[0].path]) {
    rmSync(join(destination, path)); symlinkSync(join(root, path), join(destination, path));
    assert.throws(() => readPhoneUiConsumerApproval(destination), /regular file required/);
    rmSync(join(destination, path)); copy(destination, path);
  }
});
