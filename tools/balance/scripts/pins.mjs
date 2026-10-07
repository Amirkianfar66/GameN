// The pins every evidence report carries: which fixtures, rule sources, rulebook and engine a run
// used, and from which commit. The three engine commands share them so that the report gate can
// hold their reports against each other and against the files on disk.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_COMMIT_BASIS } from '@mothership/balance';
import { CATALOG_FILES } from '../../../tests/scenarios/v1/catalog.mjs';
import { GROUPS, V1_OVERLAY_PATH, scenarioFileUrl } from '../../../tests/scenarios/v1/files.mjs';
import { invocationPath } from './args.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const V1_MANIFEST_PATH = 'rules/in-person-v1-manifest.json';
export const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export const reportPath = invocationPath;

// Two spellings of one directory, through a link, are one directory.
const real = path => { try { return realpathSync(path); } catch { return resolve(path); } };

// Outside a repository the answer is simply unknown; git's own complaint is not passed on.
export function git(directory, ...command) {
  try {
    return execFileSync('git', command, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/**
 * What Git says about a directory, when the directory is itself the top of a checkout. A tree is
 * clean only if nothing is modified, nothing is untracked whatever the user's status settings are,
 * and no tracked file is hidden from status (assume-unchanged or skip-worktree). Ignored files,
 * build output among them, are not seen: the build digest in the pins is what records those.
 */
export function treeState(directory) {
  const top = git(directory, 'rev-parse', '--show-toplevel');
  if (top === null || real(top) !== real(directory)) return { checkout: false, commit: null, clean: null };
  const commit = git(directory, 'rev-parse', 'HEAD');
  const status = git(directory, 'status', '--porcelain', '--untracked-files=all');
  const hidden = git(directory, 'ls-files', '-v');
  const clean = commit !== null && status === '' && hidden !== null && !hidden.split('\n').some(line => /^[a-zS]/.test(line));
  return { checkout: true, commit, clean };
}

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .map(entry => join(entry.parentPath ?? entry.path, entry.name));
}

/** One digest of the built engine and contracts modules: three reports with the same digest ran the same build. */
export function engineBuildDigest(engineCheckout) {
  const lines = [];
  for (const part of ['packages/engine/dist', 'packages/contracts/dist']) {
    for (const file of filesUnder(join(engineCheckout, part))) lines.push(`${relative(engineCheckout, file).split('\\').join('/')}\n${sha256(file)}`);
  }
  return lines.length === 0 ? null : createHash('sha256').update(lines.sort().join('\n')).digest('hex');
}

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

/**
 * The commit of the engine, and how it is known. Where the engine sits in a Git checkout the
 * commit is read from it, and a different commit stated on the command line is a contradiction.
 * Where it does not, for example in an exported archive, the stated commit is recorded as stated.
 * @returns {{ problem: string } | { commit: string, basis: string, clean: boolean | null, origin: string }}
 */
export function engineProvenance(engineRoot, stated, tree) {
  const engineCheckout = engineRoot === null ? root : engineRoot;
  if (real(engineCheckout) === real(root)) {
    if (stated !== null && tree.commit !== null && stated !== tree.commit) {
      return { problem: `--engine-commit names ${stated}, but the engine is the one of this checkout, which is at ${tree.commit}.` };
    }
    const origin = engineRoot === null ? '@mothership/engine of this checkout' : 'this checkout (--engine-root)';
    return tree.commit === null
      ? { commit: stated ?? 'unknown', basis: ENGINE_COMMIT_BASIS.stated, clean: null, origin }
      : { commit: tree.commit, basis: ENGINE_COMMIT_BASIS.here, clean: tree.clean, origin };
  }
  const there = treeState(engineCheckout);
  const origin = 'built checkout outside this worktree (--engine-root)';
  if (!there.checkout || there.commit === null) return { commit: stated ?? 'not stated', basis: ENGINE_COMMIT_BASIS.stated, clean: null, origin };
  if (stated !== null && stated !== there.commit) {
    return { problem: `--engine-commit names ${stated}, but the checkout at --engine-root is at ${there.commit}.` };
  }
  return { commit: there.commit, basis: ENGINE_COMMIT_BASIS.there, clean: there.clean, origin };
}

/**
 * @param {{ engineRoot: string | null, engineCommit: string | null, adapter: { pins: object } | null, runner: string }} run
 *   engineRoot is absolute, or null for the engine of this checkout
 * @returns {{ problem: string } | { pins: object }}
 */
export function buildPins({ engineRoot, engineCommit, adapter, runner }) {
  const tree = treeState(root);
  const engine = engineProvenance(engineRoot, engineCommit, tree);
  if ('problem' in engine) return { problem: engine.problem };
  const engineCheckout = engineRoot === null ? root : engineRoot;
  return {
    pins: {
      repository: 'Amirkianfar66/GameN',
      baseCommit: '333c9e820f362a211352bc689372663f29b73ac4',
      branch: git(root, 'rev-parse', '--abbrev-ref', 'HEAD') ?? 'unknown',
      workingTreeCommit: tree.commit === null ? 'unknown' : `${tree.commit}${tree.clean ? '' : ' plus uncommitted changes'}`,
      ...sourceHashes(engineCheckout),
      engine: adapter === null ? null : adapter.pins,
      engineCommit: engine.commit,
      engineCommitBasis: engine.basis,
      engineTreeClean: engine.clean,
      engineBuildSha256: adapter === null ? null : engineBuildDigest(engineCheckout),
      engineOrigin: engine.origin,
      runner,
      node: process.version,
      generatedAt: new Date().toISOString(),
    },
  };
}

// One plain line where Git is absent, in place of git's own complaints. Printed after a command's
// results, so that the first line of its output stays what it is with or without a repository.
export function noteProvenance(pins) {
  if (pins.workingTreeCommit === 'unknown') console.log('Git provenance is not available in this directory: the report records the working tree as unknown.');
}
