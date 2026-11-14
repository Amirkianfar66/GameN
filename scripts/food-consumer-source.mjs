// Technical source registration only. Designer acceptance and production
// selection remain independent release gates; this file grants neither.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';
import {prepareFoodSupplyArt, FOOD_STATIC_ART, FOOD_STATIC_ART_SHA256} from './food-supply-art.mjs';

export const FOOD_CONSUMER_SOURCE = 'docs/integration/food-consumer-source-2026-11-13.json';
export const FOOD_CONSUMER_SOURCE_SHA256 = '04eff4ebef972c1e64d8f82f121709bd90461b4db42a8beb47be22c6b3e2b665';
const verified = new WeakSet();
const sha = value => createHash('sha256').update(value).digest('hex');
const check = (ok, message) => {if (!ok) throw Error(`Food consumer source: ${message}`);};
function read(root, path) {
  check(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
    posix.normalize(path) === path && path !== '.' && !path.startsWith('../'), 'invalid source path');
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
function pin(root, path, entry) {
  check(entry && /^[a-f0-9]{64}$/.test(entry.sha256) && Number.isSafeInteger(entry.bytes) && entry.bytes > 0,
    `invalid identity: ${path}`);
  const bytes = read(root, path);
  check(bytes.length === entry.bytes && sha(bytes) === entry.sha256, `content differs: ${path}`);
  return bytes;
}
function freeze(value) {
  if (value && typeof value === 'object') {for (const child of Object.values(value)) freeze(child); Object.freeze(value);}
  return value;
}

/** Absent in historical checkouts. A present record never falls back on error. */
export function readFoodConsumerSource(root) {
  try {lstatSync(resolve(root, FOOD_CONSUMER_SOURCE));}
  catch (error) {if (error.code === 'ENOENT') return null; throw error;}
  const bytes = read(root, FOOD_CONSUMER_SOURCE);
  check(sha(bytes) === FOOD_CONSUMER_SOURCE_SHA256, 'independent registration hash differs');
  const source = JSON.parse(bytes);
  check(source.schema === 'mothership.food-consumer-source/1' && source.status === 'reviewed-source-candidate' &&
    Object.keys(source.files).length === 30, 'complete named source inventory required');
  check(source.target.assetManifestVersion === 'design-0.9.0' && source.target.tokensVersion === '0.5.0' &&
    source.target.protocolVersion === 3 && source.target.engineVersion === 'planet-game-1.4.0' &&
    source.target.rulesetVersion === 'in-person-planet-food-task-2026-11-12' &&
    source.target.rulesetHash === '7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333', 'target tuple differs');
  check(source.parentApproval.path === 'docs/integration/host-abort-production-consumer-approval-2026-11-11.json' &&
    source.parentApproval.sha256 === '501b0e88010c56cd11b62554f17e2ad8ab6eed3a8226142116730f7222c9fcf3' &&
    source.baseArt.path === 'design/releases/design-0.8.0.json' &&
    source.baseArt.sha256 === 'c2e5b6a423d2a583be669147b70a23e2391fce770372137e99f46c3c75b13b5d' &&
    source.staticArt.path === FOOD_STATIC_ART && source.staticArt.sha256 === FOOD_STATIC_ART_SHA256, 'immutable predecessor differs');
  for (const reference of [source.parentApproval, source.baseArt, source.closure, source.staticArt])
    pin(root, reference.path, reference);
  const closure = JSON.parse(read(root, source.closure.path));
  const closureFiles = [...closure.renderModules, ...closure.existingConsumersAndClientGlue];
  check(closureFiles.length === 30 && new Set(closureFiles.map(entry => entry.path)).size === 30, 'closure is incomplete');
  for (const reference of closureFiles) {
    const entry = source.files[reference.path];
    check(entry?.sha256 === reference.sha256 && entry.bytes === reference.bytes, `closure differs: ${reference.path}`);
  }
  for (const [path, entry] of Object.entries(source.files)) {
    pin(root, path, entry);
    check(entry.candidateBlob === `design/releases/candidate-blobs/${entry.sha256}`, `candidate path differs: ${path}`);
    pin(root, entry.candidateBlob, entry);
    check(Array.isArray(entry.acceptedPreviousHashes) && (entry.previousSha256 === null ||
      entry.acceptedPreviousHashes.includes(entry.previousSha256)), `previous identities missing: ${path}`);
    for (const digest of entry.acceptedPreviousHashes)
      check(/^[a-f0-9]{64}$/.test(digest) && sha(read(root, `design/releases/historical-blobs/${digest}`)) === digest,
        `previous content differs: ${path}`);
  }
  for (const [path, entry] of Object.entries(source.sourcePins)) pin(root, path, entry);
  for (const [path, digest] of Object.entries(source.predecessorTooling))
    check(/^[a-f0-9]{64}$/.test(digest) && sha(read(root, `design/releases/historical-blobs/${digest}`)) === digest,
      `previous tooling content differs: ${path}`);
  prepareFoodSupplyArt(root);
  freeze(source); verified.add(source); return source;
}

/** Exact compatibility only: callers cannot self-issue records or broaden paths. */
export function acceptsFoodConsumerSource(source, path, expectedDigest, actualDigest) {
  if (!source || !verified.has(source) || !Object.hasOwn(source.files, path)) return false;
  const entry = source.files[path];
  return entry.sha256 === actualDigest && entry.acceptedPreviousHashes.includes(expectedDigest);
}
