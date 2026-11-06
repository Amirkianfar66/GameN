import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export const RUNTIME_ART_VERSION = 'design-0.5.0';
export const RUNTIME_ART_MANIFEST = 'design/releases/design-0.5.0.json';
export const PLANET_ART_VERSION = 'design-0.6.0';
export const PLANET_ART_MANIFEST = 'design/releases/design-0.6.0.json';
// The release selects this reviewed art set; historical manifests remain immutable.
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
  'design-0.6.0': {
    manifestSha256: '6d4d87113161fadf5bdd35f7248efde816d5300f45aa0d3787c13a192b82c9eb',
    approvalSha256: '9493e29a8ce1b06c6848846b0c8932d65c42abcb24b2b43aaf35ed7239aaf228',
    gameplay: {
      protocolVersion: 3,
      engineVersion: 'planet-game-1.1.0',
      rulesetVersion: 'in-person-planet-private-feedback-2026-11-06',
      rulesetHash: '4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa',
    },
    bundles: ['abilities', 'board-v2-art', 'board-v2-films-art', 'board-v2-motion-art',
      'planet-library-end', 'planet-library-hospital-panel', 'planet-library-library',
      'planet-library-navigation', 'planet-library-offices', 'planet-library-promises',
      'planet-library-successor', 'planet-library-windows', 'player-ui', 'public-board',
      'roles', 'scene-art', 'setup-art'],
    media: ['arrival-blue', 'arrival-red', 'blackhole', 'rescue', 'transit'],
  },
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
  if (expected.manifestSha256) check(sha(bytes) === expected.manifestSha256, 'approved manifest differs');
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
    const validUrl = version === PLANET_ART_VERSION
      ? /^\/art\/(?:planet-library\/)?[a-z0-9.-]+\.css$/.test(entry.url)
      : /^\/art\/[a-z0-9.-]+\.css$/.test(entry.url);
    check(validUrl && /^[a-f0-9]{64}$/.test(entry.sha256), 'invalid bundle identity');
  }
  if (expected.media) {
    check(JSON.stringify(Object.keys(manifest.media ?? {}).sort()) === JSON.stringify(expected.media), 'complete uniform media set required');
    const approvalPath = 'docs/integration/planet-library-art-approval-2026-11-06.json';
    const approvalBytes = readFileSync(resolve(root, approvalPath));
    check(sha(approvalBytes) === expected.approvalSha256, 'integration approval differs');
    const approval = JSON.parse(approvalBytes);
    check(manifest.integrationApproval.path === approvalPath && manifest.integrationApproval.sha256 === expected.approvalSha256, 'approval binding differs');
    check(sha(readFileSync(resolve(root, HOSPITAL_FOUR_ART_MANIFEST))) === manifest.baseManifest.sha256, 'base manifest differs');
    const published = new Map(approval.approvedFiles.map(file => ['/' + file.publication.target, file.publication.sha256]));
    for (const [name, entry] of Object.entries(manifest.media)) {
      check(entry.name === name && Number.isSafeInteger(entry.durationMs) && entry.durationMs > 0, 'invalid media description');
      for (const [kind, suffix] of [['video', 'mp4'], ['poster', 'webp']]) {
        const url = entry[kind], digest = entry[kind + 'Sha256'];
        check(typeof url === 'string' && url.startsWith('/art/planet-library/') && url.endsWith('.' + suffix)
          && /^[a-f0-9]{64}$/.test(digest) && published.get(url) === digest, 'unapproved media identity');
      }
    }
    for (const entry of Object.values(manifest.bundles).filter(entry => entry.url.startsWith('/art/planet-library/'))) {
      check(published.get(entry.url) === entry.sha256, 'unapproved library stylesheet');
    }
    check(![...sources, ...runtime].some(([path]) => /\/(review|stills)\//.test(path)), 'review media cannot enter runtime inventories');
  }
  return Object.freeze({ ...manifest, manifestSha256: sha(bytes) });
}

export function assertRuntimeArtBundle(manifest, name, url, bytes) {
  const entry = manifest.bundles[name];
  check(entry?.url === url && entry.sha256 === sha(bytes), `bundle differs: ${name}`);
}

/** Check the complete release output, including non-CSS media, before publishing Hosting. */
export function assertRuntimeArtOutput(manifest, output) {
  const entries = [...Object.entries(manifest.bundles).map(([name, entry]) => ({name, url: entry.url, sha256: entry.sha256})),
    ...Object.entries(manifest.media ?? {}).flatMap(([name, entry]) => ['video', 'poster'].map(kind => ({name: name + '-' + kind, url: entry[kind], sha256: entry[kind + 'Sha256']})))];
  for (const entry of entries) {
    check(/^\/art\/(?:planet-library\/)?[a-z0-9.-]+\.(?:css|mp4|webp)$/.test(entry.url), 'invalid publication path');
    check(sha(readFileSync(resolve(output, entry.url.slice(1)))) === entry.sha256, `published output differs: ${entry.name}`);
  }
  return entries.length;
}
