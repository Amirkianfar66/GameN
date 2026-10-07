import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStagingPlan } from '../dev/staging-plan.mjs';

const cli = fileURLToPath(new URL('../dev/staging-plan.mjs', import.meta.url));
const clone = value => JSON.parse(JSON.stringify(value));
function input() {
  return {
    projectId: 'mothership-staging-review', hostingSiteId: 'mothership-staging-review', hostingOrigin: 'https://mothership-staging-review.web.app', assetManifestVersion: 'design-0.1.0',
    sourceCommits: { backend: '40e47f060521276672c8ee6312e122ce37566d8a', frontend: '113aa6da03b30d112f4ef43335d8bca478169bbf', assets: '5553ea9aedd43b2b1785742cdcc9164f5a290aab' },
    backendArtifact: { kind: 'mothership-backend-v1', protocolVersion: 2, nodeVersion: 'v22.21.1', verifiedStandaloneInstall: true,
      artifactSha256: '1'.repeat(64), sourceSha256: '2'.repeat(64), legacyFixtureHarnessScan: 'passed', forbiddenSourceScan: 'passed',
      packages: { '@mothership/contracts': 'file:vendor/mothership-contracts-0.1.0.tgz', '@mothership/engine': 'file:vendor/mothership-engine-0.1.0.tgz', '@mothership/game-api': 'file:vendor/mothership-game-api-0.1.0.tgz' } },
  };
}
function reject(value) { assert.throws(() => createStagingPlan(value), error => error instanceof TypeError && error.message === 'Invalid staging plan input'); }

test('valid supplied descriptor produces a deterministic blocked proposal without modifying input or adopting artifacts', () => {
  const value = input(), before = clone(value);
  const plan = createStagingPlan(value);
  assert.deepEqual(value, before);
  assert.deepEqual(plan, createStagingPlan(value));
  assert.equal(plan.planningOnly, true);
  assert.equal(plan.readiness, false);
  assert.equal(plan.templateProvenance.generatorBaseCommit, before.sourceCommits.backend);
  assert.deepEqual(plan.templateProvenance.backendArtifact, before.backendArtifact);
  for (const id of ['DESTINATION_AUTHORIZATION', 'ARTIFACT_AND_SOURCE_VERIFICATION', 'STAGING_CLIENT', 'APP_CHECK_PROVIDER', 'TASKS_AND_IAM', 'LIVE_ACCEPTANCE']) assert.ok(plan.blockers.some(blocker => blocker.id === id && blocker.detail));
  assert.match(plan.templateProvenance.validation, /actual files.*require independent verification/);
  plan.templateProvenance.backendArtifact.packages['@mothership/contracts'] = 'changed';
  assert.deepEqual(value, before);
});

test('project/site IDs and hosting origins reject demo, local/private, noncanonical and mismatched destinations', () => {
  for (const projectId of ['demo-mothership', 'demo-staging', 'example-project', 'mothership-package-validation', 'abcde', '1staging-project', 'Stage-project', '../project', 'project; deploy', 'a'.repeat(31)]) reject({ ...input(), projectId });
  for (const hostingSiteId of ['demo-staging', '../web', 'a', 'wrong_site', 'site;deploy', 'a'.repeat(31)]) reject({ ...input(), hostingSiteId });
  for (const hostingOrigin of ['http://mothership-staging-review.web.app', 'https://mothership-staging-review.web.app/', 'https://mothership-staging-review.web.app:443', 'https://mothership-staging-review.web.app:8443', 'https://mothership-staging-review.web.app/api', 'https://mothership-staging-review.web.app?token=private', 'https://mothership-staging-review.web.app#private', 'https://user:private@mothership-staging-review.web.app', 'https://*.web.app', 'https://OTHER.web.app', 'https://other.web.app', 'https://other.firebaseapp.com', 'https://localhost', 'https://host.localhost', 'https://host.local', 'https://127.0.0.1', 'https://[::1]', 'https://10.1.2.3', 'https://172.16.0.1', 'https://192.168.1.2', 'https://169.254.1.2', 'https://[fc00::1]', 'https://stage.invalid', ' https://mothership-staging-review.web.app']) reject({ ...input(), hostingOrigin });
  assert.equal(createStagingPlan({ ...input(), hostingOrigin: 'https://mothership-staging-review.firebaseapp.com' }).readiness, false);
  assert.equal(createStagingPlan({ ...input(), hostingOrigin: 'https://stage.example.com' }).readiness, false);
});

test('placeholder asset pins and unsafe source commit references cannot become configuration proposals', () => {
  for (const assetManifestVersion of ['', '0.0.0-no-assets', 'test-assets-v1', 'synthetic-assets-v1', 'example-assets', 'TODO', 'placeholder', '/assets/path', 'assets;token', 'a'.repeat(129)]) reject({ ...input(), assetManifestVersion });
  for (const key of ['backend', 'frontend', 'assets']) {
    for (const value of ['HEAD', '../source', 'main', '0'.repeat(40), '1'.repeat(39), 'G'.repeat(40), 'A'.repeat(40), '1'.repeat(41), '1'.repeat(40) + '\n']) {
      const malformed = input(); malformed.sourceCommits[key] = value; reject(malformed);
    }
  }
});

test('artifact must match current packager kind/protocol/Node/standalone/scans/hashes and safe vendor package paths', () => {
  const invalidFields = { kind: ['mothership-slice', 'mothership-backend-v2'], protocolVersion: [1, 3, '2'], nodeVersion: ['22', 'v20.19.0', 'v22.x.1'], verifiedStandaloneInstall: [false, 'true'], legacyFixtureHarnessScan: ['failed', true], forbiddenSourceScan: ['failed', true], artifactSha256: ['0'.repeat(64), '1'.repeat(63), 'a'.repeat(65), 'A'.repeat(64)], sourceSha256: ['not-a-hash', '0'.repeat(64)] };
  for (const [key, values] of Object.entries(invalidFields)) for (const value of values) { const malformed = input(); malformed.backendArtifact[key] = value; reject(malformed); }
  for (const [key, value] of [['@mothership/contracts', 'file:../../private.tgz'], ['@mothership/game-api', 'https://registry.example.com/package.tgz'], ['@mothership/engine', 'file:vendor/mothership-contracts-0.1.0.tgz']]) { const malformed = input(); malformed.backendArtifact.packages[key] = value; reject(malformed); }
  const malformed = input(); delete malformed.backendArtifact.packages['@mothership/engine']; reject(malformed);
});

test('unknown and secret fields fail safely at every nesting level and getters do not execute', () => {
  for (const location of ['root', 'sourceCommits', 'backendArtifact', 'packages']) for (const key of ['idToken', 'refreshToken', 'appCheckToken', 'recoveryToken', 'privatePayload', 'readiness', 'backendSource']) {
    const malformed = input();
    const target = location === 'root' ? malformed : location === 'packages' ? malformed.backendArtifact.packages : malformed[location];
    target[key] = 'private-test-value'; reject(malformed);
  }
  for (const key of Object.keys(input())) { const malformed = input(); delete malformed[key]; reject(malformed); }
  for (const value of [null, undefined, [], true, 'staging']) reject(value);
  let called = false;
  const malformed = input(); Object.defineProperty(malformed, 'projectId', { get() { called = true; return 'mothership-staging-review'; } }); reject(malformed);
  assert.equal(called, false);
  const symbolic = input(); symbolic[Symbol('secret')] = 'private-test-value'; reject(symbolic);
});

test('Firebase configuration and env paths share a coherent deployment-root anchor with packaged production source', () => {
  const plan = createStagingPlan(input()), config = plan.firebaseConfigurationProposal;
  const anchor = resolve('/private/tmp/reviewed-staging-bundle');
  assert.deepEqual(config.functions, { source: 'backend', runtime: 'nodejs22', codebase: 'mothership-v1' });
  assert.equal(config.hosting.public, 'web');
  assert.equal(config.hosting.site, input().hostingSiteId);
  assert.equal(dirname(resolve(anchor, plan.environmentFileProposal.path)), resolve(anchor, config.functions.source));
  for (const [path, expected] of [[config.firestore.rules, 'backend/firestore.rules'], [config.firestore.indexes, 'backend/firestore.indexes.json'], [plan.bundleLayout.environmentFile, 'backend/.env.mothership-staging-review']]) { assert.equal(path, expected); assert.ok(resolve(anchor, path).startsWith(anchor + '/')); }
  const lines = plan.environmentFileProposal.contents.trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], 'MOTHERSHIP_ASSET_MANIFEST_VERSION=design-0.1.0');
  assert.deepEqual(JSON.parse(lines[1].slice('MOTHERSHIP_ALLOWED_ORIGINS='.length)), [input().hostingOrigin]);
  assert.ok(!/GCLOUD_PROJECT|GCP_PROJECT|FIREBASE_|EMULATOR/.test(plan.environmentFileProposal.contents));
  assert.ok(!JSON.stringify(config).includes('infra/firebase'));
  assert.ok(plan.preparationRequirements.some(value => value.includes('dist/backend') && value.includes('dist/production.js')));
});

test('exact 12 API rewrites follow actual production HTTP exports and preserve their plain HTTP endpoint prefix', () => {
  const production = readFileSync(new URL('../src/production.ts', import.meta.url), 'utf8');
  const entrypoints = readFileSync(new URL('../src/v1.ts', import.meta.url), 'utf8');
  const operations = [...entrypoints.match(/export const V1_OPERATIONS = \[([\s\S]*?)\] as const;/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const publicExports = [...production.matchAll(/export const (v1\w+)=v1\.(\w+);/g)].filter(match => operations.includes(match[2])).map(match => match[1]);
  const rewrites = createStagingPlan(input()).firebaseConfigurationProposal.hosting.rewrites;
  assert.equal(operations.length, 12);
  assert.equal(rewrites.length, 12);
  assert.deepEqual(rewrites.map(value => value.function.functionId), publicExports);
  assert.match(entrypoints, /onRequest\(\{ region: 'us-central1'/);
  for (const rewrite of rewrites) assert.deepEqual(rewrite, { source: `/api/${rewrite.function.functionId}`, function: { functionId: rewrite.function.functionId, region: 'us-central1' } });
  for (const privateExport of ['v1DeadlineTask', 'v1DispatchDeadline', 'v1RepairDeadlines']) assert.ok(!rewrites.some(value => value.function.functionId === privateExport));
  assert.ok(rewrites.some(value => value.source === '/api/v1Command'));
  assert.ok(rewrites.some(value => value.source === '/api/v1Receipt'));
});

test('deployment commands are data only with explicit project and retained codebase selector', () => {
  const commands = createStagingPlan(input()).deploymentCommandProposals;
  assert.deepEqual(commands, [{ execute: false, cwd: '<reviewed-deployment-directory>', program: 'firebase', args: ['deploy', '--config', 'firebase.json', '--project', input().projectId, '--only', 'functions:mothership-v1,firestore:rules,firestore:indexes,hosting'] }]);
});

test('CLI prints only JSON, never creates the proposed deployment paths, and sanitizes invalid secret input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mothership-staging-plan-'));
  try {
    const filename = join(directory, 'input.json'), source = JSON.stringify(input()); writeFileSync(filename, source);
    const result = spawnSync(process.execPath, [cli, filename], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0); assert.equal(result.stderr, '');
    assert.deepEqual(JSON.parse(result.stdout), createStagingPlan(input()));
    assert.equal(readFileSync(filename, 'utf8'), source); assert.deepEqual(readdirSync(directory), ['input.json']);
    for (const source of [JSON.stringify({ ...input(), idToken: 'private-test-value' }), 'private-test-value-not-json', ' '.repeat(8193)]) {
      writeFileSync(filename, source);
      const failed = spawnSync(process.execPath, [cli, filename], { cwd: directory, encoding: 'utf8' });
      assert.equal(failed.status, 1); assert.equal(failed.stdout, ''); assert.equal(failed.stderr, 'Invalid staging plan input\n');
      assert.deepEqual(readdirSync(directory), ['input.json']);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
