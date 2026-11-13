import assert from 'node:assert/strict';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {HOST_ABORT_CONSUMER_APPROVAL, PHONE_UI_CONSUMER_APPROVAL,
  readHostAbortConsumerApproval, readPhoneUiConsumerApproval, acceptsPhoneUiConsumerFile}
  from '../../scripts/phone-ui-consumer-approval.mjs';
import {readPregameProductionConsumerApproval, acceptsPregameProductionFile}
  from '../../scripts/pregame-consumer-approval.mjs';
import {pregameProductionFixturePaths, restoreBeforeFoodFixture} from './support/pregame-production-fixture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const copy = (destination, path) => {
  mkdirSync(dirname(join(destination, path)), {recursive: true});
  cpSync(join(root, path), join(destination, path));
};
function seed(t) {
  const destination = mkdtempSync(join(tmpdir(), 'gamen-abort-adoption-'));
  t.after(() => rmSync(destination, {recursive: true, force: true}));
  for (const path of pregameProductionFixturePaths(root)) copy(destination, path);
  return destination;
}

test('host confirmation adoption preserves the parent inventory and accepts only its exact successor', t => {
  const destination = seed(t), child = readHostAbortConsumerApproval(destination);
  const phone = readPhoneUiConsumerApproval(destination), parent = readPregameProductionConsumerApproval(destination);
  assert.deepEqual(phone, JSON.parse(readFileSync(join(root, PHONE_UI_CONSUMER_APPROVAL))));
  assert.equal(child.file.path, 'apps/game/hosted/planet/app.mjs');
  assert.ok(Object.isFrozen(child) && Object.isFrozen(child.file));
  for (const previous of [child.file.previousSha256, ...phone.files[child.file.path].acceptedPreviousHashes]) {
    assert.equal(acceptsPhoneUiConsumerFile(phone, child.file.path, previous, child.file.sha256), true);
    assert.equal(acceptsPregameProductionFile(parent, child.file.path, previous, child.file.sha256), true);
  }
  for (const [path, previous, actual] of [
    ['apps/game/hosted/planet/render.mjs', child.file.previousSha256, child.file.sha256],
    [child.file.path, '0'.repeat(64), child.file.sha256],
    [child.file.path, child.file.previousSha256, '0'.repeat(64)],
  ]) assert.equal(acceptsPhoneUiConsumerFile(phone, path, previous, actual), false);
  assert.equal(acceptsPhoneUiConsumerFile(structuredClone(phone), child.file.path,
    child.file.previousSha256, child.file.sha256), false);
});

test('removing the correction cannot silently authorize its source, while genuine predecessor bytes still verify', t => {
  const destination = seed(t); restoreBeforeFoodFixture(root, destination);
  const child = readHostAbortConsumerApproval(destination);
  const phone = readPhoneUiConsumerApproval(destination);
  rmSync(join(destination, HOST_ABORT_CONSUMER_APPROVAL));
  assert.equal(readHostAbortConsumerApproval(destination), null);
  assert.throws(() => readPhoneUiConsumerApproval(destination), /current content differs/);
  cpSync(join(destination, phone.files[child.file.path].candidateBlob), join(destination, child.file.path));
  assert.deepEqual(readPhoneUiConsumerApproval(destination), phone);
});

test('approval, source, preserved candidate and evidence mutations all reject the correction', t => {
  const destination = seed(t), child = readHostAbortConsumerApproval(destination);
  for (const path of [HOST_ABORT_CONSUMER_APPROVAL, child.file.path, child.file.candidateBlob,
    child.parentApproval.path, child.evidence[0].path]) {
    const file = join(destination, path);
    writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('\nunreviewed\n')]));
    assert.throws(() => readPhoneUiConsumerApproval(destination), /differs/, path);
    copy(destination, path);
  }
});

test('a present correction requires every evidence file and refuses same-byte symlink substitutions', t => {
  const destination = seed(t), child = readHostAbortConsumerApproval(destination);
  for (const path of [HOST_ABORT_CONSUMER_APPROVAL, child.file.path, child.file.candidateBlob, child.evidence[0].path]) {
    rmSync(join(destination, path));
    symlinkSync(join(root, path), join(destination, path));
    assert.throws(() => readPhoneUiConsumerApproval(destination), /regular file required/, path);
    rmSync(join(destination, path)); copy(destination, path);
  }
  rmSync(join(destination, child.evidence.at(-1).path));
  assert.throws(() => readPhoneUiConsumerApproval(destination), /ENOENT/);
});
