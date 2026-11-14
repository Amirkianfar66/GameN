import {cpSync, existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {PREGAME_PRODUCTION_DRAWING_POLICY, PHONE_UI_PRODUCTION_DRAWING_POLICY, HOST_ABORT_DRAWING_POLICY, FOOD_SOURCE_DRAWING_POLICY} from '../../../design/tools/lib/drawing-port-fence.mjs';
import {PREGAME_PRODUCTION_CONSUMER_APPROVAL, readPregameConsumerApproval} from '../../../scripts/pregame-consumer-approval.mjs';
import {PHONE_UI_CONSUMER_APPROVAL, readPhoneUiConsumerApproval, HOST_ABORT_CONSUMER_APPROVAL,
  readHostAbortConsumerApproval} from '../../../scripts/phone-ui-consumer-approval.mjs';
import {FOOD_CONSUMER_SOURCE, readFoodConsumerSource} from '../../../scripts/food-consumer-source.mjs';

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
  const food = readFoodConsumerSource(root);
  if (food) {
    paths.add(FOOD_CONSUMER_SOURCE); paths.add(FOOD_SOURCE_DRAWING_POLICY);
    for (const reference of [food.parentApproval, food.baseArt, food.closure, food.staticArt]) paths.add(reference.path);
    for (const [path, entry] of Object.entries(food.files)) {
      paths.add(path); paths.add(entry.candidateBlob);
      for (const digest of entry.acceptedPreviousHashes) paths.add(`design/releases/historical-blobs/${digest}`);
    }
    for (const path of Object.keys(food.sourcePins)) paths.add(path);
    for (const digest of Object.values(food.predecessorTooling)) paths.add(`design/releases/historical-blobs/${digest}`);
    const art = JSON.parse(readFileSync(join(root, food.staticArt.path)));
    for (const path of Object.keys(art.inputs)) paths.add(path);
    for (const asset of art.assets) paths.add(asset.source);
  }
  return paths;
}

/** Isolate predecessor tests using preserved bytes, never fabricated acceptance. */
export function restoreBeforeFoodFixture(root, destination) {
  const food = readFoodConsumerSource(root);
  if (!food) return;
  for (const path of [FOOD_CONSUMER_SOURCE, FOOD_SOURCE_DRAWING_POLICY]) rmSync(join(destination,path),{force:true});
  for (const [path, entry] of Object.entries(food.files)) {
    if (entry.previousSha256 === null) rmSync(join(destination,path),{force:true});
    else {
      mkdirSync(dirname(join(destination,path)),{recursive:true});
      cpSync(join(root,'design/releases/historical-blobs',entry.previousSha256),join(destination,path));
    }
  }
  for (const [path, digest] of Object.entries(food.predecessorTooling)) {
    mkdirSync(dirname(join(destination,path)),{recursive:true});
    cpSync(join(root,'design/releases/historical-blobs',digest),join(destination,path));
  }
}

/** Restore the actual prior consumer in a temporary fixture, not a synthetic approval. */
export function restoreHistoricalPregameFixture(root, destination) {
  restoreBeforeFoodFixture(root, destination);
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
