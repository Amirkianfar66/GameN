import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export const RUNTIME_ART_VERSION = 'design-0.3.0';
export const RUNTIME_ART_MANIFEST = 'design/releases/design-0.3.0.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(`Runtime art release: ${message}`); };
const expectedGameplay = {
  protocolVersion: 2,
  engineVersion: 'full-game-1.5.0',
  rulesetVersion: 'in-person-v1-declared-hack-2026-10-12',
  rulesetHash: '1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c',
};

/** Build-time only. Match pins name this immutable art set, not the Hosting digest. */
export function readRuntimeArtRelease(root) {
  root = resolve(root);
  const bytes = readFileSync(resolve(root, RUNTIME_ART_MANIFEST));
  const manifest = JSON.parse(bytes);
  check(manifest.schema === 'mothership.runtime-art-release/1' && manifest.manifestVersion === RUNTIME_ART_VERSION, 'unreviewed manifest version');
  check(JSON.stringify(manifest.gameplayPins) === JSON.stringify(expectedGameplay), 'gameplay compatibility differs');
  const sources = Object.entries(manifest.sources ?? {}), runtime = Object.entries(manifest.runtimeFiles ?? {});
  check(sources.length > 0 && runtime.length > 0, 'source and runtime inventories are required');
  for (const [path, digest] of [...sources, ...runtime]) {
    check(typeof path === 'string' && !path.includes('..') && !path.includes('\\') && !path.startsWith('/')
      && resolve(root, path).startsWith(root + sep) && /^[a-f0-9]{64}$/.test(digest), 'invalid inventory entry');
    check(sha(readFileSync(resolve(root, path))) === digest, `content differs: ${path}`);
  }
  const names = Object.keys(manifest.bundles ?? {}).sort();
  check(JSON.stringify(names) === JSON.stringify(['abilities', 'player-ui', 'public-board', 'roles', 'scene-art']), 'complete uniform bundle set required');
  for (const entry of Object.values(manifest.bundles)) {
    check(/^\/art\/[a-z0-9.-]+\.css$/.test(entry.url) && /^[a-f0-9]{64}$/.test(entry.sha256), 'invalid bundle identity');
  }
  return Object.freeze({ ...manifest, manifestSha256: sha(bytes) });
}

export function assertRuntimeArtBundle(manifest, name, url, bytes) {
  const entry = manifest.bundles[name];
  check(entry?.url === url && entry.sha256 === sha(bytes), `bundle differs: ${name}`);
}
