// Exact follow-up to the accepted Food consumer. Historical approvals stay immutable.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';

export const RELEASE_PRESERVATION_APPROVAL = 'docs/integration/release-preservation-consumer-approval-2026-11-15.json';
export const RELEASE_PRESERVATION_APPROVAL_SHA256 = 'a9fcc88754aa81a1b3ab7d1392a8a2d5d5068d6a6f4af7777b7e3c4399201788';
const files = ['apps/game/hosted/crew-runtime.mjs', 'apps/game/src/planet/pregame.ts', 'packages/presentation/src/planet/library.ts'];
const dependencies = ['packages/contracts/src/planet-art-capabilities.json', 'packages/contracts/src/planet-release-capabilities.ts'];
const verified = new WeakSet();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => {if (!ok) throw Error(`Release preservation consumer: ${message}`);};

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
function pin(root, reference) {
  check(reference && /^[a-f0-9]{64}$/.test(reference.sha256) && Number.isSafeInteger(reference.bytes) && reference.bytes > 0,
    'invalid identity');
  const bytes = read(root, reference.path);
  check(bytes.length === reference.bytes && sha(bytes) === reference.sha256, `content differs: ${reference.path}`);
  return bytes;
}
function freeze(value) {
  if (value && typeof value === 'object') {for (const child of Object.values(value)) freeze(child); Object.freeze(value);}
  return value;
}

/** Absence preserves old admission; a present correction must verify every input. */
export function readReleasePreservationApproval(root) {
  try {lstatSync(resolve(root, RELEASE_PRESERVATION_APPROVAL));}
  catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  const bytes = read(root, RELEASE_PRESERVATION_APPROVAL);
  check(sha(bytes) === RELEASE_PRESERVATION_APPROVAL_SHA256, 'independent approval hash differs');
  const approval = JSON.parse(bytes);
  check(approval.schema === 'mothership.release-preservation-consumer-approval/1' &&
    approval.status === 'approved-production-consumer' &&
    JSON.stringify(Object.keys(approval.files).sort()) === JSON.stringify(files) &&
    JSON.stringify(approval.dependencies.map(entry => entry.path).sort()) === JSON.stringify(dependencies),
    'complete exact consumer scope required');
  for (const parent of approval.parents) pin(root, parent);
  for (const [path, entry] of Object.entries(approval.files)) {
    pin(root, {path, ...entry});
    check(entry.predecessors.length > 0, `predecessor missing: ${path}`);
    for (const predecessor of entry.predecessors) {
      check(['historical', 'candidate'].some(kind => predecessor.path ===
        `design/releases/${kind}-blobs/${predecessor.sha256}`), `invalid predecessor path: ${path}`);
      pin(root, predecessor);
    }
  }
  for (const reference of approval.dependencies) pin(root, reference);
  const acceptance = JSON.parse(pin(root, approval.designerAcceptance));
  check(acceptance.verdict === 'accepted' && acceptance.reviewedCommit === approval.reviewedCommit &&
    acceptance.url === 'https://github.com/Amirkianfar66/GameN/pull/266#issuecomment-6896469964' &&
    JSON.stringify(acceptance.parts) === JSON.stringify(['role-film', 'boarding']), 'native Designer acceptance differs');
  const report = JSON.parse(pin(root, approval.captureReport));
  check(report.passed === true && report.candidate.commit === approval.reviewedCommit && report.candidate.dirty === '' &&
    report.checks.length === 7 && report.captures.length === 12 && approval.captures.length === 12,
    'native evidence differs');
  for (const reference of approval.captures) {
    pin(root, reference);
    check(report.captures.some(capture => capture.sha256 === reference.sha256), 'capture not in reviewed report');
  }
  freeze(approval); verified.add(approval); return approval;
}

export function acceptsReleasePreservationFile(approval, path, previousDigest, currentDigest) {
  if (!approval || !verified.has(approval) || !Object.hasOwn(approval.files, path)) return false;
  const entry = approval.files[path];
  return entry.sha256 === currentDigest && entry.predecessors.some(reference => reference.sha256 === previousDigest);
}
