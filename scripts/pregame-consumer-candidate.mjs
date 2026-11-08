// Exact local consumer review is separate from the immutable artwork release.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';

export const PREGAME_CONSUMER_CANDIDATE = 'docs/integration/pregame-consumer-candidate-2026-11-08.json';
export const PREGAME_CONSUMER_CANDIDATE_SHA256 = 'e8799855b67fc81c68089f0bd295715eb5ca6ffe0548eee2f911725b33b7d702';
export const PREGAME_CONSUMER_REVIEW_ENV = 'MOTHERSHIP_PREGAME_CONSUMER_REVIEW';
const ART_MANIFEST = 'design/releases/design-0.8.0.json';
const ART_MANIFEST_SHA256 = 'c2e5b6a423d2a583be669147b70a23e2391fce770372137e99f46c3c75b13b5d';
const PREVIOUS_APPROVAL = 'docs/integration/crew-consumer-approval-2026-11-07.json';
const PREVIOUS_APPROVAL_SHA256 = '8675a1d45cbf55aa69ccc65e18593d28c7ac54282ed52eb5c10e9b70e2c0511e';
const BLOBS = 'design/releases/historical-blobs';
const verified = new WeakSet();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw Error(`Pregame consumer candidate: ${message}`); };

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
function frozen(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) frozen(child);
    Object.freeze(value);
  }
  return value;
}

/** No files are read unless the one explicit local review flag is exactly "1". */
export function readPregameConsumerCandidate(root) {
  if (process.env[PREGAME_CONSUMER_REVIEW_ENV] !== '1') return null;
  const bytes = read(root, PREGAME_CONSUMER_CANDIDATE);
  check(sha(bytes) === PREGAME_CONSUMER_CANDIDATE_SHA256, 'independent approval hash differs');
  const candidate = JSON.parse(bytes);
  check(candidate.schema === 'mothership.pregame-consumer-candidate/1' && candidate.status === 'local-review-only' &&
    candidate.reviewEnvironment.name === PREGAME_CONSUMER_REVIEW_ENV && candidate.reviewEnvironment.value === '1' &&
    Object.keys(candidate.files).length === 11, 'invalid local review scope');
  check(candidate.artManifest.path === ART_MANIFEST && candidate.artManifest.sha256 === ART_MANIFEST_SHA256 &&
    sha(read(root, ART_MANIFEST)) === ART_MANIFEST_SHA256, 'art manifest binding differs');
  check(candidate.existingConsumerApproval.path === PREVIOUS_APPROVAL &&
    candidate.existingConsumerApproval.sha256 === PREVIOUS_APPROVAL_SHA256 &&
    sha(read(root, PREVIOUS_APPROVAL)) === PREVIOUS_APPROVAL_SHA256, 'existing consumer approval differs');
  check(candidate.historicalBlobsDirectory === BLOBS, 'historical blob directory differs');
  for (const [path, entry] of Object.entries(candidate.files)) {
    check(entry.candidateBlob === `design/releases/candidate-blobs/${entry.sha256}`, `candidate blob path differs: ${path}`);
    const blob = read(root, entry.candidateBlob);
    check(blob.length === entry.bytes && sha(blob) === entry.sha256, `candidate blob content differs: ${path}`);
    const current = read(root, path);
    check(current.length === entry.bytes && sha(current) === entry.sha256, `current content differs: ${path}`);
    check(Array.isArray(entry.acceptedPreviousHashes) &&
      (entry.previousSha256 === null || entry.acceptedPreviousHashes.includes(entry.previousSha256)), `previous identity differs: ${path}`);
    for (const digest of entry.acceptedPreviousHashes) {
      check(/^[a-f0-9]{64}$/.test(digest) && sha(read(root, `${BLOBS}/${digest}`)) === digest,
        `preserved previous content differs: ${path}`);
    }
  }
  frozen(candidate);
  verified.add(candidate);
  return candidate;
}

/** A caller cannot supply its own record, broaden a path, or accept another current digest. */
export function acceptsPregameCandidateFile(candidate, path, expectedDigest, actualDigest) {
  if (process.env[PREGAME_CONSUMER_REVIEW_ENV] !== '1' || !candidate || !verified.has(candidate) || !Object.hasOwn(candidate.files, path)) return false;
  const entry = candidate.files[path];
  return Boolean(entry && entry.sha256 === actualDigest && entry.acceptedPreviousHashes.includes(expectedDigest));
}
