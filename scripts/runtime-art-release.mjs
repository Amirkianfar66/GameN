import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { readPregameConsumerCandidate, acceptsPregameCandidateFile } from './pregame-consumer-candidate.mjs';
import { readPregameProductionConsumerApproval, acceptsPregameProductionFile } from './pregame-consumer-approval.mjs';
import { readPregameSourceApproval, verifyPregameRuntimePorts, PREGAME_APPROVAL, PREGAME_APPROVAL_SHA256 } from './pregame-runtime-ports.mjs';
import {readFoodConsumerSource, FOOD_CONSUMER_SOURCE, FOOD_CONSUMER_SOURCE_SHA256} from './food-consumer-source.mjs';
import {prepareFoodSupplyArt, FOOD_STATIC_ART, FOOD_STATIC_ART_SHA256} from './food-supply-art.mjs';

export const RUNTIME_ART_VERSION = 'design-0.5.0';
export const RUNTIME_ART_MANIFEST = 'design/releases/design-0.5.0.json';
export const PLANET_ART_VERSION = 'design-0.6.0';
export const PLANET_ART_MANIFEST = 'design/releases/design-0.6.0.json';
export const CREW_ART_VERSION = 'design-0.7.0';
export const CREW_ART_MANIFEST = 'design/releases/design-0.7.0.json';
export const PREGAME_ART_VERSION = 'design-0.8.0';
export const PREGAME_ART_MANIFEST = 'design/releases/design-0.8.0.json';
export const FOOD_ART_VERSION = 'design-0.9.0';
export const FOOD_ART_MANIFEST = 'design/releases/design-0.9.0.json';
export const CREW_CONSUMER_APPROVAL = 'docs/integration/crew-consumer-approval-2026-11-07.json';
const CREW_CONSUMER_APPROVAL_SHA256 = '8675a1d45cbf55aa69ccc65e18593d28c7ac54282ed52eb5c10e9b70e2c0511e';
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
  'design-0.7.0': {
    manifestSha256: '0ab15cfec53dd7be09d265685ffada52e01d26681b9a2b7d02c17c2b30b1da79',
    crewApprovalSha256: 'a2ef5f03666e046bb712b4c177adc30d35556aaa590f9f7aa0d45fd3cb55dbab',
    approvalSha256: '9493e29a8ce1b06c6848846b0c8932d65c42abcb24b2b43aaf35ed7239aaf228',
    baseManifest: PLANET_ART_MANIFEST,
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
  'design-0.6.0': {
    manifestSha256: 'eeb4a88c7b71166a1c9782231ccd7fa81931cb50eed112e3d6153a862751bec4',
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


// Source registration is separate from runtime adoption. Existing default exports
// and historical manifests keep their identities; new consumers still require review.
releases[PREGAME_ART_VERSION] = { ...releases[CREW_ART_VERSION],
  manifestSha256: 'c2e5b6a423d2a583be669147b70a23e2391fce770372137e99f46c3c75b13b5d',
  baseManifest: CREW_ART_MANIFEST, pregame: true };
releases[FOOD_ART_VERSION] = { ...releases[PREGAME_ART_VERSION],
  manifestSha256: '8eff093f6bd442ddb47e4b8697b128efba69f70c93b49b1eb87149f07853ead8',
  baseManifest: PREGAME_ART_MANIFEST, food: true,
  gameplay: {protocolVersion:3, engineVersion:'planet-game-1.4.0',
    rulesetVersion:'in-person-planet-food-task-2026-11-12',
    rulesetHash:'7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333'} };

/** Build-time only. Match pins name this immutable art set, not the Hosting digest. */
export function readRuntimeArtRelease(root, version = RUNTIME_ART_VERSION) {
  return readRelease(root, version, false);
}

/** Historical evidence only: never validates or substitutes a current runtime build. */
export function readHistoricalRuntimeArtRelease(root, version) {
  check(Object.hasOwn(historical, version), 'no preserved snapshot for this release');
  return readRelease(root, version, true);
}

/** Exact reviewed consumer compatibility, separate from immutable artwork manifests. */
export function readCrewConsumerApproval(root) {
  const bytes = readFileSync(resolve(root, CREW_CONSUMER_APPROVAL));
  check(sha(bytes) === CREW_CONSUMER_APPROVAL_SHA256, 'crew consumer approval differs');
  const approval = JSON.parse(bytes);
  const candidate = readPregameConsumerCandidate(root);
  const production = readPregameProductionConsumerApproval(root);
  check(approval.schema === 'mothership.crew-consumer-approval/1', 'invalid crew consumer approval');
  for (const [path, digest] of Object.entries(approval.requiredFiles)) {
    check(!path.includes('..') && !path.includes('\\') && !path.startsWith('/')
      && /^[a-f0-9]{64}$/.test(digest), 'invalid consumer evidence path');
    const actual = sha(readFileSync(resolve(root, path)));
    check(actual === digest || acceptsPregameProductionFile(production, path, digest, actual) || acceptsPregameCandidateFile(candidate, path, digest, actual), `crew consumer content differs: ${path}`);
  }
  return approval;
}

function readRelease(root, version, fromSnapshot) {
  root = resolve(root);
  check(Object.hasOwn(releases, version), 'unknown art release');
  const expected = releases[version];
  const candidate = fromSnapshot ? null : readPregameConsumerCandidate(root);
  const production = !fromSnapshot && [PLANET_ART_VERSION, CREW_ART_VERSION, PREGAME_ART_VERSION, FOOD_ART_VERSION].includes(version)
    ? readPregameProductionConsumerApproval(root) : null;
  const bytes = readFileSync(resolve(root, `design/releases/${version}.json`));
  if (fromSnapshot) check(sha(bytes) === historical[version], 'historical manifest differs');
  if (expected.manifestSha256) check(sha(bytes) === expected.manifestSha256, 'approved manifest differs');
  const manifest = JSON.parse(bytes);
  check(manifest.schema === 'mothership.runtime-art-release/1' && manifest.manifestVersion === version, 'unreviewed manifest version');
  check(JSON.stringify(manifest.gameplayPins) === JSON.stringify(expected.gameplay), 'gameplay compatibility differs');
  const consumer = !fromSnapshot && [PLANET_ART_VERSION, CREW_ART_VERSION, PREGAME_ART_VERSION, FOOD_ART_VERSION].includes(version)
    ? readCrewConsumerApproval(root) : null;
  if (version === CREW_ART_VERSION || version === PREGAME_ART_VERSION || version === FOOD_ART_VERSION) {
    check(manifest.consumerApproval?.path === CREW_CONSUMER_APPROVAL
      && manifest.consumerApproval.sha256 === CREW_CONSUMER_APPROVAL_SHA256, 'crew consumer binding differs');
  }
  const sources = Object.entries(manifest.sources ?? {}), runtime = Object.entries(manifest.runtimeFiles ?? {});
  check(sources.length > 0 && runtime.length > 0, 'source and runtime inventories are required');
  for (const [path, digest] of [...sources, ...runtime]) {
    check(typeof path === 'string' && !path.includes('..') && !path.includes('\\') && !path.startsWith('/')
      && resolve(root, path).startsWith(root + sep) && /^[a-f0-9]{64}$/.test(digest), 'invalid inventory entry');
    const inventoryPath = fromSnapshot ? `${HISTORICAL_ART_BLOBS}/${digest}` : path;
    const actual = sha(readFileSync(resolve(root, inventoryPath)));
    const compatibility = consumer?.historicalRuntimeOverrides?.[version]?.[path];
    if (acceptsPregameProductionFile(production, path, digest, actual) || acceptsPregameCandidateFile(candidate, path, digest, actual)) {
      // The complete production approval or explicit local review verifies this
      // exact successor. Immutable inventories and prior bytes remain preserved.
    } else if (compatibility) {
      // Preserve the published manifest and original bytes. Only this reviewed
      // successor consumer is permitted; no wildcard or unverified fallback.
      check(compatibility.previousSha256 === digest
        && compatibility.sha256 === actual
        && consumer.requiredFiles[path] === actual
        && consumer.requiredFiles[`${HISTORICAL_ART_BLOBS}/${digest}`] === digest,
      `historical consumer compatibility differs: ${path}`);
    } else check(actual === digest, `content differs: ${path}`);
  }
  const names = Object.keys(manifest.bundles ?? {}).sort();
  check(JSON.stringify(names) === JSON.stringify(expected.bundles), 'complete uniform bundle set required');
  for (const entry of Object.values(manifest.bundles)) {
    const validUrl = version === PLANET_ART_VERSION || version === CREW_ART_VERSION || version === PREGAME_ART_VERSION || version === FOOD_ART_VERSION
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
    const libraryApproval = expected.crewApprovalSha256 ? manifest.libraryIntegrationApproval : manifest.integrationApproval;
    check(libraryApproval?.path === approvalPath && libraryApproval.sha256 === expected.approvalSha256, 'approval binding differs');
    const baseManifest = expected.baseManifest ?? HOSPITAL_FOUR_ART_MANIFEST;
    check(manifest.baseManifest.path === baseManifest && sha(readFileSync(resolve(root, baseManifest))) === manifest.baseManifest.sha256, 'base manifest differs');
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
  if (expected.crewApprovalSha256) {
    const path = 'docs/integration/crew-drawing-art-approval-2026-11-07.json';
    check(manifest.integrationApproval.path === path && manifest.integrationApproval.sha256 === expected.crewApprovalSha256
      && sha(readFileSync(resolve(root, path))) === expected.crewApprovalSha256, 'crew integration approval differs');
    check(manifest.tokens?.version === '0.5.0' && manifest.tokens.path === 'packages/design-tokens/src/tokens-0.5.0.json'
      && manifest.tokens.sha256 === 'cfd8604611196fa6799367e1b438570ec96e914f937859199629317a4ac8ac5d'
      && manifest.sources[manifest.tokens.path] === manifest.tokens.sha256, 'crew token binding differs');
  }
  if (expected.pregame) {
    check(manifest.registrationScope === 'source-ports', 'pregame consumer adoption requires separate approval');
    const approval = readPregameSourceApproval(root);
    check(manifest.pregameIntegrationApproval?.path === PREGAME_APPROVAL
      && manifest.pregameIntegrationApproval.sha256 === PREGAME_APPROVAL_SHA256, 'pregame approval binding differs');
    verifyPregameRuntimePorts(root);
    check(manifest.pregameRelease?.sourceHead === approval.sourceHead
      && manifest.pregameRelease.ports === 22
      && JSON.stringify(manifest.pregameRelease.catalog) === JSON.stringify(approval.catalog)
      && JSON.stringify(manifest.pregameRelease.entrypoints) === JSON.stringify(approval.entrypoints), 'pregame source catalog differs');
    for (const [path, digest] of Object.entries(approval.sourcePins))
      check(manifest.sources[path] === digest, `pregame source inventory differs: ${path}`);
    for (const [path, digest] of Object.entries(approval.runtimePins))
      check(manifest.runtimeFiles[path] === digest, `pregame runtime inventory differs: ${path}`);
    check(manifest.pregameRelease.boardingSetupFlowVersion === 2
      && JSON.stringify(manifest.pregameRelease.durationsMs) === JSON.stringify({brand:2000,role:10000,boarding:10000}), 'pregame presentation description differs');
    check(![...sources, ...runtime].some(([path]) => /\/(review|stills)\//.test(path)
      || /(?:stage|renders|films)\.(?:mjs|html)$/.test(path) && path.startsWith('design/pregame-films/')), 'review-only pregame input in runtime inventory');
  }
  if (expected.food) {
    const food = readFoodConsumerSource(root);
    check(food !== null && manifest.foodSourceRegistration?.path === FOOD_CONSUMER_SOURCE &&
      manifest.foodSourceRegistration.sha256 === FOOD_CONSUMER_SOURCE_SHA256 &&
      manifest.foodStaticArt?.path === FOOD_STATIC_ART && manifest.foodStaticArt.sha256 === FOOD_STATIC_ART_SHA256,
      'Food source registration differs');
    for (const [path, entry] of Object.entries(food.files))
      check(manifest.runtimeFiles[path] === entry.sha256, `Food runtime inventory differs: ${path}`);
    const assets = prepareFoodSupplyArt(root).map(asset => ({url:asset.url, sha256:asset.sha256, bytes:asset.bytes.length}));
    check(JSON.stringify(manifest.staticAssets) === JSON.stringify(assets), 'complete Food static set required');
  } else check(manifest.staticAssets === undefined, 'static Food assets require their exact release');
  return Object.freeze({ ...manifest, manifestSha256: sha(bytes) });
}

export function assertRuntimeArtBundle(manifest, name, url, bytes) {
  const entry = manifest.bundles[name];
  check(entry?.url === url && entry.sha256 === sha(bytes), `bundle differs: ${name}`);
}

/** Check the complete release output, including non-CSS media, before publishing Hosting. */
export function assertRuntimeArtOutput(manifest, output) {
  const entries = [...Object.entries(manifest.bundles).map(([name, entry]) => ({name, url: entry.url, sha256: entry.sha256})),
    ...Object.entries(manifest.media ?? {}).flatMap(([name, entry]) => ['video', 'poster'].map(kind => ({name: name + '-' + kind, url: entry[kind], sha256: entry[kind + 'Sha256']}))),
    ...(manifest.staticAssets ?? []).map(entry => ({...entry, name:entry.url}))];
  for (const entry of entries) {
    check(/^\/art\/(?:planet-library\/)?[a-z0-9.-]+\.(?:css|mp4|webp)$/.test(entry.url) ||
      manifest.manifestVersion === FOOD_ART_VERSION &&
      /^\/art\/food-supply\/(?:supply-room\.back|operators\/c[1-9]-(?:panel|winch)-(?:alive|out))\.svg$/.test(entry.url), 'invalid publication path');
    check(sha(readFileSync(resolve(output, entry.url.slice(1)))) === entry.sha256, `published output differs: ${entry.name}`);
  }
  return entries.length;
}
