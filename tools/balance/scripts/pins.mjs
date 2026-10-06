// The pins every evidence report carries: which fixtures, rule sources, rulebook and engine a run
// used, and from which commit. The three engine commands share them so that the report gate can
// hold their reports against each other and against the files on disk.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_FILES } from '../../../tests/scenarios/v1/catalog.mjs';
import { GROUPS, V1_OVERLAY_PATH, scenarioFileUrl } from '../../../tests/scenarios/v1/files.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const V1_MANIFEST_PATH = 'rules/in-person-v1-manifest.json';
export const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

// Outside a repository the commit is simply unknown; git's own complaint is not passed on.
export function git(...command) {
  try {
    return execFileSync('git', command, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Hashes of the committed fixtures, rule sources and rulebook as they are on disk now. The owner
 * decision and the combined Version 1 manifest are read from the checkout that holds the engine,
 * and are null where that checkout does not have them.
 */
export function sourceHashes(engineCheckout = root) {
  const manifest = JSON.parse(readFileSync(join(root, 'rules/source-manifest.json'), 'utf8'));
  const overlay = join(engineCheckout, V1_OVERLAY_PATH);
  const combined = join(engineCheckout, V1_MANIFEST_PATH);
  return {
    sourceManifestSha256: sha256(join(root, 'rules/source-manifest.json')),
    ruleSourceHashes: Object.fromEntries(manifest.sources.map(source => [source.path, sha256(join(root, source.path))])),
    v1OverlaySha256: existsSync(overlay) ? sha256(overlay) : null,
    v1ManifestSha256: existsSync(combined) ? sha256(combined) : null,
    scenarioFileHashes: Object.fromEntries(GROUPS.map(group => [CATALOG_FILES[group], sha256(fileURLToPath(scenarioFileUrl(group)))])),
    rulebookSha256: sha256(join(root, 'docs/balance/game-rules.md')),
  };
}

/** @param {{ engineRoot: string | null, engineCommit: string | null, adapter: { pins: object } | null, runner: string }} run */
export function buildPins({ engineRoot, engineCommit, adapter, runner }) {
  const head = git('rev-parse', 'HEAD');
  const dirty = head !== null && git('status', '--porcelain') !== '';
  const sameCheckout = engineRoot === null || resolve(engineRoot) === root;
  return {
    repository: 'Amirkianfar66/GameN',
    baseCommit: '333c9e820f362a211352bc689372663f29b73ac4',
    branch: git('rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown',
    workingTreeCommit: head === null ? 'unknown' : `${head}${dirty ? ' plus uncommitted changes' : ''}`,
    ...sourceHashes(engineRoot === null ? root : resolve(engineRoot)),
    engine: adapter === null ? null : adapter.pins,
    engineCommit: engineCommit ?? (sameCheckout ? head ?? 'unknown' : 'not stated'),
    engineOrigin: sameCheckout ? (engineRoot === null ? '@mothership/engine of this checkout' : 'this checkout (--engine-root)') : 'built checkout outside this worktree (--engine-root)',
    runner,
    node: process.version,
    generatedAt: new Date().toISOString(),
  };
}

/** Write a report where the caller asked for it, relative to where the command was started. */
// One plain line where Git is absent, in place of git's own complaints. Printed after a command's
// results, so that the first line of its output stays what it is with or without a repository.
export function noteProvenance(pins) {
  if (pins.workingTreeCommit === 'unknown') console.log('Git provenance is not available in this directory: the report records the working tree as unknown.');
}

export function reportPath(out) {
  return resolve(process.env.INIT_CWD ?? process.cwd(), out);
}
