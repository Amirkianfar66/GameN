import {cpSync, existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {PREGAME_PRODUCTION_DRAWING_POLICY, PHONE_UI_PRODUCTION_DRAWING_POLICY, HOST_ABORT_DRAWING_POLICY} from '../../../design/tools/lib/drawing-port-fence.mjs';
import {PREGAME_PRODUCTION_CONSUMER_APPROVAL, readPregameConsumerApproval} from '../../../scripts/pregame-consumer-approval.mjs';
import {PHONE_UI_CONSUMER_APPROVAL, readPhoneUiConsumerApproval, HOST_ABORT_CONSUMER_APPROVAL,
  readHostAbortConsumerApproval} from '../../../scripts/phone-ui-consumer-approval.mjs';

/** Copy only actual verified adoption evidence. An absent record creates no acceptance. */
export function pregameProductionFixturePaths(root) {
  const paths = new Set();
  if (existsSync(join(root, PREGAME_PRODUCTION_DRAWING_POLICY))) paths.add(PREGAME_PRODUCTION_DRAWING_POLICY);
  const approval = readPregameConsumerApproval(root);
  if (approval === null) return paths;
  for (const path of [PREGAME_PRODUCTION_CONSUMER_APPROVAL, approval.candidate.path,
    approval.artManifest.path, approval.existingConsumerApproval.path]) paths.add(path);
  for (const [path, entry] of Object.entries(approval.files)) {
    paths.add(path); paths.add(entry.candidateBlob);
    for (const digest of entry.acceptedPreviousHashes) paths.add(`design/releases/historical-blobs/${digest}`);
  }
  for (const reference of [...approval.captureEvidence.reports, ...approval.captureEvidence.files,
    approval.captureEvidence.acceptance]) paths.add(reference.path);
  const phone = readPhoneUiConsumerApproval(root);
  if (phone) {
    paths.add(PHONE_UI_CONSUMER_APPROVAL);
    if (existsSync(join(root, PHONE_UI_PRODUCTION_DRAWING_POLICY))) paths.add(PHONE_UI_PRODUCTION_DRAWING_POLICY);
    for (const [path, entry] of Object.entries(phone.files)) {
      paths.add(path); paths.add(entry.candidateBlob);
      for (const digest of entry.acceptedPreviousHashes) paths.add(`design/releases/historical-blobs/${digest}`);
    }
    for (const reference of [...phone.captureEvidence.reports, ...phone.captureEvidence.files,
      phone.captureEvidence.acceptance]) paths.add(reference.path);
  }
  const abort = readHostAbortConsumerApproval(root);
  if (abort) {
    paths.add(HOST_ABORT_CONSUMER_APPROVAL); paths.add(abort.file.candidateBlob);
    for (const reference of abort.evidence) paths.add(reference.path);
    if (existsSync(join(root, HOST_ABORT_DRAWING_POLICY))) paths.add(HOST_ABORT_DRAWING_POLICY);
  }
  return paths;
}

/** Restore the actual prior consumer in a temporary fixture, not a synthetic approval. */
export function restoreHistoricalPregameFixture(root, destination) {
  const phone = readPhoneUiConsumerApproval(root);
  if (!phone) return;
  for (const path of [PHONE_UI_CONSUMER_APPROVAL, PHONE_UI_PRODUCTION_DRAWING_POLICY,
    HOST_ABORT_CONSUMER_APPROVAL, HOST_ABORT_DRAWING_POLICY])
    rmSync(join(destination, path), {force: true});
  const restore = (path, digest) => {
    const source = join(root, 'design/releases/historical-blobs', digest);
    if (createHash('sha256').update(readFileSync(source)).digest('hex') !== digest)
      throw Error(`Historical fixture source differs: ${path}`);
    mkdirSync(dirname(join(destination, path)), {recursive: true});
    cpSync(source, join(destination, path));
  };
  for (const [path, entry] of Object.entries(phone.files)) {
    if (entry.previousSha256 === null) rmSync(join(destination, path), {force: true});
    else restore(path, entry.previousSha256);
  }
  const policy = JSON.parse(readFileSync(join(root, PREGAME_PRODUCTION_DRAWING_POLICY)));
  for (const [path, digest] of Object.entries(policy.requiredFiles)) {
    if (path.startsWith('scripts/') && existsSync(join(destination, path)) &&
      createHash('sha256').update(readFileSync(join(destination, path))).digest('hex') !== digest)
      restore(path, digest);
  }
}
