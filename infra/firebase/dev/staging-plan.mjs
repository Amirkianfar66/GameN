// mothership:dev-only
// Offline configuration proposal only. No SDK, process execution or config writes.
import { readFileSync, statSync } from 'node:fs';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ERROR = 'Invalid staging plan input';
const BASE_COMMIT = '40e47f060521276672c8ee6312e122ce37566d8a';
const HTTP_EXPORTS = [
  'v1CreateMatch', 'v1RequestAdmission', 'v1ApproveAdmission', 'v1AdmitDisplay', 'v1StartMatch',
  'v1Command', 'v1Receipt', 'v1Advance', 'v1ServerTime', 'v1AbortMatch', 'v1IssueSeatRecovery', 'v1RedeemSeatRecovery',
];
const PACKAGE_NAMES = ['@mothership/contracts', '@mothership/engine', '@mothership/game-api'];
const sha = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value) && !/^0+$/.test(value);
function invalid() { throw new TypeError(ERROR); }
function exactObject(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length
    || keys.some(key => !Object.hasOwn(descriptors, key) || !Object.hasOwn(descriptors[key], 'value'))) invalid();
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}
function hostingOrigin(value, siteId) {
  if (typeof value !== 'string') invalid();
  let url;
  try { url = new URL(value); } catch { invalid(); }
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.origin !== value || url.username !== '' || url.password !== '' || url.port !== ''
    || isIP(host.replace(/^\[|\]$/g, '')) !== 0 || host.length > 253 || !host.includes('.')
    || host.split('.').some(label => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
    || /(?:^|\.)(?:localhost|local|internal|invalid|test)$/.test(host)) invalid();
  for (const suffix of ['.web.app', '.firebaseapp.com']) {
    if (host.endsWith(suffix) && host !== siteId + suffix) invalid();
  }
  return value;
}
function artifactDescriptor(value) {
  const artifact = exactObject(value, ['kind', 'protocolVersion', 'legacyFixtureHarnessScan', 'artifactSha256', 'sourceSha256', 'nodeVersion', 'packages', 'verifiedStandaloneInstall', 'forbiddenSourceScan']);
  if (artifact.kind !== 'mothership-backend-v1' || artifact.protocolVersion !== 2
    || artifact.verifiedStandaloneInstall !== true || artifact.legacyFixtureHarnessScan !== 'passed' || artifact.forbiddenSourceScan !== 'passed'
    || typeof artifact.nodeVersion !== 'string' || !/^v22\.[0-9]+\.[0-9]+$/.test(artifact.nodeVersion)
    || !sha(artifact.artifactSha256, 64) || !sha(artifact.sourceSha256, 64)) invalid();
  const packages = exactObject(artifact.packages, PACKAGE_NAMES);
  for (const name of PACKAGE_NAMES) {
    const expectedName = name.replace('@', '').replace('/', '-');
    if (typeof packages[name] !== 'string' || packages[name].length > 255
      || !new RegExp(`^file:vendor/${expectedName}-[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?\\.tgz$`).test(packages[name])) invalid();
  }
  return { ...artifact, packages };
}

/** Validates supplied descriptor evidence; does not authenticate hashes, commits or cloud resources. */
export function createStagingPlan(value) {
  const input = exactObject(value, ['projectId', 'hostingSiteId', 'hostingOrigin', 'assetManifestVersion', 'sourceCommits', 'backendArtifact']);
  if (typeof input.projectId !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(input.projectId)
    || input.projectId.startsWith('demo-') || ['example-project', 'your-project-id', 'project-id', 'replace-me', 'mothership-package-validation'].includes(input.projectId)
    || typeof input.hostingSiteId !== 'string' || !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(input.hostingSiteId) || input.hostingSiteId.startsWith('demo-')
    || typeof input.assetManifestVersion !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.assetManifestVersion)
    || /^(?:0\.0\.0-no-assets|(?:test|synthetic|example|placeholder|todo|tbd)(?:[._-]|$))/i.test(input.assetManifestVersion)) invalid();
  const origin = hostingOrigin(input.hostingOrigin, input.hostingSiteId);
  const commits = exactObject(input.sourceCommits, ['backend', 'frontend', 'assets']);
  if (Object.values(commits).some(value => !sha(value, 40))) invalid();
  const artifact = artifactDescriptor(input.backendArtifact);
  const environmentFile = `backend/.env.${input.projectId}`;
  const rewrites = HTTP_EXPORTS.map(functionId => ({ source: `/api/${functionId}`, function: { functionId, region: 'us-central1' } }));
  return {
    planVersion: 1, planningOnly: true, readiness: false,
    templateProvenance: { generatorBaseCommit: BASE_COMMIT, sourceCommits: commits, backendArtifact: artifact,
      validation: 'Supplied descriptor shape and required verification flags only; actual files, fingerprints and commit association require independent verification.' },
    destinationProposal: { projectId: input.projectId, hostingSiteId: input.hostingSiteId, hostingOrigin: origin },
    bundleLayout: { firebaseConfig: 'firebase.json', functionsSource: 'backend', hostingPublic: 'web', environmentFile,
      firestoreRules: 'backend/firestore.rules', firestoreIndexes: 'backend/firestore.indexes.json' },
    environmentFileProposal: { path: environmentFile,
      contents: `MOTHERSHIP_ASSET_MANIFEST_VERSION=${input.assetManifestVersion}\nMOTHERSHIP_ALLOWED_ORIGINS=${JSON.stringify([origin])}\n` },
    firebaseConfigurationProposal: {
      functions: { source: 'backend', runtime: 'nodejs22', codebase: 'mothership-v1' },
      firestore: { rules: 'backend/firestore.rules', indexes: 'backend/firestore.indexes.json' },
      hosting: { site: input.hostingSiteId, public: 'web', ignore: ['firebase.json', '**/.*', '**/node_modules/**'], rewrites },
    },
    preparationRequirements: [
      'Use a fresh reviewed deployment directory as the anchor for firebase.json and every proposed relative path. Hosting rewrites are an optional routing proposal; the reviewed hosted client currently calls direct regional HTTPS endpoints.',
      'Copy the reviewed dist/backend standalone production artifact unchanged into backend; verify artifact/source fingerprints before adding the project env file. Its package main must remain dist/production.js.',
      'Copy only the reviewed staging client build into web. The emulator/dev preview, Designer prototypes/studies, fixtures and private data are excluded.',
      'Use the copied backend Firestore Rules/indexes from the same source pin; never point this configuration at infra/firebase emulator source.',
    ],
    deploymentCommandProposals: [{ execute: false, cwd: '<reviewed-deployment-directory>', program: 'firebase',
      args: ['deploy', '--config', 'firebase.json', '--project', input.projectId, '--only', 'functions:mothership-v1,firestore:rules,firestore:indexes,hosting'] }],
    blockers: [
      { id: 'DESTINATION_AUTHORIZATION', detail: 'The coordinator must resolve and authorize the actual isolated staging project/site/domain and costs; valid identifiers do not prove existence, ownership, DNS or nonproduction isolation.' },
      { id: 'ARTIFACT_AND_SOURCE_VERIFICATION', detail: 'Independently match the packaged files, both hashes, standalone verification and source commit pins; supplied metadata alone is not attestation.' },
      { id: 'STAGING_CLIENT', detail: 'Pin and review the hosted client and asset handoff. Configure production Auth/Firestore and the selected plain-JSON API routing; emulator preview code is not deployable. Proposed Hosting rewrites are optional and do not change the current direct-endpoint client.' },
      { id: 'APP_CHECK_PROVIDER', detail: 'Review and configure the actual web App Check provider/domain, CSP exchange endpoints and current-token headers; Auth and App Check enforcement remain required.' },
      { id: 'TASKS_AND_IAM', detail: 'Review private Cloud Tasks/scheduler/service-account IAM, Rules/indexes and scheduled delivery/repair before exposing the staging match flow.' },
      { id: 'LIVE_ACCEPTANCE', detail: 'Hosted TLS/origin behavior, invalid/missing credential denial, audience privacy, recovery and real-device whole-match evidence remain unverified.' },
    ],
  };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || statSync(process.argv[2]).size > 8192) invalid();
    process.stdout.write(`${JSON.stringify(createStagingPlan(JSON.parse(readFileSync(process.argv[2], 'utf8'))), null, 2)}\n`);
  } catch {
    process.stderr.write(`${ERROR}\n`);
    process.exitCode = 1;
  }
}
