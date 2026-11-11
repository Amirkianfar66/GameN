// Integration-reviewed exact consumer approval; creation and deployment are separate.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {PREGAME_CONSUMER_CANDIDATE, PREGAME_CONSUMER_CANDIDATE_SHA256,
  readVerifiedPregameConsumerInventory} from './pregame-consumer-candidate.mjs';

export const PREGAME_PRODUCTION_CONSUMER_APPROVAL = 'docs/integration/pregame-production-consumer-approval-2026-11-08.json';
// Independent immutable acceptance anchor; the source artwork manifest is unchanged.
export const PREGAME_PRODUCTION_CONSUMER_APPROVAL_SHA256 = '5f749f5f7db1286520fcf8b77e8f8e4c001dd5c77d8aff4f1c5791911eec81e6';
const verified = new WeakSet();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw Error(`Pregame production consumer: ${message}`); };
function read(root, path) {
  check(typeof path === 'string' && !path.startsWith('/') && !path.includes('\\') &&
    posix.normalize(path) === path && !path.startsWith('../'), `invalid path: ${path}`);
  let current = resolve(root);
  const parts = path.split('/');
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const stat = lstatSync(current);
    check(!stat.isSymbolicLink() && (index < parts.length - 1 ? stat.isDirectory() : stat.isFile()),
      `regular file required: ${path}`);
  }
  return readFileSync(current);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function evidence(root, reference) {
  check(reference && /^[a-f0-9]{64}$/.test(reference.sha256) && Number.isSafeInteger(reference.bytes) && reference.bytes > 0,
    'invalid evidence reference');
  const bytes = read(root, reference.path);
  check(bytes.length === reference.bytes && sha(bytes) === reference.sha256, `evidence content differs: ${reference.path}`);
}

/** Before adoption no record exists; a present record must verify completely. */
export function readPregameProductionConsumerApproval(root) {
  try { lstatSync(resolve(root, PREGAME_PRODUCTION_CONSUMER_APPROVAL)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const bytes = read(root, PREGAME_PRODUCTION_CONSUMER_APPROVAL);
  check(sha(bytes) === PREGAME_PRODUCTION_CONSUMER_APPROVAL_SHA256, 'independent approval hash differs');
  const approval = JSON.parse(bytes);
  check(approval.schema === 'mothership.pregame-production-consumer-approval/1' &&
    approval.status === 'approved-production-consumer', 'invalid production approval scope');
  check(approval.candidate.path === PREGAME_CONSUMER_CANDIDATE &&
    approval.candidate.sha256 === PREGAME_CONSUMER_CANDIDATE_SHA256, 'candidate identity differs');
  const inventory = readVerifiedPregameConsumerInventory(root);
  check(isDeepStrictEqual(approval.artManifest, inventory.artManifest) &&
    isDeepStrictEqual(approval.existingConsumerApproval, inventory.existingConsumerApproval) &&
    isDeepStrictEqual(approval.files, inventory.files), 'approved complete inventory differs');
  check(Array.isArray(approval.captureEvidence.reports) && approval.captureEvidence.reports.length > 0 &&
    Array.isArray(approval.captureEvidence.files) && approval.captureEvidence.files.length > 0,
    'actual capture evidence is required');
  for (const reference of [...approval.captureEvidence.reports, ...approval.captureEvidence.files,
    approval.captureEvidence.acceptance]) evidence(root, reference);
  freeze(approval);
  verified.add(approval);
  return approval;
}

export function acceptsPregameProductionFile(approval, path, expectedDigest, actualDigest) {
  if (!approval || !verified.has(approval) || !Object.hasOwn(approval.files, path)) return false;
  const entry = approval.files[path];
  return entry.sha256 === actualDigest && entry.acceptedPreviousHashes.includes(expectedDigest);
}

export const readPregameConsumerApproval = readPregameProductionConsumerApproval;
