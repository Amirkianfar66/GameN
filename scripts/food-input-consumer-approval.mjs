// Exact client scheduling follow-up. Historical source/art approvals stay immutable.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';

export const FOOD_INPUT_CONSUMER_APPROVAL = 'docs/integration/food-input-consumer-approval-2026-11-15.json';
// Set only after the exact interaction states receive Designer acceptance in #276.
export const FOOD_INPUT_CONSUMER_APPROVAL_SHA256 = null;
const files = ['apps/game/src/planet/food.ts', 'apps/game/src/planet/session.ts'];
const parts = ['food-panel-03', 'food-panel-04', 'food-winch-03', 'food-winch-12'];
const verified = new WeakSet();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, message) => {if (!ok) throw Error(`Food input consumer: ${message}`);};

function read(root, path) {
  check(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
    posix.normalize(path) === path && path !== '.' && !path.startsWith('../'), 'invalid evidence path');
  let current = resolve(root);
  const segments = path.split('/');
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment);
    const stat = lstatSync(current);
    check(!stat.isSymbolicLink() && (index === segments.length - 1 ? stat.isFile() : stat.isDirectory()),
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

/** Absence preserves historical admission; a present record never falls back on error. */
export function readFoodInputConsumerApproval(root) {
  try {lstatSync(resolve(root, FOOD_INPUT_CONSUMER_APPROVAL));}
  catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  const bytes = read(root, FOOD_INPUT_CONSUMER_APPROVAL);
  check(FOOD_INPUT_CONSUMER_APPROVAL_SHA256 !== null && sha(bytes) === FOOD_INPUT_CONSUMER_APPROVAL_SHA256,
    'independent approval hash differs');
  const approval = JSON.parse(bytes);
  check(approval.schema === 'mothership.food-input-consumer-approval/1' &&
    approval.status === 'approved-production-consumer' &&
    JSON.stringify(Object.keys(approval.files).sort()) === JSON.stringify(files), 'exact two-file scope required');
  for (const reference of approval.parents) pin(root, reference);
  for (const [path, entry] of Object.entries(approval.files)) {
    pin(root, {path, ...entry});
    check(entry.predecessors.length > 0, `predecessor missing: ${path}`);
    for (const predecessor of entry.predecessors) {
      check(['historical', 'candidate'].some(kind => predecessor.path ===
        `design/releases/${kind}-blobs/${predecessor.sha256}`), `invalid predecessor path: ${path}`);
      pin(root, predecessor);
    }
  }
  const acceptance = JSON.parse(pin(root, approval.designerAcceptance));
  check(acceptance.verdict === 'accepted' && acceptance.reviewedCommit === approval.reviewedCommit &&
    /^https:\/\/github\.com\/Amirkianfar66\/GameN\/pull\/276#(?:issuecomment-|pullrequestreview-)\d+$/.test(acceptance.url) &&
    JSON.stringify(acceptance.parts) === JSON.stringify(parts), 'exact interaction-state acceptance required');
  const report = JSON.parse(pin(root, approval.captureReport));
  check(report.passed === true && report.candidate.commit === approval.captureCommit && report.candidate.dirty === '' &&
    report.headersSha256 === approval.headersSha256 && report.captures.length === 8 && approval.captures.length === 8,
    'production-header capture evidence differs');
  for (const part of parts) for (const viewport of [[390, 844], [430, 932]])
    check(report.captures.filter(capture => capture.part === part &&
      JSON.stringify(capture.viewport) === JSON.stringify(viewport)).length === 1, 'interaction-state capture missing');
  for (const reference of approval.captures) {
    pin(root, reference);
    check(report.captures.some(capture => capture.sha256 === reference.sha256), 'capture not in reviewed report');
  }
  freeze(approval); verified.add(approval); return approval;
}

export function acceptsFoodInputConsumerFile(approval, path, previousDigest, currentDigest) {
  if (!approval || !verified.has(approval) || !Object.hasOwn(approval.files, path)) return false;
  const entry = approval.files[path];
  return entry.sha256 === currentDigest && entry.predecessors.some(reference => reference.sha256 === previousDigest);
}
