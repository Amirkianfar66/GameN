// Exact native UI adoption is separate from immutable artwork and gameplay authority.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';

export const PHONE_UI_CONSUMER_APPROVAL = 'docs/integration/phone-ui-production-consumer-approval.json';
// Filled only after the exact source and evidence receive Integration review.
export const PHONE_UI_CONSUMER_APPROVAL_SHA256 = '1ec8ae1c1350bdce938a657abb19ab5d79960f73067c49a2af6da3d7968d4756';
const PARENT_APPROVAL = 'docs/integration/pregame-production-consumer-approval-2026-11-08.json';
const PARENT_APPROVAL_SHA256 = '5f749f5f7db1286520fcf8b77e8f8e4c001dd5c77d8aff4f1c5791911eec81e6';
const PARENT_CANDIDATE = 'docs/integration/pregame-consumer-candidate-2026-11-08.json';
const PARENT_CANDIDATE_SHA256 = 'e8799855b67fc81c68089f0bd295715eb5ca6ffe0548eee2f911725b33b7d702';
const ART_MANIFEST = 'design/releases/design-0.8.0.json';
const ART_MANIFEST_SHA256 = 'c2e5b6a423d2a583be669147b70a23e2391fce770372137e99f46c3c75b13b5d';
const BLOBS = 'design/releases/historical-blobs';
const verified = new WeakSet();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => {if (!condition) throw Error(`Phone UI production consumer: ${message}`);};

function read(root, path) {
  check(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
    posix.normalize(path) === path && !path.startsWith('../') && path !== '.', `invalid path: ${path}`);
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
function binding(root, reference, path, digest) {
  check(reference?.path === path && reference.sha256 === digest && sha(read(root, path)) === digest,
    `immutable binding differs: ${path}`);
}
function evidence(root, reference) {
  check(reference && /^[a-f0-9]{64}$/.test(reference.sha256) && Number.isSafeInteger(reference.bytes) && reference.bytes > 0,
    'invalid evidence reference');
  const bytes = read(root, reference.path);
  check(bytes.length === reference.bytes && sha(bytes) === reference.sha256, `evidence content differs: ${reference.path}`);
}

/** An absent follow-up preserves historical behavior; a present one must verify completely. */
export function readPhoneUiConsumerApproval(root) {
  try {lstatSync(resolve(root, PHONE_UI_CONSUMER_APPROVAL));}
  catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  const bytes = read(root, PHONE_UI_CONSUMER_APPROVAL);
  check(sha(bytes) === PHONE_UI_CONSUMER_APPROVAL_SHA256, 'independent approval hash differs');
  const approval = JSON.parse(bytes);
  check(approval.schema === 'mothership.phone-ui-production-consumer-approval/1' &&
    approval.status === 'approved-production-consumer', 'invalid approval scope');
  binding(root, approval.parentApproval, PARENT_APPROVAL, PARENT_APPROVAL_SHA256);
  binding(root, approval.parentCandidate, PARENT_CANDIDATE, PARENT_CANDIDATE_SHA256);
  binding(root, approval.artManifest, ART_MANIFEST, ART_MANIFEST_SHA256);
  check(approval.files && Object.keys(approval.files).length === 13, 'complete native inventory required');
  for (const [path, entry] of Object.entries(approval.files)) {
    check(/^[a-f0-9]{64}$/.test(entry.sha256) && Number.isSafeInteger(entry.bytes) && entry.bytes > 0,
      `invalid native identity: ${path}`);
    check(entry.candidateBlob === `design/releases/candidate-blobs/${entry.sha256}`, `candidate blob path differs: ${path}`);
    const blob = read(root, entry.candidateBlob), current = read(root, path);
    check(blob.length === entry.bytes && sha(blob) === entry.sha256, `candidate blob content differs: ${path}`);
    check(current.length === entry.bytes && sha(current) === entry.sha256, `current content differs: ${path}`);
    check(Array.isArray(entry.acceptedPreviousHashes) &&
      (entry.previousSha256 === null || entry.acceptedPreviousHashes.includes(entry.previousSha256)), `previous identity differs: ${path}`);
    for (const digest of entry.acceptedPreviousHashes) {
      check(/^[a-f0-9]{64}$/.test(digest) && sha(read(root, `${BLOBS}/${digest}`)) === digest,
        `preserved previous content differs: ${path}`);
    }
  }
  check(Array.isArray(approval.captureEvidence?.reports) && approval.captureEvidence.reports.length > 0 &&
    Array.isArray(approval.captureEvidence.files) && approval.captureEvidence.files.length > 0, 'actual capture evidence is required');
  for (const reference of [...approval.captureEvidence.reports, ...approval.captureEvidence.files,
    approval.captureEvidence.acceptance]) evidence(root, reference);
  freeze(approval); verified.add(approval);
  return approval;
}

/** Only a verified exact file and one of its preserved predecessor hashes can match. */
export function acceptsPhoneUiConsumerFile(approval, path, expectedDigest, actualDigest) {
  if (!approval || !verified.has(approval) || !Object.hasOwn(approval.files, path)) return false;
  const entry = approval.files[path];
  return entry.sha256 === actualDigest && entry.acceptedPreviousHashes.includes(expectedDigest);
}
