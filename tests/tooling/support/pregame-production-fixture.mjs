import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {PREGAME_PRODUCTION_DRAWING_POLICY} from '../../../design/tools/lib/drawing-port-fence.mjs';
import {PREGAME_PRODUCTION_CONSUMER_APPROVAL, readPregameConsumerApproval} from '../../../scripts/pregame-consumer-approval.mjs';

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
  return paths;
}
