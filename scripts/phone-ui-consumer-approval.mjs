// Exact native UI adoption is separate from immutable artwork and gameplay authority.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';

export const PHONE_UI_CONSUMER_APPROVAL = 'docs/integration/phone-ui-production-consumer-approval.json';
// Filled only after the exact source and evidence receive Integration review.
export const PHONE_UI_CONSUMER_APPROVAL_SHA256 = '295063f3a64443cc5bc9a6baf4c7ffd3344c37d98f0a556387b1219997ff9057';
export const HOST_ABORT_CONSUMER_APPROVAL = 'docs/integration/host-abort-production-consumer-approval-2026-11-11.json';
export const HOST_ABORT_CONSUMER_APPROVAL_SHA256 = '501b0e88010c56cd11b62554f17e2ad8ab6eed3a8226142116730f7222c9fcf3';
const HOST_APP = 'apps/game/hosted/planet/app.mjs';
const PARENT_APPROVAL = 'docs/integration/pregame-production-consumer-approval-2026-11-08.json';
const PARENT_APPROVAL_SHA256 = '5f749f5f7db1286520fcf8b77e8f8e4c001dd5c77d8aff4f1c5791911eec81e6';
const PARENT_CANDIDATE = 'docs/integration/pregame-consumer-candidate-2026-11-08.json';
const PARENT_CANDIDATE_SHA256 = 'e8799855b67fc81c68089f0bd295715eb5ca6ffe0548eee2f911725b33b7d702';
const ART_MANIFEST = 'design/releases/design-0.8.0.json';
const ART_MANIFEST_SHA256 = 'c2e5b6a423d2a583be669147b70a23e2391fce770372137e99f46c3c75b13b5d';
const BLOBS = 'design/releases/historical-blobs';
const verified = new WeakSet();
const successors = new WeakMap();
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

/** This correction accepts one named native file; it cannot widen the art inventory. */
export function readHostAbortConsumerApproval(root) {
  try {lstatSync(resolve(root, HOST_ABORT_CONSUMER_APPROVAL));}
  catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  const bytes = read(root, HOST_ABORT_CONSUMER_APPROVAL);
  check(sha(bytes) === HOST_ABORT_CONSUMER_APPROVAL_SHA256, 'host confirmation approval hash differs');
  const approval = JSON.parse(bytes);
  check(approval.schema === 'mothership.host-abort-production-consumer-approval/1' &&
    approval.status === 'approved-production-consumer', 'invalid host confirmation scope');
  binding(root, approval.parentApproval, PHONE_UI_CONSUMER_APPROVAL, PHONE_UI_CONSUMER_APPROVAL_SHA256);
  const entry = approval.file;
  check(entry?.path === HOST_APP && /^[a-f0-9]{64}$/.test(entry.previousSha256) &&
    /^[a-f0-9]{64}$/.test(entry.sha256) && Number.isSafeInteger(entry.bytes) && entry.bytes > 0 &&
    entry.candidateBlob === `design/releases/candidate-blobs/${entry.sha256}`, 'invalid host confirmation identity');
  for (const path of [entry.path, entry.candidateBlob]) {
    const source = read(root, path);
    check(source.length === entry.bytes && sha(source) === entry.sha256,
      `${path === entry.path ? 'current' : 'candidate blob'} content differs: ${path}`);
  }
  check(Array.isArray(approval.evidence) && approval.evidence.length > 0, 'host confirmation evidence required');
  for (const reference of approval.evidence) evidence(root, reference);
  return freeze(approval);
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
  const successor = readHostAbortConsumerApproval(root);
  if (successor) check(successor.file.previousSha256 === approval.files[HOST_APP]?.sha256,
    'host confirmation predecessor differs');
  for (const [path, entry] of Object.entries(approval.files)) {
    check(/^[a-f0-9]{64}$/.test(entry.sha256) && Number.isSafeInteger(entry.bytes) && entry.bytes > 0,
      `invalid native identity: ${path}`);
    check(entry.candidateBlob === `design/releases/candidate-blobs/${entry.sha256}`, `candidate blob path differs: ${path}`);
    const blob = read(root, entry.candidateBlob), current = read(root, path);
    check(blob.length === entry.bytes && sha(blob) === entry.sha256, `candidate blob content differs: ${path}`);
    const active = successor?.file.path === path ? successor.file : entry;
    check(current.length === active.bytes && sha(current) === active.sha256, `current content differs: ${path}`);
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
  freeze(approval); verified.add(approval); successors.set(approval, successor);
  return approval;
}

/** Only a verified exact file and one of its preserved predecessor hashes can match. */
export function acceptsPhoneUiConsumerFile(approval, path, expectedDigest, actualDigest) {
  if (!approval || !verified.has(approval) || !Object.hasOwn(approval.files, path)) return false;
  const entry = approval.files[path];
  const successor = successors.get(approval);
  return (entry.sha256 === actualDigest && entry.acceptedPreviousHashes.includes(expectedDigest)) ||
    Boolean(successor?.file.path === path && successor.file.sha256 === actualDigest &&
      (expectedDigest === entry.sha256 || entry.acceptedPreviousHashes.includes(expectedDigest)));
}
