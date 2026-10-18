import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export const RUNTIME_ART_VERSION = 'design-0.4.0';
export const RUNTIME_ART_MANIFEST = 'design/releases/design-0.4.0.json';
// Explicit candidate only. Activation remains a separate integration/release change.
export const HOSPITAL_FOUR_ART_VERSION = 'design-0.5.0';
export const HOSPITAL_FOUR_ART_MANIFEST = 'design/releases/design-0.5.0.json';
export const HISTORICAL_ART_BLOBS = 'design/releases/historical-blobs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(`Runtime art release: ${message}`); };
const historical = {
  'design-0.3.0': '588e79930746266a3c33ab5aedc1f40a8c464ff92c8e181dec93653d619eaecf',
  'design-0.4.0': '64975b15cd9815472dc35276e19bdc9ffbdd13040a89f72ab9c15b3cf1cce33e',
};
const releases = {
  'design-0.3.0': { gameplay: {
  protocolVersion: 2,
  engineVersion: 'full-game-1.5.0',
  rulesetVersion: 'in-person-v1-declared-hack-2026-10-12',
  rulesetHash: '1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c',
  }, bundles: ['abilities', 'player-ui', 'public-board', 'roles', 'scene-art'] },
  'design-0.4.0': { gameplay: {
    protocolVersion: 2,
    engineVersion: 'full-game-1.10.0',
    rulesetVersion: 'in-person-v1-clone-2026-10-14',
    rulesetHash: '6168feb6931a8f590176521e3d2eb1cb9de800eec5171cdfd5b77b4d952e1234',
  }, bundles: ['abilities', 'board-v2-art', 'board-v2-motion-art', 'player-ui', 'public-board', 'roles', 'scene-art', 'setup-art'] },
  'design-0.5.0': { gameplay: {
    protocolVersion: 2,
    engineVersion: 'full-game-1.11.0',
    rulesetVersion: 'in-person-v1-hospital-four-2026-10-19',
    rulesetHash: '7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c',
  }, bundles: ['abilities', 'board-v2-art', 'board-v2-films-art', 'board-v2-motion-art', 'player-ui', 'public-board', 'roles', 'scene-art', 'setup-art'] },
};

/** Build-time only. Match pins name this immutable art set, not the Hosting digest. */
export function readRuntimeArtRelease(root, version = RUNTIME_ART_VERSION) {
  return readRelease(root, version, false);
}

/** Historical evidence only: never validates or substitutes a current runtime build. */
export function readHistoricalRuntimeArtRelease(root, version) {
  check(Object.hasOwn(historical, version), 'no preserved snapshot for this release');
  return readRelease(root, version, true);
}

function readRelease(root, version, fromSnapshot) {
  root = resolve(root);
  check(Object.hasOwn(releases, version), 'unknown art release');
  const expected = releases[version];
  const bytes = readFileSync(resolve(root, `design/releases/${version}.json`));
  if (fromSnapshot) check(sha(bytes) === historical[version], 'historical manifest differs');
  const manifest = JSON.parse(bytes);
  check(manifest.schema === 'mothership.runtime-art-release/1' && manifest.manifestVersion === version, 'unreviewed manifest version');
  check(JSON.stringify(manifest.gameplayPins) === JSON.stringify(expected.gameplay), 'gameplay compatibility differs');
  const sources = Object.entries(manifest.sources ?? {}), runtime = Object.entries(manifest.runtimeFiles ?? {});
  check(sources.length > 0 && runtime.length > 0, 'source and runtime inventories are required');
  for (const [path, digest] of [...sources, ...runtime]) {
    check(typeof path === 'string' && !path.includes('..') && !path.includes('\\') && !path.startsWith('/')
      && resolve(root, path).startsWith(root + sep) && /^[a-f0-9]{64}$/.test(digest), 'invalid inventory entry');
    const inventoryPath = fromSnapshot ? `${HISTORICAL_ART_BLOBS}/${digest}` : path;
    check(sha(readFileSync(resolve(root, inventoryPath))) === digest, `content differs: ${path}`);
  }
  const names = Object.keys(manifest.bundles ?? {}).sort();
  check(JSON.stringify(names) === JSON.stringify(expected.bundles), 'complete uniform bundle set required');
  for (const entry of Object.values(manifest.bundles)) {
    check(/^\/art\/[a-z0-9.-]+\.css$/.test(entry.url) && /^[a-f0-9]{64}$/.test(entry.sha256), 'invalid bundle identity');
  }
  return Object.freeze({ ...manifest, manifestSha256: sha(bytes) });
}

export function assertRuntimeArtBundle(manifest, name, url, bytes) {
  const entry = manifest.bundles[name];
  check(entry?.url === url && entry.sha256 === sha(bytes), `bundle differs: ${name}`);
}
