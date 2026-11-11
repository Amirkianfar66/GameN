// Integration-owned, immutable pregame drawing registration. This does not mount a consumer.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync} from 'node:fs';
import {posix, resolve} from 'node:path';
import ts from 'typescript';

export const PREGAME_APPROVAL = 'docs/integration/pregame-source-art-approval-2026-11-08.json';
export const PREGAME_APPROVAL_SHA256 = '85ddc22336d3df216e9dc075d4d8f1fd56a89580d926073a9cb40a9fcacf0136';
export const PREGAME_RUNTIME_CATALOG = 'design/releases/pregame-runtime-ports.json';
export const PREGAME_RUNTIME_CATALOG_SHA256 = '8e551409a96e8342aaf38f0f5a3eaf161cbb33e05a2500609e8ed6798da61eb0';
const DIRECTORY = 'apps/game/hosted/pregame-films';
const DEV_MARKER = '// mothership:dev-only\n';
const ROSTER = `${DIRECTORY}/boarding/roster.mjs`;
const CAST = `${DIRECTORY}/kit/cast.mjs`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

// Refuse path aliases and links, so a named approval always identifies repository bytes.
function read(root, path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\') || posix.normalize(path) !== path || path.startsWith('../')) {
    throw Error(`Unsafe pregame registration path: ${path}`);
  }
  let current = resolve(root);
  const parts = path.split('/');
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
      throw Error(`Pregame registration requires regular files: ${path}`);
    }
  }
  return readFileSync(current);
}

function pinnedJson(root, path, expected, label) {
  const bytes = read(root, path);
  if (sha(bytes) !== expected) throw Error(`Pregame ${label} drift: ${path}`);
  return JSON.parse(bytes);
}

function readRegistration(root) {
  const approval = pinnedJson(root, PREGAME_APPROVAL, PREGAME_APPROVAL_SHA256, 'source approval');
  const catalog = pinnedJson(root, PREGAME_RUNTIME_CATALOG, PREGAME_RUNTIME_CATALOG_SHA256, 'runtime catalog');
  if (approval.schema !== 'mothership.pregame-source-art-approval/1' || catalog.schema !== 'mothership.pregame-runtime-ports/1' ||
      approval.catalog.path !== PREGAME_RUNTIME_CATALOG || approval.catalog.sha256 !== PREGAME_RUNTIME_CATALOG_SHA256 ||
      approval.sourceHead !== catalog.sourceCommit || approval.manifestVersion !== catalog.manifestVersion ||
      !same(approval.entrypoints, catalog.entrypoints) || !same(approval.excluded, catalog.excluded)) {
    throw Error('Pregame registration provenance mismatch');
  }
  const evidence = approval.approvedRuntimeHook.evidence;
  const review = pinnedJson(root, evidence.path, evidence.sha256, 'hook evidence');
  const cast = catalog.entries.find(entry => entry.runtime === CAST);
  if (approval.approvedRuntimeHook.file !== CAST || approval.approvedRuntimeHook.sha256 !== cast.runtimeSha256 ||
      review.sourceHead !== catalog.sourceCommit || review.runtimeCastSha256 !== cast.runtimeSha256 ||
      review.equalDefaultOutputs !== 108 || !review.nestedScopeRestored || !review.drawExceptionRestored || !review.collectorExceptionRestored) {
    throw Error('Pregame retained-figure hook review mismatch');
  }
  const all = [...catalog.entries, ...catalog.dependencies];
  for (const [field, path, hash] of [['sourcePins', 'source', 'sourceSha256'], ['runtimePins', 'runtime', 'runtimeSha256']]) {
    const pins = Object.fromEntries(all.map(entry => [entry[path], entry[hash]]).sort(([a], [b]) => a.localeCompare(b)));
    // Compare values by key, independent of JSON object ordering.
    if (Object.keys(approval[field]).length !== all.length || Object.entries(pins).some(([key, value]) => approval[field][key] !== value)) {
      throw Error(`Pregame approval ${field} mismatch`);
    }
  }
  return {approval, catalog};
}

export function readPregameSourceApproval(root) {
  return readRegistration(root).approval;
}

function inventory(root, directory) {
  const stat = lstatSync(resolve(root, directory));
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw Error(`Unreviewed pregame drawing directory: ${directory}`);
  const files = [];
  for (const item of readdirSync(resolve(root, directory), {withFileTypes: true})) {
    const path = `${directory}/${item.name}`;
    if (item.isSymbolicLink()) throw Error(`Unreviewed pregame drawing link: ${path}`);
    if (item.isDirectory()) files.push(...inventory(root, path));
    else if (item.isFile()) files.push(path);
    else throw Error(`Unreviewed pregame drawing entry: ${path}`);
  }
  return files.sort();
}

function reconstruct(source, entry, transform) {
  if (!source.startsWith(DEV_MARKER) || transform.removeFirstLine !== DEV_MARKER) {
    throw Error(`Pregame first dev marker missing: ${entry.source}`);
  }
  let derivative = source.slice(DEV_MARKER.length);
  for (const [from, to] of Object.entries(transform.importPrefixes)) derivative = derivative.replaceAll(from, to);
  if (entry.omitSyntheticTailAt) {
    const marker = entry.omitSyntheticTailAt;
    if (entry.runtime !== ROSTER || derivative.split(marker).length !== 2) throw Error('Pregame roster extraction marker mismatch');
    derivative = derivative.slice(0, derivative.indexOf(marker));
  }
  if (entry.approvedHookPatches) {
    if (entry.runtime !== CAST) throw Error('Pregame hook is limited to the approved cast module');
    for (const {before, after} of entry.approvedHookPatches) {
      if (derivative.split(before).length !== 2) throw Error('Pregame exact hook reconstruction mismatch');
      derivative = derivative.replace(before, after);
    }
  }
  return derivative;
}

function imports(path, bytes) {
  return ts.preProcessFile(bytes.toString('utf8'), true, true).importedFiles.map(({fileName}) => {
    if (!fileName.startsWith('.')) throw Error(`Pregame drawing has a non-relative import: ${path} -> ${fileName}`);
    return posix.normalize(posix.join(posix.dirname(path), fileName));
  });
}

export function verifyPregameRuntimePorts(root) {
  const {catalog} = readRegistration(root);
  if (catalog.entries.length !== 22 || catalog.dependencies.length !== 22) throw Error('Pregame named port count mismatch');
  const expected = catalog.entries.map(entry => entry.runtime).sort();
  if (!same(inventory(root, DIRECTORY), expected)) throw Error('Unreviewed or missing pregame drawing port');
  const all = [...catalog.entries, ...catalog.dependencies];
  const sources = new Map(all.map(entry => [entry.source, entry]));
  const runtimes = new Map(all.map(entry => [entry.runtime, entry]));
  if (sources.size !== 44 || runtimes.size !== 44) throw Error('Duplicate pregame registration path');
  const direct = new Set();
  const externalClosure = new Set();
  for (const entry of all) {
    const source = read(root, entry.source);
    const runtime = read(root, entry.runtime);
    if (sha(source) !== entry.sourceSha256 || (entry.sourceBytes !== undefined && source.length !== entry.sourceBytes)) {
      throw Error(`Pregame original source drift: ${entry.source}`);
    }
    if (sha(runtime) !== entry.runtimeSha256 || (entry.runtimeBytes !== undefined && runtime.length !== entry.runtimeBytes)) {
      throw Error(`Pregame derivative drift: ${entry.runtime}`);
    }
    if (entry.runtime.startsWith(`${DIRECTORY}/`)) {
      if (!Buffer.from(reconstruct(source.toString('utf8'), entry, catalog.transform)).equals(runtime)) {
        throw Error(`Pregame source reconstruction drift: ${entry.source}`);
      }
      if (runtime.includes('mothership:dev-only') || runtime.includes('REVIEW_ROSTERS')) throw Error(`Pregame fixture bytes: ${entry.runtime}`);
    }
    for (const target of imports(entry.source, source)) {
      if (!sources.has(target)) throw Error(`Unregistered pregame source dependency: ${entry.source} -> ${target}`);
      if (entry.runtime.startsWith(`${DIRECTORY}/`) && !target.startsWith('design/pregame-films/')) direct.add(target);
    }
    for (const target of imports(entry.runtime, runtime)) {
      if (!runtimes.has(target)) throw Error(`Unregistered pregame runtime dependency: ${entry.runtime} -> ${target}`);
    }
  }
  // Derive the frozen transitive closure rather than accepting unused dependency declarations.
  const pending = [...direct];
  while (pending.length) {
    const path = pending.pop();
    if (externalClosure.has(path)) continue;
    externalClosure.add(path);
    pending.push(...imports(path, read(root, path)));
  }
  if (!same([...direct].sort(), catalog.directDependencySources) ||
      !same([...externalClosure].sort(), catalog.dependencies.map(entry => entry.source).sort())) {
    throw Error('Pregame frozen dependency closure mismatch');
  }
  return catalog.entries.length;
}
