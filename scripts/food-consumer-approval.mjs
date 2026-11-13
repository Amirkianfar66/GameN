// Production selection requires a separately reviewed native acceptance record.
// Source registration alone never enables the Food creation profile.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {FOOD_CONSUMER_SOURCE, FOOD_CONSUMER_SOURCE_SHA256, readFoodConsumerSource} from './food-consumer-source.mjs';

export const FOOD_PRODUCTION_CONSUMER_APPROVAL = 'docs/integration/food-production-consumer-approval-2026-11-13.json';
// Integration sets this only after the exact native candidate is accepted.
export const FOOD_PRODUCTION_CONSUMER_APPROVAL_SHA256 = null;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => {if (!ok) throw Error(`Food production consumer: ${message}`);};
function read(root, path) {
  check(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
    posix.normalize(path) === path && path !== '.' && !path.startsWith('../'), 'invalid evidence path');
  let current = resolve(root);
  const parts = path.split('/');
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const stat = lstatSync(current);
    check(!stat.isSymbolicLink() && (index === parts.length - 1 ? stat.isFile() : stat.isDirectory()),
      `regular file required: ${path}`);
  }
  return readFileSync(current);
}
function evidence(root, reference) {
  check(reference && /^[a-f0-9]{64}$/.test(reference.sha256) && Number.isSafeInteger(reference.bytes) && reference.bytes > 0,
    'invalid evidence identity');
  const bytes = read(root, reference.path);
  check(bytes.length === reference.bytes && sha(bytes) === reference.sha256, `evidence differs: ${reference.path}`);
}
function freeze(value) {
  if (value && typeof value === 'object') {for (const child of Object.values(value)) freeze(child); Object.freeze(value);}
  return value;
}

/** Absent acceptance preserves historical selections; a present record fails closed. */
export function readFoodProductionConsumerApproval(root) {
  try {lstatSync(resolve(root, FOOD_PRODUCTION_CONSUMER_APPROVAL));}
  catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  const bytes = read(root, FOOD_PRODUCTION_CONSUMER_APPROVAL);
  check(FOOD_PRODUCTION_CONSUMER_APPROVAL_SHA256 !== null && sha(bytes) === FOOD_PRODUCTION_CONSUMER_APPROVAL_SHA256,
    'independent acceptance hash differs');
  const approval = JSON.parse(bytes);
  check(approval.schema === 'mothership.food-production-consumer-approval/1' &&
    approval.status === 'approved-production-consumer', 'invalid acceptance scope');
  check(approval.source?.path === FOOD_CONSUMER_SOURCE && approval.source.sha256 === FOOD_CONSUMER_SOURCE_SHA256,
    'registered source identity differs');
  evidence(root, approval.source);
  const source = readFoodConsumerSource(root);
  check(source !== null && isDeepStrictEqual(approval.target, source.target) &&
    approval.nativeCommit === source.candidateHead && approval.designerCommit === source.designerHead,
    'accepted candidate differs');
  check(approval.artManifest?.path === 'design/releases/design-0.9.0.json', 'art release differs');
  evidence(root, approval.artManifest);
  check(approval.designerReview?.verdict === 'accepted' &&
    /^https:\/\/github\.com\/Amirkianfar66\/GameN\/pull\/240#(?:issuecomment-|pullrequestreview-)\d+$/.test(approval.designerReview.url) &&
    /^[a-f0-9]{40}$/.test(approval.designerReview.reviewedCommit), 'exact PR visual acceptance required');
  evidence(root, approval.designerReview.record);
  check(Array.isArray(approval.captureEvidence) && approval.captureEvidence.length > 0 &&
    Array.isArray(approval.connectedEvidence) && approval.connectedEvidence.length > 0, 'capture and connected evidence required');
  for (const reference of [...approval.captureEvidence, ...approval.connectedEvidence]) evidence(root, reference);
  return freeze(approval);
}
